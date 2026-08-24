# Aurea Solaris

Aurea Solaris Private Web V1 is a browser application backed by an authenticated FastAPI service and private Supabase storage. Vercel hosts web/API; Supabase owns Auth, Postgres, and RLS. The former desktop/local product runtime is retired, and Railway is not part of Web V1.

## Start here

Do not read the repository broadly by default.

1. [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) — timestamped runtime/product/deployment snapshot.
2. [`AGENTS.md`](AGENTS.md) — mandatory repository, safety, privacy, and evidence rules before making changes.
3. [`docs/AI_WORKING_GUIDE.md`](docs/AI_WORKING_GUIDE.md) — route the task to the smallest owning domain.
4. [`docs/NEW_FEATURE_GUIDE.md`](docs/NEW_FEATURE_GUIDE.md) — use when adding user-visible behavior or changing a contract/boundary.
5. [`docs/index.md`](docs/index.md) — domain references when the local guide is not enough.

Normative precedence is always **security/privacy → [`docs/CONSTITUICAO.md`](docs/CONSTITUICAO.md) → `AGENTS.md` → `AI_WORKING_GUIDE.md` → domain reference**. Consult the Constitution for product meaning, ownership, privacy/trust boundaries, certified astrology, and other normative decisions; routine tasks should not reread it unnecessarily.

## Repository topology

- **Development/source of truth:** `vivicabsb-eng/AureaSolaris`
- **Deployment-only mirror:** `fernandodamaso/AureaSolaris-deploy`

Branches, PRs, CI, and merges happen in the source repository. The mirror receives only an explicitly authorized exact SHA for deployment. See [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) for the current production snapshot and [`docs/operations/`](docs/operations/) for runbooks.

## Runtime map

| Area | Local entrypoint |
| --- | --- |
| React Web V1 | [`apps/web/AGENTS.md`](apps/web/AGENTS.md) |
| Web API / certified astrology | [`services/api/AGENTS.md`](services/api/AGENTS.md) |
| Private schema / RLS | [`supabase/AGENTS.md`](supabase/AGENTS.md) |
| Editorial corpus | `knowledge/engenharia_astrologica/` |
| Operations/deployment | [`docs/operations/`](docs/operations/) |

## Development setup

Requirements: Node.js 22, Python 3.12, npm, and Docker + Supabase CLI for disposable schema/RLS and full E2E checks.

From the repository root:

```bash
npm ci
python -m pip install -e "./services/api[dev]"
python -m pip install -r knowledge/engenharia_astrologica/requirements.txt
```

Frontend development:

```bash
npm run dev:web
```

The API environment is documented in [`.env.example`](.env.example) and [`services/api/README.md`](services/api/README.md). For an integrated isolated product check, prefer:

```bash
python tools/run_e2e.py
```

That harness creates disposable infrastructure and synthetic identities. It is test tooling, not a user-facing local Aurea runtime, and must never target real personal data or retained historical databases/backups.

## Quality commands

```bash
npm run check:web
python -m pytest services/api/tests -q
python -m ruff check services/api
python -m mypy --config-file services/api/pyproject.toml services/api/src
```

With Docker and Supabase CLI:

```bash
npm run quality:gate
```

Use [`docs/NEW_FEATURE_GUIDE.md`](docs/NEW_FEATURE_GUIDE.md) to choose proportional gates instead of running unrelated suites by reflex.

## Operations

Current runbooks live in [`docs/operations/`](docs/operations/). Production verification is exact-SHA based and must relate the source repository, authorized deployment mirror, provider deployment metadata, canonical aliases, and health. Application rollback restores a compatible known-good web/API version and is not a destructive data rollback.

Within an approved issue, routine reversible engineering/provider operations are agent-autonomous unless a destructive action, real personal-data risk, credential boundary, material environment ambiguity, or contradiction with the approved contract requires a human decision.