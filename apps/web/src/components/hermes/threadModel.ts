import type { HermesStoredMessage } from '../../services/chat';

export interface HermesChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function buildHermesTopicKey(ownerId: string, subjectId: string | null | undefined): string {
  return `hermes:owner:${ownerId}:subject:${subjectId || ownerId}`;
}

export function storedMessageToChat(message: HermesStoredMessage): HermesChatMessage | null {
  if (message.role === 'user') return { role: 'user', content: message.content };
  if (message.role === 'hermes' || message.role === 'system') {
    return { role: 'assistant', content: message.content };
  }
  return null;
}
