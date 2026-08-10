import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { OrderSummary } from "@/types";

// orders/order_items have no anon RLS policy at all (BLUEPRINT §8.2) — the
// public_token in the URL is the only credential a customer has, functioning
// as an unguessable capability link. Looking it up therefore requires the
// service role client rather than the usual anon DAL client.
export async function getOrderByPublicToken(
  publicToken: string,
): Promise<OrderSummary | null> {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, order_number, public_token, status, locale, first_name, last_name, subtotal_cents, shipping_cents, total_cents, created_at",
    )
    .eq("public_token", publicToken)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!order) {
    return null;
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .select(
      "product_id, product_slug, product_name_sq, product_name_en, image_url, unit_price_cents, original_price_cents, quantity, line_total_cents",
    )
    .eq("order_id", order.id);

  if (itemsError) {
    throw itemsError;
  }

  return {
    orderNumber: order.order_number,
    publicToken: order.public_token,
    status: order.status,
    locale: order.locale,
    firstName: order.first_name,
    lastName: order.last_name,
    subtotalCents: order.subtotal_cents,
    shippingCents: order.shipping_cents,
    totalCents: order.total_cents,
    createdAt: order.created_at,
    items: (items ?? []).map((item) => ({
      productId: item.product_id,
      productSlug: item.product_slug,
      nameSq: item.product_name_sq,
      nameEn: item.product_name_en,
      imageUrl: item.image_url,
      unitPriceCents: item.unit_price_cents,
      originalPriceCents: item.original_price_cents,
      quantity: item.quantity,
      lineTotalCents: item.line_total_cents,
    })),
  };
}
