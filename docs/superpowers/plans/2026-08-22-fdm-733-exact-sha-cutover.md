# FDM-733 Exact-SHA Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-accept current upstream `main` on exact-SHA previews, promote that exact object to production, and prove subsequent Git-triggered production redeployment for both Vercel projects.

**Architecture:** Preserve upstream Git objects exactly in the independent deployment mirror using the proven GitHub native exact-object/ref path: make the upstream object addressable in the mirror through a temporary import ref, verify object identity and ancestry, then fast-forward the target mirror ref with `force=false`. Advance `preview` first and complete hosted acceptance; only then advance `main`. After healthy production, create a harmless traceability commit under both deploy roots and prove both Vercel projects redeploy automatically from that exact SHA.

**Tech Stack:** Git/GitHub ref API, Vercel Git integration, Supabase/Postgres/RLS, Bash/Python verification scripts, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-22-fdm-733-exact-sha-cutover-design.md`

## Global Constraints

- Upstream `main` is immutable history; never reset, force-push, or rewrite it.
- Every normal mirror move must resolve to the exact upstream Git object and be a verified fast-forward from the expected current mirror ref with `force=false`.
- Production remains untouched until a fresh FDM-732-equivalent preview gate passes against the exact current upstream `main` SHA.
- Never record passwords, JWTs, service keys, Vercel bypass values, or private birth payloads.
- Stop on unexplained ref divergence, exact-SHA mismatch, unsafe provider state, or failed hosted acceptance.
- Provider/manual Vercel redeploy is not valid evidence for the automatic-redeploy proof.
- Normal rollback must not rewind upstream or mirror Git refs. Use recorded prior deployments for immediate traffic rollback and a forward revert commit for Git-state rollback.

---

### Task 1: Import current upstream `main` into mirror `preview` — completed

**Files:**
- Evidence: `docs/operations/deployments/2026-08-22-fdm-733.md`

**Interfaces:**
- Consumed: upstream `main=d578067e3bdaedbd4f81a9ef481b6a22b856bc6d`, mirror `preview=33739cba13c1779e3cb5cf602ebb3a41240df724`.
- Produced: mirror `preview=d578067e3bdaedbd4f81a9ef481b6a22b856bc6d` without recreating the commit object.

- [x] **Step 1: Re-read upstream and mirror refs and compare ancestry.**

Verified the accepted FDM-732 candidate is an ancestor of current upstream `main` and the delta contains repository/verification/CI history rather than new application runtime source.

- [x] **Step 2: Import the exact upstream object into the mirror with the proven native ref operation.**

Created temporary mirror ref `fdm-733/import-d578067` directly at the exact upstream SHA. After import, fetching the commit from `fernandodamaso/AureaSolaris-deploy` reported the same SHA, tree, parents, merge message, and verified signature as upstream.

An earlier isolated GitHub Actions workflow draft was prepared before this native path was proven. It did not move `preview` and is historical only; do not use it as the canonical production mechanism.

- [x] **Step 3: Fast-forward only mirror `preview`.**

Updated mirror `preview` from `33739cba...` to `d578067...` with `force=false`. Verified mirror `main` remained `6ddda762...` and upstream `main` remained `d578067...`.

- [x] **Step 4: Verify both Vercel projects created READY preview deployments for exact SHA.**

Verified web `dpl_CXhGnvxyFqN3M3JFsY5dJx9tyftB` and API `dpl_CDyhw18ea3EvLs3kAKi6r1qcrbeg` report Git ref `preview`, source Git, and exact SHA `d578067...`.

### Task 2: Run fresh exact-SHA preview acceptance — completed

**Files:**
- Read: `scripts/verify_preview.sh`
- Read: `scripts/verify_supabase_environment.sh`
- Read: `apps/web/e2e/specs/ownership.spec.ts`
- Evidence: `docs/operations/deployments/2026-08-22-fdm-733.md`

**Interfaces:**
- Consumed: matching READY preview web/API deployments for `d578067...` plus disposable preview-only credentials/protection access held outside Git/Linear.
- Produced: green FDM-732-equivalent acceptance for the exact current upstream object, followed by cleanup.

- [x] **Step 1: Verify automatable provider boundaries.**

Preview and production Supabase health, migration, RLS/policies, sign-up-disabled state, Auth counts, and exact web/API Vercel SHA equality passed.

- [x] **Step 2: Verify API preview health/security boundaries.**

Final `smoke_verified_preview_api.sh` passed health/readiness, unauthenticated `401`, authenticated profile, astrology calculation, and certified Swiss Ephemeris metadata.

- [x] **Step 3: Run the private hosted browser ownership flow.**

Final `scripts/verify_preview.sh` passed login/onboarding, profile and birth persistence/reload, natal and transit receipts, unauthenticated `401`, cross-owner `404`, disabled sign-up, network isolation, logout, and zero browser/page errors. Stable alias binding was verified before and after the run.

An earlier attempt failed on a CORS boundary and remains superseded audit history; it is not the accepted result.

- [x] **Step 4: Clean up temporary preview identities/credentials and re-verify provider counts/policies.**

Both disposable preview Auth users were deleted, both temporary Vercel bypass values were revoked, bypass counts returned to web `0`/API `0`, preview Auth returned to `39/39` confirmed, production remained `1/1` confirmed, and the Supabase environment verifier passed.

### Task 3: Promote accepted exact SHA to production

**Files:**
- Update evidence: `docs/operations/deployments/2026-08-22-fdm-733.md`

**Interfaces:**
- Consumes: accepted preview candidate equal to still-current upstream `main`.
- Produces: mirror `main`, web production deployment, and API production deployment at the same exact SHA.

- [x] **Step 1: Re-read upstream `main` and reject drift.**

Expected upstream SHA remains `d578067e3bdaedbd4f81a9ef481b6a22b856bc6d`. If it moved, stop and establish a fresh preview candidate; do not carry the existing acceptance forward.

- [x] **Step 2: Import/verify the accepted object in the deployment mirror and fast-forward mirror `main`.**

Use the same proven native exact-object/ref pattern from Task 1. The object is already addressable in the mirror via the preview/import work, but still verify its identity and expected ancestry. Assert current mirror `main=6ddda762...`, then update mirror `main` to the accepted SHA with `force=false`.

- [x] **Step 3: Require new automatic production deployments for both Vercel projects.**

Expected both deployments report `target=production`, ref `main`, source Git, and the exact accepted SHA. Do not use manual/provider redeploy as promotion evidence.

- [ ] **Step 4: Verify API before frontend canonical acceptance.**

Check canonical API `/health` and `/ready`, unauthenticated security negative, certified astrology calculation where the approved smoke mechanism permits it, production Supabase identity/migration/RLS/Auth state, and exact SHA equality.

Completed during production recovery except the certified calculation proof: `/health` 200, `/ready` 503 fail-closed as designed, unauthenticated negative 401, Supabase identity/migration/RLS/Auth state verified by the environment verifier, and exact-SHA equality established on the original Git-sourced promotion pair after a real database credential probe passed. The certified astrology calculation is covered by the owner-login attestation gate recorded in Linear.

- [ ] **Step 5: Verify canonical frontend and final owner-auth boundary.**

Check canonical web 200/login rendering and environment isolation. If no approved secure owner session exists, obtain the single human owner-login attestation permitted by FDM-733 without asking for credentials in chat.

Canonical web 200 with production-only origins verified during recovery; the human owner-login attestation result is recorded in Linear and gates Done.

### Task 4: Prove automatic Git-triggered production redeploy

**Files:**
- Create upstream: `apps/web/.fdm-733-redeploy-proof`
- Create upstream: `services/api/.fdm-733-redeploy-proof`
- Update evidence: `docs/operations/deployments/2026-08-22-fdm-733.md`

**Interfaces:**
- Consumes: healthy first production candidate.
- Produces: one non-functional upstream commit whose exact object is mirrored to deployment `main` and automatically redeployed by both Vercel Git integrations.

- [ ] **Step 1: Create one focused upstream traceability commit touching both deploy roots.**

Each marker contains only `FDM-733 automatic redeploy proof 2026-08-22` plus no runtime configuration or secrets. Touching both `apps/web` and `services/api` deliberately exercises path-filtered integrations without weakening filters.

- [ ] **Step 2: Verify upstream checks and exact new SHA.**

Confirm the commit is a normal child of the accepted production candidate and repository checks remain green.

- [ ] **Step 3: Mirror the new exact object to deployment `main` using the proven native ref path.**

Make the new upstream object addressable in the mirror through a temporary import ref if necessary, verify object identity and ancestry, assert expected current mirror `main` equals the first accepted production candidate, then fast-forward `main` with `force=false`.

- [ ] **Step 4: Prove both new production deployments were Git-triggered.**

Require distinct new deployment IDs for web and API, `target=production`, ref `main`, source Git, exact traceability SHA, healthy API, and canonical aliases updated. Reject any deployment whose metadata indicates provider/manual redeploy.

### Task 5: Finalize sanitized evidence, rollback posture, and Linear

**Files:**
- Update: `docs/operations/deployments/2026-08-22-fdm-733.md`

**Interfaces:**
- Consumes: all verified preview, production, automatic-redeploy, and rollback evidence.
- Produces: auditable sanitized record and a truthful FDM-733 final status.

- [ ] **Step 1: Record rollback targets and forward-only rollback strategy.**

Include pre-promotion mirror `main=6ddda762...`, prior web `dpl_53xYnHFvT7yhx14TdiPQd5gLomgx`, prior API `dpl_GtHHFxzbWcP4M4MzjbLxuY7Wx8g6`, accepted preview/production deployment IDs, traceability SHA, validation results, and no credentials/private payloads.

If immediate traffic rollback is required after promotion, use the recorded prior Vercel deployments as the service rollback targets without rewriting Git refs. If Git desired state must be restored, create an explicit forward revert commit on upstream `main`, mirror that new exact object with `force=false`, and let Git integration deploy it. A destructive mirror-ref rewind is outside the normal FDM-733 procedure and requires separate exceptional authorization.

- [ ] **Step 2: Run final ref/SHA/provider verification.**

Require upstream `main` = mirror `main` = both latest production deployment SHAs; confirm Supabase remains healthy and no unexplained ref divergence exists.

- [ ] **Step 3: Update Linear with compact final evidence.**

Move FDM-733 to Done only if every mandatory gate passed. Otherwise leave it In Progress and record the exact blocker while keeping production at the last verified safe state.