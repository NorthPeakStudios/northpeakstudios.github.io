/* Mindprint scoring + plain-English summaries (Northpeak Studios). Runs on the phone; answers never leave it unencrypted.
   Every option in data/questions.json carries {scale: points}. Facet points (O_x, C_x...) also count toward the trait letter.
   Each scale is 0-100 between the lowest and highest total the answered questions could have produced. */
(function () {
  'use strict';
  var BIG5 = /^([OCEAN])_/;
  function contrib(s) { var o = {}; for (var k in (s || {})) { o[k] = (o[k] || 0) + s[k]; var m = BIG5.exec(k); if (m) o[m[1]] = (o[m[1]] || 0) + s[k]; } return o; }
  function score(Q, answers) {
    var raw = {}, lo = {}, hi = {}, n = {}, byId = {};
    Q.questions.forEach(function (q) { byId[q.id] = q; });
    answers.forEach(function (a) {
      var q = byId[a.q]; if (!q || a.a == null) return;
      var cs = q.options.map(function (o) { return contrib(o.s); }), keys = {};
      cs.forEach(function (c) { for (var k in c) keys[k] = 1; });
      for (var k in keys) {
        var vals = cs.map(function (c) { return c[k] || 0; });
        lo[k] = (lo[k] || 0) + Math.min.apply(null, vals); hi[k] = (hi[k] || 0) + Math.max.apply(null, vals);
        raw[k] = (raw[k] || 0) + ((cs[a.a] || {})[k] || 0); n[k] = (n[k] || 0) + 1;
      }
    });
    var scales = {};
    for (var k in hi) { var span = hi[k] - lo[k]; scales[k] = { raw: raw[k], pct: span ? Math.round(100 * (raw[k] - lo[k]) / span) : 50, n: n[k] }; }
    function group(pre) {
      var arr = Object.keys(scales).filter(function (k) { return k.indexOf(pre) === 0 && k !== 'dm_maximizer' && k !== 'dm_risk'; })
        .map(function (k) { return { key: k, raw: scales[k].raw, pct: scales[k].pct, n: scales[k].n }; })
        .sort(function (a, b) { return b.raw - a.raw || b.pct - a.pct; });
      var t = arr.reduce(function (s, x) { return s + Math.max(0, x.raw); }, 0) || 1;
      arr.forEach(function (x) { x.share = Math.round(100 * Math.max(0, x.raw) / t); });
      return arr;
    }
    var anx = scales.att_anxiety ? scales.att_anxiety.pct : 50, av = scales.att_avoidance ? scales.att_avoidance.pct : 50;
    var style = anx < 50 && av < 50 ? 'secure' : anx >= 50 && av < 50 ? 'anxious' : anx < 50 ? 'avoidant' : 'fearful';
    return { scales: scales, attachment: { anxiety: anx, avoidance: av, style: style }, conflict: group('cf_'), values: group('v_'), coping: group('cope_'), decision: group('dm_') };
  }
  function band(p) { return p >= 80 ? 'Very high' : p >= 60 ? 'High' : p >= 41 ? 'Middle' : p >= 21 ? 'Low' : 'Very low'; }
  function lvl(p) { return p >= 60 ? 'hi' : p <= 40 ? 'lo' : 'mid'; }
  /* fewer than 4 questions behind a scale: say "leans toward" instead of stating it */
  function few(sc, k) { return !sc.scales[k] || sc.scales[k].n < 4; }

  var NAMES = {}; // filled from data/questions.json scales
  var BIG = {
    O: { hi: 'You are curious and imaginative. New ideas, art, big questions and new experiences pull you in, and routine bores you faster than most people.',
         mid: 'You like some new things and some familiar ones. You can get into a big idea, but you do not need novelty all the time.',
         lo: 'You are practical and down to earth. You like what works, prefer the familiar, and would rather do something real than talk about theories.' },
    C: { hi: 'You are organized and driven. You plan ahead, follow through, and feel good when things are done properly.',
         mid: 'You get things done when they matter, but you are not rigid about plans. Some days are tidy and some are chaos, and you are fine with that.',
         lo: 'You are flexible and spontaneous. Plans and schedules feel like a cage, and you tend to do things at the last minute, often in a burst.' },
    E: { hi: 'You get energy from people. You like being around others, speaking up, and doing things that feel exciting.',
         mid: 'You are in the middle on social energy. You enjoy people, and you also need some time to yourself to recharge.',
         lo: 'You recharge on your own. You prefer small groups or one-on-one time, and a long day around lots of people drains you.' },
    A: { hi: 'You are warm, trusting and kind. You notice how others feel and you would usually rather keep the peace than win an argument.',
         mid: 'You are kind, but you will stand your ground when it matters. You can cooperate or push back depending on the situation.',
         lo: 'You are direct and independent. You say what you think, question people\u2019s motives, and you are not afraid of a disagreement.' },
    N: { hi: 'You feel things strongly. Stress, worry and frustration hit you hard, and you might replay things in your head long after they happen.',
         mid: 'You feel stress like anyone, but it usually does not take over. Some things get to you and others roll off.',
         lo: 'You are calm and steady. Stress tends to roll off you, and you bounce back quickly when things go wrong.' }
  };
  var ATT = {
    secure: { name: 'Secure', text: 'You are mostly comfortable getting close to people and also fine on your own. You trust that your people will be there, and you do not spend much energy worrying about it.' },
    anxious: { name: 'Reassurance-seeking (anxious-leaning)', text: 'You care a lot about your close relationships and you notice small changes in them. When someone goes quiet, you might wonder if something is wrong and want some reassurance.' },
    avoidant: { name: 'Independent (avoidant-leaning)', text: 'You value your independence and like to handle things yourself. Getting very close or depending on others can feel uncomfortable, so you sometimes keep a bit of distance.' },
    fearful: { name: 'Mixed (wants closeness, guards it)', text: 'You want close relationships, and part of you also protects yourself from getting hurt. You might go back and forth between reaching out and pulling back.' }
  };
  var CF = { cf_competing: 'you stand up for your side and aim to win the argument', cf_collaborating: 'you try to work things out so both people get what they need', cf_compromising: 'you look for a fair middle ground quickly', cf_accommodating: 'you often give way to keep the peace', cf_avoiding: 'you step back and let things cool off instead of arguing' };
  var VAL = { v_self_direction: 'freedom to do things your way', v_stimulation: 'new experiences', v_hedonism: 'enjoying life', v_achievement: 'success', v_power: 'influence', v_security: 'feeling safe', v_conformity: 'following the rules', v_tradition: 'tradition', v_benevolence: 'taking care of your people', v_universalism: 'fairness for everyone' };
  var COPE = { cope_tackle: 'tackle the problem head-on', cope_support: 'reach out to someone you trust', cope_distract: 'distract yourself with something else', cope_reframe: 'look for the bright side or a new way to see it', cope_express: 'let your feelings out', cope_withdraw: 'go quiet and handle it on your own' };
  var DM = { dm_rational: 'think it through and weigh the options', dm_intuitive: 'go with your gut', dm_dependent: 'ask people you trust what they think', dm_spontaneous: 'decide fast and figure it out as you go', dm_avoidant: 'put the decision off until you have to make it' };

  function nm(k) { return (NAMES[k] && NAMES[k].name) || k; }
  function lead(sc, k) { return few(sc, k) ? 'You lean toward ' : 'You '; }
  function top(arr, m) { return arr.filter(function (x) { return x.raw > 0; }).slice(0, m || 1); }
  function list(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }

  /* short plain-English summary per framework (the free results page) */
  function summaries(sc) {
    var s = sc.scales, out = [];
    out.push({ id: 'big5', title: 'Big Five personality', keys: ['O', 'C', 'E', 'A', 'N'], text: 'The Big Five is the most widely used model of personality in psychology. Here is where you landed on each trait.' ,
      items: ['O', 'C', 'E', 'A', 'N'].filter(function (k) { return s[k]; }).map(function (k) { return { key: k, name: nm(k), pct: s[k].pct, band: band(s[k].pct), text: (few(sc, k) ? 'Leaning: ' : '') + BIG[k][lvl(s[k].pct)] }; }) });
    var at = ATT[sc.attachment.style], fewA = few(sc, 'att_anxiety') || few(sc, 'att_avoidance');
    out.push({ id: 'attach', title: 'Attachment style', keys: ['att_anxiety', 'att_avoidance'], text: (fewA ? 'Your attachment style leans ' : 'Your attachment style looks ') + at.name.toLowerCase() + '. ' + at.text });
    var c = top(sc.conflict, 2);
    if (c.length) out.push({ id: 'conflict', title: 'Conflict style', keys: sc.conflict.map(function (x) { return x.key; }), text: 'When things clash, ' + CF[c[0].key] + '.' + (c[1] ? ' Your backup style: ' + CF[c[1].key] + '.' : '') });
    var v = top(sc.values, 3);
    if (v.length) out.push({ id: 'values', title: 'What matters to you', keys: sc.values.map(function (x) { return x.key; }), text: 'Your answers point to ' + list(v.map(function (x) { return VAL[x.key] || nm(x.key); })) + ' as the things you care about most.' });
    var cp = top(sc.coping, 2);
    if (cp.length) out.push({ id: 'stress', title: 'Under pressure', keys: sc.coping.map(function (x) { return x.key; }), text: 'When you are stressed, your first move is to ' + COPE[cp[0].key] + (cp[1] ? ', and you also tend to ' + COPE[cp[1].key] : '') + '.' });
    if (s.E_sociability) { var p = s.E_sociability.pct; out.push({ id: 'social', title: 'Social battery', keys: ['E_sociability'], text: lead(sc, 'E_sociability') + (p >= 60 ? 'recharge around people. Being social gives you energy, and too much alone time gets old fast.' : p <= 40 ? 'recharge alone. You can enjoy people, but you need quiet time afterwards to feel like yourself again.' : 'sit in the middle: some days you want people around and some days you need your own space.') }); }
    var dm = top(sc.decision, 1);
    if (dm.length) { var t = 'When you make a choice, you mostly ' + DM[dm[0].key] + '.'; if (s.dm_maximizer) t += s.dm_maximizer.pct >= 60 ? ' You like to find the best option, even if it takes a while.' : s.dm_maximizer.pct <= 40 ? ' You are happy with "good enough" and move on.' : ''; if (s.dm_risk) t += s.dm_risk.pct >= 60 ? ' You are fine taking risks.' : s.dm_risk.pct <= 40 ? ' You like to play it safe.' : '';
      out.push({ id: 'decide', title: 'How you decide', keys: sc.decision.map(function (x) { return x.key; }).concat(['dm_maximizer', 'dm_risk']), text: t }); }
    return out;
  }
  /* the three or four things that stand out most (furthest from the middle) */
  function headlines(sc) {
    var cand = [], s = sc.scales;
    var H = { O: ['The curious one', 'The practical one'], C: ['The planner', 'The free spirit'], E: ['The people person', 'The recharger'], A: ['The peacekeeper', 'The straight shooter'], N: ['The deep feeler', 'The steady one'],
      O_fantasy: ['Big imagination', 'Feet on the ground'], A_empathy: ['Big heart', 'Cool head'], E_excitement: ['Thrill seeker', 'Calm over chaos'], N_anxiety: ['The overthinker', 'The low-worry type'], A_trust: ['Trusts easily', 'Trust is earned'], C_order: ['Everything in its place', 'Organized chaos'] };
    Object.keys(H).forEach(function (k) { if (s[k] && s[k].n >= 2) { var d = s[k].pct - 50; if (Math.abs(d) >= 12) cand.push({ key: k, d: Math.abs(d) + (k.length === 1 ? 4 : 0), title: H[k][d > 0 ? 0 : 1], pct: s[k].pct }); } });
    cand.sort(function (a, b) { return b.d - a.d; });
    var seen = {}, out = [];
    cand.forEach(function (c) { var g = c.key[0]; if (out.length < 4 && !seen[c.title] && !seen[g]) { seen[c.title] = 1; seen[g] = (seen[g] || 0) + 1; out.push(c); } });
    return out;
  }
  /* Deep Dive personalization flags, from main-quiz scores */
  function flags(sc) {
    var p = {}; for (var k in (sc.scales || {})) p[k] = sc.scales[k].pct;
    var ge = function (k, t) { return typeof p[k] === 'number' && p[k] >= t; }, le = function (k, t) { return typeof p[k] === 'number' && p[k] <= t; }, f = [];
    if (ge('A_cooperation', 65)) f.push('harmony');
    if (le('E_sociability', 45) || ge('v_benevolence', 60)) f.push('smallcircle');
    if (/anxious|fearful/.test(sc.attachment && sc.attachment.style || '') || ge('att_anxiety', 60)) f.push('anxious');
    if (ge('O_fantasy', 60)) f.push('imagination');
    if (le('C_discipline', 40)) f.push('lastminute');
    if (ge('v_conformity', 65)) f.push('tradition');
    if (ge('cope_withdraw', 45) || le('cope_support', 25)) f.push('quiet');
    return f;
  }
  window.MPScore = { score: score, band: band, lvl: lvl, few: few, summaries: summaries, headlines: headlines, flags: flags, setNames: function (s) { NAMES = s || {}; }, nm: nm,
    BIG: BIG, ATT: ATT, CF: CF, VAL: VAL, COPE: COPE, DM: DM, list: list, top: top };
})();
