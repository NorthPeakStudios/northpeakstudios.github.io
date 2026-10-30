// Stockfish wrapper: one Web Worker running the single-threaded lite WASM build (no SharedArrayBuffer, so no COOP/COEP needed).
// Every search is a job; jobs run one at a time, and a cancelled job stops the engine at once.
export const ENGINE_URL = 'engine/stockfish-18-lite-single.js';

function parseInfo(l, turn) {
  const t = l.split(' '), o = { multipv: 1 };
  for (let i = 1; i < t.length; i++) {
    const k = t[i];
    if (k === 'depth') o.depth = +t[++i];
    else if (k === 'seldepth') o.seldepth = +t[++i];
    else if (k === 'multipv') o.multipv = +t[++i];
    else if (k === 'nps') o.nps = +t[++i];
    else if (k === 'nodes') o.nodes = +t[++i];
    else if (k === 'score') {
      const ty = t[++i], v = +t[++i];
      if (ty === 'cp') o.cp = v * turn; else o.mate = v * turn; // stored from White's point of view
      if (t[i + 1] === 'lowerbound' || t[i + 1] === 'upperbound') { o.bound = t[++i]; }
    } else if (k === 'pv') { o.pv = t.slice(i + 1); break; }
  }
  return o.depth && o.pv && o.pv.length ? o : null;
}

export class Engine {
  constructor(url = ENGINE_URL) { this.url = url; this.w = null; this.ready = null; this.ls = new Set(); this.queue = Promise.resolve(); this.opts = {}; this.cur = null; this.loadMs = 0; }
  start() {
    if (this.ready) return this.ready;
    this.ready = new Promise((res, rej) => {
      const t0 = performance.now();
      let w;
      try { w = new Worker(this.url); } catch (e) { rej(e); return; }
      this.w = w;
      w.onmessage = e => { const line = String(e.data); for (const f of [...this.ls]) f(line); };
      w.onerror = e => { e.preventDefault && e.preventDefault(); rej(new Error((e && e.message) || 'The engine could not start on this device.')); };
      const boot = l => {
        if (l === 'uciok') this.send('isready');
        else if (l === 'readyok') { this.ls.delete(boot); this.loadMs = Math.round(performance.now() - t0); res(this); }
      };
      this.ls.add(boot);
      this.send('uci');
    });
    this.ready.catch(() => { this.ready = null; });
    return this.ready;
  }
  send(c) { this.w.postMessage(c); }
  _sync() { return new Promise(r => { const f = l => { if (l === 'readyok') { this.ls.delete(f); r(); } }; this.ls.add(f); this.send('isready'); }); }
  async option(name, val) { if (this.opts[name] === val) return; this.opts[name] = val; this.send(`setoption name ${name} value ${val}`); await this._sync(); }
  newGame() { const run = async () => { await this.start(); this.send('ucinewgame'); await this._sync(); }; const p = this.queue.then(run, run); this.queue = p.catch(() => {}); return p; }
  // analyse(fen, {depth, multipv, onInfo}) -> job; job.promise resolves {bestmove, lines, depth, cancelled} (null if cancelled before start)
  analyse(fen, { depth = 18, multipv = 1, onInfo = null, maxMs = 0 } = {}) {
    const job = { cancelled: false };
    job.cancel = () => { if (job.cancelled) return; job.cancelled = true; if (this.cur === job) this.send('stop'); };
    const run = async () => {
      if (job.cancelled) return null;
      await this.start();
      if (job.cancelled) return null;
      await this.option('MultiPV', multipv);
      if (job.cancelled) return null;
      const turn = fen.split(' ')[1] === 'b' ? -1 : 1;
      return new Promise(res => {
        this.cur = job;
        const lines = []; let depth0 = 0, timer = 0;
        const f = l => {
          if (l.startsWith('info ') && l.includes(' pv ')) {
            const info = parseInfo(l, turn); if (!info) return;
            if (info.bound && lines[info.multipv - 1] && lines[info.multipv - 1].depth >= info.depth) return;
            lines[info.multipv - 1] = info; depth0 = Math.max(depth0, info.depth);
            if (onInfo && !job.cancelled) onInfo({ lines: lines.filter(Boolean), depth: depth0, nps: info.nps || 0 });
          } else if (l.startsWith('bestmove')) {
            this.ls.delete(f); this.cur = null; clearTimeout(timer);
            const bm = l.split(' ')[1];
            res({ bestmove: bm && bm !== '(none)' ? bm : null, lines: lines.filter(Boolean), depth: depth0, cancelled: job.cancelled });
          }
        };
        this.ls.add(f);
        this.send('position fen ' + fen);
        this.send('go depth ' + depth);
        if (maxMs) timer = setTimeout(() => { if (this.cur === job) this.send('stop'); }, maxMs); // per-position time cap (slow phones, mate-heavy positions)
      });
    };
    job.promise = this.queue.then(run, run);
    this.queue = job.promise.catch(() => {});
    return job;
  }
}
