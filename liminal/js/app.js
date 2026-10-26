import { PROMPTS } from './prompts.js';
import { moodColors, mixHex, hexRgb, moodWord, quadrant } from './color.js';
import { Engine } from './audio.js?v=2';
import { analyze, compose } from './poet.js';
import { drawScene, sceneFor, SCENES, poster } from './paint.js?v=12';
import * as cloud from './cloud.js?v=16';
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
    phase += dt * (0.00010 + cur.en * 0.00045) * (window.__xcalm ? 0.08 : 1);
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
  const poem = pro ? xCompose(r.a, seed) : null, colors = palette(r.a, r.chips), word = r.a.crisis ? 'heavy' : moodWord(r.a.v, r.a.e);
  S.result = { ...r, seed, poem, colors, word, prompt: xPick(quadrant(r.a.v, r.a.e)) };
  S.seed = seed; setLive(r.a, r.chips, seed);
  $('#said').innerHTML = r.mode === 'words' ? `you said: <b>“${esc(r.text)}”</b>` : (pro ? `no words — <b>${esc(word)}</b>` : 'no words tonight') + (r.chips.length ? ', ' + esc(r.chips.join(', ')) : '');
  if (pro) renderPoem(poem); else $('#poem').innerHTML = '';
  $('#poem').hidden = !pro; $('#poemLock').hidden = pro; $('.result-row').hidden = !pro; paintLockCta();
  $('#resWord').textContent = word; $('#wordDot').style.background = colors[0]; $('#wordDot').style.boxShadow = `0 0 10px ${colors[0]}`;
  $('#swatches').innerHTML = colors.map(c => `<i style="background:${c}"></i>`).join('');
  $('#care').hidden = !r.a.crisis;
  $('#prompt').textContent = S.result.prompt; $('#answer').value = ''; if ($('#xGood')) $('#xGood').value = ''; try { xResetResult(); } catch {}
  showStage('#stResult');
}
$('#translate').onclick = () => { $('#text').blur(); translate(); };
$('#translateField').onclick = translate;
$('#rewrite').onclick = () => { const R = S.result; if (!R || !isPro()) return; R.seed = newSeed(); R.poem = xCompose(R.a, R.seed); S.seed = R.seed; engine.setMood(S.live, R.seed); renderPoem(R.poem); };
$('#another').onclick = () => { if (!S.result) return; S.result.prompt = xPick(quadrant(S.result.a.v, S.result.a.e)); setPrompt(S.result.prompt); };
$('#again').onclick = () => showStage(S.mode === 'words' ? '#stWords' : '#stField');
$('#answer').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

