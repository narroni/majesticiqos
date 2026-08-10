"use client";

import { m, useReducedMotion } from "framer-motion";
import { useSyncExternalStore, type ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;
const DURATION_SECONDS = 0.6;

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
  className?: string;
}

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const hasMounted = useHasMounted();

  if (hasMounted && shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
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
