import { PROMPTS } from './prompts.js';
import { moodColors, mixHex, hexRgb, moodWord, quadrant } from './color.js';
import { Engine } from './audio.js';
import { analyze, compose } from './poet.js';
import { drawScene, sceneFor, SCENES, poster } from './paint.js?v=12';
import * as cloud from './cloud.js?v=15';
import * as db from './db.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const LS = { get: (k, d) => { try { const v = localStorage.getItem('lim.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set: (k, v) => { try { localStorage.setItem('lim.' + k, JSON.stringify(v)); } catch {} } };
const CHIPS = ['foggy', 'tender', 'electric', 'hollow', 'warm', 'sharp', 'tangled', 'glowing', 'distant', 'raw', 'open', 'weightless'];
const newSeed = () => (Math.random() * 4294967295) >>> 0;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const engine = new Engine();
const isPro = () => cloud.isPro();
const S = { mode: 'words', live: { v: .62, e: .3, chips: [] }, field: { v: .62, e: .3 }, chips: [], seed: newSeed(), result: null, moments: [], view: 'painting', muralMonth: null, detail: null, muted: LS.get('muted', false), tab: 'feel' };

/* ---------- aura ---------- */
const aura = (() => {
  const cv = $('#aura'), ctx = cv.getContext('2d');
  let W = 0, H = 0; const scale = 0.42;
  const cur = { c: moodColors(.62, .3).map(hexRgb), fx: .5, fy: .42, en: .3 }, tgt = { c: cur.c.map(x => x.slice()), fx: .5, fy: .42, en: .3 };
  function resize(){ W = cv.width = Math.max(2, Math.round(innerWidth * scale)); H = cv.height = Math.max(2, Math.round(innerHeight * scale)); }
  resize(); addEventListener('resize', resize);
  let t0 = performance.now(), phase = 0, frames = 0, running = true;
  function draw(now){
    if (!running) return;
    const dt = Math.min(50, now - t0); t0 = now;
    const k = 1 - Math.pow(0.94, dt / 16);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cur.c[i][j] += (tgt.c[i][j] - cur.c[i][j]) * k;
    cur.fx += (tgt.fx - cur.fx) * k; cur.fy += (tgt.fy - cur.fy) * k; cur.en += (tgt.en - cur.en) * k;
    phase += dt * (0.00010 + cur.en * 0.00045);
    const [g, s, d] = cur.c.map(c => c.map(x => Math.round(x)));
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgb(${d})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    const M = Math.max(W, H), blobs = [
      [g, .78, 0.55, 1.0, 0.0], [s, .66, 0.62, 0.7, 2.1], [g, .38, 0.42, 1.3, 4.2], [s, .42, 0.5, 0.9, 1.1]];
    blobs.forEach(([c, a, rr, sp, off], i) => {
      const x = (cur.fx + Math.sin(phase * sp + off) * 0.28 + (i === 1 ? .15 : i === 2 ? -.18 : 0)) * W;
      const y = (cur.fy + Math.cos(phase * sp * 0.8 + off * 1.3) * 0.22 + (i === 3 ? .3 : i === 1 ? .12 : 0)) * H;
      const r = M * rr * (1 + Math.sin(phase * 1.7 + i) * 0.08);
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(0.55, `rgba(${c},${a * 0.35})`); gr.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    });
    ctx.globalCompositeOperation = 'source-over';
    const vg = ctx.createRadialGradient(W / 2, H * .45, M * .2, W / 2, H / 2, M * .8);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (++frames % 8 === 0) { const rs = document.documentElement.style; rs.setProperty('--glow', `rgb(${g})`); rs.setProperty('--glow2', `rgb(${s})`); }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { t0 = performance.now(); requestAnimationFrame(draw); } });
  return { set(colors, fx, fy, en){ tgt.c = colors.map(hexRgb); if (fx != null) { tgt.fx = fx; tgt.fy = fy; } if (en != null) tgt.en = en; } };
})();

(function grain(){
  const c = document.createElement('canvas'); c.width = c.height = 180; const x = c.getContext('2d'), d = x.createImageData(180, 180);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); $('.grain').style.backgroundImage = `url(${c.toDataURL()})`;
})();

/* ---------- sound ---------- */
const ICON_ON = '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
function paintSoundIcons(){ [$('#soundBtn'), $('#dSound')].forEach(b => { b.innerHTML = (S.muted || !isPro()) ? ICON_OFF : ICON_ON; b.classList.toggle('locked', !isPro()); b.setAttribute('aria-label', S.muted ? 'Sound off' : 'Sound on'); }); $('#sSoundT').classList.toggle('on', !S.muted); }
async function unlock(){
  await engine.unlock(); engine.setMuted(S.muted);
  $('#soundPill').classList.remove('on');
  syncSound();
}
function syncSound(){
  if (!engine.ready) return;
  const wantPlay = isPro() && !S.muted && (S.detail || S.tab === 'feel');
  if (wantPlay) engine.play(); else engine.stop();
}
function setMuted(m){ S.muted = m; LS.set('muted', m); engine.setMuted(m); paintSoundIcons(); syncSound(); }
['pointerdown', 'touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (!engine.ready || engine.ctx.state !== 'running') unlock(); }, { passive: true }));
document.addEventListener('visibilitychange', () => document.hidden ? engine.suspend() : engine.resume());
$('#soundBtn').onclick = () => isPro() ? setMuted(!S.muted) : openPro('the soundscape');
$('#dSound').onclick = () => isPro() ? setMuted(!S.muted) : openPro('the soundscape');
paintSoundIcons();

/* ---------- live mood (aura + sound follow it) ---------- */
function palette(a, chips = []){
  const c = moodColors(a.v, a.e, chips);
  const cw = a.colorWords || [];
  if (cw[0]) c[0] = mixHex([c[0], cw[0]]);
  if (cw[1]) c[1] = mixHex([c[1], cw[1]]); else if (cw[0]) c[1] = mixHex([c[1], c[1], cw[0]]);
  return c;
}
const CALM = { v: .62, e: .3, colorWords: [] };
function setLive(a, chips = [], seed = S.seed){
  S.live = { v: a.v, e: a.e, chips };
  if (!isPro()) { aura.set(palette(CALM), 0.5, 0.42, .3); return; } // the generated palette + soundscape are liminal pro; free keeps a calm, neutral sky
  aura.set(palette(a, chips), 0.2 + a.v * 0.6, 0.2 + (1 - a.e) * 0.5, a.e);
  engine.setMood(S.live, seed);
}

/* ---------- words ---------- */
const PLACEHOLDERS = ['type it however it comes out…', 'tired but kind of okay…', 'like static in my chest…', 'happy for no reason…', 'the song i can\'t stop replaying…', 'i don\'t know, just weird…', 'excited and scared at once…'];
let phI = 0; setInterval(() => { const t = $('#text'); if (!t.value && document.activeElement !== t) { phI = (phI + 1) % PLACEHOLDERS.length; t.placeholder = PLACEHOLDERS[phI]; } }, 3800);
let liveT;
$('#text').addEventListener('input', e => {
  const t = e.target.value; $('#translate').disabled = t.trim().length < 2;
  $('#count2').textContent = t.length > 300 ? `${400 - t.length}` : '';
  clearTimeout(liveT); liveT = setTimeout(() => {
    if (t.trim().length < 2) { $('#live').classList.remove('on'); return; }
    const a = analyze(t); setLive(a);
    if (!isPro()) { $('#live').classList.remove('on'); return; } // reading the mood as you type is part of the poem writer (pro)
    $('#liveWord').textContent = a.crisis ? 'heavy' : moodWord(a.v, a.e); $('#live').classList.add('on');
    $('#askEm').textContent = a.matched ? moodWord(a.v, a.e) : 'feel';
  }, 220);
});
$('#text').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!$('#translate').disabled) $('#translate').click(); } });

