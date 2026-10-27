// Stash · app shell, money helpers, quick add, home, log, recurring entries. Northpeak Studios.
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(m){ const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,2600); }
const routes={};
function route(){ const h=(location.hash||'#home').slice(1); const [r,...a]=h.split('/'); const f=routes[r]||routes.home; const v=$('#view'); closeSheet();
  $$('.tabbar a').forEach(x=>{ const k=x.getAttribute('href').slice(1), on=k===r||(x.dataset.also||'').split(' ').includes(r)||(!routes[r]&&k==='home'); x.classList.toggle('on',on); on?x.setAttribute('aria-current','page'):x.removeAttribute('aria-current'); });
  const dec=s=>{ try{ return decodeURIComponent(s); }catch(e){ return s; } };
  try{ f(v,...a.map(dec)); }catch(e){ console.warn(e); v.innerHTML='<p class="muted">Something went wrong on this screen.</p>'; } a11y(v); window.scrollTo(0,0); }
function a11y(root){ if(!root) return; root.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]),select,textarea').forEach(el=>{ if(el.getAttribute('aria-label')||(el.labels&&el.labels.length)) return;
  const l=el.previousElementSibling; if(l&&l.tagName==='LABEL'&&!l.htmlFor){ if(!el.id) el.id='f'+Math.random().toString(36).slice(2,8); l.htmlFor=el.id; } else if(el.placeholder) el.setAttribute('aria-label',el.placeholder); }); }
