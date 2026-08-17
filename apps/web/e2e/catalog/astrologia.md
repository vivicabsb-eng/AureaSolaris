# Astrologia

## astrologia-seeded-natal

- feature: Astrologia
- steps: Open Astrologia → Mandala visual; open technical receipt.
- assert: Receipt shows UTC, IANA timezone, input hash (not undeclared).
- spec: `e2e/specs/astrologia.spec.ts`
- playbook: `e2e/playbooks/mandala.md`
- seed: Mapa de referencia + Pessoa Conhecida

## astrologia-recalculate

- feature: Astrologia
- steps: Switch map to Pessoa Conhecida; refresh; switch back to Mapa de referencia.
- assert: Provenance badge remains visible after each change.
- spec: `e2e/specs/astrologia.spec.ts`
- playbook: none
- seed: two seeded maps

## astrologia-incomplete-birth

- feature: Astrologia
- steps: Add map with name only; leave date/time/location empty; try save.
- assert: Form errors; no silent invented values; map not added to selector.
- spec: `e2e/specs/astrologia.spec.ts`
- playbook: none
- seed: none beyond boot

## astrologia-open-caderno

- feature: Astrologia
- steps: Click Estudar no Caderno.
- assert: Caderno Vivo opens.
- spec: `e2e/specs/astrologia.spec.ts`
- playbook: none
- seed: seeded natal

## astrologia-open-hermes

- feature: Astrologia
- steps: Click Tutor IA (Hermes mocked).
- assert: Hermes composer visible.
- spec: `e2e/specs/astrologia.spec.ts`
- playbook: none
- seed: seeded natal

## astrologia-second-map

- feature: Astrologia
- steps: Add map using Pessoa Conhecida fixture values from São Paulo city select.
- assert: New map selectable; provenance visible.
- spec: `e2e/specs/astrologia.spec.ts`
- playbook: none
- seed: BirthForm São Paulo city entry
