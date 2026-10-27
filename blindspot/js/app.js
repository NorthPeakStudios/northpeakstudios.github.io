// Blindspot · app shell, daily 5, reveal (truth + your range + the crowd), number formats. Northpeak Studios.
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(m){ const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,2600); }
const routes={};
function route(){ const h=(location.hash||'#today').slice(1); const [r,...a]=h.split('/'); const f=routes[r]||routes.today; const v=$('#view'); closeSheet();
  $$('.tabbar a').forEach(x=>{ const k=x.getAttribute('href').slice(1), on=k===r||(x.dataset.also||'').split(' ').includes(r); x.classList.toggle('on',on); on?x.setAttribute('aria-current','page'):x.removeAttribute('aria-current'); });
  const dec=s=>{ try{ return decodeURIComponent(s); }catch(e){ return s; } };
  try{ f(v,...a.map(dec)); }catch(e){ console.warn(e); v.innerHTML='<p class="muted">Something went wrong on this screen.</p>'; } a11y(v); window.scrollTo(0,0); }
function a11y(root){ if(!root) return; root.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]),select,textarea').forEach(el=>{ if(el.getAttribute('aria-label')||(el.labels&&el.labels.length)) return;
  const l=el.previousElementSibling; if(l&&l.tagName==='LABEL'&&!l.htmlFor){ if(!el.id) el.id='f'+Math.random().toString(36).slice(2,8); l.htmlFor=el.id; } else if(el.placeholder) el.setAttribute('aria-label',el.placeholder); }); }
