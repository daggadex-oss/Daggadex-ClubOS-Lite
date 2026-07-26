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

// --- Paged/banded shape for the carousel menu ------------------------------
//
// A "page" is a product_type, split further by cultivation for the three
// types where cultivation actually varies (flower, moonstick, preroll —
// confirmed live). A "band" within a page groups strains sharing the same
// grade_declared — confirmed live to already produce exactly this grouping
// (e.g. real "Legendary Indoor" vs "Legendary Indoor Special" both under
// cultivation=indoor) with zero schema change.

const CULTIVATION_SPLIT_TYPES = new Set(["flower", "moonstick", "preroll"]);

const CULTIVATION_LABEL: Record<string, string> = {
  indoor: "Indoor",
  light_assisted_greenhouse: "Light Assisted Greenhouse",
  greenhouse: "Greenhouse",
  outdoor: "Outdoor",
};

export type LadderTier = {
  sellUnit: string;
  sellQuantity: number;
  representativePriceCents: number;
};

export type MenuStrainOffer = {
  productPriceId: string;
  priceCents: number;
  stockStatus: StockStatus;
};

export type MenuStrain = {
  productId: string;
  name: string;
  strainType: string | null;
  isNewDrop: boolean;
  // keyed by `${sellUnit}:${sellQuantity}` — a strain may not have an
  // offer at every tier in its band's ladder (confirmed live: real ladder
  // shapes aren't always uniform within a grade_declared group).
  offersByLadderKey: Record<string, MenuStrainOffer>;
};

export type MenuBand = {
  key: string;
  label: string | null;
  ladder: LadderTier[];
  strains: MenuStrain[];
};

export type MenuPage = {
  key: string;
  title: string;
  sortOrder: number;
  bands: MenuBand[];
};

function ladderKey(sellUnit: string, sellQuantity: number): string {
  return `${sellUnit}:${sellQuantity}`;
}

export async function getMenuPages(clubId: string): Promise<MenuPage[]> {
  const supabase = await createClient();

  const { data: productTypes } = await supabase
    .from("product_types")
    .select("code, name, sort_order")
    .order("sort_order");

  const { data: products } = await supabase
    .from("products")
    .select(
      `id, name, product_type_code, is_new_drop, cultivation, grade_declared,
       variety:varieties(strain_type),
       prices:product_prices(id, sell_unit, sell_quantity, price_cents, stock_status, active)`,
    )
    .eq("club_id", clubId)
    .eq("active", true)
    .order("name");

  const typesByCode = new Map((productTypes ?? []).map((t) => [t.code, t]));

  type PageBucket = {
    title: string;
    sortOrder: number;
    bands: Map<string, MenuBand>;
  };
  const pages = new Map<string, PageBucket>();

  for (const raw of (products ?? []) as unknown as Array<{
    id: string;
    name: string;
    product_type_code: string;
    is_new_drop: boolean;
    cultivation: string | null;
    grade_declared: string | null;
    variety: { strain_type: string | null } | null;
    prices: Array<{
      id: string;
      sell_unit: string;
      sell_quantity: number;
      price_cents: number;
      stock_status: StockStatus;
      active: boolean;
    }>;
  }>) {
    const activePrices = (raw.prices ?? []).filter((p) => p.active);
    if (activePrices.length === 0) continue;

    const type = typesByCode.get(raw.product_type_code);
    const typeName = type?.name ?? raw.product_type_code;
    const splitsByCultivation = CULTIVATION_SPLIT_TYPES.has(raw.product_type_code);

    const pageKey =
      splitsByCultivation && raw.cultivation
        ? `${raw.product_type_code}:${raw.cultivation}`
        : raw.product_type_code;
    const pageTitle =
      splitsByCultivation && raw.cultivation
        ? `${CULTIVATION_LABEL[raw.cultivation] ?? raw.cultivation} ${typeName}`
        : typeName;

    if (!pages.has(pageKey)) {
      pages.set(pageKey, {
        title: pageTitle,
        sortOrder: type?.sort_order ?? 999,
        bands: new Map(),
      });
    }
    const page = pages.get(pageKey)!;

    const bandKey = raw.grade_declared ?? "__default__";
    if (!page.bands.has(bandKey)) {
      page.bands.set(bandKey, {
        key: bandKey,
        label: raw.grade_declared,
        ladder: [],
        strains: [],
      });
    }
    const band = page.bands.get(bandKey)!;

    const offersByLadderKey: Record<string, MenuStrainOffer> = {};
    for (const price of activePrices) {
      offersByLadderKey[ladderKey(price.sell_unit, price.sell_quantity)] = {
        productPriceId: price.id,
        priceCents: price.price_cents,
        stockStatus: price.stock_status,
      };
    }

    band.strains.push({
      productId: raw.id,
      name: raw.name,
      strainType: raw.variety?.strain_type ?? null,
      isNewDrop: raw.is_new_drop,
      offersByLadderKey,
    });
  }

  // Build each band's ladder: union of distinct (sell_unit, sell_quantity)
  // pairs across the band, sorted by quantity. The representative price per
  // tier is the mode across strains offering it — confirmed live that this
  // isn't always perfectly uniform (e.g. "Legendary Indoor Special" has two
  // different prices at its 10g tier), so this is a best-effort display
  // value only. The actual basket line always uses the specific strain's
  // own real productPriceId/priceCents — never this aggregate.
  for (const page of pages.values()) {
    for (const band of page.bands.values()) {
      const tierStats = new Map<
        string,
        { sellUnit: string; sellQuantity: number; priceCounts: Map<number, number> }
      >();

      for (const strain of band.strains) {
        for (const [key, offer] of Object.entries(strain.offersByLadderKey)) {
          if (!tierStats.has(key)) {
            const [sellUnit, qtyStr] = key.split(":");
            tierStats.set(key, {
              sellUnit,
              sellQuantity: parseFloat(qtyStr),
              priceCounts: new Map(),
            });
          }
          const stats = tierStats.get(key)!;
          stats.priceCounts.set(
            offer.priceCents,
            (stats.priceCounts.get(offer.priceCents) ?? 0) + 1,
          );
        }
      }

      band.ladder = [...tierStats.values()]
        .map((stats) => {
          let bestPrice = 0;
          let bestCount = -1;
          for (const [price, count] of stats.priceCounts) {
            if (count > bestCount) {
              bestPrice = price;
              bestCount = count;
            }
          }
          return {
            sellUnit: stats.sellUnit,
            sellQuantity: stats.sellQuantity,
            representativePriceCents: bestPrice,
          };
        })
        .sort((a, b) => a.sellQuantity - b.sellQuantity);
    }
  }

  return [...pages.entries()]
    .map(([key, page]) => ({
      key,
      title: page.title,
      sortOrder: page.sortOrder,
      bands: [...page.bands.values()],
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
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
