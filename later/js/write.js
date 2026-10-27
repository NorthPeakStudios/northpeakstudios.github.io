// Later · writing a capsule: who it's for, the letter, photos + voice, and the unlock conditions. Drafts + reflection prompts.
(function(){
const PROMPTS=[
  ['What are you worried about right now?','Future you will know how it turned out.'],
  ['What does a normal day look like for you right now?','The boring details are the ones you forget first.'],
  ['Who are the people you talk to most these days?','And what you think of them.'],
  ['What are you trying to get better at?','Check back in a year: did you?'],
  ['What song, show or game are you obsessed with?','Future you will cringe or smile.'],
  ['What do you hope has changed by the time you read this?',''],
  ['What would you tell yourself a year ago?','Then ask what future you would tell you now.'],
  ['What are you proud of this month?','Small counts.'],
  ['What’s a goal you haven’t told anyone?','Sealed. Nobody reads it early.'],
  ['What do you think you’ll be doing in 5 years?','Make a real guess.'],
  ['What’s something you want to remember about today?',''],
  ['Write a promise to future you.','Then lock it behind a 30-day streak.'],
];
window.LtrPrompts=PROMPTS;
let D=null, media=[], recH=null;
const blank=()=>({kind:'letter',to:'me',emails:'',title:'',teaser:'',prompt:'',text:'',from:'',c:{date:{on:true,v:''},opens:{on:false,n:1},streak:{on:false,n:30},loc:{on:false,lat:null,lng:null,r:150,hint:''},q:{on:false,text:'',a:''}}});
const DAY=864e5;
function proGate(what){ sheet(`<div class="center"><div class="lockic">⭐</div><h3>${esc(what)} is part of Later Pro</h3><p class="muted">Pro adds place, streak, question and “everyone opened it” unlocks, group capsules, photos and voice notes, and unlimited capsules. Free: date capsules with text, 3 at a time.</p><a class="btn big block" href="#pro">Get Pro · $35</a><button class="btn ghost block" data-close="1">Not now</button></div>`); }
routes.write=(v,a,b)=>{
  media=[]; if(recH){ try{ recH.cancel(); }catch(e){} recH=null; }
  D=blank();
  if(a==='d'&&b&&Store.draft(b)){ D=Object.assign(blank(),JSON.parse(JSON.stringify(Store.draft(b)))); D.c=Object.assign(blank().c,D.c||{}); }
  else if(a==='p'&&PROMPTS[+b]){ D.prompt=PROMPTS[+b][0]; D.title='Letter to future me'; D.c.date.v=localISO(Date.now()+365*DAY).slice(0,10)+'T09:00'; }
  else if(a==='group'){ D.kind='group'; D.title=''; }
  else if(a==='loc'){ D.c.loc.on=true; D.c.date.on=false; }
  else if(a==='q'){ D.c.q.on=true; D.to='friends'; }
  else if(a==='date'){ D.c.date.on=true; }
  if(!D.c.date.v) D.c.date.v=localISO(Date.now()+30*DAY).slice(0,10)+'T09:00';
  if(!P()&&(a==='group'||a==='loc'||a==='q')){ setTimeout(()=>proGate(a==='group'?'Group capsules':a==='loc'?'Place unlocks':'Question unlocks'),100); }
  draw(v);
};
function draw(v){
  const pro=P(), c=D.c, grp=D.kind==='group';
  const opt=(k,ic,title,isPro,body)=>`<div class="opt ${c[k].on?'':'off'}" data-k="${k}"><label class="oh" style="margin:0;color:var(--fg)"><span class="ic">${ic}</span><b>${title}</b>${isPro&&!pro?'<span class="pro-tag">Pro</span>':''}<input type="checkbox" ${c[k].on?'checked':''} data-on="${k}" aria-label="${esc(title)}"></label><div class="ob">${body}</div></div>`;
  v.innerHTML=`<div class="hrow" style="margin-top:4px"><h2 style="margin:0">${grp?'Group capsule':'New capsule'}</h2><a class="icb" href="#drafts">📝 Drafts</a></div>
  <div class="seg" id="kind"><a href="#" data-kind="letter" class="${grp?'':'on'}">💌 Letter</a><a href="#" data-kind="group" class="${grp?'on':''}">👥 Group${pro?'':' ★'}</a></div>
  ${grp?`<p class="muted small" style="margin-top:0">You start it and add your piece. Friends join with a code and add theirs. Nobody sees any piece until it opens, then everyone sees all of them at once.</p>`:`
  <label>Who is it for?</label><div class="chips" id="to"><button type="button" class="chip ${D.to==='me'?'on':''}" data-to="me">Future me</button><button type="button" class="chip ${D.to==='friends'?'on':''}" data-to="friends">Friends</button><button type="button" class="chip ${D.to==='link'?'on':''}" data-to="link">Anyone with the code</button></div>
  <div id="emw" ${D.to==='friends'?'':'hidden'}><label>Their emails (the ones they use for Northpeak)</label><textarea id="em" rows="2" placeholder="sam@example.com, alex@example.com">${esc(D.emails)}</textarea><p class="muted small" style="margin:4px 0 0">Not on Later yet? They’ll find it in their vault when they sign up with that email. You also get a code to send them.</p></div>`}
  <label>Title</label><input id="ti" maxlength="80" placeholder="${grp?'Class of 2030':'Open when you’re 18'}" value="${esc(D.title)}">
  <label>Teaser (shown on the locked card)</label><input id="tz" maxlength="140" placeholder="${grp?'What we were like this year':'You’re going to laugh at this'}" value="${esc(D.teaser)}">
  ${D.prompt?`<div class="note" id="prn">Prompt: ${esc(D.prompt)} <button class="lnk" id="prx" style="float:right">✕</button></div>`:`<p class="muted small" style="margin:8px 0 0">Stuck? <a href="#reflect">Letter-to-future-you prompts</a></p>`}
  <label>${grp?'Your piece':'Your letter'}</label><textarea id="tx" rows="9" placeholder="${grp?'Write your piece…':'Dear future me…'}">${esc(D.text)}</textarea>
  <div class="row" style="margin-top:4px"><div><label>Sign it as</label><input id="fr" maxlength="40" placeholder="Your name" value="${esc(D.from)}"></div></div>
  <div class="card" style="margin-top:14px"><div class="hrow" style="margin:0"><h3 style="margin:0">Photos &amp; voice</h3>${pro?'':'<span class="pro-tag">Pro</span>'}</div>
    <div class="thumbs" id="th"></div>
    <div class="row"><button type="button" class="btn ghost sm" id="addp">📷 Add photos</button><button type="button" class="btn ghost sm" id="addv">🎙️ Record voice</button></div>
    <input type="file" id="pf" accept="image/*" multiple hidden><div id="recw"></div>
    <p class="muted small" style="margin-bottom:0">Up to 4 photos (shrunk on your phone first) and one voice note up to 60 s. They aren’t kept in drafts.</p></div>
  <h3 style="margin-top:18px">Unlock when…</h3><p class="muted small" style="margin-top:-6px">Turn on one or more. With several, all must be true.</p>
  ${opt('date','🗓️',grp?'On a date (it also stops taking pieces then)':'On a date',false,`<input type="datetime-local" id="dt" value="${esc(c.date.v)}"><div class="chips" id="dq"><button type="button" class="chip sub" data-d="1">Tomorrow</button><button type="button" class="chip sub" data-d="30">1 month</button><button type="button" class="chip sub" data-d="182">6 months</button><button type="button" class="chip sub" data-d="365">1 year</button><button type="button" class="chip sub" data-d="1826">5 years</button></div>`)}
  ${opt('opens','👀',grp?'When members have opened Later':'When people it’s for have opened Later',true,`<div class="row"><input type="number" id="on" min="1" max="50" value="${c.opens.n}" inputmode="numeric"><span class="muted small fx0">${grp?'members (after it’s sealed)':'of them (after it’s sealed)'}</span></div><p class="muted small" style="margin:4px 0 0">Great for “open once the whole crew is on Later”.</p>`)}
  ${opt('streak','🔥','After a check-in streak',true,`<div class="row"><input type="number" id="sn" min="2" max="366" value="${c.streak.n}" inputmode="numeric"><span class="muted small fx0">days in a row</span></div><p class="muted small" style="margin:4px 0 0">Counts the opener’s daily check-ins (Check in tab) after it’s sealed. “After I check in 30 days.”</p>`)}
  ${opt('loc','📍','At a place',true,`<button type="button" class="btn ghost sm" id="here">📍 Use where I am now</button> <span class="muted small" id="lst">${c.loc.lat!=null?'Place set ✓':'No place set yet'}</span>
     <label>What to call it (shown on the card)</label><input id="lh" maxlength="80" placeholder="the bench by the lake" value="${esc(c.loc.hint)}">
     <label>How close they have to be</label><select id="lr">${[[50,'50 m'],[150,'150 m'],[500,'500 m'],[2000,'2 km'],[10000,'10 km'],[50000,'50 km (the whole city)']].map(([m,t])=>`<option value="${m}" ${+c.loc.r===m?'selected':''}>${t}</option>`).join('')}</select>
     <p class="muted small" style="margin:4px 0 0">The exact spot stays on the server. They only see the name you give it.</p>`)}
  ${opt('q','❓','A question only they can answer',true,`<label>Question</label><input id="qq" maxlength="200" placeholder="What did we name the class hamster?" value="${esc(c.q.text)}"><label>Answer</label><input id="qa" maxlength="120" autocomplete="off" placeholder="Answer (capitals and punctuation don’t matter)" value="${esc(c.q.a)}">`)}
  <button class="btn big block" id="seal" style="margin-top:16px">${grp?'Start the group capsule':'Seal it 🔒'}</button><button class="btn ghost block" id="sv">Save draft</button><p id="wmsg" class="muted small"></p>`;
  thumbs(); wire(v);
}
function readForm(){
  const g=id=>{ const e=document.getElementById(id); return e?e.value:''; };
  D.title=g('ti'); D.teaser=g('tz'); D.text=g('tx'); D.from=g('fr'); if(document.getElementById('em')) D.emails=g('em');
  if(document.getElementById('dt')) D.c.date.v=g('dt'); if(document.getElementById('on')) D.c.opens.n=+g('on')||1; if(document.getElementById('sn')) D.c.streak.n=+g('sn')||30;
  if(document.getElementById('lh')) { D.c.loc.hint=g('lh'); D.c.loc.r=+g('lr')||150; } if(document.getElementById('qq')) { D.c.q.text=g('qq'); D.c.q.a=g('qa'); }
}
function thumbs(){ const t=document.getElementById('th'); if(!t) return; t.innerHTML=media.map((m,i)=>m.kind==='img'?`<div class="th"><img src="${m.data}" alt="Photo ${i+1}"><button type="button" class="x" data-rm="${i}" aria-label="Remove photo">✕</button></div>`:`<div style="flex:1 1 100%"><audio controls src="${m.data}"></audio> <button type="button" class="lnk" data-rm="${i}" style="color:var(--bad)">Remove voice note</button></div>`).join(''); }
function wire(v){
  v.querySelector('#kind').addEventListener('click',e=>{ const a=e.target.closest('[data-kind]'); if(!a) return; e.preventDefault(); readForm(); if(a.dataset.kind==='group'&&!P()){ proGate('Group capsules'); return; } D.kind=a.dataset.kind; draw(v); });
  const to=v.querySelector('#to'); if(to) to.addEventListener('click',e=>{ const b=e.target.closest('[data-to]'); if(!b) return; readForm(); D.to=b.dataset.to; to.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===b)); document.getElementById('emw').hidden=D.to!=='friends'; });
  const prx=v.querySelector('#prx'); if(prx) prx.onclick=()=>{ readForm(); D.prompt=''; draw(v); };
  v.querySelectorAll('[data-on]').forEach(cb=>cb.addEventListener('change',()=>{ const k=cb.dataset.on; if(cb.checked&&k!=='date'&&!P()){ cb.checked=false; proGate({opens:'“Everyone opened it” unlocks',streak:'Streak unlocks',loc:'Place unlocks',q:'Question unlocks'}[k]); return; } readForm(); D.c[k].on=cb.checked; cb.closest('.opt').classList.toggle('off',!cb.checked); }));
  v.querySelector('#dq').addEventListener('click',e=>{ const b=e.target.closest('[data-d]'); if(!b) return; const t=new Date(Date.now()+(+b.dataset.d)*DAY); if(+b.dataset.d>1) t.setHours(9,0,0,0); document.getElementById('dt').value=localISO(t.getTime()); });
  v.querySelector('#here').onclick=()=>{ const st=document.getElementById('lst'); st.textContent='Finding you…'; if(!navigator.geolocation){ st.textContent='This browser can’t share location.'; return; }
    navigator.geolocation.getCurrentPosition(p=>{ D.c.loc.lat=+p.coords.latitude.toFixed(6); D.c.loc.lng=+p.coords.longitude.toFixed(6); st.textContent='Place set ✓ (±'+Math.round(p.coords.accuracy)+' m)'; },e=>{ st.textContent=e.code===1?'Location is off for this site. Turn it on in your browser settings.':'Couldn’t get your location. Try again.'; },{enableHighAccuracy:true,timeout:15000,maximumAge:0}); };
  const pf=v.querySelector('#pf');
  v.querySelector('#addp').onclick=()=>{ if(!P()) return proGate('Photos'); if(media.filter(m=>m.kind==='img').length>=4) return toast('Up to 4 photos'); pf.click(); };
  pf.onchange=async()=>{ const fs=[...pf.files].slice(0,4-media.filter(m=>m.kind==='img').length); pf.value=''; for(const f of fs){ try{ media.push(await LtrMedia.photo(f)); }catch(e){ toast('Couldn’t read that photo'); } } thumbs(); };
  v.querySelector('#addv').onclick=async()=>{ if(!P()) return proGate('Voice notes'); if(media.some(m=>m.kind==='voice')) return toast('One voice note per capsule. Remove the other first.'); const w=document.getElementById('recw');
    try{ recH=await LtrMedia.record(s=>{ const t=document.getElementById('rect'); if(t) t.textContent=s+' / '+LtrMedia.MAXS+' s'; }); }catch(e){ toast(e.message==='no_mic'?'This browser can’t record audio.':'Microphone is off. Allow it in your browser settings.'); return; }
    w.innerHTML='<div class="rec" style="margin-top:8px"><span class="dotr"></span><span id="rect">0 / 60 s</span><button type="button" class="btn sm" id="recs">Stop</button><button type="button" class="btn ghost sm" id="recx">Cancel</button></div>';
    document.getElementById('recs').onclick=async()=>{ const r=await recH.stop(); recH=null; w.innerHTML=''; if(r){ if(r.data.length>1900000) return toast('That voice note is too long'); media.push(r); thumbs(); } };
    document.getElementById('recx').onclick=()=>{ recH.cancel(); recH=null; w.innerHTML=''; }; };
  v.querySelector('#th').addEventListener('click',e=>{ const b=e.target.closest('[data-rm]'); if(!b) return; media.splice(+b.dataset.rm,1); thumbs(); });
  v.querySelector('#sv').onclick=()=>{ readForm(); const x=Store.saveDraft(D); D.id=x.id; toast('Draft saved'+(media.length?' (photos/voice aren’t kept in drafts)':'')); };
  v.querySelector('#seal').onclick=()=>{ readForm(); confirmSeal(v); };
}
function build(){
  const c=D.c, cond={}, errs=[];
  if(c.date.on){ const t=new Date(c.date.v).getTime(); if(!t) errs.push('Pick the date and time.'); else if(t<Date.now()+60000&&D.kind!=='group') errs.push('Pick a date in the future.'); else cond.date=t; }
  if(c.opens.on) cond.opens={n:Math.max(1,Math.round(c.opens.n))};
  if(c.streak.on) cond.streak={n:Math.max(2,Math.round(c.streak.n))};
  if(c.loc.on){ if(c.loc.lat==null) errs.push('Set the place: tap “Use where I am now” while you’re there.'); else cond.loc={lat:c.loc.lat,lng:c.loc.lng,r:c.loc.r,hint:c.loc.hint.trim()||'a secret place'}; }
  if(c.q.on){ if(!c.q.text.trim()||!c.q.a.trim()) errs.push('Write the question and its answer.'); else cond.q={text:c.q.text.trim(),a:c.q.a}; }
  if(!Object.keys(cond).length&&!errs.length) errs.push('Turn on at least one unlock condition.');
  const emails=D.kind==='letter'&&D.to==='friends'?D.emails.split(/[\s,;]+/).map(s=>s.trim().toLowerCase()).filter(Boolean):[];
  if(D.kind==='letter'&&D.to==='friends'&&!emails.length) errs.push('Add at least one email, or pick “Anyone with the code”.');
  const bad=emails.filter(e=>!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e)); if(bad.length) errs.push('Check this email: '+bad[0]);
  if(!D.text.trim()&&!media.length) errs.push('Write something first.');
  if(cond.opens&&D.kind==='letter'){ const max=D.to==='friends'?emails.length:D.to==='me'?1:50; if(cond.opens.n>max) errs.push('“Opened Later” can be at most '+max+' here.'); }
  return {cond,emails,errs};
}
function describe(cond){ const a=[]; if(cond.date) a.push('🗓️ '+fmtDT(cond.date)); if(cond.opens) a.push('👀 '+plural(cond.opens.n,'person','people')+' opened Later'); if(cond.streak) a.push('🔥 a '+cond.streak.n+'-day streak'); if(cond.loc) a.push('📍 at '+esc(cond.loc.hint)); if(cond.q) a.push('❓ “'+esc(cond.q.text)+'” answered'); return a; }
function confirmSeal(v){
  const {cond,emails,errs}=build(); const m=document.getElementById('wmsg');
  if(errs.length){ m.innerHTML='<span style="color:var(--bad)">'+esc(errs[0])+'</span>'; m.scrollIntoView({block:'center'}); return; }
  if(!signed()){ const x=Store.saveDraft(D); D.id=x.id; toast('Draft saved. Sign in to seal it.'); go('account'); return; }
  const grp=D.kind==='group';
  sheet(`<h3>${grp?'Start this group capsule?':'Seal it?'}</h3><p class="muted" style="margin-top:0">${grp?'Friends can add pieces until you seal it'+(cond.date?' or the date comes':'')+'. Then it opens for everyone when:':'Once sealed, nobody can read it (you included) until:'}</p><ul class="conds">${describe(cond).map(t=>`<li><span class="tx"><b>${t}</b></span></li>`).join('')}</ul>${media.length?'<p class="muted small">'+plural(media.filter(x=>x.kind==='img').length,'photo')+(media.some(x=>x.kind==='voice')?' + a voice note':'')+' go with it.</p>':''}<button class="btn big block" id="go">${grp?'Start it':'Seal it 🔒'}</button><button class="btn ghost block" data-close="1">Keep editing</button><p class="muted small" id="gm"></p>`,root=>{
    root.querySelector('#go').onclick=async()=>{ const b=root.querySelector('#go'); b.disabled=true; b.textContent=media.length?'Uploading…':'Sealing…';
      try{ const j=await Caps.api('/api/caps/create',{kind:D.kind,title:D.title,teaser:D.teaser,text:D.text,from:D.from,prompt:D.prompt,self:D.kind==='letter'&&D.to==='me',share:D.kind==='letter'&&D.to!=='me',to:emails,cond,media});
        if(D.id) Store.delDraft(D.id); Caps.put(j.cap); media=[]; const c=j.cap;
        sheet(`<div class="center"><div class="sealanim">${grp?'🧺':'🔒'}</div><h3>${grp?'Group capsule started':'Sealed'}</h3><p class="muted">${grp?'Send friends the code so they can add their piece.':c.self?'See you later.':'It’s in their vault (or will be when they sign up).'}</p>${c.code&&(grp||!c.self)?`<div class="codebox">${esc(c.code)}</div><button class="btn block" id="sh">Share invite</button>`:''}<a class="btn ghost block" href="#c/${c.id}">View capsule</a></div>`,r2=>{ const sh=r2.querySelector('#sh'); if(sh) sh.onclick=async()=>{ const url=location.origin+location.pathname+'#join/'+c.code; const text=(grp?'Add your piece to our time capsule “'+c.title+'” on Later: ':'I left you a time capsule on Later: ')+url+' (code '+c.code+')'; try{ if(navigator.share){ await navigator.share({title:'Later',text}); return; } }catch(e){ if(e&&e.name==='AbortError') return; } try{ await navigator.clipboard.writeText(text); toast('Invite copied'); }catch(e){ prompt('Copy this invite',text); } }; });
      }catch(e){ b.disabled=false; b.textContent=grp?'Start it':'Seal it 🔒'; const gm=root.querySelector('#gm'); gm.innerHTML='<span style="color:var(--bad)">'+errText(e)+'</span>'+(e.message==='pro_needed'||e.message==='free_limit'?' <a href="#pro">Get Pro</a>':''); }
    };
  });
}
routes.reflect=v=>{
  v.innerHTML=`<h2>Letter to future you</h2><p class="muted">Pick a prompt. It goes at the top of your letter. When it opens, Later asks you to write back to past you, and the reply is attached to the capsule.</p><div class="prompts">${PROMPTS.map(([q,s],i)=>`<a class="pr" href="#write/p/${i}">${esc(q)}${s?`<small>${esc(s)}</small>`:''}</a>`).join('')}</div><a class="btn ghost block" href="#write">Skip, just write</a>`;
};
routes.drafts=v=>{
  const ds=Store.drafts();
  v.innerHTML=`<h2>Drafts</h2><p class="muted">Saved on this phone${signed()?' and synced (encrypted on this phone first)':''}. Nothing here is sealed yet.</p>${ds.length?`<div class="card list">${ds.map(d=>`<div class="it"><a class="wh" href="#write/d/${d.id}" style="color:var(--fg)"><b>${esc(d.title||'Untitled draft')}</b><small>${esc((d.text||'').slice(0,90))||'(empty)'} · ${fmtD(d.up)}</small></a><button class="btn ghost sm fx0" data-del="${d.id}" aria-label="Delete draft">🗑</button></div>`).join('')}</div>`:'<div class="empty">No drafts.</div>'}<a class="btn block" href="#write">New capsule</a>`;
  v.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ if(confirm('Delete this draft?')){ Store.delDraft(b.dataset.del); route(); } });
};
})();
