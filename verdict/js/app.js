// Verdict · app shell, daily motion, blind voting, ranks, profile, archive, coach. Northpeak Studios.
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(m){ const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,2600); }
const routes={}; let leave=null;
function route(){ if(leave){ try{ leave(); }catch(e){} leave=null; }
  const h=(location.hash||'#today').slice(1); const [r,...a]=h.split('/'); const f=routes[r]||routes.today; const v=$('#view'); closeSheet();
  $$('.tabbar a').forEach(x=>{ const k=x.getAttribute('href').slice(1), on=k===r||(x.dataset.also||'').split(' ').includes(r)||(!routes[r]&&k==='today'); x.classList.toggle('on',on); on?x.setAttribute('aria-current','page'):x.removeAttribute('aria-current'); });
  const dec=s=>{ try{ return decodeURIComponent(s); }catch(e){ return s; } };
  try{ const p=f(v,...a.map(dec)); if(p&&p.catch) p.catch(e=>{ console.warn(e); v.innerHTML=errBox(e); }); }catch(e){ console.warn(e); v.innerHTML='<p class="muted">Something went wrong on this screen.</p>'; } a11y(v); window.scrollTo(0,0); }
function a11y(root){ if(!root) return; root.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]),select,textarea').forEach(el=>{ if(el.getAttribute('aria-label')||(el.labels&&el.labels.length)) return;
  const l=el.previousElementSibling; if(l&&l.tagName==='LABEL'&&!l.htmlFor){ if(!el.id) el.id='f'+Math.random().toString(36).slice(2,8); l.htmlFor=el.id; } else if(el.placeholder) el.setAttribute('aria-label',el.placeholder); }); }
