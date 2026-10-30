# stickman

A free Claude skill that turns one idea into a finished wordless stick-figure short: black silhouettes, misty fog,
one colour accent, 12-16 seconds, vertical 1080x1920 mp4 with sound. No animator, no After Effects, no paid tools.

```
"everyone waits on the shore for the perfect wave; one guy paddles out into small ugly waves every day;
 by the time the big wave comes he is the only one who can ride it"
```
-> Claude writes a short story file, renders it, adds sound, checks the frames, and hands you `final.mp4`.

## Install

1. Copy this folder to your skills folder:
   - Claude Code: `~/.claude/skills/stickman` (Windows: `C:\Users\<you>\.claude\skills\stickman`)
2. Install the requirements once:
   ```
   pip install playwright numpy
   playwright install chromium
   ```
   and make sure FFmpeg is on your PATH (`ffmpeg -version`).
3. In Claude, say: **"make a stickman video: <your idea>"**.

## Run it by hand

```
python render.py examples/the-wave/story.js out --sheet   # video + contact sheet
python mix.py out                                         # sound + master -> out/final.mp4
```

Preview any story live: open `player.html?story=examples/the-seed/story.js` in a browser.

## Your own sounds

`mix.py` synthesizes a quiet pad and soft hits for free. To use your own, put `music.mp3` and files named after the
sound types (`splash.wav`, `thud.mp3`, ...) in a folder and run `python mix.py out --audio <folder>`.

## Files

- `SKILL.md` - the workflow and the engine cheat sheet Claude follows
- `engine/stickman.js` - fog sky, rig + motions, crowd, props, sea, weather, camera
- `player.html`, `render.py`, `mix.py`
- `examples/` - The Seed, The Wave, and a pose sheet

MIT licensed.
