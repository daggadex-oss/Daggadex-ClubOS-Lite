-- =============================================================================
-- DAGGADEX CLUBOS — CATALOGUE SEED
-- Source: The Laughing Buddha, Cape Town — 8 menu pages, July 2026
-- ~185 products, ~330 price points, ~150 varieties
-- =============================================================================
--
-- Corrected against the live schema (see docs/PROGRESS.md for the diff):
--   - varieties insert now generates `slug` (NOT NULL, no default) and
--     conflicts on `slug` instead of `name` (name has no unique constraint).
--   - varieties.strain_type mapped from I/S/H to indica/sativa/hybrid
--     (live CHECK only allows indica/sativa/hybrid/unknown).
--   - product_prices.sell_unit mapped from g/unit to the live CHECK's
--     actual vocabulary (gram/joint/device/pack/each/ml), applied once at
--     the two INSERT...SELECT statements in section 10 rather than
--     touching every literal value in sections 5-7: gram for all g,
--     joint for preroll unit, device for vape_hardware/dab_hardware unit,
--     each for every other unit. ml was already valid, untouched.
--
-- DESTRUCTIVE: section 1 clears all products for the target club.
-- Intended for a fresh seed. Everything runs in one transaction.
--
-- KNOWN LIMITATION: the schema has no price_type column, so promotional
-- prices are seeded as comments, not rows. Seeding "SPECIAL 1x1ml @ R1100"
-- alongside the R1600 list price would silently corrupt any price analysis
-- built on this data later. The specials are listed in section 11.
-- =============================================================================

begin;

-- =============================================================================
-- 1. TARGET CLUB
-- =============================================================================

-- Change this if your BOOTSTRAP_CLUB_SLUG differs.
create temp table target_club as
select id as club_id from clubs where slug = 'demo-club';

do $$
begin
  if not exists (select 1 from target_club) then
    raise exception 'No club found with that slug. Run pnpm bootstrap first, or edit the slug in section 1.';
  end if;
end $$;

delete from products where club_id = (select club_id from target_club);

-- =============================================================================
-- 2. PRODUCT TYPES
-- =============================================================================

insert into product_types (code, name, substance_class) values
  ('flower',                 'Flower',                  'cannabis'),
  ('preroll',                'Joints & Pre-Rolls',      'cannabis'),
  ('moonstick',              'Moonsticks',              'cannabis'),
  ('vape_cart',              'Vape Carts',              'cannabis'),
  ('vape_disposable',        'Disposable Vapes',        'cannabis'),
  ('concentrate_solvent',    'Solvent Extracts',        'cannabis'),
  ('concentrate_solventless','Solventless Extracts',    'cannabis'),
  ('edible',                 'Edibles',                 'cannabis'),
  ('drink',                  'Infused Drinks',          'cannabis'),
  ('thc_cap',                'THC Capsules',            'cannabis'),
  ('fec_oil',                'Full Extract Oil',        'cannabis'),
  ('mushroom',               'Shroom Delights',         'psilocybin'),
  ('nootropic',              'Medicinal Nootropics',    'functional_mushroom'),
  ('cbd_tincture',           'CBD Tinctures',           'cbd'),
  ('cbd_cap',                'CBD Capsules',            'cbd'),
  ('cbd_topical',            'CBD Topicals',            'cbd'),
  ('herbal_blend',           'Herbal Blends',           'botanical'),
  ('botanical',              'Botanical Wellness',      'botanical'),
  ('vape_hardware',          'Batteries & Hardware',    'hardware'),
  ('dab_hardware',           'Dab Gear',                'hardware'),
  ('paraphernalia',          'Paraphernalia',           'accessory')
on conflict (code) do update set substance_class = excluded.substance_class;

-- =============================================================================
-- 3. BRANDS
-- =============================================================================

insert into brands (club_id, name, slug) values
  (null, 'Lazy Boy Extracts',  'lazy-boy'),
  (null, 'Native',             'native'),
  (null, 'D.O.P.E',            'dope'),
  (null, '710',                '710'),
  (null, 'UNI',                'uni'),
  (null, 'Pacman',             'pacman'),
  (null, 'Choice Labs',        'choice-labs'),
  (null, 'Muha Meds',          'muha-meds'),
  (null, 'Whole Melts',        'whole-melts'),
  (null, 'Drip',               'drip'),
  (null, 'Bomb',               'bomb'),
  (null, 'Biggie Smalls',      'biggie-smalls'),
  (null, 'Juicy Fruity',       'juicy-fruity'),
  (null, 'Sodaze',             'sodaze'),
  (null, 'Happy Co',           'happy-co'),
  (null, 'Wonderleaf',         'wonderleaf'),
  (null, 'Leafolo',            'leafolo'),
  (null, 'Delta',              'delta'),
  (null, 'YeYo',               'yeyo'),
  (null, 'Clipper',            'clipper'),
  (null, 'Gizeh',              'gizeh'),
  (null, 'OCB',                'ocb'),
  (null, 'Swisher Sweets',     'swisher-sweets'),
  (null, 'Charlotte''s Web',   'charlottes-web'),
  (null, 'Paul Stamets',       'paul-stamets')
on conflict (slug) do nothing;

-- =============================================================================
-- 4. STAGING TABLES
-- =============================================================================

-- A "band" is a priced grade tier containing many strains — e.g. "5g Legendary
-- Indoor Special" is one price ladder covering 16 strains. This is the core
-- structural fact of the catalogue: the priced unit is the band, not the strain.
create temp table seed_band (
  band_key      text primary key,
  name_prefix   text not null,
  type_code     text not null,
  cultivation   text,
  grade         text,
  sell_unit     text not null
);

create temp table seed_band_strain (
  band_key      text not null,
  strain        text not null,
  strain_type   char(1)
);

create temp table seed_band_price (
  band_key      text not null,
  sell_quantity numeric not null,
  price_cents   int not null,
  stock_status  text not null default 'in_stock'
);

-- Standalone items: branded SKUs, edibles, wellness, hardware, accessories.
create temp table seed_item (
  item_key         text primary key,
  name             text not null,
  type_code        text not null,
  brand_slug       text,
  strain           text,
  strain_type      char(1),
  grade            text,
  cultivation      text,
  potency_amount   numeric,
  potency_unit     text,
  potency_compound text,
  potency_basis    text
);

create temp table seed_item_price (
  item_key      text not null,
  sell_unit     text not null,
  sell_quantity numeric not null,
  price_cents   int not null,
  stock_status  text not null default 'in_stock'
);

