// Stats screen (Tab): big district map with standing, completion %,
// checklist, mission medals, career stats and the three save slots.
const Stats = {
  open: false,

  toggle() {
    Stats.open = !Stats.open;
    const el = HUD.el['stats-screen'];
    if (!el) return;
    if (Stats.open) {
      S.mode = 'stats';
      Stats.render();
      el.classList.add('show');
    } else {
      S.mode = 'playing';
      el.classList.remove('show');
    }
  },

  close() {
    Stats.open = false;
    HUD.el['stats-screen']?.classList.remove('show');
    if (S.mode === 'stats') S.mode = 'playing';
  },

  render() {
    const body = HUD.el['stats-body'];
    if (!body) return;
    const pct = completionPct();
    const friendly = DISTRICTS.filter((d) => S.districtStanding[d.name] >= 70).length;
    const rows = [];
    rows.push(`<div class="stats-title">RHEA SOLANO — ${rankFor(S.rp).name.toUpperCase()} · ${S.rp} RP</div>`);
    rows.push(`<div class="stats-big">${pct.toFixed(1)}% COMPLETE</div>`);
    rows.push('<div class="stats-sec">CHECKLIST</div>');
    const check = (label, done, total) => `<div class="stats-row"><span>${label}</span><span>${done}/${total}</span></div>`;
    rows.push(check('Story missions', S.missionsDone, 6));
    rows.push(check('Street races', S.racesDone, 4));
    rows.push(check('Hidden packages', S.packages, 10));
    rows.push(check('Stunt jumps', S.stunts, 5));
    rows.push(check('Taxi fares', S.fares, 3));
    rows.push(check('Car exports', S.exports, 3));
    rows.push(check('Districts FRIENDLY', friendly, 5));
    rows.push(check('Crew recruited', 3, 3));
    rows.push('<div class="stats-sec">MISSION RATINGS</div>');
    for (const m of MISSIONS) {
      const med = S.missionRatings[m.id];
      rows.push(`<div class="stats-row"><span>M${m.id} · ${m.title}</span><span class="medal-${med || 'none'}">${med ? (med === 'G' ? '★ GOLD' : med === 'S' ? '★ SILVER' : '★ BRONZE') : '— not done —'}</span></div>`);
    }
    rows.push('<div class="stats-sec">CAREER</div>');
    const acc = S.stats.shots ? Math.round((S.stats.hits / S.stats.shots) * 100) : 0;
    rows.push(check('Cash', '$' + Math.floor(S.cash).toLocaleString(), ''));
    rows.push(check('Cars stolen', S.carsStolen, ''));
    rows.push(check('People taken out', S.kills, ''));
    rows.push(check('Cops escaped', S.copsEscaped, ''));
    rows.push(check('Distance driven', S.distanceKm.toFixed(1) + ' km', ''));
    rows.push(check('Shot accuracy', acc + '%', ''));
    rows.push(check('Play time', Math.floor(S.time / 60) + 'm ' + Math.floor(S.time % 60) + 's', ''));
    rows.push('<div class="stats-sec">DISTRICT STANDING</div>');
    for (const d of DISTRICTS) {
      const v = Math.round(S.districtStanding[d.name]);
      rows.push(`<div class="stats-row"><span style="color:${d.color}">${d.name}</span><span>${standingLabel(v)} · ${v}</span></div>`);
    }
    rows.push('<div class="stats-sec">SAVE SLOTS</div>');
    for (let s = 1; s <= 3; s++) {
      const info = SaveSys.slotInfo(s);
      rows.push(`<div class="stats-row"><span>Slot ${s}</span><span>${info ? `$${Math.floor(info.cash).toLocaleString()} · ${info.missions}/6 missions` : 'empty'}</span></div>`);
    }
    body.innerHTML = rows.join('');
    Stats.drawBigMap();
  },

  drawBigMap() {
    const cv = HUD.el.bigmap;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, half = CFG.world.half;
    const mx = (x) => ((x + half) / (half * 2)) * W;
    const mz = (z) => ((z + half) / (half * 2)) * H;
    ctx.fillStyle = '#0d1526';
    ctx.fillRect(0, 0, W, H);
    for (const d of DISTRICTS) {
      const v = S.districtStanding[d.name];
      ctx.fillStyle = d.color + (v >= 70 ? '55' : v >= 40 ? '33' : '18');
      ctx.fillRect(mx(d.x0), mz(d.z0), (d.x1 - d.x0) / (half * 2) * W, (d.z1 - d.z0) / (half * 2) * H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px system-ui';
      ctx.fillText(`${d.name.toUpperCase()} · ${standingLabel(v)} ${Math.round(v)}`, mx(d.x0) + 8, mz(d.z0) + 20);
    }
    ctx.fillStyle = '#0e3a4a';
    ctx.fillRect(mx(CFG.canal.x0), mz(CFG.canal.z0), (CFG.canal.x1 - CFG.canal.x0) / (half * 2) * W, (CFG.canal.z1 - CFG.canal.z0) / (half * 2) * H);
    ctx.strokeStyle = '#3a4358';
    for (const r of CFG.roads) {
      ctx.beginPath(); ctx.moveTo(mx(r), 0); ctx.lineTo(mx(r), H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, mz(r)); ctx.lineTo(W, mz(r)); ctx.stroke();
    }
    // Mission markers + player.
    const st = Missions.currentStage();
    if (S.mission && st && st.x !== undefined) {
      ctx.fillStyle = '#ffc94d';
      ctx.beginPath(); ctx.arc(mx(st.x), mz(st.z), 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(mx(S.player.x), mz(S.player.z), 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.arc(mx(S.player.x), mz(S.player.z), 8, 0, Math.PI * 2); ctx.stroke();
  },
};
