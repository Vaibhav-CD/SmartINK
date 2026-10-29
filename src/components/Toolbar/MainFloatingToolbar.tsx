import React, { useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { ToolType } from '../../types/canvas';
import {
  MousePointer,
  Pen,
  Highlighter,
  Eraser,
  Flame,
  Zap,
  Square,
  Circle,
  ArrowUpRight,
  Minus,
  Sparkles,
  Calculator,
  RotateCcw,
  RotateCw,
  Trash2,
  ChevronDown,
} from 'lucide-react';

const COLORS = [
  { name: 'Cyan', hex: '#38bdf8' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'White', hex: '#ffffff' },
];

const SIZES = [2, 4, 8, 14];

interface MainFloatingToolbarProps {
  onOpenMathBar: () => void;
}

export const MainFloatingToolbar: React.FC<MainFloatingToolbarProps> = ({ onOpenMathBar }) => {
  const { tool, setTool, color, setColor, size, setSize, undo, redo, clearPage } = useCanvasStore();
  const [showShapesDropdown, setShowShapesDropdown] = useState(false);

  const isShapeActive = tool.startsWith('shape-');

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-2 rounded-2xl glass-panel-glow border border-slate-700/80 shadow-2xl backdrop-blur-xl select-none animate-fade-in">
      {/* Select / Hand Pan */}
      <button
        onClick={() => setTool('select')}
        title="Select & Pan (V or Space)"
        className={`p-2.5 rounded-xl transition-all duration-150 ${
          tool === 'select'
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <MousePointer className="w-4 h-4" />
      </button>

      {/* Pen */}
      <button
        onClick={() => setTool('pen')}
        title="Ink Pen (P)"
        className={`p-2.5 rounded-xl transition-all duration-150 ${
          tool === 'pen'
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <Pen className="w-4 h-4" />
      </button>

      {/* Highlighter */}
      <button
        onClick={() => setTool('highlighter')}
        title="Highlighter (H)"
        className={`p-2.5 rounded-xl transition-all duration-150 ${
          tool === 'highlighter'
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <Highlighter className="w-4 h-4" />
      </button>

      {/* Living Ink Fluid Brush */}
      <button
        onClick={() => setTool('living-ink')}
        title="Living Ink Particle Fluid (L)"
        className={`p-2.5 rounded-xl transition-all duration-150 relative group ${
          tool === 'living-ink'
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-lg shadow-purple-500/20 animate-pulse-glow'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <Flame className="w-4 h-4" />
      </button>

      {/* Laser Pointer */}
      <button
        onClick={() => setTool('laser')}
        title="Laser Pointer (vanishing trail)"
        className={`p-2.5 rounded-xl transition-all duration-150 ${
          tool === 'laser'
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-lg shadow-rose-500/10'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <Zap className="w-4 h-4" />
      </button>

      {/* Eraser */}
      <button
        onClick={() => setTool('eraser')}
        title="Stroke Eraser (E)"
        className={`p-2.5 rounded-xl transition-all duration-150 ${
          tool === 'eraser'
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <Eraser className="w-4 h-4" />
      </button>

      {/* Shapes Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowShapesDropdown(!showShapesDropdown)}
          title="Geometric Shapes"
          className={`flex items-center gap-1 p-2.5 rounded-xl transition-all duration-150 ${
            isShapeActive
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          {tool === 'shape-line' ? (
            <Minus className="w-4 h-4" />
          ) : tool === 'shape-circle' ? (
            <Circle className="w-4 h-4" />
          ) : tool === 'shape-arrow' ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          <ChevronDown className="w-3 h-3 text-slate-500" />
        </button>

        {showShapesDropdown && (
          <div className="absolute bottom-12 left-0 p-1.5 rounded-xl glass-panel border border-slate-700/80 shadow-2xl flex flex-col gap-1 z-40 animate-fade-in">
            <button
              onClick={() => {
                setTool('shape-rect');
                setShowShapesDropdown(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-lg"
            >
              <Square className="w-3.5 h-3.5" /> Rectangle
            </button>
            <button
              onClick={() => {
                setTool('shape-circle');
                setShowShapesDropdown(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-lg"
            >
              <Circle className="w-3.5 h-3.5" /> Ellipse / Circle
            </button>
            <button
              onClick={() => {
                setTool('shape-arrow');
                setShowShapesDropdown(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-lg"
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Arrow
            </button>
            <button
              onClick={() => {
                setTool('shape-line');
                setShowShapesDropdown(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-lg"
            >
              <Minus className="w-3.5 h-3.5" /> Straight Line
            </button>
          </div>
        )}
      </div>

      <div className="w-[1px] h-6 bg-slate-800 mx-1" />

      {/* CalcInk Math Solver Trigger */}
      <button
        onClick={onOpenMathBar}
        title="CalcInk Living Math Bar (M)"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-medium text-xs hover:bg-emerald-500/25 transition-all shadow-lg shadow-emerald-500/10"
      >
        <Calculator className="w-3.5 h-3.5" />
        <span>CalcInk</span>
      </button>

      {/* Lasso AI Copilot */}
      <button
        onClick={() => setTool('lasso-copilot')}
        title="Lasso AI Copilot (Draw around handwriting or equations to query Meta Llama)"
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-150 text-xs font-medium ${
          tool === 'lasso-copilot'
            ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-500/20'
            : 'bg-slate-800/60 text-slate-300 hover:text-cyan-400 hover:bg-slate-800'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
        <span>Lasso AI</span>
      </button>

      <div className="w-[1px] h-6 bg-slate-800 mx-1" />

      {/* Color Palette */}
      <div className="flex items-center gap-1.5 px-1">
        {COLORS.map((c) => (
          <button
            key={c.hex}
            onClick={() => setColor(c.hex)}
            title={c.name}
            style={{ backgroundColor: c.hex }}
            className={`w-5 h-5 rounded-full transition-transform ${
              color === c.hex ? 'scale-125 ring-2 ring-white/60 shadow-md' : 'opacity-70 hover:opacity-100'
            }`}
          />
        ))}
      </div>

      <div className="w-[1px] h-6 bg-slate-800 mx-1" />

      {/* Thickness Selector */}
      <div className="flex items-center gap-1 px-1">
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            title={`Stroke width ${s}px`}
            className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${
              size === s ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <div
              style={{
                width: `${Math.min(14, s * 1.5 + 2)}px`,
                height: `${Math.min(14, s * 1.5 + 2)}px`,
                backgroundColor: color,
              }}
              className="rounded-full"
            />
          </button>
        ))}
      </div>

      <div className="w-[1px] h-6 bg-slate-800 mx-1" />

      {/* Undo / Redo */}
      <button
        onClick={undo}
        title="Undo (Ctrl+Z)"
        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={redo}
        title="Redo (Ctrl+Y)"
        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
      >
        <RotateCw className="w-3.5 h-3.5" />
      </button>

      {/* Clear Page */}
      <button
        onClick={() => {
          if (window.confirm('Clear all drawings and equations on this page?')) {
            clearPage();
          }
        }}
        title="Clear Canvas Page"
        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
