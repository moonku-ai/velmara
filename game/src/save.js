// Save / load: three localStorage slots. A slot stores cash, RP, progress,
// standing and the player position — enough to pick up exactly where the
// player left off.
const SaveSys = {
  key(slot) { return 'velmara_save_' + slot; },

  snapshot() {
    return {
      v: 1, cash: S.cash, rp: S.rp, hp: S.hp, armor: S.armor,
      ammo: S.ammo.slice(), weapon: S.weapon,
      missionsDone: S.missionsDone, missionRatings: { ...S.missionRatings },
      racesDone: S.racesDone, raceWins: { ...S.raceWins },
      packages: S.packages, packagesFound: { ...S.packagesFound },
      stunts: S.stunts, stuntsDone: { ...S.stuntsDone },
      fares: S.fares, exports: S.exports, kills: S.kills,
      carsStolen: S.carsStolen, distanceKm: S.distanceKm, copsEscaped: S.copsEscaped,
      districtStanding: { ...S.districtStanding },
      player: { x: S.player.x, z: S.player.z, yaw: S.player.yaw },
      time: S.time, savedAt: new Date().toISOString(),
    };
  },

  save(slot) {
    try {
      localStorage.setItem(SaveSys.key(slot), JSON.stringify(SaveSys.snapshot()));
      HUD.toast(`Saved to slot ${slot}.`);
      return true;
    } catch (e) {
      HUD.toast('Save failed — storage unavailable.');
      return false;
    }
  },

  load(slot) {
    try {
      const raw = localStorage.getItem(SaveSys.key(slot));
      if (!raw) { HUD.toast(`Slot ${slot} is empty.`); return false; }
      const d = JSON.parse(raw);
      S.cash = d.cash; S.rp = d.rp; S.hp = d.hp; S.armor = d.armor;
      S.ammo = d.ammo.slice(); S.weapon = d.weapon;
      S.missionsDone = d.missionsDone; S.missionRatings = d.missionRatings;
      S.racesDone = d.racesDone; S.raceWins = d.raceWins;
      S.packages = d.packages; S.packagesFound = d.packagesFound;
      S.stunts = d.stunts; S.stuntsDone = d.stuntsDone;
      S.fares = d.fares; S.exports = d.exports; S.kills = d.kills;
      S.carsStolen = d.carsStolen; S.distanceKm = d.distanceKm; S.copsEscaped = d.copsEscaped;
      S.districtStanding = d.districtStanding;
      S.player.x = d.player.x; S.player.z = d.player.z; S.player.yaw = d.player.yaw;
      S.time = d.time || 0;
      S.wanted = 0;
      Missions.abort(); Races.abort();
      Game.teleportPlayer(d.player.x, d.player.z);
      HUD.toast(`Loaded slot ${slot} — welcome back, Rhea.`);
      return true;
    } catch (e) {
      HUD.toast('Load failed — save is corrupt.');
      return false;
    }
  },

  slotInfo(slot) {
    try {
      const raw = localStorage.getItem(SaveSys.key(slot));
      if (!raw) return null;
      const d = JSON.parse(raw);
      return { cash: d.cash, missions: d.missionsDone, time: d.time || 0, savedAt: d.savedAt };
    } catch (e) { return null; }
  },
};
