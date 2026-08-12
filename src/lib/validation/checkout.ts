// Isomorphic on purpose (no "server-only") — this schema is imported by both
// the checkout form's zodResolver and the checkout Server Action, so the two
// can never drift. Error messages are baked in via a translator function
// rather than being static, since the same rules must read correctly in
// both sq and en (the factory is called with the client's `useTranslations`
// on the browser, and with `getTranslations` for the order's locale on the
// server).
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

export const CHECKOUT_COUNTRIES = ["XK", "AL", "MK", "OTHER"] as const;
export type CheckoutCountry = (typeof CHECKOUT_COUNTRIES)[number];

type PhoneRegion = "XK" | "AL" | "MK";
const PHONE_REGIONS: readonly PhoneRegion[] = ["XK", "AL", "MK"];

export const PHONE_FORMAT_EXAMPLE: Record<CheckoutCountry, string> = {
  XK: "+383 44 123 456",
  AL: "+355 69 123 4567",
  MK: "+389 70 123 456",
  OTHER: "+<code> ...",
};

/**
 * A customer's phone number's origin country has nothing to do with their
 * delivery country — an Albanian number shipping to a Kosovo address is
 * completely normal. Tries the delivery country's region first (so a plain
 * local-format number, no leading +, matches intuitively), then the other
 * two supported regions, then no region at all (a fully-qualified
 * +<calling code> number, valid for literally any country). Accepted if any
 * interpretation parses to a valid number.
 *
 * This is used only to *normalise* a number to E.164 for storage when
 * possible — it is never used to reject a number. A number libphonenumber
 * doesn't recognise is still accepted; see `isPlausiblePhone` below.
 */
export function parseCheckoutPhone(phone: string, preferredRegion?: PhoneRegion) {
  const regions = preferredRegion
    ? [preferredRegion, ...PHONE_REGIONS.filter((region) => region !== preferredRegion)]
    : PHONE_REGIONS;

  for (const region of regions) {
    const parsed = parsePhoneNumberFromString(phone, region);
    if (parsed?.isValid()) {
      return parsed;
    }
  }

  const parsed = parsePhoneNumberFromString(phone);
  return parsed?.isValid() ? parsed : undefined;
}

// Loose format check: digits, spaces, dashes, parentheses, optional leading
// "+". Not a recognised-country check — libphonenumber is only used for
// best-effort E.164 normalisation, never to reject a number (see
// `parseCheckoutPhone`).
const PLAUSIBLE_PHONE_PATTERN = /^\+?[0-9\s\-()]+$/;
const MIN_PHONE_DIGITS = 6;
const MAX_PHONE_DIGITS = 20;

export function isPlausiblePhone(phone: string): boolean {
  if (!PLAUSIBLE_PHONE_PATTERN.test(phone)) {
    return false;
  }
  const digitCount = phone.replace(/\D/g, "").length;
  return digitCount >= MIN_PHONE_DIGITS && digitCount <= MAX_PHONE_DIGITS;
}

type ErrorTranslator = (
  key: "required" | "invalidEmail" | "invalidPhone" | "tooLong" | "selectCountry",
  values?: Record<string, string | number>,
) => string;

export function createCheckoutFormSchema(t: ErrorTranslator) {
  return z
    .object({
      firstName: z
        .string()
        .trim()
        .min(1, t("required"))
        .max(50, t("tooLong", { max: 50 })),
      lastName: z
        .string()
        .trim()
        .min(1, t("required"))
        .max(50, t("tooLong", { max: 50 })),
      phone: z.string().trim().min(1, t("required")).max(30, t("tooLong", { max: 30 })),
      email: z
        .email(t("invalidEmail"))
        .optional()
        .or(z.literal("")),
      address: z
        .string()
        .trim()
        .min(1, t("required"))
        .max(200, t("tooLong", { max: 200 })),
      city: z
        .string()
        .trim()
        .min(1, t("required"))
        .max(100, t("tooLong", { max: 100 })),
      postalCode: z
        .string()
        .trim()
        .max(20, t("tooLong", { max: 20 }))
        .optional()
        .or(z.literal("")),
      country: z.enum(CHECKOUT_COUNTRIES, t("selectCountry")),
      customerNote: z
        .string()
        .trim()
        .max(500, t("tooLong", { max: 500 }))
        .optional()
        .or(z.literal("")),
      ageConfirmed: z.boolean().refine((value) => value === true, {
        message: t("required"),
      }),
      // Honeypot — real users never see or fill this in (see checkout-form.tsx).
      honeypot: z.string().max(0).optional().or(z.literal("")),
    })
    .superRefine((data, ctx) => {
      if (!isPlausiblePhone(data.phone)) {
        ctx.addIssue({
          code: "custom",
          message: t("invalidPhone"),
          path: ["phone"],
        });
      }
    });
}

export type CheckoutFormValues = z.infer<ReturnType<typeof createCheckoutFormSchema>>;

export const checkoutCartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
});
