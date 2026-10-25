/* Mindprint full report (Pro): a longer, rule-based write-up that ties the main quiz and the Deep Dive together.
   Kind, specific, never clinical. Traits backed by fewer than 4 questions are worded as "leans toward". */
(function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var P = function (t) { return '<p>' + t + '</p>'; };
  function S() { return window.MPScore; }
  function pct(sc, k) { return sc.scales[k] ? sc.scales[k].pct : null; }
  function hi(sc, k, t) { var p = pct(sc, k); return p != null && p >= (t || 60); }
  function lo(sc, k, t) { var p = pct(sc, k); return p != null && p <= (t || 40); }
  function lean(sc, k) { return S().few(sc, k) ? 'lean toward being' : 'are'; }
  function ansText(Q, r, id) { var q = Q.questions.find(function (x) { return x.id === id; }), a = r.answers.find(function (x) { return x.q === id; }); return q && a ? q.options[a.a].t : null; }

  var FACET = {
    O_fantasy: ['You have a vivid imagination and probably drift into daydreams, stories or "what if" thinking.', 'You keep your feet on the ground and prefer real things to daydreams.'],
    O_ideas: ['You like big questions and figuring out how things work.', 'You care more about what is useful than about abstract ideas.'],
    O_adventure: ['You like trying new things, places and foods.', 'You like your routines and the things you already know you enjoy.'],
    C_order: ['You like things neat and in their place.', 'A little mess does not bother you much.'],
    C_discipline: ['You can make yourself do things even when you do not feel like it.', 'Starting things you do not feel like doing is hard, so deadlines are often what gets you moving.'],
    C_achievement: ['You set high goals and want to do things well.', 'You do not put a lot of pressure on yourself to be the best.'],
    E_sociability: ['Being around people fills your tank.', 'Time alone is how you recharge.'],
    E_assertiveness: ['You speak up and are comfortable taking the lead.', 'You would rather listen than take charge, at least at first.'],
    E_excitement: ['You like thrills, noise and adventure.', 'You prefer calm over chaos.'],
    A_trust: ['You assume the best about people.', 'You let people earn your trust before you give it.'],
    A_empathy: ['You feel what other people are feeling, sometimes strongly.', 'You keep a cool head when others are emotional.'],
    A_cooperation: ['You would rather keep the peace than argue.', 'You are fine with a disagreement when something matters.'],
    N_anxiety: ['You tend to overthink and replay things.', 'You do not worry much about what might go wrong.'],
    N_anger: ['Little things can get under your skin.', 'It takes a lot to make you lose your temper.'],
    N_selfcon: ['You can feel self-conscious about how you come across.', 'You do not worry much about what others think of you.']
  };
  var WHY = {
    O: ['People high in openness often grew up around books, art, conversation or freedom to explore, or just have a brain that loves novelty.', 'People with a practical streak often value what has worked before and trust experience over theory.'],
    C: ['A strong sense of order often comes from wanting control and predictability, and from feeling good when things are finished.', 'A flexible style often comes from working best under pressure and from valuing freedom over structure.'],
    E: ['Outgoing people get a real energy boost from social contact, which keeps pulling them back toward people.', 'Quieter people process a lot internally, so busy social settings use up energy faster.'],
    A: ['Caring, cooperative people often learned early that relationships run better when everyone gets along.', 'Direct people often value honesty over comfort and would rather deal with a problem than smooth it over.'],
    N: ['People who feel things strongly usually have a very alert "early warning system": it notices problems early, which is useful, and also tiring.', 'Calm people tend to see setbacks as temporary, which keeps stress from building up.']
  };

  function bigFive(sc) {
    var B = S().BIG, out = '';
    ['O', 'C', 'E', 'A', 'N'].forEach(function (k) {
      if (!sc.scales[k]) return; var p = sc.scales[k].pct, L = S().lvl(p);
      var fs = Object.keys(sc.scales).filter(function (f) { return f.indexOf(k + '_') === 0; }).sort(function (a, b) { return sc.scales[b].pct - sc.scales[a].pct; });
      var notes = [];
      if (fs.length) { var top = fs[0], bot = fs[fs.length - 1];
        if (sc.scales[top].pct >= 60) notes.push(FACET[top][0]);
        if (bot !== top && sc.scales[bot].pct <= 40) notes.push(FACET[bot][1]); }
      out += '<h3>' + esc(S().nm(k)) + ': ' + p + '/100 (' + S().band(p).toLowerCase() + ')</h3>' + P(esc((S().few(sc, k) ? 'You lean this way, but only a few questions measured it. ' : '') + B[k][L])) +
        (notes.length ? P(esc(notes.join(' '))) : '') + (L !== 'mid' ? P('<i>Why you might be like this:</i> ' + esc(WHY[k][L === 'hi' ? 0 : 1])) : '');
    });
    return out;
  }
  function strengths(sc) {
    var s = [];
    if (hi(sc, 'A_empathy')) s.push('You notice how people feel, often before they say anything. That makes you a friend people trust.');
    if (hi(sc, 'A_cooperation')) s.push('You keep groups calm and help people get along.');
    if (hi(sc, 'O_fantasy') || hi(sc, 'O')) s.push('You are creative and can come up with ideas other people would not think of.');
    if (hi(sc, 'O_ideas')) s.push('You are curious and like to understand things deeply.');
    if (hi(sc, 'C')) s.push('You are reliable. When you say you will do something, it usually gets done.');
    if (hi(sc, 'E_assertiveness')) s.push('You can speak up and lead when a group needs direction.');
    if (hi(sc, 'E_sociability')) s.push('You bring energy to a room and make it easier for others to join in.');
    if (lo(sc, 'N')) s.push('You stay steady under pressure, which helps the people around you stay calm too.');
    if (hi(sc, 'v_benevolence')) s.push('You are loyal and take care of the people close to you.');
    if (hi(sc, 'v_universalism')) s.push('You care about fairness and the bigger picture.');
    if (hi(sc, 'cope_tackle')) s.push('When something goes wrong, you deal with it instead of letting it pile up.');
    if (hi(sc, 'cope_reframe')) s.push('You can find a different way to look at a bad situation.');
    if (sc.attachment.style === 'secure') s.push('You can be close to people without losing yourself, which makes your friendships steady.');
    if (s.length < 3) s.push('You see more than one side of things, which makes you adaptable.', 'You are balanced: you can adjust to many kinds of people and situations.');
    return s.slice(0, 6);
  }
  function blindSpots(sc) {
    var s = [];
    if (hi(sc, 'A_cooperation') || hi(sc, 'cf_accommodating', 55)) s.push('Keeping the peace can mean swallowing what you really think. Your needs count as much as anyone else\u2019s.');
    if (hi(sc, 'N_anxiety')) s.push('Overthinking can make small things feel bigger than they are. Writing a worry down or saying it out loud often shrinks it.');
    if (lo(sc, 'C_discipline')) s.push('Leaving things to the last minute works until it doesn\u2019t. Breaking a big task into a tiny first step makes starting easier.');
    if (hi(sc, 'cope_withdraw', 45) || lo(sc, 'cope_support', 25)) s.push('Handling everything on your own can be lonely. Letting one trusted person in is a strength, not a weakness.');
    if (hi(sc, 'E_excitement') && lo(sc, 'C')) s.push('Chasing excitement can lead to decisions you regret later. A short pause before saying yes can help.');
    if (lo(sc, 'A_trust')) s.push('Being careful with trust protects you, but it can also keep good people at a distance.');
    if (hi(sc, 'cf_competing', 55)) s.push('Wanting to win an argument can make people feel unheard, even when you are right.');
    if (hi(sc, 'dm_maximizer')) s.push('Looking for the perfect option can make decisions slow and stressful. "Good enough" is often good enough.');
    if (hi(sc, 'N_selfcon')) s.push('You might worry more about how you come across than other people actually notice.');
    if (s.length < 3) s.push('Being in the middle on most things can make it hard to know what you want. Notice what you keep coming back to.', 'Adapting to everyone is useful, but make sure you also say what you prefer.');
    return s.slice(0, 5);
  }
  function relationships(sc) {
    var t = [], st = sc.attachment.style, A = S().ATT[st];
    t.push(A.text);
    if (lo(sc, 'E_sociability', 45)) t.push('You probably prefer a few close friends over a big group, and those friendships run deep.');
    else if (hi(sc, 'E_sociability')) t.push('You likely have a wide circle and enjoy meeting new people.');
    if (hi(sc, 'A_empathy')) t.push('Friends probably come to you when something is wrong, because you actually listen.');
    if (st === 'anxious') t.push('What helps: telling people you trust when you need reassurance, instead of guessing what their silence means.');
    if (st === 'avoidant') t.push('What helps: letting people in a little at a time. Closeness does not have to cost your independence.');
    if (st === 'fearful') t.push('What helps: finding people who are steady and consistent, and noticing that it is safe to rely on them.');
    var c = S().top(sc.conflict, 1)[0]; if (c) t.push('In disagreements, ' + S().CF[c.key] + '.');
    return t;
  }
  function fit(sc) {
    var t = [];
    if (hi(sc, 'O')) t.push('You will probably enjoy classes and work that involve ideas, creativity or problem-solving more than repetition.');
    if (lo(sc, 'O')) t.push('You will probably enjoy hands-on, practical work with clear results.');
    if (hi(sc, 'C')) t.push('Structured environments with clear goals suit you, and you can handle long projects.');
    if (lo(sc, 'C')) t.push('You work best with variety, short deadlines and some freedom in how you get things done. Calendars and reminders are your friends.');
    if (hi(sc, 'E')) t.push('Team projects, presenting and jobs with lots of people contact play to your strengths.');
    if (lo(sc, 'E')) t.push('You likely do your best work with focus time and smaller teams.');
    if (hi(sc, 'A_empathy') || hi(sc, 'v_benevolence')) t.push('Paths that involve helping people, like teaching, health care, counseling or care work, may feel meaningful to you.');
    if (hi(sc, 'O_fantasy')) t.push('Creative paths like design, writing, art, music or game-making may be worth exploring.');
    if (hi(sc, 'O_ideas')) t.push('Science, engineering, research or anything that rewards curiosity may suit you.');
    if (hi(sc, 'E_assertiveness') && hi(sc, 'v_achievement', 55)) t.push('You may enjoy leadership roles, competition or starting your own projects.');
    if (!t.length) t.push('Your balanced profile means you can do well in many settings. Pay attention to which classes make time fly.');
    return t;
  }

  /* ---- Deep Dive ---- */
  function deepAns(D, deep, id) { var a = deep.answers.find(function (x) { return x.q === id; }); if (!a) return null; var q = D.questions.find(function (x) { return x.id === id; }); return { q: q, v: a.v, t: a.t || (q && q.text) }; }
  function fmtV(q, v) { if (v == null) return null; if (q.type === 'choice') return q.options[v]; if (q.type === 'multi') return v.map(function (k) { return q.options[k]; }).join(', '); if (q.type === 'scale') return v + ' of 5 (1 = ' + q.scale[0].toLowerCase() + ', 5 = ' + q.scale[1].toLowerCase() + ')'; return String(v); }
  function quote(s) { return '<div class="quote">\u201c' + esc(s) + '\u201d</div>'; }
  function deepSection(Q, D, sc, deep) {
    var out = '<h2 class="pb">Where it comes from: your Deep Dive</h2>' + P('Based on your Deep Dive from ' + new Date(deep.at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) + '. You answered ' + deep.answers.length + ' of 50 questions. Childhood is only one part of the story, and none of this is a diagnosis. It is a chance to notice patterns.');
    var A = function (id) { return deepAns(D, deep, id); }, links = [];
    var home = A('d02'), talk = A('d09'), adults = A('d17'), you = A('d19'), role = A('d18'), mess = A('d24'), sting = A('d27'), go = A('d45'), stable = A('d42'), shaped = A('d49');
    if (home) links.push('When you picture the home you grew up in, the first feeling is \u201c' + esc(fmtV(home.q, home.v)) + '.\u201d');
    if (adults && hi(sc, 'A_cooperation')) links.push('Your harmony-seeking score is ' + pct(sc, 'A_cooperation') + '/100, and when the adults at home disagreed, what usually happened was \u201c' + esc(fmtV(adults.q, adults.v)) + '.\u201d Kids often learn how to handle conflict by watching how the grown-ups do it.');
    else if (adults) links.push('When the adults at home disagreed: \u201c' + esc(fmtV(adults.q, adults.v)) + '.\u201d How we saw conflict handled as kids often shapes how we handle it now.');
    if (you) { var c = S().top(sc.conflict, 1)[0]; links.push('As a kid, when you disagreed with a parent or guardian, you usually \u201c' + esc(fmtV(you.q, you.v).toLowerCase()) + '.\u201d' + (c ? ' Today your main conflict style is that ' + S().CF[c.key] + '.' : '')); }
    if (talk) links.push('Your family was a \u201c' + esc(fmtV(talk.q, talk.v).toLowerCase()) + '\u201d kind of family when it came to feelings.' + (hi(sc, 'cope_withdraw', 45) || lo(sc, 'cope_support', 25) ? ' That may connect to how you handle stress now: you tend to keep things to yourself.' : hi(sc, 'cope_support') ? ' Today you reach out to people when you are stressed, which is a real strength.' : ''));
    if (sting && sting.v >= 4 && hi(sc, 'N_selfcon')) links.push('Criticism stung a lot when you were little (' + sting.v + ' of 5), and you still score high on self-consciousness. Being sensitive to criticism often starts early and fades as you learn your own worth.');
    if (mess) links.push('When you messed up as a kid: \u201c' + esc(fmtV(mess.q, mess.v)) + '.\u201d');
    if (go) links.push('When you were upset, you went to ' + esc(fmtV(go.q, go.v).replace(/^(A|Another) /, function (m) { return m.toLowerCase(); })) + ' first.');
    if (stable) links.push('You rated how stable and predictable your childhood felt as ' + stable.v + ' of 5.' + (stable.v <= 2 && (sc.attachment.style === 'anxious' || sc.attachment.style === 'fearful') ? ' When things change a lot growing up, it makes sense to want more reassurance in relationships later.' : ''));
    if (shaped) links.push('And you think your childhood shaped who you are now ' + shaped.v + ' out of 5.');
    if (links.length) out += '<h3>Patterns worth noticing</h3>' + links.map(P).join('');
    var tl = (deep.answers || []).filter(function (a) { var q = D.questions.find(function (x) { return x.id === a.q; }); return q && q.alt && (deep.flags || []).indexOf(q.alt.flag) >= 0 && typeof a.v === 'string'; });
    if (tl.length) { out += '<h3>The questions written around your results</h3>'; tl.forEach(function (a) { out += P('<b>' + esc(a.t) + '</b>') + quote(a.v); }); }
    var bySec = {};
    deep.answers.forEach(function (a) { var q = D.questions.find(function (x) { return x.id === a.q; }); if (!q) return; (bySec[q.section] = bySec[q.section] || []).push({ q: q, a: a }); });
    out += '<h3>In your own words</h3>';
    Object.keys(bySec).forEach(function (sec) { out += '<p><b>' + esc(sec) + '</b></p>'; bySec[sec].forEach(function (x) { var v = fmtV(x.q, x.a.v); if (v == null || v === '') return; out += '<p class="muted small">' + esc(x.a.t || x.q.text) + '</p>' + (x.q.type === 'text' || x.q.type === 'finish' ? quote(v) : P(esc(v))); }); });
    var eight = A('d50'); if (eight && typeof eight.v === 'string') out += '<h3>To your eight-year-old self</h3>' + quote(eight.v) + P('That might be worth hearing again now.');
    out += '<p class="soft">If any of this brought up hard feelings, it can really help to talk to someone you trust, like a friend, a family member, a teacher or a school counselor.</p>';
    return out;
  }

  function html(Q, D, r, sc, deep) {
    var hl = S().headlines(sc), sm = S().summaries(sc), name = r.name ? esc(r.name) : '';
    var o = '<article class="rep">';
    o += '<div class="cover"><p class="eyebrow">Mindprint full report</p><h1>' + (name || 'Your Mindprint') + '</h1><p class="muted">Quiz taken ' + new Date(r.at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) + (deep ? ' \u00b7 with Deep Dive' : '') + '<br>Mindprint by Northpeak Studios</p></div>';
    o += '<p class="muted small">This report is for fun and self-reflection. It is not a psychological test or a diagnosis, and it can\u2019t tell you who you have to be. People change, and a quiz only sees what you told it on one day.</p>';
    o += '<h2>The short version</h2>';
    if (hl.length) o += hl.map(function (h) { return P('<b>' + esc(h.title) + '.</b> ' + esc(headLine(h, sc))); }).join(''); else o += P('Your answers are balanced: you sit near the middle on most traits, which usually means you adapt to the situation rather than having one fixed style.');
    o += '<h2>Your Big Five</h2>' + P('The Big Five is the most widely used model of personality. Scores run from 0 to 100, where 50 is the middle of what the questions could measure.') + bigFive(sc);
    var at = S().ATT[sc.attachment.style];
    o += '<h2>Attachment: you and your people</h2>' + P(esc((S().few(sc, 'att_anxiety') ? 'Your attachment style leans ' : 'Your attachment style looks ') + at.name.toLowerCase() + '. ' + at.text)) + P('Attachment anxiety ' + sc.attachment.anxiety + '/100 (how much you worry about closeness), attachment avoidance ' + sc.attachment.avoidance + '/100 (how much you guard your independence).');
    sm.forEach(function (s) { if (s.id === 'conflict') o += '<h2>When things clash</h2>' + P(esc(s.text)) + P(esc(hi(sc, 'cf_accommodating', 55) ? 'Tip: giving way is kind, but saying "I see it differently" calmly is kind too.' : hi(sc, 'cf_competing', 55) ? 'Tip: asking one question about the other person\u2019s side before you answer can change a whole argument.' : hi(sc, 'cf_avoiding', 55) ? 'Tip: stepping back is smart, as long as you come back to the problem once things cool down.' : 'Tip: your style works well when you also check that the other person feels heard.'));
      if (s.id === 'values') { var bot = sc.values.filter(function (x) { return x.raw <= 0; }).slice(-1)[0]; o += '<h2>What matters to you</h2>' + P(esc(s.text)) + (bot ? P(esc('Lower on your list: ' + (S().VAL[bot.key] || S().nm(bot.key)) + '. That doesn\u2019t mean you don\u2019t care, just that it pulls on you less.')) : ''); }
      if (s.id === 'stress') o += '<h2>Under pressure</h2>' + P(esc(s.text)) + P(esc(hi(sc, 'N') ? 'Because stress hits you hard, having a go-to reset (music, a walk, one person to text) makes a big difference.' : 'You handle stress fairly well. Keep an eye on the moments when it builds up quietly.'));
      if (s.id === 'social') o += '<h2>Social battery</h2>' + P(esc(s.text));
      if (s.id === 'decide') o += '<h2>How you decide</h2>' + P(esc(s.text)); });
    o += '<h2>Your strengths</h2>' + strengths(sc).map(function (x) { return P('\u2022 ' + esc(x)); }).join('');
    o += '<h2>Blind spots</h2>' + P('Everyone has them. These are just patterns to keep an eye on.') + blindSpots(sc).map(function (x) { return P('\u2022 ' + esc(x)); }).join('');
    o += '<h2>Friendships and relationships</h2>' + relationships(sc).map(function (x) { return P(esc(x)); }).join('');
    o += '<h2>School and work</h2>' + fit(sc).map(function (x) { return P(esc(x)); }).join('');
    if (deep && D) o += deepSection(Q, D, sc, deep);
    o += '<h2>Summary</h2>' + P(esc(summaryLine(hl, sc)));
    o += '<h2 class="pb">Every answer</h2><table>' + r.answers.map(function (a, i) { var q = Q.questions.find(function (x) { return x.id === a.q; }); return q ? '<tr><td>' + (i + 1) + '. ' + esc(q.text) + '</td><td>' + esc(q.options[a.a].t) + '</td></tr>' : ''; }).join('') + '</table>';
    o += '<p class="muted small" style="margin-top:20px">Mindprint by Northpeak Studios. For fun and self-reflection \u2014 not a diagnosis.</p></article>';
    return o;
  }
  function headLine(h, sc) {
    var k = h.key, up = h.pct >= 50, F = FACET[k];
    if (F) return F[up ? 0 : 1].replace(/\.$/, '') + ' (' + S().nm(k).toLowerCase() + ': ' + h.pct + '/100).';
    return S().BIG[k][up ? 'hi' : 'lo'];
  }
  function summaryLine(hl, sc) {
    var bits = hl.map(function (h) { return h.title.replace(/^The /, '').toLowerCase(); });
    var at = S().ATT[sc.attachment.style].name.split(' (')[0].toLowerCase();
    return (bits.length ? 'In short: ' + S().list(bits) + '. ' : '') + 'In relationships your style looks ' + at + ', and what you care about most is ' + S().list(S().top(sc.values, 2).map(function (x) { return S().VAL[x.key]; })) + '. Your results describe tendencies, not limits. You can always grow in any direction you choose.';
  }
  window.MPReport = { html: html, strengths: strengths, blindSpots: blindSpots, fmtV: fmtV };
})();
