import {
  askAgent,
  extractExpression,
  type AgentReply,
  type CloudAsk,
  type ConversationContext,
} from './conversationAgent';
import { extractWriteTopic, matchWriteup } from './canvasWriter';
import { MetaAIService } from '../metaAI';

export type VoiceDeviceIntent =
  | 'living_physics'
  | 'discover_proofs'
  | 'socratic_hint'
  | 'add_paper'
  | 'generate_image';

/**
 * Voice routing decision. Contract: only explicit asks produce canvas
 * output ('write', 'write_solution', 'device', and executed 'plot' replies);
 * everything else is conversation and must be answered by voice alone.
 */
export type VoiceRoute =
  | { action: 'write'; topic: string }
  | { action: 'write_solution' }
  | { action: 'undo' }
  | { action: 'repeat' }
  | { action: 'device'; intent: VoiceDeviceIntent; command: string }
  | { action: 'converse'; reply: AgentReply };

const UNDO_COMMAND = /^(please\s+)?(undo( that)?|take that back|erase that)\b/i;
const REPEAT_COMMAND = /^(please\s+)?(say that again|repeat that|repeat|what did you say)\b/i;

const DEVICE_INTENTS: VoiceDeviceIntent[] = [
  'living_physics',
  'discover_proofs',
  'socratic_hint',
  'add_paper',
  'generate_image',
];

const STRICT_WRITE_VERBS = /^(please\s+)?(write|jot down|put)\s+/i;
const WRITE_PRONOUN = /^(please\s+)?(write|show|display|put)\s+(it|that|this)\b/i;
const SOLUTION_WORDS = /\b(steps?|working|solution|answer)\b/i;
const PLOT_OR_READ = /\b(plot|graph|read|transcrib)/i;

function isDeviceIntent(intent: string): intent is VoiceDeviceIntent {
  return (DEVICE_INTENTS as string[]).includes(intent);
}

/**
 * Routes one voice utterance. Math, plot, and read-back requests go to the
 * conversation agent; explicit write/show commands ink the canvas; explicit
 * device commands (simulate, prove, hint, paper, image) keep their actions;
 * general knowledge and unrecognized speech are answered by voice only —
 * nothing is ever pinned or transcribed onto the screen unasked.
 */
export async function routeVoiceCommand(
  message: string,
  ctx: ConversationContext,
  cloudAsk?: CloudAsk
): Promise<VoiceRoute> {
  const text = message.trim();
  const converse = async (): Promise<VoiceRoute> => ({
    action: 'converse',
    reply: await askAgent(text, ctx, cloudAsk),
  });

  // 0. Conversation controls first: undo the copilot's ink, or repeat
  // the last spoken reply.
  if (UNDO_COMMAND.test(text)) return { action: 'undo' };
  if (REPEAT_COMMAND.test(text)) return { action: 'repeat' };

  // 0b. Speech engines often hear "write" as "right"/"rite". Treat those
  // as write only when the rest names a known canvas topic, so a plain
  // "right" (yes/correct) is never mistaken for a write command.
  const homophone = text.match(/^(?:please\s+)?(?:right|rite)\s+(.+)$/i);
  if (homophone && matchWriteup(homophone[1])) {
    return { action: 'write', topic: homophone[1].trim() };
  }

  // 1. Math in the message goes straight to the conversation solver.
  if (extractExpression(text)) return converse();

  // 2. Plot and read-back requests are handled by the agent.
  if (PLOT_OR_READ.test(text)) return converse();

  // 3. Strict write verbs ink the canvas — unless the ask is for the
  // canvas solution itself ("write the steps"), which inks the solution.
  const writeTopic = extractWriteTopic(text);
  const wantsSolutionInk =
    !!writeTopic && SOLUTION_WORDS.test(writeTopic);
  if (writeTopic && !wantsSolutionInk && STRICT_WRITE_VERBS.test(text)) {
    return { action: 'write', topic: writeTopic };
  }
  if (
    wantsSolutionInk &&
    STRICT_WRITE_VERBS.test(text) &&
    (ctx.solutionDisplay || ctx.equationText)
  ) {
    return { action: 'write_solution' };
  }
  if (
    WRITE_PRONOUN.test(text) &&
    (ctx.solutionDisplay || ctx.equationText)
  ) {
    return { action: 'write_solution' };
  }

  // 4. Explicit device commands keep their actions (simulate, prove, hint,
  // paper, image). Explanations and general knowledge fall through to
  // conversation so they are spoken, never pinned.
  const parsed = MetaAIService.getInstance().parseVoiceIntent(text);
  if (isDeviceIntent(parsed.intent)) {
    return { action: 'device', intent: parsed.intent, command: text };
  }

  // 5. Show/display fallbacks ink when they carry a real topic.
  if (writeTopic && !wantsSolutionInk) {
    return { action: 'write', topic: writeTopic };
  }

  // 6. Everything else is conversation: a spoken reply, nothing on screen.
  return converse();
}
