<div align="center">
  <img src="public/icon.svg" width="72" height="72" alt="Antrilah logo" />

  <h1>Antrilah</h1>

  **A queue that lives in your browser.**

  Numbered tickets, live wait times and a staff dashboard for clinics, salons, repair counters,
  food trucks and pop-ups — with no backend, no accounts, no cloud and no bills.

  [![MIT license](https://img.shields.io/badge/license-MIT-FFD93D?style=flat-square&labelColor=111111)](LICENSE)
  [![No backend](https://img.shields.io/badge/backend-none-B8F26B?style=flat-square&labelColor=111111)](#architecture)
  [![Works offline](https://img.shields.io/badge/offline-ready-A9C7FF?style=flat-square&labelColor=111111)](#offline--install)
  [![PRs welcome](https://img.shields.io/badge/PRs-welcome-FFA6C9?style=flat-square&labelColor=111111)](CONTRIBUTING.md)
</div>

![Antrilah landing page](docs/screenshots/01-landing.png)

Antrilah is a small, complete queue-management app you can host as a folder of static files.
A customer scans the QR code, types a name and gets a number. Their ticket page updates live as
the line moves. Staff call the next person, skip no-shows and close the day from a dashboard
that looks like a printed ticket.

Everything — tickets, settings, history — is stored in the browser's IndexedDB. There is no
server to run, no database to buy and no account to create. After the first load the app keeps
working with the network unplugged.

**MIT licensed. Free forever.**

---

## Contents

- [Why Antrilah](#why-antrilah)
- [Features](#features)
- [Screenshots](#screenshots)
- [Quick start](#quick-start)
- [Using Antrilah](#using-antrilah)
- [Waiting-room display](#waiting-room-display)
- [Customers and daily reports](#customers-and-daily-reports)
- [Data and privacy](#data-and-privacy)
- [Customising](#customising)
- [Architecture](#architecture)
- [Deploying the PWA](#deploying-the-pwa)
- [Development](#development)
- [Verification](#verification)
- [Browser support](#browser-support)
- [Privacy and security](#privacy-and-security)
- [Contributing](#contributing)
- [Release notes](docs/release-notes-v1.0.0.md)
- [Changelog](CHANGELOG.md)
- [License](#license)

---

## Why Antrilah

- **Free, actually.** No licence fee, no per-seat pricing, no "pro" tier, no analytics SDK.
- **No backend.** A queue is local state. Antrilah keeps it where it belongs: on the device
  that runs the desk.
- **Works offline.** The whole app shell is precached by a hand-written service worker, so a
  dropped connection never stops the line.
- **One folder to host.** `npm run build` produces a static `dist/` that runs on GitHub Pages,
  a NAS, a USB stick or any web host — no environment variables or database.
- **Small and readable.** About 8,900 lines of TypeScript and CSS, four runtime dependencies,
  and a queue engine you can audit in one sitting.
- **For humans.** Big ticket numbers, one-tap counter controls, keyboard-friendly dialogs and
  layouts that survive a cracked phone screen.

## Features

**For customers**

- QR check-in page with the live now-serving number, waiting count and estimated wait.
- A personal ticket page showing position, people ahead, a progress rail and a clear
  "it's your turn" state that updates itself.
- Shareable ticket link, self-service "leave the queue" with confirmation, no app install.
- Add an optional phone or email for the staff to see at the counter.
- Your own logo, brand colour and description across check-in, tickets and the waiting-room
  screen, all stored locally.

**For staff**

- Call next, recall, done, skip and requeue — with a strict status machine so a completed
  ticket can never jump back in line.
- Automatic numbering (`A-001`, `A-002`, …) that cannot double-issue, even with two tabs open.
- Walk-in intake for people who would rather not scan, with a live "next number" preview.
- Day history with read-only previous days, per-day stats and a one-action "clear today".
- **Waiting-room display** (`#/display`): oversized now-serving number, up-next and just-served
  lists, fullscreen and optional chime, designed for a tablet, laptop or TV.
- **Customer directory** built from ticket names: search, repeat-visitor badges and a full visit
  history per person — no extra profile or upload.
- **Daily reports**: pick any day, see issued/served/skipped counts, average daily volume and
  seven-day bars, then export that day as JSON.
- Optional automations: skip stale waiting tickets, auto-complete long services, keep *N* days
  of history.
- Browser-generated call/join sounds with volume, tone and per-event switches — no audio files.
- Locally generated QR code with PNG download, copy link and a fixed public URL setting.

**For whoever runs the shop**

- Four-step setup wizard on first run — business, prefix and pace, daily hours and automations,
  QR check-in — with live previews, tooltips and a skip/reopen flow.
- Business settings: name, tagline, description, logo upload, brand colour, service label,
  number prefix, service minutes, opening hours, welcome copy and QR base URL.
- JSON backup to file or clipboard, validated restore (merge or replace), automatic number
  repair, duplicate detection and conflict renumbering.
- Privacy centre: storage-usage readout, automatic daily recovery copies (newest three),
  per-day deletion, retention purge and a full reset behind confirmation dialogs.
- Installable PWA with an update prompt; no telemetry, no third-party requests, no cookies.

## Screenshots

| Customer check-in | Live ticket |
| --- | --- |
| ![Join page](docs/screenshots/02-join.png) | ![Ticket page](docs/screenshots/03-ticket.png) |
| **Staff dashboard** | **QR check-in** |
| ![Dashboard](docs/screenshots/04-dashboard.png) | ![QR panel](docs/screenshots/06-qr.png) |
| **Insights** | **On a phone** |
| ![Insights](docs/screenshots/05-insights.png) | ![Mobile ticket](docs/screenshots/08-mobile-ticket.png) |

## Quick start

**Requirements:** Node.js 20 or newer and npm 9+ (any recent version ships with Node 20).
No database, account, API key or internet connection is needed after installing packages.

```bash
git clone https://github.com/Ahdanrikzan/antrilah.git
cd antrilah
npm install
npm run dev
```

Open **http://localhost:3000**.

| Page | What it is |
| --- | --- |
| `/` | Landing page |
| `/#/join` | Customer check-in (this is what the QR code opens) |
| `/#/admin` | Staff dashboard |
| `/#/ticket/:id` | A customer's live ticket |
| `/#/display` | Waiting-room screen for a TV or tablet |

First run: open `#/admin` and the **setup wizard** opens automatically. Four short steps name the
business, choose the ticket prefix, shape the working day and generate the QR code — with a live
preview and plain-language tooltips. Logo, brand colour and description can then be added in
**Settings → Branding**, with a live customer preview. It can be skipped at any point and reopened from the header,
the setup checklist or **Settings → Setup wizard**.

Want data first? Press **Load demo queue** or add a walk-in to see the dashboard populated.

### Build and preview the production bundle

```bash
npm run build     # type-check, bundle, inject the service-worker precache list
npm run preview   # serve dist/ at http://localhost:3000
```

`dist/` is the entire application. Copy it anywhere that serves static files.

## Using Antrilah

### First run

1. Open `#/admin` → **Settings** and set the business name, service label and number prefix.
2. Open **QR**, download the PNG and stick it on the door or counter. If the app is hosted on a
   fixed domain, set **Change public URL** so printed codes never point at a laptop.
3. Keep the dashboard open on the counter device while the queue is running.
4. Export a backup at the end of the first day (**Data → Export backup**) until you trust the
   routine.

### The customer flow

1. Customer scans the QR code and lands on `#/join`, which shows the current line.
2. They type a name (phone/email optional) and press **Get my number**.
3. Their ticket page opens with the number, position and estimated wait; it refreshes itself
   while open and can be shared or bookmarked.
4. When staff call the number, the page announces "your turn". If plans change, the customer
   can leave the queue instead of being a no-show.

<img src="docs/screenshots/07-mobile-join.png" alt="Check-in page on a phone" width="320" />

### Running the counter

- **Call next** takes the first waiting ticket and closes whoever was at the counter.
- **Recall** re-announces the current ticket; **Done** closes it; **Skip** marks a no-show.
- Skipped tickets stay in the closed chips and can be returned to the line if the customer
  comes back.
- **Add a walk-in** issues a normal ticket for someone without a phone.
- **Clear today** resets today's tickets and numbering; previous days stay in history.
- Day chips above the stats switch to a previous day. History is read-only, so it can't be
  edited by accident.

### QR check-in

The QR panel renders the code on-device with `qrcode` (no image service), downloads a PNG,
and copies the join link. By default the code points at the current address; set a fixed
public URL once the app is hosted so old printouts keep working.

### Waiting-room display

Open **`#/display`** on the device facing the queue — a tablet by the door, a laptop or a TV with
a browser. It shows the current number in a very large monospace typeface, a highlighted now-serving
panel, the next four numbers and the last five completed ones. The page refreshes within a few
seconds of a staff action on the same device (and immediately across tabs), has a fullscreen
button and never shows customer names.

Sound is opt-in: press **Sound off** once to unlock browser audio, and it will chime when the
serving number changes using the tone, volume and master switch from Settings. The choice is
remembered per device. Fullscreen needs a user tap, as required by browsers. No screen, cable or
account is involved — it is another local route in the same app.

To use it, open `#/display` on the waiting-room screen and leave the staff dashboard open on the
counter device. `← Staff dashboard` in the footer returns to the queue.

### Customers and daily reports

**Customers** groups tickets by the name people typed at check-in. No extra table or profile is
created: search by name or phone, filter repeat visitors (two or more visits), and select someone
to see each ticket, date, time and status. Walk-ins with no name stay out of the list, and nothing
is uploaded. Two different people with the same name are treated as one customer — rename one
ticket in a backup if that matters.

**Insights** has a date picker and previous/next arrows. Pick any day to see issued, served,
skipped and cancelled counts, the no-show rate, service and wait averages, and that day's hourly
arrivals. The seven-day chart and daily average stay visible, and **Export JSON** downloads the
selected day's summary and tickets as `antrilah-day-YYYY-MM-DD.json`. Historical days stay in
IndexedDB until you delete them.

### Backup and restore

**Data → Export backup** writes `antrilah-backup-YYYY-MM-DD.json` with every ticket and all
settings. Restore accepts a file or pasted JSON and validates it before writing anything:

- **Merge** keeps local tickets and adds what's missing.
- **Replace all** clears local tickets first.
- Conflicting day + number pairs are renumbered, and duplicate IDs are skipped — restoring the
  same file twice is safe.

The schema and every validation rule are documented in
[docs/backup-format.md](docs/backup-format.md).

### Data and privacy

The **Data** tab is the privacy centre. It shows IndexedDB usage, exports or restores the full
backup, keeps up to three **recovery copies** automatically (one per day the dashboard is opened,
plus one before deleting a day), and can delete a single day, purge outside the retention window,
or **Reset everything**. Restores and deletions sit behind confirmation dialogs; a brand-new
install only happens if you confirm the reset. Nothing is sent anywhere at any point.

### Offline and install

The production build precaches the shell, so reloading with no network still opens the app and
the queue keeps working. Old days are removed only when you run **Data → Delete records** or a
retention cleanup; nothing expires on its own. In Chrome/Edge the address bar offers **Install**; on iOS use
*Share → Add to Home Screen*.

Offline caching is production-only on purpose: in `npm run dev` the service worker is not
registered, which keeps hot reload instant. To test offline behaviour, run
`npm run build && npm run preview`, load the page once, then disable the network.

### Resetting

- **Clear today's queue** — resets today's numbering, keeps history.
- **Delete all tickets** — wipes every ticket and counter, keeps settings.
- **Data → Reset application** — removes tickets, history, recovery copies and settings, then
  returns to a fresh install.
- Clearing site data in the browser does the same without confirmation. Export first if the data
  matters.

## Customising

| What | Where |
| --- | --- |
| Business name, description, prefix, service minutes, hours, welcome copy, QR URL | **Admin → Settings** |
| Logo, brand colour and the live customer preview | **Admin → Settings → Branding** |
| Call/join sounds, tone and volume | **Admin → Settings → Sounds & alerts** |
| Waiting-room screen | Open `#/display`; controls in **Admin → QR** |
| Automations and retention | **Admin → Settings → Automations** |
| Default settings for a fresh install | `DEFAULT_SETTINGS` in [`src/lib/db.ts`](src/lib/db.ts) |
| Colours, fonts, border thickness | [`tailwind.config.js`](tailwind.config.js) and `src/index.css` |
| Copy and sections on the landing page | [`src/pages/Landing.tsx`](src/pages/Landing.tsx) |
| Queue rules and numbering | [`src/lib/queue.ts`](src/lib/queue.ts) |
| App name, icons, theme colour | `public/manifest.webmanifest`, `index.html`, `public/icon.svg` |

The design system is colour-semantic: yellow waits, lime serves, blue completes, orange misses,
pink is destructive, violet is informational. Change the palette in `tailwind.config.js` and
every component follows. No CSS framework or component library is bundled beyond Tailwind
utilities.

## Architecture

```
React pages ──► lib/queue.ts (queue service) ──► lib/db.ts (Dexie) ──► IndexedDB
     │                    │
     │                    └──► lib/sync.ts (BroadcastChannel change signal)
     └──► lib/hooks.ts (useQuery: read + refresh on write, focus, poll)
```

- **Pages** are presentational: they read through `useQuery` and call queue functions.
- **`lib/queue.ts`** owns every mutation and the status machine; illegal moves throw a typed
  `QueueError`.
- **`lib/db.ts`** defines the Dexie schema (`tickets`, `settings`, `counters`, `snapshots`).
- **`lib/backup.ts`** builds, validates and imports backups; **`lib/snapshots.ts`** keeps the
  local recovery copies; **`lib/sound.ts`** synthesises chimes with Web Audio; **`lib/pwa.ts`**
  registers the service worker in production only.
- **`src/pages/Display.tsx`** is lazy loaded, like the dashboard, so the landing bundle stays
  small.

Vite serves and bundles; the only build-time customisation is a small plugin that injects the
hashed asset list into `public/sw.js`, so there is no Workbox or extra runtime.

### Numbering in one paragraph

`issueTicket` runs a read-write transaction over `tickets` **and** a per-day `counters` row,
takes `max(lastSeq, highest seq) + 1`, and writes the ticket and the new cursor together.
IndexedDB serialises overlapping read-write transactions, including across tabs, so two taps on
"Get my number" can never produce the same code. Numbering resets at local midnight because the
cursor is keyed by the local calendar day.

### Data model and status rules

`tickets` stores `dayKey`, `seq`, `code`, `name`, contact fields, `status`, timestamps and a
compound `[dayKey+status]` index; `counters` stores `lastSeq` and `issued` per day; `settings`
is a single row; `snapshots` holds up to three serialised recovery copies. The full schema, the
allowed status transitions and the import rules live in [docs/development.md](docs/development.md).

## Deploying the PWA

`npm run build` writes a self-contained `dist/`. There is nothing to configure and no
environment variables to set.

| Host | How |
| --- | --- |
| **GitHub Pages** | Enable Pages → *GitHub Actions*; the included workflow (`.github/workflows/pages.yml`) builds and deploys on every push to `main` |
| **Cloudflare Pages / Netlify / Vercel** | Build command `npm run build`, output directory `dist` |
| **nginx / Apache / any static host** | Copy `dist/` to the web root |
| **Local network** | `npm run preview -- --host 0.0.0.0`, then open the LAN address on the counter device |

- **Subdirectories work.** Assets and the service worker use relative paths, so
  `https://example.com/queue/` is fine.
- **HTTPS is required for the service worker** (and therefore offline mode and installation).
  `localhost` is exempt, which is why `npm run preview` works without TLS.
- **Updating:** deploy the new `dist/`. Returning visitors get the cached app instantly and an
  in-app "New version ready → Reload" prompt once the new worker installs; the old cache is
  deleted on activation. Bump `VERSION` in `public/sw.js` if you change caching behaviour.
- **Cache headers:** do not cache `sw.js` for long. A `Cache-Control: no-cache` header on
  `/sw.js` is ideal; hashed assets under `/assets/` can be cached forever.

Step-by-step instructions for Pages, Cloudflare Pages, Netlify and nginx (including the
subdirectory case) are in [docs/deployment.md](docs/deployment.md).

## Development

```bash
npm install          # install dependencies
npm run dev          # Vite dev server with HMR on :3000
npm test             # Vitest + React Testing Library (45 tests)
npm run typecheck    # tsc --noEmit
npm run build        # type-check + production build
npm run preview      # serve the production build
```

- **Where to add things:** a new customer screen goes in `src/pages/`, a shared visual in
  `src/components/ui.tsx`, a queue rule in `src/lib/queue.ts` with a guard in
  `ALLOWED_TRANSITIONS` if it changes state.
- **Style:** TypeScript everywhere, no `any` at module boundaries, functions that change data
  live in `lib/` rather than inside components, and every destructive action goes through
  `<Dialog>`.
- **Dependencies:** four runtime packages, all local. Please open an issue before adding one.
- **Tests:** `npm test` runs Vitest and React Testing Library against the queue engine, backup,
  settings, snapshots, offline contract and critical Join, Display, Customers and Settings flows.
  Add or update a test beside the code when behaviour changes; use `npm run test:watch` while
  iterating. The manual browser checklist remains for browser/device-specific behaviour.

The automated-suite notes and manual test checklist are in [docs/development.md](docs/development.md).
Release highlights are in [docs/release-notes-v1.0.0.md](docs/release-notes-v1.0.0.md).
Repository settings, topics and the release checklist are in [docs/release.md](docs/release.md).
An index of every document lives in [docs/README.md](docs/README.md).

## Verification

Verified on 2026-11-15 with the automated suite, Chromium and a production offline build.

- **Automated suite** — `npm test` passes 45 tests in 10 files (numbering, duplicate prevention,
  status transitions, daily resets, settings, IndexedDB persistence, backup, snapshots, offline
  and critical UI flows). `npm run typecheck`, `npm run build` and `npm audit --omit=dev` are clean.
- **Numbering** — 30 tickets issued simultaneously from two tabs produced sequences 1–30 with
  unique codes; clearing the day restarts at 001; restores continue from the last number.
- **Status rules** — illegal moves rejected (`waiting → done`, `done → waiting`,
  `cancelled → serving`), `skipped → waiting` works, and calling a second ticket closes the
  first so only one ticket is ever at the counter.
- **Customer flow** — form validation, ticket page, returning-ticket banner, leave-queue dialog
  (cancel keeps the place, confirm cancels), copy-link, all dialogs and disclosures.
- **Backup** — export downloads the documented JSON; file and paste restore; duplicate merge
  skips existing tickets; conflicting numbers are renumbered; replace-all wipes then restores;
  malformed JSON is rejected with a specific message and no writes.
- **Operations** — walk-in intake, serve/done/skip/recall/requeue, day history (read-only),
  retention purge, QR render + PNG download, settings save/reset, delete-all.
- **Offline (production build)** — the service worker activated and controlled the origin;
  with the network disabled, reloading `#/admin`, opening `#/join`, issuing ticket `A-004` and
  loading `#/display` all worked from the precache and IndexedDB.
- **Display mode** — `#/display` showed `A-001`, then switched to `A-002` within five seconds of
  **Call next** on the dashboard; the completed number moved to **Just served**, the next one to
  **Up next**, no customer names appeared, and the code rendered at 267 px on a 1280 px viewport.
- **Branding** — a PNG logo and `#5B7CFA` brand colour survived save and reload on the dashboard,
  join page and display; the join button rendered in the chosen colour with readable ink.
- **Customers** — three tickets across two names grouped into two customers, with a repeat badge,
  phone number and per-customer ticket history.
- **Reports** — date picker moved to yesterday and back, archived copy appeared, and Export JSON
  produced `antrilah-day-2026-11-15.json`.
- **Privacy centre** — daily recovery copies listed, manual copy created, and restore/day-delete/
  reset dialogs opened, explained the impact and cancelled without writing anything.
- **Layouts** — no horizontal overflow at 1440, 390 or 320 px on any page.

Known limits: the screenshots above are from Chromium; scanning a printed QR with a phone,
Safari/Firefox specifics, screen-reader output and audible speaker output were not covered by the
browser pass or the jsdom suite. Display sound was toggled without errors, but the tone itself was
not heard.

## Browser support

Latest Chrome, Edge, Firefox and Safari (desktop and mobile). The app needs IndexedDB,
`BroadcastChannel`, service workers (for offline) and ES2020 — all available in browsers from
around 2021 onwards. If storage is blocked (some private modes), Antrilah explains the problem
instead of showing a broken queue.

## Privacy and security

- No analytics, cookies, trackers, remote fonts or third-party scripts.
- The only network requests are for the app's own files and (optionally) the backup file you
  choose — nothing is uploaded.
- Queue data, uploaded logos (stored as data URLs), brand colours, sounds and recovery copies
  stay in the browser profile that created it. Different browser, different device or cleared
  site data means a fresh queue, so export backups.
- Logos are limited to PNG/JPG/WebP/GIF under 250 KB and are never fetched from a URL, so the app
  makes no request for them. Sounds are synthesised with Web Audio and have no asset or network
  dependency.
- Nothing secret is stored in the repository: there are no API keys, accounts or paid services
  to configure. See [SECURITY.md](SECURITY.md) for reporting a vulnerability.

## Contributing

Contributions are welcome — bug reports, docs, translations and code. Please read
[CONTRIBUTING.md](CONTRIBUTING.md) first; it covers setup, style, the "no backend, no paid
services" rule and how to run the checks. By taking part you agree to the
[Code of Conduct](CODE_OF_CONDUCT.md).

Good first issues: keyboard shortcuts on the dashboard, print stylesheet for the QR poster,
Safari/Firefox testing, and translations for the customer-facing pages.

- [Report a bug](https://github.com/Ahdanrikzan/antrilah/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/Ahdanrikzan/antrilah/issues/new?template=feature_request.yml)
- [Open a pull request](https://github.com/Ahdanrikzan/antrilah/compare)

## License

[MIT](LICENSE) © 2026 Antrilah contributors.

Free to use, copy, modify, merge, publish, distribute, sublicense and sell. No account, API key
or invoice required, and no attribution on the customer-facing screen.
