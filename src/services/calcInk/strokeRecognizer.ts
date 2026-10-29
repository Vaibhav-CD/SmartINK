import type { Point, Stroke } from '../../types';
import { MathParser, type EvaluationResult } from './mathParser';
import { getStrokesBoundingBox, type BoundingBox } from './coordinateTransform';
import { PointCloudRecognizer } from './pointCloudRecognizer';
import { glyphSignature } from '../recognition/rasterize';
import { matchDivideSign } from './structuralSymbols';

export interface HandwritingStyle {
  avgStrokeWidth: number;
  slantAngle: number;
  color: string;
}

export interface ProjectedEquation {
  id: string;
  strokeIds: string[];
  expressionText: string;
  evaluation: EvaluationResult;
  anchorPosition: Point;
  boundingBox: BoundingBox;
  timestamp: number;
  /** If the expression is a plottable function of x (e.g. x^2+1, sin(x)) */
  isPlottableFunction: boolean;
  /** The function body suitable for InteractiveFunctionPlot (e.g. "x^2+1") */
  plotFunctionBody?: string;
  /** Dynamic Handwriting Style Matching (PS Requirement #8) */
  style?: HandwritingStyle;
  /** Socratic Error Sniffer (Detects algebraic fallacy between consecutive derivation lines) */
  hasDerivationError?: boolean;
  errorExplanation?: string;
}

/**
 * 100% Client-Side On-Device Stroke Recognizer & Math Parser
 * Zero Cloud APIs - Verifiable in Airplane Mode
 * 
 * Compliant with Inter IIT Tech Meet 15.0 CalcInk Software PS specifications.
 * 
 * Supports:
 * - Digits 0-9
 * - Operators: +, -, *, ×, /, =
 * - Variables: x, y (single-stroke letter recognition)
 * - Parentheses: (, )
 * - Superscript/exponent spatial detection (^ inferred from raised digits)
 * - Decimal point
 * - Multiple independent equations on a single canvas
 */
export class OnDeviceStrokeRecognizer {
  /**
   * Resamples points of a stroke to uniform arc-length distances
   */
  public static resample(points: Point[], targetCount = 32): Point[] {
    if (points.length <= 1) return points;

    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      totalLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }

    if (totalLength === 0) return Array(targetCount).fill(points[0]);

    const interval = totalLength / (targetCount - 1);
    const resampled: Point[] = [points[0]];
    let accumulatedDistance = 0;

    let currentIdx = 1;
    let prevPoint = points[0];

    while (currentIdx < points.length && resampled.length < targetCount) {
      const currentPoint = points[currentIdx];
      const segmentDist = Math.hypot(currentPoint.x - prevPoint.x, currentPoint.y - prevPoint.y);

      if (accumulatedDistance + segmentDist >= interval) {
        const remaining = interval - accumulatedDistance;
        const ratio = remaining / segmentDist;
        const newPoint: Point = {
          x: prevPoint.x + ratio * (currentPoint.x - prevPoint.x),
          y: prevPoint.y + ratio * (currentPoint.y - prevPoint.y),
        };
        resampled.push(newPoint);
        prevPoint = newPoint;
        accumulatedDistance = 0;
      } else {
        accumulatedDistance += segmentDist;
        prevPoint = currentPoint;
        currentIdx++;
      }
    }

    while (resampled.length < targetCount) {
      resampled.push(points[points.length - 1]);
    }