window.addEventListener('hashchange',route);
function sheet(html,onOpen){ $('#sbody').innerHTML='<div class="grab"></div>'+html; $('#sheet').hidden=false; document.body.style.overflow='hidden'; if(onOpen) onOpen($('#sbody')); a11y($('#sbody')); }
function closeSheet(){ const s=$('#sheet'); if(s&&!s.hidden){ s.hidden=true; document.body.style.overflow=''; } }
document.addEventListener('click',e=>{ if(e.target.closest('[data-close]')) closeSheet(); });
const P=()=>!!(window.Cloud&&Cloud.isPro());
const DAY=864e5;
/* ---------- money ---------- */
function cur(){ return (Store.prefs().cur)||'$'; }
function money(c,opt){ opt=opt||{}; const n=Math.abs(Math.round(c||0)); const s=(n/100).toLocaleString('en-US',{minimumFractionDigits:(n%100&&!opt.round)?2:0,maximumFractionDigits:opt.round?0:2}); return (c<0?'−':(opt.sign&&c>0?'+':''))+cur()+s; }
function parseMoney(s){ s=String(s==null?'':s).replace(/[^0-9.,\-]/g,'').replace(/,(?=\d{3}\b)/g,'').replace(',','.'); const v=parseFloat(s); return isFinite(v)?Math.round(v*100):NaN; }
const fmtD=t=>new Date(t).toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'});
const fmtDs=t=>new Date(t).toLocaleDateString([], {month:'short',day:'numeric'});
const ymd=t=>Store.dayKey(t);
const fromYmd=s=>{ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||''); return m?new Date(+m[1],+m[2]-1,+m[3],12).getTime():NaN; };
const monName=k=>{ const [y,m]=k.split('-'); return new Date(+y,+m-1,1).toLocaleDateString([], {month:'short'}); };
const monLong=k=>{ const [y,m]=k.split('-'); return new Date(+y,+m-1,1).toLocaleDateString([], {month:'long',year:'numeric'}); };
function addMon(k,d){ const [y,m]=k.split('-').map(Number); const dt=new Date(y,m-1+d,1); return Store.monKey(dt); }
function sod(t){ const d=new Date(t); d.setHours(0,0,0,0); return d.getTime(); }
/* ---------- numbers everything shares ---------- */
const Calc={
  month(k){ let inc=0,out=0; const byCat={}; for(const x of Store.txs()){ if(Store.monKey(x.t)!==k) continue; if(x.k==='in') inc+=x.a; else { out+=x.a; byCat[x.c]=(byCat[x.c]||0)+x.a; } } return {inc,out,net:inc-out,byCat}; },
  totals(){ let inc=0,out=0; for(const x of Store.txs()){ if(x.k==='in') inc+=x.a; else out+=x.a; } return {inc,out}; },
  inGoals(){ return Store.goals().filter(g=>!g.done).reduce((s,g)=>s+(g.saved||0),0); },
  available(){ const t=Calc.totals(); return t.inc-t.out-Calc.inGoals(); },
  /* average earnings per day over the last 90 days (or since the first entry, whichever is shorter) */
  perDay(){ const xs=Store.txs(); if(!xs.length) return 0; const now=Date.now(), first=Math.min(...xs.map(x=>x.t)); const span=Math.max(7,Math.min(90,Math.ceil((now-first)/DAY)+1)); const from=now-span*DAY; let inc=0; for(const x of xs) if(x.k==='in'&&x.t>=from) inc+=x.a; return inc/span; },
  /* what you keep per week (income minus spending), same window */
  netWeek(){ const xs=Store.txs(); if(!xs.length) return 0; const now=Date.now(), first=Math.min(...xs.map(x=>x.t)); const span=Math.max(7,Math.min(90,Math.ceil((now-first)/DAY)+1)); const from=now-span*DAY; let n=0; for(const x of xs) if(x.t>=from) n+=x.k==='in'?x.a:-x.a; return n/span*7; },
  streak(){ const outDays=new Set(Store.txs().filter(x=>x.k==='out').map(x=>ymd(x.t))); const xs=Store.txs(); if(!xs.length) return {cur:0,best:0};
    const first=sod(Math.min(...xs.map(x=>x.t))); let curS=0, best=0, run=0; const today=sod(Date.now());
    for(let d=first; d<=today; d+=DAY){ const k=ymd(d+DAY/2); if(outDays.has(k)) run=0; else { run++; if(run>best) best=run; } }
    for(let d=today; d>=first; d-=DAY){ if(outDays.has(ymd(d+DAY/2))) break; curS++; } return {cur:curS,best}; },
  goalNeed(g){ const left=Math.max(0,(g.target||0)-(g.saved||0)); if(!g.due) return {left,weeks:null,perWeek:null}; const due=fromYmd(g.due); const weeks=Math.max(1,Math.ceil((due-Date.now())/(7*DAY))); return {left,weeks,perWeek:Math.ceil(left/weeks),late:due<Date.now()}; }
};
window.Calc=Calc;
/* ---------- recurring entries: rules make real entries when their day comes ---------- */
function stepDate(t,every){ const d=new Date(t); if(every==='week') d.setDate(d.getDate()+7); else if(every==='2weeks') d.setDate(d.getDate()+14); else if(every==='year') d.setFullYear(d.getFullYear()+1); else { const day=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+1); d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate())); } return d.getTime(); }
const EVERY={week:'every week','2weeks':'every 2 weeks',month:'every month',year:'every year'};
function runRules(){ const now=Date.now(), add=[]; for(const r of Store.rules()){ if(!r.on||!r.next) continue; let n=0, nx=r.next; while(nx<=now&&n<60){ add.push({_p:'t_',k:r.k,a:r.a,c:r.c,n:r.n||'',t:nx,rid:r.id}); nx=stepDate(nx,r.every); n++; } if(n){ r.next=nx; add.push(r); } }
  if(add.length){ Store.bulk(add); const k=add.filter(x=>x.rid).length; if(k) toast(k+' recurring '+(k===1?'entry':'entries')+' added'); } }
