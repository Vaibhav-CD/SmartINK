import React, { useState, useMemo, useEffect } from 'react';
import type { Point } from '../types';
import { MathParser } from '../services/calcInk/mathParser';
import { Activity, X, Move, ZoomIn, ZoomOut, Plus, Eye, EyeOff, Copy, Sparkles, Layers, Play, Pause, SlidersHorizontal } from 'lucide-react';

export interface CurveDefinition {
  id: string;
  expr: string;
  color: string;
  visible: boolean;
}

const PALETTE = [
  '#a3e635', // SmartInk Neon Lime
  '#38bdf8', // Galvanic Cyan
  '#f59e0b', // Solar Amber
  '#ec4899', // Quantum Pink
  '#a855f7', // Alien Purple
  '#10b981', // Emerald
  '#06b6d4', // Teal Cyan
  '#f43f5e', // Rose
];

const PRESETS: { label: string; curves: string[] }[] = [
  { label: 'sin & cos', curves: ['sin(x)', 'cos(x)'] },
  { label: 'Morph a·sin(b·x)', curves: ['a * sin(b * x)'] },
  { label: 'Parabola a·x²', curves: ['a * x^2'] },
  { label: 'Harmonics', curves: ['sin(x)', 'sin(2x)', 'sin(3x)'] },
  { label: 'eˣ & ln(x)', curves: ['exp(x)', 'log(x)'] },
];

const QUICK_FUNCS = ['sin(x)', 'a*sin(x)', 'a*x^2', 'cos(x)', '1/x'];

interface InteractiveFunctionPlotProps {
  id: string;
  initialFunction?: string;
  position: Point;
  scale?: number;
  onClose: (id: string) => void;
  onStartDrag?: (e: React.MouseEvent, id: string) => void;
  onMove?: (id: string, newPos: Point) => void;
  onDuplicate?: (initialFunc: string) => void;
}

interface HoverPoint {
  expr: string;
  color: string;
  label: string;
  y: number;
}

interface HoverState {
  x: number;
  points: HoverPoint[];
}

function parseFunctionStrings(raw: string): string[] {
  if (!raw || !raw.trim()) return ['sin(x)'];
  // Remove leading y = or f(x) =
  const cleaned = raw.replace(/(?:y|f\(x\))\s*=\s*/gi, '');
  const parts = cleaned
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : ['sin(x)'];
}

