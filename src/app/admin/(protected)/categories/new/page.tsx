import { randomUUID } from "node:crypto";

import { CategoryForm } from "@/components/admin/categories/category-form";
import { getAdminCategories } from "@/lib/data/admin-categories";
import type { AdminCategoryValues } from "@/lib/validation/admin-category";

export default async function NewAdminCategoryPage() {
  const categories = await getAdminCategories();

  // Generated server-side (not in the client form) — same reasoning as the
  // product form: the id is the Storage path `categories/{id}/...` images
  // upload to before the category row exists, so it must be stable across
  // the whole create session.
  const defaultValues: AdminCategoryValues = {
    id: randomUUID(),
    slug: "",
    imageUrl: "",
    sortOrder: categories.length,
    isActive: false,
    nameSq: "",
    descriptionSq: "",
    nameEn: "",
    descriptionEn: "",
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h2 font-display text-fg-primary">New category</h1>
      <CategoryForm mode="create" defaultValues={defaultValues} />
    </div>
  );
}
