"use server";

import "server-only";

import { updateTag } from "next/cache";
import { z } from "zod";

import { deleteProductImageFile } from "@/lib/actions/admin-upload";
import { getAdminUser } from "@/lib/auth/get-admin-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

interface ActionResult {
  success: boolean;
  error?: string;
}

const announcementSchema = z.object({
  textSq: z.string().trim().max(300),
  textEn: z.string().trim().max(300),
  enabled: z.boolean(),
});

export async function updateAnnouncementSettings(
  input: z.infer<typeof announcementSchema>,
): Promise<ActionResult> {
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabaseAdmin
    .from("store_settings")
    .update({
      announcement_text_sq: parsed.data.textSq || null,
      announcement_text_en: parsed.data.textEn || null,
      announcement_enabled: parsed.data.enabled,
    })
    .eq("id", true);

  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  updateTag("settings");
  return { success: true };
}

const contactSchema = z.object({
  contactEmail: z.union([z.email(), z.literal("")]),
  contactPhone: z.string().trim().max(30),
  contactWhatsapp: z.string().trim().max(30),
  instagramUrl: z.union([z.url(), z.literal("")]),
  facebookUrl: z.union([z.url(), z.literal("")]),
});

export async function updateContactSettings(
  input: z.infer<typeof contactSchema>,
): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabaseAdmin
    .from("store_settings")
    .update({
      contact_email: parsed.data.contactEmail || null,
      contact_phone: parsed.data.contactPhone || null,
      contact_whatsapp: parsed.data.contactWhatsapp || null,
      instagram_url: parsed.data.instagramUrl || null,
      facebook_url: parsed.data.facebookUrl || null,
    })
    .eq("id", true);

  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  updateTag("settings");
  return { success: true };
}

const shippingRateInputSchema = z.object({
  rateCents: z.number().int().min(0),
  freeShippingThresholdCents: z.number().int().positive().nullable(),
  isActive: z.boolean(),
});

const updateShippingRateSchema = z.object({
  id: z.uuid(),
  input: shippingRateInputSchema,
});

