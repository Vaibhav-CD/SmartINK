import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Eraser, Trash2, Undo2, X, CheckSquare, Square } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options?: { clearEverything?: boolean }) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'warning';
  strokeCount?: number;
  theoremCount?: number;
  plotCount?: number;
  showClearAllOption?: boolean;
  isPageDeletion?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'warning',
  strokeCount = 0,
  theoremCount = 0,
  plotCount = 0,
  showClearAllOption = false,
  isPageDeletion = false,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const [clearEverything, setClearEverything] = useState(false);

  // Auto-focus the safe "Cancel" button on open
  useEffect(() => {
    if (isOpen) {
      setClearEverything(false);
      setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Escape key listener to dismiss safely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDanger = confirmVariant === 'danger' || isPageDeletion;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800/90 p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header with Warning Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isDanger
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
              }`}
            >
              {isPageDeletion ? (
                <Trash2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 id="modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Double-check confirmation to protect against data loss
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Cancel and close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {description}
          </p>

          {/* Data Summary Stats Box */}
          {(strokeCount > 0 || theoremCount > 0 || plotCount > 0) && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 space-y-1.5 text-[11px] font-mono">
              <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">Items currently on this page:</div>
              {strokeCount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-lime-400">
                  <span className="flex items-center gap-1.5">
                    <Eraser className="w-3 h-3" /> Digital Ink Strokes:
                  </span>
                  <span className="font-bold">{strokeCount}</span>
                </div>
              )}
              {theoremCount > 0 && (
                <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                  <span>📐 Pinned Cards & Theorems:</span>
                  <span className="font-bold">{theoremCount}</span>
                </div>
              )}
              {plotCount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span>📈 2D Function Plots:</span>
                  <span className="font-bold">{plotCount}</span>
                </div>
              )}
            </div>
          )}

          {/* Clear Everything Option Checkbox */}
          {showClearAllOption && (theoremCount > 0 || plotCount > 0) && (
            <button
              type="button"
              onClick={() => setClearEverything(!clearEverything)}
              className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 text-left transition-colors cursor-pointer w-full"
            >
              {clearEverything ? (
                <CheckSquare className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              )}
              <div className="text-xs">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Also clear all pinned cards and graphs
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Check this to reset the entire page to a completely blank slate.
                </p>
              </div>
            </button>
          )}

          {/* Undo Safety Reassurance */}
          {!isPageDeletion && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 dark:bg-lime-500/10 border border-emerald-500/20 dark:border-lime-500/20 text-emerald-700 dark:text-lime-400 text-[11px]">
              <Undo2 className="w-3.5 h-3.5 shrink-0" />
              <span>
                Safety guarantee: You can undo this action immediately by pressing <strong>Ctrl+Z</strong> (or <strong>⌘Z</strong>).
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800/80">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm({ clearEverything });
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md focus:outline-none ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 hover:scale-[1.02]'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30 hover:scale-[1.02]'
            }`}
          >
            {clearEverything ? 'Clear Entire Page' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
