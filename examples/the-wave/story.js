// THE WAVE - everyone waits on the shore for the perfect wave; one guy paddles out into small ugly waves every day;
// when the big wave comes he is the only one who can ride it.
// Metaphor: the reps you do on bad days are what let you take the big chance.
SM.story({
  title: 'The Wave', duration: 15, seed: 4,
  shots: [
    [0.0, 2.2, [300, 1090, 1.3], [312, 1086, 1.38]],     // 1 the crowd waits, boards in the sand
    [2.2, 3.7, [360, 1100, 1.95], [400, 1098, 2.05]],    // 2 he takes his board and walks in; they laugh
    [3.7, 8.6, [640, 1060, 1.02], [650, 1050, 1.08]],    // 3 small ugly waves, day after day
    [8.6, 10.4, [600, 1000, 0.82], [590, 1010, 0.88]],   // 4 the big one rises; they run in
    [10.4, 11.7, [260, 1140, 1.5], [270, 1135, 1.58]],   // 5 the whitewater flattens them
    [11.7, 13.7, [720, 950, 0.9], [700, 965, 1.0]],      // 6 he rides it
    [13.7, 15.01, [300, 1090, 1.3], [312, 1086, 1.38]],  // 7 next morning: everyone paddles out (= shot 1, loops)
  ],
  env: t => ({ palette: 'day', storm: S_storm(t), horizon: 1170, flat: true }),
  shakes: [{ at: 8.75, dur: 1.4, amp: 6 }, { at: 10.75, dur: 0.6, amp: 12 }],
  flashes: [],
  music: { mood: 'hopeful', gain: -5 },
  sounds: [
    { at: 0.1, type: 'wave', dur: 2.4, gain: -14 }, { at: 2.25, type: 'crowd', dur: 1.4, gain: -12 },
    { at: 2.6, type: 'tap', gain: -14 }, { at: 3.0, type: 'tap', gain: -15, pitch: 1.1 }, { at: 3.4, type: 'tap', gain: -14 },
    { at: 3.75, type: 'wave', dur: 2.0, gain: -15 }, { at: 4.95, type: 'splash', gain: -8 },
    { at: 5.4, type: 'wave', dur: 1.8, gain: -16 }, { at: 6.65, type: 'splash', gain: -9, pitch: 1.2 },
    { at: 7.0, type: 'wave', dur: 1.8, gain: -15 }, { at: 8.6, type: 'thunder', dur: 3.0, gain: -6, pitch: 0.55 },
    { at: 9.4, type: 'tap', gain: -12 }, { at: 9.7, type: 'tap', gain: -12, pitch: 1.2 },
    { at: 10.5, type: 'wave', dur: 1.6, gain: -4, pitch: 1.6 }, { at: 10.85, type: 'splash', gain: -5, pitch: 0.8 },
    { at: 11.7, type: 'wave', dur: 2.2, gain: -8 }, { at: 13.75, type: 'wave', dur: 1.4, gain: -15 },
  ],

  draw(t, S) {
    const g = S.g, M = S.M, shot = S.shotAt(t);
    const SAND_Y = 1200, SEA_Y = 1215, SHORE = 423;
    const sandY = x => x < 380 ? SAND_Y : x < 600 ? SAND_Y + (x - 380) * 0.35 : SAND_Y + 77 + (x - 600) * 1.2;
    const crowd = S.crowd(5, 20, 270, 11, { h: 262 });
    const HERO = { h: 272, build: { thick: 1.05, head: 1.0, legs: 1.02, torso: 1.0 } };

    // ---- the sea: small ugly swells all the time, the giant one in shots 4-6
    const waves = [];
    const swell = (t0, x0, sp, h, w = 120) => { const x = x0 - sp * (t - t0); if (t > t0 && x > 300) waves.push({ x, h, w, lean: -0.45, curl: 0.15 }); };
    for (let k = 0; k < 9; k++) swell(-3 + k * 1.75, 1250, 210, 34 + (k % 3) * 14);
    // montage: the wave he catches each "day" (shot 3)
    const days = [[3.7, 'DAY 1'], [5.35, 'DAY 40'], [6.95, 'DAY 200']];
    days.forEach(([d0], i) => swell(d0 + 0.2, 1150, 240, 78 + i * 8, 130));
    // the big one
    let big = null;
    if (t > 8.6 && t < 13.7) {
      const bx = S.keys(t, [[8.6, 1350], [10.4, 980], [11.7, 900], [13.7, 640]]);
      const bh = S.keys(t, [[8.6, 40], [10.0, 560], [11.7, 640], [13.7, 660]]);
      big = { x: bx, h: bh, w: 330, lean: -0.55, curl: S.es(t, 9.6, 11.0) * 1.15, dir: -1 };
      waves.push(big);
    }
    // shot 7 / shot 1: the morning swells are small again
    // sand first (the sea is drawn over the sloping part, so the shoreline is where they meet)
    const chop = shot === 3 || shot === 4 || shot === 5 ? 12 : 8;
    const surf = S.sea(t, { y: SEA_Y, chop, x0: -700, x1: 1900, waves, color: big ? '#48505c' : '#353b45', lip: '#6a7380' });
    g.fillStyle = '#1b1d21'; g.beginPath(); g.moveTo(-700, SAND_Y);
    for (let x = -700; x <= 1000; x += 20) g.lineTo(x, sandY(x)); g.lineTo(1000, 2600); g.lineTo(-700, 2600); g.fill();
    // water over the underwater slope, fading in from the shoreline (no hard edge)
    g.save(); g.beginPath(); g.moveTo(SHORE - 30, 2600); for (let x = SHORE - 30; x <= 1900; x += 10) g.lineTo(x, surf(x)); g.lineTo(1900, 2600); g.clip();
    const wg = g.createLinearGradient(SHORE - 20, 0, SHORE + 260, 0); wg.addColorStop(0, 'rgba(53,59,69,0)'); wg.addColorStop(1, 'rgba(53,59,69,0.92)');
    g.fillStyle = wg; g.fillRect(SHORE - 30, 0, 2400, 2600); g.restore();
    // shot 5: the whitewater rolls up the beach (drawn before the people so it carries them)
    if (t >= 10.4 && t < 11.7) {
      const xf = S.keys(t, [[10.4, 760], [11.3, 60], [11.7, 20]], S.easeOut), a = 1 - S.es(t, 11.2, 11.7);
      g.fillStyle = `rgba(206,214,224,${0.62 * a})`; g.beginPath(); g.moveTo(xf, sandY(xf) + 20);
      for (let x = xf; x <= 1300; x += 20) g.lineTo(x, sandY(x) - 30 - Math.min(1, (x - xf) / 140) * (60 + 22 * Math.sin(x * 0.04 + t * 9)));
      for (let x = 1300; x >= xf; x -= 20) g.lineTo(x, sandY(x) + 26); g.closePath(); g.fill();
      for (let k = 0; k < 4; k++) S.splash(xf + 40 + k * 70, sandY(xf) - 40, (t * 1.8 + k * 0.27) % 1, 0.8, 20 + k + Math.floor(t * 1.8));
    }
    g.strokeStyle = 'rgba(170,178,190,0.16)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-700, SAND_Y + 1); g.lineTo(380, SAND_Y + 1); g.stroke();

    // boards stuck in the sand (shots 1, 2; empty in 7)
    const boardsUp = t < 9.3;
    crowd.forEach(c => { if (boardsUp || false) S.board(c.x - 40, SAND_Y - 92, 210, Math.PI / 2 - 0.1, '#2c3036', 13); });

    // ---- the crowd
    const people = [];
    crowd.forEach((c, i) => {
      let x = c.x, y = SAND_Y, pose, f = 1, under = false, alpha;
      if (t < 8.9 || shot === 6 && false) {
        // waiting: arms folded, hands on hips, a lean - and they laugh at him in shot 2
        const idle = [S.pose({ sl: 1.05, el: 1.45, sr: 0.95, er: 1.5 }), S.pose({ sl: -0.55, el: 1.6, sr: -0.5, er: 1.6 }), M.stand(t + i),
          S.pose({ sl: 1.05, el: 1.45, sr: 0.95, er: 1.5, lean: -0.05 }), M.stand(t * 1.1 + i)][i];
        const mock = S.window(t, 2.25, 3.9) * (i !== 2 ? 1 : 0.6);
        pose = S.blend(idle, i % 2 ? M.mock(t * 1.3 + c.ph) : M.laugh(t * 1.3 + c.ph), mock);
        if (t > 3.9) pose = S.blend(idle, M.slump(0.3), 0.3 * S.es(t, 7.0, 8.0));     // bored by day 200
      } else if (t < 10.4) {
        // the big wave: they see it, grab boards, run in
        const see = S.es(t, 8.9, 9.15), run = S.seg(t, 9.25 + i * 0.05, 10.4);
        x = c.x + 260 * S.easeIn(run) * 1.1 + c.x * 0.35 * S.easeIn(run);
        pose = run > 0 ? M.run(t * 1.6 + c.ph) : M.lookUp(see, M.stand(t));
        if (run <= 0) pose.eyes = 'wide';
        under = x > SHORE;
      } else if (t < 13.7) {
        // wiped out by the whitewater: knocked back onto the sand, then lying there watching him
        const hitAt = S.lerp(10.6, 11.15, (300 - c.x) / 300) + i * 0.02;
        const p = S.seg(t, hitAt, hitAt + 0.55);
        x = c.x * 1.35 + 286 - 240 * S.easeOut(p);
        pose = t < hitAt ? M.run(t * 1.6 + c.ph) : M.fall(p);
        if (t > 11.7) { pose = M.lookUp(1, M.sitGround(1)); pose.eyes = 'wide'; x = c.x + 40; }
        under = x > SHORE;
      } else {
        // next morning: they paddle out too (loop back to shot 1's framing, the beach empty)
        return;
      }
      people.push({ x, y: under ? sandY(x) + 30 : sandY(x), pose, f, c, under });
    });
    // seated watchers in shot 6 need a seat height: lift them by their own hip
    for (const p of people) if (!p.under) S.fig({ x: p.x, y: p.y, h: p.c.h, f: p.f, pose: p.pose, build: p.c.build });

    // ---- the hero
    const ride = { x: 0, y: 0, ang: 0 };
    let hero = null, heroAfter = null;
    if (t < 3.7) {
      // shot 1: standing by his red board; shot 2: pulls it out and walks into the water
      const walk = S.seg(t, 2.6, 3.7), x = S.lerp(335, 470, walk);
      const pull = S.es(t, 2.25, 2.6);
      const pose = walk > 0 ? M.walk(t * 1.1) : S.blend(M.stand(t), S.pose({ sr: 0.9, er: 0.5, lean: 0.1 }), pull);
      const fy = sandY(x);
      const h = S.fig({ x, y: fy + (x > SHORE ? 14 : 0), h: HERO.h, f: 1, pose: S.add(pose, { sr: walk > 0 ? 0.25 - pose.sr : 0, er: walk > 0 ? 0.1 - pose.er : 0 }), build: HERO.build });
      // the board: upright in the sand, then under his arm
      const bx = S.lerp(372, h.hands.R[0] - 10, pull), by = S.lerp(SAND_Y - 95, h.hands.R[1] - 8, pull);
      S.board(bx, by, 220, S.lerp(Math.PI / 2 - 0.05, 0.04, pull), S.ACCENT, 13);
    }

    // shoreline foam
    g.strokeStyle = 'rgba(215,222,232,0.35)'; g.lineWidth = 4; g.beginPath(); g.moveTo(SHORE - 10 + Math.sin(t * 1.7) * 14, SEA_Y + 2); g.lineTo(SHORE + 60 + Math.sin(t * 1.7) * 14, SEA_Y + 4); g.stroke();
    // people standing in the water (drawn before the water would hide them completely, so draw them faintly over it)
    for (const p of people) if (p.under) {
      g.save(); g.beginPath(); g.rect(-700, 0, 2600, surf(p.x) + 6); g.clip();
      S.fig({ x: p.x, y: p.y, h: p.c.h, f: p.f, pose: p.pose, build: p.c.build }); g.restore();
      if (t > 9.25 && t < 10.4) S.board(p.x - 20, surf(p.x) - 6, 200, -0.05, '#101114', 11);
    }

    // ---- shot 3: day after day on small ugly waves
    if (t >= 3.7 && t < 8.6) {
      const i = t < 5.35 ? 0 : t < 6.95 ? 1 : 2, d0 = days[i][0], d1 = i < 2 ? days[i + 1][0] : 8.6, lt = t - d0;
      const wx = 1150 - 240 * (t - d0 - 0.2);
      // timeline inside a day: paddle, pop up when the wave reaches him, ride (longer each day), fall (not on day 200)
      const popAt = 0.85, rideFor = [0.45, 0.85, 3.0][i], fallAt = popAt + rideFor;
      let x = 800, pose, onBoard = true, board = true;
      if (lt < popAt) { pose = M.paddle(t * 1.4); x = 800 - lt * 25; }
      else if (lt < fallAt || i === 2) {
        const r = lt - popAt; x = wx - 70; // he travels with the wave face
        const wob = i === 2 ? 0.15 * Math.sin(t * 2.2) : Math.sin(t * (14 - i * 3)) * (0.6 - i * 0.2);
        pose = S.blend(M.paddle(t), M.balance(1, wob), S.es(r, 0, 0.22, S.back));
        if (i === 2) { pose.eyes = 'dot'; pose.look = ''; }
      } else {
        const p = S.seg(lt, fallAt, fallAt + 0.45); x = wx - 70 - 20 * p; pose = M.fall(p, i === 0 ? 1 : -1); onBoard = false;
      }
      const y = surf(x), sl = (surf(x + 30) - surf(x - 30)) / 60, ang = Math.atan(sl);
      if (onBoard) {
        S.board(x, y - 6, 210, ang, S.ACCENT, 11);
        S.fig({ x, y: y - 16, h: HERO.h, f: -1, pose, build: HERO.build });
      } else {
        const p = S.seg(lt, fallAt, fallAt + 0.45);
        g.save(); g.beginPath(); g.rect(-700, 0, 2600, y + 10); g.clip();
        S.fig({ x, y: y - 16 + 120 * S.easeIn(p), h: HERO.h, f: -1, pose, build: HERO.build }); g.restore();
        S.board(x + 90 * p, y - 10 - 120 * Math.sin(p * Math.PI) * 0.6, 210, ang + p * 2.2, S.ACCENT, 11);
        S.splash(x, y, S.seg(lt, fallAt + 0.12, fallAt + 0.9), 1.1, 3 + i);
        // redraw the water surface strip over him so he sinks into it
      }
      // DAY labels on the water, one per day
      S.label(days[i][1], 470, 1520, S.window(t, d0 + 0.05, d1 - 0.05, 0.12), 44);
    }

    // ---- shot 4-6: the big wave
    if (big && t >= 8.6) {
      // he is already out there, paddling up the face in shot 4, riding it in 6
      if (t < 10.4) {
        const x = big.x - big.w * 0.95 - 30, y = surf(x);
        S.board(x, y - 6, 210, Math.atan((surf(x + 30) - surf(x - 30)) / 60), S.ACCENT, 11);
        S.fig({ x, y: y - 16, h: HERO.h, f: -1, pose: M.paddle(t * 1.6), build: HERO.build });
      } else if (t >= 11.7) {
        // the ride: on the face under the lip, carving
        const k = S.seg(t, 11.7, 13.7), x = big.x - big.w * S.lerp(0.48, 0.36, Math.sin(k * Math.PI * 1.5) * 0.5 + 0.5), y = surf(x);
        const ang = S.clamp(Math.atan((surf(x + 30) - surf(x - 30)) / 60), -0.5, 0.5);
        S.board(x, y - 6, 210, ang, S.ACCENT, 11);
        S.fig({ x, y: y - 16, h: HERO.h, f: -1, pose: M.balance(1, 0.25 * Math.sin(t * 2.5)), build: HERO.build });
        // spray off the board
        S.splash(x + 90, y, (t * 2.2) % 1, 0.5, Math.floor(t * 2.2));
      }
    }
    // ---- shot 7: next morning everyone is out in the small waves with him
    if (t >= 13.7) {
      [[480, 0], [575, 1], [668, 2]].forEach(([x0, i]) => {
        const x = x0 + (t - 13.7) * 14, y = surf(x), sc = 0.62;
        S.board(x, y - 4, 150, S.clamp(Math.atan((surf(x + 30) - surf(x - 30)) / 60), -0.4, 0.4), i === 0 ? S.ACCENT : '#2c3036', 8);
        S.fig({ x, y: y - 10, h: (i === 0 ? HERO.h : crowd[i].h) * sc, f: 1, pose: M.paddle(t * 1.3 + i * 0.3), build: i === 0 ? HERO.build : crowd[i].build });
      });
      S.label('DAY 1', 60, 1330, S.es(t, 13.85, 14.15), 32);
    }
    if (t < 2.2) S.label('WAITING', 60, 1330, S.es(t, 0.3, 0.6), 32);
  },
});
function S_storm(t) { return SM.keys(t, [[8.5, 0], [9.0, 0.85], [13.5, 0.7], [13.7, 0]]); }
