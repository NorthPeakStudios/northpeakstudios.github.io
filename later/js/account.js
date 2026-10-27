// Later · Northpeak account (shared Synapse login), encrypted sync of drafts, Pro (Apple Cash request), codes. Forked from Trace.
(function(){
const C=()=>window.Cloud;
const pro=()=>!!(C()&&C().isPro());
window.LtrPro={pro};
let syncing=false;
async function syncNow(){ if(!C()||!C().signedIn()||syncing) return; syncing=true; setSync('syncing…');
  try{ await C().sync(Store.syncDB); setSync('synced'); }catch(e){ setSync(e&&e.offline?'offline, will sync later':'sync failed, will retry'); } syncing=false; }
function setSync(t){ window.__ltrSync=t; const el=document.getElementById('ltrSync'); if(el) el.textContent=t; }
window.LtrSync=syncNow;
const ERR={wrong:'Wrong email or password.',np_exists:'That email already has a Northpeak account with a different password. Sign in with that password.',bad_email:'That doesn’t look like an email.',taken:'That email already has an account. Sign in instead.',slow_down:'Too many tries. Wait a few minutes.',offline:'You’re offline.',bad_code:'That code didn’t work.',used:'That code is already used on another account.',np_taken:'That email belongs to another Northpeak account.',same:'That’s already your email.',locked:'This account’s email is locked.'};
const em=e=>ERR[e&&e.message]||('Something went wrong ('+esc(e&&e.message||'error')+').');
function planLine(){ const a=C().acct; if(a.owner) return '👑 Owner, everything unlocked'; if(a.pro&&a.allAccess) return '⭐ Northpeak All-Access'; if(a.pro) return '⭐ Later Pro'+(a.via?' ('+esc(a.via)+')':''); return 'Free plan'; }
routes.account=v=>{
  if(!C()){ v.innerHTML='<p class="muted">Loading…</p>'; return; }
  if(!C().signedIn()){
    v.innerHTML=`<h2>Sign in</h2><p class="muted">One Northpeak account for every app (same login as Synapse). Sealing a capsule needs one; drafts sync encrypted on this phone first.</p><div class="card">
     <form id="af" autocomplete="on"><label>Email<input id="ae" type="email" autocomplete="username" inputmode="email" required></label><label>Password<input id="ap" type="password" autocomplete="current-password" minlength="6" required></label>
     <button class="btn big block" id="ain" type="submit" style="margin-top:14px">Sign in</button><button class="btn ghost block" id="aup" type="button">Create account</button><p id="amsg" class="muted"></p></form></div>
     <p class="muted small">Without an account you can write drafts on this phone. Sealing, the vault, check-ins and group capsules need a free account.</p>`;
    const go_=async kind=>{ const e=$('#ae').value.trim(), p=$('#ap').value; if(!e||p.length<6) return $('#amsg').textContent='Email and a password of 6+ characters.'; $('#amsg').textContent=kind==='signup'?'Creating your account…':'Signing in…';
      try{ await C().auth(kind,e,p); try{ await C().linkNorthpeak(e,p); }catch(x){} await C().refresh(true); await syncNow(); toast(kind==='signup'?'Account created ✓':'Signed in ✓'); chip(); afterSignIn(); }catch(x){ $('#amsg').textContent=em(x); } };
    $('#af').onsubmit=ev=>{ ev.preventDefault(); go_('login'); }; $('#aup').onclick=()=>go_('signup'); return;
  }
  const a=C().acct;
  v.innerHTML=`<h2>Account</h2><div class="card"><p style="margin-top:0"><b>${esc(a.user)}</b></p><p>${planLine()}</p><p class="muted small">Sync: <span id="ltrSync">${esc(window.__ltrSync||'–')}</span> <button class="btn ghost sm" id="snow">Sync now</button></p>
   <p class="muted small">Drafts are encrypted on this phone before they sync. Sealed capsules are held on the server, locked, until they open.</p>
   ${C().isPro()?'':'<a class="btn big block" href="#pro">Get Pro</a>'}</div>
   <details class="fold"><summary>Redeem a code</summary><p class="muted small">A Later code (LTR-…), a Northpeak All-Access code (SYN-…), or an owner/BOT code.</p><div class="row"><input id="cc" placeholder="XXX-XXXX-XXXX" autocapitalize="characters"><button class="btn fx0" id="ccb">Redeem</button></div><p id="ccm" class="muted"></p></details>
   <details class="fold"><summary>Change email</summary><p class="muted small">Changes it everywhere (Synapse, Axon, Liminal, Cadence, Mindprint, Trace, Later). Capsules sent to your old email follow you. Your old email stops working.</p><label>New email<input id="ne" type="email" autocomplete="email"></label><label>Password<input id="np" type="password" autocomplete="current-password"></label><p><button class="btn" id="neb">Change email</button></p><p id="nem" class="muted"></p></details>
   <button class="btn ghost block" id="lo" style="margin-top:14px">Log out</button><p class="center"><button class="lnk" id="del" style="color:var(--bad)">Delete account</button></p>`;
  $('#snow').onclick=()=>syncNow();
  $('#ccb').onclick=async()=>{ $('#ccm').textContent='Checking…'; try{ const j=await C().redeem($('#cc').value); $('#ccm').textContent=j.owner?'Owner unlocked 👑':'Pro unlocked ⭐'; chip(); setTimeout(route,900); }catch(x){ $('#ccm').textContent=em(x); } };
  $('#neb').onclick=async()=>{ $('#nem').textContent='Changing…'; try{ const r=await C().changeEmail($('#ne').value,$('#np').value); $('#nem').textContent='Email changed to '+r.email+(r.also&&r.also.startsWith('synapse')?' (everywhere)':''); setTimeout(route,1200); }catch(x){ $('#nem').textContent=em(x); } };
  $('#lo').onclick=async()=>{ await C().logout(); toast('Logged out. Drafts stay on this phone'); Caps.list=null; badge(); chip(); route(); };
  $('#del').onclick=async()=>{ const p=prompt('Delete your Later account? Capsules you wrote are deleted for everyone, and you leave the ones sent to you. Type your password to confirm.'); if(!p) return; try{ await C().deleteAccount(p); toast('Account deleted'); chip(); route(); }catch(x){ alert(em(x)); } };
};
routes.pro=v=>{
  const a=C()&&C().acct, req=a&&a.request;
  v.innerHTML=`<h2>Later Pro</h2><p class="muted">Capsules that open at the right place, after a streak, or with a question only they can answer.</p>
   ${pro()?'<div class="card"><p style="margin:0">⭐ You have Pro. Thanks for supporting Northpeak!</p></div>':
   !(C()&&C().signedIn())?'<div class="card"><p style="margin-top:0">Sign in first so Pro is tied to your account and works on every device.</p><a class="btn big block" href="#account">Sign in or create account</a></div>':
   req&&req.status==='new'?`<div class="card"><p style="margin-top:0">✅ Request sent (${esc(req.price||'')}). You’ll get an Apple Cash request at <b>${esc(req.phone||'')}</b>. Pay it and Pro turns on here by itself.</p><button class="btn ghost" id="chk">Check now</button></div>`:
   `<div class="card"><div class="pplans"><label class="pplan"><input type="radio" name="pl" value="later_pro" checked><div><b>Later Pro</b><span>$35 once</span></div></label><label class="pplan"><input type="radio" name="pl" value="all_access"><div><b>Northpeak All-Access</b><span>$100 once · Later + Synapse + Axon + Liminal + Cadence + Mindprint + Trace + every future app</span></div></label></div>
    <p class="muted small">Paid with Apple Cash: send your name and the phone number on your Apple Cash, you’ll get a request, and Pro turns on when it’s paid.</p>
    <label>Your name<input id="pn" autocomplete="name"></label><label>Apple Cash phone or email<input id="pp" autocomplete="tel" inputmode="tel"></label><button class="btn big block" id="pgo" style="margin-top:12px">Request Pro</button><p id="pm" class="muted"></p></div>`}
   <details class="fold" open><summary>What Pro adds</summary><p class="muted" style="margin-top:0">Place unlocks (📍 open only there), streak unlocks (🔥 after N days of check-ins), secret-question unlocks (❓), “once everyone has opened Later” unlocks (👀), group capsules where friends add pieces by code, photos and voice notes in capsules, and unlimited capsules.</p></details><details class="fold"><summary>What’s free forever</summary><p class="muted" style="margin-top:0">Date capsules with text to yourself or friends (3 active at a time), opening anything sent to you, adding a text piece to a friend’s group capsule, daily check-ins, letter-to-future-you prompts and replies, drafts with encrypted sync.</p></details>
   <p class="muted small center">Have a code? Redeem it on the <a href="#account">Account</a> screen.</p>`;
  const chk=$('#chk'); if(chk) chk.onclick=async()=>{ await C().refresh(true); route(); };
  const b=$('#pgo'); if(b) b.onclick=async()=>{ const n=$('#pn').value.trim(), ph=$('#pp').value.trim(), pl=(document.querySelector('input[name=pl]:checked')||{}).value; if(!n||ph.length<5) return $('#pm').textContent='Add your name and Apple Cash phone/email.'; $('#pm').textContent='Sending…'; try{ await C().requestPro(pl,n,ph); route(); }catch(x){ $('#pm').textContent=em(x); } };
};
function chip(){ const c=document.getElementById('acChip'); if(!c) return; const s=C()&&C().signedIn(); c.textContent=s?(pro()?'⭐ Pro':'Account'):'Sign in'; c.className='acchip'+(s?'':' out'); }
function afterSignIn(){ Caps.load(true).catch(()=>{}); try{ Cloud.api('/api/hello',{}).catch(()=>{}); }catch(e){} let pj=null; try{ pj=localStorage.getItem('ltr.pendingJoin'); }catch(e){} if(pj){ location.hash='join/'+pj; } else route(); }
function boot(){ C().onAccountChange(()=>{ chip(); }); chip(); if(C().signedIn()){ C().refresh(true).then(()=>{ chip(); const h=location.hash.slice(1).split('/')[0]; if(['pro','account','more'].includes(h)) route(); }); syncNow(); }
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&C().signedIn()){ C().refresh().then(chip); syncNow(); } });
  setInterval(()=>{ if(C().signedIn()&&!document.hidden) syncNow(); },120000);
  route(); }
if(window.Cloud) boot(); else window.addEventListener('cloud-ready',boot,{once:true});
})();
