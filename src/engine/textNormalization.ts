/**
 * Smart Text Normalization and De-Hyphenation Engine.
 * Repairs PDF/OCR broken words across linebreaks, removes header/footer noise,
 * and splits text cleanly into sentences.
 */

// Common prefix words that shouldn't be de-hyphenated (e.g. well-known, pre-existing, state-of-the-art)
const PRESERVE_HYPHEN_PATTERNS = [
  /^self-/i,
  /^co-/i,
  /^pre-/i,
  /^post-/i,
  /^multi-/i,
  /^non-/i,
  /^well-/i,
];

/**
 * Normalizes text extracted from PDF or OCR.
 */
export function normalizeDocumentText(rawText: string): {
  normalizedText: string;
  sentences: string[];
} {
  if (!rawText) {
    return { normalizedText: '', sentences: [] };
  }

  // 1. Remove Page Header/Footer intrusions (e.g. "Page 1 of 12", "--- 3 ---", isolated numbers)
  let cleaned = rawText
    .replace(/^.*(?:page\s+\d+\s+of\s+\d+|\bpage\s+\d+\b).*$/gim, '')
    .replace(/^\s*\d+\s*$/gm, '')
    .replace(/^[-\s*_]{3,}$/gm, '');

  // 2. Fix de-hyphenation across line breaks:
  // e.g. "persis-\ntence" -> "persistence"
  // "computa- \n tional" -> "computational"
  cleaned = cleaned.replace(/([a-zA-Z]{2,})[-–—]\s*\n\s*([a-zA-Z]{2,})/g, (match, prefix, suffix) => {
    // Check if it's a compound word that should keep hyphen
    const fullHyphenated = `${prefix}-${suffix}`;
    const shouldKeepHyphen = PRESERVE_HYPHEN_PATTERNS.some((pattern) =>
      pattern.test(fullHyphenated)
    );

    if (shouldKeepHyphen) {
      return `${prefix}-${suffix}`;
    }
    // Stitch together
    return `${prefix}${suffix}`;
  });

  // 3. Fix soft hyphens (Unicode \u00AD)
  cleaned = cleaned.replace(/\u00AD/g, '');

  // 4. Normalize quotes and dashes
  cleaned = cleaned
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-');

  // 5. Clean up awkward line breaks within paragraphs while preserving double line breaks
  const paragraphs = cleaned.split(/\n\s*\n/);
  const normalizedParagraphs = paragraphs
    .map((para) => {
      // Within a paragraph, replace single linebreaks with space
      return para.replace(/\r?\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    })
    .filter((para) => para.length > 0);

  const fullNormalized = normalizedParagraphs.join('\n\n');

  // 6. Split into sentences (handling abbreviations like e.g., i.e., Dr., vs.)
  const sentences = splitIntoSentences(fullNormalized);

  return {
    normalizedText: fullNormalized,
    sentences,
  };
}

/**
 * Splits text into sentences intelligently avoiding breaking on common abbreviations.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];

  // Protect abbreviations
  const protectedText = text
    .replace(/\b(e\.g\.|i\.e\.|etc\.|mr\.|mrs\.|ms\.|dr\.|prof\.|vs\.|fig\.|eq\.|al\.)/gi, (match) => {
      return match.replace(/\./g, '___DOT___');
    });

  // Sentence split regex: period, exclamation or question mark followed by space or end
  const rawSentences = protectedText.split(/(?<=[.?!])\s+(?=[A-Z0-9"'])/);

  return rawSentences
    .map((s) => s.replace(/___DOT___/g, '.').trim())
    .filter((s) => s.length > 0);
}