/* ---------- field ---------- */
const field = $('#field'), dot = $('#dot');
function placeDot(){ const r = field.getBoundingClientRect(); dot.style.transform = `translate(${S.field.v * r.width}px, ${(1 - S.field.e) * r.height}px)`; }
function fieldMood(){ setLive({ v: S.field.v, e: S.field.e, colorWords: [] }, S.chips); $('#fieldWord').textContent = moodWord(S.field.v, S.field.e); }
let dragging = false;
function fromEvent(ev){ const r = field.getBoundingClientRect(); S.field.v = Math.min(.98, Math.max(.02, (ev.clientX - r.left) / r.width)); S.field.e = Math.min(.98, Math.max(.02, 1 - (ev.clientY - r.top) / r.height)); placeDot(); fieldMood(); }
field.addEventListener('pointerdown', ev => { dragging = true; field.setPointerCapture(ev.pointerId); field.classList.add('dragging'); $('#hint').style.opacity = 0; fromEvent(ev);
  const rp = document.createElement('span'); const r = field.getBoundingClientRect(); rp.className = 'ripple'; rp.style.left = (ev.clientX - r.left) + 'px'; rp.style.top = (ev.clientY - r.top) + 'px'; field.appendChild(rp); setTimeout(() => rp.remove(), 900); });
field.addEventListener('pointermove', ev => { if (dragging) fromEvent(ev); });
['pointerup', 'pointercancel'].forEach(t => field.addEventListener(t, () => { dragging = false; field.classList.remove('dragging'); }));
field.addEventListener('keydown', e => { const d = .04; if (e.key === 'ArrowLeft') S.field.v -= d; else if (e.key === 'ArrowRight') S.field.v += d; else if (e.key === 'ArrowUp') S.field.e += d; else if (e.key === 'ArrowDown') S.field.e -= d; else return; e.preventDefault(); S.field.v = Math.min(.98, Math.max(.02, S.field.v)); S.field.e = Math.min(.98, Math.max(.02, S.field.e)); placeDot(); fieldMood(); });
addEventListener('resize', placeDot);
$('#chips').innerHTML = CHIPS.map(c => `<button class="chip" data-c="${c}">${c}</button>`).join('');
$('#chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; const c = b.dataset.c;
  if (S.chips.includes(c)) S.chips = S.chips.filter(x => x !== c); else { if (S.chips.length >= 3) return toast('three is plenty'); S.chips.push(c); }
  b.classList.toggle('on', S.chips.includes(c)); fieldMood(); });

function showStage(id){ ['#stWords', '#stField', '#stResult'].forEach(s => $(s).hidden = s !== id); $('#feelScroll').scrollTop = 0; }
$('#toField').onclick = () => { S.mode = 'field'; showStage('#stField'); requestAnimationFrame(() => { placeDot(); fieldMood(); }); };
$('#toWords').onclick = () => { S.mode = 'words'; showStage('#stWords'); $('#text').focus(); };

/* ---------- prompts ---------- */
function pickPrompt(q){
  const list = PROMPTS[q], recent = LS.get('recent', []);
  const pool = list.filter(p => !recent.includes(p)); const p = (pool.length ? pool : list)[Math.floor(Math.random() * (pool.length || list.length))];
  LS.set('recent', [p, ...recent].slice(0, 40)); return p;
}
function setPrompt(p){ const el = $('#prompt'); el.classList.add('fade'); setTimeout(() => { el.textContent = p; el.classList.remove('fade'); }, 280); }

/* ---------- translate → the moment ---------- */
function buildResult(){
  let a, text = '', chips = [];
  if (S.mode === 'words') { text = $('#text').value.trim(); a = analyze(text); }
  else { chips = S.chips.slice(); a = { v: S.field.v, e: S.field.e, anchor: chips[0] || null, theme: null, colorWords: [], crisis: false, matched: 1 }; }
  return { a, text, chips, mode: S.mode };
}
function renderPoem(lines){ $('#poem').innerHTML = lines.map((l, i) => `<span style="animation-delay:${0.15 + i * 0.55}s">${esc(l)}</span>`).join(''); }
function translate(){
  const r = buildResult(), seed = newSeed(), pro = isPro();
  const poem = pro ? compose(r.a, seed) : null, colors = palette(r.a, r.chips), word = r.a.crisis ? 'heavy' : moodWord(r.a.v, r.a.e);
  S.result = { ...r, seed, poem, colors, word, prompt: pickPrompt(quadrant(r.a.v, r.a.e)) };
  S.seed = seed; setLive(r.a, r.chips, seed);
  $('#said').innerHTML = r.mode === 'words' ? `you said: <b>“${esc(r.text)}”</b>` : (pro ? `no words — <b>${esc(word)}</b>` : 'no words tonight') + (r.chips.length ? ', ' + esc(r.chips.join(', ')) : '');
  if (pro) renderPoem(poem); else $('#poem').innerHTML = '';
  $('#poem').hidden = !pro; $('#poemLock').hidden = pro; $('.result-row').hidden = !pro; paintLockCta();
  $('#resWord').textContent = word; $('#wordDot').style.background = colors[0]; $('#wordDot').style.boxShadow = `0 0 10px ${colors[0]}`;
  $('#swatches').innerHTML = colors.map(c => `<i style="background:${c}"></i>`).join('');
  $('#care').hidden = !r.a.crisis;
  $('#prompt').textContent = S.result.prompt; $('#answer').value = '';
  showStage('#stResult');
}
$('#translate').onclick = () => { $('#text').blur(); translate(); };
$('#translateField').onclick = translate;
$('#rewrite').onclick = () => { const R = S.result; if (!R || !isPro()) return; R.seed = newSeed(); R.poem = compose(R.a, R.seed); S.seed = R.seed; engine.setMood(S.live, R.seed); renderPoem(R.poem); };
$('#another').onclick = () => { if (!S.result) return; S.result.prompt = pickPrompt(quadrant(S.result.a.v, S.result.a.e)); setPrompt(S.result.prompt); };
$('#again').onclick = () => showStage(S.mode === 'words' ? '#stWords' : '#stField');
$('#answer').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

$('#keep').onclick = async () => {
  const R = S.result; if (!R) return;
  const m = { id: uid(), t: Date.now(), tz: -new Date().getTimezoneOffset(), mode: R.mode, text: R.text, poem: R.poem || null, v: +R.a.v.toFixed(3), e: +R.a.e.toFixed(3), chips: R.chips, colors: R.colors, word: R.word, prompt: R.prompt, answer: $('#answer').value.trim(), seed: R.seed, care: !!R.a.crisis, v1: 1 };
  try { await db.put(m); } catch (err) { toast('couldn\'t save — storage is full or blocked'); return; }
  S.moments.unshift(m); cloud.markDirty(m.id); syncSoon();
  flyToArchive(isPro() ? R.colors : ['#cfc8e6', '#8f88b0', '#2a2640']); toast('kept · ' + fmtTime(m.t));
  setTimeout(() => { $('#text').value = ''; $('#translate').disabled = true; $('#live').classList.remove('on'); $('#askEm').textContent = 'feel'; S.chips = []; $$('.chip').forEach(c => c.classList.remove('on')); S.result = null; showStage(S.mode === 'words' ? '#stWords' : '#stField'); }, 900);
  renderArchive();
  navigator.storage?.persist?.();
};
function flyToArchive(colors){
  const from = $('#keep').getBoundingClientRect(), to = $('#archiveTab').getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'fly';
  Object.assign(f.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px', background: `radial-gradient(circle at 30% 30%, ${colors[0]}, ${colors[1]} 60%, ${colors[2]})`, boxShadow: `0 0 40px ${colors[0]}` });
  document.body.appendChild(f);
  requestAnimationFrame(() => requestAnimationFrame(() => Object.assign(f.style, { left: to.left + to.width / 2 - 10 + 'px', top: to.top + 4 + 'px', width: '20px', height: '20px', borderRadius: '6px', opacity: .2 })));
  setTimeout(() => { f.remove(); $('#archiveTab').classList.remove('bump'); void $('#archiveTab').offsetWidth; $('#archiveTab').classList.add('bump'); }, 900);
}

/* ---------- tabs ---------- */
function goTab(t){
  S.tab = t; $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $('#feel').classList.toggle('active', t === 'feel'); $('#archive').classList.toggle('active', t === 'archive');
  if (t === 'archive') renderArchive(); else setLive(S.live, S.live.chips);
  syncSound();
}
$$('.tabs button').forEach(b => b.onclick = () => goTab(b.dataset.tab));

/* ---------- archive ---------- */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '');
const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
function dayLabel(t){
  const d = new Date(t), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
  if (dayKey(t) === dayKey(+now)) return 'today'; if (dayKey(t) === dayKey(+y)) return 'yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }).toLowerCase();
}
const tileBg = m => `radial-gradient(circle at ${18 + m.v * 64}% ${18 + (1 - m.e) * 64}%, ${m.colors[0]} 0%, transparent 62%), radial-gradient(circle at ${80 - m.v * 50}% 85%, ${m.colors[1]} 0%, transparent 70%), ${m.colors[2]}`;

