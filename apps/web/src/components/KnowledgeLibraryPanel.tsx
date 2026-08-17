import React, { useState } from 'react';
import { searchKnowledge, type KnowledgeSearchResponse } from '../services/chat';

type KnowledgeType = 'concept' | 'claim' | 'source';

interface KnowledgeLibraryPanelProps {
  title?: string;
  description?: string;
  placeholder?: string;
  compact?: boolean;
}

const TYPE_OPTIONS: Array<{ value: KnowledgeType; label: string }> = [
  { value: 'concept', label: 'Conceitos' },
  { value: 'claim', label: 'Afirmações' },
  { value: 'source', label: 'Fontes' },
];

function summarizeResults(results: KnowledgeSearchResponse): string {
  const parts = [
    results.concepts.length ? `${results.concepts.length} conceito(s)` : '',
    results.claims.length ? `${results.claims.length} afirmação(ões)` : '',
    results.sources.length ? `${results.sources.length} fonte(s)` : '',
  ].filter(Boolean);

  return parts.length ? parts.join(' · ') : 'Nenhum resultado encontrado.';
}

export const KnowledgeLibraryPanel: React.FC<KnowledgeLibraryPanelProps> = ({
  title = 'Biblioteca astrológica',
  description = 'Pesquise conceitos, afirmações e fontes do acervo editorial instalado no Aurea.',
  placeholder = 'Ex.: planeta feral, direções primárias, Regulus, Morin...',
  compact = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTypes, setSearchTypes] = useState<KnowledgeType[]>(['concept', 'claim', 'source']);
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleKnowledgeSearch = async () => {
    const query = searchTerm.trim();
    if (!query) {
      setSearchError('Escreva algum termo para buscar na biblioteca.');
      setSearchResults(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults(null);

    try {
      const response = await searchKnowledge({
        query,
        limit: compact ? 20 : 30,
        types: searchTypes.length ? searchTypes : undefined,
      });
      setSearchResults(response);
      if (!response.concepts.length && !response.claims.length && !response.sources.length) {
        setSearchError('Nenhum resultado encontrado para esta busca.');
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Falha ao buscar na biblioteca.');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <section className="rounded-3xl border border-white/10 bg-[var(--aurea-surface)] p-6 shadow-sm">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-[var(--aurea-text-muted)]">{description}</p>

        <div className="mt-4 space-y-4">
          <label className="block text-sm font-semibold text-[var(--aurea-text)]">Termo de busca</label>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleKnowledgeSearch();
            }}
            className="w-full rounded-2xl border border-white/10 bg-[var(--aurea-surface)] px-4 py-3 text-sm text-[var(--aurea-text)] outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            placeholder={placeholder}
          />

          <div className="grid gap-2 sm:grid-cols-3">
            {TYPE_OPTIONS.map((type) => (
              <label
                key={type.value}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-[var(--aurea-navy)]/10 px-3 py-2 text-sm text-[var(--aurea-text)]"
              >
                <input
                  type="checkbox"
                  checked={searchTypes.includes(type.value)}
                  onChange={() => {
                    setSearchTypes((current) =>
                      current.includes(type.value)
                        ? current.filter((item) => item !== type.value)
                        : [...current, type.value],
                    );
                  }}
                  className="h-4 w-4 rounded"
                />
                {type.label}
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleKnowledgeSearch()}
              disabled={searchLoading}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--aurea-gold)] px-4 py-3 text-sm font-semibold text-[var(--aurea-navy)] transition hover:bg-[#e0b858] disabled:opacity-60"
            >
              {searchLoading ? 'Buscando...' : 'Buscar na biblioteca'}
            </button>
            {searchResults && !searchLoading && (
              <span className="text-xs text-[var(--aurea-text-muted)]">{summarizeResults(searchResults)}</span>
            )}
          </div>

          {searchError && <p className="mt-2 text-sm text-red-600">{searchError}</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[var(--aurea-surface)] p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Resultados</h3>
        {searchLoading ? (
          <p className="mt-3 text-sm text-[var(--aurea-text-muted)]">Buscando...</p>
        ) : searchResults ? (
          <div className="mt-4 space-y-4">
            {searchResults.concepts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--aurea-text)]">Conceitos</h4>
                <ul className="mt-2 space-y-3">
                  {searchResults.concepts.map((item) => (
                    <li key={item.id} className="rounded-2xl border border-white/10 bg-[var(--aurea-navy)]/5 p-3 text-sm">
                      <div className="font-semibold text-[var(--aurea-text)]">{item.label}</div>
                      <div className="mt-1 text-xs text-[var(--aurea-text-muted)]">
                        {item.concept_type} · {item.status}
                      </div>
                      <p className="mt-2 text-sm text-[var(--aurea-text)]">
                        {item.description || 'Sem descrição disponível.'}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {searchResults.claims.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--aurea-text)]">Afirmações</h4>
                <ul className="mt-2 space-y-3">
                  {searchResults.claims.map((item) => (
                    <li key={item.id} className="rounded-2xl border border-white/10 bg-[var(--aurea-navy)]/5 p-3 text-sm">
                      <div className="font-semibold text-[var(--aurea-text)]">{item.statement}</div>
                      <div className="mt-1 text-xs text-[var(--aurea-text-muted)]">
                        {item.tradition || 'Tradição não declarada'} · {item.source_title || 'Fonte sem título'}
                      </div>
                      {item.source_locator && (
                        <p className="mt-2 text-xs text-[var(--aurea-text-muted)]">{item.source_locator}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {searchResults.sources.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[var(--aurea-text)]">Fontes</h4>
                <ul className="mt-2 space-y-3">
                  {searchResults.sources.map((item) => (
                    <li key={item.id} className="rounded-2xl border border-white/10 bg-[var(--aurea-navy)]/5 p-3 text-sm">
                      <div className="font-semibold text-[var(--aurea-text)]">{item.title}</div>
                      <div className="mt-1 text-xs text-[var(--aurea-text-muted)]">
                        {item.author || 'Autor desconhecido'} · {item.published_year || 'Ano desconhecido'}
                      </div>
                      <p className="mt-2 text-sm text-[var(--aurea-text)]">
                        {item.tradition || 'Tradição não especificada'}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--aurea-text-muted)]">
            Use o formulário ao lado para pesquisar o acervo editorial.
          </p>
        )}
      </section>
    </div>
  );
};
