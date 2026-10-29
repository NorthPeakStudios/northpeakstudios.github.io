// Trace · insights from YOUR logs only: effects over time, before/after, hours-after, side effects, and "what may happen"
// (a plain projection of your own patterns, with confidence from how much you've logged). Correlation, not cause.
(function(){
const M=()=>Store.METRICS;
/* Insights tabs (1.3): the pattern tools that used to sit in Labs are tabs here now. Scrolls sideways on a phone; the open tab scrolls into view. */
const TABS=[['fx','Effects',1],['forecast','What could happen',1],['web','The web'],['ctx','Context'],['rhythm','Rhythm'],['timing','Timing & sleep'],['detect','Effect detective'],['week','What changed'],['fp','Deep dives']];
function nav(on,key){ const k=key?'/'+encodeURIComponent(key):''; setTimeout(()=>{ const a=document.querySelector('.seg.tabs a.on'); if(a&&a.scrollIntoView) a.scrollIntoView({block:'nearest',inline:'center'}); },0);
  return `<div class="seg tabs" role="tablist" aria-label="Insights">${TABS.map(([id,l,kk])=>`<a href="#${id}${kk?k:''}" class="${on===id?'on':''}" ${on===id?'aria-current="page"':''}>${l}</a>`).join('')}</div>`; }
window.TrcNav=nav;
function picker(key,base){ const ns=Store.names(); return `<select id="ip">${ns.map(n=>`<option value="${esc(Store.keyOf(n.name))}" ${Store.keyOf(n.name)===key?'selected':''}>${esc(n.name)} (${n.n})</option>`).join('')}</select>`; }
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
/* daily averages of every logged feeling (from any entry or check-in that day) */
function daily(){ const d={}; for(const x of Store.entries()){ if(!x.feel) continue; const k=Store.dayKey(x.t); const o=d[k]=d[k]||{}; for(const [m] of M()) if(x.feel[m]) (o[m]=o[m]||[]).push(x.feel[m]); } const out={}; for(const k in d){ out[k]={}; for(const m in d[k]) out[k][m]=avg(d[k][m]); } return out; }
function analyze(key,from){ from=from||0; /* 1.4.2: optional range start (0 = all time, the default) */
  const es=Store.entries().filter(x=>Store.keyOf(x.what)===key&&x.t>=from); const use=new Set(es.map(x=>Store.dayKey(x.t))); const D0=daily(), fk0=from?Store.dayKey(from):''; const D={}; for(const k in D0) if(k>=fk0) D[k]=D0[k];
  const res={n:es.length,days:use.size,es,use,D,cmp:{},ba:{},hrs:{},fx:{}};
  const first=es.length?Math.min(...es.map(x=>x.t)):0, fk=first?Store.dayKey(first):'';
  for(const [m] of M()){ const u=[],o=[],b=[],a=[]; for(const k in D){ const v=D[k][m]; if(v==null) continue; (use.has(k)?u:o).push(v); (k<fk?b:a).push(v); } res.cmp[m]={u:avg(u),o:avg(o),nu:u.length,no:o.length}; res.ba[m]={b:avg(b),a:avg(a),nb:b.length,na:a.length}; }
  const B=[[0,1,'under 1 h'],[1,3,'1–3 h'],[3,6,'3–6 h'],[6,1e9,'6 h+']];
  for(const [lo,hi,l] of B){ const rows=es.filter(x=>x.feel&&x.feelAt&&(x.feelAt-x.t)/36e5>=lo&&(x.feelAt-x.t)/36e5<hi); res.hrs[l]={n:rows.length}; for(const [m] of M()) res.hrs[l][m]=avg(rows.map(x=>x.feel[m]).filter(Boolean)); }
  for(const x of es) for(const f of (x.fx||[])) res.fx[f]=(res.fx[f]||0)+1;
  return res;
}
window.TrcAnalyze=analyze;
const f1=x=>x==null?'–':x.toFixed(1);
function bar(val,colr){ return `<span class="t"><i style="width:${val==null?0:(val/5*100).toFixed(0)}%;background:${colr}"></i></span>`; }
function chart(D,use,m,days){ const W=340,H=150,pad=22; const keys=[]; const now=new Date(); for(let i=days-1;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i); keys.push(Store.dayKey(d)); }
  const X=i=>pad+i*(W-pad-6)/(days-1), Y=v=>H-18-(v-1)/4*(H-34); let path='',pts='',ticks='';
  keys.forEach((k,i)=>{ const v=D[k]&&D[k][m]; if(v!=null){ path+=(path?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1); pts+=`<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="2.6" fill="#a78bfa"/>`; } if(use.has(k)) ticks+=`<rect x="${(X(i)-2).toFixed(1)}" y="${H-12}" width="4" height="8" rx="1.5" fill="#5eead4"/>`; });
  const grid=[1,2,3,4,5].map(v=>`<line x1="${pad}" x2="${W-4}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1f2733"/><text x="4" y="${Y(v)+4}" font-size="10" fill="#8b949e">${v}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily ${m} over ${days} days">${grid}<path d="${path}" fill="none" stroke="#a78bfa" stroke-width="1.8"/>${pts}${ticks}</svg><p class="muted small" style="margin:2px 0 0"><span style="color:#a78bfa">●</span> your daily ${m} (1–5) &nbsp; <span style="color:#5eead4">▮</span> days you logged it</p>`; }
function emptyNames(v,on){ v.innerHTML=nav(on)+`<div class="empty card">Log a few things first. Patterns show up here once you have some logs with how you felt.</div>`; }
let chartM='mood', chartDays=30;
routes.fx=(v,key)=>{
  if(!P()) return TrcPro.locked(v,'Effects over time','Each thing you log next to your own mood, energy, focus, sleep, anxiety and appetite, with before/after and hours-after views.');
  const ns=Store.names(); if(!ns.length) return emptyNames(v,'fx'); key=key||Store.keyOf(ns[0].name); const A=analyze(key); const nm=(ns.find(n=>Store.keyOf(n.name)===key)||{name:key}).name;
  const cmpRows=M().map(([m,l])=>{ const c=A.cmp[m]; const fade=(c.nu<3||c.no<3)?'faded':''; return `<div class="b ${fade}"><span>${l}<br><small class="muted">${c.nu} / ${c.no} days</small></span><span>${bar(c.u,'#5eead4')}<small>${f1(c.u)}</small></span><span>${bar(c.o,'#64748b')}<small>${f1(c.o)}</small></span></div>`; }).join('');
  const baRows=M().map(([m,l])=>{ const c=A.ba[m]; if(!c.nb||!c.na) return ''; const fade=(c.nb<3||c.na<3)?'faded':''; return `<div class="b ${fade}"><span>${l}</span><span>${bar(c.b,'#64748b')}<small>${f1(c.b)}</small></span><span>${bar(c.a,'#5eead4')}<small>${f1(c.a)}</small></span></div>`; }).join('');
  const hrs=Object.entries(A.hrs).filter(([,o])=>o.n);
  const fx=Object.entries(A.fx).sort((a,b)=>b[1]-a[1]);
  v.innerHTML=nav('fx',key)+`${picker(key)}
   <div class="note">Your logs only. This shows what tends to show up <b>together</b> in your journal, not what causes what. Faded rows have under 3 days behind them.</div>
   <div class="stat"><div><b>${A.n}</b><span>logs</span></div><div><b>${A.days}</b><span>days</span></div><div><b>${Object.keys(A.D).length}</b><span>days with feelings</span></div></div>
   <div class="card"><div class="row"><h3 style="margin:0">Over time</h3><select id="cm" class="fx0" style="width:auto;padding:6px 8px">${M().map(([m,l])=>`<option value="${m}" ${m===chartM?'selected':''}>${l}</option>`).join('')}</select><select id="cdays" class="fx0" style="width:auto;padding:6px 8px">${[14,30,90].map(d=>`<option ${d===chartDays?'selected':''} value="${d}">${d} d</option>`).join('')}</select></div>${chart(A.D,A.use,chartM,chartDays)}</div>
   <div class="card bars"><h3>Days with ${esc(nm)} vs other days</h3><div class="b muted small"><span></span><span>with it</span><span>other days</span></div>${cmpRows}<p class="muted small">Average of everything you logged those days. Other days only count if you logged how you felt (a “just how I feel” check-in works).</p></div>
   ${baRows?`<div class="card bars"><h3>Before vs after you started logging it</h3><div class="b muted small"><span></span><span>before</span><span>since</span></div>${baRows}</div>`:''}
   <div class="card"><h3>By hours after</h3>${hrs.length?`<div class="bars">${hrs.map(([l,o])=>`<div class="b ${o.n<3?'faded':''}"><span>${l}<br><small class="muted">${o.n} logs</small></span><span class="small">${M().filter(([m])=>o[m]!=null).slice(0,3).map(([m,ml])=>ml+' '+f1(o[m])).join(' · ')}</span><span class="small">${M().filter(([m])=>o[m]!=null).slice(3).map(([m,ml])=>ml+' '+f1(o[m])).join(' · ')}</span></div>`).join('')}</div><p class="muted small">From feelings you added later on an entry (“2 h after”).</p>`:'<p class="muted">Add feelings to an entry a while after you take something and this fills in.</p>'}</div>
   <div class="card"><h3>Effects you noted</h3>${fx.length?fx.map(([f,n])=>`<div class="b bars" style="display:grid;grid-template-columns:1fr 90px;gap:8px;align-items:center;margin:6px 0"><span>${esc(f)}</span><span class="small muted">${n} of ${A.n} logs</span></div>`).join(''):'<p class="muted">None tagged yet.</p>'}</div>
   <p class="center"><a href="#sub/${encodeURIComponent(nm)}">What the FDA label says ›</a></p>`;
  $('#ip').onchange=e=>location.hash='#fx/'+encodeURIComponent(e.target.value);
  $('#cm').onchange=e=>{ chartM=e.target.value; routes.fx(v,key); }; $('#cdays').onchange=e=>{ chartDays=+e.target.value; routes.fx(v,key); };
};
/* ---- Forecast: projections from your own logs (with a minimum-data rule and confidence), plus the FDA label ---- */
function slope(pts){ if(pts.length<3) return null; const n=pts.length, mx=avg(pts.map(p=>p[0])), my=avg(pts.map(p=>p[1])); let a=0,b=0; for(const [x,y] of pts){ a+=(x-mx)*(y-my); b+=(x-mx)**2; } return b?a/b:null; }
function conf(na,nb,eff){ if(na>=15&&nb>=10&&eff>=0.8) return ['high','Higher confidence']; if(na>=6&&nb>=4&&eff>=0.5) return ['med','Medium confidence']; return ['low','Low confidence']; }
const MIN_LOGS=7, MIN_DAYS=14;
const pts_=d=>Math.abs(d).toFixed(1)+' point'+(Math.abs(d)>=1.05?'s':'');
function predict(key,from){ const A=analyze(key,from), out=[]; const ts=A.es.map(x=>x.t); const span=ts.length?(Math.max(...ts)-Math.min(...ts))/864e5:0;
  let nu=0,no=0; for(const [m] of M()){ nu=Math.max(nu,A.cmp[m].nu); no=Math.max(no,A.cmp[m].no); } const rated={nu,no};
  const enough=A.n>=MIN_LOGS&&span>=MIN_DAYS-1; if(!enough) return {A,out,enough,span,rated};
  const dayAfter=k=>{ const d=new Date(k+'T12:00'); d.setDate(d.getDate()+1); return Store.dayKey(d); };
  for(const [m,l] of M()){ const lw=l.toLowerCase(), c=A.cmp[m];
    /* 1) use days vs other days */
    if(c.u!=null&&c.o!=null&&c.nu>=3&&c.no>=3){ const d=c.u-c.o; if(Math.abs(d)>=0.4){ const up=d>0;
      out.push({cf:conf(c.nu,c.no,Math.abs(d)),n:c.nu+c.no,txt:`If your pattern stays like this, your logged ${lw} may keep running <b>${up?'higher':'lower'}</b> on days you take it, about ${pts_(d)} ${up?'above':'below'} your other days.`,why:`${c.nu} days with it vs ${c.no} without: average ${f1(c.u)} vs ${f1(c.o)} (1–5).`}); } }
    /* 2) the day after */
    const aft=[],oth=[]; for(const k in A.D){ const v=A.D[k][m]; if(v==null) continue; const prev=new Date(k+'T12:00'); prev.setDate(prev.getDate()-1); const pk=Store.dayKey(prev); if(A.use.has(k)) continue; (A.use.has(pk)?aft:oth).push(v); }
    if(aft.length>=3&&oth.length>=3){ const d=avg(aft)-avg(oth); if(Math.abs(d)>=0.4) out.push({cf:conf(aft.length,oth.length,Math.abs(d)),n:aft.length+oth.length,txt:`The <b>day after</b> you take it, your logged ${lw} has been ${pts_(d)} ${d>0?'higher':'lower'} than other days off it. That may keep happening if your pattern holds.`,why:`${aft.length} day-after days vs ${oth.length} other days off it: ${f1(avg(aft))} vs ${f1(avg(oth))}.`}); } }
  /* 3) heavier vs lighter weeks: removed in 1.4.2 — how much you use vs how you feel is an amount-vs-effect pattern, which Trace doesn't make */
  /* 4) trend lately */
  const lastUse=ts.length?Math.max(...ts):Date.now(), cutoff=lastUse-28*864e5; /* 1.4.2: the 4 weeks up to your last log of it, not the last 4 weeks of the calendar */
  for(const [m,l] of M()){ const pts=Object.keys(A.D).filter(k=>A.use.has(k)&&A.D[k][m]!=null&&new Date(k+'T12:00').getTime()>=cutoff).map(k=>[(new Date(k+'T12:00').getTime()-cutoff)/(7*864e5),A.D[k][m]]); if(pts.length<6) continue; const s=slope(pts); if(s==null||Math.abs(s)<0.2) continue;
    const last=avg(pts.slice(-3).map(p=>p[1])), next=Math.max(1,Math.min(5,last+s));
    out.push({cf:pts.length>=12&&Math.abs(s)>=0.35?['med','Medium confidence']:['low','Low confidence'],n:pts.length,txt:`In the 4 weeks up to your last log of it, your logged ${l.toLowerCase()} on days you take it was <b>${s>0?'rising':'falling'}</b> about ${Math.abs(s).toFixed(1)} a week. If that kept up, the next week may land near ${f1(next)}, though trends like this often level off.`,why:`Straight-line trend through ${pts.length} use days.`}); }
  /* 5) effects you keep tagging */
  for(const [f,n] of Object.entries(A.fx)){ if(n/A.n<0.3||n<3) continue; out.push({cf:A.n>=10&&n/A.n>=0.5?['med','Medium confidence']:['low','Low confidence'],n:A.n,txt:`<b>${esc(f)}</b> showed up in ${n} of ${A.n} of your logs, so it may keep showing up when you take it.`,why:'Share of your logs where you tagged it.'}); }
  out.sort((a,b)=>({high:0,med:1,low:2})[a.cf[0]]-({high:0,med:1,low:2})[b.cf[0]]); return {A,out,enough,span,rated}; }
window.TrcPredict=predict;
const BANNER='<div class="note warn"><b>A prediction of what MAY happen</b>, based on your own logs and public label info. <b>Not medical advice.</b> Talk to a doctor or pharmacist about anything that worries you. No dose advice, and nothing here uses body type.</div>';
/* 1.4.2 · What could happen uses ALL your history by default (old and imported logs count), with a range switch.
   Descriptive patterns come from the logs themselves (when, how often, breaks, your notes), so they show even with no feelings rated.
   Hard rule: amounts are never used here — no amount-vs-effect patterns, no dose, timing or "safe amount" wording. */
const RANGES=[['all','All time',0],['1y','1 yr',365],['90d','90 d',90],['30d','30 d',30]];
let hRange=(()=>{ try{ const r=localStorage.getItem('trc.hrange'); return RANGES.some(x=>x[0]===r)?r:'all'; }catch(e){ return 'all'; } })();
const rangeFrom=r=>{ const d=(RANGES.find(x=>x[0]===r)||RANGES[0])[2]; if(!d) return 0; const n=new Date(); n.setHours(0,0,0,0); n.setDate(n.getDate()-d+1); return n.getTime(); };
const rangeName=r=>({all:'all time','1y':'last year','90d':'last 90 days','30d':'last 30 days'})[r]||'all time';
const dS=(t,y)=>new Date(t).toLocaleDateString([],y?{month:'short',day:'numeric',year:'numeric'}:{month:'short',day:'numeric'});
const span2=(a,b)=>{ const A=new Date(a),B=new Date(b); if(Store.dayKey(a)===Store.dayKey(b)) return dS(a,1); return A.getFullYear()===B.getFullYear()?dS(a)+' – '+dS(b,1):dS(a,1)+' – '+dS(b,1); };
const pl=(n,w,ws)=>n+' '+(n===1?w:(ws||w+'s'));
const basedOn=(n,a,b,extra)=>`<span class="bo">Based on ${pl(n,'log')}${n?', '+span2(a,b):''}${extra?' · '+extra:''}</span>`;
const dayN=t=>{ const d=new Date(t); d.setHours(12,0,0,0); return Math.round(d.getTime()/864e5); };
const BK=/^(imported\b.*|from (his|her|their|your|my) log|from chat with tab|from your log)$/i;
function ownNote(x){ const segs=String(x.notes||'').split(' · ').map(z=>z.trim()).filter(Boolean); const mine=segs.filter(z=>!BK.test(z)); return {mine:mine.join(' · '),bk:segs.filter(z=>BK.test(z)).join(' · ')}; }
function hbars(rows,max,colr){ return rows.map(([l,n,sub])=>`<div class="hb"><span>${l}${sub?`<small class="muted"> ${sub}</small>`:''}</span><span class="t"><i style="width:${max?(n/max*100).toFixed(0):0}%;background:${colr||'#5eead4'}"></i></span><em>${n}</em></div>`).join(''); }
function monthChart(es,from){ const first=Math.min(...es.map(x=>x.t)); const s0=new Date(from&&from>first?from:first); const now=new Date(); const ms=[]; let y=s0.getFullYear(), m=s0.getMonth();
  while(y<now.getFullYear()||(y===now.getFullYear()&&m<=now.getMonth())){ ms.push([y,m,0]); m++; if(m>11){ m=0; y++; } if(ms.length>60) break; }
  for(const x of es){ const d=new Date(x.t); const r=ms.find(z=>z[0]===d.getFullYear()&&z[1]===d.getMonth()); if(r) r[2]++; }
  const W=340,H=150,pb=30,pt=16,n=ms.length,mx=Math.max(1,...ms.map(z=>z[2])),bw=(W-8)/n; const every=n<=12?1:n<=24?2:3;
  const bars=ms.map(([yy,mm,c],i)=>{ const h=c?Math.max(3,(H-pb-pt)*c/mx):0, x=4+i*bw; const lab=new Date(yy,mm,1).toLocaleDateString([],{month:'short'}); const showY=mm===0||i===0;
    return `<rect x="${(x+bw*0.15).toFixed(1)}" y="${(H-pb-h).toFixed(1)}" width="${(bw*0.7).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${c?'#5eead4':'#1d2430'}"/>${c?`<text x="${(x+bw/2).toFixed(1)}" y="${(H-pb-h-4).toFixed(1)}" font-size="10" text-anchor="middle" fill="#c9d1d9">${c}</text>`:''}${i%every===0?`<text x="${(x+bw/2).toFixed(1)}" y="${H-pb+13}" font-size="9.5" text-anchor="middle" fill="#8b949e">${lab}</text>${showY?`<text x="${(x+bw/2).toFixed(1)}" y="${H-pb+25}" font-size="9" text-anchor="middle" fill="#6e7681">${yy}</text>`:''}`:''}`; }).join('');
  const top=ms.slice().sort((a,b)=>b[2]-a[2])[0]; const zero=ms.filter(z=>!z[2]).length;
  return {svg:`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Logs per month"><line x1="4" x2="${W-4}" y1="${H-pb}" y2="${H-pb}" stroke="#1f2733"/>${bars}</svg>`,top,months:n,zero}; }
function describe(es,from,nm){ /* es: this item's logs in range, newest first */
  const n=es.length, t0=Math.min(...es.map(x=>x.t)), t1=Math.max(...es.map(x=>x.t)); const now=Date.now(); const Q=[]; const bo=basedOn(n,t0,t1);
  const days=[...new Set(es.map(x=>Store.dayKey(x.t)))].sort(); const since=dayN(now)-dayN(t1);
  Q.push(`<div class="stat st4"><div><b>${n}</b><span>${n===1?'log':'logs'}</span></div><div><b>${days.length}</b><span>days with a log</span></div><div><b>${esc(dS(t0))}</b><span>first · ${new Date(t0).getFullYear()}</span></div><div><b>${esc(dS(t1))}</b><span>last · ${since===0?'today':since===1?'yesterday':since+' days ago'}</span></div></div>`);
  /* how often, by month */
  if(n>=2){ const mc=monthChart(es,from); Q.push(`<div class="pat"><h4>How often, by month</h4>${mc.svg}<p class="small" style="margin:4px 0 0">Most in one month: <b>${esc(new Date(mc.top[0],mc.top[1],1).toLocaleDateString([],{month:'long',year:'numeric'}))}</b> (${pl(mc.top[2],'log')}).${mc.zero?` ${pl(mc.zero,'month')} of ${mc.months} shown had none.`:''}</p>${bo}</div>`); }
  else Q.push(`<div class="pat"><h4>How often, by month</h4><p class="muted small" style="margin:0">Needs 2+ logs in this range (now ${n}).</p></div>`);
  /* recent vs before */
  const r30=now-30*864e5, before=es.filter(x=>x.t<r30), recent=es.filter(x=>x.t>=r30); const bspan=(r30-t0)/864e5;
  if(before.length&&bspan>=30){ const rate=before.length/(Math.max(30,bspan)/30); Q.push(`<div class="pat"><h4>Lately vs before</h4><p style="margin:0">Last 30 days: <b>${pl(recent.length,'log')}</b>. Before that (${esc(span2(t0,r30-864e5))}): ${pl(before.length,'log')}, about <b>${rate>=10?Math.round(rate):rate.toFixed(1)}</b> per 30 days.</p>${basedOn(n,t0,t1,'compares the last 30 days with everything before')}</div>`); }
  else Q.push(`<div class="pat"><h4>Lately vs before</h4><p class="muted small" style="margin:0">Needs logs from more than 30 days before the last 30 days${from?' — try All time':''}.</p></div>`);
  /* time of day (logs whose time wasn't known are left out) */
  const timed=es.filter(x=>!/time unknown/i.test(x.notes||'')); const left=n-timed.length;
  const TOD=[['Overnight','12–6 AM',0,6,'overnight'],['Morning','6 AM–12 PM',6,12,'in the morning'],['Afternoon','12–5 PM',12,17,'in the afternoon'],['Evening','5–9 PM',17,21,'in the evening'],['Late','9 PM–12 AM',21,24,'late at night']];
  if(timed.length>=3){ const rows=TOD.map(([l,sub,a,b,ph])=>[l,timed.filter(x=>{ const h=new Date(x.t).getHours(); return h>=a&&h<b; }).length,sub,ph]); const mx=Math.max(...rows.map(r=>r[1])); const tt=rows.filter(r=>r[1]===mx), top=tt[0];
    Q.push(`<div class="pat"><h4>Time of day</h4>${hbars(rows.map(r=>r.slice(0,3)),mx,'#a78bfa')}<p class="small" style="margin:4px 0 0">${tt.length===1?`Most often <b>${top[3]}</b> (${top[2]}): ${top[1]} of ${timed.length}.`:`No single time stands out: ${tt.map(r=>r[0].toLowerCase()).join(', ')} have ${mx} each.`}</p>${basedOn(timed.length,Math.min(...timed.map(x=>x.t)),Math.max(...timed.map(x=>x.t)),left?pl(left,'log')+' with no time left out':'')}</div>`); }
  else Q.push(`<div class="pat"><h4>Time of day</h4><p class="muted small" style="margin:0">Needs 3+ logs with a time (now ${timed.length}).</p></div>`);
  /* day of week */
  if(n>=5){ const DW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; const rows=DW.map((l,i)=>[l,es.filter(x=>new Date(x.t).getDay()===i).length]); const mx=Math.max(...rows.map(r=>r[1])); const tops=rows.filter(r=>r[1]===mx).map(r=>r[0]);
    Q.push(`<div class="pat"><h4>Day of the week</h4>${hbars(rows,mx)}<p class="small" style="margin:4px 0 0">${tops.length===1?`Most often on <b>${tops[0]}</b> (${mx}).`:tops.length<=3?`Tied: <b>${tops.join(', ')}</b> (${mx} each).`:'Spread across the week, no single day stands out.'}</p>${bo}</div>`); }
  else Q.push(`<div class="pat"><h4>Day of the week</h4><p class="muted small" style="margin:0">Needs 5+ logs (now ${n}).</p></div>`);
  /* breaks and runs */
  if(days.length>=2){ const dn=days.map(k=>dayN(new Date(k+'T12:00').getTime())); let lg=0,li=0,run=1,br=1,bi=0; const gaps=[];
    for(let i=1;i<dn.length;i++){ const g=dn[i]-dn[i-1]; gaps.push(g); if(g>lg){ lg=g; li=i; } if(g===1){ run++; if(run>br){ br=run; bi=i; } } else run=1; }
    const sg=gaps.slice().sort((a,b)=>a-b), med=sg[Math.floor((sg.length-1)/2)]; const kd=k=>new Date(k+'T12:00').getTime();
    Q.push(`<div class="pat"><h4>Breaks</h4><p style="margin:0 0 4px">Longest break: <b>${pl(lg,'day')}</b> (${esc(dS(kd(days[li-1])))} → ${esc(dS(kd(days[li]),1))}).</p><p style="margin:0 0 4px">Usual gap between days you logged it: <b>${pl(med,'day')}</b> (median).</p>${br>1?`<p style="margin:0 0 4px">Most days in a row: <b>${br}</b> (${esc(span2(kd(days[bi-br+1]),kd(days[bi])))}).</p>`:''}<p style="margin:0">Since your last log: <b>${since===0?'logged today':pl(since,'day')}</b>${since?` (${esc(dS(t1,1))})`:''}.</p>${basedOn(n,t0,t1,pl(days.length,'day')+' with a log')}</div>`); }
  else Q.push(`<div class="pat"><h4>Breaks</h4><p class="muted small" style="margin:0">Needs logs on 2+ different days (now ${days.length}).</p></div>`);
  /* effects tagged (counts only) */
  const fx={}; for(const x of es) for(const f of (x.fx||[])) fx[f]=(fx[f]||0)+1; const fr=Object.entries(fx).sort((a,b)=>b[1]-a[1]);
  if(fr.length) Q.push(`<div class="pat"><h4>Effects you tagged <span class="muted small" style="font-weight:400">· logs with each tag</span></h4>${hbars(fr.map(([f,c])=>[esc(f),c]),n,'#fcd34d')}${basedOn(n,t0,t1,'bars are out of all '+n)}</div>`);
  /* notes by date, searchable */
  const withN=es.map(x=>[x,ownNote(x)]).filter(([,o])=>o.mine);
  Q.push(`<div class="pat"><h4>Your notes, by date <span class="muted small" style="font-weight:400">· ${withN.length} of ${pl(n,'log')}</span></h4>${withN.length?`<input type="search" id="hnq" placeholder="Search your notes for ${esc(nm)}" aria-label="Search your notes" autocomplete="off"><ul class="hnotes" id="hnl">${withN.map(([x,o])=>`<li data-q="${esc((o.mine+' '+dS(x.t,1)).toLowerCase())}"><time>${esc(new Date(x.t).toLocaleDateString([],{weekday:'short',month:'short',day:'numeric',year:'numeric'}))} · ${esc(new Date(x.t).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}))}</time>${esc(o.mine)}</li>`).join('')}</ul><p class="muted small" id="hnz" hidden>No notes match.</p>`:'<p class="muted small" style="margin:0">None of these logs have notes yet.</p>'}<span class="bo">Your own words, newest first. Amounts aren’t used anywhere on this screen.</span></div>`);
  return Q.join(''); }
function topItems(from){ const m={}; for(const x of Store.entries()){ if(x.t<from||!x.what) continue; const k=Store.keyOf(x.what); (m[k]=m[k]||{name:x.what.trim(),n:0,a:x.t,b:x.t}).n++; m[k].a=Math.min(m[k].a,x.t); m[k].b=Math.max(m[k].b,x.t); } return Object.entries(m).sort((a,b)=>b[1].n-a[1].n); }
routes.forecast=async(v,key)=>{
  if(!P()) return TrcPro.locked(v,'What could happen','Patterns from all of your logs (how often, when, breaks, your notes), predictions with how confident they are once you rate how you feel, plus what the FDA label says about longer-term use.');
  const ns=Store.names(); if(!ns.length){ v.innerHTML=nav('forecast')+`<h2 style="margin:12px 0 8px">What could happen</h2><div class="empty card">Log a few things first. Then this shows what the FDA label lists for each one (side effects, warnings, longer-term use) and patterns from your own logs. Not medical advice.</div>`; return; } key=key||Store.keyOf(ns[0].name); const nm=(ns.find(n=>Store.keyOf(n.name)===key)||{name:key}).name;
  const from=rangeFrom(hRange); const {A,out,enough,span,rated}=predict(key,from); const all=Store.entries().filter(x=>Store.keyOf(x.what)===key);
  const RG=`<div class="seg" id="hrg" role="group" aria-label="Range">${RANGES.map(([id,l])=>`<a href="#happen/${encodeURIComponent(key)}" data-r="${id}" role="button" aria-pressed="${id===hRange}" class="${id===hRange?'on':''}">${l}</a>`).join('')}</div>`;
  const head=A.n?`· ${pl(A.n,'log')}, ${esc(span2(Math.min(...A.es.map(x=>x.t)),Math.max(...A.es.map(x=>x.t))))}`:'';
  const PAT=A.n?`<div class="card"><h3>Patterns in your logs <span class="muted small" style="font-weight:400">${head}</span></h3>${describe(A.es,from,nm)}</div>`
    :`<div class="card"><h3>Patterns in your logs</h3><p style="margin:0 0 8px">No ${esc(nm)} logs in the ${rangeName(hRange)}.${all.length?` Your last one was ${esc(dS(all[0].t,1))}.`:''}</p>${all.length?`<a class="btn sm" href="#happen/${encodeURIComponent(key)}" data-r="all" id="hall">Show all time (${pl(all.length,'log')})</a>`:''}</div>`;
  const need=[]; if(A.n<MIN_LOGS) need.push(`${MIN_LOGS-A.n} more ${MIN_LOGS-A.n===1?'log':'logs'} of ${esc(nm)}`); if(A.n&&span<MIN_DAYS-1) need.push(`logs spread over ${MIN_DAYS}+ days (now ${Math.round(span)+1})`);
  const needU=Math.max(0,3-rated.nu), needO=Math.max(0,3-rated.no);
  let effMsg=''; if(need.length) effMsg=`<p class="muted" style="margin:0">Effect patterns need ${need.join(' and ')}, plus how you felt on some of them.</p>`;
  else if(needU||needO) effMsg=`<p style="margin:0">Rate how you felt${needU?` on <b>${needU} more ${needU===1?'day':'days'}</b> you log ${esc(nm)}`:''}${needU&&needO?' and':''}${needO?` on <b>${needO} more ${needO===1?'day':'days'}</b> without it (a “just how I feel” check-in)`:''} to unlock effect patterns.</p><span class="bo">Now: ${pl(rated.nu,'day')} rated with it, ${pl(rated.no,'day')} without, in this range. Your ${pl(A.n,'log')} still count for everything above.</span>`;
  else if(!out.length) effMsg=`<p class="muted" style="margin:0">Your rated days with and without it are within 0.4 points on every feeling, so there’s no effect pattern to show.</p><span class="bo">Based on ${pl(rated.nu,'day')} rated with it and ${pl(rated.no,'day')} without.</span>`;
  const EFF=`<div class="card"><h3>Effect patterns <span class="muted small" style="font-weight:400">· from how you felt</span></h3>${out.map(o=>`<div class="pat"><p style="margin:0 0 4px">${o.txt}</p><span class="conf ${o.cf[0]}">${o.cf[1]}</span> <span class="muted small">${esc(o.why)}</span></div>`).join('')}${out.length&&effMsg?'<div style="height:8px"></div>':''}${effMsg}
    <details class="fold" style="background:#0f141b;margin-top:12px"><summary>How this is worked out</summary><p class="muted small" style="margin-top:0">Everything uses the range you picked (All time by default, so old and imported logs count). <b>Patterns in your logs</b> are plain counts: logs per month, time of day, day of week, the gaps between days you logged it, effects you tagged, and your notes. Each says what it’s based on, and each has its own minimum. <b>Effect patterns</b> need ${MIN_LOGS}+ logs over ${MIN_DAYS}+ days and feelings rated on 3+ days with it and 3+ without: (1) the average gap between days you logged it and days you didn’t; (2) the day after vs other days off it; (3) a straight-line trend over the 4 weeks up to your last log of it; (4) effects you tagged in 30%+ of logs. A gap has to be 0.4+ points on the 1–5 scale to show. Amounts and how much you use are never compared with how you felt, so nothing here links an amount to an effect. Sleep, stress, school, food and everything you didn’t log move these numbers too, so this is correlation, not cause.</p></details></div>`;
  const tops=topItems(from); const TOP=tops.length>1?`<div class="card"><h3>Most-logged <span class="muted small" style="font-weight:400">· ${rangeName(hRange)}</span></h3>${tops.slice(0,8).map(([k,o])=>`<a class="hb hbl" href="#happen/${encodeURIComponent(k)}"><span>${k===key?'<b>'+esc(o.name)+'</b>':esc(o.name)}</span><span class="t"><i style="width:${(o.n/tops[0][1].n*100).toFixed(0)}%;background:${k===key?'#a78bfa':'#5eead4'}"></i></span><em>${o.n}</em></a>`).join('')}<span class="bo">Based on ${pl(tops.reduce((s,[,o])=>s+o.n,0),'log')} of ${pl(tops.length,'thing')} in this range. Tap one to see its patterns.</span></div>`:'';
  const FDAB=`<h3 style="margin-top:16px">What the FDA label says could happen <span class="muted small" style="font-weight:400">· side effects, warnings, longer-term use</span></h3><div class="card" id="mfd"><p class="muted">Looking it up…</p></div>`;
  v.innerHTML=nav('forecast',key)+`<h2 style="margin:12px 0 8px">What could happen <span class="muted small" style="font-weight:400">· ${esc(nm)}</span></h2>${picker(key)}${RG}${BANNER}${PAT}${EFF}${TOP}${FDAB}`;
  $('#ip').onchange=e=>location.hash='#happen/'+encodeURIComponent(e.target.value);
  v.querySelectorAll('[data-r]').forEach(a=>a.onclick=e=>{ e.preventDefault(); hRange=a.dataset.r; try{ localStorage.setItem('trc.hrange',hRange); }catch(_){} routes.forecast(v,key); });
  const q=$('#hnq'); if(q) q.oninput=()=>{ const t=q.value.trim().toLowerCase(); let k=0; v.querySelectorAll('#hnl li').forEach(li=>{ const on=!t||li.dataset.q.includes(t); li.hidden=!on; if(on) k++; }); const z=$('#hnz'); if(z) z.hidden=k>0; };
  try{ const x=await TrcFDA.lookup(nm); const b=$('#mfd'); if(!b) return; if(!x){ b.innerHTML=`<p class="muted" style="margin:0">No FDA drug label for “${esc(nm)}”, so there’s no official long-term info to show.</p>`; return; }
    const parts=[x.boxed&&['Boxed warning',x.boxed,420],x.dep&&['Dependence, abuse & tolerance',x.dep,600],x.warn&&['Warnings',x.warn,600],x.adverse&&['Side effects the label lists',x.adverse,500]].filter(Boolean);
    b.innerHTML=`<p class="muted small" style="margin-top:0">Quoted from the label’s own sections, shortened. It covers everyone who takes it, not you specifically.</p>`+parts.map(([h,t,n])=>`<p style="margin:8px 0 4px"><b>${h}</b></p><p class="fda" style="margin-top:0">${esc(TrcFDA.cut(t,n))}</p>`).join('')+TrcFDA.cite(x);
  }catch(e){ const b=$('#mfd'); if(b) b.innerHTML='<p class="muted">Couldn’t reach the FDA database right now.</p>'; }
};
routes.may=(v,key)=>routes.forecast(v,key);
routes.happen=(v,key)=>routes.forecast(v,key); /* 1.4.1: the screen's name again (it was "What may happen" in 1.0) */
})();
