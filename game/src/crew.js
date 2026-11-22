// Crew abilities (Z / X / C). Each has a cooldown; the HUD cards show
// readiness. Abilities are the same three the rank-1 artifact shows:
// Swap Plates, Quick Fix, Eyes Out.
const Crew = {
  use(i) {
    const c = CREW[i];
    if (!c) return false;
    if (S.crewCooldown[i] > 0) {
      HUD.toast(`${c.ability} recharging — ${Math.ceil(S.crewCooldown[i])}s`);
      return false;
    }
    S.crewCooldown[i] = c.cooldown;
    if (i === 0) {
      // Mara swaps the plates: lose one wanted star.
      if (S.wanted > 0) {
        Police.setWanted(S.wanted - 1, true);
        HUD.toast('MARA — SWAP PLATES: one star gone.');
      } else {
        HUD.toast('MARA — SWAP PLATES: no heat to lose.');
      }
    } else if (i === 1) {
      // Tomas fixes the car on the spot.
      const car = S.player.inCar;
      if (car) {
        car.hp = car.maxHp;
        HUD.toast('TOMAS — QUICK FIX: car fully repaired.');
      } else {
        HUD.toast('TOMAS — QUICK FIX: get in a car first.');
      }
    } else if (i === 2) {
      // Lena marks every police unit on the minimap for 20 seconds.
      S.eyesOutUntil = S.time + 20;
      HUD.toast('LENA — EYES OUT: police marked on the map.');
    }
    AudioSys.pickup();
    return true;
  },

  update(dt) {
    for (let i = 0; i < 3; i++) S.crewCooldown[i] = Math.max(0, S.crewCooldown[i] - dt);
  },
};
