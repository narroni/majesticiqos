-- BLUEPRINT §2.3 product_images

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  storage_path text not null,
  alt_sq text,
  alt_en text,
  sort_order int not null default 0,
  width int,
  height int,
  blur_data_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
