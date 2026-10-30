import { describe, it, expect } from 'vitest';
import { parseAndEvaluateExpression } from '../services/calcInk/evaluateExpression';

describe('parseAndEvaluateExpression (calcInk adapter)', () => {
  it('evaluates arithmetic expressions ending with =', () => {
    const res = parseAndEvaluateExpression('2 * (5 + 13) =');
    expect(res.isSolved).toBe(true);
    expect(res.resultValue).toBe(36);
    expect(res.formattedResult).toBe('36');
  });

  it('handles variable assignment like r = 5', () => {
    const res = parseAndEvaluateExpression('r = 5');
    expect(res.isSolved).toBe(true);
    expect(res.isAssignment).toBe(true);
    expect(res.assignedVariable).toBe('r');
    expect(res.resultValue).toBe(5);
  });

  it('evaluates dependent downstream equations with scope', () => {
    const scope = { r: 5, h: 12 };
    const res = parseAndEvaluateExpression('V = pi * r^2 * h =', scope);
    expect(res.isSolved).toBe(true);
    expect(res.isAssignment).toBe(true);
    expect(res.assignedVariable).toBe('V');
    // V = pi * 25 * 12 = 300 * pi ~= 942.4778
    expect(res.resultValue).toBeCloseTo(300 * Math.PI, 4);
    expect(res.referencedVars).toContain('r');
    expect(res.referencedVars).toContain('h');
  });

  it('detects 2D function equations like y = sin(x)', () => {
    const res = parseAndEvaluateExpression('y = sin(x)');
    expect(res.isSolved).toBe(true);
    expect(res.isFunction).toBe(true);
    expect(res.functionData?.fnExpr).toBe('sin(x)');
    expect(res.functionData?.varName).toBe('x');
  });

  it('detects 2D function equations like f(x) = x^2 - 4x + 3', () => {
    const res = parseAndEvaluateExpression('f(x) = x^2 - 4x + 3');
    expect(res.isSolved).toBe(true);
    expect(res.isFunction).toBe(true);
    expect(res.functionData?.fnExpr).toBe('x^2 - 4x + 3');
  });

  it('leaves bare expressions unsolved (legacy contract)', () => {
    const res = parseAndEvaluateExpression('2 + 3');
    expect(res.isSolved).toBe(false);
  });

  it('reports division by zero as unsolved with an error', () => {
    const res = parseAndEvaluateExpression('1 / 0 =');
    expect(res.isSolved).toBe(false);
    expect(res.error).toBeDefined();
  });
});
