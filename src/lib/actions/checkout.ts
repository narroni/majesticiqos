"use server";

import "server-only";

import { headers } from "next/headers";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { COUNTRY_LABEL } from "@/lib/country-labels";
import { getProductsForCheckout } from "@/lib/data/products";
import { getShippingRate } from "@/lib/data/shipping";
import { calculateSubtotal, calculateTotal, getLineTotal, getShippingCost } from "@/lib/pricing";
import { checkRateLimit, hashIp } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";
import { getSiteUrl } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendNewOrderTelegramNotification } from "@/lib/telegram";
import { formatPrice } from "@/lib/utils";
import {
  checkoutCartItemSchema,
  createCheckoutFormSchema,
  parseCheckoutPhone,
  type CheckoutFormValues,
} from "@/lib/validation/checkout";
import type { Locale } from "@/types";
import type { Json } from "@/types/database";

interface OrderItemPayload {
  product_id: string;
  name_sq: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  unit_price_cents: number;
  original_price_cents: number | null;
  quantity: number;
  line_total_cents: number;
}

const MIN_FORM_SECONDS = 3;

const actionOnlySchema = z.object({
  items: z.array(checkoutCartItemSchema).min(1).max(50),
  locale: z.enum(["sq", "en"]),
  formStartedAt: z.number(),
  idempotencyKey: z.string().uuid(),
});

// Intersecting with CheckoutFormValues (rather than redeclaring the same
// fields) is what keeps this in sync with the shared zod schema — there's
// only one place the customer-facing fields are defined.
export type CheckoutActionInput = CheckoutFormValues & {
  items: { productId: string; quantity: number }[];
  locale: Locale;
  formStartedAt: number;
  idempotencyKey: string;
};

export interface CheckoutFieldError {
  field: string;
  message: string;
}

export type CheckoutActionResult =
  | { success: true; orderNumber: string; publicToken: string }
  | { success: false; errors: CheckoutFieldError[] };

const IDEMPOTENCY_TTL_SECONDS = 10 * 60;
const IDEMPOTENCY_KEY_PREFIX = "checkout:idempotency:";

// In-memory fallback — only used when Redis isn't configured (src/lib/redis.ts
// logs a warning in that case). Same caveat as rate-limit.ts's fallback:
// resets on restart, doesn't share state across instances. TTL is enforced
// manually here since a plain Map never expires entries on its own.
const idempotencyCacheFallback = new Map<
  string,
  { value: CheckoutActionResult; expiresAt: number }
>();

async function getCachedResult(key: string): Promise<CheckoutActionResult | null> {
  if (!redis) {
    const entry = idempotencyCacheFallback.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      idempotencyCacheFallback.delete(key);
      return null;
    }
    return entry.value;
  }

  try {
    return await redis.get<CheckoutActionResult>(IDEMPOTENCY_KEY_PREFIX + key);
  } catch (error) {
    // Same fail-open reasoning as checkRateLimit below: a Redis hiccup here
    // just means we treat this as a fresh submission instead of a replay —
    // worst case a rare double-submit gets through, which is far better
    // than blocking every checkout while Redis is degraded.
    console.error(
      "[checkout] Redis error while reading the idempotency cache — treating as a cache miss.",
      error,
    );
    return null;
  }
}

async function setCachedResult(key: string, value: CheckoutActionResult): Promise<void> {
  if (!redis) {
    idempotencyCacheFallback.set(key, {
      value,
      expiresAt: Date.now() + IDEMPOTENCY_TTL_SECONDS * 1000,
    });
    return;
  }

  try {
    await redis.set(IDEMPOTENCY_KEY_PREFIX + key, value, { ex: IDEMPOTENCY_TTL_SECONDS });
  } catch (error) {
    // The order already succeeded and its result already went back to this
    // caller — losing the cache write just means a same-key retry within
    // the TTL window would be treated as a fresh submission (cache miss)
    // rather than replayed. That's the same rare-double-submit exposure as
    // a read failure, not a new one, so it's logged rather than surfaced
    // as an error to the customer.
    console.error(
      "[checkout] Redis error while writing the idempotency cache — a retry with the same key won't be deduped.",
      error,
    );
  }
}

