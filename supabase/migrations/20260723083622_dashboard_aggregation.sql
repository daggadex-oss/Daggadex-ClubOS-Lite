-- Day 4 — dashboard aggregation, done in Postgres per the brief, not
-- pulled raw and crunched in JavaScript.

-- Fix v_price_intelligence: its `tier` column reads products.tier,
-- which the catalogue seed never populated — grade_declared and
-- cultivation carry that information instead (added in the Day 0
-- migration, after v_price_intelligence was already defined). Fall
-- back through cultivation then grade_declared so "price per gram by
-- tier" has something real to group by, instead of one all-null bucket.
create or replace view v_price_intelligence as
select
  p.club_id,
  pt.name as product_type,
  coalesce(p.tier, p.cultivation, p.grade_declared) as tier,
  v.name as strain,
  p.name as product_name,
  pp.sell_unit,
  pp.sell_quantity,
  pp.price_cents,
  round(pp.price_cents::numeric / pp.sell_quantity, 2) as price_per_unit_cents,
  pp.stock_status
from product_prices pp
join products p on p.id = pp.product_id
join product_types pt on pt.code = p.product_type_code
left join varieties v on v.id = p.variety_id
where p.active and pp.active;

-- Headline cards: current vs previous period, so each card can show a
-- delta. No SECURITY DEFINER on any function below — RLS on the
-- underlying tables (txn_read etc.) still applies to the calling role,
-- so a non-staff caller would only ever aggregate over their own rows,
-- never leak other members' data, even though the app's own middleware
-- already keeps non-staff off /admin/* as the primary gate.
create or replace function get_dashboard_summary(p_club_id uuid, p_period_days int default 30)
returns table (
  current_revenue_cents numeric,
  previous_revenue_cents numeric,
  current_orders bigint,
  previous_orders bigint,
  current_avg_basket_cents numeric,
  previous_avg_basket_cents numeric,
  current_repeat_share numeric,
  previous_repeat_share numeric
)
language sql
stable
as $$
  with current_period as (
    select * from b2c_transactions
    where club_id = p_club_id and status = 'delivered'
      and requested_at >= now() - (p_period_days || ' days')::interval
  ),
  previous_period as (
    select * from b2c_transactions
    where club_id = p_club_id and status = 'delivered'
      and requested_at >= now() - (p_period_days * 2 || ' days')::interval
      and requested_at < now() - (p_period_days || ' days')::interval
  ),
  current_repeat as (
    select count(*) filter (where cnt > 1)::numeric / nullif(count(*), 0) as share
    from (select member_id, count(*) as cnt from current_period group by member_id) sub
  ),
  previous_repeat as (
    select count(*) filter (where cnt > 1)::numeric / nullif(count(*), 0) as share
    from (select member_id, count(*) as cnt from previous_period group by member_id) sub
  )
  select
    coalesce((select sum(total_cents) from current_period), 0),
    coalesce((select sum(total_cents) from previous_period), 0),
    (select count(*) from current_period),
    (select count(*) from previous_period),
    coalesce((select avg(total_cents) from current_period), 0),
    coalesce((select avg(total_cents) from previous_period), 0),
    coalesce((select share from current_repeat), 0),
    coalesce((select share from previous_repeat), 0);
$$;

grant execute on function get_dashboard_summary(uuid, int) to authenticated;

create or replace function get_orders_per_day(p_club_id uuid, p_days int default 30)
returns table (day date, orders bigint, revenue_cents numeric)
language sql
stable
as $$
  select requested_at::date, count(*), sum(total_cents)
  from b2c_transactions
  where club_id = p_club_id and status = 'delivered'
    and requested_at >= now() - (p_days || ' days')::interval
  group by 1
  order by 1;
$$;

grant execute on function get_orders_per_day(uuid, int) to authenticated;

create or replace function get_top_products(p_club_id uuid, p_days int default 30, p_limit int default 10)
returns table (product_name text, revenue_cents numeric, units bigint)
language sql
stable
as $$
  select i.product_name, sum(i.line_total_cents), sum(i.quantity)
  from b2c_transaction_items i
  join b2c_transactions t on t.id = i.transaction_id
  where t.club_id = p_club_id and t.status = 'delivered'
    and t.requested_at >= now() - (p_days || ' days')::interval
  group by 1
  order by 2 desc
  limit p_limit;
$$;

grant execute on function get_top_products(uuid, int, int) to authenticated;

create or replace function get_category_split(p_club_id uuid, p_days int default 30)
returns table (substance_class text, revenue_cents numeric, orders bigint)
language sql
stable
as $$
  select pt.substance_class, sum(i.line_total_cents), count(distinct t.id)
  from b2c_transaction_items i
  join b2c_transactions t on t.id = i.transaction_id
  join product_prices pp on pp.id = i.product_price_id
  join products p on p.id = pp.product_id
  join product_types pt on pt.code = p.product_type_code
  where t.club_id = p_club_id and t.status = 'delivered'
    and t.requested_at >= now() - (p_days || ' days')::interval
  group by 1
  order by 2 desc;
$$;

grant execute on function get_category_split(uuid, int) to authenticated;

-- Scoped to Flower specifically: "tier" here means cultivation grade
-- (indoor/light_assisted_greenhouse/greenhouse/outdoor). Without this
-- filter, gram-priced concentrates (crumble, budder, hash rosin...)
-- surface their grade_declared label through the same coalesce'd tier
-- column, mixing cultivation tiers with unrelated product-form labels
-- under one confusing bucket - caught by testing this against the
-- seeded data before any UI was built on it.
create or replace function get_price_per_gram_by_tier(p_club_id uuid)
returns table (tier text, avg_price_per_gram_cents numeric, product_count bigint)
language sql
stable
as $$
  select tier, avg(price_per_unit_cents), count(*)
  from v_price_intelligence
  where club_id = p_club_id and sell_unit = 'gram' and tier is not null
    and product_type = 'Flower'
  group by 1
  order by 2 desc;
$$;

grant execute on function get_price_per_gram_by_tier(uuid) to authenticated;

-- Order timing heatmap (hour x day-of-week) — cut-if-late per the brief,
-- built anyway since it's cheap given the pattern above.
create or replace function get_order_timing_heatmap(p_club_id uuid, p_days int default 60)
returns table (day_of_week int, hour_of_day int, orders bigint)
language sql
stable
as $$
  select extract(dow from requested_at)::int, extract(hour from requested_at)::int, count(*)
  from b2c_transactions
  where club_id = p_club_id and status = 'delivered'
    and requested_at >= now() - (p_days || ' days')::interval
  group by 1, 2
  order by 1, 2;
$$;

grant execute on function get_order_timing_heatmap(uuid, int) to authenticated;
