"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { HeroContent, type HeroHighlightArea } from "@/components/home/hero-content";
import type { HeroImage } from "@/lib/data/settings";
import { cn } from "@/lib/cn";

interface HeroPreviewPanelProps {
  tagline: string;
  heading: string;
  subheading: string;
  ctaText: string;
  secondaryCtaText: string;
  images: HeroImage[];
  highlightedArea: HeroHighlightArea;
}

// Scaled-down, non-interactive rendering of the real HeroContent component
// (not a mock-up built to look similar) — see hero-content.tsx's own
// comment for why that matters. The real section is `h-[90dvh]`, a
// viewport-relative height that's meaningless once shrunk into a form
// sidebar, so the one deliberate deviation here is rendering it at a fixed
// virtual size (1200×640, a reasonable stand-in desktop hero shape) instead
// — everything visually inside that frame is the genuine component.
const VIRTUAL_WIDTH = 1200;
const VIRTUAL_HEIGHT = 640;
const PREVIEW_SCALE = 0.4;
const SCALED_WIDTH = VIRTUAL_WIDTH * PREVIEW_SCALE;
const SCALED_HEIGHT = VIRTUAL_HEIGHT * PREVIEW_SCALE;

export function HeroPreviewPanel({
  tagline,
  heading,
  subheading,
  ctaText,
  secondaryCtaText,
  images,
  highlightedArea,
}: HeroPreviewPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="border-border bg-bg-elevated flex flex-col gap-2 rounded-md border p-3 lg:sticky lg:top-4">
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="text-fg-muted flex items-center justify-between gap-2 font-mono text-xs tracking-[0.1em] uppercase lg:pointer-events-none lg:cursor-default"
      >
        Preview
        <ChevronDown
          className={cn("size-4 transition-transform lg:hidden", !isCollapsed && "rotate-180")}
        />
      </button>

      <div className={cn(isCollapsed && "hidden lg:block")}>
        {/*
          A transform: scale()'d element keeps its PRE-transform box for
          layout-flow purposes — only its paint/visual box shrinks. The
          previous version relied on that not mattering (an explicit height
          on this wrapper, hoping overflow-hidden would clip the rest), and
          in practice it didn't: the unscaled ~1600px-tall content still
          pushed the page layout, leaving a multi-screen blank gap below.

          Fix: the scaled frame is `position: absolute; inset: 0`, which
          removes it from document flow entirely — it now cannot affect this
          wrapper's size no matter what transform is applied to it. This
          wrapper's own size is the only thing that determines the space it
          takes up, set explicitly and unrelated to the child's layout box.
        */}
        <div
          className="border-border relative mx-auto max-w-full overflow-hidden rounded-sm border"
          style={{ width: SCALED_WIDTH, height: SCALED_HEIGHT }}
        >
          <div
            className="absolute top-0 left-0"
            style={{
              width: VIRTUAL_WIDTH,
              height: VIRTUAL_HEIGHT,
              transform: `scale(${PREVIEW_SCALE})`,
              transformOrigin: "top left",
            }}
          >
            <HeroContent
              tagline={tagline}
              heading={heading}
              subheading={subheading}
              ctaText={ctaText}
              ctaHref="#"
              secondaryCtaText={secondaryCtaText}
              secondaryCtaHref="#"
              images={images}
              disableLinks
              highlightedArea={highlightedArea}
              heightClassName="h-full"
              style={{ width: VIRTUAL_WIDTH, height: VIRTUAL_HEIGHT }}
            />
          </div>
        </div>
        <p className="text-fg-muted font-body pt-2 text-xs">
          Focus a field to see exactly where it appears.
        </p>
      </div>
    </div>
  );
}
