// Cipher · app shell, daily puzzle, archive, profile, stats, help. Northpeak Studios.
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(m){ const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,2800); }
const routes={}; let cleanup=null;
function route(){ const h=(location.hash||'#today').slice(1); const [r,...a]=h.split('/'); const f=routes[r]||routes.today; const v=$('#view'); closeSheet(); if(cleanup){ try{ cleanup(); }catch(e){} cleanup=null; }
  $$('.tabbar a').forEach(x=>{ const k=x.getAttribute('href').slice(1), on=k===r||(x.dataset.also||'').split(' ').includes(r); x.classList.toggle('on',on); on?x.setAttribute('aria-current','page'):x.removeAttribute('aria-current'); });
  const dec=s=>{ try{ return decodeURIComponent(s); }catch(e){ return s; } };
  try{ f(v,...a.map(dec)); }catch(e){ console.warn(e); v.innerHTML='<p class="muted">Something went wrong on this screen.</p>'; } a11y(v); window.scrollTo(0,0); tokChip(); }
function a11y(root){ if(!root) return; root.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]),select,textarea').forEach(el=>{ if(el.getAttribute('aria-label')||(el.labels&&el.labels.length)) return;
  const l=el.previousElementSibling; if(l&&l.tagName==='LABEL'&&!l.htmlFor){ if(!el.id) el.id='f'+Math.random().toString(36).slice(2,8); l.htmlFor=el.id; } else if(el.placeholder) el.setAttribute('aria-label',el.placeholder); }); }
window.addEventListener('hashchange',route);
function sheet(html,onOpen){ $('#sbody').innerHTML='<div class="grab"></div>'+html; $('#sheet').hidden=false; document.body.style.overflow='hidden'; if(onOpen) onOpen($('#sbody')); a11y($('#sbody')); }
function closeSheet(){ const s=$('#sheet'); if(s&&!s.hidden){ s.hidden=true; document.body.style.overflow=''; } }
document.addEventListener('click',e=>{ if(e.target.closest('[data-close]')) closeSheet(); });
const P=()=>!!(window.Cloud&&Cloud.isPro());
const CG=window.CipherGen;
const fmtMs=ms=>{ if(ms==null) return '–'; const s=Math.round(ms/1000), h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=s%60; return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0'); };
const today=()=>Store.dayKey(Date.now());
const addDays=(d,n)=>{ const t=new Date(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10)+n); return Store.dayKey(t); };
const fmtDay=d=>new Date(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10)).toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'});
const FIRST='2026-01-01', FREE_DAYS=3;
function tokChip(){ const c=$('#tokChip'); if(c) c.textContent='🪙 '+Store.tokens(); }
window.addEventListener('cph-data',tokChip);
/* ---------- backend + puzzle player ---------- */
function cloudReady(){ return window.Cloud?Promise.resolve(window.Cloud):new Promise(r=>window.addEventListener('cloud-ready',()=>r(window.Cloud),{once:true})); }
async function capi(path,body){ const C=await cloudReady(); return C.api(path,body); }
async function capiGet(path){ const C=await cloudReady(); return C.api(path); }
let helloP=null;
async function player(force){ const pr=Store.prefs(); if(pr.player&&pr.player.pid&&!force) return pr.player;
  if(helloP) return helloP;
  helloP=(async()=>{ try{ const j=await capi('/api/c/hello',{...(pr.player||{}),name:pr.name||''}); const pl={pid:j.pid,sec:j.sec||(pr.player&&pr.player.sec)}; Store.savePrefs({player:pl,fc:j.fc,name:j.name,streak:j.streak,best:j.best}); return pl; } finally { helloP=null; } })();
  return helloP; }
