# Security policy

## Scope

Antrilah is a static, client-side application. There is no server, account system, database
service or API key, so the classic server-side attack surface does not exist. The parts that do
matter:

- **Data handling** — imported backup files, ticket names/notes, and settings are rendered by
  React (escaped by default) and validated in `src/lib/backup.ts` before being written.
- **Service worker** — caches only same-origin requests and ignores non-GET and cross-origin
  requests. There is no remote code execution or third-party script loading.
- **Deployment** — the app should be served over HTTPS; without it the service worker (and
  offline mode) is disabled by the browser.

## Supported versions

The latest release on `main` (currently `1.x`) receives fixes. Older copies are static files and
cannot be patched remotely — update your `dist/` deployment.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Use GitHub's private reporting: on the repository, open **Security → Advisories →
Report a vulnerability**. Include:

- what the issue is and where it lives (file/function if known),
- steps to reproduce, ideally with a minimal backup JSON or input value,
- the browser and version,
- the impact you believe it has.

You can expect an acknowledgement within a week. If the report is valid, a fix and a release note
will follow; credit is given unless you prefer to stay anonymous. Reports about missing security
headers on a maintainer's demo deployment are welcome too, but they are hosting configuration
rather than application bugs.

## Out of scope

- Data loss caused by clearing browser storage, private windows or using a different
  browser/device without an exported backup. The app documents this and offers backups.
- Anything requiring physical access to an unlocked device that already has the queue open.
- Missing hardening headers on third-party static hosts you choose yourself.
