// Scoring, move classification, accuracy and annotated-PGN export. Pure functions, no DOM.
export const MATE_CP = 10000;   // a forced mate is scored as 10000 cp minus 10 per move to mate
export const CLAMP = 1000;      // centipawn loss and win% use evals clamped to +/-1000 (a mate counts as 1000)

// Classification by centipawn loss (the mover's eval before the move minus after it, from the mover's side).
// "best" = the move the engine itself picked in that position.
export const BANDS = [
  { key: 'best', label: 'Best', max: null },
  { key: 'excellent', label: 'Excellent', max: 20 },
  { key: 'good', label: 'Good', max: 50 },
  { key: 'inaccuracy', label: 'Inaccuracy', max: 100 },
  { key: 'mistake', label: 'Mistake', max: 300 },
  { key: 'blunder', label: 'Blunder', max: Infinity },
];
export const LABEL = Object.fromEntries(BANDS.map(b => [b.key, b.label]));
export const NAG = { inaccuracy: '?!', mistake: '?', blunder: '??' };
export const NAGNUM = { inaccuracy: '$6', mistake: '$2', blunder: '$4' };

export function toCp(s) { // s: {cp} or {mate}, White POV
  if (!s) return 0;
  if (s.mate === 0) return s.win === 'w' ? MATE_CP : s.win === 'b' ? -MATE_CP : 0; // side to move is checkmated
  if (s.mate != null) return s.mate > 0 ? MATE_CP - s.mate * 10 : s.mate < 0 ? -MATE_CP - s.mate * 10 : 0;
  return s.cp || 0;
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function winPct(cp) { const c = clamp(cp, -CLAMP, CLAMP); return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1); }
export function fmtEval(s) {
  if (!s) return '…';
  if (s.mate != null) return s.mate === 0 ? (s.win === 'b' ? '-#' : '#') : (s.mate > 0 ? 'M' + s.mate : '-M' + (-s.mate));
  const v = s.cp / 100; return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
}
export function pgnEval(s) { if (!s) return null; if (s.mate === 0) return s.win === 'b' ? '#-0' : '#0'; if (s.mate != null) return '#' + s.mate; return (s.cp / 100).toFixed(2); }

// Guard against "blunders" that don't change the result: a move can only be graded Inaccuracy / Mistake / Blunder
// if it also drops the mover's win chance by at least 10 / 20 / 30 points (lichess's win% bands). The milder grade wins.
export const WIN_DROP = { inaccuracy: 10, mistake: 20, blunder: 30 };
const ORDER = ['best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'];
export function classify(lossCp, isBest, winDrop = Infinity) {
  if (isBest) return 'best';
  let k = 'blunder';
  for (const b of BANDS) if (b.max != null && lossCp <= b.max) { k = b.key; break; }
  let w = 'good';
  if (winDrop >= WIN_DROP.blunder) w = 'blunder'; else if (winDrop >= WIN_DROP.mistake) w = 'mistake'; else if (winDrop >= WIN_DROP.inaccuracy) w = 'inaccuracy';
  return ORDER.indexOf(k) <= ORDER.indexOf(w) ? k : w;
}

// Lichess-style move accuracy from the mover's win% before and after.
export function moveAccuracy(wBefore, wAfter) {
  const d = Math.max(0, wBefore - wAfter);
  return clamp(103.1668 * Math.exp(-0.04354 * d) - 3.1669 + 1, 0, 100);
}
function stdev(xs) { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length); }

// evals[i]: score object (White POV) for position i (0..n). best[i]: engine best uci in position i. moves[i]: {uci,color}.
export function analyseGame(evals, best, moves) {
  const n = moves.length, out = [];
  const wp = evals.map(e => winPct(toCp(e)));
  for (let i = 0; i < n; i++) {
    const s = moves[i].color === 'w' ? 1 : -1;
    const before = clamp(s * toCp(evals[i]), -CLAMP, CLAMP), after = clamp(s * toCp(evals[i + 1]), -CLAMP, CLAMP);
    const loss = Math.max(0, Math.round(before - after));
    const wB = s > 0 ? wp[i] : 100 - wp[i], wA = s > 0 ? wp[i + 1] : 100 - wp[i + 1];
    const isBest = !!best[i] && moves[i].uci === best[i];
    out.push({ loss, winDrop: Math.max(0, wB - wA), cls: classify(loss, isBest, Math.max(0, wB - wA)), acc: moveAccuracy(wB, wA), color: moves[i].color });
  }
  // Game accuracy per side, lichess method: volatility-weighted mean and harmonic mean of move accuracies, averaged.
  const acc = { w: null, b: null }, counts = { w: {}, b: {} };
  if (n) {
    const ws = clamp(Math.floor(wp.length / 10), 2, 8);
    const wins = [];
    for (let k = 0; k < Math.min(ws, wp.length) - 2; k++) wins.push(wp.slice(0, ws));
    for (let k = 0; k + ws <= wp.length; k++) wins.push(wp.slice(k, k + ws));
    const weights = wins.map(x => clamp(stdev(x), 0.5, 12));
    for (const c of ['w', 'b']) {
      let sw = 0, swa = 0, sh = 0, cnt = 0;
      out.forEach((m, i) => { if (m.color !== c) return; const w = weights[i] ?? 1; sw += w; swa += w * m.acc; sh += 1 / Math.max(m.acc, 0.5); cnt++; });
      if (cnt) acc[c] = (swa / sw + cnt / sh) / 2;
    }
    for (const m of out) counts[m.color][m.cls] = (counts[m.color][m.cls] || 0) + 1;
  }
  return { moves: out, acc, counts };
}

// Annotated PGN: headers, SAN, NAGs for ?!/?/??, and {[%eval]} comments with the engine's best move when it differs.
export function annotatedPgn({ headers, startFen, moves, evals, bestSan, result }) {
  const H = Object.assign({}, headers || {});
  const def = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  if (startFen && startFen !== def) { H.SetUp = '1'; H.FEN = startFen; }
  H.Annotator = 'Gambit (Stockfish 18 lite)';
  const esc = v => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  let s = Object.entries(H).map(([k, v]) => `[${k.replace(/[^A-Za-z0-9_]/g, '')} "${esc(v)}"]`).join('\n') + '\n\n';
  const parts = [];
  moves.forEach((m, i) => {
    const num = m.num; // full-move number of the position before this move
    let t = '';
    if (m.color === 'w') t = num + '. ';
    else if (i === 0) t = num + '... ';
    t += m.san;
    const r = m.review;
    if (r && NAGNUM[r.cls]) t += ' ' + NAGNUM[r.cls];
    const ev = evals && evals[i + 1] ? pgnEval(evals[i + 1]) : null;
    const notes = [];
    if (ev != null) notes.push(`[%eval ${ev}]`);
    if (r) { notes.push(LABEL[r.cls] + (r.cls !== 'best' && bestSan && bestSan[i] ? `. Best was ${bestSan[i]}` : '')); }
    if (notes.length) t += ' {' + notes.join(' ').replace(/[{}]/g, '') + '}';
    parts.push(t);
  });
  parts.push(result || H.Result || '*');
  let line = '', body = '';
  for (const p of parts.join(' ').split(' ')) { if ((line + ' ' + p).length > 79) { body += line.trim() + '\n'; line = ''; } line += ' ' + p; }
  return s + body + line.trim() + '\n';
}
