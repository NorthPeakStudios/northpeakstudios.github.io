// Trace · Labs (1.1). Eight extra tools, all built from YOUR logs or cited public labels. Northpeak Studios.
// Hard limits kept here too: no amounts advice, no "safe" dose, no body-type math, correlation-not-cause on every comparison.
(function(){
const LABS=[
 {id:'mix',ic:'🧪',name:'Interaction check',free:1,line:'Pick 2+ things you log. See what their FDA labels say about each other, quoted.'},
 {id:'refill',ic:'💊',name:'Refill countdown',free:1,line:'How many you have left and the day you run out, counted from your logs.'},
 {id:'urge',ic:'🌊',name:'Urge timer',free:1,line:'Log an urge, time it, and see how long yours usually take to pass.'},
 {id:'ctx',ic:'🏷️',name:'Context patterns',line:'Where, who with and why you logged, next to how you felt.'},
 {id:'rhythm',ic:'📊',name:'Rhythm',line:'How often per week over months, and the time between uses.'},
 {id:'timing',ic:'🌙',name:'Timing & sleep',line:'What time of day you took something vs the sleep you logged after.'},
 {id:'detect',ic:'🔎',name:'Effect detective',line:'Pick an effect. See what you logged in the 24 h before it, vs usual.'},
 {id:'report',ic:'📄',name:'Doctor report',line:'A one-page summary of a month to print or save as a PDF.'}
];
const DAY=864e5, H=36e5;
const med=a=>{ if(!a.length) return null; const s=a.slice().sort((x,y)=>x-y), m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; };
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const f1=x=>x==null?'–':(Math.round(x*10)/10).toString();
const back='<p style="margin:0 0 4px"><a href="#labs">‹ Labs</a></p>';
const cnc='<p class="muted small">From your own logs only. This shows things that happened together (correlation), not what caused what.</p>';
const subs=()=>Store.entries().filter(x=>x.what);
function pickItem(id,sel,list){ list=list||Store.names(); return `<select id="${id}">${list.map(n=>`<option value="${esc(Store.keyOf(n.name))}" ${Store.keyOf(n.name)===sel?'selected':''}>${esc(n.name)} (${n.n})</option>`).join('')}</select>`; }
function dl(name,txt,type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([txt],{type})); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); }

/* ---------- Labs home ---------- */
routes.labs=v=>{
  v.innerHTML=`<p style="margin:0 0 4px"><a href="#more">‹ More</a></p><h2>Labs ✨</h2><p class="muted" style="margin-top:-4px">New in Trace 1.1. Extra tools, kept off the main screens so Trace stays simple.</p>
   <div class="card list">${LABS.map(l=>`<a class="it" href="#lab/${l.id}"><span class="lic">${l.ic}</span><span class="wh"><b>${esc(l.name)} ${l.free?'<span class="pill acc">free</span>':(P()?'':'<span class="pill">Pro 🔒</span>')}</b><small class="wrap">${esc(l.line)}</small></span></a>`).join('')}</div>
   <p class="muted small center">Everything here is built from your own logs or quoted public FDA labels, stays on this phone, and never suggests amounts.</p>`;
};
routes.lab=(v,id,...rest)=>{ const l=LABS.find(x=>x.id===id); if(!l) return routes.labs(v);
  if(!l.free&&!P()){ TrcPro.locked(v,l.name,l.line); v.insertAdjacentHTML('afterbegin',back); return; }
  LAB[id](v,...rest); };
window.TrcLabs={LABS};

