import React, { useState, useMemo } from 'react';
import { useDiario } from '../../context/DiarioContext';
import { Folder, FolderOpen, Plus, Search, FileText, Trash2, Edit3, Check } from 'lucide-react';

export const DiarioSidebar: React.FC = () => {
  const {
    folders,
    entries,
    selectedFolderId,
    activeEntryId,
    selectFolder,
    selectEntry,
    createEntry,
    createFolder,
    deleteFolder,
    deleteEntry,
  } = useDiario();

  const [search, setSearch] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      e => e.title.toLowerCase().includes(q) || (e.content && e.content.toLowerCase().includes(q)),
    );
  }, [entries, search]);

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  return (
    <div
      className="flex flex-col h-full w-64 shrink-0 overflow-hidden"
      style={{ backgroundColor: '#F8F8F7', borderRight: '1px solid #EBEBEB' }}
    >
      {/* Search bar */}
      <div className="px-4 pt-5 pb-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: '#A0A0A0' }}
          />
          <input
            type="text"
            placeholder="Buscar notas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg focus:outline-none transition-all"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#333333',
              border: '1px solid #E0E0E0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          />
        </div>
      </div>

      {/* Folders section */}
      <div className="px-3 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between px-2 mb-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Pastas
          </h3>
          <button
            onClick={() => setIsAddingFolder(true)}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="space-y-0.5">
          {folders.map(folder => (
            <div
              key={folder.id}
              className="group relative"
            >
              <button
                type="button"
                onClick={() => selectFolder(folder.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-all text-left"
              style={{
                color: selectedFolderId === folder.id ? 'var(--aurea-text)' : 'var(--aurea-text-muted)',
                backgroundColor: selectedFolderId === folder.id ? 'var(--aurea-gold-soft)' : 'transparent',
                fontWeight: selectedFolderId === folder.id ? 600 : 500,
              }}
            >
              {selectedFolderId === folder.id ? (
                <FolderOpen size={14} className="text-gray-700" />
              ) : (
                <Folder size={14} className="text-gray-400" />
              )}
              <span className="flex-1 truncate">{folder.name}</span>
              </button>
              {folder.id !== 'general' && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    if (window.confirm(`Apagar pasta "${folder.name}"?`)) {
                      deleteFolder(folder.id);
                    }
                  }}
                  aria-label={`Excluir pasta ${folder.name}`}
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white transition-all"
                  style={{ color: 'var(--aurea-text-subtle)' }}
                  title="Excluir pasta"
                >
                  <Trash2 size={11} className="hover:text-red-500" />
                </button>
              )}
            </div>
          ))}

          {isAddingFolder && (
            <div className="flex items-center gap-2 px-2 py-1.5 mt-1 bg-white rounded-lg border border-gray-200">
              <Folder size={14} className="text-gray-400" />
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') setIsAddingFolder(false);
                }}
                className="flex-1 text-xs outline-none bg-transparent"
                placeholder="Nome da pasta"
              />
              <button onClick={handleCreateFolder} className="text-gray-400 hover:text-green-600">
                <Check size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-2 px-3">
        <div className="flex items-center justify-between px-2 mb-2 mt-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {selectedFolder?.name || 'Notas'}
          </h3>
          <button
            onClick={createEntry}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Edit3 size={12} />
          </button>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-10 px-4 space-y-3">
            <p className="text-xs text-gray-400">Nenhuma nota encontrada.</p>
            <button
              onClick={createEntry}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-[11px] font-bold text-gray-400 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <Edit3 size={12} />
              Criar Primeira Nota
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredEntries.map(entry => (
              <div
                key={entry.id}
                className="group relative"
              >
                <button
                  type="button"
                  onClick={() => selectEntry(entry.id)}
                  className="w-full text-left p-2.5 rounded-lg transition-all"
                style={{
                  backgroundColor: activeEntryId === entry.id ? 'var(--aurea-surface)' : 'transparent',
                  border: activeEntryId === entry.id ? '1px solid var(--aurea-line)' : '1px solid transparent',
                  boxShadow: activeEntryId === entry.id ? '0 1px 3px rgba(0,0,0,0.02)' : 'none',
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText
                      size={13}
                      className="shrink-0 mt-0.5"
                      style={{ color: activeEntryId === entry.id ? '#1A1A1A' : '#A0A0A0' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[11px] font-semibold truncate leading-tight mb-0.5"
                        style={{ color: activeEntryId === entry.id ? '#1A1A1A' : '#555555' }}
                      >
                        {entry.title || 'Sem título'}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {entry.content ? entry.content.substring(0, 40) : '...'}
                      </p>
                    </div>
                  </div>
                </div>
                </button>
                {activeEntryId !== entry.id && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        if (window.confirm('Excluir esta nota?')) deleteEntry(entry.id);
                      }}
                      aria-label={`Excluir nota ${entry.title || 'sem título'}`}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                    >
                      <Trash2 size={11} />
                    </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
