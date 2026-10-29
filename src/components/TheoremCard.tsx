import React, { useState } from 'react';
import type { TheoremItem } from '../types';
import { MathView } from './MathView';
import { Sparkles, HelpCircle, GitBranch, Move } from 'lucide-react';

interface TheoremCardProps {
  item: TheoremItem;
  isSelected: boolean;
  onSelect: () => void;
  onDiscoverProofs: (theorem: TheoremItem) => void;
  onRequestSocraticHint: (theorem: TheoremItem) => void;
  onDelete: (id: string) => void;
  onStartDrag: (e: React.MouseEvent, id: string) => void;
}

export const TheoremCard: React.FC<TheoremCardProps> = ({
  item,
  isSelected,
  onSelect,
  onDiscoverProofs,
  onRequestSocraticHint,
  onDelete,
  onStartDrag,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        transform: `translate(${item.position.x}px, ${item.position.y}px)`,
        width: `${item.size.width}px`,
      }}
      className={`absolute select-none rounded-3xl insta-panel p-5 shadow-sm transition-all duration-200 cursor-default group ${
        isSelected
          ? 'border-lime-500 ring-2 ring-lime-500/20 shadow-md'
          : 'hover:shadow-md'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag handle & header */}
      <div 
        className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => onStartDrag(e, item.id)}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider uppercase text-lime-400">
            Theorem
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Move className="w-3.5 h-3.5 opacity-60" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-rose-500/10 hover:text-rose-500 text-xs text-slate-400 transition-colors cursor-pointer"
            title="Delete node"
          >
            ×
          </button>
        </div>
      </div>

      {/* Theorem Title & Formula */}
      <div className="mt-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {item.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {item.statement}
        </p>

        {/* KaTeX Formula Box */}
        <div className="mt-3 py-3 px-4 rounded-2xl bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/90 text-center overflow-x-auto shadow-inner">
          <MathView math={item.latex} className="text-emerald-700 dark:text-lime-300 font-mono text-base" />
        </div>
      </div>

      {/* Discovered Proofs Status */}
      <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {item.proofs.length > 0 ? (
              <span className="font-semibold text-emerald-400">{item.proofs.length} Proof Paths Linked</span>
            ) : (
              <span className="text-slate-400">No proofs spawned yet</span>
            )}
          </span>
        </div>
      </div>

      {/* Quick Action Halo / Buttons */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDiscoverProofs(item);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl bg-gradient-to-r from-lime-500 to-emerald-500 text-slate-950 text-xs font-bold shadow-md shadow-lime-500/20 hover:opacity-95 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Discover Proofs</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestSocraticHint(item);
          }}
          className="flex items-center justify-center p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-amber-500 dark:text-amber-400 text-xs hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          title="Request Socratic Hint (Muse Spark)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Spatial Badge if Hovered */}
      {isHovered && (
        <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 border border-cyan-500/30 text-[10px] text-cyan-700 dark:text-cyan-300 font-semibold shadow-sm">
          Muse Wonder Ready
        </div>
      )}
    </div>
  );
};
