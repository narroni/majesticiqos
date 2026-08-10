"use server";

import "server-only";

import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { z } from "zod";

import { getAdminUser } from "@/lib/auth/get-admin-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BUCKET = "product-images";
const MAX_DIMENSION = 2400;
const BLUR_WIDTH = 16;

export interface UploadProductImageResult {
  success: boolean;
  error?: string;
  image?: {
    storagePath: string;
    width: number;
    height: number;
    blurDataUrl: string;
  };
}

// BLUEPRINT §2.8/§8.2 — Server Action only, no direct client uploads. MIME
// is checked by magic bytes (not extension or the browser's reported
// content-type, both trivially spoofable), converted to WebP, resized,
// EXIF-stripped, and given a random filename before it ever touches
// Storage. Shared by every upload entry point (product images, hero
// background images) — only the storage path prefix differs between them.
async function processAndUploadImage(
  formData: FormData,
  pathPrefix: string,
): Promise<UploadProductImageResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "No file provided" };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { success: false, error: "File exceeds the 5MB limit" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // A real SVG is XML text with no binary signature file-type recognizes,
  // so it naturally falls outside this allowlist rather than needing a
  // special rejection case — same for any other disguised non-image file.
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    return { success: false, error: "Only JPEG, PNG, or WebP images are allowed" };
  }

  // .rotate() with no args: auto-orient from the EXIF orientation tag, then
  // discard it — sharp never carries metadata into the output unless
  // .withMetadata() is called, which this deliberately never does.
  let pipeline = sharp(buffer).rotate();
  const sourceMetadata = await pipeline.metadata();

  if ((sourceMetadata.width ?? 0) > MAX_DIMENSION || (sourceMetadata.height ?? 0) > MAX_DIMENSION) {
    pipeline = pipeline.resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const webpBuffer = await pipeline.webp({ quality: 82 }).toBuffer();
  const { width, height } = await sharp(webpBuffer).metadata();

  const blurBuffer = await sharp(webpBuffer)
    .resize({ width: BLUR_WIDTH })
    .webp({ quality: 40 })
    .toBuffer();
  const blurDataUrl = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

  const path = `${pathPrefix}/${randomUUID()}.webp`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, webpBuffer, { contentType: "image/webp", cacheControl: "31536000" });

  if (uploadError) {
    return { success: false, error: "Upload failed. Try again." };
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  return {
    success: true,
    image: {
      storagePath: publicUrlData.publicUrl,
      width: width ?? 0,
      height: height ?? 0,
      blurDataUrl,
    },
  };
}

const productIdSchema = z.uuid();

export async function uploadProductImage(
  productId: string,
  formData: FormData,
): Promise<UploadProductImageResult> {
  const parsedProductId = productIdSchema.safeParse(productId);
  if (!parsedProductId.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  return processAndUploadImage(formData, `products/${parsedProductId.data}`);
}

// No separate scalar input to Zod-validate ahead of the auth check here —
// unlike uploadProductImage's productId, there's nothing but the file itself
// (validated by magic bytes inside processAndUploadImage, which isn't Zod's
// job), so the auth check is the first meaningful thing this can do.
export async function uploadHeroImage(formData: FormData): Promise<UploadProductImageResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  return processAndUploadImage(formData, "hero");
}

// Same no-scalar-input reasoning as uploadHeroImage.
export async function uploadSocialImage(formData: FormData): Promise<UploadProductImageResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  return processAndUploadImage(formData, "social");
}

const categoryIdSchema = z.uuid();

export async function uploadCategoryImage(
  categoryId: string,
  formData: FormData,
): Promise<UploadProductImageResult> {
  const parsedCategoryId = categoryIdSchema.safeParse(categoryId);
  if (!parsedCategoryId.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  return processAndUploadImage(formData, `categories/${parsedCategoryId.data}`);
}

function extractStorageObjectPath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  return index === -1 ? null : publicUrl.slice(index + marker.length);
}

// Called both when a not-yet-saved image is removed in the form (nothing in
// the DB ever pointed at it) and, from saveProduct, for images dropped from
// an existing product after a successful save — never before, so a failed
// save can't orphan a still-referenced file.
const storagePathSchema = z.url().max(2048);

export async function deleteProductImageFile(storagePath: string): Promise<void> {
  const parsed = storagePathSchema.safeParse(storagePath);
  if (!parsed.success) {
    return;
  }

  const admin = await getAdminUser();
  if (!admin) {
    return;
  }

  const objectPath = extractStorageObjectPath(parsed.data);
  if (!objectPath) {
    return;
  }

  await supabaseAdmin.storage.from(BUCKET).remove([objectPath]);
}
