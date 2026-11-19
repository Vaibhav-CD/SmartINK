// Created by VaibhavCD
/**
 * CalcInk Reactive Directed Acyclic Graph (DAG) & Bidirectional Constraint Solver.
 * 
 * Provides:
 * - Topological dependency ordering for multi-variable equation chains
 * - Cycle detection to prevent infinite recalculation loops
 * - Dynamic forward propagation across downstream formulas
 * - Bidirectional / inverse numerical root-finding (Secant / Brent method)
 *   when target outputs or scrubbers are adjusted.
 */

import { MathParser } from './mathParser';
import { extractReferencedVars } from './evaluateExpression';
import { formatNumber as formatMathNumber } from './formatNumber';

export interface DAGNode {
  id: string;
  expression: string;
  assignedVar?: string;
  dependencies: string[];
  value: number | null;
  display: string;
  isAssignment: boolean;
  hasCycle?: boolean;
  error?: string;
}

export interface InverseSolveResult {
  success: boolean;
  variableName: string;
  solvedValue: number | null;
  display: string;
  iterations: number;
  residual: number;
  error?: string;
}

export class ReactiveDAG {
  private nodes: Map<string, DAGNode> = new Map();
  private variables: Record<string, number> = {};

  constructor(initialVariables: Record<string, number> = {}) {
    this.variables = { ...initialVariables };
  }

  public setVariable(name: string, value: number): void {
    const lower = name.toLowerCase();
    this.variables[lower] = value;
    MathParser.setVariable(lower, value);

    // If an existing constant assignment node targets this variable, update its expression
    for (const node of this.nodes.values()) {
      if (node.assignedVar === lower && node.dependencies.length === 0) {
        node.expression = `${node.assignedVar} = ${value}`;
        node.value = value;
        node.display = formatMathNumber(value);
      }
    }
  }

  public getVariable(name: string): number | undefined {
    return this.variables[name.toLowerCase()];
  }

  public getAllVariables(): Record<string, number> {
    return { ...this.variables };
  }

  public addOrUpdateEquation(id: string, expression: string): DAGNode {
    const trimmed = expression.trim();
    const assignMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
    const assignedVar = assignMatch ? assignMatch[1].toLowerCase() : undefined;
    const dependencies = extractReferencedVars(trimmed, assignedVar).map((v) => v.toLowerCase());

    const node: DAGNode = {
      id,
      expression: trimmed,
      assignedVar,
      dependencies,
      value: null,
      display: '',
      isAssignment: !!assignedVar,
    };

    this.nodes.set(id, node);
    return node;
  }

  public removeEquation(id: string): boolean {
    const node = this.nodes.get(id);
    if (node && node.assignedVar) {
      delete this.variables[node.assignedVar];
    }
    return this.nodes.delete(id);
  }

