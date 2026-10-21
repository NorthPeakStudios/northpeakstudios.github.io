// liminal · scenes. every kept moment becomes a small painted scene that depicts how it felt:
// sunrise over hills, a calm sea, a lone streetlight in fog, rain on a window, a storm at sea, a night sky,
// a misty forest, fireworks over the city, wind through a field. the moment's own colors tint the scene.
import { hexRgb } from './color.js';

const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const rgb = (c, a = 1) => a >= 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const BLACK = [6, 5, 12], WHITE = [255, 250, 244], WARM = [255, 214, 150], NIGHT = [10, 12, 34];

export const SCENES = {
  hills: 'sunrise over the hills', sea: 'a calm sea', streetlight: 'a lone streetlight', rain: 'rain on the window',
  storm: 'a storm at sea', night: 'a night sky', forest: 'a misty forest', fireworks: 'fireworks over the city', field: 'wind through the field', snow: 'snow falling'
};
const KEYS = [
  [/\b(rain|raining|rainy|drizzle|puddle|umbrella)\b/, 'rain'],
  [/\b(storm|stormy|thunder|lightning|hurricane|chaos|explode|exploding|furious|rage|screaming)\b/, 'storm'],
  [/\b(ocean|sea|beach|waves?|shore|lake|swim|swimming|tide)\b/, 'sea'],
  [/\b(snow|snowing|winter|freezing|frozen|ice|cold)\b/, 'snow'],
  [/\b(stars?|moon|night|midnight|3am|2am|1am|4am|insomnia|space|galaxy|sky)\b/, 'night'],
  [/\b(forest|trees?|woods|hike|hiking|fog|foggy|mist|misty)\b/, 'forest'],
  [/\b(concert|party|music|festival|celebrate|celebrating|birthday|won|win|winning|hype|lit)\b/, 'fireworks'],
  [/\b(sun|sunny|sunrise|sunset|morning|summer|warm|golden|hopeful|hope)\b/, 'hills'],
  [/\b(wind|windy|breeze|free|freedom|running|run|bike|field|flowers?)\b/, 'field'],
  [/\b(alone|lonely|empty|nobody|streetlight|street|walk|walking|dark)\b/, 'streetlight'],
  [/\b(tea|coffee|cozy|blanket|bed|home|room|window|inside)\b/, 'rain'],
];
const CHIP = { foggy: 'forest', electric: 'fireworks', warm: 'hills', distant: 'night', hollow: 'streetlight', weightless: 'field', glowing: 'fireworks', raw: 'storm', tangled: 'storm', tender: 'sea', open: 'hills', sharp: 'snow' };

export function sceneFor(m){
  if (m.scene && SCENES[m.scene]) return m.scene;
  const t = (m.text || '').toLowerCase();
  if (t) for (const [re, s] of KEYS) if (re.test(t)) return s;
  for (const c of (m.chips || [])) if (CHIP[c]) return CHIP[c];
  const v = m.v, e = m.e, r = mulberry32((m.seed || 7) ^ 0x9e37)();
  if (Math.hypot(v - .5, e - .45) < .1) return r < .5 ? 'forest' : 'night';
  if (v >= .5 && e < .5) return e < .3 ? (r < .6 ? 'hills' : 'sea') : (r < .5 ? 'sea' : 'hills');
  if (v >= .5) return e > .68 ? 'fireworks' : (r < .6 ? 'field' : 'hills');
  if (e < .5) return e < .3 ? (r < .55 ? 'streetlight' : 'snow') : (r < .5 ? 'rain' : 'streetlight');
  return e > .68 ? 'storm' : (r < .6 ? 'rain' : 'storm');
}

/* the moment's palette, made scene-safe: glow (light source), second (accent), deep (shadow) */
function pal(m){
  const [g, s, d] = (m.colors || ['#a9b8f0', '#6fd3c4', '#0b0d22']).map(hexRgb);
  return { g, s, d, dark: mix(d, BLACK, .55), ink: mix(d, BLACK, .78) };
}

