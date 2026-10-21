/* Axon · Northpeak Studios · v1.6.19 */
(function () {
  'use strict';
  var VERSION = '1.6.19';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var esc = MD.esc;
  var viewEl = $('#view'), layer = $('#layer');
  var notes = new Map(), folders = new Set(), titleIdx = new Map(), trash = new Map();
  var settings = { fs: 17, accent: '#ff6a3d', newPerDay: 20, discoverNet: true };
  var ui = { open: {}, lastNote: null, graphMode: 'global', graphTags: false, sort: 'edited' };
  var ACCENTS = [['Red-orange', '#ff6a3d'], ['Amber', '#f5a524'], ['Lime', '#a3e635'], ['Mint', '#34d399'], ['Sky', '#38bdf8'], ['Violet', '#a78bfa'], ['Pink', '#f472b6']];
  var SIZES = [['S', 15], ['M', 17], ['L', 19], ['XL', 21]];
  var editing = null, graphCtl = null, currentHash = null, scrollMem = {};

  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    chev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    folder: '<svg class="fi" viewBox="0 0 24 24"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/></svg>',
    doc: '<svg class="fi" viewBox="0 0 24 24"><path d="M7 3.5h7l4.5 4.5v12.5H7z"/><path d="M14 3.5V8h4.5"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    graph: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="7" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M8.2 7.2l2.7 8.6M15.9 8.4l-2.8 7.6M8.4 6.2l7.2.6"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    newfolder: '<svg viewBox="0 0 24 24"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/><path d="M12 10.5v6M9 13.5h6"/></svg>',
    newnote: '<svg viewBox="0 0 24 24"><path d="M7 3.5h7l4.5 4.5v12.5H7z"/><path d="M12.5 11v6M9.5 14h6"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    fit: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    zin: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>',
    zout: '<svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
    check: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M8 12.5l2.8 2.8L16.5 9"/></svg>',
    quote: '<svg viewBox="0 0 24 24"><path d="M5 18V6M10 8h9M10 12h9M10 16h6"/></svg>',
    cal: '<svg class="fi" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>',
    img: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 3.5 3 3-2.5L20 17"/></svg>',
    tagi: '<svg class="fi" viewBox="0 0 24 24"><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3-8.7 8.7z"/><circle cx="8" cy="8" r="1.4"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M9 3.5h6l-1 5.5 3.5 3.5v1.5h-11V12.5L10 9z"/><path d="M12 14v6.5"/></svg>',
    undo: '<svg viewBox="0 0 24 24"><path d="M9 7L4.5 11.5 9 16"/><path d="M5 11.5h9.5a5 5 0 0 1 0 10H12"/></svg>',
    redo: '<svg viewBox="0 0 24 24"><path d="M15 7l4.5 4.5L15 16"/><path d="M19 11.5H9.5a5 5 0 0 0 0 10H12"/></svg>',
    outline: '<svg viewBox="0 0 24 24"><path d="M4 6h16M8 12h12M12 18h8"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15M10 7V4.5h4V7M6.5 7l1 13h9l1-13"/></svg>',
    recall: '<svg viewBox="0 0 24 24"><rect x="3.5" y="6.5" width="13" height="13" rx="2.5"/><path d="M7.5 3.5h10a3 3 0 0 1 3 3v10"/><path d="M8 13.5l1.8 1.8 3.7-3.8"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/></svg>',
    tmpl: '<svg viewBox="0 0 24 24"><rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>',
    indent: '<svg viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10M4 9l3 3-3 3"/></svg>',
    outdent: '<svg viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10M7 9l-3 3 3 3"/></svg>',
    hl: '<svg viewBox="0 0 24 24"><path d="M9 15l-3 3h5l1-1"/><path d="M9 15l7.5-9.5 3 2.5L12 17z"/></svg>',
    restore: '<svg viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9"/></svg>',
    compass: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
    ext: '<svg viewBox="0 0 24 24"><path d="M14 4.5h5.5V10M19.5 4.5L11 13M17 13.5v5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7h5"/></svg>',
    cmd: '<svg viewBox="0 0 24 24"><path d="M9 9V6.5A2.5 2.5 0 1 0 6.5 9H9zm0 0h6m-6 0v6m6-6V6.5A2.5 2.5 0 1 1 17.5 9H15zm0 0v6m0 0h-6m6 0v2.5a2.5 2.5 0 1 0 2.5-2.5H15zm-6 0v2.5A2.5 2.5 0 1 1 6.5 15H9z"/></svg>'
  };

  /* ---------- helpers ---------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function norm(t) { return String(t || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
  function rebuildIdx() { titleIdx = new Map(); notes.forEach(function (n) { titleIdx.set(norm(n.title), n); }); }
  function byTitle(t) { return titleIdx.get(norm(t)) || null; }
  function linksOf(n) {
    if (n._lk && n._lkv === n.body) return n._lk;
    n._lk = MD.links(n.body); n._lkv = n.body; return n._lk;
  }
  function outNotes(n) {
    var seen = {}, out = [];
    linksOf(n).forEach(function (l) { var t = byTitle(l.target); if (t && t !== n && !seen[t.id]) { seen[t.id] = 1; out.push(t); } });
    return out;
  }
  function unresolvedOf(n) {
    var seen = {}, out = [];
    linksOf(n).forEach(function (l) { var t = norm(l.target); if (!t || byTitle(t) || seen[t]) return; seen[t] = 1; out.push(l.target.trim().replace(/\s+/g, ' ')); });
    return out;
  }
  function ghostCounts() {
    var g = {};
    notes.forEach(function (n) { unresolvedOf(n).forEach(function (t) { var k = norm(t); if (!g[k]) g[k] = { title: t, n: 0, from: [] }; g[k].n++; g[k].from.push(n.id); }); });
    return g;
  }
  /* ---------- auto-link: plain-text mentions of other notes' titles and aliases ---------- */
  var AL = { re: null, map: null, sig: '', ver: 0, cache: {} };
  var PROT = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`|\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)|\[[^\]]*\]\([^)]*\)|<[^>\n]+>|https?:\/\/[^\s)]+|axon-img:\S+|^#{1,6} .*$|^\s*(?:[-*]\s+)?\w[\w -]*::.*$/gm;
  function aliasesOf(n) {
    if (n.body.slice(0, 3) !== '---') return [];
    var f = MD.front(n.body); if (!f) return [];
    var out = [];
    f.props.forEach(function (p) { if (/^alias(es)?$/i.test(p.k)) p.v.split(/\s*,\s*/).forEach(function (a) { a = a.replace(/^["'\[]+|["'\]]+$/g, '').trim(); if (a) out.push(a); }); });
    return out;
  }
  function noteNames(n) { return [n.title].concat(aliasesOf(n)); }
  /* the text of a note split into protected spans (code, links, urls, headings, front matter, card lines) and plain spans */
  function segments(body) {
    var out = [], last = 0, m, src = String(body);
    var fm = src.slice(0, 3) === '---' ? MD.front(src) : null;
    if (fm) { var endIdx = src.split('\n').slice(0, fm.end + 1).join('\n').length; out.push({ p: 1, t: src.slice(0, endIdx), at: 0 }); last = endIdx; }
    PROT.lastIndex = last;
    while ((m = PROT.exec(src))) {
      if (m.index > last) out.push({ p: 0, t: src.slice(last, m.index), at: last });
      out.push({ p: 1, t: m[0], at: m.index }); last = m.index + m[0].length;
      if (!m[0].length) PROT.lastIndex++;
    }
    if (last < src.length) out.push({ p: 0, t: src.slice(last), at: last });
    return out;
  }
  function ensureAL() {
    var names = [];
    notes.forEach(function (n) { if (inTemplates(n)) return; noteNames(n).forEach(function (nm) { nm = nm.trim(); if (nm.length >= 2 && !/^\d+$/.test(nm)) names.push([nm, n.id]); }); });
    var sig = names.map(function (e) { return e[1] + '\u0001' + e[0]; }).sort().join('\u0002');
    if (sig === AL.sig && AL.re !== undefined) return;
    AL.sig = sig; AL.ver++; AL.cache = {};
    names.sort(function (a, b) { return b[0].length - a[0].length || a[0].localeCompare(b[0]); });
    AL.map = {}; names.forEach(function (e) { var k = norm(e[0]); if (!(k in AL.map)) AL.map[k] = e[1]; });
    var uniq = {}; var alts = names.map(function (e) { return norm(e[0]); }).filter(function (k) { if (uniq[k]) return false; uniq[k] = 1; return true; });
    AL.re = alts.length ? new RegExp('(^|[^\\w\\[#/@])(' + alts.map(function (k) { return escRe(k).replace(/ /g, '[ \\t]+'); }).join('|') + ')(?![\\w\\]])', 'gi') : null;
  }
  /* mentions in n of other notes that are not already [[linked]] from n: one per target, first occurrence */
  function mentionsOf(n) {
    ensureAL();
    var c = AL.cache[n.id]; if (c && c.body === n.body) return c.hits;
    var hits = [];
    if (AL.re && !inTemplates(n)) {
      var self = {}; noteNames(n).forEach(function (nm) { self[norm(nm)] = 1; });
      var explicit = {}; outNotes(n).forEach(function (o) { explicit[o.id] = 1; });
      var seen = {};
      segments(n.body).forEach(function (seg) {
        if (seg.p) return;
        AL.re.lastIndex = 0; var m;
        while ((m = AL.re.exec(seg.t))) {
          var key = norm(m[2]), id = AL.map[key];
          if (!id || id === n.id || self[key] || explicit[id] || seen[id] || !notes.has(id)) continue;
          seen[id] = 1; hits.push({ id: id, text: m[2], at: seg.at + m.index + m[1].length });
        }
      });
    }
    AL.cache[n.id] = { body: n.body, hits: hits };
    return hits;
  }
  function autoOut(n) { return mentionsOf(n).map(function (h) { return notes.get(h.id); }).filter(Boolean); }
  function autoIn(n) {
    var out = [];
    notes.forEach(function (o) { if (o === n) return; var h = mentionsOf(o).filter(function (x) { return x.id === n.id; })[0]; if (h) out.push({ note: o, text: h.text, at: h.at }); });
    return out.sort(function (a, b) { return a.note.title.localeCompare(b.note.title); });
  }
  function unlinkedMentions(n) { return autoIn(n); }
  function mentionSnippet(src, hit) {
    var s = String(src), a = hit.at, b = a + hit.text.length;
    var ls = s.lastIndexOf('\n', a - 1) + 1, le = s.indexOf('\n', b); if (le < 0) le = s.length;
    var start = Math.max(ls, a - 50), end = Math.min(le, b + 60);
    return (start > ls ? '\u2026' : '') + esc(MD.plain(s.slice(start, a))) + '<mark>' + esc(hit.text) + '</mark>' + esc(MD.plain(s.slice(b, end))) + (end < le ? '\u2026' : '');
  }
  /* write [[links]] for the given hits (first mention of each note); returns the new body */
  function applyHits(body, hits) {
    var s = String(body), hs = hits.slice().sort(function (a, b) { return b.at - a.at; });
    hs.forEach(function (h) {
      var t = notes.get(h.id); if (!t) return;
      if (s.substr(h.at, h.text.length) !== h.text) return;
      var link = h.text === t.title ? '[[' + t.title + ']]' : '[[' + t.title + '|' + h.text + ']]';
      s = s.slice(0, h.at) + link + s.slice(h.at + h.text.length);
    });
    return s;
  }
  function linkMention(o, title) {
    var t = byTitle(title); if (!t) return 0;
    var hits = mentionsOf(o).filter(function (h) { return h.id === t.id; });
    if (!hits.length) return 0;
    o.body = applyHits(o.body, hits); touch(o);
    return hits.length;
  }
  async function autoLinkAll() { if (!proOk('Auto-link')) return;
    ensureAL();
    var plan = [], count = 0;
    notes.forEach(function (o) { var h = mentionsOf(o); if (h.length) { plan.push([o, h]); count += h.length; } });
    if (!count) { toast('Nothing to link \u2014 every mention is already a link'); return; }
    var ok = await dialog({ title: 'Auto-link ' + count + ' mention' + (count === 1 ? '' : 's') + '?', message: 'The first mention of each note inside ' + plan.length + ' note' + (plan.length === 1 ? '' : 's') + ' becomes a [[link]]. Code, headings and existing links are left alone. You can undo this from Settings.', ok: 'Link them' });
    if (!ok) return;
    var backup = { ts: Date.now(), count: count, notes: [] };
    plan.forEach(function (pr) { var o = pr[0], nb = applyHits(o.body, pr[1]); backup.notes.push({ id: o.id, before: o.body, after: nb }); });
    try { await DB.put('meta', { k: 'autolink-backup', v: backup }); } catch (e) { toast('Couldn\u2019t save a backup, nothing changed'); return; }
    backup.notes.forEach(function (b) { var o = notes.get(b.id); if (o) { snapshot(o, o.body, true); o.body = b.after; lastSaved[o.id] = b.after; touch(o); } });
    alBackup = backup;
    toast('Linked ' + count + ' mention' + (count === 1 ? '' : 's') + ' in ' + plan.length + ' note' + (plan.length === 1 ? '' : 's'));
    render();
  }
  var alBackup = null;
  async function undoAutoLink() {
    var b = alBackup; if (!b) { toast('Nothing to undo'); return; }
    var restorable = b.notes.filter(function (x) { var o = notes.get(x.id); return o && o.body === x.after; });
    var skipped = b.notes.length - restorable.length;
    if (!restorable.length) { toast(skipped ? 'Those notes were edited since, so nothing was undone' : 'Nothing to undo'); return; }
    var ok = await dialog({ title: 'Undo auto-link?', message: 'Removes the links added ' + agoLong(b.ts) + ' from ' + restorable.length + ' note' + (restorable.length === 1 ? '' : 's') + (skipped ? ' (' + skipped + ' edited since, left as is)' : '') + '.', ok: 'Undo' });
    if (!ok) return;
    restorable.forEach(function (x) { var o = notes.get(x.id); o.body = x.before; lastSaved[o.id] = x.before; touch(o); });
    alBackup = null; DB.del('meta', 'autolink-backup');
    toast('Undone in ' + restorable.length + ' note' + (restorable.length === 1 ? '' : 's'));
    render();
  }
  function backlinks(n) {
    var key = norm(n.title), out = [];
    notes.forEach(function (o) {
      if (o === n) return;
      if (linksOf(o).some(function (l) { return norm(l.target) === key; })) out.push(o);
    });
    return out.sort(function (a, b) { return a.title.localeCompare(b.title); });
  }
  function ago(ts) {
    var s = (Date.now() - ts) / 1000;
    if (s < 45) return 'now';
    if (s < 3600) return Math.round(s / 60) + 'm';
    if (s < 86400) return Math.round(s / 3600) + 'h';
    if (s < 86400 * 7) return Math.round(s / 86400) + 'd';
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function agoLong(ts) { var a = ago(ts); return a === 'now' ? 'just now' : (/\d$/.test(a) ? a : a + ' ago'); }
  function words(s) { var m = MD.plain(s).match(/\S+/g); return m ? m.length : 0; }
  function folderName(p) { return p ? p.split('/').pop() : ''; }
  function parentOf(p) { var i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i); }
  function crumbOf(p) { return p ? p.split('/').join(' / ') + ' /' : '/'; }
  /* top-level folders as tabs (a zip's folders land here): All + one tab per folder, shown once there are two or more */
  function folderTabs(active) {
    var tops = childFolders('').filter(function (f) { return f !== TEMPLATES; });
    if (tops.length < 2) return '';
    return '<div class="ftabs" role="tablist"><button class="ftab' + (active ? '' : ' on') + '" role="tab" data-act="ftab" data-path="">All</button>' +
      tops.map(function (f) { return '<button class="ftab' + (active === f ? ' on' : '') + '" role="tab" data-act="ftab" data-path="' + esc(f) + '">' + esc(folderName(f)) + '<i>' + countIn(f) + '</i></button>'; }).join('') + '</div>';
  }
  function ftabsIntoView() { var on = $('.ftabs .ftab.on'), bar = $('.ftabs'); if (on && bar) bar.scrollLeft = Math.max(0, on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2); }
  function countIn(p) { var c = 0; notes.forEach(function (n) { if (n.folder === p || n.folder.indexOf(p + '/') === 0) c++; }); return c; }
  function childFolders(p) {
    return Array.from(folders).filter(function (f) { return parentOf(f) === p; }).sort(function (a, b) { return a.localeCompare(b); });
  }
  var SORTS = { edited: 'Last edited', created: 'Date created', az: 'Name A\u2013Z' };
  function sorter(a, b) {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
    if (ui.sort === 'az') return a.title.localeCompare(b.title, undefined, { numeric: true });
    if (ui.sort === 'created') return (b.created || 0) - (a.created || 0);
    return b.updated - a.updated;
  }
  function notesIn(p) { return Array.from(notes.values()).filter(function (n) { return n.folder === p; }).sort(sorter); }
  function pinnedNotes() { return Array.from(notes.values()).filter(function (n) { return n.pinned; }).sort(function (a, b) { return a.title.localeCompare(b.title); }); }
  function recent(k) { return Array.from(notes.values()).sort(function (a, b) { return b.updated - a.updated; }).slice(0, k || 1e9); }
  function snippetHTML(body, max) {
    max = max || 140;
    var hasImg = MD.IMG.test(body || ''); MD.IMG.lastIndex = 0;
    var lines = MD.stripFront(body).replace(/```[\s\S]*?(```|$)/g, '').replace(/^\[\^[^\]]+\]:.*$/gm, '').replace(MD.IMG, '').replace(/\{\{c\d*::([^}]*?)(?:::[^}]*)?\}\}/g, '$1').split('\n')
      .map(function (l) { return l.replace(/^\s*(?:>\s?)+(\[![\w-]+\][+-]?\s*)?/, '').replace(/^\s*!\[\[([^\]|]+).*$/, '$1'); })
      .filter(function (l) { return l.trim() && !/^#{1,6}\s/.test(l) && !/^\s*\|?\s*:?-{2,}/.test(l) && !/^\s*\|.*\|\s*$/.test(l) && !/^\s*(```|\$\$|---)\s*$/.test(l); });
    var t = lines.join(' ').replace(/\s+/g, ' ').trim();
    if (!t) return '<span style="opacity:.6">' + (hasImg ? 'Image' : 'Empty note') + '</span>';
    return inlineSnippet(t.slice(0, max * 1.6), max);
  }
  function inlineSnippet(t, max) {
    var parts = [], last = 0, m, re = new RegExp(MD.WL.source, 'g'), len = 0, out = '';
    while ((m = re.exec(t))) { parts.push([t.slice(last, m.index), 0]); parts.push([(m[3] || m[1]).trim(), 1]); last = re.lastIndex; }
    parts.push([t.slice(last), 0]);
    for (var i = 0; i < parts.length && len < max; i++) {
      var s = parts[i][1] ? parts[i][0] : parts[i][0].replace(/^\s*>\s?(\[!\w+\]\s*)?/g, '').replace(/(^|\s)([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/g, '$1').replace(/\[([^\]]+)\]\((?:[^\s()]|\([^\s()]*\))+\)/g, '$1').replace(/[\s\S]*/, MD.unmark);
      if (len + s.length > max) s = s.slice(0, max - len) + '…';
      len += s.length;
      out += parts[i][1] ? '<em>' + esc(s) + '</em>' : esc(s);
    }
    return out;
  }
  function backlinkSnippet(src, title) {
    var re = new RegExp('\\[\\[\\s*' + escRe(title) + '\\s*(#[^\\]|\\n]*)?(\\|[^\\]\\n]*)?\\]\\]', 'i');
    var lines = String(src).replace(MD.IMG, '').split('\n');
    for (var i = 0; i < lines.length; i++) {
      var m = re.exec(lines[i]);
      if (m) {
        var line = lines[i], idx = m.index;
        var start = Math.max(0, idx - 50), end = Math.min(line.length, idx + m[0].length + 60);
        var cut = line.slice(start, end);
        // keep wikilinks whole at the edges
        return (start > 0 ? '…' : '') + inlineSnippet(cut.replace(/^[^\[]*\]\]/, ''), 200) + (end < line.length ? '…' : '');
      }
    }
    return '';
  }
  function checkTitle(t, except) {
    t = String(t || '').trim().replace(/\s+/g, ' ');
    if (!t) return 'Give it a name.';
    if (/[\[\]|#^\\\/:]/.test(t)) return 'Names can\u2019t use [ ] | # ^ / \\ or :';
    if (t.length > 120) return 'That name is too long.';
    var ex = byTitle(t);
    if (ex && ex !== except) return 'A note called \u201c' + ex.title + '\u201d already exists.';
    return null;
  }
  function uniqueTitle(base) {
    if (!byTitle(base)) return base;
    for (var i = 2; ; i++) if (!byTitle(base + ' ' + i)) return base + ' ' + i;
  }
  /* daily notes */
  var DAILY = 'Daily', DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/, autoDaily = {};
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dayOf(t) { var m = DAY_RE.exec(t || ''); if (!m) return null; var d = new Date(+m[1], +m[2] - 1, +m[3]); return ymd(d) === t ? d : null; }
  function shiftDay(t, k) { var d = dayOf(t); d.setDate(d.getDate() + k); return ymd(d); }
  function isDaily(n) { return !!(n && dayOf(n.title)); }
  function dayLabel(t, long) { var d = dayOf(t); return d ? d.toLocaleDateString(undefined, long ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' }) : t; }
  function openDaily(t, replace) { if (!proOk('Daily notes')) return;
    t = t || ymd(new Date());
    var n = byTitle(t);
    if (!n) { n = createNote({ title: t, folder: DAILY, body: dailyBody(t) }); if (t !== ymd(new Date()) && !n.body.trim()) autoDaily[n.id] = 1; }
    go('#/n/' + n.id, replace);
  }
  function dailyBody(t) {
    if (!settings.dailyTmpl) return '';
    var tp = allTemplates().filter(function (x) { return x.name === settings.dailyTmpl; })[0];
    if (!tp) return '';
    var d = dayOf(t) || new Date();
    return String(tp.body).replace(/\{\{date\}\}/g, t).replace(/\{\{title\}\}/g, t).replace(/\{\{time\}\}/g, String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
  }
  /* quick jot: one line appended to today's note with the time, without opening the editor */
  async function jot() { if (!proOk('Daily notes')) return;
    var text = await dialog({ title: 'Jot to today\u2019s note', input: true, placeholder: 'A thought, a task, a link\u2026', ok: 'Add', validate: function (v) { return v.trim() ? null : 'Type something first.'; } });
    if (!text) return;
    var t = ymd(new Date()), n = byTitle(t);
    if (!n) n = createNote({ title: t, folder: DAILY, body: dailyBody(t) });
    var d = new Date(), hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    var line = '- ' + hm + ' ' + text.trim();
    var body = n.body.replace(/\s+$/, '');
    n.body = (body ? body + '\n' : '') + line + '\n';
    lastSaved[n.id] = n.body; touch(n);
    if (route().v === 'note' && route().id === n.id && !editing) renderNote(n.id);
    toast('Added to today\u2019s note', { label: 'Open', fn: function () { go('#/n/' + n.id); } });
  }
  /* month calendar for daily notes */
  function openCalendar(day) { if (!proOk('Daily notes')) return;
    var d = dayOf(day) || new Date(), today = ymd(new Date());
    var y = d.getFullYear(), mo = d.getMonth();
    var has = {}; notes.forEach(function (n) { if (isDaily(n) && n.body.trim()) has[n.title] = 1; });
    /* week starts on the locale's first day (Sunday in the US, Monday in most of Europe) */
    var wk0 = 1; try { var L = new Intl.Locale(navigator.language || 'en-US'), wi = L.getWeekInfo ? L.getWeekInfo() : L.weekInfo; if (wi && wi.firstDay) wk0 = wi.firstDay % 7; else if (/^en-(US|CA)|^(ja|ko|zh|pt-BR|he)/i.test(navigator.language)) wk0 = 0; } catch (e) {}
    return overlay(function (done) {
      var el = document.createElement('div'); el.className = 'sheet cal'; el.setAttribute('role', 'dialog');
      function draw() {
        var first = new Date(y, mo, 1), start = (first.getDay() - wk0 + 7) % 7, days = new Date(y, mo + 1, 0).getDate();
        var h = '<div class="calh"><button data-c="prev" aria-label="Previous month">' + I.back + '</button><b>' + first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) + '</b><button data-c="next" aria-label="Next month">' + I.chev + '</button></div>' +
          '<div class="calg">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S', 'S', 'M', 'T', 'W', 'T', 'F', 'S'].slice(wk0, wk0 + 7).map(function (w) { return '<span class="wd">' + w + '</span>'; }).join('');
        for (var i = 0; i < start; i++) h += '<span></span>';
        for (var k = 1; k <= days; k++) {
          var key = ymd(new Date(y, mo, k));
          h += '<button data-day="' + key + '" class="' + (key === today ? 'td ' : '') + (key === day ? 'cur ' : '') + (has[key] ? 'has' : '') + '"><span>' + k + '</span></button>';
        }
        h += '</div><div class="calf"><button data-c="today">Go to today</button><button data-c="close">Close</button></div>';
        el.innerHTML = h;
      }
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.c === 'prev') { mo--; if (mo < 0) { mo = 11; y--; } draw(); }
        else if (b.dataset.c === 'next') { mo++; if (mo > 11) { mo = 0; y++; } draw(); }
        else if (b.dataset.c === 'today') done(today);
        else if (b.dataset.c === 'close') done(null);
        else if (b.dataset.day) done(b.dataset.day);
      });
      draw();
      return el;
    }).then(function (pick) { if (pick) openDaily(pick, route().v === 'note' && isDaily(notes.get(route().id))); });
  }
  /* empty daily notes opened only by the prev/next arrows are tidied away when you leave them */
  function tidyDaily(keepId) {
    Object.keys(autoDaily).forEach(function (id) {
      if (id === keepId) return;
      var n = notes.get(id); delete autoDaily[id];
      if (n && !n.body.trim() && n.folder === DAILY && isDaily(n) && !backlinks(n).length) deleteNote(n);
    });
  }
  /* tags */
  function tagCounts() { var tc = {}; notes.forEach(function (n) { MD.tags(n.body).forEach(function (t) { tc[t] = (tc[t] || 0) + 1; }); }); return tc; }
  function tagChips(tc, max) {
    var tags = Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a] || a.localeCompare(b); });
    var more = max && tags.length > max ? tags.length - max : 0;
    return '<div class="tagwrap">' + tags.slice(0, max || 1e9).map(function (t) { return '<button class="chip" data-act="stag" data-tag="' + esc(t) + '">#' + esc(t) + ' <span class="n">' + tc[t] + '</span></button>'; }).join('') +
      (more ? '<button class="chip" data-act="gosearch">+' + more + '</button>' : '') + '</div>';
  }
  /* images */
  var imgURL = {};
  function hydrateImgs(root) {
    (root || viewEl).querySelectorAll('img[data-img]:not([src])').forEach(function (el) {
      var id = el.dataset.img;
      if (imgURL[id]) { el.src = imgURL[id]; return; }
      IMG.get(id).then(function (r) {
        if (!r) { el.classList.add('missing'); el.alt = 'Image not found'; return; }
        imgURL[id] = imgURL[id] || URL.createObjectURL(new Blob([r.data], { type: r.type || 'image/jpeg' }));
        el.src = imgURL[id];
      }).catch(function () { el.classList.add('missing'); });
    });
  }
  function dropImages(ids) {
    if (!ids.length) return;
    var used = {}; notes.forEach(function (n) { MD.images(n.body).forEach(function (i) { used[i] = 1; }); }); trash.forEach(function (n) { MD.images(n.body).forEach(function (i) { used[i] = 1; }); });
    var gone = ids.filter(function (i) { return !used[i]; });
    if (gone.length) IMG.del(gone).catch(function () {});
    gone.forEach(function (i) { if (imgURL[i]) { URL.revokeObjectURL(imgURL[i]); delete imgURL[i]; } });
  }
  function loadImage(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { res({ im: im, url: u }); };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('That file isn\u2019t an image this device can read')); };
      im.src = u;
    });
  }
  async function storeImage(file) {
    var L = await loadImage(file), im = L.im, w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, 1600 / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
    var c = document.createElement('canvas'); c.width = cw; c.height = ch;
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch); g.drawImage(im, 0, 0, cw, ch);
    URL.revokeObjectURL(L.url);
    var blob = await new Promise(function (r) { c.toBlob(r, 'image/jpeg', 0.82); });
    if (!blob) throw new Error('Couldn\u2019t compress that image');
    var id = 'i' + uid(), data = await blob.arrayBuffer();
    await IMG.put({ id: id, data: data, type: 'image/jpeg', w: cw, h: ch, created: Date.now() });
    return id;
  }
  /* flashcards (question :: answer) */
  function cardText(s) {
    return String(s).replace(MD.IMG, '').replace(new RegExp(MD.WL.source, 'g'), function (m, t, h, a) { return (a || t).trim(); })
      .replace(/\[([^\]\n]+)\]\([^)]+\)/g, '$1').replace(/\*\*|__|~~|==|`/g, '').replace(/(^|[^\w*])[*_](\S(?:[^*_\n]*\S)?)[*_](?!\w)/g, '$1$2').replace(/\s+/g, ' ').trim();
  }
  function slugTag(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
  function cardsCSV(list) {
    var q = function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; }, rows = ['front,back,tags'], c = 0;
    list.forEach(function (n) {
      var tg = MD.tags(n.body).map(function (t) { return t.replace(/\//g, '-'); }), st = slugTag(n.title);
      if (st && !/^\d/.test(st)) tg.push(st);
      MD.cards(n.body).forEach(function (cd) {
        var f = cardText(cd.q), b = cardText(cd.a);
        if (f && b) { rows.push([f, b, tg.join(' ')].map(q).join(',')); c++; }
      });
    });
    return { csv: '\uFEFF' + rows.join('\r\n') + '\r\n', count: c };
  }
  function exportCards(n) { if (!proOk('Flashcard export')) return;
    var list = n ? [n] : Array.from(notes.values()).sort(function (a, b) { return a.title.localeCompare(b.title); });
    var r = cardsCSV(list);
    if (!r.count) { toast(n ? 'No cards here. Write a line like: question :: answer' : 'No cards yet. Write lines like: question :: answer'); return; }
    deliver(new Blob([r.csv], { type: 'text/csv' }), (n ? safeName(n.title) : 'Axon flashcards') + '.csv', 'text/csv', 'Exported ' + r.count + ' card' + (r.count === 1 ? '' : 's') + ' · import the file in Synapse');
  }
  function persist() { try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {} }
  function saveMeta() { DB.put('meta', { k: 'ui', v: { open: ui.open, lastNote: ui.lastNote, graphMode: ui.graphMode, graphTags: ui.graphTags, graphGhosts: ui.graphGhosts, graphAuto: ui.graphAuto, graphColor: ui.graphColor, sort: ui.sort } }); }

  /* ---------- data ops ---------- */
  function ensureFolder(p) {
    if (!p) return [];
    var made = [], parts = p.split('/'), acc = '';
    parts.forEach(function (x) { acc = acc ? acc + '/' + x : x; if (!folders.has(acc)) { folders.add(acc); made.push({ path: acc }); } if (sy.fg && sy.fg[acc]) { delete sy.fg[acc]; sySave(); } });
    if (made.length) DB.putMany('folders', made);
    return made;
  }
  function putNote(n) {
    var o = { id: n.id, title: n.title, folder: n.folder, body: n.body, created: n.created, updated: n.updated, seed: !!n.seed };
    if (n.pinned) o.pinned = true;
    if (n.trashed) o.trashed = n.trashed;
    if (n.rf) o.rf = n.rf;
    sySoon();
    return DB.put('notes', o).catch(saveFailed);
  }
  /* a write that still fails after the storage layer's own reconnect: say so instead of losing it quietly */
  var saveFailT = 0;
  function saveFailed(e) {
    if (Date.now() - saveFailT > 15000) {
      saveFailT = Date.now();
      toast(/Quota/i.test(String(e && (e.name + e.message))) ? 'This phone is out of storage space, so that change wasn\u2019t saved' : 'Couldn\u2019t save that change. Close Axon and open it again, your text is still here', { label: 'Back up', fn: function () { exportVault(); } });
    }
    try { console.error('save failed', e); } catch (x) {}
  }
  function createNote(o) {
    var now = Date.now();
    var n = { id: o.id || uid(), title: o.title, folder: o.folder || '', body: o.body || '', created: o.created || now, updated: o.updated || now, seed: !!o.seed };
    ensureFolder(n.folder);
    notes.set(n.id, n); rebuildIdx();
    putNote(n); persist();
    return n;
  }
  function touch(n) { n.updated = Date.now(); n.seed = false; putNote(n); recallSoon(); }
  function renameNote(n, newTitle) {
    newTitle = newTitle.trim().replace(/\s+/g, ' ');
    var err = checkTitle(newTitle, n);
    if (err) return { error: err };
    var old = n.title;
    if (old === newTitle) return { changed: 0 };
    var re = new RegExp('\\[\\[\\s*' + escRe(old) + '\\s*((?:#[^\\]|\\n]*)?)((?:\\|[^\\]\\n]*)?)\\]\\]', 'gi');
    var changed = 0;
    notes.forEach(function (o) {
      var nb = o.body.replace(re, function (m, h, a) { return '[[' + newTitle + h + a + ']]'; });
      if (nb !== o.body) { o.body = nb; changed++; if (o !== n) { o.updated = Date.now(); putNote(o); } }
    });
    /* notes in Trash keep working links too, so restoring one never brings back a dead link */
    trash.forEach(function (o) {
      var nb = o.body.replace(re, function (m, h, a) { return '[[' + newTitle + h + a + ']]'; });
      if (nb !== o.body) { o.body = nb; putNote(o); }
    });
    n.title = newTitle; n.updated = Date.now(); n.seed = false;
    putNote(n); rebuildIdx();
    return { changed: changed };
  }
  /* hard delete: only for empty auto-made daily notes, trash purge and "empty trash" */
  function deleteNote(n) { syTomb(n.id); notes.delete(n.id); trash.delete(n.id); rebuildIdx(); DB.del('notes', n.id); dropImages(MD.images(n.body)); if (ui.lastNote === n.id) { ui.lastNote = null; saveMeta(); } recallSoon(); }
  var TRASH_DAYS = 30;
  function trashNote(n) {
    notes.delete(n.id); n.trashed = Date.now(); n.pinned = false; trash.set(n.id, n); rebuildIdx(); putNote(n);
    if (ui.lastNote === n.id) { ui.lastNote = null; saveMeta(); }
    recallSoon();
  }
  function restoreNote(n) {
    trash.delete(n.id); delete n.trashed;
    if (byTitle(n.title)) n.title = uniqueTitle(n.title + ' (restored)');
    if (n.folder) ensureFolder(n.folder);
    notes.set(n.id, n); rebuildIdx(); putNote(n); recallSoon();
    return n;
  }
  function purgeTrash(all) {
    var cut = Date.now() - TRASH_DAYS * 864e5, gone = [];
    trash.forEach(function (n) { if (all || n.trashed < cut) gone.push(n); });
    if (!gone.length) return 0;
    gone.forEach(function (n) { trash.delete(n.id); syTomb(n.id); });
    DB.delMany('notes', gone.map(function (n) { return n.id; }));
    dropImages([].concat.apply([], gone.map(function (n) { return MD.images(n.body); })));
    return gone.length;
  }
  function moveNote(n, folder) { ensureFolder(folder); n.folder = folder; n.updated = Date.now(); n.seed = false; putNote(n); }
  function renameFolder(p, name) {
    var np = (parentOf(p) ? parentOf(p) + '/' : '') + name;
    var oldF = Array.from(folders).filter(function (f) { return f === p || f.indexOf(p + '/') === 0; });
    var addF = oldF.map(function (f) { return np + f.slice(p.length); });
    oldF.forEach(function (f) { folders.delete(f); });
    addF.forEach(function (f) { folders.add(f); if (sy.fg) delete sy.fg[f]; });
    syFolderGone(oldF);
    DB.delMany('folders', oldF); DB.putMany('folders', addF.map(function (f) { return { path: f }; }));
    var ch = [];
    notes.forEach(function (n) { if (n.folder === p || n.folder.indexOf(p + '/') === 0) { n.folder = np + n.folder.slice(p.length); ch.push(n); } });
    ch.forEach(putNote);
    var o2 = {}; Object.keys(ui.open).forEach(function (k) { o2[(k === p || k.indexOf(p + '/') === 0) ? np + k.slice(p.length) : k] = ui.open[k]; }); ui.open = o2; saveMeta();
    return np;
  }
  function deleteFolder(p, keepNotes) {
    var par = parentOf(p);
    var oldF = Array.from(folders).filter(function (f) { return f === p || f.indexOf(p + '/') === 0; });
    oldF.forEach(function (f) { folders.delete(f); delete ui.open[f]; });
    DB.delMany('folders', oldF); syFolderGone(oldF);
    var hit = Array.from(notes.values()).filter(function (n) { return n.folder === p || n.folder.indexOf(p + '/') === 0; });
    if (keepNotes) hit.forEach(function (n) { n.folder = par; putNote(n); });
    else hit.forEach(trashNote);
    saveMeta();
    return hit.length;
  }
  /* Earlier versions shipped example notes. On update, remove the ones never edited,
     plus any of their folders left empty. Anything written or edited stays. */
  var OLD_STARTER = { notes: {"Welcome to Axon": "", "Dopamine pathways": "Neuropharm/Dopamine", "Mesolimbic pathway": "Neuropharm/Dopamine", "Mesocortical pathway": "Neuropharm/Dopamine", "Nigrostriatal pathway": "Neuropharm/Dopamine", "Basal ganglia": "Neuroanatomy", "Substantia nigra": "Neuroanatomy", "Prefrontal cortex": "Neuroanatomy", "Parkinson's disease": "Clinical cases", "Action potentials": "Neurophysiology", "Ion channels": "Neuropharm/Receptors & channels", "Myelin": "Neurophysiology", "Synapses": "Neurophysiology", "Neurotransmitters": "Neuropharm", "Receptors": "Neuropharm/Receptors & channels", "Study plan": "Daily notes"}, folders: ["Neuroanatomy", "Neurophysiology", "Neuropharm", "Neuropharm/Dopamine", "Neuropharm/Receptors & channels", "Clinical cases", "Daily notes"] };
  function removeOldStarter() {
    var hit = Array.from(notes.values()).filter(function (n) {
      return n.seed && Object.prototype.hasOwnProperty.call(OLD_STARTER.notes, n.title) && OLD_STARTER.notes[n.title] === n.folder;
    });
    hit.forEach(function (n) { notes.delete(n.id); });
    if (hit.length) DB.delMany('notes', hit.map(function (n) { return n.id; }));
    rebuildIdx();
    var gone = [];
    OLD_STARTER.folders.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (f) {
      if (folders.has(f) && countIn(f) === 0 && childFolders(f).length === 0) { folders.delete(f); delete ui.open[f]; gone.push(f); }
    });
    if (gone.length) DB.delMany('folders', gone);
    if (ui.lastNote && !notes.has(ui.lastNote)) ui.lastNote = null;
    saveMeta();
    return hit.length;
  }

  /* ---------- overlays ---------- */
  /* a sheet or picker left open when the page changes underneath it (back gesture, a link) is closed instead of floating over the new page */
  var openOverlays = [];
  window.addEventListener('hashchange', function () { var now = Date.now(); openOverlays.slice().forEach(function (o) { if (now - o.t > 400) o.done(); }); });
  function overlay(build) {
    return new Promise(function (resolve) {
      var scrim = document.createElement('div'); scrim.className = 'scrim';
      var box = build(done);
      layer.appendChild(scrim); layer.appendChild(box);
      requestAnimationFrame(function () { scrim.classList.add('show'); box.classList.add('show'); });
      scrim.addEventListener('click', function () { done(null); });
      var closed = false;
      function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); done(null); } }
      document.addEventListener('keydown', onKey);
      var rec = { t: Date.now(), done: function () { done(null); } }; openOverlays.push(rec);
      function done(v) {
        if (closed) return; closed = true;
        openOverlays = openOverlays.filter(function (x) { return x !== rec; });
        document.removeEventListener('keydown', onKey);
        scrim.classList.remove('show'); box.classList.remove('show');
        setTimeout(function () { scrim.remove(); box.remove(); }, 230);
        resolve(v);
      }
    });
  }
  function sheet(o) {
    return overlay(function (done) {
      var el = document.createElement('div'); el.className = 'sheet'; el.setAttribute('role', 'dialog');
      var h = '';
      if (o.title || o.message) h += '<div class="st">' + (o.title ? '<b>' + esc(o.title) + '</b>' : '') + (o.message ? esc(o.message) : '') + '</div>';
      o.actions.forEach(function (a, i) { h += '<button class="sa' + (a.danger ? ' danger' : '') + (o.left ? ' left' : '') + '" data-i="' + i + '">' + (a.icon || '') + esc(a.label) + '</button>'; });
      h += '<button class="sa cancel" data-i="-1">Cancel</button>';
      el.innerHTML = h;
      el.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var i = +b.dataset.i; done(i < 0 ? null : o.actions[i].value); });
      return el;
    });
  }
  function dialog(o) {
    return overlay(function (done) {
      var el = document.createElement('div'); el.className = 'dialog'; el.setAttribute('role', 'dialog');
      el.innerHTML = '<h4>' + esc(o.title) + '</h4>' + (o.message ? '<p>' + esc(o.message) + '</p>' : '') + (o.html || '') +
        (o.input ? '<input type="text" autocomplete="off" autocapitalize="sentences" spellcheck="false" enterkeyhint="done"><div class="err"></div>' : '') +
        '<div class="db">' + (o.noCancel ? '' : '<button data-v="0">' + esc(o.cancel || 'Cancel') + '</button>') + '<button class="acc" data-v="1"' + (o.danger ? ' style="background:#ff5a52;border-color:#ff5a52"' : '') + '>' + esc(o.ok || 'OK') + '</button></div>';
      var inp = $('input', el), err = $('.err', el);
      if (inp) { inp.value = o.value || ''; inp.placeholder = o.placeholder || ''; setTimeout(function () { inp.focus(); inp.select(); }, 60); }
      function submit() {
        if (!inp) return done(true);
        var v = inp.value.trim().replace(/\s+/g, ' ');
        var e = o.validate ? o.validate(v) : (v ? null : 'Type a name.');
        if (e) { err.textContent = e; return; }
        done(v);
      }
      el.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.v === '1') submit(); else done(inp ? null : false); });
      if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      return el;
    });
  }
  var toastT;
  function toast(msg, act) {
    var t = $('#toast'); t.textContent = msg; t.classList.toggle('act', !!act);
    if (act) { var b = document.createElement('button'); b.textContent = act.label; b.addEventListener('click', function () { t.classList.remove('show'); clearTimeout(toastT); act.fn(); }); t.appendChild(b); }
    t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, act ? 5200 : 2200);
  }

  /* ---------- routing ---------- */
  var depth = 0;
  function go(hash, replace) {
    if (location.hash === hash) { render(); return; }
    if (replace) { history.replaceState(null, '', hash); }
    else { history.pushState(null, '', hash); depth++; }
    render();
  }
  function back(fallback) {
    if (depth > 0) { depth--; history.back(); }
    else go(fallback || '#/', true);
  }
  window.addEventListener('popstate', function () { if (depth > 0) depth--; render(); });
  window.addEventListener('hashchange', function () { if (location.hash !== currentHash) render(); });

  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    var p = h.split('/');
    if (!h) return { v: 'vault' };
    if (p[0] === 'n') return { v: 'note', id: decodeURIComponent(p[1] || '') };
    if (p[0] === 'f') return { v: 'folder', path: decodeURIComponent(p.slice(1).join('/')) };
    if (p[0] === 'graph') return { v: 'graph' };
    if (p[0] === 'search') return { v: 'search', q: decodeURIComponent(p.slice(1).join('/')) };
    if (p[0] === 'settings') return { v: 'settings' };
    if (p[0] === 'today') return { v: 'today' };
    if (p[0] === 'recall') return { v: 'recall' };
    if (p[0] === 'review') return { v: 'review', deck: decodeURIComponent(p[1] || 'all'), mode: p[2] || '' };
    if (p[0] === 'trash') return { v: 'trash' };
    if (p[0] === 'tasks') return { v: 'tasks' };
    if (p[0] === 'discover') return { v: 'discover', id: decodeURIComponent(p[1] || '') };
    if (p[0] === 'guide') return { v: 'guide' };
    return { v: 'vault' };
  }
  function setTab(t) { document.querySelectorAll('.tb').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === t); }); }
  function setFab(on) { document.body.classList.toggle('nofab', !on); }

  function render() {
    if (currentHash !== null) scrollMem[currentHash] = viewEl.scrollTop;
    if (viewEl.classList.contains('dview')) dKeepFeed();
    if (editing) stopEditing(true);
    if (graphCtl) { graphCtl.destroy(); graphCtl = null; }
    closePeek(); closeFind();
    document.body.classList.remove('reviewing');
    if (ds && ds.ctrl) { ds.ctrl.abort(); ds = null; }
    if (dObs) { dObs.disconnect(); dObs = null; }
    currentHash = location.hash;
    var r = route();
    tidyDaily(r.v === 'note' ? r.id : null);
    viewEl.className = '';
    var tab = { vault: 'notes', folder: 'notes', note: 'notes', graph: 'graph', search: 'notes', settings: 'settings', recall: 'notes', review: 'notes', trash: 'notes', guide: 'settings', discover: 'discover' }[r.v];
    setTab(tab);
    setFab(/^(vault|folder|note|search)$/.test(r.v));
    if (PRO_VIEWS[r.v] && !isPro()) { renderLocked(r.v); viewEl.scrollTop = 0; return; }
    if (r.v === 'vault') renderVault();
    else if (r.v === 'folder') renderFolder(r.path);
    else if (r.v === 'note') renderNote(r.id);
    else if (r.v === 'graph') renderGraph();
    else if (r.v === 'search') renderSearch(r.q);
    else if (r.v === 'settings') renderSettings();
    else if (r.v === 'today') { openDaily(null, true); return; }
    else if (r.v === 'recall') renderRecall();
    else if (r.v === 'review') { renderReview(r.deck, r.mode); return; }
    else if (r.v === 'trash') renderTrash();
    else if (r.v === 'tasks') renderTasks();
    else if (r.v === 'discover') renderDiscover(r.id);
    else if (r.v === 'guide') renderGuide();
    viewEl.scrollTop = scrollMem[currentHash] || 0;
  }

  /* ---------- vault ---------- */
  function folderRows(p, depthLvl) {
    var h = '';
    childFolders(p).forEach(function (f) {
      var open = !!ui.open[f], kids = childFolders(f).length;
      h += '<div class="row' + (open ? ' open' : '') + (depthLvl ? ' sub' : '') + '" style="padding-left:' + (depthLvl * 26) + 'px">' +
        '<button class="row" style="border:0;flex:1;min-width:0" data-act="folder" data-path="' + esc(f) + '">' + I.folder + '<span class="nm">' + esc(folderName(f)) + '</span><span class="ct">' + countIn(f) + '</span></button>' +
        (kids ? '<button class="chev" aria-label="Expand" data-act="toggle" data-path="' + esc(f) + '">' + I.chev + '</button>' : '<span class="chev"></span>') + '</div>';
      if (open && kids) h += folderRows(f, depthLvl + 1);
    });
    return h;
  }
  function noteItem(n, showFolder) {
    return '<button class="nl" data-act="open" data-id="' + n.id + '"><div class="t"><b>' + (n.pinned ? '<span class="pinm">' + I.pin + '</span>' : '') + esc(n.title) + '</b><time>' + ago(ui.sort === 'created' ? (n.created || n.updated) : n.updated) + '</time></div>' +
      '<div class="s">' + snippetHTML(n.body) + '</div>' + (showFolder && n.folder ? '<div class="f">' + esc(crumbOf(n.folder)) + '</div>' : '') + '</button>';
  }
  var EMPTY_ART = '<svg class="eart" viewBox="0 0 120 80" aria-hidden="true"><path d="M22 54L52 24M52 24L94 34M52 24L66 62M22 54L66 62" /><circle cx="22" cy="54" r="5"/><circle cx="94" cy="34" r="5"/><circle cx="66" cy="62" r="5"/><circle class="acc" cx="52" cy="24" r="7"/></svg>';
  function emptyHero(sub) {
    return '<div class="ehero">' + EMPTY_ART + '<b>No notes yet</b><p>' + sub + '</p>' +
      '<button class="bignew" data-act="newempty">' + I.plus + '<span>New note</span></button>' +
      '<div class="esub">' + (isPro() ? '<button class="pill" data-act="fromtmpl">From a template</button><button class="pill" data-act="today">Today\u2019s note</button>' : '') + '<button class="pill" data-act="newfolder" data-path="">New folder</button><button class="pill" data-act="import">Import .md files</button></div>' +
      /* a second phone or iPad starts empty: the way to its notes is one tap, not buried in Settings */
      (window.AXS && !syOn() ? '<button class="esync" data-act="sylogin">Already use Axon on another device?<b>Log in to Cloud sync</b></button>' : '') + '</div>';
  }
  function todayRow() {
    var t = ymd(new Date()), has = !!byTitle(t);
    return '<button class="row today" data-act="today">' + I.cal + '<span class="nm">Today</span><span class="ct">' + esc(dayLabel(t)) + (has ? '' : ' <i>+</i>') + '</span><span class="chev">' + I.chev + '</span></button>';
  }
  function renderVault() {
    var rootNotes = notesIn('');
    if (!notes.size) {
      var e = '<div class="page"><div class="eyebrow">Vault</div><h1 class="h1">Notes</h1>';
      if (folders.size) e += '<div class="sec"><span>Folders</span></div><div class="rows">' + folderRows('', 0) + '</div>';
      e += emptyHero('Write your first note. Type <span class="kbd">/</span> for blocks and <span class="kbd">[[</span> to link ideas. ' + (syOn() ? 'It syncs to your other devices.' : 'Everything stays on this device.'));
      if (trash.size) e += '<div class="rows" style="margin-top:20px">' + trashRow() + '</div>';
      e += '<input type="file" id="file" accept=".md,.markdown,.txt,.zip,.jpg,.jpeg,.png,.webp,.gif,text/markdown,text/plain,application/zip,application/x-zip-compressed,application/octet-stream" multiple hidden></div>';
      viewEl.innerHTML = e;
      $('#file').addEventListener('change', function (ev) { importFiles(Array.from(ev.target.files || [])); ev.target.value = ''; });
      return;
    }
    var pins = pinnedNotes(), rs = recallStats();
    var h = '<div class="pullhint" id="pullhint">Release to jump to a note</div><div class="page"><div class="eyebrow">Vault · ' + notes.size + ' note' + (notes.size === 1 ? '' : 's') + '</div><h1 class="h1">Notes</h1>' +
      '<button class="searchbox" data-act="qs" style="width:100%;text-align:left">' + I.search + '<span style="flex:1;font-size:17px">Jump to a note or command</span></button>' + folderTabs('') + backupRow() +
      '<div class="rows" style="margin-top:14px">' + (isPro() ? todayRow() : '') +
      (function () { var tc = allTasks(); if (!tc.length) return ''; var op = tc.filter(function (t) { return !t.done; }).length; return '<button class="row today" data-act="gotasks">' + I.check.replace('<svg', '<svg class="fi"') + '<span class="nm">Tasks</span><span class="ct">' + (op ? '<i class="duen">' + op + ' open</i>' : 'all done') + '</span><span class="chev">' + I.chev + '</span></button>'; })() +
      (rs.total ? '<button class="row today" data-act="gorecall">' + I.recall.replace('<svg', '<svg class="fi"') + '<span class="nm">Recall</span><span class="ct">' + (rs.due ? '<i class="duen">' + rs.due + ' due</i>' : 'all caught up') + '</span><span class="chev">' + I.chev + '</span></button>' : '') + '</div>' +
      (pins.length ? '<div class="sec"><span>Pinned</span></div><div class="rows">' + pins.map(function (n) { return '<button class="row" data-act="open" data-id="' + n.id + '">' + I.pin.replace('<svg', '<svg class="fi pinfi"') + '<span class="nm">' + esc(n.title) + '</span><span class="chev">' + I.chev + '</span></button>'; }).join('') + '</div>' : '') +
      '<div class="sec"><span>' + (childFolders('').length ? (rootNotes.length ? 'Folders & notes' : 'Folders') : 'Notes') + '</span><span><button class="ib ico" aria-label="New folder" data-act="newfolder" data-path="" style="width:44px;height:36px;margin-right:-10px">' + I.newfolder + '</button></span></div><div class="rows">' + folderRows('', 0);
    rootNotes.forEach(function (n) {
      h += '<button class="row" data-act="open" data-id="' + n.id + '">' + I.doc + '<span class="nm">' + esc(n.title) + '</span><span class="chev">' + I.chev + '</span></button>';
    });
    h += '</div>';
    if (!rootNotes.length && !folders.size) h += '<div class="hint1">Folders keep things tidy. Tap the folder icon to add one.</div>';
    var tc = tagCounts();
    if (Object.keys(tc).length) h += '<div class="sec"><span>Tags</span></div>' + tagChips(tc, 10);
    h += '<div class="sec"><span>Recent</span><button data-act="all">See all</button></div>';
    recent(6).forEach(function (n) { h += noteItem(n, false); });
    if (trash.size) h += '<div class="rows" style="margin-top:22px">' + trashRow() + '</div>';
    h += '<div class="hint1">Press and hold a note to pin, rename, move or duplicate it.</div>';
    viewEl.innerHTML = h + '</div>';
  }
  function trashRow() { return '<button class="row" data-act="gotrash">' + I.trash.replace('<svg', '<svg class="fi"') + '<span class="nm">Trash</span><span class="ct">' + trash.size + '</span><span class="chev">' + I.chev + '</span></button>'; }
  function sortChip() { return '<button class="chip sortc" data-act="sort">' + I.outline + '<span>' + SORTS[ui.sort] + '</span></button>'; }

  /* ---------- folder ---------- */
  function renderFolder(p) {
    var all = p === '*';
    if (!all && p && !folders.has(p)) { go('#/', true); return; }
    var title = all ? 'All notes' : (p ? folderName(p) : 'Vault');
    var backLabel = all || !parentOf(p) ? 'Notes' : folderName(parentOf(p));
    var h = '<div class="page"><div class="nav"><button class="back" data-act="back" data-to="' + (all || !parentOf(p) ? '#/' : '#/f/' + encodeURIComponent(parentOf(p))) + '">' + I.back + '<span>' + esc(backLabel) + '</span></button><div class="acts">' +
      (all ? '' : '<button class="ib" aria-label="New note here" data-act="newhere" data-path="' + esc(p) + '">' + I.newnote + '</button><button class="ib" aria-label="Folder options" data-act="foldermore" data-path="' + esc(p) + '">' + I.more + '</button>') +
      '</div></div>' + (all ? '' : folderTabs(p.split('/')[0])) + '<div class="crumb">' + (all ? 'every note' : esc(crumbOf(p))) + '</div><h1 class="h1" style="margin-top:4px">' + esc(title) + '</h1>' +
      (all || notesIn(p).length > 1 ? '<div class="sortrow">' + sortChip() + '</div>' : '');
    if (all) {
      var r = Array.from(notes.values()).sort(sorter);
      r.forEach(function (n) { h += noteItem(n, true); });
      if (!r.length) h += '<div class="empty"><b>No notes yet</b>Tap + to write one.</div>';
    } else {
      var subs = childFolders(p), ns = notesIn(p);
      if (p === DAILY && ui.sort !== 'az') ns.sort(function (a, b) { return !!b.pinned - !!a.pinned || isDaily(b) - isDaily(a) || b.title.localeCompare(a.title); });
      if (subs.length) { h += '<div class="rows">'; subs.forEach(function (f) { h += '<button class="row" data-act="folder" data-path="' + esc(f) + '">' + I.folder + '<span class="nm">' + esc(folderName(f)) + '</span><span class="ct">' + countIn(f) + '</span><span class="chev">' + I.chev + '</span></button>'; }); h += '</div>'; }
      ns.forEach(function (n) { h += noteItem(n, false); });
      if (!subs.length && !ns.length) h += '<div class="empty"><b>Empty folder</b>' + (p === TEMPLATES ? 'Notes you put here show up in \u201cNew from template\u201d.' : 'Tap + to add a note here.') + '</div>';
    }
    viewEl.innerHTML = h + '</div>';
    ftabsIntoView();
  }

  /* ---------- note ---------- */
  function resolver(t) { return !!byTitle(t); }
  function embedder(t) { var x = byTitle(t); return x ? x.body : null; }
  function mdOpt() { return { resolve: resolver, embed: embedder }; }
  function readMin(w) { return Math.max(1, Math.round(w / 220)); }
  function renderNote(id, opts) {
    var n = notes.get(id);
    if (!n) { toast('That note no longer exists'); go('#/', true); return; }
    opts = opts || {};
    ui.lastNote = n.id; saveMeta();
    var hasFront = !!MD.front(n.body), tags = hasFront ? [] : MD.tags(n.body), bl = backlinks(n), out = outNotes(n), nc = MD.recall(n.body).length, wc = words(n.body), um = unlinkedMentions(n);
    var backTo = n.folder ? '#/f/' + encodeURIComponent(n.folder) : '#/';
    var h = '<div class="page"><div class="nav stick"><button class="back" data-act="back" data-to="' + backTo + '">' + I.back + '<span>' + esc(n.folder ? folderName(n.folder) : 'Notes') + '</span></button><div class="acts">' +
      '<button class="ib" aria-label="Edit" data-act="edit">' + I.edit + '</button>' +
      '<button class="ib" aria-label="Outline" data-act="outline">' + I.outline + '</button>' +
      '<button class="ib" aria-label="Discover for this note" data-act="dnote" data-id="' + n.id + '">' + I.compass + '</button>' +
      '<button class="ib" aria-label="Note options" data-act="notemore" data-id="' + n.id + '">' + I.more + '</button></div></div>' +
      (n.folder ? '<div class="crumb">' + esc(crumbOf(n.folder)) + '</div>' : '') + '<h1 class="ntitle">' + esc(n.title) + '</h1>' + dayNav(n) +
      '<div class="meta">' + tags.map(function (t) { return '<span class="tag" data-tag="' + esc(t) + '">#' + esc(t) + '</span>'; }).join('') +
      '<span>' + (tags.length ? '· ' : '') + (n.pinned ? 'pinned · ' : '') + 'edited ' + agoLong(n.updated) + ' · ' + wc + ' word' + (wc === 1 ? '' : 's') + (wc > 150 ? ' · ' + readMin(wc) + ' min read' : '') + (nc ? ' · </span><button class="cardct" data-act="cards" data-id="' + n.id + '">' + I.recall + nc + ' card' + (nc === 1 ? '' : 's') + '</button>' : '</span>') + '</div>' +
      copyBanner(n) + '<article class="prose" id="prose">' + (n.body.trim() ? dedupeTitle(MD.render(n.body, mdOpt()), n.title) : '<button class="empty-note" data-act="edit">Empty note. Tap here to start writing \u2014 type / for blocks.</button>') + '</article>' +
      '<section class="bl" id="backlinks"><h3><span>' + bl.length + ' backlink' + (bl.length === 1 ? '' : 's') + '</span>' + ((out.length || unresolvedOf(n).length) ? '<button class="outb" data-act="outlinks" data-id="' + n.id + '">' + out.length + ' out' + (unresolvedOf(n).length ? ' \u00b7 ' + unresolvedOf(n).length + ' unresolved' : '') + '</button>' : '') + '</h3>' +
      (bl.length ? bl.map(function (o) { return '<button class="bi" data-act="open" data-id="' + o.id + '"><b>' + esc(o.title) + '</b><span>' + backlinkSnippet(o.body, n.title) + '</span></button>'; }).join('') :
        '<div class="none">No notes link here yet. Link it from another note with [[' + esc(n.title) + ']].</div>') +
      (um.length ? '<h3 class="umh"><span>' + um.length + ' unlinked mention' + (um.length === 1 ? '' : 's') + '</span>' + (um.length > 1 ? '<button data-act="linkall" data-id="' + n.id + '">Link all</button>' : '') + '</h3>' +
        um.map(function (m) { return '<div class="bi um"><button class="umt" data-act="open" data-id="' + m.note.id + '"><b>' + esc(m.note.title) + '</b><span>' + mentionSnippet(m.note.body, m) + '</span></button><button class="umb" data-act="linkone" data-id="' + m.note.id + '" data-t="' + esc(n.title) + '">Link</button></div>'; }).join('') : '') +
      '</section></div>';
    viewEl.innerHTML = h;
    hydrateImgs();
    if (opts.heading) { var hd = document.getElementById('h-' + opts.heading); if (hd) setTimeout(function () { hd.scrollIntoView({ block: 'start' }); }, 30); }
  }

  function copyBanner(n) {
    var o = copyOrigin(n); if (!o) return '';
    var what = /\(conflict/.test(n.title) ? 'Conflict copy of' : 'Restored copy of';
    return '<div class="mvban"><span>' + what + ' <b>' + esc(o.title) + '</b>' + (n.rf && n.rf.ts ? ' \u00b7 version from ' + esc(new Date(n.rf.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) : '') + '</span><button data-act="mergeinto" data-id="' + n.id + '">Merge\u2026</button></div>';
  }
  /* an imported note often starts with "# Title" that repeats the note's name: hide that one heading in preview */
  function dedupeTitle(html, title) {
    var m = /^(\s*(?:<div class="props"[\s\S]*?<\/div>\s*)?)<h1( [^>]*)>([\s\S]*?)<\/h1>/.exec(html);
    if (!m) return html;
    var txt = m[3].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    if (norm(txt) !== norm(title)) return html;
    return html.slice(0, m.index) + m[1] + '<h1 class="dup"' + m[2] + '>' + m[3] + '</h1>' + html.slice(m.index + m[0].length);
  }
  function foldHeading(h) {
    var lvl = +h.tagName[1], on = !h.classList.contains('folded');
    h.classList.toggle('folded', on);
    var el = h.nextElementSibling;
    while (el && !(/^H[1-6]$/.test(el.tagName) && +el.tagName[1] <= lvl)) { el.classList.toggle('foldhide', on); el = el.nextElementSibling; }
  }
  function dayNav(n) {
    if (!isDaily(n)) return '';
    var t = n.title, today = ymd(new Date()), p = shiftDay(t, -1), x = shiftDay(t, 1);
    return '<div class="daynav"><button data-act="day" data-day="' + p + '" aria-label="Previous day">' + I.back + '<span>' + esc(dayLabel(p)) + '</span></button>' +
      '<button class="dl' + (t === today ? ' on' : '') + '" data-act="calendar" data-day="' + t + '" aria-label="Open calendar">' + I.cal.replace(' class="fi"', '') + '<span>' + (t === today ? 'Today' : esc(dayOf(t).toLocaleDateString(undefined, { weekday: 'long' }))) + '</span></button>' +
      '<button data-act="day" data-day="' + x + '" aria-label="Next day"><span>' + esc(dayLabel(x)) + '</span>' + I.chev + '</button></div>';
  }
  function openLink(title, heading, from) {
    var n = byTitle(title);
    if (n) { go('#/n/' + n.id); if (heading) { var hd = document.getElementById('h-' + heading); if (hd) hd.scrollIntoView({ block: 'start' }); } return; }
    var err = checkTitle(title);
    if (err) { toast(err); return; }
    var nn = createNote({ title: title.trim().replace(/\s+/g, ' '), folder: from ? from.folder : '', body: '' });
    toast('Created \u201c' + nn.title + '\u201d');
    go('#/n/' + nn.id);
    startEditing(nn, false);
    freshNote[nn.id] = nn.title; /* a mis-tapped link you leave blank isn't kept */
  }

  /* ---------- find in note / find & replace ---------- */
  var findBar = null;
  function closeFind() {
    if (!findBar) return;
    var fb = findBar; findBar = null; fb.el.remove();
    if (fb.mode === 'read') { var pr = $('#prose'), n = fb.n; if (pr && n && notes.has(n.id)) { pr.innerHTML = n.body.trim() ? dedupeTitle(MD.render(n.body, mdOpt()), n.title) : ''; hydrateImgs(); } }
    document.body.classList.remove('finding');
  }
  function openFind(n) {
    closeFind();
    var el = document.createElement('div'); el.className = 'findbar';
    el.innerHTML = '<label class="fin">' + I.search + '<input id="fq" type="search" placeholder="Find in note" autocomplete="off" autocapitalize="none" enterkeyhint="search"><span class="fct" id="fct"></span></label>' +
      '<button class="ib" data-f="prev" aria-label="Previous">' + I.back + '</button><button class="ib" data-f="next" aria-label="Next">' + I.chev + '</button><button class="fx" data-f="close">Done</button>';
    var nav = $('.nav.stick'); if (nav) nav.insertAdjacentElement('afterend', el); else viewEl.firstChild.prepend(el);
    findBar = { el: el, mode: 'read', n: n, hits: [], i: 0 };
    document.body.classList.add('finding');
    var inp = $('#fq', el), ct = $('#fct', el);
    function mark() {
      var pr = $('#prose'); if (!pr) return;
      pr.innerHTML = n.body.trim() ? dedupeTitle(MD.render(n.body, mdOpt()), n.title) : ''; hydrateImgs();
      var q = inp.value.trim().toLowerCase(); findBar.hits = []; findBar.i = 0;
      if (!q) { ct.textContent = ''; return; }
      var walker = document.createTreeWalker(pr, NodeFilter.SHOW_TEXT, null), tn = [], t;
      while ((t = walker.nextNode())) if (t.nodeValue.toLowerCase().indexOf(q) >= 0 && !t.parentNode.closest('script,style')) tn.push(t);
      tn.forEach(function (node) {
        var s = node.nodeValue, low = s.toLowerCase(), idx = 0, frag = document.createDocumentFragment(), p;
        while ((p = low.indexOf(q, idx)) >= 0) {
          frag.appendChild(document.createTextNode(s.slice(idx, p)));
          var m = document.createElement('mark'); m.className = 'fm'; m.textContent = s.slice(p, p + q.length); frag.appendChild(m); findBar.hits.push(m);
          idx = p + q.length;
        }
        frag.appendChild(document.createTextNode(s.slice(idx)));
        node.parentNode.replaceChild(frag, node);
      });
      show();
    }
    function show() {
      var h = findBar.hits; ct.textContent = h.length ? (findBar.i + 1) + ' / ' + h.length : 'none';
      h.forEach(function (m, k) { m.classList.toggle('cur', k === findBar.i); });
      if (h[findBar.i]) h[findBar.i].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    var tmr = null;
    inp.addEventListener('input', function () { clearTimeout(tmr); tmr = setTimeout(mark, 120); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') closeFind(); });
    function step(d) { var h = findBar.hits; if (!h.length) return; findBar.i = (findBar.i + d + h.length) % h.length; show(); }
    el.addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (!b) return; if (b.dataset.f === 'close') closeFind(); else step(b.dataset.f === 'next' ? 1 : -1); });
    inp.focus();
  }
  function openFindReplace(ed) {
    closeFind();
    var el = document.createElement('div'); el.className = 'findbar rep';
    el.innerHTML = '<div class="frow"><label class="fin">' + I.search + '<input id="fq" type="search" placeholder="Find" autocomplete="off" autocapitalize="none" enterkeyhint="search"><span class="fct" id="fct"></span></label>' +
      '<button class="ib" data-f="prev" aria-label="Previous">' + I.back + '</button><button class="ib" data-f="next" aria-label="Next">' + I.chev + '</button><button class="fx" data-f="close">Done</button></div>' +
      '<div class="frow"><label class="fin">' + I.edit + '<input id="fr" type="text" placeholder="Replace with" autocomplete="off" autocapitalize="none" enterkeyhint="done"></label><button class="fx" data-f="rep1">Replace</button><button class="fx" data-f="repall">All</button></div>';
    var nav = $('.nav.stick'); if (nav) nav.insertAdjacentElement('afterend', el);
    findBar = { el: el, mode: 'edit', hits: [], i: 0 };
    document.body.classList.add('finding');
    var inp = $('#fq', el), rin = $('#fr', el), ct = $('#fct', el);
    function scan() {
      var q = inp.value.toLowerCase(), v = ed.value.toLowerCase(), hits = [], p = 0;
      if (q) while ((p = v.indexOf(q, p)) >= 0) { hits.push(p); p += q.length; }
      findBar.hits = hits;
      if (findBar.i >= hits.length) findBar.i = 0;
      ct.textContent = q ? (hits.length ? (findBar.i + 1) + ' / ' + hits.length : 'none') : '';
    }
    function sel() {
      var p = findBar.hits[findBar.i]; if (p === undefined) return;
      var L = inp.value.length;
      try { ed.focus({ preventScroll: true }); ed.setSelectionRange(p, p + L); } catch (e) {}
      var line = ed.value.slice(0, p).split('\n').length - 1, tops = lineTops(ed), vr = viewEl.getBoundingClientRect(), edTop = ed.getBoundingClientRect().top - vr.top + viewEl.scrollTop;
      viewEl.scrollTop = Math.max(0, edTop + (tops[line] || 0) - vr.height * 0.35);
    }
    function step(d) { scan(); if (!findBar.hits.length) return; findBar.i = (findBar.i + d + findBar.hits.length) % findBar.hits.length; ct.textContent = (findBar.i + 1) + ' / ' + findBar.hits.length; sel(); }
    function replaceOne() {
      scan(); var p = findBar.hits[findBar.i]; if (p === undefined) return;
      var L = inp.value.length, r = rin.value;
      ed.value = ed.value.slice(0, p) + r + ed.value.slice(p + L);
      ed.dispatchEvent(new Event('input'));
      scan(); if (findBar.i >= findBar.hits.length) findBar.i = 0; sel();
    }
    function replaceAll() {
      scan(); var k = findBar.hits.length; if (!k) return;
      var q = inp.value, r = rin.value, re = new RegExp(escRe(q), 'gi');
      ed.value = ed.value.replace(re, function () { return r; });
      ed.dispatchEvent(new Event('input'));
      scan(); toast('Replaced ' + k + ' match' + (k === 1 ? '' : 'es'));
    }
    inp.addEventListener('input', function () { findBar.i = 0; scan(); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') closeFind(); });
    rin.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); replaceOne(); } else if (e.key === 'Escape') closeFind(); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return;
      var f = b.dataset.f;
      if (f === 'close') closeFind(); else if (f === 'next') step(1); else if (f === 'prev') step(-1); else if (f === 'rep1') replaceOne(); else if (f === 'repall') replaceAll();
    });
    var s0 = ed.selectionStart, s1 = ed.selectionEnd;
    if (s1 > s0 && s1 - s0 < 80 && ed.value.slice(s0, s1).indexOf('\n') < 0) inp.value = ed.value.slice(s0, s1);
    scan();
    inp.focus(); if (inp.value) inp.select();
  }

  /* ---------- editor ---------- */
  var kb = null, ac = null, saveT = null, hist = { s: [], i: 0, t: 0, force: false, co: false };
  function startEditing(n, focusTitle, at) {
    editing = { n: n, startTitle: n.title }; lastSaved[n.id] = n.body;
    document.body.classList.add('editing');
    setFab(false);
    viewEl.innerHTML = '<div class="page"><div class="nav stick"><button class="back" data-act="donebtn">' + I.back + '<span>' + esc(n.folder ? folderName(n.folder) : 'Notes') + '</span></button><div class="acts">' +
      '<button class="ib" aria-label="Find and replace" data-act="findrep">' + I.search + '</button>' +
      '<button class="ib" aria-label="Outline" data-act="outline">' + I.outline + '</button>' +
      '<button class="ib on" aria-label="Preview" data-act="donebtn">' + I.eye + '</button></div></div>' +
      (n.folder ? '<div class="crumb">' + esc(crumbOf(n.folder)) + '</div>' : '') +
      '<input class="ntitle" id="ttl" aria-label="Note title" autocomplete="off" spellcheck="false" enterkeyhint="next">' +
      (n.body.trim() || !isPro() ? '' : '<div class="tchips" id="tchips"><span>Start from</span>' + allTemplates().slice(0, 6).map(function (t, i) { return '<button class="chip" data-act="usetmpl" data-i="' + i + '">' + esc(t.name) + '</button>'; }).join('') + '</div>') +
      '<textarea class="editor" id="ed" aria-label="Note text" placeholder="Start writing. Type / for blocks, [[ to link a note." spellcheck="true" autocapitalize="sentences"></textarea></div>';
    var ttl = $('#ttl'), ed = $('#ed');
    ttl.value = n.title; ed.value = n.body;
    hist = { s: [{ v: n.body, a: n.body.length, b: n.body.length }], i: 0, t: 0, force: false, co: false };
    autoGrow(ed);
    ttl.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); commitTitle(); ed.focus(); } });
    ttl.addEventListener('blur', commitTitle);
    ed.addEventListener('input', function () {
      autoGrow(ed); n.body = ed.value; scheduleSave(); recordHist(ed); updateAC(); updateSlash(); updateTableBar(); caretAboveBar();
      var tc = $('#tchips'); if (tc && ed.value) tc.remove();
    });
    ed.addEventListener('click', function () { updateAC(); updateSlash(); updateTableBar(); caretAboveBar(); });
    ed.addEventListener('keyup', function (e) { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].indexOf(e.key) >= 0 && !((ac || slashEl) && /Arrow(Up|Down)/.test(e.key))) { updateAC(); updateSlash(); updateTableBar(); } });
    ed.addEventListener('keydown', acKeys);
    if ('onbeforeinput' in ed) ed.addEventListener('beforeinput', function (e) { if ((e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') && !e.isComposing && continueList(ed)) e.preventDefault(); });
    else ed.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.defaultPrevented && !e.isComposing && continueList(ed)) e.preventDefault(); });
    buildKB(ed);
    if (focusTitle) { ttl.focus(); ttl.select(); return; }
    var lines = ed.value.split('\n'), L = at && at.line !== undefined ? Math.min(at.line, lines.length - 1) : -1;
    var caret = ed.value.length;
    if (L >= 0) { caret = 0; for (var i = 0; i <= L; i++) caret += lines[i].length + (i < L ? 1 : 0); }
    try { ed.focus({ preventScroll: true }); } catch (e) { ed.focus(); }
    try { ed.setSelectionRange(caret, caret); } catch (e) {}
    hist.s[0].a = hist.s[0].b = caret;
    if (L >= 0) {
      var tops = lineTops(ed), vr = viewEl.getBoundingClientRect(), edTop = ed.getBoundingClientRect().top - vr.top + viewEl.scrollTop;
      viewEl.scrollTop = Math.max(0, edTop + (tops[L] || 0) - (at.offset !== undefined ? at.offset : vr.height * 0.3));
    }
  }
  /* keep the line you're typing on above the bottom toolbar (it sits over the end of the editor) */
  var kcRaf = 0, kcPad = 0, kcT = 0;
  function caretAboveBar() {
    var ed = $('#ed'); if (!ed) return;
    var len = ed.value.length, tail = len - ed.selectionEnd;
    /* measuring means laying out text up to the caret: in a long note, mid-note, wait for a pause in typing */
    if (len > 20000 && tail > 4000) { clearTimeout(kcT); kcT = setTimeout(caretRun, 200); return; }
    if (kcRaf) return;
    kcRaf = requestAnimationFrame(function () { kcRaf = 0; caretRun(); });
  }
  function caretRun() {
    var ed = $('#ed'); if (!ed || !kb || document.activeElement !== ed) return;
    var lim = kb.getBoundingClientRect().top, er = ed.getBoundingClientRect();
    [ac, slashEl, tbar].forEach(function (p) { if (p && p.getBoundingClientRect) { var t = p.getBoundingClientRect().top; if (t > 60 && t < lim) lim = t; } });
    lim -= 12;
    if (lim <= 40 || er.bottom <= lim) return;
    var v = ed.value, pos = ed.selectionEnd, cs = getComputedStyle(ed), m = document.createElement('div'), sp = document.createElement('span');
    ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'tabSize', 'wordSpacing'].forEach(function (k) { m.style[k] = cs[k]; });
    m.style.cssText += ';position:fixed;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;overflow-wrap:break-word;word-wrap:break-word;box-sizing:border-box;width:' + ed.clientWidth + 'px';
    /* near the end of a long note, lay out only from the caret's line down and measure up from the bottom */
    var fromEnd = v.length > 20000 && v.length - pos <= 4000, y;
    sp.textContent = '\u200b';
    if (fromEnd) {
      var ls = v.lastIndexOf('\n', pos - 1) + 1;
      m.style.paddingTop = '0';
      m.appendChild(document.createTextNode(v.slice(ls, pos))); m.appendChild(sp); m.appendChild(document.createTextNode(v.slice(pos) + '\u200b'));
      document.body.appendChild(m);
      y = er.bottom - (m.offsetHeight - (sp.offsetTop + sp.offsetHeight));
    } else {
      m.textContent = v.slice(0, pos); m.appendChild(sp);
      document.body.appendChild(m);
      y = er.top + sp.offsetTop + sp.offsetHeight;
    }
    m.remove();
    if (y <= lim) return;
    var need = Math.ceil(y - lim), room = viewEl.scrollHeight - viewEl.clientHeight - viewEl.scrollTop;
    /* at the end of a note there's nothing below to scroll into: add room under the editor while editing */
    if (need > room) { kcPad += need - room + 24; viewEl.style.paddingBottom = 'calc(var(--bpad) + ' + (70 + kcPad) + 'px)'; }
    viewEl.scrollTop += need;
  }
  function autoGrow(ed) { ed.style.height = 'auto'; ed.style.height = Math.max(ed.scrollHeight, window.innerHeight * 0.55) + 'px'; }
  /* y position of each source line inside the textarea, via a hidden mirror */
  function lineTops(ed) {
    var cs = getComputedStyle(ed), m = document.createElement('div');
    ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingLeft', 'paddingRight', 'tabSize', 'wordSpacing'].forEach(function (k) { m.style[k] = cs[k]; });
    m.style.cssText += ';position:fixed;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;overflow-wrap:break-word;word-wrap:break-word;box-sizing:border-box;width:' + ed.clientWidth + 'px';
    var lines = ed.value.split('\n');
    m.innerHTML = lines.map(function (l) { return '<div>' + (l ? esc(l) : '\u200b') + '</div>'; }).join('');
    document.body.appendChild(m);
    var out = Array.prototype.map.call(m.children, function (d) { return d.offsetTop; });
    m.remove();
    return out;
  }
  function editorTopLine() {
    var ed = $('#ed'); if (!ed) return null;
    var vr = viewEl.getBoundingClientRect(), er = ed.getBoundingClientRect(), nv = $('.nav.stick'), y0 = (nv ? nv.getBoundingClientRect().bottom : vr.top) - er.top + 8;
    if (y0 <= 0) return { line: 0, offset: er.top - vr.top };
    var tops = lineTops(ed), L = 0;
    for (var i = 0; i < tops.length; i++) { if (tops[i] <= y0) L = i; else break; }
    return { line: L, offset: er.top - vr.top + tops[L] };
  }
  function alignPreview(pos) {
    var prose = $('#prose'); if (!prose || !pos) return;
    var best = null;
    prose.querySelectorAll(':scope > [data-l]').forEach(function (el) { if (+el.dataset.l <= pos.line) best = el; });
    if (!best || pos.line === 0) return;
    var vr = viewEl.getBoundingClientRect();
    viewEl.scrollTop += best.getBoundingClientRect().top - vr.top - pos.offset;
  }
  function previewTopBlock() {
    var prose = $('#prose'); if (!prose) return null;
    var vr = viewEl.getBoundingClientRect(), pick = null, nv = $('.nav.stick'), top = nv ? nv.getBoundingClientRect().bottom : vr.top;
    var els = prose.querySelectorAll(':scope > [data-l]');
    for (var i = 0; i < els.length; i++) { var r = els[i].getBoundingClientRect(); if (r.bottom > top + 12) { pick = { line: +els[i].dataset.l, offset: r.top - vr.top }; break; } }
    return viewEl.scrollTop < 40 ? null : pick;
  }
  function scheduleSave() {
    clearTimeout(saveT);
    saveT = setTimeout(function () { if (editing) touchIfChanged(editing.n); }, 350);
  }
  function commitTitle() {
    if (!editing) return true;
    var ttl = $('#ttl'); if (!ttl) return true;
    var n = editing.n, v = ttl.value.trim().replace(/\s+/g, ' ');
    if (v === n.title) return true;
    var r = renameNote(n, v);
    if (r.error) { toast(r.error); ttl.value = n.title; return false; }
    if (r.changed) toast('Renamed · updated links in ' + r.changed + ' note' + (r.changed === 1 ? '' : 's'));
    return true;
  }
  function stopEditing(silent) {
    if (!editing) return;
    clearTimeout(kcT); if (kcPad) { kcPad = 0; viewEl.style.paddingBottom = ''; }
    var pos = silent ? null : editorTopLine();
    commitTitle();
    var n = editing.n, ed = $('#ed');
    clearTimeout(saveT);
    if (ed) n.body = ed.value;
    if (ed) touchIfChanged(n);
    editing = null;
    document.body.classList.remove('editing');
    hideAC(); hideSlash(); closeFind();
    if (tbar) { tbar.remove(); tbar = null; }
    if (kb) { kb.remove(); kb = null; }
    /* a brand-new note you leave blank and unnamed isn't kept */
    if (freshNote[n.id]) {
      var fv = freshNote[n.id]; delete freshNote[n.id];
      if (!n.body.trim() && (/^Untitled( \d+)?$/.test(n.title) || n.title === fv) && notes.has(n.id)) {
        deleteNote(n);
        if (!silent) { toast('Empty note discarded'); back('#/'); }
        return;
      }
    }
    if (!silent) { renderNote(n.id); setFab(true); viewEl.scrollTop = 0; alignPreview(pos); }
  }
  var lastSaved = {}, freshNote = {};
  function touchIfChanged(n) { if (lastSaved[n.id] !== n.body) { snapshot(n, lastSaved[n.id]); lastSaved[n.id] = n.body; touch(n); } }
  /* note history: a version is kept when you leave the editor after real changes (at most one per 3 minutes per note), 30 days back */
  var HIST_DAYS = 30, HIST_MAX = 40, lastSnap = {};
  function snapshot(n, prevBody, force) {
    if (!window.HIST) return;
    var prev = typeof prevBody === 'string' ? prevBody : null;
    if (prev === null || !prev.trim()) return;
    /* forced callers (restore a version, auto-link) save the text that is about to be replaced, which is still n.body */
    if (!force && prev === n.body) return;
    var now = Date.now();
    /* a big cut (select-all + delete, a pasted-over paragraph) always keeps the text it removed, even inside the 3 minute window */
    var cut = prev.length - n.body.length > 80 && n.body.length < prev.length * 0.8;
    if (!force && !cut && lastSnap[n.id] && now - lastSnap[n.id] < 180000) return;
    lastSnap[n.id] = now;
    HIST.put({ k: n.id + ':' + now, id: n.id, ts: now, title: n.title, body: prev, words: words(prev) }).then(function () { return HIST.list(n.id); }).then(function (vs) {
      vs.sort(function (a, b) { return b.ts - a.ts; });
      var old = now - HIST_DAYS * 864e5, gone = vs.filter(function (v, i) { return i >= HIST_MAX || v.ts < old; }).map(function (v) { return v.k; });
      if (gone.length) HIST.del(gone);
    }).catch(function () {});
  }
  /* "3h ago" for today's versions, the day and time for older ones */
  function whenLabel(ts) {
    var d = new Date(ts);
    if (Date.now() - ts < 20 * 36e5) return agoLong(ts);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  async function showHistory(n) { if (!proOk('History')) return;
    var vs = [];
    try { vs = await HIST.list(n.id); } catch (e) {}
    vs.sort(function (a, b) { return b.ts - a.ts; });
    if (!vs.length) { await dialog({ title: 'No earlier versions', message: 'Axon keeps a copy each time you leave the editor after changing a note (one every few minutes, 30 days back). Nothing here yet for \u201c' + n.title + '\u201d.', ok: 'OK', noCancel: true }); return; }
    var cur = words(n.body);
    /* 12 at a time; up to 40 versions are kept, so older pages are one tap away */
    var pick, from = 0;
    for (;;) {
      var page = vs.slice(from, from + 12).map(function (v) { var d = v.words - cur; return { label: whenLabel(v.ts) + ' \u00b7 ' + v.words + ' words' + (d ? ' (' + (d > 0 ? '+' : '') + d + ')' : '') + (v.title !== n.title ? ' \u00b7 was \u201c' + v.title + '\u201d' : ''), value: v.k }; });
      if (vs.length > from + 12) page.push({ label: 'Older versions (' + (vs.length - from - 12) + ' more)\u2026', value: '\u0001' });
      pick = await sheet({ title: 'History \u00b7 ' + n.title, message: from ? '' : 'Tap a version to see it. You can restore it as a new note or replace the current text.', left: true, actions: page });
      if (pick === '\u0001') { from += 12; continue; }
      break;
    }
    if (!pick) return;
    var v = vs.filter(function (x) { return x.k === pick; })[0]; if (!v) return;
    var act = await overlay(function (done) {
      var el = document.createElement('div'); el.className = 'dialog hv'; el.setAttribute('role', 'dialog');
      var mode = 'text';
      function body() {
        if (mode === 'text') return '<div class="prose hvp">' + MD.render(v.body, mdOpt()) + '</div>';
        if (v.body === n.body) return '<div class="hvp hvd"><p class="hvsame">Same text as the note now.</p></div>';
        /* what restoring this version would change: + comes back, \u2212 goes away */
        var h = '';
        lineDiff(n.body, v.body).forEach(function (c) {
          if (c.eq) { h += c.eq.length > 2 ? '<div class="hve">\u22ef ' + c.eq.length + ' unchanged lines</div>' : c.eq.map(function (x) { return '<div class="hve">' + (esc(x) || '&nbsp;') + '</div>'; }).join(''); return; }
          c.a.forEach(function (x) { h += '<div class="hvm">' + (esc(x) || '&nbsp;') + '</div>'; });
          c.b.forEach(function (x) { h += '<div class="hvpl">' + (esc(x) || '&nbsp;') + '</div>'; });
        });
        return '<div class="hvlg">If you restore it: <b class="g">+</b> comes back, <b class="r">\u2212</b> goes away</div><div class="hvp hvd">' + h + '</div>';
      }
      function paint() {
        el.innerHTML = '<h4>' + esc(whenLabel(v.ts)) + '</h4><p>' + v.words + ' word' + (v.words === 1 ? '' : 's') + (words(n.body) !== v.words ? ' \u00b7 the note has ' + words(n.body) + ' now' : '') + (v.title !== n.title ? ' \u00b7 was called \u201c' + esc(v.title) + '\u201d' : '') + '</p>' +
          '<div class="hvt"><button data-t="text"' + (mode === 'text' ? ' class="on"' : '') + '>This version</button><button data-t="diff"' + (mode === 'diff' ? ' class="on"' : '') + '>Changes vs now</button></div>' + body() +
          '<div class="db"><button class="acc" data-v="new">Restore as new note</button></div><div class="db"><button data-v="0">Close</button><button data-v="copy">Copy</button><button data-v="1">Replace\u2026</button></div><p class="hvn">\u201cRestore as new note\u201d keeps the current note as it is. You can merge the two after.</p>';
      }
      paint();
      el.addEventListener('click', function (e) { var t = e.target.closest('button[data-t]'); if (t) { mode = t.dataset.t; paint(); return; } var b = e.target.closest('button[data-v]'); if (b) done(b.dataset.v); var a = e.target.closest('a'); if (a) e.preventDefault(); });
      return el;
    });
    if (act === 'copy') { copyText(v.body, 'Copied that version'); return; }
    if (act === 'new') { restoreAsNew(n, v); return; }
    if (act !== '1') return;
    var sure = await dialog({ title: 'Replace the current text?', message: '\u201c' + n.title + '\u201d goes back to the version from ' + agoLong(v.ts) + '. The text it has now is saved to History first, so you can undo this.', ok: 'Replace' });
    if (!sure || !notes.has(n.id)) return;
    if (editing && editing.n === n) stopEditing(true);
    snapshot(n, n.body, true);
    n.body = v.body; lastSaved[n.id] = v.body; touch(n);
    toast('Restored the version from ' + agoLong(v.ts));
    if (route().v === 'note' && route().id === n.id) renderNote(n.id);
  }
  /* ---------- restore as a new note, then merge two notes ---------- */
  var COPY_RE = /^(.*?) \((?:restored|conflict)(?: [^)]*)?\)(?: \d+)?$/;
  /* the note a restored or conflict copy came from, if it still exists */
  function copyOrigin(n) {
    if (!n) return null;
    if (n.rf && n.rf.id && n.rf.id !== n.id && notes.has(n.rf.id)) return notes.get(n.rf.id);
    var m = COPY_RE.exec(n.title || ''), o = m && byTitle(m[1]);
    return o && o !== n ? o : null;
  }
  function restoreAsNew(n, v) {
    var d = new Date(v.ts), lbl = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    var base = n.title.length > 90 ? n.title.slice(0, 90).trim() : n.title;
    var c = createNote({ title: uniqueTitle(base + ' (restored ' + lbl + ')'), folder: n.folder, body: v.body });
    c.rf = { id: n.id, ts: v.ts }; putNote(c);
    lastSaved[c.id] = c.body;
    go('#/n/' + c.id);
    toast('Restored as a new note. \u201c' + n.title + '\u201d is unchanged', { label: 'Merge', fn: function () { openMerge(n, c); } });
    return c;
  }
  /* line diff: common prefix/suffix, then LCS on the middle. Chunks: {eq:[lines]} or {a:[lines], b:[lines]} */
  function lineDiff(A, B) {
    var a = A.split('\n'), b = B.split('\n'), pre = 0, suf = 0;
    while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
    while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
    var ma = a.slice(pre, a.length - suf), mb = b.slice(pre, b.length - suf), ops = [];
    var n = ma.length, m = mb.length;
    if (n && m && n * m <= 4000000) {
      var w = m + 1, L = new Uint16Array((n + 1) * w), i, j;
      for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) L[i * w + j] = ma[i] === mb[j] ? L[(i + 1) * w + j + 1] + 1 : Math.max(L[(i + 1) * w + j], L[i * w + j + 1]);
      i = 0; j = 0;
      while (i < n && j < m) {
        if (ma[i] === mb[j]) { ops.push(['=', ma[i]]); i++; j++; }
        else if (L[(i + 1) * w + j] >= L[i * w + j + 1]) { ops.push(['a', ma[i]]); i++; }
        else { ops.push(['b', mb[j]]); j++; }
      }
      for (; i < n; i++) ops.push(['a', ma[i]]);
      for (; j < m; j++) ops.push(['b', mb[j]]);
    } else { ma.forEach(function (x) { ops.push(['a', x]); }); mb.forEach(function (x) { ops.push(['b', x]); }); }
    var chunks = [], cur = null;
    function eq(x) { if (!cur || !cur.eq) { cur = { eq: [] }; chunks.push(cur); } cur.eq.push(x); }
    a.slice(0, pre).forEach(eq);
    ops.forEach(function (o) {
      if (o[0] === '=') return eq(o[1]);
      if (!cur || cur.eq) { cur = { a: [], b: [] }; chunks.push(cur); }
      cur[o[0]].push(o[1]);
    });
    a.slice(a.length - suf).forEach(eq);
    /* a blank line that LCS matched between two changes reads as one change */
    for (var k = 1; k < chunks.length - 1; k++) {
      var c = chunks[k];
      if (c.eq && c.eq.length === 1 && !c.eq[0].trim() && !chunks[k - 1].eq && !chunks[k + 1].eq && chunks[k - 1].a.length && chunks[k - 1].b.length && chunks[k + 1].a.length && chunks[k + 1].b.length) {
        var p = chunks[k - 1], q = chunks[k + 1];
        p.a = p.a.concat(c.eq, q.a); p.b = p.b.concat(c.eq, q.b); chunks.splice(k, 2); k--;
      }
    }
    return chunks;
  }
  function mergedText(chunks) {
    var out = [];
    chunks.forEach(function (c) {
      if (c.eq) { out.push.apply(out, c.eq); return; }
      if (c.pick !== 'b') out.push.apply(out, c.a);
      if (c.pick !== 'a') out.push.apply(out, c.b);
    });
    return out.join('\n');
  }
  function copyLabel(n) { return /\(restored/.test(n.title) ? 'Restored' : /\(conflict/.test(n.title) ? 'Conflict copy' : 'Other note'; }
  /* merge `other` into `into`. Nothing is written until Save; Save keeps the old text of `into` in History first */
  async function openMerge(into, other) { if (!proOk('Merge')) return;
    if (!into || !other || into === other) return;
    if (editing) { stopEditing(true); if (route().v === 'note' && notes.has(route().id)) renderNote(route().id); }
    var A = into.body, B = other.body;
    if (A === B) {
      var y = await dialog({ title: 'These match', message: '\u201c' + other.title + '\u201d has the same text as \u201c' + into.title + '\u201d, so there\u2019s nothing to merge.', ok: 'Delete copy\u2026', cancel: 'OK' });
      if (y) askDeleteCopy(other, into);
      return;
    }
    var tt = $('#toast'); if (tt) tt.classList.remove('show');
    var chunks = lineDiff(A, B), nch = 0, la = 'Current', lb = copyLabel(other), view = 'changes';
    /* nothing is dropped unless chosen: one-sided lines are kept, and a conflict copy's edits default to Both */
    chunks.forEach(function (c) { if (!c.eq) { nch++; c.pick = !c.a.length || !c.b.length || lb === 'Conflict copy' ? 'ab' : 'a'; } });
    var res = await overlay(function (done) {
      var el = document.createElement('div'); el.className = 'mergev'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Merge notes');
      function lines(ls) { return ls.length ? ls.map(function (x) { return esc(x) || '<i>\u21b5</i>'; }).join('\n') : '<i>nothing</i>'; }
      function paint() {
        var h = '<div class="mvh"><button data-m="cancel">Cancel</button><b>Merge</b><button class="acc" data-m="save">Save</button></div>' +
          '<div class="mvsub"><span><i class="dot da"></i>' + la + ': <b>' + esc(into.title) + '</b> (saved into)</span><span><i class="dot db2"></i>' + lb + ': <b>' + esc(other.title) + '</b></span></div>' +
          '<div class="mvtabs"><button data-m="v-changes"' + (view === 'changes' ? ' class="on"' : '') + '>' + nch + ' change' + (nch === 1 ? '' : 's') + '</button><button data-m="v-preview"' + (view === 'preview' ? ' class="on"' : '') + '>Preview result</button></div>';
        h += '<div class="mvbody">';
        if (view === 'preview') h += '<div class="prose mvprev">' + (mergedText(chunks).trim() ? MD.render(mergedText(chunks), mdOpt()) : '<p><i>Empty</i></p>') + '</div>';
        else {
          h += '<div class="mvall"><span>All:</span><button data-m="all-a">' + la + '</button><button data-m="all-b">' + lb + '</button><button data-m="all-ab">Both</button></div>';
          chunks.forEach(function (c, i) {
            if (c.eq) {
              if (c.open || c.eq.length <= 3) h += '<pre class="mveq">' + lines(c.eq) + '</pre>';
              else h += '<button class="mveqb" data-m="open-' + i + '"><pre>' + lines(c.eq.slice(0, 1)) + '</pre><span>' + (c.eq.length - 1) + ' more unchanged line' + (c.eq.length === 2 ? '' : 's') + ' \u00b7 show</span></button>';
              return;
            }
            var ka = c.pick !== 'b', kb = c.pick !== 'a';
            if (!c.a.length || !c.b.length) {
              /* only one side has these lines: it's a yes/no */
              var side = c.a.length ? 'a' : 'b', keep = side === 'a' ? ka : kb, yes = side === 'a' ? 'ab' : 'ab', no = side === 'a' ? 'b' : 'a';
              h += '<div class="mvc"><div class="mvcols"><button class="mvs s' + side + (keep ? ' keep' : ' drop') + '" data-m="p-' + i + '-' + (keep ? no : yes) + '"><span class="mvl">Only in ' + (side === 'a' ? la : lb).toLowerCase() + (keep ? ' \u2713' : '') + '</span><pre>' + lines(side === 'a' ? c.a : c.b) + '</pre></button></div>' +
                '<div class="mvseg"><button data-m="p-' + i + '-' + yes + '"' + (keep ? ' class="on"' : '') + '>' + (side === 'a' ? 'Keep it' : 'Bring it back') + '</button><button data-m="p-' + i + '-' + no + '"' + (!keep ? ' class="on"' : '') + '>' + (side === 'a' ? 'Remove it' : 'Leave it out') + '</button></div></div>';
              return;
            }
            h += '<div class="mvc"><div class="mvcols">' +
              '<button class="mvs sa' + (ka ? ' keep' : ' drop') + '" data-m="p-' + i + '-a"><span class="mvl">' + la + (ka ? ' \u2713' : '') + '</span><pre>' + lines(c.a) + '</pre></button>' +
              '<button class="mvs sb' + (kb ? ' keep' : ' drop') + '" data-m="p-' + i + '-b"><span class="mvl">' + lb + (kb ? ' \u2713' : '') + '</span><pre>' + lines(c.b) + '</pre></button></div>' +
              '<div class="mvseg">' + [['a', 'Keep ' + la.toLowerCase()], ['b', 'Keep ' + lb.toLowerCase()], ['ab', 'Both']].map(function (o) { return '<button data-m="p-' + i + '-' + o[0] + '"' + (c.pick === o[0] ? ' class="on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div></div>';
          });
        }
        h += '</div>';
        var st = el.querySelector('.mvbody'), top = st ? st.scrollTop : 0;
        el.innerHTML = h;
        if (st) el.querySelector('.mvbody').scrollTop = top;
      }
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-m]'); if (!b) return;
        var m = b.dataset.m.split('-');
        if (m[0] === 'cancel') return done(null);
        if (m[0] === 'save') return done('save');
        if (m[0] === 'v') view = m[1];
        else if (m[0] === 'all') chunks.forEach(function (c) { if (!c.eq) c.pick = m[1]; });
        else if (m[0] === 'open') chunks[+m[1]].open = true;
        else if (m[0] === 'p') chunks[+m[1]].pick = m[2];
        paint();
      });
      paint();
      return el;
    });
    if (res !== 'save') return;
    if (!notes.has(into.id) || into.body !== A) {
      var again = await dialog({ title: '\u201c' + into.title + '\u201d changed', message: 'It was edited or synced while you were merging, so nothing was saved. Start the merge again with the new text?', ok: 'Start again' });
      if (again && notes.has(into.id)) openMerge(into, other);
      return;
    }
    var text = mergedText(chunks);
    if (text !== A) {
      snapshot(into, into.body, true);
      into.body = text; lastSaved[into.id] = text; touch(into);
    }
    if (route().v === 'note' && route().id !== into.id) go('#/n/' + into.id); else if (route().v === 'note') renderNote(into.id);
    toast(text !== A ? 'Merged into \u201c' + into.title + '\u201d. The old text is in its History' : 'No changes to save');
    if (!notes.has(other.id)) return;
    var kind = copyLabel(other) === 'Restored' ? 'restored copy' : copyLabel(other) === 'Conflict copy' ? 'conflict copy' : 'other note';
    var del = await dialog({ title: 'Delete the ' + kind + '?', message: 'The merge is saved. \u201c' + other.title + '\u201d can go to Trash now, or you can keep it.', ok: 'Delete\u2026', cancel: 'Keep it' });
    if (del) askDeleteCopy(other, into);
  }
  async function askDeleteCopy(c, into) {
    if (!notes.has(c.id)) return;
    var ok = await dialog({ title: 'Move \u201c' + c.title + '\u201d to Trash?', message: 'You can bring it back from Trash for ' + TRASH_DAYS + ' days.', ok: 'Move to Trash', danger: true });
    if (!ok) return;
    trashNote(c);
    toast('Moved \u201c' + (c.title.length > 24 ? c.title.slice(0, 22) + '\u2026' : c.title) + '\u201d to Trash', { label: 'Undo', fn: function () { if (trash.has(c.id)) { restoreNote(c); if (route().v === 'note') renderNote(route().id); } } });
    if (route().v === 'note' && route().id === c.id) go('#/n/' + (into && notes.has(into.id) ? into.id : ''), true);
    else if (route().v === 'note') renderNote(route().id);
  }
  /* "Merge…" from a note's menu: a copy merges into the note it came from; otherwise pick a note to merge into this one */
  async function pickMerge(n) { if (!proOk('Merge')) return;
    var o = copyOrigin(n);
    if (o) { openMerge(o, n); return; }
    var kids = Array.from(notes.values()).filter(function (x) { return x !== n && copyOrigin(x) === n; });
    var rest = Array.from(notes.values()).filter(function (x) { return x !== n && kids.indexOf(x) < 0 && !inTemplates(x); }).sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); }).slice(0, Math.max(0, 6 - kids.length));
    var acts = kids.concat(rest).map(function (x) { return { label: x.title, value: x.id }; });
    acts.push({ label: 'Type a note name\u2026', value: '\u0001' });
    var pick = await sheet({ title: 'Merge into \u201c' + n.title + '\u201d', message: 'Pick the note to bring changes in from. Nothing is saved until you tap Save.', actions: acts, left: true });
    if (!pick) return;
    if (pick === '\u0001') {
      var t = await dialog({ title: 'Merge from which note?', input: true, placeholder: 'Note name', ok: 'Next', validate: function (v) { var x = byTitle(v); return !v ? 'Type a name.' : !x ? 'No note called \u201c' + v + '\u201d.' : x === n ? 'Pick a different note.' : null; } });
      if (!t) return; pick = byTitle(t).id;
    }
    openMerge(n, notes.get(pick));
  }
  function copyText(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(msg || 'Copied'); }, function () { toast('Couldn\u2019t copy'); });
    else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast(msg || 'Copied'); } catch (e) { toast('Couldn\u2019t copy'); } ta.remove(); }
  }

  /* undo / redo: our own history so it works the same on every phone */
  function recordHist(ed) {
    var h = hist, now = Date.now(), cur = { v: ed.value, a: ed.selectionStart, b: ed.selectionEnd };
    if (h.s[h.i] && h.s[h.i].v === cur.v) { h.force = false; return; }
    if (!h.force && h.co && now - h.t < 900 && h.i > 0) h.s[h.i] = cur;
    else { h.s = h.s.slice(0, h.i + 1); h.s.push(cur); if (h.s.length > 300) h.s.shift(); h.i = h.s.length - 1; }
    h.co = !h.force; h.force = false; h.t = now; updUR();
  }
  function applyHist(ed, st) {
    ed.value = st.v; editing.n.body = st.v; autoGrow(ed); scheduleSave();
    try { ed.focus({ preventScroll: true }); } catch (e) { ed.focus(); }
    try { ed.setSelectionRange(st.a, st.b); } catch (e) {}
    hist.co = false; hideAC(); hideSlash(); updUR();
  }
  function undo(ed) { if (hist.i > 0) { hist.i--; applyHist(ed, hist.s[hist.i]); } else toast('Nothing to undo'); }
  function redo(ed) { if (hist.i < hist.s.length - 1) { hist.i++; applyHist(ed, hist.s[hist.i]); } else toast('Nothing to redo'); }
  function updUR() {
    if (!kb) return;
    var u = kb.querySelector('[data-k=undo]'), r = kb.querySelector('[data-k=redo]');
    if (u) u.classList.toggle('dis', hist.i <= 0);
    if (r) r.classList.toggle('dis', hist.i >= hist.s.length - 1);
  }
  /* return on a list line continues the list; return on an empty item ends it */
  function continueList(ed) {
    if (acState || slashState) return false;
    var v = ed.value, s = ed.selectionStart; if (s !== ed.selectionEnd) return false;
    var ls = v.lastIndexOf('\n', s - 1) + 1, le = v.indexOf('\n', s); if (le < 0) le = v.length;
    var line = v.slice(ls, le), m = /^(\s*)((?:[-*+]|(\d+)([.)]))\s+(\[[ xX]\]\s+)?|>\s?)(.*)$/.exec(line);
    if (!m || s - ls < m[1].length + m[2].length) return false;
    if (/^\s*>\s?\[!/.test(line) && s === le) { insertText(ed, '\n> ', s, s); return true; }
    if (!m[6].trim() && s === le) {
      if (m[1].length >= 2) { insertText(ed, line.slice(2), ls, le); ed.setSelectionRange(le - 2, le - 2); return true; }
      insertText(ed, '', ls, le); ed.setSelectionRange(ls, ls); return true;
    }
    var next = m[1] + (m[3] ? (+m[3] + 1) + m[4] + ' ' : m[2].charAt(0) === '>' ? '> ' : m[2].replace(/\[[xX]\]/, '[ ]').replace(/\s+$/, '') + ' ');
    if (m[5] && !m[3]) next = m[1] + m[2].charAt(0) + ' [ ] ';
    insertText(ed, '\n' + next, s, s);
    return true;
  }

  function buildKB(ed) {
    if (kb) kb.remove();
    kb = document.createElement('div'); kb.className = 'kb';
    var btns = [['plus', I.plus, 'Insert block'], ['undo', I.undo, 'Undo'], ['redo', I.redo, 'Redo'], ['link', '[[', 'Link a note'], ['img', I.img, 'Add image'], ['h', '#', 'Heading'],
      ['b', '<b style="font-family:var(--sans)">B</b>', 'Bold'], ['i', '<i style="font-family:var(--serif)">I</i>', 'Italic'], ['hl', I.hl, 'Highlight'], ['task', I.check, 'Checklist'], ['ul', I.list, 'Bullet list'],
      ['outdent', I.outdent, 'Outdent'], ['indent', I.indent, 'Indent'], ['quote', I.quote, 'Quote'], ['code', '`', 'Code'], ['card', '::', 'Flashcard']];
    kb.innerHTML = '<div class="kbs">' + btns.map(function (b) { return '<button data-k="' + b[0] + '" aria-label="' + b[2] + '"' + (b[0] === 'plus' ? ' class="kplus"' : '') + '>' + b[1] + '</button>'; }).join('') + '</div><button class="done" data-k="done">Done</button>';
    /* pointerdown keeps the keyboard up; the action runs on a real tap so the row can scroll */
    kb.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
    kb.addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
    kb.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      e.preventDefault();
      if (b.dataset.k === 'img') { pickImage(ed); return; }
      kbAction(b.dataset.k, ed);
    });
    document.body.appendChild(kb);
    placeKB(); updUR();
  }
  /* Some iOS home-screen launches lay the page out one status-bar shorter than the screen (innerHeight = screen.height - ~59):
     the page cannot draw into that bottom strip, and the home indicator sits there. Detect it (a yes/no, no sizes are applied from it)
     and let CSS drop the home-indicator padding under the tab bar, so the bar sits flush at the bottom of what the page can draw. */
  var vpShort = false;
  function checkViewport() {
    var s = vpShort;
    try {
      if (isStandalone() && window.screen && window.innerHeight >= window.innerWidth) {
        var vv = window.visualViewport, keyboard = vv && window.innerHeight - vv.height > 80;
        var d = Math.max(screen.height, screen.width) - window.innerHeight;
        if (!keyboard && d <= 140) s = d >= 30;
      } else s = false;
    } catch (e) { s = false; }
    if (s !== vpShort) { vpShort = s; document.documentElement.classList.toggle('vp-short', s); }
  }
  checkViewport();
  window.addEventListener('resize', checkViewport);
  window.addEventListener('orientationchange', function () { setTimeout(checkViewport, 300); });
  function viewportInfo() {
    var vv = window.visualViewport, cs = getComputedStyle(document.documentElement);
    return (window.screen ? screen.width + '\u00d7' + screen.height : '?') + ' screen \u00b7 ' + window.innerWidth + '\u00d7' + window.innerHeight + ' page' + (vv ? ' \u00b7 ' + Math.round(vv.width) + '\u00d7' + Math.round(vv.height) + ' visible' : '') +
      ' \u00b7 insets ' + cs.getPropertyValue('--sat').trim() + ' / ' + cs.getPropertyValue('--sab').trim() + ' \u00b7 ' + (vpShort ? 'short layout' : 'full layout') + ' \u00b7 ' + (isStandalone() ? 'home screen' : 'browser') + ' \u00b7 dpr ' + (window.devicePixelRatio || 1);
  }
  function placeKB() {
    if (!kb) return;
    var vv = window.visualViewport;
    var off = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    kb.style.bottom = (off > 60 ? off : 0) + 'px';
    kb.style.paddingBottom = off > 60 ? '6px' : '';
    if (ac || tbar) placeAC();
    if (slashEl) placeSlash();
  }
  if (window.visualViewport) { visualViewport.addEventListener('resize', function () { placeKB(); caretAboveBar(); }); visualViewport.addEventListener('scroll', placeKB); }

  function insertText(ed, text, selStart, selEnd) {
    hist.force = true;
    ed.focus();
    if (selStart !== undefined) ed.setSelectionRange(selStart, selEnd);
    var ok = false;
    try { ok = text ? document.execCommand('insertText', false, text) : (ed.selectionStart !== ed.selectionEnd ? document.execCommand('delete') : true); } catch (e) { ok = false; }
    if (!ok) { ed.setRangeText(text, ed.selectionStart, ed.selectionEnd, 'end'); ed.dispatchEvent(new Event('input')); }
    if (selStart !== undefined && !text) { try { ed.setSelectionRange(selStart, selStart); } catch (e) {} }
  }
  function wrap(ed, a, b) {
    var s = ed.selectionStart, e = ed.selectionEnd, sel = ed.value.slice(s, e);
    insertText(ed, a + sel + b, s, e);
    if (!sel) ed.setSelectionRange(s + a.length, s + a.length);
    else ed.setSelectionRange(s + a.length, s + a.length + sel.length);
  }
  function linePrefix(ed, fn) {
    var v = ed.value, s = ed.selectionStart, e = ed.selectionEnd;
    var ls = v.lastIndexOf('\n', s - 1) + 1, le = v.indexOf('\n', e); if (le < 0) le = v.length;
    var lines = v.slice(ls, le).split('\n').map(fn);
    var txt = lines.join('\n');
    insertText(ed, txt, ls, le);
    ed.setSelectionRange(ls + txt.length, ls + txt.length);
  }
  var imgIn = null, imgSel = null;
  function pickImage(ed) {
    imgSel = { s: ed.selectionStart, e: ed.selectionEnd };
    if (!imgIn) {
      imgIn = document.createElement('input'); imgIn.type = 'file'; imgIn.accept = 'image/*'; imgIn.hidden = true; imgIn.id = 'imgpick';
      document.body.appendChild(imgIn);
      imgIn.addEventListener('change', async function () {
        var f = imgIn.files && imgIn.files[0]; imgIn.value = '';
        var ed2 = $('#ed'); if (!f || !ed2 || !editing) return;
        toast('Adding image\u2026');
        try {
          var id = await storeImage(f);
          ed2 = $('#ed'); if (!ed2 || !editing) return;
          var s = imgSel ? Math.min(imgSel.s, ed2.value.length) : ed2.value.length, e2 = imgSel ? Math.min(imgSel.e, ed2.value.length) : s;
          var v = ed2.value, pre = s === 0 ? '' : v[s - 1] !== '\n' ? '\n\n' : (s > 1 && v[s - 2] !== '\n' ? '\n' : ''), post = v.slice(e2, e2 + 2) === '\n\n' ? '' : v[e2] === '\n' ? '\n' : '\n\n';
          insertText(ed2, pre + '![](axon-img:' + id + ')' + post, s, e2);
          editing.n.body = ed2.value; autoGrow(ed2); scheduleSave();
          toast('Image added');
        } catch (err) { toast(err.message || 'Couldn\u2019t add that image'); }
      });
    }
    imgIn.click();
  }
  function kbAction(k, ed) {
    if (k === 'done') { stopEditing(false); return; }
    if (k === 'plus') { openSlash(ed); return; }
    if (k === 'undo') return undo(ed);
    if (k === 'redo') return redo(ed);
    if (k === 'link') {
      var s = ed.selectionStart, e = ed.selectionEnd;
      if (e > s) wrap(ed, '[[', ']]');
      else { insertText(ed, '[[]]', s, e); ed.setSelectionRange(s + 2, s + 2); }
      updateAC(); return;
    }
    if (k === 'b') return wrap(ed, '**', '**');
    if (k === 'i') return wrap(ed, '*', '*');
    if (k === 'hl') return wrap(ed, '==', '==');
    if (k === 'card') { var c = ed.selectionStart; insertText(ed, ' :: ', c, ed.selectionEnd); return; }
    if (k === 'code') {
      var sel = ed.value.slice(ed.selectionStart, ed.selectionEnd);
      return sel.indexOf('\n') >= 0 ? wrap(ed, '```\n', '\n```') : wrap(ed, '`', '`');
    }
    if (k === 'indent') return keepCaret(ed, function () { linePrefix(ed, function (l) { return '  ' + l; }); }, 2);
    if (k === 'outdent') return keepCaret(ed, function () { linePrefix(ed, function (l) { return l.replace(/^ {1,2}|^\t/, ''); }); }, -2);
    if (k === 'h') return linePrefix(ed, function (l) { var m = /^(#{1,6})\s/.exec(l); if (!m) return '# ' + l; if (m[1].length >= 3) return l.replace(/^#{1,6}\s/, ''); return '#' + l; });
    if (k === 'ul') return linePrefix(ed, function (l) { return /^\s*[-*+]\s(?!\[)/.test(l) ? l.replace(/^(\s*)[-*+]\s/, '$1') : l.replace(/^(\s*)(?:[-*+]\s\[[ xX]\]\s)?/, '$1- '); });
    if (k === 'task') return linePrefix(ed, function (l) { return /^\s*[-*+]\s\[[ xX]\]\s/.test(l) ? l.replace(/^(\s*)[-*+]\s\[[ xX]\]\s/, '$1') : l.replace(/^(\s*)(?:[-*+]\s)?/, '$1- [ ] '); });
    if (k === 'quote') return linePrefix(ed, function (l) { return /^>\s?/.test(l) ? l.replace(/^>\s?/, '') : '> ' + l; });
  }
  function keepCaret(ed, fn, d) {
    var s = ed.selectionStart, e = ed.selectionEnd, v0 = ed.value.length;
    fn();
    if (s === e) { var c = Math.max(0, s + (ed.value.length - v0)); ed.setSelectionRange(c, c); }
  }

  /* slash menu: type "/" (or tap +) to insert any block */
  var SLASH = [
    ['h1', 'Heading 1', 'title big', 'H1', 'line', '# '], ['h2', 'Heading 2', 'subtitle', 'H2', 'line', '## '], ['h3', 'Heading 3', 'small', 'H3', 'line', '### '],
    ['todo', 'Checklist', 'todo task checkbox', '\u2610', 'line', '- [ ] '], ['bullet', 'Bullet list', 'ul unordered', '\u2022', 'line', '- '], ['num', 'Numbered list', 'ol ordered 1', '1.', 'line', '1. '],
    ['quote', 'Quote', 'blockquote', '\u201d', 'line', '> '],
    ['info', 'Callout \u00b7 info', 'note callout box', 'i', 'block', '> [!info] \u0001Info\u0002\n> '], ['tip', 'Callout \u00b7 tip', 'hint idea callout', '\u2713', 'block', '> [!tip] \u0001Tip\u0002\n> '],
    ['warning', 'Callout \u00b7 warning', 'caution callout', '!', 'block', '> [!warning] \u0001Warning\u0002\n> '], ['danger', 'Callout \u00b7 danger', 'error callout', '\u00d7', 'block', '> [!danger] \u0001Danger\u0002\n> '],
    ['toggle', 'Toggle', 'collapse fold details hide', '\u25b8', 'block', '> [!toggle]- \u0001Toggle title\u0002\n> Hidden text'],
    ['card', 'Flashcard', 'recall question answer quiz', '::', 'line', '\u0001Question\u0002 :: Answer'], ['cloze', 'Cloze card', 'recall fill blank hide', '{ }', 'inline', '{{c::\u0001hidden words\u0002}}'],
    ['table', 'Table', 'grid columns', '\u25a6', 'block', '| \u0001Column\u0002 | Column |\n| --- | --- |\n|  |  |'], ['code', 'Code block', 'snippet program', '</>', 'block', '```\n\u0001\u0002\n```'],
    ['divider', 'Divider', 'hr line rule separator', '\u2014', 'block', '---'], ['image', 'Image', 'photo picture', '\u25a3', 'image'],
    ['highlight', 'Highlight', 'mark marker yellow', '==', 'inline', '==\u0001text\u0002=='], ['link', 'Link to note', 'wikilink [[', '[[', 'link'], ['embed', 'Embed note', 'transclude show inline', '![[', 'embed'],
    ['math', 'Math', 'equation formula latex', '\u2211', 'inline', '$\u0001x^2\u0002$'], ['footnote', 'Footnote', 'reference note', '\u00b9', 'footnote'],
    ['date', 'Date', 'today day', '\u25f7', 'date'], ['time', 'Time', 'now clock', '\u25f4', 'time'], ['daylink', 'Link to today', 'daily journal', '[[d', 'daylink'],
    ['props', 'Properties', 'front matter tags date yaml', '\u2261', 'props'], ['template', 'Template', 'insert starter', '\u25a4', 'template']
  ];
  var slashState = null, slashEl = null;
  function slashMatches(q) {
    q = q.toLowerCase();
    if (!q) return SLASH.slice();
    var a = [], b = [];
    SLASH.forEach(function (it) { var l = it[1].toLowerCase(); if (l.indexOf(q) === 0 || it[0].indexOf(q) === 0) a.push(it); else if (l.indexOf(q) >= 0 || it[2].indexOf(q) >= 0) b.push(it); });
    return a.concat(b);
  }
  function updateSlash() {
    var ed = $('#ed'); if (!ed || !editing || acState) return hideSlash();
    var pos = ed.selectionStart;
    if (slashState && slashState.plus) return hideSlash();
    if (pos !== ed.selectionEnd) return hideSlash();
    var v = ed.value, ls = v.lastIndexOf('\n', pos - 1) + 1, before = v.slice(ls, pos), m = /(^|\s)\/([A-Za-z0-9-]{0,16})$/.exec(before);
    if (!m) return hideSlash();
    var items = slashMatches(m[2]);
    if (!items.length) return hideSlash();
    slashState = { start: pos - m[2].length - 1, pos: pos, q: m[2], items: items, sel: 0 };
    drawSlash();
  }
  function openSlash(ed) {
    hideAC();
    var p = ed.selectionStart;
    slashState = { start: p, pos: ed.selectionEnd, q: '', items: SLASH.slice(), sel: 0, plus: true };
    drawSlash();
  }
  function drawSlash() {
    if (!slashEl) {
      slashEl = document.createElement('div'); slashEl.className = 'ac slash'; document.body.appendChild(slashEl);
      slashEl.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
      slashEl.addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
      slashEl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; e.preventDefault(); if (b.dataset.x) { hideSlash(); return; } pickSlash(+b.dataset.i); });
    }
    var st = slashState;
    slashEl.innerHTML = '<div class="hd"><span>' + (st.q ? 'Insert \u00b7 \u201c' + esc(st.q) + '\u201d' : 'Insert block') + '</span><button data-x="1" aria-label="Close">' + I.x + '</button></div>' + st.items.map(function (it, i) {
      return '<button data-i="' + i + '" class="' + (i === st.sel ? 'sel' : '') + '"><span class="sg">' + esc(it[3]) + '</span>' + esc(it[1]) + '</button>';
    }).join('');
    placeSlash();
    var sel = slashEl.querySelector('button.sel'); if (sel && sel.scrollIntoView && st.sel > 3) sel.scrollIntoView({ block: 'nearest' });
  }
  function placeSlash() {
    if (!slashEl || !kb) return;
    var b = parseFloat(kb.style.bottom) || 0, vv = window.visualViewport, vh = vv ? vv.height : window.innerHeight;
    slashEl.style.bottom = (b + kb.offsetHeight + 8) + 'px';
    slashEl.style.maxHeight = Math.max(160, Math.min(330, vh - kb.offsetHeight - 70)) + 'px';
  }
  function hideSlash() { slashState = null; if (slashEl) { slashEl.remove(); slashEl = null; } }
  function snip(ed, a, b, text) {
    var s1 = text.indexOf('\u0001'), s2 = text.indexOf('\u0002');
    var clean = text.replace(/[\u0001\u0002]/g, '');
    insertText(ed, clean, a, b);
    if (s1 >= 0) { var e2 = s2 > s1 ? s2 - 1 : s1; ed.setSelectionRange(a + s1, a + e2); }
  }
  function pickSlash(i) {
    var ed = $('#ed'); if (!ed || !slashState) return;
    var st = slashState, it = st.items[i]; if (!it) return;
    hideSlash();
    var v = ed.value, a = st.start, b = st.plus ? st.pos : st.pos;
    var ls = v.lastIndexOf('\n', a - 1) + 1, le = v.indexOf('\n', b); if (le < 0) le = v.length;
    var before = v.slice(ls, a), after = v.slice(b, le), kind = it[4];
    if (kind === 'line') {
      var content = before.replace(/^\s*(?:#{1,6}\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+|>\s?)/, '');
      var ind = (/^\s*/.exec(before) || [''])[0];
      if (it[0] === 'card' && (content.trim() || after.trim())) { snip(ed, a, b, ' :: \u0001\u0002'); return; }
      if (it[5].indexOf('\u0001') >= 0) snip(ed, ls, le, ind + it[5] + after);
      else snip(ed, ls, le, ind + it[5] + content + '\u0001' + after);
      return;
    }
    if (kind === 'block') {
      var p1 = before.trim() ? '\n' : (ls > 1 && v[ls - 2] !== '\n' && v[ls - 2] !== undefined ? '\n' : ''), p2 = after.trim() ? '\n' : '\n';
      snip(ed, a, b, p1 + it[5] + p2); return;
    }
    if (kind === 'inline') { snip(ed, a, b, it[5]); return; }
    insertText(ed, '', a, b);
    var c = ed.selectionStart;
    if (kind === 'image') { pickImage(ed); return; }
    if (kind === 'link') { insertText(ed, '[[', c, c); updateAC(); return; }
    if (kind === 'embed') { var pe = before.trim() ? '\n' : ''; insertText(ed, pe + '![[', c, c); updateAC(); return; }
    if (kind === 'date') { insertText(ed, ymd(new Date()), c, c); return; }
    if (kind === 'time') { var d = new Date(); insertText(ed, String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), c, c); return; }
    if (kind === 'daylink') { insertText(ed, '[[' + ymd(new Date()) + ']]', c, c); return; }
    if (kind === 'footnote') {
      var used = {}, re = /\[\^(\d+)\]/g, mm; while ((mm = re.exec(ed.value))) used[mm[1]] = 1;
      var k = 1; while (used[k]) k++;
      insertText(ed, '[^' + k + ']', c, c);
      var tail = ed.value, nl = /\n$/.test(tail) ? (/\n\n$/.test(tail) ? '' : '\n') : '\n\n';
      insertText(ed, nl + '[^' + k + ']: ', tail.length, tail.length);
      return;
    }
    if (kind === 'props') {
      if (MD.front(ed.value)) { toast('This note already has properties at the top'); ed.setSelectionRange(4, 4); return; }
      snip(ed, 0, 0, '---\ntags: \u0001\u0002\ndate: ' + ymd(new Date()) + '\n---\n');
      return;
    }
    if (kind === 'template') { if (!proOk('Templates')) return; chooseTemplate().then(function (t) { var e2 = $('#ed'); if (!t || !e2) return; var cc = Math.min(c, e2.value.length); insertText(e2, fillTmpl(t.body, editing ? editing.n.title : ''), cc, cc); }); return; }
  }

  /* wikilink autocomplete */
  var acState = null;
  function updateAC() {
    var ed = $('#ed'); if (!ed || !editing) return hideAC();
    var pos = ed.selectionStart;
    if (pos !== ed.selectionEnd) return hideAC();
    var before = ed.value.slice(0, pos), m = /\[\[([^\[\]\n|#]*)$/.exec(before);
    if (!m) {
      /* [[Note#heading autocomplete */
      var hm = /\[\[([^\[\]\n|#]+)#([^\[\]\n|#]*)$/.exec(before);
      if (hm) {
        var tn = byTitle(hm[1]); if (!tn) return hideAC();
        var hq = norm(hm[2]), heads = [];
        String(tn.body).replace(/^#{1,6}\s+(.+?)\s*#*\s*$/gm, function (x, t) { if (!hq || norm(t).indexOf(hq) >= 0) heads.push(t.trim()); return x; });
        if (!heads.length) return hideAC();
        acState = { kind: 'head', start: pos - hm[2].length, pos: pos, items: heads.slice(0, 6).map(function (t) { return { title: t }; }), sel: 0 };
        hideSlash(); drawAC(); return;
      }
      /* #tag autocomplete (a # followed by a space is a heading, not a tag) */
      var tm = /(^|[\s(])#([A-Za-z0-9_\-\/]*)$/.exec(before);
      if (tm && (tm[2] || !/(^|\n)#$/.test(before))) {
        var tq = tm[2].toLowerCase(), tc = tagCounts();
        var tags = Object.keys(tc).filter(function (t) { return t.indexOf(tq) === 0 && t !== tq; }).sort(function (a, b) { return tc[b] - tc[a] || a.localeCompare(b); }).slice(0, 6);
        if (!tags.length) return hideAC();
        acState = { kind: 'tag', start: pos - tm[2].length, pos: pos, items: tags.map(function (t) { return { title: t, count: tc[t] }; }), sel: 0 };
        hideSlash(); drawAC(); return;
      }
      return hideAC();
    }
    var q = m[1], nq = norm(q);
    var list = Array.from(notes.values()).filter(function (n) { return n !== editing.n; }).map(function (n) {
      var t = norm(n.title), sc = !nq ? 1 : t === nq ? 100 : t.indexOf(nq) === 0 ? 50 : t.indexOf(nq) >= 0 ? 20 : fuzzy(nq, t) ? 5 : 0;
      return { n: n, sc: sc + (n.updated / 1e15) };
    }).filter(function (x) { return x.sc >= 1; }).sort(function (a, b) { return b.sc - a.sc || a.n.title.localeCompare(b.n.title); }).slice(0, 6);
    var items = list.map(function (x) { return { title: x.n.title, folder: x.n.folder }; });
    if (q.trim() && !byTitle(q) && !checkTitle(q)) items.push({ title: q.trim(), create: true });
    if (!items.length) return hideAC();
    acState = { start: pos - q.length, pos: pos, items: items, sel: 0 };
    hideSlash();
    drawAC();
  }
  /* table helper: a strip above the keyboard bar while the caret sits in a markdown table */
  var tbar = null;
  function tableAt(ed) {
    var v = ed.value, pos = ed.selectionStart, ls = v.lastIndexOf('\n', pos - 1) + 1, le = v.indexOf('\n', pos); if (le < 0) le = v.length;
    var line = v.slice(ls, le); if (!/^\s*\|.*\|\s*$/.test(line)) return null;
    var s = ls, e = le;
    while (s > 0) { var pls = v.lastIndexOf('\n', s - 2) + 1, pl = v.slice(pls, s - 1); if (!/^\s*\|.*\|\s*$/.test(pl)) break; s = pls; }
    while (e < v.length) { var nle = v.indexOf('\n', e + 1); if (nle < 0) nle = v.length; var nl = v.slice(e + 1, nle); if (!/^\s*\|.*\|\s*$/.test(nl)) break; e = nle; }
    return { ls: ls, le: le, line: line, s: s, e: e, pos: pos, sep: /^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(line) };
  }
  function updateTableBar() {
    var ed = $('#ed'); var t = ed && editing && !acState && !slashState ? tableAt(ed) : null;
    if (!t) { if (tbar) { tbar.remove(); tbar = null; } return; }
    if (!tbar) {
      tbar = document.createElement('div'); tbar.className = 'ac tbar'; document.body.appendChild(tbar);
      tbar.innerHTML = '<button data-t="prev" aria-label="Previous cell">\u25c2 cell</button><button data-t="next" aria-label="Next cell">cell \u25b8</button><button data-t="row">+ row</button><button data-t="col">+ column</button><button data-t="delrow" class="danger">\u2212 row</button>';
      tbar.addEventListener('pointerdown', function (e) { var b = e.target.closest('button'); if (!b) return; e.preventDefault(); tableAction(b.dataset.t); });
    }
    placeAC();
  }
  function tableAction(k) {
    var ed = $('#ed'); if (!ed) return; var t = tableAt(ed); if (!t) return;
    var v = ed.value;
    if (k === 'next' || k === 'prev') {
      var i = k === 'next' ? v.indexOf('|', t.pos) : v.lastIndexOf('|', Math.max(0, t.pos - 2));
      if (k === 'next' && i >= 0 && i + 1 >= t.le) { var nls = t.le + 1; if (nls < v.length && /^\s*\|/.test(v.slice(nls, nls + 3))) i = v.indexOf('|', nls); else { tableAction('row'); return; } }
      if (k === 'prev' && i >= 0 && i < t.ls) { i = v.lastIndexOf('|', i - 1); if (i < t.ls) i = v.lastIndexOf('|', t.ls - 2) - 0; }
      if (i < 0) return;
      var c = i + 1; while (v[c] === ' ') c++;
      var cellEnd = v.indexOf('|', c); if (cellEnd < 0) cellEnd = c;
      ed.focus(); ed.setSelectionRange(c, Math.max(c, v.slice(c, cellEnd).trimEnd().length + c));
      return;
    }
    var cols = t.line.split('|').length - 2;
    if (k === 'row') { var row = '\n|' + new Array(cols + 1).join('  |'); insertText(ed, row, t.le, t.le); ed.setSelectionRange(t.le + 3, t.le + 3); return; }
    if (k === 'col') {
      var lines = v.slice(t.s, t.e).split('\n').map(function (l) { return l.replace(/\s*$/, '') + (/^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(l) ? ' --- |' : '  |'); }).join('\n');
      insertText(ed, lines, t.s, t.e); ed.setSelectionRange(t.pos, t.pos); return;
    }
    if (k === 'delrow') {
      if (t.sep) { toast('That\u2019s the header line'); return; }
      var from = t.ls, to = t.le < v.length ? t.le + 1 : t.le; if (t.le >= v.length && from > 0) from--;
      insertText(ed, '', from, to); ed.setSelectionRange(Math.min(from, ed.value.length), Math.min(from, ed.value.length)); return;
    }
  }
  function fuzzy(q, t) { var i = 0; for (var j = 0; j < t.length && i < q.length; j++) if (t[j] === q[i]) i++; return i === q.length; }
  function drawAC() {
    if (!ac) { ac = document.createElement('div'); ac.className = 'ac'; document.body.appendChild(ac);
      ac.addEventListener('pointerdown', function (e) { var b = e.target.closest('button'); if (!b) return; e.preventDefault(); pickAC(+b.dataset.i); }); }
    ac.innerHTML = '<div class="hd">' + (acState.kind === 'tag' ? 'Tag' : acState.kind === 'head' ? 'Heading' : 'Link to note') + '</div>' + acState.items.map(function (it, i) {
      return '<button data-i="' + i + '" class="' + (i === acState.sel ? 'sel' : '') + '">' + (it.create ? '<span class="plus">+</span> New note \u201c' + esc(it.title) + '\u201d' : (acState.kind === 'tag' ? '#' : '') + esc(it.title) + (it.folder ? '<small>' + esc(it.folder.toLowerCase()) + '</small>' : it.count ? '<small>' + it.count + '</small>' : '')) + '</button>';
    }).join('');
    placeAC();
  }
  function placeAC() { if (!kb) return; var b = parseFloat(kb.style.bottom) || 0; if (ac) ac.style.bottom = (b + kb.offsetHeight + 8) + 'px'; if (tbar) tbar.style.bottom = (b + kb.offsetHeight + 8) + 'px'; }
  function hideAC() { acState = null; if (ac) { ac.remove(); ac = null; } }
  function pickAC(i) {
    var ed = $('#ed'); if (!ed || !acState) return;
    var st = acState, it = st.items[i], after = ed.value.slice(st.pos);
    var closes = after.indexOf(']]') === 0;
    acState = null;
    if (st.kind === 'tag') { insertText(ed, it.title + ' ', st.start, st.pos); var ct = st.start + it.title.length + 1; ed.setSelectionRange(ct, ct); hideAC(); return; }
    insertText(ed, it.title + (closes ? '' : ']]'), st.start, st.pos);
    var c = st.start + it.title.length + 2;
    ed.setSelectionRange(c, c);
    hideAC();
  }
  function acKeys(e) {
    if (slashState && !acState) {
      var S = slashState;
      if (e.key === 'ArrowDown') { e.preventDefault(); S.sel = (S.sel + 1) % S.items.length; drawSlash(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); S.sel = (S.sel - 1 + S.items.length) % S.items.length; drawSlash(); }
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickSlash(S.sel); }
      else if (e.key === 'Escape') { hideSlash(); }
      return;
    }
    if (!acState) { if (e.key === 'Tab' && tbar) { e.preventDefault(); tableAction(e.shiftKey ? 'prev' : 'next'); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); acState.sel = (acState.sel + 1) % acState.items.length; drawAC(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); acState.sel = (acState.sel - 1 + acState.items.length) % acState.items.length; drawAC(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickAC(acState.sel); }
    else if (e.key === 'Escape') { hideAC(); }
  }

  /* ---------- graph ---------- */
  function graphData() {
    var nodes = [], links = [], include = null;
    var cur = ui.lastNote && notes.get(ui.lastNote);
    if (ui.graphMode === 'local' && cur) {
      include = {}; include[cur.id] = 0;
      var adj = {};
      notes.forEach(function (n) { adj[n.id] = adj[n.id] || {}; outNotes(n).concat(ui.graphAuto !== false ? autoOut(n) : []).forEach(function (o) { adj[n.id][o.id] = 1; (adj[o.id] = adj[o.id] || {})[n.id] = 1; }); });
      var frontier = [cur.id];
      for (var d = 1; d <= 2; d++) {
        var next = [];
        frontier.forEach(function (id) { Object.keys(adj[id] || {}).forEach(function (j) { if (!(j in include)) { include[j] = d; next.push(j); } }); });
        frontier = next;
      }
    }
    var ghosts = {};
    notes.forEach(function (n) {
      if (include && !(n.id in include)) return;
      nodes.push({ id: n.id, label: n.title, group: n.folder ? n.folder.split('/')[0] : '' });
      outNotes(n).forEach(function (o) { if (!include || o.id in include) links.push([n.id, o.id]); });
      if (ui.graphAuto !== false) autoOut(n).forEach(function (o) { if (!include || o.id in include) links.push([n.id, o.id, 'auto']); });
      if (ui.graphGhosts !== false) unresolvedOf(n).forEach(function (t) {
        var id = 'ghost:' + norm(t);
        if (!ghosts[id]) { ghosts[id] = 1; nodes.push({ id: id, label: t, kind: 'ghost' }); }
        links.push([n.id, id]);
      });
    });
    if (ui.graphTags) {
      var seen = {};
      notes.forEach(function (n) {
        if (include && !(n.id in include)) return;
        MD.tags(n.body).forEach(function (t) {
          var id = 'tag:' + t;
          if (!seen[id]) { seen[id] = 1; nodes.push({ id: id, label: '#' + t, kind: 'tag' }); }
          links.push([n.id, id]);
        });
      });
    }
    return { nodes: nodes, links: links };
  }
  function renderGraph() {
    viewEl.className = 'full';
    var cur = ui.lastNote && notes.get(ui.lastNote);
    if (ui.graphMode === 'local' && !cur) ui.graphMode = 'global';
    var data = graphData();
    var GPAL = ['#38bdf8', '#a3e635', '#f5a524', '#a78bfa', '#f472b6', '#34d399', '#fb7185', '#facc15', '#60a5fa', '#c084fc', '#2dd4bf', '#ff6a3d'].filter(function (c) { return c.toLowerCase() !== String(settings.accent).toLowerCase(); });
    var gc = {}; data.nodes.forEach(function (x) { if (!x.kind) gc[x.group || ''] = (gc[x.group || ''] || 0) + 1; });
    var groups = Object.keys(gc).sort(function (a, b) { return gc[b] - gc[a] || a.localeCompare(b); }).map(function (g, i) { return [g, gc[g], g === '' ? '#a9a8a4' : GPAL[(gc[''] ? i - 1 : i) % GPAL.length]]; });
    var gcol = {}; groups.forEach(function (g) { gcol[g[0]] = g[2]; });
    if (ui.graphColor !== false) data.nodes.forEach(function (x) { if (!x.kind) x.color = gcol[x.group || '']; });
    var nN = data.nodes.filter(function (x) { return !x.kind; }).length, nG = data.nodes.filter(function (x) { return x.kind === 'ghost'; }).length, eSeen = {}, nL = 0, nA = 0;
    data.links.filter(function (l) { return !l[2]; }).concat(data.links.filter(function (l) { return l[2]; })).forEach(function (l) { var k = l[0] < l[1] ? l[0] + '\u0001' + l[1] : l[1] + '\u0001' + l[0]; if (!eSeen[k] && l[0] !== l[1]) { eSeen[k] = 1; if (l[2]) nA++; else if (String(l[1]).indexOf('ghost:') !== 0) nL++; } });
    var h = '<div class="gwrap"><canvas id="gc" aria-label="Graph of linked notes"></canvas><div class="ghead"><div class="eyebrow">' + nN + ' note' + (nN === 1 ? '' : 's') + ' · ' + nL + ' link' + (nL === 1 ? '' : 's') + (nA ? ' · ' + nA + ' auto' : '') + (nG ? ' · ' + nG + ' unresolved' : '') + '</div><h1 class="h1">Graph</h1>' +
      '<div class="chips"><button class="chip' + (ui.graphMode === 'global' ? ' on' : '') + '" data-act="gmode" data-m="global">Global</button>' +
      '<button class="chip' + (ui.graphMode === 'local' ? ' on' : '') + '" data-act="gmode" data-m="local">Local</button>' +
      '<button class="chip" data-act="gfind" title="Find a note and center the graph on it">' + I.search.replace(' class="fi"', '') + ' Find</button>' +
      '<button class="chip' + (ui.graphTags ? ' on' : '') + '" data-act="gtags">Tags</button>' +
      '<button class="chip' + (ui.graphColor !== false ? ' on' : '') + '" data-act="gcolor" title="Color notes by their top folder">Folders</button>' +
      '<button class="chip' + (ui.graphAuto !== false ? ' on' : '') + '" data-act="gauto" title="Notes that mention each other by name">Auto-link</button>' +
      '<button class="chip' + (ui.graphGhosts !== false ? ' on' : '') + '" data-act="gghosts" title="Links to notes that don\u2019t exist yet">Unresolved</button></div>' +
      (ui.graphColor !== false && groups.length > 1 ? '<div class="glegend">' + groups.slice(0, 7).map(function (g) { return '<span><i style="background:' + g[2] + '"></i>' + esc(g[0] || 'Vault') + '</span>'; }).join('') + (groups.length > 7 ? '<span>+' + (groups.length - 7) + ' more</span>' : '') + '</div>' : '') + '</div>' +
      (data.nodes.length ? '<div class="gtools"><button class="ib" aria-label="Fit" data-act="gfit">' + I.fit + '</button><button class="ib" aria-label="Zoom in" data-act="gzin">' + I.zin + '</button><button class="ib" aria-label="Zoom out" data-act="gzout">' + I.zout + '</button></div>' : '') +
      (data.nodes.length ? '<div class="ghint" id="ghint">Tap a node · tap again to open · pinch to zoom</div>' : '<div class="gempty">' + EMPTY_ART + '<b>Nothing to map yet</b><p>Each note becomes a dot, and every <span class="kbd">[[link]]</span> draws a line between them.</p><button class="bignew" data-act="newempty">' + I.plus + '<span>New note</span></button></div>') +
      '<div class="gsheet" id="gsheet"></div></div>';
    viewEl.innerHTML = h;
    var canvas = $('#gc');
    var topIn = $('.ghead').offsetHeight + 6;
    var tabH = $('#tabbar').offsetHeight;
    graphCtl = Graph.mount(canvas, {
      data: data, current: cur ? cur.id : null, selected: cur ? cur.id : null, accent: settings.accent, topInset: topIn, bottomInset: tabH + (cur ? 170 : 40),
      onSelect: function (id) { showGSheet(id); },
      onOpen: function (id) { if (id.indexOf('tag:') === 0) go('#/search/' + encodeURIComponent('#' + id.slice(4))); else if (id.indexOf('ghost:') === 0) createGhost(id); else go('#/n/' + id); }
    });
    if (cur) showGSheet(cur.id);
  }
  function showGSheet(id) {
    var s = $('#gsheet'), hint = $('#ghint'); if (!s) return;
    if (!id) { s.classList.remove('show'); if (hint) hint.style.opacity = 1; return; }
    if (hint) hint.style.opacity = 0;
    if (id.indexOf('ghost:') === 0) {
      var gh = ghostCounts()[id.slice(6)]; if (!gh) return;
      s.innerHTML = '<div class="gt"><i class="ghosti"></i>' + esc(gh.title) + '</div><div class="gm">Not created yet · linked from ' + gh.n + ' note' + (gh.n === 1 ? '' : 's') + '</div><div class="gb"><button class="acc" data-act="gopen" data-id="' + esc(id) + '">Create note</button>' +
        (gh.from.length === 1 ? '<button data-act="gopen" data-id="' + gh.from[0] + '">Open source</button>' : '') + '</div>';
    } else if (id.indexOf('tag:') === 0) {
      var t = id.slice(4), c = 0; notes.forEach(function (n) { if (MD.tags(n.body).indexOf(t) >= 0) c++; });
      s.innerHTML = '<div class="gt"><i style="background:transparent;border:1.5px solid var(--text)"></i>#' + esc(t) + '</div><div class="gm">Tag · ' + c + ' note' + (c === 1 ? '' : 's') + '</div><div class="gb"><button class="acc" data-act="gopen" data-id="' + esc(id) + '">Show notes</button></div>';
    } else {
      var n = notes.get(id); if (!n) return;
      var out = outNotes(n).length, bl = backlinks(n).length, au = ui.graphAuto !== false ? autoOut(n).length + autoIn(n).length : 0;
      s.innerHTML = '<div class="gt"><i></i>' + esc(n.title) + '</div><div class="gm">' + esc(n.folder ? folderName(n.folder) : 'Vault') + ' · ' + out + ' link' + (out === 1 ? '' : 's') + ' · ' + bl + ' backlink' + (bl === 1 ? '' : 's') + (au ? ' · ' + au + ' auto' : '') + '</div>' +
        '<div class="gb"><button class="acc" data-act="gopen" data-id="' + n.id + '">Open note</button><button data-act="glocal" data-id="' + n.id + '">Local graph</button></div>';
    }
    s.classList.add('show');
  }

  function createGhost(id) {
    var gh = ghostCounts()[id.slice(6)]; if (!gh) return;
    var from = gh.from.length ? notes.get(gh.from[0]) : null;
    openLink(gh.title, null, from);
  }

  /* ---------- search ---------- */
  function renderSearch(q) {
    var h = '<div class="page"><div class="eyebrow">Vault</div><h1 class="h1">Search</h1><label class="searchbox">' + I.search +
      '<input id="sq" type="text" placeholder="Search notes, text or #tags" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search"><button class="clear" data-act="sclear" aria-label="Clear" style="display:none">' + I.x.replace('<svg', '<svg style="width:16px;height:16px;stroke-width:2"') + '</button></label><div id="sres"></div></div>';
    viewEl.innerHTML = h;
    var inp = $('#sq');
    inp.value = q || '';
    inp.addEventListener('input', function () { history.replaceState(null, '', '#/search/' + encodeURIComponent(inp.value)); currentHash = location.hash; doSearch(inp.value); });
    doSearch(inp.value);
    if (!q) setTimeout(function () { inp.focus(); }, 50);
  }
  function doSearch(q) {
    var box = $('#sres'), clr = $('.searchbox .clear'); if (!box) return;
    if (clr) clr.style.display = q ? '' : 'none';
    q = q.trim();
    if (!notes.size) {
      box.innerHTML = '<div class="empty"><b>No notes to search yet</b>' + (q ? 'Nothing matches \u201c' + esc(q.slice(0, 40)) + '\u201d.' : 'Once you write notes, find them here by title, text or #tag.') +
        '<div style="margin-top:16px">' + (q && !/^#/.test(q) && createName(q) ? '<button class="pill acc" data-act="screate" data-q="' + esc(q) + '">Create \u201c' + esc(createName(q).slice(0, 40)) + '\u201d</button>' : '<button class="pill acc" data-act="newempty">New note</button>') + '</div></div>';
      return;
    }
    if (!q) {
      var tc = tagCounts();
      box.innerHTML = (Object.keys(tc).length ? '<div class="sec"><span>Tags</span></div>' + tagChips(tc) : '') +
        '<div class="sec"><span>Recent</span></div>' + recent(5).map(function (n) { return noteItem(n, true); }).join('') +
        '<p class="stips">Search tips: <code>#tag</code> \u00b7 <code>folder:school</code> \u00b7 <code>title:exam</code> \u00b7 <code>"exact phrase"</code> \u00b7 <code>-word</code> to leave it out</p>';
      return;
    }
    var res = [];
    if (/^#[\w\-\/]+$/.test(q)) {
      var tg = q.slice(1).toLowerCase();
      notes.forEach(function (n) { if (MD.tags(n.body).some(function (t) { return t === tg || t.indexOf(tg + '/') === 0; })) res.push({ n: n, sc: 1, snip: snippetHTML(n.body) }); });
    } else {
      var Q = parseQuery(q), nq = Q.plain.toLowerCase(), terms = Q.terms, first = terms[0] || (Q.phrases[0] || '').toLowerCase();
      notes.forEach(function (n) {
        var t = n.title.toLowerCase(), b = n.body.toLowerCase(), sc = 0;
        if (Q.tags.length) { var nt = MD.tags(n.body); if (!Q.tags.every(function (tg) { return nt.some(function (x) { return x === tg || x.indexOf(tg + '/') === 0; }); })) return; }
        if (Q.folders.length) { var f = n.folder.toLowerCase(); if (!Q.folders.every(function (fo) { return f === fo || f.indexOf(fo + '/') === 0 || f.indexOf(fo) >= 0; })) return; }
        if (Q.titles.length && !Q.titles.every(function (w) { return t.indexOf(w) >= 0; })) return;
        if (Q.excl.some(function (w) { return t.indexOf(w) >= 0 || b.indexOf(w) >= 0; })) return;
        if (Q.phrases.length && !Q.phrases.every(function (p) { return t.indexOf(p) >= 0 || b.indexOf(p) >= 0; })) return;
        if (nq) { if (t === nq) sc += 100; else if (t.indexOf(nq) === 0) sc += 40; else if (t.indexOf(nq) >= 0) sc += 25; }
        var allIn = terms.every(function (w) { return t.indexOf(w) >= 0 || b.indexOf(w) >= 0; });
        if (!sc && !allIn) return;
        if (!terms.length && !Q.phrases.length && !sc) sc = 1;
        var bi = first ? b.indexOf(first) : -1;
        if (bi >= 0) sc += 5 + Math.min(5, b.split(first).length - 1);
        res.push({ n: n, sc: sc, snip: bi >= 0 ? hitSnippet(n.body, first) : snippetHTML(n.body) });
      });
    }
    res.sort(function (a, b) { return b.sc - a.sc || b.n.updated - a.n.updated; });
    var tagRow = '';
    if (/^#[\w\-\/]+$/.test(q)) { tagRow = '<div style="margin-top:14px">' + tagChips(tagCounts(), 12) + '</div>'; tagRow = tagRow.replace('data-tag="' + esc(q.slice(1).toLowerCase()) + '"', 'data-tag="' + esc(q.slice(1).toLowerCase()) + '" data-on="1"'); }
    box.innerHTML = tagRow + '<div class="sec"><span>' + res.length + ' result' + (res.length === 1 ? '' : 's') + '</span></div>' + (res.length ? res.slice(0, 100).map(function (r) {
      return '<button class="nl" data-act="open" data-id="' + r.n.id + '"><div class="t"><b>' + hl(r.n.title, /^#/.test(q) ? q : (parseQuery(q).plain || q)) + '</b><time>' + ago(r.n.updated) + '</time></div><div class="s" style="white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + r.snip + '</div>' + (r.n.folder ? '<div class="f">' + esc(crumbOf(r.n.folder)) + '</div>' : '') + '</button>';
    }).join('') : '<div class="empty"><b>Nothing found</b>' + (createName(q) ? '<button class="pill acc" data-act="screate" data-q="' + esc(q) + '" style="margin-top:12px">Create \u201c' + esc(createName(q).slice(0, 40)) + '\u201d</button>' : '') + '</div>');
  }
  /* the note name a search would create: the characters names can't use become spaces; search operators and quotes are dropped */
  function createName(q) { var Q = parseQuery(String(q || '')), t = Q.plain || Q.titles.join(' '); return t.replace(/[\[\]|#^\\\/:"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120); }
  /* search syntax: words, "exact phrase", #tag or tag:x, folder:x (path:x), title:x, -word to exclude */
  function parseQuery(q) {
    var Q = { terms: [], phrases: [], tags: [], folders: [], titles: [], excl: [], plain: '' }, re = /"([^"]+)"|(\S+)/g, m, plain = [];
    while ((m = re.exec(q))) {
      if (m[1]) { Q.phrases.push(m[1].toLowerCase()); plain.push(m[1]); continue; }
      var w = m[2], lw = w.toLowerCase(), k;
      if ((k = /^(tag|t):(.+)$/.exec(lw))) Q.tags.push(k[2].replace(/^#/, ''));
      else if (/^#[\w\-\/]+$/.test(lw)) Q.tags.push(lw.slice(1));
      else if ((k = /^(folder|path|in):(.+)$/.exec(lw))) Q.folders.push(k[2].replace(/"/g, ''));
      else if ((k = /^title:(.+)$/.exec(lw))) Q.titles.push(k[1]);
      else if (lw.length > 1 && lw[0] === '-') Q.excl.push(lw.slice(1));
      else { Q.terms.push(lw); plain.push(w); }
    }
    Q.plain = plain.join(' ');
    return Q;
  }
  function hl(text, q) { var i = text.toLowerCase().indexOf(q.toLowerCase()); if (i < 0) return esc(text); return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length)); }
  function cleanText(body) {
    return MD.stripFront(body).replace(/```[\s\S]*?(```|$)/g, ' ').replace(MD.IMG, ' ').replace(new RegExp(MD.WL.source, 'g'), function (m, t, h, a) { return (a || t).trim(); })
      .replace(/\[([^\]\n]+)\]\([^)]+\)/g, '$1').replace(/^\s*#{1,6}\s+/gm, '').replace(/^\s*>\s?(\[!\w+\]\s*)?/gm, '')
      .replace(/^\s*([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/gm, '').replace(/^\s*\|?\s*:?-{2,}.*$/gm, '').replace(/\|/g, ' ').replace(/[\s\S]*/, MD.unmark).replace(/\s*\n\s*/g, ' · ').replace(/^ · | · $/g, '');
  }
  function hitSnippet(body, term) {
    var plain = cleanText(body), i = plain.toLowerCase().indexOf(term);
    if (i < 0) return snippetHTML(body);
    var s = Math.max(0, i - 40), e = Math.min(plain.length, i + term.length + 110);
    return (s > 0 ? '…' : '') + esc(plain.slice(s, i)) + '<mark>' + esc(plain.slice(i, i + term.length)) + '</mark>' + esc(plain.slice(i + term.length, e)) + (e < plain.length ? '…' : '');
  }

  /* ---------- settings ---------- */
  function isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
  function renderSettings() {
    var h = '<div class="page"><div class="eyebrow">Axon</div><h1 class="h1">Settings</h1>' +
      '<div class="group progrp"><button class="item" data-act="getpro"><span>' + (isPro() ? 'Axon Pro is on' : 'Get Axon Pro \u00b7 $35') + '<small>' + (isPro() ? (PRO.acct ? 'On your account ' + esc(PRO.acct) + ', on every device you log in on' : 'This device had Axon before Pro, so it keeps every feature') : PRO.req && PRO.req.status === 'new' && syOn() ? 'Request sent \u00b7 turns on by itself once the Apple Cash payment is marked paid' : 'Sync, History, Graph, Templates, Daily notes, Recall and more \u00b7 one time') + '</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div>' +
      '<div class="sec"><span>Reading</span></div><div class="group">' +
      '<div class="item"><span>Text size</span><div class="seg">' + SIZES.map(function (s) { return '<button class="' + (settings.fs === s[1] ? 'on' : '') + '" data-act="fs" data-v="' + s[1] + '" style="font-size:' + (s[1] - 3) + 'px">' + s[0] + '</button>'; }).join('') + '</div></div>' +
      '<div class="preview prose">The <a class="wl" href="#" data-noop="1">Basal ganglia</a> gate movement; dopamine tips the balance toward <strong>go</strong>.</div></div>' +
      '<div class="sec"><span>' + proTag('Accent') + '</span><span style="text-transform:none;letter-spacing:0">' + esc((ACCENTS.filter(function (a) { return a[1] === settings.accent; })[0] || ['Custom'])[0]) + '</span></div><div class="group"><div class="sw">' +
      ACCENTS.map(function (a) { return '<button aria-label="' + a[0] + '" class="' + (settings.accent === a[1] ? 'on' : '') + '" data-act="accent" data-v="' + a[1] + '" style="background:' + a[1] + '"></button>'; }).join('') + '</div></div>' +
      syHTML() +
      '<div class="sec"><span>Vault</span></div><div class="group">' +
      '<button class="item" data-act="export"><span>Back up vault<small>All ' + notes.size + ' notes as .md files in a .zip, with images, pins and Recall progress \u00b7 last backup ' + (settings.lastExport ? agoLong(settings.lastExport) : 'never') + '</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '<button class="item" data-act="allcards"><span>' + proTag('Export flashcards') + '<small>' + (function () { var c = 0, m = 0; notes.forEach(function (n) { var k = MD.cards(n.body).length; c += k; if (k) m++; }); return c ? c + ' card' + (c === 1 ? '' : 's') + ' from ' + m + ' note' + (m === 1 ? '' : 's') + ' · a CSV that Synapse imports' : 'Lines like question :: answer become cards for Synapse'; })() + '</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '<button class="item" data-act="import"><span>Import or restore<small>Pick .md files, a .zip of them, or an Axon backup \u00b7 notes already here are skipped</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '<button class="item" data-act="newfolder" data-path=""><span>New folder</span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '<button class="item" data-act="gotrash"><span>Trash<small>' + (trash.size ? trash.size + ' note' + (trash.size === 1 ? '' : 's') + ' \u00b7 kept ' + TRASH_DAYS + ' days, then removed' : 'Deleted notes wait here ' + TRASH_DAYS + ' days') + '</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
            '<button class="item danger" data-act="wipe"><span>Delete all notes</span></button></div>' +
      '<div class="sec"><span>Links</span></div><div class="group">' +
      '<button class="item" data-act="autolink"><span>' + proTag('Auto-link mentions') + '<small>' + (function () { var c = 0, m = 0; notes.forEach(function (o) { var k = mentionsOf(o).length; c += k; if (k) m++; }); return c ? c + ' plain mention' + (c === 1 ? '' : 's') + ' of other notes in ' + m + ' note' + (m === 1 ? '' : 's') + ' \u2014 turn them into [[links]]' : 'Every mention of another note is already a link'; })() + '</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
      (alBackup ? '<button class="item" data-act="autoundo"><span>Undo last auto-link<small>' + alBackup.count + ' link' + (alBackup.count === 1 ? '' : 's') + ' added ' + agoLong(alBackup.ts) + '</small></span></button>' : '') +
      '<div class="item"><span>Auto-link in the graph<small>Notes that mention another note by name (or an alias from its front matter) are drawn as dotted lines, without changing your text. Toggle it with the Auto-link chip on the graph.</small></span></div></div>' +
      '<div class="sec"><span>Daily notes</span></div><div class="group">' +
      '<button class="item" data-act="dailytmpl"><span>' + proTag('Template for new daily notes') + '<small>' + (settings.dailyTmpl ? esc(settings.dailyTmpl) : 'None \u2014 new daily notes start empty') + '</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '<div class="item"><span>Where they live<small>Daily notes are kept in the \u201c' + DAILY + '\u201d folder, named by date. Tap the day chip on one to open the calendar.</small></span></div></div>' +
      '<div class="sec"><span>Discover</span></div><div class="group">' +
      '<div class="item"><span>Discover uses the internet<small>Looks up your note topics on Wikipedia while Discover is open. Only the search words are sent.</small></span><div class="seg">' + [['1', 'On'], ['0', 'Off']].map(function (s) { return '<button class="' + ((settings.discoverNet !== false) === (s[0] === '1') ? 'on' : '') + '" data-act="dnet" data-v="' + s[0] + '" style="font-family:var(--sans);font-size:13px">' + s[1] + '</button>'; }).join('') + '</div></div>' +
      '<button class="item" data-act="dclear"><span>Clear Discover history<small>Forget saved cards and \u201cnot for me\u201d picks</small></span></button></div>' +
      '<div class="sec"><span>Recall</span></div><div class="group">' +
      '<div class="item"><span>New cards a day</span><div class="seg">' + [[10, '10'], [20, '20'], [50, '50'], [9999, 'All']].map(function (s) { return '<button class="' + ((settings.newPerDay || 20) === s[0] ? 'on' : '') + '" data-act="newper" data-v="' + s[0] + '" style="font-family:var(--sans);font-size:13px">' + s[1] + '</button>'; }).join('') + '</div></div>' +
      '<button class="item" data-act="gorecall"><span>Open Recall<small>' + (function () { var s = recallStats(); return s.total ? s.total + ' card' + (s.total === 1 ? '' : 's') + ' \u00b7 ' + s.due + ' due today' : 'Lines like question :: answer or {{c::cloze}} become review cards'; })() + '</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '<button class="item danger" data-act="resetrecall"><span>Reset Recall progress</span></button></div>' +
      '<div class="sec"><span>Help</span></div><div class="group">' +
      '<button class="item" data-act="guide"><span>Formatting guide<small>Every block you can put in a note, and the shortcuts</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '<div class="item"><span>Templates<small>Make a folder called \u201cTemplates\u201d. Notes in it appear in New from template. {{date}}, {{time}} and {{title}} fill in for you.</small></span></div></div>' +
      '<div class="sec"><span>About</span></div><div class="group">' +
      '<button class="item" data-act="stats"><span>Vault stats<small>' + (function () { var s = vaultStats(); return s.notes + ' note' + (s.notes === 1 ? '' : 's') + ' \u00b7 ' + s.words.toLocaleString() + ' word' + (s.words === 1 ? '' : 's') + ' \u00b7 ' + s.links + ' link' + (s.links === 1 ? '' : 's'); })() + '</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '<div class="item"><span>Storage<small>' + (syOn() ? 'Notes live on this device, work offline, and sync encrypted to your account.' : 'Notes live only on this device and work offline.') + ' Each note keeps up to 30 days of earlier versions (note menu \u203a History). Tap Back up vault now and then to keep a copy off this phone.</small></span></div>' +
      (isStandalone() ? '' : '<div class="item"><span>Install on iPhone<small>In Safari tap Share, then Add to Home Screen.</small></span></div>') +
      '</div><input type="file" id="file" accept=".md,.markdown,.txt,.zip,.jpg,.jpeg,.png,.webp,.gif,text/markdown,text/plain,application/zip,application/x-zip-compressed,application/octet-stream" multiple hidden>' +
      '<div class="foot"><b>Axon<i>.</i></b>by Northpeak Studios · v' + VERSION + '<span class="vinfo">' + esc(viewportInfo()) + '</span></div></div>';
    viewEl.innerHTML = h;
    $('#file').addEventListener('change', function (e) { importFiles(Array.from(e.target.files || [])); e.target.value = ''; });
  }
  function vaultStats() {
    var s = { notes: 0, words: 0, links: 0, auto: 0, unresolved: 0, tags: 0, cards: 0, images: 0, folders: folders.size, longest: null, oldest: null, newest: null, daily: 0, orphans: 0 };
    var tagset = {}, linked = {};
    notes.forEach(function (n) {
      s.notes++; var w = words(n.body); s.words += w;
      var ls = linksOf(n); s.links += outNotes(n).length; s.unresolved += unresolvedOf(n).length;
      outNotes(n).forEach(function (o) { linked[o.id] = 1; }); if (ls.length) linked[n.id] = 1;
      MD.tags(n.body).forEach(function (t) { tagset[t] = 1; });
      s.cards += MD.cards(n.body).length; s.images += MD.images(n.body).length;
      if (isDaily(n)) s.daily++;
      if (!s.longest || w > s.longest.w) s.longest = { n: n, w: w };
      if (!s.oldest || (n.created || n.updated) < (s.oldest.created || s.oldest.updated)) s.oldest = n;
      if (!s.newest || n.updated > s.newest.updated) s.newest = n;
    });
    notes.forEach(function (n) { if (!linked[n.id] && !isDaily(n) && !inTemplates(n)) s.orphans++; s.auto += mentionsOf(n).length; });
    s.tags = Object.keys(tagset).length;
    return s;
  }
  async function showStats() {
    var s = vaultStats();
    var rows = [['Notes', s.notes + (s.daily ? ' (' + s.daily + ' daily)' : '')], ['Words', s.words.toLocaleString()], ['Folders', s.folders], ['Links between notes', s.links], ['Unresolved links', s.unresolved], ['Mentions not yet linked', s.auto], ['Notes with no links', s.orphans], ['Tags', s.tags], ['Recall cards', s.cards], ['Images', s.images]];
    if (s.longest && s.longest.w) rows.push(['Longest note', s.longest.n.title + ' \u00b7 ' + s.longest.w.toLocaleString() + ' words']);
    if (s.newest) rows.push(['Last edited', s.newest.title + ' \u00b7 ' + agoLong(s.newest.updated)]);
    await dialog({ title: 'Vault stats', html: '<div class="stats">' + rows.map(function (r) { return '<div><span>' + esc(String(r[0])) + '</span><b>' + esc(String(r[1])) + '</b></div>'; }).join('') + '</div>', ok: 'Done', noCancel: true });
  }
  function applySettings() {
    var r = document.documentElement.style;
    r.setProperty('--fs', settings.fs + 'px');
    r.setProperty('--accent', settings.accent);
    var v = parseInt(settings.accent.slice(1), 16);
    r.setProperty('--accent-soft', 'rgba(' + (v >> 16 & 255) + ',' + (v >> 8 & 255) + ',' + (v & 255) + ',.16)');
  }
  function saveSettings() { DB.put('meta', { k: 'settings', v: settings }); applySettings(); }

  /* ---------- export / import ---------- */
  function safeName(s) { return s.replace(/[\\\/:*?"<>|]/g, '-').trim() || 'Untitled'; }
  function relUp(folder) { return folder ? folder.split('/').map(function () { return '../'; }).join('') : ''; }
  async function exportVault() {
    if (!notes.size) { toast('Nothing to export yet'); return; }
    var used = {}, files = [], imgs = {};
    notes.forEach(function (n) { MD.images(n.body).forEach(function (i) { imgs[i] = 1; }); });
    var ext = {};
    for (var id of Object.keys(imgs)) {
      try {
        var r = await IMG.get(id); if (!r) continue;
        ext[id] = /png/.test(r.type) ? 'png' : /webp/.test(r.type) ? 'webp' : /gif/.test(r.type) ? 'gif' : 'jpg';
        files.push({ name: 'attachments/' + id + '.' + ext[id], data: new Uint8Array(r.data), date: new Date(r.created || Date.now()) });
      } catch (e) {}
    }
    var nimg = files.length, meta = { app: 'axon', v: 1, exported: Date.now(), notes: [], recall: [] };
    notes.forEach(function (n) {
      var folderPath = n.folder ? n.folder.split('/').map(safeName).join('/') : '';
      var path = (folderPath ? folderPath + '/' : '') + safeName(n.title);
      var p = path, i = 2; while (used[p.toLowerCase()]) p = path + ' ' + (i++);
      used[p.toLowerCase()] = 1;
      var body = n.body.replace(/!\[([^\]\n]*)\]\(\s*axon-img:([\w-]+)\s*\)/g, function (m, alt, id) { return ext[id] ? '![' + alt + '](' + relUp(folderPath) + 'attachments/' + id + '.' + ext[id] + ')' : m; });
      files.push({ name: p + '.md', data: body, date: new Date(n.updated) });
      meta.notes.push({ p: p + '.md', id: n.id, title: n.title, folder: n.folder, created: n.created, updated: n.updated, pinned: !!n.pinned });
    });
    /* exact titles, dates, pins and Recall progress ride along, so restoring this file loses nothing */
    rc.forEach(function (s) { if (s && notes.has(s.noteId)) meta.recall.push(s); });
    meta.folders = Array.from(folders);
    files.push({ name: '.axon/vault.json', data: JSON.stringify(meta), date: new Date() });
    folders.forEach(function (f) { if (!countIn(f)) files.push({ name: f.split('/').map(safeName).join('/') + '/.keep', data: '' }); });
    var blob = Zip.make(files);
    var d = new Date(), name = 'Axon vault ' + ymd(d) + '.zip';
    deliver(blob, name, 'application/zip', 'Exported ' + notes.size + ' note' + (notes.size === 1 ? '' : 's') + (nimg ? ' · ' + nimg + ' image' + (nimg === 1 ? '' : 's') : ''), function () {
      settings.lastExport = Date.now(); saveSettings();
      var r = route(); if (r.v === 'settings' || r.v === 'vault') render();
    });
  }
  function deliver(blob, name, type, msg, onSaved) {
    var file = null, ok = function () { toast(msg); if (onSaved) try { onSaved(); } catch (e) {} };
    try { file = new File([blob], name, { type: type }); } catch (e) {}
    var ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).then(ok).catch(function (e) { if (e && e.name !== 'AbortError') { download(blob, name); ok(); } });
      return;
    }
    download(blob, name);
    ok();
  }
  /* local-first means the only copy lives on this phone: nudge for a backup now and then */
  function needsBackup() {
    if (notes.size < 10 || syOn()) return false; /* with cloud sync on, the notes aren't only on this phone */
    var now = Date.now(), DAY = 864e5;
    if (settings.backupSnooze && now - settings.backupSnooze < 7 * DAY) return false;
    if (settings.lastExport) return now - settings.lastExport > 14 * DAY;
    var oldest = now; notes.forEach(function (n) { if (n.created < oldest) oldest = n.created; });
    return now - oldest > 3 * DAY;
  }
  function backupRow() {
    if (!needsBackup()) return '';
    return '<div class="bkup">' + I.shield + '<span>Your notes only live on this phone.<small>' + (settings.lastExport ? 'Last backup ' + agoLong(settings.lastExport) : 'No backup yet') + ' \u00b7 save a copy to Files</small></span>' +
      '<button class="bkgo" data-act="export">Back up</button><button class="bkx" data-act="bksnooze" aria-label="Remind me later">' + I.x + '</button></div>';
  }
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  var IMG_EXT = /\.(jpe?g|png|webp|gif)$/i;
  function imgType(name) { var e = (IMG_EXT.exec(name) || [, 'jpg'])[1].toLowerCase(); return e === 'png' ? 'image/png' : e === 'webp' ? 'image/webp' : e === 'gif' ? 'image/gif' : 'image/jpeg'; }
  function normPath(p) { var out = []; p.split('/').forEach(function (x) { if (!x || x === '.') return; if (x === '..') out.pop(); else out.push(x); }); return out.join('/'); }
  async function importFiles(list) {
    if (!list.length) return;
    var entries = [], images = [], keeps = [], meta = null, metaRoot = '', dec = new TextDecoder();
    var zipSeen = 0, zipFilesN = 0, otherN = 0, strictDec = null, readErr = '', badN = 0;
    try { strictDec = new TextDecoder('utf-8', { fatal: true }); } catch (e) {}
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      try {
        /* iOS can hand a file over renamed, without its extension or with an empty type, so look at the bytes:
           a zip starts with PK\x03\x04 (or PK\x05\x06 when empty) whatever it's called */
        var buf = await f.arrayBuffer(), head = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
        var isZip = head.length === 4 && head[0] === 0x50 && head[1] === 0x4b && ((head[2] === 3 && head[3] === 4) || (head[2] === 5 && head[3] === 6));
        if (isZip) {
          zipSeen++;
          var z = await Zip.read(buf);
          if (z.bad) { badN += z.bad; readErr = z.err || readErr; }
          z.forEach(function (e) {
            if (!/\/$/.test(e.name)) zipFilesN++;
            var mm = /(^|\/)\.axon\/vault\.json$/.exec(e.name);
            if (mm && !meta) { try { var j = JSON.parse(dec.decode(e.data)); if (j && j.app === 'axon' && Array.isArray(j.notes)) { meta = j; metaRoot = e.name.slice(0, mm.index + mm[1].length); } } catch (err) {} return; }
            if (/(^|\/)\.keep$/.test(e.name) && !/__MACOSX/.test(e.name)) { keeps.push(e.name.replace(/\/?\.keep$/, '')); return; }
            if (/(^|\/)(__MACOSX|\.)/.test(e.name)) return;
            if (/\.(md|markdown|txt)$/i.test(e.name)) entries.push({ path: e.name, text: dec.decode(e.data), date: e.date });
            else if (IMG_EXT.test(e.name)) images.push({ path: e.name, data: e.data });
          });
        } else if (/\.(md|markdown|txt)$/i.test(f.name) || /^text\//.test(f.type)) {
          entries.push({ path: f.name, text: dec.decode(buf), date: f.lastModified || 0 });
        } else if (IMG_EXT.test(f.name)) {
          images.push({ path: f.name, data: new Uint8Array(buf) });
        } else {
          /* no (or an unknown) extension: if the bytes are plain UTF-8 text, it's a note */
          var txt = null;
          if (strictDec && buf.byteLength) { try { txt = strictDec.decode(buf); } catch (e2) { txt = null; } }
          if (txt !== null && txt.indexOf('\u0000') < 0) entries.push({ path: f.name.replace(/\.[^.\/]{1,8}$/, '') + '.md', text: txt, date: f.lastModified || 0 });
          else otherN++;
        }
      } catch (err) { readErr = (f.name || 'that file') + ': ' + err.message; }
    }
    if (!entries.length) {
      /* a read error is the real news: never cover it with "no markdown files" */
      if (readErr) { toast('Couldn\u2019t read ' + readErr + (badN ? ' (' + badN + ' file' + (badN === 1 ? '' : 's') + ' in the zip)' : '')); return; }
      toast(zipSeen ? 'That zip had 0 notes (' + zipFilesN + ' file' + (zipFilesN === 1 ? '' : 's') + ', none ending in .md or .txt)' : otherN ? 'That file isn\u2019t a zip or a text note' : 'No markdown files found');
      return;
    }
    // images: keep Axon's own ids so a re-import never duplicates them
    var byPath = {}, byBase = {}, nimg = 0;
    for (var k = 0; k < images.length; k++) {
      var im = images[k], base = im.path.split('/').pop(), stem = base.replace(IMG_EXT, '');
      var id = /^i[a-z0-9]{6,40}$/.test(stem) ? stem : 'i' + uid();
      try {
        var buf = im.data.buffer.slice(im.data.byteOffset, im.data.byteOffset + im.data.byteLength);
        await IMG.put({ id: id, data: buf, type: imgType(base), created: Date.now() });
        byPath[normPath(im.path).toLowerCase()] = id; byBase[base.toLowerCase()] = id; nimg++;
      } catch (err) {}
    }
    function linkImages(text, path) {
      if (!nimg) return text;
      var dir = path.split('/').slice(0, -1).join('/');
      function find(t) {
        try { t = decodeURI(t); } catch (e) {}
        t = t.replace(/^<|>$/g, '').split(/[?#]/)[0];
        return byPath[normPath((dir ? dir + '/' : '') + t).toLowerCase()] || byPath[normPath(t).toLowerCase()] || byBase[t.split('/').pop().toLowerCase()] || null;
      }
      return text.replace(/!\[([^\]\n]*)\]\(\s*([^)\s]+)\s*\)/g, function (m, alt, t) {
        if (/^(axon-img:|https?:|data:)/i.test(t)) return m;
        var id = find(t); return id ? '![' + alt + '](axon-img:' + id + ')' : m;
      }).replace(/!\[\[([^\]|\n]+?)(?:\|[^\]\n]*)?\]\]/g, function (m, t) {
        if (!IMG_EXT.test(t.trim())) return m;
        var id = find(t.trim()); return id ? '![](axon-img:' + id + ')' : m;
      });
    }
    // drop a shared top folder (e.g. "My vault/")
    var tops = {}; entries.forEach(function (e) { tops[e.path.split('/')[0]] = 1; });
    var strip = !meta && Object.keys(tops).length === 1 && entries.every(function (e) { return e.path.indexOf('/') > 0; });
    var byMeta = {}; if (meta) meta.notes.forEach(function (m) { if (m && typeof m.p === 'string') byMeta[m.p] = m; });
    function okTitle(t) { return typeof t === 'string' && t.trim() && t.length <= 120 && !/[\[\]|#^\\\/:]/.test(t); }
    function okFolder(f) { return typeof f === 'string' && !/[\[\]|#^\\:]/.test(f) && f.split('/').every(Boolean); }
    var count = 0, renamed = 0, same = 0, kept = {}, intoTops = {};
    entries.forEach(function (e) {
      var m = meta && e.path.indexOf(metaRoot) === 0 ? byMeta[e.path.slice(metaRoot.length)] : null;
      var parts = e.path.split('/'); if (strip) parts.shift();
      var base = parts.pop().replace(/\.(md|markdown|txt)$/i, '');
      var folder = parts.map(function (p) { return p.replace(/[\[\]|#^\\:]/g, '').trim(); }).filter(Boolean).join('/');
      var title = base.replace(/[\[\]|#^\\\/:]/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled';
      if (m) { if (okTitle(m.title)) title = m.title.trim().replace(/\s+/g, ' '); if (m.folder === '' || okFolder(m.folder)) folder = m.folder; }
      var body = linkImages(e.text.replace(/\r\n?/g, '\n'), e.path);
      var ex = byTitle(title);
      /* the same note is already here (e.g. restoring a backup onto the same phone): skip it, never duplicate */
      if (ex && ex.body === body) { same++; if (m && ex.id === m.id) kept[ex.id] = 1; return; }
      var t = title;
      if (ex) { t = uniqueTitle(title + ' (imported)'); renamed++; }
      var when = m && +m.updated > 0 ? +m.updated : (+e.date > 0 ? +e.date : 0);
      var id = m && typeof m.id === 'string' && /^[\w-]{1,40}$/.test(m.id) && !notes.has(m.id) && !trash.has(m.id) ? m.id : undefined;
      var n = createNote({ id: id, title: t, folder: folder, body: body, created: (m && +m.created > 0 ? +m.created : when) || undefined, updated: when || undefined });
      if (m && m.pinned) { n.pinned = true; putNote(n); }
      if (id) kept[id] = 1;
      if (folder) intoTops[folder.split('/')[0]] = 1;
      count++;
    });
    keeps.forEach(function (k) { var p = k.split('/'); if (strip) p.shift(); p = p.map(function (x) { return x.replace(/[\[\]|#^\\:]/g, '').trim(); }).filter(Boolean).join('/'); if (p && p !== 'attachments') ensureFolder(p); });
    if (meta && Array.isArray(meta.folders)) meta.folders.forEach(function (f) { if (okFolder(f)) ensureFolder(f); });
    var nrc = 0;
    if (meta && Array.isArray(meta.recall)) meta.recall.forEach(function (s) {
      if (!s || typeof s.id !== 'string' || !kept[s.noteId] || rc.has(s.id)) return;
      rc.set(s.id, s); RC.put('cards', s).catch(function () {}); nrc++;
    });
    if (nrc) recallSoon();
    if (!count && same) toast('Everything in that file is already in your vault');
    else toast('Imported ' + count + ' note' + (count === 1 ? '' : 's') + (function () { var t = Object.keys(intoTops).sort(); return t.length > 1 ? ' into ' + t.length + ' tabs: ' + t.join(', ') : t.length === 1 ? ' into ' + t[0] : ''; })() + (nimg ? ' · ' + nimg + ' image' + (nimg === 1 ? '' : 's') : '') + (same ? ' · ' + same + ' already here' : '') + (renamed ? ' · ' + renamed + ' renamed to avoid clashes' : '') + (badN ? ' · ' + badN + ' file' + (badN === 1 ? '' : 's') + ' couldn\u2019t be unpacked' : ''));
    /* land on Notes, where each imported folder is now a tab */
    if (count && !meta && route().v !== 'vault') go('#/'); else render();
  }

  /* ---------- actions ---------- */
  function newNote(folder) {
    if (folder === undefined) {
      var r = route();
      folder = r.v === 'folder' && r.path !== '*' ? r.path : (r.v === 'note' && notes.get(r.id) ? notes.get(r.id).folder : '');
    }
    var n = createNote({ title: uniqueTitle('Untitled'), folder: folder, body: '' });
    freshNote[n.id] = 1;
    go('#/n/' + n.id);
    startEditing(n, true);
  }
  async function newFolder(parent) {
    var name = await dialog({ title: 'New folder', message: parent ? 'Inside ' + parent.split('/').join(' / ') : '', input: true, placeholder: 'Folder name', ok: 'Create',
      validate: function (v) { if (!v) return 'Type a name.'; if (/[\/\\\[\]|#^:]/.test(v)) return 'Folder names can\u2019t use / \\ [ ] | # ^ :'; if (folders.has((parent ? parent + '/' : '') + v)) return 'That folder already exists.'; return null; } });
    if (!name) return;
    var p = (parent ? parent + '/' : '') + name;
    ensureFolder(p);
    if (parent) { ui.open[parent] = true; saveMeta(); }
    toast('Folder \u201c' + name + '\u201d created');
    render();
  }
  async function noteMenu(n, preset) {
    var nc = MD.cards(n.body).length;
    var a = preset || await sheet({ title: n.title, left: true, actions: [{ label: n.pinned ? 'Unpin' : 'Pin to top', value: 'pin', icon: I.pin }, { label: 'Find in note', value: 'find', icon: I.search }, { label: 'Share\u2026', value: 'share', icon: I.ext }, { label: 'Copy as Markdown', value: 'copy', icon: I.copy }, { label: proTag('History\u2026'), value: 'hist', icon: I.restore }, { label: proTag(copyOrigin(n) ? 'Merge into \u201c' + copyOrigin(n).title + '\u201d\u2026' : 'Merge a note into this\u2026'), value: 'merge', icon: I.copy }, { label: 'Rename', value: 'rename', icon: I.edit }, { label: 'Move to folder', value: 'move', icon: I.folder.replace(' class="fi"', '') }, { label: 'Duplicate', value: 'dup', icon: I.copy }]
      .concat(inTemplates(n) ? [] : [{ label: proTag('Save as template'), value: 'tmpl', icon: I.tmpl }])
      .concat(nc ? [{ label: proTag('Review ' + nc + ' card' + (nc === 1 ? '' : 's') + ' now'), value: 'review', icon: I.recall }, { label: proTag('Export ' + nc + ' card' + (nc === 1 ? '' : 's') + ' (CSV for Synapse)'), value: 'cards', icon: I.copy }] : [])
      .concat([{ label: proTag('Local graph'), value: 'lg', icon: I.graph }, { label: 'Move to Trash', value: 'delete', danger: true, icon: I.trash }]) });
    var PM = { hist: 'History', merge: 'Merge', tmpl: 'Templates', review: 'Recall', cards: 'Flashcard export', lg: 'Graph' };
    if (PM[a] && !proOk(PM[a])) return;
    if (a === 'cards') { exportCards(n); return; }
    if (a === 'find') { if (route().v !== 'note') go('#/n/' + n.id); openFind(n); return; }
    if (a === 'share') { shareNote(n); return; }
    if (a === 'copy') { copyNote(n); return; }
    if (a === 'hist') { showHistory(n); return; }
    if (a === 'merge') { pickMerge(n); return; }
    if (a === 'pin') { togglePin(n); renderNote(n.id); return; }
    if (a === 'dup') { var c = await duplicateNote(n); go('#/n/' + c.id); return; }
    if (a === 'review') { go('#/review/' + encodeURIComponent(n.id)); return; }
    if (a === 'lg') { ui.lastNote = n.id; ui.graphMode = 'local'; saveMeta(); go('#/graph'); return; }
    if (a === 'tmpl') { var t = createNote({ title: uniqueTitle(n.title + ' template'), folder: TEMPLATES, body: n.body }); toast('Saved to Templates as \u201c' + t.title + '\u201d'); return; }
    if (a === 'rename') {
      var v = await dialog({ title: 'Rename note', message: 'Links to this note will update too.', input: true, value: n.title, ok: 'Rename', validate: function (v) { return checkTitle(v, n); } });
      if (v && v !== n.title) { var r = renameNote(n, v); toast(r.changed ? 'Renamed · updated links in ' + r.changed + ' note' + (r.changed === 1 ? '' : 's') : 'Renamed'); if (route().v === 'note') renderNote(n.id); }
    } else if (a === 'move') {
      var opts = [{ label: '/  Vault (no folder)', value: '\u0000' }].concat(Array.from(folders).sort().map(function (f) { return { label: f.split('/').join(' / '), value: f }; }));
      opts.push({ label: '+  New folder\u2026', value: '\u0001' });
      var f = await sheet({ title: 'Move \u201c' + n.title + '\u201d', actions: opts, left: true });
      if (f === '\u0001') {
        f = await dialog({ title: 'New folder', message: 'Moves \u201c' + n.title + '\u201d into it. Use / for a folder inside another.', input: true, placeholder: 'Folder name', ok: 'Create and move',
          validate: function (v) { if (!v) return 'Type a name.'; if (/[\\\[\]|#^:]/.test(v) || /^\/|\/$|\/\//.test(v)) return 'Folder names can\u2019t use \\ [ ] | # ^ :'; return null; } });
        if (f) f = f.split('/').map(function (x) { return x.trim(); }).join('/');
      }
      if (f) ensureFolder(f === '\u0000' ? '' : f);
      if (f !== null && f !== undefined && f !== false && f !== '') { moveNote(n, f === '\u0000' ? '' : f); toast('Moved'); if (route().v === 'note') renderNote(n.id); }
    } else if (a === 'delete') {
      var to = n.folder && folders.has(n.folder) ? '#/f/' + encodeURIComponent(n.folder) : '#/';
      askTrash(n, function () { go(to, true); });
    }
  }
  async function folderMenu(p) {
    var a = await sheet({ title: folderName(p), actions: [{ label: 'New note here', value: 'note' }, { label: 'New from template', value: 'tmpl' }, { label: 'New folder inside', value: 'sub' }, { label: 'Rename folder', value: 'rename' }, { label: 'Delete folder', value: 'delete', danger: true }] });
    if (a === 'note') newNote(p);
    else if (a === 'tmpl') newFromTemplate(p);
    else if (a === 'sub') newFolder(p);
    else if (a === 'rename') {
      var v = await dialog({ title: 'Rename folder', input: true, value: folderName(p), ok: 'Rename',
        validate: function (v) { if (!v) return 'Type a name.'; if (/[\/\\\[\]|#^:]/.test(v)) return 'Folder names can\u2019t use / \\ [ ] | # ^ :'; var np = (parentOf(p) ? parentOf(p) + '/' : '') + v; if (np !== p && folders.has(np)) return 'That folder already exists.'; return null; } });
      if (v && v !== folderName(p)) { var np = renameFolder(p, v); toast('Folder renamed'); go('#/f/' + encodeURIComponent(np), true); }
    } else if (a === 'delete') {
      var c = countIn(p);
      if (!c) { deleteFolder(p, false); toast('Folder deleted'); go(parentOf(p) ? '#/f/' + encodeURIComponent(parentOf(p)) : '#/', true); return; }
      var m = await sheet({ title: 'Delete \u201c' + folderName(p) + '\u201d?', message: 'It holds ' + c + ' note' + (c === 1 ? '' : 's') + '.', actions: [{ label: 'Delete folder, notes to Trash', value: 'all', danger: true }, { label: 'Delete folder, keep notes', value: 'keep' }] });
      if (!m) return;
      deleteFolder(p, m === 'keep');
      toast(m === 'keep' ? 'Folder deleted · notes moved up' : 'Folder deleted · ' + c + ' note' + (c === 1 ? '' : 's') + ' moved to Trash');
      go(parentOf(p) ? '#/f/' + encodeURIComponent(parentOf(p)) : '#/', true);
    }
  }

  /* ---------- templates ---------- */
  var TEMPLATES = 'Templates';
  var BUILTIN = [
    { name: 'Study notes', group: 'School', body: '---\ntags: [study]\ndate: {{date}}\n---\n## Key ideas\n- \n\n## Details\n\n\n## Cards\n> [!tip] Type / then Flashcard or Cloze card. Each one becomes a Recall card.\n\n## Questions I still have\n- [ ] \n' },
    { name: 'Class notes', group: 'School', body: '---\ntags: [class]\nclass: \ndate: {{date}}\n---\n**Class:**   **Teacher:**   **Topic:** {{title}}\n\n## Today we covered\n- \n\n## Notes\n\n\n## Vocabulary\nterm :: meaning\n\n## Homework\n- [ ] \n\n> [!question] Ask next time\n> \n' },
    { name: 'Cornell notes', group: 'School', body: '---\ntags: [cornell]\ndate: {{date}}\n---\n> [!info] Cornell method\n> Cues on the left, notes on the right, summary at the end. Write the cues after class.\n\n| Cues / questions | Notes |\n|---|---|\n|  |  |\n|  |  |\n|  |  |\n\n## Summary\nIn two or three sentences, what was this about?\n\n' },
    { name: 'Lecture study guide', group: 'School', body: '---\ntags: [study, guide]\nexam: \n---\n## Big picture\nWhy does this topic matter?\n\n## Must-know terms\nterm :: definition\nterm :: definition\n\n## Key concepts\n### 1. \n\n### 2. \n\n## Worked example\n\n\n## Likely test questions\n- [ ] \n- [ ] \n\n## Still fuzzy\n- \n' },
    { name: 'Flashcard deck', group: 'School', body: '---\ntags: [cards]\n---\n> [!tip] One card per line: question :: answer. Or a cloze: The {{c::mitochondria}} makes ATP. Review them in Recall.\n\nquestion :: answer\nquestion :: answer\nquestion :: answer\n\nThe {{c::answer}} hides in the sentence.\n' },
    { name: 'Essay outline', group: 'School', body: '---\ntags: [essay]\ndue: \n---\n## Prompt\n> \n\n## Thesis\n\n\n## Body 1\n- Claim: \n- Evidence: \n- Why it matters: \n\n## Body 2\n- Claim: \n- Evidence: \n- Why it matters: \n\n## Body 3\n- Claim: \n- Evidence: \n- Why it matters: \n\n## Conclusion\n\n\n## Sources\n1. \n' },
    { name: 'Lab report', group: 'School', body: '---\ntags: [lab]\ndate: {{date}}\n---\n## Question\n\n\n## Hypothesis\nIf \u2026 then \u2026 because \u2026\n\n## Materials\n- \n\n## Procedure\n1. \n\n## Data\n| Trial | Measurement | Notes |\n|---|---|---|\n| 1 |  |  |\n| 2 |  |  |\n\n## Results\n\n\n## Conclusion\nWas the hypothesis supported? Sources of error?\n' },
    { name: 'Exam prep plan', group: 'School', body: '---\ntags: [exam]\nexam date: \n---\n> [!warning] Exam\n> Date:   Format:   Topics: \n\n## Topics, hardest first\n- [ ] \n- [ ] \n- [ ] \n\n## Plan\n| Day | Topic | Done |\n|---|---|---|\n|  |  |  |\n|  |  |  |\n\n## Cards to review\n[[ ]]\n' },
    { name: 'Language vocab', group: 'School', body: '---\ntags: [language]\nlanguage: \n---\n## New words\nword :: meaning\nword :: meaning\nword :: meaning\n\n## Grammar point\n\n\n## Sentences\n- \n\n> [!tip] Each word :: meaning line becomes a Recall card.\n' },
    { name: 'Daily journal', group: 'Life', body: '## Top 3 today\n- [ ] \n- [ ] \n- [ ] \n\n## Notes\n\n\n## Grateful for\n- \n\n> [!toggle]- Tomorrow\n> \n' },
    { name: 'Weekly review', group: 'Life', body: '---\ntags: [review]\nweek of: {{date}}\n---\n## Wins\n- \n\n## What got in the way\n- \n\n## Lessons\n- \n\n## Next week\n- [ ] \n- [ ] \n- [ ] \n\n## Rating\nEnergy ==/10== \u00b7 Focus ==/10== \u00b7 Mood ==/10==\n' },
    { name: 'To-do list', group: 'Life', body: '---\ntags: [todo]\n---\n## Today\n- [ ] \n- [ ] \n\n## This week\n- [ ] \n\n## Someday\n- [ ] \n' },
    { name: 'Goal tracker', group: 'Life', body: '---\ntags: [goal]\nstarted: {{date}}\n---\n> [!tip] Goal\n> {{title}}\n\n**Why:** \n**By when:** \n\n## Milestones\n- [ ] \n- [ ] \n- [ ] \n\n## Weekly check-in\n| Week | Progress | Blocker |\n|---|---|---|\n| 1 |  |  |\n\n## Done looks like\n\n' },
    { name: 'Pros & cons', group: 'Life', body: '## Decision\n> {{title}}\n\n| Pros | Cons |\n|---|---|\n|  |  |\n|  |  |\n|  |  |\n\n## Gut feeling\n\n\n## Decision & why\n\n' },
    { name: 'Idea dump', group: 'Life', body: '---\ntags: [ideas]\ndate: {{date}}\n---\n> [!tip] No order, no judging. Link ideas with [[ ]] later.\n\n- \n- \n- \n\n## Worth keeping\n- [ ] \n' },
    { name: 'Recipe', group: 'Life', body: '---\ntags: [recipe]\nserves: \ntime: \n---\n## Ingredients\n- [ ] \n- [ ] \n\n## Steps\n1. \n2. \n\n> [!tip] Notes\n> What to change next time.\n' },
    { name: 'Book notes', group: 'Life', body: '---\ntags: [book]\nauthor: \nstatus: reading\n---\n## In one sentence\n\n\n## Key ideas\n- \n\n## Quotes\n> \n\n## Chapter notes\n### Ch. 1\n\n\n## My take\n\n' },
    { name: 'Band practice log', group: 'Life', body: '---\ntags: [band]\ndate: {{date}}\n---\n**Piece:**   **Tempo:**   **Minutes:** \n\n## Worked on\n- \n\n## Trouble spots (measures)\n- [ ] \n\n## Next session\n- \n\n> [!tip] Slow it down, loop the bar, speed up 4 bpm at a time.\n' },
    { name: 'Meeting', group: 'Work', body: '---\ndate: {{date}}\n---\n**When:** {{date}} {{time}}\n**Who:** \n\n## Agenda\n1. \n\n## Notes\n\n\n## Action items\n- [ ] \n' },
    { name: 'Project plan', group: 'Work', body: '---\ntags: [project]\nstatus: planning\nstarted: {{date}}\n---\n> [!info] Goal\n> What does done look like?\n\n## Milestones\n| Milestone | Target | Status |\n|---|---|---|\n|  |  | planning |\n\n## Tasks\n- [ ] \n\n## Risks\n- \n\n## Links\n- \n' },
    { name: 'Medical case', group: 'Medicine', body: '---\ntags: [case]\ndate: {{date}}\n---\n> [!info] Chief complaint\n> \n\n## History\n**HPI:** \n**PMH:**   **Meds:**   **Allergies:** \n**Family / social:** \n\n## Exam\n**Vitals:** \n\n\n## Labs & imaging\n| Test | Result | Normal |\n|---|---|---|\n|  |  |  |\n\n## Assessment\n**Differential:**\n1. \n2. \n3. \n\n## Plan\n- [ ] \n\n## Teaching point\nwhat was the key finding :: \n' },
    { name: 'Drug card', group: 'Medicine', body: '---\ntags: [pharm, drug]\n---\n## {{title}}\n**Class:** \n**Mechanism:** \n\n## Uses\n- \n\n## Side effects\n- \n\n## Contraindications & interactions\n- \n\n## Pearls\n> [!tip] \n> \n\n## Cards\n{{title}} mechanism :: \n{{title}} class :: \n' },
    { name: 'Anatomy region', group: 'Medicine', body: '---\ntags: [anatomy]\n---\n## {{title}}\n**Location:** \n**Function:** \n\n## Structures\n- \n\n## Blood supply & nerves\n- \n\n## Clinical\n> [!warning] What goes wrong here\n> \n\n## Cards\n{{title}} is supplied by :: \n' }
  ];
  var TGROUPS = ['School', 'Medicine', 'Life', 'Work'];
  function allTemplates() {
    var mine = Array.from(notes.values()).filter(function (n) { return n.folder === TEMPLATES || n.folder.indexOf(TEMPLATES + '/') === 0; })
      .sort(function (a, b) { return a.title.localeCompare(b.title); }).map(function (n) { return { name: n.title, body: n.body, mine: true }; });
    return mine.concat(BUILTIN);
  }
  function fillTmpl(body, title) {
    var d = new Date();
    return String(body).replace(/\{\{date\}\}/g, ymd(d)).replace(/\{\{time\}\}/g, String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')).replace(/\{\{title\}\}/g, title || '');
  }
  function chooseTemplate() {
    var list = allTemplates();
    return overlay(function (done) {
      var box = document.createElement('div'); box.className = 'qs tpick'; box.setAttribute('role', 'dialog');
      box.innerHTML = '<label class="qsin">' + I.tmpl + '<input id="tq" type="text" placeholder="Find a template" autocomplete="off" autocapitalize="none" spellcheck="false"><button class="qsx" aria-label="Close">Cancel</button></label><div class="qsl" id="tl"></div>';
      var inp = $('#tq', box), ul = $('#tl', box);
      function draw() {
        var q = norm(inp.value), h = '', groups = [['Mine', list.filter(function (t) { return t.mine; })]].concat(TGROUPS.map(function (g) { return [g, list.filter(function (t) { return !t.mine && t.group === g; })]; }));
        groups.forEach(function (g) {
          var items = g[1].filter(function (t) { return !q || norm(t.name).indexOf(q) >= 0 || norm(t.body).indexOf(q) >= 0; });
          if (!items.length) return;
          h += '<div class="qsh">' + g[0] + '</div>' + items.map(function (t) { return '<button data-i="' + list.indexOf(t) + '">' + I.tmpl + '<span class="qt">' + esc(t.name) + '</span><small>' + esc(tmplHint(t.body)) + '</small></button>'; }).join('');
        });
        ul.innerHTML = h || '<div class="qsh">Nothing matches</div>' + (list.some(function (t) { return t.mine; }) ? '' : '<div class="qsh" style="text-transform:none;letter-spacing:0">Tip: notes in a \u201cTemplates\u201d folder show up here too.</div>');
      }
      inp.addEventListener('input', draw);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Escape') done(null); if (e.key === 'Enter') { var b = ul.querySelector('button[data-i]'); if (b) done(+b.dataset.i); } });
      ul.addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (b) done(+b.dataset.i); });
      $('.qsx', box).addEventListener('click', function () { done(null); });
      draw();
      setTimeout(function () { if (!/iP(hone|ad|od)/.test(navigator.userAgent)) inp.focus(); }, 80);
      return box;
    }).then(function (i) { return i === null || i === undefined ? null : list[i]; });
  }
  /* generic note picker with search; resolves to a note id or null */
  function pickNote(title) {
    return overlay(function (done) {
      var box = document.createElement('div'); box.className = 'qs tpick'; box.setAttribute('role', 'dialog');
      box.innerHTML = '<label class="qsin">' + I.search + '<input id="pq" type="text" placeholder="' + esc(title || 'Find a note') + '" autocomplete="off" autocapitalize="none" spellcheck="false"><button class="qsx" aria-label="Close">Cancel</button></label><div class="qsl" id="pl"></div>';
      var inp = $('#pq', box), ul = $('#pl', box);
      function draw() {
        var q = norm(inp.value), list = Array.from(notes.values()).map(function (n) { var t = norm(n.title), sc = !q ? 1 : t === q ? 100 : t.indexOf(q) === 0 ? 60 : t.indexOf(q) >= 0 ? 30 : fuzzy(q, t) ? 5 : 0; return { n: n, sc: sc }; })
          .filter(function (x) { return x.sc > 0; }).sort(function (a, b) { return b.sc - a.sc || b.n.updated - a.n.updated; }).slice(0, 12);
        ul.innerHTML = (list.length ? '<div class="qsh">' + (q ? 'Notes' : 'Recent') + '</div>' + list.map(function (x) { return '<button data-id="' + x.n.id + '">' + I.note + '<span class="qt">' + esc(x.n.title) + '</span>' + (x.n.folder ? '<small>' + esc(x.n.folder.toLowerCase()) + '</small>' : '') + '</button>'; }).join('') : '<div class="qsh">Nothing matches</div>');
      }
      inp.addEventListener('input', draw);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Escape') done(null); if (e.key === 'Enter') { var b = ul.querySelector('button[data-id]'); if (b) done(b.dataset.id); } });
      ul.addEventListener('click', function (e) { var b = e.target.closest('button[data-id]'); if (b) done(b.dataset.id); });
      $('.qsx', box).addEventListener('click', function () { done(null); });
      draw();
      setTimeout(function () { inp.focus(); }, 80);
      return box;
    });
  }
  function tmplHint(body) {
    var heads = []; String(body).replace(/^#{1,3}\s+(.+)$/gm, function (m, t) { if (heads.length < 4 && !/\{\{/.test(t)) heads.push(t.trim()); return m; });
    return heads.join(' \u00b7 ');
  }
  async function newFromTemplate(folder) { if (!proOk('Templates')) return;
    var t = await chooseTemplate(); if (!t) return;
    createFromTemplate(t, folder);
  }
  async function createFromTemplate(t, folder) { if (!proOk('Templates')) return;
    if (folder === undefined) { var r = route(); folder = r.v === 'folder' && r.path !== '*' && r.path !== TEMPLATES ? r.path : ''; }
    var title = null, asks = /\{\{title\}\}/.test(t.body);
    if (asks) {
      title = await dialog({ title: 'Name this note', message: 'The \u201c' + t.name + '\u201d template uses the name inside the note.', input: true, placeholder: t.name === 'Drug card' ? 'e.g. Propranolol' : 'Title', ok: 'Create', validate: function (v) { return checkTitle(v); } });
      if (!title) return;
    }
    title = title || uniqueTitle(t.mine ? t.name : 'Untitled');
    var n = createNote({ title: title, folder: folder, body: fillTmpl(t.body, title) });
    go('#/n/' + n.id); startEditing(n, !asks);
  }

  /* ---------- Recall: spaced repetition built from your notes ---------- */
  var rc = new Map(), rcMeta = { day: '', newToday: 0, log: {} }, recallT = null;
  function recallSoon() { clearTimeout(recallT); recallT = setTimeout(updateBadge, 600); }
  function dayStart(d) { var x = new Date(d || Date.now()); x.setHours(0, 0, 0, 0); return x.getTime(); }
  function addDays(t, k) { var x = new Date(t); x.setDate(x.getDate() + k); return x.getTime(); }
  function inTemplates(n) { return n.folder === TEMPLATES || n.folder.indexOf(TEMPLATES + '/') === 0; }
  function liveCards(onlyNote) {
    var out = [];
    notes.forEach(function (n) {
      /* a restored or conflict copy would repeat its cards as new ones; they come back if it's renamed or the original goes */
      if (inTemplates(n) || (onlyNote && n.id !== onlyNote) || (!onlyNote && / \((?:conflict|restored [A-Z][a-z]{2} \d{1,2})\)(?: \d+)?$/.test(n.title) && copyOrigin(n))) return;
      MD.recall(n.body).forEach(function (c) { c.id = n.id + '|' + c.key; c.note = n; c.s = rc.get(c.id) || null; out.push(c); });
    });
    return out;
  }
  function rollDay() { var t = ymd(new Date()); if (rcMeta.day !== t) { rcMeta.day = t; rcMeta.newToday = 0; } }
  function isDue(c, now) { return c.s && c.s.due <= now; }
  function recallStats(onlyNote) {
    rollDay();
    var now = Date.now(), cards = liveCards(onlyNote), due = 0, fresh = 0, tomorrow = 0, mature = 0, eod = addDays(dayStart(), 1), eot = addDays(dayStart(), 2);
    cards.forEach(function (c) {
      if (!c.s) fresh++;
      else if (c.s.due <= now) due++;
      else if (c.s.due < eot) tomorrow++;
      if (c.s && c.s.ivl >= 21) mature++;
    });
    var newLeft = Math.max(0, (settings.newPerDay || 20) - rcMeta.newToday);
    return { total: cards.length, reviews: due, fresh: fresh, newNow: Math.min(fresh, onlyNote ? fresh : newLeft), due: due + Math.min(fresh, onlyNote ? fresh : newLeft), tomorrow: tomorrow, mature: mature, cards: cards };
  }
  function streak() {
    var d = new Date(), k = 0;
    if (!rcMeta.log[ymd(d)]) d.setDate(d.getDate() - 1);
    while (rcMeta.log[ymd(d)]) { k++; d.setDate(d.getDate() - 1); }
    return k;
  }
  function updateBadge() {
    var b = $('#rbadge'); if (!b) return;
    var s = recallStats();
    b.textContent = s.due > 99 ? '99+' : s.due; b.hidden = !s.due;
  }
  /* SM-2 style scheduling: Again / Good / Easy */
  function schedule(c, g, dry) {
    var s = c.s ? Object.assign({}, c.s) : { id: c.id, noteId: c.note.id, ivl: 0, ease: 2.5, reps: 0, lapses: 0, state: 'new', created: Date.now() };
    var now = Date.now(), today = dayStart();
    if (g === 'again') {
      var wasRev = s.state === 'review';
      if (wasRev) { s.lapses++; s.ease = Math.max(1.3, s.ease - 0.2); s.ivl = Math.max(1, Math.round(s.ivl * 0.4)); }
      s.state = 'learn'; s.due = now + (wasRev ? 600e3 : 60e3);
    } else {
      if (s.state === 'review') {
        s.ivl = g === 'easy' ? Math.max(s.ivl + 2, Math.round(s.ivl * s.ease * 1.3)) : Math.max(s.ivl + 1, Math.round(s.ivl * s.ease));
      } else {
        s.ivl = g === 'easy' ? Math.max(4, s.ivl) : Math.max(1, s.ivl);
      }
      if (g === 'easy') s.ease = Math.min(3.2, s.ease + 0.15);
      s.ivl = Math.min(s.ivl, 3650);
      s.state = 'review'; s.due = addDays(today, s.ivl);
    }
    s.reps++; s.last = now;
    if (!dry) { rc.set(s.id, s); RC.put('cards', s).catch(function () {}); }
    return s;
  }
  function ivlLabel(c, g) {
    var s = schedule(c, g, true), ms = s.due - Date.now();
    if (g === 'again') return ms < 120e3 ? '1 min' : '10 min';
    var d = s.ivl;
    return d < 30 ? d + 'd' : d < 365 ? Math.round(d / 30) + 'mo' : (Math.round(d / 36.5) / 10) + 'y';
  }
  function saveRcMeta() { RC.put('meta', { k: 'stats', v: rcMeta }).catch(function () {}); }
  async function cleanRecall() {
    /* drop schedules whose card is gone from its note (kept while the note sits in Trash) */
    var live = {}; liveCards().forEach(function (c) { live[c.id] = 1; });
    var gone = []; rc.forEach(function (s, id) { if (!live[id] && !trash.has(s.noteId)) gone.push(id); });
    if (gone.length) { gone.forEach(function (id) { rc.delete(id); }); try { await RC.del('cards', gone); } catch (e) {} }
  }

  function renderRecall() {
    var s = recallStats(), st = streak();
    var h = '<div class="page"><div class="nav"><button class="back" data-act="back" data-to="#/">' + I.back + '<span>Notes</span></button><div class="acts"></div></div><div class="eyebrow">Spaced repetition</div><h1 class="h1">Recall</h1>';
    if (!s.total) {
      h += '<div class="rhero empty1"><div class="rart">' + I.recall + '</div><b>Your notes can quiz you</b><p>Write a line like <span class="kbd">question :: answer</span> or hide words with <span class="kbd">{{c::cloze}}</span> in any note. It shows up here as a card, and Axon brings it back right before you\u2019d forget it.</p>' +
        '<button class="bignew" data-act="recalldemo">' + I.plus + '<span>Write my first card</span></button></div>';
      viewEl.innerHTML = h + '</div>'; return;
    }
    h += '<div class="rhero"><div class="rnum">' + s.due + '</div><div class="rlab">' + (s.due ? 'card' + (s.due === 1 ? '' : 's') + ' to review today' : 'All caught up for today') + '</div>' +
      '<div class="rsub">' + (s.reviews ? s.reviews + ' review' + (s.reviews === 1 ? '' : 's') : '') + (s.reviews && s.newNow ? ' \u00b7 ' : '') + (s.newNow ? s.newNow + ' new' : '') + (!s.due ? (s.tomorrow ? s.tomorrow + ' due tomorrow' : 'Nothing due tomorrow either') : '') + '</div>' +
      (s.due ? '<button class="bignew" data-act="review" data-deck="all">' + I.recall + '<span>Start review</span></button>' : '<button class="bignew ghost" data-act="practice" data-deck="all">Practice anyway</button>') + '</div>' +
      '<div class="rstats"><div><b>' + st + '</b><span>day streak</span></div><div><b>' + s.total + '</b><span>cards</span></div><div><b>' + s.mature + '</b><span>mastered</span></div></div>' + forecast(s.cards);
    var byNote = {};
    s.cards.forEach(function (c) { var k = c.note.id; (byNote[k] = byNote[k] || { n: c.note, total: 0, due: 0, fresh: 0 }).total++; if (!c.s) byNote[k].fresh++; else if (isDue(c, Date.now())) byNote[k].due++; });
    var decks = Object.keys(byNote).map(function (k) { return byNote[k]; }).sort(function (a, b) { return (b.due + b.fresh) - (a.due + a.fresh) || a.n.title.localeCompare(b.n.title); });
    h += '<div class="sec"><span>Decks \u00b7 one per note</span></div><div class="rows">' + decks.map(function (d) {
      var dd = d.due + d.fresh;
      return '<button class="row deck" data-act="deck" data-id="' + d.n.id + '">' + I.doc + '<span class="nm">' + esc(d.n.title) + '</span><span class="ct">' + (dd ? '<i class="duen">' + dd + '</i> / ' : '') + d.total + '</span><span class="chev">' + I.chev + '</span></button>';
    }).join('') + '</div>' +
      '<div class="hint1">New cards per day: ' + (settings.newPerDay >= 9999 ? 'no limit' : settings.newPerDay) + ' \u00b7 change it in Settings. Edit a card\u2019s answer anytime \u2014 it keeps its progress.</div></div>';
    viewEl.innerHTML = h;
  }
  function forecast(cards) {
    var t0 = dayStart(), days = [0, 0, 0, 0, 0, 0, 0], now = Date.now();
    cards.forEach(function (c) { if (!c.s) return; var k = c.s.due <= now ? 0 : Math.floor((dayStart(c.s.due) - t0) / 864e5); if (k >= 0 && k < 7) days[k]++; });
    var mx = Math.max.apply(null, days), d = new Date();
    if (!mx) return '';
    return '<div class="fc"><div class="fct">Next 7 days</div><div class="fcb">' + days.map(function (v, i) {
      var x = new Date(d); x.setDate(d.getDate() + i);
      return '<div><i style="height:' + Math.max(3, Math.round(v / mx * 44)) + 'px"' + (v ? '' : ' class="z"') + '></i><span>' + (i === 0 ? 'Today' : x.toLocaleDateString(undefined, { weekday: 'narrow' })) + '</span><em>' + (v || '') + '</em></div>';
    }).join('') + '</div></div>';
  }
  var rv = null;
  function renderReview(deck, mode) {
    document.body.classList.add('reviewing');
    var only = deck && deck !== 'all' ? deck : null, now = Date.now();
    if (!rv || rv.deck !== deck || rv.mode !== mode || rv.done) {
      rollDay();
      var cards = liveCards(only), q;
      if (mode === 'practice') q = cards.slice().sort(function () { return Math.random() - 0.5; });
      else {
        var newLeft = only ? 1e9 : Math.max(0, (settings.newPerDay || 20) - rcMeta.newToday);
        var learn = cards.filter(function (c) { return c.s && c.s.state === 'learn' && c.s.due <= now; });
        var rev = cards.filter(function (c) { return c.s && c.s.state !== 'learn' && c.s.due <= now; }).sort(function (a, b) { return a.s.due - b.s.due; });
        var fresh = cards.filter(function (c) { return !c.s; }).slice(0, newLeft);
        q = learn.concat(rev, fresh);
      }
      rv = { deck: deck, mode: mode, q: q, total: q.length, n: 0, shown: false, stats: { again: 0, good: 0, easy: 0 }, done: false };
    }
    drawReview();
  }
  function cardFace(c, back) {
    var o = mdOpt();
    if (c.type === 'qa') return { q: MD.inline(c.q, o), a: MD.inline(c.a, o) };
    return { q: MD.inline(MD.clozeSide(c.text, c.group, false), o), a: MD.inline(MD.clozeSide(c.text, c.group, true), o) };
  }
  function drawReview() {
    var st = rv;
    if (!st.q.length) {
      var s = recallStats(), seen = st.stats.again + st.stats.good + st.stats.easy;
      viewEl.innerHTML = '<div class="rv"><div class="rvtop"><button class="ib" data-act="rvclose" aria-label="Close">' + I.x + '</button><span></span><span></span></div>' +
        '<div class="rvdone"><div class="rart ok">' + I.check + '</div><b>' + (seen ? 'Session done' : 'Nothing due right now') + '</b><p>' +
        (seen ? seen + ' card' + (seen === 1 ? '' : 's') + ' reviewed \u00b7 ' + Math.round((st.stats.good + st.stats.easy) / seen * 100) + '% remembered' + (streak() ? ' \u00b7 ' + streak() + '\u2011day streak' : '') : 'You\u2019re all caught up.') +
        '</p><p class="dim">' + (s.tomorrow ? s.tomorrow + ' card' + (s.tomorrow === 1 ? '' : 's') + ' coming back tomorrow.' : 'Add more cards to your notes anytime.') + '</p>' +
        '<button class="bignew" data-act="rvclose">Back to Recall</button>' + (st.mode !== 'practice' && st.deck && st.deck !== 'all' ? '<button class="pill" style="margin-top:14px" data-act="practice" data-deck="' + esc(st.deck) + '">Practice all cards in this note</button>' : '') + '</div></div>';
      st.done = true;
      return;
    }
    var c = st.q[0], f = cardFace(c), pct = st.total ? Math.round(st.n / (st.n + st.q.length) * 100) : 0;
    var h = '<div class="rv"><div class="rvtop"><button class="ib" data-act="rvclose" aria-label="Close">' + I.x + '</button><div class="rvbar"><i style="width:' + pct + '%"></i></div><span class="rvct">' + st.q.length + ' left</span></div>' +
      '<button class="rvcard' + (st.shown ? ' shown' : '') + '" data-act="reveal">' +
      '<span class="rvsrc">' + (st.mode === 'practice' ? 'Practice \u00b7 ' : (!c.s ? '<em>New</em> \u00b7 ' : '')) + esc(c.note.title) + '</span>' +
      '<span class="rvq prose">' + f.q + '</span>' +
      (st.shown ? (c.type === 'qa' ? '<span class="rvsep"></span><span class="rva prose">' + f.a + '</span>' : '<span class="rvsep"></span><span class="rva prose">' + f.a + '</span>') : '<span class="rvtap">Tap to reveal</span>') +
      '</button>' +
      (st.shown ? '<div class="rvbtns">' + (st.mode === 'practice' ? '<button class="g-again" data-act="rate" data-g="again">Again<small>see it again</small></button><button class="g-good" data-act="rate" data-g="good">Got it<small>next</small></button>' :
        '<button class="g-again" data-act="rate" data-g="again">Again<small>' + ivlLabel(c, 'again') + '</small></button><button class="g-good" data-act="rate" data-g="good">Good<small>' + ivlLabel(c, 'good') + '</small></button><button class="g-easy" data-act="rate" data-g="easy">Easy<small>' + ivlLabel(c, 'easy') + '</small></button>') + '</div>'
        : '<div class="rvbtns one"><button class="g-show" data-act="reveal">Show answer</button></div>') +
      '<button class="rvopen" data-act="open" data-id="' + c.note.id + '">Open \u201c' + esc(c.note.title) + '\u201d</button></div>';
    viewEl.innerHTML = h;
    hydrateImgs();
  }
  function rate(g) {
    var st = rv; if (!st || !st.q.length) return;
    var c = st.q.shift();
    st.stats[g === 'easy' ? 'easy' : g === 'good' ? 'good' : 'again']++;
    if (st.mode !== 'practice') {
      rollDay();
      if (!c.s) { rcMeta.newToday++; }
      c.s = schedule(c, g);
      var td = ymd(new Date()); rcMeta.log[td] = (rcMeta.log[td] || 0) + 1;
      var keys = Object.keys(rcMeta.log).sort(); if (keys.length > 400) delete rcMeta.log[keys[0]];
      saveRcMeta();
    }
    if (g === 'again') st.q.splice(Math.min(3, st.q.length), 0, c); else st.n++;
    st.shown = false;
    drawReview(); updateBadge();
  }

  /* ---------- Discover: a feed of things related to what you write ---------- */
  var DSTOP = {};
  ('a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its itself just like me more most my no nor not now of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yes ok okay one two three four five first second next last new note notes untitled today tomorrow yesterday thing things stuff really very much many make made get got go going went see seen use used using need needs want wants know think way ways lot lots good great bad better best also maybe still well even every something anything nothing everything someone people person time times day days week weeks year years part parts kind type types example examples etc ' +
    'key ideas details cards questions question answer answers agenda tasks task ideas idea links link todo to-do summary info tip warning danger toggle discovered action items action grateful top today journal meeting project goal status planning study notes main overview intro introduction conclusion review homework class chapter page pages section misc random draft quote').split(' ').forEach(function (w) { if (w) DSTOP[w] = 1; });
  ['key ideas', 'top 3 today', 'grateful for', 'action items', 'questions i still have', 'to do', 'my notes', 'big heading'].forEach(function (w) { DSTOP[w] = 1; });
  var BLOCK_Q = /\b(sex|sexy|sexual\w*|porn\w*|nude\w*|nudity|naked|erotic\w*|fetish\w*|hentai|xxx|orgasm\w*|masturbat\w*|prostitut\w*|escort\w*|onlyfans|stripper\w*|strip club|genital\w*|penis|vagina\w*|incest|rape\w*|bdsm|playboy|brothel\w*|nsfw|lingerie|camgirl\w*)\b/i;
  var BLOCK_X = /\b(porn\w*|pornograph\w*|nude\w*|erotic\w*|hentai|xxx|fetish\w*|orgasm\w*|masturbat\w*|prostitut\w*|onlyfans|incest|bdsm|nsfw|stripper\w*|sex work\w*|sex act\w*|sexual intercourse)\b/i;
  var dHidden = {}, dSaved = {}, dLoaded = false, ds = null, dShuffle = false;
  async function loadDMeta() {
    if (dLoaded) return; dLoaded = true;
    try { var m = await DC.all('meta'); m.forEach(function (x) { if (x.k === 'hidden') dHidden = x.v || {}; if (x.k === 'saved') dSaved = x.v || {}; }); } catch (e) {}
  }
  function stripDiscovered(body) { return String(body).replace(/^##\s+Discovered\s*$[\s\S]*?(?=^#{1,2}\s|(?![\s\S]))/m, ''); }
  function discoverTopics(onlyId) {
    var map = {}, now = Date.now();
    function add(term, w, n) {
      var t = String(term || '').replace(/[*_=`~\[\]#>|{}]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[^\w(]+|[^\w)]+$/g, '');
      if (t.length < 3 || t.length > 60 || /^\d/.test(t) || t.split(' ').length > 6) return;
      var k = t.toLowerCase();
      if (DSTOP[k] || BLOCK_Q.test(t) || /^(untitled|\d{4}-\d{2}-\d{2})/.test(k)) return;
      var e = map[k] || (map[k] = { k: k, label: t, score: 0, notes: {} });
      if (/[A-Z]/.test(t) && !/[A-Z]/.test(e.label)) e.label = t;
      e.score += w; e.notes[n.id] = (e.notes[n.id] || 0) + w;
    }
    var list = onlyId ? [notes.get(onlyId)].filter(Boolean) : Array.from(notes.values()).filter(function (n) { return !inTemplates(n); });
    list.forEach(function (n) {
      var nw = onlyId ? 1 : 1 + 2 * Math.exp(-(now - n.updated) / (10 * 864e5));
      var body = stripDiscovered(n.body);
      if (!isDaily(n)) add(n.title, 3 * nw, n);
      MD.headings(body).forEach(function (h) { add(h.text, 2.5 * nw, n); });
      MD.links(body).forEach(function (l) { if (!dayOf(l.target)) add(l.target, 2.5 * nw, n); });
      MD.tags(body).forEach(function (t) { if (t.length > 3) add(t.replace(/[-_\/]+/g, ' '), 1.4 * nw, n); });
      var m, re = /\*\*([^*\n]{3,60})\*\*|==([^=\n]{3,60})==/g;
      while ((m = re.exec(body))) add(m[1] || m[2], (m[1] ? 2 : 1.5) * nw, n);
      var plain = MD.plain(body.replace(/\{\{c\d*::([^}]*?)(?:::[^}]*)?\}\}/g, '$1').replace(/ :: /g, '. ')), freq = {};
      plain.split(/[.!?:;]\s+|\n+/).forEach(function (sent) {
        var ws = sent.split(/\s+/), run = [];
        function flushRun(i) { if (run.length && (run.length > 1 || run[0].i > 0 || /^[A-Z]{2,}/.test(run[0].w))) add(run.map(function (x) { return x.w; }).join(' '), (run.length > 1 ? 1.4 : 1) * nw, n); run = []; }
        ws.forEach(function (w, i) {
          var c = w.replace(/^[^\w]+|[^\w]+$/g, '');
          if (/^([A-Z][a-z][\w'-]*|[A-Z]{2,6}\d?)$/.test(c) && !DSTOP[c.toLowerCase()]) run.push({ w: c, i: i });
          else if (run.length && /^(of|the|de|and)$/.test(c) && ws[i + 1] && /^[A-Z]/.test(ws[i + 1])) run.push({ w: c, i: i });
          else flushRun(i);
          var lw = c.toLowerCase(); if (lw.length >= 6 && !DSTOP[lw] && /^[a-z]+$/.test(lw)) freq[lw] = (freq[lw] || 0) + 1;
        });
        flushRun(ws.length);
      });
      Object.keys(freq).forEach(function (w) { if (freq[w] >= 3) add(w, 0.35 * freq[w] * nw, n); });
    });
    return Object.keys(map).map(function (k) {
      var e = map[k], best = null, bw = -1;
      Object.keys(e.notes).forEach(function (id) { if (e.notes[id] > bw) { bw = e.notes[id]; best = id; } });
      e.src = best;
      var sn = notes.get(best);
      /* a lone word ("neuro", "Pathways") is vague on its own: search it next to its note's title */
      e.q = (e.label.indexOf(' ') < 0 && sn && !isDaily(sn) && norm(sn.title) !== e.k && norm(sn.title).indexOf(e.k) < 0 && e.k.indexOf(norm(sn.title)) < 0) ? e.label + ' ' + sn.title : e.label;
      return e;
    }).sort(function (a, b) { return b.score - a.score; }).filter(function (e, i, all) {
      /* "neuro" next to "Neurons" adds nothing but noise */
      if (e.k.indexOf(' ') >= 0) return true;
      for (var j = 0; j < all.length; j++) if (all[j].k !== e.k && all[j].k.indexOf(e.k) >= 0 && all[j].score >= e.score * 0.4) return false;
      return true;
    }).slice(0, 40);
  }
  var WIKI = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&prop=extracts|pageimages|pageprops|info&exintro=1&explaintext=1&exsentences=4&exlimit=4&piprop=thumbnail&pithumbsize=640&ppprop=disambiguation&inprop=url&generator=search&gsrlimit=4&gsrsearch=';
  async function wikiFetch(q) {
    var key = 'q:' + q.toLowerCase(), hit = null;
    try { hit = await DC.get('cache', key); } catch (e) {}
    if (hit && Date.now() - hit.t < 7 * 864e5) return hit.pages;
    if (settings.discoverNet === false || !navigator.onLine || ds.req >= ds.budget) { if (!navigator.onLine || settings.discoverNet === false) ds.offline = true; return hit ? hit.pages : null; }
    ds.req++;
    try {
      var r = await fetch(WIKI + encodeURIComponent(q), { signal: ds.ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var j = await r.json(), pages = ((j.query && j.query.pages) || []).sort(function (a, b) { return (a.index || 0) - (b.index || 0); }).map(function (p) {
        return { title: p.title, extract: p.extract || '', thumb: p.thumbnail ? p.thumbnail.source : '', url: p.fullurl || ('https://en.wikipedia.org/wiki/' + encodeURIComponent(p.title.replace(/ /g, '_'))), dis: !!(p.pageprops && 'disambiguation' in p.pageprops) };
      });
      DC.put('cache', { k: key, t: Date.now(), pages: pages }).catch(function () {});
      return pages;
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      ds.offline = true;
      return hit ? hit.pages : null;
    }
  }
  function cleanExtract(x) {
    var s = String(x || '').replace(/\s*\([^()]*\)/g, function (m) { return m.length > 70 ? '' : m; }).replace(/\s+/g, ' ').trim();
    if (s.length > 460) { var cut = s.slice(0, 460), i = cut.lastIndexOf('. '); s = (i > 160 ? cut.slice(0, i + 1) : cut + '\u2026'); }
    return s;
  }
  var POP = /\b(album|studio album|song|single by|band|rapper|singer|songwriter|film|movie|television series|tv series|sitcom|video game|novel by|mixtape|extended play|virtual youtuber|youtuber|vtuber|chatbot|streamer|influencer|soundtrack|episode|record label|music video|anime|manga|wrestler|footballer|politician|businessman|actor|actress|company|brand|fashion)\b/i;
  function cardOK(p, t) {
    if (!p || p.dis || dHidden[p.title] || ds.seen[p.title]) return false;
    if (t) {
      var first = (p.extract.match(/^[^.]*\./) || [p.extract.slice(0, 200)])[0];
      if (POP.test(first) && norm(p.title) !== t.k) return false;
      var words = (t.q || t.label).toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 4; }).map(function (w) { return w.slice(0, 5); });
      var hay = (p.title + ' ' + p.extract.slice(0, 400)).toLowerCase();
      if (words.length && !words.some(function (w) { return hay.indexOf(w) >= 0; })) return false;
    }
    if (!p.extract || p.extract.length < 80 || / may (also )?refer to:?$/.test(p.extract.trim()) || /may refer to/.test(p.extract.slice(0, 160))) return false;
    if (BLOCK_Q.test(p.title) || BLOCK_X.test(p.extract)) return false;
    return true;
  }
  async function renderDiscover(onlyId) {
    if (onlyId && !notes.get(onlyId)) { go('#/discover', true); return; }
    await loadDMeta();
    if (route().v !== 'discover') return;
    var only = onlyId ? notes.get(onlyId) : null, topics = discoverTopics(onlyId);
    if (!dShuffle && dRestore(onlyId)) return;
    dKeep = null;
    if (dShuffle) { dShuffle = false; var head = topics.slice(0, 24); for (var si = head.length - 1; si > 0; si--) { var sj = Math.floor(Math.random() * (si + 1)); var sx = head[si]; head[si] = head[sj]; head[sj] = sx; } topics = head.concat(topics.slice(24)); }
    if (ds && ds.ctrl) ds.ctrl.abort();
    ds = { only: onlyId || '', topics: topics, ti: 0, seen: {}, req: 0, budget: 10, batch: 0, offline: false, loading: false, ctrl: new AbortController(), count: 0, last: [] };
    viewEl.classList.add('dview'); dSizePage();
    var h = '<div class="dhead">' + (only ? '<button class="back" data-act="back" data-to="#/n/' + only.id + '">' + I.back + '</button>' : '') + '<div class="dht"><div class="eyebrow">' + (only ? 'For this note' : 'From your notes') + '</div><h1 class="h1">Discover</h1></div>' +
      (topics.length ? '<button class="ib" aria-label="Shuffle" data-act="dshuffle">' + I.restore + '</button>' : '') + '</div>';
    if (only) h += '<div class="dfor">' + I.doc + '<span>' + esc(only.title) + '</span><button data-act="dall">All notes</button></div>';
    if (!topics.length) {
      h += '<div class="ehero dempty"><div class="rart">' + I.compass + '</div><b>Nothing to discover yet</b><p>' + (only ? 'This note is a bit short. Add headings, [[links]], #tags or **bold** terms and Discover finds stuff about them.' : 'Write a few notes and Discover finds stuff about them.') + '</p>' +
        (only ? '<button class="bignew" data-act="dall">Discover from all notes</button>' : '<button class="bignew" data-act="newempty">' + I.plus + '<span>New note</span></button>') + '</div>';
      viewEl.innerHTML = h; return;
    }
    h += '<div class="dtopics">' + topics.slice(0, 8).map(function (t) { return '<span>' + esc(t.label) + '</span>'; }).join('') + '</div><div class="dfeed" id="dfeed"><div class="dcard dskel"><div class="dimg"></div><div class="dbody"><i></i><i></i><i></i></div></div></div><div id="dmore"></div>';
    viewEl.innerHTML = h;
    loadBatch();
  }
  async function loadBatch() {
    var st = ds; if (!st || st.loading) return;
    st.loading = true; st.req = 0;
    if (!navigator.onLine) st.offline = true;
    var feed = $('#dfeed'), more = $('#dmore');
    if (more) more.innerHTML = st.count ? '<div class="dload">Finding more\u2026</div>' : '';
    var picks = st.topics.slice(st.ti, st.ti + 6); st.ti += picks.length;
    var groups = [];
    try {
      var results = await Promise.all(picks.map(function (t, i) {
        return new Promise(function (r) { setTimeout(r, i * 120); }).then(function () { return wikiFetch(t.q || t.label); }).then(function (pages) { return { t: t, pages: pages || [] }; });
      }));
      results.forEach(function (res) {
        var g = [];
        res.pages.forEach(function (p) { if (g.length < 2 && cardOK(p, res.t)) { st.seen[p.title] = 1; g.push({ p: p, t: res.t, rel: '' }); } });
        if (g.length) groups.push(g);
      });
      /* one "more like this" hop from the strongest new article for variety */
      var seed = groups[0] && groups[0][0];
      if (seed && st.req < st.budget) {
        var ml = await wikiFetch('morelike:' + seed.p.title);
        var g2 = [];
        (ml || []).forEach(function (p) { var f = (p && p.extract.match(/^[^.]*\./) || [''])[0]; if (g2.length < 2 && cardOK(p) && !POP.test(f)) { st.seen[p.title] = 1; g2.push({ p: p, t: seed.t, rel: seed.p.title }); } });
        if (g2.length) groups.splice(1, 0, g2);
      }
    } catch (e) { if (e.name === 'AbortError') return; }
    if (st !== ds || route().v !== 'discover') return;
    var cards = [], k = 0;
    while (groups.some(function (g) { return g.length; })) { groups.forEach(function (g) { if (g.length) cards.push(g.shift()); }); if (++k > 20) break; }
    var sk = feed && feed.querySelector('.dskel'); if (sk) sk.remove();
    if (feed) {
      feed.insertAdjacentHTML('beforeend', cards.map(dcardHTML).join(''));
      feed.querySelectorAll('img[data-thumb]:not([data-bound])').forEach(function (im) {
        im.dataset.bound = 1;
        im.addEventListener('error', function () { var d = im.parentNode; d.classList.add('ph'); d.innerHTML = '<span>' + esc((d.dataset.l || '?').charAt(0)) + '</span>'; });
      });
      dClip();
    }
    st.count += cards.length; st.batch++; st.loading = false;
    if (!more) return;
    if (!st.count) {
      more.innerHTML = st.offline ? '<div class="ehero dempty"><div class="rart">' + I.compass + '</div><b>' + (settings.discoverNet === false ? 'Discover is offline' : 'You\u2019re offline') + '</b><p>' + (settings.discoverNet === false ? 'Turn on \u201cDiscover uses the internet\u201d in Settings to find new things. Cards you\u2019ve already loaded show up here.' : 'Nothing saved for these topics yet. Connect to the internet and Discover finds things about your notes.') + '</p><button class="pill" data-act="dretry">Try again</button></div>'
        : (st.ti < st.topics.length ? '' : '<div class="ehero dempty"><b>Nothing new right now</b><p>Write about something new, or tap shuffle.</p></div>');
      if (!st.offline && st.ti < st.topics.length) loadBatch();
      return;
    }
    more.innerHTML = st.ti < st.topics.length ? '<button class="pill dmorebtn" data-act="dmore">Show more</button>' : '<div class="dend">You\u2019ve reached the end \u00b7 write more and come back</div>';
    if (st.offline && st.count) more.insertAdjacentHTML('afterbegin', '<div class="doff">Offline \u00b7 showing saved cards</div>');
    watchMore();
  }
  var dObs = null;
  function watchMore() {
    if (dObs) dObs.disconnect();
    var b = $('.dmorebtn'); if (!b || !('IntersectionObserver' in window)) return;
    dObs = new IntersectionObserver(function (en) { if (en[0].isIntersecting && ds && ds.batch < 4 && !ds.loading) { dObs.disconnect(); loadBatch(); } }, { root: viewEl, rootMargin: '0px 0px ' + Math.max(600, Math.round(viewEl.clientHeight * 1.6)) + 'px 0px' });
    dObs.observe(b);
  }
  /* TikTok-style feed: one card per screen, snaps and locks on the next one; the feed is kept while you visit other tabs */
  var dKeep = null;
  function dSizePage() {
    var vr = viewEl.getBoundingClientRect(), tb = $('#tabbar'), bottom = vr.bottom;
    if (tb && getComputedStyle(tb).display !== 'none' && getComputedStyle(tb).visibility !== 'hidden') { var t = tb.getBoundingClientRect().top; if (t > vr.top + 200 && t < bottom) bottom = t; }
    var pg = Math.round(bottom - vr.top);
    if (pg > 200) viewEl.style.setProperty('--dpage', pg + 'px');
  }
  function dClip() {
    document.querySelectorAll('.dview .dx').forEach(function (x) { x.classList.toggle('clip', x.scrollHeight > x.clientHeight + 2); });
  }
  function dCurrent() {
    var cards = document.querySelectorAll('.dview .dcard:not(.gone)'), vt = viewEl.getBoundingClientRect().top, best = -1, bd = 1e9;
    for (var i = 0; i < cards.length; i++) { var d = Math.abs(cards[i].getBoundingClientRect().top - vt); if (d < bd) { bd = d; best = i; } }
    return { cards: cards, i: best, top: viewEl.scrollTop };
  }
  function dKeepFeed() {
    var st = ds;
    if (!st || !st.count || !$('#dfeed')) { dKeep = null; return; }
    var c = dCurrent(), title = c.i >= 0 ? c.cards[c.i].dataset.title : '';
    if (viewEl.scrollTop < 40) title = '';
    dKeep = { hash: currentHash, only: st.only, html: viewEl.innerHTML, st: st, title: title, at: Date.now() };
  }
  function dRestore(onlyId) {
    var k = dKeep;
    if (!k || k.hash !== location.hash || k.only !== (onlyId || '') || Date.now() - k.at > 30 * 60000) return false;
    var st = k.st; st.ctrl = new AbortController(); st.loading = false;
    ds = st; viewEl.classList.add('dview'); dSizePage();
    viewEl.innerHTML = k.html;
    var feed = $('#dfeed');
    if (feed) {
      feed.querySelectorAll('.dskel, .dcard.gone').forEach(function (n) { n.remove(); });
      feed.querySelectorAll('img[data-thumb]').forEach(function (im) {
        im.dataset.bound = 1;
        im.addEventListener('error', function () { var d = im.parentNode; d.classList.add('ph'); d.innerHTML = '<span>' + esc((d.dataset.l || '?').charAt(0)) + '</span>'; });
      });
      feed.querySelectorAll('.dcard').forEach(function (c) { var t = c.dataset.title; if (dHidden[t]) c.remove(); else { var b = c.querySelector('.dsave'); if (b) { var on = !!dSaved[t]; b.classList.toggle('on', on); var sp = b.querySelector('span'); if (sp) sp.textContent = on ? 'Saved' : 'Save'; } } });
    }
    var more = $('#dmore');
    if (more && more.querySelector('.dload')) more.innerHTML = st.ti < st.topics.length ? '<button class="pill dmorebtn" data-act="dmore">Show more</button>' : '<div class="dend">You\u2019ve reached the end \u00b7 write more and come back</div>';
    var target = k.title ? Array.prototype.find.call(document.querySelectorAll('.dview .dcard'), function (c) { return c.dataset.title === k.title; }) : null;
    var y = target ? target.offsetTop - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0) : 0;
    viewEl.scrollTop = y;
    requestAnimationFrame(function () { if (ds === st) { viewEl.scrollTop = y; dClip(); watchMore(); } });
    return true;
  }
  /* lock on exactly one card per gesture: a wheel/trackpad flick pages once, and a touch fling that lands more than one card away is pulled back to the next one */
  function dStops() {
    var out = [0], max = viewEl.scrollHeight - viewEl.clientHeight;
    document.querySelectorAll('.dview .dcard:not(.gone)').forEach(function (c) { out.push(Math.max(0, Math.min(max, c.offsetTop - 6))); });
    var last = out[out.length - 1]; if (max - last > 40) out.push(max);
    return out;
  }
  function dNear(stops, y) { var b = 0; for (var i = 1; i < stops.length; i++) if (Math.abs(stops[i] - y) < Math.abs(stops[b] - y)) b = i; return b; }
  var dWheel = { lock: 0, last: 0 }, dTouch = null, dSettle = 0;
  viewEl.addEventListener('wheel', function (e) {
    if (!viewEl.classList.contains('dview') || e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX) || !document.querySelector('.dview .dcard:not(.dskel)')) return;
    e.preventDefault();
    var now = Date.now(), quiet = now - dWheel.last > 220; dWheel.last = now;
    if (now < dWheel.lock && !quiet) return;
    if (Math.abs(e.deltaY) < 4) return;
    var stops = dStops(), i = dNear(stops, viewEl.scrollTop), j = Math.max(0, Math.min(stops.length - 1, i + (e.deltaY > 0 ? 1 : -1)));
    dWheel.lock = now + 550;
    if (j !== i) viewEl.scrollTo({ top: stops[j], behavior: 'smooth' });
  }, { passive: false });
  viewEl.addEventListener('touchstart', function (e) {
    if (!viewEl.classList.contains('dview')) return;
    var stops = dStops(); dTouch = { i: dNear(stops, viewEl.scrollTop), on: true };
  }, { passive: true });
  viewEl.addEventListener('touchend', function () { if (dTouch) dTouch.on = false; }, { passive: true });
  function dCheckLanding() {
    if (!dTouch || dTouch.on || !viewEl.classList.contains('dview')) return;
    var stops = dStops(), y = viewEl.scrollTop, i = dNear(stops, y), from = dTouch.i;
    if (Math.abs(i - from) > 1) { var j = from + (i > from ? 1 : -1); dTouch = null; viewEl.scrollTo({ top: stops[j], behavior: 'smooth' }); return; }
    if (Math.abs(stops[i] - y) < 3) dTouch = null;
  }
  viewEl.addEventListener('scroll', function () {
    if (!dTouch || !viewEl.classList.contains('dview')) return;
    clearTimeout(dSettle); dSettle = setTimeout(dCheckLanding, 160);
  }, { passive: true });
  if ('onscrollend' in window) viewEl.addEventListener('scrollend', function () { clearTimeout(dSettle); dCheckLanding(); });
  window.addEventListener('resize', function () {
    if (!viewEl.classList.contains('dview')) return;
    var c = dCurrent(), t = c.i >= 0 && viewEl.scrollTop > 40 ? c.cards[c.i] : null;
    dSizePage();
    requestAnimationFrame(function () { dClip(); if (t && t.isConnected) viewEl.scrollTop = t.offsetTop - (parseFloat(getComputedStyle(t).scrollMarginTop) || 0); });
  });
  function dcardHTML(c) {
    var p = c.p, src = notes.get(c.t.src), saved = dSaved[p.title];
    return '<article class="dcard" data-title="' + esc(p.title) + '" data-url="' + esc(p.url) + '" data-src="' + esc(c.t.src || '') + '">' +
      '<div class="dimg' + (p.thumb ? '' : ' ph') + '" data-l="' + esc(p.title) + '">' + (p.thumb ? '<img data-thumb="1" src="' + esc(p.thumb) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span>' + esc(p.title.charAt(0)) + '</span>') + '</div>' +
      '<div class="dbody"><button class="dwhy" data-act="dsrc" data-id="' + esc(c.t.src || '') + '">' + (c.rel ? 'More like <b>' + esc(c.rel) + '</b>' : 'Because you wrote about <b>' + esc(c.t.label) + '</b>') + (src && norm(src.title) !== norm(c.rel || c.t.label) ? '<span> \u00b7 ' + esc(src.title) + '</span>' : '') + '</button>' +
      '<h2 class="dt" data-act="dopen">' + esc(p.title) + '</h2><p class="dx" data-act="dopen">' + esc(cleanExtract(p.extract)) + '</p>' +
      '<div class="dacts"><button class="dsave' + (saved ? ' on' : '') + '" data-act="dsave">' + I.pin.replace('<svg', '<svg class="di"') + '<span>' + (saved ? 'Saved' : 'Save') + '</span></button>' +
      '<button data-act="dopen">' + I.ext + '<span>Open</span></button><button class="dno" data-act="dhide" aria-label="Not interested">' + I.x + '<span>Hide</span></button></div>' +
      '<div class="dsrc">Wikipedia</div></div></article>';
  }
  function insertDiscovered(body, line) {
    var lines = String(body).replace(/\s+$/, '').split('\n'), at = -1;
    for (var i = 0; i < lines.length; i++) if (/^##\s+Discovered\s*$/.test(lines[i])) { at = i; break; }
    if (at < 0) return lines.join('\n') + '\n\n## Discovered\n' + line + '\n';
    var end = lines.length;
    for (var j = at + 1; j < lines.length; j++) if (/^#{1,2}\s/.test(lines[j])) { end = j; break; }
    while (end > at + 1 && !lines[end - 1].trim()) end--;
    lines.splice(end, 0, line);
    return lines.join('\n') + '\n';
  }
  async function discoverSave(card) {
    var title = card.dataset.title, url = card.dataset.url, n = notes.get(ds && ds.only ? ds.only : card.dataset.src) || notes.get(card.dataset.src);
    if (!n) { toast('That note is gone'); return; }
    if (n.body.indexOf(url) >= 0) { toast('Already saved in \u201c' + n.title + '\u201d'); return; }
    var x = cleanExtract(card.querySelector('.dx').textContent), first = (x.match(/^.*?[.!?](\s|$)/) || [x])[0].trim();
    if (first.length > 220) first = first.slice(0, 217) + '\u2026';
    n.body = insertDiscovered(n.body, '- [' + title.replace(/[\[\]]/g, '') + '](' + url + ') \u2014 ' + first);
    touch(n);
    dSaved[title] = n.id; DC.put('meta', { k: 'saved', v: dSaved }).catch(function () {});
    var b = card.querySelector('.dsave'); if (b) { b.classList.add('on'); b.querySelector('span').textContent = 'Saved'; }
    toast('Saved to \u201c' + n.title + '\u201d');
  }
  function discoverHide(card) {
    dHidden[card.dataset.title] = Date.now(); DC.put('meta', { k: 'hidden', v: dHidden }).catch(function () {});
    card.style.height = card.offsetHeight + 'px';
    requestAnimationFrame(function () { card.classList.add('gone'); });
    setTimeout(function () { card.remove(); if (!document.querySelector('.dcard') && ds) loadBatch(); }, 260);
    toast('Got it \u2014 you won\u2019t see that one again');
  }

  /* ---------- quick switcher / command palette ---------- */
  var COMMANDS = [
    ['New note', 'create add write', function () { newNote(); }], ['New note from template', 'template starter', function () { newFromTemplate(); }],
    ['Today\u2019s note', 'daily journal date', function () { openDaily(); }], ['Calendar', 'daily notes month day journal', function () { openCalendar(ymd(new Date())); }], ['Jot to today\u2019s note', 'quick capture add line journal', function () { jot(); }], ['Start Recall review', 'quiz flashcards study cards', function () { go('#/review/all'); }],
    ['Open Recall', 'cards spaced repetition', function () { go('#/recall'); }], ['Discover', 'feed explore wikipedia learn', function () { go('#/discover'); }], ['Graph', 'map links', function () { go('#/graph'); }], ['Random note', 'surprise shuffle lucky', function () { randomNote(); }], ['Auto-link all mentions', 'autolink link everything graph connect', function () { autoLinkAll(); }],
    ['Search text', 'find full', function (q) { go('#/search/' + encodeURIComponent(q || '')); }], ['All notes', 'list every', function () { go('#/f/*'); }],
    ['New folder', 'directory', function () { newFolder(''); }], ['Trash', 'deleted restore bin', function () { go('#/trash'); }],
    ['Formatting guide', 'help markdown how syntax', function () { go('#/guide'); }], ['Settings', 'preferences accent text size', function () { go('#/settings'); }],
    ['Find in this note', 'search within replace', function () { var r = route(); if (r.v === 'note' && notes.get(r.id)) { if (editing) openFindReplace($('#ed')); else openFind(notes.get(r.id)); } else toast('Open a note first'); }],
    ['Note history', 'versions restore earlier backup', function () { var r = route(); if (r.v === 'note' && notes.get(r.id)) showHistory(notes.get(r.id)); else toast('Open a note first'); }],
    ['Share this note', 'send export text', function () { var r = route(); if (r.v === 'note' && notes.get(r.id)) shareNote(notes.get(r.id)); else toast('Open a note first'); }],
    ['Tasks', 'todo checklist open to do homework', function () { go('#/tasks'); }],
    ['Vault stats', 'count words statistics', function () { showStats(); }],
    ['Export vault (.zip)', 'backup download', function () { exportVault(); }], ['Export flashcards (CSV for Synapse)', 'synapse anki csv', function () { exportCards(null); }]
  ];
  var qsOpen = false;
  function openSwitcher() {
    if (qsOpen) return; qsOpen = true;
    var scrim = document.createElement('div'); scrim.className = 'scrim';
    var box = document.createElement('div'); box.className = 'qs'; box.setAttribute('role', 'dialog');
    box.innerHTML = '<label class="qsin">' + I.search + '<input id="qsq" type="text" placeholder="Jump to a note, or type a command" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="go"><button class="qsx" aria-label="Close">Cancel</button></label><div class="qsl" id="qsl"></div>';
    layer.appendChild(scrim); layer.appendChild(box);
    var inp = $('#qsq', box), list = $('#qsl', box), items = [], sel = 0;
    function close() { if (!qsOpen) return; qsOpen = false; inp.blur(); scrim.classList.remove('show'); box.classList.remove('show'); setTimeout(function () { scrim.remove(); box.remove(); }, 200); }
    function draw() {
      var q = inp.value.trim(), nq = norm(q.replace(/^>\s*/, '')), cmdOnly = /^>/.test(q);
      var ns = cmdOnly ? [] : Array.from(notes.values()).map(function (n) {
        var t = norm(n.title), sc = !nq ? 1 : t === nq ? 100 : t.indexOf(nq) === 0 ? 60 : t.indexOf(nq) >= 0 ? 30 : fuzzy(nq, t) ? 8 : 0;
        return { n: n, sc: sc ? sc + (n.pinned ? 3 : 0) + n.updated / 1e14 : 0 };
      }).filter(function (x) { return x.sc > 0; }).sort(function (a, b) { return b.sc - a.sc; }).slice(0, nq ? 8 : 6);
      var cs = COMMANDS.filter(function (c) { return !nq || norm(c[0]).indexOf(nq) >= 0 || c[1].indexOf(nq) >= 0 || fuzzy(nq, norm(c[0])); }).slice(0, nq ? 6 : 5);
      items = ns.map(function (x) { return { t: 'n', n: x.n }; });
      if (q && !cmdOnly && !byTitle(q) && !checkTitle(q)) items.push({ t: 'create', q: q });
      if (q && !cmdOnly) items.push({ t: 'search', q: q });
      items = items.concat(cs.map(function (c) { return { t: 'c', c: c }; }));
      if (nq) allTemplates().filter(function (t) { return norm(t.name).indexOf(nq) >= 0 || fuzzy(nq, norm(t.name)); }).slice(0, 4).forEach(function (t) { items.push({ t: 'tmpl', tp: t }); });
      sel = 0;
      var h = '', lastT = '';
      items.forEach(function (it, i) {
        var grp = it.t === 'n' ? (nq ? 'Notes' : 'Recent') : it.t === 'c' ? 'Commands' : it.t === 'tmpl' ? 'Templates' : 'Notes';
        if (grp !== lastT) { h += '<div class="qsh">' + grp + '</div>'; lastT = grp; }
        if (it.t === 'n') h += '<button data-i="' + i + '">' + (it.n.pinned ? I.pin : I.doc) + '<span class="qt">' + esc(it.n.title) + '</span><small>' + esc(it.n.folder ? it.n.folder.toLowerCase() : '') + '</small></button>';
        else if (it.t === 'create') h += '<button data-i="' + i + '">' + I.plus + '<span class="qt">New note \u201c' + esc(it.q) + '\u201d</span></button>';
        else if (it.t === 'search') h += '<button data-i="' + i + '">' + I.search + '<span class="qt">Search text for \u201c' + esc(it.q) + '\u201d</span></button>';
        else if (it.t === 'tmpl') h += '<button data-i="' + i + '">' + I.tmpl + '<span class="qt">New \u201c' + esc(it.tp.name) + '\u201d note</span><small>' + (isPro() ? 'template' : 'Pro') + '</small></button>';
        else h += '<button data-i="' + i + '">' + I.cmd + '<span class="qt">' + esc(it.c[0]) + '</span></button>';
      });
      list.innerHTML = h || '<div class="qsh">Nothing matches</div>';
      hl1();
    }
    function hl1() { list.querySelectorAll('button').forEach(function (b) { b.classList.toggle('sel', +b.dataset.i === sel); }); }
    function pick(i) {
      var it = items[i]; if (!it) return;
      close();
      if (it.t === 'n') go('#/n/' + it.n.id);
      else if (it.t === 'create') { var n = createNote({ title: it.q.trim().replace(/\s+/g, ' '), folder: '', body: '' }); go('#/n/' + n.id); startEditing(n, false); }
      else if (it.t === 'search') go('#/search/' + encodeURIComponent(it.q));
      else if (it.t === 'tmpl') createFromTemplate(it.tp);
      else it.c[2](inp.value.trim());
    }
    inp.addEventListener('input', draw);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); hl1(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); hl1(); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
      else if (e.key === 'Escape') close();
    });
    list.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
    list.addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (b) pick(+b.dataset.i); });
    $('.qsx', box).addEventListener('click', close);
    scrim.addEventListener('click', close);
    draw();
    inp.focus();
    requestAnimationFrame(function () { scrim.classList.add('show'); box.classList.add('show'); });
  }

  /* ---------- trash ---------- */
  function renderTrash() {
    var list = Array.from(trash.values()).sort(function (a, b) { return b.trashed - a.trashed; });
    var h = '<div class="page"><div class="nav"><button class="back" data-act="back" data-to="#/">' + I.back + '<span>Notes</span></button><div class="acts">' +
      (list.length ? '<button class="pill" data-act="emptytrash" style="margin-right:8px">Empty</button>' : '') + '</div></div><h1 class="h1">Trash</h1>';
    if (!list.length) h += '<div class="empty"><b>Trash is empty</b>Deleted notes wait here for ' + TRASH_DAYS + ' days, so you can bring them back.</div>';
    else {
      h += '<div class="hint1" style="margin-top:-6px">Tap a note to restore it. Notes are removed for good after ' + TRASH_DAYS + ' days.</div>';
      list.forEach(function (n) {
        var left = Math.max(1, Math.ceil((n.trashed + TRASH_DAYS * 864e5 - Date.now()) / 864e5));
        h += '<button class="nl" data-act="trashitem" data-id="' + n.id + '"><div class="t"><b>' + esc(n.title) + '</b><time>' + left + 'd left</time></div><div class="s">' + snippetHTML(n.body) + '</div>' + (n.folder ? '<div class="f">' + esc(crumbOf(n.folder)) + '</div>' : '') + '</button>';
      });
    }
    viewEl.innerHTML = h + '</div>';
  }

  /* ---------- tasks: every checklist item across the vault ---------- */
  var TASK_RE = /^(\s*(?:>\s*)*(?:[-*+]|\d+[.)])\s+)\[( |x|X)\]\s+(.*)$/;
  function allTasks() {
    var out = [];
    notes.forEach(function (n) {
      if (n.body.indexOf('[') < 0) return;
      var fence = false;
      n.body.split('\n').forEach(function (l, i) {
        if (/^\s*(```|~~~)/.test(l)) { fence = !fence; return; }
        if (fence) return;
        var m = TASK_RE.exec(l);
        if (m && m[3].trim()) out.push({ n: n, line: i, done: m[2] !== ' ', text: m[3] });
      });
    });
    return out;
  }
  function openTaskCount() { var c = 0; allTasks().forEach(function (t) { if (!t.done) c++; }); return c; }
  function renderTasks() {
    var list = allTasks(), open = list.filter(function (t) { return !t.done; }), done = list.length - open.length;
    var show = ui.tasksDone ? list : open, groups = [], byNote = {};
    show.forEach(function (t) { if (!byNote[t.n.id]) { byNote[t.n.id] = []; groups.push(t.n); } byNote[t.n.id].push(t); });
    groups.sort(function (a, b) { return b.updated - a.updated; });
    var o = mdOpt();
    var h = '<div class="page"><div class="nav"><button class="back" data-act="back" data-to="#/">' + I.back + '<span>Notes</span></button><div class="acts">' +
      (done ? '<button class="pill" data-act="tasksdone" style="margin-right:8px">' + (ui.tasksDone ? 'Hide done' : 'Show done (' + done + ')') + '</button>' : '') + '</div></div>' +
      '<div class="eyebrow">' + open.length + ' open</div><h1 class="h1">Tasks</h1>';
    if (!list.length) h += '<div class="empty"><b>No tasks yet</b>Any checklist line in any note shows up here. Type <span class="kbd">- [ ]</span> or pick Checklist from the <span class="kbd">/</span> menu.</div>';
    else if (!show.length) h += '<div class="empty"><b>All done</b>Every checklist item in your notes is ticked off.</div>';
    groups.forEach(function (n) {
      h += '<div class="tkg"><button class="tkn" data-act="open" data-id="' + n.id + '">' + esc(n.title) + (n.folder ? '<small>' + esc(folderName(n.folder)) + '</small>' : '') + I.chev + '</button><div class="prose tkl"><ul>' +
        byNote[n.id].map(function (t) {
          return '<li class="task' + (t.done ? ' done' : '') + '"><label class="cb"><input type="checkbox" data-nid="' + n.id + '" data-line="' + t.line + '"' + (t.done ? ' checked' : '') + '><span class="box"></span></label><span class="tt">' + MD.inline(t.text, o) + '</span></li>';
        }).join('') + '</ul></div></div>';
    });
    viewEl.innerHTML = h + '</div>';
  }

  /* ---------- formatting guide (rendered, never saved as a note) ---------- */
  var GUIDE = '## Fast ways in\n- Type **/** anywhere to insert a block, or tap **+** on the toolbar.\n- **[[** links a note. **![[Note]]** shows another note right inside this one.\n- Press and hold a note in a list for pin, rename, move, duplicate and delete.\n- Pull down on the Notes screen (or tap the search bar) to jump anywhere.\n- Double-tap any paragraph to edit right there.\n\n## Text\n**bold**, *italic*, ~~strike~~, ==highlight==, `code`, [^1] footnotes, $E = mc^2$ math.\n\n## Lists\n- [ ] Checklist item\n  - [x] Nested item (indent with the \u2192 button)\n1. Numbered\n\n## Callouts and toggles\n> [!info] Info\n> Also tip, warning, danger, question and example.\n\n> [!toggle]- Tap to open a toggle\n> Hidden until you need it.\n\n## Recall cards\nWhat does ATP stand for :: adenosine triphosphate\nThe {{c::hippocampus}} helps form new memories.\n\n## Sync\n**Settings \u203a Cloud sync** keeps your notes on every device you log in on. They\u2019re encrypted with your password before they leave this one, so only you can read them.\n\n## History\nEvery note keeps earlier versions for 30 days: **\u22ef \u203a History**. **Restore as new note** brings an old version back as its own note and leaves the current one alone. Then tap **Merge** on that copy to pick, change by change, what goes back into the original.\n\n## Axon Pro\nWriting, folders, [[links]], search, Markdown, Trash, import and backups are free. Cloud sync, History, Graph, Templates, Daily notes, Recall, Discover, Tasks, accent colors, auto-link and flashcard export are **Axon Pro**, $35 once: **Settings \u203a Get Axon Pro**. **Northpeak All-Access**, $100 lifetime, unlocks Axon, Synapse and every future Northpeak app; bought in Synapse, its code goes in **Get Axon Pro \u203a Have an All-Access code?** You pay with an Apple Cash request, and Pro turns on by itself once it\u2019s paid. Nothing you\u2019ve written is ever locked.\n\n## Properties\nStart a note with a block like this to get a chip row:\n```yaml\n---\ntags: [biology, exam]\ndate: 2026-10-19\n---\n```\n\n[^1]: Footnotes collect at the bottom of the note.';
  function renderGuide() {
    viewEl.innerHTML = '<div class="page"><div class="nav"><button class="back" data-act="back" data-to="#/settings">' + I.back + '<span>Settings</span></button><div class="acts"></div></div><div class="eyebrow">Axon</div><h1 class="h1">Formatting guide</h1><article class="prose">' + MD.render(GUIDE, { resolve: function () { return true; } }) + '</article></div>';
  }

  /* ---------- outline + stats ---------- */
  async function showOutline() {
    var n = editing ? editing.n : notes.get(route().id); if (!n) return;
    var ed = $('#ed'); if (ed) n.body = ed.value;
    var hs = MD.headings(n.body), plain = MD.plain(n.body), w = words(n.body), ch = plain.replace(/\s/g, '').length;
    var a = await sheet({ title: n.title, message: w + ' words \u00b7 ' + ch.toLocaleString() + ' characters \u00b7 ' + readMin(w) + ' min read', left: true,
      actions: hs.length ? hs.map(function (x) { return { label: '\u2003'.repeat(Math.max(0, x.level - 1)) + x.text.replace(/[*_=`~]/g, ''), value: x }; }) : [{ label: 'No headings yet \u2014 add one with / then Heading', value: '' }] });
    if (!a) return;
    if (editing && (ed = $('#ed'))) {
      var lines = ed.value.split('\n'), c = 0; for (var i = 0; i < a.line; i++) c += lines[i].length + 1;
      var tops = lineTops(ed), vr = viewEl.getBoundingClientRect(), edTop = ed.getBoundingClientRect().top - vr.top + viewEl.scrollTop;
      viewEl.scrollTop = edTop + (tops[a.line] || 0) - 60;
      try { ed.focus({ preventScroll: true }); } catch (e) {} ed.setSelectionRange(c + lines[a.line].length, c + lines[a.line].length);
    } else {
      var el = document.getElementById('h-' + a.slug); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  /* ---------- link peek (press and hold a [[link]]) ---------- */
  var peekEl = null;
  function closePeek() { if (peekEl) { var p = peekEl; peekEl = null; p.classList.remove('show'); setTimeout(function () { p.remove(); }, 180); } }
  function showPeek(title, heading) {
    closePeek();
    var n = byTitle(title);
    peekEl = document.createElement('div'); peekEl.className = 'peek';
    peekEl.innerHTML = '<div class="pk">' + (n ? '<div class="pkh"><b>' + esc(n.title) + '</b><span>' + esc(n.folder ? crumbOf(n.folder) : '/') + ' \u00b7 ' + agoLong(n.updated) + '</span></div><div class="prose pkb">' + (n.body.trim() ? MD.render(n.body, { resolve: resolver, embed: embedder, ro: true, _depth: 1 }) : '<p class="empty-note">Empty note</p>') + '</div><div class="pkf"><button data-pk="close">Close</button><button class="acc" data-pk="open">Open note</button></div>'
      : '<div class="pkh"><b>' + esc(title) + '</b><span>No note with this name yet</span></div><div class="pkf"><button data-pk="close">Close</button><button class="acc" data-pk="open">Create it</button></div>') + '</div>';
    document.body.appendChild(peekEl);
    hydrateImgs(peekEl);
    requestAnimationFrame(function () { if (peekEl) peekEl.classList.add('show'); });
    peekEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pk]');
      if (!b) { if (e.target === peekEl) closePeek(); return; }
      var r = route(), from = r.v === 'note' ? notes.get(r.id) : null;
      closePeek();
      if (b.dataset.pk === 'open') openLink(title, heading, from);
    });
  }

  /* ---------- note actions (menu + press and hold) ---------- */
  async function duplicateNote(n) {
    var c = createNote({ title: uniqueTitle(n.title + ' copy'), folder: n.folder, body: n.body });
    toast('Duplicated'); return c;
  }
  function noteMD(n) { return '# ' + n.title + '\n\n' + n.body.replace(/^\s+/, ''); }
  function shareNote(n) {
    var text = noteMD(n);
    if (navigator.share) { navigator.share({ title: n.title, text: text }).then(function () { toast('Shared'); }).catch(function (e) { if (e && e.name !== 'AbortError') copyNote(n); }); return; }
    copyNote(n);
  }
  function copyNote(n) {
    var text = noteMD(n);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast('Copied as Markdown'); }, function () { toast('Couldn\u2019t copy'); });
    else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copied as Markdown'); } catch (e) { toast('Couldn\u2019t copy'); } ta.remove(); }
  }
  function randomNote() {
    var all = Array.from(notes.values()).filter(function (n) { return !inTemplates(n) && !isDaily(n); });
    if (!all.length) all = Array.from(notes.values());
    if (!all.length) { toast('No notes yet'); return; }
    var cur = route().v === 'note' ? route().id : null, pick = all[Math.floor(Math.random() * all.length)];
    if (all.length > 1 && pick.id === cur) pick = all[(all.indexOf(pick) + 1) % all.length];
    go('#/n/' + pick.id);
  }
  function togglePin(n) { n.pinned = !n.pinned; putNote(n); toast(n.pinned ? 'Pinned to the top' : 'Unpinned'); }
  async function askTrash(n, after) {
    var bl = backlinks(n).length;
    trashNote(n);
    toast('Moved to Trash' + (bl ? ' \u00b7 ' + bl + ' link' + (bl === 1 ? '' : 's') + ' now unresolved' : ''));
    if (after) after();
  }
  async function rowMenu(n) {
    var nc = MD.recall(n.body).length;
    var a = await sheet({ title: n.title, actions: [
      { label: n.pinned ? 'Unpin' : 'Pin to top', value: 'pin', icon: I.pin }, { label: 'Rename', value: 'rename', icon: I.edit },
      { label: 'Move to folder', value: 'move', icon: I.folder.replace(' class="fi"', '') }, { label: 'Duplicate', value: 'dup', icon: I.copy }]
      .concat(nc ? [{ label: 'Review ' + nc + ' card' + (nc === 1 ? '' : 's'), value: 'review', icon: I.recall }] : [])
      .concat([{ label: 'Move to Trash', value: 'delete', danger: true, icon: I.trash }]), left: true });
    if (!a) return;
    if (a === 'pin') { togglePin(n); render(); }
    else if (a === 'dup') { await duplicateNote(n); render(); }
    else if (a === 'review') go('#/review/' + encodeURIComponent(n.id));
    else if (a === 'delete') { askTrash(n); render(); }
    else if (a === 'rename' || a === 'move') { await noteMenu(n, a); if (route().v !== 'note') render(); }
  }

  /* ---------- cloud sync ----------
     Local-first: IndexedDB stays the source of truth on each device. Every record is encrypted on
     this device (sync.js) before upload; the server stores ciphertext and a per-record sequence.
     sy.map[recordId] = { s: server sequence this device last saw, h: hash of that record's plaintext }.
     A record is "changed here" when its current plaintext hash differs from h. */
  var sy = { user: null, token: null, key: null, cursor: 0, map: {}, tomb: {}, fg: {}, last: 0, err: '', did: false }, syBusy = false, syT = null, syAgain = false, syApplying = false;
  function syOn() { return !!(window.AXS && sy.token && sy.key); }
  function sySave() { DB.put('meta', { k: 'sync', v: { user: sy.user, token: sy.token, cursor: sy.cursor, map: sy.map, tomb: sy.tomb, fg: sy.fg, last: sy.last, did: sy.did, base: sy.base || null } }).catch(function () {}); }
  function sySoon(ms) { if (!syOn()) return; if (syApplying || syBusy) { syAgain = true; return; } clearTimeout(syT); syT = setTimeout(function () { syncNow(false); }, ms || 3000); }
  function nRec(id) { return 'n:' + id; }
  function notePayload(n) { var o = { k: 'n', t: n.title, f: n.folder || '', b: n.body, c: n.created || 0, u: n.updated || 0 }; if (n.pinned) o.p = 1; if (n.trashed) o.tr = n.trashed; return JSON.stringify(o); }
  function folderPayload() {
    var g = {}, cut = Date.now() - 90 * 864e5; Object.keys(sy.fg || {}).sort().forEach(function (p) { if (sy.fg[p] > cut) g[p] = sy.fg[p]; });
    return JSON.stringify({ k: 'f', l: Array.from(folders).sort(), g: g });
  }
  /* deleted or renamed folders travel as "gone" marks, so they don't come back from another device */
  function syFolderGone(list) { if (!syOn()) return; sy.fg = sy.fg || {}; list.forEach(function (f) { sy.fg[f] = Date.now(); }); sySave(); sySoon(); }
  function rcPayload(s) { return JSON.stringify({ k: 'r', s: s }); }
  function rcMetaPayload() { var l = rcMeta.log || {}, o = {}; Object.keys(l).sort().forEach(function (d) { o[d] = l[d]; }); return JSON.stringify({ k: 'm', day: rcMeta.day || '', nt: rcMeta.newToday || 0, log: o }); }
  function rcRec(id) { return 'r:' + AXS.hash(String(id)).replace(/\./g, '-'); }
  function syChanged(rid, pl) { var m = sy.map[rid]; return !m || m.h !== AXS.hash(pl); }
  /* every record this device would upload, as [recordId, plaintext] (images are loaded lazily) */
  function syLocal() {
    var out = [];
    function addNote(n) {
      if (n.seed && !sy.map[nRec(n.id)]) return; /* untouched starter notes stay on this device */
      if (freshNote[n.id] && !n.body.trim()) return; /* a blank note you're still deciding on */
      out.push([nRec(n.id), notePayload(n), n.body]);
    }
    notes.forEach(addNote); trash.forEach(addNote);
    out.push(['f:all', folderPayload()]);
    rc.forEach(function (s) { out.push([rcRec(s.id), rcPayload(s)]); });
    if (rcMeta.log && Object.keys(rcMeta.log).length) out.push(['m:recall', rcMetaPayload()]);
    return out;
  }
  function syImages() {
    var ids = {};
    function scan(n) { if (!n.seed || sy.map[nRec(n.id)]) MD.images(n.body).forEach(function (i) { if (/^[\w-]{1,60}$/.test(i)) ids[i] = 1; }); }
    notes.forEach(scan); trash.forEach(scan);
    return Object.keys(ids).filter(function (i) { return !sy.map['i:' + i]; });
  }
  /* hard deletes of notes the cloud already has are sent as tombstones */
  function syTomb(id) { if (syOn() && sy.map[nRec(id)] && !syApplying) { sy.tomb[nRec(id)] = 1; sySave(); sySoon(); } }
  function setTitleSafe(n, t) { var ex = byTitle(t); return ex && ex !== n ? uniqueTitle(t) : t; }
  async function syApply(rid, s, del, text, stats) {
    var kind = rid.charAt(0);
    if (kind === 'n') {
      var id = rid.slice(2), local = notes.get(id) || trash.get(id);
      if (del) {
        var prevD = sy.map[rid];
        sy.map[rid] = { s: s, h: 'del' };
        if (!local) return;
        /* deleted on another device: only drop it here if nothing changed here since the last sync */
        if (prevD && prevD.h === AXS.hash(notePayload(local)) && !(editing && editing.n === local)) {
          snapshot(local, local.body, true);
          notes.delete(id); trash.delete(id); rebuildIdx(); DB.del('notes', id); stats.del++;
        }
        return;
      }
      var p = JSON.parse(text), h = AXS.hash(text);
      if (!local) {
        var n = { id: id, title: p.t, folder: p.f || '', body: p.b || '', created: p.c || Date.now(), updated: p.u || Date.now(), seed: false };
        if (p.p) n.pinned = true;
        var ex = !p.tr && byTitle(p.t);
        if (ex && ex.body === n.body && !sy.map[nRec(ex.id)] && !(editing && editing.n === ex)) { /* the same note made on both devices before syncing */
          notes.delete(ex.id); rebuildIdx(); DB.del('notes', ex.id);
          /* it may be the note on screen (today's daily note opened on both phones): show the synced one instead of "no longer exists" */
          if (route().v === 'note' && route().id === ex.id) history.replaceState(null, '', '#/n/' + encodeURIComponent(id));
          if (ui.lastNote === ex.id) ui.lastNote = id;
        } else if (ex) n.title = uniqueTitle(p.t);
        if (p.tr) { n.trashed = p.tr; trash.set(id, n); } else { notes.set(id, n); ensureFolder(n.folder); }
        rebuildIdx(); putNote(n); stats.add++;
        sy.map[rid] = { s: s, h: h, bh: AXS.hash(n.body) }; return;
      }
      var lh = AXS.hash(notePayload(local)), prev = sy.map[rid], rb = p.b || '';
      if (lh === h) { sy.map[rid] = { s: s, h: h, bh: AXS.hash(rb) }; return; }
      if (prev && prev.h === h) { sy.map[rid] = { s: s, h: h, bh: prev.bh }; return; } /* the cloud still has the version this device last synced: only this device changed it */
      var isEd = !!(editing && editing.n === local), localChanged = isEd || !prev || lh !== prev.h;
      if (localChanged) {
        /* three-way check against the text both devices last agreed on: a rename on one device and an
           edit on the other is not a conflict */
        var bh = prev && prev.bh;
        if (bh && local.body !== rb && !isEd) {
          var rbh = AXS.hash(rb);
          if (rbh === bh) {
            /* only the name, folder or pin changed over there: take those, keep this device's text (it uploads next) */
            local.title = setTitleSafe(local, p.t); local.folder = p.f || '';
            if (p.p) local.pinned = true; else delete local.pinned;
            if (p.tr) { local.trashed = p.tr; notes.delete(id); trash.set(id, local); } else { delete local.trashed; trash.delete(id); notes.set(id, local); ensureFolder(local.folder); }
            rebuildIdx(); putNote(local); stats.upd++;
            sy.map[rid] = { s: s, h: h, bh: rbh }; return;
          }
          if (AXS.hash(local.body) === bh) {
            /* the text changed over there, only the name, folder or pin changed here: take the text, keep those */
            snapshot(local, local.body, true);
            local.body = rb; lastSaved[id] = rb;
            rebuildIdx(); putNote(local); stats.upd++;
            sy.map[rid] = { s: s, h: h, bh: rbh }; return;
          }
        }
        if (local.body !== rb) {
          /* changed on both devices: keep both, never lose an edit. The newer one keeps the note, the
             other becomes "title (conflict)". A note open in the editor always stays as it is. */
          stats.conf++;
          if (isEd || (p.u || 0) <= (local.updated || 0)) {
            stats.cids.push(createNote({ title: uniqueTitle(p.t + ' (conflict)'), folder: p.f || '', body: rb }).id);
            sy.map[rid] = { s: s, h: h, bh: AXS.hash(rb) }; return; /* local stays and uploads next, since it differs from h */
          }
          stats.cids.push(createNote({ title: uniqueTitle(local.title + ' (conflict)'), folder: local.folder, body: local.body }).id);
        } else if (isEd || (local.updated || 0) >= (p.u || 0)) { sy.map[rid] = { s: s, h: h, bh: AXS.hash(rb) }; return; } /* same text: newest title/folder/pin wins */
      }
      if (local.body !== (p.b || '')) snapshot(local, local.body, true);
      local.title = setTitleSafe(local, p.t); local.folder = p.f || ''; local.body = p.b || ''; local.created = p.c || local.created; local.updated = p.u || local.updated; local.seed = false;
      if (p.p) local.pinned = true; else delete local.pinned;
      if (p.tr) { local.trashed = p.tr; notes.delete(id); trash.set(id, local); } else { delete local.trashed; trash.delete(id); notes.set(id, local); ensureFolder(local.folder); }
      lastSaved[id] = local.body;
      rebuildIdx(); putNote(local); stats.upd++;
      sy.map[rid] = { s: s, h: h, bh: AXS.hash(local.body) };
      return;
    }
    if (del) { sy.map[rid] = { s: s, h: 'del' }; return; }
    var q = JSON.parse(text), qh = AXS.hash(text);
    if (kind === 'f') {
      sy.fg = sy.fg || {};
      Object.keys(q.g || {}).forEach(function (p) { sy.fg[p] = Math.max(sy.fg[p] || 0, +q.g[p] || 0); });
      (q.l || []).forEach(function (f) { if (typeof f === 'string' && f && !sy.fg[f]) ensureFolder(f); });
      var drop = Object.keys(sy.fg).filter(function (f) { return folders.has(f) && countIn(f) === 0 && childFolders(f).length === 0 && !Array.from(trash.values()).some(function (n) { return n.folder === f; }); });
      if (drop.length) { drop.forEach(function (f) { folders.delete(f); delete ui.open[f]; }); DB.delMany('folders', drop); stats.upd++; }
      sy.map[rid] = { s: s, h: qh }; return;
    }
    if (kind === 'i') {
      var have = null; try { have = await IMG.get(q.id); } catch (e) {}
      if (!have) { await IMG.put({ id: q.id, data: AXS.unb64(q.d).buffer, type: q.type || 'image/jpeg', w: q.w, h: q.h, created: q.c || Date.now() }); stats.img++; }
      sy.map[rid] = { s: s, h: 'img' }; return;
    }
    if (kind === 'r') {
      var st = q.s, cur = st && rc.get(st.id);
      if (st && st.id && (!cur || (st.last || 0) > (cur.last || 0))) { rc.set(st.id, st); RC.put('cards', st).catch(function () {}); stats.rc++; }
      sy.map[rid] = { s: s, h: qh }; return;
    }
    if (kind === 'm') {
      rcMeta.log = rcMeta.log || {};
      Object.keys(q.log || {}).forEach(function (d) { rcMeta.log[d] = Math.max(rcMeta.log[d] || 0, +q.log[d] || 0); });
      if (q.day && q.day === rcMeta.day) rcMeta.newToday = Math.max(rcMeta.newToday || 0, q.nt || 0);
      saveRcMeta(); sy.map[rid] = { s: s, h: qh }; return;
    }
    sy.map[rid] = { s: s, h: qh };
  }
  async function syPull(stats) {
    for (var guard = 0; guard < 400; guard++) {
      var r = await AXS.api('/api/pull?since=' + sy.cursor, { token: sy.token });
      syApplying = true;
      try {
        for (var i = 0; i < r.recs.length; i++) {
          var x = r.recs[i], m = sy.map[x.i];
          if (m && m.s >= x.s) continue; /* our own upload coming back */
          var text = null;
          if (!x.x) { try { text = await AXS.open(sy.key, x.i, x.d); } catch (e) { stats.bad++; continue; } }
          try { await syApply(x.i, x.s, !!x.x, text, stats); } catch (e) { stats.bad++; }
        }
      } finally { syApplying = false; }
      sy.cursor = Math.max(sy.cursor, r.last || 0);
      if (!r.more) break;
    }
  }
  async function syPush(stats) {
    var batch = [], bytes = 0, res = { conflicts: 0, busy: false };
    async function flush() {
      if (!batch.length) return;
      var send = batch; batch = []; bytes = 0;
      var r;
      try { r = await AXS.api('/api/push', { token: sy.token, body: { recs: send.map(function (b) { return b.rec; }) } }); }
      catch (e) { if (e.status === 409) { res.busy = true; return; } throw e; }
      var byId = {}; send.forEach(function (b) { byId[b.rec.i] = b; });
      r.res.forEach(function (x) {
        var b = byId[x.i]; if (!b) return;
        if (x.conflict) { res.conflicts++; if (b.rec.x) delete sy.tomb[x.i]; return; }
        sy.map[x.i] = b.bh ? { s: x.s, h: b.h, bh: b.bh } : { s: x.s, h: b.h }; stats.up++;
        if (b.rec.x) delete sy.tomb[x.i];
      });
    }
    async function add(rid, pl, h, bh) {
      var d = await AXS.seal(sy.key, rid, pl);
      batch.push({ rec: { i: rid, b: (sy.map[rid] && sy.map[rid].s) || 0, d: d }, h: h, bh: bh });
      bytes += d.length;
      if (batch.length >= 150 || bytes > 3000000) await flush();
    }
    var loc = syLocal();
    for (var i = 0; i < loc.length && !res.busy; i++) {
      var rid = loc[i][0], pl = loc[i][1], h = AXS.hash(pl);
      var m = sy.map[rid], body = loc[i][2];
      if (m && m.h === h) { if (typeof body === 'string' && !m.bh) m.bh = AXS.hash(body); continue; } /* in sync: remember its text for three-way checks */
      if (rid === 'f:all' && !m && Array.from(folders).length === 0) continue;
      await add(rid, pl, h, typeof body === 'string' ? AXS.hash(body) : undefined);
    }
    var imgs = syImages();
    for (var k = 0; k < imgs.length && !res.busy; k++) {
      var im = null; try { im = await IMG.get(imgs[k]); } catch (e) {}
      if (!im || !im.data) continue;
      if (im.data.byteLength > 1300000) continue; /* too big to sync; stays on this device */
      await add('i:' + im.id, JSON.stringify({ k: 'i', id: im.id, type: im.type, w: im.w, h: im.h, c: im.created, d: AXS.b64(im.data) }), 'img');
    }
    Object.keys(sy.tomb).forEach(function (rid) { if (sy.map[rid]) batch.push({ rec: { i: rid, b: sy.map[rid].s, d: '', x: 1 }, h: 'del' }); else delete sy.tomb[rid]; });
    if (!res.busy) await flush();
    return res;
  }
  async function syncNow(manual) {
    if (!syOn()) return;
    if (PRO.need) {
      /* this account doesn't have Pro (yet): no sync calls until it does */
      if (!manual) return;
      var pj = await proCheck(true);
      if (!pj || !pj.pro) { if (pj) openPro('Cloud sync'); else toast('You\u2019re offline. Try again when you\u2019re connected.'); return; }
    }
    if (syBusy) { syAgain = true; return; }
    if (!manual && navigator.onLine === false) return;
    syBusy = true; syAgain = false; syUI();
    var stats = { add: 0, upd: 0, del: 0, conf: 0, img: 0, rc: 0, up: 0, bad: 0, cids: [] };
    try {
      if (!sy.did) {
        /* one full local copy before this device's first sync, kept in this browser */
        var keep = []; notes.forEach(function (n) { keep.push(Object.assign({}, n)); }); trash.forEach(function (n) { keep.push(Object.assign({}, n)); });
        try { await DB.put('meta', { k: 'sync-backup', v: { ts: Date.now(), notes: keep, folders: Array.from(folders) } }); } catch (e) {}
      }
      for (var round = 0; round < 4; round++) {
        await syPull(stats);
        var r = await syPush(stats);
        if (!r.conflicts && !r.busy) break;
        if (r.busy) await new Promise(function (ok) { setTimeout(ok, 300 + Math.random() * 900); });
      }
      sy.did = true; sy.last = Date.now(); sy.err = '';
      var changed = stats.add + stats.upd + stats.del + stats.img;
      if (changed || stats.rc) {
        var ae = document.activeElement, typing = ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName);
        if (!editing && !openOverlays.length && !typing && /^(vault|folder|note|trash|tasks|recall|settings)$/.test(route().v)) render();
        hydrateImgs();
        recallSoon();
      }
      if (stats.conf) {
        var cid = stats.cids.filter(function (id) { return notes.has(id); })[0];
        toast(stats.conf === 1 ? 'A note changed on two devices. Both versions are kept' : stats.conf + ' notes changed on two devices. Both versions are kept (look for \u201c(conflict)\u201d)', cid ? { label: 'Merge', fn: function () { var c = notes.get(cid), o = copyOrigin(c); if (c && o) openMerge(o, c); else if (c) go('#/n/' + c.id); } } : null);
      }
      else if (manual) toast(changed ? 'Synced \u00b7 ' + changed + ' change' + (changed === 1 ? '' : 's') + ' from the cloud' : 'Synced \u00b7 everything is up to date');
      if (stats.bad) sy.err = stats.bad + ' item' + (stats.bad === 1 ? '' : 's') + ' couldn\u2019t be read';
    } catch (e) {
      if (e.status === 402) { sy.err = ''; proFromServer(false); if (manual) openPro('Cloud sync'); }
      else if (e.status === 401) { syForget(true); toast('Signed out of cloud sync (the password was changed or the account removed). Log in again in Settings'); if (route().v === 'settings' && !openOverlays.length) renderSettings(); }
      else sy.err = e.offline ? 'Offline \u00b7 will sync when you\u2019re back online' : 'Sync failed (' + (e.message || 'error') + ')';
      if (manual && sy.err) toast(sy.err);
    } finally {
      syBusy = false; sySave(); syUI();
      if (syAgain) sySoon(1500);
    }
  }
  /* keepBase: remember which version of each note was last in sync, so logging back in as the same
     user (e.g. after a password change on another device) doesn't flag every note as a conflict */
  function syForget(keepBase) {
    var base = null;
    if (keepBase && sy.user) { base = { u: sy.user, h: {} }; Object.keys(sy.map).forEach(function (k) { if (sy.map[k].h) base.h[k] = sy.map[k].h; }); }
    else if (keepBase && sy.base) base = sy.base;
    sy.base = base;
    sy.token = null; sy.key = null; sy.user = null; sy.cursor = 0; sy.map = {}; sy.tomb = {}; sy.fg = {}; sy.last = 0; sy.err = ''; sy.did = false;
    sySave(); DB.del('meta', 'sync-key').catch(function () {});
  }
  async function syStoreKey(raw) {
    var key = await AXS.keyFrom(raw);
    /* a non-extractable key object; older Safari can't store those, so fall back to the raw bytes */
    try { await DB.put('meta', { k: 'sync-key', v: key }); } catch (e) { await DB.put('meta', { k: 'sync-key', v: { raw: AXS.b64(raw) } }); }
    return key;
  }
  async function syLoad(m) {
    if (!window.AXS || !m.sync || !m.sync.token) return;
    Object.assign(sy, m.sync); sy.map = sy.map || {}; sy.tomb = sy.tomb || {}; sy.fg = sy.fg || {};
    var k = m['sync-key'];
    try { sy.key = k && k.raw ? await AXS.keyFrom(AXS.unb64(k.raw)) : (k || null); } catch (e) { sy.key = null; }
    if (!sy.key) { sy.token = null; return; }
  }
  function syAgo() { return sy.last ? agoLong(sy.last) : 'not yet'; }
  function syHTML() {
    if (!window.AXS) return '';
    var h = '<div class="sec"><span>Cloud sync</span>' + (syOn() ? '<span style="text-transform:none;letter-spacing:0" id="systate">' + (PRO.need ? 'Needs Pro' : syBusy ? 'Syncing\u2026' : 'On') + '</span>' : '') + '</div><div class="group">';
    if (!syOn()) {
      h += '<div class="item"><span>Keep your notes on all your devices<small>Notes, folders, images and Recall progress are encrypted on this device with your password before they\u2019re uploaded, so only you can read them. Axon still works fully offline.</small></span></div>' +
        '<button class="item" data-act="sysignup"><span>' + proTag('Create a sync account') + '</span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
        '<button class="item" data-act="sylogin"><span>Log in<small>Already synced on another device</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>';
    } else if (PRO.need) {
      h += '<button class="item" data-act="getpro" data-what="Cloud sync"><span>Cloud sync needs Axon Pro<small>Signed in as ' + esc(sy.user) + ' \u00b7 ' + (PRO.req && PRO.req.status === 'new' ? 'request sent, it starts by itself once it\u2019s paid' : 'your notes start syncing as soon as Pro is on') + '</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
        '<button class="item" data-act="sylogout"><span>Log out<small>Your notes stay on this device.</small></span></button>';
    } else {
      h += '<button class="item" data-act="synow"><span>Sync now<small id="sysub">Signed in as ' + esc(sy.user) + ' \u00b7 last synced ' + syAgo() + (sy.err ? ' \u00b7 ' + esc(sy.err) : '') + '</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
        '<div class="item"><span>End-to-end encrypted<small>Your password is the only key. If you forget it, the cloud copy can\u2019t be recovered, but the notes on this device stay.</small></span></div>' +
        '<button class="item" data-act="sypass"><span>Change password</span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
        '<button class="item" data-act="sylogout"><span>Log out<small>Stops syncing on this device. Your notes stay here.</small></span></button>' +
        '<button class="item danger" data-act="sydelete"><span>Delete cloud copy</span></button>';
    }
    return h + '</div>';
  }
  function syUI() {
    var s = $('#systate'), b = $('#sysub');
    if (s) s.textContent = PRO.need ? 'Needs Pro' : syBusy ? 'Syncing\u2026' : 'On';
    if (b) b.textContent = 'Signed in as ' + sy.user + ' \u00b7 ' + (syBusy ? 'syncing\u2026' : 'last synced ' + syAgo()) + (sy.err && !syBusy ? ' \u00b7 ' + sy.err : '');
  }
  /* sign up / log in form */
  function syForm(mode, msg, prevU) {
    var vals = { u: '', p: '', p2: '' };
    return overlay(function (done) {
      var el = document.createElement('div'); el.className = 'dialog syform'; el.setAttribute('role', 'dialog');
      if (mode === 'change') {
        el.innerHTML = '<h4>Change sync password</h4><p>Your notes get re-encrypted with the new password. Other devices are logged out and need the new password. <b>If you forget it, the cloud copy can\u2019t be recovered.</b></p>' +
          '<input type="text" name="u" autocomplete="username" value="' + esc(sy.user || '') + '" style="display:none">' +
          '<input type="password" name="p" placeholder="Current password" autocomplete="current-password" enterkeyhint="next">' +
          '<input type="password" name="n1" placeholder="New password (8+ characters)" autocomplete="new-password" enterkeyhint="next" style="margin-top:8px">' +
          '<input type="password" name="n2" placeholder="New password again" autocomplete="new-password" enterkeyhint="go" style="margin-top:8px">' +
          '<div class="err">' + esc(msg || '') + '</div><div class="db"><button data-v="0">Cancel</button><button class="acc" data-v="1">Change</button></div>';
      } else
      el.innerHTML = '<h4>' + (mode === 'signup' ? 'Create a sync account' : 'Log in to sync') + '</h4>' +
        '<p>' + (mode === 'signup' ? 'Pick a username and a password you\u2019ll remember. The password encrypts your notes, so <b>if you forget it, the cloud copy can\u2019t be recovered</b> (the notes on this device stay). No email needed.' : 'Use the username and password from your other device.') + '</p>' +
        '<input type="text" name="u" placeholder="Username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next">' +
        '<input type="password" name="p" placeholder="Password' + (mode === 'signup' ? ' (8+ characters)' : '') + '" autocomplete="' + (mode === 'signup' ? 'new-password' : 'current-password') + '" enterkeyhint="' + (mode === 'signup' ? 'next' : 'go') + '" style="margin-top:8px">' +
        (mode === 'signup' ? '<input type="password" name="p2" placeholder="Password again" autocomplete="new-password" enterkeyhint="go" style="margin-top:8px">' : '') +
        '<div class="err">' + esc(msg || '') + '</div>' +
        '<div class="db"><button data-v="0">Cancel</button><button class="acc" data-v="1">' + (mode === 'signup' ? 'Create' : 'Log in') + '</button></div>';
      var err = $('.err', el), ins = el.querySelectorAll(mode === 'change' ? 'input[type=password]' : 'input');
      function check() {
        if (mode === 'change') {
          vals.u = sy.user; vals.p = ins[0].value; vals.n = ins[1].value;
          if (!vals.p) return 'Type your current password.';
          if (vals.n.length < 8) return 'Use at least 8 characters for the new password.';
          if (vals.n !== ins[2].value) return 'The two new passwords don\u2019t match.';
          if (vals.n === vals.p) return 'That\u2019s the same as the current password.';
          return null;
        }
        vals.u = AXS.normUser(ins[0].value); vals.p = ins[1].value; vals.p2 = ins[2] ? ins[2].value : vals.p;
        if (!/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(vals.u)) return 'Usernames are 3\u201332 letters, numbers, dots, dashes or underscores.';
        if (mode === 'signup' && vals.p.length < 8) return 'Use at least 8 characters for the password.';
        if (!vals.p) return 'Type your password.';
        if (vals.p !== vals.p2) return 'The two passwords don\u2019t match.';
        return null;
      }
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-v]'); if (!b) return;
        if (b.dataset.v === '0') return done(null);
        var m = check(); if (m) { err.textContent = m; return; }
        done(vals);
      });
      Array.prototype.forEach.call(ins, function (inp, i) {
        inp.addEventListener('keydown', function (e) { if (e.key !== 'Enter') return; e.preventDefault(); if (ins[i + 1]) ins[i + 1].focus(); else $('button.acc', el).click(); });
      });
      if (prevU && mode !== 'change') ins[0].value = prevU;
      setTimeout(function () { (prevU && mode !== 'change' ? ins[1] : ins[0]).focus(); }, 60);
      return el;
    });
  }

  async function syChangePass() {
    var msg = '';
    for (;;) {
      var v = await syForm('change', msg); if (!v) return;
      try {
        await syncNow(false);
        if (sy.err) throw new Error(sy.err);
        toast('Checking your password\u2026');
        var od = await AXS.derive(sy.user, v.p);
        try { await AXS.api('/api/login', { body: { u: sy.user, auth: od.auth, label: 'password check' } }); }
        catch (e) { if (e.message === 'wrong') { msg = 'The current password is wrong.'; continue; } throw e; }
        var nd = await AXS.derive(sy.user, v.n), nkey = await AXS.keyFrom(nd.raw);
        for (var attempt = 0; attempt < 2; attempt++) {
          toast('Re-encrypting your notes\u2026');
          var b = await AXS.api('/api/rekey/begin', { token: sy.token, method: 'POST' }), since = 0, batch = [], bytes = 0;
          var flush = async function () { if (!batch.length) return; var send = batch; batch = []; bytes = 0; await AXS.api('/api/rekey/put', { token: sy.token, body: { recs: send } }); };
          for (var guard = 0; guard < 400; guard++) {
            var r = await AXS.api('/api/pull?since=' + since, { token: sy.token });
            for (var i = 0; i < r.recs.length; i++) {
              var x = r.recs[i]; if (x.x) continue;
              var d = await AXS.seal(nkey, x.i, await AXS.open(sy.key, x.i, x.d));
              batch.push({ i: x.i, d: d }); bytes += d.length;
              if (batch.length >= 150 || bytes > 3000000) await flush();
            }
            since = r.last; if (!r.more) break;
          }
          await flush();
          try { await AXS.api('/api/rekey/commit', { token: sy.token, body: { old: od.auth, auth: nd.auth, seq: b.seq } }); }
          catch (e) { if (e.message === 'changed' && !attempt) { await syncNow(false); continue; } throw e; }
          sy.key = await syStoreKey(nd.raw); nd.raw.fill(0); od.raw.fill(0); sySave();
          toast('Password changed. On your other devices, log in again with the new password.');
          if (route().v === 'settings') renderSettings();
          return;
        }
        throw new Error('another device kept syncing');
      } catch (e) {
        msg = e.offline ? 'You\u2019re offline. Connect and try again.' : 'Couldn\u2019t change it (' + (e.message || 'error') + '). Your old password still works.';
      }
    }
  }
  async function syAuth(mode, o) {
    o = o || {};
    var msg = '', lastU = '';
    for (;;) {
      var v = await syForm(mode, msg, lastU); if (!v) return false;
      lastU = v.u;
      var busy = toast(mode === 'signup' ? 'Creating your account and encryption key\u2026' : 'Unlocking\u2026', null, 20000);
      try {
        var d = await AXS.derive(v.u, v.p);
        var r = await AXS.api(mode === 'signup' ? '/api/signup' : '/api/login', { body: { u: v.u, auth: d.auth, label: /iPhone|iPad/.test(navigator.userAgent) ? 'iPhone' : 'browser', grand: PRO.grand ? 1 : 0 } });
        syForget(true);
        var base = sy.base; sy.base = null;
        sy.user = r.user; sy.token = r.token; sy.key = await syStoreKey(d.raw); d.raw.fill(0);
        if (base && base.u === r.user) Object.keys(base.h).forEach(function (k) { sy.map[k] = { s: 0, h: base.h[k] }; });
        sySave();
        proFromServer(!!r.pro);
        if (r.pro) {
          toast(mode === 'signup' ? 'Cloud sync is on. Log in with the same username on your other devices.' : 'Logged in. Syncing your notes\u2026');
          if (route().v === 'settings') renderSettings();
          await syncNow(true);
        } else {
          /* a free account: sync starts once Pro is on (the server checks it too) */
          toast(mode === 'signup' ? 'Account made: ' + r.user : 'Logged in as ' + r.user);
          var j = await proCheck(true);
          if (!o.forPro && !(j && j.request && j.request.status === 'new')) openPro('Cloud sync');
        }
        if (route().v === 'settings' && !openOverlays.length) renderSettings();
        return true;
      } catch (e) {
        msg = e.offline ? 'You\u2019re offline. Connect to the internet and try again.' : e.message === 'taken' ? 'That username is taken. Try another.' : e.message === 'wrong' ? 'Wrong username or password.' : e.message === 'locked' ? 'Too many tries. Wait ' + ((e.body && e.body.wait) || 30) + ' seconds.' : e.message === 'slow_down' ? 'Too many new accounts from here. Try again later.' : 'Something went wrong (' + e.message + '). Try again.';
      }
    }
  }

  var act = {
    folder: function (el) { go('#/f/' + encodeURIComponent(el.dataset.path)); },
    toggle: function (el) { var p = el.dataset.path; ui.open[p] = !ui.open[p]; saveMeta(); var st = viewEl.scrollTop; renderVault(); viewEl.scrollTop = st; },
    open: function (el) { go('#/n/' + el.dataset.id); },
    all: function () { go('#/f/*'); },
    gosearch: function () { go('#/search'); },
    back: function (el) { back(el.dataset.to); },
    newfolder: function (el) { newFolder(el.dataset.path || ''); },
    newhere: function (el) { newNote(el.dataset.path); },
    newempty: function () { newNote(''); },
    foldermore: function (el) { folderMenu(el.dataset.path); },
    notemore: function (el) { var n = notes.get(el.dataset.id); if (n) noteMenu(n); },
    mergeinto: function (el) { var n = notes.get(el.dataset.id), o = copyOrigin(n); if (n && o) openMerge(o, n); },
    edit: function () {
      var r = route(); var n = notes.get(r.id); if (!n) return;
      var p = previewTopBlock(), pr = $('#prose');
      if (!p && pr && pr.getBoundingClientRect().bottom > viewEl.getBoundingClientRect().bottom + 40) p = { line: 0, offset: pr.getBoundingClientRect().top - viewEl.getBoundingClientRect().top };
      startEditing(n, false, p || undefined);
    },
    donebtn: function () { stopEditing(false); },
    localgraph: function (el) { ui.lastNote = el.dataset.id; ui.graphMode = 'local'; saveMeta(); go('#/graph'); },
    gmode: function (el) {
      if (el.dataset.m === 'local' && !(ui.lastNote && notes.get(ui.lastNote))) { toast('Open a note first, then its local graph shows here'); return; }
      ui.graphMode = el.dataset.m; saveMeta(); render();
    },
    gtags: function () { ui.graphTags = !ui.graphTags; saveMeta(); render(); },
    stats: function () { showStats(); },
    calendar: function (el) { openCalendar(el.dataset.day); },
    outlinks: async function (el) {
      var n = notes.get(el.dataset.id); if (!n) return;
      var out = outNotes(n), gh = unresolvedOf(n);
      if (!out.length && !gh.length) { toast('This note doesn\u2019t link anywhere yet \u2014 type [[ to link one'); return; }
      var acts = out.map(function (o) { return { label: o.title, value: 'o:' + o.id, icon: I.note }; }).concat(gh.map(function (t) { return { label: t + ' \u00b7 create', value: 'g:' + t, icon: I.plus }; }));
      var v = await sheet({ title: 'Links from \u201c' + n.title + '\u201d', left: true, actions: acts });
      if (!v) return;
      if (v.slice(0, 2) === 'o:') go('#/n/' + v.slice(2));
      else { var nn = createNote({ title: v.slice(2), folder: n.folder, body: '' }); go('#/n/' + nn.id); startEditing(nn, false); }
    },
    findrep: function () { var ed = $('#ed'); if (ed) openFindReplace(ed); },
    findnote: function (el) { var n = notes.get(el.dataset.id); if (n) openFind(n); },
    linkone: function (el) { var o = notes.get(el.dataset.id), n = route().id && notes.get(route().id); if (!o || !n) return; var k = linkMention(o, n.title); toast(k ? 'Linked in \u201c' + o.title + '\u201d' : 'Nothing to link'); render(); },
    linkall: function (el) { var n = notes.get(el.dataset.id); if (!n) return; var k = 0; unlinkedMentions(n).forEach(function (m) { k += linkMention(m.note, n.title); }); toast('Linked ' + k + ' mention' + (k === 1 ? '' : 's')); render(); },
    gghosts: function () { ui.graphGhosts = ui.graphGhosts === false; saveMeta(); render(); },
    gauto: function () { ui.graphAuto = ui.graphAuto === false; saveMeta(); render(); },
    gcolor: function () { ui.graphColor = ui.graphColor === false; saveMeta(); render(); },
    gfind: async function () {
      var id = await pickNote('Center the graph on\u2026');
      if (!id) return;
      ui.lastNote = id; ui.graphMode = 'local'; saveMeta(); render();
    },
    autolink: function () { autoLinkAll(); },
    autoundo: function () { undoAutoLink(); },
    gfit: function () { graphCtl && graphCtl.fit(); },
    gzin: function () { graphCtl && graphCtl.zoom(1.3); },
    gzout: function () { graphCtl && graphCtl.zoom(1 / 1.3); },
    gopen: function (el) { var id = el.dataset.id; if (id.indexOf('tag:') === 0) go('#/search/' + encodeURIComponent('#' + id.slice(4))); else if (id.indexOf('ghost:') === 0) createGhost(id); else go('#/n/' + id); },
    glocal: function (el) { ui.lastNote = el.dataset.id; ui.graphMode = 'local'; saveMeta(); render(); },
    stag: function (el) { var i = $('#sq'); if (i && el.dataset.on) { i.value = ''; i.dispatchEvent(new Event('input')); return; } if (!i) { go('#/search/' + encodeURIComponent('#' + el.dataset.tag)); return; } i.value = '#' + el.dataset.tag; i.dispatchEvent(new Event('input')); },
    today: function () { openDaily(); },
    qs: function () { openSwitcher(); },
    dnote: function (el) { go('#/discover/' + encodeURIComponent(el.dataset.id)); },
    dall: function () { go('#/discover', true); },
    dshuffle: function () { dShuffle = true; render(); },
    dmore: function () { loadBatch(); },
    dretry: function () { dKeep = null; render(); },
    dsrc: function (el) { if (el.dataset.id && notes.get(el.dataset.id)) go('#/n/' + el.dataset.id); },
    dsave: function (el) { var c = el.closest('.dcard'); if (c) discoverSave(c); },
    dopen: function (el) { var c = el.closest('.dcard'); if (c) window.open(c.dataset.url, '_blank', 'noopener'); },
    dhide: function (el) { var c = el.closest('.dcard'); if (c) discoverHide(c); },
    dclear: async function () {
      var ok = await dialog({ title: 'Clear Discover history?', message: 'Hidden cards come back and the offline copy is cleared. Your notes don\u2019t change.', ok: 'Clear' });
      if (!ok) return; dKeep = null; dHidden = {}; dSaved = {}; try { await DC.clear('cache'); await DC.clear('meta'); } catch (e) {} toast('Discover history cleared');
    },
    dnet: function (el) { settings.discoverNet = el.dataset.v === '1'; saveSettings(); renderSettings(); },
    dailytmpl: async function () {
      var list = allTemplates();
      var v = await sheet({ title: 'Template for new daily notes', left: true, actions: [{ label: 'None (start empty)', value: '', icon: I.x }].concat(list.map(function (t) { return { label: t.name + (t.mine ? '' : ' \u00b7 starter'), value: t.name, icon: I.tmpl }; })) });
      if (v === null || v === undefined) return;
      settings.dailyTmpl = v || ''; saveSettings(); renderSettings();
      toast(v ? 'New daily notes will use \u201c' + v + '\u201d' : 'Daily notes start empty');
    },
    gorecall: function () { go('#/recall'); },
    gotrash: function () { go('#/trash'); },
    sysignup: function () { syAuth('signup'); },
    sylogin: function () { syAuth('login'); },
    synow: function () { syncNow(true); },
    sypass: function () { syChangePass(); },
    sylogout: async function () {
      var ok = await dialog({ title: 'Log out of cloud sync?', message: 'This device stops syncing. All your notes stay here, and the cloud copy stays in your account.', ok: 'Log out' });
      if (!ok) return;
      var t = sy.token; syForget(true); renderSettings(); toast('Logged out of cloud sync');
      if (t) AXS.api('/api/logout', { token: t, method: 'POST' }).catch(function () {});
    },
    sydelete: async function () {
      var ok = await dialog({ title: 'Delete the cloud copy?', message: 'Removes your sync account and every encrypted note stored in the cloud, for all devices. The notes on this device are not touched.', ok: 'Delete cloud copy', danger: true });
      if (!ok) return;
      try { await AXS.api('/api/delete-account', { token: sy.token, method: 'POST' }); syForget(); renderSettings(); toast('Cloud copy deleted. Your notes on this device are still here.'); }
      catch (e) { toast(e.offline ? 'You\u2019re offline. Try again when connected.' : 'Couldn\u2019t delete it (' + e.message + ')'); }
    },
    fromtmpl: function () { newFromTemplate(''); },
    usetmpl: function (el) {
      var t = allTemplates()[+el.dataset.i], ed = $('#ed'); if (!t || !ed || !editing) return;
      insertText(ed, fillTmpl(t.body, editing.n.title), 0, ed.value.length);
      var tc = $('#tchips'); if (tc) tc.remove();
      var v = ed.value, m = /\n(- \[ \] |- |1\. )(?=\n|$)/.exec(v), c = m ? m.index + m[0].length : v.length;
      ed.setSelectionRange(c, c);
    },
    outline: function () { showOutline(); },
    sort: async function () {
      var v = await sheet({ title: 'Sort notes by', actions: Object.keys(SORTS).map(function (k) { return { label: (ui.sort === k ? '\u2713 ' : '') + SORTS[k], value: k }; }) });
      if (v) { ui.sort = v; saveMeta(); var st = viewEl.scrollTop; render(); viewEl.scrollTop = st; }
    },
    review: function (el) { rv = null; go('#/review/' + encodeURIComponent(el.dataset.deck || 'all')); },
    practice: function (el) { rv = null; go('#/review/' + encodeURIComponent(el.dataset.deck || 'all') + '/practice', route().v === 'review'); },
    deck: function (el) { rv = null; var s = recallStats(el.dataset.id); go('#/review/' + encodeURIComponent(el.dataset.id) + (s.due ? '' : '/practice')); },
    reveal: function () { if (rv && rv.q.length && !rv.shown) { rv.shown = true; drawReview(); } },
    rate: function (el) { rate(el.dataset.g); },
    rvclose: function () { rv = null; go('#/recall', true); },
    recalldemo: function () {
      var n = createNote({ title: uniqueTitle('My first cards'), folder: '', body: 'What does Axon do with this line :: it turns it into a Recall card\nThe {{c::hippocampus}} helps turn experiences into memories.\n' });
      go('#/n/' + n.id); startEditing(n, false);
    },
    trashitem: async function (el) {
      var n = trash.get(el.dataset.id); if (!n) return;
      var a = await sheet({ title: n.title, actions: [{ label: 'Restore', value: 'restore', icon: I.restore }, { label: 'Delete forever', value: 'kill', danger: true, icon: I.trash }] });
      if (a === 'restore') { restoreNote(n); toast('Restored \u201c' + n.title + '\u201d'); renderTrash(); }
      else if (a === 'kill') { var ok = await dialog({ title: 'Delete forever?', message: '\u201c' + n.title + '\u201d can\u2019t be brought back after this.', ok: 'Delete', danger: true }); if (ok) { deleteNote(n); toast('Deleted for good'); renderTrash(); } }
    },
    emptytrash: async function () {
      var ok = await dialog({ title: 'Empty Trash?', message: trash.size + ' note' + (trash.size === 1 ? '' : 's') + ' will be deleted for good.', ok: 'Empty Trash', danger: true });
      if (ok) { var k = purgeTrash(true); toast('Deleted ' + k + ' note' + (k === 1 ? '' : 's') + ' for good'); renderTrash(); }
    },
    guide: function () { go('#/guide'); },
    newper: function (el) { settings.newPerDay = +el.dataset.v; saveSettings(); renderSettings(); },
    resetrecall: async function () {
      var ok = await dialog({ title: 'Reset Recall progress?', message: 'Your notes stay. Every card starts over as new.', ok: 'Reset', danger: true });
      if (ok) { rc.clear(); rcMeta = { day: '', newToday: 0, log: {} }; try { await RC.clear('cards'); await RC.clear('meta'); } catch (e) {} toast('Recall progress reset'); renderSettings(); }
    },
    day: function (el) { openDaily(el.dataset.day); },
    cards: async function (el) {
      var n = notes.get(el.dataset.id); if (!n) return;
      var s = recallStats(n.id);
      var a = await sheet({ title: s.total + ' Recall card' + (s.total === 1 ? '' : 's'), message: (s.due ? s.due + ' to review now' : 'None due right now') + ' \u00b7 lines with :: or {{c::}} in this note', actions: [{ label: s.due ? 'Review ' + s.due + ' now' : 'Practice all ' + s.total, value: 'rev', icon: I.recall }, { label: 'Export CSV for Synapse', value: 'csv', icon: I.copy }] });
      if (a === 'rev') { rv = null; go('#/review/' + encodeURIComponent(n.id) + (s.due ? '' : '/practice')); }
      else if (a === 'csv') exportCards(n);
    },
    allcards: function () { exportCards(null); },
    sclear: function () { var i = $('#sq'); i.value = ''; i.dispatchEvent(new Event('input')); i.focus(); },
    screate: function (el) { var t = createName(el.dataset.q); if (!t) return; var n = createNote({ title: uniqueTitle(t), folder: '', body: '' }); go('#/n/' + n.id); startEditing(n, false); },
    fs: function (el) { settings.fs = +el.dataset.v; saveSettings(); renderSettings(); },
    accent: function (el) { settings.accent = el.dataset.v; saveSettings(); renderSettings(); },
    export: exportVault,
    gotasks: function () { go('#/tasks'); },
    tasksdone: function () { ui.tasksDone = !ui.tasksDone; renderTasks(); },
    bksnooze: function () { settings.backupSnooze = Date.now(); saveSettings(); render(); toast('I\u2019ll remind you in a week'); },
    import: function () { $('#file').click(); },
    wipe: async function () {
      var ok = await dialog({ title: 'Delete all ' + notes.size + ' notes?', message: 'Every note, folder and the Trash on this device will be erased for good. Export first if you want a copy.' + (syOn() ? ' This device also logs out of cloud sync; the cloud copy is kept.' : ''), ok: 'Delete all', danger: true });
      if (!ok) return;
      if (syOn()) syForget();
      notes.clear(); folders.clear(); trash.clear(); rebuildIdx(); ui.lastNote = null; ui.open = {};
      await DB.clear('notes'); await DB.clear('folders'); saveMeta();
      rc.clear(); try { await RC.clear('cards'); } catch (e) {}
      try { await IMG.clear(); } catch (e) {}
      try { await HIST.clear(); } catch (e) {}
      Object.keys(imgURL).forEach(function (i) { URL.revokeObjectURL(imgURL[i]); delete imgURL[i]; });
      toast('Vault erased'); renderSettings();
    }
  };

  /* swipe a note row to the right to delete it (goes to Trash, with Undo) */
  var sw = null, swOpen = null, swDone = 0;
  function swRow(t) { return t.closest('.rows>[data-act=open][data-id], .nl[data-act=open][data-id]'); }
  function swWrap(row) {
    if (row.parentNode.classList.contains('swwrap')) return row.parentNode;
    var w = document.createElement('div'); w.className = 'swwrap';
    row.parentNode.insertBefore(w, row); w.appendChild(row);
    w.insertAdjacentHTML('afterbegin', '<div class="swbg"><button type="button" class="swdel">' + I.trash + '<span>Delete</span></button></div>');
    return w;
  }
  function swUnwrap(w) { if (!w || !w.parentNode) return; var row = w.querySelector('[data-act=open]'); if (row) { row.style.transform = ''; row.style.transition = ''; w.parentNode.insertBefore(row, w); } w.remove(); }
  function swClose(now) {
    var w = swOpen; swOpen = null; if (!w) return;
    var row = w.querySelector('[data-act=open]'); if (!row) { swUnwrap(w); return; }
    row.style.transition = now ? '' : 'transform .18s ease'; row.style.transform = '';
    setTimeout(function () { swUnwrap(w); }, now ? 0 : 190);
  }
  function swDelete(w, row) {
    var n = notes.get(row.dataset.id); if (!n) { swClose(true); return; }
    swOpen = null;
    row.style.transition = 'transform .16s ease, opacity .16s'; row.style.transform = 'translateX(' + (row.offsetWidth + 20) + 'px)'; row.style.opacity = '0';
    w.style.transition = 'height .18s ease .1s, opacity .18s'; w.style.height = w.offsetHeight + 'px';
    requestAnimationFrame(function () { w.style.height = '0px'; w.style.opacity = '0'; w.style.overflow = 'hidden'; });
    var bl = backlinks(n).length;
    trashNote(n); swDone = Date.now();
    setTimeout(function () {
      render();
      toast('Moved \u201c' + (n.title.length > 24 ? n.title.slice(0, 22) + '\u2026' : n.title) + '\u201d to Trash', { label: 'Undo', fn: function () { if (trash.has(n.id)) { restoreNote(n); render(); toast('Restored'); } } });
    }, 220);
  }
  viewEl.addEventListener('pointerdown', function (e) {
    if (editing || e.button > 0 || e.pointerType === 'mouse' && e.buttons !== 1) { return; }
    var row = swRow(e.target);
    if (swOpen && (!row || row.parentNode !== swOpen)) swClose(false);
    if (!row || e.target.closest('.swdel')) { sw = null; return; }
    sw = { row: row, x: e.clientX, y: e.clientY, on: false, id: e.pointerId, w: row.parentNode.classList.contains('swwrap') ? row.parentNode : null, base: row.parentNode.classList.contains('swwrap') ? 100 : 0 };
  });
  viewEl.addEventListener('pointermove', function (e) {
    if (!sw || e.pointerId !== sw.id) return;
    var dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (!sw.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
      if (dx + sw.base < 14) return;
      sw.on = true; lpCancel(); lastTap = null;
      sw.w = swWrap(sw.row); sw.row.style.transition = 'none';
      try { sw.row.setPointerCapture(e.pointerId); } catch (x) {}
    }
    var d = Math.max(0, dx + sw.base), W = sw.row.offsetWidth, full = Math.min(W * 0.55, 190);
    if (d > full) d = full + (d - full) * 0.35;
    sw.row.style.transform = 'translateX(' + d + 'px)';
    sw.w.classList.toggle('far', dx + sw.base >= full);
    sw.d = dx + sw.base;
    e.preventDefault();
  });
  function swEnd(e) {
    if (!sw || (e && e.pointerId !== sw.id)) return;
    var s = sw; sw = null;
    if (!s.on) return;
    var W = s.row.offsetWidth, full = Math.min(W * 0.55, 190), d = s.d || 0;
    s.row.style.transition = 'transform .18s ease';
    if (e && e.type === 'pointercancel') { d = 0; }
    if (d >= full) { swOpen = s.w; swDelete(s.w, s.row); }
    else if (d >= 56) { swOpen = s.w; s.row.style.transform = 'translateX(100px)'; }
    else { swOpen = s.w; swClose(false); }
    swDone = Date.now();
  }
  viewEl.addEventListener('pointerup', swEnd);
  viewEl.addEventListener('pointercancel', swEnd);
  viewEl.addEventListener('click', function (e) {
    var del = e.target.closest('.swdel');
    if (del) { e.preventDefault(); e.stopPropagation(); var w = del.closest('.swwrap'), row = w && w.querySelector('[data-act=open]'); if (row) swDelete(w, row); return; }
    if (Date.now() - swDone < 400 && e.target.closest('[data-act=open]')) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* press and hold: notes -> actions, [[links]] -> preview */
  var lp = null, lpFired = 0;
  function lpTarget(t) { return t.closest('a.wl:not([data-noop])') || t.closest('[data-act=open][data-id]'); }
  viewEl.addEventListener('pointerdown', function (e) {
    if (editing || e.button > 0) return;
    var t = lpTarget(e.target); if (!t) return;
    var x = e.clientX, y = e.clientY;
    clearTimeout(lp && lp.timer);
    lp = { t: t, x: x, y: y, timer: setTimeout(function () { lpFire(t); }, 480) };
  });
  function lpCancel() { if (lp) { clearTimeout(lp.timer); lp = null; } }
  viewEl.addEventListener('pointermove', function (e) { if (lp && (Math.abs(e.clientX - lp.x) > 9 || Math.abs(e.clientY - lp.y) > 9)) lpCancel(); });
  viewEl.addEventListener('pointerup', lpCancel);
  viewEl.addEventListener('pointercancel', lpCancel);
  viewEl.addEventListener('scroll', lpCancel, { passive: true });
  viewEl.addEventListener('contextmenu', function (e) { var t = lpTarget(e.target); if (!t || editing) return; e.preventDefault(); lpCancel(); lpFire(t); });
  function lpFire(t) {
    lp = null; lpFired = Date.now();
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {}
    if (t.matches('a.wl')) { showPeek(t.dataset.wl, t.dataset.h); return; }
    var n = notes.get(t.dataset.id); if (n) rowMenu(n);
  }
  /* double-tap a block in a note to edit right there */
  var lastTap = null;
  function tapEdit(e) {
    var prose = e.target.closest('#prose'); if (!prose || editing) return false;
    if (e.target.closest('a,button,input,label,summary,.cb')) return false;
    var blk = e.target.closest('#prose > [data-l]'); if (!blk) return false;
    var now = Date.now();
    if (lastTap && now - lastTap.t < 380 && lastTap.el === blk) {
      lastTap = null;
      var n = notes.get(route().id); if (!n) return false;
      var off = blk.getBoundingClientRect().top - viewEl.getBoundingClientRect().top;
      var L = +blk.dataset.l, lines = n.body.split('\n');
      var endL = blk.tagName === 'P' ? Math.min(lines.length - 1, L + blk.querySelectorAll(':scope > br').length) : L;
      startEditing(n, false, { line: blk.tagName === 'P' ? endL : L, offset: off + (blk.tagName === 'P' ? blk.offsetHeight - 24 : 0) });
      return true;
    }
    lastTap = { t: now, el: blk };
    return false;
  }
  /* pull down on Notes to open the quick switcher */
  var pull = null;
  viewEl.addEventListener('touchstart', function (e) { if (route().v !== 'vault' || editing || viewEl.scrollTop > 0 || e.touches.length > 1) { pull = null; return; } pull = { y: e.touches[0].clientY, d: 0 }; }, { passive: true });
  viewEl.addEventListener('touchmove', function (e) {
    if (!pull) return;
    pull.d = e.touches[0].clientY - pull.y;
    var ph = $('#pullhint'); if (ph) { ph.style.opacity = Math.min(1, Math.max(0, (pull.d - 20) / 60)); ph.classList.toggle('ready', pull.d > 80); }
  }, { passive: true });
  viewEl.addEventListener('touchend', function () {
    if (!pull) return;
    var d = pull.d; pull = null;
    var ph = $('#pullhint'); if (ph) { ph.style.opacity = 0; ph.classList.remove('ready'); }
    if (d > 80 && viewEl.scrollTop <= 0) openSwitcher();
  });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openSwitcher(); return; }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && !qsOpen) {
      var k = e.key.toLowerCase(), r = route(), cur = r.v === 'note' && notes.get(r.id);
      if (k === 'n') { e.preventDefault(); newNote(r.v === 'folder' ? r.path : (cur ? cur.folder : '')); return; }
      if (k === 'f' && cur) { e.preventDefault(); if (editing) openFindReplace($('#ed')); else openFind(cur); return; }
      if (k === 'e' && cur) { e.preventDefault(); if (editing) stopEditing(false); else startEditing(cur, false); return; }
      if (k === 'd' && !editing) { e.preventDefault(); openDaily(); return; }
      if (k === 'g' && !editing) { e.preventDefault(); go('#/graph'); return; }
      if (k === 's' && editing) { e.preventDefault(); var ed = $('#ed'); if (ed) { editing.n.body = ed.value; touchIfChanged(editing.n); toast('Saved'); } return; }
      if (k === 'p' && cur) { e.preventDefault(); togglePin(cur); if (!editing) renderNote(cur.id); return; }
      if (k === 'o' && !editing) { e.preventDefault(); openSwitcher(); return; }
    }
    if (route().v === 'review' && rv && rv.q.length && !qsOpen && !e.metaKey && !e.ctrlKey) {
      if ((e.key === ' ' || e.key === 'Enter') && !rv.shown) { e.preventDefault(); rv.shown = true; drawReview(); }
      else if (rv.shown && /^[123]$/.test(e.key)) { e.preventDefault(); rate(rv.mode === 'practice' ? (e.key === '1' ? 'again' : 'good') : ['again', 'good', 'easy'][+e.key - 1]); }
    }
  });

  act.ftab = function (el) {
    /* switching between tabs replaces the page, so Back from any tab returns to Notes (All) */
    var p = el.dataset.path, inTab = route().v === 'folder';
    if (!p) { go('#/'); return; }
    go('#/f/' + encodeURIComponent(p), inTab);
  };
  act.getpro = function (el) { openPro(el && el.dataset.what || ''); };
  (function () {
    var PA = { fromtmpl: 'Templates', today: 'Daily notes', calendar: 'Daily notes', day: 'Daily notes', gorecall: 'Recall', gotasks: 'Tasks', dailytmpl: 'Templates', accent: 'Accent colors', allcards: 'Flashcard export', cards: 'Flashcard export', autolink: 'Auto-link', sysignup: 'Cloud sync', usetmpl: 'Templates' };
    Object.keys(PA).forEach(function (k) { var f0 = act[k]; if (f0) act[k] = function (el, e) { if (!proOk(PA[k])) return; return f0(el, e); }; });
  })();
  viewEl.addEventListener('click', function (e) {
    if (Date.now() - lpFired < 700) { e.preventDefault(); e.stopPropagation(); return; }
    var fh = e.target.closest('#prose > h1, #prose > h2, #prose > h3, #prose > h4, #prose > h5, #prose > h6');
    if (fh && !editing && !e.target.closest('a') && (fh.classList.contains('folded') || e.clientX > fh.getBoundingClientRect().right - 48)) { e.preventDefault(); lastTap = null; foldHeading(fh); return; }
    var fn = e.target.closest('a[data-fn]');
    if (fn) { e.preventDefault(); var t = document.getElementById('fn-' + MD.slug(fn.dataset.fn)); if (t) t.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    if (tapEdit(e)) return;
    var wl = e.target.closest('a.wl');
    if (wl) {
      e.preventDefault();
      if (wl.dataset.noop) return;
      var r = route(), from = r.v === 'note' ? notes.get(r.id) : null;
      openLink(wl.dataset.wl, wl.dataset.h, from);
      return;
    }
    var tg = e.target.closest('.tag[data-tag]');
    if (tg && !editing) { go('#/search/' + encodeURIComponent('#' + tg.dataset.tag)); return; }
    var el = e.target.closest('[data-act]');
    if (el && act[el.dataset.act]) { e.preventDefault(); act[el.dataset.act](el, e); }
  });
  viewEl.addEventListener('change', function (e) {
    var cb = e.target.closest('input[type=checkbox][data-line]');
    if (!cb) return;
    var r = route(), n = notes.get(cb.dataset.nid || r.id); if (!n) return;
    var lines = n.body.split('\n'), i = +cb.dataset.line;
    if (lines[i] === undefined) return;
    lines[i] = lines[i].replace(/^(\s*(?:>\s*)*(?:[-*+]|\d+[.)])\s+)\[( |x|X)\]/, function (m, p, s) { return p + (s === ' ' ? '[x]' : '[ ]'); });
    n.body = lines.join('\n'); touch(n);
    var li = cb.closest('li'); if (li) li.classList.toggle('done', cb.checked);
    if (r.v === 'tasks') { var eb = viewEl.querySelector('.eyebrow'); if (eb) eb.textContent = openTaskCount() + ' open'; }
  });
  document.querySelectorAll('.tb').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.tab;
      var target = { notes: '#/', graph: '#/graph', search: '#/search', settings: '#/settings', discover: '#/discover' }[t];
      if (t === 'notes' && route().v === 'vault') { viewEl.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      go(target);
    });
  });
  (function () {
    var fab = $('#fab'), t = null, fired = 0;
    fab.addEventListener('pointerdown', function () { clearTimeout(t); t = setTimeout(async function () {
      fired = Date.now();
      var a = await sheet({ actions: [{ label: 'New note', value: 'n', icon: I.newnote }, { label: proTag('New from template'), value: 't', icon: I.tmpl }, { label: proTag('Today\u2019s note'), value: 'd', icon: I.cal.replace(' class="fi"', '') }, { label: proTag('Jot to today\u2019s note'), value: 'j', icon: I.edit }, { label: 'New folder', value: 'f', icon: I.newfolder }], left: true });
      if (a === 'n') newNote(); else if (a === 't') newFromTemplate(); else if (a === 'd') openDaily(); else if (a === 'j') jot(); else if (a === 'f') newFolder('');
    }, 450); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { fab.addEventListener(ev, function () { clearTimeout(t); }); });
    fab.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    fab.addEventListener('click', function () { if (Date.now() - fired < 800) return; newNote(); });
  })();
  document.addEventListener('visibilitychange', function () { if (document.hidden && editing) { var ed = $('#ed'); if (ed) editing.n.body = ed.value; touchIfChanged(editing.n); } });
  window.addEventListener('pagehide', function () { if (editing) { var ed = $('#ed'); if (ed) editing.n.body = ed.value; touchIfChanged(editing.n); } });


  /* ---------- Axon Pro ($35, one time) ----------
     Free: writing and editing notes, folders, search, [[links]] and backlinks, Markdown, Trash, import and backups.
     Pro: cloud sync, History (restore, merge), Graph, Templates, Daily notes, Recall, Discover, Tasks, accent colors,
     auto-link and flashcard export. A device that had Axon before Pro existed keeps all of it (grandfathered). Accounts get
     Pro from the sync server, which is also where sync itself is checked. Nothing here hides, locks or deletes a note. */
  var PRO = { grand: false, acct: '', need: false, req: null };
  /* Northpeak All-Access ($100 lifetime, every Northpeak app). Synapse holds the license codes; the two servers pass signed
     notes through this app (they can't call each other directly), so an All-Access request shows on both admin lists. */
  var NP_SYNAPSE = 'https://odin-cards.sites.tab.bot';
  var NP_PLANS = { axon_pro: { name: 'Axon Pro', price: '$35', one: 'one time \u00b7 yours for good', sub: 'Axon, one time' },
    all_access: { name: 'Northpeak All-Access', price: '$100', one: 'lifetime \u00b7 Axon, Synapse and every future Northpeak app', sub: 'every Northpeak app, lifetime' } };
  function npHop(j, n) {
    n = n || 0; if (!j || !j.relay || n > 3 || j.relay.to !== 'synapse') return Promise.resolve(j);
    return fetch(NP_SYNAPSE + j.relay.path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ m: j.relay.m, sig: j.relay.sig }), credentials: 'omit' })
      .then(function (r) { return r.json(); }).then(function (k) { if (k && k.relay && k.relay.to === 'axon') return AXS.api(k.relay.path, { body: { m: k.relay.m, sig: k.relay.sig } }).catch(function () { return null; }); return k; }).catch(function () { return null; });
  }
  var LOCK = '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/></svg>';
  function isPro() { return !!(PRO.grand || PRO.acct); }
  function savePro() { DB.put('meta', { k: 'pro', v: PRO }).catch(function () {}); }
  function proOk(what) { if (isPro()) return true; openPro(what); return false; }
  function proTag(label) { return isPro() ? label : label + ' \u00b7 Pro'; }
  function proFromServer(on, req) {
    var was = isPro();
    if (req !== undefined) PRO.req = req ? Object.assign({}, PRO.req || {}, req) : null;
    if (on) { if (sy.user) PRO.acct = sy.user; PRO.need = false; }
    else { if (PRO.acct && PRO.acct === sy.user) PRO.acct = ''; PRO.need = true; }
    savePro();
    if (was !== isPro()) proChanged();
  }
  function proChanged() { proTabs(); if (!editing && !openOverlays.length) render(); }
  function proTabs() {
    document.querySelectorAll('.tb[data-tab=graph] span, .tb[data-tab=discover] span').forEach(function (sp) {
      var l = sp.querySelector('.tlock');
      if (isPro()) { if (l) l.remove(); } else if (!l) sp.insertAdjacentHTML('beforeend', '<i class="tlock">' + LOCK + '</i>');
    });
  }
  var proLast = 0;
  async function proCheck(force) {
    if (!syOn() || !window.AXS) return null;
    if (!force && Date.now() - proLast < 45000) return null;
    proLast = Date.now();
    try {
      var j = await AXS.api('/api/me', { token: sy.token }), had = PRO.need && !isPro() || PRO.need;
      if ((j.allAccess || null) !== (PRO.aa || null)) { PRO.aa = j.allAccess || null; savePro(); }
      proFromServer(!!j.pro, j.request || null);
      if (j.pro && had) { toast('Axon Pro is on. Thank you!'); syncNow(false); }
      if (route().v === 'settings' && !openOverlays.length) renderSettings();
      return j;
    } catch (e) { return null; }
  }
  var PRO_VIEWS = {
    graph: ['Graph', 'See how all your notes connect, or just the web around one note.'],
    today: ['Daily notes', 'A note for every day, with a calendar and quick jots.'],
    recall: ['Recall', 'Turn lines like question :: answer into flashcards with spaced review and streaks.'],
    review: ['Recall', 'Turn lines like question :: answer into flashcards with spaced review and streaks.'],
    tasks: ['Tasks', 'Every checkbox from every note in one list.'],
    discover: ['Discover', 'Find links you haven\u2019t made yet and read more about your topics.']
  };
  function renderLocked(v) {
    var x = PRO_VIEWS[v];
    viewEl.innerHTML = '<div class="page prolock"><div class="plk">' + LOCK + '</div><h2>' + esc(x[0]) + ' is part of Axon Pro</h2><p>' + esc(x[1]) + '</p>' +
      '<button class="bignew" data-act="getpro" data-what="' + esc(x[0]) + '"><span>See Axon Pro \u00b7 $35</span></button>' +
      '<p class="pfine">Writing, folders, links and search are free, and nothing you\u2019ve written is ever locked.</p></div>';
  }
  var PRO_LIST = [['Cloud sync', 'your notes on every device, end-to-end encrypted'], ['History', 'every version of a note, restore and merge'], ['Graph', 'the whole vault and each note\u2019s local web'],
    ['Templates and Daily notes', 'with a calendar and quick jots'], ['Recall', 'flashcards, spaced review and streaks'], ['Discover and Tasks', 'missing links, topics, every checkbox in one list'],
    ['Accent colors, auto-link, flashcard export', 'and every Pro feature added later']];
  async function openPro(what) {
    var tt = $('#toast'); if (tt) tt.classList.remove('show');
    var mode = '', msg = '', f = { name: (PRO.req && PRO.req.name) || '', phone: (PRO.req && PRO.req.phone) || '' };
    var plan = (PRO.aa || (PRO.req && PRO.req.plan === 'all_access')) ? 'all_access' : 'axon_pro', code = '';
    await overlay(function (done) {
      var el = document.createElement('div'); el.className = 'mergev prov'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Axon Pro');
      function waiting() { return PRO.req && PRO.req.status === 'new' && syOn() && mode !== 'edit'; }
      function paint() {
        var h = '<div class="mvh"><button data-p="close">Close</button><b>Axon Pro</b><span class="pgap"></span></div><div class="mvbody pbody">';
        var P = NP_PLANS[plan];
        h += '<div class="phero"><div class="pprice">' + P.price + '</div><div class="pone">' + P.one + '</div>' + (what && !isPro() ? '<p class="pwhy"><b>' + esc(what) + '</b> is part of Axon Pro.</p>' : '') + '</div>';
        if (isPro() && !(PRO.grand && !PRO.acct && syOn() && PRO.need)) {
          h += '<div class="pbox pon"><b>Axon Pro is on' + '</b><p>' + (PRO.acct ? 'It\u2019s on your account <b>' + esc(PRO.acct) + '</b>, so it works on every device you log in on.' : 'This device had Axon before Pro existed, so it keeps every Pro feature for good.') + '</p></div>';
          if (PRO.aa) h += '<div class="pbox pon"><b>Northpeak All-Access</b><p>Your code <b class="pcode">' + esc(PRO.aa) + '</b> unlocks every Northpeak app. In Synapse, open <b>Settings \u203a Synapse Pro \u203a Have an unlock code?</b> and enter it.</p></div>';
        }
        if (!isPro() || (PRO.grand && !PRO.acct && syOn() && PRO.need)) {
          if (waiting()) {
            h += '<div class="pbox psent"><b>' + I.check + 'Request sent</b><p>Watch Messages for an Apple Cash request for <b>' + ((PRO.req && PRO.req.plan === 'all_access') ? '$100' : '$35') + '</b>' + ((PRO.req && PRO.req.plan === 'all_access') ? ' (Northpeak All-Access)' : '') + ' from Northpeak Studios' + (PRO.req.phone ? ' at <b>' + esc(PRO.req.phone) + '</b>' : '') + '. Pro turns on by itself once it\u2019s paid, on every device logged in as <b>' + esc(sy.user) + '</b>.</p>' +
              '<div class="pbtns"><button class="pmain" data-p="check">Check now</button><button data-p="edit">Change details</button></div>' + (msg ? '<div class="perr">' + esc(msg) + '</div>' : '') + '</div>';
          } else if (mode === 'code') {
            h += '<div class="pbox"><b>Have an All-Access code?</b><p>Bought Northpeak All-Access in Synapse? Enter the code (SYN-XXXX-XXXX) and Axon Pro turns on' + (syOn() ? ' for <b>' + esc(sy.user) + '</b>.' : '. Next you\u2019ll pick a username and password, so it works on all your devices.') + '</p>' +
              '<input name="pcode" placeholder="SYN-XXXX-XXXX" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="go" value="' + esc(code) + '">' +
              (msg ? '<div class="perr">' + esc(msg) + '</div>' : '') +
              '<div class="pbtns"><button class="pmain" data-p="redeem">Unlock</button><button data-p="back">Back</button></div></div>';
          } else {
            h += '<div class="pplans" role="radiogroup" aria-label="Plan">' + ['axon_pro', 'all_access'].map(function (k) { var x = NP_PLANS[k]; return '<button class="pplan' + (plan === k ? ' on' : '') + '" role="radio" aria-checked="' + (plan === k) + '" data-p="plan" data-plan="' + k + '"><b>' + x.name + '</b><span>' + x.price + ' \u00b7 ' + x.sub + '</span></button>'; }).join('') + '</div>';
            h += '<div class="pbox"><b>Get ' + esc(P.name) + '</b><p>No card needed. Send your name and phone number and Northpeak Studios sends you an <b>Apple Cash request for ' + P.price + '</b> in Messages. Once it\u2019s paid, Pro turns on by itself' + (plan === 'all_access' ? ', and you get one code that unlocks Synapse too' : '') + '.</p>' +
              '<input name="pname" placeholder="Your name" autocomplete="name" enterkeyhint="next" value="' + esc(f.name) + '">' +
              '<input name="pphone" type="tel" placeholder="Phone number for Apple Cash" autocomplete="tel" inputmode="tel" enterkeyhint="go" value="' + esc(f.phone) + '">' +
              '<p class="pnote">' + (syOn() ? 'Pro goes on your account <b>' + esc(sy.user) + '</b>.' : 'Next you\u2019ll pick a username and password. Pro goes on that account, so you can log in and use it on all your devices.') + '</p>' +
              (msg ? '<div class="perr">' + esc(msg) + '</div>' : '') +
              '<div class="pbtns"><button class="pmain" data-p="send">' + (syOn() ? 'Send request' : 'Continue') + '</button></div>' +
              (syOn() ? '' : '<button class="plink" data-p="login">Bought Pro already? Log in</button>') + '<button class="plink" data-p="code">Have an All-Access code?</button></div>';
          }
        }
        h += '<ul class="plist">' + PRO_LIST.map(function (x) { return '<li>' + I.check + '<span><b>' + esc(x[0]) + '</b>' + esc(x[1]) + '</span></li>'; }).join('') + '</ul>';
        h += '<p class="pfree">Free for everyone: writing and editing notes, folders, [[links]] and backlinks, search, Markdown, Trash, import and backups. Nothing you\u2019ve written is ever locked.</p>';
        el.innerHTML = h + '</div>';
      }
      async function send() {
        f.name = ($('[name=pname]', el).value || '').trim().replace(/\s+/g, ' '); f.phone = ($('[name=pphone]', el).value || '').trim();
        if (f.name.length < 2) { msg = 'Type your name.'; paint(); return; }
        if (f.phone.replace(/\D/g, '').length < 7 || !/^[+\d\s().-]+$/.test(f.phone)) { msg = 'Type a phone number that can get Apple Cash.'; paint(); return; }
        msg = '';
        if (!syOn()) { var ok = await syAuth('signup', { forPro: true }); if (!ok) { paint(); return; } if (isPro() && PRO.acct) { paint(); return; } }
        var b = $('[data-p=send]', el); if (b) { b.disabled = true; b.textContent = 'Sending\u2026'; }
        try {
          var r = await AXS.api('/api/pro/request', { token: sy.token, body: { name: f.name, phone: f.phone, username: sy.user, plan: plan } });
          PRO.req = { id: r.id, status: 'new', name: f.name, phone: f.phone, plan: plan, at: Date.now() }; savePro(); mode = '';
          npHop(r);
        } catch (e) {
          msg = e.offline ? 'You\u2019re offline. Connect and try again.' : e.message === 'slow_down' ? 'Too many requests from here. Try again later.' : e.message === 'bad_phone' ? 'That phone number doesn\u2019t look right.' : 'That didn\u2019t go through (' + e.message + '). Try again.';
        }
        paint();
      }
      el.addEventListener('click', async function (e) {
        var b = e.target.closest('[data-p]'); if (!b) return;
        var p = b.dataset.p;
        if (p === 'close') done(null);
        else if (p === 'send') send();
        else if (p === 'edit') { mode = 'edit'; msg = ''; paint(); }
        else if (p === 'plan') { plan = b.dataset.plan === 'all_access' ? 'all_access' : 'axon_pro'; msg = ''; var nm = $('[name=pname]', el), ph = $('[name=pphone]', el); if (nm) f.name = nm.value; if (ph) f.phone = ph.value; paint(); }
        else if (p === 'code') { mode = 'code'; msg = ''; paint(); }
        else if (p === 'back') { mode = ''; msg = ''; paint(); }
        else if (p === 'redeem') redeem();
        else if (p === 'login') { var ok = await syAuth('login', { forPro: true }); if (ok) { await proCheck(true); } paint(); }
        else if (p === 'check') { b.disabled = true; b.textContent = 'Checking\u2026'; var j = await proCheck(true); msg = !j ? 'Couldn\u2019t check (offline?). Try again.' : j.pro ? '' : j.request && j.request.status === 'declined' ? 'This request was declined. Change your details to send a new one.' : 'Not marked paid yet. It turns on by itself once it is.'; paint(); }
      });
      async function redeem() { // an All-Access code: Synapse signs a yes, this account's Pro turns on
        code = ($('[name=pcode]', el).value || '').trim().toUpperCase();
        if (code.replace(/[^0-9A-Z]/g, '').replace(/^SYN/, '').length !== 8) { msg = 'Type the whole code, like SYN-AB12-CD34.'; paint(); return; }
        msg = '';
        if (!syOn()) { var ok = await syAuth('signup', { forPro: true }); if (!ok) { paint(); return; } }
        var bt = $('[data-p=redeem]', el); if (bt) { bt.disabled = true; bt.textContent = 'Checking\u2026'; }
        var proof = {};
        try { var at = await fetch(NP_SYNAPSE + '/api/pro/link/attest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: code, app: 'axon' }), credentials: 'omit' }).then(function (x) { return x.json(); }); if (at && at.valid) proof = { m: at.m, sig: at.sig }; } catch (e) {}
        try {
          var r = await AXS.api('/api/pro/redeem', { token: sy.token, body: Object.assign({ code: code }, proof) });
          PRO.aa = r.code || code; savePro(); mode = ''; plan = 'all_access';
          await proCheck(true); if (r.pro) proFromServer(true);
          toast('Axon Pro is on. Thank you!'); syncNow(false);
        } catch (e) {
          msg = e.offline ? 'You\u2019re offline. Connect and try again.' : e.message === 'used' ? 'That code is already unlocking another Axon account.' : e.message === 'slow_down' ? 'Too many tries. Wait a bit and try again.' : e.message === 'bad_code' ? 'That isn\u2019t a Northpeak All-Access code. Check it and try again.' : 'That didn\u2019t go through (' + e.message + '). Try again.';
        }
        paint();
      }
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.name === 'pphone') { e.preventDefault(); send(); } else if (e.key === 'Enter' && e.target.name === 'pcode') { e.preventDefault(); redeem(); } else if (e.key === 'Enter' && e.target.name === 'pname') { e.preventDefault(); var ph = $('[name=pphone]', el); if (ph) ph.focus(); } });
      paint();
      return el;
    });
    if (route().v === 'settings' && !openOverlays.length) renderSettings();
  }

  /* ---------- boot ---------- */
  async function boot() {
    try {
      await DB.open();
      var ns = await DB.all('notes'), fs = await DB.all('folders'), meta = await DB.all('meta');
      ns.forEach(function (n) { if (n.trashed) trash.set(n.id, n); else notes.set(n.id, n); });
      fs.forEach(function (f) { folders.add(f.path); });
      var m = {}; meta.forEach(function (x) { m[x.k] = x.v; });
      if (m.settings) settings = Object.assign(settings, m.settings);
      if (m.ui) ui = Object.assign(ui, m.ui);
      if (m['autolink-backup'] && m['autolink-backup'].notes) alBackup = m['autolink-backup'];
      /* the first run of a version with Pro: a device that already had Axon (notes, folders, settings or sync) is grandfathered */
      if (m.pro) PRO = Object.assign(PRO, m.pro);
      else { PRO.grand = !!(ns.length || fs.length || m.settings || m.ui || m.sync || m.seeded || m.starterRemoved); PRO.since = Date.now(); savePro(); }
      try { await syLoad(m); } catch (e) {}
      rebuildIdx();
      if (m.seeded && !m.starterRemoved) { removeOldStarter(); }
      if (!m.starterRemoved) DB.put('meta', { k: 'starterRemoved', v: Date.now() });
    } catch (err) {
      viewEl.innerHTML = '<div class="empty"><b>Storage is blocked</b>Axon keeps notes in this browser\u2019s storage. Private browsing can block it. (' + esc(err && err.message || err) + ')</div>';
      return;
    }
    try { purgeTrash(false); } catch (e) {}
    try {
      (await RC.all('cards')).forEach(function (s) { rc.set(s.id, s); });
      var rm = await RC.all('meta'); rm.forEach(function (x) { if (x.k === 'stats' && x.v) rcMeta = Object.assign(rcMeta, x.v); });
      rcMeta.log = rcMeta.log || {};
      cleanRecall();
    } catch (e) {}
    applySettings();
    render(); proTabs();
    if (syOn()) setTimeout(function () { if (PRO.need) proCheck(true); else syncNow(false); }, 1500);
    window.addEventListener('online', function () { sySoon(800); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && syOn()) { if (PRO.need) proCheck(false); else if (Date.now() - sy.last > 20000) sySoon(600); } });
    setInterval(function () { if (!document.hidden && syOn()) { if (PRO.need) proCheck(false); else syncNow(false); } }, 120000);
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      /* a home-screen app is usually resumed, not reopened, so a new version would wait for a swipe-close.
         Check for one each time Axon comes back; once it has landed, reload on the next return (never mid-edit). */
      var hadCtl = !!navigator.serviceWorker.controller, swReg = null, swReady = false, swReloading = false, hiddenAt = Date.now();
      navigator.serviceWorker.register('sw.js').then(function (r) { swReg = r; }).catch(function () {});
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!hadCtl || swReloading) { hadCtl = true; return; }
        swReady = true;
        if (!editing) toast('A new version of Axon is ready', { label: 'Reload', fn: function () { swReloading = true; location.reload(); } });
      });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { hiddenAt = Date.now(); return; }
        if (swReady && !editing && !openOverlays.length && route().v !== 'review') { swReloading = true; location.reload(); return; }
        if (swReg && Date.now() - hiddenAt > 30000) swReg.update().catch(function () {});
      });
    }
  }
  window.__axon = { notes: notes, folders: folders, trash: trash, rc: rc, recallStats: recallStats, byTitle: byTitle, backlinks: backlinks, renameNote: renameNote, exportFiles: function () { return notes; }, Zip: Zip, importFiles: importFiles };
  boot();
})();
