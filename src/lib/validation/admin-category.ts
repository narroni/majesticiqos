// Same reasoning as admin-product.ts's schema — shared between the category
// form's zodResolver and the save-category Server Action so the two can
// never drift. Admin is English-only, so no locale-aware message factory.
import { z } from "zod";

import { SLUG_PATTERN } from "@/lib/validation/admin-product";

export const adminCategorySchema = z.object({
  id: z.uuid(),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(200, "Slug must not exceed 200 characters")
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers, and hyphens only"),
  imageUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
  nameSq: z.string().trim().min(1, "Albanian name is required").max(150),
  descriptionSq: z.string().trim().max(2000).optional().or(z.literal("")),
  nameEn: z.string().trim().min(1, "English name is required").max(150),
  descriptionEn: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type AdminCategoryValues = z.infer<typeof adminCategorySchema>;
