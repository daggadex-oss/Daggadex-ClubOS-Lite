"use client";

import { useState } from "react";
import Link from "next/link";
import type { MenuProduct } from "@/lib/data/menu";
import { sellUnitLabel, potencyLabel } from "@/lib/sell-unit";
import { formatCents } from "@/lib/money";
import { useBasket } from "@/lib/basket-context";
import { Button } from "@/components/ui/button";

const STRAIN_TYPE_LABEL: Record<string, string> = {
  indica: "Indica",
  sativa: "Sativa",
  hybrid: "Hybrid",
  unknown: "Unknown",
};

export function ProductDetail({ product }: { product: MenuProduct }) {
  const { addLine, lines } = useBasket();
  const [selectedPriceId, setSelectedPriceId] = useState(
    product.prices.find((p) => p.stock_status !== "out_of_stock")?.id ??
      product.prices[0]?.id,
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selectedPrice = product.prices.find((p) => p.id === selectedPriceId);
  const potency = potencyLabel(product);
  const existingLine = lines.find((l) => l.productPriceId === selectedPriceId);

  function handleAdd() {
    if (!selectedPrice) return;
    addLine(
      {
        productPriceId: selectedPrice.id,
        productId: product.id,
        productName: product.name,
        sellUnit: selectedPrice.sell_unit,
        sellQuantity: selectedPrice.sell_quantity,
        priceCents: selectedPrice.price_cents,
      },
      quantity,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="px-4 py-6">
      <Link href="/menu" className="text-xs text-sage">
        ← Back to menu
      </Link>

      <h1 className="mt-3 font-display text-2xl uppercase tracking-tight text-cream">
        {product.name}
      </h1>

      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-sage">
        {product.brand && <span>{product.brand.name}</span>}
        {product.variety?.strain_type && (
          <span className="rounded-sm border border-sage/30 px-1.5 py-0.5 text-xs">
            {STRAIN_TYPE_LABEL[product.variety.strain_type] ??
              product.variety.strain_type}
          </span>
        )}
        {product.grade_declared && <span>{product.grade_declared}</span>}
      </div>

      {potency && <p className="mt-2 text-sm text-gold">{potency}</p>}

      {product.cultivation && (
        <p className="mt-1 text-xs text-sage">
          {product.cultivation.replace(/_/g, " ")}
        </p>
      )}

      <div className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-sage">
          Choose a size
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {product.prices.map((price) => {
            const isOut = price.stock_status === "out_of_stock";
            const isSelected = price.id === selectedPriceId;
            return (
              <button
                key={price.id}
                disabled={isOut}
                onClick={() => setSelectedPriceId(price.id)}
                className={`rounded-sm border px-3 py-2 text-left text-sm ${
                  isOut
                    ? "cursor-not-allowed border-sage/10 text-sage/50 opacity-60"
                    : isSelected
                      ? "border-gold bg-gold/10 text-cream"
                      : "border-sage/30 text-cream"
                }`}
              >
                <div>{sellUnitLabel(price.sell_unit, price.sell_quantity)}</div>
                <div className="text-xs text-sage">
                  {isOut ? "Out of stock" : formatCents(price.price_cents)}
                </div>
                {price.stock_status === "low_stock" && (
                  <div className="text-xs text-gold">Low stock</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedPrice && (
        <div className="mt-6 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-sm border border-sage/30 text-cream"
            >
              −
            </button>
            <span className="w-6 text-center text-cream">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-sm border border-sage/30 text-cream"
            >
              +
            </button>
          </div>
          <Button
            onClick={handleAdd}
            className="h-11 flex-1 rounded-sm bg-gold text-base hover:bg-gold/90"
          >
            {added ? "Added" : existingLine ? "Add more" : "Add to request"}
          </Button>
        </div>
      )}
    </div>
  );
}
