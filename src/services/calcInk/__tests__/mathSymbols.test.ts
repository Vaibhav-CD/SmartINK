import { describe, it, expect } from 'vitest';
import { OnDeviceStrokeRecognizer } from '../strokeRecognizer';
import type { Stroke } from '../../../types';

function glyph(id: string, pts: [number, number][]): Stroke {
  return {
    id,
    points: pts.map(([x, y]) => ({ x, y })),
    color: '#a3e635',
    width: 3,
    createdAt: 1000,
  };
}

function six(id: string, dx: number): Stroke {
  return {
    id,
    points: [
      { x: 20 + dx, y: 15 },
      { x: 12 + dx, y: 35 },
      { x: 10 + dx, y: 50 },
      { x: 20 + dx, y: 55 },
      { x: 30 + dx, y: 45 },
      { x: 15 + dx, y: 40 },
    ],
    color: '#a3e635',
    width: 3,
    createdAt: 1000,
  };
}

const SYMBOLS: { char: string; pts: [number, number][] }[] = [
  { char: '∫', pts: [[62, 10], [46, 24], [42, 44], [48, 58], [58, 72], [56, 88], [44, 94]] },
  { char: 'Σ', pts: [[72, 15], [28, 15], [46, 50], [28, 85], [72, 85]] },
  { char: 'Δ', pts: [[50, 12], [20, 85], [80, 85], [50, 12]] },
  {
    char: 'θ',
    pts: [[50, 32], [34, 44], [34, 62], [50, 74], [66, 62], [66, 44], [50, 32], [26, 53], [74, 53]],
  },
  {
    char: '∞',
    pts: [[32, 54], [42, 40], [56, 54], [70, 68], [80, 54], [70, 40], [56, 54], [42, 68], [32, 54]],
  },
  { char: '≤', pts: [[68, 28], [34, 50], [68, 72], [34, 86], [68, 86]] },
  { char: '≥', pts: [[32, 28], [66, 50], [32, 72], [32, 86], [66, 86]] },
  { char: '≠', pts: [[38, 12], [38, 88], [62, 12], [62, 88], [26, 72], [74, 28]] },
  { char: '→', pts: [[18, 50], [80, 50], [64, 36], [80, 50], [64, 64], [80, 50]] },
  { char: '±', pts: [[30, 32], [70, 32], [50, 14], [50, 50], [30, 70], [70, 70]] },
  { char: 'sqrt', pts: [[15, 60], [28, 85], [45, 20], [88, 20]] },
  {
    char: 'pi',
    pts: [[20, 25], [80, 25], [35, 25], [35, 80], [65, 25], [65, 80]],
  },
];

describe('math symbol templates', () => {
  for (const { char, pts } of SYMBOLS) {
    it(`recognizes '${char}' from its canonical trajectory`, () => {
      const result = OnDeviceStrokeRecognizer.classifyGlyph([glyph('g', pts)]);
      expect(result.char).toBe(char);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  }

  it('keeps confident geometric digits untouched (additive rule)', () => {
    expect(OnDeviceStrokeRecognizer.classifyGlyph([six('s', 0)]).char).toBe('6');
  });

  it('recognizes a structural division sign as evaluable division', () => {
    const bar = glyph('bar', [
      [65, 50],
      [115, 50],
    ]);
    const dotTop = glyph('d1', [
      [90, 30],
      [92, 30],
    ]);
    const dotBottom = glyph('d2', [
      [90, 70],
      [92, 70],
    ]);
    expect(
      OnDeviceStrokeRecognizer.classifyGlyph([bar, dotTop, dotBottom]).char
    ).toBe('/');
  });

  it('does not mistake a plain plus for a division sign', () => {
    const h = glyph('h', [
      [20, 50],
      [80, 50],
    ]);
    const v = glyph('v', [
      [50, 20],
      [50, 80],
    ]);
    expect(OnDeviceStrokeRecognizer.classifyGlyph([h, v]).char).toBe('+');
  });

  it('parses a root glyph plus digit into sqrt() form', () => {
    const radical = glyph('rad', [
      [15, 60],
      [28, 85],
      [45, 20],
      [88, 20],
    ]);
    const parsed = OnDeviceStrokeRecognizer.parseClusterToExpression([
      radical,
      six('six-1', 95),
    ]);
    expect(parsed.expressionStr).toBe('sqrt(6)');
  });

  it('normalizes the division glyph into evaluable form', () => {
    const bar = glyph('bar', [
      [65, 50],
      [115, 50],
    ]);
    const dotTop = glyph('d1', [
      [90, 38],
      [92, 38],
    ]);
    const dotBottom = glyph('d2', [
      [90, 62],
      [92, 62],
    ]);
    const parsed = OnDeviceStrokeRecognizer.parseClusterToExpression([
      six('six-1', 0),
      bar,
      dotTop,
      dotBottom,
      six('six-2', 170),
    ]);
    expect(parsed.expressionStr.replace(/\s+/g, '')).toBe('6/6');
  });
});