export const InteractiveFunctionPlot: React.FC<InteractiveFunctionPlotProps> = ({
  id,
  initialFunction = 'sin(x)',
  position,
  scale = 1,
  onClose,
  onStartDrag,
  onMove,
  onDuplicate,
}) => {
  const [localPos, setLocalPos] = useState<Point>(position);

  // Keep local position in sync with incoming prop
  useEffect(() => {
    setLocalPos(position);
  }, [position.x, position.y]);

  const [curves, setCurves] = useState<CurveDefinition[]>(() => {
    const funcs = parseFunctionStrings(initialFunction);
    return funcs.slice(0, 8).map((expr, idx) => ({
      id: `c-${idx}-${Date.now()}`,
      expr,
      color: PALETTE[idx % PALETTE.length],
      visible: true,
    }));
  });

  const [xRange, setXRange] = useState<[number, number]>([-6, 6]);
  const [hoverCoord, setHoverCoord] = useState<HoverState | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [params, setParams] = useState<Record<string, number>>({});
  const [isAnimating, setIsAnimating] = useState(false);

  // Extract non-x variable parameters across all active curves (e.g. a, b, k, m)
  const detectedParams = useMemo(() => {
    const RESERVED = new Set(['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'exp', 'pi', 'e', 'x', 'y', 'neg']);
    const paramSet = new Set<string>();
    for (const c of curves) {
      if (!c.visible || !c.expr) continue;
      const matches = c.expr.match(/[a-zA-Z][a-zA-Z0-9]*/g) || [];
      for (const m of matches) {
        const lower = m.toLowerCase();
        if (!RESERVED.has(lower)) {
          paramSet.add(lower);
        }
      }
    }
    return Array.from(paramSet).sort();
  }, [curves]);

  // Synchronize new detected parameters, defaulting to 1.0
  useEffect(() => {
    setParams((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const p of detectedParams) {
        if (next[p] === undefined) {
          next[p] = 1.0;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [detectedParams]);

  // Real-time animation loop when play is active (60 FPS parameter morphing)
  useEffect(() => {
    if (!isAnimating || detectedParams.length === 0) return;
    let animId: number;
    const start = performance.now();
    const primaryParam = detectedParams[0];

    const loop = (now: number) => {
      const elapsed = (now - start) / 1000;
      const val = Number((Math.sin(elapsed * 2.2) * 3).toFixed(2));
      setParams((prev) => ({ ...prev, [primaryParam]: val }));
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isAnimating, detectedParams]);

  const width = 380;
  const height = 260;
  const svgWidth = 380;
  const svgHeight = 160;

  // Ultra-fluid direct pointer drag handler for the header
  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input, select')) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const initialPosX = localPos.x;
    const initialPosY = localPos.y;

    const onPointerMove = (ev: PointerEvent) => {
      const currentScale = scale || 1;
      const dx = (ev.clientX - startClientX) / currentScale;
      const dy = (ev.clientY - startClientY) / currentScale;
      const nextPos = {
        x: Math.round(initialPosX + dx),
        y: Math.round(initialPosY + dy),
      };
      setLocalPos(nextPos);
      if (onMove) {
        onMove(id, nextPos);
      }
    };

    const onPointerUp = (upEv: PointerEvent) => {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(upEv.pointerId);
      } catch {
        // ignore
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { once: true });
    window.addEventListener('pointercancel', onPointerUp, { once: true });

    if (onStartDrag) {
      onStartDrag(e as any, id);
    }
  };

  // Sync if initialFunction changes externally (e.g., added curve from canvas)
  useEffect(() => {
    if (!initialFunction) return;
    const funcs = parseFunctionStrings(initialFunction);
    setCurves((prev) => {
      const existingExprs = prev.map((c) => c.expr.trim());
      const hasAll = funcs.every((f) => existingExprs.includes(f.trim()));
      if (hasAll && prev.length === funcs.length) return prev;

      const merged: CurveDefinition[] = [];
      funcs.forEach((fn, i) => {
        const found = prev.find((p) => p.expr.trim() === fn.trim());
        if (found) {
          merged.push(found);
        } else {
          merged.push({
            id: `c-${i}-${Date.now()}`,
            expr: fn,
            color: PALETTE[merged.length % PALETTE.length],
            visible: true,
          });
        }
      });
      return merged.length > 0 ? merged : prev;
    });
  }, [initialFunction]);

  // Compute samples for all active curves across domain
  const curveSamples = useMemo(() => {
    const [minX, maxX] = xRange;
    const step = (maxX - minX) / 180;

    return curves.map((curve) => {
      if (!curve.visible || !curve.expr.trim()) {
        return { ...curve, pts: [] };
      }

      const pts: { x: number; y: number }[] = [];
      for (let x = minX; x <= maxX; x += step) {
        const res = MathParser.evaluate(curve.expr, { x, ...params });
        if (res.success && res.value !== null && isFinite(res.value)) {
          pts.push({ x, y: res.value });
        }
      }
      return { ...curve, pts };
    });
  }, [curves, xRange, params]);

  // Determine global Y-range across all visible curves
  const yBounds = useMemo(() => {
    let minY = Infinity,
      maxY = -Infinity;
    let hasPoints = false;

    for (const c of curveSamples) {
      for (const p of c.pts) {
        hasPoints = true;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }

    if (!hasPoints) return { minY: -4, maxY: 4 };

    const pad = Math.max(0.5, (maxY - minY) * 0.15);
    return {
      minY: Math.max(-100, minY - pad),
      maxY: Math.min(100, maxY + pad),
    };
  }, [curveSamples]);

  const mapX = (xVal: number) => {
    const [minX, maxX] = xRange;
    return ((xVal - minX) / (maxX - minX)) * (svgWidth - 40) + 20;
  };

  const mapY = (yVal: number) => {
    const { minY, maxY } = yBounds;
    const norm = (yVal - minY) / (maxY - minY || 1);
    return svgHeight - 20 - norm * (svgHeight - 40);
  };

  const handleZoom = (factor: number) => {
    setXRange(([min, max]) => [Number((min * factor).toFixed(2)), Number((max * factor).toFixed(2))]);
  };

  // Inspect all visible curves simultaneously under mouse crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mousePixelX = e.clientX - rect.left;
    const [minX, maxX] = xRange;
    const mouseX = minX + ((mousePixelX - 20) / (svgWidth - 40)) * (maxX - minX);

    const points: HoverPoint[] = [];
    curves.forEach((c, i) => {
      if (!c.visible || !c.expr.trim()) return;
      const res = MathParser.evaluate(c.expr, { x: mouseX, ...params });
      if (res.success && res.value !== null && isFinite(res.value)) {
        points.push({
          expr: c.expr,
          color: c.color,
          label: `f${i + 1}`,
          y: Number(res.value.toFixed(2)),
        });
      }
    });

    if (points.length > 0) {
      setHoverCoord({
        x: Number(mouseX.toFixed(2)),
        points,
      });
    } else {
      setHoverCoord(null);
    }
  };

  const addCurve = (expression = '') => {
    if (curves.length >= 8) return;
    const nextColor = PALETTE[curves.length % PALETTE.length];
    const defaultExpr =
      expression ||
      (curves.length === 1 ? 'cos(x)' : curves.length === 2 ? 'x^2' : curves.length === 3 ? '1/x' : 'sqrt(x)');

    setCurves((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}-${prev.length}`,
        expr: defaultExpr,
        color: nextColor,
        visible: true,
      },
    ]);
  };

  // Update expression, with auto-split if user types or pastes multiple functions
  const updateCurveExpr = (idx: number, rawExpr: string) => {
    if (rawExpr.includes(',') || rawExpr.includes(';')) {
      const parts = rawExpr
        .split(/[,;]+/)
        .map((s) => s.trim().replace(/^(?:y|f\(x\))\s*=\s*/gi, ''))
        .filter(Boolean);

      if (parts.length > 1) {
        setCurves((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], expr: parts[0] };
          parts.slice(1).forEach((p, offset) => {
            if (next.length < 8) {
              const colorIdx = (idx + offset + 1) % PALETTE.length;
              next.push({
                id: `c-${Date.now()}-${offset}`,
                expr: p,
                color: PALETTE[colorIdx],
                visible: true,
              });
            }
          });
          return next;
        });
        return;
      }
    }

    setCurves((prev) => prev.map((c, i) => (i === idx ? { ...c, expr: rawExpr } : c)));
  };

  const cycleCurveColor = (idx: number) => {
    setCurves((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const currentIdx = PALETTE.indexOf(c.color);
        const nextIdx = (currentIdx + 1) % PALETTE.length;
        return { ...c, color: PALETTE[nextIdx] };
      })
    );
  };

  const toggleCurveVisibility = (idx: number) => {
    setCurves((prev) => prev.map((c, i) => (i === idx ? { ...c, visible: !c.visible } : c)));
  };

  const removeCurve = (idx: number) => {
    if (curves.length <= 1) return;
    setCurves((prev) => prev.filter((_, i) => i !== idx));
  };

  const applyPreset = (presetCurves: string[]) => {
    const newCurves = presetCurves.slice(0, 8).map((expr, idx) => ({
      id: `c-${idx}-${Date.now()}`,
      expr,
      color: PALETTE[idx % PALETTE.length],
      visible: true,
    }));
    setCurves(newCurves);
    setShowPresets(false);
  };

  const zeroY = mapY(0);
  const zeroX = mapX(0);

  return (
    <div
      style={{
        transform: `translate(${localPos.x}px, ${localPos.y}px)`,
        width: `${width}px`,
      }}
      className="absolute select-none rounded-3xl p-4 shadow-2xl border border-slate-200 dark:border-lime-500/40 bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-slate-100 backdrop-blur-xl z-20 group ring-1 ring-emerald-500/20 dark:ring-lime-400/20"
    >
      {/* Header & Controls */}
      <div
        className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 cursor-grab active:cursor-grabbing"
        onPointerDown={handleHeaderPointerDown}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-lime-400 animate-pulse" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-lime-400">
            Multi-Function 2D Plotter
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-lime-300 font-bold">
            {curves.filter((c) => c.visible).length}/{curves.length} active
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <button
            onClick={() => setShowPresets((p) => !p)}
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
              showPresets ? 'bg-emerald-500/20 text-emerald-600 dark:text-lime-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-lime-300'
            }`}
            title="Comparison Presets (sin/cos, polynomials, etc.)"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(0.8)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-lime-300 cursor-pointer"
            title="Zoom In (X-Axis)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(1.25)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-lime-300 cursor-pointer"
            title="Zoom Out (X-Axis)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {onDuplicate && (
            <button
              onClick={() => onDuplicate(curves.map((c) => c.expr).join(', '))}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-lime-300 cursor-pointer"
              title="Spawn duplicate graph pane on canvas"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}

          <Move className="w-3.5 h-3.5 opacity-50 ml-0.5" />
          <button
            onClick={() => onClose(id)}
            className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-rose-500/20 hover:text-rose-400 text-xs transition-colors cursor-pointer"
            title="Close Plot Pane"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Comparison Presets Dropdown */}
      {showPresets && (
        <div className="mt-2 p-2 rounded-xl bg-slate-900/90 border border-lime-500/30 text-xs animate-in fade-in duration-150">
          <div className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Layers className="w-3 h-3" />
            <span>Instant Multi-Curve Presets</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => applyPreset(p.curves)}
                className="px-2 py-1 rounded bg-slate-950 hover:bg-lime-500/20 hover:text-lime-300 text-slate-300 border border-slate-800 text-[10px] font-mono text-left cursor-pointer transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Function Curve List (Scrollable if many curves) */}
      <div className="mt-2.5 space-y-1.5 max-h-[110px] overflow-y-auto pr-1 scrollbar-none">
        {curves.map((curve, idx) => (
          <div key={curve.id} className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
            {/* Clickable color tag - clicking cycles color */}
            <button
              onClick={() => cycleCurveColor(idx)}
              style={{ color: curve.color, backgroundColor: `${curve.color}15`, borderColor: `${curve.color}40` }}
              className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-lg border shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              title="Click to cycle curve color"
            >
              f{idx + 1}(x)=
            </button>
            <input
              type="text"
              value={curve.expr}
              onChange={(e) => updateCurveExpr(idx, e.target.value)}
              placeholder="e.g. sin(x), x^2, cos(x)"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-lime-500"
            />
            <button
              onClick={() => toggleCurveVisibility(idx)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer shrink-0"
              title={curve.visible ? 'Hide curve' : 'Show curve'}
            >
              {curve.visible ? <Eye className="w-3 h-3 text-lime-400" /> : <EyeOff className="w-3 h-3 text-slate-600" />}
            </button>
            {curves.length > 1 && (
              <button
                onClick={() => removeCurve(idx)}
                className="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 cursor-pointer shrink-0"
                title="Remove curve from frame"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Quick Add Toolbar & Function Chips */}
      <div className="mt-2 flex items-center justify-between flex-wrap gap-1">
        {curves.length < 8 && (
          <button
            onClick={() => addCurve()}
            className="flex items-center gap-1 text-[10px] font-mono font-bold text-lime-400 hover:text-lime-300 hover:bg-lime-500/10 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>+ Add Curve</span>
          </button>
        )}

        {/* Quick Add function buttons */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {QUICK_FUNCS.slice(0, 4).map((qf, i) => (
            <button
              key={i}
              onClick={() => addCurve(qf)}
              disabled={curves.length >= 8}
              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-lime-300 border border-slate-800 disabled:opacity-40 cursor-pointer"
              title={`Add ${qf} curve`}
            >
              +{qf}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic In-Situ Parameter Sliders (Apple Math Notes / Desmos / GeoGebra) */}
      {detectedParams.length > 0 && (
        <div className="mt-2 p-2 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3 h-3" />
              <span>Interactive Parameters ({detectedParams.length})</span>
            </div>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-mono text-[10px] cursor-pointer transition-colors"
              title="Animate parameter continuously (60 FPS)"
            >
              {isAnimating ? <Pause className="w-2.5 h-2.5 text-indigo-400" /> : <Play className="w-2.5 h-2.5 text-indigo-400" />}
              <span>{isAnimating ? 'Pause' : 'Animate'}</span>
            </button>
          </div>
          <div className="space-y-1.5">
            {detectedParams.map((param) => {
              const val = params[param] ?? 1.0;
              return (
                <div key={param} className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-indigo-300 font-bold w-14 shrink-0">
                    {param} = {val.toFixed(1)}
                  </span>
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={0.1}
                    value={val}
                    onChange={(e) => {
                      const nextVal = parseFloat(e.target.value);
                      setParams((prev) => ({ ...prev, [param]: nextVal }));
                    }}
                    className="flex-1 accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2D SVG Graph Plot Area */}
      <div className="mt-2 relative rounded-2xl bg-black/85 border border-slate-800/80 overflow-hidden">
        <svg
          width={width - 32}
          height={height - 100}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCoord(null)}
        >
          {/* Axes */}
          {zeroY >= 0 && zeroY <= svgHeight && (
            <line
              x1="0"
              y1={zeroY}
              x2={svgWidth}
              y2={zeroY}
              stroke="rgba(163, 230, 53, 0.25)"
              strokeDasharray="3 3"
            />
          )}
          {zeroX >= 0 && zeroX <= svgWidth && (
            <line
              x1={zeroX}
              y1="0"
              x2={zeroX}
              y2={svgHeight}
              stroke="rgba(163, 230, 53, 0.25)"
              strokeDasharray="3 3"
            />
          )}

          {/* Render All Active Curve Paths with Neon Glow */}
          {curveSamples.map((curve) => {
            if (curve.pts.length < 2) return null;
            let d = `M ${mapX(curve.pts[0].x)} ${mapY(curve.pts[0].y)}`;
            for (let i = 1; i < curve.pts.length; i++) {
              d += ` L ${mapX(curve.pts[i].x)} ${mapY(curve.pts[i].y)}`;
            }
            return (
              <path
                key={curve.id}
                d={d}
                fill="none"
                stroke={curve.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 6px ${curve.color}80)` }}
              />
            );
          })}

          {/* Synchronized Crosshair Guideline across all curves */}
          {hoverCoord && (
            <line
              x1={mapX(hoverCoord.x)}
              y1="0"
              x2={mapX(hoverCoord.x)}
              y2={svgHeight}
              stroke="rgba(255, 255, 255, 0.35)"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          )}

          {/* Inspection dots on all active curves at hover x */}
          {hoverCoord?.points.map((pt, idx) => {
            const mappedY = mapY(pt.y);
            if (mappedY < 0 || mappedY > svgHeight) return null;
            return (
              <circle
                key={idx}
                cx={mapX(hoverCoord.x)}
                cy={mappedY}
                r="4.5"
                fill={pt.color}
                stroke="#020617"
                strokeWidth="1.5"
                style={{ filter: `drop-shadow(0 0 8px ${pt.color})` }}
              />
            );
          })}
        </svg>

        {/* Multi-Curve Synchronized Tooltip */}
        {hoverCoord && hoverCoord.points.length > 0 && (
          <div className="absolute top-2 right-2 px-2.5 py-1.5 rounded-xl bg-slate-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-[10px] font-mono pointer-events-none z-10 flex flex-col gap-1 min-w-[85px]">
            <div className="text-slate-400 font-bold border-b border-slate-800 pb-0.5 flex justify-between">
              <span>x:</span>
              <span className="text-white font-bold">{hoverCoord.x}</span>
            </div>
            {hoverCoord.points.map((pt, i) => (
              <div key={i} className="flex items-center justify-between gap-2" style={{ color: pt.color }}>
                <span className="font-bold">{pt.label}:</span>
                <span className="font-semibold">{pt.y}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info & Multi-Curve Status */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span>x ∈ [{xRange[0]}, {xRange[1]}]</span>
        <span className="text-lime-500/80">
          {curves.length} Curve{curves.length > 1 ? 's' : ''} in Frame
        </span>
      </div>
    </div>
  );
};

