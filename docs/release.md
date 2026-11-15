# Release checklist

Use this when publishing the repository and cutting a version. The owner/repo used across
`package.json`, `README.md`, `CONTRIBUTING.md` and the issue-template links is
`Ahdanrikzan/antrilah`; update those if the project moves.

## 1. Repository metadata

**About** (top-right of the repository page):

> Free, open-source, local-first queue management. Numbered tickets, live wait times and a staff
> dashboard in the browser — no backend, no accounts, no subscriptions.

**Topics** (paste one at a time):

```
queue-management
queue
waiting-room
line-management
ticketing
pwa
offline-first
local-first
indexeddb
dexie
react
vite
tailwindcss
small-business
clinic
salon
no-backend
open-source
```

**Social preview:** upload `public/social-preview.png` under Settings → General → Social preview.

**Features to enable:** Issues, Discussions (optional), Wiki (off), Projects (optional),
Sponsorships (optional), *Preserve this repository* (optional), Security → Private vulnerability
reporting (recommended), Dependabot alerts.

**Default branch:** `main`. Make sure the branch protection you want (at minimum: require the CI
workflow to pass before merging) is configured.

## 2. Verify before tagging

```bash
npm ci
npm test
npm run typecheck
npm run build
npm audit --omit=dev
npm run preview   # manual smoke test
```

All 45 tests must pass. Then work through the manual checklist in
[development.md](development.md#manual-test-checklist), especially numbering under two tabs,
backup merge/replace, and offline reload.

- [ ] `README.md` screenshots match the current UI.
- [ ] No secrets, `.env` files, backups or customer data committed (`git status`, `git log -p`).
- [ ] `package.json` version bumped and `package-lock.json` updated (`npm install --package-lock-only`).
- [ ] `CHANGELOG.md` has an entry for the version being released.
- [ ] Release notes are current in `docs/release-notes-v<version>.md`.
- [ ] Test suite, type-check, build and `npm audit --omit=dev` pass.
- [ ] `LICENSE` year and holder are correct.
- [ ] Issue templates, PR template and workflows present under `.github/`.
- [ ] `docs/README.md` links resolve and the new documents are listed there.

## 3. Publish

```bash
git tag -a v1.0.0 -m "Antrilah 1.0.0"
git push origin main --tags
```

Create a GitHub release from the tag, title `Antrilah 1.0.0`, and paste the prepared notes from
[release-notes-v1.0.0.md](release-notes-v1.0.0.md). Include the automated test count, the zero-cost
privacy model and the known browser/device limits; do not claim checks that were not run.

## 4. After publishing

- [ ] Enable GitHub Pages (Settings → Pages → GitHub Actions) and confirm the deployed URL loads
      and registers a service worker.
- [ ] Add the live demo URL to the README if you host one publicly.
- [ ] Open two or three `good first issue` items (print stylesheet, Safari/Firefox test, docs or
      translation work).
- [ ] Announce where appropriate and invite bug reports with browser details.
