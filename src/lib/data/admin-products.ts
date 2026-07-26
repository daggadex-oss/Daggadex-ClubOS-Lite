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
  product_type: { name: string } | null;
  variety: { name: string } | null;
  club_tier: { name: string } | null;
  prices: AdminProductPrice[];
};

export async function getAdminProducts(clubId: string): Promise<AdminProduct[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select(
      `id, name, active,
       product_type:product_types(name),
       variety:varieties(name),
       club_tier:club_tiers(name),
       prices:product_prices(id, sell_unit, sell_quantity, price_cents, stock_status)`,
    )
    .eq("club_id", clubId)
    .order("name");

  return (data ?? []) as unknown as AdminProduct[];
}

// --- Options for the schema-driven "Add Product" form (Phase G) -------------

export type ProductTypeOption = { code: string; name: string; sort_order: number };
export type VarietyOption = { id: string; name: string; strain_type: string | null };
export type ClubTierOption = { id: string; name: string; rank: number };

export type AttributeSchemaOption = {
  id: string;
  product_type_code: string;
  attribute_key: string;
  label: string;
  input_type: string;
  options: string[] | null;
  sort_order: number;
};

export type ProductFormOptions = {
  productTypes: ProductTypeOption[];
  varieties: VarietyOption[];
  clubTiers: ClubTierOption[];
  attributeSchemas: AttributeSchemaOption[];
};

// options is jsonb (a plain string array for every schema row seeded so
// far); narrowed here rather than trusting the generated Json type as-is.
function asStringArray(value: unknown): string[] | null {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : null;
}

export async function getProductFormOptions(clubId: string): Promise<ProductFormOptions> {
  const supabase = await createClient();

  const [productTypesRes, varietiesRes, clubTiersRes, attributeSchemasRes] = await Promise.all([
    supabase.from("product_types").select("code, name, sort_order").order("sort_order"),
    supabase.from("varieties").select("id, name, strain_type").order("name"),
    supabase.from("club_tiers").select("id, name, rank").eq("club_id", clubId).order("rank"),
    supabase
      .from("product_type_attribute_schemas")
      .select("id, product_type_code, attribute_key, label, input_type, options, sort_order")
      .order("sort_order"),
  ]);

  return {
    productTypes: productTypesRes.data ?? [],
    varieties: varietiesRes.data ?? [],
    clubTiers: clubTiersRes.data ?? [],
    attributeSchemas: (attributeSchemasRes.data ?? []).map((row) => ({
      ...row,
      options: asStringArray(row.options),
    })),
  };
}
