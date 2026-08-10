-- Fixes save_product (20260809120000_admin_products.sql): plpgsql OUT
-- parameters named `id`/`slug` shadow bare column references of the same
-- name elsewhere in the function body (e.g. `on conflict (id)`), which
-- Postgres reports as "column reference is ambiguous" at call time. Renaming
-- them avoids the collision; behaviour is otherwise identical.
-- create or replace can't change OUT-parameter names/types, only add
-- trailing params — the old signature must be dropped first.
drop function if exists save_product(
  uuid, text, text, uuid, int, int, int, int, boolean, boolean, boolean,
  text, text, text, text, text, text, text, text, text, text, jsonb
);

create function save_product(
  p_id uuid,
  p_slug text,
  p_sku text,
  p_category_id uuid,
  p_price_cents int,
  p_discount_price_cents int,
  p_stock_quantity int,
  p_low_stock_threshold int,
  p_track_inventory boolean,
  p_is_active boolean,
  p_is_featured boolean,
  p_name_sq text,
  p_short_description_sq text,
  p_description_sq text,
  p_meta_title_sq text,
  p_meta_description_sq text,
  p_name_en text,
  p_short_description_en text,
  p_description_en text,
  p_meta_title_en text,
  p_meta_description_en text,
  p_images jsonb
)
returns table (out_id uuid, out_slug text)
language plpgsql
as $$
begin
  insert into products (
    id, slug, sku, category_id, price_cents, discount_price_cents,
    stock_quantity, low_stock_threshold, track_inventory, is_active, is_featured
  ) values (
    p_id, p_slug, nullif(p_sku, ''), p_category_id, p_price_cents, p_discount_price_cents,
    p_stock_quantity, p_low_stock_threshold, p_track_inventory, p_is_active, p_is_featured
  )
  on conflict (id) do update set
    slug = excluded.slug,
    sku = excluded.sku,
    category_id = excluded.category_id,
    price_cents = excluded.price_cents,
    discount_price_cents = excluded.discount_price_cents,
    stock_quantity = excluded.stock_quantity,
    low_stock_threshold = excluded.low_stock_threshold,
    track_inventory = excluded.track_inventory,
    is_active = excluded.is_active,
    is_featured = excluded.is_featured;

  insert into product_translations (
    product_id, locale, name, short_description, description, meta_title, meta_description
  )
  values
    (p_id, 'sq', p_name_sq, nullif(p_short_description_sq, ''), nullif(p_description_sq, ''),
      nullif(p_meta_title_sq, ''), nullif(p_meta_description_sq, '')),
    (p_id, 'en', p_name_en, nullif(p_short_description_en, ''), nullif(p_description_en, ''),
      nullif(p_meta_title_en, ''), nullif(p_meta_description_en, ''))
  on conflict (product_id, locale) do update set
    name = excluded.name,
    short_description = excluded.short_description,
    description = excluded.description,
    meta_title = excluded.meta_title,
    meta_description = excluded.meta_description;

  delete from product_images where product_id = p_id;

  insert into product_images (
    product_id, storage_path, alt_sq, alt_en, sort_order, width, height, blur_data_url
  )
  select
    p_id,
    img ->> 'storage_path',
    nullif(img ->> 'alt_sq', ''),
    nullif(img ->> 'alt_en', ''),
    (ord - 1)::int,
    nullif(img ->> 'width', '')::int,
    nullif(img ->> 'height', '')::int,
    nullif(img ->> 'blur_data_url', '')
  from jsonb_array_elements(p_images) with ordinality as t(img, ord);

  return query select p.id as out_id, p.slug as out_slug from products p where p.id = p_id;
end;
$$;
