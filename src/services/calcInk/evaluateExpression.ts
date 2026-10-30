import { MathParser, MATH_FUNCTION_NAMES } from './mathParser';

/**
 * Expression adapter preserving the legacy `parseAndEvaluateExpression`
 * contract (assignments, trailing "=", y = / f(x) = function definitions)
 * while delegating all evaluation to the canonical CalcInk engine, so the
 * store, graphing, canvas scan, steps, and voice paths share one semantics.
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

const NON_REFERENCE_NAMES = new Set([
  ...MATH_FUNCTION_NAMES,
  'pi',
  'e',
  'tau',
]);

/** Variable names referenced by an expression body (targets excluded). */
export function extractReferencedVars(expr: string, assignedVar?: string): string[] {
  const found = new Set<string>();
  const idents = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  for (const ident of idents) {
    const lower = ident.toLowerCase();
    if (NON_REFERENCE_NAMES.has(lower)) continue;
    if (assignedVar && lower === assignedVar.toLowerCase()) continue;
    found.add(ident);
  }
  return [...found];
}

export function parseAndEvaluateExpression(
  rawInput: string,
  scope: Record<string, number> = {}
): EvaluationResult {
  const clean = rawInput.trim();
  if (!clean) {
    return { isSolved: false, isAssignment: false, referencedVars: [] };
  }

  // 2D function definition: "y = sin(x)", "f(x) = x^2 - 4x + 3".
  const funcMatch = clean.match(/^(?:y\s*=|f\((x)\)\s*=)\s*(.+)$/i);
  if (funcMatch) {
    const fnBody = funcMatch[2].replace(/=$/, '').trim();
    return {
      isSolved: true,
      isAssignment: false,
      isFunction: true,
      functionData: { varName: 'x', fnExpr: fnBody, minX: -10, maxX: 10 },
      referencedVars: ['x'],
    };
  }

  // Only "=" forms solve; a bare expression is left alone (legacy contract).
  if (!clean.includes('=')) {
    return { isSolved: false, isAssignment: false, referencedVars: [] };
  }

  const assignName = clean.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/)?.[1];

  try {
    const res = MathParser.evaluate(clean, scope);
    const referencedVars = extractReferencedVars(clean, assignName);
    if (!res.success || res.isUndefined || res.value === null || !isFinite(res.value)) {
      return {
        isSolved: false,
        isAssignment: !!res.isAssignment,
        assignedVariable: res.isAssignment ? assignName : undefined,
        referencedVars,
        error: res.isUndefined
          ? 'Undefined'
          : res.error || 'Undefined variables or invalid arithmetic',
      };
    }
    return {
      isSolved: true,
      isAssignment: !!res.isAssignment,
      assignedVariable: res.isAssignment ? assignName : undefined,
      resultValue: res.value,
      formattedResult: res.display,
      referencedVars,
    };
  } catch (err) {
    return {
      isSolved: false,
      isAssignment: false,
      referencedVars: [],
      error: err instanceof Error ? err.message : 'Evaluation failed',
    };
  }
}
