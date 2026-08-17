# Caderno Vivo

## caderno-seeded-board

- feature: Caderno
- steps: Open Caderno Vivo.
- assert: Nota A de teste and Nota B de teste visible.
- spec: `e2e/specs/caderno.spec.ts`
- playbook: `e2e/playbooks/caderno-visual.md`
- seed: Caderno de teste board

## caderno-edit-undo

- feature: Caderno
- steps: Select Post-it tool; place if needed; undo.
- assert: Undo control works without crash.
- spec: `e2e/specs/caderno.spec.ts`
- playbook: none
- seed: seeded board

## caderno-create-study

- feature: Caderno
- steps: From Astrologia Caderno Vivo tab, create study topic.
- assert: Study creation surfaces Caderno or topic text.
- spec: `e2e/specs/caderno.spec.ts`
- playbook: none
- seed: Astrologia portal

## caderno-reload

- feature: Caderno
- steps: Open seeded notes; reload; reopen Caderno.
- assert: Nota A de teste still visible.
- spec: `e2e/specs/caderno.spec.ts`
- playbook: none
- seed: seeded board
