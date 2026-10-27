// Blindspot · friends: weekly leaderboard and friend duels by code (same 5 questions, compare points + calibration).
(function(){
const A=()=>window.BlsApp, C=()=>window.Cloud;
const signed=()=>!!(C()&&C().signedIn());
async function play(code,nick,items){ return C().api('/api/bs/duel/play',{code,dev:Store.dev(),nick,ans:items.map(x=>({q:x.q,lo:x.lo,hi:x.hi,c:x.c}))}); }
window.BlsSocial={play};
const nickOf=()=>Store.prefs().nick||'';
function myDuels(){ const p=Store.prefs(); return (p.duels||[]).slice(-30).reverse(); }
function remember(code,host){ const p=Store.prefs(); const d=(p.duels||[]).filter(x=>x.code!==code); d.push({code,host:!!host,t:Date.now()}); Store.savePrefs({duels:d.slice(-30)}); }
routes.friends=async v=>{
  v.innerHTML=`<h2>Friends</h2>
   <div class="card"><h3>⚔️ Duels</h3><p class="muted small" style="margin-top:0">Both of you answer the same 5 questions. The reveal compares points, hits and how sure each of you was.</p>
   <div class="row"><a class="btn" href="#duelnew">Start a duel${P()?'':' (Pro)'}</a><a class="btn ghost" href="#dueljoin">Join with a code</a></div>
   ${myDuels().length?`<div class="list" style="margin-top:8px">${myDuels().map(d=>{ const g=Store.game('g_duel_'+d.code); return `<a class="it" href="#duel/${d.code}"><span class="wh"><b>${d.code}</b><small>${d.host?'you started it':'joined'} · ${new Date(d.t).toLocaleDateString([], {month:'short',day:'numeric'})}</small></span><span class="pill ${g?'acc':''}">${g?g.pts+' pts':'play'}</span></a>`; }).join('')}</div>`:''}</div>
   <div class="card"><div class="row"><h3 style="margin:0">🏆 This week</h3><span class="fx0 muted small" id="wk"></span></div><div id="bd"><p class="muted">Loading…</p></div>
   <div id="nk"></div></div>`;
  try{ const j=await C().api('/api/bs/board'); const bd=$('#bd'); if(!bd) return; $('#wk').textContent=A().dayLabel(j.start).replace(/^\w+, /,'')+' – '+A().dayLabel(j.end).replace(/^\w+, /,'');
    bd.innerHTML=j.rows.length?`<table class="board"><thead><tr><th style="width:34px">#</th><th>Player</th><th style="width:58px">Points</th><th style="width:58px">In range</th></tr></thead><tbody>${j.rows.map(r=>`<tr class="${r.me?'me':''}"><td>${r.rank}</td><td class="n">${esc(r.nick)}</td><td>${r.pts}</td><td>${r.n?Math.round(100*r.hits/r.n):0}%</td></tr>`).join('')}</tbody></table>
      ${j.me&&j.me.rank>50?`<p class="muted small">You: #${j.me.rank} · ${j.me.pts} pts</p>`:''}`:'<p class="muted">No scores yet this week. Play today’s 5 to get on the board.</p>';
    $('#nk').innerHTML=signed()?`<p class="muted small" style="margin:10px 0 4px">Daily scores add up Monday to Sunday. Your name on the board:</p><div class="row"><input id="nkn" maxlength="20" placeholder="Nickname" value="${esc(nickOf())}"><button class="btn fx0" id="nks">Save</button></div>`
      :'<p class="muted small" style="margin:10px 0 0">The board shows signed-in players. <a href="#account">Sign in</a> to get on it (guests still count in the crowd).</p>';
    const s=$('#nks'); if(s){ if(!nickOf()){ C().api('/api/bs/nick').then(r=>{ if(r.nick){ Store.savePrefs({nick:r.nick}); const i=$('#nkn'); if(i&&!i.value) i.value=r.nick; } }).catch(()=>{}); }
      s.onclick=async()=>{ const n=$('#nkn').value.trim(); try{ const r=await C().api('/api/bs/nick',{nick:n}); Store.savePrefs({nick:r.nick}); toast('Saved'); route(); }catch(e){ toast(e.message==='bad_nick'?'2–20 letters, numbers, spaces, . _ - \'':'Couldn’t save ('+e.message+')'); } }; }
  }catch(e){ const bd=$('#bd'); if(bd) bd.innerHTML='<p class="muted">Couldn’t load the board'+(e&&e.offline?' (offline)':'')+'.</p>'; }
};
routes.duelnew=v=>{ if(!P()) return BlsPro.locked(v,'Start a duel','Make a code, send it to a friend, and see who’s better calibrated on the same 5 questions. Joining a duel is free.');
  v.innerHTML=`<p class="muted small" style="margin:0"><a href="#friends">‹ Friends</a></p><h2>Start a duel</h2><div class="card"><label>Your name in the duel</label><input id="dn" maxlength="20" value="${esc(nickOf())}" placeholder="Nickname"><button class="btn big block" id="dgo" style="margin-top:12px">Make a code</button><p id="dm" class="muted small"></p></div>`;
  $('#dgo').onclick=async()=>{ const nick=$('#dn').value.trim(); if(nick.length<2) return $('#dm').textContent='Add a name (2–20 characters).'; $('#dm').textContent='Making…';
    try{ const j=await C().api('/api/bs/duel/new',{nick}); Store.savePrefs({nick}); remember(j.code,true); location.hash='#duel/'+j.code; }catch(e){ $('#dm').textContent=e.message==='pro'?'Starting a duel needs Pro.':e.message==='signin'?'Sign in first.':'Couldn’t make a duel ('+esc(e.message)+').'; } }; };
routes.dueljoin=(v,pre)=>{ v.innerHTML=`<p class="muted small" style="margin:0"><a href="#friends">‹ Friends</a></p><h2>Join a duel</h2><div class="card"><label>Code</label><input id="dc" maxlength="8" autocapitalize="characters" autocomplete="off" placeholder="ABC234" value="${esc(pre||'')}" style="text-transform:uppercase;letter-spacing:3px;font-weight:700"><button class="btn big block" id="dj" style="margin-top:12px">Open duel</button></div><p class="muted small">Joining is free, no account needed.</p>`;
  $('#dj').onclick=()=>{ const c=$('#dc').value.toUpperCase().replace(/[^0-9A-Z]/g,''); if(c.length!==6) return toast('Codes are 6 characters'); location.hash='#duel/'+c; }; };
routes.duel=async(v,code)=>{ code=String(code||'').toUpperCase().replace(/[^0-9A-Z]/g,''); v.innerHTML='<p class="muted">Loading duel…</p>';
  let j; try{ j=await C().api('/api/bs/duel?code='+code+'&dev='+Store.dev()); }catch(e){ v.innerHTML=`<p class="muted small" style="margin:0"><a href="#friends">‹ Friends</a></p><div class="card"><p>${e.message==='no_duel'?'No duel with code <b>'+esc(code)+'</b>.':'Couldn’t load the duel'+(e.offline?' (offline)':'')+'.'}</p><a class="btn" href="#dueljoin">Try another code</a></div>`; return; }
  const local=Store.game('g_duel_'+code); remember(code,(Store.prefs().duels||[]).some(d=>d.code===code&&d.host));
  const link='https://northpeakstudios.github.io/blindspot/#duel/'+code;
  const head=`<p class="muted small" style="margin:0"><a href="#friends">‹ Friends</a></p><h2>Duel ${esc(code)}</h2><div class="card"><div class="code">${esc(code)}</div><p class="muted small" style="margin:8px 0">Started by ${esc(j.host||'a friend')} · ${j.players.length} played</p><button class="btn ghost block" id="dsh">Send to a friend</button></div>`;
  if(!j.played&&!local){ v.innerHTML=head+`<div class="card"><h3>Your turn</h3><p class="muted small" style="margin-top:0">5 questions. Give a range and how sure you are. You’ll see everyone’s answers after you lock in.</p><label>Your name</label><input id="dn" maxlength="20" value="${esc(nickOf())}" placeholder="Nickname"><button class="btn big block" id="dp" style="margin-top:12px">Play the duel</button></div>`;
    $('#dp').onclick=()=>{ const nick=$('#dn').value.trim(); if(nick.length<2) return toast('Add a name first'); Store.savePrefs({nick}); A().startSet('duel',code,j.qids,{nick}); }; }
  else { const me=j.players.find(p=>p.me), rows=j.players.slice().sort((a,b)=>b.pts-a.pts||b.hits-a.hits);
    const cal=p=>{ const hr=p.n?Math.round(100*p.hits/p.n):0, gap=p.conf-hr; return `${hr}% hit at ${p.conf}% avg`+(gap>=20?' · overconfident':gap<=-20?' · underconfident':' · calibrated'); };
    v.innerHTML=head+`${local&&local.pending?'<div class="card"><p class="muted small" style="margin:0;color:var(--warn)">Your answers haven’t reached the duel yet. They’ll send when you’re online.</p></div>':''}
     <div class="card"><h3>Results</h3><div class="list">${rows.map((p,i)=>`<div class="it"><span class="wh"><b>${i===0?'🥇 ':i===1?'🥈 ':i===2?'🥉 ':''}${esc(p.nick)}${p.me?' (you)':''}</b><small>${p.hits}/${p.n} in range · ${cal(p)}</small></span><span class="pill ${p.me?'acc':''}">${p.pts}</span></div>`).join('')}</div>
     ${rows.length<2?'<p class="muted small">Waiting for your friend. Send the code!</p>':''}<button class="btn ghost sm" id="drf">Refresh</button></div>
     <h3>Question by question</h3><div id="dq"></div>`;
    const dq=$('#dq'); dq.innerHTML=j.qids.map((qid,i)=>{ const q=A().QN[qid]; const mine=(me&&me.ans||local&&local.items||[]).find(a=>a.q===qid); const others=j.players.filter(p=>!p.me&&p.ans).map(p=>({nick:p.nick,a:p.ans.find(a=>a.q===qid)})).filter(x=>x.a);
      const crowd={ranges:others.map(x=>[x.a.lo,x.a.hi,x.a.c])};
      return `<div class="card res ${mine&&mine.hit?'hit':'miss'}"><div class="qcat">${esc(A().CAT[q.c])} · ${i+1}</div><div style="font-weight:650;margin:3px 0;overflow-wrap:anywhere">${esc(q.q)}</div>${A().numberLine(q,mine?mine.lo:NaN,mine?mine.hi:NaN,crowd)}
       <div class="kv" style="margin-top:6px"><b>Answer</b><span style="color:var(--fg)">${esc(A().withUnit(A().fmtExact(q.a,q),q))}</span>${mine?`<b>You</b><span>${esc(A().fmtShort(mine.lo,q))} – ${esc(A().fmtShort(mine.hi,q))} at ${mine.c}% · ${mine.pts} pts</span>`:''}
       ${others.map(o=>`<b>${esc(o.nick)}</b><span>${esc(A().fmtShort(o.a.lo,q))} – ${esc(A().fmtShort(o.a.hi,q))} at ${o.a.c}% · ${o.a.pts} pts ${o.a.hit?'✓':'✗'}</span>`).join('')}<b>Source</b><span>${esc(q.s)}</span></div></div>`; }).join('');
    $('#drf').onclick=()=>route(); }
  $('#dsh').onclick=async()=>{ const t=`Blindspot duel ${code}: same 5 questions, who knows what they know? ${link}`; try{ if(navigator.share){ await navigator.share({text:t}); return; } }catch(e){ if(e&&e.name==='AbortError') return; } try{ await navigator.clipboard.writeText(t); toast('Copied the invite'); }catch(e){ sheet(`<h3>Send this</h3><textarea readonly>${esc(t)}</textarea>`); } };
};
})();
