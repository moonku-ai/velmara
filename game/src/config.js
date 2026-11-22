// VELMARA — Isle of Lanterns. Static configuration: world layout, districts,
// story missions, street races, crew, weapons, economy and the shared game state.
// Everything in this file is data; the systems that use it live in their own files.

const CFG = {
  world: { half: 210, roadEvery: 60, roadWidth: 12 },
  // Road grid lines (both axes) — every mission target, package and shop sits on one.
  roads: [-180, -120, -60, 0, 60, 120, 180],
  canal: { x0: -96, x1: -72, z0: -210, z1: 60 }, // north-south canal, bridges at crossings
  marina: { z0: 168 }, // south edge docks
  ridge: { z1: -168 }, // north edge volcanic ridge
  startCash: 1250,
  startPos: { x: 10, z: 40 },
  colors: {
    dusk: 0x2b3552, fog: 0x232c44, water: 0x0e3a4a, asphalt: 0x1c1f26,
    lantern: 0xffb347, neonPink: 0xff5da2, neonTeal: 0x37e0c8, neonGold: 0xffc94d,
  },
};

// Five districts. Standing 0-100; WARY < 40, NEUTRAL < 70, FRIENDLY >= 70.
const DISTRICTS = [
  { name: 'Lantern Quarter', short: 'LANTERN QTR', x0: -60, x1: 60, z0: -60, z1: 60, standing: 55, color: '#ffc94d' },
  { name: 'Old Pasaru', short: 'OLD PASARU', x0: -180, x1: -60, z0: -60, z1: 180, standing: 62, color: '#ff5da2' },
  { name: 'Banyan Green', short: 'BANYAN GREEN', x0: 60, x1: 180, z0: -180, z1: -60, standing: 48, color: '#37e0c8' },
  { name: 'Kumala Strand', short: 'KUMALA STRAND', x0: 60, x1: 180, z0: -60, z1: 180, standing: 58, color: '#7fb2ff' },
  { name: 'Ridge Town', short: 'RIDGE TOWN', x0: -180, x1: -60, z0: -180, z1: -60, standing: 35, color: '#c98bff' },
];

const RANKS = [
  { rp: 0, name: 'Wheelman' }, { rp: 300, name: 'Runner' }, { rp: 700, name: 'Fixer' },
  { rp: 1200, name: 'Shot Caller' }, { rp: 1800, name: 'Lantern King' },
];

// Crew: three allies, one keybind each. Cooldowns in seconds.
const CREW = [
  { key: 'KeyZ', name: 'Mara Voss', role: 'Driver', ability: 'SWAP PLATES', desc: 'Lose 1 wanted star', cooldown: 45 },
  { key: 'KeyX', name: 'Tomas Rook', role: 'Mechanic', ability: 'QUICK FIX', desc: 'Fully repair your car', cooldown: 40 },
  { key: 'KeyC', name: 'Lena Kade', role: 'Lookout', ability: 'EYES OUT', desc: 'Mark all police on the map (20s)', cooldown: 30 },
];

// Weapons: slot order matters for the HUD. ammo -1 means infinite (fists).
const WEAPONS = [
  { id: 'fists', name: 'FISTS', dmg: 12, rate: 0.45, range: 2.2, ammo: -1, auto: false },
  { id: 'pistol', name: 'PISTOL', dmg: 22, rate: 0.32, range: 46, ammo: 60, auto: false },
  { id: 'smg', name: 'SMG', dmg: 14, rate: 0.09, range: 40, ammo: 120, auto: true },
  { id: 'shotgun', name: 'SHOTGUN', dmg: 55, rate: 0.85, range: 22, ammo: 24, auto: false },
];

