// App shell: state, routing, views.
const $ = (s,el=document) => el.querySelector(s), $$ = (s,el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// ---------------- state ----------------
const S = (() => {
  const K='mt_state_v1';
  const def = {xp:0, streak:0, lastDay:null, days:[], mastery:{}, area:{}, time:{}, placed:false, placement:{}, ach:[], explain:'std', answered:0, correctRun:0, bestRun:0, errors:{}};
  let st = Object.assign({}, def, JSON.parse(localStorage.getItem(K)||'{}'));
  const save = () => localStorage.setItem(K, JSON.stringify(st));
  const today = () => new Date().toLocaleDateString('en-CA');
  function touchDay(){ const d=today(); if(st.lastDay===d) return; const y=new Date(Date.now()-864e5).toLocaleDateString('en-CA'); st.streak = st.lastDay===y? st.streak+1 : 1; st.lastDay=d; if(!st.days.includes(d)) st.days.push(d); save(); }
  return {get:()=>st, save, touchDay, today, reset(){ st=JSON.parse(JSON.stringify(def)); save(); }};
})();
const AREA_OF = c => c.area;
const AREA_LABEL = {notation:'notation & reading',rhythm:'rhythm',intervals:'intervals',chords:'chords',keys:'scales & keys',harmony:'harmony',ear:'ear training',counterpoint:'counterpoint',form:'form',orchestration:'orchestration',jazz:'jazz theory','post-tonal':'post-tonal theory',analysis:'advanced analysis',math:'math of music',musicology:'musicology'};
const GEN_AREA = g => g.startsWith('ear-')?'ear': /rhythm|meter|bpm|note-value/.test(g)?'rhythm': /note-name|tap-note|enharmonic|octave|note-freq|halfwhole|transpose/.test(g)?'notation': /^interval/.test(g)?'intervals': /triad|seventh|inversion|upper/.test(g)?'chords': /scale|keysig|relative|mode/.test(g)?'keys': /prime|forte|ic-vector|^tn$|row|plr|clock/.test(g)?'post-tonal': /overtone|cents|nyquist|info/.test(g)?'math': /ii-v|tritone-sub|coltrane|negative/.test(g)?'jazz':'harmony';
function mastery(id){ return (S.get().mastery[id]||{s:0,n:0}); }
function record(conceptId, area, correct, gen, secs){
  const st=S.get(); S.touchDay();
  if(conceptId){ const m=st.mastery[conceptId]||{s:0,n:0,c:0}; m.n++; if(correct) m.c=(m.c||0)+1; m.s = m.s*0.8 + (correct?0.2:0); st.mastery[conceptId]=m; }
  const a=st.area[area]||{n:0,c:0,s:0.5}; a.n++; if(correct) a.c++; a.s=a.s*0.85+(correct?0.15:0); st.area[area]=a;
  st.time[area]=(st.time[area]||0)+Math.min(secs||0,120);
  if(!correct && gen){ st.errors[gen]=(st.errors[gen]||0)+1; }
  st.answered++; if(correct){ st.correctRun++; st.bestRun=Math.max(st.bestRun,st.correctRun); st.xp += 10 + Math.min(st.correctRun,10); } else st.correctRun=0;
  S.save(); checkAch(); renderHud();
}
// ---------------- achievements ----------------
const ACH = [
  ['first','First answer', s=>s.answered>=1],['ten','10 in a row', s=>s.bestRun>=10],['twentyfive','25 in a row', s=>s.bestRun>=25],
  ['hundred','100 questions answered', s=>s.answered>=100],['thousandxp','1,000 XP', s=>s.xp>=1000],['fivexp','5,000 XP', s=>s.xp>=5000],
  ['placed','Took the diagnostic', s=>s.placed],['streak3','3-day streak', s=>s.streak>=3],['streak7','7-day streak', s=>s.streak>=7],['streak30','30-day streak', s=>s.streak>=30],
  ['tier1','Beginner tier mastered', s=>CONCEPTS.filter(c=>c.tier===1).every(c=>(s.mastery[c.id]||{}).s>=0.6)],
  ['tier2','Intermediate tier mastered', s=>CONCEPTS.filter(c=>c.tier===2).every(c=>(s.mastery[c.id]||{}).s>=0.6)],
  ['tier3','Conservatory tier mastered', s=>CONCEPTS.filter(c=>c.tier===3).every(c=>(s.mastery[c.id]||{}).s>=0.6)],
  ['tier4','PhD tier mastered', s=>CONCEPTS.filter(c=>c.tier===4).every(c=>(s.mastery[c.id]||{}).s>=0.6)],
  ['ears','Golden ears: 100 ear questions', s=>(s.area.ear||{}).n>=100],['sing','Sang in tune (within 10¢)', s=>s.ach.includes('sing')],
  ['vl','Wrote a clean SATB progression', s=>s.ach.includes('vl')],['analyst','Analyzed a score', s=>s.ach.includes('analyst')],
];
function checkAch(){ const s=S.get(); for(const [id,name,f] of ACH){ if(!s.ach.includes(id) && f(s)){ s.ach.push(id); S.save(); toast('🏆 Achievement: '+name); } } }
function grantAch(id){ const s=S.get(); if(!s.ach.includes(id)){ s.ach.push(id); S.save(); const a=ACH.find(x=>x[0]===id); toast('🏆 Achievement: '+(a?a[1]:id)); } }
const level = xp => Math.floor(Math.sqrt(xp/50))+1;
function toast(msg){ const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.classList.add('show'),10); setTimeout(()=>{t.classList.remove('show'); setTimeout(()=>t.remove(),400);},2600); }
function renderHud(){ const s=S.get(); $('#hud').innerHTML=`<span title="level">Lv ${level(s.xp)}</span><span>⚡ ${s.xp} XP</span><span>🔥 ${s.streak}</span>`; }

