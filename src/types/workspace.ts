import { Stroke, Viewport } from './canvas';
import { SolvedEquation } from './math';
import { DocumentItem } from './document';

export interface NotebookPage {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  viewport: Viewport;
  thumbnailUrl?: string;
  gridType: 'dots' | 'lines' | 'none';
}

export interface WorkspaceData {
  id: string;
  name: string;
  activePageId: string;
  pages: NotebookPage[];
  strokes: Record<string, Stroke[]>; // pageId -> Stroke[]
  equations: Record<string, SolvedEquation[]>; // pageId -> SolvedEquation[]
  documents: DocumentItem[];
  globalVariables: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}
