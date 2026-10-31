import React, { useState } from 'react';
import type { MetaModelConfig } from '../types';
import { SmartInkLogo } from './SmartInkLogo';
import { Settings, Key, ShieldCheck, Check, Sun, Moon, FileText } from 'lucide-react';

interface MetaModelIndicatorProps {
  config: MetaModelConfig;
  onUpdateConfig: (newConfig: MetaModelConfig) => void;
  onLoadPreset: (presetName: string) => void;
  activePageName: string;
  isSidebarOpen: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const MetaModelIndicator: React.FC<MetaModelIndicatorProps> = ({
  config,
  onUpdateConfig,
  onLoadPreset,
  activePageName,
  isSidebarOpen,
  theme,
  onToggleTheme,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(config.apiKey);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdateConfig({ ...config, apiKey: apiKeyInput });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <header className="fixed top-3 left-0 right-4 z-30 flex items-center justify-between pointer-events-none transition-all duration-300">
        {/* Brand Logo & Active Page Breadcrumb */}
        <div 
          className={`flex items-center gap-2.5 pointer-events-auto transition-all duration-300 ${
            isSidebarOpen ? 'pl-[300px]' : 'pl-16'
          }`}
        >
          {/* Logo Capsule */}
          <div className="flex items-center gap-2.5 p-1.5 px-3 rounded-2xl insta-panel shadow-sm">
            <SmartInkLogo size={26} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  SmartInk
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  AI Canvas
                </span>
              </div>
            </div>
          </div>

          {/* Active File Pill */}
          <div className="hidden sm:flex items-center gap-2 py-1.5 px-3 rounded-2xl insta-panel text-xs shadow-sm">
            <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">File:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
              {activePageName}
            </span>
          </div>

          {/* Preset Stories/Chips */}
          <div className="hidden xl:flex items-center gap-1.5 p-1 px-2 rounded-2xl insta-panel shadow-sm">
            <span className="text-[10px] text-slate-400 font-medium px-1">Presets:</span>
            <button
              onClick={() => onLoadPreset('pythagorean')}
              className="px-2.5 py-1 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              📐 Pythagorean
            </button>
            <button
              onClick={() => onLoadPreset('primes')}
              className="px-2.5 py-1 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              🔢 Primes
            </button>
            <button
              onClick={() => onLoadPreset('euler')}
              className="px-2.5 py-1 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✨ Euler
            </button>
          </div>
        </div>

        {/* Right Controls: Theme Toggle + Models + Settings */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Dark / Light Mode Switch */}
          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-2xl insta-panel shadow-sm text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all cursor-pointer"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* Model Status Pills */}
          <div className="hidden lg:flex items-center gap-2 p-1.5 px-3 rounded-2xl insta-panel text-xs shadow-sm">
            <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
              <span className="text-[11px]">Muse Wonder</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-[11px]">
              <span>Muse Spark 1.3</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-[11px]">
              <span>SAM 3.1</span>
            </div>
          </div>

          {/* Settings */}
          <button
            onClick={() => setIsOpen(true)}
            className="p-2.5 rounded-2xl insta-panel shadow-sm text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
            title="Meta Models & API Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Meta Model Settings Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl insta-panel p-6 shadow-2xl animate-in fade-in zoom-in-95 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <SmartInkLogo size={24} />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Meta Model API Settings
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Model Architecture Grid */}
            <div className="mt-4 space-y-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex items-center justify-between">
                  <span>Frontier Reasoning & Multi-Proof Synthesis</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-mono">
                    muse-wonder
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                  1-Million token context window for cross-referencing all pinned research documents and generating Socratic derivation trees.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                  <span>Multimodal Vision & Digital Ink</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono">
                    muse-spark-1.3 + sam-3.1
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                  Segment Anything isolates handwritten equations and sketch notes to transcribe them into verified LaTeX.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-violet-700 dark:text-violet-300 flex items-center justify-between">
                  <span>Voice Transcriber & Audio Dialogue</span>
                  <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-mono">
                    muse-voice-transcribe
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                  Streaming audio transcription for hands-free queries without losing canvas focus.
                </p>
              </div>
            </div>

            {/* Meta API Key Input */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Meta Model API Key</span>
                </label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> High-fidelity fallback included
                </span>
              </div>
              <input
                type="password"
                placeholder="meta_api_key_..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <p className="text-[10px] text-slate-500">
                *SmartInk automatically falls back to local mathematical proof generation and browser speech recognition if no key is entered.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
              >
                {saved ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{saved ? "Saved!" : "Save & Apply"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

