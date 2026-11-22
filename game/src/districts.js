/* districts.js — 5 districts, standing 0-100, WARY/NEUTRAL/FRIENDLY, price + help effects. */
VEL.Districts = {
  list: [],
  init() {
    this.list = VEL.CFG.districts.map((d) => ({ ...d }));
  },
  status(v) { return v >= 70 ? 'FRIENDLY' : v >= 40 ? 'NEUTRAL' : 'WARY'; },
  current(x, z) {
    let best = this.list[0], bd = 1e9;
    for (const d of this.list) { const dd = Math.hypot(d.cx - x, d.cz - z); if (dd < bd) { bd = dd; best = d; } }
    return best;
  },
  bump(id, n) {
    const d = this.list.find((x) => x.id === id);
    if (!d) return;
    const before = this.status(d.standing);
    d.standing = Math.max(0, Math.min(100, d.standing + n));
    const after = this.status(d.standing);
    if (after !== before) VEL.HUD.toast(d.name + ' is now ' + after + ' (' + d.standing + ')');
    else VEL.HUD.toast(d.name + ' standing ' + d.standing);
  },
  priceFactor(x, z) {
    const d = this.current(x, z);
    return this.status(d.standing) === 'FRIENDLY' ? 0.8 : this.status(d.standing) === 'WARY' ? 1.2 : 1;
  },
  friendlyCount() { return this.list.filter((d) => this.status(d.standing) === 'FRIENDLY').length; },
};
