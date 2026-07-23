import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// PWA assets must be reachable without a session: the manifest, icons,
// and service worker are fetched by the browser/OS itself (no cookies
// in the relevant sense), and the offline fallback page specifically
// exists for when a request can't be authenticated at all.
const PUBLIC_EXACT_PATHS = new Set([
  "/login",
  "/manifest.webmanifest",
  "/icon-192",
  "/icon-512",
  "/apple-icon",
  "/offline",
  "/sw.js",
]);

function isPublicPath(pathname: string) {
  return PUBLIC_EXACT_PATHS.has(pathname) || pathname.startsWith("/auth/");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run other code between createServerClient and getUser() — the
  // @supabase/ssr docs are explicit that this breaks session refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  function redirect(path: string) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const redirectResponse = NextResponse.redirect(url);
    // Carry the refreshed session cookies onto the redirect response —
    // without this, a token refresh during this request would be lost.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (!user) {
    return redirect("/login");
  }

  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || member.status !== "active") {
    if (pathname === "/pending") return supabaseResponse;
    return redirect("/pending");
  }

  const isAdminPath = pathname.startsWith("/admin");

  if (member.role === "member") {
    if (isAdminPath) return redirect("/menu");
    if (pathname === "/") return redirect("/menu");
    return supabaseResponse;
  }

  // role is 'staff' or 'owner'
  if (pathname === "/") return redirect("/admin");
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
