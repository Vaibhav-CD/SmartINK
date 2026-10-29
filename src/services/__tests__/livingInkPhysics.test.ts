import { describe, it, expect } from 'vitest';
import { LivingInkPhysicsEngine } from '../physics/livingInkPhysics';
import { OnDeviceStrokeRecognizer, type ProjectedEquation } from '../calcInk/strokeRecognizer';
import type { Stroke } from '../../types';

describe('Living Ink Physics Simulation & Socratic Error Sniffer', () => {
  it('detects a spring oscillator from hand-drawn zigzag strokes', () => {
    // Zigzag stroke with multiple X reversals
    const springStroke: Stroke = {
      id: 'spring-1',
      points: [
        { x: 10, y: 50 },
        { x: 20, y: 40 },
        { x: 15, y: 60 },
        { x: 25, y: 40 },
        { x: 20, y: 60 },
        { x: 30, y: 40 },
        { x: 25, y: 60 },
        { x: 35, y: 40 },
        { x: 30, y: 60 },
        { x: 40, y: 50 },
      ],
      color: '#fff',
      width: 3,
      createdAt: 1,
    };

    const res = LivingInkPhysicsEngine.detectPhysicalDiagram([springStroke]);
    expect(res.detected).toBe(true);
    expect(res.systemType).toBe('spring');
    expect(res.confidence).toBeGreaterThan(0.85);
  });

  it('runs RK4 numerical integration for pendulum and conserves energy without divergence', () => {
    const params = LivingInkPhysicsEngine.getDefaultParams('pendulum');
    params.damping = 0; // Undamped ideal pendulum for conservation check
    let state = LivingInkPhysicsEngine.createInitialState('pendulum', params);

    const initialTotalE = state.totalEnergy;
    expect(initialTotalE).toBeGreaterThan(0);

    // Simulate 60 frames (1 second at 60 FPS)
    for (let frame = 0; frame < 60; frame++) {
      state = LivingInkPhysicsEngine.stepSimulation('pendulum', state, params, 1 / 60);
    }

    // Pendulum must have swung (angle changed)
    expect(state.angle).not.toBe(params.initialAngle);
    // Energy conservation: RK4 energy drift should be less than 0.5%
    expect(Math.abs(state.totalEnergy - initialTotalE)).toBeLessThan(0.05);
  });

  it('detects algebraic fallacy between consecutive derivation lines (Error Sniffer)', () => {
    // Line 1: 2x + 10 = 20 (solves to x = 5)
    const eq1: ProjectedEquation = {
      id: 'line-1',
      strokeIds: ['s1'],
      expressionText: '2x+10=20',
      evaluation: {
        success: true,
        rawExpression: '2x+10=20',
        sanitizedExpression: '2x+10=20',
        value: 5,
        display: 'x = 5',
        isAssignment: false,
        isEquationSolution: true,
      },
      anchorPosition: { x: 200, y: 100 },
      boundingBox: { minX: 50, maxX: 150, minY: 80, maxY: 120, width: 100, height: 40, centerX: 100, centerY: 100 },
      timestamp: 1,
      isPlottableFunction: false,
    };

    // Line 2: 2x = 30 (user made sign error 20 + 10 = 30, solves to x = 15)
    const eq2: ProjectedEquation = {
      id: 'line-2',
      strokeIds: ['s2'],
      expressionText: '2x=30',
      evaluation: {
        success: true,
        rawExpression: '2x=30',
        sanitizedExpression: '2x=30',
        value: 15,
        display: 'x = 15',
        isAssignment: false,
        isEquationSolution: true,
      },
      anchorPosition: { x: 200, y: 160 },
      boundingBox: { minX: 50, maxX: 150, minY: 140, maxY: 180, width: 100, height: 40, centerX: 100, centerY: 160 },
      timestamp: 2,
      isPlottableFunction: false,
    };

    const equations = [eq1, eq2];
    OnDeviceStrokeRecognizer.detectDerivationErrors(equations);

    // Line 2 must be flagged as having a derivation fallacy
    expect(eq2.hasDerivationError).toBe(true);
    expect(eq2.errorExplanation).toContain('Algebraic divergence');
  });
});
