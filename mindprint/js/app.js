/* Mindprint by Northpeak Studios — app shell, quiz, results, Deep Dive, account and Pro. No inline scripts (CSP). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); }, V = $('#view');
  var LS = { get: function (k, d) { try { var v = localStorage.getItem('mp.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
             set: function (k, v) { try { v == null ? localStorage.removeItem('mp.' + k) : localStorage.setItem('mp.' + k, JSON.stringify(v)); } catch (e) {} } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var Q = null, D = null, S = window.MPScore;
  var TAGS = { 'Big Five (OCEAN)': 'About you', 'Attachment': 'You and your people', 'Conflict style (Thomas-Kilmann)': 'When things clash', 'Values (Schwartz)': 'What matters to you', 'Stress & coping': 'Under pressure', 'Social energy': 'Social battery', 'Decision-making (GDMS-style)': 'How you decide', 'Scenarios (mixed)': 'What would you do?' };
  var PRIV = 'Your answers are saved to your account and to Northpeak Studios, and may be reviewed to improve Mindprint.', DISC = 'Not a diagnosis \u2014 for fun and self-reflection.';
  var C = function () { return window.Cloud || null; };
  var signed = function () { return !!(C() && C().signedIn()); };
  var pro = function () { return !!(C() && C().isPro()); };
  var busy = false; // mid-question: the auto-updater waits
  window.npUpdate = { safe: function () { return !busy; } };

  /* ---------- results store (this phone; synced encrypted when signed in) ---------- */
  var DB = {
    all: function () { return Promise.resolve(LS.get('results', [])); },
    put: function (m) { var a = LS.get('results', []).filter(function (x) { return x.id !== m.id; }); a.push(m); LS.set('results', a); return Promise.resolve(); },
    remove: function (id) { LS.set('results', LS.get('results', []).filter(function (x) { return x.id !== id; })); return Promise.resolve(); }
  };
  function results(kind) { return LS.get('results', []).filter(function (r) { return !kind || r.kind === kind; }).sort(function (a, b) { return b.at - a.at; }); }
  function byId(id) { return LS.get('results', []).find(function (r) { return r.id === id; }); }
  function rid() { var a = 'abcdefghjkmnpqrstuvwxyz23456789', b = crypto.getRandomValues(new Uint8Array(10)), s = ''; for (var i = 0; i < b.length; i++) s += a[b[i] % a.length]; return 'r:' + s; }
  var syncing = false;
  function sync() { if (!signed() || syncing) return Promise.resolve(); syncing = true; return C().sync(DB).catch(function () {}).then(function () { syncing = false; }); }
  /* every finished quiz goes to the person's account and to Northpeak's database (they consented on screen first) */
  function submit(r, extra) {
    var rich = r.answers.map(function (x) { if (r.kind === 'main') { var q = Q.questions.find(function (z) { return z.id === x.q; }); return { q: x.q, a: x.a, question: q ? q.text : '', answer: q && q.options[x.a] ? q.options[x.a].t : '' }; }
      var dq = D && D.questions.find(function (z) { return z.id === x.q; }); return { q: x.q, v: x.v, question: x.t || (dq && dq.text) || '', answer: dq && window.MPReport ? window.MPReport.fmtV(dq, x.v) : String(x.v) }; });
    var b = { id: r.id, kind: r.kind, name: r.name || '', answers: rich, consent: true, secs: r.secs || 0, qv: r.qv || 1 };
    for (var k in (extra || {})) b[k] = extra[k];
    var pend = LS.get('pending', []).filter(function (x) { return x.id !== r.id; }); pend.push(b); LS.set('pending', pend);
    return flush();
  }
  function flush() {
    var pend = LS.get('pending', []); if (!pend.length) return Promise.resolve();
    var send = function (b) { var h = { 'content-type': 'application/json' }; if (signed()) h.authorization = 'Bearer ' + C().acct.token;
      return fetch('https://mindprint.sites.tab.bot/api/mp/submit', { method: 'POST', headers: h, body: JSON.stringify(b), cache: 'no-store', credentials: 'omit' }).then(function (x) { return x.json(); }).then(function (j) { if (j && j.teaser) { var rr = byId(b.id); if (rr) { rr.teaser = j.teaser; DB.put(rr); } } if (j && (j.ok || j.error === 'bad_answers' || j.error === 'consent_required')) LS.set('pending', LS.get('pending', []).filter(function (y) { return y.id !== b.id; })); }); };
    return pend.reduce(function (p, b) { return p.then(function () { return send(b).catch(function () {}); }); }, Promise.resolve());
  }
  function compact(sc) { var o = { scales: {} }; for (var k in sc.scales) o.scales[k] = sc.scales[k].pct; o.attachment = sc.attachment.style;
    o.conflict = (S.top(sc.conflict, 2) || []).map(function (x) { return x.key; }); o.values = S.top(sc.values, 3).map(function (x) { return x.key; }); o.coping = S.top(sc.coping, 2).map(function (x) { return x.key; }); o.decision = S.top(sc.decision, 1).map(function (x) { return x.key; });
    o.headlines = S.headlines(sc).map(function (h) { return h.title; }); return o; }

  /* results the owner attached to this account's email (from an earlier quiz): saved once into this account, encrypted */
  function imports() {
    if (!signed()) return Promise.resolve(0);
    return C().api('/api/mp/imports').then(function (j) {
      var got = [], n = 0;
      (j.imports || []).forEach(function (im) { (im.results || []).forEach(function (r) { if (r && r.id && /^r:[\w.-]{4,60}$/.test(r.id) && (r.kind === 'main' || r.kind === 'deep') && Array.isArray(r.answers)) { if (!byId(r.id)) { DB.put(r); n++; } } }); got.push(im.id); });
      if (!got.length) return 0;
      return C().sync(DB).then(function () { return C().api('/api/mp/imports/claim', { ids: got }); }).then(function () { if (n) toast(n === 1 ? 'A saved result was added to your history' : n + ' saved results were added to your history'); return n; });
    }).catch(function () { return 0; });
  }
  /* Paygate: the public questions file has no scoring weights. Pro / All-Access accounts fetch the key from the server and score on the phone;
     free accounts get a teaser (top trait + preview) from the server. */
  var KEY = null, KEYED = false;
  function ensureKey() {
    if (!Q) return Promise.resolve();
    if (!pro() || !signed()) { if (KEYED) { Q = null; KEYED = false; KEY = null; return loadQ(); } return Promise.resolve(); }
    if (KEYED) return Promise.resolve();
    return (KEY ? Promise.resolve({ ok: true, key: KEY }) : C().api('/api/mp/key')).then(function (j) {
      if (!j || !j.key || !j.key.questions) return;
      KEY = j.key; var m = {}; KEY.questions.forEach(function (x) { m[x.id] = x.s; });
      Q.questions.forEach(function (q) { var w = m[q.id]; if (w) q.options.forEach(function (o, k) { o.s = w[k] || {}; }); });
      KEYED = true;
    }).catch(function () {});
  }
  function full() { return KEYED && pro(); }
  function loadQ() { return Q ? Promise.resolve(Q) : fetch('data/questions.json?v=5').then(function (r) { return r.json(); }).then(function (j) { Q = j; S.setNames(j.scales); return Q; }); }
  function loadD() { return D ? Promise.resolve(D) : fetch('data/deep.json?v=5').then(function (r) { return r.json(); }).then(function (j) { D = j; return D; }); }
  function scoreOf(r) { return KEYED ? S.score(Q, r.answers) : null; }
  function fmtDate(t) { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  function toast(msg) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600); }
  window.npUpdate.toast = function (msg, onTap) { var t = document.createElement('button'); t.className = 'toast'; t.textContent = msg; t.onclick = function () { t.remove(); if (onTap) onTap(); }; document.body.appendChild(t); };

  /* the account module loads as a separate script: wait for it (briefly) so a fresh load on #deep or #report sees a Pro account as Pro */
  var cloudReady = new Promise(function (ok) { if (C()) return ok(); window.addEventListener('cloud-ready', function () { ok(); }, { once: true }); setTimeout(ok, 4000); });
  /* ---------- router ---------- */
  function route() {
    busy = false; window.scrollTo(0, 0);
    var h = (location.hash || '#home').slice(1).split('/'), r = h[0] || 'home', arg = decodeURIComponent(h.slice(1).join('/'));
    document.querySelectorAll('.tabbar a').forEach(function (a) { var t = a.getAttribute('href').slice(1); a.classList.toggle('on', t === r || (a.dataset.also || '').split(' ').indexOf(r) >= 0); });
    var f = { home: home, start: start, quiz: quiz, results: resultsPage, history: history, deep: deepIntro, deepq: deepQ, deepres: deepResults, report: report, account: account, pro: proPage }[r] || home;
    Promise.all([loadQ(), cloudReady, r.indexOf('deep') === 0 || r === 'report' || r === 'history' ? loadD() : null]).then(ensureKey).then(function () { f(arg); }).catch(function () { V.innerHTML = '<div class="card"><p>Couldn\u2019t load Mindprint. Check your connection and try again.</p></div>'; });
  }
  window.addEventListener('hashchange', route);

  /* ---------- home ---------- */
  function home() {
    var last = results('main')[0], prog = LS.get('quiz', null), dprog = LS.get('deepq', null);
    V.innerHTML = '<section class="hero"><p class="eyebrow">Mindprint</p><h1>What do your answers say about <span class="grad">you</span>?</h1>' +
      '<p class="lede">77 quick questions built on real psychology: the Big Five, attachment, conflict style, values, stress and how you decide. About 10 minutes.</p><p class="freeline">Free to take \u2014 full results with Pro</p>' +
      (prog && prog.i > 0 ? '<a class="btn big block" href="#quiz">Continue the quiz (' + Math.min(prog.i + 1, Q.questions.length) + ' of ' + Q.questions.length + ')</a>' : '<a class="btn big block" href="#start">' + (last ? 'Take it again' : 'Start the quiz') + '</a>') +
      (last ? '<a class="btn ghost block" href="#results/' + encodeURIComponent(last.id) + '">See your latest results</a>' : '') + '<p class="muted small">' + DISC + '</p></section>' +
      '<div class="card deepcard"><p class="tag">Pro</p><h2>Deep Dive: Childhood &amp; Family</h2><p>50 more questions about where you come from, written around your own results. Mostly typed answers, and you can skip any of them. Unlocks a full written report, a spreadsheet of your answers and a printable PDF.</p>' +
      (dprog && dprog.i > 0 ? '<a class="btn block" href="#deepq">Continue your Deep Dive</a>' : '<a class="btn block" href="#deep">' + (pro() ? 'Open the Deep Dive' : 'See what\u2019s in Pro') + '</a>') + '</div>' +
      '<div class="card"><h2>How it works</h2><ol class="steps"><li>Answer honestly. There are no right or wrong answers. Taking it is free.</li><li>See your top trait right away. Your full results, across all 7 frameworks, come with Mindprint Pro ($10).</li><li>Sign in to keep every result in your account and retake it any time.</li></ol></div>';
  }

  /* ---------- start + quiz ---------- */
  function start() {
    var nm = LS.get('name', '') || '';
    V.innerHTML = '<div class="card"><h2>Before you start</h2><p class="freeline">Free to take \u2014 full results with Pro</p><p class="muted small">' + (pro() ? 'You have Pro, so you\u2019ll see your full results as soon as you finish.' : 'Anyone can take the quiz and see their top trait for free. Your full results (every trait, all 7 frameworks) unlock with Mindprint Pro for $10. Your answers are saved, so unlocking later shows everything without a retake.') + '</p><label>What should we call you?<input id="nm" maxlength="40" autocomplete="given-name" placeholder="First name or nickname" value="' + esc(nm) + '"></label>' +
      '<label class="ck"><input type="checkbox" id="ok"><span>' + esc(PRIV) + '</span></label><p class="muted small">' + DISC + '</p>' + (signed() ? '' : '<p class="muted small">You can take it without an account and sign in afterwards to keep your results in your history.</p>') +
      '<button class="btn big block" id="go" disabled>Start</button></div>';
    $('#ok').onchange = function () { $('#go').disabled = !this.checked; };
    $('#go').onclick = function () { if (!$('#ok').checked) return; var n = $('#nm').value.trim().slice(0, 40); LS.set('name', n); LS.set('quiz', { name: n, i: 0, answers: {}, t: Date.now() }); location.hash = '#quiz'; };
  }
  function quiz() {
    var st = LS.get('quiz', null); if (!st) { location.hash = '#start'; return; }
    var qs = Q.questions, i = Math.min(st.i, qs.length - 1), q = qs[i]; busy = true;
    var opts = q.options.map(function (o, k) { return '<button class="opt' + (st.answers[q.id] === k ? ' sel' : '') + '" data-k="' + k + '">' + esc(o.t) + '</button>'; }).join('');
    V.innerHTML = '<div class="qtop"><button class="back" id="bk" aria-label="Back"' + (i ? '' : ' disabled') + '>\u2039 Back</button><span class="count">' + (i + 1) + ' / ' + qs.length + '</span></div>' +
      '<div class="bar"><i style="width:' + Math.round(100 * i / qs.length) + '%"></i></div>' +
      '<div class="qcard"><p class="tag">' + esc(TAGS[q.framework] || 'About you') + '</p><h2 class="q">' + esc(q.text) + '</h2><div class="opts' + (q.type === 'likert' ? ' likert' : '') + '">' + opts + '</div></div>';
    $('#bk').onclick = function () { st.i = Math.max(0, i - 1); LS.set('quiz', st); quiz(); };
    V.querySelector('.opts').onclick = function (e) {
      var b = e.target.closest('.opt'); if (!b) return;
      st.answers[q.id] = +b.dataset.k; b.classList.add('sel');
      setTimeout(function () { if (i + 1 >= qs.length) finishQuiz(st); else { st.i = i + 1; LS.set('quiz', st); quiz(); } }, 170);
      LS.set('quiz', st);
    };
  }
  function finishQuiz(st) {
    var ans = Q.questions.filter(function (q) { return st.answers[q.id] != null; }).map(function (q) { return { q: q.id, a: st.answers[q.id] }; });
    var r = { id: rid(), kind: 'main', at: Date.now(), name: st.name || '', answers: ans, qv: Q.version || 1, secs: Math.round((Date.now() - (st.t || Date.now())) / 1000) };
    DB.put(r); LS.set('quiz', null); var sub = submit(r, KEYED ? { scores: compact(scoreOf(r)) } : {}); sync();
    if (full()) location.hash = '#results/' + encodeURIComponent(r.id);
    else { V.innerHTML = '<div class="card center"><div class="spin"></div><p>Reading your answers across 7 frameworks\u2026</p></div>'; var go = function () { location.hash = '#results/' + encodeURIComponent(r.id); }; Promise.race([sub, new Promise(function (ok) { setTimeout(ok, 6000); })]).then(go, go); }
  }

  /* ---------- results (free) ---------- */
  function bars(sc, keys) {
    return keys.filter(function (k) { return sc.scales[k]; }).map(function (k) { var v = sc.scales[k];
      return '<div class="br"><div class="bl"><span>' + esc(S.nm(k)) + (v.n < 4 ? ' <em class="lean">leaning</em>' : '') + '</span><b>' + v.pct + '</b></div><div class="bt"><i style="width:' + Math.max(3, v.pct) + '%"></i></div></div>'; }).join('');
  }
  var LOCK = '<svg class="lk" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1zm2 0h6V7a3 3 0 0 0-6 0v3z"/></svg>';
  var FILL = ['When things get tense with someone close to you, your first instinct is something most people never notice about themselves.', 'The way you get close to people says a lot about what you learned early on, and where you still hold back.', 'Your choices follow a pattern: what you weigh first, who you listen to, and what you do when you can\u2019t decide.', 'How long you can be around people before you need to recharge, and what actually fills you back up.', 'What you do first when everything piles up, and the habit that quietly makes it worse.', 'The three things you care about most, ranked, and how they pull against each other.', 'Your scores on all five traits, with every facet broken down.'];
  var TEASE_DEF = [['conflict', 'How you handle conflict'], ['attach', 'Your attachment style'], ['decide', 'What drives your decisions'], ['social', 'Your social battery'], ['stress', 'Under stress'], ['values', 'What matters to you most'], ['big5', 'Your Big Five breakdown']];
  function teaserPage(r) {
    var tz = r.teaser, nm = r.name ? esc(r.name) + '\u2019s' : 'Your';
    if (!tz) {
      V.innerHTML = '<div class="card center"><div class="spin"></div><p>Reading your answers across 7 frameworks\u2026</p></div>';
      fetch('https://mindprint.sites.tab.bot/api/mp/teaser', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers: r.answers }), cache: 'no-store', credentials: 'omit' })
        .then(function (x) { return x.json(); }).then(function (j) { if (j && j.teaser) { r.teaser = j.teaser; DB.put(r); if (/^#results/.test(location.hash) || location.hash === '') teaserPage(r); } else throw 0; })
        .catch(function () { V.innerHTML = '<div class="card"><p>Your answers are saved. Connect to the internet to see your top trait.</p><button class="btn block" id="rt">Try again</button></div>'; $('#rt').onclick = function () { teaserPage(r); }; });
      return;
    }
    var locked = (tz.locked && tz.locked.length ? tz.locked.map(function (x) { return [x.id, x.title]; }) : TEASE_DEF);
    var html = '<div class="rhead tease"><p class="eyebrow">' + nm + ' Mindprint \u00b7 ' + fmtDate(r.at) + '</p><p class="tag">Your top trait</p><h1>' + esc(tz.title) + '</h1><p class="lede">' + esc(tz.text) + '</p>' +
      (tz.more ? '<p class="muted small">+' + tz.more + ' more standout trait' + (tz.more > 1 ? 's' : '') + ' in your full results</p>' : '') + '</div>' +
      '<div class="fwk"><span><b>7</b> frameworks analyzed</span><span><b>' + (tz.answered || r.answers.length) + '</b> answers</span><span><b>40+</b> traits scored</span></div>';
    html += '<div class="card cta"><h2>Unlock your full Mindprint</h2><p>Every trait and what it means, how you love, fight, decide and cope, plus the Deep Dive, a written report, a spreadsheet and a PDF. Your answers are saved, so it all appears the moment you unlock. No retake.</p>' +
      '<a class="btn big block" href="#pro">Unlock your full Mindprint \u2014 $10</a><a class="btn ghost block" href="#pro">Northpeak All-Access \u2014 $100, every app</a><a class="small center codeln" href="#pro">Have a code?</a></div>';
    html += locked.map(function (x, k) { var w = [72, 45, 88, 30, 61, 54, 80];
      return '<div class="card locked"><div class="lockhd">' + LOCK + '<h2>' + esc(x[1]) + '</h2><span class="pill">Pro</span></div><div class="blur" aria-hidden="true"><p>' + esc(FILL[k % FILL.length]) + ' ' + esc(FILL[(k + 3) % FILL.length]) + '</p>' +
        '<div class="br"><div class="bl"><span>\u2588\u2588\u2588\u2588\u2588\u2588</span><b>\u2588\u2588</b></div><div class="bt"><i style="width:' + w[k % 7] + '%"></i></div></div><div class="br"><div class="bl"><span>\u2588\u2588\u2588\u2588</span><b>\u2588\u2588</b></div><div class="bt"><i style="width:' + w[(k + 2) % 7] + '%"></i></div></div></div>' +
        '<a class="unlk" href="#pro">' + LOCK + ' Unlock</a></div>'; }).join('');
    html += '<div class="card cta"><a class="btn big block" href="#pro">Unlock your full Mindprint \u2014 $10</a></div>';
    html += signed() ? '<p class="muted small center">Saved to your account.</p>' : '<div class="card"><p><b>Keep these results.</b> Sign in or create a free Northpeak account to keep them in your history on any device.</p><a class="btn ghost block" href="#account">Sign in to save</a></div>';
    html += '<div class="row2"><a class="btn ghost" href="#start">Retake</a><a class="btn ghost" href="#history">History</a></div><p class="muted small center">Not a diagnosis \u2014 for fun and self-reflection.</p>';
    V.innerHTML = html;
  }
  function resultsPage(id) {
    var r = byId(id) || results('main')[0]; if (!r) { location.hash = '#start'; return; }
    if (!full()) { teaserPage(r); return; }
    var sc = scoreOf(r), sm = S.summaries(sc), hl = S.headlines(sc), nm = r.name ? esc(r.name) + '\u2019s' : 'Your';
    var html = '<div class="rhead"><p class="eyebrow">' + nm + ' Mindprint \u00b7 ' + fmtDate(r.at) + '</p><h1>' + (hl.length ? esc(hl[0].title) : 'Your results') + '</h1>' +
      (hl.length > 1 ? '<div class="chips">' + hl.slice(1).map(function (h) { return '<span class="chip">' + esc(h.title) + '</span>'; }).join('') + '</div>' : '') + '</div>';
    sm.forEach(function (s) {
      if (s.id === 'big5') html += '<div class="card"><h2>' + esc(s.title) + '</h2><p class="muted">' + esc(s.text) + '</p>' + s.items.map(function (it) {
        return '<div class="trait"><div class="bl"><span>' + esc(it.name) + '</span><b>' + it.pct + ' \u00b7 ' + esc(it.band) + '</b></div><div class="bt"><i style="width:' + Math.max(3, it.pct) + '%"></i></div><p>' + esc(it.text) + '</p>' +
          '<details class="fold"><summary>Facets</summary>' + bars(sc, Object.keys(sc.scales).filter(function (k) { return k.indexOf(it.key + '_') === 0; })) + '</details></div>'; }).join('') + '</div>';
      else html += '<div class="card"><h2>' + esc(s.title) + '</h2><p>' + esc(s.text) + '</p>' + (s.id === 'attach' ? bars(sc, ['att_anxiety', 'att_avoidance']) : bars(sc, s.keys.slice(0, 6))) + '</div>';
    });
    html += '<div class="card deepcard"><p class="tag">Pro</p><h2>Go deeper</h2><p>Get the full written report: what your results say about your strengths, blind spots, relationships, stress and school or work fit, plus the Deep Dive into your childhood and family, a spreadsheet of every answer and a printable PDF.</p>' +
      (pro() ? '<a class="btn block" href="#report/' + encodeURIComponent(r.id) + '">Open your full report</a><a class="btn ghost block" href="#deep">Deep Dive</a>' : '<a class="btn block" href="#pro">Unlock Mindprint Pro \u00b7 $10</a>') + '</div>';
    html += signed() ? '<p class="muted small center">Saved to your account.</p>' : '<div class="card"><p><b>Keep these results.</b> Sign in or create a free Northpeak account to keep them in your history on any device.</p><a class="btn ghost block" href="#account">Sign in to save</a></div>';
    html += '<div class="row2"><a class="btn ghost" href="#start">Retake</a><a class="btn ghost" href="#history">History</a></div><p class="muted small center">Not a diagnosis \u2014 for fun and self-reflection.</p>';
    V.innerHTML = html;
  }
  function history() {
    var rs = results();
    V.innerHTML = '<h1 class="pt">Your results</h1>' + (rs.length && !full() && results('main').length ? '<div class="card cta"><p>Your answers are saved. Unlock Pro and your full results show up here instantly, no retake.</p><a class="btn block" href="#pro">Unlock your full Mindprint \u2014 $10</a></div>' : '') + (rs.length ? rs.map(function (r) {
      var lk = r.kind === 'main' && !full(), t = r.kind === 'deep' ? 'Deep Dive' : lk ? ((r.teaser && r.teaser.title) || 'Mindprint') : (function () { var h = S.headlines(scoreOf(r)); return h.length ? h[0].title : 'Mindprint'; })();
      return '<a class="hrow" href="' + (r.kind === 'deep' ? deepLink(r) : '#results/' + encodeURIComponent(r.id)) + '"><b>' + esc(t) + (lk ? ' <span class="pill">' + LOCK + ' Full results locked</span>' : '') + '</b><span>' + (r.kind === 'deep' ? 'Childhood & family' : 'Main quiz') + ' \u00b7 ' + fmtDate(r.at) + '</span></a>'; }).join('')
      : '<div class="card"><p>No results yet.</p><a class="btn block" href="#start">Take the quiz</a></div>') +
      (signed() ? '<p class="muted small center">Your history is saved to your account.</p>' : '<p class="muted small center">These are saved on this device only. <a href="#account">Sign in</a> to keep them in your account.</p>');
    if (signed()) sync().then(function () { if (location.hash === '#history' && results().length !== rs.length) history(); });
  }

  /* ---------- Deep Dive (Pro) ---------- */
  function deepIntro() {
    if (!pro()) { location.hash = '#pro'; return; }
    var main = results('main')[0], fl = main && scoreOf(main) ? S.flags(scoreOf(main)) : [], prog = LS.get('deepq', null);
    var done = results('deep')[0];
    V.innerHTML = (done ? '<div class="card"><p class="tag">Your Deep Dive</p><h2>Finished ' + esc(fmtDate(done.at)) + '</h2><p>You answered ' + done.answers.length + ' of 50.</p><a class="btn block" id="seed" href="' + deepLink(done) + '">See your Deep Dive results</a></div>' : '') +
      '<div class="card"><p class="tag">Deep Dive</p><h1 class="pt">Childhood &amp; Family</h1><p>50 questions about where you come from: early memories, home, your family, growing up and how it shaped who you are now. Most are typed answers.</p>' +
      '<ul class="care"><li><b>Every question is optional.</b> Tap Skip on anything you don\u2019t want to answer.</li><li>It works for any kind of family. Answer for whoever raised you.</li><li>Don\u2019t include names, addresses or anything that identifies someone.</li></ul>' +
      (main ? (fl.length ? '<p class="muted small">Some questions are written around your results: ' + esc(fl.map(function (f) { return D.flags[f]; }).join('; ').toLowerCase()) + '.</p>' : '') : '<p class="muted small">Tip: take the main quiz first and some questions will be tailored to your results.</p>') +
      '<label class="ck"><input type="checkbox" id="ok"><span>' + esc(PRIV) + '</span></label><p class="muted small">' + DISC + '</p>' +
      (prog && prog.i > 0 ? '<button class="btn big block" id="cont">Continue (' + (prog.i + 1) + ' of 50)</button><button class="btn ghost block" id="go">Start over</button>' : '<button class="btn ' + (done ? 'ghost' : 'big') + ' block" id="go">' + (done ? 'Take it again' : 'Start the Deep Dive') + '</button>') + '</div>';
    var gate = function () { var ok = $('#ok').checked; V.querySelectorAll('#go,#cont').forEach(function (b) { b.disabled = !ok; }); }; $('#ok').onchange = gate; gate();
    $('#go').onclick = function () { if (!$('#ok').checked) return; LS.set('deepq', { i: 0, answers: {}, flags: fl, main: main ? main.id : null, t: Date.now(), ok: true }); location.hash = '#deepq'; };
    if ($('#cont')) $('#cont').onclick = function () { if (!$('#ok').checked) return; location.hash = '#deepq'; };
  }
  /* where a finished Deep Dive's results show: the full report of its own main quiz (or the latest one), else the Deep Dive on its own */
  function deepLink(d) { var m = d && d.main && byId(d.main) ? d.main : (results('main')[0] || {}).id; return m ? '#report/' + encodeURIComponent(m) : '#deepres/' + encodeURIComponent(d ? d.id : ''); }
  function deepView(q, fl) { var a = q.alt && fl.indexOf(q.alt.flag) >= 0 ? q.alt : null; return { intro: a && a.intro, text: (a && a.text) || q.text }; }
  function deepQ() {
    if (!pro()) { location.hash = '#pro'; return; }
    var st = LS.get('deepq', null); if (!st) { location.hash = '#deep'; return; }
    var qs = D.questions, i = Math.min(st.i, qs.length - 1), q = qs[i], v = st.answers[q.id], dv = deepView(q, st.flags || []); busy = true;
    var input = '';
    if (q.type === 'text' || q.type === 'finish') input = '<textarea id="ta" rows="5" maxlength="2000" placeholder="' + (q.type === 'finish' ? 'Finish the sentence\u2026' : 'Type as much or as little as you like') + '">' + esc(typeof v === 'string' ? v : '') + '</textarea>';
    else if (q.type === 'choice') input = '<div class="opts">' + q.options.map(function (o, k) { return '<button class="opt' + (v === k ? ' sel' : '') + '" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') + '</div>';
    else if (q.type === 'multi') input = '<div class="opts multi">' + q.options.map(function (o, k) { return '<button class="opt' + (Array.isArray(v) && v.indexOf(k) >= 0 ? ' sel' : '') + '" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') + '</div>';
    else if (q.type === 'scale') input = '<div class="scale">' + [1, 2, 3, 4, 5].map(function (k) { return '<button class="opt' + (v === k ? ' sel' : '') + '" data-k="' + k + '">' + k + '</button>'; }).join('') + '</div><div class="ends"><span>' + esc(q.scale[0]) + '</span><span>' + esc(q.scale[1]) + '</span></div>';
    V.innerHTML = '<div class="qtop"><button class="back" id="bk"' + (i ? '' : ' disabled') + '>\u2039 Back</button><span class="count">' + (i + 1) + ' / ' + qs.length + '</span></div><div class="bar"><i style="width:' + Math.round(100 * i / qs.length) + '%"></i></div>' +
      '<div class="qcard"><p class="tag">' + esc(q.section) + '</p>' + (dv.intro ? '<p class="intro">' + esc(dv.intro) + '</p>' : '') + '<h2 class="q">' + esc(dv.text) + '</h2>' + (q.hint ? '<p class="muted small">' + esc(q.hint) + '</p>' : '') + input +
      '<div class="row2"><button class="btn ghost" id="sk">Skip</button><button class="btn" id="nx">' + (i + 1 >= qs.length ? 'Finish' : 'Next') + '</button></div></div>';
    function next(val) { if (val === undefined || val === '' || (Array.isArray(val) && !val.length)) delete st.answers[q.id]; else st.answers[q.id] = val; if (i + 1 >= qs.length) { LS.set('deepq', st); deepEnd(); } else { st.i = i + 1; LS.set('deepq', st); deepQ(); } }
    $('#bk').onclick = function () { var ta = $('#ta'); if (ta && ta.value.trim()) st.answers[q.id] = ta.value.trim(); st.i = Math.max(0, i - 1); LS.set('deepq', st); deepQ(); };
    $('#sk').onclick = function () { st.answers[q.id] = null; if (i + 1 >= qs.length) { LS.set('deepq', st); deepEnd(); } else { st.i = i + 1; LS.set('deepq', st); deepQ(); } };
    var cur = v;
    var box = V.querySelector('.opts,.scale');
    if (box) box.onclick = function (e) { var b = e.target.closest('.opt'); if (!b) return; var k = +b.dataset.k;
      if (q.type === 'multi') { cur = Array.isArray(cur) ? cur.slice() : []; var at = cur.indexOf(k); if (at >= 0) cur.splice(at, 1); else cur.push(k); b.classList.toggle('sel'); }
      else { cur = k; box.querySelectorAll('.opt').forEach(function (x) { x.classList.toggle('sel', x === b); }); } };
    $('#nx').onclick = function () { var ta = $('#ta'); next(ta ? ta.value.trim() : cur); };
  }
  function deepEnd() {
    var st = LS.get('deepq', null); if (!st) { location.hash = '#deep'; return; }
    var n = Object.keys(st.answers).filter(function (k) { return st.answers[k] != null; }).length;
    V.innerHTML = '<div class="card"><h1 class="pt">That\u2019s all 50.</h1><p>You answered ' + n + ' and skipped ' + (50 - n) + '. Thanks for sharing as much as you did.</p>' +
      '<p class="soft">If any of these questions brought up hard feelings, it can really help to talk to someone you trust, like a friend, a family member, a teacher or a school counselor.</p>' +
      '<label class="ck"><input type="checkbox" id="ok" checked><span>' + esc(PRIV) + '</span></label><button class="btn big block" id="save">Save and see my report</button><button class="btn ghost block" id="rev">Go back and review</button></div>';
    $('#rev').onclick = function () { st.i = 0; LS.set('deepq', st); deepQ(); };
    $('#ok').onchange = function () { $('#save').disabled = !this.checked; };
    $('#save').onclick = function () { if (!$('#ok').checked) return;
      var ans = D.questions.filter(function (q) { return st.answers[q.id] != null; }).map(function (q) { return { q: q.id, v: st.answers[q.id], t: deepView(q, st.flags || []).text }; });
      var r = { id: rid(), kind: 'deep', at: Date.now(), name: LS.get('name', ''), answers: ans, flags: st.flags || [], main: st.main || null, qv: D.version || 1 };
      DB.put(r); LS.set('deepq', null); submit(r, { flags: r.flags, main_id: r.main }); sync();
      location.hash = deepLink(r);
    };
  }

  /* ---------- full report (Pro) ---------- */
  function report(id) {
    if (!pro()) { location.hash = '#pro'; return; }
    var r = byId(id) || results('main')[0], deep = results('deep')[0] || null;
    if (!r) { location.hash = deep ? '#deepres/' + encodeURIComponent(deep.id) : '#start'; return; }
    if (!window.MPReport || !KEYED) { V.innerHTML = '<div class="card"><p>Loading your report\u2026</p></div>'; if (!KEYED) ensureKey().then(function () { if (!/^#report/.test(location.hash)) return; if (KEYED) report(id); else { V.innerHTML = '<div class="card"><p>Couldn\u2019t load your full report. Check your connection and try again.</p><button class="btn block" id="rt">Try again</button>' + (deep ? '<a class="btn ghost block" href="#deepres/' + encodeURIComponent(deep.id) + '">See just your Deep Dive</a>' : '') + '</div>'; $('#rt').onclick = function () { report(id); }; } }); return; }
    V.innerHTML = window.MPReport.html(Q, D, r, scoreOf(r), deep) +
      '<div class="noprint card"><h2>Take it with you</h2><button class="btn block" id="xl">Download spreadsheet (.xlsx)</button><button class="btn ghost block" id="pr">Save as PDF / print</button>' +
      '<p class="muted small">On iPhone: tap Save as PDF, then Share \u2192 Save to Files.</p>' + (deep ? '' : '<a class="btn ghost block" href="#deep">Add the Deep Dive to this report</a>') + '</div>';
    $('#xl').onclick = function () { try { window.MPXlsx.download(Q, D, r, scoreOf(r), deep); } catch (e) { toast('Couldn\u2019t make the spreadsheet.'); } };
    $('#pr').onclick = function () { window.print(); };
  }

  /* ---------- Deep Dive results on their own (Pro) ---------- */
  function deepResults(id) {
    if (!pro()) { location.hash = '#pro'; return; }
    var d = byId(id); if (!d || d.kind !== 'deep') d = results('deep')[0]; if (!d) { location.hash = '#deep'; return; }
    var main = d.main && byId(d.main) ? byId(d.main) : results('main')[0];
    if (!window.MPReport) { V.innerHTML = '<div class="card"><p>Loading your results\u2026</p></div>'; return; }
    V.innerHTML = window.MPReport.deepHtml(Q, D, d, main && KEYED ? scoreOf(main) : null, d.name || LS.get('name', '')) +
      '<div class="noprint card">' + (main ? '<h2>Your full report</h2><p>See your Deep Dive next to your quiz results: strengths, blind spots, relationships and more.</p><a class="btn block" href="#report/' + encodeURIComponent(main.id) + '">Open your full report</a>'
        : '<h2>Connect it to your personality</h2><p>Take the main quiz and your full report will tie your Deep Dive to your results.</p><a class="btn block" href="#start">Take the main quiz</a>') +
      '<button class="btn ghost block" id="pr">Save as PDF / print</button><p class="muted small">On iPhone: tap Save as PDF, then Share \u2192 Save to Files.</p></div>';
    $('#pr').onclick = function () { window.print(); };
  }

  /* ---------- account ---------- */
  var ERR = { wrong: 'Wrong email or password.', np_exists: 'That email already has a Northpeak account with a different password. Sign in with that password.', bad_email: 'That doesn\u2019t look like an email.', taken: 'That email already has an account. Sign in instead.', slow_down: 'Too many tries. Wait a few minutes and try again.', offline: 'You look offline.', locked: 'Too many wrong tries. Wait 15 minutes.', bad_code: 'That code isn\u2019t valid.', used: 'That code is already used on another account.', np_taken: 'That email belongs to another Northpeak account.', same: 'That\u2019s already your email.', wrong_email: 'This owner code is linked to another account.', bad_phone: 'Add the phone number on your Apple Cash.', bad_name: 'Add your name.', short: 'Use at least 8 characters for your password.' };
  var em = function (e) { return ERR[e && e.message] || 'Something went wrong (' + esc((e && e.message) || 'error') + ').'; };
  function planLine() { var a = C().acct; if (a.owner) return 'Owner \u00b7 everything unlocked'; if (a.pro && (a.allAccess || /^bot:/.test(a.via || ''))) return 'Northpeak All-Access'; if (a.pro) return 'Mindprint Pro'; return 'Free'; }
  function whenCloud(fn) { if (C()) fn(); else { V.innerHTML = '<div class="card"><p>Loading\u2026</p></div>'; window.addEventListener('cloud-ready', function () { fn(); }, { once: true }); } }
  function account() { whenCloud(function () {
    if (!signed()) {
      V.innerHTML = '<div class="card"><h1 class="pt">Sign in</h1><p class="muted">One Northpeak account works in every Northpeak app: Synapse, Axon, Liminal, Cadence and Mindprint. All-Access carries over.</p>' +
        '<label>Email<input id="ae" type="email" autocomplete="username" autocapitalize="none" spellcheck="false"></label><label>Password<input id="ap" type="password" autocomplete="current-password"></label>' +
        '<button class="btn big block" id="li">Sign in</button><button class="btn ghost block" id="su">Create account</button><p id="am" class="muted"></p>' +
        '<p class="muted small">Your password never leaves this device. Your answers are saved to your account and to Northpeak Studios.</p></div>';
      var go = function (kind) { var e = $('#ae').value.trim(), p = $('#ap').value; if (!e || !p) return $('#am').textContent = 'Add your email and password.'; if (kind === 'signup' && p.length < 8) return $('#am').textContent = ERR.short;
        $('#am').textContent = kind === 'signup' ? 'Creating your account\u2026' : 'Signing in\u2026'; $('#li').disabled = $('#su').disabled = true;
        C().auth(kind, e, p).then(function (j) { return C().linkNorthpeak(e, p, j.northpeak).then(function () { return C().refresh(true); }); }).then(function () { return sync(); }).then(imports)
          .then(function () { toast('Signed in'); account(); }).catch(function (x) { $('#am').textContent = em(x); $('#li').disabled = $('#su').disabled = false; }); };
      $('#li').onclick = function () { go('login'); }; $('#su').onclick = function () { go('signup'); };
      return;
    }
    var a = C().acct;
    V.innerHTML = '<div class="card"><h1 class="pt">Account</h1><p><b>' + esc(a.user) + '</b></p><p class="plan">' + esc(planLine()) + '</p>' + (pro() ? '' : '<a class="btn block" href="#pro">Unlock Pro</a>') +
      '<p class="muted small">' + results().length + ' saved result' + (results().length === 1 ? '' : 's') + ' \u00b7 <a href="#history">History</a></p></div>' +
      '<div class="card"><h2>Unlock code</h2><p class="muted small">Have a Mindprint, All-Access, owner or bot code? Enter it here.</p><label>Code<input id="cd" autocapitalize="characters" spellcheck="false" placeholder="MND-XXXX-XXXX or SYN-XXXX-XXXX"></label><button class="btn ghost block" id="rd">Redeem</button><p id="rm" class="muted"></p></div>' +
      '<div class="card"><h2>Settings</h2><details class="fold"><summary>Change email</summary><p class="muted small">Your login changes to the new email everywhere on Northpeak, and the old one stops working.</p><label>New email<input id="ne" type="email" autocapitalize="none" spellcheck="false"></label><label>Password<input id="np" type="password" autocomplete="current-password"></label><button class="btn ghost block" id="ce">Change email</button><p id="cm" class="muted"></p></details>' +
      '<details class="fold"><summary>Delete account</summary><p class="muted small">Deletes your Mindprint account and every saved result. Your Northpeak account in other apps is not touched.</p><label>Password<input id="dp" type="password" autocomplete="current-password"></label><button class="btn danger block" id="da">Delete my Mindprint account</button><p id="dm" class="muted"></p></details>' +
      '<button class="btn ghost block" id="lo">Sign out</button></div>';
    $('#rd').onclick = function () { var v = $('#cd').value.trim(); if (!v) return; $('#rm').textContent = 'Checking\u2026'; C().redeem(v).then(function () { return C().refresh(true); }).then(function () { toast('Unlocked'); account(); }).catch(function (x) { $('#rm').textContent = em(x); }); };
    $('#ce').onclick = function () { var e = $('#ne').value.trim(), p = $('#np').value; if (!e || !p) return; $('#cm').textContent = 'Changing\u2026'; C().changeEmail(e, p).then(function (j) { $('#cm').textContent = 'Done. You now sign in with ' + j.email + '.'; setTimeout(account, 1500); }).catch(function (x) { $('#cm').textContent = em(x); }); };
    $('#da').onclick = function () { var p = $('#dp').value; if (!p || !confirm('Delete your Mindprint account and all saved results? This can\u2019t be undone.')) return; C().deleteAccount(p).then(function () { LS.set('results', []); toast('Account deleted'); location.hash = '#home'; }).catch(function (x) { $('#dm').textContent = em(x); }); };
    $('#lo').onclick = function () { sync().then(function () { return C().logout(); }).then(function () { LS.set('results', []); LS.set('deepq', null); toast('Signed out'); location.hash = '#home'; }); };
    C().refresh(false).then(function (j) { if (j && location.hash === '#account') { var p = $('.plan'); if (p) p.textContent = planLine(); } });
  }); }

  /* ---------- Pro ---------- */
  function proPage() { whenCloud(function () {
    var a = C().acct, req = a.request;
    var what = '<div class="card"><p class="tag">Mindprint Pro</p><h1 class="pt">Unlock your full Mindprint</h1><ul class="care"><li><b>Your full results:</b> every trait across all 7 frameworks, from the quiz you already took. No retake.</li><li><b>Deep Dive:</b> 50 questions about your childhood and family, tailored to your results. Every one is optional.</li><li><b>Full written report</b> that ties both quizzes together: strengths, blind spots, relationships, stress, school and work fit.</li><li><b>Spreadsheet</b> (.xlsx) of every answer and score.</li><li><b>Printable PDF</b> of your report.</li></ul></div>';
    if (pro()) { V.innerHTML = what + '<div class="card"><p><b>Pro is on.</b> (' + esc(planLine()) + ')</p>' + (results('main')[0] ? '<a class="btn block" href="#results/' + encodeURIComponent(results('main')[0].id) + '">See your full results</a>' : '') + '<a class="btn ghost block" href="#deep">Open the Deep Dive</a>' + (results('main')[0] ? '<a class="btn ghost block" href="#report/' + encodeURIComponent(results('main')[0].id) + '">Open your full report</a>' : '') + '</div>'; return; }
    if (!signed()) { V.innerHTML = what + '<div class="card"><p>Sign in or create a free Northpeak account first, so Pro is tied to your account.</p><a class="btn big block" href="#account">Sign in or create account</a></div>'; return; }
    if (req && req.status === 'new') { V.innerHTML = what + '<div class="card"><p><b>Request sent</b> (' + esc(req.price || '') + ').' + (req.phone ? ' You\u2019ll get an Apple Cash request at <b>' + esc(req.phone) + '</b>.' : ' You\u2019ll get an Apple Cash request soon.') + ' Pay it and Pro turns on here by itself.</p><button class="btn ghost block" id="chk">Check now</button></div>';
      $('#chk').onclick = function () { C().refresh(true).then(function () { proPage(); if (pro()) toast('Pro is on'); }); }; return; }
    V.innerHTML = what + '<div class="card"><div class="plans"><label class="pplan"><input type="radio" name="pl" value="mindprint_pro" checked><b>Mindprint Pro</b><span>$10 once \u00b7 full results, Deep Dive, report, spreadsheet + PDF</span></label>' +
      '<label class="pplan"><input type="radio" name="pl" value="all_access"><b>Northpeak All-Access</b><span>$100 once \u00b7 Mindprint + Synapse + Axon + Liminal + Cadence + every future app</span></label></div>' +
      '<p class="muted small">Paid with Apple Cash: send your name and the phone number on your Apple Cash. You\u2019ll get a request, and Pro turns on when it\u2019s paid.</p>' +
      '<label>Your name<input id="pn" autocomplete="name" maxlength="80"></label><label>Apple Cash phone number<input id="pp" autocomplete="tel" inputmode="tel" maxlength="40"></label><button class="btn big block" id="pgo">Request Pro</button><p id="pm" class="muted"></p>' +
      '<details class="fold"><summary>Have a code?</summary><label>Code<input id="cd" autocapitalize="characters" spellcheck="false"></label><button class="btn ghost block" id="rd">Redeem</button><p id="rm" class="muted"></p></details></div>';
    $('#pgo').onclick = function () { var n = $('#pn').value.trim(), ph = $('#pp').value.trim(), pl = ($('input[name=pl]:checked') || {}).value; if (!n || ph.replace(/\D/g, '').length < 7) return $('#pm').textContent = 'Add your name and your Apple Cash phone number.';
      $('#pm').textContent = 'Sending\u2026'; C().requestPro(pl, n, ph).then(function () { C().acct.request.phone = ph; proPage(); }).catch(function (x) { $('#pm').textContent = em(x); }); };
    $('#rd').onclick = function () { var v = $('#cd').value.trim(); if (!v) return; $('#rm').textContent = 'Checking\u2026'; C().redeem(v).then(function () { return C().refresh(true); }).then(function () { toast('Unlocked'); proPage(); }).catch(function (x) { $('#rm').textContent = em(x); }); };
  }); }

  /* ---------- boot ---------- */
  function onCloud() {
    C().onAccountChange(function () { var h = location.hash; if (/^#(account|pro|home|history|results.*)?$/.test(h) || h === '') route(); });
    if (signed()) C().refresh(true).then(function () { return sync(); }).then(imports).then(function () { var h = location.hash; if (/^#(home|history|pro|deep|results.*|deepres.*|report.*)?$/.test(h)) route(); });
  }
  flush();
  if (C()) onCloud(); else window.addEventListener('cloud-ready', onCloud, { once: true });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && signed()) C().refresh(false); });
  route();
})();
