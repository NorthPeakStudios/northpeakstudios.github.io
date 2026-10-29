// Trace · 1.5 features (Northpeak Studios). Everything here is worked out on this phone from YOUR logs; nothing new is sent anywhere.
// Stacks, Say it, tags, caffeine curve, how-I-felt calendar, missed-day ghosts, fingerprints, lag finder, combo watch, before/after split,
// weekly recap, experiments, a confidence meter on every comparison, one-page doctor PDF, and a private lock (passcode + Face ID).
// New data lives in localStorage 'trc.feat' (stacks, experiments, caffeine settings) and 'trc.lock' (lock), on this phone only, not synced.
// Entries can carry an optional `tag` (food, sleep, workout…): additive, old entries simply have none. Correlation, not cause; never amounts advice.
(function(){
const DAY=864e5, HR=36e5;
const FK='trc.feat';
const PRO_GATED=true; // pattern screens follow Insights (Pro). Set false to make them free.
const pro=()=>!PRO_GATED||P();
function feat(){ let f=null; try{ f=JSON.parse(localStorage.getItem(FK)||'null'); }catch(e){} if(!f||typeof f!=='object') f={}; f.v=1; f.stacks=Array.isArray(f.stacks)?f.stacks:[]; f.exps=Array.isArray(f.exps)?f.exps:[]; f.caf=f.caf&&typeof f.caf==='object'?f.caf:{}; f.caf.per=f.caf.per&&typeof f.caf.per==='object'?f.caf.per:{}; return f; }
function saveFeat(f){ try{ localStorage.setItem(FK,JSON.stringify(f)); }catch(e){ toast('Storage is full on this phone'); } }
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const sd=a=>{ if(a.length<2) return null; const m=mean(a); return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1)); };
const f1=x=>x==null?'–':x.toFixed(1);
const sg=x=>x==null?'–':(x>0?'+':x<0?'−':'±')+Math.abs(x).toFixed(1);
const pl=(n,w)=>n+' '+w+(n===1?'':'s');
const dk=t=>Store.dayKey(t);
const kdT=k=>new Date(k+'T12:00').getTime();
const addD=(k,n)=>{ const d=new Date(k+'T12:00'); d.setDate(d.getDate()+n); return dk(d.getTime()); };
const dS=k=>new Date(kdT(k)).toLocaleDateString([], {month:'short',day:'numeric'});
const M=()=>Store.METRICS;
const ML=m=>(M().find(x=>x[0]===m)||[m,m])[1];
const BAD=new Set(['anxiety']); // higher anxiety = worse
const better=(m,d)=>BAD.has(m)?-d:d;
const NEG=new Set(['headache','nausea','dry mouth','drowsy','jittery','dizzy','stomach upset','trouble sleeping','racing heart','sweating','irritable']);

/* ---------- day data, built once per render ---------- */
function days(){ const D={}; for(const x of Store.entries()){ const k=dk(x.t); const o=D[k]=D[k]||{f:{},fx:{},uses:new Set(),n:0}; o.n++;
    if(x.what) o.uses.add(Store.keyOf(x.what));
    if(x.feel) for(const [m] of M()) if(x.feel[m]) (o.f[m]=o.f[m]||[]).push(x.feel[m]);
    for(const f of (x.fx||[])) o.fx[f]=(o.fx[f]||0)+1; }
  for(const k in D){ const o=D[k]; const a={}; for(const m in o.f) a[m]=mean(o.f[m]); o.a=a; o.score=score(a); }
  return D; }
/* overall day score: mean of what was rated that day (anxiety flipped so higher is always better) */
function score(a){ const v=[]; for(const [m] of M()){ if(m==='appetite') continue; if(a[m]!=null) v.push(BAD.has(m)?6-a[m]:a[m]); } return v.length?mean(v):null; }
const val=(o,m)=>!o?null:m==='overall'?o.score:(o.a[m]!=null?o.a[m]:null);
function namesMap(){ const m={}; for(const x of Store.entries()){ if(!x.what) continue; const k=Store.keyOf(x.what); const o=m[k]=m[k]||{key:k,name:x.what.trim(),n:0,first:x.t,last:x.t,days:new Set(),tags:{}}; o.n++; o.first=Math.min(o.first,x.t); o.last=Math.max(o.last,x.t); o.days.add(dk(x.t)); if(x.tag) o.tags[x.tag]=(o.tags[x.tag]||0)+1; } return m; }
const tagOf=o=>{ const e=Object.entries(o.tags||{}).sort((a,b)=>b[1]-a[1])[0]; return e?e[0]:''; };

/* ---------- 10. confidence meter: how much to trust a difference between two groups of days ---------- */
const MIN=5;
function conf(A,B){ const na=A.length, nb=B.length; const d=(mean(A)!=null&&mean(B)!=null)?mean(A)-mean(B):null;
  if(na<MIN||nb<MIN) return {lvl:0,d,na,nb,txt:`Not enough data yet: needs ${MIN}+ days on each side (now ${na} and ${nb}).`};
  const s=Math.sqrt(((sd(A)||0.8)**2+(sd(B)||0.8)**2)/2)||0.8; const t=Math.abs(d)/(s*Math.sqrt(1/na+1/nb));
  const lvl=t>=2.5&&Math.min(na,nb)>=8?3:t>=1.6?2:1;
  return {lvl,d,na,nb,t,txt:lvl===3?`Strong for your logs (${na} vs ${nb} days).`:lvl===2?`Fair: worth watching (${na} vs ${nb} days).`:`Weak: could easily be chance (${na} vs ${nb} days).`}; }
function meter(c,short){ const w=['Not enough data','Weak','Fair','Strong'][c.lvl];
  return `<span class="cmeter l${c.lvl}" role="img" aria-label="Confidence: ${w}"><i></i><i></i><i></i></span>${short?`<small class="muted"> ${w}</small>`:`<small class="muted"> ${esc(c.txt)}</small>`}`; }
window.TrcConf={conf,meter};
const NOTE='<div class="note">From your own logs only. These show what tends to happen <b>together</b>, not what causes what. Not medical advice.</div>';
const colr=(m,d,lvl)=>{ if(d==null||lvl===0||Math.abs(d)<0.25) return '#64748b'; if(lvl===1) return better(m,d)>0?'#5e8f89':'#a86a6a'; return better(m,d)>0?'#5eead4':'#f87171'; };

/* ---------- Insights › Deep dives: one tab, six screens ---------- */
const SUB=[['fp','Fingerprints'],['lag','Lag finder'],['combo','Combo watch'],['split','Before/after'],['recap','Weekly recap'],['exp','Experiments']];
function subnav(on){ return (window.TrcNav?TrcNav('fp'):'')+`<div class="seg tabs sub2" role="tablist" aria-label="Deep dives">${SUB.map(([id,l])=>`<a href="#${id}" class="${on===id?'on':''}" ${on===id?'aria-current="page"':''}>${l}</a>`).join('')}</div>`; }
function gate(v,on,name,line){ if(pro()) return false; TrcPro.locked(v,name,line); v.insertAdjacentHTML('afterbegin',subnav(on)); return true; }
function thingPicker(id,key,list){ return `<select id="${id}" aria-label="Pick something you log">${list.map(n=>`<option value="${esc(n.key)}" ${n.key===key?'selected':''}>${esc(n.name)} (${n.n})</option>`).join('')}</select>`; }
const byLast=m=>Object.values(m).sort((a,b)=>b.last-a.last);

/* ---------- 1. Effect fingerprint: after 2 weeks, each thing's pattern on every feeling, at a glance ---------- */
const TAGS=[['med','Med / supplement','',''],['caffeine','Caffeine','e.g. coffee, energy drink','mg'],['food','Food','e.g. pizza, big lunch','meal'],['drink','Drink','e.g. beer, water','glass'],['sleep','Sleep','e.g. nap, slept','h'],['workout','Workout','e.g. run, lifting','min'],['screen','Screen time','e.g. phone, gaming','h'],['other','Other','anything','']];
let fpTag='';
routes.fp=v=>{ if(gate(v,'fp','Effect fingerprints','After two weeks of logging, every thing you log gets a fingerprint: how your mood, sleep, energy and more tend to look on days you log it.')) return;
  const D=days(), nm=namesMap(), all=byLast(nm); const tagsHere=TAGS.filter(t=>all.some(o=>tagOf(o)===t[0]));
  const ready=o=>Date.now()-o.first>=14*DAY; const list=all.filter(o=>!fpTag||tagOf(o)===fpTag).sort((a,b)=>(ready(b)-ready(a))||(b.days.size-a.days.size));
  const felt=Object.keys(D).filter(k=>D[k].score!=null);
  const rows=list.map(o=>{ const age=Math.floor((Date.now()-o.first)/DAY);
    if(age<14) return `<div class="card fp wait"><b>${esc(o.name)}</b><small class="muted"> · fingerprint ready in ${pl(14-age,'day')} (first logged ${esc(dS(dk(o.first)))})</small></div>`;
    let best=null, c0=null; const cells=M().map(([m,l])=>{ const A=[],B=[]; for(const k of felt){ const x=D[k].a[m]; if(x==null) continue; (D[k].uses.has(o.key)?A:B).push(x); }
      const c=conf(A,B); if(!c0||Math.min(c.na,c.nb)>Math.min(c0.na,c0.nb)) c0=c; if(c.lvl&&(!best||Math.abs(c.d)*c.lvl>Math.abs(best.c.d)*best.c.lvl)) best={m,c};
      return `<div class="fpc" style="border-color:${colr(m,c.d,c.lvl)}"><small>${esc(l)}</small><b style="color:${colr(m,c.d,c.lvl)}">${c.lvl?sg(c.d):'·'}</b></div>`; }).join('');
    const sum=best&&best.c.lvl>=2&&Math.abs(best.c.d)>=0.25?`${esc(ML(best.m))} tends to be <b>${better(best.m,best.c.d)>0?'better':'worse'}</b> on days with it (${sg(best.c.d)}).`:'No clear signal yet on any feeling.';
    return `<div class="card fp"><div class="hrow" style="margin:0"><b>${esc(o.name)}</b><small class="muted">${pl(o.days.size,'day')}</small></div><div class="fpg">${cells}</div><p class="small" style="margin:6px 0 2px">${sum}</p>${meter(best?best.c:c0)}</div>`; }).join('');
  v.innerHTML=subnav('fp')+`<h2>Effect fingerprints</h2>${NOTE}
   ${tagsHere.length?`<div class="chips" id="fpt"><button type="button" class="chip ${fpTag?'':'on'}" data-t="">All</button>${tagsHere.map(t=>`<button type="button" class="chip ${fpTag===t[0]?'on':''}" data-t="${t[0]}">${esc(t[1])}</button>`).join('')}</div>`:''}
   ${rows||'<div class="card empty">Log a few things and how you feel. Each thing gets its fingerprint after two weeks.</div>'}
   <p class="muted small">Each tile: your average that feeling on days you logged it, minus other days you rated it (1–5 scale). Teal = better, red = worse, grey = too small or too little data. Anxiety: lower counts as better.</p>`;
  const ft=$('#fpt'); if(ft) ft.onclick=e=>{ const b=e.target.closest('[data-t]'); if(!b) return; fpTag=b.dataset.t; route(); }; };

