# Aurea Solaris

Aurea Solaris is a local-first application for astrological study, personal organization, and reflection. Its current primary experience is a local web app opened in Chrome at `127.0.0.1`. Tauri and native installers are not the current focus. It is maintained through AI agents, so the repository's documentation is optimized for machine task routing and safe, small changes.

## Start Aurea in Chrome

On Windows, double-click [`launch_chrome.bat`](launch_chrome.bat). It starts
the local FastAPI runtime, serves the compiled frontend from `apps/web/dist/`, and opens
Chrome. Vite is not used during normal startup. If the compiled frontend is
missing in a source checkout, the launcher builds it once; after that, Node.js
is not needed to open the app.

For first-time setup, create the isolated Python environment and install the
frontend/runtime dependencies:

```powershell
python -m venv .aurea-build-venv
.\.aurea-build-venv\Scripts\python.exe -m pip install -r requirements-api.txt
npm install
```

The default local address is `http://127.0.0.1:9876`. If that port is already
occupied, the launcher selects another loopback port and the compiled frontend
follows the service's local origin.

## Start here as an AI agent

Read in this order:

1. [`AGENTS.md`](AGENTS.md) — mandatory rules, privacy boundaries, product map, and commands.
2. [`docs/CONSTITUICAO.md`](docs/CONSTITUICAO.md) — normative product and data decisions.
3. [`docs/AI_WORKING_GUIDE.md`](docs/AI_WORKING_GUIDE.md) — compact task routing and validation loop.
4. [`docs/index.md`](docs/index.md) — domain references.

Do not read the entire `docs/` tree by default. Use only the current domain document relevant to the task.

## Product boundaries

- The Caderno Vivo board and journal are two views of the same data.
- Editorial astrology knowledge and private person-owned data are separate databases.
- Hermes is the single assistant. Suggestions and memory are always reviewable and reversible.
- Astrological calculations preserve UTC, IANA timezone, location, configuration, engine/ephemeris version, and input hash.
- Financial features and Gmail are outside the current scope.

## Code map

| Area | Entry points |
|---|---|
| React interface | `apps/web/src/App.tsx`, `apps/web/src/components/`, `apps/web/src/context/` |
| Caderno Vivo/journal | `apps/web/src/components/MesaCriacao.tsx`, `apps/web/src/components/DiarioView.tsx` |
| Astrology engine/API | `astro_engine.py`, `main_api.py` |
| Chrome/local runtime | `apps/web/vite.config.ts`, `main_api.py`, `launch_chrome.bat` |
| Tauri/native compatibility | `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json` |
| Data migrations | `src-tauri/migrations/knowledge/`, `src-tauri/migrations/private/` |
| Editorial corpus | `knowledge/engenharia_astrologica/` |

## Development commands

Run from the repository root:

```powershell
npm run build
npm run test
cargo check --manifest-path .\src-tauri\Cargo.toml
npm run tauri -- dev
```

The Python sidecar uses the isolated `.aurea-build-venv`; do not depend on a globally installed Python for release work.

## Windows release

`build.bat` rebuilds the PyInstaller sidecar, copies it into `src-tauri/binaries/`, and creates the NSIS installer. The current release evidence, artifact hashes, technical checks, and remaining manual acceptance are recorded in [`docs/RELEASE_VALIDATION_2026-08-10.md`](docs/RELEASE_VALIDATION_2026-08-10.md).

Current state: the Chrome-first launcher/runtime is implemented and has
automated bridge coverage; manual acceptance of login, navigation, persistence,
Hermes, and shutdown on Windows remains. Native Windows installer work is
paused.

## Change discipline

Inspect Git status first. Preserve unrelated changes. Use `rg` for discovery and `apply_patch` for edits. Never commit secrets, mix private/editorial data, invent sources or calculations, or use destructive Git commands. Every change should report affected files, data/privacy risk, validation, and real pending work.
