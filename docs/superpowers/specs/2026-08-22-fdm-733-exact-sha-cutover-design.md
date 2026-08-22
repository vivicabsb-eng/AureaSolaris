# FDM-733 Exact-SHA Production Cutover Design

## Purpose

Promote the current upstream `main` into the deployment mirror and Vercel production without rewriting upstream history, then prove that a later harmless upstream commit automatically redeploys both production projects.

## Current checkpoint

- Upstream source of truth: `vivicabsb-eng/AureaSolaris:main` at `d578067e3bdaedbd4f81a9ef481b6a22b856bc6d`.
- Last fully accepted FDM-732 hosted application candidate: `33739cba13c1779e3cb5cf602ebb3a41240df724`.
- Deployment mirror `preview`: `d578067e3bdaedbd4f81a9ef481b6a22b856bc6d`.
- Deployment mirror `main`: `6ddda7627e9634e91fa303e296dec79fd93b9340`.
- Exact READY FDM-733 preview pair: web `dpl_CXhGnvxyFqN3M3JFsY5dJx9tyftB`; API `dpl_CDyhw18ea3EvLs3kAKi6r1qcrbeg`.
- Fresh FDM-732-equivalent hosted acceptance for `d578067...`: PASS, followed by cleanup of disposable preview users and temporary Vercel bypass values.
- Pre-promotion production rollback deployments: web `dpl_53xYnHFvT7yhx14TdiPQd5gLomgx`; API `dpl_GtHHFxzbWcP4M4MzjbLxuY7Wx8g6`.
- Preview and production Supabase projects are `ACTIVE_HEALTHY` and both contain the required `web_v1_core` migration and owner-only RLS posture.
- Production has not been promoted.

The accepted FDM-732-candidate-to-current-main delta is expected repository history: CI/workflow fixes, verification/runbook changes, deployment evidence, generated OpenAPI cleanup, and verification tests. No application runtime source was introduced after the accepted candidate.

## Invariants

1. Never reset, force-push, or rewrite upstream `main`.
2. Normal deployment-mirror moves are forward-only: the target ref must point to the exact upstream Git object and the update must be a verified fast-forward with `force=false`.
3. Stop on any unexplained ref movement before a promotion step.
4. Production is untouched until a fresh preview gate passes against the exact current upstream `main` SHA.
5. No password, JWT, service key, Vercel bypass value, request payload, or private birth value is written to Git, Linear, logs, or chat.
6. Production owner credentials are never exported into CI. If no approved secure session exists, only the final human owner-login attestation may remain manual.
7. Provider/manual redeploy is not valid evidence of the required automatic Git-triggered redeploy.
8. Normal rollback does not rewind Git refs. Immediate service rollback and Git desired-state rollback are separate operations.

## Exact-object mirror mechanism

`AureaSolaris-deploy` is an independent repository. The mechanism proven during the preview phase is GitHub's native exact-object/ref path, not the earlier workflow draft:

1. Resolve and freeze the expected upstream SHA and the expected current mirror target ref.
2. If the upstream object is not yet addressable in the mirror, create a narrowly named temporary import ref in the deployment mirror directly at that exact upstream SHA.
3. Fetch the commit from the deployment mirror and verify exact SHA plus identifying commit metadata (tree, parents, merge message, and verification/signature state) against upstream.
4. Verify the current target ref is the expected ancestor of the imported object.
5. Update the target mirror ref to the exact object with `force=false`.
6. Re-read upstream and mirror refs after the move and reject drift.

This path preserved `d578067...` byte-for-byte when moving preview. The temporary import ref `fdm-733/import-d578067` made the object addressable in the mirror, after which `preview` fast-forwarded from `33739cba...` to `d578067...` with `force=false`.

An earlier isolated control branch contains a guarded GitHub Actions workflow draft prepared before the native ref path was proven. That workflow did not perform the successful preview move and is historical only; it is not the canonical production mechanism.

## Sequence

