-- Editable homepage hero (admin request): heading/subheading/tagline/CTA
-- text per locale, plus an ordered list of background images. Extends the
-- existing store_settings singleton rather than a new table — same
-- reasoning as the original table comment: a handful of values, always read
-- together with the rest of store settings.
--
-- Every column is nullable text: the homepage falls back to the message-file
-- defaults (messages/sq.json, messages/en.json `home.hero`) whenever a field
-- is empty, so an unconfigured hero never renders blank (src/lib/data/settings.ts).
--
-- hero_cta_href_sq/en are plain text, not validated as URLs at the database
-- level — they may be internal paths ("/products") or full URLs, and the
-- admin who can write this table is already a trusted actor.
--
-- hero_images is an ordered jsonb array of `{ storagePath: string }`, order
-- = display order. A single small array rather than a child table: the
-- product_images table exists because products need per-image alt text and
-- independent CRUD; hero backgrounds are always read/written as one unit
-- alongside the rest of this row, so a jsonb array avoids a join for no
-- benefit (same reasoning that made this a singleton row in the first place).
alter table store_settings
  add column hero_tagline_sq text,
  add column hero_tagline_en text,
  add column hero_heading_sq text,
  add column hero_heading_en text,
  add column hero_subheading_sq text,
  add column hero_subheading_en text,
  add column hero_cta_text_sq text,
  add column hero_cta_text_en text,
  add column hero_cta_href_sq text,
  add column hero_cta_href_en text,
  add column hero_images jsonb not null default '[]'::jsonb;
