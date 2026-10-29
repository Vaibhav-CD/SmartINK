import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { screenToWorld, worldToScreen } from '../../engine/coordinates';
import { renderSmoothStroke } from '../../engine/smoothing';
import { LivingInkSimulator } from '../../engine/physics';
import { LaserParticle, Point, Stroke, StrokePoint } from '../../types/canvas';
import { ScrubberOverlay } from './ScrubberOverlay';
import { Minimap } from './Minimap';
import { InlineGraph } from '../CalcInk/InlineGraph';

interface InfiniteCanvasProps {
  onLassoComplete?: (croppedDataUrl: string, bbox: { minX: number; minY: number; maxX: number; maxY: number }) => void;
}

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({ onLassoComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [activePoints, setActivePoints] = useState<StrokePoint[]>([]);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [lastPointerPos, setLastPointerPos] = useState<Point>({ x: 0, y: 0 });
  const [laserParticles, setLaserParticles] = useState<LaserParticle[]>([]);
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);

  // Living ink physics simulator
  const physicsSimRef = useRef<LivingInkSimulator>(new LivingInkSimulator());

  const {
    workspace,
    activePageId,
    viewport,
    tool,
    color,
    size,
    opacity,
    panBy,
    zoomAt,
    addStroke,
    eraseAtPoint,
    undo,
    redo,
    setViewport,
  } = useCanvasStore();

  const currentStrokes: Stroke[] = workspace.strokes[activePageId] || [];
  const currentEquations = workspace.equations[activePageId] || [];
  const activePage = workspace.pages.find((p) => p.id === activePageId);
  const gridType = activePage?.gridType || 'dots';

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcuts (Undo/Redo, Space for pan, Tool switches)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
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
  }, [undo, redo]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    ctx.save();
    // Apply viewport transform: Screen = (World - Viewport) * Zoom
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.translate(-viewport.x, -viewport.y);

    // Draw all completed strokes
    for (const stroke of currentStrokes) {
      if (stroke.points.length === 0) continue;
      const isHighlighter = stroke.tool === 'highlighter';

      ctx.save();
      if (isHighlighter) {
        ctx.globalAlpha = stroke.opacity * 0.45;
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.globalAlpha = stroke.opacity;
      }

      renderSmoothStroke(
        ctx,
        stroke.points,
        stroke.size,
        stroke.color,
        isHighlighter
      );
      ctx.restore();
    }

    // Render living ink particles
    physicsSimRef.current.render(ctx);

    ctx.restore();
  }, [currentStrokes, viewport, dimensions]);

  // Overlay Canvas Rendering Loop (active stroke, laser trail, shapes, lasso selection)
  useEffect(() => {
    let animId: number;

    const renderOverlay = () => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      ctx.save();
      ctx.scale(viewport.zoom, viewport.zoom);
      ctx.translate(-viewport.x, -viewport.y);

      // Render currently drawing stroke
      if (activePoints.length > 0) {
        const isHighlighter = tool === 'highlighter';
        ctx.save();
        ctx.globalAlpha = isHighlighter ? opacity * 0.45 : opacity;

        if (tool.startsWith('shape-') && activePoints.length >= 2) {
          // Render live preview of geometric shape
          const start = activePoints[0];
          const end = activePoints[activePoints.length - 1];

          ctx.strokeStyle = color;
          ctx.lineWidth = size;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (tool === 'shape-line') {
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
          } else if (tool === 'shape-rect') {
            const rx = Math.min(start.x, end.x);
            const ry = Math.min(start.y, end.y);
            const rw = Math.abs(end.x - start.x);
            const rh = Math.abs(end.y - start.y);
            ctx.strokeRect(rx, ry, rw, rh);
          } else if (tool === 'shape-circle') {
            const cx = (start.x + end.x) / 2;
            const cy = (start.y + end.y) / 2;
            const rx = Math.abs(end.x - start.x) / 2;
            const ry = Math.abs(end.y - start.y) / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
          } else if (tool === 'shape-arrow') {
            // Draw line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            // Arrowhead
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const headLen = size * 4;
            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - headLen * Math.cos(angle - Math.PI / 6),
              end.y - headLen * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              end.x - headLen * Math.cos(angle + Math.PI / 6),
              end.y - headLen * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
          }
        } else {
          renderSmoothStroke(ctx, activePoints, size, color, isHighlighter);
        }
        ctx.restore();
      }

      // Render Laser Trail
      if (laserParticles.length > 0) {
        ctx.save();
        for (const p of laserParticles) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Render Lasso selection loop
      if (lassoPoints.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2 / viewport.zoom;
        ctx.setLineDash([6 / viewport.zoom, 4 / viewport.zoom]);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
        ctx.beginPath();
        lassoPoints.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      // Update particle physics
      physicsSimRef.current.update();

      // Fade laser particles
      if (laserParticles.length > 0) {
        setLaserParticles((prev) =>
          prev
            .map((p) => ({ ...p, opacity: p.opacity - 0.04, radius: p.radius * 0.95 }))
            .filter((p) => p.opacity > 0)
        );
      }

      animId = requestAnimationFrame(renderOverlay);
    };

    animId = requestAnimationFrame(renderOverlay);
    return () => cancelAnimationFrame(animId);
  }, [activePoints, tool, size, color, opacity, laserParticles, lassoPoints, viewport]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const isMiddleClick = e.button === 1;
    const isPanningActive = isSpacePressed || isMiddleClick || tool === 'select';

    setLastPointerPos({ x: e.clientX, y: e.clientY });
    setIsPointerDown(true);

    if (isPanningActive) return;

    const screenPt: Point = {
      x: e.clientX,
      y: e.clientY,
      pressure: e.pressure && e.pressure > 0 ? e.pressure : 0.5,
      timestamp: Date.now(),
    };
    const worldPt = screenToWorld(screenPt, viewport);

    if (tool === 'eraser') {
      eraseAtPoint(worldPt, size * 6);
      return;
    }

    if (tool === 'laser') {
      setLaserParticles((prev) => [
        ...prev,
        { x: worldPt.x, y: worldPt.y, radius: size * 1.5, opacity: 1, color: '#f43f5e' },
      ]);
      return;
    }

    if (tool === 'living-ink') {
      physicsSimRef.current.spawnParticles(worldPt.x, worldPt.y, color, 8);
    }

    if (tool === 'lasso-copilot') {
      setLassoPoints([worldPt]);
      return;
    }

    // Standard inking
    setActivePoints([{ ...worldPt, pressure: screenPt.pressure || 0.5 }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const isMiddleClick = e.buttons === 4;
    const isPanningActive = isSpacePressed || isMiddleClick || (tool === 'select' && isPointerDown);

    if (isPanningActive && isPointerDown) {
      const dx = e.clientX - lastPointerPos.x;
      const dy = e.clientY - lastPointerPos.y;
      panBy(dx, dy);
      setLastPointerPos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!isPointerDown) return;

    const screenPt: Point = {
      x: e.clientX,
      y: e.clientY,
      pressure: e.pressure && e.pressure > 0 ? e.pressure : 0.5,
      timestamp: Date.now(),
    };
    const worldPt = screenToWorld(screenPt, viewport);

    if (tool === 'eraser') {
      eraseAtPoint(worldPt, size * 6);
      return;
    }

    if (tool === 'laser') {
      setLaserParticles((prev) => [
        ...prev,
        { x: worldPt.x, y: worldPt.y, radius: size * 1.5, opacity: 1, color: '#f43f5e' },
      ]);
      return;
    }

    if (tool === 'living-ink') {
      physicsSimRef.current.spawnParticles(worldPt.x, worldPt.y, color, 4);
      setActivePoints((prev) => [...prev, { ...worldPt, pressure: screenPt.pressure || 0.5 }]);
      return;
    }

    if (tool === 'lasso-copilot') {
      setLassoPoints((prev) => [...prev, worldPt]);
      return;
    }

    if (tool.startsWith('shape-')) {
      // Keep start point and update end point
      setActivePoints((prev) => [prev[0], { ...worldPt, pressure: 0.5 }]);
    } else {
      setActivePoints((prev) => [...prev, { ...worldPt, pressure: screenPt.pressure || 0.5 }]);
    }

    setLastPointerPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = () => {
    if (!isPointerDown) return;
    setIsPointerDown(false);

    // Lasso completion
    if (tool === 'lasso-copilot' && lassoPoints.length > 2) {
      // Calculate bounding box of lasso selection
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      lassoPoints.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });

      const bbox = { minX, minY, maxX, maxY };

      // Crop the canvas area for the AI Copilot
      if (canvasRef.current) {
        const cropCanvas = document.createElement('canvas');
        const screenP1 = worldToScreen({ x: minX, y: minY }, viewport);
        const screenP2 = worldToScreen({ x: maxX, y: maxY }, viewport);
        const cropW = Math.max(30, screenP2.x - screenP1.x);
        const cropH = Math.max(30, screenP2.y - screenP1.y);

        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext('2d');
        if (cropCtx) {
          cropCtx.drawImage(
            canvasRef.current,
            screenP1.x,
            screenP1.y,
            cropW,
            cropH,
            0,
            0,
            cropW,
            cropH
          );
          const dataUrl = cropCanvas.toDataURL('image/png');
          onLassoComplete?.(dataUrl, bbox);
        }
      }
      setLassoPoints([]);
      return;
    }

    if (activePoints.length === 0) return;

    // Save stroke to store
    let finalPoints = activePoints;
    if (tool.startsWith('shape-') && activePoints.length >= 2) {
      const p1 = activePoints[0];
      const p2 = activePoints[activePoints.length - 1];

      if (tool === 'shape-line') {
        finalPoints = [p1, p2];
      } else if (tool === 'shape-rect') {
        finalPoints = [
          p1,
          { x: p2.x, y: p1.y, pressure: 0.5 },
          p2,
          { x: p1.x, y: p2.y, pressure: 0.5 },
          p1,
        ];
      } else if (tool === 'shape-circle') {
        // Generate circular polygon points
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.abs(p2.x - p1.x) / 2;
        const ry = Math.abs(p2.y - p1.y) / 2;
        const circlePts: StrokePoint[] = [];
        for (let i = 0; i <= 36; i++) {
          const theta = (i / 36) * Math.PI * 2;
          circlePts.push({
            x: cx + rx * Math.cos(theta),
            y: cy + ry * Math.sin(theta),
            pressure: 0.5,
          });
        }
        finalPoints = circlePts;
      }
    }

    const strokeId = `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newStroke: Stroke = {
      id: strokeId,
      tool,
      color,
      size,
      opacity,
      points: finalPoints,
      pageId: activePageId,
      createdAt: Date.now(),
    };

    addStroke(newStroke);
    setActivePoints([]);
  };

  // Mouse Wheel Zoom centered at mouse cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      zoomAt({ x: e.clientX, y: e.clientY }, zoomFactor);
    } else {
      // Pan
      panBy(-e.deltaX, -e.deltaY);
    }
  };

  // Grid style computation based on viewport offset and zoom
  const gridStyle: React.CSSProperties = {
    backgroundPosition: `${-viewport.x * viewport.zoom}px ${-viewport.y * viewport.zoom}px`,
    backgroundSize: `${32 * viewport.zoom}px ${32 * viewport.zoom}px`,
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className={`relative w-full h-full overflow-hidden bg-[#080c14] select-none ${
        gridType === 'dots'
          ? 'canvas-grid-dots'
          : gridType === 'lines'
          ? 'canvas-grid-lines'
          : ''
      }`}
      style={gridStyle}
    >
      {/* Background Main Canvas */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0 block"
      />

      {/* Overlay Interaction Canvas */}
      <canvas
        ref={overlayCanvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          cursor:
            isSpacePressed || tool === 'select'
              ? isPointerDown
                ? 'grabbing'
                : 'grab'
              : tool === 'eraser'
              ? 'crosshair'
              : 'crosshair',
        }}
        className="absolute inset-0 block touch-none z-10"
      />

      {/* CalcInk Scrubber Sliders */}
      <ScrubberOverlay />

      {/* Inline 2D Function Graphs */}
      {currentEquations
        .filter((eq) => eq.isFunction && eq.functionData)
        .map((eq) => (
          <InlineGraph key={eq.id} equation={eq} />
        ))}

      {/* Spatial Navigator Minimap */}
      <Minimap canvasWidth={dimensions.width} canvasHeight={dimensions.height} />
    </div>
  );
};
