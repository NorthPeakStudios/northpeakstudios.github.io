// Cadence 1.5 · Name in notes (free) + Melody harmonizer (Pro). Original Northpeak code.
(() => {
  const pro = () => !!(window.CadPro && CadPro.pro());
  const N = s => T.parse(s);
  /* ---------- 1. Your name in notes: three real historical ways composers spelled words as music ---------- */
  const GER = { A: 'A', B: 'Bb', C: 'C', D: 'D', E: 'E', F: 'F', G: 'G', H: 'B', S: 'Eb' }; // German: H = B natural, B = B flat, S ("Es") = E flat
  const VOW = { A: 'F', E: 'D', I: 'E', O: 'G', U: 'C' }; // soggetto cavato: vowel → solfège (a=fa e=re i=mi o=sol u=ut)
  const SOLF = { F: 'fa', D: 're', E: 'mi', G: 'sol', C: 'ut' };
  function frenchOf(ch, hAsB) { const i = ch.charCodeAt(0) - 65; if (i < 0 || i > 25) return null; if (ch === 'H' && hAsB) return 'B'; return 'ABCDEFG'[i % 7]; }
  function spell(word, mode, hAsB) {
    const out = []; for (const ch of word.toUpperCase()) {
      if (!/[A-Z]/.test(ch)) { if (ch === ' ' && out.length && !out[out.length - 1].gap) out.push({ gap: 1 }); continue; }
      let nm = null; if (mode === 'ger') nm = GER[ch] || null; else if (mode === 'fr') nm = frenchOf(ch, hAsB); else nm = VOW[ch] || null;
      out.push({ ch, nm });
    }
    return out;
  }
  // put every note in one comfortable octave band (A3..G#5), stepping to the nearest octave from the last note
  function voice(names) { let last = 67; return names.map(nm => { const n = N(nm + '4'); let m = T.midi(n); while (m - last > 6) m -= 12; while (last - m > 6) m += 12; while (m < 57) m += 12; while (m > 80) m -= 12; last = m; return T.parse(T.spell.midiName(m, T.name(n))); }); }
  const MODES = [['fr', 'French', 'Every letter A–Z gets a note: A–G, then the alphabet wraps (H–N, O–U, V–Z) back onto A–G. Used in 1909 when Ravel, Debussy and others wrote pieces on the name HAYDN.'], ['ger', 'German', 'Only letters that are German note names count: A–G plus H (= B natural), B (= B flat) and S ("Es" = E flat). Bach signed music with B♭–A–C–B♮; Schumann used A–S–C–H.'], ['vow', 'Josquin', 'Soggetto cavato, "carved out" of the words: each vowel becomes a solfège syllable (a = fa, e = re, i = mi, o = sol, u = ut). Josquin built a whole mass on "Hercules Dux Ferrariae" this way, around 1480–1505.']];
  routes.namenotes = (v, arg) => {
    const st = { w: decodeURIComponent(arg || '') || localStorage.getItem('cad.nn') || '', mode: localStorage.getItem('cad.nnm') || 'fr', hb: localStorage.getItem('cad.nnh') !== '0' };
    v.innerHTML = `<a class="back" href="#tools">← Tools</a><h2>✍️ Your name in notes</h2><p class="muted intro">Type a name or word. Cadence spells it as a melody the way composers have for 500 years.</p>
      <div class="card"><input id="nnw" class="nn-in" maxlength="40" autocomplete="off" autocapitalize="characters" placeholder="ODIN" value="${esc(st.w)}"><div class="nn-seg" id="nnm">${MODES.map(m => `<button class="${m[0] === st.mode ? 'on' : ''}" data-m="${m[0]}">${m[1]}</button>`).join('')}</div>
      <label class="muted small nn-hb" id="nnhbw" style="display:flex;gap:8px;align-items:flex-start;flex-direction:row"><input type="checkbox" id="nnhb" style="width:auto;flex:none;margin:4px 0 0;display:inline-block"${st.hb ? ' checked' : ''}><span>read H as B, the German way (how the 1909 HAYDN pieces did it)</span></label></div>
      <div class="card"><div id="nnstaff"></div><div class="nn-map" id="nnmap"></div><div class="row"><button class="btn" id="nnplay">▶︎ Play it</button><button class="btn ghost" id="nnshare">Copy link</button></div></div>
      <div class="card"><p id="nnhow" class="small"></p></div>`;
    const draw = () => {
      localStorage.setItem('cad.nn', st.w); localStorage.setItem('cad.nnm', st.mode); localStorage.setItem('cad.nnh', st.hb ? '1' : '0');
      $('#nnhbw').style.display = st.mode === 'fr' ? 'flex' : 'none';
      const sp = spell(st.w || '', st.mode, st.hb), names = sp.filter(x => x.nm).map(x => x.nm), notes = voice(names);
      $('#nnstaff').innerHTML = notes.length ? UI.staff(notes.map(n => ({ notes: [n], label: T.name(n) })), { clef: 'treble', evW: 44 }) : '<p class="muted center">no musical letters yet</p>';
      let k = 0; $('#nnmap').innerHTML = sp.map(x => x.gap ? '<i class="nn-gap"></i>' : `<span class="${x.nm ? '' : 'off'}"><b>${esc(x.ch)}</b><small>${x.nm ? esc(T.name(notes[k++])) + (st.mode === 'vow' ? ' · ' + SOLF[x.nm] : '') : '–'}</small></span>`).join('');
      const m = MODES.find(x => x[0] === st.mode); $('#nnhow').innerHTML = `<b>${({fr:'French grid',ger:'German (B-A-C-H)',vow:'Josquin (vowels)'})[m[0]]}.</b> ${esc(m[2])}${st.mode !== 'fr' ? ' Letters that have no note in this system are skipped (shown with –).' : ''}`;
      st.notes = notes;
    };
    $('#nnw').addEventListener('input', e => { st.w = e.target.value; draw(); });
    $('#nnm').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; st.mode = b.dataset.m; $$('#nnm button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    $('#nnhb').addEventListener('change', e => { st.hb = e.target.checked; draw(); });
    $('#nnplay').onclick = () => { (st.notes || []).forEach((n, i) => Audio.playMidi(T.midi(n), i * 0.42, 0.6)); };
    $('#nnshare').onclick = () => { const u = location.origin + location.pathname + '#namenotes/' + encodeURIComponent(st.w || ''); const fb = () => { if (navigator.share) navigator.share({ url: u }).catch(() => {}); else toastC(u); }; try { navigator.clipboard.writeText(u).then(() => toastC('Link copied'), fb); } catch (e) { fb(); } /* 1.7: only say copied when it was */ };
    draw();
  };
  function toastC(msg) { let t = $('#nntoast'); if (!t) { t = document.createElement('div'); t.id = 'nntoast'; t.className = 'nn-toast'; document.body.appendChild(t); } t.textContent = msg; t.classList.add('on'); clearTimeout(toastC.t); toastC.t = setTimeout(() => t.classList.remove('on'), 1800); }

  /* ---------- 2. Melody harmonizer: tap a tune, get chords under it (common-practice rules, shown as Roman numerals) ---------- */
  const DEG_MAJ = [['I', 'maj', 'T'], ['ii', 'min', 'PD'], ['iii', 'min', 'T'], ['IV', 'maj', 'PD'], ['V', 'maj', 'D'], ['vi', 'min', 'T'], ['vii°', 'dim', 'D']];
  const DEG_MIN = [['i', 'min', 'T'], ['ii°', 'dim', 'PD'], ['III', 'maj', 'T'], ['iv', 'min', 'PD'], ['V', 'maj', 'D'], ['VI', 'maj', 'T'], ['vii°', 'dim', 'D']];
  const STEPS_MAJ = [0, 2, 4, 5, 7, 9, 11], STEPS_MIN = [0, 2, 3, 5, 7, 8, 11]; // harmonic minor, so V and vii° have the leading tone
  // what usually follows what in common-practice harmony (degree index → good next degrees)
  const GOOD = { 0: [3, 4, 5, 1, 2, 6], 1: [4, 6], 2: [5, 3], 3: [4, 0, 1, 6], 4: [0, 5], 5: [1, 3, 4], 6: [0] };
  const FUNC_WORD = { T: 'tonic: home', PD: 'pre-dominant: moving away', D: 'dominant: wants to resolve home' };
  const PRESETS = [['Ode to Joy (Beethoven)', 0, false, 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4'], ['Twinkle Twinkle (trad.)', 0, false, 'C4 C4 G4 G4 A4 A4 G4 F4 F4 E4 E4 D4 D4 C4'], ['Greensleeves opening (trad.)', 9, true, 'A4 C5 D5 E5 F5 E5 D5 B4 G4 A4 B4 C5 A4 A4 G#4 A4 B4 G#4 E4']];
  function chordPcs(tonic, minor, d) { const S = minor ? STEPS_MIN : STEPS_MAJ; return [0, 2, 4].map(k => (tonic + S[(d + k) % 7]) % 12); }
  function harmonize(mel, tonic, minor, jitter) {
    const n = mel.length; if (!n) return []; const R = jitter ? (() => { let s = jitter; return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296); })() : () => 0;
    const cost = [], back = [];
    for (let i = 0; i < n; i++) {
      cost.push(new Array(7).fill(Infinity)); back.push(new Array(7).fill(-1)); const pc = mel[i] % 12;
      for (let d = 0; d < 7; d++) {
        const tones = chordPcs(tonic, minor, d); let c;
        if (tones.includes(pc)) c = tones[0] === pc ? 0 : 0.4; // melody on the root sounds most settled
        else { const pv = i > 0 ? mel[i - 1] : null, nx = i < n - 1 ? mel[i + 1] : null; const step = (a, b) => a != null && b != null && Math.abs(a - b) <= 2 && a !== b; c = step(pv, mel[i]) && step(mel[i], nx) ? 3 : 7; }
        if (d === 6) c += 1.5; if (d === 2) c += 0.8; // vii° and iii are used sparingly
        if (i === 0) c += d === 0 ? 0 : d === 4 ? 1.5 : 3; // start at home
        if (i === n - 1) c += d === 0 ? 0 : d === 4 ? 3.5 : 8; // end at home (or on V: a half cadence)
        c += R() * 1.2;
        if (i === 0) { cost[0][d] = c; continue; }
        for (let p = 0; p < 7; p++) { if (cost[i - 1][p] === Infinity) continue; let t = p === d ? 1.2 : GOOD[p].includes(d) ? GOOD[p].indexOf(d) * 0.15 : 3; if (p === 4 && d === 3) t += 2.5; if (i === n - 1 && !(p === 4 || p === 6)) t += 2; const v = cost[i - 1][p] + t + c; if (v < cost[i][d]) { cost[i][d] = v; back[i][d] = p; } }
      }
    }
    let d = 0, best = Infinity; for (let k = 0; k < 7; k++) if (cost[n - 1][k] < best) { best = cost[n - 1][k]; d = k; }
    const out = new Array(n); for (let i = n - 1; i >= 0; i--) { out[i] = d; d = back[i][d]; }
    return out;
  }
  function chordName(tonic, minor, d) { const DEG = minor ? DEG_MIN : DEG_MAJ, S = minor ? STEPS_MIN : STEPS_MAJ; const rpc = (tonic + S[d]) % 12, ty = DEG[d][1]; return T.spell.root(rpc, ty) + (ty === 'min' ? 'm' : ty === 'dim' ? '°' : ''); }
  routes.harmonize = v => {
    if (!pro()) return CadPro.locked ? CadPro.locked(v, 'Melody harmonizer', 'Tap a tune, get chords under it') : (v.innerHTML = '<p>Pro</p>');
    const st = JSON.parse(localStorage.getItem('cad.hz') || 'null') || { mel: [], tonic: 0, minor: false, j: 0 };
    v.innerHTML = `<a class="back" href="#tools">← Tools</a><h2>🎼 Melody harmonizer</h2><p class="muted intro">Tap a melody on the keys (or load one). Cadence picks a chord for every note using common-practice rules and shows why.</p>
      <div class="card"><div class="row nn-row"><label class="muted small">Key <select id="hzk">${Array.from({ length: 12 }, (_, i) => `<option value="${i}">${T.spell.MAJ[i]}</option>`).join('')}</select></label><div class="nn-seg sm" id="hzq"><button data-q="0">major</button><button data-q="1">minor</button></div></div>
      <div id="hzpz"></div><div class="row"><button class="btn ghost sm" id="hzundo">↶ Undo</button><button class="btn ghost sm" id="hzclr">Clear</button><select id="hzpre" class="sm"><option value="">Load a tune…</option>${PRESETS.map((p, i) => `<option value="${i}">${p[0]}</option>`).join('')}</select></div></div>
      <div class="card" id="hzout"></div><p class="muted small">How it works: each chord must contain the melody note (or the note must be a passing step between its neighbours). Chords move the way common-practice harmony usually does (tonic → pre-dominant → dominant → tonic), start and end at home, and end on a cadence. It's a rule-based suggestion: there are always other good harmonizations, so try "another version".</p>`;
    const pz = UI.piano($('#hzpz'), { from: 55, to: 81, onNote: m => { if (st.mel.length >= 32) return; st.mel.push(m); upd(); } });
    const save = () => localStorage.setItem('cad.hz', JSON.stringify(st));
    const upd = () => {
      save(); $('#hzk').value = st.tonic; $$('#hzq button').forEach(b => b.classList.toggle('on', +b.dataset.q === (st.minor ? 1 : 0)));
      const out = $('#hzout'); if (!st.mel.length) { out.innerHTML = '<p class="muted center">Tap at least 3 notes.</p>'; pz.highlight(new Set()); return; }
      const H = harmonize(st.mel, st.tonic, st.minor, st.j), DEG = st.minor ? DEG_MIN : DEG_MAJ;
      const notes = st.mel.map(m => T.parse(T.spell.midiName(m, T.spell.inKey(m % 12, st.tonic, st.minor))));
      out.innerHTML = `<div class="hz-staff">${UI.staff(notes.map((n, i) => ({ notes: [n], label: DEG[H[i]][0] })), { clef: 'treble', evW: 46 })}</div><div class="hz-ch">${H.map((d, i) => `<span class="hz-${DEG[d][2]}"><b>${esc(chordName(st.tonic, st.minor, d))}</b><small>${DEG[d][0]}</small></span>`).join('')}</div>
        <div class="hz-leg"><span class="hz-T">T</span> ${FUNC_WORD.T}<br><span class="hz-PD">PD</span> ${FUNC_WORD.PD}<br><span class="hz-D">D</span> ${FUNC_WORD.D}</div>
        <p class="small">Ending: <b>${H.length > 1 && (H[H.length - 2] === 4 || H[H.length - 2] === 6) && H[H.length - 1] === 0 ? 'authentic cadence (V → I), the strongest "the end"' : H[H.length - 1] === 0 ? 'lands on I, but without a V right before it' : H[H.length - 1] === 4 ? 'half cadence (ends on V): sounds unfinished, like a question' : 'not on I. Try ending the melody on the key note'}</b>.</p>
        <div class="row"><button class="btn" id="hzplay">▶︎ Play with chords</button><button class="btn ghost" id="hzalt">Another version</button></div>`;
      $('#hzplay').onclick = () => { const S = st.minor ? STEPS_MIN : STEPS_MAJ; st.mel.forEach((m, i) => { const t = i * 0.55; Audio.playMidi(m, t, 0.55, 0.9); const pcs = chordPcs(st.tonic, st.minor, H[i]); if (i === 0 || H[i] !== H[i - 1]) { let r = 48 + pcs[0]; if (r > 55) r -= 12; Audio.playMidi(r - 12 < 36 ? r : r - 12, t, 1, 0.5); pcs.forEach(p => { let x = 52 + ((p - 52) % 12 + 12) % 12; Audio.playMidi(x, t, 1, 0.35); }); } }); };
      $('#hzalt').onclick = () => { st.j = (Date.now() & 0xffff) || 1; upd(); };
    };
    $('#hzk').onchange = e => { st.tonic = +e.target.value; st.j = 0; upd(); };
    $('#hzq').onclick = e => { const b = e.target.closest('[data-q]'); if (!b) return; st.minor = b.dataset.q === '1'; st.j = 0; upd(); };
    $('#hzundo').onclick = () => { st.mel.pop(); upd(); };
    $('#hzclr').onclick = () => { st.mel = []; st.j = 0; upd(); };
    $('#hzpre').onchange = e => { const p = PRESETS[+e.target.value]; if (!p) return; st.tonic = p[1]; st.minor = p[2]; st.mel = p[3].split(' ').map(s => T.midi(T.parse(s))); st.j = 0; e.target.value = ''; upd(); };
    upd();
  };
  window.EXTRA_TOOLS = (window.EXTRA_TOOLS || []).concat([['#namenotes', '✍️ Your name in notes', 'any word as a melody, 3 historical ways'], ['#harmonize', '🎼 Melody harmonizer', 'tap a tune, get chords + why']]);
  const _tools = routes.tools; routes.tools = (v, ...a) => { _tools(v, ...a); if (!pro()) { const t = v.querySelector('a[href="#harmonize"] b'); if (t) t.textContent += ' 🔒'; } };
  window.CadX26 = { spell, harmonize, chordName };
})();
