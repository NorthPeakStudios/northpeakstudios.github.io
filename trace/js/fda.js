// Trace · FDA label info (openFDA drug label API, public). Shows what the official label lists; never dosing.
(function(){
const API='https://api.fda.gov/drug/label.json';
const clean=s=>String(s||'').replace(/^\s*(\d+(\.\d+)*\s*)?(BOXED WARNING|WARNINGS AND PRECAUTIONS|WARNINGS|WARNING:?|ADVERSE REACTIONS|DRUG ABUSE AND DEPENDENCE)\s*/i,'').replace(/\s+/g,' ').trim();
const cut=(s,n)=>{ s=clean(s); if(s.length<=n) return s; const i=s.lastIndexOf('. ',n); return s.slice(0,i>n*0.6?i+1:n)+' …'; };
async function lookup(name){
  const k='trc.fda2.'+Store.keyOf(name); try{ const c=JSON.parse(localStorage.getItem(k)||'null'); if(c&&Date.now()-c.at<7*864e5) return c.r; }catch(e){}
  const q=String(name).trim().replace(/["\\]/g,'').slice(0,60); if(!q) return null;
  const term=f=>f+':"'+q+'"';
  const url=API+'?search='+['openfda.generic_name','openfda.brand_name','openfda.substance_name'].map(term).map(encodeURIComponent).join('+')+'&limit=5';
  const r=await fetch(url,{credentials:'omit',cache:'no-store'}); let out=null;
  if(r.ok){ const j=await r.json(); const ql=q.toLowerCase().split(/[^a-z0-9]+/).join(' '); const nm=y=>{ const o=y.openfda||{}; const qq=ql.trim(); return [...(o.generic_name||[]),...((o.substance_name||[]).length===1?o.substance_name:[]),...(o.brand_name||[])].some(s=>{ s=s.toLowerCase().split(/[^a-z0-9]+/).join(' ').trim(); return s===qq||s.startsWith(qq+' '); }); }; const x=(j.results||[]).find(nm); if(x){ const o=x.openfda||{};
    out={brand:(o.brand_name||[])[0]||'',generic:(o.generic_name||[])[0]||'',set:x.set_id||'',date:x.effective_time||'',boxed:(x.boxed_warning||[])[0]||'',adverse:(x.adverse_reactions||[])[0]||'',warn:(x.warnings_and_cautions||x.warnings||[])[0]||'',dep:(x.drug_abuse_and_dependence||[])[0]||'',patient:(x.information_for_patients||[])[0]||''}; } }
  else if(r.status!==404) throw new Error('fda_'+r.status);
  try{ localStorage.setItem(k,JSON.stringify({at:Date.now(),r:out})); }catch(e){}
  return out;
}
const dm=x=>x.set?'https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid='+encodeURIComponent(x.set):'https://dailymed.nlm.nih.gov/dailymed/';
const dd=s=>s&&s.length===8?s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6):'';
function cite(x){ return `<p class="muted small">Source: the FDA drug label (openFDA)${x.brand||x.generic?' for '+esc(x.brand||x.generic):''}${dd(x.date)?', label dated '+dd(x.date):''}. <a href="${dm(x)}" target="_blank" rel="noopener">Read the full label on DailyMed ↗</a></p>`; }
window.TrcFDA={lookup,cut,cite,dm};
routes.sub=async(v,name)=>{
  name=name||''; const mine=Store.entries().filter(x=>Store.keyOf(x.what)===Store.keyOf(name));
  v.innerHTML=`<p><a href="javascript:history.back()">‹ Back</a></p><h2>${esc(name)}</h2>
   <div class="stat"><div><b>${mine.length}</b><span>times logged</span></div><div><b>${new Set(mine.map(x=>Store.dayKey(x.t))).size}</b><span>days</span></div><div><b>${mine.length?esc(fmtD(mine[mine.length-1].t).replace(/^\w+, /,'')):'–'}</b><span>first log</span></div></div>
   <p class="center" style="margin:10px 0"><a class="btn ghost sm" href="#fx/${encodeURIComponent(Store.keyOf(name))}">Effects in my logs${P()?'':' 🔒'}</a> <a class="btn ghost sm" href="#forecast/${encodeURIComponent(Store.keyOf(name))}">Forecast${P()?'':' 🔒'}</a></p>
   <p class="center" style="margin:0 0 10px"><a class="btn ghost sm" href="#mix/${encodeURIComponent(Store.keyOf(name))}">Check interactions</a> <a class="btn ghost sm" href="#refill">Refill countdown</a></p>
   <h3>What the FDA label says</h3><div class="card" id="fd"><p class="muted">Looking it up…</p></div>`;
  try{ const x=await lookup(name); const box=$('#fd'); if(!box) return;
    if(!x){ box.innerHTML=`<p style="margin-top:0">No FDA drug label matched “${esc(name)}”.</p><p class="muted small">Supplements, caffeine, foods and many non-prescription things don’t have one. Try the generic name (like “sertraline” instead of a brand), or search <a href="https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=${encodeURIComponent(name)}" target="_blank" rel="noopener">DailyMed ↗</a>.</p>`; return; }
    box.innerHTML=`${x.boxed?`<div class="note warn"><b>Boxed warning</b> (the FDA’s strongest): ${esc(cut(x.boxed,420))}</div>`:''}
     ${x.adverse?`<p style="margin-top:0"><b>Side effects the label lists</b></p><p class="fda">${esc(cut(x.adverse,900))}</p>`:''}
     ${x.warn?`<details class="fold"><summary>Warnings</summary><p class="fda">${esc(cut(x.warn,900))}</p></details>`:''}
     ${x.dep?`<details class="fold"><summary>Dependence & long-term use</summary><p class="fda">${esc(cut(x.dep,700))}</p></details>`:''}
     ${cite(x)}<p class="muted small">Quoted from the label, shortened. Trace doesn’t add dosing information; ask a pharmacist about amounts.</p>`;
  }catch(e){ const box=$('#fd'); if(box) box.innerHTML=`<p class="muted">Couldn’t reach the FDA database right now (${navigator.onLine?'it may be busy':'you’re offline'}). <button class="lnk" id="fr">Try again</button></p>`; const fr=$('#fr'); if(fr) fr.onclick=()=>route(); }
};
})();
