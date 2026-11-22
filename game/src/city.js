/* city.js — builds the Velmara island in three.js: lagoon water, road grid, canal, neon buildings,
   lantern poles, volcanic ridge, marina, market stalls, casino, bank, docks. All procedural geometry. */
VEL.City = {
  scene: null, colliders: [], lanterns: [], markers: {}, buildings: [], water: null, ridge: null,
  build(scene) {
    this.scene = scene; this.colliders = []; this.lanterns = [];
    const R = VEL.RNG; R.setSeed(7);
    const H = VEL.CFG.half;
    scene.fog = new THREE.FogExp2(0x1a1438, 0.0016);
    // Water ring around the island
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshPhongMaterial({ color: 0x0a2e4a, shininess: 120, specular: 0x88bbff }));
    water.rotation.x = -Math.PI / 2; water.position.y = -0.4; scene.add(water); this.water = water;
    // Island ground
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(H * 2 + 40, H * 2 + 40), new THREE.MeshLambertMaterial({ color: 0x232a44 }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    // Roads: grid every 42 units
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x141828 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    for (let i = -5; i <= 5; i++) {
      const c = i * 42;
      const h = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, 12), roadMat); h.rotation.x = -Math.PI / 2; h.position.set(0, 0.02, c); scene.add(h);
      const v = new THREE.Mesh(new THREE.PlaneGeometry(12, H * 2), roadMat); v.rotation.x = -Math.PI / 2; v.position.set(c, 0.02, 0); scene.add(v);
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, 0.5), lineMat); dash.rotation.x = -Math.PI / 2; dash.position.set(0, 0.04, c); scene.add(dash);
    }
    // Canal: a teal strip crossing Old Pasaru (x -126..-84), with bridges
    const canal = new THREE.Mesh(new THREE.PlaneGeometry(26, H * 2), new THREE.MeshPhongMaterial({ color: 0x0e5a6e, shininess: 140, specular: 0xaaddff }));
    canal.rotation.x = -Math.PI / 2; canal.position.set(-105, 0.05, 0); scene.add(canal);
    for (let z = -126; z <= 126; z += 84) {
      const br = new THREE.Mesh(new THREE.BoxGeometry(34, 1.2, 16), new THREE.MeshLambertMaterial({ color: 0x3a3450 }));
      br.position.set(-105, 0.6, z); scene.add(br);
    }
    // Buildings: blocks between roads, neon-lit windows
    const wallCols = [0x2e3550, 0x3a2a4a, 0x24384a, 0x4a2a3a, 0x2a4038];
    const winCols = [0xffb347, 0xff6b9d, 0x8fd8ff, 0x37e08a, 0xffe9a8];
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    for (let gx = -4; gx <= 4; gx++) for (let gz = -4; gz <= 4; gz++) {
      if (gx === 0 && gz === 0) continue;
      const bx = gx * 42 + 21, bz = gz * 42 + 21;
      if (Math.abs(bx + 105) < 16) continue; // canal gap
      const n = R.int(1, 3);
      for (let k = 0; k < n; k++) {
        const w = R.range(10, 18), d = R.range(10, 18), h = R.range(7, 30);
        const x = bx + R.range(-6, 6), z = bz + R.range(-6, 6);
        const mat = new THREE.MeshLambertMaterial({ color: R.color(wallCols) });
        const b = new THREE.Mesh(boxGeo, mat); b.scale.set(w, h, d); b.position.set(x, h / 2, z); scene.add(b);
        this.buildings.push(b);
        this.colliders.push({ x, z, hw: w / 2 + 0.6, hd: d / 2 + 0.6 });
        // neon window strip
        const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.5, 0.2), new THREE.MeshBasicMaterial({ color: R.color(winCols) }));
        win.position.set(x, h * 0.72, z + d / 2 + 0.1); scene.add(win);
        const win2 = win.clone(); win2.position.z = z - d / 2 - 0.1; scene.add(win2);
      }
    }
    // Landmark buildings
    this.landmark(scene, 0, 84, 26, 22, 18, 0xffb347, 'GRAND LANTERN'); // casino
    this.landmark(scene, 42, -105, 22, 16, 14, 0x8fd8ff, 'VAULT BANK');
    this.landmark(scene, -105, 21, 20, 10, 16, 0xff6b9d, 'CANAL MARKET');
    this.landmark(scene, 0, -105, 24, 12, 14, 0x37e08a, 'KUMALA DOCKS');
    // Lantern poles along roads
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x1a1a22 });
    for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
      if ((i + j) % 2) continue;
      const x = i * 42 + 8, z = j * 42 + 8;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6), poleMat);
      pole.position.set(x, 3.5, z); scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), new THREE.MeshBasicMaterial({ color: (i + j) % 4 === 0 ? 0xff6b9d : 0xffb347 }));
      lamp.position.set(x, 7.2, z); scene.add(lamp); this.lanterns.push(lamp);
      if ((i + j) % 6 === 0) { const glow = new THREE.PointLight(lamp.material.color, 0.7, 26); glow.position.set(x, 7, z); scene.add(glow); }
    }
    // Volcanic ridge at the north edge (background silhouette)
    const ridgeMat = new THREE.MeshLambertMaterial({ color: 0x1c1426 });
    for (let i = 0; i < 7; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(R.range(28, 48), R.range(45, 80), 7), ridgeMat);
      cone.position.set(-240 + i * 80 + R.range(-12, 12), 20, 260 + R.range(-8, 8)); scene.add(cone);
    }
    const lava = new THREE.Mesh(new THREE.ConeGeometry(10, 26, 7), new THREE.MeshBasicMaterial({ color: 0xff5a2a }));
    lava.position.set(0, 58, 262); scene.add(lava);
    // Marina: piers + boats at the south edge
    const pierMat = new THREE.MeshLambertMaterial({ color: 0x4a3423 });
    for (let i = -2; i <= 2; i++) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 34), pierMat);
      pier.position.set(i * 36, 0.4, -196); scene.add(pier);
      const boat = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 12), new THREE.MeshLambertMaterial({ color: 0xd8d2c0 }));
      boat.position.set(i * 36, 0.6, -214); scene.add(boat);
    }
    // Market stalls in Old Pasaru
    const stallCols = [0xff6b9d, 0xffb347, 0x37e08a];
    for (let i = 0; i < 10; i++) {
      const x = -126 + R.range(0, 40), z = -21 + i * 8;
      const stall = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 3.4), new THREE.MeshLambertMaterial({ color: 0x3a2a22 }));
      stall.position.set(x, 1.3, z); scene.add(stall);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.6, 4), new THREE.MeshLambertMaterial({ color: R.color(stallCols) }));
      roof.position.set(x, 3.4, z); roof.rotation.y = Math.PI / 4; scene.add(roof);
      this.colliders.push({ x, z, hw: 2.8, hd: 2 });
    }
    // Objective marker (gold ring + beam), moved by missions
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.35, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd24d }));
    ring.rotation.x = Math.PI / 2; ring.position.set(21, 0.6, 84); scene.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 60, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd24d, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
    beam.position.set(21, 30, 84); scene.add(beam);
    this.markers.ring = ring; this.markers.beam = beam;
    // Streetlights: dusk ambience
    scene.add(new THREE.AmbientLight(0x4a4a7a, 0.85));
    const moon = new THREE.DirectionalLight(0x9db4ff, 0.9); moon.position.set(-120, 180, 60); scene.add(moon);
    const dusk = new THREE.PointLight(0xff8a5a, 1.1, 420); dusk.position.set(0, 60, 40); scene.add(dusk);
  },
  landmark(scene, x, z, w, h, d, col, name) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: 0x2e2a4a }));
    b.position.set(x, h / 2, z); scene.add(b);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 2.2, 0.4), new THREE.MeshBasicMaterial({ color: col }));
    sign.position.set(x, h + 1.2, z + d / 2 + 0.2); scene.add(sign);
    this.colliders.push({ x, z, hw: w / 2 + 0.6, hd: d / 2 + 0.6 });
    return b;
  },
  setMarker(x, z, visible) {
    if (!this.markers.ring) return;
    this.markers.ring.position.set(x, 0.6, z);
    this.markers.beam.position.set(x, 30, z);
    this.markers.ring.visible = visible; this.markers.beam.visible = visible;
  },
  collide(x, z, r) {
    const H = VEL.CFG.half;
    x = Math.max(-H, Math.min(H, x)); z = Math.max(-H, Math.min(H, z));
    for (const c of this.colliders) {
      const dx = x - c.x, dz = z - c.z;
      if (Math.abs(dx) < c.hw + r && Math.abs(dz) < c.hd + r) {
        const px = c.hw + r - Math.abs(dx), pz = c.hd + r - Math.abs(dz);
        if (px < pz) x = c.x + Math.sign(dx || 1) * (c.hw + r); else z = c.z + Math.sign(dz || 1) * (c.hd + r);
      }
    }
    return { x, z };
  },
  update(dt, t) {
    for (let i = 0; i < this.lanterns.length; i++) {
      const s = 0.85 + Math.sin(t * 2 + i) * 0.15;
      this.lanterns[i].scale.set(s, s, s);
    }
    if (this.markers.ring && this.markers.ring.visible) {
      this.markers.ring.rotation.z += dt * 1.5;
      this.markers.ring.position.y = 0.6 + Math.sin(t * 2) * 0.3;
    }
  },
};
