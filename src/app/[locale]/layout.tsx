import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { fontVariables } from "@/app/fonts";
import { CartDrawerLoader } from "@/components/cart/cart-drawer-loader";
import { AppProviders } from "@/components/providers/app-providers";
import { CartHydration } from "@/components/providers/cart-hydration";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { JsonLd } from "@/components/shared/json-ld";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { requireLocale } from "@/lib/locale";
import { buildOrganizationJsonLd, buildWebsiteJsonLd, getSiteUrl } from "@/lib/seo";

import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// BLUEPRINT §9.2 — title template applies to every page; each route's own
// generateMetadata only needs to set `title` to the page-specific part.
// The description here is the sitewide fallback — pages override it with
// their own where they have something more specific to say.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = requireLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "seo" });

  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      template: `%s | ${siteConfig.name}`,
      default: siteConfig.name,
    },
    description: t("defaultDescription"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = requireLocale((await params).locale);

  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${fontVariables} dark h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* BLUEPRINT §9.3 — Organization + WebSite/SearchAction on every page. */}
        <JsonLd data={buildOrganizationJsonLd()} />
        <JsonLd data={buildWebsiteJsonLd(locale)} />
        <NextIntlClientProvider>
          <AppProviders>
            <CartHydration />
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
            <CartDrawerLoader />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
