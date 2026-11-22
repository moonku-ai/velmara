// Screenshot presets (?shot=...). Each one stages a real gameplay moment
// through the same systems the player uses — no fake overlays, no
// composited images. The cover is always mid-chase, wanted 5, heli up.
const Shots = {
  apply(name) {
    const scene = Game.scene;
    if (!scene) return;
    if (name === 'title') { Game.showTitle(); return; }
    Game.hideTitle();
    if (name === 'play') {
      Missions.start(1);
      return;
    }
    if (name === 'chase') {
      // M6 finale: stage 4/4, wanted 5, heli overhead, Rhea in the orange
      // Comet doing 90+ km/h down the marina road with pursuit behind.
      Missions.start(6);
      S.mission.stage = 3;
      S.mission.damageTaken = 12;
      Missions.showStage();
      Police.setWanted(5);
      const car = Vehicles.spawn('comet', 0, 110, Math.PI, 0xff7a2a);
      scene.add(car.mesh);
      Game.enterCar(car);
      car.speed = 26;
      car.hp = 62;
      S.cash = 13750; S.rp = 1740;
      for (let i = 0; i < 3; i++) Police.spawnPursuit(scene);
      Police.makeHeli(scene);
      HUD.dialog('Ivo Marek', 'The whole island is on you now, Rhea. Marina boat, straight ahead — do not stop!');
      return;
    }
    if (name === 'shootout') {
      // M2 night market: stage 2/3, four shooters ahead, Rhea on foot
      // with the SMG, tracers in the dark.
      Missions.start(2);
      S.mission.stage = 1;
      Missions.showStage();
      Missions.spawnStageEnemies(Missions.currentStage());
      Game.teleportPlayer(-120, 14);
      Game.camYaw = 0; // face north (-z) into the market
      Combat.switchWeapon(2);
      S.ammo[2] = 120;
      S.cash = 3250; S.rp = 350;
      Police.setWanted(2);
      HUD.dialog('Ivo Marek', 'They knew you were coming. Duck by a stall to hide — then clear the aisles.');
      return;
    }
    if (name === 'stats') {
      // A late-game career for the stats screen: 6/6 missions, medals,
      // races, packages, standing — the full completion picture.
      S.cash = 14630; S.rp = 1860;
      S.missionsDone = 6;
      S.missionRatings = { 1: 'G', 2: 'S', 3: 'G', 4: 'S', 5: 'G', 6: 'G' };
      S.racesDone = 1; S.raceWins = { 2: 'G' };
      S.packages = 4; S.packagesFound = { 0: true, 1: true, 2: true, 3: true };
      S.stunts = 2; S.stuntsDone = { 0: true, 1: true };
      S.fares = 1; S.exports = 1;
      S.kills = 18; S.carsStolen = 7; S.distanceKm = 48.2; S.copsEscaped = 12;
      S.stats.shots = 120; S.stats.hits = 71;
      S.districtStanding['Lantern Quarter'] = 78;
      S.districtStanding['Old Pasaru'] = 74;
      S.districtStanding['Banyan Green'] = 70;
      S.districtStanding['Kumala Strand'] = 58;
      S.districtStanding['Ridge Town'] = 41;
      Stats.open = false;
      Stats.toggle();
      return;
    }
    // Unknown ?shot= value: plain gameplay.
  },
};
