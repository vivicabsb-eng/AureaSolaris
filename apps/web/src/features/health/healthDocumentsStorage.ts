import type { AureaDocument } from './types';

export interface HealthDocumentsStorage {
  loadDocuments: () => AureaDocument[];
  saveDocuments: (documents: AureaDocument[]) => void;
}

export function createBrowserHealthDocumentsStorage(storage: Storage = localStorage): HealthDocumentsStorage {
  return {
    loadDocuments: () => {
      const saved = storage.getItem('aurea_documents');
      return saved ? JSON.parse(saved) as AureaDocument[] : [];
    },
    saveDocuments: (documents) => storage.setItem('aurea_documents', JSON.stringify(documents)),
  };
}
