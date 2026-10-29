# SmartInk 🪐✨
### Multimodal Infinite-Canvas Smart Notebook & Living Calculation Engine

SmartInk unites the fluid pen feel of Apple Notes and GoodNotes, the real-time living calculation power of Apple Math Notes, an infinite interactive spatial canvas like Excalidraw/Miro, an AI multimodal research copilot powered by Meta models, and an immersive multi-lingual PDF/Document reading studio with voice synthesis.

---

## 🌟 Key Features

### 1. Infinite Spatial Canvas Engine
- **Coordinate Transformation Matrix:** Seamless `worldToScreen` and `screenToWorld` mapping.
- **Focal Zoom & Pan:** Origin-centric zooming from 10% to 500% with mouse wheel, pinch-to-zoom, or two-finger swipe, and smooth panning via spacebar drag or middle-click.
- **Spatial Navigator Minimap:** Interactive minimap with draggable viewport rectangle, dot grid, and real-time zoom level tracking.
- **Natural Inking & Smoothing:** Catmull-Rom spline and Chaikin corner-cutting Bézier smoothing for high-fidelity pen input with pressure sensitivity.
- **Brushes & Tools:**
  - **Pen:** Natural responsive digital ink with customizable colors and line weights.
  - **Highlighter:** Semi-transparent multiply blend overlay.
  - **Laser Pointer:** Vanishing high-energy photon trail.
  - **Living Ink Brush:** Fluid particle simulation responding to virtual gravity, surface tension, and interactive cursor repulsion/attraction.
  - **Geometric Shape Tools:** Lines, rectangles, ellipses, and arrows with real-time feedback.
  - **Undo / Redo History Stack:** With `Ctrl+Z` and `Ctrl+Y` keyboard shortcuts.

### 2. CalcInk: Living Handwriting Math Engine
- **Instant Equality Solving:** Solves expressions ending with `=` (e.g. `2 * (5 + 13) = 36`).
- **Dynamic Variable Binding:** Defines variables (e.g. `r = 5`, `h = 12`) and links downstream equations (e.g. `V = pi * r^2 * h = 942.48`).
- **Synthetic Handwritten Ink Solution:** Automatically renders computed answers onto the canvas in synthetic handwritten ink matching natural human slant, jitter, and stroke dynamics.
- **Interactive Scrubber Sliders:** Tapping or hovering over numeric values spawns draggable scrubber sliders that dynamically recalculate all dependent formulas across the canvas in real time.
- **Inline 2D Function Graphing:** Detects functions of $x$ (e.g. `y = sin(x)`, `f(x) = x^2 - 4x + 3`) and plots interactive coordinate charts right next to the written equation.

### 3. Multimodal Document & PDF Reading Studio
- **Dual Decoding Pipeline:** Primary parsing via PDF.js with automatic raw binary stream decoding fallback for non-standard, corrupted, or text-sparse PDFs.
- **Smart Text Normalization & De-Hyphenation:** Intelligent repair engine that stitches broken line-split words (e.g. `persis-` + `tence` $\rightarrow$ `persistence`) and removes header/footer noise.
- **Essence-Preserving Polyglot Translation:** Translates document pages into Spanish, French, German, Hindi, Japanese, Chinese, and more, while strictly preserving technical notation, LaTeX formulas, code, and symbols.
- **Interactive Speech Synthesis (TTS):**
  - Web Speech API integration with voice personas (`Studio`, `Male`, `Female`, `Child`, `Deep`).
  - **Click-to-Seek:** Clicking any sentence in the document immediately jumps audio playback to that exact offset.
  - Active sentence highlight tracking.
  - **Chromium Audio Queue Watchdog:** 10-second heartbeat pulse (`pause` $\rightarrow$ `resume`) preventing Chromium browsers from stalling utterances longer than 15 seconds.
  - Floating document cards on the canvas and full-screen immersive Reader Modal with Dark, Sepia, and Light themes.

### 4. Multimodal AI Copilot (Meta Models)
- **Lasso & Area Query:** Draw a selection loop around any region of the canvas (handwriting, diagrams, graphs, text).
- **Meta Llama Integration:** Routes spatial crops and extracted symbols to Meta models (Llama 3.3 70B, Llama 3.2 Vision, etc.) via Groq, Together AI, OpenRouter, or local Ollama / vLLM endpoints.
- **Step-by-step explanations, alternative methods, and active recall flashcards** rendered in KaTeX.
- **Offline Fallback Engine:** Built-in offline mathematical and scientific reasoning engine ensures full functionality even without an external API key.

### 5. Multi-Page Notebook & Offline Persistence
- **Notebook Page Drawer:** Add, duplicate, delete, and switch pages with live thumbnail previews.
- **Offline-First Persistence:** Dual IndexedDB + LocalStorage sync.
- **Export Formats:** High-resolution PNG, vector SVG, and serialized JSON project backup.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Icons & UI:** Lucide React, KaTeX (LaTeX math rendering), HTML5 Canvas 2D API
- **State & Storage:** Zustand, IndexedDB (`idb`), LocalStorage
- **Document & Audio:** PDF.js, Web Speech API (Synthesis)
- **Testing:** Vitest + React Testing Library (100% test pass rate)

---

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Running Unit Tests
```bash
npm test
```

### Production Build
```bash
npm run build
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `V` | Select & Pan tool |
| `P` | Ink Pen |
| `H` | Highlighter |
| `E` | Eraser |
| `L` | Living Ink Particle Brush |
| `M` | CalcInk Living Math Bar |
| `Space` + Drag | Smooth canvas pan |
| `Ctrl + Mouse Wheel` | Origin-centric zoom (10% - 500%) |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| `Esc` | Dismiss modals / drawer |
