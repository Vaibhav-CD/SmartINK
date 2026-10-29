import React, { useState } from 'react';
import { SmartDial } from './SmartDial';
import { GalvanicCornerCircuits } from './GalvanicCornerCircuits';
import { 
  Plus, 
  Mic, 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  Compass, 
  Layers, 
  Sun, 
  Moon,
  ChevronDown,
  FlaskConical
} from 'lucide-react';

interface SmartInkHomePageProps {
  onEnterCanvas: (initialQuery?: string) => void;
  onEnterStudio: () => void;
  onLoadPreset: (presetName: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onStartVoice: () => void;
}

export const SmartInkHomePage: React.FC<SmartInkHomePageProps> = ({
  onEnterCanvas,
  onEnterStudio,
  onLoadPreset,
  theme,
  onToggleTheme,
  onStartVoice,
}) => {
  const [query, setQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('Muse Wonder');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'Canvas Sheets' | 'Deep Derivation' | 'Proof Matrix'>('Canvas Sheets');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onEnterCanvas(query.trim() || undefined);
  };

  const starterSuggestions = [
    {
      id: 'pythagorean',
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      title: "Pythagorean Theorem Derivation",
      description: "Synthesize geometric windmill, algebraic area expansion & Einstein scaling proofs.",
      action: () => onLoadPreset('pythagorean'),
    },
    {
      id: 'primes',
      icon: <Compass className="w-5 h-5 text-lime-400" />,
      title: "Riemann Zeta & Prime Infinitude",
      description: "Explore Euler's harmonic divergence product formula and topological prime density.",
      action: () => onLoadPreset('primes'),
    },
    {
      id: 'euler',
      icon: <Sparkles className="w-5 h-5 text-green-400" />,
      title: "Euler's Complex Identity Analysis",
      description: "Expand exponential power series e^(iπ) + 1 = 0 & differential invariant tests.",
      action: () => onLoadPreset('euler'),
    },
    {
      id: 'blank',
      icon: <Layers className="w-5 h-5 text-teal-400" />,
      title: "Infinite Research Whiteboard",
      description: "Launch a clean infinite canvas to draw freehand ink, pin papers & query live.",
      action: () => onEnterCanvas(),
    },
    {
      id: 'studio',
      icon: <FlaskConical className="w-5 h-5 text-lime-400" />,
      title: "Simulation Studio",
      description: "Describe any physics setup — watch it simulate with tunable parameters.",
      action: () => onEnterStudio(),
    },
  ];

  const isDark = theme === 'dark';

  return (
    <div className={`relative w-screen min-h-screen overflow-x-hidden overflow-y-auto ${
      isDark ? 'bg-[#06080d] text-slate-100' : 'bg-slate-50 text-slate-900'
    } flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-700 transition-colors`}>
      {/* 1. Luminous Corner Cyber-Circuits framing the full screen */}
      <div className={isDark ? 'opacity-90' : 'opacity-40'}>
        <GalvanicCornerCircuits />
      </div>

      {/* 2. Deep Galactic Ambient Radial Glows (Expanding across the canvas) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full ${
          isDark 
            ? 'bg-gradient-to-tr from-emerald-600/15 via-lime-500/12 to-transparent' 
            : 'bg-gradient-to-tr from-emerald-500/10 via-teal-400/8 to-transparent'
        } blur-[160px]`} />
        <div className={`absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full ${
          isDark ? 'bg-green-500/8' : 'bg-emerald-500/5'
        } blur-[120px]`} />
      </div>

      {/* Top Header */}
      <header className={`relative z-20 w-full px-6 sm:px-10 py-5 flex items-center justify-between border-b ${
        isDark ? 'border-white/5 bg-[#06080d]/70' : 'border-slate-200 bg-white/80'
      } backdrop-blur-md transition-colors`}>
        <div className="flex items-center gap-3.5">
          <SmartDial size={38} />
          <div className="flex items-center gap-2.5">
            <span className="text-base font-black tracking-widest uppercase bg-gradient-to-r from-emerald-500 via-lime-400 to-green-600 bg-clip-text text-transparent">
              SmartInk
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase ${
              isDark 
                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]' 
                : 'bg-emerald-50 border border-emerald-500/30 text-emerald-700'
            }`}>
              v2.0 Core
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          {/* Active Model Indicator */}
          <div className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs ${
            isDark 
              ? 'bg-slate-900/80 border-emerald-500/20 text-slate-300' 
              : 'bg-white border-slate-200 text-slate-700 shadow-xs'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="font-mono text-xs text-emerald-600 dark:text-emerald-300">Meta Muse Wonder</span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">1M Context Window</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isDark 
                ? 'bg-slate-900/80 hover:bg-slate-800 border-white/10 text-slate-400 hover:text-emerald-400' 
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-emerald-600 shadow-xs'
            }`}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* Direct Enter Canvas Button */}
          <button
            onClick={() => onEnterCanvas()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all cursor-pointer"
          >
            <span>Launch Canvas Sheets</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Expansive Center Stage */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-12 lg:py-16 max-w-5xl mx-auto w-full">
        {/* Futuristic 3D SmartInk Dial Centerpiece */}
        <div className="mb-9 animate-in fade-in zoom-in-90 duration-500">
          <SmartDial size={200} />
        </div>

        {/* Clean Headline */}
        <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-center ${
          isDark ? 'text-slate-100' : 'text-slate-900'
        }`}>
          Where should we start?
        </h1>
        <p className={`text-sm sm:text-base mt-3 text-center max-w-xl font-medium leading-relaxed ${
          isDark ? 'text-slate-400' : 'text-slate-600'
        }`}>
          AI-Native Spatial Research Workbench powered by the Meta Model API and SmartInk Multimodal Matrix.
        </p>

        {/* Futuristic Expansive Prompt SmartBox Form */}
        <form onSubmit={handleSubmit} className="w-full mt-8 sm:mt-10 max-w-4xl space-y-4">
          <div className={`relative flex items-center border rounded-2xl sm:rounded-3xl p-3 sm:px-4 sm:py-3.5 transition-all shadow-2xl ${
            isDark 
              ? 'bg-[#0d121a] border-emerald-500/35 hover:border-emerald-500/70 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/25 shadow-black/70' 
              : 'bg-white border-slate-200 hover:border-emerald-500/60 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 shadow-slate-200/80'
          }`}>
            {/* Left '+' Attachment Button */}
            <button
              type="button"
              onClick={() => onEnterCanvas()}
              className={`p-2 sm:p-2.5 rounded-xl transition-colors cursor-pointer ${
                isDark 
                  ? 'hover:bg-slate-800/80 text-slate-400 hover:text-emerald-400' 
                  : 'hover:bg-slate-100 text-slate-500 hover:text-emerald-600'
              }`}
              title="Add connector, file or sheet"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Input Field */}
            <input
              type="text"
              autoFocus
              placeholder="State a theorem, inquiry, or type @ for research connectors..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`flex-1 bg-transparent px-3 sm:px-4 py-2 text-base focus:outline-none ${
                isDark ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
              }`}
            />

            {/* Model Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors cursor-pointer ${
                  isDark 
                    ? 'bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border-emerald-500/25' 
                    : 'bg-slate-100 hover:bg-slate-200 text-emerald-700 border-slate-200'
                }`}
              >
                <span>{selectedModel}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showModelDropdown && (
                <div className={`absolute right-0 top-full mt-2 w-52 rounded-xl border shadow-2xl p-1.5 z-30 animate-in fade-in ${
                  isDark ? 'bg-[#0d121a] border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  {['Muse Wonder', 'Muse Spark 1.3', 'SAM 3.1 Vision'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setSelectedModel(m);
                        setShowModelDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        selectedModel === m 
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold' 
                          : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Speech Input Icon */}
            <button
              type="button"
              onClick={onStartVoice}
              className={`p-2 sm:p-2.5 ml-1 rounded-xl transition-colors cursor-pointer ${
                isDark 
                  ? 'hover:bg-slate-800/80 text-slate-400 hover:text-emerald-400' 
                  : 'hover:bg-slate-100 text-slate-500 hover:text-emerald-600'
              }`}
              title="Voice Query (Muse Voice Transcribe)"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Tabs Pills */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {(['Canvas Sheets', 'Deep Derivation', 'Proof Matrix'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-600 dark:text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                    : isDark 
                      ? 'bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                      : 'bg-slate-200/60 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-transparent'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </form>

        {/* 2x2 Expansive Starter Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-10 max-w-4xl">
          {starterSuggestions.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className={`flex items-start justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl border text-left transition-all cursor-pointer group shadow-sm hover:shadow-md ${
                isDark 
                  ? 'bg-[#0b0f16]/90 hover:bg-[#111722] border-white/5 hover:border-emerald-500/40 hover:shadow-emerald-500/10' 
                  : 'bg-white hover:bg-slate-50/90 border-slate-200 hover:border-emerald-500/50 hover:shadow-emerald-500/10'
              }`}
            >
              <div className="flex items-start gap-3.5 pr-2">
                <div className={`p-2.5 rounded-2xl border transition-colors shrink-0 mt-0.5 ${
                  isDark ? 'bg-slate-900 border-white/5 group-hover:border-emerald-500/30' : 'bg-slate-100 border-slate-200 group-hover:border-emerald-500/30'
                }`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className={`text-sm font-bold transition-colors ${
                    isDark ? 'text-slate-200 group-hover:text-emerald-300' : 'text-slate-800 group-hover:text-emerald-600'
                  }`}>
                    {item.title}
                  </h3>
                  <p className={`text-xs mt-1 leading-relaxed ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {item.description}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
            </button>
          ))}
        </div>
      </main>

      {/* Footer Info */}
      <footer className={`relative z-20 w-full px-8 py-4 border-t flex items-center justify-between text-xs font-mono ${
        isDark ? 'border-white/5 text-slate-500' : 'border-slate-200 text-slate-500'
      }`}>
        <div>SmartInk MATRIX • BEN 10 SCI-FI THEME EDITION</div>
        <div>POWERED BY META MODEL API (MUSE SPARK / WONDER)</div>
      </footer>
    </div>
  );
};