/* ---------- add / edit an entry ---------- */
function catChips(k,sel){ return Store.cats(k).map(c=>`<button type="button" class="chip ${c.key===sel?'on':''}" data-c="${esc(c.key)}">${c.ic} ${esc(c.name)}</button>`).join('')+`<button type="button" class="chip sub" data-newcat="1">+ new</button>`; }
function openTx(id,preset){ const x=id?Store.tx(id):null; const o=Object.assign({k:'out',a:0,c:'',n:'',t:Date.now()},preset||{},x||{}); if(!o.c) o.c=o.k==='in'?'allowance':'food';
  const rr=x&&x.rid?Store.rule(x.rid):null;
  sheet(`<h3>${x?'Edit entry':'Add money in or out'}</h3>
   <div class="seg" id="tk"><a href="#" data-k="out" class="${o.k==='out'?'on':''}">− Spent</a><a href="#" data-k="in" class="${o.k==='in'?'on':''}">+ Earned</a></div>
   <div class="amt"><span>${esc(cur())}</span><input id="ta" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${o.a?(o.a/100).toFixed(2).replace(/\.00$/,''):''}" aria-label="Amount"></div>
   <label id="tcl">${o.k==='in'?'Source':'Category'}</label><div class="chips" id="tc">${catChips(o.k,o.c)}</div>
   <label>Note</label><input id="tn" maxlength="120" placeholder="What was it?" value="${esc(o.n)}">
   <div class="row"><div><label>Date</label><input id="td" type="date" value="${ymd(o.t)}"></div><div><label>Repeat</label><select id="tr"><option value="">Doesn’t repeat</option>${Object.entries(EVERY).map(([k,l])=>`<option value="${k}" ${rr&&rr.on&&rr.every===k?'selected':''}>${l}</option>`).join('')}</select></div></div>
   <p class="muted small" id="trn" ${rr?'':'hidden'}>Repeats ${rr?EVERY[rr.every]:''} — the next one is added by itself on ${rr?fmtDs(rr.next):''}.</p>
   <button class="btn big block" id="tsave" style="margin-top:14px">${x?'Save':'Add'}</button>
   ${x?'<button class="btn danger block" id="tdel">Delete entry</button>':''}`,root=>{
    let k=o.k, c=o.c;
    const amt=root.querySelector('#ta'); setTimeout(()=>{ if(!x) amt.focus(); },60);
    root.querySelector('#tk').addEventListener('click',e=>{ const a=e.target.closest('a'); if(!a) return; e.preventDefault(); k=a.dataset.k; root.querySelectorAll('#tk a').forEach(z=>z.classList.toggle('on',z===a)); c=k==='in'?'allowance':'food'; root.querySelector('#tc').innerHTML=catChips(k,c); root.querySelector('#tcl').textContent=k==='in'?'Source':'Category'; });
    root.querySelector('#tc').addEventListener('click',e=>{ const b=e.target.closest('.chip'); if(!b) return; if(b.dataset.newcat){ const nm=(prompt(k==='in'?'Name the source (e.g. Lawn mowing)':'Name the category (e.g. Snacks)')||'').trim(); if(!nm) return; c=Store.addCat(k,nm); root.querySelector('#tc').innerHTML=catChips(k,c); return; } c=b.dataset.c; root.querySelectorAll('#tc .chip').forEach(z=>z.classList.toggle('on',z===b)); });
    root.querySelector('#tsave').onclick=()=>{ const a=parseMoney(amt.value); if(!(a>0)) { amt.focus(); return toast('Type an amount'); } if(a>1e10) return toast('That’s a big number. Check the amount.');
      const d=fromYmd(root.querySelector('#td').value); const keepTime=x?new Date(x.t):new Date(); const tt=isFinite(d)?(()=>{ const z=new Date(d); z.setHours(keepTime.getHours(),keepTime.getMinutes(),0,0); return z.getTime(); })():Date.now();
      const rep=root.querySelector('#tr').value; const rec=Object.assign(x||{},{k,a,c,n:root.querySelector('#tn').value.trim().slice(0,120),t:tt});
      if(rep){ const rule=rr||{on:true}; Object.assign(rule,{k,a,c,n:rec.n,every:rep,on:true}); if(!rr||rr.every!==rep||!rule.next) rule.next=stepDate(tt,rep); Store.save(rule,'r_'); rec.rid=rule.id; }
      else if(rr){ rr.on=false; Store.save(rr,'r_'); }
      Store.save(rec,'t_'); remember(rec); closeSheet(); toast(x?'Saved':(k==='in'?'Nice, '+money(a)+' in 💸':money(a)+' logged')); route(); };
    const del=root.querySelector('#tdel'); if(del) del.onclick=()=>{ if(!confirm('Delete this entry?')) return; Store.del(x.id); closeSheet(); toast('Deleted'); route(); };
    amt.addEventListener('keydown',e=>{ if(e.key==='Enter') root.querySelector('#tsave').click(); });
  }); }
