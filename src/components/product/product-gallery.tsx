"use client";

import { Expand } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState } from "react";

import { cx } from "@/lib/utils";
import type { ProductImage } from "@/types";

// Base UI's Dialog only loads once someone actually clicks to zoom, not on
// every product-page visit — see the lazy-mount-on-first-open guard below.
const ProductGalleryLightbox = dynamic(
  () =>
    import("@/components/product/product-gallery-lightbox").then(
      (mod) => mod.ProductGalleryLightbox,
    ),
  { ssr: false },
);

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const t = useTranslations("product.gallery");
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Adjusting state during render (guarded so it only ever fires once) —
  // see CartDrawerLoader for why this isn't the banned setState-in-effect
  // pattern. Keeps the lightbox mounted once opened so toggling it closed
  // doesn't re-trigger the dynamic import.
  const [hasOpenedLightbox, setHasOpenedLightbox] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (lightboxOpen && !hasOpenedLightbox) {
    setHasOpenedLightbox(true);
  }

  if (images.length === 0) {
    return (
      <div className="bg-bg-elevated aspect-4/5 w-full rounded-md" />
    );
  }

  const activeImage = images[activeIndex];

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function scrollToIndex(index: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    setActiveIndex(index);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile: full-bleed swipe carousel with dot indicators. */}
      <div className="lg:hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="[&::-webkit-scrollbar]:hidden flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        >
          {images.map((image, index) => (
            <div
              key={image.id}
              className="relative aspect-4/5 w-full shrink-0 snap-center"
            >
              <Image
                src={image.storagePath}
                alt={image.alt ?? productName}
                fill
                priority={index === 0}
                loading={index === 0 ? undefined : "lazy"}
                sizes="100vw"
                placeholder={image.blurDataUrl ? "blur" : undefined}
                blurDataURL={image.blurDataUrl ?? undefined}
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => scrollToIndex(index)}
                aria-label={t("thumbnailAlt", {
                  index: index + 1,
                  total: images.length,
                })}
                className={cx(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  index === activeIndex ? "bg-accent" : "bg-border-strong",
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: vertical thumbnail rail + main image, click opens lightbox. */}
      <div className="hidden lg:flex lg:gap-4">
        {images.length > 1 && (
          <div className="flex w-20 shrink-0 flex-col gap-3">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={t("thumbnailAlt", {
                  index: index + 1,
                  total: images.length,
                })}
                className={cx(
                  "relative aspect-4/5 overflow-hidden rounded-sm border transition-colors",
                  index === activeIndex
                    ? "border-accent"
                    : "border-border hover:border-border-strong",
                )}
              >
                <Image
                  src={image.storagePath}
                  alt={image.alt ?? productName}
                  fill
                  loading="lazy"
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group/gallery bg-bg-elevated relative aspect-4/5 flex-1 overflow-hidden rounded-md"
        >
          <Image
            src={activeImage.storagePath}
            alt={activeImage.alt ?? productName}
            fill
            priority={activeIndex === 0}
            loading={activeIndex === 0 ? undefined : "lazy"}
            sizes="(min-width: 1024px) 45vw, 100vw"
            placeholder={activeImage.blurDataUrl ? "blur" : undefined}
            blurDataURL={activeImage.blurDataUrl ?? undefined}
            className="object-cover"
          />
          <span className="bg-bg-base/70 text-fg-primary absolute right-3 bottom-3 flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-xs opacity-0 transition-opacity group-hover/gallery:opacity-100">
            <Expand className="size-3.5" />
            {t("openLightbox")}
          </span>
        </button>

        {hasOpenedLightbox ? (
          <ProductGalleryLightbox
            open={lightboxOpen}
            onOpenChange={setLightboxOpen}
            images={images}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
            productName={productName}
          />
        ) : null}
      </div>
    </div>
  );
}