const LAB={};
/* ---------- 1. Interaction check (free) ---------- */
const DOSEY=/\b\d+(\.\d+)?\s?(mg|mcg|µg|g|ml|mL|units?)\b|\bdos(e|es|age|ing)\b|titrat|mg\/kg/i;
const ALIAS=[[/nonsteroidal anti-inflammatory/i,['nsaid','nsaids']],[/serotonin reuptake inhibitor/i,['ssri','ssris','serotonergic']],[/monoamine oxidase inhibitor/i,['maoi','maois']],[/benzodiazepine/i,['benzodiazepine','benzodiazepines']],[/opioid agonist/i,['opioid','opioids']],[/anticoagulant|vitamin k antagonist/i,['anticoagulant','anticoagulants','warfarin']],[/central nervous system stimulant/i,['stimulant','stimulants']],[/serotonin and norepinephrine reuptake inhibitor/i,['snri','snris','serotonergic']]];
async function ixLabel(name){
  const k='trc.fdaix2.'+Store.keyOf(name); try{ const c=JSON.parse(localStorage.getItem(k)||'null'); if(c&&Date.now()-c.at<7*DAY) return c.r; }catch(e){}
  const q=String(name).trim().replace(/["\\]/g,'').slice(0,60); if(!q) return null;
  const url='https://api.fda.gov/drug/label.json?search='+['openfda.generic_name','openfda.brand_name','openfda.substance_name'].map(f=>encodeURIComponent(f+':"'+q+'"')).join('+')+'&limit=5';
  const r=await fetch(url,{credentials:'omit',cache:'no-store'}); let out=null;
  if(r.ok){ const j=await r.json(); const R=j.results||[]; const ql=q.toLowerCase(); const nm=y=>{ const o=y.openfda||{}; const qq=ql.split(/[^a-z0-9]+/).join(' ').trim(); return [...(o.generic_name||[]),...((o.substance_name||[]).length===1?o.substance_name:[]),...(o.brand_name||[])].some(s=>{ s=s.toLowerCase().split(/[^a-z0-9]+/).join(' ').trim(); return s===qq||s.startsWith(qq+' '); }); };
    const x=R.find(y=>nm(y)&&(y.drug_interactions||y.contraindications))||R.find(nm); if(x){ const o=x.openfda||{};
    out={brand:(o.brand_name||[])[0]||'',generic:(o.generic_name||[])[0]||'',set:x.set_id||'',date:x.effective_time||'',
      names:[...(o.generic_name||[]),...(o.brand_name||[]),...(o.substance_name||[])].map(s=>s.toLowerCase()).slice(0,8),
      cls:(o.pharm_class_epc||[]).map(s=>s.replace(/\s*\[EPC\]/,'')).slice(0,4),
      ix:((x.drug_interactions||[]).join(' ')).slice(0,30000), ci:((x.contraindications||[]).join(' ')).slice(0,8000), wn:((x.warnings_and_cautions||x.warnings||[]).join(' ')).slice(0,30000)}; } }
  else if(r.status!==404) throw new Error('fda_'+r.status);
  try{ localStorage.setItem(k,JSON.stringify({at:Date.now(),r:out})); }catch(e){}
  return out; }
function termsFor(name,lab){ const t=new Set([Store.keyOf(name)]); if(lab){ lab.names.forEach(n=>n.split(/\s+and\s+|,\s*/).forEach(p=>t.add(p.trim()))); lab.cls.forEach(c=>{ t.add(c.toLowerCase()); ALIAS.forEach(([re,al])=>{ if(re.test(c)) al.forEach(a=>t.add(a)); }); }); }
  if(/coffee|caffein|energy drink|tea\b/i.test(name)) t.add('caffeine'); if(/alcohol|beer|wine|liquor|vodka/i.test(name)) t.add('alcohol');
  return [...t].filter(s=>s&&s.length>=4); }
function hits(text,terms){ if(!text) return {s:[],dose:0}; const re=new RegExp('\\b('+terms.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','i');
  const sents=String(text).replace(/\s+/g,' ').match(/[^.;!?]+[.;!?]?/g)||[]; const out=[]; let dose=0;
  for(const s of sents){ if(!re.test(s)) continue; if(DOSEY.test(s)){ dose++; continue; } const c=s.trim(); if(c.length>12&&!out.includes(c)) out.push(c.length>320?c.slice(0,320)+' …':c); }
  return {s:out,dose,re}; }
LAB.mix=v=>{
  const names=Store.names(); const pre=new Set(Store.reminders().map(r=>Store.keyOf(r.what)));
  v.innerHTML=`${back}<h2>Interaction check</h2><p class="muted" style="margin-top:-4px">Pick 2 to 4 things you log. Trace reads each one’s FDA label (the Drug interactions, Contraindications and Warnings sections) and quotes where it names the others.</p>
   ${names.length<2?'<div class="card empty">Log at least two different things first.</div>':`<div class="chips" id="mxc">${names.slice(0,24).map(n=>`<button type="button" class="chip ${pre.has(Store.keyOf(n.name))?'on':''}" data-n="${esc(n.name)}">${esc(n.name)}</button>`).join('')}</div>
   <button class="btn block" id="mxg">Check labels</button><div id="mxo"></div>`}
   <p class="muted small">Quoted from public FDA labels via openFDA, shortened. Not being named on a label doesn’t mean two things are fine together, and being named doesn’t mean you’ll have a problem. A pharmacist can check your list for free.</p>`;
  const c=$('#mxc'); if(!c) return;
  c.onclick=e=>{ const b=e.target.closest('.chip'); if(!b) return; if(!b.classList.contains('on')&&c.querySelectorAll('.chip.on').length>=4) return toast('Up to 4 at a time'); b.classList.toggle('on'); };
  $('#mxg').onclick=async()=>{ const sel=[...c.querySelectorAll('.chip.on')].map(b=>b.dataset.n); if(sel.length<2) return toast('Pick at least 2'); const o=$('#mxo'); o.innerHTML='<p class="muted">Reading labels…</p>';
    let labs; try{ labs=await Promise.all(sel.map(n=>ixLabel(n).catch(e=>({err:1})))); }catch(e){ labs=sel.map(()=>({err:1})); }
    if(!$('#mxo')) return;
    const terms=sel.map((n,i)=>termsFor(n,labs[i]&&!labs[i].err?labs[i]:null)); let html='';
    sel.forEach((a,i)=>{ const L=labs[i];
      if(L&&L.err){ html+=`<div class="card"><h3>${esc(a)}</h3><p class="muted">Couldn’t reach the FDA database for this one right now.</p></div>`; return; }
      if(!L){ html+=`<div class="card"><h3>${esc(a)}</h3><p class="muted" style="margin:0">No FDA drug label for “${esc(a)}” (supplements, foods and caffeine often don’t have one). It’s still checked against the other labels below.</p></div>`; return; }
      let rows=''; sel.forEach((b,j)=>{ if(i===j) return; const T=terms[j]; const parts=[['Drug interactions',L.ix],['Contraindications',L.ci],['Warnings',L.wn]].map(([sec,tx])=>[sec,hits(tx,T)]);
        const n=parts.reduce((s,[,h])=>s+h.s.length,0), dz=parts.reduce((s,[,h])=>s+h.dose,0);
        rows+=`<div class="ixr"><p style="margin:8px 0 4px"><b>${n||dz?'Names':'Doesn’t name'} ${esc(b)}</b> ${n||dz?'<span class="pill warn">mentioned</span>':'<span class="pill">not named</span>'}</p>
         ${parts.filter(([,h])=>h.s.length).map(([sec,h])=>`<p class="muted small" style="margin:4px 0 2px">${sec}:</p>${h.s.slice(0,3).map(s=>`<blockquote class="q">${esc(s).replace(h.re,'<mark>$1</mark>')}</blockquote>`).join('')}${h.s.length>3?`<p class="muted small">+${h.s.length-3} more in the label</p>`:''}`).join('')}
         ${dz?`<p class="muted small">${dz} sentence${dz>1?'s':''} about dosing left out. Trace doesn’t show amounts; ask a pharmacist.</p>`:''}</div>`; });
      html+=`<div class="card"><h3>${esc(L.brand||L.generic||a)}’s label</h3>${rows}${TrcFDA.cite(L)}</div>`; });
    o.innerHTML=html+`<p class="center"><a class="btn ghost sm" href="tel:18002221222">Questions? Poison Control 1-800-222-1222</a></p>`; };
};

/* ---------- 2. Refill countdown (free) ---------- */
function refills(){ return Store.prefs().refill||{}; }
function refillCalc(r){ const k=r.key; const es=subs().filter(x=>Store.keyOf(x.what)===k);
  const since=es.filter(x=>x.t>=r.at).length, left=Math.max(0,(+r.have||0)-since*(+r.per||1));
  const recent=es.filter(x=>x.t>=Date.now()-28*DAY); const span=recent.length?Math.max(7,(Date.now()-Math.min(...recent.map(x=>x.t)))/DAY):28;
  const perDay=recent.length/span*(+r.per||1); const days=perDay>0?left/perDay:null; const out=days!=null?new Date(Date.now()+days*DAY):null;
  return {since,left,perDay,days,out,low:days!=null&&days<=(+r.warn||5)}; }
window.TrcRefillDue=()=>Object.values(refills()).map(r=>Object.assign({r},refillCalc(r))).filter(x=>x.low);
LAB.refill=v=>{ const R=refills(), names=Store.names(); const list=Object.values(R);
  v.innerHTML=`${back}<h2>Refill countdown</h2><p class="muted" style="margin-top:-4px">Tell Trace how many you have. Each time you log it, the count goes down, and your own logging pace gives a run-out date.</p>
   <div class="card list">${list.length?list.map(r=>{ const c=refillCalc(r); return `<div class="it" data-rf="${esc(r.key)}"><span class="wh"><b>${esc(r.name)} ${c.low?'<span class="pill warn">refill soon</span>':''}</b><small>${f1(c.left)} ${r.unit?esc(r.unit)+' ':''}left · ${c.out?'runs out ~'+fmtD(c.out.getTime()):'no recent logs to count from'}</small></span><span class="pill">${c.days!=null?Math.floor(c.days)+' d':'–'}</span></div>`; }).join(''):'<p class="empty">Nothing tracked yet.</p>'}</div>
   <details class="fold" ${list.length?'':'open'} id="rff"><summary>Track a refill</summary>${names.length?refForm({}):'<p class="muted">Log something first.</p>'}</details>
   <p class="muted small">This only counts. The “each log uses” number is whatever you enter. Trace doesn’t suggest how many to take or how often.</p>`;
  if(names.length) wireRef(v.querySelector('#rff'),{});
  v.querySelectorAll('[data-rf]').forEach(el=>el.onclick=()=>{ const r=R[el.dataset.rf]; const c=refillCalc(r);
    sheet(`<h3>${esc(r.name)}</h3><div class="stat"><div><b>${f1(c.left)}</b><span>${esc(r.unit||'')} left</span></div><div><b>${c.since}</b><span>logs since count</span></div><div><b>${c.out?esc(fmtD(c.out.getTime()).replace(/^\w+, /,'')):'–'}</b><span>runs out</span></div></div>
     <p class="muted small">Based on ${c.perDay?f1(c.perDay)+' a day, your pace over the last 4 weeks':'no logs in the last 4 weeks'}.</p>
     <button class="btn block" id="rnew">I refilled · new count</button>${c.out?'<button class="btn ghost block" id="rics">Add a refill alert to Calendar</button>':''}
     <details class="fold"><summary>Edit</summary>${refForm(r)}</details><button class="btn danger block" id="rdl">Stop tracking</button>`,root=>{
      wireRef(root.querySelector('details'),r);
      $('#rnew').onclick=()=>{ const n=prompt('How many do you have now?',r.have); if(n==null) return; const x=parseFloat(n); if(!(x>=0)) return toast('Type a number'); saveRef(Object.assign({},r,{have:x,at:Date.now()})); closeSheet(); route(); };
      const ri=$('#rics'); if(ri) ri.onclick=()=>refIcs(r,c);
      $('#rdl').onclick=()=>{ const all=Object.assign({},refills()); delete all[r.key]; Store.savePrefs({refill:all}); closeSheet(); route(); }; }); });
};
function refForm(r){ return `<label>What</label>${r.key?`<input class="fn" value="${esc(r.name)}" disabled>`:pickItem('rfw','',Store.names())}
  <div class="row"><div><label>How many you have now</label><input class="fh" inputmode="decimal" value="${esc(r.have!=null?r.have:'')}" placeholder="e.g. 30"></div><div><label>Counted in</label><input class="fu" value="${esc(r.unit||'')}" placeholder="pills, tabs…" maxlength="16"></div></div>
  <div class="row"><div><label>Each log uses</label><input class="fp" inputmode="decimal" value="${esc(r.per||1)}"></div><div><label>Warn me this many days before</label><input class="fw" inputmode="numeric" value="${esc(r.warn||5)}"></div></div>
  <button class="btn block fs">${r.key?'Save':'Start counting'}</button>`; }
function saveRef(r){ const all=Object.assign({},refills()); all[r.key]=r; Store.savePrefs({refill:all}); }
function wireRef(root,r){ root.querySelector('.fs').onclick=()=>{ const key=r.key||root.querySelector('#rfw').value; const n=Store.names().find(x=>Store.keyOf(x.name)===key);
  const have=parseFloat(root.querySelector('.fh').value), per=parseFloat(root.querySelector('.fp').value)||1, warn=parseInt(root.querySelector('.fw').value)||5;
  if(!(have>=0)) return toast('How many do you have?'); saveRef({key,name:r.name||(n&&n.name)||key,have,unit:root.querySelector('.fu').value.trim(),per,warn,at:r.at&&have===r.have?r.at:Date.now()}); closeSheet(); toast('Counting'); route(); }; }
function refIcs(r,c){ const d=new Date(c.out.getTime()-(+r.warn||5)*DAY); d.setHours(9,0,0,0); if(d<Date.now()){ d.setTime(Date.now()+DAY); d.setHours(9,0,0,0); }
  const p=n=>String(n).padStart(2,'0'), loc=x=>x.getFullYear()+p(x.getMonth()+1)+p(x.getDate())+'T'+p(x.getHours())+p(x.getMinutes())+'00', e=new Date(d.getTime()+15*60000), tx=s=>String(s).replace(/[\\;,]/g,m=>'\\'+m);
  dl('trace-refill.ics',['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Northpeak Studios//Trace//EN','BEGIN:VEVENT','UID:refill-'+r.key.replace(/[^a-z0-9]/g,'')+'-'+d.getTime()+'@trace.northpeak','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z','DTSTART:'+loc(d),'DTEND:'+loc(e),'SUMMARY:'+tx('Trace: refill '+r.name),'DESCRIPTION:'+tx('Trace counts about '+(+r.warn||5)+' days left of '+r.name+'.'),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+tx('Refill '+r.name),'TRIGGER:PT0M','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n'),'text/calendar'); }

/* ---------- 3. Urge timer (free) ---------- */
let urgeTick=null;
LAB.urge=v=>{ clearInterval(urgeTick); const us=Store.urges(), live=us.find(u=>!u.end), done=us.filter(u=>u.end);
  const passed=done.filter(u=>u.out==='passed').map(u=>(u.end-u.t)/60000), m=passed.length>=3?med(passed):null;
  v.innerHTML=`${back}<h2>Urge timer</h2><p class="muted" style="margin-top:-4px">Urges rise, peak and fade. Log one when it starts and tap when it eases. Over time you see how long <i>yours</i> usually last.</p>
   ${live?`<div class="card center" id="ulive"><p class="muted" style="margin:0">${live.what?esc(live.what)+' · ':''}intensity ${live.i}/10</p><div class="utime" id="ut">0:00</div>
     ${m?`<div class="ubar"><i id="ub"></i></div><p class="muted small" id="uh">Yours have eased in about ${Math.round(m)} min (middle of ${passed.length}).</p>`:'<p class="muted small">After 3 timed urges, Trace shows how long yours usually take.</p>'}
     <div class="row"><button class="btn" id="upass">It eased</button><button class="btn ghost" id="uact">I went with it</button></div><button class="lnk small" id="ucan">Cancel</button></div>`
   :`<div class="card"><label for="uw">Urge for (optional)</label><input id="uw" list="uwl" maxlength="40" placeholder="anything"><datalist id="uwl">${Store.names().map(n=>`<option value="${esc(n.name)}">`).join('')}</datalist>
     <div class="sl" data-k="i" style="grid-template-columns:76px 1fr 30px"><span>Intensity</span><input type="range" min="1" max="10" value="5" id="ui"><b id="uib">5</b></div>
     <button class="btn big block" id="ugo">Start timer</button></div>`}
   <div class="stat"><div><b>${done.length}</b><span>urges logged</span></div><div><b>${m?Math.round(m)+'m':'–'}</b><span>usual time to ease</span></div><div><b>${done.length?f1(avg(done.map(u=>u.i))):'–'}</b><span>avg intensity</span></div></div>
   ${done.length?`<h3 style="margin-top:16px">Recent</h3><div class="card list">${done.slice(0,8).map(u=>`<div class="it" data-u="${u.id}"><span class="tm">${fmtD(u.t).replace(/^\w+, /,'')}</span><span class="wh"><b>${u.what?esc(u.what):'Urge'} · ${u.i}/10</b><small>${u.out==='passed'?'eased':'went with it'} after ${Math.max(1,Math.round((u.end-u.t)/60000))} min</small></span></div>`).join('')}</div>`:''}
   <p class="muted small">No judging either way, it’s just data. If it ever feels like too much: <a href="#help">help lines</a>.</p>`;
  if(live){ const ut=$('#ut'), ub=$('#ub'); const tick=()=>{ if(!document.body.contains(ut)) return clearInterval(urgeTick); const s=Math.floor((Date.now()-live.t)/1000); ut.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); if(ub&&m) ub.style.width=Math.min(100,s/60/m*100)+'%'; }; tick(); urgeTick=setInterval(tick,1000);
    const end=out=>{ live.end=Date.now(); live.out=out; Store.saveUrge(live); toast(out==='passed'?'Logged · it eased after '+Math.max(1,Math.round((live.end-live.t)/60000))+' min':'Logged'); route(); };
    $('#upass').onclick=()=>end('passed'); $('#uact').onclick=()=>end('acted'); $('#ucan').onclick=()=>{ Store.delUrge(live.id); route(); }; }
  else { $('#ui').oninput=e=>$('#uib').textContent=e.target.value; $('#ugo').onclick=()=>{ Store.saveUrge({t:Date.now(),what:$('#uw').value.trim(),i:+$('#ui').value,end:null}); route(); }; }
  v.querySelectorAll('[data-u]').forEach(el=>el.onclick=()=>{ if(confirm('Delete this urge log?')){ Store.delUrge(el.dataset.u); route(); } });
};

/* ---------- 4. Context patterns (Pro) + context capture (free, in the log) ---------- */
const CTX=[['where','Where',['home','school','work',"friend's",'out','car']],['who','With',['alone','friends','family','partner','classmates']],['why','Why',['routine','symptom','focus','sleep','energy','social','stress','bored']],['before','Before, I felt',['calm','okay','good','tired','stressed','low']]];
window.TrcCtx={
  html(c){ c=c||{}; return CTX.map(([k,l,opts])=>{ const sel=c[k]||[]; const all=[...new Set([...opts,...sel])]; return `<label>${l}</label><div class="chips ctxg" data-g="${k}">${all.map(o=>`<button type="button" class="chip ${sel.includes(o)?'on':''}" data-c="${esc(o)}">${esc(o)}</button>`).join('')}</div>`; }).join(''); },
  wire(root){ root.querySelectorAll('.ctxg').forEach(g=>g.onclick=e=>{ const b=e.target.closest('.chip'); if(b) b.classList.toggle('on'); }); },
  read(root){ const c={}; root.querySelectorAll('.ctxg').forEach(g=>{ const on=[...g.querySelectorAll('.chip.on')].map(b=>b.dataset.c); if(on.length) c[g.dataset.g]=on; }); return Object.keys(c).length?c:null; }
};
LAB.ctx=(v,key)=>{ const all=Store.entries().filter(x=>x.ctx&&(!key||Store.keyOf(x.what)===key)); const names=Store.names().filter(n=>Store.entries().some(x=>x.ctx&&Store.keyOf(x.what)===Store.keyOf(n.name)));
  const head=`${back}<h2>Context patterns</h2><p class="muted" style="margin-top:-4px">Tag where you were, who with, why, and how you felt before (the “Context” fold when you log). This lines those tags up with how you felt after.</p>`;
  if(all.length<3){ v.innerHTML=head+'<div class="card empty">Add context to at least 3 logs to see patterns.<br><a href="#log">Log something</a></div>'; return; }
  const withF=all.filter(x=>x.feel); const base={}; Store.METRICS.forEach(([k])=>base[k]=avg(withF.filter(x=>x.feel[k]).map(x=>x.feel[k])));
  const rows=[]; for(const [g,l] of CTX){ const tags={}; all.forEach(x=>(x.ctx[g]||[]).forEach(t=>(tags[t]=tags[t]||[]).push(x))); for(const [t,es] of Object.entries(tags)){ if(es.length<2) continue;
    const fx={}; es.forEach(x=>(x.fx||[]).forEach(f=>fx[f]=(fx[f]||0)+1)); const top=Object.entries(fx).sort((a,b)=>b[1]-a[1]).slice(0,2);
    const d=Store.METRICS.map(([k,lab])=>{ const a=avg(es.filter(x=>x.feel&&x.feel[k]).map(x=>x.feel[k])); return a!=null&&base[k]!=null&&es.filter(x=>x.feel&&x.feel[k]).length>=2?{k,lab,a,d:a-base[k]}:null; }).filter(x=>x&&Math.abs(x.d)>=0.4).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d)).slice(0,3);
    rows.push({g:l,t,n:es.length,d,top}); } }
  rows.sort((a,b)=>b.n-a.n);
  v.innerHTML=head+`${names.length>1?`<select id="cxs"><option value="">Everything with context</option>${names.map(n=>`<option value="${esc(Store.keyOf(n.name))}" ${Store.keyOf(n.name)===key?'selected':''}>${esc(n.name)}</option>`).join('')}</select>`:''}
   <div class="card list">${rows.length?rows.map(r=>`<div class="it" style="cursor:default;align-items:flex-start"><span class="wh"><b>${esc(r.g)}: ${esc(r.t)} <span class="muted small">· ${r.n} logs</span></b><small class="wrap">${r.d.length?r.d.map(x=>`${x.lab.toLowerCase()} ${f1(x.a)} <span class="${(x.k==='anxiety'?-x.d:x.d)>0?'up':'dn'}">${x.d>0?'▲':'▼'}${f1(Math.abs(x.d))}</span>`).join(' · '):'feelings about the same as usual'}${r.top.length?' · effects: '+r.top.map(([f,c])=>esc(f)+' '+Math.round(c/r.n*100)+'%').join(', '):''}</small></span></div>`).join(''):'<p class="empty">Each tag needs 2+ logs.</p>'}</div>
   <p class="muted small">▲▼ compare to your average after any log with context (1–5 scale). Green = the better direction for that feeling.</p>${cnc}`;
  const s=$('#cxs'); if(s) s.onchange=e=>{ location.hash='#lab/ctx'+(e.target.value?'/'+encodeURIComponent(e.target.value):''); };
};

