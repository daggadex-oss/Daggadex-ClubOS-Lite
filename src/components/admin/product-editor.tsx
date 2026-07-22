"use client";

import { useMemo, useState } from "react";
import type { AdminProduct } from "@/lib/data/admin-products";
import { sellUnitLabel } from "@/lib/sell-unit";
import {
  updatePriceCents,
  updateStockStatus,
  updateProductActive,
} from "@/lib/actions/admin-products";

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
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter by name…"
        className="w-full max-w-sm rounded-sm border border-sage/30 bg-surface px-3 py-2 text-sm text-cream placeholder:text-sage/70"
      />

      <p className="mt-2 text-xs text-sage">
        {filtered.length} of {products.length} products
      </p>

      <div className="mt-2 space-y-1">
        {filtered.map((product) => (
          <div
            key={product.id}
            className={`rounded-sm border border-sage/20 bg-surface p-3 ${
              product.active ? "" : "opacity-50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-cream">
                {product.name}
              </span>
              <label className="flex items-center gap-1.5 text-xs text-sage">
                <input
                  type="checkbox"
                  checked={product.active}
                  onChange={(e) =>
                    handleActiveToggle(product.id, e.target.checked)
                  }
                />
                Active
              </label>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {product.prices.map((price) => (
                <div key={price.id} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 text-sage">
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
                    className="w-20 rounded-sm border border-sage/30 bg-base px-1.5 py-0.5 text-cream"
                  />
                  <select
                    value={price.stock_status}
                    onChange={(e) =>
                      handleStockChange(product.id, price.id, e.target.value)
                    }
                    className="rounded-sm border border-sage/30 bg-base px-1 py-0.5 text-cream"
                  >
                    <option value="in_stock">In stock</option>
                    <option value="low_stock">Low stock</option>
                    <option value="out_of_stock">Out of stock</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
