// Synthesised WebAudio: no audio files, everything is oscillators + noise.
// Engine hum follows speed, gunshots are filtered noise bursts, radio is a
// little looping jingle per station. Silent until the first key/click
// (browser autoplay policy), and muted entirely under ?shot=.
const AudioSys = {
  ctx: null, master: null, engineOsc: null, engineGain: null, started: false,

  init() {
    if (AudioSys.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      AudioSys.ctx = new AC();
      AudioSys.master = AudioSys.ctx.createGain();
      AudioSys.master.gain.value = 0.35;
      AudioSys.master.connect(AudioSys.ctx.destination);
      AudioSys.engineOsc = AudioSys.ctx.createOscillator();
      AudioSys.engineOsc.type = 'sawtooth';
      AudioSys.engineOsc.frequency.value = 55;
      AudioSys.engineGain = AudioSys.ctx.createGain();
      AudioSys.engineGain.gain.value = 0;
      const lp = AudioSys.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 320;
      AudioSys.engineOsc.connect(lp); lp.connect(AudioSys.engineGain); AudioSys.engineGain.connect(AudioSys.master);
      AudioSys.engineOsc.start();
      AudioSys.started = true;
    } catch (e) { /* audio unavailable — the game stays silent */ }
  },

  resume() { if (AudioSys.ctx && AudioSys.ctx.state === 'suspended') AudioSys.ctx.resume(); },

  setEngine(speed01) {
    if (!AudioSys.started || S.muted) return;
    AudioSys.engineOsc.frequency.value = 50 + speed01 * 160;
    AudioSys.engineGain.gain.value = S.player.inCar ? 0.05 + speed01 * 0.06 : 0;
  },

  blip(freq, dur, type, vol) {
    if (!AudioSys.started || S.muted) return;
    try {
      const o = AudioSys.ctx.createOscillator(), g = AudioSys.ctx.createGain();
      o.type = type || 'square'; o.frequency.value = freq || 440;
      g.gain.setValueAtTime(vol || 0.12, AudioSys.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, AudioSys.ctx.currentTime + (dur || 0.08));
      o.connect(g); g.connect(AudioSys.master);
      o.start(); o.stop(AudioSys.ctx.currentTime + (dur || 0.08));
    } catch (e) {}
  },

  noiseBurst(dur, vol, freq) {
    if (!AudioSys.started || S.muted) return;
    try {
      const len = Math.floor(AudioSys.ctx.sampleRate * dur);
      const buf = AudioSys.ctx.createBuffer(1, len, AudioSys.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = AudioSys.ctx.createBufferSource(); src.buffer = buf;
      const f = AudioSys.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1800;
      const g = AudioSys.ctx.createGain(); g.gain.value = vol || 0.25;
      src.connect(f); f.connect(g); g.connect(AudioSys.master);
      src.start();
    } catch (e) {}
  },

  shot() { AudioSys.noiseBurst(0.12, 0.3, 2400); },
  siren() { AudioSys.blip(720, 0.35, 'sine', 0.08); AudioSys.blip(540, 0.35, 'sine', 0.08); },
  pickup() { AudioSys.blip(660, 0.1, 'sine', 0.14); AudioSys.blip(990, 0.14, 'sine', 0.14); },
  mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => AudioSys.blip(f, 0.16, 'triangle', 0.16), i * 110)); },

  // A short jingle per radio station; the HUD shows the station line.
  radioJingle() {
    if (!AudioSys.started || S.muted) return;
    const base = [262, 330, 392, 494][S.radio % 4];
    [0, 2, 4, 7].forEach((n, i) => setTimeout(() => AudioSys.blip(base * Math.pow(2, n / 12), 0.18, 'triangle', 0.07), i * 130));
  },
};