/* ---------- 2. Lag finder: effects that show up a day or more later ---------- */
const LAGS=[0,1,2,3];
function lagScan(D,key,m){ const felt=Object.keys(D).filter(k=>val(D[k],m)!=null); return LAGS.map(L=>{ const A=[],B=[]; for(const k of felt){ const src=D[addD(k,-L)]; (src&&src.uses.has(key)?A:B).push(val(D[k],m)); } return conf(A,B); }); }
let lagKey='';
routes.lag=(v,key)=>{ if(gate(v,'lag','Lag finder','Spots feelings that change a day, two or three days after you log something, not just the same day.')) return;
  const D=days(), list=byLast(namesMap()).filter(o=>o.days.size>=3);
  if(!list.length){ v.innerHTML=subnav('lag')+'<h2>Lag finder</h2><div class="card empty">Log something on at least 3 different days, plus how you feel, and this starts looking for delayed effects.</div>'; return; }
  key=key||lagKey||list[0].key; if(!list.find(o=>o.key===key)) key=list[0].key; lagKey=key; const o=list.find(x=>x.key===key);
  const MS=[['overall','Overall'],...M().map(x=>[x[0],x[1]])];
  const grid=MS.map(([m,l])=>{ const cs=lagScan(D,key,m); return `<tr><th>${esc(l)}</th>${cs.map(c=>`<td style="color:${colr(m,c.d,c.lvl)}">${c.lvl?sg(c.d):'·'}${c.lvl>=2?'<sup>'+'•'.repeat(c.lvl-1)+'</sup>':''}</td>`).join('')}</tr>`; }).join('');
  /* hidden lags across everything: delayed signal at least fair, and stronger than same-day */
  const hits=[]; for(const t of list){ for(const [m,l] of MS){ const cs=lagScan(D,t.key,m); for(const L of [1,2,3]){ const c=cs[L]; if(c.lvl>=2&&Math.abs(c.d)>=0.3&&(cs[0].lvl<2||Math.abs(c.d)>Math.abs(cs[0].d)+0.15)) hits.push({t,m,l,L,c}); } } }
  hits.sort((a,b)=>b.c.lvl-a.c.lvl||Math.abs(b.c.d)-Math.abs(a.c.d));
  v.innerHTML=subnav('lag')+`<h2>Lag finder</h2>${NOTE}
   <div class="card"><h3>Delayed patterns found</h3>${hits.length?`<div class="list">${hits.slice(0,8).map(h=>`<div class="it" data-k="${esc(h.t.key)}" role="button" tabindex="0"><span class="wh"><b>${esc(h.l)} ${better(h.m,h.c.d)>0?'better':'worse'} ${h.L===1?'the day after':h.L+' days after'} ${esc(h.t.name)}</b><small>${sg(h.c.d)} vs other days · ${meter(h.c,1)}</small></span></div>`).join('')}</div>`:'<p class="muted small" style="margin:0">Nothing delayed stands out yet. Keep rating how you feel on most days, including days you don’t log anything.</p>'}</div>
   <label for="lgp">Look at one thing</label>${thingPicker('lgp',key,list)}
   <div class="card"><table class="rt lagt"><tr><th></th><th>Same day</th><th>+1 day</th><th>+2 days</th><th>+3 days</th></tr>${grid}</table>
   <p class="muted small" style="margin-bottom:0">Each cell: your average on days that many days after you logged ${esc(o.name)}, minus all other days. • fair, •• strong, · not enough data (needs ${MIN}+ days each side). Hours-after for the same day is in Effects.</p></div>`;
  $('#lgp').onchange=e=>{ lagKey=e.target.value; location.hash='#lag/'+encodeURIComponent(lagKey); };
  v.querySelectorAll('[data-k]').forEach(el=>el.onclick=()=>{ lagKey=el.dataset.k; location.hash='#lag/'+encodeURIComponent(lagKey); }); };

/* ---------- 3. Combo watch: two things on the same day lining up with rough days ---------- */
const rough=o=>!!o&&((o.score!=null&&o.score<=2.5)||Object.keys(o.fx).filter(f=>NEG.has(f)).length>=2);
const rated=o=>!!o&&(o.score!=null||Object.keys(o.fx).length>0);
routes.combo=v=>{ if(gate(v,'combo','Combo watch','Flags when two things you log on the same day line up with your rough days more than either one alone.')) return;
  const D=days(), nm=namesMap(); const ks=Object.keys(D).filter(k=>rated(D[k])); const base=ks.filter(k=>rough(D[k])).length/(ks.length||1);
  const keys=Object.values(nm).filter(o=>o.days.size>=3).map(o=>o.key); const pairs=[];
  for(let i=0;i<keys.length;i++) for(let j=i+1;j<keys.length;j++){ const a=keys[i], b=keys[j]; let both=0,bothR=0,aO=0,aR=0,bO=0,bR=0;
    for(const k of ks){ const u=D[k].uses, r=rough(D[k]); const ha=u.has(a), hb=u.has(b); if(ha&&hb){ both++; if(r) bothR++; } else if(ha){ aO++; if(r) aR++; } else if(hb){ bO++; if(r) bR++; } }
    if(both<2) continue; const rB=bothR/both, rA=aO?aR/aO:null, rb=bO?bR/bO:null; const alone=Math.max(rA||0,rb||0,base);
    pairs.push({a:nm[a],b:nm[b],both,bothR,rB,rA,rb,aO,bO,flag:both>=3&&bothR>=2&&rB>=0.5&&rB>=alone+0.25,lvl:both<MIN?0:(both>=8&&rB>=alone+0.35?3:rB>=alone+0.25?2:1)}); }
  pairs.sort((x,y)=>(y.flag-x.flag)||(y.rB-x.rB)||(y.both-x.both));
  const pct=x=>x==null?'–':Math.round(x*100)+'%';
  const row=p=>`<div class="it" style="cursor:default"><span class="wh"><b>${esc(p.a.name)} + ${esc(p.b.name)} ${p.flag?'<span class="pill warn">watch</span>':''}</b><small class="wrap">Rough on ${p.bothR} of ${pl(p.both,'day')} together (${pct(p.rB)}) · ${esc(p.a.name)} alone ${p.aO?pct(p.rA)+' of '+p.aO:'never'} · ${esc(p.b.name)} alone ${p.bO?pct(p.rb)+' of '+p.bO:'never'} · all days ${pct(base)}</small><small>${meter({lvl:p.lvl,txt:p.both<MIN?`Not enough data yet: ${p.both} of ${MIN} days together`:''},p.both>=MIN)}</small></span></div>`;
  const flagged=pairs.filter(p=>p.flag);
  v.innerHTML=subnav('combo')+`<h2>Combo watch</h2>${NOTE}
   <div class="stat"><div><b>${ks.length}</b><span>days rated</span></div><div><b>${pct(base)}</b><span>rough overall</span></div><div><b>${pairs.length}</b><span>pairs seen</span></div></div>
   <div class="card list"><h3>Lining up with rough days</h3>${flagged.length?flagged.slice(0,10).map(row).join(''):'<p class="muted small" style="margin:0">No pair lines up with rough days more than each thing alone. That’s good news, or there isn’t enough data yet.</p>'}</div>
   ${pairs.filter(p=>!p.flag).length?`<details class="fold"><summary>Every pair logged together 2+ days</summary><div class="list">${pairs.filter(p=>!p.flag).slice(0,30).map(row).join('')}</div></details>`:''}
   <p class="muted small">A rough day: your overall rating that day was 2.5 or lower (out of 5), or you noted 2+ effects like headache or nausea. Only days you rated or tagged an effect count.</p>`; };

/* ---------- 7. Before/after split: N days before you started something vs N days after ---------- */
let spKey='', spDate='', spN=14;
routes.split=(v,key)=>{ if(gate(v,'split','Before / after split','Pick something and a start date. See 2 weeks before vs 2 weeks after, side by side, with how much to trust each difference.')) return;
  const D=days(), list=byLast(namesMap());
  if(!list.length){ v.innerHTML=subnav('split')+'<h2>Before / after</h2><div class="card empty">Log something first.</div>'; return; }
  if(key&&key!==spKey){ spKey=key; spDate=''; } if(!list.find(o=>o.key===spKey)) spKey=list[0].key; const o=list.find(x=>x.key===spKey);
  const start=spDate||dk(o.first); const N=spN;
  const bK=[],aK=[]; for(let i=1;i<=N;i++) bK.push(addD(start,-i)); for(let i=0;i<N;i++) aK.push(addD(start,i));
  const today=dk(Date.now()); const aDone=aK.filter(k=>k<=today).length;
  const MS=[['overall','Overall'],...M().map(x=>[x[0],x[1]])];
  const rows=MS.map(([m,l])=>{ const B=bK.map(k=>val(D[k],m)).filter(x=>x!=null), A=aK.map(k=>val(D[k],m)).filter(x=>x!=null); const c=conf(A,B);
    return `<div class="sprow"><span><b>${esc(l)}</b><br>${meter(c,1)}</span><span>${f1(mean(B))}<small class="muted"> · ${B.length}d</small></span><span>${f1(mean(A))}<small class="muted"> · ${A.length}d</small></span><span style="color:${colr(m,c.d,c.lvl)};font-weight:700">${c.lvl?sg(c.d):'·'}</span></div>`; }).join('');
  const cnt=ks=>ks.reduce((s,k)=>s+(D[k]&&D[k].uses.has(spKey)?1:0),0);
  const fxc=ks=>{ const m={}; ks.forEach(k=>{ if(D[k]) for(const f in D[k].fx) m[f]=(m[f]||0)+D[k].fx[f]; }); return m; }; const fb=fxc(bK), fa=fxc(aK); const fxs=[...new Set([...Object.keys(fb),...Object.keys(fa)])];
  v.innerHTML=subnav('split')+`<h2>Before / after</h2>${NOTE}
   <label for="spk">What did you start (or stop)?</label>${thingPicker('spk',spKey,list)}
   <div class="row"><div><label for="spd">Starting day</label><input id="spd" type="date" value="${esc(start)}" max="${esc(today)}"></div><div><label for="spn">Compare</label><select id="spn">${[7,14,28].map(n=>`<option value="${n}" ${n===N?'selected':''}>${n} days each side</option>`).join('')}</select></div></div>
   <p class="muted small">${esc(dS(bK[bK.length-1]))} – ${esc(dS(bK[0]))} <b>vs</b> ${esc(dS(aK[0]))} – ${esc(dS(aK[aK.length-1]))}${aDone<N?` · ${pl(N-aDone,'day')} of the “after” side still to come`:''}. Defaults to the day you first logged ${esc(o.name)}.</p>
   <div class="card"><div class="sprow muted small"><span></span><span>before</span><span>after</span><span>change</span></div>${rows}</div>
   <div class="card"><h3>${esc(o.name)} itself</h3><p class="small" style="margin:0">Logged on ${cnt(bK)} days before, ${cnt(aK)} days after.</p>
    ${fxs.length?`<p class="small" style="margin:6px 0 0"><b>Effects you noted</b> (before → after): ${fxs.map(f=>esc(f)+' '+(fb[f]||0)+' → '+(fa[f]||0)).join(' · ')}</p>`:''}</div>
   <p class="muted small">Other things change too (season, school, sleep), so a difference here isn’t proof the start caused it.</p>`;
  $('#spk').onchange=e=>{ location.hash='#split/'+encodeURIComponent(e.target.value); };
  $('#spd').onchange=e=>{ if(/^\d{4}-\d\d-\d\d$/.test(e.target.value)){ spDate=e.target.value; route(); } };
  $('#spn').onchange=e=>{ spN=+e.target.value||14; route(); }; };

