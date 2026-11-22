/* combat.js — hitscan shooting, tracers, muzzle flash, reload, enemy fire, damage to player/car. */
VEL.Combat = {
  tracers: [], fireCd: 0, reloadTimer: 0, mags: [Infinity, 12, 30, 6],
  weapon() { return VEL.CFG.weapons[VEL.State.weaponIdx]; },
  tryFire() {
    const S = VEL.State;
    if (S.inCar || S.dead || this.reloadTimer > 0 || this.fireCd > 0) return;
    const w = this.weapon();
    if (w.id === 'fists') { this.melee(); return; }
    if (this.mags[S.weaponIdx] <= 0) { this.reload(); return; }
    this.fireCd = w.rate;
    this.mags[S.weaponIdx]--;
    S.stats.shotsFired++;
    VEL.Audio.shot();
    S.gunfireTimer = 1.5;
    // aim from camera centre: raycast against enemies, police foot units, traffic cars
    const cam = VEL.Game.camera;
    const origin = cam.position.clone();
    const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
    let best = null, bd = w.range;
    const consider = (x, z, y, ref, hp) => {
      const dx = x - origin.x, dz = z - origin.z, dy = y - origin.y;
      const along = dx * dir.x + dy * dir.y + dz * dir.z;
      if (along < 1 || along > bd) return;
      const px = origin.x + dir.x * along, py = origin.y + dir.y * along, pz = origin.z + dir.z * along;
      const dd = Math.hypot(x - px, y - py, z - pz);
      if (dd < 2.2) { bd = along; best = { ref, hp, along }; }
    };
    for (const e of VEL.People.enemies) if (!e.dead) consider(e.x, e.z, 1.2, e, 'enemy');
    for (const u of VEL.Police.units) if (u.kind === 'foot') consider(u.x, u.z, 1.2, u, 'police');
    for (const c of VEL.Vehicles.cars) if (!c.isTraffic || true) consider(c.x, c.z, 1, c, 'car');
    const end = origin.clone().add(dir.clone().multiplyScalar(bd));
    this.spawnTracer(origin, end);
    if (best) {
      S.stats.shotsHit++;
      const spread = w.id === 'shotgun' ? 3 : 1;
      for (let i = 0; i < spread; i++) this.applyHit(best.ref, best.hp, w.dmg);
    }
  },
  applyHit(ref, kind, dmg) {
    const S = VEL.State;
    if (kind === 'enemy') {
      ref.hp -= dmg; VEL.Audio.hit();
      if (ref.hp <= 0 && !ref.dead) {
        ref.dead = true;
        ref.mesh.rotation.x = -Math.PI / 2; ref.mesh.position.y = 0.4;
        S.stats.takenOut++; S.stats.killsThisMission++; S.killsThisMission++;
        VEL.Police.addWanted(0); // killing already-heated enemies keeps heat
        VEL.HUD.toast(ref.name + ' DOWN');
        setTimeout(() => VEL.People.removeEnemy(ref), 4000);
      }
    } else if (kind === 'police') {
      ref.hp -= dmg;
      if (ref.hp <= 0) { VEL.Police.removeUnit(ref); S.stats.takenOut++; VEL.Police.addWanted(1); VEL.HUD.toast('VPD OFFICER DOWN — WANTED UP'); }
    } else if (kind === 'car') {
      ref.hp -= dmg;
      if (ref.hp <= 0 && !ref.isTraffic) { /* player car explosion handled in game */ }
    }
  },
  melee() {
    const S = VEL.State;
    this.fireCd = 0.35; VEL.Audio.hit();
    for (const e of VEL.People.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - S.player.x, e.z - S.player.z) < 2.4) this.applyHit(e, 'enemy', 12);
    }
  },
  enemyShoot(from, dist) {
    const S = VEL.State;
    if (S.dead || S.god) return;
    const fromPos = new THREE.Vector3(from.x || 0, from.y ? from.y : 1.4, from.z || 0);
    const to = new THREE.Vector3(S.player.x, 1.2, S.player.z);
    this.spawnTracer(fromPos, to, 0xff5566);
    VEL.Audio.shot();
    // hit chance falls with distance
    const hitP = Math.max(0.08, 0.42 - dist * 0.008);
    if (VEL.RNG.next() < hitP) {
      const dmg = 6 + VEL.RNG.range(0, 6);
      VEL.Game.damagePlayer(dmg, 'shot');
    }
  },
  spawnTracer(a, b, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color || 0xffd24d, transparent: true, opacity: 0.9 }));
    VEL.Game.scene.add(line);
    this.tracers.push({ line, life: 0.09 });
  },
  reload() {
    const S = VEL.State, w = this.weapon();
    if (w.id === 'fists' || this.reloadTimer > 0) return;
    this.reloadTimer = 1.1;
    VEL.HUD.toast('RELOADING ' + w.name + '…');
  },
  update(dt) {
    this.fireCd -= dt;
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const S = VEL.State, w = this.weapon();
        const need = w.mag - this.mags[S.weaponIdx];
        const take = Math.min(need, w.ammo);
        this.mags[S.weaponIdx] += take;
        VEL.HUD.toast(w.name + ' RELOADED');
      }
    }
    for (const t of this.tracers) { t.life -= dt; if (t.life <= 0) { VEL.Game.scene.remove(t.line); } }
    this.tracers = this.tracers.filter((t) => t.life > 0);
  },
};
