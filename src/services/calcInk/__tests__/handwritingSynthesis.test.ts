import { describe, it, expect } from 'vitest';
import { HandwritingVectorSynthesizer } from '../handwritingSynthesis';

describe('HandwritingVectorSynthesizer (Apple Math Notes Style)', () => {
  it('synthesizes vector strokes for a basic arithmetic answer "= 12"', () => {
    const strokes = HandwritingVectorSynthesizer.synthesize(
      '= 12',
      { x: 100, y: 150 },
      { color: '#a3e635', avgStrokeWidth: 3.5, slantAngle: 5 }
    );

    expect(strokes.length).toBeGreaterThan(0);
    // '=' has 2 strokes, '1' has 1 stroke, '2' has 1 stroke -> total 4 strokes
    expect(strokes.length).toBe(4);

    // Verify all strokes have points, valid coordinates, color, and width
    for (const stroke of strokes) {
      expect(stroke.points.length).toBeGreaterThan(5);
      expect(stroke.color).toBe('#a3e635');
      expect(stroke.width).toBe(3.5);
      expect(stroke.points[0].x).toBeGreaterThanOrEqual(100);
      expect(stroke.points[0].y).toBeGreaterThanOrEqual(140);
    }
  });

  it('synthesizes algebraic equation solution "x = 3"', () => {
    const strokes = HandwritingVectorSynthesizer.synthesize(
      'x = 3',
      { x: 50, y: 80 },
      { color: '#38bdf8', avgStrokeWidth: 4, slantAngle: -10 }
    );

    expect(strokes.length).toBeGreaterThanOrEqual(4);
    expect(strokes[0].color).toBe('#38bdf8');
    expect(strokes[0].width).toBe(4);
  });

  it('synthesizes quadratic roots with plus-minus symbol "± 4"', () => {
    const strokes = HandwritingVectorSynthesizer.synthesize(
      '± 4',
      { x: 200, y: 200 }
    );

    expect(strokes.length).toBeGreaterThanOrEqual(4);
  });

  it('handles empty strings gracefully', () => {
    const strokes = HandwritingVectorSynthesizer.synthesize(
      '',
      { x: 0, y: 0 }
    );
    expect(strokes).toEqual([]);
  });

  it('renders every lowercase letter as real ink', () => {
    for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
      const strokes = HandwritingVectorSynthesizer.synthesize(
        ch,
        { x: 10, y: 10 },
        { color: '#a3e635', avgStrokeWidth: 3.5, slantAngle: 0 }
      );
      expect(strokes.length).toBeGreaterThan(0);
      for (const s of strokes) {
        expect(s.points.length).toBeGreaterThan(1);
        expect(s.points.every((p) => isFinite(p.x) && isFinite(p.y))).toBe(true);
      }
    }
  });

  it('renders every uppercase letter as real ink', () => {
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const strokes = HandwritingVectorSynthesizer.synthesize(
        ch,
        { x: 10, y: 10 },
        { color: '#a3e635', avgStrokeWidth: 3.5, slantAngle: 0 }
      );
      expect(strokes.length).toBeGreaterThan(0);
    }
  });

  it('writes a full word advancing left to right', () => {
    const strokes = HandwritingVectorSynthesizer.synthesize(
      'Taylor',
      { x: 100, y: 100 },
      { color: '#a3e635', avgStrokeWidth: 3.5, slantAngle: 0 }
    );
    expect(strokes.length).toBeGreaterThan(6);
    const firstX = strokes[0].points[0].x;
    const lastStroke = strokes[strokes.length - 1];
    const lastX = lastStroke.points[lastStroke.points.length - 1].x;
    expect(lastX).toBeGreaterThan(firstX + 50);
  });

  it('marks all generated strokes as synthetic so recognition skips them', () => {
    const strokes = HandwritingVectorSynthesizer.synthesize(
      '= 12',
      { x: 100, y: 100 },
      { color: '#a3e635', avgStrokeWidth: 3.5, slantAngle: 0 }
    );
    expect(strokes.length).toBeGreaterThan(0);
    for (const s of strokes) {
      expect(s.synthetic).toBe(true);
    }
  });
});
