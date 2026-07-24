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

---

## Phase D — Middleware and role routing

**Built:**
- `src/middleware.ts` — runs on every route except `/login` and
  `/auth/*` (checked first, before any Supabase call, so those routes
  pay zero auth-check cost). Follows the documented `@supabase/ssr`
  cookie-refresh pattern exactly (no code between `createServerClient`
  and `getUser()`; redirect responses carry over the refreshed cookies).
  Redirect rules: no session → `/login`; no `members` row or
  `status != 'active'` → `/pending`; `member` role hitting `/admin/*` or
  `/` → `/menu`; `staff`/`owner` hitting `/` → `/admin`.
- `src/lib/session.ts` — `getSessionContext()`, wrapped in React
  `cache()` so any number of Server Components in one render share a
  single `members` query instead of each re-querying.

**Files touched:**
- `src/middleware.ts` (new)
- `src/lib/session.ts` (new)

**Decisions made:**
- Public-path check happens before the Supabase client is even created,
  not after — `/login`/`/auth/*` traffic does zero auth work, rather
  than calling `getUser()` and discarding the result.
- Didn't restrict `staff`/`owner` from the member routes (`/menu`,
  `/orders`, `/account`) — spec only said what to *allow* for each
  role, not to wall staff out of member surfaces. Left permissive.

**Deferred:** The "member hitting `/admin` → `/menu`" half of the
Definition of Done isn't testable yet — there's no real logged-in member
until the bootstrap script (Phase E) creates one and the founder
completes a real magic-link login (Phase F). Logged-out redirects for
`/admin`, `/menu`, and `/` were verified directly in-browser.

**Verified:** `pnpm tsc --noEmit` and `pnpm build` both clean, middleware
shows in the build's route table. Logged-out requests to `/admin`,
`/menu`, and `/` all land on `/login`; no server errors.

**Next phase starts with:** Phase E — member layout (bottom nav),
admin layout (sidebar), placeholder pages for every nav destination,
and `scripts/bootstrap-owner.ts`.

---

## Phase E — Layouts and bootstrap script

**Built:**
- `src/app/(member)/layout.tsx` — mobile-first, bottom nav (Menu →
  `/menu`, Requests → `/orders`, Account → `/account`), 44px tap
  targets, `base` background, Anton wordmark.
- `src/app/(member)/{menu,orders,account}/page.tsx` — placeholders,
  each describes what's coming (not "TODO").
- `src/app/admin/layout.tsx` — desktop sidebar (Dashboard/Orders/
  Products/Members) plus a POST-form sign-out control.
- `src/app/admin/{page,orders,products,members}/page.tsx` —
  placeholders, same treatment.
- `scripts/bootstrap-owner.ts` (`pnpm bootstrap <email>`) — finds the
  `auth.users` row by email (exits with a clear message if absent),
  creates the club from `BOOTSTRAP_CLUB_NAME`/`BOOTSTRAP_CLUB_SLUG` (or
  the "Demo Club"/"demo-club" defaults) if missing, creates or fixes up
  the owner `members` row, idempotent, never prints secrets.

**Files touched:** all under `src/app/(member)/`, `src/app/admin/`,
plus `scripts/bootstrap-owner.ts`, `.env.local.example` (added the two
`BOOTSTRAP_*` vars with placeholder values), `package.json` /
`pnpm-lock.yaml` / `pnpm-workspace.yaml`.

**Decisions made:**
- Tried Node's native `--experimental-strip-types` first to avoid a new
  dependency, but its ESM loader can't resolve the `@/*` path alias used
  inside `src/lib/supabase/admin.ts` without a bundler. Rather than
  duplicate the service-role client just to dodge a dependency, added
  `tsx` as a devDependency — it's the standard fix for "TS + path
  aliases in a standalone script."
- `admin.ts`'s `import "server-only"` throws under plain Node unless the
  `react-server` export condition is set — `pnpm bootstrap` passes
  `--conditions=react-server` to `tsx` to match how Next.js itself
  resolves that package, rather than touching the Phase B file.
- Left `staff`/`owner` free to view `/menu`/`/orders`/`/account` (same
  call as Phase D — spec said what to allow, not what to block).

**Deferred:** Nothing from the brief.

