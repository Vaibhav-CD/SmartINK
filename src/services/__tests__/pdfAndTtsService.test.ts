import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdfService } from '../pdf/pdfService';
import { TtsService } from '../speech/ttsService';

describe('PdfService & TtsService Suite', () => {
  describe('PdfService', () => {
    it('should parse PDF stream buffer using fallback stream decoder if binary fails', async () => {
      // Mock minimal PDF stream syntax with BT ... ET text segments
      const mockPdfContent = `
        %PDF-1.4
        1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
        2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
        3 0 obj << /Type /Page >> endobj
        stream
        BT
        (Quantum Entanglement and Bell State Verification) Tj
        ET
        BT
        (Experimental results prove non-local correlation.) Tj
        ET
        endstream
      `;
      const encoder = new TextEncoder();
      const buffer = encoder.encode(mockPdfContent).buffer;

      const result = await PdfService.parsePdfBuffer(buffer, 'quantum_physics.pdf');

      expect(result).toBeDefined();
      expect(result.title).toBe('quantum_physics');
      expect(result.pageCount).toBeGreaterThanOrEqual(1);
      expect(result.pages.length).toBeGreaterThanOrEqual(1);
      expect(result.totalWords).toBeGreaterThan(0);
      expect(result.pages[0]).toContain('Quantum Entanglement');
    });

    it('should gracefully handle empty or unreadable buffers without crashing', async () => {
      const emptyBuffer = new ArrayBuffer(0);
      const result = await PdfService.parsePdfBuffer(emptyBuffer, 'notes.pdf');

      expect(result).toBeDefined();
      expect(result.title).toBe('notes');
      expect(result.pages.length).toBe(1);
    });
  });

  describe('TtsService', () => {
    beforeEach(() => {
      // Setup window and SpeechSynthesis mock
      const mockVoices = [
        { name: 'Google US English Natural', lang: 'en-US', voiceURI: 'google-en-us' },
        { name: 'Microsoft David', lang: 'en-US', voiceURI: 'ms-david' },
        { name: 'Microsoft Zira', lang: 'en-US', voiceURI: 'ms-zira' },
      ] as unknown as SpeechSynthesisVoice[];

      function MockUtterance(this: any, text: string) {
        this.text = text;
        this.rate = 1;
        this.pitch = 1;
        this.voice = null;
        this.onstart = null;
        this.onend = null;
        this.onpause = null;
        this.onresume = null;
        this.onerror = null;
      }

      const mockSpeechSynthesis = {
        getVoices: vi.fn(() => mockVoices),
        speak: vi.fn((utterance) => {
          if (utterance.onstart) utterance.onstart();
        }),
        pause: vi.fn(),
        resume: vi.fn(),
        cancel: vi.fn(),
        onvoiceschanged: null,
      };

      // Ensure window is defined
      if (typeof (globalThis as any).window === 'undefined') {
        (globalThis as any).window = {};
      }

      (globalThis as any).window.SpeechSynthesisUtterance = MockUtterance;
      (globalThis as any).SpeechSynthesisUtterance = MockUtterance;
      (globalThis as any).window.speechSynthesis = mockSpeechSynthesis;
    });

    it('should detect speech synthesis support in window', () => {
      expect(TtsService.isSupported()).toBe(true);
    });

    it('should retrieve available voices and select a preferred natural voice', () => {
      const voices = TtsService.getVoices();
      expect(voices.length).toBe(3);

      const preferred = TtsService.getPreferredVoice('en');
      expect(preferred).toBeDefined();
      expect(preferred?.name).toContain('Google US English Natural');
    });

    it('should speak text and update playback state', () => {
      let started = false;
      const success = TtsService.speak('Welcome to SmartInk PDF reading assistant.', {
        onStart: () => {
          started = true;
        },
      });

      expect(success).toBe(true);
      expect(started).toBe(true);
      expect(TtsService.getState()).toBe('playing');

      TtsService.pause();
      expect(TtsService.getState()).toBe('paused');

      TtsService.resume();
      expect(TtsService.getState()).toBe('playing');

      TtsService.stop();
      expect(TtsService.getState()).toBe('idle');
    });

    it('should split text into interactive sentence segments for click-to-seek', () => {
      const text = 'Before delving into I/O devices. We first introduce persistence! Why is this critical?';
      const segments = TtsService.splitIntoSentences(text);

      expect(segments.length).toBe(3);
      expect(segments[0].text).toContain('Before delving');
      expect(segments[0].startIndex).toBe(0);
      expect(segments[1].text).toContain('We first introduce');
      expect(segments[2].text).toContain('Why is this critical');
    });

    it('should select voice personas with custom pitch and rate', () => {
      const maleVoice = TtsService.getPreferredVoiceForPersona('en', 'male');
      expect(maleVoice).toBeDefined();
      expect(maleVoice?.name).toContain('David');

      const femaleVoice = TtsService.getPreferredVoiceForPersona('en', 'female');
      expect(femaleVoice).toBeDefined();
      expect(femaleVoice?.name).toContain('Zira');

      const childSuccess = TtsService.speak('Testing child voice persona', {
        persona: 'child',
      });
      expect(childSuccess).toBe(true);

      const scholarSuccess = TtsService.speak('Testing scholar voice persona', {
        persona: 'scholar',
      });
      expect(scholarSuccess).toBe(true);
    });
  });
});

