// liminal · night tools (v40): 20 sleep + calm features. everything here runs on the phone:
// web audio for sound, the mic only on tap (never recorded, never sent), and notes kept in localStorage
// under lim.x40.* (local only, never synced). app.js hands in what it already has through install().
let A; // the app's api, set by install()
const LSG = (k, d) => A.LS.get('x40.' + k, d), LSS = (k, v) => A.LS.set('x40.' + k, v);
const esc = s => A.esc(s);
const pad2 = n => String(n).padStart(2, '0');
const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
const nightKey = t => dayKey(new Date(t).getHours() < 12 ? t - 864e5 : t); // a 3am wakeup belongs to the night before
const fmtT = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '');
const fmtD = t => new Date(t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }).toLowerCase();
const fmtDur = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? h + 'h' + (r ? ' ' + r + 'm' : '') : r + 'm'; };
const fmtClock = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + pad2(s % 60); };
const nid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };
const fine = t => `<p class="x6-fine">${t}</p>`;
const ring3 = (id) => `<div class="x40-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="x40-rt"/><circle cx="50" cy="50" r="44" class="x40-rp" id="x40rp"/></svg><div><b id="x40rc">${id[0]}</b><small id="x40rs">${id[1]}</small></div></div>`;

/* ---------- sound: one small Web Audio graph of our own; the main soundscape pauses while it plays ---------- */
let AC = null, OUT = null; const NB = {};
const LIVE = new Set();
function ac() {
  if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {} AC = new C(); OUT = AC.createGain(); OUT.gain.value = 0.9 * (A.engine.vol || 1); OUT.connect(AC.destination); }
  if (AC.state !== 'running') AC.resume().catch(() => {});
  return AC;
}
function hushMain() { try { if (A.X6.wasMuted === null) A.X6.wasMuted = A.S.muted; A.engine.setMuted(true); } catch {} }
function noiseBuf(kind) {
  if (NB[kind]) return NB[kind];
  const c = AC, len = c.sampleRate * 8, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w * 0.5;
    else if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else { b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852; b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926; }
  }
  const f = Math.floor(c.sampleRate * 0.25); for (let i = 0; i < f; i++) { const k = i / f; d[len - f + i] = d[len - f + i] * (1 - k) + d[i] * k; } // soften the loop seam
  return (NB[kind] = b);
}
// a looping noise voice: kind → filter → gain → OUT
function noise(kind, gain, ftype, freq, q) {
  const c = ac(); if (!c) return null; hushMain();
  const s = c.createBufferSource(); s.buffer = noiseBuf(kind); s.loop = true;
  const f = c.createBiquadFilter(); f.type = ftype || 'lowpass'; f.frequency.value = freq || 20000; f.Q.value = q || 0.7;
  const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(gain, c.currentTime, 0.4);
  s.connect(f).connect(g).connect(OUT); s.start();
  const v = { g, f, s, stop: (fade = 0.3) => { try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setTargetAtTime(0, c.currentTime, fade); s.stop(c.currentTime + fade * 6 + 0.05); } catch {} LIVE.delete(v); } };
  LIVE.add(v); return v;
}
// binaural pair: the carrier in the left ear, carrier + beat in the right. a beat only with headphones.
function binaural(carrier, beat, gain) {
  const c = ac(); if (!c) return null; hushMain();
  const m = c.createChannelMerger(2), g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(gain, c.currentTime, 0.5);
  const l = c.createOscillator(), r = c.createOscillator(); l.type = r.type = 'sine';
  l.frequency.value = carrier; r.frequency.value = carrier + beat;
  l.connect(m, 0, 0); r.connect(m, 0, 1); m.connect(g).connect(OUT); l.start(); r.start();
  const v = { g, set: (cf, bf) => { l.frequency.setTargetAtTime(cf, c.currentTime, 0.05); r.frequency.setTargetAtTime(cf + bf, c.currentTime, 0.05); },
    stop: (fade = 0.3) => { try { g.gain.setTargetAtTime(0, c.currentTime, fade); l.stop(c.currentTime + fade * 6 + 0.05); r.stop(c.currentTime + fade * 6 + 0.05); } catch {} LIVE.delete(v); } };
  LIVE.add(v); return v;
}
// shepard tone: ten octave-spaced sines under a bell-shaped loudness curve, gliding forever up (or down)
function shepard(gain) {
  const c = ac(); if (!c) return null; hushMain();
  const N = 10, base = 27.5, g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(gain, c.currentTime, 0.5); g.connect(OUT);
  const vs = Array.from({ length: N }, () => { const o = c.createOscillator(), a = c.createGain(); o.type = 'sine'; a.gain.value = 0; o.connect(a).connect(g); o.start(); return { o, a }; });
  let pos = 0, speed = 0.05, dir = 1, last = performance.now();
  const upd = () => { const now = performance.now(), dt = (now - last) / 1000; last = now; pos = ((pos + dir * speed * dt) % 1 + 1) % 1;
    vs.forEach((v, i) => { const x = (i + pos) / N, f = base * Math.pow(2, i + pos), amp = Math.exp(-Math.pow((x - 0.5) / 0.16, 2) / 2); v.o.frequency.setTargetAtTime(f, c.currentTime, 0.015); v.a.gain.setTargetAtTime(amp * 0.22, c.currentTime, 0.015); }); };
  upd(); const t = setInterval(upd, 40);
  const v = { g, set: (sp, d) => { speed = sp; dir = d; }, stop: (fade = 0.3) => { clearInterval(t); try { g.gain.setTargetAtTime(0, c.currentTime, fade); vs.forEach(x => x.o.stop(c.currentTime + fade * 6 + 0.05)); } catch {} LIVE.delete(v); } };
  LIVE.add(v); return v;
}
// a clear bell, for the end of a nap or the alarm
function chime(sharp, when) {
  const c = ac(); if (!c) return; const t0 = c.currentTime + (when || 0);
  (sharp ? [[880, .5], [1760, .25], [2637, .14], [3520, .08]] : [[523, .4], [784, .22], [1046, .12]]).forEach(([f, a]) => {
    const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(a * (sharp ? 0.9 : 0.6), t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (sharp ? 1.6 : 3));
    o.connect(g).connect(OUT); o.start(t0); o.stop(t0 + 3.2);
  });
}
function stopAll(fade) { [...LIVE].forEach(v => v.stop(fade)); }

/* ---------- screen wake lock (timers only run while liminal is open) ---------- */
let WL = null, wantWL = false;
async function keepAwake(on) {
  wantWL = on;
  try { if (on && 'wakeLock' in navigator && !WL) { WL = await navigator.wakeLock.request('screen'); WL.addEventListener('release', () => { WL = null; }); } if (!on && WL) { const w = WL; WL = null; await w.release(); } } catch { WL = null; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && wantWL) keepAwake(true); });
const awakeNote = () => 'wakeLock' in navigator ? 'liminal keeps the screen on while this runs; keep the app open (plugged in is best).' : 'keep liminal open and the screen on while this runs; timers pause if the phone locks.';

/* ---------- the mic, only on tap: a level meter + spectrum. nothing is recorded or stored. ---------- */
async function micOpen() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nomic');
  const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const c = ac(), src = c.createMediaStreamSource(st), an = c.createAnalyser(); an.fftSize = 4096; an.smoothingTimeConstant = 0.6; src.connect(an);
  const buf = new Float32Array(an.fftSize), spec = new Float32Array(an.frequencyBinCount);
  return {
    an, c,
    level() { an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return 20 * Math.log10(Math.sqrt(s / buf.length) + 1e-9); },
    spectrum() { an.getFloatFrequencyData(spec); return spec; },
    close() { try { st.getTracks().forEach(t => t.stop()); src.disconnect(); } catch {} }
  };
}
const micErr = e => e && e.name === 'NotAllowedError' ? 'the mic is off for liminal. you can allow it in settings, or use it without.' : 'no mic available here, so this part can’t run.';

/* ---------- 20 · sensory sensitivity profile (free): haptics · motion · contrast ---------- */
const realVibrate = navigator.vibrate ? navigator.vibrate.bind(navigator) : null;
function sensApply() {
  const p = LSG('sense', { haptics: true, contrast: false });
  if (realVibrate) { try { navigator.vibrate = p.haptics ? realVibrate : () => false; } catch {} }
  document.documentElement.classList.toggle('x40-hc', !!p.contrast);
}
const calmOn = () => A.LS.get('calm', matchMedia('(prefers-reduced-motion: reduce)').matches);
function sense() {
  const p = LSG('sense', { haptics: true, contrast: false }), calm = calmOn(), all = !p.haptics && calm && p.contrast;
  const row = (id, name, sub, on) => `<button class="x40-row" id="${id}"><span><b>${name}</b><small>${sub}</small></span><span class="toggle${on ? ' on' : ''}"></span></button>`;
  const ov = A.x8open('sense', `<button class="x6-blendbtn" id="x40all">${all ? 'back to normal' : 'overload day: calm everything'}</button>
    <div class="x40-rows">${row('x40h', 'haptics', 'little vibrations on taps and breathing steps', p.haptics)}${row('x40m', 'reduce motion', 'no drifting, floating or fading animations', calm)}${row('x40c', 'high contrast', 'brighter text, solid panels, no blur', p.contrast)}</div>
    ${fine('kept on this phone. “reduce motion” is the same switch as in settings.')}`);
  const save = (np, nc) => { LSS('sense', np); if (nc !== undefined) { A.LS.set('calm', nc); A.xApplyLook(); } sensApply(); sense(); };
  ov.querySelector('#x40h').onclick = () => save({ ...p, haptics: !p.haptics });
  ov.querySelector('#x40m').onclick = () => save(p, !calm);
  ov.querySelector('#x40c').onclick = () => save({ ...p, contrast: !p.contrast });
  ov.querySelector('#x40all').onclick = () => all ? save({ haptics: true, contrast: false }, false) : save({ haptics: false, contrast: true }, true);
}

