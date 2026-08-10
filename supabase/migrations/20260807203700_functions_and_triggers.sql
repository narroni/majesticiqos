-- BLUEPRINT §2.6, §2.7

-- §2.6 — helper used by RLS policies in the next migration.
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from admin_users
    where id = auth.uid() and is_active = true
  );
$$;

-- §2.7 set_updated_at() — BEFORE UPDATE on all tables.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_set_updated_at
  before update on categories
  for each row execute function set_updated_at();

create trigger category_translations_set_updated_at
  before update on category_translations
  for each row execute function set_updated_at();

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

create trigger product_translations_set_updated_at
  before update on product_translations
  for each row execute function set_updated_at();

create trigger product_images_set_updated_at
  before update on product_images
  for each row execute function set_updated_at();

create trigger shipping_rates_set_updated_at
  before update on shipping_rates
  for each row execute function set_updated_at();

create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

create trigger order_items_set_updated_at
  before update on order_items
  for each row execute function set_updated_at();

create trigger admin_users_set_updated_at
  before update on admin_users
  for each row execute function set_updated_at();

-- §2.7 generate_order_number() — BEFORE INSERT on orders, EMB-{YYYY}-{seq}.
create sequence if not exists order_number_seq;

create or replace function generate_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null then
    new.order_number := 'EMB-' || to_char(now(), 'YYYY') || '-'
      || lpad(nextval('order_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger orders_generate_order_number
  before insert on orders
  for each row execute function generate_order_number();

-- §2.7 set_status_timestamps() — BEFORE UPDATE on orders; stamps the
-- relevant timestamp column when status changes.
create or replace function set_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    case new.status
      when 'confirmed' then new.confirmed_at := now();
      when 'shipped' then new.shipped_at := now();
      when 'completed' then new.completed_at := now();
      when 'cancelled' then new.cancelled_at := now();
      else null;
    end case;
  end if;
  return new;
end;
$$;

create trigger orders_set_status_timestamps
  before update on orders
  for each row execute function set_status_timestamps();

-- §2.7 decrement_stock(order_id) — called inside the checkout transaction,
-- after order + order_items have been inserted. SELECT ... FOR UPDATE locks
-- each referenced product row before checking/decrementing, so two
-- concurrent checkouts can't both oversell the last unit. Raises if
-- insufficient stock; the transaction is rolled back by the caller.
create or replace function decrement_stock(p_order_id uuid)
returns void
language plpgsql
as $$
declare
  item record;
  current_stock int;
begin
  for item in
    select product_id, quantity
    from order_items
    where order_id = p_order_id
      and product_id is not null
  loop
    select stock_quantity into current_stock
    from products
    where id = item.product_id
      and track_inventory = true
    for update;

    if current_stock is not null then
      if current_stock < item.quantity then
        raise exception 'Insufficient stock for product %', item.product_id
          using errcode = 'P0001';
      end if;

      update products
      set stock_quantity = stock_quantity - item.quantity
      where id = item.product_id;
    end if;
  end loop;
end;
$$;

-- §2.7 increment_sales_count() — AFTER UPDATE on orders when status moves to
-- 'completed'.
create or replace function increment_sales_count()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update products p
    set sales_count = sales_count + oi.quantity
    from order_items oi
    where oi.order_id = new.id
      and oi.product_id = p.id;
  end if;
  return new;
end;
$$;

create trigger orders_increment_sales_count
  after update on orders
  for each row execute function increment_sales_count();