/* ---------- 19. Weekly 3-line recap: what changed, what helped, what to watch ---------- */
function recapLines(){ const D=days(), nm=namesMap(); const today=dk(Date.now()); const w1=[],w0=[]; for(let i=0;i<7;i++){ w1.push(addD(today,-i)); w0.push(addD(today,-7-i)); }
  const L={};
  /* what changed: biggest feeling shift week over week, else biggest logging change */
  let ch=null; for(const [m,l] of [['overall','Overall'],...M().map(x=>[x[0],x[1]])]){ const A=w1.map(k=>val(D[k],m)).filter(x=>x!=null), B=w0.map(k=>val(D[k],m)).filter(x=>x!=null); if(A.length<2||B.length<2) continue; const d=mean(A)-mean(B); if(Math.abs(d)>=0.3&&(!ch||Math.abs(d)>Math.abs(ch.d))) ch={m,l,d,na:A.length,nb:B.length}; }
  if(ch) L.changed=`${ch.l} ${better(ch.m,ch.d)>0?'up':'down'}: ${f1(mean(w1.map(k=>val(D[k],ch.m)).filter(x=>x!=null)))} this week vs ${f1(mean(w0.map(k=>val(D[k],ch.m)).filter(x=>x!=null)))} last week (${ch.na} vs ${ch.nb} days rated).`;
  else { const cn=ks=>{ const m={}; ks.forEach(k=>{ if(D[k]) D[k].uses.forEach(u=>m[u]=(m[u]||0)+1); }); return m; }; const c1=cn(w1), c0=cn(w0); let best=null;
    for(const k of new Set([...Object.keys(c1),...Object.keys(c0)])){ const d=(c1[k]||0)-(c0[k]||0); if(Math.abs(d)>=2&&(!best||Math.abs(d)>Math.abs(best.d))) best={k,d}; }
    L.changed=best?`You logged ${nm[best.k]?nm[best.k].name:best.k} on ${c1[best.k]||0} days this week vs ${c0[best.k]||0} last week. Feelings held steady.`:'A steady week: no feeling moved more than 0.3, and what you log stayed about the same.'; }
  /* what helped: strongest positive same-day link over the last 4 weeks */
  const k28=[]; for(let i=0;i<28;i++) k28.push(addD(today,-i)); const felt=k28.filter(k=>D[k]&&D[k].score!=null); let hp=null;
  for(const o of Object.values(nm)){ const A=[],B=[]; for(const k of felt) (D[k].uses.has(o.key)?A:B).push(D[k].score); const c=conf(A,B); if(c.lvl>=2&&c.d>=0.3&&(!hp||c.d*c.lvl>hp.c.d*hp.c.lvl)) hp={o,c}; }
  L.helped=hp?`Days with ${hp.o.name} averaged ${sg(hp.c.d)} overall over the last 4 weeks (${['','weak','fair','strong'][hp.c.lvl]} confidence). Lines up, not proof.`:`Nothing clearly helped yet: no link reaches fair confidence (rate how you feel on ${MIN}+ days with and without something).`;
  /* what to watch */
  const fx=ks=>{ const m={}; ks.forEach(k=>{ if(D[k]) for(const f in D[k].fx) if(NEG.has(f)) m[f]=(m[f]||0)+D[k].fx[f]; }); return m; }; const f1w=fx(w1), f0w=fx(w0);
  const rise=Object.keys(f1w).map(f=>({f,a:f1w[f],b:f0w[f]||0})).filter(x=>x.a>=2&&x.a>x.b).sort((a,b)=>(b.a-b.b)-(a.a-a.b))[0];
  const ref=window.TrcRefillDue?TrcRefillDue():[]; const ex=feat().exps.find(e=>!e.done&&expEnd(e)>=today&&expEnd(e)<=addD(today,2)); const gh=ghostList().filter(g=>g.missed7>=2).sort((a,b)=>b.missed7-a.missed7)[0];
  L.watch=rise?`${rise.f[0].toUpperCase()+rise.f.slice(1)} noted ${rise.a}× this week (${rise.b}× last week).`:ref.length?`${ref[0].r.name} runs out in about ${Math.max(0,Math.floor(ref[0].days))} days by your count.`:gh?`${gh.o.name}: ${gh.missed7} usual days skipped this week.`:ex?`Your experiment “${ex.title}” ends ${ex&&expEnd(ex)===today?'today':'soon'}: check the verdict.`:'Nothing stands out to watch this week.';
  return L; }
routes.recap=v=>{ if(gate(v,'recap','Weekly 3-line recap','Every week in three lines: what changed, what helped, what to watch. From your own logs.')) return;
  const L=recapLines(); const txt=`Trace · my week (${new Date(Date.now()-6*DAY).toLocaleDateString([], {month:'short',day:'numeric'})} – ${new Date().toLocaleDateString([], {month:'short',day:'numeric'})})\nWhat changed: ${L.changed}\nWhat helped: ${L.helped}\nWhat to watch: ${L.watch}`;
  v.innerHTML=subnav('recap')+`<h2>Your week in 3 lines</h2><p class="muted" style="margin-top:-4px">Last 7 days vs the 7 before.</p>
   <div class="card recap"><p><b>What changed</b><br>${esc(L.changed)}</p><p><b>What helped</b><br>${esc(L.helped)}</p><p style="margin-bottom:0"><b>What to watch</b><br>${esc(L.watch)}</p></div>
   <button class="btn ghost block" id="rcc">Copy these 3 lines</button><p class="muted small">Correlation, not cause. No streaks, no score: just what your logs say.</p>`;
  $('#rcc').onclick=async()=>{ try{ await navigator.clipboard.writeText(txt); toast('Copied ✓'); }catch(e){ sheet(`<h3>Copy</h3><textarea style="min-height:160px" readonly>${esc(txt)}</textarea><button class="btn ghost block" data-close="1">Done</button>`); } }; };

/* ---------- 13. Experiment mode: a 14-day test with a verdict ---------- */
const expEnd=e=>addD(e.start,(e.n||14)-1);
function verdict(e){ const D=days(), today=dk(Date.now()); const m=e.m||'overall'; const end=expEnd(e)<today?expEnd(e):today;
  const A=[],B=[]; let kept=0,broke=0,open=0; for(let i=0;i<(e.n||14);i++){ const k=addD(e.start,i); if(k>end) break; const a=(e.log||{})[k]; if(a===1){ kept++; const x=val(D[k],m); if(x!=null) A.push(x); } else if(a===0) broke++; else open++; }
  for(let i=1;i<=(e.n||14);i++){ const x=val(D[addD(e.start,-i)],m); if(x!=null) B.push(x); }
  const c=conf(A,B); const fin=expEnd(e)<today||e.done; let word,cls;
  if(c.lvl===0){ word='Not enough data yet'; cls=''; } else if(Math.abs(c.d)<0.3){ word=c.lvl>=2?'No clear difference':'No clear difference so far'; cls=''; } else if(c.lvl===1){ word=(better(m,c.d)>0?'Maybe better':'Maybe worse')+', but weak'; cls=''; } else { word=better(m,c.d)>0?'Looks better':'Looks worse'; cls=better(m,c.d)>0?'good':'bad'; }
  return {A,B,c,kept,broke,open,fin,word,cls,m}; }
function expTodayCard(){ const today=dk(Date.now()); const e=feat().exps.find(x=>!x.done&&x.start<=today&&expEnd(x)>=today&&(x.log||{})[today]==null); if(!e) return '';
  const day=Math.round((kdT(today)-kdT(e.start))/DAY)+1;
  return `<div class="card" id="expq" style="border-color:#3b3470"><div class="hrow" style="margin:0"><b>🧪 ${esc(e.title)}</b><a href="#exp/${esc(e.id)}" class="small">day ${day} of ${e.n||14}</a></div><p class="muted small" style="margin:4px 0 8px">Did you stick to it today?</p><div class="row"><button class="btn sm" data-ex="1" data-id="${esc(e.id)}">Yes</button><button class="btn ghost sm" data-ex="0" data-id="${esc(e.id)}">No</button></div></div>`; }
