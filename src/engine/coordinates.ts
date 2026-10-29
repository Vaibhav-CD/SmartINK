import { Point, Viewport } from '../types/canvas';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5.0;

/**
 * Transforms world coordinates to screen coordinates based on viewport.
 */
export function worldToScreen(worldPoint: Point, viewport: Viewport): Point {
  return {
    x: (worldPoint.x - viewport.x) * viewport.zoom,
    y: (worldPoint.y - viewport.y) * viewport.zoom,
    pressure: worldPoint.pressure,
  };
}

/**
 * Transforms screen coordinates to world coordinates based on viewport.
 */
export function screenToWorld(screenPoint: Point, viewport: Viewport): Point {
  return {
    x: screenPoint.x / viewport.zoom + viewport.x,
    y: screenPoint.y / viewport.zoom + viewport.y,
    pressure: screenPoint.pressure,
  };
}

/**
 * Clamps zoom level within standard boundaries.
 */
export function clampZoom(zoom: number, min = MIN_ZOOM, max = MAX_ZOOM): number {
  return Math.min(Math.max(zoom, min), max);
}

/**
 * Zooms into or out of a specific point on the screen (e.g. mouse cursor or pinch center).
 * Keeps the world point beneath the cursor stationary on screen.
 */
export function zoomAtScreenPoint(
  viewport: Viewport,
  screenPoint: Point,
  zoomFactor: number,
  minZoom = MIN_ZOOM,
  maxZoom = MAX_ZOOM
): Viewport {
  const newZoom = clampZoom(viewport.zoom * zoomFactor, minZoom, maxZoom);
  if (newZoom === viewport.zoom) {
    return viewport;
  }

  // Find world point before zoom
  const worldPoint = screenToWorld(screenPoint, viewport);

  // New viewport x and y so that worldPoint remains under screenPoint
  const newX = worldPoint.x - screenPoint.x / newZoom;
  const newY = worldPoint.y - screenPoint.y / newZoom;

  return {
    x: newX,
    y: newY,
    zoom: newZoom,
  };
}

/**
 * Computes bounding box for an array of points in world coordinates.
 */
export function computeBoundingBox(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pt of points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Checks if a bounding box is visible within the screen viewport.
 */
export function isBoxInViewport(
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  viewport: Viewport,
  screenSize: { width: number; height: number }
): boolean {
  const topLeftScreen = worldToScreen({ x: bbox.minX, y: bbox.minY }, viewport);
  const bottomRightScreen = worldToScreen({ x: bbox.maxX, y: bbox.maxY }, viewport);

  return (
    bottomRightScreen.x >= 0 &&
    topLeftScreen.x <= screenSize.width &&
    bottomRightScreen.y >= 0 &&
    topLeftScreen.y <= screenSize.height
  );
}
