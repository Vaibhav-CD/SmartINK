import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  ToolMode, 
  Point, 
  Stroke, 
  TheoremItem, 
  ProofNode, 
  DocumentItem, 
  ImageItem,
  SocraticAnnotation 
} from '../../types';
import { TheoremCard } from '../TheoremCard';
import { ProofNodeCard } from '../ProofNodeCard';
import { DocumentCard } from '../DocumentCard';
import { ImageCard } from '../ImageCard';
import { SocraticSticky } from '../SocraticSticky';
import { CanvasConnections } from '../CanvasConnections';
import { CanvasViewportControls } from '../CanvasViewportControls';
import { InlineMathProjection } from '../InlineMathProjection';
import { InteractiveFunctionPlot } from '../InteractiveFunctionPlot';
import { LivingPhysicsWidget } from '../LivingPhysicsWidget';
import { LivingInkPhysicsEngine, type PhysicsParams, type PhysicsSystemType } from '../../services/physics/livingInkPhysics';
import { eraseStrokePixels } from '../../services/ink/pixelErase';
import { Zap, Activity, Trash2, X, Target, Sparkles, PenLine, Sigma, Atom } from 'lucide-react';
import { OnDeviceStrokeRecognizer, type ProjectedEquation } from '../../services/calcInk/strokeRecognizer';
import { refineEquationsWithNeural } from '../../services/recognition/refine';
import { neuralGlyphService } from '../../services/recognition/neuralGlyphService';
import { HandwritingVectorSynthesizer } from '../../services/calcInk/handwritingSynthesis';
import { MathParser } from '../../services/calcInk/mathParser';
import { solveWithSteps, type SolutionStep } from '../../services/calcInk/solutionSteps';
import { transcribeWords } from '../../services/recognition/transcribe';
import type { ConversationContext } from '../../services/copilot/conversationAgent';
import { LassoCopilotModal } from '../Copilot/LassoCopilotModal';
import { 
  isStrokeIntersected, 
  isScratchGesture, 
  getStrokesBoundingBox,
  isCircleLassoGesture,
  isStrokeEnclosedInBox,
  type BoundingBox 
} from '../../services/calcInk/coordinateTransform';

export interface FunctionPlotItem {
  id: string;
  func: string;
  position: Point;
}

export interface PhysicsSimItem {
  id: string;
  type: PhysicsSystemType;
  title: string;
  position: Point;
  params?: PhysicsParams;
}

