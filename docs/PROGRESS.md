# Progress Log

Factual, short. One entry per phase. If a session gets cut off mid-run,
the next session should be able to resume from the "Next phase starts with"
line of the most recent entry without re-reading the whole codebase.

---

## Phase A — Day 0 catalogue compatibility migration

**Built:** Migration `20260721125918_catalogue_compatibility.sql` — new
`brands` table (RLS enabled, staff-write/authenticated-read policies),
`brand_id` FK on `products`, potency columns (`potency_amount`,
`potency_unit`, `potency_compound`, `potency_basis`), `substance_class` on
`product_types` (default `'cannabis'`), `grade_declared` and `cultivation`
on `products`. Applied verbatim from the spec — no additions, no reordering.

**Files touched:**
- `supabase/migrations/20260721125918_catalogue_compatibility.sql` (new)
- `src/lib/database.types.ts` (regenerated)

**Decisions made:** None — content was fully specified, applied as given.

**Deferred:** No indexes beyond `idx_products_brand` and
`idx_products_cultivation` (both specified in the migration itself) — query
shapes for the new columns aren't known yet.

**Verified:** `brands` exists with `rowsecurity = true` (confirmed via live
query, not assumed). All 7 new `products`/`product_types` columns confirmed
present with correct types/nullability via live query. `pnpm tsc --noEmit`
clean.

**Next phase starts with:** Phase B — three Supabase clients in
`src/lib/supabase/` (browser, server, admin). Working on branch
`sprint/mvp`, not yet pushed to remote.

---

## Phase B — Supabase clients

**Built:** Three clients in `src/lib/supabase/`:
- `client.ts` — browser client via `createBrowserClient`.
- `server.ts` — async server client via `createServerClient`, using the
  documented `getAll`/`setAll` cookie pattern for Server Components, Route
  Handlers and Server Actions.
- `admin.ts` — service-role client. `import "server-only"` as the first
  line, plus a top-level `typeof window !== "undefined"` throw as a
  second, redundant guard. Comment states it bypasses every RLS policy.

**Files touched:**
- `src/lib/supabase/client.ts` (new)
- `src/lib/supabase/server.ts` (new)
- `src/lib/supabase/admin.ts` (new)
- `package.json`, `pnpm-lock.yaml` — added `@supabase/ssr`,
  `@supabase/supabase-js`, `server-only`.

**Decisions made:** None outside what was specified.

**Deferred:** Nothing.

**Verified:** Built a throwaway client component that imported
`createAdminClient` and ran `pnpm build` — confirmed Turbopack hard-fails
the build with "'server-only' cannot be imported from a Client Component
module" (test page deleted afterward, never committed). `pnpm tsc --noEmit`
and `pnpm build` both clean on the real tree.

**Next phase starts with:** Phase C — email magic link auth (`/login`,
`/auth/callback`, `/auth/signout`, `/pending`, `src/lib/auth.ts`). Note:
this replaces the phone-OTP auth described in `CLAUDE.md` at the time —
`CLAUDE.md` gets updated to match in Phase F.

---

## Phase C — Email magic link auth

**Built:**
- `src/lib/auth.ts` — `requestSignIn(identifier)`, the single call site
  for `signInWithOtp`. Swapping to phone OTP later only touches this file.
- `/login` — client component, single email field, calls `requestSignIn`,
  shows a "check your email" success state or a visible error message.
- `/auth/callback` — route handler, exchanges the code for a session via
  the server client, redirects to `/` (or `/login?error=auth` on failure).
- `/auth/signout` — POST-only route handler (deliberately not GET, so
  link prefetching/crawlers can't trigger it), clears the session,
  redirects to `/login`.
- `/pending` — holding page for an authenticated user with no `members`
  row yet. On-brand copy, includes a sign-out form.
- Added shadcn `Button` and `Input` components (used on `/login`).

**Files touched:**
- `src/lib/auth.ts` (new)
- `src/app/login/page.tsx` (new)
- `src/app/auth/callback/route.ts` (new)
- `src/app/auth/signout/route.ts` (new)
- `src/app/pending/page.tsx` (new)
- `src/components/ui/button.tsx`, `src/components/ui/input.tsx` (new,
  via `shadcn add`)

**Decisions made:**
- `/auth/signout` is POST, not GET — not specified in the brief, but GET
  sign-out endpoints are a known CSRF/prefetch footgun. Invoked via a
  plain `<form>` post, no JS required.
- `/pending` includes a sign-out link — not explicitly requested, but
  without it a member stuck pending with the wrong email has no way out
  of the loop. Minimal, on-brand, not a new feature area.
- Left `signInWithOtp`'s default `shouldCreateUser: true` — anyone can
  request a magic link and will land on `/pending` until a `members` row
  exists for them (Phase D). Access control lives at the `members` gate,
  not at sign-up.

**Deferred:** Nothing from the brief. Actual email delivery is untested
(that's explicitly Phase F/the founder's job on a real handset).

**Verified:** `pnpm tsc --noEmit` and `pnpm build` both clean; all four
routes appear in the build's route table. `/login` and `/pending`
manually loaded in-browser — correct copy, correct tokens/fonts, zero
console errors.

**Next phase starts with:** Phase D — middleware + role routing
(`src/lib/session.ts` cached helper, session/member/club resolution,
redirect rules for `member` vs `staff`/`owner`).
