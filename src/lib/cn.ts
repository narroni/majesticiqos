import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Deliberately its own module, separate from src/lib/utils.ts's `cx` and
 * other isomorphic helpers: bundlers here tree-shake at file granularity,
 * not per-named-export, so keeping `cn` alongside `cx` in the same file
 * meant every importer of `cx` (or `formatPrice`, etc.) dragged in
 * tailwind-merge too, even when they never called `cn` (BLUEPRINT §9.4
 * bundle audit — verified this empirically before splitting the file).
 *
 * Use for anything that merges a caller-supplied `className` prop against a
 * component's own base classes — every shadcn/ui-style primitive's whole
 * contract is "the caller can safely override any utility," and only
 * tailwind-merge resolves same-property conflicts correctly (plain string
 * concatenation leaves both classes in the DOM and lets Tailwind's
 * generated CSS source order — not className order — decide the winner).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
