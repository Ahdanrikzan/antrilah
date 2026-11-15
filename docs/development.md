# Development notes

This document covers the internals: schema, queue rules, modules, the automated suite and the
manual checklist used before a release. For setup commands see the
[README](../README.md#quick-start); for contributor expectations see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| UI | React 18 + TypeScript | familiar, no meta-framework to learn |
| Build | Vite 6 | fast dev server, tiny config, static output |
| Styling | Tailwind CSS 3 | utilities only, no component library to fight |
| Storage | Dexie 4 (IndexedDB) | reliable transactions, live queries, no server |
| QR | `qrcode` | generated on-device as a data URL |
| Tests | Vitest 4 + React Testing Library | runs in Node 20 CI; no browser server needed |

Four runtime dependencies in total. No router package: `src/lib/hooks.ts` implements a small hash
router so the built site works on any static host without rewrite rules.

## Module map

```
src/
  App.tsx             layout, hash routes, lazy-loaded admin, service-worker wiring
  main.tsx            React root + ErrorBoundary
  Lib
    db.ts             Dexie schema (v3), types, DEFAULT_SETTINGS, getSettings/saveSettings
    queue.ts          issueTicket, setStatus, callNext, recallTicket, requeueTicket,
                      runHousekeeping, purgeOldTickets, seedDemoQueue, listDays,
                      clearToday, clearAllTickets, dayKey, QueueError, ALLOWED_TRANSITIONS
    backup.ts         buildBackup, parseBackup, importBackup, downloadJson, estimateStorage
    sound.ts          Web Audio chimes (no audio files), primeAudio/playSound
    snapshots.ts      local recovery copies: create, list, restore, delete, reset
    hooks.ts          useHashRoute, useQuery, useNow, useCopy, useLocalFlag, useOnline
    sync.ts           BroadcastChannel signal + subscription helper
    pwa.ts            registerServiceWorker (production only), applyUpdate
    utils.ts          formatting, labels, percentages
  components/
    ui.tsx            Button, Panel, Tag, Field, Input, Select, Textarea, StatCard,
                      Tabs, StatusPill, Skeleton, EmptyState, Icon, Logo, Reveal…
    Dialog.tsx        focus-trapped modal (Escape, backdrop, focus restore)
    Toast.tsx         polite live region + provider
    SetupWizard.tsx   four-step setup wizard: business, numbering, daily queue, QR preview
    BrandLogo.tsx     uploaded logo or the Antrilah mark
    ErrorBoundary.tsx, StorageError.tsx, SystemBanners.tsx
  pages/
    Landing.tsx, Join.tsx, Track.tsx, Admin.tsx, AdminPanels.tsx, DataPanel.tsx,
    Display.tsx        full-screen waiting-room screen (lazy loaded)
    CustomersPanel.tsx customer directory derived from ticket names
    *.test.tsx         critical UI flows beside their page
  test/
    setup.ts           fake IndexedDB, database reset, storage/BroadcastChannel shims
    helpers.ts         ticket fixtures shared by the logic suites
  lib/*.test.ts        queue, backup, settings, snapshots and service-worker contract
```

## Data model

Database `antrilah`, Dexie version 3. Version 3 adds the `snapshots` table; existing tickets,
counters and settings migrate in place.

### `tickets`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string (PK) | `dayKey-seq-random` |
| `dayKey` | string, indexed | local `YYYY-MM-DD` |
| `seq` | number, indexed | 1-based per day |
| `code` | string, indexed | display code, e.g. `A-014` |
| `name` | string | ≤ 60 chars |
| `phone` | string | optional contact, ≤ 32 chars |
| `note` | string | optional staff note, ≤ 120 chars |
| `status` | enum, indexed | `waiting`, `serving`, `done`, `skipped`, `cancelled` |
| `createdAt` | number | epoch ms |
| `calledAt` | number \| null | when called to the counter |
| `completedAt` | number \| null | when closed |
| `statusChangedAt` | number | last transition, used for "waiting 12m" |

Compound index: `[dayKey+status]`. Also indexed: `createdAt`, `code`.

### `counters`

| Field | Type | Notes |
| --- | --- | --- |
| `dayKey` | string (PK) | local calendar day |
| `lastSeq` | number | highest number issued that day |
| `issued` | number | how many tickets were issued that day |

### `snapshots`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string (PK) | `snap-<epoch>-<random>` |
| `createdAt` | number, indexed | epoch ms; newest three are kept |
| `reason` | string | daily, manual, before deletion/cleanup |
| `ticketCount` | number | shown in the Data tab |
| `payload` | string | serialised backup document |

Snapshots are local-only recovery copies. They are not included in exported backups and are
removed by a full reset.

### `settings`

Single row, `id: 'app'`: `businessName`, `tagline`, `description`, `serviceLabel`, `prefix`,
`avgServiceMinutes`, `openHours`, `welcomeNote`, `qrBaseUrl`, `logoDataUrl`, `brandColor`,
`soundEnabled`, `soundOnCall`, `soundOnJoin`, `soundVolume`, `soundName`, `autoSkipMinutes`,
`autoCompleteMinutes`, `retentionDays`. Defaults live in `DEFAULT_SETTINGS`; ranges are enforced
by `sanitizeSettings` in `backup.ts`. `getSettings()` merges stored rows over the defaults, so
new fields appear without a migration.

## Status rules

| From | Allowed next |
| --- | --- |
| `waiting` | `serving`, `skipped`, `cancelled` |
| `serving` | `done`, `skipped`, `cancelled`, `waiting` |
| `skipped` | `waiting` |
| `done` | — terminal |
| `cancelled` | — terminal |

`setStatus()` checks `ALLOWED_TRANSITIONS` and throws `QueueError` otherwise. Two extra
invariants:

- Calling a ticket (`serving`) closes any other `serving` ticket for the same day first.
- Backup import normalises a day with several `serving` records down to the most recently called
  one; the others return to `waiting`.

## Numbering

`issueTicket` uses one Dexie `rw` transaction on `['tickets', 'counters']`:

1. read the counter row for today's local `dayKey` (or 0),
2. read the highest `seq` for that day as a safety net for imports,
3. `next = max(lastSeq, highest) + 1`,
4. write the ticket and `{ lastSeq: next, issued: issued + 1 }` together.

IndexedDB serialises overlapping read-write transactions across tabs, so the number cannot be
handed out twice. Restores rebuild counters per day from `max(seq)` and the row count; conflicting
`dayKey+seq` imports are renumbered to the end of the day and reported in the import summary.

## Reads, refresh and cross-tab updates

- `useQuery(fn, deps)` reads IndexedDB, re-runs on mount, window focus, a 4-second poll and any
  broadcast signal.
- Every mutation calls `notifyChange()` (`lib/sync.ts`), which posts on a `BroadcastChannel` and
  also refreshes the current tab.
- Customer ticket pages therefore update within a few seconds of a staff action, without polling
  a server.

## Service worker

`public/sw.js` is plain JavaScript, no Workbox:

- `install` precaches `index.html`, the icon, the manifest and every hashed asset emitted by the
  build (the list is injected into `[/*__PRECACHE__*/]` by `antrilah-precache` in
  `vite.config.ts`).
- `activate` deletes older `antrilah-*` caches and claims clients.
- Navigations are network-first with a cached `index.html` fallback; other same-origin GETs are
  cache-first with a network fallback that stashes the response.
- `VERSION` names the cache. Bump it when the caching strategy changes.
- Registration happens only when `import.meta.env.PROD`, so development keeps HMR.

## Automated tests

```bash
npm test           # one run (CI uses this)
npm run test:watch # re-run changed files while developing
```

The suite uses Vitest 4, React Testing Library, jsdom and `fake-indexeddb`. It runs on Node 20+ and
needs no browser, backend or network. There are 45 tests across 10 files:

| File | Covers |
| --- | --- |
| `lib/queue.test.ts` | Formatting, sequential and concurrent numbering, duplicate prevention, daily reset, every status transition, single-serving invariant, recall, call next, clear/delete day |
| `lib/backup.test.ts` | Export shape, validation, field sanitising, duplicate IDs, merge/replace, conflict renumbering, counter continuity, serving normalisation |
| `lib/settings.test.ts` | Defaults, partial saves, legacy rows, branding/sound limits, IndexedDB close/reopen persistence |
| `lib/snapshots.test.ts` | Daily dedupe, three-copy retention, restore, delete and reset |
| `lib/offline.test.ts` | Service-worker precache/caching contract and development registration guard |
| `pages/Join.test.tsx` | Successful check-in, remembered ticket flag and navigation |
| `pages/Display.test.tsx` | Now-serving updates, name privacy, background and opt-in sound |
| `pages/CustomersPanel.test.tsx` | Grouping, repeat badges, walk-in exclusion, search/filter and visit history |
| `pages/SettingsPanel.test.tsx` | Business-name and notification switches saved to IndexedDB |
| `pages/Offline.test.tsx` | Offline banner and issuing a ticket without a network |

Isolation matters because the app uses a real Dexie schema. `src/test/setup.ts` installs
`fake-indexeddb/auto`, stubs `BroadcastChannel`, provides an in-memory `localStorage` when Node
does not, and after every test deletes and reopens the database. Tests that need a fixed day use
`vi.useFakeTimers({ toFake: ['Date'] })` so Dexie timers keep working. Add a test beside the
changed code and keep it deterministic; browser-only behaviour (installing the PWA, real audio,
printing, cross-device QR scanning) stays in the manual checklist.

## Manual test checklist

Run `npm test`, `npm run typecheck` and `npm run build` before tagging a release, then use
`npm run preview` for anything involving the service worker or offline behaviour.

**Queue engine**

- [ ] Two tabs on `#/join`, issue tickets simultaneously — codes are sequential and unique.
- [ ] Call next with a ticket already serving — the first closes, the second serves.
- [ ] Try invalid moves through the UI (done → serve, cancelled → serve) — blocked with a message.
- [ ] Skip a waiting ticket, then requeue it from the closed chips.
- [ ] Clear today — numbering restarts at 001, previous days remain in history.
- [ ] Yesterday's day chip opens read-only; "back to today" returns.

**First-run setup**

- [ ] Clear the `antrilah:*` flags, open `#/admin`: the wizard opens on step 1 with focus in the
      business name field.
- [ ] Prefix change updates the ticket preview immediately; average service time updates the wait.
- [ ] Invalid public URL blocks Finish; skipping discards edits and leaves settings unchanged.
- [ ] Finishing saves settings, shows the next number in a toast and does not reopen on reload.
- [ ] The wizard reopens from the header icon, the setup checklist and Settings → Setup wizard.
- [ ] Works at 390 px and 320 px with no horizontal overflow.

**Customer flow**

- [ ] Name required; optional contact appears on the ticket page.
- [ ] Ticket page shows position, people ahead, estimated wait, live status.
- [ ] Leave queue: cancel keeps the ticket, confirm marks it cancelled.
- [ ] Copy link puts the ticket URL on the clipboard.
- [ ] Reload keeps the ticket (IndexedDB) and invalid ids show a friendly not-found state.

**Dashboard**

- [ ] Walk-in form issues the previewed number.
- [ ] Serve / done / recall / skip all work and update stats.
- [ ] Day chips, insights charts, QR render + PNG download, copy join link.
- [ ] Settings save, reset changes, automation ranges, retention.
- [ ] Delete today and delete all show confirmation dialogs and leave empty states.

**Backup**

- [ ] Export downloads valid JSON; copy JSON copies it.
- [ ] Restore from file and from pasted JSON; merge twice (second is a no-op).
- [ ] Conflicting `dayKey+seq` is renumbered; next issued number is correct.
- [ ] Replace all wipes then restores; malformed JSON changes nothing.

**Display, customers and privacy**

- [ ] `#/display` shows the serving number and updates within one poll after **Call next**.
- [ ] Up-next and just-served lists match the queue; no customer names appear.
- [ ] Fullscreen opens and exits; sound needs one tap and survives a reload.
- [ ] Branding logo/colour/description save and appear on join, ticket, admin and display.
- [ ] Customers search, repeat filter, phone and visit history match the tickets.
- [ ] Insights date picker and arrows switch days; Export JSON downloads that day.
- [ ] Recovery copy appears after opening the dashboard; restore/delete/reset dialogs cancel cleanly.
- [ ] Deleting one day keeps other days and settings; reset returns a fresh install.

**PWA and layout**

- [ ] Production build registers a service worker and precaches assets.
- [ ] Offline reload, navigation, issuing a ticket and opening `#/admin` show the same data.
- [ ] No horizontal overflow at 1440, 390 and 320 px on all five routes.
- [ ] `npm test`, `npm run typecheck` and `npm run build` pass.

## Debugging

- IndexedDB in Chrome DevTools → Application → IndexedDB → `antrilah`.
- Clear local data from the console: `indexedDB.deleteDatabase('antrilah')`.
- Service worker state: Application → Service Workers; "Update on reload" is useful while
  testing `dist/`.
- Reset the wizard/checklist flags: remove `antrilah:onboarded`, `antrilah:setup-dismissed` and
  `antrilah:share-visited` from localStorage.
