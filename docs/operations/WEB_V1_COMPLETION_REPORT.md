# Private Web V1 Completion Audit — FDM-736

Status: **COMPLETED — FINAL CI GREEN; PRODUCTION PROMOTED 2026-08-24**

FDM-736 is complete. The current production promotion is no longer pending. Sections below preserve the original pre-finalization audit checkpoint; any `PENDING` item or unchecked finalization box there is **historical point-in-time evidence**, not the current Web V1 status.

This report is the sanitized repository evidence map for Linear FDM-736. It contains identifiers and outcomes only; credentials, JWTs, database URLs, service-role keys, provider tokens, protection-bypass values, and private user records are intentionally excluded.

## Final completion addendum — 2026-08-24

- Final validated feature head: `706633be08272698fb6dd70d89752b571943122b`.
- Merge/current upstream `main`: `42cf16d0f336f4c84fab4b7ec905251732ea284f`.
- Deployment-mirror `main`: exact same SHA `42cf16d0f336f4c84fab4b7ec905251732ea284f`.
- Final repository CI: runs `32748332216`, `32748332263`, and `32748332268` — SUCCESS.
- Web production: `dpl_2HgkMxqsYNDnDJTKThW9C5uhsaCL` — READY, canonical alias `aurea-solaris.vercel.app`.
- API production: `dpl_69qFHykosMw4eLDSTkd1JZBoE8Mb` — READY, canonical alias `aurea-solaris-api.vercel.app`.
- Fresh canonical smoke: web `/` 200; API `/health` 200; API `/ready` 503 `service_not_ready` as the accepted fail-closed contract; unauthenticated `/v1/me` 401.
- Production Supabase `tgpcpxqqusehssaihvcp`: `ACTIVE_HEALTHY`; the previously accepted leaked-password-protection advisory remains.
- The FDM-733 owner-authenticated production attestation was reused exactly as allowed by the FDM-736 contract; no owner credential/token was exported.

