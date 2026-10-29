import { describe, it, expect } from 'vitest';
import {
  protectTechnicalTokens,
  restoreTechnicalTokens,
  translateDocumentText,
  SUPPORTED_LANGUAGES,
} from '../engine/translationEngine';

describe('Essence-Preserving Polyglot Translation Engine', () => {
  it('protects LaTeX mathematical expressions and formulas during translation', () => {
    const raw = 'The integral $$\\int_0^1 x^2 dx$$ evaluates to $\\frac{1}{3}$.';
    const { maskedText, tokenMap } = protectTechnicalTokens(raw);

    expect(maskedText).toContain('__TECH_MATH_0__');
    expect(maskedText).toContain('__TECH_MATH_1__');
    expect(tokenMap.size).toBe(2);

    const restored = restoreTechnicalTokens(maskedText, tokenMap);
    expect(restored).toBe(raw);
  });

  it('translates keywords into target languages while preserving formulas', async () => {
    const input = 'The calculation of equation $V = \\pi r^2 h$ yields the volume.';
    const translatedEs = await translateDocumentText(input, 'es');

    expect(translatedEs).toContain('$V = \\pi r^2 h$');
    expect(translatedEs).toContain('cálculo');
    expect(translatedEs).toContain('ecuación');
    expect(translatedEs).toContain('volumen');
  });

  it('includes core polyglot languages in supported list', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toContain('es');
    expect(codes).toContain('fr');
    expect(codes).toContain('de');
    expect(codes).toContain('hi');
    expect(codes).toContain('ja');
    expect(codes).toContain('zh');
  });
});
