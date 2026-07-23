"use client";

import { useState } from "react";
import { formatCents } from "@/lib/money";
import type { OrdersPerDay } from "@/lib/data/dashboard";

export function OrdersChart({ data }: { data: OrdersPerDay[] }) {
  const [hovered, setHovered] = useState<OrdersPerDay | null>(null);
  const max = Math.max(...data.map((d) => d.orders), 1);

  return (
    <div>
      <div className="flex h-32 items-end gap-0.5">
        {data.map((d) => (
          <div
            key={d.day}
            className="flex-1 cursor-pointer rounded-t-sm bg-olive transition-opacity hover:opacity-80"
            style={{
              height: `${Math.max((d.orders / max) * 100, d.orders > 0 ? 4 : 1)}%`,
            }}
            onMouseEnter={() => setHovered(d)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>
      <p className="mt-2 h-5 text-xs text-sage">
        {hovered ? (
          <>
            {new Date(hovered.day).toLocaleDateString("en-ZA", {
              day: "numeric",
              month: "short",
            })}{" "}
            · {hovered.orders} orders · {formatCents(hovered.revenue_cents)}
          </>
        ) : (
          "Hover a bar for details"
        )}
      </p>
    </div>
  );
}
