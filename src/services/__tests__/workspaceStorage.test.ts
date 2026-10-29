import { describe, it, expect, beforeEach } from 'vitest';
import { createDefaultWorkspace, loadWorkspace, saveWorkspace } from '../workspaceStorage';
import type { WorkspaceState } from '../../types';

describe('Workspace Storage & Data Protection', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it('creates default workspace with multiple pages and persistent folders', () => {
    const ws = createDefaultWorkspace();
    expect(ws.pages.length).toBeGreaterThan(0);
    expect(ws.activePageId).toBeTruthy();
    expect(ws.folders.length).toBeGreaterThanOrEqual(2);
  });

  it('persists and loads workspace state accurately from localStorage', () => {
    const ws = createDefaultWorkspace();
    ws.pages[0].strokes = [
      {
        id: 's-1',
        points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
        color: '#fff',
        width: 3,
        createdAt: 12345,
      },
    ];

    saveWorkspace(ws);
    const loaded = loadWorkspace();
    expect(loaded.pages[0].strokes.length).toBe(1);
    expect(loaded.pages[0].strokes[0].id).toBe('s-1');
  });

  it('safely handles fallback when all pages are deleted', () => {
    const ws: WorkspaceState = {
      folders: [],
      pages: [],
      activePageId: 'non-existent',
    };
    saveWorkspace(ws);

    // Loading should fall back to valid default workspace preventing app crash
    const loaded = loadWorkspace();
    expect(loaded.pages.length).toBeGreaterThan(0);
  });
});
