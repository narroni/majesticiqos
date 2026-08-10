"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import { calculateTotal, getShippingCost } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";
import type { CountryCode, Locale, ShippingRate } from "@/types";

const COUNTRY_CODES: readonly CountryCode[] = ["XK", "AL", "MK", "OTHER"];

interface CartSummaryProps {
  subtotalCents: number;
  shippingRates: ShippingRate[];
  locale: Locale;
  checkoutDisabled: boolean;
}

export function CartSummary({
  subtotalCents,
  shippingRates,
  locale,
  checkoutDisabled,
}: CartSummaryProps) {
  const t = useTranslations("cart");
  const tCheckout = useTranslations("checkout");
  const [country, setCountry] = useState<CountryCode>("XK");

  // See sort-select.tsx's comment — Select.Value needs this `items` map to
  // show the matched label instead of the raw country code on the closed
  // trigger.
  const countryItems = Object.fromEntries(
    COUNTRY_CODES.map((code) => [code, tCheckout(`countries.${code}`)]),
  );

  const rate = shippingRates.find((r) => r.country === country) ?? null;
  const shippingCents = getShippingCost(rate, subtotalCents);
  const totalCents = calculateTotal(subtotalCents, shippingCents);

  return (
    <div className="border-border bg-bg-elevated flex flex-col gap-5 rounded-md border p-6">
      <h2 className="font-display text-fg-primary text-lg">{t("summary")}</h2>

      <div className="flex flex-col gap-2">
        <Label>{tCheckout("country")}</Label>
        <Select
          value={country}
          onValueChange={(value) => value && setCountry(value as CountryCode)}
          items={countryItems}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((code) => (
              <SelectItem key={code} value={code}>
                {tCheckout(`countries.${code}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <dl className="font-mono text-sm">
        <div className="flex items-center justify-between py-1.5">
          <dt className="text-fg-secondary">{t("subtotal")}</dt>
          <dd className="text-fg-primary">{formatPrice(subtotalCents, locale)}</dd>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <dt className="text-fg-secondary">{t("shipping")}</dt>
          <dd className="text-fg-primary">
            {rate ? formatPrice(shippingCents, locale) : t("selectCountry")}
          </dd>
        </div>
        <div className="border-border flex items-center justify-between border-t py-3 text-base">
          <dt className="text-fg-primary">{t("total")}</dt>
          <dd className="text-accent">{formatPrice(totalCents, locale)}</dd>
        </div>
      </dl>

      {checkoutDisabled ? (
        <Button type="button" size="lg" disabled>
          {t("checkoutButton")}
        </Button>
      ) : (
        <Button render={<Link href="/checkout" />} nativeButton={false} size="lg">
          {t("checkoutButton")}
        </Button>
      )}
    </div>
  );
}