**Verified:** `pnpm tsc --noEmit` and `pnpm build` clean; all 13 routes
appear in the build output, and every authenticated-area page
(`/menu`, `/orders`, `/account`, `/admin`, `/admin/orders`,
`/admin/products`, `/admin/members`) statically pre-rendered with no
errors. `pnpm bootstrap` (no args) prints usage and exits 1; `pnpm
bootstrap nobody-yet@example.com` correctly reports no matching
`auth.users` row and exits 1 — no writes attempted in either case.
Full in-browser visual check of the layouts, and the "member hits
`/admin` → `/menu`" middleware case, both wait on a real login
(Phase F / the founder's own testing).

**Next phase starts with:** Phase F — final `tsc`/`build` check, one
`pnpm dev` smoke test of `/login`, `docs/PROGRESS.md` Day 1 summary,
`CLAUDE.md` updates (auth model, courier/no-order-contents note, new
schema columns), commit, then stop before pushing.

---

## Phase F — Verify and hand back (Day 1 summary)

**Day 1 built, end to end:**
- **Schema:** catalogue compatibility (`brands` table + RLS, potency
  columns, `substance_class`, `grade_declared`, `cultivation` on
  `products`/`product_types` — Phase A), applied and live.
- **Auth:** email magic link, not phone OTP — `/login`, `/auth/callback`,
  `/auth/signout`, `/pending`, abstracted behind `src/lib/auth.ts`
  (Phase C), backed by three Supabase clients — browser, server, admin
  with a proven build-time + runtime guard (Phase B).
- **Access control:** middleware session gate + role-based redirects,
  cached `{ member, club }` helper for Server Components (Phase D).
- **UI:** member layout (bottom nav, mobile-first) and admin layout
  (sidebar, desktop-first), placeholder pages for every nav destination,
  `pnpm bootstrap` to create the first owner (Phase E).
- All on branch `sprint/mvp`, nothing merged to `main` or pushed yet.

**Files touched this sprint (all under `sprint/mvp`):**
- `supabase/migrations/20260721125918_catalogue_compatibility.sql`,
  `src/lib/database.types.ts`
- `src/lib/supabase/{client,server,admin}.ts`
- `src/lib/auth.ts`, `src/app/login/page.tsx`,
  `src/app/auth/{callback,signout}/route.ts`, `src/app/pending/page.tsx`,
  `src/components/ui/{button,input}.tsx`
- `src/middleware.ts`, `src/lib/session.ts`
- `src/app/(member)/{layout,menu/page,orders/page,account/page}.tsx`,
  `src/app/admin/{layout,page,orders/page,products/page,members/page}.tsx`,
  `scripts/bootstrap-owner.ts`
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
  `.env.local.example`, `CLAUDE.md`, `docs/PROGRESS.md`

**Decisions made without the founder, in order:**
1. `/auth/signout` is POST, not GET (CSRF/prefetch safety).
2. `/pending` includes a sign-out link (otherwise a wrong-email member
   has no way out of the loop).
3. Left `signInWithOtp`'s default `shouldCreateUser: true` — access
   control lives at the `members` gate, not at sign-up.
4. Public-path check in middleware runs before any Supabase call, so
   `/login`/`/auth/*` pay zero auth-check cost.
5. `staff`/`owner` are not blocked from member routes (`/menu`,
   `/orders`, `/account`) — spec said what to allow per role, not what
   to wall off.
6. Added `tsx` as a devDependency for `pnpm bootstrap` — Node's native
   `--experimental-strip-types` can't resolve the `@/*` path alias used
   inside `admin.ts` without a bundler-aware loader, and duplicating the
   service-role client to dodge a dependency seemed worse.
7. `pnpm bootstrap` passes `--conditions=react-server` to `tsx` so
   `admin.ts`'s `server-only` import resolves the same way it does under
   Next.js, instead of changing that file.

**Deferred / not yet testable (needs the founder):**
- Real magic-link email delivery, end to end, on a real handset.
- "Member hitting `/admin` → `/menu`" — needs a real logged-in member;
  logged-out redirects were verified directly.
- Full visual check of the member bottom nav and admin sidebar in a
  live session (build-time static rendering was verified; live
  in-browser render with real data was not).
- Running `pnpm bootstrap <your-email>` itself — needs a real
  `auth.users` row, which needs a completed magic-link login first.

**Verified:** `pnpm tsc --noEmit` and `pnpm build` clean on the final
tree. `pnpm dev` starts cleanly and `/login` renders correctly with no
console or server errors.

**Commands to run yourself, in order:**
```bash
cd ~/projects/daggadex-clubos
git push -u origin sprint/mvp        # first push of this branch
```
Then, in the browser: open `/login`, request a magic link, click it on
your phone. Once logged in (you'll land on `/pending` — no `members` row
yet), run:
```bash
pnpm bootstrap you@example.com
```
Refresh — you should now land on `/admin` as the owner.

**Next session starts with:** Day 2. `sprint/mvp` is one commit ahead of
`main` in every way that matters, but not merged — that's the founder's
call after testing the real login on a handset.

---

## Sprint plan v2 — catalogue seed (Day 1 step 7, done late)

The founder brought a v2 sprint plan (supersedes v1): email magic link
confirmed as the permanent auth choice (not a placeholder), courier
explicitly modeled as a non-user, and a real catalogue seed for Day 1
step 7 that hadn't been run yet. Also set up a `.claude` PreToolUse hook
(`hooks/wsl-command-gate.sh`) so routine `wsl`-wrapped commands stop
prompting for approval while `git push`/`supabase db push`/`rm` still
do — the existing blanket `Bash(wsl -e *)` rule that would have silently
defeated this was found and removed first.

**Built:** Ran `supabase/seed_catalogue.sql` — 249 products, 620 price
points, 129 varieties, 25 brands, sourced from a real 8-page club menu.
The founder's script had three bugs against the live schema (all
verified via live `information_schema`/`pg_constraint` queries before
touching anything):
- `varieties` insert never set `slug` (NOT NULL, no default) and used
  `on conflict (name)`, but only `slug` is unique — fixed by generating
  a slug from the strain name and conflicting on that instead.
