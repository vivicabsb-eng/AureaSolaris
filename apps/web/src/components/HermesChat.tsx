import React from 'react';
import { useGlobalContext } from '../context/GlobalContext';
import { useIdentity } from '../features/identity/IdentityContext';
import { readCertifiedCalculation } from '../utils/certifiedCalculation';
import { HermesPanel } from './hermes/HermesPanel';
import { resolveHermesActiveScope, type HermesPromptContext } from './hermes/scope';
import { useHermesChatController } from './hermes/useHermesChatController';

export { buildSystemPrompt } from './hermes/prompt';
export type { HermesPromptContext } from './hermes/scope';

export const HermesChat: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const global = useGlobalContext();
  const identity = useIdentity();
  const ctx: HermesPromptContext = {
    identity: {
      activeProfile: identity.activeProfile,
      activeSubjectId: identity.activeSubjectId,
      mapSubjects: identity.mapSubjects,
    },
    astro: global.astro,
    system: global.system,
  };
  const scope = resolveHermesActiveScope(ctx.identity);
  const certifiedNatal = readCertifiedCalculation(scope.source?.certifiedNatalCalculation, 'natal');
  const certifiedTransit = readCertifiedCalculation(global.astro.liveData, 'transit');
  const controller = useHermesChatController({ isOpen, ctx, scope });

  if (!isOpen) return null;

  return (
    <HermesPanel
      subjectName={scope.name}
      hasOwner={Boolean(scope.owner)}
      hasCertifiedNatal={Boolean(certifiedNatal)}
      hasCertifiedTransit={Boolean(certifiedTransit)}
      messages={controller.messages}
      input={controller.input}
      loading={controller.loading}
      showProvenance={controller.showProvenance}
      memoryStatus={controller.memoryStatus}
      lastLatencyMs={controller.lastLatencyMs}
      streamingEnabled={controller.streamingEnabled}
      provider={controller.provider}
      externalConsent={controller.externalConsent}
      canProposeMemory={Boolean(scope.owner && controller.threadId)}
      onClose={onClose}
      onToggleStreaming={() => controller.setStreamingEnabled(value => !value)}
      onRequestFullPrompt={controller.requestFullPrompt}
      onToggleProvenance={() => controller.setShowProvenance(value => !value)}
      onProviderChange={controller.setProvider}
      onExternalConsentChange={controller.setExternalConsent}
      onInputChange={controller.setInput}
      onSend={() => void controller.sendMessage()}
      onProposeMemory={message => void controller.proposeMemoryFromMessage(message)}
    />
  );
};
