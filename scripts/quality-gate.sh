#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

select_python() {
  if [[ -n "${PYTHON:-}" ]]; then
    return
  fi
  if command -v python.exe >/dev/null 2>&1; then
    PYTHON="python.exe"
  elif command -v python >/dev/null 2>&1; then
    PYTHON="python"
  elif command -v python3 >/dev/null 2>&1; then
    PYTHON="python3"
  else
    printf 'Python 3.12 is required for the repository quality gates.\n' >&2
    exit 1
  fi
}

select_supabase() {
  if [[ -n "${SUPABASE:-}" ]]; then
    return
  fi
  if command -v supabase.exe >/dev/null 2>&1; then
    SUPABASE="supabase.exe"
  elif command -v supabase >/dev/null 2>&1; then
    SUPABASE="supabase"
  else
    printf 'Supabase CLI is required for the schema quality gate.\n' >&2
    exit 1
  fi
}

quality_docs() {
  select_python
  "$PYTHON" tools/check_docs.py
  "$PYTHON" -m unittest tests.test_doc_contract -v
}

quality_web() {
  npm run check:web
  npm run api:check
  npm run assert:web-only
}

quality_api() {
  select_python
  "$PYTHON" -m pytest services/api/tests -q
  "$PYTHON" -m ruff check services/api
  "$PYTHON" -m mypy --config-file services/api/pyproject.toml services/api/src
}

quality_schema() {
  select_python
  select_supabase
  cleanup_schema() {
    "$SUPABASE" stop >/dev/null 2>&1 || true
    rm -f supabase/.temp/cli-latest
    rmdir supabase/.temp/start-secrets supabase/.temp 2>/dev/null || true
  }
  trap cleanup_schema EXIT
  start_log="$(mktemp)"
  if ! "$SUPABASE" start >"$start_log" 2>&1; then
    cat "$start_log"
    rm -f "$start_log"
    return 1
  fi
  rm -f "$start_log"
  "$SUPABASE" db reset
  "$SUPABASE" test db
  env AUREA_TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
    "$PYTHON" -m pytest services/api/tests/infrastructure/test_repositories.py -q
}

quality_api_deploy_contract() {
  select_python
  "$PYTHON" -m pytest \
    services/api/tests/test_deployment_contract.py \
    services/api/tests/test_openapi.py \
    services/api/tests/infrastructure/ephemeris/test_adapter.py \
    -q
  "$PYTHON" services/api/scripts/export_openapi.py --check
  "$PYTHON" -m compileall -q services/api/api services/api/src
}

case "${1:-all}" in
  docs) quality_docs ;;
  web) quality_web ;;
  api) quality_api ;;
  schema) quality_schema ;;
  api-deploy-contract) quality_api_deploy_contract ;;
  all)
    quality_docs
    quality_web
    quality_api
    quality_schema
    quality_api_deploy_contract
    ;;
  *)
    printf 'Usage: %s {docs|web|api|schema|api-deploy-contract|all}\n' "$0" >&2
    exit 2
    ;;
esac
