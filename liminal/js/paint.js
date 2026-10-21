// liminal · scenes. every kept moment becomes a small painted scene that depicts how it felt:
// sunrise over hills, a calm sea, a lone streetlight in fog, rain on a window, a storm at sea, a night sky,
// a misty forest, fireworks over the city, wind through a field, snowy peaks, a still lake, city lights, a lamp by
// the window, an empty road, the northern lights, dunes, a lighthouse, above the clouds, a garden. 20 in all. the moment's own colors tint the scene.
import { hexRgb } from './color.js';

const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const rgb = (c, a = 1) => a >= 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const BLACK = [6, 5, 12], WHITE = [255, 250, 244], WARM = [255, 214, 150], NIGHT = [10, 12, 34];

export const SCENES = {
  hills: 'sunrise over the hills', sea: 'a calm sea', streetlight: 'a lone streetlight', rain: 'rain on the window',
  storm: 'a storm at sea', night: 'a night sky', forest: 'a misty forest', fireworks: 'fireworks over the city', field: 'wind through the field', snow: 'snow falling',
  mountains: 'snowy peaks at dawn', lake: 'the moon on a still lake', city: 'city lights at night', room: 'a lamp by the window', road: 'an empty road at night',
  aurora: 'the northern lights', dunes: 'desert dunes at dusk', lighthouse: 'a lighthouse in the fog', clouds: 'above the clouds', garden: 'a garden in bloom'
};
const KEYS = [
  [/\b(angry|mad|furious|pissed|rage|raging|annoyed|annoying|hate|storm|stormy|thunder|lightning|hurricane|chaos|explode|exploding|screaming|yelling|fight|fighting)\b/, 'storm'],
  [/\b(rain|raining|rainy|drizzle|puddle|umbrella|cry|crying|cried|tears)\b/, 'rain'],
  [/\b(lonely|alone|empty|nobody|no one|left out|ignored|isolated)\b/, 'road'],
  [/\b(tired|exhausted|sleepy|drained|after school|homework)\b/, 'room'],
  [/\b(excited|exciting|yay|amazing|best day|new start|fresh|sunrise|sunny|sun|morning|summer|golden)\b/, 'hills'],
  [/\b(aurora|magic|magical|wonder|awe|amazed|dream|dreamy|dreaming|surreal|unreal)\b/, 'aurora'],
  [/\b(lost|confused|unsure|uncertain|searching|guide|anxious|anxiety|nervous|worried|worry|stressed|stress|pressure|scared)\b/, 'lighthouse'],
  [/\b(sad|down|blue|gr[ae]y|heavy|gloomy|hurt|upset)\b/, 'rain'],
  [/\b(miss|missing|memories|remember|nostalgic|wish)\b/, 'lake'],
  [/\b(city|downtown|traffic|busy|lights|crowd|crowded|mall|subway|overwhelmed|overwhelming)\b/, 'city'],
  [/\b(lake|pond|still|quiet|peaceful|peace|calm|serene)\b/, 'lake'],
  [/\b(ocean|sea|beach|waves?|shore|swim|swimming|tide)\b/, 'sea'],
  [/\b(snow|snowing|winter|freezing|frozen|ice|cold|numb)\b/, 'snow'],
  [/\b(mountains?|climb|climbing|peak|ski|skiing|proud|strong|strength|accomplished|achieved)\b/, 'mountains'],
  [/\b(clouds?|flying|fly|plane|floating|float|weightless|light|relieved|relief)\b/, 'clouds'],
  [/\b(flowers?|garden|spring|bloom|blooming|grow|growing|grateful|thankful|love|loved|crush|cute|sweet)\b/, 'garden'],
  [/\b(desert|hot|heat|thirsty|dry|burnt out|burned out|burnout|bored|boring)\b/, 'dunes'],
  [/\b(stars?|moon|night|midnight|3am|2am|1am|4am|insomnia|space|galaxy|sky)\b/, 'night'],
  [/\b(forest|trees?|woods|hike|hiking|fog|foggy|mist|misty|nature)\b/, 'forest'],
  [/\b(concert|party|music|festival|celebrate|celebrating|birthday|won|win|winning|hype|lit|fireworks)\b/, 'fireworks'],
  [/\b(wind|windy|breeze|free|freedom|running|run|bike|biking|field)\b/, 'field'],
  [/\b(streetlight|street|walk|walking|dark)\b/, 'streetlight'],
  [/\b(road|drive|driving|car|bus|trip|travel)\b/, 'road'],
  [/\b(laugh|laughed|laughing|funny|happy|joy|fun|great|good)\b/, 'garden'],
  [/\b(school|class|studying|study|bed|cozy|blanket|tea|coffee|home|room|window|inside|lamp)\b/, 'room'],
];
const CHIP = { foggy: 'forest', electric: 'city', warm: 'hills', distant: 'lake', hollow: 'road', weightless: 'clouds', glowing: 'fireworks', raw: 'storm', tangled: 'lighthouse', tender: 'garden', open: 'mountains', sharp: 'snow' };

