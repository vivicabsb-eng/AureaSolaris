import { safeInvoke } from '../utils/tauri';
import type {
  DiaryEntry,
  DiaryEntryResponse,
  DiaryFolder,
  DiaryFolderResponse,
  DiaryStatus,
} from '../types/diario';

export interface DiaryCreateFolderInput {
  name: string;
  icon: string;
}

export interface DiaryCreateEntryInput {
  title: string;
  folderId: string;
  status?: DiaryStatus;
}

export interface DiaryUpdateEntryInput {
  id: string;
  title?: string;
  content?: string;
  folderId?: string;
  status?: DiaryStatus;
}

export function mapDiaryEntry(dto: DiaryEntryResponse): DiaryEntry {
  return {
    id: dto.id,
    title: dto.title || 'Nota sem título',
    content: dto.content || '',
    folderId: dto.folder_id,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    wordCount: dto.word_count,
    status: dto.status || 'idea',
    folderName: dto.folder_name,
  };
}

export function mapDiaryFolder(dto: DiaryFolderResponse): DiaryFolder {
  return {
    id: dto.id,
    name: dto.name,
    icon: dto.icon || '📁',
    order: dto.order ?? 0,
    createdAt: dto.created_at,
  };
}

export function listDiaryFolders(): Promise<DiaryFolder[] | null> {
  return safeInvoke<DiaryFolderResponse[]>('diary_list_folders').then((result) =>
    result === null ? null : result.map(mapDiaryFolder),
  );
}

export function createDiaryFolder(
  request: DiaryCreateFolderInput,
): Promise<DiaryFolder | null> {
  return safeInvoke<DiaryFolderResponse>('diary_create_folder', {
    name: request.name,
    icon: request.icon,
  }).then((result) => (result === null ? null : mapDiaryFolder(result)));
}

export function deleteDiaryFolder(id: string): Promise<boolean | void | null> {
  return safeInvoke<boolean | void>('diary_delete_folder', { id });
}

export function listDiaryEntries(folderId?: string): Promise<DiaryEntry[] | null> {
  return (
    folderId === undefined
      ? safeInvoke<DiaryEntryResponse[]>('diary_list_entries')
      : safeInvoke<DiaryEntryResponse[]>('diary_list_entries', { folder_id: folderId })
  ).then((result) => (result === null ? null : result.map(mapDiaryEntry)));
}

export function getDiaryEntry(id: string): Promise<DiaryEntry | null> {
  return safeInvoke<DiaryEntryResponse>('diary_get_entry', { id }).then((result) =>
    result === null ? null : mapDiaryEntry(result),
  );
}

export function createDiaryEntry(
  request: DiaryCreateEntryInput,
): Promise<DiaryEntry | null> {
  return safeInvoke<DiaryEntryResponse>('diary_create_entry', {
    title: request.title,
    folder_id: request.folderId,
    status: request.status,
  }).then((result) => (result === null ? null : mapDiaryEntry(result)));
}

export function updateDiaryEntry(
  request: DiaryUpdateEntryInput,
): Promise<DiaryEntry | null> {
  const payload: Record<string, string | DiaryStatus> = { id: request.id };
  if (request.title !== undefined) payload.title = request.title;
  if (request.content !== undefined) payload.content = request.content;
  if (request.folderId !== undefined) payload.folder_id = request.folderId;
  if (request.status !== undefined) payload.status = request.status;

  return safeInvoke<DiaryEntryResponse>('diary_update_entry', payload).then((result) =>
    result === null ? null : mapDiaryEntry(result),
  );
}

export function deleteDiaryEntry(id: string): Promise<boolean | void | null> {
  return safeInvoke<boolean | void>('diary_delete_entry', { id });
}
