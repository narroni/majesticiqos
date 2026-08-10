import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalPage } from "@/components/shared/legal-page";
import type { Locale } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "legal" });

  return {
    title: t("terms.title"),
    // Unreviewed legal draft (see LegalPage's banner) — stays noindex until
    // a lawyer has signed off.
    robots: { index: false, follow: false },
  };
}

export default function TermsPage() {
  return <LegalPage namespace="legal.terms" />;
}
