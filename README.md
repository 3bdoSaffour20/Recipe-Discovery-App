# Recipe Discovery

A responsive recipe platform built with React and Vite, powered by the live
[TheMealDB](https://www.themealdb.com/) API. Search thousands of recipes,
filter by category or ingredient, and save favorites to your device.

## Getting started

```bash
npm install
npm run dev      # development server
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Scripts

| Script                    | What it does                                                          |
| ------------------------- | --------------------------------------------------------------------- |
| `npm run dev`             | Vite dev server with hot reload                                       |
| `npm run build`           | Production build                                                      |
| `npm run preview`         | Serves `dist/` for local verification                                 |
| `npm run optimize:assets` | Re-generates the responsive image variants from `Images/` and `Icons/` |
| `npm run smoke:api`       | Runs the pure helpers and the live API through 27 checks             |
| `npm run check:classnames`| Flags `className`s in JSX with no matching CSS rule                   |
| `npm run check:legacy`   | Confirms nothing was lost when the old app was moved to `legacy/`      |
| `npm run verify`          | Drives the built app in Chrome: routes, overflow, touch targets, a11y |
| `npm run audit:design`    | Asserts the rendered design against the brief: gradient, hero, tiles |
| `npm run screenshots`     | Captures reference screenshots to `screenshots/`                      |

`verify` and `audit:design` expect a server on `http://localhost:4173`, so run
`npm run build && npm run preview` first. Set `BASE_URL` to point them
somewhere else, and `CHROME_PATH` if Chrome or Edge is not in a standard
location.

## How it fits together

```
src/
  components/   presentation: navbar, cards, search, shared states
  hooks/        data fetching, favorites, media queries, focus and scroll
  pages/        one module per route, all code-split except Home
  services/     the only place that talks to TheMealDB
  styles/       plain CSS, mobile-first, one file per concern
  utils/        pure helpers: ingredients, instructions, URLs, text
```

### Notes on a few decisions

**One place for the network.** `src/services/mealApi.js` owns every request. It
caches responses for five minutes, collapses duplicate concurrent requests into
one, and retries transient failures.

**The API returns two different shapes.** A category listing returns a summary
with a thumbnail and no ingredients; only a lookup by id returns the full
record. `getMealDetails` upgrades a summary automatically, otherwise detail
pages render empty until a refresh.

**`latest.php` is anonymous.** TheMealDB lists it as a random endpoint, but it
returns the same placeholder record every time. `getRandomMeal` falls back to a
real search instead, so the button always produces a different dish.

**Instructions are structured, not prose.** Most records separate steps with
line breaks rather than numbers, so `splitInstructions` treats a newline as a
step boundary and only adds numbering when the source text already had markers.
For the same reason `normalizeMeal` keeps newlines in `strInstructions`; the UI
splits the text, rather than storing it as one paragraph.

**No CSS framework.** Styles are plain CSS driven by custom properties in
`src/styles/tokens.css`, which keeps the dark navy and purple palette in one
place and the initial CSS small.

## Accessibility

Semantic landmarks and a skip link, one `h1` per page, visible focus rings,
44px touch targets on phones, a focus-trapped mobile drawer that restores focus
when it closes, `prefers-reduced-motion` support, and alt text on every image.
Loading, empty and error states are announced rather than shown silently.

## Assets

`Images/` and `Icons/` hold the original artwork. `npm run optimize:assets`
renders responsive WebP/JPEG pairs into `src/assets/*/generated/`, which
`src/assets/media.js` exposes to the components. Re-run it after changing a
source image.

## Legacy

The previous static implementation is preserved in `legacy/`, unmodified.
