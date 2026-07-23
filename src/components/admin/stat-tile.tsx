function formatDelta(
  current: number,
  previous: number,
): { pct: number; direction: "up" | "down" | "flat" } {
  if (previous === 0) return { pct: 0, direction: "flat" };
  const pct = ((current - previous) / previous) * 100;
  return {
    pct: Math.abs(pct),
    direction: pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat",
  };
}

export function StatTile({
  label,
  value,
  current,
  previous,
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
}) {
  const { pct, direction } = formatDelta(current, previous);

  return (
    <div className="rounded-sm border border-sage/20 bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-sage">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl text-cream">{value}</p>
      <p className="mt-1 text-xs text-sage">
        {direction === "flat"
          ? "No change vs prior period"
          : `${direction === "up" ? "↑" : "↓"} ${pct.toFixed(0)}% vs prior period`}
      </p>
    </div>
  );
}
