// SVG board: squares, cburnett pieces (<use> of inlined symbols), last-move / check / selection highlights, arrows, move badges.
// Tap a square -> onTap(square). Horizontal swipe -> onSwipe(+1|-1). Everything drawn here comes from validated FEN/square data.
import { PIECES } from './vendor/pieces.js?v=2';

const NS = 'http://www.w3.org/2000/svg';
const FILES = 'abcdefgh';
export const THEMES = {
  green: { l: '#ebecd0', d: '#739552', hl: 'rgba(255,255,51,.45)' },
  brown: { l: '#f0d9b5', d: '#b58863', hl: 'rgba(205,210,106,.75)' },
  slate: { l: '#a9b6c4', d: '#4b5d73', hl: 'rgba(94,234,212,.42)' },
};
export const BADGE = { best: ['#81b64c', '★'], excellent: ['#5ec26a', '!'], good: ['#77a3b5', '✓'], inaccuracy: ['#f0c15c', '?!'], mistake: ['#e58f2a', '?'], blunder: ['#ca3431', '??'] };

let defsDone = false;
function ensureDefs() {
  if (defsDone) return; defsDone = true;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  let h = '<defs>';
  for (const [k, v] of Object.entries(PIECES)) h += `<symbol id="cp-${k}" viewBox="0 0 45 45">${v}</symbol>`;
  svg.innerHTML = h + '</defs>';
  document.body.appendChild(svg);
}
export const sq2xy = (sq, flip) => { const f = FILES.indexOf(sq[0]), r = +sq[1] - 1; return flip ? [7 - f, r] : [f, 7 - r]; };
function arrowPath(x1, y1, x2, y2, w = 16, hw = 40, hl = 38) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
  const sx = x1 + ux * 22, sy = y1 + uy * 22, bx = x2 - ux * hl, by = y2 - uy * hl;
  const P = [[sx + px * w / 2, sy + py * w / 2], [bx + px * w / 2, by + py * w / 2], [bx + px * hw / 2, by + py * hw / 2], [x2, y2], [bx - px * hw / 2, by - py * hw / 2], [bx - px * w / 2, by - py * w / 2], [sx - px * w / 2, sy - py * w / 2]];
  return 'M' + P.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
}