    return resampled;
  }

  /**
   * Normalizes points to a standard [0, 1] x [0, 1] bounding box
   */
  public static normalizePoints(points: Point[]): Point[] {
    if (points.length === 0) return [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);

    return points.map((p) => ({
      x: (p.x - minX) / width,
      y: (p.y - minY) / height,
    }));
  }

  /**
   * Helper: checks if two line segments (p1-p2 and p3-p4) intersect
   */
  private static segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
    const ccw = (a: Point, b: Point, c: Point) =>
      (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    return (
      ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
      ccw(p1, p2, p3) !== ccw(p1, p2, p4)
    );
  }

  /**
   * Compute average curvature of a normalized stroke (sum of angle changes between consecutive segments)
   */
  private static computeCurvature(pts: Point[]): number {
    if (pts.length < 3) return 0;
    let totalCurv = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const dx1 = pts[i].x - pts[i - 1].x;
      const dy1 = pts[i].y - pts[i - 1].y;
      const dx2 = pts[i + 1].x - pts[i].x;
      const dy2 = pts[i + 1].y - pts[i].y;
      const angle1 = Math.atan2(dy1, dx1);
      const angle2 = Math.atan2(dy2, dx2);
      let diff = angle2 - angle1;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      totalCurv += Math.abs(diff);
    }
    return totalCurv;
  }

  /**
   * Count direction changes along the X axis (used for scratch detection and letter recognition)
   */
  private static countXReversals(pts: Point[]): number {
    let reversals = 0;
    let lastDir = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      if (Math.abs(dx) > 0.02) {
        const dir = dx > 0 ? 1 : -1;
        if (lastDir !== 0 && dir !== lastDir) reversals++;
        lastDir = dir;
      }
    }
    return reversals;
  }

  /**
   * Helper: checks if two strokes physically intersect in 2D space
   */
  public static doStrokesIntersect(s1: Stroke, s2: Stroke): boolean {
    const pts1 = s1.points;
    const pts2 = s2.points;
    if (pts1.length < 2 || pts2.length < 2) return false;

    const b1 = getStrokesBoundingBox([s1]);
    const b2 = getStrokesBoundingBox([s2]);
    if (!b1 || !b2) return false;

    // Fast bounding box rejection with small pixel tolerance
    const margin = 4;
    if (
      b1.maxX < b2.minX - margin ||
      b1.minX > b2.maxX + margin ||
      b1.maxY < b2.minY - margin ||
      b1.minY > b2.maxY + margin
    ) {
      return false;
    }

    // Step through segments to detect line intersections
    const step1 = Math.max(1, Math.floor(pts1.length / 18));
    const step2 = Math.max(1, Math.floor(pts2.length / 18));

    for (let i = 0; i < pts1.length - 1; i += step1) {
      const p1 = pts1[i];
      const p2 = pts1[Math.min(i + step1, pts1.length - 1)];
      for (let j = 0; j < pts2.length - 1; j += step2) {
        const p3 = pts2[j];
        const p4 = pts2[Math.min(j + step2, pts2.length - 1)];
        if (this.segmentsIntersect(p1, p2, p3, p4)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Temporal & Spatial Stroke Clustering (PS Requirement #2)
   * Determines whether two disconnected strokes belong to the SAME character/glyph.
   */
  public static areStrokesSameGlyph(s1: Stroke, s2: Stroke): boolean {
    const b1 = getStrokesBoundingBox([s1]);
    const b2 = getStrokesBoundingBox([s2]);
    if (!b1 || !b2) return false;

    // Direct geometric intersection (e.g. crossing strokes for '+' or '×' or '4' or 'x')
    if (this.doStrokesIntersect(s1, s2)) {
      return true;
    }

    const overlapX = Math.min(b1.maxX, b2.maxX) - Math.max(b1.minX, b2.minX);
    const overlapY = Math.min(b1.maxY, b2.maxY) - Math.max(b1.minY, b2.minY);

    // 1. Cross shape '+' or '×' or 't' or 'x': crossing or overlapping strokes
    if (overlapX > -4 && overlapY > -4) {
      const isOneH = b1.width >= b1.height * 0.7;
      const isTwoV = b2.height >= b2.width * 0.7;
      const isOneV = b1.height >= b1.width * 0.7;
      const isTwoH = b2.width >= b2.height * 0.7;

      if ((isOneH && isTwoV) || (isOneV && isTwoH)) {
        return true;
      }

      // Crossing diagonal strokes for 'x'
      const centerDistX = Math.abs(b1.centerX - b2.centerX);
      const centerDistY = Math.abs(b1.centerY - b2.centerY);
      const minDim = Math.min(b1.width, b1.height, b2.width, b2.height);
      if (centerDistX < minDim * 0.45 && centerDistY < minDim * 0.45) {
        return true;
      }
    }

    // 2. Parallel horizontal strokes '='
    const isH1 = b1.width > b1.height * 1.05 && b1.width > 6;
    const isH2 = b2.width > b2.height * 1.05 && b2.width > 6;
    if (isH1 && isH2) {
      const vDist = Math.abs(b1.centerY - b2.centerY);
      const hCenterDist = Math.abs(b1.centerX - b2.centerX);
      const minW = Math.min(b1.width, b2.width);
      const effH = Math.max(b1.height, b2.height, 8);
      if (overlapX > minW * 0.3 && vDist > 2 && vDist < effH * 4.5 && hCenterDist < minW * 0.5) {
        return true;
      }
    }

    // 3. Dot above or below (for 'i', 'j', or division '÷')
    const isDot1 = b1.width < 16 && b1.height < 16;
    const isDot2 = b2.width < 16 && b2.height < 16;
    if (isDot1 || isDot2) {
      const dot = isDot1 ? b1 : b2;
      const other = isDot1 ? b2 : b1;
      const hAlign = Math.abs(dot.centerX - other.centerX);
      const vDist = Math.abs(dot.centerY - other.centerY);
      if (hAlign < Math.max(other.width, 15) * 0.75 && vDist < other.height * 1.3) {
        return true;
      }
    }

    // 4. Two strokes forming '5' (top horizontal hat + lower vertical-curved body)
    const isTopBar1 = b1.width > b1.height * 1.3 && b1.minY <= b2.minY + 12 && b1.centerY < b2.centerY;
    const isTopBar2 = b2.width > b2.height * 1.3 && b2.minY <= b1.minY + 12 && b2.centerY < b1.centerY;
    if (isTopBar1 || isTopBar2) {
      const topBar = isTopBar1 ? b1 : b2;
      const body = isTopBar1 ? b2 : b1;
      const hAlign = Math.abs(topBar.centerX - body.centerX);
      const vGap = body.minY - topBar.maxY;
      if (overlapX > 0 && vGap < body.height * 0.45 && hAlign < Math.max(topBar.width, body.width) * 0.85) {
        return true;
      }
    }

    return false;
  }

  /**
   * Groups disconnected strokes in an equation into individual character glyphs
   * using Connected Components (Disjoint Set Union) based on 2D spatial & temporal geometry.
   */
  public static clusterStrokesIntoGlyphs(strokes: Stroke[]): Stroke[][] {
    if (strokes.length === 0) return [];

    const parent: number[] = strokes.map((_, i) => i);
    const find = (i: number): number => {
      if (parent[i] === i) return i;
      parent[i] = find(parent[i]);
      return parent[i];
    };
    const union = (i: number, j: number) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) {
        parent[rootI] = rootJ;
      }
    };

    // Check all stroke pairs within this equation cluster
    for (let i = 0; i < strokes.length; i++) {
      for (let j = i + 1; j < strokes.length; j++) {
        if (this.areStrokesSameGlyph(strokes[i], strokes[j])) {
          union(i, j);
        }
      }
    }

    // Collect into glyph arrays
    const groupMap = new Map<number, Stroke[]>();
    for (let i = 0; i < strokes.length; i++) {
      const root = find(i);
      if (!groupMap.has(root)) {
        groupMap.set(root, []);
      }
      groupMap.get(root)!.push(strokes[i]);
    }

    // Sort glyphs strictly left-to-right by their horizontal position
    const glyphs = Array.from(groupMap.values());
    glyphs.sort((ga, gb) => {
      const boxA = getStrokesBoundingBox(ga);
      const boxB = getStrokesBoundingBox(gb);
      return (boxA?.minX || 0) - (boxB?.minX || 0);
    });

    return glyphs;
  }

  /**
   * High-Precision Structural Classifier for Digits (0-9), Operators (+, -, *, /, =),
   * Variables (x, y), Parentheses (open/close), and Decimals
   */
  /**
   * Template-matched symbol second opinion. Strictly additive: only symbol
   * characters outside the geometric vocabulary can win, so existing
   * digit/operator behavior is untouched.
   */
  private static readonly TEMPLATE_SYMBOL_CHARS = new Set([
    '∫', 'Σ', 'Δ', 'θ', '∞', '≤', '≥', '≠', '→', '±',
    'sqrt', 'pi', '%', '/', '^', '*',
  ]);

  public static classifyGlyph(strokes: Stroke[]): { char: string; confidence: number } {
    // Structural division sign first: templates cannot separate ÷ dots
    // from a plus bar, but the 3-stroke structure is unambiguous.
    if (matchDivideSign(strokes)) return { char: '/', confidence: 0.93 };
    const geometric = this.classifyGlyphGeometric(strokes);
    if (strokes.length === 0) return geometric;
    const ranked = PointCloudRecognizer.classifyTopN(
      strokes.map((s) => s.points),
      3
    );
    // A template symbol wins only when it is strong on its own merits AND
    // beats geometric confidence, so pinned digit/operator behavior stands.
    const symbolBest = ranked.find(
      (r) =>
        this.TEMPLATE_SYMBOL_CHARS.has(r.char) &&
        r.score >= 0.85 &&
        r.score >= geometric.confidence
    );
    if (symbolBest && symbolBest.char !== geometric.char) {
      return { char: symbolBest.char, confidence: symbolBest.score };
    }
    return geometric;
  }

  private static classifyGlyphGeometric(strokes: Stroke[]): { char: string; confidence: number } {
    if (strokes.length === 0) return { char: '', confidence: 0 };

    const bbox = getStrokesBoundingBox(strokes);
    if (!bbox) return { char: '', confidence: 0 };

    const width = bbox.width;
    const height = bbox.height;
    const aspectRatio = width / (height || 1);

    // Fast-path 1: Parallel horizontal strokes -> '='
    if (strokes.length === 2) {
      const s1 = strokes[0];
      const s2 = strokes[1];
      const b1 = getStrokesBoundingBox([s1]);
      const b2 = getStrokesBoundingBox([s2]);

      if (b1 && b2) {
        const isH1 = b1.width > b1.height * 1.05 && b1.width > 6;
        const isH2 = b2.width > b2.height * 1.05 && b2.width > 6;
        const verticalSeparation = Math.abs(b1.centerY - b2.centerY);
        const horizontalOverlap = Math.min(b1.maxX, b2.maxX) - Math.max(b1.minX, b2.minX);

        if (isH1 && isH2 && verticalSeparation > 3 && horizontalOverlap > Math.min(b1.width, b2.width) * 0.25) {
          return { char: '=', confidence: 0.99 };
        }
      }
    }

    // Fast-path 2: Two orthogonal crossing strokes -> '+'
    if (strokes.length === 2) {
      const s1 = strokes[0];
      const s2 = strokes[1];
      const b1 = getStrokesBoundingBox([s1]);
      const b2 = getStrokesBoundingBox([s2]);

      if (b1 && b2) {
        const isOneH = b1.width >= b1.height * 0.7;
        const isTwoV = b2.height >= b2.width * 0.7;
        const isOneV = b1.height >= b1.width * 0.7;
        const isTwoH = b2.width >= b2.height * 0.7;
        const boxesOverlap2D =
          (Math.min(b1.maxX, b2.maxX) - Math.max(b1.minX, b2.minX) > -4) &&
          (Math.min(b1.maxY, b2.maxY) - Math.max(b1.minY, b2.minY) > -4);

        if (((isOneH && isTwoV) || (isOneV && isTwoH)) && (boxesOverlap2D || this.doStrokesIntersect(s1, s2))) {
          return { char: '+', confidence: 0.99 };
        }
      }
    }

    // Fast-path 3: Decimal point / tiny dot
    if (strokes.length === 1 && width < 14 && height < 14) {
      return { char: '.', confidence: 0.96 };
    }

    // Fast-path 4: Single horizontal bar -> '-'
    if (strokes.length === 1 && aspectRatio > 2.2 && height < 20) {
      return { char: '-', confidence: 0.96 };
    }

    // Fast-path 5: Tall vertical line -> '1' vs Parentheses '(' and ')'
    if (strokes.length === 1 && height > width * 2.2) {
      const raw = strokes[0].points;
      const start = raw[0];
      const mid = raw[Math.floor(raw.length / 2)];
      const end = raw[raw.length - 1];
      const arcDepth = (start.x + end.x) / 2 - mid.x;

      // Deep curve towards the left -> '('
      if (arcDepth > 6 && arcDepth > width * 0.35) {
        return { char: '(', confidence: 0.96 };
      }
      // Deep curve towards the right -> ')'
      if (-arcDepth > 6 && -arcDepth > width * 0.35) {
        return { char: ')', confidence: 0.96 };
      }

      // Straight vertical line -> '1'
      if (Math.abs(arcDepth) <= width * 0.35 || width < 10) {
        return { char: '1', confidence: 0.98 };
      }
    }

    // Primary: High-Precision $P/$Q Point-Cloud Matching across natural handwriting
    const cloudMatch = PointCloudRecognizer.classify(strokes.map(s => s.points));
    if (cloudMatch.score >= 0.70) {
      return { char: cloudMatch.char, confidence: cloudMatch.score };
    }

    // Multi-stroke fallback geometric heuristics (2 or 3 strokes)
    if (strokes.length >= 2) {
      const s1 = strokes[0];
      const s2 = strokes[1];
      const b1 = getStrokesBoundingBox([s1]);
      const b2 = getStrokesBoundingBox([s2]);

      if (b1 && b2) {
        // Intersecting / crossing strokes: '+' vs '×' vs '4'
        const isOneH = b1.width >= b1.height * 0.7;
        const isTwoV = b2.height >= b2.width * 0.7;
        const isOneV = b1.height >= b1.width * 0.7;
        const isTwoH = b2.width >= b2.height * 0.7;
        const boxesOverlap2D =
          (Math.min(b1.maxX, b2.maxX) - Math.max(b1.minX, b2.minX) > -4) &&
          (Math.min(b1.maxY, b2.maxY) - Math.max(b1.minY, b2.minY) > -4);

        // One horizontal and one vertical crossing -> '+'
        if (((isOneH && isTwoV) || (isOneV && isTwoH)) && (boxesOverlap2D || this.doStrokesIntersect(s1, s2))) {
          return { char: '+', confidence: 0.98 };
        }

        // Two intersecting strokes near centers -> diagonal 'x'
        if (this.doStrokesIntersect(s1, s2) || boxesOverlap2D) {
          const maxDim = Math.max(b1.width, b1.height, b2.width, b2.height);
          const isDiag1 = Math.abs(b1.width - b1.height) < maxDim * 0.55;
          const isDiag2 = Math.abs(b2.width - b2.height) < maxDim * 0.55;
          if (isDiag1 && isDiag2 && Math.abs(aspectRatio - 1) < 0.45) {
            return { char: 'x', confidence: 0.95 };
          }
          return { char: '+', confidence: 0.90 };
        }

        // Digit 4 (often written with 2 strokes: L shape + vertical stroke)
        if (strokes.length === 2) {
          const hasVertical = (b1.height > b1.width * 1.8) || (b2.height > b2.width * 1.8);
          if (hasVertical && aspectRatio > 0.35 && aspectRatio < 1.1) {
            return { char: '4', confidence: 0.90 };
          }
        }

        // Digit 5 (often written with 2 strokes: top horizontal bar + vertical-loop body)
        if (strokes.length === 2) {
          const isTopBar1 = b1.width > b1.height * 1.25 && b1.centerY < b2.centerY;
          const isTopBar2 = b2.width > b2.height * 1.25 && b2.centerY < b1.centerY;
          if (isTopBar1 || isTopBar2) {
            return { char: '5', confidence: 0.94 };
          }
        }
      }
    }

    // Single-stroke glyph analysis
    const stroke = strokes[0];
    const rawPts = stroke.points;
    if (rawPts.length < 2) return { char: '.', confidence: 0.95 };

    // Resample & normalize stroke points to unit square [0,1]x[0,1]
    const pts = this.normalizePoints(this.resample(rawPts, 32));

    const startPt = pts[0];
    const endPt = pts[pts.length - 1];
    const startEndDist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);

    // Compute total trajectory path length
    let totalLength = 0;
    for (let i = 1; i < pts.length; i++) {
      totalLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }

    // Compute curvature and X-reversals for more advanced classification
    const curvature = this.computeCurvature(pts);
    const xReversals = this.countXReversals(pts);

    // Check for self-intersections
    let hasSelfIntersection = false;
    let intersectY = 0;
    for (let i = 0; i < 16; i++) {
      for (let j = 18; j < pts.length - 1; j++) {
        if (this.segmentsIntersect(pts[i], pts[i + 1], pts[j], pts[j + 1])) {
          hasSelfIntersection = true;
          intersectY = (pts[i].y + pts[j].y) / 2;
          break;
        }
      }
      if (hasSelfIntersection) break;
    }

    // Find min Y (top), max Y (bottom), and midpoint trajectory characteristics
    let minXPt = pts[0], maxXPt = pts[0];
    for (const p of pts) {
      if (p.x < minXPt.x) minXPt = p;
      if (p.x > maxXPt.x) maxXPt = p;
    }

    // ══════════════════════════════════════════════
    // LETTER RECOGNITION — x, y
    // ══════════════════════════════════════════════

    // Letter 'x' (single stroke drawn as two crossing diagonals in one continuous stroke):
    // High curvature, self-intersection near center, roughly square aspect ratio,
    // path has 1-2 X-reversals, and the start and end are on the same side
    if (
      hasSelfIntersection &&
      Math.abs(intersectY - 0.5) < 0.35 &&
      aspectRatio > 0.45 && aspectRatio < 2.0 &&
      xReversals >= 1 && xReversals <= 4 &&
      curvature < 8.0 &&
      totalLength > 1.4 && totalLength < 5.5 &&
      height > 14 && width > 14
    ) {
      return { char: 'x', confidence: 0.94 };
    }

    // Letter 'x' (cursive or looped single-stroke x with left arc and right arc):
    if (
      !hasSelfIntersection &&
      xReversals >= 2 &&
      aspectRatio > 0.45 && aspectRatio < 1.8 &&
      curvature > 2.0 &&
      startPt.y < 0.45 &&
      endPt.y > 0.7 &&
      startEndDist > 0.35 &&
      height > 12 && width > 12
    ) {
      return { char: 'x', confidence: 0.93 };
    }

    // Letter 'y' (single stroke: two diagonal lines meeting at a center point, 
    // then continuing down as a descender tail)
    // Characteristic: startPt near top-left, goes to center, then goes to top-right area,
    // then returns to center and goes below bottom. 
    // OR: V-shape at top with a tail going down past baseline.
    if (
      !hasSelfIntersection &&
      startPt.y < 0.35 &&
      endPt.y > 0.85 &&
      xReversals >= 1 &&
      curvature > 1.5 && curvature < 8.0 &&
      aspectRatio > 0.35 && aspectRatio < 1.5 &&
      height > 20
    ) {
      // Check if there's a "V" shape in the upper portion then tail goes down
      const midIdx = Math.floor(pts.length * 0.4);
      const midPt = pts[midIdx];
      if (midPt.y > 0.3 && midPt.y < 0.7) {
        return { char: 'y', confidence: 0.90 };
      }
    }

    // ══════════════════════════════════════════════
    // PARENTHESIS RECOGNITION — (, )
    // ══════════════════════════════════════════════

    // Open parenthesis '(' — curved arc, tall, narrow, concave right
    // Start at top-right, curve to left, end at bottom-right
    if (
      !hasSelfIntersection &&
      aspectRatio < 0.65 && height > 20 &&
      startPt.y < 0.2 && endPt.y > 0.8 &&
      startPt.x > 0.4 && endPt.x > 0.4 &&
      curvature > 1.0 && curvature < 5.0 &&
      minXPt.x < 0.4
    ) {
      return { char: '(', confidence: 0.91 };
    }

    // Close parenthesis ')' — curved arc, tall, narrow, concave left
    // Start at top-left, curve to right, end at bottom-left
    if (
      !hasSelfIntersection &&
      aspectRatio < 0.65 && height > 20 &&
      startPt.y < 0.2 && endPt.y > 0.8 &&
      startPt.x < 0.6 && endPt.x < 0.6 &&
      curvature > 1.0 && curvature < 5.0 &&
      maxXPt.x > 0.6
    ) {
      return { char: ')', confidence: 0.91 };
    }

    // ══════════════════════════════════════════════
    // DIGIT & OPERATOR RECOGNITION (refined)
    // ══════════════════════════════════════════════

    // Digit 1 or Division '/'
    if (aspectRatio < 0.45 && height > 20) {
      const dx = endPt.x - startPt.x;
      const dy = endPt.y - startPt.y;
      if (Math.abs(dx / (dy || 1)) > 0.45) {
        return { char: '/', confidence: 0.92 };
      }
      // Very straight vertical stroke with minimal curvature → '1'
      if (curvature < 2.0) {
        return { char: '1', confidence: 0.96 };
      }
      // Curved narrow stroke → could be parenthesis that didn't match above, default to '1'
      return { char: '1', confidence: 0.88 };
    }

    // Digit 0 (Closed loop, start close to end, no internal intersection, aspect ratio balanced)
    if (startEndDist < 0.35 && totalLength > 1.8 && !hasSelfIntersection) {
      return { char: '0', confidence: 0.94 };
    }

    // Digit 6 (Loop in the bottom half: y > 0.4, or self-intersection in lower half)
    if (
      (startPt.y < 0.4 && endPt.y >= 0.3 && endPt.y <= 0.8 && endPt.x > 0.2) ||
      (hasSelfIntersection && intersectY > 0.38 && startPt.y < 0.35)
    ) {
      // Extra check: distinguish from 'x' — 6 has much higher curvature and doesn't cross center evenly
      if (curvature > 3.0 || !hasSelfIntersection) {
        return { char: '6', confidence: 0.95 };
      }
    }

    // Digit 9 (Loop in the top half: starts with closed upper circle, then stem goes down)
    if (
      (startPt.y < 0.5 && endPt.y > 0.75 && (hasSelfIntersection || startEndDist < 0.6)) ||
      (hasSelfIntersection && intersectY < 0.55 && endPt.y > 0.7)
    ) {
      return { char: '9', confidence: 0.93 };
    }

    // Digit 8 (Figure-8 with double loop or self-intersection near center y ~ 0.5)
    if (hasSelfIntersection && Math.abs(intersectY - 0.5) < 0.25 && startEndDist < 0.4) {
      return { char: '8', confidence: 0.93 };
    }

    // Digit 7 (Starts top-left, moves horizontal right, then angles diagonal down-left)
    if (startPt.y < 0.3 && startPt.x < 0.4 && maxXPt.y < 0.3 && endPt.y > 0.75 && endPt.x < 0.65) {
      return { char: '7', confidence: 0.92 };
    }

    // Digit 2 (Starts top-left/center, peaks top-right, diagonal down to bottom-left, horizontal right)
    if (
      !hasSelfIntersection &&
      startPt.y < 0.55 &&
      endPt.y > 0.65 &&
      (endPt.x > minXPt.x + 0.12 || endPt.x > 0.38) &&
      aspectRatio > 0.35 && aspectRatio < 1.4 &&
      curvature > 1.2
    ) {
      return { char: '2', confidence: 0.93 };
    }

    // Digit 3 (Double rightward curve)
    if (startPt.y < 0.35 && endPt.y > 0.75 && startPt.x < 0.5 && endPt.x < 0.6) {
      return { char: '3', confidence: 0.90 };
    }

    // Plus '+' drawn as a single stroke (rapid crossed T or loop)
    if (aspectRatio > 0.6 && aspectRatio < 1.4 && hasSelfIntersection && curvature < 5.0) {
      return { char: '+', confidence: 0.88 };
    }

    // Digit 5 (Single stroke: top horizontal, down, bottom loop)
    if (
      !hasSelfIntersection &&
      startPt.y < 0.38 &&
      endPt.y > 0.65 &&
      curvature > 1.8 &&
      aspectRatio > 0.35 && aspectRatio < 1.3
    ) {
      return { char: '5', confidence: 0.91 };
    }

    // Fallback: If it has loop in lower region -> 6
    if (endPt.y > 0.35 && endPt.y < 0.85 && endPt.x > 0.25 && startPt.y < 0.45) {
      return { char: '6', confidence: 0.82 };
    }

    // Default fallback to best estimate
    return { char: '1', confidence: 0.75 };
  }

  /**
   * Detects if a glyph's bounding box is positioned as a superscript relative to its neighbors.
   * Returns true if the glyph sits significantly above the baseline of adjacent glyphs.
   */
  private static isSuperscript(
    glyphBox: BoundingBox,
    prevGlyphBox: BoundingBox | null,
    nextGlyphBox: BoundingBox | null
  ): boolean {
    const neighborBox = prevGlyphBox || nextGlyphBox;
    if (!neighborBox) return false;

    // The glyph must be:
    // 1. Significantly smaller than the neighbor (< 70% height)
    // 2. Its bottom edge is above the neighbor's vertical center
    // 3. Its top edge is near or above the neighbor's top edge
    const heightRatio = glyphBox.height / (neighborBox.height || 1);
    const glyphBottom = glyphBox.maxY;
    const neighborCenterY = neighborBox.centerY;
    const neighborTop = neighborBox.minY;

    return (
      heightRatio < 0.75 &&
      glyphBottom < neighborCenterY &&
      glyphBox.minY <= neighborTop + neighborBox.height * 0.3
    );
  }

  /**
   * Checks if a recognized expression string is a plottable function of x
   * (contains 'x' variable and produces valid outputs when sampled)
   */
  private static isPlottableExpression(expr: string): { isPlottable: boolean; functionBody: string } {
    const trimmed = expr.trim();

    // If the expression has an equals sign that is NOT a leading "y=" or "f(x)=",
    // it is an algebraic equation to solve (e.g. 2x + 4 = 10), NOT a plottable curve!
    if (trimmed.includes('=') && !/^(?:y|f\(x\))\s*=/i.test(trimmed)) {
      return { isPlottable: false, functionBody: '' };
    }

    // Strip leading "y=" or "f(x)=" if present
    let body = trimmed.replace(/^(?:y|f\(x\))\s*=\s*/i, '').trim();
    
    // Must contain 'x' to be a function of x
    if (!/x/i.test(body)) {
      return { isPlottable: false, functionBody: '' };
    }

    // Must not be a simple assignment like "x=5"
    if (/^x\s*$/.test(body)) {
      return { isPlottable: false, functionBody: '' };
    }

    // Try evaluating at a few sample points
    let validCount = 0;
    for (const testX of [-2, 0, 1, 3]) {
      const res = MathParser.evaluate(body, { x: testX });
      if (res.success && res.value !== null && isFinite(res.value)) {
        validCount++;
      }
    }

    return {
      isPlottable: validCount >= 2,
      functionBody: body,
    };
  }

  /**
   * Scans canvas strokes for mathematical equations
   * Supports multiple independent equations on the same canvas!
   * 
   * Uses spatial proximity clustering so writing a number or formula elsewhere
   * does NOT interfere with previous equations.
   * 
   * Also detects plottable functions (e.g. y=x^2, sin(x)+1) and marks them
   * so the UI can auto-spawn an InteractiveFunctionPlot.
   */
  public static scanEquations(strokes: Stroke[]): ProjectedEquation[] {
    if (strokes.length === 0) return [];

    const equations: ProjectedEquation[] = [];

    // 1. Sort all strokes from left to right by minX
    const sortedStrokes = [...strokes].sort((a, b) => {
      const ba = getStrokesBoundingBox([a]);
      const bb = getStrokesBoundingBox([b]);
      return (ba?.minX || 0) - (bb?.minX || 0);
    });

    // 2. Spatial Clustering: Group strokes into distinct, independent equation clusters
    const clusters: Stroke[][] = [];

    for (const stroke of sortedStrokes) {
      const sBox = getStrokesBoundingBox([stroke]);
      if (!sBox) continue;

      let matchedCluster: Stroke[] | null = null;
      let bestDist = Infinity;

      for (const cluster of clusters) {
        const cBox = getStrokesBoundingBox(cluster);
        if (!cBox) continue;

        const vDiff = Math.abs(sBox.centerY - cBox.centerY);
        const hGap = sBox.minX - cBox.maxX;
        const hOverlap = Math.min(sBox.maxX, cBox.maxX) - Math.max(sBox.minX, cBox.minX);

        // Strokes belong to the same equation if horizontally sequential or vertically stacked (fraction/superscript)
        const isSequential = vDiff < 75 && hGap >= -35 && hGap < 95;
        const isStacked = hOverlap > -15 && vDiff < 95;

        if (isSequential || isStacked) {
          const dist = Math.abs(hGap) + vDiff;
          if (dist < bestDist) {
            bestDist = dist;
            matchedCluster = cluster;
          }
        }
      }

      if (matchedCluster) {
        matchedCluster.push(stroke);
      } else {
        clusters.push([stroke]);
      }
    }

    // 3. Sort clusters from top-to-bottom so variable assignments propagate down subsequent lines
    clusters.sort((ca, cb) => {
      const ba = getStrokesBoundingBox(ca);
      const bb = getStrokesBoundingBox(cb);
      return (ba?.minY || 0) - (bb?.minY || 0);
    });

    // 4. Process each equation cluster independently
    for (const cluster of clusters) {
      if (cluster.length === 0) continue;

    // Extract user's dynamic handwriting style metrics (PS Requirement #8)
    const style = this.extractHandwritingStyle(cluster);

    // 2D Math OCR parsing with fraction & superscript support
    const parsed = this.parseClusterToExpression(cluster);
    const cleanedExpr = parsed.expressionStr.trim();
    if (!cleanedExpr) continue;

    const clusterBox = getStrokesBoundingBox(cluster);
    if (!clusterBox) continue;

    const hasMathOperators = /[+\-*×/÷^%]/.test(cleanedExpr);
    const hasNumbers = /[0-9]/.test(cleanedExpr);
    const hasVariables = /[a-zA-Z]/.test(cleanedExpr);
    const hasMathFunctions = /(sin|cos|tan|sqrt|log|ln|abs|exp|pi)/i.test(cleanedExpr);

    if ((hasNumbers || hasVariables) && (hasMathOperators || cleanedExpr.includes('=') || hasMathFunctions || parsed.isPlottable)) {
      if (parsed.isPlottable) {
        const evalAt0 = MathParser.evaluate(parsed.functionBody, { x: 0 });
        const anchorPosition: Point = {
          x: clusterBox.maxX + 18,
          y: clusterBox.centerY - 14,
        };

        equations.push({
          id: `eq-${cluster[0].id}`,
          strokeIds: cluster.map((s) => s.id),
          expressionText: cleanedExpr,
          evaluation: {
            success: true,
            rawExpression: cleanedExpr,
            sanitizedExpression: parsed.functionBody,
            value: evalAt0.value,
            display: `f(x) = ${parsed.functionBody}`,
            isAssignment: false,
          },
          anchorPosition,
          boundingBox: clusterBox,
          timestamp: Date.now(),
          isPlottableFunction: true,
          plotFunctionBody: parsed.functionBody,
          style,
        });
      } else {
        const evalResult = MathParser.evaluate(cleanedExpr);

        if (evalResult.success && ((evalResult.value !== null && isFinite(evalResult.value)) || evalResult.isEquationSolution || evalResult.isUndefined)) {
          const anchorPosition: Point = {
            x: clusterBox.maxX + 18,
            y: clusterBox.centerY - 14,
          };

          equations.push({
            id: `eq-${cluster[0].id}`,
            strokeIds: cluster.map((s) => s.id),
            expressionText: cleanedExpr,
            evaluation: evalResult,
            anchorPosition,
            boundingBox: clusterBox,
            timestamp: Date.now(),
            isPlottableFunction: false,
            style,
          });
        }
      }
    }
  }

  // Socratic Error Sniffer across consecutive derivation steps
  this.detectDerivationErrors(equations);

  return equations;
}

/**
 * Autonomous Socratic Error Sniffer:
 * Inspects multi-line handwritten derivation steps and detects algebraic divergences
 */
public static detectDerivationErrors(equations: ProjectedEquation[]) {
  if (equations.length < 2) return;

  for (let i = 0; i < equations.length - 1; i++) {
    const eq1 = equations[i];
    const eq2 = equations[i + 1];

    // Check vertical sequence alignment
    const hOverlap =
      Math.min(eq1.boundingBox.maxX, eq2.boundingBox.maxX) -
      Math.max(eq1.boundingBox.minX, eq2.boundingBox.minX);
    const vGap = eq2.boundingBox.minY - eq1.boundingBox.maxY;

    if (hOverlap > -20 && vGap > -15 && vGap < 180) {
      // Unknown variable solutions (e.g. 2x + 10 = 20 vs 2x = 30)
      if (eq1.evaluation.isEquationSolution && eq2.evaluation.isEquationSolution) {
        const val1 = eq1.evaluation.value;
        const val2 = eq2.evaluation.value;

        if (val1 !== null && val2 !== null && Math.abs(val1 - val2) > 0.001) {
          eq2.hasDerivationError = true;
          eq2.errorExplanation = `Algebraic divergence: Line ${i + 1} evaluates to ${val1.toFixed(1)}, but Line ${i + 2} evaluates to ${val2.toFixed(1)}. Check sign inversion.`;
        }
      } else if (
        eq1.evaluation.value !== null &&
        eq2.evaluation.value !== null &&
        !eq2.expressionText.includes('=')
      ) {
        const val1 = eq1.evaluation.value;
        const val2 = eq2.evaluation.value;
        if (Math.abs(val1 - val2) > 0.001) {
          eq2.hasDerivationError = true;
          eq2.errorExplanation = `Derivation mismatch: Previous line is ${val1}, but this step equals ${val2}.`;
        }
      }
    }
  }
}

/**
 * Extracts handwriting style metrics (stroke width, slant angle, color)
 * to warp and match output font rendering (PS Requirement #8)
 */
public static extractHandwritingStyle(strokes: Stroke[]): HandwritingStyle {
  if (strokes.length === 0) {
    return { avgStrokeWidth: 3, slantAngle: 0, color: '#a3e635' };
  }

  let totalWidth = 0;
  let slantSum = 0;
  let slantCount = 0;
  const color = strokes[0].color || '#a3e635';

  for (const s of strokes) {
    totalWidth += s.width || 3;
    const pts = s.points;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      if (Math.abs(dy) > 4 && Math.abs(dy) > Math.abs(dx)) {
        const angleDeg = Math.atan2(dx, -dy) * (180 / Math.PI);
        if (Math.abs(angleDeg) < 45) {
          slantSum += angleDeg;
          slantCount++;
        }
      }
    }
  }

  const avgWidth = strokes.length > 0 ? totalWidth / strokes.length : 3;
  const avgSlant = slantCount > 0 ? slantSum / slantCount : 0;

  return {
    avgStrokeWidth: Math.round(avgWidth * 10) / 10,
    slantAngle: Math.round(Math.max(-25, Math.min(25, avgSlant))),
    color,
  };
}

/**
 * Two-Dimensional Math OCR (PS Requirement #3)
 * Parses an equation cluster with fraction line and superscript detection.
 */
public static parseClusterToExpression(cluster: Stroke[], glyphOverrides?: Map<string, string>): {
  expressionStr: string;
  isPlottable: boolean;
  functionBody: string;
} {
  // Check for horizontal fraction division bar
  for (const stroke of cluster) {
    const b = getStrokesBoundingBox([stroke]);
    if (!b) continue;

    // A fraction bar is distinctly wide and flat
    if (b.width > b.height * 2.8 && b.width >= 16) {
      const above = cluster.filter((s) => {
        if (s.id === stroke.id) return false;
        const sb = getStrokesBoundingBox([s]);
        return sb && sb.centerY < b.minY && sb.centerX >= b.minX - 12 && sb.centerX <= b.maxX + 12;
      });
      const below = cluster.filter((s) => {
        if (s.id === stroke.id) return false;
        const sb = getStrokesBoundingBox([s]);
        return sb && sb.centerY > b.maxY && sb.centerX >= b.minX - 12 && sb.centerX <= b.maxX + 12;
      });

      if (above.length > 0 && below.length > 0) {
        const numExpr = this.parseSimpleGlyphSequence(above, glyphOverrides);
        const denExpr = this.parseSimpleGlyphSequence(below, glyphOverrides);

        const fracIds = new Set([stroke.id, ...above.map((s) => s.id), ...below.map((s) => s.id)]);
        const otherStrokes = cluster.filter((s) => !fracIds.has(s.id));

        const leftStrokes = otherStrokes.filter((s) => {
          const sb = getStrokesBoundingBox([s]);
          return sb && sb.maxX < b.minX;
        });
        const rightStrokes = otherStrokes.filter((s) => {
          const sb = getStrokesBoundingBox([s]);
          return sb && sb.minX > b.maxX;
        });

        const leftExpr = leftStrokes.length > 0 ? this.parseSimpleGlyphSequence(leftStrokes, glyphOverrides) : '';
        const rightExpr = rightStrokes.length > 0 ? this.parseSimpleGlyphSequence(rightStrokes, glyphOverrides) : '';

        // A bar with single dots above and below is a division sign (÷),
        // not a fraction — emit a plain division operator.
        const isDivisionSign = numExpr.trim() === '.' && denExpr.trim() === '.';
        const fullExpr = isDivisionSign
          ? `${leftExpr}/${rightExpr}`
          : `${leftExpr}(${numExpr})/(${denExpr})${rightExpr}`;
        const plotCheck = this.isPlottableExpression(fullExpr);
        return {
          expressionStr: fullExpr,
          isPlottable: plotCheck.isPlottable,
          functionBody: plotCheck.functionBody,
        };
      }
    }
  }

  // Standard linear sequence
  const fullExpr = this.parseSimpleGlyphSequence(cluster, glyphOverrides);
  const plotCheck = this.isPlottableExpression(fullExpr);
  return {
    expressionStr: fullExpr,
    isPlottable: plotCheck.isPlottable,
    functionBody: plotCheck.functionBody,
  };
}

/**
 * Parses simple glyph sequences with connected-component clustering,
 * superscript detection, contextual disambiguation, and natural word spacing
 */
private static parseSimpleGlyphSequence(strokes: Stroke[], glyphOverrides?: Map<string, string>): string {
  if (strokes.length === 0) return '';
  const glyphs = this.clusterStrokesIntoGlyphs(strokes);
  const glyphResults: { char: string; confidence: number; box: BoundingBox }[] = [];

  for (const g of glyphs) {
    const override = glyphOverrides?.get(glyphSignature(g));
    const classification =
      override !== undefined
        ? { char: override, confidence: 0.99 }
        : this.classifyGlyph(g);
    const gBox = getStrokesBoundingBox(g);
    if (gBox) {
      glyphResults.push({ ...classification, box: gBox });
    }
  }

  if (glyphResults.length === 0) return '';

  // Compute average character width to determine word spacing gaps
  const avgCharWidth =
    glyphResults.reduce((acc, g) => acc + g.box.width, 0) / glyphResults.length;

  // First pass: Contextual disambiguation for numbers, operators, and math tokens
  const disambiguated: string[] = [];
  for (let gi = 0; gi < glyphResults.length; gi++) {
    let char = glyphResults[gi].char;
    const prevChar = gi > 0 ? glyphResults[gi - 1].char : '';
    const nextChar = gi < glyphResults.length - 1 ? glyphResults[gi + 1].char : '';

    const isPrevMath = /[0-9+\-*×/÷=^()]/.test(prevChar);
    const isNextMath = /[0-9+\-*×/÷=^()]/.test(nextChar);

    // Disambiguate 'o' / 'O' to '0' when surrounded by math symbols
    if ((char === 'o' || char === 'O') && (isPrevMath || isNextMath)) {
      char = '0';
    }
    // Disambiguate 'l' / 'I' to '1' when surrounded by math symbols
    else if ((char === 'l' || char === 'I') && (isPrevMath || isNextMath)) {
      char = '1';
    }
    // Disambiguate 's' / 'S' to '5' in arithmetic expressions
    else if ((char === 's' || char === 'S') && (isPrevMath || isNextMath) && prevChar !== 'o' && nextChar !== 'i') {
      char = '5';
    }
    // Disambiguate 'z' / 'Z' to '2' in arithmetic expressions
    else if ((char === 'z' || char === 'Z') && (isPrevMath || isNextMath)) {
      char = '2';
    }

    disambiguated.push(char);
  }

  // Second pass: Assemble string with superscripts and word spacing
  let expressionStr = '';
  for (let gi = 0; gi < glyphResults.length; gi++) {
    const current = glyphResults[gi];
    const prev = gi > 0 ? glyphResults[gi - 1] : null;
    const next = gi < glyphResults.length - 1 ? glyphResults[gi + 1] : null;
    const char = disambiguated[gi];

    // Insert word space if there is a significant horizontal gap
    if (prev) {
      const gap = current.box.minX - prev.box.maxX;
      if (gap > Math.max(20, avgCharWidth * 1.15)) {
        expressionStr += ' ';
      }
    }

    if (this.isSuperscript(current.box, prev?.box || null, next?.box || null)) {
      expressionStr += '^' + char;
    } else {
      expressionStr += char;
    }
  }

  // Normalize common math function names and arguments
  expressionStr = expressionStr
    .replace(/\bs\s*1\s*n\b/gi, 'sin')
    .replace(/\bc\s*0\s*s\b/gi, 'cos')
    .replace(/\bt\s*a\s*n\b/gi, 'tan')
    .replace(/\bs\s*q\s*r\s*t\b/gi, 'sqrt')
    .replace(/\bl\s*0\s*g\b/gi, 'log')
    .replace(/÷/g, '/')
    .replace(/sqrt([a-zA-Z0-9])/g, 'sqrt($1)')
    .replace(/\b(sin|cos|tan|sqrt|log|ln)\s+([a-zA-Z0-9]+)/gi, '$1($2)');

  return expressionStr;
}

/**
 * Directly recognizes and evaluates a specific group of strokes
 * (e.g. from Lasso Selection or Circle-to-Solve)
 */
public static recognizeStrokeGroup(strokes: Stroke[]): ProjectedEquation | null {
  if (strokes.length === 0) return null;

  const clusterBox = getStrokesBoundingBox(strokes);
  if (!clusterBox) return null;

  const style = this.extractHandwritingStyle(strokes);
  const parsed = this.parseClusterToExpression(strokes);
  const cleanedExpr = parsed.expressionStr.trim();
  if (!cleanedExpr) return null;

  // Check if plottable function
  if (parsed.isPlottable) {
    const evalAt0 = MathParser.evaluate(parsed.functionBody, { x: 0 });
    return {
      id: `sel-${Date.now()}`,
      strokeIds: strokes.map((s) => s.id),
      expressionText: cleanedExpr,
      evaluation: {
        success: true,
        rawExpression: cleanedExpr,
        sanitizedExpression: parsed.functionBody,
        value: evalAt0.value,
        display: `f(x) = ${parsed.functionBody}`,
        isAssignment: false,
      },
      anchorPosition: {
        x: clusterBox.maxX + 18,
        y: clusterBox.centerY - 14,
      },
      boundingBox: clusterBox,
      timestamp: Date.now(),
      isPlottableFunction: true,
      plotFunctionBody: parsed.functionBody,
      style,
    };
  }

  // Standard evaluation
  const evalResult = MathParser.evaluate(cleanedExpr);
  if (evalResult.success && ((evalResult.value !== null && isFinite(evalResult.value)) || evalResult.isEquationSolution || evalResult.isUndefined)) {
    return {
      id: `sel-${Date.now()}`,
      strokeIds: strokes.map((s) => s.id),
      expressionText: cleanedExpr,
      evaluation: evalResult,
      anchorPosition: {
        x: clusterBox.maxX + 18,
        y: clusterBox.centerY - 14,
      },
      boundingBox: clusterBox,
      timestamp: Date.now(),
      isPlottableFunction: false,
      style,
    };
  }

  return null;
}

/**
 * Renders strokes onto an offscreen canvas and returns an image Data URL (PNG)
 * Designed for high-contrast multi-modal Vision OCR (Meta Llama 3.2 Vision / Muse Spark)
 */
public static renderStrokesToDataUrl(strokes: Stroke[], padding: number = 24): string | null {
  if (strokes.length === 0 || typeof document === 'undefined') return null;
  const bbox = getStrokesBoundingBox(strokes);
  if (!bbox) return null;

  const width = Math.max(100, Math.ceil(bbox.width + padding * 2));
  const height = Math.max(60, Math.ceil(bbox.height + padding * 2));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // High contrast white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#000000';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const offsetX = padding - bbox.minX;
  const offsetY = padding - bbox.minY;

  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    ctx.lineWidth = Math.max(3, stroke.width || 3);
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x + offsetX, stroke.points[0].y + offsetY);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x + offsetX, stroke.points[i].y + offsetY);
    }
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}
}
