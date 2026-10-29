import { create } from 'zustand';
import { Point, Stroke, ToolType, Viewport } from '../types/canvas';
import { NotebookPage, WorkspaceData } from '../types/workspace';
import { SolvedEquation, DynamicScrubber } from '../types/math';
import {
  createInitialWorkspace,
  INITIAL_PAGE_ID,
  INITIAL_WORKSPACE_ID,
  loadWorkspaceData,
  saveWorkspaceData,
} from '../engine/persistence';
import { clampZoom, zoomAtScreenPoint } from '../engine/coordinates';
import { parseAndEvaluateExpression } from '../engine/mathEngine';
import { generateSyntheticHandwritingStrokes } from '../engine/syntheticInk';

interface CanvasState {
  workspace: WorkspaceData;
  activePageId: string;
  viewport: Viewport;
  tool: ToolType;
  color: string;
  size: number;
  opacity: number;
  isDrawing: boolean;
  isPanning: boolean;
  historyStack: Stroke[][];
  redoStack: Stroke[][];
  scrubbers: DynamicScrubber[];
  lassoPolygon: Point[] | null;
  selectedStrokeIds: string[];

  // Actions
  initWorkspace: () => Promise<void>;
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  setOpacity: (opacity: number) => void;
  setViewport: (viewport: Viewport | ((prev: Viewport) => Viewport)) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (screenPoint: Point, factor: number) => void;
  addStroke: (stroke: Stroke) => void;
  updateCurrentStroke: (point: Point) => void;
  finishStroke: () => void;
  eraseAtPoint: (worldPoint: Point, radius?: number) => void;
  undo: () => void;
  redo: () => void;
  clearPage: () => void;
  setLassoPolygon: (points: Point[] | null) => void;

  // Pages
  setActivePage: (pageId: string) => void;
  addPage: (title?: string) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  setGridType: (type: 'dots' | 'lines' | 'none') => void;

  // Math & Scrubbers
  evaluateEquationText: (rawText: string, origin: Point) => SolvedEquation | null;
  updateVariableValue: (varName: string, newValue: number) => void;
  recalculateAllEquations: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  workspace: createInitialWorkspace(),
  activePageId: INITIAL_PAGE_ID,
  viewport: { x: 0, y: 0, zoom: 1 },
  tool: 'pen',
  color: '#38bdf8', // Cyber Cyan
  size: 3,
  opacity: 1,
  isDrawing: false,
  isPanning: false,
  historyStack: [],
  redoStack: [],
  scrubbers: [],
  lassoPolygon: null,
  selectedStrokeIds: [],

  initWorkspace: async () => {
    const ws = await loadWorkspaceData();
    const activePage = ws.pages.find((p) => p.id === ws.activePageId) || ws.pages[0];
    set({
      workspace: ws,
      activePageId: activePage.id,
      viewport: activePage.viewport || { x: 0, y: 0, zoom: 1 },
      historyStack: [ws.strokes[activePage.id] || []],
      redoStack: [],
    });
  },

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setSize: (size) => set({ size }),
  setOpacity: (opacity) => set({ opacity }),

  setViewport: (updater) => {
    const current = get().viewport;
    const next = typeof updater === 'function' ? updater(current) : updater;
    set({ viewport: next });

    // Sync to active page
    const { activePageId, workspace } = get();
    const updatedPages = workspace.pages.map((p) =>
      p.id === activePageId ? { ...p, viewport: next } : p
    );
    const updatedWs = { ...workspace, pages: updatedPages };
    set({ workspace: updatedWs });
    saveWorkspaceData(updatedWs);
  },

  panBy: (dx, dy) => {
    const { viewport } = get();
    // dx and dy are screen pixel shifts
    const newX = viewport.x - dx / viewport.zoom;
    const newY = viewport.y - dy / viewport.zoom;
    get().setViewport({ ...viewport, x: newX, y: newY });
  },

  zoomAt: (screenPoint, factor) => {
    const { viewport } = get();
    const updated = zoomAtScreenPoint(viewport, screenPoint, factor);
    get().setViewport(updated);
  },

