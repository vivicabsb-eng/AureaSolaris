# Hermes and study loop

## hermes-mocked-proposal

- feature: Hermes
- steps: Open chat; mock provider; consent; send; propose memory.
- assert: Mock reply visible; memory stays proposal until review.
- spec: `e2e/specs/hermes.spec.ts`
- playbook: none
- seed: Hermes UI + mocks

## hermes-live-provider

- feature: Hermes
- steps: Live provider conversation (person must request).
- assert: Coherent reply; no secrets in report; still test-user only.
- spec: none (not in CI)
- playbook: `e2e/playbooks/hermes.md`
- seed: test-user sandbox

## study-loop

- feature: Hermes
- steps: Map → Tutor IA → mocked reply → Estudar no Caderno → reload Caderno.
- assert: The specific study and its source note persist after reload and reopen.
- spec: `e2e/specs/hermes.spec.ts`
- playbook: `e2e/playbooks/hermes.md`
- seed: seeded natal + Caderno
