/* main.js — boot: seed from ?seed=, stage ?shot= scenes, expose debug hooks G.step/G.press/G.pl.
   Fixed 1/60s simulation steps; the render loop just paints. */
(function boot() {
  const params = new URLSearchParams(location.search);
  const seedParam = Number.parseInt(params.get('seed') || '', 10);
  const seed = Number.isInteger(seedParam) ? seedParam : 7;
  VEL.RNG.setSeed(seed);
  VEL.Game.init();
  const shot = params.get('shot');
  if (params.get('god') !== null) VEL.State.god = true;
  if (shot) {
    // ?auto skips the title screen straight into play
    VEL.Shots.stage(shot);
    window.__shotReady = true;
  } else if (params.get('auto') !== null) {
    VEL.Game.newGame();
  }
  // ---- debug hooks (guizang style) ----
  const G = window.G = {
    state: VEL.State, cfg: VEL.CFG,
    step(n, dt) {
      n = n || 60; dt = dt || 1 / 60;
      for (let i = 0; i < n; i++) VEL.Game.update(dt);
      VEL.Game.renderer.render(VEL.Game.scene, VEL.Game.camera);
      return G.pl();
    },
    upd(n, dt) {
      n = n || 60; dt = dt || 1 / 60;
      for (let i = 0; i < n; i++) VEL.Game.update(dt);
      return G.pl();
    },
    press(...codes) { for (const c of codes) VEL.Input.pressed[c] = true; return G.pl(); },
    keys(...codes) { for (const c of codes) VEL.Input.keys[c] = true; },
    unkeys(...codes) { for (const c of codes) VEL.Input.keys[c] = false; },
    pl() {
      const S = VEL.State;
      return {
        screen: S.screen, playing: S.playing, dead: S.dead, hp: Math.round(S.hp), cash: S.cash, rp: S.rp,
        wanted: S.wanted, inCar: S.inCar, carHp: S.car ? Math.round(S.car.hp) : null,
        speed: S.car ? Math.round(Math.abs(S.car.speed) * 3.6) : 0,
        x: Math.round(S.player.x), z: Math.round(S.player.z),
        mission: VEL.Missions.active ? VEL.Missions.active.id : null,
        stage: VEL.Missions.active ? VEL.Missions.stageIdx : null,
        missionsDone: Object.keys(VEL.Missions.done).length,
        racesDone: Object.keys(VEL.Races.done).length,
        police: VEL.Police.units.length, heli: !!VEL.Police.heli,
        enemies: VEL.People.enemies.filter((e) => !e.dead).length,
        packages: S.packagesGot.length, stunts: S.stuntsDone.length,
        taxiFares: S.stats.taxiFares, exports: S.exportsDone,
        completion: VEL.Stats.completion(),
      };
    },
    teleport(x, z) { const S = VEL.State; S.player.x = x; S.player.z = z; if (S.inCar && S.car) { S.car.x = x; S.car.z = z; } S.player.mesh.position.set(x, 0, z); return G.pl(); },
    setWanted(n) { VEL.Police.setWanted(n); return G.pl(); },
    startMission(id) { VEL.Missions.start(id); return G.pl(); },
    startRace(id) { VEL.Races.start(id); return G.pl(); },
    spawn(kind, x, z) {
      if (kind === 'enemy') return VEL.People.spawnEnemy(x, z, {});
      if (kind === 'car') return VEL.Vehicles.spawnCar(x, z, 0, {});
      return null;
    },
    shoot() { VEL.Combat.tryFire(); return G.pl(); },
    save(slot) { return VEL.Save.save(slot || 1); },
    load(slot) { return VEL.Save.load(slot || 1); },
  };
  window.__gameReady = true;
})();
