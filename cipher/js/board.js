// Cipher · leaderboards: today's fastest (everyone), current streaks, and the friend board (Pro, checked on the server).
(function(){
const A=()=>window.CphApp;
routes.boards=(v,tab)=>{
  tab=tab||'today'; const d=today();
  v.innerHTML=`<h2>Boards</h2><div class="seg" id="bt"><a href="#boards/today" class="${tab==='today'?'on':''}">Today</a><a href="#boards/streaks" class="${tab==='streaks'?'on':''}">Streaks</a><a href="#boards/friends" class="${tab==='friends'?'on':''}">Friends${P()?'':' 🔒'}</a></div><div id="bb"><p class="muted">Loading…</p></div>`;
  const bb=$('#bb'), pl=Store.prefs().player, q=pl?'&pid='+pl.pid:'';
  const fail=e=>{ bb.innerHTML=`<p class="muted">${e&&e.offline?'You’re offline. Boards need a connection.':'Couldn’t load the board.'}</p>`; };
  if(tab==='today'){ const p=CipherGen.daily(d);
    A().capiGet('/api/c/board/daily?d='+d+(pl?'&pid='+pl.pid:'')).then(j=>{ bb.innerHTML=`<p class="muted small">${PZ.icon[p.type]} Daily #${p.num} · ${esc(p.title)} · ${j.total} solver${j.total===1?'':'s'} so far</p>
      ${j.mine?`<div class="note ok">You: #${j.mine.rank} · ${A().fmtMs(j.mine.ms)} · ${j.mine.hints} hint${j.mine.hints===1?'':'s'}</div>`:`<div class="note">Solve today’s puzzle to get on the board. <a href="#play/${d}">Play</a></div>`}
      <div class="card">${j.rows.length?`<table class="bd"><tr><th>#</th><th>Name</th><th class="r">Hints</th><th class="r">Time</th></tr>${j.rows.map(r=>`<tr class="${r.me?'me':''}"><td>${r.rank<=3?['🥇','🥈','🥉'][r.rank-1]:r.rank}</td><td>${esc(r.name)}${r.streak>1?` <span class="muted small">🔥${r.streak}</span>`:''}</td><td class="r">${r.hints}</td><td class="r">${A().fmtMs(r.ms)}</td></tr>`).join('')}</table>`:'<p class="muted" style="margin:0">Nobody yet. Be first!</p>'}</div>
      <p class="muted small center">Times run from opening the puzzle to the right answer, measured by Cipher’s server.</p>`; }).catch(fail); }
  else if(tab==='streaks'){ A().capiGet('/api/c/board/streaks?x=1'+q).then(j=>{ bb.innerHTML=`<div class="card">${j.rows.length?`<table class="bd"><tr><th>#</th><th>Name</th><th class="r">Streak</th><th class="r">Best</th></tr>${j.rows.map(r=>`<tr class="${r.me?'me':''}"><td>${r.rank}</td><td>${esc(r.name)}</td><td class="r">🔥 ${r.streak}</td><td class="r">${r.best}</td></tr>`).join('')}</table>`:'<p class="muted" style="margin:0">No streaks yet.</p>'}</div><p class="muted small center">A streak counts days in a row you solved that day’s puzzle (today’s or yesterday’s).</p>`; }).catch(fail); }
  else { friends(bb); }
};
async function friends(bb){
  const fc=Store.prefs().fc;
  const addHTML=`<div class="card"><h3>Add a friend</h3><div class="row"><input id="fad" placeholder="Friend code" autocapitalize="characters" maxlength="8" autocomplete="off"><button class="btn fx0" id="fab">Add</button></div><p class="muted small" style="margin-bottom:0">Your code: <b class="mono" id="myfc">${esc(fc||'…')}</b> <button class="lnk small" id="fcp">Copy</button></p></div>`;
  let j; try{ const b=await A().pbody({d:today()}); j=await A().capi('/api/c/friends',b); }catch(e){ bb.innerHTML=addHTML+`<p class="muted">${e&&e.offline?'You’re offline.':'Couldn’t load friends.'}</p>`; wire(); return; }
  const myfc=Store.prefs().fc;
  if(!j.pro){ bb.innerHTML=addHTML+`<div class="card"><h3>Friends (${j.friends.length})</h3>${j.friends.length?j.friends.map(f=>`<div class="it"><span class="ic">🙂</span><span class="wh"><b>${esc(f.name)}</b><small class="mono">${f.fc}</small></span></div>`).join(''):'<p class="muted" style="margin:0">No friends added yet.</p>'}</div>
     <div class="card lockcard"><div class="lockic">🔒</div><h3>The friend board is Pro</h3><p class="muted">See your friends’ times today, their streaks and a week of solves side by side.</p><a class="btn" href="#pro">Get Pro · $35</a>${window.Cloud&&Cloud.signedIn()?'':'<p class="muted small">Have Pro? <a href="#account">Sign in</a>.</p>'}</div>`; wire(); return; }
  const wk=j.week.map(x=>new Date(+x.slice(0,4),+x.slice(5,7)-1,+x.slice(8,10)).toLocaleDateString([], {weekday:'narrow'}));
  bb.innerHTML=addHTML+`<div class="card"><h3>Today with friends</h3><table class="bd"><tr><th>Name</th><th>Week</th><th class="r">🔥</th><th class="r">Today</th></tr>${j.rows.map(r=>`<tr class="${r.me?'me':''}"><td>${esc(r.name)}${r.me?' (you)':''}</td><td><div class="wkc" title="${wk.join(' ')}">${r.wk.map(x=>`<i class="${x!=null?'on':''}"></i>`).join('')}</div></td><td class="r">${r.streak}</td><td class="r">${r.ms!=null?A().fmtMs(r.ms):'–'}</td></tr>`).join('')}</table>${j.rows.length<2?'<p class="muted small">Add friends with their codes to fill this in.</p>':''}</div>
    ${j.rows.filter(r=>!r.me).length?`<details class="fold"><summary>Manage friends</summary>${j.rows.filter(r=>!r.me).map(r=>`<div class="it"><span class="wh"><b>${esc(r.name)}</b><small class="mono">${r.fc} · best streak ${r.best} · ${r.solves} solves</small></span><button class="btn ghost sm fx0" data-rm="${r.fc}">Remove</button></div>`).join('')}</details>`:''}`;
  wire(); bb.querySelectorAll('[data-rm]').forEach(b=>b.onclick=async()=>{ try{ const x=await A().pbody({fc:b.dataset.rm}); await A().capi('/api/c/friends/remove',x); toast('Removed'); friends(bb); }catch(e){ toast('Couldn’t remove'); } });
  function wire(){ const ab=$('#fab'); if(ab) ab.onclick=async()=>{ const c=$('#fad').value.toUpperCase().replace(/[^0-9A-Z]/g,''); if(c.length<6) return toast('Friend codes are 6 characters'); try{ const x=await A().pbody({fc:c}); const r=await A().capi('/api/c/friends/add',x); toast('Added '+r.name+' ✓'); friends(bb); }catch(e){ toast(e.message==='no_friend'?'No one has that code':e.message==='self'?'That’s your own code':'Couldn’t add'); } };
    const cp=$('#fcp'); if(cp) cp.onclick=async()=>{ try{ await navigator.clipboard.writeText(Store.prefs().fc||''); toast('Copied'); }catch(e){} };
    const m=$('#myfc'); if(m&&Store.prefs().fc) m.textContent=Store.prefs().fc; }
}
})();
