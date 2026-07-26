"use client";

import { useMemo, useState } from "react";
import type { AdminProduct } from "@/lib/data/admin-products";
import { sellUnitLabel } from "@/lib/sell-unit";
import {
  updatePriceCents,
  updateStockStatus,
  updateProductActive,
} from "@/lib/actions/admin-products";

const STOCK_LABEL: Record<string, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

// Matches docs/design-tokens.md's documented Stock states table exactly:
// in stock = normal, low stock = gold label, out of stock = reduced opacity
// (not a colour) — the same treatment the member-facing menu already uses.
function stockClass(status: string): string {
  if (status === "low_stock") return "text-gold";
  if (status === "out_of_stock") return "text-sage opacity-50";
  return "text-sage";
}

export function ProductEditor({
  initialProducts,
}: {
  initialProducts: AdminProduct[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  async function handleActiveToggle(productId: string, active: boolean) {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, active } : p)),
    );
    const result = await updateProductActive(productId, active);
    if ("error" in result) alert(result.error);
  }

  async function handlePriceChange(
    productId: string,
    priceId: string,
    cents: number,
  ) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              prices: p.prices.map((pr) =>
                pr.id === priceId ? { ...pr, price_cents: cents } : pr,
              ),
            }
          : p,
      ),
    );
    const result = await updatePriceCents(priceId, cents);
    if ("error" in result) alert(result.error);
  }

  async function handleStockChange(
    productId: string,
    priceId: string,
    status: string,
  ) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              prices: p.prices.map((pr) =>
                pr.id === priceId ? { ...pr, stock_status: status } : pr,
              ),
            }
          : p,
      ),
    );
    const result = await updateStockStatus(priceId, status);
    if ("error" in result) alert(result.error);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name…"
          className="w-full max-w-sm rounded-sm border-none bg-base px-3 py-2 text-sm text-cream placeholder:text-sage/50 focus:outline-none focus:ring-1 focus:ring-gold"
        />
        <p className="shrink-0 text-xs text-sage">
          {filtered.length} of {products.length} products
        </p>
      </div>

      <div className="mt-3 overflow-x-auto rounded-sm border border-sage/20">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="border-b border-sage/20 bg-base">
            <tr>
              <th className="px-4 py-3 font-display text-[11px] uppercase tracking-wide text-sage">
                Name
              </th>
              <th className="px-4 py-3 font-display text-[11px] uppercase tracking-wide text-sage">
                Strain
              </th>
              <th className="px-4 py-3 font-display text-[11px] uppercase tracking-wide text-sage">
                Type
              </th>
              <th className="px-4 py-3 font-display text-[11px] uppercase tracking-wide text-sage">
                Tier
              </th>
              <th className="px-4 py-3 font-display text-[11px] uppercase tracking-wide text-sage">
                Price points
              </th>
              <th className="px-4 py-3 font-display text-[11px] uppercase tracking-wide text-sage">
                Active
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage/10">
            {filtered.map((product) => (
              <tr
                key={product.id}
                className={`bg-surface align-top hover:bg-surface/70 ${
                  product.active ? "" : "opacity-50"
                }`}
              >
                <td className="px-4 py-3 text-sm font-medium text-cream">
                  {product.name}
                </td>
                <td className="px-4 py-3 text-sm text-sage">
                  {product.variety?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {product.product_type?.name && (
                    <span className="rounded-sm border border-sage/40 px-2 py-0.5 text-[10px] font-bold uppercase text-sage">
                      {product.product_type.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gold">
                  {product.club_tier?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1.5">
                    {product.prices.map((price) => (
                      <div key={price.id} className="flex items-center gap-2 text-xs">
                        <span className="w-14 shrink-0 text-sage">
                          {sellUnitLabel(price.sell_unit, price.sell_quantity)}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={(price.price_cents / 100).toFixed(2)}
                          onBlur={(e) => {
                            const rand = parseFloat(e.target.value);
                            if (!Number.isNaN(rand)) {
                              handlePriceChange(
                                product.id,
                                price.id,
                                Math.round(rand * 100),
                              );
                            }
                          }}
                          className="w-20 rounded-sm border-none bg-base px-1.5 py-1 text-cream focus:outline-none focus:ring-1 focus:ring-gold"
                        />
                        <select
                          value={price.stock_status}
                          onChange={(e) =>
                            handleStockChange(product.id, price.id, e.target.value)
                          }
                          className={`rounded-sm border-none bg-base px-1 py-1 ${stockClass(
                            price.stock_status,
                          )}`}
                        >
                          {Object.entries(STOCK_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={product.active}
                    onChange={(e) => handleActiveToggle(product.id, e.target.checked)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
