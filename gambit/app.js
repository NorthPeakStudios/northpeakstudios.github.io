// Gambit — app shell. 100% client-side: chess.js for rules, Stockfish (WASM, in a Web Worker) for analysis.
import { Chess, validateFen } from './vendor/chess.js?v=2';
import { Board, BADGE, THEMES } from './board.js?v=2';
import { Engine } from './engine.js?v=2';
import { toCp, winPct, fmtEval, analyseGame, annotatedPgn, LABEL, NAG } from './review.js?v=2';
import { autoFrame, readBoard, cropBlob } from './reader.js?v=2';

const $ = id => document.getElementById(id);
const DEF = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const SAMPLE = `[Event "Opera Game"]
[Site "Paris"]
[Date "1858.??.??"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7
14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;
const store = { get: (k, d) => { try { const v = localStorage.getItem('npChess:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('npChess:' + k, JSON.stringify(v)); } catch (e) {} } };

const S = {
  startFen: DEF, headers: {}, result: null,
  moves: [],          // {san, uci, from, to, color, num, fenBefore, fenAfter}
  fens: [DEF],        // fens[i] = position after i plies
  ply: 0,
  vari: null,         // {base, moves:[...], fens:[...], ply}
  sel: null,
  review: null,       // {depth, evals:[], best:[], bestSan:[], res, done}
  reviewing: false, revJob: null, revCancel: false,
  live: null, liveRes: null,
  flip: false, theme: store.get('theme', 'green'),
  editing: false, ed: null, edPiece: 'wp', edPrevFlip: false,
  overlay: null, eco: null,
  shot: null, crop: null,   // screenshot object URL, frame on it in natural px
};
window.npUpdate = { safe: () => !S.reviewing && !S.editing };

const engine = new Engine();
const board = new Board($('board'), { onTap: tap, onSwipe: d => go(d) });

// ---------- position helpers ----------
const curFen = () => S.vari ? S.vari.fens[S.vari.ply] : S.fens[S.ply];
const curLastMove = () => { if (S.vari) return S.vari.ply ? S.vari.moves[S.vari.ply - 1] : (S.vari.base ? S.moves[S.vari.base - 1] : null); return S.ply ? S.moves[S.ply - 1] : null; };
function mkMove(c, m, fenBefore) { return { san: m.san, uci: m.from + m.to + (m.promotion || ''), from: m.from, to: m.to, color: m.color, num: +fenBefore.split(' ')[5], fenBefore, fenAfter: c.fen() }; }
function checkSq(c) { if (!c.inCheck()) return null; const t = c.turn(); for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === t) return p.square; return null; }

// ---------- loading ----------
// chess.js validateFen checks the format, kings and pawns but not this one: the side that just moved can't be in check
function checkFen(fen) {
  const v = validateFen(fen); if (!v.ok) return v;
  const c = new Chess(fen), them = c.turn() === 'w' ? 'b' : 'w';
  for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === them && c.isAttacked(p.square, c.turn()))
    return { ok: false, error: (them === 'w' ? 'White' : 'Black') + ' is in check but it isn’t their move. Switch who’s to move.' };
  return v;
}
function looksFen(t) { const f = t.trim().split(/\s+/); return f.length >= 1 && /^([pnbrqkPNBRQK1-8]{1,8}\/){7}[pnbrqkPNBRQK1-8]{1,8}$/.test(f[0]); }
function normFen(t) {
  const f = t.trim().split(/\s+/);
  const d = ['w', '-', '-', '0', '1'];
  for (let i = 1; i < 6; i++) if (!f[i]) f[i] = d[i - 1];
  return f.slice(0, 6).join(' ');
}
function loadFen(text, opts = {}) {
  const fen = normFen(text);
  const v = checkFen(fen);
  if (!v.ok) throw new Error('That FEN isn’t a legal position: ' + v.error.replace(/^Invalid FEN: /, ''));
  const c = new Chess(fen);
  setGame({ startFen: c.fen(), moves: [], headers: {}, result: null });
  if (!opts.quiet) loadedMsg('Position loaded');
}
function loadPgn(text, opts = {}) {
  const c = new Chess();
  try { c.loadPgn(text.trim(), { strict: false }); } catch (e) { throw new Error('Couldn’t read that as a FEN or PGN. ' + String(e.message || e).slice(0, 160)); }
  const hist = c.history({ verbose: true });
  const headers = c.getHeaders ? c.getHeaders() : (c.header ? c.header() : {});
  const start = hist.length ? hist[0].before : c.fen();
  const g = new Chess(start), moves = [];
  for (const m of hist) { const fb = g.fen(); const mm = g.move({ from: m.from, to: m.to, promotion: m.promotion }); moves.push(mkMove(g, mm, fb)); }
  const res = headers.Result && headers.Result !== '*' ? headers.Result : null;
  setGame({ startFen: start, moves, headers, result: res });
  if (!opts.quiet) loadedMsg(moves.length ? `Game loaded · ${moves.length} plies` : 'Position loaded');
}
function loadText(text) {
  const t = String(text || '').trim();
  if (!t) throw new Error('Paste a FEN or a PGN first.');
  if (looksFen(t)) return loadFen(t);
  return loadPgn(t);
}
function setGame({ startFen, moves, headers, result }) {
  cancelReview(); closeEditor(false);
  S.startFen = startFen; S.moves = moves; S.headers = headers || {}; S.result = result;
  S.fens = [startFen, ...moves.map(m => m.fenAfter)];
  S.ply = 0; S.vari = null; S.sel = null; S.review = null;
  engine.newGame().catch(() => {});
  renderInfo(); renderMoves(); renderReviewIdle(); update();
}
function loadedMsg(msg) { $('loadSum').textContent = msg; $('loadErr').hidden = true; $('loadBox').open = false; toast(msg); setTimeout(() => $('board').scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }
function showErr(e) { const el = $('loadErr'); el.textContent = String(e.message || e); el.hidden = false; $('loadBox').open = true; }

$('loadBtn').onclick = () => { try { loadText($('paste').value); } catch (e) { showErr(e); } };
$('paste').addEventListener('input', () => { const t = $('paste').value.trim(); $('detect').textContent = !t ? 'Detects FEN or PGN on its own. Files: .pgn / .txt / .fen, or a screenshot of a board.' : looksFen(t) ? 'Looks like a FEN (a single position).' : 'Looks like a PGN (a game) — tap Load.'; });
$('paste').addEventListener('paste', e => { const it = [...(e.clipboardData && e.clipboardData.items || [])].find(i => i.type.startsWith('image/')); if (it) { e.preventDefault(); showImage(it.getAsFile()); } });
$('sampleBtn').onclick = () => { $('paste').value = SAMPLE; try { loadPgn(SAMPLE); } catch (e) { showErr(e); } };
$('startBtn').onclick = () => loadFen(DEF);
$('setupBtn').onclick = () => openEditor();
$('imgFile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) handleFile(f); });
$('file').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) handleFile(f); });
const drop = $('drop');
['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleFile(f); else { const t = e.dataTransfer.getData('text/plain'); if (t) { $('paste').value = t; try { loadText(t); } catch (er) { showErr(er); } } } });
function handleFile(f) {
  if (f.type.startsWith('image/')) return showImage(f);
  if (f.size > 2e6) return showErr(new Error('That file is too big for a PGN (over 2 MB).'));
  const r = new FileReader();
  r.onload = () => { const t = String(r.result); $('paste').value = t.length > 20000 ? t.slice(0, 20000) : t; try { loadText(firstGame(t)); } catch (e) { showErr(e); } };
  r.onerror = () => showErr(new Error('Couldn’t read that file.'));
  r.readAsText(f);
}
function firstGame(t) { // a multi-game PGN file loads its first game
  const parts = t.replace(/\r/g, '').split(/\n\s*\n(?=\[)/);
  return parts.length > 1 && /^\s*\[/.test(t) ? parts[0] : t;
}

// ---------- screenshot reference (no recognition: we say so in the UI) ----------
function showImage(file) {
  dropShot();
  S.shot = URL.createObjectURL(file);
  const im = $('refImg'); $('cropBox').hidden = true; $('readMsg').hidden = true; $('blackBottom').checked = false;
  im.onload = async () => {
    try { if (im.decode) await im.decode(); } catch (e) { /* some engines reject decode() on an already-decoded image */ }
    if (im.src !== S.shot) return; // a newer image replaced this one
    let fr = null; try { fr = autoFrame(im); } catch (e) { fr = null; }
    if (!fr || fr.score <= 1.2) { await new Promise(r => setTimeout(r, 250)); try { fr = autoFrame(im); } catch (e) { fr = null; } } // WebKit can hand over a not-yet-painted bitmap
    const nw = im.naturalWidth, nh = im.naturalHeight, m = Math.min(nw, nh);
    S.crop = fr && fr.score > 1.2 ? fr : { x: (nw - m * 0.9) / 2, y: (nh - m * 0.9) / 2, w: m * 0.9, h: m * 0.9 };
    drawCrop(); $('cropBox').hidden = false;
    if (fr && fr.score > 1.2) readShot(); else readMsg('Couldn’t find the board on its own. Drag the frame onto it, then tap Read board.', true);
  };
  im.onerror = () => { readMsg('That image couldn’t be opened. Try a PNG or JPEG screenshot.', true); };
  im.src = S.shot; $('imgCard').hidden = false; $('loadErr').hidden = true;
  $('ovl').checked = false; $('ovlOp').hidden = true;
  openEditor(true);
  $('imgCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function dropShot() {
  if (S.overlay) URL.revokeObjectURL(S.overlay); if (S.shot) URL.revokeObjectURL(S.shot);
  S.overlay = S.shot = S.crop = null;
}
function readMsg(t, warn) { const el = $('readMsg'); el.textContent = t; el.className = 'small ' + (warn ? 'warnmsg' : 'muted'); el.hidden = false; }
function drawCrop() {
  const im = $('refImg'), c = S.crop, box = $('cropBox'); if (!c || !im.naturalWidth) return;
  const kx = im.offsetWidth / im.naturalWidth, ky = im.offsetHeight / im.naturalHeight; // px, so it tracks the image box whatever its size
  box.style.left = im.offsetLeft + c.x * kx + 'px'; box.style.top = im.offsetTop + c.y * ky + 'px';
  box.style.width = c.w * kx + 'px'; box.style.height = c.h * ky + 'px';
}
window.addEventListener('resize', () => drawCrop());
let reading = false;
async function readShot() {
  const im = $('refImg'); if (!S.crop || !im.naturalWidth || reading) return;
  reading = true; $('readBtn').disabled = true; readMsg('Reading the board…');
  try {
    await new Promise(r => setTimeout(r, 30)); // let the message paint
    const res = await readBoard(im, S.crop, { blackBottom: $('blackBottom').checked });
    S.crop = res.rect; drawCrop(); window.__npChessRead = { unsure: res.unsure.slice(), snapped: res.snapped, flipped: res.flipped };
    if (!S.editing) openEditor(true);
    S.ed.grid = res.grid; S.ed.turn = 'w'; S.ed.unsure = new Set(res.unsure);
    S.flip = res.flipped; if (res.autoFlipped) $('blackBottom').checked = true;
    const blob = await cropBlob(im, res.rect);
    if (blob) { if (S.overlay) URL.revokeObjectURL(S.overlay); S.overlay = URL.createObjectURL(blob); }
    const n = res.unsure.length, pcs = Object.keys(res.grid).length;
    readMsg(`Read ${pcs} piece${pcs === 1 ? '' : 's'}${n ? `; ${n} square${n === 1 ? '' : 's'} marked ? to check` : ''}${res.autoFlipped ? '; black looked to be at the bottom, so the board is turned' : ''}. Fix anything wrong on the board below, set who’s to move, then tap Analyze this.`, n > 0);
    edSync();
  } catch (e) { readMsg('Couldn’t read this one: ' + String(e && e.message || e) + '. Set the pieces by hand below.', true); }
  finally { reading = false; $('readBtn').disabled = false; }
}
$('readBtn').onclick = () => readShot();
$('blackBottom').onchange = () => { if (S.crop) readShot(); };
// frame: drag inside to move, drag a corner to resize (pointer events cover mouse + touch)
(function cropDrag() {
  const box = $('cropBox'); let st = null;
  box.addEventListener('pointerdown', e => {
    const im = $('refImg'), r = im.getBoundingClientRect(); if (!S.crop || !r.width) return;
    e.preventDefault(); box.setPointerCapture(e.pointerId);
    st = { h: e.target.dataset.h || 'move', x: e.clientX, y: e.clientY, c: { ...S.crop }, k: im.naturalWidth / r.width, nw: im.naturalWidth, nh: im.naturalHeight };
  });
  box.addEventListener('pointermove', e => {
    if (!st) return; const dx = (e.clientX - st.x) * st.k, dy = (e.clientY - st.y) * st.k, c = { ...st.c }, min = 40;
    if (st.h === 'move') { c.x = Math.min(st.nw - c.w, Math.max(0, c.x + dx)); c.y = Math.min(st.nh - c.h, Math.max(0, c.y + dy)); }
    else {
      let x0 = c.x, y0 = c.y, x1 = c.x + c.w, y1 = c.y + c.h;
      if (st.h.includes('w')) x0 = Math.min(x1 - min, Math.max(0, x0 + dx)); else x1 = Math.max(x0 + min, Math.min(st.nw, x1 + dx));
      if (st.h.includes('n')) y0 = Math.min(y1 - min, Math.max(0, y0 + dy)); else y1 = Math.max(y0 + min, Math.min(st.nh, y1 + dy));
      Object.assign(c, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
    S.crop = c; drawCrop();
  });
  const end = () => { st = null; };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
})();
$('imgClose').onclick = () => { dropShot(); $('imgCard').hidden = true; $('refImg').removeAttribute('src'); if (S.ed) S.ed.unsure = null; update(); };
$('ovl').onchange = () => { $('ovlOp').hidden = !$('ovl').checked; update(); };
$('ovlOp').oninput = () => update();

// ---------- board editor ----------
const PAL = ['wk', 'wq', 'wr', 'wb', 'wn', 'wp', 'bk', 'bq', 'br', 'bb', 'bn', 'bp'];
function edGrid(fen) { const g = {}; fen.split(' ')[0].split('/').forEach((row, ri) => { let fi = 0; for (const ch of row) { if (/\d/.test(ch)) fi += +ch; else { g['abcdefgh'[fi] + (8 - ri)] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toLowerCase(); fi++; } } }); return g; }
function edFen() {
  const g = S.ed.grid; let rows = [];
  for (let r = 8; r >= 1; r--) { let s = '', e = 0; for (const f of 'abcdefgh') { const p = g[f + r]; if (!p) e++; else { if (e) s += e, e = 0; s += p[0] === 'w' ? p[1].toUpperCase() : p[1]; } } if (e) s += e; rows.push(s); }
  let cs = '';
  if (g.e1 === 'wk') { if (g.h1 === 'wr') cs += 'K'; if (g.a1 === 'wr') cs += 'Q'; }
  if (g.e8 === 'bk') { if (g.h8 === 'br') cs += 'k'; if (g.a8 === 'br') cs += 'q'; }
  return `${rows.join('/')} ${S.ed.turn} ${cs || '-'} - 0 1`;
}
function openEditor(fromImage) {
  S.editing = true; cancelLive();
  S.ed = { grid: edGrid(fromImage ? DEF : curFen()), turn: fromImage ? 'w' : curFen().split(' ')[1], unsure: null };
  $('editor').hidden = false; $('gameInfo').hidden = true; $('ctrls').hidden = true; $('engCard').hidden = true; $('revCard').hidden = true; $('explore').hidden = true;
  const pal = $('palette'); pal.textContent = '';
  for (const p of [...PAL.slice(0, 6), 'x', ...PAL.slice(6)]) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.p = p; b.className = 'pal' + (p === S.edPiece ? ' on' : '');
    b.setAttribute('aria-label', p === 'x' ? 'Eraser' : (p[0] === 'w' ? 'White ' : 'Black ') + { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' }[p[1]]);
    b.innerHTML = p === 'x' ? '<svg viewBox="0 0 45 45"><path d="M12 12l21 21M33 12L12 33" stroke="#f85149" stroke-width="4" stroke-linecap="round"/></svg>' : `<svg viewBox="0 0 45 45"><use href="#cp-${p}"/></svg>`;
    b.onclick = () => { S.edPiece = p; pal.querySelectorAll('.pal').forEach(x => x.classList.toggle('on', x.dataset.p === p)); };
    pal.appendChild(b);
  }
  edSync(); $('loadBox').open = false;
}
function edSync() {
  const f = edFen(); $('edFen').value = f;
  [...$('edTurn').children].forEach(b => b.classList.toggle('on', b.dataset.t === S.ed.turn));
  const v = checkFen(f); $('edErr').hidden = v.ok; if (!v.ok) $('edErr').textContent = v.error.replace(/^Invalid FEN: /, '');
  $('edDone').disabled = !v.ok;
  $('edOk').hidden = !(S.ed.unsure && S.ed.unsure.size);
  update();
}
function closeEditor(apply) {
  if (!S.editing) return;
  S.editing = false; $('editor').hidden = true; renderInfo(); $('ctrls').hidden = false; $('engCard').hidden = false; $('revCard').hidden = false;
  if (apply) { const f = edFen(); loadFen(f); } else update();
}
$('edTurn').onclick = e => { const t = e.target.closest('button'); if (t) { S.ed.turn = t.dataset.t; edSync(); } };
$('edStart').onclick = () => { S.ed.grid = edGrid(DEF); S.ed.turn = 'w'; S.ed.unsure = null; edSync(); };
$('edOk').onclick = () => { S.ed.unsure = null; edSync(); };
$('edClear').onclick = () => { S.ed.grid = {}; S.ed.unsure = null; edSync(); };
$('edFlip').onclick = () => { S.flip = !S.flip; update(); };
$('edCancel').onclick = () => closeEditor(false);
$('edDone').onclick = () => { try { closeEditor(true); } catch (e) { $('edErr').textContent = e.message; $('edErr').hidden = false; } };
$('edFen').addEventListener('change', () => { const f = normFen($('edFen').value); if (looksFen(f)) { S.ed.grid = edGrid(f); S.ed.turn = f.split(' ')[1] === 'b' ? 'b' : 'w'; } edSync(); });

// ---------- taps & moves ----------
function tap(sq) {
  if (S.editing) { const g = S.ed.grid; if (S.ed.unsure) S.ed.unsure.delete(sq); if (S.edPiece === 'x' || g[sq] === S.edPiece) delete g[sq]; else g[sq] = S.edPiece; edSync(); return; }
  if (S.reviewing) return;
  const c = new Chess(curFen());
  if (S.sel) {
    const mv = c.moves({ square: S.sel, verbose: true }).find(m => m.to === sq);
    if (mv) { playMove({ from: S.sel, to: sq, promotion: mv.promotion ? 'q' : undefined }); return; }
  }
  const p = c.get(sq);
  S.sel = p && p.color === c.turn() && S.sel !== sq ? sq : null;
  update();
}
function playMove(m) {
  const fb = curFen(); const c = new Chess(fb); let mm;
  try { mm = c.move(m); } catch (e) { return; }
  S.sel = null;
  const mv = mkMove(c, mm, fb);
  if (S.vari) { S.vari.moves.length = S.vari.ply; S.vari.fens.length = S.vari.ply + 1; S.vari.moves.push(mv); S.vari.fens.push(c.fen()); S.vari.ply++; }
  else if (S.ply < S.moves.length) {
    if (S.moves[S.ply].uci === mv.uci) S.ply++;
    else S.vari = { base: S.ply, moves: [mv], fens: [fb, c.fen()], ply: 1 };
  } else { // extend the main line
    S.moves.push(mv); S.fens.push(c.fen()); S.ply++; S.result = null;
    if (S.review) { S.review = null; renderReviewIdle(); }
    renderMoves();
  }
  update();
}
function go(d) {
  if (S.editing) return;
  S.sel = null;
  if (S.vari) { const np = S.vari.ply + d; if (np < 0) return; if (np === 0 && d < 0) { S.ply = S.vari.base; S.vari = null; } else if (np <= S.vari.moves.length) S.vari.ply = np; update(); return; }
  S.ply = Math.max(0, Math.min(S.moves.length, S.ply + d)); update();
}
function goto(p) { S.vari = null; S.sel = null; S.ply = Math.max(0, Math.min(S.moves.length, p)); update(); }
$('nFirst').onclick = () => goto(0); $('nLast').onclick = () => goto(S.moves.length);
$('nPrev').onclick = () => go(-1); $('nNext').onclick = () => go(1);
$('nFlip').onclick = () => { S.flip = !S.flip; update(); };
$('backGame').onclick = () => { S.ply = S.vari ? S.vari.base : S.ply; S.vari = null; update(); };
document.addEventListener('keydown', e => {
  if (e.target.closest('input,textarea,select')) return;
  if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); } else if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
  else if (e.key === 'Home') goto(0); else if (e.key === 'End') goto(S.moves.length); else if (e.key === 'f') { S.flip = !S.flip; update(); }
});

// ---------- rendering ----------
function update() {
  const fen = S.editing ? edFen() : curFen();
  const c = new Chess(validateFen(fen).ok ? fen : DEF);
  const lm = S.editing ? null : curLastMove();
  const targets = S.sel ? c.moves({ square: S.sel, verbose: true }).map(m => ({ sq: m.to, capture: !!m.captured })) : [];
  let badge = null;
  if (!S.vari && S.review && S.review.res && S.ply > 0) { const r = S.review.res.moves[S.ply - 1]; if (r) badge = { sq: S.moves[S.ply - 1].to, cls: r.cls }; }
  board.set({ fen, flip: S.flip, last: lm ? [lm.from, lm.to] : null, sel: S.sel, targets, check: S.editing ? null : checkSq(c), badge, theme: S.theme,
    arrows: S.editing ? [] : arrowsFor(fen), overlay: S.overlay && $('ovl').checked && S.editing ? S.overlay : null, overlayOpacity: (+$('ovlOp').value || 45) / 100,
    marks: S.editing && S.ed && S.ed.unsure ? [...S.ed.unsure] : [] });
  // nav label
  const total = S.moves.length;
  if (S.vari) { const m = S.vari.moves[S.vari.ply - 1]; $('plyLbl').textContent = m ? `${m.num}${m.color === 'w' ? '.' : '…'} ${m.san}` : 'Side line'; }
  else { const m = S.moves[S.ply - 1]; $('plyLbl').textContent = m ? `${m.num}${m.color === 'w' ? '.' : '…'} ${m.san}  (${S.ply}/${total})` : (total ? `Start (0/${total})` : 'Position'); }
  $('explore').hidden = !S.vari || S.editing;
  $('nPrev').disabled = !S.vari && S.ply === 0; $('nFirst').disabled = !S.vari && S.ply === 0;
  $('nNext').disabled = S.vari ? S.vari.ply >= S.vari.moves.length : S.ply >= total; $('nLast').disabled = !S.vari && S.ply >= total;
  document.querySelectorAll('#moves .mv').forEach(el => el.classList.toggle('cur', !S.vari && +el.dataset.ply === S.ply));
  const curEl = document.querySelector('#moves .mv.cur'); if (curEl && !S.reviewing) { const list = $('moves'); const t = curEl.offsetTop - list.offsetTop; if (t < list.scrollTop || t > list.scrollTop + list.clientHeight - 30) list.scrollTop = t - 40; }
  markGraph();
  renderOpening();
  if (!S.editing) analyseCurrent(fen, c);
}
function arrowsFor(fen) {
  const a = [];
  let best = null;
  if (S.liveRes && S.liveRes.fen === fen && S.liveRes.lines[0]) best = S.liveRes.lines[0].pv[0];
  else if (!S.vari && S.review && S.review.best[S.ply] !== undefined && S.review.evals[S.ply]) best = S.review.best[S.ply];
  if (best) a.push({ from: best.slice(0, 2), to: best.slice(2, 4), color: 'rgba(94,234,212,.9)' });
  if (S.liveRes && S.liveRes.fen === fen && S.liveRes.lines[1] && S.liveRes.lines[1].pv[0] !== best) { const b = S.liveRes.lines[1].pv[0]; a.unshift({ from: b.slice(0, 2), to: b.slice(2, 4), color: 'rgba(167,139,250,.7)', w: 11, op: 0.75 }); }
  return a;
}
function setEval(s, depth) {
  const cp = toCp(s), w = s ? (s.mate != null ? (cp > 0 ? 100 : cp < 0 ? 0 : 50) : winPct(cp)) : 50;
  $('ebW').style.height = w.toFixed(1) + '%';
  const txt = s ? fmtEval(s).replace(/^\+/, '') : '…';
  const n = $('ebN'); n.textContent = s && s.mate == null ? (Math.abs(s.cp) >= 1000 ? (s.cp / 100).toFixed(0) : Math.abs(s.cp / 100).toFixed(1)) : txt.replace('-', '');
  const whiteAhead = w >= 50; n.classList.toggle('dark', whiteAhead); n.classList.toggle('top', !whiteAhead);
  $('evalBar').classList.toggle('flip', S.flip);
  $('evalBig').textContent = s && s.mate === 0 ? (s.win === 'w' ? '1–0' : s.win === 'b' ? '0–1' : '½–½') : s ? fmtEval(s) : '…';
  $('evalBig').className = 'evalbig ' + (cp > 30 ? 'w' : cp < -30 ? 'b' : '');
  $('depth').textContent = depth ? 'depth ' + depth : 'depth –';
}
function sanLine(fen, pv, max = 10) {
  const c = new Chess(fen), out = [];
  for (const u of pv.slice(0, max)) { let m; try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch (e) { break; } out.push((m.color === 'w' ? m.before.split(' ')[5] + '. ' : (out.length ? '' : m.before.split(' ')[5] + '… ')) + m.san); }
  return out;
}
function renderLines(fen, lines) {
  const box = $('lines'); box.textContent = '';
  if (!lines.length) { const p = document.createElement('p'); p.className = 'muted small'; p.textContent = 'Thinking…'; box.appendChild(p); return; }
  lines.slice(0, 3).forEach((l, i) => {
    const row = document.createElement('button'); row.type = 'button'; row.className = 'line';
    const ev = document.createElement('span'); ev.className = 'lev ' + (toCp(l) >= 0 ? 'w' : 'b'); ev.textContent = fmtEval(l);
    const mv = document.createElement('span'); mv.className = 'lmv'; mv.textContent = sanLine(fen, l.pv).join(' ');
    row.append(ev, mv); row.title = 'Play this line’s first move';
    row.onclick = () => { if (!S.reviewing) playMove({ from: l.pv[0].slice(0, 2), to: l.pv[0].slice(2, 4), promotion: l.pv[0][4] }); };
    box.appendChild(row);
  });
}
function gameOverText(c) {
  if (c.isCheckmate()) return (c.turn() === 'w' ? 'Black' : 'White') + ' wins by checkmate';
  if (c.isStalemate()) return 'Draw by stalemate'; if (c.isInsufficientMaterial()) return 'Draw: insufficient material';
  if (c.isThreefoldRepetition()) return 'Draw by repetition'; if (c.isDraw()) return 'Draw (50-move rule)'; return null;
}

// ---------- live analysis ----------
let raf = 0, pending = null;
function cancelLive() { if (S.live) { S.live.cancel(); S.live = null; } }
function analyseCurrent(fen, c) {
  if (S.liveRes && S.liveRes.fen === fen && (S.liveRes.running || S.liveRes.done)) { showLive(); return; }
  cancelLive();
  const over = gameOverText(c);
  if (over) { setEval(c.isCheckmate() ? { mate: 0, win: c.turn() === 'w' ? 'b' : 'w' } : { cp: 0 }, 0); const box = $('lines'); box.textContent = ''; const p = document.createElement('p'); p.className = 'over'; p.textContent = over; box.appendChild(p); S.liveRes = { fen, lines: [], done: true }; board.set({ arrows: [] }); return; }
  // show review numbers straight away while the live search warms up
  if (!S.vari && S.review && S.review.evals[S.ply]) setEval(S.review.evals[S.ply], S.review.depth); else setEval(null, 0);
  if (!$('engOn').checked || S.reviewing) { if (!$('engOn').checked) { const box = $('lines'); box.textContent = ''; const p = document.createElement('p'); p.className = 'muted small'; p.textContent = 'Engine off.'; box.appendChild(p); } return; }
  const res = S.liveRes = { fen, lines: [], depth: 0, running: true };
  renderLines(fen, []);
  S.live = engine.analyse(fen, { depth: +$('liveDepth').value, multipv: 3, onInfo: info => { if (S.liveRes !== res) return; res.lines = info.lines; res.depth = info.depth; res.nps = info.nps; pending = res; if (!raf) raf = requestAnimationFrame(flushLive); } });
  S.live.promise.then(r => { if (S.liveRes === res && r) { res.running = false; res.done = !r.cancelled; if (r.lines.length) res.lines = r.lines; pending = res; if (!raf) raf = requestAnimationFrame(flushLive); } }).catch(engineFailed);
}
function flushLive() { raf = 0; if (pending && pending === S.liveRes) showLive(); pending = null; }
function showLive() {
  const r = S.liveRes; if (!r || r.fen !== curFen() || S.editing) return;
  if (r.lines.length) setEval(r.lines[0], r.depth);
  renderLines(r.fen, r.lines);
  $('nps').textContent = r.nps ? Math.round(r.nps / 1000) + ' kn/s' : '';
  board.set({ arrows: arrowsFor(r.fen) });
}
$('engOn').onchange = () => { S.liveRes = null; cancelLive(); update(); };
$('liveDepth').onchange = () => { S.liveRes = null; update(); };
function engineFailed(e) { $('engState').textContent = 'engine error'; $('engState').className = 'pill bad'; const box = $('lines'); box.textContent = ''; const p = document.createElement('p'); p.className = 'err'; p.textContent = 'Stockfish couldn’t start here: ' + String(e && e.message || e); box.appendChild(p); }

// ---------- game info / opening ----------
function renderInfo() {
  const h = S.headers, has = h.White || h.Black;
  $('gameInfo').hidden = !has && !S.moves.length;
  const pl = $('players'); pl.textContent = '';
  if (has) {
    const mk = (side, name, elo) => { const s = document.createElement('span'); s.className = 'pl ' + side; s.textContent = (name || '?') + (elo ? ` (${elo})` : ''); return s; };
    const vs = document.createElement('span'); vs.className = 'vs muted'; vs.textContent = S.result ? S.result : 'vs';
    pl.append(mk('w', h.White, h.WhiteElo), vs, mk('b', h.Black, h.BlackElo));
  }
}
async function ecoTable() { if (S.eco) return S.eco; try { const r = await fetch('eco.json?v=2'); S.eco = await r.json(); } catch (e) { S.eco = {}; } return S.eco; }
let ecoReq = false;
function renderOpening() {
  const el = $('opening');
  if (!S.eco) { if (!ecoReq) { ecoReq = true; ecoTable().then(() => renderOpening()); } return; }
  const fens = S.vari ? [...S.fens.slice(0, S.vari.base + 1), ...S.vari.fens.slice(1, S.vari.ply + 1)] : S.fens.slice(0, S.ply + 1);
  let name = '';
  for (let i = Math.min(fens.length - 1, 40); i >= 0; i--) { const k = fens[i].split(' ').slice(0, 3).join(' '); if (S.eco[k]) { name = S.eco[k]; break; } }
  if (!name && S.moves.length && !S.vari) { for (let i = Math.min(S.fens.length - 1, 30); i >= 0; i--) { const k = S.fens[i].split(' ').slice(0, 3).join(' '); if (S.eco[k]) { name = S.eco[k]; break; } } }
  const [code, nm] = name ? name.split('|') : ['', ''];
  el.textContent = name ? `${code} · ${nm}` : '';
  $('gameInfo').hidden = S.editing || !(S.headers.White || S.headers.Black) && !name;
}

// ---------- move list ----------
function renderMoves() {
  const ol = $('moves'); ol.textContent = '';
  const res = S.review && S.review.res;
  let li = null;
  S.moves.forEach((m, i) => {
    if (m.color === 'w' || !li) { li = document.createElement('li'); const n = document.createElement('span'); n.className = 'mn'; n.textContent = m.num + (m.color === 'w' ? '.' : '…'); li.appendChild(n); if (m.color === 'b') { const e = document.createElement('span'); e.className = 'mv empty'; li.appendChild(e); } ol.appendChild(li); }
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mv'; b.dataset.ply = i + 1;
    const san = document.createElement('span'); san.textContent = m.san; b.appendChild(san);
    const r = res && res.moves[i];
    if (r) { const bd = document.createElement('span'); bd.className = 'bdg ' + r.cls; bd.textContent = BADGE[r.cls][1]; bd.title = LABEL[r.cls] + (r.loss ? ` (−${r.loss} cp)` : ''); b.appendChild(bd); b.classList.add('c-' + r.cls); }
    b.onclick = () => goto(i + 1);
    li.appendChild(b);
  });
  $('revBtn').disabled = !S.moves.length || S.reviewing;
  $('revHint').hidden = !!S.moves.length && !!S.review;
  if (S.moves.length && !S.review) $('revHint').textContent = `${S.moves.length} plies ready. Review analyses every position at the chosen depth; lower is faster on a phone.`;
  else if (!S.moves.length) $('revHint').textContent = 'Load a PGN (or play moves on the board) to review a game move by move.';
}
function renderReviewIdle() { $('accRow').hidden = true; $('graph').hidden = true; $('summary').hidden = true; $('prog').hidden = true; renderMoves(); }

// ---------- review ----------
$('revBtn').onclick = runReview;
$('revCancel').onclick = () => cancelReview(true);
function cancelReview(user) {
  if (!S.reviewing) return;
  S.revCancel = true; if (S.revJob) S.revJob.cancel();
  if (user) toast('Review cancelled');
}
async function runReview() {
  if (S.reviewing || !S.moves.length) return;
  cancelLive(); S.liveRes = null; S.vari = null;
  const depth = +$('revDepth').value, n = S.moves.length, fens = S.fens.slice();
  const R = S.review = { depth, evals: new Array(n + 1).fill(null), best: new Array(n + 1).fill(null), bestSan: [], res: null, done: false };
  S.reviewing = true; S.revCancel = false;
  $('revBtn').disabled = true; $('revCancel').hidden = false; $('prog').hidden = false; $('accRow').hidden = true; $('summary').hidden = true; $('graph').hidden = false;
  const t0 = performance.now();
  try {
    await engine.start();
    $('progT').textContent = 'Starting…';
    for (let i = 0; i <= n; i++) {
      if (S.revCancel) break;
      const c = new Chess(fens[i]);
      if (c.isCheckmate()) R.evals[i] = { mate: 0, win: c.turn() === 'w' ? 'b' : 'w' };
      else if (c.isDraw() || c.isStalemate()) R.evals[i] = { cp: 0 };
      else {
        S.revJob = engine.analyse(fens[i], { depth, multipv: 1, maxMs: 8000 });
        const r = await S.revJob.promise;
        if (!r || r.cancelled || S.revCancel) break;
        R.evals[i] = r.lines[0] ? { cp: r.lines[0].cp, mate: r.lines[0].mate } : { cp: 0 };
        if (R.evals[i].mate == null) delete R.evals[i].mate; else delete R.evals[i].cp;
        R.best[i] = r.bestmove;
        if (r.bestmove) { const s = sanLine(fens[i], [r.bestmove], 1)[0]; R.bestSan[i] = s ? s.replace(/^\d+(\.|…)\s*/, '') : r.bestmove; }
      }
      const pct = Math.round((i + 1) / (n + 1) * 100);
      $('progB').style.width = pct + '%';
      const el = (performance.now() - t0) / 1000;
      $('progT').textContent = `Analysing ${i + 1}/${n + 1} · ${pct}%` + (i > 2 ? ` · ~${Math.max(1, Math.round(el / (i + 1) * (n - i)))}s left` : '');
      drawGraph(R);
    }
  } catch (e) { engineFailed(e); }
  S.reviewing = false; S.revJob = null;
  $('revCancel').hidden = true;
  const complete = R.evals.every(e => e);
  if (!complete) { S.review = null; $('prog').hidden = true; $('graph').hidden = true; renderMoves(); update(); return; }
  R.res = analyseGame(R.evals, R.best, S.moves);
  R.done = true; R.secs = (performance.now() - t0) / 1000;
  S.moves.forEach((m, i) => { m.review = R.res.moves[i]; });
  $('progT').textContent = `Done · ${n} plies at depth ${depth} in ${R.secs.toFixed(1)}s`;
  window.__npChessReview = { secs: R.secs, plies: n, depth, acc: R.res.acc };
  renderAcc(R); drawGraph(R); renderMoves(); update();
}
function renderAcc(R) {
  const a = R.res.acc, row = $('accRow'); row.textContent = ''; row.hidden = false;
  for (const [c, nm] of [['w', S.headers.White || 'White'], ['b', S.headers.Black || 'Black']]) {
    const d = document.createElement('div'); d.className = 'acc ' + c;
    const v = document.createElement('div'); v.className = 'accv'; v.textContent = a[c] == null ? '–' : a[c].toFixed(1) + '%';
    const l = document.createElement('div'); l.className = 'accl'; l.textContent = nm;
    d.append(v, l); row.appendChild(d);
  }
  const sm = $('summary'); sm.textContent = ''; sm.hidden = false;
  const tbl = document.createElement('table');
  const hdr = document.createElement('tr'); hdr.innerHTML = '<th></th><th>White</th><th>Black</th>'; tbl.appendChild(hdr);
  for (const k of ['best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder']) {
    const tr = document.createElement('tr');
    const th = document.createElement('th'); const bd = document.createElement('span'); bd.className = 'bdg ' + k; bd.textContent = BADGE[k][1]; th.append(bd, document.createTextNode(' ' + LABEL[k]));
    const w = document.createElement('td'); w.textContent = R.res.counts.w[k] || 0; const b = document.createElement('td'); b.textContent = R.res.counts.b[k] || 0;
    tr.append(th, w, b); tbl.appendChild(tr);
  }
  sm.appendChild(tbl);
}
const GW = 600, GH = 140;
function drawGraph(R) {
  const n = S.moves.length, g = $('graph'); g.hidden = false;
  const X = i => n ? i / n * GW : 0, Y = e => GH - winPct(toCp(e)) / 100 * GH;
  let pts = [], last = GH / 2;
  for (let i = 0; i <= n; i++) { const e = R.evals[i]; if (!e) break; const y = e.mate != null ? (toCp(e) > 0 ? 0 : toCp(e) < 0 ? GH : GH / 2) : Y(e); pts.push([X(i), y]); last = y; }
  let h = `<svg viewBox="0 0 ${GW} ${GH}" preserveAspectRatio="none" class="gsvg" role="img" aria-label="Evaluation graph, tap to jump to a move"><rect width="${GW}" height="${GH}" fill="#2b2f36"/>`;
  if (pts.length) h += `<path d="M0 ${GH} L${pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L')} L${pts[pts.length - 1][0].toFixed(1)} ${GH} Z" fill="#e8e8e8"/>`;
  h += `<line x1="0" y1="${GH / 2}" x2="${GW}" y2="${GH / 2}" stroke="#888" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>`;
  if (R.res) R.res.moves.forEach((m, i) => { if (['inaccuracy', 'mistake', 'blunder'].includes(m.cls) && pts[i + 1]) h += `<circle cx="${pts[i + 1][0].toFixed(1)}" cy="${pts[i + 1][1].toFixed(1)}" r="4.5" fill="${BADGE[m.cls][0]}" stroke="#111" stroke-width="1" vector-effect="non-scaling-stroke"/>`; });
  h += `<line id="gCur" x1="0" y1="0" x2="0" y2="${GH}" stroke="#5eead4" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  g.innerHTML = h;
  markGraph();
}
function markGraph() { const l = document.getElementById('gCur'); if (!l) return; const n = S.moves.length || 1; const x = (S.vari ? S.vari.base : S.ply) / n * GW; l.setAttribute('x1', x); l.setAttribute('x2', x); }
$('graph').addEventListener('pointerdown', e => { if (!S.moves.length) return; const r = $('graph').getBoundingClientRect(); const p = Math.round((e.clientX - r.left) / r.width * S.moves.length); goto(p); });

