export type ToolMode = 'pan' | 'select' | 'pen' | 'eraser' | 'note' | 'theorem' | 'paper' | 'image';

export interface Point {
  x: number;
  y: number;
}

export interface StrokePoint extends Point {
  pressure?: number;
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string;
  width: number;
  recognizedText?: string;
  recognizedLatex?: string;
  createdAt: number;
  /** Display-only ink (projected answers, dictated write-ups): skipped by recognition. */
  synthetic?: boolean;
}

export interface ProofStep {
  stepNumber: number;
  title: string;
  latex?: string;
  explanation: string;
  socraticHint: string;
  revealed?: boolean;
}

export type ProofMethodology = 
  | 'Geometric'
  | 'Algebraic'
  | 'Contradiction'
  | 'Induction'
  | 'Calculus'
  | 'Combinatorial'
  | 'Topology';

export interface ProofNode {
  id: string;
  theoremId: string;
  methodology: ProofMethodology;
  title: string;
  summary: string;
  steps: ProofStep[];
  diagramSvg?: string;
  position: Point;
}

export interface TheoremItem {
  id: string;
  type: 'theorem';
  title: string;
  statement: string;
  latex: string;
  position: Point;
  size: { width: number; height: number };
  proofs: ProofNode[];
  isExpanded?: boolean;
}

export interface NoteItem {
  id: string;
  type: 'note';
  title?: string;
  content: string;
  color: string;
  position: Point;
  size: { width: number; height: number };
}

export interface DocumentItem {
  id: string;
  type: 'paper' | 'pdf';
  title: string;
  authors: string;
  abstract: string;
  pages: string[];
  currentPage: number;
  position: Point;
  size: { width: number; height: number };
  fileName?: string;
  fileSize?: number;
  totalWords?: number;
  uploadedAt?: number;
  translations?: Record<string, string[]>;
  selectedLanguage?: string;
}

export interface ImageItem {
  id: string;
  type: 'image';
  title: string;
  url: string;
  caption?: string;
  position: Point;
  size: { width: number; height: number };
}

export type PhysicsSystemType = 'pendulum' | 'spring' | 'orbit' | 'projectile';

export interface LivingPhysicsItem {
  id: string;
  type: 'living_physics';
  simulationType: PhysicsSystemType;
  title: string;
  position: Point;
}

export interface SocraticAnnotation {
  id: string;
  targetId: string;
  position: Point;
  question: string;
  hint: string;
  userReflection?: string;
  isResolved?: boolean;
}

export type CanvasItem = TheoremItem | NoteItem | DocumentItem | ImageItem;

// Single source of truth for Meta model config lives in ./ai
// (provider, modelName, apiKey, baseUrl, temperature) and is persisted
// via loadMetaConfig/saveMetaConfig in src/engine/metaAiClient.ts.
export type { MetaModelConfig } from './ai';

export interface VoiceState {
  isListening: boolean;
  transcript: string;
  status: 'idle' | 'listening' | 'processing' | 'answering';
  lastActionSummary?: string;
}

// Hierarchical File & Folder System for Multi-Canvas Workspace
export interface CanvasPage {
  id: string;
  name: string;
  folderId: string | null;
  theorems: TheoremItem[];
  proofs: ProofNode[];
  documents: DocumentItem[];
  images: ImageItem[];
  socraticHints: SocraticAnnotation[];
  strokes: Stroke[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceFolder {
  id: string;
  name: string;
  parentId: string | null;
  isOpen?: boolean;
  createdAt: number;
}

export interface WorkspaceState {
  folders: WorkspaceFolder[];
  pages: CanvasPage[];
  activePageId: string;
}
