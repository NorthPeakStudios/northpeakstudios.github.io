// Later · the vault (capsule list) and a capsule's page: countdown, conditions, opening, reveal, replies.
(function(){
const KIND={letter:'💌',group:'👥'};
function condRows(c, check, opts){ opts=opts||{}; const cond=c.cond||{}; const ck={}; (check||c.check||[]).forEach(x=>ck[x.k]=x); const rows=[];
  if(cond.date){ const x=ck.date||{}; rows.push({k:'date',ic:'🗓️',met:x.met,t:'Opens '+fmtDT(cond.date),s:x.met?'The date has come':'in <span class="cd" data-at="'+cond.date+'">'+left(cond.date-now())+'</span>'}); }
  if(cond.opens){ const x=ck.opens||{}; const n=cond.opens.n, h=x.have||0; rows.push({k:'opens',ic:'👀',met:x.met,t:'When '+(c.kind==='group'?plural(n,'member')+' have':n===1?'1 person has':n+' people have')+' opened Later',s:h+' of '+n+' so far'+(c.status==='open'?' (counts once it’s sealed)':''),p:Math.min(1,h/n)}); }
  if(cond.streak){ const x=ck.streak||{}; const n=cond.streak.n, h=x.have||0; rows.push({k:'streak',ic:'🔥',met:x.met,t:'After a '+n+'-day check-in streak',s:'Your best run since it was sealed: '+plural(h,'day')+' · <a href="#streak">check in</a>',p:Math.min(1,h/n)}); }
  if(cond.loc){ const x=ck.loc||{}; rows.push({k:'loc',ic:'📍',met:x.met,t:'At '+esc(cond.loc.hint),s:x.met?'You were there':(x.dist!=null?'You’re about '+fmtDist(x.dist)+' away':'Be within '+fmtDist(cond.loc.r)+' and tap Open')}); }
  if(cond.q){ const x=ck.q||{}; rows.push({k:'q',ic:'❓',met:x.met,t:esc(cond.q.text),s:x.met?'Answered':(x.wrong===true?'<span style="color:var(--bad)">Not quite. Try again.</span>':x.wrong==='slow_down'?'Too many guesses. Try again in an hour.':'A question only they can answer')}); }
  return rows; }
const fmtDist=m=>m>=1000?(m/1000).toFixed(m>=10000?0:1)+' km':Math.round(m)+' m';
function condHTML(c,check){ return '<ul class="conds">'+condRows(c,check).map(r=>`<li class="${r.met?'met':''}" data-k="${r.k}"><span class="ic">${r.ic}</span><span class="tx"><b>${r.t}</b><small>${r.s}</small>${r.p!=null?`<div class="prog"><i style="width:${Math.round(r.p*100)}%"></i></div>`:''}</span><span class="st">${r.met?'✓ met':'locked'}</span></li>`).join('')+'</ul>'; }
function ownerOnly(c){ return c.mine&&c.kind==='letter'&&!c.self; }
function card(c){ const cond=c.cond||{}; const st=c.unlocked||(ownerOnly(c)&&c.ownerCanRead)?'opened':(c.ready&&!ownerOnly(c)?'ready':'');
  const icons=[cond.date&&'🗓️',cond.opens&&'👀',cond.streak&&'🔥',cond.loc&&'📍',cond.q&&'❓'].filter(Boolean).join(' ');
  let right='';
  if(c.kind==='group'&&c.status==='open') right='<span class="pill new">collecting</span>';
  else if(st==='opened') right='<span class="pill">opened</span>';
  else if(st==='ready') right='<span class="pill acc">ready ✨</span>';
  else if(cond.date&&cond.date>now()) right='<span class="cd" data-at="'+cond.date+'">'+left(cond.date-now())+'</span>';
  else right='<span class="pill">🔒</span>';
  const who=c.mine?(c.self?(c.kind==='group'?'Group · you started it':'To future you'):'To '+(c.people||[]).map(p=>p.name||p.email.split('@')[0]).slice(0,3).join(', ')+((c.people||[]).length>3?' +'+((c.people||[]).length-3):'')):'From '+esc(c.from||'a friend');
  return `<a class="capc ${st}" href="#c/${c.id}"><div class="ct"><h3>${KIND[c.kind]||'💌'} ${esc(c.title)}</h3>${right}</div>${c.teaser?`<div class="tz">“${esc(c.teaser)}”</div>`:'<div style="height:6px"></div>'}<div class="meta"><span>${esc(who)}</span><span>·</span><span>${icons}</span>${c.kind==='group'?'<span>· '+plural((c.pieces||[]).length,'piece')+'</span>':''}</div></a>`; }

routes.vault=async v=>{
  if(!window.Cloud){ v.innerHTML='<p class="muted">Loading…</p>'; return; }
  const g=routeGen;
  if(!signed()){
    const ds=Store.drafts();
    v.innerHTML=`<div class="hero"><h2>Later</h2><p>Write something now. It stays locked until the moment is right: a date, a place, a streak, when everyone has opened the app, or when they answer a question only they know.</p></div>
      <a class="btn big block" href="#write">✍️ Write a capsule</a>
      <div class="card"><h3>Sealing needs a free account</h3><p class="muted" style="margin-top:0">A sealed capsule is locked on Northpeak’s server, not on your phone, so nobody (you included) can peek early. One Northpeak login works in every Northpeak app.</p><a class="btn ghost block" href="#account">Sign in or create account</a></div>
      ${ds.length?`<div class="hrow"><h3>Drafts on this phone</h3><a class="icb" href="#drafts">All</a></div><div class="card list">${ds.slice(0,4).map(d=>`<a class="it" href="#write/d/${d.id}"><span class="wh"><b>${esc(d.title||'Untitled draft')}</b><small>${esc((d.text||'').slice(0,80))}</small></span></a>`).join('')}</div>`:''}
      <a class="card" href="#reflect" style="display:block;color:var(--fg)"><h3 style="margin:0">💌 Letter to future you</h3><p class="muted" style="margin:4px 0 0">Prompts to get you started. When it opens, you write back.</p></a>`;
    return; }
  v.innerHTML=`<div class="hrow" style="margin-top:4px"><h2 style="margin:0">Vault</h2><a class="icb" href="#write">✍️ New</a></div><p class="muted" id="vst">Loading your capsules…</p><div id="vl"></div>`;
  let j; try{ j=await Caps.load(true); }catch(e){ if(g!==routeGen) return; $('#vst').innerHTML=e.offline?'You’re offline. Your capsules are locked on the server, so the vault needs a connection.':errText(e); return; }
  if(g!==routeGen) return;
  const cs=j.caps, ready=[], coll=[], locked=[], sent=[], opened=[];
  for(const c of cs){ if(c.kind==='group'&&c.status==='open') coll.push(c); else if(ownerOnly(c)) sent.push(c); else if(c.unlocked) opened.push(c); else if(c.ready) ready.push(c); else locked.push(c); }
  locked.sort((a,b)=>((a.cond.date||9e15)-(b.cond.date||9e15)));
  const sec=(t,a,sub)=>a.length?`<div class="hrow"><h3>${t}</h3>${sub||''}</div><div class="caps">${a.map(card).join('')}</div>`:'';
  $('#vst').innerHTML=cs.length?(j.pro?'⭐ Pro: unlimited capsules':`Free plan: ${j.active} of ${j.freeMax} active capsules · <a href="#pro">Pro</a> adds places, streaks, questions, groups, photos and voice.`):'';
  $('#vl').innerHTML=(cs.length?'':`<div class="hero"><h2>Your vault is empty</h2><p>Seal your first capsule. Maybe a letter to yourself for a year from now?</p></div><a class="btn big block" href="#reflect">💌 Letter to future you</a><a class="btn ghost block" href="#write">Write something else</a><a class="btn ghost block" href="#join">I have a code from a friend</a>`)
    +sec('Ready to open ✨',ready)+sec('Collecting pieces',coll)+sec('Sealed',locked)+sec('Sent by you',sent)+sec('Opened',opened);
  badge();
};

routes.c=async (v,id)=>{
  if(!window.Cloud){ v.innerHTML='<p class="muted">Loading…</p>'; return; }
  const g=routeGen;
  if(!signed()){ v.innerHTML='<div class="card"><p style="margin-top:0">Sign in to see this capsule.</p><a class="btn block" href="#account">Sign in</a></div>'; return; }
  let c=Caps.one(id); if(c) draw(v,c); else v.innerHTML='<p class="muted">Loading…</p>';
  try{ const j=await Caps.api('/api/caps/one?id='+encodeURIComponent(id)); c=j.cap; Caps.put(c); }catch(e){ if(g!==routeGen) return; if(!c) v.innerHTML=`<div class="card"><p style="margin-top:0">${e.message==='not_found'?'That capsule isn’t in your vault (it may have been deleted).':errText(e)}</p><a class="btn ghost" href="#vault">Back to the vault</a></div>`; return; }
  if(g!==routeGen) return;
  draw(v,c);
  if(c.unlocked||(ownerOnly(c)&&c.ownerCanRead)) tryOpen(v,c,true);
};
function draw(v,c){
  const cond=c.cond||{};
  const groupOpen=c.kind==='group'&&c.status==='open';
  const who=c.mine?(c.self?(c.kind==='group'?'Group capsule you started':'From you, to future you'):'From you'):'From '+esc(c.from||'a friend');
  let h=`<p class="muted small" style="margin:0"><a href="#vault">‹ Vault</a></p><div class="center"><div class="lockic2">${groupOpen?'🧺':'🔒'}</div><h2 style="margin:4px 0 2px">${esc(c.title)}</h2><p class="muted" style="margin:0">${who} · ${groupOpen?'started':'sealed'} ${fmtD(c.sealed||c.created)}</p>${c.teaser?`<p class="tz" style="color:#e9d8c8;font-style:italic;margin:8px 0 0">“${esc(c.teaser)}”</p>`:''}</div>`;
  if(cond.date&&cond.date>now()&&!c.unlocked) h+=`<div class="cdbig" data-big="${cond.date}"><div><b>0</b><span>days</span></div><div><b>00</b><span>hrs</span></div><div><b>00</b><span>min</span></div><div><b>00</b><span>sec</span></div></div>`;
  h+='<div id="cbody">';
  if(groupOpen){
    h+=`<div class="card"><h3>Collecting pieces</h3><p class="muted" style="margin-top:0">Friends join with this code and add their piece. Nobody can read anyone’s piece until it opens, then everyone sees everything at once.</p><div class="codebox">${esc(c.code)}</div><div class="row"><button class="btn" id="shr">Share invite</button><a class="btn ghost" href="#join/${esc(c.code)}">${c.myPiece!=null?'Edit my piece':'Add my piece'}</a></div>
      <p class="muted small">${plural((c.pieces||[]).length,'piece')} so far: ${(c.pieces||[]).map(p=>esc(p.name)+(p.me?' (you)':'')).join(', ')||'none yet'}</p>
      ${c.mine?'<button class="btn ghost block" id="seal">Seal it now (no more pieces)</button>':''}${cond.date?'<p class="muted small" style="margin-bottom:0">It also seals by itself on '+fmtDT(cond.date)+'.</p>':''}</div>`;
  }
  if(ownerOnly(c)&&!c.ownerCanRead) h+=`<div class="note">Sealed. You wrote it, but you can’t read it again until someone it’s for opens it.</div>`;
  h+=`<div class="card"><h3>Opens when ${Object.keys(cond).length>1?'all of these are true':'this is true'}</h3>${condHTML(c)}`;
  const canTry=!ownerOnly(c)&&!groupOpen;
  if(canTry){
    if(cond.q&&!(c.check||[]).some(x=>x.k==='q'&&x.met)) h+=`<label>Your answer</label><input id="ans" autocomplete="off" autocapitalize="none" placeholder="Type the answer">`;
    h+=`<button class="btn big block" id="opn" style="margin-top:12px">${c.ready?'Open it ✨':cond.loc?'I’m here, try to open':'Try to open'}</button><p class="muted small" id="omsg" style="margin-bottom:0">${cond.loc?'Opening checks your location once, only when you tap. It’s compared on the server and never saved.':''}</p>`;
  }
  h+='</div>';
  if(c.mine&&c.people&&c.people.length&&!(c.self&&c.kind==='letter'&&c.people.length===1)) h+=`<div class="card"><h3>${c.kind==='group'?'Members':'Who it’s for'}</h3><div class="ppl">${c.people.map(p=>`<span class="${p.unlocked?'ok':''}">${esc(p.name||p.email)}${p.unlocked?' · opened':p.joined?'':' · not on Later yet'}${p.replied?' · replied':''}</span>`).join('')}</div>${c.people.some(p=>!p.joined)?'<p class="muted small" style="margin-bottom:0">People not on Later yet see it as soon as they sign up with that email.</p>':''}</div>`;
  if(c.code&&(c.mine||c.kind==='group')&&!groupOpen&&(c.kind==='group'||c.mine)) h+=`<details class="fold"><summary>Share code</summary><div class="codebox">${esc(c.code)}</div><p class="muted small">${c.kind==='group'?'Members use this code.':'Anyone with this code can add it to their vault (it still opens only when its conditions are met).'}</p><button class="btn ghost" id="shr2">Share</button></details>`;
  h+='</div>';
  h+=`<p class="center" style="margin-top:18px"><button class="lnk" id="del" style="color:var(--bad)">${c.mine?'Delete this capsule for everyone':'Remove from my vault'}</button></p>`;
  v.innerHTML=h; tick();
  const share=async()=>{ const url=location.origin+location.pathname+'#join/'+c.code; const text=(c.kind==='group'?'Add your piece to our time capsule “'+c.title+'” on Later: ':'A time capsule for you on Later: ')+url+' (code '+c.code+')';
    try{ if(navigator.share){ await navigator.share({title:'Later',text}); return; } }catch(e){ if(e&&e.name==='AbortError') return; }
    try{ await navigator.clipboard.writeText(text); toast('Invite copied'); }catch(e){ prompt('Copy this invite',text); } };
  const s1=$('#shr'), s2=$('#shr2'); if(s1) s1.onclick=share; if(s2) s2.onclick=share;
  const se=$('#seal'); if(se) se.onclick=async()=>{ if(!confirm('Seal it now? Nobody can add or change a piece after this.')) return; se.disabled=true; try{ const j=await Caps.api('/api/caps/seal',{id:c.id}); Caps.put(j.cap); toast('Sealed 🔒'); route(); }catch(e){ se.disabled=false; toast(errText(e)); } };
  const o=$('#opn'); if(o) o.onclick=()=>tryOpen(v,c,false);
  $('#del').onclick=async()=>{ if(!confirm(c.mine?'Delete it for everyone? This can’t be undone.':'Remove it from your vault?')) return; try{ await Caps.api('/api/caps/delete',{id:c.id}); Caps.drop(c.id); toast(c.mine?'Deleted':'Removed'); go('vault'); }catch(e){ toast(errText(e)); } };
}
function geo(){ return new Promise((ok,no)=>{ if(!navigator.geolocation) return no(new Error('no_geo')); navigator.geolocation.getCurrentPosition(p=>ok(p.coords),e=>no(new Error(e.code===1?'geo_denied':'geo_fail')),{enableHighAccuracy:true,timeout:15000,maximumAge:0}); }); }
async function tryOpen(v,c,quiet){
  const g=routeGen, o=$('#opn'), msg=$('#omsg'); const body={id:c.id}; const cond=c.cond||{};
  if(!quiet){
    if(cond.loc&&!(c.check||[]).some(x=>x.k==='loc'&&x.met)){ if(msg) msg.textContent='Checking where you are…'; try{ const p=await geo(); body.lat=p.latitude; body.lng=p.longitude; body.acc=p.accuracy; }catch(e){ if(msg) msg.textContent=e.message==='geo_denied'?'Location is off for this site. Turn it on in Settings › Safari › Location (or your browser’s site settings) and try again.':'Couldn’t get your location. Try again outside or with Wi-Fi on.'; return; } }
    const a=$('#ans'); if(a&&a.value.trim()) body.answer=a.value;
    if(o){ o.disabled=true; o.textContent='Checking…'; }
  }
  let j; try{ j=await Caps.api('/api/caps/open',body); }catch(e){ if(o){ o.disabled=false; o.textContent='Try to open'; } if(msg) msg.textContent=errText(e); return; }
  if(g!==routeGen) return;
  if(j.cap) Caps.put(j.cap);
  if(!j.open){ if(quiet) return; draw(v,Object.assign({},j.cap,{check:j.check||j.cap.check}));
    const m2=$('#omsg'); if(m2) m2.textContent=j.collecting?'It’s still collecting pieces.':j.why==='sealed_for_you'?'You can read it once someone it’s for opens it.':'Not yet. Everything above has to be true at the same time.'; return; }
  reveal(v,j.cap,j.content,j.first);
}
function reveal(v,c,ct,first){
  const own=ownerOnly(c);
  let h=`<p class="muted small" style="margin:0"><a href="#vault">‹ Vault</a></p><div class="center">${first?'<div class="sealanim">📬</div>':''}<h2 style="margin:4px 0 2px">${esc(c.title)}</h2><p class="muted" style="margin:0">${c.kind==='group'?'Group capsule · '+plural(ct.pieces.length,'piece'):(c.mine&&c.self?'From you, ':'From '+esc(ct.from)+', ')+'written '+fmtD(ct.written)} · opened ${fmtD(c.unlockedAt||now())}</p></div><div class="reveal">`;
  if(ct.prompt) h+=`<p class="muted small" style="margin:12px 0 -4px">Prompt: ${esc(ct.prompt)}</p>`;
  if(c.kind!=='group'){ if(ct.text) h+=`<div class="letter">${esc(ct.text)}</div>`; h+=mediaHTML(ct.media); }
  else ct.pieces.forEach(p=>{ h+=`<div class="piece"><div class="who">${esc(p.name)}</div>${p.text?`<div class="tx">${esc(p.text)}</div>`:''}${mediaHTML(p.media)}</div>`; });
  if(ct.replies.length) h+='<h3 style="margin-top:18px">Written back</h3>'+ct.replies.map(r=>`<div class="reply"><div class="who">${esc(r.name)} · ${fmtD(r.t)}</div>${esc(r.text)}</div>`).join('');
  if(!own&&c.unlocked){ const mine=ct.replies.find(r=>false); h+=`<div class="card"><h3>${c.self&&c.kind==='letter'?'Write back to past you':'Write back'}</h3><p class="muted small" style="margin-top:0">Your reply is attached to this capsule${c.self?'':' for everyone who can read it'}.${c.self?' Future-future you will thank you.':''}</p><textarea id="rp" rows="4" placeholder="${c.self?'Dear past me…':'What this meant to me…'}"></textarea><button class="btn block" id="rps" style="margin-top:8px">Attach reply</button></div>`; }
  h+='</div>';
  h+=`<p class="center" style="margin-top:18px"><button class="lnk" id="del" style="color:var(--bad)">${c.mine?'Delete this capsule for everyone':'Remove from my vault'}</button></p>`;
  v.innerHTML=h;
  loadMedia(v,c);
  const rs=$('#rps'); if(rs) rs.onclick=async()=>{ const t=$('#rp').value.trim(); if(!t) return toast('Write something first'); rs.disabled=true; try{ const j=await Caps.api('/api/caps/reply',{id:c.id,text:t}); toast('Reply attached ✓'); reveal(v,c,j.content,false); }catch(e){ rs.disabled=false; toast(errText(e)); } };
  $('#del').onclick=async()=>{ if(!confirm(c.mine?'Delete it for everyone? This can’t be undone.':'Remove it from your vault?')) return; try{ await Caps.api('/api/caps/delete',{id:c.id}); Caps.drop(c.id); toast(c.mine?'Deleted':'Removed'); go('vault'); }catch(e){ toast(errText(e)); } };
  if(first){ Caps.load(true).catch(()=>{}); }
}
function mediaHTML(ms){ if(!ms||!ms.length) return ''; const im=ms.filter(m=>m.kind==='img'), vo=ms.filter(m=>m.kind==='voice');
  return (im.length?`<div class="photos ${im.length===1?'one':''}">${im.map(m=>`<img data-m="${m.id}" alt="Photo in the capsule">`).join('')}</div>`:'')+vo.map(m=>`<p class="muted small" style="margin:8px 0 0">🎙️ Voice note</p><audio controls preload="metadata" data-m="${m.id}"></audio>`).join(''); }
async function loadMedia(v,c){ for(const el of v.querySelectorAll('[data-m]')){ try{ const d=await Caps.getMedia(c.id,el.dataset.m); el.src=d; }catch(e){ el.replaceWith(Object.assign(document.createElement('p'),{className:'muted small',textContent:'Couldn’t load this ('+(e.message||'error')+').'})); } } }
window.LtrVault={condHTML,card};
})();
