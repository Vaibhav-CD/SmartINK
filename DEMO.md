# SmartINK — Submission Demo Run Sheet

Every beat below was rehearsed live in Chrome (real pen strokes via mouse,
real buttons) and is locked by `src/services/calcInk/__tests__/demoCorpus.test.ts`.
Show only these beats, in this order. Write **large**, complete the loop when
writing `0`, and draw `×` as two crossing strokes.

## Pre-flight (2 minutes before)

1. `npm run dev -- --port 5174 --host 127.0.0.1`, open `http://127.0.0.1:5174/`.
2. Click **Launch Canvas Sheets**, select the **Ink** (pen) tool.
3. Use a fresh, empty page. Keep each equation on its own line, well spaced.
4. No network or API key is needed for any beat below — all on-device.

## The script

| # | Say / do | Write or click | You must see |
|---|---|---|---|
| 1 | "Write math, get the answer instantly — with working shown." | Handwrite `18 + 4×3 =` | Capsule `= 30`. Tap **Steps**: `4 × 3 = 12`, `18 + 12 = 30` |
| 2 | "It solves algebra, not just arithmetic." | Handwrite `2x + 4 = 10` on a fresh line | Capsule `x = 3`. Tap **Steps**: `2x+4 = 10` → `2x = 6` → `x = 3` |
| 3 | "Functions become live plots." | Handwrite `x` with a small raised `2` (`x²`), tap **Plot Curve** | Plotter opens with the `x^2` parabola |
| 4 | "Compare curves in one frame." | In the plotter, tap the **sin(x)** quick-add chip | `x^2` and `sin(x)` drawn together in one frame |
| 5 | "Misread something? Correct it, don't rewrite it." (only if needed, or as a deliberate beat) | Switch to the select tool, drag a box around beat 2's ink, type `3x-9=0` in the formula field, tap **Solve** | Badge shows `x = 3` for the edited equation |

Beat 5 is also the recovery move for any misread during beats 1–4: select the
ink, fix the text, Solve — or simply erase and rewrite larger.

## Do not demo live

- Handwritten `sin(x)` / `y = …` letter-by-letter: the recognizer's reliable
  vocabulary is digits, `+ − × / = ( )`, `x`, and raised superscripts. Get
  functions on screen via beat 3 + the plotter's typed curve field instead.
- Typed variable chains (`r = 6`, `V = pi·r²·h`): the engine handles them
  (locked in tests), but there is no reliable ink path for the letters today.
- Voice, AI copilot, PDF and physics widgets: not part of this script.

## If something goes wrong

- "Unrecognized glyph" capsule: it never guesses a wrong answer. Rewrite that
  one character larger, or use beat 5.
- Wrong digit: same recovery — select, edit, Solve.
- Anything else: switch to a pre-solved backup page and keep talking; beats 1–4
  can also be re-run from the top in under a minute.
