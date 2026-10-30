/* stickman.js - a tiny engine for wordless stick-figure shorts (fog, silhouettes, one colour accent).
   MIT License. One canvas 1080x1920; every frame is drawn from t alone, so any moment can be rendered.

   A story file calls SM.story({...}) - see examples/ and SKILL.md. The engine draws the fog sky, applies the
   camera (hard cuts + slow push-ins + shake), calls story.draw(t, S) for the world, then flashes, vignette, grain.
*/
(function () {
  const W = 1080, H = 1920;
  const S = { W, H, INK: '#060607', ACCENT: '#c4302b', ROCK: '#16181c', SAND: '#1d1f23' };
  let g = null, STORY = null;
  Object.defineProperty(S, 'g', { get: () => g });

  // ------------------------------------------------------------------ math + timing
  S.rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  S.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  S.lerp = (a, b, t) => a + (b - a) * t;
  S.ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;          // in-out
  S.easeIn = t => t * t * t;
  S.easeOut = t => 1 - Math.pow(1 - t, 3);
  S.back = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };   // overshoot then settle
  S.seg = (t, a, b) => S.clamp((t - a) / (b - a));
  S.es = (t, a, b, fn = S.ease) => fn(S.seg(t, a, b));
  // [[time, value], ...] eased between keys
  S.keys = (t, ks, fn = S.ease) => {
    if (t <= ks[0][0]) return ks[0][1];
    for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) return S.lerp(ks[i - 1][1], ks[i][1], S.es(t, ks[i - 1][0], ks[i][0], fn));
    return ks[ks.length - 1][1];
  };
  // 0 -> 1 -> 0 window with soft edges
  S.window = (t, a, b, edge = 0.15) => S.es(t, a, a + edge) * (1 - S.es(t, b - edge, b));
  // damped wobble after t0 (landings, catches, a head snapping round): 0 before t0
  S.settle = (t, t0, amp = 1, freq = 11, decay = 6) => t < t0 ? 0 : amp * Math.exp(-(t - t0) * decay) * Math.sin((t - t0) * freq);
  S.mixc = (c1, c2, t) => c1.map((v, i) => Math.round(S.lerp(v, c2[i], t)));
  S.rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  // ------------------------------------------------------------------ poses + motions
  // Joint angles (radians). Limbs: 0 = hanging straight down, + = forward (the way the figure faces).
  // Torso lean: 0 = upright, + = forward. Knees bend backward (+). rot = whole-body rotation (+ = falls forward).
  // air = height off the ground in figure heights. eyes: dot | laugh | wide | closed | sad. look: up | down | ''.
  const DEF = { lean: 0, tilt: 0, hl: 0.06, kl: 0.06, hr: -0.06, kr: 0.06, sl: 0.12, el: 0.15, sr: -0.08, er: 0.15,
    rot: 0, air: 0, eyes: 'dot', look: '' };
  S.DEF = DEF;
  S.pose = (o = {}) => Object.assign({}, DEF, o);
  S.blend = (a, b, k) => { const o = {}; for (const key in DEF) {
    const x = a[key] ?? DEF[key], y = b[key] ?? DEF[key];
    o[key] = typeof x === 'number' ? S.lerp(x, y, k) : (k < 0.5 ? x : y); } return o; };
  S.add = (a, d) => { const o = Object.assign({}, a); for (const k in d) o[k] = typeof d[k] === 'number' ? (o[k] ?? 0) + d[k] : d[k]; return o; };
  const TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos, pos = x => Math.max(0, x);

  // Every motion takes a phase (cycles: 1 = one full step pair) or a progress 0..1 and returns a pose.
  // Arms lag the legs a touch (overlap), and one-shot moves anticipate, overshoot and settle (follow-through).
  S.M = {
    stand: (t = 0) => S.pose({ lean: 0.012 * sin(t * 2.1), tilt: 0.02 * sin(t * 1.3) }),
    walk: (ph, k = 1) => { const w = ph * TAU, a = (ph - 0.07) * TAU;
      return S.pose({ lean: 0.07 * k, tilt: -0.03 * k, hl: 0.44 * k * sin(w), hr: -0.44 * k * sin(w),
        kl: 0.08 + 0.75 * k * pos(cos(w)), kr: 0.08 + 0.75 * k * pos(-cos(w)),
        sl: -0.38 * k * sin(a), sr: 0.38 * k * sin(a), el: 0.25 + 0.2 * k * pos(-sin(a)), er: 0.25 + 0.2 * k * pos(sin(a)) }); },
    run: (ph, k = 1) => { const w = ph * TAU, a = (ph - 0.06) * TAU;
      const sw = x => x > 0 ? 0.85 * x : 0.5 * x;   // the back leg swings less than the front
      return S.pose({ lean: 0.3 * k, tilt: -0.12 * k, hl: k * sw(sin(w)), hr: k * sw(-sin(w)),
        kl: 0.25 + 1.35 * k * pos(cos(w)), kr: 0.25 + 1.35 * k * pos(-cos(w)),
        sl: -0.85 * k * sin(a), sr: 0.85 * k * sin(a), el: 1.5, er: 1.5, air: 0.035 * k * pos(sin(2 * w)) }); },
    kneel: (k = 1) => S.blend(DEF, { lean: 0.35, tilt: 0.12, hl: 1.45, kl: 1.5, hr: -0.04, kr: 1.72, sl: 0.5, el: 0.3, sr: 0.2, er: 0.3 }, k),
    crouch: (k = 1) => S.blend(DEF, { lean: 0.55, tilt: -0.2, hl: 1.0, kl: 1.75, hr: 0.85, kr: 1.6, sl: 0.6, el: 0.5, sr: 0.45, er: 0.5 }, k),
    sit: (k = 1) => S.blend(DEF, { lean: 0.05, hl: 1.5, kl: 1.45, hr: 1.4, kr: 1.4, sl: 0.4, el: 0.6, sr: 0.3, er: 0.6 }, k),
    point: (k = 1, base = DEF) => S.blend(base, S.add(base, { sr: 1.55 - (base.sr ?? 0), er: -(base.er ?? 0) + 0.02, lean: 0.06 }), k),
    wave: (ph, k = 1, base = DEF) => S.blend(base, Object.assign({}, base, { sr: 2.75 + 0.28 * sin(ph * TAU), er: 0.35 + 0.25 * sin(ph * TAU - 0.6) }), k),
    cheer: (ph, k = 1) => S.blend(DEF, { lean: -0.06, tilt: -0.25, sl: 2.8 + 0.1 * sin(ph * TAU), sr: 2.85 - 0.1 * sin(ph * TAU),
      el: 0.25, er: 0.25, air: 0.05 * pos(sin(ph * TAU)), eyes: 'laugh' }, k),
    laugh: (ph, k = 1) => S.blend(DEF, { lean: -0.16 + 0.07 * sin(ph * TAU * 2), tilt: -0.3, sl: 0.45, el: 1.9, sr: 0.35, er: 1.95,
      kl: 0.12, kr: 0.12, air: 0.012 * pos(sin(ph * TAU * 2)), eyes: 'laugh' }, k),
    // a pointing, doubled-over laugh (mocking)
    mock: (ph, k = 1) => S.blend(DEF, { lean: 0.25 + 0.08 * sin(ph * TAU * 2), tilt: -0.45, sl: 0.35, el: 1.7, sr: 1.5, er: 0.05,
      kl: 0.2, kr: 0.12, eyes: 'laugh' }, k),
    // throw: 0-0.42 wind-up (lean back, arm up behind), 0.42-0.55 release, then follow-through + settle. S.M.RELEASE = 0.5
    throw: (p) => {
      const wind = S.es(p, 0, 0.42), rel = S.es(p, 0.42, 0.55, S.easeOut), fol = S.es(p, 0.55, 1);
      const sr = S.lerp(S.lerp(-0.08, -2.5, wind), 1.35, rel) - 0.6 * fol;
      return S.pose({ lean: -0.18 * wind + 0.55 * rel - 0.38 * fol, tilt: 0.1 * rel, sr, er: S.lerp(0.9 * wind, 0.05, rel),
        sl: 0.7 * wind - 0.4 * rel, el: 0.6, hl: 0.25 * rel - 0.15 * wind, kl: 0.3, hr: -0.35 * rel + 0.1 * wind, kr: 0.25 }); },
    // hold something at the chest while walking (ph) - hands meet in front
    carry: (ph, k = 1) => S.add(S.M.walk(ph, 0.7 * k), { sl: 0.95 - S.M.walk(ph, 0.7 * k).sl, el: 1.15 - S.M.walk(ph, 0.7 * k).el,
      sr: 0.95 - S.M.walk(ph, 0.7 * k).sr, er: 1.15 - S.M.walk(ph, 0.7 * k).er, lean: -0.04 }),
    push: (k = 1) => S.blend(DEF, { lean: 0.42, sl: 1.45, el: 0.1, sr: 1.5, er: 0.1, hl: 0.4, kl: 0.5, hr: -0.5, kr: 0.1 }, k),
    // fall backwards (p 0..1): gravity ease-in, arms fly up, a small bounce at the end. dir -1 = forwards
    fall: (p, dir = 1) => { const f = S.easeIn(S.clamp(p * 1.15)), b = S.settle(p, 0.87, 0.06, 30, 9);
      return S.pose({ rot: dir * (-1.5 * f + b), sl: 2.2 * S.es(p, 0, 0.4), sr: 2.6 * S.es(p, 0, 0.35), el: 0.4, er: 0.3,
        hl: 0.5 * f, kl: 0.3, hr: 0.25 * f, kr: 0.5 * f, eyes: p > 0.2 ? 'wide' : 'dot', tilt: 0.2 * f }); },
    // sitting on the ground, legs out front, leaning back on the hands
    sitGround: (k = 1) => S.blend(DEF, { lean: -0.2, hl: 1.5, kl: 0.25, hr: 1.4, kr: 0.45, sl: -0.75, el: 0.1, sr: -0.65, er: 0.1 }, k),
    lying: (ph = 0) => S.pose({ rot: -1.52, sl: 0.3, sr: 0.2, hl: 0.15, kl: 0.25, hr: 0.05, kr: 0.1, eyes: 'closed' }),
    climb: (ph) => { const w = ph * TAU;
      return S.pose({ lean: 0.05, sl: 2.85 + 0.3 * sin(w), sr: 2.85 - 0.3 * sin(w), el: 0.25 + 0.5 * pos(-sin(w)), er: 0.25 + 0.5 * pos(sin(w)),
        hl: 0.15 + 0.85 * pos(sin(w)), kl: 0.15 + 1.4 * pos(sin(w)), hr: 0.15 + 0.85 * pos(-sin(w)), kr: 0.15 + 1.4 * pos(-sin(w)), look: 'up' }); },
    // lying on a board face down, arms circling (ph cycles)
    paddle: (ph) => { const w = ph * TAU;
      return S.pose({ rot: 1.5, lean: 0, tilt: -0.55, sl: Math.PI + 1.6 * sin(w), el: 0.2, sr: Math.PI - 1.6 * sin(w), er: 0.2,
        hl: -0.05, kl: 0.25, hr: 0.02, kr: 0.12 }); },
    // side-on board stance, arms out for balance (k 0..1), wob = a little wobble
    balance: (k = 1, wob = 0) => S.blend(DEF, { lean: 0.28 + wob * 0.12, tilt: -0.25, hl: 0.75, kl: 1.15, hr: -0.55, kr: 0.75,
      sl: 1.65 + wob * 0.4, el: 0.12, sr: -1.45 + wob * 0.4, er: -0.1 }, k),
    lookUp: (k = 1, base = DEF) => S.blend(base, Object.assign({}, base, { tilt: -0.45, lean: (base.lean ?? 0) - 0.06, look: 'up' }), k),
    slump: (k = 1) => S.blend(DEF, { lean: 0.35, tilt: 0.45, sl: 0.05, el: 0.05, sr: -0.02, er: 0.05, look: 'down', eyes: 'sad' }, k),
  };
  S.M.RELEASE = 0.5;

  // ------------------------------------------------------------------ the figure
  // o: { x, y (ground or hip if snap:false), h, f (1 right / -1 left), pose, build:{thick, head, legs, torso, acc},
  //      color, snap, carry:{w,h} } -> returns { hands:{L,R}, head, R, p:{all joints}, top }
  S.fig = o => {
    const h = o.h || 270, f = o.f || 1, b = o.build || {}, P = Object.assign({}, DEF, o.pose || {});
    const L1 = .24 * h * (b.legs || 1), L2 = .23 * h * (b.legs || 1), T = .33 * h, U = .18 * h, F = .17 * h, R = .085 * h * (b.head || 1);
    const dn = a => [f * sin(a), cos(a)], up = a => [f * sin(a), -cos(a)];
    const ad = (p, v, l) => [p[0] + v[0] * l, p[1] + v[1] * l];
    const hip = [0, 0];
    const kL = ad(hip, dn(P.hl), L1), fL = ad(kL, dn(P.hl - P.kl), L2);
    const kR = ad(hip, dn(P.hr), L1), fR = ad(kR, dn(P.hr - P.kr), L2);
    const neck = ad(hip, up(P.lean), T), sh = ad(hip, up(P.lean), T * 0.9);
    const head = ad(neck, up(P.lean + P.tilt), R * 1.15);
    const eL = ad(sh, dn(P.sl + P.lean), U), hL = ad(eL, dn(P.sl + P.lean + P.el), F);
    const eR = ad(sh, dn(P.sr + P.lean), U), hR = ad(eR, dn(P.sr + P.lean + P.er), F);
    const p = { hip, kL, fL, kR, fR, neck, sh, head, eL, hL, eR, hR };
    if (P.rot) { const c = cos(P.rot * f), s = sin(P.rot * f);
      for (const k in p) { const [x, y] = p[k]; p[k] = [x * c - y * s, x * s + y * c]; } }
    const lw = .058 * h * (b.thick || 1);
    let off = 0;
    if (o.snap !== false) {               // the lowest point touches the ground
      let m = -1e9;
      for (const k of ['fL', 'fR', 'kL', 'kR', 'hL', 'hR', 'hip', 'sh']) m = Math.max(m, p[k][1]);
      m = Math.max(m, p.head[1] + R);
      off = -m - lw / 2;
    }
    const X = o.x, Y = o.y + off - P.air * h;
    for (const k in p) p[k] = [p[k][0] + X, p[k][1] + Y];
    if (o.draw === false) return { hands: { L: p.hL, R: p.hR }, head: p.head, R, p, h };
    g.save();
    g.strokeStyle = g.fillStyle = o.color || S.INK; g.lineCap = 'round'; g.lineJoin = 'round';
    if (o.alpha !== undefined) g.globalAlpha = o.alpha;
    const ln = (pts, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]); g.stroke(); };
    ln([p.hip, p.kL, p.fL], lw); ln([p.hip, p.kR, p.fR], lw);
    ln([p.hip, p.neck], lw * 1.35 * (b.torso || 1));
    if ((b.torso || 1) > 1.25) { g.lineWidth = lw * 1.35 * b.torso * 1.12;         // a heavier middle
      const m = [S.lerp(p.hip[0], p.neck[0], 0.4), S.lerp(p.hip[1], p.neck[1], 0.4)]; g.beginPath(); g.moveTo(...p.hip); g.lineTo(...m); g.stroke(); }
    ln([p.sh, p.eL, p.hL], lw * 0.9); ln([p.sh, p.eR, p.hR], lw * 0.9);
    // head + face in the head's own frame (forward = +x)
    g.translate(...p.head); g.rotate(f * (P.lean + P.tilt) + f * P.rot); g.scale(f, 1);
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    if (b.acc === 'cap') { g.beginPath(); g.arc(0, -R * 0.15, R * 1.06, Math.PI * 1.02, Math.PI * 1.98); g.fill(); g.fillRect(0, -R * 0.42, R * 1.75, R * 0.26); }
    if (b.acc === 'tuft') { g.lineWidth = R * 0.28; for (const a of [-0.5, 0, 0.45]) { g.beginPath(); g.moveTo(sin(a) * R * 0.8, -cos(a) * R * 0.8);
      g.lineTo(sin(a) * R * 1.45, -cos(a) * R * 1.45); g.stroke(); } }
    if (b.acc === 'bun') { g.beginPath(); g.arc(-R * 0.55, -R * 0.85, R * 0.45, 0, TAU); g.fill(); }
    if (b.acc === 'pony') { g.lineWidth = R * 0.4; g.beginPath(); g.moveTo(-R * 0.7, -R * 0.4); g.quadraticCurveTo(-R * 1.6, -R * 0.1, -R * 1.4, R * 0.9); g.stroke(); }
    const ey = -R * 0.08 + (P.look === 'up' ? -R * 0.32 : P.look === 'down' ? R * 0.3 : 0);
    g.fillStyle = g.strokeStyle = o.eyeColor || '#f2f2f0';
    for (const dx of [0.06, 0.44]) {
      const ex = dx * R;
      if (P.eyes === 'laugh') { g.lineWidth = R * 0.13; g.beginPath(); g.arc(ex, ey + R * 0.06, R * 0.12, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else if (P.eyes === 'closed') { g.lineWidth = R * 0.1; g.beginPath(); g.moveTo(ex - R * 0.11, ey); g.lineTo(ex + R * 0.11, ey); g.stroke(); }
      else if (P.eyes === 'sad') { g.beginPath(); g.arc(ex, ey + R * 0.08, R * 0.1, 0, TAU); g.fill(); }
      else { g.beginPath(); g.arc(ex, ey, R * (P.eyes === 'wide' ? 0.16 : 0.11), 0, TAU); g.fill(); }
    }
    g.restore();
    return { hands: { L: p.hL, R: p.hR }, head: p.head, R, p, h };
  };

  // a crowd with varied silhouettes: heights, builds, heads, hair - so they never read as clones
  S.crowd = (n, x0, x1, seed = 1, o = {}) => { const r = S.rng(seed), accs = ['', 'cap', '', 'tuft', 'bun', '', 'pony'];
    return Array.from({ length: n }, (_, i) => ({ i, x: S.lerp(x0, x1, n === 1 ? 0.5 : i / (n - 1)) + (r() - .5) * (o.jitter ?? 16),
      h: (o.h || 270) * (0.84 + r() * 0.3), ph: r(), build: { thick: 0.82 + r() * 0.5, head: 0.9 + r() * 0.26, legs: 0.92 + r() * 0.16,
        torso: 0.85 + r() * 0.65, acc: accs[Math.floor(r() * accs.length)] } })); };

  // ------------------------------------------------------------------ backdrop: fog sky, mountains, fog bands
  let MT = null;
  const PAL = { day: [[138, 148, 163], [96, 105, 120], [44, 49, 58]], storm: [[70, 76, 88], [52, 57, 67], [24, 27, 33]],
    dusk: [[150, 140, 138], [100, 98, 106], [40, 42, 50]], night: [[52, 60, 78], [32, 37, 50], [12, 14, 20]] };
  S.PAL = PAL;
  S.backdrop = (t, cam, env = {}) => {
    if (!MT) MT = [0, 1, 2].map(i => { const r = S.rng((STORY.seed || 1) * 31 + i), pts = []; let y = 0;
      for (let x = -500; x <= 1600; x += 60) { y = S.clamp(y + (r() - .5) * 90, -120, 120); pts.push([x, y]); } return pts; });
    const base = PAL[env.palette || 'day'], to = PAL[env.to || 'storm'], k = env.storm || 0;
    const top = S.mixc(base[0], to[0], k), mid = S.mixc(base[1], to[1], k), bot = S.mixc(base[2], to[2], k);
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, S.rgb(top)); gr.addColorStop(0.55, S.rgb(mid)); gr.addColorStop(1, S.rgb(bot));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (env.mountains === false) return;
    const cols = [[120, 130, 145], [104, 113, 128], [86, 94, 108]], yb = env.horizon ? [env.horizon - 100, env.horizon - 30, env.horizon + 40] : [1060, 1150, 1240];
    const par = [0.15, 0.3, 0.45];
    MT.forEach((pts, i) => {
      const ox = -(cam.cx - 540) * par[i] * cam.z * 0.5, oy = -(cam.cy - 960) * par[i] * cam.z * 0.4;
      const c = S.mixc(S.mixc(cols[i], mid, 0.25), S.mixc(cols[i], [40, 44, 52], 0.5), k);
      g.fillStyle = S.rgb(c); g.beginPath(); g.moveTo(-500 + ox, H);
      for (const [x, y] of pts) g.lineTo(x + ox, yb[i] + y * (env.flat ? 0.25 : 0.6 + i * 0.3) + oy);
      g.lineTo(1600 + ox, H); g.fill();
      const fv = g.createLinearGradient(0, yb[i] - 200 + oy, 0, yb[i] + 300 + oy);
      fv.addColorStop(0, S.rgb(mid, 0)); fv.addColorStop(1, S.rgb(mid, 0.55));
      g.fillStyle = fv; g.fillRect(0, 0, W, H);
    });
    for (let i = 0; i < 4; i++) {
      const y = 700 + i * 260 + sin(t * 0.3 + i) * 30, x = ((t * 18 * (i % 2 ? 1 : -1) + i * 300) % 1600 + 1600) % 1600 - 300;
      const fg = g.createRadialGradient(x, y, 0, x, y, 520);
      fg.addColorStop(0, 'rgba(200,208,220,0.10)'); fg.addColorStop(1, 'rgba(200,208,220,0)');
      g.fillStyle = fg; g.fillRect(0, 0, W, H);
    }
  };

  // ------------------------------------------------------------------ ground pieces (world coordinates)
  // a cliff: top y, the edge at x, side 'left' (rock to the left of the edge) or 'right'
  S.cliff = (edge, top, side = 'left', seed = 3, color = S.ROCK) => {
    const r = S.rng(seed), s = side === 'left' ? 1 : -1, far = side === 'left' ? -600 : 1700;
    g.fillStyle = color; g.beginPath(); g.moveTo(far, top); g.lineTo(edge, top);
    for (let y = top + 50; y < top + 700; y += 90 + r() * 60) g.lineTo(edge + s * (r() - 0.6) * 26, y);
    g.lineTo(edge - s * 10, 2600); g.lineTo(far, 2600); g.fill();
    g.strokeStyle = 'rgba(160,170,185,0.18)'; g.lineWidth = 3; g.beginPath(); g.moveTo(far, top + 1); g.lineTo(edge, top + 1); g.stroke();
  };
  S.ground = (y, color = S.ROCK, x0 = -600, x1 = 1700) => {
    g.fillStyle = color; g.fillRect(x0, y, x1 - x0, 2600);
    g.strokeStyle = 'rgba(160,170,185,0.16)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y + 1); g.lineTo(x1, y + 1); g.stroke();
  };
  // a platform / box (stage, rooftop, step)
  S.block = (x, y, w, h, color = S.ROCK) => { g.fillStyle = color; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(160,170,185,0.16)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x + w, y + 1); g.stroke(); };

  // ------------------------------------------------------------------ water: surface(x) with chop + travelling swells
  // o: { y: rest level, chop: px, x0, x1, waves: [{ x, h, w, curl (0..1), lean }] } -> returns surface(x)
  S.sea = (t, o) => {
    const y0 = o.y, chop = o.chop ?? 10, x0 = o.x0 ?? -600, x1 = o.x1 ?? 1700, waves = o.waves || [];
    const surf = x => { let y = y0 + chop * (0.6 * sin(x * 0.021 + t * 2.3) + 0.4 * sin(x * 0.047 - t * 3.1));
      for (const w of waves) { const d = (x - w.x) / w.w, a = d < 0 ? d * (1 - (w.lean ?? 0.5)) : d * (1 + (w.lean ?? 0.5));
        y -= w.h * Math.exp(-a * a * 2.2); } return y; };
    g.save(); g.globalAlpha = o.alpha ?? 1;
    g.beginPath(); g.moveTo(x0, 2600); let top = y0;
    for (let x = x0; x <= x1; x += 8) { const y = surf(x); top = Math.min(top, y); g.lineTo(x, y); }
    g.lineTo(x1, 2600); g.closePath();
    g.fillStyle = o.color || '#353b45'; g.fill(); g.clip();
    // sheen: tall water is lighter near its top (so a big wave reads as water, not rock), dark in the depths
    const sg = g.createLinearGradient(0, top, 0, y0 + 60); sg.addColorStop(0, 'rgba(150,160,176,0.42)'); sg.addColorStop(1, 'rgba(150,160,176,0)');
    g.fillStyle = sg; g.fillRect(x0, top - 10, x1 - x0, y0 + 80 - top);
    const dg = g.createLinearGradient(0, y0, 0, y0 + 520); dg.addColorStop(0, 'rgba(10,12,16,0)'); dg.addColorStop(1, 'rgba(10,12,16,0.65)');
    g.fillStyle = dg; g.fillRect(x0, y0 - 40, x1 - x0, 2600);
    // streaks down the face of tall waves
    g.strokeStyle = 'rgba(200,208,220,0.16)'; g.lineWidth = 3; g.beginPath();
    for (const w of waves) if (w.h > 150) for (let k = 0; k < 9; k++) { const x = w.x - w.w * (0.15 + k * 0.08); const y = surf(x);
      g.moveTo(x, y + 20); g.lineTo(x - 18, y + 20 + w.h * 0.25 * (0.5 + 0.5 * Math.sin(k * 2.1 + t))); }
    g.stroke(); g.restore();
    if (o.foam === false) return surf;
    // white water along the crest of tall waves
    g.strokeStyle = 'rgba(228,234,242,0.55)'; g.lineCap = 'round';
    for (const w of waves) if (w.h > 150) { g.lineWidth = Math.max(5, w.h * 0.022); g.beginPath(); let on = false;
      for (let x = w.x - w.w * 0.9; x <= w.x + w.w * 0.6; x += 6) { const y = surf(x), crest = y < surf(w.x) + w.h * 0.14;
        if (crest) { on ? g.lineTo(x, y + 3) : g.moveTo(x, y + 3); on = true; } else on = false; } g.stroke(); }
    // curling lips on big waves (a filled hook thrown forward from the crest)
    for (const w of waves) if ((w.curl || 0) > 0.02 && w.h > 60) {
      const dir = w.dir || -1, cx = w.x + dir * w.w * 0.12, cy = surf(w.x) + 4, L = w.h * 0.5 * w.curl;
      g.fillStyle = o.lip || '#58606c'; g.beginPath(); g.moveTo(w.x - dir * w.w * 0.1, cy + 8);
      g.quadraticCurveTo(cx + dir * L * 1.1, cy - L * 0.45, cx + dir * L * 1.25, cy + L * 0.75);
      g.quadraticCurveTo(cx + dir * L * 0.7, cy + L * 0.2, cx, cy + L * 0.35); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(225,232,240,0.55)'; g.lineWidth = 4; g.beginPath(); g.moveTo(w.x - dir * w.w * 0.1, cy + 2);
      g.quadraticCurveTo(cx + dir * L * 1.1, cy - L * 0.5, cx + dir * L * 1.25, cy + L * 0.72); g.stroke();
    }
    // foam on crests
    g.strokeStyle = 'rgba(215,222,232,0.45)'; g.lineWidth = 3; g.beginPath();
    for (let x = x0; x <= x1; x += 8) { const s = surf(x + 4) - surf(x - 4); if (Math.abs(s) > 3.2) { const y = surf(x); g.moveTo(x - 6, y + 2); g.lineTo(x + 6, y + 2); } }
    g.stroke();
    return surf;
  };
  // splash burst at (x, y), p 0..1
  S.splash = (x, y, p, size = 1, seed = 4) => { if (p <= 0 || p >= 1) return; const r = S.rng(seed);
    g.fillStyle = `rgba(220,228,238,${0.8 * (1 - p)})`;
    for (let i = 0; i < 16; i++) { const a = -Math.PI * (0.1 + 0.8 * r()), v = (120 + 160 * r()) * size;
      const px = x + cos(a) * v * p, py = y + sin(a) * v * p + 420 * size * p * p; g.beginPath(); g.arc(px, py, (3 + 4 * r()) * size * (1 - p * 0.5), 0, TAU); g.fill(); } };

  // ------------------------------------------------------------------ props
  S.brick = (x, y, rot = 0, s = 1, color = '#26292e') => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = color;
    g.fillRect(-26 * s, -13 * s, 52 * s, 26 * s); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2; g.strokeRect(-26 * s, -13 * s, 52 * s, 26 * s); g.restore(); };
  // a wall/tower that builds brick by brick: p = bricks placed so far (fractional = the next one is dropping in).
  // Each brick drops, lands and squashes, so a build reads as a rhythm. Returns the current top y.
  S.tower = (x, y, p, o = {}) => { const cols = o.cols || 3, bw = 52 * (o.s || 1), bh = 26 * (o.s || 1);
    const n = Math.floor(p), fr = p - n;
    for (let i = 0; i <= n; i++) { const row = Math.floor(i / cols), col = i % cols, off = row % 2 ? bw / 2 : 0;
      let bx = x + (col - (cols - 1) / 2) * bw + off - (row % 2 ? bw / 4 : 0), by = y - row * bh - bh / 2;
      if (i === n) { if (fr <= 0) break; const d = S.easeIn(S.clamp(fr / 0.7)); by -= (1 - d) * 220; if (fr > 0.7) by += S.settle(fr, 0.7, 6, 40, 12); }
      S.brick(bx, by, 0, o.s || 1, o.color); }
    return y - Math.ceil(p / cols) * bh; };
  S.ladder = (x, y, h, rungs = 1, w = 70) => { g.strokeStyle = S.INK; g.lineWidth = 8; g.lineCap = 'round'; const n = Math.round(h / 55);
    g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y - h); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y - h); g.stroke();
    g.lineWidth = 6; g.beginPath(); for (let i = 1; i <= n * rungs; i++) { g.moveTo(x - w / 2, y - i * 55); g.lineTo(x + w / 2, y - i * 55); } g.stroke(); };
  // a door in a wall; open 0..1 throws light out
  S.door = (x, y, w = 150, h = 280, open = 0, light = '#e8e2d0') => {
    if (open > 0) { const lg = g.createRadialGradient(x, y - h / 2, 10, x, y - h / 2, h * 1.6); lg.addColorStop(0, S.rgb([232, 226, 208], 0.55 * open)); lg.addColorStop(1, 'rgba(232,226,208,0)');
      g.fillStyle = lg; g.fillRect(x - h * 2, y - h * 2.5, h * 4, h * 3); g.fillStyle = light; g.globalAlpha = open; g.fillRect(x - w / 2, y - h, w, h); g.globalAlpha = 1; }
    g.fillStyle = S.INK; g.fillRect(x - w / 2, y - h, w * (1 - 0.85 * open), h); g.strokeStyle = S.INK; g.lineWidth = 10; g.strokeRect(x - w / 2, y - h, w, h); };
  S.trophy = (x, y, s = 1, color = '#c9a24a') => { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = color;
    g.fillRect(-26, -10, 52, 10); g.fillRect(-7, -40, 14, 30); g.beginPath(); g.moveTo(-38, -100); g.lineTo(38, -100); g.quadraticCurveTo(34, -40, 0, -40); g.quadraticCurveTo(-34, -40, -38, -100); g.fill();
    g.lineWidth = 7; g.strokeStyle = color; g.beginPath(); g.arc(-38, -82, 14, Math.PI * 0.5, Math.PI * 1.5); g.arc(38, -82, 14, -Math.PI * 0.5, Math.PI * 0.5); g.stroke(); g.restore(); };
  S.balloon = (x, y, t = 0, color = S.ACCENT, s = 1) => { const bx = x + sin(t * 1.6) * 8 * s, by = y - 170 * s;
    g.strokeStyle = S.INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14 * s, y - 80 * s, bx, by + 40 * s); g.stroke();
    g.fillStyle = color; g.beginPath(); g.ellipse(bx, by, 34 * s, 42 * s, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,200,190,0.5)'; g.beginPath(); g.arc(bx - 11 * s, by - 14 * s, 8 * s, 0, TAU); g.fill(); };
  S.ball = (x, y, r, color = S.ACCENT) => { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,190,180,0.5)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, TAU); g.fill(); };
  // a long flat board (surfboard, plank, bench seat): centre x,y, length, angle
  S.board = (x, y, len, ang = 0, color = S.INK, th = 12) => { g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = color;
    g.beginPath(); g.ellipse(0, 0, len / 2, th, 0, 0, TAU); g.fill(); g.restore(); };
  S.label = (text, x, y, a = 1, size = 30, dash = true) => { if (a <= 0) return; g.save(); g.globalAlpha = a; g.fillStyle = '#d9dde3';
    g.font = `600 ${size}px "Courier New", monospace`; g.letterSpacing = `${Math.round(size * 0.3)}px`; g.fillText((dash ? '— ' : '') + text, x, y); g.restore(); };

  // a branching tree grown by gg (0..~1.1). o: { len, angle, width, ceiling (no branch tip below this y), depth, seed }
  S.tree = (x, y, o = {}) => {
    const r = S.rng(o.seed || 7), T = [], leaves = [], ceil = o.ceiling ?? -1e9, maxD = o.depth || 6;
    (function grow(px, py, ang, len, w, d, start, bias) {
      const ex = px + sin(ang) * len, ey = py - cos(ang) * len;
      if (d > 0 && ey > ceil) return;
      const b = { px, py, ex, ey, w, d, start, end: start + 0.2 }; T.push(b);
      if (d >= maxD) return;
      const kids = d === 0 ? [[-0.78, 0.82, -0.1], [0.62, 0.66, 0.06], [0.05, 0.62, 0]]
        : (n => Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * 0.62 + (r() - .5) * 0.45, 0.66 + r() * 0.16, bias]))(r() < 0.55 ? 2 : 3);
      for (const [da, lf, bi] of kids) grow(ex, ey, ang + da + bi, len * lf, w * 0.66, d + 1, start + 0.15, d === 0 ? bi : bias);
    })(x, y, o.angle || 0, o.len || 330, o.width || 46, 0, 0, 0);
    const r2 = S.rng((o.seed || 7) + 4);
    for (const b of T) if (b.d >= 3) for (let k = 0; k < (b.d >= 5 ? 3 : 2); k++)
      leaves.push({ b, x: b.ex + (r2() - .5) * 70, y: b.ey + (r2() - .5) * 50, r: 38 + r2() * 30, back: r2() < 0.45 });
    const lg = (l, gg) => S.es(gg, l.b.end - 0.06, l.b.end + 0.14);
    return { branches: T, leaves,
      draw(gg) { if (gg <= 0) return; g.lineCap = 'round';
        for (const l of leaves) if (l.back) { const k = lg(l, gg); if (k > 0) { g.fillStyle = '#121418'; g.beginPath(); g.arc(l.x, l.y, l.r * k, 0, TAU); g.fill(); } }
        g.strokeStyle = S.INK;
        for (const b of T) { const k = S.seg(gg, b.start, b.end); if (k <= 0) continue;
          g.lineWidth = Math.max(3, b.w * Math.min(1, gg * 1.6 + 0.2)); g.beginPath(); g.moveTo(b.px, b.py); g.lineTo(S.lerp(b.px, b.ex, k), S.lerp(b.py, b.ey, k)); g.stroke(); }
        g.fillStyle = S.INK;
        for (const l of leaves) if (!l.back) { const k = lg(l, gg); if (k > 0) { g.beginPath(); g.arc(l.x, l.y, l.r * k, 0, TAU); g.fill(); } }
        const sp = S.seg(gg, 0.01, 0.05) * (1 - S.seg(gg, 0.2, 0.32));
        if (sp > 0) { const b = T[0], k = S.seg(gg, 0, 0.2), tx = S.lerp(b.px, b.ex, k), ty = S.lerp(b.py, b.ey, k);
          for (const s of [-1, 1]) { g.save(); g.translate(tx, ty); g.rotate(s * 0.9); g.beginPath(); g.ellipse(s * 16 * sp, -6, 18 * sp, 8 * sp, 0, 0, TAU); g.fill(); g.restore(); } } },
      // lowest leaf edge per 20 px column (rain can stop there)
      cover(gg) { const bins = {}; for (const l of leaves) { const k = lg(l, gg); if (k < 0.6) continue; const rr = l.r * k;
        for (let xx = l.x - rr; xx <= l.x + rr; xx += 20) { const i = Math.floor(xx / 20); bins[i] = Math.max(bins[i] ?? -1, l.y + rr * 0.6); } }
        return x => bins[Math.floor(x / 20)] ?? -1; } };
  };

  // ------------------------------------------------------------------ weather
  const RAIN = (() => { const r = S.rng(9); return Array.from({ length: 360 }, () => ({ x: r() * 1500 - 200, o: r(), s: 0.9 + r() * 0.6, l: 40 + r() * 50 })); })();
  // amount 0..1; floor(x) -> y where a drop stops (ground, canopy...), optional
  S.rain = (t, amount, floor = null) => { if (amount <= 0.02) return; g.strokeStyle = `rgba(200,210,222,${0.5 * amount})`; g.lineWidth = 2.2; g.beginPath();
    for (let i = 0; i < Math.floor(RAIN.length * amount); i++) { const d = RAIN[i], y = ((t * d.s * 1.6 + d.o) % 1) * 2500 - 300, x = d.x - y * 0.12;
      if (floor && y > floor(x)) continue; g.moveTo(x, y); g.lineTo(x - d.l * 0.12, y + d.l); } g.stroke(); };
  S.lightning = (x, y0, y1, a = 1, seed = 2) => { if (a <= 0) return; const r = S.rng(seed); g.strokeStyle = `rgba(240,244,252,${a})`; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y0);
    let cx = x; for (let y = y0; y < y1; y += 60) { cx += (r() - .5) * 90; g.lineTo(cx, y + 60); } g.stroke(); };

  // ------------------------------------------------------------------ camera + frame
  // story.shots: [[t0, t1, [cx, cy, zoom], [cx, cy, zoom]], ...]  hard cut at each t0, slow move inside a shot
  S.camAt = t => { const sh = STORY.shots || [[0, 1e9, [540, 960, 1], [540, 960, 1]]];
    for (const [a, b, c0, c1] of sh) if (t >= a && t < b) { const k = S.seg(t, a, b); return { cx: S.lerp(c0[0], c1[0], k), cy: S.lerp(c0[1], c1[1], k), z: S.lerp(c0[2], c1[2], k) }; }
    const c = sh[sh.length - 1][3]; return { cx: c[0], cy: c[1], z: c[2] }; };
  // current shot index (handy for per-shot logic in a story)
  S.shotAt = t => { const sh = STORY.shots || []; for (let i = 0; i < sh.length; i++) if (t >= sh[i][0] && t < sh[i][1]) return i; return sh.length - 1; };

  let GRAIN = null;
  function frame(t) {
    if (!GRAIN) { GRAIN = document.createElement('canvas'); GRAIN.width = GRAIN.height = 256; const gc = GRAIN.getContext('2d'), im = gc.createImageData(256, 256), r = S.rng(5);
      for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 14; } gc.putImageData(im, 0, 0); }
    const cam = S.camAt(t), env = STORY.env ? STORY.env(t, S) : {};
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    S.backdrop(t, cam, env);
    let sx = 0, sy = 0;
    for (const s of STORY.shakes || []) { const k = S.seg(t, s.at, s.at + (s.dur || 0.5)); if (k > 0 && k < 1) { sx += Math.sin(t * 90) * (s.amp || 10) * (1 - k); sy += Math.cos(t * 77) * (s.amp || 10) * (1 - k); } }
    g.save(); g.translate(540 + sx, 960 + sy); g.scale(cam.z, cam.z); g.translate(-cam.cx, -cam.cy);
    STORY.draw(t, S, cam, env);
    g.restore();
    if (STORY.overlay) STORY.overlay(t, S, cam, env);
    let fl = 0; for (const f of STORY.flashes || []) fl += (f.amp || 1) * Math.max(0, 1 - Math.abs(t - f.at) / (f.w || 0.12));
    if (fl > 0) { g.fillStyle = `rgba(235,240,250,${Math.min(0.8, 0.55 * fl)})`; g.fillRect(0, 0, W, H); }
    const vg = g.createRadialGradient(540, 900, 500, 540, 960, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    const go = Math.floor(t * 30) * 37 % 256;
    g.save(); g.translate(-go, -(go * 1.3 % 256)); g.fillStyle = g.createPattern(GRAIN, 'repeat'); g.fillRect(0, 0, W + 256, H + 512); g.restore();
  }

  S.story = def => { STORY = def; };
  S.start = canvas => {
    g = canvas.getContext('2d');
    if (STORY.setup) STORY.setup(S);
    window.DURATION = STORY.duration;
    window.META = { duration: STORY.duration, title: STORY.title || '', sounds: STORY.sounds || [], music: STORY.music || {} };
    window.renderAt = t => frame(t);
    if (!window.__capture) { const t0 = performance.now(); (function loop() { frame(((performance.now() - t0) / 1000) % STORY.duration); requestAnimationFrame(loop); })(); }
  };
  window.SM = S;
})();
