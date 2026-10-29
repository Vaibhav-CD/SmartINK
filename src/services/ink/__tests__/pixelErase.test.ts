import { describe, it, expect } from 'vitest';
import { eraseStrokePixels } from '../pixelErase';
import type { Stroke } from '../../../types';

function stroke(id: string, pts: [number, number][]): Stroke {
  return {
    id,
    points: pts.map(([x, y]) => ({ x, y })),
    color: '#a3e635',
    width: 3,
    createdAt: 1,
  };
}

describe('eraseStrokePixels', () => {
  it('returns null when the eraser touches nothing', () => {
    const s = stroke('s', [
      [0, 0],
      [10, 0],
      [20, 0],
    ]);
    expect(eraseStrokePixels(s, { x: 100, y: 100 }, 10)).toBeNull();
  });

  it('returns an empty array when the whole stroke is erased', () => {
    const s = stroke('s', [
      [0, 0],
      [10, 0],
      [20, 0],
    ]);
    expect(eraseStrokePixels(s, { x: 10, y: 0 }, 50)).toEqual([]);
  });

  it('splits a stroke erased in the middle into two fragments', () => {
    const s = stroke('s', [
      [0, 0],
      [10, 0],
      [20, 0],
      [30, 0],
      [40, 0],
    ]);
    const result = eraseStrokePixels(s, { x: 20, y: 0 }, 6);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
    expect(result![0].points.map((p) => p.x)).toEqual([
      0,
      10,
      expect.closeTo(14, 5),
    ]);
    expect(result![1].points.map((p) => p.x)).toEqual([
      expect.closeTo(26, 5),
      30,
      40,
    ]);
    expect(result![0].color).toBe('#a3e635');
    expect(result![0].width).toBe(3);
    expect(result![0].id).toBe('s:px0');
    expect(result![1].id).toBe('s:px1');
  });

  it('trims an erased endpoint to a shorter single fragment', () => {
    const s = stroke('s', [
      [0, 0],
      [10, 0],
      [20, 0],
    ]);
    const result = eraseStrokePixels(s, { x: 0, y: 0 }, 6);
    expect(result!.length).toBe(1);
    expect(result![0].points.map((p) => p.x)).toEqual([
      expect.closeTo(6, 5),
      10,
      20,
    ]);
  });

  it('punches a hole in a long segment passing through the disc', () => {
    const s = stroke('s', [
      [-100, 0],
      [100, 0],
    ]);
    const result = eraseStrokePixels(s, { x: 0, y: 0 }, 5);
    expect(result!.length).toBe(2);
    expect(result![0].points.map((p) => p.x)).toEqual([
      -100,
      expect.closeTo(-5, 5),
    ]);
    expect(result![1].points.map((p) => p.x)).toEqual([
      expect.closeTo(5, 5),
      100,
    ]);
  });

  it('erases a hit dot and keeps a missed dot', () => {
    const dot = stroke('dot', [[50, 50]]);
    expect(eraseStrokePixels(dot, { x: 50, y: 50 }, 8)).toEqual([]);
    expect(eraseStrokePixels(dot, { x: 0, y: 0 }, 8)).toBeNull();
  });
});
