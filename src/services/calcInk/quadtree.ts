// Created by VaibhavCD
/**
 * Quadtree Spatial Indexing for Infinite Canvas Viewports.
 * Provides O(log N) frustum culling, collision detection, and region queries.
 */

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface QuadtreeItem<T> {
  id: string;
  bounds: AABB;
  data: T;
}

export function aabbIntersects(a: AABB, b: AABB): boolean {
  return !(
    b.minX > a.maxX ||
    b.maxX < a.minX ||
    b.minY > a.maxY ||
    b.maxY < a.minY
  );
}

export function aabbContains(container: AABB, inner: AABB): boolean {
  return (
    inner.minX >= container.minX &&
    inner.maxX <= container.maxX &&
    inner.minY >= container.minY &&
    inner.maxY <= container.maxY
  );
}

export function aabbFromPoints(points: Array<{ x: number; y: number }>, padding = 0): AABB {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}

export class Quadtree<T> {
  private bounds: AABB;
  private maxItems: number;
  private maxDepth: number;
  private depth: number;
  private items: QuadtreeItem<T>[] = [];
  private children: Quadtree<T>[] | null = null;

  constructor(
    bounds: AABB = { minX: -100000, minY: -100000, maxX: 100000, maxY: 100000 },
    maxItems = 8,
    maxDepth = 8,
    depth = 0
  ) {
    this.bounds = bounds;
    this.maxItems = maxItems;
    this.maxDepth = maxDepth;
    this.depth = depth;
  }

  public clear(): void {
    this.items = [];
    if (this.children) {
      for (const child of this.children) {
        child.clear();
      }
      this.children = null;
    }
  }

  public insert(item: QuadtreeItem<T>): boolean {
    if (!aabbIntersects(this.bounds, item.bounds)) {
      return false;
    }

    if (this.children) {
      for (const child of this.children) {
        if (child.insert(item)) {
          return true;
        }
      }
    }

    this.items.push(item);

    if (
      !this.children &&
      this.items.length > this.maxItems &&
      this.depth < this.maxDepth
    ) {
      const kids = this.subdivide();
      const remaining: QuadtreeItem<T>[] = [];
      for (const it of this.items) {
        let insertedIntoChild = false;
        for (const child of kids) {
          if (aabbContains(child.bounds, it.bounds)) {
            child.insert(it);
            insertedIntoChild = true;
            break;
          }
        }
        if (!insertedIntoChild) {
          remaining.push(it);
        }
      }
      this.items = remaining;
    }

    return true;
  }

  public remove(id: string): boolean {
    const idx = this.items.findIndex((it) => it.id === id);
    if (idx !== -1) {
      this.items.splice(idx, 1);
      return true;
    }
    if (this.children) {
      for (const child of this.children) {
        if (child.remove(id)) {
          return true;
        }
      }
    }
    return false;
  }

  public query(searchRange: AABB): T[] {
    const results: T[] = [];
    const seen = new Set<string>();
    this.queryInternal(searchRange, results, seen);
    return results;
  }

  public queryItems(searchRange: AABB): QuadtreeItem<T>[] {
    const results: QuadtreeItem<T>[] = [];
    const seen = new Set<string>();
    this.queryItemsInternal(searchRange, results, seen);
    return results;
  }

  public queryPoint(p: { x: number; y: number }, radius = 0): T[] {
    const box: AABB = {
      minX: p.x - radius,
      minY: p.y - radius,
      maxX: p.x + radius,
      maxY: p.y + radius,
    };
    return this.query(box);
  }

  public size(): number {
    let count = this.items.length;
    if (this.children) {
      for (const child of this.children) {
        count += child.size();
      }
    }
    return count;
  }

  private subdivide(): Quadtree<T>[] {
    const { minX, minY, maxX, maxY } = this.bounds;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const nextDepth = this.depth + 1;

    // NW, NE, SW, SE
    const children = [
      new Quadtree<T>({ minX, minY, maxX: midX, maxY: midY }, this.maxItems, this.maxDepth, nextDepth),
      new Quadtree<T>({ minX: midX, minY, maxX, maxY: midY }, this.maxItems, this.maxDepth, nextDepth),
      new Quadtree<T>({ minX, minY: midY, maxX: midX, maxY }, this.maxItems, this.maxDepth, nextDepth),
      new Quadtree<T>({ minX: midX, minY: midY, maxX, maxY }, this.maxItems, this.maxDepth, nextDepth),
    ];
    this.children = children;
    return children;
  }

  private queryInternal(searchRange: AABB, out: T[], seen: Set<string>): void {
    if (!aabbIntersects(this.bounds, searchRange)) {
      return;
    }

    for (const it of this.items) {
      if (!seen.has(it.id) && aabbIntersects(it.bounds, searchRange)) {
        seen.add(it.id);
        out.push(it.data);
      }
    }

    if (this.children) {
      for (const child of this.children) {
        child.queryInternal(searchRange, out, seen);
      }
    }
  }

  private queryItemsInternal(searchRange: AABB, out: QuadtreeItem<T>[], seen: Set<string>): void {
    if (!aabbIntersects(this.bounds, searchRange)) {
      return;
    }

    for (const it of this.items) {
      if (!seen.has(it.id) && aabbIntersects(it.bounds, searchRange)) {
        seen.add(it.id);
        out.push(it);
      }
    }

    if (this.children) {
      for (const child of this.children) {
        child.queryItemsInternal(searchRange, out, seen);
      }
    }
  }
}
