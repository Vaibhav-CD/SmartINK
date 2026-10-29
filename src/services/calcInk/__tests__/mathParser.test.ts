import { describe, it, expect, beforeEach } from 'vitest';
import { MathParser } from '../mathParser';

describe('CalcInk Deterministic BODMAS Math Engine', () => {
  beforeEach(() => {
    MathParser.resetVariables();
  });

  describe('Basic Arithmetic & BODMAS / PEMDAS Order of Operations', () => {
    it('evaluates basic addition and subtraction', () => {
      const res = MathParser.evaluate('15 + 27 - 12');
      expect(res.success).toBe(true);
      expect(res.value).toBe(30);
      expect(res.display).toBe('30');
    });

    it('strictly respects multiplication precedence over addition: 18 + 4 * 3 = 30', () => {
      const res = MathParser.evaluate('18 + 4 * 3 =');
      expect(res.success).toBe(true);
      expect(res.value).toBe(30);
      expect(res.display).toBe('30');
    });

    it('handles unicode multiplication × and division ÷ symbols', () => {
      const res = MathParser.evaluate('18 + 4 × 3 =');
      expect(res.success).toBe(true);
      expect(res.value).toBe(30);

      const divRes = MathParser.evaluate('100 ÷ 4 =');
      expect(divRes.success).toBe(true);
      expect(divRes.value).toBe(25);
    });

    it('respects parentheses precedence: (18 + 4) * 3 = 66', () => {
      const res = MathParser.evaluate('(18 + 4) * 3');
      expect(res.success).toBe(true);
      expect(res.value).toBe(66);
    });

    it('evaluates complex nested expressions with powers: 2 ^ 3 + (10 - 2 * 3) / 2', () => {
      // 2^3 = 8
      // (10 - 6) = 4
      // 4 / 2 = 2
      // 8 + 2 = 10
      const res = MathParser.evaluate('2 ^ 3 + (10 - 2 * 3) / 2');
      expect(res.success).toBe(true);
      expect(res.value).toBe(10);
    });
    it('evaluates trigonometric function with variable x: sin(x)', () => {
      const res = MathParser.evaluate('sin(x)', { x: 0 });
      expect(res.success).toBe(true);
      expect(res.value).toBe(0);
    });
  });

  describe('Floating-Point Numbers & Decimals', () => {
    it('evaluates multi-digit floating point arithmetic', () => {
      const res = MathParser.evaluate('2.5 * 4.2 + 0.5');
      expect(res.success).toBe(true);
      expect(res.value).toBe(11);
      expect(res.display).toBe('11');
    });

    it('avoids floating point rounding artifacts like 0.1 + 0.2', () => {
      const res = MathParser.evaluate('0.1 + 0.2');
      expect(res.success).toBe(true);
      expect(res.display).toBe('0.3');
    });
  });

  describe('Negative Numbers & Unary Minus', () => {
    it('evaluates unary negative numbers', () => {
      const res = MathParser.evaluate('-5 + 8');
      expect(res.success).toBe(true);
      expect(res.value).toBe(3);
    });

    it('evaluates negative factors inside expressions: 10 + -3 * 2', () => {
      const res = MathParser.evaluate('10 + -3 * 2');
      expect(res.success).toBe(true);
      expect(res.value).toBe(4);
    });
  });

  describe('Edge-case Validation & Fault Tolerance (Division by Zero)', () => {
    it('returns clean "Undefined" on division by zero without runtime exceptions', () => {
      const res = MathParser.evaluate('42 / 0 =');
      expect(res.success).toBe(true);
      expect(res.isUndefined).toBe(true);
      expect(res.display).toBe('Undefined');
    });

    it('returns clean "Undefined" for modulo by zero', () => {
      const res = MathParser.evaluate('15 % 0');
      expect(res.success).toBe(true);
      expect(res.isUndefined).toBe(true);
      expect(res.display).toBe('Undefined');
    });

    it('safely handles malformed syntax without throwing exceptions', () => {
      const res = MathParser.evaluate('18 + * 3');
      expect(res.success).toBe(false);
      expect(res.display).toBe('Error');
    });

    it('safely handles mismatched parentheses', () => {
      const res = MathParser.evaluate('((5 + 3) * 2');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('Variable Memory Store & Sequential Equations (Creative Extension)', () => {
    it('stores variable assignment e.g. x = 10', () => {
      const assign = MathParser.evaluate('x = 10');
      expect(assign.success).toBe(true);
      expect(assign.isAssignment).toBe(true);
      expect(assign.variableName).toBe('x');
      expect(assign.value).toBe(10);
    });

    it('uses stored variable in subsequent expression: x * 3 = 30', () => {
      MathParser.evaluate('x = 10');
      const calc = MathParser.evaluate('x * 3 =');
      expect(calc.success).toBe(true);
      expect(calc.value).toBe(30);
      expect(calc.display).toBe('30');
    });

    it('supports multiple variables: x = 10, y = 25, x + y = 35', () => {
      MathParser.evaluate('x = 10');
      MathParser.evaluate('y = 25');
      const calc = MathParser.evaluate('x + y =');
      expect(calc.success).toBe(true);
      expect(calc.value).toBe(35);
      expect(calc.display).toBe('35');
    });

    it('supports implicit multiplication: 2x, 3(4+1)', () => {
      const res1 = MathParser.evaluate('2x', { x: 5 });
      expect(res1.success).toBe(true);
      expect(res1.value).toBe(10);

      const res2 = MathParser.evaluate('3(4 + 1)');
      expect(res2.success).toBe(true);
      expect(res2.value).toBe(15);
    });

    it('parses expressions into Abstract Syntax Tree (AST) and evaluates programmatically', () => {
      const ast = MathParser.parseToAST('3 + 4 * 2');
      expect(ast).not.toBeNull();
      expect(ast?.type).toBe('binary_op');
      expect(ast?.operator).toBe('+');

      const evalVal = MathParser.evaluateAST(ast!);
      expect(evalVal).toBe(11);
    });

    it('creates assignment AST node: x = 5', () => {
      const ast = MathParser.parseToAST('x = 5');
      expect(ast).not.toBeNull();
      expect(ast?.type).toBe('assignment');
      expect(ast?.name).toBe('x');

      const evalVal = MathParser.evaluateAST(ast!);
      expect(evalVal).toBe(5);
      expect(MathParser.getVariables()['x']).toBe(5);
    });

    it('solves linear equations algebraically for an unknown variable (Apple/Samsung Math Notes style)', () => {
      // 2x + 4 = 10 -> x = 3
      const res1 = MathParser.evaluate('2x + 4 = 10');
      expect(res1.success).toBe(true);
      expect(res1.isEquationSolution).toBe(true);
      expect(res1.display).toBe('x = 3');
      expect(res1.value).toBe(3);

      // 5x = 25 -> x = 5
      const res2 = MathParser.evaluate('5x = 25');
      expect(res2.success).toBe(true);
      expect(res2.display).toBe('x = 5');
      expect(res2.value).toBe(5);

      // 2(x + 3) = 14 -> x = 4
      const res3 = MathParser.evaluate('2(x + 3) = 14');
      expect(res3.success).toBe(true);
      expect(res3.display).toBe('x = 4');
      expect(res3.value).toBe(4);

      // 2x + 5 = 1 -> x = -2 (user's exact equation)
      const resUser = MathParser.evaluate('2x + 5 = 1');
      expect(resUser.success).toBe(true);
      expect(resUser.isEquationSolution).toBe(true);
      expect(resUser.display).toBe('x = -2');
      expect(resUser.value).toBe(-2);
    });

    it('solves quadratic equations algebraically (e.g. x^2 - 16 = 0 -> x = ±4)', () => {
      // x^2 - 16 = 0 -> x = ±4
      const res1 = MathParser.evaluate('x^2 - 16 = 0');
      expect(res1.success).toBe(true);
      expect(res1.isEquationSolution).toBe(true);
      expect(res1.display).toBe('x = ±4');

      // x^2 - 5x + 6 = 0 -> x = 2, 3
      const res2 = MathParser.evaluate('x^2 - 5x + 6 = 0');
      expect(res2.success).toBe(true);
      expect(res2.display).toBe('x = 2, 3');
    });
  });
});