function expMark(id,k,a){ const f=feat(); const e=f.exps.find(x=>x.id===id); if(!e) return; e.log=e.log||{}; if(a==null) delete e.log[k]; else e.log[k]=a; saveFeat(f); }
routes.exp=(v,id)=>{ if(gate(v,'exp','Experiment mode','Set a 14-day test like “no caffeine after 2pm”, tick each day you stuck to it, and get a verdict against the 14 days before.')) return;
  const f=feat(), today=dk(Date.now()); const MS=[['overall','Overall (all feelings)'],...M().map(x=>[x[0],x[1]])];
  const e=id&&f.exps.find(x=>x.id===id);
  if(e){ const V=verdict(e); let strip=''; for(let i=0;i<(e.n||14);i++){ const k=addD(e.start,i); const a=(e.log||{})[k]; const fut=k>today; strip+=`<button type="button" class="xd ${a===1?'y':a===0?'n':''} ${fut?'fut':''}" data-k="${k}" ${fut?'disabled':''} aria-label="${esc(dS(k))}: ${a===1?'stuck to it':a===0?'didn’t':'not marked'}">${new Date(kdT(k)).getDate()}</button>`; }
    v.innerHTML=subnav('exp')+`<p style="margin:0 0 4px"><a href="#exp">‹ All experiments</a></p><h2>🧪 ${esc(e.title)}</h2><p class="muted" style="margin-top:-4px">${esc(dS(e.start))} – ${esc(dS(expEnd(e)))} · watching ${esc((MS.find(x=>x[0]===V.m)||MS[0])[1])}</p>
     <div class="card verdict ${V.cls}"><small class="muted">${V.fin?'Verdict':'So far'}</small><h3 style="margin:2px 0 4px">${esc(V.word)}</h3>
      <p class="small" style="margin:0 0 6px">${V.c.d!=null?`${f1(mean(V.A))} on days you stuck to it vs ${f1(mean(V.B))} in the ${e.n||14} days before (${sg(V.c.d)}).`:'Rate how you feel on test days (and it helps to have ratings from the days before you started).'}</p>${meter(V.c)}</div>
     <h3>Tap each day: stuck to it ✓, didn’t ✕</h3><div class="xstrip" id="xs">${strip}</div><p class="muted small">${V.kept} ✓ · ${V.broke} ✕ · ${V.open} not marked. Only ✓ days count toward the verdict.</p>
     <div class="row" style="margin-top:10px">${!e.done&&!V.fin?'<button class="btn ghost" id="xend">End it now</button>':''}<button class="btn danger" id="xdel">Delete</button></div>
     <p class="muted small">One person, one test: a verdict here is about your own logs, not proof. Life changes during the test count too.</p>`;
    $('#xs').onclick=ev=>{ const b=ev.target.closest('[data-k]'); if(!b||b.disabled) return; const a=(e.log||{})[b.dataset.k]; expMark(e.id,b.dataset.k,a===1?0:a===0?null:1); route(); };
    const xe=$('#xend'); if(xe) xe.onclick=()=>{ const g=feat(); const x=g.exps.find(y=>y.id===e.id); if(x){ x.done=1; x.n=Math.max(1,Math.round((kdT(today)-kdT(x.start))/DAY)+1); } saveFeat(g); route(); };
    $('#xdel').onclick=()=>{ if(!confirm('Delete this experiment? Your logs stay.')) return; const g=feat(); g.exps=g.exps.filter(y=>y.id!==e.id); saveFeat(g); location.hash='#exp'; };
    return; }
  const rows=f.exps.slice().sort((a,b)=>b.start.localeCompare(a.start)).map(x=>{ const V=verdict(x); const live=!x.done&&expEnd(x)>=today;
    return `<a class="it" href="#exp/${esc(x.id)}"><span class="wh"><b>${esc(x.title)}</b><small>${esc(dS(x.start))} – ${esc(dS(expEnd(x)))} · ${live?(x.start>today?'starts '+esc(dS(x.start)):'running'):'done'} · ${esc(V.word)}</small></span><span class="pill ${live?'acc':''}">${live?'live':'verdict'}</span></a>`; }).join('');
  v.innerHTML=subnav('exp')+`<h2>Experiments</h2><p class="muted" style="margin-top:-4px">Change one thing for a set time. Tick the days you stuck to it. Trace compares how you felt to the same number of days before.</p>
   <div class="card list">${rows||'<p class="empty">No experiments yet.</p>'}</div>
   <details class="fold" ${rows?'':'open'} id="xnew"><summary>Start an experiment</summary>
    <label for="xt">What are you testing?</label><input id="xt" maxlength="80" placeholder="e.g. no caffeine after 2pm">
    <div class="chips" id="xsg">${['no caffeine after 2pm','phone off by 10pm','walk every day','no energy drinks','water before coffee'].map(s=>`<button type="button" class="chip sub" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <div class="row"><div><label for="xn">How long</label><select id="xn">${[7,14,21,28].map(n=>`<option value="${n}" ${n===14?'selected':''}>${n} days</option>`).join('')}</select></div><div><label for="xs0">Starts</label><select id="xs0"><option value="0">Today</option><option value="1">Tomorrow</option></select></div></div>
    <label for="xm">Judge it by</label><select id="xm">${MS.map(([m,l])=>`<option value="${m}">${esc(l)}</option>`).join('')}</select>
    <button class="btn block" id="xgo" style="margin-top:10px">Start</button>
    <p class="muted small">Experiments are saved on this phone only. Trace doesn’t suggest what to test with medicine: talk to your doctor before changing a prescription.</p></details>`;
  $('#xsg').onclick=ev=>{ const b=ev.target.closest('[data-s]'); if(b) $('#xt').value=b.dataset.s; };
  $('#xgo').onclick=()=>{ const t=$('#xt').value.trim(); if(!t) return toast('Name what you’re testing'); const g=feat(); const x={id:uid('x_'),title:t.slice(0,80),start:addD(today,+$('#xs0').value||0),n:+$('#xn').value||14,m:$('#xm').value,log:{},created:Date.now()}; g.exps.push(x); saveFeat(g); toast('Experiment started 🧪'); location.hash='#exp/'+x.id; }; };

/* ---------- 5. Missed-dose ghost: the usual days you didn't log something, on a timeline ---------- */
function ghostList(){ const nm=namesMap(), today=dk(Date.now()); const rems=Store.reminders().filter(r=>r.on!==false); const out=[];
  for(const o of Object.values(nm)){ const rem=rems.filter(r=>Store.keyOf(r.what)===o.key); let wd;
    if(rem.length){ wd=new Set(); rem.forEach(r=>(r.days&&r.days.length?r.days:[0,1,2,3,4,5,6]).forEach(d=>wd.add(d))); }
    else { /* usual weekdays: logged on at least 60% of that weekday over the last 8 weeks (2+ times), since the first log */
      wd=new Set(); for(let d=0;d<7;d++){ let tot=0,hit=0; for(let i=1;i<=56;i++){ const k=addD(today,-i); if(kdT(k)<o.first-DAY/2) break; if(new Date(kdT(k)).getDay()!==d) continue; tot++; if(o.days.has(k)) hit++; } if(tot>=2&&hit>=2&&hit/tot>=0.6) wd.add(d); } }
    if(!wd.size) continue;
    const cells=[]; let missed=0,expd=0,missed7=0; for(let i=27;i>=0;i--){ const k=addD(today,-i); const before=kdT(k)<o.first-DAY/2; const ex=!before&&wd.has(new Date(kdT(k)).getDay()); const got=o.days.has(k);
      const st=got?'got':ex?(i===0?'due':'miss'):'off'; if(ex&&i>0){ expd++; if(!got){ missed++; if(i<=7) missed7++; } } cells.push({k,st}); }
    out.push({o,wd,rem:rem.length>0,cells,missed,missed7,expd}); }
  return out.sort((a,b)=>b.o.last-a.o.last); }
routes.ghost=v=>{ const G=ghostList(), D=days(); const DW='SMTWTFS';
  const card=g=>{ let stats='';
    if(pro()){ const miss=g.cells.filter(c=>c.st==='miss').map(c=>c.k), got=g.cells.filter(c=>c.st==='got').map(c=>c.k);
      const sc=ks=>ks.map(k=>val(D[k],'overall')).filter(x=>x!=null), nx=ks=>ks.map(k=>val(D[addD(k,1)],'overall')).filter(x=>x!=null);
      const c0=conf(sc(miss),sc(got)), c1=conf(nx(miss),nx(got));
      stats=`<p class="small" style="margin:6px 0 2px">Overall on skipped days: <b>${f1(mean(sc(miss)))}</b> vs ${f1(mean(sc(got)))} on days you logged it${c0.lvl?` (${sg(c0.d)})`:''}. The day after a skip: <b>${f1(mean(nx(miss)))}</b> vs ${f1(mean(nx(got)))}.</p>${meter(c0)}`; }
    else stats=`<p class="muted small" style="margin:6px 0 0">How you felt on skipped days vs logged days is part of Trace Pro.</p>`;
    return `<div class="card"><div class="hrow" style="margin:0"><b>${esc(g.o.name)}</b><small class="muted">${g.rem?'from your reminder':'usual days: '+[...g.wd].sort().map(d=>DW[d]).join(' ')}</small></div>
     <div class="ghosts" role="img" aria-label="${esc(g.o.name)}: ${g.missed} usual days skipped in the last 4 weeks">${g.cells.map(c=>`<i class="${c.st}" title="${esc(dS(c.k))}"></i>`).join('')}</div>
     <p class="small" style="margin:4px 0 0">${g.missed?`${pl(g.missed,'usual day')} skipped of ${g.expd} in the last 4 weeks.`:`No usual days skipped in the last 4 weeks.`}</p>${stats}</div>`; };
  v.innerHTML=calSeg('ghost')+`<h2>Missed days</h2><p class="muted" style="margin-top:-4px">Last 4 weeks, oldest on the left. <span class="gk got"></span> logged · <span class="gk miss"></span> a usual day with no log · <span class="gk off"></span> not a usual day.</p>
   ${G.length?G.map(card).join(''):'<div class="card empty">Ghosts show up for things on a reminder, or things you log on the same weekdays most weeks.</div>'}
   <p class="muted small">This isn’t a streak or a score. A skipped day can be the right call: it’s just there so you can see what skipping does. Never stop or change a prescription without your doctor.</p>`; };

/* ---------- 12. Symptom heat calendar: good vs rough days at a glance ---------- */
let hM=null, hMetric='overall', hSel=null;
function calSeg(on){ return `<div class="seg"><a href="#cal" class="${on==='cal'?'on':''}">What I logged</a><a href="#days" class="${on==='days'?'on':''}">How I felt</a><a href="#ghost" class="${on==='ghost'?'on':''}">Missed days</a></div>`; }
routes.days=v=>{ const D=days(); const now=new Date(); if(!hM) hM=new Date(now.getFullYear(),now.getMonth(),1);
  const y=hM.getFullYear(), m=hM.getMonth(), first=new Date(y,m,1).getDay(), nd=new Date(y,m+1,0).getDate(); const tk=dk(Date.now());
  const fxAll={}; Object.values(D).forEach(o=>{ for(const f in o.fx) fxAll[f]=(fxAll[f]||0)+o.fx[f]; });
  const isFx=hMetric.startsWith('fx:'), fxN=isFx?hMetric.slice(3):'';
  const color=o=>{ if(!o) return ''; if(isFx){ const n=o.fx[fxN]||0; if(!n) return ''; return `background:rgba(248,113,113,${Math.min(.85,.3+.2*n).toFixed(2)});border-color:#f87171`; }
    let x=val(o,hMetric); if(x==null) return ''; if(BAD.has(hMetric)) x=6-x; /* good ≥ 3.5, rough ≤ 2.5, in between = an ordinary day */
    if(x>2.5&&x<3.5) return 'background:#1a2230;border-color:#334155'; const c=x>=3.5?[94,234,212]:[248,113,113]; const a=x>=3.5?0.3+0.5*(x-3.5)/1.5:0.3+0.5*(2.5-x)/1.5; return `background:rgba(${c.join(',')},${a.toFixed(2)});border-color:rgba(${c.join(',')},.7)`; };
  let cells=['S','M','T','W','T','F','S'].map(d=>`<div class="h">${d}</div>`).join(''); for(let i=0;i<first;i++) cells+='<div class="d x"></div>';
  let good=0,bad=0; for(let d=1;d<=nd;d++){ const k=dk(new Date(y,m,d).getTime()); const o=D[k]; const x=val(o,isFx?'overall':hMetric);
    if(!isFx&&x!=null){ const g=BAD.has(hMetric)?6-x:x; if(g>=3.5) good++; else if(g<=2.5) bad++; }
    cells+=`<div class="d ${k===tk?'today':''} ${k===hSel?'sel':''}" data-k="${k}" style="${color(o)}">${d}${!isFx&&x!=null?`<small>${f1(x)}</small>`:isFx&&o&&o.fx[fxN]?`<small>×${o.fx[fxN]}</small>`:''}</div>`; }
  const sel=hSel&&Store.entries().filter(x=>dk(x.t)===hSel);
  v.innerHTML=calSeg('days')+`<div class="row" style="align-items:center"><button class="btn ghost sm fx0" id="hp" aria-label="Previous month">‹</button><h2 style="text-align:center;margin:0">${esc(hM.toLocaleDateString([], {month:'long',year:'numeric'}))}</h2><button class="btn ghost sm fx0" id="hn" aria-label="Next month">›</button></div>
   <select id="hmx" style="margin:10px 0" aria-label="Color days by"><option value="overall">Overall (all feelings)</option>${M().map(([k,l])=>`<option value="${k}" ${k===hMetric?'selected':''}>${esc(l)}${BAD.has(k)?' (lower is better)':''}</option>`).join('')}${Object.keys(fxAll).length?`<optgroup label="Effects you noted">${Object.entries(fxAll).sort((a,b)=>b[1]-a[1]).map(([f])=>`<option value="fx:${esc(f)}" ${hMetric==='fx:'+f?'selected':''}>${esc(f)}</option>`).join('')}</optgroup>`:''}</select>
   <div class="cal">${cells}</div>
   <div class="legend">${isFx?`no ${esc(fxN)} <i style="background:#11161e;border:1px solid #1d2430"></i><i style="background:rgba(248,113,113,.5)"></i><i style="background:rgba(248,113,113,.85)"></i> noted more`:`rough <i style="background:rgba(248,113,113,.8)"></i><i style="background:rgba(248,113,113,.35)"></i><i style="background:#1a2230;border:1px solid #334155"></i><i style="background:rgba(94,234,212,.35)"></i><i style="background:rgba(94,234,212,.8)"></i> good`}</div>
   ${isFx?'':`<p class="muted small">${good} good (3.5+) · ${bad} rough (2.5 or lower) · blank = not rated. Rate how you feel with “How I feel” on the Log tab.</p>`}
   <div id="hd">${sel?`<h3 style="margin-top:16px">${esc(fmtD(kdT(hSel)))}</h3><div class="card list">${sel.length?sel.map(itemHTML).join(''):'<p class="empty">Nothing logged.</p>'}</div>`:'<p class="muted center" style="margin-top:14px">Tap a day to see it.</p>'}</div>`;
  $('#hp').onclick=()=>{ hM=new Date(y,m-1,1); route(); }; $('#hn').onclick=()=>{ hM=new Date(y,m+1,1); route(); };
  $('#hmx').onchange=e=>{ hMetric=e.target.value; route(); };
  v.querySelectorAll('.d[data-k]').forEach(d=>d.onclick=()=>{ hSel=d.dataset.k; routes.days(v); const h=$('#hd'); if(h&&h.scrollIntoView) h.scrollIntoView({block:'nearest'}); });
  wireItems(v); };

