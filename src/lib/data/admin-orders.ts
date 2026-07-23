import { createClient } from "@/lib/supabase/server";
import {
  ADMIN_ORDER_SELECT,
  type AdminOrder,
} from "@/lib/data/admin-orders-shared";

export type { AdminOrder, AdminOrderItem } from "@/lib/data/admin-orders-shared";

export async function getAdminOrders(clubId: string): Promise<AdminOrder[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("b2c_transactions")
    .select(ADMIN_ORDER_SELECT)
    .eq("club_id", clubId)
    .order("requested_at", { ascending: false });

  return data ?? [];
}
