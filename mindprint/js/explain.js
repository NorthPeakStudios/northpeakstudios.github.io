/* Mindprint tap-to-explain (1.1.4, Oct 25 2026; Odin: "clicking on anything should open up an explanation of what it means and why I'm part of that").
   Any element with data-x="<key>" opens a bottom sheet: what it means, why you got it (from YOUR answers and scores), and the right buttons.
   Everything is inferred from answers, for fun. No fake stats: every number shown is one of your own scores or a count of your own answers. */
(function () {
  'use strict';
  var TY = function () { return window.MPTypes || {}; };
  var CTX = null, OPEN = false, PUSHED = false, AFTER = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function R(v) { return Math.round(v); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function list(a) { a = a.filter(Boolean); return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  var NOTE = 'Inferred from your answers, for fun. Not an official test and not a diagnosis.';
  var BIGN = { O: 'Openness', C: 'Conscientiousness', E: 'Extraversion', A: 'Agreeableness', N: 'Emotional sensitivity' };
  function nm(k) { if (CTX && CTX.nm) { var n = CTX.nm(k); if (n && n !== k) return n; } return BIGN[k] || k; }
  function P() { return (CTX && CTX.p) || {}; }
  function P0() { return (CTX && (CTX.p0 || CTX.p)) || {}; }
  var CURP = null; function cp() { return CURP || P(); }
  function useP(x) { CURP = x && x.self ? P0() : P(); return CURP; }
  /* a "Not me?" pick can move the trait scores it comes from; say so wherever a moved score is shown */
  function nudgeNote(keys) { var a = P(), b = P0(), ov = CTX.ov || (CTX.T && CTX.T.ov), out = []; if (!ov || CURP === b) return '';
    keys.forEach(function (k) { if (typeof a[k] === 'number' && typeof b[k] === 'number' && R(a[k]) !== R(b[k])) out.push(nm(k) + ' ' + R(b[k]) + ' \u2192 ' + R(a[k])); });
    if (!out.length) return ''; var what = ov.four || ov.socionics || ''; return '<div class="xs-self">Because you picked ' + esc(what ? what : 'your own type') + ' yourself, these scores are counted toward it: ' + esc(out.join(', ')) + ' (your answers on the left).</div>'; }
  function sv(k, p) { p = p || cp(); var v = k.charAt(0) === '-' ? 100 - p[k.slice(1)] : p[k]; return typeof v === 'number' ? R(v) : null; }
  function kk(k) { return k.charAt(0) === '-' ? k.slice(1) : k; }

  /* ---------- your answers behind a scale ---------- */
  var BIG5 = /^([OCEAN])_/;
  function contrib(s) { var o = {}; for (var k in (s || {})) { o[k] = (o[k] || 0) + s[k]; var m = BIG5.exec(k); if (m) o[m[1]] = (o[m[1]] || 0) + s[k]; } return o; }
  var CACHE = {};
  function qmap() { if (CACHE.q) return CACHE.q; var m = {}; ((CTX.Q && CTX.Q.questions) || []).forEach(function (q) { m[q.id] = q; }); return (CACHE.q = m); }
  function amap() { if (CACHE.a) return CACHE.a; var m = {}; ((CTX.AQ && CTX.AQ.questions) || []).forEach(function (q) { m[q.id] = q; }); return (CACHE.a = m); }
  function ansMap() { if (CACHE.r) return CACHE.r; var m = {}; ((CTX.r && CTX.r.answers) || []).forEach(function (a) { m[a.q] = a.a; }); return (CACHE.r = m); }
  /* main-quiz items for scale k: {q, ans, e: points this answer moved you vs a middle answer, down/up: how far it could move you} */
  function mainItems(k) {
    var out = [], span = 0, qm = qmap();
    if (CTX.full) {
      ((CTX.r && CTX.r.answers) || []).forEach(function (a) { var q = qm[a.q]; if (!q || a.a == null || a.a < 0 || !q.options[a.a]) return;
        var cs = q.options.map(function (o) { return contrib(o.s); }); if (!cs.some(function (c) { return k in c; })) return;
        var vals = cs.map(function (c) { return c[k] || 0; }), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals); span += hi - lo;
        if (hi > lo) out.push({ q: q, ans: q.options[a.a].t, v: vals[a.a], lo: lo, hi: hi }); });
    } else if (CTX.why && CTX.why.it) {
      var am = ansMap(); CTX.why.it.forEach(function (x) { if (x[1] !== k) return; var q = qm[x[0]], ai = am[x[0]]; span += x[4] - x[3];
        if (q && x[4] > x[3]) out.push({ q: q, ans: q.options[ai] ? q.options[ai].t : '', v: x[2], lo: x[3], hi: x[4] }); });
    }
    out.forEach(function (o) { o.e = span ? 100 * (o.v - (o.lo + o.hi) / 2) / span : 0; o.down = span ? 100 * (o.v - o.lo) / span : 0; o.up = span ? 100 * (o.hi - o.v) / span : 0; o.src = 'quiz'; });
    return out;
  }
  /* sharpen / retake answers on a trait axis or a system category, weighted the way types.js blends them */
  var CATRE = /^(e\d|ar_|ds_|cg_|ls_)/;
  function addItems(k) {
    var am = amap(), rows = [], tot = 0;
    ((CTX.addon) || []).forEach(function (a) { var q = am[a.q]; if (!q || a.a == null) return; var has = q.options.some(function (o) { return o.v && k in o.v; }); if (!has) return;
      var wt = a.r || q.bank === 'B' ? 2 : 1, mx = Math.max.apply(null, q.options.map(function (o) { return Math.abs((o.v || {})[k] || 0); })) || 1; tot += wt * mx;
      if (a.a < 0 || !q.options[a.a]) return; var w = (q.options[a.a].v || {})[k] || 0; rows.push({ q: q, ans: q.options[a.a].t, w: w, wt: wt, mx: mx, src: wt > 1 ? 'retake' : 'sharpen' }); });
    if (!rows.length) return { rows: [], m: 0 };
    var m = Math.min(12, tot), K = TY().K || 3, sh = m / (K + m), cat = CATRE.test(k);
    rows.forEach(function (o) { var f = cat ? 100 : 50; o.e = sh * f * o.wt * (cat ? Math.max(0, o.w) : o.w) / tot; o.down = sh * f * o.wt * (cat ? Math.max(0, o.w) : o.w + o.mx) / tot; o.up = sh * f * o.wt * (cat ? o.mx - Math.max(0, o.w) : o.mx - o.w) / tot; });
    return { rows: rows, m: m, sh: sh };
  }
  function items(k) { var main = mainItems(k), ad = addItems(k); if (ad.m) { var keep = 1 - ad.sh; main.forEach(function (o) { o.e *= keep; o.down *= keep; o.up *= keep; }); } return main.concat(ad.rows); }
  /* drivers: [[scaleKey (prefix - = reversed), weight]] for a result that points one way; returns the answers that pushed hardest toward it */
  function topFor(drivers, n, against) {
    var agg = {};
    drivers.forEach(function (d) { var k = kk(d[0]), dir = d[0].charAt(0) === '-' ? -1 : 1, w = d[1] == null ? 1 : d[1];
      items(k).forEach(function (o) { var id = o.src + ':' + o.q.id, g = agg[id] || (agg[id] = { o: o, s: 0, by: {} }); var c = dir * w * o.e; g.s += c; g.by[k] = (g.by[k] || 0) + c; }); });
    var arr = Object.keys(agg).map(function (x) { return agg[x]; }).filter(function (g) { return against ? g.s < -0.05 : g.s > 0.05; });
    arr.sort(function (a, b) { return against ? a.s - b.s : b.s - a.s; });
    return arr.slice(0, n || 3);
  }
  function short(t, n) { t = String(t || ''); n = n || 90; return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '\u2026' : t; }
  function quote(g, tag) { var o = g.o, src = o.src === 'quiz' ? '' : ' <span class="xs-src">' + (o.src === 'retake' ? 'retake' : 'sharpen') + '</span>';
    return '<li><span class="xs-q">\u201c' + esc(short(o.q.text)) + '\u201d</span> <span class="xs-a">\u2192 ' + esc(o.ans) + '</span>' + (tag ? ' <span class="xs-t">' + esc(tag) + '</span>' : '') + src + '</li>'; }
  function quotes(drivers, n, tagger, title) {
    if (!CTX.full && !(CTX.why && CTX.why.it)) return '';
    var g = topFor(drivers, n || 3); if (!g.length) return '';
    return '<p class="xs-lbl">' + esc(title || 'Answers that pushed you here most') + '</p><ul class="xs-ql">' + g.map(function (x) { return quote(x, tagger ? tagger(x) : ''); }).join('') + '</ul>';
  }
  /* about how many answers going the other way would move scale k across `to` */
  function flipN(k, to) {
    to = to == null ? 50 : to; var v = cp()[k]; if (typeof v !== 'number') return null; var need = Math.abs(v - to) + 0.5, down = v >= to;
    var its = items(k).map(function (o) { return down ? o.down : o.up; }).filter(function (x) { return x > 0.2; }).sort(function (a, b) { return b - a; });
    if (!its.length) return null; var s = 0; for (var i = 0; i < its.length; i++) { s += its[i]; if (s >= need) return i + 1; } return null;
  }
  function nAns(k) { return items(k).filter(function (o) { return o.src === 'quiz'; }).length; }

  /* ---------- building blocks ---------- */
  function row(label, val, sub) { return '<div class="xs-row"><span>' + esc(label) + '</span><b>' + esc(val) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>'; }
  function para(h) { return '<p>' + h + '</p>'; }
  function confLine(c) { return c ? para('Confidence: <b>' + esc(c.word) + ' (' + c.pct + '%)</b>' + (c.why ? ', ' + esc(c.why) : '') + '. That\u2019s how clearly your answers point here, not a measure of accuracy.') : ''; }
  function selfLine(x, extra) { if (!x || !x.self) return ''; var i = x.inferred || {};
    return '<div class="xs-self"><b>You picked this yourself.</b> ' + (x.same ? 'Your answers said the same thing' : 'Your answers said <b>' + esc((i.code && i.code !== i.name ? i.code + ' ' : '') + (i.name || '')) + '</b>') + (i.conf ? ' (' + i.conf.pct + '% confidence)' : '') + '. Your pick wins on screen; below is what your answers showed.' + (extra || '') + '</div>'; }
  function flipLine(k, toLabel, to) { var n = flipN(k, to); if (n == null) return ''; return para('<b>What would flip it:</b> about ' + n + ' answer' + (n > 1 ? 's' : '') + ' going the other way would move you to ' + esc(toLabel) + '.'); }
  function deepLine(keys) { var u = CTX.T && CTX.T.used; if (!u || !u.deep) return ''; var D = { att_anxiety: 1, att_avoidance: 1, N: 1, E: 1, A: 1, O: 1 }; return keys.some(function (k) { return D[k]; }) ? para('<span class="muted">A few of your Deep Dive answers about growing up nudged this a little too.</span>') : ''; }
  function fnKeys(f) { var s = String(f), out = [], re = /(inv\()?p\.([A-Za-z_]+)/g, m; while ((m = re.exec(s))) out.push((m[1] ? '-' : '') + m[2]); return out; }
  function drvList(keys) { return keys.map(function (k) { var rev = k.charAt(0) === '-', v = sv(kk(k)); return v == null ? '' : '<li>' + esc(nm(kk(k))) + ' <b>' + v + '</b>' + (rev ? ' <span class="muted">(counts in reverse: lower = more)</span>' : '') + '</li>'; }).join(''); }

  /* ---------- the systems ---------- */
  var PAIRS = [['E', 'I', 'E', 'Extraversion', 'Introversion', 'where you get your energy: from people and action (E) or from time alone and your own head (I)'], ['N', 'S', 'O', 'iNtuition', 'Sensing', 'what you notice first: patterns, ideas and possibilities (N) or concrete facts and what\u2019s in front of you (S)'],
    ['F', 'T', 'A', 'Feeling', 'Thinking', 'how you decide: by values and how people feel (F) or by logic and fairness of the rules (T)'], ['J', 'P', 'C', 'Judging', 'Perceiving', 'how you like life: planned and settled (J) or open and flexible (P)']];
  var M = {}; // key -> function(arg) returning {kicker, title, mean, why, sys, x, locked}
  function fourLetters(p) { return PAIRS.map(function (x) { var v = p[x[2]]; return typeof v === 'number' ? (v >= 50 ? x[0] : x[1]) : '?'; }).join(''); }
  M.four = function () {
    var f = CTX.four || (CTX.T && CTX.T.four); if (!f) return null; var p0 = useP(f);
    var mean = para('A 4-letter type sorts you on four either/or preferences, in the style of the Myers-Briggs (MBTI): <b>E/I</b> Extraversion or Introversion, <b>N/S</b> iNtuition or Sensing, <b>F/T</b> Feeling or Thinking, <b>J/P</b> Judging (planner) or Perceiving (go with the flow).') +
      para('<b>' + esc(f.code) + ' \u00b7 ' + esc(f.name) + '</b>: ' + esc(f.text || '') + ' Mindprint isn\u2019t the official MBTI; it builds each letter from one of your Big Five scores.');
    var why = selfLine(f), lines = PAIRS.map(function (x, i) { var v = p0[x[2]]; if (typeof v !== 'number') return ''; var l = v >= 50 ? x[0] : x[1], d = Math.abs(v - 50);
      return row(nm(x[2]) + ' ' + R(v) + '/100', '\u2192 ' + l, d >= 15 ? 'clear' : d >= 6 ? 'moderate' : 'close to the middle'); }).join('');
    why += '<div class="xs-rows">' + lines + '</div>';
    var drv = PAIRS.map(function (x) { var v = p0[x[2]]; return [(v >= 50 ? '' : '-') + x[2], 1]; });
    why += quotes(drv, 3, function (g) { var best = null, bv = 0; for (var k in g.by) if (g.by[k] > bv) { bv = g.by[k]; best = k; } var i = PAIRS.map(function (x) { return x[2]; }).indexOf(best); return i >= 0 ? '\u2192 ' + (p0[best] >= 50 ? PAIRS[i][0] : PAIRS[i][1]) : ''; });
    var wi = 0, wd = 99; PAIRS.forEach(function (x, i) { var d = Math.abs((p0[x[2]] || 50) - 50); if (d < wd) { wd = d; wi = i; } }); var wx = PAIRS[wi], wv = p0[wx[2]];
    if (typeof wv === 'number') { var other = wv >= 50 ? wx[1] : wx[0], code = fourLetters(p0).split(''); code[wi] = other; var n = flipN(wx[2]);
      why += para('<b>What would flip it:</b> your closest call is ' + wx[0] + '/' + wx[1] + ' (' + nm(wx[2]) + ' ' + R(wv) + ').' + (n ? ' About ' + n + ' answer' + (n > 1 ? 's' : '') + ' going the other way would make you ' + esc(code.join('')) + '.' : '')); }
    why += confLine(f.self ? (f.inferred && f.inferred.conf) : f.conf);
    return { kicker: '4-letter type \u00b7 MBTI-style', title: f.code + ' \u00b7 ' + f.name, mean: mean, why: why, sys: 'four', x: f };
  };
  M.letter = function (i) {
    i = +i; var x = PAIRS[i]; if (!x) return null; var v = useP(CTX.four || (CTX.T && CTX.T.four))[x[2]], l = typeof v === 'number' ? (v >= 50 ? x[0] : x[1]) : '?';
    var mean = para('<b>' + x[0] + '</b> = ' + x[3] + ', <b>' + x[1] + '</b> = ' + x[4] + '. This letter is about ' + esc(x[5]) + '.') + para('Mindprint reads it from your <b>' + nm(x[2]) + '</b> score: 50 or more gives ' + x[0] + ', under 50 gives ' + x[1] + '.');
    var why = typeof v === 'number' ? para('Your ' + nm(x[2]) + ' is <b>' + R(v) + '/100</b> from ' + nAns(x[2]) + ' answers, so you got <b>' + l + '</b> (' + (Math.abs(v - 50) >= 15 ? 'clearly' : Math.abs(v - 50) >= 6 ? 'moderately' : 'only just') + ').') : '';
    why += quotes([[(v >= 50 ? '' : '-') + x[2], 1]], 3) + flipLine(x[2], l === x[0] ? x[1] : x[0]);
    return { kicker: '4-letter type \u00b7 letter ' + (i + 1), title: x[0] + ' or ' + x[1] + ': you\u2019re ' + l, mean: mean, why: why, sys: 'four', x: CTX.T && CTX.T.four };
  };
  function clProfiles() { return (TY().CLUSTERS || []); }
  function clRank(p) { var BF = ['O', 'C', 'E', 'A', 'N'], v = BF.map(function (k) { return p[k]; });
    return clProfiles().map(function (c) { var d = Math.sqrt(c[4].reduce(function (s, x, i) { return s + Math.pow(x - v[i], 2); }, 0) / 5); return { key: c[0], name: c[1], emoji: c[2], prof: c[4], text: c[5], d: d, match: clamp(R(100 - d * 1.4), 1, 99) }; }).sort(function (a, b) { return a.d - b.d; }); }
  M.cluster = function (key) {
    var cl = CTX.cluster || (CTX.T && CTX.T.cluster); if (!cl) return null; var p0 = useP(cl), BF = ['O', 'C', 'E', 'A', 'N'];
    if (BF.some(function (k) { return typeof p0[k] !== 'number'; })) return null;
    var rk = clRank(p0), mine = rk[0], tgt = key ? rk.filter(function (c) { return c.key === key; })[0] : rk.filter(function (c) { return c.key === cl.key; })[0] || mine; if (!tgt) return null;
    var isMine = tgt.key === cl.key;
    var mean = para('Clusters group people who score alike. Mindprint has <b>8 hand-made profiles</b> on the Big Five (made up for fun, not measured groups of real people). Your cluster is the profile closest to your five scores; the match % is how close.') + para('<b>' + esc(tgt.emoji + ' ' + tgt.name) + '</b>: ' + esc(tgt.text));
    var why = (isMine ? selfLine(cl) : '') + nudgeNote(BF);
    why += '<p class="xs-lbl">You vs ' + esc(tgt.name) + '</p><div class="xs-rows">' + BF.map(function (k, i) { var d = R(p0[k] - tgt.prof[i]); return row(nm(k), R(p0[k]) + ' vs ' + tgt.prof[i], Math.abs(d) <= 10 ? 'close' : (d > 0 ? d + ' above' : -d + ' below')); }).join('') + '</div>';
    var rnk = rk.indexOf(tgt) + 1;
    why += para('That makes you a <b>' + tgt.match + '% match</b>, ' + (rnk === 1 ? 'the closest of all 8' : 'number ' + rnk + ' of 8 (your closest is ' + esc(mine.emoji + ' ' + mine.name) + ' at ' + mine.match + '%)') + '.');
    var dist = BF.map(function (k, i) { return [k, p0[k] - 50, Math.abs(p0[k] - tgt.prof[i])]; }).filter(function (x) { return x[2] <= 20 && Math.abs(x[1]) >= 8; }).sort(function (a, b) { return Math.abs(b[1]) - Math.abs(a[1]); }).slice(0, 2);
    if (dist.length) why += quotes(dist.map(function (x) { return [(x[1] >= 0 ? '' : '-') + x[0], 1]; }), 3, null, rnk === 1 ? 'Answers that pulled you here most' : 'Answers that pulled you toward it');
    if (rnk === 1) { var nx = rk[1], best = null;
      BF.forEach(function (k, i) { var step = nx.prof[i] > p0[k] ? 1 : -1; for (var s = 1; s <= 60; s++) { var q = {}; BF.forEach(function (b) { q[b] = p0[b]; }); q[k] = clamp(p0[k] + step * s, 0, 100); var r2 = clRank(q); if (r2[0].key === nx.key) { if (!best || s < best[1]) best = [k, s, q[k]]; break; } } });
      why += para('<b>What would flip it:</b> your runner-up is ' + esc(nx.emoji + ' ' + nx.name) + ' (' + nx.match + '%).' + (best ? ' If your ' + nm(best[0]) + ' moved from ' + R(p0[best[0]]) + ' to about ' + R(best[2]) + ', you\u2019d land there instead.' : ''));
    } else { var far = BF.map(function (k, i) { return [k, tgt.prof[i] - p0[k]]; }).sort(function (a, b) { return Math.abs(b[1]) - Math.abs(a[1]); })[0];
      why += para('<b>Biggest gap:</b> ' + esc(tgt.name) + ' sit around ' + R(p0[far[0]] + far[1]) + ' on ' + nm(far[0]) + '; you\u2019re at ' + R(p0[far[0]]) + '.'); }
    if (isMine) why += confLine(cl.self ? (cl.inferred && cl.inferred.conf) : cl.conf);
    return { kicker: isMine ? 'Your cluster' : 'Cluster', title: tgt.emoji + ' ' + tgt.name + ' \u00b7 ' + tgt.match + '%', mean: mean, why: why, sys: isMine ? 'cluster' : '', x: cl };
  };
  M.socionics = function () {
    var T = CTX.T; if (!T) return null; var so = T.socionics, f = T.four;
    var mean = para('Socionics is a type system from 1970s Lithuania (Au\u0161ra Augustinavi\u010di\u016bt\u0117), built on Carl Jung\u2019s types. It has 16 types with 3-letter names like ILE or LII, groups them into 4 <b>quadras</b> (shared values), and is mostly about how types get along, e.g. your <b>dual</b>.') +
      para('It\u2019s popular online but <b>debated</b> and not backed by mainstream research. <b>' + esc(so.code + ' (' + so.letters + ') \u00b7 ' + so.name) + '</b>, quadra ' + esc(so.quadra) + ': ' + esc(so.quadraText) + '.');
    var why = selfLine(so) + para('Mindprint doesn\u2019t ask separate Socionics questions. It matches from your 4-letter type: <b>' + esc(f.code) + '</b> \u2192 ' + esc(so.letters) + (f.code[0] === 'I' ? ' (introverts swap the last letter, the common rule)' : '') + ' \u2192 <b>' + esc(so.code) + '</b>. Your dual is ' + esc(so.dual + ' (' + so.dualLetters + '), ' + so.dualName) + '.');
    var pq = useP(so), sc4 = PAIRS.map(function (x) { var v = pq[x[2]]; return (v >= 50 ? x[0] : x[1]) + ' ' + R(v); }).join(' \u00b7 ');
    why += para((so.self ? 'Your answers alone gave ' + esc(fourLetters(pq)) + ' (' + esc(sc4) + ').' : 'So it rests on the same scores as your 4-letter type: ' + esc(sc4) + '.') + ' If one of those letters flips, this flips too.') + confLine(so.self ? (so.inferred && so.inferred.conf) : so.conf);
    return { kicker: 'Socionics-style type', title: so.code + ' \u00b7 ' + so.name, mean: mean, why: why, sys: 'socionics', x: so };
  };
  function enDrivers(n) { var e = (TY().EN || [])[n - 1]; return e ? fnKeys(e[3]) : []; }
  M.ennea = function (n) {
    var T = CTX.T; if (!T) return null; var en = T.ennea, t = n ? +n : en.type, e = (TY().EN || [])[t - 1]; if (!e) return null; var mineT = t === en.type;
    var rk = en.ranked, me = rk.filter(function (x) { return x.n === t; })[0], pos = rk.indexOf(me) + 1, keys = enDrivers(t);
    var mean = para('The Enneagram sorts people into <b>9 types</b>, each built around a core motivation (what you want most and fear most). The number is your type; the <b>wing</b> (like 5w4) is the neighbouring type that colours it.') +
      para('<b>Type ' + t + ', ' + esc(e[1]) + '</b>: ' + esc(e[2]) + ' Mindprint isn\u2019t a licensed Enneagram test; it estimates each type from traits that fit it.');
    var why = mineT ? selfLine(en) : '';
    why += para('Type ' + t + '\u2019s fit is the average of these scores of yours' + (T.used && T.used.addonPer && T.used.addonPer.ennea ? ', blended with your extra Enneagram answers' : '') + ':') + '<ul class="xs-dl">' + drvList(keys) + '</ul>';
    why += para('Fit <b>' + me.score + '/100</b>, ' + (pos === 1 ? 'your top of 9' : 'number ' + pos + ' of 9 (your top is Type ' + rk[0].n + ' at ' + rk[0].score + ')') + '.');
    if (mineT && pos === 1) why += para('<b>Wing ' + en.wing + '</b> (' + esc(en.wingName) + '): of your two neighbours, ' + ((t + 7) % 9 + 1) + ' and ' + (t % 9 + 1) + ', it scored higher.');
    why += quotes(keys.map(function (k) { return [k, 0.25]; }).concat([['e' + t, 1]]), 3);
    if (pos === 1) why += para('<b>What would flip it:</b> Type ' + rk[1].n + ' (' + esc(rk[1].name) + ') is ' + (rk[0].score - rk[1].score) + ' point' + (rk[0].score - rk[1].score === 1 ? '' : 's') + ' behind. A few answers leaning toward its traits (' + esc(list(enDrivers(rk[1].n).slice(0, 3).map(function (k) { return (k.charAt(0) === '-' ? 'low ' : '') + nm(kk(k)).toLowerCase(); }))) + ') would swap them.');
    if (mineT) why += confLine(en.self ? (en.inferred && en.inferred.conf) : en.conf);
    return { kicker: 'Enneagram-style type', title: (mineT ? en.code : 'Type ' + t) + ' \u00b7 ' + e[1], mean: mean, why: why, sys: mineT ? 'ennea' : '', x: en };
  };
  M.temper = function () {
    var T = CTX.T; if (!T) return null; var tp = T.temper, p = useP(tp), e = R(p.E), n = R(p.N);
    var mean = para('The four temperaments are about 2,400 years old (Hippocrates and Galen, who blamed body fluids). Psychologist Hans Eysenck later mapped them onto two real traits: <b>extraversion</b> and <b>emotional sensitivity</b>.') +
      para('Sanguine = outgoing + calm, Choleric = outgoing + intense, Melancholic = reserved + sensitive, Phlegmatic = reserved + calm. <b>' + esc(tp.name) + '</b>: ' + esc(tp.text));
    var why = selfLine(tp) + nudgeNote(['E', 'N']) + '<div class="xs-rows">' + row(nm('E'), e + '/100', e >= 50 ? 'outgoing side' : 'reserved side') + row(nm('N'), n + '/100', n >= 50 ? 'intense side' : 'calm side') + '</div>' +
      para('That puts you nearest the <b>' + esc(T.temper.ranked ? tp.ranked[0].name : tp.name) + '</b> corner: ' + esc(tp.ranked.map(function (x) { return x.share + '% ' + x.name.toLowerCase(); }).join(', ')) + '.');
    why += quotes([[(e >= 50 ? '' : '-') + 'E', 1], [(n >= 50 ? '' : '-') + 'N', 1]], 3);
    var ce = Math.abs(e - 50) < Math.abs(n - 50); why += flipLine(ce ? 'E' : 'N', ce ? (e >= 50 ? 'the reserved side' : 'the outgoing side') : (n >= 50 ? 'the calm side' : 'the intense side')) + deepLine(['E', 'N']) + confLine(tp.self ? (tp.inferred && tp.inferred.conf) : tp.conf);
    return { kicker: 'Classic temperament', title: tp.emoji + ' ' + tp.name, mean: mean, why: why, sys: 'temper', x: tp };
  };
  M.arche = function (key) {
    var T = CTX.T; if (!T) return null; var ar = T.arche, k = key || ar.key, a = (TY().AR || []).filter(function (x) { return x[0] === k; })[0]; if (!a) return null;
    var me = ar.ranked.filter(function (x) { return x.key === k; })[0], pos = ar.ranked.indexOf(me) + 1, keys = fnKeys(a[4]), mine = k === ar.key;
    var mean = para('Archetypes are recurring characters in stories and myths. Carl Jung wrote about them; the popular set of <b>12</b> (Hero, Sage, Rebel, Explorer\u2026) comes from later writers and brand designers. They\u2019re a storytelling lens, not science.') + para('<b>' + esc(a[2] + ' ' + a[1]) + '</b>: ' + esc(a[3]));
    var why = (mine ? selfLine(ar) : '') + para('Its fit is the average of these scores of yours:') + '<ul class="xs-dl">' + drvList(keys) + '</ul>' + para('Fit <b>' + me.score + '/100</b>, ' + (pos === 1 ? 'your top of 12' : 'number ' + pos + ' of 12') + '. Runner-up: ' + esc(ar.ranked[pos === 1 ? 1 : 0].name) + ' (' + ar.ranked[pos === 1 ? 1 : 0].score + ').');
    why += quotes(keys.map(function (x) { return [x, 0.25]; }).concat([['ar_' + k, 1]]), 3);
    if (mine) why += confLine(ar.self ? (ar.inferred && ar.inferred.conf) : ar.conf);
    return { kicker: 'Archetype \u00b7 Jungian-style', title: a[2] + ' ' + a[1], mean: mean, why: why, sys: mine ? 'arche' : '', x: ar };
  };
  var DISCK = { D: ['E_assertiveness', '-A', 'cf_competing', 'dm_risk'], I: ['E_sociability', 'E_excitement', 'E', 'dm_spontaneous'], S: ['A_cooperation', 'v_security', 'cf_accommodating', '-N'], C: ['C_order', 'dm_rational', 'C', 'dm_maximizer'] };
  M.disc = function () {
    var T = CTX.T; if (!T) return null; var di = T.disc, keys = DISCK[di.key];
    var mean = para('DISC comes from psychologist William Marston (1928). It sorts work style into <b>D</b>ominance, <b>I</b>nfluence, <b>S</b>teadiness and <b>C</b>onscientiousness (careful). The colours (red, yellow, green, blue) are a common shorthand.') + para('<b>' + esc(di.name + ' \u00b7 ' + di.color) + '</b>: ' + esc(di.text) + ' Not the official DISC assessment.');
    var why = selfLine(di) + para('Your ' + di.key + ' score averages:') + '<ul class="xs-dl">' + drvList(keys) + '</ul>' + para('Your split: ' + esc(di.shares.map(function (x) { return x.key + ' ' + x.share + '%'; }).join(' \u00b7 ')) + '.' + (di.code.length > 1 ? ' D/I/S/C top two are close, so you\u2019re a blend (' + esc(di.code) + ').' : ''));
    why += quotes(keys.map(function (x) { return [x, 0.25]; }).concat([['ds_' + di.key, 1]]), 3);
    why += para('<b>What would flip it:</b> your backup is ' + esc(di.second.name + ' (' + di.second.color + ')') + '. Answers leaning toward ' + esc(list(DISCK[di.second.key].slice(0, 3).map(function (k) { return (k.charAt(0) === '-' ? 'low ' : '') + nm(kk(k)).toLowerCase(); }))) + ' would move you there.') + confLine(di.self ? (di.inferred && di.inferred.conf) : di.conf);
    return { kicker: 'DISC-style work style', title: di.name + ' \u00b7 ' + di.color, mean: mean, why: why, sys: 'disc', x: di };
  };
  M.attach = function () {
    var T = CTX.T; if (!T) return null; var at = T.attach, p = useP(at), a = R(p.att_anxiety), v = R(p.att_avoidance);
    var mean = para('Attachment theory (John Bowlby, Mary Ainsworth) is about how we handle closeness. Adult research measures two scales: <b>anxiety</b> (worrying people will leave or not care) and <b>avoidance</b> (keeping people at a distance).') +
      para('Low on both = <b>Secure</b>; high anxiety = <b>Anxious</b>; high avoidance = <b>Avoidant</b>; high on both = <b>Fearful-avoidant</b>. Styles can shift over time and with different people.');
    var why = selfLine(at) + nudgeNote(['att_anxiety', 'att_avoidance']) + '<div class="xs-rows">' + row('Attachment anxiety', a + '/100', a >= 50 ? 'higher' : 'lower') + row('Attachment avoidance', v + '/100', v >= 50 ? 'higher' : 'lower') + '</div>' + para('That combination is <b>' + esc(at.name) + '</b>.');
    why += quotes([[(a >= 50 ? '' : '-') + 'att_anxiety', 1], [(v >= 50 ? '' : '-') + 'att_avoidance', 1]], 3);
    var ca = Math.abs(a - 50) < Math.abs(v - 50); why += flipLine(ca ? 'att_anxiety' : 'att_avoidance', (ca ? (a >= 50 ? 'lower' : 'higher') + ' anxiety' : (v >= 50 ? 'lower' : 'higher') + ' avoidance')) + deepLine(['att_anxiety']) + confLine(at.self ? (at.inferred && at.inferred.conf) : at.conf);
    return { kicker: 'Attachment style', title: at.emoji + ' ' + at.name, mean: mean, why: why, sys: 'attach', x: at };
  };
  M.cognitive = function () {
    var T = CTX.T; if (!T) return null; var cg = T.cognitive;
    var mean = para('Decision style is based on a research model of five habits (Scott & Bruce, 1995): <b>rational</b> (reason it out), <b>intuitive</b> (gut), <b>dependent</b> (talk it through), <b>spontaneous</b> (decide fast) and <b>avoidant</b> (put it off). Most people use a mix.') + para('<b>' + esc(cg.name) + '</b>: ' + esc(cg.text));
    var why = selfLine(cg) + '<div class="xs-rows">' + cg.ranked.map(function (x) { return row(x.emoji + ' ' + x.name, x.score + '/100'); }).join('') + '</div>' + para('Your top habit wins' + (cg.ranked[1] ? ' (' + (cg.ranked[0].score - cg.ranked[1].score) + ' points ahead of ' + esc(cg.ranked[1].name) + ')' : '') + '.');
    why += quotes([['dm_' + cg.key, 1], ['cg_' + cg.key, 1]], 3) + confLine(cg.self ? (cg.inferred && cg.inferred.conf) : cg.conf);
    return { kicker: 'Decision / thinking style', title: cg.emoji + ' ' + cg.name, mean: mean, why: why, sys: 'cognitive', x: cg };
  };
  M.thinking = function () {
    var T = CTX.T; if (!T || !T.thinking) return null; var th = T.thinking;
    var mean = para('Cognitive style is <i>how</i> you tend to take in and organise information. Psychologists have studied a few versions: <b>wholist vs analytic</b> (see the whole shape first, or the parts first) and <b>verbal vs imager</b> (think in words or in pictures), from Riding\u2019s cognitive-style model, and <b>field dependence</b> (go by the context around you, or your own read), from Witkin.') +
      '<div class="xs-warn"><b>For fun:</b> Mindprint\u2019s version is a rough estimate from your answers, not a validated cognitive-style test, and no style is better than another.</div>' + para('<b>' + esc(th.name) + '</b>: ' + esc(th.text));
    var n = (T.used && T.used.addonPer && T.used.addonPer.thinking) || 0;
    var why = '<div class="xs-rows">' + row('Big-picture (vs step-by-step)', th.whole + '/100') + row('Pictures (vs words)', th.visual + '/100') + row('Independent (vs context-led)', th.field + '/100', th.fieldName) + '</div>' +
      para(n ? 'Built from your main quiz plus <b>' + n + '</b> thinking-style answer' + (n > 1 ? 's' : '') + '. Above 50 on the first two picks the second half of your name.' : 'Right now this is a <b>rough guess</b> from your main quiz (imagination, gut vs reasoning, how much you like order, how social you are). Take the 6 quick questions to make it yours.') +
      quotes([[(th.whole >= 50 ? '' : '-') + 'ts_whole', 1], [(th.visual >= 50 ? '' : '-') + 'ts_visual', 1], [(th.field >= 50 ? '' : '-') + 'ts_field', 1]], 3) + confLine(th.conf);
    return { kicker: 'Thinking style \u00b7 for fun', title: th.emoji + ' ' + th.name, mean: mean, why: why, sys: 'thinking', x: th };
  };
  M.team = function () {
    var T = CTX.T; if (!T || !T.team) return null; var tm = T.team, L = T.lenses || {};
    var mean = para('A team role is the part you naturally play in a group: leading, coming up with ideas, organising, keeping the peace, hyping, researching, critiquing or supporting. It\u2019s the \u201cpersona\u201d or \u201cniche\u201d you fill. These are Mindprint\u2019s own names, not the Belbin Team Roles test.') + para('<b>' + esc(tm.name) + '</b>: ' + esc(tm.text));
    var n = (T.used && T.used.addonPer && T.used.addonPer.team) || 0;
    var why = '<div class="xs-rows">' + tm.ranked.map(function (x) { return row(x.emoji + ' ' + x.name, x.score + '/100'); }).join('') + '</div>' +
      para('Each role averages a few of your trait scores' + (n ? ', blended with your <b>' + n + '</b> team-role answer' + (n > 1 ? 's' : '') : '') + '. Your top one wins (' + (tm.ranked[0].score - tm.ranked[1].score) + ' points ahead of ' + esc(tm.ranked[1].name) + ').') +
      (L.niche ? para('Where you\u2019d fit best: ' + esc(L.niche.join(', ')) + '.') : '') + quotes([['tr_' + tm.key, 1]], 3) + confLine(tm.conf);
    return { kicker: 'Team role \u00b7 persona \u00b7 niche', title: tm.emoji + ' ' + tm.name, mean: mean, why: why, sys: 'team', x: tm };
  };
  var LSK = { visual: ['O_fantasy', 'O'], reading: ['O_ideas', '-E_sociability', 'dm_rational'], hands: ['E_excitement', '-O_ideas', 'cope_tackle'], social: ['E_sociability', 'dm_dependent', 'cope_support'] };
  M.learning = function () {
    var T = CTX.T; if (!T) return null; var ls = T.learning, keys = LSK[ls.key] || [];
    var mean = para('A learning-style preference is how you <i>like</i> to take things in: visual, reading, hands-on or social.') + '<div class="xs-warn"><b>Heads up:</b> learning styles are popular, but research hasn\u2019t shown that studying in your \u201cstyle\u201d makes you learn more. Treat this as a preference, not a rule.</div>' + para('<b>' + esc(ls.name) + '</b>: ' + esc(ls.text));
    var why = selfLine(ls) + para('Its score averages these scores of yours:') + '<ul class="xs-dl">' + drvList(keys) + '</ul>' + '<div class="xs-rows">' + ls.ranked.map(function (x) { return row(x.emoji + ' ' + x.name, x.score + '/100'); }).join('') + '</div>';
    why += quotes(keys.map(function (x) { return [x, 1 / keys.length]; }).concat([['ls_' + ls.key, 1]]), 3) + confLine(ls.self ? (ls.inferred && ls.inferred.conf) : ls.conf);
    return { kicker: 'Learning style preference \u00b7 not research-backed', title: ls.emoji + ' ' + ls.name, mean: mean, why: why, sys: 'learning', x: ls };
  };
  var SLW = { E: ['S', 'R', 'Social', 'Reserved'], N: ['L', 'C', 'Limbic', 'Calm'], C: ['O', 'U', 'Organized', 'Unstructured'], A: ['A', 'E', 'Accommodating', 'Egocentric'], O: ['I', 'N', 'Inquisitive', 'Non-curious'] };
  M.sloan = function () {
    var T = CTX.T; if (!T) return null; var sl = T.sloan;
    var mean = para('SLOAN is a 5-letter shorthand for your Big Five, one letter per trait: <b>S</b>ocial/<b>R</b>eserved (Extraversion), <b>L</b>imbic/<b>C</b>alm (emotional sensitivity), <b>O</b>rganized/<b>U</b>nstructured (Conscientiousness), <b>A</b>ccommodating/<b>E</b>gocentric (Agreeableness), <b>I</b>nquisitive/<b>N</b>on-curious (Openness).') + para('A capital letter means you\u2019re clearly on that side; lowercase means you\u2019re leaning (41\u201359). \u201cEgocentric\u201d here just means you put your own view first, not that you\u2019re selfish.');
    var why = '<div class="xs-rows">' + sl.parts.map(function (x) { return row(nm(x.trait) + ' ' + x.score, (x.soft ? x.letter.toLowerCase() : x.letter) + ' ' + x.word.replace(/ \(.*\)$/, ''), x.soft ? 'leaning' : 'clear'); }).join('') + '</div>';
    var w = sl.parts.slice().sort(function (a, b) { return Math.abs(a.score - 50) - Math.abs(b.score - 50); })[0];
    why += quotes(sl.parts.map(function (x) { return [(x.score >= 50 ? '' : '-') + x.trait, 1]; }), 3) + flipLine(w.trait, (w.score >= 50 ? SLW[w.trait][1] : SLW[w.trait][0]) + ' on ' + nm(w.trait)) + confLine(sl.conf);
    return { kicker: 'Big Five code \u00b7 SLOAN-style', title: sl.code, mean: mean, why: why, sys: 'sloan', x: sl };
  };
  var BIGM = { O: 'how drawn you are to new ideas, art, big questions and new experiences', C: 'how organized, disciplined and driven you are', E: 'how much energy you get from people, speaking up and excitement', A: 'how warm, trusting and cooperative you are', N: 'how strongly you feel stress, worry and frustration (psychologists call it Neuroticism; it\u2019s not an insult)' };
  M.scale = function (k) {
    var p = CTX.full ? P() : P0(); CURP = p; if (typeof p[k] !== 'number') return null; var v = R(p[k]), sc = CTX.Q && CTX.Q.scales && CTX.Q.scales[k], big = !!BIGM[k];
    var mean = para('<b>' + esc(nm(k)) + '</b>' + (big ? ', one of the Big Five traits (the most-studied model of personality): ' + esc(BIGM[k]) + '.' : (sc && sc.desc ? ': ' + esc(sc.desc) + '.' : '.')) + (sc && sc.framework && !big ? ' Part of: ' + esc(sc.framework) + '.' : '')) +
      para('It\u2019s a 0\u2013100 scale: where your answers fall between the lowest and highest score those questions allow. 50 is the middle, not \u201caverage people\u201d.');
    var n = nAns(k), why = nudgeNote([k]) + para('You scored <b>' + v + '/100</b>' + (n ? ' from ' + n + ' answer' + (n > 1 ? 's' : '') : '') + ' (' + (v >= 80 ? 'very high' : v >= 60 ? 'high' : v >= 41 ? 'middle' : v >= 21 ? 'low' : 'very low') + ').' + (n && n < 4 ? ' Only a few questions touch this, so treat it as a lean.' : ''));
    if (CTX.full) { why += quotes([[k, 1]], 2, null, 'Answers that pushed it up') + quotesAgainst(k); }
    else why += quotes([[(v >= 50 ? '' : '-') + k, 1]], 3);
    return { kicker: big ? 'Big Five trait' : 'Trait scale', title: nm(k) + ' \u00b7 ' + v, mean: mean, why: why, sys: '', x: null };
  };
  function quotesAgainst(k) { var g = topFor([[k, 1]], 2, true); return g.length ? '<p class="xs-lbl">Answers that pulled it down</p><ul class="xs-ql">' + g.map(function (x) { return quote(x); }).join('') + '</ul>' : ''; }
  M.tier = function (k) { var r = M.scale(k); if (!r) return null; var v = R(P()[k]), t = v >= 85 ? 'S' : v >= 70 ? 'A' : v >= 55 ? 'B' : v >= 40 ? 'C' : 'D';
    r.kicker = 'Trait tier list'; r.title = t + ' tier \u00b7 ' + nm(k) + ' ' + v; r.mean = para('A tier list ranks things S (top) to D. Here it ranks how <b>strongly</b> each trait shows in your answers, not how good it is: S = 85+, A = 70+, B = 55+, C = 40+, D = under 40.') + r.mean; return r; };
  M.tag = function (tg) {
    var TG = TY().TG || {}, hit = null; for (var k in TG) { if (TG[k][0] === tg) hit = [k, 1]; else if (TG[k][1] === tg) hit = hit || [k, -1]; } if (!hit) return null;
    var v = R(P()[hit[0]]);
    var mean = para('Tags are short labels, like hashtags. Mindprint gives you one for each trait that sits at least 18 points from the middle (up to 8), so they show your most extreme sides.') + para('<b>#' + esc(tg) + '</b> comes from ' + (hit[1] > 0 ? 'a high' : 'a low') + ' <b>' + esc(nm(hit[0])) + '</b> score.');
    var why = para('Your ' + esc(nm(hit[0])) + ' is <b>' + v + '/100</b>, ' + Math.abs(v - 50) + ' points ' + (v >= 50 ? 'above' : 'below') + ' the middle.') + quotes([[(hit[1] > 0 ? '' : '-') + hit[0], 1]], 3) + (function () { var n = flipN(hit[0], hit[1] > 0 ? 68 : 32); return n ? para('<b>What would drop it:</b> about ' + n + ' answer' + (n > 1 ? 's' : '') + ' going the other way would bring ' + esc(nm(hit[0])) + ' back within 18 points of the middle, and the tag would go.') : ''; })();
    return { kicker: 'Tag', title: '#' + tg, mean: mean, why: why };
  };
  M.conf = function (sys) { var r = M[sys] && M[sys](); if (!r) return null; var x = r.x || {}, c = x.self ? (x.inferred && x.inferred.conf) : x.conf; if (!c) return r;
    r.kicker = 'Confidence \u00b7 ' + r.kicker; r.title = c.word.charAt(0).toUpperCase() + c.word.slice(1) + ' confidence \u00b7 ' + c.pct + '%';
    r.mean = para('Confidence shows how clearly your answers point to one result and how many answers back it up. High (75+) = clear lead; medium (50\u201374) = a lean; low = close call or few answers.') + para('It\u2019s <b>not</b> a measure of accuracy and not a statistic about other people. Sharpen it (a few extra questions) or retake the part to raise it.') + r.mean;
    return r; };
  M.self = function (sys) { var r = M[sys] && M[sys](); if (!r) return null; r.kicker = 'Self-identified \u00b7 ' + r.kicker; r.mean = para('<b>Self-identified</b> means you picked this yourself with \u201cNot me? Pick my real type\u201d. Your pick is what shows; what your answers said is kept underneath.') + r.mean; return r; };
  var TGROUP = { NT: 'N + T', NF: 'N + F', SJ: 'S + J', SP: 'S + P' };
  M.family = function () { var T = CTX.T, f = CTX.four || (T && T.four); if (!f) return null; var g = f.groupCode || (f.code[1] === 'N' ? (f.code[2] === 'T' ? 'NT' : 'NF') : (f.code[3] === 'J' ? 'SJ' : 'SP'));
    var mean = para('The 16 four-letter types are often grouped into 4 families: <b>Thinkers</b> (NT), <b>Idealists</b> (NF), <b>Keepers</b> (SJ) and <b>Makers</b> (SP), an idea from David Keirsey. It\u2019s the widest level of your tree.');
    var why = para('Your type is <b>' + esc(f.code) + '</b>, so its ' + TGROUP[g] + ' letters put you with the <b>' + esc(f.group) + '</b>' + (f.groupText ? ' (' + esc(f.groupText) + ')' : '') + '.') + (M.four() ? M.four().why : '');
    return { kicker: 'Hierarchy \u00b7 family', title: f.group, mean: mean, why: why, sys: 'four', x: f }; };
  M.subtype = function () { var T = CTX.T; if (!T) return null; var n = R(P().N);
    var r = { kicker: 'Hierarchy \u00b7 subtype', title: (n >= 50 ? 'Sensitive' : 'Steady') + ' \u00b7 ' + T.ennea.code, sys: '', x: null };
    r.mean = para('The narrowest level of your tree: your 4-letter type split by emotional sensitivity (sensitive or steady), plus your Enneagram-style code as the variant.');
    r.why = para('Your emotional sensitivity is <b>' + n + '/100</b>, so you\u2019re the <b>' + (n >= 50 ? 'sensitive' : 'steady') + '</b> variant. Your Enneagram-style code is <b>' + esc(T.ennea.code) + '</b>.') + quotes([[(n >= 50 ? '' : '-') + 'N', 1]], 2) + flipLine('N', n >= 50 ? 'steady' : 'sensitive'); return r; };
  M.hl = function (k) { var r = M.scale(k); if (!r) return null; var v = R(P()[k]); r.kicker = 'Headline'; r.mean = para('Headlines are your standout traits: the scores furthest from the middle (at least 12 points away). The biggest one becomes your title.') + r.mean; return r; };

  /* ---------- lenses ---------- */
  function L() { return CTX.T && CTX.T.lenses; }
  var LZ = {
    map: function (l, p) { return { t: 'Where you sit \u00b7 ' + l.map.quadrant, m: 'A coordinate space puts you as a point on axes. Across is <b>Plasticity</b> (outgoing + curious), up is <b>Stability</b> (warm + organized + calm). These two \u201chigher-order factors\u201d of the Big Five are a published idea that\u2019s still debated.', w: 'Across = (Extraversion ' + R(p.E) + ' + Openness ' + R(p.O) + ') \u00f7 2 = <b>' + l.map.x + '</b>. Up = (Agreeableness ' + R(p.A) + ' + Conscientiousness ' + R(p.C) + ' + calm ' + R(100 - p.N) + ') \u00f7 3 = <b>' + l.map.y + '</b>. That\u2019s the <b>' + esc(l.map.quadrant) + '</b> quadrant: ' + esc(l.map.quadrantText) + '. The coloured dots are the 8 cluster profiles.', d: [[(l.map.x >= 50 ? '' : '-') + 'E', 1], [(l.map.x >= 50 ? '' : '-') + 'O', 1], [(l.map.y >= 50 ? '-' : '') + 'N', 1]] }; },
    vector: function (l) { return { t: 'Your vector', m: 'A vector is a list of numbers that places something in a space. Your Big Five scores are one point in a 5-dimensional space, and every cluster match is a distance from that point.', w: 'Your vector is (' + l.map.vector.map(function (v) { return v.key + ' ' + v.v; }).join(', ') + '), straight from your five trait scores.' }; },
    bins: function (l) { return { t: 'Bins and cells', m: 'Binning (or bucketing) drops a continuous number into a few ranges, like grades. Mindprint uses 5: Very low 0\u201320, Low 21\u201340, Middle 41\u201359, High 60\u201379, Very high 80\u2013100.', w: l.bins.map(function (b) { return esc(nm(b.key)) + ' ' + b.v + ' \u2192 ' + b.name; }).join('<br>') }; },
    shape: function (l, p) { var bf = ['O', 'C', 'E', 'A', 'N'].map(function (k) { return R(p[k]); }); return { t: 'Profile shape \u00b7 ' + l.shape[0], m: 'A morphotype is a type based on shape. Here it\u2019s the shape of your five scores: Flat (close together), Rolling (a few stand out) or Spiky (big peaks and dips).', w: 'Your five scores are ' + bf.join(', ') + ' (range ' + (Math.max.apply(null, bf) - Math.min.apply(null, bf)) + ' points), so your shape is <b>' + esc(l.shape[0]) + '</b>: ' + esc(l.shape[1]) + '.' }; },
    mixture: function (l) { return { t: 'Soft membership', m: 'A mixture model (or latent class model) says you\u2019re partly in several groups instead of one box. Mindprint does this over its 8 hand-made profiles, not a model fitted to real people.', w: 'Closer profiles get a bigger share of you: ' + l.mixture.slice(0, 3).map(function (c) { return esc(c.emoji + ' ' + c.name) + ' ' + c.pct + '%'; }).join(', ') + '. The shares come from the distance between your Big Five vector and each profile.' }; },
    sets: function (l) { return { t: 'Your sets', m: 'A set is a group of things that share a property. Partitions split everyone into non-overlapping parts (like the 16 types); an equivalence class is everyone who matches you on the same labels.', w: 'You\u2019re in all of these at once: ' + esc(l.sets.join(', ')) + '. Your equivalence class is <b>' + esc(l.equiv) + '</b>. Tap any chip to see why you\u2019re in it.' }; },
    tribe: function (l, p, T) { return { t: 'Tribe, guild and school', m: 'Affinity groups for fun: a tribe from your 4-letter family, a guild from your DISC-style work style, a school from your top value. Made-up names, real inputs.', w: 'Tribe <b>' + esc(l.tribe.name) + '</b> from your ' + esc(T.four.code) + ' type. Guild <b>' + esc(l.guild.name) + '</b> from your ' + esc(T.disc.name) + ' work style. School <b>' + esc(l.school.name) + '</b> because your top value is ' + esc(nm(l.priorities[0])) + ' (' + R(p[l.priorities[0]]) + ').', d: [[l.priorities[0], 1]] }; },
    roles: function (l, p) { var R0 = (TY().ROLES || []).filter(function (r) { return r[0] === l.roles[0].name; })[0]; return { t: 'Your role and niche', m: 'A role (or function class) is the job you naturally take in a group. A niche is the setting where you\u2019d do best. Both are guesses from your traits, for fun.', w: 'Top role <b>' + esc(l.roles[0].name) + '</b> (' + l.roles[0].s + '/100) averages: ' + (R0 ? R0[2].map(function (k) { return esc(nm(kk(k))) + ' ' + sv(kk(k)) + (k.charAt(0) === '-' ? ' (reversed)' : ''); }).join(', ') : '') + '. Niche: Extraversion ' + R(p.E) + ', Conscientiousness ' + R(p.C) + ', Openness ' + R(p.O) + ' \u2192 ' + esc(l.niche.join(', ')) + '.', d: R0 ? R0[2].map(function (k) { return [k, 1 / 3]; }) : null }; },
    values: function (l, p) { return { t: 'Values profile', m: 'A psychographic profile describes what someone values and cares about. Mindprint\u2019s values come from a model by psychologist Shalom Schwartz.', w: 'Your top values: ' + l.priorities.map(function (k, i) { return (i + 1) + '. ' + esc(nm(k)) + ' ' + R(p[k]); }).join(', ') + '.', d: [[l.priorities[0], 1]] }; },
    taxon: function (l, p) { return { t: 'Your personality taxonomy', m: 'A taxonomy is a ranked tree, like Kingdom \u2192 Phylum \u2192 Class \u2192 Order \u2192 Family \u2192 Genus \u2192 Species in biology. This one is fake Latin with real logic: each rank narrows the one above.', w: 'Kingdom from Extraversion (' + R(p.E) + '), Phylum from emotional sensitivity (' + R(p.N) + '), Class from your type family, Order from your temperament, Family from your cluster, Genus from your 4-letter type, Species from your strongest tag.', d: [[(p.E >= 50 ? '' : '-') + 'E', 1], [(p.N >= 50 ? '' : '-') + 'N', 1]] }; },
    tree: function (l, p, T) { return { t: 'Cluster family tree', m: 'A dendrogram is a tree that joins the most similar things first. A clade is one branch with everything that came from it; a lineage is the path from the root to you.', w: 'The 8 profiles are joined by how alike they are (worked out from the profiles themselves). Your lineage runs to <b>' + esc(T.cluster.name) + '</b>, your nearest profile.' }; },
    super: function (l, p, T) { return { t: 'Supertype and subtype', m: 'A supertype is the broader group a type belongs to; a subtype or variant narrows it.', w: 'Supertype <b>' + esc(l.supertype) + '</b> (your type family) \u2192 type <b>' + esc(T.four.code) + '</b> \u2192 subtype <b>' + esc(l.subtype) + '</b> (emotional sensitivity ' + R(p.N) + ') \u2192 variant <b>' + esc(T.ennea.code) + '</b>.' }; },
    graph: function (l) { return { t: 'Trait graph', m: 'A network or graph is dots (nodes) joined by lines (edges). Here the left nodes are your five traits and the right ones are results; a line means that trait feeds that result.', w: 'Thicker lines = that trait is further from the middle for you, so it pulls harder: ' + l.graph.traits.slice().sort(function (a, b) { return Math.abs(b.v - 50) - Math.abs(a.v - 50); }).map(function (t) { return t.key + ' ' + t.v; }).join(', ') + '. Tap a node for more.' }; },
    kg: function (l) { return { t: 'You as a knowledge graph', m: 'A knowledge graph (or semantic network) stores facts as subject \u2192 relation \u2192 object triples. An ontology is the set of entity types and relations allowed.', w: 'Each triple is one of your own results: ' + esc(l.triples.slice(0, 3).map(function (x) { return x.join(' '); }).join('; ')) + '\u2026' }; },
    socrel: function (l, p, T) { return { t: 'Your Socionics relation', m: 'Socionics is built on relations between types. Your dual is the type it says completes you. Debated and not proven by research.', w: 'Your Socionics-style type is ' + esc(T.socionics.code) + ' (from ' + esc(T.four.code) + '), whose dual is <b>' + esc(T.socionics.dual) + '</b>, ' + esc(T.socionics.dualName) + '.' }; },
    tiers: function (l) { var top = []; ['S', 'A'].forEach(function (k) { l.tiers[k].forEach(function (x) { top.push(k + ': ' + nm(x.key) + ' ' + x.v); }); }); return { t: 'Your trait tier list', m: 'A tier list ranks things S (top) to D. Here it ranks how strongly each trait shows, not how good it is: S = 85+, A = 70+, B = 55+, C = 40+, D = under 40.', w: top.length ? 'Your top tiers: ' + esc(top.slice(0, 5).join(', ')) + '. Tap any chip to see the answers behind it.' : 'None of your traits reached A tier (70+), so your profile is fairly balanced.' }; },
    prio: function (l, p) { return { t: 'Your priorities', m: 'A priority class is an ordered rank. These are your top values in order.', w: l.priorities.map(function (k, i) { return (i + 1) + '. ' + esc(nm(k)) + ' ' + R(p[k]); }).join(', ') + '.', d: [[l.priorities[0], 1]] }; },
    persona: function (l, p, T) { return { t: 'Persona \u00b7 ' + l.persona.name, m: 'A persona is a short character sketch, the way designers describe a typical user. Yours is stitched from your results.', w: 'Name from your top tag and your archetype (' + esc(T.arche.name) + '). <b>Wants</b> from your Enneagram-style type ' + T.ennea.type + ', <b>at work</b> from your DISC-style ' + esc(T.disc.name) + ', <b>with people</b> from your attachment style and Extraversion ' + R(p.E) + ', <b>under stress</b> from emotional sensitivity ' + R(p.N) + '.', d: [[(p.N >= 50 ? '' : '-') + 'N', 1]] }; },
    facets: function (l) { return { t: 'Facets', m: 'Facets are filter labels, like size and colour on a shopping site. Each one is a single dimension of you.', w: esc(l.facets.map(function (x) { return x[0] + ': ' + x[1]; }).join(', ')) + '. The first five come from your Big Five scores (50+ or under 50); the rest from your attachment, DISC-style and decision results.' }; },
    thes: function (l) { return { t: 'Your tags, with synonyms', m: 'A controlled vocabulary is a fixed list of allowed labels; a thesaurus links each to its synonyms. Your phenotype is your observable traits.', w: (CTX.T.tags || []).length ? 'Your tags are ' + esc(CTX.T.tags.map(function (t) { return '#' + t; }).join(' ')) + ', from the traits furthest from the middle. Tap a tag to see its score.' : 'Your scores are close to the middle, so no tags stood out.' }; },
    genre: function (l, p, T) { return { t: 'Genre, style and modality', m: 'Genre, style and modality are ways of grouping by shared character. Just for fun.', w: 'Genre <b>' + esc(l.genre) + '</b> from your cluster (' + esc(T.cluster.name) + '). Communication <b>' + esc(l.comm) + '</b> from Agreeableness ' + R(p.A) + '. Social modality <b>' + esc(l.modality) + '</b> from Extraversion ' + R(p.E) + '.' }; },
    pattern: function (l) { return { t: 'Your pattern', m: 'A pattern (or configuration) is how the parts fit together. Here: your highest trait paired with your lowest.', w: esc(l.pattern.text) }; },
    code: function (l) { return { t: 'Your personality code', m: 'A coding scheme packs many labels into one string, like an index entry.', w: '<b>' + esc(l.code) + '</b> = 4-letter \u00b7 Enneagram-style \u00b7 temperament \u00b7 Big Five code \u00b7 Socionics-style \u00b7 DISC-style. Tap each one above to see why you got it.' }; },
    topics: function () { return { t: 'Topics from your Deep Dive', m: 'A topic cluster groups words that keep coming up. These are words that appeared more than once in your typed Deep Dive answers.', w: 'Counted straight from what you typed; nothing is scored from it.' }; },
    proto: function (l, p, T) { var w = T.four.letters.slice().sort(function (a, b) { return a.clarity - b.clarity; })[0]; return { t: 'How textbook are you? \u00b7 ' + l.prototype.name, m: 'Prototype theory says categories have a fuzzy centre and blurry edges: some members are textbook examples, others sit near the border.', w: 'Your 4-letter letters are on average <b>' + l.prototype.pct + '/100</b> from the middle, so you\u2019re a ' + esc(l.prototype.name.toLowerCase()) + '. Your weakest letter is ' + esc(w.letter) + ' (' + esc(w.from) + ' ' + R(w.score) + '), which is why your nearest neighbour type is ' + esc(l.prototype.neighbor) + '.' }; },
    stereo: function (l) { return { t: 'Stereotype check', m: 'A stereotype is an oversimplified claim about a group. Here each of your letters\u2019 stereotypes is checked against one of your actual scores.', w: esc(l.stereo.map(function (x) { return x.letter + ' (\u201c' + x.claim + '\u201d): ' + x.fits + ', score ' + x.v; }).join('; ')) + '.' }; },
    kind: function (l) { return { t: 'Are you a \u201ckind\u201d?', m: 'A natural kind is a category that exists in nature (like gold or tigers). Most research finds personality is spread out on scales, so types are useful boxes, not species. The type is the universal; you are the particular.', w: 'Your traits sit on average <b>' + l.boxiness + '/100</b> from the middle: ' + (l.boxiness >= 40 ? 'pretty boxable' : l.boxiness >= 20 ? 'somewhat boxable' : 'hard to box') + '.' }; },
    pred: function (l) { return { t: 'True statements about you', m: 'A predicate is a statement that\u2019s true or false of something. A predicate class is everything it\u2019s true for.', w: 'Each one checks a score of yours against 50: ' + esc(l.predicates.map(function (x) { return (x[1] ? '\u2713 ' : '\u2717 ') + x[0]; }).join(', ')) + '.' }; },
    state: function () { return { t: 'Today\u2019s state', m: 'A state is how you are right now; a type is how you usually are. State space, phase and regime are words for where a system sits at a moment. This part is optional and saved on this phone only.', w: 'It uses only today\u2019s sliders (energy, mood, stress), not your quiz answers.' }; }
  };
  M.lens = function (id) { var l = L(), T = CTX.T, f = LZ[id]; if (!l || !f) return null; var o = f(l, P(), T);
    return { kicker: 'Lens', title: o.t, mean: para(o.m), why: para(o.w) + (o.d ? quotes(o.d, 3) : ''), sys: '' }; };
  M.pred = function (i) { var l = L(); if (!l) return null; var x = l.predicates[+i]; if (!x) return null; var KEYS = ['O', 'C', 'E', 'A', 'N', 'A_trust', 'E_excitement', 'att_anxiety'], k = KEYS[+i], v = R(P()[k]);
    return { kicker: 'Predicate', title: (x[1] ? '\u2713 ' : '\u2717 ') + x[0], mean: para('A predicate is a statement that\u2019s true or false of you. This one is true when your <b>' + esc(nm(k)) + '</b> is 50 or more.'), why: para('Your ' + esc(nm(k)) + ' is <b>' + v + '/100</b>, so it\u2019s ' + (x[1] ? 'true' : 'false') + '.') + quotes([[(v >= 50 ? '' : '-') + k, 1]], 2) + flipLine(k, x[1] ? 'false' : 'true') }; };
  M.stereo = function (i) { var l = L(); if (!l) return null; var x = l.stereo[+i], S = (TY().STEREO || {})[x && x.letter]; if (!x || !S) return null; var k = S[1], v = R(P()[k]);
    return { kicker: 'Stereotype check', title: x.letter + ': \u201c' + x.claim + '\u201d', mean: para('A stereotype is an oversimplified claim about a group. ' + esc(x.letter) + ' types often get called \u201c' + esc(x.claim) + '\u201d. Mindprint checks it against your real score.'), why: para('Checked against your <b>' + esc(nm(k)) + '</b> (' + v + '/100' + (S[2] ? ', reversed' : '') + '): <b>' + esc(x.fits) + '</b>.') + quotes([[((x.v >= 50) === !S[2] ? '' : '-') + k, 1]], 2) }; };

  /* ---------- free / locked ---------- */
  var LOCKM = {
    types: ['More types', 'Enneagram-style type + wing (9 core motivations), classic temperament (4), archetype (12 story characters), DISC-style work colour and attachment style (how you handle closeness). Each with what it means and why you got it.'],
    traits: ['Traits', 'The Big Five: Openness, Conscientiousness, Extraversion, Agreeableness and emotional sensitivity, each 0\u2013100, plus 40+ smaller scales and your SLOAN-style code.'],
    clusters: ['Clusters', 'All 8 cluster profiles and how close you are to each, plus who you\u2019re most similar to.'],
    hier: ['Hierarchy', 'Your path down a personality tree: family \u2192 cluster \u2192 type \u2192 subtype.'],
    styles: ['Styles + tags', 'Your decision style, learning-style preference (not research-backed) and auto tags for your most extreme traits.'],
    think: ['Thinking style + team role', 'Your cognitive style on three sliders (big-picture vs step-by-step, words vs pictures, context-led vs independent) and your role in a group, each with an optional 6-question quiz. For fun, not validated tests.'],
    classified: ['Your Mindprint, classified', 'Your results run through the classification words: kingdom → phylum → class → order → family → genus → species, your quadrant, latent class, tier, phenotype, genotype, prototype and more. Made up for fun, built from your real results.'],
    map: ['Mindprint Map', 'An interactive map of how every system connects: 16 types, cognitive functions, Enneagram, Big Five, Socionics, Keirsey, DISC, attachment and more. Tap any dot or line for a deep explanation, with each link labelled by how solid it is, and your own results lit up as your web.'],
    sharpen: ['Sharpen', 'A few extra questions for any result, plus retakes with a different question set so you can correct a part.'],
    maps: ['Maps', 'Where you sit on a 2D personality map (the Big Five\u2019s higher-order axes), your 5D trait vector and score bins.'],
    groups: ['Groups', 'Soft membership across clusters (like a mixture model), your tribe, guild, school and group role.'],
    taxonomy: ['Taxonomy', 'A playful kingdom \u2192 species tree for you, and the family tree of the 8 cluster profiles.'],
    networks: ['Networks', 'A graph of which traits feed which result, and your results as a knowledge graph.'],
    tiers: ['Tiers', 'Your traits ranked S to D by how strongly they show (not how good they are).'],
    labels: ['Labels', 'Facets, a persona sketch, genre and your one-line personality code.'],
    lenses: ['30+ lenses on your answers', 'The same answers sorted 30+ ways: maps and coordinates, soft cluster membership, a personal taxonomy tree, a trait graph, a tier list, labels and tags, and a few philosophy ideas like prototypes and natural kinds.'],
    philo: ['Philosophy', 'Prototype (how textbook you are), stereotype check and whether personality types are \u201cnatural kinds\u201d.'],
    conflict: ['How you handle conflict', 'Five conflict styles (competing, collaborating, compromising, accommodating, avoiding) from the Thomas\u2013Kilmann model, ranked for you.'],
    attach: ['Your attachment style', 'Attachment anxiety and avoidance, two scales from adult attachment research, and the style they add up to.'],
    decide: ['What drives your decisions', 'Your decision habits (rational, intuitive, collaborative, quick-fire, wait-and-see), whether you chase the best option, and how you feel about risk.'],
    social: ['Your social battery', 'How much social time fills you up and when you need to recharge.'],
    stress: ['Under stress', 'Your first moves when things pile up, from six coping styles.'],
    values: ['What matters to you most', 'Your top values from Shalom Schwartz\u2019s values model, ranked.'],
    big5: ['Your Big Five breakdown', 'All five traits with every facet, 0\u2013100.']
  };
  M.lock = function (id) { var x = LOCKM[id]; if (!x) return null; return { kicker: 'Pro', title: x[0], mean: para(esc(x[1])) + para('<span class="muted">Everything is inferred from the answers you already gave, for fun.</span>'), why: '', locked: true }; };
  M.top = function () { return { kicker: 'Your top trait', title: 'Your top trait', mean: para('Your top trait is the score furthest from the middle across the 40+ traits Mindprint measures. The more extreme a score, the more it shows in how you act.'), why: '', locked: true }; };

  /* 1.1.7: the Mindprint Map (js/map.js) — every dot and line opens here */
  M.mapn = function (x) { return window.MPMap ? MPMap.nodeSheet(x) : null; };
  M.mape = function (x) { return window.MPMap ? MPMap.edgeSheet(x) : null; };
  M.mapfree = function () { if (!window.MPMap) return null; var r = MPMap.edgeSheet(MPMap.sampleEdge()); if (r) { r.kicker = 'Free peek \u00b7 ' + r.kicker; r.secs = r.secs.filter(function (s) { return s[0] !== 'The two ends' && s[0] !== 'In your web'; }); r.secs.push(['The rest of the map', '<p>' + MPMap.counts().nodes + ' dots and ' + MPMap.counts().edges + ' links like this one, each with its own deep explanation, plus your own results lit up as your web.</p><a class="btn block" href="#pro">Unlock the Map with Pro \u2014 $10</a>']); } return r; };

  /* which keys a free user gets in full */
  var FREEOK = { four: 1, letter: 1, cluster: 1, family: 1, lock: 1, top: 1, mapfree: 1 };

  /* ---------- the sheet ---------- */
  var bg, sh, inner, startY = null, dy = 0;
  function build() {
    if (sh) return; bg = document.createElement('div'); bg.className = 'xs-bg'; sh = document.createElement('div'); sh.className = 'xs'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-labelledby', 'xs-h');
    sh.innerHTML = '<div class="xs-grab" aria-hidden="true"><i></i></div><button class="xs-x" type="button" aria-label="Close">\u00d7</button><div class="xs-in"></div>'; inner = sh.querySelector('.xs-in');
    document.body.appendChild(bg); document.body.appendChild(sh);
    bg.addEventListener('click', function () { close(); });
    sh.querySelector('.xs-x').addEventListener('click', function () { close(); });
    sh.addEventListener('click', function (e) { var a = e.target.closest('a[href^="#"]'); if (a) { e.preventDefault(); var h = a.getAttribute('href'); close(function () { location.hash = h; }); return; } var x = e.target.closest('[data-x]'); if (x && x !== sh) { e.preventDefault(); show(x.getAttribute('data-x'), true); } });
    var g = sh.querySelector('.xs-grab');
    var ts = function (e) { if (e.target.closest('.xs-grab') || inner.scrollTop <= 0) { startY = e.touches[0].clientY; dy = 0; } else startY = null; };
    var tm = function (e) { if (startY == null) return; dy = e.touches[0].clientY - startY; if (dy > 0) { sh.style.transform = 'translateY(' + dy + 'px)'; sh.style.transition = 'none'; if (e.cancelable && !e.target.closest('.xs-in')) e.preventDefault(); } };
    var te = function () { if (startY == null) return; sh.style.transition = ''; if (dy > 90) close(); else sh.style.transform = ''; startY = null; dy = 0; };
    g.addEventListener('touchstart', ts, { passive: true }); g.addEventListener('touchmove', tm, { passive: false }); g.addEventListener('touchend', te);
    sh.addEventListener('touchstart', function (e) { if (e.target.closest('.xs-grab')) return; if (inner.scrollTop <= 0) ts(e); }, { passive: true });
    sh.addEventListener('touchmove', function (e) { if (e.target.closest('.xs-grab') || startY == null) return; if (inner.scrollTop <= 0 && e.touches[0].clientY - startY > 0) tm(e); else { startY = null; sh.style.transform = ''; } }, { passive: false });
    sh.addEventListener('touchend', function (e) { if (!e.target.closest('.xs-grab')) te(); });
    window.addEventListener('popstate', function () { if (OPEN) { PUSHED = false; hide(); } });
    document.addEventListener('keydown', function (e) { if (OPEN && e.key === 'Escape') close(); });
    window.addEventListener('hashchange', function () { if (OPEN) { PUSHED = false; hide(); } });
  }
  function render(key) {
    var c = key.indexOf(':'), id = c < 0 ? key : key.slice(0, c), arg = c < 0 ? '' : key.slice(c + 1), f = M[id]; if (!f || !CTX) return null; CACHE = {};
    var free = !CTX.full, r; CURP = null; try { r = f(arg); } catch (e) { try { console.error('explain', key, e); } catch (x) {} r = null; }
    if (!r) return null; if (free && !FREEOK[id] && !(id === 'conf' || id === 'self') ) r.locked = true; if (free && (id === 'conf' || id === 'self') && !(arg === 'four' || arg === 'cluster')) r.locked = true;
    var h = '<p class="xs-k">' + esc(r.kicker || '') + '</p><h2 id="xs-h">' + esc(r.title || '') + '</h2>' + (r.secs ? r.secs.map(function (s) { return '<section><h3>' + esc(s[0]) + '</h3>' + s[1] + '</section>'; }).join('') : '<section><h3>What it means</h3>' + (r.mean || '') + '</section>');
    if (r.locked) h += '<section class="xs-lock"><h3>Why you got this</h3><p>Your personal breakdown (your scores, the answers that drove it and what would flip it) is part of Mindprint Pro.</p><a class="btn block" href="#pro">Unlock with Pro \u2014 $10</a><a class="small center codeln" href="#pro">Have a code?</a></section>';
    else if (r.why) h += '<section><h3>Why you got this</h3>' + r.why + '</section>';
    if (!r.locked && r.sys && CTX.acts) { var a = CTX.acts(r.sys, r.x); if (a) h += '<section class="xs-acts">' + a + '</section>'; }
    h += '<p class="xs-note">' + esc(r.note || NOTE) + '</p>';
    return h;
  }
  function show(key, replace) {
    var h = render(key); if (!h) return false; build(); inner.innerHTML = h; inner.scrollTop = 0;
    if (!OPEN) { OPEN = true; document.documentElement.classList.add('xs-on'); sh.style.transform = ''; requestAnimationFrame(function () { bg.classList.add('on'); sh.classList.add('on'); });
      if (!PUSHED) { try { history.pushState({ mpx: 1 }, '', location.href); PUSHED = true; } catch (e) {} } setTimeout(function () { var x = sh.querySelector('.xs-x'); if (x) try { x.focus({ preventScroll: true }); } catch (e) {} }, 50); }
    return true;
  }
  function hide() { if (!OPEN) return; OPEN = false; document.documentElement.classList.remove('xs-on'); bg.classList.remove('on'); sh.classList.remove('on'); sh.style.transform = ''; var f = AFTER; AFTER = null; if (f) setTimeout(f, 0); }
  function close(then) { if (!OPEN) { if (then) then(); return; } if (PUSHED) { AFTER = then || null; PUSHED = false; try { history.back(); } catch (e) { hide(); } setTimeout(function () { if (OPEN) hide(); }, 400); } else { AFTER = then || null; hide(); } }
  /* one delegated tap handler for the whole app */
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest || t.closest('.xs')) return;
    var el = t.closest('[data-x]'); if (!el) return;
    var info = t.closest('[data-xi]');
    if (!info && t.closest('a,button,input,select,textarea,label,summary')) return;
    if (show(el.getAttribute('data-x'))) { e.preventDefault(); e.stopPropagation(); }
  });
  window.MPExplain = { set: function (c) { CTX = c; CACHE = {}; }, open: show, close: close, keys: function () { return Object.keys(M); }, _render: render };
})();
