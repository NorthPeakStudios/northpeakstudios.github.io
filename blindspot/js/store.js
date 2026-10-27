// Blindspot · local store. Everything lives on this phone (localStorage 'bls.db'); signed in, each game syncs as its own
// record, encrypted on the phone first (js/cloud.js). Records: games (g_<mode>_<key>) and prefs.
(function(){
const K='bls.db';
let db; try{ db=JSON.parse(localStorage.getItem(K)||'null'); }catch(e){}
if(!db||typeof db!=='object') db={g:{},p:{id:'prefs',up:0}};
db.g=db.g||{}; db.p=db.p||{id:'prefs',up:0};
const C=()=>window.Cloud;
let tmr=null;
function persist(){ try{ localStorage.setItem(K,JSON.stringify(db)); }catch(e){ window.toast&&toast('Storage is full on this phone'); } }
function changed(id){ persist(); if(C()&&C().signedIn()){ C().markDirty(id); clearTimeout(tmr); tmr=setTimeout(()=>window.BlsSync&&BlsSync(),2500); } window.dispatchEvent(new Event('bls-data')); }
const S={
  games(mode){ return Object.values(db.g).filter(g=>!mode||g.mode===mode).sort((a,b)=>(b.t||0)-(a.t||0)); },
  game(id){ return db.g[id]; },
  saveGame(g){ g.up=Date.now(); db.g[g.id]=g; changed(g.id); return g; },
  delGame(id){ delete db.g[id]; persist(); if(C()&&C().signedIn()) C().markGone(id); window.dispatchEvent(new Event('bls-data')); },
  prefs(){ return db.p; },
  savePrefs(p){ Object.assign(db.p,p,{id:'prefs',up:Date.now()}); changed('prefs'); },
  syncDB:{
    all:async()=>[...Object.values(db.g),...(db.p.up?[db.p]:[])],
    put:async m=>{ if(!m||!m.id) return;
      if(m.id==='prefs'){ if((m.up||0)>(db.p.up||0)){ /* keep the best streak from either device */ const hb=Math.max(m.hlBest||0,db.p.hlBest||0); db.p=m; db.p.hlBest=hb; } }
      else if(m.id.startsWith('g_')){ const cur=db.g[m.id]; if(!cur||(m.up||0)>=(cur.up||0)) db.g[m.id]=m; else C().markDirty(m.id); }
      persist(); window.dispatchEvent(new Event('bls-data')); },
    remove:async id=>{ delete db.g[id]; persist(); window.dispatchEvent(new Event('bls-data')); }
  },
  _replace(d){ db=d; db.g=db.g||{}; db.p=db.p||{id:'prefs',up:0}; persist(); }, // tests only
  dev(){ let d=localStorage.getItem('bls.dev'); if(!d||!/^[a-z0-9]{12,40}$/.test(d)){ d=[...crypto.getRandomValues(new Uint8Array(12))].map(x=>x.toString(36).padStart(2,'0')).join('').slice(0,20); localStorage.setItem('bls.dev',d); } return d; },
  today(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
};
window.Store=S;
})();
