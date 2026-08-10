-- BLUEPRINT §6.5 — store-wide settings the seller edits from /admin/settings:
-- announcement bar (SQ/EN + on/off), contact details, social links. A
-- singleton row (id is always `true`, enforced by the check constraint, so
-- a second insert can never happen) rather than a generic key/value table —
-- there are only ever a handful of these values and they're always read
-- together.
create table store_settings (
  id boolean primary key default true check (id),
  announcement_text_sq text,
  announcement_text_en text,
  announcement_enabled boolean not null default false,
  contact_email text,
  contact_phone text,
  contact_whatsapp text,
  instagram_url text,
  facebook_url text,
  updated_at timestamptz not null default now()
);

insert into store_settings (id) values (true);

create trigger store_settings_set_updated_at
  before update on store_settings
  for each row execute function set_updated_at();

alter table store_settings enable row level security;

-- Public read: the announcement bar and footer contact/social links are
-- ordinary storefront content, not sensitive data.
create policy store_settings_anon_select
  on store_settings for select
  to anon
  using (true);

create policy store_settings_admin_select
  on store_settings for select
  to authenticated
  using (is_admin());

-- No insert/update/delete policy for anon/authenticated — writes go through
-- the service role only (src/lib/actions/admin-settings.ts), same pattern
-- as every other admin-writable table in this schema.
