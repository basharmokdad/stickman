// Every built-in motion, looping - open player.html?story=examples/poses/story.js to see the rig.
SM.story({
  title: 'Poses', duration: 6, seed: 2,
  shots: [[0, 6, [540, 960, 1], [540, 960, 1]]],
  sounds: [], music: { mood: 'calm' },
  draw(t, S) {
    const M = S.M, rows = [
      [['stand', M.stand(t)], ['walk', M.walk(t * 0.9)], ['run', M.run(t * 1.4)], ['kneel', M.kneel(S.window(t % 3, 0.2, 2.8))]],
      [['crouch', M.crouch(S.window(t % 3, 0.2, 2.8))], ['point', M.point(S.window(t % 3, 0.3, 2.7))], ['wave', M.wave(t * 1.5)], ['cheer', M.cheer(t * 1.6)]],
      [['laugh', M.laugh(t * 1.2)], ['mock', M.mock(t * 1.2)], ['throw', M.throw((t % 2) / 2)], ['carry', M.carry(t * 0.8)]],
      [['fall', M.fall(S.seg(t % 3, 0.3, 1.5))], ['climb', M.climb(t * 0.8)], ['paddle', M.paddle(t * 0.7)], ['balance', M.balance(1, Math.sin(t * 3))]],
      [['push', M.push(S.window(t % 3, 0.2, 2.8))], ['sit', M.sit(1)], ['slump', M.slump(1)], ['lookUp', M.lookUp(S.window(t % 3, 0.2, 2.8))]],
    ];
    const crowd = S.crowd(4, 0, 0, 5);
    rows.forEach((row, ri) => {
      const y = 430 + ri * 330;
      S.block(40, y, 1000, 70, '#1a1c20');
      row.forEach(([name, pose], ci) => {
        const x = 170 + ci * 245;
        S.fig({ x, y, h: 200, f: 1, pose, build: crowd[ci].build, snap: name === 'climb' ? false : true });
        S.label(name.toUpperCase(), x - 70, y + 45, 1, 22, false);
      });
    });
  },
});
