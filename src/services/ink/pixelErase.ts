import type { Point, Stroke, StrokePoint } from '../../types';

/**
 * Pixel-erase: removes the portion of a stroke under the eraser disc and
 * splits the survivors into contiguous fragment strokes, cutting segments
 * exactly at the disc boundary (circle intersection).
 *
 * Returns `null` when the stroke is untouched, `[]` when fully erased,
 * otherwise the replacement fragments (original id suffixed, style kept).
 * Pure and deterministic: no DOM, safe in tests and workers.
 */
export function eraseStrokePixels(
  stroke: Stroke,
  center: Point,
  radius: number
): Stroke[] | null {
  const pts = stroke.points;
  if (pts.length === 0 || radius <= 0) return null;

  // Bounding-box pre-check (expanded by radius) to skip distant strokes.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (
    center.x < minX - radius ||
    center.x > maxX + radius ||
    center.y < minY - radius ||
    center.y > maxY + radius
  ) {
    return null;
  }

  // Single-point dot: inside the disc means fully erased.
  if (pts.length === 1) {
    return Math.hypot(pts[0].x - center.x, pts[0].y - center.y) <= radius
      ? []
      : null;
  }

  const fragments: Stroke[] = [];
  let run: StrokePoint[] = [];
  let touched = pts.some(
    (p) => Math.hypot(p.x - center.x, p.y - center.y) <= radius
  );

  const pushPoint = (p: StrokePoint) => {
    const last = run[run.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) run.push(p);
  };
  const flush = () => {
    if (run.length > 0) {
      fragments.push({
        ...stroke,
        id: `${stroke.id}:px${fragments.length}`,
        points: run,
      });
      run = [];
    }
  };

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    // Split parameters: segment ends plus circle intersections in (0, 1).
    const splits: number[] = [0, 1];
    const len2 = dx * dx + dy * dy;
    if (len2 > 0) {
      const fx = a.x - center.x;
      const fy = a.y - center.y;
      const quadB = 2 * (fx * dx + fy * dy);
      const quadC = fx * fx + fy * fy - radius * radius;
      const disc = quadB * quadB - 4 * len2 * quadC;
      if (disc > 0) {
        const sq = Math.sqrt(disc);
        for (const t of [(-quadB - sq) / (2 * len2), (-quadB + sq) / (2 * len2)]) {
          if (t > 0 && t < 1) splits.push(t);
        }
        splits.sort((x, y) => x - y);
      }
    }

    for (let k = 0; k < splits.length - 1; k++) {
      const t0 = splits[k];
      const t1 = splits[k + 1];
      const mid = (t0 + t1) / 2;
      const mx = a.x + dx * mid;
      const my = a.y + dy * mid;
      if (Math.hypot(mx - center.x, my - center.y) <= radius) {
        touched = true;
        flush();
      } else {
        if (run.length === 0) {
          pushPoint({ x: a.x + dx * t0, y: a.y + dy * t0, pressure: a.pressure });
        }
        pushPoint({ x: a.x + dx * t1, y: a.y + dy * t1, pressure: b.pressure });
      }
    }
  }
  flush();

  if (!touched) return null;
  return fragments;
}
