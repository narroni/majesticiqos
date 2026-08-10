import type { ComponentPropsWithoutRef } from "react";

import { cx } from "@/lib/utils";

interface SectionProps extends ComponentPropsWithoutRef<"section"> {
  background?: "base" | "elevated";
}

// cx, not cn — see container.tsx; no caller passes a conflicting py-*/bg-*.
export function Section({
  background = "base",
  className,
  ...props
}: SectionProps) {
  return (
    <section
      className={cx(
        "py-16 md:py-24 lg:py-32",
        background === "elevated" ? "bg-bg-elevated" : "bg-bg-base",
        className,
      )}
      {...props}
    />
  );
}
