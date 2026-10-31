import { describe, it, expect, vi } from 'vitest';
import { routeVoiceCommand } from '../voiceCommand';
import type { CloudAsk } from '../conversationAgent';

const cloudStub: CloudAsk = vi.fn(async () => ({
  title: 'Stubbed',
  answer: 'Stubbed answer.',
  spokenSummary: 'Stubbed answer.',
}));

const ctx = { equationText: '2x+4=10', solutionDisplay: 'x = 3' };

describe('routeVoiceCommand', () => {
  it('routes math utterances to conversation with spoken steps', async () => {
    const route = await routeVoiceCommand('solve two x plus four equals ten', ctx, cloudStub);
    expect(route.action).toBe('converse');
    if (route.action !== 'converse') return;
    expect(route.reply.kind).toBe('steps');
    expect(route.reply.spoken).toContain('x equals 3');
  });

  it('routes plot requests to conversation with a plot reply', async () => {
    const route = await routeVoiceCommand('plot sin(x)', {}, cloudStub);
    expect(route.action).toBe('converse');
    if (route.action !== 'converse') return;
    expect(route.reply.kind).toBe('plot');
    expect(route.reply.functionBody).toBe('sin(x)');
  });

  it('routes explicit write commands to ink', async () => {
    const route = await routeVoiceCommand("write Taylor's theorem on screen", {}, cloudStub);
    expect(route).toEqual({ action: 'write', topic: "Taylor's theorem" });
  });

  it('routes show-topic commands to ink', async () => {
    const route = await routeVoiceCommand('show the quadratic formula', {}, cloudStub);
    expect(route.action).toBe('write');
  });

  it('routes "write the pythagoras theorem" to ink', async () => {
    const route = await routeVoiceCommand('write the pythagoras theorem', {}, cloudStub);
    expect(route).toEqual({ action: 'write', topic: 'the pythagoras theorem' });
  });

  it('treats a mis-heard "right" as write only for known topics', async () => {
    const route = await routeVoiceCommand('right the pythagoras theorem', {}, cloudStub);
    expect(route.action).toBe('write');
    const plain = await routeVoiceCommand('right', {}, cloudStub);
    expect(plain.action).toBe('converse');
  });

  it('routes write-the-steps to solution ink when canvas context exists', async () => {
    const route = await routeVoiceCommand('write the steps on screen', ctx, cloudStub);
    expect(route).toEqual({ action: 'write_solution' });
  });

  it('speaks steps for show-me-the-steps instead of inking', async () => {
    const route = await routeVoiceCommand('show me the steps', ctx, cloudStub);
    expect(route.action).toBe('converse');
    if (route.action !== 'converse') return;
    expect(route.reply.kind).toBe('steps');
  });

  it('keeps explicit device commands on their actions', async () => {
    const route = await routeVoiceCommand('simulate a pendulum', {}, cloudStub);
    expect(route).toEqual({
      action: 'device',
      intent: 'living_physics',
      command: 'simulate a pendulum',
    });
  });

  it('answers general knowledge by voice without pinning anything', async () => {
    const route = await routeVoiceCommand('what is the capital of France', {}, cloudStub);
    expect(route.action).toBe('converse');
    if (route.action !== 'converse') return;
    expect(route.reply.spoken).toBe('Stubbed answer.');
  });

  it('answers unrecognized speech by voice instead of a sticky', async () => {
    const route = await routeVoiceCommand('blargh wibble florp', {}, cloudStub);
    expect(route.action).toBe('converse');
  });

  it('routes undo and repeat as conversation controls', async () => {
    expect(await routeVoiceCommand('undo that', {}, cloudStub)).toEqual({ action: 'undo' });
    expect(await routeVoiceCommand('please take that back', {}, cloudStub)).toEqual({ action: 'undo' });
    expect(await routeVoiceCommand('say that again', {}, cloudStub)).toEqual({ action: 'repeat' });
    expect(await routeVoiceCommand('repeat', {}, cloudStub)).toEqual({ action: 'repeat' });
  });
});
