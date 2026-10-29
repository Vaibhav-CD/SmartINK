import type { Point, Stroke } from '../../types';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

/**
 * Screen-to-World coordinate mapping
 * Converts raw screen pixel coordinates (e.g. from mouse/touch/stylus) to virtual canvas space.
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  transform: ViewTransform
): Point {
  return {
    x: (screenX - transform.x) / transform.scale,
    y: (screenY - transform.y) / transform.scale,
  };
}

/**
 * World-to-Screen coordinate mapping
 * Converts virtual canvas space coordinates to screen viewport pixels.
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  transform: ViewTransform
): Point {
  return {
    x: worldX * transform.scale + transform.x,
    y: worldY * transform.scale + transform.y,
  };
}

/**
 * Calculate bounding box for a stroke or collection of strokes
 */
export function getStrokesBoundingBox(strokes: Stroke[]): BoundingBox | null {
  if (strokes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    for (const pt of stroke.points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
  }

  if (minX === Infinity) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

/**
 * Calculate point-to-line segment shortest distance squared
 */
export function distToSegmentSquared(
  p: Point, 
  v: Point, 
  w: Point
): number {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2;
}

/**
 * Checks if an eraser point intersects any segment of a stroke within a radius
 */
export function isStrokeIntersected(
  stroke: Stroke,
  eraserPoint: Point,
  radius: number
): boolean {
  const r2 = radius * radius;
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const d2 = distToSegmentSquared(eraserPoint, stroke.points[i], stroke.points[i + 1]);
    if (d2 <= r2) return true;
  }
  return false;
}

/**
 * Scratch-to-Erase Gesture Detection
 * 
 * Inter IIT Tech Meet 15.0 CalcInk Creative Extension:
 * Identifies when a user scribbles back and forth horizontally over content
 * (multiple direction reversals with high frequency within a bounded region).
 */
export function isScratchGesture(points: Point[]): boolean {
  if (points.length < 12) return false;

  // Track horizontal reversals (sign changes in deltaX)
  let directionReversals = 0;
  let lastDirection = 0;
  let totalLength = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    totalLength += Math.hypot(dx, dy);

    if (Math.abs(dx) > 4) {
      const currentDir = dx > 0 ? 1 : -1;
      if (lastDirection !== 0 && currentDir !== lastDirection) {
        directionReversals++;
      }
      lastDirection = currentDir;
    }
  }

  // A scratch gesture requires at least 4 rapid horizontal direction reversals
  // and an aspect ratio predominantly horizontal or condensed
  if (directionReversals >= 4) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const width = maxX - minX;
    const height = maxY - minY;
    // Length must be significantly greater than the bounding box width (dense back-and-forth)
    if (width > 20 && totalLength > width * 2.2 && height < width * 2.5) {
      return true;
    }
  }

  return false;
}

/**
 * Standard Ray-Casting algorithm for Point-in-Polygon test
 */
export function isPointInPolygon(p: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) &&
      (p.x < (xj - xi) * (p.y - yi) / (yj - yi || 1) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if a stroke's bounding box is enclosed or substantially intersects a selection rectangle
 */
export function isStrokeEnclosedInBox(stroke: Stroke, box: BoundingBox): boolean {
  const sBox = getStrokesBoundingBox([stroke]);
  if (!sBox) return false;

  // Center point containment
  const centerInside =
    sBox.centerX >= box.minX &&
    sBox.centerX <= box.maxX &&
    sBox.centerY >= box.minY &&
    sBox.centerY <= box.maxY;

  if (centerInside) return true;

  // Also check if bounding box overlap is > 45%
  const xOverlap = Math.max(0, Math.min(sBox.maxX, box.maxX) - Math.max(sBox.minX, box.minX));
  const yOverlap = Math.max(0, Math.min(sBox.maxY, box.maxY) - Math.max(sBox.minY, box.minY));
  const overlapArea = xOverlap * yOverlap;
  const strokeArea = sBox.width * sBox.height || 1;

  return overlapArea / strokeArea > 0.45;
}

export interface CircleLassoResult {
  isCircle: boolean;
  bbox?: BoundingBox;
  enclosedStrokes: Stroke[];
}

/**
 * Circle-to-Solve Gesture Recognition:
 * Detects when a user draws a loop/circle/lasso around mathematical expressions.
 * 
 * Criteria:
 * 1. Has at least 12 points.
 * 2. Start and end points are close to each other (closing the loop).
 * 3. Bounding box is sufficiently large to surround content (width > 30px, height > 30px).
 * 4. Contains one or more other strokes inside its boundary.
 */
export function isCircleLassoGesture(
  points: Point[],
  candidateStrokes: Stroke[] = []
): CircleLassoResult {
  if (points.length < 12) return { isCircle: false, enclosedStrokes: [] };

  const startPt = points[0];
  const endPt = points[points.length - 1];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const maxDim = Math.max(width, height);

  // Must be large enough to circle something
  if (width < 32 || height < 32) return { isCircle: false, enclosedStrokes: [] };

  // Aspect ratio shouldn't be a straight line
  const aspectRatio = width / (height || 1);
  if (aspectRatio < 0.25 || aspectRatio > 4.0) return { isCircle: false, enclosedStrokes: [] };

  // Loop closure: distance between start and end point should be relatively small
  const closureDist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
  const isClosed = closureDist < maxDim * 0.45;

  if (!isClosed) return { isCircle: false, enclosedStrokes: [] };

  const bbox: BoundingBox = {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };

  // Find candidate strokes that lie inside this circle/lasso
  const enclosed = candidateStrokes.filter((s) => {
    const sBox = getStrokesBoundingBox([s]);
    if (!sBox) return false;
    const inBbox =
      sBox.centerX >= minX - 10 &&
      sBox.centerX <= maxX + 10 &&
      sBox.centerY >= minY - 10 &&
      sBox.centerY <= maxY + 10;

    if (!inBbox) return false;

    return isPointInPolygon({ x: sBox.centerX, y: sBox.centerY }, points) ||
      (s.points.length > 0 && isPointInPolygon(s.points[0], points));
  });

  return {
    isCircle: enclosed.length > 0,
    bbox,
    enclosedStrokes: enclosed,
  };
}