// ---------- share / export ----------
function pageUrl() { return location.origin + location.pathname; }
function copy(text, msg) {
  const done = () => { $('toolMsg').textContent = msg; toast(msg); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done)); else fallbackCopy(text, done);
}
function fallbackCopy(text, done) { const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) { $('toolMsg').textContent = text; } t.remove(); }
function exportPgn() {
  const R = S.review && S.review.done ? S.review : null;
  return annotatedPgn({ headers: Object.assign({ Event: 'Analysis', Site: 'Gambit', Date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'), White: '?', Black: '?', Result: S.result || '*' }, S.headers), startFen: S.startFen, moves: S.moves.map(m => ({ ...m, review: R ? m.review : null })), evals: R ? R.evals : null, bestSan: R ? R.bestSan : null, result: S.result || '*' });
}
$('copyFen').onclick = () => copy(curFen(), 'FEN copied');
$('copyLink').onclick = () => { const u = S.moves.length && !S.vari ? pageUrl() + '?pgn=' + encodeURIComponent(S.moves.length ? plainPgn() : '') : pageUrl() + '?fen=' + encodeURIComponent(curFen()); copy(u, 'Link copied'); };
$('copyPgn').onclick = () => copy(exportPgn(), S.review && S.review.done ? 'Annotated PGN copied' : 'PGN copied');
$('dlPgn').onclick = () => { const b = new Blob([exportPgn()], { type: 'application/x-chess-pgn' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'gambit-analysis.pgn'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); $('toolMsg').textContent = 'PGN downloaded'; };
function plainPgn() { const c = new Chess(S.startFen); for (const m of S.moves) c.move(m.san); return c.pgn(); }
function setTheme(t) { S.theme = THEMES[t] ? t : 'green'; store.set('theme', S.theme); [...$('themeSeg').children].forEach(b => b.classList.toggle('on', b.dataset.th === S.theme)); board.set({ theme: S.theme }); }
$('themeSeg').onclick = e => { const b = e.target.closest('button'); if (b) setTheme(b.dataset.th); };

let tT = 0;
function toast(m) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(tT); tT = setTimeout(() => { t.hidden = true; }, 1800); }

// ---------- boot ----------
setTheme(S.theme);
engine.start().then(e => { $('engState').textContent = 'Stockfish ready'; $('engState').className = 'pill ok'; window.__npChessEngineMs = e.loadMs; }).catch(engineFailed);
(function boot() {
  const q = new URLSearchParams(location.search);
  const fen = q.get('fen'), pgn = q.get('pgn');
  try {
    if (fen) { $('paste').value = fen; loadFen(fen); return; }
    if (pgn) { $('paste').value = pgn; loadPgn(pgn); return; }
  } catch (e) { showErr(e); }
  setGame({ startFen: DEF, moves: [], headers: {}, result: null });
  $('loadSum').textContent = '';
})();
