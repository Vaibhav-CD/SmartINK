import React, { useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useDocumentStore } from '../../store/documentStore';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Download,
  Upload,
  Settings2,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { exportCanvasAsPNG, exportStrokesAsSVG, exportWorkspaceAsJSON } from '../../engine/persistence';

interface TopNavigationProps {
  onTogglePageDrawer: () => void;
  onOpenMetaSettings: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  onTogglePageDrawer,
  onOpenMetaSettings,
}) => {
  const { workspace, activePageId, viewport, setViewport, setGridType } = useCanvasStore();
  const { addDocument, documents, openReaderModal } = useDocumentStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activePage = workspace.pages.find((p) => p.id === activePageId);

  const handleZoomIn = () => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.min(5.0, prev.zoom * 1.15),
    }));
  };

  const handleZoomOut = () => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(0.1, prev.zoom / 1.15),
    }));
  };

  const handleResetZoom = () => {
    setViewport((prev) => ({
      ...prev,
      x: 0,
      y: 0,
      zoom: 1.0,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const doc = await addDocument(file);
      openReaderModal(doc.id, 1);
      e.target.value = '';
    }
  };

  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (canvas) {
      exportCanvasAsPNG(canvas, `${activePage?.title || 'smartink'}.png`);
    }
  };

  const handleExportSVG = () => {
    const strokes = workspace.strokes[activePageId] || [];
    const svgContent = exportStrokesAsSVG(strokes, window.innerWidth, window.innerHeight);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePage?.title || 'smartink'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    exportWorkspaceAsJSON(workspace);
  };

  return (
    <header className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none select-none">
      {/* Brand & Page Selector */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl glass-panel border border-cyan-500/30 shadow-xl">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-sm text-white">
              <span>SmartInk</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-mono font-normal border border-cyan-500/30">
                v2.0
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <span>{activePage?.title || 'Untitled Note'}</span>
            </div>
          </div>
        </div>

        {/* Notebook Page Drawer Button */}
        <button
          onClick={onTogglePageDrawer}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-panel text-slate-300 hover:text-white hover:border-cyan-500/40 transition-colors text-xs font-medium shadow-lg"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Pages ({workspace.pages.length})</span>
        </button>

        {/* Loaded Documents Shortcut */}
        {documents.length > 0 && (
          <button
            onClick={() => openReaderModal(documents[0].id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-panel text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors text-xs font-medium shadow-lg"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>Reader Studio ({documents.length})</span>
          </button>
        )}
      </div>

      {/* Center Zoom & Viewport Controls */}
      <div className="flex items-center gap-1 p-1 rounded-xl glass-panel border border-slate-700/80 shadow-xl pointer-events-auto">
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetZoom}
          title="Reset to 100%"
          className="px-2 py-1 text-xs font-mono font-medium text-cyan-300 hover:bg-slate-800 rounded-md transition-colors"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />
        <button
          onClick={() => {
            const currentGrid = activePage?.gridType || 'dots';
            const nextGrid = currentGrid === 'dots' ? 'lines' : currentGrid === 'lines' ? 'none' : 'dots';
            setGridType(nextGrid);
          }}
          title="Toggle Grid (Dots / Lines / Blank)"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Grid className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* PDF Ingestion Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-panel text-slate-300 hover:text-white hover:border-cyan-500/40 transition-colors text-xs font-medium shadow-lg"
          title="Ingest PDF document into Spatial Studio"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>Upload PDF</span>
        </button>

        {/* Export Menu Dropdown */}
        <div className="relative group">
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-panel text-slate-300 hover:text-white hover:border-cyan-500/40 transition-colors text-xs font-medium shadow-lg"
            title="Export Notebook"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export</span>
          </button>
          <div className="absolute right-0 top-11 hidden group-hover:flex flex-col p-1.5 rounded-xl glass-panel border border-slate-700/80 shadow-2xl z-40 min-w-[140px] animate-fade-in">
            <button
              onClick={handleExportPNG}
              className="text-left px-3 py-1.5 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-lg"
            >
              Export as PNG
            </button>
            <button
              onClick={handleExportSVG}
              className="text-left px-3 py-1.5 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-lg"
            >
              Export Vector SVG
            </button>
            <button
              onClick={handleExportJSON}
              className="text-left px-3 py-1.5 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-lg"
            >
              Backup JSON Project
            </button>
          </div>
        </div>

        {/* Meta AI Config Settings */}
        <button
          onClick={onOpenMetaSettings}
          title="Meta Model AI Configuration"
          className="p-2.5 rounded-xl glass-panel text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors shadow-lg"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
