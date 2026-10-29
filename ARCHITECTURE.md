# SmartInk · CalcInk Architecture

This document is the architectural design record for the CalcInk problem
statement (Inter-IIT Tech Meet 15.0, Software PS): an on-device handwritten
math scratchpad. It covers the recognition pipeline, the pre-trained model
choice (with evaluated alternatives), the stroke-to-tensor bridge, and how the
60 FPS, offline, and no-`eval()` constraints are met.

## 1. System overview

```
                         ┌──────────────────────────────┐
  mouse / stylus / touch │  InfiniteCanvas (React +     │
 ───────────────────────▶│  Canvas 2D, DPR-scaled, rAF) │
                         └──────────────┬───────────────┘
                                        │ strokes (100 ms debounced)
                                        ▼
                         ┌──────────────────────────────┐
                         │  scanEquations               │  geometric first paint
                         │  cluster → classify → parse  │  (~instant, main thread,
                         │  → evaluate → project        │   debounced, no inference)
                         └──────┬───────────────┬───────┘
                                │               │ glyph overrides ≥ 0.90
                                │               ▼
                                │        ┌──────────────────────────────┐
                                │        │  Neural worker (Web Worker + │
                                │        │  ONNX Runtime Web, WASM)     │
                                │        │  rasterize → tensor → MNIST  │
                                │        └──────────────────────────────┘
                                ▼
                         ┌──────────────────────────────┐
                         │  InlineMathProjection        │
                         │  answer inked adjacent to =  │
                         └──────────────────────────────┘
```

Key design decisions:

- **Geometric-first, neural-second.** The geometric recognizer paints the first
  projection synchronously (same frame budget as drawing), so ink-to-answer
  latency never waits on inference. The neural model then refines digit
  glyphs asynchronously and only overrides at ≥ 0.90 confidence.
- **Reactive editing.** Recognition re-runs on every stroke change (debounced),
  so erasing or replacing a term re-evaluates and the inline answer updates in
  place — no stale projections.
- **Projected ink is display-only.** Synthesized answer strokes carry
  `synthetic: true` and are excluded at every recognition entry point
  (`scanEquations`, `recognizeStrokeGroup`), so re-scans can never feed answers
  back into the equation they annotate.

## 2. Pre-trained model justification

**Chosen: MNIST-12 CNN from the ONNX Model Zoo** (`public/models/mnist-12.onnx`,
full card in `public/models/ATTRIBUTION.md`).

| Criterion | MNIST-12 | Why it wins |
|-----------|----------|-------------|
| Size | 26 kB | Precaches instantly; keeps the offline bundle lean |
| Speed | Single-thread WASM, ms-scale per glyph, off main thread | Zero risk to the 60 FPS budget |
| Accuracy | 1.1% top-1 error (MNIST test); gated at ≥ 0.90 in-app | Digits are the highest-frequency, highest-ambiguity glyphs (6/8, 1/7) |
| License | MIT | Clean redistribution in a hackathon repo |
| Runtime | ONNX Runtime Web (explicitly allowed by the PS) | No COOP/COEP headers needed (single-thread build) |

**Alternatives evaluated and rejected:**

1. **Larger handwritten-math models (e.g. CROHME-trained expression recognizers).**
   No maintained tiny ONNX build exists; published checkpoints are megabytes,
   slower per glyph, and solve full-expression parsing we already do
   deterministically. Overkill with worse latency.
2. **TensorFlow.js MNIST equivalents.** Same accuracy class but a heavier
   runtime (~hundreds of kB) for an identical 28×28 CNN. ONNX Runtime Web is
   smaller and PS-named.
3. **Training a custom CNN from scratch.** Explicitly out of scope — the PS
   directs teams to source existing open-source pre-trained models.
4. **Cloud vision / math APIs (OpenAI Vision, Mathpix, Cloud Vision).**
   Strictly prohibited by the PS. Never called on the CalcInk path.

**Scope honesty:** the model refines *digits 0–9 only*. Operators (`+ − × ÷`),
decimal points, and `=` stay geometric: they are structurally distinctive
(fast-path rules) and no comparably tiny pre-trained symbol model exists.
Digits were chosen because they dominate equation text and carry the most
visual ambiguity.

