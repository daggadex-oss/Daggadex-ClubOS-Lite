// Formats a product_prices (sell_unit, sell_quantity) pair for display.
// Shared across the menu, basket, and order history so the wording
// stays consistent everywhere a price point is shown.
export function sellUnitLabel(sellUnit: string, sellQuantity: number): string {
  switch (sellUnit) {
    case "gram":
      return `${sellQuantity}g`;
    case "ml":
      return `${sellQuantity}ml`;
    case "joint":
      return `${sellQuantity} ${sellQuantity === 1 ? "joint" : "joints"}`;
    case "device":
      return `${sellQuantity} ${sellQuantity === 1 ? "device" : "devices"}`;
    case "pack":
      return `${sellQuantity} ${sellQuantity === 1 ? "pack" : "packs"}`;
    case "each":
      return `${sellQuantity} ${sellQuantity === 1 ? "unit" : "units"}`;
    default:
      return `${sellQuantity} ${sellUnit}`;
  }
}

export function potencyLabel(details: {
  potency_amount: number | null;
  potency_unit: string | null;
  potency_compound: string | null;
  potency_basis: string | null;
}): string | null {
  const { potency_amount, potency_unit, potency_compound, potency_basis } = details;
  if (potency_amount == null || !potency_unit || !potency_compound) return null;

  const amount =
    potency_unit === "percent" ? `${potency_amount}%` : `${potency_amount}mg`;
  const compound = potency_compound.toUpperCase();
  const basis =
    potency_basis === "per_serving"
      ? "per serving"
      : potency_basis === "per_package"
        ? "per package"
        : potency_basis === "concentration"
          ? "concentration"
          : "";

  return [amount, compound, basis].filter(Boolean).join(" ");
}