-- =============================================================================
-- 5. FLOWER, PRE-ROLLS, MOONSTICKS  (page 1 indoor, page 2 greenhouse/outdoor)
-- =============================================================================

insert into seed_band (band_key, name_prefix, type_code, cultivation, grade, sell_unit) values
  ('li_2g_special',  '2g Legendary Indoor Special',    'flower','indoor','Legendary Indoor Special','g'),
  ('li_2g',          '2g Legendary Indoor',            'flower','indoor','Legendary Indoor','g'),
  ('li_5g_special',  '5g Legendary Indoor Special',    'flower','indoor','Legendary Indoor Special','g'),
  ('li_bigs',        '5g Legendary Indoor Bigs',       'flower','indoor','Legendary Indoor Bigs','g'),
  ('li_pops',        '5g Legendary Indoor Pops',       'flower','indoor','Legendary Indoor Pops','g'),
  ('lag',            'Light Assisted Greenhouse',      'flower','light_assisted_greenhouse','Light Assisted Greenhouse','g'),
  ('lag_pops',       'Light Assisted Greenhouse Pops', 'flower','light_assisted_greenhouse','Light Assisted Greenhouse Pops','g'),
  ('lg',             'Legendary Greenhouse',           'flower','greenhouse','Legendary Greenhouse','g'),
  ('lg_pops',        'Legendary Greenhouse Pops',      'flower','greenhouse','Legendary Greenhouse Pops','g'),
  ('ss_gh',          'Secret Stash Greenhouse',        'flower','greenhouse','Secret Stash Greenhouse','g'),
  ('lao',            'Light Assisted Outdoor',         'flower','outdoor','Light Assisted Outdoor','g'),
  ('lo',             'Legendary Outdoor',              'flower','outdoor','Legendary Outdoor','g'),
  ('li_j1',          'Legendary Indoor 1g Joint',      'preroll','indoor','Legendary Indoor','unit'),
  ('li_j05',         'Legendary Indoor 0.5g Joint',    'preroll','indoor','Legendary Indoor','unit'),
  ('li_j03',         'Legendary Indoor 0.3g Joint',    'preroll','indoor','Legendary Indoor','unit'),
  ('gh_j1',          'Light Assisted Greenhouse 1g Joint',   'preroll','light_assisted_greenhouse','Light Assisted Greenhouse','unit'),
  ('gh_j05',         'Light Assisted Greenhouse 0.5g Joint', 'preroll','light_assisted_greenhouse','Light Assisted Greenhouse','unit'),
  ('gh_j03',         'Light Assisted Greenhouse 0.3g Joint', 'preroll','light_assisted_greenhouse','Light Assisted Greenhouse','unit'),
  ('lo_j1',          'Legendary Outdoor 1g Joint',     'preroll','outdoor','Legendary Outdoor','unit'),
  ('moon_sm',        'Small Moonstick',                'moonstick','indoor','Indoor','unit'),
  ('moon_bg',        'Big Moonstick',                  'moonstick','indoor','Indoor','unit');

insert into seed_band_price (band_key, sell_quantity, price_cents, stock_status) values
  ('li_2g_special', 2, 25000,'in_stock'), ('li_2g_special', 4, 50000,'in_stock'),
  ('li_2g_special', 6, 70000,'in_stock'), ('li_2g_special',10,105000,'in_stock'),

  ('li_2g',   2, 30000,'in_stock'), ('li_2g',   4, 55000,'in_stock'),
  ('li_2g',   6, 85000,'in_stock'), ('li_2g',  10,135000,'in_stock'),

  ('li_5g_special', 5, 60000,'in_stock'), ('li_5g_special',10,120000,'in_stock'),
  ('li_5g_special',20,230000,'low_stock'),

  ('li_bigs', 5, 70000,'in_stock'), ('li_bigs',10,135000,'in_stock'),
  ('li_bigs',20,265000,'out_of_stock'),

  ('li_pops', 5, 60000,'in_stock'), ('li_pops',10,115000,'in_stock'),
  ('li_pops',20,220000,'in_stock'),

  ('lag',     5, 45000,'in_stock'), ('lag',    10, 80000,'in_stock'),
  ('lag',    20,150000,'in_stock'),

  ('lag_pops',5, 40000,'in_stock'), ('lag_pops',10, 75000,'in_stock'),
  ('lag_pops',20,140000,'in_stock'),

  ('lg',      5, 40000,'in_stock'), ('lg',     10, 75000,'in_stock'),
  ('lg',     20,140000,'in_stock'),

  ('lg_pops', 5, 35000,'in_stock'), ('lg_pops',10, 65000,'in_stock'),
  ('lg_pops',20,125000,'in_stock'),

  ('ss_gh',   5, 35000,'in_stock'), ('ss_gh',  10, 65000,'in_stock'),
  ('ss_gh',  20,125000,'low_stock'),

  ('lao',     5, 20000,'in_stock'), ('lao',    10, 40000,'in_stock'),
  ('lao',    20, 80000,'in_stock'),

  ('lo',    7.5, 25000,'in_stock'), ('lo',     15, 45000,'in_stock'),
  ('lo',     30, 85000,'in_stock'),

  ('li_j1',   2, 28000,'in_stock'), ('li_j1',   4, 50000,'in_stock'),
  ('li_j05',  5, 40000,'in_stock'), ('li_j05', 10, 75000,'in_stock'),
  ('li_j03',  5, 30000,'in_stock'), ('li_j03', 10, 55000,'in_stock'),
  ('gh_j1',   3, 30000,'in_stock'), ('gh_j1',   6, 55000,'in_stock'),
  ('gh_j05',  5, 30000,'in_stock'), ('gh_j05', 10, 55000,'in_stock'),
  ('gh_j03',  5, 25000,'in_stock'), ('gh_j03', 10, 45000,'in_stock'),
  ('lo_j1',   5, 25000,'in_stock'), ('lo_j1',  10, 45000,'in_stock'),

  ('moon_sm', 1, 12000,'in_stock'), ('moon_sm', 2, 20000,'in_stock'),
  ('moon_sm', 5, 50000,'in_stock'),
  ('moon_bg', 1, 18000,'in_stock'), ('moon_bg', 2, 32000,'in_stock'),
  ('moon_bg', 3, 45000,'in_stock');

