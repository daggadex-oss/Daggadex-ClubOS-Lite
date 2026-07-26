"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

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

// --- Add Product (Phase G) ---------------------------------------------------

export type CreateProductPricePoint = {
  sellUnit: string;
  sellQuantity: number;
  priceCents: number;
};

export type CreateProductInput = {
  clubId: string;
  productTypeCode: string;
  name: string;
  varietyId: string | null;
  clubTierId: string | null;
  cultivation: string | null;
  gradeDeclared: string | null;
  potencyAmount: number | null;
  potencyUnit: string | null;
  potencyCompound: string | null;
  potencyBasis: string | null;
  baseUnitPriceCents: number | null;
  attributes: Record<string, string | number | boolean | string[]>;
  prices: CreateProductPricePoint[];
};

type CreateProductResult = { success: true; productId: string } | { error: string };

// Every optional param below (variety_id, club_tier_id, cultivation,
// grade_declared, the potency_* fields, base_unit_price_cents) is genuinely
// nullable in the Postgres function signature — but `supabase gen types`
// generates plpgsql function args as non-nullable regardless of the actual
// signature (the same gap Day 2's create_order() call hit for its two text
// params). Unlike Day 2, "" isn't a valid stand-in here: an empty string
// would fail the `cultivation` CHECK constraint outright and fail uuid/
// numeric parsing for the rest. So this passes real `null` and overrides
// the incorrect generated type via `unknown`, rather than papering over it
// with a placeholder value that would corrupt the insert.
type CreateProductWithPricesArgs = {
  p_club_id: string;
  p_product_type_code: string;
  p_name: string;
  p_variety_id: string | null;
  p_club_tier_id: string | null;
  p_cultivation: string | null;
  p_grade_declared: string | null;
  p_potency_amount: number | null;
  p_potency_unit: string | null;
  p_potency_compound: string | null;
  p_potency_basis: string | null;
  p_base_unit_price_cents: number | null;
  p_attributes: Database["public"]["Functions"]["create_product_with_prices"]["Args"]["p_attributes"];
  p_prices: Database["public"]["Functions"]["create_product_with_prices"]["Args"]["p_prices"];
};

// Calls create_product_with_prices() (Phase G migration) rather than two
// separate .insert() calls — same reason as submitOrder()/create_order():
// the product row and its price points must land together, and this
// table's existing editor has no way to add a price point after the fact.
export async function createProduct(input: CreateProductInput): Promise<CreateProductResult> {
  const supabase = await createClient();

  const args: CreateProductWithPricesArgs = {
    p_club_id: input.clubId,
    p_product_type_code: input.productTypeCode,
    p_name: input.name,
    p_variety_id: input.varietyId,
    p_club_tier_id: input.clubTierId,
    p_cultivation: input.cultivation,
    p_grade_declared: input.gradeDeclared,
    p_potency_amount: input.potencyAmount,
    p_potency_unit: input.potencyUnit,
    p_potency_compound: input.potencyCompound,
    p_potency_basis: input.potencyBasis,
    p_base_unit_price_cents: input.baseUnitPriceCents,
    p_attributes: input.attributes,
    p_prices: input.prices.map((p) => ({
      sell_unit: p.sellUnit,
      sell_quantity: p.sellQuantity,
      price_cents: p.priceCents,
    })),
  };

  const { data, error } = await supabase.rpc(
    "create_product_with_prices",
    args as unknown as Database["public"]["Functions"]["create_product_with_prices"]["Args"],
  );

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return { success: true, productId: data };
}
