// Seeded RNG (mulberry32) for deterministic city generation. Gameplay
// randomness uses Math.random; anything that must look the same every
// load — buildings, lanterns, traffic colours — comes from here.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const cityRng = mulberry32(1337);
function rngRange(rng, a, b) { return a + rng() * (b - a); }
function rngPick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }
function rngInt(rng, a, b) { return Math.floor(rngRange(rng, a, b + 1)); }
