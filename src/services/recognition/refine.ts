import { OnDeviceStrokeRecognizer } from '../calcInk/strokeRecognizer';
import type { ProjectedEquation } from '../calcInk/strokeRecognizer';
import { MathParser } from '../calcInk/mathParser';
import { glyphSignature } from './rasterize';
import type { NeuralGlyphClassifier } from './neuralGlyphService';
import type { Stroke } from '../../types';

export interface NeuralRefineOptions {
  /** Minimum neural confidence to consider an override. Default 0.9. */
  minConfidence?: number;
}

const DEFAULT_MIN_CONFIDENCE = 0.9;

/**
 * Async neural refinement pass over geometrically scanned equations.
 *
 * The sync geometric pipeline stays the instant first paint; this pass runs
 * the pre-trained digit model off-thread and only swaps a glyph when the
 * neural prediction is confident AND disagrees with (or beats) geometry.
 * Returns the original array untouched when nothing changes or the
 * classifier is unavailable, so callers can skip redundant re-renders.
 */
export async function refineEquationsWithNeural(
  equations: ProjectedEquation[],
  allStrokes: Stroke[],
  classifier: NeuralGlyphClassifier,
  opts: NeuralRefineOptions = {}
): Promise<ProjectedEquation[]> {
  const minConfidence = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  if (!classifier.ready || equations.length === 0 || allStrokes.length === 0) {
    return equations;
  }

  const byId = new Map<string, Stroke>();
  for (const s of allStrokes) byId.set(s.id, s);

  // Group strokes per equation, then into glyphs (same clustering as scan).
  const clusterByEq = new Map<string, Stroke[]>();
  const glyphsBySig = new Map<string, Stroke[]>();
  for (const eq of equations) {
    const cluster: Stroke[] = [];
    for (const id of eq.strokeIds) {
      const s = byId.get(id);
      if (s) cluster.push(s);
    }
    if (cluster.length === 0) continue;
    clusterByEq.set(eq.id, cluster);
    const glyphs = OnDeviceStrokeRecognizer.clusterStrokesIntoGlyphs(cluster);
    for (const glyph of glyphs) {
      glyphsBySig.set(glyphSignature(glyph), glyph);
    }
  }
  if (glyphsBySig.size === 0) return equations;

  let neural: Map<string, { digit: string; confidence: number }>;
  try {
    neural = await classifier.classifyGlyphs([...glyphsBySig.values()]);
  } catch {
    return equations;
  }
  if (neural.size === 0) return equations;

  let changed = false;
  const refined = equations.map((eq) => {
    const cluster = clusterByEq.get(eq.id);
    if (!cluster) return eq;

    const overrides = new Map<string, string>();
    for (const [sig, glyph] of glyphsBySig) {
      if (!cluster.some((s) => glyph.some((g) => g.id === s.id))) continue;
      const prediction = neural.get(sig);
      if (!prediction || prediction.confidence < minConfidence) continue;
      const geometric = OnDeviceStrokeRecognizer.classifyGlyph(glyph);
      if (
        geometric.char !== prediction.digit &&
        (geometric.confidence < prediction.confidence ||
          geometric.confidence < 0.9)
      ) {
        overrides.set(sig, prediction.digit);
      }
    }
    if (overrides.size === 0) return eq;

    const parsed = OnDeviceStrokeRecognizer.parseClusterToExpression(
      cluster,
      overrides
    );
    const expressionText = parsed.expressionStr.trim();
    if (!expressionText || expressionText === eq.expressionText) return eq;

    if (parsed.isPlottable) {
      const evalAt0 = MathParser.evaluate(parsed.functionBody, { x: 0 });
      changed = true;
      return {
        ...eq,
        expressionText,
        evaluation: {
          success: true,
          rawExpression: expressionText,
          sanitizedExpression: parsed.functionBody,
          value: evalAt0.value,
          display: `f(x) = ${parsed.functionBody}`,
          isAssignment: false,
        },
        isPlottableFunction: true,
        plotFunctionBody: parsed.functionBody,
        timestamp: Date.now(),
      };
    }

    const evaluation = MathParser.evaluate(expressionText);
    const acceptable =
      evaluation.success &&
      ((evaluation.value !== null && isFinite(evaluation.value)) ||
        evaluation.isEquationSolution ||
        evaluation.isUndefined);
    if (!acceptable) return eq;

    changed = true;
    return {
      ...eq,
      expressionText,
      evaluation,
      timestamp: Date.now(),
    };
  });

  return changed ? refined : equations;
}
