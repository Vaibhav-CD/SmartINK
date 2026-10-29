import { create } from 'zustand';
import { DocumentItem, TTSState, VoicePersona } from '../types/document';
import { ingestPdfDocument } from '../engine/pdfPipeline';
import { SmartSpeechEngine } from '../engine/speechEngine';
import { translateDocumentText } from '../engine/translationEngine';

interface DocumentStoreState {
  documents: DocumentItem[];
  activeDocumentId: string | null;
  isReaderModalOpen: boolean;
  selectedLanguage: string;
  ttsState: TTSState;
  isTranslating: boolean;

  // Actions
  addDocument: (file: File) => Promise<DocumentItem>;
  openReaderModal: (docId: string, pageNumber?: number) => void;
  closeReaderModal: () => void;
  setPage: (docId: string, pageNumber: number) => void;
  setTheme: (docId: string, theme: 'dark' | 'sepia' | 'light') => void;
  removeDocument: (docId: string) => void;
  updateDocumentPosition: (docId: string, pos: { x: number; y: number; width?: number; height?: number }) => void;

  // Translation
  setSelectedLanguage: (lang: string) => void;
  translateCurrentPage: (docId: string, pageNumber: number, targetLang: string) => Promise<void>;

  // Speech (TTS)
  playTTS: (docId: string, pageNumber: number) => void;
  pauseTTS: () => void;
  resumeTTS: () => void;
  stopTTS: () => void;
  seekSentenceTTS: (sentenceIndex: number) => void;
  setPersona: (persona: VoicePersona) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
}

const speechEngine = new SmartSpeechEngine();

export const useDocumentStore = create<DocumentStoreState>((set, get) => {
  // Wire up speech engine callbacks
  speechEngine.setCallbacks({
    onSentenceChange: (idx) => {
      set((state) => ({
        ttsState: { ...state.ttsState, currentSentenceIndex: idx },
      }));
    },
    onPlayStateChange: (isPlaying, isPaused) => {
      set((state) => ({
        ttsState: { ...state.ttsState, isPlaying, isPaused },
      }));
    },
    onFinished: () => {
      set((state) => ({
        ttsState: { ...state.ttsState, isPlaying: false, isPaused: false, currentSentenceIndex: 0 },
      }));
    },
  });

  return {
    documents: [],
    activeDocumentId: null,
    isReaderModalOpen: false,
    selectedLanguage: 'en',
    isTranslating: false,
    ttsState: {
      isPlaying: false,
      isPaused: false,
      currentDocumentId: null,
      currentPageNumber: 1,
      currentSentenceIndex: 0,
      currentWordIndex: 0,
      persona: 'Studio',
      rate: 1.0,
      pitch: 1.0,
    },

    addDocument: async (file: File) => {
      const doc = await ingestPdfDocument(file, file.name);
      set((state) => ({
        documents: [...state.documents, doc],
        activeDocumentId: doc.id,
      }));
      return doc;
    },

    openReaderModal: (docId, pageNumber = 1) => {
      set((state) => {
        const docs = state.documents.map((d) =>
          d.id === docId ? { ...d, currentPage: pageNumber } : d
        );
        return {
          documents: docs,
          activeDocumentId: docId,
          isReaderModalOpen: true,
        };
      });
    },

    closeReaderModal: () => {
      speechEngine.stop();
      set({ isReaderModalOpen: false });
    },

    setPage: (docId, pageNumber) => {
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === docId ? { ...d, currentPage: pageNumber } : d
        ),
      }));
      // If TTS playing for this doc, reload page sentences
      const { ttsState } = get();
      if (ttsState.currentDocumentId === docId && ttsState.isPlaying) {
        get().playTTS(docId, pageNumber);
      }
    },

    setTheme: (docId, theme) => {
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === docId ? { ...d, theme } : d
        ),
      }));
    },

    removeDocument: (docId) => {
      speechEngine.stop();
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== docId),
        activeDocumentId: state.activeDocumentId === docId ? null : state.activeDocumentId,
        isReaderModalOpen: state.activeDocumentId === docId ? false : state.isReaderModalOpen,
      }));
    },

    updateDocumentPosition: (docId, pos) => {
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === docId
            ? {
                ...d,
                position: {
                  ...d.position,
                  ...pos,
                },
              }
            : d
        ),
      }));
    },

    setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),

    translateCurrentPage: async (docId, pageNumber, targetLang) => {
      const doc = get().documents.find((d) => d.id === docId);
      if (!doc) return;

      const pageIndex = pageNumber - 1;
      const targetPage = doc.pages[pageIndex];
      if (!targetPage) return;

      set({ isTranslating: true });
      try {
        const translated = await translateDocumentText(targetPage.normalizedText, targetLang);
        set((state) => ({
          isTranslating: false,
          documents: state.documents.map((d) => {
            if (d.id !== docId) return d;
            const updatedPages = [...d.pages];
            const pageObj = { ...updatedPages[pageIndex] };
            pageObj.translatedText = {
              ...(pageObj.translatedText || {}),
              [targetLang]: translated,
            };
            updatedPages[pageIndex] = pageObj;
            return { ...d, pages: updatedPages };
          }),
        }));
      } catch (e) {
        console.error('Translation error:', e);
        set({ isTranslating: false });
      }
    },

    // Speech Controls
    playTTS: (docId, pageNumber) => {
      const doc = get().documents.find((d) => d.id === docId);
      if (!doc) return;

      const pageIndex = pageNumber - 1;
      const page = doc.pages[pageIndex];
      if (!page || page.sentences.length === 0) return;

      speechEngine.loadSentences(page.sentences, 0);
      speechEngine.play();

      set({
        ttsState: {
          ...get().ttsState,
          isPlaying: true,
          isPaused: false,
          currentDocumentId: docId,
          currentPageNumber: pageNumber,
          currentSentenceIndex: 0,
        },
      });
    },

    pauseTTS: () => {
      speechEngine.pause();
    },

    resumeTTS: () => {
      speechEngine.play();
    },

    stopTTS: () => {
      speechEngine.stop();
    },

    seekSentenceTTS: (sentenceIndex) => {
      speechEngine.seekToSentence(sentenceIndex);
    },

    setPersona: (persona) => {
      speechEngine.setPersona(persona);
      set((state) => ({
        ttsState: { ...state.ttsState, persona },
      }));
    },

    setRate: (rate) => {
      speechEngine.setRate(rate);
      set((state) => ({
        ttsState: { ...state.ttsState, rate },
      }));
    },

    setPitch: (pitch) => {
      speechEngine.setPitch(pitch);
      set((state) => ({
        ttsState: { ...state.ttsState, pitch },
      }));
    },
  };
});
