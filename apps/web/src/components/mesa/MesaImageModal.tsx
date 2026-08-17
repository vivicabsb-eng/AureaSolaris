import { X } from 'lucide-react';

interface MesaImageModalProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onInsert: (url: string) => void;
}

export function MesaImageModal({ open, value, onChange, onClose, onInsert }: MesaImageModalProps) {
  if (!open) return null;

  const insert = () => {
    const url = value.trim();
    if (!url) return;
    onInsert(url);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-[440px] shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Inserir imagem</h3>
            <p className="text-xs text-gray-500 mt-0.5">Cole a URL de uma imagem (PNG, JPG, WebP, GIF)</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-300 hover:text-gray-600 rounded-lg transition-all">
            <X size={16} />
          </button>
        </div>
        <input
          autoFocus
          type="url"
          placeholder="https://exemplo.com/imagem.jpg"
          value={value}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') insert();
          }}
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all mb-4"
          style={{ border: '1px solid #E0E0E0', background: '#FAFAFA' }}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-all rounded-lg hover:bg-gray-100">
            Cancelar
          </button>
          <button
            onClick={insert}
            disabled={!value.trim()}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-30 transition-all"
            style={{ background: '#1A1A1A' }}
          >
            Inserir
          </button>
        </div>
      </div>
    </div>
  );
}
