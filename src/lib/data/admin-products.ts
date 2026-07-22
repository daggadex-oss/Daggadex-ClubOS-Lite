import { createClient } from "@/lib/supabase/server";

export type AdminProductPrice = {
  id: string;
  sell_unit: string;
  sell_quantity: number;
  price_cents: number;
  stock_status: string;
};

export type AdminProduct = {
  id: string;
  name: string;
  active: boolean;
  prices: AdminProductPrice[];
};

export async function getAdminProducts(clubId: string): Promise<AdminProduct[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select(
      `id, name, active,
       prices:product_prices(id, sell_unit, sell_quantity, price_cents, stock_status)`,
    )
    .eq("club_id", clubId)
    .order("name");

  return data ?? [];
}
