/* Axon -> Synapse: turn a note (or a selection) into Synapse flashcards, and deliver them into the
   person's Synapse account through Synapse's own sync API (the same records Synapse writes itself,
   so the cards are ordinary cards there: study, spaced repetition, editing, everything).
   Northpeak Studios. No secrets here: the only credential is the person's own Synapse session token. */
(function () {
  'use strict';
  var SYN = 'https://odin-cards.sites.tab.bot';
  var AXON_URL = 'https://northpeakstudios.github.io/axon/';
  var KEY = 'axon.synlink.v1';

  /* the same content filter Synapse applies to imported cards (its users are teens): no dosing amounts,
     nothing sexual/recreational/abuse, no STI or reproductive topics */
  var BAD = /\b(sex(ual\w*|uell\w*|o|y)?|porn\w*|nud(e|ity)|naked|erotic\w*|genital\w*|penis|vagin\w*|vulva|breasts?|nipples?|testic\w*|scrot\w*|uter(us|ine)|ovar(y|ies|ian)|prostat\w*|erectile|viagra|sildenafil|contracept\w*|condoms?|reproductive|intercourse|masturbat\w*|recreational\w*|overdos\w*|abuse\w*|misuse\w*|addict\w*|getting high|euphori\w*|cocaine|heroin|meth|mdma|ecstasy|lsd|ketamine|psilocybin|marijuana|cannabis|weed|syphilis|gonorrh\w*|chlamydia|herpes|hpv|hiv|stis?|stds?|suicid\w*|self-harm)\b|breast|recreational|sexual|\d\s*(mg|mcg|µg|μg|g|ml|units?|iu)\b/i;
  function okText() { return !BAD.test(Array.prototype.join.call(arguments, ' \n ')); }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sq(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  /* inline markdown -> plain text with **bold** kept as a marker */
  function inl(s) {
    return sq(String(s || '')
      .replace(/!\[[^\]\n]*\]\([^)\n]*\)/g, '')                                   // images
      .replace(/!?\[\[([^\]|#\n]+)(?:#[^\]|\n]*)?(?:\|([^\]\n]+))?\]\]/g, function (m, t, a) { return a || t; }) // [[wikilinks]]
      .replace(/\[([^\]]+)\]\((?:[^\s()]|\([^\s()]*\))+\)/g, '$1')               // [text](url)
      .replace(/\[\^[^\]\s]+\]/g, '')                                             // footnote refs
      .replace(/==(?=\S)([^=\n]*?\S)==/g, '**$1**')                               // ==highlight== counts as a key term
      .replace(/__(?=\S)([^_\n]*?\S)__/g, '**$1**')
      .replace(/(^|[^\w*\\])\*(?=[^\s*])([^*\n]*?[^\s*\\])\*(?!\*)/g, '$1$2')     // *italic*
      .replace(/(^|[^\w\\])_(?=\S)([^_\n]*?\S)_(?!\w)/g, '$1$2')
      .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '$1').replace(/`/g, '')
      .replace(/(^|\s)#([A-Za-z][\w\-\/]*)/g, '$1')                               // #tags
      .replace(/\\([\\`*_{}\[\]()#+\-.!|~=<>$^:])/g, '$1'));
  }
  function nob(s) { return sq(String(s || '').replace(/\*\*/g, '')); }
  function norm(s) { return nob(s).toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, '').replace(/\s+/g, ' ').trim(); }

  /* split into sentences, keeping **bold** spans intact */
  function sentences(text) {
    var out = [], buf = '', parts = String(text).match(/[^.!?]+[.!?]*\s*/g) || [text];
    parts.forEach(function (p) { buf += p; if ((buf.match(/\*\*/g) || []).length % 2 === 0) { if (buf.trim()) out.push(buf.trim()); buf = ''; } });
    if (buf.trim()) out.push(buf.trim());
    return out;
  }
  /* "Term: definition", "Term - definition", "Term — definition", "**Term** = definition", "Term = definition" */
  function termDef(t) {
    var m = /^\*\*([^*]{1,70})\*\*\s*(?::|=|—|–|-|→|\u2192)\s*(.{2,400})$/.exec(t);
    if (!m) m = /^([^:=—–→*?]{1,60}?)\s*(?::|\s=|\s—|\s–|\s-|\s→)\s+(.{2,400})$/.exec(t);
    if (!m) return null;
    var term = nob(m[1]).replace(/[:\s]+$/, ''), def = sq(m[2]);
    if (!term || term.split(' ').length > 7 || /^(https?|www)$/i.test(term) || /^\d+$/.test(term)) return null;
    if (nob(def).split(' ').length < 1 || nob(def).length < 2) return null;
    if (/^(note|tip|todo|warning|example|e\.g|i\.e|see|source|date|tags?|aliases)$/i.test(term)) return null;
    return { term: term, def: def };
  }
  function boldHtml(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
  function ctx(path) { return path.filter(Boolean).join(' \u203a '); }

  /* the generator: markdown -> [{kind, type, front, back, sec}]  (front/back are plain text, **bold** kept) */
  function generate(src, opt) {
    opt = opt || {};
    var title = opt.title || '';
    var lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    var i = 0;
    if (lines[0] === '---') { for (var k = 1; k < Math.min(lines.length, 80); k++) if (lines[k] === '---' || lines[k] === '...') { i = k + 1; break; } }
    var out = [], seen = {}, path = [], levels = [], inCode = false;
    var sec = null; // current heading block: {h, level, path, bullets:[], paras:[], defs:0}
    var blocks = [];
    function push(c) {
      var key = c.type + '|' + norm(c.front) + '|' + (c.type === 'cloze' ? '' : norm(c.back));
      if (!norm(c.front) || seen[key]) return; seen[key] = 1; out.push(c);
    }
    function closeSec() { if (sec) blocks.push(sec); sec = null; }
    for (; i < lines.length; i++) {
      var raw = lines[i];
      if (/^\s*(```|~~~)/.test(raw)) { inCode = !inCode; continue; }
      if (inCode) continue;
      var hm = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(raw);
      if (hm) {
        closeSec();
        var lv = hm[1].length, ht = inl(hm[2]);
        while (levels.length && levels[levels.length - 1] >= lv) { levels.pop(); path.pop(); }
        levels.push(lv); path.push(nob(ht));
        sec = { h: nob(ht), level: lv, path: path.slice(), bullets: [], paras: [], defs: 0, explicit: 0 };
        continue;
      }
      var t = raw.replace(/^\s*(?:>\s*)*/, '').replace(/^\[![\w-]+\][+-]?\s*/, '');
      var isBullet = /^\s*(?:>\s*)*(?:[-*+]|\d+[.)])\s+/.test(raw);
      var indent = (/^(\s*)/.exec(raw)[1] || '').replace(/\t/g, '  ').length;
      t = t.replace(/^(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/, '').trim();
      if (!t || /^(-{3,}|\*{3,}|_{3,})$/.test(t) || /^\|/.test(t)) continue;
      var secName = sec ? sec.h : '', where = sec ? ctx(sec.path) : '';
      if (!sec) { sec = { h: '', level: 0, path: [], bullets: [], paras: [], defs: 0, explicit: 0 }; }
      /* 1) cards the person already wrote: question :: answer, and {{c::cloze}} */
      var qi = t.indexOf(' :: ');
      if (qi > 0) {
        var q = inl(t.slice(0, qi)), a = inl(t.slice(qi + 4));
        if (q && a) { push({ kind: 'card', type: 'basic', front: q, back: a, sec: secName, where: where }); sec.explicit++; }
        continue;
      }
      if (/\{\{c\d*::/.test(t)) {
        var n = 0, cz = t.replace(/\{\{c(\d*)::([\s\S]*?)(?:::([^}]*))?\}\}/g, function (m, d, ans, hint) { n++; return '{{c' + (d || n) + '::' + ans + (hint ? '::' + hint : '') + '}}'; });
        push({ kind: 'cloze', type: 'cloze', front: inl(cz), back: '', sec: secName, where: where }); sec.explicit++;
        continue;
      }
      var text = inl(t);
      if (!text) continue;
      /* 2) term: definition lines */
      var td = termDef(text);
      if (td) {
        push({ kind: 'term', type: 'basic', front: td.term, back: td.def, sec: secName, where: where });
        sec.defs++;
        if (isBullet) sec.bullets.push({ text: text, indent: indent, def: true });
        continue;
      }
      if (isBullet) sec.bullets.push({ text: text, indent: indent, def: false });
      else sec.paras.push(text);
      /* 3) key terms in a sentence (**bold** or ==highlight==) become cloze cards */
      if (/\*\*[^*]+\*\*/.test(text)) {
        sentences(text).forEach(function (s) {
          var terms = s.match(/\*\*([^*]{1,60})\*\*/g); if (!terms) return;
          if (nob(s).split(' ').length < 4) return;
          var c = 0, cz2 = s.replace(/\*\*([^*]{1,60})\*\*/g, function (m, x) { c++; return c <= 3 ? '{{c' + c + '::' + x.trim() + '}}' : x; });
          push({ kind: 'cloze', type: 'cloze', front: cz2, back: '', sec: secName, where: where }); sec.cloze = (sec.cloze || 0) + 1;
        });
      }
    }
    closeSec();
    /* 4) headings: a heading with a list under it asks for the list; a heading over a paragraph asks for the gist */
    blocks.forEach(function (b) {
      if (!b.h) return;
      var top = b.bullets.filter(function (x, j) { return x.indent <= (b.bullets[0] ? b.bullets[0].indent : 0); });
      var nonDef = top.filter(function (x) { return !x.def; });
      var par = b.path.length > 1 ? b.path[b.path.length - 2] : '', lc = function (x) { return /^[A-Z][a-z]/.test(x) ? x.charAt(0).toLowerCase() + x.slice(1) : x; };
      var q = /[?]$/.test(b.h) ? b.h : (par ? par + ' \u2014 ' + lc(b.h) : b.h);
      if (top.length >= 2 && nonDef.length >= Math.ceil(top.length / 2) && top.length <= 12) {
        push({ kind: 'list', type: 'basic', front: q + (/[?]$/.test(q) ? '' : '?'), back: top.map(function (x) { return '\u2022 ' + x.text; }).join('\n'), sec: b.h, where: ctx(b.path.slice(0, -1)) });
      } else if (!top.length && b.paras.length && !b.defs && !b.explicit && !b.cloze) {
        var gist = b.paras[0]; if (gist.length > 320) gist = (sentences(gist).slice(0, 2).join(' ') || gist.slice(0, 320));
        if (nob(gist).split(' ').length >= 4) push({ kind: 'gist', type: 'basic', front: /[?]$/.test(q) ? q : 'Explain: ' + q, back: gist, sec: b.h, where: ctx(b.path.slice(0, -1)) });
      }
    });
    /* order: as they appear by section, headings' list cards right after that section's other cards */
    var order = {}; blocks.forEach(function (b, j) { if (!(b.h in order)) order[b.h] = j; });
    out.forEach(function (c, j) { c._o = (order[c.sec] != null ? order[c.sec] : 999) * 1e4 + (c.kind === 'list' || c.kind === 'gist' ? 5e3 : 0) + j; });
    out.sort(function (a, b) { return a._o - b._o; });
    var kept = [], blocked = 0;
    out.forEach(function (c) { delete c._o; if (okText(nob(c.front), nob(c.back), title)) kept.push(c); else blocked++; });
    kept.blocked = blocked;
    return kept;
  }

  /* ---- Synapse records (the exact shapes Synapse's own app.js writes) ---- */
  function rid() { var a = new Uint8Array(9); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return b.toString(36).padStart(2, '0'); }).join('').slice(0, 14); }
  function toHtml(s) { return boldHtml(String(s || '')).replace(/\n/g, '<br>'); }
  function clozeHtml(s) { // keep {{cN::answer}} markers, escape the rest
    var parts = [], last = 0, re = /\{\{c(\d+)::([\s\S]*?)(?:::([^}]*))?\}\}/g, m;
    while ((m = re.exec(s))) { parts.push(boldHtml(s.slice(last, m.index))); parts.push('{{c' + m[1] + '::' + esc(nob(m[2])) + (m[3] ? '::' + esc(m[3]) : '') + '}}'); last = re.lastIndex; }
    parts.push(boldHtml(s.slice(last))); return parts.join('');
  }
  function clozeNums(t) { var s = {}; String(t).replace(/\{\{c(\d+)::/g, function (m, n) { s[+n] = 1; return m; }); var a = Object.keys(s).map(Number).sort(function (x, y) { return x - y; }); return a.length ? a : [1]; }
  /* cards -> push records. deck: {id, name, isNew}. src: {id, title, url} */
  function records(cards, deck, src, tags) {
    var now = Date.now(), recs = [], t = now;
    function rec(k, o) { t++; o.mod = t; recs.push({ k: k, i: o.id, m: t, d: JSON.stringify(o) }); }
    if (deck.isNew) rec('d', { id: deck.id, name: deck.name });
    cards.forEach(function (c, j) {
      var cl = c.type === 'cloze' && /\{\{c\d+::/.test(c.front);
      var note = { id: 'n-ax' + rid(), created: now, deck: deck.id, type: cl ? 'cloze' : 'basic',
        front: cl ? clozeHtml(c.front) : toHtml(c.front), back: toHtml(c.back || ''), tags: (tags || ['axon']).slice(0, 20),
        img: null, imgSide: 'back', imgCredit: null,
        src: src ? { app: 'axon', id: src.id, title: String(src.title || '').slice(0, 200), url: src.url } : null };
      rec('n', note);
      (cl ? clozeNums(c.front) : [0]).forEach(function (o, x) {
        rec('c', { id: note.id + '~' + o, nid: note.id, deck: deck.id, ord: o, st: 0, due: 0, s: 0, d: 0, reps: 0, lapses: 0, last: 0, step: 0, pos: now + j * 10 + x });
      });
    });
    return recs;
  }

  /* ---- the Synapse account link (a session token for the person's own Synapse account) ---- */
  function st() { try { var s = JSON.parse(localStorage.getItem(KEY)); return s && s.tok ? s : null; } catch (e) { return null; } }
  function save(s) { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch (e) {} }
  async function call(path, opt) {
    opt = opt || {};
    var h = { 'x-syn-bearer': '1' }; if (opt.body) h['content-type'] = 'application/json';
    var tok = opt.tok || (st() || {}).tok; if (tok) h.authorization = 'Bearer ' + tok;
    var r; try { r = await fetch(SYN + path, { method: opt.body ? 'POST' : 'GET', headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined, credentials: 'omit', cache: 'no-store' }); }
    catch (e) { var ne = new Error('offline'); ne.offline = true; throw ne; }
    var j = null; try { j = await r.json(); } catch (e) {}
    var code = (j && j.http) || r.status;
    if (!r.ok || !j || !j.ok) { var er = new Error((j && j.error) || ('http_' + r.status)); er.status = code; throw er; }
    return j;
  }
  /* a Synapse token already on this browser (the Synapse web copy on this same site keeps one) */
  function sameSite() {
    try { var tok = localStorage.getItem('acct.tok'), u = JSON.parse(localStorage.getItem('acct.v1') || 'null'); if (tok && /^[A-Za-z0-9_-]{30,100}$/.test(tok) && u && u.email) return { tok: tok, email: u.email }; } catch (e) {}
    return null;
  }
  async function login(email, password) {
    var j = await call('/api/auth/login', { body: { email: String(email || '').trim(), password: String(password || '') }, tok: '-' });
    if (!j.token) throw new Error('no_token');
    var s = { tok: j.token, email: j.user && j.user.email || email, at: Date.now() }; save(s); return s;
  }
  async function check() {
    var s = st(); if (!s) { var ss = sameSite(); if (ss) { try { var me = await call('/api/auth/me', { tok: ss.tok }); if (me.user) { s = { tok: ss.tok, email: me.user.email, at: Date.now(), shared: true }; save(s); return s; } } catch (e) {} } return null; }
    try { var j = await call('/api/auth/me'); if (!j.user) { save(null); return null; } s.email = j.user.email; s.pro = !!j.user.pro; save(s); return s; }
    catch (e) { if (e.offline) return s; if (e.status === 401 || e.status === 403) { save(null); return null; } return s; }
  }
  async function logout() { var s = st(); save(null); if (s && !s.shared) { try { await call('/api/auth/logout', { body: {}, tok: s.tok }); } catch (e) {} } }
  /* the person's decks: a small read-only route; older servers fall back to reading the sync log for deck records */
  async function decks() {
    try { var j = await call('/api/decks'); return (j.decks || []).filter(function (d) { return d && d.name && !d.del; }).sort(function (a, b) { return a.name.localeCompare(b.name); }); }
    catch (e) {
      if (e.status !== 404) throw e;
      var got = {}, since = 0;
      for (var g = 0; g < 40; g++) {
        var p = await call('/api/pull?since=' + since);
        (p.recs || []).forEach(function (r) { if (r.k === 'd') { try { var o = JSON.parse(r.d); got[o.id] = o; } catch (x) {} } });
        since = p.cursor; if (!p.more) break;
      }
      return Object.keys(got).map(function (k) { return got[k]; }).filter(function (d) { return d.name && !d.del; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
  }
  async function send(cards, deck, src, tags) {
    var recs = records(cards, deck, src, tags), done = 0;
    for (var x = 0; x < recs.length; x += 300) { await call('/api/push', { body: { recs: recs.slice(x, x + 300) } }); done += Math.min(300, recs.length - x); }
    return { notes: cards.length, records: done, cards: recs.filter(function (r) { return r.k === 'c'; }).length };
  }

  window.SYNLINK = { SYN: SYN, AXON_URL: AXON_URL, generate: generate, records: records, okText: okText, nob: nob, norm: norm,
    state: st, check: check, login: login, logout: logout, decks: decks, send: send, sameSite: sameSite, newId: function () { return 'd-' + rid(); } };
})();
