import React, { useState } from 'react';
import type { ImageItem } from '../types';
import { Image as ImageIcon, Move, Maximize2, ExternalLink, Sparkles } from 'lucide-react';

interface ImageCardProps {
  item: ImageItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
  onStartDrag: (e: React.MouseEvent, id: string) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  item,
  isSelected,
  onSelect,
  onDelete,
  onStartDrag,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      <div
        style={{
          transform: `translate(${item.position.x}px, ${item.position.y}px)`,
          width: `${item.size.width}px`,
        }}
        className={`absolute select-none rounded-3xl surface-card p-4 transition-all duration-200 cursor-default group ${
          isSelected
            ? 'border-lime-400 ring-2 ring-lime-400/25 shadow-lg shadow-lime-500/20'
            : 'border-emerald-500/20 hover:border-lime-400/50'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {/* Header & Drag Handle */}
        <div 
          className="flex items-center justify-between pb-2.5 border-b border-emerald-500/15 cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => onStartDrag(e, item.id)}
        >
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-emerald-950/80 border border-emerald-500/30">
              <ImageIcon className="w-3.5 h-3.5 text-lime-400" />
            </div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400">
              Generated Visual Asset
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomed(true);
              }}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-lime-400 transition-colors cursor-pointer"
              title="Expand Image"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <Move className="w-3.5 h-3.5 opacity-60" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-rose-500/10 hover:text-rose-400 text-xs text-slate-400 transition-colors cursor-pointer"
              title="Delete asset"
            >
              ×
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mt-2.5 mb-2">
          <h4 className="text-xs font-bold text-slate-100 truncate flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-lime-400" />
            <span>{item.title}</span>
          </h4>
        </div>

        {/* Image Display */}
        <div 
          className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 aspect-video flex items-center justify-center group-hover:border-lime-400/40 transition-colors cursor-pointer"
          onClick={() => setIsZoomed(true)}
        >
          <img
            src={item.url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
            <span className="text-[10px] text-lime-300 font-mono flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Click to expand
            </span>
          </div>
        </div>

        {/* Caption / Source Metadata */}
        {item.caption && (
          <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed font-sans line-clamp-2">
            {item.caption}
          </p>
        )}

        <div className="mt-2.5 pt-2 border-t border-emerald-500/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Meta Muse Image API</span>
          <span className="text-lime-400">High-Res Render</span>
        </div>
      </div>

      {/* Full-Screen Image Modal */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
          onClick={() => setIsZoomed(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[85vh] rounded-3xl surface-elevated border border-lime-400/40 p-4 shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-lime-400" />
                <h3 className="text-sm font-bold text-slate-100">{item.title}</h3>
              </div>
              <button
                onClick={() => setIsZoomed(false)}
                className="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-2xl overflow-hidden max-h-[65vh] border border-white/10">
              <img src={item.url} alt={item.title} className="max-w-full max-h-[65vh] object-contain" />
            </div>

            {item.caption && (
              <p className="text-xs text-slate-300 mt-3 text-center max-w-xl">
                {item.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
