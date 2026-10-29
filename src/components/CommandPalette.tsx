import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Sigma, 
  HelpCircle, 
  Sparkles, 
  Sun, 
  Moon, 
  BookOpen, 
  ArrowRight,
  Image as ImageIcon
} from 'lucide-react';
import type { CanvasPage } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  pages: CanvasPage[];
  onSelectPage: (id: string) => void;
  onAddTheorem: () => void;
  onAddPaper: () => void;
  onUploadPdf?: (file: File) => void;
  onAddSticky: () => void;
  onAddImage?: () => void;
  onDiscoverProofs: () => void;
  onToggleTheme: () => void;
  theme: 'dark' | 'light';
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  pages,
  onSelectPage,
  onAddTheorem,
  onAddPaper,
  onUploadPdf,
  onAddSticky,
  onAddImage,
  onDiscoverProofs,
  onToggleTheme,
  theme,
}) => {
  const [query, setQuery] = useState('');
  const pdfInputRef = React.useRef<HTMLInputElement>(null);

  // Keybindings listener (Escape to close, Cmd+K / Ctrl+K handled in parent)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredPages = pages.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

  const actions = [
    {
      id: 'thm',
      label: 'Add Theorem Node',
      category: 'Creation',
      icon: <Sigma className="w-4 h-4 text-lime-400" />,
      run: () => { onAddTheorem(); onClose(); },
    },
    ...(onAddImage ? [{
      id: 'asset',
      label: 'Spawn Multimodal Asset (Galaxy, Nebula, Quantum)',
      category: 'Multimodal',
      icon: <ImageIcon className="w-4 h-4 text-lime-400" />,
      run: () => { onAddImage(); onClose(); },
    }] : []),
    ...(onUploadPdf ? [{
      id: 'upload-pdf',
      label: 'Upload Real PDF Document (Read & TTS)',
      category: 'Creation',
      icon: <BookOpen className="w-4 h-4 text-cyan-400" />,
      run: () => {
        pdfInputRef.current?.click();
        onClose();
      },
    }] : []),
    {
      id: 'paper',
      label: 'Pin Research Document (PDF)',
      category: 'Creation',
      icon: <BookOpen className="w-4 h-4 text-emerald-400" />,
      run: () => { onAddPaper(); onClose(); },
    },
    {
      id: 'hint',
      label: 'Add Ambient Socratic Prompt',
      category: 'Creation',
      icon: <HelpCircle className="w-4 h-4 text-amber-400" />,
      run: () => { onAddSticky(); onClose(); },
    },
    {
      id: 'proofs',
      label: 'Discover Proof Paths with Muse Wonder',
      category: 'AI Engine',
      icon: <Sparkles className="w-4 h-4 text-lime-400" />,
      run: () => { onDiscoverProofs(); onClose(); },
    },
    {
      id: 'theme',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      category: 'Preferences',
      icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
      run: () => { onToggleTheme(); onClose(); },
    },
  ].filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl rounded-2xl surface-elevated border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="file"
          ref={pdfInputRef}
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && onUploadPdf) onUploadPdf(f);
            e.target.value = '';
          }}
        />
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search files, run actions, or query theorems..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {/* Files Section */}
          {filteredPages.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Workspace Pages
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => {
                      onSelectPage(page.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs text-slate-800 dark:text-slate-200 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-slate-400 group-hover:text-lime-400 transition-colors" />
                      <span className="truncate font-medium">{page.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Open <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions Section */}
          {actions.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Quick Actions
              </div>
              <div className="space-y-0.5 mt-1">
                {actions.map((act) => (
                  <button
                    key={act.id}
                    onClick={act.run}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs text-slate-800 dark:text-slate-200 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      {act.icon}
                      <span className="font-medium">{act.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {act.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredPages.length === 0 && actions.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching actions or files found.
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>Navigate</span>
            <kbd className="font-mono text-[9px] bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-300 dark:border-slate-700">↑↓</kbd>
            <span>Select</span>
            <kbd className="font-mono text-[9px] bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-300 dark:border-slate-700">↵</kbd>
          </div>
          <span>SmartInk Command Bar</span>
        </div>
      </div>
    </div>
  );
};

