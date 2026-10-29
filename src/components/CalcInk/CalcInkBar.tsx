import React, { useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Calculator, Sparkles, X, ChevronRight } from 'lucide-react';
import { screenToWorld } from '../../engine/coordinates';

interface CalcInkBarProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_MATH_EXAMPLES = [
  '2 * (5 + 13) =',
  'r = 6',
  'h = 14',
  'V = pi * r^2 * h =',
  'y = sin(x)',
  'f(x) = x^2 - 4x + 3',
];

export const CalcInkBar: React.FC<CalcInkBarProps> = ({ isOpen, onClose }) => {
  const [expression, setExpression] = useState('');
  const { evaluateEquationText, viewport } = useCanvasStore();

  if (!isOpen) return null;

  const handleSolve = (exprToSolve = expression) => {
    if (!exprToSolve.trim()) return;

    // Center in current screen view
    const centerScreen = { x: window.innerWidth / 2, y: window.innerHeight / 2 - 80 };
    const originWorld = screenToWorld(centerScreen, viewport);

    evaluateEquationText(exprToSolve.trim(), originWorld);
    setExpression('');
    onClose();
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 pointer-events-auto animate-fade-in">
      <div className="p-4 rounded-2xl glass-panel-glow border border-emerald-500/40 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wide">
            <Calculator className="w-4 h-4" />
            <span>CalcInk Living Math & Variable Engine</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSolve();
          }}
          className="mt-3 flex items-center gap-2"
        >
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="e.g. 2 * (5 + 13) = or r = 5 or y = sin(x)"
            autoFocus
            className="flex-1 px-3.5 py-2.5 rounded-xl glass-input text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Solve</span>
          </button>
        </form>

        {/* Quick presets */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-mono mr-1">Try presets:</span>
          {PRESET_MATH_EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => handleSolve(ex)}
              className="px-2 py-1 rounded-md bg-slate-800/80 hover:bg-emerald-500/20 border border-slate-700/60 hover:border-emerald-500/40 text-[11px] font-mono text-slate-300 hover:text-emerald-300 transition-all"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