## 3. Stroke-to-tensor pipeline

`src/services/recognition/rasterize.ts` bridges raw canvas coordinates to the
model input, following the upstream MNIST preprocessing spec exactly:

1. Take the glyph's stroke points (world coordinates).
2. Fit them aspect-preserved into a 20×20 inner box, centered in 28×28.
3. Stamp ink pixels (radius ≈ 1 px at 28×28), white ink on black background.
4. Emit `float32` values scaled to `[0.0, 1.0]`.
5. Feed tensor `[1, 1, 28, 28]` (NCHW) to the session; softmax the 10 logits
   in-app; map argmax → digit + confidence.

The worker (`recognition.worker.ts`) owns one lazily created singleton
`InferenceSession`, reused across calls — no per-glyph session churn, no
memory growth over long sessions.

## 4. Constraint compliance

- **100% on-device.** Stroke capture, rasterization, inference, parsing, and
  evaluation all run client-side. The CalcInk path makes zero network calls
  (verify: airplane mode after load).
- **Complete offline operation.** `vite-plugin-pwa` precaches the shell, the
  ONNX WASM runtime, the model, and the PDF worker (13 entries, ~13 MB).
- **60 FPS integrity.** Inference lives in a Web Worker; geometric scanning is
  debounced 100 ms off the input path; rendering is a single DPR-scaled canvas
  under `requestAnimationFrame`. Heavy work can never block a pen stroke.
- **Safe execution.** No `eval()`, no `new Function`, no string timers
  anywhere in `src` (grep-verified). Division by zero yields a clean
  `Undefined` indicator; malformed syntax fails closed with no unhandled
  exceptions.

## 5. Module map (CalcInk core)

| Area | Files |
|------|-------|
| Canvas + ink | `src/components/Canvas/InfiniteCanvas.tsx`, `src/engine/smoothing.ts`, `src/engine/coordinates.ts` |
| Recognition | `src/services/calcInk/strokeRecognizer.ts`, `pointCloudRecognizer.ts`, `structuralSymbols.ts` |
| Neural path | `src/services/recognition/` (rasterize, worker, service, refine) |
| Evaluation | `src/services/calcInk/mathParser.ts`, `solutionSteps.ts` |
| Projection | `src/components/InlineMathProjection.tsx`, `src/services/calcInk/handwritingSynthesis.ts` |
| Erasers | `src/services/ink/pixelErase.ts` (pixel), stroke erase in canvas |
| Persistence | `src/engine/persistence.ts`, `src/services/workspaceStorage.ts` |

## 6. Test map (PS rubric cross-reference)

| Rubric item | Suites |
|-------------|--------|
| Arithmetic parser + BODMAS/PEMDAS, multi-digit, decimals | `mathParser.test.ts` |
| Division-by-zero edge cases → `Undefined` | `mathParser.test.ts`, `solutionSteps.test.ts` |
| Coordinate conversion | `coordinateTransform.test.ts`, `test/coordinates.test.ts` |
| Recognition vocabulary (digits, operators, ÷, symbols) | `strokeRecognizer.test.ts`, `pointCloudRecognizer.test.ts`, `mathSymbols.test.ts` |
| Neural rasterize + override rule | `rasterize.test.ts`, `refine.test.ts` |
| Reactive stability (synthetic ink never re-scanned) | `strokeRecognizer.test.ts` (synthetic exclusion), `handwritingSynthesis.test.ts` |
| Pixel eraser splitting | `pixelErase.test.ts` |

Run: `npm test` (Vitest). Type gate: `npx tsc --noEmit`. Offline gate:
`npm run build` then serve `dist/` and reload in airplane mode.

## 7. Beyond the PS (one learning space)

The repository also contains the broader SmartInk notebook (document studio,
Simulation Studio, voice ink, copilot) built on the same on-device core. Any
cloud model use there is Meta Llama only, key-gated, and disclosed in the
README's Runtime Model Disclosure table — the CalcInk path itself never calls
it.
