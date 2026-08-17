import { describe, expect, it } from 'vitest';
import { buildSystemPrompt } from '../components/HermesChat';

describe('Hermes por mapa em foco', () => {
  it('usa o sujeito selecionado e não injeta regras sem fonte', () => {
    const context = {
      identity: {
        activeProfile: { id: 'owner-a', name: 'Titular' },
        activeSubjectId: 'subject-b',
        mapSubjects: [
          {
            id: 'owner-a',
            ownerProfileId: 'owner-a',
            kind: 'profile',
            name: 'Titular',
            source: { id: 'owner-a', name: 'Titular', birthDate: '1990-01-01' },
          },
          {
            id: 'subject-b',
            ownerProfileId: 'owner-a',
            kind: 'connection',
            name: 'Mapa autorizado',
            source: {
              id: 'subject-b',
              name: 'Mapa autorizado',
              birthData: {
                date: '1985-05-03',
                time: '14:20',
                location: 'Recife',
                timezone: 'America/Recife',
              },
            },
          },
        ],
      },
      astro: { liveData: null },
      system: { status: 'Stable' },
    } as Parameters<typeof buildSystemPrompt>[0];

    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('Mapa em foco: Mapa autorizado');
    expect(prompt).toContain('1985-05-03 · 14:20 · Recife · America/Recife');
    expect(prompt).not.toContain('Caminho de Vida');
    expect(prompt).not.toContain('TAREFAS');
    expect(prompt).not.toContain('OS 7 PRINCÍPIOS');
    expect(prompt).toContain('Fonte: não selecionada');
  });

  it('não aceita um sujeito pertencente a outro titular', () => {
    const context = {
      identity: {
        activeProfile: { id: 'owner-a', name: 'Titular A', birthDate: '1990-01-01' },
        activeSubjectId: 'foreign-subject',
        mapSubjects: [{
          id: 'foreign-subject',
          ownerProfileId: 'owner-b',
          kind: 'connection',
          name: 'Mapa de B',
          source: { birthDate: '1970-01-01' },
        }],
      },
      astro: { liveData: null },
      system: { status: 'Stable' },
    } as Parameters<typeof buildSystemPrompt>[0];

    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('Mapa em foco: Titular A');
    expect(prompt).toContain('1990-01-01');
    expect(prompt).not.toContain('Mapa de B');
    expect(prompt).not.toContain('1970-01-01');
  });
});