import { solveWithSteps } from '../calcInk/solutionSteps';
import { MathParser } from '../calcInk/mathParser';
import { MetaAIService } from '../metaAI';

export interface ConversationContext {
  equationText?: string;
  solutionDisplay?: string;
  transcription?: string;
}

export type AgentReplyKind = 'steps' | 'transcription' | 'plot' | 'answer' | 'help';

export interface AgentReply {
  kind: AgentReplyKind;
  title: string;
  /** Markdown-lite body; math lives in $...$ spans for KaTeX rendering. */
  body: string;
  spoken: string;
  /** Present when kind === 'plot'. */
  functionBody?: string;
}

export type CloudAsk = (prompt: string) => Promise<{
  title: string;
  answer: string;
  spokenSummary: string;
} | null>;

async function defaultCloudAsk(prompt: string): Promise<{
  title: string;
  answer: string;
  spokenSummary: string;
} | null> {
  try {
    const result = await MetaAIService.getInstance().answerGeneralQuestion(prompt);
    return result ?? null;
  } catch {
    return null;
  }
}

const SPOKEN_NUMBER_WORDS: Array<[RegExp, string]> = [
  [/\bzero\b/gi, '0'],
  [/\bone\b/gi, '1'],
  [/\btwo\b/gi, '2'],
  [/\bthree\b/gi, '3'],
  [/\bfour\b/gi, '4'],
  [/\bfive\b/gi, '5'],
  [/\bsix\b/gi, '6'],
  [/\bseven\b/gi, '7'],
  [/\beight\b/gi, '8'],
  [/\bnine\b/gi, '9'],
  [/\bten\b/gi, '10'],
  [/\beleven\b/gi, '11'],
  [/\btwelve\b/gi, '12'],
  [/\bthirteen\b/gi, '13'],
  [/\bfourteen\b/gi, '14'],
  [/\bfifteen\b/gi, '15'],
  [/\bsixteen\b/gi, '16'],
  [/\bseventeen\b/gi, '17'],
  [/\beighteen\b/gi, '18'],
  [/\bnineteen\b/gi, '19'],
  [/\btwenty\b/gi, '20'],
];

const SPOKEN_OPERATORS: Array<[RegExp, string]> = [
  [/\bmultiplied by\b/gi, '*'],
  [/\bdivided by\b/gi, '/'],
  [/\bto the power of\b/gi, '^'],
  [/\bto the power\b/gi, '^'],
  [/\bequal to\b/gi, '='],
  [/\bsquared\b/gi, '^2'],
  [/\bcubed\b/gi, '^3'],
  [/\bplus\b/gi, '+'],
  [/\bminus\b/gi, '-'],
  [/\btimes\b/gi, '*'],
  [/\bover\b/gi, '/'],
  [/\bequals\b/gi, '='],
  [/\bpoint\b/gi, '.'],
  [/\bpercent\b/gi, '%'],
  [/\bnegative\s+(?=\d)/gi, '-'],
];

/**
 * Normalizes spoken math ("two x plus four equals ten") into symbolic form
 * ("2 x + 4 = 10") so voice input reaches the same solvers as typed text.
 * Digit strings pass through untouched.
 */
export function normalizeSpokenMath(message: string): string {
  let out = message;
  for (const [pattern, replacement] of [
    ...SPOKEN_NUMBER_WORDS,
    ...SPOKEN_OPERATORS,
  ]) {
    out = out.replace(pattern, replacement);
  }
  // Spoken multiplication "2 x 3" (spaces both sides) is never the variable.
  out = out.replace(/(\d)\s+x\s+(\d)/g, '$1*$2');
  return out;
}

const MATH_FUNCTION_NAMES = 'sin|cos|tan|sqrt|log|ln|abs|exp|pi';

function trailingMathRun(raw: string): string {
  const run = (raw.match(/[0-9a-zA-Z+\-*/^().×÷%\s]+$/) || [''])[0].trim();
  return run
    .replace(
      new RegExp(
        `^(?:(?!\\b(?:${MATH_FUNCTION_NAMES})\\b)[a-zA-Z]{2,}\\b\\s*)+`,
        'i'
      ),
      ''
    )
    .trim();
}

