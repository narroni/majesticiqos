// Shared between the product form's zodResolver and the save-product
// Server Action, same reasoning as checkout's schema — one set of rules,
// no drift. Admin is English-only, so unlike checkout's schema this needs
// no locale-aware message factory.
import { z } from "zod";

export const productImageSchema = z.object({
  storagePath: z.string().min(1),
  altSq: z.string().max(200).optional().or(z.literal("")),
  altEn: z.string().max(200).optional().or(z.literal("")),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  blurDataUrl: z.string().nullable(),
});

export type ProductImageValue = z.infer<typeof productImageSchema>;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const adminProductSchema = z
  .object({
    id: z.string().uuid(),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required")
      .max(200, "Slug must not exceed 200 characters")
      .regex(SLUG_PATTERN, "Use lowercase letters, numbers, and hyphens only"),
    sku: z.string().trim().max(100).optional().or(z.literal("")),
    categoryId: z.string().uuid().optional().or(z.literal("")),
    priceCents: z.number().int().positive("Price must be greater than 0"),
    discountPriceCents: z.number().int().positive().optional().nullable(),
    stockQuantity: z.number().int().min(0, "Stock can't be negative"),
    lowStockThreshold: z.number().int().min(0, "Threshold can't be negative"),
    trackInventory: z.boolean(),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    nameSq: z.string().trim().max(150, "Must not exceed 150 characters"),
    shortDescriptionSq: z.string().trim().max(300).optional().or(z.literal("")),
    descriptionSq: z.string().trim().max(5000).optional().or(z.literal("")),
    metaTitleSq: z.string().trim().max(200).optional().or(z.literal("")),
    metaDescriptionSq: z.string().trim().max(300).optional().or(z.literal("")),
    nameEn: z.string().trim().max(150, "Must not exceed 150 characters").optional().or(z.literal("")),
    shortDescriptionEn: z.string().trim().max(300).optional().or(z.literal("")),
    descriptionEn: z.string().trim().max(5000).optional().or(z.literal("")),
    metaTitleEn: z.string().trim().max(200).optional().or(z.literal("")),
    metaDescriptionEn: z.string().trim().max(300).optional().or(z.literal("")),
    images: z.array(productImageSchema),
  })
  .superRefine((data, ctx) => {
    if (data.nameSq.trim().length === 0) {
      ctx.addIssue({ code: "custom", message: "Albanian name is required", path: ["nameSq"] });
    }

    if (data.discountPriceCents != null && data.discountPriceCents >= data.priceCents) {
      ctx.addIssue({
        code: "custom",
        message: "Discount price must be less than the regular price",
        path: ["discountPriceCents"],
      });
    }

    // The only hard block on activation (BLUEPRINT §6.2, relaxed): at least
    // one image. Incomplete translations no longer block publishing — they
    // only surface as a warning (see REQUIRED_TRANSLATION_FIELDS below and
    // the admin product list/form UI), since a seller may legitimately want
    // to publish in one locale before the other is ready.
    if (data.isActive && data.images.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "At least one image is required to activate this product",
        path: ["images"],
      });
    }
  });

export type AdminProductValues = z.infer<typeof adminProductSchema>;

// Locale completeness is a warning, not a validation rule — see the
// superRefine above. Shared by the product form and the admin products list
// so both flag the same fields the same way.
export const REQUIRED_TRANSLATION_FIELDS: {
  key: keyof AdminProductValues;
  locale: "sq" | "en";
  label: string;
}[] = [
  { key: "nameSq", locale: "sq", label: "Albanian name" },
  { key: "shortDescriptionSq", locale: "sq", label: "Albanian short description" },
  { key: "descriptionSq", locale: "sq", label: "Albanian description" },
  { key: "nameEn", locale: "en", label: "English name" },
  { key: "shortDescriptionEn", locale: "en", label: "English short description" },
  { key: "descriptionEn", locale: "en", label: "English description" },
];

export function getIncompleteLocales(values: {
  nameSq: string;
  shortDescriptionSq: string;
  descriptionSq: string;
  nameEn: string;
  shortDescriptionEn: string;
  descriptionEn: string;
}): ("sq" | "en")[] {
  const incomplete = new Set<"sq" | "en">();

  for (const field of REQUIRED_TRANSLATION_FIELDS) {
    const value = values[field.key as keyof typeof values];
    if (typeof value !== "string" || value.trim().length === 0) {
      incomplete.add(field.locale);
    }
  }

  return [...incomplete];
}
