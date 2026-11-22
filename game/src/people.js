/* people.js — Rhea on foot, pedestrians, enemies (shooters/guards), the tail target. */
VEL.People = {
  peds: [], enemies: [], tailTarget: null,
  makeHumanMesh(shirt, pants, skin) {
    const g = new THREE.Group();
    const skinMat = new THREE.MeshLambertMaterial({ color: skin || 0xc98a5e });
    const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
    const pantsMat = new THREE.MeshLambertMaterial({ color: pants || 0x222a3a });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.36), shirtMat); torso.position.y = 1.12; g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skinMat); head.position.y = 1.72; g.add(head);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.24), pantsMat); legL.position.set(-0.16, 0.36, 0); g.add(legL);
    const legR = legL.clone(); legR.position.x = 0.16; g.add(legR);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.66, 0.2), shirtMat); armL.position.set(-0.42, 1.12, 0); g.add(armL);
    const armR = armL.clone(); armR.position.x = 0.42; g.add(armR);
    g.userData.legs = [legL, legR]; g.userData.arms = [armL, armR];
    return g;
  },
  spawnPed(x, z) {
    const R = VEL.RNG;
    const mesh = this.makeHumanMesh(R.color([0xff6b9d, 0x8fd8ff, 0x37e08a, 0xffe9a8, 0xd8d2c0]), 0x222a3a);
    mesh.position.set(x, 0, z);
    VEL.Game.scene.add(mesh);
    const p = { mesh, x, z, heading: R.range(0, Math.PI * 2), speed: R.range(1, 2.4), dir: R.range(0, Math.PI * 2), panic: 0 };
    this.peds.push(p); return p;
  },
  spawnEnemy(x, z, opts) {
    const o = opts || {};
    const mesh = this.makeHumanMesh(o.guard ? 0x1a2a4a : 0x5a1a2a, 0x14141a);
    // weapon in hand
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.7), new THREE.MeshLambertMaterial({ color: 0x0a0a0a }));
    gun.position.set(0.42, 1.15, 0.3); mesh.add(gun);
    mesh.position.set(x, 0, z);
    VEL.Game.scene.add(mesh);
    const e = { mesh, x, z, hp: o.hp || 60, speed: o.speed || 3.2, shootCd: VEL.RNG.range(0.5, 1.5), kind: o.kind || 'shooter', name: o.name || 'THUG', dead: false, t: 0 };
    this.enemies.push(e); return e;
  },
  spawnTailTarget(x, z) {
    const mesh = this.makeHumanMesh(0x8a8a8a, 0x1a1a1a);
    mesh.position.set(x, 0, z); VEL.Game.scene.add(mesh);
    const car = VEL.Vehicles.spawnCar(x + 4, z, 0, { color: 0x8a8a8a, name: 'GREY SEDAN' });
    this.tailTarget = { mesh, car, x, z, heading: 0, wp: 0, waypoints: [[105, 21], [84, 63], [42, 63], [63, 63], [105, 21]] };
    return this.tailTarget;
  },
  removeEnemy(e) { VEL.Game.scene.remove(e.mesh); this.enemies = this.enemies.filter((x) => x !== e); },
  update(dt, t) {
    const S = VEL.State, R = VEL.RNG;
    const px = S.player.x, pz = S.player.z;
    // pedestrians wander, flee gunfire
    for (const p of this.peds) {
      const d = Math.hypot(p.x - px, p.z - pz);
      if (S.gunfireTimer > 0 || d < 6) p.panic = 2;
      if (p.panic > 0) { p.panic -= dt; p.dir = Math.atan2(px - p.x, pz - p.z) + Math.PI; }
      else if (R.next() < dt * 0.05) p.dir = R.range(0, Math.PI * 2);
      const sp = p.panic > 0 ? 6 : p.speed;
      const nx = p.x + Math.sin(p.dir) * sp * dt, nz = p.z + Math.cos(p.dir) * sp * dt;
      const c = VEL.City.collide(nx, nz, 0.5);
      p.x = c.x; p.z = c.z; p.heading = p.dir;
      p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.heading;
      const swing = Math.sin(t * 8 + p.x) * 0.5;
      p.mesh.userData.legs[0].rotation.x = swing; p.mesh.userData.legs[1].rotation.x = -swing;
    }
    // enemies chase + shoot the player when close and on foot / in car
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.t += dt;
      const d = Math.hypot(e.x - px, e.z - pz);
      if (d < 42) {
        const dir = Math.atan2(px - e.x, pz - e.z);
        const nx = e.x + Math.sin(dir) * e.speed * dt, nz = e.z + Math.cos(dir) * e.speed * dt;
        const c = VEL.City.collide(nx, nz, 0.5); e.x = c.x; e.z = c.z;
        e.mesh.position.set(e.x, 0, e.z); e.mesh.rotation.y = dir;
        e.shootCd -= dt;
        if (e.shootCd <= 0 && d < 34) {
          e.shootCd = R.range(1.2, 2.2);
          VEL.Combat.enemyShoot(e, d);
        }
      }
      const swing = Math.sin(t * 7 + e.x) * 0.4;
      e.mesh.userData.legs[0].rotation.x = swing; e.mesh.userData.legs[1].rotation.x = -swing;
    }
    // tail target drives its loop slowly
    const tt = this.tailTarget;
    if (tt && VEL.Missions.active && VEL.Missions.active.id === 4) {
      const wp = tt.waypoints[tt.wp];
      const d = Math.hypot(wp[0] - tt.car.x, wp[1] - tt.car.z);
      if (d < 4) tt.wp = (tt.wp + 1) % tt.waypoints.length;
      const want = Math.atan2(wp[0] - tt.car.x, wp[1] - tt.car.z);
      let dh = want - tt.car.heading; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
      tt.car.heading += Math.max(-1.2 * dt, Math.min(1.2 * dt, dh));
      tt.car.speed = 7;
      tt.car.x += Math.sin(tt.car.heading) * tt.car.speed * dt;
      tt.car.z += Math.cos(tt.car.heading) * tt.car.speed * dt;
      tt.car.mesh.position.set(tt.car.x, 0, tt.car.z); tt.car.mesh.rotation.y = tt.car.heading;
      tt.mesh.position.set(tt.car.x, 0, tt.car.z); tt.mesh.rotation.y = tt.car.heading;
      tt.x = tt.car.x; tt.z = tt.car.z;
    }
  },
  spawnPeds(n) {
    const R = VEL.RNG;
    for (let i = 0; i < n; i++) this.spawnPed(R.int(-4, 4) * 42 + R.range(-14, 14), R.int(-4, 4) * 42 + R.range(-14, 14));
  },
};
