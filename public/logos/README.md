# /public/logos

Monochrome SVG brand marks used by the trust bar
(`src/components/sections/trust-bar.tsx`).

## How they are rendered

Each logo is used as a CSS **mask**, so the SVG's shape is painted with the
page's `currentColor`. That means:

- one file works in both light and dark themes,
- the strip is grayscale by default and tints to the brand colour on hover,
- **no `fill` colour needs to be baked into the file** (keep it monochrome).

## Adding a new logo

1. Drop a monochrome SVG into this folder, e.g. `acme.svg`.
   - Keep a square `viewBox` (icons are rendered in a square box).
   - Prefer a single `<path>` and no hard-coded fills.
2. Register it in `data/trust.ts`:
   - Technology we use → add to `techPartners` with
     `relationship: "built with"`.
   - Signed partnership → `relationship: "official partner"` (rendered under
     "Partners").
   - Client → add to `clients` with `permissionConfirmed: true` **only after
     written permission** to display their logo.
3. Run `next build` and confirm the mark shows up.

Marks here originate from [Simple Icons](https://simpleicons.org) (CC0-1.0)
unless replaced with an officially supplied asset. Brand names and logos are
the property of their respective owners and are shown for identification only.
