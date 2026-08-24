# Agent Guide — `apps/web`

This guide extends root [`../../AGENTS.md`](../../AGENTS.md). Global safety/privacy/product rules are not repeated here.

## Start here

- app composition: `src/App.tsx`, `src/app/AppProviders.tsx`;
- auth/session: `src/auth/`;
- HTTP/generated contracts: `src/api/`;
- user-facing domains: `src/features/`;
- reusable UI: `src/components/`;
- browser E2E: `e2e/`.

Prefer changing the owning feature before adding a global abstraction.

## Local invariants

- Supabase in the browser is for the documented public/auth boundary; private product persistence goes through the authenticated API.
- Never place privileged server/database/provider credentials in `VITE_*`, source code, tests, fixtures, or browser storage.
- Never trust a client-selected owner identity.
- Certified astrology stays server-side; UI code may render returned results/provenance but must not add a fallback calculator or silently approximate values.
- Keep API types synchronized with the API/OpenAPI source instead of hand-maintaining divergent request/response shapes.
- Preserve accessibility and existing authenticated/unauthenticated state behavior when changing shared shell/components.

## Validation

From repository root:

```bash
npm run check:web
```

If API/OpenAPI shapes are involved:

```bash
npm run api:check
```

Run the relevant Playwright/disposable E2E gate when changing login/onboarding, persistence, Mandala/calculation flows, or another cross-boundary browser behavior. See [`../../docs/NEW_FEATURE_GUIDE.md`](../../docs/NEW_FEATURE_GUIDE.md).

## Prohibited shortcuts

- direct browser reads/writes of private product tables to bypass the API;
- privileged secrets in frontend config;
- duplicated client ownership/security rules that disagree with the API;
- browser-side certified-calculation fallback;
- unrelated shared-component refactors bundled into a feature change;
- reintroducing retired product-runtime assumptions into web code.