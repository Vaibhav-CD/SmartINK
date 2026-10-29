import React, { useRef } from 'react';
import type { ToolMode } from '../types';
import { 
  Hand, 
  MousePointer, 
  PenTool, 
  FileText, 
  HelpCircle, 
  Sigma, 
  Eraser,
  Sparkles,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Activity,
  Atom,
  FileUp
} from 'lucide-react';

interface FloatingDockProps {
  currentTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  penColor: string;
  onChangePenColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  onAddTheorem: () => void;
  onAddPaper: () => void;
  onUploadPdf?: (file: File) => void;
  onAddSticky: () => void;
  onAddImage?: () => void;
  onAddPlot?: () => void;
  plotCount?: number;
  onAddPhysics?: () => void;
  onClearInk: () => void;
  onRecognizeInk: () => void;
  hasInkStrokes: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const PEN_COLORS = ['#a3e635', '#059669', '#22c55e', '#38bdf8', '#2563eb', '#f59e0b', '#0f172a', '#ffffff'];
const STROKE_WIDTHS = [2, 3.5, 6, 10];

export const FloatingDock: React.FC<FloatingDockProps> = ({
  currentTool,
  onSelectTool,
  penColor,
  onChangePenColor,
  strokeWidth,
  onChangeStrokeWidth,
  onAddTheorem,
  onAddPaper,
  onUploadPdf,
  onAddSticky,
  onAddImage,
  onAddPlot,
  plotCount,
  onAddPhysics,
  onClearInk,
  onRecognizeInk,
  hasInkStrokes,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handlePdfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadPdf) {
      onUploadPdf(file);
    }
    // Reset input so re-uploading same file name works
    e.target.value = '';
  };
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-2 rounded-full shadow-2xl border border-slate-200 dark:border-lime-500/30 bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl transition-all">
      {/* Undo / Redo Stack Controls */}
      <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200 dark:border-slate-800">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            canUndo
              ? 'text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-lime-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              : 'text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z / Cmd+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            canRedo
              ? 'text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-lime-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              : 'text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y / Cmd+Shift+Z)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Navigation Tools */}
      <div className="flex items-center gap-1 pr-1.5 border-r border-slate-200 dark:border-slate-800">
        <button
          onClick={() => onSelectTool('select')}
          className={`p-2 rounded-full transition-all cursor-pointer ${
            currentTool === 'select'
              ? 'bg-lime-500 text-slate-950 shadow-md font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-lime-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
          title="Select & Reposition Elements"
        >
          <MousePointer className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('pan')}
          className={`p-2 rounded-full transition-all cursor-pointer ${
            currentTool === 'pan'
              ? 'bg-lime-500 text-slate-950 shadow-md font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-lime-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
          title="Pan Infinite Canvas (Space + Drag also works)"
        >
          <Hand className="w-4 h-4" />
        </button>
      </div>

      {/* Freehand Digital Inking & Eraser Tools */}
      <div className="flex items-center gap-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800">
        <button
          onClick={() => onSelectTool('pen')}
          className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
            currentTool === 'pen'
              ? 'bg-lime-500 text-slate-950 font-bold shadow-md shadow-lime-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-lime-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
          title="Freehand Digital Stylus / Ink"
        >
          <PenTool className="w-4 h-4" />
          <span className="text-xs font-semibold">Ink</span>
        </button>

        {/* Dedicated Eraser Tool */}
        <button
          onClick={() => onSelectTool('eraser')}
          className={`px-2.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
            currentTool === 'eraser'
              ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
          title="Stroke & Pixel Eraser (Scratch gesture also erases)"
        >
          <Eraser className="w-4 h-4" />
          <span className="text-xs font-semibold hidden sm:inline">Eraser</span>
        </button>

        {/* Color Palette & Stroke Width (visible when in pen mode) */}
        {currentTool === 'pen' && (
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/90 p-1 px-2 rounded-full border border-slate-200 dark:border-slate-800">
            {PEN_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onChangePenColor(c)}
                style={{ backgroundColor: c }}
                className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer border border-black/10 dark:border-white/20 ${
                  penColor === c ? 'scale-125 ring-2 ring-emerald-500 dark:ring-lime-400' : 'opacity-70 hover:opacity-100'
                }`}
              />
            ))}

            {/* Stroke Width Selector */}
            <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-slate-300 dark:border-slate-700">
              {STROKE_WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() => onChangeStrokeWidth(w)}
                  className={`w-4 h-4 flex items-center justify-center rounded-full cursor-pointer transition-all ${
                    strokeWidth === w ? 'bg-emerald-500/20 dark:bg-lime-500/20 ring-1 ring-emerald-500 dark:ring-lime-400' : 'hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                  title={`${w}px stroke width`}
                >
                  <span
                    style={{ width: `${Math.min(w, 8)}px`, height: `${Math.min(w, 8)}px` }}
                    className="rounded-full bg-slate-700 dark:bg-slate-200"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SAM 3.1 & Muse Spark Vision Recognition of Ink */}
        {hasInkStrokes && (
          <button
            onClick={onRecognizeInk}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 dark:bg-lime-500/15 hover:bg-emerald-500/25 dark:hover:bg-lime-500/25 text-emerald-600 dark:text-lime-400 border border-emerald-500/30 dark:border-lime-500/30 text-xs font-semibold cursor-pointer shadow-sm transition-all"
            title="Convert handwritten ink into LaTeX theorem via SAM 3.1 + Muse Spark Vision"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Parse</span>
          </button>
        )}

        {hasInkStrokes && (
          <button
            onClick={onClearInk}
            className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Clear All Canvas Strokes"
          >
            <Eraser className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Insertable Spatial Primitives & 2D Curve Plotter */}
      <div className="flex items-center gap-1 pl-1">
        <button
          onClick={onAddTheorem}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-lime-400 text-xs font-semibold transition-all cursor-pointer"
          title="Add Theorem Card"
        >
          <Sigma className="w-4 h-4 text-emerald-600 dark:text-lime-400" />
          <span className="hidden md:inline">+ Theorem</span>
        </button>

        {onAddPlot && (
          <button
            onClick={onAddPlot}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-lime-400 text-xs font-semibold transition-all cursor-pointer"
            title="Add Interactive 2D Function Curve Plotter"
          >
            <Activity className="w-4 h-4 text-emerald-600 dark:text-lime-400 animate-pulse" />
            <span className="hidden md:inline">+ Plot{plotCount && plotCount > 0 ? ` (${plotCount})` : ''}</span>
          </button>
        )}

        {onAddPhysics && (
          <button
            onClick={onAddPhysics}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-lime-400 text-xs font-semibold transition-all cursor-pointer"
            title="Add Living Ink 60 FPS Physics Simulation"
          >
            <Atom className="w-4 h-4 text-emerald-600 dark:text-lime-400 animate-spin" style={{ animationDuration: '10s' }} />
            <span className="hidden md:inline">+ Physics</span>
          </button>
        )}

        {onAddImage && (
          <button
            onClick={onAddImage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-lime-400 text-xs font-semibold transition-all cursor-pointer"
            title="Add Multimodal Visual Asset (Galaxy, Nebula, Quantum Diagram)"
          >
            <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-lime-400" />
            <span className="hidden md:inline">+ Asset</span>
          </button>
        )}

        {onUploadPdf && (
          <>
            <input
              type="file"
              ref={pdfInputRef}
              onChange={handlePdfInputChange}
              accept=".pdf,application/pdf"
              className="hidden"
            />
            <button
              onClick={() => pdfInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 text-xs font-semibold transition-all cursor-pointer"
              title="Upload PDF Document for Reading & TTS"
            >
              <FileUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden lg:inline">+ PDF</span>
            </button>
          </>
        )}

        <button
          onClick={onAddPaper}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold transition-all cursor-pointer"
          title="Pin Research Paper"
        >
          <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden lg:inline">+ Paper</span>
        </button>

        <button
          onClick={onAddSticky}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-semibold transition-all cursor-pointer"
          title="Add Socratic Prompt"
        >
          <HelpCircle className="w-4 h-4 text-amber-500" />
          <span className="hidden lg:inline">+ Hint</span>
        </button>
      </div>
    </div>
  );
};
