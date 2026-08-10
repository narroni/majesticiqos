import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import { normalizeForSearch } from "@/lib/utils";
import type {
  CheckoutProductSnapshot,
  GetProductsParams,
  Locale,
  PaginatedResult,
  ProductCardData,
  ProductDetail,
  ProductImage,
  StockStatus,
} from "@/types";
import type { Tables } from "@/types/database";

const DEFAULT_PER_PAGE = 24;

type SupabaseClient = ReturnType<typeof createPublicClient>;

const PRODUCT_CARD_COLUMNS = `
  id,
  slug,
  price_cents,
  discount_price_cents,
  effective_price_cents,
  stock_quantity,
  low_stock_threshold,
  track_inventory,
  is_featured,
  category_id,
  created_at,
  sales_count,
  product_translations!inner(name, short_description),
  product_images(id, product_id, storage_path, alt_sq, alt_en, sort_order, width, height, blur_data_url, created_at, updated_at),
  categories(category_translations(name, locale))
`;

const PRODUCT_DETAIL_COLUMNS = `
  id,
  slug,
  sku,
  price_cents,
  discount_price_cents,
  effective_price_cents,
  stock_quantity,
  low_stock_threshold,
  track_inventory,
  is_featured,
  category_id,
  created_at,
  sales_count,
  product_translations!inner(name, short_description, description, meta_title, meta_description),
  product_images(id, product_id, storage_path, alt_sq, alt_en, sort_order, width, height, blur_data_url, created_at, updated_at),
  categories(
    id,
    slug,
    image_url,
    category_translations(name, description, locale)
  )
`;

interface ProductCardRow {
  id: string;
  slug: string;
  price_cents: number;
  discount_price_cents: number | null;
  effective_price_cents: number;
  stock_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  is_featured: boolean;
  category_id: string | null;
  created_at: string;
  sales_count: number;
  product_translations: { name: string; short_description: string | null }[];
  product_images: Tables<"product_images">[];
  categories: {
    category_translations: { name: string; locale: Locale }[];
  } | null;
}

interface ProductDetailRow extends Omit<
  ProductCardRow,
  "product_translations" | "categories"
> {
  sku: string | null;
  product_translations: {
    name: string;
    short_description: string | null;
    description: string | null;
    meta_title: string | null;
    meta_description: string | null;
  }[];
  categories: {
    id: string;
    slug: string;
    image_url: string | null;
    category_translations: {
      name: string;
      description: string | null;
      locale: Locale;
    }[];
  } | null;
}

/**
 * Every product read goes through this helper so `is_active` / `deleted_at`
 * can never be forgotten by a future function.
 */
export function activeProductsQuery(supabase: SupabaseClient, columns: string) {
  return supabase
    .from("products")
    .select(columns, { count: "exact" })
    .eq("is_active", true)
    .is("deleted_at", null);
}

export function getStockStatus(product: {
  track_inventory: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
}): StockStatus {
  if (!product.track_inventory) {
    return "in_stock";
  }
  if (product.stock_quantity <= 0) {
    return "out_of_stock";
  }
  if (product.stock_quantity <= product.low_stock_threshold) {
    return "low_stock";
  }
  return "in_stock";
}

function toProductImage(
  row: Tables<"product_images">,
  locale: Locale,
): ProductImage {
  return {
    id: row.id,
    storagePath: row.storage_path,
    alt: (locale === "sq" ? row.alt_sq : row.alt_en) ?? null,
    sortOrder: row.sort_order,
    width: row.width,
    height: row.height,
    blurDataUrl: row.blur_data_url,
  };
}

function sortedImages(images: Tables<"product_images">[]) {
  return [...images].sort((a, b) => a.sort_order - b.sort_order);
}

function toProductCard(row: ProductCardRow, locale: Locale): ProductCardData {
  const translation = row.product_translations[0];
  const images = sortedImages(row.product_images).map((image) =>
    toProductImage(image, locale),
  );
  const categoryName =
    row.categories?.category_translations.find((t) => t.locale === locale)
      ?.name ?? null;

  return {
    id: row.id,
    slug: row.slug,
    name: translation?.name ?? "",
    shortDescription: translation?.short_description ?? null,
    priceCents: row.price_cents,
    discountPriceCents: row.discount_price_cents,
    effectivePriceCents: row.effective_price_cents,
    stockStatus: getStockStatus(row),
    stockQuantity: row.stock_quantity,
    isFeatured: row.is_featured,
    categoryId: row.category_id,
    categoryName,
    primaryImage: images[0] ?? null,
  };
}

async function getCategoryIdBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

