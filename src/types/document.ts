export interface DocumentPage {
  pageNumber: number;
  rawText: string;
  normalizedText: string;
  sentences: string[];
  translatedText?: Record<string, string>; // languageCode -> translated string
}

export interface DocumentMetadata {
  id: string;
  title: string;
  author: string;
  pageCount: number;
  previewAbstract: string;
  fileSize: number;
  uploadedAt: number;
  fileName: string;
}

export interface DocumentItem {
  id: string;
  metadata: DocumentMetadata;
  pages: DocumentPage[];
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  currentPage: number;
  isMinimized: boolean;
  theme: 'dark' | 'sepia' | 'light';
}

export type VoicePersona = 'Male' | 'Female' | 'Child' | 'Studio' | 'Deep';

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentDocumentId: string | null;
  currentPageNumber: number;
  currentSentenceIndex: number;
  currentWordIndex: number;
  persona: VoicePersona;
  rate: number;
  pitch: number;
  selectedVoiceURI?: string;
}
