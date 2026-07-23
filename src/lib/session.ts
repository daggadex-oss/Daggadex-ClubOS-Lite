import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type SessionContext = {
  member: Tables<"members">;
  club: Tables<"clubs">;
} | null;

// Cached per-request with React `cache()` — every Server Component that
// calls this in the same render only triggers one `members` query, no
// matter how many layouts/pages ask for it. Middleware has already done
// the auth gate by the time this runs; this just fetches what's needed
// to render.
export const getSessionContext = cache(async (): Promise<SessionContext> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: member } = await supabase
    .from("members")
    .select("*, clubs(*)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return null;

  const { clubs: club, ...memberRow } = member;

  if (!club) return null;

  return { member: memberRow, club };
});
