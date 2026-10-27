// Later · local store. Drafts (d_…) and prefs live on this phone (localStorage 'ltr.db'); signed in, each one syncs as its own
// record, encrypted on the phone first (js/cloud.js). Sealed capsules are NOT here: they live only on the server, locked.
(function(){
const K='ltr.db';
let db; try{ db=JSON.parse(localStorage.getItem(K)||'null'); }catch(e){}
if(!db||typeof db!=='object') db={d:{},p:{id:'prefs',up:0}};
db.d=db.d||{}; db.p=db.p||{id:'prefs',up:0};
const C=()=>window.Cloud;
let tmr=null;
function persist(){ try{ localStorage.setItem(K,JSON.stringify(db)); }catch(e){ window.toast&&toast('Storage is full on this phone. Remove photos from a draft.'); } }
function changed(id){ persist(); if(C()&&C().signedIn()){ C().markDirty(id); clearTimeout(tmr); tmr=setTimeout(()=>window.LtrSync&&LtrSync(),3000); } window.dispatchEvent(new Event('ltr-data')); }
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const S={
  drafts(){ return Object.values(db.d).sort((a,b)=>(b.up||0)-(a.up||0)); },
  draft(id){ return db.d[id]; },
  saveDraft(x){ if(!x.id) x.id=uid('d_'); x.up=Date.now(); db.d[x.id]=x; changed(x.id); return x; },
  delDraft(id){ if(!db.d[id]) return; delete db.d[id]; persist(); if(C()&&C().signedIn()) C().markGone(id); setTimeout(()=>window.LtrSync&&LtrSync(),500); window.dispatchEvent(new Event('ltr-data')); },
  prefs(){ return db.p; },
  savePrefs(p){ Object.assign(db.p,p,{id:'prefs',up:Date.now()}); changed('prefs'); },
  syncDB:{
    all:async()=>[...Object.values(db.d),...(db.p.up?[db.p]:[])],
    put:async m=>{ if(!m||!m.id) return; if(m.id==='prefs'){ if((m.up||0)>(db.p.up||0)) db.p=m; } else if(m.id.startsWith('d_')){ const cur=db.d[m.id]; if(!cur||(m.up||0)>=(cur.up||0)) db.d[m.id]=m; else C().markDirty(m.id); }
      persist(); window.dispatchEvent(new Event('ltr-data')); },
    remove:async id=>{ delete db.d[id]; persist(); window.dispatchEvent(new Event('ltr-data')); }
  },
  dayKey(t){ const d=new Date(t==null?Date.now():t); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
};
window.Store=S;
})();
