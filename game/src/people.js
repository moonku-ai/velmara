// Pedestrians and mission enemies. Peds are simple capsule figures that
// wander the sidewalks; enemies are named, armed and shoot back. A kill is
// a kill: Combat.applyHit increments S.killsThisMission, the SAME counter
// the mission engine reads — never a second counter.
const People = {
  peds: [], enemies: [],

  makeFigure(shirt, pants) {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.85, 4, 8),
      new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 }));
    body.position.y = 1.05; body.castShadow = true;
    grp.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.7 }));
    head.position.y = 1.95;
    grp.add(head);
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 }));
    legs.position.y = 0.3;
    grp.add(legs);
    return grp;
  },

  spawnPed(scene, x, z) {
    const shirt = [0x8f5a2a, 0x2a6f8f, 0x7a2a4a, 0x4a7a2a, 0x9a9a9a, 0x5a4a9a][Math.floor(Math.random() * 6)];
    const ped = {
      kind: 'ped', x, z, yaw: Math.random() * Math.PI * 2, speed: 1.1 + Math.random() * 0.7,
      hp: 30, mesh: People.makeFigure(shirt, 0x232833), wander: Math.random() * 6,
    };
    ped.mesh.position.set(x, 0, z);
    scene.add(ped.mesh);
    People.peds.push(ped);
    return ped;
  },

  spawnPeds(scene, n) {
    for (let i = 0; i < n; i++) {
      let x = 0, z = 0, tries = 0;
      do {
        x = (Math.random() * 2 - 1) * 190;
        z = (Math.random() * 2 - 1) * 190;
        tries++;
      } while ((City.onRoad(x, z) || City.inCanal(x, z)) && tries < 20);
      People.spawnPed(scene, x, z);
    }
  },

  // A hostile shooter / guard for a kill stage. name shows in the HUD feed.
  spawnEnemy(scene, x, z, name, hp) {
    const e = {
      kind: 'enemy', name, x, z, yaw: 0, hp: hp || 60, maxHp: hp || 60,
      fireCd: 1 + Math.random(), mesh: People.makeFigure(0x3a2020, 0x1a1a1a),
      gun: null,
    };
    // Dark visor + gun box so enemies read as armed at a glance.
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xff3344 }));
    visor.position.set(0, 1.98, 0.26);
    e.mesh.add(visor);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.7 }));
    gun.position.set(0.45, 1.25, 0.4);
    e.mesh.add(gun);
    e.gun = gun;
    e.mesh.position.set(x, 0, z);
    scene.add(e.mesh);
    People.enemies.push(e);
    return e;
  },

  clearEnemies(scene) {
    for (const e of People.enemies) if (e.mesh.parent) e.mesh.parent.remove(e.mesh);
    People.enemies.length = 0;
  },

  update(dt, player) {
    // Peds wander, avoid roads, flee from gunfire nearby.
    for (const p of People.peds) {
      p.wander -= dt;
      if (p.wander <= 0) {
        p.yaw = Math.random() * Math.PI * 2;
        p.wander = 3 + Math.random() * 5;
      }
      const flee = player && Math.hypot(p.x - player.x, p.z - player.z) < 6 && S.stats.shots > 0;
      const sp = flee ? 3.2 : p.speed;
      let nx = p.x + Math.sin(p.yaw) * sp * dt;
      let nz = p.z + Math.cos(p.yaw) * sp * dt;
      if (Math.abs(nx) > 200 || Math.abs(nz) > 200 || City.inCanal(nx, nz)) { p.yaw += Math.PI / 2; continue; }
      const fixed = City.resolveCollision(nx, nz, 0.5);
      p.x = fixed.x; p.z = fixed.z;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.yaw;
      // Walk bob.
      p.mesh.position.y = Math.abs(Math.sin(S.time * 6 + p.z)) * 0.05;
    }
    // Enemies strafe toward the player and fire with a visible tracer.
    for (const e of People.enemies) {
      const dx = player.x - e.x, dz = player.z - e.z;
      const d = Math.hypot(dx, dz) || 1;
      e.yaw = Math.atan2(dx, dz);
      e.mesh.rotation.y = e.yaw;
      if (d > 14) {
        e.x += (dx / d) * 2.6 * dt;
        e.z += (dz / d) * 2.6 * dt;
        const fixed = City.resolveCollision(e.x, e.z, 0.5);
        e.x = fixed.x; e.z = fixed.z;
      }
      e.mesh.position.set(e.x, 0, e.z);
      e.fireCd -= dt;
      if (e.fireCd <= 0 && d < 42 && !S.god) {
        e.fireCd = 1.4 + Math.random() * 0.9;
        Combat.enemyShoot(e, player, d);
      }
    }
  },
};