/* ---------- 8. Caffeine curve: a rough estimate of what's still in your system ---------- */
const CAF=/caffeine|coffee|espresso|latte|cappuccino|americano|macchiato|mocha|cold brew|matcha|\btea\b|energy drink|red ?bull|monster|celsius|\bbang\b|pre.?workout|\bcola\b|\bcoke\b|pepsi|mountain dew|\bc4\b/i;
const isCaf=x=>!!x.what&&(x.tag==='caffeine'||CAF.test(x.what));
function cafMg(x,per){ const a=parseFloat(String(x.amt||'').replace(',','.')); if(/^mg$/i.test(String(x.unit||'').trim())&&a>0) return a; const p=per[Store.keyOf(x.what)]; if(p>0) return p*(a>0?a:1); return null; }
const ABS=0.75; // hours to absorb (linear ramp), then halves every `hl` hours
function cafAt(t,logs,hl){ let s=0; for(const l of logs){ const h=(t-l.t)/HR; if(h<0) continue; s+=h<ABS?l.mg*h/ABS:l.mg*Math.pow(0.5,(h-ABS)/hl); } return s; }
function cafState(){ const f=feat(); const hl=+f.caf.hl||5; const es=Store.entries().filter(x=>x.t>=Date.now()-48*HR&&x.t<=Date.now()+HR&&isCaf(x));
  const logs=[], miss=[]; for(const x of es){ const mg=cafMg(x,f.caf.per); if(mg==null) miss.push(x); else logs.push({t:x.t,mg,x}); }
  return {hl,logs,miss,now:cafAt(Date.now(),logs,hl)}; }
const hmT=t=>new Date(t).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
function cafWhen(S,frac){ const now=Date.now(), target=S.now*frac; for(let i=1;i<=96;i++){ const t=now+i*15*60000; if(cafAt(t,S.logs,S.hl)<=target) return t; } return null; }
routes.caffeine=v=>{ const S=cafState(); const W=340,H=150,pad=26; const t0=Date.now()-12*HR, t1=Date.now()+12*HR; const pts=[]; for(let t=t0;t<=t1;t+=15*60000) pts.push([t,cafAt(t,S.logs,S.hl)]);
  const max=Math.max(50,...pts.map(p=>p[1]))*1.1; const X=t=>pad+(t-t0)/(t1-t0)*(W-pad-6), Y=y=>H-18-y/max*(H-30);
  const path=pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join('');
  const grid=[0,0.5,1].map(f=>{ const y=Math.round(max/1.1*f); return `<line x1="${pad}" x2="${W-4}" y1="${Y(y).toFixed(1)}" y2="${Y(y).toFixed(1)}" stroke="#1f2733"/><text x="2" y="${(Y(y)+4).toFixed(1)}" font-size="9" fill="#8b949e">${y}</text>`; }).join('');
  const ticks=[-12,-6,0,6,12].map(h=>`<text x="${(X(Date.now()+h*HR)-12).toFixed(1)}" y="${H-3}" font-size="9" fill="#8b949e">${h===0?'now':(h>0?'+':'')+h+'h'}</text>`).join('');
  const half=S.now>=5?cafWhen(S,0.5):null, qtr=S.now>=5?cafWhen(S,0.25):null; const f=feat();
  v.innerHTML=`<p style="margin:0 0 4px"><a href="#log">‹ Log</a></p><h2>Caffeine curve</h2>
   <div class="stat"><div><b>~${Math.round(S.now)}</b><span>mg estimated now</span></div><div><b>${half?esc(hmT(half)):'–'}</b><span>about half gone</span></div><div><b>${qtr?esc(hmT(qtr)):'–'}</b><span>about a quarter left</span></div></div>
   <div class="card"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Estimated caffeine, 12 hours back to 12 hours ahead">${grid}<line x1="${X(Date.now()).toFixed(1)}" x2="${X(Date.now()).toFixed(1)}" y1="6" y2="${H-16}" stroke="#a78bfa" stroke-dasharray="3 3"/><path d="${path}" fill="none" stroke="#fcd34d" stroke-width="2"/>${S.logs.map(l=>l.t>=t0?`<circle cx="${X(l.t).toFixed(1)}" cy="${H-14}" r="3" fill="#fcd34d"/>`:'').join('')}${ticks}</svg>
    <label for="chl">Half-life used</label><select id="chl">${[3,4,5,6,7,8].map(h=>`<option value="${h}" ${h===S.hl?'selected':''}>${h} hours${h===5?' (common average)':''}</option>`).join('')}</select></div>
   <h3>Counted (last 48 h)</h3><div class="card list">${S.logs.length?S.logs.map(l=>`<div class="it" data-e="${esc(l.x.id)}" role="button" tabindex="0"><span class="tm">${esc(fmtT(l.t))}</span><span class="wh"><b>${esc(l.x.what)}</b><small>${Math.round(l.mg)} mg${/^mg$/i.test(String(l.x.unit||'').trim())?'':' · from your mg per '+esc(l.x.unit||'serving')}</small></span></div>`).join(''):'<p class="empty">No caffeine with mg in the last 48 hours.</p>'}</div>
   ${S.miss.length?`<h3>Not counted: no mg</h3><div class="card list">${[...new Map(S.miss.map(x=>[Store.keyOf(x.what),x])).values()].map(x=>`<div class="it" style="cursor:default"><span class="wh"><b>${esc(x.what)}</b><small>${esc(amtTxt(x)||'no amount')}</small></span><button class="btn sm" data-mg="${esc(Store.keyOf(x.what))}" data-n="${esc(x.what)}" data-u="${esc(x.unit||'serving')}">Set mg</button></div>`).join('')}</div>`:''}
   ${Object.keys(f.caf.per).length?`<details class="fold"><summary>Your mg per serving</summary>${Object.entries(f.caf.per).map(([k,mg])=>`<div class="row" style="align-items:center"><span>${esc(k)}: ${esc(String(mg))} mg</span><button class="lnk" data-rmg="${esc(k)}">remove</button></div>`).join('')}</details>`:''}
   <p class="muted small">A rough estimate, not a measurement and not advice. It assumes about 45 minutes to absorb, then half is gone every ${S.hl} hours. Real half-life ranges from about 2 to 10 hours between people (pregnancy, some medicines, smoking and liver health change it a lot). Logs in mg count directly; for cups, cans and shots, you set the mg yourself from the label.</p>`;
  $('#chl').onchange=e=>{ const g=feat(); g.caf.hl=+e.target.value||5; saveFeat(g); route(); };
  v.querySelectorAll('[data-mg]').forEach(b=>b.onclick=()=>{ const n=prompt(`How many mg of caffeine in one ${b.dataset.u} of ${b.dataset.n}? (check the label)`,''); if(n==null) return; const x=parseFloat(n); if(!(x>0&&x<2000)) return toast('Type a number of mg'); const g=feat(); g.caf.per[b.dataset.mg]=x; saveFeat(g); route(); });
  v.querySelectorAll('[data-rmg]').forEach(b=>b.onclick=()=>{ const g=feat(); delete g.caf.per[b.dataset.rmg]; saveFeat(g); route(); });
  wireItems(v); };

/* ---------- 4. One-tap repeat: stacks you log in one tap ---------- */
let lastStack=null;
function logStack(id){ const st=feat().stacks.find(s=>s.id===id); if(!st||!st.items.length) return; const t=Date.now();
  const list=st.items.map(i=>({_kind:'e',t,what:i.what,amt:i.amt||'',unit:i.unit||'',notes:'',feel:null,fx:[],kind:'sub',...(i.tag?{tag:i.tag}:{})}));
  Store.bulk(list); lastStack={ids:list.map(x=>x.id),at:Date.now(),name:st.name}; toast(`Logged ${st.name}: ${pl(list.length,'thing')} ✓`); route(); }
