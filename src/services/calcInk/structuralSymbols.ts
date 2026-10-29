import type { Stroke } from '../../types';
import { getStrokesBoundingBox } from './coordinateTransform';

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

function boxOf(stroke: Stroke): Box | null {
  return getStrokesBoundingBox([stroke]);
}

/**
 * Structural division-sign matcher: one long horizontal bar with a small
 * dot above and a small dot below. Point-cloud templates cannot separate ÷
 * from + (centered dots coincide with the plus bar), so this checks the
 * actual stroke structure instead. Pure and deterministic.
 */
export function matchDivideSign(strokes: Stroke[]): boolean {
  if (strokes.length !== 3) return false;
  const boxes: Box[] = [];
  for (const s of strokes) {
    const box = boxOf(s);
    if (!box) return false;
    boxes.push(box);
  }
  const bars = boxes.filter((b) => b.width > 3 * Math.max(b.height, 1));
  if (bars.length !== 1) return false;
  const bar = bars[0];
  if (bar.width < 12) return false;

  const dots = boxes.filter((b) => b !== bar);
  if (dots.length !== 2) return false;
  const dotsSmall = dots.every(
    (d) => Math.max(d.width, d.height) < bar.width * 0.35
  );
  if (!dotsSmall) return false;

  const above = dots.filter((d) => d.centerY < bar.centerY - bar.height);
  const below = dots.filter((d) => d.centerY > bar.centerY + bar.height);
  if (above.length !== 1 || below.length !== 1) return false;

  const withinX = (d: Box) =>
    d.centerX > bar.minX - bar.width * 0.25 &&
    d.centerX < bar.maxX + bar.width * 0.25;
  return withinX(above[0]) && withinX(below[0]);
}
