// Game: boot, the frame loop, the player (on foot and in a car), and all
// the world interactions — enter/steal cars, taxi fares, hidden packages,
// stunt jumps, the gun shop, respray, safehouse and car exports.
const Game = {
  renderer: null, scene: null, camera: null, canvas: null,
  playerMesh: null, camYaw: 0, camDist: 9,
  missionCars: [], packageMeshes: [], stuntMeshes: [], taxiMarker: null,
  fareTarget: null, hiddenT: 0, started: false,

  boot() {
    const canvas = document.getElementById('game-canvas');
    Game.canvas = canvas;
    Game.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    Game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    Game.renderer.setSize(window.innerWidth, window.innerHeight);
    Game.renderer.shadowMap.enabled = true;
    Game.renderer.shadowMap.type = THREE.PCFShadowMap;
    Game.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    Game.renderer.toneMappingExposure = 1.05;
    Game.renderer.outputColorSpace = THREE.SRGBColorSpace;

    Game.scene = new THREE.Scene();
    Game.scene.background = new THREE.Color(CFG.colors.dusk);
    Game.scene.fog = new THREE.Fog(CFG.colors.fog, 130, 430);

    Game.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
    Game.camera.position.set(10, 8, 60);

    // Dusk light rig: cool hemisphere fill + warm low key (the "sun" that
    // just set) with shadows that follow the player.
    Game.scene.add(new THREE.HemisphereLight(0x8fa3cc, 0x2a2018, 0.85));
    const sun = new THREE.DirectionalLight(0xffb36b, 2.1);
    sun.position.set(-80, 90, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -70; sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
    sun.shadow.camera.near = 10; sun.shadow.camera.far = 320;
    sun.shadow.bias = -0.0004;
    Game.scene.add(sun);
    Game.scene.add(sun.target);
    Game.sun = sun;

    City.build(Game.scene);
    HUD.init();
    Input.bind(canvas);
    Vehicles.spawnTraffic(Game.scene, 12);
    People.spawnPeds(Game.scene, 16);
    Game.spawnSideContent();
    Game.spawnPlayerMesh();
    Game.spawnStarterCar();

    window.addEventListener('resize', () => {
      Game.camera.aspect = window.innerWidth / window.innerHeight;
      Game.camera.updateProjectionMatrix();
      Game.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    window.addEventListener('keydown', () => { AudioSys.init(); AudioSys.resume(); });
    canvas.addEventListener('mousedown', () => { AudioSys.init(); AudioSys.resume(); });
    Game.bindMenus();

    Game.showTitle();
    Game.renderer.setAnimationLoop(() => Game.tickReal());
    window.__gameReady = true;
  },

  spawnPlayerMesh() {
    Game.playerMesh = People.makeFigure(0xff7a2a, 0x1c2733);
    Game.playerMesh.position.set(S.player.x, 0, S.player.z);
    Game.scene.add(Game.playerMesh);
  },

  // The player's own starter sedan near the safehouse.
  spawnStarterCar() {
    const car = Vehicles.spawn('sedan', 16, 52, Math.PI * 0.9, 0x37e0c8);
    Game.scene.add(car.mesh);
  },

  spawnSideContent() {
    PACKAGES.forEach(([x, z], i) => {
      const m = City.makePackage();
      m.position.set(x, 0, z);
      Game.scene.add(m);
      Game.packageMeshes.push(m);
    });
    STUNTS.forEach(([x, z], i) => {
      const r = City.makeRamp();
      r.position.set(x, 0.4, z);
      Game.scene.add(r);
      Game.stuntMeshes.push(r);
    });
  },

  // A mission's steal-stage car, spawned at the stage marker.
  spawnMissionCar(def) {
    const st = def.stages[0];
    if (!st || st.type !== 'steal') return;
    const color = st.vehicle === 'comet' ? 0xff7a2a : 0xd8d3c0;
    const car = Vehicles.spawn(st.vehicle === 'truck' ? 'truck' : 'comet', st.x, st.z, Math.PI / 2, color);
    car.missionCar = true;
    Game.scene.add(car.mesh);
    Game.missionCars.push(car);
    Missions.targetCar = car;
  },

  teleportPlayer(x, z) {
    S.player.x = x; S.player.z = z;
    if (S.player.inCar) {
      S.player.inCar.x = x; S.player.inCar.z = z;
      S.player.inCar.mesh.position.set(x, 0, z);
    }
    Game.playerMesh.position.set(x, 0, z);
  },

  // ---- damage / wasted -------------------------------------------------
  damagePlayer(amount, source) {
    if (S.god || S.mode !== 'playing') return;
    let rest = amount;
    if (S.armor > 0) {
      const absorbed = Math.min(S.armor, rest * 0.6);
      S.armor -= absorbed;
      rest -= absorbed;
    }
    S.hp -= rest;
    if (S.mission) S.mission.damageTaken += amount;
    HUD.damageFlash(amount);
    if (S.hp <= 0) {
      S.hp = 0;
      Game.wasted();
    }
  },

  wasted() {
    S.mode = 'wasted';
    if (document.pointerLockElement) document.exitPointerLock();
    HUD.el['wasted-screen'].classList.add('show');
    AudioSys.blip(110, 0.6, 'sawtooth', 0.2);
  },

  retry() {
    S.cash = Math.max(0, S.cash - 200);
    S.hp = 100; S.armor = 0;
    Police.setWanted(0, true);
    for (const c of Police.cars) Vehicles.remove(c);
    Police.cars.length = 0;
    People.clearEnemies(Game.scene);
    Police.foot.length = 0;
    Police.clearHeli(Game.scene);
    Police.clearRoadblocks(Game.scene);
    if (S.player.inCar) Game.exitCar();
    Game.teleportPlayer(CFG.startPos.x, CFG.startPos.z);
    if (S.mission) { S.mission.stage = 0; S.mission.damageTaken = 0; S.killsThisMission = 0; Missions.showStage(); }
    S.mode = 'playing';
    HUD.el['wasted-screen'].classList.remove('show');
    HUD.toast('You wake up at the safehouse. The island keeps your $200.');
  },

  carWrecked() {
    const car = S.player.inCar;
    HUD.toast('Your car is wrecked!');
    AudioSys.noiseBurst(0.4, 0.4, 500);
    Game.exitCar();
    if (car) Vehicles.remove(car);
    Game.damagePlayer(20, 'wreck');
  },

  // ---- cars: enter / exit / steal --------------------------------------
  nearestCar(maxD) {
    const p = S.player;
    let best = null, bd = maxD;
    for (const car of Vehicles.list) {
      if (car === p.inCar) continue;
      const d = Math.hypot(car.x - p.x, car.z - p.z);
      if (d < bd) { bd = d; best = car; }
    }
    return best;
  },

  enterCar(car) {
    const p = S.player;
    p.inCar = car;
    p.onFoot = false;
    car.driver = 'player';
    Game.playerMesh.visible = false;
    const ti = Vehicles.traffic.indexOf(car);
    if (ti >= 0) {
      Vehicles.traffic.splice(ti, 1);
      S.carsStolen++;
      Police.addHeat(1);
      HUD.toast('Car stolen — the VPD noticed.');
    }
    // A stolen pursuit car stops being a pursuit car.
    const pi = Police.cars.indexOf(car);
    if (pi >= 0) Police.cars.splice(pi, 1);
    AudioSys.blip(220, 0.1, 'square', 0.12);
  },

  exitCar() {
    const p = S.player;
    const car = p.inCar;
    if (!car) return;
    p.inCar = null;
    p.onFoot = true;
    p.x = car.x + Math.sin(car.yaw) * 2.5;
    p.z = car.z + Math.cos(car.yaw) * 2.5;
    p.yaw = car.yaw;
    car.driver = null;
    Game.playerMesh.visible = true;
    Game.playerMesh.position.set(p.x, 0, p.z);
  },

  // ---- interactions ------------------------------------------------------
  // Nearest interactable, packages and stunts first (v8 lesson).
  nearestInteract() {
    const p = S.player;
    for (let i = 0; i < PACKAGES.length; i++) {
      if (S.packagesFound[i]) continue;
      const [x, z] = PACKAGES[i];
      if (Math.hypot(p.x - x, p.z - z) < 3.2) return { kind: 'package', i, label: 'Pick up hidden package' };
    }
    const st = Missions.currentStage();
    if (S.mission && st && st.type === 'collect' && Math.hypot(p.x - st.x, p.z - st.z) < st.r) {
      return { kind: 'mission-collect', label: st.title === 'CRACK THE VAULT' ? 'Crack the vault' : 'Take the Lantern Chip' };
    }
    if (!p.inCar) {
      const car = Game.nearestCar(4.2);
      if (car) return { kind: 'car', car, label: car.missionCar ? 'Steal the mission car [E]' : 'Get in car [E]' };
    }
    const places = [
      { kind: 'gunshop', x: PLACES.gunshop.x, z: PLACES.gunshop.z, r: 5, label: 'Gun shop — buy ammo [E]' },
      { kind: 'respray', x: PLACES.respray.x, z: PLACES.respray.z, r: 6, label: 'Respray — $200, full repair [E]' },
      { kind: 'safehouse', x: PLACES.safehouse.x, z: PLACES.safehouse.z, r: 5, label: 'Safehouse — save + heal [E]' },
      { kind: 'export', x: PLACES.exportDock.x, z: PLACES.exportDock.z, r: 8, label: 'Export dock — deliver a sports car [E]' },
      { kind: 'taxi', x: PLACES.taxiStand.x, z: PLACES.taxiStand.z, r: 6, label: S.fares >= 3 ? 'Taxi stand — no fares left' : 'Taxi stand — take a fare [E]' },
    ];
    for (const pl of places) {
      if (Math.hypot(p.x - pl.x, p.z - pl.z) < pl.r) return pl;
    }
    return null;
  },

  doInteract(it) {
    if (!it) return;
    const p = S.player;
    if (it.kind === 'package') {
      S.packagesFound[it.i] = true;
      S.packages++;
      S.cash += 250;
      S.rp += 10;
      if (Game.packageMeshes[it.i]) Game.packageMeshes[it.i].visible = false;
      HUD.toast(`Hidden package found! +$250  (${S.packages}/10)`);
      AudioSys.pickup();
    } else if (it.kind === 'car') {
      Game.enterCar(it.car);
    } else if (it.kind === 'gunshop') {
      const d = Districts.at(p.x, p.z);
      const price = Math.round(150 * Districts.discount(d.name));
      if (S.cash >= price) {
        S.cash -= price;
        S.ammo[1] += 60; S.ammo[2] += 120; S.ammo[3] += 12;
        HUD.toast(`Ammo restocked — $${price}.`);
        AudioSys.pickup();
      } else HUD.toast('Not enough cash for ammo.');
    } else if (it.kind === 'respray') {
      if (!p.inCar) { HUD.toast('Drive a car into the respray bay first.'); return; }
      if (S.cash < 200) { HUD.toast('Respray costs $200.'); return; }
      S.cash -= 200;
      p.inCar.hp = p.inCar.maxHp;
      p.inCar.mesh.children[0].material = new THREE.MeshStandardMaterial({ color: Vehicles.carColors[Math.floor(Math.random() * Vehicles.carColors.length)], roughness: 0.35, metalness: 0.55 });
      HUD.toast('Respray done — fresh paint, full repair.');
      AudioSys.pickup();
    } else if (it.kind === 'safehouse') {
      S.hp = 100;
      SaveSys.save(1);
      HUD.toast('Safehouse — healed and saved to slot 1.');
    } else if (it.kind === 'export') {
      if (p.inCar && p.inCar.kind === 'comet') {
        const car = p.inCar;
        Game.exitCar();
        Vehicles.remove(car);
        S.exports++;
        S.cash += 1500;
        S.rp += 60;
        HUD.toast(`Sports car exported! +$1500  (${S.exports}/3)`);
        AudioSys.mission();
      } else {
        HUD.toast('Exports want a Comet sports car. Bring one here.');
      }
    } else if (it.kind === 'taxi') {
      if (S.fares >= 3) return;
      if (S.taxi) return;
      Game.startFare();
    }
  },

  startFare() {
    const dest = CFG.roads[Math.floor(Math.random() * CFG.roads.length)];
    const along = (Math.random() * 2 - 1) * 150;
    Game.fareTarget = { x: Math.random() < 0.5 ? dest : along, z: Math.random() < 0.5 ? along : dest };
    const scene = City.scene;
    if (Game.taxiMarker && Game.taxiMarker.parent) Game.taxiMarker.parent.remove(Game.taxiMarker);
    Game.taxiMarker = City.makeMarker(0xffc21c);
    Game.taxiMarker.position.set(Game.fareTarget.x, 0, Game.fareTarget.z);
    scene.add(Game.taxiMarker);
    S.taxi = { target: Game.fareTarget };
    HUD.banner('TAXI FARE', 'PICK UP THE PASSENGER', 'Drive to the gold marker. Quick and smooth pays the same.');
    HUD.toast('Taxi fare started — reach the gold marker.');
  },

  updateTaxi(dt) {
    if (!S.taxi) return;
    const t = S.taxi.target;
    const p = S.player;
    const d = Math.hypot(p.x - t.x, p.z - t.z);
    HUD.objective(`TAXI — drop the passenger ${Math.round(d)}m away`);
    if (d < 8) {
      S.fares++;
      S.cash += 180;
      S.rp += 20;
      HUD.toast(`Fare complete! +$180  (${S.fares}/3)`);
      AudioSys.pickup();
      if (Game.taxiMarker && Game.taxiMarker.parent) Game.taxiMarker.parent.remove(Game.taxiMarker);
      Game.taxiMarker = null;
      S.taxi = null;
    }
  },

  updateStunts() {
    const p = S.player;
    if (!p.inCar) return;
    STUNTS.forEach(([x, z], i) => {
      if (S.stuntsDone[i]) return;
      if (Math.hypot(p.x - x, p.z - z) < 4 && Math.abs(p.inCar.speed) > 18) {
        S.stuntsDone[i] = true;
        S.stunts++;
        S.cash += 300;
        S.rp += 25;
        HUD.toast(`STUNT JUMP! +$300  (${S.stunts}/5)`);
        AudioSys.mission();
      }
    });
  },

  // ---- menus -------------------------------------------------------------
  bindMenus() {
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    on('btn-continue', () => Game.hideTitle());
    on('btn-new', () => { location.search = '?auto'; });
    on('btn-resume', () => Game.togglePause());
    on('btn-quit', () => {
      HUD.el['pause-screen'].classList.remove('show');
      Missions.abort(); Races.abort();
      Game.showTitle();
    });
    on('btn-retry', () => Game.retry());
  },

  quitToTitle() {
    HUD.el['pause-screen'].classList.remove('show');
    Game.showTitle();
  },

  showTitle() {
    S.mode = 'title';
    HUD.el['title-screen'].classList.add('show');
    HUD.el.hud.classList.remove('show');
    Game.refreshTitleSlots();
  },

  hideTitle() {
    HUD.el['title-screen'].classList.remove('show');
    HUD.el.hud.classList.add('show');
    S.mode = 'playing';
    Game.started = true;
    if (!Game.startedOnce) {
      Game.startedOnce = true;
      HUD.banner('VELMARA — ISLE OF LANTERNS', 'RHEA SOLANO · GETAWAY DRIVER', 'Ivo Marek has work for you. Open the pause menu (Esc) to pick a job — or just drive.');
      HUD.dialog('Ivo Marek', 'Rhea. The island is ours tonight — six jobs, one big score. Start with the Lantern Run when you are ready.');
    }
  },

  refreshTitleSlots() {
    const host = document.getElementById('title-slots');
    if (!host) return;
    let html = '';
    for (let s = 1; s <= 3; s++) {
      const info = SaveSys.slotInfo(s);
      html += `<div class="title-slot">${info ? `SLOT ${s} — $${Math.floor(info.cash).toLocaleString()} · ${info.missions}/6 missions` : `SLOT ${s} — EMPTY`}</div>`;
    }
    host.innerHTML = html;
  },

  refreshMissionBoard() {
    const host = HUD.el['mission-list'];
    if (!host) return;
    let html = '<div class="board-sec">STORY MISSIONS</div>';
    for (const m of MISSIONS) {
      const done = S.missionRatings[m.id];
      const active = S.mission && S.mission.def.id === m.id;
      html += `<button class="board-row" data-mission="${m.id}" ${done || active || S.mission ? 'disabled' : ''}>
        <span>M${m.id} · ${m.title}</span><span>${done ? '★ ' + done + ' · DONE' : active ? 'ACTIVE' : '$' + m.reward + ' · ' + m.rp + ' RP'}</span></button>`;
    }
    html += '<div class="board-sec">STREET RACES (BE IN A CAR)</div>';
    for (const r of RACES) {
      const won = S.raceWins[r.id];
      html += `<button class="board-row" data-race="${r.id}" ${won || S.race ? 'disabled' : ''}>
        <span>${r.name}</span><span>${won ? '★ ' + won + ' · WON' : '$' + r.reward + ' · ' + r.rp + ' RP'}</span></button>`;
    }
    html += '<div class="board-sec">SAVE / LOAD</div>';
    for (let s = 1; s <= 3; s++) {
      const info = SaveSys.slotInfo(s);
      html += `<button class="board-row" data-save="${s}"><span>Save slot ${s}</span><span>${info ? '$' + Math.floor(info.cash).toLocaleString() : 'empty'}</span></button>
        <button class="board-row" data-load="${s}"><span>Load slot ${s}</span><span>${info ? info.missions + '/6 missions' : 'empty'}</span></button>`;
    }
    host.innerHTML = html;
    host.querySelectorAll('[data-mission]').forEach((b) => b.addEventListener('click', () => {
      if (Missions.start(parseInt(b.dataset.mission, 10))) Game.togglePause();
    }));
    host.querySelectorAll('[data-race]').forEach((b) => b.addEventListener('click', () => {
      if (Races.start(parseInt(b.dataset.race, 10))) Game.togglePause();
    }));
    host.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', () => { SaveSys.save(parseInt(b.dataset.save, 10)); Game.refreshMissionBoard(); }));
    host.querySelectorAll('[data-load]').forEach((b) => b.addEventListener('click', () => { if (SaveSys.load(parseInt(b.dataset.load, 10))) Game.togglePause(); }));
  },

  togglePause() {
    if (S.mode === 'playing') {
      S.mode = 'paused';
      if (document.pointerLockElement) document.exitPointerLock();
      Game.refreshMissionBoard();
      HUD.el['pause-screen'].classList.add('show');
    } else if (S.mode === 'paused') {
      S.mode = 'playing';
      HUD.el['pause-screen'].classList.remove('show');
    }
  },

  // ---- per-frame ---------------------------------------------------------
  tickReal() {
    if (S.mode === 'playing' || S.mode === 'stats') Game.frame(1 / 60);
    else if (S.mode === 'title') Game.renderTitle();
    else Game.render();
  },

  renderTitle() {
    // Slow orbit around the lantern plaza for the title backdrop.
    const t = performance.now() * 0.0001;
    Game.camera.position.set(Math.sin(t) * 90, 42, Math.cos(t) * 90);
    Game.camera.lookAt(0, 6, 0);
    Game.render();
  },

  render() {
    Game.renderer.render(Game.scene, Game.camera);
  },

  frame(dt) {
    const p = S.player;

    // Wasted screen: R (or the button) retries. Nothing else runs.
    if (S.mode === 'wasted') {
      if (Input.hit('KeyR')) Game.retry();
      Game.render();
      Input.endFrame();
      return;
    }

    S.time += dt;

    // Global keys.
    if (Input.hit('Escape')) { if (S.mode === 'playing' || S.mode === 'paused') Game.togglePause(); }
    if (Input.hit('Tab')) { if (S.mode === 'playing') Stats.toggle(); else if (S.mode === 'stats') Stats.toggle(); }
    if (Input.hit('KeyM')) { S.muted = !S.muted; HUD.toast(S.muted ? 'Sound off' : 'Sound on'); }
    if (Input.hit('KeyV')) { S.radio = (S.radio + 1) % RADIO.length; AudioSys.radioJingle(); }
    if (S.mode === 'stats') { HUD.update(dt); Input.endFrame(); Game.render(); return; }
    if (Input.hit('KeyZ')) Crew.use(0);
    if (Input.hit('KeyX')) Crew.use(1);
    if (Input.hit('KeyC')) Crew.use(2);
    if (Input.hit('Digit1')) Combat.switchWeapon(0);
    if (Input.hit('Digit2')) Combat.switchWeapon(1);
    if (Input.hit('Digit3')) Combat.switchWeapon(2);
    if (Input.hit('Digit4')) Combat.switchWeapon(3);

    // Camera yaw from mouse.
    Game.camYaw -= Input.mouseDX * 0.0032;
    S.camera.yaw = Game.camYaw;

    if (p.inCar) {
      // Driving.
      const mv = Input.moveAxis();
      const steer = (Input.down('KeyA') || Input.down('ArrowLeft') ? 1 : 0) - (Input.down('KeyD') || Input.down('ArrowRight') ? 1 : 0);
      Vehicles.drive(p.inCar, dt, mv.f, steer);
      p.x = p.inCar.x; p.z = p.inCar.z; p.yaw = p.inCar.yaw; p.speed = p.inCar.speed;
      S.distanceKm += Math.abs(p.inCar.speed) * dt / 1000;
      AudioSys.setEngine(Math.abs(p.inCar.speed) / 34);
      // E in a car interacts first (taxi stand, gun shop, respray, export,
      // package) and only exits the car when there is nothing to use —
      // otherwise a fare could never be started from the driver's seat.
      const itCar = Game.nearestInteract();
      HUD.prompt(itCar ? itCar.label : null);
      if (Input.hit('KeyE')) {
        if (itCar && itCar.kind !== 'car') Game.doInteract(itCar);
        else Game.exitCar();
      }
      // exitCar() above can clear inCar in this same frame — re-check.
      if (p.inCar && p.inCar.hp <= 0) Game.carWrecked();
    } else {
      // On foot: camera-relative movement, sprint with Shift.
      const mv = Input.moveAxis();
      const sprint = Input.down('ShiftLeft') || Input.down('ShiftRight') ? 1.6 : 1;
      const sp = 6 * sprint;
      const fx = -Math.sin(Game.camYaw), fz = -Math.cos(Game.camYaw);
      const rx = Math.cos(Game.camYaw), rz = -Math.sin(Game.camYaw);
      let mx = fx * mv.f + rx * mv.s;
      let mz = fz * mv.f + rz * mv.s;
      const len = Math.hypot(mx, mz);
      if (len > 0) { mx /= len; mz /= len; }
      let nx = p.x + mx * sp * dt;
      let nz = p.z + mz * sp * dt;
      nx = Math.max(-CFG.world.half + 2, Math.min(CFG.world.half - 2, nx));
      nz = Math.max(-CFG.world.half + 2, Math.min(CFG.world.half - 2, nz));
      if (!City.inCanal(nx, nz)) {
        const fixed = City.resolveCollision(nx, nz, 0.5);
        p.x = fixed.x; p.z = fixed.z;
      }
      p.speed = len > 0 ? sp : 0;
      if (len > 0) p.yaw = Math.atan2(mx, mz);
      Game.playerMesh.position.set(p.x, Math.abs(Math.sin(S.time * 9)) * (len > 0 ? 0.06 : 0), p.z);
      Game.playerMesh.rotation.y = p.yaw;
      AudioSys.setEngine(0);
      // Shooting.
      if (Input.mouseDown || Input.mousePressed) Combat.fire(Game.scene, Game.camera);
      // Interact.
      const it = Game.nearestInteract();
      HUD.prompt(it ? it.label : null);
      if (it && Input.hit('KeyE')) Game.doInteract(it);
    }

    // Wanted decay: stay out of sight and the heat cools.
    if (S.wanted > 0) {
      const nearest = Police.cars.reduce((m, c) => Math.min(m, Math.hypot(c.x - p.x, c.z - p.z)), 999);
      if (nearest > 60) {
        Game.hiddenT += dt;
        if (Game.hiddenT > 9) { Game.hiddenT = 0; Police.setWanted(S.wanted - 1, true); HUD.toast('Heat cooling off…'); }
      } else Game.hiddenT = 0;
    }

    Vehicles.updateTraffic(dt);
    People.update(dt, p);
    Police.update(dt, Game.scene);
    Missions.update(dt);
    Races.update(dt);
    Crew.update(dt);
    Combat.update(dt);
    Game.updateTaxi(dt);
    Game.updateStunts();

    // Sun shadow frustum follows the player.
    Game.sun.position.set(p.x - 80, 90, p.z + 60);
    Game.sun.target.position.set(p.x, 0, p.z);

    // Chase camera.
    const yaw = p.inCar ? p.inCar.yaw : Game.camYaw;
    const dist = p.inCar ? 11 : 8;
    const height = p.inCar ? 4.6 : 3.4;
    const bx = Math.sin(yaw), bz = Math.cos(yaw);
    const cx = p.x + bx * dist, cz = p.z + bz * dist;
    Game.camera.position.set(cx, height, cz);
    Game.camera.lookAt(p.x - bx * 4, 1.6, p.z - bz * 4);

    HUD.update(dt);
    Game.render();
    Input.endFrame();
  },
};