$$('.seg button').forEach((b, i) => b.onclick = () => { S.view = b.dataset.view; $$('.seg button').forEach(x => x.classList.toggle('on', x === b)); $('.seg-pill').style.transform = `translateX(${i * 100}%)`; $$('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + S.view)); renderArchive(); });

const PRO_VIEWS = { painting: ['your moments, painted', 'every feeling you keep becomes a little scene: sunrise over the hills, rain on the window, a lone streetlight, a storm at sea. laid out week by week.'],
  mural: ['the mural', 'a calendar of colors, one square for every day you checked in.'], drift: ['your drift', 'watch your colors drift over the weeks: lighter, heavier, stiller, more restless.'] };
function renderArchive(){
  const n = S.moments.length, where = cloud.signedIn() ? 'synced to ' + cloud.acct.user : 'stays on your phone';
  $('#count').textContent = n ? `${n} moment${n === 1 ? '' : 's'} · ${where}` : where;
  document.body.classList.toggle('is-pro', isPro());
  if (S.tab !== 'archive' && !S.detail) return;
  if (PRO_VIEWS[S.view] && !isPro()) return renderLocked(S.view);
  ({ painting: renderPainting, moments: renderMoments, mural: renderMural, drift: renderDrift })[S.view]();
}
/* a locked pro view: a real preview of what it does (sample scenes behind frosted glass) and the way in */
const SAMPLE = [[.82, .22, 'hills', 'serene'], [.3, .6, 'rain', 'wistful'], [.2, .2, 'streetlight', 'sunken'], [.86, .86, 'fireworks', 'soaring'], [.14, .88, 'storm', 'stormy'], [.6, .4, 'sea', 'tender']];
function renderLocked(view){
  const el = $('#v-' + view), x = PRO_VIEWS[view]; paintKey = '';
  el.innerHTML = `<div class="lockview"><div class="locked-art">${SAMPLE.map((s, i) => `<canvas data-i="${i}" width="180" height="225"></canvas>`).join('')}</div>
    <div class="locked-card"><div class="lk-ico">${LOCK}</div><h4>${x[0]}</h4><p>${x[1]}</p>
    <button class="primary lk-go">${lockCta()}</button><p class="lk-fine">the journal stays free: typing, keeping moments, the list, export and delete.</p></div></div>`;
  el.querySelectorAll('canvas').forEach(c => { const s = SAMPLE[+c.dataset.i]; drawScene(c, { v: s[0], e: s[1], seed: 900 + +c.dataset.i * 31, colors: moodColors(s[0], s[1]), scene: s[2] }); });
  el.querySelector('.lk-go').onclick = () => openPro(x[0]);
}
const EMPTY = (h, p) => `<div class="empty"><div class="e-door"></div><h4>${h}</h4><p>${p}</p></div>`;

let paintKey = '', tileObs = null;
const weekStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return +d; };
function renderPainting(){
  const el = $('#v-painting'), ms = S.moments;
  if (!ms.length) { el.innerHTML = EMPTY('your gallery is empty', 'every moment you keep becomes a little painted scene. over the weeks your gallery fills with who you were.'); paintKey = ''; return; }
  const key = ms.map(m => m.id).join(','); if (key === paintKey && el.querySelector('.gallery')) return; paintKey = key;
  const groups = []; ms.forEach(m => { const k = weekStart(m.t); if (!groups.length || groups[groups.length - 1].k !== k) groups.push({ k, items: [] }); groups[groups.length - 1].items.push(m); });
  const now = weekStart(Date.now()), f = t => new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }).toLowerCase();
  const wl = k => k === now ? 'this week' : k === now - 7 * 864e5 ? 'last week' : `${f(k)} – ${f(k + 6 * 864e5)}`;
  const dl = t => dayKey(t) === dayKey(Date.now()) ? 'today ' + fmtTime(t) : new Date(t).toLocaleDateString([], { weekday: 'short' }).toLowerCase() + ' ' + fmtTime(t);
  const weeks = groups.length;
  el.innerHTML = `<div class="gal-head"><p>${ms.length} moment${ms.length === 1 ? '' : 's'}, ${weeks} week${weeks === 1 ? '' : 's'}. each feeling, painted as the scene it felt like. tap one to open it.</p><button id="savePaint" class="pill btn"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>save image</button></div>` +
    groups.map(g => { const mix2 = g.items.map(m => m.colors[0]); return `<section class="gal-week"><h5 class="gal-wl"><span>${wl(g.k)}</span><i style="background:linear-gradient(90deg,${mix2.length > 1 ? mix2.join(',') : mix2[0] + ',' + mix2[0]})"></i><b>${g.items.length}</b></h5><div class="gallery">${g.items.map(m => {
      const sc = sceneFor(m); return `<button class="scene" data-id="${m.id}" aria-label="${esc(m.word)}, ${esc(SCENES[sc])}"><canvas width="340" height="420" data-id="${m.id}"></canvas><span class="sc-cap"><b>${esc(m.word)}</b><small>${dl(m.t)}</small></span></button>`; }).join('')}</div></section>`; }).join('');
  $('#savePaint').onclick = savePainting;
  el.querySelectorAll('.scene').forEach(b => b.onclick = () => openDetail(ms, ms.findIndex(m => m.id === b.dataset.id)));
  if (tileObs) tileObs.disconnect();
  const draw = c => { if (c.dataset.done) return; c.dataset.done = 1; const m = ms.find(x => x.id === c.dataset.id); if (m) drawScene(c, m); };
  const cvs = [...el.querySelectorAll('.scene canvas')];
  if ('IntersectionObserver' in window) { tileObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { draw(e.target); tileObs.unobserve(e.target); } }), { rootMargin: '400px 0px' }); cvs.forEach(c => tileObs.observe(c)); }
  else cvs.forEach(draw);
  cvs.slice(0, 6).forEach(draw);
}
async function savePainting(){
  try { await document.fonts.load('italic 40px "Instrument Serif"'); } catch {}
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
  const ms = S.moments, first = new Date(ms[ms.length - 1].t), last = new Date(ms[0].t);
  const f = d => d.toLocaleDateString([], { month: 'short', day: 'numeric' }).toLowerCase();
  await poster(c, ms, ['liminal', `${ms.length} moment${ms.length === 1 ? '' : 's'} · ${f(first)}${ms.length > 1 ? ' – ' + f(last) : ''}`]);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'liminal-gallery.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'my liminal gallery' }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  download(blob, 'liminal-gallery.png'); toast('saved');
}
function download(blob, name){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }

