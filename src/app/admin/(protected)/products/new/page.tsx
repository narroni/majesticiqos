import { randomUUID } from "node:crypto";

import { ProductForm } from "@/components/admin/products/product-form";
import { getAdminCategoryOptions } from "@/lib/data/admin-products";
import type { AdminProductValues } from "@/lib/validation/admin-product";

export default async function NewAdminProductPage() {
  const categories = await getAdminCategoryOptions();

  // Generated server-side (not in the client form) so the id — and
  // therefore the Storage path `products/{id}/...` images upload to before
  // the product row exists — is stable across the whole create session.
  const defaultValues: AdminProductValues = {
    id: randomUUID(),
    slug: "",
    sku: "",
    categoryId: "",
    priceCents: 0,
    discountPriceCents: null,
    stockQuantity: 0,
    lowStockThreshold: 3,
    trackInventory: true,
    isActive: false,
    isFeatured: false,
    nameSq: "",
    shortDescriptionSq: "",
    descriptionSq: "",
    metaTitleSq: "",
    metaDescriptionSq: "",
    nameEn: "",
    shortDescriptionEn: "",
    descriptionEn: "",
    metaTitleEn: "",
    metaDescriptionEn: "",
    images: [],
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h2 font-display text-fg-primary">New product</h1>
      <ProductForm mode="create" defaultValues={defaultValues} categories={categories} />
    </div>
  );
}