insert into seed_band_strain (band_key, strain, strain_type) values
  ('li_2g_special','Affie Dogwalker','I'), ('li_2g_special','La Rosa','I'),
  ('li_2g_special','Triple OG','I'), ('li_2g_special','Godfather OG','I'),
  ('li_2g_special','Ancient Aliens','I'), ('li_2g_special','Dante''s Descent','S'),

  ('li_2g','Melonatta Runtz','S'), ('li_2g','Dante''s Descent','S'),
  ('li_2g','White Gravy','S'), ('li_2g','Cherry Markers','S'),
  ('li_2g','Candyland Peyote','S'), ('li_2g','Alien Apple Warp','S'),
  ('li_2g','Milk Queen','S'), ('li_2g','Blue Velvet','S'),
  ('li_2g','Cinnamon Milk','I'), ('li_2g','Platinum Kush Breath','I'),
  ('li_2g','Dulce De Uva','I'), ('li_2g','Cherry Cheesecake','I'),
  ('li_2g','Gorilla Glue','I'), ('li_2g','Unicorn Poop','I'),

  ('li_5g_special','La Rosa','I'), ('li_5g_special','Candyland Peyote','S'),
  ('li_5g_special','Dulce De Uva','I'), ('li_5g_special','Godfather OG','I'),
  ('li_5g_special','Affie Dogwalker','I'), ('li_5g_special','Platinum Kush Breath','I'),
  ('li_5g_special','Ancient Aliens','I'), ('li_5g_special','Milk Queen','S'),
  ('li_5g_special','Planet of the Grapes','I'), ('li_5g_special','Dante''s Descent','S'),
  ('li_5g_special','Melonatta Runtz','S'), ('li_5g_special','Alien Apple Warp','S'),
  ('li_5g_special','White Gravy','S'), ('li_5g_special','Cherry Markers','S'),
  ('li_5g_special','Blue Velvet','S'), ('li_5g_special','Highlighter','S'),

  ('li_bigs','Cinnamon Milk','I'), ('li_bigs','Triple OG','I'),
  ('li_bigs','Blue Velvet','S'), ('li_bigs','Alien Apple Warp','S'),
  ('li_bigs','Melonatta Runtz','S'), ('li_bigs','Cherry Markers','S'),
  ('li_bigs','Cherry Cheesecake','I'), ('li_bigs','Godfather OG','I'),
  ('li_bigs','Vanilla Cream Pie','I'), ('li_bigs','Dulce De Uva','I'),
  ('li_bigs','Affie Dogwalker','I'), ('li_bigs','Unicorn Poop','I'),

  ('li_pops','Dante''s Inferno','I'), ('li_pops','Pink Guava','S'),
  ('li_pops','Peanut Butter Jelly',null), ('li_pops','Beach Truffles','I'),
  ('li_pops','Vanilla Cheesecake','I'), ('li_pops','Blue Cheese','I'),
  ('li_pops','Brandywine','S'), ('li_pops','Milk Queen','S'),
  ('li_pops','Motorbreath x Purple Punch','I'), ('li_pops','Orange OG','I'),
  ('li_pops','Cherry Pie','I'), ('li_pops','Vin Diesel','S'),
  ('li_pops','Candyland Peyote','S'),

  ('lag','Strawberry Haze','S'), ('lag','Ghost Train Haze','S'),
  ('lag','Blucci Zkittlez','S'),

  ('lag_pops','Black Cherry Punch','I'), ('lag_pops','Banana Crumble','H'),
  ('lag_pops','Krazy Runtz','I'), ('lag_pops','Ghost Train Haze','S'),
  ('lag_pops','Forbiddos','I'),

  ('lg','Hella Jelly','S'), ('lg','Wedding Cake','H'), ('lg','Black Cherry','I'),
  ('lg','Double Stack','I'), ('lg','Gorilla Zkittlez','I'), ('lg','Holy Grail','I'),
  ('lg','Lambs Breath','S'), ('lg','Purple Sunset','I'), ('lg','Fumez','H'),
  ('lg','Smackman','H'),

  ('lg_pops','Hella Jelly','S'), ('lg_pops','Banana Biscotti','I'),
  ('lg_pops','Gorilla Zkittlez','I'), ('lg_pops','Smackman','H'),
  ('lg_pops','Blueberry Sherbet','H'),

  ('ss_gh','Iced Apples','H'), ('ss_gh','Critical Jack','S'), ('ss_gh','Mimosa','S'),

  ('lao','Chimera Cherries','H'), ('lao','Chernobyl Cream','S'),
  ('lao','South Beach','S'), ('lao','Black Putang','I'),
  ('lao','Frozen Gelato','I'), ('lao','Honey Gooey','I'),
  ('lao','Orange Chernobyl','S'), ('lao','Supreme Putang','I'),
  ('lao','Purple Wedding','I'),

  ('lo','Trainwreck','S'), ('lo','Big Buddha Cheese','I'),

  ('li_j1','Planet of the Grapes','I'), ('li_j1','Vanilla Cheesecake','I'),
  ('li_j1','Berner''s Cookies','I'), ('li_j1','Colin OG','I'),
  ('li_j05','Colin OG','I'),
  ('li_j03','Colin OG','I'),
  ('gh_j1','Ghost Train Haze','S'), ('gh_j1','Krazy Runtz','I'),
  ('gh_j05','Ghost Train Haze','S'), ('gh_j05','Krazy Runtz','I'),
  ('gh_j03','Ghost Train Haze','S'), ('gh_j03','Krazy Runtz','I'),
  ('lo_j1','Strawguava','I'), ('lo_j1','Cherry Kush','I'),

  ('moon_sm','Watermelon OG','H'), ('moon_sm','Banana Sherbet','H'),
  ('moon_bg','Watermelon OG','H'), ('moon_bg','Banana Sherbet','H'),
  ('moon_bg','Tropic Thunder','S');

-- =============================================================================
-- 6. VAPES, CONCENTRATES, HARDWARE  (Lazy Boy pages)
-- =============================================================================

