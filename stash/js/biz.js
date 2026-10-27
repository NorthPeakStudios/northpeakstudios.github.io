// Stash · Business mode (Pro): products, sales per product, revenue by month, best seller, costs → profit, CSV in/out.
(function(){
const NP=[['Synapse Pro',3500,'🧠'],['Axon Pro',3500,'📝'],['Liminal Pro',3500,'🌙'],['Cadence Pro',3500,'🎼'],['Mindprint Pro',1000,'🧬'],['Trace Pro',3500,'📈'],['Stash Pro',3500,'💰'],['Northpeak All-Access',10000,'⭐']];
function sales(){ return Store.txs().filter(x=>x.k==='in'&&x.pid); }
function stats(){ const by={}; for(const p of Store.products()) by[p.id]={p,units:0,rev:0,last:0}; for(const x of sales()){ const b=by[x.pid]; if(!b) continue; b.units+=x.q||1; b.rev+=x.a; b.last=Math.max(b.last,x.t); } return Object.values(by).sort((a,b)=>b.rev-a.rev||b.units-a.units); }
function months(n){ const out=[]; let k=Store.monKey(Date.now()); for(let i=0;i<n;i++){ out.unshift(k); k=addMon(k,-1); } return out; }
function series(n){ const ms=months(n); const rev={}, cost={}; ms.forEach(k=>{ rev[k]=0; cost[k]=0; }); for(const x of Store.txs()){ const k=Store.monKey(x.t); if(!(k in rev)) continue; if(x.k==='in'&&(x.pid||x.c==='sales')) rev[k]+=x.a; if(x.k==='out'&&x.c==='business') cost[k]+=x.a; } return ms.map(k=>({k,rev:rev[k],cost:cost[k]})); }
function chart(rows){ const W=340,H=150,pad=40, max=Math.max(1,...rows.map(r=>Math.max(r.rev,r.cost))); const bw=(W-pad)/rows.length;
  return `<svg class="chart" viewBox="0 0 ${W} ${H+20}" role="img" aria-label="Revenue by month">${[0.5,1].map(f=>`<line x1="${pad}" x2="${W}" y1="${H-(H-10)*f}" y2="${H-(H-10)*f}" stroke="#222a35"/><text x="0" y="${H-(H-10)*f+4}" class="ax">${money(max*f/1,{round:true}).replace('.00','')}</text>`).join('')}
   ${rows.map((r,i)=>{ const x=pad+i*bw, h=(H-10)*r.rev/max, hc=(H-10)*r.cost/max; return `<rect x="${(x+bw*0.14).toFixed(1)}" y="${(H-h).toFixed(1)}" width="${(bw*0.5).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="var(--acc)"><title>${monName(r.k)} ${money(r.rev)}</title></rect>${hc?`<rect x="${(x+bw*0.66).toFixed(1)}" y="${(H-hc).toFixed(1)}" width="${(bw*0.22).toFixed(1)}" height="${hc.toFixed(1)}" rx="2" fill="#f87171"/>`:''}<text x="${(x+bw*0.4).toFixed(1)}" y="${H+14}" class="ax" text-anchor="middle">${monName(r.k).slice(0,1)}</text>`; }).join('')}</svg>`; }
window.StsChart=chart;
function openProduct(id){ const p=id?Store.product(id):null; const o=Object.assign({name:'',price:0,emoji:'📦'},p||{});
  sheet(`<h3>${p?'Edit product':'New product'}</h3><label>Name</label><input id="pn" maxlength="40" value="${esc(o.name)}" placeholder="e.g. Synapse Pro"><div class="row"><div><label>Price (${esc(cur())})</label><input id="pp" inputmode="decimal" value="${o.price?(o.price/100):''}" placeholder="35"></div><div><label>Icon</label><input id="pe" maxlength="4" value="${esc(o.emoji)}"></div></div>
   <button class="btn big block" id="psave">${p?'Save':'Add product'}</button>${p?'<button class="btn danger block" id="pdel">Delete product</button>':''}`,root=>{
    root.querySelector('#psave').onclick=()=>{ const name=root.querySelector('#pn').value.trim(), price=parseMoney(root.querySelector('#pp').value); if(!name) return toast('Name it'); if(!(price>=0)) return toast('Add a price');
      Store.save(Object.assign(p||{},{name,price,emoji:root.querySelector('#pe').value.trim()||'📦'}),'p_'); closeSheet(); route(); };
    const d=root.querySelector('#pdel'); if(d) d.onclick=()=>{ if(!confirm('Delete '+p.name+'? Its sales stay in your log.')) return; Store.del(p.id); closeSheet(); route(); };
  }); }
function openSale(pid){ const ps=Store.products(); if(!ps.length) return openProduct(); let sel=pid||ps[0].id;
  sheet(`<h3>Record a sale</h3><div class="chips" id="sp">${ps.map(p=>`<button type="button" class="chip ${p.id===sel?'on':''}" data-p="${esc(p.id)}">${esc(p.emoji||'📦')} ${esc(p.name)}</button>`).join('')}</div>
   <div class="row"><div><label>How many</label><input id="sq" type="number" min="1" max="999" value="1" inputmode="numeric"></div><div><label>Price each (${esc(cur())})</label><input id="sa" inputmode="decimal"></div></div>
   <label>Buyer / note (optional)</label><input id="sn" maxlength="80" placeholder="e.g. Jake, Apple Cash"><label>Date</label><input id="sd" type="date" value="${ymd(Date.now())}">
   <p class="muted" id="stot"></p><button class="btn big block" id="ssave">Add sale</button>`,root=>{
    const price=()=>root.querySelector('#sa'); const setP=()=>{ const p=Store.product(sel); price().value=p?(p.price/100):''; tot(); };
    const tot=()=>{ const q=Math.max(1,parseInt(root.querySelector('#sq').value,10)||1), a=parseMoney(price().value)||0; root.querySelector('#stot').textContent='Total '+money(a*q); };
    root.querySelector('#sp').addEventListener('click',e=>{ const b=e.target.closest('.chip'); if(!b) return; sel=b.dataset.p; root.querySelectorAll('#sp .chip').forEach(z=>z.classList.toggle('on',z===b)); setP(); });
    root.querySelector('#sq').addEventListener('input',tot); price().addEventListener('input',tot); setP();
    root.querySelector('#ssave').onclick=()=>{ const q=Math.max(1,Math.min(999,parseInt(root.querySelector('#sq').value,10)||1)), a=parseMoney(price().value); if(!(a>0)) return toast('Add the price'); const d=fromYmd(root.querySelector('#sd').value);
      const p=Store.product(sel); Store.save({k:'in',a:a*q,c:'sales',pid:sel,q,n:root.querySelector('#sn').value.trim()?p.name+' — '+root.querySelector('#sn').value.trim():'',t:isFinite(d)?d:Date.now()},'t_'); closeSheet(); toast('Sale added 💸 '+money(a*q)); route(); };
  }); }
routes.biz=(v,range)=>{ if(!P()){ StsPro.locked(v,'Business mode','Track sales for each thing you sell (like Pro sales for each app), revenue by month, your best seller, costs and profit — with CSV in and out.'); return; }
  const n=range==='24'?24:range==='6'?6:12; const st=stats(), rows=series(n), best=st.find(s=>s.rev>0);
  const mk=Store.monKey(Date.now()), cm=rows[rows.length-1], lm=rows[rows.length-2]||{rev:0,cost:0}; const totRev=rows.reduce((s,r)=>s+r.rev,0), totCost=rows.reduce((s,r)=>s+r.cost,0);
  const ch=lm.rev?Math.round((cm.rev-lm.rev)/lm.rev*100):null;
  v.innerHTML=`<div class="hrow" style="margin-top:4px"><h2 style="margin:0">Business</h2><button class="btn sm" id="bsale">＋ Sale</button></div>
   <div class="card"><div class="stat3"><div><small>${esc(monName(mk))} revenue</small><b class="in">${money(cm.rev)}</b>${ch!=null?`<small class="${ch>=0?'in':'out'}">${ch>=0?'▲':'▼'} ${Math.abs(ch)}%</small>`:''}</div><div><small>${n} mo revenue</small><b>${money(totRev,{round:true})}</b></div><div><small>${n} mo profit</small><b class="${totRev-totCost<0?'out':''}">${money(totRev-totCost,{round:true})}</b></div></div></div>
   <div class="card"><div class="hrow" style="margin:0 0 6px"><h3 style="margin:0">Revenue by month</h3><div class="seg mini">${[['6','6m'],['12','1y'],['24','2y']].map(([k,l])=>`<a href="#biz/${k}" class="${+k===n?'on':''}">${l}</a>`).join('')}</div></div>${chart(rows)}<p class="muted small" style="margin:4px 0 0"><span class="dotk" style="background:var(--acc)"></span>sales <span class="dotk" style="background:#f87171"></span>business costs</p></div>
   ${best?`<div class="card best"><span class="cic">🏆</span><div><small class="muted">Best seller</small><b>${esc(best.p.emoji||'')} ${esc(best.p.name)}</b><div class="muted small">${best.units} sold · ${money(best.rev)} · ${totRev?Math.round(best.rev/sales().reduce((s,x)=>s+x.a,0)*100):0}% of all sales</div></div></div>`:''}
   <div class="hrow"><h3>Products</h3><span><button class="icb" id="bnp">＋ Northpeak apps</button> <button class="icb" id="bprod">＋ Product</button></span></div>
   <div class="card list">${st.length?st.map(s=>`<div class="it"><span class="cic">${esc(s.p.emoji||'📦')}</span><span class="wh" data-prod="${esc(s.p.id)}"><b>${esc(s.p.name)}</b><small>${money(s.p.price)} · ${s.units} sold${s.last?' · last '+fmtDs(s.last):''}</small></span><b class="in">${money(s.rev,{round:true})}</b><button class="btn ghost sm" data-sell="${esc(s.p.id)}" aria-label="Record a sale of ${esc(s.p.name)}">＋1</button></div>`).join(''):'<p class="muted" style="margin:4px">Add what you sell. Tap “＋ Northpeak apps” to add every Northpeak Pro plan at its price.</p>'}</div>
   <div class="card"><h3>Sales CSV</h3><p class="muted small" style="margin-top:0">Export your sales, or import a sheet with date, amount and product columns (e.g. from your Pro requests sheet). Duplicates are skipped.</p><div class="row"><button class="btn ghost" id="bexp">⬇️ Export</button><button class="btn ghost" id="bimp">⬆️ Import</button></div><p id="bmsg" class="muted small"></p></div>
   <h3>Recent sales</h3><div class="card list">${sales().slice(0,8).map(txRow).join('')||'<p class="muted" style="margin:4px">No sales yet.</p>'}</div>`;
  $('#bsale').onclick=()=>openSale(); $('#bprod').onclick=()=>openProduct();
  $('#bnp').onclick=()=>{ const have=new Set(Store.products().map(p=>p.name.toLowerCase())); const add=NP.filter(x=>!have.has(x[0].toLowerCase())).map(([name,price,emoji])=>({_p:'p_',name,price,emoji})); if(!add.length) return toast('Already added'); Store.bulk(add); toast('Added '+add.length+' Northpeak products'); route(); };
  $('#bexp').onclick=()=>StsFile.save('stash-sales-'+ymd(Date.now())+'.csv',StsCSV.toCSV(sales()),'text/csv');
  $('#bimp').onclick=()=>StsFile.pick('.csv,text/csv,text/plain',t=>{ const r=StsCSV.importCSV(t); toast(r.err||('Imported '+r.added)); if(!r.err) route(); else $('#bmsg').textContent=r.err; });
  v.addEventListener('click',e=>{ const s=e.target.closest('[data-sell]'), p=e.target.closest('[data-prod]'); if(s) openSale(s.dataset.sell); else if(p) openProduct(p.dataset.prod); });
};
window.StsBiz={openSale,openProduct,stats};
})();
