import { SolvedEquation } from '../types/math';

/**
 * Token types for the mathematical lexer.
 */
export type TokenType =
  | 'NUMBER'
  | 'IDENTIFIER'
  | 'PLUS'
  | 'MINUS'
  | 'MULTIPLY'
  | 'DIVIDE'
  | 'POWER'
  | 'LPAREN'
  | 'RPAREN'
  | 'EQUALS'
  | 'COMMA'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

/**
 * Tokenizes mathematical expressions with support for implicit multiplication,
 * scientific notation, symbols (π, π, e), and function names.
 */
export function tokenizeMath(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const str = input.trim();

  while (i < str.length) {
    const ch = str[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === '+') {
      tokens.push({ type: 'PLUS', value: '+', pos: i });
      i++;
    } else if (ch === '-') {
      tokens.push({ type: 'MINUS', value: '-', pos: i });
      i++;
    } else if (ch === '*' || ch === '×' || ch === '·') {
      tokens.push({ type: 'MULTIPLY', value: '*', pos: i });
      i++;
    } else if (ch === '/' || ch === '÷') {
      tokens.push({ type: 'DIVIDE', value: '/', pos: i });
      i++;
    } else if (ch === '^') {
      tokens.push({ type: 'POWER', value: '^', pos: i });
      i++;
    } else if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(', pos: i });
      i++;
    } else if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')', pos: i });
      i++;
    } else if (ch === '=') {
      tokens.push({ type: 'EQUALS', value: '=', pos: i });
      i++;
    } else if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',', pos: i });
      i++;
    } else if (/[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < str.length && /[0-9.]/.test(str[i])) {
        numStr += str[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: numStr, pos: i - numStr.length });
    } else if (/[a-zA-Z_π]/.test(ch)) {
      let idStr = '';
      while (i < str.length && /[a-zA-Z0-9_π]/.test(str[i])) {
        idStr += str[i];
        i++;
      }
      tokens.push({ type: 'IDENTIFIER', value: idStr, pos: i - idStr.length });
    } else {
      // Unrecognized character, skip
      i++;
    }
  }

  tokens.push({ type: 'EOF', value: '', pos: i });
  return tokens;
}

/**
 * Built-in math constants and functions.
 */
export const BUILTIN_CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  π: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
};

export const BUILTIN_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  log: Math.log10,
  ln: Math.log,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
};

/**
 * AST Node representations.
 */
export type ASTNode =
  | { type: 'Number'; value: number }
  | { type: 'Variable'; name: string }
  | { type: 'Binary'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'Unary'; op: string; expr: ASTNode }
  | { type: 'Call'; name: string; args: ASTNode[] };

/**
 * Recursive descent parser for math expressions with operator precedence.
 */
export class MathParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', pos: 0 };
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const t of types) {
      if (this.check(t)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  public parse(): ASTNode {
    return this.expression();
  }

  private expression(): ASTNode {
    return this.addition();
  }

  private addition(): ASTNode {
    let expr = this.multiplication();

    while (this.match('PLUS', 'MINUS')) {
      const op = this.previous().value;
      const right = this.multiplication();
      expr = { type: 'Binary', op, left: expr, right };
    }

    return expr;
  }

  private multiplication(): ASTNode {
    let expr = this.power();

    while (
      this.match('MULTIPLY', 'DIVIDE') ||
      // Implicit multiplication: e.g. 2x, 2(3), (a)(b)
      (this.check('LPAREN') || this.check('IDENTIFIER') || this.check('NUMBER'))
    ) {
      let op = '*';
      if (this.previous().type === 'MULTIPLY' || this.previous().type === 'DIVIDE') {
        op = this.previous().value;
      }
      const right = this.power();
      expr = { type: 'Binary', op, left: expr, right };
    }

    return expr;
  }

  private power(): ASTNode {
    let expr = this.unary();

    if (this.match('POWER')) {
      const op = '^';
      const right = this.power(); // Right-associative
      expr = { type: 'Binary', op, left: expr, right };
    }

    return expr;
  }

  private unary(): ASTNode {
    if (this.match('MINUS', 'PLUS')) {
      const op = this.previous().value;
      const right = this.unary();
      return { type: 'Unary', op, expr: right };
    }
    return this.primary();
  }

  private primary(): ASTNode {
    if (this.match('NUMBER')) {
      const val = parseFloat(this.previous().value);
      return { type: 'Number', value: isNaN(val) ? 0 : val };
    }

    if (this.match('IDENTIFIER')) {
      const name = this.previous().value;
      // Check if function call
      if (this.match('LPAREN')) {
        const args: ASTNode[] = [];
        if (!this.check('RPAREN')) {
          do {
            args.push(this.expression());
          } while (this.match('COMMA'));
        }
        if (!this.match('RPAREN')) {
          // Unclosed paren gracefully handled
        }
        return { type: 'Call', name, args };
      }
      return { type: 'Variable', name };
    }

    if (this.match('LPAREN')) {
      const expr = this.expression();
      if (!this.match('RPAREN')) {
        // Missing right paren, recover gracefully
      }
      return expr;
    }

    // Fallback
    return { type: 'Number', value: 0 };
  }
}

/**
 * Evaluates an AST node with given variable scope.
 */
export function evaluateAST(node: ASTNode, scope: Record<string, number>): number {
  switch (node.type) {
    case 'Number':
      return node.value;

    case 'Variable': {
      const lower = node.name.toLowerCase();
      if (lower in BUILTIN_CONSTANTS) {
        return BUILTIN_CONSTANTS[lower];
      }
      if (node.name in scope) {
        return scope[node.name];
      }
      if (lower in scope) {
        return scope[lower];
      }
      // If variable is unknown, return NaN
      return NaN;
    }

    case 'Unary': {
      const val = evaluateAST(node.expr, scope);
      return node.op === '-' ? -val : val;
    }

    case 'Binary': {
      const left = evaluateAST(node.left, scope);
      const right = evaluateAST(node.right, scope);
      switch (node.op) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return right === 0 ? Infinity : left / right;
        case '^':
          return Math.pow(left, right);
        default:
          return 0;
      }
    }

    case 'Call': {
      const fn = BUILTIN_FUNCTIONS[node.name.toLowerCase()];
      if (fn) {
        const args = node.args.map((a) => evaluateAST(a, scope));
        return fn(...args);
      }
      return NaN;
    }
  }
}

