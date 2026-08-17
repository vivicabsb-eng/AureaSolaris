# Playbook: hermes

Catalog: `study-loop` (default, mocked) and `hermes-live-provider` (only if person requested live)

## Mocked / default
1. Keep this check inside Playwright so the page-scoped mocks from `installHermesMocks(page)` remain active. Do not send Hermes messages from the standalone test-user Chrome profile in mocked mode.
2. Against the clean test-user sandbox, run `e2e/specs/hermes.spec.ts` with `--headed` and `--config=e2e/playwright.config.ts`.
3. Pass if Hermes distinguishes answer as assistant text and "Propor memória" remains a proposal.
4. Fail if a memory/task/event appears without explicit approval, or if any Hermes request escapes the Playwright mocks.

## Live (only when requested)
1. Still test-user only.
2. Send one short study question; do not paste secrets.
3. Pass if reply is coherent and sources/uncertainty are not invented as certified calculation.
4. Never log API keys in the report.