insert into seed_item (item_key, name, type_code, brand_slug, strain, strain_type, grade) values
  ('cart_gp','Lazy Boy 1ml CCell Cart — Gary Payton','vape_cart','lazy-boy','Gary Payton','H','Live Hash Rosin'),
  ('batt_650','650mAh 510 Thread Battery','vape_hardware',null,null,null,'Discreet'),

  ('nat_rainbow','Native 1ml Disposable — Rainbow Marker','vape_disposable','native','Rainbow Marker','I','Live Rosin'),
  ('nat_block','Native 1ml Disposable — Blockberry','vape_disposable','native','Blockberry','I','Live Rosin'),
  ('nat_deep','Native 1ml Disposable — Deep Space','vape_disposable','native','Deep Space','I','Live Rosin'),
  ('nat_cake','Native 1ml Disposable — Cakemera','vape_disposable','native','Cakemera','I','Live Rosin'),
  ('nat_sub','Native 1ml Disposable — Sub Zero','vape_disposable','native','Sub Zero','I','Live Rosin'),
  ('nat_delta','Native 1ml Disposable — Delta IX','vape_disposable','native','Delta IX','S','Live Rosin'),
  ('nat_sour','Native 1ml Disposable — Sour Diesel','vape_disposable','native','Sour Diesel','S','Live Rosin'),
  ('nat_space','Native 1ml Disposable — Space Candy','vape_disposable','native','Space Candy','S','Live Rosin'),
  ('nat_durban','Native 1ml Disposable — Durban Poison','vape_disposable','native','Durban Poison','S','Live Rosin'),
  ('nat_citra','Native 1ml Disposable — Citradelic Sunset','vape_disposable','native','Citradelic Sunset','S','Live Rosin'),

  ('dope_bbp','D.O.P.E 0.5ml Disposable — Blueberry Banana Pancakes','vape_disposable','dope','Blueberry Banana Pancakes','I','Live Resin'),
  ('dope_sj','D.O.P.E 0.5ml Disposable — Strawberry Jelly','vape_disposable','dope','Strawberry Jelly','I','Live Resin'),
  ('dope_tb','D.O.P.E 0.5ml Disposable — Tangie Banana','vape_disposable','dope','Tangie Banana','S','Live Resin'),
  ('dope_ap','D.O.P.E 0.5ml Disposable — Atomic Pop','vape_disposable','dope','Atomic Pop','S','Live Resin'),
  ('dope_pl','D.O.P.E 0.5ml Disposable — Pink Lemonade','vape_disposable','dope','Pink Lemonade','S','Live Resin'),
  ('dope_pw','D.O.P.E 0.5ml Disposable — Pineapple Whip','vape_disposable','dope','Pineapple Whip','S','Live Resin'),

  ('710_pm','710 1ml Disposable — Permanent Marker','vape_disposable','710','Permanent Marker','I','Live Resin'),
  ('710_slh','710 1ml Disposable — Super Lemon Haze','vape_disposable','710','Super Lemon Haze','S','Live Resin'),
  ('710_dg','710 1ml Disposable — Durban Gelato','vape_disposable','710','Durban Gelato','S','Live Resin'),
  ('710_ogp','710 1ml Disposable — OG Paradise','vape_disposable','710','OG Paradise','S','Live Resin'),
  ('710_km','710 1ml Disposable — Kush Mintz','vape_disposable','710','Kush Mintz','I','Live Resin'),

  -- 3-in-1 switch devices carry two strains. The schema holds one variety_id,
  -- so both names live in the product name. See schema audit, gap 8.
  ('uni_1','UNI 2ml 3in1 — Apple Slushie + Slime','vape_disposable','uni','Apple Slushie','H','Live Resin + Liquid Diamonds'),
  ('uni_2','UNI 2ml 3in1 — Unilato + Mystery Flavour','vape_disposable','uni','Unilato','H','Live Resin + Liquid Diamonds'),
  ('pac_1','Pacman 2ml — Blue Razz Blowpopz','vape_disposable','pacman','Blue Razz Blowpopz','H','Live Resin + Liquid Diamonds'),
  ('pac_2','Pacman 2ml — Peach Rings','vape_disposable','pacman','Peach Rings','I','Live Resin + Liquid Diamonds'),
  ('cl_1','Choice Labs 2ml 3in1 — White Peach Freeze + Toxic Paradise','vape_disposable','choice-labs','White Peach Freeze','I','Live Resin + Liquid Diamonds'),
  ('cl_2','Choice Labs 2ml 3in1 — Hibiscus Rush + Airhead Extremes','vape_disposable','choice-labs','Hibiscus Rush','H','Live Resin + Liquid Diamonds'),
  ('cl_3','Choice Labs 2ml 3in1 — Tropical Lime + Orange Creme','vape_disposable','choice-labs','Tropical Lime','I','Live Resin + Liquid Diamonds'),
  ('mm_1','Muha Meds 2ml — Horchata','vape_disposable','muha-meds','Horchata','I','Live Resin + Liquid Diamonds'),
  ('mm_2','Muha Meds 2ml — Pineapple Paradise','vape_disposable','muha-meds','Pineapple Paradise','H','Live Resin + Liquid Diamonds'),
  ('wm_1','Whole Melts 2ml — Black-scotti','vape_disposable','whole-melts','Black-scotti','I','Live Resin + Liquid Diamonds'),
  ('wm_2','Whole Melts 2ml — Georgia Pie','vape_disposable','whole-melts','Georgia Pie','I','Live Resin + Liquid Diamonds'),
  ('drip_1','Drip 2ml 3in1 — Sour Diesel + Skywalker OG','vape_disposable','drip','Sour Diesel','S','Live Resin + Liquid Diamonds'),
  ('drip_2','Drip 2ml 3in1 — Sunset Pie + Creamsicle','vape_disposable','drip','Sunset Pie','H','Live Resin + Liquid Diamonds'),

  ('cr_ogp','Crumble — Orange Gorilla Princess','concentrate_solvent','lazy-boy','Orange Gorilla Princess','S','Crumble'),
  ('cr_gz','Crumble — Gorilla Zkittlez','concentrate_solvent','lazy-boy','Gorilla Zkittlez','H','Crumble'),
  ('cr_dp','Crumble — Durban Poison','concentrate_solvent','lazy-boy','Durban Poison','S','Crumble'),
  ('cr_cc','Crumble — Cotton Candy','concentrate_solvent','lazy-boy','Cotton Candy','H','Crumble'),
  ('cr_bk','Crumble — Bulba Kush','concentrate_solvent','lazy-boy','Bulba Kush','H','Crumble'),
  ('hc_ss','Honeycomb — Sunset Sherbet','concentrate_solvent','lazy-boy','Sunset Sherbet','H','Honeycomb'),
  ('hc_pe','Honeycomb — Pineapple Express','concentrate_solvent','lazy-boy','Pineapple Express','S','Honeycomb'),
  ('hc_bb','Honeycomb — Banana Blaze','concentrate_solvent','lazy-boy','Banana Blaze','H','Honeycomb'),
  ('hc_lo','Honeycomb — Lemon OG','concentrate_solvent','lazy-boy','Lemon OG','H','Honeycomb'),
  ('hc_gas','Honeycomb — Gas','concentrate_solvent','lazy-boy','Gas','H','Honeycomb'),
  ('bd_ogp','Budder — Orange Gorilla Princess','concentrate_solvent','lazy-boy','Orange Gorilla Princess','S','Budder'),
  ('bd_pe','Budder — Pineapple Express','concentrate_solvent','lazy-boy','Pineapple Express','S','Budder'),
  ('bd_dp','Budder — Durban Poison','concentrate_solvent','lazy-boy','Durban Poison','S','Budder'),
  ('bd_cc','Budder — Cotton Candy','concentrate_solvent','lazy-boy','Cotton Candy','H','Budder'),
  ('bd_bk','Budder — Bulba Kush','concentrate_solvent','lazy-boy','Bulba Kush','H','Budder'),
  ('bd_lo','Budder — Lemon OG','concentrate_solvent','lazy-boy','Lemon OG','H','Budder'),
  ('bd_gas','Budder — Gas','concentrate_solvent','lazy-boy','Gas','H','Budder'),

  ('chr_bcp','Cured Hash Rosin — Black Cherry Punch','concentrate_solventless','lazy-boy','Black Cherry Punch','H','Cured Hash Rosin'),
  ('chr_soc','Cured Hash Rosin — Sour OG Cheese','concentrate_solventless','lazy-boy','Sour OG Cheese','H','Cured Hash Rosin'),
  ('chr_okc','Cured Hash Rosin — Orange Kush Cake','concentrate_solventless','lazy-boy','Orange Kush Cake','H','Cured Hash Rosin'),
  ('lhr_pc','Live Hash Rosin — Perm Cherries','concentrate_solventless','lazy-boy','Perm Cherries','S','Live Hash Rosin'),
  ('lhr_pm','Live Hash Rosin — Permanent Marker','concentrate_solventless','lazy-boy','Permanent Marker','H','Live Hash Rosin'),
  ('lhr_rs11','Live Hash Rosin — RS11 / Rainbow Sherbet #11','concentrate_solventless','lazy-boy','Rainbow Sherbet #11','H','Live Hash Rosin'),

  ('erig_w','Cosmic Bomb e-Rig — White','dab_hardware','bomb',null,null,'Portable Dab e-Rig'),
  ('erig_b','Cosmic Bomb e-Rig — Black','dab_hardware','bomb',null,null,'Portable Dab e-Rig'),
  ('erig_r','Cosmic Bomb e-Rig — Rainbow (Limited Edition)','dab_hardware','bomb',null,null,'Portable Dab e-Rig');

