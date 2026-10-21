import { PROMPTS } from './prompts.js';
import { moodColors, mixHex, hexRgb, moodWord, quadrant } from './color.js';
import { Engine } from './audio.js';
import { analyze, compose } from './poet.js';
import { paint, layout } from './paint.js';
import * as db from './db.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const LS = { get: (k, d) => { try { const v = localStorage.getItem('lim.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set: (k, v) => { try { localStorage.setItem('lim.' + k, JSON.stringify(v)); } catch {} } };
const CHIPS = ['foggy', 'tender', 'electric', 'hollow', 'warm', 'sharp', 'tangled', 'glowing', 'distant', 'raw', 'open', 'weightless'];
const newSeed = () => (Math.random() * 4294967295) >>> 0;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const engine = new Engine();
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
function paintSoundIcons(){ [$('#soundBtn'), $('#dSound')].forEach(b => { b.innerHTML = S.muted ? ICON_OFF : ICON_ON; b.setAttribute('aria-label', S.muted ? 'Sound off' : 'Sound on'); }); $('#sSoundT').classList.toggle('on', !S.muted); }
async function unlock(){
  await engine.unlock(); engine.setMuted(S.muted);
  $('#soundPill').classList.remove('on');
  syncSound();
}
function syncSound(){
  if (!engine.ready) return;
  const wantPlay = !S.muted && (S.detail || S.tab === 'feel');
  if (wantPlay) engine.play(); else engine.stop();
}
function setMuted(m){ S.muted = m; LS.set('muted', m); engine.setMuted(m); paintSoundIcons(); syncSound(); }
['pointerdown', 'touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (!engine.ready || engine.ctx.state !== 'running') unlock(); }, { passive: true }));
document.addEventListener('visibilitychange', () => document.hidden ? engine.suspend() : engine.resume());
$('#soundBtn').onclick = () => setMuted(!S.muted);
$('#dSound').onclick = () => setMuted(!S.muted);
paintSoundIcons();

/* ---------- live mood (aura + sound follow it) ---------- */
function palette(a, chips = []){
  const c = moodColors(a.v, a.e, chips);
  const cw = a.colorWords || [];
  if (cw[0]) c[0] = mixHex([c[0], cw[0]]);
  if (cw[1]) c[1] = mixHex([c[1], cw[1]]); else if (cw[0]) c[1] = mixHex([c[1], c[1], cw[0]]);
  return c;
}
function setLive(a, chips = [], seed = S.seed){
  S.live = { v: a.v, e: a.e, chips };
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
  const r = buildResult(), seed = newSeed();
  const poem = compose(r.a, seed), colors = palette(r.a, r.chips), word = r.a.crisis ? 'heavy' : moodWord(r.a.v, r.a.e);
  S.result = { ...r, seed, poem, colors, word, prompt: pickPrompt(quadrant(r.a.v, r.a.e)) };
  S.seed = seed; setLive(r.a, r.chips, seed);
  $('#said').innerHTML = r.mode === 'words' ? `you said: <b>“${esc(r.text)}”</b>` : `no words — <b>${esc(word)}</b>${r.chips.length ? ', ' + esc(r.chips.join(', ')) : ''}`;
  renderPoem(poem);
  $('#resWord').textContent = word; $('#wordDot').style.background = colors[0]; $('#wordDot').style.boxShadow = `0 0 10px ${colors[0]}`;
  $('#swatches').innerHTML = colors.map(c => `<i style="background:${c}"></i>`).join('');
  $('#care').hidden = !r.a.crisis;
  $('#prompt').textContent = S.result.prompt; $('#answer').value = '';
  showStage('#stResult');
}
$('#translate').onclick = () => { $('#text').blur(); translate(); };
$('#translateField').onclick = translate;
$('#rewrite').onclick = () => { const R = S.result; if (!R) return; R.seed = newSeed(); R.poem = compose(R.a, R.seed); S.seed = R.seed; engine.setMood(S.live, R.seed); renderPoem(R.poem); };
$('#another').onclick = () => { if (!S.result) return; S.result.prompt = pickPrompt(quadrant(S.result.a.v, S.result.a.e)); setPrompt(S.result.prompt); };
$('#again').onclick = () => showStage(S.mode === 'words' ? '#stWords' : '#stField');
$('#answer').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

$('#keep').onclick = async () => {
  const R = S.result; if (!R) return;
  const m = { id: uid(), t: Date.now(), tz: -new Date().getTimezoneOffset(), mode: R.mode, text: R.text, poem: R.poem, v: +R.a.v.toFixed(3), e: +R.a.e.toFixed(3), chips: R.chips, colors: R.colors, word: R.word, prompt: R.prompt, answer: $('#answer').value.trim(), seed: R.seed, care: !!R.a.crisis, v1: 1 };
  try { await db.put(m); } catch (err) { toast('couldn\'t save — storage is full or blocked'); return; }
  S.moments.unshift(m);
  flyToArchive(R.colors); toast('kept · ' + fmtTime(m.t));
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

function renderArchive(){
  const n = S.moments.length;
  $('#count').textContent = n ? `${n} moment${n === 1 ? '' : 's'} · private, stays on your phone` : 'private, stays on your phone';
  if (S.tab !== 'archive' && !S.detail) return;
  ({ painting: renderPainting, moments: renderMoments, mural: renderMural, drift: renderDrift })[S.view]();
}
const EMPTY = (h, p) => `<div class="empty"><div class="e-door"></div><h4>${h}</h4><p>${p}</p></div>`;

let paintKey = '', spots = [];
async function renderPainting(){
  const el = $('#v-painting'), n = S.moments.length;
  if (!n) { el.innerHTML = EMPTY('your painting is blank', 'every moment you keep bleeds its colors in. over weeks it becomes a picture of who you were.'); paintKey = ''; return; }
  const key = S.moments.map(m => m.id).join(',');
  if (!el.querySelector('#painting')) {
    el.innerHTML = `<div class="painting-wrap"><canvas id="painting"></canvas></div>
      <div class="painting-cap"><p>oldest at the edges, newest glowing in the middle. tap a color to see its poem.</p><button id="savePaint" class="pill btn"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>save image</button></div>`;
    paintKey = '';
    $('#painting').addEventListener('click', onPaintTap); $('#savePaint').onclick = savePainting;
  }
  if (key === paintKey) return; paintKey = key;
  const cv = $('#painting'), w = cv.clientWidth || 358, dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(w * 1.25 * dpr);
  spots = layout(S.moments, cv.width, cv.height);
  spots = await paint(cv, S.moments, { progressive: true });
}
function onPaintTap(ev){
  const cv = ev.currentTarget, r = cv.getBoundingClientRect(), sx = cv.width / r.width;
  const x = (ev.clientX - r.left) * sx, y = (ev.clientY - r.top) * sx;
  let best = null, bd = 1e9;
  for (let i = spots.length - 1; i >= 0; i--) { const s = spots[i], d = Math.hypot(s.x - x, s.y - y) / s.s; if (d < bd) { bd = d; best = s; } }
  if (!best || bd > 1.6) return;
  const ring = document.createElement('span'); ring.className = 'tap-ring'; ring.style.left = (best.x / sx) + 'px'; ring.style.top = (best.y / sx) + 'px'; cv.parentNode.appendChild(ring); setTimeout(() => ring.remove(), 700);
  const list = S.moments; setTimeout(() => openDetail(list, list.indexOf(best.m)), 220);
}
async function savePainting(){
  try { await document.fonts.load('italic 40px "Instrument Serif"'); } catch {}
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
  const ms = S.moments, first = new Date(ms[ms.length - 1].t), last = new Date(ms[0].t);
  const f = d => d.toLocaleDateString([], { month: 'short', day: 'numeric' }).toLowerCase();
  await paint(c, ms, { caption: ['liminal', `${ms.length} moment${ms.length === 1 ? '' : 's'} · ${f(first)}${ms.length > 1 ? ' – ' + f(last) : ''}`] });
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'liminal-painting.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'my liminal painting' }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  download(blob, 'liminal-painting.png'); toast('saved');
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
function drawDetail(){
  const { list, idx } = S.detail, m = list[idx], d = new Date(m.t);
  aura.set(m.colors, 0.2 + m.v * 0.6, 0.2 + (1 - m.e) * 0.5, m.e);
  engine.setMood({ v: m.v, e: m.e, chips: m.chips || [] }, m.seed);
  $('#dIndex').textContent = list.length > 1 ? `${idx + 1} of ${list.length}` : '';
  $('#dBody').innerHTML = `<p class="d-date">${d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }).toLowerCase()} · ${fmtTime(m.t)}</p>
    <h2 class="d-word">${esc(m.word)}</h2>
    ${m.poem ? `<div class="d-poem">${m.poem.map(l => `<span>${esc(l)}</span>`).join('')}</div>` : ''}
    ${m.text ? `<p class="d-said">${esc(m.text)}</p>` : ''}
    ${m.care ? `<div class="care"><p>if it's still heavy, you can call or text <b>988</b> anytime.</p><div class="care-links"><a href="tel:988">call 988</a><a href="sms:988">text 988</a></div></div>` : ''}
    <p class="d-q">the question</p><p class="d-prompt">${esc(m.prompt)}</p>
    ${m.answer ? `<p class="d-answer">${esc(m.answer)}</p>` : '<p class="d-answer" style="color:var(--ink3)">left unanswered</p>'}
    ${m.chips && m.chips.length ? `<div class="d-chips">${m.chips.map(c => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
    <p class="d-coord">${Math.round(m.v * 100)}% light · ${Math.round(m.e * 100)}% restless</p>`;
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
  const m = S.detail.list[S.detail.idx]; await db.remove(m.id);
  S.moments = S.moments.filter(x => x.id !== m.id); S.detail.list = S.detail.list.filter(x => x.id !== m.id);
  toast('deleted'); if (!S.detail.list.length) closeDetail(); else { S.detail.idx = Math.min(S.detail.idx, S.detail.list.length - 1); drawDetail(); }
  renderArchive();
};
let sy = null; $('#detail').addEventListener('touchstart', e => sy = e.touches[0].clientY, { passive: true });
$('#detail').addEventListener('touchend', e => { if (sy != null && e.changedTouches[0].clientY - sy > 110 && $('#dBody').scrollTop <= 0) closeDetail(); sy = null; });

/* ---------- settings ---------- */
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
$('#settingsBtn').onclick = () => { $('#installTip').hidden = !!standalone; $('#settings').classList.add('open'); $('#settings').setAttribute('aria-hidden', 'false'); };
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
    await db.putMany(fresh); S.moments = await db.all(); paintKey = ''; renderArchive();
    toast(fresh.length ? `imported ${fresh.length} moment${fresh.length === 1 ? '' : 's'}` : 'nothing new to import');
  } catch { toast('that file isn\'t a liminal archive'); }
  e.target.value = '';
};
$('#sDelete').onclick = async e => {
  const b = e.currentTarget; if (!S.moments.length) return toast('nothing to delete');
  if (!b.dataset.armed) { b.dataset.armed = '1'; $('#sDeleteSub').textContent = `tap again to delete all ${S.moments.length}`; return; }
  await db.clear(); S.moments = []; paintKey = ''; renderArchive(); closeSettings(); toast('archive deleted');
};

/* ---------- misc ---------- */
let toastT; function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2000); }
function tick(){ $('#clock').textContent = fmtTime(Date.now()); } tick(); setInterval(tick, 15000);

async function boot(){
  try { S.moments = await db.all(); } catch { toast('storage is unavailable in this browser mode'); }
  renderArchive(); setLive({ v: .62, e: .3, colorWords: [] });
  if (!LS.get('seen', false)) { $('#intro').hidden = false; }
  else setTimeout(() => { if (!engine.ready && !S.muted) $('#soundPill').classList.add('on'); }, 1400);
  $('#enter').onclick = async () => { LS.set('seen', true); $('#intro').classList.add('out'); setTimeout(() => $('#intro').hidden = true, 900); await unlock(); };
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
window.__liminal = { db, S, renderArchive, engine };