- `strain_type` used `I`/`S`/`H`; the live CHECK only allows
  `indica`/`sativa`/`hybrid`/`unknown` — mapped at insert time.
- `product_prices.sell_unit` used `g`/`unit`; the live CHECK only
  allows `gram`/`joint`/`device`/`pack`/`each`/`ml` — mapped once at
  the two `product_prices` INSERT...SELECT statements (not scattered
  across ~40 literal values in the staging data) using the exact
  convention the original schema migration's own comments documented:
  flower→gram, preroll→joint, vape/dab hardware→device, everything
  else generic→each.

**Files touched:**
- `supabase/seed_catalogue.sql` (new — corrected version, committed;
  original DML, not a schema migration, so it lives outside
  `supabase/migrations/`)
- `C:\Users\ivarr\.claude\settings.json` (PreToolUse hook), `hooks/wsl-command-gate.sh`
  (new), `C:\Users\ivarr\.claude\settings.local.json` (removed the
  blanket `wsl -e *` allow rule) — these are harness config outside the
  repo, not committed to git.

**Decisions made:**
- Fixed the seed script's bugs rather than running it as-is and letting
  it fail — all three fixes are grounded in constraints the schema
  already documents (either literal CHECK values or the schema's own
  comments), not judgment calls invented on the spot.
- Ran the seed via `supabase db query --file`, not `supabase db push` —
  this is data (DML), not a schema change, so it doesn't belong in
  `supabase/migrations/`.

**Deferred:** Promotional/special pricing (section 11 of the seed) —
no `price_type` column exists yet, so specials are recorded as SQL
comments only, not rows. Flagged as a future schema decision, not made
here.

**Verified:** Post-run entity counts (249/620/129/25) match a hand
calculation of the staging data exactly — each band's price ladder
correctly multiplies across every strain in that band, ruling out
duplication from the LIKE-based product↔band join. Spot-checked that
`sell_unit` and `strain_type` columns contain only valid values
live — no leaked `g`/`unit`/`I`/`S`/`H`. The PreToolUse hook was
pipe-tested against 6 scenarios and proven to fire live (a real
`wsl -e bash -lc 'true'` ran with zero prompt) before the sentinel
prefix was removed.

**Next session starts with:** Actual Day 2 build work per the v2 plan —
`/menu` (grouped by type, filter chips, New Drops/Staff Picks,
out-of-stock visibly disabled not hidden), product detail, client-side
basket with no DB writes until submit, the `b2c_transactions` +
snapshotted items submit flow, and `/orders` history. Copy throughout:
"Request"/"Reserve"/"Donation", never "Buy"/"Checkout"/"Price".

---

## Day 2 — Member menu and request flow

**Success criterion from the brief:** place a real order from a phone
and have it land as structured rows. The submit path itself is proven
end to end (tested directly against the live DB — see below); the
full phone walkthrough still needs the founder's real session, same
constraint as Day 1's login test.

**Built:**
- `create_order()` Postgres function (new migration,
  `20260722224853_create_order_function.sql`) — atomically inserts one
  `b2c_transactions` row plus its `b2c_transaction_items`, looking up
  price/name/unit server-side from live `product_prices`/`products`
  rather than trusting client-submitted values. No `SECURITY DEFINER`
  — runs as the calling role so the existing RLS policies
  (`txn_member_insert`, `txn_items_insert`) remain the real
  authorization gate; the function's only job is atomicity and
  server-side pricing. Tested directly (insert → verify → cleanup)
  against the live database before any UI was built on top of it.
- `src/lib/data/menu.ts` — `getMenuSections()` (whole catalogue,
  grouped by `product_type`, embeds variety/brand/prices),
  `getMenuProduct()` (single product for the detail page).
- `src/lib/data/orders.ts` — `getMemberOrders()`, embeds line items.
- `src/lib/basket-context.tsx` — React Context, keyed by
  `product_price_id` (not `product_id`, since a member can have both
  a 2g and a 10g of the same strain as two separate lines). Pure
  client state; nothing here touches the database.
- `src/lib/actions/orders.ts` — `submitOrder()` Server Action, calls
  the `create_order` RPC with `{product_price_id, quantity}` pairs
  only (never price).
- `/menu` (`menu-browser.tsx`) — sections by product type, chips for
  All / New Drops / Staff Picks / each type present. Out-of-stock
  products shown at reduced opacity with a label, not removed from
  the list.
- `/menu/[id]` (`product-detail.tsx`) — strain type, grade,
  cultivation, potency (formatted via `src/lib/sell-unit.ts`), price
  point picker with individual out-of-stock buttons disabled (not the
  whole product), quantity stepper, add-to-basket.
- `/menu/review` (`basket-review.tsx`) — editable basket, delivery
  notes, non-blocking warning under the club's `min_order_cents`,
  submit button wired to the Server Action.
- `/orders` (`order-list.tsx`) — status badges mapped to the design
  tokens' documented status→color table exactly (requested=sage,
  confirmed=olive, out_for_delivery=gold, delivered=cream-on-surface,
  cancelled=wood).
- Floating basket bar (`basket-bar.tsx`) in the member layout, hidden
  on the review page itself and whenever the basket is empty.