function renderMoments(){
  const el = $('#v-moments'), ms = S.moments;
  if (!ms.length) { el.innerHTML = EMPTY('nothing kept yet', 'your first moment will land here.'); return; }
  const mk = t => { const d = new Date(t); return d.getFullYear() * 12 + d.getMonth(); };
  const groups = []; ms.forEach(m => { const k = mk(m.t); if (!groups.length || groups[groups.length - 1].k !== k) groups.push({ k, t: m.t, items: [] }); groups[groups.length - 1].items.push(m); });
  const now = new Date();
  const gl = t => { const d = new Date(t); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() ? 'this month' : d.toLocaleDateString([], { month: 'long', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' }).toLowerCase(); };
  const tl = t => dayKey(t) === dayKey(Date.now()) ? fmtTime(t) : new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }).toLowerCase();
  el.innerHTML = groups.map(g => `<h5 class="day-h">${gl(g.t)}</h5><div class="mosaic">${g.items.map((m, i) => {
    const big = i === 0 && g.items.length >= 3;
    if (!isPro()) return `<button class="tile plain${big ? ' big' : ''}" data-id="${m.id}"><span class="tt">${tl(m.t)}</span><span class="tx">${esc(m.text || (m.chips && m.chips.length ? m.chips.join(', ') : 'no words'))}</span>${m.answer ? `<span class="ta">${esc(m.answer)}</span>` : ''}</button>`;
    return `<button class="tile${big ? ' big' : ''}" data-id="${m.id}" style="background:${tileBg(m)}"><span class="tt">${tl(m.t)}</span>${big && m.poem ? `<span class="tl">${esc(m.poem[0])}</span>` : ''}<span class="tw">${esc(m.word)}</span></button>`; }).join('')}</div>`).join('');
  el.querySelectorAll('.tile').forEach(t => t.onclick = () => openDetail(ms, ms.findIndex(m => m.id === t.dataset.id)));
}

function renderMural(){
  const el = $('#v-mural'), ms = S.moments;
  const now = new Date(); if (!S.muralMonth) S.muralMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const M = S.muralMonth, y = M.getFullYear(), mo = M.getMonth(), days = new Date(y, mo + 1, 0).getDate(), lead = new Date(y, mo, 1).getDay();
  const byDay = {}; ms.forEach(m => { const d = new Date(m.t); if (d.getFullYear() === y && d.getMonth() === mo) (byDay[d.getDate()] ||= []).push(m); });
  let cells = ''; for (let i = 0; i < lead; i++) cells += '<div class="cell blank"></div>';
  for (let d = 1; d <= days; d++) {
    const list = (byDay[d] || []).slice().sort((a, b) => a.t - b.t), today = y === now.getFullYear() && mo === now.getMonth() && d === now.getDate();
    let bg = '';
    if (list.length === 1) bg = tileBg(list[0]);
    else if (list.length > 1) bg = `linear-gradient(160deg, ${list.map((m, i) => `${m.colors[0]} ${Math.round(i / (list.length - 1) * 100)}%`).join(', ')})`;
    cells += `<button class="cell${list.length ? ' has' : ''}${today ? ' today' : ''}" data-d="${d}" ${bg ? `style="background:${bg}"` : ''}><span>${d}</span>${list.length > 1 ? `<i class="n">${list.length}</i>` : ''}</button>`;
  }
  const monthMs = Object.values(byDay).flat().sort((a, b) => a.t - b.t);
  el.innerHTML = `<div class="mural-head"><button class="icon-btn" id="mPrev" aria-label="Previous month"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><h4>${M.toLocaleDateString([], { month: 'long', year: 'numeric' }).toLowerCase()}</h4><button class="icon-btn" id="mNext" aria-label="Next month"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button></div>
    <div class="dow">${['s', 'm', 't', 'w', 't', 'f', 's'].map(x => `<span>${x}</span>`).join('')}</div><div class="cal">${cells}</div>
    ${monthMs.length ? `<div class="mural-strip" style="background:linear-gradient(90deg, ${monthMs.length === 1 ? monthMs[0].colors[0] + ',' + monthMs[0].colors[1] : monthMs.map((m, i) => `${m.colors[0]} ${Math.round(i / (monthMs.length - 1) * 100)}%`).join(', ')})"></div><p class="mural-cap">the month, in the order you felt it</p>` : `<p class="mural-cap" style="margin-top:18px">no moments this month yet</p>`}`;
  $('#mPrev').onclick = () => { S.muralMonth = new Date(y, mo - 1, 1); renderMural(); };
  $('#mNext').onclick = () => { S.muralMonth = new Date(y, mo + 1, 1); renderMural(); };
  el.querySelectorAll('.cell.has').forEach(c => c.onclick = () => { const list = (byDay[+c.dataset.d]).slice().sort((a, b) => b.t - a.t); openDetail(list, 0); });
}

function renderDrift(){
  const el = $('#v-drift'), ms = S.moments.slice().sort((a, b) => a.t - b.t);
  if (!ms.length) { el.innerHTML = EMPTY('who you were', 'keep moments over a few weeks and you\'ll see your colors drift here.'); return; }
  const wk = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return +d; };
  const now = wk(Date.now()), start = Math.max(wk(ms[0].t), now - 11 * 7 * 864e5);
  const weeks = []; for (let w = start; w <= now; w += 7 * 864e5) weeks.push({ w, items: [] });
  ms.forEach(m => { const k = wk(m.t); const W2 = weeks.find(x => Math.abs(x.w - k) < 864e5 * 2); if (W2) W2.items.push(m); });
  weeks.forEach(w => { if (w.items.length) { w.col = mixHex(w.items.map(m => m.colors[0])); w.v = avg(w.items.map(m => m.v)); w.e = avg(w.items.map(m => m.e)); } });
  const cut = Date.now() - 14 * 864e5, recent = ms.filter(m => m.t >= cut), before = ms.filter(m => m.t < cut);
  let say, sub;
  if (recent.length >= 2 && before.length >= 2) {
    const dv = avg(recent.map(m => m.v)) - avg(before.map(m => m.v)), de = avg(recent.map(m => m.e)) - avg(before.map(m => m.e));
    const parts = []; if (dv > .07) parts.push('lighter'); if (dv < -.07) parts.push('heavier'); if (de > .07) parts.push('more restless'); if (de < -.07) parts.push('stiller');
    say = parts.length ? `lately you've been drifting ${parts.join(' and ')} than before.` : `lately you've been holding steady, close to where you were.`;
  } else say = ms.length < 3 ? 'this is where your drift begins.' : 'your colors are starting to gather.';
  const words = {}; ms.forEach(m => words[m.word] = (words[m.word] || 0) + 1);
  const top = Object.entries(words).sort((a, b) => b[1] - a[1])[0];
  sub = `${ms.length} moment${ms.length === 1 ? '' : 's'} over ${weeks.length} week${weeks.length === 1 ? '' : 's'} · the feeling you've kept most: <i>${esc(top[0])}</i>`;
  const f = t => new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }).toLowerCase();
  el.innerHTML = `<div class="river"><canvas id="river"></canvas></div><p class="drift-say">${say}</p><p class="drift-sub">${sub}</p>` +
    weeks.slice().reverse().map(w => `<div class="week"><span class="wl">${f(w.w)}</span>${w.items.length ? `<span class="wb" style="background:linear-gradient(90deg, ${w.items.length === 1 ? w.items[0].colors[0] + ',' + w.items[0].colors[1] : w.items.map((m, i) => `${m.colors[0]} ${Math.round(i / (w.items.length - 1) * 100)}%`).join(', ')})"></span>` : '<span class="wb none"></span>'}<span class="wn">${w.items.length || ''}</span></div>`).join('');
  drawRiver($('#river'), weeks);
}
const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
function drawRiver(cv, weeks){
  const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const pts = weeks.filter(x => x.items.length); if (!pts.length) return;
  ctx.fillStyle = '#0b0a12'; ctx.fillRect(0, 0, w, h);
  const n = weeks.length, X = i => n === 1 ? w / 2 : 18 + i / (n - 1) * (w - 36);
  const nodes = weeks.map((wk2, i) => wk2.items.length ? { x: X(i), y: 18 + (1 - wk2.v) * (h - 36), th: 10 + wk2.e * 34, c: wk2.col } : null).filter(Boolean);
  if (nodes.length === 1) nodes.unshift({ ...nodes[0], x: Math.max(18, nodes[0].x - w * .35) }), nodes.push({ ...nodes[1], x: Math.min(w - 18, nodes[1].x + w * .2) });
  const grad = ctx.createLinearGradient(nodes[0].x, 0, nodes[nodes.length - 1].x, 0);
  nodes.forEach((p, i) => grad.addColorStop(nodes.length === 1 ? 0 : i / (nodes.length - 1), p.c));
  const path = side => { const out = nodes.map(p => [p.x, p.y + side * p.th / 2]); return out; };
  const curve = (pp, move) => { pp.forEach((p, i) => { if (i === 0) { move ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); return; } const q = pp[i - 1], mx = (q[0] + p[0]) / 2; ctx.bezierCurveTo(mx, q[1], mx, p[1], p[0], p[1]); }); };
  ctx.save(); ctx.shadowBlur = 28; ctx.shadowColor = nodes[nodes.length - 1].c; ctx.fillStyle = grad; ctx.beginPath(); curve(path(-1), true); curve(path(1).reverse(), false); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.font = '10px -apple-system,sans-serif'; ctx.fillText('lighter', 10, 14); ctx.fillText('heavier', 10, h - 7); ctx.textAlign = 'right'; ctx.fillText('now', w - 10, h - 7);
}

