import { describe, it, expect } from 'vitest';
import { PointCloudRecognizer } from '../pointCloudRecognizer';

describe('PointCloudRecognizer ($P/$Q Point-Cloud Matching)', () => {
  it('accurately classifies digit 2 with natural human stroke points', () => {
    // User drawing a 2: starts top-left, curves top-right, diagonals down-left, horizontal base
    const pts2 = [
      { x: 30, y: 35 },
      { x: 45, y: 20 },
      { x: 65, y: 22 },
      { x: 70, y: 38 },
      { x: 55, y: 55 },
      { x: 28, y: 82 },
      { x: 75, y: 84 },
    ];
    const match = PointCloudRecognizer.classify([pts2]);
    expect(match.char).toBe('2');
    expect(match.score).toBeGreaterThan(0.65);
  });

  it('accurately classifies cursive/looped x', () => {
    // User drawing a cursive x with left curve and right curve
    const ptsX = [
      { x: 40, y: 20 },
      { x: 25, y: 40 },
      { x: 25, y: 65 },
      { x: 45, y: 80 },
      { x: 55, y: 20 },
      { x: 75, y: 40 },
      { x: 75, y: 65 },
      { x: 55, y: 80 },
    ];
    const match = PointCloudRecognizer.classify([ptsX]);
    expect(match.char).toBe('x');
  });

  it('accurately classifies two-stroke 5', () => {
    const strokeBody = [
      { x: 30, y: 25 },
      { x: 28, y: 45 },
      { x: 68, y: 48 },
      { x: 72, y: 70 },
      { x: 48, y: 86 },
      { x: 25, y: 78 },
    ];
    const strokeHat = [
      { x: 30, y: 20 },
      { x: 72, y: 20 },
    ];
    const match = PointCloudRecognizer.classify([strokeBody, strokeHat]);
    expect(match.char).toBe('5');
  });

  it('accurately classifies two-stroke +', () => {
    const h = [{ x: 20, y: 50 }, { x: 80, y: 50 }];
    const v = [{ x: 50, y: 20 }, { x: 50, y: 80 }];
    const match = PointCloudRecognizer.classify([h, v]);
    expect(match.char).toBe('+');
  });

  it('accurately classifies digit 1', () => {
    const v = [{ x: 50, y: 15 }, { x: 50, y: 50 }, { x: 50, y: 85 }];
    const match = PointCloudRecognizer.classify([v]);
    expect(match.char).toBe('1');
  });
});
