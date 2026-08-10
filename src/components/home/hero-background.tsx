"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { cx } from "@/lib/utils";

const CROSSFADE_INTERVAL_MS = 6000;

interface HeroBackgroundProps {
  images: { storagePath: string }[];
}

// Plain CSS opacity cross-fade, not framer-motion — this is the storefront's
// eager bundle (BLUEPRINT §9.4 budget), and a handful of stacked <Image>s
// toggling opacity needs nothing heavier than a timer + Tailwind transition.
export function HeroBackground({ images }: HeroBackgroundProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) {
      return;
    }
    const id = setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, CROSSFADE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [images.length]);

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0">
      {images.map((image, index) => (
        <Image
          key={image.storagePath}
          src={image.storagePath}
          alt=""
          fill
          priority={index === 0}
          sizes="100vw"
          className={cx(
            "object-cover transition-opacity duration-[1500ms] ease-out",
            index === activeIndex ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
    </div>
  );
}