  addStroke: (stroke) => {
    const { activePageId, workspace, historyStack } = get();
    const currentStrokes = workspace.strokes[activePageId] || [];
    const nextStrokes = [...currentStrokes, stroke];

    const nextWorkspace = {
      ...workspace,
      strokes: {
        ...workspace.strokes,
        [activePageId]: nextStrokes,
      },
    };

    set({
      workspace: nextWorkspace,
      historyStack: [...historyStack, nextStrokes],
      redoStack: [],
    });

    saveWorkspaceData(nextWorkspace);
  },

  updateCurrentStroke: (point) => {
    const { activePageId, workspace } = get();
    const currentStrokes = workspace.strokes[activePageId] || [];
    if (currentStrokes.length === 0) return;

    const lastIdx = currentStrokes.length - 1;
    const lastStroke = currentStrokes[lastIdx];
    const updatedPoints = [
      ...lastStroke.points,
      { ...point, pressure: point.pressure ?? 0.5 },
    ];

    const updatedStroke = { ...lastStroke, points: updatedPoints };
    const nextStrokes = [...currentStrokes.slice(0, lastIdx), updatedStroke];

    set({
      workspace: {
        ...workspace,
        strokes: {
          ...workspace.strokes,
          [activePageId]: nextStrokes,
        },
      },
    });
  },

  finishStroke: () => {
    const { activePageId, workspace, historyStack } = get();
    const currentStrokes = workspace.strokes[activePageId] || [];
    saveWorkspaceData(workspace);
    set({
      historyStack: [...historyStack, currentStrokes],
      redoStack: [],
    });
  },

  eraseAtPoint: (worldPoint, radius = 24) => {
    const { activePageId, workspace } = get();
    const currentStrokes = workspace.strokes[activePageId] || [];

    const remainingStrokes = currentStrokes.filter((stroke) => {
      // Check if any point in the stroke is within radius of erase point
      return !stroke.points.some((p) => {
        const dx = p.x - worldPoint.x;
        const dy = p.y - worldPoint.y;
        return Math.hypot(dx, dy) <= radius;
      });
    });

    if (remainingStrokes.length !== currentStrokes.length) {
      const nextWorkspace = {
        ...workspace,
        strokes: {
          ...workspace.strokes,
          [activePageId]: remainingStrokes,
        },
      };

      set({
        workspace: nextWorkspace,
        historyStack: [...get().historyStack, remainingStrokes],
      });
      saveWorkspaceData(nextWorkspace);
    }
  },

  undo: () => {
    const { historyStack, redoStack, activePageId, workspace } = get();
    if (historyStack.length <= 1) return;

    const current = historyStack[historyStack.length - 1];
    const previous = historyStack[historyStack.length - 2];

    const nextWorkspace = {
      ...workspace,
      strokes: {
        ...workspace.strokes,
        [activePageId]: previous,
      },
    };

    set({
      workspace: nextWorkspace,
      historyStack: historyStack.slice(0, -1),
      redoStack: [current, ...redoStack],
    });

    saveWorkspaceData(nextWorkspace);
  },

  redo: () => {
    const { historyStack, redoStack, activePageId, workspace } = get();
    if (redoStack.length === 0) return;

    const nextStrokes = redoStack[0];

    const nextWorkspace = {
      ...workspace,
      strokes: {
        ...workspace.strokes,
        [activePageId]: nextStrokes,
      },
    };

    set({
      workspace: nextWorkspace,
      historyStack: [...historyStack, nextStrokes],
      redoStack: redoStack.slice(1),
    });

    saveWorkspaceData(nextWorkspace);
  },

  clearPage: () => {
    const { activePageId, workspace, historyStack } = get();
    const nextWorkspace = {
      ...workspace,
      strokes: {
        ...workspace.strokes,
        [activePageId]: [],
      },
      equations: {
        ...workspace.equations,
        [activePageId]: [],
      },
    };

    set({
      workspace: nextWorkspace,
      historyStack: [...historyStack, []],
      redoStack: [],
      scrubbers: [],
    });

    saveWorkspaceData(nextWorkspace);
  },

  setLassoPolygon: (points) => set({ lassoPolygon: points }),

  // Page Management
  setActivePage: (pageId) => {
    const { workspace } = get();
    const page = workspace.pages.find((p) => p.id === pageId);
    if (!page) return;

    const currentStrokes = workspace.strokes[pageId] || [];

    set({
      activePageId: pageId,
      viewport: page.viewport || { x: 0, y: 0, zoom: 1 },
      historyStack: [currentStrokes],
      redoStack: [],
    });

    const nextWs = { ...workspace, activePageId: pageId };
    saveWorkspaceData(nextWs);
  },

