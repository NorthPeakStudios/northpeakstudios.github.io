// Trace · local store. Everything lives on this phone (localStorage 'trc.db'); signed-in sync sends each entry as its own
// record, encrypted on the phone first (js/cloud.js). Records: entries (e_…), reminders (r_…), urges (u_…, Labs), prefs.
(function(){
const K='trc.db';
let db; try{ db=JSON.parse(localStorage.getItem(K)||'null'); }catch(e){}
if(!db||typeof db!=='object') db={e:{},r:{},u:{},p:{id:'prefs',up:0}};
db.e=db.e||{}; db.r=db.r||{}; db.u=db.u||{}; db.p=db.p||{id:'prefs',up:0};
const C=()=>window.Cloud;
let tmr=null;
function persist(){ try{ localStorage.setItem(K,JSON.stringify(db)); }catch(e){ window.toast&&toast('Storage is full on this phone'); } }
function changed(id){ persist(); if(C()&&C().signedIn()){ C().markDirty(id); clearTimeout(tmr); tmr=setTimeout(()=>window.TrcSync&&TrcSync(),3000); } window.dispatchEvent(new Event('trc-data')); }
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const METRICS=[['mood','Mood','low','great'],['energy','Energy','drained','wired'],['focus','Focus','foggy','sharp'],['sleep','Sleep','bad','great'],['anxiety','Anxiety','calm','high'],['appetite','Appetite','none','big']];
const FX=['headache','nausea','dry mouth','drowsy','jittery','dizzy','stomach upset','trouble sleeping','racing heart','sweating','irritable','calm','clear-headed','motivated'];
const S={
  METRICS, FX,
  entries(){ return Object.values(db.e).filter(x=>!x.del).sort((a,b)=>b.t-a.t); },
  entry(id){ return db.e[id]; },
  saveEntry(x){ if(!x.id) x.id=uid('e_'); x.up=Date.now(); db.e[x.id]=x; changed(x.id); return x; },
  delEntry(id){ delete db.e[id]; persist(); if(C()&&C().signedIn()) C().markGone(id); setTimeout(()=>window.TrcSync&&TrcSync(),500); window.dispatchEvent(new Event('trc-data')); },
  reminders(){ return Object.values(db.r).sort((a,b)=>(a.time||'').localeCompare(b.time||'')); },
  saveRem(x){ if(!x.id) x.id=uid('r_'); x.up=Date.now(); db.r[x.id]=x; changed(x.id); return x; },
  delRem(id){ delete db.r[id]; persist(); if(C()&&C().signedIn()) C().markGone(id); window.dispatchEvent(new Event('trc-data')); },
  urges(){ return Object.values(db.u).sort((a,b)=>b.t-a.t); },
  saveUrge(x){ if(!x.id) x.id=uid('u_'); x.up=Date.now(); db.u[x.id]=x; changed(x.id); return x; },
  delUrge(id){ delete db.u[id]; persist(); if(C()&&C().signedIn()) C().markGone(id); setTimeout(()=>window.TrcSync&&TrcSync(),500); window.dispatchEvent(new Event('trc-data')); },
  prefs(){ return db.p; },
  savePrefs(p){ Object.assign(db.p,p,{id:'prefs',up:Date.now()}); changed('prefs'); },
  names(){ const m={}; for(const x of S.entries()){ if(!x.what) continue; const k=x.what.trim(); const lk=k.toLowerCase(); if(!m[lk]) m[lk]={name:k,n:0,last:x.t,amt:x.amt,unit:x.unit}; m[lk].n++; } return Object.values(m).sort((a,b)=>b.last-a.last); },
  keyOf:w=>String(w||'').trim().toLowerCase(),
  /* sync adapter for Cloud.sync(): newest edit wins per record */
  syncDB:{
    all:async()=>[...Object.values(db.e),...Object.values(db.r),...Object.values(db.u),...(db.p.up?[db.p]:[])],
    put:async m=>{ if(!m||!m.id) return; const box=m.id.startsWith('e_')?db.e:m.id.startsWith('r_')?db.r:m.id.startsWith('u_')?db.u:null;
      if(m.id==='prefs'){ if((m.up||0)>(db.p.up||0)) db.p=m; } else if(box){ const cur=box[m.id]; if(!cur||(m.up||0)>=(cur.up||0)) box[m.id]=m; else C().markDirty(m.id); }
      persist(); window.dispatchEvent(new Event('trc-data')); },
    remove:async id=>{ delete db.e[id]; delete db.r[id]; delete db.u[id]; persist(); window.dispatchEvent(new Event('trc-data')); }
  },
  _replace(d){ db=d; db.u=db.u||{}; persist(); }, // tests only
  dayKey(t){ const d=new Date(t); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
};
window.Store=S;
})();
