import React, { useRef, useEffect } from 'react';
import { generatePlotData, renderGraphToCanvas } from '../../engine/graphing';
import { worldToScreen } from '../../engine/coordinates';
import { useCanvasStore } from '../../store/canvasStore';
import { SolvedEquation } from '../../types/math';
import { TrendingUp, X } from 'lucide-react';

interface InlineGraphProps {
  equation: SolvedEquation;
  onClose?: () => void;
}

export const InlineGraph: React.FC<InlineGraphProps> = ({ equation, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { viewport, workspace } = useCanvasStore();

  const fnData = equation.functionData;
  if (!fnData) return null;

  const width = 280;
  const height = 180;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const plot = generatePlotData(
      fnData.fnExpr,
      fnData.minX,
      fnData.maxX,
      180,
      workspace.globalVariables
    );

    renderGraphToCanvas(ctx, plot, width, height, '#06b6d4');
  }, [fnData, workspace.globalVariables]);

  const screenPos = worldToScreen(
    { x: equation.bbox.maxX + 40, y: equation.bbox.minY },
    viewport
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: `${screenPos.x}px`,
        top: `${screenPos.y}px`,
      }}
      className="z-20 pointer-events-auto rounded-xl overflow-hidden glass-panel border border-cyan-500/40 shadow-2xl animate-fade-in"
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-medium">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>f(x) = {fnData.fnExpr}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <canvas ref={canvasRef} width={width} height={height} className="block" />
    </div>
  );
};
