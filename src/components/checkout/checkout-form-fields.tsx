"use client";

import { useTranslations } from "next-intl";
import { useFormContext, useWatch } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CHECKOUT_COUNTRIES,
  PHONE_FORMAT_EXAMPLE,
  type CheckoutFormValues,
} from "@/lib/validation/checkout";

const NOTE_MAX_LENGTH = 500;

export function CheckoutFormFields() {
  const t = useTranslations("checkout");
  const form = useFormContext<CheckoutFormValues>();
  const country = useWatch({ control: form.control, name: "country" });

  // See sort-select.tsx's comment — Select.Value needs this `items` map to
  // show the matched label instead of the raw country code on the closed
  // trigger.
  const countryItems = Object.fromEntries(
    CHECKOUT_COUNTRIES.map((code) => [code, t(`countries.${code}`)]),
  );

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("firstName")}</FormLabel>
                <FormControl>
                  <Input autoComplete="given-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("lastName")}</FormLabel>
                <FormControl>
                  <Input autoComplete="family-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("phone")}</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" {...field} />
                </FormControl>
                <FormDescription>
                  {t("phoneFormatHint", { format: PHONE_FORMAT_EXAMPLE[country] })}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("email")}</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("address")}</FormLabel>
              <FormControl>
                <Input autoComplete="street-address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("city")}</FormLabel>
                <FormControl>
                  <Input autoComplete="address-level2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("postalCode")}</FormLabel>
                <FormControl>
                  <Input autoComplete="postal-code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("country")}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => value && field.onChange(value)}
                  items={countryItems}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CHECKOUT_COUNTRIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {t(`countries.${code}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="customerNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("note")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("notePlaceholder")}
                  maxLength={NOTE_MAX_LENGTH}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-border bg-bg-elevated flex flex-col gap-1 rounded-md border p-4">
          <span className="text-fg-muted font-mono text-xs tracking-[0.15em] uppercase">
            {t("paymentMethod")}
          </span>
          <span className="text-fg-primary font-body text-sm">
            {t("cashOnDelivery")}
          </span>
        </div>

        <FormField
          control={form.control}
          name="ageConfirmed"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <div className="flex flex-col gap-1">
                <FormLabel className="font-normal">{t("ageConfirmation")}</FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        {/* Honeypot — hidden from sighted users and screen readers alike;
            any real submission leaves this empty. */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <input type="text" tabIndex={-1} autoComplete="off" {...form.register("honeypot")} />
        </div>
      </div>
    </>
  );
}
