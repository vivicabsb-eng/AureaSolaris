# FDM-733 Exact-SHA Production Cutover Design

## Purpose

Promote the current upstream `main` into the deployment mirror and Vercel production without rewriting upstream history, then prove that a later harmless upstream commit automatically redeploys both production projects.

## Baseline

- Upstream source of truth: `vivicabsb-eng/AureaSolaris:main` at `d578067e3bdaedbd4f81a9ef481b6a22b856bc6d`.
- Last fully accepted hosted application candidate: `33739cba13c1779e3cb5cf602ebb3a41240df724`.
- Deployment mirror `preview`: `33739cba13c1779e3cb5cf602ebb3a41240df724`.
- Deployment mirror `main`: `6ddda7627e9634e91fa303e296dec79fd93b9340`.
- Pre-promotion production rollback deployments: web `dpl_53xYnHFvT7yhx14TdiPQd5gLomgx`; API `dpl_GtHHFxzbWcP4M4MzjbLxuY7Wx8g6`.
- Preview and production Supabase projects are `ACTIVE_HEALTHY` and both contain the `web_v1_core` migration.

The accepted-candidate-to-current-main delta is expected repository history: CI/workflow fixes, verification/runbook changes, deployment evidence, and generated OpenAPI cleanup. No application runtime source was introduced after the accepted candidate.

## Invariants

1. Never reset, force-push, or rewrite upstream `main`.
2. Mirror refs must point to the exact upstream Git object, not a recreated look-alike commit.
3. Stop on any unexplained ref movement before a promotion step.
4. Production is untouched until a fresh preview gate passes against the exact current upstream `main` SHA.
5. No password, JWT, service key, Vercel bypass value, or private birth payload is written to Git, Linear, logs, or chat.
6. Production owner credentials are never exported into CI. If no approved secure session exists, only the final human owner-login attestation may remain manual.

## Exact-object mirror mechanism

`AureaSolaris-deploy` is an independent repository, so the current upstream merge commit is not initially present in its object database. The mirror operation therefore uses a narrowly scoped GitHub Actions control branch in the deployment repository. The runner fetches the public upstream repository with Git, verifies the fetched SHA and expected current mirror ref, checks fast-forward ancestry, and pushes the fetched object directly to the target mirror ref using the repository-scoped `GITHUB_TOKEN`.

This preserves the upstream commit object byte-for-byte. The control workflow must refuse stale expected refs, SHA mismatches, non-fast-forward transitions, or any target other than the explicitly encoded `preview`/`main` step.

## Sequence

### 1. Preview parity

Re-read upstream `main` and mirror refs. Import the exact upstream `main` object and fast-forward deployment mirror `preview` to it. Require both Vercel projects to create READY preview deployments whose metadata reports ref `preview` and exact SHA equality with upstream.

### 2. Fresh hosted acceptance

Re-run every automatable FDM-732 boundary against the exact preview pair: API health/readiness, unauthenticated boundaries, disabled sign-up, Supabase identity/migration/RLS/policy checks, exact deployment SHA equality, and browser/network error isolation. The full private login/onboarding/receipt/reload/logout path uses only an already-approved secure preview credential source; lack of that source is a hard stop before production.

### 3. Production promotion

After the fresh preview gate passes, re-read upstream `main` to prove it has not moved. Import the same accepted object and fast-forward deployment mirror `main`. Let Vercel Git integration deploy both projects automatically. Require the API production deployment and canonical `/health`/`/ready` checks to be healthy before accepting the frontend cutover. Verify upstream SHA = mirror SHA = web deployment SHA = API deployment SHA.

### 4. Automatic redeploy proof

After the first production candidate is healthy, create one non-functional upstream `main` commit that changes harmless traceability marker files inside both `apps/web` and `services/api`. Those roots are selected so intentional monorepo/path filtering cannot suppress either project. Mirror that exact new object to deployment `main` with the same guarded mechanism. Provider/manual redeploy is forbidden for this proof. Both Vercel projects must independently create new READY production deployments reporting the traceability commit SHA.

### 5. Evidence and rollback

Update the sanitized deployment record under `docs/operations/deployments/` with baseline refs, accepted preview pair, first production pair, automatic-redeploy proof SHA, rollback refs/deployments, Supabase checks, and any remaining owner-login attestation. Linear receives the final compact audit record and FDM-733 moves to Done only when all mandatory gates pass.

## Failure behavior

Any unexplained ref divergence, failed exact-SHA comparison, failed hosted acceptance, unsafe production configuration, failed API health/readiness, or missing mandatory secure preview credential stops execution before the next promotion boundary. Rollback is by moving deployment mirror `main` back to the recorded pre-promotion object and using the recorded prior Vercel production deployments if needed; upstream history is never rewritten.