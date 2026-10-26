/* Mindprint Map (1.1.7, Oct 26 2026; Odin: "build an axon style graph of how everything relates to each other. deep explanations").
   Every system in Mindprint and its parts as nodes, the links between them as edges. Each edge carries an honesty label:
   study = a reported correlation in published studies, theory = a theoretical mapping, lore = community lore, method = how Mindprint itself works it out,
   part = simply a piece of that system. No numbers or citations we can't back. Graph engine adapted from Northpeak's own Axon graph view. */
(function () {
  'use strict';
  var TY = function () { return window.MPTypes || {}; };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function para(s) { return '<p>' + s + '</p>'; }

  var KIND = {
    study: ['Reported correlation in studies', '#33e1d2'],
    theory: ['Theoretical mapping', '#b39dff'],
    lore: ['Community lore', '#ff8a65'],
    method: ['Mindprint\u2019s own method', '#9a90b8'],
    part: ['Part of the system', '#6c6290']
  };
  var KINDX = {
    study: 'Researchers measured both things in the same people and found they tend to go together. That is a real, published finding. A correlation is a tendency, not a match: plenty of people score high on one and middle or low on the other.',
    theory: 'This link was built on paper: by the theorist who made the system, a test publisher, or the system\u2019s own rules. It is a reasoned mapping, not something proven by measuring lots of people.',
    lore: 'Typing communities and fans say this a lot. It is a pattern people notice, not something that has been tested properly, so hold it loosely.',
    method: 'This is how Mindprint itself works out your result. It is a design choice inside this app, not a claim about how people work.',
    part: 'This is simply one of the pieces this system is made of.'
  };

  /* groups = colours. Order = the order of the filter chips. */
  var G = {
    mp: ['Mindprint quiz', '#f6f1ff'], big5: ['Big Five', '#33e1d2'], mbti: ['16 types', '#b39dff'], cogfn: ['Cognitive functions', '#8a7dff'],
    keir: ['Keirsey', '#f5c542'], soc: ['Socionics', '#ec6fb4'], ennea: ['Enneagram', '#ff6b6b'], temper: ['Temperament', '#ff8a65'],
    disc: ['DISC', '#4f8cf7'], arche: ['Archetypes', '#f59e0b'], attach: ['Attachment', '#34d399'], scales: ['Quiz scales', '#7dd3fc'],
    decide: ['Decision style', '#a3e635'], learn: ['Learning style', '#a0aec0'], think: ['Thinking style', '#22d3ee'], team: ['Team role', '#fb7185'],
    cluster: ['Cluster', '#c084fc'], classified: ['Classified', '#e879f9']
  };

  /* ---------- the systems (hub nodes): what it is, where it came from, how it connects, how solid ---------- */
  var HUB = {
    mp: { label: 'Your answers', title: 'Mindprint quiz (your answers)', kick: 'The centre of the map',
      what: 'The 77-question Mindprint quiz measures the Big Five traits plus about 40 narrower scales: attachment, conflict style, values, stress and coping, social energy and decision style. Every other result on this map is calculated from those scores. The only extra measuring comes from the optional add-on quizzes (Sharpen, Thinking style, Team role) and a few Deep Dive answers.',
      origin: 'Built by Northpeak Studios in October 2026. The questions are written for Mindprint and grouped into scales modelled on well-known research questionnaires, but it is not any of those official tests.',
      conn: 'Lines from here are Mindprint\u2019s own method: they show which result is worked out from which scores. Nothing on the map is measured twice; one set of answers is read many different ways.',
      solid: 'Your trait scores are the most solid thing here because they come straight from your answers. Everything further out is an interpretation layered on top. Inferred from your answers, for fun.' },
    big5: { label: 'Big Five', title: 'Big Five (OCEAN)', kick: 'Trait model',
      what: 'Five broad traits that most personality differences can be sorted into: Openness, Conscientiousness, Extraversion, Agreeableness and Neuroticism (Mindprint calls it emotional sensitivity). Each one is a spectrum: you get a score, not a box.',
      origin: 'It grew out of the \u201clexical hypothesis\u201d: if a trait matters, language will have words for it. Gordon Allport and Henry Odbert listed thousands of English trait words in 1936; Raymond Cattell and later researchers factor-analysed ratings of them. Ernest Tupes and Raymond Christal found five recurring factors in US Air Force data around 1961, Warren Norman confirmed them in 1963, Lewis Goldberg named them the \u201cBig Five\u201d, and Paul Costa and Robert McCrae built the NEO questionnaires in the 1980s and 1990s.',
      conn: 'It is the backbone of this map. Most other systems either were compared against it in studies (16 types, attachment, values, conflict, coping) or are calculated from it inside Mindprint (temperament, DISC, archetype, cluster).',
      solid: 'The most researched personality model there is. The five factors show up across many languages and cultures, scores are fairly stable in adults, and they predict real outcomes modestly. Still a description, not an explanation of why people differ.' },
    mbti: { label: '16 types', title: '16 types (MBTI-style)', kick: 'Type system',
      what: 'Four either/or letters make 16 types: E or I (where your energy goes), N or S (ideas or concrete facts), T or F (logic or values when deciding) and J or P (planned or flexible). Mindprint\u2019s version gives each type its own name.',
      origin: 'Katharine Cook Briggs and her daughter Isabel Briggs Myers built the Myers-Briggs Type Indicator on Carl Jung\u2019s book Psychological Types (1921), starting in the 1940s. It was published commercially in the 1960s and is now one of the most used personality tests in the world. MBTI is a trademark of The Myers-Briggs Company; Mindprint\u2019s 16 types are a lookalike, not the official test.',
      conn: 'Its letters line up with four of the Big Five traits, its types sort into Keirsey\u2019s four temperaments, each type has a stack of Jung\u2019s cognitive functions, and Socionics has a sister type for each.',
      solid: 'Popular and easy to talk about. Researchers criticise the either/or cut, because most people\u2019s scores sit near the middle rather than in two camps, and many people get a different type when they retake it. The letters work much better read as four spectra, which is how Mindprint shows them.' },
    cogfn: { label: 'Cognitive functions', title: 'Jung\u2019s 8 cognitive functions', kick: 'Theory behind the 16 types',
      what: 'Jung described four mental functions: Thinking and Feeling (ways of judging) and Sensation and Intuition (ways of perceiving). Each can point outward (extraverted, e) or inward (introverted, i), making eight: Te, Ti, Fe, Fi, Se, Si, Ne, Ni. Typing communities describe each type by its \u201cstack\u201d: a dominant function first, then a helper (auxiliary).',
      origin: 'Carl Jung, Psychological Types (1921). Myers and Briggs added the J/P letter partly to show which function points outward. Later writers, such as John Beebe, expanded it to an eight-function model.',
      conn: 'Every 16 type has a fixed stack (ISTP = Ti, Se, Ni, Fe). Socionics is built on the same eight, under different names. Each function belongs to one letter pair (Ne and Ni belong to N/S).',
      solid: 'A theory, not a measurement. Function tests exist, but there is little research showing they measure separate, real things. Mindprint does not measure functions; it shows the standard stack for your letters.' },
    keir: { label: 'Keirsey', title: 'Keirsey temperaments', kick: 'Four groups of the 16 types',
      what: 'Four temperaments made from letter pairs: Guardians (SJ), Artisans (SP), Idealists (NF) and Rationals (NT). Mindprint uses the same four pairs with its own names: Keepers, Makers, Idealists and Thinkers.',
      origin: 'David Keirsey and Marilyn Bates, Please Understand Me (1978), later Please Understand Me II (1998). Keirsey tied his four groups to a long line of temperament ideas going back to ancient Greece.',
      conn: 'Each of the 16 types belongs to exactly one temperament. People often line the four up with the ancient humors, but different writers pair them differently.',
      solid: 'A theoretical grouping. It is a handy way to talk about the 16 types; the research behind it is thin.' },
    soc: { label: 'Socionics', title: 'Socionics', kick: 'Type system',
      what: '16 types (sociotypes) built from Jung\u2019s functions, plus a theory of how types get along: \u201cintertype relations\u201d like duality (the type that fits you best) and four quadras, groups of types that share values.',
      origin: 'Aushra Augustinavichiute developed it in Lithuania in the 1970s, combining Jung\u2019s types with Antoni Kepinski\u2019s idea of \u201cinformation metabolism\u201d. It is most popular in Eastern Europe.',
      conn: 'Each Socionics type has an MBTI-style twin, but for introverts the last letter flips: in Socionics the small j/p says whether your dominant function is a judging or a perceiving one, while in MBTI J/P describes your outward-facing function. So MBTI INTP corresponds to Socionics INTj (LII). Whether the two systems describe the same people is argued about a lot.',
      solid: 'Mostly theory, with little peer-reviewed testing in international journals. Mindprint\u2019s Socionics-style type follows from your 4-letter type; it is not measured separately.' },
    ennea: { label: 'Enneagram', title: 'Enneagram', kick: 'Type system',
      what: 'Nine types, each built around a core motivation or fear (Type 1 wants to be good and right, Type 5 wants to understand, and so on). Extras: a wing (a neighbouring type that flavours yours), three centres or triads (gut, heart, head), three instincts and a tritype.',
      origin: 'The nine-pointed symbol was popularised by G. I. Gurdjieff in the early 1900s. The personality types came from Oscar Ichazo in the 1950s to 1960s and Claudio Naranjo in the 1970s, then spread through books by Helen Palmer, Don Riso and Russ Hudson.',
      conn: 'Typing communities pair Enneagram types with 16 types and Big Five traits. A few small studies have compared Enneagram tests with Big Five tests and reported links in sensible directions, but the evidence is thin.',
      solid: 'Popular in coaching and spirituality; research is limited and mixed (a 2021 review of the literature by Hook and colleagues called for much more). Mindprint scores each type from four of your scales, for fun.' },
    temper: { label: 'Temperament', title: 'Classic temperament', kick: 'Ancient + modern',
      what: 'Four temperaments: Sanguine, Choleric, Melancholic and Phlegmatic.',
      origin: 'They started as the four humors of ancient Greek medicine (Hippocrates, about 400 BC), which said moods came from body fluids, and Galen named the temperaments in the 2nd century AD. The body-fluid part is long disproven. In the 1960s Hans Eysenck gave them a second life by placing the four in the quadrants of two measured traits: Extraversion and Neuroticism.',
      conn: 'Mindprint uses Eysenck\u2019s version: your Extraversion and emotional-sensitivity scores pick the quadrant. People also pair the four with DISC and Keirsey, as lore.',
      solid: 'The two traits underneath are well studied; the four names are a historical label for their corners.' },
    disc: { label: 'DISC', title: 'DISC-style work style', kick: 'Workplace model',
      what: 'Four work styles: Dominance, Influence, Steadiness and Conscientiousness (Mindprint: Dominant, Influential, Steady, Careful), often shown as colours.',
      origin: 'William Moulton Marston described the four in Emotions of Normal People (1928). The same Marston worked on an early blood-pressure lie detector and created Wonder Woman. Others later turned his idea into workplace questionnaires, and many companies sell versions today.',
      conn: 'The four styles overlap with Big Five traits (Dominance with assertive, less agreeable; Influence with outgoing; Steadiness with agreeable; Conscientiousness with careful and organised). People also pair them with the four temperaments.',
      solid: 'Widely used in business training, little independent research. Treat it as a conversation tool.' },
    arche: { label: 'Archetypes', title: '12 archetypes', kick: 'Story characters',
      what: 'Twelve story characters (Hero, Sage, Rebel, Explorer, Creator, Caregiver, Ruler, Jester, Lover, Innocent, Magician, Everyperson). Mindprint picks the one your scores fit best.',
      origin: 'Carl Jung wrote about archetypes as images shared across cultures in the early 1900s. The popular list of twelve comes from Carol S. Pearson\u2019s work and the branding book The Hero and the Outlaw (Margaret Mark and Carol Pearson, 2001).',
      conn: 'Shares Jung as a common ancestor with the 16 types and cognitive functions, though from a different part of his work. Fans match archetypes to Enneagram types.',
      solid: 'A storytelling and branding tool, not a measurement. Pure fun.' },
    attach: { label: 'Attachment', title: 'Attachment style', kick: 'How you bond',
      what: 'How you handle closeness. Modern research measures two dimensions, anxiety (worry about being left or not loved enough) and avoidance (discomfort with depending on people), and the four styles are the corners: secure, anxious, avoidant and fearful-avoidant.',
      origin: 'John Bowlby\u2019s attachment theory (from the 1950s) and Mary Ainsworth\u2019s Strange Situation studies with babies (1970s). Cindy Hazan and Phillip Shaver applied it to adult love in 1987, Kim Bartholomew and Leonard Horowitz proposed the four adult styles in 1991, and Kelly Brennan, Catherine Clark and Shaver built the two-dimension questionnaire (ECR) in 1998.',
      conn: 'Attachment anxiety tends to go with Neuroticism, and avoidance with lower Agreeableness and lower Extraversion (Noftle and Shaver, 2006, among others).',
      solid: 'One of the better-researched ideas here. Researchers prefer the two scores over the four boxes. Styles can change over time and between relationships.' },
    decide: { label: 'Decision style', title: 'Decision style', kick: 'How you decide',
      what: 'Five ways people decide: rational (Mindprint: Analytical), intuitive, dependent (Collaborative), spontaneous (Quick-fire) and avoidant (Wait-and-see).',
      origin: 'Susanne Scott and Reginald Bruce\u2019s General Decision-Making Style questionnaire (1995). Mindprint\u2019s decision questions are modelled on its five styles.',
      conn: 'Measured directly by the quiz. Careful: \u201cintuitive\u201d here means going with your gut, which is not the same thing as N (Intuition) in the 16 types.',
      solid: 'A real research questionnaire with reasonable support. Mindprint\u2019s short version is for fun.' },
    learn: { label: 'Learning style', title: 'Learning style', kick: 'Flagged: not research-backed',
      what: 'Which way of taking things in you prefer: visual, reading, hands-on or social.',
      origin: 'Learning-style models such as David Kolb\u2019s (1984) and Neil Fleming\u2019s VARK (around 1987 to 1992) became hugely popular in schools.',
      conn: 'Mindprint estimates it from your Openness, Extraversion and related scales. It sounds close to the words-versus-pictures slider in Thinking style.',
      solid: 'Weak. A 2008 review by Harold Pashler and colleagues found no good evidence that teaching people in their \u201cpreferred style\u201d helps them learn more. A preference is real; the payoff is not. Shown for fun only.' },
    think: { label: 'Thinking style', title: 'Thinking style (cognitive style)', kick: 'How you process',
      what: 'Three sliders: big-picture versus step-by-step, words versus pictures, and reading the context versus going by your own read. Four names come from the first two.',
      origin: 'Richard Riding\u2019s cognitive styles (wholist\u2013analytic and verbal\u2013imager, with Indra Cheema, 1991) and Herman Witkin\u2019s field dependence\u2013independence research (1940s to 1970s, with tests like the Embedded Figures Test).',
      conn: 'Mindprint makes a rough guess from your main-quiz scales until you take the optional 6-question quiz, which replaces the guess.',
      solid: 'Real research traditions, but Mindprint\u2019s version is a light estimate, not a validated test.' },
    team: { label: 'Team role', title: 'Team role', kick: 'Your role in a group',
      what: 'Eight roles you might play in a group: Leader, Idea generator, Organizer, Peacekeeper, Hype person, Researcher, Critic and Supporter.',
      origin: 'Inspired by the idea of team roles made famous by Meredith Belbin\u2019s Management Teams (1981). Mindprint\u2019s eight are its own names, not the Belbin test.',
      conn: 'Each role is scored from three of your scales, blended with the optional 6-question quiz.',
      solid: 'A fun lens. Belbin\u2019s own model is widely used at work with mixed research support; Mindprint\u2019s version is not validated.' },
    cluster: { label: 'Cluster', title: 'Your cluster', kick: 'Mindprint\u2019s 8 profiles',
      what: 'Eight hand-made Big Five profiles. Your cluster is the one whose shape is closest to your five scores, with a % match.',
      origin: 'Researchers have long looked for natural \u201ctypes\u201d in Big Five data (for example resilient, overcontrolled and undercontrolled; and a 2018 study by Martin Gerlach and colleagues that found four clusters across several large data sets). Mindprint\u2019s eight are its own and made for fun, not those research clusters.',
      conn: 'Calculated purely from your Big Five scores. It feeds the Classified card.',
      solid: 'The distance math is real; the eight profiles are invented. For fun.' },
    classified: { label: 'Classified', title: 'Your Mindprint, classified', kick: 'Taxonomy for fun',
      what: 'Your results run through the language of classification: Kingdom \u2192 Phylum \u2192 Class \u2192 Order \u2192 Family \u2192 Genus \u2192 Species, a quadrant, a tier, a phenotype and more.',
      origin: 'The ranks come from biology: Carl Linnaeus\u2019s Systema Naturae (1735). Applying them to personality is a joke with real data behind it.',
      conn: 'Built only from your other results (16 type, Keirsey group, cluster, archetype, Big Five code), so every line here is a re-label of something else on the map.',
      solid: 'Deterministic and playful. Level is how much Mindprint knows about you, never a rank of you.' }
  };

  HUB.lenses = { label: 'Fun lenses', title: 'Fun lenses', kick: '30+ ways to sort the same answers', g: 'classified',
    what: 'The same answers sorted 30+ more ways: a 2D map and coordinates, soft membership across clusters (like a mixture model), a personal taxonomy tree, a trait graph, a tier list, tags, a persona sketch, and a few philosophy ideas like prototypes and natural kinds.',
    origin: 'Each lens borrows a real way of classifying things from statistics, biology, data science or philosophy and applies it to your scores.',
    conn: 'Calculated from your Big Five and other scales. Lens results feed the Classified card.',
    solid: 'Playful re-labels of your real scores. For fun.' };
  var SCL = {
    conflict: ['Conflict style', 'Conflict style (Thomas-Kilmann-style)', 'How you handle a clash: competing, collaborating, compromising, avoiding or accommodating.', 'Kenneth Thomas and Ralph Kilmann\u2019s conflict modes (their instrument came out in 1974), building on Robert Blake and Jane Mouton\u2019s managerial grid (1964). Two axes: how much you push for yourself and how much you look after the other person.', 'Research comparing conflict styles with the Big Five (for example David Antonioni, 1998) reports that more agreeable people lean toward the cooperative styles.', 'A well-known workplace model with decent research behind it. Mindprint\u2019s questions are modelled on it, not the official test.'],
    values: ['Values', 'Values (Schwartz-style)', 'What matters most to you, like self-direction, security, achievement or kindness to others.', 'Shalom Schwartz\u2019s theory of basic human values (1992), tested in many countries. The values sit in a circle: neighbours are compatible, opposites pull against each other.', 'Studies of values and the Big Five (for example Sonia Roccas and colleagues, 2002) report that Openness goes with valuing self-direction and universalism, and Agreeableness with benevolence.', 'Strong cross-cultural research. Mindprint\u2019s short version is for fun.'],
    stress: ['Stress & coping', 'Stress and coping', 'What stresses you and what you do about it: seek support, problem-solve, withdraw, express it and so on.', 'Richard Lazarus and Susan Folkman\u2019s model of stress and coping (1984): stress depends on how you size up a situation and what you think you can do about it.', 'A meta-analysis by Jennifer Connor-Smith and Celeste Flachsbart (2007) reported that Neuroticism goes with more stress and less helpful coping, while Extraversion and Conscientiousness go with more problem-solving.', 'Well researched. Mindprint\u2019s scales are a light version.'],
    social: ['Social energy', 'Social energy', 'How much social time charges you up or drains you.', 'A narrower slice of Extraversion, the trait at the heart of Jung\u2019s introvert and extravert idea.', 'Mindprint measures it with its own questions and it moves with your Extraversion score.', 'Closely tied to a well-studied trait.']
  };

  /* ---------- build nodes + edges ---------- */
  var NODES = [], BY = {}, EDGES = [], ADJ = {};
  function node(o) { if (BY[o.id]) return BY[o.id]; BY[o.id] = o; ADJ[o.id] = []; NODES.push(o); return o; }
  function edge(a, b, k, t, src) { if (!BY[a] || !BY[b]) return; var i = EDGES.length; EDGES.push({ i: i, a: a, b: b, k: k, t: t || '', src: src || '' }); ADJ[a].push(i); ADJ[b].push(i); }
  var BUILT = false;
  function build() {
    if (BUILT) return; var T = TY(); if (!T.FOUR) return; BUILT = true;
    var k, i;
    for (k in HUB) node({ id: k, hub: true, g: HUB[k].g || k, label: HUB[k].label, title: HUB[k].title, kick: HUB[k].kick, what: HUB[k].what, origin: HUB[k].origin, conn: HUB[k].conn, solid: HUB[k].solid });
    for (k in SCL) node({ id: k, hub: true, g: 'scales', label: SCL[k][0], title: SCL[k][1], kick: 'Measured by the quiz', what: SCL[k][2], origin: SCL[k][3], conn: SCL[k][4], solid: SCL[k][5] });
    var M = function (id, g, label, title, what, extra) { var o = { id: id, g: g, label: label, title: title || label, what: what, sys: g }; for (var x in (extra || {})) o[x] = extra[x]; return node(o); };
    /* Big Five */
    var B5 = [['O', 'Openness', 'Curiosity, imagination and liking new ideas and experiences. High: inventive, artsy, abstract. Low: practical, conventional, prefers the familiar.'],
      ['C', 'Conscientiousness', 'Organisation, self-discipline and following through. High: planned, reliable, goal-driven. Low: flexible, spontaneous, easygoing about rules.'],
      ['E', 'Extraversion', 'Energy from people and action. High: talkative, assertive, excitement-seeking. Low (introversion): reserved, recharges alone. Not the same as shyness.'],
      ['A', 'Agreeableness', 'Warmth, trust and cooperation. High: kind, accommodating. Low: direct, competitive, sceptical.'],
      ['N', 'Neuroticism (emotional sensitivity)', 'How strongly and often you feel negative emotions like worry, anger and sadness. Mindprint calls it emotional sensitivity. Low: calm and steady. It is a normal trait, not a disorder.']];
    B5.forEach(function (b) { M('b' + b[0], 'big5', b[1].split(' (')[0], b[1], b[2], { key: b[0] }); edge('big5', 'b' + b[0], 'part'); });
    /* 16 types: letter pairs, functions, Keirsey, types */
    var DI = [['dEI', 'E / I', 'Extraversion vs Introversion', 'Where your energy goes: out to people and the world (E) or inward to your own thoughts (I). Jung\u2019s original idea.'],
      ['dNS', 'N / S', 'Intuition vs Sensing', 'How you take things in: patterns, possibilities and the big picture (N) or concrete facts, details and experience (S).'],
      ['dTF', 'T / F', 'Thinking vs Feeling', 'How you decide: logic and consistency (T) or values and the people affected (F).'],
      ['dJP', 'J / P', 'Judging vs Perceiving', 'How you run your outer life: planned and settled (J) or open and flexible (P).']];
    DI.forEach(function (d) { M(d[0], 'mbti', d[1], d[2], d[3]); edge('mbti', d[0], 'part'); });
    var FN = { Ne: ['Extraverted Intuition', 'Spots possibilities and connections out in the world; brainstorms, jumps between ideas.'], Ni: ['Introverted Intuition', 'Builds an inner sense of where things are heading; one big insight rather than many.'],
      Se: ['Extraverted Sensing', 'Lives in the present moment and the physical world; quick to act on what is happening now.'], Si: ['Introverted Sensing', 'Compares now with past experience; values the familiar, tried and true details.'],
      Te: ['Extraverted Thinking', 'Organises the outside world for results: plans, metrics, efficiency.'], Ti: ['Introverted Thinking', 'Builds an inner logical framework; wants to understand exactly how things work.'],
      Fe: ['Extraverted Feeling', 'Reads and manages the mood of the group; harmony and shared values.'], Fi: ['Introverted Feeling', 'Checks things against a personal inner sense of values and authenticity.'] };
    for (k in FN) { M('f' + k, 'cogfn', k, k + ' \u00b7 ' + FN[k][0], FN[k][1]); edge('cogfn', 'f' + k, 'part'); edge('f' + k, k[0] === 'N' || k[0] === 'S' ? 'dNS' : 'dTF', 'theory', k + ' is one of the two ' + (k[0] === 'N' || k[0] === 'S' ? 'perceiving functions behind the N/S letter' : 'judging functions behind the T/F letter') + ': the letter says which kind you prefer, the small e or i says whether it points outward or inward.', 'Jung, Psychological Types (1921)'); }
    var KG = { NT: ['Rationals', 'Thinkers'], NF: ['Idealists', 'Idealists'], SJ: ['Guardians', 'Keepers'], SP: ['Artisans', 'Makers'] };
    var KGT = { NT: 'Strategic, logical, driven to understand and master things.', NF: 'Searching for meaning, authenticity and helping people grow.', SJ: 'Dutiful, dependable, protective of traditions and order.', SP: 'Hands-on, adaptable, living for action and freedom.' };
    for (k in KG) { M('k' + k, 'keir', k + ' ' + KG[k][0], k + ' \u00b7 ' + KG[k][0] + ' (Mindprint: ' + KG[k][1] + ')', KGT[k] + ' Keirsey called them ' + KG[k][0] + '; Mindprint\u2019s name for the same letter pair is ' + KG[k][1] + '.'); edge('keir', 'k' + k, 'part'); }
    function stack(c) { var I = c[0] === 'I', P = c[1], J = c[2], ext = c[3] === 'J' ? J : P, intr = c[3] === 'J' ? P : J; return I ? [intr + 'i', ext + 'e'] : [ext + 'e', intr + 'i']; }
    Object.keys(T.FOUR).forEach(function (c) {
      var st = stack(c), kg = c[1] === 'N' ? 'N' + c[2] : 'S' + c[3], so = T.mbtiToSoc ? T.mbtiToSoc(c) : null;
      M('t' + c, 'mbti', c, c + ' \u00b7 ' + T.FOUR[c][0], T.FOUR[c][1] + ' Function stack: ' + st[0] + ' then ' + st[1] + ' (the standard order for these letters).', { code: c });
      edge('t' + c, 'k' + kg, 'theory', c + ' has ' + kg.split('').join(' and ') + ', so Keirsey puts it with the ' + KG[kg][0] + ' (Mindprint: ' + KG[kg][1] + ').', 'Keirsey and Bates, Please Understand Me (1978)');
      edge('t' + c, 'f' + st[0], 'theory', st[0] + ' is the dominant (first) function of ' + c + ' in the standard stack: the mental process the type leans on most.', 'Jung (1921); Myers; later function-stack writers');
      edge('t' + c, 'f' + st[1], 'theory', st[1] + ' is the auxiliary (second, helper) function of ' + c + ', balancing the dominant one.', 'Myers; later function-stack writers');
    });
    /* Socionics */
    var QD = { Alpha: 'ideas, fun and easygoing equality', Beta: 'passion, loyalty and a strong group', Gamma: 'independence, results and honesty', Delta: 'calm, practical help and steady growth' };
    for (k in QD) { M('q' + k, 'soc', k + ' quadra', k + ' quadra', 'One of the four Socionics quadras: four types that share values and are said to be comfortable together. ' + k + ' values ' + QD[k] + '.'); edge('soc', 'q' + k, 'part'); }
    Object.keys(T.SOC || {}).forEach(function (s) {
      var x = T.SOC[s], tw = T.socToMbti ? T.socToMbti(s) : null, du = T.DUAL && T.DUAL[s];
      M('s' + s, 'soc', s, s + ' \u00b7 ' + x[0] + ' \u00b7 ' + x[1], 'Socionics type ' + s + ' (written ' + x[0] + '), in the ' + x[2] + ' quadra. Its dual, the type said to complement it best, is ' + du + '.', { code: s });
      edge('s' + s, 'q' + x[2], 'part');
      if (tw) edge('t' + tw, 's' + s, 'theory', 'MBTI ' + tw + ' corresponds to Socionics ' + x[0] + ' (' + s + ').' + (tw[0] === 'I' ? ' Note the flipped last letter: for introverts, Socionics j/p names the dominant function\u2019s kind, while MBTI J/P names the outward one.' : ' For extraverts the letters match.'), 'Socionics literature; community convention for cross-typing');
    });
    /* Enneagram */
    var TRI = { gut: ['Gut (body) triad', [8, 9, 1], 'anger and control'], heart: ['Heart (feeling) triad', [2, 3, 4], 'shame and image'], head: ['Head (thinking) triad', [5, 6, 7], 'fear and security'] };
    for (k in TRI) { M('e' + k, 'ennea', TRI[k][0].split(' (')[0], TRI[k][0], 'Types ' + TRI[k][1].join(', ') + ' share a centre. The theme of this triad is ' + TRI[k][2] + '.'); edge('ennea', 'e' + k, 'part'); }
    M('ewing', 'ennea', 'Wings', 'Enneagram wings', 'Your wing is the type next to yours on the circle that flavours it (a 4 is next to 3 and 5, so 4w3 or 4w5). Mindprint picks the higher-scoring neighbour.');
    M('einst', 'ennea', 'Instincts', 'Instinctual variants: sp, so, sx', 'Three instincts said to drive what you pay most attention to: self-preservation (safety, comfort), social (belonging, status) and sexual or one-to-one (intensity, close bonds). Stacked into an order like sp/so. Mindprint does not measure instincts.');
    M('etri', 'ennea', 'Tritype', 'Tritype', 'Your top type from each of the three triads (head, heart, gut), like 5-4-8. Popularised by Katherine Chernick Fauvre in the 1990s. Mindprint does not measure tritype; it shows your full ranking of all 9 instead.');
    edge('ennea', 'ewing', 'part'); edge('ennea', 'einst', 'part'); edge('ennea', 'etri', 'part'); edge('etri', 'egut', 'theory', 'A tritype takes one type from each triad.'); edge('etri', 'eheart', 'theory', 'A tritype takes one type from each triad.'); edge('etri', 'ehead', 'theory', 'A tritype takes one type from each triad.');
    var ESC = { 1: 'order, self-discipline, conformity and anger', 2: 'empathy, benevolence, sociability and seeking support', 3: 'achievement striving, valuing achievement, assertiveness and power', 4: 'imagination, emotional sensitivity, self-direction and expressing feelings', 5: 'love of ideas, low sociability, rational decisions and withdrawing to cope', 6: 'anxiety, valuing security, attachment anxiety and relying on others to decide', 7: 'excitement-seeking, stimulation, pleasure and adventure', 8: 'assertiveness, power, a competing conflict style and low agreeableness', 9: 'cooperation, accommodating and avoiding in conflict, and calm' };
    (T.EN || []).forEach(function (e) {
      var n = e[0], tri = n === 8 || n === 9 || n === 1 ? 'gut' : n <= 4 ? 'heart' : 'head';
      M('e' + n, 'ennea', String(n), 'Type ' + n + ' \u00b7 ' + e[1], e[2] + ' Mindprint scores Type ' + n + ' from your ' + ESC[n] + '.', { num: n });
      edge('e' + n, 'e' + tri, 'part');
    });
    /* Temperament */
    var TQ = { sanguine: 'high Extraversion, low Neuroticism', choleric: 'high Extraversion, high Neuroticism', melancholic: 'low Extraversion, high Neuroticism', phlegmatic: 'low Extraversion, low Neuroticism' };
    for (k in (T.TEMP || {})) { M('tp' + k, 'temper', T.TEMP[k][0], T.TEMP[k][0], T.TEMP[k][2] + ' Eysenck\u2019s quadrant: ' + TQ[k] + '.'); edge('temper', 'tp' + k, 'part'); }
    for (k in (T.DISC || {})) { M('dc' + k, 'disc', k + ' ' + T.DISC[k][0], k + ' \u00b7 ' + T.DISC[k][0] + ' (' + T.DISC[k][1] + ')', T.DISC[k][3]); edge('disc', 'dc' + k, 'part'); }
    (T.AR || []).forEach(function (a) { M('ar' + a[0], 'arche', a[1].replace(/^The /, ''), a[1], a[3]); edge('arche', 'ar' + a[0], 'part'); });
    /* Attachment */
    M('atanx', 'attach', 'Anxiety', 'Attachment anxiety', 'Worry about being abandoned or not loved enough, wanting lots of reassurance. One of the two dimensions modern attachment research measures.');
    M('atavo', 'attach', 'Avoidance', 'Attachment avoidance', 'Discomfort with closeness and depending on others, preferring independence. The other dimension.');
    edge('attach', 'atanx', 'part'); edge('attach', 'atavo', 'part');
    var AQ = { secure: 'low anxiety, low avoidance', anxious: 'high anxiety, low avoidance', avoidant: 'low anxiety, high avoidance', fearful: 'high anxiety, high avoidance' };
    var AT = { secure: 'Comfortable with closeness and with independence; trusts that people will be there.', anxious: 'Craves closeness and worries about it, may need reassurance.', avoidant: 'Values independence, can pull away when things get close.', fearful: 'Wants closeness but fears getting hurt, so it can feel push-pull.' };
    for (k in (T.ATTN || {})) { M('at' + k, 'attach', T.ATTN[k][0].split(' (')[0].replace('-leaning', ''), T.ATTN[k][0], AT[k] + ' Its corner: ' + AQ[k] + '.'); edge('attach', 'at' + k, 'part');
      if (k !== 'secure') { if (k !== 'avoidant') edge('at' + k, 'atanx', 'theory', T.ATTN[k][0] + ' is the high-anxiety side of the two-dimension model.', 'Bartholomew and Horowitz (1991); Brennan, Clark and Shaver (1998)'); if (k !== 'anxious') edge('at' + k, 'atavo', 'theory', T.ATTN[k][0] + ' is the high-avoidance side of the two-dimension model.', 'Bartholomew and Horowitz (1991); Brennan, Clark and Shaver (1998)'); } }
    for (k in (T.CG || {})) { M('dm' + k, 'decide', T.CG[k][0], T.CG[k][0] + ' (GDMS: ' + k + ')', T.CG[k][2]); edge('decide', 'dm' + k, 'part'); }
    for (k in (T.LS || {})) { M('ls' + k, 'learn', T.LS[k][0].split(' / ')[0], T.LS[k][0], T.LS[k][2] + ' (Preference only; see the research caveat.)'); edge('learn', 'ls' + k, 'part'); }
    for (k in (T.TSN || {})) { M('th' + k, 'think', T.TSN[k][0], T.TSN[k][0], T.TSN[k][2]); edge('think', 'th' + k, 'part'); }
    (T.ROLES || []).forEach(function (r, j) { var key = T.TRK ? T.TRK[j] : String(j); M('tr' + key, 'team', r[0], r[0], 'The one who ' + r[1] + '.'); edge('team', 'tr' + key, 'part'); });
    (T.CLUSTERS || []).forEach(function (c) { M('cl' + c[0], 'cluster', c[1].replace(/^The /, ''), c[1], c[5] || c[4] || ''); edge('cluster', 'cl' + c[0], 'part'); });
    M('cranks', 'classified', 'Kingdom \u2192 species', 'Kingdom \u2192 Phylum \u2192 \u2026 \u2192 Species', 'Your personal Linnaean chain: each rank is filled from one of your results, from the broadest (kingdom) to the most specific (species).');
    M('cquad', 'classified', 'Quadrant', 'Quadrant', 'Where you land on two axes at once, like a map with four corners.');
    M('ctier', 'classified', 'Tier + level', 'Tier and level', 'Tier sorts how strongly your traits show (S to D, not good or bad). Level (1 to 5) is how much Mindprint knows about you: main quiz, Deep Dive, add-on answers, retakes. Never a ranking of you.');
    M('cpheno', 'classified', 'Phenotype', 'Phenotype, genotype, prototype', 'Biology and philosophy words re-used for fun: phenotype = how your results show on the outside, genotype = your compact trait code, prototype = how textbook an example of your type you are.');
    ['cranks', 'cquad', 'ctier', 'cpheno'].forEach(function (x) { edge('classified', x, 'part'); });

    /* ---------- cross-system links ---------- */
    var MC = 'McCrae and Costa (1989), comparing the MBTI with the NEO Big Five questionnaire; later studies agree';
    edge('dEI', 'bE', 'study', 'The E/I letter and Big Five Extraversion measure largely the same thing: people who come out E on type tests tend to score high on Extraversion. In Mindprint your E or I is literally your Extraversion score above or below 50.', MC);
    edge('dNS', 'bO', 'study', 'Preferring Intuition (N) goes with higher Openness, and Sensing (S) with lower Openness. In Mindprint your N or S comes from your Openness score.', MC);
    edge('dTF', 'bA', 'study', 'Feeling (F) goes with higher Agreeableness and Thinking (T) with lower. In Mindprint your F or T comes from your Agreeableness score.', MC);
    edge('dJP', 'bC', 'study', 'Judging (J) goes with higher Conscientiousness and Perceiving (P) with lower. In Mindprint your J or P comes from your Conscientiousness score.', MC);
    edge('bN', 'mbti', 'theory', 'The 16 types have no letter for Neuroticism, the one Big Five trait the MBTI leaves out. Some online tests bolt on a fifth letter (like -A/-T, \u201cassertive\u201d or \u201cturbulent\u201d) to cover it; that is a publisher\u2019s add-on, not part of the MBTI.', 'McCrae and Costa (1989) noted the gap; the -A/-T add-on comes from the 16Personalities website');
    edge('dEI', 'cogfn', 'theory', 'Introversion and extraversion were Jung\u2019s two \u201cattitudes\u201d: each function points either inward or outward. That is where the E/I letter and the small e/i on functions come from.', 'Jung, Psychological Types (1921)');
    edge('dJP', 'cogfn', 'theory', 'J/P was added by Myers and Briggs to show which function a type uses with the outside world: J means the outward function is a judging one (T or F), P means it is a perceiving one (N or S).', 'Myers and Briggs');
    edge('mbti', 'cogfn', 'theory', 'The 16 types were built on Jung\u2019s function theory; the four letters are a shorthand for which functions you prefer and in what order.', 'Jung (1921); Myers and Briggs');
    edge('soc', 'cogfn', 'theory', 'Socionics uses the same eight Jungian functions, renamed as \u201cinformation elements\u201d (for example Ti = structural logic, Fe = emotional ethics).', 'Augustinavichiute, 1970s');
    edge('mbti', 'soc', 'theory', 'Two systems from the same root (Jung). Each 16 type has a Socionics twin, with the introvert j/p flip. Typing communities argue about whether twins really describe the same person, because the two systems describe some functions differently.', 'Socionics literature; community convention');
    edge('mbti', 'keir', 'theory', 'Keirsey grouped the 16 types into four temperaments by letter pairs: SJ, SP, NF and NT.', 'Keirsey and Bates (1978)');
    edge('keir', 'temper', 'lore', 'Keirsey linked his four groups to the long history of four-temperament ideas, but writers pair Guardians, Artisans, Idealists and Rationals with the ancient humors in different ways, so no single matching is agreed.', 'Keirsey (1978, 1998) and later writers');
    edge('temper', 'bE', 'theory', 'Eysenck placed the four temperaments on two measured traits. Extraversion is one axis: Sanguine and Choleric are outgoing, Melancholic and Phlegmatic are reserved. Mindprint uses this to pick yours.', 'Hans Eysenck, 1960s');
    edge('temper', 'bN', 'theory', 'Neuroticism (emotional stability) is Eysenck\u2019s other axis: Choleric and Melancholic are the more emotionally reactive pair, Sanguine and Phlegmatic the steadier pair.', 'Hans Eysenck, 1960s');
    var EB = [['e1', 'bC', 'high', 'Perfectionist Type 1 is described as orderly, disciplined and careful, which is the profile of high Conscientiousness.'], ['e2', 'bA', 'high', 'Helper Type 2 is described as warm and giving, which matches high Agreeableness.'], ['e3', 'bC', 'high', 'Achiever Type 3 is described as goal-driven and hard-working, close to the achievement-striving side of Conscientiousness.'], ['e4', 'bN', 'high', 'Individualist Type 4 is described as feeling things intensely, close to high Neuroticism (emotional sensitivity).'], ['e5', 'bE', 'low', 'Investigator Type 5 is described as private and energy-guarding, which matches low Extraversion.'], ['e6', 'bN', 'high', 'Loyalist Type 6 is described as alert to danger and anxious, which matches high Neuroticism.'], ['e7', 'bE', 'high', 'Enthusiast Type 7 is described as upbeat and excitement-seeking, which matches high Extraversion.'], ['e8', 'bA', 'low', 'Challenger Type 8 is described as blunt and confrontational, which matches low Agreeableness.'], ['e9', 'bA', 'high', 'Peacemaker Type 9 is described as easygoing and conflict-avoiding, which matches high Agreeableness.']];
    EB.forEach(function (x) { edge(x[0], x[1], 'theory', x[3] + ' (' + (x[2] === 'high' ? 'high' : 'low') + ' end). Small studies comparing Enneagram tests with Big Five tests report links in directions like this, but the evidence is thin, so it is shown as a theoretical mapping.', 'Type descriptions in the Enneagram literature; small comparison studies'); });
    var EM = [['e5', 'tINTP'], ['e5', 'tINTJ'], ['e2', 'tESFJ'], ['e2', 'tENFJ'], ['e7', 'tENFP'], ['e7', 'tESTP'], ['e1', 'tISTJ'], ['e4', 'tINFP'], ['e8', 'tENTJ'], ['e9', 'tISFP'], ['e6', 'tISFJ'], ['e3', 'tESTJ']];
    EM.forEach(function (x) { edge(x[0], x[1], 'lore', 'A pairing typing communities mention a lot: Type ' + x[0].slice(1) + ' shows up often among people who type as ' + x[1].slice(1) + '. Any 16 type can be any Enneagram type; this is a stereotype, not a rule.', 'Typing-community lore'); });
    edge('ennea', 'mbti', 'lore', 'People love to cross-type the two systems. They describe different things (core motivation vs how you take in information and decide), so any type combination is possible.', 'Typing-community lore');
    edge('ennea', 'big5', 'theory', 'Enneagram types can be described in Big Five terms, and a few small studies report the expected overlaps. Mindprint scores each Enneagram type from four of your scales, many of them Big Five facets.', 'Small comparison studies; Mindprint\u2019s own method');
    var DB5 = [['dcD', 'bE', 'Dominance is the assertive, take-charge style, close to the assertiveness facet of Extraversion.'], ['dcD', 'bA', 'Dominance also leans to the low, more competitive end of Agreeableness.'], ['dcI', 'bE', 'Influence is the outgoing, persuasive, enthusiastic style, close to high Extraversion.'], ['dcS', 'bA', 'Steadiness is the patient, supportive, cooperative style, close to high Agreeableness.'], ['dcC', 'bC', 'Conscientiousness in DISC (Mindprint: Careful) is the accurate, rule-following style, close to Big Five Conscientiousness.']];
    DB5.forEach(function (x) { edge(x[0], x[1], 'theory', x[2] + ' DISC publishers describe overlaps like this; independent research is limited.', 'DISC publishers\u2019 descriptions'); });
    var DT = [['dcD', 'tpcholeric'], ['dcI', 'tpsanguine'], ['dcS', 'tpphlegmatic'], ['dcC', 'tpmelancholic']];
    DT.forEach(function (x) { edge(x[0], x[1], 'lore', 'A common pairing in popular books and trainings: ' + BY[x[0]].title + ' with ' + BY[x[1]].title + '. Both systems have four boxes, so people match them up; the match is not tested.', 'Popular personality books'); });
    edge('atanx', 'bN', 'study', 'Attachment anxiety tends to go with higher Neuroticism: people who worry more in general also tend to worry more about relationships.', 'Noftle and Shaver (2006) and other studies');
    edge('atavo', 'bA', 'study', 'Attachment avoidance tends to go with lower Agreeableness.', 'Noftle and Shaver (2006) and other studies');
    edge('atavo', 'bE', 'study', 'Attachment avoidance also tends to go with lower Extraversion.', 'Noftle and Shaver (2006) and other studies');
    edge('values', 'bO', 'study', 'Openness goes with valuing self-direction and universalism, and against valuing tradition and conformity.', 'Roccas, Sagiv, Schwartz and Knafo (2002) and later studies');
    edge('values', 'bA', 'study', 'Agreeableness goes with valuing benevolence (caring for the people close to you).', 'Roccas, Sagiv, Schwartz and Knafo (2002)');
    edge('conflict', 'bA', 'study', 'More agreeable people lean toward cooperative conflict styles; less agreeable people toward competing.', 'Antonioni (1998) and later studies');
    edge('stress', 'bN', 'study', 'Neuroticism goes with feeling more stressed and with less helpful coping, like wishful thinking and withdrawing.', 'Connor-Smith and Flachsbart (2007), a meta-analysis');
    edge('stress', 'bC', 'study', 'Conscientiousness goes with more problem-solving coping.', 'Connor-Smith and Flachsbart (2007)');
    edge('social', 'bE', 'method', 'Mindprint\u2019s social-energy scale is a narrow slice of Extraversion and moves with it.', 'Mindprint');
    edge('dmintuitive', 'dNS', 'lore', 'Same word, different thing. An \u201cintuitive\u201d decision style means trusting your gut in the moment; N (Intuition) in the 16 types means preferring patterns and possibilities. You can be one without the other.', 'A common mix-up');
    edge('learn', 'think', 'theory', 'Visual vs reading learning preference sounds a lot like the words-vs-pictures slider in Thinking style (Riding\u2019s verbal\u2013imager). The cognitive-style version has more research behind it; matching teaching to a learning style does not.', 'Riding and Cheema (1991); Pashler et al. (2008)');
    edge('think', 'dNS', 'lore', 'Big-picture vs step-by-step sounds like N vs S, and people often treat them as the same. They come from different research traditions and Mindprint measures them separately.', 'A common comparison');
    edge('think', 'bO', 'method', 'Before you take the Thinking quiz, Mindprint guesses your big-picture and pictures sliders partly from your Openness facets.', 'Mindprint');
    edge('team', 'disc', 'lore', 'Team roles and DISC styles get matched up in workplace trainings: Dominant with Leader, Influential with Hype person, Steady with Supporter or Peacekeeper, Careful with Organizer or Researcher.', 'Workplace training lore');
    edge('team', 'conflict', 'method', 'Some roles are scored partly from your conflict style (Leader uses competing, Peacekeeper uses accommodating and compromising).', 'Mindprint');
    edge('arche', 'mbti', 'theory', 'Both descend from Carl Jung, but from different parts of his work: archetypes from his ideas about shared story images, the 16 types from his book on psychological types.', 'Jung');
    var AE = [['arhero', 'e3'], ['arsage', 'e5'], ['arcaregiver', 'e2'], ['arrebel', 'e8'], ['arexplorer', 'e7'], ['arcreator', 'e4'], ['arruler', 'e1']];
    AE.forEach(function (x) { edge(x[0], x[1], 'lore', 'Fans often match ' + BY[x[0]].title + ' with Enneagram ' + BY[x[1]].title + ': the story character and the core motivation sound alike. Not tested.', 'Fan lore'); });
    edge('cluster', 'big5', 'method', 'Your cluster is the closest of 8 hand-made Big Five profiles to your five scores (% match = how close).', 'Mindprint');
    edge('cluster', 'classified', 'method', 'Your cluster becomes a rank in your Classified chain.', 'Mindprint');
    edge('keir', 'classified', 'method', 'Your Keirsey-style group (Mindprint\u2019s Thinkers, Idealists, Keepers or Makers) fills a rank in your Classified chain.', 'Mindprint');
    edge('lenses', 'classified', 'method', 'The Classified card pulls together labels from the fun lenses (tier, phenotype, prototype, latent class).', 'Mindprint');
    /* how Mindprint derives each result */
    var DV = [['big5', 'Your five trait scores come straight from your quiz answers.'], ['attach', 'Your anxiety and avoidance scales come from the quiz (a few Deep Dive childhood answers nudge them a little).'], ['conflict', 'Measured directly by the quiz.'], ['values', 'Measured directly by the quiz.'], ['stress', 'Measured directly by the quiz.'], ['social', 'Measured directly by the quiz.'], ['decide', 'Your five decision scales are measured directly; the top one is your style.'],
      ['mbti', 'Your 4 letters come from four Big Five scores: E from Extraversion, N from Openness, F from Agreeableness, J from Conscientiousness (50 is the cut).'], ['ennea', 'Each of the 9 types is the average of four fitting scales; the highest is yours and the higher neighbour is your wing.'], ['soc', 'Follows from your 4-letter type (with the introvert j/p flip), unless you pick your own.'], ['cogfn', 'Your stack is the standard order for your 4 letters, not measured separately.'], ['keir', 'Read off two of your letters (SJ, SP, NF or NT).'],
      ['temper', 'Your Extraversion and emotional-sensitivity scores pick the quadrant.'], ['disc', 'Each style is scored from a few of your scales; the biggest share wins.'], ['arche', 'Each archetype is scored from a few of your scales; the best fit wins.'], ['learn', 'Estimated from your scales (and flagged as not research-backed).'], ['think', 'A rough guess from your scales until you take the optional 6-question quiz.'], ['team', 'Each role from three scales, blended with the optional quiz.'], ['cluster', 'Nearest of 8 profiles to your Big Five.'], ['lenses', 'Re-sorts of your scores.']];
    DV.forEach(function (x) { edge('mp', x[0], 'method', x[1], 'Mindprint'); });
  }

  /* ---------- your web: which nodes are yours, and why ---------- */
  var MINE = null, HAS = false;
  function setMine(T) {
    MINE = null; HAS = false; if (!T || !T.four) return; build(); var m = {}, R = Math.round;
    var add = function (id, why) { if (BY[id]) m[id] = why; };
    add('mp', 'These are your answers: every lit dot comes from them.');
    var f = T.four; add('t' + f.code, 'Your 4-letter type is ' + f.code + ' (' + f.name + ').' + (f.self ? ' You picked it yourself.' : ''));
    var DN = ['dEI', 'dNS', 'dTF', 'dJP'];
    (f.letters || []).forEach(function (l, i) { add(DN[i], 'You came out ' + l.letter + ' (' + l.word + '), from your ' + l.from + ' score of ' + R(l.score) + '/100.'); });
    if (/^[EI][NS][TF][JP]$/.test(f.code)) { var I = f.code[0] === 'I', ext = f.code[3] === 'J' ? f.code[2] : f.code[1], intr = f.code[3] === 'J' ? f.code[1] : f.code[2], st = I ? [intr + 'i', ext + 'e'] : [ext + 'e', intr + 'i'];
      add('f' + st[0], st[0] + ' is the dominant function in the standard stack for ' + f.code + '.'); add('f' + st[1], st[1] + ' is the helper (auxiliary) function for ' + f.code + '.');
      var kg = f.code[1] === 'N' ? 'N' + f.code[2] : 'S' + f.code[3]; add('k' + kg, f.code + ' falls in the ' + kg + ' group.'); }
    if (T.socionics) { add('s' + T.socionics.code, 'Your Socionics-style type is ' + T.socionics.code + ' (' + T.socionics.letters + ').'); add('q' + T.socionics.quadra, T.socionics.code + ' is in the ' + T.socionics.quadra + ' quadra.'); }
    if (T.ennea) { var n = T.ennea.type; add('e' + n, 'Your Enneagram-style type is ' + T.ennea.code + ' (' + T.ennea.name + '), fit ' + R(T.ennea.match) + '/100.'); add('ewing', 'Your wing is ' + T.ennea.wing + ' (' + T.ennea.wingName + ').');
      if (!m['e' + T.ennea.wing]) add('e' + T.ennea.wing, 'Type ' + T.ennea.wing + ' is your wing.'); add('e' + (n === 8 || n === 9 || n === 1 ? 'gut' : n <= 4 ? 'heart' : 'head'), 'Your type ' + n + ' sits in this triad.'); }
    (T.big5 || []).forEach(function (b) { if (Math.abs(b.score - 50) >= 10) add('b' + b.key, 'Your score is ' + R(b.score) + '/100, clearly on the ' + (b.score >= 50 ? 'high' : 'low') + ' side.'); });
    if (T.temper) add('tp' + T.temper.key, 'Your temperament is ' + T.temper.name + '.');
    if (T.disc) add('dc' + T.disc.key, 'Your DISC-style result is ' + T.disc.code + ' (' + T.disc.name + ', ' + T.disc.color + ').');
    if (T.arche) add('ar' + T.arche.key, 'Your archetype is ' + T.arche.name + '.');
    if (T.attach) { add('at' + T.attach.key, 'Your attachment style is ' + T.attach.name + ' (anxiety ' + T.attach.anxiety + ', avoidance ' + T.attach.avoidance + ').'); if (T.attach.anxiety >= 50) add('atanx', 'Your attachment anxiety is ' + T.attach.anxiety + '/100.'); if (T.attach.avoidance >= 50) add('atavo', 'Your attachment avoidance is ' + T.attach.avoidance + '/100.'); }
    if (T.cognitive) add('dm' + T.cognitive.key, 'Your top decision style is ' + T.cognitive.name + '.');
    if (T.learning) add('ls' + T.learning.key, 'Your learning-style preference is ' + T.learning.name + ' (not research-backed).');
    if (T.thinking) add('th' + T.thinking.key, 'Your thinking style is ' + T.thinking.name + '.');
    if (T.team) add('tr' + T.team.key, 'Your top team role is ' + T.team.name + '.');
    if (T.cluster) add('cl' + T.cluster.key, 'Your cluster is ' + T.cluster.name + ' (' + T.cluster.match + '% match).');
    /* the system hubs you have a result in */
    NODES.forEach(function (x) { if (!x.hub || m[x.id]) return; var mine = NODES.some(function (y) { return !y.hub && y.g === (HUB[x.id] && HUB[x.id].g || x.id) && m[y.id]; }); if (mine || x.g === 'scales' || x.id === 'classified' || x.id === 'lenses') m[x.id] = 'You have a result in this system.'; });
    MINE = m; HAS = true;
  }

  /* ---------- sheets ---------- */
  function kpill(k) { return '<span class="mpk mpk-' + k + '">' + esc(KIND[k][0]) + '</span>'; }
  function other(e, id) { return BY[e.a === id ? e.b : e.a]; }
  function sec(h, x) { return x ? [h, x] : null; }
  function nodeSheet(id) {
    build(); var n = BY[id]; if (!n) return null; var hub = n.hub ? n : BY[n.sys], H = hub || {};
    var es = (ADJ[id] || []).slice().sort(function (a, b) { var o = { study: 0, theory: 1, lore: 2, method: 3, part: 4 }; return o[EDGES[a].k] - o[EDGES[b].k]; });
    var list = es.map(function (i) { var e = EDGES[i], o = other(e, id); return '<button type="button" class="mpx-e" data-x="mape:' + i + '"><span class="mpd" style="background:' + G[o.g][1] + '"></span><span><b>' + esc(o.title) + '</b>' + kpill(e.k) + '</span><i aria-hidden="true">\u203a</i></button>'; }).join('');
    var secs = [sec('What it is', para(esc(n.what))),
      sec('Where it comes from', n.origin ? para(esc(n.origin)) : (hub ? para('Part of ' + esc(H.title) + '. ' + esc(H.origin)) : '')),
      sec('How it connects', (n.conn ? para(esc(n.conn)) : '') + (list ? '<div class="mpx-l">' + list + '</div>' : '')),
      sec('How solid is it', para(esc(n.solid || (hub ? H.solid : '')))),
      MINE && MINE[id] ? sec('In your web', para(esc(MINE[id])) + para('<span class="muted">Inferred from your answers, for fun.</span>')) : null].filter(Boolean);
    return { kicker: G[n.g][0] + (n.hub ? ' \u00b7 ' + (n.kick || 'system') : ''), title: n.title, secs: secs, note: 'The Mindprint Map shows how these systems relate. Links are labelled by how solid they are; nothing here is a diagnosis.' };
  }
  function edgeSheet(i) {
    build(); var e = EDGES[+i]; if (!e) return null; var a = BY[e.a], b = BY[e.b];
    var tx = e.t || (e.k === 'part' ? b.title + ' is one of the parts of ' + a.title + '.' : '');
    var you = MINE && (MINE[e.a] || MINE[e.b]) ? (MINE[e.a] && MINE[e.b] ? 'Both ends are in your web: ' + MINE[e.a] + ' ' + MINE[e.b] : 'One end is in your web: ' + (MINE[e.a] || MINE[e.b])) : '';
    var secs = [sec('The link', para(esc(tx))),
      sec('How solid is it', '<p>' + kpill(e.k) + '</p>' + para(esc(KINDX[e.k]))),
      e.src ? sec('Where it comes from', para(esc(e.src))) : null,
      you ? sec('In your web', para(esc(you))) : null,
      sec('The two ends', '<div class="mpx-l">' + [a, b].map(function (x) { return '<button type="button" class="mpx-e" data-x="mapn:' + x.id + '"><span class="mpd" style="background:' + G[x.g][1] + '"></span><span><b>' + esc(x.title) + '</b><small>' + esc(G[x.g][0]) + '</small></span><i aria-hidden="true">\u203a</i></button>'; }).join('') + '</div>')].filter(Boolean);
    return { kicker: 'Link \u00b7 ' + KIND[e.k][0], title: a.title + ' \u2194 ' + b.title, secs: secs, note: 'Links are labelled honestly: reported correlation in studies, theoretical mapping, community lore, or Mindprint\u2019s own method. No made-up numbers.' };
  }
  function sampleEdge() { build(); for (var i = 0; i < EDGES.length; i++) if (EDGES[i].a === 'dEI' && EDGES[i].b === 'bE') return i; return 0; }
  function counts() { build(); var c = { nodes: NODES.length, edges: EDGES.length }; EDGES.forEach(function (e) { c[e.k] = (c[e.k] || 0) + 1; }); return c; }

  /* ---------- the graph (canvas; adapted from Axon's graph view) ---------- */
  var MEM = {};
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
  function hexA(hex, a) { var h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var v = parseInt(h, 16); return 'rgba(' + (v >> 16 & 255) + ',' + (v >> 8 & 255) + ',' + (v & 255) + ',' + a + ')'; }
  var GOLD = '#ffd166';
  function mount(canvas, opt) {
    build();
    var ctx = canvas.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 3);
    var view = { x: 0, y: 0, k: 1 }, fitK = 1, selected = null, gsel = null, mineOn = !!opt.mine, alpha = 1, raf = 0, dead = false, anim = null;
    var gk = Object.keys(G), nodes = NODES.map(function (n) {
      var m = MEM[n.id], gi = gk.indexOf(n.g), ga = gi / gk.length * Math.PI * 2 + 0.3, gr = n.g === 'mp' ? 0 : 300;
      var cx = Math.cos(ga) * gr, cy = Math.sin(ga) * gr, a = hash(n.id) * Math.PI * 2, rr = n.hub ? 10 : 40 + hash(n.id + 'r') * 60;
      return { id: n.id, n: n, label: n.label, g: n.g, hub: !!n.hub, color: G[n.g][1], x: m ? m.x : cx + Math.cos(a) * rr, y: m ? m.y : cy + Math.sin(a) * rr, vx: 0, vy: 0, deg: (ADJ[n.id] || []).length };
    });
    var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; n.r = n.id === 'mp' ? 11 : n.hub ? 8 : 3.6 + Math.min(3, Math.sqrt(n.deg) * 0.7); });
    var links = EDGES.map(function (e) { return { e: e, a: byId[e.a], b: byId[e.b], k: e.k }; });
    var fresh = nodes.some(function (n) { return !MEM[n.id]; });
    function tick() {
      var n = nodes.length, i, j, a, b, dx, dy, d2, d, f;
      for (i = 0; i < n; i++) { a = nodes[i]; for (j = i + 1; j < n; j++) { b = nodes[j]; dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy; if (d2 < 1) { dx = Math.random() - .5; dy = Math.random() - .5; d2 = 1; } if (d2 > 360000) continue; d = Math.sqrt(d2);
        var minD = (a.r + b.r) * 2 + 22; f = ((a.hub && b.hub ? 9000 : 2600) / d2 + (d < minD ? (minD - d) * 0.5 : 0)) * alpha; a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f; } }
      for (i = 0; i < links.length; i++) { var L = links[i]; a = L.a; b = L.b; dx = b.x - a.x; dy = b.y - a.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
        var len = L.k === 'part' ? 46 : L.k === 'method' ? 220 : 120, st = L.k === 'part' ? 0.06 : L.k === 'method' ? 0.004 : (a.g === b.g ? 0.03 : 0.012);
        f = (d - len) * st * alpha; a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f; }
      var gc = {}; for (i = 0; i < n; i++) { a = nodes[i]; var c = gc[a.g] || (gc[a.g] = { x: 0, y: 0, n: 0 }); c.x += a.x; c.y += a.y; c.n++; }
      for (i = 0; i < n; i++) { a = nodes[i]; var cg = gc[a.g]; if (cg.n > 2) { a.vx += (cg.x / cg.n - a.x) * 0.02 * alpha; a.vy += (cg.y / cg.n - a.y) * 0.02 * alpha; }
        a.vx -= a.x * 0.004 * alpha; a.vy -= a.y * 0.004 * alpha; if (a.id === 'mp') { a.vx -= a.x * 0.05; a.vy -= a.y * 0.05; }
        if (a.fixed) { a.vx = a.vy = 0; continue; } a.vx *= 0.6; a.vy *= 0.6; var sp = Math.sqrt(a.vx * a.vx + a.vy * a.vy); if (sp > 30) { a.vx *= 30 / sp; a.vy *= 30 / sp; } a.x += a.vx; a.y += a.vy; MEM[a.id] = { x: a.x, y: a.y }; }
      alpha *= 0.992;
    }
    alpha = fresh ? 1 : 0.05; for (var t = 0; t < (fresh ? 520 : 10) && alpha > 0.004; t++) tick();
    function resize() { var r = canvas.getBoundingClientRect(); W = r.width; H = r.height; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    function bounds(list) { var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; list.forEach(function (n) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }); return [x0, y0, x1, y1]; }
    function fitTo(list, maxK) { var b = bounds(list), bw = Math.max(1, b[2] - b[0]), bh = Math.max(1, b[3] - b[1]); var k = Math.max(0.12, Math.min((W - 90) / bw, (H - 70) / bh, maxK || 2.4)); return { k: k, x: W / 2 - (b[0] + bw / 2) * k, y: H / 2 - (b[1] + bh / 2) * k - 6 }; }
    function fit() { var v = fitTo(nodes); fitK = v.k; view = v; draw(); }
    function animate(to) { var from = { x: view.x, y: view.y, k: view.k }, t0 = performance.now(); anim = function (now) { var p = Math.min(1, (now - t0) / 320), e = 1 - Math.pow(1 - p, 3); view = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, k: from.k + (to.k - from.k) * e }; draw(); if (p < 1 && !dead) requestAnimationFrame(anim); else anim = null; }; requestAnimationFrame(anim); }
    function S(n) { return { x: n.x * view.k + view.x, y: n.y * view.k + view.y }; }
    function nb(id) { var o = {}; (ADJ[id] || []).forEach(function (i) { var e = EDGES[i]; o[e.a === id ? e.b : e.a] = 1; }); return o; }
    function draw() {
      if (!W) return; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      var focus = selected ? byId[selected] : null, near = focus ? nb(focus.id) : {}, M = mineOn && MINE ? MINE : null, zoomIn = view.k / (fitK || 1);
      links.forEach(function (L) {
        var a = S(L.a), b = S(L.b), hot = focus && (L.a === focus || L.b === focus), mine = M && M[L.a.id] && M[L.b.id], col = KIND[L.k][1];
        var al = hot ? 0.95 : focus ? 0.05 : M ? (mine ? 0.75 : 0.035) : (L.k === 'part' ? 0.16 : L.k === 'method' ? 0.07 : 0.3);
        ctx.strokeStyle = hot ? hexA(col, al) : mine && !focus ? hexA(GOLD, al) : L.k === 'part' || L.k === 'method' ? 'rgba(220,214,240,' + al + ')' : hexA(col, al);
        ctx.lineWidth = hot ? 2 : mine && !focus ? 1.4 : 1;
        ctx.setLineDash(L.k === 'theory' ? [6, 4] : L.k === 'lore' ? [1.5, 3.5] : L.k === 'method' ? [2, 6] : []);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      ctx.setLineDash([]);
      var labels = [], many = zoomIn > 1.7;
      nodes.forEach(function (n) {
        var p = S(n), r = n.r * Math.max(0.85, Math.min(1.7, zoomIn * 0.8 + 0.2)), isF = focus === n, isN = !!near[n.id], mine = M && M[n.id];
        var ing = gsel && n.g === gsel, dim = focus ? !isF && !isN && !ing : M ? !mine : false;
        if (mine && !dim) { ctx.fillStyle = hexA(GOLD, 0.22); ctx.beginPath(); ctx.arc(p.x, p.y, r + 6, 0, 7); ctx.fill(); }
        if (isF) { ctx.fillStyle = hexA(n.color, 0.22); ctx.beginPath(); ctx.arc(p.x, p.y, r + 9, 0, 7); ctx.fill(); ctx.strokeStyle = hexA(n.color, 0.7); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, 7); ctx.stroke(); }
        ctx.fillStyle = dim ? hexA(n.color, 0.18) : n.color; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
        if (n.hub && !dim) { ctx.strokeStyle = 'rgba(18,15,28,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.45, 0, 7); ctx.stroke(); }
        if (mine && !dim) { ctx.strokeStyle = GOLD; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(p.x, p.y, r + 2.5, 0, 7); ctx.stroke(); }
        if (isF || isN || ing || (n.hub && !dim) || (mine && !focus) || (many && !dim)) labels.push({ n: n, x: p.x, y: p.y + r + 4, f: isF, pr: isF ? 1e6 : isN ? 1e5 + n.deg : mine ? 5e4 + n.deg : n.hub ? 1e4 + n.deg : n.deg, dim: dim });
      });
      labels.sort(function (a, b) { return b.pr - a.pr; });
      var placed = []; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
      labels.forEach(function (L) {
        var t = L.n.label.length > 20 ? L.n.label.slice(0, 19) + '\u2026' : L.n.label;
        ctx.font = (L.f || L.n.hub ? '650 ' : '500 ') + (L.f ? 13 : L.n.hub ? 12 : 11) + 'px -apple-system, system-ui, sans-serif';
        var w = ctx.measureText(t).width + 6, box = { l: L.x - w / 2, r: L.x + w / 2, t: L.y - 1, b: L.y + 15 };
        if (box.r < 0 || box.l > W || box.t > H || box.b < 0) return;
        if (!L.f && placed.some(function (q) { return box.l < q.r && box.r > q.l && box.t < q.b && box.b > q.t; })) return;
        placed.push(box); ctx.strokeStyle = 'rgba(18,15,28,.88)'; ctx.lineWidth = 3.5; ctx.strokeText(t, L.x, L.y);
        ctx.fillStyle = L.f ? '#ffffff' : (M && M[L.n.id] && !focus ? '#ffe6a6' : 'rgba(246,241,255,' + (focus && !L.f && !L.dim ? 0.92 : 0.8) + ')'); ctx.fillText(t, L.x, L.y);
      });
    }
    function loop() { raf = 0; if (dead) return; if (alpha > 0.004 || drag) tick(); draw(); if (alpha > 0.004 || drag) raf = requestAnimationFrame(loop); }
    function kick(a) { if (a) alpha = Math.max(alpha, a); if (!raf) raf = requestAnimationFrame(loop); }
    function hitNode(x, y) { var best = null, bd = 1e9; nodes.forEach(function (n) { var p = S(n), d = Math.hypot(p.x - x, p.y - y), lim = Math.max(16, n.r * view.k + 9); if (d < lim && d < bd) { bd = d; best = n; } }); return best; }
    function hitEdge(x, y) { var best = null, bd = 1e9, focus = selected, zoomIn = view.k / (fitK || 1);
      links.forEach(function (L) { var hot = focus && (L.a.id === focus || L.b.id === focus); if (!hot && zoomIn < 1.6) return; if (focus && !hot && zoomIn < 2.4) return;
        var a = S(L.a), b = S(L.b), dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2)), px = a.x + t * dx, py = a.y + t * dy, d = Math.hypot(x - px, y - py);
        if (d < (hot ? 14 : 9) && d < bd && t > 0.06 && t < 0.94) { bd = d; best = L; } });
      return best; }
    function select(id, center, keepG) { if (!keepG) gsel = null; selected = id; draw(); if (id && center && byId[id]) { var n = byId[id], k = Math.max(view.k, fitK * 1.9); animate({ k: k, x: W / 2 - n.x * k, y: H / 2 - n.y * k }); } }
    function showGroup(g) { var list = nodes.filter(function (n) { return n.g === g || (HUB[n.id] && HUB[n.id].g === g); }); if (!list.length) return; gsel = g; animate(fitTo(list, 3.2)); }
    function showMine() { gsel = null; if (!MINE) return; var list = nodes.filter(function (n) { return MINE[n.id]; }); selected = null; animate(fitTo(list.length ? list : nodes)); }
    var pts = {}, drag = null, pan = null, pinch = null, moved = 0, downNode = null;
    function local(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    if (!opt.still) {
      canvas.addEventListener('pointerdown', function (e) { try { canvas.setPointerCapture(e.pointerId); } catch (x) {} var p = local(e); pts[e.pointerId] = p; var ids = Object.keys(pts);
        if (ids.length === 1) { moved = 0; downNode = hitNode(p.x, p.y); if (downNode) drag = { n: downNode, sx: p.x, sy: p.y }; else pan = { sx: p.x, sy: p.y, vx: view.x, vy: view.y }; }
        else if (ids.length === 2) { if (drag) { drag.n.fixed = false; drag = null; } pan = null; moved = 99; var a = pts[ids[0]], b = pts[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: view.k, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, vx: view.x, vy: view.y }; } });
      canvas.addEventListener('pointermove', function (e) { if (!pts[e.pointerId]) return; var p = local(e); pts[e.pointerId] = p; var ids = Object.keys(pts);
        if (pinch && ids.length >= 2) { var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, k = Math.max(0.1, Math.min(6, pinch.k * d / pinch.d)), wx = (pinch.cx - pinch.vx) / pinch.k, wy = (pinch.cy - pinch.vy) / pinch.k; view = { k: k, x: cx - wx * k, y: cy - wy * k }; draw(); return; }
        if (drag) { moved = Math.max(moved, Math.hypot(p.x - drag.sx, p.y - drag.sy)); if (moved > 7) { drag.n.fixed = true; drag.n.x = (p.x - view.x) / view.k; drag.n.y = (p.y - view.y) / view.k; MEM[drag.n.id] = { x: drag.n.x, y: drag.n.y }; kick(0.12); } }
        else if (pan) { moved = Math.max(moved, Math.hypot(p.x - pan.sx, p.y - pan.sy)); view.x = pan.vx + p.x - pan.sx; view.y = pan.vy + p.y - pan.sy; draw(); } });
      var up = function (e) { if (!pts[e.pointerId]) return; var p = pts[e.pointerId]; delete pts[e.pointerId]; var left = Object.keys(pts).length;
        if (left === 0) { if (drag) drag.n.fixed = false;
          if (moved < 8 && !pinch) { if (downNode) { if (selected === downNode.id && opt.onOpen) opt.onOpen(downNode.id); else { select(downNode.id); opt.onSelect && opt.onSelect(downNode.id); } }
            else { var L = hitEdge(p.x, p.y); if (L && opt.onEdge) opt.onEdge(L.e.i); else { select(null); opt.onSelect && opt.onSelect(null); } } }
          drag = null; pan = null; pinch = null; downNode = null; }
        else if (left === 1 && pinch) { pinch = null; var id = Object.keys(pts)[0]; pan = { sx: pts[id].x, sy: pts[id].y, vx: view.x, vy: view.y }; } };
      canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
      canvas.addEventListener('wheel', function (e) { e.preventDefault(); var p = local(e), k = Math.max(0.1, Math.min(6, view.k * Math.exp(-e.deltaY * 0.0015))), wx = (p.x - view.x) / view.k, wy = (p.y - view.y) / view.k; view = { k: k, x: p.x - wx * k, y: p.y - wy * k }; draw(); }, { passive: false });
    }
    function onResize() { var w0 = W; resize(); if (Math.abs(W - w0) > 40) fit(); else draw(); }
    window.addEventListener('resize', onResize);
    resize(); fit(); if (fresh && alpha > 0.004 && !opt.still) kick();
    return {
      select: select, showGroup: showGroup, showMine: showMine, fit: function () { gsel = null; animate(fitTo(nodes)); }, redraw: draw,
      zoom: function (f) { var k = Math.max(0.1, Math.min(6, view.k * f)), cx = W / 2, cy = H / 2, wx = (cx - view.x) / view.k, wy = (cy - view.y) / view.k; animate({ k: k, x: cx - wx * k, y: cy - wy * k }); },
      mine: function (on) { mineOn = !!on; draw(); }, selected: function () { return selected; }, pos: function (id) { var n = byId[id]; return n ? S(n) : null; },
      destroy: function () { dead = true; if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); }
    };
  }

  /* ---------- the Map page ---------- */
  var CUR = null;
  window.addEventListener('hashchange', function () { if (CUR && location.hash.indexOf('#map') !== 0) { CUR.destroy(); CUR = null; } });
  function openX(key) { if (window.MPExplain) MPExplain.open(key); }
  function page(V, o) {
    build(); if (CUR) { CUR.destroy(); CUR = null; }
    var c = counts(), full = !!o.full;
    setMine(full ? o.T : null);
    var leg = '<div class="mpm-leg">' + ['study', 'theory', 'lore', 'method'].map(function (k) { return '<span><i class="mpl mpl-' + k + '"></i>' + esc(KIND[k][0]) + '</span>'; }).join('') + (HAS ? '<span><i class="mpl mpl-mine"></i>Your web</span>' : '') + '</div>';
    var h = '<h1 class="pt">Mindprint Map</h1><p class="muted small">Every system in Mindprint and how they connect: ' + c.nodes + ' dots, ' + c.edges + ' links. Tap a dot to focus it, tap it again for the deep dive. Tap a lit line to see how solid that link is. Pinch or scroll to zoom, drag to move.</p>';
    if (!full) {
      h += '<div class="mpm-wrap mpm-teaser"><canvas class="mpm-cv" aria-hidden="true"></canvas><div class="mpm-lock"><p class="tag">Mindprint Pro</p><h2>See how it all connects</h2><p class="small">16 types, functions, Enneagram, Big Five, Socionics, Keirsey, DISC, attachment and more. Every dot and line opens a deep explanation; your results light up as your web.</p><a class="btn block" href="#pro">Unlock the Map with Pro \u2014 $10</a><button type="button" class="btn ghost block" id="mpfree">Peek at one link free</button><a class="small center codeln" href="#pro">Have a code?</a></div></div>' + leg;
      V.innerHTML = h; var cv0 = V.querySelector('.mpm-cv'); CUR = mount(cv0, { still: true });
      V.querySelector('#mpfree').onclick = function () { openX('mapfree'); }; return;
    }
    var chips = (HAS ? [['mine', '\u2728 Your web']] : []).concat([['all', 'Everything']]).concat(Object.keys(G).filter(function (g) { return g !== 'mp'; }).map(function (g) { return [g, G[g][0]]; }));
    h += '<div class="mpm-chips" role="toolbar">' + chips.map(function (x, i) { return '<button type="button" data-g="' + x[0] + '"' + (i === 0 ? ' class="on"' : '') + '>' + esc(x[1]) + '</button>'; }).join('') + '</div>';
    h += '<div class="mpm-wrap"><canvas class="mpm-cv" aria-label="Map of how the personality systems connect"></canvas><div class="mpm-z"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">\u2212</button><button type="button" data-z="fit" aria-label="Show everything">\u2922</button></div></div>' + leg;
    h += '<div class="card mpm-p" id="mpmp"></div>';
    if (!o.T) h += '<div class="card"><p class="small">Take the quiz and your own results light up here as your web.</p><a class="btn block" href="#start">Start the quiz</a></div>';
    h += '<div class="card"><details class="fold"><summary>How to read the map</summary><p class="small"><b>Dots</b> are systems (big, with a ring) and their parts (small), coloured by system. <b>Lines</b> are labelled by how solid they are: <b>reported correlation in studies</b> (solid) means researchers measured both in the same people and found a tendency; <b>theoretical mapping</b> (dashed) means a theorist or the system\u2019s own rules link them; <b>community lore</b> (dotted) means typing fans say it, untested; <b>Mindprint\u2019s own method</b> (faint) shows how this app works out your results. Thin grey lines just join a system to its parts.</p><p class="small muted">Results are inferred from your answers, for fun. Not an official test of any of these systems and not a diagnosis. Counts on this page are counts of dots and lines, not statistics.</p></details></div>';
    V.innerHTML = h;
    var cv = V.querySelector('.mpm-cv'), P = V.querySelector('#mpmp');
    function panel(id) {
      if (!id) { P.innerHTML = HAS && MINE ? '<p class="tag">Your web</p><p class="small">Gold dots are your results; gold lines join them. Tap any dot.</p><div class="mpm-mine">' + NODES.filter(function (n) { return MINE[n.id] && !n.hub; }).map(function (n) { return '<button type="button" data-n="' + n.id + '"><i style="background:' + G[n.g][1] + '"></i>' + esc(n.label) + '</button>'; }).join('') + '</div>'
        : '<p class="small muted">Tap any dot to see what it is and what it connects to. Studies: ' + (c.study || 0) + ' links \u00b7 theory: ' + (c.theory || 0) + ' \u00b7 lore: ' + (c.lore || 0) + ' \u00b7 Mindprint\u2019s method: ' + (c.method || 0) + ' \u00b7 parts: ' + (c.part || 0) + '.</p>'; return; }
      var n = BY[id], es = (ADJ[id] || []).sort(function (a, b) { var o2 = { study: 0, theory: 1, lore: 2, method: 3, part: 4 }; return o2[EDGES[a].k] - o2[EDGES[b].k]; });
      var mt = /^[\s\S]*?[.!?](\s|$)/.exec(String(n.what)), first = mt ? mt[0] : String(n.what);
      P.innerHTML = '<p class="tag" style="color:' + G[n.g][1] + '">' + esc(G[n.g][0]) + (MINE && MINE[id] ? ' \u00b7 <span class="mpm-y">yours</span>' : '') + '</p><h2>' + esc(n.title) + '</h2><p class="small">' + esc(first) + '</p>' +
        '<button type="button" class="btn block" data-open="' + id + '">Deep explanation</button>' +
        (es.length ? '<p class="mpm-h">' + es.length + ' link' + (es.length > 1 ? 's' : '') + '</p><div class="mpx-l">' + es.slice(0, 40).map(function (i) { var e = EDGES[i], ot = other(e, id); return '<button type="button" class="mpx-e" data-e="' + i + '"><span class="mpd" style="background:' + G[ot.g][1] + '"></span><span><b>' + esc(ot.title) + '</b>' + kpill(e.k) + '</span><i aria-hidden="true">\u203a</i></button>'; }).join('') + '</div>' : '');
    }
    var gr = CUR = mount(cv, { mine: HAS, onSelect: function (id) { panel(id); }, onOpen: function (id) { openX('mapn:' + id); }, onEdge: function (i) { openX('mape:' + i); } });
    panel(null);
    P.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.open) openX('mapn:' + b.dataset.open); else if (b.dataset.e) openX('mape:' + b.dataset.e); else if (b.dataset.n) { gr.select(b.dataset.n, true); panel(b.dataset.n); var wr = V.querySelector('.mpm-wrap'), tb = document.querySelector('.top'); if (wr) window.scrollTo({ top: Math.max(0, wr.getBoundingClientRect().top + window.pageYOffset - (tb ? tb.offsetHeight : 0) - 56), behavior: 'smooth' }); } });
    V.querySelector('.mpm-z').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var z = b.dataset.z; if (z === 'in') gr.zoom(1.4); else if (z === 'out') gr.zoom(1 / 1.4); else { gr.select(null); panel(null); gr.fit(); } });
    V.querySelector('.mpm-chips').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return;
      V.querySelectorAll('.mpm-chips button').forEach(function (x) { x.classList.toggle('on', x === b); }); var g = b.dataset.g;
      if (g === 'mine') { gr.mine(true); gr.select(null); gr.showMine(); panel(null); }
      else if (g === 'all') { gr.mine(false); gr.select(null); gr.fit(); panel(null); }
      else { gr.mine(false); var hid = HUB[g] ? g : (g === 'scales' ? 'conflict' : null); gr.select(hid, false, true); gr.showGroup(g); panel(hid); } });
    if (HAS) gr.showMine();
    var m = /#map#(.+)$/.exec(location.hash); if (m && BY[m[1]]) { gr.select(m[1], true); panel(m[1]); }
  }
  window.MPMap = { build: build, page: page, nodeSheet: nodeSheet, edgeSheet: edgeSheet, sampleEdge: sampleEdge, counts: counts, setMine: setMine, KIND: KIND, _cur: function () { return CUR; }, _nodes: function () { build(); return NODES; }, _edges: function () { build(); return EDGES; } };
})();