function sky(ctx, w, h, stops){ const gr = ctx.createLinearGradient(0, 0, 0, h); stops.forEach(([o, c]) => gr.addColorStop(o, c)); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h); }
function glow(ctx, x, y, r, c, a = 1){ const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgb(c, a)); gr.addColorStop(.35, rgb(c, a * .35)); gr.addColorStop(1, rgb(c, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
function disk(ctx, x, y, r, c){ ctx.fillStyle = rgb(c); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
function ridge(ctx, w, h, base, amp, rnd, color, rough = 1){
  const ph = [rnd() * 6, rnd() * 6, rnd() * 6], f = [1 + rnd() * 1.5, 2.5 + rnd() * 2, 6 + rnd() * 4];
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += w / 60) { const u = x / w; const y = base - amp * (Math.sin(u * f[0] * 3.14 + ph[0]) * .6 + Math.sin(u * f[1] * 3.14 + ph[1]) * .3 * rough + Math.sin(u * f[2] * 3.14 + ph[2]) * .1 * rough); ctx.lineTo(x, y); }
  ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
}
function stars(ctx, w, h, n, rnd, maxY = 1, a = 1){ for (let i = 0; i < n; i++) { const x = rnd() * w, y = rnd() * h * maxY, r = rnd() < .08 ? 1.3 : .3 + rnd() * .7; ctx.fillStyle = `rgba(255,252,240,${(.25 + rnd() * .75) * a})`; ctx.beginPath(); ctx.arc(x, y, r * w / 300, 0, 7); ctx.fill(); } }
function clouds(ctx, w, h, rnd, c, n, y0, y1, a){ for (let i = 0; i < n; i++) { const x = rnd() * w, y = y0 + rnd() * (y1 - y0), rx = w * (.18 + rnd() * .3); ctx.save(); ctx.translate(x, y); ctx.scale(1, .32); glow(ctx, 0, 0, rx, c, a); ctx.restore(); } }
function fog(ctx, w, h, y, band, c, a){ const gr = ctx.createLinearGradient(0, y - band, 0, y + band); gr.addColorStop(0, rgb(c, 0)); gr.addColorStop(.5, rgb(c, a)); gr.addColorStop(1, rgb(c, 0)); ctx.fillStyle = gr; ctx.fillRect(0, y - band, w, band * 2); }
function pine(ctx, x, base, ht, c){ const wd = ht * .42; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, base - ht); for (let k = 1; k <= 4; k++) { const yy = base - ht + ht * k / 4.2, ww = wd * k / 4; ctx.lineTo(x + ww, yy); ctx.lineTo(x + ww * .45, yy); } ctx.lineTo(x + wd * .1, base); ctx.lineTo(x - wd * .1, base); for (let k = 4; k >= 1; k--) { const yy = base - ht + ht * k / 4.2, ww = wd * k / 4; ctx.lineTo(x - ww * .45, yy); ctx.lineTo(x - ww, yy); } ctx.closePath(); ctx.fill(); }
function birds(ctx, w, h, rnd, n, c){ ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, w / 260); ctx.lineCap = 'round'; for (let i = 0; i < n; i++) { const x = w * (.2 + rnd() * .6), y = h * (.12 + rnd() * .25), s = w * (.014 + rnd() * .014); ctx.beginPath(); ctx.moveTo(x - s, y - s * .3); ctx.quadraticCurveTo(x - s * .4, y - s * .7, x, y); ctx.quadraticCurveTo(x + s * .4, y - s * .7, x + s, y - s * .3); ctx.stroke(); } }
function grain(ctx, w, h, rnd, a = .06){ const n = Math.round(w * h / 90); ctx.fillStyle = `rgba(255,255,255,${a})`; for (let i = 0; i < n; i++) ctx.fillRect(rnd() * w, rnd() * h, 1, 1); ctx.fillStyle = `rgba(0,0,0,${a * 1.4})`; for (let i = 0; i < n; i++) ctx.fillRect(rnd() * w, rnd() * h, 1, 1); }
function vignette(ctx, w, h, a = .5){ const gr = ctx.createRadialGradient(w / 2, h * .45, Math.min(w, h) * .35, w / 2, h / 2, Math.max(w, h) * .78); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h); }

