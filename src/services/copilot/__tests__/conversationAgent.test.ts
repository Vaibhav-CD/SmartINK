import { describe, it, expect, vi } from 'vitest';
import {
  askAgent,
  extractExpression,
  normalizeSpokenMath,
  type CloudAsk,
} from '../conversationAgent';

const cloudStub: CloudAsk = vi.fn(async (prompt: string) => ({
  title: 'Stubbed',
  answer: `Echo: ${prompt.slice(0, 60)}`,
  spokenSummary: 'Stubbed answer.',
}));

describe('extractExpression', () => {
  it('pulls equations out of chat phrasing', () => {
    expect(extractExpression('solve 2x+4=10 please')).toBe('2x+4=10');
    expect(extractExpression('what is 18+4*3?')).toBe('18+4*3');
  });

  it('returns null when nothing math-shaped is present', () => {
    expect(extractExpression('tell me about gravity')).toBeNull();
    expect(extractExpression('hello there')).toBeNull();
  });

  it('extracts spaced equations without swallowing words', () => {
    expect(extractExpression('x^2 - 16 = 0')).toBe('x^2 - 16=0');
    expect(extractExpression('solve 2x + 4 = 10 please')).toBe('2x + 4=10');
  });
});

describe('normalizeSpokenMath', () => {
  it('converts word-numbers and operators to symbols', () => {
    expect(normalizeSpokenMath('two x plus four equals ten')).toBe(
      '2 x + 4 = 10'
    );
    expect(normalizeSpokenMath('x squared minus sixteen equals zero')).toBe(
      'x ^2 - 16 = 0'
    );
  });

  it('leaves digit strings untouched', () => {
    expect(normalizeSpokenMath('solve 2x+4=10')).toBe('solve 2x+4=10');
  });

  it('routes spoken arithmetic through extraction', () => {
    expect(extractExpression('what is two plus two')).toBe('2 + 2');
  });
});

describe('askAgent', () => {
  it('solves math found in the message without calling the cloud', async () => {
    const cloud = vi.fn();
    const reply = await askAgent('solve 2x+4=10', {}, cloud);
    expect(reply.kind).toBe('steps');
    expect(reply.body).toContain('x = 3');
    expect(cloud).not.toHaveBeenCalled();
  });

  it('explains the canvas equation when asked about it', async () => {
    const cloud = vi.fn();
    const reply = await askAgent(
      'explain this',
      { equationText: '2+3*4', solutionDisplay: '14' },
      cloud
    );
    expect(reply.kind).toBe('steps');
    expect(reply.body).toContain('14');
    expect(cloud).not.toHaveBeenCalled();
  });

  it('reads back selected handwriting on request', async () => {
    const reply = await askAgent(
      'what did I write?',
      { transcription: 'pythagoras' },
      cloudStub
    );
    expect(reply.kind).toBe('transcription');
    expect(reply.body).toBe('pythagoras');
  });

  it('asks for a selection when there is nothing to read', async () => {
    const reply = await askAgent('read this for me', {}, cloudStub);
    expect(reply.kind).toBe('help');
  });

  it('turns plot requests into a plot action', async () => {
    const reply = await askAgent('plot sin(x)', {}, cloudStub);
    expect(reply.kind).toBe('plot');
    expect(reply.functionBody).toBe('sin(x)');
  });

  it('rejects unplottable plot requests to the cloud path', async () => {
    const cloud = vi.fn(async () => ({
      title: 't',
      answer: 'a',
      spokenSummary: 's',
    }));
    const reply = await askAgent('plot zzz', {}, cloud);
    expect(reply.kind).toBe('answer');
    expect(cloud).toHaveBeenCalled();
  });

  it('resolves why-questions about solvable context locally', async () => {
    const cloud = vi.fn();
    const reply = await askAgent(
      'why does this work?',
      { equationText: '2+3*4', solutionDisplay: '14' },
      cloud
    );
    expect(reply.kind).toBe('steps');
    expect(cloud).not.toHaveBeenCalled();
  });

  it('sends canvas context to the cloud for open questions', async () => {
    const cloud = vi.fn(async (_prompt: string) => ({
      title: 't',
      answer: 'a',
      spokenSummary: 's',
    }));
    const reply = await askAgent(
      'is my approach correct?',
      { equationText: '2+3*4', solutionDisplay: '14' },
      cloud
    );
    expect(reply.kind).toBe('answer');
    expect(cloud).toHaveBeenCalledTimes(1);
    expect(cloud.mock.calls[0][0]).toContain('2+3*4');
  });

  it('solves quadratics via the direct engine without the cloud', async () => {
    const cloud = vi.fn();
    const reply = await askAgent('solve x^2 - 16 = 0', {}, cloud);
    expect(reply.kind).toBe('steps');
    expect(reply.body).toContain('±4');
    expect(reply.spoken).toContain('plus or minus');
    expect(cloud).not.toHaveBeenCalled();
  });

  it('speaks no-real-roots in plain words', async () => {
    const cloud = vi.fn();
    const reply = await askAgent('solve x^2 + 1 = 0', {}, cloud);
    expect(reply.kind).toBe('steps');
    expect(reply.spoken).toContain('no real roots');
    expect(cloud).not.toHaveBeenCalled();
  });

  it('solves spoken word arithmetic', async () => {
    const cloud = vi.fn();
    const reply = await askAgent('what is two plus two', {}, cloud);
    expect(reply.kind).toBe('steps');
    expect(reply.body).toContain('4');
    expect(cloud).not.toHaveBeenCalled();
  });

  it('falls back to help when the cloud fails', async () => {
    const failing: CloudAsk = async () => {
      throw new Error('offline');
    };
    const reply = await askAgent('tell me about photosynthesis', {}, failing);
    expect(reply.kind).toBe('help');
    expect(reply.body).toContain('API key');
  });
});
