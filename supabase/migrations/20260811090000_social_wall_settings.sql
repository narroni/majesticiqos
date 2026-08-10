-- Editable homepage "social wall" (admin request) — same extend-the-
-- singleton-row pattern as migrations/20260809170000_hero_settings.sql, and
-- for the same reason: a handful of values always read together with the
-- rest of store settings.
--
-- All nullable/defaulted: the storefront falls back to the message-file
-- defaults for text (messages/sq.json, messages/en.json `home.socialWall`)
-- and hides the section entirely when social_images is empty, rather than
-- showing the previous hardcoded picsum placeholders
-- (src/lib/data/settings.ts, src/components/home/social-wall.tsx).
--
-- social_follow_url_sq/en are plain text, not validated as URLs at the
-- database level, same reasoning as hero_cta_href_sq/en — the admin who can
-- write this table is already a trusted actor.
alter table store_settings
  add column social_heading_sq text,
  add column social_heading_en text,
  add column social_handle_text_sq text,
  add column social_handle_text_en text,
  add column social_follow_url_sq text,
  add column social_follow_url_en text,
  add column social_images jsonb not null default '[]'::jsonb;
