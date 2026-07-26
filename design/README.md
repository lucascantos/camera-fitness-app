# Design system — extracted from the app

`tokens.json` is the app's **real** design system, read out of `tailwind.config.js`,
`src/index.css`, and 20 component files. It is descriptive, not aspirational: it
documents what the code does today, including the parts that need replacing.

Source of truth is still the code (`src/index.css` defines the CSS variables that
every token resolves to). This file is a mirror for design tooling — if you change
a color, change it in `index.css` and re-sync here.

---

## Getting it into Figma

There is no importable "Figma format" — `.fig` is proprietary/binary, and Figma's
Variables **write** REST API is enterprise-only. The working route is the
**Tokens Studio** plugin, which `tokens.json` is formatted for:

1. Figma → Plugins → **Tokens Studio for Figma** (free tier is fine).
2. In the plugin: **Tools → Load from file/folder** → select `design/tokens.json`.
3. Two themes appear (*Fitpop Light* / *Fitpop Dark*), each combining the shared
   `primitives` set with its color set.
4. **Export → Styles & Variables** to publish them as real Figma variables, so
   they're usable in components and can be swapped per theme.

If Claude Design accepts token JSON directly, feed it the same file — the format is
close to the W3C Design Tokens spec (`value`/`type`/`description` per token).

---

## Structure

| Set | Contains |
|---|---|
| `primitives` | Radius, type scale, weights, sizing, shadow — theme-independent |
| `light` | The default "fitpop" palette (14 colors) |
| `dark` | The `.dark` palette — **not** a tint of light; several hues shift deliberately |

Theming works by swapping CSS variables on `<html>`, so every token is themeable by
construction. Colors are stored as RGB channels in CSS to keep Tailwind's
opacity modifiers (`bg-ink/50`) working.

---

## Conventions worth preserving

- **Semantic naming, not literal.** Tokens are `panel` / `ink` / `accent`, never
  `white` / `red-600`. Keep it that way — it's what makes the dark theme a
  one-line swap.
- **Radius signals hierarchy.** `3xl` major surfaces → `2xl` cards and buttons →
  `full` pills. Radius, not shadow, is the primary shape language.
- **The eyebrow label.** `11px / bold / tracking-widest / gray-dark`, used 27
  times for section headers (`SET 1 OF 3`, `WEIGHT`, `TODAY'S WORKOUT`). This is
  the most reusable component in the app and has no name in code yet.
- **Depth comes from surface color**, not elevation: `bg` → `panel` → `panel-dark`
  nests inward. There is exactly one shadow, and it is nearly invisible.
- **Green means increment/success, red means active/primary.** Note this is
  unusual — red is *not* reserved for destructive here; it's the brand accent and
  marks the live set.

---

## DESKTOP DEBT — flag before redesigning

The token layer is sound. The **application** of it is desktop-era. Anything below
should be treated as legacy, not as precedent:

1. **`gray-dark` is misnamed in the dark theme.** It renders *lighter* than `gray`
   (`#A7A2C4` vs `#7C7894`). The name describes its light-theme role. Any renaming
   is a cross-cutting change — 20+ files.
2. **40px touch targets.** `w-10 h-10` (nav buttons, avatars, old steppers) is
   below the 44px minimum. Only the new Training sheet steppers use `w-11 h-11`.
3. **Fixed-pixel columns.** `grid-cols-[260px_1fr_320px]` (Home), `[300px_1fr]`
   (Plans), `[260px_1fr]` (Rest/Complete/NextExercise). These now carry `lg:`
   prefixes and stack on mobile, but the *designs* behind them are still desktop
   dashboards that were folded into a column — they were never designed for it.
4. **No spacing scale.** Padding is ad hoc (`p-3`/`p-4`/`p-5`/`p-6`/`p-8`/`p-10`)
   with no rule about which applies where. This is the biggest genuine gap and
   worth defining in any new system.
5. **No documented overlay/sheet vocabulary.** The redesigned Training screen
   introduced patterns that exist nowhere else and are unspecified: full-bleed
   camera, gradient scrim for legibility over live video, bottom sheets with drag
   handles, `env(safe-area-inset-*)` padding, floating circular chrome over
   content. **These are the patterns a mobile redesign should build on** — but
   they're currently one screen's improvisation, not a system.
6. **Two type scales coexist.** Tailwind's named sizes (`text-sm`, `text-2xl`)
   alongside arbitrary values (`text-[11px]`, `text-[8rem]`, `text-[5rem]`).

Item 5 is the important one: brief any redesign on the **new Training screen's**
vocabulary, not on the desktop scenes, or you'll get the same mismatch back.
