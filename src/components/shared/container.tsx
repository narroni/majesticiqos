import type { ComponentPropsWithoutRef } from "react";

import { cx } from "@/lib/utils";

// cx (clsx only), not cn — verified every current caller only adds
// non-conflicting layout/spacing classes (gap, py-*, text-align, grid/flex),
// never a max-w-*/px-*/w-* that would need tailwind-merge to resolve
// against this component's own base classes (BLUEPRINT §9.4 bundle audit).
export function Container({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cx(
        "mx-auto w-full max-w-[1440px] px-4 md:px-6 lg:px-10",
        className,
      )}
      {...props}
    />
  );
}
