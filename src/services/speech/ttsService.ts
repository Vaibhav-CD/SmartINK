/**
 * SmartInk Text-to-Speech (TTS) Engine
 * Provides client-side speech synthesis with word boundary tracking,
 * natural voice selection, persona profiles (Male, Female, Child, Scholar, Robot),
 * and click-to-seek reading from any sentence or offset.
 */

export type TtsPersonaId = 'female' | 'male' | 'child' | 'scholar' | 'robot';

export interface TtsPersona {
  id: TtsPersonaId;
  label: string;
  icon: string;
  description: string;
  pitchMultiplier: number;
  rateMultiplier: number;
  preferredGender: 'female' | 'male' | 'any';
}

export const TTS_PERSONAS: Record<TtsPersonaId, TtsPersona> = {
  female: {
    id: 'female',
    label: 'Female',
    icon: '👩',
    description: 'Natural, clear soprano narrator',
    pitchMultiplier: 1.15,
    rateMultiplier: 1.0,
    preferredGender: 'female',
  },
  male: {
    id: 'male',
    label: 'Male',
    icon: '👨',
    description: 'Warm, articulate baritone voice',
    pitchMultiplier: 0.9,
    rateMultiplier: 1.0,
    preferredGender: 'male',
  },
  child: {
    id: 'child',
    label: 'Child',
    icon: '🧒',
    description: 'Bright, lively, and energetic pitch',
    pitchMultiplier: 1.45,
    rateMultiplier: 1.05,
    preferredGender: 'any',
  },
  scholar: {
    id: 'scholar',
    label: 'Scholar',
    icon: '🎓',
    description: 'Deep authoritative lecture cadence',
    pitchMultiplier: 0.75,
    rateMultiplier: 0.92,
    preferredGender: 'male',
  },
  robot: {
    id: 'robot',
    label: 'SmartInk AI',
    icon: '🤖',
    description: 'Futuristic synthetic machine cadence',
    pitchMultiplier: 0.65,
    rateMultiplier: 1.15,
    preferredGender: 'any',
  },
};

export interface TtsOptions {
  rate?: number;           // Base rate 0.5 - 2.0 (default: 1.0)
  pitch?: number;          // Base pitch 0.5 - 1.5 (default: 1.0)
  lang?: string;           // Language code, e.g. 'en', 'es', 'fr', 'de', 'hi', 'ja', 'zh'
  persona?: TtsPersonaId;  // 'female' | 'male' | 'child' | 'scholar' | 'robot'
  voiceName?: string;      // Explicit target voice name or URI
  onStart?: () => void;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onBoundary?: (charIndex: number, charLength?: number) => void;
  onError?: (error: unknown) => void;
}

export interface SentenceSegment {
  text: string;
  startIndex: number;
  endIndex: number;
}

export type TtsPlaybackState = 'idle' | 'playing' | 'paused';

