import { createClient } from "@/lib/supabase/server";

export type DashboardSummary = {
  current_revenue_cents: number;
  previous_revenue_cents: number;
  current_orders: number;
  previous_orders: number;
  current_avg_basket_cents: number;
  previous_avg_basket_cents: number;
  current_repeat_share: number;
  previous_repeat_share: number;
};

export type OrdersPerDay = { day: string; orders: number; revenue_cents: number };
export type TopProduct = { product_name: string; revenue_cents: number; units: number };
export type CategorySplit = {
  substance_class: string;
  revenue_cents: number;
  orders: number;
};
export type PriceByTier = {
  tier: string;
  avg_price_per_gram_cents: number;
  product_count: number;
};
export type HeatmapCell = { day_of_week: number; hour_of_day: number; orders: number };

export async function getDashboardSummary(
  clubId: string,
  periodDays = 30,
): Promise<DashboardSummary | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_dashboard_summary", {
    p_club_id: clubId,
    p_period_days: periodDays,
  });
  return data?.[0] ?? null;
}

export async function getOrdersPerDay(
  clubId: string,
  days = 30,
): Promise<OrdersPerDay[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_orders_per_day", {
    p_club_id: clubId,
    p_days: days,
  });
  return data ?? [];
}

export async function getTopProducts(
  clubId: string,
  days = 30,
  limit = 8,
): Promise<TopProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_top_products", {
    p_club_id: clubId,
    p_days: days,
    p_limit: limit,
  });
  return data ?? [];
}

export async function getCategorySplit(
  clubId: string,
  days = 30,
): Promise<CategorySplit[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_category_split", {
    p_club_id: clubId,
    p_days: days,
  });
  return data ?? [];
}

export async function getPriceByTier(clubId: string): Promise<PriceByTier[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_price_per_gram_by_tier", {
    p_club_id: clubId,
  });
  return data ?? [];
}

export async function getOrderTimingHeatmap(
  clubId: string,
  days = 60,
): Promise<HeatmapCell[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_order_timing_heatmap", {
    p_club_id: clubId,
    p_days: days,
  });
  return data ?? [];
}
