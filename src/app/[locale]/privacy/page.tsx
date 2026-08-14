import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalPage } from "@/components/shared/legal-page";
import { requireLocale } from "@/lib/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "legal" });

  return {
    title: t("privacy.title"),
  };
}

export default function PrivacyPage() {
  return <LegalPage namespace="legal.privacy" />;
}
