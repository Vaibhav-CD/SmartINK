import React, { useState, useEffect } from 'react';
import type { DocumentItem } from '../types';
import { 
  FileText, 
  Move, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Volume2, 
  Play, 
  Pause, 
  Square, 
  Maximize2,
  FileCheck2,
  Languages,
  Loader2,
  Check,
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
import { PdfReaderModal } from './PdfReaderModal';

interface DocumentCardProps {
  item: DocumentItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
  onStartDrag: (e: React.MouseEvent, id: string) => void;
  onSynthesize: (doc: DocumentItem) => void;
  onUpdate?: (doc: DocumentItem) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  item,
  isSelected,
  onSelect,
  onDelete,
  onStartDrag,
  onSynthesize,
  onUpdate,
}) => {
  const [currentPage, setCurrentPage] = useState(item.currentPage || 0);
  const [isReaderModalOpen, setIsReaderModalOpen] = useState(false);
  const [playbackState, setPlaybackState] = useState<TtsPlaybackState>('idle');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [activeCharIndex, setActiveCharIndex] = useState<number | null>(null);
  const [startCharOffset, setStartCharOffset] = useState<number>(0);

  // Voice Persona Profile (Female, Male, Child, Scholar, Robot)
  const [selectedPersona, setSelectedPersona] = useState<TtsPersonaId>('female');
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState<boolean>(false);

  // Translation state
  const [selectedLanguage, setSelectedLanguage] = useState<string>(item.selectedLanguage || 'en');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translations, setTranslations] = useState<Record<string, Record<number, string>>>(() => {
    const initial: Record<string, Record<number, string>> = {};
    if (item.translations) {
      Object.entries(item.translations).forEach(([lang, pList]) => {
        initial[lang] = {};
        pList.forEach((text, idx) => {
          initial[lang][idx] = text;
        });
      });
    }
    return initial;
  });
  const [isLangMenuOpen, setIsLangMenuOpen] = useState<boolean>(false);

  const totalPages = Math.max(1, item.pages?.length || 1);
  const rawPageText = item.pages?.[currentPage] || item.abstract || '';
  const cleanOriginalText = PdfService.cleanAndDehyphenateText(rawPageText);

  // Active translation
  const translatedPageText = translations[selectedLanguage]?.[currentPage];
  const isViewingTranslation = selectedLanguage !== 'en' && !!translatedPageText;
  const activeDisplayText = isViewingTranslation ? translatedPageText : cleanOriginalText;

  // Split into clickable sentence segments
  const sentenceSegments: SentenceSegment[] = TtsService.splitIntoSentences(activeDisplayText);
  const activeGlobalIndex = activeCharIndex !== null ? startCharOffset + activeCharIndex : null;

  const isPdf = item.type === 'pdf' || !!item.fileName;

  // Track TTS state
  useEffect(() => {
    const unsub = TtsService.subscribeState((st) => {
      setPlaybackState(st);
    });
    return () => {
      unsub();
    };
  }, []);

  const handleSelectLanguage = async (e: React.MouseEvent, lang: SupportedLanguage) => {
    e.stopPropagation();
    setSelectedLanguage(lang.code);
    setIsLangMenuOpen(false);
    setStartCharOffset(0);

    if (playbackState === 'playing') {
      TtsService.stop();
      setActiveCharIndex(null);
    }

    if (lang.code !== 'en' && !translations[lang.code]?.[currentPage]) {
      setIsTranslating(true);
      try {
        const translated = await TranslationService.translateText(cleanOriginalText, lang.code, 'en');
        setTranslations((prev) => ({
          ...prev,
          [lang.code]: {
            ...(prev[lang.code] || {}),
            [currentPage]: translated,
          },
        }));
      } catch (err) {
        console.error('Translation error on card:', err);
      } finally {
        setIsTranslating(false);
      }
    }
  };

  /**
   * Starts speaking from an arbitrary sentence/char offset (Click-to-Seek)
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
      onBoundary: (idx) => {
        setActiveCharIndex(idx);
      },
      onEnd: () => {
        setActiveCharIndex(null);
        setStartCharOffset(0);
        if (currentPage < totalPages - 1) {
          setCurrentPage(p => p + 1);
        }
      },
      onError: () => {
        setActiveCharIndex(null);
      },
    });
  };

  const handleToggleTts = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playbackState === 'playing') {
      TtsService.pause();
    } else if (playbackState === 'paused') {
      TtsService.resume();
    } else {
      handleSeekAndPlay(startCharOffset);
    }
  };

  const handleStopTts = (e: React.MouseEvent) => {
    e.stopPropagation();
    TtsService.stop();
    setActiveCharIndex(null);
  };

  const handleResetToStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    TtsService.stop();
    setActiveCharIndex(null);
    setStartCharOffset(0);
  };

  const handleCycleRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rates = [1.0, 1.25, 1.5, 2.0];
    const nextIdx = (rates.indexOf(speechRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setSpeechRate(nextRate);
    if (playbackState === 'playing') {
      const currentGlobal = activeGlobalIndex || startCharOffset;
      handleSeekAndPlay(currentGlobal);
    }
  };

  const handleSelectPersona = (e: React.MouseEvent, personaId: TtsPersonaId) => {
    e.stopPropagation();
    setSelectedPersona(personaId);
    setIsPersonaMenuOpen(false);
    if (playbackState === 'playing') {
      const currentGlobal = activeGlobalIndex || startCharOffset;
      handleSeekAndPlay(currentGlobal);
    }
  };

  const currentLangObj = TranslationService.getLanguageByCode(selectedLanguage);
  const currentPersonaObj = TTS_PERSONAS[selectedPersona] || TTS_PERSONAS.female;

  return (
    <>
      <div
        style={{
          transform: `translate(${item.position.x}px, ${item.position.y}px)`,
          width: `${item.size.width}px`,
        }}
        className={`absolute select-none rounded-3xl p-5 shadow-lg transition-all duration-200 cursor-default border ${
          isSelected
            ? 'border-lime-500 ring-2 ring-lime-500/20 shadow-xl'
            : isPdf 
              ? 'border-emerald-500/30 hover:border-emerald-500/60'
              : 'border-violet-500/30 hover:border-violet-500/60'
        } bg-white/95 dark:bg-slate-950/90 text-slate-900 dark:text-slate-100 backdrop-blur-xl`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {/* Drag handle & header */}
        <div 
          className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80 cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => onStartDrag(e, item.id)}
        >
          <div className="flex items-center gap-1.5 truncate">
            {isPdf ? (
              <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
            )}
            <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${
              isPdf ? 'text-emerald-600 dark:text-emerald-300' : 'text-violet-600 dark:text-violet-300'
            }`}>
              {isPdf ? 'PDF Document' : 'Research Paper'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono shrink-0">
              p. {currentPage + 1}/{totalPages}
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            {/* Translate Button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLangMenuOpen(!isLangMenuOpen);
                  setIsPersonaMenuOpen(false);
                }}
                className={`p-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-semibold ${
                  selectedLanguage !== 'en'
                    ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300'
                }`}
                title="Translate page into other languages"
              >
                <Languages className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                {selectedLanguage !== 'en' && <span>{currentLangObj.flag}</span>}
              </button>

              {/* Language Dropdown Menu */}
              {isLangMenuOpen && (
                <div 
                  className="absolute right-0 top-full mt-1.5 w-48 py-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    Translate Essence
                  </div>
                  <div className="max-h-52 overflow-y-auto py-0.5">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={(e) => handleSelectLanguage(e, lang)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                          selectedLanguage === lang.code ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{lang.flag}</span>
                          <span>{lang.nativeName}</span>
                        </span>
                        {selectedLanguage === lang.code && <Check className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Open Full Reader Mode */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsReaderModalOpen(true);
              }}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-lime-300 transition-colors cursor-pointer"
              title="Expand Distraction-Free Reader Mode"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <Move className="w-3.5 h-3.5 opacity-60" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (playbackState !== 'idle') TtsService.stop();
                onDelete(item.id);
              }}
              className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-rose-500/10 hover:text-rose-500 text-xs text-slate-400 transition-colors cursor-pointer"
              title="Delete Document"
            >
              ×
            </button>
          </div>
        </div>

        {/* Paper / PDF Metadata */}
        <div className="mt-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
            {item.title}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic truncate">
            {item.authors} {item.totalWords ? `• ${item.totalWords} words` : ''}
          </p>
        </div>

        {/* On-Card Text-to-Speech Player Bar */}
        <div className="mt-3 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleTts}
              disabled={isTranslating}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold ${
                playbackState === 'playing'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white dark:bg-lime-500 dark:hover:bg-lime-400 dark:text-slate-950 shadow-sm'
              }`}
              title={playbackState === 'playing' ? 'Pause Speech' : `Listen with ${currentPersonaObj.label} voice`}
            >
              {playbackState === 'playing' ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span className="text-[10px]">
                {playbackState === 'playing' ? 'Pause' : 'Listen'}
              </span>
            </button>

            {playbackState !== 'idle' && (
              <button
                onClick={handleStopTts}
                className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Stop Speech"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            )}

            {startCharOffset > 0 && (
              <button
                onClick={handleResetToStart}
                className="p-1 rounded-md text-slate-400 hover:text-emerald-600 dark:hover:text-lime-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Reset reading back to start"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}

            {/* Voice Persona Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPersonaMenuOpen(!isPersonaMenuOpen);
                  setIsLangMenuOpen(false);
                }}
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-lime-300 transition-colors cursor-pointer flex items-center gap-1"
                title="Change Voice (Female, Male, Child, Scholar, SmartInk AI)"
              >
                <span>{currentPersonaObj.icon}</span>
                <span className="hidden sm:inline">{currentPersonaObj.label}</span>
              </button>

              {isPersonaMenuOpen && (
                <div 
                  className="absolute left-0 bottom-full mb-1.5 w-44 py-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    Voice Persona
                  </div>
                  <div className="py-0.5">
                    {(Object.keys(TTS_PERSONAS) as TtsPersonaId[]).map((pId) => {
                      const p = TTS_PERSONAS[pId];
                      return (
                        <button
                          key={pId}
                          onClick={(e) => handleSelectPersona(e, pId)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                            selectedPersona === pId ? 'bg-emerald-500/10 text-emerald-600 dark:text-lime-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>{p.icon}</span>
                            <span>{p.label}</span>
                          </span>
                          {selectedPersona === pId && <Check className="w-3 h-3 text-emerald-600 dark:text-lime-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleCycleRate}
              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent text-emerald-600 dark:text-lime-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Cycle TTS playback speed"
            >
              {speechRate}x
            </button>
          </div>

          {playbackState === 'playing' && (
            <div className="flex items-center gap-1 text-emerald-600 dark:text-lime-400 animate-pulse">
              <Volume2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium hidden sm:inline">
                {currentPersonaObj.icon} {isViewingTranslation ? currentLangObj.name : 'EN'}
              </span>
            </div>
          )}
        </div>

        {/* Paper Body / Page Content with Interactive Click-to-Seek Sentences */}
        <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-serif max-h-44 overflow-y-auto select-text shadow-inner">
          {isTranslating ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-cyan-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-sans">Translating into {currentLangObj.name}...</span>
            </div>
          ) : (
            <div className="space-y-1">
              {sentenceSegments.map((seg, sIdx) => {
                const isSpeakingThis =
                  playbackState === 'playing' &&
                  activeGlobalIndex !== null &&
                  activeGlobalIndex >= seg.startIndex &&
                  activeGlobalIndex < seg.endIndex;

                return (
                  <span
                    key={sIdx}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSeekAndPlay(seg.startIndex);
                    }}
                    className={`cursor-pointer rounded px-1 py-0.5 transition-colors inline ${
                      isSpeakingThis
                        ? 'bg-lime-400/35 text-lime-200 ring-1 ring-lime-400/50 shadow-sm'
                        : 'hover:bg-lime-400/15 hover:text-lime-300'
                    }`}
                    title="Click to read from this sentence"
                  >
                    {seg.text}{' '}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Page Navigation & Actions */}
        <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 0}
              onClick={(e) => {
                e.stopPropagation();
                if (playbackState === 'playing') TtsService.stop();
                setStartCharOffset(0);
                const nextP = Math.max(0, currentPage - 1);
                setCurrentPage(nextP);
                if (onUpdate) onUpdate({ ...item, currentPage: nextP });
              }}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages - 1}
              onClick={(e) => {
                e.stopPropagation();
                if (playbackState === 'playing') TtsService.stop();
                setStartCharOffset(0);
                const nextP = Math.min(totalPages - 1, currentPage + 1);
                setCurrentPage(nextP);
                if (onUpdate) onUpdate({ ...item, currentPage: nextP });
              }}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSynthesize(item);
            }}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500/10 dark:bg-lime-500/10 hover:bg-emerald-500/20 dark:hover:bg-lime-500/20 text-emerald-600 dark:text-lime-300 border border-emerald-500/20 dark:border-lime-500/20 text-xs font-semibold transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-lime-400" />
            <span>Synthesize</span>
          </button>
        </div>
      </div>

      {/* Full Distraction-Free Reader Modal */}
      {isReaderModalOpen && (
        <PdfReaderModal
          document={{ ...item, currentPage, selectedLanguage }}
          isOpen={isReaderModalOpen}
          onClose={() => setIsReaderModalOpen(false)}
          onSynthesize={onSynthesize}
          onUpdateDocument={onUpdate}
        />
      )}
    </>
  );
};

