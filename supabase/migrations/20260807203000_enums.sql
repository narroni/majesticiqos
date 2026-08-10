-- BLUEPRINT §2.2
-- stock_status is intentionally NOT created as a stored enum: the blueprint
-- marks it "derived, not stored" — it's computed from stock_quantity /
-- low_stock_threshold at query time, never persisted as a column.

create extension if not exists pgcrypto;

create type order_status as enum (
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'completed',
  'cancelled'
);

create type country_code as enum (
  'XK',
  'AL',
  'MK',
  'OTHER'
);

create type admin_role as enum (
  'owner',
  'staff'
);

create type locale as enum (
  'sq',
  'en'
);
