// District standing: five neighbourhoods, each 0–100. Standing rises when
// you finish work in a district and shapes prices and how the locals treat
// you. The HUD shows the district you are standing in, right now.
const Districts = {
  at(x, z) {
    for (const d of DISTRICTS) {
      if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
    }
    return DISTRICTS[0];
  },

  addStanding(name, n) {
    const cur = S.districtStanding[name] ?? 50;
    const next = Math.max(0, Math.min(100, cur + n));
    S.districtStanding[name] = next;
    if (next >= 70 && cur < 70) HUD.toast(`${name.toUpperCase()} is now FRIENDLY — locals will look the other way.`);
    return next;
  },

  // Gun shop discount in friendly districts.
  discount(name) {
    return (S.districtStanding[name] ?? 50) >= 70 ? 0.75 : 1;
  },
};
