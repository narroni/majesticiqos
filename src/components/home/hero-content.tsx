"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { HeroBackground } from "@/components/home/hero-background";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/shared/container";
import { buttonVariants } from "@/components/ui/button-variants";
import { cx } from "@/lib/utils";

export type HeroHighlightArea = "tagline" | "heading" | "subheading" | "cta" | null;

export interface HeroContentProps {
  tagline: string;
  heading: string;
  subheading: string;
  ctaText: string;
  /** Already locale-resolved (e.g. via next-intl's getPathname) — this component has no i18n awareness of its own, so it stays reusable in the admin preview. */
  ctaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
  images: { storagePath: string }[];
  /** Admin live preview only — real CTAs must never navigate away from a form the seller is mid-edit on. */
  disableLinks?: boolean;
  /** Admin live preview only — outlines the area matching the currently focused field. */
  highlightedArea?: HeroHighlightArea;
  /** Admin live preview only — replaces the real `h-[90dvh]` (meaningless once scaled into a form sidebar). */
  heightClassName?: string;
  /** Admin live preview only — sizes the section to the preview's virtual frame before it gets scaled down. */
  style?: CSSProperties;
}

const HIGHLIGHT_CLASS = "outline-accent rounded-xs outline-2 outline-offset-4";

function HighlightWrap({
  active,
  children,
  className,
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx(active && HIGHLIGHT_CLASS, className)}>{children}</div>;
}

// The single source of truth for what the hero looks like — rendered by
// both the real homepage (src/components/home/hero.tsx, which resolves all
// the fallback/translation logic and passes down plain strings) and the
// admin live preview (src/components/admin/settings/hero-preview.tsx, which
// passes live form state instead). Neither the storefront nor the preview
// forks this markup, so they cannot visually drift from each other.
export function HeroContent({
  tagline,
  heading,
  subheading,
  ctaText,
  ctaHref,
  secondaryCtaText,
  secondaryCtaHref,
  images,
  disableLinks = false,
  highlightedArea = null,
  heightClassName,
  style,
}: HeroContentProps) {
  return (
    <section
      style={style}
      className={cx(
        "bg-bg-elevated relative flex flex-col justify-end overflow-hidden",
        // The real hero pulls up under a transparent header via -mt-16 —
        // meaningless (and visually clips content) in the preview, which
        // has no header above it.
        heightClassName ? "mt-0" : "-mt-16",
        heightClassName ?? "h-[90dvh]",
      )}
    >
      <HeroBackground images={images} />
      <div className="from-bg-base absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />

      <Container className="relative flex flex-col gap-6 pb-24">
        {tagline ? (
          <Reveal>
            <HighlightWrap active={highlightedArea === "tagline"} className="inline-block">
              <p className="text-accent font-mono text-xs tracking-[0.15em] uppercase">{tagline}</p>
            </HighlightWrap>
          </Reveal>
        ) : null}
        <Reveal>
          <HighlightWrap active={highlightedArea === "heading"} className="inline-block">
            <h1 className="text-display-xl font-display text-fg-primary max-w-2xl">{heading}</h1>
          </HighlightWrap>
        </Reveal>
        <Reveal delay={100}>
          <HighlightWrap active={highlightedArea === "subheading"} className="inline-block">
            <p className="text-body-lg font-body text-fg-secondary max-w-xl">{subheading}</p>
          </HighlightWrap>
        </Reveal>
        <Reveal delay={200}>
          <HighlightWrap active={highlightedArea === "cta"} className="inline-flex flex-wrap gap-3">
            {/* Plain <Link>/<span> styled with buttonVariants, not Base UI's
                <Button> — these are real anchors with nothing for a
                synthetic-button primitive to add (BLUEPRINT §9.4 bundle
                audit). */}
            {disableLinks ? (
              <span data-slot="button" className={buttonVariants({ size: "lg" })}>
                {ctaText}
              </span>
            ) : (
              <Link href={ctaHref} data-slot="button" className={buttonVariants({ size: "lg" })}>
                {ctaText}
              </Link>
            )}
            {disableLinks ? (
              <span data-slot="button" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                {secondaryCtaText}
              </span>
            ) : (
              <Link
                href={secondaryCtaHref}
                data-slot="button"
                className={buttonVariants({ variant: "ghost", size: "lg" })}
              >
                {secondaryCtaText}
              </Link>
            )}
          </HighlightWrap>
        </Reveal>
      </Container>
    </section>
  );
}
