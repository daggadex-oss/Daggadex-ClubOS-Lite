"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success: true } | { error: string };

// club_tiers already has full RLS (club_tiers_read / club_tiers_staff_write)
// covering select/insert/update/delete for staff of the club, so this is
// plain single-table CRUD — no RPC needed, unlike create_product_with_prices
// which had to coordinate two tables atomically.

export async function createClubTier(
  clubId: string,
  name: string,
  rank: number,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("club_tiers")
    .insert({ club_id: clubId, name, rank });

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}

export async function updateClubTier(
  tierId: string,
  patch: { name?: string; rank?: number },
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("club_tiers").update(patch).eq("id", tierId);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}

export async function deleteClubTier(tierId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("club_tiers").delete().eq("id", tierId);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}