$('#keep').onclick = async () => {
  const R = S.result; if (!R) return;
  const m = { id: uid(), t: Date.now(), tz: -new Date().getTimezoneOffset(), mode: R.mode, text: R.text, poem: R.poem || null, v: +R.a.v.toFixed(3), e: +R.a.e.toFixed(3), chips: R.chips, colors: R.colors, word: R.word, prompt: R.prompt, answer: $('#answer').value.trim(), good: ($('#xGood') ? $('#xGood').value.trim() : '') || undefined, seed: R.seed, ctx: S.xr && S.xr.ctx.length ? S.xr.ctx.slice() : undefined, sleep: S.xr && S.xr.sleep != null ? S.xr.sleep : undefined, energy: S.xr && S.xr.energy ? S.xr.energy : undefined, care: !!R.a.crisis, v1: 1 };
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
  xOnThisDay(); try { xPinned(); } catch {}
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
  const el = xMomentsEl(), ms = xFilter(S.moments);
  if (!S.moments.length) { el.innerHTML = EMPTY('nothing kept yet', 'your first moment will land here.'); return; }
  if (!ms.length) { el.innerHTML = xNoMatch(); return; }
  const mk = t => { const d = new Date(t); return d.getFullYear() * 12 + d.getMonth(); };
  const groups = []; ms.forEach(m => { const k = mk(m.t); if (!groups.length || groups[groups.length - 1].k !== k) groups.push({ k, t: m.t, items: [] }); groups[groups.length - 1].items.push(m); });
  const now = new Date();
  const gl = t => { const d = new Date(t); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() ? 'this month' : d.toLocaleDateString([], { month: 'long', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' }).toLowerCase(); };
  const tl = t => dayKey(t) === dayKey(Date.now()) ? fmtTime(t) : new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }).toLowerCase();
  el.innerHTML = groups.map(g => `<h5 class="day-h">${gl(g.t)}</h5><div class="mosaic">${g.items.map((m, i) => {
    const big = i === 0 && g.items.length >= 3;
    if (!isPro()) return `<button class="tile plain${big ? ' big' : ''}" data-id="${m.id}"><span class="tt">${tl(m.t)}${m.fav ? ' ★' : ''}</span><span class="tx">${esc(m.text || (m.chips && m.chips.length ? m.chips.join(', ') : 'no words'))}</span>${m.answer ? `<span class="ta">${esc(m.answer)}</span>` : ''}</button>`;
    return `<button class="tile${big ? ' big' : ''}" data-id="${m.id}" style="background:${tileBg(m)}"><span class="tt">${tl(m.t)}${m.fav ? ' ★' : ''}</span>${big && m.poem ? `<span class="tl">${esc(m.poem[0])}</span>` : ''}<span class="tw">${esc(m.word)}</span></button>`; }).join('')}</div>`).join('');
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
  if (pro) drawScene($('#dScene'), m); else { const lk = $('#dBody .d-lock'); if (lk) lk.onclick = () => openPro('this moment\'s poem'); }
  /* np-r2: copy a poem to send to someone (text only, nothing leaves the phone unless you paste it) */
  const cp = $('#dCopy'); if (cp && poem) cp.onclick = async () => { const t = poem.join('\n');
    try { await navigator.clipboard.writeText(t); toast('poem copied'); }
    catch { if (navigator.share) { try { await navigator.share({ text: t }); } catch {} } else toast('couldn\'t copy here'); } };
  try { xDetailHook(m); } catch (err) { console.warn(err); }
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
  const m = S.detail.list[S.detail.idx]; await db.remove(m.id); cloud.markGone(m.id); syncSoon(6500);
  S.moments = S.moments.filter(x => x.id !== m.id); S.detail.list = S.detail.list.filter(x => x.id !== m.id);
  xUndoDelete(m); if (!S.detail.list.length) closeDetail(); else { S.detail.idx = Math.min(S.detail.idx, S.detail.list.length - 1); drawDetail(); }
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
    ${/@/.test(A.user || '') ? '<button class="row" id="sChEmail"><span>change email</span><small>your account, pro + moments move to it · synapse + axon follow</small></button>' : '<button class="row" id="sAddEmail"><span>add your email</span><small>sign in with it from now on, here and in synapse + axon</small></button>'}
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
  on('sChEmail', () => openAuth('chemail'));
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
      <label class="plan${proPlan === 'all_access' ? ' on' : ''}"><input type="radio" name="plan" value="all_access"${proPlan === 'all_access' ? ' checked' : ''}><span><b>northpeak all-access</b><small>all 6 northpeak apps (synapse, axon, liminal, cadence, mindprint, trace) + future ones</small></span><em>$100</em></label></div>
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
  const up = authKind === 'signup', ch = authKind === 'chemail', em = authKind === 'email' || ch, lg = authLegacy && authKind === 'login';
  $('.auth-seg').hidden = em;
  $$('.auth-seg button').forEach(b => b.classList.toggle('on', b.dataset.k === authKind));
  $('#authTitle').textContent = ch ? 'change email' : em ? 'add your email' : up ? (authForPro ? 'start your free trial' : 'create an account') : lg ? 'sign in with your username' : 'welcome back';
  $('#authWhy').textContent = ch ? 'your account, pro + moments move to the new email. sign in with it and this same password from now on; the old email stops working. synapse + axon follow it.' : em ? 'liminal signs in with an email now. add yours and from then on you sign in with it and this same password, here and in synapse + axon.' : up ? 'sync your journal so it survives a new phone, and get 3 days of liminal pro free.' : lg ? 'for accounts made before liminal used emails. next you\'ll add your email once.' : 'sign in with your northpeak email (the same one as synapse or axon) and your journal comes back, along with pro if you have it.';
  $('#aConfWrap').hidden = !up; $('#aPass').autocomplete = up ? 'new-password' : 'current-password'; $('#aPass').placeholder = up ? '8 or more characters' : 'your password';
  $('#aPassWrap').hidden = em && !ch && !!heldPw;
  const u = $('#aUser');
  $('#aUserLbl').textContent = lg ? 'username' : 'email';
  u.type = lg ? 'text' : 'email'; u.inputMode = lg ? 'text' : 'email'; u.name = lg ? 'username' : 'email'; u.maxLength = lg ? 32 : 254;
  u.placeholder = lg ? 'your username' : ch ? 'new email' : 'you@example.com';
  const alt = $('#aLegacy'); alt.hidden = authKind !== 'login'; alt.textContent = lg ? 'use your email instead' : 'signed up with a username before?';
  $('#authGo').textContent = ch ? 'change email' : em ? 'add email' : up ? (authForPro ? 'create account · start trial' : 'create account') : 'sign in';
}
$$('.auth-seg button').forEach(b => b.onclick = () => { authKind = b.dataset.k; authLegacy = false; paintAuth(); $('#authErr').hidden = true; });
$('#aLegacy').onclick = () => { authLegacy = !authLegacy; $('#aUser').value = ''; paintAuth(); $('#authErr').hidden = true; $('#aUser').focus(); };
$('#aClose').onclick = closeAuth;
$('#auth').addEventListener('click', e => { if (e.target.id === 'auth') closeAuth(); });
$('#authForm').addEventListener('submit', async e => {
  e.preventDefault(); const err = m => { $('#authErr').textContent = m; $('#authErr').hidden = !m; };
  const up = authKind === 'signup', ch = authKind === 'chemail', em = authKind === 'email', lg = authLegacy && authKind === 'login';
  const raw = $('#aUser').value, pw = em && heldPw ? heldPw : $('#aPass').value;
  const id = lg ? cloud.normUser(raw) : cloud.normEmail(raw);
  if (lg && !cloud.validUser(id)) return err('usernames are 3–32 letters, numbers, dots, dashes or underscores.');
  if (!lg && !id) return err(raw.trim() ? 'that doesn\'t look like an email. check it, like you@gmail.com.' : 'type your email.');
  if (up ? pw.length < 8 : !pw) return err(up ? 'passwords need 8 or more characters.' : 'type your password.');
  if (up && pw !== $('#aConf').value) return err('the two passwords don\'t match.');
  err(''); const b = $('#authGo'); b.disabled = true; b.textContent = ch ? 'changing…' : em ? 'adding…' : up ? 'locking your journal…' : 'signing in…';
  try {
    if (ch) { // np-email-change v1
      if (id === cloud.acct.user) { b.disabled = false; paintAuth(); return err('that\'s already your email.'); }
      const r = await cloud.changeEmail(id, pw);
      closeAuth(); toast('email changed to ' + r.email + (r.also === 'synapse+axon' ? ' · synapse + axon too' : r.also === 'synapse' ? ' · synapse too' : r.also === 'np_other_pw' ? ' · your synapse account has another password' : r.also ? ' · change it in synapse too' : ''));
      renderAccount(); afterAccount(); b.disabled = false; paintAuth(); return;
    }
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
    err(x.offline ? 'you\'re offline. connect and try again.' : x.message === 'np_taken' ? 'that email already has a northpeak account (from synapse or axon). use a different one.' : x.message === 'email_locked' ? 'this account\'s email is locked (owner accounts keep theirs).' : x.message === 'np_exists' ? 'this email already has a northpeak account (from synapse or axon) with another password. use that password, or sign in.' : x.message === 'taken' ? (em || ch ? 'another liminal account already uses that email.' : 'there\'s already an account with this email. sign in instead.') : x.message === 'wrong' ? (em || ch ? 'that password is wrong.' : lg ? 'that username and password don\'t match.' : 'that email and password don\'t match.') : x.message === 'bad_email' ? 'that doesn\'t look like an email.' : x.message === 'locked' ? 'too many tries. wait a few minutes.' : x.message === 'slow_down' ? 'too many tries from here. try later.' : 'that didn\'t work (' + x.message + ').');
  }
  b.disabled = false; paintAuth();
});
function afterAccount(){
  paintSoundIcons(); paintLockCta(); renderAccount(true);
  const pro = isPro(); $$('.tl-label').forEach(l => l.textContent = pro ? 'turn it into a poem' : 'write it down');
  $('#privline span').textContent = cloud.signedIn() ? 'encrypted on your phone, synced to ' + cloud.acct.user : 'stays on your phone unless you sign in to sync';
  if (!pro && PRO_VIEWS[S.view] === undefined) {} 
  setLive(S.live, S.live.chips); paintKey = ''; renderArchive(); syncSound();
  if (S.result) { $('#poem').hidden = !pro; $('#poemLock').hidden = pro; $('.result-row').hidden = !pro; if (pro && !S.result.poem) { S.result.poem = xCompose(S.result.a, S.result.seed); renderPoem(S.result.poem); } }
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

/* ================= Oct 21 features (batch 1) ================= */
const XSTOP = new Set('i me my myself we our you your he she it its they them their what which who this that these those am is are was were be been being have has had do does did a an the and but if or because as until while of at by for with about against between into through during before after above below to from up down in out on off over under again then once here there when where why how all any both each few more most other some such no nor not only own same so than too very can will just don dont should now im ive its it\'s i\'m feel feeling like really kind just get got so much bit lot also still even'.split(' '));
S.xf = { q: '', fav: false, mood: '', tag: '' };
const xSave = async m => { try { await db.put(m); } catch { toast('couldn\'t save'); return; } cloud.markDirty(m.id); syncSoon(); };
const xDay = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
/* 1 · streak: days in a row with at least one kept moment, ending today (or yesterday, still alive) */
function xStreak(){
  const days = new Set(S.moments.map(m => xDay(m.t))); let d = xDay(Date.now()), n = 0;
  if (!days.has(d)) d -= 864e5;
  while (days.has(d)) { n++; d = xDay(d - 864e5 + 3 * 36e5); }
  return { n, today: days.has(xDay(Date.now())) };
}
/* 6 · tags */
const xTagsOf = m => Array.isArray(m.tags) ? m.tags : [];
const xAllTags = () => { const c = {}; S.moments.forEach(m => xTagsOf(m).forEach(t => c[t] = (c[t] || 0) + 1)); return Object.keys(c).sort((a, b) => c[b] - c[a]); };
const xCleanTag = t => String(t || '').toLowerCase().replace(/^#+/, '').replace(/[^a-z0-9\u00c0-\u024f_-]+/g, '').slice(0, 24);
/* 3 · 4 · search + filters */
function xFilter(list){
  const f = S.xf, q = f.q.trim().toLowerCase();
  return list.filter(m => {
    if (f.fav && !m.fav) return false;
    if (f.mood === 'light' && !(m.v >= .5)) return false; if (f.mood === 'heavy' && !(m.v < .5)) return false;
    if (f.mood === 'restless' && !(m.e >= .5)) return false; if (f.mood === 'still' && !(m.e < .5)) return false;
    if (f.tag && !xTagsOf(m).includes(f.tag)) return false;
    if (f.ctx && !(m.ctx || []).includes(f.ctx)) return false;
    if (q) { const hay = [m.text, m.answer, m.word, m.prompt, m.good, (m.chips || []).join(' '), (m.ctx || []).join(' '), xTagsOf(m).join(' '), (m.poem || []).join(' ')].join(' ').toLowerCase(); if (!q.split(/\s+/).every(w => hay.includes(w.replace(/^#/, '')))) return false; }
    return true;
  });
}
function xBarHTML(){
  const f = S.xf, st = xStreak(), tags = xAllTags();
  const chip = (k, v, label) => `<button class="xchip${(k === 'fav' ? f.fav : f[k] === v) ? ' on' : ''}" data-k="${k}" data-v="${esc(v)}">${label}</button>`;
  return `<div class="xbar"><div class="xtop"><label class="xsearch"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input id="xq" type="search" placeholder="search your moments" value="${esc(f.q)}" autocomplete="off" autocapitalize="off" enterkeyhint="search"></label>
    <button class="xins" id="xRand" aria-label="random moment">⟲</button><button class="xins" id="xInsights">${isPro() ? '' : LOCK}insights</button></div>
    ${st.n ? `<p class="xstreak">${st.n} day${st.n === 1 ? '' : 's'} in a row${st.today ? '' : ' · keep one today to keep it going'}</p>` : ''}
    <div class="xchips">${chip('fav', '1', '★ favorites')}${chip('mood', 'light', 'light')}${chip('mood', 'heavy', 'heavy')}${chip('mood', 'restless', 'restless')}${chip('mood', 'still', 'still')}${tags.map(t => chip('tag', t, '#' + esc(t))).join('')}${XCHIPS.map(fn => fn(chip)).join('')}</div></div>`;
}
const XCHIPS = [];
function xMomentsEl(){
  const host = $('#v-moments');
  if (!S.moments.length) { host.innerHTML = '<div id="xlist"></div>'; return $('#xlist'); }
  if (!$('#xbarWrap', host) || !$('#xlist')) { host.innerHTML = '<div id="xbarWrap"></div><div id="xlist"></div>'; }
  if (document.activeElement !== $('#xq')) { $('#xbarWrap').innerHTML = xBarHTML(); xBindBar(); }
  return $('#xlist');
}
function xBindBar(){
  const q = $('#xq'); if (q) q.oninput = () => { S.xf.q = q.value; renderMoments(); };
  $$('#xbarWrap .xchip').forEach(b => b.onclick = () => { const k = b.dataset.k, v = b.dataset.v; if (k === 'fav') S.xf.fav = !S.xf.fav; else S.xf[k] = S.xf[k] === v ? '' : v; $('#xbarWrap').innerHTML = xBarHTML(); xBindBar(); renderMoments(); });
  const rb = $('#xRand'); if (rb) rb.onclick = () => xRandom();
  const ib = $('#xInsights'); if (ib) ib.onclick = () => isPro() ? xInsights() : openPro('insights');
}
const xNoMatch = () => `<div class="empty xnone"><h4>nothing matches</h4><p>try another word or clear the filters.</p><button class="ghost" id="xClear">clear filters</button></div>`;
document.addEventListener('click', e => { if (e.target.id === 'xClear') { S.xf = { q: '', fav: false, mood: '', tag: '' }; $('#xbarWrap').innerHTML = xBarHTML(); xBindBar(); renderMoments(); } });
/* 2 · 5 · 6 · detail extras: favorite, tags, edit the answer */
function xDetailHook(m){
  const box = document.createElement('div'); box.className = 'xd';
  box.innerHTML = `<div class="xdrow"><button class="xdb${m.fav ? ' on' : ''}" id="xFav">${m.fav ? '★ favorite' : '☆ favorite'}</button><button class="xdb" id="xTagB"># tags</button><button class="xdb" id="xAns">${m.answer ? 'edit answer' : 'answer it'}</button>${XDBTN.map(f => f(m)).join('')}</div>
    ${xTagsOf(m).length ? `<div class="xdtags">${xTagsOf(m).map(t => `<span>#${esc(t)}</span>`).join('')}</div>` : ''}${XDEXTRA.map(f => f(m)).join('')}`;
  const date = $('#dBody .d-date'); date ? date.after(box) : $('#dBody').prepend(box);
  $('#xFav').onclick = async () => { m.fav = !m.fav; await xSave(m); drawDetail(); renderArchive(); toast(m.fav ? 'added to favorites' : 'removed from favorites'); };
  $('#xTagB').onclick = () => xEdit('tags', m.id && m, 'tags, separated by spaces', xTagsOf(m).map(t => '#' + t).join(' '), async v => { m.tags = [...new Set(v.split(/[\s,]+/).map(xCleanTag).filter(Boolean))].slice(0, 8); await xSave(m); drawDetail(); renderArchive(); });
  $('#xAns').onclick = () => xEdit('your answer', m, m.prompt, m.answer || '', async v => { m.answer = v.slice(0, 140); await xSave(m); drawDetail(); renderArchive(); toast('answer saved'); }, 140);
  XDBIND.forEach(f => f(m));
}
const XDBTN = [], XDEXTRA = [], XDBIND = [];
function xEdit(title, m, sub, val, onSave, max){
  let el = $('#xEdit'); if (!el) { el = document.createElement('div'); el.id = 'xEdit'; el.className = 'xedit'; document.body.appendChild(el); }
  el.innerHTML = `<div class="xe-card"><h4>${esc(title)}</h4>${sub ? `<p>${esc(sub)}</p>` : ''}<input id="xeIn" maxlength="${max || 200}" autocomplete="off" autocapitalize="off" enterkeyhint="done"><div class="xe-b"><button class="ghost" id="xeNo">cancel</button><button class="primary" id="xeOk">save</button></div></div>`;
  el.classList.add('open'); const inp = $('#xeIn'); inp.value = val; setTimeout(() => inp.focus(), 50);
  const close = () => el.classList.remove('open');
  $('#xeNo').onclick = close; el.onclick = e => { if (e.target === el) close(); };
  const ok = async () => { await onSave(inp.value.trim()); close(); };
  $('#xeOk').onclick = ok; inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); ok(); } };
}
/* 7 · on this day: a week, a month or a year ago */
function xOnThisDay(){
  const el = $('#xOtd'); if (!el) return;
  const now = new Date(), ago = [['a year ago', new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())], ['a month ago', new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())], ['a week ago', new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)]];
  for (const [label, d] of ago) {
    const k = xDay(d), hits = S.moments.filter(m => xDay(m.t) === k);
    if (hits.length) { const m = hits[0]; el.hidden = false; el.innerHTML = `<span class="xo-dot" style="background:${m.colors[0]}"></span><span><b>${label}</b> you felt <em>${esc(m.word)}</em>${m.text ? ` — “${esc(m.text.slice(0, 50))}${m.text.length > 50 ? '…' : ''}”` : ''}</span>`; el.onclick = () => openDetail(hits, 0); return; }
  }
  el.hidden = true;
}
/* 8 · 9 · 10 · insights (pro): weekly recap, time of day, weekday, word cloud */
function xInsights(){
  let el = $('#xInsSheet');
  if (!el) { el = document.createElement('div'); el.id = 'xInsSheet'; el.className = 'sheet settings xins-sheet'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<div class="sheet-card"><div class="grabber"></div><div class="sheet-head"><h3>insights</h3><button class="icon-btn" id="xInsClose" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div id="xInsBody"></div></div>'; document.body.appendChild(el);
    const close = () => { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); }; $('#xInsClose').onclick = close; el.addEventListener('click', e => { if (e.target === el) close(); }); }
  const ms = S.moments, wk = ms.filter(m => m.t > Date.now() - 7 * 864e5), pct = x => Math.round(x * 100);
  const common = list => { const c = {}; list.forEach(m => c[m.word] = (c[m.word] || 0) + 1); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]; };
  const dayAvg = {}; wk.forEach(m => { const k = xDay(m.t); (dayAvg[k] ||= []).push(m.v); });
  const dl = Object.entries(dayAvg).map(([k, a]) => [+k, a.reduce((s, x) => s + x, 0) / a.length]).sort((a, b) => b[1] - a[1]);
  const dname = t => new Date(t).toLocaleDateString([], { weekday: 'long' }).toLowerCase();
  let h = '<div class="xi-sec"><h5>this week</h5>';
  if (!wk.length) h += '<p class="xi-p">no moments in the last 7 days yet.</p>';
  else { const c = common(wk); h += `<div class="xi-stats"><div><b>${wk.length}</b><span>moment${wk.length === 1 ? '' : 's'}</span></div><div><b>${Object.keys(dayAvg).length}</b><span>day${Object.keys(dayAvg).length === 1 ? '' : 's'}</span></div><div><b>${pct(wk.reduce((s, m) => s + m.v, 0) / wk.length)}%</b><span>light, on average</span></div></div>
    <p class="xi-p">you felt <em>${esc(c[0])}</em> most${c[1] > 1 ? ` (${c[1]} times)` : ''}.${dl.length > 1 ? ` lightest day: <b>${dname(dl[0][0])}</b>. heaviest: <b>${dname(dl[dl.length - 1][0])}</b>.` : ''}</p>`; }
  h += '</div>';
  const slots = [['morning', 5, 12], ['afternoon', 12, 17], ['evening', 17, 22], ['night', 22, 29]];
  const bars = (rows) => rows.map(([l, list]) => { const v = list.length ? list.reduce((s, m) => s + m.v, 0) / list.length : 0; return `<div class="xi-bar"><span>${l}</span><i><b style="width:${list.length ? Math.max(4, pct(v)) : 0}%;background:${list.length ? moodColors(v, list.reduce((s, m) => s + m.e, 0) / list.length)[0] : 'transparent'}"></b></i><small>${list.length ? pct(v) + '% light · ' + list.length : '—'}</small></div>`; }).join('');
  h += `<div class="xi-sec"><h5>time of day</h5>${bars(slots.map(([l, a, b]) => [l, ms.filter(m => { const hr = new Date(m.t).getHours(), x = hr < 5 ? hr + 24 : hr; return x >= a && x < b; })]))}</div>`;
  const wd = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  h += `<div class="xi-sec"><h5>by weekday</h5>${bars(wd.map((l, i) => [l, ms.filter(m => new Date(m.t).getDay() === i)]))}</div>`;
  const wc = {}; ms.forEach(m => [m.text, m.answer, m.good].join(' ').toLowerCase().replace(/[^a-z\u00c0-\u024f'\s]/g, ' ').split(/\s+/).forEach(w => { w = w.replace(/^'+|'+$/g, ''); if (w.length > 2 && !XSTOP.has(w)) wc[w] = (wc[w] || 0) + 1; }));
  const top = Object.entries(wc).sort((a, b) => b[1] - a[1]).slice(0, 36), mx = top.length ? top[0][1] : 1;
  h += `<div class="xi-sec"><h5>your words</h5>${top.length ? `<div class="xi-cloud">${top.sort(() => Math.random() - .5).map(([w, c]) => `<span style="font-size:${14 + Math.round(c / mx * 20)}px;opacity:${.45 + c / mx * .55}">${esc(w)}</span>`).join(' ')}</div>` : '<p class="xi-p">write a few moments in words and they\'ll gather here.</p>'}</div>`;
  h += XINS.map(f => f()).join('');
  $('#xInsBody').innerHTML = h; el.classList.add('open'); el.setAttribute('aria-hidden', 'false');
}
const XINS = [];
setTimeout(xOnThisDay, 300);


/* ================= Oct 21 features (batch 2) ================= */
const XHELP = `<div class="xhelp">if it's too much right now, you can call or text <b>988</b> anytime. <a href="tel:988">call</a> · <a href="sms:988">text</a></div>`;
function xOverlay(id, html){
  let el = $('#' + id); if (!el) { el = document.createElement('div'); el.id = id; el.className = 'xov'; document.body.appendChild(el); }
  el.innerHTML = `<button class="icon-btn xov-x" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>${html}`;
  requestAnimationFrame(() => el.classList.add('open'));
  el.querySelector('.xov-x').onclick = () => { el.classList.remove('open'); el.dispatchEvent(new Event('xclose')); };
  return el;
}
/* 12 · box breathing, the aura breathes along */
let xBreathT = 0;
function xBreathe(){
  const el = xOverlay('xBreath', `<div class="xb-wrap"><div class="xb-ring"><div class="xb-dot" id="xbDot"></div></div><p class="xb-say" id="xbSay">get comfortable</p><p class="xb-n" id="xbN">box breathing · 4 in, 4 hold, 4 out, 4 hold</p></div>${XHELP}`);
  const steps = [['breathe in', 1.0], ['hold', 1.0], ['breathe out', 0.45], ['hold', 0.45]]; let i = -1, rounds = 0;
  const dot = $('#xbDot'), say = $('#xbSay'), n = $('#xbN');
  const step = () => { i = (i + 1) % 4; if (i === 0 && rounds++ >= 0) n.textContent = `round ${rounds}`; say.textContent = steps[i][0]; dot.style.transform = `scale(${steps[i][1]})`; try { navigator.vibrate && i % 2 === 0 && navigator.vibrate(12); } catch {} };
  clearInterval(xBreathT); dot.style.transform = 'scale(.45)'; setTimeout(() => { step(); xBreathT = setInterval(step, 4000); }, 900);
  el.addEventListener('xclose', () => { clearInterval(xBreathT); if (rounds > 1) toast(`${rounds - 1} round${rounds === 2 ? '' : 's'} of breathing`); }, { once: true });
}
/* 13 · 5-4-3-2-1 grounding */
function xGround(){
  const S5 = [[5, 'things you can see', 'look around. name them, out loud or in your head.'], [4, 'things you can feel', 'your feet on the floor, your sleeve, the air.'], [3, 'things you can hear', 'near and far. even the quiet has sounds.'], [2, 'things you can smell', 'or two smells you like, if nothing\'s there.'], [1, 'thing you can taste', 'or one thing you\'re glad about right now.']];
  let k = 0; const el = xOverlay('xGroundOv', '<div class="xg-wrap" id="xgWrap"></div>' + XHELP);
  const paint = () => {
    if (k >= S5.length) { $('#xgWrap').innerHTML = `<p class="xg-big">you're here.</p><p class="xg-sub">that's grounding. it works better every time you do it.</p><button class="primary" id="xgDone">done</button>`; $('#xgDone').onclick = () => el.querySelector('.xov-x').click(); return; }
    const [n, what, sub] = S5[k];
    $('#xgWrap').innerHTML = `<p class="xg-num">${n}</p><p class="xg-big">${what}</p><p class="xg-sub">${sub}</p><div class="xg-dots">${Array.from({ length: n }, (_, i) => `<button class="xg-d" data-i="${i}"></button>`).join('')}</div><button class="ghost" id="xgNext">next</button>`;
    $$('#xgWrap .xg-d').forEach(d => d.onclick = () => { d.classList.add('on'); if ($$('#xgWrap .xg-d.on').length === n) setTimeout(() => { k++; paint(); }, 450); });
    $('#xgNext').onclick = () => { k++; paint(); };
  };
  paint();
}
/* 15 · your own texture chips */
const xMyChips = () => LS.get('myChips', []);
function xPaintChips(){
  const box = $('#chips'); if (!box) return;
  box.querySelectorAll('.chip.mine, .xaddc').forEach(b => b.remove());
  xMyChips().forEach(c => box.insertAdjacentHTML('beforeend', `<button class="chip mine${S.chips.includes(c) ? ' on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`));
  box.insertAdjacentHTML('beforeend', '<button class="xaddc">+ your own</button>');
  box.querySelector('.xaddc').onclick = () => xEdit('your own word', null, 'a texture word that fits you (one word)', '', v => { const w = v.toLowerCase().replace(/[^a-z\u00c0-\u024f-]/g, '').slice(0, 16); if (!w) return; const list = [...new Set([...xMyChips(), w])].slice(-12); LS.set('myChips', list); xPaintChips(); toast('added “' + w + '”'); }, 16);
  box.querySelectorAll('.chip.mine').forEach(b => { let t; b.addEventListener('pointerdown', () => { t = setTimeout(() => { if (confirm('remove “' + b.dataset.c + '”?')) { LS.set('myChips', xMyChips().filter(x => x !== b.dataset.c)); S.chips = S.chips.filter(x => x !== b.dataset.c); xPaintChips(); } }, 650); }); ['pointerup', 'pointerleave'].forEach(ev => b.addEventListener(ev, () => clearTimeout(t))); });
}
xPaintChips();
/* 16 · question styles (pro) + 17 · your own question */
const XQ = {
  deep: ['what belief about yourself got louder today?', 'what are you pretending not to know?', 'who would you be if nobody was watching this week?', 'what do you keep circling back to, and why?', 'what is this feeling trying to protect?', 'what would you forgive yourself for, if you could?', 'which part of today will you still remember in a year?', 'what are you afraid would happen if you slowed down?', 'what do you need that you haven\'t asked for?', 'when did you last feel completely like yourself?', 'what are you outgrowing?', 'what would the bravest version of you do tomorrow?', 'what story are you telling yourself about this?', 'what does this moment want you to notice?'],
  light: ['what snack matches this mood?', 'if today was a song, what genre?', 'what would your cat (real or imaginary) say about today?', 'best thing you heard someone say today?', 'what would you do with a free hour right now?', 'rate today in emojis. go.', 'what\'s the most random thing you thought about today?', 'which fictional character would get this mood?', 'what made you smile, even a little?', 'if you could teleport anywhere for 10 minutes, where?', 'what\'s one tiny win nobody saw?', 'pick a color for tomorrow.', 'what are you looking forward to, even slightly?', 'which song is stuck in your head?']
};
const xQStyle = () => (isPro() && LS.get('qstyle', 'gentle')) || 'gentle';
function xPick(q){ const st = xQStyle(); if (st === 'gentle' || !XQ[st]) return pickPrompt(q); const recent = LS.get('recent', []), list = XQ[st], pool = list.filter(p => !recent.includes(p)), p = (pool.length ? pool : list)[Math.floor(Math.random() * (pool.length || list.length))]; LS.set('recent', [p, ...recent].slice(0, 40)); return p; }
/* 18 · poem length (pro) */
const xShort = () => isPro() && LS.get('poemLen', 'full') === 'short';
const xCompose = (a, seed) => { const p = compose(a, seed); return xShort() && p && p.length > 3 ? [p[0], p[Math.floor(p.length / 2)], p[p.length - 1]] : p; };
/* 14 · one good thing + 17 · own question, on the result screen */
(function(){
  const pa = $('.prompt-actions'); if (pa) pa.insertAdjacentHTML('beforeend', '<button class="ghost" id="xOwnQ">write my own</button>');
  const pc = $('.prompt-card'); if (pc) pc.insertAdjacentHTML('afterend', '<div class="prompt-card xgood"><div class="prompt-k">one good thing today <span>(optional)</span></div><input id="xGood" class="answer" maxlength="120" autocomplete="off" enterkeyhint="done" placeholder="even a small one"></div>');
  const own = $('#xOwnQ'); if (own) own.onclick = () => xEdit('your own question', null, 'what do you want to sit with?', '', v => { if (!v || !S.result) return; S.result.prompt = v.slice(0, 140).replace(/([^?.!])$/, '$1?'); setPrompt(S.result.prompt); }, 140);
  $('#xGood')?.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
})();
/* 19 · read aloud (pro) */
function xSpeak(lines){
  if (!('speechSynthesis' in window)) return toast('this phone can\'t read aloud here');
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
  const u = new SpeechSynthesisUtterance(lines.join('. ')); u.rate = .82; u.pitch = .95;
  const v = speechSynthesis.getVoices().find(v => /en(-|_)/i.test(v.lang) && /samantha|ava|serena|karen|daniel|female/i.test(v.name)) || speechSynthesis.getVoices().find(v => /^en/i.test(v.lang)); if (v) u.voice = v;
  speechSynthesis.speak(u);
}
/* 11 · share a poem as an image card (pro) */
async function xPoemCard(m){
  const poem = poemFor(m); if (!poem) return;
  try { await document.fonts.load('italic 40px "Instrument Serif"'); } catch {}
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d'), [a, b, d] = m.colors;
  const g = x.createLinearGradient(0, 0, 1080, 1350); g.addColorStop(0, d); g.addColorStop(1, '#07060b'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  [[a, 300, 360, 620], [b, 820, 1000, 560]].forEach(([col, cx, cy, r]) => { const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, col + 'cc'); rg.addColorStop(1, col + '00'); x.fillStyle = rg; x.fillRect(0, 0, 1080, 1350); });
  x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = '#f3eefa'; x.textAlign = 'left'; x.font = 'italic 64px "Instrument Serif", Georgia, serif';
  const wrap = (t, max) => { const w = t.split(' '), out = []; let l = ''; w.forEach(s => { const tl = l ? l + ' ' + s : s; if (x.measureText(tl).width > max && l) { out.push(l); l = s; } else l = tl; }); if (l) out.push(l); return out; };
  let lines = []; poem.forEach(p => { lines = lines.concat(wrap(p, 860)); });
  let y = 675 - lines.length * 44; lines.forEach(l => { x.fillText(l, 110, y); y += 88; });
  x.font = '30px -apple-system, system-ui, sans-serif'; x.fillStyle = 'rgba(243,238,250,.7)';
  x.fillText((m.word || '') + ' · ' + new Date(m.t).toLocaleDateString([], { month: 'long', day: 'numeric' }).toLowerCase(), 110, 1220);
  x.textAlign = 'right'; x.fillText('liminal', 970, 1220);
  const blob = await new Promise(r => c.toBlob(r, 'image/png')), file = new File([blob], 'liminal-poem.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  download(blob, 'liminal-poem.png'); toast('saved');
}
XDBTN.push(m => poemFor(m) ? `<button class="xdb" id="xSay">${isPro() ? '' : LOCK}read aloud</button><button class="xdb" id="xCard">${isPro() ? '' : LOCK}share image</button>` : '');
XDBIND.push(m => {
  const s = $('#xSay'); if (s) s.onclick = () => isPro() ? xSpeak(poemFor(m)) : openPro('read aloud');
  const cd = $('#xCard'); if (cd) cd.onclick = () => isPro() ? xPoemCard(m) : openPro('poem image cards');
});
XDEXTRA.push(m => m.good ? `<div class="xdgood"><span>one good thing</span>${esc(m.good)}</div>` : '');
/* 20 · year in pixels (pro), inside insights */
XINS.push(() => {
  const now = new Date(), y0 = new Date(now.getFullYear(), now.getMonth() - 11, 1), byDay = {};
  S.moments.forEach(m => { if (m.t >= y0.getTime()) (byDay[xDay(m.t)] ||= []).push(m); });
  let cells = '', d = new Date(y0); d.setDate(d.getDate() - d.getDay());
  const end = xDay(Date.now());
  while (d.getTime() <= end) { const k = xDay(d), list = byDay[k], before = d < y0; let bg = 'rgba(255,255,255,.05)';
    if (list) { const v = list.reduce((s, m) => s + m.v, 0) / list.length, e = list.reduce((s, m) => s + m.e, 0) / list.length; bg = moodColors(v, e)[0]; }
    cells += `<i style="background:${before ? 'transparent' : bg}"${list ? ` title="${new Date(k).toDateString()}"` : ''}></i>`; d.setDate(d.getDate() + 1); }
  return `<div class="xi-sec"><h5>year in pixels</h5><div class="xi-year">${cells}</div><p class="xi-p" style="margin-top:6px">one square per day for the last 12 months, in that day's color.</p></div>`;
});
/* settings rows for these */
function xSettingsRows(){
  const el = $('#xRows'); if (!el) return; const pro = isPro();
  el.innerHTML = `<button class="row" id="xsQ"><span>question style</span><small>${pro ? LS.get('qstyle', 'gentle') : 'gentle · pro adds deep + light-hearted'}</small></button>
    <button class="row" id="xsLen"><span>poem length</span><small>${pro ? (LS.get('poemLen', 'full') === 'short' ? 'short · 3 lines' : 'full') : 'full · pro adds short'}</small></button>
    <button class="row" id="xsBr"><span>breathing exercise</span><small>box breathing</small></button>
    <button class="row" id="xsGr"><span>5-4-3-2-1 grounding</span><small>for anxious moments</small></button>${XSET.map(f => f()).join('')}`;
  $('#xsQ').onclick = () => { if (!pro) return openPro('question styles'); const o = ['gentle', 'deep', 'light']; LS.set('qstyle', o[(o.indexOf(LS.get('qstyle', 'gentle')) + 1) % 3]); xSettingsRows(); };
  $('#xsLen').onclick = () => { if (!pro) return openPro('poem length'); LS.set('poemLen', LS.get('poemLen', 'full') === 'short' ? 'full' : 'short'); xSettingsRows(); };
  $('#xsBr').onclick = xBreathe; $('#xsGr').onclick = xGround;
  XSETB.forEach(f => f());
}
const XSET = [], XSETB = [];
$('#settingsBtn').addEventListener('click', () => setTimeout(xSettingsRows, 0));
(function(){ const pl = $('#privline'); if (pl) pl.insertAdjacentHTML('beforebegin', '<div class="xtools"><button id="xtB">breathe</button><button id="xtG">5-4-3-2-1</button></div>'); $('#xtB') && ($('#xtB').onclick = xBreathe); $('#xtG') && ($('#xtG').onclick = xGround); })();


/* ================= Oct 21 features (batch 3) ================= */
const xFileOut = async (blob, name, type, msg) => { const file = new File([blob], name, { type }); if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; } } download(blob, name); toast(msg || 'saved'); };
/* 21 · poem book (pro): every poem, printable / save as PDF */
function xPoemBook(){
  const ms = S.moments.filter(m => poemFor(m)).slice().sort((a, b) => a.t - b.t); if (!ms.length) return toast('no poems yet');
  let box = $('#xbook'); if (!box) { box = document.createElement('div'); box.id = 'xbook'; document.body.appendChild(box); }
  box.innerHTML = `<h1>liminal</h1><p class="xbk-sub">${ms.length} poem${ms.length === 1 ? '' : 's'} · ${new Date(ms[0].t).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase()} – ${new Date(ms[ms.length - 1].t).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase()}</p>` +
    ms.map(m => `<section><div class="xbk-band">${m.colors.map(c => `<i style="background:${c}"></i>`).join('')}</div><p class="xbk-d">${new Date(m.t).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase()} · ${esc(m.word)}</p><div class="xbk-p">${poemFor(m).map(l => `<span>${esc(l)}</span>`).join('')}</div>${m.text ? `<p class="xbk-s">“${esc(m.text)}”</p>` : ''}</section>`).join('');
  document.body.classList.add('xprinting');
  const done = () => { document.body.classList.remove('xprinting'); removeEventListener('afterprint', done); };
  addEventListener('afterprint', done);
  setTimeout(() => { try { print(); } catch { toast('printing isn\'t available here'); } setTimeout(done, 1500); }, 150);
}
/* 22 · export as a spreadsheet */
function xCSV(){
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = [['date', 'time', 'feeling', 'light %', 'restless %', 'words', 'textures', 'question', 'answer', 'one good thing', 'tags', 'where/who', 'sleep h', 'energy', 'favorite', 'poem'].map(q).join(',')];
  S.moments.slice().sort((a, b) => a.t - b.t).forEach(m => { const d = new Date(m.t); rows.push([d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'), d.toTimeString().slice(0, 5), m.word, Math.round(m.v * 100), Math.round(m.e * 100), m.text, (m.chips || []).join(' '), m.prompt, m.answer, m.good, xTagsOf(m).join(' '), (m.ctx || []).join(' '), m.sleep ?? '', m.energy ?? '', m.fav ? 'yes' : '', (m.poem || []).join(' / ')].map(q).join(',')); });
  xFileOut(new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv' }), `liminal-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv', `exported ${S.moments.length} moments`);
}
/* 23 · app lock (pro) */
const xHash = async s => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('liminal-lock:' + s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); };
let xHidAt = 0;
function xLockOn(){ return !!LS.get('lock', null); }
function xShowLock(){
  if (!xLockOn() || $('#xLock')) return;
  const rs = LS.get('lockReset', 0); if (rs && Date.now() > rs) { LS.set('lock', null); LS.set('lockReset', 0); toast('app lock was reset'); return; }
  const el = document.createElement('div'); el.id = 'xLock'; el.className = 'xlock';
  let code = '';
  const paint = (msg) => { el.innerHTML = `<div class="xl-door"></div><p class="xl-t">${msg || 'enter your passcode'}</p><div class="xl-dots">${[0, 1, 2, 3].map(i => `<i class="${i < code.length ? 'on' : ''}"></i>`).join('')}</div><div class="xl-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button data-k="${k}">${k}</button>`).join('')}</div><button class="xl-forgot" id="xlF">${rs ? 'resets ' + new Date(rs).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }).toLowerCase() : 'forgot it?'}</button>${XHELP}`; };
  paint(); document.body.appendChild(el);
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'xlF') { if (LS.get('lockReset', 0)) return; if (confirm('turn the lock off in 24 hours? (the wait keeps a quick peek from getting past it)')) { LS.set('lockReset', Date.now() + 864e5); paint('the lock turns off in 24 hours'); } return; }
    const k = b.dataset.k; if (k === '⌫') code = code.slice(0, -1); else if (code.length < 4) code += k;
    paint();
    if (code.length === 4) { if (await xHash(code) === LS.get('lock', null)) { el.classList.add('out'); setTimeout(() => el.remove(), 350); LS.set('lockReset', 0); } else { code = ''; paint('not quite — try again'); try { navigator.vibrate && navigator.vibrate(80); } catch {} } }
  });
}
async function xSetLock(){
  if (!isPro()) return openPro('app lock');
  if (xLockOn()) { if (confirm('turn off the app lock?')) { LS.set('lock', null); toast('app lock off'); xSettingsRows(); } return; }
  xEdit('choose a 4-digit passcode', null, 'you\'ll type it each time liminal opens', '', v => {
    if (!/^\d{4}$/.test(v)) return toast('use exactly 4 digits');
    setTimeout(() => xEdit('type it again', null, 'just to be sure', '', async v2 => { if (v2 !== v) return toast('they didn\'t match — try again'); LS.set('lock', await xHash(v)); toast('app lock on'); xSettingsRows(); }, 4), 350);
  }, 4);
  setTimeout(() => { const i = $('#xeIn'); if (i) { i.inputMode = 'numeric'; i.type = 'password'; i.autocomplete = 'off'; } }, 60);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) xHidAt = Date.now(); else if (xHidAt && Date.now() - xHidAt > 60000) xShowLock(); });
xShowLock();
/* 24 · daily reminder in the Calendar app */
function xReminder(){
  xEdit('daily reminder', null, 'what time? (like 21:00). adds a repeating check-in to your calendar with an alert.', LS.get('remindAt', '21:00'), v => {
    const m = /^(\d{1,2}):?(\d{2})$/.exec(v.replace(/\s/g, '')); if (!m || +m[1] > 23 || +m[2] > 59) return toast('like 21:00');
    const hh = m[1].padStart(2, '0'), mm = m[2]; LS.set('remindAt', hh + ':' + mm);
    const d = new Date(), ds = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'), stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Northpeak Studios//Liminal//EN', 'BEGIN:VEVENT', 'UID:liminal-daily-' + Date.now() + '@northpeakstudios', 'DTSTAMP:' + stamp, `DTSTART:${ds}T${hh}${mm}00`, `DTEND:${ds}T${hh}${mm}00`, 'RRULE:FREQ=DAILY', 'SUMMARY:liminal · how does it feel?', 'DESCRIPTION:a minute to check in. https://northpeakstudios.github.io/liminal/', 'URL:https://northpeakstudios.github.io/liminal/', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:how does it feel, right now?', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    xFileOut(new Blob([ics], { type: 'text/calendar' }), 'liminal-reminder.ics', 'text/calendar', 'open the file to add it to your calendar');
  }, 5);
}
/* 25 · 26 · sleep, energy, where/who on the result screen */
const XCTX = ['school', 'home', 'friends', 'family', 'alone', 'outside', 'practice', 'online'];
S.xr = { sleep: null, energy: null, ctx: [] };
(function(){
  const k = $('#keep'); if (!k) return;
  k.insertAdjacentHTML('beforebegin', `<div class="prompt-card xctx"><div class="prompt-k">where / who <span>(optional)</span></div><div class="xctx-chips">${XCTX.map(c => `<button data-c="${c}">${c}</button>`).join('')}</div>
    <div class="xsl"><label>sleep last night <b id="xSlV">—</b></label><input type="range" id="xSl" min="0" max="12" step="0.5" value="7"></div>
    <div class="xsl"><label>energy <b id="xEnV">—</b></label><input type="range" id="xEn" min="1" max="5" step="1" value="3"></div></div>`);
  $$('.xctx-chips button').forEach(b => b.onclick = () => { const c = b.dataset.c, a = S.xr.ctx; S.xr.ctx = a.includes(c) ? a.filter(x => x !== c) : [...a, c].slice(-3); b.classList.toggle('on', S.xr.ctx.includes(c)); });
  const EN = ['', 'drained', 'low', 'okay', 'good', 'buzzing'];
  $('#xSl').oninput = e => { S.xr.sleep = +e.target.value; $('#xSlV').textContent = e.target.value + 'h'; };
  $('#xEn').oninput = e => { S.xr.energy = +e.target.value; $('#xEnV').textContent = EN[e.target.value]; };
})();
function xResetResult(){ S.xr = { sleep: null, energy: null, ctx: [] }; $$('.xctx-chips button').forEach(b => b.classList.remove('on')); if ($('#xSlV')) { $('#xSlV').textContent = '—'; $('#xEnV').textContent = '—'; $('#xSl').value = 7; $('#xEn').value = 3; } }
XDEXTRA.push(m => { const bits = []; if (m.ctx && m.ctx.length) bits.push(m.ctx.map(esc).join(', ')); if (m.sleep != null) bits.push(m.sleep + 'h sleep'); if (m.energy) bits.push(['', 'drained', 'low', 'okay', 'good', 'buzzing'][m.energy] + ' energy'); return bits.length ? `<p class="xdctx">${bits.join(' · ')}</p>` : ''; });
XCHIPS.push(chip => { const used = new Set(); S.moments.forEach(m => (m.ctx || []).forEach(c => used.add(c))); return XCTX.filter(c => used.has(c)).map(c => chip('ctx', c, c)).join(''); });
XINS.push(() => {
  const ms = S.moments.filter(m => m.sleep != null); if (ms.length < 4) return '';
  const hi = ms.filter(m => m.sleep >= 8), lo = ms.filter(m => m.sleep < 7), avg = l => Math.round(l.reduce((s, m) => s + m.v, 0) / l.length * 100);
  return `<div class="xi-sec"><h5>sleep</h5><p class="xi-p">average ${(ms.reduce((s, m) => s + m.sleep, 0) / ms.length).toFixed(1)}h over ${ms.length} moments.${hi.length && lo.length ? ` after 8h+ you were <b>${avg(hi)}%</b> light; under 7h, <b>${avg(lo)}%</b>.` : ''}</p></div>`;
});
/* 27 · random past moment */
function xRandom(){ if (!S.moments.length) return; const i = Math.floor(Math.random() * S.moments.length); openDetail(S.moments, i); }
/* 28 · sound timer (pro) */
let xSndT = 0;
function xSoundTimer(){
  if (!isPro()) return openPro('sound timer');
  const o = [0, 5, 10, 20, 30], cur = LS.get('sndTimer', 0), nx = o[(o.indexOf(cur) + 1) % o.length]; LS.set('sndTimer', nx);
  clearTimeout(xSndT);
  if (nx) { if (S.muted) setMuted(false); xSndT = setTimeout(() => { const v0 = engine.vol; let k = 0; const f = setInterval(() => { k++; engine.setVolume(v0 * (1 - k / 20)); if (k >= 20) { clearInterval(f); setMuted(true); engine.setVolume(v0); LS.set('sndTimer', 0); toast('sound timer done · sound off'); xSettingsRows(); } }, 1000); }, nx * 60000); toast(`sound fades out in ${nx} min`); }
  else toast('sound timer off');
  xSettingsRows();
}
/* 29 · undo delete */
function xUndoDelete(m){
  let el = $('#xUndo'); if (!el) { el = document.createElement('div'); el.id = 'xUndo'; el.className = 'xundo'; document.body.appendChild(el); }
  el.innerHTML = `<span>moment deleted</span><button>undo</button>`; el.classList.add('on');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 5500);
  el.querySelector('button').onclick = async () => { el.classList.remove('on'); try { await db.put(m); } catch { return toast('couldn\'t bring it back'); } cloud.markDirty(m.id); syncSoon(1500); S.moments = [...S.moments.filter(x => x.id !== m.id), m].sort((a, b) => b.t - a.t); paintKey = ''; renderArchive(); toast('brought it back'); };
}
/* 30 · pin a poem to the feel screen (pro) */
function xPinned(){
  const el = $('#xPin'); if (!el) return; const id = LS.get('pinPoem', null), m = id && S.moments.find(x => x.id === id), poem = m && isPro() && poemFor(m);
  if (!poem) { el.hidden = true; return; }
  el.hidden = false; el.innerHTML = `<div class="xpin-p">${poem.map(l => `<span>${esc(l)}</span>`).join('')}</div><button class="xpin-x" aria-label="Unpin">×</button>`;
  el.querySelector('.xpin-x').onclick = e => { e.stopPropagation(); LS.set('pinPoem', null); xPinned(); toast('unpinned'); };
  el.onclick = () => openDetail(S.moments, S.moments.indexOf(m));
}
XDBTN.push(m => poemFor(m) ? `<button class="xdb" id="xPinB">${isPro() ? '' : LOCK}${LS.get('pinPoem', null) === m.id ? 'unpin' : 'pin to feel'}</button>` : '');
XDBIND.push(m => { const b = $('#xPinB'); if (b) b.onclick = () => { if (!isPro()) return openPro('pinned poems'); const on = LS.get('pinPoem', null) === m.id; LS.set('pinPoem', on ? null : m.id); xPinned(); drawDetail(); toast(on ? 'unpinned' : 'pinned to the feel screen'); }; });
(function(){ const h = $('#stWords .ask'); if (h) h.insertAdjacentHTML('beforebegin', '<button class="xpin" id="xPin" hidden></button>'); setTimeout(xPinned, 350); })();
/* 31 · 32 · 33 · volume, text size, reduce motion */
function xApplyLook(){
  const ts = LS.get('textSize', 1), calm = LS.get('calm', matchMedia('(prefers-reduced-motion: reduce)').matches);
  document.documentElement.style.setProperty('--xts', ts); document.documentElement.classList.toggle('xts-on', ts !== 1);
  document.documentElement.classList.toggle('xcalm', !!calm); window.__xcalm = !!calm;
}
xApplyLook();
/* 34 · your numbers */
function xNumbers(){
  const ms = S.moments, days = new Set(ms.map(m => xDay(m.t))), words = ms.reduce((s, m) => s + ([m.text, m.answer, m.good].join(' ').match(/[A-Za-z\u00c0-\u024f']+/g) || []).length, 0);
  const sorted = [...days].sort((a, b) => a - b); let best = 0, run = 0, prev = 0; sorted.forEach(d => { run = prev && Math.round((d - prev) / 864e5) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  return { n: ms.length, days: days.size, words, best, first: ms.length ? ms[ms.length - 1].t : 0 };
}
XSET.push(() => { const N = xNumbers(), ts = LS.get('textSize', 1), calm = LS.get('calm', matchMedia('(prefers-reduced-motion: reduce)').matches), lock = xLockOn(), st = LS.get('sndTimer', 0);
  return `<div class="row xnum"><span>your numbers</span><small>${N.n} moments · ${N.days} days · ${N.words} words · best streak ${N.best} day${N.best === 1 ? '' : 's'}${N.first ? ' · since ' + new Date(N.first).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase() : ''}</small></div>
  <div class="row xvol"><span>sound volume</span><input type="range" id="xVol" min="0.05" max="1" step="0.05" value="${engine.vol}"></div>
  <button class="row" id="xsTimer"><span>sound timer</span><small>${isPro() ? (st ? 'fades out ' + st + ' min after you set it' : 'off') : 'pro'}</small></button>
  <button class="row" id="xsTs"><span>text size</span><small>${ts === 1 ? 'normal' : ts < 1.2 ? 'large' : 'larger'}</small></button>
  <button class="row" id="xsCalm"><span>reduce motion</span><span class="toggle${calm ? ' on' : ''}"></span></button>
  <button class="row" id="xsLock"><span>app lock</span><small>${isPro() ? (lock ? 'on · 4-digit passcode' : 'off') : 'pro'}</small></button>
  <button class="row" id="xsRem"><span>daily reminder</span><small>adds a check-in to your calendar${LS.get('remindAt', '') ? ' · ' + LS.get('remindAt', '') : ''}</small></button>
  <button class="row" id="xsCsv"><span>export spreadsheet</span><small>.csv for numbers, sheets, excel</small></button>
  <button class="row" id="xsBook"><span>poem book</span><small>${isPro() ? 'every poem on printable pages · save as pdf' : 'pro'}</small></button>`; });
XSETB.push(() => {
  $('#xVol').oninput = e => engine.setVolume(+e.target.value);
  $('#xsTimer').onclick = xSoundTimer; $('#xsLock').onclick = xSetLock; $('#xsRem').onclick = xReminder; $('#xsCsv').onclick = xCSV;
  $('#xsBook').onclick = () => isPro() ? xPoemBook() : openPro('the poem book');
  $('#xsTs').onclick = () => { const o = [1, 1.12, 1.25], c = LS.get('textSize', 1); LS.set('textSize', o[(o.indexOf(c) + 1) % 3]); xApplyLook(); xSettingsRows(); };
  $('#xsCalm').onclick = () => { LS.set('calm', !LS.get('calm', matchMedia('(prefers-reduced-motion: reduce)').matches)); xApplyLook(); xSettingsRows(); };
});


/* ================= Oct 21 (steer 4:42 PM): every new feature is Pro (988 stays free); themes ================= */
const XLOCK = '<svg class="xlk" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/></svg>';
xFilter = (f => list => isPro() ? f(list) : list)(xFilter);
xBarHTML = (f => () => isPro() ? f() : `<div class="xbar"><button class="xprobar" id="xProBar">${XLOCK}<span>search, favorites, filters, streaks, random moment and insights</span><b>pro</b></button></div>`)(xBarHTML);
xBindBar = (f => () => { if (isPro()) return f(); const b = $('#xProBar'); if (b) b.onclick = () => openPro('search, filters and insights'); })(xBindBar);
xDetailHook = (f => m => {
  if (isPro()) return f(m);
  const box = document.createElement('div'); box.className = 'xd';
  box.innerHTML = `<div class="xdrow"><button class="xdb xdpro" id="xProD">${XLOCK} favorite, tags, answer, read aloud, share image, pin · pro</button></div>${XDEXTRA.map(g => g(m)).join('')}`;
  const date = $('#dBody .d-date'); date ? date.after(box) : $('#dBody').prepend(box);
  $('#xProD').onclick = () => openPro('favorites, tags and sharing');
})(xDetailHook);
xOnThisDay = (f => () => { f(); const el = $('#xOtd'); if (!el || el.hidden || isPro()) return; el.innerHTML = `${XLOCK}<span><b>on this day</b> · a past moment from this date is waiting · pro</span>`; el.onclick = () => openPro('on this day'); })(xOnThisDay);
const xProOv = (id, what) => { const el = xOverlay(id, `<div class="xpro-ov">${XLOCK}<h3>${what} is part of pro</h3><p>every new calm tool lives in liminal pro. the help line below is always free.</p><button class="primary" id="xProGo">see pro</button></div>${XHELP}`); $('#xProGo').onclick = () => { el.querySelector('.xov-x').click(); openPro(what); }; };
xBreathe = (f => () => isPro() ? f() : xProOv('xBreath', 'breathing'))(xBreathe);
xGround = (f => () => isPro() ? f() : xProOv('xGroundOv', 'grounding'))(xGround);
xPaintChips = (f => () => { f(); if (isPro()) return; const a = $('#chips .xaddc'); if (a) { a.innerHTML = XLOCK + ' your own'; a.onclick = () => openPro('your own words'); } })(xPaintChips);
xUndoDelete = (f => m => isPro() ? f(m) : toast('deleted'))(xUndoDelete);
xSettingsRows = (f => () => {
  f(); if (isPro()) return;
  $$('#xRows .row').forEach(r => {
    if (r.id === 'xsBr' || r.id === 'xsGr' || r.id === 'xsTheme') return;
    const sm = r.querySelector('small'); if (sm && !/pro/.test(sm.textContent)) sm.textContent = (sm.textContent ? sm.textContent + ' · ' : '') + 'pro';
    if (r.classList.contains('xnum') && sm) sm.textContent = 'moments, days, words and your best streak · pro';
    const inp = r.querySelector('input'); if (inp) { inp.disabled = true; inp.style.opacity = .4; }
    r.onclick = e => { e.preventDefault(); e.stopPropagation(); openPro(r.querySelector('span')?.textContent || 'this'); };
  });
  ['xsBr', 'xsGr'].forEach(id => { const sm = $('#' + id + ' small'); if (sm && !/pro/.test(sm.textContent)) sm.textContent += ' · pro'; });
})(xSettingsRows);
/* result screen + feel screen locked states */
let xWasPro = null;
function xApplyPro(){
  const pro = isPro(); if (pro === xWasPro) return; xWasPro = pro;
  document.documentElement.classList.toggle('xfree', !pro);
  $$('.xtools button').forEach(b => { if (b.id === 'x8L') { b.textContent = '✦ labs'; return; } b.innerHTML = (pro ? '' : XLOCK) + (b.id === 'xtB' ? 'breathe' : '5-4-3-2-1'); });
  const g = $('#xGood'); if (g) { g.readOnly = !pro; g.placeholder = pro ? 'even a small one' : 'one good thing · pro'; }
  const own = $('#xOwnQ'); if (own) own.innerHTML = (pro ? '' : XLOCK) + 'write my own';
  const cx = $('.xctx'); if (cx) cx.classList.toggle('xlocked', !pro);
  try { xPaintChips(); } catch {}
  try { xApplyLook(); xTheme(); } catch {}
  try { if ($('#xRows')) xSettingsRows(); } catch {}
  try { renderArchive(); } catch {}
}
document.addEventListener('click', e => {
  if (isPro()) return;
  const t = e.target.closest('#xOwnQ, #xGood, .xctx');
  if (!t) return; e.preventDefault(); e.stopImmediatePropagation(); if (t.id === 'xGood') t.blur();
  openPro(t.id === 'xOwnQ' ? 'your own questions' : t.id === 'xGood' ? 'one good thing' : 'where / who, sleep and energy');
}, true);
document.addEventListener('pointerdown', e => { if (!isPro() && e.target.closest('.xctx input')) e.preventDefault(); }, true);
xApplyLook = (f => () => { if (isPro()) return f(); document.documentElement.style.setProperty('--xts', 1); document.documentElement.classList.remove('xts-on'); const calm = matchMedia('(prefers-reduced-motion: reduce)').matches; document.documentElement.classList.toggle('xcalm', calm); window.__xcalm = calm; })(xApplyLook);
/* themes: auto starts opposite to the phone (light phone → dark liminal, dark phone → light liminal) */
const XLT = [['auto', 'auto', 0], ['dark', 'dark', 0], ['light', 'light', 0], ['oled', 'black', 1], ['dusk', 'dusk', 1], ['ocean', 'ocean', 1], ['forest', 'forest', 1], ['rose', 'rose', 1]];
const XLTBG = { dark: '#07060b', light: '#f4f0f8', oled: '#000000', dusk: '#140a0a', ocean: '#04111b', forest: '#05110b', rose: '#14070e' };
const xLMQ = matchMedia('(prefers-color-scheme: dark)');
function xThemeNow(){ let t = LS.get('theme', 'auto'); const it = XLT.find(x => x[0] === t); if (!it || (it[2] && !isPro())) t = 'auto'; if (t === 'auto') t = xLMQ.matches ? 'light' : 'dark'; return t; }
function xTheme(){
  const t = xThemeNow(), h = document.documentElement;
  if (t === 'dark') h.removeAttribute('data-lt'); else h.setAttribute('data-lt', t);
  h.classList.toggle('xlight', t === 'light');
  document.querySelectorAll('meta[name=theme-color]').forEach(m => m.setAttribute('content', XLTBG[t] || '#07060b'));
  const cs = document.querySelector('meta[name=color-scheme]'); if (cs) cs.setAttribute('content', t === 'light' ? 'light' : 'dark');
}
try { xLMQ.addEventListener('change', () => { if (LS.get('theme', 'auto') === 'auto') xTheme(); }); } catch { try { xLMQ.addListener(() => { if (LS.get('theme', 'auto') === 'auto') xTheme(); }); } catch {} }
XSET.unshift(() => { const cur = LS.get('theme', 'auto'), pro = isPro();
  return `<div class="row xthrow" id="xsTheme"><span>theme</span><small>auto starts opposite to your phone${pro ? '' : ' · colour themes are pro'}</small></div><div class="xths">${XLT.map(t => `<button class="xth${cur === t[0] ? ' on' : ''}" data-t="${t[0]}"><i class="xth-${t[0]}"></i><span>${t[2] && !pro ? XLOCK : ''}${t[1]}</span></button>`).join('')}</div>`; });
XSETB.unshift(() => { $$('#xRows .xth').forEach(b => b.onclick = () => { const it = XLT.find(x => x[0] === b.dataset.t); if (it[2] && !isPro()) return openPro('colour themes'); LS.set('theme', it[0]); xTheme(); xSettingsRows(); }); });
if ($('#xtB')) $('#xtB').onclick = () => xBreathe(); if ($('#xtG')) $('#xtG').onclick = () => xGround();
xTheme(); xApplyPro(); setInterval(xApplyPro, 2500);


/* ---------- v32 · echo (free) · listen to your week (pro) · blend two days (pro) ---------- */
const X6 = { ov: null, timer: 0, wasMuted: null };
const x6d = (a, b) => Math.hypot(a.v - b.v, a.e - b.e);
const x6day = t => new Date(t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }).toLowerCase();
/* echo: the past moment that sat closest to this one in feeling-space (light/heavy × still/restless), plus shared words as a tie-break */
function x6echo(m) {
  if (!m || m.care) return null;
  const words = new Set([...(m.chips || []), ...String(m.text || '').toLowerCase().match(/[a-z]{4,}/g) || []]);
  let best = null, bs = 1e9;
  for (const o of S.moments) {
    if (o.id === m.id || o.care || Math.abs(o.t - m.t) < 6 * 36e5) continue;
    let d = x6d(m, o); if (d > 0.14) continue;
    const ow = [...(o.chips || []), ...String(o.text || '').toLowerCase().match(/[a-z]{4,}/g) || []]; let sh = 0; ow.forEach(w => { if (words.has(w)) sh++; });
    d -= Math.min(0.05, sh * 0.02); if (d < bs) { bs = d; best = o; }
  }
  return best;
}
function x6echoHTML(m) {
  const o = x6echo(m); if (!o) return '';
  const pro = isPro(), ago = Math.round((m.t - o.t) / 864e5), when = ago > 0 ? (ago === 1 ? 'the day before' : ago + ' days before') : ago < 0 ? (ago === -1 ? 'the day after' : -ago + ' days later') : 'the same day';
  return `<div class="x6-echo"><p class="x6-k">echo · you felt close to this before</p><button class="x6-ecard" data-x6open="${esc(o.id)}"><span class="x6-dot" style="background:${esc((pro ? o.colors : ['#cfc8e6'])[0])}"></span><span class="x6-et"><b>${esc(x6day(o.t))}</b><small>${esc(when)}${pro ? ' · ' + esc(o.word) : ''}</small>${o.text ? `<span>“${esc(o.text.slice(0, 120))}”</span>` : ''}${o.answer ? `<span class="x6-a">you answered: ${esc(o.answer.slice(0, 120))}</span>` : ''}${o.good ? `<span class="x6-g">one good thing that day: ${esc(o.good.slice(0, 120))}</span>` : ''}</span></button><p class="x6-fine">matched by where the two moments sit on the light–heavy and still–restless scales, not by reading your mind.</p></div>`;
}
const _x6dd = drawDetail;
drawDetail = function () {
  _x6dd.apply(this, arguments);
  const { list, idx } = S.detail || {}; const m = list && list[idx]; if (!m) return;
  const body = $('#dBody'); if (!body) return;
  body.insertAdjacentHTML('beforeend', x6echoHTML(m) + (!m.care ? `<button class="x6-blendbtn" id="x6Blend">${isPro() ? '' : LOCK}blend with another day</button>` : ''));
  const b = $('#x6Blend'); if (b) b.onclick = () => isPro() ? x6pick(m) : openPro('blend two days');
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-x6open]'); if (!t) return;
  const i = S.moments.findIndex(x => x.id === t.dataset.x6open); if (i < 0) return;
  x6close(); openDetail(S.moments, i); const sc = document.querySelector('#detail .d-scroll, #detail'); if (sc) sc.scrollTop = 0;
});
/* right after keeping a moment: a quiet echo bar on the feel screen */
const _x6keep = $('#keep').onclick;
$('#keep').onclick = async function () {
  await _x6keep.apply(this, arguments);
  const m = S.moments[0]; if (!m || Date.now() - m.t > 5000) return; const o = x6echo(m); if (!o) return;
  let bar = $('#x6bar'); if (!bar) { bar = document.createElement('button'); bar.id = 'x6bar'; bar.className = 'x6-bar'; document.body.appendChild(bar); }
  bar.innerHTML = `<span class="x6-dot" style="background:${esc((isPro() ? o.colors : ['#cfc8e6'])[0])}"></span><span>this feels like <b>${esc(x6day(o.t))}</b>. see it</span>`; bar.dataset.x6open = o.id;
  requestAnimationFrame(() => bar.classList.add('on')); clearTimeout(X6.bt); X6.bt = setTimeout(() => bar.classList.remove('on'), 7000);
};
/* overlay shell */
function x6open(html) {
  x6close(); const ov = document.createElement('div'); ov.className = 'x6-ov'; ov.setAttribute('role', 'dialog');
  ov.innerHTML = `<div class="x6-in"><button class="x6-x" aria-label="close">×</button>${html}</div>`; document.body.appendChild(ov); X6.ov = ov;
  ov.querySelector('.x6-x').onclick = x6close; requestAnimationFrame(() => ov.classList.add('on')); return ov;
}
function x6close() {
  clearTimeout(X6.timer); X6.timer = 0;
  if (X6.ov) { X6.ov.remove(); X6.ov = null; }
  if (X6.wasMuted !== null) { engine.setMuted(X6.wasMuted); X6.wasMuted = null; syncSound(); }
}
/* listen to your week: each moment of the last 7 days plays as sound + colour + scene for a few seconds, in order */
function x6week() {
  if (!isPro()) return openPro('listen to your week');
  const cut = Date.now() - 7 * 864e5; let ms = S.moments.filter(m => m.t >= cut).sort((a, b) => a.t - b.t);
  if (ms.length < 2) ms = S.moments.slice(0, 7).sort((a, b) => a.t - b.t);
  if (ms.length < 2) { toast('keep a couple of moments first'); return; }
  const ov = x6open(`<p class="x6-k">your week, as sound</p><div class="x6-stage"><canvas id="x6c" width="680" height="440"></canvas></div><h2 class="x6-w" id="x6w"></h2><p class="x6-sub" id="x6s"></p><div class="x6-dots">${ms.map((m, i) => `<i data-i="${i}"></i>`).join('')}</div><div class="x6-row"><button class="primary" id="x6again">play again</button></div><p class="x6-fine">each moment you kept this week plays for a few seconds: its colours, its scene and the soundscape it made.</p>`);
  X6.wasMuted = S.muted; engine.setMuted(false);
  let i = 0;
  const step = () => {
    if (!X6.ov || X6.ov !== ov) return; if (i >= ms.length) { ov.querySelector('#x6s').textContent = 'that was your week.'; engine.stop(); return; }
    const m = ms[i]; aura.set(m.colors, 0.2 + m.v * 0.6, 0.2 + (1 - m.e) * 0.5, m.e); engine.setMood({ v: m.v, e: m.e, chips: m.chips || [] }, m.seed); engine.play();
    drawScene(ov.querySelector('#x6c'), m); ov.querySelector('#x6w').textContent = m.word; ov.querySelector('#x6s').textContent = x6day(m.t) + ' · ' + fmtTime(m.t);
    ov.querySelectorAll('.x6-dots i').forEach((d, k) => { d.classList.toggle('on', k === i); d.classList.toggle('done', k < i); d.style.background = k <= i ? ms[k].colors[0] : ''; });
    i++; X6.timer = setTimeout(step, 4800);
  };
  ov.querySelector('#x6again').onclick = () => { clearTimeout(X6.timer); i = 0; step(); };
  step();
}
/* blend two days: paint and write what sits between two moments */
function x6pick(a) {
  const list = S.moments.filter(m => m.id !== a.id && !m.care).slice(0, 60);
  if (!list.length) { toast('keep another moment to blend with'); return; }
  const ov = x6open(`<p class="x6-k">blend “${esc(a.word)}” with…</p><div class="x6-list">${list.map(m => `<button class="x6-li" data-b="${esc(m.id)}"><span class="x6-dot" style="background:${esc(m.colors[0])}"></span><span><b>${esc(m.word)}</b><small>${esc(x6day(m.t))}${m.text ? ' · ' + esc(m.text.slice(0, 50)) : ''}</small></span></button>`).join('')}</div>`);
  ov.querySelectorAll('[data-b]').forEach(b => b.onclick = () => x6blend(a, S.moments.find(m => m.id === b.dataset.b)));
}
function x6blend(a, b, seed) {
  if (!a || !b) return; seed = seed || ((a.seed ^ b.seed ^ newSeed()) >>> 0);
  const v = (a.v + b.v) / 2, e = (a.e + b.e) / 2, colors = a.colors.map((c, i) => mixHex([c, b.colors[i] || c]));
  const anchor = (a.chips || [])[0] || (b.chips || [])[0] || null;
  const scene = sceneFor({ v, e, seed, chips: [...(a.chips || []), ...(b.chips || [])].slice(0, 3) });
  const poem = compose({ v, e, anchor, theme: null, colorWords: [], crisis: false, matched: 1 }, seed), word = moodWord(v, e);
  const ov = x6open(`<p class="x6-k">${esc(x6day(a.t))} + ${esc(x6day(b.t))}</p><div class="x6-pair"><span style="background:${esc(a.colors[0])}"></span><i>+</i><span style="background:${esc(b.colors[0])}"></span><i>=</i><span style="background:${esc(colors[0])}"></span></div><div class="x6-stage"><canvas id="x6c" width="680" height="440"></canvas></div><h2 class="x6-w">${esc(word)}</h2><div class="d-poem x6-poem">${poem.map(l => `<span>${esc(l)}</span>`).join('')}</div><div class="x6-row"><button class="primary" id="x6re">blend again</button><button class="ghost" id="x6cp">copy poem</button></div><p class="x6-fine">the halfway point between two days: their colours mixed, a scene and a poem for the feeling in between. nothing is saved unless you copy it.</p>`);
  drawScene(ov.querySelector('#x6c'), { v, e, seed, colors, scene });
  aura.set(colors, 0.2 + v * 0.6, 0.2 + (1 - e) * 0.5, e);
  ov.querySelector('#x6re').onclick = () => x6blend(a, b, newSeed());
  ov.querySelector('#x6cp').onclick = () => { try { navigator.clipboard.writeText(poem.join('\n')); toast('poem copied'); } catch { toast('couldn\'t copy'); } };
}
function x6driftBtn() {
  const el = $('#v-drift'); if (!el || el.querySelector('.x6-wk')) return;
  el.insertAdjacentHTML('afterbegin', `<button class="x6-wk" id="x6wk">${isPro() ? '' : LOCK}<span>▶ listen to your week</span><small>your moments, played as sound</small></button>`);
  $('#x6wk').onclick = x6week;
}
const _x6ra = renderArchive;
renderArchive = function () { _x6ra.apply(this, arguments); try { if (S.tab === 'archive' && S.view === 'drift') x6driftBtn(); if (S.tab === 'archive' && S.view === 'moments') x6momBtn(); } catch {} };
function x6momBtn() { const el = $('#v-moments'); if (!el || el.querySelector('.x6-wk') || S.moments.length < 2) return; el.insertAdjacentHTML('afterbegin', `<button class="x6-wk" id="x6wk2">${isPro() ? '' : LOCK}<span>▶ listen to your week</span><small>your moments, played as sound</small></button>`); $('#x6wk2').onclick = x6week; }


/* ---------- v33 · liminal labs: 8 small experiments (name it, unsent, future you, a friend's voice: free · your sky, where it lives, good-things jar, safe place: pro) ---------- */
const X8 = [
  ['name', 'name it', 'find the exact word for what you feel. more feeling words = more control over them.', 0],
  ['unsent', 'unsent letter', 'write to anyone, then let it dissolve. nothing is saved, ever.', 0],
  ['future', 'future you', 'seal a letter to yourself. it won’t open until the day you pick.', 0],
  ['friend', 'a friend’s voice', 'read your own heavy words as if a friend said them, and answer them the way you would a friend.', 0],
  ['sky', 'your sky', 'every moment becomes a star. moments that share a feeling-chip join into constellations.', 1],
  ['body', 'where it lives', 'tap where you feel it in your body. over time you see where heavy and light feelings live for you.', 1],
  ['jar', 'good-things jar', 'every “one good thing” you’ve written, in a jar. tap to pull one out.', 1],
  ['safe', 'safe place', 'describe a place where you feel okay. liminal paints it and keeps it for when you need it.', 1]
];
const x8LS = (k, d) => LS.get('x8.' + k, d), x8set = (k, v) => LS.set('x8.' + k, v);
const x8back = '<button class="x8-back" data-x8="labs">‹ labs</button>';
const x8head = k => { const t = X8.find(x => x[0] === k); return `${x8back}<p class="x6-k">labs${t[3] ? ' · pro' : ''}</p><h2 class="x8-h">${t[1]}</h2><p class="x8-p">${t[2]}</p>`; };
function x8labs() {
  const pro = isPro();
  const ov = x6open(`<p class="x6-k">new in v34</p><h2 class="x8-h">labs</h2><p class="x8-p">small experiments for your feelings. everything stays on this phone unless it says otherwise.</p><div class="x8-list">${X8.map(t => { const due = t[0] === 'worry' ? x34due() : 0; return `<button class="x8-row" data-x8="${t[0]}"><span><b>${t[3] && !pro ? XLOCK : ''}${t[1]}${t[4] ? '<em class="x34-new">new</em>' : ''}${t[3] ? '<em class="x34-pro">pro</em>' : ''}</b><small>${due ? `${due} parked worr${due === 1 ? 'y is' : 'ies are'} ready to check` : t[2]}</small></span><i>›</i></button>`; }).join('')}</div>${XHELP}`); try { $('#x8L') && $('#x8L').classList.remove('x34-dot'); } catch (e) {}
  x8bind(ov);
}
function x8bind(ov) { ov.addEventListener('click', e => { const b = e.target.closest('[data-x8]'); if (!b) return; x8go(b.dataset.x8); }); }
function x8go(k) {
  if (k === 'labs') return x8labs();
  const t = X8.find(x => x[0] === k); if (!t) return;
  if (t[3] && !isPro()) { x6close(); return openPro(t[1]); }
  ({ name: x8name, unsent: x8unsent, future: x8future, friend: x8friend, sky: x8sky, body: x8body, jar: x8jar, safe: x8safe, worry: x34worry, rhythm: x34rhythm, thennow: () => x34thennow() })[k]();
}
function x8open(k, html) { const ov = x6open(x8head(k) + html); ov.querySelector('.x8-back').onclick = () => x8labs(); return ov; }

/* 1 · name it (free): emotional granularity */
const X8W = {
  hr: ['frustrated', 'on edge', 'overwhelmed', 'jittery', 'resentful', 'panicky', 'irritated', 'restless', 'betrayed', 'humiliated', 'jealous', 'trapped'],
  hs: ['drained', 'lonely', 'numb', 'disappointed', 'hopeless', 'homesick', 'left out', 'heavy-hearted', 'ashamed', 'bored', 'empty', 'grieving'],
  ls: ['content', 'relieved', 'peaceful', 'safe', 'grateful', 'cozy', 'accepted', 'mellow', 'nostalgic', 'tender', 'hopeful', 'rested'],
  lr: ['excited', 'proud', 'inspired', 'giddy', 'confident', 'amused', 'eager', 'loved', 'determined', 'free', 'playful', 'awestruck']
};
const X8Q = { hr: 'heavy + restless', hs: 'heavy + still', ls: 'light + still', lr: 'light + restless' };
function x8name(q) {
  const last = S.moments[0], qq = q || (last ? quadrant(last.v, last.e) : 'ls'), used = x8LS('words', []);
  const uniq = [...new Set(used.map(x => x.w))];
  const ov = x8open('name', `<div class="x8-seg">${Object.keys(X8Q).map(k => `<button class="${k === qq ? 'on' : ''}" data-q="${k}"><i style="background:${moodColors(k[0] === 'l' ? .8 : .2, k[1] === 'r' ? .8 : .2)[0]}"></i>${X8Q[k]}</button>`).join('')}</div>
    <p class="x8-p">${last && !q ? 'starting where your last moment sat. ' : ''}which one is closest?</p><div class="x8-words">${X8W[qq].map(w => `<button data-w="${w}">${w}</button>`).join('')}</div>
    <div class="x8-said" id="x8said"></div>
    <p class="x6-k" style="margin-top:22px">your feeling words · ${uniq.length}</p><p class="x8-p">${uniq.length ? uniq.slice(-40).map(esc).join(' · ') : 'none yet. tap one above.'}</p>
    <p class="x6-fine">research on “emotional granularity” (lisa feldman barrett and others) finds people who can name feelings precisely tend to cope with them better. this just helps you practise; it isn’t a test.</p>`);
  ov.querySelectorAll('[data-q]').forEach(b => b.onclick = () => x8name(b.dataset.q));
  ov.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { const L = x8LS('words', []); L.push({ w: b.dataset.w, q: qq, t: Date.now() }); x8set('words', L.slice(-400)); ov.querySelectorAll('[data-w]').forEach(x => x.classList.toggle('on', x === b)); $('#x8said').innerHTML = `“i feel <b>${esc(b.dataset.w)}</b>.” <span>naming it is a real step. you can keep a moment with it on the feel screen.</span>`; });
}

/* 2 · unsent letter (free): nothing is stored */
function x8unsent() {
  const ov = x8open('unsent', `<input class="x8-in" id="x8to" placeholder="dear…" autocapitalize="none"><textarea class="x8-ta" id="x8let" rows="9" placeholder="say everything you can’t say to them."></textarea><button class="x6-blendbtn" id="x8go">let it go</button><div id="x8gone" class="x8-gone"></div><p class="x6-fine">this letter is never saved, synced or sent. when you let it go, it’s gone.</p>`);
  $('#x8go').onclick = () => {
    const txt = ($('#x8to').value ? $('#x8to').value + '\n' : '') + $('#x8let').value; if (!txt.trim()) return toast('write something first');
    const box = $('#x8gone'); box.innerHTML = esc(txt).split('').map((c, i) => c === '\n' ? '<br>' : `<span style="animation-delay:${(Math.random() * 1.6 + i * 0.004).toFixed(2)}s;--dx:${(Math.random() * 60 - 30).toFixed(0)}px;--dy:${(-30 - Math.random() * 60).toFixed(0)}px">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    $('#x8let').value = ''; $('#x8to').value = ''; $('#x8let').hidden = true; $('#x8to').hidden = true; $('#x8go').hidden = true;
    try { navigator.vibrate && navigator.vibrate(20); } catch {}
    setTimeout(() => { box.innerHTML = '<p class="x8-p" style="text-align:center">gone. 🌫️</p><button class="x6-blendbtn" id="x8again">write another</button>'; $('#x8again').onclick = x8unsent; }, 4200);
  };
}

/* 3 · future you (free): sealed until a date, kept on this phone */
function x8future() {
  const caps = x8LS('caps', []), now = Date.now(), last = S.moments[0];
  const fmt = t => new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();
  const ready = caps.filter(c => c.open <= now), sealed = caps.filter(c => c.open > now);
  const ov = x8open('future', `${ready.length ? `<p class="x6-k">ready to open</p>${ready.map(c => `<button class="x8-cap ready" data-cid="${c.id}"><i style="background:${c.col || '#cfc8e6'}"></i><span><b>from you, ${fmt(c.t)}</b><small>tap to open</small></span></button>`).join('')}` : ''}
    <p class="x6-k" style="margin-top:14px">write one</p><textarea class="x8-ta" id="x8fut" rows="7" placeholder="hey future me…"></textarea>
    <div class="x8-seg">${[['1 week', 7], ['1 month', 30], ['3 months', 91], ['6 months', 182]].map(([l, d], i) => `<button class="${i === 1 ? 'on' : ''}" data-d="${d}">${l}</button>`).join('')}</div>
    <button class="x6-blendbtn" id="x8seal">seal it</button>
    ${sealed.length ? `<p class="x6-k" style="margin-top:18px">sealed · ${sealed.length}</p>${sealed.map(c => `<div class="x8-cap"><i style="background:${c.col || '#cfc8e6'}"></i><span><b>opens ${fmt(c.open)}</b><small>${Math.ceil((c.open - now) / 864e5)} days to go</small></span></div>`).join('')}` : ''}
    <div id="x8read"></div><p class="x6-fine">letters stay on this phone only (not synced), so they’re gone if you clear the app’s data.${last ? ' your current colours are sealed in with it.' : ''}</p>`);
  let days = 30; ov.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { days = +b.dataset.d; ov.querySelectorAll('[data-d]').forEach(x => x.classList.toggle('on', x === b)); });
  $('#x8seal').onclick = () => { const v = $('#x8fut').value.trim(); if (!v) return toast('write something first'); const L = x8LS('caps', []); L.push({ id: uid(), t: Date.now(), open: Date.now() + days * 864e5, txt: v, col: last && last.colors ? last.colors[0] : null, word: last ? last.word : null }); x8set('caps', L); toast('sealed · see you then'); x8future(); };
  ov.querySelectorAll('[data-cid]').forEach(b => b.onclick = () => { const c = x8LS('caps', []).find(x => x.id === b.dataset.cid); if (!c) return; $('#x8read').innerHTML = `<div class="x8-letter" style="--c:${c.col || '#cfc8e6'}"><small>written ${fmt(c.t)}${c.word ? ` · you felt <b>${esc(c.word)}</b>` : ''}</small><p>${esc(c.txt).replace(/\n/g, '<br>')}</p><button class="ghost x8-del" data-del="${c.id}">done reading · remove</button></div>`; $('#x8read').scrollIntoView({ behavior: 'smooth' }); $('#x8read [data-del]').onclick = () => { x8set('caps', x8LS('caps', []).filter(x => x.id !== c.id)); x8future(); }; });
}

