import { describe, it, expect } from 'vitest';
import {
  rasterizeGlyph,
  softmax,
  glyphSignature,
  GLYPH_RASTER_SIZE,
} from '../rasterize';
import type { Stroke } from '../../../types';

function stroke(id: string, pts: [number, number][]): Stroke {
  return {
    id,
    points: pts.map(([x, y]) => ({ x, y })),
    color: '#fff',
    width: 3,
    createdAt: 1,
  };
}

function inkSum(grid: Float32Array): number {
  let sum = 0;
  for (const v of grid) sum += v;
  return sum;
}

describe('rasterizeGlyph', () => {
  it('returns a blank 28x28 grid for empty strokes', () => {
    const grid = rasterizeGlyph([]);
    expect(grid.length).toBe(GLYPH_RASTER_SIZE * GLYPH_RASTER_SIZE);
    expect(inkSum(grid)).toBe(0);
  });

  it('draws ink with values capped at 1', () => {
    const grid = rasterizeGlyph([
      stroke('v', [
        [10, 10],
        [10, 60],
      ]),
    ]);
    expect(inkSum(grid)).toBeGreaterThan(20);
    expect(Math.max(...grid)).toBe(1);
  });

  it('centers the glyph mass in the grid', () => {
    const grid = rasterizeGlyph([
      stroke('v', [
        [500, 500],
        [500, 600],
      ]),
    ]);
    let sx = 0;
    let sy = 0;
    let total = 0;
    for (let y = 0; y < GLYPH_RASTER_SIZE; y++) {
      for (let x = 0; x < GLYPH_RASTER_SIZE; x++) {
        const v = grid[y * GLYPH_RASTER_SIZE + x];
        sx += x * v;
        sy += y * v;
        total += v;
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(sx / total).toBeGreaterThan(8);
    expect(sx / total).toBeLessThan(20);
    expect(sy / total).toBeGreaterThan(8);
    expect(sy / total).toBeLessThan(20);
  });

  it('is deterministic for the same input', () => {
    const strokes = [
      stroke('a', [
        [0, 0],
        [30, 40],
        [60, 10],
      ]),
    ];
    expect(rasterizeGlyph(strokes)).toEqual(rasterizeGlyph(strokes));
  });

  it('renders single-point dots as ink blobs', () => {
    const grid = rasterizeGlyph([stroke('dot', [[42, 42]])]);
    expect(inkSum(grid)).toBeGreaterThan(0);
  });
});

describe('glyphSignature', () => {
  it('is order-independent and distinct per glyph', () => {
    const a = stroke('a', [[0, 0]]);
    const b = stroke('b', [[1, 1]]);
    expect(glyphSignature([a, b])).toBe(glyphSignature([b, a]));
    expect(glyphSignature([a])).not.toBe(glyphSignature([b]));
  });
});

describe('softmax', () => {
  it('normalizes logits to a probability distribution', () => {
    const probs = softmax([2, 1, 0.5]);
    expect(probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(probs[0]).toBeGreaterThan(probs[1]);
    expect(probs[1]).toBeGreaterThan(probs[2]);
  });
});
