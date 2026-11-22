// Velmara PD: wanted level 0–5, named response units, pursuit cars that
// ram, foot cops that shoot, roadblocks at wanted 3+, a helicopter at 5.
// The VPD RESPONSE panel lists each live unit with its name, role and
// distance in metres — the same data the chase HUD shows.
const Police = {
  cars: [], foot: [], roadblocks: [], heli: null, heliMesh: null,
  sirenT: 0, escapeT: 0,

  setWanted(n, silent) {
    const prev = S.wanted;
    S.wanted = Math.max(0, Math.min(5, n));
    if (S.wanted > prev && !silent) {
      AudioSys.siren();
      HUD.toast(`WANTED LEVEL ${S.wanted}${S.wanted >= 5 ? ' — AIR UNIT DEPLOYED' : ''}`);
    }
    if (S.wanted === 0) Police.escapeT = 0;
  },

  addHeat(n) { Police.setWanted(S.wanted + n); },

  // Named units for the panel: first N entries of POLICE_NAMES by wanted.
  liveUnits() {
    const p = S.player;
    const units = [];
    const count = Math.min(S.wanted + 1, POLICE_NAMES.length);
    for (let i = 0; i < count; i++) {
      const [unit, name, role] = POLICE_NAMES[i];
      const src = i < Police.cars.length ? Police.cars[i] : (i < Police.cars.length + Police.foot.length ? Police.foot[i - Police.cars.length] : null);
      const d = src ? Math.round(Math.hypot(src.x - p.x, src.z - p.z)) : 40 + i * 23;
      units.push({ unit, name, role, dist: d });
    }
    if (S.wanted >= 5) units.push({ unit: 'AIR 1', name: 'R. Voss', role: 'Helicopter', dist: Police.heli ? Math.round(Math.hypot(Police.heli.x - p.x, Police.heli.z - p.z)) : 60 });
    return units;
  },

  spawnPursuit(scene) {
    const p = S.player;
    const a = Math.random() * Math.PI * 2;
    const car = Vehicles.spawn('police', p.x + Math.sin(a) * 42, p.z + Math.cos(a) * 42, 0);
    car.hp = 60; car.maxHp = 60;
    car.ai = { chase: true };
    scene.add(car.mesh);
    Police.cars.push(car);
    return car;
  },

  spawnFootCop(scene) {
    const p = S.player;
    const a = Math.random() * Math.PI * 2;
    const cop = People.spawnEnemy(scene, p.x + Math.sin(a) * 22, p.z + Math.cos(a) * 22,
      POLICE_NAMES[4 + (Police.foot.length % 4)][1], 50);
    cop.kind = 'cop';
    Police.foot.push(cop);
    return cop;
  },

  makeHeli(scene) {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 4.6),
      new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.4, metalness: 0.6 }));
    body.castShadow = true;
    grp.add(body);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(7, 0.08, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x111111 }));
    rotor.position.y = 1;
    grp.add(rotor);
    grp.userData.rotor = rotor;
    const spot = new THREE.Mesh(new THREE.ConeGeometry(3.2, 18, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }));
    spot.position.y = -9;
    grp.add(spot);
    const light = new THREE.PointLight(0xfff2c0, 20, 40, 1.6);
    light.position.y = -2;
    grp.add(light);
    scene.add(grp);
    Police.heliMesh = grp;
    Police.heli = { x: S.player.x, z: S.player.z - 30, y: 34, angle: 0 };
    return Police.heli;
  },

  clearHeli(scene) {
    if (Police.heliMesh && Police.heliMesh.parent) Police.heliMesh.parent.remove(Police.heliMesh);
    Police.heliMesh = null; Police.heli = null;
  },

  clearRoadblocks(scene) {
    for (const rb of Police.roadblocks) if (rb.mesh.parent) rb.mesh.parent.remove(rb.mesh);
    Police.roadblocks.length = 0;
  },

  spawnRoadblock(scene) {
    const p = S.player;
    const a = Math.random() * Math.PI * 2;
    const x = p.x + Math.sin(a) * 55, z = p.z + Math.cos(a) * 55;
    const grp = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const car = Vehicles.makeCarMesh(0xe8e8e8, 'police');
      car.position.set(i * 2.6, 0, 0);
      car.rotation.y = Math.PI / 2;
      grp.add(car);
    }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
    sign.position.set(0, 2.2, 0);
    grp.add(sign);
    grp.position.set(x, 0, z);
    scene.add(grp);
    Police.roadblocks.push({ x, z, mesh: grp });
  },

  update(dt, scene) {
    const p = S.player;
    // Spawn pressure scales with wanted; decay when the player stays hidden.
    const wantCars = S.wanted >= 1 ? Math.min(S.wanted, 4) : 0;
    const wantFoot = S.wanted >= 2 ? Math.min(S.wanted - 1, 3) : 0;
    if (S.wanted > 0) {
      if (Police.cars.length < wantCars && Math.random() < dt * 0.8) Police.spawnPursuit(scene);
      if (Police.foot.length < wantFoot && Math.random() < dt * 0.5) Police.spawnFootCop(scene);
      if (S.wanted >= 3 && Police.roadblocks.length < S.wanted - 2 && Math.random() < dt * 0.25) Police.spawnRoadblock(scene);
      if (S.wanted >= 5 && !Police.heli) Police.makeHeli(scene);
      Police.escapeT = 0;
    } else {
      // No heat: units give up and drive off over a few seconds.
      if (Police.cars.length || Police.foot.length) {
        Police.escapeT += dt;
        if (Police.escapeT > 6) {
          for (const c of Police.cars) Vehicles.remove(c);
          Police.cars.length = 0;
          People.clearEnemies(scene);
          Police.foot.length = 0;
          Police.clearRoadblocks(scene);
          Police.clearHeli(scene);
          S.copsEscaped++;
          HUD.toast('You lost them. The island forgets — for now.');
        }
      }
    }
    if (S.wanted < 5 && Police.heli) Police.clearHeli(scene);

    // Pursuit cars chase and ram. Damage is per-car; a ram costs the
    // PLAYER car hp, never a global pool.
    for (let i = Police.cars.length - 1; i >= 0; i--) {
      const car = Police.cars[i];
      const dx = p.x - car.x, dz = p.z - car.z;
      const d = Math.hypot(dx, dz) || 1;
      const targetYaw = Math.atan2(-dx, -dz);
      let dy = targetYaw - car.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      car.yaw += Math.max(-1.9 * dt, Math.min(1.9 * dt, dy));
      car.speed = Math.min(30, car.speed + 14 * dt);
      const nx = car.x + Math.sin(car.yaw) * car.speed * dt * -1;
      const nz = car.z + Math.cos(car.yaw) * car.speed * dt * -1;
      const fixed = City.resolveCollision(nx, nz, 1.7);
      if (fixed.x !== nx || fixed.z !== nz) car.speed *= 0.5;
      car.x = fixed.x; car.z = fixed.z;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.yaw;
      if (d < 3.4) {
        // Ram: hurt the player's car (or the player on foot).
        if (p.inCar) {
          p.inCar.hp = Math.max(0, p.inCar.hp - 6 * dt);
          if (p.inCar.hp <= 0) Game.carWrecked();
        } else {
          Game.damagePlayer(14 * dt, 'police ram');
        }
        car.speed *= 0.4;
      }
      if (d > 190 || car.hp <= 0) {
        Vehicles.remove(car);
        Police.cars.splice(i, 1);
        if (car.hp <= 0) { S.kills++; HUD.toast('Pursuit unit wrecked.'); }
      }
    }

    // Heli circles above the player, spotlight on.
    if (Police.heli && Police.heliMesh) {
      const h = Police.heli;
      h.angle += dt * 0.45;
      h.x = p.x + Math.sin(h.angle) * 26;
      h.z = p.z + Math.cos(h.angle) * 26;
      h.y = 32 + Math.sin(S.time * 0.7) * 2;
      Police.heliMesh.position.set(h.x, h.y, h.z);
      Police.heliMesh.rotation.y = -h.angle;
      Police.heliMesh.userData.rotor.rotation.y += dt * 22;
    }

    // Siren blip on a timer while wanted.
    if (S.wanted > 0) {
      Police.sirenT -= dt;
      if (Police.sirenT <= 0) { Police.sirenT = 2.6; AudioSys.siren(); }
    }
  },
};
