import { describe, it, expect } from 'vitest';
import { normalizeDocumentText, splitIntoSentences } from '../engine/textNormalization';

describe('Text Normalization & De-Hyphenation Engine', () => {
  it('stitches broken line-split words (e.g. persis-\\ntence -> persistence)', () => {
    const brokenInput = 'The system demonstrated great persis-\ntence across multiple epochs.';
    const result = normalizeDocumentText(brokenInput);

    expect(result.normalizedText).toContain('persistence');
    expect(result.normalizedText).not.toContain('persis-');
  });

  it('preserves intentional compound prefix hyphens (e.g. state-of-the-art, self-organizing)', () => {
    const input = 'This utilizes a self-\norganizing topological map.';
    const result = normalizeDocumentText(input);

    expect(result.normalizedText).toContain('self-organizing');
  });

  it('removes soft hyphens and cleans irregular linebreaks', () => {
    const softHyphenInput = 'comput\u00ADational geometry in high dimensions';
    const result = normalizeDocumentText(softHyphenInput);

    expect(result.normalizedText).toBe('computational geometry in high dimensions');
  });

  it('splits text into sentences while protecting common abbreviations', () => {
    const text = 'Dr. Smith published the paper in 2024. The results, e.g. accuracy and recall, were high! Did you see it? Yes, we did.';
    const sentences = splitIntoSentences(text);

    expect(sentences.length).toBe(4);
    expect(sentences[0]).toBe('Dr. Smith published the paper in 2024.');
    expect(sentences[1]).toContain('e.g. accuracy and recall');
    expect(sentences[2]).toBe('Did you see it?');
    expect(sentences[3]).toBe('Yes, we did.');
  });
});
