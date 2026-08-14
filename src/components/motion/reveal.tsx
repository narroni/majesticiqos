"use client";

import { m, useReducedMotion } from "framer-motion";
import { useSyncExternalStore, type ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;
const DURATION_SECONDS = 0.5;
const TRAVEL_PX = 20;

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/**
 * The server can't know prefers-reduced-motion. Reporting "not mounted yet"
 * during SSR and the first client render guarantees they match exactly —
 * only after that does this flip, letting Reveal switch branches instead of
 * causing a hydration mismatch.
 */
function useHasMounted() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

interface RevealProps {
  children: ReactNode;
  /** Delay in milliseconds before the reveal starts. */
  delay?: number;
  /** Skip the fade/translate entirely — for content above the fold, which must render with zero delay. */
  immediate?: boolean;
  /**
   * "viewport" (default) fires once the element scrolls into view.
   * "mount" fires once, immediately after the first paint — for a
   * deliberate on-load entrance (e.g. the hero) rather than a scroll cue.
   */
  trigger?: "viewport" | "mount";
  className?: string;
}

export function Reveal({
  children,
  delay = 0,
  immediate = false,
  trigger = "viewport",
  className,
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const hasMounted = useHasMounted();

  if (immediate || (hasMounted && shouldReduceMotion)) {
    return <div className={className}>{children}</div>;
  }

  const revealProps =
    trigger === "mount"
      ? { animate: { opacity: 1, y: 0 } }
      : { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 } };

  return (
    <m.div
      initial={{ opacity: 0, y: TRAVEL_PX }}
      {...revealProps}
      transition={{
        duration: DURATION_SECONDS,
        ease: EASE,
        delay: delay / 1000,
      }}
      className={className}
    >
      {children}
    </m.div>
  );
}