/* ---------- detail ---------- */
function openDetail(list, idx){
  if (idx < 0) return; S.detail = { list, idx }; drawDetail();
  $('#detail').classList.add('open'); document.body.classList.add('detail-open'); $('#detail').setAttribute('aria-hidden', 'false'); syncSound();
}
function poemFor(m){
  if (m.poem) return m.poem; if (!isPro()) return null;
  const a = m.mode === 'words' && m.text ? analyze(m.text) : { v: m.v, e: m.e, anchor: (m.chips || [])[0] || null, theme: null, colorWords: [], crisis: !!m.care, matched: 1 };
  a.v = m.v; a.e = m.e; return compose(a, m.seed >>> 0);
}
function drawDetail(){
  const { list, idx } = S.detail, m = list[idx], d = new Date(m.t), pro = isPro(), poem = poemFor(m);
  if (pro) { aura.set(m.colors, 0.2 + m.v * 0.6, 0.2 + (1 - m.e) * 0.5, m.e); engine.setMood({ v: m.v, e: m.e, chips: m.chips || [] }, m.seed); }
  $('#dIndex').textContent = list.length > 1 ? `${idx + 1} of ${list.length}` : '';
  $('#dBody').innerHTML = `<p class="d-date">${d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }).toLowerCase()} · ${fmtTime(m.t)}</p>
    ${pro ? `<div class="d-scene"><canvas id="dScene" width="680" height="440"></canvas><span>${esc(SCENES[sceneFor(m)])}</span></div><h2 class="d-word">${esc(m.word)}</h2>` : ''}
    ${poem ? `<div class="d-poem">${poem.map(l => `<span>${esc(l)}</span>`).join('')}</div><button class="d-copy" id="dCopy">copy poem</button>` : `<button class="poem-lock d-lock"><span class="pl-lines"><i></i><i></i><i></i></span><span class="pl-k">${LOCK}this moment's poem &amp; painting are waiting</span><span class="pl-cta">${lockCta()}</span></button>`}
    ${m.text ? `<p class="d-said">${esc(m.text)}</p>` : ''}
    ${m.care ? `<div class="care"><p>if it's still heavy, you can call or text <b>988</b> anytime.</p><div class="care-links"><a href="tel:988">call 988</a><a href="sms:988">text 988</a></div></div>` : ''}
    <p class="d-q">the question</p><p class="d-prompt">${esc(m.prompt)}</p>
    ${m.answer ? `<p class="d-answer">${esc(m.answer)}</p>` : '<p class="d-answer" style="color:var(--ink3)">left unanswered</p>'}
    ${m.chips && m.chips.length ? `<div class="d-chips">${m.chips.map(c => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
    ${pro ? `<p class="d-coord">${Math.round(m.v * 100)}% light · ${Math.round(m.e * 100)}% restless</p>` : ''}`;
  if (pro) drawScene($('#dScene'), m); else $('#dBody .d-lock').onclick = () => openPro('this moment\'s poem');
  /* np-r2: copy a poem to send to someone (text only, nothing leaves the phone unless you paste it) */
  const cp = $('#dCopy'); if (cp && poem) cp.onclick = async () => { const t = poem.join('\n');
    try { await navigator.clipboard.writeText(t); toast('poem copied'); }
    catch { if (navigator.share) { try { await navigator.share({ text: t }); } catch {} } else toast('couldn\'t copy here'); } };
  $('#dPrev').style.visibility = idx > 0 ? 'visible' : 'hidden'; $('#dNext').style.visibility = idx < list.length - 1 ? 'visible' : 'hidden';
  $('#dDelete').textContent = 'delete'; $('#dDelete').dataset.armed = '';
  $('#dBody').scrollTop = 0;
}
function closeDetail(){ S.detail = null; $('#detail').classList.remove('open'); document.body.classList.remove('detail-open'); $('#detail').setAttribute('aria-hidden', 'true'); setLive(S.live, S.live.chips); syncSound(); }
$('#dClose').onclick = closeDetail;
$('#dPrev').onclick = () => { S.detail.idx--; drawDetail(); };
$('#dNext').onclick = () => { S.detail.idx++; drawDetail(); };
$('#dDelete').onclick = async e => {
  const b = e.currentTarget; if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'tap again to delete'; return; }
  const m = S.detail.list[S.detail.idx]; await db.remove(m.id); cloud.markGone(m.id); syncSoon();
  S.moments = S.moments.filter(x => x.id !== m.id); S.detail.list = S.detail.list.filter(x => x.id !== m.id);
  toast('deleted'); if (!S.detail.list.length) closeDetail(); else { S.detail.idx = Math.min(S.detail.idx, S.detail.list.length - 1); drawDetail(); }
  renderArchive();
};
let sy = null; $('#detail').addEventListener('touchstart', e => sy = e.touches[0].clientY, { passive: true });
$('#detail').addEventListener('touchend', e => { if (sy != null && e.changedTouches[0].clientY - sy > 110 && $('#dBody').scrollTop <= 0) closeDetail(); sy = null; });

