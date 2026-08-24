# Agent Guide — `supabase`

This guide extends root [`../AGENTS.md`](../AGENTS.md). The canonical private-schema description is [`../docs/data/WEB_V1_SCHEMA.md`](../docs/data/WEB_V1_SCHEMA.md).

## Start here

- project test config: `config.toml`;
- schema evolution: `migrations/`;
- RLS/schema regressions: `tests/`;
- API persistence behavior: `../services/api/src/aurea_api/infrastructure/`.

Treat schema + API owner scoping + RLS as one trust boundary, not independent conveniences.

## Local invariants

- Private tables preserve authenticated `user_id` ownership.
- RLS restricts private reads/writes to the authenticated owner; anonymous access must not gain private-table privileges.
- Relationships between private records must not cross owners.
- The API derives ownership from validated authentication and remains owner-scoped even when privileged server credentials are used.
- Schema changes affecting ownership require at least two synthetic identities proving cross-owner denial.
- Migrations/tests use disposable infrastructure for automated verification; never point them at real personal data or production to speed up a test.
- A code/application rollback is not a destructive database rollback. Data-destructive recovery needs a separate explicit contract.
- Never expose service-role/database credentials to the browser or commit them to migrations/tests/docs.

## Validation

From repository root:

```bash
npm run quality:schema
```

When a schema/RLS change affects API behavior or user-visible persistence, also run the affected API tests and widen to:

```bash
npm run quality:gate
python tools/run_e2e.py
```

Follow the schema/RLS row in [`../docs/NEW_FEATURE_GUIDE.md`](../docs/NEW_FEATURE_GUIDE.md).

## Prohibited shortcuts

- disabling RLS or owner predicates to make a test pass;
- trusting client-selected ownership;
- adding cross-owner foreign-key paths;
- granting anonymous/private-table access as a workaround;
- destructive edits against production/private data during automated validation;
- storing credentials, JWTs, private records, or provider secrets in committed SQL/fixtures/docs.