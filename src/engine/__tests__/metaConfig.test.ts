import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadMetaConfig,
  saveMetaConfig,
  resolveChatCompletionsUrl,
  META_CONFIG_STORAGE_KEY,
} from '../metaAiClient';
import { MetaAIService } from '../../services/metaAI';

describe('resolveChatCompletionsUrl', () => {
  it('appends /chat/completions to a base URL', () => {
    expect(resolveChatCompletionsUrl('https://api.groq.com/openai/v1')).toBe(
      'https://api.groq.com/openai/v1/chat/completions'
    );
    expect(resolveChatCompletionsUrl('https://api.groq.com/openai/v1/')).toBe(
      'https://api.groq.com/openai/v1/chat/completions'
    );
  });

  it('leaves an already-complete URL unchanged', () => {
    expect(resolveChatCompletionsUrl('https://api.meta.ai/v1/chat/completions')).toBe(
      'https://api.meta.ai/v1/chat/completions'
    );
    expect(resolveChatCompletionsUrl('https://api.meta.ai/v1/chat/completions/')).toBe(
      'https://api.meta.ai/v1/chat/completions'
    );
  });
});

describe('unified Meta config store', () => {
  const envKeys = [
    'VITE_MUSE_API_KEY',
    'VITE_META_API_KEY',
    'VITE_LLAMA_API_KEY',
    'VITE_GROQ_API_KEY',
    'VITE_OPENROUTER_API_KEY',
  ];
  let originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    const envObj = (import.meta as any)?.env;
    if (envObj) {
      envKeys.forEach((k) => {
        originalEnv[k] = envObj[k];
        delete envObj[k];
      });
    }

    let store: Record<string, string> = {};
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    const envObj = (import.meta as any)?.env;
    if (envObj) {
      envKeys.forEach((k) => {
        if (originalEnv[k] !== undefined) {
          envObj[k] = originalEnv[k];
        } else {
          delete envObj[k];
        }
      });
    }
  });

  it('returns the Muse default config when nothing is saved', () => {
    const cfg = loadMetaConfig();
    expect(cfg.apiKey).toBe('');
    expect(cfg.provider).toBe('meta');
    expect(cfg.modelName).toBe('muse-wonder');
    expect(cfg.baseUrl).toBe('https://api.meta.ai/v1');
  });

  it('round-trips a saved key through localStorage', () => {
    saveMetaConfig({
      provider: 'groq',
      modelName: 'llama-3.3-70b-versatile',
      apiKey: 'test-key-123',
      baseUrl: 'https://api.groq.com/openai/v1',
      temperature: 0.2,
    });
    expect(loadMetaConfig().apiKey).toBe('test-key-123');
    expect(localStorage.getItem(META_CONFIG_STORAGE_KEY)).toContain('test-key-123');
  });

  it('makes the TopBar-saved key visible to MetaAIService (proofs/translation path)', () => {
    // Simulates UnifiedTopBar Save & Apply -> saveMetaConfig().
    saveMetaConfig({
      provider: 'groq',
      modelName: 'llama-3.3-70b-versatile',
      apiKey: 'topbar-key-456',
      baseUrl: 'https://api.groq.com/openai/v1',
      temperature: 0.2,
    });
    expect(MetaAIService.getApiKey()).toBe('topbar-key-456');
    expect(MetaAIService.isConfigured()).toBe(true);
  });

  it('resolves the proofs endpoint from the same saved base URL', () => {
    saveMetaConfig({
      provider: 'meta',
      modelName: 'muse-wonder',
      apiKey: 'k',
      baseUrl: 'https://api.meta.ai/v1',
      temperature: 0.2,
    });
    expect(MetaAIService.getApiEndpoint()).toBe(
      'https://api.meta.ai/v1/chat/completions'
    );
    expect(MetaAIService.getModel()).toBe('muse-wonder');
  });

  it('reports unconfigured when no key exists anywhere', () => {
    expect(MetaAIService.getApiKey()).toBe('');
    expect(MetaAIService.isConfigured()).toBe(false);
  });
});
