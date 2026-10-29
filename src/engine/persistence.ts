import { openDB, IDBPDatabase } from 'idb';
import { WorkspaceData, NotebookPage } from '../types/workspace';
import { Stroke } from '../types/canvas';
import { SolvedEquation } from '../types/math';
import { DocumentItem } from '../types/document';

const DB_NAME = 'SmartInkWorkspaceDB';
const DB_VERSION = 1;
const STORE_NAME = 'workspaces';
const LOCAL_STORAGE_KEY = 'smartink_fallback_workspace';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported in this environment'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export const INITIAL_WORKSPACE_ID = 'default-workspace';
export const INITIAL_PAGE_ID = 'page-1';

export function createInitialWorkspace(): WorkspaceData {
  const initialPage: NotebookPage = {
    id: INITIAL_PAGE_ID,
    title: 'Canvas Note 1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    viewport: { x: 0, y: 0, zoom: 1 },
    gridType: 'dots',
  };

  return {
    id: INITIAL_WORKSPACE_ID,
    name: 'SmartInk Living Notebook',
    activePageId: INITIAL_PAGE_ID,
    pages: [initialPage],
    strokes: {
      [INITIAL_PAGE_ID]: [],
    },
    equations: {
      [INITIAL_PAGE_ID]: [],
    },
    documents: [],
    globalVariables: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Saves workspace data to IndexedDB with automatic LocalStorage fallback.
 */
export async function saveWorkspaceData(data: WorkspaceData): Promise<void> {
  data.updatedAt = Date.now();
  try {
    const db = await getDB();
    await db.put(STORE_NAME, data);
  } catch (err) {
    // Fallback to LocalStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (lsErr) {
      console.warn('Persistence save error:', lsErr);
    }
  }
}

/**
 * Loads workspace data from IndexedDB or LocalStorage fallback.
 */
export async function loadWorkspaceData(id = INITIAL_WORKSPACE_ID): Promise<WorkspaceData> {
  try {
    const db = await getDB();
    const result = await db.get(STORE_NAME, id);
    if (result) return result;
  } catch {
    // Try localStorage fallback
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id === id) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse error
  }

  // If nothing saved yet, create fresh workspace
  const initial = createInitialWorkspace();
  await saveWorkspaceData(initial);
  return initial;
}

/**
 * Exports current workspace as downloadable JSON backup file.
 */
export function exportWorkspaceAsJSON(data: WorkspaceData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smartink-${data.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports active canvas as high-resolution PNG image.
 */
export function exportCanvasAsPNG(canvas: HTMLCanvasElement, filename = 'smartink-canvas.png') {
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/**
 * Exports active strokes as vector SVG string.
 */
export function exportStrokesAsSVG(strokes: Stroke[], width = 1920, height = 1080): string {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #080c14;">\n`;

  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    const pathData = stroke.points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const opacity = stroke.opacity ?? 1;
    svg += `  <path d="${pathData}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.size}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" />\n`;
  }

  svg += `</svg>`;
  return svg;
}
