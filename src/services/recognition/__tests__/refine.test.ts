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
