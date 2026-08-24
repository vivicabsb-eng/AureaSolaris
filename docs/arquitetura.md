# Aurea Solaris — Architecture

This document describes the supported architecture and its stable boundaries. For the timestamped product/production snapshot, exact current `main` SHA, deployment IDs, and accepted residuals, use [`CURRENT_STATE.md`](CURRENT_STATE.md). Promotion status does not belong in this architecture reference.

The supported application architecture is web-first: `apps/web` is the React/Vite client, `services/api` is the authenticated FastAPI service, Vercel hosts both projects, and Supabase owns Auth/Postgres/RLS for private Web V1 data. Railway is not part of Web V1; the former desktop/local product runtime is historical only.

## Runtime layers

```text
Browser
  ├─ Supabase Auth
  │    └─ authenticates the person and issues the session identity
  └─ React + TypeScript + Vite (`apps/web`), hosted on Vercel
       └─ authenticated HTTPS requests
            └─ FastAPI (`services/api`), hosted on Vercel
                 ├─ validates Supabase JWT identity
                 ├─ owner-scoped application repositories
                 │    └─ Supabase Postgres + RLS
                 └─ certified astrology boundary
                      ├─ Swiss Ephemeris assets
                      ├─ natal/transit calculation contracts
                      └─ calculation receipts/provenance

Editorial astrology domain
  └─ governed source corpus + packaged editorial snapshot
       └─ impersonal provenance; never private user storage
```

## Current product flow

The released Web V1 covers authentication, profile/onboarding, persisted birth profile, Mandala/dashboard, certified natal/transit calculations, and persisted calculation receipts.

```text
Person authenticates with Supabase
  → browser receives an authenticated session
  → browser calls the FastAPI service with that identity
  → API derives the owner from the validated token
  → owner-scoped repository reads/writes Postgres
  → RLS independently constrains private rows
  → certified astrology service calculates when requested
  → result + reproducibility metadata are persisted as an owner-scoped receipt
  → browser renders the profile/Mandala/dashboard state
```

The client never supplies a trusted owner identity independently of authentication. Server credentials and database credentials never enter the browser.

## Repository and deployment topology

```text
vivicabsb-eng/AureaSolaris
  source of truth for development, PRs, CI and merges
        │
        │ explicit promotion of an already-validated exact SHA
        ▼
fernandodamaso/AureaSolaris-deploy
  deployment-only mirror
        │
        ├─ Vercel project: aurea-solaris      (apps/web)
        └─ Vercel project: aurea-solaris-api  (services/api)
```

The mirror is not a development fork. Production is defined by the exact mirror SHA recorded in each Vercel deployment, not by an assumption that upstream `main` and mirror `main` must always be equal. A difference is valid when a newer upstream commit has intentionally not been promoted.

Safe verification therefore checks:

1. the current upstream SHA;
2. the authorized mirror SHA;
3. each Vercel deployment's recorded repository/ref/SHA;
4. canonical web/API aliases;
5. web/API health and the documented readiness contract.

Exact current objects belong in [`CURRENT_STATE.md`](CURRENT_STATE.md), while verification procedure belongs in `docs/operations/`.

## Private-data ownership

Private Web V1 tables are documented in [`data/WEB_V1_SCHEMA.md`](data/WEB_V1_SCHEMA.md). The important boundary is architectural, not merely a database convention:

- Supabase Auth establishes the user identity;
- FastAPI derives `user_id` from the validated authenticated request;
- repositories scope reads/writes to that owner;
- RLS enforces `auth.uid() = user_id` on private tables;
- owner-aware foreign keys prevent cross-owner receipt/profile relationships;
- anonymous access does not receive private table privileges.

Future multi-user growth preserves these rules and adds capacity around them; it does not replace them with shared-owner shortcuts. Isolation changes require two-identity tests that prove one account cannot read, modify, or reference another account's records.

## Editorial-data boundary

Editorial astrology knowledge is impersonal and provenance-driven. Sources, claims, schools, variants, citations, hashes, and review state remain governed separately from person-owned records.

Private birth data, profiles, receipts, notes, or future personal records must not be copied into the editorial corpus. Conversely, editorial snapshots are reference material and are not the private application database.

## Certified astrology boundary

The API owns the certified calculation boundary. It preserves the established engine behavior and records the inputs and engine/ephemeris metadata required for auditability. The Web V1 architecture must not introduce a browser-side fallback calculation or silently substitute approximate values.

## Local development and test infrastructure

Local development servers are developer tooling, not another supported product architecture. `npm run dev:web` is the frontend development loop. `python tools/run_e2e.py` creates disposable local Supabase/API/Vite/Playwright infrastructure with synthetic identities for isolated validation.

The E2E harness must never target real personal data, retained historical databases, backups, or user directories.

## Operational references

- Environment boundaries: [`operations/ENVIRONMENTS.md`](operations/ENVIRONMENTS.md)
- Web deployment: [`operations/VERCEL_RUNBOOK.md`](operations/VERCEL_RUNBOOK.md)
- API deployment: [`operations/VERCEL_API_RUNBOOK.md`](operations/VERCEL_API_RUNBOOK.md)
- Supabase: [`operations/SUPABASE_RUNBOOK.md`](operations/SUPABASE_RUNBOOK.md)
- Incident/rollback: [`operations/INCIDENT_AND_ROLLBACK.md`](operations/INCIDENT_AND_ROLLBACK.md)

Application rollback changes the deployed application version/configuration; it is not a destructive rollback of private user data.