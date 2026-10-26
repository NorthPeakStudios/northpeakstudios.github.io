// Cadence 1.6 · Labs: eight experiments (Draw a melody, Scale detective, Dissonance curve: free · Tuning lab, Polyrhythm lab, Mode morph, Pivot finder, Jam loops: Pro). Original Northpeak code.
(() => {
  const pro = () => !!(window.CadPro && CadPro.pro());
  const lockV = (v, what, why) => (window.CadPro && CadPro.locked ? CadPro.locked : window.locked)(v, what, why);
  const PC = p => T.spell.pc(((p % 12) + 12) % 12);
  const nOf = (m, name) => T.parse(T.spell.midiName(m, name || PC(m)));
  const back = '<a class="back" href="#labs">← Labs</a>';
  const KEYSEL = (id, cur) => `<select id="${id}">${T.spell.MAJ.map((k, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${k}</option>`).join('')}</select>`;
  const alive = el => el && document.body.contains(el);
  /* own little synth for exact frequencies (tuning + dissonance need real overtones) */
  let AX = null, WAVE = null;
  function ax() { if (!AX) { AX = new (window.AudioContext || window.webkitAudioContext)(); const n = 9, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = 1 / k; WAVE = AX.createPeriodicWave(re, im); } if (AX.state === 'suspended') AX.resume(); return AX; }
  function tone(f, t0, dur, vol) { const c = ax(), t = c.currentTime + 0.04 + t0, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000; o.setPeriodicWave(WAVE); o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.05); g.gain.setValueAtTime(vol || 0.12, t + dur - 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(lp); lp.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05); }
  const LABS = [
    ['#drawmel', '✏️ Draw a melody', 'drag a line with your finger, hear it as a tune in any key', 0],
    ['#scaledet', '🔎 Scale detective', 'tap the notes you hear, see every scale that fits them', 0],
    ['#dissonance', '〽️ Dissonance curve', 'why some intervals sound smooth: the roughness model, live', 0],
    ['#tuning', '🎚️ Tuning lab', 'the same chord in equal temperament vs pure ratios: hear the beats', 1],
    ['#poly', '🌀 Polyrhythm lab', '3 against 2, 4 against 3… see it and hear it', 1],
    ['#modes', '🌗 Mode morph', 'one tune played in all 7 modes, brightest to darkest', 1],
    ['#pivot', '🔀 Pivot finder', 'chords two keys share, for smooth key changes', 1],
    ['#jam', '🔁 Jam loops', 'famous progressions on loop to improvise over', 1]
  ];
  routes.labs = v => { v.innerHTML = `<a class="back" href="#tools">← Tools</a><h2>🧪 Labs</h2><p class="muted intro">New experiments in Cadence 1.6. Each one runs on your phone.</p><div class="grid">${LABS.map(([h, t, d, p]) => `<a class="tile${p && !pro() ? ' locked' : ''}" href="${h}"><b>${t}${p && !pro() ? ' 🔒' : ''}</b><span>${d}</span></a>`).join('')}</div>`; };

  /* ---------- 1. Draw a melody (free) ---------- */
  const SC = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], 'pentatonic': [0, 2, 4, 7, 9], 'blues': [0, 3, 5, 6, 7, 10] };
  routes.drawmel = v => {
    const st = JSON.parse(localStorage.getItem('cad.dm') || 'null') || { k: 0, sc: 'major', n: 12, pts: [] };
    v.innerHTML = `${back}<h2>✏️ Draw a melody</h2><p class="muted intro">Drag a line left to right: high = high notes. Cadence snaps it to a scale.</p>
      <div class="card"><canvas id="dmc" class="lb-dm" width="680" height="360"></canvas><div class="row nn-row"><label class="muted small">Key ${KEYSEL('dmk', st.k)}</label><div class="nn-seg sm" id="dms">${Object.keys(SC).map(s => `<button data-s="${s}" class="${s === st.sc ? 'on' : ''}">${s}</button>`).join('')}</div></div>
      <div class="nn-seg sm" id="dmn">${[8, 12, 16].map(n => `<button data-n="${n}" class="${n === st.n ? 'on' : ''}">${n} notes</button>`).join('')}</div></div>
      <div class="card"><div id="dmstaff"><p class="muted center">draw something above</p></div><div class="row"><button class="btn" id="dmplay">▶︎ Play</button><button class="btn ghost" id="dmclr">Clear</button></div></div>`;
    const cv = $('#dmc'), cx = cv.getContext('2d'); let drawing = false, notes = [];
    const save = () => localStorage.setItem('cad.dm', JSON.stringify(st));
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    function paint() { cx.clearRect(0, 0, 680, 360); cx.strokeStyle = 'rgba(127,127,127,.25)'; cx.lineWidth = 1; for (let i = 1; i < 6; i++) { cx.beginPath(); cx.moveTo(0, i * 60); cx.lineTo(680, i * 60); cx.stroke(); }
      if (st.pts.length > 1) { cx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--acc') || '#7c5cff'; cx.lineWidth = 6; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.beginPath(); st.pts.forEach(([x, y], i) => i ? cx.lineTo(x * 680, y * 360) : cx.moveTo(x * 680, y * 360)); cx.stroke(); }
      notes.forEach((m, i) => { const x = notes.length > 1 ? 20 + i * 640 / (notes.length - 1) : 340; cx.fillStyle = '#fff'; cx.strokeStyle = '#333'; cx.lineWidth = 2; cx.beginPath(); cx.arc(x, (1 - (m.y)) * 360, 7, 0, 7); cx.fill(); cx.stroke(); }); }
    function quant() {
      notes = []; if (st.pts.length < 2) { $('#dmstaff').innerHTML = '<p class="muted center">draw something above</p>'; paint(); return; }
      const P = st.pts.slice().sort((a, b) => a[0] - b[0]), x0 = P[0][0], x1 = P[P.length - 1][0], deg = SC[st.sc], steps = [];
      for (let o = 0; o < 3; o++) deg.forEach(d => steps.push(o * 12 + d)); steps.push(36);
      const lo = 60 + st.k - (st.k > 5 ? 12 : 0), span = steps.filter(s => s <= 24).length - 1;
      for (let i = 0; i < st.n; i++) { const tx = x0 + (x1 - x0) * i / (st.n - 1); let y = P[0][1]; for (let j = 1; j < P.length; j++) if (P[j][0] >= tx) { const a = P[j - 1], b = P[j], f = b[0] === a[0] ? 0 : (tx - a[0]) / (b[0] - a[0]); y = a[1] + (b[1] - a[1]) * f; break; } const h = Math.max(0, Math.min(1, 1 - y)), idx = Math.round(h * span); notes.push({ m: lo + steps[idx], y: idx / span }); }
            $('#dmstaff').innerHTML = UI.staff(notes.map(n => { const nm = T.spell.inKey(n.m % 12, st.k, st.sc === 'minor'); return { notes: [nOf(n.m, nm)] }; }), { clef: 'treble', evW: 30 }) + `<p class="muted small center">${esc(T.spell.keyName(st.k, st.sc === 'minor'))}${st.sc === 'pentatonic' || st.sc === 'blues' ? ' · ' + st.sc + ' notes only' : ''}</p>`;
      paint(); save();
    }
    cv.addEventListener('pointerdown', e => { drawing = true; st.pts = [pos(e)]; cv.setPointerCapture(e.pointerId); e.preventDefault(); });
    cv.addEventListener('pointermove', e => { if (!drawing) return; st.pts.push(pos(e)); if (st.pts.length > 400) st.pts.splice(1, 1); paint(); });
    cv.addEventListener('pointerup', () => { drawing = false; quant(); });
    $('#dmk').onchange = e => { st.k = +e.target.value; quant(); };
    $('#dms').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; st.sc = b.dataset.s; $$('#dms button').forEach(x => x.classList.toggle('on', x === b)); quant(); };
    $('#dmn').onclick = e => { const b = e.target.closest('[data-n]'); if (!b) return; st.n = +b.dataset.n; $$('#dmn button').forEach(x => x.classList.toggle('on', x === b)); quant(); };
    $('#dmplay').onclick = () => notes.forEach((n, i) => Audio.playMidi(n.m, i * 0.32, 0.4, 0.85));
    $('#dmclr').onclick = () => { st.pts = []; quant(); };
    quant();
  };

  /* ---------- 2. Scale detective (free) ---------- */
  const SCALES = [['major (Ionian)', [0, 2, 4, 5, 7, 9, 11]], ['Dorian', [0, 2, 3, 5, 7, 9, 10]], ['Phrygian', [0, 1, 3, 5, 7, 8, 10]], ['Lydian', [0, 2, 4, 6, 7, 9, 11]], ['Mixolydian', [0, 2, 4, 5, 7, 9, 10]], ['natural minor (Aeolian)', [0, 2, 3, 5, 7, 8, 10]], ['Locrian', [0, 1, 3, 5, 6, 8, 10]], ['harmonic minor', [0, 2, 3, 5, 7, 8, 11]], ['melodic minor (up)', [0, 2, 3, 5, 7, 9, 11]], ['major pentatonic', [0, 2, 4, 7, 9]], ['minor pentatonic', [0, 3, 5, 7, 10]], ['blues', [0, 3, 5, 6, 7, 10]], ['whole tone', [0, 2, 4, 6, 8, 10]], ['diminished (half-whole)', [0, 1, 3, 4, 6, 7, 9, 10]], ['diminished (whole-half)', [0, 2, 3, 5, 6, 8, 9, 11]]];
  routes.scaledet = v => {
    const sel = new Set(JSON.parse(localStorage.getItem('cad.sd') || '[]'));
    v.innerHTML = `${back}<h2>🔎 Scale detective</h2><p class="muted intro">Tap the notes you heard in a song (any octave). Cadence lists every common scale that contains all of them.</p><div class="card"><div id="sdpz"></div><div class="row"><span class="muted small" id="sdsel"></span><button class="btn ghost sm" id="sdclr">Clear</button></div></div><div id="sdout"></div>`;
    const pz = UI.piano($('#sdpz'), { from: 60, to: 83, onNote: m => { const p = m % 12; sel.has(p) ? sel.delete(p) : sel.add(p); upd(); } });
    function upd() {
      localStorage.setItem('cad.sd', JSON.stringify([...sel])); const hl = new Set(); sel.forEach(p => { hl.add(60 + p); hl.add(72 + p); }); pz.highlight(hl);
      $('#sdsel').textContent = sel.size ? [...sel].sort((a, b) => a - b).map(PC).join(' · ') : 'no notes yet';
      if (sel.size < 2) { $('#sdout').innerHTML = '<p class="muted center">pick at least 2 notes</p>'; return; }
      const res = []; for (let r = 0; r < 12; r++) SCALES.forEach(([nm, iv]) => { const set = new Set(iv.map(i => (r + i) % 12)); if ([...sel].every(p => set.has(p))) res.push({ r, nm, iv, extra: iv.length - sel.size, root: sel.has(r) }); });
      res.sort((a, b) => a.extra - b.extra || (b.root - a.root) || a.iv.length - b.iv.length);
      $('#sdout').innerHTML = res.length ? `<div class="card"><p class="muted small">${res.length} match${res.length === 1 ? '' : 'es'} · fewest extra notes first</p>${res.slice(0, 18).map((x, i) => `<button class="lb-res" data-i="${i}"><b>${esc(PC(x.r))} ${esc(x.nm)}</b><small>${x.iv.map(j => { const p = (x.r + j) % 12; return sel.has(p) ? `<u>${esc(PC(p))}</u>` : esc(PC(p)); }).join(' ')}${x.extra ? ` · ${x.extra} more note${x.extra === 1 ? '' : 's'}` : ' · exact'}</small></button>`).join('')}</div>` : '<p class="muted center">no common scale has all of those. maybe a chromatic passage, or a key change.</p>';
      $$('#sdout .lb-res').forEach(b => b.onclick = () => { const x = res[+b.dataset.i]; x.iv.concat([12]).forEach((j, k) => Audio.playMidi(60 + x.r + j, k * 0.26, 0.4)); });
    }
    $('#sdclr').onclick = () => { sel.clear(); upd(); }; upd();
  };

  /* ---------- 3. Dissonance curve (free): Sethares' fit of Plomp & Levelt ---------- */
  function diss(f1, f2) { let d = 0; for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) { const a = f1 * i, b = f2 * j, s = 0.24 / (0.0207 * Math.min(a, b) + 18.96), x = Math.abs(b - a), w = Math.pow(0.88, i - 1) * Math.pow(0.88, j - 1); d += w * (Math.exp(-3.51 * s * x) - Math.exp(-5.75 * s * x)); } return d; }
  const IVN = ['unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', 'perfect 4th', 'tritone', 'perfect 5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th', 'octave'];
  routes.dissonance = v => {
    const base = 220, N = 241, pts = []; for (let i = 0; i < N; i++) { const c = i * 5; pts.push(diss(base, base * Math.pow(2, c / 1200))); } const mx = Math.max(...pts.slice(3));
    let c = 700;
    v.innerHTML = `${back}<h2>〽️ Dissonance curve</h2><p class="muted intro">Two notes, each with natural overtones. The curve shows how “rough” they sound together as the top note slides up an octave. The dips land on the intervals music is built on.</p>
      <div class="card"><div id="dsv"></div><input type="range" id="dsr" min="0" max="1200" step="1" value="${c}" class="lb-range"><div class="row"><b id="dsl"></b><button class="btn" id="dsp">▶︎ Hear it</button></div><div class="nn-seg sm" id="dsj">${[[0, 'unison'], [316, '6:5'], [386, '5:4'], [498, '4:3'], [702, '3:2'], [884, '5:3'], [1200, '2:1']].map(([x, l]) => `<button data-c="${x}">${l}</button>`).join('')}</div></div>
      <p class="muted small">How it works: William Sethares’ formula for the roughness experiments of Plomp and Levelt (1965), applied to every pair of the first 6 overtones of each note. It models roughness (beating), not whether music sounds “good”; different instruments with different overtones get different curves.</p>`;
    const W = 340, H = 160, X = i => 8 + i / (N - 1) * (W - 16), Y = d => H - 22 - d / mx * (H - 36);
    function draw() { const path = pts.map((d, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Math.max(6, Y(d)).toFixed(1)}`).join(' '), ci = c / 5;
      const ticks = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200].map((x, k) => `<line x1="${X(x / 5)}" x2="${X(x / 5)}" y1="${H - 20}" y2="${H - 16}" stroke="currentColor" opacity=".5"/>${[0, 4, 7, 12].includes(k) ? `<text x="${X(x / 5)}" y="${H - 5}" font-size="9" text-anchor="middle" fill="currentColor" opacity=".7">${['1', '', '', '', 'M3', '', '', 'P5', '', '', '', '', '8ve'][k]}</text>` : ''}`).join('');
      $('#dsv').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Dissonance curve"><path d="${path}" fill="none" stroke="var(--acc)" stroke-width="2.2"/>${ticks}<line x1="${X(ci)}" x2="${X(ci)}" y1="4" y2="${H - 20}" stroke="#ff9f0a" stroke-width="1.6" stroke-dasharray="3 3"/><circle cx="${X(ci)}" cy="${Math.max(6, Y(diss(base, base * Math.pow(2, c / 1200))))}" r="5" fill="#ff9f0a"/><text x="${W - 8}" y="14" font-size="9" text-anchor="end" fill="currentColor" opacity=".6">rougher ↑</text></svg>`;
      const near = Math.round(c / 100), off = c - near * 100; $('#dsl').textContent = `${c} cents · ${IVN[near]}${Math.abs(off) > 2 ? ` ${off > 0 ? '+' : ''}${off}¢` : ''} · roughness ${Math.round(diss(base, base * Math.pow(2, c / 1200)) / mx * 100)}`; }
    $('#dsr').oninput = e => { c = +e.target.value; draw(); };
    $('#dsj').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; c = +b.dataset.c; $('#dsr').value = c; draw(); };
    $('#dsp').onclick = () => { tone(base, 0, 2.2, 0.1); tone(base * Math.pow(2, c / 1200), 0, 2.2, 0.1); };
    draw();
  };

  /* ---------- 4. Tuning lab (Pro) ---------- */
  const TCH = [['major triad', [[0, 1], [4, 5 / 4], [7, 3 / 2]]], ['minor triad', [[0, 1], [3, 6 / 5], [7, 3 / 2]]], ['dominant 7th', [[0, 1], [4, 5 / 4], [7, 3 / 2], [10, 7 / 4]]], ['power chord', [[0, 1], [7, 3 / 2], [12, 2]]]];
  routes.tuning = v => {
    if (!pro()) return lockV(v, 'Tuning lab', 'Hear equal temperament vs pure ratios');
    let k = 0, ci = 0;
    v.innerHTML = `${back}<h2>🎚️ Tuning lab</h2><p class="muted intro">Pianos use equal temperament: every half step is exactly the same size, so music works in all 12 keys, but most intervals are slightly out from the pure whole-number ratios that make overtones line up. Choirs, string players and brass players often nudge toward the pure version. Listen to both.</p>
      <div class="card"><div class="row nn-row"><label class="muted small">Root ${KEYSEL('tlk', 0)}</label></div><div class="nn-seg sm" id="tlc">${TCH.map((c, i) => `<button data-i="${i}" class="${i ? '' : 'on'}">${c[0]}</button>`).join('')}</div>
      <div class="row"><button class="btn" id="tle">▶︎ Equal temperament</button><button class="btn" id="tlj">▶︎ Pure (just)</button></div><button class="btn ghost" id="tlab" style="width:100%">▶︎ A/B: equal, then pure</button></div><div class="card" id="tlt"></div>`;
    const root = () => 261.63 * Math.pow(2, ((k > 6 ? k - 12 : k)) / 12);
    function table() { const ch = TCH[ci][1], r = root(); const rows = ch.map(([s, q]) => { const et = s * 100, j = 1200 * Math.log2(q), d = et - j; return `<tr><td>${esc(PC(k + s))}</td><td>${et}¢</td><td>${j.toFixed(1)}¢ <small>(${fr(q)})</small></td><td><b>${d > 0 ? '+' : ''}${d.toFixed(1)}¢</b></td></tr>`; }).join('');
      let beat = ''; const third = ch.find(x => x[0] === 4 || x[0] === 3); if (third) { const fe = r * Math.pow(2, third[0] / 12), num = third[0] === 4 ? [5, 4] : [6, 5]; const b = Math.abs(num[0] * r - num[1] * fe); beat = `<p class="small">In equal temperament the ${third[0] === 4 ? 'major' : 'minor'} 3rd makes the overtones rub: about <b>${b.toFixed(1)} beats per second</b> at this pitch. In pure tuning it’s 0.</p>`; }
      $('#tlt').innerHTML = `<table class="lb-tbl"><tr><th>note</th><th>equal</th><th>pure</th><th>equal is</th></tr>${rows}</table>${beat}<p class="muted small">Cents: 100 = one equal half step. The pure 7th of a dominant 7th (7:4) is a whole 31¢ flat of the piano’s, which is why barbershop chords “ring”.</p>`; }
    const fr = q => ({ 1: '1:1', 1.25: '5:4', 1.2: '6:5', 1.5: '3:2', 1.75: '7:4', 2: '2:1' }[q] || q.toFixed(3));
    const play = (just, t0) => { const r = root(); TCH[ci][1].forEach(([s, q]) => tone(just ? r * q : r * Math.pow(2, s / 12), t0 || 0, 2.6, 0.09)); };
    $('#tle').onclick = () => play(false); $('#tlj').onclick = () => play(true); $('#tlab').onclick = () => { play(false, 0); play(true, 3); };
    $('#tlk').onchange = e => { k = +e.target.value; table(); };
    $('#tlc').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; ci = +b.dataset.i; $$('#tlc button').forEach(x => x.classList.toggle('on', x === b)); table(); };
    table();
  };

  /* ---------- 5. Polyrhythm lab (Pro) ---------- */
  routes.poly = v => {
    if (!pro()) return lockV(v, 'Polyrhythm lab', 'See and hear 3 against 2, 4 against 3…');
    const st = JSON.parse(localStorage.getItem('cad.pl') || 'null') || { a: 3, b: 2, bpm: 50 };
    v.innerHTML = `${back}<h2>🌀 Polyrhythm lab</h2><p class="muted intro">Two beats sharing one cycle. Left ear high click, the other a low tone. Watch where they line up.</p>
      <div class="card"><div class="row nn-row"><label class="muted small">top <select id="pla">${[2, 3, 4, 5, 6, 7].map(n => `<option${n === st.a ? ' selected' : ''}>${n}</option>`).join('')}</select></label><b>against</b><label class="muted small"><select id="plb">${[2, 3, 4, 5, 6, 7].map(n => `<option${n === st.b ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <canvas id="plc" width="600" height="600" class="lb-pl"></canvas><div id="plg" class="lb-grid"></div>
      <label class="muted small">cycles per minute <span id="plbv">${st.bpm}</span><input type="range" id="plbpm" min="20" max="90" value="${st.bpm}" class="lb-range"></label><button class="btn big" id="plgo" style="width:100%">▶︎ Start</button></div>
      <p class="muted small">Count it: the grid splits the cycle into equal slots (the least common multiple of the two numbers), so you can see exactly which slot each beat lands on.</p>`;
    const cv = $('#plc'), c = cv.getContext('2d'); let run = false, t0 = 0, timer = 0, raf = 0;
    const gcd = (x, y) => y ? gcd(y, x % y) : x, save = () => localStorage.setItem('cad.pl', JSON.stringify(st));
    function grid() { const L = st.a * st.b / gcd(st.a, st.b); const row = n => Array.from({ length: L }, (_, i) => `<i class="${i % (L / n) === 0 ? 'on' : ''}"></i>`).join(''); $('#plg').innerHTML = `<div><span>${st.a}</span>${row(st.a)}</div><div><span>${st.b}</span>${row(st.b)}</div>`; }
    function frame() { if (!alive(cv)) { stop(); return; } const per = 60 / st.bpm, ph = run ? (((AXt() - t0) / per) % 1 + 1) % 1 : 0; c.clearRect(0, 0, 600, 600); const ring = (n, R, col) => { c.strokeStyle = 'rgba(127,127,127,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(300, 300, R, 0, 7); c.stroke(); for (let i = 0; i < n; i++) { const an = -Math.PI / 2 + i / n * 2 * Math.PI, hit = run && Math.abs(((ph - i / n) % 1 + 1) % 1) < 0.06; c.fillStyle = hit ? col : 'rgba(127,127,127,.6)'; c.beginPath(); c.arc(300 + R * Math.cos(an), 300 + R * Math.sin(an), hit ? 22 : 13, 0, 7); c.fill(); } }; ring(st.a, 240, '#ff9f0a'); ring(st.b, 140, '#30d158');
      const an = -Math.PI / 2 + ph * 2 * Math.PI; c.strokeStyle = getComputedStyle(document.body).getPropertyValue('--acc') || '#7c5cff'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(300, 300); c.lineTo(300 + 260 * Math.cos(an), 300 + 260 * Math.sin(an)); c.stroke(); raf = requestAnimationFrame(frame); }
    const AXt = () => ax().currentTime;
    function sched(at) { const per = 60 / st.bpm; for (let i = 0; i < st.a; i++) click(at + i * per / st.a, 1500, i === 0); for (let i = 0; i < st.b; i++) click(at + i * per / st.b, 520, i === 0); }
    function click(t, f, acc) { const C = ax(), o = C.createOscillator(), g = C.createGain(); o.frequency.value = f; g.gain.setValueAtTime(acc ? 0.5 : 0.32, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); o.connect(g); g.connect(C.destination); o.start(t); o.stop(t + 0.07); }
    function loop() { if (!run || !alive(cv)) return stop(); const per = 60 / st.bpm; while (nextT < AXt() + 0.3) { sched(nextT); nextT += per; } timer = setTimeout(loop, 100); }
    let nextT = 0;
    function start() { run = true; t0 = AXt() + 0.1; nextT = t0; loop(); $('#plgo').textContent = '■ Stop'; }
    function stop() { run = false; clearTimeout(timer); if (alive($('#plgo'))) $('#plgo').textContent = '▶︎ Start'; }
    $('#plgo').onclick = () => run ? stop() : start();
    $('#pla').onchange = e => { st.a = +e.target.value; save(); grid(); if (run) { stop(); start(); } };
    $('#plb').onchange = e => { st.b = +e.target.value; save(); grid(); if (run) { stop(); start(); } };
    $('#plbpm').oninput = e => { st.bpm = +e.target.value; $('#plbv').textContent = st.bpm; save(); };
    grid(); frame();
  };

  /* ---------- 6. Mode morph (Pro) ---------- */
  const MODES = [['Lydian', [0, 2, 4, 6, 7, 9, 11], '♯4'], ['Ionian (major)', [0, 2, 4, 5, 7, 9, 11], 'none'], ['Mixolydian', [0, 2, 4, 5, 7, 9, 10], '♭7'], ['Dorian', [0, 2, 3, 5, 7, 9, 10], '♭3 ♭7'], ['Aeolian (minor)', [0, 2, 3, 5, 7, 8, 10], '♭3 ♭6 ♭7'], ['Phrygian', [0, 1, 3, 5, 7, 8, 10], '♭2 ♭3 ♭6 ♭7'], ['Locrian', [0, 1, 3, 5, 6, 8, 10], '♭2 ♭3 ♭5 ♭6 ♭7']];
  const TUNES = [['Twinkle Twinkle', '1 1 5 5 6 6 5 4 4 3 3 2 2 1'], ['Ode to Joy', '3 3 4 5 5 4 3 2 1 1 2 3 3 2 2'], ['Frère Jacques', '1 2 3 1 1 2 3 1 3 4 5 3 4 5'], ['Mary Had a Little Lamb', '3 2 1 2 3 3 3 2 2 2 3 5 5'], ['scale up + down', '1 2 3 4 5 6 7 8 7 6 5 4 3 2 1']];
  routes.modes = v => {
    if (!pro()) return lockV(v, 'Mode morph', 'One tune in all 7 modes');
    let k = 0, ti = 0, mi = 1;
    v.innerHTML = `${back}<h2>🌗 Mode morph</h2><p class="muted intro">The same tune, same key note, played in each of the 7 modes. They’re ordered from brightest (Lydian) to darkest (Locrian): each step down flattens one more note.</p>
      <div class="card"><div class="row nn-row"><label class="muted small">Key note ${KEYSEL('mmk', 0)}</label><select id="mmt">${TUNES.map((t, i) => `<option value="${i}">${t[0]}</option>`).join('')}</select></div><div id="mmlist"></div><button class="btn big" id="mmall" style="width:100%">▶︎ Play all 7, bright → dark</button></div><div class="card" id="mmstaff"></div>`;
    const mel = (m) => TUNES[ti][1].split(' ').map(Number).map(d => { const o = Math.floor((d - 1) / 7), dd = (d - 1) % 7; return 60 + (k > 6 ? k - 12 : k) + o * 12 + MODES[m][1][dd]; });
    function list() { $('#mmlist').innerHTML = MODES.map((x, i) => `<button class="lb-res${i === mi ? ' on' : ''}" data-m="${i}"><b>${i + 1}. ${x[0]}</b><small>vs major: ${x[2]}</small></button>`).join(''); $$('#mmlist .lb-res').forEach(b => b.onclick = () => { mi = +b.dataset.m; list(); staff(); playM(mi, 0); }); }
    function staff() { const ms = mel(mi), names = MODES[mi][1].map((s, i) => null); $('#mmstaff').innerHTML = `<p class="small"><b>${esc(PC(k))} ${esc(MODES[mi][0])}</b></p>` + UI.staff(ms.map(m => ({ notes: [nOf(m)] })), { clef: 'treble', evW: 26 }); }
    const playM = (m, t0) => mel(m).forEach((x, i) => Audio.playMidi(x, t0 + i * 0.3, 0.38, 0.85));
    $('#mmall').onclick = () => { let t = 0; MODES.forEach((_, m) => { playM(m, t); t += mel(m).length * 0.3 + 0.6; }); };
    $('#mmk').onchange = e => { k = +e.target.value; staff(); }; $('#mmt').onchange = e => { ti = +e.target.value; staff(); };
    list(); staff();
  };

  /* ---------- 7. Pivot finder (Pro) ---------- */
  const QN = { M: '', m: 'm', d: '°' }, QI = { M: [0, 4, 7], m: [0, 3, 7], d: [0, 3, 6] };
  const DIA = { maj: [[0, 'M', 'I'], [2, 'm', 'ii'], [4, 'm', 'iii'], [5, 'M', 'IV'], [7, 'M', 'V'], [9, 'm', 'vi'], [11, 'd', 'vii°']], min: [[0, 'm', 'i'], [2, 'd', 'ii°'], [3, 'M', 'III'], [5, 'm', 'iv'], [7, 'm', 'v'], [7, 'M', 'V'], [8, 'M', 'VI'], [10, 'M', 'VII'], [11, 'd', 'vii°']] };
  routes.pivot = v => {
    if (!pro()) return lockV(v, 'Pivot finder', 'Chords two keys share');
    const st = JSON.parse(localStorage.getItem('cad.pv') || 'null') || { a: 0, am: 0, b: 7, bm: 0 };
    const ksel = (id, cur, m) => `<div class="row nn-row">${KEYSEL(id, cur)}<div class="nn-seg sm" data-for="${id}"><button data-m="0" class="${m ? '' : 'on'}">major</button><button data-m="1" class="${m ? 'on' : ''}">minor</button></div></div>`;
    v.innerHTML = `${back}<h2>🔀 Pivot finder</h2><p class="muted intro">To change key smoothly, composers use a chord that belongs to both keys: it means one thing in the old key and another in the new one.</p><div class="card"><p class="muted small">From</p>${ksel('pva', st.a, st.am)}<p class="muted small">To</p>${ksel('pvb', st.b, st.bm)}</div><div id="pvout"></div>`;
    const chords = (t, m) => DIA[m ? 'min' : 'maj'].map(([o, q, rn]) => ({ r: (t + o) % 12, q, rn }));
    const fifths = (t, m) => { const rel = m ? (t + 3) % 12 : t; return (rel * 7) % 12; };
    function upd() {
      localStorage.setItem('cad.pv', JSON.stringify(st));
      const A = chords(st.a, st.am), B = chords(st.b, st.bm), sh = []; A.forEach(x => B.forEach(y => { if (x.r === y.r && x.q === y.q) sh.push({ x, y }); }));
      const fa = fifths(st.a, st.am), fb = fifths(st.b, st.bm), dist = Math.min((fa - fb + 12) % 12, (fb - fa + 12) % 12);
      const kn = (t, m) => T.spell.keyName(t, !!m);
      $('#pvout').innerHTML = `<div class="card"><p><b>${esc(kn(st.a, st.am))} → ${esc(kn(st.b, st.bm))}</b></p><p class="small muted">${dist === 0 ? 'Same key signature (relative or same keys).' : `${dist} step${dist === 1 ? '' : 's'} apart on the circle of fifths${dist <= 1 ? ': closely related, an easy move.' : dist >= 4 ? ': far apart, few shared chords.' : '.'}`}</p>
        ${sh.length ? `<table class="lb-tbl"><tr><th>chord</th><th>in old key</th><th>in new key</th><th></th></tr>${sh.map((p, i) => `<tr><td><b>${esc(PC(p.x.r) + QN[p.x.q])}</b></td><td>${p.x.rn}</td><td>${p.y.rn}</td><td><button class="btn ghost sm" data-i="${i}">▶︎</button></td></tr>`).join('')}</table><p class="muted small">▶︎ plays: old I → pivot → new V → new I.</p>` : '<p class="small">No shared chords. Composers use a direct (sudden) change here, or a chromatic chord as a bridge.</p>'}</div>`;
      $$('#pvout [data-i]').forEach(b => b.onclick = () => { const p = sh[+b.dataset.i], tri = (r, q) => QI[q].map(i => 60 + ((r + i) % 12 + (r > 7 ? -12 : 0)) % 24); const seq = [[st.a, st.am ? 'm' : 'M'], [p.x.r, p.x.q], [(st.b + 7) % 12, 'M'], [st.b, st.bm ? 'm' : 'M']]; seq.forEach(([r, q], i) => { const root = 48 + r; Audio.playMidi(root - 12 < 36 ? root : root - 12, i * 1.1, 1.1, 0.5); Audio.chord(QI[q].map(x => 60 + ((r + x) % 12) + ((r + x) % 12 < 5 ? 12 : 0)), i * 1.1, 1.1); }); });
    }
    v.querySelectorAll('[data-for]').forEach(s => s.onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; const id = s.dataset.for; if (id === 'pva') st.am = +b.dataset.m; else st.bm = +b.dataset.m; s.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); upd(); });
    $('#pva').onchange = e => { st.a = +e.target.value; upd(); }; $('#pvb').onchange = e => { st.b = +e.target.value; upd(); };
    upd();
  };

  /* ---------- 8. Jam loops (Pro) ---------- */
  const Q2 = { M: [0, 4, 7], m: [0, 3, 7], d: [0, 3, 6], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11] }, QS = { M: '', m: 'm', d: '°', '7': '7', m7: 'm7', M7: 'maj7' };
  const PROGS = [
    ['Pop axis', 'I V vi IV', 0, [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']], 'major pentatonic'],
    ['50s doo-wop', 'I vi IV V', 0, [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']], 'major pentatonic'],
    ['Jazz ii–V–I', 'ii7 V7 Imaj7 Imaj7', 0, [[2, 'm7'], [7, '7'], [0, 'M7'], [0, 'M7']], 'major scale'],
    ['12-bar blues', 'I7 ×4 · IV7 ×2 · I7 ×2 · V7 IV7 I7 V7', 0, [[0, '7'], [0, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [0, '7'], [7, '7'], [5, '7'], [0, '7'], [7, '7']], 'blues scale'],
    ['Circle', 'vi ii V I', 0, [[9, 'm'], [2, 'm'], [7, 'M'], [0, 'M']], 'major scale'],
    ['Pachelbel', 'I V vi iii IV I IV V', 0, [[0, 'M'], [7, 'M'], [9, 'm'], [4, 'm'], [5, 'M'], [0, 'M'], [5, 'M'], [7, 'M']], 'major pentatonic'],
    ['Andalusian (minor)', 'i ♭VII ♭VI V', 1, [[0, 'm'], [10, 'M'], [8, 'M'], [7, 'M']], 'harmonic minor'],
    ['Minor pop', 'i ♭VI ♭III ♭VII', 1, [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M']], 'minor pentatonic']
  ];
  routes.jam = v => {
    if (!pro()) return lockV(v, 'Jam loops', 'Famous progressions on loop');
    const st = JSON.parse(localStorage.getItem('cad.jm') || 'null') || { p: 0, k: 0, bpm: 90 };
    v.innerHTML = `${back}<h2>🔁 Jam loops</h2><p class="muted intro">A chord progression on repeat so you can improvise over it on your instrument. Each chord gets one bar of 4 beats.</p>
      <div class="card"><div class="row nn-row"><select id="jmp">${PROGS.map((p, i) => `<option value="${i}"${i === st.p ? ' selected' : ''}>${p[0]}</option>`).join('')}</select><label class="muted small">Key ${KEYSEL('jmk', st.k)}</label></div>
      <div id="jmch" class="lb-jam"></div><p class="small" id="jmsc"></p><label class="muted small">tempo <span id="jmbv">${st.bpm}</span> bpm<input type="range" id="jmbpm" min="60" max="160" value="${st.bpm}" class="lb-range"></label><button class="btn big" id="jmgo" style="width:100%">▶︎ Start loop</button></div>
      <p class="muted small">Trumpet / B♭ players: these are concert-pitch chord names. Use the Transposer to see them in your key.</p>`;
    let run = false, bar = 0, timer = 0, nextT = 0, prev = null; const box = $('#jmch');
    const save = () => localStorage.setItem('cad.jm', JSON.stringify(st));
    function voice(r, q) { const pcs = Q2[q].map(i => (st.k + r + i) % 12); let best = null, bs = 1e9; for (let inv = 0; inv < pcs.length; inv++) { const ord = pcs.slice(inv).concat(pcs.slice(0, inv)); let base = 55; const ms = []; ord.forEach(p => { let m = base + ((p - base) % 12 + 12) % 12; if (ms.length && m <= ms[ms.length - 1]) m += 12; ms.push(m); }); while (ms[0] > 62) ms.forEach((_, i) => ms[i] -= 12); const sc = prev ? ms.reduce((s, m, i) => s + Math.abs(m - (prev[i] || prev[prev.length - 1])), 0) : Math.abs(ms[0] - 60); if (sc < bs) { bs = sc; best = ms; } } prev = best; return best; }
    function paint(cur) { const P = PROGS[st.p]; box.innerHTML = P[3].map(([r, q], i) => `<span class="${i === cur ? 'on' : ''}">${esc(PC(st.k + r) + QS[q])}</span>`).join(''); $('#jmsc').innerHTML = `${esc(P[1])} · improvise with the <b>${esc(PC(st.k))} ${esc(P[4])}</b>`; }
    function loop() { if (!run || !alive(box)) { run = false; clearTimeout(timer); return; } const P = PROGS[st.p], spb = 60 / st.bpm, now = ax().currentTime, C = AX;
      while (nextT < now + 0.4) { const [r, q] = P[3][bar % P[3].length], ms = voice(r, q), off = nextT - now, bi = bar % P[3].length; ms.forEach(m => Audio.playMidi(m, off, spb * 3.6, 0.42)); const root = 36 + ((st.k + r) % 12); Audio.playMidi(root, off, spb * 1.8, 0.6); Audio.playMidi(root + 7, off + spb * 2, spb * 1.8, 0.45); for (let b = 0; b < 4; b++) Audio.click(off + b * spb, b === 0); setTimeout(() => { if (run && alive(box)) paint(bi); }, Math.max(0, off * 1000)); nextT += spb * 4; bar++; }
      timer = setTimeout(loop, 120); }
    function start() { run = true; bar = 0; prev = null; nextT = ax().currentTime + 0.15; loop(); $('#jmgo').textContent = '■ Stop'; }
    function stop() { run = false; clearTimeout(timer); $('#jmgo').textContent = '▶︎ Start loop'; paint(-1); }
    $('#jmgo').onclick = () => run ? stop() : start();
    $('#jmp').onchange = e => { st.p = +e.target.value; save(); bar = 0; prev = null; paint(-1); };
    $('#jmk').onchange = e => { st.k = +e.target.value; save(); prev = null; paint(-1); };
    $('#jmbpm').oninput = e => { st.bpm = +e.target.value; $('#jmbv').textContent = st.bpm; save(); };
    paint(-1);
  };
  addEventListener('hashchange', () => { try { Audio.stopAll && Audio.stopAll(); } catch (e) {} });

  window.EXTRA_TOOLS = [['#labs', '🧪 Labs', '8 new experiments: draw a melody, tuning, polyrhythms…']].concat(window.EXTRA_TOOLS || []);
  window.CadLabs = { diss, SCALES, PROGS };
})();
