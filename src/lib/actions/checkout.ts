"use server";

import "server-only";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { getProductsForCheckout } from "@/lib/data/products";
import { getShippingRate } from "@/lib/data/shipping";
import { calculateSubtotal, calculateTotal, getLineTotal, getShippingCost } from "@/lib/pricing";
import { checkRateLimit, hashIp } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase/admin";
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

export async function submitCheckout(
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

    return {
      success: false,
      errors: fieldErrors.length > 0 ? fieldErrors : [{ field: "form", message: tErrors("generic") }],
    };
  }

  // Honeypot — real users never see this field, so any value means a bot.
  if (formResult.data.honeypot) {
    return genericFailure(tErrors("generic"));
  }

  // Minimum time-on-form.
  const elapsedSeconds = (Date.now() - actionResult.data.formStartedAt) / 1000;
  if (elapsedSeconds < MIN_FORM_SECONDS) {
    return genericFailure(tErrors("generic"));
  }

  // Idempotency — a double-submit with the same key replays the first result.
  const cached = await getCachedResult(actionResult.data.idempotencyKey);
  if (cached) {
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
    return genericFailure(tErrors("generic"));
  }

  // 3. Recompute every price and stock check from the database — the client
  // sends only { productId, quantity }; nothing priced is ever trusted.
  const productIds = actionResult.data.items.map((item) => item.productId);
  const products = await getProductsForCheckout(productIds);
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

    return genericFailure(tErrors("generic"));
  }

  const row = data?.[0];
  if (!row) {
    return genericFailure(tErrors("generic"));
  }

  const result: CheckoutActionResult = {
    success: true,
    orderNumber: row.order_number,
    publicToken: row.public_token,
  };

  await setCachedResult(actionResult.data.idempotencyKey, result);
  return result;
}
