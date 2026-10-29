import { describe, it, expect } from 'vitest';
import { generateSyntheticHandwritingStrokes } from '../engine/syntheticInk';

describe('Synthetic Handwriting Generator', () => {
  it('generates strokes matching the calculated answer string', () => {
    const origin = { x: 100, y: 150 };
    const strokes = generateSyntheticHandwritingStrokes('36', origin, {
      fontSize: 32,
      color: '#10b981',
      pageId: 'test-page',
    });

    expect(strokes.length).toBeGreaterThan(0);
    expect(strokes[0].pageId).toBe('test-page');
    expect(strokes[0].color).toBe('#10b981');
    expect(strokes[0].synthetic).toBe(true);
  });

  it('generates strokes for numbers with decimals and signs', () => {
    const origin = { x: 50, y: 50 };
    const strokes = generateSyntheticHandwritingStrokes('-15.4', origin, {
      pageId: 'page-1',
    });

    expect(strokes.length).toBeGreaterThan(0);
    // Bounding box should be calculated
    strokes.forEach((stroke) => {
      expect(stroke.bbox).toBeDefined();
      expect(stroke.bbox!.maxX).toBeGreaterThanOrEqual(stroke.bbox!.minX);
      expect(stroke.bbox!.maxY).toBeGreaterThanOrEqual(stroke.bbox!.minY);
    });
  });
});
