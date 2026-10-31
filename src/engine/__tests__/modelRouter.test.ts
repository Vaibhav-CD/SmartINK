import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  DEFAULT_META_CONFIG,
  getTaskModel,
  getFallbackModels,
  resolveMetaEndpoint,
  queryMetaModel,
  generateMetaImage,
  transcribeAudio,
  segmentCanvasImage,
} from '../metaAiClient';
import type { MetaModelConfig } from '../../types/ai';

const metaCfg = (over: Partial<MetaModelConfig> = {}): MetaModelConfig => ({
  ...DEFAULT_META_CONFIG,
  apiKey: 'test-key',
  taskModels: { ...DEFAULT_META_CONFIG.taskModels },
  ...over,
});

describe('per-task model routing', () => {
  it('routes each task to its own default Meta model', () => {
    const cfg = metaCfg({ apiKey: '' });
    expect(getTaskModel(cfg, 'copilot')).toBe('muse-spark');
    expect(getTaskModel(cfg, 'proofs')).toBe('muse-wonder');
    expect(getTaskModel(cfg, 'translation')).toBe('muse-spark');
    expect(getTaskModel(cfg, 'image')).toBe('muse-image');
    expect(getTaskModel(cfg, 'transcribe')).toBe('muse-voice-transcribe');
    expect(getTaskModel(cfg, 'segment')).toBe('sam-3.1');
    expect(getTaskModel(cfg, 'fallback')).toBe('muse-glimmer');
  });

  it('honours per-task overrides and legacy non-Meta single-model configs', () => {
    expect(getTaskModel(metaCfg({ taskModels: { copilot: 'custom-spark' } }), 'copilot')).toBe('custom-spark');
    const groq = metaCfg({ provider: 'groq', modelName: 'llama-3.3-70b-versatile', taskModels: {} });
    expect(getTaskModel(groq, 'copilot')).toBe('llama-3.3-70b-versatile');
    expect(getTaskModel(groq, 'proofs')).toBe('llama-3.3-70b-versatile');
    // Non-chat modalities keep their Meta defaults even on other providers.
    expect(getTaskModel(groq, 'image')).toBe('muse-image');
  });

  it('builds one endpoint per modality without double-appending', () => {
    expect(resolveMetaEndpoint('https://api.meta.ai/v1', 'copilot')).toBe('https://api.meta.ai/v1/chat/completions');
    expect(resolveMetaEndpoint('https://api.meta.ai/v1', 'image')).toBe('https://api.meta.ai/v1/images/generations');
    expect(resolveMetaEndpoint('https://api.meta.ai/v1/', 'transcribe')).toBe('https://api.meta.ai/v1/audio/transcriptions');
    expect(resolveMetaEndpoint('https://api.meta.ai/v1/segment', 'segment')).toBe('https://api.meta.ai/v1/segment');
  });

  it('orders the open-weights fallback chain without repeating the primary', () => {
    expect(getFallbackModels(metaCfg(), 'muse-spark')).toEqual(['muse-glimmer', 'muse-spark-open']);
    expect(getFallbackModels(metaCfg(), 'muse-glimmer')).toEqual(['muse-spark-open']);
  });
});

describe('routed API calls (mocked fetch)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('copilot tries Spark, then Glimmer, and reports the model used', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({ ok: false, text: async () => 'err' } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Answer $x=1$' } }] }),
      } as Response);
    const res = await queryMetaModel({ queryType: 'explain', extractedSymbols: 'x+1' }, metaCfg());
    expect(res.modelUsed).toBe('muse-glimmer');
    expect(res.markdown).toContain('Answer');
    const bodies = fetchMock.mock.calls.map((c) => JSON.parse(String((c[1] as RequestInit).body)));
    expect(bodies.map((b) => b.model)).toEqual(['muse-spark', 'muse-glimmer']);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.meta.ai/v1/chat/completions');
  });

  it('image, transcribe and segment return null with no key and never call fetch', async () => {
    const noKey = metaCfg({ apiKey: '' });
    expect(await generateMetaImage('a galaxy', noKey)).toBeNull();
    expect(await transcribeAudio(new Blob(['x']), noKey)).toBeNull();
    expect(await segmentCanvasImage('data:image/png;base64,xx', undefined, noKey)).toBeNull();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('image generation parses a URL result from Muse Image', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ url: 'https://img.example/x.png' }] }),
    } as Response);
    await expect(generateMetaImage('a galaxy', metaCfg())).resolves.toBe('https://img.example/x.png');
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toBe('https://api.meta.ai/v1/images/generations');
  });

  it('transcription returns the transcript text', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'write the pythagorean theorem' }),
    } as Response);
    await expect(transcribeAudio(new Blob(['audio']), metaCfg())).resolves.toBe('write the pythagorean theorem');
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toBe('https://api.meta.ai/v1/audio/transcriptions');
  });

  it('segmentation returns masks from SAM 3.1', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ masks: [{ id: 1 }, { id: 2 }] }),
    } as Response);
    const seg = await segmentCanvasImage('data:image/png;base64,xx', 'strokes', metaCfg());
    expect(seg?.model).toBe('sam-3.1');
    expect(seg?.masks).toHaveLength(2);
  });
});
