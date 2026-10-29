# Neural Model Attribution

## MNIST-12 — Handwritten Digit CNN (`mnist-12.onnx`, 26 kB)

- **Source:** [ONNX Model Zoo — vision/classification/mnist](https://github.com/onnx/models/tree/main/validated/vision/classification/mnist)
- **Direct file:** `validated/vision/classification/mnist/model/mnist-12.onnx` (opset 12, ONNX 1.9)
- **License:** MIT (see `SPDX-License-Identifier: MIT` in the upstream README)
- **Dataset:** [MNIST](http://yann.lecun.com/exdb/mnist/) (handwritten digits 0–9)
- **Training:** CNTK tutorial 103D — CNN with alternating convolution and max-pooling layers
- **Reported accuracy:** 1.1% top-1 error on MNIST test set
- **Contributors (upstream):** mengniwang95, airMeng, ftian1, hshen1 (Intel)

## How SmartInk uses it

- **Role:** second-pass digit classifier. The instant geometric recognizer
  paints the first projection; this model refines single-glyph digits
  asynchronously in a Web Worker (`src/services/recognition/`).
- **Input:** `float32` tensor `[1, 1, 28, 28]` — glyph strokes rasterized to
  28×28 grayscale, white ink on black, scaled to `[0.0, 1.0]`, centered in a
  20×20 inner box (exactly the upstream preprocessing spec).
- **Output:** 10 pre-softmax logits → softmax in-app → digit + confidence.
- **Override rule:** the neural digit replaces the geometric char only when
  confidence ≥ 0.90 and geometry disagrees or is less confident. Operators,
  dots, and `=` stay geometric (fast-path rules).
- **Runtime:** ONNX Runtime Web 1.17.x, single-threaded WASM build
  (`ort-wasm-simd.wasm`) — no SharedArrayBuffer / COOP-COEP requirement, works
  from any static host and fully offline once cached.
