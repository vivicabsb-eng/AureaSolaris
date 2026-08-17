import { useState, useMemo, useEffect, useRef } from 'react';
import { useCertifiedNatalCalculation } from '../hooks/useCertifiedNatalCalculation';
import { MandalaChart } from './MandalaChart';
import { RefreshCw, User, Users, Plus, Edit3, MessageSquare, FileText } from 'lucide-react';
import { useIdentity } from '../features/identity/IdentityContext';
import type { AureaProfile } from '../features/identity/types';
import { BirthForm } from './common/BirthForm';
import { CalculationEvidence } from './common/CalculationEvidence';
import { readCertifiedCalculation } from '../utils/certifiedCalculation';
import type { CertifiedAstrologyResult, PlanetaryPosition } from '../types/astrology';
import type { ProfileConnection, BirthData } from '../types/private-profile';

type BirthInput = { year: number; month: number; day: number; hour: number; lat: number; lon: number; timezone: string };

type ConnectionFormData = {
  name: string;
  date: string;
  time: string;
  location: string;
  lat: number;
  lng: number;
  timezone: string;
};

type ChartHouseCusp = { degree?: number; sign?: string };

// Sem dados confirmados, não há mapa: nunca completar data, hora ou local fictícios.
function readBirthInput(profile: AureaProfile | ProfileConnection | null | undefined): BirthInput | null {
  const natal = (profile?.natal ?? {}) as BirthData;
  const source = profile?.birthData ?? natal;
  const date = profile?.birthDate || source.birthDate || source.date;
  const time = profile?.birthTime || source.birthTime || source.time;
  const lat = Number(source.lat);
  const lon = Number(source.lng ?? (source as BirthData & { lon?: number }).lon);
  const timezone = source.timezone ?? source.birthTimezone ?? profile?.birthTimezone;
  if (typeof date !== 'string' || typeof time !== 'string') return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || !Number.isInteger(hours) || !Number.isInteger(minutes) || month < 1 || month > 12 || day < 1 || day > 31 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 || typeof timezone !== 'string' || (timezone !== 'UTC' && !timezone.includes('/'))) return null;
  return { year, month, day, hour: hours + (minutes / 60), lat, lon, timezone };
}

