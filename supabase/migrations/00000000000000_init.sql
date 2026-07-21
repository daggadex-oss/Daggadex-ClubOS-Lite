-- =============================================================================
-- Daggadex ClubOS Lite — Supabase Schema (MVP)
-- =============================================================================
-- Purpose : Single-club MVP that is multi-tenant from day one, so white-label
--           needs zero rework later. Captures clean, structured order data as
--           its real job (intelligence before commerce).
--
-- Design principles
--   * club_id on every operational table  -> white-label ready
--   * OpenTHC vocabulary (Variety, Product_Type, B2C Transaction/Items)
--   * SI units: cannabis weight stored in GRAMS
--   * Money stored as INTEGER CENTS (ZAR). Never floats for money.
--   * ISO-8601 / timestamptz everywhere (Postgres handles this natively)
--   * Row Level Security ON for every table (Supabase exposes tables publicly
--     via PostgREST — without RLS your whole DB is readable by anyone)
--   * text + CHECK for status fields instead of Postgres ENUMs
--     (altering an enum later is painful; editing a CHECK is trivial)
--
-- How to run : paste the whole file into Supabase Studio -> SQL Editor -> Run.
--              Safe to run on a fresh project. Re-running: drop schema first.
--
-- Note on access: your admin tooling / Claude Code backend using the Supabase
--   service_role key bypasses RLS automatically. RLS below governs the
--   member-facing (anon/authenticated) PWA.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Extensions & generic helpers
-- -----------------------------------------------------------------------------
-- gen_random_uuid() is built into Postgres 13+ (Supabase default). No extension
-- needed. If on older PG, uncomment:
-- create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =============================================================================
-- SHARED TAXONOMY  (global — NOT club-scoped — this is what makes the
-- cross-club Strain Index & benchmarking possible later)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- product_types  (OpenTHC "Product_Type" controlled vocabulary)
-- Reference lookup. Keyed by a readable code so products.product_type_code
-- stays human-legible in queries.
-- -----------------------------------------------------------------------------
create table product_types (
  code        text primary key,          -- e.g. 'flower', 'pre-roll'
  name        text not null,             -- display label
  description text,
  sort_order  int  not null default 100
);

-- -----------------------------------------------------------------------------
-- varieties  (OpenTHC "Variety" = strain). Canonical, UUID-keyed strain index.
-- Seed the bulk of this from the Kushy dataset (source='seed_kushy'); add SA
-- exotics by hand (source='manual'). A product references a variety_id instead
-- of storing a free-text strain name — THIS is the strain-normalization backbone.
-- -----------------------------------------------------------------------------
create table varieties (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,          -- as displayed, e.g. "Godfather OG"
  slug           text not null unique,   -- normalized key, e.g. "godfather-og"
  canonical_name text,                   -- maps spelling variants to one truth
  strain_type    text check (strain_type in ('indica','sativa','hybrid','unknown'))
                      default 'unknown',
  lineage        text,
  description     text,
  source         text not null default 'manual'
                      check (source in ('manual','seed_kushy','import')),
  created_at     timestamptz not null default now()
);


