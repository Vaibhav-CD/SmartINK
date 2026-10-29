import React, { useState } from 'react';
import { useDocumentStore } from '../../store/documentStore';
import { SUPPORTED_LANGUAGES } from '../../engine/translationEngine';
import { VoicePersona } from '../../types/document';
import {
  BookOpen,
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Globe,
  Sun,
  Moon,
  Coffee,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const DocumentReaderModal: React.FC = () => {
  const {
    documents,
    activeDocumentId,
    isReaderModalOpen,
    closeReaderModal,
    setPage,
    setTheme,
    ttsState,
    playTTS,
    pauseTTS,
    resumeTTS,
    stopTTS,
    seekSentenceTTS,
    setPersona,
    setRate,
    setPitch,
    translateCurrentPage,
    isTranslating,
  } = useDocumentStore();

  const [targetLang, setTargetLang] = useState('es');

  if (!isReaderModalOpen || !activeDocumentId) return null;

  const doc = documents.find((d) => d.id === activeDocumentId);
  if (!doc) return null;

  const currentPageIndex = (doc.currentPage || 1) - 1;
  const page = doc.pages[currentPageIndex] || doc.pages[0];
  const totalPages = doc.pages.length;

  const currentTheme = doc.theme || 'dark';

  const themeStyles = {
    dark: 'bg-[#0b1120] text-slate-100 border-slate-800',
    sepia: 'bg-[#fbf0d9] text-[#433422] border-[#e2d3be]',
    light: 'bg-white text-slate-900 border-slate-200',
  };

  const handleTranslate = async () => {
    await translateCurrentPage(doc.id, doc.currentPage || 1, targetLang);
  };

  const translatedText = page?.translatedText?.[targetLang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md select-none animate-fade-in">
      <div
        className={`w-full max-w-5xl h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl border ${themeStyles[currentTheme]}`}
      >
        {/* Top Header */}
        <div className="px-6 py-3.5 border-b flex items-center justify-between gap-4 bg-black/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold line-clamp-1">{doc.metadata.title}</h2>
              <p className="text-xs opacity-60 font-mono">
                Page {doc.currentPage} of {totalPages} · De-Hyphenated Reading Stream
              </p>
            </div>
          </div>

          {/* Theme & Controls */}
          <div className="flex items-center gap-2">
            {/* Theme switcher */}
            <div className="flex items-center p-1 rounded-xl bg-black/20 border border-white/10">
              <button
                onClick={() => setTheme(doc.id, 'dark')}
                title="Dark Theme"
                className={`p-1.5 rounded-lg transition-colors ${
                  currentTheme === 'dark' ? 'bg-cyan-500 text-slate-950 font-bold' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme(doc.id, 'sepia')}
                title="Sepia Theme"
                className={`p-1.5 rounded-lg transition-colors ${
                  currentTheme === 'sepia' ? 'bg-amber-600 text-white font-bold' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme(doc.id, 'light')}
                title="Light Theme"
                className={`p-1.5 rounded-lg transition-colors ${
                  currentTheme === 'light' ? 'bg-slate-200 text-slate-900 font-bold' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={closeReaderModal}
              className="p-2 rounded-xl hover:bg-black/20 transition-colors"
            >
              <X className="w-5 h-5 opacity-70 hover:opacity-100" />
            </button>
          </div>
        </div>

        {/* Reader Body Grid (Document Text on left, Translation / TTS on right) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/40">
          {/* Main Reading Column with Click-To-Seek and Active Highlight */}
          <div className="lg:col-span-7 p-6 overflow-y-auto select-text leading-relaxed text-sm sm:text-base font-serif">
            {page?.sentences && page.sentences.length > 0 ? (
              <div className="space-y-3">
                {page.sentences.map((sentence, idx) => {
                  const isCurrentActiveSentence =
                    ttsState.isPlaying &&
                    ttsState.currentDocumentId === doc.id &&
                    ttsState.currentSentenceIndex === idx;

                  return (
                    <span
                      key={idx}
                      onClick={() => {
                        seekSentenceTTS(idx);
                        if (!ttsState.isPlaying) {
                          playTTS(doc.id, doc.currentPage);
                        }
                      }}
                      title="Click sentence to seek voice playback"
                      className={`cursor-pointer transition-colors px-1 py-0.5 rounded ${
                        isCurrentActiveSentence
                          ? 'bg-cyan-500/30 text-cyan-200 border-b-2 border-cyan-400 font-medium'
                          : 'hover:bg-cyan-500/10'
                      }`}
                    >
                      {sentence}{' '}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="opacity-60 italic">No readable sentences parsed on this page.</p>
            )}
          </div>

          {/* Side Studio: Translation & Voice Controls */}
          <div className="lg:col-span-5 p-6 overflow-y-auto flex flex-col gap-5 bg-black/15">
            {/* Audio Voice Synthesizer Controls */}
            <div className="p-4 rounded-xl bg-black/20 border border-white/10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-mono">
                  <Volume2 className="w-4 h-4" /> Web Speech TTS Player
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <ShieldCheck className="w-3 h-3" /> Chromium Watchdog Active
                </span>
              </div>

              {/* Play / Pause / Seek Buttons */}
              <div className="flex items-center justify-center gap-3 py-1">
                <button
                  onClick={() => {
                    const prevIdx = Math.max(0, ttsState.currentSentenceIndex - 1);
                    seekSentenceTTS(prevIdx);
                  }}
                  className="p-2 rounded-lg bg-black/20 hover:bg-black/30"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {ttsState.isPlaying ? (
                  <button
                    onClick={pauseTTS}
                    className="p-3 rounded-full bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
                  >
                    <Pause className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => playTTS(doc.id, doc.currentPage)}
                    className="p-3 rounded-full bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
                  >
                    <Play className="w-5 h-5 ml-0.5" />
                  </button>
                )}

                <button
                  onClick={() => {
                    const nextIdx = Math.min(
                      (page?.sentences.length || 1) - 1,
                      ttsState.currentSentenceIndex + 1
                    );
                    seekSentenceTTS(nextIdx);
                  }}
                  className="p-2 rounded-lg bg-black/20 hover:bg-black/30"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Persona Selector */}
              <div className="grid grid-cols-5 gap-1 pt-1">
                {(['Studio', 'Male', 'Female', 'Child', 'Deep'] as VoicePersona[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPersona(p)}
                    className={`py-1 text-[11px] rounded-lg border font-mono transition-colors ${
                      ttsState.persona === p
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Rate & Pitch sliders */}
              <div className="space-y-1.5 pt-2 text-xs font-mono opacity-80">
                <div className="flex justify-between">
                  <span>Speed: {ttsState.rate.toFixed(1)}x</span>
                  <input
                    type="range"
                    min="0.6"
                    max="2.0"
                    step="0.1"
                    value={ttsState.rate}
                    onChange={(e) => setRate(parseFloat(e.target.value))}
                    className="w-24 accent-cyan-400"
                  />
                </div>
                <div className="flex justify-between">
                  <span>Pitch: {ttsState.pitch.toFixed(1)}</span>
                  <input
                    type="range"
                    min="0.6"
                    max="1.8"
                    step="0.1"
                    value={ttsState.pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-24 accent-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Polyglot Essence-Preserving Translation */}
            <div className="p-4 rounded-xl bg-black/20 border border-white/10 flex flex-col gap-3 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 font-mono">
                  <Globe className="w-4 h-4" /> Polyglot Translation
                </span>
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-500 text-white font-semibold text-xs hover:bg-purple-400 disabled:opacity-50 transition-all shadow-md"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isTranslating ? 'Translating...' : 'Translate'}</span>
                </button>
              </div>

              {/* Language picker */}
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/15 text-xs font-mono"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>

              {/* Translated Output Stream */}
              <div className="flex-1 min-h-[160px] p-3 rounded-lg bg-black/25 overflow-y-auto text-xs leading-relaxed select-text font-serif">
                {translatedText ? (
                  <p>{translatedText}</p>
                ) : (
                  <p className="opacity-50 italic">
                    Click 'Translate' above to generate contextual essence-preserving translation for
                    this page.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Pagination Bar */}
        <div className="px-6 py-3 border-t flex items-center justify-between bg-black/10">
          <button
            onClick={() => setPage(doc.id, Math.max(1, (doc.currentPage || 1) - 1))}
            disabled={doc.currentPage <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 disabled:opacity-30 text-xs font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Page</span>
          </button>

          <span className="text-xs font-mono opacity-70">
            Page {doc.currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setPage(doc.id, Math.min(totalPages, (doc.currentPage || 1) + 1))}
            disabled={doc.currentPage >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 disabled:opacity-30 text-xs font-medium"
          >
            <span>Next Page</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
