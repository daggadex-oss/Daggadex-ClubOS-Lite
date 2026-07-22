-- Atomic order submission for the member request flow (Day 2).
--
-- The Supabase REST client can't wrap two .insert() calls in one DB
-- transaction, and b2c_transactions + its b2c_transaction_items rows
-- must land together or not at all. This function does both inserts in
-- a single Postgres transaction and returns the new transaction id.
--
-- The client sends only {product_price_id, quantity} per line — price,
-- unit and product name are looked up here from the live product_prices
-- / products rows, not trusted from the client. This is what makes the
-- snapshot in b2c_transaction_items an actual snapshot "at order time"
-- rather than a possibly-stale client-side cache, and closes the price-
-- tampering gap a client-supplied price would otherwise open.
--
-- No SECURITY DEFINER: this runs as the calling (authenticated) role,
-- so the existing RLS policies (txn_member_insert, txn_items_insert)
-- remain the actual authorization gate. The function's only job is
-- atomicity and server-side pricing, not privilege escalation.

create or replace function create_order(
  p_club_id uuid,
  p_member_id uuid,
  p_delivery_zone text,
  p_delivery_notes text,
  p_items jsonb  -- [{"product_price_id": "...", "quantity": 2}, ...]
)
returns uuid
language plpgsql
as $$
declare
  v_transaction_id uuid;
begin
  if not exists (
    select 1
    from jsonb_array_elements(p_items) as item
    join product_prices pp on pp.id = (item->>'product_price_id')::uuid
    join products p on p.id = pp.product_id
    where p.club_id = p_club_id and pp.active and p.active
  ) then
    raise exception 'No valid items in order';
  end if;

  insert into b2c_transactions (club_id, member_id, delivery_zone, delivery_notes,
                                subtotal_cents, total_cents)
  select p_club_id, p_member_id, p_delivery_zone, p_delivery_notes,
         sum(pp.price_cents * (item->>'quantity')::int),
         sum(pp.price_cents * (item->>'quantity')::int)
  from jsonb_array_elements(p_items) as item
  join product_prices pp on pp.id = (item->>'product_price_id')::uuid
  join products p on p.id = pp.product_id
  where p.club_id = p_club_id and pp.active and p.active
  returning id into v_transaction_id;

  insert into b2c_transaction_items (
    transaction_id, product_price_id, variety_id, product_name,
    sell_unit, sell_quantity, unit_price_cents, quantity, line_total_cents
  )
  select
    v_transaction_id,
    pp.id,
    p.variety_id,
    p.name,
    pp.sell_unit,
    pp.sell_quantity,
    pp.price_cents,
    (item->>'quantity')::int,
    pp.price_cents * (item->>'quantity')::int
  from jsonb_array_elements(p_items) as item
  join product_prices pp on pp.id = (item->>'product_price_id')::uuid
  join products p on p.id = pp.product_id
  where p.club_id = p_club_id and pp.active and p.active;

  return v_transaction_id;
end;
$$;

grant execute on function create_order(uuid, uuid, text, text, jsonb) to authenticated;