async function pbody(o){ const pl=await player(); return {pid:pl.pid,sec:pl.sec,...(o||{})}; }
window.CphApp={capi,capiGet,player,pbody,fmtMs,today};
function spend(rec,cost){ if(Store.tokens()<cost){ toast('Not enough hint tokens. Solve puzzles to earn more 🪙'); return false; } rec.spent=(rec.spent||0)+cost; rec.hints=(rec.hints||0)+1; Store.put(rec); tokChip(); return true; }
window.CphSpend=spend;
function localStreak(){ let s=0, d=today(); const done=x=>{ const r=Store.get('d_'+x); return r&&r.done&&!r.arch; }; if(!done(d)) d=addDays(d,-1); while(done(d)){ s++; d=addDays(d,-1); } return s; }
/* ---------- Today ---------- */
routes.today=v=>{
  const d=today(), p=CG.daily(d), r=Store.get('d_'+d)||{}, pr=Store.prefs();
  const y=addDays(d,-1), yr=Store.get('d_'+y)||{}, yp=CG.daily(y);
  const streak=Math.max(localStreak(),0);
  v.innerHTML=`<div class="card hero"><div class="num">Daily #${p.num} · ${fmtDay(d)}</div><h2>${PZ.icon[p.type]} ${esc(p.title)}</h2>
    <p class="muted" style="margin:0 0 10px">${esc(p.how)}</p>
    ${r.done?`<p style="margin:0 0 8px">✅ Solved in <b>${fmtMs(r.ms!=null?r.ms:r.lms)}</b>${r.rank?` · #${r.rank} of ${r.total} today`:''}${r.hints?` · ${r.hints} hint${r.hints>1?'s':''}`:''}</p><a class="btn block" href="#boards">See today’s board</a>`:`<a class="btn big block" href="#play/${d}">${r.t0?'Keep going':'Play today’s puzzle'}</a>`}
    <p class="muted small" style="margin:8px 0 0">Same puzzle for everyone today. Times count from when you open it.</p></div>
    <div class="stat"><div><b>🔥 ${streak}</b><span>day streak</span></div><div><b>🪙 ${Store.tokens()}</b><span>hint tokens</span></div><div><b>${Store.all('d_').filter(x=>x.done).length}</b><span>solved</span></div></div>
    <div class="card"><div class="row"><h3 style="margin:0">Puzzle hunts</h3><a class="fx0 small" href="#hunts">All hunts ›</a></div><p class="muted" style="margin:6px 0">Got a hunt code from a friend? Solve their chain of puzzles in order.</p>
      <div class="row"><input id="tjc" placeholder="Hunt code" autocapitalize="characters" autocomplete="off" maxlength="8"><button class="btn fx0" id="tjb">Join</button></div>
      <p style="margin:10px 0 0"><a href="#build">${P()?'＋ Build a hunt for your friends':'＋ Build your own hunt <span class="pill pro">Pro</span>'}</a></p></div>
    <div class="list card"><a class="it" href="#play/${y}"><span class="ic">${PZ.icon[yp.type]}</span><span class="wh"><b>Yesterday · ${esc(yp.title)}</b><small>${yr.done?'Solved in '+fmtMs(yr.ms!=null?yr.ms:yr.lms):'Still counts for the board until it closes'}</small></span><span class="muted">›</span></a>
      <a class="it" href="#archive"><span class="ic">🗂️</span><span class="wh"><b>Archive</b><small>${P()?'Every past daily':'Last '+FREE_DAYS+' days free · all of them with Pro'}</small></span><span class="muted">›</span></a>
      <a class="it" href="#tools"><span class="ic">🧰</span><span class="wh"><b>Cipher toolkit</b><small>Frequency analysis, shift wheel, tally pad${P()?', Vigenère helper, cryptogram bench':''}</small></span><span class="muted">›</span></a></div>
    ${pr.name?'':`<p class="muted small center">Tip: set your board name in <a href="#profile">Profile</a>.</p>`}`;
  const join=()=>{ const c=$('#tjc').value.toUpperCase().replace(/[^0-9A-Z]/g,''); if(c.length!==6) return toast('Hunt codes are 6 letters/numbers'); location.hash='#hunt/'+c; };
  $('#tjb').onclick=join; $('#tjc').addEventListener('keydown',e=>{ if(e.key==='Enter') join(); });
};
/* ---------- Play a daily (today, yesterday = ranked; older = archive) ---------- */
routes.play=(v,d)=>{
  d=d||today(); if(!CG.validDate(d)){ v.innerHTML='<p class="muted">No puzzle for that day.</p>'; return; }
  const td=today(); if(d>td){ v.innerHTML=`<h2>Not out yet</h2><p class="muted">The puzzle for ${fmtDay(d)} unlocks that day.</p><a class="btn" href="#today">Back to today</a>`; return; }
  if(d<FIRST){ v.innerHTML='<p class="muted">Cipher’s dailies start Jan 1, 2026.</p>'; return; }
  const ranked=d>=addDays(td,-1), free=d>=addDays(td,-(FREE_DAYS-1));
  if(!free&&!P()&&!(Store.get('d_'+d)||{}).done){ CphLock(v,'Puzzle archive','The '+fmtDay(d)+' puzzle is in the archive. Free covers the last '+FREE_DAYS+' days.'); return; }
  const p=CG.daily(d), id='d_'+d; let rec=Store.get(id)||{id,date:d};
  if(!rec.t0&&!rec.done){ rec.t0=Date.now(); rec.arch=!ranked; Store.put(rec); }
  v.innerHTML=`<div class="pzh"><div><div class="muted small">${ranked?'Daily':'Archive'} #${p.num} · ${fmtDay(d)}</div><h2 style="margin:0">${PZ.icon[p.type]} ${esc(p.title)}</h2></div><span class="timer" id="tm">0:00</span></div>
   <p class="how">${esc(p.how)}${p.author&&p.type!=='subst'?` <span class="muted">· ${/^(proverb|unknown|anonymous)$/i.test(p.author)?'an old saying':'a quote by '+esc(p.author.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()))}</span>`:''}</p>
   ${p.type==='vigenere'?`<div class="note">Scrambled key: <b class="mono">${esc(p.keyScr)}</b> (${p.keyLen} letters) · <button class="lnk" id="vigT">Open Vigenère helper</button></div>`:''}
   ${p.type==='caesar'?`<p><button class="btn ghost sm" id="whT">🔄 Try shifts on the wheel</button></p>`:''}
   ${p.type==='subst'?`<p><button class="btn ghost sm" id="frT">📊 Letter frequencies</button></p>`:''}
   <div id="board"></div><div id="after"></div>`;
  const after=$('#after');
  const C=PZ.mount($('#board'),p,{state:rec.st,onChange:s=>{ rec=Store.get(id)||rec; rec.st=s; Store.put(rec); },onInput:()=>{ if(!rec.done&&C&&C.complete()&&CG.check(p,C.answer())) finish(); }});
  /* contextual toolkit buttons (no separate Labs) */
  const vt=$('#vigT'); if(vt) vt.onclick=()=>{ if(!P()) return location.hash='#pro'; CphTools.vigSheet(p.ct); };
  const wt=$('#whT'); if(wt) wt.onclick=()=>CphTools.wheelSheet(p.ct);
  const ft=$('#frT'); if(ft) ft.onclick=()=>CphTools.freqSheet(p.ct);
  const tm=$('#tm'); let iv=null;
  const tick=()=>{ const r=Store.get(id)||rec; tm.textContent=fmtMs(r.done?(r.ms!=null?r.ms:r.lms):Date.now()-(r.t0||Date.now())); };
  tick(); iv=setInterval(tick,1000); cleanup=()=>clearInterval(iv);
  if(ranked&&!rec.done){ CphApp.pbody({d}).then(b=>capi('/api/c/daily/start',b)).then(j=>{ if(j&&j.started){ rec=Store.get(id)||rec; rec.srvT0=j.started; Store.put(rec); } }).catch(()=>{}); }
  function hintBar(){ if(rec.done){ after.innerHTML=solvedHTML(); wireSolved(); return; }
    after.innerHTML=`<div class="hb"><button class="btn ghost" id="hRev">💡 Reveal · 1🪙</button><button class="btn ghost" id="hChk">✔︎ Check · 1🪙</button><button class="btn ghost" id="hBig">${P()?'🔑':'🔒'} Big hint · 3🪙</button></div>
      <button class="btn big block" id="sub">${p.type==='number'?'Try this code':'Submit'}</button><p class="muted small center">Hints: ${rec.hints||0} · you have 🪙 ${Store.tokens()}</p>`;
    $('#hRev').onclick=()=>{ if(!spend(rec,1)) return; rec=Store.get(id); if(!C.reveal()){ rec.spent--; rec.hints--; Store.put(rec); toast('Nothing to reveal'); } hintBar(); C.onAfter&&C.onAfter(); if(C.complete()&&CG.check(p,C.answer())) finish(); };
    $('#hChk').onclick=()=>{ if(!spend(rec,1)) return; rec=Store.get(id); const n=C.check(); if(n!=null&&C.kind!=='ladder'&&C.kind!=='number') toast(n?n+' wrong — marked in red':'Everything so far is right ✓'); hintBar(); };
    $('#hBig').onclick=()=>{ if(!P()){ location.hash='#pro'; return; } if(!spend(rec,3)) return; rec=Store.get(id); const m=C.big(); if(m) sheet(`<h3>Big hint</h3><p>${esc(m)}</p><button class="btn block" data-close="1">Got it</button>`); else { rec.spent-=3; rec.hints--; Store.put(rec); toast('No big hint for this one'); } hintBar(); if(C.complete()&&CG.check(p,C.answer())) finish(); };
    $('#sub').onclick=()=>{ if(!C.complete()) return toast(C.kind==='nono'?'The picture doesn’t match all the clues yet':'Fill everything in first'); if(CG.check(p,C.answer())) return finish(); if(C.wrong) C.wrong(); toast('Not quite. Keep going'); };
  }
  function solvedHTML(){ const ms=rec.ms!=null?rec.ms:rec.lms; return `<div class="card solved center"><div class="muted small">${rec.arch?'Archive puzzle solved':'Solved!'}</div><div class="big">${fmtMs(ms)}</div>
    <p style="margin:4px 0">${rec.rank?`#${rec.rank} of ${rec.total} today · `:''}${rec.hints||0} hint${rec.hints===1?'':'s'} · +${rec.earn||0}🪙${rec.streak?` · 🔥 ${rec.streak} day streak`:''}</p>
    ${p.sol&&typeof p.sol==='string'&&!/^[01|0-9]+$/.test(p.sol.replace(/\|/g,''))?`<p class="mono small" style="margin:8px 0;color:#a7f3d0">${esc(p.sol)}</p>`:''}
    <div class="row" style="margin-top:8px"><button class="btn ghost" id="shr">Share</button>${rec.arch?'<a class="btn ghost" href="#archive">Archive</a>':'<a class="btn" href="#boards">Board</a>'}</div>${rec.offline?'<p class="muted small">Saved on this phone. Your time posts to the board when you’re online.</p>':''}</div>`; }
  function wireSolved(){ const s=$('#shr'); if(s) s.onclick=async()=>{ const t=`Cipher #${p.num} ${PZ.icon[p.type]} ${p.title}: solved in ${fmtMs(rec.ms!=null?rec.ms:rec.lms)}${rec.hints?' with '+rec.hints+' hint'+(rec.hints>1?'s':''):' with no hints'}${rec.rank?' (#'+rec.rank+' today)':''}\nhttps://northpeakstudios.github.io/cipher/`; try{ if(navigator.share) await navigator.share({text:t}); else { await navigator.clipboard.writeText(t); toast('Copied'); } }catch(e){} }; }
  async function finish(){ if(rec.done) return; rec=Store.get(id)||rec; rec.done=true; rec.lms=Date.now()-(rec.t0||Date.now()); rec.earn=rec.arch?1:2+(rec.hints?0:1); rec.solvedAt=Date.now(); rec.ans=C.answer(); Store.put(rec);
    toast('Solved! +'+rec.earn+'🪙'); hintBar(); tick();
    if(!rec.arch) await postResult(id); hintBar(); }
  hintBar();
};
async function postResult(id){ let rec=Store.get(id); if(!rec||!rec.done||rec.posted||rec.arch) return;
  try{ const b=await CphApp.pbody({d:rec.date,ans:rec.ans,hints:rec.hints||0}); const j=await capi('/api/c/daily/done',b);
    rec=Store.get(id); if(j.correct){ Object.assign(rec,{ms:j.ms,rank:j.rank,total:j.total,streak:j.streak,posted:true,offline:false}); Store.savePrefs({streak:j.streak,best:j.best}); } Store.put(rec); }
  catch(e){ rec=Store.get(id); rec.offline=true; Store.put(rec); } }
