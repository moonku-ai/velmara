// Street races: checkpoint chains on the road grid with a timer.
// Start one from the race board (or the R key at a race start line).
// Drive through each glowing ring in order; beat par for a gold medal.
const Races = {
  marker: null, startLine: null,

  start(id) {
    const def = RACES.find((r) => r.id === id);
    if (!def || S.race || !S.player.inCar) return false;
    S.race = { def, cp: 0, timer: 0 };
    HUD.banner(`STREET RACE · ${def.name.toUpperCase()}`, 'CHECKPOINT 1/' + def.points.length, 'Hit every ring in order. Beat the par time for gold.');
    Races.placeMarker();
    AudioSys.mission();
    return true;
  },

  placeMarker() {
    const scene = City.scene;
    if (Races.marker && Races.marker.parent) Races.marker.parent.remove(Races.marker);
    const r = S.race;
    if (!scene || !r) return;
    const [x, z] = r.def.points[r.cp];
    Races.marker = City.makeMarker(0x37e0c8);
    Races.marker.position.set(x, 0, z);
    scene.add(Races.marker);
  },

  clearMarker() {
    if (Races.marker && Races.marker.parent) Races.marker.parent.remove(Races.marker);
    Races.marker = null;
  },

  update(dt) {
    const r = S.race;
    if (!r) return;
    r.timer += dt;
    const [x, z] = r.def.points[r.cp];
    const p = S.player;
    const d = Math.hypot(p.x - x, p.z - z);
    HUD.objective(`RACE ${r.def.name} — checkpoint ${r.cp + 1}/${r.def.points.length} · ${r.timer.toFixed(1)}s · ${Math.round(d)}m`);
    if (d < 7) {
      AudioSys.pickup();
      r.cp++;
      if (r.cp >= r.def.points.length) { Races.finish(); return; }
      HUD.banner(`STREET RACE · ${r.def.name.toUpperCase()}`, `CHECKPOINT ${r.cp + 1}/${r.def.points.length}`, `${r.timer.toFixed(1)}s — keep it pinned.`);
      Races.placeMarker();
    }
    if (Races.marker) {
      const s = 1 + Math.sin(S.time * 4) * 0.1;
      Races.marker.scale.set(s, 1, s);
    }
  },

  finish() {
    const r = S.race;
    if (!r) return;
    const medal = r.timer <= r.def.par ? 'G' : r.timer <= r.def.par * 1.3 ? 'S' : 'B';
    S.cash += r.def.reward;
    S.rp += r.def.rp;
    S.racesDone++;
    S.raceWins[r.def.id] = medal;
    HUD.toast(`RACE WON — ${r.def.name} in ${r.timer.toFixed(1)}s  +$${r.def.reward}  +${r.def.rp} RP  [${medal}]`);
    AudioSys.mission();
    Races.clearMarker();
    S.race = null;
    Game.refreshMissionBoard();
  },

  abort() {
    Races.clearMarker();
    S.race = null;
  },
};
