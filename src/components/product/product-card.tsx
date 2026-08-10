import { useTranslations } from "next-intl";
import Image from "next/image";

import { Link } from "@/i18n/navigation";
import { cx, formatPrice } from "@/lib/utils";
import type { Locale, ProductCardData } from "@/types";

interface ProductCardProps {
  product: ProductCardData;
  locale: Locale;
  priority?: boolean;
  /** Renders a small rank number in the image's corner — best sellers only. */
  rank?: number;
  className?: string;
}

export function ProductCard({
  product,
  locale,
  priority,
  rank,
  className,
}: ProductCardProps) {
  const t = useTranslations("product");
  const isDiscounted = product.discountPriceCents != null;
  const isOutOfStock = product.stockStatus === "out_of_stock";
  const isLowStock = product.stockStatus === "low_stock";

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cx(
        "group/card flex flex-col gap-3",
        isOutOfStock && "opacity-60",
        className,
      )}
    >
      <div className="bg-bg-elevated relative aspect-4/5 overflow-hidden rounded-md">
        {product.primaryImage ? (
          <Image
            src={product.primaryImage.storagePath}
            alt={product.primaryImage.alt ?? product.name}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : null}

        {isDiscounted && (
          <span className="bg-sale text-bg-base absolute top-2 left-2 rounded-sm px-2 py-1 font-mono text-xs tracking-[0.15em] uppercase">
            {t("discountBadge")}
          </span>
        )}

        {(isOutOfStock || isLowStock) && (
          <span
            className={cx(
              "absolute top-2 right-2 rounded-sm px-2 py-1 font-mono text-xs tracking-[0.15em] uppercase",
              isOutOfStock
                ? "bg-danger text-bg-base"
                : "bg-warning text-bg-base",
            )}
          >
            {isOutOfStock
              ? t("outOfStock")
              : t("lowStock", { count: product.stockQuantity })}
          </span>
        )}

        {rank ? (
          <span className="text-fg-secondary absolute bottom-2 left-2 font-mono text-xs tracking-[0.15em]">
            {String(rank).padStart(2, "0")}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        {product.categoryName ? (
          <span className="text-fg-muted font-mono text-xs tracking-[0.15em] uppercase">
            {product.categoryName}
          </span>
        ) : null}

        <h3 className="text-fg-primary font-body line-clamp-2 text-sm">
          {product.name}
        </h3>

        <div className="flex items-center gap-2">
          <span className="text-accent font-mono text-sm">
            {formatPrice(product.effectivePriceCents, locale)}
          </span>
          {isDiscounted && (
            <span className="text-fg-muted font-mono text-sm line-through">
              {formatPrice(product.priceCents, locale)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
