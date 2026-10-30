import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdfService } from '../pdf/pdfService';
import { TranslationService } from '../translation/translationService';

describe('PDF De-Hyphenation & Smart Translation Suite', () => {
  describe('PdfService.cleanAndDehyphenateText', () => {
    it('should cleanly join words split across line breaks with hyphens', () => {
      const input = `Before delving into the main content of this part of the book (on persis-\ntence), we first introduce the concept of an input/output (I/O) device.`;
      const cleaned = PdfService.cleanAndDehyphenateText(input);

      expect(cleaned).toContain('persistence');
      expect(cleaned).not.toContain('persis-');
      expect(cleaned).toContain('input/output');
    });

    it('should fix words cut across multiple lines or spaces', () => {
      const input = `now imagine a pro-\ngram with no output (what was the purpose of it running?). Clearly, for\ncomputer systems to be interesting, both input and output are required.`;
      const cleaned = PdfService.cleanAndDehyphenateText(input);

      expect(cleaned).toContain('program with no output');
      expect(cleaned).not.toContain('pro-');
    });

    it('should join words split with hyphen and multiple spaces on the same line', () => {
      const input = `on persis-  tence and pro-  gramming fundamentals.`;
      const cleaned = PdfService.cleanAndDehyphenateText(input);

      expect(cleaned).toContain('persistence');
      expect(cleaned).toContain('programming');
    });

    it('should preserve legitimate hyphenated prefixes like multi-modal or well-known', () => {
      const input = `This is a well-known multi-modal architecture with high-performance computation.`;
      const cleaned = PdfService.cleanAndDehyphenateText(input);

      expect(cleaned).toContain('well-known');
      expect(cleaned).toContain('multi-modal');
    });

    it('should smooth out intra-paragraph hard linebreaks', () => {
      const input = `We first introduce the concept of an\ninput/output device and show how the\noperating system might interact.`;
      const cleaned = PdfService.cleanAndDehyphenateText(input);

      expect(cleaned).toBe('We first introduce the concept of an input/output device and show how the operating system might interact.');
    });
  });

  describe('TranslationService', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('should support multi-language catalog with flags and native names', () => {
      const languages = TranslationService.getSupportedLanguages();
      expect(languages.length).toBeGreaterThanOrEqual(10);

      const spanish = languages.find(l => l.code === 'es');
      expect(spanish).toBeDefined();
      expect(spanish?.nativeName).toBe('Español');

      const hindi = languages.find(l => l.code === 'hi');
      expect(hindi).toBeDefined();
      expect(hindi?.nativeName).toBe('हिन्दी');
    });

    it('should return original text if source and target language are the same', async () => {
      const text = 'Input/Output Devices in Operating Systems.';
      const result = await TranslationService.translateText(text, 'en', 'en');
      expect(result).toBe(text);
    });

    it('should translate technical textbook passage with proper essence (e.g. Spanish)', async () => {
      // Hermetic: simulate offline so the deterministic semantic fallback is exercised,
      // never the live neural API (whose wording varies by network availability).
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
      const text = `I/O Devices\nBefore delving into the main content of this part of the book (on persistence), we first introduce the concept of an input/output (I/O) device.`;
      const translated = await TranslationService.translateText(text, 'es', 'en');

      expect(translated).toBeDefined();
      expect(translated).toContain('Dispositivos de E/S');
      expect(translated).toContain('persistencia');
    });

    it('should translate technical textbook passage into Hindi with proper essence', async () => {
      // Hermetic: simulate offline so the deterministic semantic fallback is exercised,
      // never the live neural API (whose wording varies by network availability).
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
      const text = `I/O Devices\nBefore delving into the main content of this part of the book (on persistence), we first introduce the concept of an input/output (I/O) device.`;
      const translated = await TranslationService.translateText(text, 'hi', 'en');

      expect(translated).toBeDefined();
      expect(translated).toContain('उपकरण');
      expect(translated).toContain('ऑपरेटिंग सिस्टम');
    });
  });
});
