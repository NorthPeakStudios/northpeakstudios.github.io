// Orbit · friend gravity (Northpeak Studios). Core: router, orbit view, friends, friend page, add/edit, the "we talked" log, today's queue.
const $=(s,r)=>(r||document).querySelector(s), $$=(s,r)=>[...(r||document).querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const routes={};
let toastT=null;
function toast(msg,act){ const t=$('#toast'); t.innerHTML=esc(msg)+(act?` <button class="lnk" id="tact">${esc(act.label)}</button>`:''); t.hidden=false; clearTimeout(toastT);
  if(act) $('#tact').onclick=()=>{ t.hidden=true; act.fn(); }; toastT=setTimeout(()=>t.hidden=true,act?5000:2600); }
const Pro=()=>!!(window.OrbPro&&OrbPro.pro());
const FREE_MAX=8;
const DAY=864e5;
function ago(d){ if(d<1/24) return 'just now'; if(d<1) return Math.round(d*24)+'h ago'; if(d<1.5) return 'yesterday'; if(d<60) return Math.round(d)+' days ago'; if(d<730) return Math.round(d/30.4)+' months ago'; return Math.round(d/365)+' years ago'; }
function fmtD(t,o){ return new Date(t).toLocaleDateString([],o||{month:'short',day:'numeric'}); }
function fmtDT(t){ const d=new Date(t); return fmtD(t)+' · '+d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}); }
function status(f){ const d=Store.drift(f); const r=d.ratio; const st=r>1?'drift':r>=.75?'soon':'ok'; return {...d,st,label:d.never?'not logged yet':ago(d.days)}; }
function avatar(f,cls){ cls=cls||''; return f.photo?`<span class="av ${cls}"><img src="${esc(f.photo)}" alt=""></span>`:`<span class="av ${cls}">${esc(f.emoji||'🙂')}</span>`; }
function hashN(s){ let h=2166136261; for(const c of String(s)){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
function pick(arr,seed){ return arr[hashN(seed)%arr.length]; }
/* ---------- sheet ---------- */
function sheet(html,onOpen){ const s=$('#sheet'); $('#sbody').innerHTML='<div class="grab"></div><button class="sx" data-close="1" aria-label="Close">✕</button>'+html; s.hidden=false; document.body.classList.add('noscroll'); onOpen&&onOpen($('#sbody')); a11y($('#sbody')); }
function closeSheet(){ $('#sheet').hidden=true; document.body.classList.remove('noscroll'); }
document.addEventListener('click',e=>{ if(e.target.closest('[data-close]')) closeSheet(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeSheet(); });
function a11y(root){ $$('input,select,textarea',root).forEach(el=>{ if(el.getAttribute('aria-label')||el.closest('label')||(el.id&&document.querySelector('label[for="'+el.id+'"]'))) return; if(el.placeholder) el.setAttribute('aria-label',el.placeholder); }); }
/* ---------- router ---------- */
let curRoute='';
function route(){ const h=(location.hash||'#orbit').slice(1); const [name,...rest]=h.split('/'); let arg=rest.join('/'); try{ arg=decodeURIComponent(arg); }catch(e){}
  const fn=routes[name]||routes.orbit; curRoute=name; window.__orbAnim=(window.__orbAnim||0)+1; const v=$('#view');
  try{ fn(v,arg); }catch(e){ console.warn(e); v.innerHTML='<div class="empty">Something went wrong. <a href="#orbit">Back to your orbit</a></div>'; }
  $$('.tabbar a').forEach(a=>{ const k=a.getAttribute('href').slice(1), also=(a.dataset.also||'').split(' '); const on=k===name||also.includes(name)||(!routes[name]&&k==='orbit'); a.classList.toggle('on',on); on?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'); });
  a11y(v); if(!window.__orbKeepScroll) window.scrollTo(0,0); window.__orbKeepScroll=0; }
window.addEventListener('hashchange',()=>{ closeSheet(); route(); });
window.addEventListener('orb-data',()=>{ if(['friends','today','friend','report','bday','mutual'].includes(curRoute)){ window.__orbKeepScroll=1; route(); } });
/* ---------- locked (Pro) ---------- */
function locked(v,what,detail){ v.innerHTML=`<div class="card lockcard"><div class="lockic">🔒</div><h2>${esc(what)}</h2><p class="muted">${esc(detail||'')}</p>
  <p>Part of <b>Orbit Pro</b>: unlimited friends, mutual orbits, the weekly orbit report, birthday radar, and notes + details to remember. The orbit view, logging and your reconnect queue stay free.</p>
  <p><a class="btn big" href="#pro">Get Pro · $35</a></p><p class="muted small">Or $100 Northpeak All-Access: every Northpeak app.${window.Cloud&&Cloud.signedIn()?'':' Already have Pro or All-Access? <a href="#account">Sign in</a>.'}</p></div>`; }
window.OrbLocked=locked;
/* ---------- ORBIT (home) ---------- */
routes.orbit=v=>{
  const fs=Store.friends(); const filt=localStorage.getItem('orb.ring')||'all';
  if(!fs.length){ v.innerHTML=`<div class="hero"><canvas id="orbc" class="orbc" aria-hidden="true"></canvas></div>
    <div class="card center"><h2>Your orbit is empty</h2><p class="muted">Add the people you care about. Each one becomes a planet. The longer since you talked (compared with how often you want to), the farther they drift.</p><a class="btn big" href="#add">Add your first friend</a></div>`;
    drawOrbit($('#orbc'),[],{demo:true}); return; }
  const st=fs.map(f=>({f,s:status(f)})); const drift=st.filter(x=>x.s.st==='drift').sort((a,b)=>b.s.ratio-a.s.ratio), soon=st.filter(x=>x.s.st==='soon');
  const shown=filt==='all'?fs:fs.filter(f=>(f.ring||'middle')===filt);
  v.innerHTML=`<div class="ohead"><div><h2>Your orbit</h2><p class="muted small">${drift.length?`<b class="bad">${drift.length} drifting</b> · `:''}${soon.length?`${soon.length} due soon · `:''}${st.length-drift.length-soon.length} close</p></div><a class="btn sm" href="#add">+ Friend</a></div>
   <div class="seg" id="rings">${[['all','All'],['inner','Inner'],['middle','Middle'],['outer','Outer']].map(([k,l])=>`<a data-r="${k}" class="${filt===k?'on':''}" role="button">${l}</a>`).join('')}</div>
   <div class="hero"><canvas id="orbc" class="orbc" role="img" aria-label="Orbit: you in the middle, ${shown.length} friends around you"></canvas></div>
   <p class="muted small center">Tap a planet. Red glow = drifting past your target.</p>
   ${drift.length?`<div class="hrow"><h3>Drifting</h3><a class="icb" href="#today">Today’s queue ›</a></div><div class="card list">${drift.slice(0,6).map(x=>frow(x.f,x.s)).join('')}</div>`:`<div class="card center"><p style="margin:0">🪐 Nobody’s drifting. Your orbit is tight.</p></div>`}`;
  $$('#rings a').forEach(a=>a.onclick=()=>{ localStorage.setItem('orb.ring',a.dataset.r); route(); });
  bindRows(v);
  drawOrbit($('#orbc'),shown,{onTap:f=>quickSheet(f.id)});
};
function frow(f,s){ s=s||status(f); const pct=Math.min(100,Math.round(s.ratio*100/2.5));
  return `<div class="it fr" data-f="${esc(f.id)}" tabindex="0" role="button">${avatar(f)}<div class="wh"><b>${esc(f.name)}${f.mpair?' <span class="mut-dot" title="Mutual orbit">⇄</span>':''}</b><small>${esc(s.label)} · every ${Store.every(f)}d</small><div class="dbar ${s.st}"><i style="width:${Math.max(4,pct)}%"></i></div></div>
   <button class="qbtn" data-q="${esc(f.id)}" aria-label="Log a talk with ${esc(f.name)}">✓</button></div>`; }
function bindRows(root){ $$('.fr',root).forEach(r=>{ r.onclick=e=>{ if(e.target.closest('.qbtn')) return; location.hash='#friend/'+encodeURIComponent(r.dataset.f); }; r.onkeydown=e=>{ if(e.key==='Enter') r.click(); }; });
  $$('.qbtn',root).forEach(b=>b.onclick=e=>{ e.stopPropagation(); logSheet(b.dataset.q); }); }
/* the orbit canvas: you at the centre, each friend a planet. distance = ring start + drift (days since ÷ target). */
const imgCache={};
function drawOrbit(cv,fs,opt){ if(!cv) return; opt=opt||{}; const my=window.__orbAnim; const ctx=cv.getContext('2d'); const dpr=Math.min(3,window.devicePixelRatio||1);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('v-motion');
  let W=0,H=0,R=0; function size(){ const w=cv.parentElement.clientWidth; W=w; H=Math.round(Math.min(w*1.02,460)); cv.width=W*dpr; cv.height=H*dpr; cv.style.height=H+'px'; R=Math.min(W,H)/2-8; }
  size();
  const items=(opt.demo?[{id:'a',name:'',emoji:'',ring:'inner',_r:.6},{id:'b',ring:'middle',_r:1.4},{id:'c',ring:'outer',_r:.4},{id:'d',ring:'inner',_r:2.2},{id:'e',ring:'middle',_r:.9}]:fs).map((f,i)=>{
    const ring=Store.RINGS[f.ring||'middle']||Store.RINGS.middle; const s=opt.demo?{ratio:f._r,st:f._r>1?'drift':'ok'}:status(f);
    const rr=Math.min(.97,ring.r0+.19*Math.min(s.ratio,2.6)); const base=(hashN(f.id)%628)/100+i*2.39996;
    let img=null; if(f.photo){ img=imgCache[f.id]; if(!img||img.src!==f.photo){ img=new Image(); img.src=f.photo; imgCache[f.id]=img; } }
    return {f,s,ring,rr,base,size:f.ring==='inner'?17:f.ring==='outer'?12:14.5,img,x:0,y:0};
  });
  const stars=[...Array(60)].map((_,i)=>({x:(hashN('x'+i)%1000)/1000,y:(hashN('y'+i)%1000)/1000,a:.2+(hashN('a'+i)%60)/100}));
  let t0=performance.now(), last=0;
  function frame(now){ if(my!==window.__orbAnim||!cv.isConnected) return; const t=(now-t0)/1000; if(cv.parentElement.clientWidth!==W) size();
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H); const cx=W/2, cy=H/2;
    for(const s of stars){ ctx.fillStyle=`rgba(200,210,255,${s.a*(.7+.3*Math.sin(t*.8+s.x*20))})`; ctx.fillRect(s.x*W,s.y*H,1.2,1.2); }
    // target rings: inside the dashed line = on target for that ring
    for(const k of ['inner','middle','outer']){ const g=Store.RINGS[k]; const rad=R*(g.r0+.19); ctx.setLineDash([3,6]); ctx.strokeStyle=g.col+'40'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(cx,cy,rad,0,7); ctx.stroke(); }
    ctx.setLineDash([]); ctx.strokeStyle='rgba(255,90,95,.18)'; ctx.beginPath(); ctx.arc(cx,cy,R*.97,0,7); ctx.stroke();
    // you
    const sg=ctx.createRadialGradient(cx,cy,2,cx,cy,34); sg.addColorStop(0,'#fff7d6'); sg.addColorStop(.35,'#ffd27a'); sg.addColorStop(1,'rgba(255,170,60,0)'); ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cx,cy,34,0,7); ctx.fill();
    ctx.fillStyle='#1a1205'; ctx.font='600 11px -apple-system,system-ui,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('you',cx,cy);
    for(const p of items){ const rad=R*p.rr; const w=reduce?0:.12/Math.pow(Math.max(.25,p.rr),1.5); const a=p.base+t*w*.35; p.x=cx+Math.cos(a)*rad; p.y=cy+Math.sin(a)*rad*.92;
      const col=p.s.st==='drift'?'#ff5a5f':p.s.st==='soon'?'#f5b04c':p.ring.col;
      if(p.s.st==='drift'){ const pulse=reduce?1:.65+.35*Math.sin(t*2.4+p.base); ctx.shadowColor='#ff3b3b'; ctx.shadowBlur=18*pulse; }
      else { ctx.shadowColor=col; ctx.shadowBlur=6; }
      ctx.fillStyle='#0d1222'; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,7); ctx.fill(); ctx.shadowBlur=0;
      ctx.lineWidth=2.2; ctx.strokeStyle=col; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,7); ctx.stroke();
      if(p.img&&p.img.complete&&p.img.naturalWidth){ ctx.save(); ctx.beginPath(); ctx.arc(p.x,p.y,p.size-2,0,7); ctx.clip(); ctx.drawImage(p.img,p.x-p.size+2,p.y-p.size+2,(p.size-2)*2,(p.size-2)*2); ctx.restore(); }
      else if(p.f.emoji){ ctx.font=Math.round(p.size*1.05)+'px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; ctx.fillStyle='#fff'; ctx.fillText(p.f.emoji,p.x,p.y+1); }
      if(p.f.name){ ctx.font='600 11px -apple-system,system-ui,sans-serif'; const nm=p.f.name.length>12?p.f.name.slice(0,11)+'…':p.f.name; ctx.fillStyle=p.s.st==='drift'?'#ffb3b5':'#c9d1e6'; ctx.fillText(nm+(p.f.mpair&&window.OrbMutual&&OrbMutual.streak(p.f)?' 🔥':''),p.x,p.y+p.size+10); }
    }
    if(!reduce||now-last>800){ last=now; }
    requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  if(opt.onTap) cv.onclick=e=>{ const b=cv.getBoundingClientRect(), x=e.clientX-b.left, y=e.clientY-b.top; let best=null,bd=28; for(const p of items){ const d=Math.hypot(p.x-x,p.y-y); if(d<bd){ bd=d; best=p; } } if(best) opt.onTap(best.f); };
}
/* ---------- quick sheet (tap a planet) ---------- */
const KQ=['text','call','irl','hang'];
function quickBtns(fid){ return `<div class="kq">${KQ.map(k=>`<button class="kbtn" data-k="${k}" data-f="${esc(fid)}"><span>${Store.KINDS[k][0]}</span>${Store.KINDS[k][1]}</button>`).join('')}</div>`; }
function bindQuick(root,after){ $$('.kbtn',root).forEach(b=>b.onclick=()=>{ const t=quickLog(b.dataset.f,b.dataset.k); after&&after(t); }); }
function quickLog(fid,kind,extra){ const f=Store.friend(fid); if(!f) return; const before=status(f);
  const t=Store.saveTalk(Object.assign({fid,kind,t:Date.now(),note:''},extra||{}));
  toast(`${Store.KINDS[kind][0]} Logged · ${f.name} ${before.st==='drift'?'is pulled back in 🪐':'stays close'}`,{label:'Undo',fn:()=>{ Store.delTalk(t.id); window.OrbMutual&&OrbMutual.removed(t); }});
  window.OrbMutual&&OrbMutual.logged(t); return t; }
function quickSheet(fid){ const f=Store.friend(fid); if(!f) return; const s=status(f);
  sheet(`<div class="qhead">${avatar(f,'lg')}<div><h3 style="margin:0">${esc(f.name)}</h3><p class="muted small" style="margin:2px 0 0">${esc(s.label)} · target every ${Store.every(f)} days · <span class="st-${s.st}">${s.st==='drift'?'drifting':s.st==='soon'?'due soon':'close'}</span></p></div></div>
   <p class="muted small" style="margin:12px 0 4px">We talked — one tap:</p>${quickBtns(fid)}
   <div class="row" style="margin-top:10px"><button class="btn ghost" id="qmore">Add details / note</button><a class="btn ghost" href="#friend/${encodeURIComponent(fid)}">Open</a></div>`,
   r=>{ bindQuick(r,()=>closeSheet()); $('#qmore',r).onclick=()=>logSheet(fid); }); }
/* ---------- the full log sheet ---------- */
function logSheet(fid,editId){ const f=Store.friend(fid); if(!f) return; const ed=editId?Store.talk(editId):null; let kind=ed?ed.kind:'text'; const pro=Pro();
  const now=ed?new Date(ed.t):new Date(); const loc=new Date(now.getTime()-now.getTimezoneOffset()*6e4).toISOString().slice(0,16);
  sheet(`<h3>${ed?'Edit':'We talked'} · ${esc(f.name)}</h3>
   <div class="chips" id="lk">${Object.entries(Store.KINDS).map(([k,v])=>`<button class="chip ${k===kind?'on':''}" data-k="${k}">${v[0]} ${v[1]}</button>`).join('')}</div>
   <label for="lt">When</label><input id="lt" type="datetime-local" value="${loc}">
   <label for="ln">Note ${pro?'':'<span class="pill">Pro</span>'}</label>${pro?`<textarea id="ln" placeholder="What you talked about, anything to follow up on">${esc(ed&&ed.note||'')}</textarea>`:`<p class="muted small" style="margin:2px 0">Notes per talk are part of <a href="#pro">Orbit Pro</a>. Logging stays free.</p>`}
   ${f.mpair&&pro?`<label class="fck"><input type="checkbox" id="lsh" ${ed&&ed.share?'checked':''}> Share this note with ${esc(f.name)} (your mutual orbit)</label>`:''}
   <button class="btn big block" id="lsave" style="margin-top:12px">${ed?'Save':'Log it'}</button>${ed?'<button class="btn danger block" id="ldel">Delete this log</button>':''}`,
   r=>{ $$('#lk .chip',r).forEach(c=>c.onclick=()=>{ kind=c.dataset.k; $$('#lk .chip',r).forEach(x=>x.classList.toggle('on',x===c)); });
     $('#lsave',r).onclick=()=>{ const tv=$('#lt',r).value; const t=tv&&(ed||tv!==loc)?new Date(tv).getTime():(ed?ed.t:Date.now()); const note=$('#ln',r)?$('#ln',r).value.trim().slice(0,2000):(ed&&ed.note||''); const share=!!($('#lsh',r)&&$('#lsh',r).checked);
       if(ed){ Object.assign(ed,{kind,t:Math.min(t,Date.now()+6e4),note,share}); Store.saveTalk(ed); window.OrbMutual&&OrbMutual.logged(ed,true); closeSheet(); toast('Saved'); }
       else { closeSheet(); quickLog(fid,kind,{t:Math.min(t,Date.now()+6e4),note,share}); } };
     const d=$('#ldel',r); if(d) d.onclick=()=>{ if(!confirm('Delete this log?')) return; Store.delTalk(ed.id); window.OrbMutual&&OrbMutual.removed(ed); closeSheet(); toast('Deleted'); }; }); }
window.OrbLog={logSheet,quickLog,quickSheet};
/* ---------- FRIENDS ---------- */
routes.friends=(v)=>{ const all=Store.friends(true); const arch=localStorage.getItem('orb.arch')==='1'; const q=(window.__orbFq||'').toLowerCase();
  const fs=all.filter(f=>!!f.arch===arch&&(!q||f.name.toLowerCase().includes(q))).map(f=>({f,s:status(f)})).sort((a,b)=>b.s.ratio-a.s.ratio);
  const n=Store.friends().length;
  v.innerHTML=`<div class="ohead"><div><h2>Friends</h2><p class="muted small">${n} in your orbit${Pro()?'':` · ${Math.min(n,FREE_MAX)} of ${FREE_MAX} free`}</p></div><a class="btn sm" href="#add">+ Friend</a></div>
   <input id="fq" type="search" placeholder="Search friends" value="${esc(window.__orbFq||'')}" autocomplete="off">
   ${fs.length?`<div class="card list">${fs.map(x=>frow(x.f,x.s)).join('')}</div>`:`<div class="empty">${arch?'No archived friends.':q?'No match.':'No friends yet. <a href="#add">Add one</a>.'}</div>`}
   <p class="center"><button class="lnk small" id="farch">${arch?'Back to your orbit':'Show archived'}</button></p>`;
  bindRows(v); $('#farch').onclick=()=>{ localStorage.setItem('orb.arch',arch?'0':'1'); route(); };
  const fq=$('#fq'); fq.oninput=()=>{ window.__orbFq=fq.value; const pos=fq.selectionStart; window.__orbKeepScroll=1; route(); const n2=$('#fq'); n2.focus(); try{ n2.setSelectionRange(pos,pos); }catch(e){} };
};
/* ---------- FRIEND PAGE ---------- */
routes.friend=(v,id)=>{ const f=Store.friend(id); if(!f){ v.innerHTML='<div class="empty">That friend isn’t here. <a href="#friends">All friends</a></div>'; return; }
  const s=status(f), pro=Pro(), talks=Store.talks(f.id), ring=Store.RINGS[f.ring||'middle'];
  const asks=(f.ask||[]).filter(a=>!a.done), bd=f.bday?bdayInfo(f.bday):null; const mut=window.OrbMutual?OrbMutual.info(f):null;
  v.innerHTML=`<p><a href="#friends" class="muted small">‹ Friends</a></p>
   <div class="card fhead">${avatar(f,'xl')}<div class="fht"><h2 style="margin:0">${esc(f.name)}</h2><p class="muted small" style="margin:2px 0 0"><span class="pill" style="color:${ring.col}">${ring.name} ring</span> · every ${Store.every(f)} days</p>
    <p class="st-${s.st}" style="margin:6px 0 0;font-weight:600">${s.never?'Not logged yet':'Last talked '+esc(s.label)} · ${s.st==='drift'?'drifting ('+Math.round(s.ratio*10)/10+'× your target)':s.st==='soon'?'due soon':'close'}</p></div></div>
   <p class="muted small" style="margin:4px 0">We talked — one tap:</p>${quickBtns(f.id)}<p class="center" style="margin:6px 0 0"><button class="lnk small" id="fdet">Log with a note or a different time</button></p>
   ${mutualCard(f,mut,pro)}
   <div class="hrow"><h3>Details to remember</h3>${pro?`<a class="icb" href="#edit/${encodeURIComponent(f.id)}">Edit</a>`:'<span class="pill">Pro</span>'}</div>
   ${pro?`<div class="card">
     <div class="dl"><span>🎂 Birthday</span><b>${bd?esc(bd.label)+(bd.days<=30?` <span class="pill ${bd.days<=7?'warn':''}">${bd.days===0?'today!':'in '+bd.days+'d'}</span>`:''):'<a href="#edit/'+encodeURIComponent(f.id)+'">add</a>'}</b></div>
     <div class="dl"><span>✨ Into</span><b>${f.interests?esc(f.interests):'<a href="#edit/'+encodeURIComponent(f.id)+'">add</a>'}</b></div>
     ${f.remember?`<div class="dl col"><span>📌 Remember</span><b class="pre">${esc(f.remember)}</b></div>`:''}
     <div class="dl col"><span>❓ Ask next time</span><div id="asks">${asks.map(a=>`<label class="fck"><input type="checkbox" data-a="${esc(a.id)}"> ${esc(a.text)}</label>`).join('')||'<span class="muted small">Nothing yet.</span>'}</div>
      <div class="row" style="margin-top:6px"><input id="na" placeholder="Something to ask them" maxlength="200"><button class="btn sm fx0" id="nab">Add</button></div></div></div>`
   :`<div class="card"><p class="muted" style="margin:0">Keep their birthday, what they’re into, things to remember and things to ask next time. Orbit uses them for conversation starters. <a href="#pro">Orbit Pro</a></p></div>`}
   <div class="hrow"><h3>Talks</h3><span class="muted small">${talks.length}</span></div>
   ${talks.length?`<div class="card list">${talks.slice(0,80).map(t=>trow(t,f)).join('')}</div>`:'<div class="empty">No talks logged yet.</div>'}
   <div class="row" style="margin-top:14px"><a class="btn ghost" href="#edit/${encodeURIComponent(f.id)}">Edit</a><button class="btn ghost" id="farc">${f.arch?'Unarchive':'Archive'}</button></div>
   <p class="center"><button class="lnk" id="fdel" style="color:var(--bad)">Remove ${esc(f.name)}</button></p>`;
  bindQuick(v); $('#fdet').onclick=()=>logSheet(f.id);
  $$('.trow',v).forEach(r=>r.onclick=()=>{ const t=Store.talk(r.dataset.t); if(!t) return; if(t.src==='them'){ toast(`${f.name} logged this one`); return; } logSheet(f.id,t.id); });
  $$('#asks input',v).forEach(c=>c.onchange=()=>{ const a=(f.ask||[]).find(x=>x.id===c.dataset.a); if(a){ a.done=Date.now(); Store.saveFriend(f); toast('Asked ✓'); } });
  const nab=$('#nab'); if(nab) nab.onclick=()=>{ const t=$('#na').value.trim(); if(!t) return; f.ask=(f.ask||[]); f.ask.push({id:Date.now().toString(36),text:t.slice(0,200)}); Store.saveFriend(f); };
  $('#farc').onclick=()=>{ f.arch=!f.arch; Store.saveFriend(f); toast(f.arch?'Archived (out of your orbit)':'Back in your orbit'); };
  $('#fdel').onclick=()=>{ if(!confirm(`Remove ${f.name} and all their logs from Orbit?`)) return; if(f.mpair&&window.OrbMutual) OrbMutual.unlink(f,true); Store.delFriend(f.id); toast('Removed'); location.hash='#friends'; };
  window.OrbMutual&&OrbMutual.bindCard(v,f);
};
function trow(t,f){ const k=Store.KINDS[t.kind]||Store.KINDS.other; const them=t.src==='them';
  return `<div class="it trow" data-t="${esc(t.id)}" role="button" tabindex="0"><span class="kic">${k[0]}</span><div class="wh"><b>${them?esc(f.name)+' logged: ':''}${esc(k[1])}${t.both?' <span class="pill acc">both logged</span>':''}</b>${t.note&&(Pro()||them)?`<small class="pre">${esc(t.note)}</small>`:''}</div><span class="tm">${esc(fmtD(t.t))}</span></div>`; }
function mutualCard(f,mut,pro){
  if(f.mpair) return `<div class="card mutc"><div class="row"><div><b>⇄ Mutual orbit</b><p class="muted small" style="margin:2px 0 0">${mut&&mut.them?`Linked with ${esc(mut.them.emoji||'')} ${esc(mut.them.name)} · `:''}logs sync both ways</p></div><div class="fx0 streak">${mut?`🔥 <b>${mut.streak||0}</b><small>week streak</small>`:'<small class="muted">syncing…</small>'}</div></div>${mut&&mut.best?`<p class="muted small" style="margin:6px 0 0">Best: ${mut.best} week${mut.best===1?'':'s'}${mut.this_week?' · this week counted ✓':' · log a talk this week to keep it'}</p>`:''}<p style="margin:6px 0 0"><button class="lnk small" id="munl">Unlink</button></p></div>`;
  return `<div class="card mutc"><b>⇄ Mutual orbit</b><p class="muted small" style="margin:4px 0 8px">If ${esc(f.name)} uses Orbit too, link up: talks either of you logs show up for both, with a shared weekly streak.</p>
   <div class="row"><button class="btn sm" id="minv">${pro?'Invite with a code':'Invite · Pro'}</button><a class="btn sm ghost" href="#join">I have their code</a></div><div id="mout"></div></div>`; }
/* ---------- ADD / EDIT ---------- */
const EMO=['🙂','😎','🤓','🥳','😂','🦊','🐻','🐼','🐸','🦄','🌸','🌻','🔥','⚡','🌙','⭐','🎸','🎺','🏀','⚽','🎮','📚','🧪','🍕','☕','🚀','🌊','🏔️','👑','💜'];
routes.add=v=>editForm(v,null);
routes.edit=(v,id)=>{ const f=Store.friend(id); if(!f){ location.hash='#friends'; return; } editForm(v,f); };
function editForm(v,f){ const isNew=!f; const pro=Pro();
  if(isNew&&!pro&&Store.friends().length>=FREE_MAX) return locked(v,'More than 8 friends',`Free Orbit holds ${FREE_MAX} friends. Pro makes it unlimited.`);
  f=f?JSON.parse(JSON.stringify(f)):{name:'',emoji:pick(EMO,Date.now()),ring:'middle',every:21};
  const b=f.bday?String(f.bday).split('-'):[]; const bm=b.length===3?+b[1]:b.length===2?+b[0]:0, bdd=b.length===3?+b[2]:b.length===2?+b[1]:0, by=b.length===3?b[0]:'';
  v.innerHTML=`<p><a href="${isNew?'#orbit':'#friend/'+encodeURIComponent(f.id)}" class="muted small">‹ Back</a></p><h2>${isNew?'Add a friend':'Edit '+esc(f.name)}</h2>
   <div class="card">
    <label for="en">Name</label><input id="en" maxlength="40" value="${esc(f.name)}" placeholder="Their name" autocomplete="off">
    <label>Emoji or photo</label><div class="emo" id="emo">${EMO.map(e=>`<button type="button" class="${e===f.emoji&&!f.photo?'on':''}" data-e="${e}">${e}</button>`).join('')}</div>
    <div class="row" style="margin-top:8px"><input id="ee" maxlength="4" placeholder="Or type any emoji" value="${EMO.includes(f.emoji)?'':esc(f.emoji||'')}"><label class="btn ghost sm fx0 upl">📷 Photo<input type="file" id="ep" accept="image/*" hidden></label></div>
    <div id="epv">${f.photo?`<p class="row" style="margin:8px 0 0">${avatar(f,'lg')}<button type="button" class="lnk small fx0" id="epx">Remove photo</button></p>`:''}</div>
    <label>Ring</label><div class="seg" id="er">${Object.entries(Store.RINGS).map(([k,r])=>`<a data-r="${k}" role="button" class="${(f.ring||'middle')===k?'on':''}">${r.name}</a>`).join('')}</div>
    <p class="muted small" style="margin:0">Inner = closest people. Outer = good to keep in touch with.</p>
    <label for="ev">Talk every … days</label><div class="row"><input id="ev" type="number" min="1" max="365" inputmode="numeric" value="${Store.every(f)}"><div class="chips fx0" id="evp">${[3,7,14,30,60].map(n=>`<button type="button" class="chip sub" data-n="${n}">${n}</button>`).join('')}</div></div>
    ${isNew?`<label for="es">Last time you talked</label><select id="es"><option value="0">Today</option><option value="3">A few days ago</option><option value="7">About a week ago</option><option value="30" selected>About a month ago</option><option value="90">A few months ago</option><option value="365">Longer</option></select>`:''}
   </div>
   <div class="card"><h3>Details to remember ${pro?'':'<span class="pill">Pro</span>'}</h3>${pro?`
    <label>Birthday</label><div class="row"><select id="bm" aria-label="Birthday month"><option value="0">Month</option>${[...Array(12)].map((_,i)=>`<option value="${i+1}" ${bm===i+1?'selected':''}>${new Date(2000,i,1).toLocaleDateString([],{month:'short'})}</option>`).join('')}</select><select id="bd" aria-label="Birthday day"><option value="0">Day</option>${[...Array(31)].map((_,i)=>`<option ${bdd===i+1?'selected':''}>${i+1}</option>`).join('')}</select><input id="by" inputmode="numeric" maxlength="4" placeholder="Year (opt.)" value="${esc(by)}" aria-label="Birth year (optional)"></div>
    <label for="ei">Into (interests)</label><input id="ei" maxlength="200" value="${esc(f.interests||'')}" placeholder="e.g. climbing, Taylor Swift, chem">
    <label for="erm">Things to remember</label><textarea id="erm" maxlength="2000" placeholder="Their dog's name, the college they want, their big game…">${esc(f.remember||'')}</textarea>`
    :`<p class="muted small" style="margin:0">Birthday, interests, things to remember and to ask: part of <a href="#pro">Orbit Pro</a>.</p>`}</div>
   <button class="btn big block" id="esave">${isNew?'Add to my orbit':'Save'}</button>`;
  let emoji=f.emoji, photo=f.photo||'', ring=f.ring||'middle';
  $$('#emo button').forEach(bt=>bt.onclick=()=>{ emoji=bt.dataset.e; photo=''; $('#ee').value=''; $('#epv').innerHTML=''; $$('#emo button').forEach(x=>x.classList.toggle('on',x===bt)); });
  $('#ee').oninput=()=>{ const val=$('#ee').value.trim(); if(val){ emoji=val; $$('#emo button').forEach(x=>x.classList.remove('on')); } };
  $$('#er a').forEach(a=>a.onclick=()=>{ ring=a.dataset.r; $$('#er a').forEach(x=>x.classList.toggle('on',x===a)); if(isNew||!f.every) $('#ev').value=Store.RINGS[ring].every; });
  $$('#evp .chip').forEach(c=>c.onclick=()=>{ $('#ev').value=c.dataset.n; });
  $('#ep').onchange=async()=>{ const file=$('#ep').files[0]; if(!file) return; try{ photo=await shrink(file,128); $('#epv').innerHTML=`<p class="row" style="margin:8px 0 0"><span class="av lg"><img src="${photo}" alt=""></span><span class="muted small">Photo set</span></p>`; }catch(e){ toast('Couldn’t read that image'); } };
  const px=$('#epx'); if(px) px.onclick=()=>{ photo=''; $('#epv').innerHTML=''; };
  $('#esave').onclick=()=>{ const name=$('#en').value.trim().replace(/\s+/g,' '); if(!name){ toast('Add a name'); $('#en').focus(); return; }
    const every=Math.max(1,Math.min(365,parseInt($('#ev').value,10)||Store.RINGS[ring].every));
    const out=Object.assign(isNew?{}:Store.friend(f.id),{name:name.slice(0,40),emoji:emoji||'🙂',photo,ring,every});
    if(isNew){ const ago=+$('#es').value; out.seed=Date.now()-ago*DAY; }
    if(pro){ const m=+$('#bm').value,d=+$('#bd').value,y=$('#by').value.trim(); out.bday=m&&d?(/^\d{4}$/.test(y)?y+'-':'')+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'):''; out.interests=$('#ei').value.trim(); out.remember=$('#erm').value.trim(); }
    const sv=Store.saveFriend(out); toast(isNew?`${sv.name} added to your orbit 🪐`:'Saved'); location.hash='#friend/'+encodeURIComponent(sv.id); };
}
function shrink(file,px){ return new Promise((res,rej)=>{ const u=URL.createObjectURL(file); const im=new Image(); im.onload=()=>{ const c=document.createElement('canvas'); c.width=c.height=px; const s=Math.min(im.width,im.height); c.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,px,px); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg',.8)); }; im.onerror=rej; im.src=u; }); }
/* ---------- birthdays ---------- */
function bdayInfo(b){ const p=String(b).split('-'); if(p.length<2) return null; const y=p.length===3?+p[0]:0, m=+p[p.length-2], d=+p[p.length-1]; if(!m||!d) return null;
  const now=new Date(); const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()); let next=new Date(now.getFullYear(),m-1,d); if(next<today) next=new Date(now.getFullYear()+1,m-1,d);
  const days=Math.round((next-today)/DAY); const age=y?next.getFullYear()-y:0;
  return {m,d,days,age,next,label:new Date(2000,m-1,d).toLocaleDateString([],{month:'long',day:'numeric'})+(age?` · turns ${age}`:'')}; }
window.OrbBday=bdayInfo;
/* ---------- TODAY: reconnect queue ---------- */
const STARTERS={inner:['Send them a song you’ve had on repeat.','Ask what the best part of their week was.','Make a plan: pick a day and a thing.','Send a pic of something that reminded you of them.','Ask what’s stressing them out lately, and listen.','Voice-memo them a random story from today.'],
 middle:['“Yo, it’s been a minute. What’s new with you?”','Ask what they’ve been watching or playing lately.','Send a meme you know they’d get.','Ask how a thing they were working on turned out.','Invite them to something you’re already doing this week.','“Random but I thought of you today. How are you?”'],
 outer:['A quick “hey, hope you’re good!” goes a long way.','Congratulate them on something you saw them post.','Ask a question about something they know a lot about.','Share an article or video related to what they’re into.','Suggest catching up at the next thing you’re both at.']};
function starter(f,day){ const pro=Pro(); const out=[];
  if(pro){ const asks=(f.ask||[]).filter(a=>!a.done); if(asks.length) out.push({ic:'❓',t:'Ask: '+asks[0].text,src:'from your “ask next time” list'});
    const bd=f.bday&&bdayInfo(f.bday); if(bd&&bd.days<=14) out.push({ic:'🎂',t:bd.days===0?'It’s their birthday today. Say happy birthday!':`Their birthday is in ${bd.days} day${bd.days===1?'':'s'}${bd.age?' (turning '+bd.age+')':''}. Plan something.`,src:'birthday'});
    const ln=Store.talks(f.id).find(t=>t.note&&t.note.length>2&&Date.now()-t.t<200*DAY); if(ln) out.push({ic:'📝',t:`Last time (${fmtD(ln.t)}): “${ln.note.length>90?ln.note.slice(0,88)+'…':ln.note}”. Ask how that turned out.`,src:ln.src==='them'?f.name+'’s shared note':'from your notes'});
    if(f.interests){ const it=f.interests.split(/[,;\/]| and /).map(x=>x.trim()).filter(Boolean); if(it.length) out.push({ic:'✨',t:`Send them something about ${pick(it,day+f.id)}.`,src:'from what they’re into'}); }
    if(f.remember) out.push({ic:'📌',t:`Bring up: ${f.remember.split(/\n|\. /)[0].slice(0,100)}`,src:'from things to remember'}); }
  else { const ln=Store.talks(f.id).find(t=>t.src==='them'&&t.note); if(ln) out.push({ic:'📝',t:`${f.name} noted: “${ln.note.slice(0,90)}”. Follow up on it.`,src:'shared note'}); }
  out.push({ic:'💡',t:pick(STARTERS[f.ring||'middle']||STARTERS.middle,day+f.id),src:'conversation starter'});
  return out[0]; }
function score(f,s){ const w={inner:1.35,middle:1,outer:.75}[f.ring||'middle']; let sc=s.ratio*w; const bd=Pro()&&f.bday&&bdayInfo(f.bday); if(bd&&bd.days<=3) sc+=1.5; return sc; }
function queue(){ const day=Store.dayKey(Date.now()); const p=Store.prefs(); let q=p.q&&p.q.day===day?p.q:null; const now=Date.now();
  const cand=Store.friends().filter(f=>!(f.snooze>now)).map(f=>({f,s:status(f)})).map(x=>({...x,sc:score(x.f,x.s)})).filter(x=>x.s.ratio>=.7||x.sc>=1.2).sort((a,b)=>b.sc-a.sc);
  if(!q){ q={day,ids:cand.slice(0,3).map(x=>x.f.id),done:[],skip:[]}; Store.savePrefs({q}); }
  const pickd=q.ids.map(id=>Store.friend(id)).filter(f=>f&&!f.arch&&!q.skip.includes(f.id)&&!(f.snooze>now));
  const rest=cand.filter(x=>!q.ids.includes(x.f.id)); return {q,day,picks:pickd,rest}; }
window.OrbQueue=queue;
routes.today=v=>{ const fs=Store.friends(); if(!fs.length){ v.innerHTML='<h2>Today</h2><div class="empty">Add some friends and Orbit will pick who to hit up each day. <br><br><a class="btn" href="#add">Add a friend</a></div>'; return; }
  const {q,day,picks,rest}=queue(); const pro=Pro(); const now=Date.now();
  const bds=pro?fs.map(f=>({f,b:f.bday&&bdayInfo(f.bday)})).filter(x=>x.b&&x.b.days<=7).sort((a,b)=>a.b.days-b.b.days):[];
  const card=f=>{ const s=status(f), st=starter(f,day), done=q.done.includes(f.id)||(s.days<.75&&!s.never);
    return `<div class="card qcard ${done?'done':''}"><div class="qhead">${avatar(f,'lg')}<div class="wh"><b>${esc(f.name)}</b><small class="st-${s.st}">${esc(s.label)} · every ${Store.every(f)}d</small></div>${done?'<span class="pill acc">done ✓</span>':''}</div>
     <div class="starter"><span>${st.ic}</span><div>${esc(st.t)}<small>${esc(st.src)}</small></div></div>
     ${done?'':`${quickBtns(f.id)}<div class="row qa2"><button class="lnk small" data-sn="${esc(f.id)}">Snooze 3 days</button><button class="lnk small" data-sk="${esc(f.id)}">Not today</button></div>`}</div>`; };
  v.innerHTML=`<h2>Today</h2><p class="muted small" style="margin-top:0">${new Date().toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'})} · who to hit up, picked from who’s drifting most</p>
   ${bds.length?`<div class="card bdc">${bds.map(x=>`<a href="#friend/${encodeURIComponent(x.f.id)}" class="it"><span class="kic">🎂</span><div class="wh"><b>${esc(x.f.name)}</b><small>${x.b.days===0?'Birthday today!':'Birthday in '+x.b.days+' day'+(x.b.days===1?'':'s')}${x.b.age?' · turns '+x.b.age:''}</small></div></a>`).join('')}</div>`:''}
   ${picks.length?picks.map(card).join(''):`<div class="card center"><p style="margin:0">🪐 Nobody needs a ping today. Your orbit is in good shape.</p></div>`}
   ${rest.length?`<div class="hrow"><h3>Up next</h3><span class="muted small">${rest.length}</span></div><div class="card list">${rest.slice(0,8).map(x=>frow(x.f,x.s)).join('')}</div>`:''}`;
  bindQuick(v,t=>{ const p=Store.prefs(); const qq=p.q; if(qq&&!qq.done.includes(t.fid)){ qq.done.push(t.fid); Store.savePrefs({q:qq}); } });
  bindRows(v);
  $$('[data-sn]',v).forEach(b=>b.onclick=()=>{ const f=Store.friend(b.dataset.sn); f.snooze=Date.now()+3*DAY; Store.saveFriend(f); toast(`Snoozed ${f.name} for 3 days`); });
  $$('[data-sk]',v).forEach(b=>b.onclick=()=>{ const p=Store.prefs(); const qq=p.q; qq.skip.push(b.dataset.sk); const nx=queue().rest[0]; if(nx&&qq.ids.length<8) qq.ids.push(nx.f.id); Store.savePrefs({q:qq}); });
};
/* ---------- boot ---------- */
window.addEventListener('DOMContentLoaded',()=>{ try{ const vw=JSON.parse(localStorage.getItem('orb.view')||'{}'); if(vw.motion) document.documentElement.classList.add('v-motion'); }catch(e){} route(); });
