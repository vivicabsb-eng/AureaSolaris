import { useState, useRef, useCallback, useEffect } from 'react';
import { listBoards, loadBoard, saveBoard } from '../services/notebook';
import type { BoardSummary } from '../services/notebook';
import type { CadernoBoard, CadernoNode } from '../types/caderno';
import { BoardManager } from './mesa/BoardManager';
import { MesaCanvas } from './mesa/MesaCanvas';
import { STICKY_COLORS } from './mesa/NodeCard';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type CadernoIntent =
  | { type: 'browse' }
  | { type: 'create-study'; topic: string; seedNote?: string }
  | { type: 'open-study'; boardId: string; nodeId: number };

type MesaCriacaoProps = {
  intent?: CadernoIntent | null;
  onIntentHandled?: () => void;
};

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const LS_ACTIVE = 'aurea_active_board';
const activeBoardKey = () => `${LS_ACTIVE}:${localStorage.getItem('aurea_active_id') || 'anonymous'}`;

const uid = () => `board_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─────────────────────────────────────────────────────────────
// ROOT COMPONENT — Board Manager or Canvas
// ─────────────────────────────────────────────────────────────
export const MesaCriacao = ({ intent = null, onIntentHandled }: MesaCriacaoProps) => {
  const [activeBoard, setActiveBoard] = useState<CadernoBoard | null>(null);
  const [requestedStudyNodeId, setRequestedStudyNodeId] = useState<number | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  // Uma entrada contextual deve abrir a lista ou o novo caderno pedido, nunca
  // redirecionar silenciosamente para outro caderno que estava aberto antes.
  const shouldRestoreLastBoard = useRef(intent === null);
  const hasHandledIntent = useRef(false);

  const openBoard = useCallback(async (meta: BoardSummary, studyNodeId: number | null = null) => {
    try {
      const data = await loadBoard(meta.id);
      const board: CadernoBoard = {
        id: meta.id,
        name: meta.name,
        updatedAt: meta.updatedAt || Date.now(),
        nodes: data?.nodes || [],
        edges: data?.edges || []
      };
      localStorage.setItem(activeBoardKey(), board.id);
      setRequestedStudyNodeId(studyNodeId);
      setActiveBoard(board);
    } catch (error) {
      console.error('Failed to load board', error);
      setIntentError('Não foi possível abrir este caderno. Seus outros cadernos permanecem preservados.');
    }
  }, []);

  const createContextualStudy = useCallback(async (topic: string, seedNote?: string) => {
    const name = `Estudo — ${topic}`;
    const newId = uid();
    const starterNote: CadernoNode = {
      id: Date.now(),
      type: 'sticky',
      x: 120,
      y: 120,
      w: 320,
      h: 180,
      color: STICKY_COLORS[0],
      text: seedNote || `Tema do estudo\n${topic}\n\nRegistre aqui sua pergunta, observação ou a próxima conexão.`,
    };

    try {
      await saveBoard({ id: newId, name, nodes: [starterNote], edges: [] });
      await openBoard({ id: newId, name, updatedAt: Date.now() });
    } catch (error) {
      console.error('Failed to create contextual study', error);
      setIntentError('Não foi possível criar o estudo agora. Nenhum caderno existente foi alterado.');
    }
  }, [openBoard]);

  // Restore last active board from Tauri
  useEffect(() => {
    if (!shouldRestoreLastBoard.current) return;
    const lastId = localStorage.getItem(activeBoardKey());
    if (lastId) {
      loadBoard(lastId).then(data => {
        if (data && data.nodes) {
          // Find the name from the list
          listBoards().then(list => {
             const meta = list?.find(b => b.id === lastId);
             if (meta) {
               setActiveBoard({ id: lastId, name: meta.name, updatedAt: meta.updatedAt || Date.now(), nodes: data.nodes, edges: data.edges });
             } else {
               localStorage.removeItem(activeBoardKey());
             }
          });
        } else {
          localStorage.removeItem(activeBoardKey());
        }
      }).catch(() => localStorage.removeItem(activeBoardKey()));
    }
  }, []);

  useEffect(() => {
    if (!intent || hasHandledIntent.current) return;
    hasHandledIntent.current = true;

    const handleIntent = async () => {
      if (intent.type === 'create-study') {
        await createContextualStudy(intent.topic, intent.seedNote);
      } else if (intent.type === 'open-study') {
        const list = await listBoards();
        const meta = list?.find(item => item.id === intent.boardId);
        if (meta) {
          await openBoard(meta, intent.nodeId);
        } else {
          setIntentError('O caderno deste estudo não foi encontrado. Nenhum dado foi alterado.');
        }
      }
      onIntentHandled?.();
    };

    void handleIntent();
  }, [createContextualStudy, intent, onIntentHandled, openBoard]);

  const closeBoard = async (updatedBoard: CadernoBoard) => {
    await saveBoard({
      id: updatedBoard.id,
      name: updatedBoard.name,
      nodes: updatedBoard.nodes,
      edges: updatedBoard.edges
    });
    setRequestedStudyNodeId(null);
    setActiveBoard(null);
    localStorage.removeItem(activeBoardKey());
  };

  if (activeBoard) {
    return (
      <MesaCanvas
        board={activeBoard}
        initialStudyNodeId={requestedStudyNodeId}
        onBack={closeBoard}
      />
    );
  }

  return <BoardManager onOpen={openBoard} intentError={intentError} />;
};
