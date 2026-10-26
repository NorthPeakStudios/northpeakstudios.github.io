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
    var rich = r.answers.map(function (x) { if (r.kind === 'main' || r.kind === 'addon') { var q = (r.kind === 'addon' ? (A && A.all) || [] : Q.questions).find(function (z) { return z.id === x.q; }); return { q: x.q, a: x.a, o: x.a === -1 ? x.o || '' : undefined, question: q ? q.text : '', answer: x.a === -1 ? 'Other: ' + (x.o || '') : q && q.options[x.a] ? q.options[x.a].t : '' }; }
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
  function loadQ() { return Q ? Promise.resolve(Q) : fetch('data/questions.json?v=9').then(function (r) { return r.json(); }).then(function (j) { Q = j; S.setNames(j.scales); return Q; }); }
  function loadD() { return D ? Promise.resolve(D) : fetch('data/deep.json?v=9').then(function (r) { return r.json(); }).then(function (j) { D = j; return D; }); }
  function scoreOf(r) { return KEYED ? S.score(Q, r.answers) : null; }
  function fmtDate(t) { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  function toast(msg) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600); }
  window.npUpdate.toast = function (msg, onTap) { var t = document.createElement('button'); t.className = 'toast'; t.textContent = msg; t.onclick = function () { t.remove(); if (onTap) onTap(); }; document.body.appendChild(t); };

  /* the account module loads as a separate script: wait for it (briefly) so a fresh load on #deep or #report sees a Pro account as Pro */
  var cloudReady = new Promise(function (ok) { if (C()) return ok(); window.addEventListener('cloud-ready', function () { ok(); }, { once: true }); setTimeout(ok, 4000); });
  /* ---------- router ---------- */
  function route() {
    busy = false; window.scrollTo(0, 0); if (window.MPExplain) MPExplain.set(null);
    var tb = $('.top'); if (tb) document.documentElement.style.setProperty('--toph', tb.offsetHeight + 'px');
    var h = (location.hash || '#home').slice(1).split('#')[0].split('/'), r = h[0] || 'home', arg = decodeURIComponent(h.slice(1).join('/'));
    document.querySelectorAll('.tabbar a').forEach(function (a) { var t = a.getAttribute('href').slice(1); a.classList.toggle('on', t === r || (a.dataset.also || '').split(' ').indexOf(r) >= 0); });
    var f = { home: home, start: start, quiz: quiz, results: resultsPage, history: history, deep: deepIntro, deepq: deepQ, deepres: deepResults, report: report, account: account, pro: proPage, types: typesHub, sharpen: sharpen, retake: retake, pick: pick, diag: diag, diagq: diagQ, lens: typesHub }[r] || home;
    Promise.all([loadQ(), cloudReady, r.indexOf('deep') === 0 || r === 'report' || r === 'history' ? loadD() : null, /^(types|sharpen|retake|pick|diag|diagq|results|report|history|home)$/.test(r) ? loadA() : null]).then(ensureKey).then(function () { f(arg); }).catch(function (e) { try { console.error('route', e && e.stack || e); } catch (x) {} V.innerHTML = '<div class="card"><p>Couldn\u2019t load Mindprint. Check your connection and try again.</p></div>'; });
  }
  window.addEventListener('hashchange', route);

  /* ---------- home ---------- */
  function home() {
    var last = results('main')[0], prog = LS.get('quiz', null), dprog = LS.get('deepq', null), dg = LS.get('diagq', null), ty = null;
    if (last) { try { ty = full() ? typesOf(last) : (last.teaser && last.teaser.types); } catch (e) { ty = null; } }
    var row = function (href, icon, t, s) { return '<a class="nrow" href="' + href + '"><span class="ni" aria-hidden="true">' + icon + '</span><span class="nt"><b>' + t + '</b><small>' + s + '</small></span><i aria-hidden="true">\u203a</i></a>'; };
    var h = '<section class="hero"><p class="eyebrow">Mindprint</p><h1>What do your answers say about <span class="grad">you</span>?</h1>' +
      '<p class="lede">77 questions on the Big Five, attachment, conflict, values, stress and decisions. About 10 minutes, free to take.</p>' +
      (prog && prog.i > 0 ? '<a class="btn big block" href="#quiz">Continue the quiz (' + Math.min(prog.i + 1, Q.questions.length) + ' of ' + Q.questions.length + ')</a>' : '<a class="btn big block" href="#start">' + (last ? 'Take it again' : 'Start the quiz') + '</a>') + '</section>';
    if (ty && ty.four && ty.cluster) h += '<a class="card mehome" href="#types"><span class="mec">' + esc(ty.four.code) + '</span><span class="nt"><small>Your type</small><b>' + esc(ty.four.name) + ' \u00b7 ' + esc(ty.cluster.emoji + ' ' + ty.cluster.name) + '</b></span><i aria-hidden="true">\u203a</i></a>';
    h += '<div class="card nav">' +
      (last ? row('#results/' + encodeURIComponent(last.id), '\ud83d\udcca', 'Your results', 'Your latest quiz, sorted by system') : '') +
      row(last ? '#types' : '#diag', '\ud83e\udde9', last ? 'Your types' : 'Quick diagnostic', last ? '16 types, Enneagram, Big Five, Socionics and more' : DIAG.length + ' questions, about 8 minutes, every type at once') +
      (dg && dg.i > 0 ? row('#diagq', '\u23f8\ufe0f', 'Continue the quick diagnostic', 'Pick up where you left off') : '') +
      (dprog && dprog.i > 0 ? row('#deepq', '\u23f8\ufe0f', 'Continue your Deep Dive', 'Pick up where you left off') : row(pro() ? '#deep' : '#pro', '\ud83c\udf00', 'Deep Dive', 'Childhood + family, 50 skippable questions' + (pro() ? '' : ' \u00b7 Pro'))) +
      row('#history', '\ud83d\uddc2\ufe0f', 'History', 'Every quiz you\u2019ve taken') +
      row(pro() ? '#account' : '#pro', '\u2b50', pro() ? 'Mindprint Pro is on' : 'Mindprint Pro \u00b7 $10', pro() ? 'Your account and plan' : 'Full results, Deep Dive, report, PDF and spreadsheet') + '</div>';
    h += '<div class="card"><details class="fold hiw"><summary>How it works</summary><ol class="steps"><li>Answer honestly. There are no right or wrong answers. Taking it is free.</li><li>See your top trait, 4-letter type and cluster right away. Your full results, across every system, come with Mindprint Pro ($10).</li><li>Sign in to keep every result in your account and retake it any time.</li></ol></details></div>' +
      '<p class="muted small center">' + DISC + '</p>';
    V.innerHTML = h;
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
  /* Back + Skip on every quiz (Odin, Oct 25 2026). Skipped questions don't count toward scores and can be answered at the end. */
  function nextIdx(st, ids, i) {
    if (st.review) { for (var j = 0; j < ids.length; j++) if (st.skip && st.skip[ids[j]] && st.answers[ids[j]] == null && !(st.rv || {})[ids[j]]) return j; return -1; }
    return i + 1 < ids.length ? i + 1 : -1;
  }
  function skippedLeft(st, ids) { return ids.filter(function (id) { return st.skip && st.skip[id] && st.answers[id] == null; }).length; }
  function reviewScreen(n, onReview, onFinish, back) {
    busy = false;
    V.innerHTML = '<div class="card"><p class="tag">Almost done</p><h2>You skipped ' + n + ' question' + (n > 1 ? 's' : '') + '</h2><p class="muted">Skipped questions don\u2019t count toward your results, so a few of them may come out less sure. You can answer them now or finish as is.</p>' +
      '<button class="btn big block" id="rvw">Answer the ' + n + ' skipped</button><button class="btn ghost block" id="fin">Finish now</button>' + (back ? '<button class="btn ghost block" id="rbk">\u2039 Back to the last question</button>' : '') + '</div>';
    $('#rvw').onclick = onReview; $('#fin').onclick = onFinish; if (back) $('#rbk').onclick = back;
  }
  function quiz() {
    var st = LS.get('quiz', null); if (!st) { location.hash = '#start'; return; }
    var qs = Q.questions, ids = qs.map(function (x) { return x.id; }), i = Math.min(st.i, qs.length - 1), q = qs[i]; busy = true; st.skip = st.skip || {};
    var opts = q.options.map(function (o, k) { return '<button class="opt' + (st.answers[q.id] === k ? ' sel' : '') + '" data-k="' + k + '">' + esc(o.t) + '</button>'; }).join('') + (q.type === 'likert' ? '' : otherBtn(st.answers[q.id] === -1 ? (st.other || {})[q.id] || '' : null));
    V.innerHTML = '<div class="qtop"><button class="back" id="bk" aria-label="Back"' + (i ? '' : ' disabled') + '>\u2039 Back</button><span class="count">' + (st.review ? 'Skipped \u00b7 ' : '') + (i + 1) + ' / ' + qs.length + '</span><button class="back skipb" id="sk">Skip \u203a</button></div>' +
      '<div class="bar"><i style="width:' + Math.round(100 * i / qs.length) + '%"></i></div>' +
      '<div class="qcard"><p class="tag">' + esc(TAGS[q.framework] || 'About you') + (st.skip[q.id] && st.answers[q.id] == null ? ' \u00b7 skipped' : '') + '</p><h2 class="q">' + esc(q.text) + '</h2><div class="opts' + (q.type === 'likert' ? ' likert' : '') + '">' + opts + '</div></div>';
    function adv() { var n = nextIdx(st, ids, i); if (n < 0) { var left = skippedLeft(st, ids); LS.set('quiz', st);
        if (left && !st.review) reviewScreen(left, function () { st.review = true; st.rv = {}; st.i = nextIdx(st, ids, 0); LS.set('quiz', st); quiz(); }, function () { finishQuiz(st); }, function () { quiz(); });
        else finishQuiz(st); return; }
      st.i = n; LS.set('quiz', st); quiz(); }
    $('#bk').onclick = function () { st.review = false; st.rv = {}; st.i = Math.max(0, i - 1); LS.set('quiz', st); quiz(); };
    $('#sk').onclick = function () { if (st.answers[q.id] == null) st.skip[q.id] = 1; if (st.review) { st.rv = st.rv || {}; st.rv[q.id] = 1; } adv(); };
    V.querySelector('.opts').onclick = function (e) {
      var b = e.target.closest('.opt'); if (!b || b.classList.contains('oth')) return;
      st.answers[q.id] = +b.dataset.k; b.classList.add('sel'); LS.set('quiz', st);
      setTimeout(adv, 170);
    };
    bindOther(function (t) { st.answers[q.id] = -1; st.other = st.other || {}; st.other[q.id] = t.slice(0, 300); LS.set('quiz', st); adv(); });
  }
  function finishQuiz(st) {
    var ans = Q.questions.filter(function (q) { return st.answers[q.id] != null; }).map(function (q) { var a = st.answers[q.id]; return a === -1 ? { q: q.id, a: -1, o: ((st.other || {})[q.id] || '').slice(0, 300) } : { q: q.id, a: a }; });
    var r = { id: rid(), kind: 'main', at: Date.now(), name: st.name || '', answers: ans, qv: Q.version || 1, secs: Math.round((Date.now() - (st.t || Date.now())) / 1000), skipped: Q.questions.length - ans.length };
    if (ans.length < 10) { V.innerHTML = '<div class="card"><h2>Answer a few more first</h2><p class="muted">You’ve answered ' + ans.length + ' so far. Mindprint needs at least 10 answers to say anything about you.</p><button class="btn big block" id="rv">Keep going</button></div>'; $('#rv').onclick = function () { st.review = false; st.i = 0; LS.set('quiz', st); quiz(); }; return; }
    DB.put(r); LS.set('quiz', null); var sub = submit(r, KEYED ? { scores: compact(scoreOf(r)), flags: r.skipped ? ['skipped:' + r.skipped] : [] } : { flags: r.skipped ? ['skipped:' + r.skipped] : [] }); sync();
    if (full()) location.hash = '#results/' + encodeURIComponent(r.id);
    else { V.innerHTML = '<div class="card center"><div class="spin"></div><p>Reading your answers across 7 frameworks\u2026</p></div>'; var go = function () { location.hash = '#results/' + encodeURIComponent(r.id); }; Promise.race([sub, new Promise(function (ok) { setTimeout(ok, 6000); })]).then(go, go); }
  }

  /* ---------- results (free) ---------- */
  function bars(sc, keys) {
    return keys.filter(function (k) { return sc.scales[k]; }).map(function (k) { var v = sc.scales[k];
      return '<div class="br" data-x="scale:' + k + '"><div class="bl"><span>' + esc(S.nm(k)) + (v.n < 4 ? ' <em class="lean">leaning</em>' : '') + '</span><b>' + v.pct + '</b></div><div class="bt"><i style="width:' + Math.max(3, v.pct) + '%"></i></div></div>'; }).join('');
  }
  var LOCK = '<svg class="lk" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1zm2 0h6V7a3 3 0 0 0-6 0v3z"/></svg>';
  var FILL = ['When things get tense with someone close to you, your first instinct is something most people never notice about themselves.', 'The way you get close to people says a lot about what you learned early on, and where you still hold back.', 'Your choices follow a pattern: what you weigh first, who you listen to, and what you do when you can\u2019t decide.', 'How long you can be around people before you need to recharge, and what actually fills you back up.', 'What you do first when everything piles up, and the habit that quietly makes it worse.', 'The three things you care about most, ranked, and how they pull against each other.', 'Your scores on all five traits, with every facet broken down.'];
  var TEASE_DEF = [['conflict', 'How you handle conflict'], ['attach', 'Your attachment style'], ['decide', 'What drives your decisions'], ['social', 'Your social battery'], ['stress', 'Under stress'], ['values', 'What matters to you most'], ['big5', 'Your Big Five breakdown']];

  /* ---------- Your types hub (Odin, Oct 25 2026: "tell you your personality type and typology + what cluster you're in", then "add all of these… make the main quiz and deep dive influence…").
     Every system is estimated from answers already given (main quiz + Deep Dive + optional sharpen answers), with a confidence. Inferred, for fun. ---------- */
  var TYNOTE = 'Inferred from your answers, for fun. These are rough labels built from your quiz scores, not the official MBTI, Enneagram or DISC tests.';
  var APPURL = 'https://northpeakstudios.github.io/mindprint/';
  var A = null;
  function loadA() { return A ? Promise.resolve(A) : Promise.all([fetch('data/addon.json?v=9').then(function (r) { return r.json(); }), fetch('data/retake.json?v=9').then(function (r) { return r.json(); }).catch(function () { return { questions: [] }; })])
    .then(function (x) { A = x[0]; A.R = x[1]; A.all = A.questions.concat((x[1].questions || []).map(function (q) { var c = {}; for (var k in q) c[k] = q[k]; c.bank = 'B'; return c; })); return A; }).catch(function () { return null; }); }
  function addonRec() { return results('addon')[0] || null; }
  function tyOpts() { var d = results('deep')[0], ad = addonRec(); return { deep: d ? d.answers : [], addon: ad ? ad.answers : [], AQ: A ? { questions: A.all } : null, ov: ad && ad.ov ? ad.ov : null }; }
  function curOv() { var ad = addonRec(); return ad && ad.ov ? ad.ov : null; }

  /* ---------- tap-to-explain context (1.1.4): what MPExplain needs to say "why you got this" from this person's own answers ---------- */
  function xSet(r, T, sc) { if (!window.MPExplain) return; if (!T) { MPExplain.set(null); return; }
    var o = tyOpts(), T0 = T; try { if (T.ov) { var o2 = {}; for (var k in o) o2[k] = o[k]; o2.ov = null; T0 = window.MPTypes.fromScore(sc, o2); } } catch (e) { T0 = T; }
    MPExplain.set({ full: true, T: T, p: T.p, p0: T0.p, r: r, Q: Q, AQ: A ? { questions: A.all } : null, addon: o.addon, nm: S.nm, acts: tyActs }); }
  function xSetFree(r, ty) { if (!window.MPExplain) return; var w = ty && ty.why;
    MPExplain.set({ full: false, four: ty && ty.four, cluster: ty && ty.cluster, why: w, p: w && (w.sp || w.s), p0: w && w.s, ov: (ty && ty.four && ty.four.self) || (ty && ty.cluster && ty.cluster.self) ? curOv() : null, r: r, Q: Q, nm: S.nm, acts: tyActs }); }
  function typesOf(r) { return window.MPTypes ? window.MPTypes.fromScore(scoreOf(r), tyOpts()) : null; }
  function tyShareText(four, cl) { return 'My Mindprint: ' + four.code + ' \u201c' + four.name + '\u201d \u00b7 ' + cl.emoji + ' ' + cl.name + ' (' + cl.match + '% match). What\u2019s yours?'; }
  function tyBindShare(four, cl) {
    var b = $('#tyshare'); if (!b || !four || !cl) return;
    b.onclick = function () { var t = tyShareText(four, cl);
      if (navigator.share) { navigator.share({ title: 'My Mindprint', text: t, url: APPURL }).catch(function () {}); return; }
      try { navigator.clipboard.writeText(t + ' ' + APPURL).then(function () { toast('Copied \u2014 paste it anywhere'); }, function () { toast(t); }); } catch (e) { toast(t); } };
  }
  function tyHeroC(four, cl) {
    var si = function (x) { return x.self && x.inferred ? '<p class="tyinf">' + (x.same ? 'You picked this, and your answers agree' : 'You picked this \u00b7 your answers said ' + esc(x.inferred.code || x.inferred.name)) + '</p>' : ''; };
    return '<div class="ty4" data-x="four"><div class="ty4c">' + esc(four.code) + '</div><div><p class="tyk">4-letter type \u00b7 ' + (four.self ? 'self-identified' : 'MBTI-style') + '</p><h3>' + esc(four.name) + '</h3></div></div>' + si(four) +
      '<div class="tyclm" data-x="cluster" style="--c:' + esc(cl.color) + '"><span class="tyemo" aria-hidden="true">' + esc(cl.emoji) + '</span><div><p class="tyk">Your cluster' + (cl.self ? ' \u00b7 self-identified' : '') + '</p><b>' + esc(cl.name) + '</b> <em>' + cl.match + '% match</em></div></div>' + si(cl) +
      '<div class="tyacts"><a class="tyact pick" href="#pick/four" aria-label="' + (four.self ? 'Change my type' : 'Not me? Pick my real type') + '">' + (four.self ? 'Change my type' : 'Not my type?') + '</a><a class="tyact pick" href="#pick/cluster" aria-label="' + (cl.self ? 'Change my cluster' : 'Pick my cluster') + '">' + (cl.self ? 'Change my cluster' : 'Not my cluster?') + '</a></div>';
  }
  function tyHero(four, cl, noPick) {
    var si = function (x) { return x.self && x.inferred ? '<p class="tyinf">' + (x.same ? 'You picked this, and your answers agree' : 'You picked this \u00b7 your answers said ' + esc(x.inferred.code || x.inferred.name)) + '</p>' : ''; };
    return '<div class="tyhero" data-x="cluster" style="--c:' + esc(cl.color) + '"><div class="tyemo" aria-hidden="true">' + esc(cl.emoji) + '</div><div><p class="tyk">Your cluster' + (cl.self ? ' \u00b7 self-identified' : '') + '</p><h2>' + esc(cl.name) + '</h2><p class="tym">' + cl.match + '% match</p></div></div>' + si(cl) +
      '<p class="tyt" data-x="cluster">' + esc(cl.text) + '</p>' +
      '<div class="ty4" data-x="four"><div class="ty4c">' + esc(four.code) + '</div><div><p class="tyk">4-letter type \u00b7 ' + (four.self ? 'self-identified' : 'MBTI-style') + '</p><h3>' + esc(four.name) + '</h3></div></div>' + si(four) + '<p class="tyt" data-x="four">' + esc(four.text) + '</p>' +
      (noPick ? '' : '<div class="tyacts"><a class="tyact pick" href="#pick/four" aria-label="' + (four.self ? 'Change my type' : 'Not me? Pick my real type') + '">' + (four.self ? 'Change my type' : 'Not me? Pick my type') + '</a><a class="tyact pick" href="#pick/cluster">' + (cl.self ? 'Change my cluster' : 'Pick my cluster') + '</a></div>');
  }
  function tyMini(rows) { return rows.map(function (x) { return '<div class="br"' + (x[4] ? ' data-x="' + esc(x[4]) + '"' : '') + '><div class="bl"><span>' + esc(x[0]) + '</span><b>' + esc(String(x[1])) + '</b></div><div class="bt"><i style="width:' + Math.max(3, Math.min(100, x[2])) + '%' + (x[3] ? ';background:' + x[3] : '') + '"></i></div></div>'; }).join(''); }
  function confChip(c, sys) { return c ? '<span class="cf cf-' + c.word + '"' + (sys ? ' data-x="conf:' + sys + '"' : '') + '>' + esc(c.word) + ' confidence \u00b7 ' + c.pct + '%</span>' : ''; }
  var PICKABLE = { four: 1, socionics: 1, ennea: 1, temper: 1, arche: 1, disc: 1, attach: 1, cognitive: 1, learning: 1, cluster: 1 };
  function rtLine(sys) { var ad = addonRec(), log = ((ad && ad.rt) || {})[sys] || [], l = log[log.length - 1]; if (!l) return '';
    return '<p class="tymeta">\u21bb Retaken ' + fmtDate(l.at) + ' with question set ' + esc(l.bank) + ' (' + l.n + ' answered' + (l.skipped ? ', ' + l.skipped + ' skipped' : '') + ')' + (l.before && l.after && l.before !== l.after ? ': ' + esc(l.before) + ' \u2192 ' + esc(l.after) : '') + '</p>'; }
  function tyActs(sys, x) {
    var h = '', c = x && x.conf, nm = sysName(sys);
    if (A && A.questions && pro()) { var qs = A.questions.filter(function (q) { return q.sys === sys; });
      if (qs.length) { var ad = addonRec(), done = {}; (ad ? ad.answers : []).forEach(function (a) { done[a.q] = 1; });
        var left = qs.filter(function (q) { return !done[q.id]; }).length, n = Math.min(A.sharpen || 3, left);
        if (left && c && c.pct < 80 && !(x && x.self)) h += '<a class="tyact pri" href="#sharpen/' + sys + '" aria-label="Sharpen it with ' + n + ' more question' + (n > 1 ? 's' : '') + '">Sharpen \u00b7 ' + n + 'q</a>';
        h += '<a class="tyact" href="#sharpen/' + sys + '/full" aria-label="Take the full ' + esc(nm) + ' quiz">' + (left ? 'Full quiz \u00b7 ' + qs.length + 'q' : 'Redo quiz') + '</a>'; } }
    if (A && pro() && sys !== 'thinking' && sys !== 'team') { var pl = retakePlan(sys); if (pl.qs.length) h += '<a class="tyact" href="#retake/' + sys + '" aria-label="Retake this part: ' + pl.qs.length + ' new questions, set ' + pl.bank + '">Retake \u00b7 ' + pl.qs.length + 'q</a>'; }
    if (PICKABLE[sys] && (pro() || sys === 'four' || sys === 'cluster')) h += '<a class="tyact pick" href="#pick/' + sys + '" aria-label="' + (x && x.self ? 'Change my pick' : 'Not me? Pick my real type') + '">' + (x && x.self ? 'Change pick' : 'Not me?') + '</a>';
    return h ? '<div class="tyacts">' + h + '</div>' : '';
  }
  function selfChip(x, sys) { var i = x.inferred || {};
    return '<span class="cf cf-self"' + (sys ? ' data-x="self:' + sys + '"' : '') + '>Self-identified</span><p class="tyinf">' + (x.same ? 'Your answers said the same: ' : 'Your answers said: ') + esc((i.code && i.code !== i.name ? i.code + ' ' : '') + (i.name || '')) + (i.conf ? ' \u00b7 ' + i.conf.pct + '% confidence' : '') + '</p>'; }
  function tyRow(o) {
    var x = o.res || { conf: o.conf };
    return '<div class="tyr" id="ty-' + (o.sys || '') + '"' + (o.sys || o.xk ? ' data-x="' + esc(o.xk || o.sys) + '"' : '') + '><div class="tyb' + (/^[\x00-\x7f]+$/.test(o.badge) ? '' : ' emo') + '"' + (o.bstyle ? ' style="' + o.bstyle + '"' : '') + '>' + esc(o.badge) + '</div><div class="tyx"><p class="tyk">' + esc(o.kicker) + '</p><h3>' + esc(o.title) + '</h3>' + (o.text ? '<p class="tyd">' + esc(o.text) + '</p>' : '') +
      (o.meta ? '<p class="tymeta">' + esc(o.meta) + '</p>' : '') + (x.self ? selfChip(x, o.sys) : confChip(o.conf, o.sys)) + (o.sys ? rtLine(o.sys) : '') + (o.extra || '') + (o.sys ? tyActs(o.sys, x) : '') + '</div></div>';
  }
  function spec(lo, hi, v) { return '<div class="tyl"><span class="' + (v < 50 ? 'on' : '') + '">' + esc(lo) + '</span><div class="tyline"><i style="left:' + v + '%"></i></div><span class="' + (v >= 50 ? 'on' : '') + '">' + esc(hi) + '</span></div>'; }
  /* compact card on the results page (Pro): headline + link to the hub */
  function typesCard(T) {
    if (!T) return '';
    return '<div class="card types"><p class="tag">Your types</p>' + tyHeroC(T.four, T.cluster) +
      '<div class="chips tychips"><span class="chip" data-x="ennea">' + esc('Enneagram ' + T.ennea.code) + '</span><span class="chip" data-x="temper">' + esc(T.temper.emoji + ' ' + T.temper.name) + '</span><span class="chip" data-x="arche">' + esc(T.arche.emoji + ' ' + T.arche.name) + '</span><span class="chip" data-x="sloan">' + esc('Big Five ' + T.sloan.code) + '</span><span class="chip" data-x="disc">' + esc('DISC ' + T.disc.color) + '</span></div>' +
      '<a class="btn block" href="#types">See all your types</a><button class="btn ghost block" id="tyshare">Share my type</button><p class="muted small">' + esc(TYNOTE) + '</p></div>';
  }
  /* free: headline type + cluster (from the server's teaser), everything else locked */
  function typesFree(ty, hub) {
    if (!ty || !ty.four || !ty.cluster) return '';
    var h = '<div class="card types" id="types"><p class="tag">Your types</p>' + tyHero(ty.four, ty.cluster) + '<p class="muted small xhint">Tap your type or cluster to see what it means and why you got it.</p><button class="btn ghost block" id="tyshare">Share my type</button><p class="muted small">' + esc(TYNOTE) + '</p></div>';
    var L = [['Enneagram-style', 'Your type and wing, plus all 9 ranked', 'types'], ['Big Five', 'Your five trait spectra, Big Five code and tags', 'traits'], ['Socionics-style', 'Your Socionics type, quadra and dual', 'types'], ['Temperament \u00b7 DISC \u00b7 archetype', 'Three more classic ways to sort you', 'types'], ['Attachment', 'How you bond with your people', 'types'], ['Cluster + tree', 'All 8 clusters and your path down the tree', 'hier'], ['Styles', 'Decision style and learning style', 'styles'], ['Thinking style \u00b7 team role', 'Cognitive style and your role in a group, each with an optional 6-question quiz', 'think'], ['Your Mindprint, classified', 'Kingdom \u2192 species, quadrant, tier, phenotype and more', 'classified'], ['Sharpen', 'A few extra questions to make any result more accurate', 'sharpen']];
    h += '<div class="card lockl"><div class="lockhd">' + LOCK + '<h2>' + (hub ? 'The rest of your types' : 'Every other system') + '</h2><span class="pill">Pro</span></div>' +
      L.map(function (x) { return '<div class="lrow" data-x="lock:' + x[2] + '">' + LOCK + '<span>' + esc(x[0]) + '<small>' + esc(x[1]) + '</small></span><i aria-hidden="true">\u203a</i></div>'; }).join('') + '</div>';
    return h;
  }
  /* ---------- 1.1.5: results sorted by system — collapsible sections + sticky jump bar ---------- */
  var SECDEF = { mbti: 1, ennea: 1, big5: 1, rbig5: 1, rattach: 1 };
  function secOpen(id) { var o = LS.get('secs', null) || {}; return id in o ? !!o[id] : !!SECDEF[id]; }
  function sec(id, icon, name, res, inner) {
    return '<details class="sys" id="s-' + id + '" data-sec="' + id + '"' + (secOpen(id) ? ' open' : '') + '><summary><span class="sxi" aria-hidden="true">' + icon + '</span><span class="sxn">' + esc(name) + (res ? '<small>' + esc(res) + '</small>' : '') + '</span><span class="chev" aria-hidden="true"></span></summary><div class="sxb">' + inner + '</div></details>';
  }
  function jumpBar(items) { return '<nav class="jump" aria-label="Jump to a section"><div class="jin">' + items.map(function (x) { return '<button type="button" data-jump="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('') + '</div></nav>'; }
  function glance(rows) { return '<div class="glance">' + rows.map(function (x) { return '<button type="button" class="gl" data-jump="' + x[0] + '"><span>' + esc(x[1]) + '</span><b>' + esc(x[2]) + '</b></button>'; }).join('') + '</div>'; }
  function topOff() { var t = $('.top'), j = $('.jump'); return (t ? t.offsetHeight : 0) + (j ? j.offsetHeight : 0) + 8; }
  function openTo(el) { for (var p = el; p && p !== V; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true; }
  function goTo(el, center) { if (!el) return; openTo(el); setTimeout(function () { var y = el.getBoundingClientRect().top + window.pageYOffset - topOff(); if (center) y -= Math.max(0, (window.innerHeight - topOff() - el.offsetHeight) / 3); window.scrollTo(0, Math.max(0, y)); jumpSpy(); }, 0); }
  function jumpSpy() { var j = $('.jump'); if (!j) return; var off = topOff() + 4, cur = null;
    V.querySelectorAll('[data-sec]').forEach(function (s) { if (s.getBoundingClientRect().top <= off) cur = s.getAttribute('data-sec'); });
    if (!cur) { var f = j.querySelector('[data-jump]'); cur = f && f.getAttribute('data-jump'); }
    j.querySelectorAll('[data-jump]').forEach(function (b) { var on = b.getAttribute('data-jump') === cur; if (on !== b.classList.contains('on')) { b.classList.toggle('on', on); if (on) { var jin = j.firstChild; jin.scrollTo({ left: Math.max(0, b.offsetLeft - 18), behavior: 'smooth' }); } } }); }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-jump]'); if (!b || !V.contains(b)) return; e.preventDefault(); goTo($('#s-' + b.getAttribute('data-jump'))); });
  V.addEventListener('toggle', function (e) { var d = e.target; if (!d || !d.matches || !d.matches('details.sys')) return; var o = LS.get('secs', null) || {}; o[d.getAttribute('data-sec')] = d.open; LS.set('secs', o); }, true);
  window.addEventListener('scroll', function () { if (!jumpSpy.t) jumpSpy.t = setTimeout(function () { jumpSpy.t = 0; jumpSpy(); }, 80); }, { passive: true });
  /* the standard Jungian function order for a 4-letter code (derived from the letters, not measured separately) */
  function fnStack(c) { if (!/^[EI][NS][TF][JP]$/.test(c || '')) return '';
    var I = c[0] === 'I', P = c[1], J = c[2], o = { N: 'S', S: 'N', T: 'F', F: 'T' };
    var ext = c[3] === 'J' ? J : P, intr = c[3] === 'J' ? P : J, dom = I ? intr + 'i' : ext + 'e', aux = I ? ext + 'e' : intr + 'i';
    return [dom, aux, o[aux[0]] + dom[1], o[dom[0]] + aux[1]].join(' \u00b7 '); }
  /* 1.1.6: one "specimen label" that runs your results through Odin's classification words (Oct 25 list). Deterministic, for fun. */
  var LVLN = ['First sketch', 'Rough draft', 'Clear picture', 'Detailed portrait', 'High-res'];
  function mpLevel(T, r, nRt) { var u = T.used || {}; return 1 + (u.deep ? 1 : 0) + (u.addon >= 6 ? 1 : 0) + (u.addon >= 18 ? 1 : 0) + (nRt || T.ov ? 1 : 0); }
  function classifiedHtml(T, r, nRt) {
    var LL = T.lenses, tx = LL.taxon, lv = mpLevel(T, r, nRt), tr = null; ['S', 'A', 'B', 'C', 'D'].some(function (k) { if (LL.tiers[k].length) { tr = [k, LL.tiers[k][0]]; return true; } return false; });
    var mx = LL.mixture[0], row = function (k, v, x) { return '<div class="clr"' + (x ? ' data-x="' + esc(x) + '"' : '') + '><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>'; };
    var main = [['Quadrant', LL.map.quadrant, 'lens:map'], ['Cluster', T.cluster.emoji + ' ' + T.cluster.name, 'cluster'], ['Latent class', mx.emoji + ' ' + mx.name.replace(/^The /, '') + ' ' + mx.pct + '%', 'lens:mixture'], ['Spectrum code', T.sloan.code, 'sloan'],
      ['Tier', tr ? tr[0] + ' tier \u00b7 ' + S.nm(tr[1].key) + ' ' + tr[1].v : '\u2014', 'lens:tiers'], ['Archetype', T.arche.emoji + ' ' + T.arche.name, 'arche'], ['Phenotype', (LL.phenotype.length ? LL.phenotype.map(function (x) { return '#' + x; }).join(' ') : 'balanced'), 'lens:thes'], ['Role', T.team.emoji + ' ' + T.team.name, 'team']];
    var more = [['Genotype (full code)', LL.code, 'lens:code'], ['Morphotype', LL.shape[0], 'lens:shape'], ['Prototype', LL.prototype.name + ' (' + LL.prototype.pct + '%)', 'lens:proto'], ['Persona', LL.persona.emoji + ' ' + LL.persona.name, 'lens:persona'],
      ['Thinking style', T.thinking.name, 'thinking'], ['Behavioral type', 'DISC ' + T.disc.code + ' \u00b7 ' + T.disc.name, 'disc'], ['Tribe \u00b7 guild \u00b7 school', LL.tribe.name + ' \u00b7 ' + LL.guild.name + ' \u00b7 ' + LL.school.name, 'lens:tribe'], ['Equivalence class', LL.equiv, 'lens:sets'],
      ['Clade', (LL.clade && LL.clade.length ? LL.clade[LL.clade.length - 1].join(' + ') : T.cluster.name), 'lens:tree'], ['Supertype \u00b7 subtype', LL.supertype + ' \u00b7 ' + LL.subtype, 'lens:super'], ['Pattern', LL.pattern.name, 'lens:pattern'], ['Genre \u00b7 modality', LL.genre + ' \u00b7 ' + LL.modality, 'lens:genre'],
      ['Coordinates', 'plasticity ' + LL.map.x + ', stability ' + LL.map.y, 'lens:map']];
    return '<div class="clx"><p class="tyk">Specimen</p><p class="clsp">' + esc(tx[7][1]) + '</p><p class="tymeta">' + esc(T.four.code + ' \u00b7 ' + T.four.name) + '</p>' +
      '<div class="clch" data-x="lens:taxon">' + tx.slice(1, 8).map(function (x) { return '<span><small>' + esc(x[0]) + '</small>' + esc(x[1]) + '</span>'; }).join('<i aria-hidden="true">\u203a</i>') + '</div>' +
      main.map(function (x) { return row(x[0], x[1], x[2]); }).join('') +
      '<div class="clr clv"><span>Level</span><b>' + lv + ' of 5 \u00b7 ' + esc(LVLN[lv - 1]) + '</b></div><p class="tymeta">Level = how much Mindprint knows about you so far (quiz, Deep Dive, extra quizzes, retakes), not a rank of you.</p>' +
      '<details class="fold"><summary>Full specimen label (' + more.length + ' more)</summary>' + more.map(function (x) { return row(x[0], x[1], x[2]); }).join('') + '</details>' +
      '<p class="tymeta">Made-up Latin, real logic: every label comes straight from your results above. For fun, not science.</p></div>';
  }
  function typesHub() {
    var r = results('main')[0];
    if (!r) { V.innerHTML = '<h1 class="pt">Your types</h1><div class="card"><p class="tag">Quick diagnostic</p><h2>One short quiz, every type</h2><p>' + DIAG.length + ' questions, about 8 minutes. It fills in your 4-letter type, Enneagram-style type, temperament, archetype, DISC colour, attachment, Socionics-style type, cluster and 30+ other ways to sort you, all at once. Then you can retake any one part.</p><a class="btn big block" href="#diag">Take the quick diagnostic</a><a class="btn ghost block" href="#start">Or the full 77-question quiz</a><p class="muted small">' + esc(TYNOTE) + '</p></div>'; return; }
    if (!full()) {
      var tz = r.teaser, ovs = JSON.stringify(curOv() || null);
      if (!tz || !tz.types || !tz.types.why || (r.tzov || 'null') !== ovs) { V.innerHTML = '<div class="card center"><div class="spin"></div><p>Working out your types\u2026</p></div>';
        fetch('https://mindprint.sites.tab.bot/api/mp/teaser', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers: r.answers, ov: curOv() }), cache: 'no-store', credentials: 'omit' })
          .then(function (x) { return x.json(); }).then(function (j) { if (j && j.teaser && j.teaser.types) { r.teaser = j.teaser; r.tzov = ovs; DB.put(r); if (location.hash.indexOf('#types') === 0) typesHub(); } else throw 0; })
          .catch(function () { V.innerHTML = '<div class="card"><p>Connect to the internet to see your types.</p><button class="btn block" id="rt">Try again</button></div>'; $('#rt').onclick = typesHub; }); return; }
      V.innerHTML = '<h1 class="pt">Your types</h1><p class="muted small">From your quiz on ' + fmtDate(r.at) + '.</p>' + typesFree(tz.types, true) +
        lensLocked() + '<div class="card cta"><a class="btn big block" href="#pro">Unlock all your types \u2014 $10</a><a class="small center codeln" href="#pro">Have a code?</a></div>';
      tyBindShare(tz.types.four, tz.types.cluster); xSetFree(r, tz.types); return;
    }
    var T = typesOf(r), f = T.four, cl = T.cluster, en = T.ennea, tp = T.temper, ar = T.arche, di = T.disc, at = T.attach, cg = T.cognitive, ls = T.learning, sl = T.sloan, sc = scoreOf(r), u = T.used;
    var nRt = 0, adr = addonRec(); for (var rk in ((adr && adr.rt) || {})) nRt += adr.rt[rk].length;
    var from = [(r.diag ? 'your quick diagnostic' : 'your main quiz') + ' (' + fmtDate(r.at) + ')'].concat(u.deep ? ['your Deep Dive'] : []).concat(u.addon ? [u.addon + ' extra answer' + (u.addon > 1 ? 's' : '')] : []).concat(nRt ? [nRt + ' retake' + (nRt > 1 ? 's' : '')] : []).concat(T.ov ? ['the types you picked yourself'] : []);
    var so = T.socionics;
    var h = '<h1 class="pt">Your types</h1><p class="muted small">Built from ' + esc(S.list(from)) + '. Tap any result to see what it means and why you got it.</p>';
    var SEC = [['top', 'Summary'], ['mbti', '16 types'], ['ennea', 'Enneagram'], ['big5', 'Big Five'], ['soc', 'Socionics'], ['temper', 'Temperament'], ['disc', 'DISC'], ['arche', 'Archetype'], ['attach', 'Attachment'], ['cluster', 'Cluster'], ['styles', 'Styles'], ['think', 'Thinking'], ['team', 'Team role'], ['classified', 'Classified'], ['lenses', 'Fun lenses'], ['state', 'Today']];
    h += jumpBar(SEC);
    h += '<div class="card types" id="s-top" data-sec="top"><p class="tag">Your summary</p>' + tyHeroC(f, cl) +
      glance([['mbti', '16 types', f.code], ['ennea', 'Enneagram', en.code], ['big5', 'Big Five', sl.code], ['soc', 'Socionics', so.code], ['temper', 'Temperament', tp.emoji + ' ' + tp.name], ['disc', 'DISC', di.color], ['arche', 'Archetype', ar.emoji + ' ' + ar.name], ['attach', 'Attachment', at.name], ['think', 'Thinking', T.thinking.emoji + ' ' + T.thinking.name], ['team', 'Team role', T.team.emoji + ' ' + T.team.name]]) +
      '<button class="btn ghost block" id="tyshare">Share my type</button></div>';
    var BN = { O: ['Practical', 'Curious'], C: ['Flexible', 'Organized'], E: ['Reserved', 'Outgoing'], A: ['Direct', 'Warm'], N: ['Calm', 'Sensitive'] };
    h += sec('mbti', '\ud83e\udde9', '16 types \u00b7 MBTI-style', f.code + ' \u00b7 ' + f.name, tyRow({ sys: 'four', res: f, badge: f.code, kicker: '4-letter type \u00b7 MBTI-style', title: f.name, text: f.text, meta: 'Group: ' + f.group + ' (' + f.groupText + ')' + (fnStack(f.code) ? '. Function stack: ' + fnStack(f.code) + ' (the standard order for these letters)' : ''), conf: f.conf,
      extra: '<details class="fold"><summary>Letter by letter</summary>' + f.letters.map(function (l, i) { var pr = [['E', 'I'], ['N', 'S'], ['F', 'T'], ['J', 'P']][i]; return '<div data-x="letter:' + i + '">' + spec(pr[1], pr[0], l.score) + '<p class="tymeta">' + esc(l.letter + ' = ' + l.word + ', ' + l.strength + ' (' + l.from + ' ' + Math.round(l.score) + '/100)') + '</p></div>'; }).join('') + '</details>' }));
    h += sec('ennea', '\u2728', 'Enneagram-style', en.code + ' \u00b7 ' + en.name, tyRow({ sys: 'ennea', res: en, badge: en.code, kicker: 'Enneagram-style type + wing', title: 'Type ' + en.type + ': ' + en.name, text: en.text, meta: 'Wing ' + en.wing + ' (' + en.wingName + ') \u00b7 fit ' + en.match + '/100', conf: en.conf,
      extra: '<details class="fold"><summary>All 9 types</summary>' + tyMini(en.ranked.map(function (e) { return [e.n + ' ' + e.name, e.score, e.score, '', 'ennea:' + e.n]; })) + '</details>' }));
    h += sec('big5', '\ud83d\udcca', 'Big Five (OCEAN)', sl.code, '<div class="b5">' + T.big5.map(function (b) { return '<div data-x="scale:' + b.key + '">' + spec(BN[b.key][0], BN[b.key][1], b.score) + '<p class="tymeta">' + esc(S.nm(b.key) + ' ' + b.score + '/100') + '</p></div>'; }).join('') + '</div>' + tyRow({ sys: 'sloan', res: sl, badge: sl.code, kicker: 'Big Five code \u00b7 SLOAN-style', title: sl.code, text: sl.parts.map(function (x) { return x.letter + ' ' + x.word + (x.soft ? ' (leaning)' : ''); }).join(' \u00b7 '), meta: 'Capital = clearly that side, lowercase = leaning', conf: sl.conf }) +
      '<details class="fold"><summary>Other spectra</summary>' + bars(sc, ['att_anxiety', 'att_avoidance', 'dm_maximizer', 'dm_risk', 'E_sociability', 'N_anxiety', 'A_empathy', 'O_fantasy']) + '<a class="small" href="#results/' + encodeURIComponent(r.id) + '">All 40+ trait scores \u203a</a></details>' + (T.tags.length ? '<h3 class="tyh">Your tags</h3><div class="chips">' + T.tags.map(function (t) { return '<span class="chip" data-x="tag:' + esc(t) + '">#' + esc(t) + '</span>'; }).join('') + '</div><p class="tymeta">Auto labels for the traits furthest from the middle.</p>' : ''));
    h += sec('soc', '\ud83d\udd04', 'Socionics-style', so.code + ' \u00b7 ' + so.name, tyRow({ sys: 'socionics', res: so, badge: so.code, kicker: 'Socionics-style type', title: so.code + ' (' + so.letters + ') \u00b7 ' + so.name, text: 'Quadra ' + so.quadra + ': ' + so.quadraText + '.', meta: 'Dual (the type Socionics says completes you): ' + so.dual + ' (' + so.dualLetters + '), ' + so.dualName + '. Matched from your 4-letter type; MBTI \u2194 Socionics matching is debated.', conf: so.conf }));
    h += sec('temper', '\ud83c\udf21\ufe0f', 'Temperament', tp.emoji + ' ' + tp.name, tyRow({ sys: 'temper', res: tp, badge: tp.emoji, kicker: 'Classic temperament', title: tp.name, text: tp.text, meta: tp.share + '% ' + tp.name.toLowerCase() + ', then ' + tp.second.share + '% ' + tp.second.name.toLowerCase(), conf: tp.conf }));
    h += sec('disc', '\ud83c\udfa8', 'DISC-style \u00b7 behavioral type', di.name + ' \u00b7 ' + di.color, tyRow({ sys: 'disc', res: di, badge: di.key, bstyle: 'background:' + di.hex + ';color:#14101f', kicker: 'DISC-style work style', title: di.name + ' \u00b7 ' + di.color, text: di.text, meta: (di.code.length > 1 ? 'Blend with ' : 'Backup style: ') + di.second.name + ' (' + di.second.color + ')', conf: di.conf,
      extra: '<div class="tydisc">' + di.shares.map(function (x) { return '<i style="flex:' + Math.max(1, x.share) + ';background:' + x.hex + '"></i>'; }).join('') + '</div><p class="tymeta">' + di.shares.map(function (x) { return x.key + ' ' + x.share + '%'; }).join(' \u00b7 ') + '</p>' }));
    h += sec('arche', '\ud83c\udfad', 'Archetype \u00b7 Jungian-style', ar.emoji + ' ' + ar.name, tyRow({ sys: 'arche', res: ar, badge: ar.emoji, kicker: 'Archetype \u00b7 Jungian-style', title: ar.name, text: ar.text, meta: 'Runner-up: ' + ar.second.name, conf: ar.conf,
      extra: '<details class="fold"><summary>All 12 archetypes</summary>' + tyMini(ar.ranked.map(function (a) { return [a.emoji + ' ' + a.name, a.score, a.score, '', 'arche:' + a.key]; })) + '</details>' }));
    h += sec('attach', '\ud83e\udd1d', 'Attachment', at.emoji + ' ' + at.name, tyRow({ sys: 'attach', res: at, badge: at.emoji, kicker: 'Attachment style', title: at.name, text: (S.ATT[at.key] || {}).text || '', meta: 'Anxiety ' + at.anxiety + '/100 \u00b7 avoidance ' + at.avoidance + '/100', conf: at.conf }));
    h += sec('cluster', '\ud83e\udec2', 'Cluster + tree', cl.emoji + ' ' + cl.name + ' \u00b7 ' + cl.match + '%', tyRow({ sys: 'cluster', res: cl, badge: cl.emoji, bstyle: 'background:' + cl.color, kicker: 'Your cluster', title: cl.name + ' \u00b7 ' + cl.match + '% match', text: cl.text, meta: 'Similar to: ' + cl.similar.map(function (c) { return c.emoji + ' ' + c.name + ' (' + c.match + '%)'; }).join(', '), conf: cl.conf }) +
      '<details class="fold"><summary>All 8 clusters</summary>' + tyMini(cl.ranked.map(function (c) { return [c.emoji + ' ' + c.name, c.match + '%', c.match, c.color, 'cluster:' + c.key]; })) + '<p class="tymeta">Match = how close your Big Five scores are to each profile. The profiles are hand-made, not measured groups of real people.</p></details>' +
      '<h3 class="tyh">Your path down the tree</h3>' + '<ol class="tytree">' + T.taxonomy.map(function (x, i) { return '<li data-x="' + ['family', 'cluster', 'four', 'subtype'][i] + '"><span class="tyk">' + esc(x.level) + '</span><b>' + esc(x.name) + '</b><small>' + esc(x.note) + '</small></li>'; }).join('') + '</ol>');
    h += sec('styles', '\ud83e\udde0', 'Decision + learning style', cg.name, tyRow({ sys: 'cognitive', res: cg, badge: cg.emoji, kicker: 'Decision / thinking style', title: cg.name, text: cg.text, meta: [cg.scope, cg.maximizer, cg.risk].filter(Boolean).join(' \u00b7 '), conf: cg.conf }) +
      tyRow({ sys: 'learning', res: ls, badge: ls.emoji, kicker: 'Learning style preference', title: ls.name, text: ls.text, meta: 'Heads up: learning styles are popular, but research hasn\u2019t shown that studying in your \u201cstyle\u201d helps you learn more. Treat it as a preference.', conf: ls.conf }));
    var th = T.thinking, tm = T.team, LL = T.lenses;
    h += sec('think', '\ud83c\udf04', 'Thinking style \u00b7 cognitive style', th.emoji + ' ' + th.name, tyRow({ sys: 'thinking', res: th, badge: th.emoji, kicker: 'Thinking style \u00b7 for fun', title: th.name, text: th.text,
      meta: (u.addonPer && u.addonPer.thinking ? '' : 'A rough guess from your main quiz until you take the 6-question quiz. ') + 'Based on cognitive-style research ideas, not a validated test.', conf: th.conf,
      extra: '<div data-x="thinking">' + spec('Step-by-step', 'Big-picture', th.whole) + spec('Words', 'Pictures', th.visual) + spec('Context-led', 'Independent', th.field) + '</div><p class="tymeta">' + esc(th.fieldName + ': ' + th.fieldText + '.') + '</p>' }));
    h += sec('team', '\ud83e\udded', 'Team role \u00b7 persona \u00b7 niche', tm.emoji + ' ' + tm.name, tyRow({ sys: 'team', res: tm, badge: tm.emoji, kicker: 'Your role in a group', title: tm.name, text: tm.text,
      meta: 'Runner-up: ' + tm.second.name + '. Best niche: ' + LL.niche.join(', ') + '. Our own role names, not the Belbin test.', conf: tm.conf,
      extra: '<details class="fold"><summary>All 8 roles</summary>' + tyMini(tm.ranked.map(function (x) { return [x.emoji + ' ' + x.name, x.score, x.score, '', 'team']; })) + '</details>' }));
    h += sec('classified', '\ud83e\uddeb', 'Your Mindprint, classified', LL.taxon[7][1], classifiedHtml(T, r, nRt));
    h += sec('lenses', '\ud83d\udd2d', 'Fun lenses', '30+ other ways to sort you', lensesHtml(T, sc, r));
    h += '<div id="ty-lens-state">' + sec('state', '\ud83c\udf21\ufe0f', 'Today\u2019s state (optional)', (LS.get('mood', null) || {}).q || 'Not checked yet', moodHtml()) + '</div>';
    h += '<div class="card"><details class="fold"><summary>How these are worked out</summary><ul class="care small">' +
      '<li><b>Everything starts from your main quiz scores</b> (0\u2013100 on each trait). A few Deep Dive answers about growing up nudge attachment, social energy and sensitivity a little. Sharpen answers then count alongside the quiz.</li>' +
      '<li><b>Confidence</b> = how clearly your answers point to one result and how many answers back it up. It is not a measure of accuracy.</li>' +
      '<li><b>4-letter type:</b> E/I from Extraversion, N/S from Openness, F/T from Agreeableness, J/P from Conscientiousness.</li>' +
      '<li><b>Enneagram-style, archetype, DISC-style, decision and learning style:</b> each option averages the traits that fit it; your top one wins.</li>' +
      '<li><b>Temperament:</b> the four classic temperaments mapped onto Extraversion and emotional sensitivity.</li>' +
      '<li><b>Cluster:</b> the nearest of 8 hand-made profiles on your Big Five.</li>' +
      '<li><b>Thinking style:</b> three sliders (step-by-step vs big-picture, words vs pictures, context-led vs independent) borrowed from cognitive-style research. A rough guess from the main quiz until you take its 6 questions. <b>Team role:</b> the 8 group roles ranked from your traits, plus its optional 6 questions.</li>' +
      '<li><b>Classified:</b> the same results relabelled with taxonomy words (kingdom to species, quadrant, tier, phenotype). Nothing new is measured there.</li>' +
      '<li><b>Socionics-style:</b> matched from your 4-letter type (introverts swap the last letter). Matching between the two systems is debated.</li>' +
      '<li><b>Retake this part:</b> a different set of questions than the ones that scored it. Retake answers count double, so they can correct a guess.</li>' +
      '<li><b>Not me?</b> Pick your real type and it shows as self-identified, with what your answers said underneath. A 4-letter, Socionics, temperament or attachment pick also moves the trait scores it comes from a little, so your cluster and tree update too.</li>' +
      '<li><b>Lenses</b> are different ways of sorting the same answers. The profiles, names and maps are made up for fun; none of them are measured groups of real people.</li></ul></details><p class="muted small">' + esc(TYNOTE) + '</p></div>';
    V.innerHTML = h; tyBindShare(f, cl); bindLenses(T); xSet(r, T, sc);
    var a0 = (location.hash.split('#')[2] || ''); if (a0 && $('#ty-' + a0)) goTo($('#ty-' + a0), true); else jumpSpy();
  }
  /* ---------- Lenses (Odin's categorization list, Oct 25 2026): the same answers seen as maps, trees, groups, tiers, labels and graphs ---------- */
  var LENSID = {'Where you sit': 'map', 'Your vector': 'vector', 'Bins and cells': 'bins', 'Profile shape': 'shape', 'Soft membership': 'mixture', 'Your sets': 'sets', 'Tribe, guild and school': 'tribe', 'Your role and niche': 'roles', 'Values profile': 'values', 'Your personality taxonomy': 'taxon', 'Cluster family tree': 'tree', 'Supertype and subtype': 'super', 'Trait graph': 'graph', 'You as a knowledge graph': 'kg', 'Your Socionics relation': 'socrel', 'Your trait tier list': 'tiers', 'Your priorities': 'prio', 'Persona': 'persona', 'Facets': 'facets', 'Your tags, with synonyms': 'thes', 'Genre, style and modality': 'genre', 'Your pattern': 'pattern', 'Your personality code': 'code', 'Topics from your Deep Dive': 'topics', 'How textbook are you?': 'proto', 'Stereotype check': 'stereo', 'Are you a \u201ckind\u201d?': 'kind', 'True statements about you': 'pred'};
  function lensGroup(icon, title, terms, inner, open) { return '<details class="lensg"' + (open ? ' open' : '') + '><summary><span aria-hidden="true">' + icon + '</span> ' + esc(title) + '</summary><p class="lterms">' + esc(terms) + '</p>' + inner + '</details>'; }
  function lens(title, terms, body, open, id) { id = id || LENSID[title]; return '<details class="fold lens"' + (open ? ' open' : '') + '><summary>' + esc(title) + (terms ? ' <small>' + esc(terms) + '</small>' : '') + (id ? '<span class="xi" role="button" tabindex="0" data-xi="1" data-x="lens:' + id + '" aria-label="What this means and why">i</span>' : '') + '</summary>' + (id ? '<div data-x="lens:' + id + '">' + body + '</div>' : body) + '</details>'; }
  function mapSvg(L) {
    var X = function (v) { return 24 + 252 * v / 100; }, Y = function (v) { return 276 - 252 * v / 100; }, s = '<svg class="tymap" viewBox="0 0 300 300" role="img" aria-label="Where you sit: openness and outgoingness across, steadiness up">';
    s += '<rect x="24" y="24" width="252" height="252" rx="8" class="mbg"/><line x1="150" y1="24" x2="150" y2="276" class="max"/><line x1="24" y1="150" x2="276" y2="150" class="max"/>';
    s += '<text x="146" y="40" text-anchor="end" class="mq">Steady Anchor</text><text x="154" y="40" class="mq">Grounded Explorer</text><text x="146" y="270" text-anchor="end" class="mq">Inner World</text><text x="154" y="270" class="mq">Restless Explorer</text>';
    s += '<text x="150" y="296" text-anchor="middle" class="ml">Reserved, routine \u2190 \u2192 Outgoing, curious</text><text x="10" y="150" text-anchor="middle" class="ml" transform="rotate(-90 10 150)">Reactive \u2190 \u2192 Steady</text>';
    L.points.forEach(function (p) { s += '<g data-x="cluster:' + esc(p.key) + '"><circle cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="11" fill="' + esc(p.color) + '" opacity=".35"/><text x="' + X(p.x) + '" y="' + (Y(p.y) + 4) + '" text-anchor="middle" class="me">' + esc(p.emoji) + '</text></g>'; });
    s += '<g data-x="lens:map"><circle cx="' + X(L.x) + '" cy="' + Y(L.y) + '" r="9" class="mu"/><text x="' + X(L.x) + '" y="' + (Y(L.y) - 13) + '" text-anchor="middle" class="mt">You</text></g></svg>';
    return s;
  }
  function graphSvg(L) {
    var g = L.graph, tr = g.traits, rs = g.results, s = '<svg class="tygraph" viewBox="0 0 300 250" role="img" aria-label="Which of your traits feed which result">', ty = function (i, n) { return 22 + i * (206 / Math.max(1, n - 1)); };
    var pos = {}; tr.forEach(function (t, i) { pos[t.key] = ty(i, tr.length); });
    rs.forEach(function (r, j) { var y = ty(j, rs.length); r[2].forEach(function (k) { var t = tr.filter(function (x) { return x.key === k; })[0], w = t ? Math.abs(t.v - 50) / 50 : 0;
      s += '<line x1="70" y1="' + pos[k] + '" x2="190" y2="' + y + '" class="gl" stroke-width="' + (0.6 + 2.6 * w).toFixed(1) + '" opacity="' + (0.25 + 0.6 * w).toFixed(2) + '"/>'; }); });
    tr.forEach(function (t) { s += '<g data-x="scale:' + esc(t.key) + '"><circle cx="58" cy="' + pos[t.key] + '" r="14" class="gn"/><text x="58" y="' + (pos[t.key] + 4) + '" text-anchor="middle" class="gt">' + esc(t.key) + '</text><text x="36" y="' + (pos[t.key] + 4) + '" text-anchor="end" class="gv">' + t.v + '</text></g>'; });
    rs.forEach(function (r, j) { var y = ty(j, rs.length); s += '<g data-x="' + esc(r[0]) + '"><rect x="190" y="' + (y - 11) + '" width="104" height="22" rx="11" class="gr"/><text x="242" y="' + (y + 4) + '" text-anchor="middle" class="gt">' + esc(String(r[1]).slice(0, 16)) + '</text></g>'; });
    return s + '</svg>';
  }
  function topicWords() { var d = results('deep')[0]; if (!d) return []; var STOP = 'that this with have from they them were what when your just like really about there their would could because always never think things thing being much more some very been they\u2019re don\u2019t didn\u2019t also into then than only even still other dont didnt wasnt it\u2019s i\u2019m im its youre feel felt make made know lot lots kind sort pretty';
    var stop = {}; STOP.split(' ').forEach(function (w) { stop[w] = 1; }); var c = {};
    (d.answers || []).forEach(function (x) { var t = typeof x.v === 'string' ? x.v : Array.isArray(x.v) ? x.v.filter(function (y) { return typeof y === 'string'; }).join(' ') : ''; String(t).toLowerCase().replace(/^other: /, '').split(/[^a-z\u2019']+/).forEach(function (w) { if (w.length >= 4 && !stop[w]) c[w] = (c[w] || 0) + 1; }); });
    return Object.keys(c).filter(function (w) { return c[w] >= 2; }).sort(function (x, y) { return c[y] - c[x]; }).slice(0, 8); }
  var MOODQ = { Charged: 'high energy, good mood', Calm: 'low energy, good mood', Wired: 'high energy, rough mood', Drained: 'low energy, rough mood' };
  function moodHtml() { var m = LS.get('mood', null);
    var cur = m ? '<p class="tymeta">Last check ' + fmtDate(m.at) + ': <b>' + esc(m.q) + '</b> (' + esc(MOODQ[m.q]) + ')' + (m.s >= 60 ? ', in a high-pressure phase' : '') + '.</p>' : '';
    return '<p class="muted small" data-x="lens:state">Optional and saved on this phone only. Your type is who you are most of the time; your state is today. Three sliders put you in a quadrant of the state space.</p>' + cur +
      ['e:Energy:Empty:Full', 'm:Mood:Rough:Great', 's:Stress:Chill:Maxed'].map(function (x) { var p = x.split(':'); return '<label class="msl">' + p[1] + ' <input type="range" min="0" max="100" value="' + (m ? m[p[0]] : 50) + '" id="mood-' + p[0] + '"><span class="ends"><span>' + p[2] + '</span><span>' + p[3] + '</span></span></label>'; }).join('') +
      '<button class="btn ghost block" id="moodsave">Save today\u2019s state</button>' + (m ? '<button class="btn ghost block" id="moodclear">Clear it</button>' : ''); }
  function bindLenses(T) {
    var b = $('#moodsave'); if (b) b.onclick = function () { var e = +$('#mood-e').value, mo = +$('#mood-m').value, s = +$('#mood-s').value, q = e >= 50 ? (mo >= 50 ? 'Charged' : 'Wired') : (mo >= 50 ? 'Calm' : 'Drained');
      LS.set('mood', { e: e, m: mo, s: s, q: q, at: Date.now() }); toast('Today: ' + q); if (location.hash === '#types#lens-state') typesHub(); else location.hash = '#types#lens-state'; };
    var c = $('#moodclear'); if (c) c.onclick = function () { LS.set('mood', null); typesHub(); };
  }
  function lensLocked() {
    return '<div class="card lockl"><div class="lrow" data-x="lock:lenses">' + LOCK + '<span>Fun lenses \u00b7 30+<small>Maps, groups, taxonomy, networks, tiers, labels and philosophy-ish lenses on your answers</small></span><b class="pill">Pro</b></div></div>';
  }
  function lensesHtml(T, sc, r) {
    var L = T.lenses; if (!L) return ''; var nm = function (k) { return S.nm(k) || k; }, h = '';
    h += '<p class="muted small">The same answers sorted as maps, groups, trees, networks, tiers and labels. Made up for fun, all inferred from your answers. Tap a group to open it.</p>';
    /* Traits & dimensions */
    h += lensGroup('\ud83d\udccd', 'Traits & dimensions', 'Coordinate space \u00b7 vector space \u00b7 factor \u00b7 principal component \u00b7 axis \u00b7 dimension \u00b7 spectrum \u00b7 continuum \u00b7 scale \u00b7 quadrant \u00b7 matrix \u00b7 bucket \u00b7 bin \u00b7 cell \u00b7 value range \u00b7 morphotype',
      lens('Where you sit', 'map \u00b7 quadrant', mapSvg(L.map) + '<p class="tyt">You\u2019re in the <b>' + esc(L.map.quadrant) + '</b> quadrant: ' + esc(L.map.quadrantText) + '. Across = how outgoing and curious you are (Extraversion + Openness). Up = how steady you are (Agreeableness + Conscientiousness + calm). Psychologists call these two the Big Five\u2019s \u201chigher-order\u201d factors (Plasticity and Stability); it\u2019s a published idea, still debated. The coloured dots are the 8 cluster profiles.</p>', true) +
      lens('Your vector', 'coordinates in 5D', '<p class="tyt lcode">(' + L.map.vector.map(function (v) { return v.key + ' ' + v.v; }).join(', ') + ')</p><p class="tymeta">Your Big Five as one point in a 5-dimensional space. Every cluster match is a distance from this point.</p>') +
      lens('Bins and cells', 'buckets \u00b7 value ranges', '<div class="lbins">' + L.bins.map(function (b) { return '<div class="lbr"><span>' + esc(nm(b.key)) + '</span>' + [0, 1, 2, 3, 4].map(function (i) { return '<i class="' + (i === b.bin ? 'on' : '') + '"></i>'; }).join('') + '<b>' + esc(b.name) + '</b></div>'; }).join('') + '</div><p class="tymeta">Each score dropped into one of 5 ranges: 0\u201320, 21\u201340, 41\u201359, 60\u201379, 80\u2013100.</p>') +
      lens('Profile shape', 'morphotype \u00b7 form', '<p class="tyt"><b>' + esc(L.shape[0]) + '</b>: ' + esc(L.shape[1]) + '.</p>'));
    /* Clusters & groups */
    h += lensGroup('\ud83e\udec2', 'Clusters & groups', 'Latent class \u00b7 mixture model \u00b7 membership class \u00b7 set \u00b7 subset \u00b7 partition \u00b7 equivalence class \u00b7 cohort \u00b7 tribe \u00b7 guild \u00b7 school \u00b7 affinity group \u00b7 community \u00b7 role \u00b7 niche \u00b7 ecotype \u00b7 function class \u00b7 psychographic profile',
      lens('Soft membership', 'mixture model \u00b7 latent class', tyMini(L.mixture.map(function (c) { return [c.emoji + ' ' + c.name, c.pct + '%', c.pct, c.color]; })) + '<p class="tymeta">Instead of one box, a share of you in each cluster (closer profiles get more). Like a mixture model, but over 8 hand-made profiles, not a model fitted to real people.</p>', true) +
      lens('Your sets', 'sets \u00b7 subsets \u00b7 partition \u00b7 equivalence class', '<div class="chips">' + L.sets.map(function (x, i) { return '<span class="chip" data-x="' + (['letter:0', 'letter:1', 'letter:2', 'letter:3', 'temper', 'attach', 'family'][i] || 'lens:sets') + '">' + esc(x) + '</span>'; }).join('') + '</div><p class="tyt">You\u2019re in the intersection of all of these. The 16 four-letter types <b>partition</b> everyone into 16 non-overlapping parts; add temperament and you get 64. Your <b>equivalence class</b> (everyone who matches you on both) is <b>' + esc(L.equiv) + '</b>, your quiz cohort.</p>') +
      lens('Tribe, guild and school', 'affinity group \u00b7 community', '<ul class="lul"><li><b>Tribe:</b> ' + esc(L.tribe.name) + ' (' + esc(L.tribe.text) + ')</li><li><b>Guild:</b> ' + esc(L.guild.name) + ' (' + esc(L.guild.text) + ')</li><li><b>School:</b> ' + esc(L.school.name) + ' (you value ' + esc(L.school.text) + ' most)</li><li><b>Affinity group:</b> ' + esc(L.affinity.join(', ')) + '</li></ul><p class="tymeta">Made-up groups, sorted from your 4-letter type, DISC style, top value and nearest clusters.</p>') +
      lens('Your role and niche', 'role \u00b7 function class \u00b7 niche \u00b7 ecotype', '<ul class="lul">' + L.roles.map(function (x, i) { return '<li data-x="lens:roles"><b>' + (i ? 'Backup: ' : 'Group role: ') + esc(x.name) + '</b>, ' + esc(x.text) + ' <span class="muted">(' + x.s + '/100)</span></li>'; }).join('') + '</ul><p class="tyt"><b>Your niche:</b> you\u2019d probably do best in ' + esc(L.niche.join(', ')) + '.</p>') +
      lens('Values profile', 'psychographic', '<p class="tyt">What you care about, in order: ' + esc(L.priorities.map(function (k, i) { return (i + 1) + '. ' + nm(k); }).join('  ')) + '.</p>'));
    /* Hierarchy & taxonomy */
    h += lensGroup('\ud83c\udf33', 'Hierarchy & taxonomy', 'Taxonomy \u00b7 domain \u00b7 kingdom \u00b7 phylum \u00b7 class \u00b7 order \u00b7 family \u00b7 genus \u00b7 species \u00b7 taxon \u00b7 taxonomic rank \u00b7 tree \u00b7 dendrogram \u00b7 clade \u00b7 lineage \u00b7 supertype \u00b7 subtype \u00b7 variant \u00b7 instance',
      lens('Your personality taxonomy', 'Linnaean-style, for fun', '<ol class="tytree ltax">' + L.taxon.map(function (x, i) { return '<li data-x="' + ['lens:taxon', 'scale:E', 'scale:N', 'family', 'temper', 'cluster', 'four', 'lens:taxon', 'ennea'][i] + '"><span class="tyk">' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b><small>' + esc(x[2]) + '</small></li>'; }).join('') + '<li><span class="tyk">Instance</span><b>' + esc(r.name || 'You') + '</b><small>one of a kind</small></li></ol><p class="tymeta">Fake Latin, real logic: each rank narrows the one above it.</p>', true) +
      lens('Cluster family tree', 'dendrogram \u00b7 clade \u00b7 lineage', '<div class="ldend">' + L.tree.map(function (x) { return '<div class="' + (x.mine ? 'mine' : '') + (x.leaf ? ' leaf' : '') + '" style="padding-left:' + (x.depth * 14) + 'px">' + (x.depth ? '\u2514 ' : '') + esc(x.label) + '</div>'; }).join('') + '</div><p class="tymeta">The 8 profiles joined by similarity (closest pairs first). Highlighted = your lineage. Your clade: ' + esc((L.clade[L.clade.length - 1] || []).join(', ') || T.cluster.name) + '.</p>') +
      lens('Supertype and subtype', 'variant', '<p class="tyt">Supertype: <b>' + esc(L.supertype) + '</b> \u2192 type: <b>' + esc(T.four.code) + '</b> \u2192 subtype: <b>' + esc(L.subtype) + '</b> \u2192 variant: <b>' + esc(T.ennea.code) + '</b>.</p>'));
    /* Relations & networks */
    h += lensGroup('\ud83d\udd78\ufe0f', 'Relations & networks', 'Network \u00b7 graph \u00b7 knowledge graph \u00b7 semantic network \u00b7 relation \u00b7 association class \u00b7 ontology \u00b7 entity type \u00b7 domain model',
      lens('Trait graph', 'network', graphSvg(L) + '<p class="tymeta">Lines show which traits feed which result. Thicker = that trait is further from the middle for you, so it pulls harder.</p>', true) +
      lens('You as a knowledge graph', 'triples \u00b7 ontology', '<ul class="ltri">' + L.triples.map(function (x) { return '<li><b>' + esc(x[0]) + '</b> <i>' + esc(x[1]) + '</i> <b>' + esc(x[2]) + '</b></li>'; }).join('') + '</ul><p class="tymeta">Subject \u2192 relation \u2192 object, the way knowledge graphs store facts.</p>') +
      lens('Your Socionics relation', 'relation', '<p class="tyt">Socionics is built on relations between types. Your <b>dual</b>, the type it says fits you best, is <b>' + esc(T.socionics.dual + ' (' + T.socionics.dualLetters + ')') + '</b>, ' + esc(T.socionics.dualName) + '. Not proven by research; fun to compare with friends.</p>'));
    /* Tiers & levels */
    var tierRow = function (k) { var xs = L.tiers[k]; return '<div class="ltier"><b class="t' + k + '">' + k + '</b><div>' + (xs.length ? xs.map(function (x) { return '<span class="chip" data-x="tier:' + esc(x.key) + '">' + esc(nm(x.key)) + ' ' + x.v + '</span>'; }).join('') : '<span class="muted small">none</span>') + '</div></div>'; };
    h += lensGroup('\ud83c\udfc5', 'Tiers & levels', 'Tier list \u00b7 tier \u00b7 rank \u00b7 level \u00b7 stratum \u00b7 ordinal scale \u00b7 priority class',
      lens('Your trait tier list', 'S to D', ['S', 'A', 'B', 'C', 'D'].map(tierRow).join('') + '<p class="tymeta">Tiers rank how strongly each trait shows in your answers (S = 85+, A = 70+, B = 55+, C = 40+, D = under 40). Not how good it is: a D in sensitivity just means you\u2019re calm.</p>', true) +
      lens('Your priorities', 'priority class', '<ol class="lul">' + L.priorities.map(function (k) { return '<li data-x="scale:' + esc(k) + '">' + esc(nm(k)) + '</li>'; }).join('') + '</ol>'));
    /* Labels & tags */
    var tw = topicWords();
    h += lensGroup('\ud83c\udff7\ufe0f', 'Labels & tags', 'Label \u00b7 tag \u00b7 facet \u00b7 metadata \u00b7 controlled vocabulary \u00b7 thesaurus \u00b7 index \u00b7 genre \u00b7 style \u00b7 modality \u00b7 persona \u00b7 behavioral type \u00b7 coding scheme \u00b7 phenotype \u00b7 topic cluster \u00b7 pattern \u00b7 configuration',
      lens('Persona', 'persona class', '<div class="lper"><div class="tyb emo">' + esc(L.persona.emoji) + '</div><div><h3>' + esc(L.persona.name) + '</h3><ul class="lul"><li><b>Wants:</b> ' + esc(L.persona.wants) + '</li><li><b>At work:</b> ' + esc(L.persona.work) + '</li><li><b>With people:</b> ' + esc(L.persona.people) + '</li><li><b>Under stress:</b> ' + esc(L.persona.stress) + '</li></ul></div></div>', true) +
      lens('Facets', 'metadata \u00b7 filters', '<div class="lfac">' + L.facets.map(function (x) { return '<div><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div><p class="tymeta">Like the filters on a shopping site, but for you.</p>') +
      lens('Your tags, with synonyms', 'controlled vocabulary \u00b7 thesaurus', T.tags.length ? '<ul class="lul">' + L.thesaurus.map(function (x) { return '<li data-x="tag:' + esc(x.tag) + '"><b>#' + esc(x.tag) + '</b>' + (x.syn.length ? ' \u2248 ' + esc(x.syn.join(', ')) : '') + '</li>'; }).join('') + '</ul><p class="tymeta">Observable traits (your phenotype): ' + esc(L.phenotype.join(', ')) + '.</p>' : '<p class="muted small">Your scores are close to the middle, so no tags stood out.</p>') +
      lens('Genre, style and modality', 'genre \u00b7 style \u00b7 modality', '<ul class="lul"><li><b>If you were a genre:</b> ' + esc(L.genre) + '</li><li><b>Communication style:</b> ' + esc(L.comm) + '</li><li><b>Social modality:</b> ' + esc(L.modality) + '</li><li><b>Behavioral type (DISC-style):</b> ' + esc(T.disc.name) + '</li></ul>') +
      lens('Your pattern', 'pattern \u00b7 configuration \u00b7 structure', '<p class="tyt"><b>' + esc(L.pattern.name) + '</b>. ' + esc(L.pattern.text) + '</p>') +
      lens('Your personality code', 'coding scheme \u00b7 index', '<p class="tyt lcode">' + esc(L.code) + '</p><p class="tymeta">4-letter \u00b7 Enneagram-style \u00b7 temperament \u00b7 Big Five code \u00b7 Socionics-style \u00b7 DISC-style, in one string.</p>') +
      (tw.length ? lens('Topics from your Deep Dive', 'topic cluster', '<div class="chips">' + tw.map(function (w) { return '<span class="chip">' + esc(w) + '</span>'; }).join('') + '</div><p class="tymeta">Words that came up more than once in your typed Deep Dive answers.</p>') : ''));
    /* Philosophy-ish */
    h += lensGroup('\ud83c\udfdb\ufe0f', 'Philosophy-ish', 'Prototype \u00b7 exemplary type \u00b7 stereotype \u00b7 natural kind \u00b7 universal \u00b7 particular \u00b7 predicate class \u00b7 concept class \u00b7 essentialist type',
      lens('How textbook are you?', 'prototype \u00b7 exemplary type', '<p class="tyt">For your 4-letter type you\u2019re a <b>' + esc(L.prototype.name) + '</b> (' + L.prototype.pct + '/100 from the middle). Your nearest neighbour type is <b>' + esc(L.prototype.neighbor) + '</b>. Prototype theory says categories have a fuzzy centre and blurry edges, and people sit closer or further from it.</p>', true) +
      lens('Stereotype check', 'stereotype', '<ul class="lul">' + L.stereo.map(function (x, i) { return '<li data-x="stereo:' + i + '"><b>' + esc(x.letter) + '</b> types get called \u201c' + esc(x.claim) + '\u201d: <b>' + esc(x.fits) + '</b></li>'; }).join('') + '</ul>') +
      lens('Are you a \u201ckind\u201d?', 'natural kind \u00b7 universal', '<p class="tyt">Most research finds personality is spread out on scales, not split into natural kinds, so types are useful boxes, not species. Your traits sit on average <b>' + L.boxiness + '/100</b> away from the middle: ' + (L.boxiness >= 40 ? 'pretty boxable' : L.boxiness >= 20 ? 'somewhat boxable' : 'hard to box, you\u2019re near the middle on most things') + '. The type is the universal; you are the particular.</p>') +
      lens('True statements about you', 'predicate class', '<ul class="lpred">' + L.predicates.map(function (x, i) { return '<li data-x="pred:' + i + '" class="' + (x[1] ? 'y' : 'n') + '">' + (x[1] ? '\u2713 ' : '\u2717 ') + esc(x[0]) + '</li>'; }).join('') + '</ul>'));
    /* State */
    return h;
  }
  /* ---------- "Not me? Pick my real type" ---------- */
  function pickOpts(sys) { var M = window.MPTypes;
    if (sys === 'four') return Object.keys(M.FOUR).sort().map(function (k) { return [k, k, M.FOUR[k][0]]; });
    if (sys === 'socionics') return Object.keys(M.SOC).map(function (k) { return [k, k + ' (' + M.SOC[k][0] + ')', M.SOC[k][1] + ' \u00b7 ' + M.SOC[k][2]]; });
    if (sys === 'ennea') { var o = []; M.EN.forEach(function (e) { var n = e[0], l = ((n + 7) % 9) + 1, r = (n % 9) + 1; [l, r].forEach(function (w) { o.push([n + 'w' + w, n + 'w' + w, e[1] + ', wing ' + w]); }); }); return o; }
    if (sys === 'temper') return Object.keys(M.TEMP).map(function (k) { return [k, M.TEMP[k][1] + ' ' + M.TEMP[k][0], M.TEMP[k][2]]; });
    if (sys === 'arche') return M.AR.map(function (x) { return [x[0], x[2] + ' ' + x[1], x[3]]; });
    if (sys === 'disc') return Object.keys(M.DISC).map(function (k) { return [k, k + ' \u00b7 ' + M.DISC[k][0], M.DISC[k][1] + ': ' + M.DISC[k][3]]; });
    if (sys === 'attach') return Object.keys(M.ATTN).map(function (k) { return [k, M.ATTN[k][1] + ' ' + M.ATTN[k][0], (S.ATT[k] || {}).text || '']; });
    if (sys === 'cognitive') return Object.keys(M.CG).map(function (k) { return [k, M.CG[k][1] + ' ' + M.CG[k][0], M.CG[k][2]]; });
    if (sys === 'learning') return Object.keys(M.LS).map(function (k) { return [k, M.LS[k][1] + ' ' + M.LS[k][0], M.LS[k][2]]; });
    if (sys === 'cluster') return M.CLUSTERS.map(function (c) { return [c[0], c[2] + ' ' + c[1], c[5]]; });
    return []; }
  function pick(arg) {
    var sys = String(arg || '').split('/')[0]; if (!PICKABLE[sys]) { location.hash = '#types'; return; }
    if (!pro() && sys !== 'four' && sys !== 'cluster') { location.hash = '#pro'; return; }
    if (needMain()) return;
    var ov = curOv() || {}, mine = ov[sys] || (sys === 'four' && ov.socionics ? window.MPTypes.socToMbti(ov.socionics) : sys === 'socionics' && ov.four ? window.MPTypes.mbtiToSoc(ov.four) : null);
    var inf = '', r = results('main')[0];
    if (full()) { var o2 = tyOpts(); o2.ov = null; var T0 = window.MPTypes.fromScore(scoreOf(r), o2), x = T0[sys]; if (x) inf = (x.code && x.code !== x.name ? x.code + ' ' : '') + (x.name || '') + (x.conf ? ' (' + x.conf.pct + '% confidence)' : ''); }
    else if (r.teaser && r.teaser.types) { var tt = r.teaser.types[sys]; if (tt) inf = (tt.inferred ? (tt.inferred.code || tt.inferred.name) : (tt.code ? tt.code + ' ' : '') + tt.name); }
    V.innerHTML = '<h1 class="pt">Not me? Pick your real one</h1><div class="card"><p class="tag">' + esc(sysName(sys)) + '</p>' + (inf ? '<p class="muted small">Your answers said: <b>' + esc(inf) + '</b></p>' : '') +
      '<p class="muted small">Your pick shows as \u201cself-identified\u201d, with what your answers said underneath. ' + (/^(four|socionics|temper|attach)$/.test(sys) ? 'It also moves the traits it comes from a little, so your cluster and tree update too.' : 'It doesn\u2019t change your other results.') + '</p>' +
      '<div class="pickl">' + pickOpts(sys).map(function (o) { return '<button class="pk' + (mine === o[0] ? ' sel' : '') + '" data-v="' + esc(o[0]) + '"><b>' + esc(o[1]) + '</b><span>' + esc(o[2]) + '</span></button>'; }).join('') + '</div>' +
      (mine ? '<button class="btn ghost block" id="pkclr">Go back to what my answers say</button>' : '') + '<a class="btn ghost block" href="#types#' + esc(sys) + '">Cancel</a></div>';
    function save(v) { var o = JSON.parse(JSON.stringify(curOv() || {})); if (v) o[sys] = v; else delete o[sys];
      if (sys === 'four') delete o.socionics; if (sys === 'socionics') delete o.four; if (!Object.keys(o).length) o = null;
      saveAddon({}, { ov: o }); toast(v ? 'Saved: ' + v + ' (self-identified)' : 'Back to what your answers say'); location.hash = '#types#' + sys; }
    V.querySelector('.pickl').onclick = function (e) { var b = e.target.closest('.pk'); if (b) save(b.dataset.v); };
    if ($('#pkclr')) $('#pkclr').onclick = function () { save(null); };
  }
  /* ---------- Quick diagnostic (Odin, Oct 25 2026: "a shortish diagnostic that does all these"): 28 main-quiz + 6 type questions, feeds every system.
     Answers already given in earlier quizzes count and are not asked again (unless the person chooses to answer everything fresh). ---------- */
  var DIAG = ["m:o3", "m:e1", "x:n1", "m:c1", "m:a3", "m:n1", "m:at2", "m:o5", "m:e3", "x:a1", "m:c4", "m:a1", "m:n3", "m:at5", "m:d1", "m:cf3", "x:s3", "m:o1", "m:e5", "m:c5", "m:a6", "m:n2", "m:at4", "m:v1", "x:l2", "m:d4", "m:so4", "m:o4", "m:s6", "x:n4", "m:cf4", "m:v8", "x:c3", "m:d3"];
  function diagKnown() { var m = results('main')[0], ad = addonRec(), k = {};
    (m ? m.answers : []).forEach(function (x) { if (x.a != null) k['m:' + x.q] = x.a === -1 ? { a: -1, o: x.o } : { a: x.a }; });
    (ad ? ad.answers : []).forEach(function (x) { if (x.a != null) k['x:' + x.q] = x.a === -1 ? { a: -1, o: x.o } : { a: x.a }; }); return k; }
  function diag() {
    var st = LS.get('diagq', null), known = diagKnown(), todo = DIAG.filter(function (id) { return !known[id]; }), nm = LS.get('name', '') || '';
    var h = '<h1 class="pt">Quick diagnostic</h1><div class="card"><p class="tag">' + DIAG.length + ' questions \u00b7 about 8 minutes</p><h2>One short quiz that fills in every type</h2><p>4-letter type, Enneagram-style, temperament, archetype, DISC colour, attachment, Socionics-style, your cluster and 30+ lenses, all at once. Back and Skip work on every question. Afterwards you can retake any one part with different questions.</p>';
    if (st && st.list && st.i > 0) h += '<a class="btn big block" href="#diagq">Continue (' + Math.min(st.i + 1, st.list.length) + ' of ' + st.list.length + ')</a>';
    if (todo.length < DIAG.length) h += '<p class="muted small">You already answered ' + (DIAG.length - todo.length) + ' of these in earlier quizzes, and those answers still count. ' + (todo.length ? 'So it\u2019s just ' + todo.length + ' new question' + (todo.length > 1 ? 's' : '') + '.' : 'You\u2019re already covered.') + '</p>';
    h += '<label>What should we call you?<input id="nm" maxlength="40" autocomplete="given-name" placeholder="First name or nickname" value="' + esc(nm) + '"></label><label class="ck"><input type="checkbox" id="ok"><span>' + esc(PRIV) + '</span></label><p class="muted small">' + DISC + '</p>';
    if (todo.length) h += '<button class="btn big block go" data-m="new" disabled>Start' + (todo.length < DIAG.length ? ' (' + todo.length + ' questions)' : '') + '</button>';
    if (todo.length < DIAG.length) h += '<button class="btn ' + (todo.length ? 'ghost ' : 'big ') + 'block go" data-m="fresh" disabled>Answer all ' + DIAG.length + ' fresh</button>';
    if (!todo.length) h += '<a class="btn ghost block" href="#types">See your types</a>';
    h += '<p class="muted small">Want more detail? The <a href="#start">full 77-question quiz</a> and the Deep Dive are still here.</p></div>';
    V.innerHTML = h;
    $('#ok').onchange = function () { var on = this.checked; V.querySelectorAll('.go').forEach(function (b) { b.disabled = !on; }); };
    V.querySelectorAll('.go').forEach(function (b) { b.onclick = function () { if (!$('#ok').checked) return; var n = $('#nm').value.trim().slice(0, 40); LS.set('name', n); LS.set('addonOk', true);
      var fresh = b.dataset.m === 'fresh'; LS.set('diagq', { list: fresh ? DIAG.slice() : todo, i: 0, answers: {}, fresh: fresh, name: n, t: Date.now() }); location.hash = '#diagq'; }; });
  }
  function diagQ() {
    runQ('diagq', function (q, main) { return main ? (TAGS[q.framework] || 'About you') : 'Your types'; }, diagEnd, function () { location.hash = '#diag'; });
  }
  function diagEnd(st) {
    var mainA = {}, addA = {}, nm = 0, prev = results('main')[0];
    for (var k in st.answers) { var v = st.answers[k]; if (!v) continue; if (k.indexOf('m:') === 0) { mainA[k.slice(2)] = v; nm++; } else addA[k.slice(2)] = v; }
    var base = {}; (prev ? prev.answers : []).forEach(function (x) { base[x.q] = x; });
    for (var q in mainA) base[q] = mainA[q].a === -1 ? { q: q, a: -1, o: String(mainA[q].o || '').slice(0, 300) } : { q: q, a: mainA[q].a };
    var ans = Q.questions.filter(function (z) { return base[z.id]; }).map(function (z) { return base[z.id]; }), scored = ans.filter(function (x) { return x.a >= 0; }).length;
    if (nm && scored < 10) { V.innerHTML = '<div class="card"><h2>Answer a few more first</h2><p class="muted">Mindprint needs at least 10 answered quiz questions to say anything about you. You skipped most of them.</p><button class="btn big block" id="rv">Go back</button></div>'; $('#rv').onclick = function () { st.review = false; st.i = 0; LS.set('diagq', st); diagQ(); }; return; }
    var r = null;
    if (nm) { var skipped = st.list.length - Object.keys(st.answers).filter(function (x) { return st.answers[x]; }).length;
      r = { id: rid(), kind: 'main', at: Date.now(), name: st.name || LS.get('name', ''), answers: ans, qv: Q.version || 1, secs: Math.round((Date.now() - (st.t || Date.now())) / 1000), diag: true, skipped: skipped, prev: prev ? prev.id : null };
      DB.put(r); var fl = ['diag'].concat(skipped ? ['skipped:' + skipped] : []).concat(prev ? ['merged'] : []); submit(r, KEYED ? { scores: compact(scoreOf(r)), flags: fl } : { flags: fl }); }
    if (Object.keys(addA).length) saveAddon(addA); else sync();
    LS.set('diagq', null); busy = false;
    toast(nm ? 'Diagnostic saved' : 'Saved'); var go = function () { location.hash = '#types'; };
    if (!full() && r) { V.innerHTML = '<div class="card center"><div class="spin"></div><p>Working out your types\u2026</p></div>'; Promise.race([flush(), new Promise(function (ok) { setTimeout(ok, 6000); })]).then(go, go); } else go();
  }
  /* ---------- one question runner for sharpen, retake and the quick diagnostic: Back, Skip, "Other", skipped review ----------
     st = { list: [ids], i, answers: { id: {a, o} }, skip: {}, rv: {}, review } ; ids are 'm:<main id>' (main quiz) or 'x:<addon/retake id>'. */
  function qOf(id) { var src = id.slice(0, 2), q = id.slice(2);
    if (src === 'm:') return (Q.questions.filter(function (z) { return z.id === q; })[0]) || null;
    return ((A && A.all) || []).filter(function (z) { return z.id === q; })[0] || null; }
  function runQ(lsKey, tag, onDone, onQuit) {
    var st = LS.get(lsKey, null); if (!st) { onQuit(); return; }
    st.skip = st.skip || {}; var ids = st.list, i = Math.min(st.i, ids.length - 1), id = ids[i], q = qOf(id), cur = st.answers[id]; busy = true;
    if (!q) { st.list = ids.filter(function (x) { return qOf(x); }); st.i = 0; LS.set(lsKey, st); if (!st.list.length) { onQuit(); return; } runQ(lsKey, tag, onDone, onQuit); return; }
    var lik = q.type === 'likert', main = id.indexOf('m:') === 0;
    var opts = q.options.map(function (o, k) { return '<button class="opt' + (cur && cur.a === k ? ' sel' : '') + '" data-k="' + k + '">' + esc(o.t) + '</button>'; }).join('') + (lik || q.typeOnly ? '' : otherBtn(cur && cur.a === -1 ? cur.o : null));
    V.innerHTML = '<div class="qtop"><button class="back" id="bk"' + (i ? '' : ' disabled') + '>\u2039 Back</button><span class="count">' + (st.review ? 'Skipped \u00b7 ' : '') + (i + 1) + ' / ' + ids.length + '</span><button class="back skipb" id="sk">Skip \u203a</button></div><div class="bar"><i style="width:' + Math.round(100 * i / ids.length) + '%"></i></div>' +
      '<div class="qcard"><p class="tag">' + esc(typeof tag === 'function' ? tag(q, main) : tag) + (st.skip[id] && !cur ? ' \u00b7 skipped' : '') + '</p><h2 class="q">' + esc(q.text) + '</h2><div class="opts' + (lik ? ' likert' : '') + '">' + opts + '</div></div><button class="btn ghost block" id="quit">Stop here (answers so far are kept)</button>';
    function again() { runQ(lsKey, tag, onDone, onQuit); }
    function adv() { var n = nextIdx(st, ids, i); if (n < 0) { var left = skippedLeft(st, ids); LS.set(lsKey, st);
        if (left && !st.review) reviewScreen(left, function () { st.review = true; st.rv = {}; st.i = nextIdx(st, ids, 0); LS.set(lsKey, st); again(); }, function () { busy = false; onDone(st); }, again);
        else { busy = false; onDone(st); } return; }
      st.i = n; LS.set(lsKey, st); again(); }
    $('#bk').onclick = function () { st.review = false; st.rv = {}; st.i = Math.max(0, i - 1); LS.set(lsKey, st); again(); };
    $('#sk').onclick = function () { if (!st.answers[id]) st.skip[id] = 1; if (st.review) { st.rv = st.rv || {}; st.rv[id] = 1; } adv(); };
    $('#quit').onclick = function () { busy = false; var n = Object.keys(st.answers).length; if (n) onDone(st, true); else { LS.set(lsKey, null); onQuit(); } };
    V.querySelector('.opts').onclick = function (e) { var b = e.target.closest('.opt'); if (!b || b.classList.contains('oth')) return; b.classList.add('sel'); st.answers[id] = { a: +b.dataset.k }; LS.set(lsKey, st); setTimeout(adv, 170); };
    bindOther(function (txt) { st.answers[id] = { a: -1, o: txt.slice(0, 300) }; LS.set(lsKey, st); adv(); });
  }
  /* saves addon answers (sharpen, retake, diagnostic) + overrides (ov) + retake log (rt). Account sync only carries new records and deletes,
     so each save is a fresh record (old answers merged in) and the old one is removed. */
  function saveAddon(ans, extra) {
    extra = extra || {}; var old = results('addon'), map = {}, prev = old[0] || {};
    old.slice().reverse().forEach(function (r) { (r.answers || []).forEach(function (x) { map[x.q] = x; }); });
    for (var k in (ans || {})) { var v = ans[k]; if (!v) continue; var o = v.a === -1 ? { q: k, a: -1, o: String(v.o || '').slice(0, 300) } : { q: k, a: v.a }; if (v.r) o.r = 1; map[k] = o; }
    var ad = { id: rid(), kind: 'addon', at: Date.now(), name: LS.get('name', ''), answers: Object.keys(map).map(function (k) { return map[k]; }), qv: (A && A.version) || 1,
      ov: extra.ov !== undefined ? extra.ov : (prev.ov || null), rt: extra.rt || prev.rt || {} };
    DB.put(ad); old.forEach(function (r) { DB.remove(r.id); try { if (C() && C().markGone) C().markGone(r.id); } catch (e) {} });
    submit(ad, { scores: { ov: ad.ov, rt: ad.rt } }); sync(); return ad;
  }
  function needMain() { if (results('main').length) return false; location.hash = '#diag'; return true; }
  function consentGate(title, sub, again) {
    if (LS.get('addonOk', false)) return false;
    V.innerHTML = '<div class="card"><p class="tag">' + esc(title) + '</p><h2>' + esc(sub) + '</h2><p class="muted">Every answer also feeds your other types.</p>' +
      '<label class="ck"><input type="checkbox" id="ok"><span>' + esc(PRIV) + '</span></label><button class="btn big block" id="go" disabled>Start</button><a class="btn ghost block" href="#types">Not now</a></div>';
    $('#ok').onchange = function () { $('#go').disabled = !this.checked; }; $('#go').onclick = function () { if (!$('#ok').checked) return; LS.set('addonOk', true); again(); }; return true;
  }
  function sysName(sys) { var R2 = { socionics: 'Socionics-style type', sloan: 'Big Five code', cluster: 'Cluster' }; return R2[sys] || ((A && A.systems[sys]) || {}).name || (A && A.R && A.R.systems && A.R.systems[sys]) || 'Your type'; }
  function sysKey(T, sys) { var x = T && T[sys]; return x ? (x.code || x.name || '') : ''; }
  /* sharpen: ask only the extra questions a system still needs (or its full set) */
  function sharpen(arg) {
    if (!pro()) { location.hash = '#pro'; return; }
    if (!A || !A.questions) { V.innerHTML = '<div class="card"><p>Couldn\u2019t load the questions. Check your connection.</p><a class="btn block" href="#types">Back to your types</a></div>'; return; }
    if (needMain()) return;
    var parts = String(arg || '').split('/'), sys = parts[0], fullQ = parts[1] === 'full', all = A.questions.filter(function (q) { return q.sys === sys; });
    if (!all.length) { location.hash = '#types'; return; }
    var st = LS.get('sharpen', null), ad = addonRec(), done = {}; (ad ? ad.answers : []).forEach(function (x) { done[x.q] = 1; });
    if (!st || st.sys !== sys || st.full !== fullQ || !st.list || String(st.list[0]).indexOf('x:') !== 0) { var list = fullQ ? all : all.filter(function (q) { return !done[q.id]; }).slice(0, A.sharpen || 3); if (!list.length) list = all;
      var T0 = typesOf(results('main')[0]); st = { sys: sys, full: fullQ, list: list.map(function (q) { return 'x:' + q.id; }), i: 0, answers: {}, before: T0 && T0[sys] && T0[sys].conf ? T0[sys].conf.pct : null }; LS.set('sharpen', st); }
    if (consentGate('Sharpen \u00b7 ' + sysName(sys), st.list.length + ' quick question' + (st.list.length > 1 ? 's' : ''), function () { sharpen(arg); })) return;
    runQ('sharpen', 'Sharpen \u00b7 ' + sysName(sys), sharpenEnd, function () { location.hash = '#types'; });
  }
  function sharpenEnd(st) {
    var ans = {}; for (var k in st.answers) ans[k.slice(2)] = st.answers[k];
    saveAddon(ans); LS.set('sharpen', null);
    var T1 = typesOf(results('main')[0]), c1 = T1 && T1[st.sys] && T1[st.sys].conf ? T1[st.sys].conf.pct : null, nm = sysName(st.sys);
    toast(c1 != null && st.before != null && c1 !== st.before ? nm + ' confidence ' + st.before + '% \u2192 ' + c1 + '%' : nm + ' updated');
    location.hash = '#types#' + st.sys;
  }
  /* retake one part with a DIFFERENT question set than the one that scored it (bank B = data/retake.json; a second retake uses the sharpen set, bank A) */
  var RALIAS = { socionics: 'four', sloan: 'cluster' };
  function retakePlan(sys) {
    var bs = RALIAS[sys] || sys, ad = addonRec(), log = ((ad && ad.rt) || {})[sys] || [], last = log[log.length - 1];
    var B = ((A && A.R && A.R.questions) || []).filter(function (q) { return q.sys === bs; }), Aq = ((A && A.questions) || []).filter(function (q) { return q.sys === bs; });
    var bank = last && last.bank === 'B' && Aq.length >= 3 ? 'A' : 'B', qs = bank === 'B' ? B : Aq; if (!qs.length) { bank = 'A'; qs = Aq; }
    return { sys: sys, base: bs, bank: bank, qs: qs, log: log };
  }
  function retake(arg) {
    var sys = String(arg || '').split('/')[0];
    if (!pro()) { location.hash = '#pro'; return; }
    if (needMain()) return;
    var st = LS.get('retake', null);
    if (!st || st.sys !== sys) { var pl = retakePlan(sys); if (!pl.qs.length) { location.hash = '#types'; return; }
      var T0 = typesOf(results('main')[0]); st = { sys: sys, bank: pl.bank, list: pl.qs.map(function (q) { return 'x:' + q.id; }), i: 0, answers: {}, before: sysKey(T0, sys), started: false }; LS.set('retake', st); }
    if (!st.started) {
      var ad = addonRec(), log = ((ad && ad.rt) || {})[sys] || [], selfp = curOv() && curOv()[sys];
      V.innerHTML = '<div class="card"><p class="tag">Retake this part</p><h2>' + esc(sysName(sys)) + '</h2><p>' + st.list.length + (st.bank === 'B' ? ' questions you haven\u2019t been scored on for this part (set B).' : ' questions from set A, different from your last retake (set B).') + ' Your answers here count double, so they can correct what the quiz guessed. Back and Skip work on every question.</p>' +
        (log.length ? '<p class="muted small">Retaken ' + log.length + '\u00d7 before (last: set ' + esc(log[log.length - 1].bank) + ', ' + fmtDate(log[log.length - 1].at) + ').</p>' : '') +
        (selfp ? '<p class="muted small">You picked ' + esc(selfp) + ' yourself. Finishing the retake clears that pick so you can see what the new answers say (you can pick again after).</p>' : '') +
        (LS.get('addonOk', false) ? '' : '<label class="ck"><input type="checkbox" id="ok"><span>' + esc(PRIV) + '</span></label>') +
        '<button class="btn big block" id="go"' + (LS.get('addonOk', false) ? '' : ' disabled') + '>Start the retake</button><a class="btn ghost block" href="#types#' + esc(sys) + '">Not now</a></div>';
      if ($('#ok')) $('#ok').onchange = function () { $('#go').disabled = !this.checked; };
      $('#go').onclick = function () { if ($('#ok') && !$('#ok').checked) return; LS.set('addonOk', true); st.started = true; LS.set('retake', st); retake(arg); }; return;
    }
    runQ('retake', 'Retake \u00b7 ' + sysName(sys) + ' \u00b7 set ' + st.bank, retakeEnd, function () { LS.set('retake', null); location.hash = '#types#' + sys; });
  }
  function retakeEnd(st, quit) {
    var ans = {}, n = 0; for (var k in st.answers) { var v = st.answers[k]; if (!v) continue; ans[k.slice(2)] = { a: v.a, o: v.o, r: 1 }; n++; }
    var ad = addonRec(), rt = JSON.parse(JSON.stringify((ad && ad.rt) || {})), ov = ad && ad.ov ? JSON.parse(JSON.stringify(ad.ov)) : null, cleared = false;
    if (ov && ov[st.sys] && n) { delete ov[st.sys]; if (st.sys === 'four') delete ov.socionics; if (st.sys === 'socionics') delete ov.four; cleared = true; if (!Object.keys(ov).length) ov = null; }
    rt[st.sys] = (rt[st.sys] || []).concat([{ bank: st.bank, at: Date.now(), n: n, skipped: st.list.length - n, before: st.before }]).slice(-5);
    saveAddon(ans, { rt: rt, ov: ov });
    var T1 = typesOf(results('main')[0]), after = sysKey(T1, st.sys); rt[st.sys][rt[st.sys].length - 1].after = after; saveAddon({}, { rt: rt, ov: ov });
    LS.set('retake', null);
    toast(sysName(st.sys) + ': ' + (st.before && after && st.before !== after ? st.before + ' \u2192 ' + after : 'still ' + (after || 'the same')) + (cleared ? ' (your own pick was cleared)' : ''));
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
    if ((!tz.types || !tz.types.why) && !r._tyTry) { r._tyTry = 1; fetch('https://mindprint.sites.tab.bot/api/mp/teaser', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers: r.answers }), cache: 'no-store', credentials: 'omit' })
      .then(function (x) { return x.json(); }).then(function (j) { if (j && j.teaser && j.teaser.types) { r.teaser = j.teaser; DB.put(r); if (/^#results/.test(location.hash) && !full()) teaserPage(r); } }).catch(function () {}); }
    var locked = (tz.locked && tz.locked.length ? tz.locked.map(function (x) { return [x.id, x.title]; }) : TEASE_DEF);
    var html = '<div class="rhead tease"><p class="eyebrow">' + nm + ' Mindprint \u00b7 ' + fmtDate(r.at) + '</p><p class="tag">Your top trait</p><h1 data-x="top">' + esc(tz.title) + '</h1><p class="lede">' + esc(tz.text) + '</p>' +
      (tz.more ? '<p class="muted small">+' + tz.more + ' more standout trait' + (tz.more > 1 ? 's' : '') + ' in your full results</p>' : '') + '</div>' +
      '<div class="fwk"><span><b>7</b> frameworks analyzed</span><span><b>' + (tz.answered || r.answers.length) + '</b> answers</span><span><b>40+</b> traits scored</span></div>'
    html += typesFree(tz.types);
    html += '<div class="card cta"><h2>Unlock your full Mindprint</h2><p>Every trait and what it means, how you love, fight, decide and cope, plus the Deep Dive, a written report, a spreadsheet and a PDF. Your answers are saved, so it all appears the moment you unlock. No retake.</p>' +
      '<a class="btn big block" href="#pro">Unlock your full Mindprint \u2014 $10</a><a class="btn ghost block" href="#pro">Northpeak All-Access \u2014 $100, every app</a><a class="small center codeln" href="#pro">Have a code?</a></div>';
    html += '<div class="card lockl"><div class="lockhd">' + LOCK + '<h2>In your full results</h2><span class="pill">Pro</span></div><p class="muted small">Tap one to see what it covers.</p>' + locked.map(function (x) { return '<div class="lrow" data-x="lock:' + esc(x[0]) + '">' + LOCK + '<span>' + esc(x[1]) + '</span><i aria-hidden="true">\u203a</i></div>'; }).join('') +
      '<a class="btn block" href="#pro">Unlock all of it \u2014 $10</a></div>';
    html += signed() ? '<p class="muted small center">Saved to your account.</p>' : '<div class="card"><p><b>Keep these results.</b> Sign in or create a free Northpeak account to keep them in your history on any device.</p><a class="btn ghost block" href="#account">Sign in to save</a></div>';
    html += '<div class="row2"><a class="btn ghost" href="#start">Retake</a><a class="btn ghost" href="#history">History</a></div><p class="muted small center">Not a diagnosis \u2014 for fun and self-reflection.</p>';
    V.innerHTML = html; if (tz.types) tyBindShare(tz.types.four, tz.types.cluster); xSetFree(r, tz.types);
  }
  function resultsPage(id) {
    var r = byId(id) || results('main')[0]; if (!r) { location.hash = '#start'; return; }
    if (!full()) { teaserPage(r); return; }
    var sc = scoreOf(r), sm = S.summaries(sc), hl = S.headlines(sc), nm = r.name ? esc(r.name) + '\u2019s' : 'Your';
    var html = '<div class="rhead"><p class="eyebrow">' + nm + ' Mindprint \u00b7 ' + fmtDate(r.at) + '</p><h1' + (hl.length ? ' data-x="hl:' + esc(hl[0].key) + '"' : '') + '>' + (hl.length ? esc(hl[0].title) : 'Your results') + '</h1>' +
      (hl.length > 1 ? '<div class="chips">' + hl.slice(1).map(function (h) { return '<span class="chip" data-x="hl:' + esc(h.key) + '">' + esc(h.title) + '</span>'; }).join('') + '</div>' : '') + '</div>';
    var TT = typesOf(r);
    var RI = { big5: '\ud83d\udcca', attach: '\ud83e\udd1d', conflict: '\u26a1', values: '\ud83e\udded', stress: '\ud83c\udf27\ufe0f', social: '\ud83d\udd0b', decide: '\ud83c\udfaf' };
    var RS = { big5: 'Big Five', attach: 'Attachment', conflict: 'Conflict', values: 'Values', stress: 'Stress', social: 'Social', decide: 'Decisions' };
    var t1 = function (arr, n) { try { return S.top(arr || [], n || 1).map(function (x) { return S.nm(x.key) || ''; }).filter(Boolean).join(', '); } catch (e) { return ''; } };
    var soc = sc.scales.E_sociability ? sc.scales.E_sociability.pct : null;
    var RV = { big5: TT ? TT.sloan.code : '', attach: TT ? TT.attach.name : '', conflict: t1(sc.conflict), values: t1(sc.values, 2), stress: t1(sc.coping), social: soc == null ? '' : soc >= 60 ? 'Recharges with people' : soc <= 40 ? 'Recharges alone' : 'In the middle', decide: t1(sc.decision) };
    html += jumpBar((TT ? [['rtypes', 'Types']] : []).concat(sm.map(function (s) { return ['r' + s.id, RS[s.id] || s.title]; })));
    if (TT) html += typesCard(TT).replace('<div class="card types">', '<div class="card types" id="s-rtypes" data-sec="rtypes">');
    sm.forEach(function (s) {
      var inner;
      if (s.id === 'big5') inner = '<p class="muted small">' + esc(s.text) + '</p>' + s.items.map(function (it) {
        return '<div class="trait"><div data-x="scale:' + it.key + '"><div class="bl"><span>' + esc(it.name) + '</span><b>' + it.pct + ' \u00b7 ' + esc(it.band) + '</b></div><div class="bt"><i style="width:' + Math.max(3, it.pct) + '%"></i></div><p class="tyd">' + esc(it.text) + '</p></div>' +
          '<details class="fold"><summary>Facets</summary>' + bars(sc, Object.keys(sc.scales).filter(function (k) { return k.indexOf(it.key + '_') === 0; })) + '</details></div>'; }).join('');
      else inner = '<p' + (s.id === 'attach' && TT ? ' data-x="attach"' : '') + '>' + esc(s.text) + '</p>' + (s.id === 'attach' ? bars(sc, ['att_anxiety', 'att_avoidance']) : bars(sc, s.keys.slice(0, 6)));
      html += sec('r' + s.id, RI[s.id] || '\u2022', s.title, RV[s.id] || '', inner);
    });
    html += '<div class="card deepcard"><p class="tag">Pro</p><h2>Go deeper</h2><p>Get the full written report: what your results say about your strengths, blind spots, relationships, stress and school or work fit, plus the Deep Dive into your childhood and family, a spreadsheet of every answer and a printable PDF.</p>' +
      (pro() ? '<a class="btn block" href="#report/' + encodeURIComponent(r.id) + '">Open your full report</a><a class="btn ghost block" href="#deep">Deep Dive</a>' : '<a class="btn block" href="#pro">Unlock Mindprint Pro \u00b7 $10</a>') + '</div>';
    html += signed() ? '<p class="muted small center">Saved to your account.</p>' : '<div class="card"><p><b>Keep these results.</b> Sign in or create a free Northpeak account to keep them in your history on any device.</p><a class="btn ghost block" href="#account">Sign in to save</a></div>';
    html += '<div class="row2"><a class="btn ghost" href="#start">Retake</a><a class="btn ghost" href="#history">History</a></div><p class="muted small center">Not a diagnosis \u2014 for fun and self-reflection.</p>';
    V.innerHTML = html; if (TT) tyBindShare(TT.four, TT.cluster); xSet(r, TT, sc); jumpSpy();
  }
  function tyTag(r, lk) { try { if (r.kind !== 'main') return ''; var t = lk ? (r.teaser && r.teaser.types) : typesOf(r);
    return t && t.four ? ' \u00b7 ' + esc(t.four.code + ' ' + t.cluster.emoji) : ''; } catch (e) { return ''; } }
  function history() {
    var rs = results();
    V.innerHTML = '<h1 class="pt">Your results</h1>' + (rs.length && !full() && results('main').length ? '<div class="card cta"><p>Your answers are saved. Unlock Pro and your full results show up here instantly, no retake.</p><a class="btn block" href="#pro">Unlock your full Mindprint \u2014 $10</a></div>' : '') + (rs.length ? rs.map(function (r) {
      var lk = r.kind === 'main' && !full(), t = r.kind === 'deep' ? 'Deep Dive' : lk ? ((r.teaser && r.teaser.title) || 'Mindprint') : (function () { var h = S.headlines(scoreOf(r)); return h.length ? h[0].title : 'Mindprint'; })();
      return '<a class="hrow" href="' + (r.kind === 'deep' ? deepLink(r) : '#results/' + encodeURIComponent(r.id)) + '"><b>' + esc(t) + (lk ? ' <span class="pill">' + LOCK + ' Full results locked</span>' : '') + '</b><span>' + (r.kind === 'deep' ? 'Childhood & family' : r.diag ? 'Quick diagnostic' : 'Main quiz') + ' \u00b7 ' + fmtDate(r.at) + tyTag(r, lk) + '</span></a>'; }).join('')
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
      '<label class="ck"><input type="checkbox" id="ok" checked><span>' + esc(PRIV) + '</span></label><button class="btn big block" id="save">Save and see my report</button><button class="btn ghost block" id="rev">Go back and review</button>' + (n < 50 ? '<button class="btn ghost block" id="rsk">Answer the ones I skipped</button>' : '') + '</div>';
    $('#rev').onclick = function () { st.i = 0; LS.set('deepq', st); deepQ(); };
    if ($('#rsk')) $('#rsk').onclick = function () { var j = D.questions.findIndex(function (q) { return st.answers[q.id] == null; }); st.i = Math.max(0, j); LS.set('deepq', st); deepQ(); };
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
