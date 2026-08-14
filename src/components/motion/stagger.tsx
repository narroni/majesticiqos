"use client";

import { Children, isValidElement, type ReactNode } from "react";

import { Reveal } from "@/components/motion/reveal";

const STEP_MS = 60;
/** Caps the delay of the last item so a large grid doesn't take seconds to fill. */
const MAX_STAGGER_MS = 480;

interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Leading items that render immediately with no animation — use for the first row of a grid that sits above the fold. */
  immediateCount?: number;
}

export function Stagger({ children, className, immediateCount = 0 }: StaggerProps) {
  const items = Children.toArray(children);

  return (
    <div className={className}>
      {items.map((child, index) => {
        const key = isValidElement(child) && child.key !== null ? child.key : index;

        if (index < immediateCount) {
          return (
            <Reveal key={key} immediate>
              {child}
            </Reveal>
          );
        }

        const staggerIndex = index - immediateCount;
        return (
          <Reveal key={key} delay={Math.min(staggerIndex * STEP_MS, MAX_STAGGER_MS)}>
            {child}
          </Reveal>
        );
      })}
    </div>
  );
}
