/** Per-task routing: each SmartInk job gets its own Meta model. */
export type MetaTask =
  | 'copilot'
  | 'proofs'
  | 'translation'
  | 'image'
  | 'transcribe'
  | 'segment'
  | 'fallback';

export type MetaModality = 'chat' | 'image' | 'transcribe' | 'segment';

export const META_TASK_MODALITY: Record<MetaTask, MetaModality> = {
  copilot: 'chat',
  proofs: 'chat',
  translation: 'chat',
  image: 'image',
  transcribe: 'transcribe',
  segment: 'segment',
  fallback: 'chat',
};

export interface MetaModelConfig {
  provider: 'meta' | 'openrouter' | 'together' | 'groq' | 'custom';
  /** Legacy single-model field. Kept for back-compat: it is the proofs model when provider is non-Meta, otherwise the saved default. */
  modelName: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  /** Per-task model overrides. Missing entries fall back to DEFAULT_TASK_MODELS. */
  taskModels?: Partial<Record<MetaTask, string>>;
}

export interface CopilotQueryRequest {
  imageCropDataUrl?: string;
  extractedSymbols?: string;
  queryType: 'explain' | 'solve' | 'flashcards' | 'summarize';
  userPrompt?: string;
  /** Router task for this call. Defaults to 'copilot'. */
  task?: MetaTask;
  /** Number of SAM 3.1 masks found in the crop, when segmentation ran. */
  segmentCount?: number;
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
  /** Model that actually produced this response (after any fallback). */
  modelUsed?: string;
}

export interface SegmentResult {
  masks: unknown[];
  model: string;
}
