import type { Stroke } from '../../types';
import { glyphSignature } from './rasterize';
import type {
  NeuralGlyphRequest,
  NeuralGlyphResponse,
} from './recognition.worker';

export interface NeuralGlyphResult {
  digit: string;
  confidence: number;
}

/** Batch digit classifier; implemented by the worker service or test stubs. */
export interface NeuralGlyphClassifier {
  readonly ready: boolean;
  classifyGlyphs(
    glyphs: Stroke[][]
  ): Promise<Map<string, NeuralGlyphResult>>;
}

const RESPONSE_TIMEOUT_MS = 5000;

/**
 * Worker-backed MNIST digit classifier. Lazy, never throws: any failure
 * (missing Worker, blocked model fetch, timeout) resolves to an empty map
 * so the geometric recognizer result stands.
 */
class WorkerNeuralGlyphClassifier implements NeuralGlyphClassifier {
  readonly ready: boolean =
    typeof Worker !== 'undefined' && typeof window !== 'undefined';

  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<
    number,
    {
      resolve: (results: Map<string, NeuralGlyphResult>) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  private ensureWorker(): Worker | null {
    if (!this.ready) return null;
    if (!this.worker) {
      try {
        this.worker = new Worker(
          new URL('./recognition.worker.ts', import.meta.url),
          { type: 'module' }
        );
        this.worker.onmessage = (
          e: MessageEvent<NeuralGlyphResponse>
        ) => {
          const entry = this.pending.get(e.data.id);
          if (!entry) return;
          clearTimeout(entry.timer);
          this.pending.delete(e.data.id);
          entry.resolve(new Map(Object.entries(e.data.results)));
        };
        this.worker.onerror = () => {
          this.disposeWorker();
        };
      } catch {
        this.worker = null;
      }
    }
    return this.worker;
  }

  private disposeWorker(): void {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.resolve(new Map());
    }
    this.pending.clear();
    try {
      this.worker?.terminate();
    } catch {
      // Already gone.
    }
    this.worker = null;
  }

  async classifyGlyphs(
    glyphs: Stroke[][]
  ): Promise<Map<string, NeuralGlyphResult>> {
    const worker = this.ensureWorker();
    if (!worker || glyphs.length === 0) return new Map();
    const id = ++this.seq;
    const request: NeuralGlyphRequest = {
      id,
      glyphs: glyphs.map((strokes) => ({
        signature: glyphSignature(strokes),
        strokes,
      })),
    };
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve(new Map());
      }, RESPONSE_TIMEOUT_MS);
      this.pending.set(id, { resolve, timer });
      try {
        worker.postMessage(request);
      } catch {
        clearTimeout(timer);
        this.pending.delete(id);
        resolve(new Map());
      }
    });
  }
}

export const neuralGlyphService: NeuralGlyphClassifier =
  new WorkerNeuralGlyphClassifier();
