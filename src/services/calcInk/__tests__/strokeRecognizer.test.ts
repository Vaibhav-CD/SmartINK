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

describe('Synthetic ink exclusion (projected answers never feed back into recognition)', () => {
  // User-written "6 + 6" (same geometry as the baseline scan test).
  function userEquation(): Stroke[] {
    const mk = (id: string, points: { x: number; y: number }[], createdAt: number): Stroke => ({
      id,
      points,
      color: '#a3e635',
      width: 3,
      createdAt,
    });
    return [
      mk('six-1', [
        { x: 20, y: 15 }, { x: 12, y: 35 }, { x: 10, y: 50 },
        { x: 20, y: 55 }, { x: 30, y: 45 }, { x: 15, y: 40 },
      ], 1000),
      mk('plus-v', [{ x: 50, y: 25 }, { x: 50, y: 55 }], 1001),
      mk('plus-h', [{ x: 38, y: 40 }, { x: 62, y: 40 }], 1002),
      mk('six-2', [
        { x: 85, y: 15 }, { x: 77, y: 35 }, { x: 75, y: 50 },
        { x: 85, y: 55 }, { x: 95, y: 45 }, { x: 80, y: 40 },
      ], 1003),
    ];
  }

  // Synthesized "= 12" answer ink adjacent to the equation, as handleWriteInInk places it.
  function syntheticAnswer(): Stroke[] {
    const mk = (id: string, points: { x: number; y: number }[]): Stroke => ({
      id,
      points,
      color: '#a3e635',
      width: 3,
      createdAt: 2000,
      synthetic: true,
    });
    return [
      mk('syn-eq-t', [{ x: 105, y: 30 }, { x: 130, y: 30 }]),
      mk('syn-eq-b', [{ x: 105, y: 44 }, { x: 130, y: 44 }]),
      mk('syn-1', [{ x: 140, y: 22 }, { x: 140, y: 52 }]),
      mk('syn-2', [
        { x: 150, y: 25 }, { x: 162, y: 25 }, { x: 162, y: 35 },
        { x: 150, y: 50 }, { x: 165, y: 50 },
      ]),
    ];
  }

  it('scans the same equation with or without synthetic answer ink present', () => {
    const base = OnDeviceStrokeRecognizer.scanEquations(userEquation());
    const mixed = OnDeviceStrokeRecognizer.scanEquations([...userEquation(), ...syntheticAnswer()]);
    expect(base.length).toBe(1);
    expect(base[0].expressionText).toBe('6+6');
    expect(mixed.length).toBe(1);
    expect(mixed[0].expressionText).toBe(base[0].expressionText);
    expect(mixed[0].evaluation.display).toBe(base[0].evaluation.display);
    expect(mixed[0].anchorPosition.x).toBe(base[0].anchorPosition.x);
  });

  it('returns no equations for synthetic-only strokes', () => {
    expect(OnDeviceStrokeRecognizer.scanEquations(syntheticAnswer())).toEqual([]);
  });

  it('recognizeStrokeGroup ignores synthetic strokes in a circled selection', () => {
    const res = OnDeviceStrokeRecognizer.recognizeStrokeGroup([...userEquation(), ...syntheticAnswer()]);
    expect(res?.expressionText).toBe('6+6');
  });
});

