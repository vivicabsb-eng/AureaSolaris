import { safeInvoke } from '../utils/tauri';
import type { CadernoEdge, CadernoNode } from '../types/caderno';

export interface BoardSummary {
  id: string;
  name: string;
  ownerId?: string;
  updatedAt: number;
}

export interface BoardData {
  name?: string;
  nodes: CadernoNode[];
  edges: CadernoEdge[];
  ownerId?: string;
  updatedAt?: number;
}

export interface SaveBoardInput {
  id: string;
  name: string;
  nodes: CadernoNode[];
  edges: CadernoEdge[];
}

interface BoardSummaryDto {
  id: string;
  name: string;
  owner_id?: string;
  updated_at?: number;
  updatedAt?: number;
}

interface BoardDataDto {
  name?: string;
  nodes?: CadernoNode[];
  edges?: CadernoEdge[];
  owner_id?: string;
  updated_at?: number;
}

function mapBoardSummary(dto: BoardSummaryDto): BoardSummary {
  return {
    id: dto.id,
    name: dto.name,
    ownerId: dto.owner_id,
    updatedAt: dto.updated_at ?? dto.updatedAt ?? 0,
  };
}

function mapBoardData(dto: BoardDataDto): BoardData {
  return {
    name: dto.name,
    nodes: dto.nodes ?? [],
    edges: dto.edges ?? [],
    ownerId: dto.owner_id,
    updatedAt: dto.updated_at,
  };
}

export function listBoards(): Promise<BoardSummary[] | null> {
  return safeInvoke<BoardSummaryDto[]>('list_boards').then((result) =>
    result === null ? null : result.map(mapBoardSummary),
  );
}

export function loadBoard(boardId: string): Promise<BoardData | null> {
  return safeInvoke<BoardDataDto>('load_board', { boardId }).then((result) =>
    result === null ? null : mapBoardData(result),
  );
}

export function saveBoard(board: SaveBoardInput): Promise<number | null> {
  return safeInvoke<number>('save_board', {
    boardId: board.id,
    name: board.name,
    nodes: board.nodes,
    edges: board.edges,
  });
}

export function deleteBoard(boardId: string): Promise<void | null> {
  return safeInvoke<void | boolean>('delete_board', { boardId }).then((result) =>
    result === null ? null : undefined,
  );
}
