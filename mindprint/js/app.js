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
    var rich = r.answers.map(function (x) { if (r.kind === 'main' || r.kind === 'addon') { var q = (r.kind === 'addon' ? (A && A.questions) || [] : Q.questions).find(function (z) { return z.id === x.q; }); return { q: x.q, a: x.a, o: x.a === -1 ? x.o || '' : undefined, question: q ? q.text : '', answer: x.a === -1 ? 'Other: ' + (x.o || '') : q && q.options[x.a] ? q.options[x.a].t : '' }; }
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
  function loadQ() { return Q ? Promise.resolve(Q) : fetch('data/questions.json?v=6').then(function (r) { return r.json(); }).then(function (j) { Q = j; S.setNames(j.scales); return Q; }); }
  function loadD() { return D ? Promise.resolve(D) : fetch('data/deep.json?v=6').then(function (r) { return r.json(); }).then(function (j) { D = j; return D; }); }
  function scoreOf(r) { return KEYED ? S.score(Q, r.answers) : null; }
  function fmtDate(t) { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  function toast(msg) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600); }
  window.npUpdate.toast = function (msg, onTap) { var t = document.createElement('button'); t.className = 'toast'; t.textContent = msg; t.onclick = function () { t.remove(); if (onTap) onTap(); }; document.body.appendChild(t); };

  /* the account module loads as a separate script: wait for it (briefly) so a fresh load on #deep or #report sees a Pro account as Pro */
  var cloudReady = new Promise(function (ok) { if (C()) return ok(); window.addEventListener('cloud-ready', function () { ok(); }, { once: true }); setTimeout(ok, 4000); });
  /* ---------- router ---------- */
  function route() {
    busy = false; window.scrollTo(0, 0);
    var h = (location.hash || '#home').slice(1).split('#')[0].split('/'), r = h[0] || 'home', arg = decodeURIComponent(h.slice(1).join('/'));
    document.querySelectorAll('.tabbar a').forEach(function (a) { var t = a.getAttribute('href').slice(1); a.classList.toggle('on', t === r || (a.dataset.also || '').split(' ').indexOf(r) >= 0); });
    var f = { home: home, start: start, quiz: quiz, results: resultsPage, history: history, deep: deepIntro, deepq: deepQ, deepres: deepResults, report: report, account: account, pro: proPage, types: typesHub, sharpen: sharpen }[r] || home;
    Promise.all([loadQ(), cloudReady, r.indexOf('deep') === 0 || r === 'report' || r === 'history' ? loadD() : null, /^(types|sharpen|results|report|history)$/.test(r) ? loadA() : null]).then(ensureKey).then(function () { f(arg); }).catch(function () { V.innerHTML = '<div class="card"><p>Couldn\u2019t load Mindprint. Check your connection and try again.</p></div>'; });
  }
  window.addEventListener('hashchange', route);

  /* ---------- home ---------- */
  function home() {
    var last = results('main')[0], prog = LS.get('quiz', null), dprog = LS.get('deepq', null);
    V.innerHTML = '<section class="hero"><p class="eyebrow">Mindprint</p><h1>What do your answers say about <span class="grad">you</span>?</h1>' +
      '<p class="lede">77 quick questions built on real psychology: the Big Five, attachment, conflict style, values, stress and how you decide. About 10 minutes.</p><p class="freeline">Free to take \u2014 full results with Pro</p>' +
      (prog && prog.i > 0 ? '<a class="btn big block" href="#quiz">Continue the quiz (' + Math.min(prog.i + 1, Q.questions.length) + ' of ' + Q.questions.length + ')</a>' : '<a class="btn big block" href="#start">' + (last ? 'Take it again' : 'Start the quiz') + '</a>') +
      (last ? '<a class="btn ghost block" href="#results/' + encodeURIComponent(last.id) + '">See your latest results</a>' : '') + '<p class="muted small">' + DISC + '</p></section>' +
      '<a class="card tyhome" href="#types"><p class="tag">New · Your types</p><h2>Your type, cluster and 10 more labels</h2><p class="muted">4-letter type, Enneagram-style, temperament, archetype, DISC colour, attachment and the cluster you belong to, all from the same quiz. No extra quiz needed.</p></a>' +
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
    var opts = q.options.map(function (o, k) { return '<button class="opt' + (st.answers[q.id] === k ? ' sel' : '') + '" data-k="' + k + '">' + esc(o.t) + '</button>'; }).join('') + (q.type === 'likert' ? '' : otherBtn(st.answers[q.id] === -1 ? (st.other || {})[q.id] || '' : null));
    V.innerHTML = '<div class="qtop"><button class="back" id="bk" aria-label="Back"' + (i ? '' : ' disabled') + '>\u2039 Back</button><span class="count">' + (i + 1) + ' / ' + qs.length + '</span></div>' +
      '<div class="bar"><i style="width:' + Math.round(100 * i / qs.length) + '%"></i></div>' +
      '<div class="qcard"><p class="tag">' + esc(TAGS[q.framework] || 'About you') + '</p><h2 class="q">' + esc(q.text) + '</h2><div class="opts' + (q.type === 'likert' ? ' likert' : '') + '">' + opts + '</div></div>';
    $('#bk').onclick = function () { st.i = Math.max(0, i - 1); LS.set('quiz', st); quiz(); };
    V.querySelector('.opts').onclick = function (e) {
      var b = e.target.closest('.opt'); if (!b || b.classList.contains('oth')) return;
      st.answers[q.id] = +b.dataset.k; b.classList.add('sel');
      setTimeout(function () { if (i + 1 >= qs.length) finishQuiz(st); else { st.i = i + 1; LS.set('quiz', st); quiz(); } }, 170);
      LS.set('quiz', st);
    };
    bindOther(function (t) { st.answers[q.id] = -1; st.other = st.other || {}; st.other[q.id] = t.slice(0, 300); LS.set('quiz', st); if (i + 1 >= qs.length) finishQuiz(st); else { st.i = i + 1; LS.set('quiz', st); quiz(); } });
  }
  function finishQuiz(st) {
    var ans = Q.questions.filter(function (q) { return st.answers[q.id] != null; }).map(function (q) { var a = st.answers[q.id]; return a === -1 ? { q: q.id, a: -1, o: ((st.other || {})[q.id] || '').slice(0, 300) } : { q: q.id, a: a }; });
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

  /* ---------- Your types hub (Odin, Oct 25 2026: "tell you your personality type and typology + what cluster you're in", then "add all of these… make the main quiz and deep dive influence…").
     Every system is estimated from answers already given (main quiz + Deep Dive + optional sharpen answers), with a confidence. Inferred, for fun. ---------- */
  var TYNOTE = 'Inferred from your answers, for fun. These are rough labels built from your quiz scores, not the official MBTI, Enneagram or DISC tests.';
  var APPURL = 'https://northpeakstudios.github.io/mindprint/';
  var A = null;
  function loadA() { return A ? Promise.resolve(A) : fetch('data/addon.json?v=6').then(function (r) { return r.json(); }).then(function (j) { A = j; return A; }).catch(function () { return null; }); }
  function addonRec() { return results('addon')[0] || null; }
  function tyOpts() { var d = results('deep')[0], ad = addonRec(); return { deep: d ? d.answers : [], addon: ad ? ad.answers : [], AQ: A }; }
  function typesOf(r) { return window.MPTypes ? window.MPTypes.fromScore(scoreOf(r), tyOpts()) : null; }
  function tyShareText(four, cl) { return 'My Mindprint: ' + four.code + ' \u201c' + four.name + '\u201d \u00b7 ' + cl.emoji + ' ' + cl.name + ' (' + cl.match + '% match). What\u2019s yours?'; }
  function tyBindShare(four, cl) {
    var b = $('#tyshare'); if (!b || !four || !cl) return;
    b.onclick = function () { var t = tyShareText(four, cl);
      if (navigator.share) { navigator.share({ title: 'My Mindprint', text: t, url: APPURL }).catch(function () {}); return; }
      try { navigator.clipboard.writeText(t + ' ' + APPURL).then(function () { toast('Copied \u2014 paste it anywhere'); }, function () { toast(t); }); } catch (e) { toast(t); } };
  }
  function tyHero(four, cl) {
    return '<div class="tyhero" style="--c:' + esc(cl.color) + '"><div class="tyemo" aria-hidden="true">' + esc(cl.emoji) + '</div><div><p class="tyk">Your cluster</p><h2>' + esc(cl.name) + '</h2><p class="tym">' + cl.match + '% match</p></div></div>' +
      '<p class="tyt">' + esc(cl.text) + '</p>' +
      '<div class="ty4"><div class="ty4c">' + esc(four.code) + '</div><div><p class="tyk">4-letter type \u00b7 MBTI-style</p><h3>' + esc(four.name) + '</h3></div></div><p class="tyt">' + esc(four.text) + '</p>';
  }
  function tyMini(rows) { return rows.map(function (x) { return '<div class="br"><div class="bl"><span>' + esc(x[0]) + '</span><b>' + esc(String(x[1])) + '</b></div><div class="bt"><i style="width:' + Math.max(3, Math.min(100, x[2])) + '%' + (x[3] ? ';background:' + x[3] : '') + '"></i></div></div>'; }).join(''); }
  function confChip(c) { return c ? '<span class="cf cf-' + c.word + '">' + esc(c.word) + ' confidence \u00b7 ' + c.pct + '%</span>' : ''; }
  function tyActs(sys, c) {
    if (!A || !A.questions) return '';
    var qs = A.questions.filter(function (q) { return q.sys === sys; }); if (!qs.length) return '';
    var ad = addonRec(), done = {}; (ad ? ad.answers : []).forEach(function (a) { done[a.q] = 1; });
    var left = qs.filter(function (q) { return !done[q.id]; }).length, n = Math.min(A.sharpen || 3, left), nm = (A.systems[sys] || {}).name || 'this';
    return '<div class="tyacts">' + (left && c && c.pct < 80 ? '<a class="tyact pri" href="#sharpen/' + sys + '">Sharpen it \u00b7 ' + n + ' question' + (n > 1 ? 's' : '') + '</a>' : '') +
      '<a class="tyact" href="#sharpen/' + sys + '/full" aria-label="Take the full ' + esc(nm) + ' quiz">' + (left ? 'Full quiz \u00b7 ' + qs.length : 'Retake full quiz') + '</a></div>';
  }
  function tyRow(o) {
    return '<div class="tyr" id="ty-' + (o.sys || '') + '"><div class="tyb' + (/^[\x00-\x7f]+$/.test(o.badge) ? '' : ' emo') + '"' + (o.bstyle ? ' style="' + o.bstyle + '"' : '') + '>' + esc(o.badge) + '</div><div class="tyx"><p class="tyk">' + esc(o.kicker) + '</p><h3>' + esc(o.title) + '</h3><p>' + esc(o.text) + '</p>' +
      (o.meta ? '<p class="tymeta">' + esc(o.meta) + '</p>' : '') + confChip(o.conf) + (o.extra || '') + (o.sys ? tyActs(o.sys, o.conf) : '') + '</div></div>';
  }
  function spec(lo, hi, v) { return '<div class="tyl"><span class="' + (v < 50 ? 'on' : '') + '">' + esc(lo) + '</span><div class="tyline"><i style="left:' + v + '%"></i></div><span class="' + (v >= 50 ? 'on' : '') + '">' + esc(hi) + '</span></div>'; }
  /* compact card on the results page (Pro): headline + link to the hub */
  function typesCard(T) {
    if (!T) return '';
    return '<div class="card types"><p class="tag">Your types</p>' + tyHero(T.four, T.cluster) +
      '<div class="chips tychips"><span class="chip">' + esc('Enneagram ' + T.ennea.code) + '</span><span class="chip">' + esc(T.temper.emoji + ' ' + T.temper.name) + '</span><span class="chip">' + esc(T.arche.emoji + ' ' + T.arche.name) + '</span><span class="chip">' + esc('Big Five ' + T.sloan.code) + '</span><span class="chip">' + esc('DISC ' + T.disc.color) + '</span></div>' +
      '<a class="btn block" href="#types">See all your types</a><button class="btn ghost block" id="tyshare">Share my type</button><p class="muted small">' + esc(TYNOTE) + '</p></div>';
  }
  /* free: headline type + cluster (from the server's teaser), everything else locked */
  function typesFree(ty, hub) {
    if (!ty || !ty.four || !ty.cluster) return '';
    var h = '<div class="card types" id="types"><p class="tag">Your types</p>' + tyHero(ty.four, ty.cluster) + '<button class="btn ghost block" id="tyshare">Share my type</button><p class="muted small">' + esc(TYNOTE) + '</p></div>';
    var L = [['Types', 'Enneagram-style + wing, temperament, archetype, DISC colour, attachment'], ['Traits', 'Your Big Five spectra and code, plus every other scale'], ['Clusters', 'All 8 clusters and who you\u2019re most similar to'], ['Hierarchy', 'Your path: family \u2192 cluster \u2192 type \u2192 subtype'], ['Styles + tags', 'Decision style, learning style and your auto tags'], ['Sharpen', 'A few extra questions to make any result more accurate']];
    h += '<div class="card locked"><div class="lockhd">' + LOCK + '<h2>' + (hub ? 'The rest of your types' : '12 more ways to sort you') + '</h2><span class="pill">Pro</span></div><div class="blur" aria-hidden="true">' +
      L.map(function (x) { return '<div class="tyr"><div class="tyb">\u2588</div><div class="tyx"><p class="tyk">' + x[0] + '</p><h3>\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588</h3><p>' + x[1] + '</p></div></div>'; }).join('') + '</div><a class="unlk" href="#pro">' + LOCK + ' Unlock</a></div>';
    return h;
  }
  function typesHub() {
    var r = results('main')[0];
    if (!r) { V.innerHTML = '<h1 class="pt">Your types</h1><div class="card"><p>Every type here (4-letter type, Enneagram-style, temperament, archetype, cluster and more) comes from one quiz, so you only take it once.</p><a class="btn big block" href="#start">Take the quiz</a><p class="muted small">' + esc(TYNOTE) + '</p></div>'; return; }
    if (!full()) {
      var tz = r.teaser;
      if (!tz || !tz.types) { V.innerHTML = '<div class="card center"><div class="spin"></div><p>Working out your types\u2026</p></div>';
        fetch('https://mindprint.sites.tab.bot/api/mp/teaser', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers: r.answers }), cache: 'no-store', credentials: 'omit' })
          .then(function (x) { return x.json(); }).then(function (j) { if (j && j.teaser && j.teaser.types) { r.teaser = j.teaser; DB.put(r); if (location.hash === '#types') typesHub(); } else throw 0; })
          .catch(function () { V.innerHTML = '<div class="card"><p>Connect to the internet to see your types.</p><button class="btn block" id="rt">Try again</button></div>'; $('#rt').onclick = typesHub; }); return; }
      V.innerHTML = '<h1 class="pt">Your types</h1><p class="muted small">From your quiz on ' + fmtDate(r.at) + '.</p>' + typesFree(tz.types, true) +
        '<div class="card cta"><a class="btn big block" href="#pro">Unlock all your types \u2014 $10</a><a class="small center codeln" href="#pro">Have a code?</a></div>';
      tyBindShare(tz.types.four, tz.types.cluster); return;
    }
    var T = typesOf(r), f = T.four, cl = T.cluster, en = T.ennea, tp = T.temper, ar = T.arche, di = T.disc, at = T.attach, cg = T.cognitive, ls = T.learning, sl = T.sloan, sc = scoreOf(r), u = T.used;
    var from = ['your main quiz (' + fmtDate(r.at) + ')'].concat(u.deep ? ['your Deep Dive'] : []).concat(u.addon ? [u.addon + ' sharpen answer' + (u.addon > 1 ? 's' : '')] : []);
    var h = '<h1 class="pt">Your types</h1><p class="muted small">Built from ' + esc(S.list(from)) + '. The more you answer, the sharper every result gets.</p>';
    h += '<div class="card types"><p class="tag">Headline</p>' + tyHero(f, cl) + '<button class="btn ghost block" id="tyshare">Share my type</button></div>';
    /* Types */
    h += '<div class="card types"><p class="tag">\ud83e\udde9 Types</p><p class="muted small">Typologies put you in one box out of a set.</p>';
    h += tyRow({ sys: 'four', badge: f.code, kicker: '4-letter type \u00b7 MBTI-style', title: f.name, text: f.text, meta: 'Group: ' + f.group + ' (' + f.groupText + ')', conf: f.conf,
      extra: '<details class="fold"><summary>Letter by letter</summary>' + f.letters.map(function (l, i) { var pr = [['E', 'I'], ['N', 'S'], ['F', 'T'], ['J', 'P']][i]; return spec(pr[1], pr[0], l.score) + '<p class="tymeta">' + esc(l.letter + ' = ' + l.word + ', ' + l.strength + ' (' + l.from + ' ' + Math.round(l.score) + '/100)') + '</p>'; }).join('') + '</details>' });
    h += tyRow({ sys: 'ennea', badge: en.code, kicker: 'Enneagram-style type + wing', title: 'Type ' + en.type + ': ' + en.name, text: en.text, meta: 'Wing ' + en.wing + ' (' + en.wingName + ') \u00b7 fit ' + en.match + '/100', conf: en.conf,
      extra: '<details class="fold"><summary>All 9 types</summary>' + tyMini(en.ranked.map(function (e) { return [e.n + ' ' + e.name, e.score, e.score]; })) + '</details>' });
    h += tyRow({ sys: 'temper', badge: tp.emoji, kicker: 'Classic temperament', title: tp.name, text: tp.text, meta: tp.share + '% ' + tp.name.toLowerCase() + ', then ' + tp.second.share + '% ' + tp.second.name.toLowerCase(), conf: tp.conf });
    h += tyRow({ sys: 'arche', badge: ar.emoji, kicker: 'Archetype \u00b7 Jungian-style', title: ar.name, text: ar.text, meta: 'Runner-up: ' + ar.second.name, conf: ar.conf,
      extra: '<details class="fold"><summary>All 12 archetypes</summary>' + tyMini(ar.ranked.map(function (a) { return [a.emoji + ' ' + a.name, a.score, a.score]; })) + '</details>' });
    h += tyRow({ sys: 'disc', badge: di.key, bstyle: 'background:' + di.hex + ';color:#14101f', kicker: 'DISC-style work style', title: di.name + ' \u00b7 ' + di.color, text: di.text, meta: (di.code.length > 1 ? 'Blend with ' : 'Backup style: ') + di.second.name + ' (' + di.second.color + ')', conf: di.conf,
      extra: '<div class="tydisc">' + di.shares.map(function (x) { return '<i style="flex:' + Math.max(1, x.share) + ';background:' + x.hex + '"></i>'; }).join('') + '</div><p class="tymeta">' + di.shares.map(function (x) { return x.key + ' ' + x.share + '%'; }).join(' \u00b7 ') + '</p>' });
    h += tyRow({ sys: 'attach', badge: at.emoji, kicker: 'Attachment style', title: at.name, text: (S.ATT[at.key] || {}).text || '', meta: 'Anxiety ' + at.anxiety + '/100 \u00b7 avoidance ' + at.avoidance + '/100', conf: at.conf });
    h += '</div>';
    /* Traits */
    var BN = { O: ['Practical', 'Curious'], C: ['Flexible', 'Organized'], E: ['Reserved', 'Outgoing'], A: ['Direct', 'Warm'], N: ['Calm', 'Sensitive'] };
    h += '<div class="card types"><p class="tag">\ud83d\udcca Traits</p><p class="muted small">Traits are spectra: everyone sits somewhere on each line.</p><h3 class="tyh">Big Five</h3>' +
      T.big5.map(function (b) { return spec(BN[b.key][0], BN[b.key][1], b.score) + '<p class="tymeta">' + esc(S.nm(b.key) + ' ' + b.score + '/100') + '</p>'; }).join('');
    h += tyRow({ badge: sl.code, kicker: 'Big Five code \u00b7 SLOAN-style', title: sl.code, text: sl.parts.map(function (x) { return x.letter + ' ' + x.word + (x.soft ? ' (leaning)' : ''); }).join(' \u00b7 '), meta: 'Capital = clearly that side, lowercase = leaning', conf: sl.conf });
    h += '<details class="fold"><summary>Other spectra</summary>' + bars(sc, ['att_anxiety', 'att_avoidance', 'dm_maximizer', 'dm_risk', 'E_sociability', 'N_anxiety', 'A_empathy', 'O_fantasy']) + '<a class="small" href="#results/' + encodeURIComponent(r.id) + '">All 40+ trait scores \u203a</a></details>';
    if (T.tags.length) h += '<h3 class="tyh">Your tags</h3><div class="chips">' + T.tags.map(function (t) { return '<span class="chip">#' + esc(t) + '</span>'; }).join('') + '</div><p class="tymeta">Auto labels for the traits furthest from the middle.</p>';
    h += '</div>';
    /* Clusters */
    h += '<div class="card types"><p class="tag">\ud83e\udec2 Clusters</p><p class="muted small">Clusters group people who score alike. Yours is the closest of 8 profiles.</p>' +
      tyRow({ sys: 'cluster', badge: cl.emoji, bstyle: 'background:' + cl.color, kicker: 'Your cluster', title: cl.name + ' \u00b7 ' + cl.match + '% match', text: cl.text, meta: 'Similar to: ' + cl.similar.map(function (c) { return c.emoji + ' ' + c.name + ' (' + c.match + '%)'; }).join(', '), conf: cl.conf }) +
      '<details class="fold"><summary>All 8 clusters</summary>' + tyMini(cl.ranked.map(function (c) { return [c.emoji + ' ' + c.name, c.match + '%', c.match, c.color]; })) + '<p class="tymeta">Match = how close your Big Five scores are to each profile. The profiles are hand-made, not measured groups of real people.</p></details></div>';
    /* Hierarchy */
    h += '<div class="card types"><p class="tag">\ud83c\udf33 Hierarchy</p><p class="muted small">Your path down the personality tree, from the widest group to the narrowest.</p><ol class="tytree">' +
      T.taxonomy.map(function (x) { return '<li><span class="tyk">' + esc(x.level) + '</span><b>' + esc(x.name) + '</b><small>' + esc(x.note) + '</small></li>'; }).join('') + '</ol></div>';
    /* Styles */
    h += '<div class="card types"><p class="tag">\ud83e\udde0 Styles</p>' +
      tyRow({ sys: 'cognitive', badge: cg.emoji, kicker: 'Decision / thinking style', title: cg.name, text: cg.text, meta: [cg.scope, cg.maximizer, cg.risk].filter(Boolean).join(' \u00b7 '), conf: cg.conf }) +
      tyRow({ sys: 'learning', badge: ls.emoji, kicker: 'Learning style preference', title: ls.name, text: ls.text, meta: 'Heads up: learning styles are popular, but research hasn\u2019t shown that studying in your \u201cstyle\u201d helps you learn more. Treat it as a preference.', conf: ls.conf }) + '</div>';
    h += '<div class="card"><details class="fold"><summary>How these are worked out</summary><ul class="care small">' +
      '<li><b>Everything starts from your main quiz scores</b> (0\u2013100 on each trait). A few Deep Dive answers about growing up nudge attachment, social energy and sensitivity a little. Sharpen answers then count alongside the quiz.</li>' +
      '<li><b>Confidence</b> = how clearly your answers point to one result and how many answers back it up. It is not a measure of accuracy.</li>' +
      '<li><b>4-letter type:</b> E/I from Extraversion, N/S from Openness, F/T from Agreeableness, J/P from Conscientiousness.</li>' +
      '<li><b>Enneagram-style, archetype, DISC-style, decision and learning style:</b> each option averages the traits that fit it; your top one wins.</li>' +
      '<li><b>Temperament:</b> the four classic temperaments mapped onto Extraversion and emotional sensitivity.</li>' +
      '<li><b>Cluster:</b> the nearest of 8 hand-made profiles on your Big Five.</li></ul></details><p class="muted small">' + esc(TYNOTE) + '</p></div>';
    V.innerHTML = h; tyBindShare(f, cl);
    var a0 = (location.hash.split('#')[2] || ''); if (a0 && $('#ty-' + a0)) $('#ty-' + a0).scrollIntoView({ block: 'center' });
  }
  /* sharpen: ask only the extra questions a system still needs (or its full set), "Other" on every non-type-only question */
  function sharpen(arg) {
    if (!pro()) { location.hash = '#pro'; return; }
    if (!A || !A.questions) { V.innerHTML = '<div class="card"><p>Couldn\u2019t load the questions. Check your connection.</p><a class="btn block" href="#types">Back to your types</a></div>'; return; }
    if (!results('main').length) { location.hash = '#types'; return; }
    var parts = String(arg || '').split('/'), sys = parts[0], fullQ = parts[1] === 'full', all = A.questions.filter(function (q) { return q.sys === sys; });
    if (!all.length) { location.hash = '#types'; return; }
    var st = LS.get('sharpen', null), ad = addonRec(), done = {}; (ad ? ad.answers : []).forEach(function (a) { done[a.q] = 1; });
    if (!st || st.sys !== sys || st.full !== fullQ) { var list = fullQ ? all : all.filter(function (q) { return !done[q.id]; }).slice(0, A.sharpen || 3); if (!list.length) list = all;
      st = { sys: sys, full: fullQ, list: list.map(function (q) { return q.id; }), i: 0, answers: {}, before: null }; var T0 = typesOf(results('main')[0]); st.before = T0 && T0[sys] && T0[sys].conf ? T0[sys].conf.pct : null; LS.set('sharpen', st); }
    var nm = (A.systems[sys] || {}).name || 'Your type';
    if (!LS.get('addonOk', false)) {
      V.innerHTML = '<div class="card"><p class="tag">Sharpen \u00b7 ' + esc(nm) + '</p><h2>' + st.list.length + ' quick question' + (st.list.length > 1 ? 's' : '') + '</h2><p class="muted">Only the ones this result still needs. Every answer also feeds your other types.</p>' +
        '<label class="ck"><input type="checkbox" id="ok"><span>' + esc(PRIV) + '</span></label><button class="btn big block" id="go" disabled>Start</button><a class="btn ghost block" href="#types">Not now</a></div>';
      $('#ok').onchange = function () { $('#go').disabled = !this.checked; }; $('#go').onclick = function () { if (!$('#ok').checked) return; LS.set('addonOk', true); sharpen(arg); }; return;
    }
    var byId = {}; A.questions.forEach(function (q) { byId[q.id] = q; });
    var i = Math.min(st.i, st.list.length - 1), q = byId[st.list[i]], cur = st.answers[q.id]; busy = true;
    var opts = q.options.map(function (o, k) { return '<button class="opt' + (cur && cur.a === k ? ' sel' : '') + '" data-k="' + k + '">' + esc(o.t) + '</button>'; }).join('') + (q.typeOnly ? '' : otherBtn(cur && cur.a === -1 ? cur.o : null));
    V.innerHTML = '<div class="qtop"><button class="back" id="bk"' + (i ? '' : ' disabled') + '>\u2039 Back</button><span class="count">' + (i + 1) + ' / ' + st.list.length + '</span></div><div class="bar"><i style="width:' + Math.round(100 * i / st.list.length) + '%"></i></div>' +
      '<div class="qcard"><p class="tag">Sharpen \u00b7 ' + esc(nm) + '</p><h2 class="q">' + esc(q.text) + '</h2><div class="opts">' + opts + '</div></div><a class="btn ghost block" href="#types">Stop here</a>';
    function go(val) { st.answers[q.id] = val; LS.set('sharpen', st); setTimeout(function () { if (i + 1 >= st.list.length) sharpenEnd(st); else { st.i = i + 1; LS.set('sharpen', st); sharpen(arg); } }, 170); }
    $('#bk').onclick = function () { st.i = Math.max(0, i - 1); LS.set('sharpen', st); sharpen(arg); };
    V.querySelector('.opts').onclick = function (e) { var b = e.target.closest('.opt'); if (!b || b.classList.contains('oth')) return; b.classList.add('sel'); go({ a: +b.dataset.k }); };
    bindOther(function (txt) { go({ a: -1, o: txt }); });
  }
  function sharpenEnd(st) {
    var ad = addonRec() || { id: rid(), kind: 'addon', at: Date.now(), name: LS.get('name', ''), answers: [], qv: (A && A.version) || 1 };
    var map = {}; ad.answers.forEach(function (a) { map[a.q] = a; });
    for (var k in st.answers) { var v = st.answers[k]; map[k] = v.a === -1 ? { q: k, a: -1, o: String(v.o || '').slice(0, 300) } : { q: k, a: v.a }; }
    ad.answers = Object.keys(map).map(function (k) { return map[k]; }); ad.at = Date.now();
    DB.put(ad); LS.set('sharpen', null); submit(ad, {}); sync(); busy = false;
    var T1 = typesOf(results('main')[0]), c1 = T1 && T1[st.sys] && T1[st.sys].conf ? T1[st.sys].conf.pct : null, nm = (A.systems[st.sys] || {}).name || 'Your type';
    toast(c1 != null && st.before != null && c1 !== st.before ? nm + ' confidence ' + st.before + '% \u2192 ' + c1 + '%' : nm + ' updated');
    location.hash = '#types#' + st.sys;
  }
  /* "Other — type your own" on multiple-choice questions (not on scales or type-only picks) */
  function otherBtn(val) { return '<button class="opt oth' + (val != null ? ' sel' : '') + '" type="button">Other \u2014 type your own</button><div class="othbox"' + (val != null ? '' : ' hidden') + '><input id="othtx" maxlength="300" placeholder="Your answer" value="' + esc(val || '') + '"><button class="btn" id="othok" type="button">Save answer</button></div>'; }
  function bindOther(done) {
    var b = V.querySelector('.opt.oth'); if (!b) return; var box = V.querySelector('.othbox'), tx = $('#othtx');
    b.onclick = function () { V.querySelectorAll('.opt').forEach(function (x) { x.classList.toggle('sel', x === b); }); box.hidden = false; tx.focus(); };
    $('#othok').onclick = function () { var t = tx.value.trim(); if (!t) { tx.focus(); return; } done(t); };
    tx.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); $('#othok').click(); } };
  }
  function teaserPage(r) {
    var tz = r.teaser, nm = r.name ? esc(r.name) + '\u2019s' : 'Your';
    if (!tz) {
      V.innerHTML = '<div class="card center"><div class="spin"></div><p>Reading your answers across 7 frameworks\u2026</p></div>';
      fetch('https://mindprint.sites.tab.bot/api/mp/teaser', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers: r.answers }), cache: 'no-store', credentials: 'omit' })
        .then(function (x) { return x.json(); }).then(function (j) { if (j && j.teaser) { r.teaser = j.teaser; DB.put(r); if (/^#results/.test(location.hash) || location.hash === '') teaserPage(r); } else throw 0; })
        .catch(function () { V.innerHTML = '<div class="card"><p>Your answers are saved. Connect to the internet to see your top trait.</p><button class="btn block" id="rt">Try again</button></div>'; $('#rt').onclick = function () { teaserPage(r); }; });
      return;
    }
    if (!tz.types && !r._tyTry) { r._tyTry = 1; fetch('https://mindprint.sites.tab.bot/api/mp/teaser', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers: r.answers }), cache: 'no-store', credentials: 'omit' })
      .then(function (x) { return x.json(); }).then(function (j) { if (j && j.teaser && j.teaser.types) { r.teaser = j.teaser; DB.put(r); if (/^#results/.test(location.hash) && !full()) teaserPage(r); } }).catch(function () {}); }
    var locked = (tz.locked && tz.locked.length ? tz.locked.map(function (x) { return [x.id, x.title]; }) : TEASE_DEF);
    var html = '<div class="rhead tease"><p class="eyebrow">' + nm + ' Mindprint \u00b7 ' + fmtDate(r.at) + '</p><p class="tag">Your top trait</p><h1>' + esc(tz.title) + '</h1><p class="lede">' + esc(tz.text) + '</p>' +
      (tz.more ? '<p class="muted small">+' + tz.more + ' more standout trait' + (tz.more > 1 ? 's' : '') + ' in your full results</p>' : '') + '</div>' +
      '<div class="fwk"><span><b>7</b> frameworks analyzed</span><span><b>' + (tz.answered || r.answers.length) + '</b> answers</span><span><b>40+</b> traits scored</span></div>'
    html += typesFree(tz.types);
    html += '<div class="card cta"><h2>Unlock your full Mindprint</h2><p>Every trait and what it means, how you love, fight, decide and cope, plus the Deep Dive, a written report, a spreadsheet and a PDF. Your answers are saved, so it all appears the moment you unlock. No retake.</p>' +
      '<a class="btn big block" href="#pro">Unlock your full Mindprint \u2014 $10</a><a class="btn ghost block" href="#pro">Northpeak All-Access \u2014 $100, every app</a><a class="small center codeln" href="#pro">Have a code?</a></div>';
    html += locked.map(function (x, k) { var w = [72, 45, 88, 30, 61, 54, 80];
      return '<div class="card locked"><div class="lockhd">' + LOCK + '<h2>' + esc(x[1]) + '</h2><span class="pill">Pro</span></div><div class="blur" aria-hidden="true"><p>' + esc(FILL[k % FILL.length]) + ' ' + esc(FILL[(k + 3) % FILL.length]) + '</p>' +
        '<div class="br"><div class="bl"><span>\u2588\u2588\u2588\u2588\u2588\u2588</span><b>\u2588\u2588</b></div><div class="bt"><i style="width:' + w[k % 7] + '%"></i></div></div><div class="br"><div class="bl"><span>\u2588\u2588\u2588\u2588</span><b>\u2588\u2588</b></div><div class="bt"><i style="width:' + w[(k + 2) % 7] + '%"></i></div></div></div>' +
        '<a class="unlk" href="#pro">' + LOCK + ' Unlock</a></div>'; }).join('');
    html += '<div class="card cta"><a class="btn big block" href="#pro">Unlock your full Mindprint \u2014 $10</a></div>';
    html += signed() ? '<p class="muted small center">Saved to your account.</p>' : '<div class="card"><p><b>Keep these results.</b> Sign in or create a free Northpeak account to keep them in your history on any device.</p><a class="btn ghost block" href="#account">Sign in to save</a></div>';
    html += '<div class="row2"><a class="btn ghost" href="#start">Retake</a><a class="btn ghost" href="#history">History</a></div><p class="muted small center">Not a diagnosis \u2014 for fun and self-reflection.</p>';
    V.innerHTML = html; if (tz.types) tyBindShare(tz.types.four, tz.types.cluster);
  }
  function resultsPage(id) {
    var r = byId(id) || results('main')[0]; if (!r) { location.hash = '#start'; return; }
    if (!full()) { teaserPage(r); return; }
    var sc = scoreOf(r), sm = S.summaries(sc), hl = S.headlines(sc), nm = r.name ? esc(r.name) + '\u2019s' : 'Your';
    var html = '<div class="rhead"><p class="eyebrow">' + nm + ' Mindprint \u00b7 ' + fmtDate(r.at) + '</p><h1>' + (hl.length ? esc(hl[0].title) : 'Your results') + '</h1>' +
      (hl.length > 1 ? '<div class="chips">' + hl.slice(1).map(function (h) { return '<span class="chip">' + esc(h.title) + '</span>'; }).join('') + '</div>' : '') + '</div>';
    var TT = typesOf(r); html += typesCard(TT);
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
    V.innerHTML = html; if (TT) tyBindShare(TT.four, TT.cluster);
  }
  function tyTag(r, lk) { try { if (r.kind !== 'main') return ''; var t = lk ? (r.teaser && r.teaser.types) : typesOf(r);
    return t && t.four ? ' \u00b7 ' + esc(t.four.code + ' ' + t.cluster.emoji) : ''; } catch (e) { return ''; } }
  function history() {
    var rs = results();
    V.innerHTML = '<h1 class="pt">Your results</h1>' + (rs.length && !full() && results('main').length ? '<div class="card cta"><p>Your answers are saved. Unlock Pro and your full results show up here instantly, no retake.</p><a class="btn block" href="#pro">Unlock your full Mindprint \u2014 $10</a></div>' : '') + (rs.length ? rs.map(function (r) {
      var lk = r.kind === 'main' && !full(), t = r.kind === 'deep' ? 'Deep Dive' : lk ? ((r.teaser && r.teaser.title) || 'Mindprint') : (function () { var h = S.headlines(scoreOf(r)); return h.length ? h[0].title : 'Mindprint'; })();
      return '<a class="hrow" href="' + (r.kind === 'deep' ? deepLink(r) : '#results/' + encodeURIComponent(r.id)) + '"><b>' + esc(t) + (lk ? ' <span class="pill">' + LOCK + ' Full results locked</span>' : '') + '</b><span>' + (r.kind === 'deep' ? 'Childhood & family' : 'Main quiz') + ' \u00b7 ' + fmtDate(r.at) + tyTag(r, lk) + '</span></a>'; }).join('')
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
    var ovs = typeof v === 'string' ? v : Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; })[0] : null; ovs = ovs != null ? String(ovs).replace(/^Other: /, '') : null;
    if (q.type === 'choice') input = '<div class="opts">' + q.options.map(function (o, k) { return '<button class="opt' + (v === k ? ' sel' : '') + '" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') + otherBtn(ovs) + '</div>';
    else if (q.type === 'multi') input = '<div class="opts multi">' + q.options.map(function (o, k) { return '<button class="opt' + (Array.isArray(v) && v.indexOf(k) >= 0 ? ' sel' : '') + '" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') + otherBtn(ovs) + '</div>';
    else if (q.type === 'scale') input = '<div class="scale">' + [1, 2, 3, 4, 5].map(function (k) { return '<button class="opt' + (v === k ? ' sel' : '') + '" data-k="' + k + '">' + k + '</button>'; }).join('') + '</div><div class="ends"><span>' + esc(q.scale[0]) + '</span><span>' + esc(q.scale[1]) + '</span></div>';
    V.innerHTML = '<div class="qtop"><button class="back" id="bk"' + (i ? '' : ' disabled') + '>\u2039 Back</button><span class="count">' + (i + 1) + ' / ' + qs.length + '</span></div><div class="bar"><i style="width:' + Math.round(100 * i / qs.length) + '%"></i></div>' +
      '<div class="qcard"><p class="tag">' + esc(q.section) + '</p>' + (dv.intro ? '<p class="intro">' + esc(dv.intro) + '</p>' : '') + '<h2 class="q">' + esc(dv.text) + '</h2>' + (q.hint ? '<p class="muted small">' + esc(q.hint) + '</p>' : '') + input +
      '<div class="row2"><button class="btn ghost" id="sk">Skip</button><button class="btn" id="nx">' + (i + 1 >= qs.length ? 'Finish' : 'Next') + '</button></div></div>';
    function next(val) { if (val === undefined || val === '' || (Array.isArray(val) && !val.length)) delete st.answers[q.id]; else st.answers[q.id] = val; if (i + 1 >= qs.length) { LS.set('deepq', st); deepEnd(); } else { st.i = i + 1; LS.set('deepq', st); deepQ(); } }
    $('#bk').onclick = function () { var ta = $('#ta'); if (ta && ta.value.trim()) st.answers[q.id] = ta.value.trim(); st.i = Math.max(0, i - 1); LS.set('deepq', st); deepQ(); };
    $('#sk').onclick = function () { st.answers[q.id] = null; if (i + 1 >= qs.length) { LS.set('deepq', st); deepEnd(); } else { st.i = i + 1; LS.set('deepq', st); deepQ(); } };
    var cur = v;
    var box = V.querySelector('.opts,.scale');
    var oth = V.querySelector('.opt.oth'), obox = V.querySelector('.othbox'), otx = $('#othtx');
    if (oth) { oth.onclick = function (e) { e.stopPropagation(); if (q.type === 'multi') { var on = !oth.classList.contains('sel'); oth.classList.toggle('sel', on); obox.hidden = !on; if (on) otx.focus(); }
        else { box.querySelectorAll('.opt').forEach(function (x) { x.classList.toggle('sel', x === oth); }); cur = null; obox.hidden = false; otx.focus(); } };
      $('#othok').hidden = true; }
    function withOther(val) { var t = oth && oth.classList.contains('sel') && otx.value.trim() ? 'Other: ' + otx.value.trim().slice(0, 300) : null;
      if (q.type === 'multi') { var a = (Array.isArray(val) ? val : []).filter(function (x) { return typeof x === 'number'; }); if (t) a.push(t); return a; }
      return t && (val == null || typeof val === 'string') ? t : val; }
    if (box) box.onclick = function (e) { var b = e.target.closest('.opt'); if (!b || b.classList.contains('oth')) return; var k = +b.dataset.k; if (q.type === 'choice' && oth) { oth.classList.remove('sel'); obox.hidden = true; }
      if (q.type === 'multi') { cur = Array.isArray(cur) ? cur.slice() : []; var at = cur.indexOf(k); if (at >= 0) cur.splice(at, 1); else cur.push(k); b.classList.toggle('sel'); }
      else { cur = k; box.querySelectorAll('.opt').forEach(function (x) { x.classList.toggle('sel', x === b); }); } };
    $('#nx').onclick = function () { var ta = $('#ta'); next(ta ? ta.value.trim() : (q.type === 'choice' || q.type === 'multi') ? withOther(cur) : cur); };
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
    V.innerHTML = window.MPReport.html(Q, D, r, scoreOf(r), deep, tyOpts()) +
      '<div class="noprint card"><h2>Take it with you</h2><button class="btn block" id="xl">Download spreadsheet (.xlsx)</button><button class="btn ghost block" id="pr">Save as PDF / print</button>' +
      '<p class="muted small">On iPhone: tap Save as PDF, then Share \u2192 Save to Files.</p>' + (deep ? '' : '<a class="btn ghost block" href="#deep">Add the Deep Dive to this report</a>') + '</div>';
    $('#xl').onclick = function () { try { window.MPXlsx.download(Q, D, r, scoreOf(r), deep, tyOpts()); } catch (e) { toast('Couldn\u2019t make the spreadsheet.'); } };
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
