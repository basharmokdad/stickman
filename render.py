"""Render a story to video by seeking renderAt(t) frame by frame (1080x1920, 30 fps).

usage:
  python render.py <story.js> <out_dir>                      -> out_dir/video.mp4 + meta.json (sounds for mix.py)
  python render.py <story.js> <out_dir> --stills 0.5,4,9.2   -> out_dir/stills/*.png only (fast checks)
  python render.py <story.js> <out_dir> --sheet              -> also out_dir/contact_sheet.jpg (one frame per second)
Needs: pip install playwright && playwright install chromium; FFmpeg on PATH."""
import base64
import json
import os
import pathlib
import subprocess
import sys

from playwright.sync_api import sync_playwright

KIT = pathlib.Path(__file__).resolve().parent
FPS = 30
story, out = pathlib.Path(sys.argv[1]).resolve(), pathlib.Path(sys.argv[2]).resolve()
out.mkdir(parents=True, exist_ok=True)
stills = sys.argv[sys.argv.index("--stills") + 1].split(",") if "--stills" in sys.argv else None

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1080, "height": 1920})
    pg.add_init_script("window.__capture = true")
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto((KIT / "player.html").as_uri() + "?story=" + story.as_uri())
    try:
        pg.wait_for_function("() => typeof window.renderAt === 'function'", timeout=15000)
    except Exception:
        raise SystemExit("story did not load: " + "; ".join(errors or ["check the path / syntax"]))
    grab = "t => { renderAt(t); return document.getElementById('c').toDataURL('image/png'); }"
    if stills:
        (out / "stills").mkdir(exist_ok=True)
        for s in stills:
            (out / "stills" / f"t{float(s):05.2f}.png").write_bytes(base64.b64decode(pg.evaluate(grab, float(s)).split(",")[1]))
        if errors:
            print("JS errors:", errors)
        sys.exit()
    meta = pg.evaluate("window.META")
    (out / "meta.json").write_text(json.dumps(meta, indent=1))
    n = round(meta["duration"] * FPS)
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", str(out / "video.mp4")],
                          stdin=subprocess.PIPE)
    for i in range(n):
        ff.stdin.write(base64.b64decode(pg.evaluate(grab, i / FPS).split(",")[1]))
        if i % 60 == 0:
            print(f"\rframe {i}/{n}", end="", flush=True)
    ff.stdin.close()
    ff.wait()
    if errors:
        print("\nJS errors:", errors)
    print(f"\n{out / 'video.mp4'} ({n} frames)")

if "--sheet" in sys.argv:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(out / "video.mp4"), "-vf", "fps=1,scale=216:-1,tile=8x2",
                    "-frames:v", "1", str(out / "contact_sheet.jpg")], check=True)
    print(out / "contact_sheet.jpg")
