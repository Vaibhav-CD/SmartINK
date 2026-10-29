import type { Point, Stroke } from '../../types';
import { getStrokesBoundingBox } from '../calcInk/coordinateTransform';

export type PhysicsSystemType = 'pendulum' | 'spring' | 'orbit' | 'projectile' | 'wave';

export interface PhysicsParams {
  gravity: number; // m/s^2 (Earth = 9.80665)
  length?: number; // m (for pendulum, e.g. 1.5)
  mass: number; // kg
  damping: number; // damping coefficient
  springK?: number; // N/m (for spring)
  initialAngle?: number; // rad
  initialDisplacement?: number; // m
  initialVelocity?: { x: number; y: number };
  planetMass?: number;
  frequency?: number; // Hz (for wave, e.g. 1.2)
  amplitude?: number; // m (for wave, e.g. 0.5)
  waveSpeed?: number; // m/s (for wave, e.g. 2.0)
}

export interface PhysicsState {
  time: number;
  // Pendulum: angle (rad), angular velocity (rad/s)
  angle: number;
  angularVelocity: number;
  // Spring / Projectile / Orbit: position & velocity
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  // Energy tracking
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  // Trajectory history for path tracing
  trail: { x: number; y: number; alpha: number }[];
}

/** Wave string spans x ∈ [-WAVE_HALF_LENGTH, WAVE_HALF_LENGTH] metres. */
export const WAVE_HALF_LENGTH = 2;
/** Fixed x position (m) of the highlighted probe particle on the string. */
export const WAVE_PROBE_X = -1;

export interface DiagramDetectionResult {
  detected: boolean;
  systemType: PhysicsSystemType;
  confidence: number;
  anchorPoint: Point;
  bobPoint?: Point;
  suggestedParams: PhysicsParams;
  title: string;
}

/**
 * Living Ink Physics Engine
 * Converts hand-drawn diagrams into high-stability real-time physics simulations
 */
export class LivingInkPhysicsEngine {
  /**
   * Automatically detects if hand-drawn ink strokes represent a physical mechanical diagram
   */
  public static detectPhysicalDiagram(strokes: Stroke[]): DiagramDetectionResult {
    if (strokes.length === 0) {
      return {
        detected: false,
        systemType: 'pendulum',
        confidence: 0,
        anchorPoint: { x: 200, y: 100 },
        suggestedParams: this.getDefaultParams('pendulum'),
        title: 'Simple Pendulum',
      };
    }

    const bbox = getStrokesBoundingBox(strokes);
    const anchorPoint: Point = bbox
      ? { x: bbox.centerX, y: bbox.minY + 20 }
      : { x: 200, y: 100 };

    // 1. Check for Spring coil (stroke with frequent horizontal reversals / zigzag)
    for (const stroke of strokes) {
      const pts = stroke.points;
      if (pts.length < 8) continue;

      let reversals = 0;
      let lastDx = 0;
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        if (Math.abs(dx) > 2) {
          const dir = dx > 0 ? 1 : -1;
          if (lastDx !== 0 && dir !== lastDx) reversals++;
          lastDx = dir;
        }
      }

      // Zigzag spring coil typically has >= 5 alternating oscillations
      if (reversals >= 5) {
        return {
          detected: true,
          systemType: 'spring',
          confidence: 0.92,
          anchorPoint: { x: bbox?.minX || 150, y: bbox?.centerY || 150 },
          suggestedParams: this.getDefaultParams('spring'),
          title: 'Harmonic Spring-Mass Oscillator',
        };
      }
    }

    // 2. Check for Orbit / Planetary (central circle + orbiting circle/satellite)
    if (strokes.length >= 2) {
      let circularStrokes = 0;
      for (const s of strokes) {
        if (s.points.length >= 10) {
          const start = s.points[0];
          const end = s.points[s.points.length - 1];
          const sBox = getStrokesBoundingBox([s]);
          if (sBox && Math.hypot(end.x - start.x, end.y - start.y) < Math.max(sBox.width, sBox.height) * 0.35) {
            circularStrokes++;
          }
        }
      }

      if (circularStrokes >= 2) {
        return {
          detected: true,
          systemType: 'orbit',
          confidence: 0.88,
          anchorPoint: { x: bbox?.centerX || 200, y: bbox?.centerY || 200 },
          suggestedParams: this.getDefaultParams('orbit'),
          title: 'Planetary Gravitational Orbit',
        };
      }
    }