  addPage: (title) => {
    const { workspace } = get();
    const newId = `page-${Date.now()}`;
    const newPage: NotebookPage = {
      id: newId,
      title: title || `Canvas Note ${workspace.pages.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      viewport: { x: 0, y: 0, zoom: 1 },
      gridType: 'dots',
    };

    const nextWs: WorkspaceData = {
      ...workspace,
      activePageId: newId,
      pages: [...workspace.pages, newPage],
      strokes: { ...workspace.strokes, [newId]: [] },
      equations: { ...workspace.equations, [newId]: [] },
    };

    set({
      workspace: nextWs,
      activePageId: newId,
      viewport: newPage.viewport,
      historyStack: [[]],
      redoStack: [],
    });

    saveWorkspaceData(nextWs);
  },

  deletePage: (pageId) => {
    const { workspace, activePageId } = get();
    if (workspace.pages.length <= 1) return; // Keep at least one page

    const nextPages = workspace.pages.filter((p) => p.id !== pageId);
    const nextActiveId = activePageId === pageId ? nextPages[0].id : activePageId;
    const nextStrokes = { ...workspace.strokes };
    delete nextStrokes[pageId];

    const nextWs: WorkspaceData = {
      ...workspace,
      activePageId: nextActiveId,
      pages: nextPages,
      strokes: nextStrokes,
    };

    set({
      workspace: nextWs,
      activePageId: nextActiveId,
    });

    saveWorkspaceData(nextWs);
  },

  duplicatePage: (pageId) => {
    const { workspace } = get();
    const target = workspace.pages.find((p) => p.id === pageId);
    if (!target) return;

    const newId = `page-${Date.now()}`;
    const newPage: NotebookPage = {
      ...target,
      id: newId,
      title: `${target.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const targetStrokes = workspace.strokes[pageId] || [];
    const duplicatedStrokes = targetStrokes.map((s) => ({
      ...s,
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pageId: newId,
    }));

    const nextWs: WorkspaceData = {
      ...workspace,
      pages: [...workspace.pages, newPage],
      strokes: {
        ...workspace.strokes,
        [newId]: duplicatedStrokes,
      },
    };

    set({ workspace: nextWs });
    saveWorkspaceData(nextWs);
  },

  setGridType: (type) => {
    const { activePageId, workspace } = get();
    const nextPages = workspace.pages.map((p) =>
      p.id === activePageId ? { ...p, gridType: type } : p
    );
    const nextWs = { ...workspace, pages: nextPages };
    set({ workspace: nextWs });
    saveWorkspaceData(nextWs);
  },

  // CalcInk Math Evaluation
  evaluateEquationText: (rawText: string, origin: Point) => {
    const { workspace, activePageId, color } = get();
    const scope = { ...workspace.globalVariables };

    const result = parseAndEvaluateExpression(rawText, scope);
    if (!result.isSolved) return null;

    const eqId = `eq-${Date.now()}`;
    const solvedEq: SolvedEquation = {
      id: eqId,
      rawExpression: rawText,
      lhs: result.assignedVariable || '',
      rhsExpression: rawText.replace(/=.*$/, ''),
      resultValue: result.resultValue ?? 0,
      formattedResult: result.formattedResult ?? '',
      bbox: {
        minX: origin.x,
        minY: origin.y - 20,
        maxX: origin.x + 200,
        maxY: origin.y + 40,
      },
      answerPosition: {
        x: origin.x + 25,
        y: origin.y,
      },
      variablesReferenced: result.referencedVars,
      isVariableAssignment: result.isAssignment,
      assignedVariable: result.assignedVariable,
      isFunction: result.isFunction,
      functionData: result.functionData,
    };

    // Update global variables if assignment
    const nextGlobals = { ...workspace.globalVariables };
    if (result.isAssignment && result.assignedVariable && result.resultValue !== undefined) {
      nextGlobals[result.assignedVariable] = result.resultValue;
    }

    // Spawn synthetic handwriting strokes for the solved answer!
    if (result.formattedResult && !result.isFunction) {
      const syntheticStrokes = generateSyntheticHandwritingStrokes(
        result.formattedResult,
        { x: origin.x + 10, y: origin.y },
        {
          fontSize: 34,
          color: '#10b981', // Neon emerald for calculated answers
          pageId: activePageId,
        }
      );

      const currentStrokes = workspace.strokes[activePageId] || [];
      const updatedStrokes = [...currentStrokes, ...syntheticStrokes];

      const currentEqs = workspace.equations[activePageId] || [];
      const nextWs: WorkspaceData = {
        ...workspace,
        globalVariables: nextGlobals,
        strokes: { ...workspace.strokes, [activePageId]: updatedStrokes },
        equations: { ...workspace.equations, [activePageId]: [...currentEqs, solvedEq] },
      };

      // Create scrubber slider if it's a variable assignment
      const newScrubbers = [...get().scrubbers];
      if (result.isAssignment && result.assignedVariable) {
        newScrubbers.push({
          id: `scrub-${eqId}`,
          variableName: result.assignedVariable,
          equationId: eqId,
          currentValue: result.resultValue ?? 0,
          min: Math.max(0, Math.floor((result.resultValue ?? 0) * 0.2)),
          max: Math.max(100, Math.ceil((result.resultValue ?? 0) * 3)),
          step: 1,
          position: origin,
        });
      }

      set({
        workspace: nextWs,
        scrubbers: newScrubbers,
      });

      saveWorkspaceData(nextWs);
      return solvedEq;
    }

    // Function plot or equation without synthetic text
    const currentEqs = workspace.equations[activePageId] || [];
    const nextWs = {
      ...workspace,
      globalVariables: nextGlobals,
      equations: { ...workspace.equations, [activePageId]: [...currentEqs, solvedEq] },
    };
    set({ workspace: nextWs });
    saveWorkspaceData(nextWs);
    return solvedEq;
  },

  updateVariableValue: (varName: string, newValue: number) => {
    const { workspace, activePageId } = get();
    const nextGlobals = { ...workspace.globalVariables, [varName]: newValue };

    // Update scrubber state
    const nextScrubbers = get().scrubbers.map((s) =>
      s.variableName === varName ? { ...s, currentValue: newValue } : s
    );

    // Re-evaluate dependent equations across the page
    const pageEquations = workspace.equations[activePageId] || [];
    const updatedEquations = pageEquations.map((eq) => {
      if (eq.assignedVariable === varName) {
        return {
          ...eq,
          resultValue: newValue,
          formattedResult: Number.isInteger(newValue) ? newValue.toString() : newValue.toFixed(2),
        };
      }

      if (eq.variablesReferenced.includes(varName)) {
        // Re-evaluate
        const evalRes = parseAndEvaluateExpression(eq.rawExpression, nextGlobals);
        if (evalRes.isSolved && evalRes.resultValue !== undefined) {
          if (evalRes.assignedVariable) {
            nextGlobals[evalRes.assignedVariable] = evalRes.resultValue;
          }
          return {
            ...eq,
            resultValue: evalRes.resultValue,
            formattedResult: evalRes.formattedResult || eq.formattedResult,
          };
        }
      }
      return eq;
    });

    const nextWs = {
      ...workspace,
      globalVariables: nextGlobals,
      equations: { ...workspace.equations, [activePageId]: updatedEquations },
    };

    set({
      workspace: nextWs,
      scrubbers: nextScrubbers,
    });

    saveWorkspaceData(nextWs);
  },

  recalculateAllEquations: () => {
    const { workspace, activePageId } = get();
    const globals = { ...workspace.globalVariables };
    const pageEquations = workspace.equations[activePageId] || [];

    const updated = pageEquations.map((eq) => {
      const evalRes = parseAndEvaluateExpression(eq.rawExpression, globals);
      if (evalRes.isSolved && evalRes.resultValue !== undefined) {
        if (evalRes.assignedVariable) {
          globals[evalRes.assignedVariable] = evalRes.resultValue;
        }
        return {
          ...eq,
          resultValue: evalRes.resultValue,
          formattedResult: evalRes.formattedResult || eq.formattedResult,
        };
      }
      return eq;
    });

    const nextWs = {
      ...workspace,
      globalVariables: globals,
      equations: { ...workspace.equations, [activePageId]: updated },
    };

    set({ workspace: nextWs });
    saveWorkspaceData(nextWs);
  },
}));
