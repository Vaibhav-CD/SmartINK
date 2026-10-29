import type { Point } from '../../types';

export interface PointCloudTemplate {
  name: string;
  char: string;
  points: Point[];
}

export interface MatchResult {
  char: string;
  score: number; // 0 to 1, where 1 is perfect match
  templateName: string;
}

const NUM_POINTS = 32;

/**
 * High-Speed On-Device $P/$Q Point-Cloud Handwriting Recognizer
 * (Based on Wobbrock, Wilson, Li - Invariant to stroke order, direction, and stroke count)
 */
export class PointCloudRecognizer {
  private static templates: PointCloudTemplate[] = [];

  /**
   * Resamples points uniformly along path length to exactly N points without mutating input
   */
  public static resample(rawPoints: Point[], n: number = NUM_POINTS): Point[] {
    if (rawPoints.length === 0) return [];
    if (rawPoints.length === 1) {
      return Array(n).fill({ x: rawPoints[0].x, y: rawPoints[0].y });
    }

    const points: Point[] = rawPoints.map(p => ({ x: p.x, y: p.y }));

    // Compute total path length
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      totalLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }

    if (totalLength === 0) {
      return Array(n).fill({ x: points[0].x, y: points[0].y });
    }

    const interval = totalLength / (n - 1);
    const resampled: Point[] = [{ x: points[0].x, y: points[0].y }];
    let dist = 0;

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const segmentLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);

      if (dist + segmentLen >= interval) {
        const qx = p0.x + ((interval - dist) / segmentLen) * (p1.x - p0.x);
        const qy = p0.y + ((interval - dist) / segmentLen) * (p1.y - p0.y);
        const q: Point = { x: qx, y: qy };
        resampled.push(q);
        points.splice(i, 0, q); // Insert to continue measuring from this exact point
        dist = 0;
      } else {
        dist += segmentLen;
      }
    }

    while (resampled.length < n) {
      resampled.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });
    }

    return resampled.slice(0, n);
  }

  /**
   * Resamples multi-stroke point clouds without artificial pen-up jump lines
   */
  public static resampleMultiStroke(strokes: Point[][], totalPoints: number = NUM_POINTS): Point[] {
    const validStrokes = strokes.filter(s => s && s.length > 0);
    if (validStrokes.length === 0) return [];
    if (validStrokes.length === 1) return this.resample(validStrokes[0], totalPoints);

    // Compute path length of each stroke
    const lengths: number[] = [];
    let totalLength = 0;
    for (const stroke of validStrokes) {
      let l = 0;
      for (let i = 1; i < stroke.length; i++) {
        l += Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y);
      }
      lengths.push(l);
      totalLength += l;
    }

    const cloud: Point[] = [];
    for (let k = 0; k < validStrokes.length; k++) {
      const stroke = validStrokes[k];
      const numPts = totalLength > 0
        ? Math.max(4, Math.round((lengths[k] / totalLength) * totalPoints))
        : Math.max(4, Math.floor(totalPoints / validStrokes.length));
      const resampled = this.resample(stroke, numPts);
      cloud.push(...resampled);
    }

    return cloud;
  }

  /**
   * Translates points so their centroid is at (0, 0)
   */
  public static center(points: Point[]): Point[] {
    if (points.length === 0) return [];
    let cx = 0, cy = 0;
    for (const p of points) {
      cx += p.x;
      cy += p.y;
    }
    cx /= points.length;
    cy /= points.length;
    return points.map(p => ({ x: p.x - cx, y: p.y - cy }));
  }

  /**
   * Normalizes points to unit bounding box [0, 1] while preserving aspect ratio
   */
  public static normalize(points: Point[]): Point[] {
    if (points.length === 0) return [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const maxDim = Math.max(width, height);

    const centered = this.center(points);
    return centered.map(p => ({
      x: p.x / maxDim,
      y: p.y / maxDim,
    }));
  }

  /**
   * Computes symmetric Hausdorff-like minimum Euclidean distance between two point clouds
   */
  public static cloudDistance(pts1: Point[], pts2: Point[]): number {
    const n = pts1.length;
    const m = pts2.length;
    if (n === 0 || m === 0) return Infinity;

    // Forward distance: avg min distance from pts1 to pts2
    let sum1 = 0;
    for (let i = 0; i < n; i++) {
      let minD = Infinity;
      for (let j = 0; j < m; j++) {
        const d = Math.hypot(pts1[i].x - pts2[j].x, pts1[i].y - pts2[j].y);
        if (d < minD) minD = d;
      }
      sum1 += minD;
    }

    // Reverse distance: avg min distance from pts2 to pts1
    let sum2 = 0;
    for (let i = 0; i < m; i++) {
      let minD = Infinity;
      for (let j = 0; j < n; j++) {
        const d = Math.hypot(pts2[i].x - pts1[j].x, pts2[i].y - pts1[j].y);
        if (d < minD) minD = d;
      }
      sum2 += minD;
    }

    return (sum1 / n + sum2 / m) / 2;
  }

  /**
   * Classifies a candidate stroke or multi-stroke glyph against built-in templates
   */
  public static classify(strokesPoints: Point[][]): MatchResult {
    const matches = this.classifyTopN(strokesPoints, 1);
    return matches[0] || { char: '', score: 0, templateName: 'none' };
  }

  /**
   * Classifies candidate stroke points and returns top N matching candidates with scores
   */
  public static classifyTopN(strokesPoints: Point[][], topN: number = 3): MatchResult[] {
    const valid = strokesPoints.filter(s => s && s.length > 0);
    if (valid.length === 0) {
      return [{ char: '', score: 0, templateName: 'empty' }];
    }

    const totalRawPts = valid.reduce((acc, s) => acc + s.length, 0);
    if (totalRawPts < 2) {
      return [{ char: '.', score: 0.95, templateName: 'dot' }];
    }

    const resampledCloud = valid.length > 1
      ? this.resampleMultiStroke(valid, NUM_POINTS)
      : this.resample(valid[0], NUM_POINTS);

    const candidate = this.normalize(resampledCloud);
    this.ensureTemplatesLoaded();

    const scoredTemplates: MatchResult[] = [];

    for (const tmpl of this.templates) {
      const dist = this.cloudDistance(candidate, tmpl.points);
      // Convert distance to normalized similarity score [0, 1]
      const score = Math.max(0, 1 - dist / 0.52);

      scoredTemplates.push({
        char: tmpl.char,
        score: Math.round(score * 100) / 100,
        templateName: tmpl.name,
      });
    }

    scoredTemplates.sort((a, b) => b.score - a.score);

    // Filter to distinct characters in top results
    const uniqueResults: MatchResult[] = [];
    const seenChars = new Set<string>();

    for (const res of scoredTemplates) {
      if (!seenChars.has(res.char)) {
        seenChars.add(res.char);
        uniqueResults.push(res);
        if (uniqueResults.length >= topN) break;
      }
    }

    return uniqueResults;
  }

  /**
   * Registers a canonical template from raw points
   */
  public static addTemplate(name: string, char: string, rawPoints: Point[]) {
    const normalized = this.normalize(this.resample(rawPoints, NUM_POINTS));
    this.templates.push({
      name,
      char,
      points: normalized,
    });
  }

  /**
   * Lazy initializes canonical templates for all mathematical digits, operators, and alphabet
   */
  public static ensureTemplatesLoaded() {
    if (this.templates.length > 0) return;

    // --- DIGITS 0 to 9 ---

    // Digit 0 (closed circle)
    const pts0: Point[] = [];
    for (let a = 0; a <= Math.PI * 2; a += 0.2) {
      pts0.push({ x: Math.cos(a) * 30 + 50, y: Math.sin(a) * 45 + 50 });
    }
    this.addTemplate('digit_0', '0', pts0);

    // Digit 1 (straight vertical line)
    this.addTemplate('digit_1', '1', [
      { x: 50, y: 15 },
      { x: 50, y: 50 },
      { x: 50, y: 85 },
    ]);

    // Digit 1 (with top serif flag)
    this.addTemplate('digit_1_serif', '1', [
      { x: 38, y: 25 },
      { x: 50, y: 15 },
      { x: 50, y: 85 },
    ]);

    // Digit 2 (classical curved top, diagonal, flat horizontal base)
    this.addTemplate('digit_2', '2', [
      { x: 25, y: 35 },
      { x: 35, y: 18 },
      { x: 65, y: 18 },
      { x: 75, y: 35 },
      { x: 60, y: 55 },
      { x: 25, y: 85 },
      { x: 75, y: 85 },
    ]);

    // Digit 2 (curved base / smooth handwritten 2)
    this.addTemplate('digit_2_curved', '2', [
      { x: 30, y: 30 },
      { x: 50, y: 15 },
      { x: 70, y: 30 },
      { x: 50, y: 60 },
      { x: 30, y: 85 },
      { x: 55, y: 82 },
      { x: 78, y: 85 },
    ]);

    // Digit 3 (two rounded curves)
    this.addTemplate('digit_3', '3', [
      { x: 30, y: 20 },
      { x: 70, y: 20 },
      { x: 50, y: 48 },
      { x: 75, y: 65 },
      { x: 50, y: 85 },
      { x: 25, y: 78 },
    ]);

    // Digit 4 (L shape + vertical stroke)
    this.addTemplate('digit_4', '4', [
      { x: 65, y: 15 },
      { x: 20, y: 65 },
      { x: 80, y: 65 },
      { x: 65, y: 15 },
      { x: 65, y: 88 },
    ]);

    // Digit 5 (horizontal bar, vertical down, rounded belly)
    this.addTemplate('digit_5', '5', [
      { x: 75, y: 18 },
      { x: 32, y: 18 },
      { x: 28, y: 46 },
      { x: 70, y: 48 },
      { x: 75, y: 72 },
      { x: 50, y: 88 },
      { x: 26, y: 80 },
    ]);

    // Digit 5 (2-stroke written: stem-loop first, then hat bar)
    this.addTemplate('digit_5_two_stroke', '5', [
      { x: 32, y: 25 },
      { x: 28, y: 46 },
      { x: 70, y: 48 },
      { x: 75, y: 72 },
      { x: 50, y: 88 },
      { x: 26, y: 80 },
      { x: 32, y: 20 },
      { x: 75, y: 20 },
    ]);

    // Digit 6 (smooth downward curve into bottom loop)
    this.addTemplate('digit_6', '6', [
      { x: 70, y: 16 },
      { x: 35, y: 35 },
      { x: 24, y: 62 },
      { x: 48, y: 88 },
      { x: 76, y: 70 },
      { x: 60, y: 50 },
      { x: 28, y: 60 },
    ]);

    // Digit 6 (human natural written)
    this.addTemplate('digit_6_natural', '6', [
      { x: 65, y: 15 },
      { x: 30, y: 35 },
      { x: 25, y: 60 },
      { x: 50, y: 85 },
      { x: 75, y: 65 },
      { x: 35, y: 50 },
    ]);

    // Digit 7 (horizontal top, diagonal down)
    this.addTemplate('digit_7', '7', [
      { x: 22, y: 18 },
      { x: 78, y: 18 },
      { x: 55, y: 50 },
      { x: 42, y: 88 },
    ]);

    // Digit 7 (with crossbar)
    this.addTemplate('digit_7_cross', '7', [
      { x: 22, y: 18 },
      { x: 78, y: 18 },
      { x: 55, y: 50 },
      { x: 42, y: 88 },
      { x: 35, y: 52 },
      { x: 65, y: 52 },
    ]);

    // Digit 8 (figure-8 continuous path)
    this.addTemplate('digit_8', '8', [
      { x: 50, y: 50 },
      { x: 30, y: 30 },
      { x: 50, y: 14 },
      { x: 70, y: 30 },
      { x: 50, y: 50 },
      { x: 26, y: 70 },
      { x: 50, y: 88 },
      { x: 74, y: 70 },
      { x: 50, y: 50 },
    ]);

    // Digit 9 (top loop into downward stem)
    this.addTemplate('digit_9', '9', [
      { x: 72, y: 42 },
      { x: 48, y: 14 },
      { x: 24, y: 32 },
      { x: 42, y: 52 },
      { x: 72, y: 42 },
      { x: 70, y: 75 },
      { x: 45, y: 88 },
    ]);

    // --- MATHEMATICAL OPERATORS & SYMBOLS ---

    // Operator '+' (orthogonal cross)
    this.addTemplate('op_plus', '+', [
      { x: 15, y: 50 },
      { x: 85, y: 50 },
      { x: 50, y: 15 },
      { x: 50, y: 85 },
    ]);

    // Operator '-' (flat horizontal bar)
    this.addTemplate('op_minus', '-', [
      { x: 15, y: 50 },
      { x: 50, y: 49 },
      { x: 85, y: 50 },
    ]);

    // Operator '=' (two parallel horizontal bars)
    this.addTemplate('op_equals', '=', [
      { x: 15, y: 38 },
      { x: 85, y: 38 },
      { x: 15, y: 62 },
      { x: 85, y: 62 },
    ]);

    // Operator '*' (asterisk / star: 3 crossing lines)
    this.addTemplate('op_multiply', '*', [
      { x: 15, y: 50 }, { x: 85, y: 50 },
      { x: 25, y: 25 }, { x: 75, y: 75 },
      { x: 25, y: 75 }, { x: 75, y: 25 }
    ]);

    // Diagonal cross 'x' (two crossing diagonals). The expression parser
    // promotes digit-x-digit to multiplication '×'; otherwise it stays the
    // variable 'x'. Single continuous path (no pen jumps) so resampling
    // matches multi-stroke candidates under orderless cloud distance.
    this.addTemplate('op_cross_x', 'x', [
      { x: 20, y: 20 },
      { x: 80, y: 80 },
      { x: 50, y: 50 },
      { x: 80, y: 20 },
      { x: 20, y: 80 },
    ]);

    // Division '/'
    this.addTemplate('op_div', '/', [
      { x: 25, y: 88 },
      { x: 50, y: 50 },
      { x: 75, y: 14 },
    ]);

    // Exponent '^'
    this.addTemplate('op_power', '^', [
      { x: 25, y: 70 },
      { x: 50, y: 25 },
      { x: 75, y: 70 },
    ]);

    // Parenthesis '('
    this.addTemplate('paren_open', '(', [
      { x: 65, y: 10 },
      { x: 35, y: 50 },
      { x: 65, y: 90 },
    ]);

    // Parenthesis ')'
    this.addTemplate('paren_close', ')', [
      { x: 35, y: 10 },
      { x: 65, y: 50 },
      { x: 35, y: 90 },
    ]);

    // Less Than '<'
    this.addTemplate('op_lt', '<', [
      { x: 75, y: 20 },
      { x: 25, y: 50 },
      { x: 75, y: 80 }
    ]);

    // Greater Than '>'
    this.addTemplate('op_gt', '>', [
      { x: 25, y: 20 },
      { x: 75, y: 50 },
      { x: 25, y: 80 }
    ]);

    // Square Root '√'
    this.addTemplate('sym_sqrt', 'sqrt', [
      { x: 15, y: 60 },
      { x: 28, y: 85 },
      { x: 45, y: 20 },
      { x: 88, y: 20 }
    ]);

    // Pi 'π'
    this.addTemplate('sym_pi', 'pi', [
      { x: 20, y: 25 }, { x: 80, y: 25 },
      { x: 35, y: 25 }, { x: 35, y: 80 },
      { x: 65, y: 25 }, { x: 65, y: 80 }
    ]);

    // Percent '%'
    this.addTemplate('sym_percent', '%', [
      { x: 75, y: 20 }, { x: 25, y: 80 },
      { x: 30, y: 30 }, { x: 40, y: 30 },
      { x: 65, y: 70 }, { x: 75, y: 70 }
    ]);

    // --- MATH SYMBOLS (single-glyph operators, greek, relations) ---

    // Integral '∫'
    this.addTemplate('sym_integral', '∫', [
      { x: 62, y: 10 }, { x: 46, y: 24 }, { x: 42, y: 44 },
      { x: 48, y: 58 }, { x: 58, y: 72 }, { x: 56, y: 88 }, { x: 44, y: 94 }
    ]);

    // Summation 'Σ'
    this.addTemplate('sym_sigma', 'Σ', [
      { x: 72, y: 15 }, { x: 28, y: 15 }, { x: 46, y: 50 },
      { x: 28, y: 85 }, { x: 72, y: 85 }
    ]);

    // Delta 'Δ'
    this.addTemplate('sym_delta', 'Δ', [
      { x: 50, y: 12 }, { x: 20, y: 85 }, { x: 80, y: 85 }, { x: 50, y: 12 }
    ]);

    // Theta 'θ'
    this.addTemplate('sym_theta', 'θ', [
      { x: 50, y: 32 }, { x: 34, y: 44 }, { x: 34, y: 62 },
      { x: 50, y: 74 }, { x: 66, y: 62 }, { x: 66, y: 44 }, { x: 50, y: 32 },
      { x: 26, y: 53 }, { x: 74, y: 53 }
    ]);

    // Infinity '∞'
    this.addTemplate('sym_infinity', '∞', [
      { x: 32, y: 54 }, { x: 42, y: 40 }, { x: 56, y: 54 },
      { x: 70, y: 68 }, { x: 80, y: 54 }, { x: 70, y: 40 },
      { x: 56, y: 54 }, { x: 42, y: 68 }, { x: 32, y: 54 }
    ]);

    // Less-or-equal '≤'
    this.addTemplate('sym_leq', '≤', [
      { x: 68, y: 28 }, { x: 34, y: 50 }, { x: 68, y: 72 },
      { x: 34, y: 86 }, { x: 68, y: 86 }
    ]);

    // Greater-or-equal '≥'
    this.addTemplate('sym_geq', '≥', [
      { x: 32, y: 28 }, { x: 66, y: 50 }, { x: 32, y: 72 },
      { x: 32, y: 86 }, { x: 66, y: 86 }
    ]);

    // Not-equal '≠'
    this.addTemplate('sym_neq', '≠', [
      { x: 38, y: 12 }, { x: 38, y: 88 },
      { x: 62, y: 12 }, { x: 62, y: 88 },
      { x: 26, y: 72 }, { x: 74, y: 28 }
    ]);

    // Right arrow '→'
    this.addTemplate('sym_arrow', '→', [
      { x: 18, y: 50 }, { x: 80, y: 50 },
      { x: 64, y: 36 }, { x: 80, y: 50 },
      { x: 64, y: 64 }, { x: 80, y: 50 }
    ]);

    // Plus-minus '±'
    this.addTemplate('sym_pm', '±', [
      { x: 30, y: 32 }, { x: 70, y: 32 },
      { x: 50, y: 14 }, { x: 50, y: 50 },
      { x: 30, y: 70 }, { x: 70, y: 70 }
    ]);

    // NOTE: the division sign is matched structurally (see structuralSymbols)
    // because point-cloud dots coincide with plus-sign bars.

    // --- ALPHABET: LOWERCASE (a to z) ---

    // Letter 'a'
    this.addTemplate('letter_a', 'a', [
      { x: 70, y: 35 }, { x: 50, y: 25 }, { x: 30, y: 40 },
      { x: 30, y: 70 }, { x: 55, y: 80 }, { x: 70, y: 65 },
      { x: 70, y: 25 }, { x: 70, y: 85 }
    ]);

    // Letter 'b' (vertical stem down, retrace up to mid, rounded right loop)
    this.addTemplate('letter_b', 'b', [
      { x: 25, y: 15 }, { x: 25, y: 85 },
      { x: 25, y: 50 }, { x: 55, y: 50 }, { x: 75, y: 68 }, { x: 55, y: 85 }, { x: 25, y: 85 }
    ]);

    // Letter 'c'
    this.addTemplate('letter_c', 'c', [
      { x: 75, y: 25 }, { x: 45, y: 20 }, { x: 25, y: 50 }, { x: 45, y: 80 }, { x: 75, y: 75 }
    ]);

    // Letter 'd'
    this.addTemplate('letter_d', 'd', [
      { x: 75, y: 15 }, { x: 75, y: 85 },
      { x: 65, y: 85 }, { x: 30, y: 80 }, { x: 25, y: 55 }, { x: 45, y: 40 }, { x: 75, y: 50 }
    ]);

    // Letter 'e'
    this.addTemplate('letter_e', 'e', [
      { x: 30, y: 55 }, { x: 75, y: 55 }, { x: 65, y: 25 }, { x: 35, y: 30 }, { x: 25, y: 60 }, { x: 50, y: 85 }, { x: 75, y: 80 }
    ]);

    // Letter 'f'
    this.addTemplate('letter_f', 'f', [
      { x: 65, y: 15 }, { x: 45, y: 15 }, { x: 40, y: 85 },
      { x: 25, y: 45 }, { x: 60, y: 45 }
    ]);

    // Letter 'g'
    this.addTemplate('letter_g', 'g', [
      { x: 70, y: 35 }, { x: 50, y: 20 }, { x: 30, y: 35 }, { x: 50, y: 55 }, { x: 70, y: 35 },
      { x: 70, y: 85 }, { x: 45, y: 105 }, { x: 25, y: 95 }
    ]);

    // Letter 'h'
    this.addTemplate('letter_h', 'h', [
      { x: 25, y: 15 }, { x: 25, y: 85 },
      { x: 25, y: 50 }, { x: 50, y: 40 }, { x: 75, y: 50 }, { x: 75, y: 85 }
    ]);

    // Letter 'i'
    this.addTemplate('letter_i', 'i', [
      { x: 50, y: 40 }, { x: 50, y: 85 },
      { x: 50, y: 20 }, { x: 50, y: 24 }
    ]);

    // Letter 'j'
    this.addTemplate('letter_j', 'j', [
      { x: 55, y: 40 }, { x: 55, y: 90 }, { x: 35, y: 100 }, { x: 25, y: 85 },
      { x: 55, y: 20 }, { x: 55, y: 24 }
    ]);

    // Letter 'k'
    this.addTemplate('letter_k', 'k', [
      { x: 25, y: 15 }, { x: 25, y: 85 },
      { x: 75, y: 35 }, { x: 30, y: 60 }, { x: 75, y: 85 }
    ]);

    // Letter 'l' (vertical stem with slight curved bottom curl)
    this.addTemplate('letter_l', 'l', [
      { x: 45, y: 15 }, { x: 45, y: 70 }, { x: 60, y: 85 }
    ]);

    // Letter 'm'
    this.addTemplate('letter_m', 'm', [
      { x: 20, y: 85 }, { x: 20, y: 35 }, { x: 35, y: 25 }, { x: 50, y: 50 },
      { x: 65, y: 25 }, { x: 80, y: 45 }, { x: 80, y: 85 }
    ]);

    // Letter 'n'
    this.addTemplate('letter_n', 'n', [
      { x: 25, y: 85 }, { x: 25, y: 35 }, { x: 45, y: 25 }, { x: 75, y: 45 }, { x: 75, y: 85 }
    ]);

    // Letter 'o'
    this.addTemplate('letter_o', 'o', pts0);

    // Letter 'p'
    this.addTemplate('letter_p', 'p', [
      { x: 25, y: 35 }, { x: 25, y: 105 },
      { x: 25, y: 40 }, { x: 65, y: 40 }, { x: 75, y: 55 }, { x: 65, y: 70 }, { x: 25, y: 70 }
    ]);

    // Letter 'q'
    this.addTemplate('letter_q', 'q', [
      { x: 70, y: 40 }, { x: 35, y: 40 }, { x: 25, y: 55 }, { x: 35, y: 70 }, { x: 70, y: 70 },
      { x: 70, y: 35 }, { x: 70, y: 105 }
    ]);

    // Letter 'r'
    this.addTemplate('letter_r', 'r', [
      { x: 30, y: 85 }, { x: 30, y: 35 }, { x: 45, y: 28 }, { x: 70, y: 35 }
    ]);

    // Letter 's'
    this.addTemplate('letter_s', 's', [
      { x: 70, y: 25 }, { x: 45, y: 20 }, { x: 30, y: 38 }, { x: 65, y: 60 }, { x: 55, y: 85 }, { x: 25, y: 80 }
    ]);

    // Letter 't'
    this.addTemplate('letter_t', 't', [
      { x: 45, y: 15 }, { x: 45, y: 80 }, { x: 65, y: 85 },
      { x: 25, y: 35 }, { x: 65, y: 35 }
    ]);

    // Letter 'u'
    this.addTemplate('letter_u', 'u', [
      { x: 25, y: 35 }, { x: 25, y: 75 }, { x: 50, y: 85 }, { x: 75, y: 75 }, { x: 75, y: 35 }, { x: 75, y: 85 }
    ]);

    // Letter 'v'
    this.addTemplate('letter_v', 'v', [
      { x: 20, y: 25 }, { x: 50, y: 85 }, { x: 80, y: 25 }
    ]);

    // Letter 'w'
    this.addTemplate('letter_w', 'w', [
      { x: 15, y: 30 }, { x: 35, y: 85 }, { x: 50, y: 50 }, { x: 65, y: 85 }, { x: 85, y: 30 }
    ]);

    // Variable 'x' (crossing diagonals: \ and /)
    this.addTemplate('var_x_cross', 'x', [
      { x: 20, y: 20 },
      { x: 50, y: 50 },
      { x: 80, y: 80 },
      { x: 80, y: 20 },
      { x: 50, y: 50 },
      { x: 20, y: 80 },
    ]);

    // Variable 'x' (single continuous diagonal stroke: down-right, up-right, down-left)
    this.addTemplate('var_x_continuous', 'x', [
      { x: 20, y: 15 },
      { x: 50, y: 50 },
      { x: 80, y: 85 },
      { x: 80, y: 15 },
      { x: 50, y: 50 },
      { x: 20, y: 85 },
    ]);

    // Variable 'x' (cursive / double curve x: left curve then right curve)
    this.addTemplate('var_x_cursive', 'x', [
      { x: 45, y: 20 },
      { x: 25, y: 35 },
      { x: 25, y: 65 },
      { x: 45, y: 80 },
      { x: 50, y: 50 },
      { x: 55, y: 20 },
      { x: 75, y: 35 },
      { x: 75, y: 65 },
      { x: 55, y: 80 },
    ]);

    // Variable 'y' (v-top with tail down)
    this.addTemplate('var_y', 'y', [
      { x: 20, y: 20 },
      { x: 50, y: 55 },
      { x: 80, y: 20 },
      { x: 50, y: 55 },
      { x: 35, y: 105 },
    ]);

    // Letter 'z'
    this.addTemplate('letter_z', 'z', [
      { x: 25, y: 25 }, { x: 75, y: 25 }, { x: 30, y: 85 }, { x: 75, y: 85 }
    ]);

    // --- ALPHABET: UPPERCASE (A to Z) ---

    // Letter 'A'
    this.addTemplate('letter_A', 'A', [
      { x: 20, y: 85 }, { x: 50, y: 15 }, { x: 80, y: 85 },
      { x: 32, y: 55 }, { x: 68, y: 55 }
    ]);

    // Letter 'B'
    this.addTemplate('letter_B', 'B', [
      { x: 25, y: 15 }, { x: 25, y: 85 },
      { x: 25, y: 15 }, { x: 65, y: 25 }, { x: 55, y: 50 }, { x: 25, y: 50 },
      { x: 55, y: 50 }, { x: 70, y: 65 }, { x: 55, y: 85 }, { x: 25, y: 85 }
    ]);

    // Letter 'C'
    this.addTemplate('letter_C', 'C', [
      { x: 80, y: 25 }, { x: 45, y: 15 }, { x: 20, y: 50 }, { x: 45, y: 85 }, { x: 80, y: 75 }
    ]);

    // Letter 'D'
    this.addTemplate('letter_D', 'D', [
      { x: 25, y: 15 }, { x: 25, y: 85 },
      { x: 25, y: 15 }, { x: 60, y: 20 }, { x: 80, y: 50 }, { x: 60, y: 80 }, { x: 25, y: 85 }
    ]);

    // Letter 'E'
    this.addTemplate('letter_E', 'E', [
      { x: 75, y: 18 }, { x: 25, y: 18 }, { x: 25, y: 85 }, { x: 75, y: 85 },
      { x: 25, y: 50 }, { x: 65, y: 50 }
    ]);

    // Letter 'F'
    this.addTemplate('letter_F', 'F', [
      { x: 75, y: 18 }, { x: 25, y: 18 }, { x: 25, y: 85 },
      { x: 25, y: 50 }, { x: 65, y: 50 }
    ]);

    // Letter 'G'
    this.addTemplate('letter_G', 'G', [
      { x: 80, y: 25 }, { x: 45, y: 15 }, { x: 20, y: 50 }, { x: 45, y: 85 }, { x: 75, y: 85 }, { x: 75, y: 55 }, { x: 55, y: 55 }
    ]);

    // Letter 'H'
    this.addTemplate('letter_H', 'H', [
      { x: 25, y: 15 }, { x: 25, y: 85 },
      { x: 75, y: 15 }, { x: 75, y: 85 },
      { x: 25, y: 50 }, { x: 75, y: 50 }
    ]);

    // Letter 'I'
    this.addTemplate('letter_I', 'I', [
      { x: 35, y: 15 }, { x: 65, y: 15 },
      { x: 50, y: 15 }, { x: 50, y: 85 },
      { x: 35, y: 85 }, { x: 65, y: 85 }
    ]);

    // Letter 'K'
    this.addTemplate('letter_K', 'K', [
      { x: 25, y: 15 }, { x: 25, y: 85 },
      { x: 75, y: 20 }, { x: 28, y: 50 }, { x: 75, y: 85 }
    ]);

    // Letter 'L'
    this.addTemplate('letter_L', 'L', [
      { x: 25, y: 15 }, { x: 25, y: 85 }, { x: 75, y: 85 }
    ]);

    // Letter 'M'
    this.addTemplate('letter_M', 'M', [
      { x: 20, y: 85 }, { x: 20, y: 15 }, { x: 50, y: 55 }, { x: 80, y: 15 }, { x: 80, y: 85 }
    ]);

    // Letter 'N'
    this.addTemplate('letter_N', 'N', [
      { x: 25, y: 85 }, { x: 25, y: 15 }, { x: 75, y: 85 }, { x: 75, y: 15 }
    ]);

    // Letter 'P'
    this.addTemplate('letter_P', 'P', [
      { x: 25, y: 15 }, { x: 25, y: 85 },
      { x: 25, y: 15 }, { x: 65, y: 18 }, { x: 75, y: 35 }, { x: 65, y: 52 }, { x: 25, y: 52 }
    ]);

    // Letter 'R'
    this.addTemplate('letter_R', 'R', [
      { x: 25, y: 15 }, { x: 25, y: 85 },
      { x: 25, y: 15 }, { x: 65, y: 18 }, { x: 75, y: 35 }, { x: 65, y: 52 }, { x: 25, y: 52 },
      { x: 45, y: 52 }, { x: 75, y: 85 }
    ]);

    // Letter 'S'
    this.addTemplate('letter_S', 'S', [
      { x: 75, y: 25 }, { x: 45, y: 15 }, { x: 25, y: 35 }, { x: 75, y: 65 }, { x: 55, y: 85 }, { x: 25, y: 75 }
    ]);

    // Letter 'T'
    this.addTemplate('letter_T', 'T', [
      { x: 18, y: 18 }, { x: 82, y: 18 },
      { x: 50, y: 18 }, { x: 50, y: 85 }
    ]);

    // Letter 'U'
    this.addTemplate('letter_U', 'U', [
      { x: 25, y: 18 }, { x: 25, y: 65 }, { x: 50, y: 85 }, { x: 75, y: 65 }, { x: 75, y: 18 }
    ]);

    // Letter 'V'
    this.addTemplate('letter_V', 'V', [
      { x: 20, y: 18 }, { x: 50, y: 85 }, { x: 80, y: 18 }
    ]);

    // Letter 'W'
    this.addTemplate('letter_W', 'W', [
      { x: 15, y: 18 }, { x: 35, y: 85 }, { x: 50, y: 45 }, { x: 65, y: 85 }, { x: 85, y: 18 }
    ]);

    // Letter 'X'
    this.addTemplate('letter_X', 'X', [
      { x: 20, y: 18 }, { x: 80, y: 85 },
      { x: 80, y: 18 }, { x: 20, y: 85 }
    ]);

    // Letter 'Y'
    this.addTemplate('letter_Y', 'Y', [
      { x: 20, y: 18 }, { x: 50, y: 50 }, { x: 80, y: 18 },
      { x: 50, y: 50 }, { x: 50, y: 85 }
    ]);

    // Letter 'Z'
    this.addTemplate('letter_Z', 'Z', [
      { x: 20, y: 18 }, { x: 80, y: 18 }, { x: 25, y: 85 }, { x: 80, y: 85 }
    ]);
  }
}
