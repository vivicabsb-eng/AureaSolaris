# AI Working Guide — Aurea Solaris

This is the compact operational context for AI agents. Do not read every document by default.

## Read order

1. `AGENTS.md` — mandatory repository rules and product boundaries.
2. `docs/CONSTITUICAO.md` — normative decisions about privacy, data, editorial rigor, and Hermes.
3. This guide — task routing, validation, and release state.
4. Only the domain document required by the task.

If sources conflict, use: safety/privacy → Constitution → `AGENTS.md` → this guide → domain reference.

## Product invariant

Aurea Solaris is a local-first Windows application whose primary experience is currently a local web app opened in Chrome by a one-click launcher. Tauri remains a deferred native compatibility path. The Caderno Vivo board and journal are two views of the same data. The editorial astrology database is separate from each person's private database. Hermes proposes reversible actions; it never silently creates memory, tasks, events, interpretations, or external effects.

## Task routing

| Task | Start here |
|---|---|
| React screens/components | `apps/web/src/App.tsx`, `apps/web/src/components/` |
| Frontend identity/profile state | `apps/web/src/features/identity/` |
| Frontend agenda/task/event state | `apps/web/src/features/agenda/` |
| Frontend astrology preferences/helpers | `apps/web/src/features/astrology/` |
| Frontend health-document state | `apps/web/src/features/health/` |
| Cross-feature frontend workflows | `apps/web/src/app/workflows/`, `apps/web/src/app/AppProviders.tsx` |
| Legacy frontend context compatibility | `apps/web/src/context/AgendaContext.tsx` — thin adapter only; do not add new state, persistence, or domain rules here |
| Caderno Vivo / journal | `apps/web/src/components/MesaCriacao.tsx`, `apps/web/src/components/DiarioView.tsx` |
| Browser/Chrome runtime | `apps/web/vite.config.ts`, `main_api.py`, `launch_chrome.bat` |
| Tauri commands/window/native compatibility | `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`, `docs/tauri-ipc-api.md` |
| Astrology calculations/API | `astro_engine.py`, `main_api.py`, `docs/astrology-engine.md` |
| Private/editorial storage | `local_storage.py`, `src-tauri/migrations/`, `docs/data-persistence.md`, `docs/data/DOMINIOS_DE_DADOS.md` |
| Knowledge corpus/import | `knowledge/engenharia_astrologica/`, `docs/astrology-knowledge-contract.md`, `docs/data/ENGENHARIA_SYNC_PLAYBOOK.md` |
| Hermes memory/API | `apps/web/src/components/HermesChat.tsx`, `docs/HERMES_MIND_ARCHITECTURE.md`, `docs/HERMES_MIND_API.md` |
| Release/installer | `build.bat`, `build_sidecar.spec`, `src-tauri/binaries/`, `docs/RELEASE_VALIDATION_2026-08-10.md` |

Feature-owned frontend state keeps domain logic separate from browser persistence. Put pure behavior in the feature model, browser-key access in that feature's storage adapter, and React state/actions in the feature context. New feature code must consume the feature API rather than expanding the legacy `AgendaContext` facade.

## Chrome access and release path

- Default Chrome launch has no login and no logout.
- **Prefer the test-user sandbox** for manual checks, smoke tests, browser/runtime validation, and any agent-driven UI work (see next section).
- Testing mock natal is opt-in on the default runtime only: `?mockNatal=1` or `.\launch_chrome.ps1 -MockNatal`; turn off with `?mockNatal=0`.
- Local-owner tokens do not expire; an API restart invalidates them.
- A mode environment change needs an API restart.
- Require-login is for known-password accounts; password enrollment for an auto-created owner is not part of this change.
- Multiple, disabled, orphaned, or mismatched owners stop at setup-required and are never migrated automatically.
- `npm run build` updates `apps/web/dist` only. It does not update the PyInstaller executable.
- `build.bat` is the release path that rebuilds the frontend and embedded runtime.

## Test-user sandbox (preferred for agents)

Use the isolated **Pessoa Teste** sandbox whenever you need to open Aurea, click through screens, or validate runtime behavior. It keeps the person's real Aurea data untouched.

**Start the sandbox** (from the repository root):

```powershell
.\launch_chrome.ps1 -TestUser
```

**Wipe and re-seed** a clean dummy life (safe; only affects the test sandbox):

```powershell
.\launch_chrome.ps1 -TestUser -Reset
```

