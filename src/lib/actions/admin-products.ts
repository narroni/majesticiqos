"use server";

import "server-only";

import { updateTag } from "next/cache";
import { z } from "zod";

import { deleteProductImageFile } from "@/lib/actions/admin-upload";
import { getAdminUser } from "@/lib/auth/get-admin-user";
import {
  getAdminProductById,
  isProductReadyForActive,
  isSlugTaken,
} from "@/lib/data/admin-products";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  adminProductSchema,
  SLUG_PATTERN,
  type AdminProductValues,
} from "@/lib/validation/admin-product";
import type { Json } from "@/types/database";

export interface SaveProductFieldError {
  field: string;
  message: string;
}

export type SaveProductResult =
  | { success: true; id: string; slug: string }
  | { success: false; errors: SaveProductFieldError[] };

interface SaveProductRpcArgs {
  p_id: string;
  p_slug: string;
  p_sku: string;
  p_category_id: string | null;
  p_price_cents: number;
  p_discount_price_cents: number | null;
  p_stock_quantity: number;
  p_low_stock_threshold: number;
  p_track_inventory: boolean;
  p_is_active: boolean;
  p_is_featured: boolean;
  p_name_sq: string;
  p_short_description_sq: string;
  p_description_sq: string;
  p_meta_title_sq: string;
  p_meta_description_sq: string;
  p_name_en: string;
  p_short_description_en: string;
  p_description_en: string;
  p_meta_title_en: string;
  p_meta_description_en: string;
  p_images: Json;
}

interface SaveProductRpcRow {
  out_id: string;
  out_slug: string;
}

// The generated Args type (src/types/database.ts) types p_category_id and
// p_discount_price_cents as non-nullable — Supabase's type generator has no
// way to express "this Postgres function parameter is nullable" the way it
// does for table columns. This bridge is permanent, not a stopgap; rerunning
// db:types will never fix it, since the underlying limitation is in the
// generator itself, not in stale output.
const rpcClient = supabaseAdmin as unknown as {
  rpc(
    fn: "save_product",
    args: SaveProductRpcArgs,
  ): Promise<{
    data: SaveProductRpcRow[] | null;
    error: { message: string; details?: string | null; code?: string } | null;
  }>;
};

const checkSlugAvailabilitySchema = z.object({
  slug: z.string().trim().min(1).max(200).regex(SLUG_PATTERN),
  excludeId: z.uuid().optional(),
});

export async function checkSlugAvailability(slug: string, excludeId?: string): Promise<boolean> {
  const parsed = checkSlugAvailabilitySchema.safeParse({ slug, excludeId });
  if (!parsed.success) {
    return false;
  }

  const admin = await getAdminUser();
  if (!admin) {
    return false;
  }
  return !(await isSlugTaken(parsed.data.slug, parsed.data.excludeId));
}

export async function saveProduct(input: AdminProductValues): Promise<SaveProductResult> {
  const parsed = adminProductSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => ({
        field: String(issue.path[0] ?? "form"),
        message: issue.message,
      })),
    };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, errors: [{ field: "form", message: "Unauthorized" }] };
  }

  const data = parsed.data;

  // Belt-and-braces beyond the form's live-typing check — the DB's unique
  // constraint is the final word (checked again via the RPC's error code
  // below), but checking here first gives a clean field error instead of a
  // raw Postgres one for the common case.
  if (await isSlugTaken(data.slug, data.id)) {
    return { success: false, errors: [{ field: "slug", message: "This slug is already in use" }] };
  }

  // Diff against current images so removed ones get cleaned out of Storage
  // — but only after the DB write below succeeds. A failed save must never
  // delete a file the live product still references.
  const existing = await getAdminProductById(data.id);
  const previousPaths = new Set((existing?.images ?? []).map((image) => image.storagePath));
  const nextPaths = new Set(data.images.map((image) => image.storagePath));
  const removedPaths = [...previousPaths].filter((path) => !nextPaths.has(path));
  const previousSlug = existing?.slug;

  const { data: rows, error } = await rpcClient.rpc("save_product", {
    p_id: data.id,
    p_slug: data.slug,
    p_sku: data.sku ?? "",
    p_category_id: data.categoryId || null,
    p_price_cents: data.priceCents,
    p_discount_price_cents: data.discountPriceCents ?? null,
    p_stock_quantity: data.stockQuantity,
    p_low_stock_threshold: data.lowStockThreshold,
    p_track_inventory: data.trackInventory,
    p_is_active: data.isActive,
    p_is_featured: data.isFeatured,
    p_name_sq: data.nameSq,
    p_short_description_sq: data.shortDescriptionSq ?? "",
    p_description_sq: data.descriptionSq ?? "",
    p_meta_title_sq: data.metaTitleSq ?? "",
    p_meta_description_sq: data.metaDescriptionSq ?? "",
    p_name_en: data.nameEn ?? "",
    p_short_description_en: data.shortDescriptionEn ?? "",
    p_description_en: data.descriptionEn ?? "",
    p_meta_title_en: data.metaTitleEn ?? "",
    p_meta_description_en: data.metaDescriptionEn ?? "",
    p_images: data.images.map((image) => ({
      storage_path: image.storagePath,
      alt_sq: image.altSq ?? "",
      alt_en: image.altEn ?? "",
      width: image.width ?? "",
      height: image.height ?? "",
      blur_data_url: image.blurDataUrl ?? "",
    })) as unknown as Json,
  });

  if (error) {
    if (error.code === "23505") {
      const target = error.message.includes("sku") || error.details?.includes("sku") ? "sku" : "slug";
      return {
        success: false,
        errors: [
          {
            field: target,
            message: target === "sku" ? "This SKU is already in use" : "This slug is already in use",
          },
        ],
      };
    }
    return { success: false, errors: [{ field: "form", message: "Something went wrong. Try again." }] };
  }

  const row = rows?.[0];
  if (!row) {
    return { success: false, errors: [{ field: "form", message: "Something went wrong. Try again." }] };
  }

  if (removedPaths.length > 0) {
    await Promise.all(removedPaths.map((path) => deleteProductImageFile(path)));
  }

  updateTag("products");
  updateTag("home");
  updateTag(`product:${row.out_slug}`);
  if (previousSlug && previousSlug !== row.out_slug) {
    updateTag(`product:${previousSlug}`);
  }

  return { success: true, id: row.out_id, slug: row.out_slug };
}

