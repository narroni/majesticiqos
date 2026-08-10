"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cx } from "@/lib/utils";
import type { ProductImage } from "@/types";

interface ProductGalleryLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: ProductImage[];
  activeIndex: number;
  onSelect: (index: number) => void;
  productName: string;
}

// Split out from product-gallery.tsx and loaded via next/dynamic so Base
// UI's Dialog only ever loads once a visitor actually clicks to zoom — see
// ProductGallery's lazy-mount-on-first-open pattern.
export function ProductGalleryLightbox({
  open,
  onOpenChange,
  images,
  activeIndex,
  onSelect,
  productName,
}: ProductGalleryLightboxProps) {
  const t = useTranslations("product.gallery");
  const activeImage = images[activeIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-bg-elevated max-w-[min(90vw,900px)] border-none p-2 ring-0 sm:max-w-[min(90vw,900px)]"
        showCloseButton
      >
        <DialogTitle className="sr-only">{productName}</DialogTitle>
        <div className="relative aspect-4/5 w-full overflow-hidden rounded-sm sm:aspect-square">
          <Image
            src={activeImage.storagePath}
            alt={activeImage.alt ?? productName}
            fill
            sizes="90vw"
            className="object-contain"
          />
        </div>

        {images.length > 1 && (
          <div className="flex items-center justify-center gap-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => onSelect(index)}
                aria-label={t("thumbnailAlt", { index: index + 1, total: images.length })}
                className={cx(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  index === activeIndex ? "bg-accent" : "bg-border-strong",
                )}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