const DRAW = {
  hills(ctx, w, h, p, rnd, m){
    const sunC = mix(p.g, WARM, .62), horizon = h * (.56 + rnd() * .06);
    sky(ctx, w, h, [[0, rgb(mix(p.s, NIGHT, .55))], [.45, rgb(mix(p.s, sunC, .45))], [.62, rgb(mix(sunC, WHITE, .25))], [1, rgb(p.dark)]]);
    const sx = w * (.3 + rnd() * .4), sy = horizon - h * (.02 + m.v * .1);
    glow(ctx, sx, sy, w * .75, sunC, .55); disk(ctx, sx, sy, w * .085, mix(sunC, WHITE, .55));
    clouds(ctx, w, h, rnd, mix(sunC, WHITE, .3), 3, h * .12, h * .38, .35);
    birds(ctx, w, h, rnd, 2 + Math.floor(rnd() * 3), rgb(mix(p.s, BLACK, .5), .7));
    const layers = 4;
    for (let i = 0; i < layers; i++) { const t = i / (layers - 1); ridge(ctx, w, h, horizon + h * (.03 + t * .26), h * (.07 - t * .02), rnd, rgb(mix(mix(p.s, sunC, .35 * (1 - t)), p.ink, .25 + t * .7))); if (i < 2) fog(ctx, w, h, horizon + h * (.06 + t * .26), h * .04, mix(sunC, WHITE, .5), .25); }
  },
  sea(ctx, w, h, p, rnd, m){
    const night = m.v < .62 && rnd() < .5, horizon = h * (.5 + rnd() * .06), lightC = night ? mix(p.g, WHITE, .65) : mix(p.g, WARM, .4);
    sky(ctx, w, horizon, night ? [[0, rgb(mix(p.d, NIGHT, .5))], [1, rgb(mix(p.s, NIGHT, .25))]] : [[0, rgb(mix(p.s, NIGHT, .35))], [.7, rgb(mix(p.s, lightC, .55))], [1, rgb(mix(lightC, WHITE, .35))]]);
    if (night) stars(ctx, w, horizon, 70, rnd, .9);
    const lx = w * (.35 + rnd() * .3), ly = horizon - h * (.1 + rnd() * .12), lr = w * (night ? .06 : .08);
    glow(ctx, lx, ly, w * .6, lightC, .45); disk(ctx, lx, ly, lr, mix(lightC, WHITE, .5));
    if (night) { ctx.save(); ctx.beginPath(); ctx.arc(lx, ly, lr * 1.02, 0, 7); ctx.clip(); ctx.fillStyle = rgb(mix(mix(p.d, NIGHT, .5), mix(p.s, NIGHT, .25), clamp(ly / horizon))); ctx.beginPath(); ctx.arc(lx + lr * .5, ly - lr * .25, lr * .9, 0, 7); ctx.fill(); ctx.restore(); glow(ctx, lx, ly, lr * 1.6, mix(lightC, WHITE, .3), .25); }
    const gr = ctx.createLinearGradient(0, horizon, 0, h); gr.addColorStop(0, rgb(mix(p.s, p.d, .35))); gr.addColorStop(1, rgb(p.ink)); ctx.fillStyle = gr; ctx.fillRect(0, horizon, w, h - horizon);
    for (let i = 0; i < 46; i++) { const t = Math.pow(rnd(), 1.6), y = horizon + t * (h - horizon), spread = w * (.03 + t * .22), x = lx + (rnd() - .5) * spread * 2, len = w * (.02 + t * .09);
      ctx.fillStyle = rgb(mix(lightC, WHITE, .3), (1 - t) * .7 + .1); ctx.fillRect(x - len / 2, y, len, Math.max(1, h * .004)); }
    ctx.strokeStyle = rgb(mix(p.s, WHITE, .2), .18); ctx.lineWidth = Math.max(1, w / 300);
    for (let i = 0; i < 14; i++) { const y = horizon + Math.pow((i + 1) / 15, 1.5) * (h - horizon), x = rnd() * w; ctx.beginPath(); ctx.moveTo(x - w * .12, y); ctx.quadraticCurveTo(x, y - h * .006, x + w * .12, y); ctx.stroke(); }
    ctx.fillStyle = rgb(mix(lightC, WHITE, .5), .45); ctx.fillRect(0, horizon - 1, w, Math.max(1, h * .003));
  },
  storm(ctx, w, h, p, rnd, m){
    const horizon = h * .55, boltC = mix(p.g, WHITE, .6);
    sky(ctx, w, h, [[0, rgb(mix(p.d, BLACK, .4))], [.5, rgb(mix(p.s, p.d, .55))], [1, rgb(p.ink)]]);
    clouds(ctx, w, h, rnd, mix(p.s, BLACK, .45), 7, h * .05, h * .35, .9); clouds(ctx, w, h, rnd, mix(p.g, p.d, .5), 4, h * .1, h * .3, .35);
    const bx = w * (.25 + rnd() * .5); glow(ctx, bx, h * .3, w * .55, boltC, .35);
    ctx.strokeStyle = rgb(boltC); ctx.lineWidth = Math.max(1.5, w / 150); ctx.shadowColor = rgb(boltC); ctx.shadowBlur = w / 25; ctx.beginPath();
    let x = bx, y = h * .2; ctx.moveTo(x, y); while (y < horizon - h * .03) { x += (rnd() - .5) * w * .12; y += h * (.04 + rnd() * .05); ctx.lineTo(x, Math.min(y, horizon - h * .03)); } ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = rgb(mix(p.s, p.ink, .55)); ctx.fillRect(0, horizon, w, h - horizon);
    for (let row = 0; row < 6; row++) { const t = row / 5, y = horizon + Math.pow(t, 1.3) * (h - horizon) * .92 + h * .01, amp = h * (.012 + t * .045), dark = mix(p.ink, BLACK, .2), lite = mix(mix(p.s, p.g, .3), WHITE, .12 + (1 - t) * .1);
      const ph = rnd() * 6, f = 2.5 + rnd() * 2.5 + (1 - t) * 3, ph2 = rnd() * 6, f2 = 9 + rnd() * 6, pts = [];
      for (let xx = 0; xx <= w; xx += w / 90) { const u = xx / w; pts.push([xx, y - (Math.pow(Math.max(0, Math.sin(u * f * 3.14 + ph)), 1.6) * .85 + (Math.sin(u * f2 * 3.14 + ph2) * .5 + .5) * .2) * amp * 2]); }
      const gr = ctx.createLinearGradient(0, y - amp * 2, 0, y + amp * 2.5); gr.addColorStop(0, rgb(lite)); gr.addColorStop(.45, rgb(mix(lite, dark, .55))); gr.addColorStop(1, rgb(dark)); ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(0, h); pts.forEach(q => ctx.lineTo(q[0], q[1])); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgb(mix(boltC, WHITE, .5), .55); ctx.lineWidth = Math.max(1, w / 260 * (1 + t)); ctx.lineCap = 'round';
      for (let k = 2; k < pts.length - 2; k++) { const crest = y - pts[k][1] > amp * 1.2; if (crest && rnd() < .8) { ctx.beginPath(); ctx.moveTo(pts[k - 1][0], pts[k - 1][1] + 1); ctx.lineTo(pts[k + 1][0], pts[k + 1][1] + 1); ctx.stroke(); if (rnd() < .3) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(pts[k][0] + (rnd() - .5) * w * .03, pts[k][1] - rnd() * amp, w / 380, 0, 7); ctx.fill(); } } } }
    ctx.strokeStyle = 'rgba(220,225,255,.18)'; ctx.lineWidth = Math.max(1, w / 400); for (let i = 0; i < 90; i++) { const x0 = rnd() * w * 1.2, y0 = rnd() * h, l = h * (.04 + rnd() * .05); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 - l * .35, y0 + l); ctx.stroke(); }
  },
  rain(ctx, w, h, p, rnd, m){
    const warm = m.v >= .45, lampC = warm ? mix(p.g, WARM, .5) : mix(p.g, WHITE, .2);
    sky(ctx, w, h, [[0, rgb(mix(p.d, NIGHT, .2))], [1, rgb(mix(p.s, p.d, .6))]]);
    for (let i = 0; i < 26; i++) { const c = rnd() < .5 ? lampC : rnd() < .5 ? p.s : mix(p.g, WHITE, .3); glow(ctx, rnd() * w, h * (.25 + rnd() * .65), w * (.04 + rnd() * .1), c, .25 + rnd() * .45); }
    ctx.fillStyle = rgb(p.ink, .55); for (let i = 0; i < 7; i++) { const bw = w * (.08 + rnd() * .12), bh = h * (.12 + rnd() * .3), bx = rnd() * w; ctx.fillRect(bx, h - bh, bw, bh); }
    ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; for (let i = 0; i < 10; i++) glow(ctx, rnd() * w, h * (.3 + rnd() * .6), w * (.08 + rnd() * .1), lampC, .18); ctx.restore();
    for (let i = 0; i < 22; i++) { const x = rnd() * w, y0 = rnd() * h * .7, l = h * (.06 + rnd() * .2), wd = Math.max(.8, w * (.003 + rnd() * .004)); // trails left by drops sliding down the glass
      const gr = ctx.createLinearGradient(0, y0, 0, y0 + l); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.22)'); ctx.strokeStyle = gr; ctx.lineWidth = wd; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.bezierCurveTo(x + (rnd() - .5) * w * .02, y0 + l * .4, x + (rnd() - .5) * w * .02, y0 + l * .7, x, y0 + l); ctx.stroke();
      const r = wd * 1.6; const g2 = ctx.createRadialGradient(x - r * .3, y0 + l - r * .3, 0, x, y0 + l, r); g2.addColorStop(0, 'rgba(255,255,255,.8)'); g2.addColorStop(1, 'rgba(255,255,255,.08)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y0 + l, r, 0, 7); ctx.fill(); }
    for (let i = 0; i < 120; i++) { const x = rnd() * w, y = rnd() * h, r = w * (.002 + Math.pow(rnd(), 4) * .009); // beads of rain on the glass
      const gr = ctx.createRadialGradient(x - r * .35, y - r * .35, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.7)'); gr.addColorStop(.6, rgb(mix(lampC, WHITE, .5), .18)); gr.addColorStop(1, 'rgba(0,0,0,.18)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    const fr = Math.max(4, w * .045), frame = rgb(mix(p.ink, BLACK, .3)); ctx.fillStyle = frame;
    ctx.fillRect(0, 0, w, fr); ctx.fillRect(0, h - fr * 1.6, w, fr * 1.6); ctx.fillRect(0, 0, fr, h); ctx.fillRect(w - fr, 0, fr, h); ctx.fillRect(w / 2 - fr * .35, 0, fr * .7, h); ctx.fillRect(0, h * .46, w, fr * .7);
    ctx.fillStyle = rgb(lampC, .18); ctx.fillRect(0, h - fr * 1.6, w, fr * .25);
    if (warm) { ctx.fillStyle = rgb(mix(p.ink, BLACK, .2)); const mx = w * (.62 + rnd() * .18), my = h - fr * 1.6; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(mx, my - h * .08, w * .1, h * .08, w * .015) : ctx.rect(mx, my - h * .08, w * .1, h * .08); ctx.fill();
      ctx.strokeStyle = rgb(mix(p.ink, BLACK, .2)); ctx.lineWidth = w * .012; ctx.beginPath(); ctx.arc(mx + w * .11, my - h * .045, w * .022, -1.4, 1.4); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = w / 260; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(mx + w * (.035 + k * .03), my - h * .09); ctx.bezierCurveTo(mx + w * (.015 + k * .03), my - h * .12, mx + w * (.055 + k * .03), my - h * .14, mx + w * (.035 + k * .03), my - h * .17); ctx.stroke(); } }
  },
  streetlight(ctx, w, h, p, rnd, m){
    const lampC = mix(p.g, WARM, .55), ground = h * .82, px = w * (.3 + rnd() * .35);
    sky(ctx, w, h, [[0, rgb(mix(p.d, NIGHT, .5))], [.8, rgb(mix(p.s, p.d, .7))], [1, rgb(p.ink)]]);
    stars(ctx, w, h, 25, rnd, .5, .6);
    ctx.fillStyle = rgb(p.ink, .8); for (let i = 0; i < 6; i++) { const bw = w * (.1 + rnd() * .15), bh = h * (.1 + rnd() * .2), bx = rnd() * w; ctx.fillRect(bx, ground - bh, bw, bh); if (rnd() < .6) { ctx.fillStyle = rgb(lampC, .5); ctx.fillRect(bx + bw * .3, ground - bh * .7, bw * .12, bh * .12); ctx.fillStyle = rgb(p.ink, .8); } }
    fog(ctx, w, h, ground - h * .08, h * .12, mix(p.s, WHITE, .2), .28);
    ctx.fillStyle = rgb(p.ink); ctx.fillRect(0, ground, w, h - ground);
    const top = h * .28, arm = w * .09;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const cone = ctx.createLinearGradient(0, top, 0, ground); cone.addColorStop(0, rgb(lampC, .55)); cone.addColorStop(1, rgb(lampC, .05)); ctx.fillStyle = cone;
    ctx.beginPath(); ctx.moveTo(px + arm - w * .02, top + h * .02); ctx.lineTo(px + arm + w * .02, top + h * .02); ctx.lineTo(px + arm + w * .26, ground); ctx.lineTo(px + arm - w * .26, ground); ctx.closePath(); ctx.fill();
    glow(ctx, px + arm, top + h * .02, w * .5, lampC, .5); ctx.restore();
    ctx.save(); ctx.translate(px + arm, ground); ctx.scale(1, .18); glow(ctx, 0, 0, w * .32, lampC, .7); ctx.restore();
    ctx.strokeStyle = rgb(mix(p.ink, BLACK, .4)); ctx.lineWidth = Math.max(2, w * .016); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, ground); ctx.lineTo(px, top); ctx.quadraticCurveTo(px, top - h * .03, px + arm * .6, top - h * .02); ctx.lineTo(px + arm, top); ctx.stroke();
    disk(ctx, px + arm, top + h * .015, w * .018, mix(lampC, WHITE, .6));
    ctx.fillStyle = 'rgba(255,245,230,.5)'; for (let i = 0; i < 40; i++) { const x = px + arm + (rnd() - .5) * w * .45, y = top + rnd() * (ground - top); ctx.globalAlpha = 1 - Math.abs(x - px - arm) / (w * .25); if (ctx.globalAlpha > 0) { ctx.beginPath(); ctx.arc(x, y, w / 300 + rnd() * w / 400, 0, 7); ctx.fill(); } } ctx.globalAlpha = 1;
  },
  snow(ctx, w, h, p, rnd, m){
    const ground = h * .74, c = mix(p.g, WHITE, .55);
    sky(ctx, w, h, [[0, rgb(mix(p.d, NIGHT, .35))], [.7, rgb(mix(p.s, WHITE, .12))], [1, rgb(mix(p.s, WHITE, .3))]]);
    glow(ctx, w * (.3 + rnd() * .4), h * .25, w * .5, c, .25);
    ridge(ctx, w, h, ground - h * .06, h * .05, rnd, rgb(mix(p.s, p.ink, .45)));
    for (let i = 0; i < 9; i++) { const x = rnd() * w; pine(ctx, x, ground + h * .01, h * (.12 + rnd() * .16), rgb(mix(p.ink, p.s, .15 + rnd() * .1))); }
    const gr = ctx.createLinearGradient(0, ground, 0, h); gr.addColorStop(0, rgb(mix(c, WHITE, .3))); gr.addColorStop(1, rgb(mix(p.s, WHITE, .45))); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, ground + h * .02);
    ctx.bezierCurveTo(w * .3, ground - h * .02, w * .7, ground + h * .05, w, ground); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 160; i++) { const r = w / 400 + Math.pow(rnd(), 3) * w / 90; ctx.fillStyle = `rgba(255,255,255,${.4 + rnd() * .5})`; ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, r, 0, 7); ctx.fill(); }
  },
  night(ctx, w, h, p, rnd, m){
    sky(ctx, w, h, [[0, rgb(mix(p.d, NIGHT, .55))], [.6, rgb(mix(p.s, NIGHT, .55))], [1, rgb(mix(p.g, p.d, .5))]]);
    ctx.save(); ctx.translate(w * .5, h * .4); ctx.rotate(-.5 + rnd()); ctx.scale(1, .22); glow(ctx, 0, 0, w * .8, mix(p.g, WHITE, .4), .35); ctx.restore();
    stars(ctx, w, h, 200, rnd, .85);
    if (rnd() < .7) { const x = w * (.2 + rnd() * .5), y = h * (.12 + rnd() * .2), l = w * .2; const gr = ctx.createLinearGradient(x, y, x + l, y + l * .4); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.9)'); ctx.strokeStyle = gr; ctx.lineWidth = w / 220; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + l * .4); ctx.stroke(); }
    const mx = w * (.65 + rnd() * .2), my = h * (.15 + rnd() * .1), mr = w * .05; glow(ctx, mx, my, w * .25, mix(p.g, WHITE, .6), .4); disk(ctx, mx, my, mr, mix(p.g, WHITE, .75));
    ridge(ctx, w, h, h * .74, h * .14, rnd, rgb(mix(p.s, p.ink, .6)), 1.6); fog(ctx, w, h, h * .78, h * .05, mix(p.g, WHITE, .3), .2); ridge(ctx, w, h, h * .86, h * .07, rnd, rgb(p.ink));
    if (rnd() < .6) { const x = w * (.15 + rnd() * .7), y = h * .86 - h * .035; ctx.fillStyle = rgb(p.ink); ctx.fillRect(x, y - h * .03, w * .06, h * .05); ctx.beginPath(); ctx.moveTo(x - w * .008, y - h * .03); ctx.lineTo(x + w * .03, y - h * .06); ctx.lineTo(x + w * .068, y - h * .03); ctx.fill(); ctx.fillStyle = rgb(WARM, .9); ctx.fillRect(x + w * .02, y - h * .018, w * .014, h * .014); glow(ctx, x + w * .027, y - h * .012, w * .05, WARM, .4); }
  },
  forest(ctx, w, h, p, rnd, m){
    const lightC = mix(p.g, WHITE, .5);
    sky(ctx, w, h, [[0, rgb(mix(p.s, WHITE, .1))], [.6, rgb(mix(p.g, WHITE, .35))], [1, rgb(mix(p.s, p.d, .4))]]);
    glow(ctx, w * (.3 + rnd() * .4), h * .3, w * .5, mix(lightC, WHITE, .4), .55);
    const rows = 5;
    for (let r = 0; r < rows; r++) { const t = r / (rows - 1), base = h * (.55 + t * .4), c = rgb(mix(mix(p.s, WHITE, .35), p.ink, .2 + t * .75)); const n = 6 + r * 2;
      for (let i = 0; i < n; i++) pine(ctx, (i + rnd() * .8) / n * w * 1.1 - w * .05, base, h * (.18 + t * .2) * (.7 + rnd() * .5), c);
      ctx.fillStyle = c; ctx.fillRect(0, base - 1, w, h - base + 1);
      fog(ctx, w, h, base - h * .02, h * .06, mix(lightC, WHITE, .5), .35 * (1 - t * .6)); }
    ctx.save(); ctx.globalCompositeOperation = 'screen'; for (let i = 0; i < 4; i++) { const x = w * (.2 + rnd() * .6); const gr = ctx.createLinearGradient(x, 0, x - w * .2, h); gr.addColorStop(0, rgb(lightC, .22)); gr.addColorStop(1, rgb(lightC, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w * .05, 0); ctx.lineTo(x - w * .1, h); ctx.lineTo(x - w * .25, h); ctx.closePath(); ctx.fill(); } ctx.restore();
  },
  fireworks(ctx, w, h, p, rnd, m){
    const ground = h * .8;
    sky(ctx, w, h, [[0, rgb(mix(p.d, NIGHT, .6))], [.75, rgb(mix(p.s, NIGHT, .5))], [1, rgb(mix(p.g, p.d, .4))]]);
    stars(ctx, w, h, 40, rnd, .6, .5);
    const n = 3 + Math.floor(rnd() * 2);
    for (let k = 0; k < n; k++) { const cx = w * (.15 + rnd() * .7), cy = h * (.15 + rnd() * .35), R = w * (.12 + rnd() * .14), c = mix([p.g, p.s, mix(p.g, WARM, .5)][k % 3], WHITE, .25), rays = 22 + Math.floor(rnd() * 14);
      glow(ctx, cx, cy, R * 1.6, c, .3);
      for (let i = 0; i < rays; i++) { const a = i / rays * 6.283 + rnd() * .1, r1 = R * (.75 + rnd() * .3);
        for (let s = 0; s < 6; s++) { const t = .25 + s / 6 * .75, x = cx + Math.cos(a) * r1 * t, y = cy + Math.sin(a) * r1 * t + t * t * R * .18; ctx.fillStyle = rgb(mix(c, WHITE, .3), .25 + t * .7); ctx.beginPath(); ctx.arc(x, y, (w / 300) * (1 + t), 0, 7); ctx.fill(); } }
      ctx.strokeStyle = rgb(c, .25); ctx.lineWidth = w / 400; ctx.beginPath(); ctx.moveTo(cx + (rnd() - .5) * w * .05, ground); ctx.lineTo(cx, cy + R * .3); ctx.stroke(); }
    let x = 0; while (x < w) { const bw = w * (.05 + rnd() * .09), bh = h * (.06 + rnd() * .2); ctx.fillStyle = rgb(p.ink); ctx.fillRect(x, ground - bh, bw + 1, bh + 1);
      for (let yy = ground - bh + h * .015; yy < ground - h * .01; yy += h * .022) for (let xx = x + bw * .15; xx < x + bw * .85; xx += bw * .25) if (rnd() < .35) { ctx.fillStyle = rgb(mix(WARM, p.g, rnd() * .5), .85); ctx.fillRect(xx, yy, bw * .1, h * .009); }
      x += bw; }
    ctx.fillStyle = rgb(p.ink); ctx.fillRect(0, ground, w, h - ground);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = rgb(mix(p.g, WHITE, .3), .08); ctx.fillRect(0, ground + h * (.02 + i * .04), w, h * .01); }
  },
  field(ctx, w, h, p, rnd, m){
    const sunC = mix(p.g, WARM, .35), horizon = h * .55;
    sky(ctx, w, h, [[0, rgb(mix(p.s, WHITE, .05))], [.55, rgb(mix(sunC, WHITE, .4))], [1, rgb(mix(p.g, p.d, .3))]]);
    glow(ctx, w * (.2 + rnd() * .6), h * .22, w * .6, mix(sunC, WHITE, .5), .6);
    clouds(ctx, w, h, rnd, WHITE, 4, h * .08, h * .35, .5);
    ridge(ctx, w, h, horizon, h * .03, rnd, rgb(mix(p.s, p.d, .35)));
    const gr = ctx.createLinearGradient(0, horizon, 0, h); gr.addColorStop(0, rgb(mix(p.g, p.s, .5))); gr.addColorStop(1, rgb(mix(p.s, p.ink, .6))); ctx.fillStyle = gr; ctx.fillRect(0, horizon + h * .02, w, h);
    const lean = .25 + m.e * .6; ctx.lineCap = 'round';
    for (let i = 0; i < 260; i++) { const t = Math.pow(rnd(), .7), x = rnd() * w, y = horizon + h * .03 + t * (h - horizon), ht = h * (.02 + t * .1), c = mix(mix(p.g, WHITE, .2), p.ink, .2 + rnd() * .5 * (1 - t) + t * .2);
      ctx.strokeStyle = rgb(c, .8); ctx.lineWidth = Math.max(.6, w / 500 * (1 + t * 2)); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + ht * lean * .3, y - ht * .6, x + ht * lean, y - ht); ctx.stroke(); }
    for (let i = 0; i < 26; i++) { const t = rnd(), x = rnd() * w, y = horizon + h * .05 + t * (h - horizon) * .9; ctx.fillStyle = rgb(mix(p.s, WARM, rnd()), .9); ctx.beginPath(); ctx.arc(x, y, w / 250 * (1 + t * 2), 0, 7); ctx.fill(); }
    if (m.e > .55) { const kx = w * (.6 + rnd() * .25), ky = h * (.15 + rnd() * .1), ks = w * .04; ctx.fillStyle = rgb(mix(p.s, WARM, .3)); ctx.beginPath(); ctx.moveTo(kx, ky - ks); ctx.lineTo(kx + ks * .7, ky); ctx.lineTo(kx, ky + ks * 1.2); ctx.lineTo(kx - ks * .7, ky); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(40,30,30,.45)'; ctx.lineWidth = w / 500; ctx.beginPath(); ctx.moveTo(kx, ky + ks * 1.2); ctx.bezierCurveTo(kx - w * .1, ky + h * .2, kx - w * .2, ky + h * .25, kx - w * .35, h * .9); ctx.stroke(); }
    birds(ctx, w, h, rnd, 3, 'rgba(40,30,50,.45)');
  },
};

