import { describe, it, expect } from 'vitest';
import {
  tokenizeMath,
  MathParser,
  evaluateAST,
  parseAndEvaluateExpression,
} from '../engine/mathEngine';

describe('CalcInk Math Engine', () => {
  describe('Lexer & Parser', () => {
    it('tokenizes simple arithmetic expressions', () => {
      const tokens = tokenizeMath('2 + 3 * 4');
      expect(tokens.map((t) => t.type)).toEqual([
        'NUMBER',
        'PLUS',
        'NUMBER',
        'MULTIPLY',
        'NUMBER',
        'EOF',
      ]);
    });

    it('correctly respects PEMDAS operator precedence', () => {
      const tokens = tokenizeMath('2 + 3 * 4');
      const parser = new MathParser(tokens);
      const ast = parser.parse();
      const result = evaluateAST(ast, {});
      expect(result).toBe(14); // 2 + (3 * 4) = 14, not (2 + 3) * 4 = 20
    });

    it('handles parentheses correctly', () => {
      const tokens = tokenizeMath('2 * (5 + 13)');
      const parser = new MathParser(tokens);
      const ast = parser.parse();
      const result = evaluateAST(ast, {});
      expect(result).toBe(36);
    });

    it('evaluates exponentiation with right-associativity', () => {
      const tokens = tokenizeMath('2 ^ 3 ^ 2');
      const parser = new MathParser(tokens);
      const ast = parser.parse();
      const result = evaluateAST(ast, {});
      expect(result).toBe(512); // 2 ^ (3 ^ 2) = 2 ^ 9 = 512
    });

    it('evaluates trigonometric functions and constants', () => {
      const tokens = tokenizeMath('sin(pi / 2)');
      const parser = new MathParser(tokens);
      const ast = parser.parse();
      const result = evaluateAST(ast, {});
      expect(result).toBeCloseTo(1, 5);
    });
  });

  describe('Dynamic Variable Binding & Equation Solver', () => {
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
  });
});
