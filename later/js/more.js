// Later · daily check-ins (streak unlocks), joining by code (group pieces), More, How it works, About.
(function(){
routes.streak=async v=>{
  if(!window.Cloud){ v.innerHTML='<p class="muted">Loading…</p>'; return; }
  const g=routeGen;
  if(!signed()){ v.innerHTML=`<h2>Check in</h2><div class="hero"><h2>🔥 Streak unlocks</h2><p>Lock a capsule behind a streak: “open after I check in 30 days in a row.” Check-ins are counted on Northpeak’s server so the streak is real.</p></div><a class="btn big block" href="#account">Sign in to start your streak</a>`; return; }
  v.innerHTML=`<h2>Check in</h2><p class="muted" id="sst">Loading…</p><div id="sw"></div>`;
  let j; try{ j=await Caps.api('/api/checkins?today='+Store.dayKey()); }catch(e){ if(g===routeGen) $('#sst').textContent=errText(e); return; }
  if(g!==routeGen) return; render(v,j);
};
function render(v,j){
  const today=Store.dayKey(), done=j.days.includes(today), set=new Set(j.days);
  const cells=[]; const end=new Date(); end.setHours(12,0,0,0); const start=new Date(end); start.setDate(start.getDate()-55); while(start.getDay()!==0) start.setDate(start.getDate()-1);
  for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)){ const k=Store.dayKey(d.getTime()); cells.push(`<i class="${set.has(k)?'on':''} ${k===today?'today':''}" title="${k}"></i>`); }
  const sc=(Caps.list?Caps.list.caps:[]).filter(c=>c.cond&&c.cond.streak&&!c.unlocked&&!(c.mine&&c.kind==='letter'&&!c.self));
  $('#sst').textContent=done?'Checked in today ✓':'One tap a day. Miss a day and the streak starts over.';
  $('#sw').innerHTML=`<button class="bigcheck" id="ci" ${done?'disabled':''}>${done?'🔥 Done for today':'🔥 Check in today'}</button>
    ${done?'':'<input id="cn" maxlength="140" placeholder="One line about today (optional)" style="margin-top:6px">'}
    <div class="stat" style="margin-top:12px"><div><b>${j.current}</b><span>day streak</span></div><div><b>${j.best}</b><span>best run</span></div><div><b>${j.total}</b><span>check-ins</span></div></div>
    <div class="card"><h3>Last 8 weeks</h3><div class="heat">${cells.join('')}</div></div>
    ${sc.length?`<div class="card"><h3>Capsules waiting on a streak</h3>${sc.map(c=>{ const x=(c.check||[]).find(k=>k.k==='streak')||{}; const n=c.cond.streak.n, h=x.have||0; return `<a href="#c/${c.id}" style="display:block;color:var(--fg);padding:8px 0;border-bottom:1px solid #222a35"><b>${esc(c.title)}</b><div class="muted small">${h} of ${n} days in a row since it was sealed</div><div class="prog"><i style="width:${Math.min(100,Math.round(h/n*100))}%"></i></div></a>`; }).join('')}</div>`:`<p class="muted small">No capsules are waiting on a streak. <a href="#write">Lock one behind a streak</a>${P()?'':' (Pro)'}.</p>`}
    ${j.notes&&j.notes.length?`<details class="fold"><summary>Your check-in lines</summary>${j.notes.slice(0,30).map(n=>`<p style="margin:6px 0"><span class="muted small">${esc(n.day)}</span><br>${esc(n.note)}</p>`).join('')}</details>`:''}`;
  const b=$('#ci'); if(b&&!done) b.onclick=async()=>{ b.disabled=true; try{ const r=await Caps.api('/api/checkin',{day:today,note:($('#cn')||{}).value||''}); toast(r.current>1?'🔥 '+r.current+' days in a row':'🔥 Checked in'); await Caps.load(true).catch(()=>{}); render(v,r); }catch(e){ b.disabled=false; toast(errText(e)); } };
}

