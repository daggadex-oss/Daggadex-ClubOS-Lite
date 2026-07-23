import { createClient } from "@/lib/supabase/client";

// Single entry point for requesting member sign-in. Currently backed by
// email magic links — phone OTP needs a third-party SMS provider and SA
// sender-ID registration, out of scope for this sprint (see CLAUDE.md).
// Callers pass an opaque identifier; if this ever moves to phone OTP,
// only this function's body needs to change.
export async function requestSignIn(identifier: string) {
  const supabase = createClient();

  return supabase.auth.signInWithOtp({
    email: identifier,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}
