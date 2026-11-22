/* crew.js — 3 crew abilities on Z/X/C with cooldowns, shown as HUD cards. */
VEL.Crew = {
  cds: [0, 0, 0], eyesTimer: 0,
  update(dt) {
    for (let i = 0; i < 3; i++) if (this.cds[i] > 0) this.cds[i] -= dt;
    if (this.eyesTimer > 0) this.eyesTimer -= dt;
    VEL.HUD.updateCrew(this.cds);
  },
  use(i) {
    const S = VEL.State;
    if (this.cds[i] > 0) { VEL.HUD.toast('CREW NOT READY — ' + Math.ceil(this.cds[i]) + 's'); return false; }
    const def = VEL.CFG.crew[i];
    this.cds[i] = def.cd;
    S.stats.crewUses++;
    if (i === 0) {
      if (S.wanted > 0) { VEL.Police.setWanted(S.wanted - 1); VEL.HUD.toast('DARA — SWAP PLATES · wanted down to ' + S.wanted); }
      else VEL.HUD.toast('DARA — SWAP PLATES · already clean');
    } else if (i === 1) {
      if (S.inCar && S.car) { S.car.hp = 100; VEL.HUD.toast('BENI — QUICK FIX · car repaired to 100%'); }
      else { S.hp = Math.min(100, S.hp + 40); VEL.HUD.toast('BENI — QUICK FIX · patched you up +40 HP'); }
    } else {
      this.eyesTimer = 20;
      VEL.HUD.toast('LANA — EYES OUT · all VPD units marked on the minimap');
    }
    VEL.Audio.pickup();
    return true;
  },
  eyesOn() { return this.eyesTimer > 0; },
};
