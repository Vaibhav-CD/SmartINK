// Created by VaibhavCD
import { describe, it, expect, beforeEach } from 'vitest';
import { ReactiveDAG } from '../reactiveDAG';
import { MathParser } from '../mathParser';

describe('ReactiveDAG & Bidirectional Constraint Solver', () => {
  beforeEach(() => {
    MathParser.resetVariables();
  });

  it('orders single and chained dependent equations topologically', () => {
    const dag = new ReactiveDAG();

    // Add in reverse order of dependence
    dag.addOrUpdateEquation('eq-area', 'Area = pi * r^2');
    dag.addOrUpdateEquation('eq-radius', 'r = 5');

    const { order, cycleNodeIds } = dag.getTopologicalOrder();
    expect(cycleNodeIds).toEqual([]);
    expect(order).toEqual(['eq-radius', 'eq-area']);

    const evaluated = dag.evaluateForward();
    expect(evaluated.get('eq-radius')?.value).toBe(5);
    expect(evaluated.get('eq-area')?.value).toBeCloseTo(Math.PI * 25, 5);
  });

  it('propagates value changes forward through 3-tier dependencies', () => {
    const dag = new ReactiveDAG();

    dag.addOrUpdateEquation('eq-a', 'a = 10');
    dag.addOrUpdateEquation('eq-b', 'b = 2 * a + 4');
    dag.addOrUpdateEquation('eq-c', 'c = b / 2');

    dag.evaluateForward();
    expect(dag.getVariable('a')).toBe(10);
    expect(dag.getVariable('b')).toBe(24);
    expect(dag.getVariable('c')).toBe(12);

    // Update variable 'a' to 20
    dag.setVariable('a', 20);
    dag.evaluateForward();

    expect(dag.getVariable('b')).toBe(44);
    expect(dag.getVariable('c')).toBe(22);
  });

  it('detects circular dependencies cleanly without crashing', () => {
    const dag = new ReactiveDAG();

    // Cyclic feedback: a -> b -> a
    dag.addOrUpdateEquation('eq-1', 'a = b + 1');
    dag.addOrUpdateEquation('eq-2', 'b = a * 2');

    const { cycleNodeIds } = dag.getTopologicalOrder();
    expect(cycleNodeIds.length).toBe(2);

    const evaluated = dag.evaluateForward();
    expect(evaluated.get('eq-1')?.hasCycle).toBe(true);
    expect(evaluated.get('eq-2')?.hasCycle).toBe(true);
    expect(evaluated.get('eq-1')?.display).toBe('Circular Dependency');
  });

  it('solves inverse constraints via numerical root-finding (Secant method)', () => {
    const dag = new ReactiveDAG({ h: 14 });

    // Cylinder volume: V = pi * r^2 * h
    dag.addOrUpdateEquation('eq-vol', 'V = pi * r^2 * h');
    dag.setVariable('r', 5);
    dag.evaluateForward();

    // Now user wants volume V = 1583.362697, solve for r (with h fixed at 14)
    const targetV = 1583.362697;
    const invRes = dag.solveInverse('eq-vol', targetV, 'r');

    expect(invRes.success).toBe(true);
    expect(invRes.solvedValue).toBeCloseTo(6.0, 3);
    expect(dag.getVariable('r')).toBeCloseTo(6.0, 3);
    expect(dag.getVariable('V')).toBeCloseTo(targetV, 3);
  });

  it('solves inverse linear constraints: y = 3x - 12, target y = 18 -> x = 10', () => {
    const dag = new ReactiveDAG();

    dag.addOrUpdateEquation('eq-line', 'y = 3 * x - 12');
    dag.setVariable('x', 2);
    dag.evaluateForward();

    const invRes = dag.solveInverse('eq-line', 18, 'x');
    expect(invRes.success).toBe(true);
    expect(invRes.solvedValue).toBeCloseTo(10, 4);
    expect(dag.getVariable('x')).toBeCloseTo(10, 4);
    expect(dag.getVariable('y')).toBeCloseTo(18, 4);
  });
});
