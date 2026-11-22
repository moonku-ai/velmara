/* stats.js — career stats, completion %, checklist, medals, big map render (Tab screen). */
VEL.Stats = {
  completion() {
    const S = VEL.State;
    let got = 0, total = 0;
    total += 6; got += Object.keys(VEL.Missions.done).length;
    total += 4; got += Object.keys(VEL.Races.done).length;
    total += 10; got += S.packagesGot.length;
    total += 5; got += S.stuntsDone.length;
    total += 5; got += VEL.Districts.friendlyCount();
    total += 3; got += Math.min(3, S.exportsDone);
    total += 1; got += S.storyComplete ? 1 : 0;
    return Math.round((got / total) * 1000) / 10;
  },
  render() {
    const S = VEL.State;
    document.getElementById('stats-complete').textContent = this.completion() + '% COMPLETE';
    // big map
    const cv = document.getElementById('bigmap'), ctx = cv.getContext('2d');
    const H = VEL.CFG.half, W = cv.width, scale = W / (H * 2 + 40);
    const mx = (x) => (x + H + 20) * scale, mz = (z) => (z + H + 20) * scale;
    ctx.fillStyle = '#0b0e1e'; ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = '#0a2e4a'; ctx.fillRect(0, 0, W, 8);
    ctx.fillStyle = '#1a2a4a'; ctx.fillRect(mx(-H), mz(-H), H * 2 * scale, H * 2 * scale);
    ctx.strokeStyle = '#2c3a6e';
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath(); ctx.moveTo(mx(i * 42), mz(-H)); ctx.lineTo(mx(i * 42), mz(H)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx(-H), mz(i * 42)); ctx.lineTo(mx(H), mz(i * 42)); ctx.stroke();
    }
    ctx.fillStyle = '#0e5a6e'; ctx.fillRect(mx(-118), mz(-H), 26 * scale, H * 2 * scale);
    for (const d of VEL.Districts.list) {
      ctx.fillStyle = d.color + '33'; ctx.beginPath(); ctx.arc(mx(d.cx), mz(d.cz), d.r * scale, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(d.name, mx(d.cx), mz(d.cz));
      ctx.fillStyle = d.color; ctx.fillText(VEL.Districts.status(d.standing) + ' · ' + d.standing, mx(d.cx), mz(d.cz) + 14);
    }
    ctx.fillStyle = '#37e08a'; ctx.beginPath(); ctx.arc(mx(S.player.x), mz(S.player.z), 6, 0, 7); ctx.fill();
    // district list
    document.getElementById('district-list').innerHTML = VEL.Districts.list.map((d) =>
      '<div class="drow"><span>' + d.name + '</span><span>' + VEL.Districts.status(d.standing) + ' · ' + d.standing + '</span></div>').join('');
    // checklist
    const rows = [
      ['Story missions', Object.keys(VEL.Missions.done).length + '/6'],
      ['Street races', Object.keys(VEL.Races.done).length + '/4'],
      ['Stunt jumps', S.stuntsDone.length + '/5'],
      ['Hidden packages', S.packagesGot.length + '/10'],
      ['Exports delivered', S.exportsDone + '/3'],
      ['Districts FRIENDLY', VEL.Districts.friendlyCount() + '/5'],
      ['Crew abilities', '3/3'],
      ['Taxi fares', S.stats.taxiFares + '/3'],
    ];
    document.getElementById('checklist').innerHTML = rows.map((r) => '<div class="crow"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>').join('');
    // medals
    document.getElementById('medals').innerHTML = VEL.CFG.missions.map((m) =>
      '<div class="mrow"><span>M' + m.id + ' · ' + m.name + '</span><span>' + (VEL.Missions.medals[m.id] ? '★ ' + VEL.Missions.medals[m.id] : '— not done') + '</span></div>').join('');
    // career stats
    const st = S.stats;
    const career = [
      ['Cars stolen', st.carsStolen], ['Cops escaped', st.copsEscaped], ['People taken out', st.takenOut],
      ['Shots fired / hit', st.shotsFired + ' / ' + st.shotsHit], ['Distance driven', (st.distanceDriven / 1000).toFixed(1) + ' km'],
      ['Cash earned', '$' + st.cashEarned], ['Crew abilities used', st.crewUses], ['Missions done', st.missionsDone],
      ['Races won', st.racesWon], ['Time on the island', Math.floor(S.time / 60) + 'm ' + Math.floor(S.time % 60) + 's'],
    ];
    document.getElementById('career').innerHTML = career.map((r) => '<div class="srow"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>').join('');
    // save slots
    document.getElementById('save-slots').innerHTML = [1, 2, 3].map((s) => '<div class="slot">' + VEL.Save.slotInfo(s) + '</div>').join('');
    // title saves line
    const ts = document.getElementById('title-saves');
    if (ts) ts.textContent = [1, 2, 3].map((s) => VEL.Save.slotInfo(s)).join('  ·  ');
  },
};
