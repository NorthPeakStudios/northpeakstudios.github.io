// Stash · local store. Everything lives on this phone (localStorage 'sts.db'). Signed in with Pro, each record syncs on its
// own, encrypted on the phone first (js/cloud.js). Records: money entries (t_), goals (g_), subscriptions (s_), products (p_),
// recurring rules (r_) and prefs. Amounts are whole cents.
(function(){
const K='sts.db';
let db; try{ db=JSON.parse(localStorage.getItem(K)||'null'); }catch(e){}
if(!db||typeof db!=='object') db={};
const BOX={t_:'t',g_:'g',s_:'s',p_:'pr',r_:'r'};
for(const b of Object.values(BOX)) db[b]=db[b]||{};
db.pf=db.pf||{id:'prefs',up:0};
const C=()=>window.Cloud;
let tmr=null;
function persist(){ try{ localStorage.setItem(K,JSON.stringify(db)); }catch(e){ window.toast&&toast('Storage is full on this phone'); } }
function ping(){ window.dispatchEvent(new Event('sts-data')); }
function later(ms){ if(C()&&C().signedIn()){ clearTimeout(tmr); tmr=setTimeout(()=>window.StsSync&&StsSync(),ms||2500); } }
function changed(id){ persist(); if(C()&&C().signedIn()) C().markDirty(id); later(); ping(); }
function gone(id){ persist(); if(C()&&C().signedIn()) C().markGone(id); later(800); ping(); }
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const boxOf=id=>db[BOX[String(id).slice(0,2)]];
const OUT=[['food','🍔','Food'],['fun','🎮','Fun'],['shopping','🛍️','Shopping'],['transport','🚌','Transport'],['tech','💻','Tech & tools'],['business','📦','Business costs'],['subs','🔁','Subscriptions'],['gifts','🎁','Gifts for others'],['school','📚','School'],['other','•','Other']];
const IN=[['sales','💸','App & product sales'],['allowance','🏠','Allowance'],['gift','🎁','Gifts'],['job','🧰','Jobs'],['other','•','Other']];
function catInfo(k,key){ const L=k==='in'?IN:OUT; const f=L.find(x=>x[0]===key); if(f) return {key,ic:f[1],name:f[2]}; const cu=(db.pf.cats||[]).find(x=>x.k===k&&x.key===key); return cu?{key,ic:cu.ic||'•',name:cu.name}:{key,ic:'•',name:String(key||'Other')}; }
function cats(k){ return [...(k==='in'?IN:OUT).map(x=>({key:x[0],ic:x[1],name:x[2]})),...(db.pf.cats||[]).filter(x=>x.k===k).map(x=>({key:x.key,ic:x.ic||'•',name:x.name}))]; }
const S={
  OUT,IN,catInfo,cats,uid,
  txs(){ return Object.values(db.t).sort((a,b)=>b.t-a.t||(b.up||0)-(a.up||0)); },
  tx(id){ return db.t[id]; },
  goals(){ return Object.values(db.g).sort((a,b)=>(a.done?1:0)-(b.done?1:0)||(a.c||0)-(b.c||0)); },
  goal(id){ return db.g[id]; },
  subs(){ return Object.values(db.s).sort((a,b)=>String(a.next).localeCompare(String(b.next))); },
  sub(id){ return db.s[id]; },
  products(){ return Object.values(db.pr).sort((a,b)=>(a.c||0)-(b.c||0)); },
  product(id){ return db.pr[id]; },
  rules(){ return Object.values(db.r).sort((a,b)=>(a.next||0)-(b.next||0)); },
  rule(id){ return db.r[id]; },
  save(x,prefix){ if(!x.id) x.id=uid(prefix); if(!x.c) x.c=Date.now(); x.up=Date.now(); boxOf(x.id)[x.id]=x; changed(x.id); return x; },
  del(id){ const b=boxOf(id); if(b&&b[id]){ delete b[id]; gone(id); } },
  prefs(){ return db.pf; },
  savePrefs(p){ Object.assign(db.pf,p,{id:'prefs',up:Date.now()}); changed('prefs'); },
  addCat(k,name,ic){ const key='c_'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,24); const list=(db.pf.cats||[]).slice(); if(!list.find(x=>x.k===k&&x.key===key)) list.push({k,key,name:name.slice(0,30),ic:ic||'•'}); S.savePrefs({cats:list}); return key; },
  /* many at once (CSV import, recurring catch-up): one save, one sync, one redraw */
  bulk(list){ const now=Date.now(); const ids=[]; for(const x of list){ if(!x.id) x.id=uid(x._p||'t_'); delete x._p; if(!x.c) x.c=now; x.up=now; boxOf(x.id)[x.id]=x; ids.push(x.id); }
    persist(); if(C()&&C().signedIn()) ids.forEach(id=>C().markDirty(id)); later(1500); ping(); return ids.length; },
  wipe(){ const ids=[...Object.keys(db.t),...Object.keys(db.g),...Object.keys(db.s),...Object.keys(db.pr),...Object.keys(db.r)]; for(const b of Object.values(BOX)) db[b]={}; persist(); if(C()&&C().signedIn()) ids.forEach(id=>C().markGone(id)); later(500); ping(); return ids.length; },
  dump(){ return JSON.parse(JSON.stringify(db)); },
  bytes(){ try{ return (localStorage.getItem(K)||'').length; }catch(e){ return 0; } },
  dayKey(t){ const d=new Date(t); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); },
  monKey(t){ const d=new Date(t); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); },
  /* sync adapter for Cloud.sync(): newest edit wins per record */
  syncDB:{
    all:async()=>[...Object.values(db.t),...Object.values(db.g),...Object.values(db.s),...Object.values(db.pr),...Object.values(db.r),...(db.pf.up?[db.pf]:[])],
    put:async m=>{ if(!m||!m.id) return; if(m.id==='prefs'){ if((m.up||0)>(db.pf.up||0)) db.pf=m; } else { const b=boxOf(m.id); if(b){ const cur=b[m.id]; if(!cur||(m.up||0)>=(cur.up||0)) b[m.id]=m; else C().markDirty(m.id); } } persist(); ping(); },
    remove:async id=>{ const b=boxOf(id); if(b) delete b[id]; persist(); ping(); }
  }
};
window.Store=S;
})();
