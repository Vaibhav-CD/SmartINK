import { VoicePersona } from '../types/document';

export interface SpeechCallbacks {
  onSentenceChange?: (sentenceIndex: number) => void;
  onWordBoundary?: (charIndex: number, wordLength?: number) => void;
  onPlayStateChange?: (isPlaying: boolean, isPaused: boolean) => void;
  onFinished?: () => void;
  onError?: (err: any) => void;
}

export class SmartSpeechEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private sentences: string[] = [];
  private currentSentenceIndex = 0;
  private persona: VoicePersona = 'Studio';
  private rate = 1.0;
  private pitch = 1.0;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private callbacks: SpeechCallbacks = {};
  private isManuallyPaused = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public setCallbacks(callbacks: SpeechCallbacks) {
    this.callbacks = callbacks;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  public setPersona(persona: VoicePersona) {
    this.persona = persona;
    switch (persona) {
      case 'Deep':
        this.pitch = 0.75;
        this.rate = 0.95;
        break;
      case 'Child':
        this.pitch = 1.4;
        this.rate = 1.1;
        break;
      case 'Studio':
        this.pitch = 1.0;
        this.rate = 1.02;
        break;
      case 'Male':
        this.pitch = 0.9;
        this.rate = 1.0;
        break;
      case 'Female':
        this.pitch = 1.15;
        this.rate = 1.05;
        break;
    }
  }

  public setRate(rate: number) {
    this.rate = Math.max(0.5, Math.min(2.5, rate));
  }

  public setPitch(pitch: number) {
    this.pitch = Math.max(0.5, Math.min(2.0, pitch));
  }

  public setVoice(voice: SpeechSynthesisVoice | null) {
    this.selectedVoice = voice;
  }

  public loadSentences(sentences: string[], startIndex = 0) {
    this.stop();
    this.sentences = sentences;
    this.currentSentenceIndex = Math.max(0, Math.min(startIndex, sentences.length - 1));
  }

  /**
   * Starts or resumes playback.
   */
  public play() {
    if (!this.synth || this.sentences.length === 0) return;

    if (this.isManuallyPaused && this.synth.paused) {
      this.synth.resume();
      this.isManuallyPaused = false;
      this.startWatchdog();
      this.callbacks.onPlayStateChange?.(true, false);
      return;
    }

    this.speakCurrentSentence();
  }

  /**
   * Pauses audio playback safely.
   */
  public pause() {
    if (!this.synth) return;
    this.stopWatchdog();
    this.synth.pause();
    this.isManuallyPaused = true;
    this.callbacks.onPlayStateChange?.(false, true);
  }

  /**
   * Stops playback completely and resets state.
   */
  public stop() {
    this.stopWatchdog();
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
    this.isManuallyPaused = false;
    this.callbacks.onPlayStateChange?.(false, false);
  }

  /**
   * Click-to-Seek: Jumps directly to specified sentence offset and speaks.
   */
  public seekToSentence(index: number) {
    if (index < 0 || index >= this.sentences.length) return;
    this.currentSentenceIndex = index;
    this.speakCurrentSentence();
  }

  private speakCurrentSentence() {
    if (!this.synth || this.sentences.length === 0) return;

    if (this.currentSentenceIndex >= this.sentences.length) {
      this.stop();
      this.callbacks.onFinished?.();
      return;
    }

    this.synth.cancel();

    const textToSpeak = this.sentences[this.currentSentenceIndex];
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    utterance.onstart = () => {
      this.callbacks.onSentenceChange?.(this.currentSentenceIndex);
      this.callbacks.onPlayStateChange?.(true, false);
      this.startWatchdog();
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        this.callbacks.onWordBoundary?.(event.charIndex, event.charLength);
      }
    };

    utterance.onend = () => {
      this.currentSentenceIndex++;
      if (this.currentSentenceIndex < this.sentences.length) {
        this.speakCurrentSentence();
      } else {
        this.stop();
        this.callbacks.onFinished?.();
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('SpeechSynthesis error:', e);
        this.callbacks.onError?.(e);
      }
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  /**
   * Chromium Audio Queue Watchdog:
   * Periodic 10-second heartbeat pulse (`pause` -> `resume`) preventing
   * Chromium browsers from stalling utterances longer than 15 seconds.
   */
  private startWatchdog() {
    this.stopWatchdog();
    this.watchdogTimer = setInterval(() => {
      if (this.synth && this.synth.speaking && !this.synth.paused) {
        this.synth.pause();
        this.synth.resume();
      }
    }, 10000); // 10 seconds interval
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  public getCurrentIndex(): number {
    return this.currentSentenceIndex;
  }
}
