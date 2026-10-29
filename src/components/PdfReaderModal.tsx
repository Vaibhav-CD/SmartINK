import React, { useState, useEffect, useRef } from 'react';
import type { DocumentItem } from '../types';
import { 
  X, 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  BookOpen, 
  Sparkles,
  FastForward,
  Languages,
  Loader2,
  Check,
  Globe,
  User,
  RotateCcw
} from 'lucide-react';
import { 
  TtsService, 
  TTS_PERSONAS, 
  type TtsPersonaId, 
  type TtsPlaybackState, 
  type SentenceSegment 
} from '../services/speech/ttsService';
import { TranslationService, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../services/translation/translationService';
import { PdfService } from '../services/pdf/pdfService';

interface PdfReaderModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSynthesize?: (doc: DocumentItem) => void;
  onUpdateDocument?: (doc: DocumentItem) => void;
}

type ReaderTheme = 'dark' | 'sepia' | 'light';

export const PdfReaderModal: React.FC<PdfReaderModalProps> = ({
  document,
  isOpen,
  onClose,
  onSynthesize,
  onUpdateDocument,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [playbackState, setPlaybackState] = useState<TtsPlaybackState>('idle');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [activeCharIndex, setActiveCharIndex] = useState<number | null>(null);
  const [startCharOffset, setStartCharOffset] = useState<number>(0);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>(() => {
    if (typeof window !== 'undefined' && window.document.documentElement.classList.contains('light')) {
      return 'light';
    }
    return 'dark';
  });
  const [fontSize, setFontSize] = useState<number>(16);

  // Voice Persona Profile (Female, Male, Child, Scholar, Robot)
  const [selectedPersona, setSelectedPersona] = useState<TtsPersonaId>('female');
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState<boolean>(false);

  // Smart Translation State
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translations, setTranslations] = useState<Record<string, Record<number, string>>>({});
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState<boolean>(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // Sync current page and existing translations when document opens
  useEffect(() => {
    if (document) {
      setCurrentPage(document.currentPage || 0);
      if (document.selectedLanguage) {
        setSelectedLanguage(document.selectedLanguage);
      }
      if (document.translations) {
        const initialMap: Record<string, Record<number, string>> = {};
        Object.entries(document.translations).forEach(([lang, pList]) => {
          initialMap[lang] = {};
          pList.forEach((text, idx) => {
            initialMap[lang][idx] = text;
          });
        });
        setTranslations(initialMap);
      }
    }
  }, [document]);

  // Subscribe to TTS service state
  useEffect(() => {
    const unsub = TtsService.subscribeState((st) => {
      setPlaybackState(st);
    });
    return () => {
      unsub();
      TtsService.stop();
    };
  }, []);

  // Stop TTS if modal closes
  useEffect(() => {
    if (!isOpen) {
      TtsService.stop();
      setActiveCharIndex(null);
      setStartCharOffset(0);
      setIsLangMenuOpen(false);
      setIsPersonaMenuOpen(false);
    }
  }, [isOpen]);

  if (!isOpen || !document) return null;

  const totalPages = Math.max(1, document.pages?.length || 1);
  const rawPageText = document.pages?.[currentPage] || document.abstract || 'No content available on this page.';
  const cleanOriginalText = PdfService.cleanAndDehyphenateText(rawPageText);

  // Active translation for current page
  const translatedPageText = translations[selectedLanguage]?.[currentPage];
  const isViewingTranslation = selectedLanguage !== 'en' && !showOriginal && !!translatedPageText;
  const activeDisplayText = isViewingTranslation ? translatedPageText : cleanOriginalText;

  // Split active text into interactive clickable sentences
  const sentenceSegments: SentenceSegment[] = TtsService.splitIntoSentences(activeDisplayText);

  // Global char index inside the full text
  const activeGlobalCharIndex = activeCharIndex !== null ? startCharOffset + activeCharIndex : null;

  // Trigger translation when user switches language
  const triggerTranslation = async (targetLangCode: string, pageIdx: number) => {
    if (targetLangCode === 'en') return;
    if (translations[targetLangCode]?.[pageIdx]) return;

    setIsTranslating(true);
    try {
      const pageRaw = document.pages?.[pageIdx] || document.abstract || '';
      const textToTranslate = PdfService.cleanAndDehyphenateText(pageRaw);
      const translated = await TranslationService.translateText(textToTranslate, targetLangCode, 'en');
      
      setTranslations((prev) => {
        const next = {
          ...prev,
          [targetLangCode]: {
            ...(prev[targetLangCode] || {}),
            [pageIdx]: translated,
          },
        };
        if (onUpdateDocument && document) {
          const serializedTranslations: Record<string, string[]> = {};
          Object.entries(next).forEach(([l, pageMap]) => {
            const arr: string[] = [];
            Object.entries(pageMap).forEach(([idx, txt]) => {
              arr[Number(idx)] = txt;
            });
            serializedTranslations[l] = arr;
          });
          onUpdateDocument({
            ...document,
            translations: serializedTranslations,
            selectedLanguage: targetLangCode,
          });
        }
        return next;
      });
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setSelectedLanguage(lang.code);
    setIsLangMenuOpen(false);
    setShowOriginal(false);
    setStartCharOffset(0);

    if (playbackState === 'playing') {
      TtsService.stop();
      setActiveCharIndex(null);
    }

    if (lang.code !== 'en' && !translations[lang.code]?.[currentPage]) {
      triggerTranslation(lang.code, currentPage);
    }
  };

  /**
   * Starts speaking from an arbitrary character offset (Click-to-Seek)
   */
  const handleSeekAndPlay = (startIndex: number) => {
    setStartCharOffset(startIndex);
    setActiveCharIndex(0);

    const textToSpeak = activeDisplayText.slice(startIndex);
    const langToUse = isViewingTranslation ? selectedLanguage : 'en';

    TtsService.speak(textToSpeak, {
      rate: speechRate,
      lang: langToUse,
      persona: selectedPersona,
      onStart: () => {
        setPlaybackState('playing');
      },
      onEnd: () => {
        setActiveCharIndex(null);
        setStartCharOffset(0);
        if (autoAdvance && currentPage < totalPages - 1) {
          handlePageChange(currentPage + 1);
        }
      },
      onBoundary: (idx) => {
        setActiveCharIndex(idx);
      },
      onError: () => {
        setPlaybackState('idle');
        setActiveCharIndex(null);
      },
    });
  };

  const handleStartSpeaking = () => {
    if (playbackState === 'paused') {
      TtsService.resume();
      return;
    }
    // Resume from startCharOffset if user paused/stopped at a seek location
    handleSeekAndPlay(startCharOffset);
  };

  const handlePauseSpeaking = () => {
    TtsService.pause();
  };

  const handleStopSpeaking = () => {
    TtsService.stop();
    setActiveCharIndex(null);
  };

  const handleResetToStart = () => {
    TtsService.stop();
    setActiveCharIndex(null);
    setStartCharOffset(0);
  };

  const handleTogglePlayPause = () => {
    if (playbackState === 'playing') {
      handlePauseSpeaking();
    } else {
      handleStartSpeaking();
    }
  };

  const handleRateChange = (rate: number) => {
    setSpeechRate(rate);
    if (playbackState === 'playing') {
      const currentGlobal = activeGlobalCharIndex || startCharOffset;
      handleSeekAndPlay(currentGlobal);
    }
  };

  const handlePersonaChange = (personaId: TtsPersonaId) => {
    setSelectedPersona(personaId);
    setIsPersonaMenuOpen(false);
    if (playbackState === 'playing') {
      const currentGlobal = activeGlobalCharIndex || startCharOffset;
      handleSeekAndPlay(currentGlobal);
    }
  };

  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(0, Math.min(totalPages - 1, newPage));
    if (clamped !== currentPage) {
      if (playbackState === 'playing') {
        TtsService.stop();
        setActiveCharIndex(null);
      }
      setStartCharOffset(0);
      setCurrentPage(clamped);
      if (onUpdateDocument && document) {
        onUpdateDocument({ ...document, currentPage: clamped });
      }
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
      if (selectedLanguage !== 'en' && !translations[selectedLanguage]?.[clamped]) {
        triggerTranslation(selectedLanguage, clamped);
      }
    }
  };

  // Render text with clickable sentences and live word highlight
  const renderInteractiveContent = () => {
    if (sentenceSegments.length === 0) {
      return <span>{activeDisplayText}</span>;
    }

    return (
      <div className="space-y-3">
        <p className="leading-relaxed">
          {sentenceSegments.map((seg, sIdx) => {
            const isSpeakingThis =
              playbackState === 'playing' &&
              activeGlobalCharIndex !== null &&
              activeGlobalCharIndex >= seg.startIndex &&
              activeGlobalCharIndex < seg.endIndex;

            return (
              <span
                key={sIdx}
                onClick={() => handleSeekAndPlay(seg.startIndex)}
                className={`cursor-pointer rounded-lg px-1 py-0.5 transition-all inline group relative ${
                  isSpeakingThis
                    ? 'bg-lime-400/35 text-lime-200 ring-2 ring-lime-400/60 shadow-sm'
                    : 'hover:bg-lime-500/15 hover:text-lime-300'
                }`}
                title="Click to start reading from this sentence"
              >
                {seg.text}{' '}
              </span>
            );
          })}
        </p>
      </div>
    );
  };

  // Determine theme styles
  const getThemeClasses = () => {
    switch (readerTheme) {
      case 'sepia':
        return 'bg-[#fbf0d9] text-[#2c2214] border-amber-200';
      case 'light':
        return 'bg-white text-slate-800 border-slate-200';
      case 'dark':
      default:
        return 'bg-slate-950 text-slate-100 border-slate-800';
    }
  };

  const getContainerBg = () => {
    switch (readerTheme) {
      case 'sepia':
        return 'bg-[#f4e4c1]';
      case 'light':
        return 'bg-slate-100';
      case 'dark':
      default:
        return 'bg-slate-900/90';
    }
  };

  const currentLangObj = TranslationService.getLanguageByCode(selectedLanguage);
  const currentPersonaObj = TTS_PERSONAS[selectedPersona] || TTS_PERSONAS.female;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`relative flex flex-col w-full max-w-4xl h-[90vh] rounded-3xl border shadow-2xl overflow-hidden transition-colors ${getThemeClasses()}`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-inherit relative">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-xl bg-lime-500/10 text-lime-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h2 className="text-base font-bold truncate leading-tight">
                {document.title}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs opacity-70">
                <span className="truncate">{document.authors}</span>
                {isViewingTranslation && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-semibold border border-cyan-500/30 text-[10px]">
                    {currentLangObj.flag} {currentLangObj.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Preferences & Actions */}
          <div className="flex items-center gap-2">
            {/* Voice Persona Selector */}
            <div className="relative">
              <button
                onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/50 bg-slate-800/40 text-slate-200 hover:text-lime-300 text-xs font-semibold transition-all cursor-pointer"
                title="Select Voice Profile (Female, Male, Child, Scholar, Robot)"
              >
                <span className="text-sm">{currentPersonaObj.icon}</span>
                <span>{currentPersonaObj.label}</span>
              </button>

              {isPersonaMenuOpen && (
                <div 
                  className="absolute right-0 top-full mt-2 w-56 py-1.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                    <span>Voice Persona</span>
                    <User className="w-3 h-3 text-lime-400" />
                  </div>
                  <div className="py-1">
                    {(Object.keys(TTS_PERSONAS) as TtsPersonaId[]).map((pId) => {
                      const p = TTS_PERSONAS[pId];
                      const isSelected = selectedPersona === pId;
                      return (
                        <button
                          key={pId}
                          onClick={() => handlePersonaChange(pId)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-800 transition-colors cursor-pointer ${
                            isSelected ? 'bg-lime-500/10 text-lime-400 font-bold' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{p.icon}</span>
                            <div>
                              <p className="font-semibold">{p.label}</p>
                              <p className="text-[10px] text-slate-500 leading-tight">{p.description}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-lime-400 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Smart Language Translation Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  selectedLanguage !== 'en'
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-sm'
                    : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:text-white'
                }`}
                title="Translate document into different languages with conceptual essence"
              >
                <Languages className="w-3.5 h-3.5 text-cyan-400" />
                <span>{currentLangObj.flag} {currentLangObj.nativeName}</span>
              </button>

              {isLangMenuOpen && (
                <div 
                  className="absolute right-0 top-full mt-2 w-52 py-1.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                    <span>Translate Essence</span>
                    <Globe className="w-3 h-3 text-cyan-400" />
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleSelectLanguage(lang)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-800/80 transition-colors cursor-pointer ${
                          selectedLanguage === lang.code ? 'bg-cyan-500/10 text-cyan-400 font-bold' : 'text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{lang.flag}</span>
                          <span>{lang.nativeName}</span>
                          <span className="text-[10px] text-slate-500">({lang.name})</span>
                        </span>
                        {selectedLanguage === lang.code && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Toggle Original vs Translated */}
            {selectedLanguage !== 'en' && (
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Toggle between original text and translated text"
              >
                {showOriginal ? 'View Translated' : 'View Original'}
              </button>
            )}

            {/* Theme switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <button
                onClick={() => setReaderTheme('dark')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${readerTheme === 'dark' ? 'bg-slate-700 text-lime-300' : 'opacity-60 hover:opacity-100'}`}
                title="Dark theme"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setReaderTheme('sepia')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${readerTheme === 'sepia' ? 'bg-amber-200 text-amber-950' : 'opacity-60 hover:opacity-100'}`}
                title="Sepia warm paper"
              >
                Sepia
              </button>
              <button
                onClick={() => setReaderTheme('light')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${readerTheme === 'light' ? 'bg-white text-slate-900' : 'opacity-60 hover:opacity-100'}`}
                title="Light paper"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Font size adjustments */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <button
                onClick={() => setFontSize(s => Math.max(12, s - 2))}
                className="px-2 py-1 rounded-lg text-xs font-semibold opacity-70 hover:opacity-100"
                title="Decrease font size"
              >
                A-
              </button>
              <span className="text-[11px] font-mono opacity-60 px-1">{fontSize}px</span>
              <button
                onClick={() => setFontSize(s => Math.min(26, s + 2))}
                className="px-2 py-1 rounded-lg text-xs font-semibold opacity-70 hover:opacity-100"
                title="Increase font size"
              >
                A+
              </button>
            </div>

            {onSynthesize && (
              <button
                onClick={() => onSynthesize(document)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lime-500/15 hover:bg-lime-500/25 text-lime-400 border border-lime-500/30 text-xs font-semibold transition-all cursor-pointer"
                title="Synthesize AI Proof & Derivations"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Synthesize</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-rose-500/20 hover:text-rose-400 transition-colors cursor-pointer opacity-70 hover:opacity-100"
              title="Close Reader (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Text Content Area with Click-to-Seek Sentences */}
        <div 
          ref={contentRef}
          className={`flex-1 p-8 sm:p-12 overflow-y-auto font-serif leading-relaxed select-text transition-all ${getContainerBg()}`}
          style={{ fontSize: `${fontSize}px` }}
        >
          <div className="max-w-3xl mx-auto">
            {isTranslating ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-cyan-400">
                <Loader2 className="w-7 h-7 animate-spin" />
                <p className="text-sm font-sans font-semibold">
                  Translating into {currentLangObj.name} with technical essence...
                </p>
                <p className="text-xs text-slate-400 font-sans max-w-sm text-center">
                  Adapting technical idioms, mathematical terms, and natural flow.
                </p>
              </div>
            ) : (
              renderInteractiveContent()
            )}
          </div>
        </div>

        {/* Interactive Audio Player & Footer Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-inherit bg-slate-950/60 backdrop-blur-md">
          {/* Audio Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePlayPause}
              disabled={isTranslating}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs shadow-lg transition-all cursor-pointer ${
                playbackState === 'playing'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-400/40'
                  : 'bg-lime-500 hover:bg-lime-400 text-slate-950 ring-2 ring-lime-400/40'
              }`}
              title={playbackState === 'playing' ? 'Pause reading' : `Listen with ${currentPersonaObj.label} voice`}
            >
              {playbackState === 'playing' ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Listen ({currentPersonaObj.label})</span>
                </>
              )}
            </button>

            {playbackState !== 'idle' && (
              <button
                onClick={handleStopSpeaking}
                className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 transition-colors cursor-pointer"
                title="Stop reading"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            )}

            {startCharOffset > 0 && (
              <button
                onClick={handleResetToStart}
                className="flex items-center gap-1 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                title="Reset reading back to start of page"
              >
                <RotateCcw className="w-3.5 h-3.5 text-lime-400" />
                <span className="text-[10px] hidden sm:inline">From Top</span>
              </button>
            )}

            {/* Playback speed selector */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/40 border border-slate-700/50">
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleRateChange(rate)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors ${
                    speechRate === rate
                      ? 'bg-lime-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Waveform Animation when playing */}
            {playbackState === 'playing' && (
              <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-lime-500/10 text-lime-400">
                <Volume2 className="w-4 h-4 animate-pulse mr-1" />
                <span className="w-1 h-3 bg-lime-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-4 bg-lime-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-2 bg-lime-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[11px] font-medium ml-1.5 hidden md:inline">
                  {currentPersonaObj.icon} Speaking ({isViewingTranslation ? currentLangObj.name : 'EN'})...
                </span>
              </div>
            )}

            {/* Click to Seek Hint */}
            <span className="text-[10px] text-slate-500 hidden xl:inline italic">
              Tip: Click any sentence to read from there
            </span>

            {/* Auto-advance toggle */}
            <button
              onClick={() => setAutoAdvance(!autoAdvance)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors ${
                autoAdvance
                  ? 'bg-lime-500/20 text-lime-300 border border-lime-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Automatically advance to the next page when finished speaking"
            >
              <FastForward className="w-3 h-3" />
              <span className="hidden sm:inline">Auto-advance</span>
            </button>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 0}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold px-2">
              Page {currentPage + 1} of {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages - 1}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
