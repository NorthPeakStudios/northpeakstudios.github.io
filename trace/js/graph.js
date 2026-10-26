// Trace · the web: things you logged + effects you reported, linked by how often they show up together in your logs.
(function(){
function build(){ const nodes={}, links={}; const add=(id,label,kind)=>{ const n=nodes[id]=nodes[id]||{id,label,kind,n:0}; n.n++; return n; };
  const link=(a,b)=>{ if(a===b) return; const k=a<b?a+'|'+b:b+'|'+a; links[k]=(links[k]||0)+1; };
  const byDay={};
  for(const x of Store.entries()){ const ids=[]; if(x.what){ const k='s:'+Store.keyOf(x.what); add(k,x.what.trim(),'sub'); ids.push(k); (byDay[Store.dayKey(x.t)]=byDay[Store.dayKey(x.t)]||new Set()).add(k); }
    for(const f of (x.fx||[])){ const k='f:'+f; add(k,f,'fx'); ids.push(k); }
    if(x.feel) for(const [m,l] of Store.METRICS){ const v=x.feel[m]; if(!v||v===3) continue; const k='m:'+(v>=4?'high ':'low ')+m; add(k,(v>=4?'high ':'low ')+l.toLowerCase(),'feel'); ids.push(k); }
    for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++) if(ids[i][0]==='s'||ids[j][0]==='s'||true) link(ids[i],ids[j]); }
  for(const d in byDay){ const a=[...byDay[d]]; for(let i=0;i<a.length;i++) for(let j=i+1;j<a.length;j++) link(a[i],a[j]); }
  return {nodes:Object.values(nodes),links:Object.entries(links).map(([k,w])=>{ const [a,b]=k.split('|'); return {a,b,w}; })}; }
window.TrcWeb=build;
const COL={sub:'#5eead4',fx:'#a78bfa',feel:'#f0abfc'};
routes.web=v=>{
  if(!P()) return TrcPro.locked(v,'The web','Everything you logged and every effect you reported as one web. The more often two things show up together in your logs, the thicker the line.');
  const G=build();
  if(G.nodes.length<2){ v.innerHTML=TrcNav('web')+'<div class="empty card">Log a few things with how you felt and your web grows here.</div>'; return; }
  v.innerHTML=TrcNav('web')+`<canvas class="web" id="wc"></canvas><div class="legend"><i style="background:${COL.sub}"></i> things you took <i style="background:${COL.fx}"></i> effects <i style="background:${COL.feel}"></i> high/low feelings</div>
   <p class="muted small">Lines = how often two things show up in the same log (or two things on the same day). Your logs only: together isn’t the same as caused by. Tap a dot.</p>`;
  const cv=$('#wc'), dpr=Math.min(2,window.devicePixelRatio||1), W=cv.clientWidth, H=cv.clientHeight; cv.width=W*dpr; cv.height=H*dpr; const g=cv.getContext('2d'); g.scale(dpr,dpr);
  const N=G.nodes.map((n,i)=>Object.assign(n,{x:W/2+Math.cos(i*2.4)*Math.min(W,H)*0.3*Math.sqrt((i+1)/G.nodes.length),y:H/2+Math.sin(i*2.4)*Math.min(W,H)*0.3*Math.sqrt((i+1)/G.nodes.length),vx:0,vy:0,r:5+Math.min(14,Math.sqrt(n.n)*2.6)}));
  const idx={}; N.forEach(n=>idx[n.id]=n); const L=G.links.filter(l=>idx[l.a]&&idx[l.b]); const maxW=Math.max(1,...L.map(l=>l.w));
  for(let it=0;it<320;it++){ const a=1-it/320;
    for(let i=0;i<N.length;i++) for(let j=i+1;j<N.length;j++){ const p=N[i],q=N[j]; let dx=q.x-p.x, dy=q.y-p.y, d2=dx*dx+dy*dy+0.01, f=1400/d2; const d=Math.sqrt(d2); dx/=d; dy/=d; p.vx-=dx*f; p.vy-=dy*f; q.vx+=dx*f; q.vy+=dy*f; }
    for(const l of L){ const p=idx[l.a],q=idx[l.b]; const dx=q.x-p.x, dy=q.y-p.y, d=Math.sqrt(dx*dx+dy*dy)||1, k=0.015*(0.5+l.w/maxW)*(d-70); p.vx+=dx/d*k; p.vy+=dy/d*k; q.vx-=dx/d*k; q.vy-=dy/d*k; }
    for(const n of N){ n.vx+=(W/2-n.x)*0.004; n.vy+=(H/2-n.y)*0.004; n.x+=Math.max(-12,Math.min(12,n.vx))*a; n.y+=Math.max(-12,Math.min(12,n.vy))*a; n.vx*=0.6; n.vy*=0.6; n.x=Math.max(n.r+4,Math.min(W-n.r-4,n.x)); n.y=Math.max(n.r+4,Math.min(H-n.r-14,n.y)); } }
  let sel=null;
  function draw(){ g.clearRect(0,0,W,H); const near=sel?new Set(L.filter(l=>l.a===sel.id||l.b===sel.id).flatMap(l=>[l.a,l.b])):null;
    for(const l of L){ const p=idx[l.a],q=idx[l.b]; const on=!sel||l.a===sel.id||l.b===sel.id; g.strokeStyle=on?'rgba(148,163,184,'+(0.18+0.6*l.w/maxW)+')':'rgba(148,163,184,.05)'; g.lineWidth=0.8+3.2*l.w/maxW; g.beginPath(); g.moveTo(p.x,p.y); g.lineTo(q.x,q.y); g.stroke(); }
    for(const n of N){ const on=!near||near.has(n.id); g.globalAlpha=on?1:0.25; g.fillStyle=COL[n.kind]; g.beginPath(); g.arc(n.x,n.y,n.r,0,7); g.fill(); if(n===sel){ g.strokeStyle='#fff'; g.lineWidth=2; g.stroke(); }
      g.fillStyle='#e6edf3'; g.font=(n.kind==='sub'?'600 ':'')+'11px -apple-system,sans-serif'; g.textAlign='center'; g.fillText(n.label.length>18?n.label.slice(0,17)+'…':n.label,n.x,n.y+n.r+12); g.globalAlpha=1; } }
  draw();
  cv.addEventListener('click',e=>{ const b=cv.getBoundingClientRect(), x=e.clientX-b.left, y=e.clientY-b.top; let hit=null,bd=1e9; for(const n of N){ const d=Math.hypot(n.x-x,n.y-y); if(d<n.r+12&&d<bd){ bd=d; hit=n; } } sel=hit; draw(); if(hit) info(hit); });
  function info(n){ const ls=L.filter(l=>l.a===n.id||l.b===n.id).map(l=>({o:idx[l.a===n.id?l.b:l.a],w:l.w})).sort((a,b)=>b.w-a.w);
    sheet(`<h3><span style="color:${COL[n.kind]}">●</span> ${esc(n.label)}</h3><p class="muted" style="margin-top:-6px">${n.kind==='sub'?'logged':'reported'} ${n.n} time${n.n>1?'s':''}</p>
     <div class="card list">${ls.length?ls.slice(0,12).map(x=>`<div class="it" style="cursor:default"><span class="wh"><b>${esc(x.o.label)}</b></span><span class="pill">${x.w}× together</span></div>`).join(''):'<p class="muted">Not linked to anything yet.</p>'}</div>
     ${n.kind==='sub'?`<a class="btn block" href="#fx/${encodeURIComponent(n.id.slice(2))}">Effects for ${esc(n.label)}</a><a class="btn ghost block" href="#sub/${encodeURIComponent(n.label)}">FDA label info</a>`:''}<button class="btn ghost block" data-close="1">Close</button>`); }
};
})();
