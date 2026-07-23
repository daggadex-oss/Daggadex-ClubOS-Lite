import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// This client authenticates with the service_role key, which bypasses
// EVERY row level security policy on EVERY table. It must never be
// imported into a client component or reached from any code path that
// runs in the browser. See CLAUDE.md "Auth and access".
if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/supabase/admin.ts was imported into browser code. This client bypasses RLS and must only be used in server-only modules.",
  );
}

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
