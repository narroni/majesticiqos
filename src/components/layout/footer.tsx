import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Suspense } from "react";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Container } from "@/components/shared/container";
import { FacebookIcon, InstagramIcon } from "@/components/shared/social-icons";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { getStoreSettings } from "@/lib/data/settings";

export async function Footer() {
  const [t, tNav, settings] = await Promise.all([
    getTranslations("footer"),
    getTranslations("nav"),
    getStoreSettings(),
  ]);
  const currentYear = new Date().getFullYear();
  const instagramUrl = settings.instagramUrl || `https://instagram.com/${siteConfig.instagramHandle}`;

  return (
    <footer className="bg-bg-elevated border-border border-t">
      <Container className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:py-24">
        <div className="flex flex-col gap-3">
          <Image src="/logo.png" alt={siteConfig.name} width={40} height={40} className="h-10 w-10" />
          {/* brandTagline is placeholder copy pending the final brand name (see BLUEPRINT §14.1). */}
          <p className="text-fg-secondary font-body text-sm">
            {t("brandTagline")}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-fg-muted font-mono text-xs tracking-[0.15em] uppercase">
            {t("shopHeading")}
          </h3>
          <Link
            href="/products"
            className="text-fg-secondary hover:text-fg-primary text-sm"
          >
            {tNav("products")}
          </Link>
          <Link
            href="/categories"
            className="text-fg-secondary hover:text-fg-primary text-sm"
          >
            {tNav("categories")}
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-fg-muted font-mono text-xs tracking-[0.15em] uppercase">
            {t("helpHeading")}
          </h3>
          <Link
            href="/terms"
            className="text-fg-secondary hover:text-fg-primary text-sm"
          >
            {t("links.terms")}
          </Link>
          <Link
            href="/privacy"
            className="text-fg-secondary hover:text-fg-primary text-sm"
          >
            {t("links.privacy")}
          </Link>
          <Link
            href="/shipping-returns"
            className="text-fg-secondary hover:text-fg-primary text-sm"
          >
            {t("links.shippingReturns")}
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-fg-muted font-mono text-xs tracking-[0.15em] uppercase">
            {t("contactHeading")}
          </h3>
          <Link
            href="/contact"
            className="text-fg-secondary hover:text-fg-primary text-sm"
          >
            {t("links.contact")}
          </Link>
          {settings.contactEmail ? (
            <a
              href={`mailto:${settings.contactEmail}`}
              className="text-fg-secondary hover:text-fg-primary text-sm"
            >
              {settings.contactEmail}
            </a>
          ) : null}
          {settings.contactPhone ? (
            <a
              href={`tel:${settings.contactPhone}`}
              className="text-fg-secondary hover:text-fg-primary text-sm"
            >
              {settings.contactPhone}
            </a>
          ) : null}
          <div className="flex items-center gap-3 pt-1">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("instagramLabel")}
              className="text-fg-secondary hover:text-fg-primary"
            >
              <InstagramIcon className="size-4" />
            </a>
            {settings.facebookUrl ? (
              <a
                href={settings.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("facebookLabel")}
                className="text-fg-secondary hover:text-fg-primary"
              >
                <FacebookIcon className="size-4" />
              </a>
            ) : null}
          </div>
        </div>
      </Container>

      <div className="border-border border-t">
        <Container className="flex flex-col gap-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-fg-muted font-body text-xs">
                {t("copyright", { year: currentYear })}
              </p>
              <Link
                href="/terms"
                className="text-fg-muted hover:text-fg-primary text-xs"
              >
                {t("links.terms")}
              </Link>
              <Link
                href="/privacy"
                className="text-fg-muted hover:text-fg-primary text-xs"
              >
                {t("links.privacy")}
              </Link>
            </div>
            <Suspense fallback={null}>
              <LocaleSwitcher />
            </Suspense>
          </div>
          <p className="text-fg-muted font-body text-xs">
            {t("paymentDeliveryNote")}
          </p>
          <p className="text-fg-muted font-body text-xs">{t("ageStatement")}</p>
          <p className="text-fg-muted font-body text-xs">
            {t("trademarkDisclaimer")}
          </p>
        </Container>
      </div>
    </footer>
  );
}
