/* police.js — wanted level, named VPD units (cars + foot), roadblocks, helicopter, decay. */
VEL.Police = {
  units: [], heli: null, heliMesh: null, roadblocks: [], spawnTimer: 0, sirenTimer: 0,
  wantedNames: ['CLEAN', 'SUSPECT', 'PURSUIT', 'MANHUNT', 'LOCKDOWN', 'MAXIMUM'],
  setWanted(n, reason) {
    const S = VEL.State;
    const old = S.wanted;
    S.wanted = Math.max(0, Math.min(5, n));
    if (S.wanted > old && S.wanted > 0) VEL.Audio.siren();
    if (S.wanted >= 3 && old < 3) VEL.HUD.toast('VPD ROADBLOCKS DEPLOYED');
    if (S.wanted >= 5 && old < 5) VEL.HUD.toast('▲ AIR UNIT DEPLOYED — HELICOPTER ON YOU');
    this.syncUnits();
  },
  addWanted(n, reason) { this.setWanted(VEL.State.wanted + n, reason); },
  desiredUnits() { return [0, 2, 3, 4, 5, 6][VEL.State.wanted]; },
  syncUnits() {
    const want = this.desiredUnits();
    while (this.units.length < want) this.spawnUnit();
    while (this.units.length > want) this.removeUnit(this.units[this.units.length - 1]);
    if (VEL.State.wanted >= 5 && !this.heli) this.spawnHeli();
    if (VEL.State.wanted < 5 && this.heli) this.removeHeli();
    if (VEL.State.wanted >= 3 && this.roadblocks.length === 0) this.spawnRoadblocks();
    if (VEL.State.wanted < 3) this.clearRoadblocks();
  },
  spawnUnit() {
    const S = VEL.State, R = VEL.RNG;
    const def = VEL.CFG.policeNames[this.units.length % VEL.CFG.policeNames.length];
    const isFoot = R.next() < 0.3 && S.wanted < 3;
    const ang = R.range(0, Math.PI * 2);
    const x = S.player.x + Math.sin(ang) * 46, z = S.player.z + Math.cos(ang) * 46;
    let unit;
    if (isFoot) {
      const mesh = VEL.People.makeHumanMesh(0x1a2a4a, 0x14141a);
      mesh.position.set(x, 0, z); VEL.Game.scene.add(mesh);
      unit = { kind: 'foot', mesh, x, z, hp: 50, speed: 5.5, shootCd: 1, def };
    } else {
      const car = VEL.Vehicles.spawnCar(x, z, ang, { color: 0x1a2a5a, police: true, maxSpeed: 52, name: 'VPD CRUISER' });
      const lightbar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2233 }));
      lightbar.position.y = 2.05; car.mesh.add(lightbar);
      unit = { kind: 'car', car, mesh: car.mesh, x, z, hp: 100, def };
      unit.lightbar = lightbar;
    }
    unit.id = def[0]; unit.officer = def[1]; unit.role = def[2];
    this.units.push(unit);
    return unit;
  },
  removeUnit(u) {
    if (u.kind === 'car') VEL.Vehicles.removeCar(u.car); else VEL.Game.scene.remove(u.mesh);
    this.units = this.units.filter((x) => x !== u);
  },
  spawnHeli() {
    const S = VEL.State;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 6), new THREE.MeshLambertMaterial({ color: 0x1a2a5a }));
    body.position.y = 0; g.add(body);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.12, 0.6), new THREE.MeshLambertMaterial({ color: 0x0a0a0a }));
    rotor.position.y = 1.1; g.add(rotor);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    lamp.position.set(0, -1, 2.6); g.add(lamp);
    const spot = new THREE.SpotLight(0xffffff, 2.2, 90, 0.35, 0.4); spot.position.set(0, -1, 2); g.add(spot); g.add(spot.target); spot.target.position.set(0, -30, 6);
    g.position.set(S.player.x + 20, 42, S.player.z + 20);
    VEL.Game.scene.add(g);
    this.heli = { mesh: g, rotor, x: g.position.x, z: g.position.z, y: 42, shootCd: 2 };
    this.heliMesh = g;
  },
  removeHeli() { if (this.heli) { VEL.Game.scene.remove(this.heli.mesh); this.heli = null; this.heliMesh = null; } },
  spawnRoadblocks() {
    const S = VEL.State;
    for (const [dx, dz] of [[30, 0], [-30, 0], [0, 30], [0, -30]]) {
      const car = VEL.Vehicles.spawnCar(S.player.x + dx, S.player.z + dz, 0, { color: 0x1a2a5a, police: true, name: 'ROADBLOCK' });
      this.roadblocks.push(car);
    }
  },
  clearRoadblocks() { for (const c of this.roadblocks) VEL.Vehicles.removeCar(c); this.roadblocks = []; },
  distToPlayer(u) { const S = VEL.State; return Math.hypot(u.x - S.player.x, u.z - S.player.z); },
  update(dt, t) {
    const S = VEL.State, R = VEL.RNG;
    // wanted decays when no police can see the player
    if (S.wanted > 0 && !S.inMissionHeat) {
      let seen = false;
      for (const u of this.units) if (this.distToPlayer(u) < 26) seen = true;
      if (!seen) { S.wantedFrac -= VEL.CFG.wantedDecay * dt * 10; if (S.wantedFrac <= 0) { S.wantedFrac = 1; this.setWanted(S.wanted - 1); } }
      else S.wantedFrac = 1;
    }
    this.spawnTimer -= dt;
    if (S.wanted > 0 && this.units.length < this.desiredUnits() && this.spawnTimer <= 0) { this.spawnTimer = 2; this.spawnUnit(); }
    this.sirenTimer -= dt;
    if (S.wanted > 0 && this.sirenTimer <= 0) { this.sirenTimer = 6; VEL.Audio.siren(); }
    // police AI: chase + ram, foot units shoot
    for (const u of this.units) {
      const d = this.distToPlayer(u);
      if (u.kind === 'car') {
        const car = u.car;
        const want = Math.atan2(S.player.x - car.x, S.player.z - car.z);
        let dh = want - car.heading; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
        const steer = Math.max(-1, Math.min(1, dh * 1.6));
        VEL.Vehicles.drive(car, d > 6 ? 1 : 0.2, steer, dt);
        u.x = car.x; u.z = car.z;
        if (u.lightbar) u.lightbar.material.color.setHex(Math.sin(t * 12) > 0 ? 0xff2233 : 0x2244ff);
        if (S.inCar && S.car && d < 4.5) {
          // ram damage
          S.car.hp -= dt * 14; VEL.Audio.crash(); S.stats.copsEscaped += 0;
          car.speed *= 0.6;
        }
        if (d < 3 && !S.inCar) { S.hp -= dt * 8; }
      } else {
        const dir = Math.atan2(S.player.x - u.x, S.player.z - u.z);
        const nx = u.x + Math.sin(dir) * u.speed * dt, nz = u.z + Math.cos(dir) * u.speed * dt;
        const c = VEL.City.collide(nx, nz, 0.5); u.x = c.x; u.z = c.z;
        u.mesh.position.set(u.x, 0, u.z); u.mesh.rotation.y = dir;
        u.shootCd -= dt;
        if (u.shootCd <= 0 && d < 30) { u.shootCd = R.range(1.4, 2.4); VEL.Combat.enemyShoot(u, d); }
      }
    }
    // helicopter: hover above, spotlight, occasional shots
    if (this.heli) {
      const h = this.heli;
      h.x += (S.player.x + 14 - h.x) * dt * 0.5; h.z += (S.player.z + 14 - h.z) * dt * 0.5;
      h.y = 42 + Math.sin(t * 0.8) * 3;
      h.mesh.position.set(h.x, h.y, h.z);
      h.rotor.rotation.y += dt * 18;
      h.mesh.lookAt(S.player.x, 0, S.player.z);
      h.shootCd -= dt;
      if (h.shootCd <= 0) { h.shootCd = 2.6; VEL.Combat.enemyShoot(h, 40); VEL.HUD.toast('HELICOPTER FIRING — GET TO COVER'); }
    }
  },
};
