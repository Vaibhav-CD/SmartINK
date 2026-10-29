/**
 * CalcInk Deterministic BODMAS Mathematical Evaluation Engine
 * 
 * 100% Client-Side, Zero Cloud, Zero eval()
 * Compliant with Inter IIT Tech Meet 15.0 CalcInk Software PS specifications.
 * 
 * Supports:
 * - Multi-digit integers & floating-point decimals
 * - Standard arithmetic (+, -, *, ×, /, ÷, %, ^)
 * - Operator precedence: BODMAS / PEMDAS
 * - Parentheses nesting & Unary minus (-x)
 * - Variable storage & memory (e.g., x = 10, y = 5, x + y = 15)
 * - Division by zero -> graceful "Undefined" output
 * - Malformed syntax safety without uncaught exceptions
 */

export interface EvaluationResult {
  success: boolean;
  rawExpression: string;
  sanitizedExpression: string;
  value: number | null;
  display: string;
  isAssignment: boolean;
  variableName?: string;
  isUndefined?: boolean;
  error?: string;
  isEquationSolution?: boolean;
  solutionVariable?: string;
  solutionValues?: number[];
}

export type ASTNodeType = 'number' | 'variable' | 'binary_op' | 'unary_op' | 'function_call' | 'assignment';

export interface ASTNode {
  type: ASTNodeType;
  value?: number;
  name?: string;
  operator?: string;
  left?: ASTNode;
  right?: ASTNode;
  argument?: ASTNode;
}

export type VariableStore = Record<string, number>;

export class MathParser {
  private static globalVariables: VariableStore = {};

  /**
   * Reset or inspect stored variables
   */
  public static resetVariables(): void {
    this.globalVariables = {};
  }

  public static getVariables(): VariableStore {
    return { ...this.globalVariables };
  }

  public static setVariable(name: string, value: number): void {
    this.globalVariables[name.toLowerCase()] = value;
  }

  public static setGlobalVariable(name: string, value: number): void {
    this.setVariable(name, value);
  }

  /**
   * Evaluates an arithmetic expression or variable assignment string
   */
  public static evaluate(
    expression: string, 
    customVars?: VariableStore
  ): EvaluationResult {
    const vars = { ...this.globalVariables, ...(customVars || {}) };
    const raw = expression.trim();

    if (!raw) {
      return {
        success: false,
        rawExpression: raw,
        sanitizedExpression: '',
        value: null,
        display: '',
        isAssignment: false,
        error: 'Empty expression',
      };
    }

    // Strip trailing equals sign if present (e.g., "18+4*3=" -> "18+4*3")
    let cleaned = raw.replace(/=+$/, '').trim();

    // Check for variable assignment or algebraic equation: e.g., "x = 10 + 5", "2x + 4 = 10", "x^2 - 16 = 0"
    const assignmentMatch = cleaned.match(/^([a-zA-Z][a-zA-Z0-9]*)\s*=\s*(.+)$/);
    let assignedVar: string | undefined;

    if (assignmentMatch) {
      const candidateVar = assignmentMatch[1].toLowerCase();
      const candidateExpr = assignmentMatch[2].trim();
      // If the right-hand side also contains this variable (e.g. x = 2x - 5), it is an equation to solve!
      const containsSameVar = new RegExp(`\\b${candidateVar}\\b`, 'i').test(candidateExpr);
      if (containsSameVar) {
        const solved = this.solveEquation(candidateVar, candidateExpr, vars);
        if (solved) return solved;
      }
      assignedVar = candidateVar;
      cleaned = candidateExpr;
    } else if (cleaned.includes('=')) {
      // Algebraic equation with '=': e.g. "2x + 4 = 10", "5x = 25", "x^2 - 16 = 0"
      const eqParts = cleaned.split('=');
      const lhs = eqParts[0].trim();
      const rhs = eqParts[1]?.trim() || '';

      if (rhs) {
        const solved = this.solveEquation(lhs, rhs, vars);
        if (solved) return solved;
      }

      // If not an algebraic equation with unknowns, evaluate left side (e.g. "3 + 3 = 6" or "18 + 4*3 =")
      cleaned = lhs;
    }

    // Normalize math symbols
    // Replace unicode multiply × with *, unicode divide ÷ with /
    cleaned = cleaned
      .replace(/[×✕]/g, '*')
      .replace(/[÷]/g, '/')
      .replace(/–/g, '-') // en-dash
      .replace(/—/g, '-'); // em-dash

    try {
      const tokens = this.tokenize(cleaned);
      if (tokens.length === 0) {
        return {
          success: false,
          rawExpression: raw,
          sanitizedExpression: cleaned,
          value: null,
          display: '',
          isAssignment: !!assignedVar,
          error: 'No tokens found',
        };
      }

      const rpn = this.shuntingYard(tokens);
      const result = this.evaluateRPN(rpn, vars);

      if (result.isUndefined) {
        return {
          success: true,
          rawExpression: raw,
          sanitizedExpression: cleaned,
          value: null,
          display: 'Undefined',
          isAssignment: !!assignedVar,
          variableName: assignedVar,
          isUndefined: true,
        };
      }

      if (result.value === null || isNaN(result.value)) {
        return {
          success: false,
          rawExpression: raw,
          sanitizedExpression: cleaned,
          value: null,
          display: 'Error',
          isAssignment: !!assignedVar,
          error: result.error || 'Computation failed',
        };
      }

      // If variable assignment succeeded, store it
      if (assignedVar) {
        this.globalVariables[assignedVar] = result.value;
      }

      // Format display nicely (avoid float artifacts like 0.30000000000000004)
      const formatted = this.formatNumber(result.value);

      return {
        success: true,
        rawExpression: raw,
        sanitizedExpression: cleaned,
        value: result.value,
        display: formatted,
        isAssignment: !!assignedVar,
        variableName: assignedVar,
      };
    } catch (err: any) {
      return {
        success: false,
        rawExpression: raw,
        sanitizedExpression: cleaned,
        value: null,
        display: 'Error',
        isAssignment: !!assignedVar,
        error: err.message || 'Syntax Error',
      };
    }
  }