// ---------------- notation helper ----------------
function exHtml(ex){ const events=ex.ev.split(' ').filter(Boolean).map(tok=>{ const [body,label]=tok.split(':'); const bar=body.endsWith('|'); const notes=body.replace('|','').split('+').map(T.parse); return {notes,label:label?T.pretty(label):'',bar}; });
  const id='ex'+Math.random().toString(36).slice(2); window._ex=window._ex||{}; window._ex[id]=events;
  return `<figure class="ex">${UI.staff(events,{clef:ex.clef||'treble',keySig:ex.ks||0,evW:events.length>8?44:56})}<figcaption><button class="play sm" data-ex="${id}">▶︎ play</button> ${esc(ex.cap||'')}</figcaption></figure>`; }
document.addEventListener('click', e=>{ const b=e.target.closest('[data-ex]'); if(!b) return; const evs=window._ex[b.dataset.ex]; evs.forEach((ev,i)=>ev.notes.length>1?Audio.chord(ev.notes.map(T.midi),i*0.9,0.85):Audio.playMidi(T.midi(ev.notes[0]),i*0.5,0.5)); });

// ---------------- router ----------------
const routes = {};
function go(h){ location.hash=h; }
function route(){ const h=location.hash.slice(1)||'today'; const [name,...args]=h.split('/'); Audio.stopMic&&Audio.stopMic(); if(window._raf){ cancelAnimationFrame(window._raf); window._raf=null; }
  $$('.tabbar a').forEach(a=>a.classList.toggle('on', a.getAttribute('href')==='#'+name || (a.dataset.also||'').split(' ').includes(name)));
  const v=$('#view'); v.innerHTML=''; window.scrollTo(0,0); (routes[name]||routes.today)(v,...args.map(decodeURIComponent)); }
window.addEventListener('hashchange', route);

