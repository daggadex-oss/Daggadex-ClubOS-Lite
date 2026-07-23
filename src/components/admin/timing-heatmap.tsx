"use client";

import { useState } from "react";
import type { HeatmapCell } from "@/lib/data/dashboard";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TimingHeatmap({ data }: { data: HeatmapCell[] }) {
  const [hovered, setHovered] = useState<HeatmapCell | null>(null);
  const max = Math.max(...data.map((d) => d.orders), 1);
  const cellMap = new Map(
    data.map((d) => [`${d.day_of_week}-${d.hour_of_day}`, d.orders]),
  );

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="inline-grid grid-cols-[2rem_repeat(24,1rem)] gap-0.5">
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center text-[9px] text-sage">
              {h % 6 === 0 ? h : ""}
            </div>
          ))}
          {DAYS.map((dayLabel, dow) => (
            <div key={dow} className="contents">
              <div className="pr-2 text-xs text-sage">{dayLabel}</div>
              {Array.from({ length: 24 }, (_, hour) => {
                const orders = cellMap.get(`${dow}-${hour}`) ?? 0;
                const opacity = orders === 0 ? 0.08 : 0.15 + (orders / max) * 0.85;
                return (
                  <div
                    key={hour}
                    className="h-4 w-4 rounded-[2px] bg-olive"
                    style={{ opacity }}
                    onMouseEnter={() =>
                      setHovered({ day_of_week: dow, hour_of_day: hour, orders })
                    }
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 h-5 text-xs text-sage">
        {hovered
          ? `${DAYS[hovered.day_of_week]} ${hovered.hour_of_day}:00 — ${hovered.orders} orders`
          : "Hover a cell for details"}
      </p>
    </div>
  );
}
