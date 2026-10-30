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

  it('accurately classifies uppercase J with a hooked stem', () => {
    const bar = [{ x: 24, y: 16 }, { x: 74, y: 16 }];
    const stem = [
      { x: 61, y: 16 },
      { x: 60, y: 60 },
      { x: 50, y: 79 },
      { x: 33, y: 81 },
      { x: 23, y: 69 },
    ];
    const match = PointCloudRecognizer.classify([bar, stem]);
    expect(match.char).toBe('J');
    expect(match.score).toBeGreaterThan(0.65);
  });

  it('accurately classifies uppercase Q with a tail', () => {
    const bowl: { x: number; y: number }[] = [];
    for (let a = 0; a <= Math.PI * 2; a += 0.25) {
      bowl.push({ x: Math.cos(a) * 30 + 50, y: Math.sin(a) * 42 + 48 });
    }
    const tail = [{ x: 64, y: 62 }, { x: 77, y: 77 }, { x: 89, y: 91 }];
    const match = PointCloudRecognizer.classify([bowl, tail]);
    expect(match.char).toBe('Q');
    expect(match.score).toBeGreaterThan(0.65);
  });

  it('classifies jittered variants of confusable glyphs', () => {
    const slanted1 = [
      { x: 60, y: 14 }, { x: 54, y: 50 }, { x: 48, y: 86 },
    ];
    expect(PointCloudRecognizer.classify([slanted1]).char).toBe('1');

    const rotated7 = [
      { x: 16, y: 26 }, { x: 74, y: 8 }, { x: 44, y: 84 },
    ];
    expect(PointCloudRecognizer.classify([rotated7]).char).toBe('7');

    const angular5 = [
      { x: 74, y: 18 }, { x: 32, y: 14 }, { x: 30, y: 44 },
      { x: 60, y: 40 }, { x: 76, y: 56 }, { x: 68, y: 78 }, { x: 36, y: 84 },
    ];
    expect(PointCloudRecognizer.classify([angular5]).char).toBe('5');
  });

  it('still classifies a plain circle as 0, not Q', () => {
    const circle: { x: number; y: number }[] = [];
    for (let a = 0; a <= Math.PI * 2; a += 0.25) {
      circle.push({ x: Math.cos(a) * 30 + 50, y: Math.sin(a) * 42 + 48 });
    }
    const match = PointCloudRecognizer.classify([circle]);
    expect(match.char).toBe('0');
  });
});
