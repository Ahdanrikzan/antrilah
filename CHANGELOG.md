# Changelog

All notable changes to Antrilah are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-11-14

First public release.

### Added

- Customer check-in (`#/join`) with live now-serving number, waiting count and estimated wait.
- Personal ticket page (`#/ticket/:id`) with position, people ahead, progress rail and a live
  "it's your turn" state; self-service leave-queue with confirmation.
- Staff dashboard (`#/admin`) with Queue, Insights, Data, QR and Settings tabs.
- Collision-free per-day numbering (`A-001`, `A-002`, …) backed by a Dexie counter transaction,
  safe across tabs and resets at local midnight.
- Strict status machine (`waiting`, `serving`, `done`, `skipped`, `cancelled`) with re-queue for
  skipped tickets and a single-ticket-at-the-counter invariant.
- Walk-in intake, day history with read-only previous days, clear today and delete all.
- Insights: seven-day volume, hourly arrivals, average wait and service time, no-show rate.
- On-device QR check-in with PNG download and configurable public URL.
- JSON backup export (file or clipboard), validated import with merge/replace, duplicate
  detection, conflict renumbering and counter rebuild.
- Retention window and storage-usage readout.
- Offline-first PWA: build-time precache manifest, cache-first assets, network-first
  navigations, update prompt and installable manifest.
- Cross-tab updates via `BroadcastChannel`, optional automations, keyboard-accessible dialogs,
  error boundary, storage-blocked screen and designed empty states.
- Documentation: README, contributing guide, security policy, architecture/development notes,
  deployment guide, release checklist and backup schema.
- CI and GitHub Pages workflows, issue forms and pull-request template.

### Fixed

- Installing the build under a subdirectory (for example a GitHub Pages project site) no longer
  breaks because assets use relative paths.
- Backup merge normalises a day down to one `serving` ticket instead of creating two.
- Retention purge now removes every day outside the window; `1` keeps only today.
- Restored counters continue numbering instead of resetting.

### Security

- No backend, accounts, API keys or telemetry.
- Updated Vite and PostCSS within their major versions to clear all npm audit advisories.

[1.0.0]: https://github.com/Ahdanrikzan/antrilah/releases/tag/v1.0.0
