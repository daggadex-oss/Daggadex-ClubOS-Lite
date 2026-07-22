"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function transitionOrderStatus(
  transactionId: string,
  newStatus: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_transaction_id: transactionId,
    p_new_status: newStatus,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/orders");
  return { success: true };
}

export async function updatePaymentStatus(
  transactionId: string,
  paymentStatus: string,
  paymentNotes: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_payment_status", {
    p_transaction_id: transactionId,
    p_payment_status: paymentStatus,
    p_payment_notes: paymentNotes,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/orders");
  return { success: true };
}
