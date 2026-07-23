import { createClient } from "@/lib/supabase/server";

export type OrderItem = {
  id: string;
  product_name: string;
  sell_unit: string;
  sell_quantity: number;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
};

export type Order = {
  id: string;
  status: string;
  payment_status: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  delivery_zone: string | null;
  requested_at: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  items: OrderItem[];
};

export async function getMemberOrders(memberId: string): Promise<Order[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("b2c_transactions")
    .select(
      `id, status, payment_status, subtotal_cents, delivery_fee_cents, total_cents,
       delivery_zone, requested_at, confirmed_at, delivered_at,
       items:b2c_transaction_items(id, product_name, sell_unit, sell_quantity,
         unit_price_cents, quantity, line_total_cents)`,
    )
    .eq("member_id", memberId)
    .order("requested_at", { ascending: false });

  return data ?? [];
}