insert into seed_item (item_key, name, type_code, brand_slug, strain, strain_type, grade,
                       potency_amount, potency_unit, potency_compound, potency_basis) values
  ('med_cw','Medicinal — Charlotte''s Web','concentrate_solvent','charlottes-web','Charlotte''s Web',null,'Medicinal',
   86,'percent','cbd','concentration');

insert into seed_item_price (item_key, sell_unit, sell_quantity, price_cents, stock_status) values
  ('cart_gp','ml', 1,100000,'in_stock'), ('cart_gp','ml', 2,180000,'in_stock'),
  ('cart_gp','ml', 4,340000,'in_stock'), ('cart_gp','ml',10,825000,'in_stock'),
  ('batt_650','unit',1,45000,'in_stock'),
  ('erig_w','unit',1,350000,'in_stock'),
  ('erig_b','unit',1,350000,'in_stock'),
  ('erig_r','unit',1,400000,'low_stock');

-- Native / 710 1ml disposables share one ladder.
insert into seed_item_price (item_key, sell_unit, sell_quantity, price_cents)
select k, 'ml', q, p from (values
  ('nat_rainbow'),('nat_block'),('nat_deep'),('nat_cake'),('nat_sub'),
  ('nat_delta'),('nat_sour'),('nat_space'),('nat_durban'),('nat_citra'),
  ('710_pm'),('710_slh'),('710_dg'),('710_ogp'),('710_km')
) as items(k)
cross join (values (1,160000),(2,180000),(4,340000),(10,825000)) as tiers(q,p);

-- D.O.P.E 0.5ml ladder.
insert into seed_item_price (item_key, sell_unit, sell_quantity, price_cents)
select k, 'ml', q, p from (values
  ('dope_bbp'),('dope_sj'),('dope_tb'),('dope_ap'),('dope_pl'),('dope_pw')
) as items(k)
cross join (values (0.5,80000),(2,240000),(5,600000)) as tiers(q,p);

-- 2ml devices, flat R1400.
insert into seed_item_price (item_key, sell_unit, sell_quantity, price_cents)
select k, 'ml', 2, 140000 from (values
  ('uni_1'),('uni_2'),('pac_1'),('pac_2'),('cl_1'),('cl_2'),('cl_3'),
  ('mm_1'),('mm_2'),('wm_1'),('wm_2'),('drip_1'),('drip_2')
) as items(k);

-- Solvent extracts: 1g R350 / 2g R600.
insert into seed_item_price (item_key, sell_unit, sell_quantity, price_cents)
select k, 'g', q, p from (values
  ('cr_ogp'),('cr_gz'),('cr_dp'),('cr_cc'),('cr_bk'),
  ('hc_ss'),('hc_pe'),('hc_bb'),('hc_lo'),('hc_gas'),
  ('bd_ogp'),('bd_pe'),('bd_dp'),('bd_cc'),('bd_bk'),('bd_lo'),('bd_gas'),
  ('med_cw')
) as items(k)
cross join (values (1,35000),(2,60000)) as tiers(q,p);

-- Cured hash rosin.
insert into seed_item_price (item_key, sell_unit, sell_quantity, price_cents)
select k, 'g', q, p from (values ('chr_bcp'),('chr_soc'),('chr_okc')) as items(k)
cross join (values (1,50000),(2,90000),(4,160000),(10,400000)) as tiers(q,p);

-- Live hash rosin.
insert into seed_item_price (item_key, sell_unit, sell_quantity, price_cents)
select k, 'g', q, p from (values ('lhr_pc'),('lhr_pm'),('lhr_rs11')) as items(k)
cross join (values (1,60000),(2,110000),(4,200000),(10,450000)) as tiers(q,p);

-- =============================================================================
-- 7. EDIBLES, SHROOMS, DRINKS, WELLNESS, PARAPHERNALIA
-- =============================================================================

