-- BLUEPRINT §2.3 products, product_translations
-- Money is always INTEGER cents — never numeric, never float.

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  sku text unique,
  category_id uuid references categories (id) on delete set null,
  price_cents int not null check (price_cents > 0),
  discount_price_cents int check (
    discount_price_cents is null
    or (discount_price_cents > 0 and discount_price_cents < price_cents)
  ),
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  low_stock_threshold int not null default 3,
  track_inventory boolean not null default true,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sales_count int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table product_translations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  locale locale not null,
  name text not null,
  short_description text,
  description text,
  meta_title text,
  meta_description text,
  -- BLUEPRINT §2.5 — 'simple' dictionary on purpose: Postgres has no Albanian
  -- stemmer, and 'english' stemming would mangle Albanian tokens.
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(short_description, '')), 'B')
    || setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, locale)
);
