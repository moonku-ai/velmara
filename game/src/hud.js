// HUD: every DOM readout, the minimap canvas, banners, dialogs, toasts and
// the kill feed. update() runs every frame; the minimap redraws every few
// frames. Nothing here touches three.js — it only reads S.
const HUD = {
  el: {},
  bannerT: 0, dialogT: 0, toastT: 0, frame: 0,
  minimap: null, mmCtx: null,

  init() {
    const ids = ['hud', 'mission-banner', 'banner-title', 'banner-sub', 'banner-text',
      'objective', 'cash', 'wanted', 'rank-name', 'rank-bar', 'rank-rp', 'health-fill',
      'armor-fill', 'hp-num', 'weapon-slots', 'crew-cards', 'vpd-panel', 'vpd-units',
      'minimap', 'district-label', 'speed', 'car-hp', 'dialog', 'dialog-name',
      'dialog-text', 'dialog-face', 'prompt', 'radio-line', 'toast', 'killfeed',
      'damage-vignette', 'muzzle', 'title-screen', 'pause-screen', 'stats-screen',
      'wasted-screen', 'mission-list', 'stats-body', 'bigmap', 'save-slots'];
    for (const id of ids) HUD.el[id] = document.getElementById(id);
    HUD.minimap = HUD.el.minimap;
    if (HUD.minimap) HUD.mmCtx = HUD.minimap.getContext('2d');
    HUD.buildCrewCards();
    HUD.buildWeaponSlots();
  },

  buildCrewCards() {
    const host = HUD.el['crew-cards'];
    if (!host) return;
    host.innerHTML = '';
    CREW.forEach((c, i) => {
      const d = document.createElement('div');
      d.className = 'crew-card';
      d.id = 'crew-' + i;
      d.innerHTML = `<div class="crew-key">${c.key.replace('Key', '')}</div>
        <div class="crew-name">${c.name.toUpperCase()}</div>
        <div class="crew-role">${c.role.toUpperCase()} · ${c.ability}</div>
        <div class="crew-desc">${c.desc}</div>
        <div class="crew-cd"></div>`;
      host.appendChild(d);
    });
  },

  buildWeaponSlots() {
    const host = HUD.el['weapon-slots'];
    if (!host) return;
    host.innerHTML = '';
    WEAPONS.forEach((w, i) => {
      const d = document.createElement('div');
      d.className = 'wslot';
      d.id = 'wslot-' + i;
      d.innerHTML = `<div class="wslot-name">${w.name}</div><div class="wslot-ammo"></div>`;
      host.appendChild(d);
    });
  },

  banner(title, sub, text) {
    const b = HUD.el['mission-banner'];
    if (!b) return;
    HUD.el['banner-title'].textContent = title;
    HUD.el['banner-sub'].textContent = sub || '';
    HUD.el['banner-text'].textContent = text || '';
    b.classList.add('show');
    HUD.bannerT = 4.5;
  },

  objective(text) {
    if (HUD.el.objective) HUD.el.objective.textContent = text;
  },

  dialog(name, text) {
    const d = HUD.el.dialog;
    if (!d) return;
    HUD.el['dialog-name'].textContent = name.toUpperCase();
    HUD.el['dialog-text'].textContent = text;
    HUD.el['dialog-face'].textContent = name.split(' ').map((w) => w[0]).join('');
    d.classList.add('show');
    HUD.dialogT = 6;
  },

  toast(text) {
    const t = HUD.el.toast;
    if (!t) return;
    t.textContent = text;
    t.classList.add('show');
    HUD.toastT = 3.5;
  },

  killFeed(text) {
    const k = HUD.el.killfeed;
    if (!k) return;
    const div = document.createElement('div');
    div.className = 'kf-item';
    div.textContent = text;
    k.prepend(div);
    while (k.children.length > 4) k.removeChild(k.lastChild);
    setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); }, 5000);
  },

  prompt(text) {
    const p = HUD.el.prompt;
    if (!p) return;
    if (text) { p.textContent = text; p.classList.add('show'); }
    else p.classList.remove('show');
  },

  flashMuzzle() {
    const m = HUD.el.muzzle;
    if (!m) return;
    m.classList.add('on');
    setTimeout(() => m.classList.remove('on'), 60);
  },

  damageFlash(amount) {
    const v = HUD.el['damage-vignette'];
    if (!v) return;
    v.style.opacity = Math.min(0.85, 0.25 + amount * 0.02);
    setTimeout(() => { v.style.opacity = 0; }, 220);
  },

  stars(n) {
    let s = '';
    for (let i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return s;
  },

  update(dt) {
    HUD.frame++;
    if (HUD.bannerT > 0) { HUD.bannerT -= dt; if (HUD.bannerT <= 0) HUD.el['mission-banner'].classList.remove('show'); }
    if (HUD.dialogT > 0) { HUD.dialogT -= dt; if (HUD.dialogT <= 0) HUD.el.dialog.classList.remove('show'); }
    if (HUD.toastT > 0) { HUD.toastT -= dt; if (HUD.toastT <= 0) HUD.el.toast.classList.remove('show'); }

    if (HUD.el.cash) HUD.el.cash.textContent = '$' + Math.floor(S.cash).toLocaleString();
    if (HUD.el.wanted) {
      HUD.el.wanted.textContent = HUD.stars(S.wanted);
      HUD.el.wanted.className = 'wanted' + (S.wanted >= 5 ? ' max' : S.wanted >= 3 ? ' hot' : '');
    }
    const rank = rankFor(S.rp), nxt = nextRank(S.rp);
    if (HUD.el['rank-name']) HUD.el['rank-name'].textContent = `RANK ${RANKS.indexOf(rank) + 1} · ${rank.name.toUpperCase()}`;
    if (HUD.el['rank-bar'] && nxt) HUD.el['rank-bar'].style.width = Math.min(100, ((S.rp - rank.rp) / (nxt.rp - rank.rp)) * 100) + '%';
    if (HUD.el['rank-rp']) HUD.el['rank-rp'].textContent = nxt ? `${S.rp}/${nxt.rp} RP` : `${S.rp} RP · MAX`;
    if (HUD.el['health-fill']) HUD.el['health-fill'].style.width = Math.max(0, S.hp) + '%';
    if (HUD.el['armor-fill']) HUD.el['armor-fill'].style.width = Math.max(0, S.armor) + '%';
    if (HUD.el['hp-num']) HUD.el['hp-num'].textContent = `HP ${Math.ceil(S.hp)} / ARMOUR ${Math.ceil(S.armor)}`;
    if (HUD.el['radio-line']) {
      const st = RADIO[S.radio % RADIO.length];
      HUD.el['radio-line'].textContent = `${st.name} — ${st.genre}`;
    }
    const d = Districts.at(S.player.x, S.player.z);
    if (HUD.el['district-label']) {
      const sv = Math.round(S.districtStanding[d.name]);
      HUD.el['district-label'].innerHTML = `${d.name.toUpperCase()} · <span style="color:${d.color}">${standingLabel(sv)} · ${sv}</span>`;
    }
    // Speed + car condition.
    const p = S.player;
    if (HUD.el.speed) {
      const kmh = Math.round(Math.abs(p.inCar ? p.inCar.speed : p.speed) * 3.6);
      HUD.el.speed.textContent = p.inCar ? `${kmh} km/h` : '';
    }
    if (HUD.el['car-hp']) {
      HUD.el['car-hp'].textContent = p.inCar ? `CAR ${Math.ceil(p.inCar.hp)}% ${p.inCar.hp < 30 ? 'CRITICAL' : p.inCar.hp < 60 ? 'DENTED' : 'CLEAN'}` : '';
    }
    // Weapon slots.
    WEAPONS.forEach((w, i) => {
      const slot = document.getElementById('wslot-' + i);
      if (!slot) return;
      slot.classList.toggle('active', i === S.weapon);
      slot.querySelector('.wslot-ammo').textContent = w.ammo === -1 ? '∞' : S.ammo[i];
    });
    // Crew cards.
    CREW.forEach((c, i) => {
      const card = document.getElementById('crew-' + i);
      if (!card) return;
      const cd = S.crewCooldown[i];
      card.classList.toggle('ready', cd <= 0);
      card.querySelector('.crew-cd').textContent = cd > 0 ? `READY IN ${Math.ceil(cd)}s` : 'READY';
    });
    // VPD RESPONSE panel.
    const vp = HUD.el['vpd-panel'], vu = HUD.el['vpd-units'];
    if (vp && vu) {
      if (S.wanted > 0) {
        vp.classList.add('show');
        const units = Police.liveUnits();
        vu.innerHTML = `<div class="vpd-head">VPD RESPONSE · ${units.length} UNITS${S.wanted >= 5 ? ' · AIR UNIT DEPLOYED' : ''}</div>` +
          units.map((u) => `<div class="vpd-row"><span>${u.unit} — ${u.name}</span><span>${u.role}</span><span>${u.dist}m</span></div>`).join('');
      } else {
        vp.classList.remove('show');
      }
    }
    // Minimap every 5th frame.
    if (HUD.frame % 5 === 0) HUD.drawMinimap();
    // Default objective line when nothing overrides it.
    if (HUD.frame % 30 === 0 && !S.mission && !S.race) {
      const next = Missions.available()[0];
      HUD.objective(next ? `Next job: ${next.title} — open the pause menu (Esc) to start it.` : 'All story missions complete — free roam Velmara.');
    }
  },

  drawMinimap() {
    const ctx = HUD.mmCtx;
    if (!ctx) return;
    const W = 180, H = 180, half = CFG.world.half;
    const mx = (x) => ((x + half) / (half * 2)) * W;
    const mz = (z) => ((z + half) / (half * 2)) * H;
    ctx.fillStyle = '#0d1526';
    ctx.fillRect(0, 0, W, H);
    // District tints.
    for (const d of DISTRICTS) {
      ctx.fillStyle = d.color + '22';
      ctx.fillRect(mx(d.x0), mz(d.z0), (d.x1 - d.x0) / (half * 2) * W, (d.z1 - d.z0) / (half * 2) * H);
    }
    // Canal + marina water.
    ctx.fillStyle = '#0e3a4a';
    ctx.fillRect(mx(CFG.canal.x0), mz(CFG.canal.z0), (CFG.canal.x1 - CFG.canal.x0) / (half * 2) * W, (CFG.canal.z1 - CFG.canal.z0) / (half * 2) * H);
    ctx.fillRect(0, mz(CFG.marina.z0), W, H - mz(CFG.marina.z0));
    // Roads.
    ctx.strokeStyle = '#3a4358'; ctx.lineWidth = 2;
    for (const r of CFG.roads) {
      ctx.beginPath(); ctx.moveTo(mx(r), 0); ctx.lineTo(mx(r), H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, mz(r)); ctx.lineTo(W, mz(r)); ctx.stroke();
    }
    // Packages.
    ctx.fillStyle = '#ffc94d';
    PACKAGES.forEach(([x, z], i) => {
      if (S.packagesFound[i]) return;
      ctx.beginPath(); ctx.arc(mx(x), mz(z), 2.5, 0, Math.PI * 2); ctx.fill();
    });
    // Mission / race marker.
    const st = Missions.currentStage();
    if (S.mission && st && st.x !== undefined) {
      ctx.fillStyle = '#ffc94d';
      ctx.beginPath(); ctx.arc(mx(st.x), mz(st.z), 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(mx(st.x), mz(st.z), 7, 0, Math.PI * 2); ctx.stroke();
    }
    if (S.race) {
      const [x, z] = S.race.def.points[S.race.cp];
      ctx.fillStyle = '#37e0c8';
      ctx.beginPath(); ctx.arc(mx(x), mz(z), 5, 0, Math.PI * 2); ctx.fill();
    }
    // Police (always when wanted; with Eyes Out they show even at 0).
    if (S.wanted > 0 || S.time < S.eyesOutUntil) {
      ctx.fillStyle = '#ff4455';
      for (const c of Police.cars) { ctx.beginPath(); ctx.arc(mx(c.x), mz(c.z), 3, 0, Math.PI * 2); ctx.fill(); }
      for (const c of Police.foot) { ctx.beginPath(); ctx.arc(mx(c.x), mz(c.z), 2.5, 0, Math.PI * 2); ctx.fill(); }
      if (Police.heli) { ctx.fillStyle = '#ff8899'; ctx.beginPath(); ctx.arc(mx(Police.heli.x), mz(Police.heli.z), 4, 0, Math.PI * 2); ctx.fill(); }
    }
    // Player arrow.
    const p = S.player;
    ctx.save();
    ctx.translate(mx(p.x), mz(p.z));
    ctx.rotate(p.inCar ? -p.inCar.yaw : -p.yaw);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  },
};
