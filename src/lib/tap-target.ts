// Shared with button-variants.ts's own inline copy of this same technique —
// duplicated as a constant (not imported from there) because these are bare
// <button>/<Link> elements that intentionally don't use buttonVariants at
// all (see header.tsx, search-overlay.tsx): icon-only chrome with no
// visible background/border, so growing the box on touch would just be
// invisible whitespace anyway. This expands the *tappable* area to 44x44px
// on touch devices only (`pointer: coarse`), via a centered, invisible
// ::before pseudo-element — the icon itself never changes size or moves.
// Desktop (`pointer: fine`) is completely unaffected.
//
// `relative` is plain/unscoped, not `pointer-coarse:relative` — see
// button-variants.ts's comment on the same choice: it's a no-op without
// offsets, so it's safe everywhere, and it lets tailwind-merge cleanly
// yield to an `absolute`/`fixed` a caller might already set (a scoped
// `pointer-coarse:relative` can't lose that cascade fight and would
// silently break that caller's positioning on touch).
export const EXPANDED_TAP_TARGET =
  "relative pointer-coarse:before:absolute pointer-coarse:before:inset-1/2 pointer-coarse:before:size-11 pointer-coarse:before:-translate-x-1/2 pointer-coarse:before:-translate-y-1/2 pointer-coarse:before:content-['']";
