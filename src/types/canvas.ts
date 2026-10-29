export type ToolType = 
  | 'select'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'laser'
  | 'living-ink'
  | 'shape-rect'
  | 'shape-circle'
  | 'shape-arrow'
  | 'shape-line'
  | 'lasso-copilot'
  | 'math-recognize';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export interface StrokePoint extends Point {
  pressure: number;
}

export interface Stroke {
  id: string;
  tool: ToolType;
  color: string;
  size: number;
  opacity: number;
  points: StrokePoint[];
  pageId: string;
  createdAt: number;
  bbox?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  synthetic?: boolean;
}

export interface Viewport {
  x: number; // world x at screen (0, 0)
  y: number; // world y at screen (0, 0)
  zoom: number; // 0.1 to 5.0
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export interface LaserParticle {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  color: string;
}

export interface LivingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