class TtsServiceManager {
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private state: TtsPlaybackState = 'idle';
  private listeners: Set<(state: TtsPlaybackState) => void> = new Set();
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded: boolean = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.initVoices();
        };
      }
      try {
        window.addEventListener('beforeunload', () => {
          this.stop();
        });
      } catch {
        // Safe fallback in test runners
      }
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      this.heartbeatTimer = setInterval(() => {
        if (this.state === 'playing' && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);
    } catch {
      // Safe fallback
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const v = window.speechSynthesis.getVoices();
    if (v && v.length > 0) {
      this.voices = v;
      this.voicesLoaded = true;
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.voicesLoaded) {
      this.initVoices();
    }
    return this.voices;
  }

  public getVoicesForLang(lang: string = 'en'): SpeechSynthesisVoice[] {
    const list = this.getVoices();
    return list.filter(v => v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)));
  }

  public getPreferredVoice(preferredLang: string = 'en', gender: 'female' | 'male' | 'any' = 'any'): SpeechSynthesisVoice | null {
    const list = this.getVoices();
    if (list.length === 0) return null;

    const langCandidates = list.filter(v => 
      v.lang.toLowerCase().startsWith(preferredLang.toLowerCase().slice(0, 2))
    );
    const pool = langCandidates.length > 0 ? langCandidates : list;

    if (gender === 'female') {
      const femaleNames = ['zira', 'jenny', 'samantha', 'victoria', 'karen', 'female', 'ava', 'susan', 'catherine'];
      const femaleVoice = pool.find(v => femaleNames.some(name => v.name.toLowerCase().includes(name)));
      if (femaleVoice) return femaleVoice;
    } else if (gender === 'male') {
      const maleNames = ['david', 'guy', 'george', 'daniel', 'male', 'mark', 'tom', 'james', 'richard'];
      const maleVoice = pool.find(v => maleNames.some(name => v.name.toLowerCase().includes(name)));
      if (maleVoice) return maleVoice;
    }

    // Prioritize natural or high-quality voices
    const naturalVoice = pool.find(v => 
      v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural') || v.name.includes('Premium')
    );
    if (naturalVoice) return naturalVoice;

    return pool[0];
  }

  public getPreferredVoiceForPersona(preferredLang: string = 'en', personaId: TtsPersonaId = 'female'): SpeechSynthesisVoice | null {
    const persona = TTS_PERSONAS[personaId] || TTS_PERSONAS.female;
    return this.getPreferredVoice(preferredLang, persona.preferredGender);
  }

  public getState(): TtsPlaybackState {
    return this.state;
  }

  public getActiveUtterance(): SpeechSynthesisUtterance | null {
    return this.activeUtterance;
  }

  public subscribeState(listener: (state: TtsPlaybackState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(newState: TtsPlaybackState) {
    this.state = newState;
    this.listeners.forEach(fn => fn(newState));
  }

  /**
   * Splits a text body into individual sentences with character offsets
   * allowing users to click and seek to any position.
   */
  public splitIntoSentences(text: string): SentenceSegment[] {
    if (!text || !text.trim()) return [];

    const segments: SentenceSegment[] = [];
    const sentenceRegex = /[^.!?\n]+(?:[.!?]+|\n+|$)/g;
    let match: RegExpExecArray | null;

    while ((match = sentenceRegex.exec(text)) !== null) {
      const rawMatch = match[0];
      const trimmed = rawMatch.trim();
      if (trimmed.length > 0) {
        const start = match.index + (rawMatch.indexOf(trimmed));
        const end = start + trimmed.length;
        segments.push({
          text: trimmed,
          startIndex: start,
          endIndex: end,
        });
      }
    }

    if (segments.length === 0 && text.trim().length > 0) {
      segments.push({
        text: text.trim(),
        startIndex: 0,
        endIndex: text.length,
      });
    }

    return segments;
  }

  /**
   * Speaks the provided text with given options and persona tracking
   */
  public speak(text: string, options: TtsOptions = {}): boolean {
    if (!this.isSupported()) {
      options.onError?.(new Error('SpeechSynthesis is not supported on this device/browser.'));
      return false;
    }

    // Cancel any current utterance before starting new one
    this.stop();

    // Clean de-hyphenation and linebreaks so speech sounds 100% natural and connected
    const cleanText = text
      .replace(/\u00AD/g, '')
      .replace(/(\b[a-zA-Z]{2,})-\s*(?:\r?\n)+\s*([a-zA-Z]{2,}\b)/g, '$1$2')
      .replace(/(\b[a-zA-Z]{2,})-\s+([a-zA-Z]{2,}\b)/g, '$1$2')
      .replace(/([^\n.?!:;])\s*\r?\n\s*([a-zA-Z0-9("'])/g, '$1 $2')
      .replace(/[ \t]+/g, ' ')
      .trim();
    if (!cleanText) return false;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.activeUtterance = utterance;

      const personaId = options.persona || 'female';
      const persona = TTS_PERSONAS[personaId] || TTS_PERSONAS.female;

      const baseRate = options.rate ?? 1.0;
      const basePitch = options.pitch ?? 1.0;

      utterance.rate = Math.max(0.5, Math.min(2.0, baseRate * persona.rateMultiplier));
      utterance.pitch = Math.max(0.5, Math.min(2.0, basePitch * persona.pitchMultiplier));

      const targetLang = options.lang || 'en';
      if (options.voiceName) {
        const found = this.getVoices().find(v => v.name === options.voiceName || v.voiceURI === options.voiceName);
        if (found) utterance.voice = found;
      } else {
        const preferred = this.getPreferredVoiceForPersona(targetLang, personaId);
        if (preferred) utterance.voice = preferred;
      }
      utterance.lang = targetLang;

      utterance.onstart = () => {
        this.setState('playing');
        this.startHeartbeat();
        options.onStart?.();
      };

      utterance.onend = () => {
        this.setState('idle');
        this.activeUtterance = null;
        this.stopHeartbeat();
        options.onEnd?.();
      };

      utterance.onpause = () => {
        this.setState('paused');
        this.stopHeartbeat();
        options.onPause?.();
      };

      utterance.onresume = () => {
        this.setState('playing');
        this.startHeartbeat();
        options.onResume?.();
      };

      utterance.onboundary = (e: SpeechSynthesisEvent) => {
        if (e.name === 'word' || e.name === 'sentence') {
          options.onBoundary?.(e.charIndex, e.charLength);
        }
      };

      utterance.onerror = (e) => {
        this.stopHeartbeat();
        if (e.error === 'canceled' || e.error === 'interrupted') {
          this.setState('idle');
          this.activeUtterance = null;
          return;
        }
        console.warn('SpeechSynthesis error:', e);
        this.setState('idle');
        this.activeUtterance = null;
        options.onError?.(e);
      };

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.error('Failed to initiate TTS:', err);
      this.stopHeartbeat();
      this.setState('idle');
      options.onError?.(err);
      return false;
    }
  }

  public pause(): void {
    if (!this.isSupported()) return;
    if (this.state === 'playing') {
      this.stopHeartbeat();
      window.speechSynthesis.pause();
      this.setState('paused');
    }
  }

  public resume(): void {
    if (!this.isSupported()) return;
    if (this.state === 'paused') {
      window.speechSynthesis.resume();
      this.startHeartbeat();
      this.setState('playing');
    }
  }

  public stop(): void {
    if (!this.isSupported()) return;
    this.stopHeartbeat();
    try {
      window.speechSynthesis.cancel();
    } catch {
      // safe fallback
    }
    this.activeUtterance = null;
    this.setState('idle');
  }
}

export const TtsService = new TtsServiceManager();