window.addEventListener('hashchange',route);
function sheet(html,onOpen){ $('#sbody').innerHTML='<div class="grab"></div>'+html; $('#sheet').hidden=false; document.body.style.overflow='hidden'; if(onOpen) onOpen($('#sbody')); a11y($('#sbody')); }
function closeSheet(){ const s=$('#sheet'); if(s&&!s.hidden){ s.hidden=true; document.body.style.overflow=''; } }
document.addEventListener('click',e=>{ if(e.target.closest('[data-close]')) closeSheet(); if(e.target.closest('[data-retry]')) route(); });
const P=()=>!!(window.Cloud&&Cloud.isPro());
const ready=()=>window.Cloud?Promise.resolve():new Promise(r=>window.addEventListener('cloud-ready',r,{once:true}));
async function V(path,body){ await ready(); return Cloud.vapi(path,body); }
const ERRS={offline:'You’re offline. Verdict needs a connection for votes and arguments.',too_short:'Arguments need at least 280 characters.',slow_down:'Slow down a bit and try again in a few minutes.',already_voted_on:'Your argument already has votes, so it’s locked in.',already_voted:'You already voted on that.',own_argument:'That’s your own argument.',pro_rooms:'Creating rooms is part of Verdict Pro.',pro_archive:'Older days are part of Verdict Pro.',sign_in:'Sign in first.',handle_taken:'That name is taken.',bad_handle:'3–20 letters, numbers, dot, dash or underscore.',handle_not_allowed:'Pick a different name.',no_room:'No room with that code.',bad_code:'Room codes are 5 characters.',side_full:'That side is full.',started:'The debate already started.',need_both_sides:'Each side needs at least one debater.',host_only:'Only the host can do that.',already_spoke:'You already spoke this round.',not_speaking_time:'It’s not speaking time.',not_voting_time:'Voting isn’t open.',debaters_cant_vote:'Debaters can’t vote in their own room.',room_full:'This room is full.'};
const errTxt=e=>ERRS[e&&e.message]||('Something went wrong ('+esc((e&&e.message)||'error')+').');
const errBox=e=>`<div class="card"><p style="margin:0">${errTxt(e)}</p><p><button class="btn ghost sm" data-retry="1">Try again</button></p></div>`;
const today=()=>VM.today();
const fmtDay=d=>{ const [y,m,dd]=d.split('-').map(Number); return new Date(y,m-1,dd).toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'}); };
const SIDE={for:'For',against:'Against'};
const sideTag=s=>`<span class="side s-${s}">${SIDE[s]||s}</span>`;
function motionCard(m,day,extra){ return `<div class="card motion"><div class="mtop"><span class="pill">${esc(m.topic)}</span><span class="muted small">${day===today()?'Today':'Motion'} · ${esc(fmtDay(day))}</span></div><p class="mlbl">This house believes</p><h2 class="mtx">${esc(m.text)}</h2>${extra||''}</div>`; }
function bar(f,a){ const t=f+a; const pf=t?Math.round(f/t*100):50; return `<div class="sbar" aria-label="${f} for, ${a} against"><i class="bf" style="width:${pf}%"></i></div><div class="sbl"><span class="s-for-t">${f} for</span><span class="s-against-t">${a} against</span></div>`; }

/* ---------- Today ---------- */
routes.today=async v=>{
  const day=today(), m=VM.motion(day);
  v.innerHTML=motionCard(m,day,'<p class="muted small">Loading…</p>');
  let j; try{ j=await V('today?day='+day); }catch(e){ v.innerHTML=motionCard(m,day)+errBox(e)+offlineDraft(day); return; }
  const dr=Store.draft(day), mine=j.mine;
  v.innerHTML=motionCard(j.motion,day,bar(j.counts.for,j.counts.against))+
   (mine?`<div class="card"><div class="hrow" style="margin:0"><h3>Your argument</h3>${sideTag(mine.side)}</div><p class="argt">${esc(mine.text)}</p>
     ${mine.removed?'<p class="note warn">Removed by a moderator.</p>':mine.hidden?'<p class="note warn">Hidden after reports while a moderator reviews it.</p>':''}
     <div class="stat"><div><b>${mine.w}–${mine.l}</b><span>head-to-heads</span></div><div><b>${mine.elo}</b><span>argument rating</span></div></div>
     ${mine.w+mine.l===0?`<p><a class="btn ghost sm" href="#write/${mine.side}">Edit (until the first vote)</a></p>`:''}</div>`:
    `<div class="card"><h3>Pick a side</h3><p class="muted small" style="margin-top:0">Write 280–1000 characters. Others judge it blind, head-to-head against the other side.</p>
     <div class="row"><a class="btn big pickf" href="#write/for">Argue for</a><a class="btn big picka" href="#write/against">Argue against</a></div>${dr&&dr.text?`<p class="muted small">Draft saved (${SIDE[dr.side]}, ${dr.text.length} chars). <a href="#write/${dr.side}">Keep writing</a></p>`:''}</div>`)+
   `<a class="card cta" href="#vote"><div><b>Vote blind</b><span>Read two arguments side by side, pick the stronger one. Sides and names stay hidden until you vote.</span></div><em>›</em></a>
   <a class="card cta" href="#results/${day}"><div><b>Today’s results</b><span>${mine||j.voted>=3?'See the top arguments so far.':'Opens after you post or vote 3 times ('+j.voted+'/3).'}</span></div><em>${mine||j.voted>=3?'›':'🔒'}</em></a>
   <div class="card"><div class="stat"><div><b>${j.prof.elo}</b><span>your rating</span></div><div><b>${j.prof.w}–${j.prof.l}</b><span>record</span></div><div><b>${j.voted}</b><span>votes today</span></div></div>
   <p class="muted small" style="margin-bottom:0">You’re <b>${esc(j.prof.handle)}</b>${j.guest?' (guest on this phone). <a href="#account">Sign in</a> to keep it on every device.':'.'} <a href="#me">Profile</a></p></div>
   <div class="qa"><a href="#rooms">🏛️ Rooms</a><a href="#coach">🧭 Coach</a><a href="#archive">🗂️ Archive</a></div>`;
};
function offlineDraft(day){ const d=Store.draft(day); return d&&d.text?`<p class="muted small">Your draft is safe on this phone (${d.text.length} chars).</p>`:''; }

/* ---------- Write ---------- */
routes.write=async(v,side)=>{
  side=side==='against'?'against':'for'; const day=today(), m=VM.motion(day), dr=Store.draft(day);
  let mine=null; try{ const j=await V('today?day='+day); mine=j.mine; }catch(e){}
  const start=(mine&&mine.w+mine.l===0&&!dr)?mine.text:(dr&&dr.text)||'';
  v.innerHTML=motionCard(m,day)+`<div class="seg" id="sd"><a data-s="for" class="${side==='for'?'on':''}">For</a><a data-s="against" class="${side==='against'?'on':''}">Against</a></div>
   <div class="card"><label for="tx">Your argument <span id="cnt" class="muted"></span></label><textarea id="tx" rows="10" maxlength="1200" placeholder="State your claim, give your reason (because…), back it with evidence, answer the other side, and finish strong.">${esc(start)}</textarea>
   <button class="btn big block" id="post" disabled>Post argument</button><p id="pm" class="muted small"></p></div>
   <div class="card"><div class="hrow" style="margin:0 0 6px"><h3>Argument coach</h3>${P()?'<span class="pill acc">Pro · full</span>':'<span class="pill">Free · basic</span>'}</div><div id="coach"></div></div>`;
  let cur=side; const tx=$('#tx');
  $('#sd').onclick=e=>{ const a=e.target.closest('a[data-s]'); if(!a) return; cur=a.dataset.s; $$('#sd a').forEach(x=>x.classList.toggle('on',x===a)); Store.setDraft(day,cur,tx.value); history.replaceState(null,'','#write/'+cur); };
  const upd=()=>{ const n=tx.value.trim().length; $('#cnt').textContent='· '+n+' / 1000'+(n<280?' (min 280)':''); $('#cnt').className=n<280||n>1000?'dn':'up'; $('#post').disabled=n<280||n>1000; $('#coach').innerHTML=Coach.html(tx.value,P()); };
  let t0; tx.addEventListener('input',()=>{ clearTimeout(t0); t0=setTimeout(()=>{ upd(); Store.setDraft(day,cur,tx.value); },180); }); upd();
  $('#post').onclick=async()=>{ const text=tx.value.trim(); if(text.length<280) return; const bad=Coach.analyze(text).flags.find(f=>f.name==='Language filter');
    if(bad&&!confirm('Swear words will be masked (like s***). Post anyway?')) return;
    $('#post').disabled=true; $('#pm').textContent='Posting…';
    try{ const j=await V('arg',{day,side:cur,text}); Store.clearDraft(day); toast(j.edited?'Argument updated ✓':'Posted ✓ Now vote on others'); location.hash='#today'; }
    catch(e){ $('#pm').textContent=errTxt(e); $('#post').disabled=false; } };
};

/* ---------- Vote (blind, head-to-head) ---------- */
routes.vote=async v=>{
  const day=today(), m=VM.motion(day);
  v.innerHTML=`<p class="mlbl" style="margin-top:4px">Which argument is stronger?</p><h3 class="mtx sm">${esc(m.text)}</h3><div id="pair"><p class="muted">Finding a pair…</p></div>`;
  const load=async()=>{ let j; try{ j=await V('pair?day='+day); }catch(e){ $('#pair').innerHTML=errBox(e); return; }
    if(j.none){ $('#pair').innerHTML=`<div class="card empty"><p style="font-size:30px;margin:0">${j.reason==='all_voted'?'✅':'🕊️'}</p><p>${j.reason==='all_voted'?'You’ve judged every pair so far. Check back later as more people post.':j.reason==='one_side'?'Only one side has arguments so far. Voting needs one from each side.':'No arguments yet today. Be the first!'}</p><p><a class="btn" href="#today">Back to today</a> <a class="btn ghost" href="#results/${day}">Results</a></p></div>`; return; }
    $('#pair').innerHTML=`<div class="pair"><div class="pc" id="pa"><span class="pl">A</span><div class="pt">${esc(j.a.text)}</div><button class="btn block pick" data-w="a">A is stronger</button></div>
      <div class="pc" id="pb"><span class="pl">B</span><div class="pt">${esc(j.b.text)}</div><button class="btn block pick" data-w="b">B is stronger</button></div></div>
      <p class="muted small center">Sides and authors are hidden until you vote. ${j.left>1?j.left+' pairs left today.':''} <button class="lnk" id="skip">Skip</button></p>`;
    $('#skip').onclick=load;
    $$('.pick').forEach(b=>b.onclick=async()=>{ $$('.pick').forEach(x=>x.disabled=true); const win=b.dataset.w==='a'?j.a.id:j.b.id;
      try{ const r=await V('vote',{a:j.a.id,b:j.b.id,win}); reveal(r); }catch(e){ toast(errTxt(e)); load(); } });
  };
  const reveal=r=>{ const card=(x,id)=>{ const el=$('#'+id); el.classList.add(x.won?'won':'lost');
      el.querySelector('.pick').outerHTML=`<div class="rv">${sideTag(x.side)} <b>${esc(x.handle)}</b>${x.author_elo!=null?` <span class="${x.delta>=0?'up':'dn'}">${x.delta>=0?'+':''}${x.delta}</span> <span class="muted small">→ ${x.author_elo}</span>`:''}
       <div class="rva"><button class="lnk sv" data-id="${esc(x.id)}">${Store.isSaved(x.id)?'★ Saved':'☆ Save'}</button><button class="lnk rp" data-id="${esc(x.id)}">Report</button></div></div>`; };
    card(r.a,'pa'); card(r.b,'pb');
    $('#pair').insertAdjacentHTML('beforeend','<button class="btn big block" id="nx">Next pair</button>');
    $('#nx').onclick=load; wireArgActs($('#pair'),[r.a,r.b]); };
  load();
};
function wireArgActs(root,args){ root.querySelectorAll('.sv').forEach(b=>b.onclick=()=>{ const a=args.find(x=>x.id===b.dataset.id); if(!a) return;
    if(Store.isSaved(a.id)){ Store.unsave(a.id); b.textContent='☆ Save'; return; }
    if(!P()&&Store.saved().length>=10){ toast('Free saves up to 10. Pro saves unlimited.'); return; }
    Store.save(a); b.textContent='★ Saved'; toast('Saved to your profile'); });
  root.querySelectorAll('.rp').forEach(b=>b.onclick=()=>report(b.dataset.id,b)); }
function report(id,btn){ sheet(`<h3>Report this</h3><p class="muted small">A moderator reviews reports. Three reports hide it until then.</p><div class="chips" id="rr">${['Hate or harassment','Bullying a real person','Sexual or violent','Spam or off-topic','Personal info'].map(x=>`<button class="chip">${x}</button>`).join('')}</div><button class="btn ghost block" data-close="1">Cancel</button>`,
  root=>root.querySelector('#rr').onclick=async e=>{ const c=e.target.closest('.chip'); if(!c) return; try{ await V('report',{id,reason:c.textContent}); toast('Reported. Thanks'); if(btn){ btn.textContent='Reported'; btn.disabled=true; } }catch(x){ toast(errTxt(x)); } closeSheet(); }); }

/* ---------- Results / archive day ---------- */
function argCard(a,i){ return `<div class="card arg"><div class="hrow" style="margin:0"><span class="muted small">#${i+1} · <b>${esc(a.handle)}</b></span>${sideTag(a.side)}</div><p class="argt">${esc(a.text)}</p><div class="aft"><span class="muted small">${a.w}–${a.l} · rating ${a.elo}</span><span><button class="lnk sv" data-id="${esc(a.id)}">${Store.isSaved(a.id)?'★ Saved':'☆ Save'}</button> <button class="lnk rp" data-id="${esc(a.id)}">Report</button></span></div></div>`; }
routes.results=async(v,day)=>{
  day=day&&VM.dayNum(day)!=null?day:today(); const m=VM.motion(day);
  v.innerHTML=motionCard(m,day,'<p class="muted small">Loading…</p>');
  let j; try{ j=await V('day?d='+day); }catch(e){ if(e.message==='pro_archive'){ v.innerHTML=motionCard(m,day)+lockHTML('Archive','Days older than a week are in Verdict Pro.'); return; } v.innerHTML=motionCard(m,day)+errBox(e); return; }
  if(j.locked){ v.innerHTML=motionCard(m,day)+`<div class="card lockcard"><div class="lockic">🙈</div><h3>No peeking</h3><p class="muted">Today’s results open after you post your own argument or vote ${j.need} more time${j.need===1?'':'s'}, so your votes stay blind.</p><p><a class="btn" href="#vote">Vote now</a> <a class="btn ghost" href="#write/for">Write mine</a></p></div>`; return; }
  const fa=j.args.filter(a=>a.side==='for').reduce((n,a)=>n+a.w,0), ag=j.args.filter(a=>a.side==='against').reduce((n,a)=>n+a.w,0);
  v.innerHTML=motionCard(j.motion,day,`<p class="muted small" style="margin:6px 0 4px">Head-to-head wins by side</p>${bar(fa,ag)}<p class="muted small">${j.args.length} argument${j.args.length===1?'':'s'} · ${j.votes} vote${j.votes===1?'':'s'}</p>`)+
   (j.args.length?j.args.map(argCard).join(''):'<div class="card empty">No arguments on this day.</div>');
  wireArgActs(v,j.args);
};
routes.day=routes.results;
routes.archive=async v=>{
  v.innerHTML='<h2>Archive</h2><p class="muted">Every daily motion and how it went.</p><div id="al"><p class="muted">Loading…</p></div>';
  let j; try{ j=await V('days'); }catch(e){ $('#al').innerHTML=errBox(e); return; }
  const rows=j.days.map(d=>`<a class="it" href="${d.locked?'#pro':'#results/'+d.day}"><span class="tm">${esc(fmtDay(d.day).replace(/^\w+, /,''))}</span><span class="wh"><b>${esc(d.motion.text)}</b><small>${esc(d.motion.topic)} · ${d.n} argument${d.n===1?'':'s'}${d.mine?' · you: '+SIDE[d.mine.side]+' '+d.mine.w+'–'+d.mine.l:''}</small></span>${d.locked?'<span class="pill">🔒 Pro</span>':''}</a>`).join('');
  $('#al').innerHTML=`<div class="card list">${rows}</div>${j.pro?'':'<p class="muted small center">Free shows the last 7 days. <a href="#pro">Pro</a> keeps the whole archive.</p>'}<h3 style="margin-top:18px">Coming up</h3><div class="card list">${[1,2,3].map(k=>{ const d=VM.dayKey(Date.now()+k*864e5); return `<div class="it"><span class="tm">${esc(fmtDay(d).replace(/^\w+, /,''))}</span><span class="wh"><b>${P()?esc(VM.motion(d).text):'🔒 Revealed that day'}</b><small>${esc(VM.motion(d).topic)}</small></span></div>`; }).join('')}</div>`;
};

/* ---------- Ranks ---------- */
routes.ranks=async v=>{
  const day=today();
  v.innerHTML='<h2>Ranks</h2><div class="seg" id="rk"><a data-k="p" class="on">Top debaters</a><a data-k="a">Today’s best</a></div><div id="rl"><p class="muted">Loading…</p></div>';
  const show=async k=>{ $$('#rk a').forEach(a=>a.classList.toggle('on',a.dataset.k===k));
    if(k==='p'){ let j; try{ j=await V('leaders'); }catch(e){ $('#rl').innerHTML=errBox(e); return; }
      $('#rl').innerHTML=j.leaders.length?`<div class="card list">${j.leaders.map((p,i)=>`<div class="it"><span class="rk ${i<3?'r'+i:''}">${i+1}</span><span class="wh"><b>${esc(p.handle)}</b><small>${p.w}–${p.l} · ${p.games?Math.round(p.w/p.games*100):0}% wins</small></span><b class="elo">${p.elo}</b></div>`).join('')}</div><p class="muted small center">Elo rating from head-to-head votes. 3+ judged matchups to appear.</p>`:'<div class="card empty">No ranked debaters yet. Post an argument and get 3 head-to-heads to show up here.</div>'; }
    else { let j; try{ j=await V('top?day='+day); }catch(e){ $('#rl').innerHTML=errBox(e); return; }
      if(j.locked){ $('#rl').innerHTML=`<div class="card lockcard"><div class="lockic">🙈</div><p class="muted">Opens after you post or vote ${j.need} more time${j.need===1?'':'s'}.</p><a class="btn" href="#vote">Vote now</a></div>`; return; }
      $('#rl').innerHTML=j.args.length?j.args.slice(0,10).map(argCard).join(''):'<div class="card empty">No arguments yet today.</div>'; wireArgActs($('#rl'),j.args); } };
  $('#rk').onclick=e=>{ const a=e.target.closest('a[data-k]'); if(a) show(a.dataset.k); }; show('p');
};

/* ---------- Me ---------- */
function chart(hist){ if(!hist||hist.length<2) return '<p class="muted small">Your rating chart fills in after a couple of head-to-heads.</p>';
  const W=320,H=140,pd=24, ys=hist.map(x=>x[1]), lo=Math.min(...ys)-10, hi=Math.max(...ys)+10, n=hist.length;
  const X=i=>pd+(W-pd-6)*(i/(n-1)), Y=y=>6+(H-26)*(1-(y-lo)/(hi-lo||1));
  const pts=hist.map((x,i)=>X(i).toFixed(1)+','+Y(x[1]).toFixed(1)).join(' ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rating history from ${ys[0]} to ${ys[n-1]}"><line x1="${pd}" x2="${W-6}" y1="${Y(1200)}" y2="${Y(1200)}" stroke="#30363d" stroke-dasharray="3 4"/><text x="2" y="${Y(hi-10)+4}" fill="#8b949e" font-size="10">${Math.round(hi-10)}</text><text x="2" y="${Y(lo+10)+4}" fill="#8b949e" font-size="10">${Math.round(lo+10)}</text><polyline points="${pts}" fill="none" stroke="var(--acc)" stroke-width="2.4" stroke-linejoin="round"/><circle cx="${X(n-1)}" cy="${Y(ys[n-1])}" r="3.5" fill="var(--acc)"/><text x="${pd}" y="${H-4}" fill="#8b949e" font-size="10">${new Date(hist[0][0]).toLocaleDateString([], {month:'short',day:'numeric'})}</text><text x="${W-6}" y="${H-4}" fill="#8b949e" font-size="10" text-anchor="end">now</text></svg>`; }
routes.me=async(v,sub)=>{
  v.innerHTML='<h2>Profile</h2><p class="muted">Loading…</p>';
  let j; try{ j=await V('me'+(sub==='all'?'?all=1':'')); }catch(e){ v.innerHTML='<h2>Profile</h2>'+errBox(e)+savedHTML(); wireArgActs(v,Store.saved().map(s=>s.arg)); return; }
  const p=j.prof, st=j.stats;
  v.innerHTML=`<div class="card prof"><div class="pav">${esc(p.handle.slice(0,1).toUpperCase())}</div><div class="pin"><h2 style="margin:0">${esc(p.handle)}</h2><span class="muted small">${j.guest?'Guest on this phone · <a href="#account">sign in</a>':esc(Cloud.acct.user)}${P()?' · <span class="pill acc">Pro</span>':''}</span></div><button class="btn ghost sm" id="eh">Rename</button></div>
   <div class="card"><div class="stat"><div><b>${p.elo}</b><span>rating</span></div><div><b>${p.games>=3?'#'+j.rank:'–'}</b><span>rank</span></div><div><b>${p.games?Math.round(p.w/p.games*100)+'%':'–'}</b><span>win rate</span></div><div><b>${p.w}–${p.l}</b><span>record</span></div></div></div>
   ${st?`<div class="card"><h3>Rating history</h3>${chart(st.hist)}<p class="muted small" style="margin-bottom:0">Peak ${st.peak} · ${st.hist.length} rated matchups</p></div>
     <div class="card"><h3>Win rate by topic</h3>${st.topics.length?st.topics.map(t=>{ const g=t.w+t.l, pc=g?Math.round(t.w/g*100):0; return `<div class="hb"><span>${esc(t.topic)}</span><span class="t"><i style="width:${pc}%;background:var(--acc)"></i></span><em>${g?pc+'%':'–'}</em></div>`; }).join('')+'<p class="muted small">From head-to-heads on your arguments in each topic.</p>':'<p class="muted small">Argue a few motions to see your strongest topics.</p>'}
      ${st.sides.length?'<div class="hr"></div>'+st.sides.map(s=>{ const g=s.w+s.l; return `<div class="hb"><span>Arguing ${SIDE[s.side]}</span><span class="t"><i style="width:${g?Math.round(s.w/g*100):0}%;background:var(--${s.side==='for'?'for':'ag'})"></i></span><em>${g?Math.round(s.w/g*100)+'%':'–'}</em></div>`; }).join(''):''}</div>
     ${st.best.length?`<h3 style="margin-top:18px">Your best arguments</h3>${st.best.map(argCard).join('')}`:''}`:
    `<div class="card lockcard"><div class="lockic">📈</div><h3>Rating history & stats</h3><p class="muted">Your Elo over time, win rate per topic, for vs against, and your best arguments are in <b>Verdict Pro</b>.</p><a class="btn" href="#pro">Get Pro</a></div>`}
   <div class="hrow"><h3>Your arguments</h3><span class="muted small">${j.total} total</span></div>
   ${j.args.length?`<div class="card list">${j.args.map(a=>`<a class="it" href="#results/${a.day}"><span class="tm">${esc(fmtDay(a.day).replace(/^\w+, /,''))}</span><span class="wh"><b>${esc(VM.motion(a.day).text)}</b><small>${SIDE[a.side]} · ${a.w}–${a.l} · rating ${a.elo}${a.removed?' · removed':a.hidden?' · hidden':''}</small></span></a>`).join('')}</div>`:'<div class="card empty">No arguments yet. <a href="#today">Argue today’s motion</a>.</div>'}
   ${j.total>j.args.length?(P()?`<p class="center"><a class="btn ghost sm" href="#me/all">Show all ${j.total}</a></p>`:'<p class="muted small center">Free shows your last 7 days. <a href="#pro">Pro</a> keeps them all.</p>'):''}
   ${savedHTML()}
   <div class="card list"><a class="it" href="#account"><span class="pic">👤</span><span class="wh"><b>Account & sync</b></span></a><a class="it" href="#pro"><span class="pic">⭐</span><span class="wh"><b>Verdict Pro</b></span></a><a class="it" href="#coach"><span class="pic">🧭</span><span class="wh"><b>Argument coach</b></span></a><a class="it" href="#about"><span class="pic">ℹ️</span><span class="wh"><b>About & rules</b></span></a></div>`;
  wireArgActs(v,[...(st?st.best:[]),...Store.saved().map(s=>s.arg)]);
  $('#eh').onclick=async()=>{ const h=prompt('Your debate name (3–20 letters, numbers, . _ -)',p.handle); if(!h||h===p.handle) return; try{ await V('handle',{handle:h.trim()}); toast('Name saved'); route(); }catch(e){ toast(errTxt(e)); } };
};
function savedHTML(){ const s=Store.saved(); return `<div class="hrow"><h3>Saved arguments</h3><span class="muted small">${s.length}${P()?'':' / 10'}</span></div>`+(s.length?s.map((x,i)=>argCard(x.arg,i)).join(''):'<div class="card empty">Tap ☆ Save on a great argument after you vote to keep it here.</div>'); }

/* ---------- Coach (standalone) ---------- */
routes.coach=v=>{
  v.innerHTML=`<h2>Argument coach</h2><p class="muted">Paste or write anything: a speech, an essay paragraph, a debate case. It checks for fallacies, unsupported claims, missing evidence, reading level and length. Runs on this phone, no AI.</p>
   <div class="card"><textarea id="ctx" rows="9" placeholder="Paste your argument here…"></textarea><div class="row" style="margin-top:6px"><button class="btn ghost sm fx0" id="cex">Try an example</button><span></span></div></div><div class="card"><div id="cout"></div></div>
   <details class="fold"><summary>What it checks</summary><p class="muted small" style="margin-top:0">Attacks on people, bandwagon, slippery slope, false choices, absolute words, vague authority (“studies show”), emotion over reason, straw-man phrasing, appeal to tradition, unsupported claims (“obviously”), hedging, missing evidence, missing “because”, swear words, repeated words, very long sentences, reading grade level, and (Pro) a structure check and score with every phrase highlighted.</p></details>`;
  const t=$('#ctx'), go=()=>$('#cout').innerHTML=Coach.html(t.value,P()); t.addEventListener('input',go); go();
  $('#cex').onclick=()=>{ t.value='Everyone knows homework is pointless. Obviously it will lead to burnout and kids will hate school forever. Studies show students are tired. Teachers who assign it are clueless. Homework should be optional because it never helps anyone learn.'; go(); };
};

/* ---------- About ---------- */
routes.about=v=>{
  v.innerHTML=`<h2>About Verdict</h2><div class="card"><p style="margin-top:0"><b>Verdict 1.0</b> by Northpeak Studios.</p><p>One motion a day. Pick a side, make your case in 280–1000 characters, then judge other people’s arguments blind: two at a time, one from each side, with names and sides hidden until you vote. Every vote is a head-to-head, so arguers earn an <b>Elo rating</b> like chess players.</p><p>Debate rooms let you run a live debate with friends: 1v1 or teams, timed opening, rebuttal and closing rounds, then the audience votes.</p></div>
   <details class="fold" open><summary>Rules</summary><ul class="muted small" style="margin-top:0;padding-left:18px"><li>Argue the idea, not the person.</li><li>No hate, bullying, sexual content, or anyone’s personal info.</li><li>Swear words are masked automatically.</li><li>Anyone can report a post; 3 reports hide it until a moderator reviews it. Moderators can remove posts.</li><li>You can’t vote on your own argument, and you can only vote on each pair once.</li></ul></details>
   <details class="fold"><summary>Free vs Pro</summary><p class="muted small" style="margin-top:0"><b>Free forever:</b> the daily motion, posting, blind voting, your rating and record, results, ranks, joining any room (debate or vote), the basic coach, 7 days of archive, 10 saved arguments.<br><b>Pro ($35, or $100 Northpeak All-Access):</b> create debate rooms, rating history chart + win rate per topic + best arguments, the full coach (every check, highlights, structure, score), the whole archive and all your arguments, unlimited saves, a peek at upcoming motions.</p></details>
   <details class="fold"><summary>Privacy</summary><p class="muted small" style="margin-top:0">Your public arguments show your debate name, never your email. Saved arguments and drafts sync encrypted (the server can’t read them). Without an account, a random guest id on this phone keeps your arguments; sign in and they move to your Northpeak account.</p></details>
   <p class="muted small center">Version <span id="ver">1.0</span> · <a href="https://northpeakstudios.github.io/">Northpeak Studios</a></p>`;
};

/* ---------- commands + search ---------- */
const CMDS=[['Today’s motion','#today','🗳️','home daily'],['Argue for','#write/for','✅','write post side'],['Argue against','#write/against','❌','write post side'],['Vote blind','#vote','⚖️','judge pair head to head'],['Today’s results','#results/'+'TODAY','🏆','top best'],['Top debaters','#ranks','🥇','leaderboard elo ranks'],['Debate rooms','#rooms','🏛️','room live friends'],['Create a room','#rooms/new','➕','new host pro'],['Join a room by code','#rooms/join','🔑','code enter'],['Argument coach','#coach','🧭','fallacy check grade'],['My profile','#me','👤','rating stats history'],['Rating history','#me','📈','elo chart pro'],['Saved arguments','#me','★','bookmarks'],['Archive','#archive','🗂️','past motions history'],['Account & sync','#account','🔐','sign in login'],['Get Pro','#pro','⭐','upgrade buy'],['Redeem a code','#account','🎟️','owner bot code'],['About & rules','#about','ℹ️','help moderation'],['Random motion practice','#coach','🎲','practice']];
function palette(){ const all=CMDS.map(c=>({t:c[0],h:c[1].replace('TODAY',today()),i:c[2],k:c[3]}));
  const el=document.createElement('div'); el.className='pal'; el.innerHTML='<div class="palbar"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg><input id="pq" placeholder="Search commands and motions" autocomplete="off"><button class="lnk" id="pqx">Close</button></div><div class="palres" id="pr"></div>';
  document.body.appendChild(el); document.body.classList.add('palopen'); const q=el.querySelector('#pq'); q.focus();
  const close=()=>{ el.remove(); document.body.classList.remove('palopen'); };
  const draw=()=>{ const s=q.value.trim().toLowerCase(), ws=s.split(/\s+/).filter(Boolean), hit=x=>ws.every(w=>x.toLowerCase().includes(w));
    const cs=all.filter(c=>!s||hit(c.t+' '+c.k)); const ms=s?VM.list.map((m,i)=>({m,i})).filter(o=>hit(o.m[1]+' '+o.m[0])).slice(0,25):[];
    el.querySelector('#pr').innerHTML=(cs.length?'<div class="pgh">Commands</div><div class="pgrp">'+cs.map(c=>`<div class="pr" data-h="${esc(c.h)}"><span class="pic">${c.i}</span><span class="wh"><b>${esc(c.t)}</b></span></div>`).join('')+'</div>':'')+
     (ms.length?'<div class="pgh">Motions</div><div class="pgrp">'+ms.map(o=>`<div class="pr" data-mi="${o.i}"><span class="pic">🗣️</span><span class="wh"><b>${esc(o.m[1])}</b><small>${esc(o.m[0])} · debate it in a room</small></span></div>`).join('')+'</div>':'')+(!cs.length&&!ms.length?'<p class="empty">Nothing found.</p>':''); };
  q.addEventListener('input',draw); draw(); el.querySelector('#pqx').onclick=close;
  el.querySelector('#pr').onclick=e=>{ const r=e.target.closest('.pr'); if(!r) return; close(); if(r.dataset.mi!=null){ sessionStorage.setItem('vrd.roomMotion',VM.list[+r.dataset.mi][1]); location.hash='#rooms/new'; if(location.hash==='#rooms/new') route(); } else { if(location.hash===r.dataset.h) route(); else location.hash=r.dataset.h; } };
  q.addEventListener('keydown',e=>{ if(e.key==='Escape') close(); if(e.key==='Enter'){ const f=el.querySelector('.pr'); if(f) f.click(); } }); }
document.addEventListener('click',e=>{ if(e.target.closest('[data-pal]')) palette(); });
document.addEventListener('keydown',e=>{ if((e.key==='k'&&(e.metaKey||e.ctrlKey))||(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName))){ e.preventDefault(); if(!$('.pal')) palette(); } });
function lockHTML(what,detail){ return `<div class="card lockcard"><div class="lockic">🔒</div><h3>${esc(what)}</h3><p class="muted">${esc(detail||'')}</p><p>Part of <b>Verdict Pro</b>: create rooms, rating history + stats, the full coach, the whole archive.</p><a class="btn big" href="#pro">Get Pro · $35</a><p class="muted small">Or $100 Northpeak All-Access for every Northpeak app.</p></div>`; }
window.addEventListener('DOMContentLoaded',route);
if(document.readyState!=='loading') route();
