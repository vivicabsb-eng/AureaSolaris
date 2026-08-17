import React, { useState } from 'react';
import { Clock, MapPin, Calendar, Save, UserPlus, X } from 'lucide-react';

interface BirthFormProps {
  onSave: (data: {
    name: string;
    date: string;
    time: string;
    location: string;
    lat: number;
    lng: number;
    timezone: string;
  }) => void;
  onClose: () => void;
  initialData?: {
    name: string;
    date: string;
    time: string;
    location: string;
    lat?: number;
    lng?: number;
    timezone?: string;
  };
  title?: string;
}

const BRAZILIAN_CITIES = [
  { name: 'Belo Horizonte, MG', lat: -19.9167, lon: -43.9345, timezone: 'America/Sao_Paulo' },
  { name: 'Brasília, DF', lat: -15.7975, lon: -47.8919, timezone: 'America/Sao_Paulo' },
  { name: 'Curitiba, PR', lat: -25.4284, lon: -49.2733, timezone: 'America/Sao_Paulo' },
  { name: 'Fortaleza, CE', lat: -3.7172, lon: -38.5433, timezone: 'America/Fortaleza' },
  { name: 'Manaus, AM', lat: -3.1190, lon: -60.0217, timezone: 'America/Manaus' },
  { name: 'Porto Alegre, RS', lat: -30.0346, lon: -51.2177, timezone: 'America/Sao_Paulo' },
  { name: 'Recife, PE', lat: -8.0476, lon: -34.8770, timezone: 'America/Recife' },
  { name: 'Rio de Janeiro, RJ', lat: -22.9068, lon: -43.1729, timezone: 'America/Sao_Paulo' },
  { name: 'Salvador, BA', lat: -12.9714, lon: -38.5124, timezone: 'America/Bahia' },
  { name: 'São Paulo, SP', lat: -23.5505, lon: -46.6333, timezone: 'America/Sao_Paulo' },
];

const formatDateForDisplay = (value?: string) => {
  if (!value) return '';
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return isoMatch ? `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}` : value;
};

const parseDateForStorage = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  )
    return null;

  return `${yearText}-${monthText}-${dayText}`;
};

const isCoordinate = (value: string, minimum: number, maximum: number) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum;
};

const isIanaTimezone = (value: string) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value.trim() });
    return value === 'UTC' || value.includes('/');
  } catch {
    return false;
  }
};