// ---------------- Today ----------------
function areaStats(){ const st=S.get(); return Object.entries(st.area).filter(([a,v])=>v.n>=3).map(([a,v])=>({a,s:v.s,acc:v.c/v.n,n:v.n})); }
function nextConcepts(){ const st=S.get(); return CONCEPTS.filter(c=>mastery(c.id).s<0.6).sort((a,b)=>{ const ra=c=>c.pre.every(p=>mastery(p).s>=0.6)?0:1; return ra(a)-ra(b) || a.tier-b.tier; }); }
routes.today = v => {
  const st=S.get(); const stats=areaStats().sort((a,b)=>b.s-a.s);
  let plan='';
  if(!st.placed){ plan=`<div class="card hero"><h2>Welcome 🎺</h2><p>Start with a ~24-question adaptive diagnostic across notation, rhythm, intervals, chords, keys, harmony, ear and post-tonal theory. It places you on the skill tree so you don’t waste time on stuff you already know.</p><a class="btn big" href="#diagnostic">Take the diagnostic</a> <a class="btn ghost" href="#learn">Skip, just browse</a></div>`; }
  const ORDER=['notation','rhythm','intervals','chords','keys','harmony','ear','counterpoint','form','jazz','orchestration','post-tonal','analysis','math','musicology'];
  const strong=stats[0]; const shaky=stats.filter(x=>x.acc<0.7).sort((a,b)=>ORDER.indexOf(a.a)-ORDER.indexOf(b.a)); const weak=stats.length>1?(shaky[0]||stats[stats.length-1]):null;
  const errs=Object.entries(st.errors).sort((a,b)=>b[1]-a[1]).slice(0,3);
  let msg='';
  if(strong && weak && strong.a!==weak.a) msg=`You’re strong in <b>${AREA_LABEL[strong.a]||strong.a}</b> (${Math.round(strong.acc*100)}% correct) but weaker in <b>${AREA_LABEL[weak.a]||weak.a}</b> (${Math.round(weak.acc*100)}%), so today we’re focusing there.`;
  else if(stats.length) msg=`Good start in <b>${AREA_LABEL[stats[0].a]||stats[0].a}</b>. Let’s widen out.`;
  const focusArea = weak? weak.a : null;
  const nxt = nextConcepts(); const focusConcept = (focusArea && nxt.find(c=>c.area===focusArea)) || nxt[0];
  const earGen = focusArea==='ear' ? (errs.find(e=>e[0].startsWith('ear-'))||['ear-interval'])[0] : 'ear-interval';
  const errLine = errs.length? `<p class="muted">Most-missed question types: ${errs.map(([g,n])=>`<a href="#practice/${g}">${g.replace(/-/g,' ')}</a> (${n})`).join(', ')}</p>`:'';
  v.innerHTML = plan + `<div class="card"><h2>Today</h2>${msg?`<p class="big-msg">${msg}</p>`:'<p>Answer some questions and I’ll start tailoring your plan.</p>'}${errLine}
   <div class="plan">${focusConcept?`<a class="tile" href="#lesson/${focusConcept.id}"><small>1 · Learn</small><b>${focusConcept.title}</b><span>${TIERS[focusConcept.tier]}</span></a>`:''}
   <a class="tile" href="#practice/${focusArea?areaGens(focusArea).join(','):'mix'}"><small>2 · Practice</small><b>${focusArea?'Drill '+(AREA_LABEL[focusArea]||focusArea):'Mixed practice'}</b><span>infinite, never repeats</span></a>
   <a class="tile" href="#ear/${earGen}"><small>3 · Ear</small><b>${earGen.replace('ear-','').replace(/^\w/,c=>c.toUpperCase())} ear training</b><span>5 minutes</span></a></div></div>
   <div class="card"><h3>Progress</h3>${tierBars()}<p class="muted">Time studied: ${Math.round(Object.values(st.time).reduce((a,b)=>a+b,0)/60)} min · ${st.answered} answers · best run ${st.bestRun}</p></div>`;
};
function areaGens(area){ const all=Object.keys(Q.G); const g=all.filter(x=>GEN_AREA(x)===area && !['tap-note','ear-melody'].includes(x)); return g.length?g:['interval-id']; }
function tierBars(){ return [1,2,3,4,5].map(t=>{ const cs=CONCEPTS.filter(c=>c.tier===t); const m=cs.reduce((a,c)=>a+Math.min(1,mastery(c.id).s/0.6),0)/cs.length; return `<div class="bar"><span>${TIERS[t]}</span><b class="trk"><i style="width:${Math.round(m*100)}%"></i></b><em>${Math.round(m*100)}%</em></div>`; }).join(''); }

// ---------------- Learn (skill tree) ----------------
routes.learn = v => {
  v.innerHTML = `<h2>Skill tree</h2><p class="muted">Five tiers from “what is a note” to PhD. Rings show mastery; ✓ = mastered (60%+ recent accuracy). Prereqs are suggestions, everything is open.</p>` +
   [1,2,3,4,5].map(t=>`<section class="tier"><h3>${t}. ${TIERS[t]}</h3><div class="nodes">${CONCEPTS.filter(c=>c.tier===t).map(node).join('')}</div></section>`).join('');
};
function node(c){ const m=mastery(c.id).s; const ready=c.pre.every(p=>mastery(p).s>=0.6); const pct=Math.round(Math.min(1,m/0.6)*100);
  return `<a class="node ${m>=0.6?'done':ready?'ready':'later'}" href="#lesson/${c.id}"><svg viewBox="0 0 36 36" class="ring"><circle cx="18" cy="18" r="15" class="rbg"/><circle cx="18" cy="18" r="15" class="rfg" stroke-dasharray="${pct*0.942} 100"/></svg><span>${m>=0.6?'✓ ':''}${c.title}</span></a>`; }

