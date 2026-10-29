import type { Point, Stroke } from '../../types';
import type { HandwritingStyle } from './strokeRecognizer';

interface GlyphStrokeDef {
  points: { x: number; y: number }[];
}

/**
 * Normalizes and interpolates points into a smooth organic stroke with sub-pixel micro-jitter
 */
function interpolateStroke(
  pts: { x: number; y: number }[],
  originX: number,
  originY: number,
  width: number,
  height: number,
  slantRad: number,
  jitterSeed: number
): Point[] {
  if (pts.length === 0) return [];

  const dense: Point[] = [];
  const stepsPerSegment = 6;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];

    for (let s = 0; s <= stepsPerSegment; s++) {
      if (s === stepsPerSegment && i < pts.length - 2) continue; // Avoid duplicate joining points
      const t = s / stepsPerSegment;
      const rawNormX = p0.x + (p1.x - p0.x) * t;
      const rawNormY = p0.y + (p1.y - p0.y) * t;

      // Micro-jitter for authentic organic handwriting variation
      const jitterX = (Math.sin(jitterSeed + (i * stepsPerSegment + s) * 1.7) * 0.4);
      const jitterY = (Math.cos(jitterSeed + (i * stepsPerSegment + s) * 2.1) * 0.4);

      // Map to world coordinates
      let worldX = originX + rawNormX * width + jitterX;
      let worldY = originY + rawNormY * height + jitterY;

      // Apply dynamic handwriting slant shear: x' = x + (baseY - y) * tan(slant)
      const centerY = originY + height * 0.5;
      worldX += (centerY - worldY) * Math.tan(slantRad);

      dense.push({
        x: Math.round(worldX * 10) / 10,
        y: Math.round(worldY * 10) / 10,
      });
    }
  }

  return dense;
}

/**
 * Returns raw unit-box normalized strokes for a single character
 */
