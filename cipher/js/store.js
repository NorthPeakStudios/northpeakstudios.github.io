// Cipher · local store. Everything lives on this phone (localStorage 'cph.db'); signed in, each record syncs encrypted
// (js/cloud.js): daily/archive solves (d_YYYY-MM-DD), hunts you play (h_CODE), and prefs (name + puzzle player).
(function(){
const K='cph.db';
let db; try{ db=JSON.parse(localStorage.getItem(K)||'null'); }catch(e){}
if(!db||typeof db!=='object') db={r:{},p:{id:'prefs',up:0}};
db.r=db.r||{}; db.p=db.p||{id:'prefs',up:0};
const C=()=>window.Cloud; let tmr=null;
function persist(){ try{ localStorage.setItem(K,JSON.stringify(db)); }catch(e){ window.toast&&toast('Storage is full on this phone'); } }
function changed(id){ persist(); if(C()&&C().signedIn()){ C().markDirty(id); clearTimeout(tmr); tmr=setTimeout(()=>window.CphSync&&CphSync(),2500); } window.dispatchEvent(new Event('cph-data')); }
const S={
  get(id){ return db.r[id]||null; },
  all(prefix){ return Object.values(db.r).filter(x=>!prefix||x.id.startsWith(prefix)); },
  put(x){ x.up=Date.now(); db.r[x.id]=x; changed(x.id); return x; },
  patch(id,o){ const x=Object.assign(db.r[id]||{id},o); return S.put(x); },
  del(id){ delete db.r[id]; persist(); if(C()&&C().signedIn()) C().markGone(id); window.dispatchEvent(new Event('cph-data')); },
  prefs(){ return db.p; },
  savePrefs(p){ Object.assign(db.p,p,{id:'prefs',up:Date.now()}); changed('prefs'); },
  /* hint tokens: worked out from the records (5 to start + earned − spent), so two phones never fight over a counter */
  tokens(){ let n=5; for(const x of Object.values(db.r)){ n+=(x.earn||0)-(x.spent||0); } return Math.max(0,n); },
  earned(){ let n=0; for(const x of Object.values(db.r)) n+=x.earn||0; return n; },
  syncDB:{
    all:async()=>[...Object.values(db.r),...(db.p.up?[db.p]:[])],
    put:async m=>{ if(!m||!m.id) return; if(m.id==='prefs'){ if((m.up||0)>(db.p.up||0)) db.p=m; } else { const cur=db.r[m.id]; if(!cur||(m.up||0)>=(cur.up||0)) db.r[m.id]=m; else C().markDirty(m.id); }
      persist(); window.dispatchEvent(new Event('cph-data')); },
    remove:async id=>{ delete db.r[id]; persist(); window.dispatchEvent(new Event('cph-data')); }
  },
  _replace(d){ db=d; persist(); }, // tests only
  dayKey(t){ const d=new Date(t); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
};
window.Store=S;
})();
