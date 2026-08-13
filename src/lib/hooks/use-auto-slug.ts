import { useRef } from "react";

import { slugify } from "@/lib/utils";

interface UseAutoSlugOptions {
  mode: "create" | "edit";
  /** Called with the derived slug whenever the name changes and the slug
   * hasn't been hand-edited yet — wire the result into `form.setValue`. */
  onSlugChange: (slug: string) => void;
}

/**
 * Drives a slug field from a name field as the admin types, until they edit
 * the slug by hand — after that this stops overwriting it. Never active in
 * edit mode, only create (an existing product/category's slug is never
 * auto-updated from a later name change).
 *
 * Call `handleNameChange` from the name field's own onChange (not a
 * `useWatch` + effect pair) and `markSlugTouched` from the slug field's.
 */
export function useAutoSlug({ mode, onSlugChange }: UseAutoSlugOptions) {
  const slugTouchedRef = useRef(mode === "edit");

  function handleNameChange(name: string) {
    if (mode !== "create" || slugTouchedRef.current) return;
    onSlugChange(slugify(name));
  }

  function markSlugTouched() {
    slugTouchedRef.current = true;
  }

  return { handleNameChange, markSlugTouched };
}
