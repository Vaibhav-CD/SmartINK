import type { Stroke } from '../../types';

export const GLYPH_RASTER_SIZE = 28;
/** Inner box (MNIST convention: digit fits in 20x20 centered in 28x28). */
const INNER_SIZE = 20;
const MARGIN = (GLYPH_RASTER_SIZE - INNER_SIZE) / 2;

/**
 * Stable key for a glyph (group of strokes) so neural results can be
 * matched back to geometric glyphs for override-based refinement.
 */
export function glyphSignature(strokes: Stroke[]): string {
  return strokes
    .map((s) => s.id)
    .sort()
    .join('|');
}

function stampDisc(
  grid: Float32Array,
  size: number,
  cx: number,
  cy: number,
  radius: number
): void {
  const r2 = radius * radius;
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(size - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(size - 1, Math.ceil(cy + radius));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) {
        grid[y * size + x] = 1;
      }
    }
  }
}

/**
 * Rasterizes a glyph's strokes into an MNIST-style 28x28 grayscale grid:
 * ink pixels are 1, background is 0, glyph is aspect-preserved and centered.
 * Pure function: no DOM, runs in workers and Node tests.
 */
export function rasterizeGlyph(
  strokes: Stroke[],
  size: number = GLYPH_RASTER_SIZE
): Float32Array {
  const grid = new Float32Array(size * size);
  const points = strokes.flatMap((s) => s.points);
  if (points.length === 0) return grid;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const span = Math.max(maxX - minX, maxY - minY, 1);
  const inner = size * (INNER_SIZE / GLYPH_RASTER_SIZE);
  const margin = size * (MARGIN / GLYPH_RASTER_SIZE);
  const scale = inner / span;
  const offsetX = margin + (inner - (maxX - minX) * scale) / 2 - minX * scale;
  const offsetY = margin + (inner - (maxY - minY) * scale) / 2 - minY * scale;
  const project = (x: number, y: number): [number, number] => [
    x * scale + offsetX,
    y * scale + offsetY,
  ];

  // Pen radius scales with output size (~MNIST stroke weight).
  const radius = Math.max(0.9, size / 28);

  for (const stroke of strokes) {
    const pts = stroke.points;
    if (pts.length === 0) continue;
    if (pts.length === 1) {
      const [cx, cy] = project(pts[0].x, pts[0].y);
      stampDisc(grid, size, cx, cy, radius * 1.4);
      continue;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = project(pts[i].x, pts[i].y);
      const [x1, y1] = project(pts[i + 1].x, pts[i + 1].y);
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.max(1, Math.ceil(dist / 0.5));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        stampDisc(grid, size, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius);
      }
    }
  }

  return grid;
}

/** Numerically stable softmax over raw logits. */
export function softmax(logits: Float32Array | number[]): number[] {
  const max = Math.max(...logits);
  const exps = Array.from(logits, (v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}