describe('PS spec example end-to-end (strokes → 30)', () => {
  it('scans handwritten "18+4×3=" and evaluates to 30 with precedence', () => {
    const mk = (id: string, points: { x: number; y: number }[], createdAt: number): Stroke => ({
      id, points, color: '#a3e635', width: 3, createdAt,
    });
    const strokes: Stroke[] = [
      // '1'
      mk('d1', [{ x: 20, y: 10 }, { x: 20, y: 50 }], 1000),
      // '8' (figure-8, template-shaped)
      mk('d8', [
        { x: 57, y: 32 }, { x: 45, y: 21 }, { x: 57, y: 10 },
        { x: 69, y: 21 }, { x: 57, y: 32 }, { x: 43, y: 43 },
        { x: 57, y: 54 }, { x: 71, y: 43 }, { x: 57, y: 32 },
      ], 1001),
      // '+' (two strokes)
      mk('plus-v', [{ x: 102, y: 22 }, { x: 102, y: 52 }], 1002),
      mk('plus-h', [{ x: 90, y: 37 }, { x: 115, y: 37 }], 1003),
      // '4' (L + vertical)
      mk('four-l', [{ x: 150, y: 12 }, { x: 133, y: 37 }, { x: 157, y: 37 }], 1004),
      mk('four-v', [{ x: 150, y: 12 }, { x: 150, y: 52 }], 1005),
      // '×' (two crossing diagonals)
      mk('mul-a', [{ x: 177, y: 22 }, { x: 199, y: 50 }], 1006),
      mk('mul-b', [{ x: 199, y: 22 }, { x: 177, y: 50 }], 1007),
      // '3' (template-shaped)
      mk('d3', [
        { x: 220, y: 20 }, { x: 260, y: 20 }, { x: 240, y: 48 },
        { x: 265, y: 65 }, { x: 240, y: 85 }, { x: 215, y: 78 },
      ], 1008),
      // '=' (two bars)
      mk('eq-t', [{ x: 275, y: 30 }, { x: 305, y: 30 }], 1009),
      mk('eq-b', [{ x: 275, y: 44 }, { x: 305, y: 44 }], 1010),
    ];

    const equations = OnDeviceStrokeRecognizer.scanEquations(strokes);
    expect(equations.length).toBe(1);
    expect(equations[0].evaluation.value).toBe(30);
    expect(equations[0].evaluation.display).toBe('30');
  });

  it('classifies a two-stroke L + stem as digit "4", not "+"', () => {
    const l: Stroke = {
      id: 'four-l', points: [{ x: 150, y: 12 }, { x: 133, y: 37 }, { x: 157, y: 37 }],
      color: '#a3e635', width: 3, createdAt: 1,
    };
    const v: Stroke = {
      id: 'four-v', points: [{ x: 150, y: 12 }, { x: 150, y: 52 }],
      color: '#a3e635', width: 3, createdAt: 2,
    };
    expect(OnDeviceStrokeRecognizer.classifyGlyph([l, v]).char).toBe('4');
  });

  it('classifies two crossing diagonals as "x" (parser promotes digit-x-digit to ×)', () => {
    const a: Stroke = {
      id: 'mul-a', points: [{ x: 177, y: 22 }, { x: 199, y: 50 }],
      color: '#a3e635', width: 3, createdAt: 1,
    };
    const b: Stroke = {
      id: 'mul-b', points: [{ x: 199, y: 22 }, { x: 177, y: 50 }],
      color: '#a3e635', width: 3, createdAt: 2,
    };
    expect(OnDeviceStrokeRecognizer.classifyGlyph([a, b]).char).toBe('x');
  });

  it('keeps variable "x" a variable outside digit-digit context (2x=6 → x = 3)', () => {
    const mk = (id: string, points: { x: number; y: number }[], createdAt: number): Stroke => ({
      id, points, color: '#a3e635', width: 3, createdAt,
    });
    const equations = OnDeviceStrokeRecognizer.scanEquations([
      mk('d2', [
        { x: 25, y: 35 }, { x: 35, y: 18 }, { x: 65, y: 18 }, { x: 75, y: 35 },
        { x: 60, y: 55 }, { x: 25, y: 85 }, { x: 75, y: 85 },
      ], 1),
      mk('x-a', [{ x: 87, y: 25 }, { x: 109, y: 53 }], 2),
      mk('x-b', [{ x: 109, y: 25 }, { x: 87, y: 53 }], 3),
      mk('eq-t', [{ x: 120, y: 35 }, { x: 145, y: 35 }], 4),
      mk('eq-b', [{ x: 120, y: 49 }, { x: 145, y: 49 }], 5),
      mk('d6', [
        { x: 165, y: 15 }, { x: 157, y: 35 }, { x: 155, y: 50 },
        { x: 165, y: 55 }, { x: 175, y: 45 }, { x: 160, y: 40 },
      ], 6),
    ]);
    expect(equations.length).toBe(1);
    expect(equations[0].expressionText).toBe('2x=6');
    expect(equations[0].evaluation.display).toBe('x = 3');
  });

  it('gates unrecognizable ink to an uncertain state instead of a wrong answer', () => {
    const mk = (id: string, points: { x: number; y: number }[], createdAt: number): Stroke => ({
      id, points, color: '#a3e635', width: 3, createdAt,
    });
    // Random-walk scribble: cloud and ladder disagree, so it is gated.
    const swoosh = mk('swoosh', [
      { x: 132, y: 130 }, { x: 158, y: 112 }, { x: 150, y: 155 }, { x: 182, y: 140 },
      { x: 168, y: 178 }, { x: 200, y: 162 }, { x: 186, y: 188 }, { x: 210, y: 130 },
      { x: 142, y: 182 }, { x: 164, y: 160 }, { x: 135, y: 145 }, { x: 178, y: 118 },
    ], 4);
    expect(OnDeviceStrokeRecognizer.classifyGlyph([swoosh]).confidence).toBeLessThan(0.6);

    const six = mk('d6', [
      { x: 30, y: 115 }, { x: 22, y: 135 }, { x: 20, y: 150 },
      { x: 30, y: 155 }, { x: 40, y: 145 }, { x: 25, y: 140 },
    ], 1);
    const plusV = mk('plus-v', [{ x: 72, y: 135 }, { x: 72, y: 155 }], 2);
    const plusH = mk('plus-h', [{ x: 60, y: 145 }, { x: 85, y: 145 }], 3);

    const equations = OnDeviceStrokeRecognizer.scanEquations([six, plusV, plusH, swoosh]);
    expect(equations.length).toBe(1);
    expect(equations[0].expressionText).toBe('6+?');
    expect(equations[0].hasUncertainGlyph).toBe(true);
    expect(equations[0].evaluation.success).toBe(false);
    expect(equations[0].evaluation.display).toBe('Unrecognized glyph');
    expect(Array.isArray(equations[0].uncertainAlternatives)).toBe(true);

    expect(OnDeviceStrokeRecognizer.recognizeStrokeGroup([six, plusV, plusH, swoosh])).toBeNull();
  });

  it('scans a 500-stroke page within the interaction budget', () => {
    const strokes: Stroke[] = [];
    let t = 0;
    for (let row = 0; row < 125; row++) {
      const y = row * 120;
      const mk = (id: string, points: { x: number; y: number }[]): Stroke => ({
        id: `${id}-${row}`, points, color: '#a3e635', width: 3, createdAt: t++,
      });
      strokes.push(
        mk('one-a', [{ x: 20, y: y + 30 }, { x: 20, y: y + 70 }]),
        mk('plus-v', [{ x: 45, y: y + 35 }, { x: 45, y: y + 65 }]),
        mk('plus-h', [{ x: 32, y: y + 50 }, { x: 58, y: y + 50 }]),
        mk('one-b', [{ x: 75, y: y + 30 }, { x: 75, y: y + 70 }])
      );
    }
    expect(strokes.length).toBe(500);

    const start = performance.now();
    const equations = OnDeviceStrokeRecognizer.scanEquations(strokes);
    const elapsed = performance.now() - start;

    expect(equations.length).toBe(125);
    expect(equations[0].evaluation.display).toBe('2');
    expect(elapsed).toBeLessThan(3000);
  });
});
