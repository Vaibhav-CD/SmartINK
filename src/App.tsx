import { useState, useEffect, useCallback, useRef } from 'react';
import type { 
  ToolMode, 
  Point,
  TheoremItem, 
  DocumentItem, 
  SocraticAnnotation, 
  MetaModelConfig,
  VoiceState,
  WorkspaceState,
  CanvasPage,
  WorkspaceFolder,
  Stroke
} from './types';
import { InfiniteCanvas, type FunctionPlotItem, type PhysicsSimItem } from './components/Canvas/InfiniteCanvas';
import { type PhysicsParams, type PhysicsSystemType } from './services/physics/livingInkPhysics';
import { FloatingDock } from './components/FloatingDock';
import { UnifiedTopBar } from './components/UnifiedTopBar';
import { WorkspaceExplorer } from './components/WorkspaceExplorer';
import { CommandPalette } from './components/CommandPalette';
import { SmartInkHomePage } from './components/SmartInkHomePage';
import { SimulationStudio } from './components/SimulationStudio/SimulationStudio';
import { MetaAIService } from './services/metaAI';
import { loadWorkspace, saveWorkspace, createDefaultWorkspace } from './services/workspaceStorage';
import { OnDeviceStrokeRecognizer, type ProjectedEquation } from './services/calcInk/strokeRecognizer';
import { MathParser } from './services/calcInk/mathParser';
import { ConfirmationModal } from './components/ConfirmationModal';
import { PdfService } from './services/pdf/pdfService';
import { PdfReaderModal } from './components/PdfReaderModal';
import type { ConversationContext } from './services/copilot/conversationAgent';
import { resolveWriteup, type CanvasWriteup } from './services/copilot/canvasWriter';
import { routeVoiceCommand } from './services/copilot/voiceCommand';
import { TtsService } from './services/speech/ttsService';
import { HandwritingVectorSynthesizer } from './services/calcInk/handwritingSynthesis';
import { getStrokesBoundingBox } from './services/calcInk/coordinateTransform';