export const MandalaPage = () => {
  const { profiles, mapSubjects, activeProfileId, activeSubjectId, setActiveSubjectId, addConnection, updateProfile } = useIdentity();
  const selectedTarget = activeSubjectId;
  const [showForm, setShowForm] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  // A visão principal mostra somente a mandala calculada. Tabelas derivadas e
  // regras interpretativas pertencem ao estudo com fonte, não ao canvas.
  const showDetails = false;

  // O mapa é a visão principal. O Caderno abre apenas por uma ação explícita.

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  const activeProfile = useMemo(() =>
    profiles.find(p => p.id === activeProfileId) || profiles[0]
  , [profiles, activeProfileId]);

  useEffect(() => {
    const mapsForOwner = mapSubjects?.filter((subject) => subject.ownerProfileId === activeProfileId) || [];
    if (mapsForOwner.length && !mapsForOwner.some((subject) => subject.id === selectedTarget)) {
      setActiveSubjectId(mapsForOwner[0].id);
    }
  }, [activeProfileId, mapSubjects, selectedTarget, setActiveSubjectId]);

  const handleSaveConnection = (data: ConnectionFormData) => {
    if (editingConnectionId) {
      const updatedConnections = (activeProfile.connections || []).map((connection) =>
        connection.id === editingConnectionId ? { ...connection, ...data, birthData: data } : connection
      );
      updateProfile(activeProfile.id, { connections: updatedConnections });
    } else {
      addConnection(data.name, data);
    }
    setShowForm(false);
    setEditingConnectionId(null);
  };

  // Observer para redimensionar dinamicamente
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const chartSize = useMemo(() => {
    // A mandala nunca deve ser maior que a área realmente disponível. O limite
    // inferior menor evita cortar rótulos quando o tutor está aberto.
    const availableSize = Math.floor(containerWidth - 32);
    return Math.max(240, Math.min(availableSize, 620));
  }, [containerWidth]);

  const birthData = useMemo<BirthInput | null>(() => {
    const subject = mapSubjects?.find(map =>
      map.ownerProfileId === activeProfileId && map.id === selectedTarget
    );
    return readBirthInput(subject?.source || null);
  }, [selectedTarget, activeProfileId, mapSubjects]);

  const calculationEnabled = Boolean(birthData);
  const calculationRequest = useMemo(
    () => (birthData
      ? {
        year: birthData.year,
        month: birthData.month,
        day: birthData.day,
        hour: birthData.hour,
        lat: birthData.lat,
        lon: birthData.lon,
        timezone: birthData.timezone,
      }
      : undefined),
    [birthData],
  );
  const { data, loading, error, recalculate } = useCertifiedNatalCalculation(calculationRequest, calculationEnabled);

  // Parse data for MandalaChart - includes planets, secondary bodies, and angles
  const chartPlanets = useMemo(() => {
    if (!data?.planets) return [];
    const allPoints: Array<{
      name: string;
      degree: number;
      sign: string;
      retrograde?: boolean;
      isAngle?: boolean;
      stationary?: boolean;
      speed?: number;
      house?: number;
    }> = [];

    // Traditional planets + Chiron
    Object.entries(data.planets).forEach(([name, info]) => {
      const position = info as PlanetaryPosition & { stationary?: boolean; speed?: number };
      allPoints.push({
        name,
        degree: position.degree,
        sign: position.sign || '',
        retrograde: position.retrograde === true,
        isAngle: ['ASC', 'MC'].includes(name),
        stationary: position.stationary === true,
        speed: typeof position.speed === 'number' ? position.speed : undefined,
        house: typeof position.house === 'number' ? position.house : undefined,
      });
    });

    // Secondary bodies (NorthNode, SouthNode, Lilith, PartOfFortune, Vertex)
    if (data.secondary) {
      Object.entries(data.secondary).forEach(([name, info]) => {
        const position = info as PlanetaryPosition & { stationary?: boolean; speed?: number };
        allPoints.push({
          name,
          degree: position.degree,
          sign: position.sign || '',
          retrograde: position.retrograde === true,
          stationary: position.stationary === true,
          speed: typeof position.speed === 'number' ? position.speed : undefined,
          house: typeof position.house === 'number' ? position.house : undefined,
        });
      });
    }

    // Angles (ASC, MC, DSC, IC) - DSC and IC calculated
    const chartAngles = (data as CertifiedAstrologyResult & { angles?: Record<string, number> }).angles;
    if (chartAngles) {
      Object.entries(chartAngles).forEach(([name, deg]) => {
        if (!data.planets[name]) { // Don't duplicate ASC/MC if already in planets
          const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                         'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
          const idx = Math.floor((deg % 360) / 30);
          const pos = deg % 30;
          allPoints.push({
            name,
            degree: deg,
            sign: `${signs[idx]} ${pos.toFixed(0)}°`,
            retrograde: false,
            isAngle: true,
          });
        }
      });
    }

    return allPoints;
  }, [data]);

  const chartHouses = useMemo(() => {
    if (!data?.houses) return [];
    return (data.houses as ChartHouseCusp[]).map((house, i) => ({
      house: i + 1,
      degree: house.degree || 0,
      sign: house.sign,
    }));
  }, [data]);

  const chartAspects = useMemo(() => {
    return data?.aspects || [];
  }, [data]);

  const sharedMapTargets = mapSubjects?.filter((map) => map.ownerProfileId === activeProfile?.id) || [];
  const allTargets = sharedMapTargets.map((map) => ({
    id: map.id,
    name: map.kind === 'profile' ? map.name : `Natal: ${map.name}`,
    icon: map.kind === 'profile' ? <User size={14} /> : <Users size={14} />,
  }));

  const activeTargetLabel = allTargets.find(t => t.id === selectedTarget)?.name || 'Mapa selecionado';

  const openHermesForCurrentMap = () => {
    window.dispatchEvent(new Event('open-hermes-chat'));
  };

  const openCadernoForCurrentMap = () => {
    const auditReceipt = data?.meta?.receipt;
    const meta = data?.meta as (CertifiedAstrologyResult['meta'] & { timestamp?: string; location?: { lat?: number; lon?: number } }) | undefined;
    const receipt = meta
      ? `Cálculo astronômico recebido\n• UTC: ${auditReceipt?.resolved_time?.utc || meta.timestamp || 'não informado'}\n• Fuso IANA: ${auditReceipt?.resolved_time?.iana_timezone || 'não informado'}\n• Local: ${meta.location?.lat ?? '—'}, ${meta.location?.lon ?? '—'}\n• Motor: ${auditReceipt?.engine?.name || 'não informado'} ${auditReceipt?.engine?.version || ''}\n• Hash da entrada: ${auditReceipt?.input_hash || 'não informado'}`
      : 'Cálculo astronômico indisponível — não registrar interpretação como fato.';
    window.dispatchEvent(new CustomEvent('open-caderno-vivo', {
      detail: {
        type: 'create-study',
        topic: activeTargetLabel,
        seedNote: `Origem: ${activeTargetLabel}\n\n${receipt}\n\nRegra interpretativa: a selecionar\nFonte: a selecionar\nInferência Hermes: a solicitar\n\nMinha anotação:`,
      },
    }));
  };

  const editingConnection = editingConnectionId
    ? activeProfile.connections?.find((connection) => connection.id === editingConnectionId)
    : undefined;

  return (
    <div className="flex h-full min-w-0 overflow-hidden w-full">
      <div ref={containerRef} className="flex flex-1 min-w-0 flex-col h-full items-center justify-start gap-6 p-4 md:p-8 overflow-y-auto no-scrollbar transition-all duration-500">
        <div className="aurea-page-header mandala-header w-full gap-5 p-5 rounded-2xl shadow-sm transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--aurea-surface-warm)] rounded-2xl border border-[rgba(217,166,83,0.18)] text-[var(--aurea-gold)]">
            {allTargets.find((target) => target.id === selectedTarget)?.icon || <User size={24} />}
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.22em] text-[var(--aurea-text)] leading-tight">Mandala Astrológica</h1>
            <p className="text-[11px] font-bold text-[var(--aurea-gold-deep)] uppercase tracking-widest mt-1">
              {allTargets.find(t => t.id === selectedTarget)?.name}
            </p>
          </div>
        </div>

        <div className="mandala-actionbar" aria-label="Ações do mapa">
          <button
            onClick={() => {
              setEditingConnectionId(null);
              setShowForm(true);
            }}
            className="mandala-action aurea-button-primary"
            title="Adicionar Novo Mapa"
          >
            <Plus size={16} />
            <span>Adicionar mapa</span>
          </button>

          <label className="mandala-map-select">
            <span>Mapa em foco</span>
            <select
              value={selectedTarget}
              onChange={(e) => setActiveSubjectId(e.target.value)}
              className="w-full"
              aria-label="Mapa em foco"
            >
              {allTargets.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>

          {selectedTarget && selectedTarget !== activeProfile?.id && (
            <button
              onClick={() => {
                setEditingConnectionId(selectedTarget);
                setShowForm(true);
              }}
              className="mandala-action"
              aria-label="Editar dados do mapa"
              title="Editar Dados do Mapa"
            >
              <Edit3 size={16} />
            </button>
          )}

          <button
            onClick={openCadernoForCurrentMap}
            className="mandala-action"
            title="Criar estudo no Caderno Vivo a partir deste mapa"
          >
            <FileText size={16} />
            <span>Estudar no Caderno</span>
          </button>

          <button
            onClick={openHermesForCurrentMap}
            className="mandala-action"
            title="Abrir Hermes com este mapa em foco"
          >
            <MessageSquare size={16} />
            <span>Tutor IA</span>
          </button>

          <button
            onClick={recalculate}
            disabled={loading || !birthData}
            aria-label={loading ? 'Calculando mapa' : birthData ? 'Atualizar cálculo do mapa' : 'Complete os dados de nascimento para calcular'}
            className="mandala-action"
            title={birthData ? 'Atualizar cálculo' : 'Data, hora, coordenadas e fuso são obrigatórios'}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Calculando' : 'Atualizar cálculo'}</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-3xl">
        <CalculationEvidence meta={data?.meta} loading={loading} error={error} />
      </div>

      {error && (
        <div className="text-[11px] text-red-500 bg-red-50 border border-red-100 rounded-xl px-6 py-4 font-medium max-w-md text-center animate-in shake duration-500">
           ⚠️ {error}
          <br />
            <span className="text-[10px] text-red-400">Confira o serviço local e os dados declarados no recibo.</span>
        </div>
      )}

       {!birthData && !loading && (
        <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-[11px] font-medium text-amber-900">
           Este mapa não foi calculado: faltam dados de nascimento confirmados. Informe data, hora, local, coordenadas e fuso IANA antes de gerar uma mandala.
        </div>
      )}

      {loading && !data && (
        <div className="h-[580px] flex flex-col items-center justify-center gap-4">
           <div className="w-12 h-12 border-4 border-[rgba(217,166,83,0.18)] border-t-gold rounded-full animate-spin" />
          <div className="text-[10px] text-[#596a76] font-bold uppercase tracking-[0.2em] animate-pulse">
            Sintonizando Esferas Celestes...
          </div>
        </div>
      )}

       {chartPlanets.length > 0 && birthData ? (
        <div className="mandala-chart-shell animate-in zoom-in-95 duration-700 sm:p-5 relative transition-all">
          <MandalaChart
            size={chartSize}
            planets={chartPlanets}
            houses={chartHouses}
            aspects={chartAspects}
            showPanel={showDetails}
            calculationCertified={Boolean(readCertifiedCalculation(data, 'natal'))}
          />
        </div>
      ) : !loading && !error ? (
        <div className="text-[11px] text-[#596a76] font-medium">
           Nenhum dado astrológico disponível para este mapa.
        </div>
      ) : null}

      {showForm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in zoom-in-95">
           <BirthForm
             title={editingConnectionId ? "Editar Mapa" : "Adicionar Mapa"}
             initialData={editingConnection?.birthData ? {
               name: editingConnection.name,
               date: editingConnection.birthData.date ?? editingConnection.birthDate ?? '',
               time: editingConnection.birthData.time ?? editingConnection.birthTime ?? '',
               location: editingConnection.birthData.location ?? editingConnection.birthCity ?? '',
               lat: editingConnection.birthData.lat,
               lng: editingConnection.birthData.lng,
               timezone: editingConnection.birthData.timezone ?? editingConnection.birthTimezone,
             } : undefined}
             onSave={handleSaveConnection}
             onClose={() => {
               setShowForm(false);
               setEditingConnectionId(null);
             }}
           />
        </div>
      )}
      </div>

    </div>
  );
};