import type { Enums, Tables } from "@/types/database";

export type Locale = Enums<"locale">;
export type CountryCode = Enums<"country_code">;
export type OrderStatus = Enums<"order_status">;
export type AdminRole = Enums<"admin_role">;

// Derived, not stored — see BLUEPRINT §2.2.
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type SortOption = "newest" | "price_asc" | "price_desc" | "best_selling";

export interface ProductImage {
  id: string;
  storagePath: string;
  alt: string | null;
  sortOrder: number;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
}

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  priceCents: number;
  discountPriceCents: number | null;
  effectivePriceCents: number;
  stockStatus: StockStatus;
  stockQuantity: number;
  isFeatured: boolean;
  categoryId: string | null;
  categoryName: string | null;
  primaryImage: ProductImage | null;
}

export interface ProductDetail extends ProductCardData {
  sku: string | null;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  trackInventory: boolean;
  images: ProductImage[];
  category: CategorySummary | null;
}

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

export interface CategoryWithCount extends CategorySummary {
  productCount: number;
}

export interface ShippingRate {
  country: CountryCode;
  rateCents: number;
  freeShippingThresholdCents: number | null;
}

// Checkout-only recomputation snapshot — both locale names are needed
// because order_items immutably stores product_name_sq AND product_name_en
// at purchase time (BLUEPRINT §2.3), regardless of which locale the
// customer checked out in.
export interface CheckoutProductSnapshot {
  id: string;
  slug: string;
  nameSq: string;
  nameEn: string;
  priceCents: number;
  discountPriceCents: number | null;
  effectivePriceCents: number;
  stockQuantity: number;
  trackInventory: boolean;
  imageUrl: string | null;
}

export interface OrderItemSummary {
  productId: string | null;
  productSlug: string;
  nameSq: string;
  nameEn: string;
  imageUrl: string | null;
  unitPriceCents: number;
  originalPriceCents: number | null;
  quantity: number;
  lineTotalCents: number;
}

export interface OrderSummary {
  orderNumber: string;
  publicToken: string;
  status: OrderStatus;
  locale: Locale;
  firstName: string;
  lastName: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  createdAt: string;
  items: OrderItemSummary[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface GetProductsParams {
  locale: Locale;
  categorySlug?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: SortOption;
  page?: number;
  perPage?: number;
}

export type { Tables, Enums };
