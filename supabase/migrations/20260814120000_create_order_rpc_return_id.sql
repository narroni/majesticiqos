-- create_order() only returned (order_number, public_token) — neither is
-- the admin route's identifier (/admin/orders/[id] keys off orders.id).
-- Adding it so the Telegram new-order notification (src/lib/actions/checkout.ts)
-- can link straight into the admin panel without a second lookup.
--
-- Postgres won't let CREATE OR REPLACE change a function's return type, so
-- this has to drop and recreate rather than just replace.
drop function if exists create_order(
  text, text, text, text, text, text, text, text, country_code, text,
  locale, text, text, int, int, int, jsonb
);

create function create_order(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_phone_country text,
  p_email text,
  p_address_line text,
  p_city text,
  p_postal_code text,
  p_country country_code,
  p_customer_note text,
  p_locale locale,
  p_ip_hash text,
  p_user_agent text,
  p_subtotal_cents int,
  p_shipping_cents int,
  p_total_cents int,
  p_items jsonb
)
returns table (id uuid, order_number text, public_token uuid)
language plpgsql
as $$
declare
  v_order_id uuid;
  v_item jsonb;
begin
  insert into orders (
    first_name, last_name, phone, phone_country, email,
    address_line, city, postal_code, country, customer_note,
    subtotal_cents, shipping_cents, total_cents, locale, ip_hash, user_agent
  ) values (
    p_first_name, p_last_name, p_phone, p_phone_country, nullif(p_email, ''),
    p_address_line, p_city, nullif(p_postal_code, ''), p_country, nullif(p_customer_note, ''),
    p_subtotal_cents, p_shipping_cents, p_total_cents, p_locale, p_ip_hash, nullif(p_user_agent, '')
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into order_items (
      order_id, product_id, product_name_sq, product_name_en, product_slug,
      image_url, unit_price_cents, original_price_cents, quantity, line_total_cents
    ) values (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'name_sq',
      v_item->>'name_en',
      v_item->>'slug',
      v_item->>'image_url',
      (v_item->>'unit_price_cents')::int,
      (v_item->>'original_price_cents')::int,
      (v_item->>'quantity')::int,
      (v_item->>'line_total_cents')::int
    );
  end loop;

  -- Raises and rolls back the whole transaction on insufficient stock.
  perform decrement_stock(v_order_id);

  return query
    select o.id, o.order_number, o.public_token from orders o where o.id = v_order_id;
end;
$$;
