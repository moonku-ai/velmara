/* vehicles.js — car meshes, arcade driving, traffic AI, the stealable mission cars. */
VEL.Vehicles = {
  cars: [], traffic: [], nextId: 1,
  palette: [0xff8a3d, 0x37e08a, 0x8fd8ff, 0xff6b9d, 0xd8d2c0, 0xc9a2ff, 0xffe9a8, 0x4a6bff],
  makeCarMesh(color, isTruck) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({ color, shininess: 90, specular: 0x666666 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(isTruck ? 3 : 2.1, 0.85, isTruck ? 7 : 4.6), bodyMat);
    body.position.y = 0.75; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(isTruck ? 2.6 : 1.8, 0.8, isTruck ? 2.2 : 2.2), new THREE.MeshPhongMaterial({ color: 0x101828, shininess: 140 }));
    cab.position.set(0, 1.5, isTruck ? 1.6 : -0.2); g.add(cab);
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
    for (const [wx, wz] of [[-1.05, 1.5], [1.05, 1.5], [-1.05, -1.5], [1.05, -1.5]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.42, wz); g.add(w);
    }
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    for (const lx of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), lightMat); l.position.set(lx, 0.8, 2.32); g.add(l); }
    return g;
  },
  spawnCar(x, z, heading, opts) {
    const o = opts || {};
    const mesh = this.makeCarMesh(o.color != null ? o.color : VEL.RNG.color(this.palette), !!o.truck);
    mesh.position.set(x, 0, z); mesh.rotation.y = heading || 0;
    VEL.Game.scene.add(mesh);
    const car = {
      id: this.nextId++, mesh, x, z, heading: heading || 0, speed: 0, hp: o.hp || 100,
      maxSpeed: o.maxSpeed || VEL.CFG.carMax, color: o.color || 0, isTruck: !!o.truck,
      isPolice: !!o.police, isTraffic: !!o.traffic, name: o.name || 'SEDAN', mission: !!o.mission,
      target: o.target || null, stuck: 0,
    };
    this.cars.push(car);
    if (car.isTraffic) this.traffic.push(car);
    return car;
  },
  removeCar(car) {
    VEL.Game.scene.remove(car.mesh);
    this.cars = this.cars.filter((c) => c !== car);
    this.traffic = this.traffic.filter((c) => c !== car);
  },
  nearestCar(x, z, maxD) {
    let best = null, bd = maxD;
    for (const c of this.cars) {
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  },
  drive(car, throttle, steer, dt) {
    const C = VEL.CFG;
    car.speed += throttle * C.carAccel * dt;
    car.speed -= car.speed * 0.6 * dt; // drag
    if (throttle < 0) car.speed -= C.carBrake * dt * 0.4;
    car.speed = Math.max(-14, Math.min(car.maxSpeed, car.speed));
    if (Math.abs(car.speed) > 0.5) car.heading += steer * C.carTurn * dt * (car.speed > 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 10);
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    const p = VEL.City.collide(nx, nz, 2.2);
    if (Math.abs(p.x - nx) > 0.01 || Math.abs(p.z - nz) > 0.01) { car.speed *= 0.55; VEL.Game.carDamage(car, Math.abs(car.speed) * 0.4); }
    car.x = p.x; car.z = p.z;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    // body roll + wheel spin feel
    car.mesh.rotation.z = -steer * 0.04 * Math.min(1, Math.abs(car.speed) / 20);
  },
  updateTraffic(dt) {
    const S = VEL.State, R = VEL.RNG;
    for (const car of this.traffic) {
      // simple lane follower: drive along current road axis, turn at intersections sometimes
      car.speed += (10 - car.speed) * dt * 0.5;
      const nx = car.x + Math.sin(car.heading) * car.speed * dt;
      const nz = car.z + Math.cos(car.heading) * car.speed * dt;
      const p = VEL.City.collide(nx, nz, 2.2);
      if (Math.abs(p.x - nx) > 0.01 || Math.abs(p.z - nz) > 0.01) {
        car.heading += Math.PI / 2 * (R.next() > 0.5 ? 1 : -1);
        car.x = p.x; car.z = p.z;
      } else { car.x = nx; car.z = nz; }
      // avoid the player car
      if (S.inCar && S.car) {
        const d = Math.hypot(car.x - S.car.x, car.z - S.car.z);
        if (d < 8) { car.heading += dt * 1.5; }
      }
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
    }
  },
  spawnTraffic(n) {
    const R = VEL.RNG;
    for (let i = 0; i < n; i++) {
      const x = R.int(-4, 4) * 42, z = R.int(-4, 4) * 42;
      this.spawnCar(x, z, (R.int(0, 3) * Math.PI) / 2, { traffic: true, color: R.color(this.palette) });
    }
  },
};
