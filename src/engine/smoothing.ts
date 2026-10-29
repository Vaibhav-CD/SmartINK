import { Point, StrokePoint } from '../types/canvas';

/**
 * Applies Chaikin's corner cutting algorithm to smooth rough polygon strokes.
 */
export function chaikinSmooth(points: StrokePoint[], iterations = 2): StrokePoint[] {
  if (points.length <= 2) return points;

  let current = points;
  for (let it = 0; it < iterations; it++) {
    const next: StrokePoint[] = [current[0]];
    for (let i = 0; i < current.length - 1; i++) {
      const p0 = current[i];
      const p1 = current[i + 1];

      // Q = 0.75 * P0 + 0.25 * P1
      const q: StrokePoint = {
        x: 0.75 * p0.x + 0.25 * p1.x,
        y: 0.75 * p0.y + 0.25 * p1.y,
        pressure: 0.75 * (p0.pressure ?? 0.5) + 0.25 * (p1.pressure ?? 0.5),
      };

      // R = 0.25 * P0 + 0.75 * P1
      const r: StrokePoint = {
        x: 0.25 * p0.x + 0.75 * p1.x,
        y: 0.25 * p0.y + 0.75 * p1.y,
        pressure: 0.25 * (p0.pressure ?? 0.5) + 0.75 * (p1.pressure ?? 0.5),
      };

      next.push(q, r);
    }
    next.push(current[current.length - 1]);
    current = next;
  }
  return current;
}

/**
 * Calculates Catmull-Rom spline points for smooth curved rendering.
 */
export function catmullRomSpline(p0: Point, p1: Point, p2: Point, p3: Point, numPoints = 6): Point[] {
  const result: Point[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const t2 = t * t;
    const t3 = t2 * t;

    const x =
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

    const y =
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

    result.push({ x, y });
  }
  return result;
}

/**
 * Draws smoothed stroke path onto a canvas 2D context using quadratic Bézier curves.
 */
export function renderSmoothStroke(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  baseWidth: number,
  color: string,
  isHighlighter = false
) {
  if (points.length === 0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isHighlighter) {
    ctx.globalCompositeOperation = 'source-over';
  }

  if (points.length === 1) {
    const p = points[0];
    const r = (baseWidth * (p.pressure || 0.5)) / 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, r), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (points.length === 2) {
    ctx.beginPath();
    ctx.lineWidth = baseWidth * (points[0].pressure || 0.5);
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Draw continuous stroke using midpoint quadratic Béziers
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;

    const pressure = (p0.pressure + p1.pressure) / 2;
    ctx.lineWidth = Math.max(1, baseWidth * pressure);

    ctx.beginPath();
    if (i === 0) {
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(midX, midY);
    } else {
      const prevMidX = (points[i - 1].x + p0.x) / 2;
      const prevMidY = (points[i - 1].y + p0.y) / 2;
      ctx.moveTo(prevMidX, prevMidY);
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }
    ctx.stroke();
  }

  // Connect last point
  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  const lastMidX = (secondLast.x + last.x) / 2;
  const lastMidY = (secondLast.y + last.y) / 2;
  ctx.lineWidth = Math.max(1, baseWidth * (last.pressure || 0.5));
  ctx.beginPath();
  ctx.moveTo(lastMidX, lastMidY);
  ctx.lineTo(last.x, last.y);
  ctx.stroke();

  ctx.restore();
}
