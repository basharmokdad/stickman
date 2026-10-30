// THE SEEDS - a crowd mocks a lone man and throws seeds at him. He plants every one. His side becomes an orchard
// while theirs dries up. He throws back one red fruit; a child catches it and plants its seed. Loops: the last shot
// mirrors the first (a kneeling planter + DAY 1).  Metaphor: everything they threw at him became a harvest.
SM.story({
  title: 'The Seeds', duration: 15, seed: 12,
  shots: [
    [0.0, 1.7, [690, 1180, 2.0], [680, 1175, 2.1]],     // 1 he plants a seed alone (DAY 1)
    [1.7, 3.6, [250, 1170, 1.6], [258, 1164, 1.68]],    // 2 the crowd mocks and throws seeds at him
    [3.6, 5.0, [720, 1150, 1.7], [712, 1146, 1.78]],    // 3 seeds land around him; he picks one up
    [5.0, 9.2, [560, 1080, 0.96], [560, 1060, 1.02]],   // 4 DAY 30 / DAY 200: he plants every seed, an orchard grows
    [9.2, 11.0, [250, 1160, 1.35], [260, 1155, 1.42]],  // 5 their side dries up; they are hungry and grey
    [11.0, 12.9, [520, 1110, 1.02], [520, 1100, 1.06]], // 6 he throws back one red fruit; the child catches it
    [12.9, 15.01, [400, 1220, 2.0], [410, 1215, 2.1]],  // 7 the child plants its seed (DAY 1) = shot 1, mirrored
  ],
  env: t => ({ storm: SM.keys(t, [[8.9, 0], [9.4, 0.55], [12.7, 0.5], [13.1, 0.12]]) }),
  music: { mood: 'hopeful', gain: -5 },
  sounds: [
    { at: 0.9, type: 'tap', gain: -8 }, { at: 1.75, type: 'crowd', dur: 1.8, gain: -11 },
    { at: 3.75, type: 'pop', gain: -12, pitch: 0.7 }, { at: 3.98, type: 'pop', gain: -13, pitch: 0.8 }, { at: 4.2, type: 'pop', gain: -12, pitch: 0.65 },
    { at: 4.42, type: 'pop', gain: -14, pitch: 0.75 }, { at: 4.7, type: 'tap', gain: -10 },
    { at: 5.75, type: 'tap', gain: -11 }, { at: 6.55, type: 'tap', gain: -11, pitch: 1.1 }, { at: 7.35, type: 'tap', gain: -11 }, { at: 8.15, type: 'tap', gain: -12, pitch: 0.9 },
    { at: 9.2, type: 'whoosh', dur: 1.8, gain: -14, pitch: 0.6 }, { at: 11.9, type: 'whoosh', dur: 0.5, gain: -16 },
    { at: 12.62, type: 'chime', gain: -12 }, { at: 13.9, type: 'tap', gain: -9 },
  ],
  setup(S) {
    this.LT = 1300; this.LX = 430; this.RT = 1260; this.RX = 600;
    this.SPOTS = [690, 790, 890, 990];             // where he plants: the orchard row
    this.TP = [5.35, 6.15, 6.95, 7.75];            // when he plants each one
    this.trees = this.SPOTS.map((x, i) => S.tree(x, this.RT, { seed: 21 + i * 5, len: 150 + (i % 2) * 22, angle: (i - 1.5) * 0.05, width: 26, ceiling: this.RT - 190, depth: 5, leaf: 0.48 }));
    this.crowd = S.crowd(6, 10, 290, 9, { h: 262 });
    this.CHILD = { x: 352, h: 168, build: { thick: 0.9, head: 1.22, legs: 0.9, torso: 0.9, acc: 'bun' } };
    // seeds thrown: who throws when; each lands near the hero 0.9 s after release
    this.THROWS = [[0, 1.9, 640], [2, 2.15, 760], [4, 2.45, 700], [1, 2.8, 820], [3, 3.05, 665], [5, 3.3, 790],
      [0, 5.2, 890], [2, 5.7, 990], [4, 6.3, 940]];
    this.fruitLeaf = this.trees[0].leaves.reduce((a, l) => (l.y + l.r > a.y + a.r && l.x < 760 ? l : a));
  },
  draw(t, S) {
    const { LT, LX, RT, RX, SPOTS, TP, trees, crowd, CHILD, THROWS } = this, M = S.M, g = S.g, shot = S.shotAt(t);
    const drought = S.es(t, 9.0, 9.6) * (1 - S.es(t, 12.95, 13.2) * 0.7);
    S.cliff(LX, LT, 'left', 3, S.mixc ? S.rgb(S.mixc([22, 24, 28], [44, 44, 46], drought)) : S.ROCK);
    S.cliff(RX, RT, 'right', 5);
    // cracks in their dry ground
    if (drought > 0.05) { g.strokeStyle = `rgba(10,10,12,${0.7 * drought})`; g.lineWidth = 3; g.beginPath();
      for (const [x, d] of [[60, 1], [170, -1], [260, 1], [380, -1]]) { g.moveTo(x, LT); g.lineTo(x + 14 * d, LT + 40); g.lineTo(x + 4 * d, LT + 75); g.moveTo(x + 14 * d, LT + 40); g.lineTo(x + 34 * d, LT + 58); }
      g.stroke(); }

    // ---- the orchard (grows on his side, keeps growing through their drought)
    trees.forEach((tr, i) => tr.draw(S.keys(t, [[TP[i] + 0.35, 0], [TP[i] + 1.1, 0.3], [9.2, 0.85 + 0.05 * i], [11.0, 1.05]])));

    // ---- crowd: mock + overhand throws; then watch; then hungry and grey; the child catches the fruit
    const grey = S.rgb(S.mixc([6, 6, 7], [52, 54, 58], drought));
    crowd.forEach((c, i) => {
      let pose = i === 1 || i === 4 ? M.mock(t * 1.3 + c.ph) : M.laugh(t * 1.3 + c.ph);
      for (const [who, t0] of THROWS) if (who === i && t > t0 - 0.05 && t < t0 + 0.95) pose = S.blend(pose, M.throw((t - t0) / 0.9), S.window(t, t0 - 0.05, t0 + 0.95, 0.1));
      pose = S.blend(pose, M.stand(t + i), S.es(t, 6.9, 7.6));                       // by day 200 they just stare
      pose = S.blend(pose, S.add(M.slump(1), { lean: 0.42, tilt: 0.5 }), drought);   // hungry
      if (t > 11.0) pose = M.lookUp(0.6 * S.es(t, 11.9, 12.3), pose);                 // they watch the fruit fly over
      S.fig({ x: c.x, y: LT, h: c.h * (1 - 0.04 * drought), f: 1, pose, build: Object.assign({}, c.build, { thick: c.build.thick * (1 - 0.18 * drought) }),
        color: grey, lookAt: t > 11.9 && t < 12.7 ? fruitPos(t) : null });
    });
    // the child (front of the crowd from shot 5 on)
    const showChild = t > 9.2;
    if (showChild) {
      const catchP = S.es(t, 12.5, 12.65, S.back), plant = S.es(t, 13.2, 13.65);
      let pose = S.blend(S.add(M.slump(1), { tilt: 0.2 }), M.lookUp(1, M.stand(t)), S.es(t, 11.7, 12.0));
      pose = S.blend(pose, S.pose({ sl: 2.3, el: 0.6, sr: 2.2, er: 0.7, tilt: -0.3, look: 'up', eyes: 'wide' }), S.es(t, 12.25, 12.5));
      pose = S.blend(pose, S.pose({ sl: 1.1, el: 1.2, sr: 1.0, er: 1.3, tilt: 0.25, look: 'down', eyes: 'wide', lean: 0.1 + S.settle(t, 12.62, 0.12) }), catchP);
      pose = S.blend(pose, S.add(M.kneel(1), { sl: 0.15 - 0.5 + (t > 13.7 ? Math.sin(t * 14) * 0.15 : 0), look: 'down' }), plant);
      const col = S.rgb(S.mixc([6, 6, 7], [52, 54, 58], drought));
      const ch = S.fig({ x: CHILD.x, y: LT, h: CHILD.h, f: 1, pose, build: CHILD.build, color: col });
      this.childHands = ch.hands;
    }

    // ---- the hero: plants (shot 1), shields from the seeds and picks one up (3), plants the row (4), picks + throws the fruit (6)
    let hx = 720, pose = M.stand(t);
    if (t < 1.7) pose = S.add(M.kneel(1), { sl: 0.35 * Math.sin(t * 9) * (1 - S.seg(t, 1.0, 1.2)), look: 'down' });
    else if (t < 5.0) {
      const shield = S.window(t, 3.65, 4.55, 0.12), pick = S.es(t, 4.55, 4.85);
      pose = S.blend(M.stand(t), S.pose({ sl: 2.6, el: 1.6, sr: 2.5, er: 1.7, lean: 0.25, tilt: 0.4, eyes: 'closed', hl: 0.3, kl: 0.6, hr: 0.1, kr: 0.5 }), shield);
      pose = S.blend(pose, S.add(M.kneel(1), { look: 'down' }), pick);
    } else if (t < 9.2) {
      // walk to each spot, kneel, plant
      let k = TP.findIndex(x => t < x + 0.75); if (k < 0) k = 3;
      const arrive = TP[k] - 0.15, leave = k ? TP[k - 1] + 0.6 : 5.0, from = k ? SPOTS[k - 1] + 30 : 720, to = SPOTS[k] + 30;
      const w = S.seg(t, leave, arrive); hx = S.lerp(from, to, S.ease(w));
      const kn = S.window(t, TP[k] - 0.1, TP[k] + 0.7, 0.15);
      pose = w > 0 && w < 1 ? M.walk(t * 1.5) : M.stand(t);
      pose = S.blend(pose, S.add(M.kneel(1), { sl: 0.3 * Math.sin(t * 10) - 0.2, look: 'down' }), kn);
      if (t > 8.5) { hx = SPOTS[3] + 30; pose = M.stand(t); }
    } else if (t < 11.0) { hx = 760; pose = M.lookUp(0.3, M.stand(t)); }
    else {
      hx = 720;
      const reach = S.window(t, 11.0, 11.55, 0.15), thr = S.seg(t, 11.5, 12.35);
      pose = S.blend(M.stand(t), S.pose({ sr: 2.9, er: 0.1, tilt: -0.4, look: 'up', lean: -0.05 }), reach);
      if (thr > 0 && thr < 1) pose = M.throw(thr);
      if (t > 12.35) pose = S.blend(M.throw(1), S.add(M.stand(t), { look: '' }), S.es(t, 12.35, 12.8));
    }
    const hero = S.fig({ x: hx, y: RT, h: 285, f: -1, pose, build: { thick: 1.05 }, lookAt: t > 11.9 && t < 12.7 ? fruitPos(t) : null });

    // the seed in his hand (shot 1) and the planted mound
    if (t < 1.7) { const fall = S.seg(t, 0.75, 1.0), [x0, y0] = hero.hands.L; g.fillStyle = '#121214';
      g.beginPath(); g.ellipse(S.lerp(x0, 640, fall), S.lerp(y0 + 6, RT - 6, fall), 7, 9, 0.4, 0, 7); g.fill(); }
    if (t > 0.95 && t < 1.7) { g.fillStyle = '#2c3036'; g.beginPath(); g.ellipse(640, RT, 24, 8, 0, Math.PI, 0); g.fill(); }

    // ---- seeds in the air: overhand throws arc over the gap, land with a puff, lie there until he plants them
    THROWS.forEach(([who, t0, lx], j) => {
      const c = crowd[who], rel = t0 + 0.45, land = rel + 0.9, x0 = c.x + 40, y0 = LT - c.h * 1.08;
      if (t < rel) return;
      if (t < land) { const k = (t - rel) / 0.9, x = S.lerp(x0, lx, k), y = S.lerp(y0, RT - 6, k) - 330 * 4 * k * (1 - k);
        g.fillStyle = '#0c0c0e'; g.beginPath(); g.ellipse(x, y, 6.5, 8.5, k * 6, 0, 7); g.fill(); return; }
      const pk = S.seg(t, land, land + 0.4);                                         // dust puff
      if (pk < 1) { g.fillStyle = `rgba(150,156,166,${0.6 * (1 - pk)})`; for (let q = 0; q < 6; q++) { const a = Math.PI * (1 + q / 5);
        g.beginPath(); g.arc(lx + Math.cos(a) * 26 * pk, RT - 4 + Math.sin(a) * 14 * pk, 5 * (1 - pk * 0.5), 0, 7); g.fill(); } }
      // picked up when he plants at that spot (or at 4.7 for the first wave)
      const spot = SPOTS.findIndex(s => Math.abs(s - lx) < 60), gone = spot >= 0 && t0 > 4 ? TP[spot] + 0.3 : spot >= 0 ? TP[spot] + 0.3 : 4.75;
      if (t < gone) { g.fillStyle = '#0c0c0e'; g.beginPath(); g.ellipse(lx, RT - 5, 7, 5, 0, 0, 7); g.fill(); }
    });

    // ---- the red fruit: ripens on the first tree, picked, thrown back, caught, planted
    const fl = this.fruitLeaf, fr = 19;
    if (t > 10.2 && t < 14.2) {
      let fp;
      if (t < 11.35) fp = [fl.x, fl.y + fl.r * 0.6];
      else if (t < 11.9) fp = hero.hands.R;
      else fp = fruitPos(t);
      if (t > 12.62 && this.childHands) fp = [(this.childHands.L[0] + this.childHands.R[0]) / 2, (this.childHands.L[1] + this.childHands.R[1]) / 2 - 8];
      if (t > 13.6) fp = [S.lerp(fp[0], 412, S.es(t, 13.6, 13.8)), S.lerp(fp[1], LT - 10, S.es(t, 13.6, 13.8))];
      const r = fr * S.es(t, 10.2, 10.9) * (1 - S.es(t, 13.85, 14.1));
      if (r > 0.5) S.ball(fp[0], fp[1], r);
    }
    if (t > 13.9) { g.fillStyle = '#2c3036'; g.beginPath(); g.ellipse(412, LT, 22 * S.es(t, 13.9, 14.1), 8, 0, Math.PI, 0); g.fill(); }

    // ---- dry wind + flakes on their side only
    if (drought > 0.05) { g.fillStyle = `rgba(220,224,230,${0.55 * drought})`; const r = S.rng(31);
      for (let q = 0; q < 70; q++) { const x0 = r() * 700 - 200, sp = 0.5 + r(), y = ((t * 120 * sp + r() * 1400) % 1400) + 300, x = x0 + Math.sin(t * 2 + q) * 20 + y * 0.18;
        if (x < LX + 10) { g.beginPath(); g.arc(x, y, 2.5 + r() * 2, 0, 7); g.fill(); } } }

    // ---- labels
    S.label('DAY 1', 640, RT + 95, t < 1.7 ? S.es(t, 0.3, 0.6) : 0);
    S.label('DAY 30', 650, RT + 120, S.window(t, 5.2, 6.9, 0.15), 44);
    S.label('DAY 200', 650, RT + 120, S.window(t, 6.9, 9.2, 0.15), 44);
    S.label('DAY 1', 230, LT + 95, S.es(t, 14.0, 14.3));

    function fruitPos(t) { const t0 = 11.9, k = S.clamp((t - t0) / 0.72), x = S.lerp(700, 358, k), y = S.lerp(RT - 285 * 1.0, LT - 150, k) - 300 * 4 * k * (1 - k); return [x, y]; }
  },
});
