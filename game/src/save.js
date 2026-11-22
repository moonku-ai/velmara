/* save.js — 3 localStorage slots + autosave. Stores cash, RP, missions, medals, districts, stats. */
VEL.Save = {
  key(slot) { return 'velmara_save_' + slot; },
  collect() {
    const S = VEL.State;
    return {
      v: 1, cash: S.cash, rp: S.rp, hp: S.hp, armour: S.armour,
      player: { x: S.player.x, z: S.player.z, heading: S.player.heading },
      missionsDone: Object.keys(VEL.Missions.done).map(Number),
      medals: VEL.Missions.medals,
      racesDone: Object.keys(VEL.Races.done), raceBest: VEL.Races.best,
      districts: VEL.Districts.list.map((d) => ({ id: d.id, standing: d.standing })),
      packagesGot: S.packagesGot, stuntsDone: S.stuntsDone, exportsDone: S.exportsDone,
      stats: S.stats, time: S.time, nextMission: S.nextMission || 1,
    };
  },
  apply(data) {
    const S = VEL.State;
    if (!data) return false;
    S.cash = data.cash; S.rp = data.rp; S.hp = data.hp; S.armour = data.armour || 0;
    S.player.x = data.player.x; S.player.z = data.player.z; S.player.heading = data.player.heading;
    VEL.Missions.done = {}; for (const id of data.missionsDone || []) VEL.Missions.done[id] = true;
    VEL.Missions.medals = data.medals || {};
    VEL.Races.done = {}; for (const id of data.racesDone || []) VEL.Races.done[id] = true;
    VEL.Races.best = data.raceBest || {};
    for (const d of data.districts || []) { const cur = VEL.Districts.list.find((x) => x.id === d.id); if (cur) cur.standing = d.standing; }
    S.packagesGot = data.packagesGot || []; S.stuntsDone = data.stuntsDone || []; S.exportsDone = data.exportsDone || 0;
    S.stats = Object.assign(S.stats, data.stats || {});
    S.time = data.time || 0; S.nextMission = data.nextMission || 1;
    return true;
  },
  save(slot) {
    try {
      localStorage.setItem(this.key(slot), JSON.stringify(this.collect()));
      VEL.HUD.toast('SAVED TO SLOT ' + slot);
      return true;
    } catch (e) { VEL.HUD.toast('SAVE FAILED'); return false; }
  },
  load(slot) {
    try {
      const raw = localStorage.getItem(this.key(slot));
      if (!raw) { VEL.HUD.toast('SLOT ' + slot + ' IS EMPTY'); return false; }
      const ok = this.apply(JSON.parse(raw));
      if (ok) VEL.HUD.toast('LOADED SLOT ' + slot + ' · $' + VEL.State.cash + ' · ' + Object.keys(VEL.Missions.done).length + ' missions done');
      return ok;
    } catch (e) { VEL.HUD.toast('LOAD FAILED'); return false; }
  },
  slotInfo(slot) {
    try {
      const raw = localStorage.getItem(this.key(slot));
      if (!raw) return 'SLOT ' + slot + ' — EMPTY';
      const d = JSON.parse(raw);
      return 'SLOT ' + slot + ' — $' + d.cash + ' · ' + (d.missionsDone || []).length + '/6 missions · ' + d.rp + ' RP';
    } catch (e) { return 'SLOT ' + slot + ' — CORRUPT'; }
  },
  autosave() { this.save(1); },
};
