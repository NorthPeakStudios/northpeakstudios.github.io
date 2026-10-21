// the painting: every kept moment bleeds its colors into one canvas.
// oldest at the edges, newest glowing at the center.
import { mulberry32 } from './poet.js';
import { hexRgb } from './color.js';

function gauss(r){ let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.max(-1.8, Math.min(1.8, Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v))); }
function deform(pts, depth, variance, r){
  let out = pts;
  for (let d = 0; d < depth; d++) {
    const next = [];
    for (let i = 0; i < out.length; i++) {
      const a = out[i], b = out[(i + 1) % out.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const vv = (a[2] + b[2]) / 2;
      next.push(a);
      const mx = (a[0] + b[0]) / 2 + gauss(r) * len * variance * vv, my = (a[1] + b[1]) / 2 + gauss(r) * len * variance * vv;
      next.push([mx, my, vv * (0.8 + r() * 0.4)]);
    }
    out = next;
  }
  return out;
}
function blobBase(cx, cy, s, r){
  const n = 10, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([cx + Math.cos(a) * s, cy + Math.sin(a) * s, 0.6 + r() * 0.9]); }
  return deform(pts, 3, 0.24, r);
}
function fillPoly(ctx, pts){ ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); }

export function layout(moments, w, h){
  const ms = moments.slice().sort((a, b) => a.t - b.t), N = ms.length;
  const cx = w / 2, cy = h * 0.5, rx = w * 0.5, ry = h * 0.48;
  const base = Math.min(w, h) * Math.max(0.12, Math.min(0.34, 0.95 / Math.sqrt(N + 3)));
  return ms.map((m, i) => {
    const t = N === 1 ? 1 : i / (N - 1), rad = Math.pow(1 - t, 0.7) * (N === 1 ? 0 : 1);
    const r = mulberry32((m.seed ^ 0x9e3779b9) >>> 0);
    const ang = i * 2.39996 + r() * 0.5;
    return { m, x: cx + Math.cos(ang) * rx * rad + gauss(r) * base * 0.15, y: cy + Math.sin(ang) * ry * rad + gauss(r) * base * 0.15, s: base * (0.85 + t * 0.45 + r() * 0.2), t };
  });
}

export function paint(canvas, moments, { progressive = false, caption = null } = {}){
  const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  const spots = layout(moments, w, h), N = spots.length;
  // pigment layer at low resolution — upscaling it is what makes the edges bleed like wet paper
  const sc = 0.34, off = document.createElement('canvas'); off.width = Math.max(2, Math.round(w * sc)); off.height = Math.max(2, Math.round(h * sc));
  const o = off.getContext('2d'); o.scale(sc, sc);
  const bg = o.createRadialGradient(w / 2, h * 0.48, 0, w / 2, h * 0.5, Math.max(w, h) * 0.75);
  bg.addColorStop(0, '#17131f'); bg.addColorStop(1, '#08070c'); o.fillStyle = bg; o.fillRect(0, 0, w, h);
  // a faint wash of everything, so the paper is tinted by the whole history
  spots.forEach(sp => { const c = hexRgb(sp.m.colors[1] || sp.m.colors[0]), g = o.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.s * 2.6);
    g.addColorStop(0, `rgba(${c},${0.10})`); g.addColorStop(1, `rgba(${c},0)`); o.fillStyle = g; o.fillRect(0, 0, w, h); });
  const layers = N < 8 ? 34 : N < 30 ? 24 : N < 90 ? 16 : 10;
  const jobs = [];
  spots.forEach(sp => {
    const cols = (sp.m.colors || ['#888', '#666', '#222']).map(hexRgb);
    const r = mulberry32(sp.m.seed >>> 0);
    const ox = gauss(r) * sp.s * 0.5, oy = gauss(r) * sp.s * 0.5;
    jobs.push({ c: cols[1], x: sp.x + ox, y: sp.y + oy, s: sp.s * 0.85, r, a: 0.04 });
    jobs.push({ c: cols[0], x: sp.x, y: sp.y, s: sp.s, r, a: 0.05 + sp.t * 0.02 });
  });
  const drawJob = j => {
    const base = blobBase(j.x, j.y, j.s, j.r);
    o.fillStyle = `rgba(${j.c[0]},${j.c[1]},${j.c[2]},${j.a})`;
    for (let l = 0; l < layers; l++) {
      const shrink = 1.05 - (l / layers) * 0.4;
      fillPoly(o, deform(base.map(p => [j.x + (p[0] - j.x) * shrink, j.y + (p[1] - j.y) * shrink, p[2]]), 2, 0.3, j.r));
    }
  };
  const blit = () => {
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 0, 0, w, h);
  };
  const finish = () => {
    blit();
    // bloom
    const sm = document.createElement('canvas'); sm.width = Math.max(2, Math.round(w * 0.08)); sm.height = Math.max(2, Math.round(h * 0.08));
    const sx = sm.getContext('2d'); sx.imageSmoothingQuality = 'high'; sx.drawImage(off, 0, 0, sm.width, sm.height);
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.45; ctx.drawImage(sm, 0, 0, w, h); ctx.globalAlpha = 1;
    // newest glow
    ctx.globalCompositeOperation = 'lighter';
    spots.slice(-3).forEach((sp, k, arr) => {
      const c = hexRgb(sp.m.colors[0]), g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.s * 1.2);
      const a = 0.08 + 0.12 * (k + 1) / arr.length;
      g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(sp.x - sp.s * 1.3, sp.y - sp.s * 1.3, sp.s * 2.6, sp.s * 2.6);
    });
    ctx.globalCompositeOperation = 'source-over';
    const gs = 128, gc = document.createElement('canvas'); gc.width = gc.height = gs; const gx = gc.getContext('2d'), id = gx.createImageData(gs, gs);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 16; }
    gx.putImageData(id, 0, 0); ctx.fillStyle = ctx.createPattern(gc, 'repeat'); ctx.fillRect(0, 0, w, h);
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    if (caption) {
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `italic ${Math.round(w * 0.065)}px "Instrument Serif", Georgia, serif`; ctx.fillText(caption[0], w / 2, h - w * 0.1);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = `${Math.round(w * 0.024)}px -apple-system, Helvetica, sans-serif`;
      ctx.fillText(caption[1], w / 2, h - w * 0.058);
    }
  };
  if (!progressive) { jobs.forEach(drawJob); finish(); return Promise.resolve(spots); }
  return new Promise(res => {
    let k = 0; const per = Math.max(2, Math.ceil(jobs.length / 24));
    const step = () => { const end = Math.min(jobs.length, k + per); for (; k < end; k++) drawJob(jobs[k]); if (k < jobs.length) { blit(); requestAnimationFrame(step); } else { finish(); res(spots); } };
    requestAnimationFrame(step);
  });
}
