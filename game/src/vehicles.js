// Vehicles: box-built cars (body, cabin, wheels, headlights), arcade driving
// physics, and traffic AI that loops the road grid. Damage is tracked
// PER CAR (car.hp), never globally — a police car hitting a wall must not
// hurt the player's car.
const Vehicles = {
  list: [], traffic: [],

  carColors: [0xff7a2a, 0x37e0c8, 0xff5da2, 0x7fb2ff, 0xd8d3c0, 0xc94d4d, 0x9a7bff, 0x3fae6a],

  makeCarMesh(color, kind) {
    const grp = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0e1622, roughness: 0.1, metalness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, kind === 'truck' ? 5.6 : 4.3), bodyMat);
    body.position.y = 0.62; body.castShadow = true;
    grp.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.58, kind === 'truck' ? 1.6 : 2.1), glassMat);
    cab.position.set(0, 1.18, kind === 'truck' ? -1.4 : -0.25); cab.castShadow = true;
    grp.add(cab);
    if (kind === 'truck') {
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.7, 3.2),
        new THREE.MeshStandardMaterial({ color: 0x8f8a7a, roughness: 0.7 }));
      box.position.set(0, 1.5, 1.1); box.castShadow = true;
      grp.add(box);
    }
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.9 });
    const len = kind === 'truck' ? 5.6 : 4.3;
    for (const [wx, wz] of [[-1.0, -len / 2 + 0.7], [1.0, -len / 2 + 0.7], [-1.0, len / 2 - 0.7], [1.0, len / 2 - 0.7]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.36, wz);
      grp.add(w);
    }
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
    for (const s of [-0.7, 0.7]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), lampMat);
      lamp.position.set(s, 0.66, -(len / 2) - 0.02);
      grp.add(lamp);
    }
    if (kind === 'police') {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x2244ff }));
      bar.position.set(0, 1.56, -0.25);
      grp.add(bar);
      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.17, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xff2233 }));
      bar2.position.set(0.62, 1.56, -0.25);
      grp.add(bar2);
    }
    return grp;
  },

  // kind: 'sedan' | 'comet' (sports) | 'truck' | 'taxi' | 'police'
  spawn(kind, x, z, yaw, color) {
    const car = {
      kind, x, z, yaw: yaw || 0, speed: 0, steer: 0,
      hp: 100, maxHp: 100, driver: null, ai: null,
      mesh: Vehicles.makeCarMesh(color ?? Vehicles.carColors[Math.floor(Math.random() * Vehicles.carColors.length)], kind),
    };
    if (kind === 'police') {
      car.mesh.children[0].material = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.35, metalness: 0.5 });
    }
    if (kind === 'taxi') {
      car.mesh.children[0].material = new THREE.MeshStandardMaterial({ color: 0xffc21c, roughness: 0.35, metalness: 0.5 });
    }
    car.mesh.position.set(x, 0, z);
    car.mesh.rotation.y = car.yaw;
    Vehicles.list.push(car);
    return car;
  },

  remove(car) {
    const i = Vehicles.list.indexOf(car);
    if (i >= 0) Vehicles.list.splice(i, 1);
    if (car.mesh.parent) car.mesh.parent.remove(car.mesh);
  },

  // Arcade driving: throttle, brake/reverse, steering that bites harder
  // at low speed, gentle drift, per-car damage on hard impacts.
  drive(car, dt, throttle, steerIn) {
    const maxF = car.kind === 'comet' ? 34 : car.kind === 'truck' ? 22 : 28;
    const maxR = 10;
    if (throttle > 0) car.speed += 16 * throttle * dt;
    else if (throttle < 0) car.speed += (car.speed > 0.5 ? -26 : -9) * dt;
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
    car.speed = Math.max(-maxR, Math.min(maxF, car.speed));
    const steerTarget = steerIn * (0.55 + 0.45 * Math.max(0, 1 - Math.abs(car.speed) / maxF));
    car.steer += (steerTarget - car.steer) * Math.min(1, dt * 7);
    if (Math.abs(car.speed) > 0.3) {
      // Turn rate keeps a floor at low speed: a car that can barely turn
      // while creeping cannot get out of a dead end.
      const spdFactor = Math.min(1, 0.3 + Math.abs(car.speed) / 14);
      car.yaw -= car.steer * spdFactor * 1.9 * dt * Math.sign(car.speed);
    }
    let nx = car.x + Math.sin(car.yaw) * car.speed * dt * -1;
    let nz = car.z + Math.cos(car.yaw) * car.speed * dt * -1;
    // World bounds + building collision: scrape, don't pass through.
    nx = Math.max(-CFG.world.half + 3, Math.min(CFG.world.half - 3, nx));
    nz = Math.max(-CFG.world.half + 3, Math.min(CFG.world.half - 3, nz));
    const fixed = City.resolveCollision(nx, nz, 1.7);
    if (fixed.x !== nx || fixed.z !== nz) {
      // Hard hit: per-car damage, speed scrubbed.
      if (Math.abs(car.speed) > 9) car.hp = Math.max(0, car.hp - (Math.abs(car.speed) - 9) * 0.55);
      car.speed *= 0.45;
      nx = fixed.x; nz = fixed.z;
    }
    car.x = nx; car.z = nz;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.yaw;
    // Slight body roll in corners.
    car.mesh.rotation.z = -car.steer * Math.min(1, Math.abs(car.speed) / 20) * 0.06;
    return car;
  },

  // Traffic: pick a random road loop, drive it, wrap at the island edge.
  spawnTraffic(scene, n) {
    for (let i = 0; i < n; i++) {
      const road = CFG.roads[Math.floor(Math.random() * CFG.roads.length)];
      const along = (Math.random() * 2 - 1) * 190;
      const vertical = Math.random() < 0.5;
      const car = Vehicles.spawn('sedan', vertical ? road : along, vertical ? along : road, vertical ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2));
      car.speed = 9 + Math.random() * 5;
      car.ai = { vertical, road, dir: Math.random() < 0.5 ? 1 : -1 };
      scene.add(car.mesh);
      Vehicles.traffic.push(car);
    }
  },

  updateTraffic(dt) {
    for (const car of Vehicles.traffic) {
      const sp = car.ai.dir * (9 + (car.speed % 5));
      if (car.ai.vertical) {
        car.z += sp * dt;
        if (car.z > 205) car.z = -205;
        if (car.z < -205) car.z = 205;
        car.yaw = car.ai.dir > 0 ? Math.PI : 0;
        car.x = car.ai.road;
      } else {
        car.x += sp * dt;
        if (car.x > 205) car.x = -205;
        if (car.x < -205) car.x = 205;
        car.yaw = car.ai.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
        car.z = car.ai.road;
      }
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.yaw;
    }
  },
};
