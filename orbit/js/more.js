// Orbit · weekly orbit report, birthday radar, More, About, help, backup, and the search + commands palette.
(function(){
const DAY=864e5;
function weekStart(t){ const d=new Date(t); d.setHours(0,0,0,0); const wd=(d.getDay()+6)%7; d.setDate(d.getDate()-wd); return d.getTime(); }
/* friend status at a moment in the past (for "drifting at week end") */
function ratioAt(f,at){ let l=f.seed&&f.seed<=at?f.seed:0; for(const t of Store.talks(f.id)) if(t.t<=at&&t.t>l) l=t.t; if(!l) l=Math.min(f.created||at,at); return ((at-l)/DAY)/Store.every(f); }
function weekData(off){ const ws=weekStart(Date.now())-off*7*DAY, we=ws+7*DAY, end=Math.min(we,Date.now());
  const fs=Store.friends().filter(f=>(f.created||0)<we); const talks=Store.talks().filter(t=>t.t>=ws&&t.t<we&&fs.some(f=>f.id===t.fid));
  const people=new Set(talks.map(t=>t.fid)); const byKind={}; talks.forEach(t=>byKind[t.kind]=(byKind[t.kind]||0)+1);
  const per={}; talks.forEach(t=>per[t.fid]=(per[t.fid]||0)+1);
  const pulled=fs.filter(f=>{ const first=talks.filter(t=>t.fid===f.id).sort((a,b)=>a.t-b.t)[0]; return first&&ratioAt(f,first.t-1)>1; });
  const driftEnd=fs.filter(f=>ratioAt(f,end)>1).sort((a,b)=>ratioAt(b,end)-ratioAt(a,end));
  const inner=fs.filter(f=>f.ring==='inner'); const innerOk=inner.filter(f=>ratioAt(f,end)<=1).length;
  const avgR=fs.length?fs.reduce((s,f)=>s+Math.min(3,ratioAt(f,end)),0)/fs.length:0;
  return {ws,we,end,fs,talks,people,byKind,per,pulled,driftEnd,inner,innerOk,avgR}; }
function gravity(d){ return Math.max(0,Math.round(100-d.avgR*40)); }
routes.report=(v,arg)=>{ if(!OrbPro.pro()) return OrbLocked(v,'Weekly orbit report','Every week: who you reached, who you pulled back in, who’s drifting, your inner-ring health, shared streaks and the birthdays coming up.');
  const off=Math.max(0,Math.min(52,parseInt(arg||'0',10)||0)); const d=weekData(off), p=weekData(off+1);
  if(!d.fs.length){ v.innerHTML='<h2>Weekly orbit report</h2><div class="empty">Add friends and log some talks, and your report fills in. <a href="#add">Add a friend</a></div>'; return; }
  const g=gravity(d), gp=gravity(p), diff=n=>n>0?`<span class="up">▲ ${n}</span>`:n<0?`<span class="dn">▼ ${-n}</span>`:'<span class="muted">same</span>';
  const top=Object.entries(d.per).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,n])=>({f:Store.friend(id),n})).filter(x=>x.f);
  const mut=OrbMutual.state().pairs; const streaks=Object.values(mut).map(m=>({m,f:Store.friend(m.fid)})).filter(x=>x.f).sort((a,b)=>b.m.streak-a.m.streak);
  const bds=Store.friends().map(f=>({f,b:f.bday&&OrbBday(f.bday)})).filter(x=>x.b&&x.b.days<=30).sort((a,b)=>a.b.days-b.b.days);
  const range=fmtD(d.ws)+' – '+fmtD(d.we-DAY);
  const kinds=Object.entries(d.byKind).sort((a,b)=>b[1]-a[1]); const maxK=Math.max(1,...kinds.map(k=>k[1]));
  v.innerHTML=`<div class="ohead"><div><h2>Weekly orbit report</h2><p class="muted small">${off===0?'This week so far':off===1?'Last week':off+' weeks ago'} · ${esc(range)}</p></div></div>
   <div class="seg"><a href="#report/${off+1}" role="button">‹ Earlier</a><a class="on">${off===0?'This week':off===1?'Last week':off+' wks ago'}</a><a ${off?`href="#report/${off-1}"`:'class="faded"'} role="button">Later ›</a></div>
   <div class="card grav"><div class="gnum"><b>${g}</b><small>gravity</small></div><div><p style="margin:0 0 4px"><b>${g>=80?'Tight orbit':g>=55?'Holding steady':g>=35?'Starting to drift':'Lots of drift'}</b> ${diff(g-gp)}</p><p class="muted small" style="margin:0">100 = everyone inside their target. Drops as people drift past how often you want to talk.</p></div></div>
   <div class="stat"><div><b>${d.talks.length}</b><span>talks ${diff(d.talks.length-p.talks.length)}</span></div><div><b>${d.people.size}</b><span>people reached</span></div><div><b>${d.pulled.length}</b><span>pulled back in</span></div></div>
   <div class="report">
    ${d.inner.length?`<h3>Inner ring</h3><p style="margin:0">${d.innerOk} of ${d.inner.length} inner-ring friends on target${d.innerOk===d.inner.length?' 💪':''}.</p>`:''}
    ${kinds.length?`<h3>How you talked</h3><div class="bars">${kinds.map(([k,n])=>`<div class="b2"><span>${Store.KINDS[k][0]} ${Store.KINDS[k][1]}</span><div class="t"><i style="width:${n/maxK*100}%;background:var(--acc)"></i></div><em>${n}</em></div>`).join('')}</div>`:'<h3>How you talked</h3><p class="muted" style="margin:0">No talks logged this week yet.</p>'}
    ${top.length?`<h3>Most in touch</h3>${top.map(x=>`<p class="rl">${esc(x.f.emoji||'')} <b>${esc(x.f.name)}</b> · ${x.n} talk${x.n>1?'s':''}</p>`).join('')}`:''}
    ${d.pulled.length?`<h3>Pulled back in 🪐</h3><p style="margin:0">${d.pulled.map(f=>esc(f.name)).join(', ')}</p>`:''}
    <h3>Drifting ${off===0?'right now':'at week’s end'}</h3>${d.driftEnd.length?`<p style="margin:0">${d.driftEnd.slice(0,8).map(f=>`<a href="#friend/${encodeURIComponent(f.id)}">${esc(f.name)}</a>`).join(', ')}${d.driftEnd.length>8?' +'+(d.driftEnd.length-8):''}</p>`:'<p style="margin:0">Nobody 🎉</p>'}
    ${streaks.length?`<h3>Shared streaks</h3>${streaks.map(x=>`<p class="rl">🔥 <b>${x.m.streak}</b> week${x.m.streak===1?'':'s'} with ${esc(x.f.name)}${x.m.this_week?'':' · <span class="dn">log a talk this week to keep it</span>'}</p>`).join('')}`:''}
    <h3>Birthday radar · next 30 days</h3>${bds.length?bds.map(x=>`<p class="rl">🎂 <b>${esc(x.f.name)}</b> · ${x.b.days===0?'today':x.b.days===1?'tomorrow':'in '+x.b.days+' days'} (${esc(fmtD(x.b.next.getTime()))})${x.b.age?' · turns '+x.b.age:''}</p>`).join(''):'<p class="muted" style="margin:0">None coming up. <a href="#bday">Open the radar</a></p>'}
   </div>
   <div class="row"><button class="btn ghost" id="rshare">Share report</button><a class="btn ghost" href="#bday">Birthday radar</a></div>`;
  $('#rshare').onclick=async()=>{ const txt=`My Orbit week (${range}): gravity ${g}/100, ${d.talks.length} talks with ${d.people.size} people${d.pulled.length?', pulled '+d.pulled.length+' back in':''}. 🪐 Orbit by Northpeak`; if(navigator.share){ try{ await navigator.share({text:txt}); }catch(e){} } else { try{ await navigator.clipboard.writeText(txt); toast('Copied'); }catch(e){ toast(txt); } } };
};
/* birthday radar: the year as a dial, a sweep from today; dots = birthdays, hotter the sooner */
routes.bday=v=>{ if(!OrbPro.pro()) return OrbLocked(v,'Birthday radar','See every birthday in your orbit on one dial, with what’s coming up first.');
  const list=Store.friends().map(f=>({f,b:f.bday&&OrbBday(f.bday)})).filter(x=>x.b).sort((a,b)=>a.b.days-b.b.days);
  const now=new Date(), doy=d=>{ const s=new Date(d.getFullYear(),0,1); return (d-s)/DAY; }, ang=dd=>dd/365.25*Math.PI*2-Math.PI/2;
  const cx=150,cy=150,R=128, ta=ang(doy(now));
  const dots=list.map((x,i)=>{ const a=ang(doy(new Date(now.getFullYear(),x.b.m-1,x.b.d))); const rr=R*(.42+.5*((i*37)%100)/100); const col=x.b.days<=7?'#ff5a5f':x.b.days<=30?'#f5b04c':'#7c9cff';
    return `<g><circle cx="${(cx+Math.cos(a)*rr).toFixed(1)}" cy="${(cy+Math.sin(a)*rr).toFixed(1)}" r="${x.b.days<=7?7:5}" fill="${col}" ${x.b.days<=7?'class="hot"':''}/><title>${esc(x.f.name)} · ${esc(x.b.label)}</title></g>`; }).join('');
  const months=[...Array(12)].map((_,i)=>{ const a=ang(doy(new Date(now.getFullYear(),i,1))+14); return `<text x="${(cx+Math.cos(a)*(R+12)).toFixed(1)}" y="${(cy+Math.sin(a)*(R+12)+4).toFixed(1)}">${new Date(2000,i,1).toLocaleDateString([],{month:'narrow'})}</text>`; }).join('');
  const ticks=[...Array(12)].map((_,i)=>{ const a=ang(doy(new Date(now.getFullYear(),i,1))); return `<line x1="${cx+Math.cos(a)*R*.25}" y1="${cy+Math.sin(a)*R*.25}" x2="${cx+Math.cos(a)*R}" y2="${cy+Math.sin(a)*R}"/>`; }).join('');
  v.innerHTML=`<h2>Birthday radar</h2><p class="muted small" style="margin-top:0">${list.length} birthday${list.length===1?'':'s'} in your orbit · the line is today</p>
   <div class="card radar"><svg viewBox="-14 -14 328 328" role="img" aria-label="Birthday radar"><defs><radialGradient id="rg"><stop offset="0" stop-color="#7c9cff" stop-opacity=".18"/><stop offset="1" stop-color="#7c9cff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${R}" class="rbg"/><circle cx="${cx}" cy="${cy}" r="${R*.66}" class="rr"/><circle cx="${cx}" cy="${cy}" r="${R*.33}" class="rr"/><g class="tk">${ticks}</g><g class="mo">${months}</g>
    <g class="sweep" style="transform-origin:${cx}px ${cy}px;transform:rotate(${(ta*180/Math.PI+90).toFixed(1)}deg)"><path d="M${cx} ${cy} L${cx} ${cy-R} A${R} ${R} 0 0 0 ${(cx-Math.sin(.5)*R).toFixed(1)} ${(cy-Math.cos(.5)*R).toFixed(1)} Z" fill="url(#rg)"/><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy-R}" class="nd"/></g>
    ${dots}<circle cx="${cx}" cy="${cy}" r="4" fill="#ffd27a"/></svg>
    <div class="legend"><i style="background:#ff5a5f"></i>this week <i style="background:#f5b04c;margin-left:8px"></i>this month <i style="background:#7c9cff;margin-left:8px"></i>later</div></div>
   ${list.length?`<div class="card list">${list.map(x=>`<a class="it" href="#friend/${encodeURIComponent(x.f.id)}">${avatar(x.f)}<div class="wh"><b>${esc(x.f.name)}</b><small>${esc(x.b.label)}</small></div><span class="pill ${x.b.days<=7?'warn':''}">${x.b.days===0?'today 🎉':x.b.days===1?'tomorrow':x.b.days+'d'}</span></a>`).join('')}</div>`:'<div class="empty">No birthdays yet. Add them on a friend’s page (Edit › Birthday).</div>'}`;
};
routes.more=v=>{ const C=window.Cloud, s=C&&C.signedIn();
  v.innerHTML=`<h2>More</h2>
   <div class="card list">
    <a class="it" href="#account"><span class="kic">👤</span><div class="wh"><b>${s?'Account':'Sign in'}</b><small>${s?esc(C.acct.user):'One Northpeak login for every app'}</small></div></a>
    <a class="it" href="#pro"><span class="kic">⭐</span><div class="wh"><b>Orbit Pro</b><small>${OrbPro.pro()?'You have Pro':'Unlimited friends, mutual orbits, reports'}</small></div></a>
    <a class="it" href="#mutual"><span class="kic">⇄</span><div class="wh"><b>Mutual orbits</b><small>Link with friends who use Orbit</small></div></a>
    <a class="it" href="#report"><span class="kic">📊</span><div class="wh"><b>Weekly orbit report</b><small>Gravity score, who you reached, who’s drifting</small></div></a>
    <a class="it" href="#bday"><span class="kic">🎂</span><div class="wh"><b>Birthday radar</b><small>Every birthday on one dial</small></div></a>
    <a class="it" href="#cmds" data-pal=""><span class="kic">🔍</span><div class="wh"><b>Search & commands</b><small>Jump anywhere, log a talk by typing a name</small></div></a>
    <a class="it" href="#data"><span class="kic">💾</span><div class="wh"><b>Backup</b><small>Export or import your orbit</small></div></a>
    <a class="it" href="#help"><span class="kic">❔</span><div class="wh"><b>How Orbit works</b><small>Drift, rings, the queue, streaks</small></div></a>
    <a class="it" href="#about"><span class="kic">🪐</span><div class="wh"><b>About</b><small>Orbit 1.0 · Northpeak Studios</small></div></a>
   </div>
   <label class="fck"><input type="checkbox" id="vm" ${document.documentElement.classList.contains('v-motion')?'checked':''}> Reduce motion (stop the planets moving)</label>`;
  $('#vm').onchange=()=>{ document.documentElement.classList.toggle('v-motion',$('#vm').checked); localStorage.setItem('orb.view',JSON.stringify({motion:$('#vm').checked})); };
};
routes.help=v=>{ v.innerHTML=`<p><a href="#more" class="muted small">‹ More</a></p><h2>How Orbit works</h2><div class="card">
  <p><b>Drift.</b> Each friend has a target: “talk every N days”. Distance from you = days since you last talked ÷ that target. On target, they sit inside their ring’s dashed line. Past it, they drift out and glow red.</p>
  <p><b>Rings.</b> Inner (closest, default every 7 days), middle (21), outer (60). Inner planets start nearer and count more in your queue.</p>
  <p><b>We talked.</b> One tap on a friend: texted, called, in person, hung out. That pulls them right back in. Add a time or a note (Pro) with “Log with a note”.</p>
  <p><b>Today’s queue.</b> Each day Orbit picks up to 3 people drifting the most (inner ring weighted up, birthdays close by bumped) with a conversation starter from your notes: things to ask next time, the last thing you noted, what they’re into, or a starter if you have no notes yet. Snooze or skip anyone.</p>
  <p><b>Mutual orbits (Pro to invite, free to join).</b> Link with a friend who uses Orbit. Talks either of you logs show up for both, and you share a weekly streak: a week counts when either of you logs a talk.</p>
  <p><b>Weekly report (Pro).</b> Your gravity score (100 = everyone on target), talks, people reached, who you pulled back in, who’s drifting, inner-ring health, streaks, and birthdays in the next 30 days.</p>
  <p class="muted small" style="margin-bottom:0">Orbit is for staying close to people. It isn’t therapy or advice; if you’re having a hard time, talk to someone you trust.</p></div>`; };
