# Histórico, Agenda, Saúde, Memórias

## diario-edit-reload

- feature: Diário
- steps: Open Histórico & Notas; edit Primeira anotacao de teste; reload.
- assert: Edited text survives reload.
- spec: `e2e/specs/diario.spec.ts`
- playbook: none
- seed: diary entry title `Primeira anotacao de teste`

## agenda-task-event

- feature: Agenda
- steps: Open Agenda; create and complete/delete a task; create and delete an event.
- assert: Seeded task visible; new task and event complete their explicit lifecycle and disappear when deleted.
- spec: `e2e/specs/agenda.spec.ts`
- playbook: none
- seed: `Revisar mandala de teste`

## saude-preview-upload

- feature: Saúde
- steps: Open Saúde; confirm seeded preview; upload PDF explicitly.
- assert: Preview and upload history; no diagnosis/prescription copy.
- spec: `e2e/specs/saude.spec.ts`
- playbook: `e2e/playbooks/saude.md`
- seed: `preview-teste`; fixture `e2e/fixtures/health-e2e.pdf`

## memorias-review

- feature: Memórias
- steps: Open Memórias; use approve/revoke/forget controls.
- assert: Seeded memories visible; controls present.
- spec: `e2e/specs/memorias.spec.ts`
- playbook: none
- seed: `Memoria proposta de teste` / `Memoria aprovada de teste`

## memorias-open-caderno

- feature: Memórias
- steps: Click Estudar no Caderno from a memory.
- assert: Caderno opens.
- spec: `e2e/specs/memorias.spec.ts`
- playbook: none
- seed: approved/proposed memories
