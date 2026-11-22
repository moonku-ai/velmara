/* shots.js — ?shot= scenes: stage a real gameplay state, step it forward, flag __shotReady.
   play = M6 chase (wanted 5, heli, police, in car at speed)
   shootout = M2 on-foot night-market firefight
   stats = Tab career/map screen
   title = title screen over the lantern quarter */
VEL.Shots = {
  stage(name) {
    const S = VEL.State, G = VEL.Game;
    const seed = Number(new URLSearchParams(location.search).get('seed') || 1);
    VEL.RNG.setSeed(seed);
    if (name === 'title') {
      S.screen = 'title';
      return;
    }
    // common: enter play, new game state, rich HUD
    G.newGame();
    S.cash = 18450; S.rp = 3900; S.armour = 55; S.hp = 72;
    S.stats.carsStolen = 41; S.stats.copsEscaped = 12; S.stats.takenOut = 23; S.stats.distanceDriven = 48200;
    if (name === 'play') {
      // M6 chase: wanted 5, heli, in the gold getaway coupe at speed, police converging
      VEL.Missions.start(6);
      VEL.Missions.enterStage(2);
      const car = G.spawnMissionCar(0, 60, 0xff8a3d, 'SUNSET GT');
      car.speed = 34; car.heading = Math.PI;
      S.player.x = 0; S.player.z = 60; S.player.heading = Math.PI;
      G.enterCar(car);
      VEL.Police.setWanted(5);
      for (let i = 0; i < 3; i++) VEL.Police.spawnUnit();
      VEL.Districts.bump('kumala', 8);
      VEL.HUD.dialog('CHIEF DARA VOSS', 'Solano. You have robbed my island long enough. Tonight the Grand Lantern burns — and so do you.');
      VEL.HUD.toast('MISSION 6 · THE GRAND LANTERN — ESCAPE TO THE MARINA');
    } else if (name === 'shootout') {
      // M2 on-foot firefight at the canal market, night
      VEL.Missions.start(2);
      VEL.Missions.enterStage(1);
      S.player.x = -105; S.player.z = 40; S.player.heading = Math.PI;
      S.player.mesh.position.set(-105, 0, 40);
      S.weaponIdx = 2; // SMG
      VEL.Police.setWanted(2);
      VEL.HUD.dialog('IVO MAREK', 'Duck by a stall to hide. Clear the aisles, Rhea — the package is in the lantern case.');
      VEL.HUD.toast('MISSION 2 · CANAL PICKUP — CLEAR THE AISLES');
    } else if (name === 'stats') {
      // career screen with progress already earned
      VEL.Missions.done = { 1: true, 2: true, 3: true, 4: true, 5: true };
      VEL.Missions.medals = { 1: 'GOLD', 2: 'SILVER', 3: 'GOLD', 4: 'BRONZE', 5: 'SILVER' };
      VEL.Races.done = { lantern: true }; VEL.Races.best = { lantern: 74.3 };
      S.packagesGot = VEL.CFG.packages.slice(0, 6).map((p) => p[0] + ',' + p[1]);
      S.stuntsDone = VEL.CFG.stunts.slice(0, 3).map((p) => p[0] + ',' + p[1]);
      S.exportsDone = 2; S.stats.taxiFares = 2;
      S.stats.missionsDone = 5; S.stats.racesWon = 1; S.stats.cashEarned = 21400; S.stats.crewUses = 9;
      S.cash = 18450; S.rp = 3900;
      VEL.Districts.list[0].standing = 74; VEL.Districts.list[1].standing = 74; VEL.Districts.list[2].standing = 70; VEL.Districts.list[4].standing = 34;
      S.screen = 'play'; S.playing = true;
      VEL.HUD.showHud();
      S.statsOpen = true; VEL.HUD.showStats();
    }
    // step the world forward so motion, AI and HUD settle
    for (let i = 0; i < 150; i++) G.update(1 / 60);
    if (name === 'play') {
      // drive forward a bit so the chase reads at speed
      VEL.Input.keys.KeyW = true;
      for (let i = 0; i < 120; i++) G.update(1 / 60);
      VEL.Input.keys.KeyW = false;
    }
    if (name === 'shootout') {
      for (let i = 0; i < 90; i++) G.update(1 / 60);
    }
    window.__shotReady = true;
  },
};
