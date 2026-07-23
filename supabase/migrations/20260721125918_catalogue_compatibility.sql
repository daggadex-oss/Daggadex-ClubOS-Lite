-- Day 0 — catalogue compatibility
-- Adds brands, potency, substance class, vendor grade. Nothing structural changes.

create table brands (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid references clubs(id) on delete cascade,
  name          text not null,
  slug          text not null,
  created_at    timestamptz not null default now(),
  unique (slug)
);

alter table products
  add column brand_id uuid references brands(id) on delete set null;

create index idx_products_brand on products(brand_id);

alter table products
  add column potency_amount   numeric(10,3),
  add column potency_unit     text check (potency_unit in ('mg','percent')),
  add column potency_compound text check (potency_compound in
    ('thc','cbd','cbg','cbn','psilocybin','blend')),
  add column potency_basis    text check (potency_basis in
    ('per_serving','per_package','concentration'));

alter table product_types
  add column substance_class text not null default 'cannabis'
  check (substance_class in ('cannabis','psilocybin','functional_mushroom',
                             'cbd','botanical','hardware','accessory'));

alter table products
  add column grade_declared text,
  add column cultivation    text check (cultivation in
    ('indoor','light_assisted_greenhouse','greenhouse','outdoor'));

create index idx_products_cultivation on products(club_id, cultivation);

alter table brands enable row level security;

create policy brands_read on brands
  for select to authenticated using (true);

create policy brands_write on brands
  for all to authenticated
  using (app_is_staff()) with check (app_is_staff());
