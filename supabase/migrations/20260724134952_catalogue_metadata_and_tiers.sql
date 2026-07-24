-- Phase G — catalogue metadata, club-specific merchandising tiers, package
-- pricing discount visibility, and per-product-type modular attributes.
--
-- Confirmed live before writing this (information_schema / pg_get_viewdef,
-- not assumed from the schema files on disk):
--   * product_prices' quantity/weight columns are sell_unit (text, CHECK'd)
--     and sell_quantity (numeric(8,3)) — matches 00000000000000_schema.sql.
--   * product_types' primary key is `code` (text), not a synthetic `id` —
--     the plan doc's "product_type_id FK" was wrong; corrected below to
--     product_type_code, matching the existing products.product_type_code
--     convention.
--   * None of effects/variety_effects/club_tiers/
--     product_type_attribute_schemas exist yet — no naming collisions.
--   * v_price_intelligence's LIVE definition already has Day 4's
--     COALESCE(tier, cultivation, grade_declared) fix, which isn't reflected
--     in 00000000000000_schema.sql on disk — replicated exactly below rather
--     than reconstructed from the stale file, so this migration doesn't
--     regress that fix.

-- -----------------------------------------------------------------------------
-- effects  (global taxonomy, same shape as product_types/varieties: any
-- authenticated user reads, only staff write).
-- -----------------------------------------------------------------------------
create table effects (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique,
  slug  text not null unique
);

alter table effects enable row level security;

create policy taxonomy_read_effects on effects
  for select to authenticated using (true);
create policy taxonomy_write_effects on effects
  for all to authenticated using (app_is_staff()) with check (app_is_staff());

-- -----------------------------------------------------------------------------
-- variety_effects  (join table — effects are a property of the strain, not
-- the per-club listing, so they're attached to varieties and shared across
-- every product/club that references the same variety).
-- -----------------------------------------------------------------------------
create table variety_effects (
  variety_id  uuid not null references varieties(id) on delete cascade,
  effect_id   uuid not null references effects(id) on delete cascade,
  primary key (variety_id, effect_id)
);

create index idx_variety_effects_effect on variety_effects(effect_id);

alter table variety_effects enable row level security;

create policy taxonomy_read_variety_effects on variety_effects
  for select to authenticated using (true);
create policy taxonomy_write_variety_effects on variety_effects
  for all to authenticated using (app_is_staff()) with check (app_is_staff());

-- -----------------------------------------------------------------------------
-- club_tiers  (per-club merchandising tier, e.g. "Legendary" / "Fire" /
-- "Light Assisted" — each club names its own; `rank` keeps cross-club
-- comparison possible without parsing arbitrary strings).
-- -----------------------------------------------------------------------------
create table club_tiers (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  name        text not null,
  rank        int  not null,
  created_at  timestamptz not null default now(),
  unique (club_id, rank),
  unique (club_id, name)
);

alter table club_tiers enable row level security;

create policy club_tiers_read on club_tiers
  for select to authenticated
  using (club_id = app_current_club_id());
create policy club_tiers_staff_write on club_tiers
  for all to authenticated
  using (club_id = app_current_club_id() and app_is_staff())
  with check (club_id = app_current_club_id() and app_is_staff());

alter table products
  add column club_tier_id uuid references club_tiers(id) on delete set null;

create index idx_products_club_tier on products(club_tier_id);

-- -----------------------------------------------------------------------------
-- Package pricing: an admin-set reference unit rate on the product, so a
-- package price point can be checked against it. discount_pct is NOT stored
-- (see v_price_intelligence below) — a stored/generated column can't safely
-- track a value that depends on a different row's mutable column
-- (products.base_unit_price_cents changing after price points already
-- exist), and this project's own stated principle is "never store a derived
-- number that could be computed from source data." Computed at read time
-- instead, same as price_per_unit_cents already is.
-- -----------------------------------------------------------------------------
alter table products
  add column base_unit_price_cents int
    check (base_unit_price_cents is null or base_unit_price_cents >= 0);

-- -----------------------------------------------------------------------------
-- product_type_attribute_schemas  (drives the schema-driven "Add Product"
-- form for fields that differ by product type — edible dosage, vape device
-- type, etc. Universal query-critical fields stay as real typed columns on
-- products, unchanged). Global, like product_types itself (not club-scoped).
-- -----------------------------------------------------------------------------
create table product_type_attribute_schemas (
  id                 uuid primary key default gen_random_uuid(),
  product_type_code  text not null references product_types(code) on delete cascade,
  attribute_key      text not null,
  label              text not null,
  input_type         text not null check (input_type in
                          ('text','number','select','multiselect','boolean')),
  options            jsonb,
  sort_order         int  not null default 100,
  unique (product_type_code, attribute_key)
);

alter table product_type_attribute_schemas enable row level security;

create policy taxonomy_read_attribute_schemas on product_type_attribute_schemas
  for select to authenticated using (true);
create policy taxonomy_write_attribute_schemas on product_type_attribute_schemas
  for all to authenticated using (app_is_staff()) with check (app_is_staff());

-- -----------------------------------------------------------------------------
-- products.attributes  (jsonb bag for the type-specific fields above).
-- No GIN index yet — deferred until a real query pattern against it exists,
-- same call Phase A made for its own new columns.
-- -----------------------------------------------------------------------------
alter table products
  add column attributes jsonb not null default '{}'::jsonb;

-- -----------------------------------------------------------------------------
-- v_price_intelligence: add base_unit_price_cents + a read-time discount_pct
-- (never stored/stale). Replicates the LIVE view definition exactly
-- (confirmed via pg_get_viewdef above) plus two new trailing columns —
-- `create or replace view` can only append columns, not reorder/drop them.
-- -----------------------------------------------------------------------------
create or replace view v_price_intelligence as
select
  p.club_id,
  pt.name                         as product_type,
  coalesce(p.tier, p.cultivation, p.grade_declared) as tier,
  v.name                          as strain,
  p.name                          as product_name,
  pp.sell_unit,
  pp.sell_quantity,
  pp.price_cents,
  round(pp.price_cents::numeric / pp.sell_quantity, 2) as price_per_unit_cents,
  pp.stock_status,
  p.base_unit_price_cents,
  case
    when p.base_unit_price_cents is not null and p.base_unit_price_cents > 0
      then round(
        (1 - (round(pp.price_cents::numeric / pp.sell_quantity, 2)
              / p.base_unit_price_cents)) * 100,
        2)
    else null
  end as discount_pct
from product_prices pp
join products      p  on p.id = pp.product_id
join product_types pt on pt.code = p.product_type_code
left join varieties v on v.id = p.variety_id
where p.active and pp.active;
