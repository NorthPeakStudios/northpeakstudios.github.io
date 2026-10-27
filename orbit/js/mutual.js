// Orbit · mutual orbits. Two Orbit users link one friend entry each with a one-time code; talks either of you logs on that
// friend show up for both, with a shared weekly streak. Shared logs live on orbit-sync (kind + time + a note only if you share it).
(function(){
const C=()=>window.Cloud;
const LSK='orb.mut';
let st={}; try{ st=JSON.parse(localStorage.getItem(LSK)||'{}'); }catch(e){} st.pairs=st.pairs||{}; st.unlog=st.unlog||[]; st.invites=st.invites||[];
const save=()=>{ try{ localStorage.setItem(LSK,JSON.stringify(st)); }catch(e){} };
const on=()=>!!(C()&&C().signedIn());
let busy=null, tmr=null;
function info(f){ return f&&f.mpair?st.pairs[f.mpair]||null:null; }
function streak(f){ const i=info(f); return i?i.streak:0; }
async function pull(){ if(!on()) return null; if(busy) return busy; busy=run().catch(e=>{ console.warn('mutual',e&&e.message); return null; }).finally(()=>busy=null); return busy; }
async function run(){
  // retry deletes that didn't reach the server
  for(const u of st.unlog.slice()){ try{ await C().api('/api/mutual/unlog',u); st.unlog=st.unlog.filter(x=>x!==u); }catch(e){ if(e.status===404) st.unlog=st.unlog.filter(x=>x!==u); } }
  const j=await C().api('/api/mutual/list'); const keep=new Set(), shared=[]; const pairs={};
  for(const p of j.pairs){
    let f=Store.friends(true).find(x=>x.mpair===p.id)||Store.friend(p.my_fid);
    if(!f){ f=Store.saveFriend({id:/^f_[\w-]+$/.test(p.my_fid)?p.my_fid:undefined,name:p.them.name||'Friend',emoji:p.them.emoji||'🙂',ring:'middle',every:14,seed:p.t}); }
    if(f.mpair!==p.id){ f.mpair=p.id; Store.saveFriend(f); }
    pairs[p.id]={them:p.them,me_as:p.me_as,streak:p.streak,best:p.best,this_week:p.this_week,fid:f.id,t:p.t,n:p.logs.length};
    const mine=new Set(Store.talks(f.id).filter(t=>t.mid).map(t=>t.mid));
    for(const l of p.logs){ if(l.by!=='them') continue; const id='m_'+l.id.replace(/[^\w-]/g,'_'); keep.add(id);
      shared.push({id,fid:f.id,kind:l.kind,t:l.t,note:l.note||'',src:'them',mid:l.id,up:l.t}); }
    // my talks on this friend that the pair hasn't seen yet
    for(const t of Store.talks(f.id)){ if(t.src==='them'||t.mid||t.t<p.t-86400e3) continue;
      try{ const r=await C().api('/api/mutual/log',{pair:p.id,id:t.id,kind:t.kind,t:t.t,note:t.share?t.note||'':''}); t.mid=r.id; Store.saveTalk(t); }catch(e){ if(e.offline) break; } }
  }
  // "both logged": a talk you logged within 12 h of one they logged
  for(const s of shared){ const near=Store.talks(s.fid).find(t=>t.src!=='them'&&Math.abs(t.t-s.t)<12*36e5); s.both=!!near; }
  // a pair that's gone (unlinked by them) unlinks here too
  for(const f of Store.friends(true)) if(f.mpair&&!pairs[f.mpair]&&st.pairs[f.mpair]){ delete f.mpair; Store.saveFriend(f); }
  st.pairs=pairs; st.invites=j.invites||[]; st.at=Date.now(); save();
  Store.dropShared(keep); if(shared.length) Store.putShared(shared); else window.dispatchEvent(new Event('orb-data'));
  return j;
}
function soon(ms){ clearTimeout(tmr); tmr=setTimeout(pull,ms||1200); }
function logged(t,edited){ const f=Store.friend(t.fid); if(!f||!f.mpair||!on()) return;
  if(edited&&t.mid){ C().api('/api/mutual/log',{pair:f.mpair,id:t.mid.split(':').slice(1).join(':')||t.id,kind:t.kind,t:t.t,note:t.share?t.note||'':''}).then(()=>soon(400)).catch(()=>{}); return; }
  soon(800); }
function removed(t){ const f=Store.friend(t.fid); if(!t.mid||!f||!f.mpair) return; const u={pair:f.mpair,id:t.mid}; if(!on()){ st.unlog.push(u); save(); return; }
  C().api('/api/mutual/unlog',u).then(()=>soon(300)).catch(e=>{ if(e.offline){ st.unlog.push(u); save(); } }); }
async function unlink(f,silent){ if(!f.mpair) return; const id=f.mpair; try{ if(on()) await C().api('/api/mutual/unlink',{pair:id}); }catch(e){}
  delete st.pairs[id]; save(); const live=Store.friend(f.id); if(live){ delete live.mpair; Store.saveFriend(live); } Store.dropShared(new Set()); if(!silent) toast('Unlinked'); soon(200); }
function myName(){ const p=Store.prefs(); return p.myName||(C()&&C().acct.user?C().acct.user.split('@')[0]:''); }
function bindCard(v,f){
  const u=document.getElementById('munl'); if(u) u.onclick=()=>{ if(confirm(`Unlink your mutual orbit with ${f.name}? Your own logs stay.`)) unlink(f); };
  const b=document.getElementById('minv'); if(!b) return;
  b.onclick=()=>{ if(!OrbPro.pro()){ location.hash='#pro'; return; }
    const pend=st.invites.find(i=>i.fid===f.id);
    sheet(`<h3>Link orbits with ${esc(f.name)}</h3><p class="muted small">You get a code. ${esc(f.name)} enters it in their Orbit (More › Mutual orbits, or opens the link). It works once, for 7 days.</p>
      <label for="mn">Your name as ${esc(f.name)} will see it</label><input id="mn" maxlength="40" value="${esc(myName())}">
      <label for="me">Your emoji</label><input id="me" maxlength="4" value="${esc(Store.prefs().myEmoji||'😎')}">
      <button class="btn big block" id="mgo" style="margin-top:12px">${pend?'Make a new code':'Get a code'}</button><div id="mres">${pend?codeBox(pend.code,f):''}</div>`,r=>{
      $('#mgo',r).onclick=async()=>{ const name=$('#mn',r).value.trim(), emoji=$('#me',r).value.trim(); if(!name) return toast('Add your name');
        if(!on()){ location.hash='#account'; closeSheet(); return; }
        Store.savePrefs({myName:name,myEmoji:emoji}); $('#mres',r).innerHTML='<p class="muted">Making a code…</p>';
        try{ const j=await C().api('/api/mutual/invite',{fid:f.id,name,emoji}); st.invites=st.invites.filter(i=>i.fid!==f.id).concat([{code:j.code,fid:f.id,exp:j.exp}]); save(); $('#mres',r).innerHTML=codeBox(j.code,f); bindShare(r,j.code,f); }
        catch(e){ $('#mres',r).innerHTML=`<p class="muted">${e.message==='pro_required'?'Creating invites needs Orbit Pro.':e.offline?'You’re offline.':'Couldn’t make a code ('+esc(e.message)+').'}</p>`; } };
      if(pend) bindShare(r,pend.code,f); }); };
}
const joinURL=c=>'https://northpeakstudios.github.io/orbit/#join/'+c;
function codeBox(code,f){ return `<div class="codebox"><div class="code" id="mcode">${esc(code.slice(0,3)+'-'+code.slice(3))}</div><p class="muted small">Send this to ${esc(f.name)}. They’re linked as soon as they enter it.</p><div class="row"><button class="btn" id="mshare">Share</button><button class="btn ghost" id="mcopy">Copy link</button></div></div>`; }
function bindShare(r,code,f){ const txt=`Let's link orbits on Orbit 🪐 Code ${code.slice(0,3)}-${code.slice(3)}: ${joinURL(code)}`;
  const s=$('#mshare',r), c=$('#mcopy',r);
  if(s) s.onclick=async()=>{ if(navigator.share){ try{ await navigator.share({text:txt}); }catch(e){} } else { try{ await navigator.clipboard.writeText(txt); toast('Copied'); }catch(e){ toast(txt); } } };
  if(c) c.onclick=async()=>{ try{ await navigator.clipboard.writeText(joinURL(code)); toast('Link copied'); }catch(e){ toast(joinURL(code)); } }; }
/* #join[/CODE]: enter a friend's code (free) */
routes.join=async(v,code)=>{ code=String(code||'').toUpperCase().replace(/[^0-9A-Z]/g,'');
  v.innerHTML=`<p><a href="#mutual" class="muted small">‹ Mutual orbits</a></p><h2>Link orbits</h2><p class="muted">Got a code from a friend who uses Orbit? Enter it here. Joining is free.</p>
   ${on()?`<div class="card"><label for="jc">Their code</label><input id="jc" placeholder="ABC-DEF" autocapitalize="characters" autocomplete="off" value="${esc(code?code.slice(0,3)+'-'+code.slice(3):'')}"><button class="btn block" id="jpk" style="margin-top:10px">Continue</button><div id="jout"></div></div>`
   :`<div class="card"><p style="margin-top:0">Sign in first, so the link follows your account.</p><a class="btn big block" href="#account">Sign in or create account</a></div>`}`;
  if(!on()){ if(code) sessionStorage.setItem('orb.join',code); return; }
  const go=async()=>{ const c=$('#jc').value.toUpperCase().replace(/[^0-9A-Z]/g,''); if(c.length!==6){ $('#jout').innerHTML='<p class="muted">Codes are 6 letters/numbers.</p>'; return; }
    $('#jout').innerHTML='<p class="muted">Checking…</p>'; let pk; try{ pk=await C().api('/api/mutual/peek',{code:c}); }catch(e){ $('#jout').innerHTML=`<p class="muted">${e.message==='bad_code'?'That code didn’t work (wrong, used, or older than 7 days).':e.message==='own_code'?'That’s your own code. Send it to your friend.':e.offline?'You’re offline.':'Couldn’t check it ('+esc(e.message)+').'}</p>`; return; }
    const fs=Store.friends().filter(f=>!f.mpair); const guess=fs.find(f=>f.name.toLowerCase()===String(pk.name).toLowerCase());
    $('#jout').innerHTML=`<div class="jwho"><span class="av lg">${esc(pk.emoji||'🙂')}</span><div><b>${esc(pk.name)}</b><p class="muted small" style="margin:0">wants to link orbits with you</p></div></div>
     <label for="jf">Who is this in your orbit?</label><select id="jf"><option value="">➕ Add ${esc(pk.name)} as a new friend</option>${fs.map(f=>`<option value="${esc(f.id)}" ${guess===f?'selected':''}>${esc(f.emoji||'')} ${esc(f.name)}</option>`).join('')}</select>
     <label for="jn">Your name as they’ll see it</label><input id="jn" maxlength="40" value="${esc(myName())}">
     <button class="btn big block" id="jgo" style="margin-top:12px">Link orbits</button><p id="jm" class="muted"></p>`;
    $('#jgo').onclick=async()=>{ let fid=$('#jf').value, f; const name=$('#jn').value.trim(); if(!name) return $('#jm').textContent='Add your name.';
      if(!fid){ if(!OrbPro.pro()&&Store.friends().length>=FREE_MAX){ $('#jm').innerHTML='Free Orbit holds 8 friends. Pick an existing one or <a href="#pro">get Pro</a>.'; return; } f=Store.saveFriend({name:pk.name,emoji:pk.emoji||'🙂',ring:'middle',every:14,seed:Date.now()}); fid=f.id; } else f=Store.friend(fid);
      Store.savePrefs({myName:name}); $('#jm').textContent='Linking…';
      try{ const j=await C().api('/api/mutual/accept',{code:c,fid,name,emoji:Store.prefs().myEmoji||''}); f.mpair=j.pair; Store.saveFriend(f); await pull(); toast(`Linked with ${pk.name} ⇄`); location.hash='#friend/'+encodeURIComponent(fid); }
      catch(e){ $('#jm').textContent=e.message==='already_linked'?'You two are already linked.':e.message==='bad_code'?'That code just stopped working (used or expired).':'Couldn’t link ('+e.message+').'; } }; };
  $('#jpk').onclick=go; if(code.length===6) go();
};
routes.mutual=v=>{ const pro=OrbPro.pro(); const pairs=Object.entries(st.pairs);
  v.innerHTML=`<p><a href="#more" class="muted small">‹ More</a></p><h2>Mutual orbits</h2><p class="muted">Link with friends who use Orbit too. Talks either of you logs show up for both of you, and you share a weekly streak (a week counts when either of you logs a talk).</p>
   ${on()?'':'<div class="card"><p style="margin-top:0">Mutual orbits need a Northpeak account.</p><a class="btn block" href="#account">Sign in</a></div>'}
   <div class="row"><a class="btn" href="#join">Enter a code</a><a class="btn ghost" href="#friends">${pro?'Invite from a friend’s page':'Invite · Pro'}</a></div>
   <div class="hrow"><h3>Linked</h3><span class="muted small">${pairs.length}</span></div>
   ${pairs.length?`<div class="card list">${pairs.map(([id,p])=>{ const f=Store.friend(p.fid); return f?`<a class="it" href="#friend/${encodeURIComponent(f.id)}">${avatar(f)}<div class="wh"><b>${esc(f.name)}</b><small>as ${esc(p.them.emoji||'')} ${esc(p.them.name)} · ${p.n} shared logs</small></div><span class="streak sm">🔥 <b>${p.streak}</b></span></a>`:''; }).join('')}</div>`:'<div class="empty">No mutual orbits yet.</div>'}
   ${st.invites.length?`<div class="hrow"><h3>Open invites</h3></div><div class="card list">${st.invites.map(i=>{ const f=Store.friend(i.fid); return `<div class="it"><span class="kic">✉️</span><div class="wh"><b>${esc(i.code.slice(0,3)+'-'+i.code.slice(3))}</b><small>for ${esc(f?f.name:'a friend')} · expires ${esc(fmtD(i.exp))}</small></div><button class="lnk small" data-cx="${esc(i.code)}">Cancel</button></div>`; }).join('')}</div>`:''}
   <p class="muted small">Privacy: your own logs and notes sync encrypted, so only you can read them. A linked friend’s shared logs are different: they have to be readable by both of you, so the server keeps them (type of talk, time, and a note only if you tick “share”).</p>`;
  $$('[data-cx]',v).forEach(b=>b.onclick=async()=>{ try{ await C().api('/api/mutual/cancel',{code:b.dataset.cx}); }catch(e){} st.invites=st.invites.filter(i=>i.code!==b.dataset.cx); save(); route(); });
  if(Date.now()-(st.at||0)>15000) pull();
};
window.OrbMutual={pull,info,streak,logged,removed,unlink,bindCard,state:()=>st};
function boot(){ if(on()) pull(); document.addEventListener('visibilitychange',()=>{ if(!document.hidden) pull(); }); setInterval(()=>{ if(!document.hidden) pull(); },90000);
  const j=sessionStorage.getItem('orb.join'); if(j&&on()){ sessionStorage.removeItem('orb.join'); location.hash='#join/'+j; } }
if(window.Cloud) boot(); else window.addEventListener('cloud-ready',boot,{once:true});
})();
