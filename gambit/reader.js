// Experimental screenshot -> position reader. Adapted from Tomo's Gambit prototype:
// find the board, snap to the 8x8 grid (equal division when no clear grid lines),
// compare each square against piece templates with normalized correlation, and leave
// low-confidence squares marked "?" for the person to check. Canvas work only: no network,
// no data: URIs (templates are drawn from blob: URLs, allowed by img-src 'self' blob:).
import { PIECES } from './vendor/pieces.js?v=2';
import { MERIDA } from './vendor/merida.js?v=2';

const N = 40, M = 4, SH = 2;            // template px per square, margin px, max shift px
const FILES = 'abcdefgh';
const lum = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

function ctx2d(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c.getContext('2d', { willReadFrequently: true }); }
// drawImage with the source rect clipped to the image (older WebKit draws nothing for out-of-bounds source rects)
function draw(c, img, sx, sy, sw, sh, dx, dy, dw, dh) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, kx = dw / sw, ky = dh / sh;
  const x0 = Math.max(0, sx), y0 = Math.max(0, sy), x1 = Math.min(iw, sx + sw), y1 = Math.min(ih, sy + sh);
  if (x1 <= x0 || y1 <= y0) return;
  c.drawImage(img, x0, y0, x1 - x0, y1 - y0, dx + (x0 - sx) * kx, dy + (y0 - sy) * ky, (x1 - x0) * kx, (y1 - y0) * ky);
}
function grayOf(ctx, w, h) { const d = ctx.getImageData(0, 0, w, h).data, g = new Float32Array(w * h); for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = lum(d[i], d[i + 1], d[i + 2]); return g; }
function svgImage(svg) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('template')); }; im.src = u;
  });
}