/* ---------- 5. Rhythm (Pro): per-week frequency + time between ---------- */
LAB.rhythm=(v,key)=>{ const names=Store.names(); if(!names.length){ v.innerHTML=back+'<h2>Rhythm</h2><div class="card empty">Log something first.</div>'; return; }
  key=key||Store.keyOf(names.slice().sort((a,b)=>b.n-a.n)[0].name); const es=subs().filter(x=>Store.keyOf(x.what)===key).sort((a,b)=>a.t-b.t);
  const wk=t=>{ const d=new Date(t); d.setHours(0,0,0,0); d.setDate(d.getDate()-((d.getDay()+6)%7)); return d.getTime(); };
  const W=[]; const w0=wk(Date.now()); for(let i=15;i>=0;i--) W.push({s:w0-i*7*DAY,n:0}); es.forEach(x=>{ const w=W.find(y=>y.s===wk(x.t)); if(w) w.n++; });
  const mx=Math.max(1,...W.map(w=>w.n)), bw=320/16;
  const bars=W.map((w,i)=>`<rect x="${i*bw+3}" y="${120-w.n/mx*100}" width="${bw-6}" height="${w.n/mx*100}" rx="3" fill="${i===15?'#a78bfa':'#5eead4'}" opacity=".85"/>${w.n?`<text x="${i*bw+bw/2}" y="${114-w.n/mx*100}" fill="#8b949e" font-size="9" text-anchor="middle">${w.n}</text>`:''}`).join('')+[0,4,8,12].map(i=>`<text x="${i*bw+2}" y="136" fill="#8b949e" font-size="9">${new Date(W[i].s).toLocaleDateString([], {month:'short',day:'numeric'})}</text>`).join('');
  const days=[...new Set(es.map(x=>Store.dayKey(x.t)))].map(k=>new Date(k+'T12:00').getTime()); const gaps=[]; for(let i=1;i<days.length;i++) gaps.push({t:days[i],g:Math.round((days[i]-days[i-1])/DAY)});
  const since=es.length?Math.max(0,Math.floor((Date.now()-es[es.length-1].t)/DAY)):null; const gm=Math.max(1,...gaps.map(g=>g.g)); const gs=gaps.slice(-40);
  const dots=gs.map((g,i)=>`<circle cx="${10+i*(300/Math.max(1,gs.length-1))}" cy="${110-g.g/gm*95}" r="3.5" fill="#5eead4"/>`).join('');
  const half=W.slice(0,8).reduce((s,w)=>s+w.n,0)/8, half2=W.slice(8).reduce((s,w)=>s+w.n,0)/8;
  v.innerHTML=`${back}<h2>Rhythm</h2>${pickItem('rhs',key)}
   <div class="stat" style="margin-top:10px"><div><b>${f1(half2)}</b><span>per week, last 8 wks</span></div><div><b>${f1(half)}</b><span>per week, 8 wks before</span></div><div><b>${since==null?'–':since+'d'}</b><span>since last log</span></div></div>
   <div class="card"><h3>Logs per week</h3><svg class="chart" viewBox="0 0 320 140">${bars}</svg><p class="muted small" style="margin:4px 0 0">Last 16 weeks, this week in purple. Counts how often, not how much.</p></div>
   <div class="card"><h3>Days between uses</h3>${gaps.length?`<svg class="chart" viewBox="0 0 320 120"><line x1="0" y1="110" x2="320" y2="110" stroke="#30363d"/>${dots}</svg>
     <div class="stat"><div><b>${f1(med(gaps.map(g=>g.g)))}</b><span>usual gap (days)</span></div><div><b>${Math.max(...gaps.map(g=>g.g))}</b><span>longest gap</span></div><div><b>${gaps.filter(g=>g.g===1).length}</b><span>back-to-back days</span></div></div>`:'<p class="muted">Needs logs on 2+ different days.</p>'}
     <p class="muted small" style="margin-bottom:0">Each dot is the gap before a day you logged it, oldest on the left. This isn’t a score or a streak, just the spacing in your logs.</p></div>`;
  $('#rhs').onchange=e=>{ location.hash='#lab/rhythm/'+encodeURIComponent(e.target.value); };
};