function getGlyphStrokes(char: string): GlyphStrokeDef[] {
  switch (char) {
    case '=':
      return [
        { points: [{ x: 0.1, y: 0.38 }, { x: 0.5, y: 0.37 }, { x: 0.9, y: 0.38 }] },
        { points: [{ x: 0.1, y: 0.62 }, { x: 0.5, y: 0.63 }, { x: 0.9, y: 0.62 }] },
      ];

    case '+':
      return [
        { points: [{ x: 0.15, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.85, y: 0.5 }] },
        { points: [{ x: 0.5, y: 0.15 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.85 }] },
      ];

    case '-':
      return [
        { points: [{ x: 0.15, y: 0.5 }, { x: 0.5, y: 0.49 }, { x: 0.85, y: 0.5 }] },
      ];

    case '±':
      return [
        { points: [{ x: 0.15, y: 0.4 }, { x: 0.85, y: 0.4 }] },
        { points: [{ x: 0.5, y: 0.1 }, { x: 0.5, y: 0.7 }] },
        { points: [{ x: 0.15, y: 0.88 }, { x: 0.85, y: 0.88 }] },
      ];

    case 'x':
    case 'X':
      return [
        { points: [{ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.8, y: 0.8 }] },
        { points: [{ x: 0.8, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.2, y: 0.8 }] },
      ];

    case 'y':
    case 'Y':
      return [
        { points: [{ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.55 }] },
        { points: [{ x: 0.8, y: 0.2 }, { x: 0.5, y: 0.55 }, { x: 0.3, y: 1.05 }] },
      ];

    case '0':
      return [
        {
          points: [
            { x: 0.5, y: 0.12 },
            { x: 0.22, y: 0.35 },
            { x: 0.22, y: 0.65 },
            { x: 0.5, y: 0.88 },
            { x: 0.78, y: 0.65 },
            { x: 0.78, y: 0.35 },
            { x: 0.52, y: 0.12 },
          ],
        },
      ];

    case '1':
      return [
        { points: [{ x: 0.35, y: 0.25 }, { x: 0.5, y: 0.12 }, { x: 0.5, y: 0.88 }] },
      ];

    case '2':
      return [
        {
          points: [
            { x: 0.25, y: 0.32 },
            { x: 0.5, y: 0.14 },
            { x: 0.75, y: 0.3 },
            { x: 0.65, y: 0.55 },
            { x: 0.25, y: 0.88 },
            { x: 0.78, y: 0.88 },
          ],
        },
      ];

    case '3':
      return [
        {
          points: [
            { x: 0.28, y: 0.2 },
            { x: 0.72, y: 0.2 },
            { x: 0.45, y: 0.48 },
            { x: 0.75, y: 0.65 },
            { x: 0.5, y: 0.88 },
            { x: 0.25, y: 0.78 },
          ],
        },
      ];

    case '4':
      return [
        { points: [{ x: 0.65, y: 0.15 }, { x: 0.2, y: 0.65 }, { x: 0.82, y: 0.65 }] },
        { points: [{ x: 0.65, y: 0.15 }, { x: 0.65, y: 0.88 }] },
      ];

    case '5':
      return [
        {
          points: [
            { x: 0.75, y: 0.18 },
            { x: 0.3, y: 0.18 },
            { x: 0.26, y: 0.46 },
            { x: 0.7, y: 0.48 },
            { x: 0.75, y: 0.72 },
            { x: 0.5, y: 0.88 },
            { x: 0.26, y: 0.8 },
          ],
        },
      ];

    case '6':
      return [
        {
          points: [
            { x: 0.7, y: 0.16 },
            { x: 0.35, y: 0.35 },
            { x: 0.24, y: 0.62 },
            { x: 0.48, y: 0.88 },
            { x: 0.76, y: 0.7 },
            { x: 0.6, y: 0.5 },
            { x: 0.28, y: 0.6 },
          ],
        },
      ];

    case '7':
      return [
        {
          points: [
            { x: 0.22, y: 0.18 },
            { x: 0.78, y: 0.18 },
            { x: 0.42, y: 0.88 },
          ],
        },
      ];

    case '8':
      return [
        {
          points: [
            { x: 0.5, y: 0.5 },
            { x: 0.3, y: 0.3 },
            { x: 0.5, y: 0.14 },
            { x: 0.7, y: 0.3 },
            { x: 0.5, y: 0.5 },
            { x: 0.26, y: 0.7 },
            { x: 0.5, y: 0.88 },
            { x: 0.74, y: 0.7 },
            { x: 0.5, y: 0.5 },
          ],
        },
      ];

    case '9':
      return [
        {
          points: [
            { x: 0.72, y: 0.42 },
            { x: 0.48, y: 0.14 },
            { x: 0.24, y: 0.32 },
            { x: 0.42, y: 0.52 },
            { x: 0.72, y: 0.42 },
            { x: 0.7, y: 0.75 },
            { x: 0.45, y: 0.88 },
          ],
        },
      ];

    case '.':
      return [
        { points: [{ x: 0.45, y: 0.84 }, { x: 0.55, y: 0.84 }] },
      ];

    case ',':
      return [
        { points: [{ x: 0.5, y: 0.8 }, { x: 0.45, y: 0.95 }] },
      ];

    case '(':
      return [
        { points: [{ x: 0.65, y: 0.1 }, { x: 0.35, y: 0.5 }, { x: 0.65, y: 0.9 }] },
      ];

    case ')':
      return [
        { points: [{ x: 0.35, y: 0.1 }, { x: 0.65, y: 0.5 }, { x: 0.35, y: 0.9 }] },
      ];

    case '/':
      return [
        { points: [{ x: 0.25, y: 0.88 }, { x: 0.75, y: 0.14 }] },
      ];

    case 'a':
      return [
        { points: [{ x: 0.62, y: 0.45 }, { x: 0.62, y: 0.85 }] },
        { points: [{ x: 0.58, y: 0.5 }, { x: 0.38, y: 0.5 }, { x: 0.3, y: 0.65 }, { x: 0.42, y: 0.85 }, { x: 0.62, y: 0.82 }] },
      ];

    case 'b':
      return [
        { points: [{ x: 0.32, y: 0.1 }, { x: 0.32, y: 0.85 }] },
        { points: [{ x: 0.32, y: 0.85 }, { x: 0.32, y: 0.52 }, { x: 0.58, y: 0.45 }, { x: 0.68, y: 0.6 }, { x: 0.58, y: 0.8 }, { x: 0.32, y: 0.85 }] },
      ];

    case 'c':
      return [
        { points: [{ x: 0.68, y: 0.5 }, { x: 0.42, y: 0.45 }, { x: 0.28, y: 0.6 }, { x: 0.35, y: 0.8 }, { x: 0.62, y: 0.85 }, { x: 0.7, y: 0.78 }] },
      ];

    case 'd':
      return [
        { points: [{ x: 0.3, y: 0.85 }, { x: 0.3, y: 0.52 }, { x: 0.55, y: 0.45 }, { x: 0.65, y: 0.62 }, { x: 0.55, y: 0.85 }] },
        { points: [{ x: 0.65, y: 0.1 }, { x: 0.65, y: 0.85 }] },
      ];

    case 'e':
      return [
        { points: [{ x: 0.65, y: 0.78 }, { x: 0.4, y: 0.85 }, { x: 0.28, y: 0.68 }, { x: 0.35, y: 0.5 }, { x: 0.6, y: 0.45 }, { x: 0.68, y: 0.55 }, { x: 0.3, y: 0.6 }] },
      ];

    case 'f':
      return [
        { points: [{ x: 0.58, y: 0.85 }, { x: 0.58, y: 0.22 }, { x: 0.44, y: 0.12 }] },
        { points: [{ x: 0.36, y: 0.42 }, { x: 0.68, y: 0.42 }] },
      ];

    case 'g':
      return [
        { points: [{ x: 0.6, y: 0.5 }, { x: 0.38, y: 0.5 }, { x: 0.3, y: 0.65 }, { x: 0.42, y: 0.85 }, { x: 0.6, y: 0.82 }] },
        { points: [{ x: 0.6, y: 0.55 }, { x: 0.6, y: 0.9 }, { x: 0.52, y: 1.0 }, { x: 0.32, y: 1.0 }] },
      ];

    case 'h':
      return [
        { points: [{ x: 0.3, y: 0.1 }, { x: 0.3, y: 0.85 }] },
        { points: [{ x: 0.3, y: 0.62 }, { x: 0.44, y: 0.46 }, { x: 0.64, y: 0.46 }, { x: 0.64, y: 0.85 }] },
      ];

    case 'i':
      return [
        { points: [{ x: 0.5, y: 0.48 }, { x: 0.5, y: 0.85 }] },
        { points: [{ x: 0.5, y: 0.28 }, { x: 0.54, y: 0.28 }] },
      ];

    case 'j':
      return [
        { points: [{ x: 0.56, y: 0.3 }, { x: 0.56, y: 0.88 }, { x: 0.46, y: 1.0 }, { x: 0.32, y: 0.96 }] },
        { points: [{ x: 0.56, y: 0.12 }, { x: 0.6, y: 0.12 }] },
      ];

    case 'k':
      return [
        { points: [{ x: 0.3, y: 0.1 }, { x: 0.3, y: 0.85 }] },
        { points: [{ x: 0.64, y: 0.42 }, { x: 0.3, y: 0.62 }] },
        { points: [{ x: 0.36, y: 0.64 }, { x: 0.64, y: 0.85 }] },
      ];

    case 'l':
      return [
        { points: [{ x: 0.44, y: 0.85 }, { x: 0.5, y: 0.1 }] },
      ];

    case 'm':
      return [
        { points: [{ x: 0.2, y: 0.85 }, { x: 0.2, y: 0.5 }, { x: 0.4, y: 0.5 }, { x: 0.4, y: 0.85 }] },
        { points: [{ x: 0.4, y: 0.5 }, { x: 0.6, y: 0.5 }, { x: 0.6, y: 0.85 }] },
      ];

    case 'n':
      return [
        { points: [{ x: 0.26, y: 0.85 }, { x: 0.26, y: 0.46 }, { x: 0.56, y: 0.46 }, { x: 0.56, y: 0.85 }] },
      ];

    case 'o':
      return [
        { points: [{ x: 0.5, y: 0.46 }, { x: 0.3, y: 0.56 }, { x: 0.3, y: 0.72 }, { x: 0.5, y: 0.85 }, { x: 0.7, y: 0.72 }, { x: 0.7, y: 0.56 }, { x: 0.5, y: 0.46 }] },
      ];

    case 'p':
      return [
        { points: [{ x: 0.3, y: 0.46 }, { x: 0.3, y: 1.0 }] },
        { points: [{ x: 0.3, y: 0.46 }, { x: 0.58, y: 0.46 }, { x: 0.66, y: 0.6 }, { x: 0.54, y: 0.8 }, { x: 0.3, y: 0.8 }] },
      ];

    case 'q':
      return [
        { points: [{ x: 0.5, y: 0.46 }, { x: 0.32, y: 0.56 }, { x: 0.32, y: 0.72 }, { x: 0.5, y: 0.85 }, { x: 0.66, y: 0.72 }, { x: 0.66, y: 0.56 }, { x: 0.5, y: 0.46 }] },
        { points: [{ x: 0.62, y: 0.7 }, { x: 0.74, y: 0.92 }, { x: 0.74, y: 1.0 }] },
      ];

    case 'r':
      return [
        { points: [{ x: 0.3, y: 0.85 }, { x: 0.3, y: 0.46 }, { x: 0.54, y: 0.46 }, { x: 0.6, y: 0.56 }] },
      ];

    case 's':
      return [
        { points: [{ x: 0.64, y: 0.52 }, { x: 0.4, y: 0.46 }, { x: 0.3, y: 0.58 }, { x: 0.44, y: 0.68 }, { x: 0.64, y: 0.72 }, { x: 0.6, y: 0.85 }, { x: 0.36, y: 0.87 }] },
      ];

    case 't':
      return [
        { points: [{ x: 0.5, y: 0.16 }, { x: 0.5, y: 0.85 }] },
        { points: [{ x: 0.3, y: 0.46 }, { x: 0.7, y: 0.46 }] },
      ];

    case 'u':
      return [
        { points: [{ x: 0.3, y: 0.46 }, { x: 0.3, y: 0.74 }, { x: 0.44, y: 0.85 }, { x: 0.6, y: 0.74 }, { x: 0.6, y: 0.46 }] },
      ];

    case 'v':
      return [
        { points: [{ x: 0.26, y: 0.46 }, { x: 0.45, y: 0.85 }, { x: 0.64, y: 0.46 }] },
      ];

    case 'w':
      return [
        { points: [{ x: 0.14, y: 0.46 }, { x: 0.3, y: 0.85 }, { x: 0.45, y: 0.52 }, { x: 0.6, y: 0.85 }, { x: 0.76, y: 0.46 }] },
      ];

    case 'z':
      return [
        { points: [{ x: 0.3, y: 0.46 }, { x: 0.7, y: 0.46 }, { x: 0.3, y: 0.85 }, { x: 0.7, y: 0.85 }] },
      ];

    case 'A':
      return [
        { points: [{ x: 0.2, y: 0.85 }, { x: 0.5, y: 0.1 }, { x: 0.8, y: 0.85 }] },
        { points: [{ x: 0.35, y: 0.6 }, { x: 0.65, y: 0.6 }] },
      ];

    case 'B':
      return [
        { points: [{ x: 0.3, y: 0.1 }, { x: 0.3, y: 0.85 }] },
        { points: [{ x: 0.3, y: 0.1 }, { x: 0.58, y: 0.12 }, { x: 0.66, y: 0.3 }, { x: 0.48, y: 0.48 }, { x: 0.3, y: 0.48 }] },
        { points: [{ x: 0.3, y: 0.48 }, { x: 0.6, y: 0.5 }, { x: 0.68, y: 0.68 }, { x: 0.48, y: 0.85 }, { x: 0.3, y: 0.85 }] },
      ];

    case 'C':
      return [
        { points: [{ x: 0.7, y: 0.26 }, { x: 0.4, y: 0.12 }, { x: 0.26, y: 0.4 }, { x: 0.26, y: 0.6 }, { x: 0.4, y: 0.85 }, { x: 0.7, y: 0.74 }] },
      ];

    case 'D':
      return [
        { points: [{ x: 0.34, y: 0.1 }, { x: 0.34, y: 0.85 }] },
        { points: [{ x: 0.34, y: 0.1 }, { x: 0.62, y: 0.16 }, { x: 0.74, y: 0.48 }, { x: 0.62, y: 0.82 }, { x: 0.34, y: 0.85 }] },
      ];

    case 'E':
      return [
        { points: [{ x: 0.34, y: 0.1 }, { x: 0.34, y: 0.85 }] },
        { points: [{ x: 0.34, y: 0.1 }, { x: 0.7, y: 0.1 }] },
        { points: [{ x: 0.34, y: 0.48 }, { x: 0.62, y: 0.48 }] },
        { points: [{ x: 0.34, y: 0.85 }, { x: 0.7, y: 0.85 }] },
      ];

    case 'F':
      return [
        { points: [{ x: 0.34, y: 0.1 }, { x: 0.34, y: 0.85 }] },
        { points: [{ x: 0.34, y: 0.1 }, { x: 0.7, y: 0.1 }] },
        { points: [{ x: 0.34, y: 0.48 }, { x: 0.6, y: 0.48 }] },
      ];

    case 'G':
      return [
        { points: [{ x: 0.7, y: 0.26 }, { x: 0.4, y: 0.12 }, { x: 0.26, y: 0.4 }, { x: 0.26, y: 0.6 }, { x: 0.4, y: 0.85 }, { x: 0.68, y: 0.82 }, { x: 0.68, y: 0.6 }, { x: 0.52, y: 0.6 }] },
      ];

    case 'H':
      return [
        { points: [{ x: 0.28, y: 0.1 }, { x: 0.28, y: 0.85 }] },
        { points: [{ x: 0.72, y: 0.1 }, { x: 0.72, y: 0.85 }] },
        { points: [{ x: 0.28, y: 0.48 }, { x: 0.72, y: 0.48 }] },
      ];

    case 'I':
      return [
        { points: [{ x: 0.5, y: 0.1 }, { x: 0.5, y: 0.85 }] },
        { points: [{ x: 0.32, y: 0.1 }, { x: 0.68, y: 0.1 }] },
        { points: [{ x: 0.32, y: 0.85 }, { x: 0.68, y: 0.85 }] },
      ];

    case 'J':
      return [
        { points: [{ x: 0.6, y: 0.1 }, { x: 0.6, y: 0.68 }, { x: 0.45, y: 0.85 }, { x: 0.3, y: 0.78 }] },
      ];

    case 'K':
      return [
        { points: [{ x: 0.3, y: 0.1 }, { x: 0.3, y: 0.85 }] },
        { points: [{ x: 0.66, y: 0.1 }, { x: 0.32, y: 0.5 }] },
        { points: [{ x: 0.4, y: 0.56 }, { x: 0.68, y: 0.85 }] },
      ];

    case 'L':
      return [
        { points: [{ x: 0.36, y: 0.1 }, { x: 0.36, y: 0.85 }, { x: 0.7, y: 0.85 }] },
      ];

    case 'M':
      return [
        { points: [{ x: 0.2, y: 0.85 }, { x: 0.2, y: 0.1 }, { x: 0.5, y: 0.5 }, { x: 0.8, y: 0.1 }, { x: 0.8, y: 0.85 }] },
      ];

    case 'N':
      return [
        { points: [{ x: 0.26, y: 0.85 }, { x: 0.26, y: 0.1 }, { x: 0.74, y: 0.85 }, { x: 0.74, y: 0.1 }] },
      ];

    case 'O':
      return [
        { points: [{ x: 0.5, y: 0.1 }, { x: 0.26, y: 0.3 }, { x: 0.26, y: 0.65 }, { x: 0.5, y: 0.88 }, { x: 0.74, y: 0.65 }, { x: 0.74, y: 0.3 }, { x: 0.5, y: 0.1 }] },
      ];

    case 'P':
      return [
        { points: [{ x: 0.32, y: 0.1 }, { x: 0.32, y: 0.85 }] },
        { points: [{ x: 0.32, y: 0.1 }, { x: 0.62, y: 0.12 }, { x: 0.7, y: 0.3 }, { x: 0.5, y: 0.48 }, { x: 0.32, y: 0.48 }] },
      ];

    case 'Q':
      return [
        { points: [{ x: 0.5, y: 0.1 }, { x: 0.26, y: 0.3 }, { x: 0.26, y: 0.65 }, { x: 0.5, y: 0.88 }, { x: 0.74, y: 0.65 }, { x: 0.74, y: 0.3 }, { x: 0.5, y: 0.1 }] },
        { points: [{ x: 0.58, y: 0.62 }, { x: 0.8, y: 0.9 }] },
      ];

    case 'R':
      return [
        { points: [{ x: 0.32, y: 0.1 }, { x: 0.32, y: 0.85 }] },
        { points: [{ x: 0.32, y: 0.1 }, { x: 0.62, y: 0.12 }, { x: 0.7, y: 0.3 }, { x: 0.5, y: 0.48 }, { x: 0.32, y: 0.48 }] },
        { points: [{ x: 0.44, y: 0.5 }, { x: 0.7, y: 0.85 }] },
      ];

    case 'S':
      return [
        { points: [{ x: 0.7, y: 0.26 }, { x: 0.4, y: 0.12 }, { x: 0.28, y: 0.34 }, { x: 0.5, y: 0.5 }, { x: 0.72, y: 0.6 }, { x: 0.64, y: 0.82 }, { x: 0.36, y: 0.85 }] },
      ];

    case 'T':
      return [
        { points: [{ x: 0.24, y: 0.1 }, { x: 0.76, y: 0.1 }] },
        { points: [{ x: 0.5, y: 0.1 }, { x: 0.5, y: 0.85 }] },
      ];

    case 'U':
      return [
        { points: [{ x: 0.26, y: 0.1 }, { x: 0.26, y: 0.68 }, { x: 0.5, y: 0.86 }, { x: 0.74, y: 0.68 }, { x: 0.74, y: 0.1 }] },
      ];

    case 'V':
      return [
        { points: [{ x: 0.2, y: 0.1 }, { x: 0.5, y: 0.85 }, { x: 0.8, y: 0.1 }] },
      ];

    case 'W':
      return [
        { points: [{ x: 0.12, y: 0.1 }, { x: 0.3, y: 0.85 }, { x: 0.5, y: 0.3 }, { x: 0.7, y: 0.85 }, { x: 0.88, y: 0.1 }] },
      ];

    case 'Z':
      return [
        { points: [{ x: 0.26, y: 0.1 }, { x: 0.74, y: 0.1 }, { x: 0.26, y: 0.85 }, { x: 0.74, y: 0.85 }] },
      ];

    case ':':
      return [
        { points: [{ x: 0.5, y: 0.4 }, { x: 0.54, y: 0.4 }] },
        { points: [{ x: 0.5, y: 0.7 }, { x: 0.54, y: 0.7 }] },
      ];

    case '?':
      return [
        { points: [{ x: 0.3, y: 0.24 }, { x: 0.55, y: 0.14 }, { x: 0.68, y: 0.32 }, { x: 0.5, y: 0.52 }, { x: 0.5, y: 0.64 }] },
        { points: [{ x: 0.5, y: 0.78 }, { x: 0.54, y: 0.78 }] },
      ];

    case '!':
      return [
        { points: [{ x: 0.5, y: 0.1 }, { x: 0.5, y: 0.62 }] },
        { points: [{ x: 0.5, y: 0.76 }, { x: 0.54, y: 0.76 }] },
      ];

    case "'":
      return [
        { points: [{ x: 0.52, y: 0.2 }, { x: 0.46, y: 0.36 }] },
      ];

    case '%':
      return [
        { points: [{ x: 0.3, y: 0.3 }, { x: 0.34, y: 0.3 }] },
        { points: [{ x: 0.66, y: 0.7 }, { x: 0.7, y: 0.7 }] },
        { points: [{ x: 0.25, y: 0.75 }, { x: 0.75, y: 0.25 }] },
      ];

    case '*':
      return [
        { points: [{ x: 0.5, y: 0.25 }, { x: 0.5, y: 0.75 }] },
        { points: [{ x: 0.28, y: 0.37 }, { x: 0.72, y: 0.63 }] },
        { points: [{ x: 0.72, y: 0.37 }, { x: 0.28, y: 0.63 }] },
      ];

    case '^':
      return [
        { points: [{ x: 0.2, y: 0.5 }, { x: 0.5, y: 0.2 }, { x: 0.8, y: 0.5 }] },
      ];

    default:
      // Fallback simple vertical stroke for unmapped chars
      return [
        { points: [{ x: 0.5, y: 0.2 }, { x: 0.5, y: 0.8 }] },
      ];
  }
}