/* 4 · a friend's voice (free): self-compassion reframe */
function x8friend() {
  const heavy = S.moments.filter(m => !m.care && (m.text || m.answer) && m.v < .5).slice(0, 30).sort((a, b) => a.v - b.v)[0];
  const anyCare = S.moments.slice(0, 5).some(m => m.care);
  const said = heavy ? (heavy.text || heavy.answer) : '';
  const ov = x8open('friend', `${anyCare ? XHELP : ''}<div class="x8-quote">${heavy ? `<small>${x6day(heavy.t)} · you wrote</small>` : '<small>type something that’s been weighing on you</small>'}<p>${heavy ? `“${esc(said)}”` : '<textarea class="x8-ta" id="x8w" rows="3" placeholder="i keep thinking…"></textarea>'}</p></div>
    <p class="x8-p">now imagine your closest friend said that to you. what would you tell them?</p><textarea class="x8-ta" id="x8k" rows="5" placeholder="hey…"></textarea><button class="x6-blendbtn" id="x8ks">keep this</button><div id="x8kout"></div>
    ${x8LS('kind', []).length ? `<p class="x6-k" style="margin-top:18px">what you’ve told yourself</p>${x8LS('kind', []).slice(-5).reverse().map(k => `<div class="x8-kind"><small>${x6day(k.t)}</small>${esc(k.reply)}</div>`).join('')}` : ''}
    <p class="x6-fine">people are usually far kinder to friends than to themselves. self-compassion research (kristin neff and others) links treating yourself like a friend with feeling better. heavy moments flagged for care are never shown here.</p>`);
  $('#x8ks').onclick = () => { const r = $('#x8k').value.trim(); if (!r) return toast('write what you’d say'); const L = x8LS('kind', []); L.push({ t: Date.now(), mid: heavy ? heavy.id : null, worry: heavy ? null : ($('#x8w') ? $('#x8w').value.trim().slice(0, 300) : ''), reply: r.slice(0, 800) }); x8set('kind', L.slice(-60)); $('#x8kout').innerHTML = `<div class="x8-letter"><small>read it back as if it’s for you</small><p>${esc(r).replace(/\n/g, '<br>')}</p></div>`; toast('kept'); };
}

