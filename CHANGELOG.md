# Changelog

All notable changes to Antrilah are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-11-15

First public release. Antrilah is a complete, local-first queue system that runs entirely in the
browser: no backend, accounts, API keys, telemetry or paid services.

### Added

- Customer check-in (`#/join`) with live now-serving number, waiting count and estimated wait.
- Personal ticket page (`#/ticket/:id`) with position, people ahead, progress rail and a live
  "it's your turn" state; self-service leave-queue with confirmation.
- Staff dashboard (`#/admin`) with Queue, Customers, Insights, Data, QR and Settings sections.
- Collision-free per-day numbering (`A-001`, `A-002`, …) backed by a Dexie counter transaction,
  safe across tabs and resets at local midnight.
- Strict status machine (`waiting`, `serving`, `done`, `skipped`, `cancelled`) with re-queue for
  skipped tickets and a single-ticket-at-the-counter invariant.
- Walk-in intake, read-only day history, clear today, delete a single day and a confirmed reset.
- Waiting-room display (`#/display`) for tablets, laptops and TVs: oversized now-serving number,
  up-next and just-served lists, live updates, fullscreen, optional browser-generated chime and a
  high-contrast, name-free layout.
- Customer directory derived from ticket names: search, phone, repeat-visitor badges and a full
  per-customer visit history, with no extra profile table or upload.
- Daily reports: date picker and day navigation, issued/served/skipped/cancelled cards, average
  daily volume, seven-day bars, hourly arrivals and per-day JSON export.
- Branding: local logo upload, brand colour with contrast-aware text, business description and a
  live customer preview; applied to check-in, ticket pages, dashboard header and display.
- Sound settings: master switch, call/join events, chime/bell/blip tones and volume, synthesised
  with Web Audio. A visual toast and optional sound announce new customers; calling next plays the
  chosen announcement.
- Data and privacy centre: storage usage, automatic daily recovery copies (newest three), manual
  copies, restore, retention cleanup and a confirmed full reset.
- Four-step first-run setup wizard: business details, ticket prefix and service pace, daily hours
  and automations, then QR generation — with live ticket/QR previews, field tooltips, validation
  and a skip/revisit flow.
- JSON backup export (file or clipboard), validated import with merge/replace, duplicate detection,
  conflict renumbering and counter rebuild.
- On-device QR check-in with PNG download and configurable public URL.
- Offline-first PWA: build-time precache manifest, cache-first assets, network-first navigations,
  update prompt and installable manifest.
- Cross-tab updates via `BroadcastChannel`, optional automations, keyboard-accessible dialogs,
  error boundary, storage-blocked screen and designed empty states.
- Automated test suite: 45 Vitest + React Testing Library tests covering numbering and duplicate
  prevention, status transitions, daily resets, customer records, settings, IndexedDB persistence,
  backup round-trips and conflicts, snapshots, offline behaviour and critical UI flows.
- Documentation: README, contributing guide, security policy, architecture, testing notes,
  deployment guide, release checklist, release notes and backup schema.
- CI and GitHub Pages workflows, issue forms and pull-request template.

### Fixed

- Installing the build under a subdirectory (for example a GitHub Pages project site) no longer
  breaks because assets use relative paths.
- Backup merge normalises a day down to one `serving` ticket instead of creating two.
- Retention purge now removes every day outside the window; `1` keeps only today.
- Restored counters continue numbering instead of resetting.
- The waiting-room number scales with code length and never wraps or overlaps the side panel.

### Security

- No backend, accounts, API keys, analytics, cookies, remote fonts or third-party scripts.
- Logos are limited to PNG/JPG/WebP/GIF data URLs under 250 KB and are never fetched remotely.
- Imported backups are validated and clamped before writing to IndexedDB.
- Runtime dependencies report zero npm audit advisories.

[1.0.0]: https://github.com/Ahdanrikzan/antrilah/releases/tag/v1.0.0