/* quick-add presets: the person's most-used amount+category combos */
function remember(x){ const p=Store.prefs(); const q=(p.quick||[]).filter(z=>!(z.k===x.k&&z.c===x.c&&z.a===x.a)); q.unshift({k:x.k,c:x.c,a:x.a,n:x.n||''}); Store.savePrefs({quick:q.slice(0,12)}); }
function quickList(){ const q=(Store.prefs().quick||[]); const seen=new Set(), out=[]; for(const z of q){ const key=z.k+z.c+z.a; if(seen.has(key)) continue; seen.add(key); out.push(z); if(out.length>=6) break; }
  if(out.length<4){ for(const z of [{k:'out',c:'food',a:800},{k:'in',c:'allowance',a:2000},{k:'out',c:'fun',a:1000},{k:'in',c:'sales',a:3500}]) if(!out.find(y=>y.k===z.k&&y.c===z.c)) out.push(z); }
  return out.slice(0,6); }
function quickAdd(z){ const x=Store.save({k:z.k,a:z.a,c:z.c,n:z.n||'',t:Date.now()},'t_'); remember(x); toast((z.k==='in'?'+':'−')+money(z.a)+' '+Store.catInfo(z.k,z.c).name+' · tap Log to edit'); route(); }
function txRow(x){ const ci=Store.catInfo(x.k,x.c); const pr=x.pid?Store.product(x.pid):null; return `<a class="it" href="#" data-tx="${esc(x.id)}"><span class="cic">${ci.ic}</span><span class="wh"><b>${esc(x.n||(pr?pr.name+(x.q>1?' ×'+x.q:''):ci.name))}</b><small>${esc(ci.name)} · ${fmtDs(x.t)}${x.rid?' · 🔁':''}</small></span><span class="am ${x.k}">${x.k==='in'?'+':'−'}${money(x.a)}</span></a>`; }
document.addEventListener('click',e=>{ const a=e.target.closest('[data-tx]'); if(a){ e.preventDefault(); openTx(a.dataset.tx); return; } const q=e.target.closest('[data-quick]'); if(q){ e.preventDefault(); quickAdd(JSON.parse(q.dataset.quick)); return; } const n=e.target.closest('[data-add]'); if(n){ e.preventDefault(); openTx(null,{k:n.dataset.add}); } });
function ring(pct,size,col){ pct=Math.max(0,Math.min(1,pct||0)); const r=(size-8)/2, c=2*Math.PI*r; return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="#1f2733" stroke-width="7" fill="none"/><circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="${col||'var(--acc)'}" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="${(c*pct).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size/2} ${size/2})"/></svg>`; }
/* ---------- Home ---------- */
routes.home=v=>{
  const mk=Store.monKey(Date.now()), m=Calc.month(mk), st=Calc.streak(), goals=Store.goals().filter(g=>!g.done).slice(0,3), xs=Store.txs();
  const subsDue=P()&&window.StsSubs?StsSubs.upcoming(7):[];
  v.innerHTML=`<div class="hero card${Store.prefs().hide?' hid':''}" id="hero"><div class="muted small">${esc(monLong(mk))}</div><div class="big ${m.net<0?'neg':''}">${money(m.net,{sign:true})}</div><div class="muted small">kept this month</div>
     <div class="stat3"><div><small>Earned</small><b class="in">${money(m.inc)}</b></div><div><small>Spent</small><b class="out">${money(m.out)}</b></div><div><small>Free to spend</small><b>${money(Calc.available())}</b></div></div></div>
   <div class="qa"><a href="#" data-add="in" class="qin">＋ Earned</a><a href="#" data-add="out" class="qout">− Spent</a><a href="#afford">🤔 Can I afford…</a></div>
   <div class="muted small" style="margin:2px 2px 4px">Quick add · one tap</div><div class="chips">${quickList().map(z=>`<button type="button" class="chip qk ${z.k}" data-quick='${esc(JSON.stringify(z))}'>${Store.catInfo(z.k,z.c).ic} ${z.k==='in'?'+':'−'}${money(z.a)}</button>`).join('')}</div>
   ${xs.length?`<a class="card it streak" href="#insights"><span class="cic">🔥</span><span class="wh"><b>${st.cur} day${st.cur===1?'':'s'} no-spend streak</b><small>best ${st.best} · days with nothing spent</small></span><span class="pill acc">Insights</span></a>`:''}
   ${subsDue.length?`<a class="card it" href="#subs" style="border-color:#5c4813"><span class="cic">🔁</span><span class="wh"><b>${subsDue.length} renewal${subsDue.length>1?'s':''} this week</b><small>${subsDue.map(s=>esc(s.name)+' '+money(s.a)).join(' · ')}</small></span><span class="pill warn">soon</span></a>`:''}
   <div class="hrow"><h3>Goals</h3><a class="icb" href="#goals">All goals ›</a></div>
   ${goals.length?`<div class="gmini">${goals.map(g=>{ const pc=g.target?(g.saved||0)/g.target:0; return `<a href="#goal/${esc(g.id)}" class="gm">${ring(pc,64,g.col)}<span class="ge">${esc(g.emoji||'🎯')}</span><b>${esc(g.name)}</b><small>${Math.round(pc*100)}% · ${money(g.target,{round:true})}</small></a>`; }).join('')}</div>`:`<a class="card it" href="#goals"><span class="cic">🎯</span><span class="wh"><b>Set your first savings goal</b><small>See how much to put away each week</small></span></a>`}
   <div class="hrow"><h3>Recent</h3><a class="icb" href="#log">Log ›</a></div>
   <div class="card list">${xs.length?xs.slice(0,6).map(txRow).join(''):'<p class="muted" style="margin:4px">Nothing yet. Tap <b>＋ Earned</b> or <b>− Spent</b>, or a quick-add chip.</p>'}</div>
   ${xs.length?'':'<p class="center"><button class="lnk" id="demo">Try it with sample data</button></p>'}`;
  $('#hero').addEventListener('click',e=>e.currentTarget.classList.toggle('hid'));
  const d=$('#demo'); if(d) d.onclick=()=>{ sampleData(); toast('Sample data added — wipe it in More › Data'); route(); };
};
/* ---------- Log ---------- */
routes.log=(v,mk,flt)=>{
  mk=/^\d{4}-\d{2}$/.test(mk||'')?mk:Store.monKey(Date.now()); flt=flt||'all';
  const all=Store.txs().filter(x=>Store.monKey(x.t)===mk&&(flt==='all'||x.k===flt)); const m=Calc.month(mk);
  const days={}; for(const x of all){ (days[ymd(x.t)]=days[ymd(x.t)]||[]).push(x); }
  v.innerHTML=`<div class="mnav"><a href="#log/${addMon(mk,-1)}/${flt}" aria-label="Previous month">‹</a><b>${esc(monLong(mk))}</b><a href="#log/${addMon(mk,1)}/${flt}" aria-label="Next month">›</a></div>
   <div class="stat3"><div><small>Earned</small><b class="in">${money(m.inc)}</b></div><div><small>Spent</small><b class="out">${money(m.out)}</b></div><div><small>Kept</small><b>${money(m.net,{sign:true})}</b></div></div>
   <div class="seg">${[['all','All'],['in','Earned'],['out','Spent']].map(([k,l])=>`<a href="#log/${mk}/${k}" class="${k===flt?'on':''}">${l}</a>`).join('')}</div>
   <div class="qa"><a href="#" data-add="in" class="qin">＋ Earned</a><a href="#" data-add="out" class="qout">− Spent</a><a href="#recur">🔁 Recurring</a></div>
   ${Object.keys(days).length?Object.entries(days).map(([d,list])=>`<div class="dh">${fmtD(fromYmd(d))}<span>${money(list.reduce((s,x)=>s+(x.k==='in'?x.a:-x.a),0),{sign:true})}</span></div><div class="card list">${list.map(txRow).join('')}</div>`).join(''):'<div class="card"><p class="muted" style="margin:0">Nothing logged in '+esc(monLong(mk))+'.</p></div>'}`;
};
/* ---------- Recurring ---------- */
routes.recur=v=>{ const rs=Store.rules();
  v.innerHTML=`<p><a href="#log">‹ Log</a></p><h2>Recurring</h2><p class="muted">Allowance every Friday, a weekly job, rent for a server… Each one adds itself to your log on its day.</p>
   <div class="card list">${rs.length?rs.map(r=>{ const ci=Store.catInfo(r.k,r.c); return `<div class="it"><span class="cic">${ci.ic}</span><span class="wh"><b>${esc(r.n||ci.name)} · <span class="${r.k}">${r.k==='in'?'+':'−'}${money(r.a)}</span></b><small>${r.on?EVERY[r.every]+' · next '+fmtDs(r.next):'paused'}</small></span><button class="btn ghost sm" data-rt="${esc(r.id)}">${r.on?'Pause':'Resume'}</button><button class="btn ghost sm" data-rd="${esc(r.id)}" aria-label="Delete">✕</button></div>`; }).join(''):'<p class="muted" style="margin:4px">No recurring entries yet.</p>'}</div>
   <button class="btn block" id="radd">＋ New recurring entry</button><p class="muted small">Tip: any entry can repeat — open it and pick “Repeat”.</p>`;
  $('#radd').onclick=()=>openTx(null,{k:'in',c:'allowance'});
  v.addEventListener('click',e=>{ const t=e.target.closest('[data-rt]'), d=e.target.closest('[data-rd]'); if(t){ const r=Store.rule(t.dataset.rt); r.on=!r.on; if(r.on&&r.next<Date.now()) r.next=stepDate(sod(Date.now())+12*3600e3,r.every); Store.save(r,'r_'); route(); } if(d&&confirm('Delete this recurring entry? Entries it already added stay.')){ Store.del(d.dataset.rd); route(); } });
};
/* ---------- sample data (so a new person can see every screen working) ---------- */
function sampleData(){ const now=Date.now(), L=[]; const add=(k,a,c,n,daysAgo,extra)=>L.push(Object.assign({_p:'t_',k,a,c,n,t:now-daysAgo*DAY-3600e3,demo:1},extra||{}));
  const ps=[{_p:'p_',name:'Synapse Pro',price:3500,emoji:'🧠',demo:1},{_p:'p_',name:'Axon Pro',price:3500,emoji:'📝',demo:1},{_p:'p_',name:'Mindprint Pro',price:1000,emoji:'🧬',demo:1}]; ps.forEach(p=>p.id=Store.uid('p_')); L.push(...ps);
  for(let w=0;w<10;w++) add('in',2000,'allowance','Allowance',w*7+1);
  [[3,0],[9,1],[15,0],[22,2],[30,0],[37,1],[44,2],[52,0],[60,0],[68,1],[75,2],[83,0]].forEach(([d,i])=>add('in',ps[i].price,'sales',ps[i].name+' sale',d,{pid:ps[i].id,q:1}));
  add('in',5000,'gift','Birthday money from grandma',40); add('in',3000,'job','Mowed the Hendersons’ lawn',12);
  [[2,650,'food','Boba'],[5,1299,'fun','Game skin'],[8,900,'food','Lunch with friends'],[11,2500,'shopping','Hoodie (on sale)'],[19,1000,'tech','Domain renewal'],[26,450,'food','Snacks'],[33,1500,'business','App icon assets'],[47,3200,'shopping','Shoes'],[58,700,'food','Pizza slice'],[71,1999,'tech','Keyboard caps']].forEach(([d,a,c,n])=>add('out',a,c,n,d));
  Store.bulk(L);
  if(!Store.goals().length) Store.save({name:'New laptop',emoji:'💻',target:90000,saved:21000,due:ymd(now+120*DAY),col:'#5eead4',adds:[{t:now-5*DAY,a:21000}],demo:1},'g_');
}
window.addEventListener('sts-data',()=>{ /* keep counts fresh on screens that show them */ });
function boot(){ runRules(); if(window.StsSubs) StsSubs.roll(); route(); }
document.addEventListener('visibilitychange',()=>{ if(!document.hidden){ runRules(); if(window.StsSubs&&StsSubs.roll()) route(); } });
window.addEventListener('DOMContentLoaded',boot);
