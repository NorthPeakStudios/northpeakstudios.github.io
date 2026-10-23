// Cadence · Northpeak account, progress sync, Pro (paywall) and the progress carry-over from odin-theory.sites.tab.bot.
(function(){
const PRO_TIERS=[3,4];
const PRO_EAR=['ear-seventh','ear-progression','ear-cadence','ear-mode','ear-melody','ear-micro'];
const PRO_ROUTES={check:'Voice-leading & counterpoint checker',analyze:'MIDI / MusicXML analysis engine',graph:'Knowledge graph',tonnetz:'Tonnetz & Neo-Riemannian explorer'};
const FREE_GROUPS=['Notation','Rhythm','Intervals','Chords','Scales & keys','Harmony'];
const PRO_GENS=new Set(PRACTICE_GROUPS.filter(g=>!FREE_GROUPS.includes(g[0])).flatMap(g=>g[1]).concat(PRO_EAR));
const C=()=>window.Cloud;
const pro=()=>!!(C()&&C().isPro());
window.CadPro={pro, PRO_GENS, PRO_TIERS};
const conceptPro=c=>c&&PRO_TIERS.includes(c.tier);

/* ---------- progress merge (two devices never lose work) ---------- */
function merge(a,b){
  a=a||{}; b=b||{}; const P=(a.answered||0)>=(b.answered||0)?a:b, O=P===a?b:a; const m=JSON.parse(JSON.stringify(P));
  m.xp=Math.max(a.xp||0,b.xp||0); m.answered=Math.max(a.answered||0,b.answered||0); m.bestRun=Math.max(a.bestRun||0,b.bestRun||0);
  m.days=[...new Set([...(a.days||[]),...(b.days||[])])].sort(); m.ach=[...new Set([...(a.ach||[]),...(b.ach||[])])];
  m.placed=!!(a.placed||b.placed); if(!m.placement||!Object.keys(m.placement).length) m.placement=O.placement||{};
  for(const k of ['mastery','area']){ m[k]=Object.assign({},O[k]||{},P[k]||{}); for(const id in (O[k]||{})){ const x=(P[k]||{})[id], y=O[k][id]; if(!x||((y.n||0)>(x.n||0))) m[k][id]=y; } }
  for(const k of ['time','errors']){ m[k]=Object.assign({},O[k]||{},P[k]||{}); for(const id in (O[k]||{})) m[k][id]=Math.max(+((P[k]||{})[id])||0,+O[k][id]||0); }
  const la=a.lastDay||'', lb=b.lastDay||''; const L=la>lb?a:lb>la?b:((a.streak||0)>=(b.streak||0)?a:b); m.lastDay=L.lastDay||null; m.streak=L.streak||0;
  return m;
}
const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
function apply(m){ const st=S.get(); for(const k of Object.keys(st)) delete st[k]; Object.assign(st,m); rawSave(); try{ renderHud(); }catch(e){} }
const rawSave=S.save; let quiet=false;
S.save=function(){ rawSave(); if(!quiet) localChange(); };
let tmr=null;
function localChange(){ if(!C()||!C().signedIn()) return; C().markDirty('progress'); clearTimeout(tmr); tmr=setTimeout(syncNow,4000); }
const DB={ all:async()=>[{id:'progress',st:S.get()}], remove:async()=>{},
  put:async m=>{ if(!m||m.id!=='progress'||!m.st) return; const cur=S.get(), mm=merge(cur,m.st); if(!same(mm,cur)){ quiet=true; apply(mm); quiet=false; } if(!same(mm,m.st)) C().markDirty('progress'); } };
let syncing=false;
async function syncNow(){ if(!C()||!C().signedIn()||syncing) return; syncing=true; setSync('syncing…');
  try{ C().resetSeq(); await C().sync(DB); setSync('synced'); } catch(e){ setSync(e&&e.offline?'offline — will sync later':'sync failed — will retry'); }
  syncing=false; }
function setSync(t){ window.__cadSync=t; const el=document.getElementById('cadSync'); if(el) el.textContent=t; }
window.CadSync=syncNow;

/* ---------- carry-over from the old address (odin-theory.sites.tab.bot passes its progress in the #fragment) ---------- */
(function(){ const h=location.hash; if(!h.startsWith('#import=')) return;
  try{ const b=h.slice(8).replace(/-/g,'+').replace(/_/g,'/'); const js=decodeURIComponent(escape(atob(b))); const d=JSON.parse(js);
    if(d&&d.st&&typeof d.st==='object'){ apply(merge(S.get(),d.st)); if(Array.isArray(d.seen)){ try{ const k='mt_seen', cur=JSON.parse(localStorage.getItem(k)||'[]'); localStorage.setItem(k,JSON.stringify([...new Set(cur.concat(d.seen))].slice(-3000))); }catch(e){} }
      localStorage.setItem('cad.imported',String(Date.now())); setTimeout(()=>toast('🎺 Your progress came with you. Sign in to sync it.'),600); }
  }catch(e){}
  history.replaceState(null,'',location.pathname+'#today');
})();

/* ---------- locked screen ---------- */
function locked(v,what,detail){
  v.innerHTML=`<div class="card lockcard"><div class="lockic">🔒</div><h2>${esc(what)}</h2><p class="muted">${esc(detail||'')}</p>
   <p>This is part of <b>Cadence Pro</b>: the conservatory and PhD tiers, the voice-leading checker, MIDI/MusicXML analysis, the knowledge graph and Tonnetz, and advanced ear training.</p>
   <p><a class="btn big" href="#pro">Get Pro — $35</a></p><p class="muted small">Or $100 Northpeak All-Access: Cadence, Synapse, Axon and Liminal, forever.${C()&&C().signedIn()?'':' Already have Pro or All-Access? <a href="#account">Sign in</a>.'}</p></div>`;
}
function gate(name,check){ const f=routes[name]; if(!f) return; routes[name]=(v,...a)=>{ const r=check(...a); if(r&&!pro()) return locked(v,r[0],r[1]); return f(v,...a); }; }
gate('lesson',id=>{ const c=CONCEPT[id]; return conceptPro(c)?[c.title,'Tier '+c.tier+' lesson']:null; });
gate('quiz',id=>{ const c=CONCEPT[id]; return conceptPro(c)?[c.title+' quiz','Tier '+c.tier]:null; });
for(const r in PRO_ROUTES) gate(r,()=>[PRO_ROUTES[r],'']);
gate('ear',g=>g&&PRO_EAR.includes(g)?[(EAR.find(e=>e[0]===g)||[0,'Ear training'])[1]+' (ear training)','Advanced ear training']:null);
gate('practice',p=>{ if(!p) return null; const gs=p==='mix'?[]:p.split(','); return gs.some(g=>PRO_GENS.has(g))?['Advanced practice','Counterpoint, orchestration, jazz, post-tonal, Neo-Riemannian and math-of-music generators']:null; });
const _prac=routes.practice; routes.practice=(v,p)=>{ if(p==='mix'&&!pro()){ const gens=PRACTICE_GROUPS.filter(g=>FREE_GROUPS.includes(g[0])).flatMap(g=>g[1]); return runQuiz(v,i=>Q.make(Q.pick(gens),3+(i>10?1:0)+(i>25?1:0)),{title:'Practice',back:'#practice'}); } return _prac(v,p); };

/* lock badges on list screens */
const mo=new MutationObserver(()=>{ if(pro()) return; document.querySelectorAll('#view a[href]').forEach(a=>{ if(a.dataset.lk) return; const h=a.getAttribute('href')||''; let lock=false; const m=h.match(/^#(\w+)(?:\/(.+))?$/); if(!m) return;
  if(PRO_ROUTES[m[1]]) lock=true; else if((m[1]==='lesson'||m[1]==='quiz')&&conceptPro(CONCEPT[decodeURIComponent(m[2]||'')])) lock=true; else if(m[1]==='ear'&&PRO_EAR.includes(m[2])) lock=true; else if(m[1]==='practice'&&m[2]&&m[2]!=='mix'&&m[2].split(',').some(g=>PRO_GENS.has(g))) lock=true;
  a.dataset.lk='1'; if(lock){ a.classList.add('locked'); a.insertAdjacentHTML('beforeend','<em class="lk" aria-label="Pro">🔒</em>'); } }); });
mo.observe(document.getElementById('view'),{childList:true,subtree:true});

/* ---------- account screen ---------- */
const ERR={wrong:'Wrong email or password.',np_exists:'That email already has a Northpeak account with a different password — sign in with that password.',bad_email:'That doesn’t look like an email.',taken:'That email already has an account — sign in instead.',slow_down:'Too many tries — wait a few minutes.',offline:'You’re offline.',bad_code:'That code didn’t work.',used:'That code is already used on another account.',np_taken:'That email belongs to another Northpeak account.',same:'That’s already your email.',locked:'This account’s email is locked.'};
const em=e=>ERR[e&&e.message]||('Something went wrong ('+esc(e&&e.message||'error')+').');
function planLine(){ const a=C().acct; if(a.owner) return '👑 Owner — everything unlocked'; if(a.pro&&a.allAccess) return '⭐ Northpeak All-Access'; if(a.pro) return '⭐ Cadence Pro'+(a.via?' ('+esc(a.via)+')':''); if(C().onTrial()) return '⏳ Pro trial — '+Math.ceil(C().trialLeft()/864e5)+' day(s) left'; return 'Free plan'; }
routes.account=v=>{
  if(!C()){ v.innerHTML='<p class="muted">Loading…</p>'; return; }
  if(!C().signedIn()){
    v.innerHTML=`<h2>Sign in</h2><div class="card"><p class="muted">One Northpeak account: your Synapse, Axon or Liminal email and password work here too, and All-Access carries over. Signing in syncs your progress across your devices.</p>
     <form id="af" autocomplete="on"><label>Email<input id="ae" type="email" autocomplete="username" inputmode="email" required></label><label>Password<input id="ap" type="password" autocomplete="current-password" minlength="6" required></label>
     <p class="row"><button class="btn big" id="ain" type="submit">Sign in</button> <button class="btn ghost" id="aup" type="button">Create account</button></p><p id="amsg" class="muted"></p></form></div>`;
    const go_=async kind=>{ const e=$('#ae').value.trim(), p=$('#ap').value; if(!e||p.length<6) return $('#amsg').textContent='Email and a password of 6+ characters.'; $('#amsg').textContent=kind==='signup'?'Creating your account…':'Signing in…';
      try{ await C().auth(kind,e,p); try{ await C().linkNorthpeak(e,p); }catch(x){} await C().refresh(true); C().markDirty('progress'); await syncNow(); toast(kind==='signup'?'Account created ✓':'Signed in ✓'); route(); }catch(x){ $('#amsg').textContent=em(x); } };
    $('#af').onsubmit=ev=>{ ev.preventDefault(); go_('login'); }; $('#aup').onclick=()=>go_('signup'); return;
  }
  const a=C().acct;
  v.innerHTML=`<h2>Account</h2><div class="card"><p><b>${esc(a.user)}</b></p><p>${planLine()}</p><p class="muted small">Sync: <span id="cadSync">${esc(window.__cadSync||'—')}</span> <button class="btn ghost sm" id="snow">Sync now</button></p>
   ${C().isPro()&&!C().onTrial()?'':'<p><a class="btn big" href="#pro">Get Pro</a></p>'}</div>
   <div class="card"><h3>Have a code?</h3><p class="muted small">A Cadence code (CAD-…), a Northpeak All-Access code (SYN-…), or an owner/BOT code.</p><p class="row"><input id="cc" placeholder="XXX-XXXX-XXXX" autocapitalize="characters"> <button class="btn" id="ccb">Redeem</button></p><p id="ccm" class="muted"></p></div>
   <div class="card"><h3>Change email</h3><p class="muted small">Changes it everywhere (Synapse, Axon, Liminal, Cadence). Your old email stops working.</p><label>New email<input id="ne" type="email" autocomplete="email"></label><label>Password<input id="np" type="password" autocomplete="current-password"></label><p><button class="btn" id="neb">Change email</button></p><p id="nem" class="muted"></p></div>
   <div class="card"><p class="row"><button class="btn ghost" id="lo">Log out</button> <button class="btn ghost danger" id="del">Delete account</button></p></div>`;
  $('#snow').onclick=()=>syncNow();
  $('#ccb').onclick=async()=>{ $('#ccm').textContent='Checking…'; try{ const j=await C().redeem($('#cc').value); $('#ccm').textContent=j.owner?'Owner unlocked 👑':'Pro unlocked ⭐'; setTimeout(route,900); }catch(x){ $('#ccm').textContent=em(x); } };
  $('#neb').onclick=async()=>{ $('#nem').textContent='Changing…'; try{ const r=await C().changeEmail($('#ne').value,$('#np').value); $('#nem').textContent='Email changed to '+r.email+(r.also&&r.also.startsWith('synapse')?' (everywhere)':''); setTimeout(route,1200); }catch(x){ $('#nem').textContent=em(x); } };
  $('#lo').onclick=async()=>{ await C().logout(); toast('Logged out — your progress stays on this device'); route(); };
  $('#del').onclick=async()=>{ const p=prompt('Delete your Cadence account and its synced copy? Type your password to confirm. (Progress on this device stays.)'); if(!p) return; try{ await C().deleteAccount(p); toast('Account deleted'); route(); }catch(x){ alert(em(x)); } };
};

/* ---------- Pro / paywall ---------- */
routes.pro=v=>{
  const a=C()&&C().acct, req=a&&a.request;
  v.innerHTML=`<h2>Cadence Pro</h2>
   <div class="card"><p><b>Free forever:</b> the diagnostic, Beginner + Intermediate tiers (${CONCEPTS.filter(c=>c.tier<=2).length} concepts), practice for notation, rhythm, intervals, chords, scales/keys and harmony, ear training for intervals, triads and rhythm, the tuner, piano, fretboard, staff, visualizer and transposer, XP and streaks.</p>
   <p><b>Pro adds:</b> the Conservatory + PhD tiers (${CONCEPTS.filter(c=>PRO_TIERS.includes(c.tier)).length} concepts: counterpoint, fugue, form, orchestration, jazz, set theory, Schenker, Neo-Riemannian, math of music), the SATB voice-leading checker, MIDI/MusicXML analysis, the knowledge graph + Tonnetz, advanced ear training (7ths, progressions, cadences, modes, melodic dictation, microtones) and every advanced practice generator.</p></div>
   ${pro()&&!C().onTrial()?'<div class="card"><p>⭐ You have Pro. Thanks for supporting Northpeak!</p></div>':
   !(C()&&C().signedIn())?'<div class="card"><p>Sign in first so Pro is tied to your account (and works on every device).</p><p><a class="btn big" href="#account">Sign in / create account</a></p></div>':
   req&&req.status==='new'?`<div class="card"><p>✅ Request sent (${esc(req.price||'')}). You’ll get an Apple Cash request at <b>${esc(req.phone||'')}</b>. Pay it and Pro turns on here by itself.</p><p><button class="btn ghost" id="chk">Check now</button></p></div>`:
   `<div class="card"><div class="pplans"><label class="pplan"><input type="radio" name="pl" value="cadence_pro" checked><b>Cadence Pro</b><span>$35 once</span></label><label class="pplan"><input type="radio" name="pl" value="all_access"><b>Northpeak All-Access</b><span>$100 once · Cadence + Synapse + Axon + Liminal + every future app</span></label></div>
    <p class="muted small">Paid with Apple Cash: send your name and the phone number on your Apple Cash, you’ll get a request, and Pro turns on when it’s paid.</p>
    <label>Your name<input id="pn" autocomplete="name"></label><label>Apple Cash phone or email<input id="pp" autocomplete="tel" inputmode="tel"></label><p><button class="btn big" id="pgo">Request Pro</button></p><p id="pm" class="muted"></p></div>`}
   <div class="card"><p class="muted small">Have a code? Redeem it on the <a href="#account">Account</a> screen.</p></div>`;
  const chk=$('#chk'); if(chk) chk.onclick=async()=>{ await C().refresh(true); route(); };
  const b=$('#pgo'); if(b) b.onclick=async()=>{ const n=$('#pn').value.trim(), ph=$('#pp').value.trim(), pl=(document.querySelector('input[name=pl]:checked')||{}).value; if(!n||ph.length<5) return $('#pm').textContent='Add your name and Apple Cash phone/email.'; $('#pm').textContent='Sending…'; try{ await C().requestPro(pl,n,ph); route(); }catch(x){ $('#pm').textContent=em(x); } };
};

/* entry points: HUD account chip + More tiles */
window.MORE_TILES=(window.MORE_TILES||[]); window.MORE_TILES.unshift(['#account','👤 Account & sync','sign in, sync, codes, change email'],['#pro','⭐ Cadence Pro','what’s free, what’s Pro']);
function chip(){ const h=document.getElementById('hud'); if(!h) return; let c=document.getElementById('acChip'); if(!c){ c=document.createElement('a'); c.id='acChip'; c.href='#account'; h.appendChild(c); } const s=C()&&C().signedIn(); c.textContent=s?(pro()?'⭐':'👤'):'Sign in'; c.className='acchip'+(s?'':' out'); }
if(typeof renderHud==='function'){ const orig=renderHud; renderHud=function(){ orig(); chip(); }; }
function boot(){ C().onAccountChange(()=>{ try{ renderHud(); }catch(e){} chip(); }); chip(); if(C().signedIn()){ C().refresh(true).then(()=>{ chip(); }); syncNow(); }
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&C().signedIn()){ C().refresh().then(chip); syncNow(); } });
  setInterval(()=>{ if(C().signedIn()&&!document.hidden) syncNow(); },120000);
  const h=location.hash.slice(1).split('/')[0]; if(['account','pro'].includes(h)||Object.keys(PRO_ROUTES).includes(h)||['lesson','quiz','ear','practice'].includes(h)) route(); }
if(window.Cloud) boot(); else window.addEventListener('cloud-ready',boot,{once:true});
})();