export const BirthForm = ({ onSave, onClose, initialData, title }: BirthFormProps) => {
  const [name, setName] = useState(initialData?.name || '');
  const [dateInput, setDateInput] = useState(formatDateForDisplay(initialData?.date));
  const [time, setTime] = useState(initialData?.time || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [lat, setLat] = useState(initialData?.lat?.toString() || '');
  const [lng, setLng] = useState(initialData?.lng?.toString() || '');
  const [timezone, setTimezone] = useState(initialData?.timezone || '');
  const [formError, setFormError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const date = parseDateForStorage(dateInput);

    if (!date) {
      setFormError('Informe a data como DD/MM/AAAA.');
      return;
    }
    if (!time) {
      setFormError('Informe a hora de nascimento.');
      return;
    }
    if (!location.trim()) {
      setFormError('Informe o local de nascimento.');
      return;
    }
    if (!isCoordinate(lat, -90, 90) || !isCoordinate(lng, -180, 180)) {
      setFormError('Informe latitude (-90 a 90) e longitude (-180 a 180) verificáveis.');
      return;
    }
    if (!isIanaTimezone(timezone)) {
      setFormError('Informe um fuso IANA válido, por exemplo America/Sao_Paulo.');
      return;
    }

    setFormError('');
    onSave({
      name: name.trim(),
      date,
      time,
      location: location.trim(),
      lat: Number(lat.replace(',', '.')),
      lng: Number(lng.replace(',', '.')),
      timezone: timezone.trim(),
    });
  };

  const inputClass = 'w-full bg-gray-50/50 p-4 rounded-2xl border border-gray-100 font-bold text-gray-800 outline-none transition-all placeholder:text-gray-300 focus:border-gold/50 focus:ring-2 focus:ring-gold/15';

  return (
    <div className="bg-white rounded-2xl p-10 w-full max-w-xl shadow-2xl border border-gold/10 font-sans relative overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="birth-form-title">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold/5 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center text-gold shadow-sm">
              {initialData ? <Save size={24} /> : <UserPlus size={24} />}
            </div>
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gold">Aurea Solaris</h2>
              <h3 id="birth-form-title" className="text-xl font-black text-gray-800 tracking-tight">{title || (initialData ? 'Editar Perfil' : 'Novo Perfil de Nascimento')}</h3>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar formulário" title="Fechar" className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="space-y-2">
            <label htmlFor="birth-name" className="text-[10px] font-black uppercase text-gray-400 pl-4 tracking-widest">Nome</label>
            <input id="birth-name" required className={inputClass} placeholder="Ex.: Gabriel Solaris" value={name} onChange={event => setName(event.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="birth-date" className="text-[10px] font-black uppercase text-gray-400 pl-4 tracking-widest">Data de nascimento</label>
              <div className="relative">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-gold/40 pointer-events-none" size={18} />
                <input id="birth-date" type="text" inputMode="numeric" autoComplete="bday" maxLength={10} required placeholder="DD/MM/AAAA" className={`${inputClass} pl-12`} value={dateInput} aria-invalid={Boolean(dateInput.trim() && !parseDateForStorage(dateInput))} onChange={event => { setDateInput(event.target.value); setFormError(''); }} onBlur={() => { if (dateInput.trim() && !parseDateForStorage(dateInput)) setFormError('Informe a data como DD/MM/AAAA. O conteúdo digitado não foi alterado.'); }} />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="birth-time" className="text-[10px] font-black uppercase text-gray-400 pl-4 tracking-widest">Hora exata</label>
              <div className="relative">
                <Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-gold/40 pointer-events-none" size={18} />
                <input id="birth-time" type="time" required className={`${inputClass} pl-12`} value={time} onChange={event => { setTime(event.target.value); setFormError(''); }} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="birth-location" className="text-[10px] font-black uppercase text-gray-400 pl-4 tracking-widest">Cidade ou local</label>
            <div className="relative">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gold/40 pointer-events-none" size={18} />
              <select
                id="birth-location"
                required
                className={`${inputClass} pl-12 cursor-pointer`}
                value={location}
                onChange={event => {
                  const selected = event.target.value;
                  setLocation(selected);
                  setFormError('');
                  const city = BRAZILIAN_CITIES.find(c => c.name === selected);
                  if (city) {
                    setLat(String(city.lat));
                    setLng(String(city.lon));
                    setTimezone(city.timezone);
                  }
                }}
              >
                <option value="">Selecione a cidade...</option>
                {BRAZILIAN_CITIES.map(city => (
                  <option key={city.name} value={city.name}>{city.name}</option>
                ))}
              </select>
            </div>
          </div>

          {formError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{formError}</p>}

          <div className="pt-2 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-gray-500 font-black uppercase text-[10px] tracking-[0.3em] hover:text-gray-800 hover:bg-gray-50 transition-colors border border-gray-100 rounded-2xl">Cancelar</button>
            <button type="submit" className="flex-1 py-4 bg-[#333333] text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-gold active:scale-[0.99] transition-all shadow-lg flex items-center justify-center gap-3 px-6"><Save size={16} /> Salvar dados</button>
          </div>
        </form>

        <p className="mt-7 text-[10px] font-bold text-gray-400 uppercase tracking-widest italic text-center">O cálculo só será iniciado quando os dados estiverem completos.</p>
      </div>
    </div>
  );
};
