# Daggadex ClubOS Lite

## What this is
A private cannabis club operating system for the South African market.
Invite-only PWA. Replaces the current Instagram → WhatsApp → PDF menu →
manual ordering workflow with a live menu and a structured order pipeline.

Single club at launch, but multi-tenant in the data model from day one.

## The actual goal
This is a data-capture system disguised as an ordering tool. Every feature
decision should be judged on: does this produce clean, structured, queryable
data? The ordering flow is the wedge. The intelligence dashboard is the product.

Corollary: never store as free text what could be a foreign key. Never store
a derived number that could be computed from source data.

## Stack
- Next.js (App Router) + TypeScript
- Supabase (Postgres, Auth, Storage)
- Tailwind CSS + shadcn/ui
- pnpm
- Deployed on Vercel
- PWA (manifest + installable; no App Store)

## Database
The schema lives in `supabase/migrations/` and is the source of truth. Read it
before writing any data-access code. Never edit an applied migration — always
add a new one. Do not invent tables or columns; if something seems missing,
ask before adding.

Types in `src/lib/database.types.ts` are GENERATED from the live schema via
`pnpm db:types`. Never hand-edit that file.

Key conventions, all deliberate:
- Money is INTEGER CENTS (ZAR). Never floats. Never a `price` decimal.
- Cannabis weight is in GRAMS (SI).
- All timestamps are `timestamptz`.
- `club_id` is on every operational table. Always filter by it.
- `products` (a strain in a format) is separate from `product_prices`
  (each sellable weight/pack). A 2g, 10g and 20g of the same flower are
  three `product_prices` rows under one `products` row.
- Order line items snapshot name/unit/price at order time. Orders are
  immutable historical records — never recompute them from current prices.
- `price_history` is populated by a database trigger. Do not write to it
  from application code.
- Status fields are `text` + CHECK constraint, not Postgres enums.

## Auth and access
- Supabase Auth, phone OTP.
- A `members` row links `auth.users.id` to a club with a role
  (`member` / `staff` / `owner`).
- `members.user_id` is nullable to support invite-before-signup.
- RLS is enabled on every table and is not optional. The anon key is
  public; without RLS the whole database is readable by anyone.
- Server-side admin operations use the `service_role` key, which bypasses
  RLS. The `service_role` key must NEVER be imported into a client
  component or exposed to the browser. If a task seems to need it
  client-side, the design is wrong — stop and tell me.

## Design system
Colours, type and tokens are in `docs/design-tokens.md`. Use the named Tailwind
tokens (base, surface, olive, gold, sage, cream, wood) — never raw hex values
in components.

Headings use Anton (heavy condensed uppercase). Body uses Space Grotesk.
The aesthetic is earthy botanical colour against blunt urban typography.

## Language and tone in the UI
This is a private club, not an e-commerce store. Use concierge language:
- "Request" / "Reserve", never "Add to cart" or "Checkout"
- "Members", never "Users" or "Customers"
- "Menu", never "Shop" or "Store"
- Members are shown by `alias`, not real name. Privacy is a feature.

## Explicitly OUT of scope for the MVP — do not build these
Card payments, payment gateways, delivery routing/optimisation, ID/KYC
verification, wallet or credit balances, recommendation engines, a real
WhatsApp bot, multi-club switching UI, email notifications.

Payment is a status field. Delivery is a status field. Member contact is a
`wa.me` deep link. If a task seems to require one of the above, stop and ask.

## Working style
- Small, reviewable commits. One concern per commit.
- Prefer server components; use client components only for interactivity.
- Prefer plain SQL via the Supabase client over an ORM layer.
- Before generating a file, tell me what you're about to create and why.
- If a requirement is ambiguous, ask rather than assume. I am a solo
  founder-developer and I need to understand every file in this repo.