/**
 * Generative Vector Handwriting Synthesizer (Apple Math Notes Style)
 * Converts text into organic handwritten digital ink Stroke objects matching the user's style.
 */
export class HandwritingVectorSynthesizer {
  public static synthesize(
    text: string,
    startPosition: { x: number; y: number },
    style?: HandwritingStyle,
    baseHeight: number = 32
  ): Stroke[] {
    const cleanText = text.trim();
    if (!cleanText) return [];

    const strokes: Stroke[] = [];
    const color = style?.color || '#a3e635';
    const width = Math.max(2, Math.min(6, style?.avgStrokeWidth || 3.5));
    const slantDeg = style?.slantAngle || 0;
    const slantRad = (slantDeg * Math.PI) / 180;

    const charHeight = baseHeight;
    const charWidth = charHeight * 0.62;
    const charSpacing = charWidth * 0.28;

    let currentX = startPosition.x;
    const baseY = startPosition.y;

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];

      if (char === ' ') {
        currentX += charWidth * 0.75;
        continue;
      }

      const glyphDefs = getGlyphStrokes(char);
      const isNarrow = char === '.' || char === ',' || char === '1' || char === 'i' || char === 'l' || char === 'j' || char === ':' || char === '!' || char === "'" || char === 'I';
      const actualWidth = isNarrow ? charWidth * 0.5 : charWidth;

      for (let g = 0; g < glyphDefs.length; g++) {
        const jitterSeed = (i + 1) * 37 + (g + 1) * 19;
        const pts = interpolateStroke(
          glyphDefs[g].points,
          currentX,
          baseY,
          actualWidth,
          charHeight,
          slantRad,
          jitterSeed
        );

        if (pts.length > 0) {
          strokes.push({
            id: `ink-synth-${Date.now()}-${i}-${g}`,
            points: pts,
            color,
            width,
            createdAt: Date.now() + i * 10 + g,
          });
        }
      }

      currentX += actualWidth + charSpacing;
    }

    return strokes;
  }
}