/* ---------- 17 · dusk-to-dawn tint sync: warm the screen with your local twilight ---------- */
// sun times from the NOAA almanac approximation, worked out offline. minutes after local midnight, or null (polar day/night).
function sunTimes(date, lat, lon, zenith) {
  const rad = Math.PI / 180, start = new Date(date.getFullYear(), 0, 0), N = Math.floor((date - start) / 864e5);
  const out = rising => {
    const lngHour = lon / 15, t = N + ((rising ? 6 : 18) - lngHour) / 24, M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin(M * rad) + 0.020 * Math.sin(2 * M * rad) + 282.634; L = (L % 360 + 360) % 360;
    let RA = Math.atan(0.91764 * Math.tan(L * rad)) / rad; RA = (RA % 360 + 360) % 360; RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15;
    const sinDec = 0.39782 * Math.sin(L * rad), cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(zenith * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad)); if (cosH > 1 || cosH < -1) return null;
    const H = (rising ? 360 - Math.acos(cosH) / rad : Math.acos(cosH) / rad) / 15;
    const T = H + RA - 0.06571 * t - 6.622, UT = ((T - lngHour) % 24 + 24) % 24;
    return ((UT * 60 - date.getTimezoneOffset()) % 1440 + 1440) % 1440;
  };
  return { rise: out(true), set: out(false) };
}
function tintPhases(now) {
  const p = LSG('tint', { mode: 'off' }); if (p.mode === 'off') return null;
  const d = new Date(now);
  if (p.mode === 'geo') {
    if (!isFinite(p.lat)) return null;
    const s = sunTimes(d, p.lat, p.lon, 90.833), cv = sunTimes(d, p.lat, p.lon, 96);
    if (s.rise == null || s.set == null) return null;
    return { rise: s.rise, set: s.set, dawn: cv.rise == null ? s.rise - 30 : cv.rise, dusk: cv.set == null ? s.set + 30 : cv.set };
  }
  const rise = p.rise != null ? p.rise : 420, set = p.set != null ? p.set : 1140; // manual: your own sunrise / sunset
  return { rise, set, dawn: rise - 30, dusk: set + 30 };
}
function tintLevel(now) {
  const ph = tintPhases(now); if (!ph) return { a: 0, name: 'off' };
  const d = new Date(now), m = d.getHours() * 60 + d.getMinutes(), max = LSG('tint', {}).strength || 0.28;
  const lerp = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  if (m >= ph.set - 60 && m < ph.set) return { a: max * 0.35 * lerp(m, ph.set - 60, ph.set), name: 'golden hour' };
  if (m >= ph.set && m < ph.dusk) return { a: max * (0.35 + 0.4 * lerp(m, ph.set, ph.dusk)), name: 'dusk' };
  if (m >= ph.dusk || m < ph.dawn) return { a: max, name: 'night' };
  if (m >= ph.dawn && m < ph.rise) return { a: max * (1 - 0.7 * lerp(m, ph.dawn, ph.rise)), name: 'dawn' };
  if (m >= ph.rise && m < ph.rise + 45) return { a: max * 0.3 * (1 - lerp(m, ph.rise, ph.rise + 45)), name: 'sunrise' };
  return { a: 0, name: 'daylight' };
}
function tintApply() {
  let el = document.getElementById('x40tint'); const { a } = tintLevel(Date.now());
  if (!a) { if (el) el.style.opacity = '0'; return; }
  if (!el) { el = document.createElement('div'); el.id = 'x40tint'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); }
  el.style.opacity = String(Math.min(0.5, a).toFixed(3));
}
const minToTime = m => pad2(Math.floor(((m % 1440) + 1440) % 1440 / 60)) + ':' + pad2(Math.round(((m % 60) + 60) % 60) % 60);
const timeToMin = s => { const [h, mm] = String(s || '').split(':').map(Number); return isFinite(h) && isFinite(mm) ? h * 60 + mm : null; };
const minLabel = m => { m = ((m % 1440) + 1440) % 1440; return fmtT(new Date(2026, 0, 1, Math.floor(m / 60), Math.round(m % 60)).getTime()); };
function tint() {
  const p = LSG('tint', { mode: 'off', strength: 0.28 }), lv = tintLevel(Date.now()), ph = tintPhases(Date.now());
  const ov = A.x8open('tint', `<div class="x8-seg" id="x40tm">${[['off', 'off'], ['geo', 'my twilight'], ['manual', 'set times']].map(([k, l]) => `<button class="${p.mode === k ? 'on' : ''}" data-m="${k}">${l}</button>`).join('')}</div>
    ${p.mode === 'manual' ? `<div class="x40-two"><label>sunrise<input type="time" class="x8-in" id="x40rise" value="${minToTime(p.rise != null ? p.rise : 420)}"></label><label>sunset<input type="time" class="x8-in" id="x40set" value="${minToTime(p.set != null ? p.set : 1140)}"></label></div>` : ''}
    ${p.mode !== 'off' ? `<p class="x40-lab">strength</p><input type="range" class="x40-range" id="x40ts" min="0.1" max="0.45" step="0.01" value="${p.strength || 0.28}">` : ''}
    <div class="x40-card" id="x40tnow">${ph ? `<b>${esc(lv.name)}</b><small>sunrise ${minLabel(ph.rise)} · sunset ${minLabel(ph.set)} · tint now ${Math.round(lv.a / 0.45 * 100)}%</small>` : p.mode === 'off' ? '<small>off. pick “my twilight” or “set times”.</small>' : '<small>no sunset or sunrise here today (polar day or night).</small>'}</div>
    ${fine('golden hour, then dusk, then night: the screen warms. at dawn it clears. “my twilight” asks for your location once, rounds it to about 10 km and keeps it on this phone only; the sun times are worked out right here, offline.')}`);
  const save = np => { LSS('tint', np); tintApply(); tint(); };
  ov.querySelectorAll('#x40tm [data-m]').forEach(b => b.onclick = () => {
    const m = b.dataset.m;
    if (m !== 'geo') return save({ ...p, mode: m });
    if (isFinite(p.lat)) return save({ ...p, mode: 'geo' });
    if (!navigator.geolocation) return A.toast('location isn’t available here · try “set times”');
    navigator.geolocation.getCurrentPosition(pos => save({ ...p, mode: 'geo', lat: Math.round(pos.coords.latitude * 10) / 10, lon: Math.round(pos.coords.longitude * 10) / 10 }), () => A.toast('no location · try “set times” instead'), { maximumAge: 864e5, timeout: 15000 });
  });
  const r = ov.querySelector('#x40rise'), s = ov.querySelector('#x40set');
  if (r) r.onchange = () => { const v = timeToMin(r.value); if (v != null) save({ ...p, rise: v }); };
  if (s) s.onchange = () => { const v = timeToMin(s.value); if (v != null) save({ ...p, set: v }); };
  const ts = ov.querySelector('#x40ts'); if (ts) { ts.oninput = () => { LSS('tint', { ...p, strength: +ts.value }); tintApply(); }; ts.onchange = () => tint(); }
}

/* ---------- 1 · audio illusion builder: binaural beats + shepard tones ---------- */
function illusion(kind) {
  kind = kind || 'binaural'; stopAll();
  const ov = A.x8open('illusion', `<div class="x8-seg" id="x40ik"><button class="${kind === 'binaural' ? 'on' : ''}" data-k="binaural">binaural beat</button><button class="${kind === 'shepard' ? 'on' : ''}" data-k="shepard">shepard tone</button></div>
    ${kind === 'binaural' ? `<p class="x40-lab">tone <b id="x40cv">200 Hz</b></p><input type="range" class="x40-range" id="x40c" min="60" max="500" step="1" value="200">
    <p class="x40-lab">beat <b id="x40bv">6 Hz</b> <span id="x40bn"></span></p><input type="range" class="x40-range" id="x40b" min="0.5" max="40" step="0.5" value="6">
    ${fine('🎧 headphones on: the left ear hears one tone, the right ear a slightly different one. the slow “beat” you hear is made inside your head, not in the sound.')}`
    : `<p class="x40-lab">speed <b id="x40sv">slow</b></p><input type="range" class="x40-range" id="x40s" min="0.01" max="0.25" step="0.005" value="0.05">
    <div class="x8-seg" id="x40sd"><button class="on" data-d="1">rising forever</button><button data-d="-1">falling forever</button></div>
    ${fine('ten tones an octave apart. the top one fades out as a new bottom one fades in, so the pitch seems to climb without ever getting higher.')}`}
    <p class="x40-lab">volume</p><input type="range" class="x40-range" id="x40v" min="0" max="1" step="0.02" value="0.5">
    <button class="x6-blendbtn" id="x40ip">play</button>`);
  let v = null; const vol = () => +ov.querySelector('#x40v').value * (kind === 'binaural' ? 0.35 : 0.8);
  const band = b => b < 4 ? 'delta range' : b < 8 ? 'theta range' : b < 13 ? 'alpha range' : b < 30 ? 'beta range' : 'gamma range';
  ov.querySelectorAll('#x40ik [data-k]').forEach(b => b.onclick = () => illusion(b.dataset.k));
  const upd = () => {
    if (kind === 'binaural') { const cf = +ov.querySelector('#x40c').value, bf = +ov.querySelector('#x40b').value; ov.querySelector('#x40cv').textContent = cf + ' Hz'; ov.querySelector('#x40bv').textContent = bf + ' Hz'; ov.querySelector('#x40bn').textContent = '· ' + band(bf); if (v) v.set(cf, bf); }
    else { const sp = +ov.querySelector('#x40s').value, d = +((ov.querySelector('#x40sd .on') || {}).dataset || {}).d || 1; ov.querySelector('#x40sv').textContent = sp < 0.04 ? 'slow' : sp < 0.12 ? 'medium' : 'fast'; if (v) v.set(sp, d); }
    if (v) v.g.gain.setTargetAtTime(vol(), AC.currentTime, 0.05);
  };
  ov.querySelectorAll('input[type=range]').forEach(i => i.oninput = upd);
  ov.querySelectorAll('#x40sd [data-d]').forEach(b => b.onclick = () => { ov.querySelectorAll('#x40sd [data-d]').forEach(x => x.classList.toggle('on', x === b)); upd(); });
  ov.querySelector('#x40ip').onclick = e => {
    if (v) { v.stop(); v = null; e.target.textContent = 'play'; return; }
    v = kind === 'binaural' ? binaural(+ov.querySelector('#x40c').value, +ov.querySelector('#x40b').value, vol()) : shepard(vol());
    if (!v) return A.toast('sound isn’t available in this browser');
    e.target.textContent = 'stop'; upd();
  };
  upd();
}

/* ---------- 11 · binaural focus sprints: 25 min on a 40 Hz beat, then 5 off ---------- */
function sprint() {
  stopAll(); const today = dayKey(Date.now()), done = (LSG('sprints', {})[today]) || 0;
  const ov = A.x8open('sprint', `${ring3(['25:00', 'ready'])}
    <div class="x8-seg" id="x40sl"><button class="on" data-m="25">25 min</button><button data-m="15">15 min</button><button data-m="50">50 min</button></div>
    <label class="x40-check"><input type="checkbox" id="x40sb" checked> 40 Hz binaural hum (headphones)</label>
    <button class="x6-blendbtn" id="x40sg">start sprint</button>
    <p class="x40-lab" style="text-align:center">today · ${done} sprint${done === 1 ? '' : 's'}</p>
    ${fine('200 Hz in one ear and 240 Hz in the other makes a 40 Hz “gamma” beat, under soft brown noise. research on 40 Hz and focus is early and mixed; at the least it’s a steady sound that covers distractions. ' + awakeNote())}`);
  let mins = 25, T = 0, end = 0, phase = 'idle', bv = null, nv = null;
  const rp = ov.querySelector('#x40rp'), C = 2 * Math.PI * 44; rp.style.strokeDasharray = C; rp.style.strokeDashoffset = 0;
  const q = s => ov.querySelector(s);
  ov.querySelectorAll('#x40sl [data-m]').forEach(b => b.onclick = () => { if (phase !== 'idle') return; mins = +b.dataset.m; ov.querySelectorAll('#x40sl [data-m]').forEach(x => x.classList.toggle('on', x === b)); q('#x40rc').textContent = fmtClock(mins * 60); });
  const sounds = on => { if (bv) { bv.stop(1); bv = null; } if (nv) { nv.stop(1); nv = null; } if (on && q('#x40sb').checked) { bv = binaural(200, 40, 0.12); nv = noise('brown', 0.12, 'lowpass', 700); } };
  const stop = () => { clearInterval(T); sounds(false); keepAwake(false); phase = 'idle'; };
  const tick = () => {
    const left = (end - Date.now()) / 1000, tot = (phase === 'focus' ? mins : 5) * 60;
    q('#x40rc').textContent = fmtClock(left); rp.style.strokeDashoffset = C * (1 - Math.max(0, left) / tot);
    if (left > 0) return;
    chime(false); buzz([30, 80, 30]);
    if (phase === 'focus') { const L = LSG('sprints', {}); L[today] = (L[today] || 0) + 1; const ks = Object.keys(L).sort(); while (ks.length > 120) delete L[ks.shift()]; LSS('sprints', L); phase = 'break'; end = Date.now() + 5 * 60000; sounds(false); q('#x40rs').textContent = 'break · stand up, look far away'; q('#x40sg').textContent = 'skip break'; }
    else { phase = 'idle'; clearInterval(T); keepAwake(false); q('#x40rs').textContent = 'sprint done ✓'; q('#x40sg').textContent = 'another sprint'; q('#x40rc').textContent = fmtClock(mins * 60); rp.style.strokeDashoffset = 0; }
  };
  q('#x40sg').onclick = e => {
    if (phase === 'focus') { stop(); e.target.textContent = 'start sprint'; q('#x40rs').textContent = 'stopped'; q('#x40rc').textContent = fmtClock(mins * 60); rp.style.strokeDashoffset = 0; return; }
    phase = 'focus'; end = Date.now() + mins * 60000; sounds(true); keepAwake(true); q('#x40rs').textContent = 'focus'; e.target.textContent = 'stop'; clearInterval(T); T = setInterval(tick, 250); tick();
  };
  A.onClose(stop);
}

