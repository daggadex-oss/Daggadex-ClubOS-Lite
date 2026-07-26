import { createClient } from "@/lib/supabase/server";

export type AdminClubTier = {
  id: string;
  name: string;
  rank: number;
};

export async function getClubTiers(clubId: string): Promise<AdminClubTier[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("club_tiers")
    .select("id, name, rank")
    .eq("club_id", clubId)
    .order("rank");

  return data ?? [];
}