function stackSheet(id){ const f=feat(); const st=id?f.stacks.find(s=>s.id===id):null; const ns=Store.names(); const have=new Map((st?st.items:[]).map(i=>[Store.keyOf(i.what),i]));
  if(!ns.length) return toast('Log something first');
  sheet(`<h3>${st?'Edit stack':'New stack'}</h3><label for="snm">Name</label><input id="snm" maxlength="30" value="${esc(st?st.name:'')}" placeholder="e.g. Morning">
   <p class="muted small">Tick what goes in it. Amounts are whatever you type: Trace doesn’t suggest any.</p>
   <div class="list" id="sit">${ns.slice(0,40).map(n=>{ const k=Store.keyOf(n.name), i=have.get(k); return `<div class="it sti" data-k="${esc(k)}" data-n="${esc(n.name)}" style="cursor:default;flex-wrap:wrap"><label class="wh" style="display:flex;gap:8px;align-items:center;margin:0"><input type="checkbox" ${i?'checked':''} aria-label="Include ${esc(n.name)}"><b>${esc(n.name)}</b></label><span class="row" style="gap:6px;flex:1 1 100%"><input class="sa" maxlength="20" placeholder="amount" value="${esc(i?i.amt:(n.amt||''))}" aria-label="Amount for ${esc(n.name)}"><input class="su" maxlength="20" placeholder="unit" value="${esc(i?i.unit:(n.unit||''))}" aria-label="Unit for ${esc(n.name)}"></span></div>`; }).join('')}</div>
   <button class="btn block" id="ssv" style="margin-top:10px">Save stack</button>${st?'<button class="btn danger block" id="sdl">Delete stack</button>':''}<button class="btn ghost block" data-close="1">Cancel</button>`,root=>{
    root.querySelector('#ssv').onclick=()=>{ const name=root.querySelector('#snm').value.trim(); if(!name) return toast('Name your stack');
      const items=[...root.querySelectorAll('.sti')].filter(r=>r.querySelector('input[type=checkbox]').checked).map(r=>{ const nm=namesMap()[r.dataset.k]; return {what:r.dataset.n,amt:r.querySelector('.sa').value.trim(),unit:r.querySelector('.su').value.trim(),...(nm&&tagOf(nm)?{tag:tagOf(nm)}:{})}; });
      if(!items.length) return toast('Tick at least one thing'); const g=feat(); if(st){ const x=g.stacks.find(s=>s.id===st.id); if(x){ x.name=name.slice(0,30); x.items=items; } } else g.stacks.push({id:uid('s_'),name:name.slice(0,30),items}); g.stacks=g.stacks.slice(-12); saveFeat(g); closeSheet(); toast('Stack saved ✓'); route(); };
    const dl=root.querySelector('#sdl'); if(dl) dl.onclick=()=>{ if(!confirm('Delete this stack? Your logs stay.')) return; const g=feat(); g.stacks=g.stacks.filter(s=>s.id!==st.id); saveFeat(g); closeSheet(); route(); }; }); }
routes.stacks=v=>{ const S=feat().stacks;
  v.innerHTML=`<p style="margin:0 0 4px"><a href="#log">‹ Log</a></p><h2>My stacks</h2><p class="muted" style="margin-top:-4px">Things you usually log together. One tap on the Log tab logs all of them, right now.</p>
   <div class="card list">${S.length?S.map(s=>`<div class="it" data-st="${esc(s.id)}" role="button" tabindex="0"><span class="wh"><b>${esc(s.name)}</b><small class="wrap">${esc(s.items.map(i=>[i.what,i.amt,i.unit].filter(Boolean).join(' ')).join(' · '))}</small></span><span class="pill">edit</span></div>`).join(''):'<p class="empty">No stacks yet.</p>'}</div>
   <button class="btn block" id="snew">New stack</button><p class="muted small">Saved on this phone. Each log in a stack is a normal log you can edit or delete.</p>`;
  $('#snew').onclick=()=>stackSheet(); v.querySelectorAll('[data-st]').forEach(el=>el.onclick=()=>stackSheet(el.dataset.st)); };

/* ---------- 14. Say it: dictate (iPhone keyboard mic) or type one sentence; Trace splits it into logs on this phone ---------- */
const NUMW={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,half:0.5,'a half':0.5};
const UNITS='mg|mcg|µg|g|ml|iu|pills?|tabs?|tablets?|capsules?|caps?|gummies|gummy|drops?|puffs?|cups?|mugs?|shots?|cans?|bottles?|glass(?:es)?|slices?|servings?|scoops?|min(?:ute)?s?|h|hrs?|hours?';
const FXSYN={headache:'headache',migraine:'headache',nausea:'nausea',nauseous:'nausea',sick:'nausea','dry mouth':'dry mouth',drowsy:'drowsy',tired:'drowsy',sleepy:'drowsy',exhausted:'drowsy',jittery:'jittery',jitters:'jittery',shaky:'jittery',dizzy:'dizzy',lightheaded:'dizzy','stomach ache':'stomach upset','stomach upset':'stomach upset',stomachache:'stomach upset','upset stomach':'stomach upset',cramps:'stomach upset',"couldn't sleep":'trouble sleeping','trouble sleeping':'trouble sleeping',insomnia:'trouble sleeping','racing heart':'racing heart','heart racing':'racing heart',sweating:'sweating',sweaty:'sweating',irritable:'irritable',grumpy:'irritable',calm:'calm','clear-headed':'clear-headed','clear headed':'clear-headed',motivated:'motivated'};
const METW={mood:'mood',energy:'energy',focus:'focus',sleep:'sleep',slept:'sleep',anxiety:'anxiety',anxious:'anxiety',stress:'anxiety',stressed:'anxiety',appetite:'appetite',hungry:'appetite'};
function to5(n,d){ if(d) return Math.max(1,Math.min(5,Math.round(n/d*5))); if(n<=5) return Math.max(1,Math.round(n)); if(n<=10) return Math.max(1,Math.round(n/2)); return null; }
function parseSay(s){ const out={subs:[],feel:{},fx:[],bits:[],notes:[]}; const names=Store.names();
  const parts=String(s||'').replace(/\s+/g,' ').split(/\s*(?:[,;]|\.(?:\s|$)|\band then\b|\bthen\b|\band\b|\bplus\b|\balso\b)\s*/i).map(x=>x.trim()).filter(Boolean);
  for(let p of parts){ const low=p.toLowerCase(); let used=false;
    /* sleep, workouts and screen time with a duration: "slept 7 hours", "ran 30 min", "screen time 3h" */
    const sl=low.match(/^(?:i\s+)?(?:slept|sleep|napped|nap)\s*(?:for\s+)?(\d+(?:\.\d+)?)\s*(h|hrs?|hours?|min(?:ute)?s?)\b/);
    if(sl){ out.subs.push({what:/nap/.test(low)?'nap':'sleep',amt:sl[1],unit:/^m/.test(sl[2])?'min':'h',tag:'sleep'}); continue; }
    const wo=low.match(/^(?:i\s+)?(?:went\s+for\s+a\s+|did\s+(?:a\s+)?)?(ran|run|jogged|jog|walked|walk|swam|swim|biked|bike|cycled|lifted|lifting|worked out|workout|gym|yoga|stretched)\b\s*(?:for\s+)?(\d+(?:\.\d+)?)?\s*(min(?:ute)?s?|h|hrs?|hours?|km|mi|miles?)?/);
    if(wo){ const W2={ran:'run',jogged:'run',jog:'run',walked:'walk',swam:'swim',biked:'bike',cycled:'bike',lifted:'lifting','worked out':'workout',stretched:'stretching'}; out.subs.push({what:W2[wo[1]]||wo[1],amt:wo[2]||'',unit:wo[2]?(wo[3]?(/^m(?!i)/.test(wo[3])?'min':/^h/.test(wo[3])?'h':wo[3]):'min'):'',tag:'workout'}); continue; }
    const sc=low.match(/^(?:screen\s*time|phone|gaming|tiktok|youtube|instagram|social media)\s*(?:for\s+|was\s+)?(\d+(?:\.\d+)?)\s*(h|hrs?|hours?|min(?:ute)?s?)\b/);
    if(sc){ out.subs.push({what:low.startsWith('screen')?'screen time':low.split(/\s+\d/)[0].replace(/\s*for$/,''),amt:sc[1],unit:/^m/.test(sc[2])?'min':'h',tag:'screen'}); continue; }
    /* a feeling with a number: "mood 4", "energy 2/5", "anxiety 7 out of 10" */
    const mm=low.match(/^(?:my\s+)?(mood|energy|focus|sleep|slept|anxiety|anxious|stress|stressed|appetite|hungry)\s*(?:is|was|at|of|:|=)?\s*(\d+(?:\.\d+)?)(?:\s*(?:\/|out of|of)\s*(\d+))?/);
    if(mm){ const v=to5(+mm[2],mm[3]?+mm[3]:0); if(v){ out.feel[METW[mm[1]]]=v; out.bits.push(ML(METW[mm[1]])+' '+v+'/5'); used=true; } }
    /* an effect, maybe with a number: "headache 6/10", "a bit dizzy" */
    if(!used){ for(const w of Object.keys(FXSYN).sort((a,b)=>b.length-a.length)){ if(new RegExp('(^|\\b)'+w.replace(/[-]/g,'\\-')+'(\\b|$)').test(low)&&!/^(?:i\s+)?(?:took|had|drank|ate|take|used)\b/.test(low)){ const f=FXSYN[w]; if(!out.fx.includes(f)) out.fx.push(f); const n=low.match(/(\d+(?:\.\d+)?)\s*(?:\/|out of)\s*(\d+)/); out.bits.push(f+(n?' '+n[1]+'/'+n[2]:'')); if(n) out.notes.push(f+' '+n[1]+'/'+n[2]); used=true; break; } } }
    if(used) continue;
    /* something taken: "took 2 advil", "200mg caffeine", "coffee 1 cup", "had a latte" */
    let m=p.match(new RegExp('^(?:i\\s+)?(?:just\\s+)?(?:took|take|had|have|drank|drink|ate|eat|used|did|logged)?\\s*(\\d+(?:[.,]\\d+)?|a half|an|a|one|two|three|four|five|six|half)?\\s*('+UNITS+')?\\b\\s*(?:of\\s+)?(.+)$','i'));
    let amt='',unit='',what='';
    if(m&&m[3]){ amt=m[1]?String(NUMW[m[1].toLowerCase()]!=null?NUMW[m[1].toLowerCase()]:m[1].replace(',','.')):''; unit=m[2]||''; what=m[3]; }
    const tail=what.match(new RegExp('^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*('+UNITS+')?$','i')); if(tail&&!amt){ what=tail[1]; amt=tail[2].replace(',','.'); unit=tail[3]||''; }
    what=what.replace(/^(?:some|my|the)\s+/i,'').replace(/\s+(?:pills?|tablets?|capsules?)$/i,m2=>{ if(!unit) unit=m2.trim(); return ''; }).trim();
    if(!what||what.length>60||!/[a-z]/i.test(what)||/^(i|it|was|felt|feel|feeling)$/i.test(what)){ out.notes.push(p); continue; }
    if((amt==='1'||amt==='0.5')&&!unit&&/^(an?|one|half)\b/i.test(p.replace(/^(?:i\s+)?(?:just\s+)?(?:took|had|drank|ate|used)\s+/i,''))&&!m[1]) amt='';
    const known=names.find(n=>Store.keyOf(n.name)===Store.keyOf(what)); if(known){ what=known.name; if(!unit&&amt&&known.unit) unit=known.unit; }
    out.subs.push({what,amt,unit:unit.toLowerCase()}); }
  return out; }
