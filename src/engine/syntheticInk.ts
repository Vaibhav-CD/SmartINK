import { Point, Stroke, StrokePoint } from '../types/canvas';
import { chaikinSmooth } from './smoothing';

// Normalized stroke glyph definitions (0 to 1 bounding box)
// Each glyph is an array of strokes, where each stroke is an array of [x, y, relativePressure]
const GLYPH_PATHS: Record<string, number[][][]> = {
  '0': [
    [
      [0.5, 0.05, 0.4],
      [0.2, 0.2, 0.6],
      [0.15, 0.5, 0.7],
      [0.2, 0.8, 0.6],
      [0.5, 0.95, 0.5],
      [0.8, 0.8, 0.6],
      [0.85, 0.5, 0.7],
      [0.8, 0.2, 0.6],
      [0.52, 0.07, 0.4],
    ],
  ],
  '1': [
    [
      [0.3, 0.25, 0.4],
      [0.5, 0.05, 0.6],
      [0.5, 0.95, 0.8],
    ],
  ],
  '2': [
    [
      [0.2, 0.25, 0.4],
      [0.35, 0.08, 0.6],
      [0.65, 0.08, 0.6],
      [0.8, 0.25, 0.7],
      [0.65, 0.5, 0.6],
      [0.2, 0.92, 0.7],
      [0.85, 0.92, 0.6],
    ],
  ],
  '3': [
    [
      [0.2, 0.15, 0.4],
      [0.5, 0.08, 0.6],
      [0.75, 0.2, 0.6],
      [0.5, 0.48, 0.5],
      [0.8, 0.65, 0.6],
      [0.7, 0.9, 0.7],
      [0.3, 0.92, 0.5],
    ],
  ],
  '4': [
    [
      [0.7, 0.1, 0.5],
      [0.2, 0.65, 0.6],
      [0.85, 0.65, 0.6],
    ],
    [
      [0.7, 0.3, 0.5],
      [0.7, 0.95, 0.7],
    ],
  ],
  '5': [
    [
      [0.75, 0.1, 0.6],
      [0.3, 0.1, 0.6],
      [0.25, 0.45, 0.6],
      [0.6, 0.4, 0.7],
      [0.8, 0.6, 0.7],
      [0.7, 0.88, 0.7],
      [0.3, 0.92, 0.5],
    ],
  ],
  '6': [
    [
      [0.7, 0.12, 0.4],
      [0.35, 0.35, 0.6],
      [0.2, 0.65, 0.7],
      [0.4, 0.95, 0.6],
      [0.75, 0.85, 0.6],
      [0.75, 0.55, 0.6],
      [0.4, 0.5, 0.6],
      [0.22, 0.68, 0.5],
    ],
  ],
  '7': [
    [
      [0.2, 0.12, 0.5],
      [0.8, 0.1, 0.7],
      [0.4, 0.95, 0.7],
    ],
  ],
  '8': [
    [
      [0.5, 0.5, 0.5],
      [0.3, 0.3, 0.6],
      [0.4, 0.1, 0.6],
      [0.6, 0.1, 0.6],
      [0.7, 0.3, 0.6],
      [0.5, 0.5, 0.7],
      [0.3, 0.7, 0.6],
      [0.35, 0.92, 0.6],
      [0.65, 0.92, 0.6],
      [0.7, 0.7, 0.6],
      [0.5, 0.5, 0.5],
    ],
  ],
  '9': [
    [
      [0.75, 0.5, 0.6],
      [0.5, 0.52, 0.6],
      [0.25, 0.35, 0.6],
      [0.35, 0.1, 0.6],
      [0.7, 0.12, 0.6],
      [0.8, 0.45, 0.7],
      [0.65, 0.8, 0.6],
      [0.35, 0.95, 0.4],
    ],
  ],
  '.': [
    [
      [0.45, 0.88, 0.7],
      [0.55, 0.92, 0.7],
    ],
  ],
  '-': [
    [
      [0.15, 0.5, 0.5],
      [0.85, 0.5, 0.6],
    ],
  ],
  '+': [
    [
      [0.2, 0.5, 0.6],
      [0.8, 0.5, 0.6],
    ],
    [
      [0.5, 0.2, 0.6],
      [0.5, 0.8, 0.6],
    ],
  ],
};

export interface SyntheticHandwritingOptions {
  fontSize?: number; // In world units, e.g. 28
  slant?: number; // Radians, e.g. -0.15 (slight right slant)
  jitter?: number; // 0.0 to 1.0
  color?: string;
  baseThickness?: number;
  pageId: string;
}

/**
 * Generates natural handwritten strokes for a text result (e.g. "36" or "150.796")
 * at a target world coordinate (x, y).
 */
export function generateSyntheticHandwritingStrokes(
  text: string,
  origin: Point,
  options: SyntheticHandwritingOptions
): Stroke[] {
  const fontSize = options.fontSize || 32;
  const slant = options.slant ?? -0.12; // Typical natural human slant
  const jitterFactor = options.jitter ?? 0.04;
  const color = options.color || '#38bdf8'; // Cyan neon accent
  const baseThickness = options.baseThickness || 3;
  const pageId = options.pageId;

  const strokes: Stroke[] = [];
  const charWidth = fontSize * 0.6;
  const charSpacing = fontSize * 0.18;

  let currentX = origin.x;
  const baselineY = origin.y;

  // Pseudo-random with subtle deterministic variation
  let seed = 12345;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === ' ') {
      currentX += charWidth * 0.7;
      continue;
    }

    const glyphStrokes = GLYPH_PATHS[char] || GLYPH_PATHS['0'];
    const currentGlyphWidth = char === '.' ? charWidth * 0.35 : charWidth;

    for (const strokeDef of glyphStrokes) {
      const rawPoints: StrokePoint[] = [];

      for (const [gx, gy, gPressure] of strokeDef) {
        // Slant transformation: x' = x + slant * (y - baseline)
        const relY = gy * fontSize;
        const slantedX = gx * currentGlyphWidth + (1 - gy) * Math.sin(slant) * fontSize;

        // Subtle organic hand jitter
        const jitterX = (rng() - 0.5) * fontSize * jitterFactor;
        const jitterY = (rng() - 0.5) * fontSize * jitterFactor;

        // Subtle pressure jitter
        const pressure = Math.min(1, Math.max(0.2, gPressure + (rng() - 0.5) * 0.15));

        rawPoints.push({
          x: currentX + slantedX + jitterX,
          y: baselineY + relY + jitterY,
          pressure,
        });
      }

      // Smooth the generated stroke points
      const smoothed = chaikinSmooth(rawPoints, 2);

      // Compute bounding box
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const p of smoothed) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }

      strokes.push({
        id: `synthetic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tool: 'pen',
        color,
        size: baseThickness,
        opacity: 0.95,
        points: smoothed,
        pageId,
        createdAt: Date.now(),
        bbox: { minX, minY, maxX, maxY },
        synthetic: true,
      });
    }

    currentX += currentGlyphWidth + charSpacing;
  }

  return strokes;
}
