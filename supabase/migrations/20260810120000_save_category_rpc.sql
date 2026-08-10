-- Admin category management (BLUEPRINT §6.3-adjacent) — same atomicity
-- reasoning as save_product: a category write touches both `categories` and
-- `category_translations`, so it goes through one RPC rather than two
-- separate Supabase calls that could leave a category with no translation
-- row if the second one failed.
create function save_category(
  p_id uuid,
  p_slug text,
  p_image_url text,
  p_sort_order int,
  p_is_active boolean,
  p_name_sq text,
  p_description_sq text,
  p_name_en text,
  p_description_en text
)
returns table (out_id uuid, out_slug text)
language plpgsql
as $$
begin
  insert into categories (id, slug, image_url, sort_order, is_active)
  values (p_id, p_slug, nullif(p_image_url, ''), p_sort_order, p_is_active)
  on conflict (id) do update set
    slug = excluded.slug,
    image_url = excluded.image_url,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

  insert into category_translations (category_id, locale, name, description)
  values
    (p_id, 'sq', p_name_sq, nullif(p_description_sq, '')),
    (p_id, 'en', p_name_en, nullif(p_description_en, ''))
  on conflict (category_id, locale) do update set
    name = excluded.name,
    description = excluded.description;

  return query select c.id as out_id, c.slug as out_slug from categories c where c.id = p_id;
end;
$$;
