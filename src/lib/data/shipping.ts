import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import type { CountryCode, ShippingRate } from "@/types";

const SHIPPING_RATE_COLUMNS =
  "country, rate_cents, free_shipping_threshold_cents";

// Not one of BLUEPRINT §1.2's listed pages — shipping rates are supplementary
// data read from cart/checkout (both `no-store` per that table). A short,
// tagged revalidate is used here anyway so a shipping-rate edit propagates
// quickly if this ever gets read from a cached surface too.
const CACHE = { revalidate: 300, tags: ["shipping-rates"] };

function toShippingRate(row: {
  country: CountryCode;
  rate_cents: number;
  free_shipping_threshold_cents: number | null;
}): ShippingRate {
  return {
    country: row.country,
    rateCents: row.rate_cents,
    freeShippingThresholdCents: row.free_shipping_threshold_cents,
  };
}

export async function getShippingRates(): Promise<ShippingRate[]> {
  const supabase = createPublicClient(CACHE);

  const { data, error } = await supabase
    .from("shipping_rates")
    .select(SHIPPING_RATE_COLUMNS)
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  return (data ?? []).map(toShippingRate);
}

export async function getShippingRate(
  country: CountryCode,
): Promise<ShippingRate | null> {
  const supabase = createPublicClient(CACHE);

  const { data, error } = await supabase
    .from("shipping_rates")
    .select(SHIPPING_RATE_COLUMNS)
    .eq("country", country)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toShippingRate(data) : null;
}