/* 5 · your sky (pro): moments as stars, shared chips as constellations */
function x8sky() {
  const ms = S.moments.filter(m => m.v != null).slice(0, 300);
  const ov = x8open('sky', `<canvas id="x8cv" class="x8-cv"></canvas><div id="x8st" class="x8-st">${ms.length ? 'tap a star' : 'keep a few moments and your sky fills in.'}</div><div id="x8leg" class="x8-leg"></div><p class="x6-fine">left = heavier, right = lighter · low = stiller, high = more restless. brighter stars are more recent.</p>`);
  const cv = $('#x8cv'), W = Math.min(480, innerWidth - 40), H = Math.round(W * 1.15), dpr = Math.min(2, devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const rnd = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(7);
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05040f'); g.addColorStop(1, '#14102a'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 140; i++) { c.fillStyle = `rgba(255,255,255,${(rnd() * .35).toFixed(2)})`; c.fillRect(rnd() * W, rnd() * H, 1, 1); }
  const now = Date.now(), pts = ms.map(m => { const h = (m.id || '').split('').reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 7); return { m, x: 18 + m.v * (W - 36) + ((h % 21) - 10), y: H - 18 - m.e * (H - 36) + (((h >> 5) % 21) - 10), a: Math.max(.35, 1 - (now - m.t) / (90 * 864e5)) }; });
  const by = {}; pts.forEach(p => (p.m.chips || []).forEach(ch => (by[ch] ||= []).push(p)));
  const groups = Object.entries(by).filter(([, a]) => a.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 6);
  groups.forEach(([ch, a], gi) => { const col = moodColors(a.reduce((s, p) => s + p.m.v, 0) / a.length, a.reduce((s, p) => s + p.m.e, 0) / a.length)[0]; const ord = a.slice().sort((p, q) => p.m.t - q.m.t); c.strokeStyle = col; c.globalAlpha = .45; c.lineWidth = 1; c.beginPath(); ord.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke(); c.globalAlpha = 1; groups[gi].push(col); });
  pts.forEach(p => { const col = (p.m.colors && p.m.colors[0]) || '#fff'; const r = 2 + p.a * 2.5; const gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = p.a; c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, r * 4, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, r * .55, 0, 7); c.fill(); c.globalAlpha = 1; });
  $('#x8leg').innerHTML = groups.length ? groups.map(([ch, a, col]) => `<span><i style="background:${col}"></i>the ${esc(ch)} · ${a.length}</span>`).join('') : (ms.length ? '<span>pick feeling-chips on moments to grow constellations</span>' : '');
  cv.onclick = e => { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let best = null, bd = 26; pts.forEach(p => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }); if (best) $('#x8st').innerHTML = `<b>${esc(best.m.word || '')}</b> · ${x6day(best.m.t)}${best.m.text ? ` · “${esc(best.m.text.slice(0, 70))}”` : ''}${(best.m.chips || []).length ? ` · ${esc(best.m.chips.join(', '))}` : ''}`; };
}