/* results solved offline post later (still counts while the day is open) */
function postPending(){ for(const r of Store.all('d_')) if(r.done&&!r.posted&&!r.arch&&r.date>=addDays(today(),-1)) postResult(r.id); }
window.addEventListener('online',postPending); setTimeout(postPending,4000);
/* ---------- Archive ---------- */
routes.archive=v=>{
  const td=today(); const days=[]; for(let d=td;d>=FIRST&&days.length<400;d=addDays(d,-1)) days.push(d);
  let html=`<h2>Archive</h2><p class="muted">Every daily since Jan 1, 2026. ${P()?'All unlocked with Pro.':'The last '+FREE_DAYS+' days are free. <a href="#pro">Pro</a> opens all of them.'}</p><div class="chips" id="af"><button class="chip on" data-t="">All</button>${CG.ORDER.map(t=>`<button class="chip" data-t="${t}">${PZ.icon[t]} ${CG.NAMES[t]}</button>`).join('')}</div><div class="card list" id="al"></div>`;
  v.innerHTML=html; let flt='';
  const draw=()=>{ let mo=''; $('#al').innerHTML=days.map(d=>{ const p=CG.daily(d); if(flt&&p.type!==flt) return ''; const r=Store.get('d_'+d)||{}; const lock=!P()&&d<addDays(td,-(FREE_DAYS-1))&&!r.done; const m=new Date(+d.slice(0,4),+d.slice(5,7)-1,1).toLocaleDateString([], {month:'long',year:'numeric'});
    const hd=m!==mo?`<div class="muted small" style="padding:10px 2px 2px;font-weight:600">${(mo=m)}</div>`:'';
    return hd+`<a class="it" href="#play/${d}"><span class="ic">${PZ.icon[p.type]}</span><span class="wh"><b>#${p.num} · ${esc(p.title)}</b><small>${fmtDay(d)}${r.done?' · ✅ '+fmtMs(r.ms!=null?r.ms:r.lms):r.t0?' · started':''}</small></span>${lock?'<span>🔒</span>':'<span class="muted">›</span>'}</a>`; }).join(''); };
  draw(); $('#af').onclick=e=>{ const b=e.target.closest('.chip'); if(!b) return; flt=b.dataset.t; $$('#af .chip').forEach(x=>x.classList.toggle('on',x===b)); draw(); };
};
/* ---------- Pro lock card ---------- */
window.CphLock=(v,what,detail)=>{ v.innerHTML=`<div class="card lockcard"><div class="lockic">🔒</div><h2>${esc(what)}</h2><p class="muted">${esc(detail||'')}</p>
  <p>Part of <b>Cipher Pro</b>: build puzzle hunts for friends, the full daily archive, the advanced toolkit (Vigenère helper, cryptogram bench, auto-shift), big hints and the friend leaderboard. The daily puzzle, solving shared hunts and basic hints stay free.</p>
  <p><a class="btn big" href="#pro">Get Pro · $35</a></p><p class="muted small">Or $100 Northpeak All-Access: every Northpeak app.${window.Cloud&&Cloud.signedIn()?'':' Already have Pro or All-Access? <a href="#account">Sign in</a>.'}</p></div>`; };
