import { getSessionContext } from "@/lib/session";
import {
  getDashboardSummary,
  getOrdersPerDay,
  getTopProducts,
  getCategorySplit,
  getPriceByTier,
  getOrderTimingHeatmap,
} from "@/lib/data/dashboard";
import { StatTile } from "@/components/admin/stat-tile";
import { BarList } from "@/components/admin/bar-list";
import { OrdersChart } from "@/components/admin/orders-chart";
import { TimingHeatmap } from "@/components/admin/timing-heatmap";
import { ExportButton } from "@/components/admin/export-button";
import { formatCents } from "@/lib/money";

export default async function AdminDashboardPage() {
  const session = await getSessionContext();
  if (!session) return null;

  const clubId = session.club.id;

  const [summary, ordersPerDay, topProducts, categorySplit, priceByTier, heatmap] =
    await Promise.all([
      getDashboardSummary(clubId, 30),
      getOrdersPerDay(clubId, 30),
      getTopProducts(clubId, 30, 8),
      getCategorySplit(clubId, 30),
      getPriceByTier(clubId),
      getOrderTimingHeatmap(clubId, 60),
    ]);

  return (
    <div>
      <h1 className="font-display text-2xl uppercase tracking-tight text-cream">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-sage">Last 30 days vs the 30 days before that.</p>

      {summary && (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Revenue"
            value={formatCents(summary.current_revenue_cents)}
            current={summary.current_revenue_cents}
            previous={summary.previous_revenue_cents}
          />
          <StatTile
            label="Orders"
            value={String(summary.current_orders)}
            current={summary.current_orders}
            previous={summary.previous_orders}
          />
          <StatTile
            label="Average basket"
            value={formatCents(summary.current_avg_basket_cents)}
            current={summary.current_avg_basket_cents}
            previous={summary.previous_avg_basket_cents}
          />
          <StatTile
            label="Repeat-member share"
            value={`${(summary.current_repeat_share * 100).toFixed(0)}%`}
            current={summary.current_repeat_share}
            previous={summary.previous_repeat_share}
          />
        </div>
      )}

      <div className="mt-6 rounded-sm border border-sage/20 bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-sage">
            Orders per day
          </h2>
          <ExportButton
            filename="orders-per-day.csv"
            rows={ordersPerDay.map((d) => ({
              day: d.day,
              orders: d.orders,
              revenue_cents: d.revenue_cents,
            }))}
          />
        </div>
        <div className="mt-3">
          <OrdersChart data={ordersPerDay} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-sm border border-sage/20 bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-sage">
              Top products by revenue
            </h2>
            <ExportButton
              filename="top-products.csv"
              rows={topProducts.map((p) => ({
                product_name: p.product_name,
                revenue_cents: p.revenue_cents,
                units: p.units,
              }))}
            />
          </div>
          <div className="mt-3">
            <BarList
              items={topProducts.map((p) => ({
                label: p.product_name,
                value: p.revenue_cents,
                formattedValue: formatCents(p.revenue_cents),
              }))}
            />
          </div>
        </div>

        <div className="rounded-sm border border-sage/20 bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-sage">
              Category split
            </h2>
            <ExportButton
              filename="category-split.csv"
              rows={categorySplit.map((c) => ({
                substance_class: c.substance_class,
                revenue_cents: c.revenue_cents,
                orders: c.orders,
              }))}
            />
          </div>
          <div className="mt-3">
            <BarList
              items={categorySplit.map((c) => ({
                label: c.substance_class,
                value: c.revenue_cents,
                formattedValue: formatCents(c.revenue_cents),
              }))}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-sm border border-sage/20 bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-sage">
            Price per gram by cultivation tier — Flower
          </h2>
          <ExportButton
            filename="price-per-gram-by-tier.csv"
            rows={priceByTier.map((t) => ({
              tier: t.tier,
              avg_price_per_gram_cents: t.avg_price_per_gram_cents,
              product_count: t.product_count,
            }))}
          />
        </div>
        <div className="mt-3">
          <BarList
            items={priceByTier.map((t) => ({
              label: t.tier.replace(/_/g, " "),
              value: t.avg_price_per_gram_cents,
              formattedValue: `${formatCents(t.avg_price_per_gram_cents)}/g`,
            }))}
          />
        </div>
      </div>

      <div className="mt-4 rounded-sm border border-sage/20 bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-sage">
            Order timing — hour × day of week (60 days)
          </h2>
          <ExportButton
            filename="order-timing-heatmap.csv"
            rows={heatmap.map((h) => ({
              day_of_week: h.day_of_week,
              hour_of_day: h.hour_of_day,
              orders: h.orders,
            }))}
          />
        </div>
        <div className="mt-3">
          <TimingHeatmap data={heatmap} />
        </div>
      </div>
    </div>
  );
}
