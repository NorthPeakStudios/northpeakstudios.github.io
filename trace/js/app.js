// Trace · app shell, quick log, calendar, reminders, settings. Northpeak Studios.
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(m){ const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,2600); }
const routes={};
function route(){ const h=(location.hash||'#log').slice(1); const [r,...a]=h.split('/'); const f=routes[r]||routes.log; const v=$('#view'); closeSheet();
  $$('.tabbar a').forEach(x=>{ const k=x.getAttribute('href').slice(1), on=k===r||(x.dataset.also||'').split(' ').includes(r); x.classList.toggle('on',on); on?x.setAttribute('aria-current','page'):x.removeAttribute('aria-current'); });
  const dec=s=>{ try{ return decodeURIComponent(s); }catch(e){ return s; } }; // a stray % in a pasted link used to break the screen
  try{ f(v,...a.map(dec)); }catch(e){ console.warn(e); v.innerHTML='<p class="muted">Something went wrong on this screen.</p>'; } a11y(v); window.scrollTo(0,0); }
/* give every field a name screen readers can read: tie a bare <label> just before it, else use its placeholder (1.2) */
function a11y(root){ if(!root) return; root.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]),select,textarea').forEach(el=>{ if(el.getAttribute('aria-label')||(el.labels&&el.labels.length)) return;
  const l=el.previousElementSibling; if(l&&l.tagName==='LABEL'&&!l.htmlFor){ if(!el.id) el.id='f'+Math.random().toString(36).slice(2,8); l.htmlFor=el.id; } else if(el.placeholder) el.setAttribute('aria-label',el.placeholder); }); }
window.addEventListener('hashchange',route);
function sheet(html,onOpen){ $('#sbody').innerHTML='<div class="grab"></div>'+html; $('#sheet').hidden=false; document.body.style.overflow='hidden'; if(onOpen) onOpen($('#sbody')); a11y($('#sbody')); }
function closeSheet(){ const s=$('#sheet'); if(s&&!s.hidden){ s.hidden=true; document.body.style.overflow=''; } }
document.addEventListener('click',e=>{ if(e.target.closest('[data-close]')) closeSheet(); });
const P=()=>!!(window.Cloud&&Cloud.isPro());
const fmtT=t=>new Date(t).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
const fmtD=t=>new Date(t).toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'});
const localISO=t=>{ const d=new Date(t); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,16); };
function ago(ms){ const m=Math.round(ms/60000); if(m<60) return m+' min'; const h=m/60; return (h<10?h.toFixed(1).replace('.0',''):Math.round(h))+' h'; }
function amtTxt(x){ return [x.amt,x.unit].filter(Boolean).join(' '); }

