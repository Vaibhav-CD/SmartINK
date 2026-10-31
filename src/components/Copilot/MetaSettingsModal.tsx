import React, { useState } from 'react';
import {
  DEFAULT_META_CONFIG,
  loadMetaConfig,
  saveMetaConfig,
  getTaskModel,
  META_TASK_LABELS,
} from '../../engine/metaAiClient';
import { MetaModelConfig, MetaTask } from '../../types/ai';
import { Settings, X, Key, Cpu, Globe, Check } from 'lucide-react';

interface MetaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const META_MODEL_PRESETS = [
  { provider: 'meta', name: 'muse-wonder-1.0', url: 'https://api.meta.ai/v1' },
  { provider: 'meta', name: 'muse-spark-1.3', url: 'https://api.meta.ai/v1' },
  { provider: 'meta', name: 'muse-spark-1.2', url: 'https://api.meta.ai/v1' },
  { provider: 'meta', name: 'Llama-4-Maverick-17B-128E-Instruct-FP8', url: 'https://api.llama.com/v1' },
  { provider: 'groq', name: 'llama-3.3-70b-versatile', url: 'https://api.groq.com/openai/v1' },
  { provider: 'together', name: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', url: 'https://api.together.xyz/v1' },
  { provider: 'openrouter', name: 'meta-llama/llama-3.3-70b-instruct', url: 'https://openrouter.ai/api/v1' },
];

const ROUTED_TASKS: MetaTask[] = ['copilot', 'proofs', 'translation', 'image', 'transcribe', 'segment', 'fallback'];

export const MetaSettingsModal: React.FC<MetaSettingsModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<MetaModelConfig>(loadMetaConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    saveMetaConfig(config);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleSelectPreset = (preset: typeof META_MODEL_PRESETS[0]) => {
    setConfig((prev) => ({
      ...prev,
      provider: preset.provider as any,
      modelName: preset.name,
      baseUrl: preset.url,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md select-none animate-fade-in">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl glass-panel-glow border border-cyan-500/40 p-6 flex flex-col shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Meta Muse Model Settings</h2>
              <p className="text-xs text-slate-400 font-mono">
                Muse default. Key stays local only — never committed.
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

        {/* Quick Presets */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Recommended Meta Model Presets:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {META_MODEL_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => handleSelectPreset(p)}
                className={`p-2 rounded-xl border text-left text-xs transition-all ${
                  config.modelName === p.name
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold line-clamp-1">{p.name}</div>
                <div className="text-[10px] text-slate-500 font-mono capitalize">{p.provider}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form Fields */}
        <div className="mt-5 space-y-3.5">
          {/* API Key */}
          <div>
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5 mb-1">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span>Muse API Key (stored locally, never committed):</span>
            </label>
            <input
              type="password"
              autoComplete="off"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="Paste Muse key… (blank = offline engine)"
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1 font-mono">
              * Saved only in this browser (localStorage) or your gitignored .env.local. Never logged, never in GitHub.
            </p>
          </div>

          {/* Model Name */}
          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1">Model Name:</label>
            <input
              type="text"
              value={config.modelName}
              onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-mono"
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5 mb-1">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>API Base URL:</span>
            </label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-mono"
            />
          </div>

          {/* Per-task model routing */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Model per task (Meta Model API):
            </label>
            <div className="space-y-2">
              {ROUTED_TASKS.map((task) => (
                <div key={task} className="flex items-center gap-2">
                  <span className="flex-1 text-[11px] text-slate-400">{META_TASK_LABELS[task]}</span>
                  <input
                    type="text"
                    aria-label={META_TASK_LABELS[task]}
                    value={getTaskModel(config, task)}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        taskModels: { ...(config.taskModels ?? {}), [task]: e.target.value },
                      })
                    }
                    className="w-44 px-2.5 py-1.5 rounded-lg glass-input text-[11px] font-mono"
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-mono">
              Chat routes retry Glimmer → Spark Open (open weights), then the offline engine.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 transition-all"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Configuration</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
