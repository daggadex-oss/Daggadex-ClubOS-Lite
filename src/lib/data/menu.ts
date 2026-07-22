import { createClient } from "@/lib/supabase/server";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type MenuPricePoint = {
  id: string;
  sell_unit: string;
  sell_quantity: number;
  price_cents: number;
  stock_status: StockStatus;
};

export type MenuProduct = {
  id: string;
  name: string;
  product_type_code: string;
  is_new_drop: boolean;
  is_staff_pick: boolean;
  grade_declared: string | null;
  cultivation: string | null;
  potency_amount: number | null;
  potency_unit: string | null;
  potency_compound: string | null;
  potency_basis: string | null;
  variety: { id: string; name: string; strain_type: string | null } | null;
  brand: { id: string; name: string } | null;
  prices: MenuPricePoint[];
};

export type MenuSection = {
  code: string;
  name: string;
  sortOrder: number;
  products: MenuProduct[];
};

// One query for the whole live menu. 249 products is small enough to
// render server-side in one pass — no pagination needed at this scale.
export async function getMenuSections(clubId: string): Promise<MenuSection[]> {
  const supabase = await createClient();

  const { data: productTypes } = await supabase
    .from("product_types")
    .select("code, name, sort_order")
    .order("sort_order");

  const { data: products } = await supabase
    .from("products")
    .select(
      `id, name, product_type_code, is_new_drop, is_staff_pick,
       grade_declared, cultivation,
       potency_amount, potency_unit, potency_compound, potency_basis,
       variety:varieties(id, name, strain_type),
       brand:brands(id, name),
       prices:product_prices(id, sell_unit, sell_quantity, price_cents, stock_status, active)`,
    )
    .eq("club_id", clubId)
    .eq("active", true)
    .order("name");

  const typesByCode = new Map(
    (productTypes ?? []).map((t) => [t.code, t]),
  );

  const sections = new Map<string, MenuSection>();

  for (const raw of products ?? []) {
    const type = typesByCode.get(raw.product_type_code);
    const activePrices = (raw.prices ?? []).filter(
      (p): p is MenuPricePoint & { active: boolean } => p.active,
    );
    if (activePrices.length === 0) continue;

    const product: MenuProduct = {
      id: raw.id,
      name: raw.name,
      product_type_code: raw.product_type_code,
      is_new_drop: raw.is_new_drop,
      is_staff_pick: raw.is_staff_pick,
      grade_declared: raw.grade_declared,
      cultivation: raw.cultivation,
      potency_amount: raw.potency_amount,
      potency_unit: raw.potency_unit,
      potency_compound: raw.potency_compound,
      potency_basis: raw.potency_basis,
      variety: raw.variety,
      brand: raw.brand,
      prices: activePrices.sort((a, b) => a.sell_quantity - b.sell_quantity),
    };

    const key = raw.product_type_code;
    if (!sections.has(key)) {
      sections.set(key, {
        code: key,
        name: type?.name ?? key,
        sortOrder: type?.sort_order ?? 999,
        products: [],
      });
    }
    sections.get(key)!.products.push(product);
  }

  return [...sections.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getMenuProduct(
  clubId: string,
  productId: string,
): Promise<MenuProduct | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select(
      `id, name, product_type_code, is_new_drop, is_staff_pick,
       grade_declared, cultivation,
       potency_amount, potency_unit, potency_compound, potency_basis,
       variety:varieties(id, name, strain_type),
       brand:brands(id, name),
       prices:product_prices(id, sell_unit, sell_quantity, price_cents, stock_status, active)`,
    )
    .eq("club_id", clubId)
    .eq("id", productId)
    .eq("active", true)
    .maybeSingle();

  if (!data) return null;

  const activePrices = (data.prices ?? []).filter(
    (p): p is MenuPricePoint & { active: boolean } => p.active,
  );

  return {
    id: data.id,
    name: data.name,
    product_type_code: data.product_type_code,
    is_new_drop: data.is_new_drop,
    is_staff_pick: data.is_staff_pick,
    grade_declared: data.grade_declared,
    cultivation: data.cultivation,
    potency_amount: data.potency_amount,
    potency_unit: data.potency_unit,
    potency_compound: data.potency_compound,
    potency_basis: data.potency_basis,
    variety: data.variety,
    brand: data.brand,
    prices: activePrices.sort((a, b) => a.sell_quantity - b.sell_quantity),
  };
}
