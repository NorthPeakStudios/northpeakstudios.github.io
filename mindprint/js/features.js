/* Mindprint 1.6 (Oct 29 2026): 18 new tools. Loaded before js/app.js, which calls MPFeatures.init(api) at boot, adds these rows to its TOOLS list
   and routes #<id> here. Everything is worked out on this phone from scores the app already has; new data stays in localStorage under mp.f.*
   (One question a day is the exception on purpose: it saves through the same Sharpen path as the Types screen). No inline scripts (CSP). */
(function () {
  'use strict';
  var X = null, $ = function (s, r) { return (r || document).querySelector(s); }, all = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var e = function (s) { return X.esc(s); }, nm = function (k) { return X.S.nm(k) || k; };
  var B5 = ['O', 'C', 'E', 'A', 'N'], BN = { O: 'Openness', C: 'Conscientiousness', E: 'Extraversion', A: 'Agreeableness', N: 'Emotional sensitivity' };
  var POLE = { O: ['Practical', 'Curious'], C: ['Spontaneous', 'Organized'], E: ['Reserved', 'Outgoing'], A: ['Direct', 'Warm'], N: ['Steady', 'Sensitive'] };
  var CFN = ['competing', 'collaborating', 'compromising', 'accommodating', 'avoiding'];
  var DAY = 864e5;
  /* [id, icon, title, blurb, needs Pro scores, '', where it lives, card on the Results page] */
  var KNOW = 'Know yourself better', FRI = 'Friends & groups', FUN = 'Just for fun';
  var tools = [
    ['daily1', '\u2753', 'One question a day', 'one tiny question a day that slowly sharpens your types', 1, '', 'home'],
    ['monthly', '\ud83d\uddd3\ufe0f', 'Monthly check-in', 'retake once a month and watch each trait move, month by month', 1, '', 'history'],
    ['contra', '\ud83e\udde9', 'Contradiction catcher', 'answers that pull against each other, and which one is the real you', 1, '', 'more', KNOW],
    ['blind', '\ud83d\udd26', 'Blind spot reveal', 'the trait you rank yourself lowest on vs where your answers put it', 1, '', 'more', KNOW],
    ['speed', '\u23f1\ufe0f', 'Answer speed read', 'what you answered fast (sure) vs slowly (still deciding)', 0, '', 'more', KNOW],
    ['stressq', '\ud83c\udf2a\ufe0f', 'Stress mode', 'a separate 10-question quiz on how you act under pressure', 0, '', 'more', KNOW],
    ['myth', '\ud83e\uddea', 'Myth buster', 'introvert, type A, overthinker, empath: which labels actually fit you', 1, '', 'more', KNOW],
    ['reflect', '\ud83e\udeb4', 'Reflection prompts', '3 journal questions a week for your growth trait', 1, '', 'more', KNOW],
    ['mirror', '\ud83e\ude9e', 'Friend mirror', 'who reads you best, and exactly where each friend read you wrong', 1, '', 'more', FRI],
    ['battle', '\u2694\ufe0f', 'Trait battles', 'you vs a friend, trait by trait, with a verdict', 1, '', 'more', FRI],
    ['compat', '\ud83d\udd0d', 'Compatibility lens', 'work, friendship and roommate scores, not just one number', 1, '', 'more', FRI],
    ['chem', '\ud83d\udd78\ufe0f', 'Group chemistry map', 'drop in up to 4 friends: who clashes, who balances', 1, '', 'more', FRI],
    ['room', '\ud83c\udfad', 'Room read', 'the role you play in a group: anchor, spark, glue and more', 1, '', 'more', FRI],
    ['twin', '\ud83d\udcda', 'Fictional twin', 'the book or movie character whose personality is closest to yours', 1, '', 'more', FUN],
    ['choose', '\ud83d\udd2e', 'Decision simulator', 'type a real choice, see which option your profile picks', 1, '', 'more', FUN],
    ['future', '\u2709\ufe0f', 'Letter from future you', 'a note from you in 5 years, written from your traits', 1, '', 'more', FUN],
    ['badges', '\ud83c\udfc5', 'Trait unlocks', 'rare trait combos earn collectible badges', 1, '', 'more', FUN],
    ['top3', '\ud83d\uddbc\ufe0f', 'Top 3 profile card', 'a shareable, printable image of your top 3 traits', 1, '', 'more', FUN]
  ];
  var pages = {};

  /* ---------- shared bits ---------- */
  function pct(sc, k, d) { var v = X.pc(sc, k); return v == null ? (d === undefined ? 50 : d) : v; }
  function has(sc, k) { return !!(sc && sc.scales[k]); }
  function avg(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function bar(label, v, right) { return '<div class="br"><div class="bl"><span>' + label + '</span><b>' + (right == null ? Math.round(v) : right) + '</b></div><div class="bt"><i style="width:' + clamp(Math.round(v), 3, 100) + '%"></i></div></div>'; }
  function two(label, a, b, right) { return '<div class="lb-rg"><div class="bl"><span>' + label + '</span><b>' + right + '</b></div><div class="lb-track"><i class="lb-q" style="left:' + clamp(a, 0, 100) + '%"></i><i class="lb-dot" style="left:' + clamp(b, 0, 100) + '%"></i></div></div>'; }
  function me(sc) { return X.parseCode(X.myCode(sc)); }
  function myName() { return X.LS.get('name', '') || 'You'; }
  function share(text) { if (navigator.share) navigator.share({ text: text }).catch(function () {}); else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { X.toast('Copied'); }, function () {}); }
  function weekKey(t) { var d = new Date(t || Date.now()); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return X.dayKey(d.getTime()); }
  /* a friend's MP1 code (the one Friend compare already shares): one saved code, reused by Trait battles + Compatibility lens */
  function friendBox(onGo, label) {
    var saved = X.LS.get('f.friend', '') || X.LS.get('lab.friend', '');
    return { html: '<div class="card"><p class="tag">' + (label || 'Friend\u2019s code') + '</p><input id="fcode" placeholder="MP1.\u2026" autocapitalize="none" spellcheck="false" value="' + e(saved) + '"><button class="btn block" id="fgo">Go</button><p class="muted small" id="fmsg">Your friend gets their code in Mindprint \u2192 Your results \u2192 Friend compare. Yours is there too.</p></div><div id="fout"></div>',
      bind: function () { var go = function () { var c = $('#fcode').value.trim(), f = X.parseCode(c); if (!f) { $('#fmsg').textContent = 'That code doesn\u2019t look right. It starts with MP1.'; return; } X.LS.set('f.friend', c); onGo(f); };
        $('#fgo').onclick = go; if (saved && X.parseCode(saved)) go(); } };
  }

  /* ---------- 2. Monthly check-in (extends the Drift chart): one point per month, month-to-month change, a nudge on Home when a month has passed ---------- */
  function monthPts() {
    var rs = X.results('main').slice().sort(function (a, b) { return (a.at || 0) - (b.at || 0); }), by = {};
    rs.forEach(function (r) { var s = X.scoreOf(r); if (!s) return; var k = new Date(r.at).toISOString().slice(0, 7); by[k] = { k: k, t: r.at, s: s }; });
    return Object.keys(by).sort().map(function (k) { return by[k]; });
  }
  pages.monthly = function () {
    var pts = monthPts(), last = X.results('main')[0], next = last ? last.at + 30 * DAY : Date.now(), due = Date.now() >= next, off = X.LS.get('f.monthlyOff', false);
    var arrow = function (d) { return d == null ? '' : Math.abs(d) < 10 ? '<small class="muted"> \u00b7</small>' : (d > 0 ? ' <small class="mpf-up">\u25b2' + d + '</small>' : ' <small class="mpf-dn">\u25bc' + (-d) + '</small>'); };
    var tbl = pts.length ? '<table class="lb-tbl mpf-mt"><tr><th>Month</th>' + B5.map(function (t) { return '<th>' + t + '</th>'; }).join('') + '</tr>' + pts.map(function (p, i) {
      return '<tr><td>' + e(new Date(p.t).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })) + '</td>' + B5.map(function (t) { var v = p.s.scales[t] ? p.s.scales[t].pct : null, pv = i ? (pts[i - 1].s.scales[t] || {}).pct : null; return '<td>' + (v == null ? '\u2013' : v + (i && pv != null ? arrow(v - pv) : '')) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>' : '';
    X.V.innerHTML = X.labHead('monthly') + '<div class="card"><p class="tag">' + (due ? 'Your check-in is due' : 'Next check-in') + '</p><h2>' + (due ? (last ? 'It\u2019s been ' + Math.floor((Date.now() - last.at) / DAY) + ' days' : 'Take your first quiz') : e(new Date(next).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }))) + '</h2>' +
      '<a class="btn big block" href="#start">' + (due ? 'Retake now' : 'Retake early') + '</a><label class="ck"><input type="checkbox" id="moff"' + (off ? '' : ' checked') + '><span>Remind me on Home when a month has passed</span></label></div>' +
      '<div class="card"><p class="tag">Month by month \u00b7 ' + pts.length + ' month' + (pts.length === 1 ? '' : 's') + '</p>' + (pts.length > 1 ? tbl : (tbl + '<p class="muted small">One month so far. Your timeline grows by one row each month you retake.</p>')) +
      '<p class="muted small">' + B5.map(function (t) { return t + ' = ' + BN[t]; }).join(', ') + '. If you take it more than once in a month, your latest take that month counts. A change under 10 points is normal wobble.</p></div>' +
      '<div class="card nlist"><a class="nrow" href="#drift"><span class="ni">\ud83d\udcc8</span><span class="nt"><b>Drift chart</b><small>every quiz on one chart</small></span><i>\u203a</i></a></div>';
    $('#moff').onchange = function () { X.LS.set('f.monthlyOff', !this.checked); };
  };
  function homeExtra(last) {
    if (!last || !X.full() || X.LS.get('f.monthlyOff', false)) return '';
    var days = Math.floor((Date.now() - last.at) / DAY); if (days < 30) return '';
    return '<a class="card mehome" href="#monthly"><span class="mec">\ud83d\uddd3\ufe0f</span><span class="nt"><small>Monthly check-in</small><b>' + days + ' days since your last quiz. Retake and see what moved.</b></span><i aria-hidden="true">\u203a</i></a>';
  }

  /* ---------- 3. Contradiction catcher: two answers that point opposite ways on the same trait; you pick the real you and see that trait without the other answer ---------- */
  function onTrait(q, L) { // each option's points on trait L (facets count toward their letter, same as score.js)
    return q.options.map(function (o) { var s = o.s || {}, v = 0; for (var k in s) if (k === L || k.indexOf(L + '_') === 0) v += s[k]; return v; });
  }
  function clashes(r) {
    var Q = X.Q(), byId = {}; Q.questions.forEach(function (q) { byId[q.id] = q; });
    var per = {}; B5.forEach(function (L) { per[L] = []; });
    r.answers.forEach(function (a) { var q = byId[a.q]; if (!q || q.type !== 'likert' || a.a == null || a.a < 0 || !q.options[a.a]) return; // statements only: scenario answers mix several traits
      B5.forEach(function (L) { var v = onTrait(q, L), lo = Math.min.apply(null, v), hi = Math.max.apply(null, v); if (hi - lo < 1) return; per[L].push({ q: q, a: a.a, pos: (v[a.a] - lo) / (hi - lo) }); }); });
    var out = [], used = {};
    B5.forEach(function (L) { var xs = per[L];
      for (var i = 0; i < xs.length; i++) for (var j = 0; j < xs.length; j++) { var h = xs[i], l = xs[j]; if (h.q.id === l.q.id) continue; if (h.pos >= 0.8 && l.pos <= 0.2) out.push({ L: L, hi: h, lo: l, d: h.pos - l.pos }); } });
    out.sort(function (a, b) { return b.d - a.d; });
    return out.filter(function (c) { if (used[c.hi.q.id] || used[c.lo.q.id]) return false; used[c.hi.q.id] = used[c.lo.q.id] = 1; return true; }).slice(0, 6);
  }
  pages.contra = function (sc, r) {
    var cs = clashes(r), saved = X.LS.get('f.contra', {}), mine = saved[r.id] || {}, Q = X.Q();
    var withAns = function (drop) { return X.S.score(Q, r.answers.filter(function (x) { return x.q !== drop; })); };
    var row = function (side, it) { return '<div class="mpf-ans"><p class="small muted">' + e(it.q.text) + '</p><p><b>\u201c' + e(it.q.options[it.a].t) + '\u201d</b></p></div>'; };
    var h = X.labHead('contra');
    if (!cs.length) h += '<div class="card"><h2>No contradictions found</h2><p class="muted">None of your answers point strongly in opposite directions on the same trait. Pretty consistent.</p></div>';
    else h += '<p class="muted small">' + cs.length + ' pair' + (cs.length > 1 ? 's' : '') + ' of answers pull against each other. Pick the one that sounds like the real you.</p>' + cs.map(function (c, i) {
      var key = c.hi.q.id + '|' + c.lo.q.id, ch = mine[key];
      var res = '';
      if (ch === 'a' || ch === 'b') { var drop = ch === 'a' ? c.lo.q.id : c.hi.q.id, s2 = withAns(drop), v1 = pct(sc, c.L), v2 = s2.scales[c.L] ? s2.scales[c.L].pct : v1;
        res = '<p class="small mpf-ok">Counting only the real you: ' + e(BN[c.L]) + ' ' + v1 + ' \u2192 <b>' + v2 + '</b>. (Your saved result isn\u2019t changed. Retake to make it stick.)</p>'; }
      else if (ch === 'both') res = '<p class="small mpf-ok">Both, depending on the day. That\u2019s common: people act differently in different settings.</p>';
      return '<div class="card"><p class="tag">' + e(BN[c.L]) + ' \u00b7 clash ' + (i + 1) + '</p>' + row('a', c.hi) + '<p class="center muted small">vs</p>' + row('b', c.lo) +
        '<div class="mpf-3"><button class="chip' + (ch === 'a' ? ' on' : '') + '" data-c="' + i + '" data-v="a">First is me</button><button class="chip' + (ch === 'b' ? ' on' : '') + '" data-c="' + i + '" data-v="b">Second is me</button><button class="chip' + (ch === 'both' ? ' on' : '') + '" data-c="' + i + '" data-v="both">Both</button></div>' + res + '</div>';
    }).join('');
    h += '<p class="muted small center">A clash here means one answer scored near the top of a trait and another near the bottom. Everyone has a few. Saved on this phone.</p>';
    X.V.innerHTML = h;
    all('[data-c]').forEach(function (b) { b.onclick = function () { var c = cs[+b.dataset.c]; mine[c.hi.q.id + '|' + c.lo.q.id] = b.dataset.v; saved[r.id] = mine; X.LS.set('f.contra', saved); var y = window.scrollY; pages.contra(sc, r); window.scrollTo(0, y); }; });
  };

  /* ---------- 8. Blind spot reveal: built on "How well do you know yourself?" guesses (mp.guess) + any friend ratings ---------- */
  pages.blind = function (sc, r) {
    var g = (X.LS.get('guess', {}) || {})[r.id], h = X.labHead('blind');
    if (!g) { X.V.innerHTML = h + '<div class="card"><p>First, guess where you sit on each trait (30 seconds, before you look). Then come back here.</p><a class="btn big block" href="#guess/' + encodeURIComponent(r.id) + '">Guess my traits</a></div>'; return; }
    var ts = B5.filter(function (t) { return has(sc, t) && g[t] != null; });
    var ansRank = ts.slice().sort(function (a, b) { return pct(sc, b) - pct(sc, a); }), low = ts.slice().sort(function (a, b) { return g[a] - g[b]; })[0];
    var rk = ansRank.indexOf(low) + 1, gap = pct(sc, low) - g[low];
    var rates = X.LS.get('lab.rates', []), fr = null; if (rates.length) fr = Math.round(avg(rates.map(function (x) { return X.rateScore(x.ans)[low]; })));
    var big = rk <= 2 ? '<h2>Blind spot found: ' + e(BN[low]) + '</h2><p>You put ' + e(BN[low]) + ' <b>last</b> of your five (you guessed ' + g[low] + '). Your answers put it <b>#' + rk + ' of ' + ts.length + '</b> at ' + pct(sc, low) + '.</p>'
      : gap >= 15 ? '<h2>You underrate your ' + e(BN[low]) + '</h2><p>You guessed ' + g[low] + ', your answers say ' + pct(sc, low) + '. It\u2019s #' + rk + ' of ' + ts.length + ' for you, not the bottom.</p>'
      : '<h2>No hidden strength here</h2><p>You ranked ' + e(BN[low]) + ' lowest (guess ' + g[low] + ') and your answers agree it\u2019s one of your lower ones (' + pct(sc, low) + ', #' + rk + ' of ' + ts.length + ').</p>';
    var hidden = ts.filter(function (t) { return pct(sc, t) - g[t] >= 15; });
    X.V.innerHTML = h + '<div class="card">' + big + (fr != null ? '<p class="small">Your friends\u2019 ratings put it at <b>' + fr + '</b>' + (Math.abs(fr - pct(sc, low)) < 15 ? ', closer to your answers than to your guess.' : '.') + '</p>' : '<p class="small muted">Add friend ratings in <a href="#rate">Rate me</a> for a third opinion.</p>') + '</div>' +
      '<div class="card"><p class="tag">Your guess vs your answers</p>' + ts.map(function (t) { var d = pct(sc, t) - g[t]; return two(e(BN[t]), pct(sc, t), g[t], 'answers ' + pct(sc, t) + ' \u00b7 guess ' + g[t]); }).join('') +
      '<p class="muted small"><i class="lb-key lb-q"></i> your answers \u00b7 <i class="lb-key lb-dot"></i> your guess</p>' +
      (hidden.length ? '<p class="small">Higher than you think: <b>' + hidden.map(function (t) { return e(BN[t]); }).join(', ') + '</b>.</p>' : '') + '</div>' +
      '<p class="muted small center">For Emotional sensitivity, higher means stress hits harder. Change your guesses any time in <a href="#guess/' + encodeURIComponent(r.id) + '">How well do you know yourself?</a></p>';
  };

  /* ---------- 10. Answer speed read: the quiz now notes how long each tap took (this phone only, mp.f.speed) ---------- */
  var tq = null, t0 = 0, away = 0, hid = 0;
  document.addEventListener('visibilitychange', function () { if (document.hidden) hid = Date.now(); else if (hid) { away += Date.now() - hid; hid = 0; } });
  function qShown(id) { var st = X.LS.get('quiz', null), now = X.LS.get('f.speedNow', null), tag = st && st.t ? st.t : 0;
    if (!now || now.tag !== tag) X.LS.set('f.speedNow', { tag: tag, ms: {} }); tq = id; t0 = Date.now(); away = 0; }
  function qAnswered(id) { if (id !== tq || !t0) return; var ms = Date.now() - t0 - away; t0 = 0; if (ms < 150 || ms > 120000) return; // left the app or a stray double tap: not a real read
    var now = X.LS.get('f.speedNow', null); if (!now) return; now.ms[id] = ms; X.LS.set('f.speedNow', now); }
  function quizDone(r) { var now = X.LS.get('f.speedNow', null); X.LS.set('f.speedNow', null); if (!now || !Object.keys(now.ms).length) return;
    var sp = X.LS.get('f.speed', {}), ks = Object.keys(sp); if (ks.length >= 12) delete sp[ks[0]]; sp[r.id] = now.ms; X.LS.set('f.speed', sp); }
  pages.speed = function () {
    var sp = X.LS.get('f.speed', {}), r = X.results('main').filter(function (x) { return sp[x.id]; })[0], h = X.labHead('speed'), Q = X.Q();
    if (!r) { X.V.innerHTML = h + '<div class="card"><p>Timing starts with your next quiz on this phone. Every tap gets timed, then this page shows what you were sure about and what made you stop and think.</p><a class="btn big block" href="#start">Take the quiz</a></div><p class="muted small center">Only quizzes taken after this update are timed. Times stay on this phone.</p>'; return; }
    var ms = sp[r.id], byId = {}; Q.questions.forEach(function (q) { byId[q.id] = q; });
    var rows = r.answers.filter(function (a) { return ms[a.q] && byId[a.q] && a.a >= 0; }).map(function (a) { var q = byId[a.q], len = q.text.length + q.options.reduce(function (s, o) { return s + o.t.length; }, 0);
      return { q: q, a: a.a, ms: ms[a.q], adj: ms[a.q] / (900 + 28 * len) }; }); // divide by a reading-time estimate so long questions aren't "hesitant" just for being long
    if (rows.length < 8) { X.V.innerHTML = h + '<div class="card"><p>Only ' + rows.length + ' timed answers on your latest timed quiz. Take the full quiz once more for a speed read.</p><a class="btn big block" href="#start">Take the quiz</a></div>'; return; }
    var sorted = rows.slice().sort(function (a, b) { return a.adj - b.adj; }), fast = sorted.slice(0, 5), slow = sorted.slice(-5).reverse();
    var line = function (x) { return '<div class="mpf-ans"><p class="small muted">' + e(x.q.text) + '</p><div class="bl"><span><b>' + e(x.q.options[x.a].t) + '</b></span><b>' + (x.ms / 1000).toFixed(1) + 's</b></div></div>'; };
    var fw = {}; rows.forEach(function (x) { var f = x.q.framework || 'Other'; (fw[f] = fw[f] || []).push(x.adj); });
    var parts = Object.keys(fw).filter(function (k) { return fw[k].length >= 3; }).map(function (k) { return { k: k, v: avg(fw[k]) }; }).sort(function (a, b) { return a.v - b.v; });
    var mx = parts.length ? parts[parts.length - 1].v : 1;
    X.V.innerHTML = h + '<p class="muted small">From your quiz on ' + e(X.fmtDate(r.at)) + ' \u00b7 ' + rows.length + ' timed answers \u00b7 median ' + (sorted[Math.floor(sorted.length / 2)].ms / 1000).toFixed(1) + 's</p>' +
      '<div class="card"><p class="tag">\u26a1 Sure about</p>' + fast.map(line).join('') + '</div><div class="card"><p class="tag">\ud83e\udd14 Stopped to think</p>' + slow.map(line).join('') + '</div>' +
      (parts.length > 1 ? '<div class="card"><p class="tag">Surest to least sure, by part</p>' + parts.map(function (p) { return bar(e(p.k), 100 * p.v / mx, p.v <= parts[0].v * 1.15 ? 'surest' : p === parts[parts.length - 1] ? 'slowest' : ''); }).join('') + '<p class="muted small">Shorter bar = quicker answers for how long the questions are.</p></div>' : '') +
      '<p class="muted small center">Fast usually means a clear sense of yourself; slow can mean \u201cit depends\u201d, or just a distraction. Times stay on this phone.</p>';
  };

  /* ---------- 1. Friend mirror (builds on Rate me codes, mp.lab.rates): per-friend accuracy + the exact items each friend misread ---------- */
  pages.mirror = function (sc) {
    var got = X.LS.get('lab.rates', []), h = X.labHead('mirror'), m = {}; B5.forEach(function (t) { m[t] = pct(sc, t); });
    if (!got.length) { X.V.innerHTML = h + '<div class="card"><p>No friend ratings yet. Send your Rate me link: friends answer 10 quick items about you, then paste the code they send back.</p><a class="btn big block" href="#rate">Open Rate me</a></div>'; return; }
    var L = ['Not at all', 'A little', 'Somewhat', 'Mostly', 'Very much'];
    var fr = got.map(function (g) { var s = X.rateScore(g.ans), acc = Math.round(100 - avg(B5.map(function (t) { return Math.abs(s[t] - m[t]); })));
      var miss = X.RATE.map(function (it, i) { var pos = it[1] ? (g.ans[i] - 1) * 25 : (5 - g.ans[i]) * 25; return { it: it, k: g.ans[i], d: pos - m[it[0]] }; }).filter(function (x) { return Math.abs(x.d) >= 40; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); }).slice(0, 3);
      return { g: g, s: s, acc: acc, miss: miss }; }).sort(function (a, b) { return b.acc - a.acc; });
    X.V.innerHTML = h + '<div class="card center"><p class="eyebrow">Reads you best</p><div class="gbig">' + e(fr[0].g.who) + '</div><p class="muted">' + fr[0].acc + '% match with your own answers</p></div>' +
      fr.map(function (f) { return '<div class="card"><p class="tag">' + e(f.g.who) + ' \u00b7 ' + f.acc + '% match</p>' +
        B5.map(function (t) { return two(e(BN[t]), m[t], f.s[t], 'you ' + m[t] + ' \u00b7 ' + e(f.g.who) + ' ' + f.s[t]); }).join('') +
        (f.miss.length ? '<h3>Where ' + e(f.g.who) + ' read you wrong</h3><ul class="care">' + f.miss.map(function (x) { return '<li>Said you ' + e(x.it[2]) + ': <b>' + L[x.k - 1].toLowerCase() + '</b>. Your answers: ' + e(BN[x.it[0]]) + ' ' + m[x.it[0]] + '.</li>'; }).join('') + '</ul>' : '<p class="small mpf-ok">No big misreads. ' + e(f.g.who) + ' gets you.</p>') + '</div>'; }).join('') +
      '<p class="muted small"><i class="lb-key lb-q"></i> your answers \u00b7 <i class="lb-key lb-dot"></i> this friend. A misread is an item 40+ points from your own score on that trait. Your answers aren\u2019t automatically right: a friend may see something you don\u2019t. Add more friends in <a href="#rate">Rate me</a>.</p>';
  };

  /* ---------- profiles from MP1 codes (yours or a friend's): O C E A N aa av (0-99), cf = top conflict style 0-4, v = top value 0-8 ---------- */
  function sim(a, b, k) { return 100 - Math.abs(a[k] - b[k]); }
  function lenses(a, b) {
    var cfw = (a.cf === 1 || a.cf === 2) && (b.cf === 1 || b.cf === 2) ? 100 : a.cf === 0 && b.cf === 0 ? 25 : (a.cf === 0 && b.cf === 4) || (a.cf === 4 && b.cf === 0) ? 40 : a.cf === 4 && b.cf === 4 ? 45 : 65;
    var pp = (a.aa >= 60 && b.av >= 60) || (b.aa >= 60 && a.av >= 60);
    var calm = 100 - (a.N + b.N) / 2, warm = (a.A + b.A) / 2;
    var work = [[0.3, (a.C + b.C) / 2, 'how organized you both are'], [0.2, sim(a, b, 'C'), 'similar work pace'], [0.15, warm, 'easy cooperation'], [0.15, calm, 'calm under deadlines'], [0.2, cfw, 'how your conflict styles mix']];
    var friend = [[0.25, sim(a, b, 'O'), 'liking the same kind of plans'], [0.2, sim(a, b, 'E'), 'matching social energy'], [0.2, warm, 'warmth'], [0.2, a.v === b.v ? 100 : 55, 'shared top value'], [0.15, pp ? 30 : 80, pp ? 'reassurance vs space' : 'comfort with closeness']];
    var room = [[0.35, sim(a, b, 'C'), 'similar tidiness and routines'], [0.2, sim(a, b, 'E'), 'agreeing on guests and noise'], [0.15, warm, 'give and take'], [0.15, calm, 'low drama'], [0.15, cfw, 'sorting out disagreements']];
    var sc = function (L) { var t = Math.round(L.reduce(function (s, x) { return s + x[0] * x[1]; }, 0)), srt = L.slice().sort(function (p, q) { return q[1] - p[1]; }); return { v: clamp(t, 1, 99), up: srt[0], down: srt[srt.length - 1] }; };
    return { work: sc(work), friend: sc(friend), room: sc(room) };
  }
  function chemOf(a, b) { // balance vs clash between two people (same rules of thumb as Friend compare)
    var good = [], bad = [];
    if (a.A >= 60 && b.A >= 60) good.push('both warm');
    if (Math.abs(a.O - b.O) < 15) good.push('similar openness');
    if (a.v === b.v) good.push('same top value');
    if ((a.N >= 65) !== (b.N >= 65) && Math.min(a.N, b.N) <= 40) good.push('one keeps the other calm');
    if (Math.abs(a.E - b.E) >= 25) bad.push('social-energy gap');
    if (Math.abs(a.C - b.C) >= 25) bad.push('planner vs winger');
    if (a.N >= 65 && b.N >= 65) bad.push('both stress hard');
    if ((a.aa >= 60 && b.av >= 60) || (b.aa >= 60 && a.av >= 60)) bad.push('reassurance vs space');
    if (a.cf === 0 && b.cf === 0) bad.push('both argue to win'); else if ((a.cf === 0 && b.cf === 4) || (a.cf === 4 && b.cf === 0)) bad.push('pusher vs avoider');
    return { v: clamp(60 + 10 * good.length - 12 * bad.length, 5, 100), good: good, bad: bad };
  }
  /* ---------- 14. Room read: a role from the Big Five + conflict style ---------- */
  var ROLES = [
    { id: 'anchor', e: '\u2693', n: 'The Anchor', f: function (p) { return (100 - p.N) * 0.6 + p.C * 0.2 + p.A * 0.2; }, d: 'You keep things steady. When plans fall apart or someone panics, people look at you to see if it\u2019s actually bad.', g: 'Say it out loud when things are fine; your calm is contagious.', w: 'Calm can look like not caring. Show it when something matters to you.' },
    { id: 'spark', e: '\u26a1', n: 'The Spark', f: function (p) { return p.E * 0.55 + p.O * 0.45; }, d: 'You start things: the idea, the plan, the joke that gets everyone going.', g: 'Throw out the first idea. Groups stall without someone going first.', w: 'Check that quieter people got a word in before the plan is locked.' },
    { id: 'peace', e: '\ud83d\udd4a\ufe0f', n: 'The Peacemaker', f: function (p) { return p.A * 0.6 + (p.cf === 2 || p.cf === 3 || p.cf === 1 ? 100 : 35) * 0.4; }, d: 'You notice tension early and smooth it over. People feel heard around you.', g: 'Name the problem gently before it turns into a fight.', w: 'Keeping the peace isn\u2019t the same as agreeing. Your opinion counts too.' },
    { id: 'challenger', e: '\ud83e\udd94', n: 'The Challenger', f: function (p) { return (100 - p.A) * 0.5 + p.E * 0.25 + (p.cf === 0 ? 100 : 30) * 0.25; }, d: 'You say what others are thinking and poke holes in weak plans.', g: 'Be the honest voice, especially when everyone is nodding along.', w: 'Lead with what you agree with, then push. People hear it better.' },
    { id: 'planner', e: '\ud83d\uddc2\ufe0f', n: 'The Planner', f: function (p) { return p.C * 0.7 + p.E * 0.15 + (100 - p.O) * 0.15; }, d: 'You turn \u201cwe should\u201d into a time, a place and who\u2019s bringing what.', g: 'Make the group chat plan real: one message with the details.', w: 'Leave a little room for the unplanned. Some of the best nights are.' },
    { id: 'thinker', e: '\ud83e\udde0', n: 'The Thinker', f: function (p) { return p.O * 0.6 + (100 - p.E) * 0.4; }, d: 'You\u2019re quieter but you\u2019ve thought it through. When you speak, it\u2019s often the thing nobody considered.', g: 'Share the idea even if it\u2019s half-formed.', w: 'Don\u2019t wait for the perfect moment to talk. It rarely comes in a group.' },
    { id: 'glue', e: '\ud83e\uddf2', n: 'The Glue', f: function (p) { return p.A * 0.5 + p.E * 0.5; }, d: 'You keep people connected: you remember birthdays, invite the new person, and check in.', g: 'Keep inviting. Groups drift without someone like you.', w: 'You can\u2019t hold everyone together alone. Let others do some of the reaching out.' },
    { id: 'listener', e: '\ud83d\udc42', n: 'The Listener', f: function (p) { return p.A * 0.5 + (100 - p.E) * 0.5; }, d: 'People tell you things. You listen more than you talk, and friends come to you one-on-one.', g: 'Notice who\u2019s left out and pull them in quietly.', w: 'Your own stuff matters too. Let someone listen to you.' },
    { id: 'wild', e: '\ud83c\udfb2', n: 'The Wildcard', f: function (p) { return p.O * 0.4 + p.E * 0.3 + (100 - p.C) * 0.3; }, d: 'You make things unpredictable in a good way: the detour, the dare, the last-minute plan.', g: 'Push the group out of its routine once in a while.', w: 'Not everyone loves surprises. Give a heads-up on the big ones.' }
  ];
  function roles(p) { return ROLES.map(function (r) { return { r: r, v: Math.round(r.f(p)) }; }).sort(function (a, b) { return b.v - a.v; }); }
  pages.room = function (sc) {
    var p = me(sc), rs = roles(p), a = rs[0], b = rs[1], mx = rs[0].v;
    X.V.innerHTML = X.labHead('room') + '<div class="card center"><p class="eyebrow">In a group you\u2019re</p><div class="mpf-big">' + a.r.e + '</div><h2>' + e(a.r.n) + '</h2><p>' + e(a.r.d) + '</p><p class="muted small">with a side of ' + b.r.e + ' ' + e(b.r.n) + '</p></div>' +
      '<div class="card"><h3>What the group needs from you</h3><p>' + e(a.r.g) + '</p><h3>Watch out for</h3><p>' + e(a.r.w) + '</p></div>' +
      '<div class="card"><p class="tag">Every role, for you</p>' + rs.map(function (x) { return bar(x.r.e + ' ' + e(x.r.n), 100 * x.v / mx, x.v); }).join('') + '<p class="muted small">Each role is a simple mix of your Big Five scores and conflict style. Groups change people, so you might play a different role with different friends.</p></div>' +
      '<div class="card nlist"><a class="nrow" href="#chem"><span class="ni">\ud83d\udd78\ufe0f</span><span class="nt"><b>Group chemistry map</b><small>see everyone\u2019s role in your group</small></span><i>\u203a</i></a></div>';
  };
  /* ---------- 5. Trait battles ---------- */
  pages.battle = function (sc) {
    var m = me(sc), you = myName() === 'You' ? 'You' : myName();
    var fb = friendBox(function (f) {
      var R = [['O', 'Most curious', 1], ['C', 'Most organized', 1], ['E', 'Most outgoing', 1], ['A', 'Warmest', 1], ['N', 'Calmest under stress', -1], ['sec', 'Most secure with people', -1]];
      var val = function (p, k) { return k === 'sec' ? Math.round((p.aa + p.av) / 2) : p[k]; };
      var w = 0, l = 0, big = null;
      var rows = R.map(function (x) { var a = val(m, x[0]), b = val(f, x[0]), d = (a - b) * x[2], who = Math.abs(d) < 5 ? 'Tie' : d > 0 ? you : f.who; if (who === you) w++; else if (who !== 'Tie') l++;
        if (!big || Math.abs(d) > Math.abs(big.d)) big = { d: d, x: x }; var sh = x[0] === 'sec' ? function (v) { return 100 - v; } : x[0] === 'N' ? function (v) { return 100 - v; } : function (v) { return v; };
        return '<div class="mpf-round"><div class="bl"><span>' + e(x[1]) + '</span><b class="' + (who === 'Tie' ? 'muted' : who === you ? 'mpf-ok' : 'mpf-them') + '">' + e(who) + (who === 'Tie' ? '' : ' \ud83c\udfc6') + '</b></div>' + two('', sh(a), sh(b), 'you ' + sh(a) + ' \u00b7 ' + e(f.who) + ' ' + sh(b)) + '</div>'; }).join('');
      var verdict = w === l ? 'It\u2019s a draw, ' + w + '\u2013' + l : (w > l ? you : f.who) + ' take' + ((w > l ? you : f.who) === 'You' ? '' : 's') + ' it ' + Math.max(w, l) + '\u2013' + Math.min(w, l);
      var crown = big && Math.abs(big.d) >= 5 ? (big.d > 0 ? you : f.who) + ' win' + ((big.d > 0 ? you : f.who) === 'You' ? '' : 's') + ' \u201c' + big.x[1].toLowerCase() + '\u201d by the biggest margin (' + Math.abs(big.d) + ' points).' : 'Every round was close.';
      $('#fout').innerHTML = '<div class="card center"><p class="eyebrow">' + e(you) + ' vs ' + e(f.who) + '</p><div class="gbig">' + w + '\u2013' + l + '</div><h2>' + e(verdict) + '</h2><p class="muted">' + e(crown) + '</p></div><div class="card">' + rows +
        '<p class="muted small"><i class="lb-key lb-q"></i> you \u00b7 <i class="lb-key lb-dot"></i> ' + e(f.who) + '. Further right = more of the round\u2019s trait. A gap under 5 is a tie. None of these is better: \u201cwarmest\u201d loses arguments, \u201cmost organized\u201d misses surprises.</p></div>';
    }, 'Who are you battling? Their code');
    X.V.innerHTML = X.labHead('battle') + fb.html; fb.bind();
  };
  /* ---------- 16. Compatibility lens ---------- */
  pages.compat = function (sc) {
    var m = me(sc);
    var fb = friendBox(function (f) {
      var L = lenses(m, f), card = function (ic, t, x) { return '<div class="card"><div class="bl"><span class="mpf-lt">' + ic + ' ' + t + '</span><b class="mpf-lv">' + x.v + '</b></div><div class="bt"><i style="width:' + x.v + '%"></i></div><p class="small">Helped by ' + e(x.up[2]) + '. Weakest spot: ' + e(x.down[2]) + '.</p></div>'; };
      $('#fout').innerHTML = '<p class="tag center">You and ' + e(f.who) + '</p>' + card('\ud83d\udcbc', 'Working together', L.work) + card('\ud83e\udd1d', 'As friends', L.friend) + card('\ud83c\udfe0', 'As roommates', L.room) +
        '<p class="muted small center">Out of 100, from simple rules on your trait scores, conflict styles and top values. A guide to what to talk about, not a prediction: effort beats personality match.</p>';
    });
    X.V.innerHTML = X.labHead('compat') + fb.html; fb.bind();
  };
  /* ---------- 9. Group chemistry map: you + up to 4 friend codes ---------- */
  pages.chem = function (sc) {
    var saved = X.LS.get('f.group', ['', '', '', '']);
    X.V.innerHTML = X.labHead('chem') + '<div class="card"><p class="tag">Friends\u2019 codes (up to 4)</p>' + [0, 1, 2, 3].map(function (i) { return '<input class="mpf-gc" data-i="' + i + '" placeholder="MP1.\u2026 friend ' + (i + 1) + '" autocapitalize="none" spellcheck="false" value="' + e(saved[i] || '') + '">'; }).join('') +
      '<button class="btn block" id="ggo">Map the group</button><p class="muted small" id="gmsg">Each friend gets their code in Your results \u2192 Friend compare.</p></div><div id="gout"></div>';
    function go() {
      var codes = all('.mpf-gc').map(function (i) { return i.value.trim(); }), ppl = [{ who: 'You' }], bad = [];
      var p0 = me(sc); for (var k in p0) ppl[0][k] = p0[k]; ppl[0].who = 'You';
      codes.forEach(function (c, i) { if (!c) return; var f = X.parseCode(c); if (f) ppl.push(f); else bad.push(i + 1); });
      X.LS.set('f.group', codes);
      $('#gmsg').textContent = bad.length ? 'Code ' + bad.join(', ') + ' doesn\u2019t look right (it should start with MP1.) and was left out.' : 'Each friend gets their code in Your results \u2192 Friend compare.';
      if (ppl.length < 2) { $('#gout').innerHTML = '<p class="muted small center">Add at least one friend\u2019s code.</p>'; return; }
      var pairs = []; for (var i = 0; i < ppl.length; i++) for (var j = i + 1; j < ppl.length; j++) pairs.push({ a: i, b: j, c: chemOf(ppl[i], ppl[j]) });
      var cell = function (i, j) { if (i === j) return '<td class="mpf-cx">\u2014</td>'; var p = pairs.filter(function (x) { return (x.a === i && x.b === j) || (x.a === j && x.b === i); })[0].c; return '<td class="mpf-c ' + (p.v >= 70 ? 'mpf-g' : p.v < 50 ? 'mpf-r' : 'mpf-y') + '">' + p.v + '</td>'; };
      var short = function (s) { return e(String(s).slice(0, 8)); };
      var tbl = '<table class="lb-tbl mpf-grid"><tr><th></th>' + ppl.map(function (p) { return '<th>' + short(p.who) + '</th>'; }).join('') + '</tr>' + ppl.map(function (p, i) { return '<tr><td><b>' + short(p.who) + '</b></td>' + ppl.map(function (q, j) { return cell(i, j); }).join('') + '</tr>'; }).join('') + '</table>';
      var srt = pairs.slice().sort(function (x, y) { return x.c.v - y.c.v; }), worst = srt[0], best = srt[srt.length - 1];
      var nmP = function (x) { return e(ppl[x.a].who) + ' & ' + e(ppl[x.b].who); };
      var rl = ppl.map(function (p) { return { p: p, r: roles(p)[0].r }; }), have = {}; rl.forEach(function (x) { have[x.r.id] = 1; });
      var missing = ['anchor', 'planner', 'spark', 'peace'].filter(function (id) { return !have[id]; }).map(function (id) { return ROLES.filter(function (r) { return r.id === id; })[0]; });
      $('#gout').innerHTML = '<div class="card"><p class="tag">Chemistry \u00b7 ' + ppl.length + ' people</p>' + tbl + '<p class="muted small"><i class="lb-key mpf-g"></i> balance \u00b7 <i class="lb-key mpf-y"></i> mixed \u00b7 <i class="lb-key mpf-r"></i> likely friction (out of 100)</p></div>' +
        '<div class="card"><h3>Best balance</h3><p>' + nmP(best) + ' (' + best.c.v + ')' + (best.c.good.length ? ': ' + e(best.c.good.join(', ')) + '.' : '.') + '</p>' + (worst !== best ? '<h3>Most likely to clash</h3><p>' + nmP(worst) + ' (' + worst.c.v + ')' + (worst.c.bad.length ? ': ' + e(worst.c.bad.join(', ')) + '.' : '.') + '</p>' : '') + '</div>' +
        '<div class="card"><p class="tag">Group roles</p>' + rl.map(function (x) { return '<div class="bl mpf-rl"><span>' + e(x.p.who) + '</span><b>' + x.r.e + ' ' + e(x.r.n) + '</b></div>'; }).join('') +
        (missing.length ? '<p class="small">Nobody\u2019s naturally ' + missing.map(function (r) { return r.e + ' ' + e(r.n.replace('The ', 'the ')); }).join(' or ') + '. Someone may need to step into it on purpose.</p>' : '<p class="small mpf-ok">Every key role is covered.</p>') +
        '<p class="muted small">Rules of thumb from each person\u2019s 5 trait scores, attachment, top conflict style and top value. Real groups are shaped by history and effort far more than scores.</p></div>';
    }
    $('#ggo').onclick = go; if (saved.some(function (c) { return c; })) go();
  };

  /* ---------- 6. Fictional twin: our own rough Big Five reading of each character (O C E A N, 0-100) ---------- */
  var CHARS = [
    ['Hermione Granger', 'Harry Potter', 78, 95, 60, 62, 62], ['Harry Potter', 'Harry Potter', 60, 42, 55, 70, 58], ['Ron Weasley', 'Harry Potter', 40, 25, 65, 66, 68], ['Luna Lovegood', 'Harry Potter', 98, 35, 40, 85, 15],
    ['Katniss Everdeen', 'The Hunger Games', 45, 78, 22, 38, 60], ['Peeta Mellark', 'The Hunger Games', 70, 62, 72, 92, 38], ['Percy Jackson', 'Percy Jackson', 62, 28, 75, 65, 55], ['Annabeth Chase', 'Percy Jackson', 85, 88, 55, 45, 50],
    ['Sherlock Holmes', 'Sherlock Holmes', 92, 70, 30, 15, 35], ['Elizabeth Bennet', 'Pride and Prejudice', 80, 60, 70, 55, 30], ['Frodo Baggins', 'The Lord of the Rings', 62, 70, 30, 85, 60], ['Samwise Gamgee', 'The Lord of the Rings', 35, 85, 50, 96, 40],
    ['Matilda', 'Matilda', 95, 75, 30, 72, 30], ['Greg Heffley', 'Diary of a Wimpy Kid', 35, 15, 55, 20, 65], ['Wednesday Addams', 'Wednesday', 85, 80, 10, 10, 15], ['Eleven', 'Stranger Things', 50, 45, 20, 60, 70],
    ['Peter Parker', 'Spider-Man', 85, 45, 50, 85, 65], ['Miles Morales', 'Spider-Verse', 85, 40, 55, 80, 62], ['Tony Stark', 'Iron Man', 92, 40, 90, 25, 50], ['Steve Rogers', 'Captain America', 40, 92, 55, 80, 30],
    ['Elsa', 'Frozen', 60, 80, 15, 70, 85], ['Anna', 'Frozen', 70, 25, 95, 90, 45], ['Moana', 'Moana', 88, 60, 70, 70, 35], ['Shrek', 'Shrek', 30, 35, 15, 25, 55],
    ['Po', 'Kung Fu Panda', 75, 20, 92, 92, 50], ['Woody', 'Toy Story', 30, 80, 70, 60, 72], ['Buzz Lightyear', 'Toy Story', 65, 85, 80, 55, 25], ['Dory', 'Finding Nemo', 80, 5, 95, 95, 25],
    ['Leslie Knope', 'Parks and Recreation', 70, 98, 95, 85, 55], ['Ron Swanson', 'Parks and Recreation', 15, 75, 10, 30, 10]
  ];
  pages.twin = function (sc) {
    var m = B5.map(function (t) { return pct(sc, t); });
    var rs = CHARS.map(function (c) { var d = Math.sqrt(c.slice(2).reduce(function (s, v, i) { return s + (v - m[i]) * (v - m[i]); }, 0)); return { c: c, m: Math.round(100 - 100 * d / 223.6) }; }).sort(function (a, b) { return b.m - a.m; });
    var t = rs[0];
    X.V.innerHTML = X.labHead('twin') + '<div class="card center"><p class="eyebrow">Your fictional twin</p><div class="gbig mpf-tw">' + e(t.c[0]) + '</div><p class="muted">' + e(t.c[1]) + ' \u00b7 ' + t.m + '% match</p></div>' +
      '<div class="card"><p class="tag">You vs ' + e(t.c[0]) + '</p>' + B5.map(function (k, i) { return two(e(BN[k]), m[i], t.c[2 + i], 'you ' + m[i] + ' \u00b7 ' + t.c[2 + i]); }).join('') + '<p class="muted small"><i class="lb-key lb-q"></i> you \u00b7 <i class="lb-key lb-dot"></i> ' + e(t.c[0]) + '</p></div>' +
      '<div class="card"><p class="tag">Also close</p>' + rs.slice(1, 5).map(function (x) { return bar(e(x.c[0]) + ' <small class="muted">' + e(x.c[1]) + '</small>', x.m, x.m + '%'); }).join('') + '</div>' +
      '<p class="muted small center">Character scores are Mindprint\u2019s own rough read of how each character acts on page and screen, not official or tested. Match = how close your five scores are to theirs.</p>';
  };
  /* ---------- 7. Decision simulator: your choice, your options, tagged in plain words; your scales vote ---------- */
  var DTAG = { nw: ['\u2728 New / different', { O_adventure: 1, v_stimulation: 0.6 }], sf: ['\ud83d\udedf Safe / familiar', { v_security: 1, O_adventure: -0.6 }], pp: ['\ud83d\udc65 With people', { E_sociability: 1, E: 0.4 }], so: ['\ud83c\udfa7 On my own', { E_sociability: -1 }],
    ef: ['\ud83d\uddc2\ufe0f Takes effort / planning', { C_discipline: 0.8, C_achievement: 0.6 }], fn: ['\ud83d\udecb\ufe0f Easy / fun now', { v_hedonism: 1, C_discipline: -0.5 }], rk: ['\ud83c\udfb2 Risky', { dm_risk: 1, E_excitement: 0.6, N_anxiety: -0.5 }],
    hp: ['\ud83d\udc9b Helps someone', { v_benevolence: 1, A_empathy: 0.5 }], ah: ['\ud83c\udfc6 Gets me ahead', { v_achievement: 1, C_achievement: 0.5 }], pc: ['\ud83d\udd4a\ufe0f Keeps the peace', { cf_accommodating: 0.8, A_cooperation: 0.6 }],
    st: ['\ud83d\udde3\ufe0f Standing my ground', { E_assertiveness: 0.8, cf_competing: 0.6 }], gt: ['\ud83d\udcad Feels right', { dm_intuitive: 1 }], lg: ['\ud83e\uddee Makes sense on paper', { dm_rational: 1 }], ot: ['\ud83d\ude4b What others want', { dm_dependent: 1, v_conformity: 0.6 }] };
  function decideScore(sc, tags) { var v = 0, drv = {}; tags.forEach(function (t) { var w = DTAG[t] && DTAG[t][1]; for (var k in (w || {})) { if (!has(sc, k)) continue; var c = w[k] * (pct(sc, k) - 50) / 50; v += c; drv[k] = (drv[k] || 0) + c; } });
    return { v: tags.length ? v / Math.sqrt(tags.length) : 0, drv: Object.keys(drv).filter(function (k) { return drv[k] > 0.05; }).sort(function (a, b) { return drv[b] - drv[a]; }).slice(0, 3) }; }
  pages.choose = function (sc) {
    var hist = X.LS.get('f.decide', []), st = { q: '', o: [{ n: '', t: [] }, { n: '', t: [] }] };
    var optHtml = function (i) { return '<div class="card mpf-opt"><p class="tag">Option ' + 'ABC'[i] + (i === 2 ? ' (optional)' : '') + '</p><input class="mpf-on" data-i="' + i + '" maxlength="60" placeholder="' + ['e.g. Go to the party', 'e.g. Stay home and rest', 'e.g. Go for an hour'][i] + '"><p class="small muted">What\u2019s true about it? Tap all that fit.</p><div class="chips">' + Object.keys(DTAG).map(function (k) { return '<button class="chip" data-o="' + i + '" data-t="' + k + '">' + DTAG[k][0] + '</button>'; }).join('') + '</div></div>'; };
    X.V.innerHTML = X.labHead('choose') + '<div class="card"><label>The choice<input id="dq" maxlength="80" placeholder="e.g. Friday night: party or stay in?"></label></div>' + optHtml(0) + optHtml(1) + '<details class="fold mpf-more"><summary>Add a third option</summary>' + optHtml(2) + '</details>' +
      '<button class="btn big block" id="dgo">Predict my pick</button><p class="muted small" id="dmsg"></p><div id="dout"></div><div id="dhist"></div>';
    all('[data-t]').forEach(function (b) { b.onclick = function () { b.classList.toggle('on'); }; });
    function pick(q, opts) {
      var rs = opts.map(function (o) { var s = decideScore(sc, o.t); return { o: o, v: s.v, drv: s.drv }; }).sort(function (a, b) { return b.v - a.v; });
      return { q: q, rs: rs, gap: rs[0].v - rs[1].v };
    }
    function render(p) {
      var a = p.rs[0], conf = p.gap > 0.6 ? 'Strong lean' : p.gap > 0.25 ? 'Likely' : 'Close call';
      return '<div class="card simres"><p class="eyebrow">' + e(p.q || 'Your choice') + '</p><p class="tag">' + conf + '</p><h2 class="simt">' + e(a.o.n) + '</h2>' +
        (a.drv.length ? '<p class="muted small">Driven by</p><div class="chips">' + a.drv.map(function (k) { return '<span class="chip">' + e(nm(k)) + ' ' + pct(sc, k) + '</span>'; }).join('') + '</div>' : '<p class="muted small">None of your scores pushed hard here; it won because the others fit you less.</p>') +
        (p.gap <= 0.6 ? '<p class="simalt"><b>Or maybe:</b> ' + e(p.rs[1].o.n) + '</p>' : '') +
        '<details class="fold"><summary>How it decided</summary><p class="small">Each tag leans on a few of your scales (for example \u201crisky\u201d leans on risk-taking and excitement-seeking). Mindprint adds up how far your scores sit above or below the middle on those scales. If the pick feels wrong, that\u2019s worth noticing too: maybe this choice matters to you for reasons your usual habits don\u2019t cover.</p>' +
        p.rs.map(function (x) { return bar(e(x.o.n), clamp(Math.round(50 + x.v * 30), 3, 100), (x.v >= 0 ? '+' : '') + x.v.toFixed(2)); }).join('') + '</details></div>';
    }
    function drawHist() { $('#dhist').innerHTML = hist.length ? '<div class="card"><p class="tag">Past choices</p>' + hist.slice().reverse().map(function (h, i) { return '<div class="bl mpf-rl"><span>' + e(h.q || 'Choice') + '</span><b>' + e(h.pick) + '</b></div>'; }).join('') + '<button class="btn ghost block" id="dclr">Clear past choices</button></div>' : '';
      if (hist.length) $('#dclr').onclick = function () { hist = []; X.LS.set('f.decide', hist); drawHist(); }; }
    $('#dgo').onclick = function () {
      var q = $('#dq').value.trim().slice(0, 80), opts = [0, 1, 2].map(function (i) { return { n: $('.mpf-on[data-i="' + i + '"]').value.trim().slice(0, 60), t: all('[data-o="' + i + '"].on').map(function (b) { return b.dataset.t; }) }; }).filter(function (o) { return o.n; });
      if (opts.length < 2) { $('#dmsg').textContent = 'Name at least two options.'; return; }
      if (opts.some(function (o) { return !o.t.length; })) { $('#dmsg').textContent = 'Tap at least one tag for each option.'; return; }
      $('#dmsg').textContent = ''; var p = pick(q, opts); $('#dout').innerHTML = render(p);
      hist.push({ q: q, pick: p.rs[0].o.n, t: Date.now() }); hist = hist.slice(-10); X.LS.set('f.decide', hist); drawHist();
      $('#dout').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    drawHist();
  };
  /* ---------- 11. Letter from future you: assembled by rules from your scores (no AI) ---------- */
  var FUT = {
    O: { hi: ['You still collect obsessions. The thing you\u2019re curious about right now? It led somewhere you didn\u2019t expect.', 'You never stopped asking \u201cwhat if\u201d. Keep a list of ideas. Future you is still using it.'], lo: ['You got really good at a few things instead of okay at everything. That paid off.', 'You trusted what works. People came to you when they needed something done properly.'] },
    C: { hi: ['The habits you\u2019re building now are boring and they worked. Thank you for that.', 'You finish what you start. Just remember: rest is part of the plan, not a break from it.'], lo: ['You learned that \u201cstart badly\u201d beats \u201cstart later\u201d. That one trick changed a lot.', 'Your last-minute bursts still happen. You just give yourself a little more runway now.'] },
    E: { hi: ['Your people are still your fuel. Keep inviting them. Some of them are still around five years later.', 'You learned to sit still too, and it didn\u2019t kill you. It actually helped.'], lo: ['You found your few people, and that was enough. Quality over quantity was the right call.', 'You stopped apologizing for needing quiet. It made you better at the loud stuff when it counts.'] },
    A: { hi: ['You stayed kind, and you learned to say no without a ten-minute explanation.', 'People trust you. Make sure the people you trust back deserve it.'], lo: ['Your honesty made you a few enemies and a lot of real friends. Worth it.', 'You learned that being right and being heard are different skills. You\u2019re getting both.'] },
    N: { hi: ['The worries you have right now? Most of them didn\u2019t happen. The ones that did, you handled.', 'You feel things deeply. You also learned that a walk and a night\u2019s sleep fix more than you think.'], lo: ['Your calm got people through some messy moments. Don\u2019t forget to check how you actually feel.', 'Stuff rolled off you, mostly. When it didn\u2019t, you let someone help. Good.'] }
  };
  pages.future = function (sc) {
    var v = X.LS.get('f.futureV', 0), name = X.LS.get('name', ''), yr = new Date().getFullYear() + 5;
    var ord = B5.slice().sort(function (a, b) { return Math.abs(pct(sc, b) - 50) - Math.abs(pct(sc, a) - 50); }).slice(0, 3);
    var top = (sc.values || [])[0], att = sc.attachment && sc.attachment.style;
    var lines = ord.map(function (t, i) { var L = FUT[t][pct(sc, t) >= 50 ? 'hi' : 'lo']; return L[(v + i) % L.length]; });
    var val = top ? 'You still care most about ' + nm(top.key).toLowerCase() + '. When you weren\u2019t sure what to do, asking \u201cwhich choice fits that?\u201d usually got you there.' : '';
    var close = att === 'secure' ? 'Keep letting people in. You\u2019re good at it.' : att === 'anxious' ? 'Not every quiet text means something is wrong. You get better at believing that.' : att === 'avoidant' ? 'Letting people help you turned out to be a strength, not a weakness.' : 'Closeness felt complicated for a while. It gets easier with the right people.';
    var txt = 'Dear ' + (name || 'me') + ',\n\nIt\u2019s ' + yr + '. ' + lines[0] + '\n\n' + lines[1] + ' ' + lines[2] + '\n\n' + (val ? val + '\n\n' : '') + close + '\n\nSee you soon,\nYou, five years older';
    X.V.innerHTML = X.labHead('future') + '<div class="card mpf-letter">' + txt.split('\n\n').map(function (p) { return '<p>' + e(p).replace(/\n/g, '<br>') + '</p>'; }).join('') + '</div>' +
      '<div class="row2"><button class="btn ghost" id="fnew">Another version</button><button class="btn ghost" id="fsh">Share / copy</button></div>' +
      '<p class="muted small center">Put together by Mindprint\u2019s rules from your three strongest traits, your top value and your attachment style. Not written by AI and not a prediction: future you is still up to you.</p>';
    $('#fnew').onclick = function () { X.LS.set('f.futureV', v + 1); pages.future(sc); };
    $('#fsh').onclick = function () { share(txt); };
  };

  /* ---------- 13. Trait unlocks: rare combos earn badges, kept once earned (mp.f.badges) ---------- */
  var BADGES = [
    ['architect', '\ud83c\udfdb\ufe0f', 'Architect', 'Openness and Conscientiousness both 65+', 2, function (s) { return pct(s, 'O') >= 65 && pct(s, 'C') >= 65; }],
    ['eye', '\ud83c\udf00', 'Eye of the Storm', 'Extraversion 65+ with Emotional sensitivity 30 or under', 2, function (s) { return pct(s, 'E') >= 65 && pct(s, 'N') <= 30; }],
    ['soft', '\ud83d\udd4a\ufe0f', 'Soft Power', 'Agreeableness and Assertiveness both 65+', 2, function (s) { return pct(s, 'A') >= 65 && pct(s, 'E_assertiveness') >= 65; }],
    ['quiet', '\ud83d\udd25', 'Quiet Fire', 'Extraversion 35 or under with Achievement drive 70+', 2, function (s) { return pct(s, 'E') <= 35 && pct(s, 'C_achievement') >= 70; }],
    ['wild', '\ud83c\udfa2', 'Wild Heart', 'Excitement-seeking and Adventurousness both 70+', 2, function (s) { return pct(s, 'E_excitement') >= 70 && pct(s, 'O_adventure') >= 70; }],
    ['secure', '\ud83c\udfe1', 'Secure Base', 'Attachment anxiety and avoidance both 35 or under', 1, function (s) { return pct(s, 'att_anxiety') <= 35 && pct(s, 'att_avoidance') <= 35; }],
    ['diver', '\ud83e\udd3f', 'Deep Diver', 'Intellectual curiosity 75+ with Extraversion 40 or under', 2, function (s) { return pct(s, 'O_ideas') >= 75 && pct(s, 'E') <= 40; }],
    ['steady', '\ud83e\udded', 'Steady Hand', 'Conscientiousness 70+ with Emotional sensitivity 30 or under', 2, function (s) { return pct(s, 'C') >= 70 && pct(s, 'N') <= 30; }],
    ['thick', '\ud83d\udc97', 'Big Heart, Thick Skin', 'Empathy 70+ with Emotional sensitivity 35 or under', 2, function (s) { return pct(s, 'A_empathy') >= 70 && pct(s, 'N') <= 35; }],
    ['kindc', '\ud83e\udd94', 'Kind Skeptic', 'Trust 40 or under with Empathy 65+', 2, function (s) { return pct(s, 'A_trust') <= 40 && pct(s, 'A_empathy') >= 65; }],
    ['chaos', '\ud83c\udf2a\ufe0f', 'Chaos Genius', 'Openness 70+ with Conscientiousness 35 or under', 2, function (s) { return pct(s, 'O') >= 70 && pct(s, 'C') <= 35; }],
    ['bridge', '\ud83c\udf09', 'Bridge Builder', 'Top conflict style collaborating, with Agreeableness 60+', 1, function (s) { return s.conflict && s.conflict[0] && s.conflict[0].key === 'cf_collaborating' && pct(s, 'A') >= 60; }],
    ['balance', '\u2696\ufe0f', 'Perfect Balance', 'All five Big Five traits between 40 and 60', 3, function (s) { return B5.every(function (t) { var v = pct(s, t); return v >= 40 && v <= 60; }); }],
    ['allin', '\ud83d\udcd0', 'All In', '3 or more Big Five traits at 80+ or 20 or under', 3, function (s) { return B5.filter(function (t) { var v = pct(s, t); return v >= 80 || v <= 20; }).length >= 3; }],
    ['unicorn', '\ud83e\udd84', 'Unicorn', 'Collect 6 other badges', 3, null]
  ];
  var TIER = ['', 'Uncommon', 'Rare', 'Epic'];
  function earnBadges() {
    var got = X.LS.get('f.badges', {}), now = {}, fresh = [], latest = X.results('main')[0], ls = latest ? X.scoreOf(latest) : null;
    X.results('main').forEach(function (r) { var s = X.scoreOf(r); if (!s) return; BADGES.forEach(function (b) { if (b[5] && b[5](s)) { if (!got[b[0]]) { got[b[0]] = r.at || Date.now(); fresh.push(b[0]); } } }); });
    if (Object.keys(got).filter(function (k) { return k !== 'unicorn'; }).length >= 6 && !got.unicorn) { got.unicorn = Date.now(); fresh.push('unicorn'); }
    BADGES.forEach(function (b) { now[b[0]] = !!(ls && b[5] && b[5](ls)); });
    X.LS.set('f.badges', got); return { got: got, now: now, fresh: fresh };
  }
  pages.badges = function () {
    var r = earnBadges(), n = Object.keys(r.got).length;
    X.V.innerHTML = X.labHead('badges') + '<div class="card center"><div class="gbig">' + n + ' / ' + BADGES.length + '</div><p class="muted">badges collected</p>' + (r.fresh.length ? '<p class="mpf-ok">New: ' + r.fresh.map(function (id) { var b = BADGES.filter(function (x) { return x[0] === id; })[0]; return b[1] + ' ' + e(b[2]); }).join(', ') + '</p>' : '') + '</div>' +
      '<div class="mpf-badges">' + BADGES.map(function (b) { var on = !!r.got[b[0]]; return '<div class="mpf-badge' + (on ? ' on' : '') + '"><div class="mpf-bi">' + (on ? b[1] : '\ud83d\udd12') + '</div><b>' + e(b[2]) + '</b><small class="pill">' + TIER[b[4]] + '</small><p class="small muted">' + e(b[3]) + '</p>' +
        (on ? '<p class="small">' + (b[0] === 'unicorn' ? 'Earned ' : 'First earned ') + e(X.fmtDate(r.got[b[0]])) + (b[5] && !r.now[b[0]] ? ' \u00b7 your latest result has moved off it' : '') + '</p>' : '') + '</div>'; }).join('') + '</div>' +
      '<p class="muted small center">Badges check every quiz you\u2019ve taken. Once earned, a badge stays. \u201cRare\u201d means a stricter combo, not a count of other players.</p>';
  };
  /* ---------- 20. Top 3 profile card: share, save or print ---------- */
  pages.top3 = function (sc, r) {
    var ts = B5.map(function (t) { var v = pct(sc, t), hi = v >= 50; return { t: t, v: v, s: Math.abs(v - 50), w: POLE[t][hi ? 1 : 0], k: hi ? v : 100 - v }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 3);
    var who = X.LS.get('name', '') || 'Me', ty = null; try { ty = X.typesOf(r); } catch (x) {}
    X.V.innerHTML = X.labHead('top3') + '<div class="card mpf-printable"><img id="timg" class="lb-card" alt="Your top 3 traits card"></div><div class="card"><button class="btn big block" id="tsh">Share card</button><a class="btn ghost block" id="tdl" download="mindprint-top3.png">Save image</a><button class="btn ghost block" id="tpr">Print</button></div>' +
      '<p class="muted small center">Your three traits furthest from the middle, shown as how strongly you lean that way (\u201cCurious 82\u201d = Openness 82; \u201cSteady 75\u201d = Emotional sensitivity 25).</p>';
    var c = document.createElement('canvas'), W = 1080, H = 1350; c.width = W; c.height = H; var x = c.getContext('2d');
    var gr = x.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#1d1830'); gr.addColorStop(1, '#120f1c'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    var rg = x.createRadialGradient(0, H, 0, 0, H, 800); rg.addColorStop(0, 'rgba(51,225,210,.22)'); rg.addColorStop(1, 'rgba(51,225,210,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H);
    var F = '-apple-system,system-ui,sans-serif';
    x.fillStyle = '#b3a9cc'; x.font = '600 34px ' + F; x.fillText('MY TOP 3 TRAITS', 80, 130);
    x.fillStyle = '#f6f1ff'; x.font = '800 92px ' + F; x.fillText(who.slice(0, 16), 80, 230);
    if (ty && ty.four) { x.fillStyle = '#ff8a65'; x.font = '700 36px ' + F; x.fillText(ty.four.code + ' \u00b7 ' + ty.four.name, 80, 290); }
    var cols = ['#b39dff', '#33e1d2', '#ff8a65'];
    ts.forEach(function (t, i) { var y = 420 + i * 260;
      x.fillStyle = '#f6f1ff'; x.font = '800 70px ' + F; x.fillText(t.w, 80, y); x.fillStyle = cols[i]; x.font = '800 70px ' + F; var n = String(t.k); x.fillText(n, W - 80 - x.measureText(n).width, y);
      x.fillStyle = '#b3a9cc'; x.font = '500 32px ' + F; x.fillText(BN[t.t] + ' ' + t.v, 80, y + 50);
      x.fillStyle = '#262040'; x.fillRect(80, y + 80, W - 160, 26); x.fillStyle = cols[i]; x.fillRect(80, y + 80, (W - 160) * t.k / 100, 26); });
    x.fillStyle = '#b3a9cc'; x.font = '500 28px ' + F; x.fillText('Mindprint \u00b7 for fun and self-reflection', 80, H - 70);
    var url = c.toDataURL('image/png'); $('#timg').src = url; $('#tdl').href = url;
    $('#tsh').onclick = function () { c.toBlob(function (b) { var f = null; try { f = new File([b], 'mindprint-top3.png', { type: 'image/png' }); } catch (z) {} if (f && navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: 'My top 3 traits' }).catch(function () {}); else $('#tdl').click(); }); };
    $('#tpr').onclick = function () { document.body.classList.add('mpf-print'); var done = function () { document.body.classList.remove('mpf-print'); window.removeEventListener('afterprint', done); }; window.addEventListener('afterprint', done); window.print(); setTimeout(done, 60000); };
  };
  /* ---------- 17. Myth buster: pop-psych labels vs your actual scales ---------- */
  var MYTHS = [
    ['Introvert', ['E'], function (s) { return 100 - pct(s, 'E'); }, 'A real Big Five idea (low extraversion). It\u2019s about where you get energy, not shyness.'],
    ['Extrovert', ['E'], function (s) { return pct(s, 'E'); }, 'A real Big Five idea (high extraversion): energized by people and action.'],
    ['Ambivert', ['E'], function (s) { return 100 - 2 * Math.abs(pct(s, 'E') - 50); }, 'Most people are actually here. Extraversion is a sliding scale, not two boxes.'],
    ['Overthinker', ['N_anxiety'], function (s) { return pct(s, 'N_anxiety'); }, 'Not a clinical term, but it maps well onto the worry facet of emotional sensitivity.'],
    ['Type A', ['C_achievement', 'E_assertiveness', 'N_anger'], function (s) { return avg([pct(s, 'C_achievement'), pct(s, 'E_assertiveness'), pct(s, 'N_anger')]); }, 'Came from 1950s heart research. Later studies found the \u201ctype\u201d didn\u2019t hold up well; only the hostility part kept showing effects.'],
    ['Perfectionist', ['C', 'N'], function (s) { return avg([pct(s, 'C'), pct(s, 'N')]); }, 'Researchers do study perfectionism. It tends to look like high conscientiousness plus high sensitivity.'],
    ['Empath', ['A_empathy'], function (s) { return pct(s, 'A_empathy'); }, '\u201cEmpath\u201d isn\u2019t a scientific category, and there\u2019s no evidence of absorbing others\u2019 feelings. Empathy itself is real and measurable.'],
    ['People-pleaser', ['A_cooperation', 'cf_accommodating', 'att_anxiety'], function (s) { return avg([pct(s, 'A_cooperation'), pct(s, 'cf_accommodating'), pct(s, 'att_anxiety')]); }, 'Not a formal term. It overlaps with high harmony-seeking, giving in during conflict, and worrying about being left out.'],
    ['Free spirit', ['O', 'C'], function (s) { return avg([pct(s, 'O'), 100 - pct(s, 'C')]); }, 'Pop label for high openness with low conscientiousness.'],
    ['Lone wolf', ['E_sociability', 'att_avoidance'], function (s) { return avg([100 - pct(s, 'E_sociability'), pct(s, 'att_avoidance')]); }, 'Pop label. Real wolves live in packs, by the way.'],
    ['Highly sensitive person', ['N', 'O_fantasy'], function (s) { return avg([pct(s, 'N'), pct(s, 'O_fantasy')]); }, 'Researched by Elaine Aron as \u201csensory processing sensitivity\u201d; it overlaps a lot with emotional sensitivity and openness.'],
    ['Alpha', ['E_assertiveness', 'cf_competing'], function (s) { return avg([pct(s, 'E_assertiveness'), pct(s, 'cf_competing')]); }, 'The \u201calpha wolf\u201d idea came from captive wolves. The researcher who popularized it, David Mech, later spent years asking people to stop using it.'],
    ['Chill', ['N'], function (s) { return 100 - pct(s, 'N'); }, 'Low emotional sensitivity: stress rolls off. Real, and measurable.']
  ];
  pages.myth = function (sc) {
    var rs = MYTHS.filter(function (m) { return m[1].every(function (k) { return has(sc, k); }); }).map(function (m) { var v = Math.round(clamp(m[2](sc), 0, 100)); return { m: m, v: v, w: v >= 65 ? 'Fits' : v >= 45 ? 'Partly' : 'Doesn\u2019t fit' }; }).sort(function (a, b) { return b.v - a.v; });
    var cls = function (w) { return w === 'Fits' ? 'mpf-ok' : w === 'Partly' ? 'mpf-mid' : 'mpf-them'; };
    X.V.innerHTML = X.labHead('myth') + '<div class="card"><p class="tag">Fits you</p><p>' + (rs.filter(function (x) { return x.w === 'Fits'; }).map(function (x) { return '<b>' + e(x.m[0]) + '</b>'; }).join(', ') || 'None strongly. You\u2019re hard to label.') + '</p><p class="tag">Busted for you</p><p>' + (rs.filter(function (x) { return x.w === 'Doesn\u2019t fit'; }).map(function (x) { return e(x.m[0]); }).join(', ') || 'None') + '</p></div>' +
      rs.map(function (x) { return '<div class="card mpf-myth"><div class="bl"><span><b>' + e(x.m[0]) + '</b></span><b class="' + cls(x.w) + '">' + x.w + ' \u00b7 ' + x.v + '</b></div><div class="bt"><i style="width:' + Math.max(3, x.v) + '%"></i></div><p class="small muted">Based on: ' + x.m[1].map(function (k) { return e(nm(k)) + ' ' + pct(sc, k); }).join(', ') + '</p><p class="small">' + e(x.m[3]) + '</p></div>'; }).join('') +
      '<p class="muted small center">Fits = 65+, partly = 45\u201364. Each label is matched to the closest real scales from your quiz; the label itself may not be science.</p>';
  };

  /* ---------- 18. Reflection prompts: 3 a week for your growth trait (lowest of O/C/E/A, or the most sensitive end of N) ---------- */
  var GROW = {
    O: ['What\u2019s one thing you\u2019ve always said no to without really trying it? What would a tiny try look like?', 'Who do you know that thinks very differently from you? What might they be right about?', 'What did you learn this week that surprised you, even a little?', 'If you could spend one free afternoon on anything new, what would it be?', 'What\u2019s a routine you could change just once this week to see what happens?', 'Which question about the world do you wish you knew the answer to?'],
    C: ['What\u2019s the one task you keep pushing back? What\u2019s the smallest first step?', 'When did you last finish something you were proud of? What helped you finish?', 'What would \u201cgood enough\u201d look like for the thing you\u2019re avoiding?', 'Where do you lose the most time in a normal day?', 'What\u2019s one promise to yourself you could actually keep this week?', 'What would make tomorrow morning 10% easier, decided tonight?'],
    E: ['Who is one person you\u2019d like to know better? What\u2019s an easy way to reach out?', 'When did you speak up recently, even a little? How did it go?', 'What\u2019s a social situation that drains you? What would make it easier?', 'What\u2019s something you think but rarely say out loud in a group?', 'Who makes you feel most like yourself around them? Why?', 'What\u2019s a small social risk you could take this week?'],
    A: ['When did you last really listen to someone without planning your reply?', 'Who might be going through something you haven\u2019t noticed?', 'What\u2019s an argument you\u2019d like to see from the other side?', 'Who did something kind for you recently? Did you tell them?', 'When is being blunt helpful, and when does it cost you?', 'What would it look like to give someone the benefit of the doubt this week?'],
    N: ['What\u2019s been taking up the most space in your head this week? Is it in your control?', 'What actually helped the last time you felt overwhelmed?', 'What would you tell a friend who was worried about what you\u2019re worried about?', 'What\u2019s one thing that went better than you feared recently?', 'Where do you feel stress in your body? What helps it let go?', 'What\u2019s one thing you could stop checking or replaying this week?']
  };
  function growTrait(sc) { var c = ['O', 'C', 'E', 'A'].map(function (t) { return { t: t, v: pct(sc, t) }; }).concat([{ t: 'N', v: 100 - pct(sc, 'N') }]); c.sort(function (a, b) { return a.v - b.v; }); return c[0].t; }
  pages.reflect = function (sc) {
    var wk = weekKey(), log = X.LS.get('f.reflect', {}), cur = log[wk] || { t: growTrait(sc), a: ['', '', ''] }, auto = growTrait(sc);
    var n = Math.floor(Date.now() / (7 * DAY)), list = GROW[cur.t], qs = [0, 1, 2].map(function (i) { return list[(n * 3 + i) % list.length]; });
    var why = cur.t === 'N' ? 'Emotional sensitivity is your highest-pressure trait (' + pct(sc, 'N') + ')' : BN[cur.t] + ' is your lowest trait (' + pct(sc, cur.t) + ')';
    X.V.innerHTML = X.labHead('reflect') + '<div class="card"><p class="tag">This week \u00b7 ' + e(BN[cur.t]) + '</p><p class="small muted">' + e(cur.t === auto ? why + ', so this week\u2019s questions are about it.' : 'You picked this trait for the week.') + '</p>' +
      qs.map(function (q, i) { return '<label class="mpf-rq"><b>' + (i + 1) + '. ' + e(q) + '</b><textarea data-r="' + i + '" maxlength="1200" rows="3" placeholder="Write as much or as little as you want">' + e(cur.a[i] || '') + '</textarea></label>'; }).join('') +
      '<button class="btn big block" id="rsv">Save</button></div><div class="card"><p class="tag">Pick another trait</p><div class="chips">' + B5.map(function (t) { return '<button class="chip' + (t === cur.t ? ' on' : '') + '" data-rt="' + t + '">' + e(BN[t]) + '</button>'; }).join('') + '</div><p class="muted small">New questions every Monday. ' + Object.keys(log).length + ' week' + (Object.keys(log).length === 1 ? '' : 's') + ' saved. Answers stay on this phone.</p></div>';
    var save = function (quiet) { cur.a = all('[data-r]').map(function (t) { return t.value.slice(0, 1200); }); log[wk] = cur; var ks = Object.keys(log).sort(); while (ks.length > 26) delete log[ks.shift()]; X.LS.set('f.reflect', log); if (!quiet) X.toast('Saved'); };
    $('#rsv').onclick = function () { save(); };
    all('[data-rt]').forEach(function (b) { b.onclick = function () { var had = all('[data-r]').some(function (t) { return t.value.trim(); }); if (had) save(true); cur = { t: b.dataset.rt, a: ['', '', ''] }; log[wk] = cur; X.LS.set('f.reflect', log); pages.reflect(sc); }; });
  };
  /* ---------- 15. Stress mode: a separate 10-question quiz, scored on this phone (mp.f.stress) ---------- */
  var STY = { T: ['\ud83d\udee1\ufe0f', 'Take-charge', 'You grab the wheel. Under pressure you act fast, decide and push.', 'Pause for 10 seconds before deciding for everyone. Ask one person what they think.'],
    P: ['\ud83d\uddc2\ufe0f', 'Planner', 'You break it into steps. Lists, schedules and a plan calm you down.', 'When the plan breaks, pick the next single step instead of re-planning everything.'],
    S: ['\ud83d\udcac', 'Talk-it-out', 'You reach for people. Saying it out loud to someone you trust is how you sort it.', 'Have two or three go-to people, so it doesn\u2019t all land on one friend.'],
    D: ['\ud83c\udfae', 'Escape hatch', 'You step away: games, music, scrolling, anything else. It buys you calm.', 'Set a timer on the escape, then do the smallest piece of the real thing.'],
    F: ['\ud83e\uddca', 'Freeze', 'You lock up. Too many choices or too much pressure and everything stalls.', 'Shrink the task until it\u2019s silly-small (\u201copen the doc\u201d). Moving breaks the freeze.'],
    V: ['\ud83c\udf0b', 'Pressure valve', 'It comes out: frustration, snapping, tears. Then you feel better and move on.', 'Name it before it blows (\u201cI\u2019m getting stressed\u201d). It lets people give you room.'] };
  var SQ = [
    ['The night before a big test, you realize you skipped a whole chapter.', [['Pull the chapter up and grind through it now', 'T'], ['Make a quick plan: key pages first, then practice questions', 'P'], ['Text a friend who gets it to walk you through it', 'S'], ['Watch something to calm down first', 'D'], ['Stare at the book and can\u2019t start', 'F']]],
    ['Your group project is due tomorrow and a teammate hasn\u2019t done their part.', [['Do their part myself and tell them later', 'T'], ['Split what\u2019s left into tasks with times', 'P'], ['Call them and talk it out', 'S'], ['Get really annoyed, maybe say something sharp', 'V']]],
    ['You\u2019re about to go on stage (game, recital, speech).', [['Lock in and go', 'T'], ['Run through my routine one more time', 'P'], ['Find my friends or coach for a pep talk', 'S'], ['Put headphones in and zone out', 'D'], ['Feel my mind go blank', 'F']]],
    ['Three deadlines just landed on the same day.', [['Pick the biggest and attack it', 'T'], ['Write out a schedule hour by hour', 'P'], ['Complain about it to someone, then start', 'S'], ['Avoid all three for a while', 'D'], ['Feel overwhelmed and stuck', 'F']]],
    ['Someone criticizes you in front of others.', [['Push back right there', 'T'], ['Stay quiet, figure out a response later', 'P'], ['Talk to a friend about it afterwards', 'S'], ['Snap or get visibly upset', 'V'], ['Freeze and can\u2019t think of anything', 'F']]],
    ['Your phone dies and you\u2019re lost in a new place.', [['Pick a direction and go', 'T'], ['Figure out landmarks and make a plan', 'P'], ['Ask someone nearby for help', 'S'], ['Panic a little and stall', 'F']]],
    ['Your parent or coach is upset with you and wants to talk.', [['Go straight to them and get it over with', 'T'], ['Plan what I\u2019m going to say', 'P'], ['Ask someone what they think I should do', 'S'], ['Put it off as long as possible', 'D'], ['Get defensive or emotional', 'V']]],
    ['You\u2019re falling behind in practice and the season starts soon.', [['Train extra on my own', 'T'], ['Make a practice plan for each week', 'P'], ['Ask a teammate or coach for help', 'S'], ['Tell myself it\u2019ll work out and do other stuff', 'D']]],
    ['A friend is mad at you and you don\u2019t know why.', [['Ask them straight out', 'T'], ['Think through what might have happened first', 'P'], ['Ask a mutual friend what\u2019s going on', 'S'], ['Get upset about it', 'V'], ['Do nothing and hope it passes', 'F']]],
    ['It\u2019s been a really long, stressful week. Friday night you\u2026', [['Fix whatever\u2019s still unfinished', 'T'], ['Plan next week so it\u2019s better', 'P'], ['Hang out with people and talk it off', 'S'], ['Disappear into a game, show or music', 'D'], ['Let it all out: cry, rant, vent', 'V']]]
  ];
  pages.stressq = function (sc) {
    var past = X.LS.get('f.stress', []), h = X.labHead('stressq');
    function result(rec) {
      var tot = 0, ks = Object.keys(STY); ks.forEach(function (k) { tot += rec.c[k] || 0; });
      var srt = ks.slice().sort(function (a, b) { return (rec.c[b] || 0) - (rec.c[a] || 0); }), a = STY[srt[0]], b = STY[srt[1]];
      var main = sc && sc.coping && sc.coping[0] ? '<p class="small muted">Your main quiz\u2019s top coping style is ' + e(nm(sc.coping[0].key)) + '. This quiz looks only at high-pressure moments, so it can come out differently.</p>' : '';
      X.V.innerHTML = h + '<div class="card center"><p class="eyebrow">Under pressure you\u2019re</p><div class="mpf-big">' + a[0] + '</div><h2>' + e(a[1]) + '</h2><p>' + e(a[2]) + '</p>' + ((rec.c[srt[1]] || 0) >= 2 ? '<p class="muted small">backup mode: ' + b[0] + ' ' + e(b[1]) + '</p>' : '') + '</div>' +
        '<div class="card"><h3>Try this next time</h3><p>' + e(a[3]) + '</p>' + main + '</div><div class="card"><p class="tag">Your stress mix</p>' + srt.map(function (k) { return bar(STY[k][0] + ' ' + e(STY[k][1]), 100 * (rec.c[k] || 0) / (tot || 1), Math.round(100 * (rec.c[k] || 0) / (tot || 1)) + '%'); }).join('') + '</div>' +
        (past.length > 1 ? '<div class="card"><p class="tag">Past takes</p>' + past.slice().reverse().map(function (p) { var top = Object.keys(STY).sort(function (x, y) { return (p.c[y] || 0) - (p.c[x] || 0); })[0]; return '<div class="bl mpf-rl"><span>' + e(X.fmtDate(p.at)) + '</span><b>' + STY[top][0] + ' ' + e(STY[top][1]) + '</b></div>'; }).join('') + '</div>' : '') +
        '<button class="btn ghost block" id="sre">Take it again</button><p class="muted small center">10 made-up pressure situations, scored on this phone and saved only here. A snapshot, not a diagnosis.</p>';
      $('#sre').onclick = function () { quiz(0, {}); };
    }
    function quiz(i, picks) {
      if (i >= SQ.length) { var c = {}; for (var k in picks) c[picks[k]] = (c[picks[k]] || 0) + 1; var rec = { at: Date.now(), c: c }; past.push(rec); past = past.slice(-10); X.LS.set('f.stress', past); result(rec); return; }
      var q = SQ[i];
      X.V.innerHTML = h + '<div class="qcard"><p class="tag">' + (i + 1) + ' of ' + SQ.length + '</p><div class="bar"><i style="width:' + Math.round(100 * i / SQ.length) + '%"></i></div><h2 class="q">' + e(q[0]) + '</h2><div class="opts">' + q[1].map(function (o, k) { return '<button class="opt" data-k="' + k + '">' + e(o[0]) + '</button>'; }).join('') + '</div>' + (i ? '<button class="btn ghost block" id="sbk">\u2039 Back</button>' : '') + '</div>';
      all('.opt').forEach(function (b) { b.onclick = function () { picks[i] = q[1][+b.dataset.k][1]; b.classList.add('sel'); setTimeout(function () { quiz(i + 1, picks); }, 150); }; });
      if (i) $('#sbk').onclick = function () { quiz(i - 1, picks); };
    }
    if (past.length) result(past[past.length - 1]);
    else { X.V.innerHTML = h + '<div class="card"><p>10 quick pressure situations. Pick what you\u2019d actually do, not what you should do. About 2 minutes.</p><button class="btn big block" id="sgo">Start</button></div>'; $('#sgo').onclick = function () { quiz(0, {}); }; }
  };
  /* ---------- 12. One question a day: one Sharpen question per day, saved the same way as Sharpen (with the same consent) ---------- */
  pages.daily1 = function () {
    var h = X.labHead('daily1');
    X.V.innerHTML = h + '<div class="card"><p class="muted">Loading today\u2019s question\u2026</p></div>';
    X.loadA().then(function (A) {
      if (!A || !A.questions) { X.V.innerHTML = h + '<div class="card"><p>Couldn\u2019t load the questions. Check your connection.</p></div>'; return; }
      var day = X.dayKey(), log = X.LS.get('f.daily', {}), ad = X.addonRec(), done = {}; (ad ? ad.answers : []).forEach(function (x) { done[x.q] = x; });
      var byId = {}; A.questions.forEach(function (q) { byId[q.id] = q; });
      var qid = log[day] && byId[log[day]] ? log[day] : null;
      if (!qid) { var left = A.questions.filter(function (q) { return !done[q.id]; }); if (left.length) { qid = left[Math.floor(Date.now() / DAY) % left.length].id; log[day] = qid; var ks = Object.keys(log).sort(); while (ks.length > 120) delete log[ks.shift()]; X.LS.set('f.daily', log); } }
      var streak = 0; for (var d = 0; d < 400; d++) { var k = X.dayKey(Date.now() - d * DAY), q0 = log[k]; if (q0 && done[q0]) streak++; else if (d) break; }
      var nDone = A.questions.filter(function (q) { return done[q.id]; }).length;
      var foot = '<p class="muted small center">' + nDone + ' of ' + A.questions.length + ' sharpen questions answered' + (streak ? ' \u00b7 ' + streak + '-day streak' : '') + '. Each answer feeds your types, same as Sharpen.</p>';
      if (!qid) { X.V.innerHTML = h + '<div class="card"><h2>You\u2019ve answered them all</h2><p class="muted">Every sharpen question is in your profile. Nice.</p><a class="btn block" href="#types">See your types</a></div>' + foot; return; }
      var q = byId[qid], ans = done[qid];
      if (ans) { X.V.innerHTML = h + '<div class="card"><p class="tag">Today \u00b7 done \u2705</p><h2>' + e(q.text) + '</h2><p>You said: <b>' + e(ans.a === -1 ? ans.o || '' : (q.options[ans.a] || {}).t || '') + '</b></p><p class="muted small">This fed your ' + e(X.sysName(q.sys)) + '. Come back tomorrow for the next one.</p><a class="btn ghost block" href="#types">See your types</a></div>' + foot; return; }
      var ok = X.LS.get('addonOk', false);
      X.V.innerHTML = h + '<div class="card"><p class="tag">Today \u00b7 sharpens your ' + e(X.sysName(q.sys)) + '</p><h2 class="q">' + e(q.text) + '</h2><div class="opts">' + q.options.map(function (o, k) { return '<button class="opt" data-k="' + k + '"' + (ok ? '' : ' disabled') + '>' + e(o.t) + '</button>'; }).join('') + '</div>' +
        (ok ? '' : '<label class="ck"><input type="checkbox" id="dok"><span>' + e(X.PRIV) + '</span></label>') + '</div>' + foot;
      if (!ok) $('#dok').onchange = function () { if (this.checked) { X.LS.set('addonOk', true); all('.opt').forEach(function (b) { b.disabled = false; }); } };
      all('.opt').forEach(function (b) { b.onclick = function () { if (!X.LS.get('addonOk', false)) return; b.classList.add('sel'); var o = {}; o[qid] = { a: +b.dataset.k }; X.saveAddon(o); X.toast(X.sysName(q.sys) + ' sharpened'); setTimeout(function () { pages.daily1(); }, 300); }; });
    });
  };

  window.MPFeatures = { tools: tools, pages: pages, init: function (api) { X = api; }, qShown: function (id) { if (X) qShown(id); }, qAnswered: function (id) { if (X) qAnswered(id); }, quizDone: function (r) { if (X) quizDone(r); }, homeExtra: function (last) { return X ? homeExtra(last) : ''; } };
})();
