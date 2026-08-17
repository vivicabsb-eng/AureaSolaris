import { describe, expect, it } from 'vitest';
import { buildHermesTopicKey, storedMessageToChat } from '../../../components/hermes/threadModel';
import type { HermesStoredMessage } from '../../../services/chat';

describe('Hermes thread model', () => {
  it('keeps owner and subject explicit in the persisted topic key', () => {
    expect(buildHermesTopicKey('owner-a', 'subject-b')).toBe('hermes:owner:owner-a:subject:subject-b');
    expect(buildHermesTopicKey('owner-a', null)).toBe('hermes:owner:owner-a:subject:owner-a');
  });

  it('maps persisted Hermes and system roles back to assistant presentation messages', () => {
    const base: Omit<HermesStoredMessage, 'role'> = {
      id: 'message-a',
      owner_id: 'owner-a',
      thread_id: 'thread-a',
      content: 'content',
      provenance_kind: 'system_notice',
      calculation_receipt_hash: null,
      source_refs: [],
      created_at: '2026-08-14T00:00:00Z',
    };

    expect(storedMessageToChat({ ...base, role: 'user' })).toEqual({
      role: 'user',
      content: 'content',
    });
    expect(storedMessageToChat({ ...base, role: 'hermes' })).toEqual({
      role: 'assistant',
      content: 'content',
    });
    expect(storedMessageToChat({ ...base, role: 'system' })).toEqual({
      role: 'assistant',
      content: 'content',
    });
  });
});