insert into seed_item (item_key, name, type_code, brand_slug, strain, strain_type, grade,
                       potency_amount, potency_unit, potency_compound, potency_basis) values
  ('cook_tcc','Space Cookies — Triple Choc-Chip','edible','biggie-smalls',null,null,'Pack of 3',240,'mg','thc','per_serving'),
  ('cook_astro','Space Cookies — Astrochip','edible','biggie-smalls',null,null,'Pack of 3',240,'mg','thc','per_serving'),
  ('chew_jf','Juicy Fruity Chews — Mixed Fruit 10 Pack','edible','juicy-fruity',null,null,'10 Pack',50,'mg','thc','per_serving'),
  ('gum_bb','Buddha Gummy Bears','edible',null,null,null,'25mg per gummy',25,'mg','thc','per_serving'),
  ('lolly_25','The Buddha''s Lollipops — 25mg','edible',null,null,null,'Sativa & Indica options',25,'mg','thc','per_serving'),
  ('lolly_125','The Buddha''s Lollipops — 125mg','edible',null,null,null,'Sativa & Indica options',125,'mg','thc','per_serving'),

  ('slab_star','Happyslabs Stargazer','mushroom','happy-co',null,null,'1g Slab',null,null,null,null),
  ('slab_25','Happy Co. Happyslabs Chocolate Bar','mushroom','happy-co',null,null,'2.5g Bar — 12 pieces',null,null,null,null),
  ('heart_1','HappyHearts 1g — Ecuador / Trinity / Z-Strain','mushroom','happy-co',null,null,'Macrodosing',null,null,null,null),
  ('heart_25','HappyHearts 2.5g — Stargazer','mushroom','happy-co',null,null,'Macrodosing',null,null,null,null),
  ('heart_5','HappyHearts 5g — Mexi-Cube','mushroom','happy-co',null,null,'Macrodosing',null,null,null,null),
  ('caps_500','HappyCaps 500mg x 10','mushroom','happy-co',null,null,'Vegan',500,'mg','psilocybin','per_serving'),
  ('caps_250','HappyCaps 250mg x 10','mushroom','happy-co',null,null,'Vegan',250,'mg','psilocybin','per_serving'),
  ('caps_alaca','HappyCaps Alacabenzi 110mg x 10','mushroom','happy-co',null,null,'Vegan',110,'mg','psilocybin','per_serving'),
  ('caps_250_30','HappyCaps 250mg x 30','mushroom','happy-co',null,null,'Vegan',250,'mg','psilocybin','per_serving'),
  ('stamets','Paul Stamet Stack+','mushroom','paul-stamets',null,null,'Premium Stack',100,'mg','psilocybin','per_package'),

  ('soda_bh','Sodaze — Berry Haze','drink','sodaze',null,null,'250ml can',30,'mg','thc','per_package'),
  ('soda_bc','Sodaze — Bob''s Cola','drink','sodaze',null,null,'250ml can',30,'mg','thc','per_package'),
  ('soda_cp','Sodaze — Cherry Pop','drink','sodaze',null,null,'250ml can',30,'mg','thc','per_package'),
  ('soda_lm','Sodaze — Lemon Meringue','drink','sodaze',null,null,'250ml can',30,'mg','thc','per_package'),
  ('soda_tp','Sodaze — Tropical Punch','drink','sodaze',null,null,'250ml can',30,'mg','thc','per_package'),
  ('soda_oc','Sodaze — Orange Cream','drink','sodaze',null,null,'250ml can',30,'mg','thc','per_package'),
  ('soda_bl','Sodaze — Blueberry Lemonade','drink','sodaze',null,null,'250ml can',30,'mg','thc','per_package'),
  ('limonada','Limonada — Condensed Milk + Lime','drink','sodaze',null,null,'250ml can — Limited',30,'mg','thc','per_package'),

  ('noot_mai','Maitake','nootropic',null,null,null,'30 veggie caps',400,'mg','blend','per_serving'),
  ('noot_shi','Shiitake','nootropic',null,null,null,'30 veggie caps',400,'mg','blend','per_serving'),
  ('noot_cha','Chaga','nootropic',null,null,null,'30 veggie caps',400,'mg','blend','per_serving'),
  ('noot_tur','Turkey Tail','nootropic',null,null,null,'30 veggie caps',400,'mg','blend','per_serving'),
  ('noot_lio','Lion''s Mane','nootropic',null,null,null,'30 veggie caps',400,'mg','blend','per_serving'),
  ('noot_rei','Reishi','nootropic',null,null,null,'30 veggie caps',400,'mg','blend','per_serving'),
  ('noot_cor','Cordyceps','nootropic',null,null,null,'30 veggie caps',400,'mg','blend','per_serving'),

  ('fec','FEC Clicker Syringe','fec_oil',null,null,null,'Full Extract Cannabis Oil',null,null,null,null),

  ('leaf_lt','Leafolo — Lion''s Tail Blend','herbal_blend','leafolo',null,null,'Nicotine-free',null,null,null,null),
  ('leaf_hemp','Leafolo — Hemp Blend','herbal_blend','leafolo',null,null,'Nicotine-free',null,null,null,null),
  ('leaf_kan','Leafolo — Kanna Blend (Sceletium)','herbal_blend','leafolo',null,null,'Nicotine-free',null,null,null,null),
  ('yeyo','YeYo Sceletium Extract','botanical','yeyo',null,null,'16x Extract Strength',30,'mg','blend','per_serving'),

  ('wl_pain_10','Wonderleaf PAIN Tincture 10ml','cbd_tincture','wonderleaf',null,null,'1000mg',1000,'mg','cbd','per_package'),
  ('wl_pain_30','Wonderleaf PAIN Tincture 30ml','cbd_tincture','wonderleaf',null,null,'3000mg',3000,'mg','cbd','per_package'),
  ('wl_calm_10','Wonderleaf CALM Tincture 10ml','cbd_tincture','wonderleaf',null,null,'1000mg',1000,'mg','cbd','per_package'),
  ('wl_calm_30','Wonderleaf CALM Tincture 30ml','cbd_tincture','wonderleaf',null,null,'3000mg',3000,'mg','cbd','per_package'),
  ('wl_pets_10','Wonderleaf PETS Tincture 10ml','cbd_tincture','wonderleaf',null,null,'300mg',300,'mg','cbd','per_package'),
  ('wl_pets_30','Wonderleaf PETS Tincture 30ml','cbd_tincture','wonderleaf',null,null,'600mg',600,'mg','cbd','per_package'),

  ('cbd_broad','Broad Spectrum CBD Capsules','cbd_cap',null,null,null,'30 capsules',20,'mg','cbd','per_serving'),
  ('cbd_mood','Mood Enhancer Caps','cbd_cap','wonderleaf',null,null,'30 capsules',25,'mg','cbd','per_serving'),
  ('cbd_calm100','Calm & Relaxation Caps 100mg','cbd_cap','wonderleaf',null,null,'30 capsules',100,'mg','cbd','per_serving'),
  ('cbd_sleep','Sleep Easy Caps','cbd_cap','wonderleaf',null,null,'30 capsules',50,'mg','cbd','per_serving'),
  ('cbd_period','Period Pain Caps','cbd_cap','wonderleaf',null,null,'30 capsules',250,'mg','cbd','per_serving'),
  ('cbd_paininf','Pain & Inflammation Caps','cbd_cap','wonderleaf',null,null,'30 capsules',250,'mg','cbd','per_serving'),
  ('cbd_calm250','Calm & Relaxation Caps 250mg','cbd_cap','wonderleaf',null,null,'30 capsules',250,'mg','cbd','per_serving'),
  ('cbd_roll','Pain Roll On 10ml','cbd_topical',null,null,null,'240mg',240,'mg','cbd','per_package'),
  ('cbd_cream','Full Spectrum Pain Cream 100ml','cbd_topical',null,null,null,null,null,null,null,null),

  ('para_sw_c','Swisher Sweets Classic','paraphernalia','swisher-sweets',null,null,'2 cigars',null,null,null,null),
  ('para_sw_m','Swisher Sweets Mini Cigarillos','paraphernalia','swisher-sweets',null,null,null,null,null,null,null),
  ('para_gizeh','GIZEH Papers with Tips','paraphernalia','gizeh',null,null,null,null,null,null,null),
  ('para_ocb','OCB Tips','paraphernalia','ocb',null,null,null,null,null,null,null),
  ('para_clip_box','Clipper Regular — Display Box','paraphernalia','clipper',null,null,null,null,null,null,null),
  ('para_clip_reg','Clipper Regular','paraphernalia','clipper',null,null,null,null,null,null,null),
  ('para_clip_mini','Clipper Mini','paraphernalia','clipper',null,null,null,null,null,null,null),
  ('para_nectar','Nectar Collector','paraphernalia',null,null,null,null,null,null,null,null);