interface InfiniteCanvasProps {
  tool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  penColor: string;
  strokeWidth?: number;
  theorems: TheoremItem[];
  proofs: ProofNode[];
  documents: DocumentItem[];
  images: ImageItem[];
  plots?: FunctionPlotItem[];
  simulations?: PhysicsSimItem[];
  onAddSimulation?: (simType: PhysicsSystemType, position?: Point) => void;
  onDeleteSimulation?: (id: string) => void;
  onUpdateSimulation?: (sim: PhysicsSimItem) => void;
  socraticHints: SocraticAnnotation[];
  strokes: Stroke[];
  onAddStroke: (stroke: Stroke) => void;
  onDeleteStrokes?: (ids: string[]) => void;
  onReplaceStrokes?: (ids: string[], newStrokes: Stroke[], pushUndo?: boolean) => void;
  onSpeakText?: (text: string) => void;
  onCanvasContext?: (ctx: ConversationContext) => void;
  onUpdateTheorem: (theorem: TheoremItem) => void;
  onUpdateProofNode: (proof: ProofNode) => void;
  onUpdateDocument: (doc: DocumentItem) => void;
  onUpdateImage: (img: ImageItem) => void;
  onUpdatePlot?: (plot: FunctionPlotItem) => void;
  onDeletePlot?: (id: string) => void;
  onAddPlot?: (fnStr: string, position?: Point, targetPlotId?: string) => void;
  onUpdateSocraticHint: (hint: SocraticAnnotation) => void;
  onDeleteTheorem: (id: string) => void;
  onDeleteProof: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onDeleteImage: (id: string) => void;
  onDeleteSocraticHint: (id: string) => void;
  onDiscoverProofs: (theorem: TheoremItem) => void;
  onRequestSocraticHint: (theorem: TheoremItem) => void;
  onSynthesizeDocument: (doc: DocumentItem) => void;
  onUploadPdf?: (file: File, position?: Point) => void;
  onConvertToTheoremCard?: (eq: ProjectedEquation) => void;
  onTriggerVoice?: () => void;
  onOpenCommandPalette?: () => void;
  onLoadPresetScenario?: (name: string) => void;
}

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({
  tool,
  onSelectTool: _onSelectTool,
  penColor,
  strokeWidth = 3.5,
  theorems,
  proofs,
  documents,
  images,
  plots = [],
  simulations = [],
  onAddSimulation,
  onDeleteSimulation,
  onUpdateSimulation,
  socraticHints,
  strokes,
  onAddStroke,
  onDeleteStrokes,
  onReplaceStrokes,
  onSpeakText,
  onCanvasContext,
  onUpdateTheorem,
  onUpdateProofNode,
  onUpdateDocument,
  onUpdateImage,
  onUpdatePlot,
  onDeletePlot,
  onAddPlot,
  onUpdateSocraticHint,
  onDeleteTheorem,
  onDeleteProof,
  onDeleteDocument,
  onDeleteImage,
  onDeleteSocraticHint,
  onDiscoverProofs,
  onRequestSocraticHint,
  onSynthesizeDocument,
  onUploadPdf,
  onConvertToTheoremCard,
  onTriggerVoice: _onTriggerVoice,
  onOpenCommandPalette: _onOpenCommandPalette,
  onLoadPresetScenario: _onLoadPresetScenario,
}) => {
  // Canvas viewport transform
  const [viewTransform, setViewTransform] = useState<{ x: number; y: number; scale: number }>({
    x: 80,
    y: 80,
    scale: 1,
  });

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Selected item
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Living Ink Physics Simulations state
  const [localSimulations, setLocalSimulations] = useState<PhysicsSimItem[]>([]);
  const effectiveSimulations = simulations.length > 0 ? simulations : localSimulations;

  // Item dragging state
  const [draggingItem, setDraggingItem] = useState<{
    id: string;
    type: 'theorem' | 'proof' | 'doc' | 'hint' | 'image' | 'plot';
    startX: number;
    startY: number;
    itemStartX: number;
    itemStartY: number;
  } | null>(null);

  // Pen drawing & eraser states
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [eraserMode, setEraserMode] = useState<'stroke' | 'pixel'>('stroke');
  const pixelEraseUndoPushed = useRef(false);
  const [currentStrokePoints, setCurrentStrokePoints] = useState<Point[]>([]);

  // Selection Marquee Box & Circle-to-Solve States
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ start: Point; current: Point } | null>(null);
  const [selectedStrokes, setSelectedStrokes] = useState<Stroke[]>([]);
  const [selectionBbox, setSelectionBbox] = useState<BoundingBox | null>(null);
  const [selectedEquation, setSelectedEquation] = useState<ProjectedEquation | null>(null);
  const [_selectedEquations, setSelectedEquations] = useState<ProjectedEquation[]>([]);
  const [selectedFormulaText, setSelectedFormulaText] = useState<string>('');
  const [selectedSolveOutput, setSelectedSolveOutput] = useState<string | null>(null);
  // Live transcription of the current selection (derived, never stale).
  const selectedTranscription = useMemo(() => {
    if (selectedStrokes.length === 0) return '';
    return transcribeWords(selectedStrokes)
      .map((w) => w.text)
      .join(' ');
  }, [selectedStrokes]);

  // Circle-to-Solve Reticle State
  const [circleReticle, setCircleReticle] = useState<{
    bbox: BoundingBox;
    equation: ProjectedEquation;
    steps: SolutionStep[] | null;
  } | null>(null);
  const [copilotSymbol, setCopilotSymbol] = useState<string | null>(null);

  // Real-time scanned equations
  const [projectedEquations, setProjectedEquations] = useState<ProjectedEquation[]>([]);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep canvas buffer in sync with container dimensions (prevents distortion & coordinate drift)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    const ro = new ResizeObserver(() => {
      updateSize();
    });
    ro.observe(container);

    return () => ro.disconnect();
  }, []);

  // Convert screen coordinates to canvas world coordinates with sub-pixel container offset subtraction
  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    const offsetX = rect ? rect.left : 0;
    const offsetY = rect ? rect.top : 0;
    return {
      x: (screenX - offsetX - viewTransform.x) / viewTransform.scale,
      y: (screenY - offsetY - viewTransform.y) / viewTransform.scale,
    };
  }, [viewTransform]);

  // Real-time equation scanner across active strokes
  useEffect(() => {
    let cancelled = false;
    const snapshot = strokes;
    const timer = setTimeout(() => {
      const scanned = OnDeviceStrokeRecognizer.scanEquations(snapshot);
      if (cancelled) return;
      setProjectedEquations(scanned);
      // Neural refinement runs off the critical path in a Web Worker and
      // only swaps in confident digit corrections (no-op when unavailable).
      refineEquationsWithNeural(scanned, snapshot, neuralGlyphService)
        .then((refined) => {
          if (!cancelled && refined !== scanned) {
            setProjectedEquations(refined);
          }
        })
        .catch(() => {
          // Geometric projection already stands; ignore worker failures.
        });
    }, 100);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [strokes]);

  // Report latest equation + transcription up for conversation mode.
  // Deduped so parent state only changes when the context actually changes.
  const lastCtxKey = useRef('');
  useEffect(() => {
    if (!onCanvasContext) return;
    const latest = projectedEquations[0];
    const ctx: ConversationContext = {
      equationText: latest?.expressionText,
      solutionDisplay: latest?.evaluation.display,
      transcription: selectedTranscription || undefined,
    };
    const key = JSON.stringify(ctx);
    if (key !== lastCtxKey.current) {
      lastCtxKey.current = key;
      onCanvasContext(ctx);
    }
  }, [projectedEquations, selectedTranscription, onCanvasContext]);

  // Convert projected equation result into digital handwritten ink strokes (Apple Math Notes style)
  const handleWriteInInk = useCallback((eq: ProjectedEquation) => {
    const displayText = eq.isPlottableFunction || eq.evaluation.isEquationSolution
      ? eq.evaluation.display
      : `= ${eq.evaluation.display}`;

    const height = eq.boundingBox.height ? Math.max(22, Math.min(48, eq.boundingBox.height * 0.9)) : 32;
    const generatedStrokes = HandwritingVectorSynthesizer.synthesize(
      displayText,
      { x: eq.anchorPosition.x, y: eq.anchorPosition.y },
      eq.style,
      height
    );

    generatedStrokes.forEach((st) => onAddStroke(st));
  }, [onAddStroke]);

  // Handle dynamic variable updates from on-canvas scrubber (Desmos / Math Notes)
  const handleUpdateVariable = useCallback((varName: string, value: number) => {
    MathParser.setGlobalVariable(varName, value);
    const scanned = OnDeviceStrokeRecognizer.scanEquations(strokes);
    setProjectedEquations(scanned);
  }, [strokes]);

  // Solve selection expression or algebraic equation
  const handleSolveSelection = useCallback((customText?: string) => {
    const textToSolve = (customText ?? selectedFormulaText).trim();
    if (!textToSolve) return;
    const evalRes = MathParser.evaluate(textToSolve);
    if (evalRes.success && evalRes.display) {
      setSelectedSolveOutput(evalRes.display);
    } else {
      setSelectedSolveOutput(evalRes.error || 'No solution');
    }
  }, [selectedFormulaText]);

  // Plot selected expression as a 2D function curve
  const handlePlotSelection = useCallback(() => {
    const rawExpr = selectedFormulaText.trim();
    if (!rawExpr || !onAddPlot) return;

    let plotBody = rawExpr;
    if (rawExpr.includes('=')) {
      const parts = rawExpr.split('=');
      const lhs = parts[0].trim();
      const rhs = parts[1]?.trim() || '';
      if (lhs && rhs && rhs !== '0') {
        plotBody = `${lhs}, ${rhs}`;
      } else if (lhs) {
        plotBody = lhs;
      }
    }
    const targetPos = selectionBbox
      ? { x: selectionBbox.maxX + 30, y: selectionBbox.minY }
      : { x: 340, y: 180 };
    onAddPlot(plotBody, targetPos);
  }, [selectedFormulaText, onAddPlot, selectionBbox]);

  // Write solved result as digital handwriting next to selected strokes (Apple Math Notes style)
  const handleWriteInkSelection = useCallback(() => {
    if (!selectedSolveOutput || !selectionBbox) return;
    const style = selectedStrokes.length > 0 ? OnDeviceStrokeRecognizer.extractHandwritingStyle(selectedStrokes) : undefined;
    const isEq = selectedSolveOutput.includes('=');
    const writeText = isEq ? selectedSolveOutput : `= ${selectedSolveOutput}`;
    const generated = HandwritingVectorSynthesizer.synthesize(
      writeText,
      { x: selectionBbox.maxX + 18, y: selectionBbox.centerY - 10 },
      style,
      Math.max(22, Math.min(48, selectionBbox.height * 0.8))
    );
    generated.forEach((st) => onAddStroke(st));
  }, [selectedSolveOutput, selectionBbox, selectedStrokes, onAddStroke]);

  // AI solve / theorem derivation for selected equation
  const handleAISolveSelection = useCallback(() => {
    if (!selectedFormulaText) return;
    const item: TheoremItem = {
      id: `thm-sel-${Date.now()}`,
      type: 'theorem',
      title: `Equation: ${selectedFormulaText}`,
      statement: `Derived and analyzed from selected canvas strokes: ${selectedFormulaText}`,
      latex: selectedFormulaText,
      position: { x: (selectionBbox?.maxX || 400) + 30, y: selectionBbox?.minY || 200 },
      size: { width: 340, height: 260 },
      proofs: [],
    };
    onDiscoverProofs(item);
  }, [selectedFormulaText, selectionBbox, onDiscoverProofs]);

  // Spatial eraser helper (stroke mode deletes whole strokes, pixel mode splits them)
  const eraseAtPoint = useCallback((worldPt: Point) => {
    const eraserRadius = 20 / viewTransform.scale;
    if (eraserMode === 'pixel' && onReplaceStrokes) {
      const ids: string[] = [];
      const replacements: Stroke[] = [];
      for (const s of strokes) {
        const parts = eraseStrokePixels(s, worldPt, eraserRadius);
        if (parts !== null) {
          ids.push(s.id);
          replacements.push(...parts);
        }
      }
      if (ids.length > 0) {
        onReplaceStrokes(ids, replacements, !pixelEraseUndoPushed.current);
        pixelEraseUndoPushed.current = true;
      }
      return;
    }
    const hitStrokes = strokes.filter(s => isStrokeIntersected(s, worldPt, eraserRadius));
    if (hitStrokes.length > 0 && onDeleteStrokes) {
      onDeleteStrokes(hitStrokes.map(s => s.id));
    }
  }, [strokes, viewTransform.scale, onDeleteStrokes, onReplaceStrokes, eraserMode]);

  // Spacebar pan toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Highly-tuned, smooth wheel & trackpad sensitivity
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    const offsetX = rect ? rect.left : 0;
    const offsetY = rect ? rect.top : 0;
    const mouseX = e.clientX - offsetX;
    const mouseY = e.clientY - offsetY;

    // 1. Pinch Zoom or Ctrl/Cmd + Wheel
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = Math.exp(-e.deltaY * 0.006);
      const newScale = Math.min(Math.max(viewTransform.scale * zoomFactor, 0.15), 4.0);

      const newX = mouseX - (mouseX - viewTransform.x) * (newScale / viewTransform.scale);
      const newY = mouseY - (mouseY - viewTransform.y) * (newScale / viewTransform.scale);

      setViewTransform({ x: newX, y: newY, scale: newScale });
      return;
    }

    // 2. Mouse Wheel (discrete step scroll) vs Trackpad
    if (e.deltaMode === 1) {
      // Discrete mouse wheel: zoom smoothly centered on mouse
      const zoomFactor = Math.exp(-e.deltaY * 0.0025);
      const newScale = Math.min(Math.max(viewTransform.scale * zoomFactor, 0.15), 4.0);

      const newX = mouseX - (mouseX - viewTransform.x) * (newScale / viewTransform.scale);
      const newY = mouseY - (mouseY - viewTransform.y) * (newScale / viewTransform.scale);

      setViewTransform({ x: newX, y: newY, scale: newScale });
      return;
    }

    // 3. Trackpad Two-Finger Pan (smooth, natural scrolling)
    setViewTransform((prev) => ({
      ...prev,
      x: prev.x - e.deltaX * 0.85,
      y: prev.y - e.deltaY * 0.85,
    }));
  };

  // Dragging Canvas elements
  const handleStartItemDrag = (
    e: React.MouseEvent,
    id: string,
    type: 'theorem' | 'proof' | 'doc' | 'hint' | 'image' | 'plot'
  ) => {
    e.stopPropagation();
    let initialX = 0;
    let initialY = 0;

    if (type === 'theorem') {
      const item = theorems.find((t) => t.id === id);
      if (item) { initialX = item.position.x; initialY = item.position.y; }
    } else if (type === 'proof') {
      const item = proofs.find((p) => p.id === id);
      if (item) { initialX = item.position.x; initialY = item.position.y; }
    } else if (type === 'doc') {
      const item = documents.find((d) => d.id === id);
      if (item) { initialX = item.position.x; initialY = item.position.y; }
    } else if (type === 'hint') {
      const item = socraticHints.find((h) => h.id === id);
      if (item) { initialX = item.position.x; initialY = item.position.y; }
    } else if (type === 'image') {
      const item = images.find((img) => img.id === id);
      if (item) { initialX = item.position.x; initialY = item.position.y; }
    } else if (type === 'plot') {
      const item = plots.find((pl) => pl.id === id);
      if (item) { initialX = item.position.x; initialY = item.position.y; }
    }

    setDraggingItem({
      id,
      type,
      startX: e.clientX,
      startY: e.clientY,
      itemStartX: initialX,
      itemStartY: initialY,
    });
  };

  // Pointer Down (Sub-pixel Stylus / Mouse)
  const handlePointerDown = (e: React.PointerEvent) => {
    // Never hijack clicks on UI buttons, inputs, panels, or interactive controls!
    if ((e.target as HTMLElement).closest('button, input, select, textarea, [data-interactive], .pointer-events-auto')) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    const offsetX = rect ? rect.left : 0;
    const offsetY = rect ? rect.top : 0;
    const clientX = e.clientX - offsetX;
    const clientY = e.clientY - offsetY;

    // Pan trigger: middle click, or pan tool, or space pressed
    if (e.button === 1 || tool === 'pan' || isSpacePressed) {
      setIsPanning(true);
      setPanStart({ x: clientX - viewTransform.x, y: clientY - viewTransform.y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // Eraser trigger
    if (tool === 'eraser' && e.button === 0) {
      setIsErasing(true);
      pixelEraseUndoPushed.current = false;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const worldPt = screenToWorld(e.clientX, e.clientY);
      eraseAtPoint(worldPt);
      return;
    }

    // Inking trigger
    if (tool === 'pen' && e.button === 0) {
      setIsDrawing(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const worldPt = screenToWorld(e.clientX, e.clientY);
      setCurrentStrokePoints([worldPt]);
      return;
    }

    // Selection marquee trigger
    if (tool === 'select' && e.button === 0) {
      setIsSelecting(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const worldPt = screenToWorld(e.clientX, e.clientY);
      setSelectionBox({ start: worldPt, current: worldPt });
      setSelectedStrokes([]);
      setSelectionBbox(null);
      setSelectedEquation(null);
      setSelectedEquations([]);
      setSelectedFormulaText('');
      setSelectedSolveOutput(null);
      setCircleReticle(null);
      return;
    }

    setSelectedId(null);
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const offsetX = rect ? rect.left : 0;
    const offsetY = rect ? rect.top : 0;
    const clientX = e.clientX - offsetX;
    const clientY = e.clientY - offsetY;

    if (isPanning) {
      setViewTransform((prev) => ({
        ...prev,
        x: clientX - panStart.x,
        y: clientY - panStart.y,
      }));
      return;
    }

    if (isSelecting) {
      const worldPt = screenToWorld(e.clientX, e.clientY);
      setSelectionBox((prev) => prev ? { ...prev, current: worldPt } : null);
      return;
    }

    if (isErasing && tool === 'eraser') {
      const worldPt = screenToWorld(e.clientX, e.clientY);
      eraseAtPoint(worldPt);
      return;
    }

    if (draggingItem) {
      const deltaX = (e.clientX - draggingItem.startX) / viewTransform.scale;
      const deltaY = (e.clientY - draggingItem.startY) / viewTransform.scale;
      const newX = draggingItem.itemStartX + deltaX;
      const newY = draggingItem.itemStartY + deltaY;

      if (draggingItem.type === 'theorem') {
        const item = theorems.find((t) => t.id === draggingItem.id);
        if (item) onUpdateTheorem({ ...item, position: { x: newX, y: newY } });
      } else if (draggingItem.type === 'proof') {
        const item = proofs.find((p) => p.id === draggingItem.id);
        if (item) onUpdateProofNode({ ...item, position: { x: newX, y: newY } });
      } else if (draggingItem.type === 'doc') {
        const item = documents.find((d) => d.id === draggingItem.id);
        if (item) onUpdateDocument({ ...item, position: { x: newX, y: newY } });
      } else if (draggingItem.type === 'hint') {
        const item = socraticHints.find((h) => h.id === draggingItem.id);
        if (item) onUpdateSocraticHint({ ...item, position: { x: newX, y: newY } });
      } else if (draggingItem.type === 'image') {
        const item = images.find((img) => img.id === draggingItem.id);
        if (item) onUpdateImage({ ...item, position: { x: newX, y: newY } });
      } else if (draggingItem.type === 'plot') {
        const item = plots.find((pl) => pl.id === draggingItem.id);
        if (item && onUpdatePlot) onUpdatePlot({ ...item, position: { x: newX, y: newY } });
      }
      return;
    }

    if (isDrawing && tool === 'pen') {
      const worldPt = screenToWorld(e.clientX, e.clientY);
      // Distance threshold smoothing for responsive, high-fps inking
      setCurrentStrokePoints((prev) => {
        const last = prev[prev.length - 1];
        if (last) {
          const distSq = (worldPt.x - last.x) ** 2 + (worldPt.y - last.y) ** 2;
          if (distSq < 2.0) return prev; // Avoid redundant jitter points
        }
        return [...prev, worldPt];
      });
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (isPanning) {
      setIsPanning(false);
    }

    if (isErasing) {
      setIsErasing(false);
    }

    if (draggingItem) {
      setDraggingItem(null);
    }

    // Selection marquee release
    if (isSelecting) {
      setIsSelecting(false);
      if (selectionBox) {
        const minX = Math.min(selectionBox.start.x, selectionBox.current.x);
        const maxX = Math.max(selectionBox.start.x, selectionBox.current.x);
        const minY = Math.min(selectionBox.start.y, selectionBox.current.y);
        const maxY = Math.max(selectionBox.start.y, selectionBox.current.y);
        const width = maxX - minX;
        const height = maxY - minY;

        if (width > 15 && height > 15) {
          const bbox: BoundingBox = {
            minX, maxX, minY, maxY, width, height,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2,
          };
          const enclosed = strokes.filter(s => isStrokeEnclosedInBox(s, bbox));
          if (enclosed.length > 0) {
            setSelectedStrokes(enclosed);
            setSelectionBbox(bbox);
            // Solve enclosed strokes specifically!
            const scanned = OnDeviceStrokeRecognizer.scanEquations(enclosed);
            const solvedSingle = OnDeviceStrokeRecognizer.recognizeStrokeGroup(enclosed);
            const parsed = OnDeviceStrokeRecognizer.parseClusterToExpression(enclosed);
            const allFound = scanned.length > 0 ? scanned : (solvedSingle ? [solvedSingle] : []);
            setSelectedEquations(allFound);
            setSelectedEquation(allFound[0] || solvedSingle || null);

            const initialFormula = allFound[0]?.expressionText || solvedSingle?.expressionText || parsed.expressionStr || '';
            setSelectedFormulaText(initialFormula);

            if (allFound[0]?.evaluation?.display) {
              setSelectedSolveOutput(allFound[0].evaluation.display);
            } else if (solvedSingle?.evaluation?.display) {
              setSelectedSolveOutput(solvedSingle.evaluation.display);
            } else if (initialFormula) {
              const qEval = MathParser.evaluate(initialFormula);
              if (qEval.success && qEval.display) {
                setSelectedSolveOutput(qEval.display);
              } else {
                setSelectedSolveOutput(null);
              }
            } else {
              setSelectedSolveOutput(null);
            }
          } else {
            setSelectedStrokes([]);
            setSelectionBbox(null);
            setSelectedEquation(null);
            setSelectedEquations([]);
            setSelectedFormulaText('');
            setSelectedSolveOutput(null);
          }
        } else {
          setSelectedStrokes([]);
          setSelectionBbox(null);
          setSelectedEquation(null);
          setSelectedEquations([]);
          setSelectedFormulaText('');
          setSelectedSolveOutput(null);
        }
      }
      setSelectionBox(null);
    }

    if (isDrawing) {
      setIsDrawing(false);
      if (currentStrokePoints.length > 2) {
        // Creative Extension: Gesture-based scratch-to-erase
        if (isScratchGesture(currentStrokePoints)) {
          const scratchBbox = getStrokesBoundingBox([{
            id: 'temp-scratch',
            points: currentStrokePoints,
            color: '#fff',
            width: 1,
            createdAt: 0,
          }]);
          if (scratchBbox && onDeleteStrokes) {
            const hitStrokes = strokes.filter(s => {
              const b = getStrokesBoundingBox([s]);
              if (!b) return false;
              return !(
                b.maxX < scratchBbox.minX ||
                b.minX > scratchBbox.maxX ||
                b.maxY < scratchBbox.minY ||
                b.minY > scratchBbox.maxY
              );
            });
            if (hitStrokes.length > 0) {
              onDeleteStrokes(hitStrokes.map(s => s.id));
            }
          }
        } else {
          // Creative Extension: Gesture-based Circle-to-Solve
          const circleCheck = isCircleLassoGesture(currentStrokePoints, strokes);
          if (circleCheck.isCircle && circleCheck.enclosedStrokes.length > 0) {
            // User circled a calculation on canvas!
            const solved = OnDeviceStrokeRecognizer.recognizeStrokeGroup(circleCheck.enclosedStrokes) ||
              OnDeviceStrokeRecognizer.scanEquations(circleCheck.enclosedStrokes)[0] || null;
            if (solved) {
              const stepped = solveWithSteps(solved.expressionText);
              const steps =
                stepped && stepped.steps.length > 0 ? stepped.steps : null;
              setCircleReticle({
                bbox: circleCheck.bbox!,
                equation: solved,
                steps,
              });
              if (steps && onSpeakText) {
                onSpeakText(steps.map((s) => s.spoken).join('. ') + '.');
              }
              // Ensure circled equation is in projected equations list
              setProjectedEquations(prev => {
                const rest = prev.filter(p => p.id !== solved.id);
                return [solved, ...rest];
              });
            }
          }

          onAddStroke({
            id: `stroke-${Date.now()}`,
            points: currentStrokePoints,
            color: penColor,
            width: strokeWidth,
            createdAt: Date.now(),
          });
        }
      }
      setCurrentStrokePoints([]);
    }
  };

  // Redraw digital ink canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvasSize.width || containerRef.current?.clientWidth || window.innerWidth;
    const height = canvasSize.height || containerRef.current?.clientHeight || window.innerHeight;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(viewTransform.x, viewTransform.y);
    ctx.scale(viewTransform.scale, viewTransform.scale);

    // Helper function to render organic smoothed vector inking (PS Requirement #1)
    const renderOrganicStroke = (points: Point[], color: string, strokeW: number) => {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (points.length === 2) {
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.stroke();
        return;
      }

      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
    };

    // Render persistent strokes
    strokes.forEach((stroke) => {
      renderOrganicStroke(stroke.points, stroke.color, stroke.width);
    });

    // Render current active stroke
    if (currentStrokePoints.length > 1) {
      renderOrganicStroke(currentStrokePoints, penColor, strokeWidth);
    }

    ctx.restore();
  }, [strokes, currentStrokePoints, penColor, strokeWidth, viewTransform, canvasSize]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
            e.preventDefault();
            e.stopPropagation();
            if (onUploadPdf) {
              const worldPos = screenToWorld(e.clientX, e.clientY);
              onUploadPdf(file, worldPos);
            }
          }
        }
      }}
      className={`relative w-full h-full overflow-hidden canvas-grid touch-none ${
        isPanning || isSpacePressed
          ? 'cursor-grab active:cursor-grabbing'
          : tool === 'pen'
          ? 'cursor-crosshair'
          : tool === 'eraser'
          ? 'cursor-cell'
          : 'cursor-default'
      }`}
    >
      {/* Dynamic Digital Ink Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Eraser mode toggle: whole-stroke vs pixel-precise erase */}
      {tool === 'eraser' && (
        <div className="absolute top-4 left-4 z-30 flex rounded-xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-950/90 shadow-lg overflow-hidden">
          {(['stroke', 'pixel'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setEraserMode(mode)}
              title={mode === 'stroke' ? 'Erase whole strokes' : 'Erase part of a stroke'}
              className={`px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                eraserMode === mode
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {mode === 'stroke' ? 'Stroke' : 'Pixel'}
            </button>
          ))}
        </div>
      )}

      {/* Real-Time Interactive Smart Space HUD (CalcInk PS Feature - Multi-Workout Support) */}
      {projectedEquations.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-[92vw] overflow-x-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/95 dark:bg-slate-950/90 border border-slate-200 dark:border-lime-400/80 shadow-2xl shadow-slate-200/50 dark:shadow-lime-500/25 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 ring-1 ring-emerald-500/20 dark:ring-lime-400/40">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-lime-400 animate-ping shrink-0" />
          <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 shrink-0">
            Smart Space ({projectedEquations.length} Active):
          </span>

          {/* If multiple plottable equations are detected across the canvas, allow plotting all in a single frame */}
          {(() => {
            const plottable = projectedEquations.filter((e) => e.isPlottableFunction);
            if (plottable.length > 1 && onAddPlot) {
              return (
                <button
                  onClick={() =>
                    onAddPlot(
                      plottable.map((e) => e.plotFunctionBody || e.expressionText).join(', ')
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 dark:bg-lime-500/20 hover:bg-emerald-500/20 dark:hover:bg-lime-500/30 text-emerald-700 dark:text-lime-300 border border-emerald-500/30 dark:border-lime-500/40 font-mono text-[11px] font-bold shrink-0 cursor-pointer transition-colors shadow-sm"
                  title="Plot all detected functions simultaneously in a single graph frame"
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-lime-400 animate-pulse" />
                  <span>Plot All ({plottable.length}) in 1 Frame</span>
                </button>
              );
            }
            return null;
          })()}

          <div className="flex items-center gap-2 overflow-x-auto">
            {projectedEquations.map((eq) => (
              <div
                key={eq.id}
                className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-lime-500/30 hover:border-emerald-500 dark:hover:border-lime-400 text-xs font-mono transition-all shrink-0"
              >
                <span className="font-bold text-slate-800 dark:text-slate-300">
                  {eq.expressionText}
                </span>
                <span className={`font-black drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] dark:drop-shadow-[0_0_8px_rgba(163,230,53,0.7)] ${
                  eq.isPlottableFunction ? 'text-teal-600 dark:text-emerald-400' : 'text-emerald-600 dark:text-lime-400'
                }`}>
                  {eq.isPlottableFunction || eq.evaluation.isEquationSolution ? eq.evaluation.display : `= ${eq.evaluation.display}`}
                </span>

                {eq.isPlottableFunction && onAddPlot && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onAddPlot(
                        eq.plotFunctionBody || eq.expressionText,
                        { x: eq.anchorPosition.x + 20, y: eq.anchorPosition.y + 40 }
                      )}
                      className="ml-1 px-2 py-0.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] cursor-pointer shadow-sm transition-all"
                      title="Plot interactive 2D function curve on canvas"
                    >
                      Plot
                    </button>
                    {plots.length > 0 && (
                      <button
                        onClick={() => onAddPlot(
                          eq.plotFunctionBody || eq.expressionText,
                          undefined,
                          plots[0].id
                        )}
                        className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-[10px] cursor-pointer"
                        title="Add this curve into open graph frame"
                      >
                        + Frame
                      </button>
                    )}
                  </div>
                )}

                {onConvertToTheoremCard && (
                  <button
                    onClick={() => onConvertToTheoremCard(eq)}
                    className="ml-1 px-2 py-0.5 rounded-md bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold text-[10px] cursor-pointer shadow-sm transition-all"
                    title="Pin expression as permanent Theorem card"
                  >
                    Pin
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* World Space Container (Transformed via Pan & Zoom) */}
      <div
        className="absolute inset-0 origin-top-left pointer-events-none z-20"
        style={{
          transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})`,
        }}
      >
        {/* Branching Bezier Connections */}
        <CanvasConnections theorems={theorems} proofs={proofs} />

        {/* Dynamic Inline Calculated Math Projections (CalcInk PS Requirement) */}
        {projectedEquations.map((eq) => (
          <InlineMathProjection
            key={eq.id}
            equation={eq}
            scale={viewTransform.scale}
            onConvertToCard={onConvertToTheoremCard}
            onPlotFunction={(funcBody, pos) => onAddPlot && onAddPlot(funcBody, pos)}
            onWriteInInk={handleWriteInInk}
            onUpdateVariable={handleUpdateVariable}
          />
        ))}

        {/* Interactive 2D Function Plots */}
        {plots.map((plot) => (
          <div key={plot.id} className="pointer-events-auto">
            <InteractiveFunctionPlot
              id={plot.id}
              initialFunction={plot.func}
              position={plot.position}
              scale={viewTransform.scale}
              onClose={(id) => onDeletePlot && onDeletePlot(id)}
              onMove={(plotId, newPos) => {
                const item = plots.find((pl) => pl.id === plotId);
                if (item && onUpdatePlot) {
                  onUpdatePlot({ ...item, position: newPos });
                }
              }}
              onStartDrag={(e, id) => handleStartItemDrag(e, id, 'plot')}
              onDuplicate={(fn) => onAddPlot && onAddPlot(fn, { x: plot.position.x + 380, y: plot.position.y })}
            />
          </div>
        ))}

        {/* Living Ink Interactive 60 FPS Physics Simulations */}
        {effectiveSimulations.map((sim) => (
          <div key={sim.id} className="pointer-events-auto">
            <LivingPhysicsWidget
              id={sim.id}
              initialType={sim.type}
              initialParams={sim.params}
              title={sim.title}
              position={sim.position}
              onClose={() => {
                if (onDeleteSimulation) onDeleteSimulation(sim.id);
                else setLocalSimulations((prev) => prev.filter((s) => s.id !== sim.id));
              }}
              onPositionChange={(newPos) => {
                if (onUpdateSimulation) onUpdateSimulation({ ...sim, position: newPos });
                else setLocalSimulations((prev) => prev.map((s) => (s.id === sim.id ? { ...s, position: newPos } : s)));
              }}
            />
          </div>
        ))}

        {/* Pinned Documents / Papers */}
        {documents.map((doc) => (
          <div key={doc.id} className="pointer-events-auto">
            <DocumentCard
              item={doc}
              isSelected={selectedId === doc.id}
              onSelect={() => setSelectedId(doc.id)}
              onDelete={onDeleteDocument}
              onStartDrag={(e, id) => handleStartItemDrag(e, id, 'doc')}
              onSynthesize={onSynthesizeDocument}
              onUpdate={onUpdateDocument}
            />
          </div>
        ))}

        {/* Theorem Nodes */}
        {theorems.map((theorem) => (
          <div key={theorem.id} className="pointer-events-auto">
            <TheoremCard
              item={theorem}
              isSelected={selectedId === theorem.id}
              onSelect={() => setSelectedId(theorem.id)}
              onDiscoverProofs={onDiscoverProofs}
              onRequestSocraticHint={onRequestSocraticHint}
              onDelete={onDeleteTheorem}
              onStartDrag={(e, id) => handleStartItemDrag(e, id, 'theorem')}
            />
          </div>
        ))}

        {/* Branching Proof Nodes */}
        {proofs.map((proof) => (
          <div key={proof.id} className="pointer-events-auto">
            <ProofNodeCard
              node={proof}
              onDelete={onDeleteProof}
              onStartDrag={(e, id) => handleStartItemDrag(e, id, 'proof')}
            />
          </div>
        ))}

        {/* Multimodal Asset / Image Cards */}
        {images.map((img) => (
          <div key={img.id} className="pointer-events-auto">
            <ImageCard
              item={img}
              isSelected={selectedId === img.id}
              onSelect={() => setSelectedId(img.id)}
              onDelete={onDeleteImage}
              onStartDrag={(e, id) => handleStartItemDrag(e, id, 'image')}
            />
          </div>
        ))}

        {/* Socratic Hint Stickies */}
        {socraticHints.map((hint) => (
          <div key={hint.id} className="pointer-events-auto">
            <SocraticSticky
              item={hint}
              onDelete={onDeleteSocraticHint}
              onStartDrag={(e, id) => handleStartItemDrag(e, id, 'hint')}
            />
          </div>
        ))}

        {/* Dynamic Dragging Selection Marquee */}
        {selectionBox && (
          <div
            style={{
              left: `${Math.min(selectionBox.start.x, selectionBox.current.x)}px`,
              top: `${Math.min(selectionBox.start.y, selectionBox.current.y)}px`,
              width: `${Math.abs(selectionBox.current.x - selectionBox.start.x)}px`,
              height: `${Math.abs(selectionBox.current.y - selectionBox.start.y)}px`,
            }}
            className="absolute border-2 border-dashed border-lime-400 bg-lime-500/10 rounded-2xl pointer-events-none shadow-[0_0_20px_rgba(163,230,53,0.3)] animate-pulse z-30"
          />
        )}

        {/* Active Selection Box with Floating Action Bar */}
        {selectionBbox && selectedStrokes.length > 0 && (
          <div
            style={{
              left: `${selectionBbox.minX - 8}px`,
              top: `${selectionBbox.minY - 8}px`,
              width: `${selectionBbox.width + 16}px`,
              height: `${selectionBbox.height + 16}px`,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute rounded-2xl border-2 border-lime-400/90 bg-lime-950/20 shadow-[0_0_25px_rgba(163,230,53,0.4)] ring-2 ring-lime-400/20 pointer-events-auto z-30"
          >
            {/* Floating Selection Action Pill with Live Solve, Plot, and Write Ink */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/95 border border-lime-400 shadow-[0_0_30px_rgba(163,230,53,0.35)] backdrop-blur-xl animate-in zoom-in-95 text-xs font-mono whitespace-nowrap z-40 max-w-[95vw]"
            >
              <Zap className="w-3.5 h-3.5 text-lime-400 animate-pulse shrink-0" />

              {/* Editable Formula Field */}
              <input
                type="text"
                value={selectedFormulaText}
                onChange={(e) => {
                  setSelectedFormulaText(e.target.value);
                  setSelectedSolveOutput(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSolveSelection();
                }}
                placeholder="Formula e.g. 2x + 5 = 1"
                className="bg-slate-900/90 border border-slate-700/80 focus:border-lime-400 focus:outline-none rounded-lg px-2.5 py-1 text-lime-300 font-mono text-xs w-36 sm:w-44 shadow-inner"
                title="Directly edit or verify the recognized math expression"
              />

              {/* Transcribed handwriting for the selection */}
              {selectedTranscription && (
                <span
                  className="font-medium text-slate-300 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/60 max-w-44 truncate"
                  title={`Transcribed text: ${selectedTranscription}`}
                >
                  {selectedTranscription}
                </span>
              )}

              {/* Evaluated Solution Badge if Solved */}
              {selectedSolveOutput && (
                <span className="font-bold text-lime-400 drop-shadow-[0_0_8px_rgba(163,230,53,0.7)] px-2 py-0.5 rounded-lg bg-lime-500/10 border border-lime-500/30">
                  {selectedSolveOutput.includes('=') ? selectedSolveOutput : `= ${selectedSolveOutput}`}
                </span>
              )}

              {/* ⚡ Solve Button */}
              <button
                onClick={() => handleSolveSelection()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-lime-500 hover:bg-lime-400 text-slate-950 font-black text-[11px] cursor-pointer shadow-md shadow-lime-500/25 transition-all hover:scale-105"
                title="Solve equation or calculate expression"
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>Solve</span>
              </button>

              {/* ✍️ Write in Ink Button (Apple Math Notes Style) */}
              {selectedSolveOutput && (
                <button
                  onClick={handleWriteInkSelection}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-lime-500/20 hover:bg-lime-500/35 text-lime-300 font-bold text-[11px] cursor-pointer border border-lime-500/40 transition-all hover:scale-105"
                  title="Write solved answer into notes as digital ink strokes (Apple Math Notes)"
                >
                  <PenLine className="w-3 h-3 text-lime-400" />
                  <span className="hidden sm:inline">Write Ink</span>
                </button>
              )}

              {/* 📈 Plot Curve Button */}
              {onAddPlot && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePlotSelection}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] cursor-pointer shadow-md shadow-emerald-500/25 transition-all hover:scale-105"
                    title="Plot 2D function curve on canvas (e.g. y = 2x + 5)"
                  >
                    <Activity className="w-3 h-3" />
                    <span>Plot</span>
                  </button>
                  {plots.length > 0 && (
                    <button
                      onClick={() => {
                        const expr = selectedFormulaText.trim();
                        if (expr) {
                          onAddPlot(expr.replace(/=.*$/, '').trim() || expr, undefined, plots[0].id);
                        }
                      }}
                      className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-[10px] cursor-pointer transition-all"
                      title="Add curve into current open graph frame"
                    >
                      + Frame
                    </button>
                  )}
                </div>
              )}

              {/* ✨ AI Solve Button */}
              <button
                onClick={handleAISolveSelection}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold text-[10px] cursor-pointer border border-indigo-500/40 transition-all hover:scale-105"
                title="Derive full mathematical proof and socratic explanation via AI"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span className="hidden sm:inline">AI Derivation</span>
              </button>

              {/* ⚛️ Living Physics Simulation */}
              <button
                onClick={() => {
                  const detected = LivingInkPhysicsEngine.detectPhysicalDiagram(selectedStrokes);
                  const pos: Point = selectionBbox
                    ? { x: selectionBbox.maxX + 35, y: Math.max(50, selectionBbox.minY - 20) }
                    : { x: 300, y: 150 };
                  if (onAddSimulation) {
                    onAddSimulation(detected.systemType, pos);
                  } else {
                    setLocalSimulations((prev) => [
                      ...prev,
                      {
                        id: `sim-${Date.now()}`,
                        type: detected.systemType,
                        title: detected.title,
                        position: pos,
                      },
                    ]);
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-lime-500/20 hover:bg-lime-500/35 text-lime-400 font-bold text-[10px] cursor-pointer border border-lime-500/40 transition-all hover:scale-105"
                title="Convert hand-drawn diagram into live 60 FPS interactive physics simulation"
              >
                <Atom className="w-3 h-3 text-lime-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="hidden sm:inline">Living Physics</span>
              </button>

              {/* Pin Card Button */}
              {onConvertToTheoremCard && (
                <button
                  onClick={() => {
                    const eqToPin: ProjectedEquation = selectedEquation || {
                      id: `pin-${Date.now()}`,
                      strokeIds: selectedStrokes.map(s => s.id),
                      expressionText: selectedFormulaText || 'Selected Math',
                      evaluation: {
                        success: true,
                        rawExpression: selectedFormulaText,
                        sanitizedExpression: selectedFormulaText,
                        value: null,
                        display: selectedSolveOutput || selectedFormulaText,
                        isAssignment: false,
                      },
                      anchorPosition: { x: selectionBbox.maxX + 20, y: selectionBbox.centerY },
                      boundingBox: selectionBbox,
                      timestamp: Date.now(),
                      isPlottableFunction: false,
                    };
                    onConvertToTheoremCard(eqToPin);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] cursor-pointer transition-all"
                  title="Pin as permanent LaTeX card"
                >
                  <Sigma className="w-3 h-3 inline mr-0.5" />
                  <span>Pin</span>
                </button>
              )}

              {/* Delete Strokes Button */}
              {onDeleteStrokes && (
                <button
                  onClick={() => {
                    onDeleteStrokes(selectedStrokes.map(s => s.id));
                    setSelectedStrokes([]);
                    setSelectionBbox(null);
                    setSelectedEquation(null);
                    setSelectedEquations([]);
                    setSelectedFormulaText('');
                    setSelectedSolveOutput(null);
                  }}
                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Delete Selected Strokes"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Dismiss Selection */}
              <button
                onClick={() => {
                  setSelectedStrokes([]);
                  setSelectionBbox(null);
                  setSelectedEquation(null);
                  setSelectedEquations([]);
                  setSelectedFormulaText('');
                  setSelectedSolveOutput(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Dismiss Selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Circle-to-Solve Targeting Reticle */}
        {circleReticle && (
          <div
            style={{
              left: `${circleReticle.bbox.minX - 10}px`,
              top: `${circleReticle.bbox.minY - 10}px`,
              width: `${circleReticle.bbox.width + 20}px`,
              height: `${circleReticle.bbox.height + 20}px`,
            }}
            className="absolute rounded-full border-2 border-emerald-400/90 shadow-[0_0_30px_rgba(52,211,153,0.5)] pointer-events-auto animate-pulse z-30"
          >
            {/* Target Badge */}
            <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/95 border border-emerald-400 text-xs font-mono shadow-2xl backdrop-blur-xl whitespace-nowrap z-40">
              <Target className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
              <span className="font-bold text-emerald-300">
                Circled: {circleReticle.equation.expressionText} {circleReticle.equation.isPlottableFunction || circleReticle.equation.evaluation.isEquationSolution ? '' : '='}{' '}
                <span className="text-emerald-400 font-black">{circleReticle.equation.evaluation.display}</span>
              </span>

              {circleReticle.equation.isPlottableFunction && onAddPlot && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onAddPlot(
                      circleReticle.equation.plotFunctionBody || circleReticle.equation.expressionText,
                      { x: circleReticle.bbox.maxX + 20, y: circleReticle.bbox.minY }
                    )}
                    className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] cursor-pointer"
                  >
                    Plot
                  </button>
                  {plots.length > 0 && (
                    <button
                      onClick={() => onAddPlot(
                        circleReticle.equation.plotFunctionBody || circleReticle.equation.expressionText,
                        undefined,
                        plots[0].id
                      )}
                      className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-[10px] cursor-pointer"
                      title="Add curve into current open graph frame"
                    >
                      + Frame
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={() => setCopilotSymbol(circleReticle.equation.expressionText)}
                className="px-2 py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] cursor-pointer"
                title="Explain with the Muse Spark copilot"
              >
                Explain
              </button>

              {onConvertToTheoremCard && (
                <button
                  onClick={() => onConvertToTheoremCard(circleReticle.equation)}
                  className="px-2 py-0.5 rounded bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold text-[10px] cursor-pointer"
                >
                  Pin Card
                </button>
              )}

              <button
                onClick={() => setCircleReticle(null)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Step-by-step working for the circled equation */}
            {circleReticle.steps && circleReticle.steps.length > 0 && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-2 rounded-xl bg-slate-950/95 border border-emerald-400/60 text-xs font-mono shadow-2xl backdrop-blur-xl whitespace-nowrap z-40">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Working
                </div>
                <ol className="space-y-0.5">
                  {circleReticle.steps.map((step, i) => (
                    <li key={i} className="text-emerald-200">
                      <span className="text-slate-500 mr-2">{i + 1}.</span>
                      {step.expression}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      <LassoCopilotModal
        isOpen={copilotSymbol !== null}
        onClose={() => setCopilotSymbol(null)}
        extractedSymbols={copilotSymbol ?? undefined}
      />

      {/* Ergonomic Viewport Zoom & Fit Controls */}
      <CanvasViewportControls
        scale={viewTransform.scale}
        onZoomIn={() => setViewTransform(v => ({ ...v, scale: Math.min(v.scale * 1.15, 4.0) }))}
        onZoomOut={() => setViewTransform(v => ({ ...v, scale: Math.max(v.scale * 0.85, 0.15) }))}
        onResetZoom={() => setViewTransform({ x: 80, y: 80, scale: 1 })}
      />
    </div>
  );
};