/* ---------- Profile ---------- */
routes.profile=v=>{ const pr=Store.prefs();
  v.innerHTML=`<h2>Profile</h2><div class="card"><label>Name on the boards</label><div class="row"><input id="pnm" maxlength="20" value="${esc(pr.name||'')}" placeholder="e.g. Odin"><button class="btn fx0" id="pns">Save</button></div><p class="muted small">Shown on leaderboards and hunt progress. 2–20 letters.</p></div>
   <div class="card"><h3>Your friend code</h3><div class="share" id="pfc">${esc(pr.fc||'······')}</div><p class="muted small center">Friends add this code on the Boards › Friends tab.</p><div class="row"><button class="btn ghost" id="pcp">Copy</button><a class="btn ghost" href="#boards/friends">Friends</a></div></div>
   <div class="stat"><div><b>🔥 ${localStreak()}</b><span>streak</span></div><div><b>${pr.best||0}</b><span>best streak</span></div><div><b>🪙 ${Store.tokens()}</b><span>tokens</span></div></div>
   <p class="muted small">${window.Cloud&&Cloud.signedIn()?'Signed in: your puzzle player syncs to your other devices.':'Sign in to keep your puzzle player, streak and tokens on every device.'}</p>`;
  if(!pr.fc) player().then(()=>{ const x=$('#pfc'); if(x) x.textContent=Store.prefs().fc||'—'; }).catch(()=>{ const x=$('#pfc'); if(x) x.textContent='offline'; });
  $('#pns').onclick=async()=>{ const n=$('#pnm').value.trim(); if(n.length<2) return toast('2+ letters'); Store.savePrefs({name:n}); try{ await player(true); toast('Saved ✓'); }catch(e){ toast('Saved here, will update the boards when online'); } };
  $('#pcp').onclick=async()=>{ try{ await navigator.clipboard.writeText(Store.prefs().fc||''); toast('Copied'); }catch(e){} };
};
/* ---------- Stats ---------- */
routes.stats=v=>{ const all=Store.all('d_').filter(x=>x.done); const by={}; for(const r of all){ const t=CG.daily(r.date).type; (by[t]=by[t]||[]).push(r.ms!=null?r.ms:r.lms); }
  const hs=Store.all('h_'); v.innerHTML=`<h2>Stats</h2><div class="stat"><div><b>${all.length}</b><span>dailies</span></div><div><b>${hs.filter(x=>x.done).length}</b><span>hunts done</span></div><div><b>${Store.earned()}</b><span>🪙 earned</span></div></div>
   <div class="card"><h3>By puzzle type</h3><table class="bd"><tr><th>Type</th><th class="r">Solved</th><th class="r">Best</th><th class="r">Average</th></tr>${CG.ORDER.map(t=>{ const a=by[t]||[]; return `<tr><td>${PZ.icon[t]} ${CG.NAMES[t]}</td><td class="r">${a.length}</td><td class="r">${a.length?fmtMs(Math.min(...a)):'–'}</td><td class="r">${a.length?fmtMs(a.reduce((s,x)=>s+x,0)/a.length):'–'}</td></tr>`; }).join('')}</table></div>`; };
