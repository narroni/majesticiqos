-- BLUEPRINT §2.3 shipping_rates
-- Seeded as data, not a constant, so the seller can change rates without a
-- deploy.

create table shipping_rates (
  id uuid primary key default gen_random_uuid(),
  country country_code unique not null,
  rate_cents int not null,
  free_shipping_threshold_cents int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
