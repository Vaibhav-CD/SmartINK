import { describe, it, expect } from 'vitest';
import { LivingInkPhysicsEngine } from '../livingInkPhysics';

describe('Wave on a string', () => {
  it('oscillates the probe with the configured period', () => {
    const params = LivingInkPhysicsEngine.getDefaultParams('wave');
    params.frequency = 2; // T = 0.5 s
    params.damping = 0; // no decay for the period check
    let state = LivingInkPhysicsEngine.createInitialState('wave', params);
    const y0 = state.position.y;
    const steps = Math.round(0.5 / (1 / 120));
    for (let i = 0; i < steps; i++) {
      state = LivingInkPhysicsEngine.stepSimulation('wave', state, params, 1 / 120);
    }
    expect(state.position.y).toBeCloseTo(y0, 2);
  });

  it('respects amplitude and decays with damping', () => {
    const params = LivingInkPhysicsEngine.getDefaultParams('wave');
    params.amplitude = 0.8;
    params.damping = 0.5;
    let state = LivingInkPhysicsEngine.createInitialState('wave', params);
    const e0 = state.totalEnergy;
    for (let i = 0; i < 120; i++) {
      state = LivingInkPhysicsEngine.stepSimulation('wave', state, params, 1 / 60);
    }
    expect(state.totalEnergy).toBeLessThan(e0);
    expect(Math.abs(state.position.y)).toBeLessThanOrEqual(0.8 + 1e-9);
  });

  it('keeps kinetic + potential split consistent', () => {
    const params = LivingInkPhysicsEngine.getDefaultParams('wave');
    let state = LivingInkPhysicsEngine.createInitialState('wave', params);
    state = LivingInkPhysicsEngine.stepSimulation('wave', state, params, 1 / 60);
    expect(state.kineticEnergy + state.potentialEnergy).toBeCloseTo(state.totalEnergy, 9);
    expect(state.totalEnergy).toBeGreaterThan(0);
  });
});

describe('Stable default orbit', () => {
  it('holds a near-circular orbit without crashing or escaping', () => {
    const params = LivingInkPhysicsEngine.getDefaultParams('orbit');
    let state = LivingInkPhysicsEngine.createInitialState('orbit', params);
    let minR = Infinity;
    let maxR = 0;
    for (let i = 0; i < 600; i++) {
      state = LivingInkPhysicsEngine.stepSimulation('orbit', state, params, 1 / 60);
      const r = Math.hypot(state.position.x, state.position.y);
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
    }
    expect(minR).toBeGreaterThan(1.0); // never plunges into the planet
    expect(maxR).toBeLessThan(2.8); // never escapes
    expect(maxR - minR).toBeLessThan(0.6); // near-circular
  });
});
