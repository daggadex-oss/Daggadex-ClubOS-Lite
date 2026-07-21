import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST-only (not GET) so link prefetching or crawlers can't trigger a
// sign-out. Invoke via a <form method="post" action="/auth/signout">.
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.url));
}