/* 6 · where it lives (pro): body map */
const X8Z = [['head', 'head', 'M50 6a14 15 0 1 1 0 30a14 15 0 1 1 0-30z'], ['throat', 'throat', 'M44 36h12v9H44z'], ['shoulders', 'shoulders', 'M22 46h56l-4 10H26z'], ['chest', 'chest', 'M30 56h40v22H30z'], ['stomach', 'stomach', 'M32 78h36v24H32z'], ['arms', 'arms & hands', 'M14 50l10 4-4 60-10-2zM86 50l-10 4 4 60 10-2z'], ['legs', 'legs', 'M33 102h15l-2 70H35zM52 102h15l-2 70H54z']];
function x8body() {
  const L = x8LS('body', []), sel = new Set(), last = S.moments[0], recent = last && Date.now() - last.t < 6 * 36e5 ? last : null;
  const paint = (filter) => { const rows = L.filter(x => !filter || (filter === 'h' ? x.v < .5 : x.v >= .5)), cnt = {}; rows.forEach(x => x.z.forEach(z => cnt[z] = (cnt[z] || 0) + 1)); const mx = Math.max(1, ...Object.values(cnt)); return { cnt, mx, n: rows.length }; };
  const svg = (id, heat, col) => `<svg viewBox="0 0 100 176" class="x8-body" id="${id}">${X8Z.map(([k, , d]) => `<path data-z="${k}" d="${d}" style="${heat ? `fill:${col};fill-opacity:${(0.08 + 0.85 * (heat.cnt[k] || 0) / heat.mx).toFixed(2)}` : ''}"/>`).join('')}</svg>`;
  const hh = paint('h'), lh = paint('l');
  const ov = x8open('body', `<p class="x8-p">${recent ? `for your last moment (<b>${esc(recent.word)}</b>, ${fmtTime(recent.t)}): ` : ''}where do you feel it right now? tap all that apply.</p>${svg('x8tap')}<div class="x8-zl" id="x8zl">nothing picked</div><button class="x6-blendbtn" id="x8bs">save</button>
    ${L.length ? `<p class="x6-k" style="margin-top:18px">your map · ${L.length} check-in${L.length === 1 ? '' : 's'}</p><div class="x8-two"><div><small>heavy feelings · ${hh.n}</small>${svg('x8h', hh, '#7a2ab8')}</div><div><small>light feelings · ${lh.n}</small>${svg('x8l', lh, '#4fd6c0')}</div></div>` : ''}
    <p class="x6-fine">a 2014 study (nummenmaa et al.) found people in different countries tend to feel emotions in similar body areas. your map is just yours, from your own taps, and stays on this phone.</p>`);
  ov.querySelectorAll('#x8tap path').forEach(p => p.onclick = () => { const z = p.dataset.z; sel.has(z) ? sel.delete(z) : sel.add(z); p.classList.toggle('on', sel.has(z)); $('#x8zl').textContent = sel.size ? [...sel].map(k => X8Z.find(x => x[0] === k)[1]).join(' · ') : 'nothing picked'; });
  $('#x8bs').onclick = () => { if (!sel.size) return toast('tap where you feel it'); const cur = recent || { v: S.live.v, e: S.live.e }; const A = x8LS('body', []); A.push({ t: Date.now(), z: [...sel], v: cur.v, e: cur.e, mid: recent ? recent.id : null }); x8set('body', A.slice(-500)); toast('saved'); x8body(); };
}

