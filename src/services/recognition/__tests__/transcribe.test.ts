import { describe, it, expect } from 'vitest';
import {
  transcribeWords,
  defaultGlyphClassify,
  type GlyphClassifier,
  type GlyphClusterer,
} from '../transcribe';
import type { Stroke } from '../../../types';

function stroke(id: string, x: number, y = 0, w = 20, h = 30): Stroke {
  return {
    id,
    points: [
      { x, y },
      { x: x + w, y: y + h },
    ],
    color: '#fff',
    width: 3,
    createdAt: 1,
  };
}

describe('transcribeWords', () => {
  it('returns no words for empty strokes', () => {
    expect(transcribeWords([])).toEqual([]);
  });

  it('groups nearby glyphs into words and splits on wide gaps', () => {
    const strokes = [
      stroke('h', 0),
      stroke('i', 24),
      stroke('b', 200),
      stroke('y', 224),
    ];
    const cluster: GlyphClusterer = (list) => list.map((s) => [s]);
    const classify: GlyphClassifier = (glyph) => ({
      char: glyph[0].id,
      confidence: 0.95,
    });

    const words = transcribeWords(strokes, classify, cluster);
    expect(words.map((w) => w.text)).toEqual(['hi', 'by']);
    expect(words[0].strokeIds).toEqual(['h', 'i']);
    expect(words[0].confidence).toBeCloseTo(0.95);
    expect(words[0].box.minX).toBe(0);
  });

  it('treats math operators as word separators', () => {
    const strokes = [stroke('x', 0), stroke('eq', 30), stroke('1', 60)];
    const cluster: GlyphClusterer = (list) => list.map((s) => [s]);
    const chars: Record<string, string> = { x: 'x', eq: '=', '1': '1' };
    const classify: GlyphClassifier = (glyph) => ({
      char: chars[glyph[0].id],
      confidence: 0.9,
    });

    const words = transcribeWords(strokes, classify, cluster);
    expect(words.map((w) => w.text)).toEqual(['x', '1']);
  });

  it('splits glyphs on separate lines into separate words', () => {
    const strokes = [stroke('a', 0, 0), stroke('b', 0, 200)];
    const cluster: GlyphClusterer = (list) => list.map((s) => [s]);
    const classify: GlyphClassifier = (glyph) => ({
      char: glyph[0].id,
      confidence: 1,
    });

    const words = transcribeWords(strokes, classify, cluster);
    expect(words.map((w) => w.text)).toEqual(['a', 'b']);
  });
});

describe('defaultGlyphClassify', () => {
  it('keeps confident geometric math symbols', () => {
    const eq: Stroke[] = [
      {
        id: 't1',
        points: [
          { x: 0, y: 0 },
          { x: 40, y: 0 },
        ],
        color: '#fff',
        width: 3,
        createdAt: 1,
      },
      {
        id: 't2',
        points: [
          { x: 0, y: 14 },
          { x: 40, y: 14 },
        ],
        color: '#fff',
        width: 3,
        createdAt: 2,
      },
    ];
    expect(defaultGlyphClassify(eq).char).toBe('=');
  });

  it('recognizes a cross glyph as x through either path', () => {
    const cross: Stroke[] = [
      {
        id: 'c1',
        points: [
          { x: 20, y: 20 },
          { x: 50, y: 50 },
          { x: 80, y: 80 },
        ],
        color: '#fff',
        width: 3,
        createdAt: 1,
      },
      {
        id: 'c2',
        points: [
          { x: 80, y: 20 },
          { x: 50, y: 50 },
          { x: 20, y: 80 },
        ],
        color: '#fff',
        width: 3,
        createdAt: 2,
      },
    ];
    expect(defaultGlyphClassify(cross).char).toBe('x');
  });
});
