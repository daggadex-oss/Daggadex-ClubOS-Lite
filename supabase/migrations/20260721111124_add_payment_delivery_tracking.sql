-- Add payment confirmation and delivery dispatch tracking to b2c_transactions.
-- All nullable; no indexes yet — query shapes aren't known.

alter table b2c_transactions
  add column payment_notes        text,
  add column payment_confirmed_at timestamptz,
  add column dispatched_at        timestamptz,
  add column courier_reference    text;
