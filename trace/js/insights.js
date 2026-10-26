// Trace · insights from YOUR logs only: effects over time, before/after, hours-after, side effects, and "what may happen"
// (a plain projection of your own patterns, with confidence from how much you've logged). Correlation, not cause.
(function(){
const M=()=>Store.METRICS;
function nav(on,key){ const k=key?'/'+encodeURIComponent(key):''; return `<div class="seg"><a href="#fx${k}" class="${on==='fx'?'on':''}">Effects</a><a href="#forecast${k}" class="${on==='forecast'?'on':''}">Forecast</a><a href="#web" class="${on==='web'?'on':''}">The web</a></div>`; }
window.TrcNav=nav;
function picker(key,base){ const ns=Store.names(); return `<select id="ip">${ns.map(n=>`<option value="${esc(Store.keyOf(n.name))}" ${Store.keyOf(n.name)===key?'selected':''}>${esc(n.name)} (${n.n})</option>`).join('')}</select>`; }
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
/* daily averages of every logged feeling (from any entry or check-in that day) */
function daily(){ const d={}; for(const x of Store.entries()){ if(!x.feel) continue; const k=Store.dayKey(x.t); const o=d[k]=d[k]||{}; for(const [m] of M()) if(x.feel[m]) (o[m]=o[m]||[]).push(x.feel[m]); } const out={}; for(const k in d){ out[k]={}; for(const m in d[k]) out[k][m]=avg(d[k][m]); } return out; }
function analyze(key){
  const es=Store.entries().filter(x=>Store.keyOf(x.what)===key); const use=new Set(es.map(x=>Store.dayKey(x.t))); const D=daily();
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
function predict(key){ const A=analyze(key), out=[]; const ts=A.es.map(x=>x.t); const span=ts.length?(Math.max(...ts)-Math.min(...ts))/864e5:0;
  const enough=A.n>=MIN_LOGS&&span>=MIN_DAYS-1; if(!enough) return {A,out,enough,span};
  const dayAfter=k=>{ const d=new Date(k+'T12:00'); d.setDate(d.getDate()+1); return Store.dayKey(d); };
  for(const [m,l] of M()){ const lw=l.toLowerCase(), c=A.cmp[m];
    /* 1) use days vs other days */
    if(c.u!=null&&c.o!=null&&c.nu>=3&&c.no>=3){ const d=c.u-c.o; if(Math.abs(d)>=0.4){ const up=d>0;
      out.push({cf:conf(c.nu,c.no,Math.abs(d)),n:c.nu+c.no,txt:`If your pattern stays like this, your logged ${lw} may keep running <b>${up?'higher':'lower'}</b> on days you take it, about ${pts_(d)} ${up?'above':'below'} your other days.`,why:`${c.nu} days with it vs ${c.no} without: average ${f1(c.u)} vs ${f1(c.o)} (1–5).`}); } }
    /* 2) the day after */
    const aft=[],oth=[]; for(const k in A.D){ const v=A.D[k][m]; if(v==null) continue; const prev=new Date(k+'T12:00'); prev.setDate(prev.getDate()-1); const pk=Store.dayKey(prev); if(A.use.has(k)) continue; (A.use.has(pk)?aft:oth).push(v); }
    if(aft.length>=3&&oth.length>=3){ const d=avg(aft)-avg(oth); if(Math.abs(d)>=0.4) out.push({cf:conf(aft.length,oth.length,Math.abs(d)),n:aft.length+oth.length,txt:`The <b>day after</b> you take it, your logged ${lw} has been ${pts_(d)} ${d>0?'higher':'lower'} than other days off it. That may keep happening if your pattern holds.`,why:`${aft.length} day-after days vs ${oth.length} other days off it: ${f1(avg(aft))} vs ${f1(avg(oth))}.`}); } }
  /* 3) heavier vs lighter weeks */
  const wk={}; const wkOf=t=>{ const d=new Date(t); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay()); return Store.dayKey(d); };
  for(const x of A.es){ const w=wkOf(x.t); (wk[w]=wk[w]||{u:0,f:{}}).u++; }
  for(const k in A.D){ const w=wkOf(new Date(k+'T12:00').getTime()); const o=wk[w]=wk[w]||{u:0,f:{}}; for(const m in A.D[k]) (o.f[m]=o.f[m]||[]).push(A.D[k][m]); }
  const weeks=Object.values(wk).filter(w=>Object.keys(w.f).length); const uses=weeks.map(w=>w.u).sort((a,b)=>a-b);
  if(weeks.length>=4){ const cutN=uses.filter(u=>u>=5).length>=2&&uses.filter(u=>u<5).length>=2?5:uses[Math.floor(uses.length/2)]||1;
    for(const [m,l] of M()){ const hi=weeks.filter(w=>w.u>=cutN&&w.f[m]).map(w=>avg(w.f[m])), lo=weeks.filter(w=>w.u<cutN&&w.f[m]).map(w=>avg(w.f[m])); if(hi.length<2||lo.length<2) continue; const d=avg(hi)-avg(lo); if(Math.abs(d)<0.4) continue;
      out.push({cf:conf(hi.length*3,lo.length*3,Math.abs(d)),n:hi.length+lo.length,txt:`On weeks you log it ${cutN}+ times, your logged ${l.toLowerCase()} averages <b>${f1(avg(hi))}</b> vs ${f1(avg(lo))} in lighter weeks. If next week is a ${cutN}+ week, it may look more like ${f1(avg(hi))}.`,why:`${hi.length} heavier weeks vs ${lo.length} lighter weeks.`}); } }
  /* 4) trend lately */
  const cutoff=Date.now()-28*864e5;
  for(const [m,l] of M()){ const pts=Object.keys(A.D).filter(k=>A.use.has(k)&&A.D[k][m]!=null&&new Date(k+'T12:00').getTime()>=cutoff).map(k=>[(new Date(k+'T12:00').getTime()-cutoff)/(7*864e5),A.D[k][m]]); if(pts.length<6) continue; const s=slope(pts); if(s==null||Math.abs(s)<0.2) continue;
    const last=avg(pts.slice(-3).map(p=>p[1])), next=Math.max(1,Math.min(5,last+s));
    out.push({cf:pts.length>=12&&Math.abs(s)>=0.35?['med','Medium confidence']:['low','Low confidence'],n:pts.length,txt:`Over the last 4 weeks, your logged ${l.toLowerCase()} on days you take it has been <b>${s>0?'rising':'falling'}</b> about ${Math.abs(s).toFixed(1)} a week. If that keeps up, next week may land near ${f1(next)}, though trends like this often level off.`,why:`Straight-line trend through ${pts.length} use days.`}); }
  /* 5) effects you keep tagging */
  for(const [f,n] of Object.entries(A.fx)){ if(n/A.n<0.3||n<3) continue; out.push({cf:A.n>=10&&n/A.n>=0.5?['med','Medium confidence']:['low','Low confidence'],n:A.n,txt:`<b>${esc(f)}</b> showed up in ${n} of ${A.n} of your logs, so it may keep showing up when you take it.`,why:'Share of your logs where you tagged it.'}); }
  out.sort((a,b)=>({high:0,med:1,low:2})[a.cf[0]]-({high:0,med:1,low:2})[b.cf[0]]); return {A,out,enough,span}; }
window.TrcPredict=predict;
const BANNER='<div class="note warn"><b>A prediction of what MAY happen</b>, based on your own logs and public label info. <b>Not medical advice.</b> Talk to a doctor or pharmacist about anything that worries you. No dose advice, and nothing here uses body type.</div>';
routes.forecast=async(v,key)=>{
  if(!P()) return TrcPro.locked(v,'Forecast','Predictions of what may happen if your patterns keep going, built only from your own logs, with how confident they are, plus what the FDA label says about longer-term use.');
  const ns=Store.names(); if(!ns.length) return emptyNames(v,'forecast'); key=key||Store.keyOf(ns[0].name); const nm=(ns.find(n=>Store.keyOf(n.name)===key)||{name:key}).name; const {A,out,enough,span}=predict(key);
  v.innerHTML=nav('forecast',key)+`${picker(key)}${BANNER}
   <div class="card"><h3>From your logs <span class="muted small" style="font-weight:400">· ${A.n} logs over ${Math.round(span)+1} days</span></h3>${!enough?`<p><b>Not enough data yet.</b></p><p class="muted">Forecasts start once ${esc(nm)} has at least ${MIN_LOGS} logs over ${MIN_DAYS}+ days (now ${A.n} logs over ${Math.round(span)+1} days). Log how you feel too, and add “just how I feel” check-ins on other days so there’s something to compare.</p>`:out.length?out.map(o=>`<div style="padding:10px 0;border-bottom:1px solid #222a35"><p style="margin:0 0 4px">${o.txt}</p><span class="conf ${o.cf[0]}">${o.cf[1]}</span> <span class="muted small">${esc(o.why)}</span></div>`).join(''):'<p class="muted">No clear pattern yet. Your days with and without it look about the same so far, so there’s nothing honest to forecast.</p>'}
    <details class="fold" style="background:#0f141b;margin-top:12px"><summary>How this is worked out</summary><p class="muted small" style="margin-top:0">Simple checks on your own logs, nothing hidden: (1) the average gap between days you logged it and days you didn’t; (2) the day after vs other days off it; (3) heavier weeks (5+ logs, or above your usual) vs lighter weeks; (4) a straight-line trend over the last 4 weeks of use days, projected one week ahead; (5) effects you tagged in 30%+ of logs. A gap has to be 0.4+ points on the 1–5 scale to show. Confidence rises with more days on both sides and bigger gaps: higher needs 15+ days with it, 10+ without and a 0.8+ gap. Nothing starts before ${MIN_LOGS} logs over ${MIN_DAYS} days. Sleep, stress, school, food and everything you didn’t log move these numbers too, so this is correlation, not cause.</p></details></div>
   <h3>What longer-term use may involve <span class="muted small" style="font-weight:400">· FDA label</span></h3><div class="card" id="mfd"><p class="muted">Looking it up…</p></div>`;
  $('#ip').onchange=e=>location.hash='#forecast/'+encodeURIComponent(e.target.value);
  try{ const x=await TrcFDA.lookup(nm); const b=$('#mfd'); if(!b) return; if(!x){ b.innerHTML=`<p class="muted" style="margin:0">No FDA drug label for “${esc(nm)}”, so there’s no official long-term info to show.</p>`; return; }
    const parts=[x.boxed&&['Boxed warning',x.boxed,420],x.dep&&['Dependence, abuse & tolerance',x.dep,600],x.warn&&['Warnings',x.warn,600],x.adverse&&['Side effects the label lists',x.adverse,500]].filter(Boolean);
    b.innerHTML=`<p class="muted small" style="margin-top:0">Quoted from the label’s own sections, shortened. It covers everyone who takes it, not you specifically.</p>`+parts.map(([h,t,n])=>`<p style="margin:8px 0 4px"><b>${h}</b></p><p class="fda" style="margin-top:0">${esc(TrcFDA.cut(t,n))}</p>`).join('')+TrcFDA.cite(x);
  }catch(e){ const b=$('#mfd'); if(b) b.innerHTML='<p class="muted">Couldn’t reach the FDA database right now.</p>'; }
};
routes.may=(v,key)=>routes.forecast(v,key);
})();
