"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_ORDER_SELECT,
  type AdminOrder,
} from "@/lib/data/admin-orders-shared";
import {
  transitionOrderStatus,
  updatePaymentStatus,
} from "@/lib/actions/admin-orders";
import { formatCents } from "@/lib/money";
import { sellUnitLabel } from "@/lib/sell-unit";

const STATUS_COLUMNS = [
  { key: "requested", label: "Requested" },
  { key: "confirmed", label: "Confirmed" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
] as const;

const NEXT_STATUS: Record<string, string | undefined> = {
  requested: "confirmed",
  confirmed: "out_for_delivery",
  out_for_delivery: "delivered",
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  requested: "Confirm",
  confirmed: "Dispatch",
  out_for_delivery: "Mark delivered",
};

function timeWaiting(requestedAt: string): string {
  const diffMs = Date.now() - new Date(requestedAt).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function waMeLink(phone: string, orderId: string, status: string) {
  const ref = `#${orderId.slice(0, 8).toUpperCase()}`;
  const label = STATUS_COLUMNS.find((c) => c.key === status)?.label ?? status;
  const text = encodeURIComponent(`Update on your request ${ref}: ${label}.`);
  const digits = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${text}`;
}

export function OrderQueue({
  initialOrders,
  clubId,
}: {
  initialOrders: AdminOrder[];
  clubId: string;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [, forceTick] = useState(0);

  // Recompute "time waiting" periodically so it doesn't go stale on screen.
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    async function fetchAndUpsertOrder(id: string) {
      const { data } = await supabase
        .from("b2c_transactions")
        .select(ADMIN_ORDER_SELECT)
        .eq("id", id)
        .single();
      if (data) {
        setOrders((prev) => [
          data as AdminOrder,
          ...prev.filter((o) => o.id !== id),
        ]);
      }
    }

    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "b2c_transactions",
          filter: `club_id=eq.${clubId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
            return;
          }
          // INSERT and UPDATE both re-fetch the full row (with items and
          // member alias embedded) since the realtime payload only ever
          // carries the raw b2c_transactions columns.
          fetchAndUpsertOrder(payload.new.id as string);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId]);

  async function handleTransition(orderId: string, newStatus: string) {
    if (newStatus === "cancelled" && !confirm("Cancel this request?")) return;

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
    );
    const result = await transitionOrderStatus(orderId, newStatus);
    if ("error" in result) {
      alert(result.error);
    }
  }

  async function handlePaymentChange(
    orderId: string,
    paymentStatus: string,
    paymentNotes: string,
  ) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, payment_status: paymentStatus, payment_notes: paymentNotes }
          : o,
      ),
    );
    const result = await updatePaymentStatus(orderId, paymentStatus, paymentNotes);
    if ("error" in result) {
      alert(result.error);
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto px-4 py-4">
      {STATUS_COLUMNS.map((column) => {
        const columnOrders = orders.filter((o) => o.status === column.key);
        const isHistorical =
          column.key === "delivered" || column.key === "cancelled";
        const visible = isHistorical
          ? columnOrders.slice(0, 10)
          : columnOrders;

        return (
          <div key={column.key} className="w-72 shrink-0">
            <h2 className="text-xs font-medium uppercase tracking-wide text-sage">
              {column.label} ({columnOrders.length})
            </h2>
            <div className="mt-2 space-y-2">
              {visible.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onTransition={handleTransition}
                  onPaymentChange={handlePaymentChange}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({
  order,
  onTransition,
  onPaymentChange,
}: {
  order: AdminOrder;
  onTransition: (orderId: string, newStatus: string) => void;
  onPaymentChange: (
    orderId: string,
    paymentStatus: string,
    paymentNotes: string,
  ) => void;
}) {
  const nextStatus = NEXT_STATUS[order.status];
  const canCancel = order.status !== "delivered" && order.status !== "cancelled";

  return (
    <div className="rounded-sm border border-sage/20 bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-cream">
          {order.member.alias}
        </span>
        <span className="text-xs text-sage">
          {timeWaiting(order.requested_at)}
        </span>
      </div>

      <div className="mt-1 space-y-0.5">
        {order.items.map((item) => (
          <p key={item.id} className="text-xs text-sage">
            {item.quantity}× {item.product_name} (
            {sellUnitLabel(item.sell_unit, item.sell_quantity)})
          </p>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-cream">{formatCents(order.total_cents)}</span>
        {order.delivery_zone && (
          <span className="text-xs text-sage">{order.delivery_zone}</span>
        )}
      </div>

      <select
        value={order.payment_status}
        onChange={(e) =>
          onPaymentChange(order.id, e.target.value, order.payment_notes ?? "")
        }
        className="mt-2 w-full rounded-sm border border-sage/30 bg-surface px-2 py-1 text-xs text-cream"
      >
        <option value="unpaid">Unpaid</option>
        <option value="eft_pending">EFT pending</option>
        <option value="paid">Paid</option>
      </select>
      <input
        key={order.payment_notes}
        defaultValue={order.payment_notes ?? ""}
        onBlur={(e) =>
          onPaymentChange(order.id, order.payment_status, e.target.value)
        }
        placeholder="Payment notes"
        className="mt-1 w-full rounded-sm border border-sage/30 bg-surface px-2 py-1 text-xs text-cream placeholder:text-sage/70"
      />

      <div className="mt-2 flex gap-2">
        {nextStatus && (
          <button
            onClick={() => onTransition(order.id, nextStatus)}
            className="flex-1 rounded-sm bg-gold px-2 py-1.5 text-xs font-medium text-base"
          >
            {NEXT_STATUS_LABEL[order.status]}
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => onTransition(order.id, "cancelled")}
            className="rounded-sm border border-wood/40 px-2 py-1.5 text-xs text-wood"
          >
            Cancel
          </button>
        )}
      </div>

      {order.member.phone && (
        <a
          href={waMeLink(order.member.phone, order.id, order.status)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-center text-xs text-olive underline"
        >
          Message member
        </a>
      )}
    </div>
  );
}