On `-Reset`, the launcher stops Aurea test-user runtimes on ports **9878–9899**, closes the isolated Chrome profile if needed, deletes the test sandbox folder, re-runs the seed, and starts a fresh API process.

| Item | Value |
|---|---|
| Owner id | `aurea-test` (display name **Pessoa Teste**) |
| Test private data | `%LOCALAPPDATA%\Aurea Solaris\test-user\data` |
| Test Chrome profile | `%LOCALAPPDATA%\Aurea Solaris\test-user\chrome-profile` |
| API port | **9878** by default (falls back to **9879–9899** if busy) |
| Health check | `GET http://127.0.0.1:<port>/health` → `"test_user": true` (use the port printed by the launcher) |
| Seed prerequisite | `.aurea-build-venv` must exist; `-TestUser` runs `tools\seed_test_user.py` via that venv |

**Never touch real data.** Agents must **not** seed, reset, delete, or modify `%LOCALAPPDATA%\Aurea Solaris\data`. That path is the person's real private Aurea. The seed script (`tools/seed_test_user.py`) refuses that directory and any folder inside it. If you need a clean state, use `-TestUser -Reset` only.

**What the dummy life includes** (high level):

- **Mandala / maps** — reference natal (Belo Horizonte fixture) plus a second known-person map (UI seed via `apps/web/src/fixtures/test-user-ui.json`).
- **Caderno Vivo** — board with sticky notes and a link between them.
- **Diário** — folder and sample entry.
- **Agenda** — sample tasks and one event.
- **Saúde** — fictional document preview (not a real exam).
- **Hermes** — sample thread, proposed memory, and one approved memory.

**`-MockNatal` vs `-TestUser`:**

| Mode | When to use |
|---|---|
| `-TestUser` | Full isolated sandbox with its own data dir, Chrome profile, port, and seeded dummy life. **Default choice for agents.** |
| `-MockNatal` or `?mockNatal=1` | Quick natal inject on the **default** runtime (`local-owner` on port 9876) without switching data directories. Good for a single chart check when you do not need Caderno, Agenda, or Hermes fixtures. |
| Both flags | `-TestUser` wins; the launcher never applies `-MockNatal` in test-user mode. |

Full persistence details: `docs/data-persistence.md`.

## Agent CI and E2E contract

CI is an executable supervisor for agentic development, not only a merge signal. A failure is a handoff to the next agent session: it must identify the failing layer, preserve useful evidence, and give a copyable reproduction command without requiring the project owner to diagnose raw logs.

The three PR check names below are stable automation interfaces. Do not casually rename them; agent workflows and future branch protection may depend on the exact names.

| Check | Purpose | Local equivalent |
|---|---|---|
| `Frontend Quality` | Cheap React/TypeScript correctness | `npm run lint`, `npm run typecheck`, `npm test` |
| `Python Quality` | Ubuntu-safe API/runtime/storage/unit coverage | classified `python -m unittest ... -v` suite |
| `E2E` | Authoritative isolated compiled frontend + Python runtime + Playwright validation | build → compiled runtime smoke → `python tools/run_e2e.py --skip-build` |

`Frontend Quality` and `Python Quality` run independently. `E2E` starts only after both pass, builds `apps/web/dist` once, runs `tests.test_compiled_runtime_smoke`, installs Chromium only after that preflight, then runs the isolated Playwright harness against the exact build.

For normal local/agent E2E, use `python tools/run_e2e.py`; it intentionally rebuilds `apps/web/dist` so stale frontend output cannot be tested accidentally. Use `python tools/run_e2e.py --skip-build` only when `npm run build` completed successfully immediately beforehand in the same workflow/session and the caller intends to test that exact build.

Every `tests/test_*.py` file must be listed exactly once in `.github/python-test-classification.txt`. The CI classification check fails on new unclassified tests, deleted-but-listed tests, duplicates, or unknown categories. `python-quality` modules run in `Python Quality`; `integration` modules run after prerequisites such as `apps/web/dist`; platform/release-only and legacy pytest-style coverage remain explicitly classified rather than silently omitted.

Each CI job writes an agent handoff to the GitHub job summary with gate outcomes, local reproduction commands, the likely subsystem to inspect first, and artifact names where relevant. Playwright remains single-worker with zero retries so a green run cannot be created by retrying dirty shared state.

