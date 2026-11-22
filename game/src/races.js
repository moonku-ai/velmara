/* races.js — 4 street races: checkpoint gates, timer, best times, prize + RP. */
VEL.Races = {
  active: null, best: {}, done: {}, gateMeshes: [],
  start(raceId) {
    const def = VEL.CFG.races.find((r) => r.id === raceId);
    if (!def || this.active) return;
    this.active = { def, cp: 0, t: 0 };
    VEL.State.race = def;
    VEL.HUD.toast('RACE STARTED · ' + def.name + ' — hit every gold gate!');
    VEL.HUD.setMission({ id: 0, name: def.name, stages: def.cps }, 0);
    this.buildGates(def);
    this.updateGate();
    VEL.Audio.pickup();
  },
  buildGates(def) {
    this.clearGates();
    for (const [x, z] of def.cps) {
      const gate = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xffd24d, transparent: true, opacity: 0.85 });
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 6, 8), mat);
        post.position.set(s * 5, 3, 0); gate.add(post);
      }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.5, 0.5), mat);
      bar.position.y = 6; gate.add(bar);
      gate.position.set(x, 0, z);
      VEL.Game.scene.add(gate);
      this.gateMeshes.push(gate);
    }
  },
  clearGates() { for (const g of this.gateMeshes) VEL.Game.scene.remove(g); this.gateMeshes = []; },
  updateGate() {
    const a = this.active; if (!a) return;
    const [x, z] = a.def.cps[a.cp];
    VEL.City.setMarker(x, z, true);
    VEL.HUD.setObjective('RACE · ' + a.def.name + ' — GATE ' + (a.cp + 1) + '/' + a.def.cps.length + ' · ' + a.t.toFixed(1) + 's');
  },
  update(dt) {
    const a = this.active; if (!a) return;
    a.t += dt;
    const S = VEL.State;
    const [x, z] = a.def.cps[a.cp];
    const d = Math.hypot(x - S.player.x, z - S.player.z);
    if (d < 7) {
      VEL.Audio.pickup();
      a.cp++;
      if (a.cp >= a.def.cps.length) this.finish();
      else this.updateGate();
    }
    if (a.t > 240) { VEL.HUD.toast('RACE FAILED — TOO SLOW'); this.abort(); }
  },
  finish() {
    const a = this.active; if (!a) return;
    const S = VEL.State;
    const prev = this.best[a.def.id];
    const isBest = !prev || a.t < prev;
    if (isBest) this.best[a.def.id] = a.t;
    this.done[a.def.id] = true;
    S.cash += a.def.prize; S.rp += a.def.rp; S.stats.racesWon++; S.stats.cashEarned += a.def.prize;
    VEL.HUD.toast('RACE WON · ' + a.def.name + ' · ' + a.t.toFixed(1) + 's' + (isBest ? ' · NEW BEST!' : '') + ' · +$' + a.def.prize);
    VEL.Audio.missionPass(); VEL.Audio.cash();
    VEL.City.setMarker(0, 0, false);
    this.clearGates();
    this.active = null; S.race = null;
    VEL.Save.autosave();
  },
  abort() { this.clearGates(); this.active = null; VEL.State.race = null; VEL.City.setMarker(0, 0, false); },
  nearestRaceStart(x, z) {
    let best = null, bd = 12;
    for (const r of VEL.CFG.races) {
      const [sx, sz] = r.cps[0];
      const d = Math.hypot(sx - x, sz - z);
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  },
};
