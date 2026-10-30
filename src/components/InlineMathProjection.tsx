import React, { useEffect, useRef, useState } from 'react';
import type { ProjectedEquation } from '../services/calcInk/strokeRecognizer';
import { Sparkles, Copy, Check, AlertCircle, AlertTriangle, Activity, PenLine, SlidersHorizontal } from 'lucide-react';

interface InlineMathProjectionProps {
  equation: ProjectedEquation;
  onConvertToCard?: (equation: ProjectedEquation) => void;
  onPlotFunction?: (funcBody: string, position: { x: number; y: number }) => void;
  onWriteInInk?: (equation: ProjectedEquation) => void;
  onUpdateVariable?: (varName: string, value: number) => void;
  scale?: number;
}

export const InlineMathProjection: React.FC<InlineMathProjectionProps> = ({
  equation,
  onConvertToCard,
  onPlotFunction,
  onWriteInInk,
  onUpdateVariable,
  scale: _scale = 1,
}) => {
  const [copied, setCopied] = useState(false);
  const [showScrubber, setShowScrubber] = useState(false);
  const [scrubberVal, setScrubberVal] = useState<number>(() => {
    return typeof equation.evaluation.value === 'number' ? equation.evaluation.value : 1;
  });
  const lastSoundDisplayRef = useRef<string>('');

  // Play subtle futuristic chime only when answer first appears or changes value
  useEffect(() => {
    if (equation.hasUncertainGlyph) return;
    if (!equation.evaluation.display || equation.evaluation.display === lastSoundDisplayRef.current) {
      return;
    }
    lastSoundDisplayRef.current = equation.evaluation.display;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5 note
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } catch {
      // AudioContext unavailable or restricted by browser policy
    }
  }, [equation.evaluation.display]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(equation.evaluation.display);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isUndefined = equation.evaluation.isUndefined;
  const isAssignment = equation.evaluation.isAssignment;
  const isPlottable = equation.isPlottableFunction;

  // Uncertain ink: honest "couldn't read this" state, never a wrong answer.
  if (equation.hasUncertainGlyph) {
    const alts = equation.uncertainAlternatives?.filter(Boolean) ?? [];
    return (
      <div
        style={{
          transform: `translate(${equation.anchorPosition.x}px, ${equation.anchorPosition.y}px)`,
        }}
        className="absolute z-20 pointer-events-auto select-none flex items-center gap-1.5 animate-in fade-in zoom-in-90 duration-200"
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-2xl backdrop-blur-xl border border-slate-400/70 bg-slate-100/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 shadow-lg"
          title={
            alts.length > 0
              ? `Unrecognized glyph — maybe ${alts.slice(0, 3).join(', ')}? Rewrite it a bit larger.`
              : 'Unrecognized glyph — rewrite it a bit larger.'
          }
        >
          <AlertTriangle className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-mono text-slate-400 border-r border-slate-600 pr-2 hidden sm:inline">
            {equation.expressionText}
          </span>
          <span className="text-[11px] font-semibold">Unrecognized glyph</span>
          {alts.length > 0 && (
            <span className="text-[11px] font-mono text-slate-400">
              maybe {alts.slice(0, 3).join(' / ')}?
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        transform: `translate(${equation.anchorPosition.x}px, ${equation.anchorPosition.y}px)`,
      }}
      className="absolute z-20 pointer-events-auto select-none flex items-center gap-1.5 animate-in fade-in zoom-in-90 duration-200"
    >
      {/* Inline Glow Capsule right adjacent to terminal equals or expression */}
      <div
        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all ${
          equation.hasDerivationError
            ? 'bg-amber-50 dark:bg-amber-950/95 border-amber-500 text-amber-900 dark:text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50'
            : isUndefined
            ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-500 text-rose-800 dark:text-rose-300 shadow-rose-500/20'
            : isPlottable
            ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-500 dark:border-emerald-400/80 text-emerald-900 dark:text-emerald-300 shadow-emerald-500/30 ring-1 ring-emerald-400/40'
            : isAssignment
            ? 'bg-indigo-50 dark:bg-indigo-950/90 border-indigo-500 text-indigo-900 dark:text-indigo-300 shadow-indigo-500/20'
            : 'bg-white dark:bg-slate-950/90 border-emerald-500 dark:border-lime-400/80 text-emerald-700 dark:text-lime-400 shadow-lg shadow-emerald-500/15 dark:shadow-lime-500/40 ring-1 ring-emerald-500/30 dark:ring-lime-400/30'
        }`}
      >
        <div className="flex items-center gap-2">
          {equation.hasDerivationError ? (
            <div className="flex items-center gap-1.5" title={equation.errorExplanation}>
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
              <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                Step Divergence
              </span>
            </div>
          ) : isUndefined ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : isPlottable ? (
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          ) : (
            <Sparkles className="w-4 h-4 text-lime-400 animate-pulse" />
          )}

          {/* Expression Reference tag */}
          <span className="text-xs font-mono text-slate-400 border-r border-slate-700 pr-2 hidden sm:inline">
            {equation.expressionText}
          </span>

          {/* Inline Projected Answer with Dynamic Handwriting Style Matching (PS Requirement #8) */}
          <span
            style={{
              fontFamily: "'Caveat', 'Patrick Hand', 'Comic Sans MS', cursive, monospace",
              transform: equation.style ? `skewX(${-equation.style.slantAngle}deg)` : undefined,
              letterSpacing: '0.04em',
            }}
            className={`text-xl font-bold transition-all ${
              isPlottable ? 'text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]' : 'text-lime-400 drop-shadow-[0_0_10px_rgba(163,230,53,0.6)]'
            }`}
          >
            {isPlottable || equation.evaluation.isEquationSolution
              ? equation.evaluation.display
              : `= ${equation.evaluation.display}`}
          </span>
        </div>

        {/* Action: Apple Math Notes Style "Write into Canvas as Ink" */}
        {onWriteInInk && !isUndefined && (
          <button
            onClick={() => onWriteInInk(equation)}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-lime-500/20 hover:bg-lime-500/35 text-lime-300 font-bold cursor-pointer border border-lime-500/40 transition-all hover:scale-105 shadow-xs"
            title="Convert to digital handwritten ink strokes directly on canvas (Apple Math Notes)"
          >
            <PenLine className="w-3 h-3 text-lime-400" />
            <span className="hidden sm:inline">Write Ink</span>
          </button>
        )}

        {/* Action: Dynamic Variable Scrubber Slider (Desmos / Math Notes) */}
        {isAssignment && equation.evaluation.variableName && onUpdateVariable && (
          <button
            onClick={() => setShowScrubber(!showScrubber)}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              showScrubber ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800/60'
            }`}
            title="Toggle live variable parameter scrubber"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Action: 2D Curve Plotter Button if function of x */}
        {isPlottable && onPlotFunction && (
          <button
            onClick={() => onPlotFunction(
              equation.plotFunctionBody || equation.expressionText,
              { x: equation.anchorPosition.x + 20, y: equation.anchorPosition.y + 40 }
            )}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer shadow-md shadow-emerald-500/30 transition-all hover:scale-105"
            title="Plot interactive 2D function curve on canvas"
          >
            <Activity className="w-3 h-3" />
            <span>Plot Curve</span>
          </button>
        )}

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="p-1 rounded-md text-slate-400 hover:text-lime-300 hover:bg-slate-800/60 transition-colors cursor-pointer"
          title="Copy result"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {/* Convert to Card button */}
        {onConvertToCard && (
          <button
            onClick={() => onConvertToCard(equation)}
            className="text-[11px] px-2 py-0.5 rounded-lg bg-lime-500/20 hover:bg-lime-500/30 text-lime-300 font-bold cursor-pointer border border-lime-500/40 transition-all shadow-xs"
            title="Convert to permanent LaTeX Card"
          >
            Pin
          </button>
        )}
      </div>

      {/* Socratic Error Sniffer Bubble */}
      {equation.hasDerivationError && equation.errorExplanation && (
        <div className="absolute top-12 left-0 z-30 w-80 p-2.5 rounded-xl bg-white dark:bg-slate-950/95 border border-amber-500/60 shadow-xl text-amber-900 dark:text-amber-200 text-[11px] font-mono backdrop-blur-md animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Socratic Invariant Fallacy Detected</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 leading-snug">{equation.errorExplanation}</p>
        </div>
      )}

      {/* Expanded Live Variable Scrubber Bar */}
      {showScrubber && isAssignment && equation.evaluation.variableName && (
        <div className="absolute top-12 left-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950/95 border border-indigo-500/60 shadow-xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95">
          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {equation.evaluation.variableName} = {scrubberVal.toFixed(1)}
          </span>
          <input
            type="range"
            min={-20}
            max={20}
            step={0.5}
            value={scrubberVal}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setScrubberVal(v);
              if (onUpdateVariable && equation.evaluation.variableName) {
                onUpdateVariable(equation.evaluation.variableName, v);
              }
            }}
            className="w-24 accent-indigo-500 dark:accent-indigo-400 cursor-pointer h-1.5 rounded-lg bg-slate-200 dark:bg-slate-800"
          />
        </div>
      )}
    </div>
  );
};
