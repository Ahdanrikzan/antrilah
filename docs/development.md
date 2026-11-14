# Development notes

This document covers the internals: schema, queue rules, modules, and the manual checklist used
before a release. For setup commands see the [README](../README.md#quick-start); for contributor
expectations see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| UI | React 18 + TypeScript | familiar, no meta-framework to learn |
| Build | Vite 6 | fast dev server, tiny config, static output |
| Styling | Tailwind CSS 3 | utilities only, no component library to fight |
| Storage | Dexie 4 (IndexedDB) | reliable transactions, live queries, no server |
| QR | `qrcode` | generated on-device as a data URL |

Four runtime dependencies in total. No router package: `src/lib/hooks.ts` implements a small hash
router so the built site works on any static host without rewrite rules.

## Module map

```
src/
  App.tsx             layout, hash routes, lazy-loaded admin, service-worker wiring
  main.tsx            React root + ErrorBoundary
  Lib
    db.ts             Dexie schema (v2), types, DEFAULT_SETTINGS, getSettings/saveSettings
    queue.ts          issueTicket, setStatus, callNext, recallTicket, requeueTicket,
                      runHousekeeping, purgeOldTickets, seedDemoQueue, listDays,
                      clearToday, clearAllTickets, dayKey, QueueError, ALLOWED_TRANSITIONS
    backup.ts         buildBackup, parseBackup, importBackup, downloadJson, estimateStorage
    hooks.ts          useHashRoute, useQuery, useNow, useCopy, useLocalFlag, useOnline
    sync.ts           BroadcastChannel signal + subscription helper
    pwa.ts            registerServiceWorker (production only), applyUpdate
    utils.ts          formatting, labels, percentages
  components/
    ui.tsx            Button, Panel, Tag, Field, Input, Select, Textarea, StatCard,
                      Tabs, StatusPill, Skeleton, EmptyState, Icon, Logo, Reveal…
    Dialog.tsx        focus-trapped modal (Escape, backdrop, focus restore)
    Toast.tsx         polite live region + provider
    Onboarding.tsx    three-step first-run tour
    ErrorBoundary.tsx, StorageError.tsx, SystemBanners.tsx
  pages/
    Landing.tsx, Join.tsx, Track.tsx, Admin.tsx, AdminPanels.tsx, DataPanel.tsx
```

## Data model

Database `antrilah`, Dexie version 2.

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

### `settings`

Single row, `id: 'app'`: `businessName`, `tagline`, `serviceLabel`, `prefix`,
`avgServiceMinutes`, `openHours`, `welcomeNote`, `qrBaseUrl`, `autoSkipMinutes`,
`autoCompleteMinutes`, `retentionDays`. Defaults live in `DEFAULT_SETTINGS`; ranges are enforced
by `sanitizeSettings` in `backup.ts`.

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

## Manual test checklist

Run before tagging a release, with `npm run build && npm run preview` for anything involving the
service worker or offline behaviour.

**Queue engine**

- [ ] Two tabs on `#/join`, issue tickets simultaneously — codes are sequential and unique.
- [ ] Call next with a ticket already serving — the first closes, the second serves.
- [ ] Try invalid moves through the UI (done → serve, cancelled → serve) — blocked with a message.
- [ ] Skip a waiting ticket, then requeue it from the closed chips.
- [ ] Clear today — numbering restarts at 001, previous days remain in history.
- [ ] Yesterday's day chip opens read-only; "back to today" returns.

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

**PWA and layout**

- [ ] Production build registers a service worker and precaches assets.
- [ ] Offline reload, navigation, issuing a ticket and opening `#/admin` all work.
- [ ] No horizontal overflow at 1440, 390 and 320 px on all four routes.
- [ ] `npm run typecheck` and `npm run build` pass.

## Debugging

- IndexedDB in Chrome DevTools → Application → IndexedDB → `antrilah`.
- Clear local data from the console: `indexedDB.deleteDatabase('antrilah')`.
- Service worker state: Application → Service Workers; "Update on reload" is useful while
  testing `dist/`.
- Reset the tour/checklist flags: remove `antrilah:*` keys from localStorage.
