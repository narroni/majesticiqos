-- BLUEPRINT §2.3 categories, category_translations

create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table category_translations (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id) on delete cascade,
  locale locale not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, locale)
);
