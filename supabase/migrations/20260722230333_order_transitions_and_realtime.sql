-- Day 3 — order fulfilment: status transitions enforced server-side (not
-- just the UI), payment status handling, and realtime on the queue.

-- Fulfilment status transitions. Sequential only: requested -> confirmed
-- -> out_for_delivery -> delivered. Cancel is allowed from any
-- non-terminal state. No SECURITY DEFINER — runs as the calling role, so
-- the existing txn_read/txn_staff_update RLS policies remain the actual
-- authorization gate (a non-staff caller simply can't see or update rows
-- outside their own club, same as create_order's approach on Day 2).
create or replace function update_order_status(
  p_transaction_id uuid,
  p_new_status text
)
returns void
language plpgsql
as $$
declare
  v_current_status text;
begin
  select status into v_current_status
  from b2c_transactions
  where id = p_transaction_id;

  if v_current_status is null then
    raise exception 'Order not found';
  end if;

  if not (
    (v_current_status = 'requested' and p_new_status in ('confirmed', 'cancelled')) or
    (v_current_status = 'confirmed' and p_new_status in ('out_for_delivery', 'cancelled')) or
    (v_current_status = 'out_for_delivery' and p_new_status in ('delivered', 'cancelled'))
  ) then
    raise exception 'Invalid status transition from % to %', v_current_status, p_new_status;
  end if;

  update b2c_transactions
  set status = p_new_status,
      confirmed_at = case when p_new_status = 'confirmed' then now() else confirmed_at end,
      dispatched_at = case when p_new_status = 'out_for_delivery' then now() else dispatched_at end,
      delivered_at = case when p_new_status = 'delivered' then now() else delivered_at end
  where id = p_transaction_id;
end;
$$;

grant execute on function update_order_status(uuid, text) to authenticated;

-- Payment status is a separate concern from fulfilment status — no
-- sequencing rules given in the brief, just stamp payment_confirmed_at
-- the first time it's marked paid.
create or replace function update_payment_status(
  p_transaction_id uuid,
  p_payment_status text,
  p_payment_notes text
)
returns void
language plpgsql
as $$
begin
  update b2c_transactions
  set payment_status = p_payment_status,
      payment_notes = p_payment_notes,
      payment_confirmed_at = case
        when p_payment_status = 'paid' and payment_confirmed_at is null then now()
        else payment_confirmed_at
      end
  where id = p_transaction_id;
end;
$$;

grant execute on function update_payment_status(uuid, text, text) to authenticated;

-- Realtime on the order queue — the moment an order appears on the
-- admin screen without a refresh is the point of the whole demo.
alter publication supabase_realtime add table b2c_transactions;
