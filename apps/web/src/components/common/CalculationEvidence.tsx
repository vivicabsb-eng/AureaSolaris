import { ChevronDown, CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';

interface CalculationReceipt {
  input_hash?: string;
  engine?: { name?: string; version?: string };
  resolved_time?: { local?: string; utc?: string; iana_timezone?: string; utc_offset_minutes?: number };
  ephemeris?: { library?: string; library_version?: string; mode?: string };
  house_system?: string;
  zodiac?: string;
}

export interface CalculationMeta {
  timestamp?: string;
  location?: { lat?: number; lon?: number };
  house_system?: string;
  ephemeris?: string;
  jd?: number;
  receipt?: CalculationReceipt;
}

interface CalculationEvidenceProps {
  meta?: CalculationMeta;
  loading: boolean;
  error?: string | null;
}

function formatTimestamp(value?: string) {
  if (!value) return 'não informado pelo motor';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Mostra o recibo técnico do motor antes de qualquer camada interpretativa. */
export const CalculationEvidence = ({ meta, loading, error }: CalculationEvidenceProps) => {
  if (loading) {
    return <div role="status" className="flex items-center gap-2 rounded-xl border border-gold/20 bg-[#FCF9F1] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#8b7344]"><LoaderCircle size={14} className="animate-spin" />Calculando no motor local…</div>;
  }

  if (error || !meta?.receipt) {
    return <div role="status" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-amber-800"><CircleAlert size={14} />Sem cálculo astronômico auditável</div>;
  }

  const receipt = meta.receipt;
  const location = Number.isFinite(meta.location?.lat) && Number.isFinite(meta.location?.lon)
    ? `${meta.location?.lat?.toFixed(4)}, ${meta.location?.lon?.toFixed(4)}`
    : 'não informada';
  const engine = [receipt.engine?.name, receipt.engine?.version].filter(Boolean).join(' · ') || 'motor não declarado';
  const ephemeris = [receipt.ephemeris?.library, receipt.ephemeris?.library_version, receipt.ephemeris?.mode].filter(Boolean).join(' · ') || meta.ephemeris || 'efeméride não declarada';

  return (
    <section aria-label="Proveniência do cálculo" className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-800"><CircleCheck size={15} aria-hidden="true" /><span className="text-[10px] font-black uppercase tracking-wider">Valor astronômico calculado</span></div>
        <span className="text-[10px] font-semibold text-emerald-700/80">{ephemeris}</span>
      </div>

      <details className="group mt-2">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-[10px] font-bold text-emerald-800/70 outline-none transition-colors hover:text-emerald-950 focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2">
          Ver recibo técnico
          <ChevronDown size={13} className="transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <dl className="mt-3 grid gap-x-4 gap-y-1.5 border-t border-emerald-100 pt-3 text-[10px] text-emerald-950/75 sm:grid-cols-2">
          <div><dt className="inline text-emerald-800/55">Motor: </dt><dd className="inline font-semibold">{engine}</dd></div>
          <div><dt className="inline text-emerald-800/55">Efeméride: </dt><dd className="inline font-semibold">{ephemeris}</dd></div>
          <div><dt className="inline text-emerald-800/55">Instante UTC: </dt><dd className="inline font-semibold">{formatTimestamp(receipt.resolved_time?.utc || meta.timestamp)}</dd></div>
          <div><dt className="inline text-emerald-800/55">Fuso IANA: </dt><dd className="inline font-semibold">{receipt.resolved_time?.iana_timezone || 'não declarado'}</dd></div>
          <div><dt className="inline text-emerald-800/55">Local: </dt><dd className="inline font-semibold">{location}</dd></div>
          <div><dt className="inline text-emerald-800/55">Casas / zodíaco: </dt><dd className="inline font-semibold">{receipt.house_system || meta.house_system || 'não aplicável'} / {receipt.zodiac || 'não declarado'}</dd></div>
          <div className="sm:col-span-2"><dt className="inline text-emerald-800/55">Hash da entrada: </dt><dd className="inline font-mono font-semibold break-all">{receipt.input_hash || 'não declarado'}</dd></div>
        </dl>
      </details>
    </section>
  );
};
