/* hud.js — DOM HUD: mission banner, wanted stars, cash, rank/RP, police panel, crew cards,
   minimap canvas, weapons, speed, radio, dialog, toasts, stats screen, big map. */
VEL.HUD = {
  els: {}, toastTimer: 0, dialogTimer: 0,
  init() {
    const ids = ['mission-title', 'mission-stage', 'mission-fill', 'wanted', 'wanted-label', 'cash-val', 'rank-name', 'rank-fill', 'rp-val', 'air-unit', 'police-panel', 'police-count', 'police-list', 'minimap', 'district-name', 'district-status', 'district-val', 'health-fill', 'hp-val', 'arm-val', 'weapons', 'speed-val', 'car-cond', 'radio-song', 'dialog', 'dialog-name', 'dialog-text', 'dialog-portrait', 'objective-text', 'toast', 'crosshair', 'interact', 'interact-text', 'wasted', 'mission-pass', 'pass-detail', 'hud', 'title-screen', 'stats-screen', 'bigmap', 'district-list', 'checklist', 'medals', 'career', 'save-slots', 'stats-complete', 'pause-screen', 'title-saves'];
    for (const id of ids) this.els[id] = document.getElementById(id);
    // weapon slots
    this.els.weapons.innerHTML = VEL.CFG.weapons.map((w, i) => '<div class="weapon-slot" id="wslot-' + i + '"><b>' + (i + 1) + ' · ' + w.name + '</b><span class="wammo"></span></div>').join('');
  },
  showHud() { this.els.hud.classList.remove('hidden'); this.els['title-screen'].classList.add('hidden'); },
  showTitle() { this.els.hud.classList.add('hidden'); this.els['title-screen'].classList.remove('hidden'); },
  setMission(def, stageIdx) {
    this.els['mission-title'].textContent = 'MISSION ' + def.id + ' · ' + def.name;
    this.els['mission-stage'].textContent = 'STAGE ' + (stageIdx + 1) + '/' + def.stages.length + ' — ' + def.stages[stageIdx].text;
  },
  setMissionProgress(f) { this.els['mission-fill'].style.width = Math.round(f * 100) + '%'; },
  setObjective(t) { this.els['objective-text'].textContent = '▸ ' + t; },
  toast(msg, dur) {
    this.els.toast.textContent = msg; this.toastTimer = dur || 3.5;
    const st = document.getElementById('status'); if (st) st.textContent = msg;
  },
  dialog(name, text) {
    this.els['dialog-name'].textContent = name;
    this.els['dialog-text'].textContent = text;
    this.els['dialog-portrait'].textContent = name.split(' ').map((w) => w[0]).join('').slice(0, 2);
    this.els.dialog.classList.remove('hidden');
    this.dialogTimer = 6;
  },
  update(dt) {
    const S = VEL.State;
    if (this.toastTimer > 0) { this.toastTimer -= dt; if (this.toastTimer <= 0) this.els.toast.textContent = ''; }
    if (this.dialogTimer > 0) { this.dialogTimer -= dt; if (this.dialogTimer <= 0) this.els.dialog.classList.add('hidden'); }
    // wanted stars
    const stars = this.els.wanted.querySelectorAll('.wstar');
    stars.forEach((el, i) => el.classList.toggle('on', i < S.wanted));
    this.els['wanted-label'].textContent = VEL.Police.wantedNames[S.wanted];
    this.els['air-unit'].classList.toggle('hidden', S.wanted < 5);
    this.els['cash-val'].textContent = S.cash.toLocaleString('en-US');
    // rank / RP
    let rank = VEL.CFG.ranks[0], next = null;
    for (let i = 0; i < VEL.CFG.ranks.length; i++) { if (S.rp >= VEL.CFG.ranks[i].rp) rank = VEL.CFG.ranks[i]; next = VEL.CFG.ranks[i + 1] || null; }
    const rankIdx = VEL.CFG.ranks.indexOf(rank);
    this.els['rank-name'].textContent = 'RANK ' + (rankIdx + 1) + ' · ' + rank.name;
    const base = rank.rp, top = next ? next.rp : rank.rp + 1000;
    this.els['rank-fill'].style.width = Math.round(((S.rp - base) / (top - base)) * 100) + '%';
    this.els['rp-val'].textContent = S.rp + (next ? ' / ' + next.rp : '');
    // police panel
    const units = VEL.Police.units;
    this.els['police-panel'].classList.toggle('hidden', units.length === 0);
    this.els['police-count'].textContent = units.length;
    this.els['police-list'].innerHTML = units.map((u) => {
      const d = Math.round(VEL.Police.distToPlayer(u));
      return '<div class="police-row"><b>' + u.id + ' · ' + u.officer + '</b><span class="role">' + u.role + '</span><span>' + d + 'm</span></div>';
    }).join('');
    // vitals
    this.els['health-fill'].style.width = Math.max(0, S.hp) + '%';
    this.els['hp-val'].textContent = Math.ceil(S.hp);
    this.els['arm-val'].textContent = Math.ceil(S.armour);
    // district
    const d = VEL.Districts.current(S.player.x, S.player.z);
    this.els['district-name'].textContent = d.name;
    this.els['district-status'].textContent = VEL.Districts.status(d.standing);
    this.els['district-val'].textContent = d.standing;
    // speed / car
    const kmh = S.inCar && S.car ? Math.round(Math.abs(S.car.speed) * 3.6) : 0;
    this.els['speed-val'].textContent = kmh;
    if (S.inCar && S.car) {
      const cond = S.car.hp >= 75 ? 'PRISTINE' : S.car.hp >= 40 ? 'DENTED' : 'WRECKED';
      this.els['car-cond'].textContent = 'CAR ' + Math.round(S.car.hp) + '% · ' + cond + ' · ' + S.car.name;
    } else this.els['car-cond'].textContent = 'ON FOOT · RHEA SOLANO';
    // weapons
    for (let i = 0; i < 4; i++) {
      const slot = document.getElementById('wslot-' + i);
      if (!slot) continue;
      slot.classList.toggle('active', i === S.weaponIdx);
      const w = VEL.CFG.weapons[i];
      const mag = VEL.Combat.mags[i];
      slot.querySelector('.wammo').textContent = w.id === 'fists' ? '∞' : mag + ' / ' + w.ammo;
    }
    this.els.crosshair.classList.toggle('hidden', S.inCar || !S.playing);
    this.drawMinimap();
  },
  updateCrew(cds) {
    for (let i = 0; i < 3; i++) {
      const card = document.getElementById('crew-' + i);
      if (!card) continue;
      card.classList.toggle('ready', cds[i] <= 0);
      card.classList.toggle('cool', cds[i] > 0);
      card.querySelector('.crew-cd').textContent = cds[i] > 0 ? Math.ceil(cds[i]) + 's' : 'READY';
    }
  },
  drawMinimap() {
    const cv = this.els.minimap; if (!cv) return;
    const ctx = cv.getContext('2d'), S = VEL.State, H = VEL.CFG.half;
    const W = cv.width, scale = W / (H * 2 + 40);
    const mx = (x) => (x + H + 20) * scale, mz = (z) => (z + H + 20) * scale;
    ctx.fillStyle = '#0b0e1e'; ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = '#1a2a4a';
    ctx.fillRect(mx(-H), mz(-H), (H * 2) * scale, (H * 2) * scale);
    // water ring
    ctx.fillStyle = '#0a2e4a'; ctx.fillRect(0, 0, W, 6); ctx.fillRect(0, W - 6, W, 6);
    // roads
    ctx.strokeStyle = '#2c3a6e'; ctx.lineWidth = 2;
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath(); ctx.moveTo(mx(i * 42), mz(-H)); ctx.lineTo(mx(i * 42), mz(H)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx(-H), mz(i * 42)); ctx.lineTo(mx(H), mz(i * 42)); ctx.stroke();
    }
    // canal
    ctx.fillStyle = '#0e5a6e'; ctx.fillRect(mx(-118), mz(-H), 26 * scale, H * 2 * scale);
    // districts
    for (const d of VEL.Districts.list) {
      ctx.fillStyle = d.color + '22'; ctx.beginPath(); ctx.arc(mx(d.cx), mz(d.cz), d.r * scale, 0, 7); ctx.fill();
    }
    // packages
    ctx.fillStyle = '#ffd24d';
    for (const [x, z] of VEL.CFG.packages) if (!S.packagesGot.includes(x + ',' + z)) { ctx.beginPath(); ctx.arc(mx(x), mz(z), 2.5, 0, 7); ctx.fill(); }
    // mission marker
    if (VEL.Missions.active) {
      const st = VEL.Missions.active.stage;
      if (st.pos) { ctx.fillStyle = '#ffd24d'; ctx.beginPath(); ctx.arc(mx(st.pos[0]), mz(st.pos[1]), 6, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); }
    }
    // police (red when eyes-out or always when close)
    for (const u of VEL.Police.units) {
      ctx.fillStyle = '#ff3355'; ctx.beginPath(); ctx.arc(mx(u.x), mz(u.z), VEL.Crew.eyesOn() ? 5 : 3.5, 0, 7); ctx.fill();
    }
    if (VEL.Police.heli) { ctx.fillStyle = '#ff3355'; ctx.beginPath(); ctx.arc(mx(VEL.Police.heli.x), mz(VEL.Police.heli.z), 6, 0, 7); ctx.fill(); }
    // traffic
    ctx.fillStyle = '#8fa0c0';
    for (const c of VEL.Vehicles.traffic) { ctx.fillRect(mx(c.x) - 1.5, mz(c.z) - 1.5, 3, 3); }
    // player
    ctx.fillStyle = '#37e08a'; ctx.beginPath(); ctx.arc(mx(S.player.x), mz(S.player.z), 5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(mx(S.player.x), mz(S.player.z));
    ctx.lineTo(mx(S.player.x) + Math.sin(S.player.heading) * 10, mz(S.player.z) + Math.cos(S.player.heading) * 10); ctx.stroke();
  },
  showMissionPass(def, medal, timeUsed) {
    const el = this.els['mission-pass'];
    this.els['pass-detail'].textContent = def.name + ' · ' + medal + ' MEDAL · ' + Math.round(timeUsed) + 's · +$' + def.prize + ' · +' + def.rp + ' RP';
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
  },
  showWasted() { this.els.wasted.classList.remove('hidden'); },
  hideWasted() { this.els.wasted.classList.add('hidden'); },
  showStats() { this.els['stats-screen'].classList.remove('hidden'); VEL.Stats.render(); },
  hideStats() { this.els['stats-screen'].classList.add('hidden'); },
};
