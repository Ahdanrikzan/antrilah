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
npm run typecheck
npm run build
npm run preview   # manual smoke test
```

Work through the manual checklist in [development.md](development.md#manual-test-checklist),
especially numbering under two tabs, backup merge/replace, and offline reload.

- [ ] `README.md` screenshots match the current UI.
- [ ] No secrets, `.env` files, backups or customer data committed (`git status`, `git log -p`).
- [ ] `package.json` version bumped and `package-lock.json` updated (`npm install --package-lock-only`).
- [ ] `LICENSE` year and holder are correct.
- [ ] Issue templates, PR template and workflows present under `.github/`.

## 3. Publish

```bash
git tag -a v1.0.0 -m "Antrilah 1.0.0"
git push origin main --tags
```

Create a GitHub release from the tag, title `Antrilah 1.0.0`, and use notes like:

```markdown
First public release.

Highlights
- Local-first queue engine with collision-free numbering and a strict status machine.
- Customer check-in, live ticket pages and a staff dashboard with QR check-in.
- Validated JSON backup/restore with merge, replace and conflict renumbering.
- Offline-first PWA: precached shell, installable, update prompt.
- No backend, no accounts, no API keys, no telemetry. MIT licensed.

Known limits
- Visually tested in Chromium; Safari/Firefox and printed-QR scanning still need reports.
- Manual test checklist instead of an automated suite (contributions welcome).
```

## 4. After publishing

- [ ] Enable GitHub Pages (Settings → Pages → GitHub Actions) and confirm the deployed URL loads
      and registers a service worker.
- [ ] Add the live demo URL to the README if you host one publicly.
- [ ] Open two or three `good first issue` items (Vitest coverage, print stylesheet, Safari test).
- [ ] Announce where appropriate and invite bug reports with browser details.
