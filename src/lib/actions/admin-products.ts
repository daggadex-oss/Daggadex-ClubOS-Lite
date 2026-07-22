"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success: true } | { error: string };

export async function updatePriceCents(
  priceId: string,
  priceCents: number,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_prices")
    .update({ price_cents: priceCents })
    .eq("id", priceId);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}

export async function updateStockStatus(
  priceId: string,
  stockStatus: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_prices")
    .update({ stock_status: stockStatus })
    .eq("id", priceId);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}

export async function updateProductActive(
  productId: string,
  active: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ active })
    .eq("id", productId);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}
