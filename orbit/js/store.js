// Orbit · local store. Everything lives on this phone (localStorage 'orb.db'); signed-in sync sends each record on its own,
// encrypted on the phone first (js/cloud.js). Records: friends (f_…), talks (i_…), prefs.
(function(){
const K='orb.db';
let db; try{ db=JSON.parse(localStorage.getItem(K)||'null'); }catch(e){}
if(!db||typeof db!=='object') db={f:{},i:{},p:{id:'prefs',up:0}};
db.f=db.f||{}; db.i=db.i||{}; db.p=db.p||{id:'prefs',up:0};
const C=()=>window.Cloud;
let tmr=null;
function persist(){ try{ localStorage.setItem(K,JSON.stringify(db)); }catch(e){ window.toast&&toast('Storage is full on this phone'); } }
function kick(ms){ clearTimeout(tmr); tmr=setTimeout(()=>window.OrbSync&&OrbSync(),ms||2500); }
function changed(id){ persist(); if(C()&&C().signedIn()){ C().markDirty(id); kick(); } window.dispatchEvent(new Event('orb-data')); }
function gone(id){ persist(); if(C()&&C().signedIn()){ C().markGone(id); kick(600); } window.dispatchEvent(new Event('orb-data')); }
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const DAY=864e5;
const RINGS={inner:{name:'Inner',every:7,r0:.2,col:'#7c9cff'},middle:{name:'Middle',every:21,r0:.34,col:'#5eead4'},outer:{name:'Outer',every:60,r0:.48,col:'#c4b5fd'}};
const KINDS={text:['💬','Texted'],call:['📞','Called'],irl:['🤝','In person'],hang:['🎉','Hung out'],video:['📹','Video call'],other:['✨','Other']};
const S={
  RINGS,KINDS,DAY,
  friends(all){ return Object.values(db.f).filter(x=>all||!x.arch).sort((a,b)=>a.name.localeCompare(b.name)); },
  friend(id){ return db.f[id]; },
  saveFriend(x){ if(!x.id){ x.id=uid('f_'); x.created=Date.now(); } x.up=Date.now(); db.f[x.id]=x; changed(x.id); return x; },
  delFriend(id){ delete db.f[id]; gone(id); for(const t of Object.values(db.i)) if(t.fid===id){ delete db.i[t.id]; if(C()&&C().signedIn()) C().markGone(t.id); } persist(); },
  talks(fid){ return Object.values(db.i).filter(x=>!x.del&&(!fid||x.fid===fid)).sort((a,b)=>b.t-a.t); },
  talk(id){ return db.i[id]; },
  saveTalk(x){ if(!x.id) x.id=uid('i_'); x.up=Date.now(); db.i[x.id]=x; changed(x.id); return x; },
  delTalk(id){ delete db.i[id]; gone(id); },
  prefs(){ return db.p; },
  savePrefs(p){ Object.assign(db.p,p,{id:'prefs',up:Date.now()}); changed('prefs'); },
  /* the last time you were in touch (your logs + logs your linked friend made) */
  last(fid){ let m=0; for(const t of Object.values(db.i)) if(t.fid===fid&&!t.del&&t.t>m) m=t.t; return m; },
  every(f){ return Math.max(1,+f.every||RINGS[f.ring||'middle'].every); },
  /* how far out a friend has drifted: days since last contact ÷ their "talk every N days" target (1 = right on target) */
  drift(f,now){ now=now||Date.now(); const l=Math.max(S.last(f.id),f.seed||0)||f.created||now; const d=Math.max(0,(now-l)/DAY); return { days:d, ratio:d/S.every(f), never:!S.last(f.id)&&!f.seed, last:l }; },
  syncDB:{
    all:async()=>[...Object.values(db.f),...Object.values(db.i).filter(x=>!x.id.startsWith('m_')),...(db.p.up?[db.p]:[])],
    put:async m=>{ if(!m||!m.id) return; const box=m.id.startsWith('f_')?db.f:m.id.startsWith('i_')||m.id.startsWith('m_')?db.i:null;
      if(m.id==='prefs'){ if((m.up||0)>(db.p.up||0)) db.p=m; } else if(box){ const cur=box[m.id]; if(!cur||(m.up||0)>=(cur.up||0)) box[m.id]=m; else C().markDirty(m.id); }
      persist(); window.dispatchEvent(new Event('orb-data')); },
    remove:async id=>{ delete db.f[id]; delete db.i[id]; persist(); window.dispatchEvent(new Event('orb-data')); }
  },
  /* many records at once (import, mutual pull) */
  bulk(list,noSync){ const ids=[]; const now=Date.now(); for(const x of list||[]){ if(!x||!x.id) continue; x.up=x.up||now; (x.id.startsWith('f_')?db.f:db.i)[x.id]=x; ids.push(x.id); }
    persist(); if(!noSync&&C()&&C().signedIn()){ ids.forEach(id=>C().markDirty(id)); kick(1500); } window.dispatchEvent(new Event('orb-data')); return ids.length; },
  /* talks your linked friend logged live only on this phone (the shared copy is the source), never in your encrypted sync */
  putShared(list){ for(const x of list) db.i[x.id]=x; persist(); window.dispatchEvent(new Event('orb-data')); },
  dropShared(keep){ let n=0; for(const t of Object.values(db.i)) if(t.id.startsWith('m_')&&!keep.has(t.id)){ delete db.i[t.id]; n++; } if(n){ persist(); window.dispatchEvent(new Event('orb-data')); } return n; },
  dump(){ return JSON.parse(JSON.stringify({f:db.f,i:Object.fromEntries(Object.entries(db.i).filter(([k])=>!k.startsWith('m_'))),p:db.p})); },
  bytes(){ try{ return (localStorage.getItem(K)||'').length; }catch(e){ return 0; } },
  _replace(d){ db=d; db.f=db.f||{}; db.i=db.i||{}; db.p=db.p||{id:'prefs',up:0}; persist(); window.dispatchEvent(new Event('orb-data')); }, // tests only
  dayKey(t){ const d=new Date(t); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
};
window.Store=S;
})();