/* ---------- More ---------- */
routes.more=v=>{ const s=window.Cloud&&Cloud.signedIn();
  v.innerHTML=`<h2>More</h2><div class="card list">
   <a class="it" href="#account"><span class="ic">👤</span><span class="wh"><b>${s?esc(Cloud.acct.user):'Sign in'}</b><small>${s?(P()?'⭐ Pro':'Free plan'):'One Northpeak login for every app'}</small></span><span class="muted">›</span></a>
   <a class="it" href="#pro"><span class="ic">⭐</span><span class="wh"><b>Cipher Pro</b><small>${P()?'Unlocked':'Hunt builder, full archive, advanced tools, friend board'}</small></span><span class="muted">›</span></a>
   <a class="it" href="#profile"><span class="ic">🪪</span><span class="wh"><b>Profile & friend code</b><small>Your board name</small></span><span class="muted">›</span></a>
   <a class="it" href="#stats"><span class="ic">📈</span><span class="wh"><b>Stats</b><small>Times by puzzle type</small></span><span class="muted">›</span></a>
   <a class="it" href="#archive"><span class="ic">🗂️</span><span class="wh"><b>Archive</b><small>Past dailies</small></span><span class="muted">›</span></a>
   <a class="it" href="#help"><span class="ic">📘</span><span class="wh"><b>How to play</b><small>Every puzzle type + hint tokens</small></span><span class="muted">›</span></a>
   <a class="it" href="#commands"><span class="ic">⌘</span><span class="wh"><b>Commands</b><small>Everything you can search for</small></span><span class="muted">›</span></a>
   <a class="it" href="#about"><span class="ic">ℹ️</span><span class="wh"><b>About Cipher</b><small>Version 1.0</small></span><span class="muted">›</span></a></div>`; };
