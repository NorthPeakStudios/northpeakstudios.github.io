// Verdict · local store. Saved arguments (s_…), drafts (d_<day>) and prefs live on this phone (localStorage 'vrd.db');
// signed in, each one syncs as its own record, encrypted on the phone first (js/cloud.js). Public arguments and votes live on the server.
(function(){
const K='vrd.db';
let db; try{ db=JSON.parse(localStorage.getItem(K)||'null'); }catch(e){}
if(!db||typeof db!=='object') db={s:{},d:{},p:{id:'prefs',up:0}};
db.s=db.s||{}; db.d=db.d||{}; db.p=db.p||{id:'prefs',up:0};
const C=()=>window.Cloud;
let tmr=null;
function persist(){ try{ localStorage.setItem(K,JSON.stringify(db)); }catch(e){ window.toast&&toast('Storage is full on this phone'); } }
function kick(ms){ clearTimeout(tmr); tmr=setTimeout(()=>window.VrdSync&&VrdSync(),ms); }
function changed(id){ persist(); if(C()&&C().signedIn()){ C().markDirty(id); kick(2500); } window.dispatchEvent(new Event('vrd-data')); }
function gone(id){ persist(); if(C()&&C().signedIn()){ C().markGone(id); kick(800); } window.dispatchEvent(new Event('vrd-data')); }
const S={
  saved(){ return Object.values(db.s).sort((a,b)=>b.up-a.up); },
  isSaved(aid){ return !!db.s['s_'+aid]; },
  save(arg){ const id='s_'+arg.id; db.s[id]={id,arg:{id:arg.id,text:arg.text,side:arg.side,handle:arg.handle,elo:arg.elo,day:arg.day,topic:arg.topic,mi:arg.mi},up:Date.now()}; changed(id); },
  unsave(aid){ delete db.s['s_'+aid]; gone('s_'+aid); },
  draft(day){ return db.d['d_'+day]||null; },
  setDraft(day,side,text){ const id='d_'+day; db.d[id]={id,day,side,text,up:Date.now()}; persist(); clearTimeout(S._dt); S._dt=setTimeout(()=>changed(id),4000); },
  clearDraft(day){ if(db.d['d_'+day]){ delete db.d['d_'+day]; gone('d_'+day); } },
  prefs(){ return db.p; },
  savePrefs(p){ Object.assign(db.p,p,{id:'prefs',up:Date.now()}); changed('prefs'); },
  syncDB:{
    all:async()=>[...Object.values(db.s),...Object.values(db.d),...(db.p.up?[db.p]:[])],
    put:async m=>{ if(!m||!m.id) return; const box=m.id.startsWith('s_')?db.s:m.id.startsWith('d_')?db.d:null;
      if(m.id==='prefs'){ if((m.up||0)>(db.p.up||0)) db.p=m; } else if(box){ const cur=box[m.id]; if(!cur||(m.up||0)>=(cur.up||0)) box[m.id]=m; else C().markDirty(m.id); }
      persist(); window.dispatchEvent(new Event('vrd-data')); },
    remove:async id=>{ delete db.s[id]; delete db.d[id]; persist(); window.dispatchEvent(new Event('vrd-data')); }
  }
};
window.Store=S;
})();
