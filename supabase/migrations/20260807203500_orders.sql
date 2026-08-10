-- BLUEPRINT §2.3 orders, order_items
-- order_items is an immutable snapshot: product name, slug, image and unit
-- price are copied at purchase time so deleting or editing a product can
-- never mutate order history.

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  public_token uuid unique not null default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null,
  phone_country text not null,
  email text,
  address_line text not null,
  city text not null,
  postal_code text,
  country country_code not null,
  customer_note text,
  subtotal_cents int not null,
  shipping_cents int not null,
  total_cents int not null,
  currency text not null default 'EUR',
  status order_status not null default 'pending',
  locale locale not null,
  admin_note text,
  ip_hash text,
  user_agent text,
  confirmed_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  product_name_sq text not null,
  product_name_en text not null,
  product_slug text not null,
  image_url text,
  unit_price_cents int not null,
  original_price_cents int,
  quantity int not null check (quantity > 0),
  line_total_cents int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
