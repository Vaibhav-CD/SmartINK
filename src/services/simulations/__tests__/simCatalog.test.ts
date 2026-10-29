import { describe, it, expect } from 'vitest';
import {
  SIM_CATALOG,
  applyParamValue,
  getSimParamDescriptors,
  matchRequirement,
  readParamValue,
} from '../simCatalog';
import { LivingInkPhysicsEngine } from '../../physics/livingInkPhysics';

describe('Simulation Studio catalog', () => {
  it('describes tunable sliders for every system', () => {
    for (const entry of SIM_CATALOG) {
      const defs = getSimParamDescriptors(entry.type);
      expect(defs.length).toBeGreaterThanOrEqual(3);
      const keys = defs.map((d) => d.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const d of defs) {
        expect(d.min).toBeLessThan(d.max);
        expect(d.step).toBeGreaterThan(0);
      }
    }
  });

  it('round-trips launch speed + angle through the velocity vector', () => {
    let params = LivingInkPhysicsEngine.getDefaultParams('projectile');
    params = applyParamValue(params, 'projectile', 'launchSpeed', 20);
    params = applyParamValue(params, 'projectile', 'launchAngleDeg', 45);
    expect(params.initialVelocity!.x).toBeCloseTo(20 * Math.SQRT1_2, 6);
    expect(params.initialVelocity!.y).toBeCloseTo(20 * Math.SQRT1_2, 6);
    expect(readParamValue(params, 'projectile', 'launchSpeed')).toBeCloseTo(20, 6);
    expect(readParamValue(params, 'projectile', 'launchAngleDeg')).toBeCloseTo(45, 6);
  });

  it('maps release angle degrees onto pendulum initial angle', () => {
    let params = LivingInkPhysicsEngine.getDefaultParams('pendulum');
    params = applyParamValue(params, 'pendulum', 'releaseAngleDeg', 90);
    expect(params.initialAngle).toBeCloseTo(Math.PI / 2, 6);
    expect(readParamValue(params, 'pendulum', 'releaseAngleDeg')).toBeCloseTo(90, 6);
  });

  it('clamps out-of-range values to the slider range', () => {
    const params = LivingInkPhysicsEngine.getDefaultParams('projectile');
    const next = applyParamValue(params, 'projectile', 'launchSpeed', 999);
    expect(readParamValue(next, 'projectile', 'launchSpeed')).toBe(30);
  });

  it('does not mutate the input params object', () => {
    const params = LivingInkPhysicsEngine.getDefaultParams('projectile');
    const before = params.initialVelocity!.x;
    applyParamValue(params, 'projectile', 'launchSpeed', 25);
    expect(params.initialVelocity!.x).toBe(before);
  });
});

describe('Requirement matcher', () => {
  it('matches a Moon projectile with speed and angle', () => {
    const m = matchRequirement('Launch a projectile on the Moon at 20 m/s and 45 degrees');
    expect(m).not.toBeNull();
    expect(m!.system).toBe('projectile');
    expect(m!.params.gravity).toBeCloseTo(1.62, 6);
    expect(readParamValue(m!.params, 'projectile', 'launchSpeed')).toBeCloseTo(20, 6);
    expect(readParamValue(m!.params, 'projectile', 'launchAngleDeg')).toBeCloseTo(45, 6);
    expect(m!.label).toContain('Moon');
  });

  it('matches a pendulum with length and release angle', () => {
    const m = matchRequirement('Swing a 2 m pendulum from 45 degrees');
    expect(m).not.toBeNull();
    expect(m!.system).toBe('pendulum');
    expect(m!.params.length).toBeCloseTo(2, 6);
    expect(readParamValue(m!.params, 'pendulum', 'releaseAngleDeg')).toBeCloseTo(45, 6);
  });

  it('matches a spring with stiffness', () => {
    const m = matchRequirement('Spring with stiffness 40 and low friction');
    expect(m).not.toBeNull();
    expect(m!.system).toBe('spring');
    expect(m!.params.springK).toBeCloseTo(40, 6);
  });

  it('matches an orbit with velocity', () => {
    const m = matchRequirement('Satellite orbit with velocity 5');
    expect(m).not.toBeNull();
    expect(m!.system).toBe('orbit');
    expect(readParamValue(m!.params, 'orbit', 'orbitalVelocity')).toBeCloseTo(5, 6);
  });

  it('matches a wave with frequency and amplitude', () => {
    const m = matchRequirement('Wave on a string at 2 Hz with amplitude 0.6');
    expect(m).not.toBeNull();
    expect(m!.system).toBe('wave');
    expect(m!.params.frequency).toBeCloseTo(2, 6);
    expect(m!.params.amplitude).toBeCloseTo(0.6, 6);
  });

  it('keeps Moon gravity for projectiles (moon is a world, not an orbit)', () => {
    const m = matchRequirement('Cannon on the moon, speed 15');
    expect(m).not.toBeNull();
    expect(m!.system).toBe('projectile');
    expect(m!.params.gravity).toBeCloseTo(1.62, 6);
  });

  it('returns null for unknown or tied requirements', () => {
    expect(matchRequirement('asdfgh qwerty')).toBeNull();
    expect(matchRequirement('vibration')).toBeNull(); // too weak alone
    expect(matchRequirement('bob ripple')).toBeNull(); // pendulum/wave tie
  });
});
