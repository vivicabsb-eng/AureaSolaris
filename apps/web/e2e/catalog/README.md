# E2E catalog

Source of truth for agent and CI workflows. Spec: `docs/superpowers/specs/2026-08-13-agent-e2e-design.md`.

| id | area | CI | playbook | status |
|---|---|---|---|---|
| boot-local-owner | boot | yes | none | implemented |
| boot-health-test-user | boot | yes | none | implemented |
| shell-navigation | boot | yes | none | implemented |
| astrologia-seeded-natal | astrologia | yes | e2e/playbooks/mandala.md | implemented |
| astrologia-recalculate | astrologia | yes | none | implemented |
| astrologia-incomplete-birth | astrologia | yes | none | implemented |
| astrologia-open-caderno | astrologia | yes | none | implemented |
| astrologia-open-hermes | astrologia | yes | none | implemented |
| astrologia-second-map | astrologia | yes | none | implemented |
| caderno-seeded-board | caderno | yes | e2e/playbooks/caderno-visual.md | implemented |
| caderno-edit-undo | caderno | yes | none | implemented |
| caderno-create-study | caderno | yes | none | implemented |
| caderno-reload | caderno | yes | none | implemented |
| diario-edit-reload | diario | yes | none | implemented |
| agenda-task-event | agenda | yes | none | implemented |
| saude-preview-upload | saude | yes | e2e/playbooks/saude.md | implemented |
| memorias-review | memorias | yes | none | implemented |
| memorias-open-caderno | memorias | yes | none | implemented |
| hermes-mocked-proposal | hermes | yes | none | implemented |
| hermes-live-provider | hermes | no | e2e/playbooks/hermes.md | pending |
| study-loop | hermes | yes | e2e/playbooks/hermes.md | implemented |

When a spec lands, flip `status` to `implemented`. Playbooks are under `e2e/playbooks/`.
