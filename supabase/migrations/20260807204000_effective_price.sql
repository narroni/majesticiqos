-- Adds a generated column so price sorting/filtering can use the price the
-- customer actually pays (discount price when set, otherwise base price)
-- directly in the database. PostgREST's query builder can only order/filter
-- by real columns, not a computed COALESCE(discount_price_cents, price_cents)
-- expression, so this is required for correct effective-price sort.

alter table products
  add column effective_price_cents int generated always as (
    coalesce(discount_price_cents, price_cents)
  ) stored;

create index products_effective_price_cents_idx
  on products (effective_price_cents);
