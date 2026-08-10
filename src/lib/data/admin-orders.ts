import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CountryCode, Locale, OrderStatus } from "@/types";

// Orders/order_items have no anon RLS policy at all (BLUEPRINT §8.2) — every
// read here goes through the service role, by design, not oversight.

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  itemCount: number;
  totalCents: number;
  status: OrderStatus;
  createdAt: string;
}

export interface AdminOrderItem {
  id: string;
  productId: string | null;
  productSlug: string;
  name: string;
  imageUrl: string | null;
  unitPriceCents: number;
  originalPriceCents: number | null;
  quantity: number;
  lineTotalCents: number;
}

export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  publicToken: string;
  status: OrderStatus;
  locale: Locale;
  firstName: string;
  lastName: string;
  phone: string;
  phoneCountry: string;
  email: string | null;
  addressLine: string;
  city: string;
  postalCode: string | null;
  country: CountryCode;
  customerNote: string | null;
  adminNote: string | null;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: AdminOrderItem[];
}

export interface AdminOrderFilters {
  status?: OrderStatus;
  page?: number;
  perPage?: number;
}

const DEFAULT_PER_PAGE = 20;

const LIST_COLUMNS =
  "id, order_number, first_name, last_name, phone, total_cents, status, created_at, order_items(quantity)";

interface ListRow {
  id: string;
  order_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  total_cents: number;
  status: OrderStatus;
  created_at: string;
  order_items: { quantity: number }[];
}

function mapListRow(row: ListRow): AdminOrderListItem {
  return {
    id: row.id,
    orderNumber: row.order_number,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    itemCount: row.order_items.reduce((sum, item) => sum + item.quantity, 0),
    totalCents: row.total_cents,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getAdminOrders(filters: AdminOrderFilters = {}) {
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;
  const from = (page - 1) * perPage;

  let query = supabaseAdmin
    .from("orders")
    .select(LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + perPage - 1);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, count, error } = await query;
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as ListRow[];

  return { items: rows.map(mapListRow), total: count ?? 0, page, perPage };
}

export interface AdminOrderRowItem {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

// The rebuilt /admin/orders table's row shape — a summary line plus
// everything the expand-in-place detail needs (address, items, note
// breakdown), fetched together in one query rather than a second
// per-expand round trip. Deliberately separate from AdminOrderListItem
// (used by the overview widget and Kanban, both of which only need the
// summary fields) rather than widening that type for every caller.
export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  addressLine: string;
  postalCode: string | null;
  country: CountryCode;
  customerNote: string | null;
  adminNote: string | null;
  itemCount: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  status: OrderStatus;
  createdAt: string;
  items: AdminOrderRowItem[];
}

const DETAILED_LIST_COLUMNS = `
  id, order_number, first_name, last_name, phone, address_line, city, postal_code,
  country, customer_note, admin_note, subtotal_cents, shipping_cents, total_cents,
  status, created_at,
  order_items(id, product_name_en, quantity, unit_price_cents, line_total_cents)
`;

interface DetailedListRow {
  id: string;
  order_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line: string;
  city: string;
  postal_code: string | null;
  country: CountryCode;
  customer_note: string | null;
  admin_note: string | null;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  status: OrderStatus;
  created_at: string;
  order_items: {
    id: string;
    product_name_en: string;
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
  }[];
}

export async function getAdminOrdersDetailed(filters: AdminOrderFilters = {}) {
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;
  const from = (page - 1) * perPage;

  let query = supabaseAdmin
    .from("orders")
    .select(DETAILED_LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + perPage - 1);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, count, error } = await query;
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as DetailedListRow[];

  const items: AdminOrderRow[] = rows.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    city: row.city,
    addressLine: row.address_line,
    postalCode: row.postal_code,
    country: row.country,
    customerNote: row.customer_note,
    adminNote: row.admin_note,
    itemCount: row.order_items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    status: row.status,
    createdAt: row.created_at,
    items: row.order_items.map((item) => ({
      id: item.id,
      name: item.product_name_en,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      lineTotalCents: item.line_total_cents,
    })),
  }));

  return { items, total: count ?? 0, page, perPage };
}

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "completed",
  "cancelled",
];

