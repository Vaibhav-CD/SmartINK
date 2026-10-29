import React, { useState, useRef } from 'react';
import type { WorkspaceFolder, CanvasPage, DocumentItem } from '../types';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Download, 
  Upload,
  PanelLeftClose,
  PanelLeft,
  BookOpen,
  Volume2,
  FileUp,
  FileCheck2
} from 'lucide-react';

interface WorkspaceExplorerProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  folders: WorkspaceFolder[];
  pages: CanvasPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onCreateFolder: (name: string, parentId?: string | null) => void;
  onCreatePage: (name: string, folderId?: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeletePage: (pageId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onRenamePage: (pageId: string, newName: string) => void;
  onExportWorkspace: () => void;
  onImportWorkspace: (jsonString: string) => void;
  onUploadPdf?: (file: File) => void;
  onOpenPdfReader?: (doc: DocumentItem) => void;
}

export const WorkspaceExplorer: React.FC<WorkspaceExplorerProps> = ({
  isOpen,
  onToggleOpen,
  folders,
  pages,
  activePageId,
  onSelectPage,
  onCreateFolder,
  onCreatePage,
  onDeleteFolder,
  onDeletePage,
  onRenameFolder,
  onRenamePage,
  onExportWorkspace,
  onImportWorkspace,
  onUploadPdf,
  onOpenPdfReader,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'materials'>('files');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const pdfInputRef = useRef<HTMLInputElement>(null);
  
  // New creation dialog states
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  // Renaming state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleStartCreatePage = (folderId: string | null = null) => {
    setTargetFolderId(folderId);
    setNewPageName('');
    setIsCreatingPage(true);
  };

  const handleFinishCreatePage = () => {
    if (newPageName.trim()) {
      onCreatePage(newPageName.trim(), targetFolderId);
    }
    setIsCreatingPage(false);
    setNewPageName('');
  };

  const handleFinishCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), null);
    }
    setIsCreatingFolder(false);
    setNewFolderName('');
  };

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleFinishRename = (id: string, isFolder: boolean) => {
    if (editingName.trim()) {
      if (isFolder) {
        onRenameFolder(id, editingName.trim());
      } else {
        onRenamePage(id, editingName.trim());
      }
    }
    setEditingId(null);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) onImportWorkspace(content);
    };
    reader.readAsText(file);
  };

  const filteredPages = pages.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Sidebar Toggle Button */}
      <button
        onClick={onToggleOpen}
        className={`fixed top-3 z-50 p-2.5 rounded-2xl insta-panel text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all shadow-sm cursor-pointer ${
          isOpen ? 'left-[288px]' : 'left-3'
        }`}
        title={isOpen ? "Collapse File Tree" : "Open Workspace Files"}
      >
        {isOpen ? <PanelLeftClose className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> : <PanelLeft className="w-4 h-4" />}
      </button>

      {/* Main Slide-out Explorer Panel */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-72 insta-panel bg-white/95 dark:bg-[#0c0e14]/95 backdrop-blur-2xl flex flex-col transition-transform duration-300 ease-in-out shadow-lg border-r border-slate-200 dark:border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Section */}
        <div className="p-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                Workspace
              </h2>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                title="Create Folder"
              >
                <Folder className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleStartCreatePage(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                title="Create Page"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="mt-3 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'files' ? "Search files..." : "Search PDFs..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Navigation Tabs: Canvas Files vs PDF Materials */}
          <div className="flex items-center gap-1 mt-2.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                activeTab === 'files'
                  ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Files ({pages.length})
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'materials'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>PDFs & TTS</span>
            </button>
          </div>
        </div>

        {/* New Folder Inline Creator */}
        {isCreatingFolder && (
          <div className="p-3 bg-cyan-500/10 border-b border-cyan-500/20 flex items-center gap-2 animate-in fade-in">
            <Folder className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishCreateFolder();
                if (e.key === 'Escape') setIsCreatingFolder(false);
              }}
              className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs rounded-lg focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleFinishCreateFolder}
              className="p-1 text-emerald-600 hover:bg-emerald-500/20 rounded cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsCreatingFolder(false)}
              className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* New Page Inline Creator */}
        {isCreatingPage && (
          <div className="p-3 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center gap-2 animate-in fade-in">
            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Page title..."
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishCreatePage();
                if (e.key === 'Escape') setIsCreatingPage(false);
              }}
              className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs rounded-lg focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleFinishCreatePage}
              className="p-1 text-emerald-600 hover:bg-emerald-500/20 rounded cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsCreatingPage(false)}
              className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Section: Either Files Tree or PDF Materials */}
        {activeTab === 'materials' ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {/* Upload PDF Action Button */}
            {onUploadPdf && (
              <>
                <input
                  type="file"
                  ref={pdfInputRef}
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadPdf(f);
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => pdfInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  title="Upload a PDF file for reading & TTS"
                >
                  <FileUp className="w-4 h-4" />
                  <span>Upload PDF Document</span>
                </button>
              </>
            )}

            {/* List all documents across workspace pages */}
            {(() => {
              const allDocs = pages.flatMap((p) =>
                (p.documents || []).map((doc) => ({
                  ...doc,
                  pageId: p.id,
                  pageName: p.name,
                }))
              );
              const filteredDocs = allDocs.filter(
                (d) =>
                  !searchQuery ||
                  d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  d.authors.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (filteredDocs.length === 0) {
                return (
                  <div className="text-center py-8 px-4 text-xs text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
                    <p className="font-semibold text-slate-300">No PDFs or Materials Yet</p>
                    <p className="mt-1 text-[11px] opacity-75">
                      Upload a PDF file or drag & drop one onto the canvas to read with Text-to-Speech.
                    </p>
                  </div>
                );
              }

              return filteredDocs.map((doc) => {
                const isPdf = doc.type === 'pdf' || !!doc.fileName;
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      onSelectPage(doc.pageId);
                    }}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/40 transition-all cursor-pointer group space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isPdf ? (
                          <FileCheck2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-violet-500 shrink-0" />
                        )}
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {doc.title}
                        </h4>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1">
                      {doc.authors}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>{doc.pages?.length || 1} pages &bull; {doc.totalWords ? `${doc.totalWords} w` : 'Paper'}</span>
                      <span className="text-cyan-500">Sheet: {doc.pageName}</span>
                    </div>

                    {onOpenPdfReader && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPage(doc.pageId);
                          onOpenPdfReader(doc);
                        }}
                        className="w-full mt-1 py-1.5 px-2 rounded-xl bg-lime-500/15 hover:bg-lime-500/25 text-lime-600 dark:text-lime-400 border border-lime-500/30 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen Aloud (TTS)</span>
                      </button>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        ) : (
        /* Tree List Section */
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {folders.map((folder) => {
            const isCollapsed = !!collapsedFolders[folder.id];
            const folderPages = filteredPages.filter(p => p.folderId === folder.id);
            const isEditing = editingId === folder.id;

            return (
              <div key={folder.id} className="space-y-0.5">
                {/* Folder Row */}
                <div className="group flex items-center justify-between p-1.5 px-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-slate-700 dark:text-slate-300 transition-colors">
                  <div 
                    onClick={() => toggleFolder(folder.id)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <Folder className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleFinishRename(folder.id, true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename(folder.id, true);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 px-2 py-0.5 bg-white dark:bg-slate-900 border border-cyan-500 text-xs rounded-lg focus:outline-none"
                      />
                    ) : (
                      <span className="text-xs font-semibold truncate">
                        {folder.name}
                      </span>
                    )}
                  </div>

                  {/* Folder Actions */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartCreatePage(folder.id);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-cyan-600 cursor-pointer"
                      title="Add Page to folder"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(folder.id, folder.name);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 cursor-pointer"
                      title="Rename folder"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFolder(folder.id);
                      }}
                      className="p-1 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 cursor-pointer"
                      title="Delete folder"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Sub-pages inside this folder */}
                {!isCollapsed && (
                  <div className="pl-4 space-y-0.5 border-l border-slate-200 dark:border-slate-800 ml-4">
                    {folderPages.map((page) => {
                      const isActive = activePageId === page.id;
                      const isPageEditing = editingId === page.id;

                      return (
                        <div
                          key={page.id}
                          onClick={() => onSelectPage(page.id)}
                          className={`group flex items-center justify-between p-1.5 px-2.5 rounded-2xl cursor-pointer transition-all ${
                            isActive
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400 dark:text-cyan-600' : 'text-slate-400'}`} />
                            
                            {isPageEditing ? (
                              <input
                                type="text"
                                autoFocus
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={() => handleFinishRename(page.id, false)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleFinishRename(page.id, false);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                className="flex-1 px-2 py-0.5 bg-white dark:bg-slate-900 border border-cyan-500 text-xs rounded-lg focus:outline-none"
                              />
                            ) : (
                              <span className="text-xs truncate">
                                {page.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {!isPageEditing && (
                              <span className="text-[10px] opacity-70 group-hover:hidden">
                                {page.theorems.length > 0 ? `${page.theorems.length} thm` : ''}
                              </span>
                            )}
                            <div className="hidden group-hover:flex items-center gap-0.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartRename(page.id, page.name);
                                }}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-800 cursor-pointer"
                                title="Rename"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeletePage(page.id);
                                }}
                                className="p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {folderPages.length === 0 && (
                      <div className="py-1 px-2 text-[11px] text-slate-400 italic">
                        Empty folder
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Root-Level Pages */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Root Pages
            </div>

            {filteredPages
              .filter(p => p.folderId === null)
              .map((page) => {
                const isActive = activePageId === page.id;
                const isPageEditing = editingId === page.id;

                return (
                  <div
                    key={page.id}
                    onClick={() => onSelectPage(page.id)}
                    className={`group flex items-center justify-between p-1.5 px-2.5 rounded-2xl cursor-pointer transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400 dark:text-cyan-600' : 'text-slate-400'}`} />
                      
                      {isPageEditing ? (
                        <input
                          type="text"
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleFinishRename(page.id, false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFinishRename(page.id, false);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="flex-1 px-2 py-0.5 bg-white dark:bg-slate-900 border border-cyan-500 text-xs rounded-lg focus:outline-none"
                        />
                      ) : (
                        <span className="text-xs truncate">
                          {page.name}
                        </span>
                      )}
                    </div>

                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(page.id, page.name);
                        }}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-800 cursor-pointer"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(page.id);
                        }}
                        className="p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
        )}

        {/* Bottom Footer Actions: Backup / Import */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onExportWorkspace}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Download backup JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup</span>
            </button>

            <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>

          <div className="text-[10px] text-slate-400 font-mono">
            {pages.length} Files
          </div>
        </div>
      </aside>
    </>
  );
};