**Files touched:**
- `supabase/migrations/20260722224853_create_order_function.sql` (new)
- `src/lib/database.types.ts` (regenerated)
- `src/lib/data/{menu,orders}.ts`, `src/lib/basket-context.tsx`,
  `src/lib/actions/orders.ts`, `src/lib/money.ts`,
  `src/lib/sell-unit.ts` (new)
- `src/components/{menu-browser,product-detail,basket-review,
  basket-bar,order-list}.tsx` (new)
- `src/app/(member)/menu/page.tsx` (rewritten from placeholder),
  `src/app/(member)/menu/[id]/page.tsx`,
  `src/app/(member)/menu/review/page.tsx` (new),
  `src/app/(member)/orders/page.tsx` (rewritten from placeholder),
  `src/app/(member)/layout.tsx` (wraps children in `BasketProvider`,
  adds the basket bar above the bottom nav)

**Decisions made without the founder, in order:**
1. Added a new migration for `create_order()` rather than doing the
   two inserts as separate REST calls — the brief explicitly requires
   "in a single transaction," which PostgREST can't do across two
   `.insert()` calls.
2. The RPC takes only `{product_price_id, quantity}` from the client
   and looks up price/name/unit itself — not specified in the brief,
   but a client-supplied price would be a real integrity gap given
   the basket is pure client state, and it's a more literal reading of
   "snapshot... at order time" than trusting a possibly-stale
   client-side cache anyway.
3. "Warn under `min_order_cents`" read as informational, not blocking
   — the warning shows but submission is not prevented. If the intent
   was a hard minimum, that's a one-line change in
   `basket-review.tsx` (disable the submit button when
   `belowMinimum`).
4. `p_delivery_zone`/`p_delivery_notes` are passed as `""` rather than
   `null` when unset — Supabase's generated RPC arg types are
   non-nullable `string` regardless of the underlying column's
   nullability, and both are just informational text, so this seemed
   a reasonable compromise over touching the SQL signature.
5. Basket keyed by `product_price_id`: a 2g and a 10g of the same
   strain are two independent basket lines, not merged.
6. No delivery fee calculation — `delivery_fee_cents` stays at its
   schema default (0) on submit. The plan doesn't specify a formula
   and delivery routing/fees are explicitly out of scope for the MVP.

**Deferred:**
- Full phone/browser walkthrough of the actual flow (browse → add →
  review → submit → see it in `/orders`) — every new route sits
  behind the auth middleware, so this needs the founder's real
  session, same as Day 1's login test. The `create_order` RPC itself
  was verified directly against the live database (not through the
  UI) before any UI was built on it.
- New Drops / Staff Picks filters will currently show empty states —
  the seed script didn't set `is_new_drop`/`is_staff_pick` on any
  product (a data/admin concern, not a Day 2 bug); Day 3's "light
  admin" scope doesn't mention toggling these either, so flagging for
  whenever that gets added.
- No product images — the seed has no `image_url` values (no
  photography assets exist yet). Cards/detail render fine without
  them; out of scope to fake placeholder images.

