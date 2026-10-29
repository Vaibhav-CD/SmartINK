import { MathParser, tokenizeMath, evaluateAST } from './mathEngine';

export interface GraphPoint {
  x: number;
  y: number;
  valid: boolean;
}

export interface PlotData {
  points: GraphPoint[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  fnExpr: string;
}

/**
 * Computes plot points for a mathematical function of x.
 */
export function generatePlotData(
  fnExpr: string,
  minX = -10,
  maxX = 10,
  samples = 200,
  scope: Record<string, number> = {}
): PlotData {
  const points: GraphPoint[] = [];
  const step = (maxX - minX) / samples;

  let ast: any = null;
  try {
    const tokens = tokenizeMath(fnExpr);
    const parser = new MathParser(tokens);
    ast = parser.parse();
  } catch {
    // Return empty plot if parse fails
    return { points: [], minX, maxX, minY: -10, maxY: 10, fnExpr };
  }

  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i <= samples; i++) {
    const x = minX + i * step;
    try {
      const evalScope = { ...scope, x, X: x };
      const y = evaluateAST(ast, evalScope);

      if (Number.isFinite(y) && !Number.isNaN(y)) {
        // Clamp extreme asymptotic spikes (e.g. tan(x))
        const clampedY = Math.max(-100, Math.min(100, y));
        points.push({ x, y: clampedY, valid: true });

        if (clampedY < minY) minY = clampedY;
        if (clampedY > maxY) maxY = clampedY;
      } else {
        points.push({ x, y: 0, valid: false });
      }
    } catch {
      points.push({ x, y: 0, valid: false });
    }
  }

  // Adjust Y range with nice margin
  if (!Number.isFinite(minY) || !Number.isFinite(maxY) || minY === maxY) {
    minY = -5;
    maxY = 5;
  } else {
    const margin = (maxY - minY) * 0.15 || 1;
    minY -= margin;
    maxY += margin;
  }

  return { points, minX, maxX, minY, maxY, fnExpr };
}

/**
 * Renders an inline 2D graph onto a 2D canvas context.
 */
export function renderGraphToCanvas(
  ctx: CanvasRenderingContext2D,
  plot: PlotData,
  width: number,
  height: number,
  accentColor = '#06b6d4'
) {
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(0, 0, width, height);

  // Padding
  const pad = 24;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  const toScreenX = (x: number) => pad + ((x - plot.minX) / (plot.maxX - plot.minX)) * plotW;
  const toScreenY = (y: number) => pad + plotH - ((y - plot.minY) / (plot.maxY - plot.minY)) * plotH;

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;

  for (let x = Math.ceil(plot.minX); x <= Math.floor(plot.maxX); x += 2) {
    const sx = toScreenX(x);
    ctx.beginPath();
    ctx.moveTo(sx, pad);
    ctx.lineTo(sx, height - pad);
    ctx.stroke();
  }

  // Origin Axes
  const originX = toScreenX(0);
  const originY = toScreenY(0);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 1.5;

  // X Axis
  if (originY >= pad && originY <= height - pad) {
    ctx.beginPath();
    ctx.moveTo(pad, originY);
    ctx.lineTo(width - pad, originY);
    ctx.stroke();
  }

  // Y Axis
  if (originX >= pad && originX <= width - pad) {
    ctx.beginPath();
    ctx.moveTo(originX, pad);
    ctx.lineTo(originX, height - pad);
    ctx.stroke();
  }

  // Draw Function Curve
  if (plot.points.length > 1) {
    ctx.save();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    let isDrawing = false;

    for (const pt of plot.points) {
      if (!pt.valid) {
        isDrawing = false;
        continue;
      }

      const sx = toScreenX(pt.x);
      const sy = toScreenY(pt.y);

      if (!isDrawing) {
        ctx.moveTo(sx, sy);
        isDrawing = true;
      } else {
        ctx.lineTo(sx, sy);
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  // Function title & label
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px Inter, monospace';
  ctx.fillText(`f(x) = ${plot.fnExpr}`, pad, pad - 8);
  ctx.fillText(`x: [${plot.minX}, ${plot.maxX}]`, width - pad - 60, height - 6);
}