routes.join=async (v,code)=>{
  if(!window.Cloud){ v.innerHTML='<p class="muted">Loading…</p>'; return; }
  code=String(code||'').toUpperCase().replace(/[^0-9A-Z]/g,'').slice(0,6);
  if(!signed()){ if(code) try{ localStorage.setItem('ltr.pendingJoin',code); }catch(e){}
    v.innerHTML=`<h2>Group capsules</h2><div class="hero"><h2>👥 Add your piece</h2><p>A friend started a time capsule. Join with their code, add your piece, and nobody (them included) sees anything until it opens. Then everyone sees all of it at once.</p></div>${code?`<div class="codebox">${esc(code)}</div>`:''}<a class="btn big block" href="#account">Sign in to join${code?' (we’ll bring you back here)':''}</a><p class="muted small center">Free. One Northpeak login for every Northpeak app.</p>`; return; }
  try{ localStorage.removeItem('ltr.pendingJoin'); }catch(e){}
  if(!code){
    const groups=(Caps.list?Caps.list.caps:[]).filter(c=>c.kind==='group');
    v.innerHTML=`<h2>Group capsules</h2><p class="muted">Got a code from a friend? Type it to join and add your piece. Or start one and send your friends the code.</p>
      <div class="card"><label>Code</label><input id="jc" maxlength="8" autocapitalize="characters" autocomplete="off" placeholder="ABC123" style="text-transform:uppercase;letter-spacing:3px;font-weight:700"><button class="btn big block" id="jg" style="margin-top:10px">Join</button><p class="muted small" id="jm"></p></div>
      <a class="btn ghost block" href="#write/group">👥 Start a group capsule${P()?'':' (Pro)'}</a>
      ${groups.length?`<div class="hrow"><h3>Your group capsules</h3></div><div class="caps">${groups.map(LtrVault.card).join('')}</div>`:''}`;
    const go_=()=>{ const c=$('#jc').value.toUpperCase().replace(/[^0-9A-Z]/g,''); if(c.length!==6) return $('#jm').textContent='Codes are 6 letters/numbers.'; location.hash='join/'+c; };
    $('#jg').onclick=go_; $('#jc').addEventListener('keydown',e=>{ if(e.key==='Enter') go_(); }); return; }
  v.innerHTML='<p class="muted">Joining…</p>'; const g=routeGen;
  let j; try{ j=await Caps.api('/api/caps/join',{code}); }catch(e){ if(g!==routeGen) return; v.innerHTML=`<div class="card"><p style="margin-top:0">${errText(e)}</p><a class="btn ghost" href="#join">Try another code</a></div>`; return; }
  if(g!==routeGen) return; const c=j.cap; Caps.put(c);
  if(c.kind!=='group'||c.status!=='open'){ toast(c.kind==='group'?'Joined. It’s already sealed.':'Added to your vault 🔒'); location.replace('#c/'+c.id); return; }
  let media=[];
  v.innerHTML=`<p class="muted small" style="margin:0"><a href="#join">‹ Group capsules</a></p><div class="center"><div class="lockic2">🧺</div><h2 style="margin:4px 0 2px">${esc(c.title)}</h2><p class="muted" style="margin:0">Started by ${esc(c.mine?'you':c.from)} · ${plural((c.pieces||[]).length,'piece')} so far</p>${c.teaser?`<p style="color:#e9d8c8;font-style:italic;margin:8px 0 0">“${esc(c.teaser)}”</p>`:''}</div>
    <div class="card"><h3>${c.myPiece!=null?'Edit your piece':'Add your piece'}</h3><p class="muted small" style="margin-top:0">Nobody can read it until the capsule opens${c.cond&&c.cond.date?' ('+fmtD(c.cond.date)+' or later)':''}. You can change it until it’s sealed.</p>
    <label>Your name</label><input id="pn" maxlength="40" placeholder="How your piece is signed" value="${esc(((c.pieces||[]).find(p=>p.me)||{}).name||'')}">
    <label>Your piece</label><textarea id="pt" rows="7" placeholder="Write something for the group…">${esc(c.myPiece||'')}</textarea>
    <div class="thumbs" id="th"></div><div class="row"><button type="button" class="btn ghost sm" id="addp">📷 Photos${P()?'':' ★'}</button><button type="button" class="btn ghost sm" id="addv">🎙️ Voice${P()?'':' ★'}</button></div><input type="file" id="pf" accept="image/*" multiple hidden><div id="recw"></div>
    <button class="btn big block" id="ps" style="margin-top:12px">Lock in my piece</button><p class="muted small" id="pm"></p></div>
    <div class="card"><h3>Opens when</h3>${LtrVault.condHTML(c)}</div>`;
  const th=()=>{ $('#th').innerHTML=media.map((m,i)=>m.kind==='img'?`<div class="th"><img src="${m.data}" alt="Photo ${i+1}"><button type="button" class="x" data-rm="${i}" aria-label="Remove photo">✕</button></div>`:`<div style="flex:1 1 100%"><audio controls src="${m.data}"></audio> <button type="button" class="lnk" data-rm="${i}" style="color:var(--bad)">Remove</button></div>`).join(''); };
  $('#th').addEventListener('click',e=>{ const b=e.target.closest('[data-rm]'); if(b){ media.splice(+b.dataset.rm,1); th(); } });
  const pro=()=>{ if(P()) return true; sheet(`<div class="center"><div class="lockic">⭐</div><h3>Photos and voice are Later Pro</h3><p class="muted">Your text piece is free.</p><a class="btn big block" href="#pro">Get Pro · $35</a><button class="btn ghost block" data-close="1">Not now</button></div>`); return false; };
  $('#addp').onclick=()=>{ if(!pro()) return; if(media.filter(m=>m.kind==='img').length>=2) return toast('Up to 2 photos per piece'); $('#pf').click(); };
  $('#pf').onchange=async()=>{ const pf=$('#pf'); const fs=[...pf.files].slice(0,2-media.filter(m=>m.kind==='img').length); pf.value=''; for(const f of fs){ try{ media.push(await LtrMedia.photo(f)); }catch(e){ toast('Couldn’t read that photo'); } } th(); };
  let rh=null; $('#addv').onclick=async()=>{ if(!pro()) return; if(media.some(m=>m.kind==='voice')) return toast('One voice note per piece'); try{ rh=await LtrMedia.record(s=>{ const t=$('#rect'); if(t) t.textContent=s+' / 60 s'; }); }catch(e){ return toast('Microphone is off or not available.'); }
    $('#recw').innerHTML='<div class="rec" style="margin-top:8px"><span class="dotr"></span><span id="rect">0 / 60 s</span><button type="button" class="btn sm" id="recs">Stop</button></div>'; $('#recs').onclick=async()=>{ const r=await rh.stop(); $('#recw').innerHTML=''; if(r){ media.push(r); th(); } }; };
  $('#ps').onclick=async()=>{ const b=$('#ps'); const text=$('#pt').value.trim(); if(!text&&!media.length) return $('#pm').textContent='Write something first.'; b.disabled=true; b.textContent='Locking in…';
    try{ const r=await Caps.api('/api/caps/piece',{id:c.id,text,name:$('#pn').value.trim(),media}); Caps.put(r.cap); toast('Your piece is in 🔒'); location.replace('#c/'+c.id); }catch(e){ b.disabled=false; b.textContent='Lock in my piece'; $('#pm').innerHTML='<span style="color:var(--bad)">'+errText(e)+'</span>'; } };
};

