-- Phase G — atomic product creation for the new "Add Product" admin form.
--
-- Same rationale as Day 2's create_order(): the Supabase REST client can't
-- wrap two .insert() calls (products, then product_prices) in one DB
-- transaction, and a product with no price points at all would be stuck —
-- the existing product-editor.tsx only edits price_cents/stock_status on
-- rows that already exist, it has no "add a price point" UI. So the parent
-- row and its price points must land together or not at all.
--
-- No SECURITY DEFINER: runs as the calling (authenticated) role, so the
-- existing products_staff_write / prices_staff_write RLS policies remain
-- the actual authorization gate — same approach as every prior RPC this
-- sprint (create_order, update_order_status, update_payment_status).

create or replace function create_product_with_prices(
  p_club_id uuid,
  p_product_type_code text,
  p_name text,
  p_variety_id uuid,
  p_club_tier_id uuid,
  p_cultivation text,
  p_grade_declared text,
  p_potency_amount numeric,
  p_potency_unit text,
  p_potency_compound text,
  p_potency_basis text,
  p_base_unit_price_cents int,
  p_attributes jsonb,
  p_prices jsonb  -- [{"sell_unit": "gram", "sell_quantity": 2, "price_cents": 30000}, ...]
)
returns uuid
language plpgsql
as $$
declare
  v_product_id uuid;
  v_price jsonb;
begin
  if p_prices is null or jsonb_array_length(p_prices) = 0 then
    raise exception 'At least one price point is required';
  end if;

  insert into products (
    club_id, product_type_code, name, variety_id, club_tier_id,
    cultivation, grade_declared,
    potency_amount, potency_unit, potency_compound, potency_basis,
    base_unit_price_cents, attributes
  ) values (
    p_club_id, p_product_type_code, p_name, p_variety_id, p_club_tier_id,
    p_cultivation, p_grade_declared,
    p_potency_amount, p_potency_unit, p_potency_compound, p_potency_basis,
    p_base_unit_price_cents, coalesce(p_attributes, '{}'::jsonb)
  )
  returning id into v_product_id;

  for v_price in select * from jsonb_array_elements(p_prices)
  loop
    insert into product_prices (product_id, sell_unit, sell_quantity, price_cents)
    values (
      v_product_id,
      v_price->>'sell_unit',
      (v_price->>'sell_quantity')::numeric,
      (v_price->>'price_cents')::int
    );
  end loop;

  return v_product_id;
end;
$$;

grant execute on function create_product_with_prices(
  uuid, text, text, uuid, uuid, text, text, numeric, text, text, text, int, jsonb, jsonb
) to authenticated;
