import React, { useState, useEffect } from 'react';
import { queryMetaModel, loadMetaConfig } from '../../engine/metaAiClient';
import { CopilotResponse, Flashcard } from '../../types/ai';
import { LatexRenderer } from '../UI/LatexRenderer';
import {
  Sparkles,
  X,
  Layers,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  FileQuestion,
  RefreshCw,
} from 'lucide-react';

interface LassoCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  cropDataUrl?: string;
  extractedSymbols?: string;
}

export const LassoCopilotModal: React.FC<LassoCopilotModalProps> = ({
  isOpen,
  onClose,
  cropDataUrl,
  extractedSymbols,
}) => {
  const [queryType, setQueryType] = useState<'explain' | 'solve' | 'flashcards'>('explain');
  const [userPrompt, setUserPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<CopilotResponse | null>(null);

  const metaConfig = loadMetaConfig();

  const handleQuery = async (type = queryType) => {
    setIsLoading(true);
    try {
      const res = await queryMetaModel({
        imageCropDataUrl: cropDataUrl,
        extractedSymbols,
        queryType: type,
        userPrompt: userPrompt.trim() || undefined,
      });
      setResponse(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleQuery('explain');
    } else {
      setResponse(null);
    }
  }, [isOpen, cropDataUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md select-none animate-fade-in">
      <div className="w-full max-w-2xl max-h-[88vh] rounded-2xl glass-panel-glow border border-cyan-500/40 p-6 flex flex-col shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Meta Llama AI Copilot</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono border border-cyan-500/30">
                  {metaConfig.modelName}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Multimodal Spatial Canvas Region Query
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Crop Preview */}
        {cropDataUrl && (
          <div className="my-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <img
              src={cropDataUrl}
              alt="Lasso visual crop"
              className="h-14 max-w-[140px] object-contain rounded-lg border border-slate-700 bg-[#080c14]"
            />
            <div className="text-xs font-mono text-slate-300">
              <span>Lasso Region Captured</span>
              <p className="text-[10px] text-slate-500">
                Visual context and stroke vectors routed to Meta model
              </p>
            </div>
          </div>
        )}

        {/* Query Type Pills */}
        <div className="flex items-center gap-2 py-2">
          <button
            onClick={() => {
              setQueryType('explain');
              handleQuery('explain');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              queryType === 'explain'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Explain Step-by-Step</span>
          </button>

          <button
            onClick={() => {
              setQueryType('solve');
              handleQuery('solve');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              queryType === 'solve'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Solve & Alternative Methods</span>
          </button>

          <button
            onClick={() => {
              setQueryType('flashcards');
              handleQuery('flashcards');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              queryType === 'flashcards'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <FileQuestion className="w-3.5 h-3.5" />
            <span>Active Recall Flashcards</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto my-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 min-h-[200px] select-text text-sm leading-relaxed">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-xs font-mono">Meta Llama reasoning in progress...</span>
            </div>
          ) : response ? (
            <div className="space-y-4">
              {/* If flashcards returned */}
              {response.flashcards && response.flashcards.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {response.flashcards.map((card, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-800/80 border border-cyan-500/20 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400">
                        <span>Card {i + 1}: {card.concept}</span>
                      </div>
                      <div className="font-semibold text-white text-xs">{card.question}</div>
                      {card.latex && (
                        <div className="p-2 rounded bg-slate-900/80 text-center my-1">
                          <LatexRenderer math={card.latex} block />
                        </div>
                      )}
                      <div className="text-xs text-slate-300">{card.answer}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div className="whitespace-pre-wrap font-sans text-slate-200">
                    {response.markdown}
                  </div>
                  {response.latexFormulas && response.latexFormulas.length > 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-[10px] font-mono uppercase text-slate-400">
                        Rendered Mathematical Notation
                      </span>
                      {response.latexFormulas.map((lat, idx) => (
                        <div key={idx} className="overflow-x-auto py-1">
                          <LatexRenderer math={lat} block />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-400 italic">Select a query mode above to begin analysis.</p>
          )}
        </div>

        {/* User Prompt Custom Query */}
        <div className="pt-2 flex items-center gap-2">
          <input
            type="text"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleQuery();
            }}
            placeholder="Ask a custom question to Meta Llama about this canvas area..."
            className="flex-1 px-3.5 py-2 rounded-xl glass-input text-xs font-mono"
          />
          <button
            onClick={() => handleQuery()}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 disabled:opacity-50 transition-all shadow-md"
          >
            Ask Llama
          </button>
        </div>
      </div>
    </div>
  );
};