// BLUEPRINT §1.2 — Products list: revalidate 60, tag `products`.
export async function getProducts({
  locale,
  categorySlug,
  search,
  minPrice,
  maxPrice,
  inStockOnly,
  sort = "newest",
  page = 1,
  perPage = DEFAULT_PER_PAGE,
}: GetProductsParams): Promise<PaginatedResult<ProductCardData>> {
  const supabase = createPublicClient({ revalidate: 60, tags: ["products"] });

  let query = activeProductsQuery(supabase, PRODUCT_CARD_COLUMNS).eq(
    "product_translations.locale",
    locale,
  );

  if (categorySlug) {
    const categoryId = await getCategoryIdBySlug(supabase, categorySlug);
    if (!categoryId) {
      return { items: [], total: 0, page, perPage };
    }
    query = query.eq("category_id", categoryId);
  }

  if (search) {
    const normalized = normalizeForSearch(search);
    query = query.ilike(
      "product_translations.name_unaccented",
      `%${normalized}%`,
    );
  }

  if (minPrice != null) {
    query = query.gte("effective_price_cents", minPrice);
  }

  if (maxPrice != null) {
    query = query.lte("effective_price_cents", maxPrice);
  }

  if (inStockOnly) {
    query = query.or("track_inventory.eq.false,stock_quantity.gt.0");
  }

  switch (sort) {
    case "price_asc":
      query = query.order("effective_price_cents", { ascending: true });
      break;
    case "price_desc":
      query = query.order("effective_price_cents", { ascending: false });
      break;
    case "best_selling":
      query = query.order("sales_count", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  query = query
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as ProductCardRow[];

  return {
    items: rows.map((row) => toProductCard(row, locale)),
    total: count ?? 0,
    page,
    perPage,
  };
}

// BLUEPRINT §1.2 — Product detail: revalidate 300, tag `product:{id}`.
// Tagged by slug rather than id: the id isn't known until after this query
// resolves, and slugs are stable (products don't have a rename flow), so
// they're an equally valid cache key. An admin mutation layer should
// revalidate both `product:{slug}` and `products` on save.
export async function getProductBySlug(
  slug: string,
  locale: Locale,
): Promise<ProductDetail | null> {
  const supabase = createPublicClient({
    revalidate: 300,
    tags: [`product:${slug}`, "products"],
  });

  const { data, error } = await activeProductsQuery(
    supabase,
    PRODUCT_DETAIL_COLUMNS,
  )
    .eq("slug", slug)
    .eq("product_translations.locale", locale)
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as unknown as ProductDetailRow;
  const translation = row.product_translations[0];
  const images = sortedImages(row.product_images).map((image) =>
    toProductImage(image, locale),
  );
  const categoryTranslation = row.categories?.category_translations.find(
    (t) => t.locale === locale,
  );

  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: translation?.name ?? "",
    shortDescription: translation?.short_description ?? null,
    description: translation?.description ?? null,
    metaTitle: translation?.meta_title ?? null,
    metaDescription: translation?.meta_description ?? null,
    priceCents: row.price_cents,
    discountPriceCents: row.discount_price_cents,
    effectivePriceCents: row.effective_price_cents,
    stockStatus: getStockStatus(row),
    stockQuantity: row.stock_quantity,
    trackInventory: row.track_inventory,
    isFeatured: row.is_featured,
    categoryId: row.category_id,
    categoryName: categoryTranslation?.name ?? null,
    primaryImage: images[0] ?? null,
    images,
    category:
      row.categories && categoryTranslation
        ? {
            id: row.categories.id,
            slug: row.categories.slug,
            name: categoryTranslation.name,
            description: categoryTranslation.description ?? null,
            imageUrl: row.categories.image_url,
          }
        : null,
  };
}

// BLUEPRINT §1.2 — Home: revalidate 300, tag `home`. Also tagged `products`
// so a product edit can invalidate this list without knowing it's on home.
export async function getFeaturedProducts(
  locale: Locale,
  limit: number,
): Promise<ProductCardData[]> {
  const supabase = createPublicClient({
    revalidate: 300,
    tags: ["home", "products"],
  });

  const { data, error } = await activeProductsQuery(
    supabase,
    PRODUCT_CARD_COLUMNS,
  )
    .eq("product_translations.locale", locale)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as ProductCardRow[]).map((row) =>
    toProductCard(row, locale),
  );
}

