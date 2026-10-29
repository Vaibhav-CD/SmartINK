import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { worldToScreen } from '../../engine/coordinates';
import { Sliders, RefreshCw } from 'lucide-react';

export const ScrubberOverlay: React.FC = () => {
  const { scrubbers, viewport, updateVariableValue } = useCanvasStore();

  if (scrubbers.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {scrubbers.map((scrubber) => {
        const screenPos = worldToScreen(scrubber.position, viewport);

        // Hide if outside viewport
        if (
          screenPos.x < -100 ||
          screenPos.y < -100 ||
          screenPos.x > window.innerWidth + 100 ||
          screenPos.y > window.innerHeight + 100
        ) {
          return null;
        }

        return (
          <div
            key={scrubber.id}
            style={{
              position: 'absolute',
              left: `${screenPos.x}px`,
              top: `${screenPos.y + 36}px`,
              transform: 'translate(-50%, 0)',
            }}
            className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-lg glass-panel-glow text-xs select-none shadow-xl border border-cyan-500/30 animate-fade-in"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono font-bold text-cyan-300">{scrubber.variableName}:</span>
            <input
              type="range"
              min={scrubber.min}
              max={scrubber.max}
              step={scrubber.step}
              value={scrubber.currentValue}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateVariableValue(scrubber.variableName, val);
              }}
              className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="font-mono text-emerald-400 font-semibold w-8 text-right">
              {scrubber.currentValue}
            </span>
          </div>
        );
      })}
    </div>
  );
};
