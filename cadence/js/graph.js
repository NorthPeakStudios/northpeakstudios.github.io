// Knowledge graph (force-directed) + Tonnetz explorer.
const glab=t=>{ const s=t.split(/:| \(/)[0].trim(); return s.length>24?s.slice(0,22).replace(/[ ,&]+$/,'')+'…':s; };
routes.graph = v => {
  v.innerHTML = `<h2>Knowledge graph</h2><p class="muted">Every concept and how it connects. Drag to pan, pinch or ＋/－ to zoom (more names appear as you zoom in), tap a node to see its links, tap again to open the lesson.</p>
   <input class="inp" id="gq" placeholder="Search concepts… (e.g. dominant, fugue, Tonnetz)"><div id="gres" class="chips"></div><div class="gwrap"><svg id="graph"></svg><div class="gzoom"><button class="btn ghost sm" id="gzin" aria-label="Zoom in">＋</button><button class="btn ghost sm" id="gzout" aria-label="Zoom out">－</button><button class="btn ghost sm" id="gzfit" aria-label="Fit">⤢</button></div></div><div class="card" id="ginfo"><span class="muted">Tap a node.</span></div>
   <div class="card"><h3>Wiki index</h3><div class="chips">${CONCEPTS.slice().sort((a,b)=>a.title.localeCompare(b.title)).map(c=>`<a class="chip" href="#lesson/${c.id}">${c.title}</a>`).join('')}</div></div>`;
  const svg=$('#graph'); const narrow=innerWidth<640; const W=narrow?560:900,H=narrow?900:700; svg.setAttribute('viewBox',`0 0 ${W} ${H}`); svg.style.height=Math.round(svg.getBoundingClientRect().width*H/W)+'px';
  const COL={1:'#3fb950',2:'#7aa2ff',3:'#d29922',4:'#c792ea',5:'#f778ba'};
  const nodes=CONCEPTS.map((c,i)=>({id:c.id,c,x:W/2+Math.cos(i)*200*(c.tier/3),y:H/2+Math.sin(i)*200*(c.tier/3),vx:0,vy:0}));
  const idx=Object.fromEntries(nodes.map((n,i)=>[n.id,i])); const edges=[]; CONCEPTS.forEach(c=>c.links.forEach(l=>{ if(idx[l]!==undefined && c.id<l) edges.push([idx[c.id],idx[l]]); }));
  for(let it=0;it<400;it++){ const k=0.02*(1-it/400)+0.002;
    for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){ const a=nodes[i],b=nodes[j]; let dx=a.x-b.x,dy=a.y-b.y; let d2=dx*dx+dy*dy+0.01; const f=9000/d2; const d=Math.sqrt(d2); a.vx+=dx/d*f; a.vy+=dy/d*f; b.vx-=dx/d*f; b.vy-=dy/d*f; }
    for(const [i,j] of edges){ const a=nodes[i],b=nodes[j]; const dx=b.x-a.x,dy=b.y-a.y; const d=Math.sqrt(dx*dx+dy*dy)||1; const f=(d-120)*0.015; a.vx+=dx/d*f; a.vy+=dy/d*f; b.vx-=dx/d*f; b.vy-=dy/d*f; }
    for(const n of nodes){ n.vx+=(W/2-n.x)*0.004; n.vy+=(H/2-n.y)*0.004; n.x+=Math.max(-20,Math.min(20,n.vx*k*10)); n.y+=Math.max(-20,Math.min(20,n.vy*k*10)); n.vx*=0.5; n.vy*=0.5; } }
  { const xs=nodes.map(n=>n.x), ys=nodes.map(n=>n.y); const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys); nodes.forEach(n=>{ n.x=50+(n.x-x0)/(x1-x0||1)*(W-100); n.y=40+(n.y-y0)/(y1-y0||1)*(H-70); }); }
  const g=document.createElementNS('http://www.w3.org/2000/svg','g'); svg.appendChild(g);
  g.innerHTML = edges.map(([i,j])=>`<line class="ge" data-a="${i}" data-b="${j}" x1="${nodes[i].x}" y1="${nodes[i].y}" x2="${nodes[j].x}" y2="${nodes[j].y}" stroke="#30363d" stroke-width="1"/>`).join('') +
    nodes.map((n,i)=>{ const m=mastery(n.id).s>=0.6; return `<g class="gn" data-i="${i}" style="cursor:pointer"><circle cx="${n.x}" cy="${n.y}" r="${7+n.c.links.length*0.7}" fill="${COL[n.c.tier]}" stroke="${m?'#fff':'none'}" stroke-width="2"/><text class="gl" x="${n.x}" y="${n.y-11-n.c.links.length*0.7}" text-anchor="middle">${glab(n.c.title)}</text></g>`; }).join('');
  let view={x:0,y:0,s:1}; let selNb=new Set();
  /* readable labels on a phone (Cadence 1.2): text stays ~13px on screen at any zoom, has a dark halo, and labels that would
     overlap are hidden by priority (the selected concept and its links first, then the most-connected concepts). Zoom in for more. */
  const labels=()=>{ const r=svg.getBoundingClientRect(); const f=(r.width||W)/W*view.s; const px=narrow?13:12; const fs=px/f; const placed=[];
    const order=nodes.map((n,i)=>i).sort((a,b)=>((b===sel)-(a===sel))*1000+(selNb.has(b)-selNb.has(a))*100+(nodes[b].c.links.length-nodes[a].c.links.length));
    for(const i of order){ const n=nodes[i], el=gl[i]; el.setAttribute('font-size',fs.toFixed(2)); el.setAttribute('stroke-width',(3/f).toFixed(2)); const rr=7+n.c.links.length*0.7; el.setAttribute('y',(n.y-rr-4/f).toFixed(1));
      const sx=(n.x*view.s+view.x)*(r.width/W), sy=(n.y*view.s+view.y)*(r.width/W)-rr*f-4; const w=glab(n.c.title).length*px*0.56+6, h=px+4; const box=[sx-w/2,sy-h,sx+w/2,sy];
      const vis=box[0]>=2&&box[2]<=r.width-2&&box[1]>=0&&box[3]<=r.height; const hit=placed.some(b=>!(box[2]<b[0]||box[0]>b[2]||box[3]<b[1]||box[1]>b[3]));
      const show=vis&&(!hit||i===sel); el.style.display=show?'':'none'; if(show) placed.push(box); } };
  const apply=()=>{ g.setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.s})`); labels(); };
  let sel=null; const gl=[...g.querySelectorAll('.gl')];
  const zoomAt=(k,cx,cy)=>{ const r=svg.getBoundingClientRect(); const sc=W/r.width; cx=cx==null?W/2:cx*sc; cy=cy==null?(r.height*sc)/2:cy*sc; const s2=Math.max(0.4,Math.min(5,view.s*k)); view.x=cx-(cx-view.x)*s2/view.s; view.y=cy-(cy-view.y)*s2/view.s; view.s=s2; apply(); };
  $('#gzin').onclick=()=>zoomAt(1.5); $('#gzout').onclick=()=>zoomAt(1/1.5); $('#gzfit').onclick=()=>{ view={x:0,y:0,s:1}; apply(); };
  requestAnimationFrame(apply); addEventListener('resize',()=>{ if(document.body.contains(svg)) labels(); });
  const select=i=>{ sel=i; const n=nodes[i]; const nb=new Set(n.c.links.map(l=>idx[l])); selNb=nb; $$('.gn',svg).forEach(el=>{ const k=+el.dataset.i; el.style.opacity=(k===i||nb.has(k))?1:0.18; }); $$('.ge',svg).forEach(el=>{ const on=+el.dataset.a===i||+el.dataset.b===i; el.setAttribute('stroke',on?'#7aa2ff':'#30363d'); el.style.opacity=on?1:0.15; });
    labels(); $('#ginfo').innerHTML=`<h3>${n.c.title}</h3><p class="muted">${TIERS[n.c.tier]}</p><div class="chips">${n.c.links.map(l=>`<a class="chip" href="#lesson/${l}">${CONCEPT[l].title}</a>`).join('')}</div><a class="btn" href="#lesson/${n.id}">Open lesson</a>`; };
  let drag=null, moved=false, pts=new Map(), pinch=null;
  svg.addEventListener('pointerdown',e=>{ svg.setPointerCapture(e.pointerId); pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y,t:e.target}; moved=false; if(pts.size===2){ const [a,b]=[...pts.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y),s:view.s}; } });
  svg.addEventListener('pointermove',e=>{ if(!pts.has(e.pointerId)) return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); const r=svg.getBoundingClientRect(); const sc=W/r.width;
    if(pinch&&pts.size===2){ const [a,b]=[...pts.values()]; { const k=pinch.s*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d/view.s; zoomAt(k,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top); } moved=true; return; }
    if(drag){ const dx=(e.clientX-drag.x)*sc, dy=(e.clientY-drag.y)*sc; if(Math.abs(dx)+Math.abs(dy)>6) moved=true; view.x=drag.vx+dx; view.y=drag.vy+dy; apply(); } });
  svg.addEventListener('pointerup',e=>{ pts.delete(e.pointerId); if(pts.size<2) pinch=null; if(!moved&&drag){ const gn=drag.t.closest&&drag.t.closest('.gn'); if(gn){ const i=+gn.dataset.i; if(sel===i) go('lesson/'+nodes[i].id); else select(i); } } drag=null; });
  svg.addEventListener('wheel',e=>{ e.preventDefault(); { const r=svg.getBoundingClientRect(); zoomAt(e.deltaY<0?1.1:1/1.1,e.clientX-r.left,e.clientY-r.top); } },{passive:false});
  $('#gq').oninput=e=>{ const q=e.target.value.toLowerCase().trim(); const hits=q?CONCEPTS.filter(c=>(c.title+' '+c.lesson).toLowerCase().includes(q)).slice(0,10):[]; $('#gres').innerHTML=hits.map(c=>`<button class="chip" data-id="${c.id}">${c.title}</button>`).join(''); };
  $('#gres').onclick=e=>{ const b=e.target.closest('[data-id]'); if(b) select(idx[b.dataset.id]); };
};
routes.tonnetz = v => {
  v.innerHTML = `<a class="back" href="#tools">← Tools</a><h2>Tonnetz explorer</h2><p class="muted">Pitch classes on a lattice: right = perfect 5th, up-right = major 3rd, up-left = minor 3rd down. Each triangle is a triad (▲ major, ▼ minor). Tap a triangle to hear it; P, L, R flip it across an edge.</p>
   <div class="card"><div class="chordname" id="tz">C major</div><p><button class="btn" data-op="P">P</button> <button class="btn" data-op="L">L</button> <button class="btn" data-op="R">R</button> <button class="btn ghost sm" id="tzh">history: <span id="tzpath">C</span></button></p><svg id="tsvg" viewBox="0 0 460 400" style="width:100%;background:#0b0e14;border-radius:12px;touch-action:manipulation"></svg></div>`;
  const NAMES=T.spell.MAJ; const s=56, h=s*Math.sqrt(3)/2; const cols=10, rows=7; const pcAt=(c,r)=>T.mod(7*c+4*r - 2*0,12); // moving right +7, up-right +4
  const pos=(c,r)=>({x:20+c*s+r*s/2-2*s, y:380-r*h});
  let cur={r:0,minor:false}; const path=['C'];
  const tri=(t)=>t.minor?[t.r,(t.r+3)%12,(t.r+7)%12]:[t.r,(t.r+4)%12,(t.r+7)%12];
  function draw(){ let out=''; const curSet=new Set(tri(cur));
    for(let r=0;r<rows;r++) for(let c=-4;c<cols;c++){ const a=pos(c,r), b=pos(c+1,r), u=pos(c,r+1), u2=pos(c-1,r+1);
      // major triangle: (c,r),(c+1,r),(c,r+1): pcs p, p+7, p+4
      const p=pcAt(c,r); if(r<rows-1){ const maj={r:p,minor:false}; const on=!cur.minor&&cur.r===p; out+=`<polygon points="${a.x},${a.y} ${b.x},${b.y} ${u.x},${u.y}" fill="${on?'#3d6fd9':'#161b22'}" stroke="#30363d" data-t="${p},0"/>`;
        // minor triangle: (c,r),(c,r+1),(c-1,r+1): pcs p, p+4, p-3 => minor triad root p-3
        const mr=T.mod(p-3,12); const onm=cur.minor&&cur.r===mr; out+=`<polygon points="${a.x},${a.y} ${u.x},${u.y} ${u2.x},${u2.y}" fill="${onm?'#8a4fd0':'#11151c'}" stroke="#30363d" data-t="${mr},1"/>`; } }
    for(let r=0;r<rows;r++) for(let c=-4;c<cols;c++){ const a=pos(c,r); if(a.x<8||a.x>452) continue; const p=pcAt(c,r); out+=`<circle cx="${a.x}" cy="${a.y}" r="14" fill="${curSet.has(p)?'#c792ea':'#21262d'}"/><text x="${a.x}" y="${a.y+4}" text-anchor="middle" font-size="12" fill="#e6edf3">${NAMES[p]}</text>`; }
    $('#tsvg').innerHTML=out; $('#tz').textContent=T.triadName(cur)+'  ('+T.spell.tones(T.spell.root(cur.r,cur.minor?'min':'maj'),cur.minor?'min':'maj').join(' ')+')'; $('#tzpath').textContent=path.slice(-8).join(' → '); }
  const play=()=>{ const ms=tri(cur).map(p=>60+((p-cur.r+12)%12)+cur.r%12); Audio.chord(ms.map(m=>m>72?m-12:m),0,1.2); };
  $('#tsvg').addEventListener('click',e=>{ const t=e.target.closest('polygon'); if(!t) return; const [r,m]=t.dataset.t.split(',').map(Number); cur={r,minor:!!m}; path.push(NAMES[r]+(m?'m':'')); draw(); play(); });
  $$('[data-op]',v).forEach(b=>b.onclick=()=>{ cur=T[b.dataset.op](cur); path.push(b.dataset.op+':'+NAMES[cur.r]+(cur.minor?'m':'')); draw(); play(); });
  draw();
};
window.MORE_TILES=(window.MORE_TILES||[]).concat([['#graph','🕸️ Knowledge graph','every concept linked, searchable wiki']]);
window.EXTRA_TOOLS=(window.EXTRA_TOOLS||[]).concat([['#tonnetz','🔺 Tonnetz','neo-Riemannian P / L / R explorer'],['#check','✍️ Voice-leading checker','SATB & counterpoint'],['#analyze','🔬 Analyze a score','MIDI / MusicXML']]);