/* ---------- settings ---------- */
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
$('#settingsBtn').onclick = () => { $('#installTip').hidden = !!standalone; renderAccount(); $('#settings').classList.add('open'); $('#settings').setAttribute('aria-hidden', 'false'); cloud.refresh().then(j => j && renderAccount()); };
const closeSettings = () => { $('#settings').classList.remove('open'); $('#settings').setAttribute('aria-hidden', 'true'); $('#sDeleteSub').textContent = 'can\'t be undone'; delete $('#sDelete').dataset.armed; };
$('#sClose').onclick = closeSettings;
$('#settings').addEventListener('click', e => { if (e.target.id === 'settings') closeSettings(); });
$('#sSound').onclick = () => setMuted(!S.muted);
$('#sExport').onclick = async () => {
  const data = { app: 'liminal', version: 1, exported: new Date().toISOString(), moments: S.moments };
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), name = `liminal-archive-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'liminal archive' }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  download(blob, name); toast(`exported ${S.moments.length} moments`);
};
$('#importFile').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text()), list = (Array.isArray(j) ? j : j.moments || []).filter(m => m && m.id && m.t && Array.isArray(m.colors) && typeof m.v === 'number' && typeof m.e === 'number');
    const have = new Set(S.moments.map(m => m.id)), fresh = list.filter(m => !have.has(m.id));
    await db.putMany(fresh); fresh.forEach(m => cloud.markDirty(m.id)); syncSoon(); S.moments = await db.all(); paintKey = ''; renderArchive();
    toast(fresh.length ? `imported ${fresh.length} moment${fresh.length === 1 ? '' : 's'}` : 'nothing new to import');
  } catch { toast('that file isn\'t a liminal archive'); }
  e.target.value = '';
};
$('#sDelete').onclick = async e => {
  const b = e.currentTarget; if (!S.moments.length) return toast('nothing to delete');
  if (!b.dataset.armed) { b.dataset.armed = '1'; $('#sDeleteSub').textContent = `tap again to delete all ${S.moments.length}${cloud.signedIn() ? ' (here + synced)' : ''}`; return; }
  cloud.markGone(S.moments.map(m => m.id)); await db.clear(); S.moments = []; paintKey = ''; renderArchive(); closeSettings(); syncSoon(); toast(cloud.signedIn() ? 'archive deleted here and in your account' : 'archive deleted');
};


/* ---------- account, sync & liminal pro ---------- */
const LOCK = '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const trialUsed = () => cloud.signedIn() && cloud.acct.trialEnd > 0 && cloud.trialLeft() <= 0;
const lockCta = () => !cloud.signedIn() ? 'try liminal pro free for 3 days' : trialUsed() ? 'unlock liminal pro · $35' : 'see liminal pro';
function paintLockCta(){ const c = $('#poemLockCta'); if (c) c.textContent = lockCta(); }
$('#poemLock').onclick = () => openPro('the poem writer');
const daysLeft = () => { const ms = cloud.trialLeft(); const h = Math.ceil(ms / 3600e3); return h > 36 ? Math.ceil(ms / 864e5) + ' days' : h + ' hour' + (h === 1 ? '' : 's'); };
const ago = t => { const s = (Date.now() - t) / 1000; return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : s < 86400 ? Math.floor(s / 3600) + ' h ago' : new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }).toLowerCase(); };

let syncT = null, syncMsg = '';
function syncSoon(ms = 600){ if (!cloud.signedIn()) return; clearTimeout(syncT); syncT = setTimeout(doSync, ms); }
async function doSync(){
  if (!cloud.signedIn()) return;
  try { syncMsg = 'syncing…'; renderAccount(true); const r = await cloud.sync(db); syncMsg = '';
    if (r && r.changed) { S.moments = await db.all(); paintKey = ''; renderArchive(); }
  } catch (e) { syncMsg = e.offline ? 'offline, will sync later' : 'sync paused (' + e.message + ')'; }
  renderAccount(true);
}

function renderAccount(quiet){
  const A = cloud.acct, rows = $('#acctRows'), pr = $('#proRows'); if (!rows) return;
  $('#privTitle').textContent = cloud.signedIn() ? 'encrypted, synced to your account' : 'stays on your phone unless you sign in to sync';
  if (!cloud.signedIn()) rows.innerHTML = `<button class="row" id="sSignIn"><span>sign in to sync</span><small>${A.user ? 'signed out · ' + esc(A.user) : 'email + password'}</small></button>`;
  else rows.innerHTML = `<div class="row static"><span>${esc(A.user)}</span><small>${syncMsg || (A.synced ? 'synced ' + ago(A.synced) : 'not synced yet')}</small></div>
    ${/@/.test(A.user || '') ? '' : '<button class="row" id="sAddEmail"><span>add your email</span><small>sign in with it from now on, here and in synapse + axon</small></button>'}
    <button class="row" id="sSyncNow"><span>sync now</span><small>pulls + saves changes</small></button>
    <button class="row" id="sSignOut"><span>sign out</span><small>moments stay on this phone</small></button>
    <button class="row danger" id="sDelAcct"><span>delete account</span><small id="sDelAcctSub">removes the synced copy</small></button>`;
  const ps = A.pro ? (A.owner ? 'owner 👑' : 'on' + (A.allAccess ? ' · all-access' : '')) : cloud.onTrial() ? 'free trial · ' + daysLeft() + ' left' : trialUsed() ? 'trial ended' : 'free';
  pr.innerHTML = `<button class="row" id="sPro"><span>liminal pro</span><small class="${isPro() ? 'pro-on' : ''}">${ps}</small></button>`;
  if (quiet) return bindAccount(); bindAccount();
}
function bindAccount(){
  const on = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = fn; };
  on('sSignIn', () => openAuth(cloud.acct.user ? 'login' : 'signup'));
  on('sSyncNow', () => doSync());
  on('sAddEmail', () => openAuth('email'));
  on('sSignOut', async () => { await cloud.logout(); toast('signed out · your moments stay here'); renderAccount(); afterAccount(); });
  on('sDelAcct', async e => { const b = e.currentTarget; if (!b.dataset.armed) { b.dataset.armed = 1; $('#sDelAcctSub').textContent = cloud.acct && cloud.acct.pro && !cloud.acct.owner ? 'tap again: deletes the synced copy + account, and liminal pro with it' : 'tap again: deletes the synced copy + account'; return; }
    /* np-r2: the second tap asks for the password again; the server checks it before anything is deleted */
    if (!document.getElementById('sDelForm')) { b.insertAdjacentHTML('afterend', '<form class="row delpw" id="sDelForm" autocomplete="on"><input type="password" id="sDelPw" autocomplete="current-password" maxlength="200" placeholder="your password to confirm" aria-label="your password"><button class="delgo" type="submit">delete</button></form>');
      const f = document.getElementById('sDelForm'), pi = document.getElementById('sDelPw'); setTimeout(() => pi.focus(), 60);
      f.onsubmit = async ev => { ev.preventDefault(); const pw = pi.value; if (!pw) { toast('type your password first'); pi.focus(); return; }
        const go = f.querySelector('.delgo'); go.disabled = true; go.textContent = 'checking…';
        try { await cloud.deleteAccount(pw); toast('account deleted · this phone keeps its moments'); renderAccount(); afterAccount(); }
        catch (err) { go.disabled = false; go.textContent = 'delete'; pi.value = '';
          if (err.message === 'wrong') { toast('that password is wrong'); pi.focus(); }
          else if (err.message === 'locked') toast('too many tries · wait ' + Math.max(1, Math.ceil(((err.body && err.body.wait) || 60) / 60)) + ' min');
          else toast(err.offline ? 'you\'re offline' : 'couldn\'t delete (' + err.message + ')'); } }; }
    else document.getElementById('sDelPw').focus(); });
  on('sPro', () => openPro());
}

/* the upgrade sheet: same deal as Synapse and Axon. 3-day free trial with an account, then $35 once (or the $100 Northpeak All-Access), Apple Cash, no subscription */
const PRO_LIST = [['the poem writer', 'every feeling, written back to you as a little poem'], ['your colors', 'a palette for each moment, and the sky that follows your mood'], ['the soundscape', 'a soft ambient sound that matches how it feels'],
  ['the painted gallery', 'each moment as a scene, organized week by week'], ['mural & drift', 'your month as a calendar of color, and how you\'re drifting'], ['every pro feature added later', '']];
let proWhat = '', proPlan = 'liminal_pro', proMsg = '', proMode = '';
function openPro(what){ proWhat = what || ''; proMsg = ''; proMode = ''; renderPro(); $('#pro').classList.add('open'); $('#pro').setAttribute('aria-hidden', 'false'); cloud.refresh(true).then(j => { if (j && $('#pro').classList.contains('open')) renderPro(); }); }
function closePro(){ $('#pro').classList.remove('open'); $('#pro').setAttribute('aria-hidden', 'true'); }
$('#pro').addEventListener('click', e => { if (e.target.id === 'pro') closePro(); });
function renderPro(){
  const A = cloud.acct, R = A.request, el = $('#proCard'), waiting = R && R.status === 'new' && proMode !== 'edit';
  let h = `<div class="grabber"></div><div class="sheet-head"><h3>liminal <em>pro</em></h3><button class="icon-btn" data-p="close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="phero"><div class="pprice">$35</div><div class="pone">one time · yours for good · no subscription</div>${proWhat && !isPro() ? `<p class="pwhy"><b>${esc(proWhat)}</b> is part of liminal pro.</p>` : ''}</div>`;
  if (A.pro) h += `<div class="pbox pon"><b>${CHECK}${A.owner ? 'owner 👑' : 'liminal pro is on'}</b><p>it's on your account <b>${esc(A.user)}</b>${A.allAccess ? ' through northpeak all-access' : ''}, on every phone you sign in on. thank you.</p></div>`;
  else {
    if (cloud.onTrial()) h += `<div class="pbox ptrial"><b>free trial · ${daysLeft()} left</b><p>everything in pro is on. keep it after the trial with a one-time $35.</p></div>`;
    else if (!cloud.signedIn()) h += `<div class="pbox ptrial"><b>try it free for 3 days</b><p>make an account (just an email and a password) and every pro feature turns on for 3 days. no card, nothing to cancel.</p><button class="primary" data-p="trial">start my free trial</button></div>`;
    if (waiting) h += `<div class="pbox psent"><b>${CHECK}request sent</b><p>watch Messages for an <b>Apple Cash request for ${R.plan === 'all_access' ? '$100' : '$35'}</b> from Northpeak Studios${R.phone ? ' at <b>' + esc(R.phone) + '</b>' : ''}. once it's paid, pro turns on by itself for <b>${esc(A.user)}</b>.</p><div class="pbtns"><button class="pmain" data-p="check">check now</button><button data-p="edit">change details</button></div>${proMsg ? `<p class="perr">${esc(proMsg)}</p>` : ''}</div>`;
    else h += `<div class="pbox"><b>get pro</b><p>no card needed. pick a plan, send your name and phone number, and Northpeak Studios sends you an <b>Apple Cash request</b> in Messages. once it's paid, pro turns on by itself.</p>
      <div class="plans"><label class="plan${proPlan === 'liminal_pro' ? ' on' : ''}"><input type="radio" name="plan" value="liminal_pro"${proPlan === 'liminal_pro' ? ' checked' : ''}><span><b>liminal pro</b><small>this app, for good</small></span><em>$35</em></label>
      <label class="plan${proPlan === 'all_access' ? ' on' : ''}"><input type="radio" name="plan" value="all_access"${proPlan === 'all_access' ? ' checked' : ''}><span><b>northpeak all-access</b><small>every northpeak app: synapse, axon, liminal + future ones</small></span><em>$100</em></label></div>
      <input name="pname" placeholder="your name" autocomplete="name" enterkeyhint="next" maxlength="80" value="${esc((R && R.name) || '')}">
      <input name="pphone" type="tel" placeholder="phone number for Apple Cash" autocomplete="tel" inputmode="tel" enterkeyhint="go" maxlength="40" value="${esc((R && R.phone) || '')}">
      <p class="pnote">${cloud.signedIn() ? `pro goes on your account <b>${esc(A.user)}</b>.` : 'next you\'ll sign in with your email. pro goes on that account so it follows you to a new phone.'} $35 per app, or $100 for all of them. Apple Cash only.</p>
      ${proMsg ? `<p class="perr">${esc(proMsg)}</p>` : ''}<div class="pbtns"><button class="pmain" data-p="send">${cloud.signedIn() ? 'send request' : 'continue'}</button></div></div>`;
  }
  /* redeem always reachable (Oct 21): a pro account can still enter an owner / all-access / BOT code */
  h += `<details class="pcode"${proMode === 'code' ? ' open' : ''}><summary>have a code?</summary><p>a liminal code (LIM-…) or a northpeak all-access code (SYN-…).</p><div class="pcrow"><input name="pcode" placeholder="LIM-XXXX-XXXX" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="20"><button data-p="redeem">unlock</button></div></details>`;
  h += `<ul class="plist">${PRO_LIST.map(x => `<li>${CHECK}<span><b>${esc(x[0])}</b>${x[1] ? esc(x[1]) : ''}</span></li>`).join('')}</ul>
    <div class="care pcare"><p>always free, for everyone: the journal (typing a feeling, keeping a moment, your list of moments, export and delete), sync, and the <b>988</b> card if things feel heavy.</p></div>`;
  el.innerHTML = h;
  el.querySelectorAll('input[name=plan]').forEach(r => r.onchange = () => { proPlan = r.value; el.querySelectorAll('.plan').forEach(p => p.classList.toggle('on', p.contains(r))); });
}
$('#proCard').addEventListener('click', async e => {
  const b = e.target.closest('[data-p]'); if (!b) return; const p = b.dataset.p, el = $('#proCard');
  if (p === 'close') return closePro();
  if (p === 'trial') return openAuth('signup', true);
  if (p === 'edit') { proMode = 'edit'; proMsg = ''; return renderPro(); }
  if (p === 'check') { b.disabled = true; b.textContent = 'checking…'; await cloud.refresh(true); proMsg = isPro() ? '' : 'not paid yet. it turns on by itself once it is.'; return renderPro(); }
  if (p === 'send') {
    const name = (el.querySelector('[name=pname]').value || '').trim().replace(/\s+/g, ' '), phone = (el.querySelector('[name=pphone]').value || '').trim();
    cloud.acct.request = Object.assign({}, cloud.acct.request || {}, { name, phone });
    if (name.length < 2) { proMsg = 'type your name.'; return renderPro(); }
    if (phone.replace(/\D/g, '').length < 7 || !/^[+\d\s().-]+$/.test(phone)) { proMsg = 'type a phone number that can get Apple Cash.'; return renderPro(); }
    if (!cloud.signedIn()) { pendingRequest = { plan: proPlan, name, phone }; return openAuth('signup', true); }
    b.disabled = true; b.textContent = 'sending…';
    try { await cloud.requestPro(proPlan, name, phone); proMode = ''; proMsg = ''; }
    catch (err) { proMsg = err.offline ? 'you\'re offline. connect and try again.' : err.message === 'slow_down' ? 'too many requests from here. try again later.' : err.message === 'bad_phone' ? 'that phone number doesn\'t look right.' : 'that didn\'t go through (' + err.message + ').'; }
    return renderPro();
  }
  if (p === 'redeem') {
    const code = (el.querySelector('[name=pcode]').value || '').trim(); proMode = 'code';
    if (!code) return;
    if (!cloud.signedIn()) { pendingCode = code; return openAuth('signup', true); }
    b.disabled = true; b.textContent = '…';
    try { const j = await cloud.redeem(code); proMsg = ''; toast(j.owner ? 'owner unlocked 👑' : j.product === 'all_access' ? 'all-access unlocked ✓' : 'liminal pro unlocked ✓'); afterAccount(); }
    catch (err) { proMsg = ''; toast(err.message === 'wrong_email' ? 'this owner code is already linked to another account' : err.message === 'used' ? 'that code is already on another account' : err.message === 'slow_down' ? 'too many tries, wait a bit' : err.offline ? 'you\'re offline' : 'that code didn\'t work'); }
    return renderPro();
  }
});
let pendingRequest = null, pendingCode = null;

