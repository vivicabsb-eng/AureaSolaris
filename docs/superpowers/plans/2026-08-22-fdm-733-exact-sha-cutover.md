# FDM-733 Exact-SHA Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-accept current upstream `main` on exact-SHA previews, promote that exact object to production, and prove subsequent Git-triggered production redeployment for both Vercel projects.

**Architecture:** Preserve upstream Git objects exactly by importing them into the independent deployment mirror with a guarded GitHub Actions workflow. Advance `preview` first, run the full hosted acceptance, then advance `main`; after healthy production, create a harmless traceability commit under both deploy roots and prove both Vercel projects redeploy automatically from that exact SHA.

**Tech Stack:** Git/GitHub Actions, Vercel Git integration, Supabase/Postgres/RLS, Bash/Python verification scripts, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-22-fdm-733-exact-sha-cutover-design.md`

## Global Constraints

- Upstream `main` is immutable history; never reset, force-push, or rewrite it.
- Every mirror move must resolve to the exact upstream Git object and must be a verified fast-forward from the expected current mirror ref.
- Production remains untouched until a fresh FDM-732-equivalent preview gate passes against the exact current upstream `main` SHA.
- Never record passwords, JWTs, service keys, Vercel bypass values, or private birth payloads.
- Stop on unexplained ref divergence, exact-SHA mismatch, unsafe provider state, failed hosted acceptance, or a missing mandatory secure preview credential source.
- Provider/manual Vercel redeploy is not valid evidence for the automatic-redeploy proof.

---

### Task 1: Import current upstream `main` into mirror `preview`

**Files:**
- Create in deployment mirror control branch: `.github/workflows/fdm-733-mirror-preview.yml`
- Evidence only in upstream FDM-733 branch: `docs/operations/deployments/2026-08-22-fdm-733.md`

**Interfaces:**
- Consumes: upstream `main=d578067e3bdaedbd4f81a9ef481b6a22b856bc6d`, mirror `preview=33739cba13c1779e3cb5cf602ebb3a41240df724`.
- Produces: mirror `preview=d578067e3bdaedbd4f81a9ef481b6a22b856bc6d` without recreating the commit object.

- [ ] **Step 1: Re-read upstream and mirror refs and compare ancestry.**

Run connector-equivalent checks for upstream `main`, mirror `preview`, and `33739cba...d578067e`; expected result is upstream unchanged, mirror unchanged, and accepted candidate an ancestor of current upstream.

- [ ] **Step 2: Create the guarded exact-object workflow on an isolated deployment-mirror branch.**

The workflow must initialize a temporary Git repository, fetch public upstream `main`, assert `FETCH_HEAD` equals `d578067...`, fetch mirror `preview`, assert it equals `33739cba...`, require `git merge-base --is-ancestor`, push the fetched upstream object directly to `refs/heads/preview`, and verify `git ls-remote` returns the expected SHA. It must use `permissions: contents: write`, never use `--force`, and never print credentials.

- [ ] **Step 3: Verify the workflow moved only mirror `preview`.**

Expected: mirror `preview=d578067...`; mirror `main=6ddda762...`; upstream `main=d578067...`.

- [ ] **Step 4: Verify both Vercel projects created READY preview deployments for exact SHA.**

Expected metadata: `githubCommitRef=preview`, `githubCommitSha=d578067...`, `target=null` for both `aurea-solaris` and `aurea-solaris-api`.

### Task 2: Run fresh exact-SHA preview acceptance

**Files:**
- Read: `scripts/verify_preview.sh`
- Read: `scripts/verify_supabase_environment.sh`
- Read: `apps/web/e2e/specs/ownership.spec.ts`
- Update evidence: `docs/operations/deployments/2026-08-22-fdm-733.md`

**Interfaces:**
- Consumes: matching READY preview web/API deployments for `d578067...` plus approved preview-only credentials.
- Produces: a green FDM-732-equivalent acceptance result for the exact current upstream object.

- [ ] **Step 1: Verify automatable provider boundaries.**

Check preview Supabase health, migration, RLS/policies, public-sign-up-disabled state, expected user/isolation aggregates, and exact web/API Vercel SHA equality.

- [ ] **Step 2: Verify API preview health/security boundaries.**

Check immutable exact deployment `/health`, `/ready`, and unauthenticated private routes with the protected-deployment access mechanism available to the authorized Vercel connector.

- [ ] **Step 3: Run the private hosted browser ownership flow using only an approved secure credential source.**

Required flow: login → onboarding/profile persistence → natal receipt → transit receipt → reload persistence → logout, plus unauthenticated `401`, cross-owner `404`, disabled sign-up, no localhost/mixed-content/production endpoint traffic, and no console/page errors. If the secure preview credential source is unavailable, stop here before any production mutation; never request a password/token in chat.

- [ ] **Step 4: Clean up temporary preview identities/credentials and re-verify provider counts/policies.**

Expected: temporary identities removed and no automation bypass value left behind.

### Task 3: Promote accepted exact SHA to production

**Files:**
- Create in deployment mirror control branch: `.github/workflows/fdm-733-mirror-main.yml`
- Update evidence: `docs/operations/deployments/2026-08-22-fdm-733.md`

**Interfaces:**
- Consumes: accepted preview candidate equal to still-current upstream `main`.
- Produces: mirror `main`, web production deployment, and API production deployment at the same exact SHA.

- [ ] **Step 1: Re-read upstream `main` and reject drift.**

Expected upstream SHA remains the accepted preview SHA.

- [ ] **Step 2: Guardedly import/fast-forward mirror `main` to the exact accepted object.**

Use the same exact-object workflow pattern, asserting the expected current mirror `main=6ddda762...`; no force push.

- [ ] **Step 3: Require new automatic production deployments for both Vercel projects.**

Expected both deployments report `target=production`, ref `main`, and the exact accepted SHA; do not use manual redeploy.

- [ ] **Step 4: Verify API before frontend canonical acceptance.**

Check canonical API `/health` and `/ready`, unauthenticated security negative, certified astrology calculation where the approved smoke mechanism permits it, production Supabase identity/migration/RLS/Auth state, and exact SHA equality.

- [ ] **Step 5: Verify canonical frontend and final owner-auth boundary.**

Check canonical web 200/login rendering and environment isolation. If no approved secure owner session exists, obtain the single human owner-login attestation permitted by FDM-733 without asking for credentials in chat.

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

- [ ] **Step 3: Guardedly mirror the new exact object to deployment `main`.**

Assert expected current mirror `main` equals the first accepted production candidate before the fast-forward.

- [ ] **Step 4: Prove both new production deployments were Git-triggered.**

Require distinct new deployment IDs for web and API, `target=production`, ref `main`, exact traceability SHA, healthy API, and canonical aliases updated. Reject any deployment whose metadata indicates provider/manual redeploy.

### Task 5: Finalize sanitized evidence and Linear

**Files:**
- Update: `docs/operations/deployments/2026-08-22-fdm-733.md`

**Interfaces:**
- Consumes: all verified preview, production, automatic-redeploy, and rollback evidence.
- Produces: auditable sanitized record and a truthful FDM-733 final status.

- [ ] **Step 1: Record rollback targets and all accepted SHAs/deployment IDs.**

Include pre-promotion mirror `main=6ddda762...`, prior web `dpl_53xYnHFvT7yhx14TdiPQd5gLomgx`, prior API `dpl_GtHHFxzbWcP4M4MzjbLxuY7Wx8g6`, accepted preview/production deployment IDs, traceability SHA, validation commands/results, and no credentials/private payloads.

- [ ] **Step 2: Run final ref/SHA/provider verification.**

Require upstream `main` = mirror `main` = both latest production deployment SHAs; confirm Supabase remains healthy and no unexplained ref divergence exists.

- [ ] **Step 3: Update Linear with compact final evidence.**

Move FDM-733 to Done only if every mandatory gate passed. Otherwise leave it In Progress and record the exact blocker while keeping production at the last verified safe state.