/**
 * Extracts all variable names referenced in the AST.
 */
export function extractReferencedVariables(node: ASTNode): string[] {
  const vars: Set<string> = new Set();

  function traverse(n: ASTNode) {
    if (n.type === 'Variable') {
      const lower = n.name.toLowerCase();
      if (!(lower in BUILTIN_CONSTANTS)) {
        vars.add(n.name);
      }
    } else if (n.type === 'Binary') {
      traverse(n.left);
      traverse(n.right);
    } else if (n.type === 'Unary') {
      traverse(n.expr);
    } else if (n.type === 'Call') {
      n.args.forEach(traverse);
    }
  }

  traverse(node);
  return Array.from(vars);
}

/**
 * Parses and evaluates an expression string (e.g. "2 * (5 + 13) =" or "r = 5" or "y = sin(x)").
 */
export interface EvaluationResult {
  isSolved: boolean;
  isAssignment: boolean;
  assignedVariable?: string;
  resultValue?: number;
  formattedResult?: string;
  isFunction?: boolean;
  functionData?: {
    varName: string;
    fnExpr: string;
    minX: number;
    maxX: number;
  };
  referencedVars: string[];
  error?: string;
}

export function parseAndEvaluateExpression(
  rawInput: string,
  scope: Record<string, number> = {}
): EvaluationResult {
  const clean = rawInput.trim();
  if (!clean) {
    return { isSolved: false, isAssignment: false, referencedVars: [] };
  }

  // Check 1: 2D function definition (e.g. "y = sin(x)", "f(x) = x^2 - 4x + 3")
  const funcMatch = clean.match(/^(?:y\s*=|f\((x)\)\s*=)\s*(.+)$/i);
  if (funcMatch) {
    const fnBody = funcMatch[2].replace(/=$/, '').trim();
    return {
      isSolved: true,
      isAssignment: false,
      isFunction: true,
      functionData: {
        varName: 'x',
        fnExpr: fnBody,
        minX: -10,
        maxX: 10,
      },
      referencedVars: ['x'],
    };
  }

  // Check 2: Expression ending with '=' or contains assignment
  const equalsIndex = clean.lastIndexOf('=');
  if (equalsIndex === -1) {
    return { isSolved: false, isAssignment: false, referencedVars: [] };
  }

  // If ends with '=' e.g. "2 * (5 + 13) =" or "V = pi * r^2 * h ="
  if (equalsIndex === clean.length - 1) {
    const exprPart = clean.slice(0, -1).trim();

    // Check if it's variable assignment with calculation: "V = pi * r^2 * h ="
    const assignMatch = exprPart.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
    let targetVar: string | undefined;
    let evalPart = exprPart;

    if (assignMatch) {
      targetVar = assignMatch[1];
      evalPart = assignMatch[2];
    }

    try {
      const tokens = tokenizeMath(evalPart);
      const parser = new MathParser(tokens);
      const ast = parser.parse();
      const val = evaluateAST(ast, scope);
      const refVars = extractReferencedVariables(ast);

      if (isNaN(val)) {
        return {
          isSolved: false,
          isAssignment: !!targetVar,
          assignedVariable: targetVar,
          referencedVars: refVars,
          error: 'Undefined variables or invalid arithmetic',
        };
      }

      const formatted = Number.isInteger(val) ? val.toString() : parseFloat(val.toFixed(4)).toString();

      return {
        isSolved: true,
        isAssignment: !!targetVar,
        assignedVariable: targetVar,
        resultValue: val,
        formattedResult: formatted,
        referencedVars: refVars,
      };
    } catch (err: any) {
      return { isSolved: false, isAssignment: false, referencedVars: [], error: err?.message };
    }
  }

  // Direct assignment without trailing '=': e.g. "r = 5"
  const directAssign = clean.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^=]+)$/);
  if (directAssign) {
    const varName = directAssign[1];
    const valExpr = directAssign[2].trim();

    try {
      const tokens = tokenizeMath(valExpr);
      const parser = new MathParser(tokens);
      const ast = parser.parse();
      const val = evaluateAST(ast, scope);
      const refVars = extractReferencedVariables(ast);

      if (!isNaN(val)) {
        const formatted = Number.isInteger(val) ? val.toString() : parseFloat(val.toFixed(4)).toString();
        return {
          isSolved: true,
          isAssignment: true,
          assignedVariable: varName,
          resultValue: val,
          formattedResult: formatted,
          referencedVars: refVars,
        };
      }
    } catch {
      // Fall through
    }
  }

  return { isSolved: false, isAssignment: false, referencedVars: [] };
}
