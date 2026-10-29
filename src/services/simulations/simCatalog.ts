import {
  LivingInkPhysicsEngine,
  type PhysicsParams,
  type PhysicsSystemType,
} from '../physics/livingInkPhysics';

/**
 * Simulation Studio catalog: tunable-parameter descriptors plus the
 * offline requirement matcher ("simulate X with ...") → system + params.
 */

// ---------------------------------------------------------------------------
// Parameter descriptors (drive the auto-generated sliders)
// ---------------------------------------------------------------------------

export interface SimParamDescriptor {
  /** PhysicsParams key, or a virtual key mapped by read/applyParamValue. */
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

/** Virtual keys (not raw PhysicsParams fields) mapped per system. */
export const VIRTUAL_PARAM_KEYS = new Set([
  'releaseAngleDeg',
  'launchSpeed',
  'launchAngleDeg',
  'orbitalVelocity',
]);

export function getSimParamDescriptors(type: PhysicsSystemType): SimParamDescriptor[] {
  switch (type) {
    case 'pendulum':
      return [
        { key: 'gravity', label: 'Gravity', min: 0, max: 25, step: 0.01, unit: 'm/s²' },
        { key: 'releaseAngleDeg', label: 'Release angle', min: 5, max: 90, step: 1, unit: '°' },
        { key: 'length', label: 'String length', min: 0.3, max: 3, step: 0.05, unit: 'm' },
        { key: 'mass', label: 'Bob mass', min: 0.1, max: 5, step: 0.1, unit: 'kg' },
        { key: 'damping', label: 'Air friction', min: 0, max: 0.2, step: 0.005, unit: '' },
      ];
    case 'spring':
      return [
        { key: 'springK', label: 'Spring stiffness', min: 5, max: 80, step: 1, unit: 'N/m' },
        { key: 'mass', label: 'Block mass', min: 0.1, max: 5, step: 0.1, unit: 'kg' },
        { key: 'initialDisplacement', label: 'Pull distance', min: 0.2, max: 2, step: 0.05, unit: 'm' },
        { key: 'damping', label: 'Air friction', min: 0, max: 0.3, step: 0.005, unit: '' },
      ];
    case 'orbit':
      return [
        { key: 'planetMass', label: 'Central mass (GM)', min: 5, max: 120, step: 1, unit: '' },
        { key: 'orbitalVelocity', label: 'Orbital velocity', min: 1, max: 9, step: 0.1, unit: '' },
        { key: 'mass', label: 'Satellite mass', min: 0.1, max: 5, step: 0.1, unit: 'kg' },
      ];
    case 'projectile':
      return [
        { key: 'launchSpeed', label: 'Launch speed', min: 2, max: 30, step: 0.5, unit: 'm/s' },
        { key: 'launchAngleDeg', label: 'Launch angle', min: 5, max: 85, step: 1, unit: '°' },
        { key: 'gravity', label: 'Gravity', min: 0, max: 25, step: 0.01, unit: 'm/s²' },
        { key: 'damping', label: 'Air drag', min: 0, max: 0.05, step: 0.001, unit: '' },
        { key: 'mass', label: 'Mass', min: 0.1, max: 5, step: 0.1, unit: 'kg' },
      ];
    case 'wave':
      return [
        { key: 'frequency', label: 'Frequency', min: 0.2, max: 4, step: 0.1, unit: 'Hz' },
        { key: 'amplitude', label: 'Amplitude', min: 0.1, max: 1, step: 0.05, unit: 'm' },
        { key: 'waveSpeed', label: 'Wave speed', min: 0.5, max: 6, step: 0.1, unit: 'm/s' },
        { key: 'damping', label: 'Decay', min: 0, max: 0.15, step: 0.005, unit: '' },
      ];
  }
}

function descriptorFor(type: PhysicsSystemType, key: string): SimParamDescriptor | undefined {
  return getSimParamDescriptors(type).find((d) => d.key === key);
}

function clampToDescriptor(type: PhysicsSystemType, key: string, value: number): number {
  const d = descriptorFor(type, key);
  if (!d) return value;
  return Math.min(d.max, Math.max(d.min, value));
}

/** Default launch velocity used when the requirement only sets speed or angle. */
function currentLaunchVector(params: PhysicsParams): { speed: number; angleDeg: number } {
  const v = params.initialVelocity || { x: 12, y: 15 };
  return {
    speed: Math.hypot(v.x, v.y),
    angleDeg: (Math.atan2(v.y, v.x) * 180) / Math.PI,
  };
}

/** Read a (possibly virtual) descriptor value from params. */
export function readParamValue(params: PhysicsParams, type: PhysicsSystemType, key: string): number {
  switch (key) {
    case 'releaseAngleDeg':
      return ((params.initialAngle ?? Math.PI / 4) * 180) / Math.PI;
    case 'launchSpeed':
      return currentLaunchVector(params).speed;
    case 'launchAngleDeg':
      return currentLaunchVector(params).angleDeg;
    case 'orbitalVelocity':
      return params.initialVelocity?.y ?? 4.7;
    default: {
      const raw = (params as unknown as Record<string, number | undefined>)[key];
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      const d = descriptorFor(type, key);
      return d ? (d.min + d.max) / 2 : 0;
    }
  }
}

/** Return a params copy with a (possibly virtual) descriptor value applied. */
export function applyParamValue(
  params: PhysicsParams,
  type: PhysicsSystemType,
  key: string,
  value: number
): PhysicsParams {
  const next: PhysicsParams = { ...params, initialVelocity: params.initialVelocity ? { ...params.initialVelocity } : undefined };
  const v = clampToDescriptor(type, key, value);
  switch (key) {
    case 'releaseAngleDeg':
      next.initialAngle = (v * Math.PI) / 180;
      return next;
    case 'launchSpeed': {
      const { angleDeg } = currentLaunchVector(params);
      const rad = (angleDeg * Math.PI) / 180;
      next.initialVelocity = { x: v * Math.cos(rad), y: v * Math.sin(rad) };
      return next;
    }
    case 'launchAngleDeg': {
      const { speed } = currentLaunchVector(params);
      const rad = (v * Math.PI) / 180;
      next.initialVelocity = { x: speed * Math.cos(rad), y: speed * Math.sin(rad) };
      return next;
    }
    case 'orbitalVelocity':
      next.initialVelocity = { x: 0, y: v };
      return next;
    default:
      (next as unknown as Record<string, number>)[key] = v;
      return next;
  }
}

// ---------------------------------------------------------------------------
// Gallery catalog
// ---------------------------------------------------------------------------

export interface SimCatalogEntry {
  type: PhysicsSystemType;
  title: string;
  blurb: string;
  formula: string;
  example: string;
}

export const SIM_CATALOG: SimCatalogEntry[] = [
  {
    type: 'pendulum',
    title: 'Simple Pendulum',
    blurb: 'Swing, period and energy exchange of a hanging bob.',
    formula: 'T = 2π√(L/g)',
    example: 'Swing a 2 m pendulum from 45 degrees',
  },
  {
    type: 'spring',
    title: 'Spring–Mass Oscillator',
    blurb: 'Harmonic motion, stiffness and damping of a coil spring.',
    formula: 'T = 2π√(m/k)',
    example: 'Spring with stiffness 40 and low friction',
  },
  {
    type: 'orbit',
    title: 'Planetary Orbit',
    blurb: 'Satellite circling a planet under inverse-square gravity.',
    formula: 'v = √(GM/r)',
    example: 'Satellite orbit with velocity 5',
  },
  {
    type: 'projectile',
    title: 'Projectile Motion',
    blurb: 'Launch, range and bouncing with quadratic air drag.',
    formula: 'R = v²·sin(2θ)/g',
    example: 'Launch a projectile on the Moon at 20 m/s and 45 degrees',
  },
  {
    type: 'wave',
    title: 'Wave on a String',
    blurb: 'Traveling transverse wave with frequency and decay.',
    formula: 'v = f·λ',
    example: 'Wave on a string at 2 Hz with amplitude 0.6',
  },
];

// ---------------------------------------------------------------------------
// Requirement matcher: "simulate X ..." → system + parameter overrides
// ---------------------------------------------------------------------------

export interface RequirementMatch {
  system: PhysicsSystemType;
  params: PhysicsParams;
  /** Human summary, e.g. "Projectile Motion · Moon gravity · 20 m/s @ 45°". */
  label: string;
  terms: string[];
}

const SYSTEM_KEYWORDS: { system: PhysicsSystemType; keyword: string; weight: number }[] = [
  { system: 'pendulum', keyword: 'pendulum', weight: 3 },
  { system: 'pendulum', keyword: 'swing', weight: 2 },
  { system: 'pendulum', keyword: 'swinging', weight: 2 },
  { system: 'pendulum', keyword: 'bob', weight: 2 },
  { system: 'pendulum', keyword: 'metronome', weight: 3 },
  { system: 'pendulum', keyword: 'wrecking ball', weight: 2 },
  { system: 'spring', keyword: 'mass-spring', weight: 3 },
  { system: 'spring', keyword: 'mass on a spring', weight: 3 },
  { system: 'spring', keyword: 'spring', weight: 3 },
  { system: 'spring', keyword: 'shm', weight: 3 },
  { system: 'spring', keyword: 'hooke', weight: 3 },
  { system: 'spring', keyword: 'harmonic oscillator', weight: 3 },
  { system: 'spring', keyword: 'harmonic motion', weight: 2 },
  { system: 'spring', keyword: 'elastic', weight: 2 },
  { system: 'spring', keyword: 'coil', weight: 2 },
  { system: 'spring', keyword: 'bungee', weight: 2 },
  { system: 'orbit', keyword: 'orbit', weight: 3 },
  { system: 'orbit', keyword: 'planetary', weight: 3 },
  { system: 'orbit', keyword: 'satellite', weight: 3 },
  { system: 'orbit', keyword: 'kepler', weight: 3 },
  { system: 'orbit', keyword: 'solar system', weight: 3 },
  { system: 'orbit', keyword: 'lunar orbit', weight: 3 },
  { system: 'orbit', keyword: 'planet', weight: 2 },
  { system: 'orbit', keyword: 'gravity well', weight: 2 },
  { system: 'orbit', keyword: 'gravitational orbit', weight: 3 },
  { system: 'projectile', keyword: 'projectile', weight: 3 },
  { system: 'projectile', keyword: 'ballistic', weight: 3 },
  { system: 'projectile', keyword: 'cannon', weight: 3 },
  { system: 'projectile', keyword: 'catapult', weight: 3 },
  { system: 'projectile', keyword: 'trajectory', weight: 3 },
  { system: 'projectile', keyword: 'launch', weight: 2 },
  { system: 'projectile', keyword: 'throw', weight: 2 },
  { system: 'projectile', keyword: 'thrown', weight: 2 },
  { system: 'projectile', keyword: 'toss', weight: 2 },
  { system: 'wave', keyword: 'standing wave', weight: 3 },
  { system: 'wave', keyword: 'traveling wave', weight: 3 },
  { system: 'wave', keyword: 'travelling wave', weight: 3 },
  { system: 'wave', keyword: 'wave on a string', weight: 3 },
  { system: 'wave', keyword: 'guitar string', weight: 3 },
  { system: 'wave', keyword: 'wave', weight: 2 },
  { system: 'wave', keyword: 'ripple', weight: 2 },
  { system: 'wave', keyword: 'vibration', weight: 1 },
  { system: 'wave', keyword: 'string vibration', weight: 3 },
];

const GRAVITY_WORLDS: { name: string; match: string[]; gravity: number }[] = [
  { name: 'Mercury', match: ['mercury'], gravity: 3.7 },
  { name: 'Venus', match: ['venus'], gravity: 8.87 },
  { name: 'Earth', match: ['earth'], gravity: 9.81 },
  { name: 'Moon', match: ['moon', 'lunar'], gravity: 1.62 },
  { name: 'Mars', match: ['mars', 'martian'], gravity: 3.72 },
  { name: 'Jupiter', match: ['jupiter'], gravity: 24.79 },
  { name: 'Saturn', match: ['saturn'], gravity: 10.44 },
  { name: 'Deep space', match: ['deep space', 'zero-g', 'zero g', 'weightless', 'no gravity'], gravity: 0 },
];

interface NumberRule {
  pattern: RegExp;
  /** Descriptor key applied when the active system supports it. */
  key: string;
  term: (value: number, system: PhysicsSystemType) => string;
}

const NUMBER_RULES: NumberRule[] = [
  {
    pattern: /(?:string length|length|len)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)\s*m\b/,
    key: 'length',
    term: (v) => `L = ${v} m`,
  },
  {
    pattern: /(?:launch angle|release angle|angle)\s*(?:of|is|=|:|at)?\s*(\d+(?:\.\d+)?)\s*(?:deg|°)?/,
    key: 'angle',
    term: (v) => `${v}°`,
  },
  {
    pattern: /(?:launch speed|speed|velocity|v0)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)/,
    key: 'speed',
    term: (v, sys) => (sys === 'orbit' ? `v = ${v}` : `${v} m/s`),
  },
  {
    pattern: /gravity\s*(?:of|is|=|:|on)?\s*(\d+(?:\.\d+)?)/,
    key: 'gravity',
    term: (v) => `g = ${v}`,
  },
  {
    pattern: /(?:spring constant|spring stiffness|stiffness|\bk\b)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)/,
    key: 'springK',
    term: (v) => `k = ${v}`,
  },
  {
    pattern: /mass\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:kg)?/,
    key: 'mass',
    term: (v) => `${v} kg`,
  },
  {
    pattern: /(?:damping|friction|drag)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)/,
    key: 'damping',
    term: (v) => `drag ${v}`,
  },
  {
    pattern: /freq(?:uency)?\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:hz)?/,
    key: 'frequency',
    term: (v) => `${v} Hz`,
  },
  {
    pattern: /amplitude\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)/,
    key: 'amplitude',
    term: (v) => `A = ${v}`,
  },
  {
    pattern: /(?:pull|displacement)\s*(?:of|is|=|:|distance)?\s*(\d+(?:\.\d+)?)\s*m\b/,
    key: 'initialDisplacement',
    term: (v) => `pull ${v} m`,
  },
  // Bare-unit fallbacks (no keyword needed): "20 m/s", "45°", "2 Hz", "3 kg", "2 m".
  {
    pattern: /(\d+(?:\.\d+)?)\s*m\/s/,
    key: 'speed',
    term: (v, sys) => (sys === 'orbit' ? `v = ${v}` : `${v} m/s`),
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*(?:degrees|deg|°)/,
    key: 'angle',
    term: (v) => `${v}°`,
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*hz/,
    key: 'frequency',
    term: (v) => `${v} Hz`,
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*kg/,
    key: 'mass',
    term: (v) => `${v} kg`,
  },
  {
    pattern: /(\d+(?:\.\d+)?)\s*m\b(?!\/)/,
    key: 'length',
    term: (v) => `L = ${v} m`,
  },
];