routes.more=v=>{
  const a=window.Cloud&&Cloud.acct;
  v.innerHTML=`<h2>More</h2><div class="card list">
    <a class="it" href="#account"><span class="wh"><b>👤 Account</b><small>${signed()?esc(a.user):'Sign in or create a Northpeak account'}</small></span></a>
    <a class="it" href="#pro"><span class="wh"><b>⭐ Later Pro</b><small>${P()?'You have Pro':'Places, streaks, questions, groups, photos, voice, unlimited'}</small></span></a>
    <a class="it" href="#drafts"><span class="wh"><b>📝 Drafts</b><small>${plural(Store.drafts().length,'draft')}</small></span></a>
    <a class="it" href="#reflect"><span class="wh"><b>💌 Letter to future you</b><small>Prompts, and a reply when it opens</small></span></a>
    <a class="it" href="#join"><span class="wh"><b>🔑 Join with a code</b><small>Add your piece to a friend’s capsule</small></span></a>
    <a class="it" href="#how"><span class="wh"><b>❔ How unlocking works</b><small>What’s checked, where, and what’s private</small></span></a>
    <button class="it lnk" id="cmds" style="width:100%;text-align:left;color:var(--fg)"><span class="wh"><b>🔎 Commands</b><small>Search everything Later can do</small></span></button>
    <a class="it" href="#about"><span class="wh"><b>ℹ️ About</b><small>Later 1.0 · Northpeak Studios</small></span></a></div>`;
  $('#cmds').onclick=palette;
};
routes.how=v=>{
  v.innerHTML=`<h2>How unlocking works</h2>
  <div class="card"><h3>Sealed means sealed</h3><p class="muted" style="margin-top:0">When you seal a capsule, its words, photos and voice go to Northpeak’s server and stop coming back to any phone. The server hands them over only to someone it’s for, and only once every condition is true. The app never has a copy to peek at, and that includes you.</p></div>
  <div class="card"><ul class="conds">
   <li><span class="ic">🗓️</span><span class="tx"><b>A date</b><small>Checked against the server’s clock, so changing your phone’s time doesn’t help.</small></span></li>
   <li><span class="ic">👀</span><span class="tx"><b>When people have opened Later</b><small>Counts the people it’s for who opened the app after it was sealed. Good for “once the whole group is here”.</small></span></li>
   <li><span class="ic">🔥</span><span class="tx"><b>A check-in streak</b><small>The opener’s check-ins on the Check in tab, days in a row, counted after sealing.</small></span></li>
   <li><span class="ic">📍</span><span class="tx"><b>A place</b><small>When you tap Open, your phone shares its location once. The server compares it with the spot and forgets it. The exact spot is never shown, only the name the writer gave it.</small></span></li>
   <li><span class="ic">❓</span><span class="tx"><b>A question</b><small>Capitals, spaces and punctuation don’t matter. 8 guesses an hour.</small></span></li></ul>
   <p class="muted small" style="margin-bottom:0">With several conditions, all must be true at the same moment. Once a capsule opens for you, it stays open.</p></div>
  <div class="card"><h3>Group capsules</h3><p class="muted" style="margin-top:0">The starter shares a code. Each friend adds one piece (and can edit it) until the starter seals it or its date arrives. Then the conditions apply, and everyone sees every piece at once.</p></div>
  <div class="card"><h3>Privacy</h3><p class="muted" style="margin-top:0">Drafts and settings are encrypted on your phone before they sync. Sealed capsules can’t be, because the server has to be able to hand them to the person they’re for, so they’re stored on Northpeak’s server and only sent once unlocked. The writer can delete a capsule for everyone at any time.</p></div>`;
};
routes.about=v=>{
  v.innerHTML=`<div class="center" style="margin-top:10px"><img src="icon-192.png" alt="" width="84" height="84" style="border-radius:20px"><h2 style="margin:8px 0 0">Later</h2><p class="muted" style="margin:2px 0">Version 1.0 · Northpeak Studios</p></div>
  <div class="card"><h3>New in 1.0</h3><p class="muted" style="margin-top:0">Time capsules that open on a date, at a place, after a streak, once everyone has opened Later, or when they answer a question only they know. Group capsules with a code. Letter-to-future-you prompts and replies. Photos and voice notes.</p></div>
  <p class="muted small center">Part of Northpeak: Synapse, Axon, Liminal, Cadence, Mindprint, Trace and Later. One login, and All-Access unlocks every app.</p>
  <p class="center"><a href="https://northpeakstudios.github.io/">northpeakstudios.github.io</a></p>`;
};
})();
