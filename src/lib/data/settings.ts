import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import type { Json } from "@/types/database";

export interface HeroImage {
  storagePath: string;
}

export interface SocialImage {
  storagePath: string;
}

export interface StoreSettings {
  announcementTextSq: string | null;
  announcementTextEn: string | null;
  announcementEnabled: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  heroTaglineSq: string | null;
  heroTaglineEn: string | null;
  heroHeadingSq: string | null;
  heroHeadingEn: string | null;
  heroSubheadingSq: string | null;
  heroSubheadingEn: string | null;
  heroCtaTextSq: string | null;
  heroCtaTextEn: string | null;
  heroCtaHrefSq: string | null;
  heroCtaHrefEn: string | null;
  heroImages: HeroImage[];
  socialHeadingSq: string | null;
  socialHeadingEn: string | null;
  socialHandleTextSq: string | null;
  socialHandleTextEn: string | null;
  socialFollowUrlSq: string | null;
  socialFollowUrlEn: string | null;
  socialImages: SocialImage[];
}

// social_* columns bridge — migrations/20260811090000_social_wall_settings.sql
// hasn't been pushed/typed yet (run `npm run db:push` then `npm run db:types`),
// same reasoning as the now-resolved hero_* bridge this file used to carry.
// An intersection with the real (generated) row type rather than a full
// duplicate, so this shrinks to nothing extra once the types catch up.
interface SocialWallColumns {
  social_heading_sq: string | null;
  social_heading_en: string | null;
  social_handle_text_sq: string | null;
  social_handle_text_en: string | null;
  social_follow_url_sq: string | null;
  social_follow_url_en: string | null;
  social_images: Json;
}

// Public storefront read (announcement bar, footer contact/social, hero,
// social wall) — cached like categories/shipping rates, tagged so an admin
// save can invalidate it. Tagged "home" too (not just "settings") because
// the hero and social wall sections are both part of the home page's
// render: an admin edit to either must bust the home page's ISR cache
// immediately, same as a product edit does.
export async function getStoreSettings(): Promise<StoreSettings> {
  const supabase = createPublicClient({ revalidate: 300, tags: ["settings", "home"] });

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
