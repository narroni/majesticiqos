import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/reveal";
import { cx } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  action?: ReactNode;
  className?: string;
}

// Wrapped in its own Reveal (rather than being a Stagger item alongside the
// section's content) so it crosses the viewport threshold on its own — being
// physically above the content, that means it settles in slightly ahead of
// it, not simultaneously.
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  className,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={cx(
        "flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div
        className={cx(
          "flex max-w-2xl flex-col gap-3",
          align === "center"
            ? "items-center text-center"
            : "items-start text-left",
        )}
      >
        {eyebrow ? (
          <span className="text-accent font-mono text-xs tracking-[0.15em] uppercase">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="text-h2 font-display">{title}</h2>
        {description ? (
          <p className="text-body-lg font-body text-fg-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </Reveal>
  );
}
