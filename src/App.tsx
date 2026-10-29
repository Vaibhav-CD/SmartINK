import React, { useEffect, useState } from 'react';
import { InfiniteCanvas } from './components/Canvas/InfiniteCanvas';
import { TopNavigation } from './components/Toolbar/TopNavigation';
import { MainFloatingToolbar } from './components/Toolbar/MainFloatingToolbar';
import { PageDrawer } from './components/Toolbar/PageDrawer';
import { CalcInkBar } from './components/CalcInk/CalcInkBar';
import { DocumentCard } from './components/DocumentStudio/DocumentCard';
import { DocumentReaderModal } from './components/DocumentStudio/DocumentReaderModal';
import { LassoCopilotModal } from './components/Copilot/LassoCopilotModal';
import { MetaSettingsModal } from './components/Copilot/MetaSettingsModal';
import { useCanvasStore } from './store/canvasStore';
import { useDocumentStore } from './store/documentStore';

export const App: React.FC = () => {
  const { initWorkspace, setTool } = useCanvasStore();
  const { documents } = useDocumentStore();

  const [isPageDrawerOpen, setIsPageDrawerOpen] = useState(false);
  const [isCalcInkOpen, setIsCalcInkOpen] = useState(false);
  const [isMetaSettingsOpen, setIsMetaSettingsOpen] = useState(false);
  const [lassoData, setLassoData] = useState<{
    cropDataUrl: string;
    bbox: { minX: number; minY: number; maxX: number; maxY: number };
  } | null>(null);

  // Initialize workspace persistence
  useEffect(() => {
    initWorkspace();
  }, [initWorkspace]);

  // Global tool hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'v') setTool('select');
      else if (key === 'p') setTool('pen');
      else if (key === 'h') setTool('highlighter');
      else if (key === 'e') setTool('eraser');
      else if (key === 'l') setTool('living-ink');
      else if (key === 'm') setIsCalcInkOpen(true);
      else if (key === 'escape') {
        setIsPageDrawerOpen(false);
        setIsCalcInkOpen(false);
        setIsMetaSettingsOpen(false);
        setLassoData(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080c14] font-sans">
      {/* Top Navigation */}
      <TopNavigation
        onTogglePageDrawer={() => setIsPageDrawerOpen(!isPageDrawerOpen)}
        onOpenMetaSettings={() => setIsMetaSettingsOpen(true)}
      />

      {/* Infinite Spatial Canvas Engine */}
      <InfiniteCanvas
        onLassoComplete={(cropDataUrl, bbox) => {
          setLassoData({ cropDataUrl, bbox });
        }}
      />

      {/* Floating Document Cards */}
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} />
      ))}

      {/* Main Floating Tool Palette */}
      <MainFloatingToolbar onOpenMathBar={() => setIsCalcInkOpen(true)} />

      {/* Page Drawer */}
      <PageDrawer
        isOpen={isPageDrawerOpen}
        onClose={() => setIsPageDrawerOpen(false)}
      />

      {/* CalcInk Living Math Bar */}
      <CalcInkBar
        isOpen={isCalcInkOpen}
        onClose={() => setIsCalcInkOpen(false)}
      />

      {/* Document Reader Studio Modal */}
      <DocumentReaderModal />

      {/* Lasso AI Copilot Modal */}
      <LassoCopilotModal
        isOpen={!!lassoData}
        onClose={() => setLassoData(null)}
        cropDataUrl={lassoData?.cropDataUrl}
      />

      {/* Meta AI Configuration Modal */}
      <MetaSettingsModal
        isOpen={isMetaSettingsOpen}
        onClose={() => setIsMetaSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
