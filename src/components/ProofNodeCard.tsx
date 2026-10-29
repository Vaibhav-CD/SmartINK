import React, { useState } from 'react';
import type { ProofNode, ProofMethodology } from '../types';
import { MathView } from './MathView';
import { ChevronDown, ChevronUp, Lightbulb, Move, CheckCircle2 } from 'lucide-react';

interface ProofNodeCardProps {
  node: ProofNode;
  onDelete: (id: string) => void;
  onStartDrag: (e: React.MouseEvent, id: string) => void;
}

const METHOD_BADGES: Record<ProofMethodology, { bg: string; text: string; border: string }> = {
  Geometric: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/30' },
  Algebraic: { bg: 'bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-500/30' },
  Contradiction: { bg: 'bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-500/30' },
  Induction: { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/30' },
  Calculus: { bg: 'bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-500/30' },
  Combinatorial: { bg: 'bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-500/30' },
  Topology: { bg: 'bg-teal-500/10', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-500/30' },
};

export const ProofNodeCard: React.FC<ProofNodeCardProps> = ({
  node,
  onDelete,
  onStartDrag,
}) => {
  const [revealedSteps, setRevealedSteps] = useState<Record<number, boolean>>({ 1: true });
  const [activeHints, setActiveHints] = useState<Record<number, boolean>>({});

  const badge = METHOD_BADGES[node.methodology] || METHOD_BADGES.Algebraic;

  const toggleStep = (stepNumber: number) => {
    setRevealedSteps(prev => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

  const toggleHint = (stepNumber: number) => {
    setActiveHints(prev => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

  return (
    <div
      style={{
        transform: `translate(${node.position.x}px, ${node.position.y}px)`,
        width: '380px',
      }}
      className="absolute select-none rounded-3xl insta-panel p-5 shadow-sm transition-all duration-200 hover:shadow-md"
    >
      {/* Header with Drag Handle */}
      <div 
        className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => onStartDrag(e, node.id)}
      >
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}>
            {node.methodology} Proof
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Move className="w-3.5 h-3.5 opacity-60" />
          <button
            onClick={() => onDelete(node.id)}
            className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-rose-500/10 hover:text-rose-500 text-xs text-slate-400 transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>
      </div>

      {/* Proof Title & Summary */}
      <div className="mt-3">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {node.title}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {node.summary}
        </p>
      </div>

      {/* Step by step unfolding */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span>Derivation Steps ({node.steps.length})</span>
          <span className="text-[10px] text-slate-400">Socratic Guidance</span>
        </div>

        {node.steps.map((step) => {
          const isRevealed = !!revealedSteps[step.stepNumber];
          const isHintActive = !!activeHints[step.stepNumber];

          return (
            <div
              key={step.stepNumber}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 overflow-hidden transition-all"
            >
              {/* Step Header */}
              <div
                onClick={() => toggleStep(step.stepNumber)}
                className="flex items-center justify-between p-2.5 hover:bg-slate-100 dark:hover:bg-slate-900/60 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-lime-400 font-mono text-[10px] flex items-center justify-center font-bold">
                    {step.stepNumber}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {step.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHint(step.stepNumber);
                    }}
                    className={`p-1 rounded-lg transition-colors cursor-pointer ${
                      isHintActive 
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/40' 
                        : 'text-slate-400 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                    title="Toggle Socratic Hint"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                  </button>
                  {isRevealed ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Socratic Hint Banner */}
              {isHintActive && (
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border-t border-b border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">Socratic Query</div>
                    <div className="mt-0.5 leading-snug">{step.socraticHint}</div>
                  </div>
                </div>
              )}

              {/* Step Content */}
              {isRevealed && (
                <div className="p-3 border-t border-slate-200 dark:border-slate-900 space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {step.explanation}
                  </p>
                  {step.latex && (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center overflow-x-auto shadow-inner">
                      <MathView math={step.latex} className="text-cyan-600 dark:text-cyan-300 text-xs font-mono" />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-3 h-3" /> Rigorous derivation
        </span>
        <span className="font-mono">Meta Muse Wonder</span>
      </div>
    </div>
  );
};
