import { formatCents } from "@/lib/money";
import { sellUnitLabel } from "@/lib/sell-unit";
import type { Order } from "@/lib/data/orders";

const STATUS_STYLES: Record<string, string> = {
  requested: "bg-sage/20 text-sage",
  confirmed: "bg-olive/20 text-olive",
  out_for_delivery: "bg-gold/20 text-gold",
  delivered: "border border-sage/30 bg-surface text-cream",
  cancelled: "bg-wood/20 text-wood",
};

const STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function OrderList({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-sage">
          No requests yet — head to the menu to reserve something.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-6">
      {orders.map((order) => (
        <div
          key={order.id}
          className="rounded-sm border border-sage/20 bg-surface p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-sage">
              {formatDate(order.requested_at)}
            </span>
            <span
              className={`rounded-sm px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                STATUS_STYLES[order.status] ?? "bg-sage/20 text-sage"
              }`}
            >
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>

          <div className="mt-2 space-y-1">
            {order.items.map((item) => (
              <p key={item.id} className="text-sm text-cream">
                {item.quantity}× {item.product_name} (
                {sellUnitLabel(item.sell_unit, item.sell_quantity)})
              </p>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-sage/20 pt-2">
            <span className="text-xs text-sage">
              {order.payment_status === "paid" ? "Paid" : "Payment pending"}
            </span>
            <span className="text-sm font-medium text-cream">
              {formatCents(order.total_cents)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