// ---------------- Lesson ----------------
const EXPL = [['std','Standard'],['kid','I’m 10'],['berklee','Berklee student'],['jazz','Jazz musician'],['phd','PhD theorist'],['math','Mathematically']];
routes.lesson = (v,id) => { const c=CONCEPT[id]; if(!c) return go('learn'); const st=S.get(); const t0=Date.now();
  const mode=st.explain||'std';
  v.innerHTML = `<a class="back" href="#learn">← Skill tree</a><h2>${c.title}</h2><p class="muted">${TIERS[c.tier]} · ${AREA_LABEL[c.area]||c.area} · mastery ${Math.round(Math.min(1,mastery(c.id).s/0.6)*100)}%</p>
  <div class="chips" id="expl">${EXPL.map(([k,l])=>`<button class="chip ${k===mode?'on':''}" data-k="${k}">${l}</button>`).join('')}</div>
  <div class="card" id="explbox"></div>
  <div class="card lesson">${c.lesson}${(c.ex||[]).map(exHtml).join('')}${c.rhythm?c.rhythm.map(g=>`<figure class="ex">${UI.rhythm(g)}</figure>`).join(''):''}</div>
  ${c.examples&&c.examples.length?`<div class="card"><h3>Real examples</h3><ul class="exlist">${c.examples.map(([k,t])=>`<li><b>${k}:</b> ${t}</li>`).join('')}</ul></div>`:''}
  <div class="card"><h3>Connected concepts</h3><div class="chips">${c.links.map(l=>CONCEPT[l]?`<a class="chip" href="#lesson/${l}">${CONCEPT[l].title}</a>`:'').join('')}</div>${c.pre.length?`<p class="muted">Builds on: ${c.pre.map(p=>`<a href="#lesson/${p}">${CONCEPT[p].title}</a>`).join(', ')}</p>`:''}</div>
  <a class="btn big" href="#quiz/${c.id}">Quiz me on this</a>`;
  const showExpl = k => { $('#explbox').innerHTML = k==='std'? `<p class="muted">Pick a teacher above to hear this explained a different way.</p>` : `<p><b>${EXPL.find(e=>e[0]===k)[1]}:</b> ${c.explain[k]}</p>`; };
  showExpl(mode);
  $('#expl').onclick = e => { const b=e.target.closest('.chip'); if(!b) return; st.explain=b.dataset.k; S.save(); $$('#expl .chip').forEach(x=>x.classList.toggle('on',x===b)); showExpl(b.dataset.k); };
  window._leave=()=>{ const st2=S.get(); st2.time[c.area]=(st2.time[c.area]||0)+Math.min(600,(Date.now()-t0)/1000); S.save(); };
};
window.addEventListener('hashchange',()=>{ if(window._leave){ const f=window._leave; window._leave=null; f(); } }, true);

