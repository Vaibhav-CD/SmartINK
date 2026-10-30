/**
 * CalcInk deterministic step-by-step solver.
 *
 * Produces human-readable working for arithmetic expressions (in true
 * BODMAS evaluation order) and single-variable linear equations, plus a
 * spoken phrasing per step for the voice tutor. 100% client-side, no eval().
 */

import { formatNumber as formatMathNumber } from './formatNumber';

export interface SolutionStep {
  /** Written working, e.g. "3 * 4 = 12". */
  expression: string;
  /** Spoken phrasing, e.g. "3 times 4 equals 12". */
  spoken: string;
}

export interface SteppedSolution {
  kind: 'arithmetic' | 'linear';
  steps: SolutionStep[];
  /** Final answer display, e.g. "14", "x = 3", "Undefined". */
  result: string;
  variable?: string;
}

type Token =
  | { type: 'num'; value: number }
  | { type: 'ident'; name: string }
  | { type: 'op'; op: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'eof' };

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

const FUNCTIONS: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
};

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = '';
      let dots = 0;
      while (i < input.length && /[0-9.]/.test(input[i])) {
        if (input[i] === '.') dots++;
        num += input[i];
        i++;
      }
      if (dots > 1 || num === '.') return null;
      tokens.push({ type: 'num', value: parseFloat(num) });
    } else if (/[a-zA-Z_]/.test(ch)) {
      let name = '';
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        name += input[i];
        i++;
      }
      tokens.push({ type: 'ident', name });
    } else if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
    } else if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
    } else if ('+-*/%^'.includes(ch)) {
      tokens.push({ type: 'op', op: ch });
      i++;
    } else {
      return null;
    }
  }
  // Insert implicit multiplication: "2x" -> 2*x, "2(x+1)" -> 2*(x+1).
  const expanded: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i];
    expanded.push(cur);
    const next = tokens[i + 1];
    if (!next) break;
    const curEnd =
      cur.type === 'num' || cur.type === 'ident' || cur.type === 'rparen';
    const nextStart = next.type === 'ident' || next.type === 'lparen';
    if (curEnd && nextStart) {
      const isFuncCall =
        cur.type === 'ident' &&
        next.type === 'lparen' &&
        cur.name.toLowerCase() in FUNCTIONS;
      if (!isFuncCall) expanded.push({ type: 'op', op: '*' });
    }
  }
  expanded.push({ type: 'eof' });
  return expanded;
}

export function formatNumber(value: number): string {
  return formatMathNumber(value);
}

function spokenOp(op: string): string {
  switch (op) {
    case '+':
      return 'plus';
    case '-':
      return 'minus';
    case '*':
      return 'times';
    case '/':
      return 'divided by';
    case '^':
      return 'to the power';
    case '%':
      return 'modulo';
    default:
      return op;
  }
}

function displayOp(op: string): string {
  switch (op) {
    case '*':
      return '×';
    case '/':
      return '÷';
    default:
      return op;
  }
}

interface Linear {
  a: number;
  b: number;
  ok: boolean;
  divZero: boolean;
}

/**
 * Recursive-descent parser producing either a constant trace (arithmetic
 * mode, recording each operation) or a linear form a*x + b per side.
 */
class StepParser {
  private pos = 0;
  private failed = false;
  private divZero = false;
  readonly steps: SolutionStep[] = [];
  readonly trace: boolean;
  varName = '';

  constructor(
    private readonly tokens: Token[],
    trace: boolean
  ) {
    this.trace = trace;
  }

  get ok(): boolean {
    return !this.failed && !this.divZero;
  }

  get hitDivZero(): boolean {
    return this.divZero;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const t = this.tokens[this.pos];
    if (t.type !== 'eof') this.pos++;
    return t;
  }

  parseFull(): Linear | null {
    const result = this.parseExpr();
    if (this.failed || this.peek().type !== 'eof') return null;
    return result;
  }

