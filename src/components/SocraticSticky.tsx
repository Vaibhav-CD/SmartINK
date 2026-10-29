import React, { useState } from 'react';
import type { SocraticAnnotation } from '../types';
import { HelpCircle, Check, Move, Send } from 'lucide-react';

interface SocraticStickyProps {
  item: SocraticAnnotation;
  onDelete: (id: string) => void;
  onStartDrag: (e: React.MouseEvent, id: string) => void;
}

export const SocraticSticky: React.FC<SocraticStickyProps> = ({
  item,
  onDelete,
  onStartDrag,
}) => {
  const [reflection, setReflection] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div
      style={{
        transform: `translate(${item.position.x}px, ${item.position.y}px)`,
        width: '320px',
      }}
      className="absolute select-none rounded-3xl p-4.5 border bg-amber-50/90 dark:bg-amber-950/80 border-amber-300 dark:border-amber-500/30 shadow-md backdrop-blur-xl text-amber-950 dark:text-amber-100 transition-shadow"
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-500/20 cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => onStartDrag(e, item.id)}
      >
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          <HelpCircle className="w-4 h-4 text-amber-500" />
          <span>Socratic Hint</span>
        </div>
        <div className="flex items-center gap-1">
          <Move className="w-3.5 h-3.5 opacity-60 text-amber-500" />
          <button
            onClick={() => onDelete(item.id)}
            className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800/40 text-xs text-amber-600 dark:text-amber-300 cursor-pointer"
          >
            ×
          </button>
        </div>
      </div>

      {/* Socratic Question */}
      <div className="mt-2.5">
        <p className="text-xs font-semibold leading-relaxed text-amber-900 dark:text-amber-100">
          "{item.question}"
        </p>
        <div className="mt-2 p-2.5 rounded-2xl bg-amber-100/70 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
          <span className="font-bold">Guiding Hint: </span>{item.hint}
        </div>
      </div>

      {/* Reflection Input */}
      <div className="mt-3">
        {submitted ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold py-1">
            <Check className="w-4 h-4" /> Reflection logged to active memory.
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Your reflection / answer..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && reflection.trim()) {
                  setSubmitted(true);
                }
              }}
              className="flex-1 px-3 py-1.5 rounded-full bg-white dark:bg-amber-900/60 border border-amber-300 dark:border-amber-500/30 text-xs text-amber-950 dark:text-amber-100 placeholder:text-amber-400 focus:outline-none focus:border-amber-500 shadow-sm"
            />
            <button
              disabled={!reflection.trim()}
              onClick={() => setSubmitted(true)}
              className="p-1.5 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white font-bold transition-colors cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400/80 text-right font-medium">
        Meta Muse Spark Co-Pilot
      </div>
    </div>
  );
};
