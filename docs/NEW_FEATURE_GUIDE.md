# Aurea Solaris — New Feature Guide

Use this for new user-visible behavior or any change that alters API, persistence, trust boundaries, certified calculations, or deployment behavior. For tiny documentation-only or mechanical fixes, use the same principles proportionally.

Start with [`CURRENT_STATE.md`](CURRENT_STATE.md), root [`AGENTS.md`](../AGENTS.md), and the owning domain's local guidance. Normative precedence remains **security/privacy → Constitution → `AGENTS.md` → `AI_WORKING_GUIDE.md` → domain reference**.

## Repeatable agent workflow

1. **Identify the owning domain.** Route from [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md); do not scan the repository broadly.
2. **Define the user-visible object/behavior.** State what exists after the change, who can see/use it, and what is explicitly out of scope.
3. **Define data ownership and trust boundary.** Decide whether data is editorial or person-owned, where identity comes from, and which side of the browser/API boundary owns the operation.
4. **Determine contract impact.** Check UI state, HTTP/OpenAPI contract, generated types, persistence/schema, RLS, astrology receipts/provenance, and hosted configuration as applicable.
5. **Change contract/tests first where practical.** Add the smallest failing regression or contract assertion before implementation when behavior can be specified that way.
6. **Implement in the smallest feature-local surface.** Prefer the owning feature/domain over cross-cutting helpers; do not add fallback paths that weaken auth, data isolation, or certified calculations.
7. **Refresh derived artifacts.** Update generated API types, `openapi.json`, schema docs, runbooks, or other generated/contract documentation when the owning source changes.
8. **Run proportional gates.** Start focused, then run the required domain/repository gate for the risk class below.
9. **Inspect the complete diff.** Check scope, secrets/private data, stale runtime references, generated drift, accidental provider/config changes, and unrelated edits.
10. **Bind evidence to the exact head.** Record the final commit SHA plus tests/CI/deployment evidence. If the head moves, evidence that is SHA-sensitive must be refreshed.

## Change-type decision table

| Change type | Own it here | Must preserve | Minimum focused validation | Escalate validation when |
| --- | --- | --- | --- | --- |
| Frontend-only | `apps/web/` | authenticated boundary, no privileged browser secrets, accessible/user-visible behavior | `npm run check:web` | API-generated types, auth flow, persistence, or browser E2E changes |
| API | `services/api/` | validated identity, owner scoping, fail-closed errors/log redaction | affected pytest + `python -m ruff check services/api` + mypy | routes/contracts/auth/persistence/certified service change |
| Schema/RLS | `supabase/` | `user_id`, RLS, owner-aware relationships, anonymous denial | disposable schema/RLS tests via `npm run quality:schema` | any private-table or ownership policy changes; then prove two identities and run full E2E |
| Certified astrology | `services/api/src/aurea_api/domain/astrology/` + `services/api/ephe/` | UTC/IANA/config/version/input hash, no silent fallback, reference parity | focused engine/reference tests | engine behavior, assets, receipt/provenance, or deployment contract changes |
| Deployment/operations | `docs/operations/`, deploy/verification scripts | exact-SHA provenance, compatible web/API pair, non-destructive data posture | focused script/tests + runbook review | provider config, promotion, migration, canonical aliases, or production evidence changes |

## Contract-impact checklist

Before implementation, answer only the applicable rows:

| Question | If yes |
| --- | --- |
| Does the browser call a new/changed API shape? | Update API contract and generated web types; run `npm run api:check`. |
| Does private persistence change? | Update schema/migration + owner-scoped repository + RLS + two-identity proof. |
| Does auth/identity handling change? | Add positive and negative JWT/session/ownership regressions; never trust client-selected ownership. |
| Does a calculation change? | Update characterization/reference tests and certified receipt/provenance evidence; report differences explicitly. |
| Does deployment/runtime configuration change? | Update the owning runbook and prove exact repository/ref/SHA + health. |
| Is it only presentation with no contract change? | Keep the change inside `apps/web`; do not invent backend/schema work. |

## Validation ladder

Use the cheapest gate that can falsify the change, then widen when the contract crosses a boundary.

```bash
# Frontend
npm run check:web

# API
python -m pytest services/api/tests -q
python -m ruff check services/api
python -m mypy --config-file services/api/pyproject.toml services/api/src

# Schema/RLS
npm run quality:schema

# Whole repository, when boundaries are crossed
npm run quality:gate

# Isolated browser/product flow
python tools/run_e2e.py
```

Do not redirect disposable tests to real personal data, retained databases, or production merely to make a gate pass.

## Completion evidence

A handoff should be short and reproducible:

- exact final head SHA;
- files/contracts changed;
- risk boundary touched (or `none`);
- focused checks and their outcomes;
- wider CI/E2E/deployment evidence required by the change type;
- intentionally retained residuals/history;
- no secrets or private user data.

For hosted changes, a URL or alias alone is not provenance. Tie the result to upstream SHA, authorized deployment-mirror SHA, provider deployment metadata, aliases, and health as required by the operations runbooks.