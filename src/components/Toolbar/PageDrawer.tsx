import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Plus, Trash2, Copy, FileText, X } from 'lucide-react';

interface PageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PageDrawer: React.FC<PageDrawerProps> = ({ isOpen, onClose }) => {
  const {
    workspace,
    activePageId,
    setActivePage,
    addPage,
    deletePage,
    duplicatePage,
  } = useCanvasStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex pointer-events-none select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity"
      />

      {/* Drawer */}
      <div className="relative w-80 max-w-[85vw] h-full glass-panel-glow border-r border-slate-700/80 p-5 flex flex-col z-10 pointer-events-auto shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Notebook Pages</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {workspace.pages.length} canvas {workspace.pages.length === 1 ? 'page' : 'pages'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Page List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {workspace.pages.map((page, idx) => {
            const isActive = page.id === activePageId;
            const strokeCount = (workspace.strokes[page.id] || []).length;

            return (
              <div
                key={page.id}
                onClick={() => setActivePage(page.id)}
                className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-xs font-mono font-bold flex items-center justify-center text-slate-300">
                      {idx + 1}
                    </span>
                    <div>
                      <h3
                        className={`text-xs font-semibold ${
                          isActive ? 'text-cyan-300' : 'text-slate-200'
                        }`}
                      >
                        {page.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {strokeCount} strokes · {new Date(page.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicatePage(page.id);
                      }}
                      title="Duplicate Page"
                      className="p-1 text-slate-400 hover:text-cyan-400 rounded hover:bg-slate-800"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {workspace.pages.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete "${page.title}"?`)) {
                            deletePage(page.id);
                          }
                        }}
                        title="Delete Page"
                        className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Add Page Button */}
        <div className="pt-3 border-t border-slate-800">
          <button
            onClick={() => addPage()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-medium text-xs hover:bg-cyan-500/25 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Page</span>
          </button>
        </div>
      </div>
    </div>
  );
};