-- =============================================================================
-- TENANT  (clubs + their members)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- clubs  (the tenant). settings jsonb holds flexible per-club config
-- (delivery windows, zones, etc.) so you don't migrate for every tweak.
-- -----------------------------------------------------------------------------
create table clubs (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  status           text not null default 'active'
                        check (status in ('active','paused','archived')),
  min_order_cents  int  not null default 0 check (min_order_cents >= 0),
  currency         text not null default 'ZAR',
  settings         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- members  (links a Supabase auth user to a club, with profile + role).
-- user_id is NULLABLE to support invite-before-signup: you create the member
-- row when you invite them, and link auth.uid() when they complete OTP signup.
-- -----------------------------------------------------------------------------
create table members (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references clubs(id) on delete cascade,
  user_id            uuid references auth.users(id) on delete set null,
  alias              text not null,        -- display name (privacy-first)
  phone              text,                 -- for WhatsApp / OTP
  role               text not null default 'member'
                          check (role in ('member','staff','owner')),
  status             text not null default 'pending'
                          check (status in ('pending','active','suspended')),
  delivery_zone      text,
  delivery_notes     text,
  terms_accepted_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (club_id, user_id)
);


-- =============================================================================
-- INVENTORY  (products + their sellable price points + price history)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- products  (a "thing" a club stocks: a variety in a given format).
-- Price points live in product_prices (one product, many weights/pack sizes).
-- tier = quality tier from the club taxonomy (premium indoor, pops, etc.).
-- variety_id is NULLABLE for non-strain items (e.g. wellness / YeYo).
-- -----------------------------------------------------------------------------
create table products (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references clubs(id) on delete cascade,
  variety_id         uuid references varieties(id) on delete set null,
  product_type_code  text not null references product_types(code),
  name               text not null,        -- display name on the menu
  tier               text check (tier in
                          ('premium-indoor','indoor-pops','greenhouse','outdoor')),
  description        text,
  image_url          text,
  is_new_drop        boolean not null default false,
  is_staff_pick      boolean not null default false,
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- product_prices  (the actual sellable units).
-- Generic (sell_unit, sell_quantity, price_cents) covers the whole menu:
--   flower  -> sell_unit='gram',   sell_quantity=2   (2g)
--   joints  -> sell_unit='joint',  sell_quantity=4   (4 joints)
--   vape    -> sell_unit='device', sell_quantity=1
--   moonstk -> sell_unit='each',   sell_quantity=1
-- Price-per-gram intelligence = price_cents / sell_quantity WHERE sell_unit='gram'.
-- -----------------------------------------------------------------------------
create table product_prices (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products(id) on delete cascade,
  sell_unit      text not null check (sell_unit in
                      ('gram','joint','device','pack','each','ml')),
  sell_quantity  numeric(8,3) not null check (sell_quantity > 0),
  price_cents    int not null check (price_cents >= 0),
  stock_status   text not null default 'in_stock'
                      check (stock_status in ('in_stock','low_stock','out_of_stock')),
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- price_history  (auto-populated by trigger on every price change).
-- This is your price-index intelligence, captured for free from day one.
-- -----------------------------------------------------------------------------
create table price_history (
  id                uuid primary key default gen_random_uuid(),
  product_price_id  uuid not null references product_prices(id) on delete cascade,
  product_id        uuid not null references products(id) on delete cascade,
  price_cents       int not null,
  recorded_at       timestamptz not null default now()
);


-- =============================================================================
-- ORDERS  (OpenTHC "B2C Transaction" + "B2C Transaction Items")
-- Concierge language ("requested") preserved in the status vocabulary.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- b2c_transactions  (an order / "request").
-- Lifecycle timestamps feed delivery-efficiency intelligence later.
-- -----------------------------------------------------------------------------
create table b2c_transactions (
  id                  uuid primary key default gen_random_uuid(),
  club_id             uuid not null references clubs(id) on delete cascade,
  member_id           uuid not null references members(id) on delete restrict,
  status              text not null default 'requested'
                          check (status in
                          ('requested','confirmed','out_for_delivery','delivered','cancelled')),
  payment_status      text not null default 'unpaid'
                          check (payment_status in
                          ('unpaid','eft_pending','paid','refunded')),
  subtotal_cents      int not null default 0 check (subtotal_cents >= 0),
  delivery_fee_cents  int not null default 0 check (delivery_fee_cents >= 0),
  total_cents         int not null default 0 check (total_cents >= 0),
  delivery_zone       text,
  delivery_notes      text,
  requested_at        timestamptz not null default now(),
  confirmed_at        timestamptz,
  delivered_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- b2c_transaction_items  (order line items).
-- SNAPSHOT columns preserve what was actually bought even if the product or its
-- price is later edited or deleted — orders must be immutable historical records.
-- -----------------------------------------------------------------------------
create table b2c_transaction_items (
  id                  uuid primary key default gen_random_uuid(),
  transaction_id      uuid not null references b2c_transactions(id) on delete cascade,
  product_price_id    uuid references product_prices(id) on delete set null,
  variety_id          uuid references varieties(id) on delete set null,
  -- snapshots (filled at order time; never updated afterwards):
  product_name        text not null,
  sell_unit           text not null,
  sell_quantity       numeric(8,3) not null,
  unit_price_cents    int not null check (unit_price_cents >= 0),
  quantity            int not null default 1 check (quantity > 0),
  line_total_cents    int not null check (line_total_cents >= 0),
  created_at          timestamptz not null default now()
);


-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- updated_at auto-touch on all mutable tables
create trigger trg_clubs_updated       before update on clubs
  for each row execute function set_updated_at();
create trigger trg_members_updated     before update on members
  for each row execute function set_updated_at();
create trigger trg_products_updated    before update on products
  for each row execute function set_updated_at();
create trigger trg_prices_updated      before update on product_prices
  for each row execute function set_updated_at();
create trigger trg_txn_updated         before update on b2c_transactions
  for each row execute function set_updated_at();

-- price_history: log on insert and on any price change
create or replace function log_price_change()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT')
     or (new.price_cents is distinct from old.price_cents) then
    insert into price_history (product_price_id, product_id, price_cents)
    values (new.id, new.product_id, new.price_cents);
  end if;
  return new;
end;
$$;

create trigger trg_price_history
  after insert or update on product_prices
  for each row execute function log_price_change();


-- =============================================================================
-- INDEXES  (foreign keys + common filter columns)
-- =============================================================================
create index idx_members_club            on members(club_id);
create index idx_members_user            on members(user_id);
create index idx_products_club           on products(club_id);
create index idx_products_variety        on products(variety_id);
create index idx_products_type           on products(product_type_code);
create index idx_products_active         on products(club_id, active);
create index idx_prices_product          on product_prices(product_id);
create index idx_prices_stock            on product_prices(stock_status);
create index idx_price_history_product   on price_history(product_id, recorded_at);
create index idx_txn_club                on b2c_transactions(club_id);
create index idx_txn_member              on b2c_transactions(member_id);
create index idx_txn_status              on b2c_transactions(club_id, status);
create index idx_txn_items_txn           on b2c_transaction_items(transaction_id);


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- Helper functions are SECURITY DEFINER so they bypass RLS internally and avoid
-- infinite recursion when a policy on `members` needs to read `members`.

create or replace function app_current_club_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select club_id from members
  where user_id = auth.uid() and status = 'active'
  limit 1;
$$;

create or replace function app_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from members
    where user_id = auth.uid()
      and status = 'active'
      and role in ('staff','owner')
  );
$$;

-- Enable RLS everywhere
alter table clubs                   enable row level security;
alter table members                 enable row level security;
alter table product_types           enable row level security;
alter table varieties               enable row level security;
alter table products                enable row level security;
alter table product_prices          enable row level security;
alter table price_history           enable row level security;
alter table b2c_transactions        enable row level security;
alter table b2c_transaction_items   enable row level security;

-- --- Shared taxonomy: any authenticated user reads; only staff write ---------
create policy taxonomy_read_types on product_types
  for select to authenticated using (true);
create policy taxonomy_write_types on product_types
  for all to authenticated using (app_is_staff()) with check (app_is_staff());

create policy taxonomy_read_varieties on varieties
  for select to authenticated using (true);
create policy taxonomy_write_varieties on varieties
  for all to authenticated using (app_is_staff()) with check (app_is_staff());

-- --- clubs: members read their own club --------------------------------------
create policy clubs_read on clubs
  for select to authenticated
  using (id = app_current_club_id());

-- --- members: see yourself; staff see the whole club -------------------------
create policy members_read_self on members
  for select to authenticated
  using (user_id = auth.uid() or (club_id = app_current_club_id() and app_is_staff()));
create policy members_update_self on members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy members_staff_manage on members
  for all to authenticated
  using (club_id = app_current_club_id() and app_is_staff())
  with check (club_id = app_current_club_id() and app_is_staff());

-- --- products / prices: active members of the club read; staff write ---------
create policy products_read on products
  for select to authenticated
  using (club_id = app_current_club_id());
create policy products_staff_write on products
  for all to authenticated
  using (club_id = app_current_club_id() and app_is_staff())
  with check (club_id = app_current_club_id() and app_is_staff());

create policy prices_read on product_prices
  for select to authenticated
  using (product_id in (select id from products where club_id = app_current_club_id()));
create policy prices_staff_write on product_prices
  for all to authenticated
  using (app_is_staff()
    and product_id in (select id from products where club_id = app_current_club_id()))
  with check (app_is_staff()
    and product_id in (select id from products where club_id = app_current_club_id()));

-- --- price_history: staff read only (intelligence surface) -------------------
create policy price_history_read on price_history
  for select to authenticated
  using (app_is_staff()
    and product_id in (select id from products where club_id = app_current_club_id()));

-- --- transactions: member sees own; staff see all in club --------------------
create policy txn_read on b2c_transactions
  for select to authenticated
  using (
    member_id in (select id from members where user_id = auth.uid())
    or (club_id = app_current_club_id() and app_is_staff())
  );
create policy txn_member_insert on b2c_transactions
  for insert to authenticated
  with check (
    club_id = app_current_club_id()
    and member_id in (select id from members where user_id = auth.uid())
  );
create policy txn_staff_update on b2c_transactions
  for update to authenticated
  using (club_id = app_current_club_id() and app_is_staff())
  with check (club_id = app_current_club_id() and app_is_staff());

-- --- transaction items: follow parent transaction visibility -----------------
create policy txn_items_read on b2c_transaction_items
  for select to authenticated
  using (
    transaction_id in (
      select id from b2c_transactions
      where member_id in (select id from members where user_id = auth.uid())
         or (club_id = app_current_club_id() and app_is_staff())
    )
  );
create policy txn_items_insert on b2c_transaction_items
  for insert to authenticated
  with check (
    transaction_id in (
      select id from b2c_transactions
      where member_id in (select id from members where user_id = auth.uid())
    )
  );


-- =============================================================================
-- INTELLIGENCE VIEW  (the payoff — feeds the owner dashboard)
-- Price-per-unit across the live menu; for flower this is price-per-gram.
-- =============================================================================
create or replace view v_price_intelligence as
select
  p.club_id,
  pt.name                         as product_type,
  p.tier,
  v.name                          as strain,
  p.name                          as product_name,
  pp.sell_unit,
  pp.sell_quantity,
  pp.price_cents,
  round(pp.price_cents::numeric / pp.sell_quantity, 2) as price_per_unit_cents,
  pp.stock_status
from product_prices pp
join products      p  on p.id = pp.product_id
join product_types pt on pt.code = p.product_type_code
left join varieties v on v.id = p.variety_id
where p.active and pp.active;


-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Product types (OpenTHC-aligned vocabulary, mapped to the club menu)
insert into product_types (code, name, description, sort_order) values
  ('flower',          'Flower',            'Loose cannabis flower sold by weight', 10),
  ('pre-roll',        'Pre-Roll / Joint',  'Rolled joints and king-size pre-rolls', 20),
  ('moonstick',       'Infused Pre-Roll',  'Moonsticks and infused/coated pre-rolls', 30),
  ('vape-disposable', 'Disposable Vape',   'Live resin/rosin, liquid diamonds, switch devices', 40),
  ('concentrate',     'Concentrate',       'Extracts, rosin, diamonds sold on their own', 50),
  ('edible',          'Edible',            'Ingestible cannabis products', 60),
  ('wellness',        'Botanical / Wellness','Non-cannabis botanicals e.g. sceletium', 70),
  ('other',           'Other',             'Uncategorised', 999);

-- A few example SA varieties (bulk-seed the rest from Kushy as source='seed_kushy')
insert into varieties (name, slug, strain_type, source) values
  ('Godfather OG',        'godfather-og',        'indica', 'manual'),
  ('Red Velvet Ice Cream','red-velvet-ice-cream','hybrid', 'manual'),
  ('Ghost Train Haze',    'ghost-train-haze',    'sativa', 'manual');

-- =============================================================================
-- NEXT STEPS FOR THE BUILD
-- =============================================================================
-- 1. Bulk-import Kushy strains INTO varieties only (name + slug + strain_type,
--    source='seed_kushy'). Ignore Kushy's image URLs (dead links) and its US
--    shop/brand data. This gives strain-name autocomplete in admin CRUD.
-- 2. Create your first club row, then your own member row with role='owner'
--    (do this with the service_role key or in SQL editor — RLS won't block you).
-- 3. Wire Supabase Auth (phone OTP). On signup, link members.user_id = auth.uid().
-- 4. Build admin product CRUD (Day 2), member menu (Day 3), order queue (Day 4),
--    dashboard off v_price_intelligence + b2c_transactions (Day 5).
-- =============================================================================
