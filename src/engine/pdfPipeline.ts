import * as pdfjsLib from 'pdfjs-dist';
import { DocumentItem, DocumentMetadata, DocumentPage } from '../types/document';
import { normalizeDocumentText } from './textNormalization';

// Configure PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  // Use official CDN worker compatible with version 3.11.174
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

/**
 * Fallback binary stream decoder for text-sparse or non-standard/corrupted PDFs.
 * Extracts printable ASCII/UTF-8 text sequences and stream objects directly.
 */
export function fallbackStreamDecoder(arrayBuffer: ArrayBuffer): {
  pages: DocumentPage[];
  extractedTitle?: string;
} {
  const bytes = new Uint8Array(arrayBuffer);
  let rawContent = '';

  // Decode byte streams
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const text = decoder.decode(bytes);

  // Search for PDF stream blocks or string literals: (Text) or /Title (...)
  const titleMatch = text.match(/\/Title\s*\(([^)]+)\)/i);
  const title = titleMatch ? titleMatch[1].trim() : undefined;

  // Extract text within parentheses inside stream objects: (example text) Tj or '
  const textMatches = text.match(/\(([^()]{2,})\)\s*(?:Tj|'|TJ)/g) || [];
  const extractedChunks: string[] = [];

  for (const match of textMatches) {
    const cleanStr = match.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|TJ)$/, '');
    if (cleanStr.trim().length > 1) {
      extractedChunks.push(cleanStr);
    }
  }

  // If no PDF text commands found, extract printable text spans
  if (extractedChunks.length === 0) {
    const printableSpans = text.match(/[A-Za-z0-9\s.,!?:;'"\-+*/=()]{10,}/g) || [];
    extractedChunks.push(...printableSpans.slice(0, 50));
  }

  const mergedText = extractedChunks.join(' ');
  const normalized = normalizeDocumentText(mergedText);

  const fallbackPage: DocumentPage = {
    pageNumber: 1,
    rawText: mergedText,
    normalizedText: normalized.normalizedText || 'No readable text extracted from binary stream.',
    sentences: normalized.sentences.length > 0 ? normalized.sentences : ['No readable sentences found.'],
  };

  return {
    pages: [fallbackPage],
    extractedTitle: title,
  };
}

/**
 * Ingests a PDF File or ArrayBuffer using PDF.js with automated binary fallback.
 */
export async function ingestPdfDocument(
  file: File | Blob | ArrayBuffer,
  fileName = 'Document.pdf'
): Promise<DocumentItem> {
  const arrayBuffer = file instanceof ArrayBuffer ? file : await (file as Blob).arrayBuffer();
  const pages: DocumentPage[] = [];
  let title = fileName.replace(/\.pdf$/i, '');
  let author = 'Unknown Author';
  let pageCount = 1;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    pageCount = pdfDoc.numPages;

    // Metadata extraction
    try {
      const meta = await pdfDoc.getMetadata();
      const info = meta.info as any;
      if (info) {
        if (info.Title && typeof info.Title === 'string' && info.Title.trim()) {
          title = info.Title.trim();
        }
        if (info.Author && typeof info.Author === 'string') {
          author = info.Author.trim();
        }
      }
    } catch {
      // Non-critical metadata read error
    }

    // Extract text page by page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);

      const rawPageText = pageStrings.join(' ');
      const normalized = normalizeDocumentText(rawPageText);

      pages.push({
        pageNumber: pageNum,
        rawText: rawPageText,
        normalizedText: normalized.normalizedText,
        sentences: normalized.sentences,
      });
    }

    // If all extracted pages are empty (e.g. corrupted font table or encrypted streams), trigger fallback
    const totalChars = pages.reduce((sum, p) => sum + p.rawText.length, 0);
    if (totalChars < 20) {
      throw new Error('PDF.js yielded sparse text, activating fallback binary stream decoder.');
    }
  } catch (err) {
    console.warn('PDF.js decoding encountered issue, falling back to raw binary stream decoder:', err);
    const fallback = fallbackStreamDecoder(arrayBuffer);
    if (fallback.pages.length > 0) {
      pages.splice(0, pages.length, ...fallback.pages);
      if (fallback.extractedTitle) {
        title = fallback.extractedTitle;
      }
      pageCount = pages.length;
    }
  }

  // Create preview abstract from first page sentences
  const firstPageSentences = pages[0]?.sentences || [];
  const previewAbstract =
    firstPageSentences.slice(0, 3).join(' ') ||
    'Interactive multimodal document loaded in SmartInk Spatial Canvas.';

  const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const metadata: DocumentMetadata = {
    id: docId,
    title,
    author,
    pageCount,
    previewAbstract,
    fileSize: arrayBuffer.byteLength,
    uploadedAt: Date.now(),
    fileName,
  };

  return {
    id: docId,
    metadata,
    pages,
    position: {
      x: 100,
      y: 100,
      width: 480,
      height: 640,
    },
    currentPage: 1,
    isMinimized: false,
    theme: 'dark',
  };
}
