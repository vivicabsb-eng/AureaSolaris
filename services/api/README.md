# Aurea Solaris Web API

The Web V1 API package targets Python 3.12. Install and validate it from the repository root so local commands match CI.

```bash
python -m pip install -e "./services/api[dev]"
python -m pytest services/api/tests/test_health.py services/api/tests/test_errors.py services/api/tests/test_auth.py services/api/tests/test_profile_routes.py -q
python -m pytest services/api/tests -q
python -m ruff check services/api
python -m mypy --config-file services/api/pyproject.toml services/api/src
```

`aurea_api.main.create_app()` builds the application shell without opening database or astrology-engine connections at import time. `/health` reports process health, while `/ready` fails closed until database and engine readiness probes are injected by later infrastructure work.

Private API routes should depend on `aurea_api.api.auth.get_authenticated_user`. It accepts only Bearer tokens verified against the configured Supabase project's asymmetric JWKS, exact issuer, configured audience, expiration, and UUID subject. The issuer and JWKS URL are derived from `AUREA_SUPABASE_URL`; private routes must use the returned `AuthenticatedUser` rather than client-supplied owner identity.

The JWKS set is cached for 600 seconds, while PyJWT's non-TTL per-key cache remains disabled. An unknown `kid` may force one early JWKS refresh, but additional unknown kids share a 60-second forced-refresh cooldown; this bounds attacker-driven outbound requests while allowing legitimate key rotation to refresh again after the cooldown.

Request logs contain only the request ID, HTTP method, matched route template, status, and duration. They do not include authorization values or request bodies. CORS origins come only from `AUREA_ALLOWED_ORIGINS`.

The explicit mypy config path is required because mypy does not discover a nested `pyproject.toml` from the repository root. Keep database credentials and other secrets in ignored or deployment-managed environment storage only.
