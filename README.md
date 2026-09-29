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

## What works

**Core loop (milestone 1)**

| Screen | Route | Notes |
| --- | --- | --- |
| Home dashboard | `/` | Live stats, smart nudge (best rescue recipe), expiring carousel with one-tap Use/Freeze, streak + freshness index; empty-kitchen start state |
| Inventory | `/inventory` | Search, Fridge/Freezer/Pantry filters, sort, list/grid, attention banner, Mark Used with undo |
| Item details | `/item/[id]` | Timeline, consume/portion/freeze, zone quick switch, notes, per-item alert, recipes that use it |
| Add / edit item | `/add-item` | Name auto-detects category, zone and shelf life; photo from camera or gallery |
| Scan | `/scan` | Live barcode scanning via Open Food Facts; receipt mode (see below) |
| Scan review | `/scan-review` | Adjust dates/zones, rename unknown barcodes, non-food filter, add all |
| Recipes | `/recipes` | Ranked by at-risk food, pantry readiness, ratings; filtered by household diet |
| Recipe detail | `/recipe/[id]` | Ingredient matching, servings (household size), step checklist, cook timer, missing items → restock |
| Profile | `/profile` | Lifetime impact and links to everything below |

**Engagement & insights (milestone 2)**

| Screen | Route | Notes |
| --- | --- | --- |
| Welcome | `/welcome` | Splash, 3-slide walkthrough, household quiz (size, diets, nudges) — shown until completed |
| Smart nudges | `/nudges` | Expiring items with rescue recipes, duplicates, freeze suggestions, restock reminders, weekly win, streaks; dismiss/snooze; bell badge |
| Daily digest | `/digest` | Freshness pulse, spoken audio briefing (text-to-speech), urgent items, tonight's rescue, activity log, alert schedule |
| Waste & savings | `/insights` | Week / month / 90 days / all: savings, diverted kg, CO₂e, rescue chart, best recipe, category health, key rescues, kitchen audit, household tier |
| Long-term trends | `/insights/trends` | Monthly and yearly trajectory, category value, hero dish, milestones, year-end outlook, share |
| Restock list | `/restock` | Auto-suggested from used-up and running-low items, recipe "Add" buttons, staples; "Finish Run" adds bought items to the pantry |
| Hands-free cooking | `/cook/[id]` | Screen stays awake, per-step timer ring, read-aloud, highlighted ingredients |
| Cooking complete | `/cook/done` | Impact, pantry deductions (undoable), rating + tags (tunes recipe ranking), favorite, share |
| Settings | `/settings/alerts`, `/settings/pantry`, `/settings/profile` | Warning window, nudge categories, quiet hours, digest time; auto-zone rules, diet, units, theme, CSV ledger export, wipe/sample data; name, handle, bio, photo |

Notifications are local and scheduled on-device: a nudge per item (default 2 days before expiry at 8:00 AM), a morning digest and 5:30 PM cook nudge on days something needs using, and a Sunday weekly report — all respecting quiet hours.

**Accounts & households (milestone 3)**

| Screen | Route | Notes |
| --- | --- | --- |
| Log in / sign up | `/auth/login`, `/auth/signup` | Email + password, Apple / Google buttons, password strength |
| Password reset | `/auth/forgot`, `/auth/check-email`, `/auth/reset-password` | Reset link opens the app and sets a new password |
| Household | `/household`, `/join?code=` | Create or join with a code, invite link, members, owner controls, leave, live sync status |

## Accounts, household sync & receipt reading (Supabase)

The app is local-first and works fully without an account. Connecting a Supabase project adds:

- **Accounts** — email/password sign-up, login and password reset (Apple/Google once enabled).
- **Household sharing** — one pantry, ledger and restock list shared by everyone in a household, with an invite code / link. Offline edits queue up and sync later; conflicts resolve last-write-wins; changes arrive live via Realtime.
- **Receipt reading** — the `parse-receipt` Edge Function sends the photo to Claude (Opus 5.5, low effort, structured JSON output) and returns the food lines. The Anthropic key stays on the server; each user gets 25 scans a day.

### One-time setup (about 10 minutes)

1. **Create the project and app keys** (free tier is enough):
   ```bash
   npm install -g eas-cli
   eas integrations:supabase:connect
   ```
   This creates the Supabase project and writes `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local` and to your EAS environments. (Or create a project at supabase.com and fill `.env.local` from `.env.example`.)
2. **Create the database tables and security rules:**
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. **Deploy receipt reading** with your Anthropic API key (console.anthropic.com):
   ```bash
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   npx supabase functions deploy parse-receipt
   ```
4. **Allow the app's links** — Supabase dashboard → Authentication → URL Configuration → Redirect URLs: add `expiryradar://**` and, for Expo Go, `exp://**`.
5. *(Optional)* **Apple / Google sign-in** — enable the providers under Authentication → Providers (needs an Apple Developer account / Google Cloud OAuth client). Until then those buttons say the option isn't switched on.

Restart `npm start` after step 1 so the new environment variables are picked up.

### Local backend (development)

Docker is required. `npx supabase start` runs Postgres, Auth, Realtime and Edge Functions locally and applies `supabase/migrations`. Point `.env.local` at `http://<your computer's LAN IP>:54321` with the local publishable key from `npx supabase status` (use the LAN IP, not 127.0.0.1, when testing on a phone). Serve the receipt function with `npx supabase functions serve parse-receipt --env-file <file containing ANTHROPIC_API_KEY=...>`.

## Project layout

```
src/
  app/            routes (Expo Router): (tabs)/ home, inventory, recipes, profile; item/, recipe/, scan, scan-review, add-item
  components/     app header, bottom nav, cards, ui/ primitives (Text, Icon, Sheet, Switch, Checkbox)
  domain/         pure logic: expiry & urgency, shelf-life table (foods.ts), recipe matching, dates, alerts
  data/           recipe catalog, bundled images
  services/       notifications, barcode lookup, receipt parsing, photos, household sync
  store/          local-first state: SQLite on device (persistence.ts), localStorage on web (persistence.web.ts); account.ts
  lib/            Supabase client
supabase/
  migrations/     tables, row level security, household functions
  functions/      parse-receipt (Deno Edge Function calling Claude)
  theme/          Stitch palette (palette.json → CSS variables), shadows, dark-mode tones, fonts
```

Design notes:

- Colors come from the Stitch Tailwind config; every class resolves through CSS variables, so the same markup renders the light and dark palettes. Dark-only borders/tints from the `*_dark_mode` exports live in `theme/tones.ts` as `dark:` classes.
- Fonts: Plus Jakarta Sans (as in the designs) and Material Symbols Outlined, bundled in filled and outlined variants. Icons render by codepoint (`components/ui/material-symbols-glyphmap.json`, regenerate with `scripts/gen-icon-glyphmap.py`).

## Next milestones

- Email digest / SMS channels, connected stores
- CSV ledger preview & export flows, print-ready impact PDF, custom categories
- Biometric login, email invites with pending state
