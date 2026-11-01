import { describe, it, expect } from 'vitest';
import { OnDeviceStrokeRecognizer } from '../../calcInk/strokeRecognizer';
import { refineEquationsWithNeural } from '../refine';
import type {
  NeuralGlyphClassifier,
  NeuralGlyphResult,
} from '../neuralGlyphService';
import { glyphSignature } from '../rasterize';
import type { Stroke } from '../../../types';

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

function plus(): Stroke[] {
  return [
    {
      id: 'plus-v',
      points: [
        { x: 50, y: 25 },
        { x: 50, y: 55 },
      ],
      color: '#a3e635',
      width: 3,
      createdAt: 1001,
    },
    {
      id: 'plus-h',
      points: [
        { x: 38, y: 40 },
        { x: 62, y: 40 },
      ],
      color: '#a3e635',
      width: 3,
      createdAt: 1002,
    },
  ];
}

function stubClassifier(
  entries: [string, NeuralGlyphResult][]
): NeuralGlyphClassifier {
  return {
    ready: true,
    classifyGlyphs: async () => new Map(entries),
  };
}

describe('refineEquationsWithNeural', () => {
  it('overrides a digit when neural confidence is high and disagrees', async () => {
    const six1 = six('six-1', 0);
    const six2 = six('six-2', 65);
    const strokes = [six1, ...plus(), six2];
    const scanned = OnDeviceStrokeRecognizer.scanEquations(strokes);
    expect(scanned[0].expressionText).toBe('6+6');

    const refined = await refineEquationsWithNeural(
      scanned,
      strokes,
      stubClassifier([
        [glyphSignature([six1]), { digit: '5', confidence: 0.99 }],
      ])
    );
    expect(refined[0].expressionText).toBe('5+6');
    expect(refined[0].evaluation.value).toBe(11);
    expect(refined[0].id).toBe(scanned[0].id);
  });

  it('returns the same array when neural agrees with geometry', async () => {
    const six1 = six('six-1', 0);
    const six2 = six('six-2', 65);
    const strokes = [six1, ...plus(), six2];
    const scanned = OnDeviceStrokeRecognizer.scanEquations(strokes);

    const refined = await refineEquationsWithNeural(
      scanned,
      strokes,
      stubClassifier([
        [glyphSignature([six1]), { digit: '6', confidence: 0.99 }],
      ])
    );
    expect(refined).toBe(scanned);
  });

  it('ignores low-confidence neural predictions', async () => {
    const six1 = six('six-1', 0);
    const six2 = six('six-2', 65);
    const strokes = [six1, ...plus(), six2];
    const scanned = OnDeviceStrokeRecognizer.scanEquations(strokes);

    const refined = await refineEquationsWithNeural(
      scanned,
      strokes,
      stubClassifier([
        [glyphSignature([six1]), { digit: '5', confidence: 0.4 }],
      ])
    );
    expect(refined).toBe(scanned);
  });

  it('never lets the digit model override a non-digit glyph (x, +)', async () => {
    // Handwritten "2x+4=10": the MNIST digit model has no authority over
    // variables or operators, however confident it claims to be.
    const mk = (id: string, points: { x: number; y: number }[], t: number): Stroke => ({
      id, points, color: '#a3e635', width: 3, createdAt: t,
    });
    const densify = (pts: { x: number; y: number }[], per = 6) => {
      const out: { x: number; y: number }[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        for (let j = 0; j < per; j++) {
          const f = j / per;
          out.push({ x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f });
        }
      }
      out.push(pts[pts.length - 1]);
      return out;
    };
    const ellipse = (cx: number, cy: number, rx: number, ry: number, n = 28) =>
      Array.from({ length: n + 1 }, (_, i) => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
      });

    const xGlyph = [
      mk('x-a', [{ x: 87, y: 25 }, { x: 109, y: 53 }], 2),
      mk('x-b', [{ x: 109, y: 25 }, { x: 87, y: 53 }], 3),
    ];
    const plusGlyph = [
      mk('p-v', [{ x: 132, y: 22 }, { x: 132, y: 52 }], 4),
      mk('p-h', [{ x: 120, y: 37 }, { x: 145, y: 37 }], 5),
    ];
    const strokes: Stroke[] = [
      mk('d2', densify([{ x: 25, y: 35 }, { x: 35, y: 18 }, { x: 65, y: 18 }, { x: 75, y: 35 }, { x: 60, y: 55 }, { x: 25, y: 85 }, { x: 75, y: 85 }]), 1),
      ...xGlyph,
      ...plusGlyph,
      mk('f-l', [{ x: 180, y: 12 }, { x: 163, y: 37 }, { x: 187, y: 37 }], 6),
      mk('f-v', [{ x: 180, y: 12 }, { x: 180, y: 52 }], 7),
      mk('e-t', [{ x: 200, y: 35 }, { x: 225, y: 35 }], 8),
      mk('e-b', [{ x: 200, y: 49 }, { x: 225, y: 49 }], 9),
      mk('d1', [{ x: 245, y: 10 }, { x: 245, y: 50 }], 10),
      mk('d0', ellipse(285, 32, 20, 23), 11),
    ];
    const scanned = OnDeviceStrokeRecognizer.scanEquations(strokes);
    expect(scanned[0].expressionText).toBe('2x+4=10');

    const refined = await refineEquationsWithNeural(
      scanned,
      strokes,
      stubClassifier([
        [glyphSignature(xGlyph), { digit: '1', confidence: 0.99 }],
        [glyphSignature(plusGlyph), { digit: '4', confidence: 0.99 }],
      ])
    );
    expect(refined).toBe(scanned);
    expect(refined[0].expressionText).toBe('2x+4=10');
    expect(refined[0].evaluation.display).toBe('x = 3');
  });

  it('leaves equations untouched when the classifier is unavailable', async () => {
    const six1 = six('six-1', 0);
    const six2 = six('six-2', 65);
    const strokes = [six1, ...plus(), six2];
    const scanned = OnDeviceStrokeRecognizer.scanEquations(strokes);
    const offline: NeuralGlyphClassifier = {
      ready: false,
      classifyGlyphs: async () => new Map(),
    };

    const refined = await refineEquationsWithNeural(scanned, strokes, offline);
    expect(refined).toBe(scanned);
  });
});
