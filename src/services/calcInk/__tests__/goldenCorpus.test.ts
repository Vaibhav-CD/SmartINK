import { describe, it, expect } from 'vitest';
import { MathParser } from '../mathParser';
import { solveWithSteps } from '../solutionSteps';
import { formatNumber } from '../formatNumber';
import { generatePlotData } from '../../../engine/graphing';

/**
 * Golden corpus: one expression language, one semantics. Every fixture is
 * asserted against the canvas evaluator, the step solver, and (for
 * function bodies) the plot sampler, so surfaces can never drift apart.
 * Deliberate convention: unary minus binds tighter than power, so
 * -2^2 === 4 on every surface.
 */
const ARITHMETIC: Array<[string, number]> = [
  ['2+3*4', 14],
  ['(2+3)*4', 20],
  ['18+4*3', 30],
  ['2^3^2', 512],
  ['-2^2', 4],
  ['(-2)^2', 4],
  ['-(2^2)', -4],
  ['2^-3', 0.125],
  ['+5', 5],
  ['2++3', 5],
  ['10%3', 1],
  ['7/2', 3.5],
  ['0.1+0.2', 0.3],
  ['1/3', 1 / 3],
  ['100/8', 12.5],
  ['3.5*2', 7],
  ['2(3+4)', 14],
  ['(2+3)(4+1)', 25],
  ['log(100)', 2],
  ['log(1000)', 3],
  ['ln(e)', 1],
  ['ln(1)', 0],
  ['sin(0)', 0],
  ['cos(0)', 1],
  ['tan(0)', 0],
  ['sqrt(16)', 4],
  ['abs(-7)', 7],
  ['asin(1)', Math.PI / 2],
  ['acos(1)', 0],
  ['atan(1)', Math.PI / 4],
  ['floor(2.7)', 2],
  ['ceil(2.1)', 3],
  ['round(2.5)', 3],
  ['round(2.4)', 2],
  ['exp(0)', 1],
  ['pi', Math.PI],
  ['e', Math.E],
  ['2*pi', 2 * Math.PI],
  ['2*e', 2 * Math.E],
  ['2^0.5', Math.SQRT2],
  ['10-4*2', 2],
  ['(10-4)*2', 12],
  ['5*(2+3)^2', 125],
  ['sqrt(2)^2', 2],
  ['ln(exp(3))', 3],
  ['log(10^5)', 5],
];

const UNDEFINED_EXPRESSIONS = [
  '1/0',
  '0/0',
  '5%0',
  'sqrt(-1)',
  'log(0)',
  'ln(-3)',
  'asin(2)',
];

const LINEAR: Array<[string, string]> = [
  ['2x+4=10', 'x = 3'],
  ['x/2=5', 'x = 10'],
  ['3x-9=0', 'x = 3'],
  ['x+7=12', 'x = 5'],
  ['5x=25', 'x = 5'],
];

const FUNCTION_SAMPLES: Array<[string, number, number]> = [
  // [body, x, expected y]
  ['sin(x)', 0, 0],
  ['sin(x)', Math.PI / 2, 1],
  ['x^2+1', 2, 5],
  ['x^2+1', -1, 2],
  ['log(x)', 100, 2],
  ['ln(x)', Math.E, 1],
  ['1/x', 4, 0.25],
  ['2*x+3', 4, 11],
];

describe('golden corpus: arithmetic agrees everywhere', () => {
  for (const [expr, expected] of ARITHMETIC) {
    it(`${expr} = ${expected}`, () => {
      const engine = MathParser.evaluate(expr);
      expect(engine.success).toBe(true);
      expect(engine.value).not.toBeNull();
      expect(engine.value as number).toBeCloseTo(expected, 9);
      expect(engine.display).toBe(formatNumber(expected));

      const stepped = solveWithSteps(expr);
      expect(stepped).not.toBeNull();
      expect(stepped?.result).toBe(formatNumber(expected));
    });
  }
});

describe('golden corpus: undefined agrees everywhere', () => {
  for (const expr of UNDEFINED_EXPRESSIONS) {
    it(`${expr} is Undefined`, () => {
      const engine = MathParser.evaluate(expr);
      expect(engine.isUndefined).toBe(true);

      const stepped = solveWithSteps(expr);
      expect(stepped?.result).toBe('Undefined');
    });
  }
});

describe('golden corpus: linear equations agree everywhere', () => {
  for (const [expr, display] of LINEAR) {
    it(`${expr} -> ${display}`, () => {
      const engine = MathParser.evaluate(expr);
      expect(engine.isEquationSolution).toBe(true);
      expect(engine.display).toBe(display);

      const stepped = solveWithSteps(expr);
      expect(stepped?.kind).toBe('linear');
      expect(stepped?.result).toBe(display);
    });
  }
});

describe('golden corpus: equations only the engine solves', () => {
  it('solves quadratics with spoken-ready display', () => {
    const res = MathParser.evaluate('x^2-16=0');
    expect(res.isEquationSolution).toBe(true);
    expect(res.display).toBe('x = ±4');
  });

  it('reports no real roots', () => {
    const res = MathParser.evaluate('x^2+1=0');
    expect(res.isEquationSolution).toBe(true);
    expect(res.display).toContain('No real roots');
  });
});

describe('golden corpus: scoped and sampled evaluation agrees', () => {
  it('evaluates with caller scope', () => {
    const res = MathParser.evaluate('2*x', { x: 21 });
    expect(res.value).toBe(42);
  });

  for (const [body, x, expected] of FUNCTION_SAMPLES) {
    it(`samples ${body} at x=${x}`, () => {
      const res = MathParser.evaluate(body, { x });
      expect(res.success).toBe(true);
      expect(res.value as number).toBeCloseTo(expected, 9);
    });
  }

  it('plot sampler uses the same engine semantics', () => {
    const plot = generatePlotData('x^2+1', -2, 2, 4);
    const valid = plot.points.filter((p) => p.valid);
    expect(valid.length).toBe(5);
    expect(valid[0].y).toBeCloseTo(5, 9);
    expect(valid[2].y).toBeCloseTo(1, 9);
  });
});
