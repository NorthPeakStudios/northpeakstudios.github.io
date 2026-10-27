// Stash · files: CSV export/import (all entries or business sales), JSON backup/restore.
(function(){
function save(name,text,type){ const blob=new Blob([text],{type:type||'text/plain'}); const f=new File([blob],name,{type:blob.type});
  if(navigator.canShare&&navigator.canShare({files:[f]})&&/iPhone|iPad|Android/i.test(navigator.userAgent)){ navigator.share({files:[f],title:name}).catch(()=>{}); return; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); toast('Saved '+name); }
function pick(accept,cb){ const i=document.createElement('input'); i.type='file'; i.accept=accept; i.onchange=()=>{ const f=i.files&&i.files[0]; if(!f) return; if(f.size>5e6) return toast('That file is too big (5 MB max)'); const r=new FileReader(); r.onload=()=>cb(String(r.result||''),f.name); r.readAsText(f); }; i.click(); }
window.StsFile={save,pick};
const cell=v=>{ let s=String(v==null?'':v); if(/^[=+\-@\t\r]/.test(s)) s="'"+s; return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
const HEAD=['date','type','amount','category','note','product','qty','recurring'];
function toCSV(list){ const rows=[HEAD.join(',')]; for(const x of list){ const pr=x.pid?Store.product(x.pid):null; rows.push([ymd(x.t),x.k==='in'?'income':'spending',(x.a/100).toFixed(2),Store.catInfo(x.k,x.c).name,x.n||'',pr?pr.name:'',x.q||'',x.rid?'yes':''].map(cell).join(',')); } return rows.join('\n'); }
function parseCSV(text){ const rows=[]; let row=[], f='', q=false; text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){ const ch=text[i]; if(q){ if(ch==='"'){ if(text[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=ch; continue; }
    if(ch==='"') q=true; else if(ch===','||ch===';'&&!text.includes(',')) { row.push(f); f=''; } else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[i+1]==='\n') i++; row.push(f); rows.push(row); row=[]; f=''; } else f+=ch; }
  if(f!==''||row.length){ row.push(f); rows.push(row); } return rows.filter(r=>r.some(c=>String(c).trim()!=='')); }
function findCat(k,name){ name=String(name||'').trim(); if(!name) return k==='in'?'other':'other'; const l=name.replace(/^'/,'').toLowerCase(); const hit=Store.cats(k).find(c=>c.name.toLowerCase()===l||c.key===l); if(hit) return hit.key;
  const kw=k==='in'?[['sale','sales'],['pro','sales'],['allow','allowance'],['gift','gift'],['birthday','gift'],['job','job'],['work','job'],['mow','job'],['babysit','job']]:[['food','food'],['eat','food'],['lunch','food'],['game','fun'],['fun','fun'],['shop','shopping'],['cloth','shopping'],['bus','transport'],['uber','transport'],['gas','transport'],['tech','tech'],['domain','tech'],['app','business'],['business','business'],['sub','subs'],['school','school'],['book','school']];
  for(const [w,key] of kw) if(l.includes(w)) return key; return Store.addCat(k,name); }
/* accepts Stash's own CSV, or any sheet with date + amount (+ type/category/note/description) columns. Negative amounts = spending. */
function importCSV(text){ const rows=parseCSV(text); if(rows.length<2) return {added:0,skipped:0,err:'No rows found'};
  const h=rows[0].map(x=>String(x).trim().toLowerCase()); const col=(...n)=>h.findIndex(x=>n.some(y=>x===y||x.includes(y)));
  const iD=col('date','day','when'), iA=col('amount','price','total','value','charge'), iT=col('type','kind','direction'), iC=col('category','source','cat'), iN=col('note','description','memo','name','details'), iP=col('product','item'), iQ=col('qty','quantity','units');
  if(iD<0||iA<0) return {added:0,skipped:rows.length-1,err:'The first row needs “date” and “amount” columns'};
  const have=new Set(Store.txs().map(x=>ymd(x.t)+'|'+x.k+'|'+x.a+'|'+(x.n||''))); const add=[]; let skipped=0;
  for(const r of rows.slice(1)){ const ds=String(r[iD]||'').trim(); let t=fromYmd(ds); if(!isFinite(t)){ const p=Date.parse(ds); t=isFinite(p)?p:NaN; } if(isFinite(t)&&!/\d{1,2}:\d{2}/.test(ds)){ const z=new Date(t); z.setHours(12,0,0,0); t=z.getTime(); }
    let a=parseMoney(r[iA]); if(!isFinite(t)||!isFinite(a)||a===0){ skipped++; continue; }
    const ty=iT>=0?String(r[iT]||'').toLowerCase():''; let k=/inc|earn|in$|^in|credit|sale|deposit/.test(ty)?'in':/spen|out|exp|debit|cost|purchase/.test(ty)?'out':(a<0?'out':'in'); a=Math.abs(a);
    const n=iN>=0?String(r[iN]||'').trim().replace(/^'/,'').slice(0,120):''; const x={_p:'t_',k,a,c:findCat(k,iC>=0?r[iC]:''),n,t};
    if(iP>=0&&String(r[iP]||'').trim()&&k==='in'){ const pn=String(r[iP]).trim().replace(/^'/,''); let pr=Store.products().find(p=>p.name.toLowerCase()===pn.toLowerCase()); if(!pr) pr=Store.save({name:pn.slice(0,40),price:a,emoji:'📦'},'p_'); x.pid=pr.id; x.q=Math.max(1,parseInt(iQ>=0?r[iQ]:1,10)||1); x.c='sales'; }
    const key=ymd(t)+'|'+k+'|'+a+'|'+n; if(have.has(key)){ skipped++; continue; } have.add(key); add.push(x); }
  if(add.length) Store.bulk(add); return {added:add.length,skipped}; }
window.StsCSV={toCSV,importCSV,parseCSV};
routes.data=v=>{ const n=Store.txs().length;
  v.innerHTML=`<p><a href="#more">‹ More</a></p><h2>Export &amp; import</h2>
   <div class="card"><h3>Export</h3><p class="muted small" style="margin-top:0">${n} entries. CSV opens in Numbers, Excel or Google Sheets.</p>
    <button class="btn block" id="ecsv">⬇️ All entries (.csv)</button><button class="btn ghost block" id="ejson">⬇️ Full backup (.json)</button></div>
   <div class="card"><h3>Import</h3><p class="muted small" style="margin-top:0">A CSV with <b>date</b> and <b>amount</b> columns (type, category, note, product, qty are optional; a minus sign means spending). Rows you already have are skipped. Or restore a Stash backup.</p>
    <button class="btn block" id="icsv">⬆️ Import CSV</button><button class="btn ghost block" id="ijson">⬆️ Restore backup (.json)</button><p id="imsg" class="muted"></p></div>
   <div class="card"><h3>Data on this phone</h3><p class="muted small" style="margin-top:0">${(Store.bytes()/1024).toFixed(1)} KB. </p><button class="btn ghost block" id="demo">Remove sample data</button><button class="btn danger block" id="wipe">Erase everything on this phone</button></div>`;
  $('#ecsv').onclick=()=>save('stash-'+ymd(Date.now())+'.csv',toCSV(Store.txs()),'text/csv');
  $('#ejson').onclick=()=>save('stash-backup-'+ymd(Date.now())+'.json',JSON.stringify({app:'stash',v:1,at:new Date().toISOString(),data:Store.dump()},null,1),'application/json');
  $('#icsv').onclick=()=>pick('.csv,text/csv,text/plain',t=>{ const r=importCSV(t); $('#imsg').textContent=r.err?r.err:'Imported '+r.added+' · skipped '+r.skipped+' (already here or unreadable)'; toast(r.err||('Imported '+r.added)); });
  $('#ijson').onclick=()=>pick('.json,application/json',t=>{ let j; try{ j=JSON.parse(t); }catch(e){ return $('#imsg').textContent='That isn’t a Stash backup.'; } const d=j&&j.data; if(!d||j.app!=='stash') return $('#imsg').textContent='That isn’t a Stash backup.';
    const list=[]; for(const b of ['t','g','s','pr','r']) for(const x of Object.values(d[b]||{})) if(x&&x.id&&!Store[b==='t'?'tx':b==='g'?'goal':b==='s'?'sub':b==='pr'?'product':'rule'](x.id)) list.push(x); if(list.length) Store.bulk(list); $('#imsg').textContent='Restored '+list.length+' items (items already here kept).'; });
  $('#demo').onclick=()=>{ const ids=[...Store.txs(),...Store.goals(),...Store.products()].filter(x=>x.demo).map(x=>x.id); ids.forEach(id=>Store.del(id)); toast('Removed '+ids.length+' sample items'); route(); };
  $('#wipe').onclick=()=>{ if(!confirm('Erase every entry, goal, subscription and product on this phone'+(window.Cloud&&Cloud.signedIn()?' and in your synced copy':'')+'? This can’t be undone.')) return; const k=Store.wipe(); toast('Erased '+k+' items'); route(); };
};
})();