// Home page section (§10.5.7) — same cache treatment as featured products.
export async function getBestSellers(
  locale: Locale,
  limit: number,
): Promise<ProductCardData[]> {
  const supabase = createPublicClient({
    revalidate: 300,
    tags: ["home", "products"],
  });

  const { data, error } = await activeProductsQuery(
    supabase,
    PRODUCT_CARD_COLUMNS,
  )
    .eq("product_translations.locale", locale)
    .order("sales_count", { ascending: false })
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as ProductCardRow[]).map((row) =>
    toProductCard(row, locale),
  );
}

// Rendered as part of the product detail page — same cache lifetime as that
// page's own data.
export async function getRelatedProducts(
  productId: string,
  categoryId: string | null,
  locale: Locale,
  limit: number,
): Promise<ProductCardData[]> {
  if (!categoryId) {
    return [];
  }

  const supabase = createPublicClient({
    revalidate: 300,
    tags: ["products"],
  });

  const { data, error } = await activeProductsQuery(
    supabase,
    PRODUCT_CARD_COLUMNS,
  )
    .eq("product_translations.locale", locale)
    .eq("category_id", categoryId)
    .neq("id", productId)
    .order("sales_count", { ascending: false })
    .order("sort_order", { referencedTable: "product_images", ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as ProductCardRow[]).map((row) =>
    toProductCard(row, locale),
  );
}

// Cart reconciliation (§1.4/§5.2) — must reflect true live state, so this
// intentionally uses no cache directive (`revalidate: 0` is Next's
// equivalent of `cache: "no-store"`). A product id missing from the result
// means it's inactive or deleted; the caller treats that as "no longer
// available" rather than an error.
export async function getProductsByIds(
  ids: string[],
  locale: Locale,
): Promise<ProductCardData[]> {
  if (ids.length === 0) {
    return [];
  }

  const supabase = createPublicClient({ revalidate: 0 });

  const { data, error } = await activeProductsQuery(
    supabase,
    PRODUCT_CARD_COLUMNS,
  )
    .eq("product_translations.locale", locale)
    .in("id", ids)
    .order("sort_order", { referencedTable: "product_images", ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as ProductCardRow[]).map((row) =>
    toProductCard(row, locale),
  );
}

const CHECKOUT_COLUMNS = `
  id,
  slug,
  price_cents,
  discount_price_cents,
  effective_price_cents,
  stock_quantity,
  track_inventory,
  product_translations(name, locale),
  product_images(storage_path, sort_order)
`;

interface CheckoutProductRow {
  id: string;
  slug: string;
  price_cents: number;
  discount_price_cents: number | null;
  effective_price_cents: number;
  stock_quantity: number;
  track_inventory: boolean;
  product_translations: { name: string; locale: Locale }[];
  product_images: { storage_path: string; sort_order: number }[];
}

// Checkout price/stock recomputation (CLAUDE.md rule 5, BLUEPRINT §8.2) —
// no cache directive, must always read the true current state. Fetches
// both locale names since order_items snapshots both regardless of the
// customer's checkout locale. A requested id missing from the result is
// inactive/deleted; the caller treats that as "no longer available".
export async function getProductsForCheckout(
  ids: string[],
): Promise<CheckoutProductSnapshot[]> {
  if (ids.length === 0) {
    return [];
  }

  const supabase = createPublicClient({ revalidate: 0 });

  const { data, error } = await activeProductsQuery(supabase, CHECKOUT_COLUMNS)
    .in("id", ids);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as CheckoutProductRow[]).map((row) => {
    const images = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: row.id,
      slug: row.slug,
      nameSq: row.product_translations.find((t) => t.locale === "sq")?.name ?? "",
      nameEn: row.product_translations.find((t) => t.locale === "en")?.name ?? "",
      priceCents: row.price_cents,
      discountPriceCents: row.discount_price_cents,
      effectivePriceCents: row.effective_price_cents,
      stockQuantity: row.stock_quantity,
      trackInventory: row.track_inventory,
      imageUrl: images[0]?.storage_path ?? null,
    };
  });
}

// Build-time slug enumeration for generateStaticParams — not part of the
// live cache-tag graph, so no revalidate/tags here.
export async function getAllProductSlugs(): Promise<string[]> {
  const supabase = createPublicClient();

  const { data, error } = await activeProductsQuery(supabase, "slug");

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as { slug: string }[]).map((row) => row.slug);
}

export interface SitemapProduct {
  slug: string;
  updatedAt: string;
}

// app/sitemap.ts — same no-cache-directive reasoning as getAllProductSlugs.
export async function getSitemapProducts(): Promise<SitemapProduct[]> {
  const supabase = createPublicClient();

  const { data, error } = await activeProductsQuery(supabase, "slug, updated_at");

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as { slug: string; updated_at: string }[]).map((row) => ({
    slug: row.slug,
    updatedAt: row.updated_at,
  }));
}
