import { describe, it, expect } from 'vitest';
import {
  worldToScreen,
  screenToWorld,
  clampZoom,
  zoomAtScreenPoint,
  computeBoundingBox,
  isBoxInViewport,
} from '../engine/coordinates';
import { Viewport } from '../types/canvas';

describe('Coordinate Transformation Engine', () => {
  it('converts world coordinates to screen coordinates accurately', () => {
    const viewport: Viewport = { x: 100, y: 50, zoom: 2 };
    const worldPt = { x: 200, y: 150 };
    const screenPt = worldToScreen(worldPt, viewport);

    expect(screenPt.x).toBe((200 - 100) * 2); // 200
    expect(screenPt.y).toBe((150 - 50) * 2); // 200
  });

  it('converts screen coordinates back to world coordinates accurately (bijective inverse)', () => {
    const viewport: Viewport = { x: 75, y: -40, zoom: 1.5 };
    const originalWorld = { x: 320, y: 180 };
    const screenPt = worldToScreen(originalWorld, viewport);
    const convertedBack = screenToWorld(screenPt, viewport);

    expect(convertedBack.x).toBeCloseTo(originalWorld.x, 5);
    expect(convertedBack.y).toBeCloseTo(originalWorld.y, 5);
  });

  it('clamps zoom values within min and max boundaries', () => {
    expect(clampZoom(0.05)).toBe(0.1);
    expect(clampZoom(7.5)).toBe(5.0);
    expect(clampZoom(2.5)).toBe(2.5);
  });

  it('performs focal zooming keeping target screen point stationary in world space', () => {
    const viewport: Viewport = { x: 0, y: 0, zoom: 1 };
    const cursorScreen = { x: 400, y: 300 };

    const worldBefore = screenToWorld(cursorScreen, viewport);
    const updatedViewport = zoomAtScreenPoint(viewport, cursorScreen, 2.0);
    const worldAfter = screenToWorld(cursorScreen, updatedViewport);

    expect(updatedViewport.zoom).toBe(2.0);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 4);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 4);
  });

  it('computes bounding box for strokes', () => {
    const points = [
      { x: 10, y: 20 },
      { x: 50, y: 5 },
      { x: 30, y: 80 },
    ];
    const bbox = computeBoundingBox(points);
    expect(bbox).toEqual({ minX: 10, minY: 5, maxX: 50, maxY: 80 });
  });

  it('checks if bounding box is visible within viewport', () => {
    const viewport: Viewport = { x: 0, y: 0, zoom: 1 };
    const screenSize = { width: 800, height: 600 };

    const insideBbox = { minX: 100, minY: 100, maxX: 200, maxY: 200 };
    expect(isBoxInViewport(insideBbox, viewport, screenSize)).toBe(true);

    const outsideBbox = { minX: 1000, minY: 1000, maxX: 1200, maxY: 1200 };
    expect(isBoxInViewport(outsideBbox, viewport, screenSize)).toBe(false);
  });
});
