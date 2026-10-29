export interface MetaModelConfig {
  provider: 'meta' | 'openrouter' | 'together' | 'groq' | 'custom';
  modelName: string; // e.g. "llama-3.3-70b-instruct" or "llama-3-8b-instruct"
  apiKey: string;
  baseUrl: string;
  temperature: number;
}

export interface CopilotQueryRequest {
  imageCropDataUrl?: string;
  extractedSymbols?: string;
  queryType: 'explain' | 'solve' | 'flashcards' | 'summarize';
  userPrompt?: string;
}

export interface Flashcard {
  question: string;
  answer: string;
  latex?: string;
  concept: string;
}

export interface CopilotResponse {
  markdown: string;
  latexFormulas: string[];
  steps?: string[];
  flashcards?: Flashcard[];
}
