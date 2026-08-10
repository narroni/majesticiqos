"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CheckoutFormFields } from "@/components/checkout/checkout-form-fields";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import { submitCheckout } from "@/lib/actions/checkout";
import { useCartStore } from "@/lib/stores/cart-store";
import {
  createCheckoutFormSchema,
  type CheckoutFormValues,
} from "@/lib/validation/checkout";
import type { Locale, ShippingRate } from "@/types";

interface CheckoutPageContentProps {
  locale: Locale;
  shippingRates: ShippingRate[];
}

const DEFAULT_VALUES: CheckoutFormValues = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  postalCode: "",
  country: "XK",
  customerNote: "",
  ageConfirmed: false,
  honeypot: "",
};

export function CheckoutPageContent({ locale, shippingRates }: CheckoutPageContentProps) {
  const tErrors = useTranslations("errors");
  const tCheckout = useTranslations("checkout");
  const router = useRouter();

  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const hasRedirectedRef = useRef(false);
  // Captured once on mount — the Server Action rejects anything submitted
  // less than 3 seconds after this (BLUEPRINT §8.2's bot deterrent). Set in
  // an effect rather than a useRef initializer since Date.now()/randomUUID()
  // are impure and effects (not render) are where impure calls belong.
  const formStartedAtRef = useRef<number | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    formStartedAtRef.current = Date.now();
    idempotencyKeyRef.current = crypto.randomUUID();
  }, []);

  const schema = useMemo(
    () => createCheckoutFormSchema((key, values) => tErrors(key, values)),
    [tErrors],
  );

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!hasHydrated || hasRedirectedRef.current || items.length > 0) return;
    hasRedirectedRef.current = true;
    toast.error(tCheckout("emptyCartToast"));
    router.replace("/products");
  }, [hasHydrated, items.length, router, tCheckout]);

  async function onSubmit(values: CheckoutFormValues) {
    const result = await submitCheckout({
      ...values,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      locale,
      formStartedAt: formStartedAtRef.current ?? Date.now(),
      idempotencyKey: idempotencyKeyRef.current ?? crypto.randomUUID(),
    });

    if (result.success) {
      router.push(`/order/${result.publicToken}`);
      return;
    }

    for (const fieldError of result.errors) {
      if (fieldError.field in DEFAULT_VALUES) {
        form.setError(fieldError.field as keyof CheckoutFormValues, {
          message: fieldError.message,
        });
      } else {
        toast.error(fieldError.message);
      }
    }
  }

  // react-hook-form's `handleSubmit(onSubmit)` reads its internal refs when
  // called — wrapping it in a real event handler (rather than calling it
  // inline in the JSX below) keeps that call itself out of the render pass.
  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    void form.handleSubmit(onSubmit)(event);
  }

  if (!hasHydrated) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={handleFormSubmit}
        className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]"
        noValidate
      >
        <CheckoutFormFields />
        <CheckoutSummary
          shippingRates={shippingRates}
          locale={locale}
          isSubmitting={form.formState.isSubmitting}
        />
      </form>
    </Form>
  );
}
