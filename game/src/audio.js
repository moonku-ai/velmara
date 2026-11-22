/* audio.js — WebAudio synth: engine hum, gunshots, sirens, pickups, radio jingles. No audio files. */
VEL.Audio = {
  ctx: null, muted: false, master: null, engineOsc: null, engineGain: null, radioTimer: 0, songIdx: 0,
  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.35; this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 50;
      this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0;
      const filt = this.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 320;
      this.engineOsc.connect(filt); filt.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.35; },
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur);
  },
  noise(dur, vol, freq) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1200;
    const g = this.ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
  },
  shot() { this.noise(0.12, 0.5, 2600); this.tone(180, 0.08, 'square', 0.18, 60); },
  siren() { this.tone(700, 0.5, 'sine', 0.06, 1100); },
  pickup() { this.tone(660, 0.1, 'sine', 0.2); setTimeout(() => this.tone(990, 0.14, 'sine', 0.2), 90); },
  cash() { this.tone(880, 0.1, 'triangle', 0.22); setTimeout(() => this.tone(1320, 0.18, 'triangle', 0.22), 100); },
  hit() { this.noise(0.08, 0.3, 800); },
  crash() { this.noise(0.3, 0.5, 500); },
  missionPass() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.22), i * 110)); },
  engine(speed01) {
    if (!this.engineOsc) return;
    this.engineOsc.frequency.value = 45 + speed01 * 140;
    this.engineGain.gain.value = VEL.State && VEL.State.inCar ? 0.05 + speed01 * 0.06 : 0;
  },
  update(dt) {
    this.radioTimer += dt;
    if (this.radioTimer > 24) {
      this.radioTimer = 0; this.songIdx = (this.songIdx + 1) % VEL.CFG.radioSongs.length;
      const el = document.getElementById('radio-song');
      if (el) el.textContent = VEL.CFG.radioSongs[this.songIdx];
      this.tone(440, 0.3, 'sine', 0.08, 660);
    }
  },
};
