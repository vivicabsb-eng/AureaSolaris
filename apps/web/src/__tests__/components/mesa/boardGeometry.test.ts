import { describe, expect, it } from 'vitest';
import {
  BOARD_GRID_SIZE,
  clampBoardZoom,
  screenPointToBoard,
  snapBoardCoordinate,
} from '../../../components/mesa/boardGeometry';

describe('Mesa board geometry', () => {
  it('keeps the persisted board grid at 20 pixels', () => {
    expect(BOARD_GRID_SIZE).toBe(20);
    expect(snapBoardCoordinate(39)).toBe(40);
    expect(snapBoardCoordinate(31)).toBe(40);
    expect(snapBoardCoordinate(29)).toBe(20);
  });

  it('converts a screen point into snapped board coordinates using pan and zoom', () => {
    expect(screenPointToBoard(
      { x: 500, y: 360 },
      { pan: { x: 100, y: 40 }, zoom: 2 },
      { x: 100, y: 60 },
    )).toEqual({ x: 100, y: 100 });
  });

  it('preserves the existing board zoom limits', () => {
    expect(clampBoardZoom(0.01)).toBe(0.15);
    expect(clampBoardZoom(1.25)).toBe(1.25);
    expect(clampBoardZoom(9)).toBe(3);
  });
});
