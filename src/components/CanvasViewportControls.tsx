import React from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface CanvasViewportControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const CanvasViewportControls: React.FC<CanvasViewportControlsProps> = ({
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  return (
    <div className="fixed bottom-5 right-5 z-40 flex items-center gap-1 p-1 rounded-xl surface-elevated text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-800">
      <button
        onClick={onZoomOut}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Zoom Out (Cmd -)"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={onResetZoom}
        className="px-2 py-1 text-[11px] font-mono font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        title="Reset Zoom to 100%"
      >
        {Math.round(scale * 100)}%
      </button>

      <button
        onClick={onZoomIn}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Zoom In (Cmd +)"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-800 mx-0.5" />

      <button
        onClick={onResetZoom}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Fit All Nodes"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
