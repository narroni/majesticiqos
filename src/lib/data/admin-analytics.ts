import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CountryCode } from "@/types";

// Every query here reads through the service role, same as admin-orders.ts
// — orders have no anon/authenticated RLS access by design. All aggregation
// happens in this file (or in Postgres for the grouped queries); pages only
// ever receive already-summarized numbers, never a raw order list.

function startOfUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUTCWeek(date: Date): Date {
  const start = startOfUTCDay(date);
  const day = start.getUTCDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  start.setUTCDate(start.getUTCDate() - diffToMonday);
  return start;
}

function startOfUTCMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export interface RevenueSummary {
  todayCents: number;
  weekCents: number;
  monthCents: number;
}

// Completed orders only (BLUEPRINT §6.4) — pending orders may never
// confirm, so counting them would overstate revenue.
export async function getRevenueSummary(): Promise<RevenueSummary> {
  const now = new Date();
  const todayStart = startOfUTCDay(now).toISOString();
  const weekStart = startOfUTCWeek(now).toISOString();
  const monthStart = startOfUTCMonth(now).toISOString();

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("total_cents, completed_at")
    .eq("status", "completed")
    .gte("completed_at", monthStart);

  if (error) {
    throw error;
  }

  let todayCents = 0;
  let weekCents = 0;
  let monthCents = 0;

  for (const row of data) {
    if (!row.completed_at) continue;
    monthCents += row.total_cents;
    if (row.completed_at >= weekStart) weekCents += row.total_cents;
    if (row.completed_at >= todayStart) todayCents += row.total_cents;
  }

  return { todayCents, weekCents, monthCents };
}

export interface OrderCountChange {
  currentCount: number;
  previousCount: number;
  percentChange: number | null;
}

// Rolling 30-day windows rather than calendar months — a partial
// current-month count compared against a full previous month would skew
// the percentage without actually meaning anything.
export async function getOrderCountChange(): Promise<OrderCountChange> {
  const now = Date.now();
  const start30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const start60 = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: currentCount, error: currentError }, { count: previousCount, error: previousError }] =
    await Promise.all([
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).gte("created_at", start30),
      supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", start60)
        .lt("created_at", start30),
    ]);

  if (currentError) throw currentError;
  if (previousError) throw previousError;

  const current = currentCount ?? 0;
  const previous = previousCount ?? 0;
  const percentChange = previous === 0 ? null : Math.round(((current - previous) / previous) * 100);

  return { currentCount: current, previousCount: previous, percentChange };
}

export async function getPendingOrderCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) throw error;
  return count ?? 0;
}

export async function getOutOfStockCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("track_inventory", true)
    .eq("is_active", true)
    .is("deleted_at", null)
    .eq("stock_quantity", 0);

  if (error) throw error;
  return count ?? 0;
}

export interface LowStockProduct {
  id: string;
  slug: string;
  nameSq: string;
  stockQuantity: number;
  lowStockThreshold: number;
}

export async function getLowStockProducts(): Promise<LowStockProduct[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, slug, stock_quantity, low_stock_threshold, product_translations(name, locale)")
    .eq("track_inventory", true)
    .eq("is_active", true)
    .is("deleted_at", null)
    .gt("stock_quantity", 0)
    .order("stock_quantity", { ascending: true });

  if (error) throw error;

  // Two columns can't be compared directly in a PostgREST filter, so the
  // <= threshold check happens here instead of in the query above.
  return data
    .filter((row) => row.stock_quantity <= row.low_stock_threshold)
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      nameSq: row.product_translations.find((t) => t.locale === "sq")?.name ?? row.slug,
      stockQuantity: row.stock_quantity,
      lowStockThreshold: row.low_stock_threshold,
    }));
}

export interface RevenueByDay {
  day: string;
  revenueCents: number;
}

export async function getRevenueByDay(days = 30): Promise<RevenueByDay[]> {
  const { data, error } = await supabaseAdmin.rpc("analytics_revenue_by_day", { p_days: days });
  if (error) throw error;
  return data.map((row) => ({ day: row.day, revenueCents: row.revenue_cents }));
}

export interface TopProduct {
  productId: string;
  nameEn: string;
  slug: string;
  unitsSold: number;
}

export async function getTopProducts(days = 30, limit = 5): Promise<TopProduct[]> {
  const { data, error } = await supabaseAdmin.rpc("analytics_top_products", {
    p_days: days,
    p_limit: limit,
  });
  if (error) throw error;
  return data.map((row) => ({
    productId: row.product_id,
    nameEn: row.name_en,
    slug: row.slug,
    unitsSold: row.units_sold,
  }));
}

export interface OrdersByCountry {
  country: CountryCode;
  orderCount: number;
}

export async function getOrdersByCountry(days = 30): Promise<OrdersByCountry[]> {
  const { data, error } = await supabaseAdmin.rpc("analytics_orders_by_country", { p_days: days });
  if (error) throw error;
  return data.map((row) => ({ country: row.country, orderCount: row.order_count }));
}
