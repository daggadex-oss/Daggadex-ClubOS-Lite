-- Fix: price_history has RLS enabled with only a read policy (staff-only)
-- and no insert policy at all. The trigger that populates it
-- (log_price_change(), fires on every product_prices insert/update) runs
-- with the privileges of the invoking role, not elevated privileges — so
-- any authenticated-role write to product_prices (the product editor's
-- price update, or Phase G's create_product_with_prices()) fails with
-- "new row violates row-level security policy for table price_history".
--
-- This predates Phase G: every product_prices row until now was written
-- by seed scripts running as the service role, which bypasses RLS
-- entirely (including the trigger's insert), so it never surfaced. Caught
-- live, for the first time, testing the new Add Product form in a real
-- staff session — the first real end-to-end write this project has ever
-- done through PostgREST/RLS rather than a seed script.
--
-- Fix: mark log_price_change() SECURITY DEFINER, same pattern already
-- used by app_current_club_id()/app_is_staff() to bypass RLS internally
-- for bookkeeping that isn't itself a direct user-facing write path (the
-- trigger only ever fires as a side effect of an update that already
-- passed products_prices' own RLS check). price_history's own read
-- policy (staff-only) is untouched and remains the real access gate for
-- who can query the history.
create or replace function log_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT')
     or (new.price_cents is distinct from old.price_cents) then
    insert into price_history (product_price_id, product_id, price_cents)
    values (new.id, new.product_id, new.price_cents);
  end if;
  return new;
end;
$$;
