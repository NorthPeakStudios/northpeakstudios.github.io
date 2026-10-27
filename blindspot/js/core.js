// Blindspot core: the same code runs in blindspot-sync, so daily sets and scores match exactly.

/* ---- Blindspot core (identical in the app's js/core.js and in blindspot-sync): daily sets + scoring ---- */
const BS_EPOCH = Date.UTC(2026, 9, 27); // day 0 = Tue Oct 27, 2026
function bsDayNum(key) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || '')); if (!m) return NaN; return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - BS_EPOCH) / 864e5); }
function bsDayKey(n) { const d = new Date(BS_EPOCH + n * 864e5); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
function bsWeek(n) { return Math.floor((n + 1) / 7); } // weeks start Monday (Oct 26, 2026 = week 0)
function bsRng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const bsCycles = {};
function bsCycle(meta, c) { // meta: [[id, cat, isYear], ...] sorted by id. Sets of 5: at most 2 year questions, at most 2 per category.
  if (bsCycles[c]) return bsCycles[c];
  const r = bsRng(0xB15D0 + c * 7919), a = meta.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  const sets = []; let pend = a;
  while (pend.length >= 5) {
    const set = [], rest = []; let ny = 0; const cats = {};
    for (const q of pend) { if (set.length < 5 && !(q[2] && ny >= 2) && !((cats[q[1]] || 0) >= 2)) { set.push(q); if (q[2]) ny++; cats[q[1]] = (cats[q[1]] || 0) + 1; } else rest.push(q); }
    while (set.length < 5 && rest.length) set.push(rest.shift());
    sets.push(set.map(q => q[0])); pend = rest;
  }
  return (bsCycles[c] = sets);
}
function bsDaily(meta, n) { const L = bsCycle(meta, 0).length, c = Math.floor(n / L), s = bsCycle(meta, c); return s[((n % L) + L) % L % s.length]; }
function bsScore(q, lo, hi, conf) { // q: {a, k, sc}. Interval score (Gneiting & Raftery 2007) -> 0..100 points
  lo = +lo; hi = +hi; if (lo > hi) { const t = lo; lo = hi; hi = t; }
  const x = +q.a, al = 1 - conf / 100; let L = lo, H = hi, X = x, k;
  if (q.k === 'log') { const f = v => Math.log10(Math.max(v, Math.abs(x) * 1e-6, 1e-12)); L = f(lo); H = f(hi); X = f(x); k = 0.5; }
  else if (q.k === 'y') k = 3 * Math.max(5, 0.08 * (2026 - x));
  else k = +q.sc || 10;
  const IS = (H - L) + (X < L ? (2 / al) * (L - X) : 0) + (X > H ? (2 / al) * (X - H) : 0);
  return { pts: Math.max(0, Math.min(100, Math.round(100 * Math.exp(-IS / k)))), hit: x >= lo && x <= hi };
}

window.BS_META=BSQ.numeric.map(q=>[q.id,q.c,q.k==='y']);