function leadingMathRun(raw: string): string {
  const run = (raw.match(/^[0-9a-zA-Z+\-*/^().×÷%\s]+/) || [''])[0];
  const cut = run.search(
    new RegExp(`\\b(?!(?:${MATH_FUNCTION_NAMES})\\b)[a-zA-Z]{2,}`, 'i')
  );
  return (cut >= 0 ? run.slice(0, cut) : run).trim();
}

/**
 * Pulls a solvable expression out of a chat message ("solve 2x+4=10 please"
 * -> "2x+4=10"). Spoken word-numbers reach the same path ("two plus two"
 * -> "2 + 2"). Returns null when nothing math-shaped is present.
 */
export function extractExpression(message: string): string | null {
  const cleaned = normalizeSpokenMath(message)
    .replace(/^(please\s+)?(solve|evaluate|compute|explain|show\s+steps\s+for|what\s+is|find)\s+/i, '')
    .replace(/[?.!]+$/, '')
    .trim();
  if (!/[0-9]/.test(cleaned)) return null;
  // 1. Equation with '=': math-shaped runs around it, tolerating spaces
  // ("x^2 - 16 = 0", "2x + 4 = 10 please").
  const eqIndex = cleaned.indexOf('=');
  if (eqIndex >= 0) {
    const left = trailingMathRun(cleaned.slice(0, eqIndex));
    const right = leadingMathRun(cleaned.slice(eqIndex + 1));
    if (left && right) return `${left}=${right}`;
  }
  // 2. Whole message is math (allows spaced arithmetic like "2x + 4").
  if (
    /^[0-9a-zA-Z+\-*/^().\s=%×÷]+$/.test(cleaned) &&
    /[+\-*/^%]/.test(cleaned)
  ) {
    return cleaned;
  }
  // 3. First tight math run carrying a digit and an operator.
  const runs = cleaned.match(/[0-9a-zA-Z+\-*/^().×÷%]+/g) || [];
  for (const run of runs) {
    if (/[0-9]/.test(run) && /[+\-*/^%]/.test(run)) return run;
  }
  return null;
}

function extractPlotBody(message: string): string | null {
  const match = message.match(
    /(?:plot|graph)\s+([a-z0-9x+\-*/^().\s]+?)(?:\s+please)?[?.!]*$/i
  );
  if (!match) return null;
  const body = match[1].trim().replace(/^y\s*=\s*/i, '').replace(/^f\(x\)\s*=\s*/i, '');
  if (!body || !/x/i.test(body)) return null;
  try {
    const probe = MathParser.evaluate(body, { x: 0 });
    if (!probe.success || probe.value === null || !isFinite(probe.value)) {
      return null;
    }
  } catch {
    return null;
  }
  return body;
}

function spokenResult(result: string): string {
  return result
    .replace(/±/g, 'plus or minus ')
    .replace(/∉ ℝ\s*\(No real roots\)/g, 'has no real roots')
    .replace(/=/g, ' equals ');
}

/**
 * Direct engine solution for inputs beyond stepped solving: quadratics,
 * general single-variable equations, assignments, and function calls.
 * Returns null when the engine cannot solve the candidate.
 */
function solveDirect(candidate: string): AgentReply | null {
  let verdict;
  try {
    verdict = MathParser.evaluate(candidate);
  } catch {
    return null;
  }
  if (!verdict.success) return null;
  if (verdict.isUndefined) {
    return {
      kind: 'steps',
      title: `Evaluating $${candidate}$`,
      body: `**Answer:** $Undefined$`,
      spoken: 'That is undefined. Division by zero has no value.',
    };
  }
  if (verdict.value === null && !verdict.isEquationSolution) return null;
  return {
    kind: 'steps',
    title: verdict.isEquationSolution
      ? `Solving $${candidate}$`
      : `Evaluating $${candidate}$`,
    body: `$${candidate}$\n\n**Answer:** $${verdict.display}$`,
    spoken: `Answer: ${spokenResult(verdict.display)}.`,
  };
}

