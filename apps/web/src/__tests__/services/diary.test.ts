import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDiaryEntry,
  createDiaryFolder,
  deleteDiaryEntry,
  deleteDiaryFolder,
  getDiaryEntry,
  listDiaryEntries,
  listDiaryFolders,
  mapDiaryEntry,
  mapDiaryFolder,
  updateDiaryEntry,
} from '../../services/diary';
import type { DiaryEntryResponse, DiaryFolderResponse } from '../../types/diario';

const { safeInvokeMock } = vi.hoisted(() => ({
  safeInvokeMock: vi.fn(),
}));

vi.mock('../../utils/tauri', () => ({ safeInvoke: safeInvokeMock }));

const folder: DiaryFolderResponse = {
  id: 'folder-1',
  name: 'Estudos',
  icon: '📁',
  order: 1,
  created_at: '2026-08-12T10:00:00Z',
};

const entry: DiaryEntryResponse = {
  id: 'entry-1',
  title: 'Nota',
  content: 'Conteúdo',
  folder_id: 'folder-1',
  created_at: '2026-08-12T10:00:00Z',
  updated_at: '2026-08-12T10:05:00Z',
  word_count: 1,
  status: 'draft',
  folder_name: 'Estudos',
};

describe('diary service', () => {
  beforeEach(() => {
    safeInvokeMock.mockReset();
  });

  it('maps folder and entry DTO fields to frontend objects', () => {
    expect(mapDiaryFolder(folder)).toEqual({
      id: 'folder-1',
      name: 'Estudos',
      icon: '📁',
      order: 1,
      createdAt: '2026-08-12T10:00:00Z',
    });
    expect(mapDiaryEntry(entry)).toEqual({
      id: 'entry-1',
      title: 'Nota',
      content: 'Conteúdo',
      folderId: 'folder-1',
      createdAt: '2026-08-12T10:00:00Z',
      updatedAt: '2026-08-12T10:05:00Z',
      wordCount: 1,
      status: 'draft',
      folderName: 'Estudos',
    });
  });

  it('lists folders with the typed response', async () => {
    safeInvokeMock.mockResolvedValueOnce([folder]);

    await expect(listDiaryFolders()).resolves.toEqual([
      {
        id: 'folder-1',
        name: 'Estudos',
        icon: '📁',
        order: 1,
        createdAt: '2026-08-12T10:00:00Z',
      },
    ]);
    expect(safeInvokeMock).toHaveBeenCalledWith('diary_list_folders');
  });

  it('creates a folder with the IPC payload', async () => {
    safeInvokeMock.mockResolvedValueOnce(folder);

    await expect(createDiaryFolder({ name: 'Estudos', icon: '📁' })).resolves.toEqual({
      id: 'folder-1',
      name: 'Estudos',
      icon: '📁',
      order: 1,
      createdAt: '2026-08-12T10:00:00Z',
    });
    expect(safeInvokeMock).toHaveBeenCalledWith('diary_create_folder', { name: 'Estudos', icon: '📁' });
  });

  it('deletes a folder with its id', async () => {
    safeInvokeMock.mockResolvedValueOnce(true);

    await expect(deleteDiaryFolder('folder-1')).resolves.toBe(true);
    expect(safeInvokeMock).toHaveBeenCalledWith('diary_delete_folder', { id: 'folder-1' });
  });

  it('lists all entries without adding a filter payload', async () => {
    safeInvokeMock.mockResolvedValueOnce([entry]);

    await expect(listDiaryEntries()).resolves.toEqual([expect.objectContaining({ id: 'entry-1', folderName: 'Estudos' })]);
    expect(safeInvokeMock).toHaveBeenCalledWith('diary_list_entries');
  });

  it('lists entries with the folder_id payload', async () => {
    safeInvokeMock.mockResolvedValueOnce([entry]);

    await expect(listDiaryEntries('folder-1')).resolves.toEqual([expect.objectContaining({ folderId: 'folder-1' })]);
    expect(safeInvokeMock).toHaveBeenCalledWith('diary_list_entries', { folder_id: 'folder-1' });
  });

  it('gets an entry by id', async () => {
    safeInvokeMock.mockResolvedValueOnce(entry);

    await expect(getDiaryEntry('entry-1')).resolves.toEqual(expect.objectContaining({ id: 'entry-1' }));
    expect(safeInvokeMock).toHaveBeenCalledWith('diary_get_entry', { id: 'entry-1' });
  });

  it('creates an entry with the IPC payload', async () => {
    safeInvokeMock.mockResolvedValueOnce(entry);

    await expect(
      createDiaryEntry({ title: 'Nota', folderId: 'folder-1', status: 'draft' }),
    ).resolves.toEqual(expect.objectContaining({ status: 'draft' }));
    expect(safeInvokeMock).toHaveBeenCalledWith('diary_create_entry', {
      title: 'Nota',
      folder_id: 'folder-1',
      status: 'draft',
    });
  });

  it('updates only the supplied entry fields', async () => {
    safeInvokeMock.mockResolvedValueOnce(entry);

    await expect(
      updateDiaryEntry({
        id: 'entry-1',
        title: 'Título novo',
        content: 'Texto novo',
        folderId: 'folder-2',
        status: 'done',
      }),
    ).resolves.toEqual(expect.objectContaining({ id: 'entry-1' }));
    expect(safeInvokeMock).toHaveBeenCalledWith('diary_update_entry', {
      id: 'entry-1',
      title: 'Título novo',
      content: 'Texto novo',
      folder_id: 'folder-2',
      status: 'done',
    });
  });

  it('does not add omitted fields to a partial update payload', async () => {
    safeInvokeMock.mockResolvedValueOnce(entry);

    await expect(updateDiaryEntry({ id: 'entry-1', title: 'Título parcial' })).resolves.toEqual(
      expect.objectContaining({ title: 'Nota' }),
    );
    expect(safeInvokeMock).toHaveBeenCalledTimes(1);
    const [command, payload] = safeInvokeMock.mock.calls[0];
    expect(command).toBe('diary_update_entry');
    expect(payload).toStrictEqual({
      id: 'entry-1',
      title: 'Título parcial',
    });
  });

  it('deletes an entry with its id', async () => {
    safeInvokeMock.mockResolvedValueOnce(true);

    await expect(deleteDiaryEntry('entry-1')).resolves.toBe(true);
    expect(safeInvokeMock).toHaveBeenCalledWith('diary_delete_entry', { id: 'entry-1' });
  });

  it('preserves safeInvoke null results and rejected errors', async () => {
    const error = new Error('diary unavailable');
    safeInvokeMock.mockResolvedValueOnce(null);
    await expect(listDiaryFolders()).resolves.toBeNull();

    safeInvokeMock.mockRejectedValueOnce(error);
    await expect(listDiaryFolders()).rejects.toBe(error);
  });
});
