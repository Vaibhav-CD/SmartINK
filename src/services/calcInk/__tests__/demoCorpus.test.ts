import { describe, it, expect } from 'vitest';
import { MathParser } from '../mathParser';
import { solveWithSteps } from '../solutionSteps';
import { parseAndEvaluateExpression } from '../evaluateExpression';
import { generatePlotData } from '../../../engine/graphing';
import { OnDeviceStrokeRecognizer } from '../strokeRecognizer';
import type { Stroke } from '../../../types';

/**
 * Submission demo corpus: every beat of the live demo script, locked.
 * Handwritten beats use dense, pointer-event-like strokes (the way the
 * canvas actually records ink); typed beats use the store evaluator;
 * plot beats sample the same engine the plot widget draws with.
 */

const mk = (id: string, points: { x: number; y: number }[], t: number): Stroke => ({
  id, points, color: '#a3e635', width: 3, createdAt: t,
});

function densify(pts: { x: number; y: number }[], per = 6) {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    for (let j = 0; j < per; j++) {
      const f = j / per;
      out.push({ x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function ellipse(cx: number, cy: number, rx: number, ry: number, n = 28) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
}

describe('demo beat 1 (handwritten): 18+4x3= projects 30', () => {
  it('scans, evaluates with precedence, and steps to 30', () => {
    const strokes: Stroke[] = [
      mk('d1', [{ x: 20, y: 10 }, { x: 20, y: 50 }], 1000),
      mk('d8', [
        { x: 57, y: 32 }, { x: 45, y: 21 }, { x: 57, y: 10 },
        { x: 69, y: 21 }, { x: 57, y: 32 }, { x: 43, y: 43 },
        { x: 57, y: 54 }, { x: 71, y: 43 }, { x: 57, y: 32 },
      ], 1001),
      mk('plus-v', [{ x: 102, y: 22 }, { x: 102, y: 52 }], 1002),
      mk('plus-h', [{ x: 90, y: 37 }, { x: 115, y: 37 }], 1003),
      mk('four-l', [{ x: 150, y: 12 }, { x: 133, y: 37 }, { x: 157, y: 37 }], 1004),
      mk('four-v', [{ x: 150, y: 12 }, { x: 150, y: 52 }], 1005),
      mk('mul-a', [{ x: 177, y: 22 }, { x: 199, y: 50 }], 1006),
      mk('mul-b', [{ x: 199, y: 22 }, { x: 177, y: 50 }], 1007),
      mk('d3', [
        { x: 220, y: 20 }, { x: 260, y: 20 }, { x: 240, y: 48 },
        { x: 265, y: 65 }, { x: 240, y: 85 }, { x: 215, y: 78 },
      ], 1008),
      mk('eq-t', [{ x: 275, y: 30 }, { x: 305, y: 30 }], 1009),
      mk('eq-b', [{ x: 275, y: 44 }, { x: 305, y: 44 }], 1010),
    ];
    const eqs = OnDeviceStrokeRecognizer.scanEquations(strokes);
    expect(eqs.length).toBe(1);
    expect(eqs[0].hasUncertainGlyph).toBeFalsy();
    expect(eqs[0].evaluation.display).toBe('30');

    const stepped = solveWithSteps(eqs[0].expressionText);
    expect(stepped?.result).toBe('30');
    expect(stepped?.steps.map((s) => s.expression)).toEqual(['4 × 3 = 12', '18 + 12 = 30']);
  });
});

describe('demo beat 2 (handwritten): 2x+4=10 projects x = 3 with steps', () => {
  it('scans a dense-ink 2x+4=10 and solves it', () => {
    const strokes: Stroke[] = [
      mk('d2', densify([{ x: 25, y: 35 }, { x: 35, y: 18 }, { x: 65, y: 18 }, { x: 75, y: 35 }, { x: 60, y: 55 }, { x: 25, y: 85 }, { x: 75, y: 85 }]), 1),
      mk('x-a', [{ x: 87, y: 25 }, { x: 109, y: 53 }], 2),
      mk('x-b', [{ x: 109, y: 25 }, { x: 87, y: 53 }], 3),
      mk('p-v', [{ x: 132, y: 22 }, { x: 132, y: 52 }], 4),
      mk('p-h', [{ x: 120, y: 37 }, { x: 145, y: 37 }], 5),
      mk('f-l', [{ x: 180, y: 12 }, { x: 163, y: 37 }, { x: 187, y: 37 }], 6),
      mk('f-v', [{ x: 180, y: 12 }, { x: 180, y: 52 }], 7),
      mk('e-t', [{ x: 200, y: 35 }, { x: 225, y: 35 }], 8),
      mk('e-b', [{ x: 200, y: 49 }, { x: 225, y: 49 }], 9),
      mk('d1', [{ x: 245, y: 10 }, { x: 245, y: 50 }], 10),
      mk('d0', ellipse(285, 32, 20, 23), 11),
    ];
    const eqs = OnDeviceStrokeRecognizer.scanEquations(strokes);
    expect(eqs.length).toBe(1);
    expect(eqs[0].expressionText).toBe('2x+4=10');
    expect(eqs[0].hasUncertainGlyph).toBeFalsy();
    expect(eqs[0].evaluation.display).toBe('x = 3');

    const stepped = solveWithSteps(eqs[0].expressionText);
    expect(stepped?.kind).toBe('linear');
    expect(stepped?.steps.map((s) => s.expression)).toEqual(['2x+4 = 10', '2x = 6', 'x = 3']);
  });
});

describe('demo regression: exactly-closed zero (real canvas ink)', () => {
  it('classifies a zero whose pen returns exactly to its start point', () => {
    // Real canvas strokes land on integer world coordinates, so a drawn
    // '0' often closes exactly (last point == first point). That closure
    // contact must not be mistaken for a self-crossing figure-8 waist.
    const closed = ellipse(285, 32, 20, 23).map((p) => ({
      x: Math.round(p.x),
      y: Math.round(p.y),
    }));
    const glyph = OnDeviceStrokeRecognizer.classifyGlyph([mk('zero', closed, 1)]);
    expect(glyph.char).toBe('0');
    expect(glyph.confidence).toBeGreaterThanOrEqual(0.9);
  });
});

describe('demo beat 3 (typed living variables): r, h, then V = pi r^2 h', () => {
  it('assigns variables and evaluates the dependent formula', () => {
    const r = parseAndEvaluateExpression('r = 6');
    expect(r.isSolved).toBe(true);
    expect(r.isAssignment).toBe(true);
    expect(r.assignedVariable).toBe('r');
    expect(r.resultValue).toBe(6);

    const h = parseAndEvaluateExpression('h = 14');
    expect(h.isSolved).toBe(true);
    expect(h.assignedVariable).toBe('h');

    const v = parseAndEvaluateExpression('V = pi * r^2 * h =', { r: 6, h: 14 });
    expect(v.isSolved).toBe(true);
    expect(v.assignedVariable).toBe('V');
    expect(v.resultValue).toBeCloseTo(Math.PI * 36 * 14, 9);
    expect(v.formattedResult).toBe('1583.362697');
    expect(v.referencedVars).toEqual(expect.arrayContaining(['r', 'h']));
  });

  it('evaluates the typed arithmetic preset', () => {
    const res = parseAndEvaluateExpression('2 * (5 + 13) =');
    expect(res.isSolved).toBe(true);
    expect(res.formattedResult).toBe('36');
  });
});

describe('demo beat 4 (plots): sin(x) and x^2 - 4x + 3 in one frame', () => {
  it('recognizes typed function definitions', () => {
    const sin = parseAndEvaluateExpression('y = sin(x)');
    expect(sin.isFunction).toBe(true);
    expect(sin.functionData?.fnExpr).toBe('sin(x)');

    const quad = parseAndEvaluateExpression('f(x) = x^2 - 4x + 3');
    expect(quad.isFunction).toBe(true);
    expect(quad.functionData?.fnExpr).toBe('x^2 - 4x + 3');
  });

  it('samples sin(x) across its full range', () => {
    const plot = generatePlotData('sin(x)', -10, 10, 200);
    const valid = plot.points.filter((p) => p.valid);
    expect(valid.length).toBe(201);
    expect(Math.max(...valid.map((p) => p.y))).toBeGreaterThan(0.99);
    expect(Math.min(...valid.map((p) => p.y))).toBeLessThan(-0.99);
  });

  it('samples the quadratic through its roots and vertex', () => {
    const plot = generatePlotData('x^2 - 4x + 3', -10, 10, 200);
    const at = (x: number) => plot.points.find((p) => Math.abs(p.x - x) < 1e-9);
    expect(at(0)?.y).toBeCloseTo(3, 9);
    expect(at(1)?.y).toBeCloseTo(0, 9);
    expect(at(2)?.y).toBeCloseTo(-1, 9);
    expect(at(3)?.y).toBeCloseTo(0, 9);
  });
});

describe('demo beat 4b (handwritten plot): x with raised 2 is plottable', () => {
  it('scans x^2 (angular small 2, superscript position) as a function', () => {
    const strokes: Stroke[] = [
      mk('x-a', [{ x: 20, y: 25 }, { x: 45, y: 55 }], 1),
      mk('x-b', [{ x: 45, y: 25 }, { x: 20, y: 55 }], 2),
      // Small angular 2 raised into superscript position, dense ink.
      mk('sup2', densify([{ x: 56, y: 12 }, { x: 64, y: 7 }, { x: 73, y: 12 }, { x: 73, y: 19 }, { x: 58, y: 27 }, { x: 75, y: 27 }]), 3),
    ];
    const eqs = OnDeviceStrokeRecognizer.scanEquations(strokes);
    expect(eqs.length).toBe(1);
    expect(eqs[0].hasUncertainGlyph).toBeFalsy();
    expect(eqs[0].expressionText).toBe('x^2');
    expect(eqs[0].isPlottableFunction).toBe(true);
    expect(eqs[0].plotFunctionBody).toBe('x^2');
  });
});

describe('demo beat 5 (safety): division by zero shows Undefined, never a crash', () => {
  it('handles 1/0 on every surface', () => {
    expect(MathParser.evaluate('1/0').display).toBe('Undefined');
    expect(solveWithSteps('1/0')?.result).toBe('Undefined');
    const typed = parseAndEvaluateExpression('1/0 =');
    expect(typed.isSolved).toBe(false);
    expect(typed.error).toBeTruthy();
  });
});
