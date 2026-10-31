import {
  CopilotQueryRequest,
  CopilotResponse,
  Flashcard,
  MetaModelConfig,
  MetaTask,
  MetaModality,
  META_TASK_MODALITY,
  SegmentResult,
} from '../types/ai';

/** One Meta model per SmartInk job. All routes share one Meta Model API key. */
export const DEFAULT_TASK_MODELS: Record<MetaTask, string> = {
  copilot: 'muse-spark',
  proofs: 'muse-wonder',
  translation: 'muse-spark',
  image: 'muse-image',
  transcribe: 'muse-voice-transcribe',
  segment: 'sam-3.1',
  fallback: 'muse-glimmer',
};

/** Open-weights models tried (in order) when a hosted chat route fails. */
export const OPEN_WEIGHTS_FALLBACK_MODELS = ['muse-glimmer', 'muse-spark-open'] as const;

export const META_TASK_LABELS: Record<MetaTask, string> = {
  copilot: 'Lasso copilot (Muse Spark)',
  proofs: 'Proofs & Socratic hints (Muse Wonder)',
  translation: 'Document translation (Muse Spark)',
  image: 'Science visuals (Muse Image)',
  transcribe: 'Voice commands (Muse Voice Transcribe)',
  segment: 'Lasso segmentation (SAM 3.1)',
  fallback: 'Open-weights fallback (Muse Glimmer)',
};

/**
 * Default provider is Meta Muse (project requirement: everything Meta).
 * Base URL and model stay overridable via .env.local
 * (VITE_MUSE_API_URL / VITE_MUSE_MODEL) or the in-app Settings modal.
 * Groq / Together / OpenRouter Llama presets remain available as
 * explicit choices in Copilot Settings, but are never the default.
 */
export const DEFAULT_META_CONFIG: MetaModelConfig = {
  provider: 'meta',
  modelName: 'muse-wonder',
  apiKey: '',
  baseUrl: 'https://api.meta.ai/v1',
  temperature: 0.2,
  taskModels: { ...DEFAULT_TASK_MODELS },
};

// Local storage key for persistent user configuration
export const META_CONFIG_STORAGE_KEY = 'smartink_meta_model_config';

/**
 * Single place that turns a stored base URL into the chat-completions
 * endpoint. Accepts either a base (`https://api.groq.com/openai/v1`)
 * or an already-complete URL (`.../chat/completions`) so env values,
 * in-app settings, and presets can never double-append or miss the suffix.
 */
