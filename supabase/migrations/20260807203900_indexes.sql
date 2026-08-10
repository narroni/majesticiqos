-- BLUEPRINT §2.3, §2.5

-- products
create index products_category_id_idx
  on products (category_id)
  where deleted_at is null;

create index products_featured_idx
  on products (is_featured)
  where is_active and deleted_at is null;

create index products_sales_count_idx
  on products (sales_count desc);

create index products_created_at_idx
  on products (created_at desc);

-- orders
create index orders_status_created_at_idx
  on orders (status, created_at desc);

create index orders_created_at_idx
  on orders (created_at desc);

create index orders_phone_idx
  on orders (phone);

-- §2.5 search — diacritic-insensitivity matters: Albanian users frequently
-- type "e" for "ë" and "c" for "ç". A generated, unaccent-normalised column
-- is searched alongside the original so both spellings match.
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- unaccent() is STABLE, not IMMUTABLE, so it can't be used directly inside a
-- GENERATED column. This wrapper pins it to the default text search config
-- and is safe to mark IMMUTABLE.
create or replace function immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$
  select unaccent('unaccent', $1);
$$;

alter table product_translations
  add column name_unaccented text generated always as (
    immutable_unaccent(name)
  ) stored;

create index product_translations_search_vector_idx
  on product_translations using gin (search_vector);

create index product_translations_name_trgm_idx
  on product_translations using gin (name gin_trgm_ops);

create index product_translations_name_unaccented_trgm_idx
  on product_translations using gin (name_unaccented gin_trgm_ops);
