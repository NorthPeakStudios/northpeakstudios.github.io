// Cadence 1.9 · plan-and-track tools (all free, all saved on this phone): Instant flip, Passage locker, Sight-read sprint + Mistake heat map,
// Warm-up generator, Concert program, Practice journal (auto-split), and Takes (your recordings: slow-mo replay, A/B vs a reference,
// play-along mixer, tone colour palette). Recordings stay in this browser's storage (IndexedDB) and are never uploaded. Original Northpeak code.
(() => {
  const back = '<a class="back" href="#tools">← Tools</a>';
  const alive = el => el && document.body.contains(el);
  const ls = (k, d) => { try { const v = localStorage.getItem('cad.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lset = (k, v) => { try { localStorage.setItem('cad.' + k, JSON.stringify(v)); } catch (e) {} };
  const h = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const KS = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5]; // sharps(+)/flats(−) of each major key, by tonic pitch class
  const DEG = [0, 2, 4, 5, 7, 9, 11];
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const spellIn = (m, key) => T.parse(T.spell.midiName(m, T.spell.inKey(((m % 12) + 12) % 12, key, false)));
  const plogAdd = (min, what) => { const L = ls('plog', []); L.push({ t: Date.now(), min: clamp(Math.round(min), 1, 600), what: String(what || '').slice(0, 80) }); lset('plog', L.slice(-1500)); };

  /* ---------- 4. Instant flip (transposition in one tap) ---------- */
  const PARTS = { 'B♭ trumpet': [2, 'B♭ trumpet'], 'Flute': [0, null], 'B♭ clarinet': [2, 'B♭ clarinet'], 'E♭ alto sax': [9, 'E♭ alto sax'], 'B♭ tenor sax': [2, 'B♭ tenor sax'], 'F horn': [7, 'F horn'], 'Oboe / violin / piano (C)': [0, null] };
  const toConcert = (n, p) => PARTS[p][1] ? T.writtenToConcert(n, PARTS[p][1]) : n;
  const toWritten = (n, p) => PARTS[p][1] ? T.concertToWritten(n, PARTS[p][1]) : n;
  routes.flip = v => {
    const st = Object.assign({ notes: 'G4 A4 B4 C5 D5 C5 B4 A4 G4', key: 7, from: 'B♭ trumpet', to: 'Flute', showing: 'from' }, ls('flip', {}));
    const save = () => lset('flip', st);
    const opt = cur => Object.keys(PARTS).map(p => `<option${p === cur ? ' selected' : ''}>${h(p)}</option>`).join('');
    v.innerHTML = `${back}<h2>🔁 Instant flip</h2><p class="muted intro">Type a part once. One tap flips it between instruments, key signature and all. Trumpet ⇄ flute is the classic.</p>
      <div class="card"><label class="muted small">Notes (as written for the first instrument)</label><input class="inp" id="fpn" value="${h(st.notes)}" aria-label="Notes" autocomplete="off" autocapitalize="characters" spellcheck="false">
        <div class="row nn-row"><label class="muted small">Key <select id="fpk">${T.spell.MAJ.map((k, i) => `<option value="${i}"${i === st.key ? ' selected' : ''}>${k} major</option>`).join('')}</select></label></div>
        <div class="row nn-row"><select id="fpa" aria-label="Written for">${opt(st.from)}</select><span>⇄</span><select id="fpb" aria-label="Flip to">${opt(st.to)}</select></div></div>
      <div class="card center"><button class="btn big block" id="fpgo"></button><div id="fpout"></div><div class="row x29-c"><button class="btn ghost sm" id="fpplay">▶︎ Hear it (concert pitch)</button></div></div>`;
    const keyName = k => T.spell.MAJ[((k % 12) + 12) % 12];
    const draw = () => {
      let ns; try { ns = st.notes.trim().split(/[\s,]+/).filter(Boolean).map(x => { const n = T.parse(x.replace(/^([a-g])/, c => c.toUpperCase())); if (!n) throw x; return n; }); } catch (x) { $('#fpout').innerHTML = `<p class="warn">Couldn’t read “${h(x)}”. Use notes like Bb4 F#5 C5.</p>`; return; }
      if (!ns.length) { $('#fpout').innerHTML = ''; return; }
      const a = st.from, b = st.to, cur = st.showing === 'from' ? a : b, other = cur === a ? b : a;
      const concert = ns.map(n => toConcert(n, a)), out = cur === a ? ns : concert.map(n => toWritten(n, b));
      const ck = st.key - PARTS[a][0], k = ck + PARTS[cur][0];
      const mids = out.map(T.midi), lo = Math.min(...mids), hi = Math.max(...mids);
      const range = { 'Flute': [60, 96], 'B♭ trumpet': [54, 84], 'B♭ clarinet': [52, 91], 'E♭ alto sax': [58, 89], 'B♭ tenor sax': [58, 89], 'F horn': [54, 84] }[cur];
      $('#fpgo').textContent = `Flip to ${other}`;
      $('#fpout').innerHTML = `<h3>${h(cur)} part · ${h(keyName(k))} major</h3><div class="x27-staff">${UI.staff(out.map(n => ({ notes: [n], label: T.name(n) })), { clef: lo < 55 ? 'bass' : 'treble', keySig: KS[((k % 12) + 12) % 12], evW: 36 })}</div>
        <p class="muted small">${h(out.map(n => T.name(n, true)).join(' '))}</p>${range && (lo < range[0] || hi > range[1]) ? `<p class="warn small">Some notes sit outside a typical ${h(cur.toLowerCase())} range. Try the octave button.</p><button class="btn ghost sm" id="fpoct">${lo < range[0] ? 'Up' : 'Down'} an octave</button>` : ''}`;
      if ($('#fpoct')) $('#fpoct').onclick = () => { const dir = lo < range[0] ? 1 : -1; st.notes = ns.map(n => T.name(Object.assign({}, n, { o: n.o + dir }), true).replace('♯', '#').replace('♭', 'b')).join(' '); $('#fpn').value = st.notes; save(); draw(); };
      $('#fpplay').onclick = () => { Audio.stopAll(); Audio.ensure(); concert.forEach((n, i) => Audio.playMidi(T.midi(n), i * 0.45, 0.42)); };
    };
    $('#fpgo').onclick = () => { st.showing = st.showing === 'from' ? 'to' : 'from'; save(); draw(); };
    $('#fpn').oninput = e => { st.notes = e.target.value.slice(0, 400); st.showing = 'from'; save(); draw(); };
    $('#fpk').onchange = e => { st.key = +e.target.value; save(); draw(); };
    $('#fpa').onchange = e => { st.from = e.target.value; st.showing = 'from'; save(); draw(); };
    $('#fpb').onchange = e => { st.to = e.target.value; save(); draw(); };
    draw();
  };

  /* ---------- 6. Passage locker ---------- */
  function parsePassage(text) { // "C5 D5 E5 F5 | G5:2 G5:2" → bars of {n, b (beats)}; "r" or "r:2" is a rest
    return String(text).split('|').map(bar => bar.trim().split(/\s+/).filter(Boolean).map(tok => { const [nn, bb] = tok.split(':'); const b = bb ? clamp(parseFloat(bb) || 1, 0.25, 8) : 1;
      if (/^r$/i.test(nn)) return { n: null, b }; const n = T.parse(nn.replace(/^([a-g])/, c => c.toUpperCase())); if (!n) throw tok; return { n, b }; })).filter(b => b.length);
  }
  routes.passage = v => {
    const st = Object.assign({ text: 'E4 G4 C5 E5 | D5:2 B4:2 | C5 A4 F4 A4 | G4:4', key: 0, bpm: 72, lock: 1, reps: 4, climb: 0, notes: true }, ls('passage', {}));
    const save = () => lset('passage', st);
    v.innerHTML = `${back}<h2>🔒 Passage locker</h2><p class="muted intro">Paste the tricky passage, tap the bar that keeps tripping you, and loop just that bar with a count-in.</p>
      <div class="card"><label class="muted small">Notes, bars split with |  ·  add :2 for 2 beats, :0.5 for an eighth, r for a rest</label><textarea class="inp" id="pst" rows="3" aria-label="Passage" spellcheck="false">${h(st.text)}</textarea>
        <div class="row nn-row"><label class="muted small">Key <select id="psk">${T.spell.MAJ.map((k, i) => `<option value="${i}"${i === st.key ? ' selected' : ''}>${k} major</option>`).join('')}</select></label></div></div>
      <div id="psbars"></div>
      <div class="card x27-set"><label>Tempo <b id="psbv">${st.bpm}</b><input type="range" id="psb" min="30" max="200" value="${st.bpm}" aria-label="Tempo"></label>
        <label>Loops <b id="psrv">${st.reps}</b><input type="range" id="psr" min="1" max="20" value="${st.reps}" aria-label="Loops"></label>
        <label>Speed up each loop <b id="pscv">${st.climb ? '+' + st.climb + ' BPM' : 'off'}</b><input type="range" id="psc" min="0" max="6" value="${st.climb}" aria-label="Speed up each loop"></label>
        <label class="x29-chk"><input type="checkbox" id="psn"${st.notes ? ' checked' : ''}> Play the notes too (off = clicks only, you play)</label>
        <div class="row x29-c"><button class="btn" id="psgo">▶︎ Loop bar ${st.lock}</button></div><div class="muted small center" id="psst"></div></div>`;
    let bars = [], playing = null;
    const draw = () => {
      try { bars = parsePassage(st.text); } catch (x) { $('#psbars').innerHTML = `<div class="card"><p class="warn">Couldn’t read “${h(x)}”. Use notes like Bb4 F#5, with :2 for longer notes.</p></div>`; bars = []; return; }
      st.lock = clamp(st.lock, 1, Math.max(1, bars.length));
      $('#psbars').innerHTML = `<div class="x29-bars">${bars.map((b, i) => { const ns = b.filter(e => e.n); const lo = ns.length ? Math.min(...ns.map(e => T.midi(e.n))) : 60;
        return `<button class="card x29-barc${i + 1 === st.lock ? ' on' : ''}" data-i="${i + 1}" aria-label="Bar ${i + 1}"><small>bar ${i + 1}${i + 1 === st.lock ? ' · 🔒' : ''} · ${b.reduce((s, e) => s + e.b, 0)} beats</small>${ns.length ? UI.staff(ns.map(e => ({ notes: [e.n], label: e.b === 1 ? '' : String(e.b) })), { clef: lo < 55 ? 'bass' : 'treble', keySig: KS[st.key], evW: 34 }) : '<p class="muted">rest</p>'}</button>`; }).join('')}</div>`;
      v.querySelectorAll('.x29-barc').forEach(b => b.onclick = () => { st.lock = +b.dataset.i; save(); $('#psgo').textContent = '▶︎ Loop bar ' + st.lock; draw(); });
      $('#psgo').textContent = playing ? '■ Stop' : '▶︎ Loop bar ' + st.lock;
    };
    $('#pst').oninput = e => { st.text = e.target.value.slice(0, 2000); save(); draw(); };
    $('#psk').onchange = e => { st.key = +e.target.value; save(); draw(); };
    $('#psb').oninput = e => { st.bpm = +e.target.value; $('#psbv').textContent = st.bpm; save(); };
    $('#psr').oninput = e => { st.reps = +e.target.value; $('#psrv').textContent = st.reps; save(); };
    $('#psc').oninput = e => { st.climb = +e.target.value; $('#pscv').textContent = st.climb ? '+' + st.climb + ' BPM' : 'off'; save(); };
    $('#psn').onchange = e => { st.notes = e.target.checked; save(); };
    $('#psgo').onclick = () => {
      if (playing) { playing = null; Audio.stopAll(); $('#psst').textContent = ''; draw(); return; }
      const bar = bars[st.lock - 1]; if (!bar) return; const beats = Math.max(1, Math.ceil(bar.reduce((s, e) => s + e.b, 0)));
      Audio.stopAll(); Audio.ensure(); const me = {}; playing = me; let rep = 0, bpm = st.bpm;
      const q0 = 60 / bpm; for (let i = 0; i < beats; i++) Audio.click(i * q0, i === 0); // count-in: one bar of clicks
      $('#psst').textContent = 'count-in…'; $('#psgo').textContent = '■ Stop';
      const one = startIn => { if (playing !== me || !alive($('#psgo'))) return; if (rep >= st.reps) { playing = null; $('#psst').textContent = `done · ${st.reps} loops${st.climb ? ', ended at ' + (bpm - st.climb) + ' BPM' : ''}`; draw(); return; }
        const q = 60 / bpm; for (let i = 0; i < beats; i++) Audio.click(startIn + i * q, i === 0);
        if (st.notes) { let t = startIn; bar.forEach(e => { if (e.n) Audio.playMidi(T.midi(e.n), t, e.b * q * 0.92); t += e.b * q; }); }
        rep++; const thisBpm = bpm; setTimeout(() => { if (playing === me) $('#psst').textContent = `loop ${rep} of ${st.reps} · ${thisBpm} BPM`; }, startIn * 1000);
        bpm = clamp(bpm + st.climb, 30, 240); setTimeout(() => one(0.05), (startIn + beats * q - 0.05) * 1000); };
      one(beats * q0);
    };
    draw();
  };

  /* ---------- 19. Sight-read sprint + 7. Mistake heat map ---------- */
  const GRADES = [null, { keys: [0, 7, 5], jump: 1, lo: 2, hi: 9, n: '1 · C, G, F · steps' }, { keys: [0, 7, 5, 2, 10], jump: 2, lo: 1, hi: 10, n: '2 · up to 2 ♯/♭ · skips' },
    { keys: [0, 7, 5, 2, 10, 9, 3, 4, 8], jump: 4, lo: 0, hi: 11, n: '3 · up to 4 ♯/♭ · leaps' }, { keys: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], jump: 7, lo: -2, hi: 13, n: '4 · any key · ledger lines' },
    { keys: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], jump: 7, lo: -2, hi: 13, bass: true, n: '5 · any key · treble + bass' }];
  const INTN = ['unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'octave'];
  const ksLabel = k => { const s = KS[k]; return T.spell.MAJ[k] + ' · ' + (s ? Math.abs(s) + (s > 0 ? '♯' : '♭') : 'no ♯/♭'); };
  routes.sprint = v => {
    const st = Object.assign({ grade: 1, best: 0, bestStreak: 0, days: [], runs: [] }, ls('sprint', {}));
    const heat = Object.assign({ keys: {}, ints: {} }, ls('heat', {}));
    const force = ls('sprintKey', null); if (force != null) lset('sprintKey', null);
    v.innerHTML = `${back}<h2>⚡ Sight-read sprint</h2><p class="muted intro">60 seconds. Read each 2-bar excerpt and tap the note letters in order (the key signature counts). Clean excerpts build your streak.</p>
      <div class="card"><div class="nn-seg sm" id="spg">${[1, 2, 3, 4, 5].map(g => `<button data-g="${g}" class="${g === st.grade ? 'on' : ''}" aria-label="Grade ${g}">G${g}</button>`).join('')}</div><p class="muted small" id="spgn">Grade ${h(GRADES[st.grade].n)}${force != null ? ` · this sprint: ${h(ksLabel(force))}` : ''}</p>
        <div class="x29-sphud"><span>⏱ <b id="spt">60</b></span><span>✓ <b id="sps">0</b></span><span>🔥 <b id="spk">0</b></span></div>
        <div id="spx"><p class="muted center">Best: ${st.best} excerpts · best streak ${st.bestStreak}${st.days.length ? ` · ${dayRun(st.days)}-day run` : ''}</p></div>
        <div class="x29-letters" id="spl">${'CDEFGAB'.split('').map((c, i) => `<button data-l="${i}" disabled>${c}</button>`).join('')}</div>
        <div class="row x29-c"><button class="btn" id="spgo">▶︎ Start sprint</button><a class="btn ghost sm" href="#heat">🔥 Heat map</a></div></div>`;
    function dayRun(days) { let n = 0; const d = new Date(); for (;;) { const s = d.toLocaleDateString('en-CA'); if (days.includes(s)) { n++; d.setDate(d.getDate() - 1); } else if (n === 0 && s === new Date().toLocaleDateString('en-CA')) { d.setDate(d.getDate() - 1); if (!days.includes(d.toLocaleDateString('en-CA'))) return 0; } else return n; } }
    v.querySelectorAll('#spg [data-g]').forEach(b => b.onclick = () => { if (run) return; st.grade = +b.dataset.g; lset('sprint', st); v.querySelectorAll('#spg button').forEach(x => x.classList.toggle('on', x === b)); $('#spgn').textContent = 'Grade ' + GRADES[st.grade].n; });
    let run = null;
    const gen = () => { const G = GRADES[st.grade], key = force != null ? force : G.keys[Math.floor(Math.random() * G.keys.length)], clef = G.bass && Math.random() < 0.5 ? 'bass' : 'treble';
      // diatonic steps on the staff: 0 = bottom line (E4 treble / G2 bass)
      const base = clef === 'treble' ? { l: 2, o: 4 } : { l: 4, o: 2 }; let d = G.lo + Math.floor(Math.random() * (G.hi - G.lo + 1)); const out = [d];
      for (let i = 1; i < 8; i++) { let j; do { j = Math.round((Math.random() * 2 - 1) * G.jump); } while (j === 0 || d + j < G.lo || d + j > G.hi); d += j; out.push(d); }
      // letters on the staff are fixed; the key signature decides the accidental: rebuild each note from its letter + the key
      const fixed = out.map(dd => { const di = base.l + dd, l = ((di % 7) + 7) % 7, o = base.o + Math.floor(di / 7); const sc = T.spell.keyScale(key, false).map(x => T.parse(x)); const n = sc.find(x => x.l === l); return { l, a: n ? n.a : 0, o }; });
      return { key, clef, notes: fixed, steps: out }; };
    const show = () => { const x = run.ex; $('#spx').innerHTML = `<p class="muted small center">${h(ksLabel(x.key))}</p><div class="x27-staff">${UI.staff(x.notes.map((n, i) => ({ notes: [n], label: i < run.pos ? T.name(n).charAt(0) : '' })), { clef: x.clef, keySig: KS[x.key], evW: 34, timeSig: [4, 4] })}</div>`; };
    const next = () => { run.ex = gen(); run.pos = 0; run.clean = true; run.tried = new Set(); show(); };
    const tally = (key, ok, intv) => { const K = heat.keys[key] || { n: 0, m: 0 }; K.n++; if (!ok) K.m++; heat.keys[key] = K; if (intv) { const I = heat.ints[intv] || { n: 0, m: 0 }; I.n++; if (!ok) I.m++; heat.ints[intv] = I; } };
    v.querySelectorAll('#spl [data-l]').forEach(b => b.onclick = () => { if (!run) return; const x = run.ex, n = x.notes[run.pos], ok = +b.dataset.l === n.l;
      if (!run.tried.has(run.pos)) { run.tried.add(run.pos); const p = x.steps[run.pos - 1], intv = run.pos ? `${INTN[Math.min(7, Math.abs(x.steps[run.pos] - p))]} ${x.steps[run.pos] > p ? 'up' : x.steps[run.pos] < p ? 'down' : ''}`.trim() : null; tally(x.key, ok, intv); }
      b.classList.add(ok ? 'ok' : 'bad'); setTimeout(() => b.classList.remove('ok', 'bad'), 180);
      if (!ok) { run.clean = false; run.streak = 0; $('#spk').textContent = 0; return; }
      Audio.playMidi(T.midi(n), 0, 0.35, 0.5); run.pos++;
      if (run.pos >= x.notes.length) { if (run.clean) { run.score++; run.streak++; st.bestStreak = Math.max(st.bestStreak, run.streak); } $('#sps').textContent = run.score; $('#spk').textContent = run.streak; next(); } else show(); });
    $('#spgo').onclick = () => { if (run) return; Audio.ensure(); run = { score: 0, streak: 0, end: Date.now() + 60000 }; v.querySelectorAll('#spl button').forEach(b => b.disabled = false); $('#spgo').disabled = true; next();
      const tick = () => { if (!run || !alive($('#spt'))) return; const left = Math.max(0, Math.ceil((run.end - Date.now()) / 1000)); $('#spt').textContent = left;
        if (left <= 0) { const r = run; run = null; v.querySelectorAll('#spl button').forEach(b => b.disabled = true); $('#spgo').disabled = false; $('#spgo').textContent = '↻ Again';
          const today = new Date().toLocaleDateString('en-CA'); if (!st.days.includes(today)) st.days = st.days.concat([today]).slice(-400);
          const pb = r.score > st.best; st.best = Math.max(st.best, r.score); st.runs = st.runs.concat([{ t: Date.now(), g: st.grade, s: r.score }]).slice(-200); lset('sprint', st); lset('heat', heat);
          $('#spx').innerHTML = `<p class="center"><b>${r.score}</b> clean excerpt${r.score === 1 ? '' : 's'}${pb ? ' · new best!' : ''}</p><p class="muted small center">best streak ${st.bestStreak} · ${dayRun(st.days)}-day run · <a href="#heat">see what you missed →</a></p>`; return; }
        setTimeout(tick, 250); }; tick(); };
  };
  routes.heat = v => {
    const heat = Object.assign({ keys: {}, ints: {} }, ls('heat', {}));
    const col = c => !c || c.n < 3 ? 'rgba(127,127,127,.15)' : `hsla(${Math.round(120 - clamp(c.m / c.n * 3, 0, 1) * 120)},70%,45%,.85)`;
    const pct = c => c && c.n >= 3 ? Math.round(c.m / c.n * 100) + '% missed' : c && c.n ? 'few tries' : 'no data';
    const order = [6, 11, 4, 9, 2, 7, 0, 5, 10, 3, 8, 1]; // 6♯ … C … 6♭ around the circle of fifths
    const ints = ['2nd up', '2nd down', '3rd up', '3rd down', '4th up', '4th down', '5th up', '5th down', '6th up', '6th down', '7th up', '7th down', 'octave up', 'octave down'];
    const st = (typeof S !== 'undefined' && S.get) ? S.get() : { errors: {} }, errs = Object.entries(st.errors || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const worst = Object.entries(heat.keys).filter(([, c]) => c.n >= 3).sort((a, b) => b[1].m / b[1].n - a[1].m / a[1].n)[0];
    v.innerHTML = `${back}<h2>🔥 Mistake heat map</h2><p class="muted intro">Where your reading slips. Green is solid, red is where the mistakes live. Fed by your sight-read sprints.</p>
      <div class="card"><h3>Key signatures</h3><div class="x29-heat k">${order.map(k => `<div style="background:${col(heat.keys[k])}"><b>${h(T.spell.MAJ[k])}</b><small>${KS[k] ? Math.abs(KS[k]) + (KS[k] > 0 ? '♯' : '♭') : '0'}</small><small>${pct(heat.keys[k])}</small></div>`).join('')}</div></div>
      <div class="card"><h3>Intervals</h3><div class="x29-heat i">${ints.map(i => `<div style="background:${col(heat.ints[i])}"><b>${i}</b><small>${pct(heat.ints[i])}</small></div>`).join('')}</div></div>
      ${errs.length ? `<div class="card"><h3>From your theory drills</h3>${errs.map(([g, n]) => `<div class="x27-item"><span>${h(g.replace(/-/g, ' '))}</span><small>${n} missed</small></div>`).join('')}</div>` : ''}
      <div class="card center">${worst ? `<button class="btn" id="htgo">⚡ Sprint in ${h(T.spell.MAJ[+worst[0]])} major (your weakest)</button>` : '<a class="btn" href="#sprint">⚡ Do a sprint to fill this in</a>'}<p class="muted small">Colours need at least 3 notes read in that key or interval.</p>
        ${Object.keys(heat.keys).length ? '<button class="btn ghost sm" id="htclr">Clear heat map</button>' : ''}</div>`;
    if ($('#htgo')) $('#htgo').onclick = () => { lset('sprintKey', +worst[0]); go('sprint'); };
    if ($('#htclr')) $('#htclr').onclick = () => { if (!confirm('Clear the heat map?')) return; lset('heat', { keys: {}, ints: {} }); routes.heat(v); };
  };

  /* ---------- 9. Warm-up generator ---------- */
  const FAM = { brass: 'Brass', wood: 'Woodwind', strings: 'Strings', voice: 'Voice', keys: 'Piano / keys' };
  const BLOCKS = {
    air: [['Breathing', 'Four slow breaths: in for 4, out for 8 through a relaxed open mouth. Then two breaths in for 2, out for 8.', '#breath']],
    tone: [['Long tones', 'Middle-register notes, 8 counts each at ♩=60, rest 4. Soft attack, even sound, no wobble.', '#ladder'], ['Long tones with a swell', 'Start pp, crescendo to mf over 4 counts, back to pp over 4. Keep the pitch dead still.', '#drift']],
    flex: { brass: [['Lip slurs', 'Slur between open partials (e.g. C–G–C, then on valves 2, 1, 12, 23). Smooth air, no tonguing.', null]], wood: [['Register slurs', 'Slur a low note to its octave (flute) or twelfth (clarinet) and back. Keep the air fast and the throat open.', null]], strings: [['Open strings + string crossings', 'Whole bows on each open string, then smooth crossings in slurred pairs.', null]], voice: [['Lip trills + sirens', 'Lip trill up and down a 5-note scale, then slide from low to high like a siren.', null]], keys: [['Five-finger patterns', 'C–G up and down each hand, legato, then staccato. Even fingers.', null]] },
    scale: [['Scale', 'Up and down two octaves (or your range), slurred once, tongued once. Use a metronome.', '#tempo']],
    artic: [['Articulation', 'One note, four patterns: all tongued, slur 2 tongue 2, tongue 2 slur 2, all slurred. ♩=80, eighth notes.', '#tempo'], ['Rhythm on one note', 'Quarters, eighths, triplets, sixteenths on one pitch, 1 bar each at ♩=72.', '#tempo']],
    read: [['Sight-reading', 'One fresh melody at a calm tempo. No stopping.', '#sprint'], ['Tuning', 'Play your tuning note and a few long tones with the tuner. Adjust, then check again.', '#sing']]
  };
  routes.warmup = v => {
    const st = Object.assign({ min: 10, fam: 'brass', key: 10 }, ls('warmup', {}));
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const build = () => { const D = st.min * 60, plan = [];
      const add = (b, frac) => plan.push({ t: b[0], how: b[1], link: b[2], sec: Math.max(30, Math.round(D * frac / 15) * 15) });
      if (st.fam !== 'keys' && st.fam !== 'strings') add(pick(BLOCKS.air), st.min <= 5 ? 0.12 : 0.08);
      if (st.fam !== 'keys') add(pick(BLOCKS.tone), st.fam === 'strings' ? 0.15 : 0.22);
      add(pick(BLOCKS.flex[st.fam]), 0.2);
      plan.push({ t: `${T.spell.MAJ[st.key]} major scale`, how: BLOCKS.scale[0][1], link: '#tempo', sec: Math.max(30, Math.round(D * 0.22 / 15) * 15), scale: st.key });
      if (st.min >= 10) add(pick(BLOCKS.artic), 0.14);
      if (st.min >= 10) add(pick(BLOCKS.read), 0.14);
      const sum = plan.reduce((s, b) => s + b.sec, 0); plan[plan.length - 1].sec += D - sum; plan.forEach(b => b.sec = Math.max(30, b.sec)); return plan; };
    let plan = build(), idx = -1, end = 0, timer = null;
    const scaleStaff = k => { const root = T.parse(T.spell.MAJ[k] + (k > 7 ? 3 : 4)); const ns = T.scale(root, 'major').concat([Object.assign({}, root, { o: root.o + 1 })]); return UI.staff(ns.map(n => ({ notes: [n], label: T.name(n) })), { keySig: 0, evW: 32 }); };
    const draw = () => { v.innerHTML = `${back}<h2>🔥 Warm-up generator</h2><p class="muted intro">Pick how long you’ve got. Cadence builds a set that fits, then walks you through it with a timer.</p>
      <div class="card"><div class="nn-seg sm" id="wum">${[5, 10, 15, 20].map(m => `<button data-m="${m}" class="${m === st.min ? 'on' : ''}">${m} min</button>`).join('')}</div>
        <div class="row nn-row"><select id="wuf" aria-label="Instrument family">${Object.entries(FAM).map(([k, n]) => `<option value="${k}"${k === st.fam ? ' selected' : ''}>${n}</option>`).join('')}</select><label class="muted small">Key <select id="wuk">${T.spell.MAJ.map((k, i) => `<option value="${i}"${i === st.key ? ' selected' : ''}>${k}</option>`).join('')}</select></label><button class="btn ghost sm" id="wure">↻ New set</button></div></div>
      <div class="card" id="wuplay">${idx < 0 ? `<h3>Your ${st.min}-minute set</h3>${plan.map((b, i) => `<div class="x27-item"><span><b>${i + 1}. ${h(b.t)}</b></span><small>${mmss(b.sec)}</small></div>`).join('')}<div class="row x29-c"><button class="btn" id="wugo">▶︎ Start warm-up</button></div>` : idx >= plan.length ? `<h3>Warm-up done ✓</h3><p class="muted">${st.min} minutes added to your practice log.</p><div class="row x29-c"><button class="btn" id="wuagain">Build another</button><a class="btn ghost" href="#plog">Practice log</a></div>` :
        `<p class="muted small">${idx + 1} of ${plan.length}</p><h3>${h(plan[idx].t)}</h3><div class="x27-clock" id="wuclk">${mmss(plan[idx].sec)}</div><p>${h(plan[idx].how)}</p>${plan[idx].scale != null ? `<div class="x27-staff">${scaleStaff(plan[idx].scale)}</div>` : ''}
          <div class="row x29-c"><button class="btn ghost sm" id="wuprev">‹ Back</button><button class="btn" id="wunext">${idx === plan.length - 1 ? 'Finish' : 'Next ›'}</button>${plan[idx].link ? `<a class="btn ghost sm" href="${plan[idx].link}">Open tool</a>` : ''}</div>`}</div>`;
      v.querySelectorAll('#wum [data-m]').forEach(b => b.onclick = () => { st.min = +b.dataset.m; lset('warmup', st); plan = build(); idx = -1; draw(); });
      $('#wuf').onchange = e => { st.fam = e.target.value; lset('warmup', st); plan = build(); idx = -1; draw(); };
      $('#wuk').onchange = e => { st.key = +e.target.value; lset('warmup', st); plan = build(); idx = -1; draw(); };
      $('#wure').onclick = () => { plan = build(); idx = -1; draw(); };
      if ($('#wugo')) $('#wugo').onclick = () => { Audio.ensure(); step(0); };
      if ($('#wuagain')) $('#wuagain').onclick = () => { plan = build(); idx = -1; draw(); };
      if ($('#wunext')) $('#wunext').onclick = () => step(idx + 1);
      if ($('#wuprev')) $('#wuprev').onclick = () => step(Math.max(0, idx - 1)); };
    const step = i => { clearTimeout(timer); idx = i; if (idx >= plan.length) { plogAdd(st.min, 'warm-up (' + FAM[st.fam].toLowerCase() + ')'); draw(); return; } end = Date.now() + plan[idx].sec * 1000; draw();
      const tick = () => { const c = $('#wuclk'); if (!alive(c)) return; const left = Math.max(0, Math.round((end - Date.now()) / 1000)); c.textContent = mmss(left); if (left <= 0) { Audio.click(0, true); Audio.click(0.25, false); c.classList.add('done'); return; } timer = setTimeout(tick, 250); }; tick(); };
    draw();
  };

  /* ---------- 16. Concert program builder ---------- */
  routes.program = v => {
    const st = Object.assign({ title: '', start: '19:00', items: [] }, ls('program', {}));
    const save = () => lset('program', st);
    const draw = () => {
      let clock = (() => { const [hh, mm] = String(st.start || '19:00').split(':').map(Number); return (hh || 0) * 60 + (mm || 0); })(), total = 0;
      const tfmt = m => { const d = new Date(); d.setHours(Math.floor(m / 60) % 24, Math.round(m % 60), 0, 0); return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
      const rows = st.items.map((p, i) => { const at = clock; clock += p.sec / 60 + (p.brk ? 0 : 0.75); total += p.sec + (p.brk ? 0 : 45);
        return `<div class="x29-prow${p.brk ? ' brk' : ''}" data-i="${i}"><span class="x29-grip" aria-label="Drag to reorder" title="Drag to reorder">⋮⋮</span><span class="x29-pt"><b>${h(p.title)}</b>${p.by ? `<small>${h(p.by)}</small>` : ''}</span><small>${tfmt(at)}<br>${mmss(p.sec)}</small><button class="x27-del" data-del="${i}" aria-label="Remove">×</button></div>`; }).join('');
      v.innerHTML = `${back}<h2>🎼 Concert program</h2><p class="muted intro">Add your pieces, drag them into order, and see the running times. Cadence adds 45 seconds between pieces for bows and page turns.</p>
        <div class="card"><input class="inp" id="prt" maxlength="80" placeholder="Concert name (spring recital…)" value="${h(st.title)}" aria-label="Concert name"><div class="row nn-row"><label class="muted small">Starts at <input type="time" class="inp x29-time" id="prs" value="${h(st.start)}"></label></div></div>
        <div class="card"><div id="prl">${rows || '<p class="muted small">No pieces yet.</p>'}</div>${st.items.length ? `<div class="x27-stat"><b>${mmss(total)}</b><span>total · ends about ${tfmt(clock)}</span></div>` : ''}</div>
        <div class="card"><h3>Add a piece</h3><input class="inp" id="pra" maxlength="80" placeholder="Piece" aria-label="Piece title"><input class="inp" id="prb" maxlength="60" placeholder="Composer (optional)" aria-label="Composer">
          <div class="row nn-row"><label class="muted small">Length <input class="inp x29-num" id="prm" type="number" inputmode="numeric" min="0" max="90" value="4" aria-label="Minutes"> min <input class="inp x29-num" id="prsec" type="number" inputmode="numeric" min="0" max="59" value="0" aria-label="Seconds"> s</label></div>
          <div class="row"><button class="btn" id="pradd">Add piece</button><button class="btn ghost sm" id="prbrk">+ Intermission</button>${st.items.length ? '<button class="btn ghost sm" id="prcp">Copy as text</button>' : ''}</div></div>`;
      $('#prt').oninput = e => { st.title = e.target.value.slice(0, 80); save(); };
      $('#prs').onchange = e => { st.start = e.target.value; save(); draw(); };
      $('#pradd').onclick = () => { const t = $('#pra').value.trim(); if (!t) return toast('Name the piece first'); const sec = clamp((+$('#prm').value || 0) * 60 + (+$('#prsec').value || 0), 5, 5400); st.items.push({ title: t.slice(0, 80), by: $('#prb').value.trim().slice(0, 60), sec }); save(); draw(); };
      $('#prbrk').onclick = () => { st.items.push({ title: 'Intermission', brk: 1, sec: 900 }); save(); draw(); };
      v.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { st.items.splice(+b.dataset.del, 1); save(); draw(); });
      if ($('#prcp')) $('#prcp').onclick = () => { let c = (() => { const [hh, mm] = st.start.split(':').map(Number); return hh * 60 + mm; })(); const lines = [st.title || 'Concert program', ''];
        st.items.forEach(p => { lines.push(`${tfmt(c)}  ${p.title}${p.by ? ' (' + p.by + ')' : ''}  ${mmss(p.sec)}`); c += p.sec / 60 + (p.brk ? 0 : 0.75); }); lines.push('', 'Ends about ' + tfmt(c));
        const txt = lines.join('\n'); (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Program copied'), () => toast('Couldn’t copy on this browser')); };
      // drag to reorder (finger or mouse) by the ⋮⋮ grip
      v.querySelectorAll('.x29-grip').forEach(g => g.addEventListener('pointerdown', e => { e.preventDefault(); const row = g.parentElement, list = $('#prl'); row.classList.add('drag');
        const move = ev => { const rows = [...list.querySelectorAll('.x29-prow')].filter(r => r !== row); const tgt = rows.find(r => { const b = r.getBoundingClientRect(); return ev.clientY < b.top + b.height / 2; }); if ((tgt || null) !== row.nextElementSibling) list.insertBefore(row, tgt || null); };
        const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); const ord = [...list.querySelectorAll('.x29-prow')].map(r => +r.dataset.i); st.items = ord.map(i => st.items[i]); save(); draw(); };
        addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up); }));
    };
    draw();
  };

  /* ---------- 18. Practice journal: your session, split into what you actually worked on ---------- */
  const CAT = { breath: 'Long tones & air', ladder: 'Long tones & air', fatigue: 'Long tones & air', drift: 'Intonation', sing: 'Intonation', rubato: 'Tempo & rhythm', tempo: 'Tempo & rhythm', passage: 'Passage work',
    sight: 'Sight-reading', sprint: 'Sight-reading', heat: 'Sight-reading', hum: 'Ear & melody', ear: 'Ear training', rp: 'Ear training', rps: 'Ear training', quiz: 'Theory', lesson: 'Theory', lessons: 'Theory', lsn: 'Theory', learn: 'Theory', practice: 'Theory drills', mt: 'Theory drills', ex: 'Theory drills', exs: 'Theory drills',
    warmup: 'Warm-up', takes: 'Recording & listening', ab: 'Recording & listening', mix: 'Play-along', nerves: 'Performance practice', jam: 'Improvising', range: 'Range', flip: 'Transposing', transposer: 'Transposing', piano: 'Piano', program: 'Concert planning' };
  (function track() { // where your time in Cadence goes (on this phone only): a route counts while the page is visible and you touched it in the last 2 minutes
    let cur = null, lastAct = Date.now();
    const close = () => { if (!cur) return; const b = Math.min(Date.now(), lastAct + 120000); if (b - cur.a >= 20000) { const L = ls('activity', []); L.push({ r: cur.r, a: cur.a, b }); lset('activity', L.slice(-3000)); } cur = null; };
    const open = () => { const r = (location.hash.slice(1) || 'today').split('/')[0]; if (CAT[r] && document.visibilityState !== 'hidden') cur = { r, a: Date.now() }; };
    const act = () => { const now = Date.now(); if (cur && now - lastAct > 120000) { const keep = cur.r; close(); cur = { r: keep, a: now }; } lastAct = now; };
    addEventListener('hashchange', () => { close(); lastAct = Date.now(); open(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') close(); else { lastAct = Date.now(); open(); } });
    addEventListener('pagehide', close);
    ['pointerdown', 'keydown'].forEach(t => addEventListener(t, act, { passive: true, capture: true }));
    setInterval(() => { if (cur && Date.now() - lastAct < 120000 && Date.now() - cur.a > 60000) { const r = cur.r; close(); cur = { r, a: Date.now() }; } }, 60000); // flush every minute so a closed tab loses little
    open();
  })();
  routes.journal = v => {
    const L = ls('activity', []), saved = ls('journalSaved', 0);
    const sessions = []; L.forEach(s => { const last = sessions[sessions.length - 1]; if (last && s.a - last.b < 20 * 60000) { last.segs.push(s); last.b = Math.max(last.b, s.b); } else sessions.push({ a: s.a, b: s.b, segs: [s] }); });
    const chunks = ses => { const out = []; ses.segs.forEach(s => { const c = CAT[s.r] || 'Other', last = out[out.length - 1]; if (last && last.c === c) { last.ms += s.b - s.a; last.b = s.b; } else out.push({ c, ms: s.b - s.a, a: s.a, b: s.b }); }); return out.filter(c => c.ms >= 45000); };
    const recent = sessions.slice(-6).reverse();
    v.innerHTML = `${back}<h2>📓 Practice journal</h2><p class="muted intro">Cadence keeps track of which tools you used and for how long, then splits each session into what you actually worked on. Save it to your practice log in one tap.</p>
      ${recent.length ? recent.map((s, si) => { const cs = chunks(s), tot = cs.reduce((a, c) => a + c.ms, 0), isNew = s.b > saved; return `<div class="card"><h3>${new Date(s.a).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${new Date(s.a).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</h3>
        ${cs.length ? `<div class="x29-split">${cs.map(c => `<i style="flex:${c.ms}" title="${h(c.c)}"></i>`).join('')}</div>${cs.map(c => `<div class="x27-item"><span><b>${Math.max(1, Math.round(c.ms / 60000))} min</b> ${h(c.c)}</span><small>${new Date(c.a).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div>`).join('')}
          <div class="row"><span class="muted small">${Math.round(tot / 60000)} min total</span>${isNew ? `<button class="btn sm" data-s="${si}">Save to practice log</button>` : '<span class="muted small">✓ saved</span>'}</div>` : '<p class="muted small">Too short to split (under a minute per thing).</p>'}</div>`; }).join('')
        : '<div class="card"><p class="muted">Nothing yet. Use the practice tools (tempo trainer, long tones, sight-reading, passage locker…) and your sessions show up here.</p></div>'}
      <div class="card"><p class="muted small">It only knows about time spent in Cadence’s tools on this phone. Practice away from the app isn’t heard or counted, so add that with the practice log’s timer.</p></div>`;
    v.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const s = recent[+b.dataset.s]; chunks(s).forEach(c => plogAdd(c.ms / 60000, c.c)); lset('journalSaved', Math.max(saved, s.b)); toast('Saved to your practice log'); routes.journal(v); });
  };

  /* ---------- Takes: 11 slow-mo replay · 15 A/B reference · 12/13 play-along mixer · 20 tone colour palette ---------- */
  const DB = { db: null,
    open() { if (this.db) return Promise.resolve(this.db); return new Promise((res, rej) => { if (!window.indexedDB) return rej(new Error('no indexedDB')); const r = indexedDB.open('cadence-takes', 1); r.onupgradeneeded = () => r.result.createObjectStore('takes', { keyPath: 'id' }); r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => rej(r.error); }); },
    async tx(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('takes', mode), q = fn(t.objectStore('takes')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); },
    all() { return this.tx('readonly', s => s.getAll()).then(a => (a || []).sort((x, y) => x.t - y.t)); },
    get(id) { return this.tx('readonly', s => s.get(id)); }, put(x) { return this.tx('readwrite', s => s.put(x)); }, del(id) { return this.tx('readwrite', s => s.delete(id)); } };
  let TX = null; const tctx = () => { if (!TX || TX.state === 'closed') TX = new (window.AudioContext || window.webkitAudioContext)(); if (TX.state === 'suspended') TX.resume(); return TX; };
  const decode = blob => blob.arrayBuffer().then(ab => new Promise((res, rej) => { const c = tctx(); const p = c.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }));
  let REC = null; const stopRec = () => { if (REC) { try { REC.mr.state !== 'inactive' && REC.mr.stop(); } catch (e) {} REC.stream.getTracks().forEach(t => t.stop()); REC = null; } };
  const MEDIA = new Set(); const media = url => { const a = document.createElement('audio'); a.src = url; a.preload = 'auto'; MEDIA.add(a); return a; };
  addEventListener('hashchange', () => { stopRec(); MEDIA.forEach(a => { try { a.pause(); } catch (e) {} }); MEDIA.clear(); if (TX) { try { TX.close(); } catch (e) {} TX = null; } });
  function fft(re, im) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], xr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, xi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + xr; im[i + k] = ui + xi; re[i + k + len / 2] = ur - xr; im[i + k + len / 2] = ui - xi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } } }
  function toneOf(buf) { // tone colour from the recording itself: brightness = spectral centroid ÷ fundamental (how much energy sits in the upper harmonics)
    const d = buf.getChannelData(0), sr = buf.sampleRate, N = 2048, frames = [], hop = Math.max(N, Math.floor((d.length - N) / 60));
    for (let s = 0; s + N < d.length; s += hop) { let r = 0; for (let i = 0; i < N; i++) r += d[s + i] * d[s + i]; r = Math.sqrt(r / N); if (r < 0.01) continue;
      const minL = Math.floor(sr / 1100), maxL = Math.floor(sr / 55); let best = 0, bl = 0; for (let L = minL; L <= maxL; L++) { let ac = 0, m = 0; for (let i = 0; i < N - L; i += 2) { ac += d[s + i] * d[s + i + L]; m += d[s + i] * d[s + i] + d[s + i + L] * d[s + i + L]; } const v = m ? 2 * ac / m : 0; if (v > best) { best = v; bl = L; } }
      if (best < 0.7) continue; const f0 = sr / bl, re = new Float32Array(N), im = new Float32Array(N); for (let i = 0; i < N; i++) re[i] = d[s + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1))); fft(re, im);
      let num = 0, den = 0; for (let k = 2; k < N / 2; k++) { const f = k * sr / N; if (f > 10000) break; const mag = Math.hypot(re[k], im[k]); num += mag * f; den += mag; } if (den) frames.push({ f0, cen: num / den, r }); }
    if (frames.length < 4) return null; const br = mean(frames.map(f => f.cen / f.f0)), f0 = mean(frames.map(f => f.f0));
    const tag = br < 2.2 ? 'dark' : br < 3.4 ? 'warm' : br < 5 ? 'bright' : 'brilliant'; const hue = Math.round(clamp(260 - (br - 1.2) / 5 * 230, 20, 260));
    return { br: Math.round(br * 100) / 100, f0: Math.round(f0), tag, hue, n: frames.length }; }
  const MUTES = ['open', 'straight mute', 'cup mute', 'harmon', 'plunger', 'practice mute', 'other'];
  const takeRow = x => `<div class="x29-take" data-id="${h(x.id)}"><i class="x29-sw" style="background:${x.tone ? `hsl(${x.tone.hue},65%,55%)` : 'rgba(127,127,127,.3)'}"></i><span><b>${h(x.name)}</b><small>${x.kind === 'file' ? 'imported · ' : ''}${new Date(x.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${mmss(x.dur || 0)}${x.tone ? ' · ' + h(x.tone.tag) : ''}${x.mute && x.mute !== 'open' ? ' · ' + h(x.mute) : ''}</small></span><button class="btn ghost sm" data-open="${h(x.id)}">Open</button></div>`;
  async function saveTake(blob, name, kind, extra) { const id = 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); let dur = 0, tone = null;
    try { const buf = await decode(blob); dur = buf.duration; tone = toneOf(buf); } catch (e) {}
    const x = Object.assign({ id, t: Date.now(), name: String(name).slice(0, 60), kind, blob, mime: blob.type || '', dur, tone, mute: 'open' }, extra || {}); await DB.put(x); return x; }
  async function startRec() { const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined), parts = []; mr.ondataavailable = e => e.data && e.data.size && parts.push(e.data);
    const done = new Promise(res => { mr.onstop = () => res(new Blob(parts, { type: mr.mimeType || type || 'audio/webm' })); }); mr.start(); REC = { mr, stream, t0: Date.now() }; return done; }
  const canRec = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  routes.takes = async v => {
    v.innerHTML = `${back}<h2>🎙️ Takes</h2><p class="muted intro">Record yourself, slow it down to catch the flub, A/B against a pro recording, play along with a band track, and see your tone colour grow. Everything stays on this phone.</p>
      <div class="card center"><div class="x27-clock" id="tkclk">0:00</div><div class="row x29-c"><button class="btn" id="tkrec">● Record a take</button><label class="btn ghost sm x29-file">Import audio<input type="file" id="tkimp" accept="audio/*"></label></div><p class="muted small" id="tkst">${canRec() ? 'Imports: a pro recording to A/B against, or a band or friend’s track to play along with.' : 'Recording isn’t supported in this browser, but you can still import audio files.'}</p></div>
      <div class="row x29-c"><a class="btn ghost sm" href="#ab">A/B reference</a><a class="btn ghost sm" href="#mix">Play-along mixer</a><a class="btn ghost sm" href="#palette">Tone palette</a></div>
      <div class="card" id="tkl"><p class="muted small">Loading…</p></div><div class="card" id="tkone" hidden></div>`;
    const list = async () => { let all = []; try { all = await DB.all(); } catch (e) { $('#tkl').innerHTML = '<p class="warn">This browser blocked local storage for recordings (private mode?). Recording still works for this visit only.</p>'; return; }
      if (!alive($('#tkl'))) return; $('#tkl').innerHTML = all.length ? `<h3>${all.length} take${all.length === 1 ? '' : 's'}</h3>${all.slice().reverse().map(takeRow).join('')}` : '<p class="muted small">No takes yet.</p>';
      v.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openTake(b.dataset.open)); };
    const openTake = async id => { const x = await DB.get(id); if (!x) return; const box = $('#tkone'); box.hidden = false; const url = URL.createObjectURL(x.blob), a = media(url);
      box.innerHTML = `<h3>${h(x.name)}</h3><input class="inp" id="tkn" maxlength="60" value="${h(x.name)}" aria-label="Take name">
        <div class="nn-seg sm" id="tkspd">${[0.25, 0.5, 0.75, 1].map(r => `<button data-r="${r}" class="${r === 1 ? 'on' : ''}">${r === 1 ? 'normal' : Math.round(r * 100) + '%'}</button>`).join('')}</div>
        <label class="muted small x29-chk"><input type="checkbox" id="tkpp" checked> keep the pitch when slowed</label>
        <input type="range" id="tkpos" min="0" max="1000" value="0" aria-label="Position"><div class="row"><button class="btn" id="tkplay">▶︎ Play</button><button class="btn ghost sm" id="tkb5">−5 s</button><span class="muted small" id="tkt">0:00 / ${mmss(x.dur || 0)}</span></div>
        <p class="muted small">Tone colour: ${x.tone ? `<b style="color:hsl(${x.tone.hue},65%,62%)">${h(x.tone.tag)}</b> (brightness ${x.tone.br})` : 'not enough steady notes to measure'}</p>
        <label class="muted small">Mute / setup <select id="tkm">${MUTES.map(m => `<option${m === (x.mute || 'open') ? ' selected' : ''}>${m}</option>`).join('')}</select></label>
        <div class="row"><button class="btn ghost sm danger" id="tkdel">Delete take</button></div>`;
      let rate = 1; const setPP = () => { const k = $('#tkpp').checked; a.preservesPitch = k; a.webkitPreservesPitch = k; a.mozPreservesPitch = k; };
      v.querySelectorAll('#tkspd [data-r]').forEach(b => b.onclick = () => { rate = +b.dataset.r; try { a.playbackRate = rate; } catch (e) { rate = 0.5; a.playbackRate = 0.5; toast('This browser can’t go slower than 50%'); } v.querySelectorAll('#tkspd button').forEach(y => y.classList.toggle('on', +y.dataset.r === rate)); });
      $('#tkpp').onchange = setPP; setPP();
      $('#tkplay').onclick = () => { if (a.paused) { a.playbackRate = rate; a.play().catch(() => toast('Couldn’t play this file here')); } else a.pause(); };
      $('#tkb5').onclick = () => { a.currentTime = Math.max(0, a.currentTime - 5); };
      a.onplay = () => $('#tkplay') && ($('#tkplay').textContent = '❚❚ Pause'); a.onpause = () => $('#tkplay') && ($('#tkplay').textContent = '▶︎ Play');
      a.ontimeupdate = () => { const d = isFinite(a.duration) ? a.duration : x.dur || 1; if ($('#tkt')) { $('#tkt').textContent = mmss(a.currentTime) + ' / ' + mmss(d); $('#tkpos').value = Math.round(a.currentTime / d * 1000); } };
      $('#tkpos').oninput = e => { const d = isFinite(a.duration) ? a.duration : x.dur || 0; a.currentTime = +e.target.value / 1000 * d; };
      $('#tkn').onchange = async e => { x.name = e.target.value.trim().slice(0, 60) || x.name; await DB.put(x); list(); };
      $('#tkm').onchange = async e => { x.mute = e.target.value; await DB.put(x); list(); };
      $('#tkdel').onclick = async () => { if (!confirm('Delete this take?')) return; a.pause(); await DB.del(x.id); box.hidden = true; list(); };
      box.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    $('#tkimp').onchange = async e => { const f = e.target.files && e.target.files[0]; if (!f) return; if (f.size > 60 * 1048576) return toast('That file is over 60 MB'); $('#tkst').textContent = 'importing…';
      try { await saveTake(f, f.name.replace(/\.[a-z0-9]+$/i, ''), 'file'); $('#tkst').textContent = 'imported'; } catch (er) { $('#tkst').textContent = 'Couldn’t save that file here.'; } list(); };
    $('#tkrec').onclick = async () => { if (REC) { REC.mr.stop(); REC.stream.getTracks().forEach(t => t.stop()); return; } if (!canRec()) return;
      let done; try { done = startRec(); await Promise.race([done, new Promise(r => setTimeout(r, 50))]); } catch (er) { $('#tkst').textContent = 'Microphone blocked or not available. Allow mic access for this site, then try again.'; return; }
      if (!REC) { $('#tkst').textContent = 'Microphone blocked or not available. Allow mic access for this site, then try again.'; return; }
      $('#tkrec').textContent = '■ Stop'; const t0 = REC.t0; const tick = () => { if (!REC || !alive($('#tkclk'))) return; $('#tkclk').textContent = mmss((Date.now() - t0) / 1000); if (Date.now() - t0 > 600000) { REC.mr.stop(); return; } setTimeout(tick, 250); }; tick();
      const blob = await done; REC = null; if (!alive($('#tkrec'))) return; $('#tkrec').textContent = '● Record a take'; $('#tkst').textContent = 'saving…';
      try { const x = await saveTake(blob, 'Take ' + new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), 'rec'); $('#tkst').textContent = 'saved'; await list(); openTake(x.id); } catch (er) { $('#tkst').textContent = 'Couldn’t save the take here.'; } };
    list();
  };

  const pickSel = (id, all, cur, label) => `<select id="${id}" aria-label="${label}">${all.map(x => `<option value="${h(x.id)}"${x.id === cur ? ' selected' : ''}>${h(x.name)}${x.kind === 'file' ? ' (imported)' : ''}</option>`).join('')}</select>`;
  routes.ab = async v => {
    let all = []; try { all = await DB.all(); } catch (e) {}
    const st = Object.assign({ a: null, b: null, sa: 0, sb: 0, len: 8 }, ls('ab', {}));
    if (!all.find(x => x.id === st.a)) st.a = (all.slice().reverse().find(x => x.kind === 'rec') || all[0] || {}).id || null;
    if (!all.find(x => x.id === st.b)) st.b = (all.slice().reverse().find(x => x.kind === 'file' && x.id !== st.a) || all.find(x => x.id !== st.a) || {}).id || null;
    if (all.length < 2) { v.innerHTML = `<a class="back" href="#takes">← Takes</a><h2>🅰️🅱️ A/B reference</h2><div class="card"><p>You need two takes: your own, and a pro recording to compare with (import it in Takes).</p><a class="btn" href="#takes">Go to Takes</a></div>`; return; }
    v.innerHTML = `<a class="back" href="#takes">← Takes</a><h2>🅰️🅱️ A/B reference</h2><p class="muted intro">Line up the same phrase in your take and the pro recording, then flip between them instantly. Both keep playing in sync; the switch just changes which one you hear.</p>
      <div class="card"><label class="muted small">A · you</label>${pickSel('aba', all, st.a, 'Your take')}<label class="muted small">phrase starts at <b id="absav">${st.sa.toFixed(1)} s</b></label><input type="range" id="absa" min="0" max="600" step="1" value="${Math.round(st.sa * 10)}" aria-label="Your phrase start">
        <label class="muted small">B · reference</label>${pickSel('abb', all, st.b, 'Reference')}<label class="muted small">phrase starts at <b id="absbv">${st.sb.toFixed(1)} s</b></label><input type="range" id="absb" min="0" max="600" step="1" value="${Math.round(st.sb * 10)}" aria-label="Reference phrase start">
        <label class="muted small">phrase length <b id="ablv">${st.len} s</b></label><input type="range" id="abl" min="2" max="60" value="${st.len}" aria-label="Phrase length"></div>
      <div class="card center"><button class="x29-ab" id="absw" aria-label="Switch between A and B"><span class="on" id="abA">A · you</span><span id="abB">B · pro</span></button><div class="row x29-c"><button class="btn" id="abgo">▶︎ Play phrase (loops)</button></div><p class="muted small">Tap the big switch any time. Tip: headphones.</p></div>`;
    const save = () => lset('ab', st); let A = null, B = null, hear = 'a', on = false;
    const load = async () => { MEDIA.forEach(x => x.pause()); const xa = all.find(x => x.id === st.a), xb = all.find(x => x.id === st.b); if (!xa || !xb) return; A = media(URL.createObjectURL(xa.blob)); B = media(URL.createObjectURL(xb.blob)); $('#absa').max = Math.round((xa.dur || 60) * 10); $('#absb').max = Math.round((xb.dur || 60) * 10); apply(); };
    const apply = () => { if (!A) return; A.muted = hear !== 'a'; B.muted = hear !== 'b'; $('#abA').classList.toggle('on', hear === 'a'); $('#abB').classList.toggle('on', hear === 'b'); };
    $('#aba').onchange = e => { st.a = e.target.value; save(); load(); }; $('#abb').onchange = e => { st.b = e.target.value; save(); load(); };
    $('#absa').oninput = e => { st.sa = +e.target.value / 10; $('#absav').textContent = st.sa.toFixed(1) + ' s'; save(); };
    $('#absb').oninput = e => { st.sb = +e.target.value / 10; $('#absbv').textContent = st.sb.toFixed(1) + ' s'; save(); };
    $('#abl').oninput = e => { st.len = +e.target.value; $('#ablv').textContent = st.len + ' s'; save(); };
    $('#absw').onclick = () => { hear = hear === 'a' ? 'b' : 'a'; apply(); };
    $('#abgo').onclick = async () => { if (!A) await load(); if (on) { on = false; A.pause(); B.pause(); $('#abgo').textContent = '▶︎ Play phrase (loops)'; return; }
      on = true; $('#abgo').textContent = '■ Stop'; const seek = () => { A.currentTime = st.sa; B.currentTime = st.sb; }; seek(); apply(); try { await Promise.all([A.play(), B.play()]); } catch (e) { toast('Couldn’t play these files here'); on = false; return; }
      const tick = () => { if (!on || !alive($('#abgo'))) return; if (A.currentTime >= st.sa + st.len || A.ended) seek(); else if (Math.abs((A.currentTime - st.sa) - (B.currentTime - st.sb)) > 0.08) B.currentTime = st.sb + (A.currentTime - st.sa); setTimeout(tick, 60); }; tick(); };
    load();
  };

  routes.mix = async v => {
    let all = []; try { all = await DB.all(); } catch (e) {}
    const st = Object.assign({ band: null, me: null, vb: 0.8, vm: 1, lat: 0, focus: 'none', lo: 230, hi: 1000 }, ls('mix', {}));
    if (!all.find(x => x.id === st.band)) st.band = (all.slice().reverse().find(x => x.kind === 'file') || {}).id || null;
    if (!all.find(x => x.id === st.me)) st.me = null;
    v.innerHTML = `<a class="back" href="#takes">← Takes</a><h2>🎚️ Play-along mixer</h2><p class="muted intro">Play along with a band recording or a friend’s take, record yourself over it, then mix the two with your own volumes and line them up to the millisecond.</p>
      ${st.band ? `<div class="card"><label class="muted small">Track to play along with</label>${pickSel('mxb', all.filter(x => x.kind === 'file' || x.id === st.band), st.band, 'Track')}
        <label class="muted small">Your take over it</label><select id="mxm" aria-label="Your take"><option value="">(none yet)</option>${all.filter(x => x.id !== st.band).map(x => `<option value="${h(x.id)}"${x.id === st.me ? ' selected' : ''}>${h(x.name)}</option>`).join('')}</select>
        <div class="row x29-c"><button class="btn" id="mxrec">🎤 Play along &amp; record</button><button class="btn ghost" id="mxplay">▶︎ Play mix</button></div><p class="muted small center" id="mxst">Headphones on, so the track doesn’t leak into your take.</p></div>
      <div class="card x27-set"><label>Track volume <b id="mxvbv">${Math.round(st.vb * 100)}%</b><input type="range" id="mxvb" min="0" max="100" value="${Math.round(st.vb * 100)}" aria-label="Track volume"></label>
        <label>Your volume <b id="mxvmv">${Math.round(st.vm * 100)}%</b><input type="range" id="mxvm" min="0" max="100" value="${Math.round(st.vm * 100)}" aria-label="Your volume"></label>
        <label>Line up (latency) <b id="mxlv">${st.lat} ms</b><input type="range" id="mxl" min="-600" max="600" step="5" value="${st.lat}" aria-label="Latency offset"></label>
        <label>Track focus <select id="mxf"><option value="none">as recorded</option><option value="cut">turn down my range (play-along gap)</option><option value="boost">bring out my range</option><option value="sides">remove the centre (stereo tracks)</option><option value="centre">centre only</option></select></label>
        <label>My range <b id="mxrv">${st.lo}–${st.hi} Hz</b><input type="range" id="mxlo" min="60" max="1500" step="10" value="${st.lo}" aria-label="Range low"><input type="range" id="mxhi" min="200" max="4000" step="10" value="${st.hi}" aria-label="Range high"></label>
        <p class="muted small">This isn’t true stem separation (that needs a big AI model). “Turn down my range” carves a gap where your instrument sits; “remove the centre” drops whatever is panned dead centre (often the soloist).</p></div>`
      : `<div class="card"><p>Import a band recording (or a friend’s take) in Takes first, then come back.</p><a class="btn" href="#takes">Go to Takes</a></div>`}`;
    if (!st.band) return; $('#mxf').value = st.focus;
    const save = () => lset('mix', st); let playing = null;
    const bind = (id, k, fmt, sc) => { $('#' + id).oninput = e => { st[k] = +e.target.value / (sc || 1); $('#' + id + 'v').textContent = fmt(st[k]); save(); if (playing) playing.update(); }; };
    bind('mxvb', 'vb', x => Math.round(x * 100) + '%', 100); bind('mxvm', 'vm', x => Math.round(x * 100) + '%', 100);
    $('#mxl').oninput = e => { st.lat = +e.target.value; $('#mxlv').textContent = st.lat + ' ms'; save(); };
    const rng = () => { if (st.hi <= st.lo) st.hi = st.lo + 50; $('#mxrv').textContent = st.lo + '–' + st.hi + ' Hz'; save(); };
    $('#mxlo').oninput = e => { st.lo = +e.target.value; rng(); }; $('#mxhi').oninput = e => { st.hi = +e.target.value; rng(); };
    $('#mxf').onchange = e => { st.focus = e.target.value; save(); };
    $('#mxb').onchange = e => { st.band = e.target.value; save(); }; $('#mxm').onchange = e => { st.me = e.target.value || null; save(); };
    const chain = (c, src, buf) => { // focus filters on the track
      let node = src; const cf = Math.sqrt(st.lo * st.hi), q = cf / Math.max(30, st.hi - st.lo);
      if (st.focus === 'cut' || st.focus === 'boost') { const pk = c.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = cf; pk.Q.value = q; pk.gain.value = st.focus === 'cut' ? -18 : 9; node.connect(pk); node = pk; }
      if ((st.focus === 'sides' || st.focus === 'centre') && buf.numberOfChannels === 2) { const sp = c.createChannelSplitter(2), inv = c.createGain(), mg = c.createGain(); inv.gain.value = st.focus === 'sides' ? -1 : 1; mg.gain.value = 0.5; node.connect(sp); sp.connect(mg, 0); sp.connect(inv, 1); inv.connect(mg); node = mg; }
      return node; };
    const play = async (withMe, onEnd) => { const c = tctx(); const xb = all.find(x => x.id === st.band), xm = withMe && st.me ? all.find(x => x.id === st.me) : null;
      const bb = await decode(xb.blob), bm = xm ? await decode(xm.blob) : null; const gB = c.createGain(), gM = c.createGain(); gB.connect(c.destination); gM.connect(c.destination);
      const sB = c.createBufferSource(); sB.buffer = bb; chain(c, sB, bb).connect(gB); const t0 = c.currentTime + 0.1; let sM = null;
      // positive latency = your take is late, so it starts that much earlier into its own file
      if (bm) { sM = c.createBufferSource(); sM.buffer = bm; sM.connect(gM); const off = (xm.lat || 0) / 1000 + st.lat / 1000; if (off >= 0) sM.start(t0, off); else sM.start(t0 - off); }
      sB.start(t0); const me = { stop() { try { sB.stop(); sM && sM.stop(); } catch (e) {} }, update() { gB.gain.value = st.vb; gM.gain.value = st.vm; } }; me.update(); sB.onended = () => { if (playing === me) { playing = null; onEnd && onEnd(); } }; playing = me; return me; };
    $('#mxplay').onclick = async () => { if (playing) { playing.stop(); playing = null; $('#mxplay').textContent = '▶︎ Play mix'; return; } $('#mxplay').textContent = '■ Stop'; try { await play(true, () => $('#mxplay') && ($('#mxplay').textContent = '▶︎ Play mix')); } catch (e) { $('#mxst').textContent = 'Couldn’t decode one of these files in this browser.'; $('#mxplay').textContent = '▶︎ Play mix'; } };
    $('#mxrec').onclick = async () => { if (REC) { if (playing) { playing.stop(); playing = null; } REC.mr.stop(); REC.stream.getTracks().forEach(t => t.stop()); return; } if (!canRec()) return toast('Recording isn’t supported in this browser');
      let done; try { done = startRec(); await Promise.race([done, new Promise(r => setTimeout(r, 50))]); } catch (e) { $('#mxst').textContent = 'Microphone blocked or not available.'; return; } if (!REC) { $('#mxst').textContent = 'Microphone blocked or not available.'; return; }
      const r0 = performance.now(); let p0 = 0; try { await play(false, () => { if (REC) { REC.mr.stop(); REC.stream.getTracks().forEach(t => t.stop()); } }); p0 = performance.now(); } catch (e) { stopRec(); $('#mxst').textContent = 'Couldn’t play the track.'; return; }
      $('#mxrec').textContent = '■ Stop recording'; $('#mxst').textContent = 'recording… play along';
      const blob = await done; REC = null; if (playing) { playing.stop(); playing = null; } if (!alive($('#mxrec'))) return; $('#mxrec').textContent = '🎤 Play along & record';
      const lat = Math.round(p0 - r0 + 100); // the track started this long after the recorder did
      const x = await saveTake(blob, 'Along: ' + (all.find(y => y.id === st.band) || {}).name, 'rec', { along: st.band, lat }); st.me = x.id; save(); all.push(x);
      $('#mxst').textContent = 'Saved. Tap Play mix; if it sounds off, nudge “line up”.'; const o = document.createElement('option'); o.value = x.id; o.textContent = x.name; $('#mxm').appendChild(o); $('#mxm').value = x.id; };
  };

  routes.palette = async v => {
    let all = []; try { all = await DB.all(); } catch (e) {}
    const mine = all.filter(x => x.kind === 'rec' && x.tone);
    v.innerHTML = `<a class="back" href="#takes">← Takes</a><h2>🎨 Tone palette</h2><p class="muted intro">Every take gets a colour from its sound: deep blue is dark, through green and gold to red-orange for brilliant. Tag the mute you used and watch your palette change over the months.</p>
      ${mine.length ? `<div class="card"><div class="x29-pal">${mine.map(x => `<i style="background:hsl(${x.tone.hue},65%,55%)" title="${h(x.name)}"></i>`).join('')}</div><p class="muted small">${mine.length} takes, oldest on the left.</p></div>
        <div class="card"><h3>By mute</h3>${MUTES.filter(m => mine.some(x => (x.mute || 'open') === m)).map(m => { const xs = mine.filter(x => (x.mute || 'open') === m), br = mean(xs.map(x => x.tone.br)); return `<div class="x27-item"><span><b>${h(m)}</b> · ${xs.length} take${xs.length === 1 ? '' : 's'}</span><small>avg brightness ${br.toFixed(2)}</small><i class="x29-sw" style="background:hsl(${mean(xs.map(x => x.tone.hue))},65%,55%)"></i></div>`; }).join('')}</div>
        <div class="card"><h3>Takes</h3>${mine.slice().reverse().map(takeRow).join('')}</div>`
      : '<div class="card"><p>No measured takes yet. Record a few long tones or a phrase in Takes; any take with steady notes gets a colour.</p><a class="btn" href="#takes">Go to Takes</a></div>'}
      <div class="card"><p class="muted small">How it’s measured: how much of the sound sits in the upper harmonics compared with the note itself (spectral centroid ÷ pitch), averaged over the steady parts of the take. Same phone, same spot in the room, same note gives the fairest comparison. The mute is your tag; Cadence can’t tell mutes apart by ear.</p></div>`;
    v.querySelectorAll('[data-open]').forEach(b => b.onclick = () => go('takes'));
  };

  const TOOLS = [['#warmup', '🔥 Warm-up generator', 'pick 5–20 minutes, get a set with a timer', 0], ['#passage', '🔒 Passage locker', 'loop one bar with a count-in', 0],
    ['#sprint', '⚡ Sight-read sprint', '60-second reading race, streaks tracked', 0], ['#heat', '🔥 Mistake heat map', 'the keys and intervals you miss most', 0],
    ['#flip', '🔁 Instant flip', 'trumpet ⇄ flute part in one tap', 0], ['#takes', '🎙️ Takes', 'record, slow-mo replay, A/B vs a pro, play-along', 0],
    ['#journal', '📓 Practice journal', 'your session, split into what you worked on', 0], ['#program', '🎼 Concert program', 'drag pieces into a setlist with timings', 0]];
  window.CAD_TOOL_SECTIONS = (window.CAD_TOOL_SECTIONS || []).concat([['Practice room', TOOLS]]);
  const ALL = TOOLS.map(t => t[0].slice(1)).concat(['ab', 'mix', 'palette']).concat((window.CadX29 && CadX29.routes) || []);
  const hiTools = () => { const r = (location.hash.slice(1) || '').split('/')[0]; if (ALL.includes(r)) $$('.tabbar a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#tools')); };
  addEventListener('hashchange', hiTools); addEventListener('DOMContentLoaded', () => setTimeout(hiTools, 0));
  window.CadX29b = { routes: ALL, toneOf, CAT };
})();
