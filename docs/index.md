# Aurea Solaris — AI Documentation Index

Use this as a routing map, not a reading list.

## Default path

1. [`CURRENT_STATE.md`](CURRENT_STATE.md) — timestamped factual snapshot.
2. [`../AGENTS.md`](../AGENTS.md) — mandatory repository/safety rules before changing anything.
3. [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md) — route the task to the smallest owning domain.
4. [`NEW_FEATURE_GUIDE.md`](NEW_FEATURE_GUIDE.md) — only when adding user-visible behavior or changing a contract/boundary.
5. The local/domain reference below, only as needed.

Normative precedence is **security/privacy → [`CONSTITUICAO.md`](CONSTITUICAO.md) → `AGENTS.md` → `AI_WORKING_GUIDE.md` → domain reference**. The Constitution is authoritative for product/data decisions; the current-state snapshot is factual and timestamped, not normative.

## Current domain references

| Domain | Start here | Deeper reference |
| --- | --- | --- |
| React/UI/auth/client | [`../apps/web/AGENTS.md`](../apps/web/AGENTS.md) | `../apps/web/src/`, [`accessibility.md`](accessibility.md) |
| Web API/auth/repos | [`../services/api/AGENTS.md`](../services/api/AGENTS.md) | `../services/api/`, [`operations/VERCEL_API_RUNBOOK.md`](operations/VERCEL_API_RUNBOOK.md) |
| Supabase/private schema/RLS | [`../supabase/AGENTS.md`](../supabase/AGENTS.md) | [`data/WEB_V1_SCHEMA.md`](data/WEB_V1_SCHEMA.md), [`operations/SUPABASE_RUNBOOK.md`](operations/SUPABASE_RUNBOOK.md) |
| Persistence/data boundaries | [`data-persistence.md`](data-persistence.md) | [`data/DOMINIOS_DE_DADOS.md`](data/DOMINIOS_DE_DADOS.md) |
| Current architecture | [`arquitetura.md`](arquitetura.md) | environment/provider runbooks |
| Setup | [`setup-guide.md`](setup-guide.md) | [`CONFIGURACAO_DE_TRABALHO.md`](CONFIGURACAO_DE_TRABALHO.md) |
| Deployment/environments | [`operations/ENVIRONMENTS.md`](operations/ENVIRONMENTS.md) | [`operations/VERCEL_RUNBOOK.md`](operations/VERCEL_RUNBOOK.md), [`operations/VERCEL_API_RUNBOOK.md`](operations/VERCEL_API_RUNBOOK.md) |
| Incident/rollback | [`operations/INCIDENT_AND_ROLLBACK.md`](operations/INCIDENT_AND_ROLLBACK.md) | provider runbook |
| Certified astrology | [`astrology-engine.md`](astrology-engine.md) | [`ENGINE_CERTIFICATION_PLAN.md`](ENGINE_CERTIFICATION_PLAN.md), [`astrology-knowledge-contract.md`](astrology-knowledge-contract.md) |
| Editorial corpus/library | [`BIBLIOTECA_VISUAL.md`](BIBLIOTECA_VISUAL.md) | [`data/ENGENHARIA_SYNC_PLAYBOOK.md`](data/ENGENHARIA_SYNC_PLAYBOOK.md) |
| Integrations/roadmap | [`google-calendar-integration.md`](google-calendar-integration.md) | [`ROADMAP.md`](ROADMAP.md) |
| Deployment evidence | [`operations/deployments/`](operations/deployments/) | current operations runbooks |
| Web V1 completion evidence | [`operations/WEB_V1_COMPLETION_REPORT.md`](operations/WEB_V1_COMPLETION_REPORT.md) | Linear FDM-736 for immutable final IDs/evidence |
| Historical release/cleanup evidence | [`RELEASE_VALIDATION_2026-08-10.md`](RELEASE_VALIDATION_2026-08-10.md) | [`archive/`](archive/) |

Historical/archive material is valid provenance but is not active execution guidance. If a historical statement conflicts with the current snapshot or authority hierarchy, do not promote it into current architecture.