// Story missions. Stages are data: the mission engine in missions.js reads them.
// type: goto | steal | kill | tail | collect | escape. reward in cash, rp in rank points.
const MISSIONS = [
  {
    id: 1, title: 'Lantern Run', giver: 'Ivo Marek', district: 'Lantern Quarter',
    brief: 'Ivo needs a getaway car. Steal the orange Comet parked by the lantern arch, then bring it to the drop.',
    reward: 800, rp: 150, par: 150,
    stages: [
      { type: 'steal', title: 'STEAL THE GETAWAY CAR', text: 'Get in the orange Comet at the lantern arch.', x: -60, z: 60, r: 6, vehicle: 'comet' },
      { type: 'goto', title: 'DELIVER THE CAR', text: 'Drive the Comet to the drop-off in Lantern Quarter.', x: 60, z: -60, r: 7, inCar: true },
    ],
  },
  {
    id: 2, title: 'Canal Pickup', giver: 'Ivo Marek', district: 'Old Pasaru',
    brief: 'A pickup in the Old Pasaru night market went loud. Clear the shooters, then get out clean.',
    reward: 1200, rp: 200, par: 210,
    stages: [
      { type: 'goto', title: 'REACH THE NIGHT MARKET', text: 'Get to the market stalls on the canal road.', x: -120, z: 0, r: 8 },
      { type: 'kill', title: 'CLEAR THE AISLES', text: 'Take out the market shooters.', x: -120, z: 0, r: 30, count: 4, enemy: 'shooter' },
      { type: 'goto', title: 'ESCAPE THE MARKET', text: 'Reach the south crossroads and lose the heat.', x: 0, z: 120, r: 8 },
    ],
  },
  {
    id: 3, title: 'Dock Hustle', giver: 'Mara Voss', district: 'Ridge Town',
    brief: 'A box truck full of lantern oil is sitting at the north docks. Take it and haul it to the warehouse.',
    reward: 1500, rp: 220, par: 180,
    stages: [
      { type: 'steal', title: 'STEAL THE BOX TRUCK', text: 'Take the truck at the north docks.', x: -120, z: -120, r: 7, vehicle: 'truck' },
      { type: 'goto', title: 'HAUL TO THE WAREHOUSE', text: 'Drive the truck to the Kumala warehouse.', x: 120, z: 120, r: 8, inCar: true },
    ],
  },
  {
    id: 4, title: 'Tail Job', giver: 'Lena Kade', district: 'Banyan Green',
    brief: 'Chief Voss has a courier running the ridge road. Follow him — close enough to see, far enough not to be seen.',
    reward: 1400, rp: 220, par: 150,
    stages: [
      { type: 'tail', title: 'TAIL THE COURIER', text: 'Stay 15–45 m behind the courier for 20 s. Do not get spotted.', x: 60, z: -120, r: 10, time: 20 },
      { type: 'goto', title: 'REPORT BACK TO IVO', text: 'Bring the route back to Ivo Marek.', x: 0, z: -60, r: 7 },
    ],
  },
  {
    id: 5, title: 'Vault on the Water', giver: 'Ivo Marek', district: 'Lantern Quarter',
    brief: 'The floating bank in the lagoon keeps its vault behind six guards. Hit it hard and run for the marina.',
    reward: 2600, rp: 350, par: 300,
    stages: [
      { type: 'goto', title: 'REACH THE FLOATING BANK', text: 'Get to the bank doors on the lagoon walk.', x: 60, z: -120, r: 8 },
      { type: 'kill', title: 'CLEAR THE VAULT GUARDS', text: 'Take out the vault guards.', x: 60, z: -120, r: 30, count: 6, enemy: 'guard' },
      { type: 'collect', title: 'CRACK THE VAULT', text: 'Grab the cash from the vault.', x: 60, z: -120, r: 6 },
      { type: 'escape', title: 'ESCAPE TO THE MARINA', text: 'Lose the heat — reach the marina with wanted 4 on your tail.', x: 0, z: 180, r: 9, wanted: 4 },
    ],
  },
  {
    id: 6, title: 'The Grand Lantern', giver: 'Ivo Marek', district: 'Ridge Town',
    brief: 'The Grand Lantern casino pays out at midnight — and Chief Voss is there to collect. Take the chip, take the cash, and outrun the whole island.',
    reward: 5000, rp: 600, par: 360,
    stages: [
      { type: 'goto', title: 'REACH THE CASINO', text: 'Get to the Grand Lantern casino doors.', x: -60, z: -120, r: 8 },
      { type: 'kill', title: 'CLEAR THE CASINO FLOOR', text: 'Take out Voss’s guards on the casino floor.', x: -60, z: -120, r: 32, count: 8, enemy: 'guard' },
      { type: 'collect', title: 'TAKE THE LANTERN CHIP', text: 'Grab the Lantern Chip from the high table.', x: -60, z: -120, r: 6 },
      { type: 'escape', title: 'OUTRUN THE ISLAND', text: 'Wanted 5. A police heli is up. Reach the marina boat.', x: 60, z: 180, r: 9, wanted: 5 },
    ],
  },
];

// Street races: checkpoint chains on the road grid. Reward = winner payout.
const RACES = [
  { id: 1, name: 'Terrace Climb', reward: 600, rp: 80, par: 95, points: [[-180, 180], [-120, 60], [-60, -60], [0, -120], [60, -180]] },
  { id: 2, name: 'Lantern Mile', reward: 700, rp: 100, par: 70, points: [[0, -120], [0, -60], [0, 0], [0, 60], [0, 120]] },
  { id: 3, name: 'Ridge Descent', reward: 500, rp: 70, par: 100, points: [[180, -180], [120, -120], [60, -60], [0, -60], [-60, -60]] },
  { id: 4, name: 'Marina Sprint', reward: 400, rp: 60, par: 80, points: [[-180, 180], [-60, 180], [60, 180], [180, 180], [180, 60]] },
];

