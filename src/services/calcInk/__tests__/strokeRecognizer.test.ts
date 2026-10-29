import { describe, it, expect } from 'vitest';
import { OnDeviceStrokeRecognizer } from '../strokeRecognizer';
import type { Stroke } from '../../../types';

describe('CalcInk On-Device Stroke Recognizer & Equation Scanner', () => {
  it('resamples stroke points uniformly', () => {
    const rawPoints = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const resampled = OnDeviceStrokeRecognizer.resample(rawPoints, 16);
    expect(resampled.length).toBe(16);
    expect(resampled[0].x).toBe(0);
    expect(resampled[15].x).toBe(100);
    expect(resampled[7].x).toBeCloseTo(46.6, 0);
  });

  it('classifies two horizontal parallel strokes as an equals sign "="', () => {
    const topBar: Stroke = {
      id: 'eq-top',
      points: [{ x: 50, y: 30 }, { x: 80, y: 30 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1000,
    };
    const bottomBar: Stroke = {
      id: 'eq-bot',
      points: [{ x: 50, y: 44 }, { x: 80, y: 44 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1001,
    };

    const result = OnDeviceStrokeRecognizer.classifyGlyph([topBar, bottomBar]);
    expect(result.char).toBe('=');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('classifies single horizontal stroke as minus "-"', () => {
    const minusStroke: Stroke = {
      id: 'minus',
      points: [{ x: 10, y: 20 }, { x: 40, y: 20 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1000,
    };

    const result = OnDeviceStrokeRecognizer.classifyGlyph([minusStroke]);
    expect(result.char).toBe('-');
  });

  it('classifies vertical stroke as "1"', () => {
    const oneStroke: Stroke = {
      id: 'digit-1',
      points: [{ x: 20, y: 10 }, { x: 20, y: 50 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1000,
    };

    const result = OnDeviceStrokeRecognizer.classifyGlyph([oneStroke]);
    expect(result.char).toBe('1');
  });

  it('classifies handwritten stroke with lower loop as digit "6"', () => {
    // 6 trajectory: start top-right (x: 40, y: 10), curve down-left (x: 10, y: 50),
    // curve bottom-right (x: 40, y: 55), loop up-left (x: 15, y: 35)
    const sixStroke: Stroke = {
      id: 'digit-6',
      points: [
        { x: 38, y: 12 },
        { x: 25, y: 20 },
        { x: 14, y: 35 },
        { x: 12, y: 48 },
        { x: 20, y: 58 },
        { x: 35, y: 58 },
        { x: 40, y: 45 },
        { x: 32, y: 36 },
        { x: 18, y: 38 },
      ],
      color: '#a3e635',
      width: 3,
      createdAt: 1000,
    };

    const result = OnDeviceStrokeRecognizer.classifyGlyph([sixStroke]);
    expect(result.char).toBe('6');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('scans an equation "6 + 6" without equals sign and projects "= 12"', () => {
    // Six 1
    const six1: Stroke = {
      id: 'six-1',
      points: [
        { x: 20, y: 15 },
        { x: 12, y: 35 },
        { x: 10, y: 50 },
        { x: 20, y: 55 },
        { x: 30, y: 45 },
        { x: 15, y: 40 },
      ],
      color: '#a3e635',
      width: 3,
      createdAt: 1000,
    };

    // Plus '+' (2 strokes)
    const plusV: Stroke = {
      id: 'plus-v',
      points: [{ x: 50, y: 25 }, { x: 50, y: 55 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1001,
    };
    const plusH: Stroke = {
      id: 'plus-h',
      points: [{ x: 38, y: 40 }, { x: 62, y: 40 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1002,
    };

    // Six 2
    const six2: Stroke = {
      id: 'six-2',
      points: [
        { x: 85, y: 15 },
        { x: 77, y: 35 },
        { x: 75, y: 50 },
        { x: 85, y: 55 },
        { x: 95, y: 45 },
        { x: 80, y: 40 },
      ],
      color: '#a3e635',
      width: 3,
      createdAt: 1003,
    };

    const equations = OnDeviceStrokeRecognizer.scanEquations([six1, plusV, plusH, six2]);
    expect(equations.length).toBe(1);
    expect(equations[0].expressionText).toBe('6+6');
    expect(equations[0].evaluation.value).toBe(12);
    expect(equations[0].evaluation.display).toBe('12');
    expect(equations[0].anchorPosition.x).toBeGreaterThan(95);
  });

  it('keeps separate equations and numbers isolated on the same slide (e.g. 3+3 and 6 elsewhere)', () => {
    // Equation 1: 1 + 1 (left side of canvas: x between 20 and 90)
    const stroke1: Stroke = {
      id: 's1',
      points: [{ x: 20, y: 30 }, { x: 20, y: 70 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1000,
    };
    const plusV: Stroke = {
      id: 'plus-v',
      points: [{ x: 45, y: 35 }, { x: 45, y: 65 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1001,
    };
    const plusH: Stroke = {
      id: 'plus-h',
      points: [{ x: 32, y: 50 }, { x: 58, y: 50 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1002,
    };
    const stroke2: Stroke = {
      id: 's2',
      points: [{ x: 75, y: 30 }, { x: 75, y: 70 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1003,
    };

    // User moved to another area on the same canvas (x: 250) and wrote digit 6
    const independent6: Stroke = {
      id: 'indep-6',
      points: [
        { x: 260, y: 30 },
        { x: 245, y: 50 },
        { x: 240, y: 65 },
        { x: 255, y: 70 },
        { x: 265, y: 60 },
        { x: 248, y: 52 },
      ],
      color: '#a3e635',
      width: 3,
      createdAt: 2000,
    };

    const equations = OnDeviceStrokeRecognizer.scanEquations([
      stroke1,
      plusV,
      plusH,
      stroke2,
      independent6,
    ]);

    // Only 1 equation should be evaluated (1 + 1 = 2)
    // The independent digit 6 is NOT appended to 1 + 1!
    expect(equations.length).toBe(1);
    expect(equations[0].expressionText).toBe('1+1');
    expect(equations[0].evaluation.value).toBe(2);
    expect(equations[0].evaluation.display).toBe('2');
  });

  it('scans MULTIPLE distinct workouts on the same canvas (top & bottom)', () => {
    // Equation 1 at top: 1 + 1 (y around 30..70)
    const eq1_s1: Stroke = {
      id: 'eq1-s1',
      points: [{ x: 20, y: 30 }, { x: 20, y: 70 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1000,
    };
    const eq1_plusV: Stroke = {
      id: 'eq1-plus-v',
      points: [{ x: 45, y: 35 }, { x: 45, y: 65 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1001,
    };
    const eq1_plusH: Stroke = {
      id: 'eq1-plus-h',
      points: [{ x: 32, y: 50 }, { x: 58, y: 50 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1002,
    };
    const eq1_s2: Stroke = {
      id: 'eq1-s2',
      points: [{ x: 75, y: 30 }, { x: 75, y: 70 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1003,
    };

    // Equation 2 further down (y around 200..250): 1 - 1
    const eq2_s1: Stroke = {
      id: 'eq2-s1',
      points: [{ x: 20, y: 200 }, { x: 20, y: 240 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1004,
    };
    const eq2_minus: Stroke = {
      id: 'eq2-minus',
      points: [{ x: 40, y: 220 }, { x: 65, y: 220 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1005,
    };
    const eq2_s2: Stroke = {
      id: 'eq2-s2',
      points: [{ x: 80, y: 200 }, { x: 80, y: 240 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1006,
    };

    const allStrokes = [eq1_s1, eq1_plusV, eq1_plusH, eq1_s2, eq2_s1, eq2_minus, eq2_s2];
    const equations = OnDeviceStrokeRecognizer.scanEquations(allStrokes);

    // Both equations must be recognized independently on the single canvas!
    expect(equations.length).toBe(2);
    expect(equations[0].expressionText).toBe('1+1');
    expect(equations[0].evaluation.value).toBe(2);

    expect(equations[1].expressionText).toBe('1-1');
    expect(equations[1].evaluation.value).toBe(0);
  });

  it('classifies parenthesis tokens "(" and ")"', () => {
    // Open paren (arc curving rightwards)
    const openParen: Stroke = {
      id: 'open-p',
      points: [
        { x: 30, y: 10 },
        { x: 15, y: 30 },
        { x: 12, y: 50 },
        { x: 15, y: 70 },
        { x: 30, y: 90 },
      ],
      color: '#a3e635',
      width: 3,
      createdAt: 1000,
    };
    const resOpen = OnDeviceStrokeRecognizer.classifyGlyph([openParen]);
    expect(resOpen.char).toBe('(');

    // Close paren (arc curving leftwards)
    const closeParen: Stroke = {
      id: 'close-p',
      points: [
        { x: 12, y: 10 },
        { x: 27, y: 30 },
        { x: 30, y: 50 },
        { x: 27, y: 70 },
        { x: 12, y: 90 },
      ],
      color: '#a3e635',
      width: 3,
      createdAt: 1001,
    };
    const resClose = OnDeviceStrokeRecognizer.classifyGlyph([closeParen]);
    expect(resClose.char).toBe(')');
  });

  it('accurately recognizes two-stroke "+" whether horizontal or vertical was written first', () => {
    // Horizontal first
    const plusH: Stroke = {
      id: 'h-1',
      points: [{ x: 50, y: 50 }, { x: 80, y: 50 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1000,
    };
    const plusV: Stroke = {
      id: 'v-1',
      points: [{ x: 65, y: 35 }, { x: 65, y: 65 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1001,
    };

    const resHV = OnDeviceStrokeRecognizer.classifyGlyph([plusH, plusV]);
    expect(resHV.char).toBe('+');
    expect(resHV.confidence).toBeGreaterThanOrEqual(0.95);

    // Vertical first
    const resVH = OnDeviceStrokeRecognizer.classifyGlyph([plusV, plusH]);
    expect(resVH.char).toBe('+');
    expect(resVH.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('scans an equation with 2D fraction layout: 6 over 1', () => {
    // Numerator: '6' above at y ~ 10..45
    const num6: Stroke = {
      id: 'num-6',
      points: [
        { x: 38, y: 12 },
        { x: 25, y: 20 },
        { x: 14, y: 30 },
        { x: 12, y: 40 },
        { x: 20, y: 46 },
        { x: 35, y: 46 },
        { x: 40, y: 35 },
        { x: 32, y: 28 },
        { x: 18, y: 30 },
      ],
      color: '#a3e635',
      width: 3,
      createdAt: 1000,
    };
    // Horizontal fraction bar at y = 52
    const fracBar: Stroke = {
      id: 'frac-bar',
      points: [{ x: 8, y: 52 }, { x: 50, y: 52 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1001,
    };
    // Denominator: '1' below at y ~ 60..85
    const den1: Stroke = {
      id: 'den-1',
      points: [{ x: 28, y: 60 }, { x: 28, y: 85 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1002,
    };

    const equations = OnDeviceStrokeRecognizer.scanEquations([num6, fracBar, den1]);
    expect(equations.length).toBe(1);
    expect(equations[0].expressionText).toContain('/');
    expect(equations[0].evaluation.value).toBe(6);
  });

  it('solves algebraic equation with unknown variable: recognizes and evaluates x solution', () => {
    // 1 * x = 1 (where '1', 'x', '=', '1')
    const stroke1: Stroke = {
      id: 's-1',
      points: [{ x: 20, y: 10 }, { x: 20, y: 50 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1000,
    };
    // x (single continuous stroke crossing diagonals)
    const strokeX: Stroke = {
      id: 's-x',
      points: [
        { x: 40, y: 15 },
        { x: 55, y: 40 },
        { x: 70, y: 65 },
        { x: 70, y: 15 },
        { x: 55, y: 40 },
        { x: 40, y: 65 },
      ],
      color: '#a3e635',
      width: 3,
      createdAt: 1001,
    };
    // = top and bot
    const eqTop: Stroke = {
      id: 'eq-t',
      points: [{ x: 85, y: 32 }, { x: 110, y: 32 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1002,
    };
    const eqBot: Stroke = {
      id: 'eq-b',
      points: [{ x: 85, y: 45 }, { x: 110, y: 45 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1003,
    };
    // 1 RHS
    const strokeRHS: Stroke = {
      id: 's-rhs',
      points: [{ x: 125, y: 10 }, { x: 125, y: 50 }],
      color: '#a3e635',
      width: 3,
      createdAt: 1004,
    };

    const equations = OnDeviceStrokeRecognizer.scanEquations([stroke1, strokeX, eqTop, eqBot, strokeRHS]);
    expect(equations.length).toBe(1);
    expect(equations[0].evaluation.isEquationSolution).toBe(true);
    expect(equations[0].evaluation.display).toContain('x =');
  });

  it('keeps distinct adjacent characters separated and does not erroneously merge them', () => {
    // Digit 1
    const d1: Stroke = {
      id: 'd1',
      points: [{ x: 10, y: 10 }, { x: 10, y: 50 }],
      color: '#fff',
      width: 2,
      createdAt: 1,
    };
    // Digit 2 placed 20px to the right
    const d2: Stroke = {
      id: 'd2',
      points: [
        { x: 30, y: 20 },
        { x: 45, y: 15 },
        { x: 50, y: 25 },
        { x: 30, y: 50 },
        { x: 50, y: 50 },
      ],
      color: '#fff',
      width: 2,
      createdAt: 2,
    };

    expect(OnDeviceStrokeRecognizer.areStrokesSameGlyph(d1, d2)).toBe(false);
  });

  it('parses expressions and recognizes plottable function curves', () => {
    const parsed = OnDeviceStrokeRecognizer.parseClusterToExpression([
      {
        id: 's1',
        points: [{ x: 10, y: 20 }, { x: 10, y: 50 }],
        color: '#fff',
        width: 2,
        createdAt: 1,
      },
    ]);
    expect(parsed.expressionStr).toBeTruthy();
  });
});