- Catalog: `apps/web/e2e/catalog/README.md`
- Headless local runtime: `python tools/run_e2e.py` (or `.aurea-build-venv\Scripts\python.exe tools\run_e2e.py`)
- On request (visual + sandbox): use the project skill `.cursor/skills/aurea-e2e/`
- Never run local E2E against `%LOCALAPPDATA%\Aurea Solaris\data`
- `npm run check` does not include authoritative browser E2E; `.github/workflows/e2e.yml` does
- Prefer Playwright + playbooks over `tests/mandala_visual_smoke.ps1` when both cover the same id; keep the PowerShell smoke until Astrologia E2E + mandala playbook are green, then leave it as optional legacy

## Vercel preview and deployed validation

Vercel is a second agent validation environment, not a substitute for the local Python-backed runtime. The workflow `.github/workflows/deployed-e2e.yml` accepts a successful Vercel deployment event or an explicit deployment URL plus exact deployment SHA and runs only the non-destructive `deployed-smoke.spec.ts` contract: root document, React bootstrap, critical same-origin document/script/stylesheet network failures **and non-2xx HTTP responses**, and uncaught browser errors.

- Review an unmerged branch on that branch/PR's **Vercel Preview Deployment**, never on the production URL.
- `https://aurea-solaris.vercel.app` represents `main`/production and is suitable only for post-merge smoke or production inspection.
- Keep the exact deployment URL associated with the PR/commit being reviewed; an agent must not infer that production contains unmerged code.
- **Privileged deployed validation never executes the deployed/PR commit.** The deployment URL and deployment SHA are metadata only. `Deployed E2E` checks out the smoke harness and Node dependencies from trusted `main`, then points that trusted harness at the supplied Vercel deployment.
- A manual `workflow_dispatch` run requires both the exact deployment URL and a 40-character deployment SHA. That SHA is operator-supplied expected provenance and is **not** independently verified against Vercel metadata; do not describe it as Vercel-confirmed. Automatic `repository_dispatch` runs require Vercel's `client_payload.git.sha` and refuse to invent a fallback revision.
- The deployed smoke currently validates the hosted web build only. It does not certify `main_api.py`, persistence, private data, astrology calculations, or the full test-user lifecycle; those remain responsibilities of `E2E`.
- If deployed tests later need API/data behavior, provide a dedicated synthetic/isolated backend. Never connect Vercel previews or automated browser agents to the owner's real Aurea private data.
- **Do not expose a long-lived Vercel automation bypass secret to this workflow.** The current smoke requires a deployment the runner can access without a project-wide bypass credential. If protected-preview automation is required later, use a short-lived, policy-restricted trusted-source/OIDC mechanism and keep the trusted harness boundary; never execute PR-controlled code with deployment credentials.
- Automatic preview smoke requires the Vercel project to be Git-connected to this GitHub repository and configured to emit successful-deployment events. Until that external integration is enabled and proven, `Deployed E2E` is supplemental and is not a required PR status check.

## Required working loop

1. Inspect `git status --short --branch` and preserve existing changes.
2. Search with `rg`; read the smallest relevant code and domain document.
3. Make a small change with `apply_patch`.
4. Update the relevant documentation when behavior, data, or workflow changes.
5. Validate proportionally using the same commands as the relevant CI gate; use authoritative local `E2E` for runtime/browser changes and the exact Vercel preview URL for deployed-web review when available.
6. Report files changed, data/privacy risk, validation performed, commit hash, CI/deployment evidence, and real remaining blockers.

Never use destructive Git commands, invent astrological values or sources, commit secrets, mix private data with editorial data, or silently downgrade a certified calculation to a fallback.

## Calculation requirements

Every calculation must preserve UTC, IANA timezone, location, zodiac, ayanamsa when applicable, house system, orbs, engine/ephemeris version, and input hash. A result is certified only when its receipt is valid and the relevant reference checks pass.

## Release state

Release `0.1.1` has a successful technical build and source-generated sidecar smoke test. The Chrome-first local runtime now serves the compiled frontend from the local API and opens in default `local-owner` mode without a login screen. Native installer work remains paused. Do not claim the browser release fully accepted until launcher startup, navigation, calculation, Hermes, persistence, and shutdown are checked by a person.

## Documentation policy

- Keep this guide short and operational.
- Keep product/data rules in `AGENTS.md` and `docs/CONSTITUICAO.md`; do not duplicate them here.
- Keep detailed domain facts in one domain document and link to it.
- Keep completed plans and abandoned implementation notes out of the current documentation tree; Git history preserves them when needed.
- Do not create a handoff document with a second project status; update this guide or the release validation record instead.