// Hidden packages: glowing lantern caches on road points. +250 cash each.
const PACKAGES = [
  [-180, 0], [-120, 120], [-60, -180], [0, 180], [60, 60],
  [120, -60], [180, 120], [-180, -120], [120, 180], [0, -180],
];

// Stunt jumps: ramps on roads. Hit one above 18 m/s to score. +300 cash each.
const STUNTS = [[60, 0], [-60, 120], [120, -120], [0, -60], [-120, 60]];

// Interactable places on the map.
const PLACES = {
  gunshop: { x: 120, z: 0, label: 'AMMU-NATION — gun shop' },
  respray: { x: 180, z: 60, label: 'Respray garage' },
  safehouse: { x: 10, z: 40, label: 'Safehouse' },
  exportDock: { x: 120, z: 180, label: 'Export dock' },
  taxiStand: { x: -60, z: 0, label: 'Taxi stand' },
};

// Police unit names for the VPD RESPONSE panel (original names, Velmara PD).
const POLICE_NAMES = [
  ['Unit 7', 'K. Arana', 'Pursuit'], ['Unit 12', 'D. Solis', 'Pursuit'],
  ['Unit 3', 'M. Ferran', 'Interceptor'], ['Unit 9', 'J. Okafor', 'Roadblock'],
  ['Unit 21', 'S. Lindt', 'Foot patrol'], ['Unit 5', 'R. Halvorsen', 'Pursuit'],
  ['Unit 14', 'T. Nakamura', 'Interceptor'], ['Unit 8', 'P. Duarte', 'Foot patrol'],
];

// Radio stations (synth jingles + line shown on the HUD).
const RADIO = [
  { name: 'LANTERN FM 98.4', genre: 'Island Pop' },
  { name: 'VOLCANO ROCK 101.1', genre: 'Rock' },
  { name: 'LAGOON WAVES 88.7', genre: 'Chillwave' },
];

// The shared mutable game state. Every system reads and writes this one object.
const S = {
  mode: 'title', // title | playing | paused | stats | wasted
  time: 0, cash: CFG.startCash, rp: 0,
  hp: 100, armor: 0, wanted: 0, wantedHeat: 0,
  weapon: 1, ammo: [ -1, 60, 120, 24 ],
  missionsDone: 0, missionRatings: {}, // mission id -> 'G' | 'S' | 'B'
  mission: null, // { def, stage, kills, timer, startedAt, damageTaken }
  race: null, // { def, cp, timer }
  racesDone: 0, raceWins: {},
  packages: 0, packagesFound: {}, stunts: 0, stuntsDone: {},
  fares: 0, taxi: null, exports: 0,
  kills: 0, killsThisMission: 0, carsStolen: 0, distanceKm: 0, copsEscaped: 0,
  crewCooldown: [0, 0, 0], eyesOutUntil: 0,
  districtStanding: {}, // name -> 0..100, seeded from DISTRICTS at boot
  radio: 0, god: false, muted: false,
  player: { x: CFG.startPos.x, z: CFG.startPos.z, yaw: 0, speed: 0, inCar: null, onFoot: true },
  camera: { yaw: 0, pitch: 0.32 },
  stats: { shots: 0, hits: 0 },
};
for (const d of DISTRICTS) S.districtStanding[d.name] = d.standing;

// Rank name from RP.
function rankFor(rp) {
  let cur = RANKS[0];
  for (const r of RANKS) if (rp >= r.rp) cur = r;
  return cur;
}
function nextRank(rp) {
  for (const r of RANKS) if (rp < r.rp) return r;
  return null;
}
// District standing label.
function standingLabel(v) { return v >= 70 ? 'FRIENDLY' : v >= 40 ? 'NEUTRAL' : 'WARY'; }
// Completion %: missions dominate, side content fills the rest.
function completionPct() {
  const m = (S.missionsDone / 6) * 55;
  const r = (S.racesDone / 4) * 10;
  const p = (S.packages / 10) * 10;
  const s = (S.stunts / 5) * 10;
  const t = (S.fares / 3) * 5;
  const e = (S.exports / 3) * 5;
  const d = DISTRICTS.filter((x) => S.districtStanding[x.name] >= 70).length * 1;
  return Math.min(100, m + r + p + s + t + e + d);
}