const idSchema = z.uuid();

export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const product = await getAdminProductById(parsed.data);
  if (!product) {
    return { success: false, error: "Product not found" };
  }

  const { error } = await supabaseAdmin
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data);

  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  updateTag("products");
  updateTag("home");
  updateTag(`product:${product.slug}`);

  return { success: true };
}

const deleteProductsSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(100),
});

export interface DeleteProductsResult {
  success: boolean;
  error?: string;
  deletedIds?: string[];
}

export async function deleteProducts(ids: string[]): Promise<DeleteProductsResult> {
  const parsed = deleteProductsSchema.safeParse({ ids });
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const { data: matched, error: fetchError } = await supabaseAdmin
    .from("products")
    .select("id, slug")
    .in("id", parsed.data.ids)
    .is("deleted_at", null);

  if (fetchError) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  if (!matched || matched.length === 0) {
    return { success: false, error: "No matching products found." };
  }

  const matchedIds = matched.map((row) => row.id);

  const { error } = await supabaseAdmin
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", matchedIds);

  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  updateTag("products");
  updateTag("home");
  for (const row of matched) {
    updateTag(`product:${row.slug}`);
  }

  return { success: true, deletedIds: matchedIds };
}

const toggleProductSchema = z.object({
  id: z.uuid(),
  nextValue: z.boolean(),
});

export async function toggleProductActive(
  id: string,
  nextValue: boolean,
): Promise<{ success: boolean; error?: string }> {
  const parsed = toggleProductSchema.safeParse({ id, nextValue });
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  // The one hard rule, enforced here too — the list page's toggle is just
  // another public entry point into setting is_active, and a UI guard there
  // proves nothing on its own. Incomplete translations no longer block
  // activation, only the image requirement does.
  if (parsed.data.nextValue && !(await isProductReadyForActive(parsed.data.id))) {
    return {
      success: false,
      error: "Add at least one image before activating.",
    };
  }

  const product = await getAdminProductById(parsed.data.id);
  if (!product) {
    return { success: false, error: "Product not found" };
  }

  const { error } = await supabaseAdmin
    .from("products")
    .update({ is_active: parsed.data.nextValue })
    .eq("id", parsed.data.id);

  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  updateTag("products");
  updateTag("home");
  updateTag(`product:${product.slug}`);

  return { success: true };
}

export async function toggleProductFeatured(
  id: string,
  nextValue: boolean,
): Promise<{ success: boolean; error?: string }> {
  const parsed = toggleProductSchema.safeParse({ id, nextValue });
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const product = await getAdminProductById(parsed.data.id);
  if (!product) {
    return { success: false, error: "Product not found" };
  }

  const { error } = await supabaseAdmin
    .from("products")
    .update({ is_featured: parsed.data.nextValue })
    .eq("id", parsed.data.id);

  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  updateTag("products");
  updateTag("home");
  updateTag(`product:${product.slug}`);

  return { success: true };
}
