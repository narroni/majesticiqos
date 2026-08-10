"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button-variants";
// cx, not cn — verified neither caller of QuantityStepper passes className.
import { cx } from "@/lib/utils";

interface QuantityStepperProps {
  quantity: number;
  max: number;
  min?: number;
  onChange: (quantity: number) => void;
  className?: string;
}

export function QuantityStepper({
  quantity,
  max,
  min = 1,
  onChange,
  className,
}: QuantityStepperProps) {
  const t = useTranslations("product");

  function clamp(next: number) {
    return Math.min(Math.max(next, min), max);
  }

  return (
    <div
      className={cx(
        "border-border-strong flex h-9 items-center rounded-sm border",
        className,
      )}
    >
      {/* Plain <button>s styled with buttonVariants — see product-purchase.tsx
          for why these don't need Base UI's <Button> (used above the fold
          on every product page). */}
      <button
        type="button"
        data-slot="button"
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        onClick={() => onChange(clamp(quantity - 1))}
        disabled={quantity <= min}
        aria-label={t("decreaseQuantity")}
      >
        <Minus />
      </button>
      <span className="w-10 text-center font-mono text-sm" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        data-slot="button"
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        onClick={() => onChange(clamp(quantity + 1))}
        disabled={quantity >= max}
        aria-label={t("increaseQuantity")}
      >
        <Plus />
      </button>
    </div>
  );
}
