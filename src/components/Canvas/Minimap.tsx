import React, { useRef, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Stroke } from '../../types/canvas';

interface MinimapProps {
  canvasWidth: number;
  canvasHeight: number;
}

export const Minimap: React.FC<MinimapProps> = ({ canvasWidth, canvasHeight }) => {
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { workspace, activePageId, viewport, setViewport } = useCanvasStore();

  const strokes: Stroke[] = workspace.strokes[activePageId] || [];
  const mapWidth = 180;
  const mapHeight = 110;

  // Determine bounding area of world
  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, mapWidth, mapHeight);

    // Dark cyber backdrop
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(0, 0, mapWidth, mapHeight);

    // Dot grid in minimap
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let x = 8; x < mapWidth; x += 16) {
      for (let y = 8; y < mapHeight; y += 16) {
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    }

    // World bounds mapping
    const worldSpan = 3000;
    const worldCenterX = 0;
    const worldCenterY = 0;

    const toMapX = (wx: number) => ((wx - worldCenterX + worldSpan / 2) / worldSpan) * mapWidth;
    const toMapY = (wy: number) => ((wy - worldCenterY + worldSpan / 2) / worldSpan) * mapHeight;

    // Draw strokes onto minimap
    ctx.lineWidth = 1;
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.beginPath();
      for (let i = 0; i < stroke.points.length; i++) {
        const mx = toMapX(stroke.points[i].x);
        const my = toMapY(stroke.points[i].y);
        if (i === 0) ctx.moveTo(mx, my);
        else ctx.lineTo(mx, my);
      }
      ctx.stroke();
    }

    // Draw current viewport indicator
    const vpWorldLeft = viewport.x;
    const vpWorldTop = viewport.y;
    const vpWorldRight = viewport.x + canvasWidth / viewport.zoom;
    const vpWorldBottom = viewport.y + canvasHeight / viewport.zoom;

    const rectX = toMapX(vpWorldLeft);
    const rectY = toMapY(vpWorldTop);
    const rectW = toMapX(vpWorldRight) - rectX;
    const rectH = toMapY(vpWorldBottom) - rectY;

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
    ctx.fillRect(rectX, rectY, rectW, rectH);
    ctx.strokeRect(rectX, rectY, rectW, rectH);
  }, [strokes, viewport, canvasWidth, canvasHeight]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const worldSpan = 3000;
    const worldTargetX = (clickX / mapWidth) * worldSpan - worldSpan / 2;
    const worldTargetY = (clickY / mapHeight) * worldSpan - worldSpan / 2;

    // Center viewport at target world point
    setViewport({
      ...viewport,
      x: worldTargetX - canvasWidth / (2 * viewport.zoom),
      y: worldTargetY - canvasHeight / (2 * viewport.zoom),
    });
  };

  return (
    <div className="absolute bottom-6 right-6 z-20 overflow-hidden rounded-xl glass-panel border border-slate-700/60 shadow-2xl transition-all duration-200 hover:border-cyan-500/50">
      <div className="px-2.5 py-1 text-[10px] font-mono tracking-wider uppercase text-slate-400 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center">
        <span>Spatial Navigator</span>
        <span className="text-cyan-400 font-bold">{Math.round(viewport.zoom * 100)}%</span>
      </div>
      <canvas
        ref={minimapCanvasRef}
        width={mapWidth}
        height={mapHeight}
        onClick={handleMinimapClick}
        className="cursor-crosshair block"
      />
    </div>
  );
};