/* ---------- 6. Timing & sleep (Pro) ---------- */
function nextSleep(t){ let best=null; for(const x of Store.entries()){ if(x.feel&&x.feel.sleep&&(x.feelAt||x.t)>t&&(x.feelAt||x.t)<=t+30*H){ if(!best||(x.feelAt||x.t)<(best.feelAt||best.t)) best=x; } } return best?best.feel.sleep:null; }
const BK=[['Morning','5–12',h=>h>=5&&h<12],['Afternoon','12–5 pm',h=>h>=12&&h<17],['Evening','5–9 pm',h=>h>=17&&h<21],['Night','9 pm–5',h=>h>=21||h<5]];
LAB.timing=(v,key)=>{ const names=Store.names(); if(!names.length){ v.innerHTML=back+'<h2>Timing & sleep</h2><div class="card empty">Log something first.</div>'; return; }
  key=key||Store.keyOf(names.slice().sort((a,b)=>b.n-a.n)[0].name); const es=subs().filter(x=>Store.keyOf(x.what)===key);
  const pts=es.map(x=>({h:new Date(x.t).getHours()+new Date(x.t).getMinutes()/60,s:nextSleep(x.t)})).filter(p=>p.s);
  const useDays=new Set(es.map(x=>Store.dayKey(x.t))); const other=Store.entries().filter(x=>x.feel&&x.feel.sleep&&!useDays.has(Store.dayKey(x.t))&&!useDays.has(Store.dayKey(x.t-DAY))).map(x=>x.feel.sleep);
  const dots=pts.map(p=>`<circle cx="${20+p.h/24*290}" cy="${110-(p.s-1)/4*95}" r="4" fill="#5eead4" opacity=".7"/>`).join('');
  const rows=BK.map(([n,r,f])=>{ const s=pts.filter(p=>f(Math.floor(p.h))).map(p=>p.s); return {n,r,c:s.length,a:avg(s)}; });
  v.innerHTML=`${back}<h2>Timing & sleep</h2><p class="muted" style="margin-top:-4px">For each time you logged it: the hour, and the next sleep rating you logged within about a day.</p>${pickItem('tms',key)}
   ${pts.length<3?'<div class="card empty">Needs 3+ logs of this followed by a sleep rating. Rate sleep with any log or a “Just how I feel” check-in.</div>':`
   <div class="card"><svg class="chart" viewBox="0 0 320 135"><text x="0" y="18" fill="#8b949e" font-size="9">sleep 5</text><text x="0" y="112" fill="#8b949e" font-size="9">1</text>${[0,6,12,18,24].map(h=>`<text x="${20+h/24*290}" y="130" fill="#8b949e" font-size="9" text-anchor="middle">${h===0||h===24?'12a':h===12?'12p':h<12?h+'a':(h-12)+'p'}</text>`).join('')}<line x1="20" y1="110" x2="310" y2="110" stroke="#30363d"/>${dots}</svg>
   <div class="bars">${rows.map(r=>`<div class="b"><span>${r.n}<br><span class="muted small">${r.r}</span></span><div class="t"><i style="width:${r.a?(r.a/5*100):0}%;background:#5eead4"></i></div><span>${r.c?'sleep '+f1(r.a)+' · '+r.c+' logs':'<span class="muted">no logs</span>'}</span></div>`).join('')}</div>
   <p class="muted small">Sleep on days without it (and not the day after): ${other.length>=3?f1(avg(other))+' avg from '+other.length+' ratings':'not enough ratings yet'}.</p></div>`}
   ${cnc}<p class="muted small">Sleep is affected by lots of things. Talk to a doctor or pharmacist before changing when you take a medicine.</p>`;
  $('#tms').onchange=e=>{ location.hash='#lab/timing/'+encodeURIComponent(e.target.value); };
};