/* draw one moment's scene into a canvas (any size) */
export function drawScene(cv, m, opts = {}){
  const ctx = cv.getContext('2d'), w = cv.width, h = cv.height, rnd = mulberry32(((m.seed || 1) >>> 0) ^ 0x51ed);
  const s = opts.scene || sceneFor(m), p = pal(m);
  ctx.save(); ctx.clearRect(0, 0, w, h);
  try { DRAW[s](ctx, w, h, p, rnd, m); } catch (e) { sky(ctx, w, h, [[0, rgb(p.s)], [1, rgb(p.d)]]); }
  vignette(ctx, w, h, .42); if (opts.grain !== false) grain(ctx, w, h, rnd, .045);
  ctx.restore(); return s;
}

/* the whole archive as one poster: weeks as rows of little framed scenes, oldest at the top */
export async function poster(cv, moments, caption){
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  ctx.fillStyle = '#0b0a12'; ctx.fillRect(0, 0, W, H);
  const ms = moments.slice().sort((a, b) => a.t - b.t).slice(-48), n = ms.length, cols = n <= 4 ? 2 : n <= 12 ? 3 : n <= 30 ? 5 : 6;
  const pad = W * .06, top = caption ? H * .12 : pad, gap = W * .014, cw = (W - pad * 2 - gap * (cols - 1)) / cols, ch = cw * 1.25, rows = Math.ceil(n / cols);
  const scale = Math.min(1, (H - top - pad * 1.6) / (rows * ch + (rows - 1) * gap)), cw2 = cw * scale, ch2 = ch * scale, gx = (W - (cols * cw2 + (cols - 1) * gap)) / 2;
  const tile = document.createElement('canvas'); tile.width = Math.round(cw2); tile.height = Math.round(ch2);
  for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); drawScene(tile, ms[i]); const x = gx + c * (cw2 + gap), y = top + r * (ch2 + gap);
    ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, cw2, ch2, cw2 * .08) : ctx.rect(x, y, cw2, ch2); ctx.clip(); ctx.drawImage(tile, x, y); ctx.restore();
    if (i % 6 === 5) await new Promise(r => setTimeout(r, 0)); }
  if (caption) { ctx.fillStyle = 'rgba(243,238,250,.92)'; ctx.font = `italic ${Math.round(W * .06)}px "Instrument Serif", Georgia, serif`; ctx.textAlign = 'left'; ctx.fillText(caption[0], pad, H * .075);
    ctx.fillStyle = 'rgba(243,238,250,.5)'; ctx.font = `${Math.round(W * .024)}px -apple-system, sans-serif`; ctx.textAlign = 'right'; ctx.fillText(caption[1], W - pad, H * .072); }
}
