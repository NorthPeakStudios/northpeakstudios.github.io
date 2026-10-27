// Verdict · Debate rooms: create by code (Pro), join free (debater or audience), timed opening / rebuttal / closing, audience vote, results.
(function(){
const PH=['Opening','Rebuttal','Closing','Vote','Results'];
const SN={A:'For',B:'Against',aud:'Audience'};
const fmtS=ms=>{ const s=Math.max(0,Math.ceil(ms/1000)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
routes.rooms=async(v,sub)=>{
  const pro=P(), signed=window.Cloud&&Cloud.signedIn();
  const rm=sessionStorage.getItem('vrd.roomMotion'); if(rm) sessionStorage.removeItem('vrd.roomMotion');
  v.innerHTML=`<h2>Debate rooms</h2><p class="muted">Live debates with friends: share a code, take sides, timed rounds, the audience decides.</p>
   <div class="card" id="jc"><h3>Join a room</h3><div class="row"><input id="jcode" placeholder="CODE" maxlength="5" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase;letter-spacing:3px;font-weight:700"><button class="btn fx0" id="jgo">Join</button></div><p id="jm" class="muted small"></p></div>
   <div class="card" id="nc"><div class="hrow" style="margin:0 0 6px"><h3>Create a room</h3>${pro?'<span class="pill acc">Pro</span>':'<span class="pill">🔒 Pro</span>'}</div>
   ${pro?`<label>Motion</label><textarea id="nm" rows="2" maxlength="200">${esc(rm||VM.motion(today()).text)}</textarea><div class="chips"><button class="chip sub" id="nmr">🎲 Random motion</button><button class="chip sub" id="nmt">Today’s motion</button></div>
    <label>Format</label><div class="seg" id="nmode"><a data-m="1v1" class="on">1 v 1</a><a data-m="teams">Teams (up to 4 a side)</a></div>
    <label>Round lengths</label><div class="durs">${[['Opening',120],['Rebuttal',90],['Closing',60],['Audience vote',60]].map(([n,d],i)=>`<label class="dl">${n}<select data-i="${i}">${[30,60,90,120,180,300].map(s=>`<option value="${s}" ${s===d?'selected':''}>${s<60?s+' s':(s/60)+' min'}</option>`).join('')}</select></label>`).join('')}</div>
    <label>You are</label><div class="seg" id="nrole"><a data-r="A">For</a><a data-r="B">Against</a><a data-r="aud" class="on">Host only</a></div>
    <label>Room name (optional)</label><input id="nt" maxlength="60" placeholder="e.g. 3rd period debate club">
    <button class="btn big block" id="ngo" style="margin-top:12px">Create room</button><p id="nmsg" class="muted small"></p>`:
    `<p class="muted" style="margin-top:0">Hosting rooms is part of <b>Verdict Pro</b>. Joining any room (to debate or vote) is free.</p><a class="btn" href="#pro">Get Pro</a>${signed?'':' <a class="btn ghost" href="#account">Sign in</a>'}`}</div>
   <div id="mr"></div>`;
  const join=()=>{ const c=$('#jcode').value.toUpperCase().replace(/[^0-9A-Z]/g,''); if(c.length!==5) return $('#jm').textContent='Room codes are 5 characters.'; location.hash='#room/'+c; };
  $('#jgo').onclick=join; $('#jcode').addEventListener('keydown',e=>{ if(e.key==='Enter') join(); });
  if(sub==='join') setTimeout(()=>$('#jcode').focus(),50);
  if(pro){ let mode='1v1', role='aud';
    if(sub==='new') setTimeout(()=>$('#nc').scrollIntoView({behavior:'smooth'}),50);
    $('#nmr').onclick=()=>{ $('#nm').value=VM.list[Math.floor(Math.random()*VM.list.length)][1]; };
    $('#nmt').onclick=()=>{ $('#nm').value=VM.motion(today()).text; };
    $('#nmode').onclick=e=>{ const a=e.target.closest('a[data-m]'); if(!a) return; mode=a.dataset.m; $$('#nmode a').forEach(x=>x.classList.toggle('on',x===a)); };
    $('#nrole').onclick=e=>{ const a=e.target.closest('a[data-r]'); if(!a) return; role=a.dataset.r; $$('#nrole a').forEach(x=>x.classList.toggle('on',x===a)); };
    $('#ngo').onclick=async()=>{ const motion=$('#nm').value.trim(); if(motion.length<8) return $('#nmsg').textContent='Write a motion first.'; $('#ngo').disabled=true; $('#nmsg').textContent='Creating…';
      try{ const j=await V('room/create',{motion,mode,role,title:$('#nt').value.trim(),durs:$$('.durs select').map(s=>+s.value)}); location.hash='#room/'+j.room.code; }catch(e){ $('#nmsg').textContent=errTxt(e); $('#ngo').disabled=false; } }; }
  try{ const j=await V('rooms'); if(j.rooms.length) $('#mr').innerHTML='<h3 style="margin-top:18px">Your rooms</h3><div class="card list">'+j.rooms.map(r=>`<a class="it" href="#room/${r.code}"><span class="code">${r.code}</span><span class="wh"><b>${esc(r.motion)}</b><small>${esc(r.title)} · ${r.mode==='teams'?'Teams':'1v1'} · ${r.phase<0?'lobby':PH[r.phase]}${r.host?' · you host':''}</small></span></a>`).join('')+'</div>'; }catch(e){}
};
routes.room=async(v,code)=>{
  code=String(code||'').toUpperCase().replace(/[^0-9A-Z]/g,'').slice(0,5);
  v.innerHTML='<p class="muted">Opening room '+esc(code)+'…</p>';
  let room=null, at=0, poll=null, tick=null, busy=false, draft='';
  const stop=()=>{ clearInterval(poll); clearInterval(tick); }; leave=stop;
  const load=async()=>{ if(busy) return; busy=true; try{ const j=await V('room?code='+code); room=j.room; at=Date.now(); draw(); }catch(e){ if(!room){ v.innerHTML=`<h2>Room ${esc(code)}</h2>`+errBox(e)+'<p><a class="btn ghost" href="#rooms">Back to rooms</a></p>'; stop(); } } busy=false; };
  const act=async(path,body)=>{ try{ const j=await V(path,{code,...body}); room=j.room; at=Date.now(); draw(); return true; }catch(e){ toast(errTxt(e)); return false; } };
  const left=()=>room?Math.max(0,room.ends_in-(Date.now()-at)):0;
  function draw(){ const r=room, me=r.me, deb=me&&me.role!=='aud', ph=r.phase;
    const ta=$('#rtx'); if(ta) draft=ta.value;
    const side=s=>r.members.filter(m=>m.role===s);
    const spoke=deb&&ph>=0&&ph<=2&&r.posts.some(p=>p.mine&&p.ph===ph);
    const cap=r.mode==='teams'?4:1;
    const steps=['Lobby',...PH].map((n,i)=>`<span class="${i-1===ph?'on':i-1<ph?'done':''}">${n}</span>`).join('');
    const memList=s=>side(s).map(m=>`<span class="mem${m.me?' me':''}">${esc(m.n)}${m.host?' 👑':''}</span>`).join('')||'<span class="muted small">open seat</span>';
    const speeches=[0,1,2].filter(i=>i<=ph||r.posts.some(p=>p.ph===i)).map(i=>{ const ps=r.posts.filter(p=>p.ph===i); return `<div class="rph"><h4>${PH[i]}</h4>${ps.length?ps.map(p=>`<div class="sp s${p.side}"><div class="spn">${p.side==='A'?'<span class="side s-for">For</span>':'<span class="side s-against">Against</span>'} <b>${esc(p.n)}</b>${p.mine?'':` <button class="lnk rpp" data-id="${esc(p.id)}">Report</button>`}</div><p>${esc(p.text)}</p></div>`).join(''):'<p class="muted small">Nothing yet.</p>'}</div>`; }).join('');
    v.innerHTML=`<div class="rhead"><div><span class="muted small">${esc(r.title)} · ${r.mode==='teams'?'Teams':'1 v 1'}</span><div class="code big">${r.code}</div></div><button class="btn ghost sm" id="share">Share</button></div>
     <div class="card motion"><p class="mlbl">Motion</p><h2 class="mtx">${esc(r.motion)}</h2></div>
     <div class="steps">${steps}</div>
     ${ph>=0&&ph<4?`<div class="clock"><b id="clk">${fmtS(left())}</b><span>${PH[ph]} ${ph<3?'· each debater speaks once':'· audience votes'}</span></div>`:''}
     <div class="teams"><div class="team tA"><h4>For</h4>${memList('A')}${ph<0&&(!me||me.role!=='A')&&side('A').length<cap?'<button class="btn sm block jn" data-r="A">Join For</button>':''}</div>
      <div class="team tB"><h4>Against</h4>${memList('B')}${ph<0&&(!me||me.role!=='B')&&side('B').length<cap?'<button class="btn sm block jn" data-r="B">Join Against</button>':''}</div></div>
     <p class="muted small center">${side('aud').length} in the audience${me?' · you’re '+(me.role==='aud'?(r.host?'hosting':'in the audience'):'arguing '+SN[me.role]):''}${!me&&ph<4?' · <button class="lnk jn" data-r="aud">Join audience</button>':''}${ph<0&&me&&me.role!=='aud'?' · <button class="lnk jn" data-r="aud">Switch to audience</button>':''}</p>
     ${r.host&&ph<0?`<button class="btn big block" id="start">Start debate</button><p class="muted small center">Needs at least one debater on each side.</p>`:''}
     ${r.host&&ph>=0&&ph<4?`<button class="btn ghost block" id="next">End ${PH[ph]} now</button>`:''}
     ${ph<0&&!r.host?'<div class="card empty">Waiting for the host to start…</div>':''}
     ${deb&&ph>=0&&ph<=2?(spoke?`<div class="card empty">✓ You spoke this round. Waiting for the others or the clock.</div>`:`<div class="card"><h3>Your ${PH[ph].toLowerCase()} (${SN[me.role]})</h3><textarea id="rtx" rows="6" maxlength="1000" placeholder="${ph===0?'Lay out your case':ph===1?'Answer the other side’s points':'Sum up why your side wins'}">${esc(draft)}</textarea><div class="row"><span id="rc" class="muted small"></span><button class="btn fx0" id="rsend">Send</button></div><div id="rcoach"></div></div>`):''}
     ${ph===3&&(!me||me.role==='aud')&&!r.host?(r.voted?`<div class="card empty">✓ You voted ${SN[r.voted]}. Results when the clock runs out.</div>`:`<div class="card"><h3>Who argued better?</h3><div class="row"><button class="btn big pickf" data-v="A">For</button><button class="btn big picka" data-v="B">Against</button></div></div>`):''}
     ${ph===4?`<div class="card result"><p class="mlbl">Verdict</p><h2>${r.winner==='tie'?'It’s a tie':(r.winner==='A'?'For':'Against')+' wins'}</h2>${bar2(r.tally)}<p class="muted small">${r.votes} audience vote${r.votes===1?'':'s'}</p></div>`:''}
     ${r.tally&&ph===3?`<div class="card"><p class="muted small" style="margin:0 0 4px">Live tally (${r.host?'host':'you voted'})</p>${bar2(r.tally)}</div>`:''}
     ${speeches?`<h3 style="margin-top:16px">Speeches</h3>${speeches}`:''}
     <p class="center"><a class="btn ghost sm" href="#rooms">All rooms</a></p>`;
    $$('.jn').forEach(b=>b.onclick=()=>act('room/join',{role:b.dataset.r}));
    const st=$('#start'); if(st) st.onclick=()=>act('room/start',{});
    const nx=$('#next'); if(nx) nx.onclick=()=>{ if(confirm('End this round now?')) act('room/next',{}); };
    $$('[data-v]').forEach(b=>b.onclick=()=>act('room/vote',{side:b.dataset.v}));
    $$('.rpp').forEach(b=>b.onclick=()=>report('rp:'+r.code+':'+b.dataset.id,b));
    $('#share').onclick=async()=>{ const url=location.origin+location.pathname+'#room/'+r.code, txt='Join my Verdict debate: '+r.motion+' · code '+r.code;
      try{ if(navigator.share){ await navigator.share({title:'Verdict debate',text:txt,url}); return; } }catch(e){ return; }
      try{ await navigator.clipboard.writeText(txt+' '+url); toast('Link copied'); }catch(e){ toast('Code: '+r.code); } };
    const tx=$('#rtx'); if(tx){ const u=()=>{ const n=tx.value.trim().length; $('#rc').textContent=n+' / 1000'+(n<20?' (min 20)':''); $('#rcoach').innerHTML=n>40?Coach.html(tx.value,P()).replace(/<div class="cpro">[\s\S]*$/,''):''; }; tx.addEventListener('input',u); u();
      $('#rsend').onclick=async()=>{ const t=tx.value.trim(); if(t.length<20) return toast('A bit longer, at least 20 characters.'); $('#rsend').disabled=true; draft=''; tx.value=''; if(!(await act('room/post',{text:t}))){ draft=t; draw(); } }; }
  }
  const bar2=t=>{ const a=t.A||0,b=t.B||0,s=a+b, pa=s?Math.round(a/s*100):50; return `<div class="sbar"><i class="bf" style="width:${pa}%"></i></div><div class="sbl"><span class="s-for-t">For ${a}</span><span class="s-against-t">${b} Against</span></div>`; };
  await load(); if(!room) return;
  poll=setInterval(()=>{ if(!document.hidden&&!(document.activeElement&&document.activeElement.id==='rtx')) load(); else if(!document.hidden&&room&&left()<=0) load(); },2500);
  tick=setInterval(()=>{ const c=document.getElementById('clk'); if(c&&room){ const l=left(); c.textContent=fmtS(l); c.classList.toggle('low',l<15000); if(l<=0&&room.phase<4) load(); } },500);
};
})();
