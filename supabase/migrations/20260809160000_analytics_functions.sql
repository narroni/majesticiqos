-- BLUEPRINT §6.4 — server-side aggregation for the admin overview. PostgREST
-- can't express GROUP BY through the JS client, so the grouped queries
-- (daily revenue series, top products, orders by country) are Postgres
-- functions; the simpler single-number stats (pending count, revenue
-- sums, low/out-of-stock counts) are plain filtered selects in
-- src/lib/data/admin-analytics.ts instead — a function isn't needed just to
-- wrap a single WHERE + count.

-- Revenue counts completed orders only (BLUEPRINT §6.4 — pending orders may
-- never confirm), bucketed by completed_at's date, zero-filled for days
-- with no revenue so the chart has no gaps.
create or replace function analytics_revenue_by_day(p_days int)
returns table (day date, revenue_cents bigint)
language sql
stable
as $$
  select
    d.day,
    coalesce(sum(o.total_cents), 0)::bigint as revenue_cents
  from generate_series(
    current_date - (p_days - 1),
    current_date,
    interval '1 day'
  ) as d(day)
  left join orders o
    on o.status = 'completed'
    and o.completed_at::date = d.day::date
  group by d.day
  order by d.day;
$$;

-- Units sold, from completed orders in the trailing window. Uses the
-- order_items snapshot name (product_slug/product_name_en), not a join to
-- the live products table — a since-edited or deleted product must not
-- change historical sales figures, and a deleted product can still be a
-- top seller.
create or replace function analytics_top_products(p_days int, p_limit int)
returns table (product_id uuid, name_en text, slug text, units_sold bigint)
language sql
stable
as $$
  select
    oi.product_id,
    max(oi.product_name_en) as name_en,
    max(oi.product_slug) as slug,
    sum(oi.quantity)::bigint as units_sold
  from order_items oi
  join orders o on o.id = oi.order_id
  where o.status = 'completed'
    and o.completed_at >= now() - (p_days || ' days')::interval
    and oi.product_id is not null
  group by oi.product_id
  order by units_sold desc
  limit p_limit;
$$;

-- All orders regardless of status — this is about where demand comes from,
-- not confirmed revenue.
create or replace function analytics_orders_by_country(p_days int)
returns table (country country_code, order_count bigint)
language sql
stable
as $$
  select o.country, count(*)::bigint as order_count
  from orders o
  where o.created_at >= now() - (p_days || ' days')::interval
  group by o.country
  order by order_count desc;
$$;