/* 7 · good-things jar (pro) */
function x8jar() {
  const goods = S.moments.filter(m => m.good && !m.care);
  const ov = x8open('jar', `<button class="x8-jar" id="x8jar" aria-label="pull one out"><span class="x8-lid"></span>${goods.slice(0, 40).map((m, i) => `<i style="left:${12 + (i * 37) % 72}%;bottom:${6 + Math.floor(i / 3) * 5 % 70}%;background:${(m.colors && m.colors[0]) || '#ffd48a'};transform:rotate(${(i * 47) % 50 - 25}deg)"></i>`).join('')}</button>
    <p class="x8-p" style="text-align:center">${goods.length ? `${goods.length} good thing${goods.length === 1 ? '' : 's'} in here. tap the jar.` : 'empty for now. when you keep a moment, fill in “one good thing” and it lands here.'}</p><div id="x8slip"></div>`);
  let last = -1; $('#x8jar').onclick = () => { if (!goods.length) return; let i = Math.floor(Math.random() * goods.length); if (goods.length > 1 && i === last) i = (i + 1) % goods.length; last = i; const m = goods[i]; $('#x8jar').classList.remove('shake'); void $('#x8jar').offsetWidth; $('#x8jar').classList.add('shake'); try { navigator.vibrate && navigator.vibrate(15); } catch {} $('#x8slip').innerHTML = `<div class="x8-slip" style="--c:${(m.colors && m.colors[0]) || '#ffd48a'}"><small>${x6day(m.t)}${m.word ? ' · ' + esc(m.word) : ''}</small><p>${esc(m.good)}</p></div>`; };
}

