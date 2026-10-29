import { describe, it, expect } from 'vitest';
import { solveWithSteps } from '../solutionSteps';

describe('solveWithSteps arithmetic', () => {
  it('traces operations in BODMAS order', () => {
    const solved = solveWithSteps('2+3*4');
    expect(solved?.kind).toBe('arithmetic');
    expect(solved?.result).toBe('14');
    expect(solved?.steps.map((s) => s.expression)).toEqual([
      '3 × 4 = 12',
      '2 + 12 = 14',
    ]);
  });

  it('evaluates parentheses before outer operations', () => {
    const solved = solveWithSteps('(2+3)*4');
    expect(solved?.result).toBe('20');
    expect(solved?.steps.map((s) => s.expression)).toEqual([
      '2 + 3 = 5',
      '5 × 4 = 20',
    ]);
  });

  it('tolerates a trailing equals sign', () => {
    const solved = solveWithSteps('18+4*3=');
    expect(solved?.result).toBe('30');
  });

  it('reports Undefined for division by zero', () => {
    const solved = solveWithSteps('1+2/0');
    expect(solved?.result).toBe('Undefined');
  });

  it('returns null for malformed input', () => {
    expect(solveWithSteps('2+*3')).toBeNull();
    expect(solveWithSteps('')).toBeNull();
  });

  it('provides spoken phrasing per step', () => {
    const solved = solveWithSteps('3*4');
    expect(solved?.steps[0].spoken).toBe('3 times 4 equals 12');
  });
});

describe('solveWithSteps linear equations', () => {
  it('solves 2x+4=10 with move-and-divide steps', () => {
    const solved = solveWithSteps('2x+4=10');
    expect(solved?.kind).toBe('linear');
    expect(solved?.variable).toBe('x');
    expect(solved?.result).toBe('x = 3');
    expect(solved?.steps.map((s) => s.expression)).toEqual([
      '2x+4 = 10',
      '2x = 6',
      'x = 3',
    ]);
  });

  it('solves x/2=5', () => {
    const solved = solveWithSteps('x/2=5');
    expect(solved?.result).toBe('x = 10');
    expect(solved?.variable).toBe('x');
  });

  it('solves equations with the variable on the right', () => {
    const solved = solveWithSteps('10=4+x');
    expect(solved?.result).toBe('x = 6');
  });

  it('detects no-solution and infinite-solution cases', () => {
    expect(solveWithSteps('2x+1=2x+2')?.result).toBe('No solution');
    expect(solveWithSteps('2x+1=2x+1')?.result).toBe('Infinite solutions');
  });

  it('returns null for multi-variable or nonlinear input', () => {
    expect(solveWithSteps('x+y=2')).toBeNull();
    expect(solveWithSteps('x^2=4')).toBeNull();
    expect(solveWithSteps('x/0=1')).toBeNull();
  });

  it('speaks each linear step', () => {
    const solved = solveWithSteps('2x+4=10');
    expect(solved?.steps[1].spoken).toContain('both sides');
    expect(solved?.steps[2].spoken).toContain('x equals 3');
  });
});