let TPL = null;
async function templates() {
  if (TPL) return TPL;
  const src = [];
  for (const [k, inner] of Object.entries(PIECES)) src.push([k, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">${inner}</svg>`]);
  for (const [k, svg] of Object.entries(MERIDA)) src.push([k, svg]);
  const imgs = await Promise.all(src.map(([, s]) => svgImage(s)));
  const out = [];
  imgs.forEach((im, i) => {
    for (const scale of [1, 0.86]) {          // lichess-style pieces fill the square; many apps draw them a bit smaller
      const c = ctx2d(N, N), z = N * scale, o = (N - z) / 2;
      c.drawImage(im, o, o, z, z);
      const d = c.getImageData(0, 0, N, N).data, A = new Float32Array(N * N), L = new Float32Array(N * N);
      for (let p = 0, j = 0; j < A.length; p += 4, j++) { A[j] = d[p + 3] / 255; L[j] = lum(d[p], d[p + 1], d[p + 2]); }
      out.push({ id: src[i][0], A, L });
    }
  });
  return (TPL = out);
}

// Where is the board? Score square windows by how well 64 near-corner samples alternate light/dark.
export function autoFrame(img) {
  const W0 = img.naturalWidth, H0 = img.naturalHeight, k = Math.min(1, 360 / Math.max(W0, H0));
  const w = Math.max(8, Math.round(W0 * k)), h = Math.max(8, Math.round(H0 * k));
  const c = ctx2d(w, h); c.imageSmoothingQuality = 'high'; c.drawImage(img, 0, 0, w, h);
  const g = grayOf(c, w, h);
  const at = (x, y) => g[Math.min(h - 1, Math.max(0, y | 0)) * w + Math.min(w - 1, Math.max(0, x | 0))];
  const score = (x0, y0, s) => {
    const cl = s / 8; let sa = 0, sb = 0, qa = 0, qb = 0;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      // four near-corner samples: piece bodies rarely reach the corners, and top+bottom samples pin the vertical offset
      const v = (at(x0 + (f + 0.12) * cl, y0 + (r + 0.12) * cl) + at(x0 + (f + 0.88) * cl, y0 + (r + 0.12) * cl) + at(x0 + (f + 0.12) * cl, y0 + (r + 0.88) * cl) + at(x0 + (f + 0.88) * cl, y0 + (r + 0.88) * cl)) / 4;
      if ((r + f) & 1) { sb += v; qb += v * v; } else { sa += v; qa += v * v; }
    }
    const ma = sa / 32, mb = sb / 32, va = Math.max(0, qa / 32 - ma * ma), vb = Math.max(0, qb / 32 - mb * mb);
    return Math.abs(ma - mb) / (Math.sqrt(va) + Math.sqrt(vb) + 0.03);
  };
  const mn = Math.min(w, h); let best = { v: -1 };
  for (let s = mn; s >= mn * 0.35; s -= mn * 0.02) {
    const st = Math.max(1, s / 24);
    for (let y = 0; y + s <= h + 0.01; y += st) for (let x = 0; x + s <= w + 0.01; x += st) { const v = score(x, y, s); if (v > best.v) best = { v, x, y, s }; }
  }
  if (best.v < 0) return null;
  let b = best;                                  // refine at 1 px / 0.5 % steps
  for (let pass = 0; pass < 2; pass++) {
    const r0 = b; const st = Math.max(1, r0.s / 24);
    for (let s = r0.s * 0.97; s <= Math.min(mn, r0.s * 1.03); s += Math.max(0.5, r0.s * 0.005))
      for (let y = Math.max(0, r0.y - st); y <= Math.min(h - s, r0.y + st); y += 1)
        for (let x = Math.max(0, r0.x - st); x <= Math.min(w - s, r0.x + st); x += 1) { const v = score(x, y, s); if (v > b.v) b = { v, x, y, s }; }
  }
  return { x: b.x / k, y: b.y / k, w: b.s / k, h: b.s / k, score: b.v };
}

// Snap a rough frame to the grid lines. Falls back to equal division of the frame.
function snapGrid(img, rect) {
  const B = 800, P = 60, S = B + 2 * P, cell = rect.w / 8, cellY = rect.h / 8;
  const c = ctx2d(S, S); c.imageSmoothingQuality = 'high';
  c.fillStyle = '#808080'; c.fillRect(0, 0, S, S);
  draw(c, img, rect.x - cell * P / 100, rect.y - cellY * P / 100, rect.w + cell * 2 * P / 100, rect.h + cellY * 2 * P / 100, 0, 0, S, S);
  const g = grayOf(c, S, S);
  const prof = (vert) => { const p = new Float32Array(S); for (let a = 1; a < S - 1; a++) { let t = 0; for (let b = P; b < P + B; b += 2) t += vert ? Math.abs(g[b * S + a + 1] - g[b * S + a - 1]) : Math.abs(g[(a + 1) * S + b] - g[(a - 1) * S + b]); p[a] = t; } return p; };
  const fit = (p) => {
    const sorted = [...p].sort((x, y) => x - y), med = sorted[S >> 1] || 1e-6, pts = [];
    for (let kk = 1; kk < 8; kk++) {           // interior lines only: board edges are often borders or UI
      const e = P + kk * 100; let bi = e, bv = -1;
      for (let a = e - 18; a <= e + 18; a++) if (p[a] > bv) { bv = p[a]; bi = a; }
      if (bv > med * 2.2) pts.push([kk, bi]);
    }
    let a0 = 0, bS = 100, res = 99;
    for (;;) {                                 // least squares, dropping the worst line while it is clearly off
      if (pts.length < 5) return null;
      const n = pts.length, sx = pts.reduce((t, q) => t + q[0], 0), sy = pts.reduce((t, q) => t + q[1], 0), sxx = pts.reduce((t, q) => t + q[0] * q[0], 0), sxy = pts.reduce((t, q) => t + q[0] * q[1], 0);
      bS = (n * sxy - sx * sy) / (n * sxx - sx * sx); a0 = (sy - bS * sx) / n;
      const errs = pts.map(q => Math.abs(a0 + bS * q[0] - q[1])); res = Math.max(...errs);
      if (res <= 4) break;
      pts.splice(errs.indexOf(res), 1);
    }
    if (bS < 85 || bS > 115) return null;
    return { a0, bS };
  };
  const fx = fit(prof(true)), fy = fit(prof(false));
  const map = (f, o, len, cl) => f ? { o: o + (f.a0 - P) / 100 * cl, len: f.bS * 8 / 100 * cl } : { o, len };
  const X = map(fx, rect.x, rect.w, cell), Y = map(fy, rect.y, rect.h, cellY);
  return { rect: { x: X.o, y: Y.o, w: X.len, h: Y.len }, snapped: !!(fx && fy) };
}

function median(arr) { const s = Array.from(arr).sort((a, b) => a - b); return s[s.length >> 1]; }

// Read the 64 squares inside rect (natural image px). blackBottom: the screenshot shows black's side at the bottom.
export async function readBoard(img, rect, { blackBottom = false } = {}) {
  const T = await templates();
  const grid = snapGrid(img, rect), R = grid.rect;
  const S = 8 * N + 2 * M, c = ctx2d(S, S); c.imageSmoothingQuality = 'high';
  // two-step downscale for less aliasing on big screenshots
  const mid = ctx2d(16 * N + 4 * M, 16 * N + 4 * M); mid.imageSmoothingQuality = 'high';
  const cw = R.w / 8, ch = R.h / 8; mid.fillStyle = '#808080'; mid.fillRect(0, 0, mid.canvas.width, mid.canvas.height);
  draw(mid, img, R.x - cw * M / N, R.y - ch * M / N, R.w + 2 * cw * M / N, R.h + 2 * ch * M / N, 0, 0, mid.canvas.width, mid.canvas.height);
  c.drawImage(mid.canvas, 0, 0, S, S);
  const g = grayOf(c, S, S);
  const cells = [];
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const ox = M + f * N, oy = M + r * N;
    const ring = [];
    for (let i = 0; i < N; i++) for (const j of [0, 1, N - 2, N - 1]) { ring.push(g[(oy + j) * S + ox + i]); ring.push(g[(oy + i) * S + ox + j]); }
    const bg = median(ring);
    let fg = 0, tot = 0;
    for (let y = 4; y < N - 4; y++) for (let x = 4; x < N - 4; x++) { tot++; if (Math.abs(g[(oy + y) * S + ox + x] - bg) > 0.12) fg++; }
    const frac = fg / tot;
    const scores = {};
    if (frac >= 0.035) {
      for (const t of T) {
        let best = -2;
        for (let dy = -SH; dy <= SH; dy++) for (let dx = -SH; dx <= SH; dx++) {
          let sp = 0, ss = 0, spp = 0, sss = 0, sps = 0; const n = N * N;
          for (let y = 0; y < N; y++) { const row = (oy + dy + y) * S + ox + dx, tr = y * N; for (let x = 0; x < N; x++) { const a = t.A[tr + x], pv = bg + a * (t.L[tr + x] - bg), sv = g[row + x]; sp += pv; ss += sv; spp += pv * pv; sss += sv * sv; sps += pv * sv; } }
          const cov = sps - sp * ss / n, vp = spp - sp * sp / n, vs = sss - ss * ss / n;
          const ncc = vp > 1e-6 && vs > 1e-6 ? cov / Math.sqrt(vp * vs) : 0;
          if (ncc > best) best = ncc;
        }
        if (!(t.id in scores) || best > scores[t.id]) scores[t.id] = best;
      }
    }
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    let piece = null, sure = true, conf = 1;
    if (frac < 0.035) { piece = null; sure = frac < 0.02; conf = 1 - frac * 20; }
    else {
      // pawns can't stand on the first or last rank: take the best non-pawn there
      const cand = r === 0 || r === 7 ? ranked.filter(e => e[0][1] !== 'p') : ranked;
      const [id, s1] = cand[0], s2 = cand[1] ? cand[1][1] : 0;
      conf = s1; piece = s1 >= 0.35 ? id : null;
      sure = s1 >= 0.6 && s1 - s2 >= 0.04;
      if (frac < 0.06 && s1 < 0.5) { piece = null; }
    }
    cells.push({ r, f, piece, sure, conf, frac });
  }
  // at most one king per side: keep the most confident, flag the rest
  for (const k of ['wk', 'bk']) { const ks = cells.filter(x => x.piece === k).sort((a, b) => b.conf - a.conf); ks.slice(1).forEach(x => { x.sure = false; }); }
  let flip = blackBottom, autoFlipped = false;
  const wk = cells.find(x => x.piece === 'wk' && x.sure), bk = cells.find(x => x.piece === 'bk' && x.sure);
  if (!blackBottom && wk && bk && wk.r <= 2 && bk.r >= 5) { flip = true; autoFlipped = true; }
  const out = {}, unsure = [];
  for (const x of cells) {
    const sq = flip ? FILES[7 - x.f] + (x.r + 1) : FILES[x.f] + (8 - x.r);
    if (x.piece) out[sq] = x.piece;
    if (!x.sure) unsure.push(sq);
  }
  return { grid: out, unsure, rect: R, snapped: grid.snapped, flipped: flip, autoFlipped };
}

// The framed board as its own image, for the reference overlay on the editor board.
export function cropBlob(img, rect) {
  return new Promise(res => { const c = ctx2d(800, 800); c.imageSmoothingQuality = 'high'; c.fillStyle = '#808080'; c.fillRect(0, 0, 800, 800); draw(c, img, rect.x, rect.y, rect.w, rect.h, 0, 0, 800, 800); c.canvas.toBlob(b => res(b), 'image/png'); });
}
