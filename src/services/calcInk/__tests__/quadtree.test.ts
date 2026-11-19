// Created by VaibhavCD
import { describe, it, expect } from 'vitest';
import {
  Quadtree,
  aabbIntersects,
  aabbContains,
  aabbFromPoints,
  type AABB,
} from '../quadtree';

describe('Quadtree Spatial Indexing for Infinite Canvas', () => {
  it('detects bounding box intersections and containment correctly', () => {
    const boxA: AABB = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    const boxB: AABB = { minX: 50, minY: 50, maxX: 150, maxY: 150 };
    const boxC: AABB = { minX: 200, minY: 200, maxX: 300, maxY: 300 };
    const innerBox: AABB = { minX: 10, minY: 10, maxX: 40, maxY: 40 };

    expect(aabbIntersects(boxA, boxB)).toBe(true);
    expect(aabbIntersects(boxA, boxC)).toBe(false);
    expect(aabbContains(boxA, innerBox)).toBe(true);
    expect(aabbContains(innerBox, boxA)).toBe(false);
  });

  it('computes AABB from point arrays with optional stroke padding', () => {
    const points = [
      { x: 10, y: 20 },
      { x: 50, y: 80 },
      { x: 30, y: 10 },
    ];
    const box = aabbFromPoints(points, 2);
    expect(box.minX).toBe(8);
    expect(box.minY).toBe(8);
    expect(box.maxX).toBe(52);
    expect(box.maxY).toBe(82);
  });

  it('inserts and queries items inside a spatial frustum', () => {
    const qt = new Quadtree<{ id: string; name: string }>();

    qt.insert({
      id: 'stroke-1',
      bounds: { minX: 10, minY: 10, maxX: 30, maxY: 30 },
      data: { id: 'stroke-1', name: 'visible stroke' },
    });

    qt.insert({
      id: 'stroke-2',
      bounds: { minX: 5000, minY: 5000, maxX: 5050, maxY: 5050 },
      data: { id: 'stroke-2', name: 'distant stroke' },
    });

    // Viewport frustum near the origin
    const frustum: AABB = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    const visible = qt.query(frustum);

    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe('stroke-1');
  });

  it('subdivides nodes when exceeding item capacity and handles large collections', () => {
    const qt = new Quadtree<number>(
      { minX: 0, minY: 0, maxX: 1000, maxY: 1000 },
      4, // maxItems
      4  // maxDepth
    );

    // Insert 40 items across the canvas
    for (let i = 0; i < 40; i++) {
      const x = (i % 8) * 100;
      const y = Math.floor(i / 8) * 100;
      qt.insert({
        id: `item-${i}`,
        bounds: { minX: x, minY: y, maxX: x + 20, maxY: y + 20 },
        data: i,
      });
    }

    expect(qt.size()).toBe(40);

    // Query top-left region
    const queryBox: AABB = { minX: 0, minY: 0, maxX: 250, maxY: 150 };
    const queried = qt.query(queryBox);
    expect(queried.length).toBeGreaterThan(0);
    expect(queried.length).toBeLessThan(40);
  });

  it('queries items around a specific point for eraser collision', () => {
    const qt = new Quadtree<string>();

    qt.insert({
      id: 'stroke-near',
      bounds: { minX: 95, minY: 95, maxX: 105, maxY: 105 },
      data: 'hit',
    });

    qt.insert({
      id: 'stroke-far',
      bounds: { minX: 400, minY: 400, maxX: 450, maxY: 450 },
      data: 'miss',
    });

    const hits = qt.queryPoint({ x: 100, y: 100 }, 15);
    expect(hits).toEqual(['hit']);
  });

  it('removes items cleanly from the spatial tree', () => {
    const qt = new Quadtree<string>();

    qt.insert({
      id: 's1',
      bounds: { minX: 10, minY: 10, maxX: 20, maxY: 20 },
      data: 'first',
    });

    expect(qt.size()).toBe(1);
    expect(qt.remove('s1')).toBe(true);
    expect(qt.size()).toBe(0);
    expect(qt.query({ minX: 0, minY: 0, maxX: 100, maxY: 100 })).toEqual([]);
  });
});
