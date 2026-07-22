"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";

export async function submitOrder(
  items: { productPriceId: string; quantity: number }[],
  deliveryNotes: string | null,
): Promise<{ transactionId: string } | { error: string }> {
  const session = await getSessionContext();
  if (!session) {
    return { error: "Not signed in." };
  }
  if (items.length === 0) {
    return { error: "Your basket is empty." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_order", {
    p_club_id: session.club.id,
    p_member_id: session.member.id,
    p_delivery_zone: session.member.delivery_zone ?? "",
    p_delivery_notes: deliveryNotes ?? "",
    p_items: items.map((i) => ({
      product_price_id: i.productPriceId,
      quantity: i.quantity,
    })),
  });

  if (error) {
    return { error: error.message };
  }

  return { transactionId: data as string };
}
