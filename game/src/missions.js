// Story missions: a data-driven stage machine over MISSIONS in config.js.
// Each stage completes through the same code path the player uses — walk
// to a marker, steal a car, kill the counted enemies, tail a courier.
// Rewards land on completion; a medal (G/S/B) rates time + damage taken.
const Missions = {
  marker: null, tailCar: null, targetCar: null,

  available() { return MISSIONS.filter((m) => !S.missionRatings[m.id]); },

  start(id) {
    const def = MISSIONS.find((m) => m.id === id);
    if (!def) return false;
    if (S.mission) return false;
    S.mission = { def, stage: 0, kills: 0, timer: 0, damageTaken: 0, startedAt: S.time };
    S.killsThisMission = 0;
    Missions.showStage();
    HUD.dialog(def.giver, def.brief);
    AudioSys.mission();
    Game.spawnMissionCar(def);
    // Stage 0 may already need actors (a tail target, a kill squad) —
    // setup runs for the opening stage as well as for every advance.
    Missions.setupStage(Missions.currentStage());
    return true;
  },

  // Spawn whatever the stage needs: enemies for a kill stage, the courier
  // for a tail stage, the wanted level for an escape stage.
  setupStage(st) {
    if (!st) return;
    if (st.type === 'kill') Missions.spawnStageEnemies(st);
    if (st.type === 'tail') Missions.spawnTailTarget(st);
    if (st.type === 'escape') Police.setWanted(st.wanted || 4);
  },

  currentStage() {
    if (!S.mission) return null;
    return S.mission.def.stages[S.mission.stage];
  },

  showStage() {
    const st = Missions.currentStage();
    const m = S.mission;
    if (!st || !m) return;
    HUD.banner(`MISSION ${m.def.id} · ${m.def.title.toUpperCase()}`, `STAGE ${m.stage + 1}/${m.def.stages.length} — ${st.title}`, st.text);
    Missions.placeMarker(st);
  },

  placeMarker(st) {
    const scene = City.scene;
    if (Missions.marker && Missions.marker.parent) Missions.marker.parent.remove(Missions.marker);
    Missions.marker = null;
    if (!scene || !st || st.x === undefined) return;
    Missions.marker = City.makeMarker(0xffc94d);
    Missions.marker.position.set(st.x, 0, st.z);
    scene.add(Missions.marker);
  },

  clearMarker() {
    if (Missions.marker && Missions.marker.parent) Missions.marker.parent.remove(Missions.marker);
    Missions.marker = null;
  },

  advance() {
    const m = S.mission;
    if (!m) return;
    m.stage++;
    S.killsThisMission = 0;
    if (m.stage >= m.def.stages.length) { Missions.complete(); return; }
    Missions.setupStage(Missions.currentStage());
    Missions.showStage();
    AudioSys.pickup();
  },

  spawnStageEnemies(st) {
    const scene = City.scene;
    People.clearEnemies(scene);
    const names = ['V. Kroll', 'D. Marek', 'S. Ivers', 'T. Bane', 'R. Kade', 'J. Fenn', 'M. Ostr', 'L. Vane'];
    for (let i = 0; i < st.count; i++) {
      const a = (i / st.count) * Math.PI * 2;
      const x = st.x + Math.sin(a) * (8 + (i % 3) * 4);
      const z = st.z + Math.cos(a) * (8 + (i % 3) * 4);
      People.spawnEnemy(scene, x, z, names[i % names.length], 60);
    }
  },

  spawnTailTarget(st) {
    const scene = City.scene;
    if (Missions.tailCar) Vehicles.remove(Missions.tailCar);
    Missions.tailCar = Vehicles.spawn('sedan', st.x, st.z, 0, 0x9a7bff);
    Missions.tailCar.ai = { tail: true, angle: 0 };
    scene.add(Missions.tailCar.mesh);
  },

  // Called every frame while a mission is active.
  update(dt) {
    const m = S.mission;
    if (!m) return;
    m.timer += dt;
    const st = Missions.currentStage();
    if (!st) return;
    const p = S.player;
    const d = st.x !== undefined ? Math.hypot(p.x - st.x, p.z - st.z) : 999;

    if (st.type === 'goto') {
      // Deliver-by-car stages only count while the player is in a car.
      if (d < st.r && (!st.inCar || p.inCar)) Missions.advance();
    } else if (st.type === 'steal') {
      // Stage completes when the player is in the mission car.
      if (p.inCar && p.inCar === Missions.targetCar) Missions.advance();
    } else if (st.type === 'kill') {
      // NOTE: reads S.killsThisMission — the same counter Combat.applyHit writes.
      if (S.killsThisMission >= st.count) Missions.advance();
    } else if (st.type === 'collect') {
      if (d < st.r && Input.hit('KeyE')) {
        S.cash += 0; // the payout lands at mission completion
        HUD.toast('Cash secured.');
        AudioSys.pickup();
        Missions.advance();
      }
    } else if (st.type === 'tail') {
      const t = Missions.tailCar;
      if (t) {
        // Courier loops the ridge-road rectangle ON the roads (same loop a
        // player can follow), ~6 m/s — an ellipse through the blocks would
        // force any follower off-road into buildings.
        const pts = [[0, -60], [120, -60], [120, -120], [0, -120]];
        if (t.ai.ci === undefined) t.ai.ci = 2; // spawn (60,-120) heads west
        const [tx, tz] = pts[t.ai.ci];
        const dx = tx - t.x, dz = tz - t.z;
        if (Math.hypot(dx, dz) < 3) { t.ai.ci = (t.ai.ci + 1) % pts.length; }
        else {
          const des = Math.atan2(-dx, -dz);
          let dy = des - t.yaw;
          while (dy > Math.PI) dy -= Math.PI * 2;
          while (dy < -Math.PI) dy += Math.PI * 2;
          t.yaw += Math.max(-1.5 * dt, Math.min(1.5 * dt, dy));
          t.x += -Math.sin(t.yaw) * 6 * dt;
          t.z += -Math.cos(t.yaw) * 6 * dt;
        }
        t.mesh.position.set(t.x, 0, t.z);
        t.mesh.rotation.y = t.yaw;
        const td = Math.hypot(p.x - t.x, p.z - t.z);
        if (td >= 15 && td <= 45) {
          m.timer += 0; // timer already accumulates; track hold time separately
          m.hold = (m.hold || 0) + dt;
          HUD.objective(`Stay in range… ${Math.ceil(st.time - (m.hold || 0))}s  (${Math.round(td)}m)`);
          if ((m.hold || 0) >= st.time) Missions.advance();
        } else {
          m.hold = Math.max(0, (m.hold || 0) - dt * 2);
          HUD.objective(td < 15 ? 'Too close — back off!' : `Get closer to the courier (${Math.round(td)}m)`);
          if (td < 8) { HUD.toast('Spotted! The courier is on to you.'); m.hold = 0; }
        }
      }
    } else if (st.type === 'escape') {
      if (d < st.r && S.wanted <= (st.wanted || 4)) {
        // Reached the boat with heat still on: mission done, heat drops.
        Police.setWanted(0, true);
        Missions.advance();
      } else if (d < st.r) {
        HUD.objective('Lose some heat first — stay out of sight, then come back.');
      }
    }
    // Marker pulse.
    if (Missions.marker) {
      const s = 1 + Math.sin(S.time * 3) * 0.08;
      Missions.marker.scale.set(s, 1, s);
    }
  },

  complete() {
    const m = S.mission;
    if (!m) return;
    const def = m.def;
    const elapsed = m.timer;
    // Medal: gold beats par with little damage, silver beats par, else bronze.
    const medal = elapsed <= def.par && m.damageTaken < 40 ? 'G' : elapsed <= def.par * 1.4 ? 'S' : 'B';
    S.cash += def.reward;
    S.rp += def.rp;
    S.missionsDone++;
    S.missionRatings[def.id] = medal;
    const d = DISTRICTS.find((x) => x.name === def.district);
    if (d) Districts.addStanding(d.name, 8);
    HUD.dialog(def.giver, `Job done, Rhea. ${def.title} — paid $${def.reward.toLocaleString()}. Medal: ${medal === 'G' ? 'GOLD' : medal === 'S' ? 'SILVER' : 'BRONZE'}.`);
    HUD.toast(`MISSION COMPLETE — ${def.title}  +$${def.reward}  +${def.rp} RP  [${medal}]`);
    AudioSys.mission();
    Missions.clearMarker();
    People.clearEnemies(City.scene);
    if (Missions.tailCar) { Vehicles.remove(Missions.tailCar); Missions.tailCar = null; }
    Missions.targetCar = null;
    S.mission = null;
    Game.refreshMissionBoard();
  },

  abort() {
    Missions.clearMarker();
    People.clearEnemies(City.scene);
    if (Missions.tailCar) { Vehicles.remove(Missions.tailCar); Missions.tailCar = null; }
    Missions.targetCar = null;
    S.mission = null;
  },
};