routes.about=v=>{ v.innerHTML=`<p><a href="#more" class="muted small">‹ More</a></p><div class="center"><img src="icon-192.png" alt="" width="84" height="84" style="border-radius:20px"><h2>Orbit</h2><p class="muted">Friend gravity · version 1.0<br>by Northpeak Studios</p></div>
  <div class="card"><h3>New in 1.0</h3><ul class="ul"><li>Live orbit: friends as planets that drift out when it’s been too long</li><li>One-tap “we talked” logging, notes per talk</li><li>Daily reconnect queue with conversation starters from your notes</li><li>Details to remember: birthdays, interests, things to ask next time</li><li>Mutual orbits with friends who use Orbit, with shared weekly streaks</li><li>Birthday radar + weekly orbit report</li><li>Search & commands, backup export/import, encrypted sync with your Northpeak account</li></ul></div>
  <div class="card"><h3>Free vs Pro</h3><p class="muted small" style="margin:0"><b>Free:</b> orbit view, logging, reconnect queue, up to 8 friends, joining a mutual orbit. <b>Pro ($35, or $100 All-Access):</b> unlimited friends, creating mutual orbits, the weekly report, birthday radar, notes and details.</p></div>
  <p class="muted small center">Your orbit lives on this phone. Signed in, it syncs encrypted with your password. <a href="https://northpeakstudios.github.io/">Northpeak Studios</a></p>`; };
