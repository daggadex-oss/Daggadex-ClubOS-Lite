// Money is always integer cents (ZAR). This is the only place that
// formats it for display — never divide/round ad hoc elsewhere.
export function formatCents(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`;
}
