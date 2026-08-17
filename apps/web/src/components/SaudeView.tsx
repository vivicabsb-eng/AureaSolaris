import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, FileText, Loader2, Moon, UploadCloud } from 'lucide-react';
import { getBrowserSessionHeaders, isTauriRuntime, safeInvoke } from '../utils/tauri';
import { useCertifiedNatalCalculation } from '../hooks/useCertifiedNatalCalculation';
import { useIdentity } from '../features/identity/IdentityContext';
import { readConfirmedBirthInput } from '../utils/confirmedBirthInput';
import { readCertifiedCalculation } from '../utils/certifiedCalculation';
import type { PlanetaryPosition } from '../types/astrology';
import { LOCAL_API_URL } from '../utils/api';

type HealthRecord = {
  id: string;
  date: string;
  fileName: string;
  rawText?: string;
};

export const SaudeView = () => {
  const {
    profiles,
    mapSubjects,
    activeProfileId,
    activeSubjectId,
    setActiveSubjectId,
  } = useIdentity();
  const [healthHistory, setHealthHistory] = useState<HealthRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableMaps = useMemo(() => {
    const subjects = mapSubjects?.filter((map) => map.ownerProfileId === activeProfileId) || [];
    return subjects.length
      ? subjects
      : profiles
        .filter((profile) => profile.id === activeProfileId)
        .map((profile) => ({ id: profile.id, name: profile.name, kind: 'profile' as const, ownerProfileId: profile.id, source: profile }));
  }, [activeProfileId, mapSubjects, profiles]);

  const focusedMap = availableMaps.find((map) => map.id === activeSubjectId) || availableMaps[0];
  const focusedSubjectId = focusedMap?.id || '';
  const birthData = useMemo(() => readConfirmedBirthInput(focusedMap?.source), [focusedMap]);
  const { data, loading, error } = useCertifiedNatalCalculation(birthData ?? undefined, Boolean(birthData));
  const certifiedNatal = readCertifiedCalculation(data, 'natal');
  const rawMoon = data?.planets?.Moon;
  const natalMoon = rawMoon && typeof rawMoon === 'object' && 'sign' in rawMoon
    ? rawMoon as PlanetaryPosition
    : undefined;

  useEffect(() => {
    if (!focusedSubjectId) {
      setHealthHistory([]);
      return;
    }

    let active = true;
    safeInvoke<HealthRecord[]>('load_health_memory', { profileId: focusedSubjectId })
      .then((records) => {
        if (active) setHealthHistory(Array.isArray(records) ? records : []);
      })
      .catch(() => {
        if (active) setNotice('O histórico privado não pôde ser aberto neste momento.');
      });
    return () => { active = false; };
  }, [focusedSubjectId]);

  const saveExtractedRecord = async (fileName: string, text: string) => {
    const record: HealthRecord = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      fileName,
      // Guardamos apenas uma prévia para identificar o documento. A leitura
      // clínica não é produzida pelo Aurea sem revisão humana e consentimento.
      rawText: text.slice(0, 500),
    };
    const updated = [record, ...healthHistory];
    const saved = await safeInvoke('save_health_memory', { profileId: focusedSubjectId, memory: updated });
    if (saved === null) throw new Error('Não foi possível salvar o histórico privado no serviço local.');
    setHealthHistory(updated);
    setNotice('Documento registrado no histórico privado deste mapa.');
  };

  const uploadBrowserPdf = async (file: File) => {
    setIsUploading(true);
    try {
      const extraction = await fetch(`${LOCAL_API_URL}/extract_pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/pdf',
          'X-Aurea-Filename': file.name,
          ...getBrowserSessionHeaders(),
        },
        body: file,
      });
      const extracted = await extraction.json().catch(() => ({})) as { text?: string; detail?: string };
      if (!extraction.ok) throw new Error(extracted.detail || 'Não foi possível ler este PDF no serviço local.');
      await saveExtractedRecord(file.name, typeof extracted.text === 'string' ? extracted.text : '');
    } catch (uploadError) {
      setNotice(uploadError instanceof Error ? uploadError.message : 'Não foi possível registrar o documento.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBrowserFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void uploadBrowserPdf(file);
  };

  const handleUploadExam = async () => {
    if (!focusedSubjectId) return;
    setNotice(null);
    if (!isTauriRuntime()) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }],
      });
      if (!selected || Array.isArray(selected)) return;

      setIsUploading(true);
      const extraction = await fetch(`${LOCAL_API_URL}/extract_pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: selected }),
      });
      if (!extraction.ok) throw new Error('Não foi possível ler este PDF no serviço local.');
      const extracted = await extraction.json() as { text?: string };
      await saveExtractedRecord(selected.split(/[\\/]/).pop() || 'Documento.pdf', extracted.text || '');
    } catch (uploadError) {
      setNotice(uploadError instanceof Error ? uploadError.message : 'Não foi possível registrar o documento.');
    } finally {
      setIsUploading(false);
    }
  };

  const calculationStatus = !birthData
    ? 'Complete data, hora, local, coordenadas e fuso IANA no perfil para calcular este mapa.'
    : loading
      ? 'Calculando no motor local…'
      : error
        ? `Cálculo indisponível: ${error}`
        : certifiedNatal
          ? 'Valores recebidos do motor local com recibo auditável.'
          : 'O motor respondeu sem recibo auditável; nenhum valor será apresentado como confirmado.';

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <header className="aurea-page-header flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="aurea-card-gold flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" aria-hidden="true">
            <Activity size={20} />
          </span>
          <div>
            <h1 className="text-base font-bold tracking-wide">Saúde & registros privados</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--aurea-text-muted)' }}>
              Observações e documentos pessoais — não é diagnóstico nem prescrição.
            </p>
          </div>
        </div>
        <label className="aurea-input flex min-w-[220px] flex-col gap-1 rounded-xl px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--aurea-text-muted)' }}>Mapa em foco</span>
          <select
            value={focusedSubjectId}
            onChange={(event) => setActiveSubjectId(event.target.value)}
            className="bg-transparent text-sm font-semibold outline-none"
            aria-label="Mapa em foco na Saúde"
          >
            {availableMaps.map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}
          </select>
        </label>
      </header>

      <section className="aurea-card-gold rounded-xl p-4 text-sm leading-relaxed">
        <strong>Critério de verdade. </strong>
        A base editorial da Engenharia Astral ainda está em auditoria externa. Por isso esta aba mostra apenas dados calculados com recibo e registros pessoais; não associa órgãos, chakras, ervas, frequências ou tratamentos ao mapa.
      </section>

      {notice && <p role="status" className="panel-light rounded-xl px-4 py-3 text-sm">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="panel-light rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Moon size={18} style={{ color: 'var(--aurea-gold-deep)' }} />
            <h2 className="text-sm font-bold">Dados astronômicos disponíveis</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--aurea-text-muted)' }}>{calculationStatus}</p>

          {certifiedNatal && natalMoon && (
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="aurea-card-soft rounded-xl p-4">
                <dt className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--aurea-text-muted)' }}>Lua natal</dt>
                <dd className="mt-1 text-base font-bold">{natalMoon.sign} {typeof natalMoon.degree === 'number' ? `· ${natalMoon.degree.toFixed(2)}°` : ''}</dd>
              </div>
              <div className="aurea-card-soft rounded-xl p-4">
                <dt className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--aurea-text-muted)' }}>Proveniência</dt>
                <dd className="mt-1 text-sm font-semibold">Recibo técnico disponível no mapa</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="panel-light rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Documentos do mapa</h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--aurea-text-muted)' }}>Arquivo privado, separado por mapa.</p>
            </div>
            <button
              type="button"
              onClick={() => void handleUploadExam()}
              disabled={isUploading || !focusedSubjectId}
              className="aurea-button-primary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
              {isUploading ? 'Lendo…' : 'Registrar PDF'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleBrowserFile}
            />
          </div>
          <div className="mt-4 space-y-3">
            {healthHistory.length === 0 ? (
              <p className="aurea-card-soft rounded-xl p-4 text-sm" style={{ color: 'var(--aurea-text-muted)' }}>
                Nenhum documento registrado para este mapa.
              </p>
            ) : healthHistory.map((record) => (
              <article key={record.id} className="aurea-card-soft rounded-xl p-4">
                <div className="flex gap-2">
                  <FileText size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--aurea-gold-deep)' }} />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{record.fileName}</h3>
                    <p className="mt-1 text-xs" style={{ color: 'var(--aurea-text-muted)' }}>{new Date(record.date).toLocaleDateString('pt-BR')}</p>
                    {record.rawText && <p className="mt-2 line-clamp-3 text-xs leading-relaxed" style={{ color: 'var(--aurea-text-muted)' }}>{record.rawText}</p>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};