// Kanban shows every status at once, so this can't reuse getAdminOrders'
// single-status pagination — one bounded query per column instead of a
// single unbounded fetch, so this stays cheap regardless of how many
// completed/cancelled orders have piled up historically.
const KANBAN_PER_COLUMN_LIMIT = 50;

export async function getAdminOrdersForKanban(): Promise<Record<OrderStatus, AdminOrderListItem[]>> {
  const results = await Promise.all(
    ORDER_STATUSES.map((status) =>
      supabaseAdmin
        .from("orders")
        .select(LIST_COLUMNS)
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(KANBAN_PER_COLUMN_LIMIT),
    ),
  );

  const columns = {} as Record<OrderStatus, AdminOrderListItem[]>;

  ORDER_STATUSES.forEach((status, index) => {
    const { data, error } = results[index];
    if (error) {
      throw error;
    }
    columns[status] = ((data ?? []) as unknown as ListRow[]).map(mapListRow);
  });

  return columns;
}

export async function getOrderStatusCounts(): Promise<Record<OrderStatus, number>> {
  const { data, error } = await supabaseAdmin.from("orders").select("status");
  if (error) {
    throw error;
  }

  const counts: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    preparing: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const row of (data ?? []) as { status: OrderStatus }[]) {
    counts[row.status] += 1;
  }

  return counts;
}

const DETAIL_COLUMNS = `
  id, order_number, public_token, status, locale, first_name, last_name, phone,
  phone_country, email, address_line, city, postal_code, country, customer_note,
  admin_note, subtotal_cents, shipping_cents, total_cents, created_at,
  confirmed_at, shipped_at, completed_at, cancelled_at,
  order_items(id, product_id, product_slug, product_name_en, image_url,
    unit_price_cents, original_price_cents, quantity, line_total_cents)
`;

interface DetailRow {
  id: string;
  order_number: string;
  public_token: string;
  status: OrderStatus;
  locale: Locale;
  first_name: string;
  last_name: string;
  phone: string;
  phone_country: string;
  email: string | null;
  address_line: string;
  city: string;
  postal_code: string | null;
  country: CountryCode;
  customer_note: string | null;
  admin_note: string | null;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  created_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  order_items: {
    id: string;
    product_id: string | null;
    product_slug: string;
    product_name_en: string;
    image_url: string | null;
    unit_price_cents: number;
    original_price_cents: number | null;
    quantity: number;
    line_total_cents: number;
  }[];
}

export async function getAdminOrderById(id: string): Promise<AdminOrderDetail | null> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  const row = data as unknown as DetailRow;

  return {
    id: row.id,
    orderNumber: row.order_number,
    publicToken: row.public_token,
    status: row.status,
    locale: row.locale,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    phoneCountry: row.phone_country,
    email: row.email,
    addressLine: row.address_line,
    city: row.city,
    postalCode: row.postal_code,
    country: row.country,
    customerNote: row.customer_note,
    adminNote: row.admin_note,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    shippedAt: row.shipped_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    // English name only — the admin UI itself is English-only (see
    // CLAUDE.md/§6.1); order.locale is surfaced separately so the seller
    // knows which language to call the customer in, not to switch the
    // admin's own display language.
    items: row.order_items
      .map((item) => ({
        id: item.id,
        productId: item.product_id,
        productSlug: item.product_slug,
        name: item.product_name_en,
        imageUrl: item.image_url,
        unitPriceCents: item.unit_price_cents,
        originalPriceCents: item.original_price_cents,
        quantity: item.quantity,
        lineTotalCents: item.line_total_cents,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