    // 3. Default to Pendulum (vertical hanging system with bob)
    return {
      detected: true,
      systemType: 'pendulum',
      confidence: 0.85,
      anchorPoint,
      bobPoint: bbox ? { x: bbox.centerX, y: bbox.maxY } : undefined,
      suggestedParams: this.getDefaultParams('pendulum'),
      title: 'Simple Pendulum Oscillator',
    };
  }

  /**
   * Default physical parameters for canonical STEM systems
   */
  public static getDefaultParams(type: PhysicsSystemType): PhysicsParams {
    switch (type) {
      case 'pendulum':
        return {
          gravity: 9.80665,
          length: 1.5,
          mass: 1.0,
          damping: 0.015,
          initialAngle: Math.PI / 4, // 45 degrees
        };
      case 'spring':
        return {
          gravity: 9.80665,
          mass: 1.2,
          springK: 24.0,
          damping: 0.02,
          initialDisplacement: 1.0,
        };
      case 'orbit':
        return {
          gravity: 9.80665,
          mass: 1.0,
          planetMass: 40.0,
          damping: 0.0,
          // Near-circular orbit at r0 = 1.8: v_circ = sqrt(GM/r) ≈ 4.71
          initialVelocity: { x: 0, y: 4.7 },
        };
      case 'projectile':
        return {
          gravity: 9.80665,
          mass: 0.5,
          damping: 0.008,
          initialVelocity: { x: 12.0, y: 15.0 },
        };
      case 'wave':
        return {
          gravity: 9.80665,
          mass: 1.0,
          damping: 0.02,
          frequency: 1.2,
          amplitude: 0.5,
          waveSpeed: 2.0,
        };
    }
  }

  /**
   * Initializes state vector for a physical simulation
   */
  public static createInitialState(type: PhysicsSystemType, params: PhysicsParams): PhysicsState {
    switch (type) {
      case 'pendulum': {
        const theta = params.initialAngle ?? Math.PI / 4;
        const L = params.length || 1.5;
        const m = params.mass;
        const g = params.gravity;
        const U = m * g * L * (1 - Math.cos(theta));
        return {
          time: 0,
          angle: theta,
          angularVelocity: 0,
          position: { x: L * Math.sin(theta), y: L * Math.cos(theta) },
          velocity: { x: 0, y: 0 },
          kineticEnergy: 0,
          potentialEnergy: U,
          totalEnergy: U,
          trail: [],
        };
      }
      case 'spring': {
        const x0 = params.initialDisplacement ?? 1.0;
        const k = params.springK || 24;
        const U = 0.5 * k * x0 * x0;
        return {
          time: 0,
          angle: 0,
          angularVelocity: 0,
          position: { x: x0, y: 0 },
          velocity: { x: 0, y: 0 },
          kineticEnergy: 0,
          potentialEnergy: U,
          totalEnergy: U,
          trail: [],
        };
      }
      case 'orbit': {
        const r0 = 1.8;
        const v0 = params.initialVelocity || { x: 0, y: 4.7 };
        const orbitKE = 0.5 * params.mass * (v0.x * v0.x + v0.y * v0.y);
        const orbitPE = -(params.planetMass || 40) / r0;
        return {
          time: 0,
          angle: 0,
          angularVelocity: 0,
          position: { x: r0, y: 0 },
          velocity: { ...v0 },
          kineticEnergy: orbitKE,
          potentialEnergy: orbitPE,
          totalEnergy: orbitKE + orbitPE,
          trail: [],
        };
      }
      case 'projectile': {
        const v = params.initialVelocity || { x: 12, y: 15 };
        return {
          time: 0,
          angle: 0,
          angularVelocity: 0,
          position: { x: 0, y: 0 },
          velocity: { ...v },
          kineticEnergy: 0.5 * params.mass * (v.x * v.x + v.y * v.y),
          potentialEnergy: 0,
          totalEnergy: 0.5 * params.mass * (v.x * v.x + v.y * v.y),
          trail: [],
        };
      }
      case 'wave': {
        const snap = LivingInkPhysicsEngine.waveSnapshot(params, 0);
        return {
          time: 0,
          angle: 0,
          angularVelocity: 0,
          position: { x: WAVE_PROBE_X, y: snap.probeY },
          velocity: { x: 0, y: snap.probeVy },
          kineticEnergy: snap.ke,
          potentialEnergy: snap.pe,
          totalEnergy: snap.total,
          trail: [],
        };
      }
    }
  }

  /**
   * Analytic snapshot of a traveling transverse wave y(x,t) = A(t)·sin(kx − ωt)
   * with exponential amplitude decay. Returns the probe-particle motion at
   * WAVE_PROBE_X plus the string energy split for live gauges.
   */
  public static waveSnapshot(
    params: PhysicsParams,
    t: number
  ): { probeY: number; probeVy: number; ke: number; pe: number; total: number; omega: number; k: number; amp: number } {
    const f = params.frequency || 1.2;
    const A0 = params.amplitude ?? 0.5;
    const v = params.waveSpeed || 2.0;
    const omega = 2 * Math.PI * f;
    const k = omega / Math.max(0.1, v);
    const amp = A0 * Math.exp(-params.damping * t);
    const phase = k * WAVE_PROBE_X - omega * t;
    const probeY = amp * Math.sin(phase);
    const probeVy = -amp * omega * Math.cos(phase);
    // Total string energy E = ½·μ·ω²·A²·L with μ = 1, L = 2·WAVE_HALF_LENGTH
    const total = 0.5 * omega * omega * amp * amp * 2 * WAVE_HALF_LENGTH;
    const ke = total * Math.cos(phase) * Math.cos(phase);
    return { probeY, probeVy, ke, pe: total - ke, total, omega, k, amp };
  }

  /**
   * Advances simulation by time dt using high-stability Runge-Kutta 4th Order (RK4) / Verlet integration
   */
  public static stepSimulation(
    type: PhysicsSystemType,
    state: PhysicsState,
    params: PhysicsParams,
    dt: number = 1 / 60
  ): PhysicsState {
    const nextTrail = [
      ...state.trail.map((t) => ({ ...t, alpha: t.alpha * 0.96 })).filter((t) => t.alpha > 0.05),
    ];

    if (type === 'pendulum') {
      const g = params.gravity;
      const L = params.length || 1.5;
      const m = params.mass;
      const b = params.damping;

      // Pendulum differential equation: d^2(theta)/dt^2 = -(g/L)*sin(theta) - (b/m)*omega
      const deriv = (theta: number, omega: number): [number, number] => {
        const dTheta = omega;
        const dOmega = -(g / L) * Math.sin(theta) - (b / m) * omega;
        return [dTheta, dOmega];
      };

      // RK4 Numerical Integration
      const [k1_theta, k1_omega] = deriv(state.angle, state.angularVelocity);
      const [k2_theta, k2_omega] = deriv(state.angle + 0.5 * dt * k1_theta, state.angularVelocity + 0.5 * dt * k1_omega);
      const [k3_theta, k3_omega] = deriv(state.angle + 0.5 * dt * k2_theta, state.angularVelocity + 0.5 * dt * k2_omega);
      const [k4_theta, k4_omega] = deriv(state.angle + dt * k3_theta, state.angularVelocity + dt * k3_omega);

      const nextAngle = state.angle + (dt / 6) * (k1_theta + 2 * k2_theta + 2 * k3_theta + k4_theta);
      const nextOmega = state.angularVelocity + (dt / 6) * (k1_omega + 2 * k2_omega + 2 * k3_omega + k4_omega);

      const bobX = L * Math.sin(nextAngle);
      const bobY = L * Math.cos(nextAngle);

      const linearSpeed = L * Math.abs(nextOmega);
      const kinetic = 0.5 * m * linearSpeed * linearSpeed;
      const potential = m * g * L * (1 - Math.cos(nextAngle));

      nextTrail.push({ x: bobX, y: bobY, alpha: 1.0 });

      return {
        time: state.time + dt,
        angle: nextAngle,
        angularVelocity: nextOmega,
        position: { x: bobX, y: bobY },
        velocity: { x: L * nextOmega * Math.cos(nextAngle), y: -L * nextOmega * Math.sin(nextAngle) },
        kineticEnergy: kinetic,
        potentialEnergy: potential,
        totalEnergy: kinetic + potential,
        trail: nextTrail.slice(-60),
      };
    }

    if (type === 'spring') {
      const k = params.springK || 24;
      const m = params.mass;
      const b = params.damping;

      // Spring oscillator equation: d^2x/dt^2 = -(k/m)*x - (b/m)*v
      const deriv = (x: number, v: number): [number, number] => {
        return [v, -(k / m) * x - (b / m) * v];
      };

      const [k1_x, k1_v] = deriv(state.position.x, state.velocity.x);
      const [k2_x, k2_v] = deriv(state.position.x + 0.5 * dt * k1_x, state.velocity.x + 0.5 * dt * k1_v);
      const [k3_x, k3_v] = deriv(state.position.x + 0.5 * dt * k2_x, state.velocity.x + 0.5 * dt * k2_v);
      const [k4_x, k4_v] = deriv(state.position.x + dt * k3_x, state.velocity.x + dt * k3_v);

      const nextX = state.position.x + (dt / 6) * (k1_x + 2 * k2_x + 2 * k3_x + k4_x);
      const nextV = state.velocity.x + (dt / 6) * (k1_v + 2 * k2_v + 2 * k3_v + k4_v);

      const kinetic = 0.5 * m * nextV * nextV;
      const potential = 0.5 * k * nextX * nextX;

      nextTrail.push({ x: nextX, y: 0, alpha: 1.0 });

      return {
        time: state.time + dt,
        angle: 0,
        angularVelocity: 0,
        position: { x: nextX, y: 0 },
        velocity: { x: nextV, y: 0 },
        kineticEnergy: kinetic,
        potentialEnergy: potential,
        totalEnergy: kinetic + potential,
        trail: nextTrail.slice(-40),
      };
    }

    if (type === 'orbit') {
      const GM = params.planetMass || 40;
      const x = state.position.x;
      const y = state.position.y;
      const r = Math.hypot(x, y);
      const r3 = Math.max(0.2, r * r * r);

      const ax = -(GM * x) / r3;
      const ay = -(GM * y) / r3;

      const nextVx = state.velocity.x + ax * dt;
      const nextVy = state.velocity.y + ay * dt;
      const nextX = x + nextVx * dt;
      const nextY = y + nextVy * dt;

      const speed = Math.hypot(nextVx, nextVy);
      const kinetic = 0.5 * params.mass * speed * speed;
      const potential = -GM / Math.max(0.2, Math.hypot(nextX, nextY));

      nextTrail.push({ x: nextX, y: nextY, alpha: 1.0 });

      return {
        time: state.time + dt,
        angle: Math.atan2(nextY, nextX),
        angularVelocity: (x * nextVy - y * nextVx) / (r * r),
        position: { x: nextX, y: nextY },
        velocity: { x: nextVx, y: nextVy },
        kineticEnergy: kinetic,
        potentialEnergy: potential,
        totalEnergy: kinetic + potential,
        trail: nextTrail.slice(-120),
      };
    }

    if (type === 'wave') {
      // Analytic traveling wave: state is an exact function of time, no drift.
      const t = state.time + dt;
      const snap = LivingInkPhysicsEngine.waveSnapshot(params, t);
      return {
        time: t,
        angle: 0,
        angularVelocity: 0,
        position: { x: WAVE_PROBE_X, y: snap.probeY },
        velocity: { x: 0, y: snap.probeVy },
        kineticEnergy: snap.ke,
        potentialEnergy: snap.pe,
        totalEnergy: snap.total,
        trail: [],
      };
    }

    // Projectile motion with quadratic air drag
    const g = params.gravity;
    const m = params.mass;
    const b = params.damping;
    const speed = Math.hypot(state.velocity.x, state.velocity.y);
    const dragX = -b * speed * state.velocity.x;
    const dragY = -b * speed * state.velocity.y;

    const ax = dragX / m;
    const ay = -g + dragY / m;

    let nextX = state.position.x + state.velocity.x * dt;
    let nextY = state.position.y + state.velocity.y * dt;
    let nextVx = state.velocity.x + ax * dt;
    let nextVy = state.velocity.y + ay * dt;

    // Ground bounce
    if (nextY < 0) {
      nextY = 0;
      nextVy = -nextVy * 0.72; // Coefficient of restitution
      nextVx *= 0.9;
    }

    const kinetic = 0.5 * m * (nextVx * nextVx + nextVy * nextVy);
    const potential = m * g * Math.max(0, nextY);

    nextTrail.push({ x: nextX, y: nextY, alpha: 1.0 });

    return {
      time: state.time + dt,
      angle: Math.atan2(nextVy, nextVx),
      angularVelocity: 0,
      position: { x: nextX, y: nextY },
      velocity: { x: nextVx, y: nextVy },
      kineticEnergy: kinetic,
      potentialEnergy: potential,
      totalEnergy: kinetic + potential,
      trail: nextTrail.slice(-80),
    };
  }
}
