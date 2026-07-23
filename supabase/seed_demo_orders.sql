-- =============================================================================
-- DAGGADEX CLUBOS — DEMO ORDER HISTORY SEED (Day 4)
-- ~60 days of plausible historical orders so the dashboard has something
-- to show. Idempotent: re-running deletes and regenerates only its own
-- tagged data (delivery_notes = 'seed:demo_orders', members named
-- "Demo Member NN"), never touches real member accounts or real orders.
--
-- Creates 18 fictional members (no auth.users row, no login — pure demo
-- data, same invite-before-signup shape as a real pending member) and
-- distributes orders across the last 60 days, weighted busier on
-- Fri/Sat, with a handful of "regular" members ordering more often than
-- others so repeat-member share is a meaningful number, not 0% or 100%.
--
-- DESTRUCTIVE, but scoped: only rows this script itself created on a
-- previous run are removed before regenerating.
-- =============================================================================

begin;

create temp table target_club as
select id as club_id from clubs where slug = 'demo-club';

do $$
begin
  if not exists (select 1 from target_club) then
    raise exception 'No club found with that slug. Run pnpm bootstrap first, or edit the slug in this script.';
  end if;
end $$;

-- Clean up any previous run's demo data (cascades to items via FK).
delete from b2c_transactions
where club_id = (select club_id from target_club)
  and delivery_notes = 'seed:demo_orders';

delete from members
where club_id = (select club_id from target_club)
  and alias like 'Demo Member %';

-- =============================================================================
-- 1. DEMO MEMBERS
-- =============================================================================

insert into members (club_id, alias, phone, role, status, delivery_zone, terms_accepted_at)
select
  (select club_id from target_club),
  'Demo Member ' || lpad(n::text, 2, '0'),
  '+27' || (820000000 + n)::text,
  'member',
  'active',
  (array['Sea Point','Green Point','Camps Bay','Observatory','Woodstock',
         'City Bowl','Gardens','Vredehoek'])[1 + (n % 8)],
  now() - (random() * interval '120 days')
from generate_series(1, 18) as n;

-- =============================================================================
-- 2. ORDERS — one PL/pgSQL block, 60 days back to yesterday.
-- =============================================================================

do $$
declare
  v_club_id      uuid;
  v_member_ids   uuid[];
  v_price_ids    uuid[];
  v_day          date;
  v_orders_today int;
  v_i            int;
  v_member_id    uuid;
  v_txn_id       uuid;
  v_num_items    int;
  v_requested_at timestamptz;
  v_confirmed_at timestamptz;
  v_dispatched_at timestamptz;
  v_delivered_at timestamptz;
  v_subtotal     int;
  v_status       text;
  v_payment_status text;
  v_j            int;
  v_price_id     uuid;
  v_price_cents  int;
  v_qty          int;
  v_regulars     int;
begin
  select id into v_club_id from clubs where slug = 'demo-club';

  select array_agg(id order by alias) into v_member_ids
  from members where club_id = v_club_id and alias like 'Demo Member %';

  select array_agg(pp.id) into v_price_ids
  from product_prices pp
  join products p on p.id = pp.product_id
  where p.club_id = v_club_id and pp.active and p.active;

  -- first third of the member list are "regulars" — weighted to order
  -- more often, so repeat-member share is meaningful rather than trivial.
  v_regulars := greatest(1, array_length(v_member_ids, 1) / 3);

  for v_day in
    select generate_series(current_date - 60, current_date - 1, interval '1 day')::date
  loop
    v_orders_today := (
      random() * (case when extract(dow from v_day) in (5, 6) then 8 else 5 end)
    )::int;

    for v_i in 1..v_orders_today loop
      if random() < 0.6 then
        v_member_id := v_member_ids[1 + (random() * (v_regulars - 1))::int];
      else
        v_member_id := v_member_ids[1 + (random() * (array_length(v_member_ids, 1) - 1))::int];
      end if;

      v_requested_at := v_day + interval '10 hours' + (random() * interval '10 hours');
      v_num_items := 1 + (random() * 3)::int;
      v_txn_id := gen_random_uuid();

      if v_day >= current_date - 2 and random() < 0.3 then
        v_status := (array['requested', 'confirmed', 'out_for_delivery'])[1 + (random() * 2)::int];
      elsif random() < 0.05 then
        v_status := 'cancelled';
      else
        v_status := 'delivered';
      end if;

      v_confirmed_at := null;
      v_dispatched_at := null;
      v_delivered_at := null;

      if v_status in ('confirmed', 'out_for_delivery', 'delivered') then
        v_confirmed_at := v_requested_at + interval '5 minutes' + (random() * interval '20 minutes');
      end if;
      if v_status in ('out_for_delivery', 'delivered') then
        v_dispatched_at := v_confirmed_at + interval '10 minutes' + (random() * interval '30 minutes');
      end if;
      if v_status = 'delivered' then
        v_delivered_at := v_dispatched_at + interval '15 minutes' + (random() * interval '40 minutes');
      end if;

      if v_status = 'delivered' then
        v_payment_status := case when random() < 0.9 then 'paid' else 'eft_pending' end;
      elsif v_status = 'cancelled' then
        v_payment_status := 'unpaid';
      else
        v_payment_status := case when random() < 0.4 then 'paid' else 'unpaid' end;
      end if;

      insert into b2c_transactions (
        id, club_id, member_id, status, payment_status,
        subtotal_cents, delivery_fee_cents, total_cents,
        delivery_zone, delivery_notes,
        requested_at, confirmed_at, dispatched_at, delivered_at,
        payment_confirmed_at
      )
      select
        v_txn_id, v_club_id, v_member_id, v_status, v_payment_status,
        0, 0, 0,
        m.delivery_zone, 'seed:demo_orders',
        v_requested_at, v_confirmed_at, v_dispatched_at, v_delivered_at,
        case when v_payment_status = 'paid'
          then coalesce(v_delivered_at, v_requested_at)
          else null
        end
      from members m where m.id = v_member_id;

      v_subtotal := 0;

      for v_j in 1..v_num_items loop
        v_price_id := v_price_ids[1 + (random() * (array_length(v_price_ids, 1) - 1))::int];
        select price_cents into v_price_cents from product_prices where id = v_price_id;
        v_qty := 1 + (random() * 2)::int;

        insert into b2c_transaction_items (
          transaction_id, product_price_id, variety_id, product_name,
          sell_unit, sell_quantity, unit_price_cents, quantity, line_total_cents
        )
        select
          v_txn_id, pp.id, p.variety_id, p.name, pp.sell_unit, pp.sell_quantity,
          pp.price_cents, v_qty, pp.price_cents * v_qty
        from product_prices pp
        join products p on p.id = pp.product_id
        where pp.id = v_price_id;

        v_subtotal := v_subtotal + v_price_cents * v_qty;
      end loop;

      update b2c_transactions
      set subtotal_cents = v_subtotal, total_cents = v_subtotal
      where id = v_txn_id;
    end loop;
  end loop;
end $$;

-- =============================================================================
-- 3. VERIFY
-- =============================================================================

select
  count(*) as total_orders,
  count(*) filter (where status = 'delivered') as delivered,
  count(*) filter (where status = 'cancelled') as cancelled,
  count(*) filter (where status in ('requested','confirmed','out_for_delivery')) as active,
  count(distinct member_id) as members_with_orders,
  sum(total_cents) filter (where status = 'delivered') as delivered_revenue_cents,
  min(requested_at)::date as earliest,
  max(requested_at)::date as latest
from b2c_transactions
where club_id = (select club_id from target_club)
  and delivery_notes = 'seed:demo_orders';

commit;
