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
    <Link
      href="/menu/review"
      className="flex min-h-11 items-center justify-between bg-gold px-4 py-3 text-base font-medium text-base"
    >
      <span>
        {itemCount} {itemCount === 1 ? "item" : "items"} · {formatCents(subtotalCents)}
      </span>
      <span className="uppercase tracking-tight">Review request →</span>
    </Link>
  );
}