routes.help=v=>{ v.innerHTML=`<h2>How to play</h2>
  <div class="card"><h3>🪙 Hint tokens</h3><p class="muted" style="margin:0">You start with 5. Solving today’s or yesterday’s daily earns 2 (3 with no hints), an archive puzzle 1, each hunt step 1 and finishing a hunt 2. Reveal and Check cost 1. Big hints (Pro) cost 3.</p></div>
  ${[['caesar','Every letter moved the same number of places. Find one word (like a lone letter, usually A or I) and the shift falls out. Tap a square, type a letter: every matching cipher letter fills in.'],['vigenere','A keyword shifts each letter by a different amount, repeating. Unscramble the key, then decode letter by letter. The Vigenère helper (Pro) decodes with any key you try.'],['subst','Each letter was swapped for another, the same way every time. Look for E, T, A, O and short words like THE and AND. One letter is given.'],['nonogram','Each number is a run of filled squares, in order, with at least one gap between runs. Switch to × to mark squares you know are empty. Drag to paint.'],['logic','Four people, one of each thing. Tap squares to mark ✗ (no) or ✓ (yes). A ✓ crosses out the rest of its row and column for you.'],['ladder','Change one letter at a time to reach the last word. Every step must be a real word. Par is the shortest route.'],['number','Find the 4-digit code (no repeated digits). Green dots = right digit in the right place, gold = right digit in the wrong place. Wrong tries show their dots too.']].map(([t,s])=>`<div class="card"><h3>${PZ.icon[t]} ${CG.NAMES[t]}</h3><p class="muted" style="margin:0">${s}</p></div>`).join('')}
  <div class="card"><h3>🗺️ Puzzle hunts</h3><p class="muted" style="margin:0">A hunt is 3–10 puzzles made by a friend, with their own answers. Solve them in order; each answer unlocks the next. The creator (and everyone in the hunt) sees who’s on which step.</p></div>`; };