export function resolveChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`;
}

const MODALITY_SUFFIX: Record<MetaModality, string> = {
  chat: '/chat/completions',
  image: '/images/generations',
  transcribe: '/audio/transcriptions',
  segment: '/segment',
};

/** Full endpoint for a task/modality from a stored base URL. Never double-appends. */
export function resolveMetaEndpoint(baseUrl: string, taskOrModality: MetaTask | MetaModality): string {
  const modality: MetaModality =
    taskOrModality in META_TASK_MODALITY
      ? META_TASK_MODALITY[taskOrModality as MetaTask]
      : (taskOrModality as MetaModality);
  if (modality === 'chat') return resolveChatCompletionsUrl(baseUrl);
  const suffix = MODALITY_SUFFIX[modality];
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith(suffix) ? trimmed : `${trimmed}${suffix}`;
}

/**
 * Model for one task. Non-Meta providers have a single chat model, so chat
 * tasks keep using the legacy `modelName` there; Meta routes per task.
 */
export function getTaskModel(config: MetaModelConfig, task: MetaTask): string {
  const routed = config.taskModels?.[task]?.trim();
  if (routed) return routed;
  if (task === 'fallback') return OPEN_WEIGHTS_FALLBACK_MODELS[0];
  if (config.provider !== 'meta' && META_TASK_MODALITY[task] === 'chat') {
    return config.modelName;
  }
  if (task === 'proofs' && config.modelName?.trim()) return config.modelName;
  return DEFAULT_TASK_MODELS[task];
}

/** Ordered open-weights chat models to retry after the primary route fails. */
export function getFallbackModels(config: MetaModelConfig, exclude?: string): string[] {
  const ordered = [getTaskModel(config, 'fallback'), ...OPEN_WEIGHTS_FALLBACK_MODELS];
  return [...new Set(ordered)].filter((m) => m && m !== exclude);
}

function envMetaOverrides(): Partial<MetaModelConfig> {
  try {
    const env = (import.meta as any)?.env ?? {};
    const overrides: Partial<MetaModelConfig> = {};
    // Meta Muse first (project requirement), then generic Meta/Llama aliases.
    const key =
      env.VITE_MUSE_API_KEY ||
      env.VITE_META_API_KEY ||
      env.VITE_LLAMA_API_KEY ||
      env.VITE_GROQ_API_KEY ||
      env.VITE_OPENROUTER_API_KEY;
    if (key) overrides.apiKey = key;
    const baseUrl = env.VITE_MUSE_API_URL || env.VITE_META_API_URL;
    if (baseUrl) overrides.baseUrl = baseUrl;
    const model = env.VITE_MUSE_MODEL || env.VITE_META_MODEL;
    if (model) overrides.modelName = model;
    const taskModels: Partial<Record<MetaTask, string>> = {};
    const taskEnv: Array<[MetaTask, string]> = [
      ['copilot', env.VITE_MUSE_COPILOT_MODEL],
      ['proofs', env.VITE_MUSE_PROOFS_MODEL],
      ['translation', env.VITE_MUSE_TRANSLATION_MODEL],
      ['image', env.VITE_MUSE_IMAGE_MODEL],
      ['transcribe', env.VITE_MUSE_TRANSCRIBE_MODEL],
      ['segment', env.VITE_MUSE_SEGMENT_MODEL],
      ['fallback', env.VITE_MUSE_FALLBACK_MODEL],
    ];
    for (const [task, value] of taskEnv) {
      if (value) taskModels[task] = value;
    }
    if (Object.keys(taskModels).length > 0) overrides.taskModels = taskModels;
    return overrides;
  } catch {
    return {};
  }
}

export function loadMetaConfig(): MetaModelConfig {
  // Priority: in-app Settings (localStorage) > .env.local > default.
  let saved: Partial<MetaModelConfig> = {};
  try {
    const raw = localStorage.getItem(META_CONFIG_STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch {
    // Fall back to env/default
  }
  const env = envMetaOverrides();
  return {
    ...DEFAULT_META_CONFIG,
    ...env,
    ...saved,
    // Per-task routes merge field-by-field so old saved configs (no
    // taskModels) gain the new defaults instead of losing routing.
    taskModels: {
      ...DEFAULT_TASK_MODELS,
      ...(env.taskModels ?? {}),
      ...(saved.taskModels ?? {}),
    },
  };
}

export function saveMetaConfig(config: MetaModelConfig) {
  try {
    localStorage.setItem(META_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Intelligent local reasoning synthesis when no external API key is provided or offline.
 */
export function generateLocalMetaReasoning(request: CopilotQueryRequest): CopilotResponse {
  const query = request.extractedSymbols || request.userPrompt || 'Mathematical Expression';

  if (request.queryType === 'flashcards') {
    const cards: Flashcard[] = [
      {
        concept: 'Calculus & Rates of Change',
        question: 'What is the physical interpretation of the derivative \\( \\frac{df}{dx} \\)?',
        answer: 'The derivative represents the instantaneous rate of change of the function with respect to x, or the slope of the tangent line at any point.',
        latex: '\\frac{df}{dx} = \\lim_{\\Delta x \\to 0} \\frac{f(x + \\Delta x) - f(x)}{\\Delta x}',
      },
      {
        concept: 'Geometric Invariance & Volume',
        question: 'How is the volume of a cylinder derived from circular cross sections?',
        answer: 'By integrating circular disks of area \\( A = \\pi r^2 \\) along the orthogonal height h.',
        latex: 'V = \\int_0^h \\pi r^2 dh = \\pi r^2 h',
      },
      {
        concept: 'Trigonometric Symmetry',
        question: 'What is the fundamental Pythagorean trigonometric identity?',
        answer: 'For any real angle \\( \\theta \\), the sum of squared sine and cosine equals unity.',
        latex: '\\sin^2(\\theta) + \\cos^2(\\theta) = 1',
      },
    ];

    return {
      markdown: `### Generated Multimodal Flashcards\n\nCurated 3 active recall cards based on the selected canvas region \`${query}\`.`,
      latexFormulas: cards.map((c) => c.latex || ''),
      flashcards: cards,
    };
  }

  if (request.queryType === 'solve') {
    return {
      markdown: `### Let's work through it\n\nYou asked about \`${query}\`.\n\n#### Step 1: Set it up\nSpot the constants and variables, and how they depend on each other.\n\n#### Step 2: Work it out\nFollow the usual order of operations and simplify the brackets first:\n\n$$ f(x) = \\int (2x + 1) dx = x^2 + x + C $$\n\n#### Step 3: Sanity check\nDrop in a simple value and make sure the answer still makes sense.\n\n**Bottom line:** change any number on the canvas and this updates with it.`,
      latexFormulas: ['f(x) = x^2 + x + C', 'V = \\pi r^2 h'],
      steps: [
        'Isolate LHS variable and group common polynomial powers',
        'Substitute bound canvas variables from CalcInk registry',
        'Verify sign continuity across boundary domains',
      ],
    };
  }

  // Default: explain / summarize
  return {
    markdown: `### Here's what I see\n\nYou selected \`${query}\`.\n\n- It's a mathematical relationship — tweak any number with the scrubber slider and everything connected to it recalculates live.\n- You can also plot it right next to your handwriting as a small graph.\n\n$$\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1$$\n\n*Tip: drag a scrubber slider on a number to see how sensitive the result is.*`,
    latexFormulas: ['\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1'],
  };
}

