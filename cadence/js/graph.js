// Knowledge graph (force-directed) + Tonnetz explorer.
routes.graph = v => {
  v.innerHTML = `<h2>Knowledge graph</h2><p class="muted">Every concept and how it connects. Drag to pan, pinch/scroll to zoom, tap a node to see its links, tap again to open the lesson.</p>
   <input class="inp" id="gq" placeholder="Search concepts… (e.g. dominant, fugue, Tonnetz)"><div id="gres" class="chips"></div><svg id="graph"></svg><div class="card" id="ginfo"><span class="muted">Tap a node.</span></div>
   <div class="card"><h3>Wiki index</h3><div class="chips">${CONCEPTS.slice().sort((a,b)=>a.title.localeCompare(b.title)).map(c=>`<a class="chip" href="#lesson/${c.id}">${c.title}</a>`).join('')}</div></div>`;
  const svg=$('#graph'); const narrow=innerWidth<640; const W=narrow?560:900,H=narrow?900:700; svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
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
    nodes.map((n,i)=>{ const m=mastery(n.id).s>=0.6; return `<g class="gn" data-i="${i}" style="cursor:pointer"><circle cx="${n.x}" cy="${n.y}" r="${7+n.c.links.length*0.7}" fill="${COL[n.c.tier]}" stroke="${m?'#fff':'none'}" stroke-width="2"/><text x="${n.x}" y="${n.y-11-n.c.links.length*0.7}" text-anchor="middle" font-size="${narrow?13:11}" fill="#c9d1d9">${n.c.title.length>26?n.c.title.slice(0,24)+'…':n.c.title}</text></g>`; }).join('');
  let view={x:0,y:0,s:1}; const apply=()=>g.setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.s})`);
  let sel=null;
  const select=i=>{ sel=i; const n=nodes[i]; const nb=new Set(n.c.links.map(l=>idx[l])); $$('.gn',svg).forEach(el=>{ const k=+el.dataset.i; el.style.opacity=(k===i||nb.has(k))?1:0.18; }); $$('.ge',svg).forEach(el=>{ const on=+el.dataset.a===i||+el.dataset.b===i; el.setAttribute('stroke',on?'#7aa2ff':'#30363d'); el.style.opacity=on?1:0.15; });
    $('#ginfo').innerHTML=`<h3>${n.c.title}</h3><p class="muted">${TIERS[n.c.tier]}</p><div class="chips">${n.c.links.map(l=>`<a class="chip" href="#lesson/${l}">${CONCEPT[l].title}</a>`).join('')}</div><a class="btn" href="#lesson/${n.id}">Open lesson</a>`; };
  let drag=null, moved=false, pts=new Map(), pinch=null;
  svg.addEventListener('pointerdown',e=>{ svg.setPointerCapture(e.pointerId); pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y,t:e.target}; moved=false; if(pts.size===2){ const [a,b]=[...pts.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y),s:view.s}; } });
  svg.addEventListener('pointermove',e=>{ if(!pts.has(e.pointerId)) return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); const r=svg.getBoundingClientRect(); const sc=W/r.width;
    if(pinch&&pts.size===2){ const [a,b]=[...pts.values()]; view.s=Math.max(0.4,Math.min(4,pinch.s*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d)); apply(); moved=true; return; }
    if(drag){ const dx=(e.clientX-drag.x)*sc, dy=(e.clientY-drag.y)*sc; if(Math.abs(dx)+Math.abs(dy)>6) moved=true; view.x=drag.vx+dx; view.y=drag.vy+dy; apply(); } });
  svg.addEventListener('pointerup',e=>{ pts.delete(e.pointerId); if(pts.size<2) pinch=null; if(!moved&&drag){ const gn=drag.t.closest&&drag.t.closest('.gn'); if(gn){ const i=+gn.dataset.i; if(sel===i) go('lesson/'+nodes[i].id); else select(i); } } drag=null; });
  svg.addEventListener('wheel',e=>{ e.preventDefault(); view.s=Math.max(0.4,Math.min(4,view.s*(e.deltaY<0?1.1:0.9))); apply(); },{passive:false});
  $('#gq').oninput=e=>{ const q=e.target.value.toLowerCase().trim(); const hits=q?CONCEPTS.filter(c=>(c.title+' '+c.lesson).toLowerCase().includes(q)).slice(0,10):[]; $('#gres').innerHTML=hits.map(c=>`<button class="chip" data-id="${c.id}">${c.title}</button>`).join(''); };
  $('#gres').onclick=e=>{ const b=e.target.closest('[data-id]'); if(b) select(idx[b.dataset.id]); };
};
routes.tonnetz = v => {
  v.innerHTML = `<a class="back" href="#tools">← Tools</a><h2>Tonnetz explorer</h2><p class="muted">Pitch classes on a lattice: right = perfect 5th, up-right = major 3rd, up-left = minor 3rd down. Each triangle is a triad (▲ major, ▼ minor). Tap a triangle to hear it; P, L, R flip it across an edge.</p>
   <div class="card"><div class="chordname" id="tz">C major</div><p><button class="btn" data-op="P">P</button> <button class="btn" data-op="L">L</button> <button class="btn" data-op="R">R</button> <button class="btn ghost sm" id="tzh">history: <span id="tzpath">C</span></button></p><svg id="tsvg" viewBox="0 0 460 400" style="width:100%;background:#0b0e14;border-radius:12px;touch-action:manipulation"></svg></div>`;
  const NAMES=T.PC_NAMES_SHARP; const s=56, h=s*Math.sqrt(3)/2; const cols=10, rows=7; const pcAt=(c,r)=>T.mod(7*c+4*r - 2*0,12); // moving right +7, up-right +4
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
    $('#tsvg').innerHTML=out; $('#tz').textContent=T.triadName(cur)+'  ('+tri(cur).map(p=>NAMES[p]).join(' ')+')'; $('#tzpath').textContent=path.slice(-8).join(' → '); }
  const play=()=>{ const ms=tri(cur).map(p=>60+((p-cur.r+12)%12)+cur.r%12); Audio.chord(ms.map(m=>m>72?m-12:m),0,1.2); };
  $('#tsvg').addEventListener('click',e=>{ const t=e.target.closest('polygon'); if(!t) return; const [r,m]=t.dataset.t.split(',').map(Number); cur={r,minor:!!m}; path.push(NAMES[r]+(m?'m':'')); draw(); play(); });
  $$('[data-op]',v).forEach(b=>b.onclick=()=>{ cur=T[b.dataset.op](cur); path.push(b.dataset.op+':'+NAMES[cur.r]+(cur.minor?'m':'')); draw(); play(); });
  draw();
};
window.MORE_TILES=(window.MORE_TILES||[]).concat([['#graph','🕸️ Knowledge graph','every concept linked, searchable wiki']]);
window.EXTRA_TOOLS=(window.EXTRA_TOOLS||[]).concat([['#tonnetz','🔺 Tonnetz','neo-Riemannian P / L / R explorer'],['#check','✍️ Voice-leading checker','SATB & counterpoint'],['#analyze','🔬 Analyze a score','MIDI / MusicXML']]);
