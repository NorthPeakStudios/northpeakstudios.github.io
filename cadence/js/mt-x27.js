// Cadence 1.7 · three more Labs: Practice log + Tempo trainer (free) · Sight-reading (Pro). Original Northpeak code.
(() => {
  const pro = () => !!(window.CadPro && CadPro.pro());
  const lockV = (v, what, why) => (window.CadPro && CadPro.locked ? CadPro.locked : window.locked)(v, what, why);
  const back = '<a class="back" href="#labs">← Labs</a>';
  const alive = el => el && document.body.contains(el);
  const ls = (k, d) => { try { const v = localStorage.getItem('cad.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lset = (k, v) => { try { localStorage.setItem('cad.' + k, JSON.stringify(v)); } catch (e) {} };
  const h = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const day = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const weekStart = t => { const d = new Date(day(t)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }; // Monday

  /* ---------- 1. Practice log (free): timer or quick add, what you worked on, weekly bars ---------- */
  routes.plog = v => {
    const draw = () => {
      const log = ls('plog', []), tm = ls('ptimer', null), now = Date.now(), ws = weekStart(now);
      const wk = log.filter(x => x.t >= ws).reduce((s, x) => s + x.min, 0);
      const weeks = Array.from({ length: 8 }, (_, i) => { const a = ws - (7 - i) * 7 * 864e5, b = a + 7 * 864e5; return { a, min: log.filter(x => x.t >= a && x.t < b).reduce((s, x) => s + x.min, 0) }; });
      const mx = Math.max(30, ...weeks.map(w => w.min));
      const days = Array.from({ length: 7 }, (_, i) => { const a = ws + i * 864e5; return { a, min: log.filter(x => day(x.t) === a).reduce((s, x) => s + x.min, 0) }; });
      const goal = ls('pgoal', 0);
      v.innerHTML = `${back}<h2>⏱️ Practice log</h2><p class="muted intro">Time your instrument practice and note what you worked on. Saved on this phone.</p>
        <div class="card x27-timer"><div class="x27-clock" id="plc">${tm ? '…' : '0:00'}</div>
          <input class="inp" id="plw" maxlength="80" placeholder="what are you working on? (scales, band piece, sight-reading…)" value="${h(tm ? tm.what : ls('plast', ''))}" aria-label="What you are practising">
          <div class="row"><button class="btn" id="plgo">${tm ? '■ Stop & save' : '▶︎ Start practising'}</button>${tm ? '<button class="btn ghost sm" id="plx">Discard</button>' : ''}</div>
          ${tm ? '' : `<div class="nn-seg sm" id="plq" aria-label="Quick add minutes">${[10, 15, 20, 30, 45].map(m => `<button data-m="${m}" aria-label="Add ${m} minutes">+${m}m</button>`).join('')}</div>`}</div>
        <div class="card"><div class="x27-stat"><b>${wk}</b><span>min this week${goal ? ` · goal ${goal}` : ''}</span></div>${goal ? `<div class="x27-goal"><i style="width:${Math.min(100, Math.round(wk / goal * 100))}%"></i></div>` : ''}
          <div class="x27-days">${days.map(d => `<div><i style="height:${Math.min(100, Math.round(d.min / Math.max(30, ...days.map(x => x.min)) * 100))}%"></i><small>${'MTWTFSS'[(new Date(d.a).getDay() + 6) % 7]}</small></div>`).join('')}</div>
          <p class="muted small">Weekly goal <select id="plg" aria-label="Weekly goal">${[0, 60, 90, 120, 150, 180, 240, 300].map(g => `<option value="${g}"${g === goal ? ' selected' : ''}>${g ? g + ' min' : 'none'}</option>`).join('')}</select></p></div>
        <div class="card"><h3>Last 8 weeks</h3><div class="x27-weeks">${weeks.map(w => `<div><i style="height:${Math.round(w.min / mx * 100)}%"></i><small>${new Date(w.a).getMonth() + 1}/${new Date(w.a).getDate()}</small><b>${w.min || ''}</b></div>`).join('')}</div></div>
        ${log.length ? `<div class="card"><h3>Recent</h3>${log.slice(-12).reverse().map(x => `<div class="x27-item"><span><b>${x.min} min</b> ${h(x.what || 'practice')}</span><small>${new Date(x.t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</small><button class="x27-del" data-t="${x.t}" aria-label="Delete this session">×</button></div>`).join('')}</div>` : ''}`;
      const save = (min, what) => { const L = ls('plog', []); L.push({ t: Date.now(), min: Math.max(1, Math.min(600, Math.round(min))), what: String(what || '').slice(0, 80) }); lset('plog', L.slice(-1500)); if (what) lset('plast', String(what).slice(0, 80)); };
      $('#plgo').onclick = () => { const t = ls('ptimer', null), what = $('#plw').value.trim(); if (!t) { lset('ptimer', { start: Date.now(), what }); } else { const min = (Date.now() - t.start) / 60000; lset('ptimer', null); if (min < 0.5) toast('Under a minute, not saved'); else { save(min, what || t.what); toast('Saved ' + Math.max(1, Math.round(min)) + ' min'); } } draw(); };
      if ($('#plx')) $('#plx').onclick = () => { lset('ptimer', null); draw(); };
      v.querySelectorAll('#plq [data-m]').forEach(b => b.onclick = () => { save(+b.dataset.m, $('#plw').value.trim()); toast('Added ' + b.dataset.m + ' min'); draw(); });
      $('#plg').onchange = e => { lset('pgoal', +e.target.value); draw(); };
      v.querySelectorAll('.x27-del').forEach(b => b.onclick = () => { if (!confirm('Delete this session?')) return; lset('plog', ls('plog', []).filter(x => String(x.t) !== b.dataset.t)); draw(); });
      const clock = $('#plc');
      if (tm) { const tick = () => { if (!alive(clock) || !ls('ptimer', null)) return; const s = Math.floor((Date.now() - tm.start) / 1000); clock.textContent = Math.floor(s / 3600) ? `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; setTimeout(tick, 500); }; tick(); }
    };
    draw();
  };

  /* ---------- 2. Tempo trainer (free): metronome that climbs from a start tempo to a goal tempo ---------- */
  routes.tempo = v => {
    const st = Object.assign({ bpm: 80, goal: 120, step: 4, every: 4, beats: 4, sub: 1, climb: true }, ls('tempo', {}));
    v.innerHTML = `${back}<h2>🥁 Tempo trainer</h2><p class="muted intro">Practise a hard passage slow, and let the metronome speed up a little every few bars until you hit your goal tempo.</p>
      <div class="card"><div class="x27-bpm"><b id="tpb">${st.bpm}</b><span>bpm</span></div><div class="x27-dots" id="tpd">${Array.from({ length: st.beats }, (_, i) => `<i${i ? '' : ' class="acc"'}></i>`).join('')}</div>
        <p class="muted small center" id="tpbar">bar 0</p><div class="x27-c"><button class="btn" id="tpgo">▶︎ Start</button></div></div>
      <div class="card x27-set">
        <label><span>Start tempo</span><b id="tpsv">${st.bpm}</b><input type="range" id="tps" min="30" max="240" value="${st.bpm}" aria-label="Start tempo"></label>
        <label><span>Speed up</span><select id="tpc"><option value="1"${st.climb ? ' selected' : ''}>yes</option><option value="0"${st.climb ? '' : ' selected'}>no, steady</option></select></label>
        <label><span>Goal tempo</span><b id="tpgv">${st.goal}</b><input type="range" id="tpg" min="30" max="260" value="${st.goal}" aria-label="Goal tempo"></label>
        <label><span>Add <select id="tpst" aria-label="bpm to add">${[1, 2, 3, 4, 5, 8, 10].map(x => `<option${x === st.step ? ' selected' : ''}>${x}</option>`).join('')}</select> bpm every <select id="tpev" aria-label="bars between steps">${[1, 2, 4, 8].map(x => `<option${x === st.every ? ' selected' : ''}>${x}</option>`).join('')}</select> bars</span></label>
        <label><span>Beats per bar</span><select id="tpbe">${[2, 3, 4, 5, 6, 7].map(x => `<option${x === st.beats ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
        <label><span>Clicks per beat</span><select id="tpsu">${[[1, 'quarters'], [2, 'eighths'], [3, 'triplets'], [4, 'sixteenths']].map(([x, l]) => `<option value="${x}"${x === st.sub ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      </div><p class="muted small">Tip: start where you can play it cleanly, not where you wish you could.</p>`;
    const el = $('#tpb'); let run = false, timer = 0, next = 0, n = 0, bpm = st.bpm, bar = 0;
    const save = () => lset('tempo', st);
    const bind = (id, k, cast) => { const e = $('#' + id); e.oninput = e.onchange = () => { st[k] = cast(e.value); if ($('#' + id + 'v')) $('#' + id + 'v').textContent = e.value; if (k === 'bpm' && !run) { bpm = st.bpm; el.textContent = bpm; } if (k === 'beats') $('#tpd').innerHTML = Array.from({ length: st.beats }, (_, i) => `<i${i ? '' : ' class="acc"'}></i>`).join(''); save(); }; };
    bind('tps', 'bpm', Number); bind('tpg', 'goal', Number); bind('tpst', 'step', Number); bind('tpev', 'every', Number); bind('tpbe', 'beats', Number); bind('tpsu', 'sub', Number); bind('tpc', 'climb', x => x === '1');
    const click = (t, kind) => { const c = Audio.ctx; if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.frequency.value = kind === 2 ? 1760 : kind === 1 ? 1175 : 880; const vol = kind === 0 ? 0.12 : 0.35; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.06); };
    const flash = (beat, b) => setTimeout(() => { if (!alive(el)) return; $$('#tpd i').forEach((d, i) => d.classList.toggle('on', i === beat)); el.textContent = Math.round(bpm); $('#tpbar').textContent = 'bar ' + (b + 1); }, Math.max(0, (next - Audio.ctx.currentTime) * 1000));
    const stop = () => { run = false; clearInterval(timer); timer = 0; if (alive(el)) { $('#tpgo').textContent = '▶︎ Start'; $$('#tpd i').forEach(d => d.classList.remove('on')); } };
    const tickS = () => {
      if (!alive(el) || !Audio.ctx) return stop();
      const c = Audio.ctx;
      while (next < c.currentTime + 0.12) {
        const per = st.beats * st.sub, k = n % per, beat = Math.floor(k / st.sub), isBeat = k % st.sub === 0;
        if (k === 0 && n > 0) { bar++; if (st.climb && bar % st.every === 0 && bpm < st.goal) bpm = Math.min(st.goal, bpm + st.step); }
        click(next, isBeat ? (beat === 0 ? 2 : 1) : 0); if (isBeat) flash(beat, bar);
        next += 60 / bpm / st.sub; n++;
      }
    };
    $('#tpgo').onclick = () => { if (run) return stop(); Audio.ensure(); run = true; bpm = st.bpm; bar = 0; n = 0; next = Audio.ctx.currentTime + 0.1; $('#tpgo').textContent = '■ Stop'; tickS(); timer = setInterval(tickS, 25); };
  };

  /* ---------- 3. Sight-reading (Pro): a fresh 4-bar melody in any key, at your level ---------- */
  const KS = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5]; // key signature (sharps +, flats -) for each major key index
  const DEG = [0, 2, 4, 5, 7, 9, 11];
  routes.sight = v => {
    if (!pro()) return lockV(v, 'Sight-reading', 'A fresh melody to read every time, in any key');
    const st = Object.assign({ key: 0, clef: 'treble', lvl: 1, bpm: 72, names: false }, ls('sight', {}));
    let mel = [];
    const gen = () => {
      const span = st.lvl === 1 ? [0, 4] : st.lvl === 2 ? [-1, 7] : [-3, 9], maxJump = st.lvl === 1 ? 1 : st.lvl === 2 ? 2 : 4;
      let d = st.lvl === 1 ? 0 : [0, 2, 4][Math.floor(Math.random() * 3)]; const out = [d];
      for (let i = 1; i < 15; i++) {
        let j; do { j = Math.round((Math.random() * 2 - 1) * maxJump); if (st.lvl === 1 && j === 0) j = Math.random() < .5 ? 1 : -1; } while (d + j < span[0] || d + j > span[1] || (i > 1 && j === 0 && out[i - 1] === out[i - 2]));
        d += j; out.push(d);
      }
      out[15] = Math.abs(d - 7) < Math.abs(d) ? 7 : 0; if (st.lvl === 1) out[15] = 0; // end on the tonic
      if (Math.abs(out[15] - out[14]) > maxJump + 1) out[14] = out[15] + (out[14] > out[15] ? 1 : -1);
      return out;
    };
    const midiOf = dg => { const oct = Math.floor(dg / 7), s = ((dg % 7) + 7) % 7, base = (st.clef === 'treble' ? 60 : 48) + st.key - (st.key > 7 ? 12 : 0); return base + oct * 12 + DEG[s]; };
    const noteOf = m => T.parse(T.spell.midiName(m, T.spell.inKey(m % 12, st.key, false)));
    const draw = () => {
      const notes = mel.map(midiOf).map(noteOf), lab = (n, i) => st.names ? T.name(n).replace(/\d+$/, '') : (i % 4 === 0 ? String(i / 4 + 1) : '');
      $('#srst').innerHTML = `<div class="x27-staff">${UI.staff(notes.slice(0, 8).map((n, i) => ({ notes: [n], label: lab(n, i) })), { clef: st.clef, keySig: KS[st.key], evW: 34, timeSig: [4, 4] })}</div><div class="x27-staff">${UI.staff(notes.slice(8).map((n, i) => ({ notes: [n], label: lab(n, i + 8) })), { clef: st.clef, keySig: KS[st.key], evW: 34 })}</div>`;
    };
    const fresh = () => { mel = gen(); draw(); };
    v.innerHTML = `${back}<h2>👀 Sight-reading</h2><p class="muted intro">Read it once, then play or sing it at the tempo without stopping. Tap “hear it” to check yourself. A new melody every time.</p>
      <div class="card"><div class="row nn-row"><label class="muted small">Key <select id="srk">${T.spell.MAJ.map((k, i) => `<option value="${i}"${i === st.key ? ' selected' : ''}>${k} major</option>`).join('')}</select></label><label class="muted small">Clef <select id="src"><option value="treble"${st.clef === 'treble' ? ' selected' : ''}>treble</option><option value="bass"${st.clef === 'bass' ? ' selected' : ''}>bass</option></select></label></div>
        <div class="nn-seg sm" id="srl">${[[1, 'steps'], [2, 'steps + skips'], [3, 'leaps']].map(([l, n]) => `<button data-l="${l}" class="${l === st.lvl ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div id="srst"></div>
        <div class="row"><button class="btn" id="srplay">▶︎ Hear it</button><button class="btn ghost sm" id="srnew">↻ New melody</button><button class="btn ghost sm" id="srnm" aria-pressed="${st.names}">${st.names ? 'Hide' : 'Show'} note names</button></div>
        <p class="muted small">Tempo ♩ = <b id="srbv">${st.bpm}</b> <input type="range" id="srb" min="40" max="140" value="${st.bpm}" aria-label="Tempo"> · one bar of clicks first</p></div>`;
    const save = () => lset('sight', st);
    $('#srk').onchange = e => { st.key = +e.target.value; save(); fresh(); };
    $('#src').onchange = e => { st.clef = e.target.value; save(); fresh(); };
    v.querySelectorAll('#srl [data-l]').forEach(b => b.onclick = () => { st.lvl = +b.dataset.l; v.querySelectorAll('#srl button').forEach(x => x.classList.toggle('on', x === b)); save(); fresh(); });
    $('#srnew').onclick = fresh;
    $('#srnm').onclick = () => { st.names = !st.names; save(); $('#srnm').textContent = (st.names ? 'Hide' : 'Show') + ' note names'; $('#srnm').setAttribute('aria-pressed', st.names); draw(); };
    $('#srb').oninput = e => { st.bpm = +e.target.value; $('#srbv').textContent = st.bpm; save(); };
    $('#srplay').onclick = () => { Audio.stopAll(); Audio.ensure(); const q = 60 / st.bpm; for (let i = 0; i < 4; i++) Audio.click(i * q, i === 0); mel.forEach((dg, i) => Audio.playMidi(midiOf(dg), (4 + i) * q, q * (i === 15 ? 2 : 0.92))); };
    fresh();
  };
  window.CadX27 = { routes: ['plog', 'tempo', 'sight'] };
})();
