// Boot: read the URL, build the game, apply a ?shot= preset if given.
// Debug hooks live on window.G (guizang style): G.step / G.tick drive the
// frame loop by hand, G.press feeds the same input sets a player uses, so
// automated playtests exercise the real code paths.
(function () {
  const q = new URLSearchParams(location.search);
  if (q.get('god')) S.god = true;
  if (q.get('muted') || q.get('shot')) S.muted = true;

  window.addEventListener('load', () => {
    Game.boot();
    const shot = q.get('shot');
    if (shot) Shots.apply(shot);
    else if (q.get('auto')) Game.hideTitle();
  });

  // ---- debug hooks -------------------------------------------------------
  window.G = {
    // Run n frames WITH rendering (slow in software GL — keep n small).
    step(n, dt) {
      n = n || 60; dt = dt || 1 / 60;
      if (S.mode === 'title') Game.hideTitle();
      for (let i = 0; i < n; i++) Game.frame(dt);
      return G.state();
    },
    // Run n frames of logic only (no render) — fast, for long drives.
    tick(n, dt) {
      n = n || 60; dt = dt || 1 / 60;
      if (S.mode === 'title') Game.hideTitle();
      const realRender = Game.render;
      Game.render = function () {};
      try {
        for (let i = 0; i < n; i++) Game.frame(dt);
      } finally {
        Game.render = realRender;
      }
      Game.render();
      return G.state();
    },
    // Press keys exactly like a player: 'KeyW', 'KeyE', 'Mouse0', 'Digit3'...
    press(...codes) {
      for (const c of codes) {
        if (c === 'Mouse0') { Input.mouseDown = true; Input.mousePressed = true; }
        else { Input.keys.add(c); Input.pressed.add(c); }
      }
      return G.state();
    },
    release(...codes) {
      for (const c of codes) {
        if (c === 'Mouse0') Input.mouseDown = false;
        else Input.keys.delete(c);
      }
      return G.state();
    },
    pl() {
      const p = S.player;
      return { x: +p.x.toFixed(1), z: +p.z.toFixed(1), yaw: +p.yaw.toFixed(2), speed: +(p.inCar ? p.inCar.speed : p.speed).toFixed(1), inCar: !!p.inCar, hp: Math.ceil(S.hp), carHp: p.inCar ? Math.ceil(p.inCar.hp) : null };
    },
    tp(x, z) { Game.teleportPlayer(x, z); return G.pl(); },
    // Face a point (camera yaw), so shooting aims at it.
    face(x, z) {
      const p = S.player;
      Game.camYaw = Math.atan2(-(x - p.x), -(z - p.z));
      return Game.camYaw;
    },
    // Face the nearest enemy (aim assist does the rest).
    aim() {
      let best = null, bd = 1e9;
      for (const e of People.enemies) {
        const d = Math.hypot(e.x - S.player.x, e.z - S.player.z);
        if (d < bd) { bd = d; best = e; }
      }
      if (best) G.face(best.x, best.z);
      return best ? { name: best.name, dist: +bd.toFixed(1), hp: best.hp } : null;
    },
    spawn(kind, x, z) {
      if (kind === 'enemy' || kind === 'cop') return People.spawnEnemy(Game.scene, x, z, 'Test ' + kind, 60);
      return Vehicles.spawn(kind, x, z, 0);
    },
    startMission(n) { return Missions.start(n); },
    startRace(n) { return Races.start(n); },
    give(cash, rp) { if (cash) S.cash += cash; if (rp) S.rp += rp; return G.state(); },
    god() { S.god = true; return true; },
    shot() { return document.querySelectorAll('canvas').length; },
    state() {
      return {
        mode: S.mode, cash: Math.floor(S.cash), rp: S.rp,
        hp: Math.ceil(S.hp), armor: Math.ceil(S.armor), wanted: S.wanted,
        missionsDone: S.missionsDone, mission: S.mission ? { id: S.mission.def.id, stage: S.mission.stage + 1, of: S.mission.def.stages.length, kills: S.killsThisMission, need: (Missions.currentStage() || {}).count || 0 } : null,
        race: S.race ? { id: S.race.def.id, cp: S.race.cp + 1, of: S.race.def.points.length, t: +S.race.timer.toFixed(1) } : null,
        racesDone: S.racesDone, packages: S.packages, stunts: S.stunts, fares: S.fares, exports: S.exports,
        kills: S.kills, carsStolen: S.carsStolen, completion: +completionPct().toFixed(1),
        enemies: People.enemies.length, policeCars: Police.cars.length, heli: !!Police.heli,
        cooldowns: S.crewCooldown.map((c) => Math.ceil(c)),
      };
    },
  };
})();
