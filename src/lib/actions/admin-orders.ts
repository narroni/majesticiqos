"use server";

import "server-only";

import { updateTag } from "next/cache";
import { z } from "zod";

import { getAdminUser } from "@/lib/auth/get-admin-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/types";

export interface ChangeOrderStatusResult {
  success: boolean;
  error?: string;
  status?: OrderStatus;
}

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "completed",
  "cancelled",
] as const;

const changeOrderStatusSchema = z.object({
  orderId: z.uuid(),
  nextStatus: z.enum(ORDER_STATUSES),
});

export async function changeOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<ChangeOrderStatusResult> {
  const parsed = changeOrderStatusSchema.safeParse({ orderId, nextStatus });
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const { data, error } = await supabaseAdmin.rpc("change_order_status", {
    p_order_id: parsed.data.orderId,
    p_new_status: parsed.data.nextStatus,
  });

  if (error) {
    if (error.code === "P0001") {
      return { success: false, error: "That status change isn't allowed from here." };
    }
    if (error.code === "P0002") {
      return { success: false, error: "Order not found." };
    }
    return { success: false, error: "Something went wrong. Try again." };
  }

  const row = data?.[0];
  if (!row) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  // Stock/sales-count effects (restore on cancel, sales_count on complete)
  // happen inside the RPC/its triggers — this only keeps cached storefront
  // reads from going stale, since either could change what's shown there.
  updateTag("products");
  updateTag("home");

  return { success: true, status: row.out_status };
}

const updateOrderNoteSchema = z.object({
  orderId: z.uuid(),
  note: z.string().trim().max(2000),
});

export async function updateOrderNote(
  orderId: string,
  note: string,
): Promise<{ success: boolean; error?: string }> {
  const parsed = updateOrderNoteSchema.safeParse({ orderId, note });
  if (!parsed.success) {
    return { success: false, error: "Note is too long." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabaseAdmin
    .from("orders")
    .update({ admin_note: parsed.data.note || null })
    .eq("id", parsed.data.orderId);

  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  return { success: true };
}

export interface DeleteOrderResult {
  success: boolean;
  error?: string;
}

const deleteOrderSchema = z.object({ orderId: z.uuid() });

// Permanent — orders have no deleted_at/soft-delete column (unlike products),
// by design (BLUEPRINT §8.2 retains order history for 24 months). This is a
// deliberate exception the seller asked for; the typed "type the order
// number to confirm" gate lives client-side (admin-order-table.tsx) since
// it's a misclick guard, not a security boundary — admin auth below is the
// actual boundary, checked the same as every other action regardless of
// what the UI already confirmed.
export async function deleteOrder(orderId: string): Promise<DeleteOrderResult> {
  const parsed = deleteOrderSchema.safeParse({ orderId });
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabaseAdmin.from("orders").delete().eq("id", parsed.data.orderId);

  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  return { success: true };
}

export interface DeleteOrdersResult {
  success: boolean;
  error?: string;
  deletedIds?: string[];
}

const deleteOrdersSchema = z.object({ orderIds: z.array(z.uuid()).min(1).max(100) });

export async function deleteOrders(orderIds: string[]): Promise<DeleteOrdersResult> {
  const parsed = deleteOrdersSchema.safeParse({ orderIds });
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabaseAdmin.from("orders").delete().in("id", parsed.data.orderIds);

  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  return { success: true, deletedIds: parsed.data.orderIds };
}
