-- BLUEPRINT §2.6
-- RLS is enabled on every table. service_role bypasses RLS by default on
-- Supabase, so no explicit service_role policies are written here.
--
-- orders and order_items get NO anon policy at all, not even insert — the
-- absence of any policy for a role means that role has zero access once RLS
-- is enabled. Orders are created only through a server action using the
-- service role.

alter table categories enable row level security;
alter table category_translations enable row level security;
alter table products enable row level security;
alter table product_translations enable row level security;
alter table product_images enable row level security;
alter table shipping_rates enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table admin_users enable row level security;

-- categories / category_translations
-- anon: SELECT where is_active · authenticated admin: SELECT all

create policy categories_anon_select
  on categories for select
  to anon
  using (is_active);

create policy categories_admin_select
  on categories for select
  to authenticated
  using (is_admin());

create policy category_translations_anon_select
  on category_translations for select
  to anon
  using (
    exists (
      select 1 from categories c
      where c.id = category_translations.category_id
        and c.is_active
    )
  );

create policy category_translations_admin_select
  on category_translations for select
  to authenticated
  using (is_admin());

-- products / product_translations / product_images
-- anon: SELECT where is_active AND deleted_at IS NULL · authenticated admin: SELECT all

create policy products_anon_select
  on products for select
  to anon
  using (is_active and deleted_at is null);

create policy products_admin_select
  on products for select
  to authenticated
  using (is_admin());

create policy product_translations_anon_select
  on product_translations for select
  to anon
  using (
    exists (
      select 1 from products p
      where p.id = product_translations.product_id
        and p.is_active
        and p.deleted_at is null
    )
  );

create policy product_translations_admin_select
  on product_translations for select
  to authenticated
  using (is_admin());

create policy product_images_anon_select
  on product_images for select
  to anon
  using (
    exists (
      select 1 from products p
      where p.id = product_images.product_id
        and p.is_active
        and p.deleted_at is null
    )
  );

create policy product_images_admin_select
  on product_images for select
  to authenticated
  using (is_admin());

-- shipping_rates
-- anon: SELECT where is_active · authenticated admin: SELECT all

create policy shipping_rates_anon_select
  on shipping_rates for select
  to anon
  using (is_active);

create policy shipping_rates_admin_select
  on shipping_rates for select
  to authenticated
  using (is_admin());

-- orders / order_items
-- anon: none · authenticated admin: SELECT/UPDATE if is_admin()

create policy orders_admin_select
  on orders for select
  to authenticated
  using (is_admin());

create policy orders_admin_update
  on orders for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy order_items_admin_select
  on order_items for select
  to authenticated
  using (is_admin());

create policy order_items_admin_update
  on order_items for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- admin_users
-- anon: none · authenticated admin: SELECT own row only

create policy admin_users_select_own
  on admin_users for select
  to authenticated
  using (id = auth.uid());