export function sceneFor(m){
  if (m.scene && SCENES[m.scene]) return m.scene;
  const t = (m.text || '').toLowerCase();
  if (t) for (const [re, s] of KEYS) if (re.test(t)) return s;
  for (const c of (m.chips || [])) if (CHIP[c]) return CHIP[c];
  const v = m.v, e = m.e, r = mulberry32((m.seed || 7) ^ 0x9e37)(), pick = a => a[Math.floor(r * a.length) % a.length];
  if (Math.hypot(v - .5, e - .45) < .1) return pick(['forest', 'night', 'lake', 'mountains']);
  if (v >= .5 && e < .5) return pick(e < .3 ? ['lake', 'sea', 'clouds', 'hills'] : ['hills', 'garden', 'sea', 'clouds']);
  if (v >= .5) return pick(e > .68 ? ['fireworks', 'city', 'aurora'] : ['field', 'hills', 'mountains', 'garden']);
  if (e < .5) return pick(e < .3 ? ['streetlight', 'snow', 'road', 'room'] : ['rain', 'room', 'lighthouse', 'dunes']);
  return pick(e > .68 ? ['storm', 'storm', 'city'] : ['rain', 'storm', 'lighthouse']);
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
  mountains(ctx, w, h, p, rnd, m){
    const sunC = mix(p.g, WARM, .5), horizon = h * (.5 + rnd() * .06);
    sky(ctx, w, h, [[0, rgb(mix(p.d, NIGHT, .45))], [.35, rgb(mix(p.s, NIGHT, .25))], [.55, rgb(mix(p.s, sunC, .5))], [1, rgb(p.dark)]]);
    stars(ctx, w, h, 25, rnd, .25, .5);
    const sx = w * (.25 + rnd() * .5); glow(ctx, sx, horizon - h * .06, w * .7, sunC, .5);
    for (let L = 0; L < 3; L++) { const t = L / 2, base = horizon + h * (.06 + t * .14), peakH = h * (.32 - t * .1), n = 2 + L + Math.floor(rnd() * 2), col = mix(mix(p.s, NIGHT, .35 + t * .25), p.ink, .2 + t * .6), snow = mix(mix(sunC, WHITE, .55), col, t * .55);
      const pts = [[0, base]]; for (let i = 0; i <= n; i++) { const x = (i + .2 + rnd() * .6) / (n + 1) * w * 1.1 - w * .05; pts.push([x - w * (.12 + rnd() * .06), base - peakH * (.25 + rnd() * .2)]); pts.push([x, base - peakH * (.65 + rnd() * .35)]); } pts.push([w, base - peakH * .3], [w, h], [0, h]);
      ctx.fillStyle = rgb(col); ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill();
      if (L < 2) for (let i = 2; i < pts.length - 3; i += 2) { const [px, py] = pts[i], [lx, ly] = pts[i - 1], [rx, ry] = pts[i + 1] || [px + w * .1, py + peakH * .5], k = .22 + rnd() * .1;
        ctx.fillStyle = rgb(snow, .9 - L * .25); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (rx - px) * k, py + (ry - py) * k); ctx.lineTo(px + (rx - px) * k * .5, py + (ry - py) * k * 1.25); ctx.lineTo(px, py + (ry - py) * k * .9); ctx.lineTo(px + (lx - px) * k * .6, py + (ly - py) * k * 1.15); ctx.lineTo(px + (lx - px) * k, py + (ly - py) * k); ctx.closePath(); ctx.fill(); }
      fog(ctx, w, h, base, h * .035, mix(sunC, WHITE, .45), .22); }
    const tc = rgb(mix(p.ink, BLACK, .3)); for (let i = 0; i < 16; i++) { const x = rnd() * w; pine(ctx, x, h * (.9 + rnd() * .1), h * (.08 + rnd() * .1), tc); }
  },
  lake(ctx, w, h, p, rnd, m){
    const horizon = h * (.52 + rnd() * .05), moonC = mix(p.g, WHITE, .6), skyTop = mix(p.d, NIGHT, .45), skyLow = mix(p.s, NIGHT, .3);
    sky(ctx, w, horizon, [[0, rgb(skyTop)], [1, rgb(skyLow)]]); stars(ctx, w, horizon, 90, rnd, .9);
    const mx = w * (.3 + rnd() * .4), my = horizon * (.28 + rnd() * .2), mr = w * .055; glow(ctx, mx, my, w * .45, moonC, .35); disk(ctx, mx, my, mr, moonC);
    const tc = mix(p.ink, BLACK, .35); ctx.fillStyle = rgb(tc); ctx.fillRect(0, horizon - h * .01, w, h * .012);
    for (let i = 0; i < 60; i++) { const x = (i / 60) * w + rnd() * 6, ht = h * (.03 + rnd() * .06); pine(ctx, x, horizon + 1, ht, rgb(tc)); }
    const gr = ctx.createLinearGradient(0, horizon, 0, h); gr.addColorStop(0, rgb(mix(skyLow, tc, .3))); gr.addColorStop(1, rgb(mix(skyTop, BLACK, .4))); ctx.fillStyle = gr; ctx.fillRect(0, horizon, w, h - horizon);
    ctx.save(); ctx.globalAlpha = .35; for (let i = 0; i < 60; i++) { const x = (i / 60) * w + rnd() * 6, ht = h * (.03 + rnd() * .06); ctx.save(); ctx.translate(0, horizon * 2 + 2); ctx.scale(1, -1); pine(ctx, x, horizon + 1, ht, rgb(tc)); ctx.restore(); } ctx.restore();
    const ry = horizon + (horizon - my);
    for (let i = 0; i < 38; i++) { const t = rnd(), y = horizon + h * .02 + t * (h - horizon) * .85, len = w * (.015 + rnd() * .05) * (1 + t), x = mx + (rnd() - .5) * w * .12 * (1 + t);
      ctx.fillStyle = rgb(moonC, .55 * (1 - t * .6)); ctx.fillRect(x - len / 2, y, len, Math.max(1, h * .003)); }
    glow(ctx, mx, Math.min(h * .95, ry), w * .1, moonC, .25);
    ctx.fillStyle = rgb(mix(tc, BLACK, .4)); const dx = w * (rnd() < .5 ? .08 : .62); ctx.fillRect(dx, h * .86, w * .3, h * .014); for (let k = 0; k < 4; k++) ctx.fillRect(dx + w * .3 * k / 3.2, h * .86, w * .012, h * .07);
  },
  city(ctx, w, h, p, rnd, m){
    const glowC = mix(p.g, WARM, .45);
    sky(ctx, w, h, [[0, rgb(mix(p.d, NIGHT, .5))], [.55, rgb(mix(p.s, NIGHT, .35))], [.82, rgb(mix(p.s, glowC, .4))], [1, rgb(mix(glowC, p.s, .3))]]);
    stars(ctx, w, h, 40, rnd, .4, .6);
    const mx = w * (.15 + rnd() * .7), my = h * (.12 + rnd() * .1); glow(ctx, mx, my, w * .3, mix(p.g, WHITE, .6), .3); disk(ctx, mx, my, w * .04, mix(p.g, WHITE, .7));
    for (let L = 0; L < 3; L++) { const t = L / 2, base = h, col = mix(mix(p.s, NIGHT, .55), p.ink, .3 + t * .6); let x = -rnd() * w * .05;
      while (x < w) { const bw = w * (.06 + rnd() * .1) * (1 + t * .3), bh = h * (.18 + rnd() * .3 - t * .08) + (L === 0 ? h * .12 : 0), top = base - bh - h * (.0 + (2 - L) * .04);
        ctx.fillStyle = rgb(col); ctx.fillRect(x, top, bw, base - top); if (rnd() < .3) ctx.fillRect(x + bw * .4, top - h * .03, bw * .08, h * .03);
        if (L > 0) { const cw = Math.max(2, w / 120), gap = cw * 2.1; for (let yy = top + gap; yy < base - gap; yy += gap) for (let xx = x + gap * .6; xx < x + bw - cw; xx += gap) if (rnd() < (L === 2 ? .28 : .16)) { ctx.fillStyle = rgb(mix(glowC, WHITE, rnd() * .4), .55 + rnd() * .4); ctx.fillRect(xx, yy, cw, cw * 1.2); } }
        x += bw + w * .004; }
      fog(ctx, w, h, h * (.82 + t * .1), h * .05, glowC, .12); }
  },
  room(ctx, w, h, p, rnd, m){
    const wall = mix(p.d, BLACK, .45), lampC = mix(p.g, WARM, .7), rainy = m.v < .55 || rnd() < .4;
    ctx.fillStyle = rgb(wall); ctx.fillRect(0, 0, w, h);
    const lampL = rnd() < .5, ww = w * (.5 + rnd() * .14), wx = lampL ? w - ww - w * (.08 + rnd() * .06) : w * (.08 + rnd() * .06), wy = h * (.08 + rnd() * .06), wh = h * (.46 + rnd() * .1), outTop = rainy ? mix(p.s, NIGHT, .5) : mix(p.s, NIGHT, .3), outLow = rainy ? mix(p.s, p.g, .25) : mix(p.g, WARM, .55);
    const og = ctx.createLinearGradient(0, wy, 0, wy + wh); og.addColorStop(0, rgb(outTop)); og.addColorStop(1, rgb(outLow)); ctx.fillStyle = og; ctx.fillRect(wx, wy, ww, wh);
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    ridge(ctx, w, h, wy + wh * .82, wh * .08, rnd, rgb(mix(outTop, BLACK, .5)));
    for (let i = 0; i < 8; i++) glow(ctx, wx + rnd() * ww, wy + wh * (.7 + rnd() * .2), w * .02, lampC, .5);
    if (rainy) { ctx.strokeStyle = rgb(mix(outLow, WHITE, .5), .35); ctx.lineWidth = Math.max(1, w / 400); for (let i = 0; i < 70; i++) { const x = wx + rnd() * ww, y = wy + rnd() * wh, l = h * (.02 + rnd() * .04); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - l * .15, y + l); ctx.stroke(); }
      for (let i = 0; i < 40; i++) { const x = wx + rnd() * ww, y = wy + rnd() * wh, r = w * (.002 + rnd() * .005); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); } }
    else { stars(ctx, w, h, 20, rnd, .5, .6); const mx = wx + ww * (.2 + rnd() * .6), my = wy + wh * (.15 + rnd() * .2); glow(ctx, mx, my, w * .12, mix(p.g, WHITE, .6), .4); disk(ctx, mx, my, w * .03, mix(p.g, WHITE, .7)); }
    ctx.restore();
    const fr = Math.max(4, w * .022), fc = rgb(mix(wall, BLACK, .5)); ctx.fillStyle = fc; ctx.fillRect(wx - fr, wy - fr, ww + fr * 2, fr); ctx.fillRect(wx - fr, wy + wh, ww + fr * 2, fr * 1.6); ctx.fillRect(wx - fr, wy, fr, wh); ctx.fillRect(wx + ww, wy, fr, wh); ctx.fillRect(wx + ww / 2 - fr / 2, wy, fr, wh); ctx.fillRect(wx, wy + wh / 2 - fr / 2, ww, fr);
    const lx = lampL ? w * .14 : w * .86, ly = h * .5; glow(ctx, lx, ly, w * .7, lampC, .5);
    ctx.fillStyle = rgb(mix(lampC, WHITE, .3)); ctx.beginPath(); ctx.moveTo(lx - w * .07, ly + h * .04); ctx.lineTo(lx + w * .07, ly + h * .04); ctx.lineTo(lx + w * .045, ly - h * .04); ctx.lineTo(lx - w * .045, ly - h * .04); ctx.closePath(); ctx.fill();
    ctx.fillStyle = fc; ctx.fillRect(lx - w * .006, ly + h * .04, w * .012, h * .2);
    const sill = wy + wh + fr * 1.6; ctx.fillStyle = rgb(mix(wall, lampC, .12)); ctx.fillRect(0, h * .78, w, h * .22);
    const px = wx + ww * (.12 + rnd() * .15); ctx.fillStyle = rgb(mix(p.s, BLACK, .6)); ctx.fillRect(px - w * .03, sill - h * .05, w * .06, h * .05);
    ctx.strokeStyle = rgb(mix(p.s, BLACK, .45)); ctx.lineWidth = Math.max(2, w / 110); ctx.lineCap = 'round'; for (let k = 0; k < 6; k++) { const a = -1.57 + (k - 2.5) * .35; ctx.beginPath(); ctx.moveTo(px, sill - h * .05); ctx.quadraticCurveTo(px + Math.cos(a) * w * .05, sill - h * .1, px + Math.cos(a) * w * .09, sill - h * .05 - Math.abs(Math.sin(a)) * h * .1); ctx.stroke(); }
    const mx2 = wx + ww * (.6 + rnd() * .2); ctx.fillStyle = rgb(mix(lampC, wall, .55)); ctx.fillRect(mx2, sill - h * .035, w * .04, h * .035); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(mx2 + w * (.012 + k * .014), sill - h * .045); ctx.bezierCurveTo(mx2 + w * (.0 + k * .014), sill - h * .07, mx2 + w * (.03 + k * .014), sill - h * .08, mx2 + w * (.015 + k * .014), sill - h * .1); ctx.stroke(); }
  },
  road(ctx, w, h, p, rnd, m){
    const horizon = h * (.46 + rnd() * .05), lampC = mix(p.g, WARM, .6), vx = w * (.42 + rnd() * .16);
    sky(ctx, w, horizon, [[0, rgb(mix(p.d, NIGHT, .55))], [1, rgb(mix(p.s, NIGHT, .3))]]); stars(ctx, w, horizon, 70, rnd, .85);
    ridge(ctx, w, h, horizon, h * .03, rnd, rgb(mix(p.s, NIGHT, .6)), .4);
    ctx.fillStyle = rgb(mix(p.ink, BLACK, .2)); ctx.fillRect(0, horizon, w, h - horizon);
    ctx.fillStyle = rgb(mix(p.ink, p.s, .15)); ctx.beginPath(); ctx.moveTo(vx - w * .01, horizon); ctx.lineTo(vx + w * .01, horizon); ctx.lineTo(w * 1.05, h); ctx.lineTo(-w * .25, h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgb(mix(lampC, WHITE, .4), .7); for (let i = 0; i < 9; i++) { const t0 = Math.pow(i / 9, 1.8), t1 = Math.pow((i + .45) / 9, 1.8), y0 = horizon + t0 * (h - horizon), y1 = horizon + t1 * (h - horizon), x0 = vx + (w * .4 - vx) * t0, x1 = vx + (w * .4 - vx) * t1, wd0 = w * .003 + t0 * w * .012, wd1 = w * .003 + t1 * w * .012;
      ctx.beginPath(); ctx.moveTo(x0 - wd0, y0); ctx.lineTo(x0 + wd0, y0); ctx.lineTo(x1 + wd1, y1); ctx.lineTo(x1 - wd1, y1); ctx.closePath(); ctx.fill(); }
    const side = rnd() < .5 ? 1 : -1, n = 4;
    for (let i = n - 1; i >= 0; i--) { const t = Math.pow((i + .6) / n, 1.6), by = horizon + t * (h - horizon) * .95, bx = vx + side * (w * .04 + t * w * .36), ph = h * (.04 + t * .42), top = by - ph;
      if (i === n - 1 || rnd() < .85) { ctx.fillStyle = rgb(mix(p.ink, BLACK, .4)); ctx.fillRect(bx - Math.max(1, t * w * .006), top, Math.max(1.5, t * w * .012), ph); ctx.fillRect(bx - side * t * w * .06, top, side * t * w * .06 || 1, Math.max(1, t * w * .008));
        const hx = bx - side * t * w * .06; glow(ctx, hx, top + t * h * .01, w * (.08 + t * .35), lampC, .7); disk(ctx, hx, top + t * h * .012, Math.max(1, t * w * .012), mix(lampC, WHITE, .7));
        ctx.save(); ctx.translate(hx, by); ctx.scale(1, .25); glow(ctx, 0, 0, w * (.04 + t * .3), lampC, .35); ctx.restore(); } }
    fog(ctx, w, h, horizon, h * .03, mix(p.s, WHITE, .2), .2);
  },
  aurora(ctx, w, h, p, rnd, m){
    const horizon = h * .66, c1 = mix([90, 255, 170], p.s, .2), c2 = mix([180, 120, 255], p.g, .25);
    sky(ctx, w, h, [[0, rgb(mix(p.d, NIGHT, .7))], [.6, rgb(mix(p.d, NIGHT, .35))], [1, rgb(mix(p.s, NIGHT, .5))]]); stars(ctx, w, h, 110, rnd, .7);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let band = 0; band < 3; band++) { const base = h * (.22 + band * .1 + rnd() * .06), amp = h * (.05 + rnd() * .06), f = 1 + rnd() * 1.6, ph = rnd() * 6, col = band % 2 ? c2 : c1, ht = h * (.16 + rnd() * .14);
      for (let x = 0; x <= w; x += Math.max(1, w / 170)) { const u = x / w, y = base + Math.sin(u * f * 6.28 + ph) * amp + Math.sin(u * 13 + ph * 2) * amp * .2, a = 1.7 * (.05 + .12 * Math.pow(Math.sin(u * 9 + ph) * .5 + .5, 2)) * (1 - band * .25) * (.55 + .45 * Math.sin(x * .7 + band));
        const gr = ctx.createLinearGradient(0, y - ht, 0, y); gr.addColorStop(0, rgb(col, 0)); gr.addColorStop(.75, rgb(col, a)); gr.addColorStop(.97, rgb(mix(col, WHITE, .3), a * 1.2)); gr.addColorStop(1, rgb(col, 0)); ctx.fillStyle = gr; ctx.fillRect(x, y - ht, Math.max(1.5, w / 150), ht); } }
    ctx.restore();
    const snowC = mix(mix(p.s, WHITE, .35), NIGHT, .35); ridge(ctx, w, h, horizon, h * .1, rnd, rgb(mix(p.ink, NIGHT, .3)), 1.2);
    const gg = ctx.createLinearGradient(0, horizon, 0, h); gg.addColorStop(0, rgb(snowC)); gg.addColorStop(1, rgb(mix(snowC, NIGHT, .5))); ctx.fillStyle = gg; ctx.fillRect(0, horizon + h * .06, w, h);
    ctx.save(); ctx.globalAlpha = .25; ctx.globalCompositeOperation = 'screen'; glow(ctx, w * .5, horizon + h * .15, w * .6, c1, .5); ctx.restore();
    const tc = rgb(mix(p.ink, BLACK, .4)); for (let i = 0; i < 7; i++) pine(ctx, w * (rnd() < .5 ? rnd() * .3 : .7 + rnd() * .3), h * (.8 + rnd() * .15), h * (.08 + rnd() * .12), tc);
  },
  dunes(ctx, w, h, p, rnd, m){
    const sunC = mix(p.g, WARM, .75), horizon = h * (.5 + rnd() * .05);
    sky(ctx, w, h, [[0, rgb(mix(p.s, NIGHT, .45))], [.4, rgb(mix(p.s, sunC, .5))], [.55, rgb(mix(sunC, WHITE, .3))], [1, rgb(mix(sunC, p.d, .5))]]);
    const sx = w * (.25 + rnd() * .5), sy = horizon - h * .04; glow(ctx, sx, sy, w * .6, sunC, .6); disk(ctx, sx, sy, w * .1, mix(sunC, WHITE, .5));
    for (let L = 0; L < 4; L++) { const t = L / 3, base = horizon + h * (.02 + t * .3), amp = h * (.06 + t * .03), ph = rnd() * 6, f = .6 + rnd() * .8, lit = mix(mix(sunC, p.s, .25 + t * .2), p.d, .1 + t * .45), shade = mix(lit, p.ink, .45);
      const ys = []; for (let x = 0; x <= w; x += w / 80) ys.push([x, base - amp * (Math.sin(x / w * f * 6.28 + ph) * .5 + .5)]);
      const dg = ctx.createLinearGradient(0, base - amp, 0, base + h * .14); dg.addColorStop(0, rgb(mix(lit, WHITE, .12))); dg.addColorStop(1, rgb(shade)); ctx.fillStyle = dg; ctx.beginPath(); ctx.moveTo(0, h); ys.forEach(q => ctx.lineTo(q[0], q[1])); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgb(mix(sunC, WHITE, .5), .35); ctx.lineWidth = Math.max(1, w / 300); ctx.beginPath(); ys.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); }
    if (rnd() < .6) { const cx = w * (.15 + rnd() * .7), cy = h * .9, ch = h * .1; ctx.fillStyle = rgb(mix(p.ink, BLACK, .3)); ctx.fillRect(cx - w * .012, cy - ch, w * .024, ch); ctx.fillRect(cx - w * .045, cy - ch * .6, w * .015, ch * .3); ctx.fillRect(cx - w * .045, cy - ch * .6, w * .045, w * .014); ctx.fillRect(cx + w * .03, cy - ch * .75, w * .015, ch * .35); ctx.fillRect(cx, cy - ch * .45, w * .045, w * .014); }
  },
  lighthouse(ctx, w, h, p, rnd, m){
    const horizon = h * .62, beamC = mix(p.g, WARM, .55), side = rnd() < .5 ? 1 : -1, lx = w * (.5 + side * .22), top = h * .22;
    sky(ctx, w, horizon, [[0, rgb(mix(p.d, NIGHT, .5))], [1, rgb(mix(p.s, NIGHT, .35))]]); stars(ctx, w, horizon, 30, rnd, .6, .5);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; const ang = side > 0 ? Math.PI + (rnd() - .5) * .3 : (rnd() - .5) * .3, len = w * 1.3;
    const bg = ctx.createRadialGradient(lx, top, 0, lx, top, len); bg.addColorStop(0, rgb(beamC, .55)); bg.addColorStop(1, rgb(beamC, 0)); ctx.fillStyle = bg;
    ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(lx + Math.cos(ang - .12) * len, top + Math.sin(ang - .12) * len); ctx.lineTo(lx + Math.cos(ang + .12) * len, top + Math.sin(ang + .12) * len); ctx.closePath(); ctx.fill(); ctx.restore();
    glow(ctx, lx, top, w * .25, beamC, .6);
    const gr = ctx.createLinearGradient(0, horizon, 0, h); gr.addColorStop(0, rgb(mix(p.s, p.d, .5))); gr.addColorStop(1, rgb(p.ink)); ctx.fillStyle = gr; ctx.fillRect(0, horizon, w, h - horizon);
    ctx.strokeStyle = rgb(mix(p.s, WHITE, .2), .15); ctx.lineWidth = Math.max(1, w / 300); for (let i = 0; i < 16; i++) { const y = horizon + Math.pow((i + 1) / 17, 1.4) * (h - horizon), x = rnd() * w; ctx.beginPath(); ctx.moveTo(x - w * .1, y); ctx.quadraticCurveTo(x, y - h * .006, x + w * .1, y); ctx.stroke(); }
    const rock = rgb(mix(p.ink, BLACK, .35)); ctx.fillStyle = rock; ctx.beginPath(); ctx.moveTo(lx - side * w * .45, h); ctx.lineTo(lx - side * w * .2, horizon + h * .02); ctx.lineTo(lx - side * w * .05, horizon - h * .02); ctx.lineTo(lx + side * w * .1, horizon - h * .01); ctx.lineTo(lx + side * w * .2, horizon + h * .05); ctx.lineTo(lx + side * w * .35, h); ctx.closePath(); ctx.fill();
    const bw0 = w * .055, bw1 = w * .035, base = horizon - h * .015, tc = mix(WHITE, p.d, .3), sc = mix(p.g, [200, 60, 70], .5);
    for (let k = 0; k < 4; k++) { const y0 = top + h * .03 + (base - top - h * .03) * k / 4, y1 = top + h * .03 + (base - top - h * .03) * (k + 1) / 4, a0 = bw1 + (bw0 - bw1) * k / 4, a1 = bw1 + (bw0 - bw1) * (k + 1) / 4;
      ctx.fillStyle = rgb(k % 2 ? sc : tc); ctx.beginPath(); ctx.moveTo(lx - a0, y0); ctx.lineTo(lx + a0, y0); ctx.lineTo(lx + a1, y1); ctx.lineTo(lx - a1, y1); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = rgb(mix(BLACK, p.d, .3)); ctx.fillRect(lx - bw1 * 1.25, top + h * .022, bw1 * 2.5, h * .012); disk(ctx, lx, top, bw1 * .9, mix(beamC, WHITE, .7));
    ctx.fillStyle = rgb(mix(BLACK, p.d, .3)); ctx.beginPath(); ctx.moveTo(lx - bw1 * 1.1, top - h * .012); ctx.lineTo(lx + bw1 * 1.1, top - h * .012); ctx.lineTo(lx, top - h * .045); ctx.closePath(); ctx.fill();
    fog(ctx, w, h, horizon + h * .02, h * .06, mix(p.s, WHITE, .35), .25); fog(ctx, w, h, h * .4, h * .1, mix(p.s, WHITE, .3), .1);
  },
  clouds(ctx, w, h, p, rnd, m){
    const sunC = mix(p.g, WARM, .5);
    sky(ctx, w, h, [[0, rgb(mix(p.s, NIGHT, .35))], [.45, rgb(mix(p.s, sunC, .35))], [.62, rgb(mix(sunC, WHITE, .4))], [1, rgb(mix(p.s, WHITE, .3))]]);
    const sx = w * (.3 + rnd() * .4), sy = h * (.38 + rnd() * .08); glow(ctx, sx, sy, w * .8, sunC, .55); disk(ctx, sx, sy, w * .07, mix(sunC, WHITE, .6));
    birds(ctx, w, h, rnd, 2 + Math.floor(rnd() * 3), rgb(mix(p.d, BLACK, .3), .6));
    for (let L = 0; L < 4; L++) { const t = L / 3, y = h * (.5 + t * .15), lit = mix(mix(sunC, WHITE, .55), p.s, .1 + t * .35), sh = mix(lit, p.d, .3);
      for (let i = 0; i < 14; i++) { const x = (i / 13) * w * 1.2 - w * .1 + (rnd() - .5) * w * .08, r = w * (.07 + rnd() * .07) * (1 + t * .4), yy = y + (rnd() - .5) * h * .03;
        const g2 = ctx.createRadialGradient(x - r * .3, yy - r * .4, r * .1, x, yy, r); g2.addColorStop(0, rgb(mix(lit, WHITE, .3))); g2.addColorStop(1, rgb(sh)); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, yy, r, 0, 7); ctx.fill(); }
      const bg2 = ctx.createLinearGradient(0, y, 0, h); bg2.addColorStop(0, rgb(sh)); bg2.addColorStop(1, rgb(mix(sh, p.d, .35))); ctx.fillStyle = bg2; ctx.fillRect(0, y + h * .02, w, h); }
    fog(ctx, w, h, h * .52, h * .05, mix(sunC, WHITE, .6), .3);
  },
  garden(ctx, w, h, p, rnd, m){
    const sunC = mix(p.g, WARM, .45), horizon = h * .55, f1 = mix(p.g, [255, 140, 170], .45), f2 = mix(p.s, [255, 230, 140], .45), f3 = mix(p.g, WHITE, .5);
    sky(ctx, w, h, [[0, rgb(mix(p.s, WHITE, .1))], [.5, rgb(mix(sunC, WHITE, .45))], [1, rgb(mix(p.s, p.d, .4))]]);
    glow(ctx, w * (.7 + rnd() * .2), h * .15, w * .7, sunC, .6);
    for (let i = 0; i < 12; i++) glow(ctx, rnd() * w, h * (.1 + rnd() * .4), w * (.02 + rnd() * .04), mix(sunC, WHITE, .6), .35);
    ridge(ctx, w, h, horizon, h * .04, rnd, rgb(mix(p.s, p.d, .35)), .5); ridge(ctx, w, h, horizon + h * .08, h * .03, rnd, rgb(mix(p.s, p.d, .55)), .5);
    const gr = ctx.createLinearGradient(0, horizon + h * .1, 0, h); gr.addColorStop(0, rgb(mix(p.s, p.d, .5))); gr.addColorStop(1, rgb(p.ink)); ctx.fillStyle = gr; ctx.fillRect(0, horizon + h * .1, w, h);
    for (let i = 0; i < 70; i++) { const t = Math.pow(rnd(), .7), x = rnd() * w, base = horizon + h * .12 + t * (h - horizon) * .95, sz = w * (.01 + t * .045), stem = sz * (2 + rnd() * 2.5), col = [f1, f2, f3][Math.floor(rnd() * 3)];
      ctx.strokeStyle = rgb(mix(p.s, p.ink, .5)); ctx.lineWidth = Math.max(1, sz * .18); ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + (rnd() - .5) * sz, base - stem * .5, x, base - stem); ctx.stroke();
      const n = 5; for (let k = 0; k < n; k++) { const a = k / n * 6.28 + rnd(); ctx.fillStyle = rgb(mix(col, p.d, (1 - t) * .25)); ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * sz * .5, base - stem + Math.sin(a) * sz * .5, sz * .45, sz * .3, a, 0, 7); ctx.fill(); }
      disk(ctx, x, base - stem, sz * .25, mix(f2, WARM, .5)); }
    for (let i = 0; i < 40; i++) { const x = rnd() * w, b = h, l = h * (.04 + rnd() * .08); ctx.strokeStyle = rgb(mix(p.s, p.ink, .65)); ctx.lineWidth = Math.max(1, w / 250); ctx.beginPath(); ctx.moveTo(x, b); ctx.quadraticCurveTo(x + (rnd() - .5) * w * .03, b - l * .6, x + (rnd() - .5) * w * .05, b - l); ctx.stroke(); }
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