  private parseExpr(): Linear {
    let left = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t.type === 'op' && (t.op === '+' || t.op === '-')) {
        this.advance();
        const right = this.parseTerm();
        left = this.apply(t.op, left, right);
      } else {
        return left;
      }
    }
  }

  private parseTerm(): Linear {
    let left = this.parseFactor();
    for (;;) {
      const t = this.peek();
      if (t.type === 'op' && (t.op === '*' || t.op === '/' || t.op === '%')) {
        this.advance();
        const right = this.parseFactor();
        left = this.apply(t.op, left, right);
      } else {
        return left;
      }
    }
  }

  private parseFactor(): Linear {
    const left = this.parseUnary();
    const t = this.peek();
    if (t.type === 'op' && t.op === '^') {
      this.advance();
      // Right-associative: 2^3^2 parses as 2^(3^2).
      const right = this.parseFactor();
      return this.apply('^', left, right);
    }
    return left;
  }

  private parseUnary(): Linear {
    const t = this.peek();
    if (t.type === 'op' && t.op === '-') {
      this.advance();
      const inner = this.parseUnary();
      return { a: -inner.a, b: -inner.b, ok: inner.ok, divZero: inner.divZero };
    }
    if (t.type === 'op' && t.op === '+') {
      // Unary plus is a no-op: "+5", "2++3", "2^+3" all evaluate.
      this.advance();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Linear {
    const t = this.advance();
    if (t.type === 'num') return { a: 0, b: t.value, ok: true, divZero: false };
    if (t.type === 'lparen') {
      const inner = this.parseExpr();
      if (this.peek().type !== 'rparen') {
        this.failed = true;
        return { a: 0, b: 0, ok: false, divZero: false };
      }
      this.advance();
      return inner;
    }
    if (t.type === 'ident') {
      const lower = t.name.toLowerCase();
      // Constants win over variables (engine parity): 'e' and 'pi' are
      // Euler's number and pi, never unknown variables.
      if (lower in CONSTANTS) {
        return { a: 0, b: CONSTANTS[lower], ok: true, divZero: false };
      }
      // Function call with a single parenthesized argument.
      if (lower in FUNCTIONS && this.peek().type === 'lparen') {
        this.advance();
        const arg = this.parseExpr();
        if (this.peek().type !== 'rparen') {
          this.failed = true;
          return { a: 0, b: 0, ok: false, divZero: false };
        }
        this.advance();
        if (!arg.ok || arg.a !== 0) {
          return { a: 0, b: 0, ok: false, divZero: arg.divZero };
        }
        return {
          a: 0,
          b: FUNCTIONS[lower](arg.b),
          ok: true,
          divZero: false,
        };
      }
      if (!/^[a-zA-Z]$/.test(t.name)) {
        this.failed = true;
        return { a: 0, b: 0, ok: false, divZero: false };
      }
      if (!this.varName) this.varName = t.name;
      if (t.name !== this.varName) {
        // Second distinct variable: not single-variable linear.
        return { a: 0, b: 0, ok: false, divZero: false };
      }
      return { a: 1, b: 0, ok: true, divZero: false };
    }
    this.failed = true;
    return { a: 0, b: 0, ok: false, divZero: false };
  }

  private apply(op: string, left: Linear, right: Linear): Linear {
    if (!left.ok || !right.ok) {
      return { a: 0, b: 0, ok: false, divZero: left.divZero || right.divZero };
    }
    const record = (value: number) => {
      if (this.trace && !this.divZero && left.a === 0 && right.a === 0) {
        const expr = `${formatNumber(left.b)} ${displayOp(op)} ${formatNumber(right.b)} = ${formatNumber(value)}`;
        this.steps.push({
          expression: expr,
          spoken: `${formatNumber(left.b)} ${spokenOp(op)} ${formatNumber(right.b)} equals ${formatNumber(value)}`,
        });
      }
    };
    switch (op) {
      case '+':
        record(left.b + right.b);
        return { a: left.a + right.a, b: left.b + right.b, ok: true, divZero: false };
      case '-':
        record(left.b - right.b);
        return { a: left.a - right.a, b: left.b - right.b, ok: true, divZero: false };
      case '*':
        if (left.a !== 0 && right.a !== 0) {
          return { a: 0, b: 0, ok: false, divZero: false };
        }
        record(left.b * right.b);
        return {
          a: left.a * right.b + right.a * left.b,
          b: left.b * right.b,
          ok: true,
          divZero: false,
        };
      case '/':
        if (right.a !== 0 || right.b === 0) {
          if (right.a === 0 && right.b === 0) {
            this.divZero = true;
            return { a: 0, b: 0, ok: true, divZero: true };
          }
          return { a: 0, b: 0, ok: false, divZero: false };
        }
        record(left.b / right.b);
        return { a: left.a / right.b, b: left.b / right.b, ok: true, divZero: false };
      case '%':
        if (left.a !== 0 || right.a !== 0 || right.b === 0) {
          if (left.a === 0 && right.a === 0 && right.b === 0) {
            this.divZero = true;
            return { a: 0, b: 0, ok: true, divZero: true };
          }
          return { a: 0, b: 0, ok: false, divZero: false };
        }
        record(left.b % right.b);
        return { a: 0, b: left.b % right.b, ok: true, divZero: false };
      case '^': {
        if (left.a !== 0 || right.a !== 0) {
          return { a: 0, b: 0, ok: false, divZero: false };
        }
        const value = Math.pow(left.b, right.b);
        record(value);
        return { a: 0, b: value, ok: true, divZero: false };
      }
      default:
        return { a: 0, b: 0, ok: false, divZero: false };
    }
  }
}

function normalize(raw: string): string {
  return raw
    .replace(/[×✕]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .trim();
}

/**
 * Solves an arithmetic expression or single-variable linear equation,
 * returning the working steps plus the final result. Returns null when
 * the input is malformed, multi-variable, or non-linear.
 */
export function solveWithSteps(raw: string): SteppedSolution | null {
  const cleaned = normalize(raw).replace(/=+$/, '').trim();
  if (!cleaned) return null;

  const eqIndex = cleaned.indexOf('=');
  if (eqIndex >= 0) {
    const lhs = cleaned.slice(0, eqIndex).trim();
    const rhs = cleaned.slice(eqIndex + 1).trim();
    if (!lhs || !rhs) return null;
    // Pure arithmetic identity ("3 + 3 = 6"): trace the left side.
    if (!/[a-zA-Z]/.test(lhs) && !/[a-zA-Z]/.test(rhs)) {
      return traceArithmetic(lhs);
    }
    return solveLinear(lhs, rhs);
  }
  return traceArithmetic(cleaned);
}

function traceArithmetic(expr: string): SteppedSolution | null {
  const tokens = tokenize(expr);
  if (!tokens) return null;
  const parser = new StepParser(tokens, true);
  const result = parser.parseFull();
  if (!result || !result.ok || result.a !== 0) return null;
  if (parser.hitDivZero) {
    return { kind: 'arithmetic', steps: parser.steps, result: 'Undefined' };
  }
  return {
    kind: 'arithmetic',
    steps: parser.steps,
    result: formatNumber(result.b),
  };
}

function solveLinear(lhs: string, rhs: string): SteppedSolution | null {
  const leftTokens = tokenize(lhs);
  const rightTokens = tokenize(rhs);
  if (!leftTokens || !rightTokens) return null;
  const leftParser = new StepParser(leftTokens, false);
  const rightParser = new StepParser(rightTokens, false);
  const left = leftParser.parseFull();
  const right = rightParser.parseFull();
  if (!left || !right || !left.ok || !right.ok) return null;
  if (leftParser.hitDivZero || rightParser.hitDivZero) return null;
  const varName = leftParser.varName || rightParser.varName;
  if (!varName) return null;
  if (
    leftParser.varName &&
    rightParser.varName &&
    leftParser.varName !== rightParser.varName
  ) {
    return null;
  }

  // (a1 - a2) * x = (b2 - b1)
  const A = left.a - right.a;
  const B = right.b - left.b;
  const steps: SolutionStep[] = [];
  const given = `${lhs} = ${rhs}`;

  if (A === 0) {
    if (B === 0) {
      return {
        kind: 'linear',
        steps: [
          {
            expression: given,
            spoken: `Given ${spokenExpr(lhs)} equals ${spokenExpr(rhs)}`,
          },
        ],
        result: 'Infinite solutions',
        variable: varName,
      };
    }
    return {
      kind: 'linear',
      steps: [
        {
          expression: given,
          spoken: `Given ${spokenExpr(lhs)} equals ${spokenExpr(rhs)}`,
        },
      ],
      result: 'No solution',
      variable: varName,
    };
  }

  steps.push({
    expression: given,
    spoken: `Given ${spokenExpr(lhs)} equals ${spokenExpr(rhs)}`,
  });

  const constTerm = left.b - right.b;
  if (constTerm !== 0) {
    const move = -constTerm;
    const action = move > 0 ? 'Add' : 'Subtract';
    const amount = formatNumber(Math.abs(move));
    const reduced = `${formatLinear(A, varName)} = ${formatNumber(B)}`;
    steps.push({
      expression: reduced,
      spoken: `${action} ${amount} ${move > 0 ? 'to' : 'from'} both sides: ${spokenLinear(A, varName)} equals ${formatNumber(B)}`,
    });
  } else if (left.b !== 0 || right.b !== 0) {
    const reduced = `${formatLinear(A, varName)} = ${formatNumber(B)}`;
    steps.push({
      expression: reduced,
      spoken: `Collect like terms: ${spokenLinear(A, varName)} equals ${formatNumber(B)}`,
    });
  }

  if (A !== 1) {
    steps.push({
      expression: `${varName} = ${formatNumber(B / A)}`,
      spoken: `Divide both sides by ${formatNumber(A)}: ${varName} equals ${formatNumber(B / A)}`,
    });
  }

  return {
    kind: 'linear',
    steps,
    result: `${varName} = ${formatNumber(B / A)}`,
    variable: varName,
  };
}

function formatLinear(a: number, v: string): string {
  if (a === 1) return v;
  if (a === -1) return `-${v}`;
  return `${formatNumber(a)}${v}`;
}

function spokenLinear(a: number, v: string): string {
  if (a === 1) return v;
  if (a === -1) return `negative ${v}`;
  return `${formatNumber(a)} ${v}`;
}

function spokenExpr(expr: string): string {
  return expr
    .replace(/\*/g, ' times ')
    .replace(/\//g, ' divided by ')
    .replace(/\+/g, ' plus ')
    .replace(/-/g, ' minus ')
    .replace(/\^/g, ' to the power ')
    .replace(/=/g, ' equals ')
    .replace(/\s+/g, ' ')
    .trim();
}
