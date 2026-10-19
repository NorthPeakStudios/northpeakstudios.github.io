/* Axon · Northpeak Studios · v1.0 */
(function () {
  'use strict';
  var VERSION = '1.0';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var esc = MD.esc;
  var viewEl = $('#view'), layer = $('#layer');
  var notes = new Map(), folders = new Set(), titleIdx = new Map();
  var settings = { fs: 17, accent: '#ff6a3d' };
  var ui = { open: {}, lastNote: null, graphMode: 'global', graphTags: false };
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
    fit: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    zin: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>',
    zout: '<svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
    check: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M8 12.5l2.8 2.8L16.5 9"/></svg>',
    quote: '<svg viewBox="0 0 24 24"><path d="M5 18V6M10 8h9M10 12h9M10 16h6"/></svg>'
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
  function countIn(p) { var c = 0; notes.forEach(function (n) { if (n.folder === p || n.folder.indexOf(p + '/') === 0) c++; }); return c; }
  function childFolders(p) {
    return Array.from(folders).filter(function (f) { return parentOf(f) === p; }).sort(function (a, b) { return a.localeCompare(b); });
  }
  function notesIn(p) { return Array.from(notes.values()).filter(function (n) { return n.folder === p; }).sort(function (a, b) { return a.title.localeCompare(b.title); }); }
  function recent(k) { return Array.from(notes.values()).sort(function (a, b) { return b.updated - a.updated; }).slice(0, k || 1e9); }
  function snippetHTML(body, max) {
    max = max || 140;
    var lines = String(body || '').replace(/```[\s\S]*?(```|$)/g, '').split('\n').filter(function (l) { return l.trim() && !/^#{1,6}\s/.test(l) && !/^\s*\|?\s*:?-{2,}/.test(l); });
    var t = lines.join(' ').replace(/\s+/g, ' ').trim();
    if (!t) return '<span style="opacity:.6">Empty note</span>';
    return inlineSnippet(t.slice(0, max * 1.6), max);
  }
  function inlineSnippet(t, max) {
    var parts = [], last = 0, m, re = new RegExp(MD.WL.source, 'g'), len = 0, out = '';
    while ((m = re.exec(t))) { parts.push([t.slice(last, m.index), 0]); parts.push([(m[3] || m[1]).trim(), 1]); last = re.lastIndex; }
    parts.push([t.slice(last), 0]);
    for (var i = 0; i < parts.length && len < max; i++) {
      var s = parts[i][1] ? parts[i][0] : parts[i][0].replace(/^\s*>\s?(\[!\w+\]\s*)?/g, '').replace(/(^|\s)([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/g, '$1').replace(/[*_~=`>]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      if (len + s.length > max) s = s.slice(0, max - len) + '…';
      len += s.length;
      out += parts[i][1] ? '<em>' + esc(s) + '</em>' : esc(s);
    }
    return out;
  }
  function backlinkSnippet(src, title) {
    var re = new RegExp('\\[\\[\\s*' + escRe(title) + '\\s*(#[^\\]|\\n]*)?(\\|[^\\]\\n]*)?\\]\\]', 'i');
    var lines = String(src).split('\n');
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
  function persist() { try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {} }
  function saveMeta() { DB.put('meta', { k: 'ui', v: { open: ui.open, lastNote: ui.lastNote, graphMode: ui.graphMode, graphTags: ui.graphTags } }); }

  /* ---------- data ops ---------- */
  function ensureFolder(p) {
    if (!p) return [];
    var made = [], parts = p.split('/'), acc = '';
    parts.forEach(function (x) { acc = acc ? acc + '/' + x : x; if (!folders.has(acc)) { folders.add(acc); made.push({ path: acc }); } });
    if (made.length) DB.putMany('folders', made);
    return made;
  }
  function putNote(n) {
    var o = { id: n.id, title: n.title, folder: n.folder, body: n.body, created: n.created, updated: n.updated, seed: !!n.seed };
    return DB.put('notes', o);
  }
  function createNote(o) {
    var now = Date.now();
    var n = { id: uid(), title: o.title, folder: o.folder || '', body: o.body || '', created: o.created || now, updated: o.updated || now, seed: !!o.seed };
    ensureFolder(n.folder);
    notes.set(n.id, n); rebuildIdx();
    putNote(n); persist();
    return n;
  }
  function touch(n) { n.updated = Date.now(); n.seed = false; putNote(n); }
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
    n.title = newTitle; n.updated = Date.now(); n.seed = false;
    putNote(n); rebuildIdx();
    return { changed: changed };
  }
  function deleteNote(n) { notes.delete(n.id); rebuildIdx(); DB.del('notes', n.id); if (ui.lastNote === n.id) { ui.lastNote = null; saveMeta(); } }
  function moveNote(n, folder) { ensureFolder(folder); n.folder = folder; n.updated = Date.now(); putNote(n); }
  function renameFolder(p, name) {
    var np = (parentOf(p) ? parentOf(p) + '/' : '') + name;
    var oldF = Array.from(folders).filter(function (f) { return f === p || f.indexOf(p + '/') === 0; });
    var addF = oldF.map(function (f) { return np + f.slice(p.length); });
    oldF.forEach(function (f) { folders.delete(f); });
    addF.forEach(function (f) { folders.add(f); });
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
    DB.delMany('folders', oldF);
    var hit = Array.from(notes.values()).filter(function (n) { return n.folder === p || n.folder.indexOf(p + '/') === 0; });
    if (keepNotes) hit.forEach(function (n) { n.folder = par; putNote(n); });
    else { hit.forEach(function (n) { notes.delete(n.id); }); DB.delMany('notes', hit.map(function (n) { return n.id; })); rebuildIdx(); }
    saveMeta();
    return hit.length;
  }
  function seedVault() {
    var S = window.AXON_SEED, now = Date.now();
    var order = ['Dopamine pathways', 'Action potentials', 'Basal ganglia', 'Study plan', 'Welcome to Axon'];
    S.folders.forEach(ensureFolder);
    S.notes.forEach(function (s, i) {
      var r = order.indexOf(s.title);
      var t = r >= 0 ? now - [2, 60, 180, 600, 1440][r] * 60000 : now - (2 + i) * 86400000 - i * 3600000;
      createNote({ title: s.title, folder: s.folder, body: s.body, created: t, updated: t, seed: true });
    });
  }
  function clearSeed() {
    var hit = Array.from(notes.values()).filter(function (n) { return n.seed; });
    hit.forEach(function (n) { notes.delete(n.id); });
    DB.delMany('notes', hit.map(function (n) { return n.id; }));
    rebuildIdx();
    var seedF = window.AXON_SEED.folders.slice().sort(function (a, b) { return b.length - a.length; });
    var gone = [];
    seedF.forEach(function (f) {
      if (folders.has(f) && countIn(f) === 0 && childFolders(f).length === 0) { folders.delete(f); delete ui.open[f]; gone.push(f); }
    });
    DB.delMany('folders', gone);
    if (ui.lastNote && !notes.has(ui.lastNote)) ui.lastNote = null;
    saveMeta();
    return hit.length;
  }

  /* ---------- overlays ---------- */
  function overlay(build) {
    return new Promise(function (resolve) {
      var scrim = document.createElement('div'); scrim.className = 'scrim';
      var box = build(done);
      layer.appendChild(scrim); layer.appendChild(box);
      requestAnimationFrame(function () { scrim.classList.add('show'); box.classList.add('show'); });
      scrim.addEventListener('click', function () { done(null); });
      var closed = false;
      function done(v) {
        if (closed) return; closed = true;
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
      el.innerHTML = '<h4>' + esc(o.title) + '</h4>' + (o.message ? '<p>' + esc(o.message) + '</p>' : '') +
        (o.input ? '<input type="text" autocomplete="off" autocapitalize="sentences" spellcheck="false" enterkeyhint="done"><div class="err"></div>' : '') +
        '<div class="db"><button data-v="0">' + esc(o.cancel || 'Cancel') + '</button><button class="acc" data-v="1"' + (o.danger ? ' style="background:#ff5a52;border-color:#ff5a52"' : '') + '>' + esc(o.ok || 'OK') + '</button></div>';
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
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2200);
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
    return { v: 'vault' };
  }
  function setTab(t) { document.querySelectorAll('.tb').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === t); }); }

  function render() {
    if (currentHash !== null) scrollMem[currentHash] = viewEl.scrollTop;
    if (editing) stopEditing(true);
    if (graphCtl) { graphCtl.destroy(); graphCtl = null; }
    currentHash = location.hash;
    var r = route();
    viewEl.className = '';
    var tab = { vault: 'notes', folder: 'notes', note: 'notes', graph: 'graph', search: 'search', settings: 'settings' }[r.v];
    setTab(tab);
    if (r.v === 'vault') renderVault();
    else if (r.v === 'folder') renderFolder(r.path);
    else if (r.v === 'note') renderNote(r.id);
    else if (r.v === 'graph') renderGraph();
    else if (r.v === 'search') renderSearch(r.q);
    else if (r.v === 'settings') renderSettings();
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
    return '<button class="nl" data-act="open" data-id="' + n.id + '"><div class="t"><b>' + esc(n.title) + '</b><time>' + ago(n.updated) + '</time></div>' +
      '<div class="s">' + snippetHTML(n.body) + '</div>' + (showFolder && n.folder ? '<div class="f">' + esc(crumbOf(n.folder)) + '</div>' : '') + '</button>';
  }
  function renderVault() {
    var rootNotes = notesIn('');
    var h = '<div class="page"><div class="eyebrow">Vault · ' + notes.size + ' note' + (notes.size === 1 ? '' : 's') + '</div><h1 class="h1">Notes</h1>' +
      '<button class="searchbox" data-act="gosearch" style="width:100%;text-align:left">' + I.search + '<span style="flex:1;font-size:17px">Search ' + notes.size + ' notes</span></button>' +
      '<div class="sec"><span>Folders</span><span><button class="ib ico" aria-label="New folder" data-act="newfolder" data-path="" style="width:44px;height:36px;margin-right:-10px">' + I.newfolder + '</button></span></div><div class="rows">' + folderRows('', 0);
    rootNotes.forEach(function (n) {
      h += '<button class="row" data-act="open" data-id="' + n.id + '">' + I.doc + '<span class="nm">' + esc(n.title) + '</span><span class="chev">' + I.chev + '</span></button>';
    });
    if (!folders.size && !rootNotes.length) h += '<div class="empty"><b>An empty vault</b>Tap + to write your first note.</div>';
    h += '</div>';
    if (notes.size) {
      h += '<div class="sec"><span>Recent</span><button data-act="all">See all</button></div>';
      recent(6).forEach(function (n) { h += noteItem(n, false); });
    }
    viewEl.innerHTML = h + '</div>';
  }

  /* ---------- folder ---------- */
  function renderFolder(p) {
    var all = p === '*';
    if (!all && p && !folders.has(p)) { go('#/', true); return; }
    var title = all ? 'All notes' : (p ? folderName(p) : 'Vault');
    var backLabel = all || !parentOf(p) ? 'Notes' : folderName(parentOf(p));
    var h = '<div class="page"><div class="nav"><button class="back" data-act="back" data-to="' + (all || !parentOf(p) ? '#/' : '#/f/' + encodeURIComponent(parentOf(p))) + '">' + I.back + '<span>' + esc(backLabel) + '</span></button><div class="acts">' +
      (all ? '' : '<button class="ib" aria-label="New note here" data-act="newhere" data-path="' + esc(p) + '">' + I.newnote + '</button><button class="ib" aria-label="Folder options" data-act="foldermore" data-path="' + esc(p) + '">' + I.more + '</button>') +
      '</div></div><div class="crumb">' + (all ? 'sorted by last edit' : esc(crumbOf(p))) + '</div><h1 class="h1" style="margin-top:4px">' + esc(title) + '</h1>';
    if (all) {
      var r = recent();
      r.forEach(function (n) { h += noteItem(n, true); });
      if (!r.length) h += '<div class="empty"><b>No notes yet</b>Tap + to write one.</div>';
    } else {
      var subs = childFolders(p), ns = notesIn(p);
      if (subs.length) { h += '<div class="rows">'; subs.forEach(function (f) { h += '<button class="row" data-act="folder" data-path="' + esc(f) + '">' + I.folder + '<span class="nm">' + esc(folderName(f)) + '</span><span class="ct">' + countIn(f) + '</span><span class="chev">' + I.chev + '</span></button>'; }); h += '</div>'; }
      ns.forEach(function (n) { h += noteItem(n, false); });
      if (!subs.length && !ns.length) h += '<div class="empty"><b>Empty folder</b>Add a note with the button up top.</div>';
    }
    viewEl.innerHTML = h + '</div>';
  }

  /* ---------- note ---------- */
  function resolver(t) { return !!byTitle(t); }
  function renderNote(id, opts) {
    var n = notes.get(id);
    if (!n) { toast('That note no longer exists'); go('#/', true); return; }
    opts = opts || {};
    ui.lastNote = n.id; saveMeta();
    var tags = MD.tags(n.body), bl = backlinks(n), out = outNotes(n);
    var backTo = n.folder ? '#/f/' + encodeURIComponent(n.folder) : '#/';
    var h = '<div class="page"><div class="nav"><button class="back" data-act="back" data-to="' + backTo + '">' + I.back + '<span>' + esc(n.folder ? folderName(n.folder) : 'Notes') + '</span></button><div class="acts">' +
      '<button class="ib" aria-label="Edit" data-act="edit">' + I.edit + '</button>' +
      '<button class="ib" aria-label="Local graph" data-act="localgraph" data-id="' + n.id + '">' + I.graph + '</button>' +
      '<button class="ib" aria-label="Note options" data-act="notemore" data-id="' + n.id + '">' + I.more + '</button></div></div>' +
      '<div class="crumb">' + esc(crumbOf(n.folder)) + '</div><h1 class="ntitle">' + esc(n.title) + '</h1>' +
      '<div class="meta">' + tags.map(function (t) { return '<span class="tag" data-tag="' + esc(t) + '">#' + esc(t) + '</span>'; }).join('') +
      '<span>' + (tags.length ? '· ' : '') + 'edited ' + agoLong(n.updated) + ' · ' + words(n.body) + ' words</span></div>' +
      '<article class="prose" id="prose">' + (n.body.trim() ? MD.render(n.body, { resolve: resolver }) : '<p class="empty-note">Empty note. Tap the pencil to write.</p>') + '</article>' +
      '<section class="bl" id="backlinks"><h3><span>' + bl.length + ' backlink' + (bl.length === 1 ? '' : 's') + '</span><span>' + out.length + ' outgoing</span></h3>' +
      (bl.length ? bl.map(function (o) { return '<button class="bi" data-act="open" data-id="' + o.id + '"><b>' + esc(o.title) + '</b><span>' + backlinkSnippet(o.body, n.title) + '</span></button>'; }).join('') :
        '<div class="none">No notes link here yet. Link it from another note with [[' + esc(n.title) + ']].</div>') + '</section></div>';
    viewEl.innerHTML = h;
    if (opts.heading) { var hd = document.getElementById('h-' + opts.heading); if (hd) setTimeout(function () { hd.scrollIntoView({ block: 'start' }); }, 30); }
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
  }

  /* ---------- editor ---------- */
  var kb = null, ac = null, saveT = null;
  function startEditing(n, focusTitle) {
    editing = { n: n, startTitle: n.title }; lastSaved[n.id] = n.body;
    document.body.classList.add('editing');
    var backTo = n.folder ? '#/f/' + encodeURIComponent(n.folder) : '#/';
    viewEl.innerHTML = '<div class="page"><div class="nav"><button class="back" data-act="donebtn">' + I.back + '<span>' + esc(n.folder ? folderName(n.folder) : 'Notes') + '</span></button><div class="acts">' +
      '<button class="ib on" aria-label="Preview" data-act="donebtn">' + I.eye + '</button></div></div>' +
      '<div class="crumb">' + esc(crumbOf(n.folder)) + '</div>' +
      '<input class="ntitle" id="ttl" aria-label="Note title" autocomplete="off" spellcheck="false" enterkeyhint="next">' +
      '<textarea class="editor" id="ed" aria-label="Note text" placeholder="Start writing. Type [[ to link a note." spellcheck="true" autocapitalize="sentences"></textarea></div>';
    var ttl = $('#ttl'), ed = $('#ed');
    ttl.value = n.title; ed.value = n.body;
    autoGrow(ed);
    ttl.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); commitTitle(); ed.focus(); } });
    ttl.addEventListener('blur', commitTitle);
    ed.addEventListener('input', function () { autoGrow(ed); n.body = ed.value; scheduleSave(); updateAC(); });
    ed.addEventListener('click', updateAC);
    ed.addEventListener('keyup', function (e) { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].indexOf(e.key) >= 0 && !(ac && /Arrow(Up|Down)/.test(e.key))) updateAC(); });
    ed.addEventListener('keydown', acKeys);
    buildKB(ed);
    if (focusTitle) { ttl.focus(); ttl.select(); }
    else { ed.focus(); try { ed.setSelectionRange(ed.value.length, ed.value.length); } catch (e) {} }
  }
  function autoGrow(ed) { ed.style.height = 'auto'; ed.style.height = Math.max(ed.scrollHeight, window.innerHeight * 0.55) + 'px'; }
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
    commitTitle();
    var n = editing.n, ed = $('#ed');
    clearTimeout(saveT);
    if (ed) n.body = ed.value;
    if (ed) touchIfChanged(n);
    editing = null;
    document.body.classList.remove('editing');
    hideAC();
    if (kb) { kb.remove(); kb = null; }
    if (!silent) renderNote(n.id);
  }
  var lastSaved = {};
  function touchIfChanged(n) { if (lastSaved[n.id] !== n.body) { lastSaved[n.id] = n.body; touch(n); } }

  function buildKB(ed) {
    if (kb) kb.remove();
    kb = document.createElement('div'); kb.className = 'kb';
    var btns = [['link', '[['], ['h', '#'], ['b', '<b style="font-family:var(--sans)">B</b>'], ['i', '<i style="font-family:var(--serif)">I</i>'], ['ul', I.list], ['task', I.check], ['code', '`'], ['quote', I.quote]];
    kb.innerHTML = btns.map(function (b) { return '<button data-k="' + b[0] + '" aria-label="' + b[0] + '">' + b[1] + '</button>'; }).join('') + '<button class="done" data-k="done">Done</button>';
    kb.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      e.preventDefault();
      kbAction(b.dataset.k, ed);
    });
    document.body.appendChild(kb);
    placeKB();
  }
  function placeKB() {
    if (!kb) return;
    var vv = window.visualViewport;
    var off = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    kb.style.bottom = off + 'px';
    kb.style.paddingBottom = off > 60 ? '6px' : '';
    if (ac) placeAC();
  }
  if (window.visualViewport) { visualViewport.addEventListener('resize', placeKB); visualViewport.addEventListener('scroll', placeKB); }

  function insertText(ed, text, selStart, selEnd) {
    ed.focus();
    if (selStart !== undefined) ed.setSelectionRange(selStart, selEnd);
    var ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (e) { ok = false; }
    if (!ok) { ed.setRangeText(text, ed.selectionStart, ed.selectionEnd, 'end'); ed.dispatchEvent(new Event('input')); }
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
  function kbAction(k, ed) {
    if (k === 'done') { stopEditing(false); return; }
    if (k === 'link') {
      var s = ed.selectionStart, e = ed.selectionEnd;
      if (e > s) wrap(ed, '[[', ']]');
      else { insertText(ed, '[[]]', s, e); ed.setSelectionRange(s + 2, s + 2); }
      updateAC(); return;
    }
    if (k === 'b') return wrap(ed, '**', '**');
    if (k === 'i') return wrap(ed, '*', '*');
    if (k === 'code') {
      var sel = ed.value.slice(ed.selectionStart, ed.selectionEnd);
      return sel.indexOf('\n') >= 0 ? wrap(ed, '```\n', '\n```') : wrap(ed, '`', '`');
    }
    if (k === 'h') return linePrefix(ed, function (l) { var m = /^(#{1,6})\s/.exec(l); if (!m) return '# ' + l; if (m[1].length >= 3) return l.replace(/^#{1,6}\s/, ''); return '#' + l; });
    if (k === 'ul') return linePrefix(ed, function (l) { return /^\s*[-*+]\s(?!\[)/.test(l) ? l.replace(/^(\s*)[-*+]\s/, '$1') : l.replace(/^(\s*)(?:[-*+]\s\[[ xX]\]\s)?/, '$1- '); });
    if (k === 'task') return linePrefix(ed, function (l) { return /^\s*[-*+]\s\[[ xX]\]\s/.test(l) ? l.replace(/^(\s*)[-*+]\s\[[ xX]\]\s/, '$1') : l.replace(/^(\s*)(?:[-*+]\s)?/, '$1- [ ] '); });
    if (k === 'quote') return linePrefix(ed, function (l) { return /^>\s?/.test(l) ? l.replace(/^>\s?/, '') : '> ' + l; });
  }

  /* wikilink autocomplete */
  var acState = null;
  function updateAC() {
    var ed = $('#ed'); if (!ed || !editing) return hideAC();
    var pos = ed.selectionStart;
    if (pos !== ed.selectionEnd) return hideAC();
    var before = ed.value.slice(0, pos), m = /\[\[([^\[\]\n|#]*)$/.exec(before);
    if (!m) return hideAC();
    var q = m[1], nq = norm(q);
    var list = Array.from(notes.values()).filter(function (n) { return n !== editing.n; }).map(function (n) {
      var t = norm(n.title), sc = !nq ? 1 : t === nq ? 100 : t.indexOf(nq) === 0 ? 50 : t.indexOf(nq) >= 0 ? 20 : fuzzy(nq, t) ? 5 : 0;
      return { n: n, sc: sc + (n.updated / 1e15) };
    }).filter(function (x) { return x.sc >= 1; }).sort(function (a, b) { return b.sc - a.sc || a.n.title.localeCompare(b.n.title); }).slice(0, 6);
    var items = list.map(function (x) { return { title: x.n.title, folder: x.n.folder }; });
    if (q.trim() && !byTitle(q) && !checkTitle(q)) items.push({ title: q.trim(), create: true });
    if (!items.length) return hideAC();
    acState = { start: pos - q.length, pos: pos, items: items, sel: 0 };
    drawAC();
  }
  function fuzzy(q, t) { var i = 0; for (var j = 0; j < t.length && i < q.length; j++) if (t[j] === q[i]) i++; return i === q.length; }
  function drawAC() {
    if (!ac) { ac = document.createElement('div'); ac.className = 'ac'; document.body.appendChild(ac);
      ac.addEventListener('pointerdown', function (e) { var b = e.target.closest('button'); if (!b) return; e.preventDefault(); pickAC(+b.dataset.i); }); }
    ac.innerHTML = '<div class="hd">Link to note</div>' + acState.items.map(function (it, i) {
      return '<button data-i="' + i + '" class="' + (i === acState.sel ? 'sel' : '') + '">' + (it.create ? '<span class="plus">+</span> New note \u201c' + esc(it.title) + '\u201d' : esc(it.title) + (it.folder ? '<small>' + esc(it.folder.toLowerCase()) + '</small>' : '')) + '</button>';
    }).join('');
    placeAC();
  }
  function placeAC() { if (!ac || !kb) return; var b = parseFloat(kb.style.bottom) || 0; ac.style.bottom = (b + kb.offsetHeight + 8) + 'px'; }
  function hideAC() { acState = null; if (ac) { ac.remove(); ac = null; } }
  function pickAC(i) {
    var ed = $('#ed'); if (!ed || !acState) return;
    var st = acState, it = st.items[i], after = ed.value.slice(st.pos);
    var closes = after.indexOf(']]') === 0;
    acState = null;
    insertText(ed, it.title + (closes ? '' : ']]'), st.start, st.pos);
    var c = st.start + it.title.length + 2;
    ed.setSelectionRange(c, c);
    hideAC();
  }
  function acKeys(e) {
    if (!acState) return;
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
      notes.forEach(function (n) { adj[n.id] = adj[n.id] || {}; outNotes(n).forEach(function (o) { adj[n.id][o.id] = 1; (adj[o.id] = adj[o.id] || {})[n.id] = 1; }); });
      var frontier = [cur.id];
      for (var d = 1; d <= 2; d++) {
        var next = [];
        frontier.forEach(function (id) { Object.keys(adj[id] || {}).forEach(function (j) { if (!(j in include)) { include[j] = d; next.push(j); } }); });
        frontier = next;
      }
    }
    notes.forEach(function (n) {
      if (include && !(n.id in include)) return;
      nodes.push({ id: n.id, label: n.title });
      outNotes(n).forEach(function (o) { if (!include || o.id in include) links.push([n.id, o.id]); });
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
    var h = '<div class="gwrap"><canvas id="gc" aria-label="Graph of linked notes"></canvas><div class="ghead"><div class="eyebrow">' + data.nodes.filter(function (x) { return !x.kind; }).length + ' notes · ' + data.links.length + ' links</div><h1 class="h1">Graph</h1>' +
      '<div class="chips"><button class="chip' + (ui.graphMode === 'global' ? ' on' : '') + '" data-act="gmode" data-m="global">Global</button>' +
      '<button class="chip' + (ui.graphMode === 'local' ? ' on' : '') + '" data-act="gmode" data-m="local">Local · depth 2</button>' +
      '<button class="chip' + (ui.graphTags ? ' on' : '') + '" data-act="gtags">Tags</button></div></div>' +
      '<div class="gtools"><button class="ib" aria-label="Fit" data-act="gfit">' + I.fit + '</button><button class="ib" aria-label="Zoom in" data-act="gzin">' + I.zin + '</button><button class="ib" aria-label="Zoom out" data-act="gzout">' + I.zout + '</button></div>' +
      '<div class="ghint" id="ghint">' + (data.nodes.length ? 'Tap a node · tap again to open · pinch to zoom' : 'No notes yet. Tap + to write one.') + '</div>' +
      '<div class="gsheet" id="gsheet"></div></div>';
    viewEl.innerHTML = h;
    var canvas = $('#gc');
    var topIn = $('.ghead').offsetHeight + 6;
    var tabH = $('#tabbar').offsetHeight;
    graphCtl = Graph.mount(canvas, {
      data: data, current: cur ? cur.id : null, selected: cur ? cur.id : null, accent: settings.accent, topInset: topIn, bottomInset: tabH + (cur ? 170 : 40),
      onSelect: function (id) { showGSheet(id); },
      onOpen: function (id) { if (id.indexOf('tag:') === 0) go('#/search/' + encodeURIComponent('#' + id.slice(4))); else go('#/n/' + id); }
    });
    if (cur) showGSheet(cur.id);
  }
  function showGSheet(id) {
    var s = $('#gsheet'), hint = $('#ghint'); if (!s) return;
    if (!id) { s.classList.remove('show'); if (hint) hint.style.opacity = 1; return; }
    if (hint) hint.style.opacity = 0;
    if (id.indexOf('tag:') === 0) {
      var t = id.slice(4), c = 0; notes.forEach(function (n) { if (MD.tags(n.body).indexOf(t) >= 0) c++; });
      s.innerHTML = '<div class="gt"><i style="background:transparent;border:1.5px solid var(--text)"></i>#' + esc(t) + '</div><div class="gm">Tag · ' + c + ' note' + (c === 1 ? '' : 's') + '</div><div class="gb"><button class="acc" data-act="gopen" data-id="' + esc(id) + '">Show notes</button></div>';
    } else {
      var n = notes.get(id); if (!n) return;
      var out = outNotes(n).length, bl = backlinks(n).length;
      s.innerHTML = '<div class="gt"><i></i>' + esc(n.title) + '</div><div class="gm">' + esc(n.folder ? folderName(n.folder) : 'Vault') + ' · ' + out + ' link' + (out === 1 ? '' : 's') + ' · ' + bl + ' backlink' + (bl === 1 ? '' : 's') + '</div>' +
        '<div class="gb"><button class="acc" data-act="gopen" data-id="' + n.id + '">Open note</button><button data-act="glocal" data-id="' + n.id + '">Local graph</button></div>';
    }
    s.classList.add('show');
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
    if (!q) {
      var tc = {}; notes.forEach(function (n) { MD.tags(n.body).forEach(function (t) { tc[t] = (tc[t] || 0) + 1; }); });
      var tags = Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a] || a.localeCompare(b); });
      box.innerHTML = (tags.length ? '<div class="sec"><span>Tags</span></div><div class="chips" style="flex-wrap:wrap;overflow:visible;margin:0;padding:0">' + tags.map(function (t) { return '<button class="chip" data-act="stag" data-tag="' + esc(t) + '">#' + esc(t) + ' <span style="opacity:.5">' + tc[t] + '</span></button>'; }).join('') + '</div>' : '') +
        '<div class="sec"><span>Recent</span></div>' + recent(5).map(function (n) { return noteItem(n, true); }).join('');
      return;
    }
    var res = [];
    if (/^#[\w\-\/]+$/.test(q)) {
      var tg = q.slice(1).toLowerCase();
      notes.forEach(function (n) { if (MD.tags(n.body).some(function (t) { return t === tg || t.indexOf(tg + '/') === 0; })) res.push({ n: n, sc: 1, snip: snippetHTML(n.body) }); });
    } else {
      var nq = q.toLowerCase(), terms = nq.split(/\s+/);
      notes.forEach(function (n) {
        var t = n.title.toLowerCase(), b = n.body.toLowerCase(), sc = 0;
        if (t === nq) sc += 100; else if (t.indexOf(nq) === 0) sc += 40; else if (t.indexOf(nq) >= 0) sc += 25;
        var allIn = terms.every(function (w) { return t.indexOf(w) >= 0 || b.indexOf(w) >= 0; });
        if (!sc && !allIn) return;
        var bi = b.indexOf(terms[0]);
        if (bi >= 0) sc += 5 + Math.min(5, b.split(terms[0]).length - 1);
        res.push({ n: n, sc: sc, snip: bi >= 0 ? hitSnippet(n.body, terms[0]) : snippetHTML(n.body) });
      });
    }
    res.sort(function (a, b) { return b.sc - a.sc || b.n.updated - a.n.updated; });
    box.innerHTML = '<div class="sec"><span>' + res.length + ' result' + (res.length === 1 ? '' : 's') + '</span></div>' + (res.length ? res.slice(0, 100).map(function (r) {
      return '<button class="nl" data-act="open" data-id="' + r.n.id + '"><div class="t"><b>' + hl(r.n.title, q) + '</b><time>' + ago(r.n.updated) + '</time></div><div class="s" style="white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + r.snip + '</div>' + (r.n.folder ? '<div class="f">' + esc(crumbOf(r.n.folder)) + '</div>' : '') + '</button>';
    }).join('') : '<div class="empty"><b>Nothing found</b><button class="pill acc" data-act="screate" data-q="' + esc(q) + '" style="margin-top:12px">Create \u201c' + esc(q.slice(0, 40)) + '\u201d</button></div>');
  }
  function hl(text, q) { var i = text.toLowerCase().indexOf(q.toLowerCase()); if (i < 0) return esc(text); return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length)); }
  function cleanText(body) {
    return String(body || '').replace(/```[\s\S]*?(```|$)/g, ' ').replace(new RegExp(MD.WL.source, 'g'), function (m, t, h, a) { return (a || t).trim(); })
      .replace(/\[([^\]\n]+)\]\([^)]+\)/g, '$1').replace(/^\s*#{1,6}\s+/gm, '').replace(/^\s*>\s?(\[!\w+\]\s*)?/gm, '')
      .replace(/^\s*([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/gm, '').replace(/^\s*\|?\s*:?-{2,}.*$/gm, '').replace(/\|/g, ' ').replace(/[*_~=`]/g, '').replace(/\s*\n\s*/g, ' · ').replace(/^ · | · $/g, '');
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
    var seeds = 0; notes.forEach(function (n) { if (n.seed) seeds++; });
    var h = '<div class="page"><div class="eyebrow">Axon</div><h1 class="h1">Settings</h1>' +
      '<div class="sec"><span>Reading</span></div><div class="group">' +
      '<div class="item"><span>Text size</span><div class="seg">' + SIZES.map(function (s) { return '<button class="' + (settings.fs === s[1] ? 'on' : '') + '" data-act="fs" data-v="' + s[1] + '" style="font-size:' + (s[1] - 3) + 'px">' + s[0] + '</button>'; }).join('') + '</div></div>' +
      '<div class="preview prose">The <a class="wl" href="#" data-noop="1">Basal ganglia</a> gate movement; dopamine tips the balance toward <strong>go</strong>.</div></div>' +
      '<div class="sec"><span>Accent</span><span style="text-transform:none;letter-spacing:0">' + esc((ACCENTS.filter(function (a) { return a[1] === settings.accent; })[0] || ['Custom'])[0]) + '</span></div><div class="group"><div class="sw">' +
      ACCENTS.map(function (a) { return '<button aria-label="' + a[0] + '" class="' + (settings.accent === a[1] ? 'on' : '') + '" data-act="accent" data-v="' + a[1] + '" style="background:' + a[1] + '"></button>'; }).join('') + '</div></div>' +
      '<div class="sec"><span>Vault</span></div><div class="group">' +
      '<button class="item" data-act="export"><span>Export vault<small>All ' + notes.size + ' notes as .md files in a .zip</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '<button class="item" data-act="import"><span>Import notes<small>Pick .md files or a .zip of them</small></span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '<button class="item" data-act="newfolder" data-path=""><span>New folder</span><svg class="chv" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>' +
      (seeds ? '<button class="item" data-act="clearseed"><span>Clear starter notes<small>Removes the ' + seeds + ' example notes. Ones you edited stay.</small></span></button>'
        : '<button class="item" data-act="addseed"><span>Add starter notes<small>Bring back the example neuro notes</small></span></button>') +
      '<button class="item danger" data-act="wipe"><span>Delete all notes</span></button></div>' +
      '<div class="sec"><span>About</span></div><div class="group">' +
      '<div class="item"><span>Storage<small>Notes live only on this device and work offline. Export now and then to keep a backup.</small></span></div>' +
      (isStandalone() ? '' : '<div class="item"><span>Install on iPhone<small>In Safari tap Share, then Add to Home Screen.</small></span></div>') +
      '</div><input type="file" id="file" accept=".md,.markdown,.txt,.zip,text/markdown,text/plain,application/zip" multiple hidden>' +
      '<div class="foot"><b>Axon<i>.</i></b>by Northpeak Studios · v' + VERSION + '</div></div>';
    viewEl.innerHTML = h;
    $('#file').addEventListener('change', function (e) { importFiles(Array.from(e.target.files || [])); e.target.value = ''; });
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
  function exportVault() {
    if (!notes.size) { toast('Nothing to export yet'); return; }
    var used = {}, files = [];
    notes.forEach(function (n) {
      var path = (n.folder ? n.folder.split('/').map(safeName).join('/') + '/' : '') + safeName(n.title);
      var p = path, i = 2; while (used[p.toLowerCase()]) p = path + ' ' + (i++);
      used[p.toLowerCase()] = 1;
      files.push({ name: p + '.md', data: n.body, date: new Date(n.updated) });
    });
    folders.forEach(function (f) { if (!countIn(f)) files.push({ name: f.split('/').map(safeName).join('/') + '/.keep', data: '' }); });
    var blob = Zip.make(files);
    var d = new Date(), name = 'Axon vault ' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.zip';
    var file = null;
    try { file = new File([blob], name, { type: 'application/zip' }); } catch (e) {}
    var ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).then(function () { toast('Exported ' + notes.size + ' notes'); }).catch(function (e) { if (e && e.name !== 'AbortError') download(blob, name); });
      return;
    }
    download(blob, name);
    toast('Exported ' + notes.size + ' notes');
  }
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  async function importFiles(list) {
    if (!list.length) return;
    var entries = [], dec = new TextDecoder();
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      try {
        if (/\.zip$/i.test(f.name) || f.type === 'application/zip') {
          var z = await Zip.read(await f.arrayBuffer());
          z.forEach(function (e) { if (/\.(md|markdown|txt)$/i.test(e.name) && !/(^|\/)(__MACOSX|\.)/.test(e.name)) entries.push({ path: e.name, text: dec.decode(e.data) }); });
        } else if (/\.(md|markdown|txt)$/i.test(f.name) || /^text\//.test(f.type)) {
          entries.push({ path: f.name, text: await f.text() });
        }
      } catch (err) { toast('Couldn\u2019t read ' + f.name + ': ' + err.message); }
    }
    if (!entries.length) { toast('No markdown files found'); return; }
    // drop a shared top folder (e.g. "My vault/")
    var tops = {}; entries.forEach(function (e) { tops[e.path.split('/')[0]] = 1; });
    var strip = Object.keys(tops).length === 1 && entries.every(function (e) { return e.path.indexOf('/') > 0; });
    var count = 0, renamed = 0;
    entries.forEach(function (e) {
      var parts = e.path.split('/'); if (strip) parts.shift();
      var base = parts.pop().replace(/\.(md|markdown|txt)$/i, '');
      var folder = parts.map(function (p) { return p.replace(/[\[\]|#^\\:]/g, '').trim(); }).filter(Boolean).join('/');
      var title = base.replace(/[\[\]|#^\\\/:]/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled';
      var t = title;
      if (byTitle(t)) { t = uniqueTitle(title + ' (imported)'); renamed++; }
      createNote({ title: t, folder: folder, body: e.text.replace(/\r\n?/g, '\n') });
      count++;
    });
    toast('Imported ' + count + ' note' + (count === 1 ? '' : 's') + (renamed ? ' · ' + renamed + ' renamed to avoid clashes' : ''));
    render();
  }

  /* ---------- actions ---------- */
  function newNote(folder) {
    if (folder === undefined) {
      var r = route();
      folder = r.v === 'folder' && r.path !== '*' ? r.path : (r.v === 'note' && notes.get(r.id) ? notes.get(r.id).folder : '');
    }
    var n = createNote({ title: uniqueTitle('Untitled'), folder: folder, body: '' });
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
  async function noteMenu(n) {
    var a = await sheet({ title: n.title, actions: [{ label: 'Rename', value: 'rename' }, { label: 'Move to folder', value: 'move' }, { label: 'Delete note', value: 'delete', danger: true }] });
    if (a === 'rename') {
      var v = await dialog({ title: 'Rename note', message: 'Links to this note will update too.', input: true, value: n.title, ok: 'Rename', validate: function (v) { return checkTitle(v, n); } });
      if (v && v !== n.title) { var r = renameNote(n, v); toast(r.changed ? 'Renamed · updated links in ' + r.changed + ' note' + (r.changed === 1 ? '' : 's') : 'Renamed'); renderNote(n.id); }
    } else if (a === 'move') {
      var opts = [{ label: '/  Vault (no folder)', value: '\u0000' }].concat(Array.from(folders).sort().map(function (f) { return { label: f.split('/').join(' / '), value: f }; }));
      var f = await sheet({ title: 'Move \u201c' + n.title + '\u201d', actions: opts, left: true });
      if (f !== null && f !== undefined) { moveNote(n, f === '\u0000' ? '' : f); toast('Moved'); renderNote(n.id); }
    } else if (a === 'delete') {
      var bl = backlinks(n).length;
      var ok = await dialog({ title: 'Delete \u201c' + n.title + '\u201d?', message: bl ? bl + ' note' + (bl === 1 ? ' links' : 's link') + ' here; those links will show as unresolved.' : 'This can\u2019t be undone.', ok: 'Delete', danger: true });
      if (ok) { var to = n.folder ? '#/f/' + encodeURIComponent(n.folder) : '#/'; deleteNote(n); toast('Deleted'); go(to, true); }
    }
  }
  async function folderMenu(p) {
    var a = await sheet({ title: folderName(p), actions: [{ label: 'New note here', value: 'note' }, { label: 'New folder inside', value: 'sub' }, { label: 'Rename folder', value: 'rename' }, { label: 'Delete folder', value: 'delete', danger: true }] });
    if (a === 'note') newNote(p);
    else if (a === 'sub') newFolder(p);
    else if (a === 'rename') {
      var v = await dialog({ title: 'Rename folder', input: true, value: folderName(p), ok: 'Rename',
        validate: function (v) { if (!v) return 'Type a name.'; if (/[\/\\\[\]|#^:]/.test(v)) return 'Folder names can\u2019t use / \\ [ ] | # ^ :'; var np = (parentOf(p) ? parentOf(p) + '/' : '') + v; if (np !== p && folders.has(np)) return 'That folder already exists.'; return null; } });
      if (v && v !== folderName(p)) { var np = renameFolder(p, v); toast('Folder renamed'); go('#/f/' + encodeURIComponent(np), true); }
    } else if (a === 'delete') {
      var c = countIn(p);
      if (!c) { deleteFolder(p, false); toast('Folder deleted'); go(parentOf(p) ? '#/f/' + encodeURIComponent(parentOf(p)) : '#/', true); return; }
      var m = await sheet({ title: 'Delete \u201c' + folderName(p) + '\u201d?', message: 'It holds ' + c + ' note' + (c === 1 ? '' : 's') + '.', actions: [{ label: 'Delete folder and ' + c + ' note' + (c === 1 ? '' : 's'), value: 'all', danger: true }, { label: 'Delete folder, keep notes', value: 'keep' }] });
      if (!m) return;
      deleteFolder(p, m === 'keep');
      toast(m === 'keep' ? 'Folder deleted · notes moved up' : 'Deleted folder and ' + c + ' note' + (c === 1 ? '' : 's'));
      go(parentOf(p) ? '#/f/' + encodeURIComponent(parentOf(p)) : '#/', true);
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
    foldermore: function (el) { folderMenu(el.dataset.path); },
    notemore: function (el) { var n = notes.get(el.dataset.id); if (n) noteMenu(n); },
    edit: function () { var r = route(); var n = notes.get(r.id); if (n) startEditing(n, false); },
    donebtn: function () { stopEditing(false); },
    localgraph: function (el) { ui.lastNote = el.dataset.id; ui.graphMode = 'local'; saveMeta(); go('#/graph'); },
    gmode: function (el) {
      if (el.dataset.m === 'local' && !(ui.lastNote && notes.get(ui.lastNote))) { toast('Open a note first, then its local graph shows here'); return; }
      ui.graphMode = el.dataset.m; saveMeta(); render();
    },
    gtags: function () { ui.graphTags = !ui.graphTags; saveMeta(); render(); },
    gfit: function () { graphCtl && graphCtl.fit(); },
    gzin: function () { graphCtl && graphCtl.zoom(1.3); },
    gzout: function () { graphCtl && graphCtl.zoom(1 / 1.3); },
    gopen: function (el) { var id = el.dataset.id; if (id.indexOf('tag:') === 0) go('#/search/' + encodeURIComponent('#' + id.slice(4))); else go('#/n/' + id); },
    glocal: function (el) { ui.lastNote = el.dataset.id; ui.graphMode = 'local'; saveMeta(); render(); },
    stag: function (el) { var i = $('#sq'); i.value = '#' + el.dataset.tag; i.dispatchEvent(new Event('input')); },
    sclear: function () { var i = $('#sq'); i.value = ''; i.dispatchEvent(new Event('input')); i.focus(); },
    screate: function (el) { var t = el.dataset.q.replace(/[\[\]|#^\\\/:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120); if (!t) return; var n = createNote({ title: uniqueTitle(t), folder: '', body: '' }); go('#/n/' + n.id); startEditing(n, false); },
    fs: function (el) { settings.fs = +el.dataset.v; saveSettings(); renderSettings(); },
    accent: function (el) { settings.accent = el.dataset.v; saveSettings(); renderSettings(); },
    export: exportVault,
    import: function () { $('#file').click(); },
    clearseed: async function () {
      var ok = await dialog({ title: 'Clear starter notes?', message: 'This removes the example notes and their empty folders. Notes you wrote or edited stay.', ok: 'Clear', danger: true });
      if (!ok) return; var c = clearSeed(); toast('Cleared ' + c + ' starter note' + (c === 1 ? '' : 's')); renderSettings();
    },
    addseed: function () {
      var added = 0;
      window.AXON_SEED.folders.forEach(ensureFolder);
      var now = Date.now();
      window.AXON_SEED.notes.forEach(function (s, i) { if (!byTitle(s.title)) { createNote({ title: s.title, folder: s.folder, body: s.body, seed: true, created: now - i * 60000, updated: now - i * 60000 }); added++; } });
      toast(added ? 'Added ' + added + ' starter notes' : 'Starter notes are already here'); renderSettings();
    },
    wipe: async function () {
      var ok = await dialog({ title: 'Delete all ' + notes.size + ' notes?', message: 'Every note and folder on this device will be erased. Export first if you want a copy.', ok: 'Delete all', danger: true });
      if (!ok) return;
      notes.clear(); folders.clear(); rebuildIdx(); ui.lastNote = null; ui.open = {};
      await DB.clear('notes'); await DB.clear('folders'); saveMeta();
      toast('Vault erased'); renderSettings();
    }
  };

  viewEl.addEventListener('click', function (e) {
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
    var r = route(), n = notes.get(r.id); if (!n) return;
    var lines = n.body.split('\n'), i = +cb.dataset.line;
    if (lines[i] === undefined) return;
    lines[i] = lines[i].replace(/^(\s*(?:>\s*)*(?:[-*+]|\d+[.)])\s+)\[( |x|X)\]/, function (m, p, s) { return p + (s === ' ' ? '[x]' : '[ ]'); });
    n.body = lines.join('\n'); touch(n);
    var li = cb.closest('li'); if (li) li.classList.toggle('done', cb.checked);
  });
  document.querySelectorAll('.tb').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.tab;
      var target = { notes: '#/', graph: '#/graph', search: '#/search', settings: '#/settings' }[t];
      if (t === 'notes' && route().v === 'vault') { viewEl.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      go(target);
    });
  });
  $('#fab').addEventListener('click', function () { newNote(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && editing) { var ed = $('#ed'); if (ed) editing.n.body = ed.value; touchIfChanged(editing.n); } });
  window.addEventListener('pagehide', function () { if (editing) { var ed = $('#ed'); if (ed) editing.n.body = ed.value; touchIfChanged(editing.n); } });

  /* ---------- boot ---------- */
  async function boot() {
    try {
      await DB.open();
      var ns = await DB.all('notes'), fs = await DB.all('folders'), meta = await DB.all('meta');
      ns.forEach(function (n) { notes.set(n.id, n); });
      fs.forEach(function (f) { folders.add(f.path); });
      var m = {}; meta.forEach(function (x) { m[x.k] = x.v; });
      if (m.settings) settings = Object.assign(settings, m.settings);
      if (m.ui) ui = Object.assign(ui, m.ui);
      rebuildIdx();
      if (!m.seeded) { seedVault(); DB.put('meta', { k: 'seeded', v: Date.now() }); }
    } catch (err) {
      viewEl.innerHTML = '<div class="empty"><b>Storage is blocked</b>Axon keeps notes in this browser\u2019s storage. Private browsing can block it. (' + esc(err && err.message || err) + ')</div>';
      return;
    }
    applySettings();
    render();
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }
  window.__axon = { notes: notes, folders: folders, byTitle: byTitle, backlinks: backlinks, renameNote: renameNote, exportFiles: function () { return notes; }, Zip: Zip, importFiles: importFiles };
  boot();
})();
