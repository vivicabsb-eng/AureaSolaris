import type { BirthData } from '../../types/private-profile';
import { readCertifiedCalculation } from '../../utils/certifiedCalculation';
import { resolveHermesActiveScope, type HermesPromptContext } from './scope';

function formatCalculatedPositions(positions: Record<string, unknown>): string {
  return Object.entries(positions)
    .map(([name, value]) => {
      if (!value || typeof value !== 'object') return null;
      const position = value as Record<string, unknown>;
      const degree = position.pos_in_sign ?? position.sign_longitude;
      const sign = typeof position.sign === 'string' ? position.sign : null;
      const house = Number.isFinite(position.house) ? ` (casa ${position.house})` : '';
      const retrograde = position.retrograde ? ' retrógrado' : '';
      if (!Number.isFinite(degree) || !sign) return null;
      return `${name}: ${(degree as number).toFixed(1)}° ${sign}${house}${retrograde}`;
    })
    .filter((line): line is string => Boolean(line))
    .join(' | ');
}

export function buildSystemPrompt(ctx: HermesPromptContext): string {
  const { astro, system, identity } = ctx;
  const { owner, subject, source, name } = resolveHermesActiveScope(identity);
  const birthSource = (source?.birthData ?? source?.natal ?? {}) as BirthData;
  const birthDate = source?.birthDate ?? birthSource.birthDate ?? birthSource.date;
  const birthTime = source?.birthTime ?? birthSource.birthTime ?? birthSource.time;
  const birthPlace = source?.birthCity ?? birthSource.birthCity ?? birthSource.location;
  const birthTimezone = source?.birthTimezone ?? birthSource.birthTimezone ?? birthSource.timezone;

  const certifiedNatal = readCertifiedCalculation(source?.certifiedNatalCalculation, 'natal');
  const certifiedTransit = readCertifiedCalculation(astro.liveData, 'transit');

  const natalSection = certifiedNatal
    ? `MAPA NATAL — VALORES CALCULADOS\nRecibo: ${certifiedNatal.meta.receipt.input_hash}\nUTC: ${certifiedNatal.meta.receipt.resolved_time.utc}\nFuso IANA: ${certifiedNatal.meta.receipt.resolved_time.iana_timezone}\nMotor: ${certifiedNatal.meta.receipt.engine.name} ${certifiedNatal.meta.receipt.engine.version}\nPosições: ${formatCalculatedPositions(certifiedNatal.planets) || 'O recibo não trouxe posições legíveis.'}`
    : 'MAPA NATAL — indisponível: este sujeito não possui cálculo certificado no contexto recebido.';

  const skySection = certifiedTransit
    ? `CÉU ATUAL — VALORES CALCULADOS\nRecibo: ${certifiedTransit.meta.receipt.input_hash}\nUTC: ${certifiedTransit.meta.receipt.resolved_time.utc}\nFuso IANA: ${certifiedTransit.meta.receipt.resolved_time.iana_timezone}\nMotor: ${certifiedTransit.meta.receipt.engine.name} ${certifiedTransit.meta.receipt.engine.version}\nPosições: ${formatCalculatedPositions(certifiedTransit.planets) || 'O recibo não trouxe posições legíveis.'}`
    : 'CÉU ATUAL — indisponível: nenhum cálculo certificado foi recebido.';

  return `HERMES — tutor de estudo do Aurea Solaris

ESCOPO DA CONVERSA
Titular autenticado: ${owner?.name ?? 'indisponível'}
Mapa em foco: ${name}
Tipo de mapa: ${subject?.kind === 'connection' ? 'conexão autorizada' : subject?.kind === 'profile' ? 'mapa do titular' : 'não identificado'}
Nascimento informado: ${birthDate ?? 'data indisponível'} · ${birthTime ?? 'hora indisponível'} · ${birthPlace ?? 'local indisponível'} · ${birthTimezone ?? 'fuso indisponível'}

CONTRATO DE VERDADE
- Responda em português, com clareza e sem inventar dados, fontes, escolas ou cálculos.
- Separe explicitamente: Valor calculado; Regra interpretativa; Fonte; Inferência de Hermes; Anotação pessoal.
- Um valor calculado só pode repetir o que veio de um recibo auditável.
- Uma regra interpretativa só pode ser aplicada quando a escola/tradição e a fonte tiverem sido recuperadas.
- Se não houver fonte editorial no contexto, escreva “Fonte: não selecionada” e não improvise uma interpretação.
- Toda hipótese sua deve ser rotulada “Inferência de Hermes” e apresentada como possibilidade de estudo.
- Não crie memória, tarefa, evento ou registro. Apenas proponha uma ação revisável quando a pessoa pedir.
- Não use tarefas, dados de saúde, numerologia, horas planetárias ou anotações que não estejam neste contexto.
- Mantenha a resposta concisa e adequada à pergunta.

${natalSection}

${skySection}

TRÂNSITOS PESSOAIS — indisponíveis até existir vínculo auditável entre o mapa natal em foco e o céu calculado.
BASE EDITORIAL — nenhuma fonte foi recuperada para esta conversa.
ESTADO LOCAL — ${system.status}.`;
}
