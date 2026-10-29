import { MetaAIService } from '../metaAI';

export interface CanvasWriteup {
  title: string;
  /** Pre-wrapped short lines, each rendered as one ink line. */
  lines: string[];
  spoken: string;
}

interface BankEntry extends CanvasWriteup {
  match: string[];
}

/**
 * Offline write-up bank: curated topics that can be inked onto the canvas
 * with zero network. Lines use only synthesizer-supported characters.
 */
const WRITE_BANK: BankEntry[] = [
  {
    match: ['taylor'],
    title: "Taylor's Theorem",
    lines: [
      "Taylor's Theorem:",
      'f(x) = f(a) + f\'(a)(x-a)',
      '+ f\'\'(a)(x-a)^2/2! + ...',
      'Approximates f near x = a.',
    ],
    spoken: "Writing Taylor's theorem on the canvas.",
  },
  {
    match: ['pythag', 'hypotenuse'],
    title: 'Pythagorean Theorem',
    lines: [
      'Pythagorean Theorem:',
      'a^2 + b^2 = c^2',
      'c is the hypotenuse.',
    ],
    spoken: 'Writing the Pythagorean theorem on the canvas.',
  },
  {
    match: ['quadratic'],
    title: 'Quadratic Formula',
    lines: [
      'Quadratic Formula:',
      'x = (-b ± sqrt(D)) / 2a',
      'D = b^2 - 4ac',
    ],
    spoken: 'Writing the quadratic formula on the canvas.',
  },
  {
    match: ['euler'],
    title: "Euler's Identity",
    lines: ["Euler's Identity:", 'e^(i*pi) + 1 = 0'],
    spoken: "Writing Euler's identity on the canvas.",
  },
  {
    match: ['binomial'],
    title: 'Binomial Theorem',
    lines: [
      'Binomial Theorem:',
      '(a+b)^n = SUM C(n,k) a^k b^(n-k)',
      'k = 0..n',
    ],
    spoken: 'Writing the binomial theorem on the canvas.',
  },
  {
    match: ['trig identit', 'sin^2', 'sine squared'],
    title: 'Trig Identity',
    lines: ['Key Trig Identity:', 'sin^2(x) + cos^2(x) = 1'],
    spoken: 'Writing the key trig identity on the canvas.',
  },
];

export function matchWriteup(topic: string): CanvasWriteup | null {
  const lower = topic.toLowerCase();
  const entry = WRITE_BANK.find((e) => e.match.some((k) => lower.includes(k)));
  if (!entry) return null;
  return { title: entry.title, lines: entry.lines, spoken: entry.spoken };
}

/**
 * Extracts the topic from a write command:
 * "write Taylor's theorem on screen" -> "Taylor's theorem".
 */
export function extractWriteTopic(command: string): string | null {
  const match = command.match(
    /^(?:please\s+)?(?:write|show|display|jot down|put)\s+(.+)$/i
  );
  if (!match) return null;
  const topic = match[1]
    .replace(/\s+on (the )?screen\s*$/i, '')
    .replace(/\s+(down|up|out|it)\s*$/i, '')
    .replace(/[?.!]+$/, '')
    .trim();
  return topic || null;
}

/** Greedy word wrap for cloud answers (maxChars per ink line). */
export function wrapLines(text: string, maxChars = 42): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!word) continue;
    if (
      current.length > 0 &&
      current.length + 1 + word.length > maxChars
    ) {
      lines.push(current);
      current = '';
    }
    current = current ? `${current} ${word}` : word;
  }
  if (current) lines.push(current);
  return lines;
}

export type CloudAnswer = (query: string) => Promise<{
  title: string;
  answer: string;
} | null>;

async function defaultCloudAnswer(query: string): Promise<{
  title: string;
  answer: string;
} | null> {
  try {
    const result =
      await MetaAIService.getInstance().answerGeneralQuestion(query);
    return result ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolves a topic to canvas-ready ink lines: offline bank first, cloud
 * answer (wrapped + capped) second, null when nothing is available.
 */
export async function resolveWriteup(
  topic: string,
  cloudAnswer: CloudAnswer = defaultCloudAnswer
): Promise<CanvasWriteup | null> {
  const local = matchWriteup(topic);
  if (local) return local;
  try {
    const cloud = await cloudAnswer(`Write a short study note about: ${topic}`);
    if (!cloud) return null;
    const lines = wrapLines(`${cloud.title}. ${cloud.answer}`.trim()).slice(0, 7);
    if (lines.length === 0) return null;
    return {
      title: cloud.title,
      lines,
      spoken: `Writing ${cloud.title} on the canvas.`,
    };
  } catch {
    return null;
  }
}
