import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { HermesChat } from '../../components/HermesChat';

const globalHolder: { current: ReturnType<typeof makeGlobal> } = {
  current: null as unknown as ReturnType<typeof makeGlobal>,
};
const identityHolder: { current: ReturnType<typeof makeIdentity> } = {
  current: null as unknown as ReturnType<typeof makeIdentity>,
};

function makeGlobal(overrides: { loading?: boolean } = {}) {
  return {
    astro: { liveData: null, loading: overrides.loading ?? false },
    system: { status: 'Stable' },
  };
}

function makeIdentity() {
  return {
    activeProfile: { id: 'owner-1', name: 'Titular' },
    activeSubjectId: 'owner-1',
    mapSubjects: [{
      id: 'owner-1',
      ownerProfileId: 'owner-1',
      kind: 'profile' as const,
      name: 'Titular',
      source: { id: 'owner-1', name: 'Titular', certifiedNatalCalculation: undefined as unknown },
    }],
  };
}

vi.mock('../../context/GlobalContext', () => ({
  useGlobalContext: () => globalHolder.current,
}));

vi.mock('../../features/identity/IdentityContext', () => ({
  useIdentity: () => identityHolder.current,
}));

vi.mock('../../services/chat', () => ({
  openHermesThread: vi.fn(),
  getHermesThreadContext: vi.fn(),
  appendHermesMessage: vi.fn(async () => ({})),
  proposeHermesMemory: vi.fn(),
  sendChatMessage: vi.fn(),
  sendChatMessageStream: vi.fn(),
}));

import { getHermesThreadContext, openHermesThread, sendChatMessageStream } from '../../services/chat';

describe('HermesChat thread open', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    globalHolder.current = makeGlobal();
    identityHolder.current = makeIdentity();
    vi.mocked(openHermesThread).mockResolvedValue({
      thread: { id: 'thread-1' },
    } as unknown as Awaited<ReturnType<typeof openHermesThread>>);
    vi.mocked(getHermesThreadContext).mockResolvedValue({
      thread: { id: 'thread-1' },
      messages: [],
    } as unknown as Awaited<ReturnType<typeof getHermesThreadContext>>);
  });

  it('does not reopen the thread when global astro context refreshes', async () => {
    const { rerender } = render(<HermesChat isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(openHermesThread).toHaveBeenCalledTimes(1);
    });

    globalHolder.current = makeGlobal({ loading: true });
    rerender(<HermesChat isOpen onClose={() => undefined} />);

    await Promise.resolve();
    await Promise.resolve();
    expect(openHermesThread).toHaveBeenCalledTimes(1);
  });

  it('sends a prompt built from the latest natal receipt without reopening the thread', async () => {
    vi.mocked(sendChatMessageStream).mockImplementation(async (_messages, _context, _onChunk, onComplete) => {
      onComplete();
    });

    const { rerender, getByLabelText, getByRole } = render(<HermesChat isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(openHermesThread).toHaveBeenCalledTimes(1);
    });

    const natal = {
      planets: { Sun: { degree: 10 } },
      meta: {
        receipt: {
          schema_version: 'calculation-receipt.v1',
          kind: 'natal',
          input_hash: 'natal-after-open-hash',
          engine: { name: 'aurea-solaris-astro-engine', version: '2026.08.audit-1' },
          resolved_time: { utc: '2026-08-10T12:00:00Z', iana_timezone: 'UTC' },
        },
      },
    };
    const base = makeIdentity();
    identityHolder.current = {
      ...base,
      mapSubjects: [{
        ...base.mapSubjects[0],
        source: {
          id: 'owner-1',
          name: 'Titular',
          certifiedNatalCalculation: natal,
        },
      }],
    };
    rerender(<HermesChat isOpen onClose={() => undefined} />);

    fireEvent.click(getByRole('checkbox'));
    fireEvent.change(getByLabelText('Pergunte ao Hermes'), { target: { value: 'Qual é o Sol?' } });
    fireEvent.click(getByLabelText('Enviar mensagem ao Hermes'));

    await waitFor(() => {
      expect(sendChatMessageStream).toHaveBeenCalled();
    });
    expect(openHermesThread).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendChatMessageStream).mock.calls[0][1]).toContain('natal-after-open-hash');
  });
});