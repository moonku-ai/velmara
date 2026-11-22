/* rng.js — seeded deterministic RNG (mulberry32) for world layout and AI jitter. */
VEL.RNG = {
  seed: 1, s: 1,
  setSeed(n) { this.seed = n >>> 0 || 1; this.s = this.seed; },
  next() { this.s |= 0; this.s = (this.s + 0x6D2B79F5) | 0; let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
  range(a, b) { return a + this.next() * (b - a); },
  int(a, b) { return Math.floor(this.range(a, b + 1)); },
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; },
  color(palette) { return this.pick(palette); },
};