/* sign in / sign up: a Northpeak account = email + password (Oct 21, 2026). Old username accounts sign in through the
   small "signed up with a username?" link and then add their email once (kind 'email'). */
let authKind = 'signup', authForPro = false, authLegacy = false, heldPw = '';
function openAuth(kind, forPro){
  authKind = kind; authForPro = !!forPro; authLegacy = false; paintAuth(); $('#authErr').hidden = true;
  $('#auth').classList.add('open'); $('#auth').setAttribute('aria-hidden', 'false');
  $('#aUser').value = kind === 'login' && /@/.test(cloud.acct.user || '') ? cloud.acct.user : '';
}
function closeAuth(){ $('#auth').classList.remove('open'); $('#auth').setAttribute('aria-hidden', 'true'); $('#aPass').value = ''; $('#aConf').value = ''; heldPw = ''; }
function paintAuth(){
  const up = authKind === 'signup', em = authKind === 'email', lg = authLegacy && authKind === 'login';
  $('.auth-seg').hidden = em;
  $$('.auth-seg button').forEach(b => b.classList.toggle('on', b.dataset.k === authKind));
  $('#authTitle').textContent = em ? 'add your email' : up ? (authForPro ? 'start your free trial' : 'create an account') : lg ? 'sign in with your username' : 'welcome back';
  $('#authWhy').textContent = em ? 'liminal signs in with an email now. add yours and from then on you sign in with it and this same password, here and in synapse + axon.' : up ? 'sync your journal so it survives a new phone, and get 3 days of liminal pro free.' : lg ? 'for accounts made before liminal used emails. next you\'ll add your email once.' : 'sign in with your northpeak email (the same one as synapse or axon) and your journal comes back, along with pro if you have it.';
  $('#aConfWrap').hidden = !up; $('#aPass').autocomplete = up ? 'new-password' : 'current-password'; $('#aPass').placeholder = up ? '8 or more characters' : 'your password';
  $('#aPassWrap').hidden = em && !!heldPw;
  const u = $('#aUser');
  $('#aUserLbl').textContent = lg ? 'username' : 'email';
  u.type = lg ? 'text' : 'email'; u.inputMode = lg ? 'text' : 'email'; u.name = lg ? 'username' : 'email'; u.maxLength = lg ? 32 : 254;
  u.placeholder = lg ? 'your username' : 'you@example.com';
  const alt = $('#aLegacy'); alt.hidden = authKind !== 'login'; alt.textContent = lg ? 'use your email instead' : 'signed up with a username before?';
  $('#authGo').textContent = em ? 'add email' : up ? (authForPro ? 'create account · start trial' : 'create account') : 'sign in';
}
$$('.auth-seg button').forEach(b => b.onclick = () => { authKind = b.dataset.k; authLegacy = false; paintAuth(); $('#authErr').hidden = true; });
$('#aLegacy').onclick = () => { authLegacy = !authLegacy; $('#aUser').value = ''; paintAuth(); $('#authErr').hidden = true; $('#aUser').focus(); };
$('#aClose').onclick = closeAuth;
$('#auth').addEventListener('click', e => { if (e.target.id === 'auth') closeAuth(); });
$('#authForm').addEventListener('submit', async e => {
  e.preventDefault(); const err = m => { $('#authErr').textContent = m; $('#authErr').hidden = !m; };
  const up = authKind === 'signup', em = authKind === 'email', lg = authLegacy && authKind === 'login';
  const raw = $('#aUser').value, pw = em && heldPw ? heldPw : $('#aPass').value;
  const id = lg ? cloud.normUser(raw) : cloud.normEmail(raw);
  if (lg && !cloud.validUser(id)) return err('usernames are 3–32 letters, numbers, dots, dashes or underscores.');
  if (!lg && !id) return err(raw.trim() ? 'that doesn\'t look like an email. check it, like you@gmail.com.' : 'type your email.');
  if (up ? pw.length < 8 : !pw) return err(up ? 'passwords need 8 or more characters.' : 'type your password.');
  if (up && pw !== $('#aConf').value) return err('the two passwords don\'t match.');
  err(''); const b = $('#authGo'); b.disabled = true; b.textContent = em ? 'adding…' : up ? 'locking your journal…' : 'signing in…';
  try {
    if (em) {
      const j = await cloud.addEmail(id, pw);
      closeAuth(); toast(j.northpeak && j.northpeak.exists ? 'email added · your synapse account for it has another password' : 'email added · sign in with it from now on');
      if (j.northpeak && j.northpeak.ok && await cloud.linkNorthpeak(id, pw, j.northpeak)) toast('all-access from your northpeak account ✓');
      renderAccount(); afterAccount(); b.disabled = false; paintAuth(); return;
    }
    const j = await cloud.auth(authKind, id, pw, { legacy: lg });
    const made = up || j.created;
    closeAuth(); toast(made ? 'account made · pro trial on for 3 days' : 'signed in as ' + cloud.acct.user);
    if (!lg && await cloud.linkNorthpeak(id, pw, j.northpeak)) toast('all-access from your northpeak account ✓');
    await doSync(); afterAccount();
    if (pendingRequest) { const pq = pendingRequest; pendingRequest = null; try { await cloud.requestPro(pq.plan, pq.name, pq.phone); } catch {} }
    if (pendingCode) { const pc = pendingCode; pendingCode = null; try { await cloud.redeem(pc); toast('unlocked ✓'); } catch { toast('that code didn\'t work'); } }
    if ($('#pro').classList.contains('open')) { if (made && authForPro && !cloud.acct.request) closePro(); else renderPro(); }
    if (lg && !/@/.test(cloud.acct.user || '')) { heldPw = pw; authKind = 'email'; authLegacy = false; paintAuth(); $('#aUser').value = ''; $('#auth').classList.add('open'); $('#auth').setAttribute('aria-hidden', 'false'); }
  } catch (x) {
    err(x.offline ? 'you\'re offline. connect and try again.' : x.message === 'np_exists' ? 'this email already has a northpeak account (from synapse or axon) with another password. use that password, or sign in.' : x.message === 'taken' ? (em ? 'another liminal account already uses that email.' : 'there\'s already an account with this email. sign in instead.') : x.message === 'wrong' ? (em ? 'that password is wrong.' : lg ? 'that username and password don\'t match.' : 'that email and password don\'t match.') : x.message === 'bad_email' ? 'that doesn\'t look like an email.' : x.message === 'locked' ? 'too many tries. wait a few minutes.' : x.message === 'slow_down' ? 'too many tries from here. try later.' : 'that didn\'t work (' + x.message + ').');
  }
  b.disabled = false; paintAuth();
});
function afterAccount(){
  paintSoundIcons(); paintLockCta(); renderAccount(true);
  const pro = isPro(); $$('.tl-label').forEach(l => l.textContent = pro ? 'turn it into a poem' : 'write it down');
  $('#privline span').textContent = cloud.signedIn() ? 'encrypted on your phone, synced to ' + cloud.acct.user : 'stays on your phone unless you sign in to sync';
  if (!pro && PRO_VIEWS[S.view] === undefined) {} 
  setLive(S.live, S.live.chips); paintKey = ''; renderArchive(); syncSound();
  if (S.result) { $('#poem').hidden = !pro; $('#poemLock').hidden = pro; $('.result-row').hidden = !pro; if (pro && !S.result.poem) { S.result.poem = compose(S.result.a, S.result.seed); renderPoem(S.result.poem); } }
  if (S.detail) drawDetail();
}
cloud.onAccountChange(kind => { if (kind === 'signed_out') toast('signed out on this phone · sign in again to sync'); afterAccount(); });

