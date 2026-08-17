---
name: aurea-e2e
description: Runs Aurea Solaris end-to-end checks on the isolated test-user sandbox (Playwright plus optional visual playbooks). Use when the user asks for E2E, test-user sandbox QA, full dummy life validation, mandala visual check, or Hermes playbook testing.
---

# Aurea E2E (test-user)

## When to use

Person asks to run E2E, validate a feature in the dummy life, or visually check mandala/Hermes/Caderno.

## Procedure

1. Read [apps/web/e2e/catalog/README.md](../../../apps/web/e2e/catalog/README.md) and choose the requested ids. If no feature was named, run all CI ids plus agent playbooks except `hermes-live-provider`.
2. Read [rules.md](rules.md). Obey fail-closed rules.
3. For a full headless CI-equivalent run, use `python tools/run_e2e.py`; it creates a fresh temporary runtime and deletes it afterward.
4. For feature-specific or visual work, start from a clean persistent sandbox: from repo root run `.\launch_chrome.ps1 -TestUser -Reset`, then confirm `GET http://127.0.0.1:<port>/health` returns `test_user: true` and `browser_contract_version: 2`. Never continue on port 9876 default runtime.
5. Apply the feature filter to Playwright itself. Set `AUREA_E2E_URL` to the sandbox URL and pass only the mapped spec files to `npx playwright test <spec files> --config=apps/web/e2e/playwright.config.ts`. Multiple requested areas may pass multiple files.
6. Run in-scope non-Hermes visual playbooks in the reset test-user Chrome profile. For mocked/default Hermes, do **not** send a message from standalone Chrome: run `apps/web/e2e/specs/hermes.spec.ts` with `--headed` so `installHermesMocks(page)` remains active. Use standalone/live Hermes only when the person explicitly requested a live provider in this session.
7. Reply using [report-template.md](report-template.md). List skipped ids.

## Feature to spec mapping

| Area / ids | Playwright file |
|---|---|
| boot | `apps/web/e2e/specs/boot.spec.ts` |
| shell | `apps/web/e2e/specs/shell.spec.ts` |
| astrologia, mandala | `apps/web/e2e/specs/astrologia.spec.ts` |
| caderno | `apps/web/e2e/specs/caderno.spec.ts` |
| diario, histórico, notas | `apps/web/e2e/specs/diario.spec.ts` |
| agenda | `apps/web/e2e/specs/agenda.spec.ts` |
| saúde | `apps/web/e2e/specs/saude.spec.ts` |
| memórias | `apps/web/e2e/specs/memorias.spec.ts` |
| hermes, study-loop | `apps/web/e2e/specs/hermes.spec.ts` |

Live Hermes only if the person explicitly requests a live provider in this session.
