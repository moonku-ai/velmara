// Velmara island: dusk lagoon city built from three.js boxes, one canvas
// ground texture for the whole road grid, glowing lanterns, a volcanic
// ridge to the north and a marina to the south. Deterministic (seeded rng),
// so every load paints the same city.
const City = {
  scene: null, colliders: [], lanternLights: [],

  // Push a circle (x, z, radius) out of every building AABB. Returns corrected pos.
  resolveCollision(x, z, r) {
    for (const c of City.colliders) {
      const nx = Math.max(c.x0, Math.min(x, c.x1));
      const nz = Math.max(c.z0, Math.min(z, c.z1));
      const dx = x - nx, dz = z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          x = nx + (dx / d) * r; z = nz + (dz / d) * r;
        } else {
          // Dead centre inside a box: shove out along the smallest axis.
          const l = x - c.x0, rr = c.x1 - x, t = z - c.z0, b = c.z1 - z;
          const m = Math.min(l, rr, t, b);
          if (m === l) x = c.x0 - r; else if (m === rr) x = c.x1 + r;
          else if (m === t) z = c.z0 - r; else z = c.z1 + r;
        }
      }
    }
    return { x, z };
  },

  inCanal(x, z) {
    const c = CFG.canal;
    return x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1;
  },
  inWater(x, z) {
    return Math.abs(x) > CFG.world.half || Math.abs(z) > CFG.world.half || City.inCanal(x, z);
  },
  onRoad(x, z) {
    const w = CFG.world.roadWidth / 2 + 1;
    for (const r of CFG.roads) {
      if (Math.abs(x - r) < w || Math.abs(z - r) < w) return true;
    }
    return false;
  },

  // One canvas texture for the whole island floor: asphalt roads, lane
  // dashes, crosswalks, canal water edge and plaza tiles.
  groundTexture() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1024;
    const g = cv.getContext('2d');
    const H = CFG.world.half, scale = 1024 / (H * 2);
    const X = (x) => (x + H) * scale, Z = (z) => (z + H) * scale;
    g.fillStyle = '#232833'; g.fillRect(0, 0, 1024, 1024);
    // block tint variation
    for (let i = 0; i < 40; i++) {
      g.fillStyle = ['#262b38', '#20242e', '#2a2f3d'][i % 3];
      g.fillRect((i * 173) % 1024, (i * 311) % 1024, 120, 90);
    }
    // canal water
    g.fillStyle = '#0e3a4a';
    g.fillRect(X(CFG.canal.x0), Z(CFG.canal.z0), (CFG.canal.x1 - CFG.canal.x0) * scale, (CFG.canal.z1 - CFG.canal.z0) * scale);
    // roads
    g.fillStyle = '#14161c';
    const rw = CFG.world.roadWidth * scale;
    for (const r of CFG.roads) {
      g.fillRect(X(r) - rw / 2, 0, rw, 1024);
      g.fillRect(0, Z(r) - rw / 2, 1024, rw);
    }
    // lane dashes
    g.fillStyle = '#c9a13b';
    for (const r of CFG.roads) {
      for (let t = -200; t < 200; t += 16) {
        g.fillRect(X(t) - 1, Z(r) - 1, 6, 2);
        g.fillRect(X(r) - 1, Z(t) - 1, 2, 6);
      }
    }
    // centre plaza (Lantern Quarter) — dark warm tiles with a gold border
    g.fillStyle = '#2a241c';
    g.fillRect(X(-30), Z(-30), 60 * scale, 60 * scale);
    g.strokeStyle = '#8a6a2a'; g.lineWidth = 2;
    for (let t = -30; t <= 30; t += 10) {
      g.beginPath(); g.moveTo(X(t), Z(-30)); g.lineTo(X(t), Z(30)); g.stroke();
      g.beginPath(); g.moveTo(X(-30), Z(t)); g.lineTo(X(30), Z(t)); g.stroke();
    }
    g.strokeStyle = '#ffc94d'; g.lineWidth = 3;
    g.strokeRect(X(-30), Z(-30), 60 * scale, 60 * scale);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  },

  // Building facade texture: dark walls, lit windows, neon sign strip.
  facadeTexture(base, lit) {
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 256;
    const g = cv.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 128, 256);
    for (let y = 14; y < 240; y += 26) {
      for (let x = 10; x < 118; x += 24) {
        g.fillStyle = cityRng() < 0.62 ? lit : '#1a2030';
        g.fillRect(x, y, 14, 16);
      }
    }
    g.fillStyle = ['#ff5da2', '#37e0c8', '#ffc94d'][Math.floor(cityRng() * 3)];
    g.fillRect(0, 232, 128, 10);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  build(scene) {
    City.scene = scene;
    const H = CFG.world.half;

    // Water lagoon under everything, island floor above it.
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(1100, 1100),
      new THREE.MeshStandardMaterial({ color: CFG.colors.water, roughness: 0.25, metalness: 0.35 })
    );
    water.rotation.x = -Math.PI / 2; water.position.y = -0.6;
    scene.add(water);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(H * 2, H * 2),
      new THREE.MeshStandardMaterial({ map: City.groundTexture(), roughness: 0.9, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    scene.add(ground);

    // Buildings: one box per block cell, skipped on roads, canal and plazas.
    const bases = ['#2e3444', '#332f3a', '#2a3038', '#3a2f33'];
    const lits = ['#ffd27a', '#9fe8ff', '#ffb3d1'];
    const facades = bases.map((b, i) => {
      const t = City.facadeTexture(b, lits[i % lits.length]);
      return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.85 });
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1c2029, roughness: 0.95 });
    // Buildings sit in the BLOCKS between roads (centres at ±30, ±90, ±150),
    // never on a road or an intersection — every mission marker, package
    // and shop sits on the road grid and must stay reachable.
    const cells = [];
    for (let gx = -3; gx <= 2; gx++) for (let gz = -3; gz <= 2; gz++) {
      const cx = gx * 60 + 30, cz = gz * 60 + 30;
      if (Math.abs(cx) < 34 && Math.abs(cz) < 34) continue; // centre plaza stays open
      if (cx > -110 && cx < -60 && cz > -210 && cz < 60) continue; // canal strip
      cells.push([cx, cz]);
    }
    for (const [cx, cz] of cells) {
      const w = rngRange(cityRng, 22, 34), d = rngRange(cityRng, 22, 34);
      const h = rngRange(cityRng, 9, 30);
      const ox = rngRange(cityRng, -6, 6), oz = rngRange(cityRng, -6, 6);
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facades[Math.floor(cityRng() * facades.length)]);
      b.position.set(cx + ox, h / 2, cz + oz);
      b.castShadow = true; b.receiveShadow = true;
      scene.add(b);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 1.2, d * 0.7), roofMat);
      roof.position.set(cx + ox, h + 0.6, cz + oz);
      scene.add(roof);
      City.colliders.push({ x0: cx + ox - w / 2, x1: cx + ox + w / 2, z0: cz + oz - d / 2, z1: cz + oz + d / 2 });
      // Rooftop beacon on tall towers.
      if (h > 22) {
        const bc = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff4444 }));
        bc.position.set(cx + ox, h + 2.2, cz + oz);
        scene.add(bc);
      }
    }

    // Volcanic ridge: dark cones along the north edge, glowing craters.
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x241d2e, roughness: 1 });
    const craterMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a });
    for (let i = 0; i < 6; i++) {
      const x = -200 + i * 80 + rngRange(cityRng, -14, 14);
      const r = rngRange(cityRng, 34, 52), h = rngRange(cityRng, 42, 68);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), ridgeMat);
      cone.position.set(x, h / 2 - 1, -196 - rngRange(cityRng, 0, 18));
      scene.add(cone);
      const crater = new THREE.Mesh(new THREE.ConeGeometry(r * 0.22, 6, 7), craterMat);
      crater.position.set(x, h + 1, -196);
      scene.add(crater);
    }

    // Lantern poles along the main avenues: pole + glowing paper lantern.
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.7 });
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    const lanternGlow = new THREE.PointLight(0xff9a3d, 12, 34, 1.6);
    for (let i = 0; i < 26; i++) {
      const along = -180 + i * 15;
      const onX = i % 2 === 0;
      const x = onX ? along : (i % 4 < 2 ? -62 : 62);
      const z = onX ? (i % 4 < 2 ? -62 : 62) : along;
      if (City.inCanal(x, z)) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.4, 6), poleMat);
      pole.position.set(x, 2.7, z);
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), lanternMat);
      lamp.position.set(x, 5.6, z);
      scene.add(lamp);
      if (i % 5 === 0) {
        const pl = new THREE.PointLight(0xff9a3d, 14, 40, 1.7);
        pl.position.set(x, 6, z);
        scene.add(pl);
        City.lanternLights.push(pl);
      }
    }

    // Night market stalls in Old Pasaru, west of the -120 road (off the
    // road itself, so the M2 market marker stays walkable).
    const awn = [0xff5da2, 0x37e0c8, 0xffc94d, 0x7fb2ff];
    for (let i = 0; i < 10; i++) {
      const x = -142 + (i % 5) * 3, z = -12 + Math.floor(i / 5) * 12;
      const stall = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.4, 3.5),
        new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.9 }));
      stall.position.set(x, 1.2, z); stall.castShadow = true;
      scene.add(stall);
      const top = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.25, 4.2),
        new THREE.MeshStandardMaterial({ color: awn[i % 4], roughness: 0.6, emissive: awn[i % 4], emissiveIntensity: 0.25 }));
      top.position.set(x, 2.6, z);
      scene.add(top);
      City.colliders.push({ x0: x - 2.2, x1: x + 2.2, z0: z - 1.7, z1: z + 1.7 });
    }

    // Dock containers at the north docks and marina boats to the south.
    const contCols = [0x2a6f8f, 0x8f5a2a, 0x4a8f2a, 0x8f2a4a];
    for (let i = 0; i < 12; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(7, 2.8, 3),
        new THREE.MeshStandardMaterial({ color: contCols[i % 4], roughness: 0.8 }));
      c.position.set(-170 + (i % 6) * 9, 1.4, -168 + Math.floor(i / 6) * 6);
      c.castShadow = true;
      scene.add(c);
      City.colliders.push({ x0: c.position.x - 3.5, x1: c.position.x + 3.5, z0: c.position.z - 1.5, z1: c.position.z + 1.5 });
    }
    for (let i = 0; i < 5; i++) {
      const boat = new THREE.Mesh(new THREE.BoxGeometry(9, 1.6, 3.4),
        new THREE.MeshStandardMaterial({ color: 0xd8d3c0, roughness: 0.6 }));
      boat.position.set(-120 + i * 55, 0.2, 196);
      scene.add(boat);
    }

    // Canal bridges at each road crossing.
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4d, roughness: 0.85 });
    for (const r of CFG.roads) {
      const br = new THREE.Mesh(new THREE.BoxGeometry(26, 0.5, CFG.world.roadWidth + 4), bridgeMat);
      br.position.set(-84, 0.35, r);
      br.receiveShadow = true;
      scene.add(br);
    }

    // Street trees: trunk + glowing canopy spheres.
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a1f16, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1d4a2e, roughness: 1, emissive: 0x0d2a18, emissiveIntensity: 0.5 });
    for (let i = 0; i < 34; i++) {
      const x = rngRange(cityRng, -190, 190), z = rngRange(cityRng, -190, 190);
      if (City.onRoad(x, z) || City.inCanal(x, z)) continue;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), trunkMat);
      t.position.set(x, 1.5, z);
      scene.add(t);
      const l = new THREE.Mesh(new THREE.SphereGeometry(rngRange(cityRng, 1.6, 2.6), 8, 6), leafMat);
      l.position.set(x, 4, z);
      scene.add(l);
    }

    // Stars + a low dusk moon.
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    for (let i = 0; i < 260; i++) {
      const a = cityRng() * Math.PI * 2, e = rngRange(cityRng, 0.25, 1.4), r = 700;
      starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcdd8ff, size: 1.6, sizeAttenuation: false })));
    const moon = new THREE.Mesh(new THREE.CircleGeometry(16, 24),
      new THREE.MeshBasicMaterial({ color: 0xffe9b0, fog: false }));
    moon.position.set(-260, 190, -420); moon.lookAt(0, 40, 0);
    scene.add(moon);
  },

  // Glowing ground ring + light beam used for mission targets and checkpoints.
  makeMarker(color) {
    const grp = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.22, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    ring.position.y = 0.15;
    grp.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 26, 10, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.y = 13;
    grp.add(beam);
    return grp;
  },

  // Small glowing lantern cache (hidden package).
  makePackage() {
    const grp = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xffc94d, emissive: 0xff9a3d, emissiveIntensity: 1.4, roughness: 0.4 }));
    box.position.y = 0.9;
    grp.add(box);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.6 }));
    glow.position.y = 0.9;
    grp.add(glow);
    return grp;
  },

  // Stunt ramp wedge.
  makeRamp() {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xff5da2, emissive: 0xff5da2, emissiveIntensity: 0.4, roughness: 0.6 }));
    ramp.rotation.x = -0.32;
    ramp.position.y = 0.8;
    return ramp;
  },
};
