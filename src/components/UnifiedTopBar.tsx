import React, { useState } from 'react';
import type { MetaModelConfig } from '../types';
import { SmartInkLogo } from './SmartInkLogo';
import { 
  PanelLeft, 
  PanelLeftClose, 
  Search, 
  Mic, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  Settings, 
  FileText, 
  ShieldCheck, 
  Check, 
  Key 
} from 'lucide-react';

interface UnifiedTopBarProps {
  onNavigateHome?: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  activePageName: string;
  onOpenCommandPalette: () => void;
  onLoadPreset: (preset: string) => void;
  isListening: boolean;
  voiceTranscript: string;
  onToggleVoice: () => void;
  ttsEnabled: boolean;
  onToggleTTS: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  config: MetaModelConfig;
  onUpdateConfig: (newConfig: MetaModelConfig) => void;
  isSplitView?: boolean;
  onToggleSplitView?: () => void;
}

export const UnifiedTopBar: React.FC<UnifiedTopBarProps> = ({
  onNavigateHome,
  isSidebarOpen,
  onToggleSidebar,
  activePageName,
  onOpenCommandPalette,
  onLoadPreset,
  isListening,
  voiceTranscript,
  onToggleVoice,
  ttsEnabled,
  onToggleTTS,
  theme,
  onToggleTheme,
  config,
  onUpdateConfig,
  isSplitView,
  onToggleSplitView,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(config.apiKey);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdateConfig({
      ...config,
      apiKey: apiKeyInput,
      isLiveApi: !!apiKeyInput.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 h-13 px-3 surface-elevated border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between transition-colors">
        {/* Left Section: Sidebar Toggle + Brand + Current Document */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 text-lime-400" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-slate-800">
            <SmartInkLogo size={22} />
            <button
              onClick={onNavigateHome}
              className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Return to SmartInk Home Portal"
            >
              <span>SmartInk</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                Portal
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[190px]">
              {activePageName}
            </span>
          </div>
        </div>

        {/* Center Section: Quick Search / Command Bar & Presets */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer min-w-[260px] justify-between shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search or type command...</span>
            </div>
            <kbd className="font-mono text-[10px] text-slate-400 px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              ⌘K
            </kbd>
          </button>

          <div className="hidden lg:flex items-center gap-1 text-xs">
            <button
              onClick={() => onLoadPreset('pythagorean')}
              className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer font-medium text-[11px]"
            >
              Pythagorean
            </button>
            <button
              onClick={() => onLoadPreset('primes')}
              className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer font-medium text-[11px]"
            >
              Primes
            </button>
            <button
              onClick={() => onLoadPreset('euler')}
              className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer font-medium text-[11px]"
            >
              Euler
            </button>
          </div>

          {/* Split / Multi-Sheet Workspace View (Inspired by SmartInk Dual Sheet Icon) */}
          {onToggleSplitView && (
            <button
              onClick={onToggleSplitView}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSplitView
                  ? 'bg-lime-500/20 text-lime-400 border border-lime-500/40 shadow-sm shadow-lime-500/10'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-lime-400 border border-slate-200 dark:border-slate-800 hover:border-lime-500/30'
              }`}
              title={isSplitView ? "Switch back to Single Canvas" : "Dual Sheet / Split View Mode"}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="13" height="13" rx="2" />
                <path d="M9 7h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2" />
              </svg>
              <span className="text-[11px] font-mono hidden sm:inline">
                {isSplitView ? "Dual Split" : "Split View"}
              </span>
            </button>
          )}
        </div>

        {/* Right Section: Compact Voice Capsule + Models + Theme + Settings */}
        <div className="flex items-center gap-1.5">
          {/* Integrated Voice Pill */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={onToggleVoice}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-600 dark:text-slate-400 hover:text-lime-400'
              }`}
              title={isListening ? "Listening..." : "Click to speak voice command"}
            >
              <Mic className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate hidden xl:inline">
              {voiceTranscript || (isListening ? "Listening..." : "Voice Co-Pilot")}
            </span>

            <button
              onClick={onToggleTTS}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                ttsEnabled ? 'text-lime-400' : 'text-slate-400 hover:text-slate-600'
              }`}
              title={ttsEnabled ? "Voice replies enabled" : "Muted"}
            >
              {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Model Status Pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-lime-500/10 border border-lime-500/30 text-lime-400 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-ping" />
            <span>Muse Wonder</span>
          </div>

          {/* Dark/Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Meta Models & Workspace Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl surface-elevated border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <SmartInkLogo size={22} />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Meta Models & System Architecture
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-lime-400 flex items-center justify-between">
                  <span>Reasoning & Socratic Synthesis</span>
                  <span className="font-mono text-[10px] text-lime-400">muse-wonder</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  1-Million token context window for multi-proof derivation and Socratic queries.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-emerald-400 flex items-center justify-between">
                  <span>Vision & Digital Ink Parsing</span>
                  <span className="font-mono text-[10px] text-emerald-400">sam-3.1 + muse-spark-1.3</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Converts handwritten stylus math & diagrams directly into verified LaTeX.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-lime-400 flex items-center justify-between">
                  <span>Speech-to-Text Transcribe</span>
                  <span className="font-mono text-[10px] text-lime-400">muse-voice-transcribe</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Streaming audio transcription for hands-free queries.
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-lime-400" />
                  <span>Meta Model API Key</span>
                </label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> High-fidelity local fallback enabled
                </span>
              </div>
              <input
                type="password"
                placeholder="meta_api_key_..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-lime-500 font-mono"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold text-xs shadow-md shadow-lime-500/20 transition-colors cursor-pointer"
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

