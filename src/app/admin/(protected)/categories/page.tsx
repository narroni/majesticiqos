import { Plus } from "lucide-react";
import Link from "next/link";

import { AdminCategoryList } from "@/components/admin/categories/admin-category-list";
import { Button } from "@/components/ui/button";
import { getAdminCategories } from "@/lib/data/admin-categories";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-h2 font-display text-fg-primary">Categories</h1>
        <Button render={<Link href="/admin/categories/new" />} nativeButton={false}>
          <Plus />
          New category
        </Button>
      </div>

      <AdminCategoryList categories={categories} />
    </div>
  );
}
