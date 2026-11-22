// Combat: four weapon slots, hitscan shooting with a short aim assist,
// tracers, muzzle flash and per-target health. Kills go through ONE
// counter — applyHit increments S.killsThisMission, which the mission
// engine reads. (A second counter was the v8 kill-stage bug.)
const Combat = {
  fireCd: 0, tracer: null, tracerT: 0,

  current() { return WEAPONS[S.weapon]; },

  switchWeapon(i) {
    if (i < 0 || i >= WEAPONS.length) return;
    S.weapon = i;
    HUD.toast(`${WEAPONS[i].name} ready`);
    AudioSys.blip(520, 0.06, 'square', 0.1);
  },

  // Hitscan from the camera: aim assist picks the enemy nearest the
  // crosshair inside a small cone; otherwise the shot flies straight.
  fire(scene, camera) {
    const w = Combat.current();
    if (Combat.fireCd > 0) return;
    if (w.ammo !== -1 && S.ammo[S.weapon] <= 0) {
      AudioSys.blip(180, 0.08, 'square', 0.12);
      HUD.toast('No ammo — visit the gun shop');
      Combat.fireCd = 0.3;
      return;
    }
    Combat.fireCd = w.rate;
    S.stats.shots++;
    if (w.ammo !== -1) S.ammo[S.weapon]--;
    AudioSys.shot();
    const p = S.player;
    const origin = new THREE.Vector3(p.x, 1.5, p.z);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    // Aim assist: nearest enemy within 10 degrees of the camera ray.
    let best = null, bestScore = 0.17; // cos(10deg) ~ 0.985 -> use angle
    for (const e of People.enemies) {
      const to = new THREE.Vector3(e.x - p.x, 1.2 - 1.5, e.z - p.z);
      const d = to.length();
      if (d > w.range) continue;
      to.normalize();
      const ang = Math.acos(Math.max(-1, Math.min(1, to.dot(dir))));
      if (ang < 0.22 && (best === null || ang < bestScore)) { best = e; bestScore = ang; }
    }
    let hitPoint = null;
    if (best) {
      hitPoint = new THREE.Vector3(best.x, 1.2, best.z);
      Combat.applyHit(best, w.dmg, 'player');
      S.stats.hits++;
    } else {
      hitPoint = origin.clone().add(dir.clone().multiplyScalar(w.range));
    }
    // Tracer line + muzzle flash, both fade in a few frames.
    if (!Combat.tracer) {
      const geo = new THREE.BufferGeometry().setFromPoints([origin, hitPoint]);
      Combat.tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9 }));
      scene.add(Combat.tracer);
    } else {
      Combat.tracer.geometry.setFromPoints([origin, hitPoint]);
      Combat.tracer.material.opacity = 0.9;
    }
    Combat.tracerT = 0.07;
    HUD.flashMuzzle();
  },

  // The ONLY place kills are counted. Returns true when the target died.
  applyHit(target, dmg, source) {
    target.hp -= dmg;
    if (target.hp > 0) return false;
    if (target.kind === 'enemy' || target.kind === 'cop' || target.kind === 'ped') {
      S.kills++;
      S.killsThisMission++;
      if (target.kind === 'cop') Police.addHeat(1);
      else if (target.kind === 'ped') Police.addHeat(1);
      if (target.kind === 'enemy' || target.kind === 'cop') {
        const i = People.enemies.indexOf(target);
        if (i >= 0) People.enemies.splice(i, 1);
        const j = Police.foot.indexOf(target);
        if (j >= 0) Police.foot.splice(j, 1);
      } else {
        const i = People.peds.indexOf(target);
        if (i >= 0) People.peds.splice(i, 1);
      }
      if (target.mesh.parent) target.mesh.parent.remove(target.mesh);
      HUD.killFeed(`${target.name || 'Pedestrian'} taken out`);
    }
    return true;
  },

  // Enemy return fire: hitscan with a miss chance that grows with distance.
  enemyShoot(enemy, player, dist) {
    AudioSys.noiseBurst(0.1, 0.16, 1400);
    const hitChance = Math.max(0.12, 0.55 - dist * 0.011);
    if (Math.random() < hitChance) Game.damagePlayer(7 + Math.random() * 6, enemy.name || 'shooter');
    // Tracer from the enemy toward the player.
    const scene = City.scene;
    if (scene) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(enemy.x, 1.3, enemy.z),
        new THREE.Vector3(player.x, 1.3, player.z),
      ]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff5566, transparent: true, opacity: 0.8 }));
      scene.add(line);
      setTimeout(() => { if (line.parent) line.parent.remove(line); }, 90);
    }
  },

  update(dt) {
    if (Combat.fireCd > 0) Combat.fireCd -= dt;
    if (Combat.tracer && Combat.tracerT > 0) {
      Combat.tracerT -= dt;
      Combat.tracer.material.opacity = Math.max(0, Combat.tracerT / 0.07) * 0.9;
      if (Combat.tracerT <= 0 && Combat.tracer.parent) Combat.tracer.parent.remove(Combat.tracer);
    }
  },
};
