# Boot and shell

## boot-local-owner

- feature: Boot
- steps: Open `/`. Do not log in.
- assert: Heading Aurea Solaris; profile shows Pessoa Teste; no login screen.
- spec: `e2e/specs/boot.spec.ts`
- playbook: none
- seed: test-user account `aurea-test`

## boot-health-test-user

- feature: Health
- steps: `GET /health`
- assert: `test_user === true`, `browser_contract_version === 2`
- spec: `e2e/specs/boot.spec.ts`
- playbook: none (skill refuses if false)
- seed: `AUREA_TEST_USER=1`

## shell-navigation

- feature: Shell
- steps: Click each sidebar item; open Hermes FAB; open profile button.
- assert: Each page title/landmark appears; Hermes panel opens; profile editor opens.
- spec: `e2e/specs/shell.spec.ts`
- playbook: none
- seed: test-user UI seed
