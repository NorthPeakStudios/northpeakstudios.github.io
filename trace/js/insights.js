// Trace · insights from YOUR logs only: effects over time, before/after, hours-after, side effects, and "what may happen"
// (a plain projection of your own patterns, with confidence from how much you've logged). Correlation, not cause.
(function(){
const M=()=>Store.METRICS;
function nav(on,key){ const k=key?'/'+encodeURIComponent(key):''; return `<div class="seg"><a href="#fx${k}" class="${on==='fx'?'on':''}">Effects</a><a href="#may${k}" class="${on==='may'?'on':''}">What may happen</a><a href="#web" class="${on==='web'?'on':''}">The web</a></div>`; }
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
/* ---- what may happen: a projection of your own patterns, labelled as such ---- */
function slope(pts){ if(pts.length<3) return null; const n=pts.length, mx=avg(pts.map(p=>p[0])), my=avg(pts.map(p=>p[1])); let a=0,b=0; for(const [x,y] of pts){ a+=(x-mx)*(y-my); b+=(x-mx)**2; } return b?a/b:null; }
function conf(nu,no,eff){ if(nu>=15&&no>=10&&eff>=0.8) return ['high','Higher confidence']; if(nu>=6&&no>=4&&eff>=0.5) return ['med','Medium confidence']; return ['low','Low confidence']; }
function predict(key){ const A=analyze(key), out=[];
  for(const [m,l] of M()){ const c=A.cmp[m]; if(c.u==null||c.o==null||c.nu<3||c.no<2) continue; const d=c.u-c.o; if(Math.abs(d)<0.4) continue;
    const up=d>0, lw=l.toLowerCase(); const cf=conf(c.nu,c.no,Math.abs(d));
    out.push({cf,txt:`If this pattern keeps up, your ${lw} may keep running <b>${up?'higher':'lower'}</b> on days you take it: about ${Math.abs(d).toFixed(1)} point${Math.abs(d)>=1.05?'s':''} ${up?'above':'below'} your other days (1–5 scale).`,why:`${c.nu} days with it vs ${c.no} days without, average ${f1(c.u)} vs ${f1(c.o)}.`}); }
  const cutoff=Date.now()-42*864e5;
  for(const [m,l] of M()){ const pts=Object.keys(A.D).filter(k=>A.use.has(k)&&A.D[k][m]!=null&&new Date(k+'T12:00').getTime()>=cutoff).map(k=>[(new Date(k+'T12:00').getTime()-cutoff)/(7*864e5),A.D[k][m]]); if(pts.length<5) continue; const s=slope(pts); if(s==null||Math.abs(s)<0.2) continue;
    const span=(Math.max(...pts.map(p=>p[0]))-Math.min(...pts.map(p=>p[0]))); if(span<2) continue;
    const cf=pts.length>=12&&Math.abs(s)>=0.35?['med','Medium confidence']:['low','Low confidence'];
    out.push({cf,txt:`On days you take it, your ${l.toLowerCase()} has been <b>${s>0?'rising':'falling'}</b> about ${Math.abs(s).toFixed(1)} a week lately. If that continues, it may keep ${s>0?'rising':'falling'} for a while, though trends like this often level off.`,why:`Straight-line trend through ${pts.length} use days over the last 6 weeks.`}); }
  for(const [f,n] of Object.entries(A.fx)){ if(A.n<3||n/A.n<0.3) continue; out.push({cf:A.n>=10&&n/A.n>=0.5?['med','Medium confidence']:['low','Low confidence'],txt:`<b>${esc(f)}</b> showed up in ${n} of ${A.n} of your logs, so it may keep showing up when you take it.`,why:'Share of your logs where you tagged it.'}); }
  out.sort((a,b)=>({high:0,med:1,low:2})[a.cf[0]]-({high:0,med:1,low:2})[b.cf[0]]); return {A,out}; }
window.TrcPredict=predict;
routes.may=async(v,key)=>{
  if(!P()) return TrcPro.locked(v,'What may happen','A projection from your own logs of what may keep happening if your patterns continue, with a confidence level, plus what the FDA label says about longer-term use.');
  const ns=Store.names(); if(!ns.length) return emptyNames(v,'may'); key=key||Store.keyOf(ns[0].name); const nm=(ns.find(n=>Store.keyOf(n.name)===key)||{name:key}).name; const {A,out}=predict(key);
  v.innerHTML=nav('may',key)+`${picker(key)}
   <div class="note warn"><b>A prediction, not medical advice.</b> This is what <i>may</i> happen if the patterns in your own logs keep going. It can’t know what causes what, it isn’t a dose guide, and it doesn’t use body type. For any change to a medicine, talk to a doctor or pharmacist.</div>
   <div class="card"><h3>From your logs</h3>${A.n<3?`<p class="muted">Log ${esc(nm)} a few more times, with how you felt, and add some “just how I feel” check-ins on other days. Predictions start at 3+ days.</p>`:out.length?out.map(o=>`<div style="padding:10px 0;border-bottom:1px solid #222a35"><p style="margin:0 0 4px">${o.txt}</p><span class="conf ${o.cf[0]}">${o.cf[1]}</span> <span class="muted small">${esc(o.why)}</span></div>`).join(''):'<p class="muted">No clear pattern yet. Your days with and without it look about the same so far.</p>'}
    <details class="fold" style="background:#0f141b;margin-top:12px"><summary>How this is worked out</summary><p class="muted small" style="margin-top:0">Three plain checks on your own logs: (1) the average difference between days you logged it and days you didn’t, shown if it’s 0.4+ points; (2) a straight-line trend over the last 6 weeks of use days, shown if it moves 0.2+ points a week; (3) effects you tagged in 30%+ of logs. Confidence goes up with more days on both sides and bigger differences: low under 6 use days, higher only with 15+ use days, 10+ other days and a 0.8+ point gap. Sleep, stress, school and everything else you didn’t log can also move these numbers.</p></details></div>
   <h3>What the label says about longer-term use</h3><div class="card" id="mfd"><p class="muted">Looking it up…</p></div>`;
  $('#ip').onchange=e=>location.hash='#may/'+encodeURIComponent(e.target.value);
  try{ const x=await TrcFDA.lookup(nm); const b=$('#mfd'); if(!b) return; if(!x){ b.innerHTML=`<p class="muted" style="margin:0">No FDA drug label for “${esc(nm)}”, so there’s no official long-term info to show.</p>`; return; }
    const parts=[x.boxed&&['Boxed warning',x.boxed],x.dep&&['Dependence & abuse',x.dep],x.warn&&['Warnings',x.warn]].filter(Boolean);
    b.innerHTML=(parts.length?parts.map(([h,t])=>`<p style="margin:0 0 4px"><b>${h}</b></p><p class="fda" style="margin-top:0">${esc(TrcFDA.cut(t,600))}</p>`).join(''):`<p class="muted">This label has no boxed warning or dependence section.</p>`)+TrcFDA.cite(x);
  }catch(e){ const b=$('#mfd'); if(b) b.innerHTML='<p class="muted">Couldn’t reach the FDA database right now.</p>'; }
};
})();
