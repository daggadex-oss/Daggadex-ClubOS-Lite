## Phase G — Catalogue metadata, club tiers, and modular product attributes (planned)

Not yet built. This is a design proposal for the next build round, written in
the same format as the rest of `docs/PROGRESS.md` so it can be dropped in
as-is once implemented, with "Verified" filled in against the live database
at that time — not assumed here.

**Problem:** The current admin product editor (`product-editor.tsx`) only
covers price/stock/active toggles. There's no way to capture strain effects,
assign a club-specific merchandising tier ("Legendary," "Light Assisted," …),
set a reference unit rate that packages discount against, or add fields for
non-flower product types (edibles, vapes) without a new migration every time.
`is_new_drop`/`is_staff_pick` have also had no admin UI since Day 2.

**Proposed schema additions:**

- `effects` — `id`, `name` (unique), `slug`.
- `variety_effects` — join table, `variety_id` FK → `varieties`, `effect_id` FK
  → `effects`. Attached to **varieties, not products** — effects are a
  property of the strain/genetics, not the specific batch/listing, so this
  keeps them shared across every product row (and every club, eventually)
  that references the same variety instead of re-tagging per listing.
- `club_tiers` — `id`, `club_id` FK, `name` (club's own label), `rank` int,
  unique on `(club_id, rank)` and `(club_id, name)`. `products.club_tier_id`
  FK, nullable. Per-club naming (the whole point — "Legendary" at one club
  might be "Fire" at another), but `rank` is what lets any future
  cross-club reporting compare "top-tier product" without parsing arbitrary
  strings.
- `products.base_unit_price_cents` — the admin-set reference rate (e.g. R150/g
  → `15000`). `product_prices.discount_pct` — computed against the base rate
  at write time (generated column or app-layer calculation; either works),
  so a "5g package" can't silently be entered at a worse per-gram rate than
  the single-unit price, and the existing `v_price_intelligence` /
  price-per-gram dashboard view gets a real discount metric instead of none.
- `product_type_attribute_schemas` — `id`, `product_type_id` FK, `attribute_key`,
  `label`, `input_type` (`text` / `number` / `select` / `multiselect` /
  `boolean`), `options` jsonb (nullable, for select/multiselect), `sort_order`.
  `products.attributes` — `jsonb default '{}'`. Universal, query-critical
  fields (potency, strain type, cultivation, grade, tier) stay as real typed
  columns exactly as they are today — this table is only for the fields that
  differ *by product type* (edible dosage-per-serving, vape device type,
  etc.), so the admin "Add Product" form can render itself from this schema
  instead of a new hardcoded form field every time a product type needs
  something new.

**Decisions made (proposed, for review):**

1. Effects normalized into a lookup + join table rather than free text —
   free text can't be filtered or aggregated ("show everything tagged
   Relaxation"); a shared vocabulary can.
2. Effects attached to `varieties`, not `products` — keeps the strain-level
   data reusable across every listing of that strain, which is also the seed
   of a future shared/canonical strain library (see Deferred).
3. Club tiers are a per-club table with a `rank` int, not a global enum —
   required for white-label (every club names its own tiers), but `rank`
   keeps cross-club comparison possible for Daggadex's own reporting layer.
4. Package pricing derives its discount from a stored base unit rate rather
   than the admin typing an unrelated flat number per price point — removes
   a class of data-entry error (a "discount" that's actually more expensive
   per gram) and feeds the dashboard's existing price-intelligence view.
5. Type-specific metadata lives in `products.attributes` jsonb, governed by
   `product_type_attribute_schemas`, rather than as new nullable columns
   added to `products` per product type — keeps the table from accumulating
   dozens of columns that are `null` for every type except one.
6. The "metadata as a service" idea (Daggadex curating strain data once,
   shared across every white-label club instance) is real and worth pursuing,
   but is a governance decision (who can edit shared vs. club-local data),
   not a schema decision — deferred out of this migration entirely so it
   doesn't get bundled into a smaller ticket by accident.

**Deferred / open questions — do not assume, confirm live:**

- Confirm `product_prices`' existing quantity/weight column name and type via
  a live `information_schema` query before writing the discount computation
  — same discipline as every prior phase (Phase A/Day 1's seed script fixes
  were caught this way, not by inspection).
- Whether effects ever need a club-specific override/addition, or are
  strictly global for v1. Proposal defaults to global-only.
- Governance model for the shared strain library service — separate decision,
  not built here.
- Whether `products.attributes` needs a GIN index now or can wait until a
  real query pattern against it exists (Phase A precedent: indexes were
  deferred for the same reason).

**Not yet done / Verified:** N/A — nothing in this phase has been built.

**Next phase starts with:** New migration
(`supabase/migrations/<timestamp>_catalogue_metadata_and_tiers.sql`,
timestamp TBD at implementation time), `src/lib/database.types.ts`
regenerated, then the schema-driven "Add Product" admin form: strain picker →
always-shown core fields (potency, strain type, cultivation, grade) → tier
picker scoped to the current club → type-specific fields rendered from
`product_type_attribute_schemas` → package builder showing live
discount-per-unit as price points are entered.