/* ---------- 7. Effect detective (Pro) ---------- */
function targets(){ const fx={}; Store.entries().forEach(x=>(x.fx||[]).forEach(f=>fx[f]=(fx[f]||0)+1));
  const t=Object.entries(fx).sort((a,b)=>b[1]-a[1]).map(([f,n])=>({id:'fx:'+f,label:f,n,test:x=>(x.fx||[]).includes(f)}));
  [['mood','low mood (1–2)',v=>v<=2],['sleep','poor sleep (1–2)',v=>v<=2],['anxiety','high anxiety (4–5)',v=>v>=4],['energy','low energy (1–2)',v=>v<=2],['focus','foggy (1–2)',v=>v<=2]].forEach(([k,l,f])=>{ const test=x=>x.feel&&x.feel[k]&&f(x.feel[k]); const n=Store.entries().filter(test).length; if(n) t.push({id:'f:'+k,label:l,n,test}); });
  return t; }
LAB.detect=(v,id)=>{ const T=targets(); const head=`${back}<h2>Effect detective</h2><p class="muted" style="margin-top:-4px">Pick an effect or feeling. For each time it showed up, Trace looks at what you logged in the 24 hours before, and compares it with all your other logs.</p>`;
  if(!T.length){ v.innerHTML=head+'<div class="card empty">Tap an effect chip or rate how you feel on a few logs first.</div>'; return; }
  const tg=T.find(x=>x.id===id)||T[0]; const all=Store.entries().filter(x=>x.feel||(x.fx&&x.fx.length)); const ev=all.filter(tg.test), rest=all.filter(x=>!tg.test(x));
  const at=x=>x.feelAt||x.t; const before=x=>new Set(subs().filter(y=>y.t<=at(x)&&y.t>=at(x)-24*H).map(y=>Store.keyOf(y.what)));
  const cnt=(arr)=>{ const m={}; arr.forEach(x=>before(x).forEach(k=>m[k]=(m[k]||0)+1)); return m; };
  const ce=cnt(ev), cr=cnt(rest); const nm={}; Store.names().forEach(n=>nm[Store.keyOf(n.name)]=n.name);
  const rows=Object.keys(ce).map(k=>({k,n:nm[k]||k,pe:ce[k]/ev.length,pr:rest.length?(cr[k]||0)/rest.length:0,c:ce[k]})).sort((a,b)=>(b.pe-b.pr)-(a.pe-a.pr)).slice(0,8);
  v.innerHTML=head+`<select id="dts">${T.map(x=>`<option value="${esc(x.id)}" ${x===tg?'selected':''}>${esc(x.label)} (${x.n})</option>`).join('')}</select>
   ${ev.length<3?`<div class="card empty">“${esc(tg.label)}” shows up ${ev.length} time${ev.length===1?'':'s'}. Needs 3+ to compare.</div>`:`<div class="card"><h3>Before “${esc(tg.label)}” (${ev.length} times)</h3>
    <div class="bars">${rows.map(r=>`<div class="b" style="grid-template-columns:84px 1fr 92px"><span class="ell">${esc(r.n)}</span><div><div class="t"><i style="width:${r.pe*100}%;background:#f0883e"></i></div><div class="t" style="margin-top:3px;height:6px"><i style="width:${r.pr*100}%;background:#30363d"></i></div></div><span>${Math.round(r.pe*100)}% <span class="muted">vs ${Math.round(r.pr*100)}%</span></span></div>`).join('')||'<p class="muted">Nothing logged in the 24 h before.</p>'}</div>
    <p class="muted small" style="margin-bottom:0"><span style="color:#f0883e">■</span> share of “${esc(tg.label)}” logs with it in the 24 h before · <span style="color:#8b949e">■</span> same, for all your other logs. A big gap is worth noticing, or worth asking a pharmacist about. It isn’t proof.</p></div>`}${cnc}`;
  $('#dts').onchange=e=>{ location.hash='#lab/detect/'+encodeURIComponent(e.target.value); };
};