/* ---------- misc ---------- */
let toastT; function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2000); }
function tick(){ $('#clock').textContent = fmtTime(Date.now()); } tick(); setInterval(tick, 15000);

async function boot(){
  try { S.moments = await db.all(); } catch { toast('storage is unavailable in this browser mode'); }
  S.view = isPro() ? 'painting' : 'moments'; const si = ['painting', 'moments', 'mural', 'drift'].indexOf(S.view);
  $$('.seg button').forEach((x, i) => x.classList.toggle('on', i === si)); $('.seg-pill').style.transform = `translateX(${si * 100}%)`; $$('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + S.view));
  afterAccount(); setLive({ v: .62, e: .3, colorWords: [] });
  if (cloud.signedIn()) { cloud.refresh(true).then(() => afterAccount()); syncSoon(200); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && cloud.signedIn()) { cloud.refresh().then(() => afterAccount()); syncSoon(300); } });
  setInterval(() => { if (!document.hidden && cloud.signedIn()) syncSoon(0); }, 90000);
  if (!LS.get('seen', false)) { $('#intro').hidden = false; }
  else setTimeout(() => { if (isPro() && !engine.ready && !S.muted) $('#soundPill').classList.add('on'); }, 1400);
  $('#enter').onclick = async () => { LS.set('seen', true); $('#intro').classList.add('out'); setTimeout(() => $('#intro').hidden = true, 900); await unlock(); };
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
window.__liminal = { db, S, renderArchive, engine, cloud, afterAccount };
