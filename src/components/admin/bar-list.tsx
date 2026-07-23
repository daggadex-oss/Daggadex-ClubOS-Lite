// Ranked comparison across categories/products without needing distinct
// categorical hues — identity is carried by the label, not color, which
// sidesteps the fact that this palette reserves most of its colors for
// non-chart UI (gold stays scarce, wood is cancelled-state only). One
// sequential hue (olive), bar length encodes magnitude.
export function BarList({
  items,
}: {
  items: { label: string; value: number; formattedValue: string }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-cream">{item.label}</span>
            <span className="text-sage">{item.formattedValue}</span>
          </div>
          <div className="mt-1 h-2 rounded-sm bg-base">
            <div
              className="h-2 rounded-sm bg-olive"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
