import React, { useState } from 'react';
import { Mic, Volume2, VolumeX, Sparkles, MessageSquare } from 'lucide-react';

interface VoiceHUDProps {
  isListening: boolean;
  status: 'idle' | 'listening' | 'processing' | 'answering';
  onToggleListen: () => void;
  onExecuteCommand: (command: string) => void;
  ttsEnabled: boolean;
  onToggleTTS: () => void;
}

const SAMPLE_VOICE_COMMANDS = [
  "Show me 3 proofs for the Pythagorean Theorem",
  "Give me a Socratic hint for step 2",
  "Parse my handwritten ink and prove it",
  "Pin paper on Quantum Computing and Fermat's Theorem",
];

export const VoiceHUD: React.FC<VoiceHUDProps> = ({
  isListening,
  status,
  onToggleListen,
  onExecuteCommand,
  ttsEnabled,
  onToggleTTS,
}) => {
  const [showCommands, setShowCommands] = useState(false);

  return (
    <div className="fixed top-16 right-4 z-40 flex flex-col items-end gap-2">
      {/* Main Voice Co-pilot Capsule */}
      <div className="flex items-center gap-2.5 p-2 px-3.5 rounded-full insta-panel shadow-sm">
        {/* Waveform / Visualizer */}
        <div className="flex items-center gap-1 h-4">
          {isListening ? (
            <>
              <span className="w-1 h-3.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-2.5 bg-cyan-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </>
          ) : (
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
          )}
        </div>

        {/* Status only: conversation stays voice-only, nothing transcribed */}
        <div className="text-left min-w-[180px] max-w-[280px]">
          <div className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
            <span>Muse Voice {status !== 'idle' ? `• ${status}` : ''}</span>
          </div>
          <div className="text-xs text-slate-800 dark:text-slate-200 truncate font-medium">
            {status === 'listening'
              ? 'Listening…'
              : status === 'processing'
              ? 'Thinking…'
              : status === 'answering'
              ? 'Speaking…'
              : 'Voice Co-Pilot ready'}
          </div>
        </div>

        {/* Mic Toggle Button */}
        <button
          onClick={onToggleListen}
          className={`p-2 rounded-full transition-all cursor-pointer ${
            isListening
              ? 'bg-rose-500 text-white shadow-md animate-pulse'
              : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
          }`}
          title={isListening ? "Stop Listening" : "Start Voice Input"}
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Text to Speech toggle */}
        <button
          onClick={onToggleTTS}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            ttsEnabled ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 hover:text-slate-600'
          }`}
          title={ttsEnabled ? "Audio feedback active" : "Audio feedback muted"}
        >
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Demo command drawer toggle */}
        <button
          onClick={() => setShowCommands(!showCommands)}
          className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Demo Voice Prompts"
        >
          <Sparkles className="w-4 h-4 text-cyan-500" />
        </button>
      </div>

      {/* Quick Voice Command Chips (Dropdown) */}
      {showCommands && (
        <div className="p-3 rounded-3xl insta-panel shadow-xl max-w-sm space-y-2 animate-in fade-in slide-in-from-top-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
            <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
            <span>Spoken Command Samples</span>
          </div>
          <div className="space-y-1">
            {SAMPLE_VOICE_COMMANDS.map((cmd, i) => (
              <button
                key={i}
                onClick={() => {
                  onExecuteCommand(cmd);
                  setShowCommands(false);
                }}
                className="w-full text-left p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>"{cmd}"</span>
                <span className="text-[10px] text-cyan-500 font-semibold">Run</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
