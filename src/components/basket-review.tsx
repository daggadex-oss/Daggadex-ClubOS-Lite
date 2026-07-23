"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useBasket } from "@/lib/basket-context";
import { formatCents } from "@/lib/money";
import { sellUnitLabel } from "@/lib/sell-unit";
import { Button } from "@/components/ui/button";
import { submitOrder } from "@/lib/actions/orders";

export function BasketReview({ minOrderCents }: { minOrderCents: number }) {
  const { lines, subtotalCents, updateQuantity, removeLine, clear } =
    useBasket();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const belowMinimum = minOrderCents > 0 && subtotalCents < minOrderCents;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitOrder(
        lines.map((l) => ({
          productPriceId: l.productPriceId,
          quantity: l.quantity,
        })),
        notes || null,
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      clear();
      router.push("/orders");
    });
  }

  if (lines.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-sage">Your basket is empty.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="font-display text-2xl uppercase tracking-tight text-cream">
        Review your request
      </h1>

      <div className="mt-4 space-y-3">
        {lines.map((line) => (
          <div
            key={line.productPriceId}
            className="rounded-sm border border-sage/20 bg-surface p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-cream">
                  {line.productName}
                </p>
                <p className="text-xs text-sage">
                  {sellUnitLabel(line.sellUnit, line.sellQuantity)} ·{" "}
                  {formatCents(line.priceCents)}
                </p>
              </div>
              <button
                onClick={() => removeLine(line.productPriceId)}
                className="text-xs text-sage"
              >
                Remove
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() =>
                  updateQuantity(line.productPriceId, line.quantity - 1)
                }
                className="flex h-8 w-8 items-center justify-center rounded-sm border border-sage/30 text-cream"
              >
                −
              </button>
              <span className="w-6 text-center text-cream">
                {line.quantity}
              </span>
              <button
                onClick={() =>
                  updateQuantity(line.productPriceId, line.quantity + 1)
                }
                className="flex h-8 w-8 items-center justify-center rounded-sm border border-sage/30 text-cream"
              >
                +
              </button>
              <span className="ml-auto text-sm text-cream">
                {formatCents(line.priceCents * line.quantity)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <label className="text-xs font-medium uppercase tracking-wide text-sage">
          Delivery notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-sm border border-sage/30 bg-surface p-2 text-sm text-cream placeholder:text-sage/70"
          placeholder="Gate code, landmark, preferred time..."
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-sage/20 pt-4">
        <span className="text-sm text-sage">Subtotal</span>
        <span className="text-lg text-cream">{formatCents(subtotalCents)}</span>
      </div>

      {belowMinimum && (
        <p className="mt-2 text-sm text-gold">
          Heads up — this club&apos;s donation minimum is{" "}
          {formatCents(minOrderCents)}. You can still send this request.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={isPending}
        className="mt-4 h-11 w-full rounded-sm bg-gold text-base hover:bg-gold/90"
      >
        {isPending ? "Sending…" : "Send request"}
      </Button>
    </div>
  );
}
