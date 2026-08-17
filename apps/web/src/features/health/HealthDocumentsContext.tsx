import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { createBrowserHealthDocumentsStorage, type HealthDocumentsStorage } from './healthDocumentsStorage';
import type { AureaDocument } from './types';

interface HealthDocumentsContextValue {
  documents: AureaDocument[];
  addDocument: (document: Omit<AureaDocument, 'id' | 'date'>) => void;
  refreshFromStorage: () => void;
}

const HealthDocumentsContext = createContext<HealthDocumentsContextValue | undefined>(undefined);

export function sanitizeHealthDocuments(documents: AureaDocument[]): AureaDocument[] {
  const generatedIds = new Set(['d1', 'd2']);
  return documents.filter((document) => !(generatedIds.has(document.id) && document.path === '#'));
}

export function HealthDocumentsProvider({
  children,
  storage,
  now = () => new Date(),
}: {
  children: ReactNode;
  storage?: HealthDocumentsStorage;
  now?: () => Date;
}) {
  const [resolvedStorage] = useState<HealthDocumentsStorage>(() => storage ?? createBrowserHealthDocumentsStorage());
  const [documents, setDocuments] = useState<AureaDocument[]>(() => {
    const loaded = resolvedStorage.loadDocuments();
    const sanitized = sanitizeHealthDocuments(loaded);
    if (loaded.length > 0) resolvedStorage.saveDocuments(sanitized);
    return sanitized;
  });
  const documentsRef = useRef(documents);

  const refreshFromStorage = () => {
    const loaded = resolvedStorage.loadDocuments();
    const sanitized = sanitizeHealthDocuments(loaded);
    if (loaded.length > 0) resolvedStorage.saveDocuments(sanitized);
    documentsRef.current = sanitized;
    setDocuments(sanitized);
  };

  const addDocument = (document: Omit<AureaDocument, 'id' | 'date'>) => {
    const timestamp = now();
    const newDocument: AureaDocument = {
      ...document,
      id: `doc_${timestamp.getTime()}`,
      date: timestamp.toISOString().split('T')[0],
    };
    const updated = [newDocument, ...documentsRef.current];
    documentsRef.current = updated;
    setDocuments(updated);
    resolvedStorage.saveDocuments(updated);
  };

  return (
    <HealthDocumentsContext.Provider value={{ documents, addDocument, refreshFromStorage }}>
      {children}
    </HealthDocumentsContext.Provider>
  );
}

export function useHealthDocuments(): HealthDocumentsContextValue {
  const context = useContext(HealthDocumentsContext);
  if (context === undefined) throw new Error('useHealthDocuments must be used within a HealthDocumentsProvider');
  return context;
}
