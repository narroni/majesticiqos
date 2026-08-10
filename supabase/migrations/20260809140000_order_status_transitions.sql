-- BLUEPRINT §6.3 — server-side-enforced order status transitions.
--
-- Locks the order row (FOR UPDATE) before validating, so two concurrent
-- status changes on the same order can't race past the transition check.
-- The existing orders_set_status_timestamps and orders_increment_sales_count
-- triggers (20260807203700) fire automatically off the plain UPDATE below —
-- this function only adds transition validation and stock restoration on
-- cancellation, symmetric to decrement_stock() at checkout.
--
-- OUT parameters are named out_id/out_status rather than id/status: bare
-- column references elsewhere in the body would otherwise be ambiguous
-- against same-named OUT variables (hit this exact bug in save_product,
-- see 20260809130000).
create or replace function change_order_status(p_order_id uuid, p_new_status order_status)
returns table (out_id uuid, out_status order_status)
language plpgsql
as $$
declare
  v_current_status order_status;
begin
  select orders.status into v_current_status
  from orders
  where orders.id = p_order_id
  for update;

  if v_current_status is null then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if not (
    (v_current_status = 'pending' and p_new_status in ('confirmed', 'cancelled'))
    or (v_current_status = 'confirmed' and p_new_status in ('preparing', 'cancelled'))
    or (v_current_status = 'preparing' and p_new_status in ('shipped', 'cancelled'))
    or (v_current_status = 'shipped' and p_new_status = 'completed')
  ) then
    raise exception 'Cannot transition from % to %', v_current_status, p_new_status
      using errcode = 'P0001';
  end if;

  update orders set status = p_new_status where orders.id = p_order_id;

  if p_new_status = 'cancelled' then
    update products
    set stock_quantity = products.stock_quantity + order_items.quantity
    from order_items
    where order_items.order_id = p_order_id
      and order_items.product_id = products.id
      and products.track_inventory = true;
  end if;

  return query
    select orders.id as out_id, orders.status as out_status
    from orders
    where orders.id = p_order_id;
end;
$$;
