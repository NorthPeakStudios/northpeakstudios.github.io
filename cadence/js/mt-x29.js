// Cadence 1.9 · play-and-listen tools (all free, all on this phone): Breath pacer, Long-tone ladder, Intonation drift, Rubato metronome,
// Tone fatigue check, Hum to notation, Range chart, Nerves sim. The microphone is read on-device by Web Audio and never recorded or sent anywhere.
// Original Northpeak code.
(() => {
  const back = '<a class="back" href="#tools">← Tools</a>';
  const alive = el => el && document.body.contains(el);
  const ls = (k, d) => { try { const v = localStorage.getItem('cad.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lset = (k, v) => { try { localStorage.setItem('cad.' + k, JSON.stringify(v)); } catch (e) {} };
  const h = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NM = m => T.PC_NAMES_SHARP[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const sd = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) * (x - m)))); };
  const MICNOTE = '<p class="muted small x29-micnote">Uses your microphone. The sound is analysed on this phone and never recorded or sent.</p>';
  const MICERR = 'Microphone blocked or not available. Allow mic access for this site in your browser settings, then try again.';

  /* ---------- shared mic reader ---------- */
  const M = {
    an: null, tb: null, fb: null,
    async start() { try { Audio.stopMic(); this.an = await Audio.startMic(); this.tb = new Float32Array(this.an.fftSize); this.fb = new Float32Array(this.an.frequencyBinCount); return true; } catch (e) { this.an = null; return false; } },
    stop() { try { Audio.stopMic(); } catch (e) {} this.an = null; },
    frame() { // loudness, pitch, brightness of the current ~90 ms of sound
      const an = this.an; if (!an || !Audio.ctx) return null;
      an.getFloatTimeDomainData(this.tb); let r = 0; for (let i = 0; i < this.tb.length; i++) r += this.tb[i] * this.tb[i];
      const rms = Math.sqrt(r / this.tb.length), db = 20 * Math.log10(rms + 1e-9);
      const p = rms >= 0.01 ? Audio.detectPitch(an) : null;
      let cen = null;
      if (p) { an.getFloatFrequencyData(this.fb); const hz = Audio.ctx.sampleRate / an.fftSize; let s = 0, w = 0;
        for (let i = Math.floor(80 / hz); i < Math.min(this.fb.length, 8000 / hz); i++) { const mag = Math.pow(10, this.fb[i] / 20); s += mag * i * hz; w += mag; } cen = w ? s / w : null; }
      return { t: performance.now() / 1000, rms, db, p, cen, bright: p && cen ? cen / p.freq : null };
    }
  };
  const loop = (el, fn) => { const step = () => { if (!alive(el)) { M.stop(); return; } if (fn() === false) return; window._raf = requestAnimationFrame(step); }; window._raf = requestAnimationFrame(step); };
  // a held note = pitch present and within ±60 cents of where it started
  const sounding = f => f && f.p && f.p.clarity > 0.75 && f.rms > 0.015;

  /* instruments: typical comfortable long-tone length (s) at a mezzo-forte for a school/college player. Starting points only — calibrate. */
  const WIND = { flute: ['Flute', 12], clarinet: ['Clarinet', 22], oboe: ['Oboe', 28], sax: ['Saxophone', 18], trumpet: ['Trumpet', 20], horn: ['Horn', 20], trombone: ['Trombone', 15], euph: ['Euphonium / baritone', 14], tuba: ['Tuba', 11], voice: ['Voice', 15] };
  const instSel = (id, cur) => `<select id="${id}" aria-label="Instrument">${Object.entries(WIND).map(([k, [n]]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${n}</option>`).join('')}</select>`;

  /* ---------- 1. Breath pacer ---------- */
  routes.breath = v => {
    const st = Object.assign({ inst: 'trumpet', cap: 0, pct: 80, inhale: 3, rest: 4, rounds: 6 }, ls('breath', {}));
    const cap = () => st.cap || WIND[st.inst][1];
    const save = () => lset('breath', st);
    v.innerHTML = `${back}<h2>🫁 Breath pacer</h2><p class="muted intro">A guide bar for long tones, sized to your own lungs. Breathe in while it fills, play while it grows, rest while it empties.</p>
      <div class="card"><div class="x29-phase" id="bpph">ready</div><div class="x29-bar" id="bpbar"><i></i><b class="x29-tgt"></b></div><div class="x29-sub" id="bpinfo"></div>
        <div class="row x29-c"><button class="btn" id="bpgo">▶︎ Start</button><button class="btn ghost sm" id="bpmic" aria-pressed="false">🎤 Check with mic</button></div><div class="muted small center" id="bpmicst"></div></div>
      <div class="card x27-set"><label>Instrument ${instSel('bpi', st.inst)}</label>
        <label>Your longest comfortable tone <b id="bpcv">${cap()} s</b><input type="range" id="bpc" min="5" max="60" value="${cap()}" aria-label="Longest comfortable tone in seconds"></label>
        <label>Each tone uses <b id="bppv">${st.pct}%</b> of it<input type="range" id="bpp" min="50" max="100" step="5" value="${st.pct}" aria-label="Percent of capacity"></label>
        <label>Breathe in <b id="bpiv">${st.inhale} s</b><input type="range" id="bpin" min="1" max="6" value="${st.inhale}" aria-label="Breathe in seconds"></label>
        <label>Rounds <b id="bprv">${st.rounds}</b><input type="range" id="bpr" min="2" max="12" value="${st.rounds}" aria-label="Rounds"></label>
        <div class="row"><button class="btn ghost sm" id="bpmeas">🎤 Measure my longest tone</button></div><p class="muted small">Not measured yet? It starts from a typical ${h(WIND[st.inst][0].toLowerCase())} player. Measure once and the pacer fits you.</p></div>${MICNOTE}`;
    let run = null, useMic = false, micOk = false;
    const bar = $('#bpbar i'), tgt = $('#bpbar .x29-tgt'), ph = $('#bpph'), info = $('#bpinfo');
    const sync = () => { $('#bpcv').textContent = cap() + ' s'; $('#bppv').textContent = st.pct + '%'; $('#bpiv').textContent = st.inhale + ' s'; $('#bprv').textContent = st.rounds; info.textContent = `tone ${Math.round(cap() * st.pct / 100)} s · breathe ${st.inhale} s · rest ${st.rest} s · ${st.rounds} rounds`; };
    $('#bpi').onchange = e => { st.inst = e.target.value; st.cap = 0; $('#bpc').value = cap(); save(); sync(); };
    $('#bpc').oninput = e => { st.cap = +e.target.value; save(); sync(); };
    $('#bpp').oninput = e => { st.pct = +e.target.value; save(); sync(); };
    $('#bpin').oninput = e => { st.inhale = +e.target.value; save(); sync(); };
    $('#bpr').oninput = e => { st.rounds = +e.target.value; save(); sync(); };
    sync();
    const micOn = async () => { if (micOk) return true; micOk = await M.start(); if (!micOk) $('#bpmicst').textContent = MICERR; return micOk; };
    $('#bpmic').onclick = async () => { useMic = !useMic; if (useMic && !(await micOn())) useMic = false; $('#bpmic').setAttribute('aria-pressed', useMic); $('#bpmic').classList.toggle('on', useMic); $('#bpmicst').textContent = useMic ? 'Mic on: the bar turns red if your tone stops early.' : (micOk ? '' : $('#bpmicst').textContent); };
    $('#bpmeas').onclick = async () => {
      if (run) return; if (!(await micOn())) return;
      ph.textContent = 'take a full breath, then hold one comfortable note'; let start = 0, last = 0, best = 0; const t0 = performance.now() / 1000;
      loop(v.firstElementChild, () => { const f = M.frame(), now = performance.now() / 1000; if (!f) return false;
        if (f.rms > 0.015) { if (!start) start = now; last = now; } else if (start && now - last > 0.4) { best = last - start; }
        const held = start ? (best || now - start) : 0; bar.style.width = clamp(held / 60 * 100, 0, 100) + '%'; info.textContent = start ? `holding ${held.toFixed(1)} s` : 'listening…';
        if (best || now - t0 > 75) { if (best >= 3) { st.cap = clamp(Math.round(best), 5, 60); save(); $('#bpc').value = st.cap; toast('Longest tone: ' + best.toFixed(1) + ' s'); } else toast('Didn’t catch a long tone, try again closer to the phone'); ph.textContent = 'ready'; sync(); bar.style.width = '0'; return false; } });
    };
    $('#bpgo').onclick = () => {
      if (run) { run = null; ph.textContent = 'stopped'; $('#bpgo').textContent = '▶︎ Start'; bar.style.width = '0'; return; }
      Audio.ensure(); const tone = Math.round(cap() * st.pct / 100), cyc = st.inhale + tone + st.rest, t0 = performance.now() / 1000, me = {}; run = me; $('#bpgo').textContent = '■ Stop';
      let short = 0, round = -1, lastSound = 0; tgt.style.left = '100%';
      loop(v.firstElementChild, () => { if (run !== me) return false; const el = performance.now() / 1000 - t0, r = Math.floor(el / cyc), x = el - r * cyc;
        if (r >= st.rounds) { run = null; $('#bpgo').textContent = '▶︎ Start'; ph.textContent = short ? `done · ${st.rounds - short} of ${st.rounds} tones held to the end` : 'done · nice and steady'; bar.style.width = '0'; return false; }
        if (r !== round) { round = r; Audio.click(0, true); }
        const f = useMic ? M.frame() : null; if (f && f.rms > 0.015) lastSound = el;
        if (x < st.inhale) { ph.textContent = `breathe in · round ${r + 1}/${st.rounds}`; bar.style.width = (x / st.inhale * 100) + '%'; bar.className = 'in'; }
        else if (x < st.inhale + tone) { const y = x - st.inhale; ph.textContent = `play · ${Math.ceil(tone - y)} s`; bar.style.width = (y / tone * 100) + '%';
          let cls = 'play'; if (useMic && y > 1.2 && el - lastSound > 0.6) { cls = 'play short'; if (!me['s' + r]) { me['s' + r] = 1; short++; } } bar.className = cls; }
        else { const y = x - st.inhale - tone; ph.textContent = 'rest'; bar.style.width = (100 - y / st.rest * 100) + '%'; bar.className = 'rest'; } });
    };
  };

  /* ---------- 10. Long-tone ladder ---------- */
  routes.ladder = v => {
    const st = Object.assign({ rung: 0, best: 0, hist: [] }, ls('ladder', {}));
    const target = r => 6 + r * 2; // 6 s, 8 s, 10 s … 40 s
    const RUNGS = 18;
    const R = 54, CIRC = 2 * Math.PI * R;
    v.innerHTML = `${back}<h2>🪜 Long-tone ladder</h2><p class="muted intro">Hold one steady note to the target. Make it and the next rung is 2 seconds longer.</p>
      <div class="card center"><svg class="x29-ring" viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="${R}" class="bg"/><circle cx="70" cy="70" r="${R}" class="fg" id="ldring" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"/></svg>
        <div class="x29-ringtxt"><b id="ldt">0.0</b><span id="ldtg">of ${target(st.rung)} s</span></div>
        <div class="x29-phase" id="ldph">Rung ${st.rung + 1} of ${RUNGS}</div>
        <div class="row x29-c"><button class="btn" id="ldmic">🎤 Listen</button><button class="btn ghost" id="ldhold">Hold while playing</button></div>
        <p class="muted small" id="ldst">Listen uses the mic to time your tone. No mic? Press and hold the button for as long as you play.</p></div>
      <div class="card"><h3>Your ladder</h3><div class="x29-rungs">${Array.from({ length: RUNGS }, (_, i) => `<i class="${i < st.rung ? 'done' : i === st.rung ? 'cur' : ''}" title="${target(i)} s">${target(i)}</i>`).join('')}</div>
        <p class="muted small">Best hold: <b>${st.best ? st.best.toFixed(1) + ' s' : '—'}</b>${st.hist.length ? ` · ${st.hist.length} tries logged` : ''} <button class="btn ghost sm" id="ldrst">Start ladder over</button></p></div>${MICNOTE}`;
    const ring = $('#ldring'), tx = $('#ldt');
    const show = s => { tx.textContent = s.toFixed(1); ring.setAttribute('stroke-dashoffset', CIRC * (1 - clamp(s / target(st.rung), 0, 1))); ring.classList.toggle('ok', s >= target(st.rung)); };
    const finish = s => { if (s < 1) return; st.hist.push({ t: Date.now(), s: Math.round(s * 10) / 10, r: st.rung }); st.hist = st.hist.slice(-300); st.best = Math.max(st.best, s);
      if (s >= target(st.rung)) { toast(`Rung ${st.rung + 1} done: ${s.toFixed(1)} s`); st.rung = Math.min(RUNGS - 1, st.rung + 1); } else toast(`${s.toFixed(1)} s, ${(target(st.rung) - s).toFixed(1)} s short. Breathe and go again.`);
      lset('ladder', st); const page = $('#ldring'); setTimeout(() => alive(page) && routes.ladder(v), 900); };
    $('#ldrst').onclick = () => { if (!confirm('Start the ladder from rung 1? Your history stays.')) return; st.rung = 0; lset('ladder', st); routes.ladder(v); };
    let pressT = 0;
    const hb = $('#ldhold');
    const down = e => { e.preventDefault(); pressT = performance.now(); hb.classList.add('on'); const tick = () => { if (!pressT || !alive(hb)) return; show((performance.now() - pressT) / 1000); requestAnimationFrame(tick); }; tick(); };
    const up = () => { if (!pressT) return; const s = (performance.now() - pressT) / 1000; pressT = 0; hb.classList.remove('on'); finish(s); };
    hb.addEventListener('pointerdown', down); hb.addEventListener('pointerup', up); hb.addEventListener('pointercancel', up); hb.addEventListener('pointerleave', up);
    $('#ldmic').onclick = async () => {
      if (!(await M.start())) { $('#ldst').textContent = MICERR; return; }
      $('#ldmic').disabled = true; $('#ldph').textContent = 'play when ready…'; let start = 0, last = 0, ref = null;
      loop(v.firstElementChild, () => { const f = M.frame(), now = performance.now() / 1000; if (!f) return false;
        const on = f.rms > 0.015 && (!ref || !f.p || Math.abs((f.p.midi - ref) * 100 + f.p.cents) < 150);
        if (on) { if (!start) { start = now; } if (f.p && ref == null) ref = f.p.midi + f.p.cents / 100; last = now; }
        if (start) { show(last - start); $('#ldph').textContent = ref != null ? 'holding ' + NM(Math.round(ref)) : 'holding'; }
        if (start && now - last > 0.5) { M.stop(); finish(last - start); return false; } });
    };
  };

  /* ---------- 2. Live intonation drift ---------- */
  routes.drift = v => {
    const agg = ls('drift', {}); // { midi: {n, mean, drift} } running averages across sessions
    v.innerHTML = `${back}<h2>📈 Intonation drift</h2><p class="muted intro">Hold notes and watch the line: how many cents sharp or flat you are, and whether you sag or creep as the note goes on.</p>
      <div class="card"><div class="x29-now" id="dfnow">tap Start, then hold a note</div><canvas id="dfc" class="x29-cv" width="700" height="300" aria-label="Cents sharp or flat over time"></canvas>
        <div class="row x29-c"><button class="btn" id="dfgo">🎤 Start</button><label class="muted small">Show as <select id="dfins"><option value="0">concert pitch</option><option value="2">B♭ instrument (written)</option><option value="9">E♭ instrument (written)</option><option value="7">F horn (written)</option></select></label></div>
        <p class="muted small" id="dfst"></p></div>
      <div class="card"><h3>This session</h3><div id="dfses"><p class="muted small">Held notes show up here.</p></div></div>
      <div class="card"><h3>Your tendencies (all sessions)</h3><div id="dfagg"></div><p class="muted small"><button class="btn ghost sm" id="dfclr">Clear history</button></p></div>${MICNOTE}`;
    const ins = () => +$('#dfins').value;
    const nm = m => NM(m + ins());
    const cv = $('#dfc'), g = cv.getContext('2d'), W = cv.width, H = cv.height, SPAN = 12; // seconds shown
    const pts = []; let cur = null; const ses = [];
    const sign = c => (c > 0 ? '+' : '') + Math.round(c) + '¢';
    const paintAgg = () => { const rows = Object.entries(agg).filter(([, a]) => a.n >= 1).sort((a, b) => +a[0] - +b[0]);
      $('#dfagg').innerHTML = rows.length ? `<div class="x29-tbl">${rows.map(([m, a]) => `<div><b>${nm(+m)}</b><span class="${Math.abs(a.mean) <= 10 ? 'good' : 'warn'}">${sign(a.mean)} avg</span><span>${a.drift >= 0 ? '↗' : '↘'} ${sign(a.drift)} drift</span><small>${a.n}×</small></div>`).join('')}</div>` : '<p class="muted small">Nothing yet.</p>'; };
    const paintSes = () => { if (!ses.length) return; $('#dfses').innerHTML = `<div class="x29-tbl">${ses.slice(-10).reverse().map(n => `<div><b>${nm(n.midi)}</b><span class="${Math.abs(n.mean) <= 10 ? 'good' : 'warn'}">${sign(n.mean)}</span><span>${n.drift >= 0 ? '↗' : '↘'} ${sign(n.drift)}</span><small>${n.dur.toFixed(1)} s</small></div>`).join('')}</div>`; };
    const paint = now => { g.clearRect(0, 0, W, H); const y = c => H / 2 - c / 50 * (H / 2 - 10);
      g.fillStyle = 'rgba(63,185,80,.12)'; g.fillRect(0, y(10), W, y(-10) - y(10));
      g.strokeStyle = 'rgba(127,127,127,.35)'; g.lineWidth = 1; [-50, -25, 0, 25, 50].forEach(c => { g.beginPath(); g.moveTo(0, y(c)); g.lineTo(W, y(c)); g.stroke(); });
      g.fillStyle = 'rgba(160,170,190,.8)'; g.font = '20px system-ui'; g.fillText('+50¢', 6, 24); g.fillText('−50¢', 6, H - 8); g.fillText('0', 6, H / 2 - 4);
      g.strokeStyle = '#7aa2ff'; g.lineWidth = 4; g.beginPath(); let pen = false;
      for (const p of pts) { if (now - p.t > SPAN) continue; const x = W - (now - p.t) / SPAN * W; if (p.c == null) { pen = false; continue; } const yy = y(clamp(p.c, -50, 50)); if (!pen) { g.moveTo(x, yy); pen = true; } else g.lineTo(x, yy); } g.stroke(); };
    const endNote = () => { if (!cur) return; const dur = cur.c.length ? cur.tt[cur.tt.length - 1] - cur.tt[0] : 0;
      if (dur >= 0.6) { const k = Math.max(3, Math.floor(cur.c.length / 4)), a = mean(cur.c.slice(0, k)), b = mean(cur.c.slice(-k)), m = mean(cur.c), n = { midi: cur.m, mean: m, drift: b - a, dur };
        ses.push(n); const A = agg[cur.m] || { n: 0, mean: 0, drift: 0 }; A.mean = (A.mean * A.n + m) / (A.n + 1); A.drift = (A.drift * A.n + n.drift) / (A.n + 1); A.n = Math.min(A.n + 1, 50); A.mean = Math.round(A.mean * 10) / 10; A.drift = Math.round(A.drift * 10) / 10; agg[cur.m] = A; lset('drift', agg); paintSes(); paintAgg(); }
      cur = null; };
    $('#dfins').onchange = () => { paintSes(); paintAgg(); };
    $('#dfclr').onclick = () => { if (!confirm('Clear your intonation history?')) return; Object.keys(agg).forEach(k => delete agg[k]); lset('drift', agg); paintAgg(); };
    paint(0); paintAgg();
    $('#dfgo').onclick = async () => {
      if (!(await M.start())) { $('#dfst').textContent = MICERR; return; } $('#dfgo').remove(); $('#dfst').textContent = 'Listening. Hold each note at least a second.';
      loop(v.firstElementChild, () => { const f = M.frame(); if (!f) return false; const now = f.t;
        if (sounding(f)) { const mf = f.p.midi + f.p.cents / 100;
          if (cur && Math.abs(mf - cur.ref) > 0.6) endNote();
          if (!cur) cur = { m: f.p.midi, ref: mf, c: [], tt: [] };
          const c = (mf - cur.m) * 100; cur.c.push(c); cur.tt.push(now); pts.push({ t: now, c });
          $('#dfnow').innerHTML = `<b>${h(nm(cur.m))}</b> <span class="${Math.abs(c) <= 10 ? 'good' : 'warn'}">${sign(c)}</span>`;
        } else { if (cur && now - cur.tt[cur.tt.length - 1] > 0.25) endNote(); pts.push({ t: now, c: null }); }
        while (pts.length && now - pts[0].t > SPAN) pts.shift(); paint(now); });
    };
  };

  /* ---------- 3. Rubato metronome ---------- */
  routes.rubato = v => {
    const st = Object.assign({ bpm: 80, follow: 0.5, mode: 'tap', beats: 4 }, ls('rubato', {}));
    const save = () => lset('rubato', st);
    v.innerHTML = `${back}<h2>🌊 Rubato metronome</h2><p class="muted intro">A click that bends with you. Push ahead and it speeds up; pull back and it waits. How much it follows is up to you.</p>
      <div class="card center"><div class="x27-bpm"><b id="rbb">${st.bpm}</b><span>BPM</span></div><div class="x27-dots" id="rbd">${Array.from({ length: st.beats }, (_, i) => `<i class="${i ? '' : 'acc'}"></i>`).join('')}</div>
        <canvas id="rbc" class="x29-cv sm" width="700" height="160" aria-label="Your tempo over time"></canvas>
        <div class="nn-seg sm x29-c" id="rbm"><button data-m="tap" class="${st.mode === 'tap' ? 'on' : ''}">Tap the beat</button><button data-m="mic" class="${st.mode === 'mic' ? 'on' : ''}">Listen (mic)</button></div>
        <button class="x29-pad" id="rbpad" aria-label="Tap on each beat">tap here on the beat</button>
        <div class="row x29-c"><button class="btn" id="rbgo">▶︎ Start</button></div><p class="muted small" id="rbst"></p></div>
      <div class="card x27-set"><label>Start tempo <b id="rbbv">${st.bpm}</b><input type="range" id="rbbpm" min="40" max="200" value="${st.bpm}" aria-label="Start tempo"></label>
        <label>Follows you <b id="rbfv">${Math.round(st.follow * 100)}%</b><input type="range" id="rbf" min="0" max="100" step="5" value="${Math.round(st.follow * 100)}" aria-label="How much the click follows you"></label>
        <p class="muted small">0% is a strict metronome. 100% goes wherever you go. Around 40–60% feels like a pianist following a soloist. With the mic, wear headphones so the click doesn’t hear itself.</p></div>`;
    let run = null; const hist = [];
    $('#rbbpm').oninput = e => { st.bpm = +e.target.value; $('#rbbv').textContent = st.bpm; if (!run) $('#rbb').textContent = st.bpm; save(); };
    $('#rbf').oninput = e => { st.follow = +e.target.value / 100; $('#rbfv').textContent = e.target.value + '%'; save(); };
    v.querySelectorAll('#rbm [data-m]').forEach(b => b.onclick = () => { st.mode = b.dataset.m; save(); v.querySelectorAll('#rbm button').forEach(x => x.classList.toggle('on', x === b)); $('#rbpad').hidden = st.mode !== 'tap'; });
    $('#rbpad').hidden = st.mode !== 'tap';
    const cv = $('#rbc'), g = cv.getContext('2d');
    const paint = () => { g.clearRect(0, 0, cv.width, cv.height); if (hist.length < 2) return; const lo = Math.min(...hist) - 5, hi = Math.max(...hist) + 5;
      g.strokeStyle = 'rgba(127,127,127,.35)'; g.beginPath(); const y0 = cv.height - (st.bpm - lo) / (hi - lo) * cv.height; g.moveTo(0, y0); g.lineTo(cv.width, y0); g.stroke();
      g.strokeStyle = '#7aa2ff'; g.lineWidth = 4; g.beginPath(); hist.slice(-60).forEach((b, i, a) => { const x = i / Math.max(1, a.length - 1) * cv.width, y = cv.height - (b - lo) / (hi - lo) * cv.height; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); };
    const beatIn = t => { // a beat you played/tapped at audio-clock time t
      if (!run || !Audio.ctx) return; const r = run, P = r.P, now = Audio.ctx.currentTime;
      const prev = r.next - P, expected = [prev - P, prev, r.next].reduce((a, b) => Math.abs(b - t) < Math.abs(a - t) ? b : a), err = t - expected;
      if (Math.abs(err) > P * 0.45) return; // nowhere near a beat: ignore
      if (r.lastIn != null) { const ioi = t - r.lastIn, k = Math.round(ioi / P); if (k >= 1 && k <= 2) { const p2 = ioi / k; if (p2 > P * 0.6 && p2 < P * 1.6) r.P = clamp(P + st.follow * (p2 - P), 60 / 240, 60 / 30); } }
      if (expected === r.next) r.n++; // you played the coming beat early: that click is covered
      let nx = expected + st.follow * err + r.P; if (nx < now + 0.04) nx += r.P; r.next = nx; r.lastIn = t;
      const bpm = Math.round(60 / r.P); $('#rbb').textContent = bpm; hist.push(bpm); paint();
    };
    $('#rbpad').addEventListener('pointerdown', e => { e.preventDefault(); if (run && Audio.ctx) beatIn(Audio.ctx.currentTime); $('#rbpad').classList.add('hit'); setTimeout(() => $('#rbpad') && $('#rbpad').classList.remove('hit'), 90); });
    $('#rbgo').onclick = async () => {
      if (run) { run = null; M.stop(); $('#rbgo').textContent = '▶︎ Start'; return; }
      const c = Audio.ensure(); const me = { P: 60 / st.bpm, next: c.currentTime + 0.3, n: 0, lastIn: null, clicks: [] }; run = me; hist.length = 0; hist.push(st.bpm);
      $('#rbgo').textContent = '■ Stop';
      if (st.mode === 'mic') { if (!(await M.start())) { $('#rbst').textContent = MICERR; } else $('#rbst').textContent = 'Listening for your note starts.'; }
      const dots = [...v.querySelectorAll('#rbd i')]; let env = 0, lastOn = 0;
      loop(v.firstElementChild, () => { if (run !== me) return false; const ctx = Audio.ctx; if (!ctx) return false; const now = ctx.currentTime;
        while (me.next < now + 0.12) { const when = me.next - now - 0.03; Audio.click(Math.max(0, when), me.n % st.beats === 0); me.clicks.push(me.next); const i = me.n % st.beats; setTimeout(() => dots.forEach((d, j) => d.classList.toggle('on', j === i)), Math.max(0, (me.next - now) * 1000)); me.n++; me.next += me.P; if (me.clicks.length > 16) me.clicks.shift(); }
        if (st.mode === 'mic' && M.an) { const f = M.frame(); if (f) { const nearClick = me.clicks.some(t => Math.abs(now - t) < 0.07);
          if (!nearClick && f.rms > 0.03 && f.rms > env * 2.2 && now - lastOn > 0.15) { lastOn = now; beatIn(now - 0.03); } env = env * 0.85 + f.rms * 0.15; } } });
    };
  };

  /* ---------- 5. Tone fatigue check ---------- */
  routes.fatigue = v => {
    const all = ls('fatigue', []); const today = new Date().toDateString();
    let ses = all.length && new Date(all[all.length - 1].t).toDateString() === today && Date.now() - all[all.length - 1].last < 3 * 3600e3 ? all[all.length - 1] : null;
    v.innerHTML = `${back}<h2>🪫 Tone fatigue check</h2><p class="muted intro">Every 10–15 minutes, play the same comfortable note for 4 seconds. Cadence compares it with your first one and tells you when your tone is starting to thin.</p>
      <div class="card center"><div class="x29-phase" id="ftph">${ses ? `check ${ses.checks.length + 1} of this session` : 'first check sets your fresh tone'}</div><div class="x29-big" id="ftsc">${ses && ses.checks.length > 1 ? ses.checks[ses.checks.length - 1].score : '—'}</div>
        <div class="row x29-c"><button class="btn" id="ftgo">🎤 Tone check (4 s)</button>${ses ? '<button class="btn ghost sm" id="ftnew">New session</button>' : ''}</div><p class="muted small" id="ftst">Same note, same volume each time (a mid-register note you could hold all day).</p></div>
      <div class="card"><h3>This session</h3><canvas id="ftc" class="x29-cv sm" width="700" height="180" aria-label="Tone score per check"></canvas><div id="ftl"></div></div>
      <div class="card"><p class="muted small">How it measures: tone clarity (how cleanly the note's pitch stands out from air noise), pitch steadiness, loudness steadiness and brightness, each against your first check. It's an on-device estimate, not a teacher's ear. A drop of more than 15 is the hint to rest.</p></div>${MICNOTE}`;
    const paint = () => { const cv = $('#ftc'), g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); const cs = ses ? ses.checks : [];
      const y = s => cv.height - (clamp(s, 40, 110) - 40) / 70 * cv.height; g.strokeStyle = 'rgba(248,81,73,.5)'; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(0, y(85)); g.lineTo(cv.width, y(85)); g.stroke(); g.setLineDash([]);
      if (cs.length) { g.strokeStyle = '#7aa2ff'; g.fillStyle = '#7aa2ff'; g.lineWidth = 4; g.beginPath(); cs.forEach((c, i) => { const x = cs.length > 1 ? 20 + i / (cs.length - 1) * (cv.width - 40) : cv.width / 2; i ? g.lineTo(x, y(c.score)) : g.moveTo(x, y(c.score)); }); g.stroke(); cs.forEach((c, i) => { const x = cs.length > 1 ? 20 + i / (cs.length - 1) * (cv.width - 40) : cv.width / 2; g.beginPath(); g.arc(x, y(c.score), 7, 0, 7); g.fill(); }); }
      $('#ftl').innerHTML = cs.map((c, i) => `<div class="x27-item"><span><b>${i ? c.score : 'fresh'}</b> ${i ? (c.score < 85 ? '<span class="warn">thinning, rest 5 min</span>' : 'holding up') : 'baseline'}</span><small>${new Date(c.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · ${h(NM(c.m))}</small></div>`).join(''); };
    paint();
    if ($('#ftnew')) $('#ftnew').onclick = () => { ses = null; routes.fatigue(v); };
    $('#ftgo').onclick = async () => {
      if (!(await M.start())) { $('#ftst').textContent = MICERR; return; } $('#ftgo').disabled = true; $('#ftph').textContent = 'play your note now'; const fr = []; let start = 0;
      loop(v.firstElementChild, () => { const f = M.frame(); if (!f) return false; const now = f.t;
        if (f.rms > 0.012) { if (!start) start = now; if (now - start > 0.5 && f.p) fr.push(f); }
        if (start) { $('#ftph').textContent = `keep going… ${Math.max(0, 4.5 - (now - start)).toFixed(1)} s`; }
        if (start && now - start > 4.5) { M.stop(); $('#ftgo').disabled = false;
          if (fr.length < 20) { $('#ftph').textContent = 'couldn’t hear a steady note, try again'; return false; }
          const m = Math.round(mean(fr.map(f => f.p.midi + f.p.cents / 100))), cents = fr.map(f => (f.p.midi - m) * 100 + f.p.cents);
          const c = { t: Date.now(), m, clar: mean(fr.map(f => f.p.clarity)), cs: sd(cents), ls: sd(fr.map(f => f.db)), br: mean(fr.filter(f => f.bright).map(f => f.bright)) || 0, db: mean(fr.map(f => f.db)) };
          if (!ses) { ses = { t: Date.now(), last: Date.now(), checks: [] }; all.push(ses); }
          const b = ses.checks[0];
          if (!b) c.score = 100; else { // each part: 100 = as good as fresh; lower = worse
            const parts = [clamp(c.clar / b.clar, 0, 1.1) * 100, clamp((b.cs + 3) / (c.cs + 3), 0, 1.1) * 100, clamp((b.ls + 0.8) / (c.ls + 0.8), 0, 1.1) * 100, b.br ? clamp(c.br / b.br, 0, 1.1) * 100 : 100];
            c.score = Math.round(parts[0] * 0.35 + parts[1] * 0.25 + parts[2] * 0.2 + parts[3] * 0.2); c.why = ['clarity', 'pitch steadiness', 'loudness steadiness', 'brightness'][parts.indexOf(Math.min(...parts))]; }
          if (b && Math.abs(c.m - b.m) > 2) toast('Different note from your first check, so the comparison is rough');
          ses.checks.push(c); ses.last = Date.now(); lset('fatigue', all.slice(-30));
          $('#ftsc').textContent = c.score; $('#ftph').textContent = !b ? 'baseline saved. Check again in 10–15 min' : c.score < 85 ? `tone is thinning (mostly ${c.why}). Rest 5 minutes.` : 'tone is holding up'; paint(); return false; } });
    };
  };

  /* ---------- 8. Hum to notation ---------- */
  const KEYS_MAJ = [0, 2, 4, 5, 7, 9, 11];
  const KSIG = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
  function guessKey(midis, durs) { const hist = new Array(12).fill(0); midis.forEach((m, i) => hist[m % 12] += durs[i]); let best = 0, bs = -1;
    for (let k = 0; k < 12; k++) { let s = KEYS_MAJ.reduce((a, d) => a + hist[(k + d) % 12], 0) + hist[k] * 0.5 + hist[(k + 7) % 12] * 0.25; if (s > bs) { bs = s; best = k; } } return best; }
  routes.hum = v => {
    const st = Object.assign({ bpm: 80, saved: [] }, ls('hum', {}));
    v.innerHTML = `${back}<h2>🎶 Hum to notation</h2><p class="muted intro">Hum or sing a short line (or play it). Cadence writes it on the staff: pitches, key and a rough rhythm.</p>
      <div class="card center"><div class="x29-phase" id="hmph">ready</div><div class="row x29-c"><button class="btn" id="hmgo">🎤 Record</button><button class="btn ghost" id="hmstop" style="display:none">■ Done</button></div>
        <p class="muted small">Tempo ♩ = <b id="hmbv">${st.bpm}</b> <input type="range" id="hmb" min="50" max="140" value="${st.bpm}" aria-label="Tempo"> · one bar of clicks first, then hum</p><p class="muted small" id="hmst"></p></div>
      <div class="card" id="hmout"><p class="muted small">Your line appears here.</p></div>${MICNOTE}`;
    $('#hmb').oninput = e => { st.bpm = +e.target.value; $('#hmbv').textContent = st.bpm; lset('hum', st); };
    let notes = null;
    const render = (ns, key) => { notes = ns; const spell = m => T.parse(T.spell.midiName(m, T.spell.inKey(m % 12, key, false)));
      const durName = q => ({ 0.5: '♪', 1: '♩', 1.5: '♩.', 2: '𝅗𝅥', 3: '𝅗𝅥.', 4: '𝅝' }[q] || q + ' beats');
      const chunks = []; for (let i = 0; i < ns.length; i += 8) chunks.push(ns.slice(i, i + 8));
      const clef = mean(ns.map(n => n.m)) < 57 ? 'bass' : 'treble';
      $('#hmout').innerHTML = `<h3>${h(T.spell.MAJ[key])} major · ${ns.length} notes</h3>${chunks.map(c => `<div class="x27-staff">${UI.staff(c.map(n => ({ notes: [spell(n.m)], label: durName(n.q) })), { clef, keySig: KSIG[key], evW: 40 })}</div>`).join('')}
        <p class="muted small">${h(ns.map(n => T.name(spell(n.m), true)).join(' '))}</p><div class="row"><button class="btn" id="hmplay">▶︎ Play it back</button></div>
        <p class="muted small">Rhythm is rounded to the nearest eighth note at your tempo, so it’s a sketch. Pitches are what you sang, snapped to the nearest note.</p>`;
      $('#hmplay').onclick = () => { Audio.stopAll(); Audio.ensure(); const q = 60 / st.bpm; let t = 0; ns.forEach(n => { Audio.playMidi(n.m, t, n.q * q * 0.95); t += n.q * q; }); }; };
    $('#hmgo').onclick = async () => {
      if (!(await M.start())) { $('#hmst').textContent = MICERR; return; } const q = 60 / st.bpm; const c = Audio.ensure(); for (let i = 0; i < 4; i++) Audio.click(i * q, i === 0);
      $('#hmgo').style.display = 'none'; $('#hmstop').style.display = ''; const t0 = c.currentTime + 4 * q + 0.03, fr = []; let done = false;
      $('#hmstop').onclick = () => { done = true; };
      loop(v.firstElementChild, () => { const f = M.frame(), now = Audio.ctx ? Audio.ctx.currentTime : 0; if (!f) return false;
        if (now < t0) { $('#hmph').textContent = 'count-in… ' + (4 - Math.floor((now - (t0 - 4 * q)) / q)); return; }
        $('#hmph').textContent = `recording · ${(now - t0).toFixed(1)} s`; fr.push({ t: now - t0, m: f.p && f.p.clarity > 0.7 && f.rms > 0.012 ? f.p.midi + f.p.cents / 100 : null });
        if (done || now - t0 > 30) { M.stop(); $('#hmgo').style.display = ''; $('#hmstop').style.display = 'none'; $('#hmph').textContent = 'ready';
          // smooth pitch with a 5-frame median, then group runs of the same note
          const med = fr.map((x, i) => { const w = fr.slice(Math.max(0, i - 2), i + 3).map(y => y.m).filter(y => y != null); if (x.m == null || w.length < 3) return null; w.sort((a, b) => a - b); return Math.round(w[w.length >> 1]); });
          const segs = []; let cur = null;
          med.forEach((m, i) => { const t = fr[i].t; if (m == null) { if (cur) { cur.e = t; segs.push(cur); cur = null; } return; } if (cur && m === cur.m) { cur.e = t; return; } if (cur) { cur.e = t; segs.push(cur); } cur = { m, s: t, e: t }; });
          if (cur) segs.push(cur);
          const ns = segs.filter(s => s.e - s.s >= 0.1);
          // merge tiny gaps: a note lasts until the next one starts (legato humming), rest of last note = its own length
          const out = ns.map((s, i) => { const len = (i < ns.length - 1 ? Math.min(ns[i + 1].s, s.e + 0.25) : s.e) - s.s; return { m: s.m, q: clamp(Math.round(len / q * 2) / 2, 0.5, 4) }; });
          if (out.length < 2) { $('#hmst').textContent = 'Didn’t catch a tune. Hum a little louder, “doo” or “la” works best.'; return false; }
          const key = guessKey(out.map(n => n.m), out.map(n => n.q)); render(out, key);
          st.saved = (st.saved || []).concat([{ t: Date.now(), k: key, n: out.slice(0, 64) }]).slice(-10); lset('hum', st); return false; } });
    };
    const last = st.saved && st.saved[st.saved.length - 1]; if (last) render(last.n, last.k);
  };

  /* ---------- 14. Range chart ---------- */
  routes.range = v => {
    const L = ls('range', []);
    const opts = cur => Array.from({ length: 61 }, (_, i) => 28 + i).map(m => `<option value="${m}"${m === cur ? ' selected' : ''}>${NM(m)}</option>`).join('');
    const lastE = L[L.length - 1] || { lo: 55, hi: 74 };
    v.innerHTML = `${back}<h2>📏 Range chart</h2><p class="muted intro">Log your lowest and highest usable notes (ones you can hold for a second with a decent sound) and watch your range grow month by month.</p>
      <div class="card"><div class="x29-phase" id="rgph">test with the mic, or pick the notes</div>
        <div class="row x29-c"><button class="btn" id="rglo">🎤 Lowest note</button><button class="btn" id="rghi">🎤 Highest note</button></div>
        <div class="row nn-row"><label class="muted small">Low <select id="rgl">${opts(lastE.lo)}</select></label><label class="muted small">High <select id="rgh">${opts(lastE.hi)}</select></label><button class="btn ghost sm" id="rgsave">Save today</button></div>
        <p class="muted small" id="rgst">Concert pitch (what the mic hears). On a B♭ trumpet, written C is concert B♭.</p></div>
      <div class="card"><h3>Your range over time</h3><div id="rgch"></div></div>${MICNOTE}`;
    const chart = () => { if (!L.length) { $('#rgch').innerHTML = '<p class="muted small">Save your first range to start the chart.</p>'; return; }
      const lo = Math.min(...L.map(e => e.lo)) - 2, hi = Math.max(...L.map(e => e.hi)) + 2, W = 340, H = 240, pad = 40, n = L.length, bw = Math.min(26, (W - pad - 10) / n - 4);
      const y = m => 10 + (hi - m) / (hi - lo) * (H - 30);
      let s = `<svg class="x29-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Range over time">`;
      for (let m = Math.ceil(lo); m <= hi; m++) if (m % 12 === 0) s += `<line x1="${pad}" x2="${W}" y1="${y(m)}" y2="${y(m)}" class="gl"/><text x="2" y="${y(m) + 4}" class="tl">${NM(m)}</text>`;
      L.forEach((e, i) => { const x = pad + 6 + i * ((W - pad - 10) / n); s += `<rect x="${x}" y="${y(e.hi)}" width="${bw}" height="${Math.max(3, y(e.lo) - y(e.hi))}" rx="5" class="rb"/><text x="${x + bw / 2}" y="${H - 4}" class="tl" text-anchor="middle">${new Date(e.t).getMonth() + 1}/${new Date(e.t).getDate()}</text>`; });
      s += '</svg>'; const f = L[0], z = L[L.length - 1];
      $('#rgch').innerHTML = s + `<p class="muted small">Now ${NM(z.lo)}–${NM(z.hi)} (${z.hi - z.lo} semitones)${L.length > 1 ? ` · since ${new Date(f.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${z.hi - z.lo - (f.hi - f.lo) >= 0 ? '+' : ''}${z.hi - z.lo - (f.hi - f.lo)} semitones` : ''}</p>`; };
    chart();
    $('#rgsave').onclick = () => { const lo = +$('#rgl').value, hi = +$('#rgh').value; if (hi <= lo) return toast('High has to be above low'); const d = new Date().toDateString(); const i = L.findIndex(e => new Date(e.t).toDateString() === d); const e = { t: Date.now(), lo, hi }; if (i >= 0) L[i] = e; else L.push(e); lset('range', L.slice(-200)); toast('Range saved'); chart(); };
    const test = async which => { if (!(await M.start())) { $('#rgst').textContent = MICERR; return; } $('#rgph').textContent = `play your ${which === 'lo' ? 'lowest' : 'highest'} usable note and hold it`; let cand = null, since = 0, t0 = performance.now() / 1000;
      loop(v.firstElementChild, () => { const f = M.frame(), now = performance.now() / 1000; if (!f) return false;
        if (sounding(f)) { if (cand !== f.p.midi) { cand = f.p.midi; since = now; } $('#rgph').textContent = `hearing ${NM(cand)} · ${(now - since).toFixed(1)} s`; if (now - since >= 1) { M.stop(); $('#rg' + (which === 'lo' ? 'l' : 'h')).value = clamp(cand, 28, 88); $('#rgph').textContent = `${which === 'lo' ? 'lowest' : 'highest'}: ${NM(cand)}. Tap Save today when both are set.`; return false; } }
        else cand = null;
        if (now - t0 > 30) { M.stop(); $('#rgph').textContent = 'didn’t catch a held note, try again'; return false; } }); };
    $('#rglo').onclick = () => test('lo'); $('#rghi').onclick = () => test('hi');
  };

  /* ---------- 17. Nerves sim ---------- */
  function crowd(level) { // a synthesized audience: murmur, the odd cough and creak. No audio files, nothing downloaded.
    const c = Audio.ensure(), len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let b = 0;
    for (let i = 0; i < len; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = b * 4; }
    const out = c.createGain(); out.gain.value = 0.0001; out.connect(c.destination); out.gain.exponentialRampToValueAtTime(0.25 * level + 0.02, c.currentTime + 1.5);
    const voices = [320, 520, 800, 1200].map(fq => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = Math.random(); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = 1.2; const g = c.createGain(); g.gain.value = 0.5;
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.2 + Math.random() * 0.5; lg.gain.value = 0.35; lfo.connect(lg); lg.connect(g.gain); lfo.start(); s.connect(bp); bp.connect(g); g.connect(out); s.start(c.currentTime, Math.random()); return [s, lfo]; });
    let alive_ = true;
    const event = () => { if (!alive_ || !Audio.ctx) return; const cc = Audio.ctx, t = cc.currentTime + 0.05, s = cc.createBufferSource(); s.buffer = buf; const bp = cc.createBiquadFilter(), g = cc.createGain();
      const cough = Math.random() < 0.6; bp.type = 'bandpass'; bp.frequency.value = cough ? 900 + Math.random() * 600 : 140 + Math.random() * 80; bp.Q.value = cough ? 2 : 6;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((cough ? 1.4 : 0.8) * (0.4 + level), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + (cough ? 0.35 : 0.6));
      s.connect(bp); bp.connect(g); g.connect(cc.destination); s.start(t, Math.random()); s.stop(t + 0.8);
      setTimeout(event, (3 + Math.random() * 9) / (0.4 + level) * 1000); };
    setTimeout(event, 2500);
    return { stop() { alive_ = false; try { voices.forEach(([s, l]) => { s.stop(); l.stop(); }); out.disconnect(); } catch (e) {} } };
  }
  routes.nerves = v => {
    const st = Object.assign({ level: 0.5, secs: 45, hist: [] }, ls('nerves', {}));
    v.innerHTML = `${back}<h2>🎭 Nerves sim</h2><p class="muted intro">Play your piece over a restless audience: murmur, coughs, creaks. Cadence listens and grades how steady you stayed.</p>
      <div class="card center"><div class="x29-phase" id="nvph">put headphones in, then start</div><div class="x29-big" id="nvg">—</div><div id="nvd" class="muted small"></div>
        <div class="row x29-c"><button class="btn" id="nvgo">🎤 Start performance</button></div><p class="muted small" id="nvst"></p></div>
      <div class="card x27-set"><label>Audience <b id="nvlv">${st.level < 0.34 ? 'polite' : st.level < 0.67 ? 'restless' : 'rowdy'}</b><input type="range" id="nvl" min="0" max="100" value="${Math.round(st.level * 100)}" aria-label="Audience noise"></label>
        <label>Length <b id="nvsv">${st.secs} s</b><input type="range" id="nvs" min="20" max="180" step="5" value="${st.secs}" aria-label="Performance length"></label>
        <p class="muted small">Graded on pitch steadiness while you hold notes, steady volume, and not stopping. Headphones matter: without them the mic hears the crowd too. The crowd is generated on your phone.</p></div>
      ${st.hist.length ? `<div class="card"><h3>Past runs</h3>${st.hist.slice(-8).reverse().map(r => `<div class="x27-item"><span><b>${h(r.g)}</b> ${r.s} s · ${h(r.lv)}</span><small>${new Date(r.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></div>`).join('')}</div>` : ''}${MICNOTE}`;
    $('#nvl').oninput = e => { st.level = +e.target.value / 100; $('#nvlv').textContent = st.level < 0.34 ? 'polite' : st.level < 0.67 ? 'restless' : 'rowdy'; lset('nerves', st); };
    $('#nvs').oninput = e => { st.secs = +e.target.value; $('#nvsv').textContent = st.secs + ' s'; lset('nerves', st); };
    $('#nvgo').onclick = async () => {
      if (!(await M.start())) { $('#nvst').textContent = MICERR; return; } $('#nvgo').disabled = true; const cr = crowd(st.level);
      const t0 = performance.now() / 1000 + 3; let note = null; const devs = [], dbs = []; let stops = 0, silentSince = 0, started = false, lastOn = 0;
      loop(v.firstElementChild, () => { const f = M.frame(), now = performance.now() / 1000; if (!f) { cr.stop(); return false; }
        if (now < t0) { $('#nvph').textContent = 'the audience settles… ' + Math.ceil(t0 - now); return; }
        const el = now - t0; $('#nvph').textContent = `playing · ${Math.ceil(st.secs - el)} s left`;
        if (sounding(f)) { started = true; lastOn = now; dbs.push(f.db); if (silentSince && now - silentSince > 1.5) stops++; silentSince = 0;
          const mf = f.p.midi + f.p.cents / 100; if (note && Math.abs(mf - note.ref) < 0.6) { note.c.push(mf); } else { if (note && note.c.length > 15) devs.push(sd(note.c.slice(5)) * 100); note = { ref: mf, c: [mf] }; } }
        else if (started && !silentSince && now - lastOn > 0.2) silentSince = now;
        if (el >= st.secs) { cr.stop(); M.stop(); $('#nvgo').disabled = false; if (note && note.c.length > 15) devs.push(sd(note.c.slice(5)) * 100);
          if (!started || dbs.length < 30) { $('#nvph').textContent = 'didn’t hear much playing, try again'; return false; }
          const wob = devs.length ? mean(devs) : 15, vol = sd(dbs);
          const score = clamp(100 - Math.max(0, wob - 4) * 3 - Math.max(0, vol - 4) * 2.5 - stops * 8, 0, 100), g = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'E';
          $('#nvg').textContent = g; $('#nvph').textContent = g <= 'B' ? 'steady under pressure' : 'the crowd got to you a bit';
          $('#nvd').textContent = `pitch wobble ${wob.toFixed(1)}¢ on held notes · volume swing ${vol.toFixed(1)} dB · ${stops} stop${stops === 1 ? '' : 's'}`;
          st.hist.push({ t: Date.now(), g, s: st.secs, lv: $('#nvlv').textContent }); st.hist = st.hist.slice(-50); lset('nerves', st); return false; } });
    };
  };

  const TOOLS = [['#breath', '🫁 Breath pacer', 'a guide bar sized to your lungs for long tones', 0], ['#ladder', '🪜 Long-tone ladder', 'hold the note, climb 2 seconds a rung', 0],
    ['#drift', '📈 Intonation drift', 'cents sharp or flat on every held note, live', 0], ['#rubato', '🌊 Rubato metronome', 'a click that follows your tempo', 0],
    ['#fatigue', '🪫 Tone fatigue check', 'tells you when your tone starts to thin', 0], ['#hum', '🎶 Hum to notation', 'hum a line, see it on the staff', 0],
    ['#range', '📏 Range chart', 'your lowest and highest notes over months', 0], ['#nerves', '🎭 Nerves sim', 'play to a noisy crowd, graded on steadiness', 0]];
  window.CAD_TOOL_SECTIONS = (window.CAD_TOOL_SECTIONS || []).concat([['Play & listen', TOOLS]]);
  window.CadX29 = { M, routes: TOOLS.map(t => t[0].slice(1)) };
})();