/**
 * Single entry point for conversation mode. Deterministic offline skills
 * (steps, transcription, plot detection) run first; anything else goes to
 * the configured Meta provider, whose own offline knowledge bank answers
 * when no API key is set. Never throws.
 */
export async function askAgent(
  message: string,
  ctx: ConversationContext,
  cloudAsk: CloudAsk = defaultCloudAsk
): Promise<AgentReply> {
  const text = message.trim();
  const lower = text.toLowerCase();

  // 1. Read-back of handwritten text.
  if (/what did i write|read (this|my|the|it)|transcrib|read aloud/.test(lower)) {
    if (ctx.transcription) {
      return {
        kind: 'transcription',
        title: 'What you wrote',
        body: ctx.transcription,
        spoken: `You wrote: ${ctx.transcription}`,
      };
    }
    return {
      kind: 'help',
      title: 'Nothing selected',
      body: 'Drag-select some handwriting first, then ask me to read it.',
      spoken: 'Drag-select some handwriting first, then ask me to read it.',
    };
  }

  // 2. Math solving with steps: expression in the message wins, otherwise the
  // latest canvas equation when the message asks about it.
  const bareExpression =
    /^[0-9a-zA-Z+\-*/^().\s=×÷?]+$/.test(lower) &&
    /[0-9]/.test(lower) &&
    /[+\-*/^=]/.test(lower);
  const wantsMath =
    /solve|evaluat|comput|explain|why|step|prove|show|work/.test(lower) ||
    bareExpression;
  const candidate = extractExpression(text) ?? (wantsMath ? ctx.equationText : undefined);
  if (candidate) {
    const stepped = solveWithSteps(candidate);
    if (stepped) {
      const lines = stepped.steps.map((s, i) => `${i + 1}. $${s.expression}$`);
      return {
        kind: 'steps',
        title:
          stepped.kind === 'linear'
            ? `Solving $${candidate}$`
            : `Evaluating $${candidate}$`,
        body: `${lines.join('\n')}\n\n**Answer:** $${stepped.result}$`,
        spoken: `${stepped.steps.map((s) => s.spoken).join('. ')}. Answer: ${spokenResult(stepped.result)}.`,
      };
    }
    const direct = solveDirect(candidate);
    if (direct) return direct;
  }

  // 3. Plot requests surface a one-tap Plot action in the panel.
  const plotBody = extractPlotBody(text);
  if (plotBody) {
    return {
      kind: 'plot',
      title: `Plot $${plotBody}$`,
      body: `I can draw $y = ${plotBody}$ on your canvas. Tap Plot to add it next to your work.`,
      spoken: `I can plot ${plotBody} on your canvas.`,
      functionBody: plotBody,
    };
  }

  // 4. Open discussion via provider (or its offline knowledge bank).
  const contextLines: string[] = [];
  if (ctx.equationText) {
    contextLines.push(
      `- Latest canvas equation: ${ctx.equationText}${ctx.solutionDisplay ? ` = ${ctx.solutionDisplay}` : ''}`
    );
  }
  if (ctx.transcription) {
    contextLines.push(`- Selected handwriting reads: "${ctx.transcription}"`);
  }
  const prompt =
    contextLines.length > 0
      ? `Canvas context:\n${contextLines.join('\n')}\n\nStudent question: ${text}\n\nAnswer concisely for a student. Put math in $...$ spans.`
      : text;
  try {
    const cloud = await cloudAsk(prompt);
    if (cloud) {
      return {
        kind: 'answer',
        title: cloud.title,
        body: cloud.answer,
        spoken: cloud.spokenSummary,
      };
    }
  } catch {
    // Fall through to help.
  }

  return {
    kind: 'help',
    title: 'How I can help',
    body: 'Ask me to **solve** or **explain** an equation, **read** selected handwriting, or **plot** a function like `plot sin(x)`. For open discussion, add a Meta provider API key in settings.',
    spoken:
      'Ask me to solve or explain an equation, read selected handwriting, or plot a function.',
  };
}
