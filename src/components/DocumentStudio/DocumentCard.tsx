import React from 'react';
import { DocumentItem } from '../../types/document';
import { useDocumentStore } from '../../store/documentStore';
import { useCanvasStore } from '../../store/canvasStore';
import { worldToScreen } from '../../engine/coordinates';
import { BookOpen, Volume2, Globe, Trash2, Maximize2 } from 'lucide-react';

interface DocumentCardProps {
  document: DocumentItem;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document }) => {
  const { openReaderModal, removeDocument, playTTS, ttsState, pauseTTS } = useDocumentStore();
  const { viewport } = useCanvasStore();

  const screenPos = worldToScreen({ x: document.position.x, y: document.position.y }, viewport);
  const isPlayingThis = ttsState.isPlaying && ttsState.currentDocumentId === document.id;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${screenPos.x}px`,
        top: `${screenPos.y}px`,
        width: `${Math.max(280, document.position.width * viewport.zoom)}px`,
      }}
      className="z-20 pointer-events-auto rounded-2xl glass-panel-glow border border-purple-500/30 p-4 shadow-2xl backdrop-blur-xl transition-all duration-150 animate-fade-in select-none group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white line-clamp-1">
              {document.metadata.title}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              {document.metadata.pageCount} pages · {(document.metadata.fileSize / 1024).toFixed(0)} KB
            </p>
          </div>
        </div>

        <button
          onClick={() => removeDocument(document.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition-opacity"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Abstract preview */}
      <p className="mt-3 text-[11px] text-slate-300 line-clamp-3 leading-relaxed font-sans">
        {document.metadata.previewAbstract}
      </p>

      {/* Card Controls */}
      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => {
            if (isPlayingThis) {
              pauseTTS();
            } else {
              playTTS(document.id, document.currentPage || 1);
            }
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isPlayingThis
              ? 'bg-purple-500 text-white animate-pulse'
              : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>{isPlayingThis ? 'Pause Voice' : 'Listen TTS'}</span>
        </button>

        <button
          onClick={() => openReaderModal(document.id, document.currentPage || 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 text-xs font-semibold transition-all"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Open Studio</span>
        </button>
      </div>
    </div>
  );
};