// ---------------- Quiz runner ----------------
// source(): returns next question object; opts {title, count (null=endless), concept, onDone}
function runQuiz(v, source, opts={}){
  let i=0, right=0, startT=Date.now(), cur=null, answered=false;
  v.innerHTML = `<a class="back" href="${opts.back||'#learn'}">← back</a><h2>${opts.title||'Quiz'}</h2><div class="qmeta" id="qmeta"></div><div class="card q" id="qbox"></div>`;
  function next(){
    if(opts.count && i>=opts.count){ return finish(); }
    cur = source(i); if(!cur){ return finish(); } answered=false; startT=Date.now();
    $('#qmeta').textContent = opts.count? `Question ${i+1} of ${opts.count} · ${right} correct` : `${i} answered · ${right} correct · never repeats`;
    const qb=$('#qbox');
    let html = `<div class="prompt">${cur.prompt}</div>`;
    if(cur.staff) html += `<div class="qstaff">${cur.staff}</div>`;
    if(cur.play) html += `<button class="play" id="qplay">▶︎ ${cur.ear?'Play':'Hear it'}</button>`;
    if(cur.type==='piano'||cur.type==='melody'){ html += `<div id="qpiano" class="qpiano"></div><div id="qtaps" class="muted"></div>${cur.type==='melody'?'<button class="btn ghost sm" id="qundo">undo</button>':''}`; }
    else html += `<div class="choices">${cur.choices.map((c,k)=>`<button class="choice" data-i="${k}">${cur.render?cur.render(c):esc(c).replace(/&lt;(\/?(b|i|sub|sup))&gt;/g,'<$1>')}</button>`).join('')}</div>`;
    html += `<div id="fb"></div>`;
    qb.innerHTML = html;
    if(cur.play){ $('#qplay').onclick=()=>cur.play(); if(cur.ear) setTimeout(()=>cur.play(),250); }
    if(cur.type==='piano'){ UI.piano($('#qpiano'),{from:48,to:84,onNote:m=>{ if(answered) return; done(m===cur.answerMidi, `You tapped ${T.PC_NAMES_SHARP[m%12]}${Math.floor(m/12)-1}.`); }}); }
    else if(cur.type==='melody'){ const taps=[]; const upd=()=>$('#qtaps').textContent='Your notes: '+(taps.map(m=>T.PC_NAMES_SHARP[m%12]+(Math.floor(m/12)-1)).join(' ')||'—');
      upd(); UI.piano($('#qpiano'),{from:48,to:84,onNote:m=>{ if(answered) return; taps.push(m); upd(); if(taps.length===cur.answerMidis.length){ const ok=taps.every((x,k)=>x===cur.answerMidis[k]); const okPc=taps.every((x,k)=>x%12===cur.answerMidis[k]%12); done(ok||okPc, ok?'':okPc?'(right notes, octave aside — counts!)':''); } }});
      $('#qundo').onclick=()=>{ taps.pop(); upd(); }; }
    else $$('.choice',qb).forEach(b=>b.onclick=()=>{ if(answered) return; const c=cur.choices[+b.dataset.i]; b.classList.add(c===cur.answer?'right':'wrong'); if(c!==cur.answer) $$('.choice',qb).forEach(x=>{ if(cur.choices[+x.dataset.i]===cur.answer) x.classList.add('right'); }); done(c===cur.answer); });
  }
  function done(ok, extra=''){
    answered=true; i++; if(ok) right++;
    const area = cur.area || (opts.concept? CONCEPT[opts.concept].area : GEN_AREA(cur.gen||''));
    record(opts.concept || cur.concept || conceptForGen(cur.gen), cur.gen?GEN_AREA(cur.gen):area, ok, cur.gen, (Date.now()-startT)/1000);
    if(navigator.vibrate) navigator.vibrate(ok?15:[30,40,30]);
    $('#fb').innerHTML = `<div class="feedback ${ok?'ok':'no'}"><b>${ok?'✅ Correct':'❌ Not quite'}</b> ${extra} <div>${cur.explain||''}</div>${!ok&&cur.type?`<div>Answer: ${cur.answer}</div>`:''}</div><button class="btn" id="qnext">${opts.count&&i>=opts.count?'Finish':'Next →'}</button>`;
    $('#qnext').onclick=next; $('#qnext').focus({preventScroll:true});
    $('#fb').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function finish(){ const pct=i?Math.round(right/i*100):0; $('#qbox').innerHTML=`<h3>${right}/${i} correct (${pct}%)</h3><p>${opts.finishMsg?opts.finishMsg:pct>=80?'Excellent — this concept is sticking. 🔥':pct>=60?'Solid. A bit more practice will lock it in.':'This one needs more reps — review the lesson and try again.'}</p><a class="btn" href="${opts.back||'#learn'}">Done</a> <button class="btn ghost" id="again">Again</button>`; $('#again').onclick=()=>runQuiz(v,source,opts); opts.onDone&&opts.onDone(right,i); }
  next();
}
function conceptForGen(g){ if(!g) return null; const c=CONCEPTS.find(c=>c.quiz.gens.includes(g)); return c?c.id:null; }
routes.quiz = (v,id) => { const c=CONCEPT[id]; if(!c) return go('learn'); const mcqs=Q.shuffle(c.quiz.mcq.map(Q.fromMcq)); const gens=c.quiz.gens; const n=gens.length? 8 : mcqs.length;
  let mi=0; runQuiz(v, i => { if(mcqs.length && (i%3===2 || !gens.length) && mi<mcqs.length) return mcqs[mi++]; if(!gens.length) return null; return Q.make(gens[i%gens.length], c.tier+1); }, {title:'Quiz: '+c.title, count:n, concept:c.id, back:'#lesson/'+c.id}); };

// ---------------- Practice (infinite generator) ----------------
const PRACTICE_GROUPS = [
  ['Notation',['note-name-treble','note-name-bass','note-name-alto','note-name-treble-acc','enharmonic','tap-note']],['Rhythm',['note-value','rhythm-beats','meter-type','bpm']],
  ['Intervals',['interval-id','interval-build','interval-semis','interval-invert']],['Chords',['triad-id','triad-spell','seventh-id','seventh-spell','inversion-id']],
  ['Scales & keys',['scale-spell','scale-id','scale-degree','keysig-id','keysig-count','relative-key','mode-id','mode-parent','scale-spell-penta']],
  ['Harmony',['roman-id','roman-spell','function-id','dom7-of','tritone-of','secondary-spell','borrowed-id','n6-spell','aug6-id','cadence-id','pivot-chord']],
  ['Counterpoint & VL',['vl-error','consonance-id']],['Orchestration',['transpose-inst']],['Jazz',['ii-v-i','upper-structure','tritone-sub','scale-spell-jazz','coltrane-cycle','negative']],
  ['Post-tonal',['prime-form','forte','ic-vector','tn','row-transform']],['Neo-Riemannian',['plr','plr-chain']],['Math of music',['clock-math','overtone','cents','nyquist','info-bits']]];
routes.practice = (v,preset) => {
  if(preset){ const gens = preset==='mix'? PRACTICE_GROUPS.flatMap(g=>g[1]) : preset.split(','); return runQuiz(v, i=>Q.make(Q.pick(gens), 3+(i>10?1:0)+(i>25?1:0)), {title:'Practice', back:'#practice'}); }
  v.innerHTML = `<h2>Infinite practice</h2><p class="muted">Procedurally generated — every question is new (seen questions are tracked so they don’t repeat). Pick topics, then go.</p>
   <div class="card"><div class="chips" id="pg">${PRACTICE_GROUPS.map(([n,g],k)=>`<button class="chip" data-k="${k}">${n}</button>`).join('')}</div>
   <p><button class="btn big" id="pgo">Start</button> <a class="btn ghost" href="#practice/mix">Mix everything</a></p></div>
   <div class="card"><h3>Or a single skill</h3><div class="chips">${PRACTICE_GROUPS.flatMap(g=>g[1]).map(g=>`<a class="chip" href="#practice/${g}">${g.replace(/-/g,' ')}</a>`).join('')}</div></div>`;
  $('#pg').onclick=e=>{ const b=e.target.closest('.chip'); if(b) b.classList.toggle('on'); };
  $('#pgo').onclick=()=>{ const ks=$$('#pg .chip.on').map(b=>+b.dataset.k); if(!ks.length) return toast('Pick at least one topic'); go('practice/'+ks.flatMap(k=>PRACTICE_GROUPS[k][1]).join(',')); };
};

// ---------------- Ear ----------------
const EAR = [['ear-interval','Intervals'],['ear-chord','Triads'],['ear-seventh','Seventh chords'],['ear-progression','Progressions'],['ear-cadence','Cadences'],['ear-mode','Modes & scales'],['ear-rhythm','Rhythmic dictation'],['ear-melody','Melodic dictation'],['ear-micro','Microtones']];
routes.ear = (v,gen) => {
  if(gen){ const lv={}; return runQuiz(v, i=>Q.make(gen, 2+Math.min(3,Math.floor(i/6))), {title:(EAR.find(e=>e[0]===gen)||[0,'Ear'])[1]+' (ear)', back:'#ear'}); }
  v.innerHTML = `<h2>Ear training</h2><p class="muted">Headphones help. Questions auto-play; tap ▶︎ to replay. Difficulty rises as you go.</p>
   <div class="grid">${EAR.map(([g,n])=>`<a class="tile" href="#ear/${g}"><b>${n}</b><span>${((S.get().area.ear||{}).n?'':'')}</span></a>`).join('')}<a class="tile" href="#sing"><b>🎤 Sing it</b><span>pitch detection, cents sharp/flat</span></a></div>`;
};
routes.sing = v => {
  v.innerHTML = `<a class="back" href="#ear">← Ear</a><h2>🎤 Sing / play the note</h2><p class="muted">Uses your microphone (stays on your device). Works for voice or trumpet. Hold the note steady.</p>
   <div class="card center"><div class="target" id="tgt">—</div><button class="play" id="hear">▶︎ Hear target</button> <button class="btn ghost sm" id="newt">New note</button>
   <div class="tuner"><div class="needle" id="needle"></div><div class="scale"><span>−50¢</span><span>0</span><span>+50¢</span></div></div>
   <div class="detected" id="det">tap Start</div><button class="btn big" id="start">Start mic</button>
   <p class="muted">Range: <select id="rng"><option value="48,64">Low voice (C3–E4)</option><option value="55,72" selected>Mid voice (G3–C5)</option><option value="60,79">High voice (C4–G5)</option><option value="52,82">Trumpet concert (E3–B♭5)</option></select></p></div>`;
  let target=60, hold=0;
  const newT=()=>{ const [a,b]=$('#rng').value.split(',').map(Number); target=a+Q.R(b-a+1); $('#tgt').textContent=T.PC_NAMES_SHARP[target%12]+(Math.floor(target/12)-1); hold=0; };
  newT(); $('#newt').onclick=newT; $('#rng').onchange=newT; $('#hear').onclick=()=>Audio.playMidi(target,0,1.5);
  $('#start').onclick=async()=>{ try{ await Audio.startMic(); $('#start').remove(); loop(); }catch(e){ $('#det').textContent='Microphone blocked: allow mic access in your browser settings.'; } };
  function loop(){ const p=Audio.detectPitch(); if(p){ const diff=(p.midi-target)*100+p.cents; const name=T.PC_NAMES_SHARP[p.midi%12]+(Math.floor(p.midi/12)-1);
      $('#det').innerHTML=`${name} <b>${p.cents>0?'+':''}${p.cents}¢</b> · ${p.freq.toFixed(1)} Hz${p.midi!==target?` · <span class="warn">${diff>0?'too high':'too low'} by ${Math.abs(Math.round(diff))}¢</span>`:Math.abs(p.cents)<=10?' · <span class="good">in tune ✓</span>':` · ${p.cents>0?'sharp':'flat'}`}`;
      const c=Math.max(-50,Math.min(50, p.midi===target?p.cents:(diff>0?50:-50))); $('#needle').style.left=(50+c)+'%'; $('#needle').className='needle '+(Math.abs(c)<=10&&p.midi===target?'good':'');
      if(p.midi===target && Math.abs(p.cents)<=10){ hold++; if(hold===25){ toast('Nailed it! +15 XP'); const st=S.get(); st.xp+=15; S.save(); renderHud(); grantAch('sing'); record(null,'ear',true,'sing',3); setTimeout(newT,800); } } else hold=Math.max(0,hold-1); }
    window._raf=requestAnimationFrame(loop); }
};

// ---------------- Diagnostic ----------------
const DIAG = {notation:['note-name-treble','note-name-bass','enharmonic','note-name-alto','transpose-inst'], rhythm:['note-value','rhythm-beats','meter-type','bpm','ear-rhythm'],
  intervals:['halfwhole','interval-semis','interval-id','interval-build','interval-id'], chords:['triad-id','triad-spell','seventh-id','inversion-id','upper-structure'],
  keys:['keysig-count','relative-key','scale-spell','mode-id','mode-parent'], harmony:['function-id','roman-id','secondary-spell','borrowed-id','aug6-id'],
  ear:['ear-interval','ear-chord','ear-cadence','ear-seventh','ear-interval'], 'post-tonal':['clock-math','prime-form','plr','forte','ic-vector']};
const DIAG_PLACE = {notation:['notation'],rhythm:['rhythm'],intervals:['intervals'],chords:['chords'],keys:['keys'],harmony:['harmony','form','counterpoint'],ear:['ear'],'post-tonal':['post-tonal','analysis','math','jazz']};
routes.diagnostic = v => {
  const areas=Object.keys(DIAG); const per=3; const state=Object.fromEntries(areas.map(a=>[a,{lvl:1,best:-1,k:0}]));
  runQuiz(v, i => { const a=areas[Math.floor(i/per)]; if(!a) return null; const s=state[a]; const q=Q.make(DIAG[a][s.lvl], s.lvl+1); q.area=a; q._a=a; q._l=s.lvl; return q; },
   {title:'Diagnostic placement', count:areas.length*per, back:'#today', finishMsg:'Placement done — here’s where you landed.', onDone:()=>{ $('#qbox').insertAdjacentHTML('beforeend', window._diagCard||''); } });
  // hook into answers: observe feedback to adapt
  const obs=new MutationObserver(()=>{ const fb=$('.feedback'); if(!fb||fb._seen) return; fb._seen=true; const meta=$('#qmeta').textContent.match(/Question (\d+)/); const idx=meta?+meta[1]-1:0; const a=areas[Math.floor(idx/per)]; if(!a) return; const s=state[a]; const ok=fb.classList.contains('ok');
      if(ok){ s.best=Math.max(s.best,s.lvl); s.lvl=Math.min(4,s.lvl+1); } else { s.lvl=Math.max(0,s.lvl-1); }
      if(idx===areas.length*per-1){ finishDiag(); } });
  obs.observe(v,{subtree:true,childList:true});
  function finishDiag(){ obs.disconnect(); const st=S.get(); st.placed=true; st.placement={};
    for(const a of areas){ const L=state[a].best+1; st.placement[a]=L; const tierMax = L>=5?3: L>=3?2: L>=1?1:0; const extra= a==='post-tonal'? (L>=4?4: L>=2?3:0): tierMax;
      for(const c of CONCEPTS){ if(DIAG_PLACE[a].includes(c.area) && c.tier<= (a==='post-tonal'?extra:tierMax) && c.tier<5){ const m=st.mastery[c.id]||{s:0,n:0,c:0}; m.s=Math.max(m.s,0.65); st.mastery[c.id]=m; } } }
    S.save(); grantAch('placed');
    window._diagCard = (`<div class="card"><h3>Your placement</h3>${areas.map(a=>`<div class="bar"><span>${AREA_LABEL[a]||a}</span><b class="trk"><i style="width:${state[a].best<0?4:(state[a].best+1)*20}%"></i></b><em>level ${state[a].best+1}/5</em></div>`).join('')}<p>I marked what you already know as placed on the skill tree. Your <b>Today</b> plan now targets the weakest areas.</p><a class="btn" href="#today">See today’s plan</a> <a class="btn ghost" href="#learn">Skill tree</a></div>`); }
};

// ---------------- Me ----------------
routes.me = v => { const st=S.get();
  v.innerHTML = `<h2>Profile</h2><div class="card stats"><div><b>${level(st.xp)}</b><span>level</span></div><div><b>${st.xp}</b><span>XP</span></div><div><b>${st.streak}</b><span>day streak</span></div><div><b>${st.answered}</b><span>answers</span></div></div>
  <div class="card"><h3>Skill by area</h3>${Object.entries(st.area).sort((a,b)=>b[1].s-a[1].s).map(([a,x])=>`<div class="bar"><span>${AREA_LABEL[a]||a}</span><b class="trk"><i style="width:${Math.round(x.c/x.n*100)}%"></i></b><em>${Math.round(x.c/x.n*100)}% · ${x.n}q · ${Math.round((st.time[a]||0)/60)}m</em></div>`).join('')||'<p class="muted">No answers yet.</p>'}</div>
  <div class="card"><h3>Achievements (${st.ach.length}/${ACH.length})</h3><div class="ach">${ACH.map(([id,n])=>`<div class="${st.ach.includes(id)?'got':''}">${st.ach.includes(id)?'🏆':'🔒'} ${n}</div>`).join('')}</div></div>
  <div class="card"><h3>Data</h3><p class="muted">Progress is saved on this device.</p><button class="btn ghost" id="exp">Export progress</button> <label class="btn ghost">Import<input type="file" id="imp" hidden accept=".json"></label> <button class="btn ghost danger" id="rst">Reset everything</button></div>`;
  $('#rst').onclick=()=>{ if(confirm('Erase all progress?')){ S.reset(); localStorage.removeItem('mt_seen'); route(); renderHud(); } };
  $('#exp').onclick=()=>{ const b=new Blob([JSON.stringify(S.get())],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='music-theory-progress.json'; a.click(); };
  $('#imp').onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try{ const d=JSON.parse(await f.text()); localStorage.setItem('mt_state_v1',JSON.stringify(d)); location.reload(); }catch(err){ toast('Not a valid progress file'); } };
};
routes.more = v => { v.innerHTML = `<h2>More</h2><div class="grid">${(window.MORE_TILES||[]).map(([h,t,d])=>`<a class="tile" href="${h}"><b>${t}</b><span>${d}</span></a>`).join('')}<a class="tile" href="#me"><b>👤 Profile</b><span>XP, streak, achievements, stats</span></a><a class="tile" href="#about"><b>ℹ️ About</b><span>what’s in here, what’s coming</span></a></div>`; };
routes.about = v => { v.innerHTML = `<h2>About</h2><div class="card"><p>${CONCEPTS.length} concepts across 5 tiers, ${Object.keys(Q.G).length} procedural question generators, ear training, tools.</p><p><b>Coming soon (not built yet, so not faked):</b> PDF score and audio-recording analysis, a notation editor / piano roll with MIDI export, citation manager.</p><p class="muted">Piano samples: Salamander Grand Piano (CC-BY, Alexander Holm), loaded when online; a built-in synth is used otherwise. Notation glyphs: Noto Music.</p></div>`; };

window.addEventListener('DOMContentLoaded', ()=>{ renderHud(); route(); if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{}); });
