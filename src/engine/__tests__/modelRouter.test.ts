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
import { generateLocalMetaReasoning, resolveRuntimeConfig, LLAMA_API_CHAT_MODEL } from '../metaAiClient';
import { MetaAIService } from '../../services/metaAI';

const metaCfg = (over: Partial<MetaModelConfig> = {}): MetaModelConfig => ({
  ...DEFAULT_META_CONFIG,
  apiKey: 'test-key',
  taskModels: { ...DEFAULT_META_CONFIG.taskModels },
  ...over,
});

describe('per-task model routing', () => {
  it('routes each task to its own default Meta model', () => {
    const cfg = metaCfg({ apiKey: '' });
    expect(getTaskModel(cfg, 'copilot')).toBe('muse-spark-1.3');
    expect(getTaskModel(cfg, 'proofs')).toBe('muse-wonder-1.0');
    expect(getTaskModel(cfg, 'translation')).toBe('muse-spark-1.3');
    expect(getTaskModel(cfg, 'image')).toBe('muse-image-1.0');
    expect(getTaskModel(cfg, 'transcribe')).toBe('muse-voice-transcribe-1.0');
    expect(getTaskModel(cfg, 'segment')).toBe('sam-3.1');
    expect(getTaskModel(cfg, 'fallback')).toBe('muse-glimmer');
  });

  it('honours per-task overrides and legacy non-Meta single-model configs', () => {
    expect(getTaskModel(metaCfg({ taskModels: { copilot: 'custom-spark' } }), 'copilot')).toBe('custom-spark');
    const groq = metaCfg({ provider: 'groq', modelName: 'llama-3.3-70b-versatile', taskModels: {} });
    expect(getTaskModel(groq, 'copilot')).toBe('llama-3.3-70b-versatile');
    expect(getTaskModel(groq, 'proofs')).toBe('llama-3.3-70b-versatile');
    // Non-chat modalities keep their Meta defaults even on other providers.
    expect(getTaskModel(groq, 'image')).toBe('muse-image-1.0');
  });

  it('builds one endpoint per modality without double-appending', () => {
    expect(resolveMetaEndpoint('https://api.meta.ai/v1', 'copilot')).toBe('https://api.meta.ai/v1/chat/completions');
    expect(resolveMetaEndpoint('https://api.meta.ai/v1', 'image')).toBe('https://api.meta.ai/v1/images/generations');
    expect(resolveMetaEndpoint('https://api.meta.ai/v1/', 'transcribe')).toBe('https://api.meta.ai/v1/asr/transcribe');
    expect(resolveMetaEndpoint('https://api.meta.ai/v1/responses', 'segment')).toBe('https://api.meta.ai/v1/responses');
  });

  it('orders the open-weights fallback chain without repeating the primary', () => {
    expect(getFallbackModels(metaCfg(), 'muse-spark-1.3')).toEqual(['muse-spark-1.2', 'muse-glimmer', 'muse-spark-open']);
    expect(getFallbackModels(metaCfg(), 'muse-glimmer')).toEqual(['muse-spark-1.2', 'muse-spark-open']);
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
    expect(res.modelUsed).toBe('muse-spark-1.2');
    expect(res.markdown).toContain('Answer');
    const bodies = fetchMock.mock.calls.map((c) => JSON.parse(String((c[1] as RequestInit).body)));
    expect(bodies.map((b) => b.model)).toEqual(['muse-spark-1.3', 'muse-spark-1.2']);
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
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toBe('https://api.meta.ai/v1/asr/transcribe');
  });

  it('routes LLM_ keys to the Llama API instead of api.meta.ai', () => {
    const runtime = resolveRuntimeConfig(metaCfg({ apiKey: 'LLM_test_key' }));
    expect(runtime.baseUrl).toBe('https://api.llama.com/v1');
    expect(runtime.taskModels?.copilot).toBe(LLAMA_API_CHAT_MODEL);
    // Non-LLM keys keep the Muse routing untouched.
    expect(resolveRuntimeConfig(metaCfg({ apiKey: 'other-key' })).baseUrl).toBe('https://api.meta.ai/v1');
  });

  it('answers common general questions offline, casually', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    const svc = MetaAIService.getInstance();
    expect((await svc.answerGeneralQuestion('what is the capital of France', 'k')).spokenSummary).toContain('Paris');
    expect((await svc.answerGeneralQuestion('which is the largest planet', 'k')).spokenSummary).toContain('Jupiter');
    expect((await svc.answerGeneralQuestion('explain photosynthesis', 'k')).spokenSummary).toContain('sunlight');
  });

  it('says the key is rejected instead of pretending not to know', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    const res = await MetaAIService.getInstance().answerGeneralQuestion('what is the capital of France', 'LLM_bad');
    expect(res.spokenSummary.toLowerCase()).toContain("key isn't working");
  });

  it('offline spoken replies stay casual, with no processing narration', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
    const res = await MetaAIService.getInstance().answerGeneralQuestion('what is the weather like', 'test-key');
    expect(res.spokenSummary).not.toMatch(/processed|processing|scientific query/i);
    expect(res.spokenSummary.toLowerCase()).toContain('not sure');
    const local = generateLocalMetaReasoning({ queryType: 'explain', extractedSymbols: 'x+1' });
    expect(local.markdown).not.toMatch(/Multimodal Analysis|Living Ink Equilibrium/i);
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