export async function updateShippingRate(
  id: string,
  input: z.infer<typeof shippingRateInputSchema>,
): Promise<ActionResult> {
  const parsed = updateShippingRateSchema.safeParse({ id, input });
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  // Existing orders snapshot shipping_cents at checkout time (BLUEPRINT
  // §5.1) — updating this table only ever affects future checkouts.
  const { error } = await supabaseAdmin
    .from("shipping_rates")
    .update({
      rate_cents: parsed.data.input.rateCents,
      free_shipping_threshold_cents: parsed.data.input.freeShippingThresholdCents,
      is_active: parsed.data.input.isActive,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  updateTag("shipping-rates");
  return { success: true };
}

const toggleAdminUserActiveSchema = z.object({
  targetId: z.uuid(),
  nextValue: z.boolean(),
});

export async function toggleAdminUserActive(
  targetId: string,
  nextValue: boolean,
): Promise<ActionResult> {
  const parsed = toggleAdminUserActiveSchema.safeParse({ targetId, nextValue });
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  // BLUEPRINT §6.5 — admin user management is owner-only, checked here
  // server-side regardless of what the UI shows or hides.
  if (admin.role !== "owner") {
    return { success: false, error: "Only an owner can manage admin users." };
  }

  if (admin.id === parsed.data.targetId && !parsed.data.nextValue) {
    return { success: false, error: "You can't deactivate your own account." };
  }

  const { error } = await supabaseAdmin
    .from("admin_users")
    .update({ is_active: parsed.data.nextValue })
    .eq("id", parsed.data.targetId);

  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  return { success: true };
}

const heroImageSchema = z.object({
  storagePath: z.url().max(2048),
});

const heroSettingsSchema = z.object({
  taglineSq: z.string().trim().max(80).optional().or(z.literal("")),
  taglineEn: z.string().trim().max(80).optional().or(z.literal("")),
  headingSq: z.string().trim().max(120).optional().or(z.literal("")),
  headingEn: z.string().trim().max(120).optional().or(z.literal("")),
  subheadingSq: z.string().trim().max(200).optional().or(z.literal("")),
  subheadingEn: z.string().trim().max(200).optional().or(z.literal("")),
  ctaTextSq: z.string().trim().max(40).optional().or(z.literal("")),
  ctaTextEn: z.string().trim().max(40).optional().or(z.literal("")),
  // Not z.url() — an internal path like "/products" is the common case, and
  // the admin who can write this table is already a trusted actor.
  ctaHrefSq: z.string().trim().max(300).optional().or(z.literal("")),
  ctaHrefEn: z.string().trim().max(300).optional().or(z.literal("")),
  images: z.array(heroImageSchema).max(10),
});

export async function updateHeroSettings(
  input: z.infer<typeof heroSettingsSchema>,
): Promise<ActionResult> {
  const parsed = heroSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  // Diff against the currently-stored images so ones the admin removed get
  // cleaned out of Storage — but only after the DB write below succeeds. A
  // failed save must never delete a file the live hero still references
  // (same ordering as saveProduct's image cleanup).
  const { data: existing } = await supabaseAdmin
    .from("store_settings")
    .select("hero_images")
    .eq("id", true)
    .single();

  const previousImages = Array.isArray(existing?.hero_images)
    ? (existing.hero_images as unknown as { storagePath: string }[])
    : [];
  const nextPaths = new Set(parsed.data.images.map((image) => image.storagePath));
  const removedPaths = previousImages
    .map((image) => image.storagePath)
    .filter((path) => !nextPaths.has(path));

  const { error } = await supabaseAdmin
    .from("store_settings")
    .update({
      hero_tagline_sq: parsed.data.taglineSq || null,
      hero_tagline_en: parsed.data.taglineEn || null,
      hero_heading_sq: parsed.data.headingSq || null,
      hero_heading_en: parsed.data.headingEn || null,
      hero_subheading_sq: parsed.data.subheadingSq || null,
      hero_subheading_en: parsed.data.subheadingEn || null,
      hero_cta_text_sq: parsed.data.ctaTextSq || null,
      hero_cta_text_en: parsed.data.ctaTextEn || null,
      hero_cta_href_sq: parsed.data.ctaHrefSq || null,
      hero_cta_href_en: parsed.data.ctaHrefEn || null,
      hero_images: parsed.data.images as unknown as Json,
    })
    .eq("id", true);

  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  if (removedPaths.length > 0) {
    await Promise.all(removedPaths.map((path) => deleteProductImageFile(path)));
  }

  updateTag("home");
  return { success: true };
}

const socialImageSchema = z.object({
  storagePath: z.url().max(2048),
});

const socialWallSettingsSchema = z.object({
  headingSq: z.string().trim().max(120).optional().or(z.literal("")),
  headingEn: z.string().trim().max(120).optional().or(z.literal("")),
  handleTextSq: z.string().trim().max(60).optional().or(z.literal("")),
  handleTextEn: z.string().trim().max(60).optional().or(z.literal("")),
  // Not z.url() — same reasoning as hero's ctaHref fields.
  followUrlSq: z.string().trim().max(300).optional().or(z.literal("")),
  followUrlEn: z.string().trim().max(300).optional().or(z.literal("")),
  images: z.array(socialImageSchema).max(12),
});

interface SocialWallUpdate {
  social_heading_sq: string | null;
  social_heading_en: string | null;
  social_handle_text_sq: string | null;
  social_handle_text_en: string | null;
  social_follow_url_sq: string | null;
  social_follow_url_en: string | null;
  social_images: Json;
}

// migrations/20260811090000_social_wall_settings.sql hasn't been
// pushed/typed yet (run `npm run db:push` then `npm run db:types`) — same
// bridge pattern the now-removed heroSettingsClient used; remove this once
// the types catch up, same as that one was.
const socialWallClient = supabaseAdmin as unknown as {
  from(table: "store_settings"): {
    select(columns: "social_images"): {
      eq(
        column: "id",
        value: boolean,
      ): {
        single(): Promise<{
          data: { social_images: Json } | null;
          error: { message: string } | null;
        }>;
      };
    };
    update(values: Partial<SocialWallUpdate>): {
      eq(column: "id", value: boolean): Promise<{ error: { message: string } | null }>;
    };
  };
};

export async function updateSocialWallSettings(
  input: z.infer<typeof socialWallSettingsSchema>,
): Promise<ActionResult> {
  const parsed = socialWallSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  // Same cleanup-after-write ordering as updateHeroSettings.
  const { data: existing } = await socialWallClient
    .from("store_settings")
    .select("social_images")
    .eq("id", true)
    .single();

  const previousImages = Array.isArray(existing?.social_images)
    ? (existing.social_images as unknown as { storagePath: string }[])
    : [];
  const nextPaths = new Set(parsed.data.images.map((image) => image.storagePath));
  const removedPaths = previousImages
    .map((image) => image.storagePath)
    .filter((path) => !nextPaths.has(path));

  const { error } = await socialWallClient
    .from("store_settings")
    .update({
      social_heading_sq: parsed.data.headingSq || null,
      social_heading_en: parsed.data.headingEn || null,
      social_handle_text_sq: parsed.data.handleTextSq || null,
      social_handle_text_en: parsed.data.handleTextEn || null,
      social_follow_url_sq: parsed.data.followUrlSq || null,
      social_follow_url_en: parsed.data.followUrlEn || null,
      social_images: parsed.data.images as unknown as Json,
    })
    .eq("id", true);

  if (error) {
    return { success: false, error: "Something went wrong. Try again." };
  }

  if (removedPaths.length > 0) {
    await Promise.all(removedPaths.map((path) => deleteProductImageFile(path)));
  }

  updateTag("home");
  return { success: true };
}