routes.about=v=>{ v.innerHTML=`<h2>About Cipher</h2><div class="card"><p style="margin-top:0"><b>Cipher 1.0</b> · by Northpeak Studios</p><p class="muted">A daily puzzle for everyone (ciphers, nonograms, logic grids, word ladders, number locks), puzzle hunts you build for friends, leaderboards and a code-breaker’s toolkit.</p>
  <p class="muted small">Every daily is generated from its date and checked by code to have exactly one answer (the word ladder accepts any valid route). Your progress stays on this phone; signed in, it syncs encrypted on this phone first. Board names, solve times and hunts you make are stored on Cipher’s server so friends can see them.</p>
  <p class="muted small">New in 1.0: everything. Free: the daily, yesterday’s daily, the last ${FREE_DAYS} days of the archive, solving any shared hunt, reveal/check hints, the daily and streak boards, frequency analysis, shift wheel, tally pad. Pro: the hunt builder, the full archive, big hints, the friend board, the Vigenère helper, the cryptogram bench and auto-shift.</p></div>
  <p class="center"><a href="../">Northpeak Studios</a></p>`; };
routes.reset=v=>{ v.innerHTML=`<h2>Reset this phone</h2><p class="muted">Deletes Cipher’s progress on this phone only (not your account’s synced copy).</p><button class="btn danger" id="rz">Delete local progress</button>`; $('#rz').onclick=()=>{ if(confirm('Delete Cipher progress on this phone?')){ localStorage.removeItem('cph.db'); location.hash='#today'; location.reload(); } }; };
document.addEventListener('DOMContentLoaded',()=>{ route(); });
if(document.readyState!=='loading') setTimeout(route,0);