-- Delta THC caps: 10 strains, all 25mg x 60 @ R420.
insert into seed_item (item_key, name, type_code, brand_slug, strain, strain_type, grade,
                       potency_amount, potency_unit, potency_compound, potency_basis)
select 'delta_' || lower(replace(s,' ','_')),
       'Delta THC Caps 25mg x60 — ' || s,
       'thc_cap','delta', s, t, 'Full spectrum, strain specific',
       25,'mg','thc','per_serving'
from (values
  ('OG Kush','I'),('Girl Scout Cookies','I'),('Blue Dream','S'),('Gelato','H'),
  ('Northern Lights','I'),('Sour Diesel','S'),('Pineapple Express','S'),
  ('Maui Wowie','S'),('Jack Herer','S'),('Skywalker OG','I')
) as v(s,t);

insert into seed_item_price (item_key, sell_unit, sell_quantity, price_cents, stock_status) values
  ('cook_tcc','unit',3,25000,'in_stock'), ('cook_tcc','unit',6,45000,'in_stock'),
  ('cook_tcc','unit',9,60000,'in_stock'),
  ('cook_astro','unit',3,25000,'in_stock'), ('cook_astro','unit',6,45000,'in_stock'),
  ('cook_astro','unit',9,60000,'in_stock'),
  ('chew_jf','unit',10,30000,'in_stock'),
  ('gum_bb','unit',10,25000,'in_stock'), ('gum_bb','unit',40,80000,'in_stock'),
  ('lolly_25','unit',1,3000,'in_stock'),
  ('lolly_125','unit',1,9000,'in_stock'),

  ('slab_star','g',1,30000,'in_stock'),
  ('slab_25','g',2.5,45000,'in_stock'),
  ('heart_1','g',1,35000,'in_stock'),
  ('heart_25','g',2.5,45000,'in_stock'),
  ('heart_5','g',5,80000,'in_stock'),
  ('caps_500','unit',10,65000,'out_of_stock'),
  ('caps_250','unit',10,45000,'out_of_stock'),
  ('caps_alaca','unit',10,22000,'in_stock'),
  ('caps_250_30','unit',30,90000,'out_of_stock'),
  ('stamets','unit',1,80000,'in_stock'),

  ('fec','ml',1,35000,'in_stock'), ('fec','ml',2,60000,'in_stock'),
  ('fec','ml',4,100000,'in_stock'), ('fec','ml',10,200000,'in_stock'),

  ('leaf_lt','unit',1,9000,'in_stock'),
  ('leaf_hemp','unit',1,12000,'in_stock'),
  ('leaf_kan','unit',1,17000,'in_stock'),
  ('yeyo','g',1,30000,'in_stock'), ('yeyo','g',2,55000,'in_stock'),
  ('yeyo','g',4,100000,'in_stock'),

  ('wl_pain_10','ml',10,60000,'in_stock'), ('wl_pain_30','ml',30,90000,'in_stock'),
  ('wl_calm_10','ml',10,60000,'in_stock'), ('wl_calm_30','ml',30,90000,'in_stock'),
  ('wl_pets_10','ml',10,20000,'in_stock'), ('wl_pets_30','ml',30,25000,'in_stock'),

  ('cbd_broad','unit',1,20000,'in_stock'), ('cbd_broad','unit',2,35000,'in_stock'),
  ('cbd_mood','unit',1,16000,'in_stock'),
  ('cbd_calm100','unit',1,42000,'in_stock'),
  ('cbd_sleep','unit',1,25000,'in_stock'),
  ('cbd_period','unit',1,95000,'in_stock'),
  ('cbd_paininf','unit',1,95000,'in_stock'),
  ('cbd_calm250','unit',1,95000,'in_stock'),
  ('cbd_roll','unit',1,20000,'in_stock'),
  ('cbd_cream','unit',1,30000,'in_stock'),

  ('para_sw_c','unit',1,10000,'in_stock'),
  ('para_sw_m','unit',1,20000,'in_stock'),
  ('para_gizeh','unit',1,3500,'in_stock'),
  ('para_ocb','unit',1,1000,'in_stock'),
  ('para_clip_box','unit',1,5000,'in_stock'),
  ('para_clip_reg','unit',1,3000,'in_stock'),
  ('para_clip_mini','unit',1,2000,'in_stock'),
  ('para_nectar','unit',1,27000,'in_stock');

-- Sodaze + Limonada share one ladder.
insert into seed_item_price (item_key, sell_unit, sell_quantity, price_cents)
select k,'unit',q,p from (values
  ('soda_bh'),('soda_bc'),('soda_cp'),('soda_lm'),('soda_tp'),('soda_oc'),
  ('soda_bl'),('limonada')
) as items(k)
cross join (values (1,6000),(2,11000),(4,20000),(6,30000)) as tiers(q,p);

