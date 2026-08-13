import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/shared/container";
import { InstagramIcon } from "@/components/shared/social-icons";
import { siteConfig } from "@/config/site";
import { getStoreSettings } from "@/lib/data/settings";
import { requireLocale } from "@/lib/locale";

function instagramHandleFromUrl(url: string): string | null {
  try {
    const handle = new URL(url).pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop();
    return handle || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "contact" });

  return {
    title: t("title"),
  };
}

export default async function ContactPage() {
  const [t, settings] = await Promise.all([
    getTranslations("contact"),
    getStoreSettings(),
  ]);

  const instagramUrl = settings.instagramUrl || `https://instagram.com/${siteConfig.instagramHandle}`;
  const handle = instagramHandleFromUrl(instagramUrl) ?? siteConfig.instagramHandle;

  return (
    <Container className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <h1 className="text-h2 font-display text-fg-primary">{t("heading")}</h1>
      <p className="text-fg-secondary font-body max-w-md text-sm">{t("description")}</p>
      <a
        href={instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="border-border-strong hover:border-accent hover:text-accent text-fg-primary font-body flex items-center gap-2 rounded-full border px-6 py-3 text-sm transition-colors"
      >
        <InstagramIcon className="size-4" />
        {t("cta", { handle })}
      </a>
    </Container>
  );
}
