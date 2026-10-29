export interface CalcVariable {
  name: string;
  value: number;
  expression: string;
  pageId: string;
  sourceEquationId?: string;
}

export interface SolvedEquation {
  id: string;
  rawExpression: string; // e.g. "2 * (5 + 13) =" or "V = pi * r^2 * h ="
  lhs: string; // Left-hand side variable if assignment, e.g. "V"
  rhsExpression: string; // Expression to evaluate
  resultValue: number;
  formattedResult: string;
  bbox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  answerPosition: {
    x: number;
    y: number;
  };
  variablesReferenced: string[];
  isVariableAssignment: boolean;
  assignedVariable?: string;
  isFunction?: boolean;
  functionData?: {
    varName: string; // e.g. 'x'
    fnExpr: string;  // e.g. 'sin(x)'
    minX: number;
    maxX: number;
  };
}

export interface DynamicScrubber {
  id: string;
  variableName: string;
  equationId: string;
  currentValue: number;
  min: number;
  max: number;
  step: number;
  position: {
    x: number; // screen or canvas world coords
    y: number;
  };
}

export interface GraphPlotConfig {
  fnString: string;
  minX: number;
  maxX: number;
  step: number;
  color?: string;
  width?: number;
  height?: number;
}
