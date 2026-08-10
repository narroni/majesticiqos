import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/categories/category-form";
import { getAdminCategoryById } from "@/lib/data/admin-categories";
import type { AdminCategoryValues } from "@/lib/validation/admin-category";

interface EditAdminCategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAdminCategoryPage({ params }: EditAdminCategoryPageProps) {
  const { id } = await params;

  const category = await getAdminCategoryById(id);
  if (!category) {
    notFound();
  }

  const defaultValues: AdminCategoryValues = {
    id: category.id,
    slug: category.slug,
    imageUrl: category.imageUrl ?? "",
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    nameSq: category.nameSq,
    descriptionSq: category.descriptionSq,
    nameEn: category.nameEn,
    descriptionEn: category.descriptionEn,
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h2 font-display text-fg-primary">Edit category</h1>
      <CategoryForm mode="edit" defaultValues={defaultValues} />
    </div>
  );
}