/* ---------- 19 · audio breathwork pacer: 4-7-8, the sound swells and settles with you ---------- */
function breath478() {
  stopAll();
  const ov = A.x8open('breath', `<div class="x40-orb-wrap"><div class="x40-orb" id="x40o"></div></div><p class="x40-say" id="x40bs">get comfortable</p><p class="x40-lab" style="text-align:center" id="x40bn">4 in · 7 hold · 8 out</p>
    <div class="x8-seg" id="x40br"><button class="on" data-r="4">4 rounds</button><button data-r="8">8 rounds</button></div>
    <button class="x6-blendbtn" id="x40bg">begin</button>${fine('in through your nose for 4, hold for 7, out slowly through your mouth for 8. the sound opens as you breathe in, waits, and settles as you breathe out, so you can do it with your eyes closed. if you feel light-headed, stop and breathe normally.')}${A.XHELP}`);
  let rounds = 4, T = 0, v = null, run = false;
  ov.querySelectorAll('#x40br [data-r]').forEach(b => b.onclick = () => { rounds = +b.dataset.r; ov.querySelectorAll('#x40br [data-r]').forEach(x => x.classList.toggle('on', x === b)); });
  const orb = ov.querySelector('#x40o'), say = ov.querySelector('#x40bs'), n = ov.querySelector('#x40bn');
  const end = msg => { run = false; clearTimeout(T); if (v) { v.stop(1.2); v = null; } orb.style.transition = 'transform 2s ease'; orb.style.transform = 'scale(.5)'; say.textContent = msg; ov.querySelector('#x40bg').textContent = 'again'; };
  ov.querySelector('#x40bg').onclick = e => {
    if (run) return end('stopped');
    run = true; e.target.textContent = 'stop'; v = noise('pink', 0.05, 'lowpass', 300, 0.5); let r = 0;
    const set = (g, f, sec) => { if (!v) return; const t = AC.currentTime; v.g.gain.cancelScheduledValues(t); v.f.frequency.cancelScheduledValues(t); v.g.gain.setValueAtTime(Math.max(0.0001, v.g.gain.value), t); v.f.frequency.setValueAtTime(v.f.frequency.value, t); v.g.gain.linearRampToValueAtTime(g, t + sec); v.f.frequency.exponentialRampToValueAtTime(f, t + sec); };
    const cycle = () => {
      if (!run) return; if (r >= rounds) { const L = LSG('breath', []); L.push({ t: Date.now(), r: rounds }); LSS('breath', L.slice(-200)); return end(`${rounds} rounds done. notice how you feel.`); }
      r++; n.textContent = `round ${r} of ${rounds}`;
      say.textContent = 'breathe in · 4'; orb.style.transition = 'transform 4s ease-in-out'; orb.style.transform = 'scale(1)'; set(0.3, 1800, 4); buzz(15);
      T = setTimeout(() => { if (!run) return; say.textContent = 'hold · 7'; buzz(10);
        T = setTimeout(() => { if (!run) return; say.textContent = 'breathe out · 8'; orb.style.transition = 'transform 8s ease-in-out'; orb.style.transform = 'scale(.5)'; set(0.05, 300, 8); buzz(15);
          T = setTimeout(cycle, 8000); }, 7000); }, 4000);
    };
    orb.style.transform = 'scale(.5)'; T = setTimeout(cycle, 600);
  };
  A.onClose(() => { run = false; clearTimeout(T); });
}

/* ---------- 8 · somatic grounding coach (free): 60 seconds, by touch ---------- */
const SOMA = [['press your feet into the floor', 'feel the floor push back. it’s holding you.'], ['press your palms together', 'firmly, for a few seconds. then let go and feel the tingle.'], ['trace each fingertip with your thumb', 'slowly. one, two, three, four. then back.'], ['let your shoulders drop', 'lift them to your ears, hold… and let them fall.'], ['a hand flat on your chest', 'feel the warmth of your hand and the rise and fall under it.'], ['feel the air at your nose', 'cool on the way in, warmer on the way out.']];
function soma() {
  const ov = A.x8open('soma', `${ring3(['1:00', '6 steps · 10 seconds each'])}
    <p class="xg-big x40-step" id="x40st">ready when you are</p><p class="xg-sub" id="x40ss">if you can, sit down. you don’t need to do it perfectly.</p>
    <button class="x6-blendbtn" id="x40sg">start · 60 seconds</button><div id="x40after"></div>${A.XHELP}`);
  const q = s => ov.querySelector(s), rp = q('#x40rp'), C = 2 * Math.PI * 44; rp.style.strokeDasharray = C; rp.style.strokeDashoffset = 0; let T = 0, t0 = 0, k = -1;
  const fin = () => { clearInterval(T); q('#x40st').textContent = 'you’re here.'; q('#x40ss').textContent = 'sixty seconds of coming back to your body.'; q('#x40sg').textContent = 'once more';
    q('#x40after').innerHTML = `<p class="x40-lab" style="text-align:center">how is it now?</p><div class="x8-seg">${['a bit better', 'about the same', 'worse'].map(x => `<button data-f="${x}">${x}</button>`).join('')}</div>`;
    ov.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { const L = LSG('soma', []); L.push({ t: Date.now(), f: b.dataset.f }); LSS('soma', L.slice(-200)); q('#x40after').innerHTML = b.dataset.f === 'worse' ? `<p class="x8-said">thank you for telling me.<span>try the breathing, or reach out to someone. 988 is below, any time.</span></p>` : '<p class="x8-said">noted.<span>it gets easier the more you do it.</span></p>'; }); };
  q('#x40sg').onclick = () => {
    clearInterval(T); t0 = Date.now(); k = -1; q('#x40after').innerHTML = ''; q('#x40sg').textContent = 'restart';
    T = setInterval(() => { const el = (Date.now() - t0) / 1000; if (el >= 60) { rp.style.strokeDashoffset = C; q('#x40rc').textContent = '0:00'; return fin(); }
      const s = Math.floor(el / 10); if (s !== k) { k = s; q('#x40st').textContent = SOMA[s][0]; q('#x40ss').textContent = SOMA[s][1]; q('#x40rs').textContent = `step ${s + 1} of 6`; buzz(25); }
      q('#x40rc').textContent = fmtClock(60 - el); rp.style.strokeDashoffset = C * el / 60; }, 200);
  };
  A.onClose(() => clearInterval(T));
}

/* ---------- 14 · insomnia thought dump (free): the words turn to dust. nothing is kept. ---------- */
function dump() {
  const ov = A.x8open('dump', `<textarea class="x8-ta" id="x40dt" rows="7" placeholder="everything that’s looping. lists, worries, half-thoughts…"></textarea><canvas id="x40dc" class="x40-dust" hidden></canvas>
    <button class="x6-blendbtn" id="x40dg">dissolve it</button><p class="x8-said" id="x40dd" hidden></p>${fine('nothing you type here is saved, synced or sent. it only exists until it’s dust. if one worry keeps coming back, “worry time” can hold it for later.')}`);
  let raf = 0; A.onClose(() => cancelAnimationFrame(raf));
  ov.querySelector('#x40dg').onclick = () => {
    const ta = ov.querySelector('#x40dt'), txt = ta.value.trim(); if (!txt) return A.toast('write what’s looping first');
    const cv = ov.querySelector('#x40dc'), W = ta.clientWidth || 340, H = Math.max(ta.clientHeight, 180), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.hidden = false; ta.value = ''; ta.hidden = true; ov.querySelector('#x40dg').hidden = true; ov.querySelector('#x40dd').hidden = true;
    const x = cv.getContext('2d'); x.scale(dpr, dpr); x.fillStyle = '#f3efe6'; x.font = '18px "Instrument Serif", Georgia, serif'; x.textBaseline = 'top';
    // wrap the words onto the canvas (drawn as pixels, never as html), then sample the pixels into particles
    const words = txt.replace(/\s+/g, ' ').split(' '); let line = '', y = 8; for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > W - 16 && line) { x.fillText(line, 8, y); line = w; y += 24; if (y > H - 24) break; } else line = t; } if (y <= H - 24) x.fillText(line, 8, y);
    const img = x.getImageData(0, 0, cv.width, cv.height).data, P = [], step = Math.round(2 * dpr);
    for (let py = 0; py < cv.height; py += step) for (let px = 0; px < cv.width; px += step) { if (img[(py * cv.width + px) * 4 + 3] > 120) P.push({ x: px / dpr, y: py / dpr, vx: (Math.random() - .5) * .6, vy: -Math.random() * .8 - .2, d: Math.random() * 50, a: 1 }); }
    buzz(20); let f = 0; const calm = calmOn();
    const draw = () => { f++; x.clearRect(0, 0, W, H); let alive = 0;
      for (const p of P) { if (f < p.d) { x.fillStyle = 'rgba(243,239,230,1)'; x.fillRect(p.x, p.y, 1.6, 1.6); alive++; continue; } p.x += p.vx + Math.sin((f + p.d) / 14) * .3; p.y += p.vy; p.vy -= .01; p.a -= calm ? .05 : .008; if (p.a > 0) { alive++; x.fillStyle = `rgba(243,239,230,${p.a.toFixed(3)})`; x.fillRect(p.x, p.y, 1.4, 1.4); } }
      if (alive && f < 600) raf = requestAnimationFrame(draw); else { cv.hidden = true; const dd = ov.querySelector('#x40dd'); dd.hidden = false; dd.innerHTML = 'cleared. your mind doesn’t have to hold it tonight.<span>write more if more comes.</span>'; ta.hidden = false; ov.querySelector('#x40dg').hidden = false; } };
    raf = requestAnimationFrame(draw);
  };
}

/* ---------- 10 · sensory deprivation: the whole screen goes dark, one slow point of light ---------- */
function dark() {
  const ov = A.x8open('dark', `<div class="x8-seg" id="x40dm">${[3, 5, 10, 20].map((m, i) => `<button class="${i === 1 ? 'on' : ''}" data-m="${m}">${m} min</button>`).join('')}</div>
    <label class="x40-check"><input type="checkbox" id="x40dn"> faint brown noise</label><button class="x6-blendbtn" id="x40dg">go dark</button>${fine('the screen turns black except for one point of light that pulses at about six breaths a minute. let your eyes rest on it, and breathe with it if you like. tap once to see the time left and how to leave. ' + awakeNote())}`);
  let mins = 5; ov.querySelectorAll('#x40dm [data-m]').forEach(b => b.onclick = () => { mins = +b.dataset.m; ov.querySelectorAll('#x40dm [data-m]').forEach(x => x.classList.toggle('on', x === b)); });
  ov.querySelector('#x40dg').onclick = () => {
    const n = ov.querySelector('#x40dn').checked; A.x6close(); stopAll();
    const el = document.createElement('div'); el.className = 'x40-void'; el.id = 'x40void'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'dark screen');
    el.innerHTML = `<i class="x40-point${calmOn() ? ' still' : ''}"></i><p class="x40-vt"></p><button class="x40-vx">leave</button>`; document.body.appendChild(el);
    const v = n ? noise('brown', 0.1, 'lowpass', 500) : null; keepAwake(true); let hideT = 0; const t0 = Date.now();
    const close = msg => { clearTimeout(T); keepAwake(false); if (v) v.stop(1.5); el.classList.add('out'); setTimeout(() => el.remove(), 900); if (msg) A.toast(msg + ' · ' + fmtDur((Date.now() - t0) / 60000) + ' in the dark'); try { if (A.X6.wasMuted !== null) { A.engine.setMuted(A.X6.wasMuted); A.X6.wasMuted = null; A.syncSound(); } } catch {} };
    const T = setTimeout(() => close('time’s up'), mins * 60000);
    el.onclick = e => { if (e.target.closest('.x40-vx')) return close('welcome back'); el.classList.add('show'); el.querySelector('.x40-vt').textContent = fmtClock(mins * 60 - (Date.now() - t0) / 1000) + ' left'; clearTimeout(hideT); hideT = setTimeout(() => el.classList.remove('show'), 3000); };
    requestAnimationFrame(() => el.classList.add('on'));
  };
}

/* ---------- shared bed sounds for 3 · 15 ---------- */
function rainV(gain) { const a = noise('pink', gain * 0.8, 'highpass', 500), b = noise('white', gain * 0.35, 'bandpass', 2600, 0.8); if (!a || !b) return null; let on = true, T = 0; const wob = () => { if (!on) return; try { b.g.gain.setTargetAtTime(gain * (0.2 + Math.random() * 0.3), AC.currentTime, 0.3); } catch {} T = setTimeout(wob, 400 + Math.random() * 900); }; wob(); LIVE.delete(a); LIVE.delete(b); const v = { g: a.g, set: g => { gain = g; a.g.gain.setTargetAtTime(g * 0.8, AC.currentTime, 0.4); }, fade: (to, tc) => { a.g.gain.setTargetAtTime(to, AC.currentTime, tc); b.g.gain.setTargetAtTime(to, AC.currentTime, tc); on = to > 0; }, stop: f => { on = false; clearTimeout(T); a.stop(f); b.stop(f); LIVE.delete(v); } }; LIVE.add(v); return v; }
function fanV(gain) { const a = noise('pink', gain, 'lowpass', 650, 0.9); if (!a) return null; const c = AC, lfo = c.createOscillator(), d = c.createGain(); lfo.frequency.value = 0.25; d.gain.value = 60; lfo.connect(d).connect(a.f.frequency); lfo.start(); LIVE.delete(a); const v = { g: a.g, set: g => a.g.gain.setTargetAtTime(g, c.currentTime, 0.4), fade: (to, tc) => a.g.gain.setTargetAtTime(to, c.currentTime, tc), stop: f => { try { lfo.stop(); } catch {} a.stop(f); LIVE.delete(v); } }; LIVE.add(v); return v; }
function bed(kind, gain) { if (kind === 'rain') return rainV(gain); if (kind === 'fan') return fanV(gain); const v = noise(kind, gain, 'lowpass', kind === 'white' ? 9000 : kind === 'pink' ? 5000 : 1200); if (v) v.fade = (to, tc) => v.g.gain.setTargetAtTime(to, AC.currentTime, tc); return v; }