### 1. Preview parity — complete

The exact current upstream `main` object was imported/addressed in the deployment mirror and deployment `preview` was fast-forwarded with `force=false`. Both Vercel projects then produced READY preview deployments reporting ref `preview`, source Git, and exact SHA `d578067...`.

### 2. Fresh hosted acceptance — complete

The final hosted FDM-732-equivalent gate passed against the exact preview pair. It proved API health/readiness and security boundaries, disabled public sign-up, Supabase identity/migration/RLS state, exact deployment SHA equality, private login/onboarding, profile and birth persistence/reload, certified natal and transit receipt rendering, unauthenticated `401`, cross-owner `404`, network/environment isolation, logout, and zero browser/page errors.

The final API smoke also passed authenticated profile, astrology calculation, and certified Swiss Ephemeris metadata. Disposable preview identities and temporary protection bypass values were removed afterward; preview Auth returned to `39/39` confirmed and both Vercel bypass counts returned to zero.

An earlier failed attempt remains in the audit history but is superseded by the final PASS against the same exact deployment IDs with stable alias binding verified before and after the run.

### 3. Production promotion — next boundary

Before mutation, re-read upstream `main`, mirror `preview`, and mirror `main`. The accepted preview SHA is promotable only if upstream `main` is still exactly `d578067e3bdaedbd4f81a9ef481b6a22b856bc6d`.

Use the proven native exact-object/ref mechanism to verify the object in the deployment mirror and fast-forward mirror `main` from its expected baseline `6ddda762...` to the accepted SHA with `force=false`. Let Vercel Git integration deploy both projects automatically. Require the API production deployment and canonical `/health`/`/ready` checks to be healthy before accepting the frontend cutover. Verify upstream SHA = mirror SHA = web deployment SHA = API deployment SHA.

PR #21 remains draft during this boundary. Merging the documentation branch before production promotion would move upstream `main` away from the already accepted SHA and would require a new preview candidate/gate.

### 4. Automatic redeploy proof

After the first production candidate is healthy, create one non-functional upstream `main` commit that changes harmless traceability marker files inside both `apps/web` and `services/api`. Those roots are selected so intentional monorepo/path filtering cannot suppress either project.

Make the new upstream object addressable in the mirror with the native import-ref path if required, verify object identity and ancestry, and fast-forward deployment mirror `main` with `force=false`. Provider/manual redeploy is forbidden for this proof. Both Vercel projects must independently create new READY production deployments reporting ref `main`, source Git, and the exact traceability commit SHA.

### 5. Evidence and rollback

Update the sanitized deployment record under `docs/operations/deployments/` with baseline refs, accepted preview pair, first production pair, automatic-redeploy proof SHA, prior production deployment IDs, Supabase checks, and any remaining owner-login attestation. Linear receives the final compact audit record and FDM-733 moves to Done only when all mandatory gates pass.

Rollback has two explicit layers:

- **Immediate service/traffic rollback:** use the recorded prior Vercel production deployments as the rollback targets so canonical traffic can be restored without rewriting Git history.
- **Git desired-state rollback:** create an explicit forward revert commit on upstream `main`, verify it normally, import/verify that new exact object in the deployment mirror, fast-forward mirror `main` with `force=false`, and let Vercel Git integration deploy the revert.

The recorded pre-promotion mirror SHA is an audit/diagnostic reference, not permission to move mirror `main` backward. Any destructive ref rewind would be an exceptional operation requiring separate explicit authorization outside the normal FDM-733 procedure.

## Failure behavior

Any unexplained ref divergence, failed exact-SHA comparison, failed hosted or production acceptance, unsafe production configuration, or failed API health/readiness stops execution before the next boundary.

If failure occurs before canonical traffic changes, leave the recorded production deployment/aliases untouched. If failure occurs after cutover, restore traffic to the recorded prior deployments, then repair Git desired state with a forward revert commit. Upstream and deployment-mirror history remain forward-only throughout the normal procedure.