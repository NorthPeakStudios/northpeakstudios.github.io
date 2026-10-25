/* Mindprint "Your types" hub (Northpeak Studios), v2. Every result here is INFERRED from answers you already gave:
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
    var byId = {}, ax = {}, axMax = {}, cat = {}, catMax = {}, per = {};
    ((AQ && AQ.questions) || []).forEach(function (q) { byId[q.id] = q; });
    (addon || []).forEach(function (a) { var q = byId[a.q]; if (!q) return; per[q.sys] = (per[q.sys] || 0) + 1;
      var o = a.a != null && a.a >= 0 ? q.options[a.a] : null, keys = {};
      q.options.forEach(function (op) { for (var k in (op.v || {})) keys[k] = 1; });
      for (var k in keys) { var mx = Math.max.apply(null, q.options.map(function (op) { return Math.abs((op.v || {})[k] || 0); })) || 1, w = o && o.v ? (o.v[k] || 0) : null;
        if (w == null) continue; // Other: unscored
        if (/^(e\d|ar_|ds_|cg_|ls_)/.test(k)) { cat[k] = (cat[k] || 0) + Math.max(0, w); catMax[k] = (catMax[k] || 0) + mx; }
        else { ax[k] = (ax[k] || 0) + w; axMax[k] = (axMax[k] || 0) + mx; } } });
    var axis = {}, cats = {};
    for (var a in ax) axis[a] = { pct: clamp(50 + 50 * ax[a] / axMax[a], 0, 100), n: axMax[a] };
    for (var c in cat) cats[c] = { pct: 100 * cat[c] / catMax[c], n: catMax[c] };
    return { axis: axis, cat: cats, per: per };
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

  function all(p0, style, opt) {
    opt = opt || {}; var p = {}, k;
    for (k in (p0 || {})) if (num(p0[k])) p[k] = p0[k];
    var KEYS = ['O', 'C', 'E', 'A', 'N', 'O_fantasy', 'O_ideas', 'O_adventure', 'C_order', 'C_discipline', 'C_achievement', 'E_sociability', 'E_assertiveness', 'E_excitement', 'A_trust', 'A_empathy', 'A_cooperation', 'N_anxiety', 'N_anger', 'N_selfcon', 'att_anxiety', 'att_avoidance',
      'cf_competing', 'cf_collaborating', 'cf_compromising', 'cf_accommodating', 'cf_avoiding', 'v_self_direction', 'v_stimulation', 'v_hedonism', 'v_achievement', 'v_power', 'v_security', 'v_conformity', 'v_tradition', 'v_benevolence', 'v_universalism',
      'cope_tackle', 'cope_support', 'cope_distract', 'cope_reframe', 'cope_withdraw', 'cope_express', 'dm_rational', 'dm_intuitive', 'dm_dependent', 'dm_avoidant', 'dm_spontaneous', 'dm_maximizer', 'dm_risk'];
    var missing = 0; KEYS.forEach(function (x) { if (!num(p[x])) { p[x] = 50; missing++; } });
    var deepUsed = deepNudge(p, opt.deep), tl = addonTally(opt.addon, opt.AQ);
    for (k in tl.axis) if (num(p[k])) p[k] = blend(p[k], tl.axis[k]);
    if (!num(p.v_tradition)) p.v_tradition = p.v_conformity;
    var mainN = 0; for (k in (opt.n || {})) mainN += opt.n[k] > 0 ? 1 : 0;
    var ev = function (sys) { return (deepUsed ? 4 : 0) + Math.min(30, 5 * (tl.per[sys] || 0)) - (missing > 20 ? 15 : 0); };
    var t = { four: four(p, ev), ennea: ennea(p, ev, tl.cat), temper: temper(p, ev), arche: arche(p, ev, tl.cat), disc: disc(p, ev, tl.cat), attach: attach(p, ev), cognitive: cognitive(p, ev, tl.cat), learning: learning(p, ev, tl.cat), sloan: sloan(p, ev), cluster: cluster(p, ev) };
    if (style && ATTN[style] && !tl.per.attach && !deepUsed) { t.attach.key = style; t.attach.name = ATTN[style][0]; t.attach.emoji = ATTN[style][1]; }
    t.tags = tags(p); t.taxonomy = taxonomy(t, p);
    t.big5 = BF.map(function (x) { return { key: x, score: Math.round(p[x]) }; });
    t.used = { main: true, deep: deepUsed, addon: Object.keys(tl.per).reduce(function (s, x) { return s + tl.per[x]; }, 0), addonPer: tl.per };
    return t;
  }
  function fromScore(sc, opt) { var p = {}, n = {}; for (var k in (sc && sc.scales || {})) { p[k] = sc.scales[k].pct; n[k] = sc.scales[k].n; } opt = opt || {}; opt.n = n; return all(p, sc && sc.attachment && sc.attachment.style, opt); }
  function fromCompact(c, opt) { return all(c && c.scales || {}, c && c.attachment, opt); }
  function brief(t) {
    return { four: t.four.code, fourName: t.four.name, ennea: t.ennea.code, enneaName: t.ennea.name, temper: t.temper.name, arche: t.arche.name, sloan: t.sloan.code, attach: t.attach.name,
      disc: t.disc.code + ' (' + t.disc.color + ')', cognitive: t.cognitive.name, learning: t.learning.name, cluster: t.cluster.name, clusterEmoji: t.cluster.emoji, clusterMatch: t.cluster.match, family: t.four.group, tags: t.tags };
  }
  function line(b) { return b ? [b.four + ' ' + b.fourName, b.clusterEmoji + ' ' + b.cluster + ' ' + b.clusterMatch + '%', 'Enneagram ' + b.ennea, b.temper, b.arche, b.sloan, b.attach, 'DISC ' + b.disc].join(' \u00b7 ') : ''; }
  window.MPTypes = { all: all, fromScore: fromScore, fromCompact: fromCompact, brief: brief, line: line, CLUSTERS: CL, FOUR: FOUR, DEEP: DEEP };
})();