/* ---------- 3 · hypnagogic timer: noise that fades out once you stop moving ---------- */
function drowse() {
  stopAll();
  const ov = A.x8open('drowse', `<p class="x40-lab">sound</p><div class="x8-seg" id="x40hk">${['white', 'pink', 'brown', 'rain'].map((k, i) => `<button class="${i === 1 ? 'on' : ''}" data-k="${k}">${k}</button>`).join('')}</div>
    <p class="x40-lab">fade out after you’ve been still for</p><div class="x8-seg" id="x40hm">${[5, 10, 20].map((m, i) => `<button class="${i === 1 ? 'on' : ''}" data-m="${m}">${m} min</button>`).join('')}</div>
    <div class="x40-card" id="x40hs"><small>put the phone on the bed near you (face down is fine).</small></div>
    <button class="x6-blendbtn" id="x40hg">start</button>${fine('liminal feels the bed move through the phone’s motion sensor (nothing leaves the phone). once it has been still for the time you pick, the sound fades out over about a minute and stops; if you move during the fade, it comes back. without a motion sensor it simply fades after that time. ' + awakeNote())}`);
  let kind = 'pink', mins = 10, v = null, T = 0, FT = 0, still0 = 0, lastA = null, motion = false, fading = false, ended = false;
  const q = s => ov.querySelector(s), st = q('#x40hs');
  const pick = (sel, key, fn) => ov.querySelectorAll(sel + ' [data-' + key + ']').forEach(b => b.onclick = () => { fn(b.dataset[key]); ov.querySelectorAll(sel + ' [data-' + key + ']').forEach(x => x.classList.toggle('on', x === b)); });
  pick('#x40hk', 'k', k => { kind = k; if (v) { v.stop(.5); v = bed(kind, 0.32); } }); pick('#x40hm', 'm', m => { mins = +m; still0 = Date.now(); });
  const unfade = () => { fading = false; clearTimeout(FT); if (v) v.fade(0.32, 2); };
  const onMove = e => { const g = e.accelerationIncludingGravity || e.acceleration; if (!g || g.x == null) return; motion = true; const a = [g.x, g.y, g.z]; if (lastA) { const d = Math.hypot(a[0] - lastA[0], a[1] - lastA[1], a[2] - lastA[2]); if (d > 0.35) { still0 = Date.now(); if (fading && !ended) unfade(); } } lastA = a; };
  const stop = () => { clearInterval(T); clearTimeout(FT); removeEventListener('devicemotion', onMove); keepAwake(false); if (v) { v.stop(1); v = null; } };
  q('#x40hg').onclick = async e => {
    if (v) { stop(); e.target.textContent = 'start'; st.innerHTML = '<small>stopped.</small>'; return; }
    try { if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') { const r = await DeviceMotionEvent.requestPermission(); if (r !== 'granted') throw 0; } if (window.DeviceMotionEvent) addEventListener('devicemotion', onMove); } catch {}
    v = bed(kind, 0.32); if (!v) return A.toast('sound isn’t available in this browser'); ended = false; fading = false; still0 = Date.now(); keepAwake(true); e.target.textContent = 'stop';
    clearInterval(T); T = setInterval(() => {
      if (!v) return; const still = (Date.now() - still0) / 60000;
      if (!fading && still >= mins) { fading = true; v.fade(0, 15); FT = setTimeout(() => { if (fading && v) { ended = true; stop(); q('#x40hg').textContent = 'start'; st.innerHTML = '<b>faded out</b><small>sleep well.</small>'; } }, 60000); }
      if (!ended) st.innerHTML = motion ? `<b>${fading ? 'fading out…' : still < 0.2 ? 'movement felt' : 'still for ' + fmtDur(still)}</b><small>fades after ${mins} min of stillness</small>` : `<b>${fading ? 'fading out…' : fmtClock((mins - still) * 60) + ' until it fades'}</b><small>no motion sensor here, so it runs on a timer</small>`;
    }, 1000);
  };
  A.onClose(stop);
}

/* ---------- 13 · micro-nap optimizer: a short nap that ends on a bright chime ---------- */
function nap() {
  stopAll();
  const ov = A.x8open('nap', `${ring3(['20:00', 'lie back'])}
    <div class="x8-seg" id="x40nm"><button data-m="10">10 min</button><button class="on" data-m="20">20 min</button><button data-m="26">26 min</button></div>
    <label class="x40-check"><input type="checkbox" id="x40nn" checked> soft brown noise while you drift</label>
    <button class="x6-blendbtn" id="x40ng">start nap</button>${fine('10–20 minutes keeps you out of deep sleep, so you wake up sharper instead of groggy (26 is the famous “nasa nap”). the noise fades away in the last minute, then a bright chime rings three times. ' + awakeNote() + ' your phone’s own alarm is a good backup.')}`);
  let mins = 20, T = 0, end = 0, v = null, ring = 0;
  const q = s => ov.querySelector(s), rp = q('#x40rp'), C = 2 * Math.PI * 44; rp.style.strokeDasharray = C; rp.style.strokeDashoffset = 0;
  ov.querySelectorAll('#x40nm [data-m]').forEach(b => b.onclick = () => { if (end) return; mins = +b.dataset.m; ov.querySelectorAll('#x40nm [data-m]').forEach(x => x.classList.toggle('on', x === b)); q('#x40rc').textContent = fmtClock(mins * 60); });
  const stop = () => { clearInterval(T); clearInterval(ring); end = 0; keepAwake(false); if (v) { v.stop(.5); v = null; } };
  q('#x40ng').onclick = e => {
    if (end) { stop(); e.target.textContent = 'start nap'; q('#x40rs').textContent = 'stopped'; q('#x40rc').textContent = fmtClock(mins * 60); rp.style.strokeDashoffset = 0; return; }
    clearInterval(ring); ac(); end = Date.now() + mins * 60000; keepAwake(true); if (q('#x40nn').checked) v = noise('brown', 0.2, 'lowpass', 600); e.target.textContent = 'cancel'; q('#x40rs').textContent = 'resting';
    T = setInterval(() => { const left = (end - Date.now()) / 1000; q('#x40rc').textContent = fmtClock(left); rp.style.strokeDashoffset = C * (1 - Math.max(0, left) / (mins * 60));
      if (v && left < 60) { v.stop(12); v = null; }
      if (left <= 0) { clearInterval(T); let n = 0; const ding = () => { chime(true); buzz([200, 100, 200]); if (++n >= 3) clearInterval(ring); }; ding(); ring = setInterval(ding, 1800); end = 0; keepAwake(false); q('#x40rs').textContent = 'up you get ☀'; e.target.textContent = 'nap again'; const L = LSG('naps', []); L.push({ t: Date.now(), m: mins }); LSS('naps', L.slice(-200)); } }, 250);
  };
  A.onClose(stop);
}

/* ---------- 6 · phased wake: the screen dawns and the sound rises over the last 30 minutes ---------- */
function wake() {
  stopAll(); const p = LSG('wake', { at: '07:00' });
  const ov = A.x8open('wake', `<p class="x40-lab">wake me at</p><input type="time" class="x8-in" id="x40wt" value="${esc(p.at)}">
    <button class="x6-blendbtn" id="x40wg">start nightstand mode</button><button class="ghost x40-mini" id="x40wp">preview: the 30 minutes in 30 seconds</button>
    ${fine('from 30 minutes before, the black screen slowly turns deep red, then amber, then warm daylight, and a soft sound swells underneath. at your time a gentle chime repeats until you tap. this only works while liminal stays open on the nightstand with the screen on (plugged in), so keep your phone’s own alarm set too.')}`);
  ov.querySelector('#x40wt').onchange = e => LSS('wake', { at: e.target.value || '07:00' });
  const run = preview => {
    const at = timeToMin(ov.querySelector('#x40wt').value) ?? 420; LSS('wake', { at: minToTime(at) });
    let target; if (preview) target = Date.now() + 30000; else { const d = new Date(); d.setHours(Math.floor(at / 60), at % 60, 0, 0); if (d <= Date.now()) d.setDate(d.getDate() + 1); target = d.getTime(); }
    const span = preview ? 30000 : 30 * 60000; A.x6close(); stopAll(); keepAwake(true);
    const el = document.createElement('div'); el.className = 'x40-dawn'; el.id = 'x40dawn'; el.setAttribute('role', 'dialog'); el.innerHTML = `<p class="x40-dt" id="x40dclk"></p><p class="x40-ds" id="x40dsub"></p><button class="x40-vx" id="x40dx">${preview ? 'end preview' : 'cancel alarm'}</button>`; document.body.appendChild(el);
    let v = null, pad = null, ring = 0, rung = false;
    const stops = [[0, [0, 0, 0]], [0.3, [60, 6, 10]], [0.55, [150, 40, 20]], [0.8, [255, 140, 60]], [1, [255, 226, 180]]];
    const col = k => { let i = 0; while (i < stops.length - 2 && k > stops[i + 1][0]) i++; const [a, ca] = stops[i], [b, cb] = stops[i + 1], f = Math.min(1, Math.max(0, (k - a) / (b - a))); return ca.map((x, j) => Math.round(x + (cb[j] - x) * f)); };
    const T = setInterval(() => {
      const left = target - Date.now(), k = Math.min(1, Math.max(0, 1 - left / span));
      const [r, g, b] = col(k); el.style.background = `radial-gradient(120% 80% at 50% 100%, rgb(${r},${g},${b}), rgb(${Math.round(r * .55)},${Math.round(g * .45)},${Math.round(b * .5)}))`;
      el.querySelector('#x40dclk').textContent = fmtT(Date.now()); el.querySelector('#x40dsub').textContent = left > span ? 'sleeping · dawn starts ' + fmtT(target - span) : left > 0 ? 'dawn · alarm ' + fmtT(target) : 'good morning';
      el.classList.toggle('lit', k > .6);
      if (k > 0 && !v) { v = noise('pink', 0.0001, 'lowpass', 400); pad = binaural(196, 0, 0.0001); }
      if (v && left > 0) { v.g.gain.setTargetAtTime(0.02 + 0.22 * k, AC.currentTime, 1); v.f.frequency.setTargetAtTime(400 + 2400 * k, AC.currentTime, 1); pad.g.gain.setTargetAtTime(0.08 * k, AC.currentTime, 1); }
      if (left <= 0 && !rung) { rung = true; const ding = () => { chime(false); chime(false, 0.5); buzz(300); }; ding(); ring = setInterval(ding, 4000); el.querySelector('#x40dx').textContent = 'i’m up'; }
    }, preview ? 200 : 1000);
    el.querySelector('#x40dx').onclick = () => { clearInterval(T); clearInterval(ring); if (v) v.stop(1); if (pad) pad.stop(1); keepAwake(false); el.classList.add('out'); setTimeout(() => el.remove(), 800); try { if (A.X6.wasMuted !== null) { A.engine.setMuted(A.X6.wasMuted); A.X6.wasMuted = null; A.syncSound(); } } catch {} };
    requestAnimationFrame(() => el.classList.add('on'));
  };
  ov.querySelector('#x40wg').onclick = () => run(false); ov.querySelector('#x40wp').onclick = () => run(true);
}

/* ---------- 5 · ambient room resonance: listen to the room, tune the masking noise to it ---------- */
const BANDS = [[63, 'a low rumble (traffic, hvac, fridge)'], [125, 'a low hum (appliances, engines)'], [250, 'a mid hum (voices through walls, fans)'], [500, 'mid-range noise (voices, tv)'], [1000, 'speech-range noise'], [2000, 'hiss (electronics, air vents)'], [4000, 'high hiss']];
function room() {
  stopAll(); const last = LSG('room', null);
  const ov = A.x8open('room', `<div class="x40-card" id="x40rm">${last ? `<b>last time: ${esc(last.label)}</b><small>${fmtD(last.t)} · loudest around ${+last.f} Hz · ${+last.db} dB (relative)</small>` : '<small>stay quiet for 6 seconds while liminal listens to the room.</small>'}</div>
    <canvas id="x40rcv" class="x40-spec" width="680" height="220"></canvas>
    <button class="x6-blendbtn" id="x40rl">listen to the room</button><button class="ghost x40-mini" id="x40rpl"${last ? '' : ' hidden'}>▶ play tuned masking noise</button>
    ${fine('the mic listens for 6 seconds and switches off straight after. nothing is recorded or saved except the result (the loudest band and level). levels are relative to your phone’s mic, not a calibrated meter.')}`);
  let mask = null; const cv = ov.querySelector('#x40rcv'), x = cv.getContext('2d');
  const drawSpec = (arr, sr, peak) => { x.clearRect(0, 0, 680, 220); const N = arr.length, ny = sr / 2; x.strokeStyle = 'rgba(243,239,230,.85)'; x.lineWidth = 2; x.beginPath();
    for (let px = 0; px < 680; px++) { const f = 40 * Math.pow(8000 / 40, px / 680), i = Math.min(N - 1, Math.round(f / ny * N)), db = isFinite(arr[i]) ? arr[i] : -140, y = 220 - Math.max(0, Math.min(220, (db + 110) * 2.6)); px ? x.lineTo(px, y) : x.moveTo(px, y); } x.stroke();
    if (peak) { const px = Math.log(peak / 40) / Math.log(8000 / 40) * 680; x.fillStyle = 'rgba(255,212,138,.9)'; x.fillRect(px - 1, 0, 2, 220); }
    x.fillStyle = 'rgba(243,239,230,.5)'; x.font = '18px sans-serif'; [100, 1000, 4000].forEach(f => x.fillText(f >= 1000 ? f / 1000 + 'k' : f, Math.log(f / 40) / Math.log(8000 / 40) * 680 + 4, 212)); };
  const play = r => { const b = ov.querySelector('#x40rpl'); if (mask) { mask.stop(); mask = null; b.textContent = '▶ play tuned masking noise'; return; } if (!r) return; mask = noise('pink', 0.3, 'peaking', r.f, 0.9); if (!mask) return; mask.f.gain.value = 9; b.textContent = '■ stop masking noise'; };
  ov.querySelector('#x40rpl').onclick = () => play(LSG('room', null));
  let T = 0, mic = null;
  ov.querySelector('#x40rl').onclick = async e => {
    if (mask) play(null);
    try { mic = await micOpen(); } catch (er) { ov.querySelector('#x40rm').innerHTML = `<small>${micErr(er)}</small>`; return; }
    e.target.disabled = true; e.target.textContent = 'listening… stay quiet'; const sum = new Float32Array(mic.an.frequencyBinCount); let n = 0, lv = 0; const t0 = Date.now();
    clearInterval(T); T = setInterval(() => { const s = mic.spectrum(); for (let i = 0; i < s.length; i++) sum[i] += isFinite(s[i]) ? s[i] : -140; n++; lv += mic.level(); drawSpec(s, mic.c.sampleRate);
      if (Date.now() - t0 < 6000) return; clearInterval(T); const sr = mic.c.sampleRate; mic.close(); mic = null;
      const avg = sum.map(v => v / n), ny = sr / 2, N = avg.length;
      // energy per octave band, tilted +3 dB/octave (pink) so a room's natural low-end falloff doesn't always win
      const bandDb = BANDS.map(([fc], k) => { const lo = fc / Math.SQRT2, hi = fc * Math.SQRT2; let e2 = 0, c = 0; for (let i = Math.floor(lo / ny * N); i <= Math.ceil(hi / ny * N) && i < N; i++) { e2 += Math.pow(10, avg[i] / 10); c++; } return 10 * Math.log10(e2 / Math.max(1, c) + 1e-14) + 3 * k; });
      const k = bandDb.indexOf(Math.max(...bandDb)), r = { t: Date.now(), f: BANDS[k][0], label: BANDS[k][1], db: Math.round(lv / n) };
      LSS('room', r); drawSpec(avg, sr, r.f);
      ov.querySelector('#x40rm').innerHTML = `<b>your room: ${esc(r.label)}</b><small>loudest around ${r.f} Hz · ${r.db} dB (relative) · masking noise tuned to cover it</small>`;
      e.target.disabled = false; e.target.textContent = 'listen again'; ov.querySelector('#x40rpl').hidden = false;
    }, 120);
  };
  A.onClose(() => { clearInterval(T); if (mic) mic.close(); if (mask) mask.stop(); });
}

/* ---------- 15 · white noise morpher: rain + fan + brown, leaning in when the room gets loud ---------- */
function morph() {
  stopAll(); const p = LSG('morph', { rain: 0.5, fan: 0.3, brown: 0.5, react: true });
  const sl = (k, l) => `<p class="x40-lab">${l}</p><input type="range" class="x40-range" data-mix="${k}" min="0" max="1" step="0.02" value="${+p[k]}">`;
  const ov = A.x8open('morph', `${sl('rain', 'rainfall')}${sl('fan', 'fan')}${sl('brown', 'brown noise')}
    <label class="x40-check"><input type="checkbox" id="x40mr"${p.react ? ' checked' : ''}> react to noise spikes (uses the mic while playing)</label>
    <div class="x40-meter"><i id="x40mm"></i></div><p class="x40-lab" id="x40ms">&nbsp;</p>
    <button class="x6-blendbtn" id="x40mg">play</button>${fine('when a sudden sound jumps above the room’s usual level (a door, a dog, a car), the mix swells toward the deeper brown and rain layers to cover it, then eases back. the mic is only on while this plays, and nothing is recorded.')}`);
  let V = null, mic = null, T = 0, base = null, boost = 0;
  const q = s => ov.querySelector(s);
  const level = () => ({ rain: +q('[data-mix=rain]').value, fan: +q('[data-mix=fan]').value, brown: +q('[data-mix=brown]').value });
  const apply = () => { if (!V) return; const L = level(), b = boost; V.rain.set(0.35 * Math.min(1, L.rain + b * 0.5)); V.fan.set(0.3 * L.fan); V.brown.g.gain.setTargetAtTime(0.4 * Math.min(1, L.brown + b * 0.8), AC.currentTime, b ? 0.15 : 1.5); };
  ov.querySelectorAll('[data-mix]').forEach(i => i.oninput = () => { LSS('morph', { ...level(), react: q('#x40mr').checked }); apply(); });
  const stop = () => { clearInterval(T); if (mic) { mic.close(); mic = null; } if (V) { V.rain.stop(.5); V.fan.stop(.5); V.brown.stop(.5); V = null; } };
  q('#x40mr').onchange = e => LSS('morph', { ...level(), react: e.target.checked });
  q('#x40mg').onclick = async e => {
    if (V) { stop(); e.target.textContent = 'play'; q('#x40ms').innerHTML = '&nbsp;'; q('#x40mm').style.width = '0'; return; }
    const L = level(); V = { rain: rainV(0.35 * L.rain), fan: fanV(0.3 * L.fan), brown: noise('brown', 0.4 * L.brown, 'lowpass', 900) };
    if (!V.rain || !V.fan || !V.brown) { stop(); return A.toast('sound isn’t available in this browser'); } e.target.textContent = 'stop';
    if (!q('#x40mr').checked) return;
    try { mic = await micOpen(); } catch (er) { q('#x40ms').textContent = micErr(er); return; }
    if (!V) { mic.close(); mic = null; return; } base = null;
    T = setInterval(() => { const db = mic.level(); base = base == null ? db : base + (db - base) * (db > base ? 0.01 : 0.05); const over = db - base;
      if (over > 8) boost = Math.min(1, boost + 0.25); else boost = Math.max(0, boost - 0.01); apply();
      q('#x40mm').style.width = Math.max(0, Math.min(100, (db + 90) * 1.4)) + '%'; q('#x40ms').textContent = boost > 0.05 ? 'spike heard · covering it' : 'listening for spikes'; }, 150);
  };
  A.onClose(stop);
}

/* ---------- the night log: one entry per night, feeding 4 · 9 · 16 ---------- */
const nights = () => LSG('nights', []).filter(n => n && isFinite(n.bed) && isFinite(n.wake)).sort((a, b) => b.bed - a.bed);
const slept = n => Math.max(0, (n.wake - n.bed) / 60000 - (n.lat || 0));
const hm = t => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes(); };
const QW = ['', 'awful', 'meh', 'okay', 'good', 'great'];
function logNight(back) {
  const L = nights(), lastN = L[0], def = lastN ? [minToTime(hm(lastN.bed)), minToTime(hm(lastN.wake))] : ['23:00', '07:00'];
  const seg = (id, opts, on) => `<div class="x8-seg" id="${id}">${opts.map(([l, v], i) => `<button class="${i === on ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const ov = A.x8open('nights', `<div class="x40-two"><label>went to bed<input type="time" class="x8-in" id="x40nb" value="${def[0]}"></label><label>woke up<input type="time" class="x8-in" id="x40nw" value="${def[1]}"></label></div>
    <p class="x40-lab">took about this long to fall asleep</p>${seg('x40nl', [['5 min', 5], ['15 min', 15], ['30 min', 30], ['1h+', 60]], 1)}
    <p class="x40-lab">how rested do you feel?</p>${seg('x40nq', [1, 2, 3, 4, 5].map(i => [QW[i], i]), 2)}
    <p class="x40-lab">last screen before sleep</p>${seg('x40ns', [['in bed', 0], ['<30 min', 20], ['30–60', 45], ['1h+', 90]], 0)}
    <p class="x40-lab">evening light</p>${seg('x40ne', [['bright / overhead', 'bright'], ['dim / warm', 'dim']], 0)}
    <button class="x6-blendbtn" id="x40nsave">save last night</button>
    ${L.length ? `<p class="x6-k" style="margin-top:18px">logged · ${L.length}</p>${L.slice(0, 7).map(n => `<div class="x40-li"><span><b>${fmtD(n.bed)}</b><small>${fmtT(n.bed)} → ${fmtT(n.wake)} · ${fmtDur(slept(n))} asleep · ${QW[n.q] || ''}</small></span><button class="x40-del" data-del="${esc(n.id)}" aria-label="delete this night">×</button></div>`).join('')}` : ''}
    ${fine('kept on this phone only, never synced. one entry per night (saving the same night again replaces it). wakeups you tap in the awakening log are added to the night automatically.')}`);
  const val = id => ((ov.querySelector(id + ' .on') || {}).dataset || {}).v;
  ov.querySelectorAll('.x8-seg').forEach(sg => sg.querySelectorAll('button').forEach(b => b.onclick = () => sg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b))));
  ov.querySelector('#x40nsave').onclick = () => {
    const bm = timeToMin(ov.querySelector('#x40nb').value), wm = timeToMin(ov.querySelector('#x40nw').value); if (bm == null || wm == null) return A.toast('pick both times');
    const w = new Date(); w.setHours(Math.floor(wm / 60), wm % 60, 0, 0); if (w > Date.now() + 36e5) w.setDate(w.getDate() - 1);
    const b = new Date(w); b.setHours(Math.floor(bm / 60), bm % 60, 0, 0); if (b >= w) b.setDate(b.getDate() - 1);
    if (w - b > 16 * 36e5) return A.toast('that’s over 16 hours · check the times');
    const n = { id: nid(), bed: b.getTime(), wake: w.getTime(), lat: +val('#x40nl') || 0, q: +val('#x40nq') || 3, scr: +val('#x40ns') || 0, light: val('#x40ne') === 'dim' ? 'dim' : 'bright' };
    const key = nightKey(n.bed); LSS('nights', [...LSG('nights', []).filter(x => nightKey(x.bed) !== key), n].sort((a, c) => a.bed - c.bed).slice(-400));
    A.toast('saved · ' + fmtDur(slept(n)) + ' asleep'); typeof back === 'function' ? back() : logNight();
  };
  ov.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { LSS('nights', LSG('nights', []).filter(x => x.id !== b.dataset.del)); logNight(back); });
}
const needNights = n => `<p class="x8-said">log ${n} more night${n === 1 ? '' : 's'} first.<span>it takes ten seconds each morning: bedtime, wake time, how rested you feel.</span></p><button class="x6-blendbtn" data-go="nights">log last night</button>`;
function bindGo(ov, back) { ov.querySelectorAll('[data-go]').forEach(b => b.onclick = () => b.dataset.go === 'nights' ? logNight(back) : A.x8go(b.dataset.go)); }

/* ---------- 9 · sleep architecture visualizer: an estimated hypnogram for a logged night ---------- */
// a model of a typical night, not a measurement: ~90-minute cycles, deep sleep front-loaded, REM growing toward morning.
function hypnogram(n) {
  const segs = [], start = n.bed + (n.lat || 0) * 60000, end = n.wake, tot = (end - start) / 60000; if (tot <= 0) return segs;
  let t = 0, c = 0; const push = (st, m) => { if (m <= 0 || t >= tot) return; m = Math.min(m, tot - t); segs.push({ st, a: start + t * 60000, m }); t += m; };
  while (t < tot) {
    const cyc = c === 0 ? 85 : 95, deep = [32, 22, 10, 4, 0][Math.min(c, 4)], rem = [8, 16, 24, 30, 35][Math.min(c, 4)], light = cyc - deep - rem;
    push('light', light * 0.6); push('deep', deep); push('light', light * 0.4); push('rem', rem); c++;
  }
  // wakeups tapped in the awakening log become short awake blocks laid over the estimate
  wakeupsFor(n).forEach(w => { if (w.t > start && w.t < end) segs.push({ st: 'wake', a: w.t, m: 8 }); });
  return segs;
}
const STG = { wake: [0, '#ffd48a', 'awake'], rem: [1, '#b9a8ff', 'rem'], light: [2, '#7fb4ff', 'light'], deep: [3, '#3d5bd9', 'deep'] };
function arch(idx) {
  const L = nights(); if (!L.length) { const ov = A.x8open('arch', needNights(1)); bindGo(ov, () => arch()); return; }
  idx = Math.min(idx || 0, L.length - 1); const n = L[idx], segs = hypnogram(n), tt = { light: 0, deep: 0, rem: 0, wake: 0 }; segs.forEach(s => tt[s.st] += s.m);
  const sum = tt.light + tt.deep + tt.rem || 1, hrs = slept(n) / 60;
  const ov = A.x8open('arch', `<div class="x8-seg" id="x40an">${L.slice(0, 5).map((x, i) => `<button class="${i === idx ? 'on' : ''}" data-i="${i}">${new Date(x.bed).toLocaleDateString([], { weekday: 'short' }).toLowerCase()}</button>`).join('')}</div>
    <p class="x40-lab">${fmtD(n.bed)} · ${fmtT(n.bed)} → ${fmtT(n.wake)} · ${fmtDur(slept(n))} asleep</p><canvas id="x40hc" class="x40-hyp" width="680" height="300"></canvas>
    <div class="x8-leg">${['deep', 'light', 'rem', 'wake'].map(k => `<span><i style="background:${STG[k][1]}"></i>${STG[k][2]} ${k === 'wake' ? (tt.wake ? fmtDur(tt.wake) : '–') : Math.round(tt[k] / sum * 100) + '%'}</span>`).join('')}</div>
    <div class="x40-card"><small>${hrs < 6 ? 'a short night: deep sleep comes first, so you probably still got most of it. the late-night REM (the dreaming stage) is what got cut.' : hrs < 7.5 ? 'under 7½ hours: most of what got cut is REM from the last cycle, the long dreaming one.' : 'a full night: about five cycles, deep sleep early, long REM toward morning.'}</small></div>
    <button class="ghost x40-mini" data-go="nights">log another night</button>
    ${fine('this is an <b>estimate</b> from your bedtime, wake time and tapped wakeups, laid over a typical night (about 90-minute cycles). liminal can’t measure your sleep stages; only a sleep lab or a sleep tracker can.')}`);
  ov.querySelectorAll('#x40an [data-i]').forEach(b => b.onclick = () => arch(+b.dataset.i)); bindGo(ov, () => arch());
  const cv = ov.querySelector('#x40hc'), x = cv.getContext('2d'), W = 680, H = 300, top = 26, rowH = 60, t0 = n.bed, span = n.wake - n.bed;
  const X = t => 80 + (t - t0) / span * (W - 90);
  x.font = '18px sans-serif'; x.fillStyle = 'rgba(243,239,230,.55)'; ['awake', 'rem', 'light', 'deep'].forEach((l, i) => x.fillText(l, 0, top + i * rowH + 6));
  x.strokeStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(80, top + i * rowH); x.lineTo(W, top + i * rowH); x.stroke(); }
  x.fillStyle = STG.wake[1]; x.globalAlpha = .7; x.fillRect(80, top - 7, Math.max(2, X(t0 + (n.lat || 0) * 60000) - 80), 14); x.globalAlpha = 1;
  segs.forEach(s => { const y = top + STG[s.st][0] * rowH; x.fillStyle = STG[s.st][1]; x.fillRect(X(s.a), y - 8, Math.max(2, X(s.a + s.m * 60000) - X(s.a)), 16); });
  x.fillStyle = 'rgba(243,239,230,.55)'; for (let h = Math.ceil(t0 / 36e5) * 36e5; h < n.wake - 18e5; h += 2 * 36e5) x.fillText(fmtT(h), Math.min(W - 60, X(h) - 18), H - 8);
}

/* ---------- 4 · circadian drift: when you sleep, and how screens + light line up with how rested you feel ---------- */
function circ() {
  const L = nights(); if (L.length < 3) { const ov = A.x8open('circ', needNights(3 - L.length)); bindGo(ov, () => circ()); return; }
  const last = L.slice(0, 14).reverse(), mid = n => { const m = hm(n.bed); return (m < 720 ? m + 1440 : m) + (n.wake - n.bed) / 120000; };
  const avg = a => a.reduce((s, v) => s + v, 0) / (a.length || 1), grp = f => { const g = L.filter(f); return g.length ? avg(g.map(n => n.q)) : null; };
  const inBed = grp(n => n.scr <= 20), offEarly = grp(n => n.scr >= 45), bright = grp(n => n.light === 'bright'), dim = grp(n => n.light === 'dim');
  const h1 = last.slice(0, Math.ceil(last.length / 2)), h2 = last.slice(Math.ceil(last.length / 2)), drift = Math.round(avg(h2.map(mid)) - avg(h1.map(mid)));
  const mids = last.map(mid), mu = avg(mids), sd = Math.round(Math.sqrt(avg(mids.map(m => (m - mu) * (m - mu)))));
  const cmp = (a, b, la, lb) => a == null || b == null ? `log some nights of each (${la} and ${lb}) to compare` : Math.abs(a - b) < 0.3 ? `about the same rest either way (${a.toFixed(1)} vs ${b.toFixed(1)} out of 5)` : `${a > b ? la : lb} nights feel more rested: ${Math.max(a, b).toFixed(1)} vs ${Math.min(a, b).toFixed(1)} out of 5`;
  const ov = A.x8open('circ', `<canvas id="x40cc" class="x40-hyp" width="680" height="360"></canvas><div class="x8-leg"><span><i style="background:#ffd48a"></i>screen in the last 30 min</span><span><i style="background:#7fb4ff"></i>screens off earlier</span><span>brighter = more rested</span></div>
    <div class="x40-card"><b>${Math.abs(drift) < 20 ? 'your sleep time is steady' : drift > 0 ? 'drifting later by about ' + fmtDur(drift) : 'drifting earlier by about ' + fmtDur(-drift)}</b><small>the middle of your sleep moves about ±${fmtDur(sd)} night to night${sd > 60 ? '. over an hour: a steadier bedtime usually helps more than anything else.' : ''}</small></div>
    <div class="x40-card"><b>screens</b><small>${cmp(offEarly, inBed, 'screens-off-early', 'screen-in-bed')}</small></div>
    <div class="x40-card"><b>evening light</b><small>${cmp(dim, bright, 'dim-light', 'bright-light')}</small></div>
    <button class="ghost x40-mini" data-go="nights">log last night</button>
    ${fine('“blue-light exposure” here is what you log (screen time before bed, how bright your evening was); liminal can’t read your screen time or a light sensor. patterns get clearer after a couple of weeks.')}`);
  bindGo(ov, () => circ());
  const cv = ov.querySelector('#x40cc'), x = cv.getContext('2d'), W = 680, H = 360, lo = 19 * 60, hi = 35 * 60, Y = m => 16 + (m - lo) / (hi - lo) * (H - 46), bw = (W - 70) / last.length;
  x.font = '17px sans-serif'; [20, 24, 28, 32].forEach(h => { x.fillStyle = 'rgba(243,239,230,.5)'; x.fillText(minLabel(h * 60), 0, Y(h * 60) + 5); x.strokeStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.moveTo(66, Y(h * 60)); x.lineTo(W, Y(h * 60)); x.stroke(); });
  last.forEach((n, i) => { const bm = hm(n.bed), s = bm < 720 ? bm + 1440 : bm, e = s + (n.wake - n.bed) / 60000; x.globalAlpha = 0.3 + 0.14 * (n.q || 3); x.fillStyle = n.scr <= 20 ? '#ffd48a' : '#7fb4ff'; const y1 = Y(Math.max(lo, s)), y2 = Y(Math.min(hi, e)); x.fillRect(70 + i * bw + bw * .18, y1, bw * .64, Math.max(3, y2 - y1)); });
  x.globalAlpha = 1; x.fillStyle = 'rgba(243,239,230,.5)'; last.forEach((n, i) => { if (last.length <= 7 || i % 2 === 0) x.fillText(new Date(n.bed).toLocaleDateString([], { weekday: 'narrow' }), 70 + i * bw + bw / 2 - 5, H - 6); });
}

/* ---------- 16 · sleep debt payback planner ---------- */
function debt() {
  const p = LSG('debtGoal', 8.5), wk = nights().filter(n => n.wake > Date.now() - 7.5 * 864e5).slice(0, 7);
  const ov = A.x8open('debt', `<p class="x40-lab">your sleep need <b id="x40gv">${+p} h</b></p><input type="range" class="x40-range" id="x40g" min="6.5" max="10" step="0.25" value="${+p}">
    <div id="x40db"></div>${fine('teens usually need 8–10 hours, adults 7–9. debt is counted from the nights you logged in the last 7 days (nights you didn’t log aren’t guessed). the plan pays it back with earlier bedtimes, at most an hour a night, because sleeping in late shifts your body clock and makes the next night harder.')}`);
  const draw = () => {
    const goal = +ov.querySelector('#x40g').value; ov.querySelector('#x40gv').textContent = goal + ' h'; LSS('debtGoal', goal);
    if (!wk.length) { ov.querySelector('#x40db').innerHTML = needNights(1); bindGo(ov, () => debt()); return; }
    const owed = wk.reduce((s, n) => s + Math.max(0, goal * 60 - slept(n)), 0);
    const ws = wk.map(n => hm(n.wake)).sort((a, b) => a - b), wakeM = ws[Math.floor(ws.length / 2)], lat = Math.round(wk.reduce((s, n) => s + (n.lat || 0), 0) / wk.length);
    const baseBed = wakeM - goal * 60 - lat; let left = owed; const days = [];
    for (let i = 0; i < 7; i++) { const pay = Math.min(60, Math.ceil(left / (7 - i) / 5) * 5, Math.max(0, Math.ceil(left / 5) * 5)); left = Math.max(0, left - pay); days.push({ d: Date.now() + i * 864e5, pay, bed: baseBed - pay }); }
    ov.querySelector('#x40db').innerHTML = owed < 15 ? `<div class="x40-card"><b>no real debt</b><small>${wk.length} logged night${wk.length === 1 ? '' : 's'} this week, all close to ${goal} h. keep the same bedtime (about ${minLabel(baseBed)}).</small></div>`
      : `<div class="x40-card"><b>about ${fmtDur(owed)} behind</b><small>over ${wk.length} logged night${wk.length === 1 ? '' : 's'} · usual wake-up ${minLabel(wakeM)} · ${left > 0 ? 'too much to repay in one week at an hour a night; this is week one.' : 'paid back by the end of this plan.'}</small></div>
        <div class="x40-plan">${days.map((x, i) => `<div><b>${i === 0 ? 'tonight' : new Date(x.d).toLocaleDateString([], { weekday: 'short' }).toLowerCase()}</b><span>in bed by ${minLabel(x.bed)}</span><small>${x.pay ? '+' + x.pay + ' min' : 'normal'}</small></div>`).join('')}</div>`;
    bindGo(ov, () => debt());
  };
  ov.querySelector('#x40g').oninput = draw; draw();
}

/* ---------- 2 · dream state log: prompted recall + recurring-symbol heatmap ---------- */
const DQ = ['where were you?', 'who was there?', 'what happened, even in pieces?', 'what’s the one image that stuck?', 'how did it feel?'];
const DSTOP = new Set('a an the and or but so of in on at to from with without for by into onto over under up down out off then than that this these those there here it its i me my mine we us our you your he him his she her they them their was were is are be been am do did done had has have just like really very some any all one two got get went going go came come back still also kind sort thing things something nothing someone everyone was\'nt wasnt dont don\'t didnt didn\'t im i\'m ive i\'ve it\'s its was there\'s theres felt feel feeling dream dreamt dreamed remember think know around about again only even more much little bit lot not no yes maybe'.split(' '));
const dreamWords = d => [...new Set(((d.text || '') + ' ' + (d.ans || []).join(' ')).toLowerCase().match(/[a-z\u00c0-\u024f']{3,}/g) || [])].map(w => w.replace(/'s$/, '').replace(/^'+|'+$/g, '')).filter(w => w.length > 2 && !DSTOP.has(w) && !(A.XSTOP && A.XSTOP.has(w)));
function dreams(view) {
  const D = LSG('dreams', []).slice().sort((a, b) => b.t - a.t);
  if (view === 'map') {
    const cnt = {}; D.forEach(d => dreamWords(d).forEach(w => cnt[w] = (cnt[w] || 0) + 1));
    const top = Object.keys(cnt).filter(w => cnt[w] >= 2).sort((a, b) => cnt[b] - cnt[a] || a.localeCompare(b)).slice(0, 8);
    const wk0 = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d.getTime(); })(), W8 = 8;
    const cell = (w, k) => { const a = wk0 - (W8 - 1 - k) * 7 * 864e5, b = a + 7 * 864e5; return D.filter(d => d.t >= a && d.t < b && dreamWords(d).includes(w)).length; };
    const grid = top.map(w => Array.from({ length: W8 }, (_, k) => cell(w, k))), mx = Math.max(1, ...grid.flat());
    const ov = A.x8open('dream', `<div class="x8-seg"><button data-v="log">write</button><button class="on" data-v="map">symbols</button></div>
      ${top.length ? `<p class="x40-lab">recurring symbols · last 8 weeks</p><div class="x40-heat">${top.map((w, r) => `<b>${esc(w)}</b>${grid[r].map(c => `<i style="opacity:${c ? (0.25 + 0.75 * c / mx).toFixed(2) : 1};${c ? '' : 'background:rgba(255,255,255,.06)'}" title="${c}"></i>`).join('')}<span>${cnt[w]}</span>`).join('')}</div>
      <div class="x8-words" id="x40dw">${top.map(w => `<button data-w="${esc(w)}">${esc(w)} · ${cnt[w]}</button>`).join('')}</div><div id="x40dl"></div>`
      : `<p class="x8-said">no repeating symbols yet.<span>a word shows up here once it appears in two or more dreams.</span></p>`}
      ${fine('symbols are the words that repeat across your dreams, picked out on this phone. each square is a week; brighter = it showed up in more dreams that week.')}`);
    ov.querySelectorAll('[data-v]').forEach(b => b.onclick = () => dreams(b.dataset.v));
    ov.querySelectorAll('#x40dw [data-w]').forEach(b => b.onclick = () => { ov.querySelectorAll('#x40dw [data-w]').forEach(x => x.classList.toggle('on', x === b)); const w = b.dataset.w; ov.querySelector('#x40dl').innerHTML = D.filter(d => dreamWords(d).includes(w)).slice(0, 12).map(d => `<div class="x8-kind"><small>${fmtD(d.t)}</small>${esc((d.text || (d.ans || []).filter(Boolean).join(' · ')).slice(0, 220))}</div>`).join(''); });
    return;
  }
  const qi = D.length % DQ.length, ask = [DQ[qi], DQ[(qi + 2) % DQ.length]];
  const ov = A.x8open('dream', `<div class="x8-seg"><button class="on" data-v="log">write</button><button data-v="map">symbols${D.length ? ' · ' + D.length : ''}</button></div>
    <p class="x40-lab">write it before it fades. start anywhere.</p>
    <textarea class="x8-ta" id="x40d0" rows="4" placeholder="${esc(ask[0])}"></textarea><input class="x8-in" id="x40d1" placeholder="${esc(ask[1])}" autocomplete="off">
    <p class="x40-lab">the feeling of it</p><div class="x8-words" id="x40df">${['calm', 'strange', 'scary', 'sad', 'happy', 'chased', 'lost', 'flying'].map(w => `<button data-f="${w}">${w}</button>`).join('')}</div>
    <label class="x40-check"><input type="checkbox" id="x40dlu"> i knew i was dreaming (lucid)</label>
    <button class="x6-blendbtn" id="x40ds">keep this dream</button>
    ${D.length ? `<p class="x6-k" style="margin-top:18px">recent</p>${D.slice(0, 4).map(d => `<div class="x8-kind"><small>${fmtD(d.t)}${d.lucid ? ' · lucid' : ''}${(d.feel || []).length ? ' · ' + d.feel.map(esc).join(', ') : ''}</small>${esc((d.text || (d.ans || []).filter(Boolean).join(' · ')).slice(0, 200))}<button class="x40-del" data-del="${esc(d.id)}" aria-label="delete this dream">×</button></div>`).join('')}` : ''}
    ${fine('dreams stay on this phone only. they aren’t synced and aren’t part of your moments.')}`);
  ov.querySelectorAll('[data-v]').forEach(b => b.onclick = () => dreams(b.dataset.v));
  ov.querySelectorAll('#x40df [data-f]').forEach(b => b.onclick = () => b.classList.toggle('on'));
  ov.querySelector('#x40ds').onclick = () => {
    const text = ov.querySelector('#x40d0').value.trim().slice(0, 4000), a1 = ov.querySelector('#x40d1').value.trim().slice(0, 400);
    if (!text && !a1) return A.toast('write a little of it first');
    const L = LSG('dreams', []); L.push({ id: nid(), t: Date.now(), text, ans: [a1], q: ask, feel: [...ov.querySelectorAll('#x40df .on')].map(b => b.dataset.f), lucid: ov.querySelector('#x40dlu').checked });
    LSS('dreams', L.slice(-500)); A.toast('dream kept'); dreams();
  };
  ov.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (!confirm('delete this dream?')) return; LSS('dreams', LSG('dreams', []).filter(x => x.id !== b.dataset.del)); dreams(); });
}

/* ---------- 7 · lucid reality checks: interactive awareness checks, quiet in-app pings ---------- */
const RC_WORDS = ['lantern', 'harbor', 'velvet', 'orchard', 'compass', 'meadow', 'ember', 'tide', 'quartz', 'willow'];
function rc(step) {
  const p = LSG('rc', { every: 0, last: 0, n: 0 });
  if (!step) {
    const ov = A.x8open('rc', `<div class="x40-card"><b>${p.n} check${p.n === 1 ? '' : 's'} so far</b><small>${p.last ? 'last one ' + fmtD(p.last) + ', ' + fmtT(p.last) : 'none yet'}</small></div>
      <button class="x6-blendbtn" id="x40rcg">do a reality check now</button>
      <p class="x40-lab">quiet pings while liminal is open</p><div class="x8-seg" id="x40rce">${[['off', 0], ['every hour', 60], ['every 2 h', 120], ['every 3 h', 180]].map(([l, m]) => `<button class="${(p.every || 0) === m ? 'on' : ''}" data-m="${m}">${l}</button>`).join('')}</div>
      ${fine('the habit behind lucid dreaming: ask “am i dreaming?” and actually test it, often enough that you start doing it in dreams too. pings are a soft card inside liminal when you open it or have it open and a check is due; liminal can’t send notifications when it’s closed.')}`);
    ov.querySelector('#x40rcg').onclick = () => rc(1);
    ov.querySelectorAll('#x40rce [data-m]').forEach(b => b.onclick = () => { LSS('rc', { ...LSG('rc', p), every: +b.dataset.m, last: LSG('rc', p).last || Date.now() }); ov.querySelectorAll('#x40rce [data-m]').forEach(x => x.classList.toggle('on', x === b)); A.toast(+b.dataset.m ? 'pings on while liminal is open' : 'pings off'); });
    return;
  }
  const word = RC_WORDS[Math.floor(Math.random() * RC_WORDS.length)];
  const steps = [
    ['look at your hand', 'count your fingers, slowly. how many?', `<div class="x8-seg" data-ans>${['4', '5', '6 or more', 'it kept changing'].map(x => `<button data-a="${x}">${x}</button>`).join('')}</div>`],
    ['read this word', `<span class="x40-rcw">${word}</span> now look away for a second, then tap.`, '<button class="x6-blendbtn" data-a="looked">i looked away</button>'],
    ['read it again', `<span class="x40-rcw">${word}</span> did it stay the same?`, `<div class="x8-seg" data-ans><button data-a="same">same word</button><button data-a="changed">it changed</button></div>`],
    ['press a finger into your palm', 'does it stop, or pass through?', `<div class="x8-seg" data-ans><button data-a="stops">it stops</button><button data-a="through">passes through</button></div>`],
    ['how did you get here?', 'think back over the last hour. can you trace it, step by step?', `<div class="x8-seg" data-ans><button data-a="yes">yes</button><button data-a="gaps">there are gaps</button></div>`]
  ];
  const s = steps[step - 1], ov = A.x8open('rc', `<p class="x40-lab">${step} of ${steps.length}</p><p class="xg-big">${s[0]}</p><p class="xg-sub">${s[1]}</p>${s[2]}`);
  ov.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    if (step < steps.length) return rc(step + 1);
    const P = LSG('rc', p); LSS('rc', { ...P, n: (P.n || 0) + 1, last: Date.now() }); buzz(15);
    A.x8open('rc', `<p class="xg-big">you’re awake.</p><p class="xg-sub">fingers stayed put, words didn’t change, your hand stopped. in a dream at least one of those usually goes strange. that’s your cue.</p><button class="x6-blendbtn" id="x40rcd">done</button>`).querySelector('#x40rcd').onclick = () => A.x6close();
  });
}
function rcDue() { const p = LSG('rc', {}); return p.every > 0 && Date.now() - (p.last || 0) >= p.every * 60000; }
function rcPing() {
  if (!rcDue() || A.isPro && !A.isPro() || document.hidden || A.X6.ov || document.getElementById('x40rcp') || document.getElementById('x40void') || document.getElementById('x40dawn')) return;
  const el = document.createElement('button'); el.id = 'x40rcp'; el.className = 'x40-ping'; el.innerHTML = '<b>reality check</b><span>are you dreaming? tap to check</span>'; document.body.appendChild(el);
  const P = LSG('rc', {}); LSS('rc', { ...P, last: Date.now() }); // one ping per interval, tapped or not
  requestAnimationFrame(() => el.classList.add('on')); const gone = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); };
  el.onclick = () => { gone(); rc(1); }; setTimeout(gone, 12000);
}

/* ---------- 12 · evening decompression ritual: your own habit stack, ticked off each night ---------- */
const RIT0 = ['phone on charge, out of reach', 'lights down low', 'write tomorrow’s top 3', 'wash face / warm shower', '10 slow breaths', 'read paper or listen, no scrolling'];
function ritual(edit) {
  const R = LSG('ritual', null) || { items: RIT0.map(t => ({ id: nid(), t })), days: {}, start: '21:30' }, tk = nightKey(Date.now());
  const done = new Set(R.days[tk] || []), n = R.items.length, all = n && R.items.every(i => done.has(i.id));
  let streak = 0; for (let d = new Date(tk + 'T12:00'); streak < 400; d.setDate(d.getDate() - 1)) { const k = dayKey(d.getTime()), dd = new Set(R.days[k] || []); if (R.items.length && R.items.every(i => dd.has(i.id))) streak++; else if (k !== tk) break; }
  const ov = A.x8open('ritual', `<div class="x40-card"><b>${all ? 'all done tonight ✓' : done.size + ' of ' + n + ' tonight'}</b><small>${streak ? streak + ' night' + (streak === 1 ? '' : 's') + ' in a row with every step' : 'start at ' + minLabel(timeToMin(R.start) || 1290) + ', about an hour before bed'}</small></div>
    <div class="x40-stack">${R.items.map(i => `<button class="x40-step-i${done.has(i.id) ? ' on' : ''}" data-i="${esc(i.id)}"><i></i><span>${esc(i.t)}</span>${edit ? `<em data-rm="${esc(i.id)}" aria-label="remove">×</em>` : ''}</button>`).join('')}</div>
    ${edit ? `<input class="x8-in" id="x40ra" placeholder="add a step…" maxlength="60" autocomplete="off"><div class="x40-two"><label>start at<input type="time" class="x8-in" id="x40rst" value="${esc(R.start)}"></label></div><button class="x6-blendbtn" id="x40rad">add step</button><button class="ghost x40-mini" id="x40red">done editing</button>` : `<button class="ghost x40-mini" id="x40red">edit my steps</button>`}
    ${fine('the point is the same order every night, so your body learns “this means sleep is coming.” kept on this phone only.')}`);
  const save = () => { const ks = Object.keys(R.days).sort(); while (ks.length > 120) delete R.days[ks.shift()]; LSS('ritual', R); };
  ov.querySelectorAll('[data-i]').forEach(b => b.onclick = e => { if (e.target.closest('[data-rm]')) { R.items = R.items.filter(x => x.id !== e.target.closest('[data-rm]').dataset.rm); save(); return ritual(true); } const s = new Set(R.days[tk] || []); s.has(b.dataset.i) ? s.delete(b.dataset.i) : s.add(b.dataset.i); R.days[tk] = [...s]; save(); buzz(10); ritual(edit); });
  ov.querySelector('#x40red').onclick = () => ritual(!edit);
  if (edit) { ov.querySelector('#x40rad').onclick = () => { const v = ov.querySelector('#x40ra').value.trim().slice(0, 60); if (!v) return A.toast('type a step first'); if (R.items.length >= 12) return A.toast('12 steps max'); R.items.push({ id: nid(), t: v }); save(); ritual(true); }; ov.querySelector('#x40rst').onchange = e => { R.start = e.target.value || '21:30'; save(); }; }
}

/* ---------- 18 · nocturnal awakening log (free): one tap at 3am, tags, a pattern by morning ---------- */
const WTAGS = ['racing mind', 'too hot', 'too cold', 'bathroom', 'noise', 'bad dream', 'pain', 'thirsty', 'partner / pet', 'checked phone', 'no idea'];
const wakeupsFor = n => LSG('wakeups', []).filter(w => w.t > n.bed && w.t < n.wake);
function awake(id) {
  const L = LSG('wakeups', []), cur = id ? L.find(w => w.id === id) : null;
  if (cur) {
    const ov = A.x8open('awake', `<p class="xg-big" style="text-align:center">${fmtT(cur.t)}</p><p class="xg-sub" style="text-align:center">logged. anything you noticed? tap any.</p>
      <div class="x8-words x40-tags">${WTAGS.map(t => `<button class="${(cur.tags || []).includes(t) ? 'on' : ''}" data-t="${t}">${t}</button>`).join('')}</div>
      <button class="x6-blendbtn" id="x40ab">back to sleep</button><button class="ghost x40-mini" id="x40ad">this was a mis-tap · remove</button>
      ${fine('if your mind is racing, “thought dump” or the 4-7-8 breathing can help. try not to check the time again.')}`);
    ov.classList.add('x40-night');
    ov.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const A2 = LSG('wakeups', []), w = A2.find(x => x.id === id); if (!w) return; w.tags = w.tags || []; w.tags.includes(b.dataset.t) ? w.tags = w.tags.filter(x => x !== b.dataset.t) : w.tags.push(b.dataset.t); LSS('wakeups', A2); b.classList.toggle('on'); });
    ov.querySelector('#x40ab').onclick = () => A.x6close();
    ov.querySelector('#x40ad').onclick = () => { LSS('wakeups', LSG('wakeups', []).filter(x => x.id !== id)); awake(); };
    return;
  }
  const recent = L.filter(w => w.t > Date.now() - 30 * 864e5), byH = Array(24).fill(0); recent.forEach(w => byH[new Date(w.t).getHours()]++);
  const tc = {}; recent.forEach(w => (w.tags || []).forEach(t => tc[t] = (tc[t] || 0) + 1)); const topT = Object.keys(tc).sort((a, b) => tc[b] - tc[a]).slice(0, 3);
  const hrs = [21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7], mx = Math.max(1, ...hrs.map(h => byH[h])), peak = hrs.reduce((a, h) => byH[h] > byH[a] ? h : a, hrs[0]);
  const ov = A.x8open('awake', `<button class="x40-big" id="x40an">i’m awake</button><p class="x40-lab" style="text-align:center">one tap logs the time. tags are optional.</p>
    ${recent.length ? `<p class="x6-k" style="margin-top:18px">last 30 days · ${recent.length} wakeup${recent.length === 1 ? '' : 's'}</p>
      <div class="x40-bars">${hrs.map(h => `<div><i style="height:${Math.round(byH[h] / mx * 100)}%"></i><small>${h === 0 ? '12a' : h < 12 ? h + 'a' : h === 12 ? '12p' : h - 12 + 'p'}</small></div>`).join('')}</div>
      <div class="x40-card"><b>most often around ${peak === 0 ? '12' : peak > 12 ? peak - 12 : peak}${peak < 12 ? 'am' : 'pm'}</b><small>${topT.length ? 'usually: ' + topT.map(t => `${esc(t)} (${tc[t]})`).join(', ') : 'tag a few to see what’s behind them'}</small></div>
      ${L.slice(-5).reverse().map(w => `<div class="x40-li"><span><b>${fmtD(w.t)} · ${fmtT(w.t)}</b><small>${(w.tags || []).map(esc).join(', ') || 'no tags'}</small></span><button class="x40-del" data-edit="${esc(w.id)}" aria-label="edit">›</button></div>`).join('')}` : ''}
    ${fine('kept on this phone only. waking once or twice a night is normal; it’s the pattern that’s useful. wakeups show up on the sleep architecture chart for that night.')}`);
  ov.classList.add('x40-night');
  ov.querySelector('#x40an').onclick = () => { const w = { id: nid(), t: Date.now(), tags: [] }; LSS('wakeups', [...LSG('wakeups', []), w].slice(-600)); buzz(15); awake(w.id); };
  ov.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => awake(b.dataset.edit));
}

/* ---------- the tools, the night hub, and wiring into liminal's commands ---------- */
// [key, name, what it does, pro?, fn]. free: the safety / accessibility / 3am ones.
const TOOLS = [
  ['awake', 'awakening log', 'woke up at 3am? one tap logs it. tag what woke you; see the pattern.', 0, () => awake()],
  ['dump', 'thought dump', 'type what’s looping and watch it dissolve into dust. nothing is kept.', 0, dump],
  ['soma', 'grounding by touch', 'a 60-second body scan by touch, for when anxiety spikes.', 0, soma],
  ['sense', 'sensory profile', 'turn off haptics, motion and blur, turn up contrast. one tap for overload days.', 0, sense],
  ['nights', 'last night', 'log bedtime, wake time and how rested you feel. it feeds the sleep charts.', 0, () => logNight()],
  ['breath', '4-7-8 breathing', 'a soundscape that opens and settles with your breath, eyes closed.', 1, breath478],
  ['drowse', 'drift-off timer', 'soft noise that fades away once you’ve stopped moving.', 1, drowse],
  ['morph', 'noise morpher', 'blend rain, fan and brown noise; it swells to cover sudden sounds.', 1, morph],
  ['room', 'room resonance', 'listens to your room for 6 seconds and tunes masking noise to it.', 1, room],
  ['illusion', 'sound illusions', 'build binaural beats and endless shepard tones with live sliders.', 1, () => illusion()],
  ['dark', 'go dark', 'a black screen with one slowly pulsing point of light.', 1, dark],
  ['ritual', 'wind-down ritual', 'your own evening habit stack, ticked off each night.', 1, () => ritual()],
  ['tint', 'dusk-to-dawn tint', 'the screen warms with your local sunset and clears at dawn.', 1, tint],
  ['nap', 'power nap', '10–26 minute nap with a bright wake-up chime.', 1, nap],
  ['wake', 'sunrise wake', 'screen and sound slowly rise over the 30 minutes before your alarm.', 1, wake],
  ['sprint', 'focus sprints', '25-minute study sprints on a 40 Hz binaural hum.', 1, sprint],
  ['dream', 'dream log', 'prompted dream recall, and a heatmap of the symbols that keep coming back.', 1, () => dreams()],
  ['rc', 'reality checks', 'quick “am i dreaming?” tests and quiet pings, the lucid-dreaming habit.', 1, () => rc()],
  ['arch', 'sleep architecture', 'an estimated chart of light, deep and REM sleep for a logged night.', 1, () => arch()],
  ['circ', 'circadian drift', 'is your sleep drifting later? how screens and evening light line up with rest.', 1, circ],
  ['debt', 'sleep debt planner', 'how far behind you are, and a 7-night plan to catch up.', 1, debt]
];
const HUB = [['when you can’t sleep', ['awake', 'dump', 'breath', 'drowse', 'soma']], ['sounds', ['morph', 'room', 'illusion', 'dark']], ['before bed', ['ritual', 'tint', 'sense']], ['naps + waking', ['nap', 'wake', 'sprint']], ['your nights', ['nights', 'arch', 'circ', 'debt', 'dream', 'rc']]];
function hub() {
  const pro = A.isPro(), byK = k => TOOLS.find(t => t[0] === k);
  const ov = A.x6open(`<p class="x6-k">night</p><h2 class="x8-h">tonight</h2><p class="x8-p">tools for sleep, waking up at 3am, and winding down. everything stays on this phone.</p>
    ${HUB.map(([g, ks]) => `<p class="x35-g">${g}</p>${ks.map(byK).map(t => `<button class="x35-i" data-x8="${t[0]}"><b>${t[1]}${t[3] && !pro ? ' <i class="x35-pro">pro</i>' : ''}${t[0] === 'rc' && rcDue() ? ' <i class="x35-due">due</i>' : ''}</b><small>${t[2]}</small></button>`).join('')}`).join('')}`);
  ov.addEventListener('click', e => { const b = e.target.closest('[data-x8]'); if (b) A.x8go(b.dataset.x8); });
}

export function install(api) {
  A = api; sensApply(); tintApply(); setInterval(tintApply, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { tintApply(); setTimeout(rcPing, 800); } });
  setInterval(rcPing, 60000); setTimeout(rcPing, 2500);
  // every tool becomes a liminal command (searchable with "/"), with its own back button + pro gate
  TOOLS.forEach(([k, name, desc, pro, fn]) => { if (!api.X8.find(t => t[0] === k)) api.X8.push([k, name, desc, pro]); api.X40GO[k] = fn; });
  api.X35G.push(['for tonight', HUB[0][1].concat(HUB[2][1])], ['night sounds', HUB[1][1]], ['naps + waking', HUB[3][1]], ['your nights', HUB[4][1]]);
  api.X40GO.night = hub;
  const row = document.querySelector('.xtools'); if (row && !document.getElementById('x40N')) { row.insertAdjacentHTML('afterbegin', '<button id="x40N" aria-label="night tools">☾ night</button>'); document.getElementById('x40N').onclick = hub; }
  api.XSET.push(() => `<button class="row" id="x40sS"><span>sensory profile</span><small>${(() => { const p = LSG('sense', { haptics: true, contrast: false }), on = [!p.haptics && 'no haptics', calmOn() && 'calm motion', p.contrast && 'high contrast'].filter(Boolean); return on.length ? on.join(' · ') : 'haptics, motion, contrast'; })()}</small></button>
    <button class="row" id="x40sT"><span>dusk-to-dawn tint</span><small>${api.isPro() ? ({ off: 'off', geo: 'follows your twilight', manual: 'set times' })[LSG('tint', { mode: 'off' }).mode] || 'off' : 'pro'}</small></button>
    <button class="row" id="x40sN"><span>night tools</span><small>sleep, 3am wakeups, naps, sounds</small></button>`);
  api.XSETB.push(() => { const g = id => document.getElementById(id); if (g('x40sS')) g('x40sS').onclick = () => api.x8go('sense'); if (g('x40sT')) g('x40sT').onclick = () => api.x8go('tint'); if (g('x40sN')) g('x40sN').onclick = hub; });
  return { hub, stopAll };
}
