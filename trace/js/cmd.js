// Trace · Search + commands (1.4, 1.4.1). One search for logs, meds, notes, reminders and commands; 132 commands in folders,
// your own command folders and favorites (synced with your settings). Modeled on Axon's command bar. Northpeak Studios.
// Trace is a journal, not medical advice: no command suggests amounts, timing or doses.
(function(){
const DAY=864e5;
const go=h=>{ if(location.hash===h) route(); else location.hash=h; };
const later=(f,ms)=>setTimeout(f,ms||120);
const subsE=()=>Store.entries().filter(x=>x.what);
const lastSub=()=>subsE()[0];
const lastAny=()=>Store.entries()[0];
const need=(x,msg)=>{ if(!x){ toast(msg||'Log something first'); return false; } return true; };
const topName=(days)=>{ const m={}; subsE().filter(x=>!days||x.t>=Date.now()-days*DAY).forEach(x=>{ const k=Store.keyOf(x.what); m[k]=m[k]||{name:x.what.trim(),n:0,x}; m[k].n++; }); return Object.values(m).sort((a,b)=>b.n-a.n)[0]; };
const amt=x=>[x.amt,x.unit].filter(Boolean).join(' ');
const focus=(sel,ms)=>later(()=>{ const el=document.querySelector(sel); if(el){ el.focus(); if(el.scrollIntoView) el.scrollIntoView({block:'center'}); } },ms||250);
const copy=async(txt,what)=>{ try{ await navigator.clipboard.writeText(txt); toast((what||'Copied')+' ✓'); }catch(e){ sheet(`<h3>${esc(what||'Copy')}</h3><p class="muted small">Copy it from here:</p><textarea style="min-height:180px" readonly>${esc(txt)}</textarea><button class="btn ghost block" data-close="1">Done</button>`); } };
const listSheet=(title,rows,empty)=>{ sheet(`<h3>${esc(title)}</h3>${rows.length?`<div class="list">${rows.join('')}</div>`:`<p class="empty">${esc(empty||'Nothing here yet.')}</p>`}<button class="btn ghost block" data-close="1" style="margin-top:10px">Close</button>`,root=>{ root.querySelectorAll('[data-e]').forEach(el=>el.onclick=()=>{ closeSheet(); openEntry(el.dataset.e); }); root.querySelectorAll('[data-go]').forEach(el=>el.onclick=()=>{ closeSheet(); go(el.dataset.go); }); }); };
const eRow=x=>`<div class="it" data-e="${x.id}" role="button" tabindex="0"><span class="tm">${esc(new Date(x.t).toLocaleDateString([], {month:'short',day:'numeric'}))}<br>${esc(fmtT(x.t))}</span><span class="wh"><b>${x.what?esc(x.what):'Check-in'}</b><small class="wrap">${esc([amt(x),(x.fx||[]).join(', '),x.notes].filter(Boolean).join(' · ').slice(0,120))}</small></span></div>`;
const pr=()=>window.Cloud&&Cloud.isPro();
const printSoon=()=>later(()=>window.print(),700);
const nameMap=()=>{ const m={}; subsE().forEach(x=>{ const k=Store.keyOf(x.what); m[k]=m[k]||{name:x.what.trim(),n:0,days:new Set(),first:x.t,last:x.t,ids:[]}; const o=m[k]; o.n++; o.days.add(Store.dayKey(x.t)); o.first=Math.min(o.first,x.t); o.last=Math.max(o.last,x.t); o.ids.push(x.id); }); return m; };
function renameSheet(merge){ const ns=Object.values(nameMap()).sort((a,b)=>b.n-a.n); if(ns.length<(merge?2:1)) return toast(merge?'Log at least two different things first':'Log something first');
  const opt=(sel)=>ns.map((o,i)=>`<option value="${esc(Store.keyOf(o.name))}" ${i===sel?'selected':''}>${esc(o.name)} (${o.n})</option>`).join('');
  sheet(merge?`<h3>Merge two names</h3><p class="muted small" style="margin-top:-6px">Every log of the first becomes the second. Handy for typos like “cofee”.</p><label>Change every</label><select id="ma">${opt(1)}</select><label>into</label><select id="mb">${opt(0)}</select><button class="btn block" id="mgo">Merge</button><button class="btn ghost block" data-close="1">Cancel</button>`
   :`<h3>Rename something</h3><p class="muted small" style="margin-top:-6px">Changes the name on every log, reminder and refill count.</p><label>Rename</label><select id="ma">${opt(0)}</select><label>to</label><input id="mb" maxlength="60" placeholder="new name"><button class="btn block" id="mgo">Rename</button><button class="btn ghost block" data-close="1">Cancel</button>`,root=>{
    root.querySelector('#mgo').onclick=()=>{ const a=root.querySelector('#ma').value; const bEl=root.querySelector('#mb'); let to=merge?(ns.find(o=>Store.keyOf(o.name)===bEl.value)||{}).name:bEl.value.trim().slice(0,60); if(!to) return toast('Type the new name'); if(Store.keyOf(to)===a&&merge) return toast('Pick two different names');
      const ch=[]; Store.entries().forEach(x=>{ if(x.what&&Store.keyOf(x.what)===a){ x.what=to; ch.push(x); } }); Store.reminders().forEach(r=>{ if(Store.keyOf(r.what)===a){ r.what=to; ch.push(Object.assign(r,{_kind:'r'})); } }); Store.bulk(ch);
      const p=Store.prefs(); if(p.refill&&p.refill[a]&&!p.refill[Store.keyOf(to)]){ const rf=Object.assign({},p.refill); rf[Store.keyOf(to)]=Object.assign({},rf[a],{key:Store.keyOf(to),name:to}); delete rf[a]; Store.savePrefs({refill:rf}); }
      closeSheet(); toast((merge?'Merged':'Renamed')+' '+ch.length+' ✓'); route(); }; }); }
/* ---------- view settings (this phone only) ---------- */
const VK='trc.view'; const view=()=>{ try{ return JSON.parse(localStorage.getItem(VK)||'{}')||{}; }catch(e){ return {}; } };
const ACC={teal:['#5eead4','#04201c','#123b36'],purple:['#a78bfa','#1a0f33','#2a1f45'],blue:['#60a5fa','#06172e','#132a4a'],pink:['#f472b6','#2e0a1c','#45132e'],amber:['#fbbf24','#2a1a02','#3a2c0a'],green:['#4ade80','#05230f','#123b20']};
function applyView(){ const v=view(), r=document.documentElement; const a=ACC[v.acc]||ACC.teal; r.style.setProperty('--acc',a[0]); r.style.setProperty('--accink',a[1]); r.style.setProperty('--accbg',a[2]);
  r.classList.toggle('v-oled',!!v.oled); r.classList.toggle('v-motion',!!v.motion); r.classList.toggle('v-priv',!!v.priv); r.classList.toggle('v-compact',!!v.compact); r.style.setProperty('--zoom',String(v.zoom||1));
  r.classList.toggle('v-zoom',!!v.zoom&&v.zoom!==1); const m=document.querySelector('meta[name=theme-color]'); if(m) m.content=v.oled?'#000000':'#0d1117'; }
function setView(p,msg){ const v=Object.assign(view(),p); localStorage.setItem(VK,JSON.stringify(v)); applyView(); if(msg) toast(msg); }
applyView();
const tog=(k,on,off)=>()=>{ const v=view(); setView({[k]:!v[k]},!v[k]?on:off); };
/* ---------- the commands ---------- */
const F=['Navigation','Log','Meds','Reminders','Insights','Calendar','Search','Export','Import','Doctor report','View & theme','Data','Account','Help','Commands'];
const C=[];
const c=(id,folder,name,run,o)=>C.push(Object.assign({id,folder,name,run},o||{}));
// Navigation
c('go-log','Navigation','Go to Log',()=>go('#log'),{k:'home today quick'});
c('go-cal','Navigation','Go to Calendar',()=>go('#cal'),{k:'month heat map'});
c('go-rem','Navigation','Go to Reminders',()=>go('#rem'),{k:'alarms'});
c('go-fx','Navigation','Go to Insights',()=>go('#fx'),{k:'patterns charts'});
c('go-more','Navigation','Go to More',()=>go('#more'),{k:'settings menu'});
c('go-body','Navigation','Body data',()=>go('#body'),{k:'weight height'});
c('go-xfer','Navigation','Export & import',()=>go('#export'),{k:'files backup download upload'});
c('go-back','Navigation','Go back',()=>history.back(),{k:'previous'});
c('go-top','Navigation','Scroll to top',()=>window.scrollTo({top:0,behavior:'smooth'}),{k:'up'});
c('go-bottom','Navigation','Scroll to bottom',()=>window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'}),{k:'down end'});
// Log
c('log-new','Log','Log something',()=>{ go('#log'); focus('#w'); },{k:'add new took take entry'});
c('log-check','Log','Check in: how I feel',()=>{ go('#log'); later(()=>{ const a=document.querySelector('#kind a[data-k=chk]'); if(a) a.click(); const f=document.querySelector('#ff'); if(f) f.scrollIntoView({block:'center'}); },250); },{k:'mood feeling check-in'});
c('log-urge','Log','Start the urge timer',()=>go('#urge'),{k:'craving wave'});
c('log-repeat','Log','Copy my last log to now',()=>{ const x=lastSub(); if(!need(x)) return; Store.saveEntry({t:Date.now(),what:x.what,amt:x.amt||'',unit:x.unit||'',notes:'',feel:null,fx:[],kind:'sub'}); toast('Logged '+x.what+' ✓'); if((location.hash||'#log')==='#log') route(); },{k:'again repeat same duplicate'});
c('log-usual','Log','Log my most-logged thing',()=>{ const t=topName(30)||topName(); if(!need(t)) return; const x=t.x; Store.saveEntry({t:Date.now(),what:x.what.trim(),amt:x.amt||'',unit:x.unit||'',notes:'',feel:null,fx:[],kind:'sub'}); toast('Logged '+x.what.trim()+' ✓'); if((location.hash||'#log')==='#log') route(); },{k:'usual favorite common'});
c('log-feel','Log','Add how I feel to my last log',()=>{ const x=lastSub(); if(need(x)) openEntry(x.id); },{k:'feelings mood effects later'});
c('log-edit','Log','Edit my last log',()=>{ const x=lastAny(); if(need(x)) openEntry(x.id); },{k:'change fix'});
c('log-note','Log','Add a note to my last log',()=>{ const x=lastAny(); if(!need(x)) return; const n=(prompt('Note for '+(x.what||'your check-in'))||'').trim(); if(!n) return; x.notes=(x.notes?x.notes+' · ':'')+n.slice(0,300); x.notes=x.notes.slice(0,600); Store.saveEntry(x); toast('Note added ✓'); },{k:'comment write'});
c('log-delete','Log','Delete my last log',()=>{ const x=lastAny(); if(!need(x)) return; if(confirm('Delete '+(x.what||'check-in')+' from '+fmtD(x.t)+', '+fmtT(x.t)+'?')){ Store.delEntry(x.id); toast('Deleted'); } },{k:'remove undo mistake'});
c('log-yesterday','Log','Log something for yesterday',()=>{ go('#log'); later(()=>{ const t=document.querySelector('#tt'); if(t){ const d=new Date(Date.now()-DAY); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); t.value=d.toISOString().slice(0,16); } const w=document.querySelector('#w'); if(w) w.focus(); },250); },{k:'past earlier forgot'});
c('log-due','Log','Log everything due now',()=>{ const d=typeof dueReminders==='function'?dueReminders():[]; if(!d.length) return toast('Nothing due right now'); Store.bulk(d.map(r=>({t:Date.now(),what:r.what,amt:r.amt||'',unit:r.unit||'',notes:'',feel:null,fx:[],kind:'sub',rem:r.id,_kind:'e'}))); toast('Logged '+d.length+' ✓'); },{k:'reminders all due'});
c('log-today','Log',"Show today's logs",()=>{ const tk=Store.dayKey(Date.now()); listSheet('Today',Store.entries().filter(x=>Store.dayKey(x.t)===tk).map(eRow),'Nothing logged today yet.'); },{k:'list'});
c('log-recent','Log','Show my last 10 logs',()=>listSheet('Last 10 logs',Store.entries().slice(0,10).map(eRow)),{k:'recent history'});
c('log-clear','Log','Clear the quick log form',()=>{ go('#log'); if(location.hash==='#log'||!location.hash) route(); toast('Cleared'); },{k:'reset empty'});
// Meds
c('med-list','Meds','Everything I log',()=>{ const ns=Object.values(nameMap()).sort((a,b)=>b.last-a.last); listSheet('Everything you log',ns.map(o=>`<div class="it" data-go="#sub/${esc(encodeURIComponent(o.name))}" role="button" tabindex="0"><span class="wh"><b>${esc(o.name)}</b><small>${o.n}× · last ${esc(fmtD(o.last))}</small></span><span class="pill">open</span></div>`)); },{k:'meds list supplements items names'});
c('med-top','Meds','Open my most-logged thing',()=>{ const t=topName(); if(need(t)) go('#sub/'+encodeURIComponent(t.name)); },{k:'top page'});
c('med-last','Meds','Open the last thing I logged',()=>{ const x=lastSub(); if(need(x)) go('#sub/'+encodeURIComponent(x.what.trim())); },{k:'page item'});
c('med-fda','Meds','FDA label for the last thing I logged',()=>{ const x=lastSub(); if(need(x)) go('#sub/'+encodeURIComponent(x.what.trim())); },{k:'label warnings info'});
c('med-happen','Meds','Last thing I logged — what could happen',()=>{ const x=lastSub(); if(need(x)) go('#happen/'+encodeURIComponent(Store.keyOf(x.what))); },{pro:1,k:'what may happen forecast side effects fda label long-term'});
c('med-mix','Meds','Interaction check',()=>go('#mix'),{k:'interactions together label'});
c('med-mix-last','Meds','Interaction check with my last thing',()=>{ const x=lastSub(); if(need(x)) go('#mix/'+encodeURIComponent(Store.keyOf(x.what))); },{k:'interactions'});
c('med-refill','Meds','Refill countdown',()=>go('#refill'),{k:'pills left run out pharmacy'});
c('med-refill-add','Meds','Track a refill',()=>{ go('#refill'); later(()=>{ const d=document.querySelector('#rff'); if(d){ d.open=true; d.scrollIntoView({block:'center'}); } },250); },{k:'count pills new'});
c('med-card','Meds','My meds card',()=>go('#card'),{k:'list allergies emergency'});
c('med-rename','Meds','Rename something I log',()=>renameSheet(false),{k:'name change typo'});
c('med-merge','Meds','Merge two names into one',()=>renameSheet(true),{k:'combine typo duplicate'});
c('med-count','Meds','How often I logged each (30 days)',()=>{ const m={}; subsE().filter(x=>x.t>=Date.now()-30*DAY).forEach(x=>{ const k=Store.keyOf(x.what); m[k]=m[k]||{name:x.what.trim(),n:0,d:new Set()}; m[k].n++; m[k].d.add(Store.dayKey(x.t)); });
  const rows=Object.values(m).sort((a,b)=>b.n-a.n); sheet(`<h3>Last 30 days</h3>${rows.length?`<div class="tw"><table class="rt"><tr><th>What</th><th>Times</th><th>Days</th></tr>${rows.map(o=>`<tr><td>${esc(o.name)}</td><td>${o.n}</td><td>${o.d.size}</td></tr>`).join('')}</table></div>`:'<p class="empty">Nothing in the last 30 days.</p>'}<p class="muted small">Counts only. Not advice about how often to take anything.</p><button class="btn ghost block" data-close="1">Close</button>`); },{k:'frequency counts times'});
c('med-firstlast','Meds','First and last time I logged each',()=>{ const rows=Object.values(nameMap()).sort((a,b)=>b.last-a.last); sheet(`<h3>First and last</h3>${rows.length?`<div class="tw"><table class="rt"><tr><th>What</th><th>First</th><th>Last</th></tr>${rows.map(o=>`<tr><td>${esc(o.name)}</td><td>${esc(new Date(o.first).toLocaleDateString())}</td><td>${esc(new Date(o.last).toLocaleDateString())}</td></tr>`).join('')}</table></div>`:'<p class="empty">Nothing logged yet.</p>'}<button class="btn ghost block" data-close="1">Close</button>`); },{k:'started history when'});
// Reminders
c('rem-add','Reminders','Add a reminder',()=>{ go('#rem'); later(()=>{ const d=document.querySelector('#rf'); if(d){ d.open=true; } const w=document.querySelector('#rf .rw'); if(w){ w.focus(); w.scrollIntoView({block:'center'}); } },250); },{k:'new alarm'});
c('rem-add-last','Reminders','Add a reminder for the last thing I logged',()=>{ const x=lastSub(); if(!need(x)) return; go('#rem'); later(()=>{ const d=document.querySelector('#rf'); if(d) d.open=true; const w=document.querySelector('#rf .rw'); if(w){ w.value=x.what.trim(); w.scrollIntoView({block:'center'}); } const t=document.querySelector('#rf .rt'); if(t) t.focus(); },250); },{k:'alarm'});
c('rem-off','Reminders','Turn all reminders off',()=>{ const rs=Store.reminders().filter(r=>r.on!==false); if(!rs.length) return toast('They’re already off'); Store.bulk(rs.map(r=>Object.assign(r,{on:false,_kind:'r'}))); toast(rs.length+' reminder'+(rs.length===1?'':'s')+' off'); },{k:'pause disable mute'});
c('rem-on','Reminders','Turn all reminders on',()=>{ const rs=Store.reminders().filter(r=>r.on===false); if(!rs.length) return toast('They’re already on'); Store.bulk(rs.map(r=>Object.assign(r,{on:true,_kind:'r'}))); toast(rs.length+' reminder'+(rs.length===1?'':'s')+' on'); },{k:'enable resume'});
c('rem-ics','Reminders','Add all reminders to Calendar',()=>TrcX.doExport('ics'),{k:'ics calendar alarm iphone ring'});
c('rem-due','Reminders',"What's due now",()=>{ const d=typeof dueReminders==='function'?dueReminders():[]; listSheet('Due now',d.map(r=>`<div class="it"><span class="tm">${esc(r.time)}</span><span class="wh"><b>${esc(r.what)}</b><small>${esc(amt(r))}</small></span></div>`),'Nothing due right now.'); },{k:'pending'});
c('rem-next','Reminders',"When's my next reminder?",()=>{ const rs=Store.reminders().filter(r=>r.on!==false); if(!rs.length) return toast('No reminders on'); const now=new Date(); let best=null;
  for(let dd=0;dd<8&&!best;dd++){ const day=new Date(now.getFullYear(),now.getMonth(),now.getDate()+dd); for(const r of rs.slice().sort((a,b)=>a.time.localeCompare(b.time))){ if(!(r.days||[0,1,2,3,4,5,6]).includes(day.getDay())) continue; const [h,m]=r.time.split(':'); const t=new Date(day); t.setHours(+h,+m,0,0); if(t>now){ best={r,t}; break; } } }
  toast(best?'Next: '+best.r.what+' · '+(best.t.toDateString()===now.toDateString()?'today':fmtD(best.t.getTime()))+' at '+fmtT(best.t.getTime()):'No upcoming reminders'); },{k:'upcoming soon'});
c('rem-alerts','Reminders','Alert me while Trace is open',async()=>{ if(!('Notification' in window)) return toast('This browser can’t show alerts. Use Add to Calendar.'); try{ const p=await Notification.requestPermission(); toast(p==='granted'?'Alerts on while Trace is open':'Alerts not allowed'); }catch(e){} },{k:'notifications'});
c('rem-clean','Reminders','Delete reminders that are off',()=>{ const rs=Store.reminders().filter(r=>r.on===false); if(!rs.length) return toast('No reminders are off'); if(confirm('Delete '+rs.length+' reminder'+(rs.length===1?'':'s')+' that '+(rs.length===1?'is':'are')+' off?')){ Store.bulkDel(rs.map(r=>r.id)); toast('Deleted '+rs.length); } },{k:'remove cleanup'});
c('rem-list','Reminders','List all reminders',()=>{ const D=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; listSheet('Reminders',Store.reminders().map(r=>`<div class="it" data-go="#rem" role="button" tabindex="0"><span class="tm">${esc(r.time)}</span><span class="wh"><b>${esc(r.what)}</b><small>${esc(amt(r))}${amt(r)?' · ':''}${(r.days&&r.days.length<7)?r.days.map(d=>D[d]).join(' '):'every day'}${r.on===false?' · off':''}</small></span></div>`),'No reminders yet.'); },{k:'all'});
// Insights
c('in-fx','Insights','Effects over time',()=>go('#fx'),{pro:1,k:'feelings chart'});
c('in-forecast','Insights','What could happen',()=>go('#happen'),{pro:1,k:'what may happen forecast predict patterns history all time how often time of day breaks notes side effects fda label long-term warnings'});
c('in-web','Insights','The web',()=>go('#web'),{pro:1,k:'graph connections'});
c('in-ctx','Insights','Context patterns',()=>go('#ctx'),{pro:1,k:'where who why'});
c('in-rhythm','Insights','Rhythm',()=>go('#rhythm'),{pro:1,k:'weekly frequency gaps'});
c('in-timing','Insights','Timing & sleep',()=>go('#timing'),{pro:1,k:'time of day sleep'});
c('in-detect','Insights','Effect detective',()=>go('#detect'),{pro:1,k:'cause before effect'});
c('in-week','Insights','What changed this week',()=>go('#week'),{pro:1,k:'compare last week'});
c('in-week7','Insights','What changed: last 7 days',()=>go('#week/7'),{pro:1,k:'compare'});
c('in-today','Insights','Today in numbers',()=>{ const tk=Store.dayKey(Date.now()); const es=Store.entries().filter(x=>Store.dayKey(x.t)===tk); const moods=es.filter(x=>x.feel&&x.feel.mood).map(x=>x.feel.mood);
  toast(es.length?es.filter(x=>x.what).length+' logged · '+es.filter(x=>!x.what).length+' check-ins'+(moods.length?' · mood avg '+(moods.reduce((a,b)=>a+b,0)/moods.length).toFixed(1):''):'Nothing logged today yet'); },{k:'summary stats'});
c('in-month','Insights','This month in numbers',()=>{ const n=new Date(); const s=new Date(n.getFullYear(),n.getMonth(),1).getTime(); const es=Store.entries().filter(x=>x.t>=s); const days=new Set(es.map(x=>Store.dayKey(x.t))).size;
  const m={}; es.filter(x=>x.what).forEach(x=>{ const k=x.what.trim(); m[k]=(m[k]||0)+1; }); const fx={}; es.forEach(x=>(x.fx||[]).forEach(f=>fx[f]=(fx[f]||0)+1));
  sheet(`<h3>${esc(n.toLocaleDateString([], {month:'long'}))} so far</h3><div class="stat"><div><b>${es.length}</b><span>entries</span></div><div><b>${days}</b><span>days with a log</span></div></div><h3 style="margin-top:12px">Most logged</h3><p>${Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>esc(k)+' ×'+v).join(' · ')||'–'}</p><h3>Effects noted</h3><p>${Object.entries(fx).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>esc(k)+' ×'+v).join(' · ')||'–'}</p><button class="btn ghost block" data-close="1">Close</button>`); },{k:'summary stats month'});
c('in-effects','Insights','My most-noted effects',()=>{ const fx={}; Store.entries().forEach(x=>(x.fx||[]).forEach(f=>fx[f]=(fx[f]||0)+1)); listSheet('Effects you noted',Object.entries(fx).sort((a,b)=>b[1]-a[1]).map(([f,n])=>`<div class="it" data-go="#find/${esc(encodeURIComponent(f))}" role="button" tabindex="0"><span class="wh"><b>${esc(f)}</b><small>noted ${n}×</small></span><span class="pill">find</span></div>`),'No effects noted yet.'); },{k:'side effects symptoms'});
// Calendar
c('cal-month','Calendar','Calendar: this month',()=>{ const n=new Date(); calM=new Date(n.getFullYear(),n.getMonth(),1); go('#cal'); },{k:'month'});
c('cal-prev','Calendar','Calendar: previous month',()=>{ const n=new Date(); const b=calM||new Date(n.getFullYear(),n.getMonth(),1); calM=new Date(b.getFullYear(),b.getMonth()-1,1); go('#cal'); },{k:'back earlier'});
c('cal-next','Calendar','Calendar: next month',()=>{ const n=new Date(); const b=calM||new Date(n.getFullYear(),n.getMonth(),1); calM=new Date(b.getFullYear(),b.getMonth()+1,1); go('#cal'); },{k:'forward'});
c('cal-today','Calendar','Calendar: jump to today',()=>{ const n=new Date(); calM=new Date(n.getFullYear(),n.getMonth(),1); calSel=Store.dayKey(Date.now()); go('#cal'); },{k:'now'});
c('cal-filter','Calendar','Calendar: only the last thing I logged',()=>{ const x=lastSub(); if(!need(x)) return; calF=Store.keyOf(x.what); go('#cal'); },{k:'filter'});
c('cal-all','Calendar','Calendar: show everything',()=>{ calF=''; go('#cal'); },{k:'clear filter all'});
// Search
c('s-all','Search','Search everything',()=>later(()=>openPal(''),50),{k:'find global'});
c('s-logs','Search','Search my logs',()=>go('#find'),{k:'find notes'});
c('s-last','Search','Search logs for the last thing I logged',()=>{ const x=lastSub(); if(need(x)) go('#find/'+encodeURIComponent(x.what.trim())); },{k:'find'});
c('s-effect','Search','Find days with my most-noted effect',()=>{ const fx={}; Store.entries().forEach(x=>(x.fx||[]).forEach(f=>fx[f]=(fx[f]||0)+1)); const t=Object.entries(fx).sort((a,b)=>b[1]-a[1])[0]; if(!t) return toast('No effects noted yet'); go('#find/'+encodeURIComponent(t[0])); },{k:'headache symptom'});
c('s-notes','Search','Show every note I wrote',()=>listSheet('Your notes',Store.entries().filter(x=>x.notes).slice(0,80).map(eRow),'No notes yet.'),{k:'notes comments'});
// Export
c('x-json','Export','Export a full backup (.json)',()=>TrcX.doExport('json'),{pro:1,k:'backup save download'});
c('x-csv','Export','Export logs as a spreadsheet (.csv)',()=>TrcX.doExport('csv'),{pro:1,k:'excel sheets numbers download'});
c('x-meds','Export','Export a meds summary (.csv)',()=>TrcX.doExport('meds'),{pro:1,k:'spreadsheet'});
c('x-rems','Export','Export reminders (.csv)',()=>TrcX.doExport('rems'),{pro:1,k:'spreadsheet'});
c('x-pdf','Export','Export a PDF',()=>TrcX.doExport('pdf'),{pro:1,k:'print document file'});
c('x-md','Export','Export as Markdown (.md)',()=>TrcX.doExport('md'),{pro:1,k:'notes obsidian notion axon'});
c('x-txt','Export','Export as plain text (.txt)',()=>TrcX.doExport('txt'),{pro:1,k:'text'});
c('x-html','Export','Export as a web page (.html)',()=>TrcX.doExport('html'),{pro:1,k:'browser'});
c('x-ics','Export','Export reminders to Calendar (.ics)',()=>TrcX.doExport('ics'),{k:'calendar'});
c('x-copy-today','Export',"Copy today's logs",()=>{ const tk=Store.dayKey(Date.now()); const es=Store.entries().filter(x=>Store.dayKey(x.t)===tk).reverse(); if(!es.length) return toast('Nothing logged today yet'); copy(es.map(x=>fmtT(x.t)+' · '+(x.what||'Check-in')+(amt(x)?' · '+amt(x):'')+(x.notes?' · '+x.notes:'')).join('\n'),"Today's logs copied"); },{k:'clipboard share text'});
c('x-copy-meds','Export','Copy my meds list',()=>{ const ns=Object.values(nameMap()).sort((a,b)=>b.last-a.last); if(!ns.length) return toast('Log something first'); copy(ns.map(o=>o.name).join('\n'),'Meds list copied'); },{k:'clipboard'});
// Import
c('i-any','Import','Import a file',()=>TrcX.pickFile(),{k:'upload open restore'});
c('i-json','Import','Import a Trace backup (.json)',()=>TrcX.pickFile('.json,application/json'),{k:'restore'});
c('i-csv','Import','Import a spreadsheet (.csv)',()=>TrcX.pickFile('.csv,.tsv,text/csv'),{k:'excel sheets'});
c('i-txt','Import','Import text or Markdown (.txt / .md)',()=>TrcX.pickFile('.txt,.md,.markdown,.text,text/plain,text/markdown'),{k:'notes'});
c('i-ics','Import','Import calendar reminders (.ics)',()=>TrcX.pickFile('.ics,text/calendar'),{k:'calendar'});
c('i-paste','Import','Paste text to import',()=>TrcX.pasteImport(),{k:'clipboard lines'});
c('i-page','Import','Open import',()=>go('#import'),{k:'files'});
// Doctor report
c('d-30','Doctor report','Doctor report: last 30 days',()=>go('#report/30'),{pro:1,k:'summary'});
c('d-this','Doctor report','Doctor report: this month',()=>go('#report/this'),{pro:1});
c('d-last','Doctor report','Doctor report: last month',()=>go('#report/last'),{pro:1});
c('d-print','Doctor report','Print the doctor report',()=>{ go('#report/30'); if(pr()) printSoon(); },{pro:1,k:'pdf save'});
c('d-q','Doctor report','Write questions for my doctor',()=>{ go('#report/30'); if(pr()) focus('#rq'); },{pro:1,k:'questions appointment'});
c('d-card-print','Doctor report','Print my meds card',()=>{ go('#card'); printSoon(); },{k:'pdf save'});
c('d-card-copy','Doctor report','Copy my meds card as text',()=>{ const p=Store.prefs(), cd=p.card||{}; const ns=Object.values(nameMap()).filter(o=>o.last>=Date.now()-30*DAY||Store.reminders().some(r=>r.on!==false&&Store.keyOf(r.what)===Store.keyOf(o.name))).filter(o=>!(cd.hide||[]).includes(Store.keyOf(o.name)));
  copy(['My meds & supplements (from my Trace log)',...ns.map(o=>'- '+o.name),cd.allergies?'Allergies: '+cd.allergies:'',cd.contact?'Emergency contact: '+cd.contact:'',cd.notes?'Notes: '+cd.notes:''].filter(Boolean).join('\n'),'Meds card copied'); },{k:'clipboard share'});
// View & theme
c('v-teal','View & theme','Accent color: teal',()=>setView({acc:'teal'},'Teal ✓'),{k:'theme color default'});
c('v-purple','View & theme','Accent color: purple',()=>setView({acc:'purple'},'Purple ✓'),{k:'theme color'});
c('v-blue','View & theme','Accent color: blue',()=>setView({acc:'blue'},'Blue ✓'),{k:'theme color'});
c('v-pink','View & theme','Accent color: pink',()=>setView({acc:'pink'},'Pink ✓'),{k:'theme color'});
c('v-amber','View & theme','Accent color: amber',()=>setView({acc:'amber'},'Amber ✓'),{k:'theme color yellow orange'});
c('v-green','View & theme','Accent color: green',()=>setView({acc:'green'},'Green ✓'),{k:'theme color'});
c('v-oled','View & theme','Pure black background (on/off)',tog('oled','Pure black on','Pure black off'),{k:'oled dark theme'});
c('v-bigger','View & theme','Bigger text',()=>{ const z=Math.min(1.3,Math.round(((view().zoom||1)+0.1)*10)/10); setView({zoom:z},'Text '+Math.round(z*100)+'%'); },{k:'larger font size zoom'});
c('v-smaller','View & theme','Smaller text',()=>{ const z=Math.max(0.9,Math.round(((view().zoom||1)-0.1)*10)/10); setView({zoom:z},'Text '+Math.round(z*100)+'%'); },{k:'font size zoom'});
c('v-normal','View & theme','Normal text size',()=>setView({zoom:1},'Text 100%'),{k:'font reset'});
c('v-motion','View & theme','Reduce motion (on/off)',tog('motion','Less motion on','Less motion off'),{k:'animation'});
c('v-priv','View & theme','Privacy blur on lists (on/off)',tog('priv','Lists blurred · touch to peek','Privacy blur off'),{k:'hide private screen share'});
c('v-compact','View & theme','Compact lists (on/off)',tog('compact','Compact lists on','Compact lists off'),{k:'dense'});
c('v-reset','View & theme','Reset the look',()=>{ localStorage.removeItem(VK); applyView(); toast('Back to the default look'); },{k:'default theme'});
// Data
c('dt-sync','Data','Sync now',()=>{ if(!(window.Cloud&&Cloud.signedIn())) return toast('Sign in to sync'); TrcSync&&TrcSync(); toast('Syncing…'); },{k:'cloud upload'});
c('dt-space','Data','How much space Trace uses',()=>{ const b=Store.bytes(); toast('About '+(b>1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB')+' on this phone'); },{k:'storage size'});
c('dt-count','Data','Count everything I logged',()=>{ const es=Store.entries(); toast(es.filter(x=>x.what).length+' logs · '+es.filter(x=>!x.what).length+' check-ins · '+Store.reminders().length+' reminders · '+new Set(es.map(x=>Store.dayKey(x.t))).size+' days'); },{k:'total stats'});
c('dt-dupes','Data','Remove exact duplicate logs',()=>{ const seen=new Set(), dup=[]; Store.entries().slice().reverse().forEach(x=>{ const k=Math.floor(x.t/60000)+'|'+Store.keyOf(x.what)+'|'+Store.keyOf(x.amt)+'|'+Store.keyOf(x.notes); if(seen.has(k)) dup.push(x.id); else seen.add(k); }); if(!dup.length) return toast('No duplicates found'); if(confirm('Remove '+dup.length+' duplicate log'+(dup.length===1?'':'s')+' (same thing, same minute)?')){ Store.bulkDel(dup); toast('Removed '+dup.length); } },{k:'dedupe clean'});
c('dt-tidy','Data','Tidy names (extra spaces)',()=>{ const ch=[]; Store.entries().forEach(x=>{ if(x.what){ const t=x.what.replace(/\s+/g,' ').trim(); if(t!==x.what){ x.what=t; ch.push(x); } } }); if(!ch.length) return toast('Names are already tidy'); Store.bulk(ch); toast('Tidied '+ch.length); },{k:'clean fix'});
c('dt-wipe','Data','Delete everything on this phone',()=>{ const n=Store.entries().length+Store.reminders().length+Store.urges().length; if(!n) return toast('Nothing to delete'); const s=window.Cloud&&Cloud.signedIn(); const t=prompt('This deletes '+n+' records'+(s?' here AND from your synced account':'')+'. Export a backup first if you want one. Type DELETE to go ahead.'); if(t!=='DELETE') return toast('Nothing deleted'); Store.bulkDel([...Store.entries(),...Store.reminders(),...Store.urges()].map(x=>x.id)); toast('Deleted'); go('#log'); },{k:'erase reset clear all'});
// Account
c('a-sign','Account','Sign in or create an account',()=>go('#account'),{k:'login signup sync'});
c('a-code','Account','Redeem a code',()=>{ go('#account'); later(()=>{ const d=[...document.querySelectorAll('#view details.fold')].find(x=>/redeem/i.test(x.textContent)); if(d){ d.open=true; const i=d.querySelector('input'); if(i) i.focus(); } else toast('Sign in first, then redeem'); },400); },{k:'promo bot owner all-access'});
c('a-email','Account','Change my email',()=>{ go('#account'); later(()=>{ const d=[...document.querySelectorAll('#view details.fold')].find(x=>/change email/i.test(x.textContent)); if(d){ d.open=true; const i=d.querySelector('input'); if(i) i.focus(); } else toast('Sign in first'); },400); },{k:'account'});
c('a-pro','Account','Get Trace Pro',()=>go('#pro'),{k:'upgrade buy unlock'});
c('a-plan','Account','What plan am I on?',()=>{ const C2=window.Cloud; toast(!C2||!C2.signedIn()?'Free plan, not signed in':C2.acct.owner?'Owner, everything unlocked':C2.isPro()?(C2.acct.allAccess?'Northpeak All-Access':'Trace Pro'):'Free plan'); },{k:'status pro'});
c('a-logout','Account','Log out',async()=>{ if(!(window.Cloud&&Cloud.signedIn())) return toast('You’re not signed in'); if(!confirm('Log out? Your logs stay on this phone.')) return; await Cloud.logout(); toast('Logged out'); go('#more'); },{k:'sign out'});
// Help
c('h-new','Help',"What's new in 1.4",()=>go('#about'),{k:'changelog update version about'});
c('h-lines','Help','Help & support lines',()=>go('#help'),{k:'support crisis'});
c('h-poison','Help','Call Poison Control',()=>{ location.href='tel:18002221222'; },{k:'overdose emergency wrong'});
c('h-988','Help','Call or text 988',()=>{ location.href='tel:988'; },{k:'crisis suicide'});
c('h-privacy','Help','How my data stays private',()=>sheet(`<h3>Your data</h3><p>Your logs live on this phone. If you sign in, each entry is encrypted on this phone with a key made from your password before it syncs, so the server can’t read it. Exports and imports happen on this phone too. Northpeak never sells or shares it.</p><button class="btn ghost block" data-close="1">Got it</button>`),{k:'privacy encryption'});
c('h-advice','Help','Trace is not medical advice',()=>sheet(`<h3>A journal, not a doctor</h3><p>Trace keeps a record of what you log and shows patterns from your own logs (correlation, not cause). It never suggests amounts, timing or a “safe” dose. For questions about a medicine, ask a pharmacist or doctor.</p><button class="btn ghost block" data-close="1">Got it</button>`),{k:'disclaimer'});
// Commands
c('c-guide','Commands','Commands — start here',()=>go('#commands'),{k:'help guide list all'});
c('c-folder','Commands','Make a command folder',()=>folderSheet(null),{k:'new group custom'});
c('c-favs','Commands','Show my favorite commands',()=>later(()=>openPal(''),50),{k:'starred'});
c('c-recent','Commands','Clear recent commands',()=>{ localStorage.removeItem('trc.cmdrecent'); toast('Recent commands cleared'); },{k:'history'});
window.TrcCmd={C,F,run,openPal,count:()=>C.length};

/* ---------- running a command ---------- */
function rec(id){ let r=[]; try{ r=JSON.parse(localStorage.getItem('trc.cmdrecent')||'[]'); }catch(e){} r=[id,...r.filter(x=>x!==id)].slice(0,6); localStorage.setItem('trc.cmdrecent',JSON.stringify(r)); }
function run(id){ const x=C.find(y=>y.id===id); if(!x) return; closePal(); if(id!=='c-recent') rec(id); if(x.pro&&!pr()) { toast(x.name+' is part of Trace Pro'); } try{ x.run(); }catch(e){ console.warn(e); toast('That command didn’t work here'); } }
const P2=()=>Store.prefs(); const favs=()=>Array.isArray(P2().cmdfav)?P2().cmdfav:[]; const folders=()=>Array.isArray(P2().cmdf)?P2().cmdf:[];
function toggleFav(id){ const f=favs(); const on=!f.includes(id); Store.savePrefs({cmdfav:on?[...f,id].slice(-40):f.filter(x=>x!==id)}); toast(on?'Added to favorites ⭐':'Removed from favorites'); }

/* ---------- user folders ---------- */
function folderSheet(fid){ const fs=folders(); const f=fid?fs.find(x=>x.id===fid):null; const sel=new Set(f?f.ids:[]);
  sheet(`<h3>${f?'Edit folder':'New command folder'}</h3><label for="fnm">Folder name</label><input id="fnm" maxlength="30" value="${esc(f?f.name:'')}" placeholder="e.g. morning, doctor visit">
   <p class="muted small">Pick the commands to put in it. Then type the folder’s name in search to open it.</p>
   <input id="fsq" type="search" placeholder="filter commands" autocomplete="off"><div class="fpick" id="fpk">${F.map(fo=>`<div class="fgrp" data-f="${esc(fo)}"><p class="muted small" style="margin:10px 0 2px">${esc(fo)}</p>${C.filter(x=>x.folder===fo).map(x=>`<label class="fck" data-n="${esc((x.name+' '+(x.k||'')).toLowerCase())}"><input type="checkbox" value="${x.id}" ${sel.has(x.id)?'checked':''}><span>${esc(x.name)}</span></label>`).join('')}</div>`).join('')}</div>
   <button class="btn block" id="fsv">Save folder</button>${f?'<button class="btn danger block" id="fdl">Delete folder</button>':''}<button class="btn ghost block" data-close="1">Cancel</button>`,root=>{
    root.querySelector('#fsq').oninput=e=>{ const q=e.target.value.toLowerCase().trim(); root.querySelectorAll('.fck').forEach(l=>l.hidden=q&&!l.dataset.n.includes(q)); };
    root.querySelector('#fsv').onclick=()=>{ const name=root.querySelector('#fnm').value.trim(); if(!name) return toast('Name the folder'); const ids=[...root.querySelectorAll('.fck input:checked')].map(i=>i.value); if(!ids.length) return toast('Pick at least one command');
      const list=folders().filter(x=>!f||x.id!==f.id); list.push({id:f?f.id:'f'+Date.now().toString(36),name,ids}); Store.savePrefs({cmdf:list.slice(-30)}); closeSheet(); toast('Folder “'+name+'” saved'); if(/^#commands/.test(location.hash)) route(); };
    const dl=root.querySelector('#fdl'); if(dl) dl.onclick=()=>{ if(!confirm('Delete the folder “'+f.name+'”? The commands stay.')) return; Store.savePrefs({cmdf:folders().filter(x=>x.id!==f.id)}); closeSheet(); toast('Folder deleted'); if(/^#commands/.test(location.hash)) route(); };
   }); }

/* ---------- the search + command palette ---------- */
let pal=null, sel=0, items=[], mode='';
function build(){ if(pal) return pal; pal=document.createElement('div'); pal.id='pal'; pal.className='pal'; pal.hidden=true; pal.setAttribute('role','dialog'); pal.setAttribute('aria-modal','true'); pal.setAttribute('aria-label','Search and commands');
  pal.innerHTML=`<div class="palbar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg><input id="palq" type="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" placeholder="Search, or / for commands" aria-label="Search logs, meds, notes, reminders and commands"><button class="lnk" id="palx">Cancel</button></div><div class="palres" id="palr" role="listbox"></div>`;
  document.body.appendChild(pal);
  const q=pal.querySelector('#palq'); q.addEventListener('input',()=>{ mode=''; sel=0; draw(); });
  q.addEventListener('keydown',e=>{ if(e.key==='ArrowDown'){ e.preventDefault(); sel=Math.min(items.length-1,sel+1); mark(); } else if(e.key==='ArrowUp'){ e.preventDefault(); sel=Math.max(0,sel-1); mark(); } else if(e.key==='Enter'){ e.preventDefault(); const it=items[sel]; if(it) act(it); } else if(e.key==='Escape'){ closePal(); } });
  pal.querySelector('#palx').onclick=closePal;
  pal.querySelector('#palr').addEventListener('click',e=>{ const st=e.target.closest('[data-star]'); if(st){ e.stopPropagation(); toggleFav(st.dataset.star); draw(); return; } const r=e.target.closest('[data-i]'); if(r) act(items[+r.dataset.i]); });
  return pal; }
function openPal(q0){ build(); closeSheet(); pal.hidden=false; document.body.classList.add('palopen'); const q=pal.querySelector('#palq'); q.value=q0||''; mode=''; sel=0; draw(); setTimeout(()=>q.focus(),30); }
function closePal(){ if(pal&&!pal.hidden){ pal.hidden=true; document.body.classList.remove('palopen'); } }
window.addEventListener('hashchange',closePal);
const norm=s=>String(s||'').toLowerCase();
function scoreCmd(x,words,raw){ const n=norm(x.name), hay=n+' '+norm(x.k)+' '+norm(x.folder); if(!words.every(w=>hay.includes(w))) return 0; let s=1; if(n.startsWith(raw)) s+=6; if(n.split(/[\s:—-]+/).some(t=>t.startsWith(words[0]))) s+=3; if(n.includes(raw)) s+=2; if(favs().includes(x.id)) s+=1; return s; }
function act(it){ if(!it) return; if(it.t==='cmd') return run(it.id); if(it.t==='folder'){ mode=it.id; sel=0; draw(); return; } closePal(); if(it.t==='entry') return openEntry(it.id); if(it.t==='go') return go(it.h); }
const pill=x=>x.pro&&!pr()?'<span class="pill">Pro</span>':'';
function cmdRow(x){ const i=items.push({t:'cmd',id:x.id})-1; return `<div class="pr" data-i="${i}" role="option"><span class="pic">›</span><span class="wh"><b class="wrap">${esc(x.name)}</b><small>${esc(x.folder)}</small></span>${pill(x)}<button class="star ${favs().includes(x.id)?'on':''}" data-star="${x.id}" aria-label="${favs().includes(x.id)?'Unfavorite':'Favorite'} ${esc(x.name)}">${favs().includes(x.id)?'★':'☆'}</button></div>`; }
function folderRow(id,name,n,user){ const i=items.push({t:'folder',id})-1; return `<div class="pr" data-i="${i}" role="option"><span class="pic">${user?'📁':'🗂'}</span><span class="wh"><b class="wrap">${esc(name)}</b><small>${n} command${n===1?'':'s'}${user?' · your folder':''}</small></span><span class="pic">›</span></div>`; }
function goRow(h,title,sub,ic){ const i=items.push({t:'go',h})-1; return `<div class="pr" data-i="${i}" role="option"><span class="pic">${ic||'›'}</span><span class="wh"><b class="wrap">${title}</b><small class="wrap">${sub||''}</small></span></div>`; }
function entRow(x,hl){ const i=items.push({t:'entry',id:x.id})-1; return `<div class="pr" data-i="${i}" role="option"><span class="tm">${esc(new Date(x.t).toLocaleDateString([], {month:'short',day:'numeric'}))}</span><span class="wh"><b class="wrap">${hl(x.what||'Check-in')}</b><small class="wrap">${hl([[x.amt,x.unit].filter(Boolean).join(' '),(x.fx||[]).join(', '),x.notes].filter(Boolean).join(' · ').slice(0,110))}</small></span></div>`; }
const grp=(title,html)=>html?`<p class="pgh">${title}</p><div class="pgrp">${html}</div>`:'';
function draw(){ const box=pal.querySelector('#palr'); items=[]; const raw0=pal.querySelector('#palq').value; let raw=norm(raw0).trim(); let cmdOnly=false; if(raw.startsWith('/')||raw.startsWith('>')){ cmdOnly=true; raw=raw.slice(1).trim(); }
  const words=raw.split(/\s+/).filter(Boolean); let html='';
  if(mode){ const uf=folders().find(f=>f.id===mode); const ids=uf?uf.ids:C.filter(x=>x.folder===mode).map(x=>x.id); const name=uf?uf.name:mode; const i0=items.push({t:'folder',id:''})-1;
    html=`<div class="pr" data-i="${i0}"><span class="pic">‹</span><span class="wh"><b>All results</b></span></div>`+grp(esc(name),ids.map(id=>C.find(x=>x.id===id)).filter(Boolean).map(cmdRow).join(''))+(uf?goRow('#commands','Edit this folder','in Commands — start here','✎'):'');
    box.innerHTML=html; mark(); return; }
  if(!words.length){ let rc=[]; try{ rc=JSON.parse(localStorage.getItem('trc.cmdrecent')||'[]'); }catch(e){}
    html+=goRow('#commands','<b>Commands — start here</b>',C.length+' commands in '+F.length+' folders · type / to see only commands','📖');
    html+=grp('Favorites',favs().map(id=>C.find(x=>x.id===id)).filter(Boolean).map(cmdRow).join(''));
    html+=grp('Your folders',folders().map(f=>folderRow(f.id,f.name,f.ids.length,1)).join(''));
    html+=grp('Recent',rc.map(id=>C.find(x=>x.id===id)).filter(Boolean).map(cmdRow).join(''));
    if(cmdOnly) html+=grp('All commands',C.map(cmdRow).join('')); else html+=grp('Folders',F.map(f=>folderRow(f,f,C.filter(x=>x.folder===f).length)).join(''));
    box.innerHTML=html; mark(); return; }
  const rx=new RegExp('('+words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','gi'); const hl=s=>esc(s).replace(rx,'<mark>$1</mark>');
  // folders by name (yours + built-in)
  const fh=[...folders().filter(f=>words.every(w=>norm(f.name).includes(w))).map(f=>folderRow(f.id,f.name,f.ids.length,1)),...F.filter(f=>words.every(w=>norm(f).includes(w))).map(f=>folderRow(f,f,C.filter(x=>x.folder===f).length))].join('');
  const cs=C.map(x=>[x,scoreCmd(x,words,raw)]).filter(z=>z[1]).sort((a,b)=>b[1]-a[1]).map(z=>z[0]);
  if(cmdOnly){ html=grp('Folders',fh)+grp('Commands',cs.map(cmdRow).join('')); box.innerHTML=html||'<p class="empty">No command matches. Try “export”, “refill” or “purple”.</p>'; mark(); return; }
  const hay=x=>[x.what,x.notes,[x.amt,x.unit].join(' '),...(x.fx||[]),...Object.values(x.ctx||{}).flat()].filter(Boolean).join(' ').toLowerCase();
  const es=raw.length<2?[]:Store.entries().filter(x=>{ const h=hay(x); return words.every(w=>h.includes(w)); });
  const ns={}; Store.entries().forEach(x=>{ if(!x.what) return; const k=Store.keyOf(x.what); if(words.every(w=>k.includes(w))){ ns[k]=ns[k]||{name:x.what.trim(),n:0}; ns[k].n++; } });
  const notes=es.filter(x=>x.notes&&words.every(w=>norm(x.notes).includes(w)));
  const rems=Store.reminders().filter(r=>words.every(w=>norm(r.what+' '+r.time).includes(w)));
  html+=grp('Commands',cs.slice(0,6).map(cmdRow).join('')+(cs.length>6?goRowQ('/'+raw0.replace(/^[\/>]/,''),'See all '+cs.length+' commands'):''));
  html+=grp('Folders',fh);
  html+=grp('Meds & things you log',Object.values(ns).sort((a,b)=>b.n-a.n).slice(0,5).map(o=>goRow('#sub/'+encodeURIComponent(o.name),hl(o.name),o.n+'× logged · open its page','💊')).join(''));
  html+=grp('Logs',es.slice(0,5).map(x=>entRow(x,hl)).join('')+(es.length>5?goRow('#find/'+encodeURIComponent(raw),'See all '+es.length+' logs','in Search my logs','🔎'):''));
  html+=grp('Notes',notes.slice(0,4).map(x=>entRow(x,hl)).join(''));
  html+=grp('Reminders',rems.slice(0,5).map(r=>goRow('#rem',hl(r.what),esc(r.time)+(r.on===false?' · off':''),'⏰')).join(''));
  box.innerHTML=html||`<p class="empty">Nothing matches “${esc(raw)}”.</p>`; mark(); }
function goRowQ(q,title){ const i=items.push({t:'q',q})-1; return `<div class="pr" data-i="${i}" role="option"><span class="pic">›</span><span class="wh"><b>${esc(title)}</b></span></div>`; }
const act0=act; act=function(it){ if(it&&it.t==='q'){ const q=pal.querySelector('#palq'); q.value=it.q; sel=0; draw(); return; } act0(it); };
function mark(){ const rs=pal.querySelectorAll('.pr'); rs.forEach((r,i)=>{ const on=+r.dataset.i===sel; r.classList.toggle('sel',on); if(on) r.setAttribute('aria-selected','true'); else r.removeAttribute('aria-selected'); }); const s=pal.querySelector('.pr.sel'); if(s&&s.scrollIntoView&&document.activeElement&&document.activeElement.id==='palq'&&pal.dataset.kb) s.scrollIntoView({block:'nearest'}); }
document.addEventListener('keydown',e=>{ if(pal&&!pal.hidden) { if(e.key.startsWith('Arrow')) pal.dataset.kb='1'; return; } const typing=e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]');
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); openPal(''); } else if(!typing&&e.key==='/'&&$('#sheet').hidden){ e.preventDefault(); openPal('/'); } });
document.addEventListener('click',e=>{ const b=e.target.closest('[data-pal]'); if(b){ e.preventDefault(); openPal(b.dataset.pal||''); } });
// "/" typed first in Search my logs jumps to commands, like Axon
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='fq'&&e.target.value==='/'){ e.target.value=''; openPal('/'); } });

/* ---------- Commands — start here ---------- */
routes.commands=v=>{ const fs=folders(), fv=favs();
  v.innerHTML=`<p style="margin:0 0 4px"><a href="#more">‹ More</a></p><h2>Commands — start here</h2>
   <div class="card"><p style="margin-top:0"><b>${C.length} commands in ${F.length} folders.</b> Tap <b>🔍 Search</b> at the top of any screen and type what you want: “export”, “refill”, “purple”, “yesterday”.</p>
   <p class="muted small" style="margin-bottom:0">Start with <b>/</b> to see only commands. The same search finds your logs, meds, notes and reminders. On a keyboard: <b>/</b> or <b>⌘K</b>. Tap ☆ to favorite a command; favorites show first when search is empty.</p></div>
   <div class="hrow"><h3>Your folders</h3><button class="btn sm" id="cnf">+ New folder</button></div>
   <div class="card list">${fs.length?fs.map(f=>`<div class="it" data-uf="${esc(f.id)}" role="button" tabindex="0"><span class="pic">📁</span><span class="wh"><b>${esc(f.name)}</b><small class="wrap">${f.ids.map(id=>(C.find(x=>x.id===id)||{}).name).filter(Boolean).slice(0,4).map(esc).join(' · ')}${f.ids.length>4?' …':''}</small></span><button class="lnk" data-ufe="${esc(f.id)}">Edit</button></div>`).join(''):'<p class="empty" style="padding:14px">Group the commands you use together, like “morning” or “doctor visit”. Type the folder’s name in search to open it.</p>'}</div>
   ${fv.length?`<h3 style="margin-top:16px">Favorites</h3><div class="card list">${fv.map(id=>C.find(x=>x.id===id)).filter(Boolean).map(x=>gRow(x)).join('')}</div>`:''}
   <h3 style="margin-top:16px">Every command</h3><input id="cgq" type="search" placeholder="filter ${C.length} commands" autocomplete="off" aria-label="Filter commands">
   <div id="cgl">${F.map(f=>`<details class="fold cg" data-f="${esc(f)}"><summary>${esc(f)} <span class="muted small" style="font-weight:400;margin-left:auto;padding-right:8px">${C.filter(x=>x.folder===f).length}</span></summary><div class="list">${C.filter(x=>x.folder===f).map(x=>gRow(x)).join('')}</div></details>`).join('')}</div>
   <button class="btn block" data-pal="">Open search</button><p class="muted small">Commands marked Pro open Trace Pro screens. Trace is a journal, not medical advice: no command suggests amounts, timing or doses.</p>`;
  v.querySelector('#cnf').onclick=()=>folderSheet(null);
  v.querySelectorAll('[data-ufe]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); folderSheet(b.dataset.ufe); });
  v.querySelectorAll('[data-uf]').forEach(el=>el.onclick=()=>{ openPal(''); mode=el.dataset.uf; draw(); });
  v.addEventListener('click',e=>{ const st=e.target.closest('[data-star]'); if(st){ e.stopPropagation(); toggleFav(st.dataset.star); routes.commands(v); return; } const r=e.target.closest('[data-run]'); if(r) run(r.dataset.run); });
  v.querySelector('#cgq').oninput=e=>{ const q=norm(e.target.value).trim(); v.querySelectorAll('.cg').forEach(d=>{ let n=0; d.querySelectorAll('[data-run]').forEach(r=>{ const m=!q||r.dataset.n.includes(q); r.hidden=!m; if(m) n++; }); d.hidden=!!q&&!n; d.open=!!q&&n>0; }); };
};
function gRow(x){ return `<div class="it" data-run="${x.id}" data-n="${esc(norm(x.name+' '+(x.k||'')+' '+x.folder))}" role="button" tabindex="0"><span class="wh"><b class="wrap">${esc(x.name)}</b></span>${pill(x)}<button class="star ${favs().includes(x.id)?'on':''}" data-star="${x.id}" aria-label="Favorite ${esc(x.name)}">${favs().includes(x.id)?'★':'☆'}</button></div>`; }
})();