function genericFailure(message: string): CheckoutActionResult {
  return { success: false, errors: [{ field: "form", message }] };
}

// Only reached if submitCheckoutInner throws before it can call
// getTranslations, or getTranslations itself throws — both effectively
// impossible in practice, but this keeps the customer-facing text
// byte-identical to messages/{en,sq}.json's errors.generic even in that
// pathological case, rather than inventing a different fallback string.
const GENERIC_FALLBACK_MESSAGE: Record<Locale, string> = {
  en: "Something went wrong. Please try again.",
  sq: "Diçka shkoi keq. Provo përsëri.",
};

export async function submitCheckout(
  input: CheckoutActionInput,
): Promise<CheckoutActionResult> {
  try {
    return await submitCheckoutInner(input);
  } catch (error) {
    // Catch-all safety net: any unexpected throw from any gate below (a
    // Supabase client construction error, a Redis client throwing outside
    // the try/catches that are supposed to catch it, a bug) would otherwise
    // surface as a framework-level Server Action error with no application
    // log at all — exactly the "generic message, nothing in Vercel logs"
    // symptom this whole logging pass exists to eliminate.
    console.error(
      "[checkout] Uncaught exception in submitCheckout — a gate crashed instead of returning a result",
      error instanceof Error ? { message: error.message, stack: error.stack } : error,
    );
    return genericFailure(GENERIC_FALLBACK_MESSAGE[input.locale] ?? GENERIC_FALLBACK_MESSAGE.en);
  }
}