-- Nootropic bottles, R280 each.
insert into seed_item_price (item_key, sell_unit, sell_quantity, price_cents)
select k,'unit',1,28000 from (values
  ('noot_mai'),('noot_shi'),('noot_cha'),('noot_tur'),
  ('noot_lio'),('noot_rei'),('noot_cor')
) as items(k);

-- Delta THC caps, R420 each.
insert into seed_item_price (item_key, sell_unit, sell_quantity, price_cents)
select item_key,'unit',60,42000 from seed_item where type_code = 'thc_cap';

-- =============================================================================
-- 8. VARIETIES
-- =============================================================================
-- FIXED: generate slug (NOT NULL, no default, not populated by the original
-- script) and conflict on slug (varieties has no unique constraint on name,
-- only on slug). strain_type mapped from I/S/H to the live CHECK's
-- indica/sativa/hybrid vocabulary; null stays null (defaults to 'unknown').

insert into varieties (name, slug, strain_type)
select distinct on (strain)
  strain,
  trim(both '-' from lower(regexp_replace(strain, '[^a-zA-Z0-9]+', '-', 'g'))) as slug,
  case strain_type
    when 'I' then 'indica'
    when 'S' then 'sativa'
    when 'H' then 'hybrid'
    else null
  end as strain_type
from (
  select strain, strain_type from seed_band_strain
  union all
  select strain, strain_type from seed_item where strain is not null
) s
order by strain, strain_type nulls last
on conflict (slug) do nothing;

-- Alias note: "RS11" and "Rainbow Sherbet #11" are the same genetic, printed
-- together on the menu. Seeded under the canonical name. When you build the
-- alias table (schema audit, gap 7), this is your first row.

-- =============================================================================
-- 9. PRODUCTS
-- =============================================================================

create temp table inserted_band_product (band_key text, strain text, product_id uuid);
create temp table inserted_item_product (item_key text, product_id uuid);

with ins as (
  insert into products (club_id, variety_id, product_type_code, name,
                        grade_declared, cultivation, active)
  select (select club_id from target_club),
         v.id,
         b.type_code,
         b.name_prefix || ' — ' || bs.strain,
         b.grade,
         b.cultivation,
         true
  from seed_band_strain bs
  join seed_band b   on b.band_key = bs.band_key
  join varieties v   on v.name = bs.strain
  returning id, name
)
insert into inserted_band_product (band_key, strain, product_id)
select b.band_key, bs.strain, ins.id
from ins
join seed_band b on ins.name like b.name_prefix || ' — %'
join seed_band_strain bs
  on bs.band_key = b.band_key
 and ins.name = b.name_prefix || ' — ' || bs.strain;

with ins as (
  insert into products (club_id, variety_id, brand_id, product_type_code, name,
                        grade_declared, potency_amount, potency_unit,
                        potency_compound, potency_basis, active)
  select (select club_id from target_club),
         v.id,
         br.id,
         i.type_code,
         i.name,
         i.grade,
         i.potency_amount, i.potency_unit, i.potency_compound, i.potency_basis,
         true
  from seed_item i
  left join varieties v on v.name = i.strain
  left join brands br   on br.slug = i.brand_slug
  returning id, name
)
insert into inserted_item_product (item_key, product_id)
select i.item_key, ins.id
from ins join seed_item i on i.name = ins.name;

-- =============================================================================
-- 10. PRICE POINTS
-- =============================================================================
-- FIXED: sell_unit mapped from the seed's g/unit vocabulary to the live
-- CHECK's gram/joint/device/pack/each/ml vocabulary, following the exact
-- convention documented in the original schema migration's own comments
-- (flower->gram, joints->joint, vape/hardware->device, moonstick->each).
-- ml was already valid and is passed through unchanged.

insert into product_prices (product_id, sell_unit, sell_quantity, price_cents, stock_status)
select p.product_id,
       case
         when b.sell_unit = 'g' then 'gram'
         when b.sell_unit = 'unit' and b.type_code = 'preroll' then 'joint'
         when b.sell_unit = 'unit' and b.type_code = 'moonstick' then 'each'
         else b.sell_unit
       end,
       bp.sell_quantity, bp.price_cents, bp.stock_status
from inserted_band_product p
join seed_band b        on b.band_key = p.band_key
join seed_band_price bp on bp.band_key = p.band_key;

insert into product_prices (product_id, sell_unit, sell_quantity, price_cents, stock_status)
select p.product_id,
       case
         when ip.sell_unit = 'g' then 'gram'
         when ip.sell_unit = 'unit' and i.type_code in ('vape_hardware','dab_hardware') then 'device'
         when ip.sell_unit = 'unit' then 'each'
         else ip.sell_unit
       end,
       ip.sell_quantity, ip.price_cents, ip.stock_status
from inserted_item_product p
join seed_item_price ip on ip.item_key = p.item_key
join seed_item i        on i.item_key = p.item_key;

-- =============================================================================
-- 11. PROMOTIONAL PRICES — NOT SEEDED
-- =============================================================================
-- No price_type column exists, so these would corrupt any price analysis if
-- mixed with list prices. Recorded here for when you add the column.
--
--   Native 1ml disposables ....... SPECIAL 1x1ml @ R1100  (list R1600, -31%)
--   710 1ml disposables .......... SPECIAL 1x1ml @ R1100  (list R1600, -31%)
--   D.O.P.E 0.5ml ................ SPECIAL 2x0.5ml @ R1200 (list R1600, -25%)
--   Big Moonsticks ............... SPECIAL 2 for R300      (list R320)
--   Medicinal Nootropics ......... LAUNCH SPECIAL any 4 bottles @ R600 (list R1120, -46%)
--   Combo ........................ 1g Concentrate + Nectar Collector @ R550 (list R620)
-- =============================================================================

-- =============================================================================
-- 12. VERIFY
-- =============================================================================

select 'varieties' as entity, count(*) from varieties
union all select 'brands', count(*) from brands
union all select 'products', count(*)
  from products where club_id = (select club_id from target_club)
union all select 'price_points', count(*)
  from product_prices pp
  join products p on p.id = pp.product_id
  where p.club_id = (select club_id from target_club)
union all select 'out_of_stock', count(*)
  from product_prices pp
  join products p on p.id = pp.product_id
  where p.club_id = (select club_id from target_club)
    and pp.stock_status = 'out_of_stock';

select pt.substance_class, count(distinct p.id) as products
from products p
join product_types pt on pt.code = p.product_type_code
where p.club_id = (select club_id from target_club)
group by 1 order by 2 desc;

commit;