export class Board {
  constructor(el, { onTap, onSwipe } = {}) {
    ensureDefs();
    this.el = el; this.onTap = onTap; this.onSwipe = onSwipe;
    this.s = { fen: '8/8/8/8/8/8/8/8 w - - 0 1', flip: false, last: null, arrows: [], sel: null, targets: [], check: null, badge: null, theme: 'green', overlay: null, overlayOpacity: 0.45, marks: [] };
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('viewBox', '0 0 800 800'); this.svg.setAttribute('class', 'board-svg'); this.svg.setAttribute('role', 'img');
    el.appendChild(this.svg);
    let st = null;
    this.svg.addEventListener('pointerdown', e => { st = { x: e.clientX, y: e.clientY, t: Date.now() }; });
    this.svg.addEventListener('pointerup', e => {
      if (!st) return; const dx = e.clientX - st.x, dy = e.clientY - st.y; const s0 = st; st = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) { this.onSwipe && this.onSwipe(dx < 0 ? 1 : -1); return; }
      if (Math.abs(dx) < 14 && Math.abs(dy) < 14) { const sq = this.squareAt(s0.x, s0.y); if (sq && this.onTap) this.onTap(sq); }
    });
    this.svg.addEventListener('pointercancel', () => { st = null; });
  }
  squareAt(cx, cy) {
    const r = this.svg.getBoundingClientRect(); const x = Math.floor((cx - r.left) / r.width * 8), y = Math.floor((cy - r.top) / r.height * 8);
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;
    return this.s.flip ? FILES[7 - x] + (y + 1) : FILES[x] + (8 - y);
  }
  set(p) { Object.assign(this.s, p); this.render(); }
  render() {
    const s = this.s, T = THEMES[s.theme] || THEMES.green, flip = s.flip;
    const rows = s.fen.split(' ')[0].split('/');
    let h = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) h += `<rect x="${x * 100}" y="${y * 100}" width="100" height="100" fill="${(x + y) % 2 ? T.d : T.l}"/>`;
    const hl = sq => { const [x, y] = sq2xy(sq, flip); return `<rect x="${x * 100}" y="${y * 100}" width="100" height="100" fill="${T.hl}"/>`; };
    if (s.last) h += hl(s.last[0]) + hl(s.last[1]);
    if (s.sel) h += hl(s.sel);
    if (s.check) { const [x, y] = sq2xy(s.check, flip); h += `<circle cx="${x * 100 + 50}" cy="${y * 100 + 50}" r="48" fill="rgba(235,40,40,.55)"/>`; }
    for (let i = 0; i < 8; i++) {
      const fx = flip ? FILES[7 - i] : FILES[i], rk = flip ? i + 1 : 8 - i;
      const col = j => (j % 2 ? T.l : T.d);
      h += `<text x="${i * 100 + 94}" y="793" font-size="22" font-weight="700" text-anchor="end" fill="${col(i + 7)}">${fx}</text>`;
      h += `<text x="5" y="${i * 100 + 24}" font-size="22" font-weight="700" fill="${col(i)}">${rk}</text>`;
    }
    if (s.overlay) h += `<image href="${s.overlay}" x="0" y="0" width="800" height="800" preserveAspectRatio="none" opacity="${s.overlayOpacity}"/>`;
    rows.forEach((row, ri) => {
      let fi = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) { fi += +ch; continue; }
        const sq = FILES[fi] + (8 - ri); const [x, y] = sq2xy(sq, flip);
        const id = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toLowerCase();
        if (/^[wb][pnbrqk]$/.test(id)) h += `<use href="#cp-${id}" x="${x * 100}" y="${y * 100}" width="100" height="100"/>`;
        fi++;
      }
    });
    for (const m of s.marks || []) { // squares the screenshot reader wasn't sure about
      if (!/^[a-h][1-8]$/.test(m)) continue; const [x, y] = sq2xy(m, flip);
      h += `<rect x="${x * 100 + 5}" y="${y * 100 + 5}" width="90" height="90" rx="8" fill="none" stroke="#f0b429" stroke-width="6" stroke-dasharray="14 9"/><circle cx="${x * 100 + 78}" cy="${y * 100 + 22}" r="16" fill="#f0b429"/><text x="${x * 100 + 78}" y="${y * 100 + 30}" font-size="22" font-weight="800" text-anchor="middle" fill="#111">?</text>`;
    }
    for (const t of s.targets) { const [x, y] = sq2xy(t.sq, flip); h += t.capture ? `<circle cx="${x * 100 + 50}" cy="${y * 100 + 50}" r="44" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="9"/>` : `<circle cx="${x * 100 + 50}" cy="${y * 100 + 50}" r="15" fill="rgba(0,0,0,.25)"/>`; }
    for (const a of s.arrows) {
      const [x1, y1] = sq2xy(a.from, flip), [x2, y2] = sq2xy(a.to, flip);
      h += `<path d="${arrowPath(x1 * 100 + 50, y1 * 100 + 50, x2 * 100 + 50, y2 * 100 + 50, a.w || 16)}" fill="${a.color || 'rgba(94,234,212,.85)'}" opacity="${a.op || 0.9}"/>`;
    }
    if (s.badge && BADGE[s.badge.cls]) {
      const [x, y] = sq2xy(s.badge.sq, flip), [c, g] = BADGE[s.badge.cls];
      const cx = Math.min(x * 100 + 92, 778), cy = Math.max(y * 100 + 8, 22);
      h += `<circle cx="${cx}" cy="${cy}" r="21" fill="${c}" stroke="#fff" stroke-width="3"/><text x="${cx}" y="${cy + 7}" font-size="${g.length > 1 ? 18 : 22}" font-weight="800" text-anchor="middle" fill="#fff">${g}</text>`;
    }
    this.svg.innerHTML = h;
  }
}
