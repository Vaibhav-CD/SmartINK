import * as ort from 'onnxruntime-web';
import ortWasmSimdUrl from '../../../node_modules/onnxruntime-web/dist/ort-wasm-simd.wasm?url';
import { rasterizeGlyph, softmax, GLYPH_RASTER_SIZE } from './rasterize';
import type { Stroke } from '../../types';

export interface NeuralGlyphRequest {
  id: number;
  glyphs: { signature: string; strokes: Stroke[] }[];
}

export interface NeuralGlyphResponse {
  id: number;
  results: Record<string, { digit: string; confidence: number }>;
}

const MODEL_URL = '/models/mnist-12.onnx';

const workerSelf = self as unknown as {
  onmessage: ((e: MessageEvent<NeuralGlyphRequest>) => void) | null;
  postMessage: (msg: NeuralGlyphResponse) => void;
};

let session: ort.InferenceSession | null = null;
let sessionFailed = false;

async function ensureSession(): Promise<ort.InferenceSession | null> {
  if (session) return session;
  if (sessionFailed) return null;
  try {
    // Single-threaded build: no SharedArrayBuffer / COOP-COEP requirement,
    // so inference works on any static host and fully offline once cached.
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths =
      ortWasmSimdUrl.slice(0, ortWasmSimdUrl.lastIndexOf('/') + 1);
    session = await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
    });
    return session;
  } catch {
    session = null;
    sessionFailed = true;
    return null;
  }
}

workerSelf.onmessage = async (e: MessageEvent<NeuralGlyphRequest>) => {
  const { id, glyphs } = e.data;
  const results: NeuralGlyphResponse['results'] = {};
  const active = await ensureSession();
  if (active) {
    const inputName = active.inputNames[0];
    const outputName = active.outputNames[0];
    for (const glyph of glyphs) {
      try {
        const data = rasterizeGlyph(glyph.strokes, GLYPH_RASTER_SIZE);
        const tensor = new ort.Tensor('float32', data, [
          1,
          1,
          GLYPH_RASTER_SIZE,
          GLYPH_RASTER_SIZE,
        ]);
        const outputs = await active.run({ [inputName]: tensor });
        const logits = outputs[outputName].data as Float32Array;
        const probs = softmax(logits);
        let best = 0;
        for (let i = 1; i < probs.length; i++) {
          if (probs[i] > probs[best]) best = i;
        }
        results[glyph.signature] = {
          digit: String(best),
          confidence: probs[best],
        };
      } catch {
        // Leave this glyph to the geometric recognizer.
      }
    }
  }
  workerSelf.postMessage({ id, results });
};
