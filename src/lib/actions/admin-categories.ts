"use server";

import "server-only";

import { updateTag } from "next/cache";
import { z } from "zod";

import { deleteProductImageFile } from "@/lib/actions/admin-upload";
import { getAdminUser } from "@/lib/auth/get-admin-user";
import {
  getActiveProductCountForCategory,
  getAdminCategories,
  getAdminCategoryById,
  isCategorySlugTaken,
} from "@/lib/data/admin-categories";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { adminCategorySchema, type AdminCategoryValues } from "@/lib/validation/admin-category";
import { SLUG_PATTERN } from "@/lib/validation/admin-product";

export interface SaveCategoryFieldError {
  field: string;
  message: string;
}

export type SaveCategoryResult =
  | { success: true; id: string; slug: string }
  | { success: false; errors: SaveCategoryFieldError[] };

const checkSlugAvailabilitySchema = z.object({
  slug: z.string().trim().min(1).max(200).regex(SLUG_PATTERN),
  excludeId: z.uuid().optional(),
});

export async function checkCategorySlugAvailability(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const parsed = checkSlugAvailabilitySchema.safeParse({ slug, excludeId });
  if (!parsed.success) {
    return false;
  }

  const admin = await getAdminUser();
  if (!admin) {
    return false;
  }

  return !(await isCategorySlugTaken(parsed.data.slug, parsed.data.excludeId));
}

export async function saveCategory(input: AdminCategoryValues): Promise<SaveCategoryResult> {
  const parsed = adminCategorySchema.safeParse(input);
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

  // Belt-and-braces beyond the form's live-typing check, same reasoning as
  // saveProduct — the DB's unique constraint is the final word.
  if (await isCategorySlugTaken(data.slug, data.id)) {
    return { success: false, errors: [{ field: "slug", message: "This slug is already in use" }] };
  }

  const existing = await getAdminCategoryById(data.id);
  const previousImageUrl = existing?.imageUrl ?? null;
  const previousSlug = existing?.slug;

  const { data: rows, error } = await supabaseAdmin.rpc("save_category", {
    p_id: data.id,
    p_slug: data.slug,
    p_image_url: data.imageUrl ?? "",
    p_sort_order: data.sortOrder,
    p_is_active: data.isActive,
    p_name_sq: data.nameSq,
    p_description_sq: data.descriptionSq ?? "",
    p_name_en: data.nameEn,
    p_description_en: data.descriptionEn ?? "",
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, errors: [{ field: "slug", message: "This slug is already in use" }] };
    }
    return { success: false, errors: [{ field: "form", message: "Something went wrong. Try again." }] };
  }

  const row = rows?.[0];
  if (!row) {
    return { success: false, errors: [{ field: "form", message: "Something went wrong. Try again." }] };
  }

  // Only after the DB write succeeds — a failed save must never delete a
  // file the live category still references (same ordering as saveProduct).
  if (previousImageUrl && previousImageUrl !== (data.imageUrl || null)) {
    await deleteProductImageFile(previousImageUrl);
  }

  updateTag("categories");
  updateTag("home");
  updateTag(`category:${row.out_slug}`);
  if (previousSlug && previousSlug !== row.out_slug) {
    updateTag(`category:${previousSlug}`);
  }

  return { success: true, id: row.out_id, slug: row.out_slug };
}

export interface DeleteCategoryResult {
  success: boolean;
  error?: string;
}

const idSchema = z.uuid();

export async function deleteCategory(id: string): Promise<DeleteCategoryResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const category = await getAdminCategoryById(parsed.data);
  if (!category) {
    return { success: false, error: "Category not found." };
  }

  // Categories have no deleted_at (no soft-delete) and products.category_id
  // is ON DELETE SET NULL — without this check, deleting a category would
  // silently de-categorize every product referencing it. Block instead.
  const productCount = await getActiveProductCountForCategory(parsed.data);
  if (productCount > 0) {
    return {
      success: false,
      error: `Can't delete — ${productCount} ${productCount === 1 ? "product" : "products"} still use this category. Move them to another category first.`,
    };
  }

  const { error } = await supabaseAdmin.from("categories").delete().eq("id", parsed.data);
  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  if (category.imageUrl) {
    await deleteProductImageFile(category.imageUrl);
  }

  updateTag("categories");
  updateTag("home");
  updateTag(`category:${category.slug}`);

  return { success: true };
}

const toggleCategoryActiveSchema = z.object({
  id: z.uuid(),
  nextValue: z.boolean(),
});

export async function toggleCategoryActive(
  id: string,
  nextValue: boolean,
): Promise<DeleteCategoryResult> {
  const parsed = toggleCategoryActiveSchema.safeParse({ id, nextValue });
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const category = await getAdminCategoryById(parsed.data.id);
  if (!category) {
    return { success: false, error: "Category not found." };
  }

  const { error } = await supabaseAdmin
    .from("categories")
    .update({ is_active: parsed.data.nextValue })
    .eq("id", parsed.data.id);

  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  updateTag("categories");
  updateTag("home");
  updateTag(`category:${category.slug}`);

  return { success: true };
}

const moveCategorySortOrderSchema = z.object({
  id: z.uuid(),
  direction: z.enum(["up", "down"]),
});

export async function moveCategorySortOrder(
  id: string,
  direction: "up" | "down",
): Promise<DeleteCategoryResult> {
  const parsed = moveCategorySortOrderSchema.safeParse({ id, direction });
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const categories = await getAdminCategories();
  const index = categories.findIndex((category) => category.id === parsed.data.id);
  if (index === -1) {
    return { success: false, error: "Category not found." };
  }

  const swapIndex = parsed.data.direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= categories.length) {
    return { success: true };
  }

  const current = categories[index];
  const neighbor = categories[swapIndex];

  const [{ error: error1 }, { error: error2 }] = await Promise.all([
    supabaseAdmin
      .from("categories")
      .update({ sort_order: neighbor.sortOrder })
      .eq("id", current.id),
    supabaseAdmin
      .from("categories")
      .update({ sort_order: current.sortOrder })
      .eq("id", neighbor.id),
  ]);

  if (error1 || error2) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  updateTag("categories");
  updateTag("home");

  return { success: true };
}
