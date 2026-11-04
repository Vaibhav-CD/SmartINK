"""SmartINK 60s silent tour video (code-rendered, cv2 only)."""
import cv2
import numpy as np
import os

W, H, FPS = 1280, 720, 30
DUR = 60
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "smartink_muse_tour.mp4")

BG = (18, 24, 38)      # dark navy (BGR)
ACCENT = (0, 200, 255)  # warm yellow/cyan
WHITE = (255, 255, 255)
MUTED = (160, 175, 195)
GREEN = (110, 220, 130)

def base_frame():
    img = np.zeros((H, W, 3), dtype=np.uint8)
    img[:] = BG
    # subtle grid
    for x in range(0, W, 80):
        cv2.line(img, (x, 0), (x, H), (26, 32, 48), 1)
    for y in range(0, H, 80):
        cv2.line(img, (0, y), (W, y), (26, 32, 48), 1)
    return img

def text(img, s, org, scale=1.0, color=WHITE, thick=2):
    cv2.putText(img, s, org, cv2.FONT_HERSHEY_SIMPLEX, scale, (0, 0, 0), thick + 2, cv2.LINE_AA)
    cv2.putText(img, s, org, cv2.FONT_HERSHEY_SIMPLEX, scale, color, thick, cv2.LINE_AA)

def progress(img, t):
    p = t / DUR
    cv2.rectangle(img, (60, 30), (W - 60, 38), (40, 48, 64), -1)
    cv2.rectangle(img, (60, 30), (int(60 + (W - 120) * p), 38), ACCENT, -1)

def caption_bar(img, s):
    cv2.rectangle(img, (0, H - 90), (W, H), (10, 14, 24), -1)
    text(img, s, (60, H - 38), 0.85, MUTED, 2)

SCENES = [
    dict(title="SmartINK", sub="Multimodal notebook x Meta Muse models",
         lines=["Infinite canvas + living math + copilot", "Silent tour - 60 seconds - captions only"], kind="title"),
    dict(title="1. Write math, get answers", sub="CalcInk - on-device",
         lines=["Handwrite:  18 + 4 x 3 =", "Capsule:  = 30", "Steps: 4x3=12 -> 18+12=30"], kind="math"),
    dict(title="2. Algebra with working", sub="Steps shown, not just answers",
         lines=["Handwrite:  2x + 4 = 10", "Capsule:  x = 3", "Steps: 2x=6 -> x=3"], kind="math"),
    dict(title="3. Functions become plots", sub="Plotter - x^2 + sin(x)",
         lines=["Write x-squared, tap Plot Curve", "Quick-add sin(x) - one frame"], kind="plot"),
    dict(title="4. Muse models only", sub="One key, one model per job",
         lines=["Spark=copilot  Wonder=proofs  Image=visuals", "Voice=transcribe  SAM 3.1=lasso masks", "Remote AI = api.meta.ai - nothing else"], kind="models"),
    dict(title="5. Tested & green", sub="336 tests passed - tsc clean",
         lines=["vitest: 32 files / 336 tests passed", "Muse-only sanitize test included", "Thanks for watching SmartINK"], kind="outro"),
]

def draw_plot(img, t):
    import math
    # Axes box on the right, clear of the left bullet text.
    x0, x1, y0, y1 = 620, 1180, 340, 600
    ox, oy = 900, 500
    cv2.line(img, (x0, oy), (x1, oy), (90, 100, 120), 2)
    cv2.line(img, (ox, y0), (ox, y1), (90, 100, 120), 2)
    pts1, pts2 = [], []
    for i in range(100):
        x = -2.0 + 4.0 * i / 99
        px = int(ox + x * 130)
        pts1.append((px, int(oy - (x * x) * 38)))
        pts2.append((px, int(oy - math.sin(x * 2) * 80)))
    for pts, color in ((pts1, ACCENT), (pts2, GREEN)):
        for a, b in zip(pts, pts[1:]):
            if x0 <= a[0] <= x1 and y0 <= a[1] <= y1 and x0 <= b[0] <= x1 and y0 <= b[1] <= y1:
                cv2.line(img, a, b, color, 3)
    text(img, "x^2", (640, 372), 0.8, ACCENT, 2)
    text(img, "sin(x)", (640, 408), 0.8, GREEN, 2)

def draw_math(img, scene, t):
    y = 330
    for line in scene["lines"]:
        text(img, line, (140, y), 1.1, WHITE, 2)
        y += 70
    # answer capsule
    cv2.rectangle(img, (880, 300), (1140, 380), (30, 60, 50), -1)
    cv2.rectangle(img, (880, 300), (1140, 380), GREEN, 2)
    cap = scene["lines"][1]
    text(img, cap, (905, 352), 0.9, GREEN, 2)

def draw_models(img, t):
    y = 300
    for line in SCENES[4]["lines"]:
        text(img, line, (120, y), 1.0, WHITE, 2)
        y += 62
    badges = ["SPARK", "WONDER", "IMAGE", "VOICE", "SAM 3.1"]
    x = 120
    for b in badges:
        (tw, _), _ = cv2.getTextSize(b, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
        cv2.rectangle(img, (x - 12, 500), (x + tw + 12, 544), (30, 50, 70), -1)
        cv2.rectangle(img, (x - 12, 500), (x + tw + 12, 544), ACCENT, 2)
        text(img, b, (x, 530), 0.7, ACCENT, 2)
        x += tw + 48

def render(t):
    idx = min(int(t / 10), 5)
    sc = SCENES[idx]
    img = base_frame()
    progress(img, t)
    text(img, sc["title"], (60, 120), 1.4, WHITE, 3)
    text(img, sc["sub"], (60, 170), 0.9, ACCENT, 2)
    k = sc["kind"]
    if k == "title":
        text(img, "SMARTINK", (140, 380), 3.0, WHITE, 4)
        y = 470
        for line in sc["lines"]:
            text(img, line, (140, y), 1.0, MUTED, 2)
            y += 55
    elif k == "plot":
        y = 240
        for line in sc["lines"]:
            text(img, line, (120, y), 0.9, MUTED, 2)
            y += 44
        draw_plot(img, t)
    elif k == "models":
        draw_models(img, t)
    elif k == "outro":
        y = 300
        for line in sc["lines"]:
            text(img, line, (120, y), 1.1, WHITE, 2)
            y += 70
    else:
        draw_math(img, sc, t)
    caption_bar(img, f"Scene {idx + 1}/6 - {sc['title']}  |  {int(t):02d}s / 60s")
    return img

def main():
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    vw = cv2.VideoWriter(OUT, fourcc, FPS, (W, H))
    if not vw.isOpened():
        raise SystemExit("VideoWriter failed to open")
    for f in range(DUR * FPS):
        vw.write(render(f / FPS))
    vw.release()
    print("wrote", OUT)

if __name__ == "__main__":
    main()