**Verified:** `pnpm tsc --noEmit` and `pnpm build` clean, all 5 new
routes appear in the build output. `create_order()` tested directly
against the live database: correct atomic insert, correct
server-computed subtotal/line totals, cleaned up after. Logged-out
requests to `/menu` still correctly redirect to `/login` with no
server errors (regression check on Day 1's middleware).

**Next session starts with:** Founder tests the real flow on a
handset (browse → add to basket → review → submit → see it land in
`/orders`), then Day 3 — order queue, fulfilment status transitions,
realtime, light admin (edit price / toggle stock / toggle active).

---

## Day 3 — Order queue, fulfilment, light admin

**Success criterion from the brief:** two phones side by side — order
placed on one, appears live on the other. The realtime mechanism
itself is enabled and wired up; the actual two-phone test still needs
the founder (same live-session constraint as every prior day).

**Built:**
- Migration `20260722230333_order_transitions_and_realtime.sql`:
  - `update_order_status()` — enforces the fulfilment state machine
    server-side: `requested → confirmed → out_for_delivery →
    delivered`, sequential only; cancel allowed from any non-terminal
    state. Stamps `confirmed_at`/`dispatched_at`/`delivered_at`. No
    `SECURITY DEFINER` — same approach as Day 2's `create_order`, RLS
    stays the real gate.
  - `update_payment_status()` — sets `payment_status`/`payment_notes`,
    stamps `payment_confirmed_at` the first time an order is marked
    paid.
  - `alter publication supabase_realtime add table b2c_transactions`.
  - All three verified directly against the live database before any
    UI was built: valid transitions apply and stamp correctly; an
    invalid transition (`requested` → `delivered`, skipping states)
    is rejected with the expected error, and — because the whole test
    ran as one `DO` block — the failed transaction's *creation* rolled
    back too, confirming no partial state is possible either way.
- `/admin/orders` (`order-queue.tsx`) — status-column queue (newest
  first within each column), member alias, item summary, total,
  delivery zone, time waiting (recomputed every 30s so it doesn't go
  stale on screen). Subscribes to Supabase Realtime on
  `b2c_transactions` filtered to the club; on any insert/update it
  re-fetches that one row (with items and member alias embedded, which
  the raw realtime payload doesn't carry) and merges it into local
  state. Transition buttons are context-sensitive to the current
  status; Cancel asks for confirmation first (the state machine has no
  reverse transition, so it's effectively irreversible). Payment
  status/notes editable inline. `wa.me` link to the member carries only
  a short order reference and status label — never item contents,
  extending the courier-privacy principle to the member-facing message
  too.
- `/admin/products` (`product-editor.tsx`) — light admin exactly as
  scoped: editable price per price point (rand input, saves on blur),
  stock status select, product active toggle, plain client-side name
  filter (not a typeahead — no suggestions, just narrows the already-
  loaded list). No new RLS needed; the existing
  `products_staff_write`/`prices_staff_write` "for all" policies
  already cover these updates for staff of the correct club.

**Files touched:**
- `supabase/migrations/20260722230333_order_transitions_and_realtime.sql`
  (new), `src/lib/database.types.ts` (regenerated)
- `src/lib/data/admin-orders-shared.ts` (new — see bug note below),
  `src/lib/data/admin-orders.ts`, `src/lib/data/admin-products.ts` (new)
- `src/lib/actions/admin-orders.ts`, `src/lib/actions/admin-products.ts`
  (new)
- `src/components/admin/order-queue.tsx`,
  `src/components/admin/product-editor.tsx` (new)
- `src/app/admin/orders/page.tsx`, `src/app/admin/products/page.tsx`
  (rewritten from placeholders)

**A real bug the build caught (not me):** `order-queue.tsx` (a client
component) imported `ADMIN_ORDER_SELECT` — a runtime string constant,
not a type — from `admin-orders.ts`, which also contains server-only
code (`next/headers`). That pulled the entire server module into the
client bundle and `pnpm build` failed with a clear import-trace error.
Fixed by splitting the shared types/constant into a new
`admin-orders-shared.ts` with zero server-only imports, and having
both the server data layer and the client component import from
there instead of from each other.

**Decisions made without the founder, in order:**
1. Cancel is irreversible in the state machine (no path back from
   `cancelled`) — not stated explicitly, but implied by only listing
   forward transitions plus cancel. Added a native `confirm()` prompt
   before the Cancel button fires, since accidentally cancelling a
   real member's order would be a real annoyance even though it's not
   destructive at the data level.
2. Historical columns (Delivered, Cancelled) are capped at the 10 most
   recent orders in the UI — the queue metaphor is about active orders;
   nothing in the brief calls for unbounded history here, and Day 4's
   dashboard is explicitly where historical/aggregate data belongs.
3. Payment notes save on blur from an always-visible text input rather
   than a separate edit mode — simplest thing that satisfies "plus
   free-text payment_notes" without a second UI surface.
4. Realtime re-fetches the full row per event instead of trying to
   patch state from the raw payload — the payload only carries
   `b2c_transactions` columns, not the embedded member alias or items
   the card needs to render.

**Deferred:**
- The actual two-phone realtime test — needs the founder's real
  session on the admin side and a real member request on the other.
- Per the brief's own cut list, the member `wa.me` link and the
  waiting counter are the first things to drop if time runs short —
  both are built, so nothing to revisit unless time pressure hits
  later and they need to come back out.

**Verified:** `pnpm tsc --noEmit` and `pnpm build` clean (after fixing
the client/server boundary bug above), all new routes appear in the
build output. All three new RPC functions tested directly against the
live database. Logged-out requests to `/admin/orders` still correctly
redirect to `/login` with no server errors (regression check).

**Next session starts with:** Founder tests the realtime queue and
light admin for real, then Day 4 — demo seed script (~60 days of
plausible historical orders), `/admin/dashboard` with Postgres-side
aggregation, CSV export, PWA pass, merge to `main`, rehearsal.

---

## Day 4 — Dashboard, PWA, rehearsal prep

**Success criterion from the brief:** run the whole demo start to
finish without notes. Everything through the PWA pass is built and
verified; the actual rehearsal is the founder's own job, always was.

**Built:**
- `supabase/seed_demo_orders.sql` — 18 fictional members (no login,
  same shape as invite-before-signup) and ~156 historical orders across
  the last 60 days, weighted busier on Fri/Sat, ~a third of members
  treated as "regulars" for a meaningful repeat-share number. Dry-
  tested with a rollback-instead-of-commit copy first, caught and fixed
  one bug that way (ambiguous `id` column between `product_prices` and
  `products`) before ever touching live data.
- Migration `20260723083622_dashboard_aggregation.sql`:
  - Fixed `v_price_intelligence`'s `tier` column — it read
    `products.tier`, which the catalogue seed never populated
    (`grade_declared`/`cultivation` carry that instead, added *after*
    this view was originally defined in the Day 0 schema). Now falls
    back through `tier → cultivation → grade_declared`.
  - Six new aggregation functions (`get_dashboard_summary`,
    `get_orders_per_day`, `get_top_products`, `get_category_split`,
    `get_price_per_gram_by_tier`, `get_order_timing_heatmap`) — all
    `language sql stable`, no `SECURITY DEFINER`, same RLS-stays-the-
    gate philosophy as every prior RPC.
  - Caught by testing against the real seeded data, not by inspection:
    `get_price_per_gram_by_tier` initially mixed real cultivation tiers
    (indoor/greenhouse/outdoor) with concentrate grade labels (Crumble,
    Budder, Cured Hash Rosin...) because those products are *also*
    gram-priced and picked up the same coalesce'd `tier` column through
    `grade_declared`. Fixed by scoping the function to
    `product_type = 'Flower'` specifically. Since the migration wasn't
    committed yet, fixed in place rather than leaving the bug in for a
    follow-up patch.
  - All six functions tested directly against the live seeded data
    before any UI was built on them.
- `/admin` dashboard: four stat tiles (revenue, orders, average basket,
  repeat-member share) each with a period-over-period delta; orders-
  per-day bar chart with hover detail; top products and category split
  as ranked bar lists; price-per-gram by cultivation tier; an hour ×
  day-of-week order timing heatmap (the brief's own "cut if late" item
  — built anyway since it followed the same pattern cheaply). Per-panel
  CSV export throughout.
- **Consulted the dataviz skill before writing any chart code.** This
  palette is deliberately minimal — most of its seven colors are
  reserved for non-chart UI (gold must stay scarce, wood is cancelled-
  state only, per `docs/design-tokens.md`) — leaving no room for a
  proper colorblind-safe categorical set. Rather than force 5+ distinct
  hues into a 7-color brand palette, every chart uses one sequential hue
  (olive): bar length/opacity encodes magnitude, labels carry identity.
  Sidesteps the categorical-palette problem instead of compromising on
  it. All charts are plain HTML/CSS/SVG — no charting library added.
- PWA pass: `manifest.ts` (Next.js special file), 192/512px icons
  generated at request time via `next/og`'s `ImageResponse` (no image
  assets, no new dependency), `apple-icon.tsx` for the iOS home screen
  icon via the same mechanism, a hand-written service worker
  (`public/sw.js`) that intercepts only page navigations and falls back
  to a static `/offline` page — deliberately never caches API responses
  or dynamic pages, since a stale cached menu/order status would be
  actively misleading for a data-critical app — and a dismissible iOS
  "Add to Home Screen" tooltip (no `beforeinstallprompt` event exists
  on iOS Safari, so there's no standard install banner to hook).

**A real bug, caught by testing rather than the build:** the auth
middleware was gating the manifest, both icon routes, the service
worker file, and the offline page themselves — a logged-out request
for any of them got redirected to `/login` instead of the actual
asset, which would have silently broken PWA installability entirely.
Caught by navigating to `/manifest.webmanifest` in the browser and
getting a login page back instead of JSON. Fixed by adding all five to
`proxy.ts`'s public-path allowlist.

**Files touched:**
- `supabase/seed_demo_orders.sql` (new)
- `supabase/migrations/20260723083622_dashboard_aggregation.sql` (new),
  `src/lib/database.types.ts` (regenerated)
- `src/lib/data/dashboard.ts`, `src/lib/csv.ts` (new)
- `src/components/admin/{stat-tile,bar-list,orders-chart,
  timing-heatmap,export-button}.tsx` (new)
- `src/app/admin/page.tsx` (rewritten from placeholder)
- `src/app/manifest.ts`, `src/app/apple-icon.tsx`,
  `src/app/icon-192/route.tsx`, `src/app/icon-512/route.tsx`,
  `src/app/offline/page.tsx` (new)
- `public/sw.js`, `src/components/service-worker-registration.tsx`,
  `src/components/ios-install-tooltip.tsx` (new)
- `src/app/layout.tsx` (appleWebApp metadata, viewport theme-color,
  wires in the two new components), `src/proxy.ts` (public-path fix)

**Decisions made without the founder, in order:**
1. Demo member phone numbers and aliases are obviously fake
   (`+2782...`, "Demo Member NN") and tagged for idempotent cleanup —
   not stated explicitly, but needed so a re-run never touches real
   accounts or real orders, and so the founder can tell at a glance
   which members are fictional.
2. `get_price_per_gram_by_tier` scoped to Flower only — see the bug
   note above; this is a correctness fix, not a scope decision, but
   flagging it since it changes what the function returns from what a
   first read of the brief might expect.
3. The dashboard's chart palette uses a single hue throughout rather
   than distinct categorical colors — a deliberate, documented
   deviation from "give each category its own color," justified by the
   brand palette's own explicit constraints (see above).
4. Service worker deliberately does *not* implement a full offline-
   first cache strategy (no caching of the menu, prices, or order data)
   — correctness over completeness for a data-critical app; an
   "offline mode" that shows stale prices would be worse than no
   offline mode.
5. iOS install tooltip persists dismissal in `localStorage`, not a per-
   session flag — once dismissed, it stays dismissed on that device.

**Deferred:**
- The rehearsal itself (three timed run-throughs) — inherently the
  founder's job, not something to automate or verify remotely.
- Merging `sprint/mvp` to `main` — held back as a separate, explicit
  step (see below): it's a materially different action from every
  other push this sprint, since `main` is wired to Vercel's
  **production** deployment, not a preview.

**Verified:** `pnpm tsc --noEmit` and `pnpm build` clean (after fixing
the middleware bug above). All 6 aggregation functions and the seed
script tested directly against live data before any UI was built.
Manifest, both icon routes, the offline page, and the service worker
all confirmed reachable without a session; service worker confirmed
registered and active in-browser. Logged-out `/admin` still correctly
redirects to `/login`.

**Next steps:** founder reviews the accumulated four days of work
(proposed as a PR rather than a direct merge, given the size and that
`main` deploys to production), decides when to merge, then rehearses
the demo end to end on real phones per the brief's own instructions.

---

## Phase G — Catalogue metadata, club tiers, and modular product attributes

**Built:** Implemented the proposal in `docs/phase-g-catalogue-metadata.md`
in full. Two migrations, a DML seed, and the schema-driven "Add Product"
admin form the plan's own "Next phase starts with" section called for.

- Migration `20260724134952_catalogue_metadata_and_tiers.sql`:
  - `effects` (global lookup) + `variety_effects` (join table, attached to
    `varieties` not `products` — same reasoning as the plan doc). Same RLS
    shape as the existing `product_types`/`varieties` taxonomy tables
    (any authenticated user reads, only staff write).
  - `club_tiers` (per-club, `unique(club_id, rank)` + `unique(club_id, name)`)
    and `products.club_tier_id` FK. RLS mirrors `products`/`product_prices`
    (club-scoped read, staff write).
  - `product_type_attribute_schemas` — drives the type-specific fields on
    the Add Product form. RLS mirrors `product_types` (global, staff write).
  - `products.base_unit_price_cents` (nullable reference rate) and
    `products.attributes jsonb not null default '{}'`.
  - `v_price_intelligence` extended with `base_unit_price_cents` and a
    read-time `discount_pct` — see Decisions below for why this isn't a
    stored column.
- Migration `20260724141040_create_product_function.sql`:
  `create_product_with_prices()` — atomic product + price-point insert.
  Same pattern as Day 2's `create_order()`: no `SECURITY DEFINER`, RLS
  (`products_staff_write`/`prices_staff_write`) stays the real
  authorization gate, the function's only job is atomicity.
- `supabase/seed_attribute_schemas.sql` (new, DML — lives outside
  `supabase/migrations/` like the other seed files) — 4 illustrative
  attribute-schema rows (`edible`: dosage_mg, servings_per_package;
  `vape-disposable`: device_type, battery_included), idempotent
  (`on conflict ... do nothing`).
- `src/lib/data/admin-products.ts` — added `getProductFormOptions()`
  (product types, varieties, club-scoped tiers, attribute schemas).
- `src/lib/actions/admin-products.ts` — added `createProduct()`, calling
  the new RPC.
- `src/components/admin/add-product-form.tsx` (new) — product type →
  name → strain (variety) picker with read-only strain-type display →
  cultivation/grade/potency → club tier → type-specific fields rendered
  from `product_type_attribute_schemas` (text/number/boolean/select/
  multiselect) → optional base unit rate → package builder (add/remove
  price points, live client-side discount-vs-base preview per row) →
  submit. Plain HTML controls styled with the existing design tokens,
  matching `product-editor.tsx`'s established convention — no new shadcn
  components or dependencies added.
- `src/app/admin/products/page.tsx` — fetches `getProductFormOptions()`
  alongside the existing product list, renders the new form above the
  existing editor.

**Files touched:**
- `supabase/migrations/20260724134952_catalogue_metadata_and_tiers.sql`,
  `supabase/migrations/20260724141040_create_product_function.sql` (new)
- `supabase/seed_attribute_schemas.sql` (new)
- `src/lib/database.types.ts` (regenerated, twice — once per migration)
- `src/lib/data/admin-products.ts`, `src/lib/actions/admin-products.ts`
- `src/components/admin/add-product-form.tsx` (new)
- `src/app/admin/products/page.tsx`
- `docs/phase-g-catalogue-metadata.md` (the plan doc itself, added to the
  repo — it existed only outside the repo when this session started)

**Decisions made:**
1. `product_prices`' quantity/weight columns confirmed live as
   `sell_unit`/`sell_quantity` (matches `00000000000000_schema.sql`) —
   the one thing the plan doc explicitly flagged as unconfirmed.
2. The plan's `product_type_attribute_schemas.product_type_id FK` was
   wrong — `product_types`' primary key is `code` (text), not a synthetic
   `id`. Corrected to `product_type_code`, matching the existing
   `products.product_type_code` convention. Caught by checking live
   `information_schema`, not by re-reading the plan more carefully.
3. `discount_pct` is **not** a stored/generated column. A generated
   column can't reference another table's row (Postgres restriction), and
   a trigger-based store would go stale the moment
   `products.base_unit_price_cents` changes after price points already
   exist. Computed at read time in `v_price_intelligence` instead — same
   treatment `price_per_unit_cents` already gets, and directly matches
   this project's own stated principle in `docs/HANDOFF.md`: "never store
   a derived number that could be computed from source data."
4. Effects are global only for v1 (no per-club override) — the plan's own
   stated default, not overridden.
5. No GIN index on `products.attributes` yet — same call Phase A made for
   its own new columns; no real query pattern against it exists yet.
6. Added `create_product_with_prices()` as a new migration rather than two
   sequential `.insert()` calls from the Server Action — not explicitly
   requested, but `product-editor.tsx` only edits price/stock on rows that
   already exist, it has no "add a price point" UI, so a partial insert
   (product lands, prices fail) would leave a genuinely stuck orphan
   product with no way to fix it from the app. Tested directly against
   live data (happy path + the empty-prices failure path) before any UI
   was built on it, same discipline as every prior RPC.
7. Added "product type" and "name" as required first fields even though
   the plan's literal flow ("strain picker → core fields → tier picker →
   type fields → package builder") didn't list either — both are
   `not null` columns with no default; the form can't submit without them,
   and type-specific fields can't render before the type is known.
8. Left `brand_id`, `is_new_drop`, `is_staff_pick`, `description`, and
   `image_url` out of the Add Product form — not in the plan's field
   list, and `docs/HANDOFF.md` already separately scopes "full product
   CRUD" as its own future item. Adding them here would be scope creep
   past what either document asked for.
9. Seeded 4 illustrative `product_type_attribute_schemas` rows via a new
   DML file rather than leaving the table empty — makes the "form renders
   itself from the schema" behavior something you can actually click
   through and see (`edible`/`vape-disposable` fields appear, `flower`
   doesn't), not just a structurally-correct table with nothing in it.
   Not a full attribute taxonomy — four rows, chosen to match the plan
   doc's own two examples.
10. Worked on a new branch (`feature/phase-g-catalogue-metadata`, off
    `main`) rather than reusing `sprint/mvp` or committing to `main`
    directly — confirmed with the founder first, since `main` and
    `sprint/mvp` were identical (already merged) and `docs/HANDOFF.md`
    itself says to check before reusing either.
11. `create_product_with_prices()`'s generated Supabase RPC arg types came
    back non-nullable for every optional param (the same `supabase gen
    types` gap Day 2's `create_order()` call hit). Day 2's fix — pass `""`
    instead of `null` — doesn't generalize here: an empty string would
    fail the `cultivation` CHECK constraint outright and fail uuid/numeric
    parsing for the rest. Passed real `null` and overrode the incorrect
    generated type via an explicit intermediate type + `unknown` cast,
    documented inline, rather than corrupting the insert to satisfy the
    type checker.

**Deferred:**
- No admin UI to create/browse effects or tag a variety's effects — those
  are variety-level (see the plan doc's own reasoning), which is a future
  variety editor, not something the Add Product form should own.
- No admin UI to author `product_type_attribute_schemas` rows — only the
  4 seeded examples exist; an admin authoring surface for these is future
  work, same as the plan doc's own scoping implied.
- No admin UI to create/rename/reorder `club_tiers` — the live club has
  none yet, so the Add Product form's tier picker will show only the "no
  tier" option until some exist.
- Real interactive click-through of the Add Product form in a logged-in
  staff session — needs the founder's real magic-link login, the same
  constraint every single prior phase (C through Day 4) hit and deferred
  for the same reason.
- Promotional/special pricing (`price_type`) — unrelated to this phase,
  already flagged in Day 4's Known Gaps, still unaddressed.

**Verified:**
- Live schema confirmed via `information_schema`/`pg_get_viewdef` *before*
  writing either migration — `product_prices` column shapes,
  `product_types`' actual primary key, the live (Day-4-fixed)
  `v_price_intelligence` definition, and no naming collisions with any of
  the 4 new tables.
- Both migrations dry-run (`supabase db push --dry-run`), shown to the
  founder, explicitly confirmed, then pushed — not run unilaterally.
- Post-push: all 4 new tables + 3 new `products` columns confirmed live
  via `information_schema`; RLS confirmed enabled
  (`pg_class.relrowsecurity = true`) on all 4 new tables.
- Functional smoke test against live data: inserted a real effect,
  variety_effect, club_tier, and attribute-schema row; set
  `base_unit_price_cents = 15000` on a real seeded flower product (4 real
  price points); `discount_pct` in `v_price_intelligence` matched a hand
  calculation exactly (0%, 8.33%, 5.56%, 10.00%) — including a 2g row a
  first, narrower query missed, caught by re-running without the `limit`.
  All test data deleted afterward, re-queried to confirm zero leftovers.
- `create_product_with_prices()` tested directly against live data before
  any UI touched it: happy path (product + 2 price points + jsonb
  attributes) landed correctly and matched on read-back; failure path
  (empty `p_prices` array) correctly raised and wrote zero rows. Both
  cleaned up, confirmed zero leftovers.
- `pnpm tsc --noEmit` and `pnpm build` both clean; `/admin/products`
  appears in the build's route table.
- Dev server started via the project's own `daggadex-clubos` preview
  config; logged-out request to `/admin/products` still correctly
  redirects to `/login` with no console errors (regression check).
- **Not verified:** the Add Product form's actual in-browser behavior
  behind a real staff login — blocked on the same magic-link constraint
  as every prior phase's UI verification.

**Next phase starts with:** Founder logs in for real and exercises the
Add Product form end to end — a flower product with a strain and a tier,
then an edible or vape product to confirm the type-specific fields
render, save, and round-trip through `products.attributes` correctly.
After that: an admin surface for club_tiers/effects/attribute-schema
authoring (all currently SQL-only), or Day 4's still-open
promotional/special pricing gap — founder's call on priority.
