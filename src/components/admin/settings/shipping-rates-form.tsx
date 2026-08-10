"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateShippingRate } from "@/lib/actions/admin-settings";
import { COUNTRY_LABEL } from "@/lib/country-labels";
import type { AdminShippingRate } from "@/lib/data/admin-settings";
import { formatPrice } from "@/lib/utils";

function centsToEuroInput(cents: number | null): string {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

function euroInputToCents(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function ShippingRateRow({ rate }: { rate: AdminShippingRate }) {
  const [rateEuros, setRateEuros] = useState(centsToEuroInput(rate.rateCents));
  const [thresholdEuros, setThresholdEuros] = useState(
    centsToEuroInput(rate.freeShippingThresholdCents),
  );
  const [isActive, setIsActive] = useState(rate.isActive);
  const [isPending, startTransition] = useTransition();

  const rateCents = euroInputToCents(rateEuros);
  const thresholdCents = thresholdEuros.trim() === "" ? null : euroInputToCents(thresholdEuros);

  function handleSave() {
    startTransition(async () => {
      const result = await updateShippingRate(rate.id, {
        rateCents,
        freeShippingThresholdCents: thresholdCents,
        isActive,
      });
      if (result.success) {
        toast.success(`${COUNTRY_LABEL[rate.country]} shipping saved.`);
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="border-border flex flex-col gap-3 border-b pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between">
        <span className="text-fg-primary font-body text-sm font-medium">
          {COUNTRY_LABEL[rate.country]}
        </span>
        <div className="flex items-center gap-2">
          <Label className="text-fg-muted font-normal">{isActive ? "Active" : "Disabled"}</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Rate (€)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={rateEuros}
            onChange={(event) => setRateEuros(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Free shipping over (€, optional)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={thresholdEuros}
            onChange={(event) => setThresholdEuros(event.target.value)}
          />
        </div>
      </div>

      <p className="text-fg-muted font-body text-xs">
        Customer preview:{" "}
        {thresholdCents != null
          ? `${formatPrice(rateCents, "en")}, free over ${formatPrice(thresholdCents, "en")}`
          : formatPrice(rateCents, "en")}
      </p>

      <Button type="button" size="sm" variant="outline" className="self-start" disabled={isPending} onClick={handleSave}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

export function ShippingRatesForm({ rates }: { rates: AdminShippingRate[] }) {
  return (
    <div className="border-border bg-bg-elevated flex flex-col gap-4 rounded-md border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-fg-primary font-display text-lg">Shipping rates</h2>
        <p className="text-fg-muted font-body text-xs">
          Changing a rate only affects checkouts from now on — orders already placed keep the
          shipping cost they were charged.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {rates.map((rate) => (
          <ShippingRateRow key={rate.id} rate={rate} />
        ))}
      </div>
    </div>
  );
}
