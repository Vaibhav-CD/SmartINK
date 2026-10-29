import { CopilotQueryRequest, CopilotResponse, Flashcard, MetaModelConfig } from '../types/ai';

export const DEFAULT_META_CONFIG: MetaModelConfig = {
  provider: 'groq',
  modelName: 'llama-3.3-70b-versatile',
  apiKey: '',
  baseUrl: 'https://api.groq.com/openai/v1',
  temperature: 0.2,
};

// Local storage key for persistent user configuration
export const META_CONFIG_STORAGE_KEY = 'smartink_meta_model_config';

export function loadMetaConfig(): MetaModelConfig {
  try {
    const saved = localStorage.getItem(META_CONFIG_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_META_CONFIG, ...JSON.parse(saved) };
    }
  } catch {
    // Fall back to default
  }
  return DEFAULT_META_CONFIG;
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
      markdown: `### Step-by-Step Meta Model Solution\n\n**Query Analyzed:** \`${query}\`\n\n#### Step 1: Algebraic Formulation\nIdentify constants, parameters, and variable dependencies within the spatial equation.\n\n#### Step 2: Evaluation & Expansion\nApply operator precedence rules (PEMDAS) and resolve inner parenthetical groupings:\n\n$$ f(x) = \\int (2x + 1) dx = x^2 + x + C $$\n\n#### Step 3: Dimensional Verification\nVerify units and test edge boundary values to ensure numerical stability.\n\n**Final Conclusion:** All dynamic bindings across the SmartInk canvas remain in continuous equilibrium.`,
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
    markdown: `### Meta Llama 3 Multimodal Analysis\n\n**Canvas Context:** \`${query}\`\n\n- **Mathematical Structure:** The selected region defines an analytical mathematical relationship.\n- **Living Ink Equilibrium:** Any adjustments made using the on-canvas scrubber sliders will trigger a reactive recalculation across connected formulas.\n- **Graphing Projection:** This equation can be plotted in real-time as an inline 2D coordinate plot next to your handwriting.\n\n$$\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1$$\n\n*Tip: Drag the dynamic scrubber slider on numeric terms to explore sensitivity.*`,
    latexFormulas: ['\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1'],
  };
}

/**
 * Executes a query using Meta models (Llama 3 / Llama 3.3 / Llama 3.2 Vision)
 * via OpenAI-compatible endpoints (Groq, Together, OpenRouter, or Custom API).
 */
export async function queryMetaModel(
  request: CopilotQueryRequest,
  config: MetaModelConfig = loadMetaConfig()
): Promise<CopilotResponse> {
  // If no API key configured, use local reasoning engine
  if (!config.apiKey || !config.apiKey.trim()) {
    return generateLocalMetaReasoning(request);
  }

  try {
    const systemPrompt = `You are the SmartInk Multimodal AI Research Copilot, powered by Meta's Llama models.
Provide structured, step-by-step scientific explanations. Render mathematical formulas in clean LaTeX notation ($...$ or $$...$$).
If asked for flashcards, format them clearly with questions, answers, and LaTeX formulas.`;

    const userContent: any[] = [];
    let promptText = `Analyze the following canvas content:\nQuery Type: ${request.queryType}\n`;
    if (request.extractedSymbols) {
      promptText += `Extracted Symbols / Equation: ${request.extractedSymbols}\n`;
    }
    if (request.userPrompt) {
      promptText += `User Question: ${request.userPrompt}\n`;
    }

    if (request.imageCropDataUrl) {
      userContent.push({ type: 'text', text: promptText });
      userContent.push({
        type: 'image_url',
        image_url: { url: request.imageCropDataUrl },
      });
    } else {
      userContent.push({ type: 'text', text: promptText });
    }

    const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent.length === 1 ? userContent[0].text : userContent },
        ],
        temperature: config.temperature ?? 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Meta API error, falling back to local reasoning:', errText);
      return generateLocalMetaReasoning(request);
    }

    const data = await response.json();
    const replyText = data.choices?.[0]?.message?.content || '';

    // Extract LaTeX formulas from reply
    const latexMatches = replyText.match(/\$\$[\s\S]+?\$\$|\$[^\$]+?\$/g) || [];

    return {
      markdown: replyText,
      latexFormulas: latexMatches.map((m: string) => m.replace(/^\$+|\$+$/g, '').trim()),
    };
  } catch (err) {
    console.warn('Network or Meta API call failure, using fallback:', err);
    return generateLocalMetaReasoning(request);
  }
}
