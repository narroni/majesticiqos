import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/products/product-form";
import { getAdminCategoryOptions, getAdminProductById } from "@/lib/data/admin-products";
import type { AdminProductValues } from "@/lib/validation/admin-product";

interface EditAdminProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAdminProductPage({ params }: EditAdminProductPageProps) {
  const { id } = await params;

  const [categories, product] = await Promise.all([
    getAdminCategoryOptions(),
    getAdminProductById(id),
  ]);

  if (!product) {
    notFound();
  }

  const defaultValues: AdminProductValues = {
    id: product.id,
    slug: product.slug,
    sku: product.sku ?? "",
    categoryId: product.categoryId ?? "",
    priceCents: product.priceCents,
    discountPriceCents: product.discountPriceCents,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    trackInventory: product.trackInventory,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    nameSq: product.nameSq,
    shortDescriptionSq: product.shortDescriptionSq,
    descriptionSq: product.descriptionSq,
    metaTitleSq: product.metaTitleSq,
    metaDescriptionSq: product.metaDescriptionSq,
    nameEn: product.nameEn,
    shortDescriptionEn: product.shortDescriptionEn,
    descriptionEn: product.descriptionEn,
    metaTitleEn: product.metaTitleEn,
    metaDescriptionEn: product.metaDescriptionEn,
    images: product.images.map((image) => ({
      storagePath: image.storagePath,
      altSq: image.altSq ?? "",
      altEn: image.altEn ?? "",
      width: image.width,
      height: image.height,
      blurDataUrl: image.blurDataUrl,
    })),
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h2 font-display text-fg-primary">Edit product</h1>
      <ProductForm mode="edit" defaultValues={defaultValues} categories={categories} />
    </div>
  );
}
