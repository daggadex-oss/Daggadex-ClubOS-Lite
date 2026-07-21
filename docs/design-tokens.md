# Daggadex ClubOS — Design Tokens

Source of truth for colour, type and spacing. Components must use the named
tokens below, never raw hex values.

---

## Concept

Earthy botanical colour against blunt urban typography. Cultivation meets
street. The palette is organic and grown; the type is concrete and city.
Neither half softens the other.

This is a private members' club, not a dispensary and not an e-commerce store.
No neon greens, no leaf iconography, no stoner clichés.

---

## Colour

Dark theme is the default and the only theme for the MVP. Backgrounds are built
on a deepened forest green rather than neutral black — a warm dark base makes
the gold glow and keeps the palette organic.

| Token | Hex | Role |
|---|---|---|
| `base` | `#26311F` | App background (deepened forest) |
| `surface` | `#3E5233` | Cards, raised surfaces, inputs |
| `olive` | `#7C8B4E` | Primary |
| `gold` | `#C9A227` | Accent — actions, highlights, active states |
| `sage` | `#A8B892` | Muted text, hairline borders |
| `cream` | `#F2EDD8` | Primary text |
| `wood` | `#8A5A2B` | Warm secondary, used sparingly |

### Tailwind config

```js
// tailwind.config.ts — theme.extend.colors
colors: {
  base:    '#26311F',
  surface: '#3E5233',
  olive:   '#7C8B4E',
  gold:    '#C9A227',
  sage:    '#A8B892',
  cream:   '#F2EDD8',
  wood:    '#8A5A2B',
}
```

### Usage rules

- `gold` is the action colour and must stay scarce. If more than one element
  per view is gold, something is wrong.
- Body text is `cream`. Secondary and helper text is `sage`.
- Borders are 1px `sage` at low opacity, not heavy dividers.
- Separate surfaces tonally (`base` vs `surface`) rather than with drop shadows.
- `wood` is for warm accents and the cancelled state only — it is not a
  general-purpose colour.

### Status badge mapping

| Status | Token |
|---|---|
| Requested | `sage` |
| Confirmed | `olive` |
| Out for delivery | `gold` |
| Delivered | `cream` on `surface` |
| Cancelled | `wood` |

### Stock states

| State | Treatment |
|---|---|
| In stock | Normal |
| Low stock | `gold` label, product still fully interactive |
| Out of stock | Reduced opacity, price still legible, not hidden |

---

## Typography

| Role | Font | Notes |
|---|---|---|
| Headings | **Anton** | Heavy condensed, uppercase, tight tracking. One weight only. |
| Body & UI | **Space Grotesk** | Full weight range. Generous line height on dark. |
| Numerals | Space Grotesk Medium | Tabular figures where values align in columns. |

Both are Google Fonts — load via `next/font/google`.

```ts
import { Anton, Space_Grotesk } from 'next/font/google'

export const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
})

export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})
```

```js
// tailwind.config.ts — theme.extend.fontFamily
fontFamily: {
  display: ['var(--font-anton)', 'sans-serif'],
  sans:    ['var(--font-space-grotesk)', 'sans-serif'],
}
```

### Type scale

The contrast between heading and body should be extreme — small calm body text
under large blunt headings.

| Token | Size / leading | Use |
|---|---|---|
| `display` | 48–64px, leading-none, uppercase, tracking-tight | Screen titles, hero |
| `h1` | 32–40px, leading-tight, uppercase | Section headings |
| `h2` | 24px, leading-tight, uppercase | Sub-sections, card titles |
| `body` | 16px, leading-relaxed | Default |
| `small` | 14px, leading-normal | Secondary info |
| `caption` | 12px, tracking-wide, uppercase | Labels, badges, metadata |

Anton has no italic and a single weight. That's deliberate here: hierarchy
comes from size and spacing, not weight. All typographic nuance in body copy
therefore has to come from Space Grotesk's weight range — use it properly.

---

## Form and layout

- **Corners:** sharp or barely rounded (`rounded-none` to `rounded-sm`). Avoid
  pill shapes — the geometry carries the gritty half of the brief.
- **Tap targets:** minimum 44px. Member app is one-thumb, phone-only in practice.
- **Spacing:** 4px base scale. Generous negative space; content-forward.
- **Shadows:** minimal. Prefer tonal separation.
- **Photography:** edge to edge, interface recedes around it.

### Density

The member app and the admin app have different jobs:

- **Member app** — generous, spacious, editorial. Photography-led.
- **Admin app** — compact and information-dense. It's a working screen used
  dozens of times a day. Same visual identity, tighter spacing.

---

## Copy conventions

This is a club, so the interface language reflects that:

| Use | Not |
|---|---|
| Request, Reserve | Add to cart, Checkout |
| Members | Users, Customers |
| Menu | Shop, Store |
| Alias | Name, Full name |

Members are displayed by `alias`, never by real name. Privacy is a feature,
not a setting.

---

## Accessibility

Verify these two pairings with a contrast checker before committing the theme —
both are borderline:

- `gold` on `olive` — tight
- `sage` on `surface` — borderline for small text

If either fails WCAG AA, **darken the background** behind it rather than
brightening the accent. Keeping gold scarce and rich matters more than using
it in more places.

`cream` on `base` is comfortably readable and is the default text pairing.
