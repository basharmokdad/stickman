// THE SEED - a crowd laughs at a man planting a seed; he waters it every day; the tree it becomes shelters them
// from a storm; its fruit falls at their feet and one of them plants it. Loops (last shot = first shot).
SM.story({
  title: 'The Seed', duration: 14, seed: 7,
  shots: [
    [0.0, 1.35, [700, 1110, 2.05], [690, 1105, 2.15]],   // he plants the seed
    [1.35, 2.6, [250, 1140, 1.85], [255, 1130, 1.95]],   // the crowd laughs
    [2.6, 7.0, [560, 1000, 1.12], [560, 960, 1.2]],      // days pass, the tree grows
    [7.0, 9.5, [540, 960, 1.02], [540, 950, 1.06]],      // the storm
    [9.5, 12.5, [330, 960, 1.3], [345, 985, 1.38]],      // sheltered; the fruit falls
    [12.5, 14.01, [395, 1190, 2.05], [400, 1185, 2.15]], // one of them plants it
  ],
  env: t => ({ storm: SM.keys(t, [[6.9, 0], [7.3, 1], [9.3, 1], [10.2, 0.15]]) }),
  shakes: [{ at: 7.1, dur: 0.5, amp: 10 }],
  flashes: [{ at: 7.12, amp: 1 }, { at: 8.35, amp: 0.6, w: 0.1 }],
  music: { mood: 'hopeful', gain: -5 },
  sounds: [
    { at: 0.8, type: 'tap', gain: -8 }, { at: 1.4, type: 'crowd', dur: 1.2, gain: -12 },
    { at: 2.65, type: 'splash', gain: -16, pitch: 0.6 }, { at: 3.6, type: 'splash', gain: -17, pitch: 0.6 },
    { at: 4.8, type: 'splash', gain: -16, pitch: 0.6 }, { at: 6.0, type: 'splash', gain: -17, pitch: 0.6 },
    { at: 7.05, type: 'thunder', dur: 3, gain: -4 }, { at: 6.95, type: 'rain', dur: 3.4, gain: -8 },
    { at: 12.12, type: 'thud', gain: -6, pitch: 1.4 }, { at: 12.95, type: 'tap', gain: -9 },
  ],
  setup(S) {
    this.LT = 1300; this.LX = 470; this.RT = 1180; this.RX = 560;
    this.tree = S.tree(650, this.RT, { seed: 7, len: 330, angle: -0.36, width: 46, ceiling: 980 });
    this.crowd = S.crowd(6, 60, 360, 3, { h: 270, jitter: 0 });
    // the fruit hangs from the lowest leaf cluster above the planting spot
    this.fruit = this.tree.leaves.filter(l => Math.abs(l.x - 455) < 110).reduce((a, l) => l.y + l.r > a.y + a.r ? l : a);
  },
  draw(t, S) {
    const { LT, LX, RT, RX, tree, crowd, fruit } = this, M = S.M, g = S.g;
    S.cliff(LX, LT, 'left', 3); S.cliff(RX, RT, 'right', 5);
    const gg = S.keys(t, [[2.75, 0], [3.3, 0.07], [4.0, 0.3], [5.25, 0.58], [6.5, 0.82], [7.2, 0.86], [8.9, 1.12]]);
    tree.draw(gg);

    // ---- hero: kneels, plants, stands, waters (4 pours), waves
    const kneel = 1 - S.es(t, 2.15, 2.5);
    let pour = 0; for (const [a, b] of [[2.6, 3.25], [3.55, 4.15], [4.75, 5.35], [5.95, 6.6]]) pour = Math.max(pour, S.window(t, a, b, 0.15));
    const holdCan = S.window(t, 2.35, 7.0, 0.25), wave = S.window(t, 10.4, 11.8, 0.25);
    let pose = S.blend(M.stand(t), M.kneel(1), kneel);
    pose = S.add(pose, { sl: 0.35 * Math.sin(t * 9) * (1 - S.seg(t, 1.3, 1.5)) * kneel, look: kneel > 0.5 ? 'down' : '' });
    pose = S.blend(pose, S.add(pose, { sl: 1.25 + 0.2 * pour - pose.sl, el: 0.35 - 0.4 * pour - pose.el, lean: 0.12 * pour, look: pour > 0.3 ? 'down' : '' }), holdCan);
    pose = M.wave(t * 1.8, wave, pose);
    const hero = S.fig({ x: 750, y: RT, h: 285, f: -1, pose, build: { thick: 1.05 } });
    if (holdCan > 0) {                                     // watering can + water
      const [hx, hy] = hero.hands.L, a = -0.55 * pour;
      g.save(); g.translate(hx, hy); g.rotate(-a); g.globalAlpha = holdCan; g.fillStyle = S.INK;
      g.fillRect(-22, -6, 44, 40); g.beginPath(); g.moveTo(-18, 6); g.lineTo(-62, -18); g.lineTo(-58, -24); g.lineTo(-14, -2); g.fill(); g.restore();
      if (pour > 0.4) { g.fillStyle = 'rgba(214,224,236,0.85)';
        for (let i = 0; i < 14; i++) { const ph = (t * 2.6 + i / 14) % 1, sx = hx - 60, sy = hy - 20;
          g.beginPath(); g.ellipse(S.lerp(sx, 656, ph), sy + (RT - sy) * ph * ph, 3, 6, 0, 0, 7); g.fill(); } }
    }
    if (t < 1.6) { const fall = S.seg(t, 0.75, 1.0), [hx, hy] = hero.hands.L;      // the seed
      g.fillStyle = '#2b2218'; g.beginPath(); g.ellipse(S.lerp(hx, 650, fall), S.lerp(hy + 6, RT - 6, fall), 7, 10, 0.4, 0, 7); g.fill(); }
    if (t > 0.9 && gg <= 0.02) { g.fillStyle = '#2c3036'; g.beginPath(); g.ellipse(650, RT, 26, 9, 0, Math.PI, 0); g.fill(); }

    // ---- crowd: laughs, stops, hunches in the storm, is sheltered, looks up, waves; the last one plants the fruit
    const laugh = S.keys(t, [[0, 1], [3.3, 1], [5.8, 0]]);
    crowd.forEach((c, i) => {
      const covered = S.es(t, 8.2 + (5 - i) * 0.12, 8.7 + (5 - i) * 0.12), hunch = S.es(t, 7.05, 7.35) * (1 - covered);
      const look = covered * (1 - S.es(t, 10.0, 10.3)), waveC = i % 2 ? S.window(t, 10.1 + i * 0.05, 11.9, 0.25) : 0;
      const planter = i === 5, kn = planter ? S.es(t, 12.55, 12.95) : 0;
      let p = S.blend(M.stand(t + i), i % 2 ? M.mock(t * 1.3 + c.ph) : M.laugh(t * 1.3 + c.ph), laugh);
      p = S.blend(p, S.add(M.crouch(0.35), { sl: 2.75 - 0.6, el: 1.9 - 0.5, lean: Math.sin(t * 40 + i * 3) * 0.03 }), hunch);
      p = M.lookUp(look, p);
      p = M.wave(t * 2 + i, waveC, p);
      p = S.blend(p, S.add(M.kneel(1), { sl: 0.1 + (t > 12.95 ? Math.sin(t * 14) * 0.15 : 0) - 0.5, look: 'down' }), kn);
      if (planter && t > 11.7 && t < 12.5) p.eyes = 'wide';
      S.fig({ x: c.x, y: LT, h: c.h, f: 1, pose: p, build: c.build });
    });

    // ---- the fruit (the one colour in the film)
    const fr = 21 * S.es(t, 9.8, 10.9) * (1 - S.es(t, 13.0, 13.35));
    if (fr > 0) { const fx0 = fruit.x + 6, fy0 = fruit.y + fruit.r * 0.55, fall = S.seg(t, 11.65, 12.15);
      let fx = S.lerp(fx0, 455, fall), fy = fy0 + (LT - fr - fy0) * fall * fall;
      if (t > 12.15) fy = LT - fr - Math.abs(Math.sin(S.seg(t, 12.15, 12.45) * Math.PI)) * 22 * (1 - S.seg(t, 12.15, 12.45));
      S.ball(fx, fy, fr); }
    if (t > 13.1) { g.fillStyle = '#2c3036'; g.beginPath(); g.ellipse(455, LT, 24 * S.es(t, 13.1, 13.3), 8, 0, Math.PI, 0); g.fill(); }

    // ---- labels + rain that stops under the canopy
    S.label('DAY 1', 600, RT + 95, t < 2.6 ? 1 : 0);
    for (const [s, a, b] of [['DAY 30', 3.3, 4.5], ['DAY 100', 4.5, 5.7], ['DAY 365', 5.7, 7.0]]) S.label(s, 590, RT + 110, S.window(t, a, b, 0.13), 46);
    S.label('DAY 1', 250, LT + 95, S.es(t, 13.25, 13.55));
    const cover = tree.cover(gg), storm = S.keys(t, [[6.9, 0], [7.3, 1], [9.3, 1], [10.2, 0.15]]);
    S.rain(t, storm, x => { const c = cover(x); return c > 0 ? c : (x < (LX + RX) / 2 ? LT : RT); });
  },
});
