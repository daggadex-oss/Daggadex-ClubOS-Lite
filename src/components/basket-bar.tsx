"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBasket } from "@/lib/basket-context";
import { formatCents } from "@/lib/money";

export function BasketBar() {
  const { itemCount, subtotalCents } = useBasket();
  const pathname = usePathname();

  if (itemCount === 0 || pathname === "/menu/review") return null;

  return (
    <div className="px-4 pb-2">
      <Link
        href="/menu/review"
        className="flex items-center justify-between gap-3 rounded-lg border border-sage/30 bg-surface/95 p-2 pl-4 shadow-2xl shadow-black/40 backdrop-blur-xl"
      >
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-sage">
            Your Reservation
          </span>
          <span className="text-cream">
            {itemCount} {itemCount === 1 ? "item" : "items"}{" "}
            <span className="text-sage">·</span>{" "}
            <span className="font-bold text-gold">{formatCents(subtotalCents)}</span>
          </span>
        </div>
        <span className="shrink-0 rounded-md bg-gold px-6 py-3 font-display text-sm uppercase tracking-tight text-base">
          Reserve
        </span>
      </Link>
    </div>
  );
}
