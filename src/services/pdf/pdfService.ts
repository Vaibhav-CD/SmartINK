import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Bundled worker source: version-locked to the installed pdfjs-dist and
// served from our own bundle so document parsing works fully offline.
try {
  if (
    typeof window !== 'undefined' &&
    pdfjsLib.GlobalWorkerOptions &&
    window.location?.protocol?.startsWith('http')
  ) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }
} catch {
  // safe fallback
}

export interface ParsedPdfResult {
  title: string;
  author: string;
  pageCount: number;
  pages: string[];
  abstract: string;
  totalWords: number;
}

export class PdfService {
  /**
   * Cleans and de-hyphenates PDF text where words are split across line breaks
   * e.g. "persis-\ntence" -> "persistence", "pro-\ngram" -> "program", "persis-  tence" -> "persistence"
   */
  public static cleanAndDehyphenateText(text: string): string {
    if (!text) return '';

    return text
      // Remove Unicode soft hyphens
      .replace(/\u00AD/g, '')
      // Fix words split across line breaks with hyphen: "persis-\ntence" or "persis-\r\n  tence" -> "persistence"
      .replace(/(\b[a-zA-Z]{2,})-\s*(?:\r?\n)+\s*([a-zA-Z]{2,}\b)/g, '$1$2')
      // Fix words split with hyphen and spaces on same line: "persis-  tence" -> "persistence"
      .replace(/(\b[a-zA-Z]{2,})-\s+([a-zA-Z]{2,}\b)/g, (_match, p1, p2) => {
        // Protect common legitimate hyphenated prefixes
        const commonPrefixes = ['well', 'self', 'high', 'low', 'multi', 'cross', 'non', 'pre', 'post', 'sub', 'ex', 'all'];
        if (commonPrefixes.includes(p1.toLowerCase())) {
          return `${p1}-${p2}`;
        }
        return `${p1}${p2}`;
      })
      // Smooth out intra-paragraph hard newlines so TTS doesn't stutter mid-sentence
      .replace(/([^\n.?!:;])\s*\r?\n\s*([a-zA-Z0-9("'])/g, '$1 $2')
      // Clean duplicate spaces
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  /**
   * Parses an uploaded PDF File and extracts structured text for each page
   */
  public static async parsePdfFile(file: File): Promise<ParsedPdfResult> {
    const arrayBuffer = await file.arrayBuffer();
    return this.parsePdfBuffer(arrayBuffer, file.name);
  }

  /**
   * Parses an ArrayBuffer of a PDF document
   */
  public static async parsePdfBuffer(buffer: ArrayBuffer, fileName: string): Promise<ParsedPdfResult> {
    // Clone buffer slice so fallback stream decoder remains valid if PDF.js detaches the buffer
    const bufferClone = buffer.slice(0);

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(bufferClone),
        useWorkerFetch: false,
        useSystemFonts: true,
      });

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const extractedPages: string[] = [];

      let totalWords = 0;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let pageText = '';
        let lastY: number | null = null;

        for (const item of textContent.items) {
          if ('str' in item) {
            const hasY = 'transform' in item && Array.isArray(item.transform);
            const currentY = hasY ? item.transform[5] : null;

            if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 8) {
              pageText += '\n' + item.str;
            } else {
              pageText += (pageText.endsWith(' ') || pageText === '' ? '' : ' ') + item.str;
            }
            if (currentY !== null) lastY = currentY;
          }
        }

        const cleanedPageText = PdfService.cleanAndDehyphenateText(pageText) || `[Page ${i} - Graphical content or diagram]`;
        extractedPages.push(cleanedPageText);
        totalWords += cleanedPageText.split(/\s+/).filter(Boolean).length;
      }

      // Extract document metadata if available
      let docTitle = fileName.replace(/\.[^/.]+$/, '');
      let docAuthor = 'Uploaded Document';

      try {
        const meta = await pdf.getMetadata();
        if (meta?.info) {
          const info = meta.info as Record<string, unknown>;
          if (typeof info.Title === 'string' && info.Title.trim()) {
            docTitle = info.Title.trim();
          }
          if (typeof info.Author === 'string' && info.Author.trim()) {
            docAuthor = info.Author.trim();
          }
        }
      } catch {
        // use default fallback
      }

      if (extractedPages.length === 0) {
        extractedPages.push('[Page 1 - Graphical content or diagram]');
      }

      // Generate a representative abstract from Page 1
      const p1 = extractedPages[0] || '';
      const abstract = p1.length > 280 ? p1.slice(0, 280) + '...' : (p1 || 'Document ready for reading and TTS.');

      return {
        title: docTitle,
        author: docAuthor,
        pageCount: Math.max(1, numPages, extractedPages.length),
        pages: extractedPages,
        abstract,
        totalWords,
      };
    } catch (err) {
      console.warn('PDF.js binary extraction failed, falling back to raw stream decoding:', err);
      return this.fallbackParseRawStream(buffer, fileName);
    }
  }

  /**
   * Zero-dependency fallback stream parser for simple/text-based PDFs
   */
  public static fallbackParseRawStream(buffer: ArrayBuffer, fileName: string): ParsedPdfResult {
    if (!buffer || buffer.byteLength === 0) {
      return {
        title: fileName.replace(/\.[^/.]+$/, ''),
        author: 'Uploaded Document',
        pageCount: 1,
        pages: ['[Empty Document]'],
        abstract: 'No text content available in uploaded document.',
        totalWords: 0,
      };
    }

    try {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const text = decoder.decode(new Uint8Array(buffer));

      // Extract text blocks inside parentheses or BT ... ET operators
      const textSegments: string[] = [];
      
      // First try extracting readable parentheses strings common in PDF content streams
      const parenRegex = /\(([^\\()]{2,})\)/g;
      let pMatch: RegExpExecArray | null;
      while ((pMatch = parenRegex.exec(text)) !== null) {
        const seg = pMatch[1].trim();
        // Skip PDF format metadata keys like /Catalog or formatting codes
        if (seg && !seg.startsWith('/') && !seg.startsWith('%') && seg.length > 2) {
          textSegments.push(seg);
        }
      }

      // Also look for BT...ET text blocks if paren parsing got nothing
      if (textSegments.length === 0) {
        const btRegex = /BT([\s\S]*?)ET/gi;
        let match: RegExpExecArray | null;
        while ((match = btRegex.exec(text)) !== null) {
          const block = match[1].replace(/[\\/()[\]]/g, ' ').trim();
          if (block) textSegments.push(block);
        }
      }

      const fullContent = textSegments.join(' ').trim() || 'Uploaded PDF document ready for reading and TTS.';
      const words = fullContent.split(/\s+/).filter(Boolean).length;

      return {
        title: fileName.replace(/\.[^/.]+$/, ''),
        author: 'Uploaded Document',
        pageCount: 1,
        pages: [fullContent],
        abstract: fullContent.slice(0, 280) + (fullContent.length > 280 ? '...' : ''),
        totalWords: words,
      };
    } catch {
      return {
        title: fileName.replace(/\.[^/.]+$/, ''),
        author: 'Uploaded Document',
        pageCount: 1,
        pages: ['Uploaded PDF document.'],
        abstract: 'Uploaded PDF document.',
        totalWords: 3,
      };
    }
  }
}
