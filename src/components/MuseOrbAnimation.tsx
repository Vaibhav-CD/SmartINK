import React from 'react';
import { Mic, PenTool, Search, Sparkles } from 'lucide-react';

interface MuseOrbAnimationProps {
  onStartInk: () => void;
  onStartVoice: () => void;
  onOpenCommand: () => void;
  onLoadSample: () => void;
}

export const MuseOrbAnimation: React.FC<MuseOrbAnimationProps> = ({
  onStartInk,
  onStartVoice,
  onOpenCommand,
  onLoadSample,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-10 transition-opacity duration-500">
      <div className="relative flex items-center justify-center">
        {/* Ambient Outer Halo / Glow */}
        <div className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-cyan-500/15 via-blue-500/10 to-purple-500/15 blur-3xl animate-pulse" />

        {/* Dynamic Multi-layered Iridescent Ring System (Meta Muse Signature) */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Outer Chromatic Wave Ring */}
          <div 
            className="absolute inset-0 rounded-full border border-cyan-400/30 dark:border-cyan-400/20 animate-spin" 
            style={{ 
              animationDuration: '18s',
              background: 'radial-gradient(circle, transparent 65%, rgba(6, 182, 212, 0.08) 100%)',
            }} 
          />

          {/* Undulating Counter-rotating Chromatic Gradient Ring */}
          <div 
            className="absolute inset-3 rounded-full border border-dashed border-purple-500/40 dark:border-purple-400/30 animate-spin" 
            style={{ 
              animationDuration: '24s', 
              animationDirection: 'reverse' 
            }} 
          />

          {/* Inner Glowing Core Ring with Fluid Iridescent Gradient */}
          <div className="absolute inset-7 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-fuchsia-500 p-[2px] shadow-lg shadow-cyan-500/20 dark:shadow-cyan-500/10 animate-pulse">
            <div className="w-full h-full rounded-full bg-white/90 dark:bg-[#0c0e14]/90 backdrop-blur-xl flex items-center justify-center">
              {/* Central Focal Aperture */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-inner">
                <Sparkles className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '12s' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Meta Muse Text Banner */}
      <div className="mt-6 text-center max-w-md px-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-semibold mb-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
          <span>Meta Muse Frontier Engine Active</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          Infinite Spatial Research
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          Draw equations with freehand ink, speak into the mic, or query any mathematical theorem to begin real-time derivation.
        </p>

        {/* Quick Interaction Starter Pills */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
          <button
            onClick={onStartInk}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 shadow-sm transition-all cursor-pointer"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw with Ink (P)</span>
          </button>

          <button
            onClick={onStartVoice}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl surface-elevated text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-cyan-500" />
            <span>Speak Query</span>
          </button>

          <button
            onClick={onOpenCommand}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl surface-elevated text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-indigo-500" />
            <span>Search (⌘K)</span>
          </button>

          <button
            onClick={onLoadSample}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl surface-elevated text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <span>Load Sample Theorem</span>
          </button>
        </div>
      </div>
    </div>
  );
};
