# AI Working Guide — Aurea Solaris

This is the compact task router for coding agents. It deliberately does **not** restate the whole runtime, architecture, or Constitution.

## Before changing anything

1. Read [`CURRENT_STATE.md`](CURRENT_STATE.md) for the timestamped factual snapshot.
2. Read root [`AGENTS.md`](../AGENTS.md) for mandatory repository/safety rules.
3. Use the routing table below and then the smallest local guide/reference needed.
4. For a new feature or contract/boundary change, follow [`NEW_FEATURE_GUIDE.md`](NEW_FEATURE_GUIDE.md).

Normative precedence is **security/privacy → [`CONSTITUICAO.md`](CONSTITUICAO.md) → `AGENTS.md` → this guide → domain-local guidance/reference**. Consult the Constitution when the change touches product meaning, ownership, privacy/trust boundaries, certified astrology, or another normative decision.

Do not read the entire repository or `docs/` tree by default.

## Task routing

| Task | Start here | Add reference only if needed |
| --- | --- | --- |
| React/telas/componentes | [`../apps/web/AGENTS.md`](../apps/web/AGENTS.md) | `../apps/web/src/features/`, `../apps/web/src/components/` |
| Web auth/session | [`../apps/web/AGENTS.md`](../apps/web/AGENTS.md) | `../apps/web/src/auth/` |
| HTTP client/generated types | [`../apps/web/AGENTS.md`](../apps/web/AGENTS.md) | `../apps/web/src/api/` |
| FastAPI/auth/routes/repos | [`../services/api/AGENTS.md`](../services/api/AGENTS.md) | `../services/api/src/aurea_api/` |
| Certified astrology | [`../services/api/AGENTS.md`](../services/api/AGENTS.md) | [`astrology-engine.md`](astrology-engine.md), [`ENGINE_CERTIFICATION_PLAN.md`](ENGINE_CERTIFICATION_PLAN.md) |
| Schema/RLS/private ownership | [`../supabase/AGENTS.md`](../supabase/AGENTS.md) | [`data/WEB_V1_SCHEMA.md`](data/WEB_V1_SCHEMA.md), [`data/DOMINIOS_DE_DADOS.md`](data/DOMINIOS_DE_DADOS.md) |
| Persistence boundary | [`data-persistence.md`](data-persistence.md) | API/domain-local guide |
| Editorial corpus/import | `../knowledge/engenharia_astrologica/` | [`data/ENGENHARIA_SYNC_PLAYBOOK.md`](data/ENGENHARIA_SYNC_PLAYBOOK.md) |
| Disposable E2E | `../tools/run_e2e.py` | `../tools/e2e_api.py`, `../apps/web/e2e/` |
| Preview/production | [`operations/`](operations/) | `../scripts/verify_preview.sh`, `../scripts/verify_vercel_preview.py` |
| Incident/rollback | [`operations/INCIDENT_AND_ROLLBACK.md`](operations/INCIDENT_AND_ROLLBACK.md) | environment/provider runbook |

If you still cannot identify the owner, use [`index.md`](index.md) as the broader routing map. Do not solve ambiguity by loading all docs.

## Boundary triggers

A task stops being local when it crosses one of these boundaries:

- frontend ↔ HTTP/OpenAPI contract;
- API ↔ persistence/schema/RLS;
- authentication/owner identity;
- certified astrology behavior/receipt/provenance;
- deployment/provider configuration.

When a boundary is crossed, use the corresponding row in [`NEW_FEATURE_GUIDE.md`](NEW_FEATURE_GUIDE.md), update the owning contract/generated artifact, and widen validation proportionally.

## Validation routing

Canonical commands live in [`CURRENT_STATE.md`](CURRENT_STATE.md). Pick gates by change type in [`NEW_FEATURE_GUIDE.md`](NEW_FEATURE_GUIDE.md).

A few rules are universal:

- `npm run api:check` must remain clean when the API/OpenAPI shape affects generated web types.
- Private schema/ownership changes require disposable RLS validation and a two-identity isolation proof.
- Certified astrology changes require focused reference/characterization evidence; never accept a silent fallback.
- Hosted acceptance must bind evidence to exact Git/provider objects, not only an alias.
- Disposable E2E uses synthetic identities and disposable infrastructure only.

## Required working loop

1. Confirm current refs/state relevant to the task.
2. Read the owning local guide and only the files needed.
3. Make the smallest coherent change.
4. Run focused validation, then the proportional boundary gate.
5. Inspect the full diff for scope, secrets/private data, generated drift, and retired-runtime guidance.
6. Record exact final head + evidence; refresh SHA-sensitive evidence if the head moves.

For feature work, the detailed 10-step version is intentionally kept only in [`NEW_FEATURE_GUIDE.md`](NEW_FEATURE_GUIDE.md).

## Operations evidence

`vivicabsb-eng/AureaSolaris` is the development source of truth. `fernandodamaso/AureaSolaris-deploy` is deployment-only and moves to an explicitly authorized exact object.

For preview/production work, follow `docs/operations/` and prove the required relationship among upstream SHA, authorized mirror SHA, provider deployment metadata, aliases, and health. Rollback never implies destructive rollback of private user data.

Within an approved issue, routine reversible work is agent-autonomous under `AGENTS.md`; stop only at the exceptional human-decision boundaries defined there.