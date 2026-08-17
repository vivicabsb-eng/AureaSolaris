export const BOARD_GRID_SIZE = 20;
export const BOARD_MIN_ZOOM = 0.15;
export const BOARD_MAX_ZOOM = 3;

export interface BoardPoint {
  x: number;
  y: number;
}

export interface BoardViewport {
  pan: BoardPoint;
  zoom: number;
}

export function snapBoardCoordinate(value: number): number {
  return Math.round(value / BOARD_GRID_SIZE) * BOARD_GRID_SIZE;
}

export function clampBoardZoom(zoom: number): number {
  return Math.min(BOARD_MAX_ZOOM, Math.max(BOARD_MIN_ZOOM, zoom));
}

export function screenPointToBoard(
  point: BoardPoint,
  viewport: BoardViewport,
  placementOffset: BoardPoint = { x: 100, y: 60 },
): BoardPoint {
  return {
    x: snapBoardCoordinate((point.x - viewport.pan.x) / viewport.zoom - placementOffset.x),
    y: snapBoardCoordinate((point.y - viewport.pan.y) / viewport.zoom - placementOffset.y),
  };
}

export function nextBoardZoom(currentZoom: number, deltaY: number): number {
  const factor = deltaY < 0 ? 1.08 : 0.93;
  return clampBoardZoom(currentZoom * factor);
}