/* ---------- feelings widget (1–5 sliders, each optional) ---------- */
function feelHTML(f){ f=f||{}; return Store.METRICS.map(([k,l,lo,hi])=>`<div class="sl ${f[k]?'':'unset'}" data-k="${k}"><span>${l}</span><input type="range" min="1" max="5" step="1" value="${f[k]||3}" aria-label="${l}, 1 ${lo} to 5 ${hi}"><b>${f[k]||'–'}</b></div>`).join('')+'<p class="muted small" style="margin:2px 0 0">1–5, leave any untouched to skip it. Anxiety: 5 = most anxious.</p>'; }
function feelWire(root){ root.querySelectorAll('.sl').forEach(s=>{ const i=s.querySelector('input'), b=s.querySelector('b'); const on=()=>{ s.classList.remove('unset'); b.textContent=i.value; }; i.addEventListener('input',on); i.addEventListener('change',on); }); }
function feelRead(root){ const f={}; root.querySelectorAll('.sl').forEach(s=>{ if(!s.classList.contains('unset')) f[s.dataset.k]=+s.querySelector('input').value; }); return Object.keys(f).length?f:null; }
function fxHTML(sel){ sel=sel||[]; const all=[...new Set([...Store.FX,...sel])]; return `<div class="chips fxc">${all.map(c=>`<button type="button" class="chip ${sel.includes(c)?'on':''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}<button type="button" class="chip sub addfx">+ other</button></div>`; }
function fxWire(root){ const box=root.querySelector('.fxc'); box.addEventListener('click',e=>{ const b=e.target.closest('.chip'); if(!b) return; if(b.classList.contains('addfx')){ const v=(prompt('Name the effect')||'').trim().toLowerCase().slice(0,40); if(v){ const n=document.createElement('button'); n.type='button'; n.className='chip on'; n.dataset.c=v; n.textContent=v; box.insertBefore(n,b); } return; } b.classList.toggle('on'); }); }
function fxRead(root){ return [...root.querySelectorAll('.fxc .chip.on')].map(b=>b.dataset.c); }

/* ---------- Log (home) ---------- */
routes.log=v=>{
  const names=Store.names(), today=Store.dayKey(Date.now()), todays=Store.entries().filter(x=>Store.dayKey(x.t)===today);
  const due=dueReminders();
  const rdue=window.TrcRefillDue?TrcRefillDue():[]; const liveUrge=(Store.urges?Store.urges():[]).find(u=>!u.end);
  const new14=!localStorage.getItem('trc.new142');
  v.innerHTML=`${new14?`<div class="card newc" id="n14"><button class="lnk x" id="n14x" aria-label="Dismiss">✕</button><b>New in Trace 1.4.2</b><p class="muted small" style="margin:4px 0 8px"><b>What could happen</b> now uses all of your history, old and imported logs included: how often by month, time of day, breaks, and your notes by date, with an All time / 1 yr / 90 d / 30 d switch. Tap 🔍 up top to search everything and run ${window.TrcCmd?TrcCmd.count():130} commands.</p><a class="btn sm" href="#happen">What could happen</a> <a class="btn ghost sm" href="#commands">Commands</a> <a class="btn ghost sm" href="#export">Export &amp; import</a></div>`:''}${liveUrge?`<a class="card it" href="#urge" style="border-color:#2b4a6b;margin:10px 0"><span class="wh"><b>🌊 Urge timer running</b><small>started ${ago(Date.now()-liveUrge.t)} ago · tap when it passes</small></span><span class="pill acc">open</span></a>`:''}
  ${rdue.map(x=>`<a class="card it" href="#refill" style="border-color:#5c4813;margin:10px 0"><span class="wh"><b>Refill ${esc(x.r.name)} soon</b><small>about ${Math.max(0,Math.floor(x.days))} days left by your count</small></span><span class="pill warn">${Math.round(x.left)} left</span></a>`).join('')}
  ${due.length?`<div class="card" style="border-color:#2b5f58"><h3>Due today</h3>${due.map(r=>`<div class="it" data-rem="${r.id}"><span class="tm">${esc(r.time)}</span><span class="wh"><b>${esc(r.what)}</b><small>${esc(amtTxt(r))}</small></span><button class="btn sm" data-take="${r.id}">Log it</button></div>`).join('')}</div>`:''}
  <div class="card"><h3 style="margin-bottom:2px">Quick log</h3>
   <div class="seg" id="kind"><a href="javascript:void 0" class="on" data-k="sub">Took something</a><a href="javascript:void 0" data-k="chk">How I feel</a><a href="#urge">An urge</a></div>
   <div id="subf"><label for="w">What</label><input id="w" list="wl" autocomplete="off" placeholder="med, supplement, caffeine, anything" maxlength="60">
   <datalist id="wl">${names.map(n=>`<option value="${esc(n.name)}">`).join('')}</datalist>
   ${names.length?`<div class="chips">${names.slice(0,6).map(n=>`<button type="button" class="chip sub" data-q="${esc(n.name)}" data-a="${esc(n.amt||'')}" data-u="${esc(n.unit||'')}">${esc(n.name)}</button>`).join('')}</div>`:''}
   <div class="row"><div><label for="am">Amount</label><input id="am" inputmode="decimal" placeholder="as you'd write it" maxlength="20"></div><div><label for="un">Unit</label><input id="un" placeholder="mg, pill, cup…" maxlength="20"></div></div></div>
   <label for="tt">When</label><input id="tt" type="datetime-local" value="${localISO(Date.now())}">
   <details class="fold" id="ff" style="background:#0f141b"><summary>How do you feel? <span class="muted small" style="font-weight:400">optional, or add later</span></summary>${feelHTML()}<label>Effects you noticed</label>${fxHTML()}</details>
   <details class="fold" id="cxf" style="background:#0f141b"><summary>Context <span class="muted small" style="font-weight:400">optional · where, who, why</span></summary>${TrcCtx.html()}</details>
   <details class="fold" style="background:#0f141b"><summary>Notes</summary><textarea id="nt" maxlength="600" placeholder="anything worth remembering"></textarea></details>
   <button class="btn big block" id="sv">Save</button></div>
  <div class="hrow"><h3>Today</h3><a class="icb" href="#find" aria-label="Search my logs"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>Search</a></div><div class="card list" id="todayL">${todays.length?todays.map(itemHTML).join(''):'<p class="empty">Nothing logged today yet.</p>'}</div>
  <p class="muted small center">Your logs stay on this phone${window.Cloud&&Cloud.signedIn()?' and sync encrypted to your Northpeak account':'. Sign in to sync them, encrypted, across devices'}.</p>`;
  let kind='sub';
  $('#kind').onclick=e=>{ const a=e.target.closest('a'); if(!a||!a.dataset.k) return; e.preventDefault(); kind=a.dataset.k; $$('#kind a').forEach(x=>x.classList.toggle('on',x===a)); $('#subf').hidden=kind==='chk'; if(kind==='chk') $('#ff').open=true; };
  v.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{ $('#w').value=b.dataset.q; if(!$('#am').value) $('#am').value=b.dataset.a; if(!$('#un').value) $('#un').value=b.dataset.u; });
  $('#w').addEventListener('change',()=>{ const n=names.find(x=>Store.keyOf(x.name)===Store.keyOf($('#w').value)); if(n){ if(!$('#am').value) $('#am').value=n.amt||''; if(!$('#un').value) $('#un').value=n.unit||''; } });
  feelWire(v); fxWire(v); TrcCtx.wire(v);
  $('#sv').onclick=()=>{ const what=kind==='chk'?'':$('#w').value.trim(); const feel=feelRead(v), fx=fxRead(v);
    if(kind==='sub'&&!what) return toast('Type what you took'); if(kind==='chk'&&!feel&&!fx.length) return toast('Move a slider or tap an effect');
    const t=new Date($('#tt').value).getTime()||Date.now();
    const ctx=TrcCtx.read($('#cxf')); const ne={t,what,amt:kind==='chk'?'':$('#am').value.trim(),unit:kind==='chk'?'':$('#un').value.trim(),notes:$('#nt').value.trim(),feel,fx,feelAt:(feel||fx.length)?Date.now():null,kind}; if(ctx) ne.ctx=ctx; Store.saveEntry(ne);
    toast(kind==='chk'?'Check-in saved':'Logged ✓'); route(); };
  v.querySelectorAll('[data-take]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const r=Store.reminders().find(x=>x.id===b.dataset.take); if(!r) return; Store.saveEntry({t:Date.now(),what:r.what,amt:r.amt||'',unit:r.unit||'',notes:'',feel:null,fx:[],kind:'sub',rem:r.id}); toast('Logged ✓ — add how you feel later'); route(); });
  const nx=$('#n14x'); if(nx) nx.onclick=()=>{ localStorage.setItem('trc.new142','1'); const c=$('#n14'); if(c) c.remove(); };
  wireItems(v);
};
function itemHTML(x){ const nofeel=!x.feel&&!(x.fx&&x.fx.length);
  return `<div class="it" data-e="${x.id}"><span class="tm">${fmtT(x.t)}</span><span class="wh"><b>${x.what?esc(x.what):'Check-in'}</b><small>${esc(amtTxt(x))}${x.feel?(amtTxt(x)?' · ':'')+Store.METRICS.filter(m=>x.feel[m[0]]).map(m=>m[1].toLowerCase()+' '+x.feel[m[0]]).slice(0,3).join(', '):''}</small></span>${nofeel&&x.what?'<span class="pill acc">+ feel</span>':''}</div>`; }
function wireItems(root){ root.querySelectorAll('[data-e]').forEach(el=>el.onclick=()=>openEntry(el.dataset.e)); }
function openEntry(id){ const x=Store.entry(id); if(!x) return;
  const since=x.feelAt&&x.what?' (logged '+ago(x.feelAt-x.t)+' after)':'';
  sheet(`<h3>${x.what?esc(x.what):'Check-in'}</h3><p class="muted" style="margin-top:-6px">${fmtD(x.t)}, ${fmtT(x.t)}${amtTxt(x)?' · '+esc(amtTxt(x)):''}</p>
   ${x.notes?`<p>${esc(x.notes)}</p>`:''}
   <h3 style="margin-top:14px">How you felt${esc(since)}</h3>${feelHTML(x.feel)}<label>Effects</label>${fxHTML(x.fx||[])}
   <details class="fold" id="ecx"><summary>Context</summary>${TrcCtx.html(x.ctx)}</details><label for="en">Notes</label><textarea id="en" maxlength="600">${esc(x.notes||'')}</textarea>
   <button class="btn block" id="es">Save</button>
   ${x.what?`<button class="btn ghost block" id="ei">What the FDA label says about ${esc(x.what)}</button>`:''}
   <div class="row" style="margin-top:6px"><button class="btn ghost" data-close="1">Close</button><button class="btn danger" id="ed">Delete</button></div>`,root=>{
     feelWire(root); fxWire(root); TrcCtx.wire(root);
     $('#es').onclick=()=>{ const f=feelRead(root), fx=fxRead(root); const had=!!(x.feel||(x.fx&&x.fx.length)); x.feel=f; x.fx=fx; x.notes=$('#en').value.trim(); const cx=TrcCtx.read($('#ecx')); if(cx) x.ctx=cx; else delete x.ctx; if(!had&&(f||fx.length)) x.feelAt=Date.now(); Store.saveEntry(x); closeSheet(); toast('Saved'); route(); };
     $('#ed').onclick=()=>{ if(confirm('Delete this entry?')){ Store.delEntry(x.id); closeSheet(); route(); } };
     const ei=$('#ei'); if(ei) ei.onclick=()=>{ closeSheet(); location.hash='#sub/'+encodeURIComponent(x.what); };
   }); }
window.openEntry=openEntry;

/* ---------- Calendar (heat map, no streaks) ---------- */
let calM=null, calSel=null, calF='';
routes.cal=v=>{
  const now=new Date(); if(!calM) calM=new Date(now.getFullYear(),now.getMonth(),1);
  const names=Store.names(); const es=Store.entries().filter(x=>x.what&&(!calF||Store.keyOf(x.what)===calF));
  const by={}; for(const x of es){ const k=Store.dayKey(x.t); (by[k]=by[k]||[]).push(x); }
  const y=calM.getFullYear(), m=calM.getMonth(), first=(new Date(y,m,1).getDay()), days=new Date(y,m+1,0).getDate();
  const max=Math.max(1,...Object.values(by).map(a=>a.length));
  const col=n=>{ if(!n) return ''; const a=0.18+0.62*Math.min(1,n/max); return `background:rgba(94,234,212,${a.toFixed(2)});border-color:rgba(94,234,212,${(a*0.9).toFixed(2)})`; };
  let cells=['S','M','T','W','T','F','S'].map(d=>`<div class="h">${d}</div>`).join('');
  for(let i=0;i<first;i++) cells+='<div class="d x"></div>';
  const tk=Store.dayKey(Date.now());
  for(let d=1;d<=days;d++){ const k=Store.dayKey(new Date(y,m,d)); const n=(by[k]||[]).length; cells+=`<div class="d ${k===tk?'today':''} ${k===calSel?'sel':''}" data-k="${k}" style="${col(n)}">${d}${n?`<small>${n}</small>`:''}</div>`; }
  const sel=calSel&&Store.entries().filter(x=>Store.dayKey(x.t)===calSel);
  v.innerHTML=`<div class="row" style="align-items:center"><button class="btn ghost sm fx0" id="cp" aria-label="Previous month">‹</button><h2 style="text-align:center;margin:0">${calM.toLocaleDateString([], {month:'long',year:'numeric'})}</h2><button class="btn ghost sm fx0" id="cn" aria-label="Next month">›</button></div>
   <select id="cf" style="margin:10px 0" aria-label="Show on the calendar"><option value="">Everything I logged</option>${names.map(n=>`<option value="${esc(Store.keyOf(n.name))}" ${Store.keyOf(n.name)===calF?'selected':''}>${esc(n.name)}</option>`).join('')}</select>
   <div class="cal">${cells}</div>
   <div class="legend">fewer <i style="background:#11161e;border:1px solid #1d2430"></i><i style="background:rgba(94,234,212,.3)"></i><i style="background:rgba(94,234,212,.55)"></i><i style="background:rgba(94,234,212,.8)"></i> more logs that day</div>
   <div id="cd">${sel?`<h3 style="margin-top:16px">${fmtD(new Date(calSel+'T12:00').getTime())}</h3><div class="card list">${sel.length?sel.map(itemHTML).join(''):'<p class="empty">Nothing logged.</p>'}</div>`:'<p class="muted center" style="margin-top:14px">Tap a day to see what you logged.</p>'}</div>`;
  $('#cp').onclick=()=>{ calM=new Date(y,m-1,1); route(); }; $('#cn').onclick=()=>{ calM=new Date(y,m+1,1); route(); };
  $('#cf').onchange=e=>{ calF=e.target.value; route(); };
  v.querySelectorAll('.d[data-k]').forEach(d=>d.onclick=()=>{ calSel=d.dataset.k; routes.cal(v); const cd=$('#cd'); if(cd) cd.scrollIntoView({behavior:'smooth',block:'nearest'}); });
  wireItems(v);
};

/* ---------- Reminders ---------- */
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function dueReminders(){ const now=new Date(), hm=now.toTimeString().slice(0,5), d=now.getDay(), tk=Store.dayKey(Date.now());
  const logged=new Set(Store.entries().filter(x=>Store.dayKey(x.t)===tk).map(x=>x.rem||('n:'+Store.keyOf(x.what))));
  return Store.reminders().filter(r=>r.on!==false&&(r.days||[0,1,2,3,4,5,6]).includes(d)&&r.time<=hm&&!logged.has(r.id)&&!logged.has('n:'+Store.keyOf(r.what))); }
routes.rem=v=>{
  const rs=Store.reminders();
  v.innerHTML=`<h2>Reminders</h2>
   <div class="note">How reminders work on iPhone: a web app can’t reliably buzz you at a set time while it’s closed. <b>Add to Calendar</b> puts a repeating event with an alert in your Calendar app, which always rings. Trace also shows what’s due when you open it${('Notification' in window)?', and can pop an alert if Trace is open':''}.</div>
   <div class="card list">${rs.length?rs.map(r=>`<div class="it rrow" data-r="${r.id}" style="cursor:default"><span class="tm">${esc(r.time)}</span><span class="wh"><b>${esc(r.what)}</b><small>${esc(amtTxt(r))}${amtTxt(r)?' · ':''}${(r.days&&r.days.length<7)?r.days.map(d=>DOW[d]).join(' '):'every day'}${r.on===false?' · off':''}</small></span><span class="acts"><button class="icb" data-ics="${r.id}" aria-label="Add ${esc(r.what)} to Calendar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>Calendar</button><button class="icb" data-rm="${r.id}" aria-label="Edit ${esc(r.what)}">Edit</button></span></div>`).join(''):'<p class="empty">No reminders yet.</p>'}</div>
   <details class="fold" ${rs.length?'':'open'} id="rf"><summary>Add a reminder</summary>${remForm({})}</details>
   <h3 style="margin-top:18px">Your meds</h3><div class="card list">
    <a class="it" href="#refill"><span class="wh"><b>Refill countdown</b><small>pills left and the day you run out, counted from your logs</small></span>${(window.TrcRefillDue&&TrcRefillDue().length)?'<span class="pill warn">refill soon</span>':''}</a>
    <a class="it" href="#mix"><span class="wh"><b>Interaction check</b><small>what the FDA labels of 2+ things you log say about each other</small></span></a></div>
   ${('Notification' in window)?`<p class="center"><button class="lnk" id="nperm">${Notification.permission==='granted'?'Alerts while Trace is open: on':'Also alert me while Trace is open'}</button></p>`:''}`;
  wireRemForm(v.querySelector('#rf'),{});
  v.querySelectorAll('[data-ics]').forEach(b=>b.onclick=()=>icsFor(Store.reminders().find(r=>r.id===b.dataset.ics)));
  v.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{ const r=Store.reminders().find(x=>x.id===b.dataset.rm); sheet('<h3>Edit reminder</h3>'+remForm(r)+'<button class="btn danger block" id="rdel">Delete reminder</button>',root=>{ wireRemForm(root,r); $('#rdel').onclick=()=>{ Store.delRem(r.id); closeSheet(); route(); }; }); });
  const np=$('#nperm'); if(np) np.onclick=async()=>{ try{ const p=await Notification.requestPermission(); toast(p==='granted'?'Alerts on while Trace is open':'Alerts not allowed'); route(); }catch(e){} };
};
function remForm(r){ const ds=r.days||[0,1,2,3,4,5,6]; return `<label>What</label><input class="rw" value="${esc(r.what||'')}" maxlength="60" placeholder="e.g. my morning med" list="wl2"><datalist id="wl2">${Store.names().map(n=>`<option value="${esc(n.name)}">`).join('')}</datalist>
  <div class="row"><div><label>Amount (optional)</label><input class="ra" value="${esc(r.amt||'')}" maxlength="20"></div><div><label>Unit</label><input class="ru" value="${esc(r.unit||'')}" maxlength="20"></div></div>
  <label>Time</label><input class="rt" type="time" value="${esc(r.time||'08:00')}">
  <label>Days</label><div class="chips rd">${DOW.map((d,i)=>`<button type="button" class="chip ${ds.includes(i)?'on':''}" data-d="${i}">${d}</button>`).join('')}</div>
  <label class="row" style="color:var(--fg);font-size:15px"><span>Reminder on</span><input type="checkbox" class="ro fx0" style="width:auto" ${r.on===false?'':'checked'}></label>
  <button class="btn block rs">${r.id?'Save':'Add reminder'}</button><p class="muted small">Trace just reminds you of what you set. It doesn’t suggest amounts.</p>`; }
function wireRemForm(root,r){ root.querySelector('.rd').onclick=e=>{ const b=e.target.closest('.chip'); if(b) b.classList.toggle('on'); };
  root.querySelector('.rs').onclick=()=>{ const what=root.querySelector('.rw').value.trim(); if(!what) return toast('What is the reminder for?'); const days=[...root.querySelectorAll('.rd .chip.on')].map(b=>+b.dataset.d); if(!days.length) return toast('Pick at least one day');
    Store.saveRem(Object.assign(r||{},{what,amt:root.querySelector('.ra').value.trim(),unit:root.querySelector('.ru').value.trim(),time:root.querySelector('.rt').value||'08:00',days,on:root.querySelector('.ro').checked})); closeSheet(); toast('Reminder saved — tap Add to Calendar so it rings'); route(); }; }
function icsFor(r){ if(!r) return; const [hh,mm]=(r.time||'08:00').split(':'); const d=new Date(); d.setHours(+hh,+mm,0,0); if(d<Date.now()) d.setDate(d.getDate()+1);
  const p=n=>String(n).padStart(2,'0'), loc=x=>x.getFullYear()+p(x.getMonth()+1)+p(x.getDate())+'T'+p(x.getHours())+p(x.getMinutes())+'00';
  const end=new Date(d.getTime()+10*60000), BY=['SU','MO','TU','WE','TH','FR','SA'], days=r.days&&r.days.length<7?';BYDAY='+r.days.map(i=>BY[i]).join(','):'';
  const txt=s=>String(s).replace(/[\\;,]/g,m=>'\\'+m).replace(/\n/g,' ');
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Northpeak Studios//Trace//EN','BEGIN:VEVENT','UID:'+r.id+'@trace.northpeak','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z','DTSTART:'+loc(d),'DTEND:'+loc(end),'RRULE:FREQ='+(days?'WEEKLY'+days:'DAILY'),'SUMMARY:'+txt('Trace: '+r.what+(amtTxt(r)?' ('+amtTxt(r)+')':'')),'DESCRIPTION:'+txt('Reminder from Trace. Open Trace to log it: https://northpeakstudios.github.io/trace/#log'),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+txt(r.what),'TRIGGER:PT0M','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar'})); a.download='trace-'+r.what.replace(/[^a-z0-9]+/gi,'-').toLowerCase().slice(0,30)+'.ics'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); }
let lastAlert=''; setInterval(()=>{ if(document.hidden) return; const d=dueReminders(); const r=d.find(x=>x.time===new Date().toTimeString().slice(0,5)); if(r&&lastAlert!==r.id+r.time){ lastAlert=r.id+r.time; toast('⏰ '+r.what+' is due'); try{ if('Notification' in window&&Notification.permission==='granted') new Notification('Trace',{body:r.what+' is due',icon:'icon-192.png'}); }catch(e){} } },20000);

/* ---------- More ---------- */
routes.more=v=>{ const s=window.Cloud&&Cloud.signedIn();
  v.innerHTML=`<h2>More</h2><div class="card list">
   <a class="it" href="#account"><span class="wh"><b>Account & sync</b><small>${s?esc(Cloud.acct.user):'sign in with your Northpeak account'}</small></span></a>
   <a class="it" href="#pro"><span class="wh"><b>Trace Pro</b><small>${P()?'unlocked':'all of Insights, the doctor report, exports'}</small></span></a>
   <a class="it" href="#happen"><span class="wh"><b>What could happen</b><small>what the FDA label lists + patterns from your own logs · not medical advice${P()?'':' · Pro'}</small></span></a>
   <a class="it" href="#body"><span class="wh"><b>Body data</b><small>weight & height, just stored</small></span></a>
   </div><h3 style="margin-top:16px">For your doctor</h3><div class="card list">
   <a class="it" href="#card"><span class="wh"><b>My meds card</b><small>what you take as you logged it, allergies, emergency contact · print it</small></span></a>
   <a class="it" href="#report"><span class="wh"><b>Doctor report</b><small>one page for a month, print or save as PDF ${P()?'':'· Pro'}</small></span></a>
   <a class="it" href="#export"><span class="wh"><b>Export &amp; import</b><small>PDF, CSV, JSON, Markdown, text, web page, calendar · import is free</small></span></a>
   </div><div class="card list" style="margin-top:16px">
   <a class="it" href="#commands"><span class="wh"><b>Commands — start here</b><small>${window.TrcCmd?TrcCmd.count():''} commands, your own folders and favorites · tap 🔍 at the top</small></span></a>
   <a class="it" href="#help"><span class="wh"><b>Help & support lines</b><small>if something feels wrong</small></span></a>
   <a class="it" href="#about"><span class="wh"><b>About Trace 1.4.2</b><small>privacy, what’s free, what’s new</small></span></a></div>`; };
routes.help=v=>{ v.innerHTML=`<h2>Help</h2><p class="muted">Free, confidential, 24/7 in the US.</p><div class="card list">
   <a class="it" href="tel:18002221222"><span class="wh"><b>Poison Control</b><small>1-800-222-1222 · took too much, wrong thing, a bad reaction</small></span></a>
   <a class="it" href="tel:988"><span class="wh"><b>988 Suicide & Crisis Lifeline</b><small>call or text 988</small></span></a>
   <a class="it" href="tel:18006624357"><span class="wh"><b>SAMHSA Helpline</b><small>1-800-662-4357 · substance use, treatment, support</small></span></a>
   <a class="it" href="tel:911"><span class="wh"><b>Emergency</b><small>911</small></span></a></div>
   <p class="muted small">Trace is a journal, not medical advice. For questions about a medicine, a pharmacist or doctor is the right person.</p>`; };
routes.body=v=>{ const p=Store.prefs(); v.innerHTML=`<h2>Body data</h2><div class="card"><p class="muted" style="margin-top:0">Stored with your logs so you have it in one place. Trace doesn’t plug these into any formula or prediction. Real effects depend on far more than weight and height.</p>
   <div class="row"><div><label>Weight</label><input id="bw" value="${esc(p.weight||'')}" maxlength="12" placeholder="e.g. 130 lb"></div><div><label>Height</label><input id="bh" value="${esc(p.height||'')}" maxlength="12" placeholder="e.g. 5 ft 8"></div></div>
   <button class="btn block" id="bs" style="margin-top:12px">Save</button></div>`; $('#bs').onclick=()=>{ Store.savePrefs({weight:$('#bw').value.trim(),height:$('#bh').value.trim()}); toast('Saved'); }; };
routes.about=v=>{ v.innerHTML=`<h2>Trace 1.4</h2><div class="card"><p style="margin-top:0"><b>A private journal</b> for meds, supplements, caffeine, anything you take, and how you feel.</p>
   <p class="muted"><b>Privacy:</b> your logs live on this phone. If you sign in, each entry is encrypted on this phone with a key made from your password before it syncs, so the server can’t read it. Northpeak never sells or shares it.</p>
   <p class="muted"><b>Free:</b> logging, feelings, the calendar, reminders, FDA label info. <b>Pro ($35, or in $100 All-Access):</b> everything in Insights (effects, What could happen, the web, context, rhythm, timing & sleep, effect detective, what changed), the doctor report, and export. Also free: interaction check, refill countdown, urge timer, my meds card, search, commands, import and the calendar file.</p>
   <p class="muted"><b>Honest limits:</b> patterns come only from your own logs, and they show correlation, not cause. Trace never suggests amounts or a “safe” dose, and doesn’t predict anything from body type.</p></div>
   <details class="fold" open><summary>What’s new in 1.4.2</summary><p class="muted" style="margin-top:0"><b>What could happen</b> looks at all of your history now, so old and imported logs count. It used to need feelings rated on recent logs and said “no clear pattern yet” otherwise. Now each thing you log shows how often by month, lately vs before, time of day, day of the week, breaks, effects you tagged and your notes by date (searchable), each with what it’s based on. Pick All time, 1 yr, 90 d or 30 d. Effect patterns from feelings still need some rated days, and it tells you how many more. Amounts are never used there. Not medical advice, and never dose advice. Pro, as before.</p></details>
   <details class="fold"><summary>1.4.1</summary><p class="muted" style="margin-top:0"><b>What could happen</b> is back under that name (it was “What may happen” in 1.0, then “Forecast”). It shows what the FDA label lists for something you log (side effects, warnings, longer-term use) and patterns from your own logs that may keep happening, with how confident they are. Find it in Insights, in More, on each item’s page, or search “what could happen”. Not medical advice, and never dose advice. Pro, as before.</p></details>
   <details class="fold"><summary>1.4</summary><p class="muted" style="margin-top:0">One search for everything: tap 🔍 at the top to find logs, meds, notes, reminders and ${window.TrcCmd?TrcCmd.count():130} commands in ${window.TrcCmd?TrcCmd.F.length:15} folders. Start with / for commands only, make your own command folders and favorites (see Commands — start here under More). Export as PDF, CSV, JSON, Markdown, text, a web page or a calendar file, and import JSON, CSV, text/Markdown and .ics with a preview first. Plus new looks (accent colors, pure black, text size) and fixes for things cut off on smaller iPhones.</p></details>
   <details class="fold"><summary>1.3</summary><p class="muted" style="margin-top:0">No more Labs. Every tool now sits where you’d look for it: Search and the urge timer on Log, refill countdown and interaction check under Reminders and on each thing’s page, context, rhythm, timing & sleep, effect detective and what changed as tabs in Insights, and the meds card and doctor report under More.</p></details>
   <details class="fold"><summary>1.2</summary><p class="muted" style="margin-top:0">My meds card, Search my logs, What changed. Email changes carry over to Mindprint too.</p></details>
   <details class="fold"><summary>1.1</summary><p class="muted" style="margin-top:0">Interaction check (quotes FDA labels), refill countdown, urge timer, context tags + patterns, rhythm, timing & sleep, effect detective, and a printable doctor report.</p></details>
   <details class="fold"><summary>1.0</summary><p class="muted" style="margin-top:0">First release: quick log with feelings now or later, side-effect chips, month heat map, reminders with Calendar alerts, FDA label lookups, effects over time, What may happen (predictions from your own logs, later called Forecast, now What could happen again), and the web.</p></details>`; };
/* Export & import moved to js/xfer.js in 1.4 (9 export formats, 4 import formats). */
window.addEventListener('trc-data',()=>{ const h=(location.hash||'#log').slice(1).split('/')[0]; if(['log','cal','rem'].includes(h)&&$('#sheet').hidden&&!document.activeElement.matches('input,textarea,select')) route(); });
window.npUpdate={ safe:()=>$('#sheet').hidden&&!document.activeElement.matches('input,textarea'), toast:(m,on)=>{ toast(m); if(on) $('#toast').onclick=on; } };
document.addEventListener('DOMContentLoaded',()=>{ if('serviceWorker' in navigator){} route(); });
