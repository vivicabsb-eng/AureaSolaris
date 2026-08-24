# Aurea Solaris — Current State

Snapshot: **2026-08-24T17:25Z**  
Upstream `main` at snapshot: **`42cf16d0f336f4c84fab4b7ec905251732ea284f`**

This is the compact factual entrypoint for the currently supported product/runtime. It is a timestamped snapshot, not a normative authority. For rules, use the hierarchy below.

## Authority and routing

Precedence is: **security/privacy → [`CONSTITUICAO.md`](CONSTITUICAO.md) → [`../AGENTS.md`](../AGENTS.md) → [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md) → domain-local guidance/reference**.

For a change, read only what you need:

1. this snapshot;
2. `AGENTS.md` before modifying the repository;
3. `AI_WORKING_GUIDE.md` to route the task;
4. [`NEW_FEATURE_GUIDE.md`](NEW_FEATURE_GUIDE.md) for a new user-visible behavior or contract change;
5. the owning domain's local `AGENTS.md`/reference.

Consult the Constitution when a change touches product meaning, ownership, privacy, trust boundaries, certified astrology, or another normative decision.

## Active product and runtime

The **Private Web V1** is the only supported application runtime. Its released flow covers authentication, profile/onboarding, persisted birth profile, Mandala/dashboard, certified natal/transit calculations, and persisted calculation receipts.

- Web: React/Vite in `apps/web`, hosted by Vercel.
- API: authenticated FastAPI in `services/api`, hosted by Vercel.
- Private platform: Supabase Auth + Postgres + RLS.
- Certified astrology: server-side boundary under `services/api/src/aurea_api/domain/astrology/` with checked-in Swiss Ephemeris assets under `services/api/ephe/`.
- Editorial astrology knowledge is a separate impersonal/provenance domain; private person-owned data never becomes editorial corpus data.

The former desktop/local product runtime is retired. Railway is not part of Web V1. Disposable local development/E2E infrastructure is tooling, not another supported product runtime.

Detailed architecture: [`arquitetura.md`](arquitetura.md).

## Repository and production topology

- Development/source of truth: `vivicabsb-eng/AureaSolaris`.
- Deployment-only mirror: `fernandodamaso/AureaSolaris-deploy`.
- Production mirror SHA after FDM-736: `42cf16d0f336f4c84fab4b7ec905251732ea284f`.
- Vercel web production: `aurea-solaris`, deployment `dpl_2HgkMxqsYNDnDJTKThW9C5uhsaCL`.
- Vercel API production: `aurea-solaris-api`, deployment `dpl_69qFHykosMw4eLDSTkd1JZBoE8Mb`.
- Canonical aliases: `aurea-solaris.vercel.app` and `aurea-solaris-api.vercel.app`.
- Production Supabase project ref: `tgpcpxqqusehssaihvcp`.

Develop only in the source repository. The mirror moves only to an explicitly authorized, already-validated exact Git object; an upstream/mirror SHA difference is not automatically drift.

Operational detail: [`operations/ENVIRONMENTS.md`](operations/ENVIRONMENTS.md) and [`operations/`](operations/).

## Current trust boundaries

- Supabase Auth establishes browser identity; the API validates the token and derives the owner.
- Private reads/writes are owner-scoped in API repositories; Postgres RLS is defense in depth.
- The browser never chooses a trusted `owner_id` and never receives privileged server/database credentials.
- Cross-owner relationships are prohibited by application/data constraints and must stay covered by two-identity tests when that boundary changes.
- Certified astrology calculations remain server-side; no browser fallback or silent approximation is allowed.

Canonical data references: [`data/WEB_V1_SCHEMA.md`](data/WEB_V1_SCHEMA.md) and [`data/DOMINIOS_DE_DADOS.md`](data/DOMINIOS_DE_DADOS.md).

## Canonical validation

Run proportional checks from the repository root:

```bash
npm run check:web
python -m pytest services/api/tests -q
python -m ruff check services/api
python -m mypy --config-file services/api/pyproject.toml services/api/src
```

With Docker and Supabase CLI, the repository-wide gate is:

```bash
npm run quality:gate
```

The isolated browser gate is:

```bash
python tools/run_e2e.py
```

Hosted preview/production evidence uses the runbooks and verification scripts under `docs/operations/` and `scripts/`; do not substitute alias reachability for exact-SHA provenance.

## Known residuals / deferred assurance

These are accepted/current facts, not hidden blockers:

- API `/ready` intentionally fails closed with `503 service_not_ready` until concrete readiness probes are enabled.
- Supabase leaked-password protection remains an accepted provider advisory; application JWT validation, owner scoping, and RLS remain enforced.
- FDM-742 external human astrology-reference/provenance assurance remains separate from Web V1 engineering completion.
- The retired `fdm-736-audit-helper` Edge Function is an inert JWT-protected HTTP 410 tombstone because the available connector could not physically delete it.

FDM-736 completed on 2026-08-24. Its repository report preserves pre-merge audit history; immutable final promotion evidence is summarized at the top of [`operations/WEB_V1_COMPLETION_REPORT.md`](operations/WEB_V1_COMPLETION_REPORT.md) and recorded in Linear FDM-736.