// Small WebAudio toolkit. Everything is synthesized; no files to load.
const STEPS = [0, 2, 4, 7, 9]; // major pentatonic
const freq = (i) => 261.63 * Math.pow(2, (STEPS[i % 5] + 12 * Math.floor(i / 5)) / 12);

export class Audio {
  constructor() { this.ctx = null; this.enabled = true; this.master = null; this.pad = null; }
  resume() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      try { this.ctx = new C(); } catch (e) { return; }
      this.master = this.ctx.createGain(); this.master.gain.value = this.enabled ? 0.7 : 0; this.master.connect(this.ctx.destination);
      this.startPad();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  apply() { if (this.master) this.master.gain.setTargetAtTime(this.enabled ? 0.7 : 0, this.ctx.currentTime, 0.1); }
  startPad() {
    const c = this.ctx, g = c.createGain(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520; g.gain.value = 0.028;
    [130.81, 196.0, 261.63].forEach((hz, i) => { const o = c.createOscillator(); o.type = i === 1 ? 'triangle' : 'sine'; o.frequency.value = hz; o.detune.value = (i - 1) * 6; o.connect(f); o.start(); });
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 0.012; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    f.connect(g); g.connect(this.master);
  }
  tone(hz, dur, vol, type = 'sine', slideTo = null) {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(hz, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  note(i, vol = 0.5) { const hz = freq(Math.max(0, Math.min(14, i))); this.tone(hz, 1.4, 0.16 * vol, 'sine'); this.tone(hz * 2, 0.7, 0.05 * vol, 'triangle'); }
  plip(val = 2) { this.tone(520 + Math.min(500, Math.log2(Math.max(1, val)) * 60), 0.14, 0.05, 'sine', 380); }
  shake() { this.tone(300 + Math.random() * 120, 0.12, 0.05, 'triangle', 700); }
  pop() { this.tone(900, 0.1, 0.07, 'square', 1400); }
  grow() { this.tone(196, 0.35, 0.09, 'sine', 392); this.tone(294, 0.5, 0.06, 'triangle', 588); }
  whistle() { this.tone(520, 0.5, 0.07, 'triangle', 660); setTimeout(() => this.tone(660, 0.7, 0.07, 'triangle', 640), 260); }
  chuff(v = 0.5) {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx, n = c.sampleRate * 0.12, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.5);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = 520; g.gain.value = 0.05 * v;
    src.buffer = buf; src.connect(f); f.connect(g); g.connect(this.master); src.start();
  }

  // ---- first person: footsteps, the train's low rumble, and a little something different in each kind of room ----
  noiseBuf(sec) { const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < n; i++) { l = l * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = l * 6; } return b; }
  step(soft) {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx, n = Math.floor(c.sampleRate * 0.07), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = soft ? 320 : 700 + Math.random() * 200; g.gain.value = soft ? 0.05 : 0.075;
    src.buffer = buf; src.connect(f); f.connect(g); g.connect(this.master); src.start();
  }
  journeyOn(on) {
    if (!this.ctx) return;
    if (!this.rumble) {
      const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); src.buffer = this.noiseBuf(3); src.loop = true; f.type = 'lowpass'; f.frequency.value = 150; g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.master); src.start(); this.rumble = g;
    }
    this.rumble.gain.setTargetAtTime(on && this.enabled ? 0.05 : 0, this.ctx.currentTime, 0.4);
  }
  // type is the room the conductor is standing in; called every frame in Journey
  ambience(type, dt, speedMul = 1) {
    if (!this.ctx || !this.enabled) return;
    if (this.rumble) this.rumble.gain.setTargetAtTime(0.03 + Math.min(0.05, 0.02 * speedMul), this.ctx.currentTime, 0.5);
    this.ambT = (this.ambT || 0) - dt; if (this.ambT > 0) return;
    const r = Math.random();
    const EV = {
      garden: () => { this.tone(1900 + r * 900, 0.09, 0.025, 'sine', 2600); setTimeout(() => this.tone(2300 + r * 700, 0.08, 0.02, 'sine', 3000), 120); return 2.5 + r * 4; },
      bath: () => { this.tone(900 + r * 200, 0.12, 0.03, 'sine', 500); return 1.2 + r * 2.5; },
      aquarium: () => { this.tone(500 + r * 300, 0.1, 0.025, 'sine', 900); return 1.5 + r * 3; },
      workshop: () => { this.tone(1100, 0.03, 0.03, 'square'); setTimeout(() => this.tone(900, 0.03, 0.025, 'square'), 480); return 1 + r; },
      library: () => { this.chuff(0.25); return 4 + r * 6; },
      music: () => { this.note(Math.floor(r * 8) + 2, 0.18); return 4 + r * 6; },
      observatory: () => { this.tone(2400 + r * 800, 0.8, 0.012, 'sine'); return 3 + r * 4; },
      dining: () => { this.tone(1700 + r * 300, 0.06, 0.03, 'triangle'); return 3 + r * 5; },
      sleeper: () => { this.chuff(0.18); return 5 + r * 6; },
    };
    this.ambT = EV[type] ? EV[type]() : 3 + r * 4;
  }
  bell() { [0, 1, 2, 3].forEach((i) => setTimeout(() => { this.tone(880, 1.6, 0.07, 'sine'); this.tone(1318, 1.2, 0.04, 'sine'); this.tone(2217, 0.8, 0.025, 'triangle'); }, i * 420)); }
  moment(type) {
    if (type === 'music') [0, 2, 4, 7, 4].forEach((s, i) => setTimeout(() => this.note(2 + s, 0.55), i * 220));
    else if (type === 'aquarium' || type === 'bath') [0, 1, 2].forEach((i) => setTimeout(() => this.tone(520 + i * 160, 0.12, 0.05, 'sine', 900), i * 130));
    else if (type === 'workshop') [0, 1, 2].forEach((i) => setTimeout(() => this.tone(1100, 0.03, 0.05, 'square'), i * 150));
    else this.chord();
  }
  coal(perfect) { this.tone(perfect ? 330 : 200, 0.16, 0.08, 'square', perfect ? 660 : 160); if (perfect) setTimeout(() => this.note(7, 0.5), 80); }
  chord() { [0, 2, 4].forEach((s, i) => setTimeout(() => this.note(5 + s, 0.45), i * 90)); }
}