export function App() {
  const [currentView, setCurrentView] = useState<'home' | 'canvas' | 'studio'>('home');
  const [studioReturnView, setStudioReturnView] = useState<'home' | 'canvas'>('home');
  const [tool, setTool] = useState<ToolMode>('select');
  const [penColor, setPenColor] = useState<string>('#a3e635');
  const [strokeWidth, setStrokeWidth] = useState<number>(3.5);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [canvasContext, setCanvasContext] = useState<ConversationContext>({});

  // Undo / Redo History Stack (CalcInk PS Requirement)
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

  // Interactive 2D Function Plots (CalcInk Creative Extension)
  const [functionPlots, setFunctionPlots] = useState<FunctionPlotItem[]>([]);

  // Living Ink 60 FPS Physics Simulations
  const [physicsSimulations, setPhysicsSimulations] = useState<PhysicsSimItem[]>([]);

  // PDF Reader & Text-to-Speech active modal document
  const [activeReadingDoc, setActiveReadingDoc] = useState<DocumentItem | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  // Split View (Dual Sheet Comparison Mode)
  const [isSplitView, setIsSplitView] = useState(false);
  const [secondaryPageId, setSecondaryPageId] = useState<string | null>(null);

  // Dark & Light Mode state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('SmartInk_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // Apply theme class to <html> root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('SmartInk_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      // Automatically adjust pen color for high-contrast visibility when switching themes
      if (next === 'light' && (penColor === '#ffffff' || penColor === '#a3e635')) {
        setPenColor('#059669'); // High-contrast rich emerald for light canvas
      } else if (next === 'dark' && (penColor === '#0f172a' || penColor === '#059669')) {
        setPenColor('#a3e635'); // Vibrant galvanic lime for dark canvas
      }
      return next;
    });
  };

  // Workspace Multi-File & Folder State
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => loadWorkspace());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Get current active page safely
  const activePage: CanvasPage = 
    workspace.pages.find((p) => p.id === workspace.activePageId) || 
    workspace.pages[0] || 
    createDefaultWorkspace().pages[0];

  // Secondary page for split comparison mode
  const secondaryPage: CanvasPage = 
    workspace.pages.find((p) => p.id === secondaryPageId) || 
    workspace.pages.find((p) => p.id !== activePage.id) || 
    activePage;

  // Meta Model API Configuration
  const [metaConfig, setMetaConfig] = useState<MetaModelConfig>({
    apiKey: '',
    endpoint: 'https://api.meta.ai/v1',
    reasoningModel: 'muse-wonder',
    visionModel: 'muse-spark-1.3',
    imageModel: 'muse-image',
    transcribeModel: 'muse-voice-transcribe',
    isLiveApi: false,
  });

  // Voice Co-pilot State
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    transcript: '',
    status: 'idle',
  });
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Voice conversation loop state (refs so recognition callbacks never go stale)
  const conversationActiveRef = useRef(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const speakingRef = useRef(false);
  const listenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasContextRef = useRef<ConversationContext>({});
  const handleExecuteVoiceCommandRef = useRef<(command: string) => void>(() => {});
  const lastSpokenRef = useRef<string>('');
  const lastUtteranceRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });

  const metaAI = MetaAIService.getInstance();

  // Mirror canvas context for the voice loop; stop the mic on unmount.
  useEffect(() => {
    canvasContextRef.current = canvasContext;
  }, [canvasContext]);

  useEffect(() => () => {
    conversationActiveRef.current = false;
    if (listenTimerRef.current) clearTimeout(listenTimerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch {
      // Mic already stopped.
    }
    TtsService.stop();
  }, []);

  // Save workspace state to localStorage on changes
  useEffect(() => {
    saveWorkspace(workspace);
  }, [workspace]);

  // Text-to-Speech Helper (fire-and-forget UI feedback)
  const speakText = useCallback((text: string) => {
    if (!ttsEnabled) return;
    TtsService.speak(text);
  }, [ttsEnabled]);

  // Conversation speech: stops the mic while replying, then calls onDone so
  // the loop can resume listening. Honors the TTS mute toggle.
  const speakReply = useCallback((text: string, onDone?: () => void) => {
    lastSpokenRef.current = text;
    if (!ttsEnabled) {
      onDone?.();
      return;
    }
    speakingRef.current = true;
    setVoiceState((prev) => ({ ...prev, status: 'answering' }));
    try {
      recognitionRef.current?.stop();
    } catch {
      // Mic already stopped.
    }
    const finished = () => {
      speakingRef.current = false;
      onDone?.();
    };
    const started = TtsService.speak(text, { onEnd: finished, onError: finished });
    if (!started) finished();
  }, [ttsEnabled]);

  // Update active page content helper
  const updateActivePage = useCallback((updater: (page: CanvasPage) => CanvasPage) => {
    setWorkspace((prev) => {
      const updatedPages = prev.pages.map((p) => {
        if (p.id === prev.activePageId) {
          return { ...updater(p), updatedAt: Date.now() };
        }
        return p;
      });
      return { ...prev, pages: updatedPages };
    });
  }, []);

  // Undo / Redo Actions
  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const lastStrokes = prev[prev.length - 1];
      setRedoStack((r) => [...r, activePage.strokes]);
      updateActivePage((page) => ({ ...page, strokes: lastStrokes }));
      return prev.slice(0, -1);
    });
  }, [activePage.strokes, updateActivePage]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const nextStrokes = prev[prev.length - 1];
      setUndoStack((u) => [...u, activePage.strokes]);
      updateActivePage((page) => ({ ...page, strokes: nextStrokes }));
      return prev.slice(0, -1);
    });
  }, [activePage.strokes, updateActivePage]);

  // Stroke Deletion Helper
  const handleDeleteStrokes = useCallback((strokeIds: string[]) => {
    const idSet = new Set(strokeIds);
    setUndoStack((prev) => [...prev, activePage.strokes]);
    setRedoStack([]);
    updateActivePage((page) => ({
      ...page,
      strokes: page.strokes.filter((s) => !idSet.has(s.id)),
    }));
  }, [activePage.strokes, updateActivePage]);

  // Pixel-erase replacement helper (atomic swap, one undo entry per gesture)
  const handleReplaceStrokes = useCallback((strokeIds: string[], newStrokes: Stroke[], pushUndo = true) => {
    const idSet = new Set(strokeIds);
    if (pushUndo) {
      setUndoStack((prev) => [...prev, activePage.strokes]);
      setRedoStack([]);
    }
    updateActivePage((page) => ({
      ...page,
      strokes: [...page.strokes.filter((s) => !idSet.has(s.id)), ...newStrokes],
    }));
  }, [activePage.strokes, updateActivePage]);

  // Convert inline math projection to permanent theorem card
  const handleConvertToTheoremCard = (eq: ProjectedEquation) => {
    const latexExpr = `${eq.expressionText} = ${eq.evaluation.display}`;
    const newTheorem: TheoremItem = {
      id: `thm-calc-${Date.now()}`,
      type: 'theorem',
      title: `CalcInk: ${eq.expressionText}`,
      statement: `Evaluated via CalcInk 100% on-device BODMAS engine: ${eq.expressionText} = ${eq.evaluation.display}`,
      latex: latexExpr,
      position: { x: eq.anchorPosition.x, y: eq.anchorPosition.y },
      size: { width: 340, height: 240 },
      proofs: [],
    };
    updateActivePage((page) => ({
      ...page,
      theorems: [...page.theorems, newTheorem],
    }));
    speakText(`Pinned calculated theorem: ${eq.evaluation.display}`);
  };

  // Add 2D Function Plot with Smart Cascading Grid Placement or append to existing frame
  const handleAddPlot = (fnStr = 'sin(x)', position?: Point, targetPlotId?: string) => {
    if (targetPlotId) {
      setFunctionPlots((prev) =>
        prev.map((p) => {
          if (p.id === targetPlotId) {
            const existing = p.func
              .split(/[,;\n]+/)
              .map((s) => s.trim())
              .filter(Boolean);
            if (!existing.includes(fnStr.trim())) {
              return { ...p, func: `${p.func}, ${fnStr.trim()}` };
            }
          }
          return p;
        })
      );
      speakText(`Added ${fnStr} to graph frame`);
      return;
    }

    const count = functionPlots.length;
    const cascadePos = position || {
      x: 340 + (count % 3) * 400,
      y: 160 + Math.floor(count / 3) * 290,
    };
    const newPlot: FunctionPlotItem = {
      id: `plot-${Date.now()}`,
      func: fnStr,
      position: cascadePos,
    };
    setFunctionPlots((prev) => [...prev, newPlot]);
    speakText(`Rendered interactive 2D function curve plot for ${fnStr}`);
  };

  // Living Ink 60 FPS Physics Simulations
  const handleAddPhysicsSimulation = (
    type: PhysicsSystemType = 'pendulum',
    position?: Point,
    params?: PhysicsParams,
    customTitle?: string
  ) => {
    const pos = position || {
      x: 340 + (physicsSimulations.length % 3) * 440,
      y: 160 + Math.floor(physicsSimulations.length / 3) * 320,
    };
    const title =
      customTitle ||
      (type === 'pendulum'
        ? 'Simple Pendulum'
        : type === 'spring'
        ? 'Spring-Mass Oscillator'
        : type === 'orbit'
        ? 'Gravitational Orbit'
        : type === 'wave'
        ? 'Traveling Wave'
        : 'Projectile Kinematics');

    setPhysicsSimulations((prev) => [
      ...prev,
      {
        id: `sim-${Date.now()}`,
        type,
        title,
        position: pos,
        params,
      },
    ]);
    speakText(`Started 60 FPS living ${type} physics simulation.`);
  };

  // Simulation Studio section
  const handleEnterStudio = (from: 'home' | 'canvas' = 'home') => {
    setStudioReturnView(from);
    setCurrentView('studio');
  };

  const handlePinStudioToCanvas = (type: PhysicsSystemType, params: PhysicsParams, title: string) => {
    handleAddPhysicsSimulation(type, undefined, params, title);
    setCurrentView('canvas');
  };

  const handleDeletePhysicsSimulation = (id: string) => {
    setPhysicsSimulations((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdatePhysicsSimulation = (sim: PhysicsSimItem) => {
    setPhysicsSimulations((prev) => prev.map((s) => (s.id === sim.id ? sim : s)));
  };

  // Global Keyboard Shortcuts (Cmd+K, Cmd+Z, Cmd+Shift+Z, V, H, P, E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // If user is currently focused in an input or textarea, ignore single-letter tool keys
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.key === 'v' || e.key === 'V') setTool('select');
      if (e.key === 'h' || e.key === 'H') setTool('pan');
      if (e.key === 'p' || e.key === 'P') setTool('pen');
      if (e.key === 'e' || e.key === 'E') setTool('eraser');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Workspace Management Actions
  const handleSelectPage = (pageId: string) => {
    setWorkspace((prev) => ({ ...prev, activePageId: pageId }));
    const targetPage = workspace.pages.find((p) => p.id === pageId);
    if (targetPage) {
      speakText(`Loaded ${targetPage.name}`);
    }
  };

  const handleCreateFolder = (name: string, parentId: string | null = null) => {
    const newFolder: WorkspaceFolder = {
      id: `folder-${Date.now()}`,
      name,
      parentId,
      isOpen: true,
      createdAt: Date.now(),
    };
    setWorkspace((prev) => ({
      ...prev,
      folders: [...prev.folders, newFolder],
    }));
  };

  const handleCreatePage = (name: string, folderId: string | null = null) => {
    const newPage: CanvasPage = {
      id: `page-${Date.now()}`,
      name,
      folderId,
      theorems: [],
      proofs: [],
      documents: [],
      images: [],
      socraticHints: [],
      strokes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setWorkspace((prev) => ({
      ...prev,
      pages: [...prev.pages, newPage],
      activePageId: newPage.id,
    }));
    speakText(`Created page ${name}`);
  };

  const handleDeleteFolder = (folderId: string) => {
    setWorkspace((prev) => {
      const remainingFolders = prev.folders.filter((f) => f.id !== folderId);
      const remainingPages = prev.pages.map((p) => 
        p.folderId === folderId ? { ...p, folderId: null } : p
      );
      return {
        ...prev,
        folders: remainingFolders,
        pages: remainingPages,
      };
    });
  };

  // Data-Loss Prevention: Clear Page & Delete Page Confirmation Modals
  const [isClearPageModalOpen, setIsClearPageModalOpen] = useState(false);
  const [pageToDeleteId, setPageToDeleteId] = useState<string | null>(null);

  const handleRequestClearInk = () => {
    if (activePage.strokes.length === 0 && activePage.theorems.length === 0 && functionPlots.length === 0) {
      return;
    }
    setIsClearPageModalOpen(true);
  };

  const handleConfirmClearPage = (options?: { clearEverything?: boolean }) => {
    setUndoStack((prev) => [...prev, activePage.strokes]);
    setRedoStack([]);

    if (options?.clearEverything) {
      updateActivePage((page) => ({
        ...page,
        strokes: [],
        theorems: [],
        images: [],
      }));
      setFunctionPlots([]);
      setPhysicsSimulations([]);
      speakText("Cleared entire page.");
    } else {
      updateActivePage((page) => ({
        ...page,
        strokes: [],
      }));
      speakText("Cleared canvas ink. Press Ctrl+Z to undo.");
    }
  };

  const handleRequestDeletePage = (pageId: string) => {
    setPageToDeleteId(pageId);
  };

  const handleConfirmDeletePage = () => {
    if (!pageToDeleteId) return;
    const targetPage = workspace.pages.find((p) => p.id === pageToDeleteId);
    const pageName = targetPage?.name || 'Page';

    setWorkspace((prev) => {
      const remainingPages = prev.pages.filter((p) => p.id !== pageToDeleteId);
      if (remainingPages.length === 0) {
        return createDefaultWorkspace();
      }
      const newActiveId = prev.activePageId === pageToDeleteId ? remainingPages[0].id : prev.activePageId;
      return {
        ...prev,
        pages: remainingPages,
        activePageId: newActiveId,
      };
    });

    setPageToDeleteId(null);
    speakText(`Deleted ${pageName}.`);
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    setWorkspace((prev) => ({
      ...prev,
      folders: prev.folders.map((f) => (f.id === folderId ? { ...f, name: newName } : f)),
    }));
  };

  const handleRenamePage = (pageId: string, newName: string) => {
    setWorkspace((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === pageId ? { ...p, name: newName } : p)),
    }));
  };

  const handleExportWorkspace = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workspace, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `SmartInk-workspace-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportWorkspace = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.pages && parsed.folders) {
        setWorkspace(parsed);
        speakText("Workspace successfully restored.");
      }
    } catch {
      alert("Invalid workspace format.");
    }
  };

  // Discover Proofs for a Theorem
  const handleDiscoverProofs = async (theorem?: TheoremItem) => {
    const target = theorem || activePage.theorems[0];
    if (!target) return;

    const data = await metaAI.discoverProofs(target.title || target.statement, metaConfig.apiKey);
    
    const newProofs = data.proofs.map((p, idx) => ({
      ...p,
      theoremId: target.id,
      position: {
        x: target.position.x + target.size.width + 90,
        y: target.position.y - 30 + idx * 240,
      },
    }));

    updateActivePage((page) => ({
      ...page,
      theorems: page.theorems.map((t) => (t.id === target.id ? { ...t, proofs: newProofs } : t)),
      proofs: [...page.proofs.filter((p) => p.theoremId !== target.id), ...newProofs],
    }));

    speakText(`Found ${newProofs.length} proof paths.`);
  };

  // Request Socratic Hint
  const handleRequestSocraticHint = (theorem: TheoremItem) => {
    const hint = metaAI.generateSocraticHint(theorem.title);
    hint.position = {
      x: theorem.position.x,
      y: theorem.position.y + theorem.size.height + 25,
    };
    updateActivePage((page) => ({
      ...page,
      socraticHints: [...page.socraticHints, hint],
    }));
    speakText(hint.question);
  };

  // Synthesize Document
  const handleSynthesizeDocument = (doc: DocumentItem) => {
    const hint: SocraticAnnotation = {
      id: `synth-${Date.now()}`,
      targetId: doc.id,
      position: { x: doc.position.x + doc.size.width + 30, y: doc.position.y },
      question: `Synthesizing ${doc.title}: What core lemmas link with your active canvas proofs?`,
      hint: "Cross-referencing element definitions with the algebraic expansion card.",
    };
    updateActivePage((page) => ({
      ...page,
      socraticHints: [...page.socraticHints, hint],
    }));
  };

  // Recognize handwritten ink using On-Device CalcInk Recognizer + SAM 3.1
  const handleRecognizeInk = async () => {
    if (activePage.strokes.length === 0) return;

    // 1. Check On-Device CalcInk Equation Recognizer first (e.g. 2x + 5 = 1, 6+6 = 12, y = x^2)
    const scanned = OnDeviceStrokeRecognizer.scanEquations(activePage.strokes);
    if (scanned.length > 0) {
      scanned.forEach(eq => handleConvertToTheoremCard(eq));
      speakText(`Pinned ${scanned.length} recognized equation${scanned.length > 1 ? 's' : ''} to permanent card${scanned.length > 1 ? 's' : ''}.`);
      return;
    }

    // 2. Direct stroke cluster fallback
    const clusterParsed = OnDeviceStrokeRecognizer.parseClusterToExpression(activePage.strokes);
    if (clusterParsed.expressionStr.trim()) {
      const evalRes = MathParser.evaluate(clusterParsed.expressionStr);
      let minX = Infinity, minY = Infinity;
      activePage.strokes.forEach(s => s.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
      }));

      const newTheorem: TheoremItem = {
        id: `thm-ink-${Date.now()}`,
        type: 'theorem',
        title: evalRes.isEquationSolution ? `Solution: ${evalRes.display}` : clusterParsed.expressionStr,
        statement: evalRes.display ? `${clusterParsed.expressionStr} \\implies ${evalRes.display}` : clusterParsed.expressionStr,
        latex: clusterParsed.expressionStr,
        position: { x: Math.max(50, minX - 20), y: Math.max(70, minY - 20) },
        size: { width: 340, height: 260 },
        proofs: [],
      };

      updateActivePage((page) => ({
        ...page,
        theorems: [...page.theorems, newTheorem],
      }));
      speakText(`Recognized ${clusterParsed.expressionStr}.`);
      return;
    }

    // 3. Fallback to SAM 3.1 + Muse Spark Vision
    const totalPoints = activePage.strokes.reduce((acc, s) => acc + s.points.length, 0);
    const parsed = await metaAI.parseInkToMath(activePage.strokes.length, totalPoints);

    let minX = Infinity, minY = Infinity;
    activePage.strokes.forEach(s => s.points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
    }));

    const newTheorem: TheoremItem = {
      id: `thm-ink-${Date.now()}`,
      type: 'theorem',
      title: parsed.name,
      statement: "Identified from handwritten digital ink via SAM 3.1 and Muse Spark Vision.",
      latex: parsed.latex,
      position: { x: Math.max(50, minX - 20), y: Math.max(70, minY - 20) },
      size: { width: 340, height: 260 },
      proofs: [],
    };

    updateActivePage((page) => ({
      ...page,
      theorems: [...page.theorems, newTheorem],
    }));

    speakText(`Recognized handwritten equation: ${parsed.name}.`);
    handleDiscoverProofs(newTheorem);
  };

  // Voice command execution
  // Ink a write-up below the existing strokes (undoable, like any ink).
  const inkWriteup = useCallback((writeup: CanvasWriteup) => {
    const box =
      activePage.strokes.length > 0
        ? getStrokesBoundingBox(activePage.strokes)
        : null;
    const startX = box ? Math.max(60, box.minX) : 140;
    let y = box ? box.maxY + 70 : 220;
    const newStrokes: Stroke[] = [];
    for (const line of [writeup.title, ...writeup.lines]) {
      newStrokes.push(
        ...HandwritingVectorSynthesizer.synthesize(
          line,
          { x: startX, y },
          { color: '#a3e635', avgStrokeWidth: 3.2, slantAngle: 4 },
          34
        )
      );
      y += 34 * 1.7;
    }
    setUndoStack((prev) => [...prev, activePage.strokes]);
    setRedoStack([]);
    updateActivePage((page) => ({
      ...page,
      strokes: [...page.strokes, ...newStrokes],
    }));
  }, [activePage.strokes, updateActivePage]);

  // Voice "write X on screen": ink the write-up directly onto the canvas.
  const handleWriteOnCanvas = useCallback(async (topic: string, onDone?: () => void) => {
    const writeup = await resolveWriteup(topic);
    if (!writeup) {
      speakReply(`I couldn't find ${topic}. Try another topic.`, onDone);
      return;
    }
    inkWriteup(writeup);
    speakReply(writeup.spoken, onDone);
  }, [inkWriteup, speakReply]);

  // Voice "write the answer/steps": ink the current canvas solution.
  const handleWriteSolution = useCallback((onDone?: () => void) => {
    const ctx = canvasContextRef.current;
    const display = ctx.solutionDisplay || ctx.equationText;
    if (!display) {
      speakReply('There is nothing on the canvas to write yet.', onDone);
      return;
    }
    inkWriteup({
      title: ctx.equationText ?? 'Solution',
      lines: [display],
      spoken: `Written on the canvas: ${display.replace(/=/g, ' equals ')}.`,
    });
    speakReply(`Written on the canvas: ${display.replace(/=/g, ' equals ')}.`, onDone);
  }, [inkWriteup, speakReply]);

  // Resume listening after a reply, or go idle when the conversation ended.
  const resumeConversation = useCallback(() => {
    if (conversationActiveRef.current) {
      startListeningSoon();
    } else {
      setVoiceState((prev) => ({ ...prev, status: 'idle', isListening: false }));
    }
  }, []);

  // Resume once fire-and-forget UI speech has finished playing.
  const resumeWhenQuiet = useCallback(() => {
    if (!conversationActiveRef.current) {
      setVoiceState((prev) => ({ ...prev, status: 'idle', isListening: false }));
      return;
    }
    if (TtsService.getState() === 'playing') {
      setTimeout(() => resumeWhenQuiet(), 400);
      return;
    }
    startListeningSoon();
  }, []);

  const handleExecuteVoiceCommand = useCallback(async (command: string) => {
    const text = command.trim();
    if (!text) {
      resumeConversation();
      return;
    }
    setVoiceState((prev) => ({ ...prev, status: 'processing' }));

    const route = await routeVoiceCommand(text, canvasContextRef.current);

    if (route.action === 'undo') {
      if (undoStack.length === 0) {
        speakReply('Nothing to undo.', resumeConversation);
      } else {
        handleUndo();
        speakReply('Undone.', resumeConversation);
      }
      return;
    }

    if (route.action === 'repeat') {
      speakReply(
        lastSpokenRef.current || 'I have not said anything yet.',
        resumeConversation
      );
      return;
    }

    if (route.action === 'write') {
      await handleWriteOnCanvas(route.topic, resumeConversation);
      return;
    }

    if (route.action === 'write_solution') {
      handleWriteSolution(resumeConversation);
      return;
    }

    if (route.action === 'device') {
      const cmd = route.command;
      if (route.intent === 'discover_proofs') {
        const target = activePage.theorems[0];
        if (target) {
          await handleDiscoverProofs(target);
        } else {
          speakText('Pin a theorem first, then ask for proofs.');
        }
      } else if (route.intent === 'socratic_hint') {
        const target = activePage.theorems[0];
        if (target) {
          handleRequestSocraticHint(target);
        } else {
          speakText('Pin a theorem first, then ask for a hint.');
        }
      } else if (route.intent === 'generate_image') {
        const generated = await metaAI.generateOrFetchImage(cmd, { x: 280, y: 160 });
        updateActivePage((page) => ({
          ...page,
          images: [...(page.images || []), generated],
        }));
        speakText(`Done. ${generated.title} is on the canvas.`);
      } else if (route.intent === 'add_paper') {
        handleAddPaper();
      } else if (route.intent === 'living_physics') {
        const lower = cmd.toLowerCase();
        const simType = lower.includes('spring')
          ? 'spring'
          : lower.includes('orbit') || lower.includes('planet')
          ? 'orbit'
          : lower.includes('projectile') || lower.includes('launch')
          ? 'projectile'
          : 'pendulum';
        handleAddPhysicsSimulation(simType);
      }
      resumeWhenQuiet();
      return;
    }

    // Conversation: spoken reply only — never pinned or transcribed on screen.
    // A plot reply executes because "plot X" explicitly asks for a graph.
    const { reply } = route;
    if (reply.kind === 'plot' && reply.functionBody) {
      handleAddPlot(reply.functionBody);
    }
    speakReply(reply.spoken, resumeConversation);
  }, [
    // Note: handleAddPaper is intentionally omitted: it is declared below and
    // reads no render state, so the deferred call inside is always safe.
    activePage.theorems,
    handleAddPlot,
    handleDiscoverProofs,
    handleRequestSocraticHint,
    handleUndo,
    handleWriteOnCanvas,
    handleWriteSolution,
    metaAI,
    resumeConversation,
    resumeWhenQuiet,
    speakReply,
    speakText,
    undoStack,
    updateActivePage,
  ]);

  // Latest handler for recognition callbacks (avoids stale closures).
  handleExecuteVoiceCommandRef.current = handleExecuteVoiceCommand;

  // Continuous conversation loop: Chrome ends the stream on silence, so
  // restart while the conversation is active and the copilot is not speaking.
  const startListening = useCallback(() => {
    if (!conversationActiveRef.current || speakingRef.current) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    try {
      recognitionRef.current?.stop();
    } catch {
      // Previous stream already stopped.
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const finals: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finals.push(event.results[i][0].transcript);
        }
      }
      if (finals.length > 0) {
        // Dedupe rapid repeats from stream restarts (same utterance twice).
        const heardKey = finals.join(' ').trim().toLowerCase().replace(/\s+/g, ' ');
        const now = Date.now();
        if (
          heardKey &&
          heardKey === lastUtteranceRef.current.text &&
          now - lastUtteranceRef.current.at < 2500
        ) {
          return;
        }
        lastUtteranceRef.current = { text: heardKey, at: now };
        try {
          recognition.stop();
        } catch {
          // Stream already stopped.
        }
        handleExecuteVoiceCommandRef.current(finals.join(' '));
      }
    };

    recognition.onerror = (event: any) => {
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        stopConversation();
      }
    };

    recognition.onend = () => {
      if (conversationActiveRef.current && !speakingRef.current) {
        startListeningSoon();
      }
    };

    recognitionRef.current = recognition;
    setVoiceState((prev) => ({ ...prev, isListening: true, status: 'listening' }));
    try {
      recognition.start();
    } catch {
      // Stream already started.
    }
  }, []);

  const startListeningSoon = useCallback(() => {
    if (listenTimerRef.current) clearTimeout(listenTimerRef.current);
    listenTimerRef.current = setTimeout(() => {
      startListening();
    }, 250);
  }, [startListening]);

  const stopConversation = useCallback(() => {
    conversationActiveRef.current = false;
    speakingRef.current = false;
    if (listenTimerRef.current) {
      clearTimeout(listenTimerRef.current);
      listenTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      // Mic already stopped.
    }
    recognitionRef.current = null;
    TtsService.stop();
    setVoiceState((prev) => ({ ...prev, isListening: false, status: 'idle' }));
  }, []);

  // Web Speech API mic toggle: starts/stops the continuous conversation.
  const handleToggleVoiceListen = () => {
    if (conversationActiveRef.current) {
      stopConversation();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Demo fallback without mic support: run one sample command by voice.
      setVoiceState((prev) => ({ ...prev, status: 'processing' }));
      setTimeout(() => {
        handleExecuteVoiceCommand('Show me 3 proofs for the Pythagorean Theorem');
      }, 1200);
      return;
    }

    // Start silently: status stays visual-only, speech is answers only.
    conversationActiveRef.current = true;
    startListening();
  };

  // Add a blank theorem stamp
  const handleAddTheorem = () => {
    const newTheorem: TheoremItem = {
      id: `thm-${Date.now()}`,
      type: 'theorem',
      title: "Custom Hypothesis",
      statement: "Define mathematical conjecture to analyze with Muse Wonder.",
      latex: "f(x) = \\int_{-\\infty}^\\infty e^{-t^2} dt",
      position: { x: 300, y: 180 },
      size: { width: 340, height: 260 },
      proofs: [],
    };
    updateActivePage((page) => ({
      ...page,
      theorems: [...page.theorems, newTheorem],
    }));
  };

  // Add blank paper
  const handleAddPaper = () => {
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      type: 'paper',
      title: "Quantum Superposition & Phase Invariance",
      authors: "N. Bohr, W. Heisenberg (1927)",
      abstract: "An exploration of state vectors and wave-packet reductions across spatial configurations.",
      pages: [
        "In quantum mechanics, state vectors psi occupy a complex Hilbert space. Linear combinations of eigenvectors represent simultaneous valid physical configurations prior to measurement.",
        "The density operator rho satisfies the von Neumann equation: i*hbar d(rho)/dt = [H, rho]."
      ],
      currentPage: 0,
      position: { x: 80, y: 160 },
      size: { width: 340, height: 360 },
    };
    updateActivePage((page) => ({
      ...page,
      documents: [...page.documents, newDoc],
    }));
  };

  // Upload and parse real PDF document for reading and Text-to-Speech
  const handleUploadPdf = async (file: File, position?: Point) => {
    setIsUploadingPdf(true);
    try {
      const parsed = await PdfService.parsePdfFile(file);
      const newDoc: DocumentItem = {
        id: `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'pdf',
        title: parsed.title || file.name,
        authors: parsed.author || 'Uploaded PDF Document',
        abstract: parsed.abstract,
        pages: parsed.pages,
        currentPage: 0,
        position: position || { x: 140, y: 160 },
        size: { width: 380, height: 400 },
        fileName: file.name,
        fileSize: file.size,
        totalWords: parsed.totalWords,
        uploadedAt: Date.now(),
      };
      updateActivePage((page) => ({
        ...page,
        documents: [...page.documents, newDoc],
      }));
    } catch (err) {
      console.error('Failed to parse uploaded PDF:', err);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // Add blank Socratic sticky
  const handleAddSticky = () => {
    const newHint: SocraticAnnotation = {
      id: `hint-${Date.now()}`,
      targetId: 'custom',
      position: { x: 380, y: 350 },
      question: "What implicit assumption is made when dividing by (p - 1)?",
      hint: "Remember to verify whether p is guaranteed to be strictly greater than 1 and coprime.",
    };
    updateActivePage((page) => ({
      ...page,
      socraticHints: [...page.socraticHints, newHint],
    }));
  };

  // Add high-resolution Multimodal Asset (Galaxy, Nebula, Quantum Diagram)
  const handleAddImage = async (queryPrompt?: string) => {
    const defaultQuery = queryPrompt || "James Webb Space Telescope deep galaxy cluster cosmic gravitational lensing";
    const newImage = await metaAI.generateOrFetchImage(defaultQuery, { x: 300, y: 160 });
    updateActivePage((page) => ({
      ...page,
      images: [...(page.images || []), newImage],
    }));
    speakText(`Spawned multimodal asset: ${newImage.title}`);
  };

  // Preset Scenario switcher
  const handleLoadPresetScenario = (presetName: string) => {
    if (presetName === 'pythagorean') {
      const match = workspace.pages.find(p => p.id === 'page-pythagorean');
      if (match) handleSelectPage(match.id);
    } else if (presetName === 'primes') {
      const match = workspace.pages.find(p => p.id === 'page-primes');
      if (match) handleSelectPage(match.id);
    } else if (presetName === 'euler') {
      const match = workspace.pages.find(p => p.id === 'page-euler');
      if (match) handleSelectPage(match.id);
    }
    setCurrentView('canvas');
  };

  const handleEnterCanvasFromHome = async (query?: string) => {
    if (query) {
      const isImageRequest = /(image|photo|picture|galaxy|space|nebula|black hole|telescope|cosmos|diagram|visual|art)/i.test(query);
      if (isImageRequest) {
        const newImage = await metaAI.generateOrFetchImage(query, { x: 280, y: 150 });
        updateActivePage((page) => ({
          ...page,
          images: [...(page.images || []), newImage],
        }));
        speakText(`Generated visual asset for ${newImage.title}.`);
      } else {
        const newTheorem: TheoremItem = {
          id: `thm-${Date.now()}`,
          type: 'theorem',
          title: query.length > 32 ? query.slice(0, 32) + '...' : query,
          statement: `Query: ${query}`,
          latex: "\\mathcal{Q}: \\quad " + query,
          position: { x: 340, y: 180 },
          size: { width: 340, height: 260 },
          proofs: [],
        };
        updateActivePage((page) => ({
          ...page,
          theorems: [...page.theorems, newTheorem],
        }));
        handleDiscoverProofs(newTheorem);
      }
    }
    setCurrentView('canvas');
  };

  // If on Home Portal, render the futuristic Ben 10 / SmartInk Portal!
  if (currentView === 'home') {
    return (
      <SmartInkHomePage
        onEnterCanvas={handleEnterCanvasFromHome}
        onEnterStudio={() => handleEnterStudio('home')}
        onLoadPreset={handleLoadPresetScenario}
        theme={theme}
        onToggleTheme={toggleTheme}
        onStartVoice={handleToggleVoiceListen}
      />
    );
  }

  // Simulation Studio section: requirement-driven physics with live parameters.
  if (currentView === 'studio') {
    return <SimulationStudio onBack={() => setCurrentView(studioReturnView)} onPinToCanvas={handlePinStudioToCanvas} />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden pt-13 bg-slate-50 dark:bg-[#07090e] transition-colors">
      {/* Unified Command & Navigation Header */}
      <UnifiedTopBar
        onNavigateHome={() => setCurrentView('home')}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        activePageName={activePage.name}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onLoadPreset={handleLoadPresetScenario}
        isListening={voiceState.isListening}
        voiceStatus={voiceState.status}
        onToggleVoice={handleToggleVoiceListen}
        ttsEnabled={ttsEnabled}
        onToggleTTS={() => setTtsEnabled(!ttsEnabled)}
        theme={theme}
        onToggleTheme={toggleTheme}
        config={metaConfig}
        onUpdateConfig={setMetaConfig}
        isSplitView={isSplitView}
        onToggleSplitView={() => setIsSplitView(prev => !prev)}
      />

      {/* Uploading PDF Progress Pill */}
      {isUploadingPdf && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-950/90 border border-cyan-400 text-cyan-300 text-xs font-semibold shadow-2xl backdrop-blur-xl animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Parsing PDF Document & Extracting Content...</span>
        </div>
      )}

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        pages={workspace.pages}
        onSelectPage={handleSelectPage}
        onAddTheorem={handleAddTheorem}
        onAddPaper={handleAddPaper}
        onUploadPdf={handleUploadPdf}
        onAddSticky={handleAddSticky}
        onAddImage={handleAddImage}
        onDiscoverProofs={() => handleDiscoverProofs()}
        onToggleTheme={toggleTheme}
        theme={theme}
      />

      {/* Workspace Files & Folders Drawer (Left) */}
      <WorkspaceExplorer
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
        folders={workspace.folders}
        pages={workspace.pages}
        activePageId={workspace.activePageId}
        onSelectPage={handleSelectPage}
        onCreateFolder={handleCreateFolder}
        onCreatePage={handleCreatePage}
        onDeleteFolder={handleDeleteFolder}
        onDeletePage={handleRequestDeletePage}
        onRenameFolder={handleRenameFolder}
        onRenamePage={handleRenamePage}
        onExportWorkspace={handleExportWorkspace}
        onImportWorkspace={handleImportWorkspace}
        onUploadPdf={handleUploadPdf}
        onOpenPdfReader={(doc) => setActiveReadingDoc(doc)}
      />

      {/* Infinite Canvas - Single or Split Comparison View */}
      {isSplitView ? (
        <div className="w-full h-[calc(100vh-3.25rem)] flex flex-row divide-x divide-lime-500/20">
          {/* Left Sheet Canvas */}
          <div className="relative w-1/2 h-full overflow-hidden">
            <div className="absolute top-3 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-lime-500/40 text-lime-400 text-xs font-semibold backdrop-blur-md shadow-lg shadow-black/40">
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              <span>Left Sheet: {activePage.name}</span>
            </div>
            <InfiniteCanvas
              key={`left-${activePage.id}`}
              tool={tool}
              penColor={penColor}
              strokeWidth={strokeWidth}
              theorems={activePage.theorems}
              proofs={activePage.proofs}
              documents={activePage.documents}
              images={activePage.images || []}
              plots={functionPlots}
              simulations={physicsSimulations}
              onAddSimulation={handleAddPhysicsSimulation}
              onDeleteSimulation={handleDeletePhysicsSimulation}
              onUpdateSimulation={handleUpdatePhysicsSimulation}
              socraticHints={activePage.socraticHints}
              strokes={activePage.strokes}
              onAddStroke={(s) => {
                setUndoStack((prev) => [...prev, activePage.strokes]);
                setRedoStack([]);
                updateActivePage((page) => ({ ...page, strokes: [...page.strokes, s] }));
              }}
              onDeleteStrokes={handleDeleteStrokes}
              onReplaceStrokes={handleReplaceStrokes}
              onSpeakText={speakText}
              onCanvasContext={setCanvasContext}
              onUpdatePlot={(pl) => setFunctionPlots(prev => prev.map(p => p.id === pl.id ? pl : p))}
              onDeletePlot={(id) => setFunctionPlots(prev => prev.filter(p => p.id !== id))}
              onConvertToTheoremCard={handleConvertToTheoremCard}
              onUpdateTheorem={(updated) =>
                updateActivePage((page) => ({
                  ...page,
                  theorems: page.theorems.map((t) => (t.id === updated.id ? updated : t)),
                }))
              }
              onUpdateProofNode={(updated) =>
                updateActivePage((page) => ({
                  ...page,
                  proofs: page.proofs.map((p) => (p.id === updated.id ? updated : p)),
                }))
              }
              onUpdateDocument={(updated) =>
                updateActivePage((page) => ({
                  ...page,
                  documents: page.documents.map((d) => (d.id === updated.id ? updated : d)),
                }))
              }
              onUpdateImage={(updated) =>
                updateActivePage((page) => ({
                  ...page,
                  images: (page.images || []).map((img) => (img.id === updated.id ? updated : img)),
                }))
              }
              onUpdateSocraticHint={(updated) =>
                updateActivePage((page) => ({
                  ...page,
                  socraticHints: page.socraticHints.map((h) => (h.id === updated.id ? updated : h)),
                }))
              }
              onDeleteTheorem={(id) =>
                updateActivePage((page) => ({
                  ...page,
                  theorems: page.theorems.filter((t) => t.id !== id),
                  proofs: page.proofs.filter((p) => p.theoremId !== id),
                }))
              }
              onDeleteProof={(id) =>
                updateActivePage((page) => ({
                  ...page,
                  proofs: page.proofs.filter((p) => p.id !== id),
                }))
              }
              onDeleteDocument={(id) =>
                updateActivePage((page) => ({
                  ...page,
                  documents: page.documents.filter((d) => d.id !== id),
                }))
              }
              onDeleteImage={(id) =>
                updateActivePage((page) => ({
                  ...page,
                  images: (page.images || []).filter((img) => img.id !== id),
                }))
              }
              onDeleteSocraticHint={(id) =>
                updateActivePage((page) => ({
                  ...page,
                  socraticHints: page.socraticHints.filter((h) => h.id !== id),
                }))
              }
              onDiscoverProofs={handleDiscoverProofs}
              onRequestSocraticHint={handleRequestSocraticHint}
              onSynthesizeDocument={handleSynthesizeDocument}
              onUploadPdf={handleUploadPdf}
              onSelectTool={setTool}
              onTriggerVoice={handleToggleVoiceListen}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              onLoadPresetScenario={handleLoadPresetScenario}
              onAddPlot={handleAddPlot}
            />
          </div>

          {/* Right Sheet Canvas */}
          <div className="relative w-1/2 h-full overflow-hidden">
            <div className="absolute top-3 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-semibold backdrop-blur-md shadow-lg shadow-black/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Right Sheet:</span>
              <select
                value={secondaryPage.id}
                onChange={(e) => setSecondaryPageId(e.target.value)}
                className="bg-slate-900 text-emerald-300 font-semibold text-xs border border-emerald-500/30 rounded px-1.5 py-0.5 outline-none cursor-pointer"
              >
                {workspace.pages.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <InfiniteCanvas
              key={`right-${secondaryPage.id}`}
              tool={tool}
              penColor={penColor}
              strokeWidth={strokeWidth}
              theorems={secondaryPage.theorems}
              proofs={secondaryPage.proofs}
              documents={secondaryPage.documents}
              images={secondaryPage.images || []}
              plots={functionPlots}
              simulations={physicsSimulations}
              onAddSimulation={handleAddPhysicsSimulation}
              onDeleteSimulation={handleDeletePhysicsSimulation}
              onUpdateSimulation={handleUpdatePhysicsSimulation}
              socraticHints={secondaryPage.socraticHints}
              strokes={secondaryPage.strokes}
              onAddStroke={(s) =>
                setWorkspace((prev) => ({
                  ...prev,
                  pages: prev.pages.map((p) =>
                    p.id === secondaryPage.id ? { ...p, strokes: [...p.strokes, s] } : p
                  ),
                }))
              }
              onDeleteStrokes={(ids) => {
                const idSet = new Set(ids);
                setWorkspace((prev) => ({
                  ...prev,
                  pages: prev.pages.map((p) =>
                    p.id === secondaryPage.id
                      ? { ...p, strokes: p.strokes.filter((s) => !idSet.has(s.id)) }
                      : p
                  ),
                }));
              }}
              onReplaceStrokes={(ids, newStrokes) => {
                const idSet = new Set(ids);
                setWorkspace((prev) => ({
                  ...prev,
                  pages: prev.pages.map((p) =>
                    p.id === secondaryPage.id
                      ? { ...p, strokes: [...p.strokes.filter((s) => !idSet.has(s.id)), ...newStrokes] }
                      : p
                  ),
                }));
              }}
              onSpeakText={speakText}
              onCanvasContext={setCanvasContext}
              onUpdatePlot={(pl) => setFunctionPlots(prev => prev.map(p => p.id === pl.id ? pl : p))}
              onDeletePlot={(id) => setFunctionPlots(prev => prev.filter(p => p.id !== id))}
              onConvertToTheoremCard={handleConvertToTheoremCard}
              onUpdateTheorem={(updated) =>
                setWorkspace((prev) => ({
                  ...prev,
                  pages: prev.pages.map((p) =>
                    p.id === secondaryPage.id
                      ? { ...p, theorems: p.theorems.map((t) => (t.id === updated.id ? updated : t)) }
                      : p
                  ),
                }))
              }
              onUpdateProofNode={(updated) =>
                setWorkspace((prev) => ({
                  ...prev,
                  pages: prev.pages.map((p) =>
                    p.id === secondaryPage.id
                      ? { ...p, proofs: p.proofs.map((pr) => (pr.id === updated.id ? updated : pr)) }
                      : p
                  ),
                }))
              }
              onUpdateDocument={(updated) =>
                setWorkspace((prev) => ({
                  ...prev,
                  pages: prev.pages.map((p) =>
                    p.id === secondaryPage.id
                      ? { ...p, documents: p.documents.map((d) => (d.id === updated.id ? updated : d)) }
                      : p
                  ),
                }))
              }
              onUpdateImage={(updated) =>
                setWorkspace((prev) => ({
                  ...prev,
                  pages: prev.pages.map((p) =>
                    p.id === secondaryPage.id
                      ? { ...p, images: (p.images || []).map((img) => (img.id === updated.id ? updated : img)) }
                      : p
                  ),
                }))
              }
              onUpdateSocraticHint={(updated) =>
                setWorkspace((prev) => ({
                  ...prev,
                  pages: prev.pages.map((p) =>
                    p.id === secondaryPage.id
                      ? { ...p, socraticHints: p.socraticHints.map((h) => (h.id === updated.id ? updated : h)) }
                      : p
                  ),
                }))
              }
              onDeleteTheorem={(id) =>
                setWorkspace((prev) => ({
                  ...prev,
                  pages: prev.pages.map((p) =>
                    p.id === secondaryPage.id
                      ? {
                          ...p,
                          theorems: p.theorems.filter((t) => t.id !== id),
                          proofs: p.proofs.filter((pr) => pr.theoremId !== id),
                        }
                      : p
                  ),
                }))
              }
              onDeleteProof={(id) =>
                setWorkspace((prev) => ({
                  ...prev,
                  pages: prev.pages.map((p) =>
                    p.id === secondaryPage.id
                      ? { ...p, proofs: p.proofs.filter((pr) => pr.id !== id) }
                      : p
                  ),
                }))
              }
              onDeleteDocument={(id) =>
                setWorkspace((prev) => ({
                  ...prev,
                  pages: prev.pages.map((p) =>
                    p.id === secondaryPage.id
                      ? { ...p, documents: p.documents.filter((d) => d.id !== id) }
                      : p
                  ),
                }))
              }
              onDeleteImage={(id) =>
                setWorkspace((prev) => ({
                  ...prev,
                  pages: prev.pages.map((p) =>
                    p.id === secondaryPage.id
                      ? { ...p, images: (p.images || []).filter((img) => img.id !== id) }
                      : p
                  ),
                }))
              }
              onDeleteSocraticHint={(id) =>
                setWorkspace((prev) => ({
                  ...prev,
                  pages: prev.pages.map((p) =>
                    p.id === secondaryPage.id
                      ? { ...p, socraticHints: p.socraticHints.filter((h) => h.id !== id) }
                      : p
                  ),
                }))
              }
              onDiscoverProofs={handleDiscoverProofs}
              onRequestSocraticHint={handleRequestSocraticHint}
              onSynthesizeDocument={handleSynthesizeDocument}
              onUploadPdf={handleUploadPdf}
              onSelectTool={setTool}
              onTriggerVoice={handleToggleVoiceListen}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              onLoadPresetScenario={handleLoadPresetScenario}
              onAddPlot={handleAddPlot}
            />
          </div>
        </div>
      ) : (
        <div className="w-full h-[calc(100vh-3.25rem)] relative overflow-hidden">
          <InfiniteCanvas
            key={activePage.id}
            tool={tool}
            penColor={penColor}
            strokeWidth={strokeWidth}
            theorems={activePage.theorems}
            proofs={activePage.proofs}
            documents={activePage.documents}
            images={activePage.images || []}
            plots={functionPlots}
            simulations={physicsSimulations}
            onAddSimulation={handleAddPhysicsSimulation}
            onDeleteSimulation={handleDeletePhysicsSimulation}
            onUpdateSimulation={handleUpdatePhysicsSimulation}
            socraticHints={activePage.socraticHints}
            strokes={activePage.strokes}
            onAddStroke={(s) => {
              setUndoStack((prev) => [...prev, activePage.strokes]);
              setRedoStack([]);
              updateActivePage((page) => ({ ...page, strokes: [...page.strokes, s] }));
            }}
            onDeleteStrokes={handleDeleteStrokes}
            onReplaceStrokes={handleReplaceStrokes}
            onSpeakText={speakText}
            onCanvasContext={setCanvasContext}
            onUpdatePlot={(pl) => setFunctionPlots(prev => prev.map(p => p.id === pl.id ? pl : p))}
            onDeletePlot={(id) => setFunctionPlots(prev => prev.filter(p => p.id !== id))}
            onConvertToTheoremCard={handleConvertToTheoremCard}
            onUpdateTheorem={(updated) =>
              updateActivePage((page) => ({
                ...page,
                theorems: page.theorems.map((t) => (t.id === updated.id ? updated : t)),
              }))
            }
            onUpdateProofNode={(updated) =>
              updateActivePage((page) => ({
                ...page,
                proofs: page.proofs.map((p) => (p.id === updated.id ? updated : p)),
              }))
            }
            onUpdateDocument={(updated) =>
              updateActivePage((page) => ({
                ...page,
                documents: page.documents.map((d) => (d.id === updated.id ? updated : d)),
              }))
            }
            onUpdateImage={(updated) =>
              updateActivePage((page) => ({
                ...page,
                images: (page.images || []).map((img) => (img.id === updated.id ? updated : img)),
              }))
            }
            onUpdateSocraticHint={(updated) =>
              updateActivePage((page) => ({
                ...page,
                socraticHints: page.socraticHints.map((h) => (h.id === updated.id ? updated : h)),
              }))
            }
            onDeleteTheorem={(id) =>
              updateActivePage((page) => ({
                ...page,
                theorems: page.theorems.filter((t) => t.id !== id),
                proofs: page.proofs.filter((p) => p.theoremId !== id),
              }))
            }
            onDeleteProof={(id) =>
              updateActivePage((page) => ({
                ...page,
                proofs: page.proofs.filter((p) => p.id !== id),
              }))
            }
            onDeleteDocument={(id) =>
              updateActivePage((page) => ({
                ...page,
                documents: page.documents.filter((d) => d.id !== id),
              }))
            }
            onDeleteImage={(id) =>
              updateActivePage((page) => ({
                ...page,
                images: (page.images || []).filter((img) => img.id !== id),
              }))
            }
            onDeleteSocraticHint={(id) =>
              updateActivePage((page) => ({
                ...page,
                socraticHints: page.socraticHints.filter((h) => h.id !== id),
              }))
            }
            onDiscoverProofs={handleDiscoverProofs}
            onRequestSocraticHint={handleRequestSocraticHint}
            onSynthesizeDocument={handleSynthesizeDocument}
            onUploadPdf={handleUploadPdf}
            onSelectTool={setTool}
            onTriggerVoice={handleToggleVoiceListen}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onLoadPresetScenario={handleLoadPresetScenario}
            onAddPlot={handleAddPlot}
          />
        </div>
      )}

      {/* Floating Bottom Ergonomic Dock */}
      <FloatingDock
        currentTool={tool}
        onSelectTool={setTool}
        penColor={penColor}
        onChangePenColor={setPenColor}
        strokeWidth={strokeWidth}
        onChangeStrokeWidth={setStrokeWidth}
        onAddTheorem={handleAddTheorem}
        onAddPaper={handleAddPaper}
        onUploadPdf={handleUploadPdf}
        onAddSticky={handleAddSticky}
        onAddImage={handleAddImage}
        onAddPlot={() => handleAddPlot('sin(x)')}
        plotCount={functionPlots.length}
        onAddPhysics={() => handleAddPhysicsSimulation('pendulum')}
        onOpenStudio={() => handleEnterStudio('canvas')}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onClearInk={handleRequestClearInk}
        onRecognizeInk={handleRecognizeInk}
        hasInkStrokes={activePage.strokes.length > 0}
      />

      {/* Clear Canvas / Page Confirmation Modal */}
      <ConfirmationModal
        isOpen={isClearPageModalOpen}
        onClose={() => setIsClearPageModalOpen(false)}
        onConfirm={handleConfirmClearPage}
        title="Clear Canvas Page?"
        description="Are you sure you want to clear this canvas page? All your current digital ink drawings and handwriting will be removed."
        confirmLabel="Clear Canvas Ink"
        confirmVariant="warning"
        strokeCount={activePage.strokes.length}
        theoremCount={activePage.theorems.length}
        plotCount={functionPlots.length}
        showClearAllOption={true}
      />

      {/* Delete Page Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!pageToDeleteId}
        onClose={() => setPageToDeleteId(null)}
        onConfirm={handleConfirmDeletePage}
        title="Delete Page?"
        description={`Are you sure you want to permanently delete "${
          workspace.pages.find((p) => p.id === pageToDeleteId)?.name || 'this page'
        }"? All notes, theorems, calculations, and drawings on this page will be deleted.`}
        confirmLabel="Delete Page"
        confirmVariant="danger"
        isPageDeletion={true}
        strokeCount={workspace.pages.find((p) => p.id === pageToDeleteId)?.strokes.length || 0}
        theoremCount={workspace.pages.find((p) => p.id === pageToDeleteId)?.theorems.length || 0}
      />

      {/* PDF Full Reader & Text-to-Speech Distraction-Free Modal */}
      {activeReadingDoc && (
        <PdfReaderModal
          document={activeReadingDoc}
          isOpen={!!activeReadingDoc}
          onClose={() => setActiveReadingDoc(null)}
          onSynthesize={handleSynthesizeDocument}
          onUpdateDocument={(updatedDoc) => {
            setActiveReadingDoc(updatedDoc);
            updateActivePage((page) => ({
              ...page,
              documents: page.documents.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)),
            }));
          }}
        />
      )}
    </div>
  );
}

export default App;