/** Map generic number-rule keys onto the active system's descriptor keys. */
function resolveRuleKey(system: PhysicsSystemType, ruleKey: string): string | null {
  if (ruleKey === 'angle') {
    if (system === 'pendulum') return 'releaseAngleDeg';
    if (system === 'projectile') return 'launchAngleDeg';
    return null;
  }
  if (ruleKey === 'speed') {
    if (system === 'projectile') return 'launchSpeed';
    if (system === 'orbit') return 'orbitalVelocity';
    return null;
  }
  return descriptorFor(system, ruleKey) ? ruleKey : null;
}

function catalogTitle(system: PhysicsSystemType): string {
  return SIM_CATALOG.find((e) => e.type === system)?.title ?? system;
}

export function matchRequirement(text: string): RequirementMatch | null {
  const lower = text.toLowerCase();
  const scores = new Map<PhysicsSystemType, number>();
  for (const { system, keyword, weight } of SYSTEM_KEYWORDS) {
    if (lower.includes(keyword)) {
      scores.set(system, (scores.get(system) ?? 0) + weight);
    }
  }
  if (scores.size === 0) return null;

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [best, bestScore] = ranked[0];
  // Require a confident, unambiguous winner: minimum strength, no tie.
  if (bestScore < 2) return null;
  if (ranked.length > 1 && ranked[1][1] >= bestScore) return null;

  let params = LivingInkPhysicsEngine.getDefaultParams(best);
  const terms: string[] = [];

  // Planet / world gravity presets (systems that use gravity).
  if (best !== 'wave' && best !== 'orbit' && best !== 'spring') {
    for (const world of GRAVITY_WORLDS) {
      if (world.match.some((m) => lower.includes(m))) {
        params = applyParamValue(params, best, 'gravity', world.gravity);
        terms.push(world.name === 'Deep space' ? 'zero gravity' : `${world.name} gravity`);
        break;
      }
    }
  }

  for (const rule of NUMBER_RULES) {
    const m = lower.match(rule.pattern);
    if (!m) continue;
    const targetKey = resolveRuleKey(best, rule.key);
    if (!targetKey) continue;
    const value = parseFloat(m[1]);
    if (!Number.isFinite(value)) continue;
    params = applyParamValue(params, best, targetKey, value);
    const term = rule.term(readParamValue(params, best, targetKey), best);
    if (!terms.includes(term)) terms.push(term);
  }

  const label = terms.length > 0 ? `${catalogTitle(best)} · ${terms.join(' · ')}` : catalogTitle(best);
  return { system: best, params, label, terms };
}
