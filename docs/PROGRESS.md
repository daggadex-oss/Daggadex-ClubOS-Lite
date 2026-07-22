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