routes.say=v=>{ v.innerHTML=`<p style="margin:0 0 4px"><a href="#log">‹ Log</a></p><h2>Say it</h2><p class="muted" style="margin-top:-4px">Tap the 🎤 on your iPhone keyboard and say it, or type it. Trace splits it into logs right here on this phone.</p>
   <textarea id="sy" maxlength="300" placeholder="took 2 advil, headache 6/10" aria-label="Say or type what you took and how you feel"></textarea>
   <div class="chips" id="syx">${['took 2 advil, headache 6/10','coffee 1 cup and mood 4','200 mg caffeine, jittery','slept 7 hours, energy 2/5'].map(s=>`<button type="button" class="chip sub" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>
   <div id="syp"></div><button class="btn big block" id="sys" disabled>Log it</button>
   <p class="muted small">Things you took become their own logs. Feelings and effects go in a separate “how I feel” check-in, so a headache you had before the advil isn’t counted as an effect of it. The words you said are saved in the check-in’s notes. Dictation is your keyboard’s; Trace itself never records audio.</p>`;
  const show=()=>{ const r=parseSay($('#sy').value); const ok=r.subs.length||r.bits.length;
    $('#syp').innerHTML=ok||$('#sy').value.trim()?`<div class="card list"><h3>Will log</h3>${r.subs.map(x=>`<div class="it" style="cursor:default"><span class="tm">now</span><span class="wh"><b>${esc(x.what)}</b><small>${esc([x.amt,x.unit].filter(Boolean).join(' ')||'no amount')}${x.tag?' · '+esc((TAGS.find(t=>t[0]===x.tag)||['',''])[1]):''}</small></span></div>`).join('')}${r.bits.length?`<div class="it" style="cursor:default"><span class="tm">now</span><span class="wh"><b>Check-in</b><small>${esc(r.bits.join(' · '))}</small></span></div>`:''}${!ok?'<p class="empty">Nothing to log yet. Try “took 2 advil” or “mood 3”.</p>':''}${r.notes.length?`<p class="muted small" style="margin:6px 0 0">Kept as a note: ${esc(r.notes.join('; '))}</p>`:''}</div>`:'';
    $('#sys').disabled=!ok; return r; };
  $('#sy').oninput=show; $('#syx').onclick=e=>{ const b=e.target.closest('[data-s]'); if(!b) return; $('#sy').value=b.dataset.s; show(); };
  $('#sys').onclick=()=>{ const raw=$('#sy').value.trim(); const r=show(); if(!r.subs.length&&!r.bits.length) return; const t=Date.now(); const list=r.subs.map(x=>({_kind:'e',t,what:x.what,amt:x.amt,unit:x.unit,notes:'',feel:null,fx:[],kind:'sub',...(x.tag?{tag:x.tag}:{})}));
    const hasFeel=Object.keys(r.feel).length>0; if(hasFeel||r.fx.length) list.push({_kind:'e',t:t+1,what:'',amt:'',unit:'',notes:('Said: '+raw).slice(0,600),feel:hasFeel?r.feel:null,fx:r.fx,feelAt:t,kind:'chk'});
    else if(list.length) list[0].notes=('Said: '+raw).slice(0,600);
    Store.bulk(list); toast('Logged '+(list.length===1?'1 entry':list.length+' entries')+' ✓'); location.hash='#log'; }; };

/* ---------- 9. Tag anything: food, sleep, workouts, screen time, not just meds ---------- */
let pendingTag='';
const saveEntry0=Store.saveEntry;
Store.saveEntry=function(x){ if(x&&!x.id&&pendingTag&&x.what&&x.kind!=='chk'){ x.tag=pendingTag; pendingTag=''; } return saveEntry0.apply(this,arguments); };
function tagChips(){ return `<div class="chips tagc" id="tagc" role="group" aria-label="What kind of thing">${TAGS.map(t=>`<button type="button" class="chip ${pendingTag===t[0]?'on':''}" data-tag="${t[0]}" aria-pressed="${pendingTag===t[0]}">${esc(t[1])}</button>`).join('')}</div>`; }
function wireTags(v){ const box=v.querySelector('#tagc'); if(!box) return; const w=v.querySelector('#w'), un=v.querySelector('#un');
  const set=tg=>{ pendingTag=tg; box.querySelectorAll('[data-tag]').forEach(b=>{ const on=b.dataset.tag===tg; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); }); const T=TAGS.find(t=>t[0]===tg); if(w) w.placeholder=T&&T[2]?T[2]:'med, supplement, caffeine, anything'; if(un) un.placeholder=T&&T[3]?T[3]:'mg, pill, cup…'; };
  box.onclick=e=>{ const b=e.target.closest('[data-tag]'); if(!b) return; set(pendingTag===b.dataset.tag?'':b.dataset.tag); };
  const auto=()=>{ const o=namesMap()[Store.keyOf(w.value)]; if(o&&tagOf(o)) set(tagOf(o)); };
  if(w) w.addEventListener('change',auto); v.querySelectorAll('.chip.sub[data-q]').forEach(b=>b.addEventListener('click',auto)); set(pendingTag); }

/* ---------- 6. Doctor export: the doctor report as a real one-page PDF file (made on this phone) ---------- */
function reportPDF(){ const R=$('#rpt'); if(!R||!window.TrcX||!TrcX.pdfText) return null; const L=[]; const txt=el=>el.textContent.replace(/×/g,'x').replace(/\s+/g,' ').trim();
  for(const el of R.children){ const tg=el.tagName; if(tg==='H2') L.push({t:txt(el),b:1,s:16}); else if(tg==='H3') L.push({t:txt(el),b:1,s:11.5,g:6});
    else if(tg==='TABLE'){ [...el.rows].forEach((r,i)=>L.push({t:[...r.cells].map(c=>txt(c)||'-').join('  |  '),b:i===0,s:9})); }
    else if(tg==='DIV'){ el.querySelectorAll('h3,p').forEach(x=>L.push(x.tagName==='H3'?{t:txt(x),b:1,s:11.5,g:6}:{t:(x.innerText||txt(x)).replace(/×/g,'x'),s:9})); }
    else if(txt(el)) L.push({t:txt(el),s:9}); }
  /* keep it to one page: shrink, then trim the longest lists */
  const pages=s=>{ const m=s.match(/\/Count (\d+)/); return m?+m[1]:1; };
  let k=1, out=TrcX.pdfText(L);
  while(pages(out)>1&&k>0.7){ k-=0.05; out=TrcX.pdfText(L.map(l=>Object.assign({},l,{s:(l.s||10)*k,g:(l.g||0)*k}))); }
  let LL=L.map(l=>Object.assign({},l,{s:(l.s||10)*k,g:(l.g||0)*k}));
  while(pages(out)>1&&LL.length>8){ const i=LL.map((l,j)=>[l,j]).filter(([l])=>!l.b).pop(); if(!i) break; LL.splice(i[1],1); out=TrcX.pdfText(LL.concat([{t:'(trimmed to fit one page - full detail in the Export screen)',s:8,g:4}])); }
  return out; }
function hookReport(v){ const b=v.querySelector('#rpp'); if(!b||v.querySelector('#rpdf')) return; b.insertAdjacentHTML('afterend','<button class="btn ghost block" id="rpdf">Download one-page PDF file</button>');
  v.querySelector('#rpdf').onclick=()=>{ const rq=v.querySelector('#rq'); if(rq&&rq.onchange) rq.onchange(); const pdf=reportPDF(); if(!pdf) return toast('Couldn’t make the PDF here'); TrcX.save('trace-doctor-summary-'+new Date().toISOString().slice(0,10)+'.pdf',pdf,'application/pdf'); toast('PDF made on this phone ✓'); }; }

/* ---------- 17. Private lock: passcode, plus Face ID / Touch ID where the phone offers it ---------- */
const LK='trc.lock';
const lockCfg=()=>{ try{ return JSON.parse(localStorage.getItem(LK)||'null'); }catch(e){ return null; } };
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))), unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
async function hashPin(pin,salt,it){ const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']); return b64(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unb64(salt),iterations:it},k,256)); }
async function bioOK(){ try{ return !!(window.PublicKeyCredential&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); }catch(e){ return false; } }
async function bioEnroll(){ const c=await navigator.credentials.create({publicKey:{challenge:rnd(32),rp:{name:'Trace'},user:{id:rnd(16),name:'Trace lock',displayName:'Trace lock'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'discouraged'},timeout:60000,attestation:'none'}}); return c?b64(c.rawId):null; }
async function bioCheck(id){ const a=await navigator.credentials.get({publicKey:{challenge:rnd(32),allowCredentials:[{type:'public-key',id:unb64(id)}],userVerification:'required',timeout:60000}});
  if(!a||b64(a.rawId)!==id) return false; const ad=new Uint8Array(a.response.authenticatorData); return ad.length>32&&(ad[32]&0x04)!==0; /* UV flag: the phone checked your face / finger / passcode */ }
let fails=0, waitTill=0, hidAt=0;
function lockNow(){ const L=lockCfg(); if(!L||!L.on||document.getElementById('vault')) return; document.body.classList.add('locked'); closeSheet&&closeSheet();
  document.body.insertAdjacentHTML('beforeend',`<div id="vault" class="vault" role="dialog" aria-modal="true" aria-label="Trace is locked"><div class="vbox"><span class="dot big" aria-hidden="true"></span><h2>Trace is locked</h2><p class="muted small">Your journal stays private on this phone.</p>
   ${L.cred?'<button class="btn big block" id="vbio">Unlock with Face ID</button>':''}<input id="vpin" type="password" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="Passcode" aria-label="Passcode"><button class="btn block ${L.cred?'ghost':''}" id="vgo">Unlock</button><p class="small" id="vmsg" role="status" aria-live="polite"></p></div></div>`);
  const msg=t=>{ const m=document.getElementById('vmsg'); if(m) m.textContent=t; };
  const open=()=>{ fails=0; const x=document.getElementById('vault'); if(x) x.remove(); document.body.classList.remove('locked'); };
  document.getElementById('vgo').onclick=async()=>{ if(Date.now()<waitTill) return msg('Too many tries. Wait '+Math.ceil((waitTill-Date.now())/1000)+' s.'); const p=document.getElementById('vpin').value; if(!p) return msg('Type your passcode');
    if(await hashPin(p,L.salt,L.it)===L.hash) return open(); fails++; document.getElementById('vpin').value=''; if(fails>=5){ waitTill=Date.now()+30000*(fails-4); msg('Wrong passcode. Wait '+30*(fails-4)+' s.'); } else msg('Wrong passcode'); };
  document.getElementById('vpin').onkeydown=e=>{ if(e.key==='Enter') document.getElementById('vgo').click(); };
  const vb=document.getElementById('vbio'); if(vb) vb.onclick=async()=>{ try{ if(await bioCheck(L.cred)) open(); else msg('Face ID didn’t confirm. Use your passcode.'); }catch(e){ msg('Face ID isn’t available right now. Use your passcode.'); } }; }
document.addEventListener('visibilitychange',()=>{ const L=lockCfg(); if(!L||!L.on) return; if(document.hidden) hidAt=Date.now(); else if(hidAt&&Date.now()-hidAt>=(+L.after||0)*60000) lockNow(); });
routes.lock=v=>{ const L=lockCfg()||{};
  v.innerHTML=`<p style="margin:0 0 4px"><a href="#more">‹ More</a></p><h2>Private lock</h2><p class="muted" style="margin-top:-4px">Ask for a passcode (and Face ID or Touch ID if your phone has it) every time Trace opens.</p>
   <div class="card">${L.on?`<p style="margin-top:0"><b>Lock is on</b>${L.cred?' · Face ID / Touch ID on':''}</p>
     <label for="lka">Lock again after Trace is in the background for</label><select id="lka">${[[0,'right away'],[1,'1 minute'],[5,'5 minutes'],[15,'15 minutes']].map(([n,l])=>`<option value="${n}" ${+L.after===n?'selected':''}>${l}</option>`).join('')}</select>
     <div id="lkb"></div><button class="btn ghost block" id="lkt">Lock now</button><button class="btn ghost block" id="lkc">Change passcode</button><button class="btn danger block" id="lkoff">Turn lock off</button>`
    :`<label for="lp1">New passcode (4–12 digits)</label><input id="lp1" type="password" inputmode="numeric" maxlength="12" autocomplete="new-password"><label for="lp2">Same again</label><input id="lp2" type="password" inputmode="numeric" maxlength="12" autocomplete="new-password"><button class="btn block" id="lkon" style="margin-top:10px">Turn on lock</button>`}</div>
   <p class="muted small">Honest limits: this is a screen lock for Trace on this phone. It keeps people who pick up your phone out of your journal; it doesn’t encrypt the logs stored in the browser. If you forget the passcode, Trace can’t reset it: clearing Trace’s website data removes the lock and every log on this phone (synced logs come back when you sign in).</p>`;
  const save=x=>{ try{ localStorage.setItem(LK,JSON.stringify(x)); }catch(e){ toast('Storage is full on this phone'); } };
  const ask=async(first)=>{ const a=prompt(first||'Current passcode'); if(a==null) return false; if(await hashPin(a,L.salt,L.it)===L.hash) return true; toast('Wrong passcode'); return false; };
  const on=$('#lkon'); if(on) on.onclick=async()=>{ const a=$('#lp1').value, b=$('#lp2').value; if(!/^\d{4,12}$/.test(a)) return toast('Use 4 to 12 digits'); if(a!==b) return toast('The two passcodes don’t match'); const salt=b64(rnd(16)), it=150000; save({on:1,salt,it,hash:await hashPin(a,salt,it),cred:null,after:1}); toast('Lock on 🔒'); route(); };
  if(L.on){ $('#lka').onchange=e=>{ save(Object.assign(lockCfg()||{},{after:+e.target.value})); toast('Saved'); };
    $('#lkt').onclick=()=>lockNow();
    $('#lkoff').onclick=async()=>{ if(!await ask('Type your passcode to turn the lock off')) return; localStorage.removeItem(LK); toast('Lock off'); route(); };
    $('#lkc').onclick=async()=>{ if(!await ask()) return; const a=prompt('New passcode (4–12 digits)'); if(a==null) return; if(!/^\d{4,12}$/.test(a)) return toast('Use 4 to 12 digits'); const salt=b64(rnd(16)); save(Object.assign(lockCfg(),{salt,hash:await hashPin(a,salt,L.it||150000)})); toast('Passcode changed'); };
    bioOK().then(ok=>{ const box=$('#lkb'); if(!box) return; if(!ok){ box.innerHTML='<p class="muted small">Face ID / Touch ID isn’t available in this browser, so the passcode is used.</p>'; return; }
      box.innerHTML=L.cred?'<button class="btn ghost block" id="lbo">Stop using Face ID</button>':'<button class="btn block" id="lbi">Also use Face ID / Touch ID</button>';
      const bi=$('#lbi'); if(bi) bi.onclick=async()=>{ try{ const id=await bioEnroll(); if(!id) throw 0; save(Object.assign(lockCfg(),{cred:id})); toast('Face ID on ✓'); route(); }catch(e){ toast('Face ID wasn’t set up'); } };
      const bo=$('#lbo'); if(bo) bo.onclick=()=>{ save(Object.assign(lockCfg(),{cred:null})); route(); }; }); } };

/* ---------- hooks into existing screens (Log, Calendar, More, Doctor report) ---------- */
function hookLog(v){ const q=v.querySelector('#kind'); if(!q) return; const card=q.closest('.card'); const S=feat().stacks;
  const cs=cafState(); const cafLine=cs.now>=5?`<a class="card it" href="#caffeine" style="margin:10px 0;border-color:#5c4813"><span class="wh"><b>☕ ~${Math.round(cs.now)} mg caffeine still in you</b><small>rough estimate · tap for the curve</small></span><span class="pill">curve</span></a>`:cs.miss.some(x=>x.t>=Date.now()-12*HR)?`<a class="card it" href="#caffeine" style="margin:10px 0"><span class="wh"><b>☕ Caffeine curve</b><small>set mg for ${esc(cs.miss[0].what)} to see what’s still in your system</small></span></a>`:'';
  const undo=lastStack&&Date.now()-lastStack.at<15000?`<button class="btn ghost sm" id="stu">Undo ${esc(lastStack.name)}</button>`:'';
  const nw=!localStorage.getItem('trc.new150')?`<div class="card newc" id="n15"><button class="lnk x" id="n15x" aria-label="Dismiss">✕</button><b>New in Trace 1.5</b><p class="muted small" style="margin:4px 0 8px">Stacks you log in one tap, Say it, tags for food, sleep, workouts and screen time, a caffeine curve, a How I felt calendar, missed-day ghosts, and Deep dives in Insights: fingerprints, lag finder, combo watch, before/after, weekly recap and experiments. Plus a private lock in More.</p><a class="btn sm" href="#say">Say it</a> <a class="btn ghost sm" href="#stacks">Stacks</a> <a class="btn ghost sm" href="#fp">Deep dives</a></div>`:'';
  card.insertAdjacentHTML('beforebegin',nw+cafLine+expTodayCard()+`<div class="card onetap"><div class="hrow" style="margin:0 0 6px"><h3 style="margin:0">One tap</h3><a href="#stacks" class="small">${S.length?'edit stacks':'make a stack'}</a></div><div class="chips"><a class="chip" href="#say">🎤 Say it</a>${S.map(s=>`<button type="button" class="chip on" data-stk="${esc(s.id)}">${esc(s.name)} · ${s.items.length}</button>`).join('')}${undo}</div></div>`);
  const subf=v.querySelector('#subf'); if(subf) subf.insertAdjacentHTML('afterbegin',tagChips()); wireTags(v);
  v.querySelectorAll('[data-stk]').forEach(b=>b.onclick=()=>logStack(b.dataset.stk));
  const su=v.querySelector('#stu'); if(su) su.onclick=()=>{ const n=Store.bulkDel(lastStack.ids); toast('Removed '+pl(n,'log')); lastStack=null; route(); };
  v.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>{ expMark(b.dataset.id,dk(Date.now()),+b.dataset.ex); toast(b.dataset.ex==='1'?'Nice, marked ✓':'Marked. Honest data helps the verdict'); route(); });
  const nx=v.querySelector('#n15x'); if(nx) nx.onclick=()=>{ localStorage.setItem('trc.new150','1'); const c=v.querySelector('#n15'); if(c) c.remove(); }; }
function wrap(name,after){ const f=routes[name]; if(!f) return; routes[name]=function(v,...a){ const r=f.call(this,v,...a); try{ after(v,...a); }catch(e){ console.warn(e); } return r; }; }
wrap('log',hookLog);
wrap('cal',v=>{ v.insertAdjacentHTML('afterbegin',calSeg('cal')); });
wrap('more',v=>{ const first=v.querySelector('.card.list'); if(!first) return; const L=lockCfg();
  first.insertAdjacentHTML('afterend',`<h3 style="margin-top:16px">New in 1.5</h3><div class="card list">
   <a class="it" href="#lock"><span class="wh"><b>Private lock</b><small>${L&&L.on?'on':'passcode + Face ID to open Trace'}</small></span></a>
   <a class="it" href="#stacks"><span class="wh"><b>My stacks</b><small>log your usual things in one tap</small></span></a>
   <a class="it" href="#say"><span class="wh"><b>Say it</b><small>“took 2 advil, headache 6/10” → logged</small></span></a>
   <a class="it" href="#caffeine"><span class="wh"><b>Caffeine curve</b><small>a rough estimate of what’s still in your system</small></span></a>
   <a class="it" href="#days"><span class="wh"><b>How I felt calendar · Missed days</b><small>good vs rough days, and skipped usual days</small></span></a>
   <a class="it" href="#recap"><span class="wh"><b>Weekly recap · Experiments · Deep dives</b><small>fingerprints, lag finder, combo watch, before/after ${pro()?'':'· Pro'}</small></span></a></div>`); });
wrap('report',v=>hookReport(v));

/* ---------- search + commands ---------- */
if(window.TrcCmd&&Array.isArray(TrcCmd.C)){ const go=h=>{ if(location.hash===h) route(); else location.hash=h; }; const add=(id,folder,name,run,o)=>{ if(!TrcCmd.C.some(x=>x.id===id)) TrcCmd.C.push(Object.assign({id,folder,name,run},o||{})); };
  add('n-say','Log','Say it (dictate or type a sentence)',()=>go('#say'),{k:'voice speak dictate sentence natural'});
  add('n-stacks','Log','My stacks (one-tap repeat)',()=>go('#stacks'),{k:'usual repeat bundle routine morning'});
  feat().stacks.forEach(s=>add('n-stk-'+s.id,'Log','Log stack: '+s.name,()=>logStack(s.id),{k:'stack one tap'}));
  add('n-caf','Log','Caffeine curve',()=>go('#caffeine'),{k:'coffee half-life mg in my system'});
  add('n-days','Calendar','How I felt calendar',()=>go('#days'),{k:'heat map good rough symptom mood'});
  add('n-ghost','Calendar','Missed days (ghosts)',()=>go('#ghost'),{k:'skipped missed dose gaps'});
  add('n-fp','Insights','Effect fingerprints',()=>go('#fp'),{pro:1,k:'pattern deep dive'});
  add('n-lag','Insights','Lag finder',()=>go('#lag'),{pro:1,k:'delayed later days after'});
  add('n-combo','Insights','Combo watch',()=>go('#combo'),{pro:1,k:'pairs together bad days'});
  add('n-split','Insights','Before / after split',()=>go('#split'),{pro:1,k:'compare started stopped two weeks'});
  add('n-recap','Insights','Weekly 3-line recap',()=>go('#recap'),{pro:1,k:'summary week what helped watch'});
  add('n-exp','Insights','Experiments',()=>go('#exp'),{pro:1,k:'test trial 14 day verdict'});
  add('n-lock','Data','Private lock',()=>go('#lock'),{k:'face id passcode privacy pin'});
  add('n-locknow','Data','Lock Trace now',()=>{ if(!(lockCfg()||{}).on) return toast('Turn on the lock in More first'); lockNow(); },{k:'privacy hide'}); }

window.TrcFeat={parseSay,cafAt,conf,recapLines,ghostList,verdict,lockNow,reportPDF};
/* lock before anything shows when Trace opens */
if((lockCfg()||{}).on){ if(document.body) lockNow(); else document.addEventListener('DOMContentLoaded',lockNow); }
})();
