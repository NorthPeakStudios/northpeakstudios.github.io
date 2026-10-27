// Blindspot · your calibration: hit rate vs stated confidence, over time, by category; full history.
(function(){
const A=()=>window.BlsApp;
function rangeItems(){ const out=[]; for(const g of Store.games()){ if(!['daily','arch','duel'].includes(g.mode)) continue; for(const it of g.items||[]) out.push({...it,t:g.t,mode:g.mode,cat:(A().QN[it.q]||{}).c}); } return out; }
function tfItems(){ const out=[]; for(const g of Store.games('tf')) for(const it of g.items||[]) out.push({...it,t:g.t}); return out; }
function curvePts(){ const R=rangeItems(), T=tfItems(), pts=[];
  for(const c of [50,80,95]){ const a=R.filter(x=>x.c===c); if(a.length) pts.push({x:c,y:100*a.reduce((s,x)=>s+x.hit,0)/a.length,n:a.length,k:'r'}); }
  for(const [lo,hi,mid] of [[50,59,55],[60,69,65],[70,79,75],[80,89,85],[90,100,95]]){ const a=T.filter(x=>x.c>=lo&&x.c<=hi); if(a.length) pts.push({x:a.reduce((s,x)=>s+x.c,0)/a.length,y:100*a.filter(x=>x.ok).length/a.length,n:a.length,k:'t'}); }
  return pts; }
function curveSVG(pts){ const W=320,H=250,L=36,B=30,T=10,Rr=10; const X=v=>L+(v-50)/50*(W-L-Rr), Y=v=>H-B-(v/100)*(H-B-T);
  let g=`<rect x="${L}" y="${T}" width="${W-L-Rr}" height="${H-B-T}" fill="#0b0f15" rx="6"/>`;
  for(const v of [0,25,50,75,100]) g+=`<line x1="${L}" x2="${W-Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1f2733"/><text x="${L-6}" y="${Y(v)+4}" fill="#8b949e" font-size="10" text-anchor="end">${v}%</text>`;
  for(const v of [50,60,70,80,90,100]) g+=`<text x="${X(v)}" y="${H-B+14}" fill="#8b949e" font-size="10" text-anchor="middle">${v}%</text>`;
  g+=`<text x="${(L+W)/2}" y="${H-3}" fill="#8b949e" font-size="10" text-anchor="middle">how sure you said you were</text><text x="10" y="${(H-B)/2}" fill="#8b949e" font-size="10" text-anchor="middle" transform="rotate(-90 10 ${(H-B)/2})">how often you were right</text>`;
  g+=`<line x1="${X(50)}" y1="${Y(50)}" x2="${X(100)}" y2="${Y(100)}" stroke="#94a3b8" stroke-dasharray="4 3"/><text x="${X(62)}" y="${Y(62)-6}" fill="#94a3b8" font-size="9" text-anchor="middle" transform="rotate(-38 ${X(62)} ${Y(62)-6})">perfect calibration</text>`;
  const rp=pts.filter(p=>p.k==='r').sort((a,b)=>a.x-b.x), tp=pts.filter(p=>p.k==='t').sort((a,b)=>a.x-b.x);
  const path=(a,col)=>a.length>1?`<polyline points="${a.map(p=>X(p.x)+','+Y(p.y)).join(' ')}" fill="none" stroke="${col}" stroke-width="2"/>`:'';
  g+=path(rp,'#fbbf24')+path(tp,'#f472b6');
  for(const p of [...rp,...tp]){ const r=Math.min(11,3+Math.sqrt(p.n)); g+=`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${r}" fill="${p.k==='r'?'#fbbf24':'#f472b6'}" fill-opacity=".85" stroke="#0d1117"/><text x="${Math.min(X(p.x),W-Rr-12)}" y="${Y(p.y)-r-3<T+9?Y(p.y)+r+11:Y(p.y)-r-3}" fill="#e6edf3" font-size="9" text-anchor="middle">${Math.round(p.y)}%</text>`; }
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Calibration curve: how often you were right at each confidence level">${g}</svg></div><div class="legend2"><span><i style="background:#fbbf24"></i>ranges (daily, archive, duels)</span><span><i style="background:#f472b6"></i>true/false</span><span>dot size = how many answers</span></div>`; }
function weekly(){ const R=rangeItems(); const by={}; for(const x of R){ const wk=bsWeek(bsDayNum(new Date(x.t).toISOString().slice(0,10))); (by[wk]=by[wk]||[]).push(x); }
  return Object.keys(by).map(Number).sort((a,b)=>a-b).slice(-12).map(w=>{ const a=by[w]; return {w,said:a.reduce((s,x)=>s+x.c,0)/a.length,hit:100*a.reduce((s,x)=>s+x.hit,0)/a.length,n:a.length}; }); }
function weeklySVG(ws){ const W=320,H=170,L=34,B=24,T=10,Rr=10; const n=ws.length; const X=i=>L+(n<2?0.5:i/(n-1))*(W-L-Rr), Y=v=>H-B-(v/100)*(H-B-T);
  let g=''; for(const v of [0,50,100]) g+=`<line x1="${L}" x2="${W-Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1f2733"/><text x="${L-6}" y="${Y(v)+4}" fill="#8b949e" font-size="10" text-anchor="end">${v}%</text>`;
  const line=(k,col,dash)=>`<polyline points="${ws.map((p,i)=>X(i)+','+Y(p[k])).join(' ')}" fill="none" stroke="${col}" stroke-width="2" ${dash?'stroke-dasharray="4 3"':''}/>`+ws.map((p,i)=>`<circle cx="${X(i)}" cy="${Y(p[k])}" r="3" fill="${col}"/>`).join('');
  g+=line('said','#94a3b8',1)+line('hit','#fbbf24');
  ws.forEach((p,i)=>{ if(n<=6||i%2===0) g+=`<text x="${X(i)}" y="${H-6}" fill="#8b949e" font-size="9" text-anchor="middle">${esc(A().dayLabel(bsDayKey(p.w*7-1)).replace(/^\w+, /,''))}</text>`; });
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Each week: average confidence vs actual hit rate">${g}</svg></div><div class="legend2"><span><i style="background:#94a3b8"></i>how sure you said (avg)</span><span><i style="background:#fbbf24"></i>how often you hit</span><span>by week</span></div>`; }
function verdictTxt(pts){ const r=pts.filter(p=>p.k==='r'); if(!r.length) return 'Play a few days to see your curve.'; const n=r.reduce((s,p)=>s+p.n,0);
  const gap=r.reduce((s,p)=>s+(p.x-p.y)*p.n,0)/n; const g=Math.round(Math.abs(gap));
  return n<10?`Early days (${n} answers). The curve settles after 10–20.`:gap>8?`You’re <b>overconfident</b> by about ${g} points: your ranges hit less often than you claim. Try wider ranges.`:gap<-8?`You’re <b>underconfident</b> by about ${g} points: your ranges hit more often than you claim. Tighten up and score more.`:`You’re <b>well calibrated</b> (within ${g} points). Rare. Nice.`; }
routes.stats=v=>{ const daily=Store.games('daily'), R=rangeItems();
  const avg=daily.length?Math.round(daily.reduce((s,g)=>s+g.pts,0)/daily.length):0, best=daily.reduce((m,g)=>Math.max(m,g.pts),0);
  const hr=R.length?Math.round(100*R.reduce((s,x)=>s+x.hit,0)/R.length):0, said=R.length?Math.round(R.reduce((s,x)=>s+x.c,0)/R.length):0;
  const basic=`<div class="grid2"><div class="stat"><b>${daily.length}</b><span>days played</span></div><div class="stat"><b>${A().streak()}</b><span>day streak</span></div><div class="stat"><b>${avg}</b><span>average daily score</span></div><div class="stat"><b>${best}</b><span>best day (of 500)</span></div></div>`;
  if(!P()){ v.innerHTML=`<h2>Calibration</h2>${basic}<div class="card"><p style="margin:0">So far you hit <b>${hr}%</b> of your ranges${R.length?' while saying '+said+'% on average':''}.</p></div>`; const box=document.createElement('div'); v.appendChild(box);
    BlsPro.locked(box,'Your calibration curve','See how often you’re actually right at 50, 80 and 95%, week by week and by topic, plus your full history.'); return; }
  const pts=curvePts(), ws=weekly();
  const cats={}; for(const x of R){ (cats[x.cat]=cats[x.cat]||[]).push(x); }
  v.innerHTML=`<h2>Calibration</h2>${basic}<div class="card"><h3>Are you overconfident?</h3><p style="margin:0 0 6px">${verdictTxt(pts)}</p>${pts.length?curveSVG(pts):'<p class="muted">Your curve appears after your first game.</p>'}
    ${pts.filter(p=>p.k==='r').map(p=>`<p class="muted small" style="margin:4px 0 0">At ${p.x}% you hit ${Math.round(p.y)}% (${p.n} answer${p.n===1?'':'s'})</p>`).join('')}</div>
   ${ws.length?`<div class="card"><h3>Over time</h3>${weeklySVG(ws)}</div>`:''}
   ${Object.keys(cats).length?`<div class="card"><h3>By topic</h3><div class="list">${Object.keys(cats).map(c=>{ const a=cats[c], h=Math.round(100*a.reduce((s,x)=>s+x.hit,0)/a.length), sd=Math.round(a.reduce((s,x)=>s+x.c,0)/a.length), pp=Math.round(a.reduce((s,x)=>s+x.pts,0)/a.length);
      return `<div class="it"><span class="wh"><b>${esc(A().CAT[c]||c)}</b><small>${a.length} answers · said ${sd}% · avg ${pp} pts</small></span><span class="pill ${h>=sd-8?'ok':'bad'}">${h}% hit</span></div>`; }).join('')}</div></div>`:''}
   <a class="btn ghost block" href="#history">Full history</a>`; };
routes.history=v=>{ if(!P()) return BlsPro.locked(v,'Full history','Every game you’ve played, with every answer, on every device.');
  const gs=Store.games(); const lab={daily:'Daily',arch:'Archive',duel:'Duel',tf:'True/false',hl:'Higher/lower'};
  v.innerHTML=`<p class="muted small" style="margin:0"><a href="#stats">‹ Calibration</a></p><h2>History</h2>${gs.length?`<div class="card list">${gs.map(g=>{ const href=['daily','arch','duel'].includes(g.mode)?'#game/'+g.id:g.mode==='tf'?'#tfgame/'+g.id:'#hl';
    const sub=g.mode==='hl'?'streak '+g.streak:g.mode==='tf'?g.hits+'/'+g.n+' right':g.hits+'/'+g.n+' in range';
    return `<a class="it" href="${href}"><span class="wh"><b>${lab[g.mode]||g.mode} · ${esc(g.day?A().dayLabel(g.day):new Date(g.t).toLocaleDateString([], {month:'short',day:'numeric'}))}${g.code?' · '+esc(g.code):''}</b><small>${sub}</small></span><span class="pill acc">${g.pts}</span></a>`; }).join('')}</div>`:'<p class="muted">No games yet.</p>'}`; };
routes.tfgame=(v,id)=>{ const g=Store.game(id); if(!g){ location.hash='#history'; return; }
  v.innerHTML=`<p class="muted small" style="margin:0"><a href="#history">‹ History</a></p><h2>True or false · ${g.pts} pts</h2><div class="card list">${g.items.map(x=>{ const q=A().QT[x.q]||{q:x.q,x:''}; return `<div class="it"><span class="wh"><b>${esc(q.q)}</b><small>${q.a?'True':'False'} · you: ${x.pick?'true':'false'} at ${x.c}% · ${esc(q.x)}</small></span><span class="pill ${x.ok?'ok':'bad'}">${x.pts}</span></div>`; }).join('')}</div>`; };
})();
