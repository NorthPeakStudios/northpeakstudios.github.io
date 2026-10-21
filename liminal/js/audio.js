// generative ambient engine — Web Audio only, no samples, no network.
const SCALES = {
  phrygian:[0,1,3,5,7,8,10], aeolian:[0,2,3,5,7,8,10], dorian:[0,2,3,5,7,9,10],
  mixolydian:[0,2,4,5,7,9,10], ionian:[0,2,4,5,7,9,11], lydian:[0,2,4,6,7,9,11],
};
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const PROGS = [[0,5,3,4],[0,3,5,4],[0,5,1,4],[0,2,5,3],[0,3,0,4],[0,4,5,3]];

export class Engine {
  constructor(){ this.ctx = null; this.on = false; this.muted = false; this.mood = { v:.5, e:.3, chips:[] }; this.seed = 1; this.step = 0; }
  get ready(){ return !!this.ctx; }
  async unlock(){
    if (!this.ctx) {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch(_){}
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'playback' });
      this._build();
    }
    if (this.ctx.state !== 'running') { try { await this.ctx.resume(); } catch(_){} }
    // a silent buffer on the tap itself, the classic iOS unlock
    const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0);
  }
  _build(){
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.4;
    this.master.connect(comp).connect(c.destination);
    // reverb from a generated impulse
    this.verb = c.createConvolver(); this.verb.buffer = this._impulse(4.5, 2.6);
    this.wet = c.createGain(); this.wet.gain.value = 0.55; this.dry = c.createGain(); this.dry.gain.value = 0.6;
    this.bus = c.createGain(); this.bus.connect(this.dry).connect(this.master); this.bus.connect(this.verb); this.verb.connect(this.wet).connect(this.master);
    // pad: 4 voices x 2 detuned oscillators → lowpass → tremolo
    this.padFilter = c.createBiquadFilter(); this.padFilter.type = 'lowpass'; this.padFilter.frequency.value = 900; this.padFilter.Q.value = 0.7;
    this.padGain = c.createGain(); this.padGain.gain.value = 0.16;
    this.trem = c.createGain(); this.trem.gain.value = 1;
    this.lfo = c.createOscillator(); this.lfo.frequency.value = 1; this.lfoDepth = c.createGain(); this.lfoDepth.gain.value = 0;
    this.lfo.connect(this.lfoDepth).connect(this.trem.gain); this.lfo.start();
    this.padFilter.connect(this.padGain).connect(this.trem).connect(this.bus);
    this.voices = [];
    for (let i = 0; i < 4; i++) {
      const g = c.createGain(); g.gain.value = i === 0 ? 0.32 : 0.24; g.connect(this.padFilter);
      const oscs = [-7, 7].map(d => { const o = c.createOscillator(); o.type = 'sawtooth'; o.detune.value = d + (i*3); o.frequency.value = 220; o.connect(g); o.start(); return o; });
      this.voices.push({ g, oscs });
    }
    // sub
    this.sub = c.createOscillator(); this.sub.type = 'sine'; this.subGain = c.createGain(); this.subGain.gain.value = 0.0;
    this.sub.connect(this.subGain).connect(this.master); this.sub.start();
    // air / rumble bed
    const nb = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), d = nb.getChannelData(0);
    let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random()*2-1; last = (last + 0.02*w) / 1.02; d[i] = last * 3.5; }
    this.noise = c.createBufferSource(); this.noise.buffer = nb; this.noise.loop = true;
    this.noiseFilter = c.createBiquadFilter(); this.noiseFilter.type = 'bandpass'; this.noiseFilter.frequency.value = 600; this.noiseFilter.Q.value = 0.6;
    this.noiseGain = c.createGain(); this.noiseGain.gain.value = 0.05;
    this.noise.connect(this.noiseFilter).connect(this.noiseGain).connect(this.bus); this.noise.start();
    this.chordIdx = -1; this.nextTime = 0;
    this._apply(true);
  }
  _impulse(sec, decay){
    const c = this.ctx, len = c.sampleRate * sec, buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, decay); }
    return buf;
  }
  // derived musical parameters
  _params(){
    const { v, e, chips } = this.mood, has = k => chips.includes(k);
    const scale = v < 0.18 ? 'phrygian' : v < 0.4 ? 'aeolian' : v < 0.58 ? 'dorian' : v < 0.78 ? (e > 0.5 ? 'mixolydian' : 'ionian') : 'lydian';
    const root = 45 + Math.round(v * 7) + (has('hollow') ? -2 : 0);   // A2 … E3
    const bpm = 52 + e * 70;
    let cutoff = 380 + Math.pow(v, 1.3) * 2600 + e * 600;
    if (has('warm')) cutoff *= 0.75; if (has('foggy')) cutoff *= 0.6; if (has('sharp') || has('electric')) cutoff *= 1.35;
    if (has('glowing') || has('open')) cutoff *= 1.15;
    return { scale, root, bpm, cutoff,
      pluckProb: 0.04 + e * 0.38 + (has('electric') ? 0.12 : 0) - (has('hollow') ? 0.04 : 0),
      pulse: Math.max(0, (e - 0.55) / 0.45),
      noise: 0.025 + (has('foggy') ? 0.06 : 0) + (has('distant') ? 0.03 : 0) + (1 - e) * 0.015,
      sub: (1 - v) * 0.11,
      pluckType: has('electric') ? 'square' : has('sharp') ? 'sawtooth' : v > 0.55 ? 'triangle' : 'sine',
      attack: has('tender') || has('weightless') ? 0.05 : has('sharp') ? 0.002 : 0.008,
      wet: 0.42 + (1 - e) * 0.25 + (has('distant') || has('hollow') ? 0.15 : 0),
      chordBeats: e > 0.66 ? 4 : 8 };
  }
  _apply(instant){
    if (!this.ctx) return;
    const p = this._params(), t = this.ctx.currentTime, k = instant ? 0.01 : 0.35;
    this.p = p;
    this.padFilter.frequency.setTargetAtTime(p.cutoff, t, k);
    this.noiseFilter.frequency.setTargetAtTime(200 + this.mood.v * 2400, t, k);
    this.noiseGain.gain.setTargetAtTime(p.noise, t, k);
    this.subGain.gain.setTargetAtTime(this.on ? p.sub : 0, t, k);
    this.wet.gain.setTargetAtTime(Math.min(0.85, p.wet), t, k);
    this.lfo.frequency.setTargetAtTime((p.bpm / 60) * (this.mood.e > 0.7 ? 2 : 1), t, k);
    this.lfoDepth.gain.setTargetAtTime(Math.pow(this.mood.e, 2) * 0.45, t, k);
    this.trem.gain.setTargetAtTime(1 - Math.pow(this.mood.e, 2) * 0.3, t, k);
    for (const vc of this.voices) for (const o of vc.oscs) o.type = this.mood.chips.includes('warm') || this.mood.v < 0.3 ? 'triangle' : 'sawtooth';
    const key = p.scale + p.root;
    if (key !== this._key) { this._key = key; this._chord(this.chordIdx < 0 ? 0 : this.chordIdx, t, instant ? 0.01 : 0.6); }
  }
  _chord(idx, when, glide = 1.2){
    const p = this.p, sc = SCALES[p.scale], prog = PROGS[this.seed % PROGS.length];
    const deg = prog[((idx % prog.length) + prog.length) % prog.length];
    const note = n => { const o = Math.floor((deg + n) / 7); return p.root + 12 + sc[(deg + n) % 7] + 12 * o; };
    const tones = [note(0), note(2), note(4), note(this.mood.v > 0.55 ? 6 : 7)];
    this.voices.forEach((vc, i) => vc.oscs.forEach(o => o.frequency.setTargetAtTime(mtof(tones[i]), when, glide / 3)));
    this.sub.frequency.setTargetAtTime(mtof(p.root + sc[deg % 7] - 12 + (deg >= 7 ? 12 : 0)), when, glide / 3);
    this.curChord = tones;
  }
  setMood(m, seed){
    this.mood = { v: m.v, e: m.e, chips: (m.chips || []).slice() };
    if (seed != null && seed !== this.seed) { this.seed = seed >>> 0; this.step = 0; this.chordIdx = -1; this._key = null; }
    this._apply(false);
  }
  async play(){
    if (!this.ctx) return; if (this.ctx.state !== 'running') { try { await this.ctx.resume(); } catch(_){} }
    if (this.on) return; this.on = true;
    const t = this.ctx.currentTime; this.nextTime = t + 0.08;
    this.master.gain.cancelScheduledValues(t); this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.7, t + 2.2);
    this.subGain.gain.setTargetAtTime(this.p.sub, t, 0.5);
    clearInterval(this._timer); this._timer = setInterval(() => this._tick(), 30);
  }
  stop(fade = 1.2){
    if (!this.ctx || !this.on) return; this.on = false;
    const t = this.ctx.currentTime; this.master.gain.cancelScheduledValues(t); this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + fade);
    clearInterval(this._timer);
  }
  setMuted(m){
    this.muted = m; if (!this.ctx) return;
    const t = this.ctx.currentTime; this.master.gain.cancelScheduledValues(t); this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(m || !this.on ? 0 : 0.7, t + 0.6);
  }
  suspend(){ if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume(){ if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }
  _tick(){
    const c = this.ctx; if (!c) return;
    while (this.nextTime < c.currentTime + 0.15) { this._schedule(this.step, this.nextTime); this.nextTime += 60 / this.p.bpm / 4; this.step++; }
  }
  _schedule(step, t){
    const p = this.p, beat = step / 4, rnd = mulberry32((this.seed ^ Math.imul(step + 1, 2654435761)) >>> 0);
    if (step % (p.chordBeats * 4) === 0) { this.chordIdx = Math.floor(step / (p.chordBeats * 4)); this._chord(this.chordIdx, t); }
    // pulse on the beat when restless — a soft heartbeat thump
    if (p.pulse > 0 && step % 4 === 0) this._thump(t, 0.32 * p.pulse);
    if (p.pulse > 0.5 && step % 4 === 2 && rnd() < 0.5) this._thump(t, 0.14 * p.pulse);
    // plucks
    const onBeat = step % 4 === 0 ? 1.6 : step % 2 === 0 ? 1 : 0.6;
    if (rnd() < p.pluckProb * onBeat) {
      const sc = SCALES[p.scale], penta = [0, 1, 2, 4, 5].map(i => sc[i]);
      const oct = 24 + (this.mood.v > 0.5 ? 12 : 0) + (rnd() < 0.3 ? 12 : 0);
      const n = p.root + oct + (rnd() < 0.6 ? penta[Math.floor(rnd() * penta.length)] : sc[[0, 2, 4][Math.floor(rnd() * 3)]]);
      this._pluck(t, mtof(n), 0.05 + rnd() * 0.05, 0.6 + (1 - this.mood.e) * 2.2);
    }
  }
  _pluck(t, f, vel, dur){
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
    o.type = this.p.pluckType; o.frequency.value = f;
    fl.type = 'lowpass'; fl.frequency.value = Math.min(9000, this.p.cutoff * 2.2); fl.Q.value = 0.5;
    const v = this.p.pluckType === 'sine' ? vel * 1.4 : this.p.pluckType === 'triangle' ? vel : vel * 0.45;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + this.p.attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl).connect(g).connect(this.bus); o.start(t); o.stop(t + dur + 0.05);
  }
  _thump(t, vel){
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.4);
  }
}
