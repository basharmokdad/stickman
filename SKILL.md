---
name: stickman
description: Turn one idea into a finished wordless stick-figure short (black silhouettes, misty fog, one colour accent, 12-16 s, vertical 1080x1920 mp4 with sound) - the viral "stickman" style. Use when the user says "stickman video", "stick figure video", "make one of those fog stick figure videos", or gives an idea, lesson or metaphor for a wordless viral short (e.g. "the crowd laughs at him, then...", "perfectionist vs action taker", "everything they threw at him became a step").
---

# Stickman

One idea in, one finished `final.mp4` out. Every video is a short story file on top of a small engine
(`engine/stickman.js`): fog sky, mountains, silhouettes, a stick-figure rig with motions, props, camera. The film is
drawn from `t` alone, so it renders frame-exact and every fix re-renders in a couple of minutes.

Requirements: Python 3.9+, `pip install playwright numpy`, `playwright install chromium`, FFmpeg on PATH.

## Workflow

1. **One-sentence metaphor.** Turn the idea into a single feeling with a turn: "the thing they laughed at ends up
   sheltering them", "everything they threw at him became a step". If it needs two sentences, pick one.
2. **5-7 beats, no words.** Write the beats as shots. Rules that make these travel:
   - Beat 1 sets the situation in under 2 s (who is the odd one out).
   - A doubt beat: the crowd laughs / points / ignores.
   - A time beat: the same action repeated with labels `DAY 1 / DAY 40 / DAY 200` (labels are the only text).
   - The turn: weather, a wave, a fall - something the crowd did not prepare for.
   - The payoff, shown not told, carried by the ONE colour accent (red fruit, red board, gold trophy, red balloon).
   - A loop ending: the last shot mirrors the first framing so the replay is seamless.
3. **Write `story.js`** in a new folder (copy the closest example). Durations: 12-16 s, 6-7 hard cuts, the time-lapse
   shot can hold 4-5 s. Each shot gets a slow push-in.
4. **Check stills first** (seconds, not minutes):
   `python <skill>/render.py story.js out --stills 1,3,5,8,11,14` then look at `out/stills/*.png`.
5. **Render + sound:** `python <skill>/render.py story.js out --sheet` then `python <skill>/mix.py out`.
6. **Look at `out/contact_sheet.jpg`** and fix what reads wrong: overlapping figures, a prop floating, a pose that
   reads as the wrong emotion, the accent not obvious, text too small. Two fix passes are normal.

`<skill>` is this folder (e.g. `~/.claude/skills/stickman`). Deliver `out/final.mp4` + the contact sheet.

## Story file

```js
SM.story({
  title: 'The Wave', duration: 15, seed: 4,
  shots: [[t0, t1, [cx, cy, zoom], [cx, cy, zoom]], ...],   // world is 1080x1920; zoom 2 = close-up
  env: t => ({ palette: 'day', storm: 0..1, horizon: 1170, flat: true }),   // palettes: day storm dusk night
  shakes: [{ at, dur, amp }], flashes: [{ at, amp, w }],
  music: { mood: 'hopeful' | 'calm' | 'sad' | 'tense', gain: -5 },
  sounds: [{ at, type, gain, dur, pitch }],   // thud tap clack pop chime splash wave thunder rain crowd whoosh
  setup(S) { /* build trees, crowds once: this.tree = S.tree(...) */ },
  draw(t, S) { /* world drawing, back to front */ },
});
```

## Engine cheat sheet (`S` = `SM`)

Timing: `S.seg(t,a,b)` 0..1, `S.es(t,a,b,ease)`, `S.keys(t,[[t,v],...])`, `S.window(t,a,b,edge)` 0->1->0,
`S.settle(t,t0,amp)` damped wobble, eases `S.ease S.easeIn S.easeOut S.back` (overshoot).

Figures: `S.fig({ x, y, h, f, pose, build, snap })` - `y` is the ground (the lowest body point snaps to it), `f` 1 faces
right / -1 left, `h` ~270 for an adult. Returns `{ hands: {L, R}, head, R }` to attach props.
`build: { thick, head, legs, torso, acc: 'cap'|'tuft'|'bun'|'pony' }`. `S.crowd(n, x0, x1, seed, {h})` gives varied
silhouettes (never draw a crowd of clones).

Motions (`S.M.*`, each returns a pose; phases are in cycles, progress is 0..1):
`stand(t) walk(ph) run(ph) kneel(k) crouch(k) sit(k) sitGround(k) point(k, base) wave(ph, k, base) cheer(ph) laugh(ph)
mock(ph) throw(p) carry(ph) push(k) fall(p, dir) lying() climb(ph) paddle(ph) balance(k, wobble) lookUp(k, base) slump(k)`.
Combine with `S.blend(a, b, k)` and `S.add(pose, {lean: 0.1})`. Pose fields: `lean tilt hl kl hr kr sl el sr er rot air
eyes('dot'|'laugh'|'wide'|'closed'|'sad') look('up'|'down')`. Arms lag the legs and one-shot moves overshoot and
settle - layer `S.settle` on landings and catches.

World: `S.cliff(edgeX, topY, 'left'|'right')`, `S.ground(y)`, `S.block(x,y,w,h)`,
`S.sea(t, { y, chop, waves: [{ x, h, w, lean, curl, dir }], color, alpha, foam })` returns `surface(x)`,
`S.splash(x, y, p, size)`.
Props: `S.brick`, `S.tower(x, y, bricksPlaced, {cols})` (each brick drops, lands, squashes - put bricks on beats),
`S.tree(x, y, {len, angle, ceiling, seed})` -> `.draw(growth)`, `.cover(growth)(x)`, `S.ladder`, `S.door(x,y,w,h,open)`,
`S.trophy`, `S.balloon`, `S.ball`, `S.board(x, y, len, angle, color)`, `S.rain(t, amount, floorFn)`,
`S.lightning(x, y0, y1, a)`, `S.label('DAY 40', x, y, alpha, size)`. Accent colour: `S.ACCENT` (red). Raw canvas: `S.g`.

## What makes the style work

- One idea you feel before you can read anything. No voice, so it works in every language.
- Pure black figures on a mid-grey fog; ground and rock are charcoal so the figures stay the darkest thing.
- Faces are two white dots: look up / down, become arcs to laugh. Poses do the acting - exaggerate them.
- One colour in the whole film, on the payoff object.
- Rhythm: repeated actions land on a steady beat (bricks, pours, attempts), each a little better than the last.
- Sound is sparse and tactile (taps, splashes, a rumble), under a quiet pad. No stock whooshes.

## Examples

- `examples/the-seed/story.js` - mocked planter, a storm, the tree shelters them (cliffs, tree, rain, labels).
- `examples/the-wave/story.js` - waiting for the perfect wave vs practising on bad ones (sea, waves, boards, falls).
- `examples/poses/story.js` - every motion in a grid; open `player.html?story=examples/poses/story.js`.

Open `player.html?story=<path>` in a browser to preview any story live on a loop.
