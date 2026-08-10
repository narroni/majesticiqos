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

    // The rule that matters (BLUEPRINT §6.2): can't go active without
    // complete translations in both locales AND at least one image.
    if (data.isActive) {
      const requiredTextFields: { key: keyof typeof data; label: string }[] = [
        { key: "nameSq", label: "Albanian name" },
        { key: "shortDescriptionSq", label: "Albanian short description" },
        { key: "descriptionSq", label: "Albanian description" },
        { key: "nameEn", label: "English name" },
        { key: "shortDescriptionEn", label: "English short description" },
        { key: "descriptionEn", label: "English description" },
      ];

      for (const field of requiredTextFields) {
        const value = data[field.key];
        if (typeof value !== "string" || value.trim().length === 0) {
          ctx.addIssue({
            code: "custom",
            message: `${field.label} is required to activate this product`,
            path: [field.key],
          });
        }
      }

      if (data.images.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "At least one image is required to activate this product",
          path: ["images"],
        });
      }
    }
  });

export type AdminProductValues = z.infer<typeof adminProductSchema>;