  /**
   * Tokenizer for arithmetic grammar
   */
  private static tokenize(expr: string): string[] {
    const tokens: string[] = [];
    let i = 0;

    while (i < expr.length) {
      const char = expr[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Numbers (integers or decimals)
      if (/[0-9]/.test(char) || (char === '.' && i + 1 < expr.length && /[0-9]/.test(expr[i + 1]))) {
        let numStr = '';
        let hasDot = false;
        while (i < expr.length && (/[0-9]/.test(expr[i]) || (expr[i] === '.' && !hasDot))) {
          if (expr[i] === '.') hasDot = true;
          numStr += expr[i];
          i++;
        }
        tokens.push(numStr);
        continue;
      }

      // Identifiers: variables or functions (e.g. x, y, sin, cos, sqrt)
      if (/[a-zA-Z]/.test(char)) {
        let ident = '';
        while (i < expr.length && /[a-zA-Z0-9]/.test(expr[i])) {
          ident += expr[i];
          i++;
        }
        tokens.push(ident);
        continue;
      }

      // Operators and Parentheses
      if ('+-*/%^()'.includes(char)) {
        // Detect unary minus (negative number or negated subexpression)
        if (char === '-') {
          const prevToken = tokens[tokens.length - 1];
          const isUnary = !prevToken || '+-*/%^('.includes(prevToken);
          if (isUnary) {
            tokens.push('neg');
            i++;
            continue;
          }
        }

        tokens.push(char);
        i++;
        continue;
      }

      // Unknown character - skip safely
      i++;
    }

    // Post-process tokens to insert implicit multiplication (e.g. 2x -> 2 * x, 2(x+1) -> 2 * (x+1), (a)(b) -> (a) * (b))
    const processed: string[] = [];
    const functions = new Set(['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'exp']);

    for (let j = 0; j < tokens.length; j++) {
      const curr = tokens[j];
      const next = tokens[j + 1];

      processed.push(curr);

      if (next) {
        const isCurrNum = !isNaN(Number(curr));
        const isCurrIdent = /^[a-zA-Z][a-zA-Z0-9]*$/.test(curr) && curr !== 'neg';
        const isCurrClose = curr === ')';

        const isNextNum = !isNaN(Number(next));
        const isNextIdent = /^[a-zA-Z][a-zA-Z0-9]*$/.test(next) && next !== 'neg';
        const isNextOpen = next === '(';

        // If curr is a known function and next is '(', it is a function call, NOT multiplication
        const isFuncCall = functions.has(curr.toLowerCase()) && isNextOpen;

        if (!isFuncCall) {
          if (
            (isCurrNum && (isNextIdent || isNextOpen)) ||
            (isCurrIdent && (isNextNum || isNextIdent || isNextOpen)) ||
            (isCurrClose && (isNextNum || isNextIdent || isNextOpen))
          ) {
            processed.push('*');
          }
        }
      }
    }

    return processed;
  }

  /**
   * Shunting-yard algorithm to convert infix tokens into Reverse Polish Notation (RPN)
   * Strictly respects BODMAS / PEMDAS operator precedence.
   */
  private static shuntingYard(tokens: string[]): string[] {
    const output: string[] = [];
    const opStack: string[] = [];

    const precedence: Record<string, number> = {
      '+': 2,
      '-': 2,
      '*': 3,
      '/': 3,
      '%': 3,
      '^': 4,
      'neg': 5, // Unary minus highest operator precedence
    };

    const isRightAssociative = (op: string) => op === '^' || op === 'neg';
    const knownFunctions = new Set(['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'exp']);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Number literal
      if (!isNaN(Number(token))) {
        output.push(token);
        continue;
      }

      // Function name
      if (knownFunctions.has(token.toLowerCase())) {
        opStack.push(token.toLowerCase());
        continue;
      }

      // Variable name
      if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(token) && token !== 'neg') {
        output.push(token);
        continue;
      }

      // Operator
      if (token in precedence) {
        while (
          opStack.length > 0 &&
          opStack[opStack.length - 1] !== '(' &&
          (knownFunctions.has(opStack[opStack.length - 1]) ||
            precedence[opStack[opStack.length - 1]] > precedence[token] ||
            (precedence[opStack[opStack.length - 1]] === precedence[token] && !isRightAssociative(token)))
        ) {
          output.push(opStack.pop()!);
        }
        opStack.push(token);
        continue;
      }

      // Left parenthesis
      if (token === '(') {
        opStack.push(token);
        continue;
      }

      // Right parenthesis
      if (token === ')') {
        let foundLeftParen = false;
        while (opStack.length > 0) {
          const top = opStack.pop()!;
          if (top === '(') {
            foundLeftParen = true;
            break;
          }
          output.push(top);
        }

        if (!foundLeftParen) {
          throw new Error('Mismatched parentheses');
        }

        // If top of stack is a function, pop it to output
        if (opStack.length > 0 && knownFunctions.has(opStack[opStack.length - 1])) {
          output.push(opStack.pop()!);
        }
        continue;
      }

      throw new Error(`Invalid token: ${token}`);
    }

    while (opStack.length > 0) {
      const top = opStack.pop()!;
      if (top === '(' || top === ')') {
        throw new Error('Mismatched parentheses');
      }
      output.push(top);
    }

    return output;
  }

  /**
   * Deterministic RPN Evaluator
   */
  private static evaluateRPN(
    rpn: string[], 
    vars: VariableStore
  ): { value: number | null; isUndefined?: boolean; error?: string } {
    const stack: number[] = [];

    for (const token of rpn) {
      // Number literal
      if (!isNaN(Number(token))) {
        stack.push(Number(token));
        continue;
      }

      // Functions (single argument) - MUST check before generic variable reference!
      if (['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'exp'].includes(token.toLowerCase())) {
        if (stack.length < 1) return { value: null, error: 'Malformed function argument' };
        const a = stack.pop()!;
        switch (token.toLowerCase()) {
          case 'sin': stack.push(Math.sin(a)); break;
          case 'cos': stack.push(Math.cos(a)); break;
          case 'tan': stack.push(Math.tan(a)); break;
          case 'sqrt':
            if (a < 0) return { value: null, isUndefined: true };
            stack.push(Math.sqrt(a));
            break;
          case 'abs': stack.push(Math.abs(a)); break;
          case 'log':
            if (a <= 0) return { value: null, isUndefined: true };
            stack.push(Math.log(a));
            break;
          case 'exp': stack.push(Math.exp(a)); break;
        }
        continue;
      }

      // Variable reference
      if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(token) && token !== 'neg') {
        const lower = token.toLowerCase();
        if (lower in vars) {
          stack.push(vars[lower]);
          continue;
        } else {
          // Pre-defined math constants
          if (lower === 'pi') {
            stack.push(Math.PI);
            continue;
          }
          if (lower === 'e') {
            stack.push(Math.E);
            continue;
          }
          return { value: null, error: `Undefined variable '${token}'` };
        }
      }

      // Unary negation
      if (token === 'neg') {
        if (stack.length < 1) return { value: null, error: 'Malformed expression' };
        const a = stack.pop()!;
        stack.push(-a);
        continue;
      }

      // Binary operators
      if (['+', '-', '*', '/', '%', '^'].includes(token)) {
        if (stack.length < 2) return { value: null, error: 'Malformed operator expression' };
        const b = stack.pop()!;
        const a = stack.pop()!;

        switch (token) {
          case '+':
            stack.push(a + b);
            break;
          case '-':
            stack.push(a - b);
            break;
          case '*':
            stack.push(a * b);
            break;
          case '/':
            // Division by zero check (PS Requirement: clean Undefined indicator)
            if (b === 0) {
              return { value: null, isUndefined: true };
            }
            stack.push(a / b);
            break;
          case '%':
            if (b === 0) return { value: null, isUndefined: true };
            stack.push(a % b);
            break;
          case '^':
            stack.push(Math.pow(a, b));
            break;
        }
        continue;
      }

      return { value: null, error: `Unrecognized symbol: ${token}` };
    }

    if (stack.length !== 1) {
      return { value: null, error: 'Invalid expression syntax' };
    }

    return { value: stack[0] };
  }

  /**
   * On-Device Algebraic Equation Solver (Apple Math Notes / Samsung Notes Style)
   * Solves linear and quadratic equations, polynomial roots, and equations with an unknown variable.
   */
  public static solveEquation(
    lhs: string,
    rhs: string,
    vars: VariableStore = {}
  ): EvaluationResult | null {
    const rawEq = `${lhs} = ${rhs}`;
    const mergedVars = { ...this.globalVariables, ...vars };

    // 1. Identify unknown variables in the equation
    const reservedNames = new Set(['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'exp', 'pi', 'e', 'neg']);
    const extractVars = (str: string): string[] => {
      const matches = str.match(/[a-zA-Z][a-zA-Z0-9]*/g) || [];
      return matches
        .map((m) => m.toLowerCase())
        .filter((m) => !reservedNames.has(m) && !(m in mergedVars));
    };

    const unknownVars = Array.from(new Set([...extractVars(lhs), ...extractVars(rhs)]));

    // Must have exactly one unknown variable to solve in 1D
    if (unknownVars.length !== 1) {
      return null;
    }

    const targetVar = unknownVars[0];

    // Helper to evaluate f(v) = LHS(v) - RHS(v)
    const evalDiff = (v: number): number | null => {
      const scope = { ...mergedVars, [targetVar]: v };
      const lRes = this.evaluate(lhs, scope);
      const rRes = this.evaluate(rhs, scope);
      if (!lRes.success || !rRes.success || lRes.value === null || rRes.value === null) {
        return null;
      }
      return lRes.value - rRes.value;
    };

    // Evaluate sample points to analyze polynomial degree
    const f0 = evalDiff(0);
    const f1 = evalDiff(1);
    const fNeg1 = evalDiff(-1);
    const f2 = evalDiff(2);

    if (f0 === null || f1 === null || fNeg1 === null || f2 === null) {
      return null;
    }

    // ── 2. Check for Linear Equation: f(x) = m*x + c ──
    const cLinear = f0;
    const mLinear = f1 - f0;
    const isLinear = Math.abs(f2 - (2 * mLinear + cLinear)) < 1e-4;

    if (isLinear && Math.abs(mLinear) > 1e-9) {
      const root = -cLinear / mLinear;
      const roundedRoot = Math.abs(root) < 1e-9 ? 0 : root;
      const formatted = this.formatNumber(roundedRoot);

      return {
        success: true,
        rawExpression: rawEq,
        sanitizedExpression: `${lhs} = ${rhs}`,
        value: roundedRoot,
        display: `${targetVar} = ${formatted}`,
        isAssignment: false,
        isEquationSolution: true,
        solutionVariable: targetVar,
        solutionValues: [roundedRoot],
      };
    }

    // ── 3. Check for Quadratic Equation: f(x) = a*x^2 + b*x + c ──
    const cQuad = f0;
    const aQuad = ((f1 - cQuad) + (fNeg1 - cQuad)) / 2;
    const bQuad = ((f1 - cQuad) - (fNeg1 - cQuad)) / 2;
    const isQuad = Math.abs(f2 - (4 * aQuad + 2 * bQuad + cQuad)) < 1e-4;

    if (isQuad && Math.abs(aQuad) > 1e-9) {
      const D = bQuad * bQuad - 4 * aQuad * cQuad;

      if (D > 1e-9) {
        const sqrtD = Math.sqrt(D);
        const r1 = (-bQuad + sqrtD) / (2 * aQuad);
        const r2 = (-bQuad - sqrtD) / (2 * aQuad);
        const roots = [r1, r2].sort((x, y) => x - y);

        let displayStr = '';
        if (Math.abs(roots[0] + roots[1]) < 1e-5) {
          displayStr = `${targetVar} = ±${this.formatNumber(Math.abs(roots[1]))}`;
        } else {
          displayStr = `${targetVar} = ${this.formatNumber(roots[0])}, ${this.formatNumber(roots[1])}`;
        }

        return {
          success: true,
          rawExpression: rawEq,
          sanitizedExpression: `${lhs} = ${rhs}`,
          value: roots[0],
          display: displayStr,
          isAssignment: false,
          isEquationSolution: true,
          solutionVariable: targetVar,
          solutionValues: roots,
        };
      } else if (Math.abs(D) <= 1e-9) {
        const r = -bQuad / (2 * aQuad);
        return {
          success: true,
          rawExpression: rawEq,
          sanitizedExpression: `${lhs} = ${rhs}`,
          value: r,
          display: `${targetVar} = ${this.formatNumber(r)}`,
          isAssignment: false,
          isEquationSolution: true,
          solutionVariable: targetVar,
          solutionValues: [r],
        };
      } else {
        return {
          success: true,
          rawExpression: rawEq,
          sanitizedExpression: `${lhs} = ${rhs}`,
          value: null,
          display: `${targetVar} ∉ ℝ (No real roots)`,
          isAssignment: false,
          isEquationSolution: true,
          solutionVariable: targetVar,
          solutionValues: [],
        };
      }
    }

    // ── 4. General Numerical Root Finder (Newton-Raphson) ──
    const searchPoints = [-10, -5, -2, -1, 0, 1, 2, 5, 10];
    for (const guess of searchPoints) {
      let x = guess;
      let converged = false;

      for (let iter = 0; iter < 40; iter++) {
        const fx = evalDiff(x);
        if (fx === null) break;
        if (Math.abs(fx) < 1e-6) {
          converged = true;
          break;
        }

        const h = 1e-5;
        const fxh = evalDiff(x + h);
        if (fxh === null) break;
        const dfx = (fxh - fx) / h;
        if (Math.abs(dfx) < 1e-12) break;

        const nextX = x - fx / dfx;
        if (Math.abs(nextX - x) < 1e-7) {
          x = nextX;
          converged = true;
          break;
        }
        x = nextX;
      }

      if (converged && isFinite(x)) {
        const rounded = Number(x.toFixed(6));
        return {
          success: true,
          rawExpression: rawEq,
          sanitizedExpression: `${lhs} = ${rhs}`,
          value: rounded,
          display: `${targetVar} = ${this.formatNumber(rounded)}`,
          isAssignment: false,
          isEquationSolution: true,
          solutionVariable: targetVar,
          solutionValues: [rounded],
        };
      }
    }

    return null;
  }

  /**
   * Nicely formats computed number to avoid IEEE 754 precision artifacts
   */
  private static formatNumber(num: number): string {
    if (!isFinite(num)) return 'Undefined';
    if (Number.isInteger(num)) return num.toString();

    // Round small precision float artifacts e.g. 0.1 + 0.2 = 0.30000000000000004 -> 0.3
    const rounded = Number(num.toPrecision(12));
    // If rounded is integer, display as integer
    if (Number.isInteger(rounded)) return rounded.toString();

    // Limit decimal display to max 6 places, trimming trailing zeros
    const fixed = rounded.toFixed(6).replace(/\.?0+$/, '');
    return fixed;
  }

  /**
   * Abstract Syntax Tree (AST) Parser (PS Requirement: Tokenized math streams -> AST)
   */
  public static parseToAST(expr: string): ASTNode | null {
    let raw = expr.trim();
    let assignedVar: string | undefined;
    const assignMatch = raw.match(/^([a-zA-Z][a-zA-Z0-9]*)\s*=\s*(.+)$/);
    if (assignMatch && !assignMatch[2].includes('=')) {
      assignedVar = assignMatch[1].toLowerCase();
      raw = assignMatch[2];
    } else {
      raw = raw.replace(/\s*=\s*$/, '');
    }

    const tokens = this.tokenize(raw);
    if (tokens.length === 0) return null;

    const rpn = this.shuntingYard(tokens);
    const stack: ASTNode[] = [];
    const functions = new Set(['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'exp']);
    const binaryOps = new Set(['+', '-', '*', '/', '%', '^']);

    for (const token of rpn) {
      if (!isNaN(Number(token))) {
        stack.push({ type: 'number', value: Number(token) });
        continue;
      }

      if (functions.has(token.toLowerCase())) {
        if (stack.length < 1) return null;
        const arg = stack.pop()!;
        stack.push({ type: 'function_call', name: token.toLowerCase(), argument: arg });
        continue;
      }

      if (token === 'neg') {
        if (stack.length < 1) return null;
        const arg = stack.pop()!;
        stack.push({ type: 'unary_op', operator: '-', argument: arg });
        continue;
      }

      if (binaryOps.has(token)) {
        if (stack.length < 2) return null;
        const right = stack.pop()!;
        const left = stack.pop()!;
        stack.push({ type: 'binary_op', operator: token, left, right });
        continue;
      }

      // Variable reference
      stack.push({ type: 'variable', name: token.toLowerCase() });
    }

    if (stack.length !== 1) return null;

    if (assignedVar) {
      return {
        type: 'assignment',
        name: assignedVar,
        right: stack[0],
      };
    }

    return stack[0];
  }

  /**
   * Programmatically evaluates an Abstract Syntax Tree
   */
  public static evaluateAST(node: ASTNode, vars: Record<string, number> = {}): number {
    const mergedVars: Record<string, number> = {
      ...this.globalVariables,
      ...vars,
      pi: Math.PI,
      e: Math.E,
    };

    switch (node.type) {
      case 'number':
        return node.value ?? 0;

      case 'variable': {
        const val = mergedVars[node.name?.toLowerCase() || ''];
        if (val === undefined) throw new Error(`Undefined variable: ${node.name}`);
        return val;
      }

      case 'unary_op': {
        const val = this.evaluateAST(node.argument!, vars);
        if (node.operator === '-') return -val;
        return val;
      }

      case 'binary_op': {
        const left = this.evaluateAST(node.left!, vars);
        const right = this.evaluateAST(node.right!, vars);
        switch (node.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/':
            if (right === 0) throw new Error('Division by zero');
            return left / right;
          case '%': return left % right;
          case '^': return Math.pow(left, right);
          default: throw new Error(`Unknown operator: ${node.operator}`);
        }
      }

      case 'function_call': {
        const arg = this.evaluateAST(node.argument!, vars);
        switch (node.name?.toLowerCase()) {
          case 'sin': return Math.sin(arg);
          case 'cos': return Math.cos(arg);
          case 'tan': return Math.tan(arg);
          case 'sqrt':
            if (arg < 0) throw new Error('Square root of negative number');
            return Math.sqrt(arg);
          case 'abs': return Math.abs(arg);
          case 'log':
            if (arg <= 0) throw new Error('Log of non-positive number');
            return Math.log(arg);
          case 'exp': return Math.exp(arg);
          default: throw new Error(`Unknown function: ${node.name}`);
        }
      }

      case 'assignment': {
        const val = this.evaluateAST(node.right!, vars);
        if (node.name) {
          this.globalVariables[node.name.toLowerCase()] = val;
        }
        return val;
      }
    }
  }
}