/* ---------- 8. Doctor report (Pro) ---------- */
LAB.report=(v,which)=>{ which=which||'30'; const now=new Date(); let s,e,label;
  if(which==='this'){ s=new Date(now.getFullYear(),now.getMonth(),1); e=now; } else if(which==='last'){ s=new Date(now.getFullYear(),now.getMonth()-1,1); e=new Date(now.getFullYear(),now.getMonth(),1); } else { s=new Date(Date.now()-30*DAY); e=now; }
  s=s.getTime(); e=e.getTime(); const span=Math.max(1,(e-s)/DAY), ps=s-(e-s);
  const inR=(x,a,b)=>x.t>=a&&x.t<b; const es=Store.entries().filter(x=>inR(x,s,e)), pes=Store.entries().filter(x=>inR(x,ps,s));
  const items={}; es.filter(x=>x.what).forEach(x=>{ const k=Store.keyOf(x.what); const o=items[k]=items[k]||{name:x.what,n:0,days:new Set(),amts:{}}; o.n++; o.days.add(Store.dayKey(x.t)); const a=amtTxt(x); if(a) o.amts[a]=(o.amts[a]||0)+1; });
  const fxc={}; es.forEach(x=>(x.fx||[]).forEach(f=>fxc[f]=(fxc[f]||0)+1));
  const fa=(arr,k)=>avg(arr.filter(x=>x.feel&&x.feel[k]).map(x=>x.feel[k])); const us=Store.urges().filter(u=>u.end&&u.t>=s&&u.t<e);
  const notes=es.filter(x=>x.notes).slice(0,6); const p=Store.prefs(); const rems=Store.reminders().filter(r=>r.on!==false);
  const rng=`${new Date(s).toLocaleDateString([], {month:'short',day:'numeric'})} – ${new Date(e-1).toLocaleDateString([], {month:'short',day:'numeric',year:'numeric'})}`;
  v.innerHTML=`<div class="noprint">${back}<h2>Doctor report</h2><div class="seg"><a href="#lab/report/30" class="${which==='30'?'on':''}">Last 30 days</a><a href="#lab/report/this" class="${which==='this'?'on':''}">This month</a><a href="#lab/report/last" class="${which==='last'?'on':''}">Last month</a></div>
   <label for="rq">Questions I want to ask (goes on the report)</label><textarea id="rq" maxlength="600" placeholder="e.g. Is the nausea normal? Should I take it with food?">${esc(p.reportQ||'')}</textarea>
   <button class="btn block" id="rpp">Print / Save as PDF</button><p class="muted small center">On iPhone: Print, then share the preview to Files or Messages to keep the PDF.</p></div>
   <div class="report" id="rpt"><h2 style="margin:0">Trace summary</h2><p class="muted" style="margin:0 0 8px">${esc(rng)} · ${window.Cloud&&Cloud.signedIn()?esc(Cloud.acct.user)+' · ':''}made ${new Date().toLocaleDateString()}</p>
    <h3>What I logged</h3>${Object.keys(items).length?`<table class="rt"><tr><th>What</th><th>Times</th><th>Days</th><th>Per week</th><th>As I logged it</th></tr>${Object.values(items).sort((a,b)=>b.n-a.n).map(o=>`<tr><td>${esc(o.name)}</td><td>${o.n}</td><td>${o.days.size}</td><td>${f1(o.n/span*7)}</td><td>${esc(Object.entries(o.amts).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]).join(', ')||'–')}</td></tr>`).join('')}</table>`:'<p class="muted">Nothing logged in this range.</p>'}
    ${rems.length?`<p class="small"><b>Reminders set:</b> ${rems.map(r=>esc(r.what)+' at '+esc(r.time)).join(' · ')}</p>`:''}
    <h3>How I felt (1–5 average)</h3><table class="rt"><tr><th></th>${Store.METRICS.map(m=>`<th>${m[1]}</th>`).join('')}</tr><tr><td>This range</td>${Store.METRICS.map(m=>`<td>${f1(fa(es,m[0]))}</td>`).join('')}</tr><tr><td>Range before</td>${Store.METRICS.map(m=>`<td>${f1(fa(pes,m[0]))}</td>`).join('')}</tr></table>
    <p class="small muted">Anxiety: 5 = most anxious. ${es.filter(x=>x.feel).length} ratings this range.</p>
    <h3>Effects I noted</h3><p class="small">${Object.keys(fxc).length?Object.entries(fxc).sort((a,b)=>b[1]-a[1]).map(([f,n])=>esc(f)+' ×'+n).join(' · '):'None noted.'}</p>
    ${us.length?`<h3>Urges</h3><p class="small">${us.length} logged · average intensity ${f1(avg(us.map(u=>u.i)))}/10 · eased on their own ${us.filter(u=>u.out==='passed').length} times</p>`:''}
    ${notes.length?`<h3>Recent notes</h3>${notes.map(x=>`<p class="small" style="margin:3px 0"><b>${esc(fmtD(x.t))}${x.what?' · '+esc(x.what):''}:</b> ${esc(x.notes)}</p>`).join('')}`:''}
    <div id="rqo">${p.reportQ?`<h3>Questions</h3><p class="small" style="white-space:pre-line">${esc(p.reportQ)}</p>`:''}</div>
    <p class="small muted" style="margin-top:12px">Made with Trace from my own logs. Not a diagnosis. Patterns show correlation, not cause.</p></div>`;
  const rq=$('#rq'); rq.onchange=()=>{ Store.savePrefs({reportQ:rq.value.trim()}); $('#rqo').innerHTML=rq.value.trim()?`<h3>Questions</h3><p class="small" style="white-space:pre-line">${esc(rq.value.trim())}</p>`:''; };
  $('#rpp').onclick=()=>{ rq.onchange(); setTimeout(()=>window.print(),100); };
};
})();
