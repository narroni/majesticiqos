import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { Stagger } from "@/components/motion/stagger";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { siteConfig } from "@/config/site";
import { getStoreSettings } from "@/lib/data/settings";
import type { Locale } from "@/types";

export async function SocialWall({ locale }: { locale: Locale }) {
  const [t, settings] = await Promise.all([
    getTranslations("home.socialWall"),
    getStoreSettings(),
  ]);

  // No images set (admin hasn't uploaded any yet, or removed them all) —
  // hide the section entirely rather than showing placeholders
  // (/admin/settings "Social wall").
  if (settings.socialImages.length === 0) {
    return null;
  }

  const heading = (locale === "sq" ? settings.socialHeadingSq : settings.socialHeadingEn) || t("heading");
  const handleText =
    (locale === "sq" ? settings.socialHandleTextSq : settings.socialHandleTextEn) ||
    t("followHandle", { handle: siteConfig.instagramHandle });
  const followUrl =
    (locale === "sq" ? settings.socialFollowUrlSq : settings.socialFollowUrlEn) ||
    settings.instagramUrl ||
    `https://instagram.com/${siteConfig.instagramHandle}`;

  return (
    <Section background="elevated">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-h2 font-display text-fg-primary">{heading}</h2>
          <a
            href={followUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent font-mono text-xs tracking-[0.15em] uppercase hover:underline"
          >
            {handleText}
          </a>
        </div>

        <Stagger className="grid grid-cols-3 gap-2 sm:gap-4 md:grid-cols-6">
          {settings.socialImages.map((image) => (
            <div
              key={image.storagePath}
              className="bg-bg-subtle relative aspect-square overflow-hidden rounded-sm"
            >
              <Image
                src={image.storagePath}
                alt=""
                fill
                sizes="(min-width: 768px) 16vw, 33vw"
                className="object-cover"
              />
            </div>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}
