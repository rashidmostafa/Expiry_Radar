# Expiry Radar

Track what's in your kitchen and when it expires, get nudged before food goes bad, and cook recipes that use it up first.

Built with Expo (React Native) + Expo Router + NativeWind. The UI is a 1:1 port of the Stitch designs in `../stitch_expiry_radar_app_system` (light and dark).

## Run it

```bash
npm install
npm start          # dev server + QR code
```

- **On your Android phone:** install **Expo Go** from the Play Store, then scan the QR code shown by `npm start` (same Wi‑Fi network). Camera, barcode scanning, local storage and expiry notifications all work in Expo Go.
- **In the browser at iPhone size:** `npm run web`, open http://localhost:8081, then DevTools → device toolbar → iPhone 12/13/14 (390×844).
- **On iPhone / TestFlight (no Mac needed):** `npx eas-cli@latest build --platform ios` builds in the cloud.

Development builds open on a demo kitchen (the items from the mockups, dated relative to today). Release builds start empty.

```bash
npx tsc --noEmit   # typecheck
npx expo lint      # lint
```

## What works (milestone 1: the core loop)

| Screen | Route | Notes |
| --- | --- | --- |
| Home dashboard | `/` | Live stats, smart nudge (best rescue recipe), expiring carousel with one-tap Use/Freeze, streak + freshness index |
| Inventory | `/inventory` | Search, Fridge/Freezer/Pantry filters, sort, list/grid, attention banner, Mark Used with undo |
| Item details | `/item/[id]` | Timeline, consume/portion/freeze, zone quick switch, notes, per-item alert, recipes that use it |
| Add / edit item | `/add-item` | Name auto-detects category, zone and shelf life; photo from camera or gallery |
| Scan | `/scan` | Live barcode scanning via Open Food Facts; receipt mode (see below) |
| Scan review | `/scan-review` | Adjust dates/zones, rename unknown barcodes, non-food filter, add all |
| Recipes | `/recipes` | Ranked by how much at-risk food they rescue and pantry readiness |
| Recipe detail | `/recipe/[id]` | Ingredient matching, servings, step checklist, cook timer, **Mark Cooked & Deduct Pantry** (undoable) |
| Profile | `/profile` | Lifetime impact, theme (system/light/dark), name/photo, nudge timing |

Smart nudges are local notifications scheduled per item (default: 2 days before expiry at 8:00 AM).

## Receipt scanning

Reading a receipt photo needs an OCR/AI model, and its API key can't ship inside the app. Set a small backend endpoint in `.env`:

```
EXPO_PUBLIC_RECEIPT_API_URL=https://your-backend.example.com/receipts
```

It receives `POST { image: <base64 jpeg> }` and returns
`{ store?: string, date?: "yyyy-mm-dd", lines: [{ name, priceCents?, quantity? }] }`.
Everything after that (non-food filtering, shelf-life defaults, review) happens on-device in `src/services/receipt.ts`. Without the endpoint, receipt mode explains it isn't connected and offers barcode or manual entry.

## Project layout

```
src/
  app/            routes (Expo Router): (tabs)/ home, inventory, recipes, profile; item/, recipe/, scan, scan-review, add-item
  components/     app header, bottom nav, cards, ui/ primitives (Text, Icon, Sheet, Switch, Checkbox)
  domain/         pure logic: expiry & urgency, shelf-life table (foods.ts), recipe matching, dates, alerts
  data/           recipe catalog, bundled images
  services/       notifications, barcode lookup, receipt parsing, photos
  store/          local-first state: SQLite on device (persistence.ts), localStorage on web (persistence.web.ts)
  theme/          Stitch palette (palette.json → CSS variables), shadows, dark-mode tones, fonts
```

Design notes:

- Colors come from the Stitch Tailwind config; every class resolves through CSS variables, so the same markup renders the light and dark palettes. Dark-only borders/tints from the `*_dark_mode` exports live in `theme/tones.ts` as `dark:` classes.
- Fonts: Plus Jakarta Sans (as in the designs) and Material Symbols Outlined, bundled in filled and outlined variants. Icons render by codepoint (`components/ui/material-symbols-glyphmap.json`, regenerate with `scripts/gen-icon-glyphmap.py`).

## Next milestones

- Receipt OCR backend (Claude vision) + batch scan review screen
- Onboarding, sign up / login, household sharing with cloud sync
- Smart nudges feed, daily freshness digest, weekly/monthly waste & savings reports, CSV ledger export
- Restock shopping list, hands-free cooking mode, pantry & alert settings screens
