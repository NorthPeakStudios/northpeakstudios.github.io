// Blindspot · modes: true/false confidence, higher or lower streak, archive of past days.
(function(){
const A=()=>window.BlsApp;
const lock=(v,what,detail)=>window.BlsPro?BlsPro.locked(v,what,detail):(v.innerHTML='<p class="muted">Loading…</p>');
routes.modes=v=>{ const p=P(), best=(Store.prefs().hlBest||0), tfs=Store.games('tf');
  const tfAcc=tfs.length?Math.round(100*tfs.reduce((s,g)=>s+g.hits,0)/tfs.reduce((s,g)=>s+g.n,0)):null;
  v.innerHTML=`<h2>Modes</h2><p class="muted" style="margin-top:0">Same idea everywhere: know when you know.</p>
   <a class="card modec" href="#today"><span class="ic">📅</span><span class="wh"><b>Daily 5</b><small>Ranges + confidence on 5 number questions. Everyone gets the same set; compare with the crowd.</small></span><span class="pill acc">Free</span></a>
   <a class="card modec" href="#tf"><span class="ic">⚖️</span><span class="wh"><b>True or false</b><small>10 statements. Pick true/false and how sure you are (50–99%). Scored with the Brier score.${tfAcc!=null?' You’re right '+tfAcc+'% of the time so far.':''}</small></span><span class="pill pro">${p?'Pro ✓':'Pro'}</span></a>
   <a class="card modec" href="#hl"><span class="ic">↕️</span><span class="wh"><b>Higher or lower</b><small>Is the next answer higher or lower? Mountains, rivers, countries, years, deals… Keep the streak alive.${best?' Best: '+best+'.':''}</small></span><span class="pill pro">${p?'Pro ✓':'Pro'}</span></a>
   <a class="card modec" href="#archive"><span class="ic">🗂️</span><span class="wh"><b>Archive</b><small>Play any of the last 60 days’ sets you missed, with that day’s crowd.</small></span><span class="pill pro">${p?'Pro ✓':'Pro'}</span></a>
   <a class="card modec" href="#friends"><span class="ic">⚔️</span><span class="wh"><b>Friend duels</b><small>Send a code, both answer the same 5, compare points and calibration. Joining is free; starting one is Pro.</small></span><span class="pill pro">${p?'Pro ✓':'Pro'}</span></a>`; };

/* ---- true / false with confidence ---- */
const TFC=[50,60,70,80,90,99];
function tfGet(){ try{ return JSON.parse(localStorage.getItem('bls.tfcur')||'null'); }catch(e){ return null; } }
function tfSet(x){ x?localStorage.setItem('bls.tfcur',JSON.stringify(x)):localStorage.removeItem('bls.tfcur'); }
function tfNew(){ const seen=new Set(Store.prefs().tfSeen||[]); let pool=BSQ.tf.filter(q=>!seen.has(q.id)); if(pool.length<10){ pool=BSQ.tf.slice(); Store.savePrefs({tfSeen:[]}); }
  const ids=[]; const a=pool.slice(); while(ids.length<10&&a.length){ ids.push(a.splice(Math.floor(Math.random()*a.length),1)[0].id); } return {ids,i:0,items:[],t:Date.now()}; }
const brier=(c,ok)=>Math.round(100*(1-Math.pow(c/100-(ok?1:0),2)));
routes.tf=v=>{ if(!P()) return lock(v,'True or false','Pick true or false, then say how sure you are. See whether your 90% really means 90%.');
  let r=tfGet(); if(!r){ r=tfNew(); tfSet(r); }
  if(r.i>=r.ids.length){ const pts=r.items.reduce((s,x)=>s+x.pts,0), hits=r.items.reduce((s,x)=>s+(x.ok?1:0),0);
    const g=Store.saveGame({id:'g_tf_'+r.t,mode:'tf',t:r.t,items:r.items,pts,hits,n:r.items.length});
    Store.savePrefs({tfSeen:[...(Store.prefs().tfSeen||[]),...r.ids].slice(-110)}); tfSet(null);
    const avgc=Math.round(r.items.reduce((s,x)=>s+x.c,0)/r.items.length);
    v.innerHTML=`<p class="muted small" style="margin:0"><a href="#modes">‹ Modes</a></p><div class="card hero"><p class="muted small" style="margin:0">True or false · round done</p><div class="big">${pts}<small> / ${r.items.length*100}</small></div><p style="margin:6px 0 0"><b>${hits}/${r.items.length}</b> right · you said ${avgc}% sure on average${hits*10<avgc-15?' → overconfident':hits*10>avgc+15?' → underconfident':' → well calibrated'}</p>
     <div class="row" style="margin-top:10px"><a class="btn" href="#tf" id="again">Play again</a><a class="btn ghost" href="#stats">Calibration</a></div></div>
     <div class="card list">${r.items.map(x=>{ const q=A().QT[x.q]; return `<div class="it"><span class="wh"><b>${esc(q.q)}</b><small>${q.a?'True':'False'} · you: ${x.pick?'true':'false'} at ${x.c}% · ${esc(q.x)}</small></span><span class="pill ${x.ok?'ok':'bad'}">${x.pts}</span></div>`; }).join('')}</div>`;
    $('#again').onclick=e=>{ e.preventDefault(); tfSet(tfNew()); route(); }; return; }
  const q=A().QT[r.ids[r.i]], done=r.items[r.i];
  v.innerHTML=`<p class="muted small" style="margin:0"><a href="#modes">‹ Modes</a> · True or false</p><div class="dots">${r.ids.map((_,i)=>`<i class="${i<r.i?'done':i===r.i?'on':''}"></i>`).join('')}</div>
   <div class="card"><div class="qcat">${esc(A().CAT[q.c])} · ${r.i+1} of ${r.ids.length}</div><div class="qtext">${esc(q.q)}</div>
   <div class="tfbtns" id="tfb"><button type="button" data-v="1">True</button><button type="button" data-v="0">False</button></div>
   <label>How sure?</label><div class="conf" id="tfc">${TFC.map(c=>`<button type="button" data-c="${c}" class="${c===70?'on':''}">${c}%</button>`).join('')}</div>
   <div id="fb"></div><button class="btn big block" id="lk" style="margin-top:12px">Lock in</button></div>`;
  let pick=null, conf=70;
  $('#tfb').onclick=e=>{ const b=e.target.closest('button'); if(!b||done) return; pick=b.dataset.v==='1'; $$('#tfb button').forEach(x=>x.classList.toggle('on',x===b)); };
  $('#tfc').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; conf=+b.dataset.c; $$('#tfc button').forEach(x=>x.classList.toggle('on',x===b)); };
  $('#lk').onclick=()=>{ if(r.items[r.i]){ r.i++; tfSet(r); route(); return; } if(pick==null) return toast('Pick true or false');
    const ok=pick===q.a, pts=brier(conf,ok); r.items[r.i]={q:q.id,pick,c:conf,ok,pts}; tfSet(r);
    $('#fb').innerHTML=`<div class="card" style="margin:12px 0 0;border-color:${ok?'#1f6f3a':'#7a2b2b'}"><b>${ok?'✓ Right':'✗ Wrong'}: it’s ${q.a?'true':'false'}.</b> <span class="pill ${ok?'ok':'bad'}">${pts} pts</span><p class="muted small" style="margin:6px 0 0">${esc(q.x)} <i>Source: ${esc(q.s)}</i></p></div>`;
    $('#lk').textContent=r.i===r.ids.length-1?'See results':'Next'; $$('#tfb button,#tfc button').forEach(b=>b.disabled=true); };
};

/* ---- higher or lower ---- */
const HLG=['peak_m','river_km','area_km2','pop','build_m','year','Z','depth_m','diam_km','melt_c','density','rate','grav','halflife_h','ipo','coin_g','deal_usd','dist_km'];
const byG={}; BSQ.numeric.forEach(q=>{ if(q.g&&HLG.includes(q.g)) (byG[q.g]=byG[q.g]||[]).push(q); });
const groups=Object.keys(byG).filter(g=>byG[g].length>=4);
const pickOf=a=>a[Math.floor(Math.random()*a.length)];
function hlNext(prev){ let g=prev?prev.g:pickOf(groups), a=prev||pickOf(byG[g]); let cands=byG[g].filter(q=>q.id!==a.id&&Math.abs(q.a-a.a)>Math.abs(a.a)*0.01+1e-9);
  if(!cands.length){ g=pickOf(groups.filter(x=>x!==g)); a=pickOf(byG[g]); cands=byG[g].filter(q=>q.id!==a.id&&Math.abs(q.a-a.a)>Math.abs(a.a)*0.01+1e-9); }
  return {a:a.id,b:pickOf(cands).id}; }
let hl=null;
routes.hl=v=>{ if(!P()) return lock(v,'Higher or lower','Is the next answer higher or lower? Build a streak across mountains, rivers, countries, history and money.');
  if(!hl) hl={streak:0,...hlNext(null),t:Date.now(),seen:0};
  const QN=A().QN, a=QN[hl.a], b=QN[hl.b], yr=a.k==='y', best=Store.prefs().hlBest||0;
  v.innerHTML=`<p class="muted small" style="margin:0"><a href="#modes">‹ Modes</a> · Higher or lower</p>
   <div class="card hero"><div class="row"><div><span class="muted small">Streak</span><div class="big">${hl.streak}</div></div><div style="text-align:right"><span class="muted small">Best</span><div class="big">${best}</div></div></div></div>
   <div class="card"><div class="qcat">${esc(A().CAT[a.c])}</div><div style="font-weight:600;overflow-wrap:anywhere">${esc(a.q)}</div><div class="hlv">${esc(A().withUnit(A().fmtExact(a.a,a),a))}</div></div>
   <div class="card"><div class="qcat">${esc(A().CAT[b.c])}</div><div style="font-weight:600;overflow-wrap:anywhere">${esc(b.q)}</div><div class="hlv" id="bv">?</div>
   <div class="tfbtns" id="hb"><button type="button" data-v="1">${yr?'Later ↑':'Higher ↑'}</button><button type="button" data-v="0">${yr?'Earlier ↓':'Lower ↓'}</button></div><div id="hf"></div></div>`;
  $('#hb').onclick=e=>{ const bt=e.target.closest('button'); if(!bt||hl.done) return; hl.done=1; const up=bt.dataset.v==='1', ok=(b.a>a.a)===up; bt.classList.add('on');
    $('#bv').textContent=A().withUnit(A().fmtExact(b.a,b),b);
    if(ok){ hl.streak++; if(hl.streak>best) Store.savePrefs({hlBest:hl.streak}); $('#hf').innerHTML=`<p style="margin:6px 0 0"><b>✓ Right.</b> <span class="muted small">Source: ${esc(b.s)}</span></p><button class="btn big block" id="hn" style="margin-top:8px">Next</button>`;
      $('#hn').onclick=()=>{ const nx=hlNext(QN[hl.b]); hl={...hl,...nx,done:0}; route(); }; }
    else { const s=hl.streak; Store.saveGame({id:'g_hl_'+hl.t,mode:'hl',t:hl.t,streak:s,pts:s,hits:s,n:s+1}); $('#hf').innerHTML=`<p style="margin:6px 0 0"><b>✗ Streak over at ${s}.</b>${s>=best&&s>0?' New best! 🎉':''} <span class="muted small">Source: ${esc(b.s)}</span></p><button class="btn big block" id="hr" style="margin-top:8px">Play again</button>`;
      $('#hr').onclick=()=>{ hl=null; route(); }; } };
};

/* ---- archive ---- */
routes.archive=v=>{ if(!P()) return lock(v,'Archive','Play any of the last 60 days of sets, and see that day’s crowd.');
  const n=bsDayNum(Store.today()); const rows=[]; for(let i=1;i<=60;i++){ const k=bsDayKey(n-i); rows.push(k); }
  v.innerHTML=`<p class="muted small" style="margin:0"><a href="#modes">‹ Modes</a></p><h2>Archive</h2><p class="muted" style="margin-top:0">Past daily sets. Archive games count toward your calibration, not the weekly board.</p><div class="card list">${rows.map(k=>{ const g=Store.game('g_daily_'+k)||Store.game('g_arch_'+k); const ids=bsDaily(BS_META,bsDayNum(k));
    return `<a class="it" href="${g?'#game/'+g.id:'#arch/'+k}"><span class="wh"><b>${esc(A().dayLabel(k))}</b><small>${ids.map(id=>A().CAT[A().QN[id].c]).join(' · ')}</small></span>${g?`<span class="pill acc">${g.pts}</span>`:'<span class="pill">Play</span>'}</a>`; }).join('')}</div>`; };
routes.arch=(v,k)=>{ if(!P()) return lock(v,'Archive','Play past days’ sets.'); const n=bsDayNum(k); if(!isFinite(n)||n>=bsDayNum(Store.today())){ location.hash='#archive'; return; } A().startSet('arch',k,bsDaily(BS_META,n)); };
})();
