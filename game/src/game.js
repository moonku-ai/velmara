/* game.js — game state, three.js boot, player + car control, camera, interactions,
   taxi/packages/stunts/shops/export, damage + WASTED, the per-frame update. */
VEL.State = {
  screen: 'title', playing: false, paused: false, statsOpen: false, dead: false, god: false,
  time: 0, cash: VEL.CFG.startCash, rp: 0, hp: 100, armour: 0,
  wanted: 0, wantedFrac: 1, inMissionHeat: false,
  player: { x: 0, z: 120, heading: Math.PI, mesh: null },
  inCar: false, car: null, weaponIdx: 1, mission: null, race: null,
  nextMission: 1, storyComplete: false, damageTaken: 0, killsThisMission: 0, missionStart: 0,
  gunfireTimer: 0, packagesGot: [], stuntsDone: [], exportsDone: 0,
  taxi: null, taxiTimer: 0, interactTarget: null,
  stats: { carsStolen: 0, copsEscaped: 0, takenOut: 0, shotsFired: 0, shotsHit: 0, distanceDriven: 0, cashEarned: 0, crewUses: 0, missionsDone: 0, racesWon: 0, taxiFares: 0 },
};

VEL.Game = {
  renderer: null, scene: null, camera: null, canvas: null, camYaw: 0, camPitch: 0.32, camDist: 13,
  missionCar: null, lastWanted: 0,
  init() {
    this.canvas = document.getElementById('c');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x141a38);
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1200);
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    VEL.City.build(this.scene);
    VEL.Districts.init();
    VEL.HUD.init();
    VEL.Input.init(this.canvas);
    VEL.Audio.init();
    // player mesh: Rhea Solano — teal jacket, gold hair band
    const mesh = VEL.People.makeHumanMesh(0x2a8a7a, 0x1a1a2a, 0xc98a5e);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.05, 6, 12), new THREE.MeshBasicMaterial({ color: 0xffd24d }));
    band.position.y = 1.82; band.rotation.x = Math.PI / 2; mesh.add(band);
    this.scene.add(mesh);
    VEL.State.player.mesh = mesh;
    this.resetPlayer();
    VEL.Vehicles.spawnTraffic(14);
    VEL.People.spawnPeds(26);
    // parked cars to steal
    VEL.Vehicles.spawnCar(42, 126, 0, { color: 0xff8a3d, name: 'SUNSET GT' });
    VEL.Vehicles.spawnCar(-42, 42, Math.PI / 2, { color: 0x37e08a, name: 'BANYAN X' });
    VEL.Vehicles.spawnCar(126, -42, -Math.PI / 2, { color: 0xc9a2ff, name: 'RIDGE RUNNER' });
    // export list cars (gold markers handled by HUD objective when near)
    VEL.HUD.toast('Welcome to Velmara — steal a car, press ENTER to start Mission 1');
    this.bindTitle();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  },
  bindTitle() {
    document.getElementById('btn-new').addEventListener('click', () => this.newGame());
    document.getElementById('btn-continue').addEventListener('click', () => { if (VEL.Save.load(1)) this.startPlay(); else this.newGame(); });
    document.getElementById('btn-load').addEventListener('click', () => { if (VEL.Save.load(1)) this.startPlay(); });
    document.getElementById('btn-how').addEventListener('click', () => document.getElementById('title-how').classList.toggle('hidden'));
    VEL.Stats.render();
  },
  resetPlayer() {
    const S = VEL.State;
    S.player.x = VEL.CFG.startPos.x; S.player.z = VEL.CFG.startPos.z; S.player.heading = Math.PI;
    S.player.mesh.position.set(S.player.x, 0, S.player.z);
  },
  newGame() {
    const S = VEL.State;
    S.cash = VEL.CFG.startCash; S.rp = 0; S.hp = 100; S.armour = 0; S.wanted = 0;
    S.packagesGot = []; S.stuntsDone = []; S.exportsDone = 0; S.nextMission = 1; S.storyComplete = false;
    S.stats = { carsStolen: 0, copsEscaped: 0, takenOut: 0, shotsFired: 0, shotsHit: 0, distanceDriven: 0, cashEarned: 0, crewUses: 0, missionsDone: 0, racesWon: 0, taxiFares: 0 };
    VEL.Missions.done = {}; VEL.Missions.medals = {}; VEL.Races.done = {}; VEL.Races.best = {};
    VEL.Districts.init();
    this.resetPlayer();
    this.startPlay();
    VEL.Missions.start(1);
  },
  startPlay() {
    const S = VEL.State;
    S.screen = 'play'; S.playing = true; S.dead = false;
    VEL.HUD.showHud(); VEL.HUD.hideWasted();
    VEL.Audio.resume();
    if (VEL.Missions.active) VEL.HUD.setMission(VEL.Missions.active.def, VEL.Missions.stageIdx);
    else if (S.nextMission) VEL.HUD.toast('Press ENTER to start Mission ' + S.nextMission + ' · ' + VEL.CFG.missions[S.nextMission - 1].name);
    VEL.HUD.setObjective('Press ENTER to start Mission ' + S.nextMission);
  },
  spawnMissionCar(x, z, color, name, truck) {
    if (this.missionCar) VEL.Vehicles.removeCar(this.missionCar);
    this.missionCar = VEL.Vehicles.spawnCar(x, z, 0, { color, name, mission: true, truck: !!truck });
    return this.missionCar;
  },
  enterCar(car) {
    const S = VEL.State;
    S.inCar = true; S.car = car; S.player.mesh.visible = false;
    S.stats.carsStolen++;
    if (car.mission) VEL.HUD.toast('GETAWAY CAR STOLEN — GO!');
    else VEL.HUD.toast(car.name + ' STOLEN');
    if (car.isPolice) VEL.Police.addWanted(1);
    else VEL.Police.addWanted(0);
    VEL.Audio.engine(0);
  },
  exitCar() {
    const S = VEL.State;
    if (!S.car) return;
    S.player.x = S.car.x + Math.sin(S.car.heading + Math.PI / 2) * 3;
    S.player.z = S.car.z + Math.cos(S.car.heading + Math.PI / 2) * 3;
    S.inCar = false; S.car = null; S.player.mesh.visible = true;
  },
  damagePlayer(dmg, src) {
    const S = VEL.State;
    if (S.god || S.dead || !S.playing) return;
    if (S.armour > 0) { const absorbed = Math.min(S.armour, dmg * 0.6); S.armour -= absorbed; dmg -= absorbed; }
    S.hp -= dmg; S.damageTaken += dmg;
    document.getElementById('vignette').style.background = 'radial-gradient(ellipse at center,transparent 40%,rgba(180,0,20,.55) 100%)';
    setTimeout(() => { document.getElementById('vignette').style.background = ''; }, 220);
    if (S.hp <= 0) this.wasted();
  },
  carDamage(car, d) {
    const S = VEL.State;
    if (S.inCar && S.car === car) {
      S.car.hp -= d;
      if (S.car.hp <= 0) { S.car.hp = 0; VEL.HUD.toast('CAR WRECKED!'); VEL.Audio.crash(); this.exitCar(); }
    } else if (car && !car.isTraffic) {
      car.hp = Math.max(10, (car.hp || 100) - d); // police cars dent, never wreck from a wall
    }
  },
  wasted() {
    const S = VEL.State;
    S.dead = true; S.playing = false;
    VEL.HUD.showWasted();
    VEL.Audio.tone(110, 1.2, 'sawtooth', 0.2, 40);
    VEL.Missions.fail('Rhea went down');
  },
  retry() {
    const S = VEL.State;
    S.hp = 100; S.armour = 0; S.dead = false;
    VEL.Police.setWanted(0);
    this.resetPlayer();
    if (S.inCar) { S.inCar = false; S.car = null; S.player.mesh.visible = true; }
    VEL.HUD.hideWasted();
    S.playing = true;
    if (VEL.Missions.currentId && !VEL.Missions.done[VEL.Missions.currentId]) VEL.Missions.start(VEL.Missions.currentId);
  },
  // ---- interactions: taxi, packages, stunts, shops, export, race starts ----
  nearestInteract() {
    const S = VEL.State, p = S.player;
    const near = (x, z, r) => Math.hypot(x - p.x, z - p.z) < r;
    // small-radius pickups first: a parked car must not shadow a package or stunt
    for (const [x, z] of VEL.CFG.packages) if (!S.packagesGot.includes(x + ',' + z) && near(x, z, 4)) return { kind: 'package', x, z, text: 'COLLECT HIDDEN PACKAGE' };
    for (const [x, z] of VEL.CFG.stunts) if (!S.stuntsDone.includes(x + ',' + z) && near(x, z, 6)) return { kind: 'stunt', x, z, text: 'STUNT JUMP — DRIVE THROUGH FAST' };
    if (!S.inCar) {
      const car = VEL.Vehicles.nearestCar(p.x, p.z, 5);
      if (car) return { kind: 'car', car, text: 'STEAL ' + car.name };
    }
    const sh = VEL.CFG.shops;
    if (near(sh.gun.x, sh.gun.z, 6)) return { kind: 'gunshop', text: 'BUY AMMO ($200) / ARMOUR ($300)' };
    if (near(sh.spray.x, sh.spray.z, 6)) return { kind: 'spray', text: 'RESPRAY — CLEAR WANTED ($150)' };
    if (near(sh.safehouse.x, sh.safehouse.z, 6)) return { kind: 'safehouse', text: 'SAFEHOUSE — SAVE GAME' };
    const race = VEL.Races.nearestRaceStart(p.x, p.z);
    if (race && !VEL.Races.active) return { kind: 'race', race, text: 'START RACE · ' + race.name + ' ($' + race.prize + ')' };
    if (S.inCar && !S.taxi) for (const [x, z] of VEL.CFG.taxiStands) if (near(x, z, 8)) return { kind: 'taxi', x, z, text: 'PICK UP TAXI FARE' };
    if (S.inCar && S.car && S.car.name === 'SUNSET GT' && near(0, -168, 10) && S.exportsDone < 3) return { kind: 'export', text: 'EXPORT CAR — DELIVER TO MARINA ($600)' };
    return null;
  },
  doInteract(it) {
    const S = VEL.State;
    if (it.kind === 'car') this.enterCar(it.car);
    else if (it.kind === 'package') {
      S.packagesGot.push(it.x + ',' + it.z); S.cash += 250; S.rp += 25; S.stats.cashEarned += 250;
      VEL.Audio.pickup(); VEL.HUD.toast('HIDDEN PACKAGE +$250 · ' + S.packagesGot.length + '/10');
      VEL.Districts.bump(VEL.Districts.current(it.x, it.z).id, 2);
    } else if (it.kind === 'stunt') {
      S.stuntsDone.push(it.x + ',' + it.z); S.cash += 300; S.rp += 30;
      VEL.HUD.toast('STUNT JUMP! +$300 · ' + S.stuntsDone.length + '/5'); VEL.Audio.missionPass();
    } else if (it.kind === 'gunshop') {
      const f = VEL.Districts.priceFactor(it.x || S.player.x, it.z || S.player.z);
      if (S.cash >= Math.round(200 * f)) { S.cash -= Math.round(200 * f); VEL.Combat.mags = [Infinity, 12, 30, 6]; VEL.HUD.toast('AMMO RESTOCKED · HARBOUR ARMS'); VEL.Audio.cash(); }
      else VEL.HUD.toast('NOT ENOUGH CASH');
    } else if (it.kind === 'spray') {
      if (S.cash >= 150 && S.wanted > 0) { S.cash -= 150; VEL.Police.setWanted(0); VEL.HUD.toast('RESPRAYED — CLEAN SLATE'); VEL.Audio.cash(); }
      else if (S.wanted === 0) VEL.HUD.toast('ALREADY CLEAN — NO RESPRAY NEEDED');
      else VEL.HUD.toast('NOT ENOUGH CASH');
    } else if (it.kind === 'safehouse') { VEL.Save.save(1); VEL.HUD.toast('SAFEHOUSE — GAME SAVED'); }
    else if (it.kind === 'race') VEL.Races.start(it.race.id);
    else if (it.kind === 'taxi') {
      const dest = VEL.RNG.pick(VEL.CFG.taxiStands);
      S.taxi = { dest, fare: 180 }; S.taxiTimer = 60;
      VEL.City.setMarker(dest[0], dest[1], true);
      VEL.HUD.toast('TAXI FARE — deliver the passenger! 60s');
    } else if (it.kind === 'export') {
      S.exportsDone++; S.cash += 600; S.rp += 50; S.stats.cashEarned += 600;
      VEL.HUD.toast('CAR EXPORTED +$600 · ' + S.exportsDone + '/3'); VEL.Audio.cash();
      if (S.car) VEL.Vehicles.removeCar(S.car);
      S.inCar = false; S.car = null; S.player.mesh.visible = true;
    }
  },
  updatePlayer(dt) {
    const S = VEL.State, I = VEL.Input;
    const ax = I.axis();
    if (S.inCar && S.car) {
      const throttle = ax.y < 0 ? 1 : ax.y > 0 ? -0.7 : 0;
      VEL.Vehicles.drive(S.car, throttle, ax.x, dt);
      S.player.x = S.car.x; S.player.z = S.car.z; S.player.heading = S.car.heading;
      S.stats.distanceDriven += Math.abs(S.car.speed) * dt;
      VEL.Audio.engine(Math.abs(S.car.speed) / VEL.CFG.carMax);
      if (I.hit('KeyF')) this.exitCar();
    } else {
      const run = I.down('ShiftLeft') || I.down('ShiftRight');
      const sp = run ? VEL.CFG.playerRun : VEL.CFG.playerSpeed;
      // camera-relative movement
      const fwd = { x: Math.sin(this.camYaw), z: Math.cos(this.camYaw) };
      const right = { x: Math.cos(this.camYaw), z: -Math.sin(this.camYaw) };
      let mx = fwd.x * -ax.y + right.x * ax.x, mz = fwd.z * -ax.y + right.z * ax.x;
      const len = Math.hypot(mx, mz);
      if (len > 0) {
        mx /= len; mz /= len;
        const nx = S.player.x + mx * sp * dt, nz = S.player.z + mz * sp * dt;
        const c = VEL.City.collide(nx, nz, 0.6);
        S.player.x = c.x; S.player.z = c.z;
        S.player.heading = Math.atan2(mx, mz);
        const mesh = S.player.mesh;
        mesh.position.set(S.player.x, 0, S.player.z);
        mesh.rotation.y = S.player.heading;
        const t = S.time * 10;
        mesh.userData.legs[0].rotation.x = Math.sin(t) * 0.7; mesh.userData.legs[1].rotation.x = -Math.sin(t) * 0.7;
        mesh.userData.arms[0].rotation.x = -Math.sin(t) * 0.5; mesh.userData.arms[1].rotation.x = Math.sin(t) * 0.5;
      }
      VEL.Audio.engine(0);
      // mouse-aim yaw when shooting (on foot, camera follows behind player heading)
      if (VEL.Input.mouseDown) VEL.Combat.tryFire();
    }
    // weapon switching
    for (let i = 0; i < 4; i++) if (I.hit('Digit' + (i + 1))) { S.weaponIdx = i; VEL.HUD.toast(VEL.CFG.weapons[i].name + ' EQUIPPED'); }
    if (I.hit('KeyR')) VEL.Combat.reload();
    // crew abilities
    if (I.hit('KeyZ')) VEL.Crew.use(0);
    if (I.hit('KeyX')) VEL.Crew.use(1);
    if (I.hit('KeyC')) VEL.Crew.use(2);
    // interact
    const it = this.nearestInteract();
    S.interactTarget = it;
    const el = document.getElementById('interact');
    if (it && !S.dead) { el.classList.remove('hidden'); document.getElementById('interact-text').textContent = it.text; }
    else el.classList.add('hidden');
    if (it && I.hit('KeyE')) this.doInteract(it);
    // taxi delivery
    if (S.taxi) {
      S.taxiTimer -= dt;
      const d = Math.hypot(S.taxi.dest[0] - S.player.x, S.taxi.dest[1] - S.player.z);
      VEL.HUD.setObjective('TAXI FARE — drop the passenger · ' + Math.round(d) + 'm · ' + Math.ceil(S.taxiTimer) + 's');
      if (d < 8) {
        S.cash += S.taxi.fare; S.rp += 20; S.stats.taxiFares++; S.stats.cashEarned += S.taxi.fare;
        VEL.HUD.toast('FARE PAID +$' + S.taxi.fare + ' · ' + S.stats.taxiFares + '/3'); VEL.Audio.cash();
        S.taxi = null; VEL.City.setMarker(0, 0, false);
        VEL.Districts.bump(VEL.Districts.current(S.player.x, S.player.z).id, 1);
      } else if (S.taxiTimer <= 0) { VEL.HUD.toast('TAXI FARE LOST — TOO SLOW'); S.taxi = null; VEL.City.setMarker(0, 0, false); }
    }
  },
  updateCamera(dt) {
    const S = VEL.State;
    // orbit with mouse drag (right button held) — simple: camera trails behind player heading
    const target = S.inCar && S.car ? S.car : S.player;
    const heading = S.player.heading;
    // smooth yaw toward behind-player
    let want = heading + Math.PI;
    let dy = want - this.camYaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    this.camYaw += dy * Math.min(1, dt * 3.5);
    const dist = S.inCar ? 15 : 11;
    const cx = S.player.x - Math.sin(this.camYaw) * dist * Math.cos(this.camPitch) * -1;
    const cz = S.player.z - Math.cos(this.camYaw) * dist * Math.cos(this.camPitch) * -1;
    const tx = S.player.x + Math.sin(this.camYaw) * 6, tz = S.player.z + Math.cos(this.camYaw) * 6;
    this.camera.position.set(
      S.player.x + Math.sin(this.camYaw) * -dist, 7.5, S.player.z + Math.cos(this.camYaw) * -dist);
    this.camera.lookAt(S.player.x + Math.sin(this.camYaw) * 8, 2.2, S.player.z + Math.cos(this.camYaw) * 8);
    void cx; void cz; void tx; void tz; void target;
  },
  update(dt) {
    const S = VEL.State;
    S.time += dt;
    if (S.screen !== 'play' || S.paused || S.statsOpen) return;
    if (S.playing && !S.dead) this.updatePlayer(dt);
    VEL.Missions.update(dt);
    VEL.Races.update(dt);
    VEL.Police.update(dt, S.time);
    VEL.People.update(dt, S.time);
    VEL.Vehicles.updateTraffic(dt);
    VEL.Combat.update(dt);
    VEL.Crew.update(dt);
    VEL.Audio.update(dt);
    VEL.City.update(dt, S.time);
    // wanted escape counter
    if (S.wanted > 0 && this.lastWanted > 0 && S.wanted < this.lastWanted) S.stats.copsEscaped++;
    this.lastWanted = S.wanted;
    // global keys
    if (VEL.Input.hit('Enter') && !VEL.Missions.active && S.nextMission && !S.dead) VEL.Missions.start(S.nextMission);
    if (VEL.Input.hit('Enter') && S.storyComplete) VEL.HUD.toast('STORY COMPLETE — free roam Velmara!');
    if (VEL.Input.hit('KeyR') && S.dead) this.retry();
    if (VEL.Input.hit('KeyM')) { VEL.Audio.setMuted(!VEL.Audio.muted); VEL.HUD.toast(VEL.Audio.muted ? 'MUTED' : 'SOUND ON'); }
    if (VEL.Input.hit('KeyS') && S.statsOpen) VEL.Save.save(1);
    VEL.HUD.update(dt);
    this.updateCamera(dt);
    VEL.Input.endFrame();
  },
  loop() {
    if (window.__freeze) return; // debug hook: stop the loop so a screenshot can be taken
    requestAnimationFrame(this.loop);
    const dt = 1 / 60;
    // pause / stats toggles handled here so they work even when update() early-returns
    if (VEL.Input.hit('Escape')) {
      if (VEL.State.statsOpen) { VEL.State.statsOpen = false; VEL.HUD.hideStats(); }
      else if (VEL.State.screen === 'play') { VEL.State.paused = !VEL.State.paused; document.getElementById('pause-screen').classList.toggle('hidden', !VEL.State.paused); }
    }
    if (VEL.Input.hit('Tab')) {
      if (VEL.State.screen === 'play') {
        VEL.State.statsOpen = !VEL.State.statsOpen;
        if (VEL.State.statsOpen) VEL.HUD.showStats(); else VEL.HUD.hideStats();
      }
    }
    if (VEL.State.screen === 'title') { this.updateTitleScene(dt); VEL.Input.endFrame(); if (!window.__noRender) this.renderer.render(this.scene, this.camera); return; }
    this.update(dt);
    if (!window.__noRender) this.renderer.render(this.scene, this.camera);
  },
  updateTitleScene(dt) {
    // slow cinematic orbit over the lantern quarter for the title backdrop
    const t = VEL.State.time += dt;
    this.camera.position.set(Math.sin(t * 0.05) * 90, 42, 84 + Math.cos(t * 0.05) * 90);
    this.camera.lookAt(0, 6, 84);
    VEL.City.update(dt, t);
  },
};
