// Types and the select string shared between the server-only data layer
// (admin-orders.ts) and the client component that re-queries individual
// rows on realtime events (order-queue.tsx). Kept separate from
// admin-orders.ts specifically so the client component never pulls in
// that file's `next/headers` import through a supposedly-type-only import.

export type AdminOrderItem = {
  id: string;
  product_name: string;
  sell_unit: string;
  sell_quantity: number;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
};

export type AdminOrder = {
  id: string;
  status: string;
  payment_status: string;
  payment_notes: string | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  delivery_zone: string | null;
  delivery_notes: string | null;
  requested_at: string;
  confirmed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  member: { id: string; alias: string; phone: string | null };
  items: AdminOrderItem[];
};

export const ADMIN_ORDER_SELECT = `
  id, status, payment_status, payment_notes, subtotal_cents, delivery_fee_cents,
  total_cents, delivery_zone, delivery_notes, requested_at, confirmed_at,
  dispatched_at, delivered_at,
  member:members(id, alias, phone),
  items:b2c_transaction_items(id, product_name, sell_unit, sell_quantity,
    unit_price_cents, quantity, line_total_cents)
`;