/* 8 · safe place (pro): your words, painted */
const X8SC = ['sea', 'lake', 'forest', 'hills', 'snow', 'night', 'field', 'mountains'];
function x8safe(edit) {
  const P = x8LS('safe', null);
  if (P && !edit) {
    const ov = x8open('safe', `<canvas id="x8sp" class="x8-cv"></canvas><div class="x8-lines" id="x8ln">${P.lines.filter(Boolean).map((l, i) => `<p style="animation-delay:${1 + i * 2.2}s">${esc(l)}</p>`).join('')}</div><div class="x8-seg"><button id="x8snd">${S.muted ? 'sound off' : '♪ sound'}</button><button id="x8ed">change it</button></div>`);
    const cv = $('#x8sp'), W = Math.min(480, innerWidth - 40), H = Math.round(W * 1.25); cv.width = W * 2; cv.height = H * 2; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const m = { v: .82, e: .14, seed: P.seed, chips: ['open'], text: '' }; try { drawScene(cv, m, { scene: P.scene }); } catch {}
    const play = () => { try { if (engine.ready) { X6.wasMuted = S.muted; engine.setMood(m, P.seed); engine.setMuted(false); engine.play(); } } catch {} };
    if (!S.muted) play();
    $('#x8snd').onclick = async () => { try { await unlock(); } catch {} play(); $('#x8snd').textContent = '♪ playing'; };
    $('#x8ed').onclick = () => x8safe(true); return;
  }
  const cur = P || { scene: 'sea', lines: ['', '', ''], seed: newSeed() };
  const ov = x8open('safe', `<p class="x6-k">what kind of place</p><div class="x8-words">${X8SC.map(s => `<button class="${s === cur.scene ? 'on' : ''}" data-sc="${s}">${esc(SCENES[s] || s)}</button>`).join('')}</div>
    <p class="x6-k" style="margin-top:14px">three details</p><input class="x8-in" id="x8l0" placeholder="what you see (warm light on the water…)" value="${esc(cur.lines[0] || '')}"><input class="x8-in" id="x8l1" placeholder="what you hear (gulls, far away…)" value="${esc(cur.lines[1] || '')}"><input class="x8-in" id="x8l2" placeholder="what you feel (sand, still warm…)" value="${esc(cur.lines[2] || '')}">
    <button class="x6-blendbtn" id="x8ss">paint my place</button><p class="x6-fine">imagining a calm, detailed place is a common relaxation technique (guided imagery). it stays on this phone.</p>`);
  let sc = cur.scene; ov.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => { sc = b.dataset.sc; ov.querySelectorAll('[data-sc]').forEach(x => x.classList.toggle('on', x === b)); });
  $('#x8ss').onclick = () => { const lines = [0, 1, 2].map(i => $('#x8l' + i).value.trim()); if (!lines.some(Boolean)) return toast('add at least one detail'); x8set('safe', { scene: sc, lines, seed: cur.seed || newSeed(), t: Date.now() }); x8safe(); };
}
(function () {
  const row = $('.xtools'); if (row && !$('#x8L')) { row.insertAdjacentHTML('beforeend', '<button id="x8L">✦ labs</button>'); }
  if ($('#x8L')) $('#x8L').onclick = x8labs;
})();

