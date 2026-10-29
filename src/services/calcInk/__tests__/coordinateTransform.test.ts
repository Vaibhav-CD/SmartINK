import { describe, it, expect } from 'vitest';
import { 
  screenToWorld, 
  worldToScreen, 
  getStrokesBoundingBox, 
  isStrokeIntersected,
  isScratchGesture
} from '../coordinateTransform';
import type { Stroke, Point } from '../../../types';

describe('CalcInk Coordinate Transformations & Spatial Utilities', () => {
  const transform = { x: 100, y: 50, scale: 2.0 };

  it('converts screen coordinate to world coordinate accurately', () => {
    // worldX = (screenX - tx) / scale = (300 - 100) / 2.0 = 100
    // worldY = (screenY - ty) / scale = (250 - 50) / 2.0 = 100
    const world = screenToWorld(300, 250, transform);
    expect(world.x).toBe(100);
    expect(world.y).toBe(100);
  });

  it('converts world coordinate back to screen coordinate invertibly', () => {
    const screen = worldToScreen(100, 100, transform);
    expect(screen.x).toBe(300);
    expect(screen.y).toBe(250);

    // Invertibility check
    const roundTrip = screenToWorld(screen.x, screen.y, transform);
    expect(roundTrip.x).toBe(100);
    expect(roundTrip.y).toBe(100);
  });

  it('computes accurate bounding box for a set of strokes', () => {
    const testStrokes: Stroke[] = [
      {
        id: 's1',
        points: [{ x: 10, y: 20 }, { x: 50, y: 80 }],
        color: '#a3e635',
        width: 3,
        createdAt: 1000,
      },
      {
        id: 's2',
        points: [{ x: 30, y: 10 }, { x: 90, y: 60 }],
        color: '#a3e635',
        width: 3,
        createdAt: 1001,
      },
    ];

    const bbox = getStrokesBoundingBox(testStrokes);
    expect(bbox).not.toBeNull();
    expect(bbox?.minX).toBe(10);
    expect(bbox?.maxX).toBe(90);
    expect(bbox?.minY).toBe(10);
    expect(bbox?.maxY).toBe(80);
    expect(bbox?.width).toBe(80);
    expect(bbox?.height).toBe(70);
  });

  it('detects stroke intersection within eraser radius', () => {
    const stroke: Stroke = {
      id: 's1',
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      color: '#a3e635',
      width: 4,
      createdAt: 1000,
    };

    // Eraser directly on the line
    expect(isStrokeIntersected(stroke, { x: 50, y: 2 }, 5)).toBe(true);
    // Eraser outside the radius
    expect(isStrokeIntersected(stroke, { x: 50, y: 20 }, 5)).toBe(false);
  });

  it('detects scratch-to-erase zigzag gesture', () => {
    // Generate a horizontal back-and-forth zigzag (scratching)
    const points: Point[] = [];
    let currX = 50;
    let currY = 50;
    for (let rep = 0; rep < 6; rep++) {
      const targetX = rep % 2 === 0 ? 120 : 40;
      const steps = 6;
      for (let s = 1; s <= steps; s++) {
        points.push({
          x: currX + ((targetX - currX) * s) / steps,
          y: currY + (Math.random() * 4 - 2),
        });
      }
      currX = targetX;
    }

    const isScratch = isScratchGesture(points);
    expect(isScratch).toBe(true);
  });

  it('distinguishes a normal stroke from a scratch gesture', () => {
    // Single smooth curve (e.g. drawing digit '1' or '-')
    const normalStrokePoints: Point[] = [
      { x: 10, y: 10 },
      { x: 15, y: 25 },
      { x: 20, y: 40 },
      { x: 25, y: 55 },
      { x: 30, y: 70 },
    ];
    expect(isScratchGesture(normalStrokePoints)).toBe(false);
  });
});
