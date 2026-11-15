# Antrilah 1.0.0

**The first public release — 15 November 2026.**

Antrilah is a free, MIT-licensed queue system that runs entirely in the browser. Take numbered
tickets, show customers their place in line, call the next person from a staff dashboard, and put
an oversized number on a waiting-room screen. There is no backend, account, API key, telemetry or
paid service to configure.

## Highlights

### For customers

- QR check-in with a live now-serving number and estimated wait.
- A personal ticket page with position, people ahead, a progress rail and a clear “it’s your turn”
  state that updates itself.
- Optional contact details, shareable ticket links and self-service leave-queue confirmation.
- The business’s own logo, brand colour and description, stored on the device.

### For staff

- One-tap **Call next**, recall, done, skip and requeue, with a strict status machine and exactly
  one ticket at the counter.
- Collision-free numbering that resets each morning and cannot double-issue across tabs.
- Walk-in intake, read-only day history, six dashboard sections and a setup wizard.
- Customer directory with search, repeat-visitor badges and per-customer visit history.
- Daily reports with a date picker, served/skipped/cancelled counts, seven-day volume and JSON
  export.
- Optional call/join sounds synthesised by the browser.

### Waiting-room display

`#/display` turns a tablet, laptop or TV into a high-contrast queue screen: an oversized current
number, up-next and just-served lists, live updates, fullscreen and an optional chime. It never
shows customer names and needs no second app or subscription.

### Ownership and privacy

- Everything lives in IndexedDB on the device running the desk.
- Full JSON export and validated restore, including merge and replace modes.
- Up to three automatic recovery copies, manual copies and one-click restore.
- Delete a single day, apply a retention window or reset the whole app behind clear confirmations.
- Logos are local data URLs; sounds are generated with Web Audio. No analytics, cookies, remote
  fonts or third-party requests.

## Reliability and tests

- **45 automated tests** across 10 files using Vitest, React Testing Library, jsdom and
  `fake-indexeddb`.
- Covered: queue numbering under concurrent issuance, duplicate prevention, every legal and
  illegal status transition, daily resets, clear/delete-day behaviour, settings persistence,
  customer grouping/search/history, IndexedDB close/reopen integrity, backup validation and
  merge/replace/renumbering, snapshot recovery, service-worker contract, offline check-in, and
  critical Join, Display, Customers and Settings interactions.
- `npm test`, `npm run typecheck` and `npm run build` pass with zero npm audit advisories.
- Production offline smoke test: service worker activated, then with the network disabled the
  dashboard, join page and display loaded from cache and a ticket was issued from IndexedDB.

## Quick start

```bash
git clone https://github.com/Ahdanrikzan/antrilah.git
cd antrilah
npm ci
npm run dev
```

Open `http://localhost:3000`, then go to `#/admin`. For a production build:

```bash
npm run build
npm run preview
```

Host `dist/` on GitHub Pages, Cloudflare Pages, Netlify, a NAS or any static server. HTTPS is
required for service-worker installation; `localhost` is exempt.

## Known limits

- The automated UI suite runs in jsdom. Safari/Firefox specifics, real-device PWA installation and
  printed-QR scanning still benefit from manual reports.
- Audible speaker output and screen-reader narration were not verified end to end.
- Day history and customer records are per browser profile; export backups before clearing site
  data or moving devices.
- Two different people with the same typed name are grouped as one customer.

## License

[MIT](../LICENSE). Free to use, copy, modify, distribute and sell. No account, API key or invoice
required.
