# Contributing to Antrilah

Thanks for wanting to help. Antrilah is a small project with a simple promise: a complete queue
system that anyone can host for free, forever, with no backend or paid service. Contributions
that protect that promise are very welcome.

## Ground rules

1. **No backend, no cloud, no accounts.** IndexedDB is the source of truth. Features that need a
   server (real-time sync between devices, email/SMS notifications, online payments) are out of
   scope for the core app.
2. **No paid services or API keys.** The app must keep working with the network unplugged.
3. **No telemetry, trackers or third-party fonts/scripts.** The only requests are for the app's
   own files.
4. **Dependencies are a cost.** There are four runtime packages; please open an issue before
   adding another.
5. **Accessibility is part of "done".** Real buttons, visible labels, keyboard support, focus
   management in dialogs, and text labels alongside colour.

## Ways to help

- **Report bugs** — use the [bug report form](https://github.com/Ahdanrikzan/antrilah/issues/new?template=bug_report.yml).
  Include browser, steps and what you expected.
- **Suggest features** — use the [feature request form](https://github.com/Ahdanrikzan/antrilah/issues/new?template=feature_request.yml).
  Explain the queue problem first, the solution second.
- **Improve docs** — setup confusion is a bug. Fixing a sentence counts.
- **Write code** — start with issues labelled `good first issue`.
- **Test on other browsers/devices** — Firefox, Safari, Android and iOS reports are valuable
  because the maintainers develop in Chromium.

## Development setup

```bash
git clone https://github.com/<your-fork>/antrilah.git
cd antrilah
npm install
npm run dev        # http://localhost:3000
```

Node.js 20+ is required (`.nvmrc` pins the major version, so `nvm use` works). No environment
variables, database or API keys are needed.

Before opening a pull request:

```bash
npm run typecheck  # TypeScript, no emit
npm run build      # type-check + production bundle + service-worker precache
```

Then exercise the area you touched in the browser. There is no test runner yet, so
[docs/development.md](docs/development.md) contains the manual checklist used for releases;
mention in the PR which parts you checked.

## How the code is organised

```
src/pages/       screens (Landing, Join, Track, Admin, panels)
src/components/  shared UI kit, Dialog, Toast, ErrorBoundary, Onboarding
src/lib/         db, queue engine, backup, hooks, sync, pwa, utils
public/          icon, manifest, service worker template
docs/            backup format, development notes, deployment, release notes
```

Guidelines that keep the codebase consistent:

- **Data changes belong in `src/lib/`**, not in components. `queue.ts` owns queue mutations and
  throws `QueueError` for anything invalid; add the transition to `ALLOWED_TRANSITIONS` first.
- **Components take props and render.** Read data with `useQuery` from `lib/hooks.ts`.
- **Every destructive action uses `<Dialog>`** (focus trap, Escape, focus restore).
- **TypeScript strict mode.** Avoid `any`; prefer explicit types at module boundaries.
- **Styling uses Tailwind utilities and the design tokens** in `tailwind.config.js`. Match the
  existing brutalist look — thick borders, hard shadows, flat colour blocks.
- **Comments explain why, not what.** The queue and backup modules are documented because their
  invariants matter.

## Pull requests

1. Fork the repo and create a branch: `fix/ticket-double-call`, `feat/qr-poster`, `docs/deploy`.
2. Keep the change focused. One topic per PR is easier to review and revert.
3. Write a clear description: what problem it solves, how you tested it, and any screenshots for
   UI changes.
4. Link the issue it closes (`Closes #12`).
5. Make sure `npm run typecheck` and `npm run build` pass.
6. Be patient — this is a volunteer project, and a friendly nudge after a week is fine.

Commit messages: a short imperative subject (`Fix duplicate call from two tabs`), then a body
explaining the reason if it is not obvious. No strict convention beyond readability.

## Reporting bugs safely

Do not paste real customer data, phone numbers or backups from production into an issue. Reproduce
with fake names, or trim the JSON. Security issues go to the private channel described in
[SECURITY.md](SECURITY.md), not the public tracker.

## Code of conduct

Be decent. Harassment, discrimination, personal attacks and dismissive behaviour are not welcome.
Assume good faith, critique the code rather than the person, and keep discussions about the
project. The full expectations and enforcement steps are in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

By contributing you agree that your work is released under the [MIT License](LICENSE), the same
licence as the project. No copyright assignment is required.