/* backup */
routes.data=v=>{ const n=Store.friends(true).length, t=Store.talks().filter(x=>x.src!=='them').length;
  v.innerHTML=`<p><a href="#more" class="muted small">‹ More</a></p><h2>Backup</h2><div class="card"><p style="margin-top:0">${n} friends · ${t} talks on this phone (${Math.round(Store.bytes()/1024)} KB).</p>
   <button class="btn block" id="dx">Export backup (.json)</button><button class="btn ghost block" id="dcsv">Export talks (.csv)</button>
   <label class="btn ghost block" style="text-align:center;margin-top:4px">Import a backup<input type="file" id="di" accept=".json,application/json" hidden></label><p id="dm" class="muted"></p></div>
   <p class="muted small">Import adds friends and talks that aren’t here yet. Nothing gets deleted.</p>`;
  const dl=(name,txt,type)=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([txt],{type})); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); };
  $('#dx').onclick=()=>{ dl('orbit-backup-'+Store.dayKey(Date.now())+'.json',JSON.stringify({app:'orbit',v:1,at:Date.now(),...Store.dump()},null,1),'application/json'); toast('Backup saved'); };
  $('#dcsv').onclick=()=>{ const q=s=>{ s=String(s==null?'':s); if(/^[=+\-@]/.test(s)) s="'"+s; return '"'+s.replace(/"/g,'""')+'"'; };
    const rows=[['date','time','friend','ring','how','note']].concat(Store.talks().filter(x=>x.src!=='them').map(x=>{ const f=Store.friend(x.fid)||{}; const d=new Date(x.t); return [Store.dayKey(x.t),d.toTimeString().slice(0,5),f.name,f.ring,(Store.KINDS[x.kind]||[])[1],x.note]; }));
    dl('orbit-talks.csv',rows.map(r=>r.map(q).join(',')).join('\n'),'text/csv'); };
  $('#di').onchange=async()=>{ const f=$('#di').files[0]; if(!f) return; if(f.size>8e6) return $('#dm').textContent='That file is too big.';
    try{ const j=JSON.parse(await f.text()); if(!j||j.app!=='orbit'||typeof j.f!=='object') throw 0; const list=[]; let nf=0,nt=0;
      for(const x of Object.values(j.f||{})){ if(x&&/^f_[\w-]+$/.test(x.id)&&typeof x.name==='string'&&!Store.friend(x.id)){ list.push(x); nf++; } }
      for(const x of Object.values(j.i||{})){ if(x&&/^i_[\w-]+$/.test(x.id)&&x.fid&&!Store.talk(x.id)&&(Store.friend(x.fid)||list.some(f=>f.id===x.fid))){ delete x.mid; list.push(x); nt++; } }
      Store.bulk(list); $('#dm').textContent=nf||nt?`Imported ${nf} friends and ${nt} talks.`:'Nothing new to import, it’s all here already.'; }
    catch(e){ $('#dm').textContent='That isn’t an Orbit backup file.'; } };
};
/* ---------- search + commands ---------- */
const CMDS=[
 ['🪐','Orbit view','orbit home planets map','#orbit'],['☀️','Today’s queue','who to text reconnect suggestion','#today'],['👥','All friends','list people','#friends'],['➕','Add a friend','new person','#add'],
 ['📊','Weekly orbit report','report week stats gravity','#report',1],['📊','Last week’s report','report previous','#report/1',1],['🎂','Birthday radar','birthdays upcoming','#bday',1],
 ['⇄','Mutual orbits','link friends streak shared','#mutual'],['🔑','Enter a friend’s code','join link mutual code','#join'],['🔴','Who’s drifting','drift far away red','#orbit',0,()=>localStorage.setItem('orb.ring','all')],
 ['💙','Show inner ring','filter inner closest','#orbit',0,()=>localStorage.setItem('orb.ring','inner')],['💚','Show middle ring','filter middle','#orbit',0,()=>localStorage.setItem('orb.ring','middle')],['💜','Show outer ring','filter outer','#orbit',0,()=>localStorage.setItem('orb.ring','outer')],
 ['🗂️','Archived friends','archive hidden','#friends',0,()=>localStorage.setItem('orb.arch','1')],['💾','Export backup','download json save','#data'],['📥','Import backup','restore upload','#data'],
 ['👤','Account','sign in login northpeak','#account'],['⭐','Get Orbit Pro','upgrade buy pay all-access','#pro'],['🎟️','Redeem a code','unlock owner bot code','#account'],
 ['❔','How Orbit works','help drift rings explain','#help'],['🪐','About Orbit','version 1.0','#about'],
 ['🐢','Reduce motion','animation stop planets','',0,()=>{ const on=!document.documentElement.classList.contains('v-motion'); document.documentElement.classList.toggle('v-motion',on); localStorage.setItem('orb.view',JSON.stringify({motion:on})); toast(on?'Motion off':'Motion on'); }],
 ['🔄','Sync now','cloud refresh','',0,()=>{ window.OrbSync&&OrbSync(); window.OrbMutual&&OrbMutual.pull(); toast('Syncing…'); }]];
function palette(){ if($('.pal')) return; const el=document.createElement('div'); el.className='pal'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','Search and commands');
  el.innerHTML=`<div class="palbar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg><input id="pq" placeholder="Search friends or type a command" autocomplete="off" aria-label="Search friends or commands"><button class="lnk" id="pcx">Close</button></div><div class="palres" id="pres"></div>`;
  document.body.appendChild(el); document.body.classList.add('palopen'); const q=$('#pq'); let items=[], sel=0;
  const close=()=>{ el.remove(); document.body.classList.remove('palopen'); };
  const draw=()=>{ const s=q.value.trim().toLowerCase(); const words=s.split(/\s+/).filter(Boolean); const m=txt=>words.every(w=>txt.toLowerCase().includes(w));
    const fs=Store.friends().filter(f=>!s||m(f.name+' '+(f.interests||'')+' '+(f.ring||''))).slice(0,s?12:5);
    const logs=s.startsWith('log')||s.startsWith('talk')?Store.friends().filter(f=>!words.slice(1).length||m(f.name+' log talk '+words[0])).slice(0,6):[];
    const cm=CMDS.filter(c=>!s||m(c[1]+' '+c[2]));
    items=[]; let html='';
    if(fs.length){ html+='<div class="pgh">Friends</div><div class="pgrp">'+fs.map(f=>{ items.push({go:'#friend/'+encodeURIComponent(f.id)}); const st=status(f); return `<div class="pr" data-i="${items.length-1}">${avatar(f)}<div class="wh"><b>${esc(f.name)}</b><small>${esc(st.label)}</small></div><button class="btn sm fx0" data-lq="${esc(f.id)}">✓ talked</button></div>`; }).join('')+'</div>'; }
    if(logs.length){ html+='<div class="pgh">Log a talk</div><div class="pgrp">'+logs.map(f=>{ items.push({fn:()=>OrbLog.logSheet(f.id)}); return `<div class="pr" data-i="${items.length-1}"><span class="pic">✓</span><div class="wh"><b>Log a talk with ${esc(f.name)}</b></div></div>`; }).join('')+'</div>'; }
    if(cm.length){ html+='<div class="pgh">Commands</div><div class="pgrp">'+cm.map(c=>{ items.push({go:c[3],fn:c[5]}); return `<div class="pr" data-i="${items.length-1}"><span class="pic">${c[0]}</span><div class="wh"><b>${esc(c[1])}${c[4]&&!OrbPro.pro()?' <span class="pill">Pro</span>':''}</b></div></div>`; }).join('')+'</div>'; }
    if(!items.length) html='<div class="empty">Nothing matches. Try a friend’s name, “report”, “birthday” or “log”.</div>';
    $('#pres').innerHTML=html; sel=Math.min(sel,items.length-1); $$('.pr',el).forEach(r=>{ r.classList.toggle('sel',+r.dataset.i===sel); r.onclick=e=>{ if(e.target.closest('[data-lq]')) return; run(+r.dataset.i); }; });
    $$('[data-lq]',el).forEach(b=>b.onclick=e=>{ e.stopPropagation(); close(); OrbLog.quickLog(b.dataset.lq,'text'); }); };
  const run=i=>{ const it=items[i]; if(!it) return; close(); if(it.fn) it.fn(); if(it.go){ if(location.hash===it.go) route(); else location.hash=it.go; } };
  q.oninput=()=>{ sel=0; draw(); }; q.onkeydown=e=>{ if(e.key==='ArrowDown'){ sel=Math.min(items.length-1,sel+1); draw(); e.preventDefault(); } else if(e.key==='ArrowUp'){ sel=Math.max(0,sel-1); draw(); e.preventDefault(); } else if(e.key==='Enter'){ run(sel); } else if(e.key==='Escape') close(); };
  $('#pcx').onclick=close; draw(); setTimeout(()=>q.focus(),30); }
window.OrbPalette=palette;
document.addEventListener('click',e=>{ const p=e.target.closest('[data-pal]'); if(p){ e.preventDefault(); palette(); } });
document.addEventListener('keydown',e=>{ if((e.key==='k'&&(e.metaKey||e.ctrlKey))||(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||''))){ e.preventDefault(); palette(); } });
routes.cmds=v=>{ routes.orbit(v); setTimeout(palette,10); };
})();