  public getNode(id: string): DAGNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): DAGNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Topological sorting using Kahn's algorithm with cycle detection.
   */
  public getTopologicalOrder(): { order: string[]; cycleNodeIds: string[] } {
    const varToNode = new Map<string, string>();
    for (const [id, node] of this.nodes) {
      if (node.assignedVar) {
        varToNode.set(node.assignedVar, id);
      }
    }

    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const id of this.nodes.keys()) {
      inDegree.set(id, 0);
      adj.set(id, []);
    }

    // Build edges: if node B depends on var from node A, A -> B
    for (const [id, node] of this.nodes) {
      for (const depVar of node.dependencies) {
        const parentId = varToNode.get(depVar);
        if (parentId && parentId !== id) {
          adj.get(parentId)?.push(id);
          inDegree.set(id, (inDegree.get(id) || 0) + 1);
        }
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      order.push(curr);

      const neighbors = adj.get(curr) || [];
      for (const next of neighbors) {
        const newDeg = (inDegree.get(next) || 0) - 1;
        inDegree.set(next, newDeg);
        if (newDeg === 0) {
          queue.push(next);
        }
      }
    }

    const cycleNodeIds: string[] = [];
    if (order.length < this.nodes.size) {
      for (const [id, deg] of inDegree) {
        if (deg > 0) {
          cycleNodeIds.push(id);
        }
      }
    }

    return { order, cycleNodeIds };
  }

  /**
   * Forward evaluates all equations in exact topological dependency order.
   */
  public evaluateForward(): Map<string, DAGNode> {
    const { order, cycleNodeIds } = this.getTopologicalOrder();
    const cycleSet = new Set(cycleNodeIds);

    // Mark cycle nodes
    for (const id of cycleSet) {
      const node = this.nodes.get(id);
      if (node) {
        node.hasCycle = true;
        node.value = null;
        node.display = 'Circular Dependency';
        node.error = 'Circular variable reference in equation graph';
      }
    }

    // Evaluate nodes in topological order
    for (const id of order) {
      const node = this.nodes.get(id);
      if (!node) continue;

      node.hasCycle = false;
      node.error = undefined;

      const evalRes = MathParser.evaluate(node.expression, this.variables);
      if (evalRes.success && evalRes.value !== null && isFinite(evalRes.value)) {
        node.value = evalRes.value;
        node.display = evalRes.display;
        if (node.assignedVar) {
          this.variables[node.assignedVar] = evalRes.value;
        }
      } else if (evalRes.isUndefined) {
        node.value = null;
        node.display = 'Undefined';
        node.error = 'Division by zero';
      } else {
        node.value = null;
        node.display = evalRes.display || 'Error';
        node.error = evalRes.error || 'Evaluation error';
      }
    }

    return new Map(this.nodes);
  }

  /**
   * Inverse Constraint Solver:
   * Finds the value of `freeVariable` such that `targetEquation` evaluates to `targetValue`.
   * Employs the Secant method with bounded fallback steps.
   */
  public solveInverse(
    targetEquationId: string,
    targetValue: number,
    freeVariable: string,
    options: { maxIterations?: number; tolerance?: number } = {}
  ): InverseSolveResult {
    const node = this.nodes.get(targetEquationId);
    const targetVar = freeVariable.toLowerCase();

    if (!node) {
      return {
        success: false,
        variableName: freeVariable,
        solvedValue: null,
        display: '',
        iterations: 0,
        residual: Infinity,
        error: `Equation ${targetEquationId} not found`,
      };
    }

    const maxIter = options.maxIterations ?? 30;
    const tol = options.tolerance ?? 1e-7;

    // Objective function: evaluate node.expression with test value of freeVariable, return (val - targetValue)
    const evalAt = (x: number): number | null => {
      const testScope = { ...this.variables, [targetVar]: x };
      const res = MathParser.evaluate(node.expression, testScope);
      if (res.success && res.value !== null && isFinite(res.value)) {
        return res.value - targetValue;
      }
      return null;
    };

    // Initial guesses: current value or 1.0, and a slightly perturbed point
    let x0 = this.variables[targetVar] ?? 1.0;
    if (Math.abs(x0) < 1e-5) x0 = 0.5;
    let x1 = x0 !== 0 ? x0 * 1.05 : 1.0;

    let f0 = evalAt(x0);
    let f1 = evalAt(x1);

    if (f0 === null || f1 === null) {
      // Try alternate initial seed points
      x0 = 1.0;
      x1 = 2.0;
      f0 = evalAt(x0);
      f1 = evalAt(x1);
      if (f0 === null || f1 === null) {
        return {
          success: false,
          variableName: freeVariable,
          solvedValue: null,
          display: '',
          iterations: 0,
          residual: Infinity,
          error: 'Could not evaluate objective function at initial guesses',
        };
      }
    }

    let iterations = 0;
    let x = x1;
    let residual = Math.abs(f1);

    for (let i = 0; i < maxIter; i++) {
      iterations++;
      if (residual < tol) {
        break;
      }

      const denominator = f1 - f0;
      if (Math.abs(denominator) < 1e-12) {
        // Perturb to escape plateau
        x1 += 0.1;
        f1 = evalAt(x1) ?? f1;
        continue;
      }

      // Secant formula: x_next = x1 - f1 * (x1 - x0) / (f1 - f0)
      const xNext = x1 - (f1 * (x1 - x0)) / denominator;

      x0 = x1;
      f0 = f1;

      x1 = xNext;
      const fNext = evalAt(x1);

      if (fNext === null || isNaN(fNext)) {
        break;
      }

      f1 = fNext;
      x = x1;
      residual = Math.abs(f1);
    }

    if (residual < tol * 100) {
      const rounded = Math.round(x * 1e8) / 1e8;
      this.setVariable(targetVar, rounded);
      this.evaluateForward();

      return {
        success: true,
        variableName: freeVariable,
        solvedValue: rounded,
        display: formatMathNumber(rounded),
        iterations,
        residual,
      };
    }

    return {
      success: false,
      variableName: freeVariable,
      solvedValue: x,
      display: formatMathNumber(x),
      iterations,
      residual,
      error: 'Numerical convergence threshold not reached',
    };
  }
}
