import { ImageOff } from "lucide-react";
import Image from "next/image";

import { cx } from "@/lib/utils";

interface OrderItemThumbnailProps {
  /** The order_item's snapshotted image_url — never a live product lookup, so the order still shows what was actually bought even if the product changed or was deleted since. */
  imageUrl: string | null;
  alt: string;
  /**
   * Literal Tailwind size classes (e.g. "size-16 sm:size-40"), written
   * directly at each call site rather than built from a variable — Tailwind
   * only picks up class names its scanner can find as literal text, so an
   * interpolated pixel value here would silently fail to generate CSS.
   */
  sizeClassName: string;
  /** next/image `sizes`, matching sizeClassName's breakpoints. */
  imageSizes: string;
  className?: string;
}

// Shared by the admin order list (expand-in-place), the admin order detail
// page, and the customer order confirmation page — one neutral placeholder
// treatment for a missing snapshot, rather than three slightly different
// empty boxes (or a broken <img>).
export function OrderItemThumbnail({
  imageUrl,
  alt,
  sizeClassName,
  imageSizes,
  className,
}: OrderItemThumbnailProps) {
  return (
    <div
      className={cx(
        "bg-bg-subtle relative shrink-0 overflow-hidden rounded-sm",
        sizeClassName,
        className,
      )}
    >
      {imageUrl ? (
        <Image src={imageUrl} alt={alt} fill sizes={imageSizes} className="object-cover" />
      ) : (
        <div className="text-fg-muted flex h-full w-full items-center justify-center">
          <ImageOff className="size-1/3" strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
