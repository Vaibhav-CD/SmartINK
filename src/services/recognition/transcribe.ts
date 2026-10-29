import { OnDeviceStrokeRecognizer } from '../calcInk/strokeRecognizer';
import { PointCloudRecognizer } from '../calcInk/pointCloudRecognizer';
import {
  getStrokesBoundingBox,
  type BoundingBox,
} from '../calcInk/coordinateTransform';
import type { Stroke } from '../../types';

export interface TranscribedWord {
  text: string;
  confidence: number;
  box: BoundingBox;
  strokeIds: string[];
}

export interface GlyphClass {
  char: string;
  confidence: number;
}

export type GlyphClassifier = (glyph: Stroke[]) => GlyphClass;
export type GlyphClusterer = (strokes: Stroke[]) => Stroke[][];

/**
 * Hybrid glyph classifier: geometric rules for digits and math symbols,
 * point-cloud templates as the letter path (a-z, A-Z).
 */
export function defaultGlyphClassify(glyph: Stroke[]): GlyphClass {
  const geometric = OnDeviceStrokeRecognizer.classifyGlyph(glyph);
  if (glyph.length === 0) return geometric;
  // Template top-3: near-tie letter matches (e.g. x vs %) resolve to the
  // letter when geometry is uncertain, since text runs dominate labels.
  const ranked = PointCloudRecognizer.classifyTopN(
    glyph.map((s) => s.points),
    3
  );
  const best = ranked[0];
  const letterBest = ranked.find(
    (r) =>
      /^[a-zA-Z]$/.test(r.char) &&
      r.score >= 0.75 &&
      best &&
      r.score >= best.score - 0.03
  );
  if (
    letterBest &&
    (!/^[a-zA-Z]$/.test(geometric.char) || geometric.confidence < 0.9)
  ) {
    return { char: letterBest.char, confidence: letterBest.score };
  }
  return { char: geometric.char, confidence: geometric.confidence };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Transcribes freehand strokes into words: clusters glyphs, classifies each,
 * groups by line, then splits words on gaps. Math operators act as word
 * separators (equations stay with the CalcInk scanner). Pure and sync.
 */
export function transcribeWords(
  strokes: Stroke[],
  classify: GlyphClassifier = defaultGlyphClassify,
  cluster: GlyphClusterer = (s) =>
    OnDeviceStrokeRecognizer.clusterStrokesIntoGlyphs(s)
): TranscribedWord[] {
  if (strokes.length === 0) return [];
  const glyphs = cluster(strokes);
  if (glyphs.length === 0) return [];

  interface Item {
    char: string;
    confidence: number;
    box: BoundingBox;
    strokeIds: string[];
  }
  const items: Item[] = [];
  for (const glyph of glyphs) {
    const box = getStrokesBoundingBox(glyph);
    if (!box) continue;
    const { char, confidence } = classify(glyph);
    if (!char) continue;
    items.push({
      char,
      confidence,
      box,
      strokeIds: glyph.map((s) => s.id),
    });
  }
  if (items.length === 0) return [];

  // Group into lines by vertical proximity.
  const byTop = [...items].sort((a, b) => a.box.minY - b.box.minY);
  const lineHeight = Math.max(12, median(items.map((i) => i.box.height)));
  const lines: Item[][] = [];
  for (const item of byTop) {
    const line = lines[lines.length - 1];
    const last = line?.[line.length - 1];
    if (
      line &&
      last &&
      Math.abs(item.box.centerY - last.box.centerY) < lineHeight * 1.4
    ) {
      line.push(item);
    } else {
      lines.push([item]);
    }
  }

  // Split each line into words on gaps; operators separate words.
  const words: TranscribedWord[] = [];
  for (const line of lines) {
    const ordered = [...line].sort((a, b) => a.box.minX - b.box.minX);
    const widths = ordered.map((i) => i.box.width);
    const gapThreshold = Math.max(14, median(widths) * 0.75);
    let current: Item[] = [];
    const flush = () => {
      const alnum = current.filter((i) => /[A-Za-z0-9]/.test(i.char));
      if (alnum.length > 0) {
        const minX = Math.min(...alnum.map((i) => i.box.minX));
        const minY = Math.min(...alnum.map((i) => i.box.minY));
        const maxX = Math.max(...alnum.map((i) => i.box.maxX));
        const maxY = Math.max(...alnum.map((i) => i.box.maxY));
        words.push({
          text: alnum.map((i) => i.char).join(''),
          confidence:
            alnum.reduce((acc, i) => acc + i.confidence, 0) / alnum.length,
          box: {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2,
          },
          strokeIds: alnum.flatMap((i) => i.strokeIds),
        });
      }
      current = [];
    };
    for (const item of ordered) {
      const prev = current[current.length - 1];
      const isSeparator = !/[A-Za-z0-9]/.test(item.char);
      const gap = prev ? item.box.minX - prev.box.maxX : 0;
      if ((prev && gap > gapThreshold) || isSeparator) {
        flush();
        if (isSeparator) continue;
      }
      current.push(item);
    }
    flush();
  }
  return words;
}
