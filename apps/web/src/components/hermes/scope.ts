import type { useGlobalContext } from '../../context/GlobalContext';
import type { IdentityContextValue } from '../../features/identity/IdentityContext';
import { buildHermesTopicKey } from './threadModel';

export type HermesGlobalContext = ReturnType<typeof useGlobalContext>;
export type HermesIdentityContext = Pick<
  IdentityContextValue,
  'activeProfile' | 'activeSubjectId' | 'mapSubjects'
>;
export type HermesPromptContext = Pick<HermesGlobalContext, 'astro' | 'system'> & {
  identity: HermesIdentityContext;
};

export function resolveHermesActiveScope(identity: HermesIdentityContext) {
  const owner = identity.activeProfile;
  const subject = identity.mapSubjects?.find(candidate =>
    candidate.ownerProfileId === owner?.id && candidate.id === identity.activeSubjectId
  );
  const source = subject?.source ?? owner;
  const name = subject?.name ?? owner?.name ?? 'Mapa não selecionado';
  const topicKey = owner
    ? buildHermesTopicKey(owner.id, subject?.id ?? null)
    : null;

  return { owner, subject, source, name, topicKey };
}

export type HermesActiveScope = ReturnType<typeof resolveHermesActiveScope>;