Immutable final evidence, including exact tree/provenance and residual details, is recorded in [Linear FDM-736](https://linear.app/fdamaso/issue/FDM-736/p410-run-the-final-security-and-web-v1-completion-audit). The audit material below remains unchanged in meaning so its pre-merge provenance is recoverable.

## Historical pre-finalization audit record

## Audit identity

- Development/source of truth: `vivicabsb-eng/AureaSolaris`.
- Deployment-only exact-object mirror: `fernandodamaso/AureaSolaris-deploy`.
- Upstream baseline before FDM-736: `d8b8c844821ef1fea4c30744fbe6c46419d19c81`, tree `2b7c48b0722a8c59e7c06257f254fd9625a91b98`.
- Production mirror baseline: `19f272acace62403e21a83ddfe842759a83617c6`.
- Hosted-audited application/report candidate: `e8bd14e45b6813b699dbf237a39f7cf34643259d`.
- FDM-736 PR: #24.

A commit cannot contain its own SHA. This report therefore records the hosted-audited candidate immediately before this evidence-only update. The final feature-head, merge/main, mirror, and production-deployment identifiers are recorded in Linear after those immutable objects exist. Any head movement requires fresh final-head CI before merge.

## Provider baseline

### Vercel production before final promotion

- Web deployment: `dpl_GXPuurL8YieiEa5iGb1m4XgPv32S` — `READY`.
- API deployment: `dpl_Dj9CAUG2hFGDCiAXyv149nyH5hZf` — `READY`.
- Both identify source `git`, repository `fernandodamaso/AureaSolaris-deploy`, ref `main`, SHA `19f272acace62403e21a83ddfe842759a83617c6`.
- Canonical web `/`: HTTP 200.
- Canonical API `/health`: HTTP 200, `status=ok`.
- Canonical API `/ready`: HTTP 503 `service_not_ready`, the documented fail-closed contract while concrete readiness probes remain disabled.

### Supabase

- Preview ref: `rosklqnnbmhowohoyboj` — `ACTIVE_HEALTHY`.
- Production ref: `tgpcpxqqusehssaihvcp` — `ACTIVE_HEALTHY`.
- Both contain the same `web_v1_core` migration statement digest: MD5 `0b232e06aa286c65092b542c750b24e4`.
- Hosted migration versions: preview `20260821172829`; production `20260821172901`.
- Committed migration blob: `b0a2910d7e9476a9ab1ee61670e1da7bbb4d1f6c`.
- `profiles`, `birth_profiles`, and `calculation_receipts` have RLS enabled with authenticated owner predicates/checks based on `auth.uid() = user_id`.
- Known provider advisory `auth_leaked_password_protection` remains on preview/production. No security boundary was weakened to suppress it.

## Security and runtime findings

### Authentication / ownership / RLS — PASS

FastAPI derives owner identity from verified bearer tokens. JWT/JWKS regressions cover issuer, audience, signature, algorithm, expiry, subject, key selection/rotation/cooldown, malformed material, and outages. Owner-scoped repository behavior, owner-aware references, cross-user denial, authenticated-only RLS, and anonymous denial remain covered by permanent tests.

### Browser/server boundaries — PASS

Browser runtime uses only documented public `VITE_*` configuration. Privileged database/JWT/provider credentials remain server/provider-side. Preview verification rejects production API/Supabase traffic, localhost, mixed HTTP, and secret leakage. CORS remains explicit/fail-closed.

### Error/log leakage — PASS

Authorization values and request bodies are excluded from structured request logs. Public validation/error responses do not expose private values or exception internals.

### Certified astrology runtime — PASS

Swiss Ephemeris assets/package/runtime remain pinned and verified by permanent engine/deploy-contract regressions. Hosted audit confirmed successful natal/transit calculation receipts and deployed engine/ephemeris provenance metadata. No browser-side fallback is accepted.

### Retired runtime/topology — PASS

Permanent regression coverage prevents Railway, Tauri/local-sidecar, retired local-owner/SQLite product runtime, product Docker runtime, stale launchers/ports, and deployment-mirror development from re-entering supported product paths.

## Concrete remediation

### Vite advisory floor

The audit reproduced a Vite dev-server advisory exposure in the admitted/locked tooling range. A permanent regression test was added first, failed on the vulnerable floor, and the minimal remediation moved Vite within major 7 to manifest `^7.3.6` / lock `7.3.6`. No React, API, database, astrology, authentication, ownership, or product behavior changed.

Fresh dependency review after remediation reported 8 npm advisories (6 high, 2 low, 0 critical). Dependency-tree tracing classified the remaining findings as Node build/test/dev tooling rather than a browser-shipped remote Node runtime. No mass upgrade and no `npm audit fix --force` were used.

## Hosted preview certification — PASS

The exact audited candidate `e8bd14e45b6813b699dbf237a39f7cf34643259d` was deployed automatically from deployment-mirror ref `preview`:

- Web deployment `dpl_5DUKtcHX52jJan9K3XKyKb89dqWb` — `READY`.
- API deployment `dpl_Dbeh67nM77PuNh62JtJ5EzbJn7Zo` — `READY`.
- Both report source `git`, mirror repository `fernandodamaso/AureaSolaris-deploy`, ref `preview`, SHA `e8bd14e45b6813b699dbf237a39f7cf34643259d`.
- Web branch alias `aurea-solaris-git-preview-fernando-damasos-projects.vercel.app` resolves to the same exact web deployment.
- API branch alias `aurea-solaris-api-git-preview-fernando-damasos-projects.vercel.app` resolves to the same exact API deployment.

The first automated browser attempt exposed a test-origin mismatch: the immutable web hostname was used while the built web candidate correctly targeted the API branch alias, causing CORS failure. Vercel metadata proved the branch aliases and immutable hostnames were the same exact deployment IDs/SHA, so the audit harness was aligned to the candidate branch aliases without changing application code or weakening CORS/Deployment Protection.

Final disposable GitHub Actions hosted audit run `32747879078` passed all gates:

- Vercel automation bypass: web 200, API 200.
- API `/health`: 200.
- API `/ready`: 503 accepted fail-closed response.
- Unauthenticated `/v1/me`: 401.
- Browser login/onboarding and authenticated shell: PASS.
- Persisted profile/birth reload: PASS.
- Natal/transit receipt creation and provenance UI: PASS.
- Mandala rendering: PASS.
- Cross-owner receipt access: 404 `receipt_not_found`.
- No-token receipt access: 401.
- Logout: PASS.
- Browser production/localhost/mixed-content isolation assertions: PASS.
- Hosted natal engine/ephemeris provenance metadata: PASS.
- Disposable synthetic-user cleanup: 2/2 deleted; marker-scoped preview Auth users reverified at 0.

The temporary audit Edge Function was returned to a JWT-protected HTTP 410 no-op tombstone after the run. The current Supabase connector cannot physically delete Edge Functions; therefore physical deletion of that inert helper remains an operational cleanup limitation, not an active credential or data path.

## Acceptance evidence matrix

| FDM-736 criterion | Evidence | Status |
| --- | --- | --- |
| Web/API/schema/deploy-contract quality | permanent GitHub Actions matrix | FINAL-HEAD CI PENDING |
| Root Python / retired-runtime regressions | classified permanent root suite | FINAL-HEAD CI PENDING |
| Disposable local full E2E | `python tools/run_e2e.py` / CI | FINAL-HEAD CI PENDING |
| JWT/JWKS negatives and API-derived ownership | API regressions/source review | PASS; FINAL-HEAD CI PENDING |
| Hosted login/onboarding/persistence/Mandala/receipts | hosted run `32747879078` | PASS |
| Hosted unauthenticated/cross-owner denial | hosted run `32747879078` | PASS |
| Hosted zero browser/page errors | Playwright hosted audit | PASS |
| Preview-only API/Supabase / HTTPS / no localhost | Playwright isolation assertions | PASS |
| Certified hosted Swiss runtime/provenance | hosted audit + deploy contract | PASS |
| Public sign-up disabled | hosted/provider verification | PASS |
| Production authenticated owner flow | reused FDM-733 owner attestation; no password/token exported | ACCEPTED REUSED BOUNDARY |
| Exact source → mirror → Vercel preview provenance | deployment IDs above at `e8bd14e...` | PASS |
| Final PR review/secret/stale-runtime scan | final-head review | PENDING |
| Exact production promotion / automatic deploy | mirror `main` + Vercel production | PENDING |
| Canonical production smoke | web `/`, API `/health`, documented `/ready` | PENDING |

## Known limitations / accepted residual risks

- API `/ready` intentionally returns `503 service_not_ready` until concrete readiness probes are enabled; this is fail-closed behavior.
- Supabase leaked-password protection remains a provider advisory; it does not bypass application JWT validation, owner-scoped SQL, or RLS.
- FDM-742 external human astrology-reference/provenance assurance remains a separate deferred assurance item and is not a Web V1 engineering completion blocker.
- The retired `fdm-736-audit-helper` Edge Function is inert (JWT required, HTTP 410) but cannot be physically deleted through the currently available Supabase connector.
- No speculative post-V1 modules are included.

## Rollback posture

Before final FDM-736 promotion, the known-good production mirror target is `19f272acace62403e21a83ddfe842759a83617c6`, with web deployment `dpl_GXPuurL8YieiEa5iGb1m4XgPv32S` and API deployment `dpl_Dj9CAUG2hFGDCiAXyv149nyH5hZf`. Rollback uses exact Git/provider objects and must never delete private user data as an incident shortcut.

## Finalization checklist

- [ ] Fresh final-head complete CI matrix is green.
- [x] Exact candidate hosted preview pair is `READY`.
- [x] Full hosted preview browser/security/isolation flow passes with disposable identities only.
- [x] Temporary synthetic identities are removed; marker count is 0.
- [ ] PR full diff/scope/stale-runtime/secret-pattern/review-thread checks are clean.
- [ ] PR is merged only after fresh final-head verification.
- [ ] Final upstream `main` SHA/tree are recorded.
- [ ] Deployment-mirror `main` is promoted only to the exact authorized upstream object.
- [ ] Automatic Vercel web/API production deployments prove mirror `main` and exact promoted SHA.
- [ ] Fresh canonical web `/`, API `/health`, and documented `/ready` checks pass.
- [ ] Sanitized completion evidence is recorded in Linear; FDM-736 is marked Done only if every criterion passes.
- [ ] No subsequent Linear issue is started.