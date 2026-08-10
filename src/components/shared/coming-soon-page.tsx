import { getTranslations } from "next-intl/server";

import { Container } from "@/components/shared/container";

/**
 * Bare structural stub for a footer/nav link with no real content behind it
 * yet (About, Contact, Terms, Privacy, Shipping & Returns) — noindex'd by
 * the page's own metadata, excluded from the sitemap. Exists only so the
 * link resolves to something instead of a 404, not to be indexed.
 */
export async function ComingSoonPage({ title }: { title: string }) {
  const t = await getTranslations("comingSoon");

  return (
    <Container className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <h1 className="text-h2 font-display text-fg-primary">{title}</h1>
      <p className="text-fg-secondary font-body text-sm">{t("message")}</p>
    </Container>
  );
}
