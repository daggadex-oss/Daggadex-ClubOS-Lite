"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MenuPricePoint, MenuProduct, MenuSection } from "@/lib/data/menu";
import { formatCents } from "@/lib/money";

type Filter = "all" | "new" | "staff-picks" | string;

function priceRangeLabel(prices: MenuPricePoint[]) {
  if (prices.length === 0) return "";
  const cents = prices.map((p) => p.price_cents);
  const min = Math.min(...cents);
  const max = Math.max(...cents);
  return min === max ? formatCents(min) : `From ${formatCents(min)}`;
}

function ProductCard({ product }: { product: MenuProduct }) {
  const allOut = product.prices.every((p) => p.stock_status === "out_of_stock");
  const anyLow = product.prices.some((p) => p.stock_status === "low_stock");

  return (
    <Link
      href={`/menu/${product.id}`}
      className={`block rounded-sm border border-sage/20 bg-surface p-3 ${allOut ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-cream">{product.name}</p>
          {product.brand && (
            <p className="text-xs text-sage">{product.brand.name}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {product.is_new_drop && (
            <span className="rounded-sm bg-gold px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-base">
              New
            </span>
          )}
          {product.is_staff_pick && (
            <span className="rounded-sm bg-olive px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cream">
              Staff Pick
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-cream">{priceRangeLabel(product.prices)}</span>
        {allOut ? (
          <span className="text-xs text-sage">Out of stock</span>
        ) : anyLow ? (
          <span className="text-xs text-gold">Low stock</span>
        ) : null}
      </div>
    </Link>
  );
}

export function MenuBrowser({ sections }: { sections: MenuSection[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filteredSections = useMemo(() => {
    if (filter === "all") return sections;

    if (filter === "new" || filter === "staff-picks") {
      const key = filter === "new" ? "is_new_drop" : "is_staff_pick";
      return sections
        .map((s) => ({
          ...s,
          products: s.products.filter((p) => p[key]),
        }))
        .filter((s) => s.products.length > 0);
    }

    return sections.filter((s) => s.code === filter);
  }, [sections, filter]);

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "new", label: "New Drops" },
    { key: "staff-picks", label: "Staff Picks" },
    ...sections.map((s) => ({ key: s.code, label: s.name })),
  ];

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto border-b border-sage/20 px-4 py-3">
        {chips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setFilter(chip.key)}
            className={`shrink-0 rounded-sm px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
              filter === chip.key
                ? "bg-gold text-base"
                : "bg-surface text-sage"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {filteredSections.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-sage">
          Nothing here yet — check back soon.
        </p>
      ) : (
        filteredSections.map((section) => (
          <div key={section.code} className="px-4 py-4">
            <h2 className="font-display text-lg uppercase tracking-tight text-cream">
              {section.name}
            </h2>
            <div className="mt-3 space-y-2">
              {section.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
