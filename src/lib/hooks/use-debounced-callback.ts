import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a stable function that, each time it's called, cancels any
 * previously scheduled call and schedules `callback` to run `delayMs` after
 * this call — the standard debounce shape used for search-as-you-type,
 * slug-availability checks, etc. Pending timers are cleared on unmount.
 *
 * `callback` is read from a ref rather than being a dependency, so callers
 * don't need to worry about it being stable across renders (e.g. a closure
 * over the latest state) — only `delayMs` changing recreates the debounced
 * function.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  const callbackRef = useRef(callback);

  // Refs can't be written during render (React's react-hooks/refs rule) —
  // this keeps the ref in sync post-commit instead, which is still well
  // before the debounced timer could ever fire.
  useEffect(() => {
    callbackRef.current = callback;
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs],
  );
}