/* ---------- v34 · three more labs: worry time (free) · your rhythms, then & now (pro) ---------- */
X8.unshift(
  ['worry', 'worry time', 'park a worry and pick when to check on it. later, see how many actually happened the way you feared.', 0, 1],
  ['rhythm', 'your rhythms', 'which hours and days tend to feel heavier or lighter for you, from the moments you kept.', 1, 1],
  ['thennow', 'then & now', 'a moment from a while ago next to your latest one. what changed?', 1, 1]
);
const x34due = () => x8LS('worries', []).filter(w => !w.out && w.due <= Date.now()).length;

/* worry time (free): park it, revisit it, learn from the tally. stays on this phone. */
function x34worry() {
  const ws = x8LS('worries', []), now = Date.now();
  const fmt = t => new Date(t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }).toLowerCase() + ' · ' + fmtTime(t);
  const due = ws.filter(w => !w.out && w.due <= now), wait = ws.filter(w => !w.out && w.due > now), done = ws.filter(w => w.out);
  const nope = done.filter(w => w.out === 'no').length, part = done.filter(w => w.out === 'partly').length;
  const ov = x8open('worry', `${due.length ? `<p class="x6-k">ready to check · ${due.length}</p>${due.map(w => `<div class="x34-w ready"><p>${esc(w.text)}</p><small>parked ${fmt(w.t)}</small><span class="x34-q">did it happen the way you feared?</span><div class="x8-seg">${[['no', 'no'], ['partly', 'partly'], ['yes', 'yes']].map(([k, l]) => `<button data-wid="${w.id}" data-out="${k}">${l}</button>`).join('')}</div></div>`).join('')}` : ''}
    <p class="x6-k" style="margin-top:14px">park a worry</p><textarea class="x8-ta" id="x34t" rows="3" maxlength="280" placeholder="what keeps looping?"></textarea>
    <div class="x8-seg" id="x34d">${[['tonight', 'tonight'], ['tomorrow', 'tomorrow'], ['3 days', 3], ['1 week', 7]].map(([l, d], i) => `<button class="${i === 1 ? 'on' : ''}" data-d="${d}">${l}</button>`).join('')}</div>
    <button class="x6-blendbtn" id="x34park">park it until then</button>
    ${wait.length ? `<p class="x6-k" style="margin-top:18px">parked · ${wait.length}</p>${wait.map(w => `<div class="x34-w"><p>${esc(w.text)}</p><small>check ${fmt(w.due)}</small><button class="x34-del" data-del="${w.id}" aria-label="let this one go">let it go</button></div>`).join('')}` : ''}
    ${done.length ? `<div class="x34-tally"><b>${nope + part} of ${done.length}</b><span>worries you checked didn’t happen the way you feared${part ? ` (${part} only partly)` : ''}.</span></div>` : ''}
    <p class="x6-fine">parking a worry gives your brain permission to drop it for now. worries stay on this phone only (not synced).</p>${XHELP}`);
  let pick = 'tomorrow';
  ov.querySelectorAll('#x34d [data-d]').forEach(b => b.onclick = () => { pick = b.dataset.d; ov.querySelectorAll('#x34d [data-d]').forEach(x => x.classList.toggle('on', x === b)); });
  ov.querySelector('#x34park').onclick = () => {
    const text = ov.querySelector('#x34t').value.trim().slice(0, 280); if (!text) { toast('write the worry first'); return; }
    const d = new Date(); if (pick === 'tonight') d.setHours(Math.max(d.getHours() + 1, 20), 0, 0, 0); else if (pick === 'tomorrow') { d.setDate(d.getDate() + 1); d.setHours(17, 0, 0, 0); } else d.setTime(d.getTime() + (+pick) * 864e5);
    const list = x8LS('worries', []); list.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text, t: Date.now(), due: d.getTime() }); x8set('worries', list.slice(-200));
    toast('parked. you can put it down now.'); x34worry();
  };
  ov.querySelectorAll('[data-out]').forEach(b => b.onclick = () => { const list = x8LS('worries', []), w = list.find(x => x.id === b.dataset.wid); if (w) { w.out = b.dataset.out; w.at = Date.now(); x8set('worries', list); } toast(b.dataset.out === 'yes' ? 'that’s hard. you got through the wait, though.' : 'noted. your brain will remember this one.'); x34worry(); });
  ov.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { x8set('worries', x8LS('worries', []).filter(x => x.id !== b.dataset.del)); x34worry(); });
}

/* your rhythms (pro): average heaviness/lightness by time of day and weekday, from kept moments */
function x34rhythm() {
  const ms = S.moments.filter(m => m.v != null && m.t);
  const SL = [['early hours', 0, 5], ['morning', 5, 12], ['afternoon', 12, 17], ['evening', 17, 21], ['late night', 21, 24]], PL = { 'early hours': 'early hours', morning: 'mornings', afternoon: 'afternoons', evening: 'evenings', 'late night': 'late nights' }, DN = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const grp = (keyFn, keys) => keys.map(k => { const g = ms.filter(m => keyFn(m) === k); return { k, n: g.length, v: g.length ? g.reduce((s, m) => s + m.v, 0) / g.length : null, e: g.length ? g.reduce((s, m) => s + m.e, 0) / g.length : null, col: g.length ? mixHex(g.slice(0, 12).map(m => (m.colors || [])[0]).filter(Boolean)) : null }; });
  const slot = m => { const h = new Date(m.t).getHours(); return SL.find(s => h >= s[1] && h < s[2])[0]; };
  const bySlot = grp(slot, SL.map(s => s[0])), byDay = grp(m => DN[new Date(m.t).getDay()], [1, 2, 3, 4, 5, 6, 0].map(i => DN[i]));
  const bar = g => `<div class="x34-bar${g.n ? '' : ' none'}"><span class="x34-lbl">${g.k}</span><span class="x34-track"><i style="left:${g.n ? Math.round(g.v * 100) : 50}%;${g.col ? `background:${g.col}` : ''}"></i></span><small>${g.n ? `${moodWord(g.v, g.e)} · ${g.n}` : '—'}</small></div>`;
  const has = bySlot.filter(g => g.n >= 2), lo = has.length > 1 ? has.reduce((a, b) => a.v < b.v ? a : b) : null, hi = has.length > 1 ? has.reduce((a, b) => a.v > b.v ? a : b) : null;
  const ov = x8open('rhythm', ms.length < 5 ? `<p class="x8-said">keep at least 5 moments and your rhythms show up here.<span>you have ${ms.length} so far.</span></p>` : `
    ${lo && hi && lo !== hi && hi.v - lo.v > .08 ? `<p class="x8-said">your ${PL[hi.k]} tend to feel lighter than your ${PL[lo.k]}.<span>from ${ms.length} moments. a pattern, not a cause.</span></p>` : `<p class="x8-said">no strong pattern yet.<span>from ${ms.length} moments. more moments, clearer picture.</span></p>`}
    <div class="x34-scale"><span>heavier</span><span>lighter</span></div>
    <p class="x6-k">time of day</p>${bySlot.map(bar).join('')}
    <p class="x6-k" style="margin-top:14px">day of week</p>${byDay.map(bar).join('')}
    <p class="x6-fine">each dot is the average of the moments you kept then (left = heavier, right = lighter). it only knows when you chose to check in, so it’s a pattern, not a cause.</p>`);
  return ov;
}

/* then & now (pro): an older moment beside the newest one */
function x34thennow(pickAgo) {
  const ms = S.moments; if (ms.length < 2) { x8open('thennow', `<p class="x8-said">keep a couple of moments on different days first.</p>`); return; }
  const now = ms[0], opts = [['a week ago', 7], ['a month ago', 30], ['3 months ago', 91], ['a year ago', 365]].filter(([, d]) => ms.some(m => m.t <= now.t - d * 864e5 * .6));
  const ago = pickAgo || (opts.length ? opts[opts.length > 1 ? 1 : 0][1] : 0);
  const target = now.t - ago * 864e5, older = ms.slice(1);
  const then = ago ? older.reduce((a, b) => Math.abs(b.t - target) < Math.abs(a.t - target) ? b : a) : older[older.length - 1];
  const notes = x8LS('tn', {}), key = then.id + '>' + now.id;
  const card = (m, k) => `<div class="x34-tn"><canvas width="340" height="420" data-k="${k}"></canvas><b>${esc(m.word)}</b><small>${x6day(m.t)}</small>${m.text ? `<p>“${esc(String(m.text).slice(0, 90))}${String(m.text).length > 90 ? '…' : ''}”</p>` : ''}</div>`;
  const dv = now.v - then.v, de = now.e - then.e;
  const shift = Math.abs(dv) < .08 && Math.abs(de) < .08 ? 'you’re sitting close to where you were.' : `${Math.abs(dv) >= .08 ? (dv > 0 ? 'lighter' : 'heavier') : ''}${Math.abs(dv) >= .08 && Math.abs(de) >= .08 ? ' and ' : ''}${Math.abs(de) >= .08 ? (de > 0 ? 'more restless' : 'stiller') : ''} than then.`;
  const ov = x8open('thennow', `${opts.length > 1 ? `<div class="x8-seg">${opts.map(([l, d]) => `<button class="${d === ago ? 'on' : ''}" data-ago="${d}">${l}</button>`).join('')}</div>` : ''}
    <div class="x34-pair">${card(then, 'a')}${card(now, 'b')}</div>
    <p class="x8-said">${shift}<span>then: ${esc(then.word)} · now: ${esc(now.word)}</span></p>
    <p class="x6-k">what changed? (optional)</p><textarea class="x8-ta" id="x34n" rows="3" maxlength="400" placeholder="one line is enough">${esc(notes[key] || '')}</textarea>
    <button class="x6-blendbtn" id="x34ns">save note</button><p class="x6-fine">notes stay on this phone only.</p>`);
  ov.querySelectorAll('canvas[data-k]').forEach(c => { try { drawScene(c, c.dataset.k === 'a' ? then : now); } catch (e) {} });
  ov.querySelectorAll('[data-ago]').forEach(b => b.onclick = () => x34thennow(+b.dataset.ago));
  ov.querySelector('#x34ns').onclick = () => { const n = x8LS('tn', {}), v = ov.querySelector('#x34n').value.trim().slice(0, 400); if (v) n[key] = v; else delete n[key]; const ks = Object.keys(n); if (ks.length > 300) delete n[ks[0]]; x8set('tn', n); toast(v ? 'saved' : 'cleared'); };
}
setTimeout(() => { try { const n = x34due(); if (n) { const b = $('#x8L'); if (b) b.classList.add('x34-dot'); } } catch (e) {} }, 1500);

window.__liminal = { db, S, renderArchive, engine, cloud, afterAccount, x6week, x6blend, x6echo, x8labs, x8go, x34worry, x34rhythm, x34thennow };
