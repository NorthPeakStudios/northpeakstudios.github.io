// Cipher · 🔍 search + commands (header button, "/" or Cmd-K). Commands open screens, tools, puzzle types in the archive,
// and act on today's puzzle; typing a date (2026-10-12 or "oct 12") or a hunt code finds those too.
(function(){
const go=h=>()=>{ location.hash=h; };
const T=()=>CipherGen.ORDER;
function cmds(){ const td=today(); const out=[
  ['Play','Play today’s puzzle','today daily start',go('#play/'+td),'▶️'],
  ['Play','Play yesterday’s puzzle','yesterday',go('#play/'+(()=>{ const d=new Date(); d.setDate(d.getDate()-1); return Store.dayKey(d); })()),'⏪'],
  ['Play','Random archive puzzle','random surprise old',()=>{ const n=P()?Math.max(1,CipherGen.dayIndex(td)):2; const d=new Date(); d.setDate(d.getDate()-1-Math.floor(Math.random()*n)); location.hash='#play/'+Store.dayKey(d); },'🎲'],
  ['Play','Archive','past puzzles history',go('#archive'),'🗂️'],
  ['Hunts','Join a hunt','code friend',go('#hunts'),'🗺️'],
  ['Hunts','Build a hunt','create make chain friends',go('#build'),'🛠️',1],
  ['Hunts','Hunts you made','mine progress share',go('#hunts'),'🧭'],
  ['Boards','Today’s leaderboard','ranking times fastest',go('#boards/today'),'🏁'],
  ['Boards','Streak leaderboard','streaks days',go('#boards/streaks'),'🔥'],
  ['Boards','Friend board','friends compare',go('#boards/friends'),'👥',1],
  ['Boards','Add a friend','friend code',go('#boards/friends'),'➕'],
  ['Boards','My friend code','share code',go('#profile'),'🪪'],
  ...CphTools.TOOLS.map(([id,ic,n,s,pro])=>['Toolkit',n,s+' tool',go('#tool/'+id),ic,pro]),
  ['Toolkit','All tools','toolkit',go('#tools'),'🧰'],
  ['Today','Reveal a letter (1🪙)','hint reveal',()=>clickOn('#hRev'),'💡'],
  ['Today','Check my work (1🪙)','hint check mistakes',()=>clickOn('#hChk'),'✔︎'],
  ['Today','Big hint (3🪙)','hint big key',()=>clickOn('#hBig'),'🔑',1],
  ['Today','Submit answer','submit done',()=>clickOn('#sub')||clickOn('#hSub'),'📨'],
  ['Today','Share today’s result','share brag',()=>{ location.hash='#play/'+td; setTimeout(()=>clickOn('#shr'),300); },'📤'],
  ['Account','Sign in / account','login email',go('#account'),'👤'],
  ['Account','Get Cipher Pro','pro upgrade buy',go('#pro'),'⭐'],
  ['Account','Redeem a code','unlock code',go('#account'),'🎟️'],
  ['Account','Sync now','sync cloud',()=>{ window.CphSync&&CphSync(); toast('Syncing…'); },'🔄'],
  ['Me','Profile & board name','name rename',go('#profile'),'🪪'],
  ['Me','Stats','times records',go('#stats'),'📈'],
  ['Me','How many hint tokens?','tokens coins',()=>toast('You have 🪙 '+Store.tokens()+' hint tokens'),'🪙'],
  ['Me','My streak','streak',()=>toast('🔥 '+Store.prefs().streak+' day streak (best '+(Store.prefs().best||0)+')'),'🔥'],
  ['Help','How to play','rules help tutorial',go('#help'),'📘'],
  ['Help','Commands list','all commands',go('#commands'),'⌘'],
  ['Help','About Cipher','version about',go('#about'),'ℹ️'],
  ['Help','Reset this phone','delete local',go('#reset'),'🧹'],
  ...T().map(t=>['Archive by type',CipherGen.NAMES[t]+' puzzles','archive '+t,()=>{ location.hash='#archive'; setTimeout(()=>{ const b=document.querySelector(`#af [data-t="${t}"]`); b&&b.click(); },150); },PZ.icon[t]])
 ]; return out.map(([g,n,k,f,ic,pro])=>({g,n,k,f,ic,pro})); }
function clickOn(sel){ const b=document.querySelector(sel); if(b){ b.click(); return true; } toast('Open a puzzle first'); return false; }
function parseDate(q){ q=q.trim().toLowerCase(); let m=q.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if(m) return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
  const mo=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']; m=q.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2})$/); if(m&&mo.includes(m[1])) return '2026-'+String(mo.indexOf(m[1])+1).padStart(2,'0')+'-'+m[2].padStart(2,'0'); return null; }
function open(){ const list=cmds(); let sel=0, shown=[];
  const pal=document.createElement('div'); pal.className='pal'; pal.innerHTML=`<div class="palb" role="dialog" aria-label="Search and commands"><input id="palq" placeholder="Search commands, a date, or a hunt code" autocomplete="off"><div class="palr" id="palr"></div></div>`;
  document.body.appendChild(pal); const q=pal.querySelector('#palq'), r=pal.querySelector('#palr');
  const close=()=>pal.remove();
  pal.addEventListener('click',e=>{ if(e.target===pal) close(); });
  const draw=()=>{ const s=q.value.trim().toLowerCase().replace(/^\//,''); shown=[];
    const d=parseDate(s); if(d&&CipherGen.validDate(d)) shown.push({g:'Go to',n:'Puzzle for '+d,f:go('#play/'+d),ic:'📅'});
    const hc=s.toUpperCase().replace(/[^0-9A-Z]/g,''); if(hc.length===6&&/\d/.test(hc)) shown.push({g:'Go to',n:'Hunt '+hc,f:go('#hunt/'+hc),ic:'🗺️'});
    const words=s.split(/\s+/).filter(Boolean);
    shown.push(...list.filter(c=>words.every(w=>(c.n+' '+c.k+' '+c.g).toLowerCase().includes(w))));
    sel=Math.min(sel,Math.max(0,shown.length-1)); let g='';
    r.innerHTML=shown.length?shown.map((c,i)=>(c.g!==g?`<div class="grp">${esc(g=c.g)}</div>`:'')+`<button type="button" data-i="${i}" class="${i===sel?'on':''}"><span>${c.ic||'•'}</span><span>${esc(c.n)}${c.pro&&!P()?' <span class="pill pro">Pro</span>':''}</span></button>`).join(''):'<p class="muted" style="padding:10px">Nothing matches.</p>'; };
  const run=i=>{ const c=shown[i]; if(!c) return; close(); setTimeout(c.f,10); };
  r.addEventListener('click',e=>{ const b=e.target.closest('button[data-i]'); if(b) run(+b.dataset.i); });
  q.addEventListener('input',()=>{ sel=0; draw(); });
  q.addEventListener('keydown',e=>{ if(e.key==='Escape') close(); else if(e.key==='ArrowDown'){ sel=Math.min(shown.length-1,sel+1); draw(); e.preventDefault(); } else if(e.key==='ArrowUp'){ sel=Math.max(0,sel-1); draw(); e.preventDefault(); } else if(e.key==='Enter') run(sel); });
  draw(); setTimeout(()=>q.focus(),30); }
document.addEventListener('click',e=>{ if(e.target.closest('[data-pal]')) open(); });
document.addEventListener('keydown',e=>{ const t=e.target; const typing=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'); if((e.key==='k'&&(e.metaKey||e.ctrlKey))||(e.key==='/'&&!typing)){ e.preventDefault(); if(!document.querySelector('.pal')) open(); } });
routes.commands=v=>{ const l=cmds(); let g=''; v.innerHTML=`<h2>Commands</h2><p class="muted">Tap 🔍 Search (or press /) and type any of these. You can also type a date like “oct 12” or a hunt code.</p><div class="card list">${l.map(c=>(c.g!==g?`<div class="muted small" style="padding:10px 2px 2px;font-weight:600">${esc(g=c.g)}</div>`:'')+`<div class="it" style="cursor:default"><span class="ic">${c.ic}</span><span class="wh"><b>${esc(c.n)}${c.pro?' <span class="pill pro">Pro</span>':''}</b></span></div>`).join('')}</div><p class="muted small center">${l.length} commands</p>`; };
window.CphCmd={open,count:()=>cmds().length};
})();
