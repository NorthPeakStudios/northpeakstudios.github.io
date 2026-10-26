/* Mindprint "Your types" hub (Northpeak Studios), v3 (1.1.3: overrides, retake banks, Socionics-style, lenses). Every result here is INFERRED from answers you already gave:
   the main quiz's 0-100 trait scores, a few Deep Dive answers (childhood and family), and any optional "sharpen" questions (data/addon.json).
   None of these is an official test (not the MBTI, not a licensed Enneagram or DISC assessment). Fun, rough labels with an honest confidence.
   all(p, style, opt): p = { scaleKey: 0-100 }, style = attachment word, opt = { n: {scaleKey: questions}, deep: [{q, v}], addon: [{q, a}], AQ: addon questions }.
   No main-quiz answer weights live in this file. */
(function () {
  'use strict';
  function num(v) { return typeof v === 'number' && isFinite(v); }
  function mean(a) { return Math.round(a.reduce(function (s, x) { return s + x; }, 0) / a.length); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function inv(v) { return 100 - v; }
  function strength(d) { return d >= 30 ? 'clear' : d >= 12 ? 'moderate' : 'slight'; }
  function confWord(c) { return c >= 75 ? 'high' : c >= 50 ? 'medium' : 'low'; }
  function C(pct, why) { pct = clamp(Math.round(pct), 5, 97); return { pct: pct, word: confWord(pct), why: why || '' }; }

  /* ---- Deep Dive: a few childhood answers nudge today's scores a little (each nudge is small; the main quiz still leads) ---- */
  var DEEP = {
    d15: { scale: { att_avoidance: -6 } },              // easy to go to a parent -> less guarded
    d42: { scale: { att_anxiety: -6 } },                // stable childhood -> less worry about closeness
    d27: { scale: { N: 5 } },                           // criticism stung -> more sensitive
    d06: { scale: { E: 2 } },                           // loud house -> a bit more outgoing
    d09: { choice: [{ att_avoidance: -6 }, { att_avoidance: -2 }, { att_avoidance: 4 }, { att_avoidance: 6 }, {}] },
    d19: { choice: [{ A: -5, cf_competing: 6 }, { A: 5, cf_accommodating: 6 }, { cf_avoiding: 6, att_avoidance: 3 }, { cf_compromising: 6 }, { dm_dependent: 5 }, {}] },
    d40: { choice: [{ E: 6 }, { E: -3 }, { O: 5 }, { E: -6 }, { E: 3, A: 2 }, {}] },
    d02: { choice: [{ att_anxiety: -3 }, { E: 2 }, { E: -2 }, { att_anxiety: 4 }, { att_anxiety: 2 }, {}] }
  };
  function deepNudge(p, deep) {
    var used = 0; (deep || []).forEach(function (a) { var m = DEEP[a.q]; if (!m || a.v == null) return; var d = null;
      if (m.scale && num(+a.v)) { var k = (+a.v - 3) / 2; d = {}; for (var x in m.scale) d[x] = m.scale[x] * k; }
      if (m.choice && num(+a.v)) d = m.choice[+a.v] || null;
      if (d) { used++; for (var y in d) if (num(p[y])) p[y] = clamp(p[y] + d[y], 0, 100); } });
    return used;
  }
  /* ---- Sharpen questions: each option votes on trait axes (signed) and/or system categories. "Other" answers count as answered, unscored. ---- */
  function addonTally(addon, AQ) {
    var byId = {}, ax = {}, axMax = {}, cat = {}, catMax = {}, per = {}, rt = {};
    ((AQ && AQ.questions) || []).forEach(function (q) { byId[q.id] = q; });
    (addon || []).forEach(function (a) { var q = byId[a.q]; if (!q || a.a == null) return; per[q.sys] = (per[q.sys] || 0) + 1;
      var o = a.a >= 0 ? q.options[a.a] : null, keys = {}, wt = a.r || q.bank === 'B' ? 2 : 1; // retake answers count double: a retake is a correction
      if (a.r || q.bank === 'B') rt[q.sys] = (rt[q.sys] || 0) + 1;
      q.options.forEach(function (op) { for (var k in (op.v || {})) keys[k] = 1; });
      for (var k in keys) { var mx = Math.max.apply(null, q.options.map(function (op) { return Math.abs((op.v || {})[k] || 0); })) || 1, w = o && o.v ? (o.v[k] || 0) : null;
        if (w == null) continue; // Other: unscored
        if (/^(e\d|ar_|ds_|cg_|ls_|tr_)/.test(k)) { cat[k] = (cat[k] || 0) + wt * Math.max(0, w); catMax[k] = (catMax[k] || 0) + wt * mx; }
        else { ax[k] = (ax[k] || 0) + wt * w; axMax[k] = (axMax[k] || 0) + wt * mx; } } });
    var axis = {}, cats = {};
    for (var a in ax) axis[a] = { pct: clamp(50 + 50 * ax[a] / axMax[a], 0, 100), n: axMax[a] };
    for (var c in cat) cats[c] = { pct: 100 * cat[c] / catMax[c], n: catMax[c] };
    return { axis: axis, cat: cats, per: per, rt: rt };
  }
  var K = 3; // the main-quiz estimate counts like K extra answers when blended with sharpen answers
  function blend(base, add) { if (!add) return base; var m = Math.min(12, add.n); return Math.round((base * K + add.pct * m) / (K + m)); }

  /* ---- 1. 4-letter type (MBTI-style) ---- */
  var FOUR = {
    INTJ: ['The Strategist', 'Quiet, independent and always a few moves ahead. You like big ideas that actually work.'],
    INTP: ['The Theorist', 'Curious about how everything works. You would rather understand something deeply than follow the crowd.'],
    ENTJ: ['The Captain', 'Direct and driven. You see where things should go and you organize people to get there.'],
    ENTP: ['The Inventor', 'Quick, restless and full of ideas. You love a good debate and new possibilities.'],
    INFJ: ['The Sage', 'Deep, caring and private. You read people well and care about meaning and doing right.'],
    INFP: ['The Dreamer', 'Imaginative and true to your values. You feel things deeply and want life to mean something.'],
    ENFJ: ['The Mentor', 'Warm and encouraging. You bring people together and want to help them grow.'],
    ENFP: ['The Free Spirit', 'Enthusiastic, creative and people-loving. Every day is full of possibilities for you.'],
    ISTJ: ['The Anchor', 'Reliable, steady and thorough. People count on you because you do what you say.'],
    ISFJ: ['The Caretaker', 'Kind, loyal and quietly hardworking. You look after your people in practical ways.'],
    ESTJ: ['The Organizer', 'Practical and in charge. You like clear rules, real results and getting things done right.'],
    ESFJ: ['The Host', 'Warm and social. You make people feel included and keep the group running smoothly.'],
    ISTP: ['The Tinkerer', 'Calm, hands-on and independent. You figure things out by doing them.'],
    ISFP: ['The Artist', 'Gentle and in the moment. You show who you are through what you make and do, not speeches.'],
    ESTP: ['The Daredevil', 'Bold and action-first. You think on your feet and like life with a little risk in it.'],
    ESFP: ['The Spotlight', 'Fun, spontaneous and generous. You bring the energy and live for the moment.']
  };
  var GROUP = { NT: ['Thinkers', 'logic and ideas'], NF: ['Idealists', 'meaning and people'], SJ: ['Keepers', 'duty and stability'], SP: ['Makers', 'action and freedom'] };
  function four(p, ev) {
    var L = [['E', 'I', p.E, 'Extraversion', 'Outgoing', 'Reserved'], ['N', 'S', p.O, 'Openness', 'Big-picture', 'Hands-on'], ['F', 'T', p.A, 'Agreeableness', 'Heart-led', 'Head-led'], ['J', 'P', p.C, 'Conscientiousness', 'Planner', 'Go-with-the-flow']];
    var code = '', letters = [];
    L.forEach(function (x) { var up = x[2] >= 50, l = up ? x[0] : x[1], d = Math.abs(x[2] - 50) * 2; code += l;
      letters.push({ letter: l, word: up ? x[4] : x[5], from: x[3], score: x[2], clarity: d, strength: strength(d / 2) }); });
    var grp = code[1] === 'N' ? (code[2] === 'T' ? 'NT' : 'NF') : (code[3] === 'J' ? 'SJ' : 'SP');
    var clr = Math.round(letters.reduce(function (s, x) { return s + x.clarity; }, 0) / 4), weak = Math.min.apply(null, letters.map(function (x) { return x.clarity; }));
    return { code: code, name: FOUR[code][0], text: FOUR[code][1], letters: letters, clarity: clr, group: GROUP[grp][0], groupText: GROUP[grp][1], groupCode: grp,
      conf: C(30 + clr * 0.35 + weak * 0.25 + ev('four'), weak < 12 ? 'one letter is close to the middle' : '') };
  }
  /* ---- 2. Enneagram-style ---- */
  var EN = [
    [1, 'The Perfectionist', 'Principled and careful. You want things done right and hold yourself to a high standard.', function (p) { return [p.C_order, p.C_discipline, p.v_conformity, p.N_anger]; }],
    [2, 'The Helper', 'Warm and generous. You notice what others need and like being there for them.', function (p) { return [p.A_empathy, p.v_benevolence, p.E_sociability, p.cope_support]; }],
    [3, 'The Achiever', 'Ambitious and adaptable. You want to be great at things and be seen for it.', function (p) { return [p.C_achievement, p.v_achievement, p.E_assertiveness, p.v_power]; }],
    [4, 'The Individualist', 'Expressive and deep. You want to be authentic and you feel things more than most.', function (p) { return [p.O_fantasy, p.N, p.v_self_direction, p.cope_express]; }],
    [5, 'The Investigator', 'Curious and private. You need to understand things and you guard your energy.', function (p) { return [p.O_ideas, inv(p.E_sociability), p.dm_rational, p.cope_withdraw]; }],
    [6, 'The Loyalist', 'Loyal and alert. You look for safety and people you can trust, and you plan for what could go wrong.', function (p) { return [p.N_anxiety, p.v_security, p.att_anxiety, p.dm_dependent]; }],
    [7, 'The Enthusiast', 'Upbeat and adventurous. You chase fun, new experiences and options.', function (p) { return [p.E_excitement, p.v_stimulation, p.v_hedonism, p.O_adventure]; }],
    [8, 'The Challenger', 'Strong and direct. You take charge, protect your people and hate being controlled.', function (p) { return [p.E_assertiveness, p.v_power, p.cf_competing, inv(p.A)]; }],
    [9, 'The Peacemaker', 'Easygoing and steady. You keep the peace and help everyone get along.', function (p) { return [p.A_cooperation, p.cf_accommodating, p.cf_avoiding, inv(p.N)]; }]
  ];
  function ennea(p, ev, cat) {
    var all = EN.map(function (e) { return { n: e[0], name: e[1], text: e[2], score: blend(mean(e[3](p)), cat['e' + e[0]]) }; });
    var rank = all.slice().sort(function (a, b) { return b.score - a.score || a.n - b.n; }), top = rank[0];
    var wl = all[(top.n + 7) % 9], wr = all[top.n % 9], wing = wl.score >= wr.score ? wl : wr, lead = top.score - rank[1].score;
    return { type: top.n, name: top.name, text: top.text, code: top.n + 'w' + wing.n, wing: wing.n, wingName: wing.name, match: top.score, lead: lead, strength: strength(lead * 2), ranked: rank,
      conf: C(25 + lead * 3 + ev('ennea'), lead < 4 ? 'your top two types are nearly tied' : '') };
  }
  /* ---- 3. Temperament (Eysenck-style map of Extraversion x emotional sensitivity) ---- */
  var TEMP = { sanguine: ['Sanguine', '\u2600\ufe0f', 'Outgoing and easygoing. Social, optimistic and quick to bounce back.'], choleric: ['Choleric', '\ud83d\udd25', 'Outgoing and intense. Energetic, driven and quick to react.'],
    melancholic: ['Melancholic', '\ud83c\udf27\ufe0f', 'Reserved and deep. Thoughtful, sensitive and detail-minded.'], phlegmatic: ['Phlegmatic', '\ud83c\udf3f', 'Reserved and calm. Steady, patient and hard to rattle.'] };
  function temper(p, ev) {
    var e = p.E, n = p.N, CC = { sanguine: [100, 0], choleric: [100, 100], melancholic: [0, 100], phlegmatic: [0, 0] }, w = {}, t = 0;
    for (var k in CC) { var d = Math.sqrt(Math.pow(e - CC[k][0], 2) + Math.pow(n - CC[k][1], 2)); w[k] = 1 / Math.pow(d + 10, 2); t += w[k]; }
    var rank = Object.keys(CC).map(function (k) { return { key: k, name: TEMP[k][0], emoji: TEMP[k][1], text: TEMP[k][2], share: Math.round(100 * w[k] / t) }; }).sort(function (a, b) { return b.share - a.share; });
    return { key: rank[0].key, name: rank[0].name, emoji: rank[0].emoji, text: rank[0].text, share: rank[0].share, second: rank[1], ranked: rank, conf: C(25 + (rank[0].share - rank[1].share) * 0.9 + ev('temper')) };
  }
  /* ---- 4. Jungian-style archetype (the 12 classic story archetypes) ---- */
  var AR = [
    ['hero', 'The Hero', '\ud83e\uddb8', 'You rise to a challenge and want to prove what you can do.', function (p) { return [p.C_achievement, p.E_assertiveness, p.v_achievement, p.cope_tackle]; }],
    ['sage', 'The Sage', '\ud83e\udd89', 'You want to understand the truth and you think before you act.', function (p) { return [p.O_ideas, p.dm_rational, p.v_universalism, inv(p.E_excitement)]; }],
    ['rebel', 'The Rebel', '\u26a1', 'You question the rules and do things your own way.', function (p) { return [p.v_self_direction, inv(p.v_conformity), p.cf_competing, inv(p.A_cooperation)]; }],
    ['explorer', 'The Explorer', '\ud83e\udded', 'You need freedom, new places and new experiences.', function (p) { return [p.O_adventure, p.v_stimulation, p.E_excitement, p.v_self_direction]; }],
    ['creator', 'The Creator', '\ud83c\udfa8', 'You want to make something that did not exist before.', function (p) { return [p.O_fantasy, p.O, p.v_self_direction, p.cope_express]; }],
    ['caregiver', 'The Caregiver', '\ud83e\udec2', 'You look after people and feel best when you are helping.', function (p) { return [p.A_empathy, p.v_benevolence, p.A, p.cf_accommodating]; }],
    ['ruler', 'The Ruler', '\ud83d\udc51', 'You like order, responsibility and being in charge.', function (p) { return [p.v_power, p.C_order, p.E_assertiveness, p.v_security]; }],
    ['jester', 'The Jester', '\ud83c\udccf', 'You bring the fun and help people not take life too seriously.', function (p) { return [p.v_hedonism, p.E_sociability, p.cope_reframe, inv(p.N)]; }],
    ['lover', 'The Lover', '\ud83d\udc96', 'You live for closeness, beauty and the people you love.', function (p) { return [p.A_empathy, p.att_anxiety, p.E_sociability, p.v_hedonism]; }],
    ['innocent', 'The Innocent', '\ud83c\udf3c', 'You look for the good in people and like life simple and honest.', function (p) { return [p.A_trust, inv(p.N_anxiety), p.v_conformity, p.cope_reframe]; }],
    ['magician', 'The Magician', '\ud83d\udd2e', 'You see how things could change and you trust your gut to make it happen.', function (p) { return [p.O_ideas, p.O_fantasy, p.dm_intuitive, p.v_achievement]; }],
    ['everyperson', 'The Everyperson', '\ud83e\uddd1\u200d\ud83e\udd1d\u200d\ud83e\uddd1', 'You are down to earth, loyal and easy to get along with.', function (p) { return [p.A_cooperation, p.v_security, inv(p.v_power), p.E_sociability]; }]
  ];
  function arche(p, ev, cat) {
    var rank = AR.map(function (a) { return { key: a[0], name: a[1], emoji: a[2], text: a[3], score: blend(mean(a[4](p)), cat['ar_' + a[0]]) }; }).sort(function (a, b) { return b.score - a.score; });
    var lead = rank[0].score - rank[1].score;
    return { key: rank[0].key, name: rank[0].name, emoji: rank[0].emoji, text: rank[0].text, score: rank[0].score, second: rank[1], ranked: rank, conf: C(22 + lead * 3 + ev('arche'), lead < 4 ? 'your top two are nearly tied' : '') };
  }
  /* ---- 5. DISC-style work style + colour ---- */
  var DISC = { D: ['Dominant', 'Red', '#ef5b5b', 'Direct, decisive and results-first. You like to lead and move fast.'], I: ['Influential', 'Yellow', '#f5c542', 'Upbeat and persuasive. You win people over and keep the energy up.'],
    S: ['Steady', 'Green', '#4cc38a', 'Patient, loyal and supportive. You keep things calm and consistent.'], C: ['Careful', 'Blue', '#4f8cf7', 'Precise and analytical. You care about getting the details right.'] };
  function disc(p, ev, cat) {
    var sc = { D: blend(mean([p.E_assertiveness, inv(p.A), p.cf_competing, p.dm_risk]), cat.ds_D), I: blend(mean([p.E_sociability, p.E_excitement, p.E, p.dm_spontaneous]), cat.ds_I),
               S: blend(mean([p.A_cooperation, p.v_security, p.cf_accommodating, inv(p.N)]), cat.ds_S), C: blend(mean([p.C_order, p.dm_rational, p.C, p.dm_maximizer]), cat.ds_C) };
    var rank = Object.keys(sc).sort(function (a, b) { return sc[b] - sc[a]; }), t = rank.reduce(function (s, k) { return s + sc[k]; }, 0) || 1, k = rank[0], k2 = rank[1], gap = sc[k] - sc[k2];
    return { key: k, code: gap < 6 ? k + k2.toLowerCase() : k, name: DISC[k][0], color: DISC[k][1], hex: DISC[k][2], text: DISC[k][3], second: { key: k2, name: DISC[k2][0], color: DISC[k2][1] },
      shares: rank.map(function (x) { return { key: x, name: DISC[x][0], color: DISC[x][1], hex: DISC[x][2], share: Math.round(100 * sc[x] / t) }; }), conf: C(28 + gap * 2.5 + ev('disc')) };
  }
  /* ---- 6. Attachment ---- */
  var ATTN = { secure: ['Secure', '\ud83e\udd1d'], anxious: ['Anxious-leaning', '\ud83d\udcac'], avoidant: ['Avoidant-leaning', '\ud83c\udfdd\ufe0f'], fearful: ['Fearful-avoidant (mixed)', '\ud83c\udf00'] };
  function attach(p, ev) {
    var a = p.att_anxiety, v = p.att_avoidance, style = a < 50 && v < 50 ? 'secure' : a >= 50 && v < 50 ? 'anxious' : a < 50 ? 'avoidant' : 'fearful', d = Math.min(Math.abs(a - 50), Math.abs(v - 50));
    return { key: style, name: ATTN[style][0], emoji: ATTN[style][1], anxiety: Math.round(a), avoidance: Math.round(v), strength: strength(d), conf: C(25 + d * 1.6 + ev('attach'), d < 8 ? 'one of your two scores is near the middle' : '') };
  }
  /* ---- 7. Cognitive / decision style ---- */
  var CG = { rational: ['Analytical', '\ud83e\uddee', 'You research, compare and reason things out before deciding.'], intuitive: ['Intuitive', '\u2728', 'You trust your gut and read situations fast.'],
    dependent: ['Collaborative', '\ud83d\udde3\ufe0f', 'You think best out loud with people you trust.'], spontaneous: ['Quick-fire', '\u23e9', 'You decide fast and adjust as you go.'], avoidant: ['Wait-and-see', '\u23f3', 'You hold off until a choice is really needed.'] };
  function cognitive(p, ev, cat) {
    var rank = Object.keys(CG).map(function (k) { return { key: k, name: CG[k][0], emoji: CG[k][1], text: CG[k][2], score: blend(p['dm_' + k], cat['cg_' + k]) }; }).sort(function (a, b) { return b.score - a.score; });
    var lead = rank[0].score - rank[1].score, scope = p.O >= 55 && p.C_order < 55 ? 'big-picture' : p.C_order >= 55 && p.O < 55 ? 'detail-first' : 'both big-picture and detail';
    return { key: rank[0].key, name: rank[0].name, emoji: rank[0].emoji, text: rank[0].text, second: rank[1], ranked: rank, scope: scope,
      maximizer: p.dm_maximizer >= 60 ? 'looks for the best option' : p.dm_maximizer <= 40 ? 'happy with good enough' : '', risk: p.dm_risk >= 60 ? 'okay with risk' : p.dm_risk <= 40 ? 'plays it safe' : '', conf: C(28 + lead * 1.5 + ev('cognitive')) };
  }
  /* ---- 8. Learning style preference (contested: research does not show matching a "style" helps people learn) ---- */
  var LS = { visual: ['Visual / imaginative', '\ud83d\uddbc\ufe0f', 'You like diagrams, pictures and imagining how things fit.'], reading: ['Reading / reflecting', '\ud83d\udcda', 'You like to read, think it over and work things out alone.'],
    hands: ['Hands-on', '\ud83d\udee0\ufe0f', 'You learn by doing, trying and moving.'], social: ['Social / talking it through', '\ud83d\udc65', 'You learn by discussing and explaining things to people.'] };
  function learning(p, ev, cat) {
    var raw = { visual: mean([p.O_fantasy, p.O]), reading: mean([p.O_ideas, inv(p.E_sociability), p.dm_rational]), hands: mean([p.E_excitement, inv(p.O_ideas), p.cope_tackle]), social: mean([p.E_sociability, p.dm_dependent, p.cope_support]) };
    var rank = Object.keys(LS).map(function (k) { return { key: k, name: LS[k][0], emoji: LS[k][1], text: LS[k][2], score: blend(raw[k], cat['ls_' + k]) }; }).sort(function (a, b) { return b.score - a.score; });
    return { key: rank[0].key, name: rank[0].name, emoji: rank[0].emoji, text: rank[0].text, second: rank[1], ranked: rank, conf: C(20 + (rank[0].score - rank[1].score) * 1.5 + ev('learning')), contested: true };
  }
  /* ---- 9. Big Five spectra + SLOAN-style code ---- */
  var SL = [['E', 'S', 'R', 'Social', 'Reserved'], ['N', 'L', 'C', 'Limbic (feels stress strongly)', 'Calm'], ['C', 'O', 'U', 'Organized', 'Unstructured'], ['A', 'A', 'E', 'Accommodating', 'Egocentric (puts own view first)'], ['O', 'I', 'N', 'Inquisitive', 'Non-curious (practical)']];
  function sloan(p, ev) {
    var code = '', parts = [], soft = 0;
    SL.forEach(function (x) { var v = Math.round(p[x[0]]), up = v >= 50, l = up ? x[1] : x[2], s = v > 40 && v < 60; if (s) soft++; code += s ? l.toLowerCase() : l; parts.push({ trait: x[0], letter: l, word: up ? x[3] : x[4], score: v, soft: s }); });
    return { code: code, parts: parts, conf: C(85 - soft * 9 + ev('sloan') / 2) };
  }
  /* ---- 10. Cluster: nearest of 8 hand-made profiles on the Big Five (not fitted to real people's data) ---- */
  var CL = [
    ['trailblazer', 'The Trailblazers', '\ud83d\ude80', '#8b5cf6', [80, 60, 75, 45, 30], 'Bold, curious and driven. You go after new things and pull others along.'],
    ['dreamer', 'The Dreamers', '\ud83c\udfa8', '#ec4899', [85, 35, 40, 65, 65], 'Imaginative and sensitive. You live in ideas, art and feelings and see what others miss.'],
    ['thinker', 'The Thinkers', '\ud83e\udde0', '#6366f1', [80, 60, 25, 40, 40], 'Independent and analytical. You would rather understand something than follow the crowd.'],
    ['anchor', 'The Anchors', '\u2693', '#0ea5e9', [35, 80, 45, 65, 30], 'Steady, reliable and organized. People lean on you because you show up.'],
    ['spark', 'The Sparks', '\u26a1', '#f59e0b', [65, 30, 85, 65, 45], 'Fun, social and spontaneous. You bring the energy wherever you go.'],
    ['harmonizer', 'The Harmonizers', '\ud83e\udd1d', '#10b981', [50, 55, 60, 85, 45], 'Warm and cooperative. You keep people together and make everyone feel included.'],
    ['competitor', 'The Competitors', '\ud83c\udfc6', '#ef4444', [45, 70, 70, 25, 45], 'Direct, ambitious and tough. You play to win and say what you think.'],
    ['deepfeeler', 'The Deep Feelers', '\ud83c\udf0a', '#14b8a6', [60, 45, 35, 70, 80], 'Caring and intense inside. You feel everything strongly and care hard about your people.']
  ];
  var BF = ['O', 'C', 'E', 'A', 'N'];
  function cluster(p, ev) {
    var v = BF.map(function (k) { return p[k]; });
    var rank = CL.map(function (c) { var d = Math.sqrt(c[4].reduce(function (s, x, i) { return s + Math.pow(x - v[i], 2); }, 0) / 5);
      return { key: c[0], name: c[1], emoji: c[2], color: c[3], text: c[5], dist: d, match: clamp(Math.round(100 - d * 1.4), 1, 99) }; }).sort(function (a, b) { return a.dist - b.dist; });
    var top = rank[0];
    return { key: top.key, name: top.name, emoji: top.emoji, color: top.color, text: top.text, match: top.match, second: rank[1], similar: rank.slice(1, 3), ranked: rank, conf: C(20 + (rank[1].dist - top.dist) * 3 + top.match * 0.3 + ev('cluster') / 2) };
  }
  /* ---- 11. Tags: short labels for the traits furthest from the middle ---- */
  var TG = { O: ['curious', 'practical'], C: ['organized', 'spontaneous'], E: ['social', 'lowkey'], A: ['kind', 'blunt'], N: ['sensitive', 'unbothered'], O_fantasy: ['daydreamer', 'grounded'], O_adventure: ['adventurous', 'homebody'],
    C_achievement: ['ambitious', 'chill'], C_discipline: ['disciplined', 'lastminute'], E_excitement: ['thrillseeker', 'calm'], E_assertiveness: ['leader', 'backseat'], A_trust: ['trusting', 'skeptical'], A_empathy: ['empath', 'logical'],
    N_anxiety: ['overthinker', 'carefree'], N_anger: ['fiery', 'patient'], v_universalism: ['justice'], v_benevolence: ['loyal'], v_stimulation: ['noveltyseeker'], v_tradition: ['traditional'], v_achievement: ['driven'], dm_maximizer: ['perfectionist', 'goodenough'], dm_risk: ['risktaker', 'cautious'] };
  function tags(p) {
    var c = []; for (var k in TG) { if (!num(p[k])) continue; var d = p[k] - 50; if (d >= 18 && TG[k][0]) c.push([TG[k][0], d]); else if (d <= -18 && TG[k][1]) c.push([TG[k][1], -d]); }
    var seen = {}; return c.sort(function (a, b) { return b[1] - a[1]; }).filter(function (x) { if (seen[x[0]]) return false; seen[x[0]] = 1; return true; }).slice(0, 8).map(function (x) { return x[0]; });
  }
  /* ---- 12. Hierarchy: your path down the personality "tree" ---- */
  function taxonomy(t, p) {
    return [{ level: 'Family', name: t.four.group, note: t.four.groupText }, { level: 'Cluster', name: t.cluster.emoji + ' ' + t.cluster.name, note: t.cluster.match + '% match' },
      { level: 'Type', name: t.four.code + ' \u00b7 ' + t.four.name, note: 'MBTI-style' }, { level: 'Subtype', name: (p.N >= 50 ? 'Sensitive' : 'Steady') + ' \u00b7 ' + t.ennea.code, note: (p.N >= 50 ? 'feels stress strongly' : 'stays calm under stress') + ', Enneagram-style ' + t.ennea.name.replace(/^The /, '').toLowerCase() }];
  }

  /* ---- 14. Lenses: Odin's list of categorization ideas, as ways of looking at the same answers (Oct 25 2026). Pure functions of the scores above. ---- */
  /* Dendrogram: average-linkage merge of the 8 cluster profiles (computed here from the profiles, so the tree is real for these profiles) */
  var TREE = (function () {
    var nodes = CL.map(function (c) { return { keys: [c[0]], v: c[4], h: 0, kids: null }; });
    function dist(a, b) { var s = 0, n = 0; a.keys.forEach(function (x) { b.keys.forEach(function (y) { var u = CL.filter(function (c) { return c[0] === x; })[0][4], w = CL.filter(function (c) { return c[0] === y; })[0][4]; s += Math.sqrt(u.reduce(function (t, q, i) { return t + Math.pow(q - w[i], 2); }, 0) / 5); n++; }); }); return s / n; }
    while (nodes.length > 1) { var bi = 0, bj = 1, bd = 1e9; for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) { var d = dist(nodes[i], nodes[j]); if (d < bd) { bd = d; bi = i; bj = j; } }
      var m = { keys: nodes[bi].keys.concat(nodes[bj].keys), h: Math.round(bd), kids: [nodes[bi], nodes[bj]] }; nodes = nodes.filter(function (x, k) { return k !== bi && k !== bj; }); nodes.push(m); }
    return nodes[0];
  })();
  function clName(k) { var c = CL.filter(function (x) { return x[0] === k; })[0]; return c ? c[2] + ' ' + c[1] : k; }
  function treeRows(node, mine, depth, out) { out = out || []; depth = depth || 0;
    out.push({ depth: depth, leaf: !node.kids, label: node.kids ? 'Branch (' + node.keys.length + ' clusters, joined at distance ' + node.h + ')' : clName(node.keys[0]), mine: node.keys.indexOf(mine) >= 0 });
    if (node.kids) node.kids.forEach(function (c) { treeRows(c, mine, depth + 1, out); }); return out; }
  function clade(mine) { var path = [], n = TREE; while (n && n.kids) { var nx = n.kids.filter(function (c) { return c.keys.indexOf(mine) >= 0; })[0]; if (!nx) break; if (nx.kids) path.push(nx.keys.map(clName)); n = nx; } return path; }
  var LAT = { curious: 'curiosus', practical: 'practicus', organized: 'ordinatus', spontaneous: 'spontaneus', social: 'socialis', lowkey: 'quietus', kind: 'benignus', blunt: 'directus', sensitive: 'sensibilis', unbothered: 'tranquillus',
    daydreamer: 'somnians', grounded: 'terrestris', adventurous: 'audax', homebody: 'domesticus', ambitious: 'ambitiosus', chill: 'placidus', disciplined: 'disciplinatus', lastminute: 'serotinus', thrillseeker: 'periculosus', calm: 'serenus',
    leader: 'dux', backseat: 'modestus', trusting: 'fidens', skeptical: 'scepticus', empath: 'empathicus', logical: 'logicus', overthinker: 'cogitabundus', carefree: 'securus', fiery: 'igneus', patient: 'patiens', justice: 'iustus', loyal: 'fidelis',
    noveltyseeker: 'novator', traditional: 'traditionalis', driven: 'impigrus', perfectionist: 'perfectus', goodenough: 'contentus', risktaker: 'audens', cautious: 'cautus' };
  var FAM = { trailblazer: 'Pioneeridae', dreamer: 'Somniidae', thinker: 'Cogitidae', anchor: 'Ancoridae', spark: 'Scintillidae', harmonizer: 'Concordidae', competitor: 'Certamidae', deepfeeler: 'Profundidae' };
  var CLASSN = { NT: 'Cogitantes', NF: 'Idealistae', SJ: 'Custodes', SP: 'Artifices' };
  var GENRE = { trailblazer: 'Adventure', dreamer: 'Fantasy', thinker: 'Sci-fi mystery', anchor: 'Slice of life', spark: 'Comedy', harmonizer: 'Feel-good ensemble', competitor: 'Sports drama', deepfeeler: 'Coming-of-age drama' };
  var GUILD = { D: ['Vanguard Guild', 'leaders and doers who push things forward'], I: ['Herald Guild', 'connectors who rally people'], S: ['Hearth Guild', 'supporters who keep the group steady'], C: ['Scholar Guild', 'precise thinkers who get it right'] };
  var SCHOOL = { v_self_direction: ['School of Freedom', 'thinking for yourself'], v_stimulation: ['School of Adventure', 'new experiences'], v_hedonism: ['School of Joy', 'enjoying life'], v_achievement: ['School of Ambition', 'being great at things'],
    v_power: ['School of Influence', 'having a say'], v_security: ['School of Stability', 'safety and order'], v_conformity: ['School of Tradition', 'respecting how things are done'], v_tradition: ['School of Tradition', 'respecting how things are done'],
    v_benevolence: ['School of Kindness', 'looking after your people'], v_universalism: ['School of Fairness', 'fairness for everyone'] };
  var SYN = { curious: ['inquisitive', 'open-minded'], practical: ['down-to-earth', 'realistic'], organized: ['orderly', 'methodical'], spontaneous: ['flexible', 'impulsive'], social: ['outgoing', 'sociable'], lowkey: ['reserved', 'quiet'],
    kind: ['warm', 'gentle'], blunt: ['direct', 'frank'], sensitive: ['intense', 'deep-feeling'], unbothered: ['calm', 'easygoing'], daydreamer: ['imaginative', 'dreamy'], grounded: ['realistic', 'level-headed'], adventurous: ['bold', 'daring'],
    homebody: ['cozy', 'settled'], ambitious: ['driven', 'goal-oriented'], chill: ['relaxed', 'laid-back'], disciplined: ['steady', 'self-controlled'], lastminute: ['deadline-powered', 'crammer'], thrillseeker: ['adrenaline-lover', 'daring'],
    calm: ['peaceful', 'mellow'], leader: ['take-charge', 'assertive'], backseat: ['easygoing', 'low-key'], trusting: ['open', 'good-faith'], skeptical: ['cautious', 'questioning'], empath: ['caring', 'compassionate'], logical: ['rational', 'analytical'],
    overthinker: ['ruminator', 'reflective'], carefree: ['relaxed', 'unworried'], fiery: ['passionate', 'hot-headed'], patient: ['even-tempered', 'tolerant'], justice: ['fair-minded', 'principled'], loyal: ['devoted', 'faithful'],
    noveltyseeker: ['restless', 'explorer'], traditional: ['classic', 'old-school'], driven: ['motivated', 'determined'], perfectionist: ['high-standards', 'meticulous'], goodenough: ['satisficer', 'easy to please'], risktaker: ['bold', 'gambler'], cautious: ['careful', 'safe'] };
  var STEREO = { E: ['loud and attention-seeking', 'E_assertiveness'], I: ['shy and awkward', 'N_selfcon'], N: ['head in the clouds and disorganized', 'C_order', true], S: ['boring and predictable', 'E_excitement', true],
    T: ['cold and unfeeling', 'A_empathy', true], F: ['too emotional', 'N'], J: ['rigid and controlling', 'O_adventure', true], P: ['lazy and messy', 'C_discipline', true] };
  var ROLES = [['Leader', 'takes charge and sets direction', ['E_assertiveness', 'v_power', 'cf_competing']], ['Idea generator', 'throws out new ideas', ['O_ideas', 'O_fantasy', 'O']], ['Organizer', 'makes the plan and keeps track', ['C_order', 'C_discipline', 'C']],
    ['Peacekeeper', 'smooths things over', ['A_cooperation', 'cf_accommodating', 'cf_compromising']], ['Hype person', 'keeps the energy up', ['E_sociability', 'E_excitement', 'v_hedonism']], ['Researcher', 'digs into the details', ['O_ideas', 'dm_rational', '-E_sociability']],
    ['Critic', 'spots the flaws others miss', ['-A_trust', 'dm_rational', '-A_cooperation']], ['Supporter', 'looks after everyone', ['A_empathy', 'v_benevolence', 'cope_support']]];
  function val(p, k) { return k[0] === '-' ? 100 - p[k.slice(1)] : p[k]; }
  function lenses(t, p, opt) {
    var bf = BF.map(function (x) { return Math.round(p[x]); }), L = {};
    /* traits & dimensions: a 2D map (Big Five "higher-order" axes, a published but debated idea) + bins */
    var plas = Math.round((p.E + p.O) / 2), stab = Math.round((p.A + p.C + (100 - p.N)) / 3);
    var Q4 = plas >= 50 ? (stab >= 50 ? ['Grounded Explorer', 'curious and outgoing, and steady with it'] : ['Restless Explorer', 'curious and outgoing, with big feelings']) : (stab >= 50 ? ['Steady Anchor', 'reserved and calm, the reliable one'] : ['Inner World', 'reserved, with a lot going on inside']);
    L.map = { x: plas, y: stab, quadrant: Q4[0], quadrantText: Q4[1], vector: BF.map(function (x, i) { return { key: x, v: bf[i] }; }),
      points: CL.map(function (c) { return { key: c[0], emoji: c[2], name: c[1], color: c[3], x: Math.round((c[4][2] + c[4][0]) / 2), y: Math.round((c[4][3] + c[4][1] + 100 - c[4][4]) / 3) }; }) };
    var BIN = ['Very low', 'Low', 'Middle', 'High', 'Very high'];
    L.bins = BF.map(function (x, i) { var v = bf[i], b = v >= 80 ? 4 : v >= 60 ? 3 : v >= 41 ? 2 : v >= 21 ? 1 : 0; return { key: x, v: v, bin: b, name: BIN[b] }; });
    var sd = Math.sqrt(bf.reduce(function (s, v) { var m = bf.reduce(function (a, b) { return a + b; }, 0) / 5; return s + Math.pow(v - m, 2); }, 0) / 5);
    L.shape = sd < 9 ? ['Flat', 'your five traits sit close together, a balanced profile'] : sd < 18 ? ['Rolling', 'a few traits stand out, the rest are close to the middle'] : ['Spiky', 'big peaks and dips, your traits pull in strong directions'];
    /* clusters & groups: soft membership (like a mixture model), sets, tribe/guild/school, roles, niche */
    var ws = CL.map(function (c) { var d2 = c[4].reduce(function (s, x, i) { return s + Math.pow(x - bf[i], 2); }, 0) / 5; return { key: c[0], emoji: c[2], name: c[1], color: c[3], w: Math.exp(-d2 / (2 * 15 * 15)) }; }), wt = ws.reduce(function (s, x) { return s + x.w; }, 0) || 1;
    L.mixture = ws.map(function (x) { return { key: x.key, emoji: x.emoji, name: x.name, color: x.color, pct: Math.round(100 * x.w / wt) }; }).sort(function (a, b) { return b.pct - a.pct; });
    L.sets = t.four.letters.map(function (l) { return l.word + ' (' + l.letter + ')'; }).concat([t.temper.name, t.attach.name.replace(/ \(.*\)$/, ''), t.four.group]);
    L.equiv = t.four.code + ' \u00b7 ' + t.temper.name;
    L.tribe = { name: 'The ' + t.four.group, text: t.four.groupText };
    L.guild = { name: GUILD[t.disc.key][0], text: GUILD[t.disc.key][1] };
    var topv = ['v_self_direction', 'v_stimulation', 'v_hedonism', 'v_achievement', 'v_power', 'v_security', 'v_conformity', 'v_benevolence', 'v_universalism'].map(function (k) { return { key: k, v: p[k] }; }).sort(function (a, b) { return b.v - a.v; });
    L.school = { name: SCHOOL[topv[0].key][0], text: SCHOOL[topv[0].key][1] }; L.priorities = topv.slice(0, 3).map(function (x) { return x.key; });
    var roles = ROLES.map(function (r) { return { name: r[0], text: r[1], s: Math.round(r[2].reduce(function (s, k) { return s + val(p, k); }, 0) / r[2].length) }; }).sort(function (a, b) { return b.s - a.s; });
    L.roles = roles.slice(0, 3);
    L.niche = [p.E >= 55 ? 'a big, busy group' : p.E < 45 ? 'a small team or on your own' : 'a small group', p.C >= 55 ? 'with a clear plan' : p.C < 45 ? 'with room to improvise' : 'with some structure', p.O >= 55 ? 'on new, open-ended problems' : p.O < 45 ? 'on practical, hands-on work' : 'on a mix of ideas and doing'];
    L.affinity = [t.cluster].concat(t.cluster.similar || []).map(function (c) { return c.emoji + ' ' + c.name; });
    /* hierarchy & taxonomy: a playful Linnaean-style tree + the real dendrogram of the 8 profiles */
    var genus = t.four.name.replace(/^The /, '').replace(/[^A-Za-z]/g, ''); genus = genus.replace(/(er|or|ist)$/, '$1') + (/[aeiou]$/.test(genus) ? '' : 'a');
    var epi = (t.tags || []).map(function (x) { return LAT[x]; }).filter(Boolean)[0] || 'medius';
    L.taxon = [['Domain', 'Personalia', 'every person'], ['Kingdom', p.E >= 50 ? 'Extraverta' : 'Introverta', p.E >= 50 ? 'gets energy from people' : 'recharges alone'], ['Phylum', p.N >= 50 ? 'Sensibilia' : 'Stabilia', p.N >= 50 ? 'feels things strongly' : 'stays steady'],
      ['Class', CLASSN[t.four.groupCode] || t.four.group, 'the ' + t.four.group], ['Order', t.temper.name + 'ales', t.temper.name.toLowerCase() + ' temperament'], ['Family', FAM[t.cluster.key] || t.cluster.name, t.cluster.name],
      ['Genus', genus, t.four.code + ' \u00b7 ' + t.four.name], ['Species', genus + ' ' + epi, 'named for your strongest tag'], ['Variant', t.ennea.code + ' \u00b7 ' + t.sloan.code, 'Enneagram-style + Big Five code']];
    L.tree = treeRows(TREE, t.cluster.key); L.clade = clade(t.cluster.key);
    L.supertype = t.four.group; L.subtype = t.four.code + (p.N >= 50 ? ' (sensitive variant)' : ' (steady variant)');
    /* relations & networks */
    L.graph = { traits: BF.map(function (x, i) { return { key: x, v: bf[i] }; }), results: [['four', t.four.code, ['E', 'O', 'A', 'C']], ['temper', t.temper.name, ['E', 'N']], ['cluster', t.cluster.emoji + ' ' + t.cluster.name.replace(/^The /, ''), BF], ['socionics', t.socionics.code, ['E', 'O', 'A', 'C']], ['disc', 'DISC ' + t.disc.key, ['E', 'A', 'C']], ['sloan', t.sloan.code, BF]] };
    L.triples = [['You', 'are a', t.four.code + ' (' + t.four.name + ')'], [t.four.code, 'belongs to', 'the ' + t.four.group], ['You', 'sit in', t.cluster.name], [t.cluster.name, 'is near', (t.cluster.similar || []).map(function (c) { return c.name; }).join(' and ')],
      ['You', 'Socionics-style', t.socionics.code + ' (' + t.socionics.letters + ')'], [t.socionics.code, 'has dual', t.socionics.dual + ' (' + t.socionics.dualLetters + ')'], ['You', 'lead with', 'Enneagram-style ' + t.ennea.code], ['You', 'work like', t.disc.name + ' (' + t.disc.color + ')'], ['You', 'value most', L.school.text]];
    /* tiers & levels: how strongly each trait shows (not how good it is) */
    var TK = ['O', 'C', 'E', 'A', 'N', 'O_fantasy', 'O_ideas', 'O_adventure', 'C_order', 'C_discipline', 'C_achievement', 'E_sociability', 'E_assertiveness', 'E_excitement', 'A_trust', 'A_empathy', 'A_cooperation', 'N_anxiety', 'N_anger', 'N_selfcon'];
    var tiers = { S: [], A: [], B: [], C: [], D: [] }; TK.forEach(function (k) { var v = Math.round(p[k]), tr = v >= 85 ? 'S' : v >= 70 ? 'A' : v >= 55 ? 'B' : v >= 40 ? 'C' : 'D'; tiers[tr].push({ key: k, v: v }); });
    for (var tk in tiers) tiers[tk].sort(function (a, b) { return b.v - a.v; }); L.tiers = tiers;
    /* labels & tags */
    L.facets = [['Energy', p.E >= 50 ? 'Outgoing' : 'Reserved'], ['Focus', p.O >= 50 ? 'Big-picture' : 'Hands-on'], ['Deciding', p.A >= 50 ? 'Heart-led' : 'Head-led'], ['Structure', p.C >= 50 ? 'Planner' : 'Flexible'], ['Stress', p.N >= 50 ? 'Feels it strongly' : 'Rolls off'], ['Closeness', t.attach.name], ['Work style', t.disc.name], ['Decisions', t.cognitive.name]];
    L.thesaurus = (t.tags || []).map(function (x) { return { tag: x, syn: SYN[x] || [] }; });
    L.genre = GENRE[t.cluster.key] || 'Drama'; L.comm = p.A < 45 ? 'Direct' : p.A > 55 ? 'Diplomatic' : 'Balanced'; L.modality = p.E >= 55 ? 'Group' : p.E < 45 ? 'One-on-one' : 'Both';
    L.code = [t.four.code, t.ennea.code, t.temper.name.slice(0, 3).toUpperCase(), t.sloan.code, t.socionics.code, 'DISC-' + t.disc.key].join('-');
    var adj = (t.tags && t.tags[0]) ? t.tags[0].replace(/^./, function (c) { return c.toUpperCase(); }) : 'Balanced';
    L.persona = { name: 'The ' + adj + ' ' + t.arche.name.replace(/^The /, ''), emoji: t.arche.emoji, wants: t.ennea.text, work: t.disc.text, people: t.attach.name + ' with people, ' + (p.E >= 50 ? 'charged by company' : 'recharged by alone time') + '.', stress: p.N >= 55 ? 'Feels stress hard; needs a reset.' : p.N <= 45 ? 'Stays steady when things go wrong.' : 'Handles stress okay, with some off days.' };
    /* patterns & forms */
    var hi = BF.map(function (x, i) { return { k: x, d: bf[i] - 50 }; }).sort(function (a, b) { return b.d - a.d; }), TGW = { O: ['curious', 'practical'], C: ['organized', 'spontaneous'], E: ['social', 'lowkey'], A: ['kind', 'blunt'], N: ['sensitive', 'unbothered'] };
    L.pattern = { hi: hi[0].k, lo: hi[4].k, name: (hi[0].d > 0 ? TGW[hi[0].k][0] : 'balanced') + ' + ' + (hi[4].d < 0 ? TGW[hi[4].k][1] : 'balanced'), text: 'Your highest trait is ' + hi[0].k + ' (' + (50 + hi[0].d) + ') and your lowest is ' + hi[4].k + ' (' + (50 + hi[4].d) + '). That pairing is the core of your configuration.' };
    L.phenotype = (t.tags || []).slice(0, 3);
    /* philosophy-ish: prototype, stereotype, natural kind, predicates */
    var proto = t.four.clarity; L.prototype = { pct: proto, name: proto >= 60 ? 'Textbook member' : proto >= 35 ? 'Clear member' : proto >= 15 ? 'Typical-ish member' : 'Borderline member',
      neighbor: (function () { var w = t.four.letters.slice().sort(function (a, b) { return a.clarity - b.clarity; })[0], i = t.four.letters.indexOf(w), pr = [['E', 'I'], ['N', 'S'], ['F', 'T'], ['J', 'P']][i], c = t.four.code.split(''); c[i] = c[i] === pr[0] ? pr[1] : pr[0]; return c.join(''); })() };
    L.stereo = t.four.code.split('').map(function (l) { var s = STEREO[l], v = Math.round(s[2] ? 100 - p[s[1]] : p[s[1]]); return { letter: l, claim: s[0], fits: v >= 55 ? 'fits you' : v <= 45 ? 'doesn\u2019t fit you' : 'half true', v: v }; });
    L.boxiness = Math.round(bf.reduce(function (s, v) { return s + Math.abs(v - 50) * 2; }, 0) / 5);
    L.predicates = [['is curious', p.O >= 50], ['plans ahead', p.C >= 50], ['gets energy from people', p.E >= 50], ['puts others first', p.A >= 50], ['feels stress strongly', p.N >= 50], ['trusts easily', p.A_trust >= 50], ['likes a thrill', p.E_excitement >= 50], ['worries about closeness', p.att_anxiety >= 50]];
    return L;
  }
  /* ---- 13. Socionics-style type (from the 4-letter type; MBTI <-> Socionics matching is debated, this uses the common rule: introverts swap j/p) ---- */
  var SOC = { // code: [socionics letters, name, quadra]
    ILE: ['ENTp', 'The Idea Spinner', 'Alpha'], SEI: ['ISFp', 'The Comfort Maker', 'Alpha'], ESE: ['ESFj', 'The Warm Host', 'Alpha'], LII: ['INTj', 'The System Builder', 'Alpha'],
    EIE: ['ENFj', 'The Storyteller', 'Beta'], LSI: ['ISTj', 'The Enforcer', 'Beta'], SLE: ['ESTp', 'The Conqueror', 'Beta'], IEI: ['INFp', 'The Visionary', 'Beta'],
    SEE: ['ESFp', 'The Persuader', 'Gamma'], ILI: ['INTp', 'The Forecaster', 'Gamma'], LIE: ['ENTj', 'The Entrepreneur', 'Gamma'], ESI: ['ISFj', 'The Guardian', 'Gamma'],
    LSE: ['ESTj', 'The Manager', 'Delta'], EII: ['INFj', 'The Humanist', 'Delta'], IEE: ['ENFp', 'The Motivator', 'Delta'], SLI: ['ISTp', 'The Craftsperson', 'Delta'] };
  var QUADRA = { Alpha: 'ideas, fun and easygoing equality', Beta: 'passion, loyalty and a strong group', Gamma: 'independence, results and honesty', Delta: 'calm, practical help and steady growth' };
  var DUAL = { ILE: 'SEI', SEI: 'ILE', ESE: 'LII', LII: 'ESE', EIE: 'LSI', LSI: 'EIE', SLE: 'IEI', IEI: 'SLE', SEE: 'ILI', ILI: 'SEE', LIE: 'ESI', ESI: 'LIE', LSE: 'EII', EII: 'LSE', IEE: 'SLI', SLI: 'IEE' };
  function mbtiToSoc(m) { var l = m.slice(0, 3), last = m[3].toLowerCase(); if (m[0] === 'I') last = last === 'j' ? 'p' : 'j'; var s = l + last; for (var k in SOC) if (SOC[k][0] === s) return k; return null; }
  function socToMbti(k) { var s = SOC[k] && SOC[k][0]; if (!s) return null; var last = s[3]; if (s[0] === 'I') last = last === 'j' ? 'p' : 'j'; return s.slice(0, 3) + last.toUpperCase(); }
  function socionics(f) { var k = mbtiToSoc(f.code) || 'ILE', s = SOC[k], d = DUAL[k];
    return { code: k, letters: s[0], name: s[1], quadra: s[2], quadraText: QUADRA[s[2]], dual: d, dualLetters: SOC[d][0], dualName: SOC[d][1], conf: { pct: Math.max(5, f.conf.pct - 8), word: confWord(f.conf.pct - 8), why: 'follows your 4-letter type' } }; }

  /* ---- "Not me?" overrides: the person picks their real type. Saved as self-identified; the inferred one is kept. Some picks nudge the trait scores
     they come from (so related results move too): 4-letter / Socionics -> E, O, A, C; temperament -> E, N; attachment -> anxiety, avoidance. ---- */
  var OVSYS = ['four', 'socionics', 'ennea', 'temper', 'arche', 'disc', 'attach', 'cognitive', 'learning', 'cluster'];
  function okOv(sys, v) { v = String(v == null ? '' : v);
    if (sys === 'four') return FOUR[v] ? v : null; if (sys === 'socionics') return SOC[v] ? v : null;
    if (sys === 'ennea') { var m = /^([1-9])(?:w([1-9]))?$/.exec(v); if (!m) return null; if (m[2] && [((+m[1] + 7) % 9) + 1, (+m[1] % 9) + 1].indexOf(+m[2]) < 0) return m[1]; return v; }
    if (sys === 'temper') return TEMP[v] ? v : null; if (sys === 'arche') return AR.some(function (a) { return a[0] === v; }) ? v : null; if (sys === 'disc') return DISC[v] ? v : null;
    if (sys === 'attach') return ATTN[v] ? v : null; if (sys === 'cognitive') return CG[v] ? v : null; if (sys === 'learning') return LS[v] ? v : null;
    if (sys === 'cluster') return CL.some(function (c) { return c[0] === v; }) ? v : null; return null; }
  function cleanOv(ov) { var o = {}, n = 0; OVSYS.forEach(function (s) { var v = okOv(s, ov && ov[s]); if (v) { o[s] = v; n++; } }); return n ? o : null; }
  function side(p, k, up) { if (up && p[k] < 58) p[k] = 58; if (!up && p[k] > 42) p[k] = 42; }
  function nudge(p, ov) {
    var f = ov.four || (ov.socionics && socToMbti(ov.socionics));
    if (f) { side(p, 'E', f[0] === 'E'); side(p, 'O', f[1] === 'N'); side(p, 'A', f[2] === 'F'); side(p, 'C', f[3] === 'J'); }
    if (ov.temper) { var tc = { sanguine: [1, 0], choleric: [1, 1], melancholic: [0, 1], phlegmatic: [0, 0] }[ov.temper]; if (!f) side(p, 'E', !!tc[0]); side(p, 'N', !!tc[1]); }
    if (ov.attach) { var ac = { secure: [0, 0], anxious: [1, 0], avoidant: [0, 1], fearful: [1, 1] }[ov.attach]; side(p, 'att_anxiety', !!ac[0]); side(p, 'att_avoidance', !!ac[1]); }
  }
  function selfMark(t, t0, sys, ov) {
    var r = t[sys], r0 = t0[sys], code = function (x) { return x ? (x.code || x.key || '') : ''; };
    if (sys === 'ennea') { var m = /^([1-9])(?:w([1-9]))?$/.exec(ov), n = +m[1], e = EN[n - 1], wn = m[2] ? +m[2] : null;
      if (!wn) { var wl = r.ranked.filter(function (x) { return x.n === ((n + 7) % 9) + 1; })[0], wr = r.ranked.filter(function (x) { return x.n === (n % 9) + 1; })[0]; wn = wl.score >= wr.score ? wl.n : wr.n; }
      r = Object.assign({}, r, { type: n, name: e[1], text: e[2], code: n + 'w' + wn, wing: wn, wingName: EN[wn - 1][1], match: (r.ranked.filter(function (x) { return x.n === n; })[0] || {}).score }); }
    else if (sys === 'arche') { var a = AR.filter(function (x) { return x[0] === ov; })[0]; r = Object.assign({}, r, { key: a[0], name: a[1], emoji: a[2], text: a[3] }); }
    else if (sys === 'disc') r = Object.assign({}, r, { key: ov, code: ov, name: DISC[ov][0], color: DISC[ov][1], hex: DISC[ov][2], text: DISC[ov][3] });
    else if (sys === 'cognitive') r = Object.assign({}, r, { key: ov, name: CG[ov][0], emoji: CG[ov][1], text: CG[ov][2] });
    else if (sys === 'learning') r = Object.assign({}, r, { key: ov, name: LS[ov][0], emoji: LS[ov][1], text: LS[ov][2] });
    else if (sys === 'temper') r = Object.assign({}, r, { key: ov, name: TEMP[ov][0], emoji: TEMP[ov][1], text: TEMP[ov][2] });
    else if (sys === 'attach') r = Object.assign({}, r, { key: ov, name: ATTN[ov][0], emoji: ATTN[ov][1] });
    else if (sys === 'cluster') { var c = r.ranked.filter(function (x) { return x.key === ov; })[0]; r = Object.assign({}, r, { key: c.key, name: c.name, emoji: c.emoji, color: c.color, text: c.text, match: c.match, similar: r.ranked.filter(function (x) { return x.key !== ov; }).slice(0, 2) }); }
    r.self = true; r.inferred = { code: code(r0), name: r0.name, conf: r0.conf }; r.same = code(r0) === code(r); t[sys] = r;
  }
  /* ---- 16. Thinking style (1.1.6): a cognitive-style lens on two research ideas, wholist vs analytic and words vs pictures (Riding's cognitive-style model), plus
     field-dependent vs independent (Witkin). Our version is a rough, for-fun estimate from your answers, not a validated test. Axis scores: ts_whole (100 = big-picture),
     ts_visual (100 = pictures), ts_field (100 = independent). Base estimates come from the main quiz; the optional 6-question quiz (sys "thinking") blends in. ---- */
  var TSN = { wv: ['Big-picture talker', '\ud83d\uddfa\ufe0f', 'You grab the whole shape of an idea fast, then think it through by putting it into words.'],
    wi: ['Big-picture visualizer', '\ud83c\udf04', 'You see the whole thing at once, like a map or a picture in your head.'],
    av: ['Step-by-step explainer', '\ud83e\uddfe', 'You break things into parts and lay them out in words, one step at a time.'],
    ai: ['Detail visualizer', '\ud83d\udd2c', 'You zoom into the parts and picture exactly how each piece fits.'] };
  function thinking(p, ev) {
    var w = Math.round(p.ts_whole), v = Math.round(p.ts_visual), f = Math.round(p.ts_field), k = (w >= 50 ? 'w' : 'a') + (v >= 50 ? 'i' : 'v'), x = TSN[k];
    var lead = (Math.abs(w - 50) + Math.abs(v - 50)) / 2;
    return { key: k, name: x[0], emoji: x[1], text: x[2], whole: w, visual: v, field: f,
      fieldName: f >= 55 ? 'Independent' : f <= 45 ? 'Context-led' : 'In between', fieldText: f >= 55 ? 'you go by your own read and ignore the noise around a problem' : f <= 45 ? 'you read the room and the bigger context before you decide' : 'you mix your own read with the context around you',
      conf: C(18 + lead * 1.2 + ev('thinking')) };
  }
  /* ---- 17. Team role (1.1.6): the 8 group roles from the lenses, ranked, with the optional 6-question team quiz (sys "team", categories tr_<key>) blended in.
     Our own role names; not the Belbin Team Roles test. ---- */
  var TRK = ['leader', 'ideas', 'organizer', 'peace', 'hype', 'research', 'critic', 'support'], TRE = ['\ud83e\udded', '\ud83d\udca1', '\ud83d\udccb', '\ud83d\udd4a\ufe0f', '\ud83d\udce3', '\ud83d\udd0e', '\ud83e\uddd0', '\ud83e\udec2'];
  function team(p, ev, cat) {
    var rank = ROLES.map(function (r, i) { return { key: TRK[i], name: r[0], emoji: TRE[i], text: r[1], score: blend(Math.round(r[2].reduce(function (s, k) { return s + val(p, k); }, 0) / r[2].length), cat['tr_' + TRK[i]]) }; }).sort(function (a, b) { return b.score - a.score; });
    return { key: rank[0].key, name: rank[0].name, emoji: rank[0].emoji, text: rank[0].text.charAt(0).toUpperCase() + rank[0].text.slice(1) + '.', second: rank[1], ranked: rank, conf: C(22 + (rank[0].score - rank[1].score) * 1.5 + ev('team')) };
  }
  function core(p, style, ev, tl, deepUsed) {
    var t = { four: four(p, ev), ennea: ennea(p, ev, tl.cat), temper: temper(p, ev), arche: arche(p, ev, tl.cat), disc: disc(p, ev, tl.cat), attach: attach(p, ev), cognitive: cognitive(p, ev, tl.cat), learning: learning(p, ev, tl.cat), sloan: sloan(p, ev), cluster: cluster(p, ev) };
    if (style && ATTN[style] && !tl.per.attach && !deepUsed) { t.attach.key = style; t.attach.name = ATTN[style][0]; t.attach.emoji = ATTN[style][1]; }
    t.thinking = thinking(p, ev); t.team = team(p, ev, tl.cat);
    t.socionics = socionics(t.four); return t;
  }
  function all(p0, style, opt) {
    opt = opt || {}; var p = {}, k;
    for (k in (p0 || {})) if (num(p0[k])) p[k] = p0[k];
    var KEYS = ['O', 'C', 'E', 'A', 'N', 'O_fantasy', 'O_ideas', 'O_adventure', 'C_order', 'C_discipline', 'C_achievement', 'E_sociability', 'E_assertiveness', 'E_excitement', 'A_trust', 'A_empathy', 'A_cooperation', 'N_anxiety', 'N_anger', 'N_selfcon', 'att_anxiety', 'att_avoidance',
      'cf_competing', 'cf_collaborating', 'cf_compromising', 'cf_accommodating', 'cf_avoiding', 'v_self_direction', 'v_stimulation', 'v_hedonism', 'v_achievement', 'v_power', 'v_security', 'v_conformity', 'v_tradition', 'v_benevolence', 'v_universalism',
      'cope_tackle', 'cope_support', 'cope_distract', 'cope_reframe', 'cope_withdraw', 'cope_express', 'dm_rational', 'dm_intuitive', 'dm_dependent', 'dm_avoidant', 'dm_spontaneous', 'dm_maximizer', 'dm_risk'];
    var missing = 0; KEYS.forEach(function (x) { if (!num(p[x])) { p[x] = 50; missing++; } });
    var deepUsed = deepNudge(p, opt.deep), tl = addonTally(opt.addon, opt.AQ);
    /* 1.1.6 thinking-style base estimates (rough, from the main quiz) so the optional quiz can blend into them */
    p.ts_whole = mean([p.O_fantasy, p.dm_intuitive, inv(p.C_order), inv(p.dm_rational)]); p.ts_visual = mean([p.O_fantasy, p.O_adventure, inv(p.E_sociability)]); p.ts_field = mean([p.v_self_direction, inv(p.v_conformity), inv(p.dm_dependent)]);
    for (k in tl.axis) if (num(p[k])) p[k] = blend(p[k], tl.axis[k]);
    if (!num(p.v_tradition)) p.v_tradition = p.v_conformity;
    var ev = function (sys) { return (deepUsed ? 4 : 0) + Math.min(30, 5 * (tl.per[sys] || 0)) - (missing > 20 ? 15 : missing > 8 ? 6 : 0); };
    var t0 = core(p, style, ev, tl, deepUsed), ov = cleanOv(opt.ov), t = t0, pp = p;
    if (ov) { pp = {}; for (k in p) pp[k] = p[k]; nudge(pp, ov); t = core(pp, style, ev, tl, deepUsed);
      if (ov.four || ov.socionics) { t.four.self = true; t.four.inferred = { code: t0.four.code, name: t0.four.name, conf: t0.four.conf }; t.four.same = t0.four.code === t.four.code;
        t.socionics = socionics(t.four); t.socionics.self = true; t.socionics.inferred = { code: t0.socionics.code, name: t0.socionics.name, conf: t0.socionics.conf }; t.socionics.same = t0.socionics.code === t.socionics.code; }
      ['ennea', 'temper', 'arche', 'disc', 'attach', 'cognitive', 'learning', 'cluster'].forEach(function (s) { if (ov[s]) selfMark(t, t0, s, ov[s]); }); }
    t.tags = tags(pp); t.taxonomy = taxonomy(t, pp);
    t.big5 = BF.map(function (x) { return { key: x, score: Math.round(pp[x]) }; });
    t.used = { main: true, deep: deepUsed, addon: Object.keys(tl.per).reduce(function (s, x) { return s + tl.per[x]; }, 0), addonPer: tl.per, retake: tl.rt, missing: missing };
    t.ov = ov; t.p = pp; t.lenses = lenses(t, pp, opt);
    return t;
  }
  function fromScore(sc, opt) { var p = {}, n = {}; for (var k in (sc && sc.scales || {})) { p[k] = sc.scales[k].pct; n[k] = sc.scales[k].n; } opt = opt || {}; opt.n = n; return all(p, sc && sc.attachment && sc.attachment.style, opt); }
  function fromCompact(c, opt) { return all(c && c.scales || {}, c && c.attachment, opt); }
  function brief(t) {
    return { four: t.four.code, fourName: t.four.name, socionics: t.socionics ? t.socionics.code : '', self: t.ov || null, inferredFour: t.four.self ? t.four.inferred.code : null, ennea: t.ennea.code, enneaName: t.ennea.name, temper: t.temper.name, arche: t.arche.name, sloan: t.sloan.code, attach: t.attach.name,
      disc: t.disc.code + ' (' + t.disc.color + ')', cognitive: t.cognitive.name, learning: t.learning.name, cluster: t.cluster.name, clusterEmoji: t.cluster.emoji, clusterMatch: t.cluster.match, family: t.four.group, tags: t.tags };
  }
  function line(b) { return b ? [b.four + ' ' + b.fourName, b.clusterEmoji + ' ' + b.cluster + ' ' + b.clusterMatch + '%', 'Enneagram ' + b.ennea, b.temper, b.arche, b.sloan, b.attach, 'DISC ' + b.disc].join(' \u00b7 ') : ''; }
  window.MPTypes = { all: all, fromScore: fromScore, fromCompact: fromCompact, brief: brief, line: line, CLUSTERS: CL, FOUR: FOUR, DEEP: DEEP, SOC: SOC, EN: EN, AR: AR, DISC: DISC, TEMP: TEMP, ATTN: ATTN, CG: CG, LS: LS, OVSYS: OVSYS, cleanOv: cleanOv, socToMbti: socToMbti, mbtiToSoc: mbtiToSoc, TG: TG, ROLES: ROLES, TSN: TSN, TRK: TRK, STEREO: STEREO, GROUP: GROUP, BF: BF, SL: SL, DUAL: DUAL, QUADRA: QUADRA, K: K };
})();