async function submitCheckoutInner(
  input: CheckoutActionInput,
): Promise<CheckoutActionResult> {
  const tErrors = await getTranslations({ locale: input.locale, namespace: "errors" });
  const tCheckout = await getTranslations({ locale: input.locale, namespace: "checkout" });

  // 1. Zod parse — the exact schema the client's zodResolver runs, plus the
  // server-only fields (items/timing/idempotency) that were never part of
  // the react-hook-form-managed fields.
  const formSchema = createCheckoutFormSchema((key, values) => tErrors(key, values));
  const formResult = formSchema.safeParse(input);
  const actionResult = actionOnlySchema.safeParse(input);

  if (!formResult.success || !actionResult.success) {
    const fieldErrors = formResult.success
      ? []
      : formResult.error.issues.map((issue) => ({
          field: String(issue.path[0] ?? "form"),
          message: issue.message,
        }));

    // Zod issues reject client-side too (the same schema backs the form's
    // zodResolver), so a server-side rejection here means either the client
    // check was bypassed (a direct call, a stale bundle) or a field only
    // validated server-side (actionOnlySchema) failed.
    console.warn("[checkout] Rejected: zod validation failed", {
      formIssues: formResult.success
        ? null
        : formResult.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
      actionIssues: actionResult.success
        ? null
        : actionResult.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
    });

    return {
      success: false,
      errors: fieldErrors.length > 0 ? fieldErrors : [{ field: "form", message: tErrors("generic") }],
    };
  }

  // Honeypot — real users never see this field, so any value means a bot.
  // Logging the actual value (not just that it fired) is what distinguishes
  // "a scraper filled every field" from "a password manager autofilled one
  // hidden input with a name/address" — the latter is a false positive that
  // would silently reject every real order from an affected browser.
  if (formResult.data.honeypot) {
    console.warn("[checkout] Rejected: honeypot field was non-empty", {
      honeypotValue: formResult.data.honeypot,
    });
    return genericFailure(tErrors("generic"));
  }

  // Minimum time-on-form.
  const elapsedSeconds = (Date.now() - actionResult.data.formStartedAt) / 1000;
  if (elapsedSeconds < MIN_FORM_SECONDS) {
    console.warn("[checkout] Rejected: form submitted faster than the minimum time-on-form", {
      elapsedSeconds,
      minFormSeconds: MIN_FORM_SECONDS,
    });
    return genericFailure(tErrors("generic"));
  }

  // Idempotency — a double-submit with the same key replays the first result.
  // getCachedResult already logs internally if the Redis read itself throws
  // (fails open to a cache miss); this logs the distinct non-error case of
  // an actual hit, so a replayed result doesn't look like a fresh silent
  // failure in the logs.
  const cached = await getCachedResult(actionResult.data.idempotencyKey);
  if (cached) {
    console.info("[checkout] Idempotency cache hit — replaying previous result", {
      idempotencyKey: actionResult.data.idempotencyKey,
    });
    return cached;
  }

  // 2. Rate limit by hashed IP.
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown";
  const userAgent = headerList.get("user-agent");
  const ipHash = hashIp(ip);

  if (!(await checkRateLimit(ipHash)).allowed) {
    // checkRateLimit fails open on any Redis error (see rate-limit.ts) and
    // logs that failure itself — reaching `allowed: false` here always means
    // a genuine limit was hit, not a Redis outage.
    console.warn("[checkout] Rejected: rate limit exceeded", { ipHash });
    return genericFailure(tErrors("generic"));
  }

  // 3. Recompute every price and stock check from the database — the client
  // sends only { productId, quantity }; nothing priced is ever trusted.
  const productIds = actionResult.data.items.map((item) => item.productId);
  let products;
  try {
    products = await getProductsForCheckout(productIds);
  } catch (error) {
    // Unlike the RPC call below, getProductsForCheckout throws directly on a
    // Postgres/PostgREST error rather than returning it — an uncaught throw
    // here would otherwise be swallowed by the framework with zero log line,
    // matching the exact symptom being chased.
    console.error("[checkout] getProductsForCheckout threw while recomputing prices/stock", {
      productIds,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return genericFailure(tErrors("generic"));
  }
  const productMap = new Map(products.map((product) => [product.id, product]));

  const fieldErrors: CheckoutFieldError[] = [];
  const orderItems: OrderItemPayload[] = [];

  for (const item of actionResult.data.items) {
    const product = productMap.get(item.productId);

    if (!product) {
      fieldErrors.push({ field: "items", message: tCheckout("stockInsufficientError", { product: item.productId }) });
      continue;
    }

    if (product.trackInventory && product.stockQuantity < item.quantity) {
      const name = actionResult.data.locale === "sq" ? product.nameSq : product.nameEn;
      fieldErrors.push({
        field: "items",
        message: tCheckout("stockInsufficientError", { product: name }),
      });
      continue;
    }

    orderItems.push({
      product_id: product.id,
      name_sq: product.nameSq,
      name_en: product.nameEn,
      slug: product.slug,
      image_url: product.imageUrl,
      unit_price_cents: product.effectivePriceCents,
      original_price_cents: product.discountPriceCents != null ? product.priceCents : null,
      quantity: item.quantity,
      line_total_cents: getLineTotal(product.effectivePriceCents, item.quantity),
    });
  }

  if (fieldErrors.length > 0) {
    console.warn("[checkout] Rejected: product not found or insufficient stock", { fieldErrors });
    return { success: false, errors: fieldErrors };
  }

  const subtotalCents = calculateSubtotal(
    orderItems.map((item) => ({ unitPriceCents: item.unit_price_cents, quantity: item.quantity })),
  );
  const shippingRate = await getShippingRate(formResult.data.country);
  const shippingCents = getShippingCost(shippingRate, subtotalCents);
  const totalCents = calculateTotal(subtotalCents, shippingCents);

  const phoneRegion = formResult.data.country === "OTHER" ? undefined : formResult.data.country;
  const parsedPhone = parseCheckoutPhone(formResult.data.phone, phoneRegion);
  const e164Phone = parsedPhone?.number ?? formResult.data.phone;

  // 4. Insert order + order_items, then decrement stock — all inside one
  // Postgres function call, so a raised "insufficient stock" (a concurrent
  // checkout beat this one to the last unit) rolls back the whole insert.
  // The RPC's text params are non-nullable in the generated types (Postgres
  // function args don't carry column-level nullability) — empty strings are
  // sent instead and the function itself turns them into real NULLs via
  // nullif() before storage (see the migration).
  const { data, error } = await supabaseAdmin.rpc("create_order", {
    p_first_name: formResult.data.firstName,
    p_last_name: formResult.data.lastName,
    p_phone: e164Phone,
    p_phone_country: formResult.data.country,
    p_email: formResult.data.email ?? "",
    p_address_line: formResult.data.address,
    p_city: formResult.data.city,
    p_postal_code: formResult.data.postalCode ?? "",
    p_country: formResult.data.country,
    p_customer_note: formResult.data.customerNote ?? "",
    p_locale: actionResult.data.locale,
    p_ip_hash: ipHash,
    p_user_agent: userAgent ?? "",
    p_subtotal_cents: subtotalCents,
    p_shipping_cents: shippingCents,
    p_total_cents: totalCents,
    // OrderItemPayload's fields are all Json-compatible (string/number/null);
    // this cast just bridges the named-interface vs index-signature mismatch
    // TypeScript otherwise reports.
    p_items: orderItems as unknown as Json,
  });

  if (error) {
    const insufficientMatch = /Insufficient stock for product ([0-9a-f-]{36})/i.exec(error.message);
    if (insufficientMatch) {
      // Expected, handled business condition (a concurrent checkout won the
      // last unit) — not logged as an error, the customer already gets a
      // specific, correct message below.
      const product = productMap.get(insufficientMatch[1]);
      const name = product
        ? actionResult.data.locale === "sq"
          ? product.nameSq
          : product.nameEn
        : insufficientMatch[1];
      return {
        success: false,
        errors: [{ field: "items", message: tCheckout("stockInsufficientError", { product: name }) }],
      };
    }

    // Every other RPC failure is unexpected — the customer only ever sees
    // the generic message below, so this is the only place the real cause
    // is visible at all. Log the full PostgrestError shape (code/message/
    // details/hint), not just error.message — `hint` in particular often
    // carries the actual fix (e.g. a signature-mismatch error names the
    // exact overload PostgREST expected), and gets silently dropped if you
    // only log the message string.
    console.error("[checkout] create_order RPC failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return genericFailure(tErrors("generic"));
  }

  // create_order() now also returns `out_id` (migrations/20260814130000_fix_create_order_out_params.sql
  // — named out_id rather than id because an OUT parameter named `id` shadows
  // the orders.id column as a plpgsql variable, breaking the bare
  // `returning id into v_order_id` inside the function with a 42702
  // "ambiguous column" error; same fix already applied to save_product and
  // change_order_status. The Telegram notification below needs it for the
  // admin link. Hasn't been pushed/typed yet (run `npm run db:push` then
  // `npm run db:types`) — same bridge pattern as admin-settings.ts's
  // SocialWallColumns; remove this intersection once the generated type
  // catches up.
  const row = data?.[0] as (NonNullable<typeof data>[number] & { out_id: string }) | undefined;
  if (!row) {
    return genericFailure(tErrors("generic"));
  }

  const result: CheckoutActionResult = {
    success: true,
    orderNumber: row.order_number,
    publicToken: row.public_token,
  };

  // Fire-and-forget, scheduled for after the response is sent (next/server's
  // `after()`, backed by Vercel's waitUntil) — the customer must never wait
  // on Telegram, and a Telegram outage must never fail an order the DB
  // already committed. sendNewOrderTelegramNotification itself never throws
  // (see src/lib/telegram.ts), so this has nothing further to guard.
  const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  after(() =>
    sendNewOrderTelegramNotification({
      orderId: row.out_id,
      orderNumber: row.order_number,
      firstName: formResult.data.firstName,
      lastName: formResult.data.lastName,
      phone: e164Phone,
      city: formResult.data.city,
      country: COUNTRY_LABEL[formResult.data.country],
      itemCount,
      totalFormatted: formatPrice(totalCents, "en"),
      locale: actionResult.data.locale,
      adminUrl: `${getSiteUrl()}/admin/orders/${row.out_id}`,
      singleItemPhotoUrl: orderItems.length === 1 ? orderItems[0].image_url : null,
    }),
  );

  await setCachedResult(actionResult.data.idempotencyKey, result);
  return result;
}