window.addEventListener('hashchange',route);
function sheet(html,onOpen){ $('#sbody').innerHTML='<div class="grab"></div>'+html; $('#sheet').hidden=false; document.body.style.overflow='hidden'; if(onOpen) onOpen($('#sbody')); a11y($('#sbody')); }
function closeSheet(){ const s=$('#sheet'); if(s&&!s.hidden){ s.hidden=true; document.body.style.overflow=''; } }
document.addEventListener('click',e=>{ if(e.target.closest('[data-close]')) closeSheet(); });
const P=()=>!!(window.Cloud&&Cloud.isPro());
const QN={}; BSQ.numeric.forEach(q=>QN[q.id]=q); const QT={}; BSQ.tf.forEach(q=>QT[q.id]=q);
const CAT={sci:'Science',his:'History',geo:'Geography',med:'Medicine',mon:'Money'};
const CONFS=[50,80,95];
const dayLabel=k=>{ const [y,m,d]=k.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'}); };
const localDayN=()=>bsDayNum(Store.today());

/* ---------- numbers: show and read ---------- */
const SUP={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
function sig(v,n){ return +(+v).toPrecision(n); }
function fmtYear(v){ v=Math.round(v); return v<0?(-v).toLocaleString('en-US')+' BC':v<1000?'AD '+v:String(v); }
function fmtShort(v,q){ if(q&&q.k==='y') return fmtYear(v); const a=Math.abs(v);
  if(a>=1e15){ const e=Math.floor(Math.log10(a)); return sig(v/Math.pow(10,e),3)+'×10'+String(e).split('').map(c=>SUP[c]).join(''); }
  if(a>=1e12) return sig(v/1e12,3)+' trillion'; if(a>=1e9) return sig(v/1e9,3)+' billion'; if(a>=1e6) return sig(v/1e6,3)+' million';
  if(a>=1e4) return Math.round(v).toLocaleString('en-US'); if(a>=100) return sig(v,4).toLocaleString('en-US'); if(a===0) return '0'; return String(sig(v,3)); }
function fmtExact(v,q){ if(q&&q.k==='y') return fmtYear(v); const a=Math.abs(v); if(a>=1e15) return fmtShort(v,q); const s=v.toLocaleString('en-US',{maximumFractionDigits:a<1?4:a<100?3:2}); return a>=1e6?s+' ('+fmtShort(v,q)+')':s; }
function withUnit(s,q){ const u=q.u; if(!u||u==='year') return s; if(u==='USD') return '$'+s; if(u==='%'||u==='°'||u==='°C'||u==='°F') return s+u; return s+' '+u; }
const MULT={k:1e3,thousand:1e3,m:1e6,mil:1e6,mn:1e6,million:1e6,b:1e9,bn:1e9,billion:1e9,t:1e12,tn:1e12,trillion:1e12};
function parseNum(raw,q){ let s=String(raw==null?'':raw).trim().toLowerCase(); if(!s) return NaN;
  s=s.replace(/[,\s_]/g,'').replace(/[−–—]/g,'-').replace(/^\$/,'').replace(/(×|x|\*)10\^?/,'e').replace(/·10\^?/,'e');
  if(q&&q.k==='y'){ let m=/^(\d+)(bc|bce)$/.exec(s); if(m) return -+m[1]; m=/^(?:ad|ce)?(-?\d+)(?:ad|ce)?$/.exec(s); return m?+m[1]:NaN; }
  const u=String(q&&q.u||'').toLowerCase().replace(/\s/g,''); if(u&&u.length<=12&&s.endsWith(u)&&!/^[kmbt]$/.test(u)) s=s.slice(0,-u.length);
  const meterish=/^m/.test(u)&&u!=='months';
  const m=/^(-?\d*\.?\d+)(e[-+]?\d+)?([a-z%]*)$/.exec(s); if(!m) return NaN;
  let v=parseFloat(m[1]+(m[2]||'')); const suf=m[3];
  if(suf&&suf!=='%'){ if(suf==='m'&&meterish) {} else if(MULT[suf]) v*=MULT[suf]; else return NaN; }
  return isFinite(v)?v:NaN; }

/* ---------- number line: crowd ranges, your range, the truth ---------- */
function numberLine(q,lo,hi,crowd){ const W=340, PAD=14; const isLog=q.k==='log'&&q.a>0;
  const ends=[q.a]; if(isFinite(lo)) ends.push(lo); if(isFinite(hi)) ends.push(hi);
  const cr=(crowd&&crowd.ranges)||[]; const ce=[]; cr.forEach(r=>{ ce.push(r[0],r[1]); });
  if(ce.length>=4){ const s=ce.slice().sort((a,b)=>a-b); ends.push(s[Math.floor(s.length*0.1)],s[Math.ceil(s.length*0.9)-1]); } else ends.push(...ce);
  let vals=ends.filter(v=>isFinite(v)&&(!isLog||v>0)); let mn=Math.min(...vals), mx=Math.max(...vals);
  const tf=v=>isLog?Math.log10(Math.max(v,1e-300)):v; let a=tf(mn), b=tf(mx); if(a===b){ const d=isLog?0.3:(Math.abs(a)*0.1||1); a-=d; b+=d; } const pad=(b-a)*0.12; a-=pad; b+=pad;
  const X=v=>{ const t=tf(isLog&&v<=0?Math.pow(10,a):v); return PAD+(Math.min(Math.max(t,a),b)-a)/(b-a)*(W-2*PAD); };
  const rows=cr.slice(0,18); const top=6, rowH=5, cH=rows.length?rows.length*rowH+4:0; const yourY=top+cH+8, axisY=yourY+22, H=axisY+30;
  let g='';
  rows.forEach((r,i)=>{ const y=top+i*rowH+2; g+=`<line x1="${X(r[0]).toFixed(1)}" x2="${Math.max(X(r[1]),X(r[0])+1.5).toFixed(1)}" y1="${y}" y2="${y}" stroke="${r[2]>=95?'#64748b':r[2]>=80?'#52607a':'#3f4b60'}" stroke-width="3" stroke-linecap="round"/>`; });
  if(crowd&&crowd.med){ g+=`<rect x="${X(crowd.med[0]).toFixed(1)}" y="${yourY-4}" width="${Math.max(2,X(crowd.med[1])-X(crowd.med[0])).toFixed(1)}" height="18" rx="4" fill="#94a3b822" stroke="#94a3b8" stroke-dasharray="3 2"/>`; }
  if(isFinite(lo)&&isFinite(hi)){ const x1=X(Math.min(lo,hi)), x2=X(Math.max(lo,hi)); g+=`<rect x="${x1.toFixed(1)}" y="${yourY}" width="${Math.max(3,x2-x1).toFixed(1)}" height="10" rx="5" fill="var(--acc)"/>`; }
  g+=`<line x1="${PAD}" x2="${W-PAD}" y1="${axisY}" y2="${axisY}" stroke="#3b4452"/>`;
  const ticks=[]; for(let i=0;i<=3;i++){ const t=a+(b-a)*(0.08+0.84*i/3); ticks.push(isLog?Math.pow(10,t):t); }
  ticks.forEach((t,i)=>{ const x=X(t); g+=`<line x1="${x}" x2="${x}" y1="${axisY-3}" y2="${axisY+3}" stroke="#3b4452"/><text x="${x}" y="${axisY+16}" fill="#8b949e" font-size="10" text-anchor="${i===0?'start':i===3?'end':'middle'}">${esc(fmtShort(q.k==='y'?Math.round(t):sig(t,2),q))}</text>`; });
  const tx=X(q.a); g+=`<line x1="${tx}" x2="${tx}" y1="2" y2="${axisY+4}" stroke="#fff" stroke-width="2"/><circle cx="${tx}" cy="${axisY}" r="4" fill="#fff"/>`;
  return `<div class="nl"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Number line: the true value, your range${rows.length?' and '+rows.length+' crowd ranges':''}${isLog?' (log scale)':''}">${g}</svg></div>
   <div class="legend2"><span><i style="background:#fff"></i>true value</span><span><i style="background:var(--acc)"></i>your range</span>${rows.length?'<span><i style="background:#52607a"></i>crowd</span>':''}${crowd&&crowd.med?'<span><i style="border:1px dashed #94a3b8;background:none"></i>crowd middle</span>':''}${isLog?'<span>log scale</span>':''}</div>`; }

/* ---------- playing a set of 5 (daily, archive, duel) ---------- */
function curGet(){ try{ return JSON.parse(localStorage.getItem('bls.cur')||'null'); }catch(e){ return null; } }
function curSet(c){ c?localStorage.setItem('bls.cur',JSON.stringify(c)):localStorage.removeItem('bls.cur'); }
function startSet(kind,key,qids,extra){ const c=curGet(); if(!(c&&c.kind===kind&&c.key===key)) curSet(Object.assign({kind,key,qids,i:0,ans:[]},extra||{})); if(location.hash==='#play') route(); else location.hash='#play'; }
routes.play=v=>{ const c=curGet(); if(!c){ location.hash='#today'; return; }
  if(c.i>=c.qids.length){ finishSet(c); return; }
  const q=QN[c.qids[c.i]], prev=c.ans[c.i]||{}, conf=prev.c||(+localStorage.getItem('bls.lastc')||80);
  const title=c.kind==='daily'?'Daily 5 · '+dayLabel(c.key):c.kind==='arch'?'Archive · '+dayLabel(c.key):'Duel '+c.key;
  v.innerHTML=`<p class="muted small" style="margin:0">${esc(title)}</p><div class="dots">${c.qids.map((_,i)=>`<i class="${i<c.i?'done':i===c.i?'on':''}"></i>`).join('')}</div>
   <div class="card"><div class="qcat">${esc(CAT[q.c]||'')} · ${c.i+1} of ${c.qids.length}</div><div class="qtext" id="qt">${esc(q.q)}</div>${q.u&&q.u!=='year'?`<div class="unit">Answer in ${esc(q.u==='USD'?'US dollars':q.u)}</div>`:'<div class="unit">Type a year · BC like “44 BC”</div>'}
   <div class="row" style="margin-top:8px"><div><label>Low</label><input id="lo" inputmode="${q.k==='y'?'text':'decimal'}" autocomplete="off" value="${esc(prev.lr||'')}" placeholder="${q.k==='y'?'e.g. 1850':'e.g. 2k, 3.5m'}"><div class="parsed" id="plo"></div></div><div><label>High</label><input id="hi" inputmode="${q.k==='y'?'text':'decimal'}" autocomplete="off" value="${esc(prev.hr||'')}" placeholder="${q.k==='y'?'e.g. 1900':'e.g. 9k'}"><div class="parsed" id="phi"></div></div></div>
   <label>How sure are you the answer is in your range?</label><div class="seg" id="cf">${CONFS.map(x=>`<button type="button" data-c="${x}" class="${x===conf?'on':''}" aria-pressed="${x===conf}">${x}%</button>`).join('')}</div>
   <p class="muted small" id="cfh" style="margin:0 0 10px"></p>
   <button class="btn big block" id="nx">${c.i===c.qids.length-1?'Lock in & reveal':'Next'}</button>${c.i>0?'<button class="btn ghost block" id="bk">Back</button>':''}</div>
   <p class="muted small">Tip: a wider range is more likely to hit but scores fewer points. Missing hurts more the surer you said you were. <a href="#how">How scoring works</a></p>`;
  let cf=conf; const hint=()=>{ $('#cfh').textContent=cf===50?'50%: a coin flip. Make it tight.':cf===80?'80%: you’d be wrong about 1 time in 5.':'95%: you’d be wrong only 1 time in 20. Go wide.'; };
  hint(); $('#cf').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; cf=+b.dataset.c; $$('#cf button').forEach(x=>{ x.classList.toggle('on',x===b); x.setAttribute('aria-pressed',x===b); }); hint(); };
  const show=(id,out)=>{ const val=parseNum($(id).value,q), el=$(out); if(!$(id).value.trim()){ el.textContent=''; el.classList.remove('err'); return; } el.classList.toggle('err',!isFinite(val)); el.textContent=isFinite(val)?'= '+withUnit(fmtShort(val,q),q):'can’t read that number'; };
  if(c.draft&&c.draft.i===c.i){ if(!$('#lo').value) $('#lo').value=c.draft.lo||''; if(!$('#hi').value) $('#hi').value=c.draft.hi||''; } // keep typed numbers across any re-render or reload
  const keep=()=>{ const cc=curGet(); if(cc&&cc.i===c.i){ cc.draft={i:c.i,lo:$('#lo').value,hi:$('#hi').value}; curSet(cc); } };
  $('#lo').addEventListener('input',()=>{ show('#lo','#plo'); keep(); }); $('#hi').addEventListener('input',()=>{ show('#hi','#phi'); keep(); }); show('#lo','#plo'); show('#hi','#phi');
  $('#nx').onclick=()=>{ let lo=parseNum($('#lo').value,q), hi=parseNum($('#hi').value,q); if(!isFinite(lo)||!isFinite(hi)) return toast('Enter a low and a high number'); if(lo>hi){ const t=lo; lo=hi; hi=t; }
    c.ans[c.i]={q:q.id,lo,hi,c:cf,lr:$('#lo').value,hr:$('#hi').value}; c.i++; delete c.draft; localStorage.setItem('bls.lastc',cf); curSet(c); route(); };
  const bk=$('#bk'); if(bk) bk.onclick=()=>{ c.i--; curSet(c); route(); };
  setTimeout(()=>{ const lo=$('#lo'); if(lo&&!lo.value&&matchMedia('(hover:hover)').matches) lo.focus(); },50);
};
function scoreItems(ans){ return ans.map(a=>{ const s=bsScore(QN[a.q],a.lo,a.hi,a.c); return {q:a.q,lo:a.lo,hi:a.hi,c:a.c,pts:s.pts,hit:s.hit?1:0}; }); }
const tot=items=>({pts:items.reduce((s,x)=>s+x.pts,0),hits:items.reduce((s,x)=>s+x.hit,0),n:items.length});
async function finishSet(c){ const items=scoreItems(c.ans), t=tot(items);
  if(c.kind==='duel'){ curSet(null); const g=Store.saveGame({id:'g_duel_'+c.key,mode:'duel',code:c.key,t:Date.now(),items,...t,nick:c.nick});
    try{ await BlsSocial.play(c.key,c.nick,items); }catch(e){ g.pending=1; Store.saveGame(g); toast(e&&e.offline?'Offline: your duel answers will send when you’re back':'Couldn’t send your duel answers yet'); }
    location.hash='#duel/'+c.key; return; }
  const id=(c.kind==='daily'?'g_daily_':'g_arch_')+c.key;
  const g=Store.saveGame({id,mode:c.kind,day:c.key,t:Date.now(),items,...t}); curSet(null);
  if(c.kind==='daily') await sendDaily(g);
  location.hash='#game/'+id; }
async function sendDaily(g){ try{ const j=await Cloud.api('/api/bs/answer',{day:g.day,dev:Store.dev(),ans:g.items.map(x=>({q:x.q,lo:x.lo,hi:x.hi,c:x.c}))}); g.pending=0; g.sent=1; Store.saveGame(g); crowdCache[g.day]=j.crowd; return j; }
  catch(e){ if(e&&e.message==='not_today'){ g.pending=0; g.late=1; Store.saveGame(g); return null; } g.pending=1; Store.saveGame(g); return null; } }
async function flushPending(){ if(!window.Cloud) return; for(const g of Store.games()){ if(!g.pending) continue; if(g.mode==='daily') await sendDaily(g); else if(g.mode==='duel'){ try{ await BlsSocial.play(g.code,g.nick,g.items); g.pending=0; Store.saveGame(g); }catch(e){} } } }
const crowdCache={};
async function crowdFor(day){ if(crowdCache[day]) return crowdCache[day]; try{ const j=await Cloud.api('/api/bs/crowd?day='+day,null,{auth:false}); crowdCache[day]=j.crowd; return j.crowd; }catch(e){ return null; } }

/* ---------- reveal ---------- */
function verdict(it){ const q=QN[it.q]; return it.hit?`Hit · ${it.pts} pts`:`Miss · ${it.pts} pts`; }
function calLine(items){ const by={}; items.forEach(x=>{ (by[x.c]=by[x.c]||[]).push(x.hit); }); return Object.keys(by).sort().map(c=>{ const a=by[c], h=a.reduce((s,x)=>s+x,0); return `${c}%: ${h}/${a.length} hit`; }).join(' · '); }
function revealHTML(items,crowd,opts){ opts=opts||{};
  return items.map((it,i)=>{ const q=QN[it.q]; if(!q) return ''; const cr=crowd&&crowd[it.q]; const ch=cr&&cr.n?Math.round(100*cr.hits/cr.n):null;
    return `<div class="card res ${it.hit?'hit':'miss'}"><div class="row" style="align-items:flex-start"><div><div class="qcat">${esc(CAT[q.c])} · ${i+1}</div><div style="font-weight:650;margin:3px 0 2px;overflow-wrap:anywhere">${esc(q.q)}</div></div><span class="fx0 pill ${it.hit?'ok':'bad'}">${it.hit?'✓ hit':'✗ miss'}</span></div>
     ${numberLine(q,it.lo,it.hi,cr)}
     <div class="kv" style="margin-top:8px"><b>Answer</b><span style="color:var(--fg)">${esc(withUnit(fmtExact(q.a,q),q))}</span><b>You</b><span>${esc(withUnit(fmtShort(it.lo,q),q))} – ${esc(withUnit(fmtShort(it.hi,q),q))} at ${it.c}% · ${it.pts} pts</span>
     ${cr&&cr.n?`<b>Crowd</b><span>${cr.n} player${cr.n===1?'':'s'} · ${ch}% hit${cr.med?' · middle range '+esc(fmtShort(cr.med[0],q))+' – '+esc(fmtShort(cr.med[1],q)):''}</span>`:opts.noCrowd?'':'<b>Crowd</b><span>no other answers yet today</span>'}
     <b>Source</b><span>${esc(q.s)}</span>${q.n?`<b>Note</b><span>${esc(q.n)}</span>`:''}</div></div>`; }).join(''); }
routes.game=async(v,id)=>{ const g=Store.game(id); if(!g){ v.innerHTML='<p class="muted">That game isn’t on this phone.</p><a class="btn" href="#today">Back to today</a>'; return; }
  const max=g.n*100, title=g.mode==='daily'?'Daily 5 · '+dayLabel(g.day):g.mode==='arch'?'Archive · '+dayLabel(g.day):'Duel '+g.code;
  const conf=Math.round(g.items.reduce((s,x)=>s+x.c,0)/g.items.length), hr=Math.round(100*g.hits/g.n);
  const over=conf-hr;
  v.innerHTML=`<p class="muted small" style="margin:0"><a href="${g.mode==='arch'?'#archive':'#today'}">‹ ${g.mode==='arch'?'Archive':'Today'}</a></p><div class="card hero"><p class="muted small" style="margin:0">${esc(title)}</p><div class="big">${g.pts}<small> / ${max}</small></div>
    <p style="margin:6px 0 0"><b>${g.hits}/${g.n}</b> answers inside your ranges · you said ${conf}% on average</p><p class="muted small" style="margin:4px 0 0">${over>=20?'Overconfident today: you hit '+hr+'% but claimed '+conf+'%.':over<=-20?'Underconfident today: you hit '+hr+'%, more than the '+conf+'% you claimed. Tighten up.':'Nicely calibrated today.'} ${esc(calLine(g.items))}</p>
    ${g.pending?'<p class="muted small" style="color:var(--warn)">Not sent to the crowd yet (offline). It’ll send next time you open the app.</p>':''}${g.late?'<p class="muted small">Played after its day ended, so it isn’t on the board.</p>':''}
    <div class="row" style="margin-top:10px"><button class="btn" id="shr">Share</button><a class="btn ghost" href="#stats">Calibration</a></div></div><div id="rv"><p class="muted">Loading the crowd…</p></div>
    ${g.mode==='daily'&&!P()?'<div class="card"><b>Want more?</b><p class="muted small" style="margin:4px 0 8px">Pro adds your calibration curve over time, true/false and higher-or-lower modes, friend duels and every past day.</p><a class="btn sm" href="#pro">See Pro</a></div>':''}`;
  $('#shr').onclick=()=>shareGame(g);
  const crowd=g.mode==='duel'?null:await crowdFor(g.day);
  const rv=$('#rv'); if(rv) rv.innerHTML=revealHTML(g.items,crowd,{noCrowd:g.mode==='duel'}); };
function shareText(g){ const grid=g.items.map(x=>x.hit?'🟩':'🟥').join(''); const t=g.mode==='duel'?'Duel '+g.code:dayLabel(g.day);
  return `Blindspot · ${t}\n${g.pts}/${g.n*100} · ${grid} · ${g.hits}/${g.n} in range\nHow well do you know what you know?\nhttps://northpeakstudios.github.io/blindspot/${g.mode==='duel'?'#duel/'+g.code:''}`; }
async function shareGame(g){ const t=shareText(g); try{ if(navigator.share){ await navigator.share({text:t}); return; } }catch(e){ if(e&&e.name==='AbortError') return; } try{ await navigator.clipboard.writeText(t); toast('Copied. Paste it anywhere'); }catch(e){ sheet(`<h3>Share</h3><textarea readonly style="min-height:140px">${esc(t)}</textarea>`); } }

/* ---------- Today (home) ---------- */
function streak(){ const days=new Set(Store.games('daily').map(g=>g.day)); let n=localDayN(), s=0; if(!days.has(bsDayKey(n))) n--; while(days.has(bsDayKey(n))){ s++; n--; } return s; }
routes.today=v=>{ const day=Store.today(), n=bsDayNum(day), qids=bsDaily(BS_META,n), g=Store.game('g_daily_'+day), c=curGet(), st=streak();
  const inProg=c&&c.kind==='daily'&&c.key===day; const welcome=!localStorage.getItem('bls.hi');
  const recent=Store.games('daily').slice(0,7);
  v.innerHTML=`${welcome?`<div class="card newc"><button class="lnk x" id="hix" aria-label="Dismiss">✕</button><b>How well do you know what you know?</b><p class="muted small" style="margin:4px 0 0">Every day: 5 questions with number answers. Don’t guess one number. Give a <b>range</b> and say how sure you are (50, 80 or 95%). Over time Blindspot shows whether your 80% really means 80%, or whether you’re overconfident like most people.</p></div>`:''}
   <div class="card hero"><p class="muted small" style="margin:0">Daily 5 · ${esc(dayLabel(day))}</p>
   ${g?`<div class="big">${g.pts}<small> / 500</small></div><p style="margin:6px 0 10px"><b>${g.hits}/5</b> in range · ${esc(calLine(g.items))}</p><a class="btn" href="#game/g_daily_${day}">See the reveal</a> <button class="btn ghost" id="shr">Share</button>`
   :`<h2 style="margin:4px 0">${inProg?'Keep going: '+c.i+' of 5 done':'Today’s 5 are ready'}</h2><p class="muted" style="margin:0 0 10px">${qids.map(id=>CAT[QN[id].c]).join(' · ')}</p><button class="btn big block" id="go">${inProg?'Continue':'Play today’s 5'}</button>`}
   <p class="muted small" style="margin:10px 0 0">🔥 ${st} day streak · new set at midnight</p></div>
   <div class="grid2"><a class="card modec" href="#modes" style="margin:0"><span class="ic">🎯</span><span class="wh"><b>Modes</b><small>True/false, higher or lower, archive</small></span></a><a class="card modec" href="#friends" style="margin:0"><span class="ic">⚔️</span><span class="wh"><b>Duels</b><small>Same 5, who’s better calibrated?</small></span></a></div>
   ${recent.length?`<h3 style="margin-top:16px">Recent days</h3><div class="card list">${recent.map(x=>`<a class="it" href="#game/${x.id}"><span class="wh"><b>${esc(dayLabel(x.day))}</b><small>${x.hits}/5 in range</small></span><span class="pill acc">${x.pts}</span></a>`).join('')}</div>`:''}`;
  const go=$('#go'); if(go) go.onclick=()=>startSet('daily',day,qids);
  const shr=$('#shr'); if(shr) shr.onclick=()=>shareGame(g);
  const hx=$('#hix'); if(hx) hx.onclick=()=>{ localStorage.setItem('bls.hi','1'); route(); }; };

/* ---------- how scoring works ---------- */
routes.how=v=>{ v.innerHTML=`<p class="muted small" style="margin:0"><a href="#more">‹ More</a></p><h2>How scoring works</h2>
  <div class="card"><h3>Ranges + confidence</h3><p class="muted" style="margin:0">For each question, give a low and a high and say how sure you are the true answer is inside: 50%, 80% or 95%. If you’re well calibrated, about 80% of your 80% ranges contain the answer, and so on.</p></div>
  <div class="card"><h3>Points (0–100 per question)</h3><p class="muted" style="margin:0">Blindspot uses the <b>interval score</b>, a proper scoring rule from statistics (Gneiting &amp; Raftery, 2007): your score is the width of your range, plus a penalty if the answer falls outside it. The penalty is multiplied by 2 ÷ (1 − confidence): ×4 at 50%, ×10 at 80%, ×40 at 95%. So a miss at 95% hurts a lot. The best strategy is to be honest about what you know. Big numbers are judged on a log scale (being off by 2× counts the same at 100 or at 1 million). Years are judged in years, with more slack for ancient dates. That total is turned into 0–100 points.</p></div>
  <div class="card"><h3>Calibration</h3><p class="muted" style="margin:0">Your calibration curve (Pro) plots how often you actually hit at each confidence level. Points below the diagonal mean overconfident: most people’s “90% sure” ranges hit far less than 90% of the time.</p></div>
  <div class="card"><h3>True / false mode</h3><p class="muted" style="margin:0">Pick true or false and a confidence from 50% to 99%. Scored with the Brier score: 100 × (1 − (confidence − outcome)²), where outcome is 1 if you were right. A 99% wrong answer scores about 2 points.</p></div>
  <div class="card"><h3>Where the answers come from</h3><p class="muted" style="margin:0">Every answer shows its source (NASA, USGS, the US Census, Britannica, FDA, PubChem and others). Some measurements, like river lengths, differ between sources, and the reveal says so.</p></div>`; };

/* ---------- command search ---------- */
const CMDS=[['Play today’s 5','#today','daily play start'],['Today','#today','home'],['Modes','#modes','games'],['True or false (Pro)','#tf','tf true false confidence'],['Higher or lower (Pro)','#hl','streak higher lower'],['Archive of past days (Pro)','#archive','past old days'],
 ['My calibration','#stats','curve stats overconfident'],['History','#history','games list'],['Weekly leaderboard','#friends','board rank leaderboard'],['Start a duel (Pro)','#duelnew','duel friend challenge'],['Join a duel by code','#dueljoin','duel code join'],
 ['How scoring works','#how','help rules interval score'],['Account','#account','sign in login email'],['Get Pro','#pro','buy upgrade'],['About Blindspot','#about','version'],['Sync now','sync','sync cloud'],['Share today’s result','share','share copy']];
function palette(){ sheet(`<input id="pq" placeholder="Search commands" autocomplete="off"><div class="pal list" id="pl"></div>`,root=>{ const draw=()=>{ const t=root.querySelector('#pq').value.trim().toLowerCase(); const hits=CMDS.filter(c=>!t||(c[0]+' '+c[2]).toLowerCase().includes(t));
  root.querySelector('#pl').innerHTML=hits.map((c,i)=>`<div class="it" data-i="${CMDS.indexOf(c)}" role="button" tabindex="0"><span class="wh"><b>${esc(c[0])}</b></span></div>`).join('')||'<p class="muted">Nothing matches.</p>'; };
  root.querySelector('#pq').addEventListener('input',draw); draw(); root.querySelector('#pl').addEventListener('click',e=>{ const it=e.target.closest('[data-i]'); if(!it) return; const c=CMDS[+it.dataset.i]; closeSheet();
   if(c[1]==='sync'){ window.BlsSync?BlsSync().then(()=>toast(window.__blsSync||'Synced')):toast('Sign in to sync'); return; }
   if(c[1]==='share'){ const g=Store.game('g_daily_'+Store.today()); g?shareGame(g):toast('Play today’s 5 first'); return; }
   location.hash=c[1]; }); setTimeout(()=>root.querySelector('#pq').focus(),60); }); }
document.addEventListener('click',e=>{ if(e.target.closest('[data-pal]')) palette(); });
document.addEventListener('keydown',e=>{ if((e.key==='k'&&(e.metaKey||e.ctrlKey))||(e.key==='/'&&!/INPUT|TEXTAREA/.test((document.activeElement||{}).tagName||''))){ e.preventDefault(); palette(); } });

window.npUpdate={ safe:()=>!/^#(play|tf|hl|dueljoin|duelnew)/.test(location.hash)&&!localStorage.getItem('bls.cur')&&!(document.getElementById('sheet')&&!document.getElementById('sheet').hidden), toast:(m,on)=>{ toast(m); const t=document.getElementById('toast'); if(t&&on){ t.style.cursor='pointer'; t.onclick=()=>{ t.onclick=null; on(); }; } } };
window.addEventListener('bls-data',()=>{ const h=(location.hash||'#today').slice(1).split('/')[0]; if(['today','stats','history','archive'].includes(h)&&!document.querySelector('#view input:focus')) route(); });
window.addEventListener('DOMContentLoaded',()=>{ route(); });
window.addEventListener('cloud-ready',()=>{ setTimeout(flushPending,800); });
window.BlsApp={QN,QT,CAT,fmtShort,fmtExact,withUnit,parseNum,numberLine,startSet,revealHTML,dayLabel,shareGame,calLine,streak};