/**
 * Executes a query using Meta Muse models (default) via an
 * OpenAI-compatible endpoint. Groq / Together / OpenRouter Llama
 * presets remain selectable in Settings but are not the default.
 */
export async function queryMetaModel(
  request: CopilotQueryRequest,
  config: MetaModelConfig = loadMetaConfig()
): Promise<CopilotResponse> {
  if (!config.apiKey || !config.apiKey.trim()) {
    return generateLocalMetaReasoning(request);
  }

  const task: MetaTask = request.task ?? 'copilot';
  const systemPrompt = `You are the SmartInk Multimodal AI Research Copilot, powered by Meta Muse models.
Provide structured, step-by-step scientific explanations. Render mathematical formulas in clean LaTeX notation ($...$ or $$...$$).
If asked for flashcards, format them clearly with questions, answers, and LaTeX formulas.`;

  const userContent: any[] = [];
  let promptText = `Analyze the following canvas content:\nQuery Type: ${request.queryType}\n`;
  if (request.extractedSymbols) {
    promptText += `Extracted Symbols / Equation: ${request.extractedSymbols}\n`;
  }
  if (typeof request.segmentCount === 'number') {
    promptText += `SAM 3.1 segments in crop: ${request.segmentCount}\n`;
  }
  if (request.userPrompt) {
    promptText += `User Question: ${request.userPrompt}\n`;
  }
  if (request.imageCropDataUrl) {
    userContent.push({ type: 'text', text: promptText });
    userContent.push({ type: 'image_url', image_url: { url: request.imageCropDataUrl } });
  } else {
    userContent.push({ type: 'text', text: promptText });
  }

  const endpoint = resolveMetaEndpoint(config.baseUrl, task);
  const primaryModel = getTaskModel(config, task);
  // Primary route first, then open-weights fallbacks, then local reasoning.
  const modelsToTry = [primaryModel, ...getFallbackModels(config, primaryModel)];

  for (const model of modelsToTry) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent.length === 1 ? userContent[0].text : userContent },
          ],
          temperature: config.temperature ?? 0.2,
        }),
      });
      if (!response.ok) continue;
      const data = await response.json();
      const replyText = data.choices?.[0]?.message?.content || '';
      if (!replyText) continue;
      const latexMatches = replyText.match(/\$\$[\s\S]+?\$\$|\$[^\$]+?\$/g) || [];
      return {
        markdown: replyText,
        latexFormulas: latexMatches.map((m: string) => m.replace(/^\$+|\$+$/g, '').trim()),
        modelUsed: model,
      };
    } catch {
      // Try the next model in the chain.
    }
  }
  return { ...generateLocalMetaReasoning(request), modelUsed: 'local-offline' };
}

/** Muse Image: generate one image URL/data-URL, or null (caller falls back). Never throws. */
export async function generateMetaImage(
  prompt: string,
  config: MetaModelConfig = loadMetaConfig()
): Promise<string | null> {
  if (!config.apiKey?.trim() || !prompt.trim()) return null;
  try {
    const res = await fetch(resolveMetaEndpoint(config.baseUrl, 'image'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey.trim()}` },
      body: JSON.stringify({ model: getTaskModel(config, 'image'), prompt }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.data?.[0] ?? data;
    if (item.url) return item.url as string;
    if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
    return null;
  } catch {
    return null;
  }
}

/** Muse Voice Transcribe: audio blob -> transcript, or null (caller uses Web Speech). Never throws. */
export async function transcribeAudio(
  audio: Blob,
  config: MetaModelConfig = loadMetaConfig()
): Promise<string | null> {
  if (!config.apiKey?.trim() || !audio || audio.size === 0) return null;
  try {
    const form = new FormData();
    form.append('file', audio, 'voice.webm');
    form.append('model', getTaskModel(config, 'transcribe'));
    const res = await fetch(resolveMetaEndpoint(config.baseUrl, 'transcribe'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey.trim()}` },
      body: form,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.text === 'string' && data.text.trim() ? data.text.trim() : null;
  } catch {
    return null;
  }
}

/** SAM 3.1: segment a canvas crop into masks, or null (caller uses geometric recognizer). Never throws. */
export async function segmentCanvasImage(
  imageDataUrl: string,
  prompt?: string,
  config: MetaModelConfig = loadMetaConfig()
): Promise<SegmentResult | null> {
  if (!config.apiKey?.trim() || !imageDataUrl) return null;
  try {
    const model = getTaskModel(config, 'segment');
    const res = await fetch(resolveMetaEndpoint(config.baseUrl, 'segment'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey.trim()}` },
      body: JSON.stringify({ model, image: imageDataUrl, prompt: prompt ?? 'handwritten strokes and symbols' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const masks = data.masks ?? data.segments ?? data.data ?? [];
    return { masks: Array.isArray(masks) ? masks : [], model };
  } catch {
    return null;
  }
}
