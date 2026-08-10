import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { HeroImage, SocialImage, StoreSettings } from "@/lib/data/settings";
import type { AdminRole, CountryCode } from "@/types";
import type { Json } from "@/types/database";

// See src/lib/data/settings.ts's SocialWallColumns comment — same bridge,
// same migration, same "shrinks to nothing once db:types catches up."
interface SocialWallColumns {
  social_heading_sq: string | null;
  social_heading_en: string | null;
  social_handle_text_sq: string | null;
  social_handle_text_en: string | null;
  social_follow_url_sq: string | null;
  social_follow_url_en: string | null;
  social_images: Json;
}

export async function getAdminStoreSettings(): Promise<StoreSettings> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("store_settings").select("*").eq("id", true).single();
  if (error) {
    throw error;
  }

  const row = data as typeof data & SocialWallColumns;
  const heroImages = Array.isArray(row.hero_images) ? (row.hero_images as unknown as HeroImage[]) : [];
  const socialImages = Array.isArray(row.social_images)
    ? (row.social_images as unknown as SocialImage[])
    : [];

  return {
    announcementTextSq: row.announcement_text_sq,
    announcementTextEn: row.announcement_text_en,
    announcementEnabled: row.announcement_enabled,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contactWhatsapp: row.contact_whatsapp,
    instagramUrl: row.instagram_url,
    facebookUrl: row.facebook_url,
    heroTaglineSq: row.hero_tagline_sq,
    heroTaglineEn: row.hero_tagline_en,
    heroHeadingSq: row.hero_heading_sq,
    heroHeadingEn: row.hero_heading_en,
    heroSubheadingSq: row.hero_subheading_sq,
    heroSubheadingEn: row.hero_subheading_en,
    heroCtaTextSq: row.hero_cta_text_sq,
    heroCtaTextEn: row.hero_cta_text_en,
    heroCtaHrefSq: row.hero_cta_href_sq,
    heroCtaHrefEn: row.hero_cta_href_en,
    heroImages,
    socialHeadingSq: row.social_heading_sq,
    socialHeadingEn: row.social_heading_en,
    socialHandleTextSq: row.social_handle_text_sq,
    socialHandleTextEn: row.social_handle_text_en,
    socialFollowUrlSq: row.social_follow_url_sq,
    socialFollowUrlEn: row.social_follow_url_en,
    socialImages,
  };
}

export interface AdminShippingRate {
  id: string;
  country: CountryCode;
  rateCents: number;
  freeShippingThresholdCents: number | null;
  isActive: boolean;
}

export async function getAdminShippingRates(): Promise<AdminShippingRate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shipping_rates")
    .select("id, country, rate_cents, free_shipping_threshold_cents, is_active")
    .order("country", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map((row) => ({
    id: row.id,
    country: row.country,
    rateCents: row.rate_cents,
    freeShippingThresholdCents: row.free_shipping_threshold_cents,
    isActive: row.is_active,
  }));
}

export interface AdminUserListItem {
  id: string;
  email: string;
  fullName: string | null;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
}

export async function getAdminUsers(): Promise<AdminUserListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email, full_name, role, is_active, last_login_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
  }));
}
