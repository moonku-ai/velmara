/* missions.js — 6 story missions, staged objectives, medals, dialog, rewards, RP. */
VEL.Missions = {
  active: null, currentId: 0, done: {}, medals: {}, stageIdx: 0, stageT: 0, tailT: 0, evadeT: 0,
  start(id) {
    const def = VEL.CFG.missions.find((m) => m.id === id);
    if (!def) return;
    this.currentId = id; this.stageIdx = 0; this.stageT = 0;
    const S = VEL.State;
    S.mission = def; S.missionStart = S.time; S.damageTaken = 0; S.killsThisMission = 0;
    this.active = { id: def.id, def, stage: def.stages[0], kills: 0, startTime: S.time };
    VEL.HUD.dialog(def.intro[0], def.intro[1]);
    VEL.HUD.toast('MISSION ' + id + ' · ' + def.name + ' STARTED');
    this.enterStage(0);
  },
  enterStage(i) {
    const S = VEL.State, a = this.active;
    if (!a) return;
    a.stage = a.def.stages[i]; this.stageIdx = i; this.stageT = 0; this.tailT = 0; this.evadeT = 0;
    const st = a.stage;
    VEL.HUD.setMission(a.def, i);
    VEL.City.setMarker(st.pos ? st.pos[0] : 0, st.pos ? st.pos[1] : 0, !!st.pos);
    VEL.HUD.setObjective(st.text + ' — ' + st.hint);
    // stage setup
    if (a.def.id === 1 && i === 0) VEL.Game.spawnMissionCar(21, 84, 0xffb347, 'GETAWAY COUPE');
    if (a.def.id === 2 && i === 1) for (let k = 0; k < 4; k++) VEL.People.spawnEnemy(-84 + (k % 2) * 14 - 7, 21 + Math.floor(k / 2) * 14 - 7, { name: 'MARKET SHOOTER' });
    if (a.def.id === 3 && i === 0) VEL.Game.spawnMissionCar(0, -105, 0x2a6bff, 'VPD TRUCK', true);
    if (a.def.id === 3 && i === 1) VEL.Police.setWanted(3);
    if (a.def.id === 4 && i === 0) VEL.People.spawnTailTarget(105, 21);
    if (a.def.id === 5 && i === 1) { for (let k = 0; k < 6; k++) VEL.People.spawnEnemy(42 + (k % 3) * 10 - 10, -105 + Math.floor(k / 3) * 12 - 6, { guard: true, name: 'VAULT GUARD' }); VEL.Police.setWanted(4); }
    if (a.def.id === 6 && i === 1) { for (let k = 0; k < 8; k++) VEL.People.spawnEnemy((k % 4) * 10 - 15, 84 + Math.floor(k / 4) * 12 - 6, { guard: true, name: 'CASINO GUARD' }); }
    if (a.def.id === 6 && i === 2) VEL.Police.setWanted(5);
    if (a.def.id === 5 && i === 0) VEL.Police.setWanted(2);
  },
  nextStage() {
    const a = this.active;
    if (!a) return;
    VEL.Audio.pickup();
    if (this.stageIdx + 1 >= a.def.stages.length) this.complete();
    else this.enterStage(this.stageIdx + 1);
  },
  update(dt) {
    const S = VEL.State, a = this.active;
    if (!a) return;
    const st = a.stage;
    this.stageT += dt;
    const p = S.player;
    const dist = st.pos ? Math.hypot(st.pos[0] - p.x, st.pos[1] - p.z) : 999;
    if (st.type === 'goto' && dist < 7) this.nextStage();
    else if (st.type === 'steal' && S.inCar && S.car && S.car.mission) this.nextStage();
    else if (st.type === 'kill' && S.killsThisMission >= st.count) this.nextStage();
    else if (st.type === 'chase' && dist < 9 && S.wanted >= 3) this.nextStage();
    else if (st.type === 'tail') {
      const tt = VEL.People.tailTarget;
      if (tt) {
        const d = Math.hypot(tt.x - p.x, tt.z - p.z);
        if (d < 10) { VEL.HUD.setObjective('TOO CLOSE — BACK OFF!'); this.tailT = Math.max(0, this.tailT - dt * 2); }
        else if (d > 46) { VEL.HUD.setObjective('TOO FAR — CATCH UP!'); this.tailT = Math.max(0, this.tailT - dt); }
        else { this.tailT += dt; VEL.HUD.setObjective('TAIL THE FIXER — ' + Math.ceil(st.dur - this.tailT) + 's (' + Math.round(d) + 'm)'); }
        if (this.tailT >= st.dur) this.nextStage();
      }
    } else if (st.type === 'evade') {
      if (S.wanted === 0) this.nextStage();
      else { this.evadeT += dt; VEL.HUD.setObjective('LOSE THE HEAT — wanted ' + S.wanted + ' · ' + Math.ceil(40 - this.evadeT) + 's'); if (this.evadeT > 40) { VEL.Police.setWanted(0); this.nextStage(); } }
    }
    // mission progress bar = stage fraction
    const frac = (this.stageIdx + 0.5) / a.def.stages.length;
    VEL.HUD.setMissionProgress(frac);
  },
  complete() {
    const S = VEL.State, a = this.active;
    if (!a) return;
    const def = a.def;
    const timeUsed = S.time - a.startTime;
    const medal = this.medalFor(def, timeUsed, S.damageTaken, S.wanted);
    this.done[def.id] = true; this.medals[def.id] = medal;
    S.cash += def.prize; S.rp += def.rp;
    S.stats.missionsDone++; S.stats.cashEarned += def.prize;
    VEL.Districts.bump(def.district, 8);
    VEL.Audio.missionPass(); VEL.Audio.cash();
    VEL.City.setMarker(0, 0, false);
    VEL.HUD.showMissionPass(def, medal, timeUsed);
    VEL.HUD.toast('MISSION PASSED · ' + medal + ' MEDAL · +$' + def.prize + ' · +' + def.rp + ' RP');
    VEL.Save.autosave();
    this.active = null; S.mission = null;
    S.inMissionHeat = false;
    // unlock next mission
    if (def.id < 6) { VEL.HUD.toast('NEXT JOB AVAILABLE — press ENTER'); S.nextMission = def.id + 1; }
    else { VEL.HUD.toast('ALL MISSIONS COMPLETE — YOU OWN VELMARA'); S.nextMission = 0; S.storyComplete = true; }
  },
  medalFor(def, timeUsed, dmg, wanted) {
    const par = 150 + def.id * 20;
    let score = 0;
    if (timeUsed < par) score += 2; else if (timeUsed < par * 1.6) score += 1;
    if (dmg < 30) score += 1;
    if (wanted <= 2) score += 1;
    return score >= 4 ? 'GOLD' : score >= 2 ? 'SILVER' : 'BRONZE';
  },
  fail(reason) {
    const a = this.active;
    if (!a) return;
    VEL.HUD.toast('MISSION FAILED — ' + reason);
    VEL.City.setMarker(0, 0, false);
    this.active = null; VEL.State.mission = null;
  },
  startNext() {
    const S = VEL.State;
    if (S.nextMission) this.start(S.nextMission);
  },
};
