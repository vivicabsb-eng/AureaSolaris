# Agent Guide — `services/api`

This guide extends root [`../../AGENTS.md`](../../AGENTS.md). For package setup details use [`README.md`](README.md); for global policy and current production state use the root guidance/docs.

## Start here

- Vercel entry: `api/index.py`;
- application factory: `src/aurea_api/main.py`;
- routes/auth: `src/aurea_api/api/`;
- dependency wiring: `src/aurea_api/dependencies.py`;
- repositories/adapters: `src/aurea_api/infrastructure/`;
- certified astrology: `src/aurea_api/domain/astrology/`, `ephe/`;
- committed API contract: `openapi.json`;
- regressions: `tests/`.

Keep route handlers thin; put domain/persistence behavior in the owning layer.

## Local invariants

- Private routes derive identity from the validated bearer token; never trust client-supplied ownership.
- Reads/writes remain explicitly owner-scoped even though RLS provides defense in depth.
- `create_app()` must remain safe to construct without opening database/engine connections at import time.
- `/health` is process health; `/ready` fails closed until required readiness probes are healthy. Do not fake readiness to satisfy a smoke test.
- Logs/errors must not expose authorization values, request bodies, credentials, private records, or exception internals.
- CORS stays explicit/fail-closed from configured allowed origins.
- Certified astrology uses the checked-in Swiss Ephemeris boundary and preserves reproducibility/provenance; no silent approximate fallback.
- If a route/schema changes, refresh/check `openapi.json` and generated web types as part of the same contract change.

## Validation

From repository root:

```bash
python -m pytest services/api/tests -q
python -m ruff check services/api
python -m mypy --config-file services/api/pyproject.toml services/api/src
```

For API/OpenAPI changes also run:

```bash
npm run api:check
```

Widen to schema/RLS, full quality gate, engine/reference tests, or disposable E2E according to [`../../docs/NEW_FEATURE_GUIDE.md`](../../docs/NEW_FEATURE_GUIDE.md).

## Prohibited shortcuts

- accepting `owner_id` as authority from the client;
- weakening auth/RLS/repository scoping to make a test pass;
- placing privileged credentials in browser-facing responses/config;
- logging bearer tokens or private request bodies;
- opening network/database/engine dependencies during module import;
- returning fabricated readiness or certified astrology values;
- changing engine/ephemeris behavior without focused reference evidence.