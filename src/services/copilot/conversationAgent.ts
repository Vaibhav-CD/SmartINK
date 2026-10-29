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

/**
 * Pulls a solvable expression out of a chat message ("solve 2x+4=10 please"
 * -> "2x+4=10"). Returns null when nothing math-shaped is present.
 */
export function extractExpression(message: string): string | null {
  const cleaned = message
    .replace(/^(please\s+)?(solve|evaluate|compute|explain|show\s+steps\s+for|what\s+is|find)\s+/i, '')
    .replace(/[?.!]+$/, '')
    .trim();
  if (!/[0-9]/.test(cleaned)) return null;
  // 1. Equation with '=': tight sides, stops at surrounding words.
  const eq = cleaned.match(
    /([0-9a-zA-Z+\-*/^().×÷]+)\s*=\s*([0-9a-zA-Z+\-*/^().×÷]+)/
  );
  if (eq) return `${eq[1]}=${eq[2]}`;
  // 2. Whole message is math (allows spaced arithmetic like "2x + 4").
  if (
    /^[0-9a-zA-Z+\-*/^().\s=×÷]+$/.test(cleaned) &&
    /[+\-*/^]/.test(cleaned)
  ) {
    return cleaned;
  }
  // 3. First tight math run carrying a digit and an operator.
  const runs = cleaned.match(/[0-9a-zA-Z+\-*/^().×÷]+/g) || [];
  for (const run of runs) {
    if (/[0-9]/.test(run) && /[+\-*/^]/.test(run)) return run;
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
  return result.replace(/=/g, ' equals ');
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
