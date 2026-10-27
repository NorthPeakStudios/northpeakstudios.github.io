// Stash · More, settings, privacy, help, about, and the 🔍 search + commands.
(function(){
const VER='1.0';
routes.more=v=>{ const s=window.Cloud&&Cloud.signedIn();
  const row=(h,ic,t,sub,pro)=>`<a class="it" href="${h}"><span class="cic">${ic}</span><span class="wh"><b>${t}</b><small>${sub}</small></span>${pro&&!P()?'<span class="pill">🔒 Pro</span>':''}</a>`;
  v.innerHTML=`<h2>More</h2><div class="card list">
   ${row('#account','👤',s?'Account':'Sign in','One Northpeak login for every app')}${row('#pro','⭐',P()?'You have Pro':'Stash Pro · $35','Business, unlimited goals, simulator, subscriptions, sync')}</div>
   <div class="card list">${row('#insights','📊','Insights','Month vs last month, top categories, savings rate, streak')}${row('#subs','🔁','Subscriptions','Renewals, reminders, yearly total',1)}${row('#afford','🤔','Can I afford it?','What a purchase does to your goals',1)}${row('#biz','📦','Business mode','Sales per product, revenue, best seller',1)}${row('#recur','🗓️','Recurring entries','Allowance, weekly jobs, regular costs')}</div>
   <div class="card list">${row('#data','⬇️','Export & import','CSV, backup, restore, erase')}${row('#settings','⚙️','Settings','Currency, categories')}${row('#privacy','🔐','Privacy','What stays on your phone')}${row('#help','❓','Help & commands','Everything you can type in 🔍')}${row('#about','ℹ️','About Stash','Version '+VER)}</div>`;
};
routes.settings=v=>{ const p=Store.prefs(); const cu=(p.cats||[]);
  v.innerHTML=`<p><a href="#more">‹ More</a></p><h2>Settings</h2><div class="card"><label>Currency symbol</label><div class="chips" id="cu">${['$','€','£','¥','₹','C$','A$'].map(c=>`<button type="button" class="chip ${cur()===c?'on':''}" data-c="${c}">${c}</button>`).join('')}</div></div>
   <div class="card"><h3>Your categories</h3>${cu.length?`<div class="list">${cu.map((c,i)=>`<div class="it"><span class="cic">${esc(c.ic)}</span><span class="wh"><b>${esc(c.name)}</b><small>${c.k==='in'?'income source':'spending'}</small></span><button class="btn ghost sm" data-dc="${i}" aria-label="Remove ${esc(c.name)}">✕</button></div>`).join('')}</div>`:'<p class="muted small" style="margin:0">Add your own with “+ new” when you log something.</p>'}</div>
   <div class="card"><label class="ck"><input type="checkbox" id="hb" ${p.hide?'checked':''}> Hide amounts on Home until I tap (for when people look over your shoulder)</label></div>`;
  $('#cu').addEventListener('click',e=>{ const b=e.target.closest('.chip'); if(!b) return; Store.savePrefs({cur:b.dataset.c}); route(); });
  v.addEventListener('click',e=>{ const d=e.target.closest('[data-dc]'); if(!d) return; const l=cu.slice(); l.splice(+d.dataset.dc,1); Store.savePrefs({cats:l}); route(); });
  $('#hb').onchange=e=>{ Store.savePrefs({hide:e.target.checked}); toast('Saved'); };
};
routes.privacy=v=>{ const s=window.Cloud&&Cloud.signedIn();
  v.innerHTML=`<p><a href="#more">‹ More</a></p><h2>Privacy</h2>
   <div class="card"><h3>🔒 Local by default</h3><p style="margin:0">Everything you log lives on this phone. No account is needed, nothing is sent anywhere, and Stash has no ads or trackers.</p></div>
   <div class="card"><h3>☁️ Optional encrypted sync</h3><p style="margin:0">Signed in with Pro, each entry is encrypted on your phone (AES-256, key made from your password) before it’s sent. The server stores scrambled records it can’t read. If you forget your password, the synced copy can’t be unlocked — your phone’s copy is still there.</p>
    <p class="muted small">Status: ${s?(P()?'signed in, syncing encrypted':'signed in — sync turns on with Pro'):'not signed in, nothing leaves this phone'}.</p></div>
   <div class="card"><h3>🧾 What the server sees</h3><p style="margin:0" class="muted">Your email, a login check (not your password), the number and size of encrypted records, and Pro requests you send (name + Apple Cash contact).</p></div>
   <a class="btn ghost block" href="#data">Export or erase your data</a>`;
};
routes.about=v=>{ v.innerHTML=`<p><a href="#more">‹ More</a></p><div class="center"><img src="icon-192.png" width="84" height="84" alt="" style="border-radius:20px"><h2 style="margin-bottom:0">Stash</h2><p class="muted" style="margin-top:2px">Version ${VER} · Northpeak Studios</p></div>
   <div class="card"><p style="margin-top:0">A money app for people who make their own money: track what you earn and spend, save toward goals, see if you can afford something before you buy it, keep subscriptions in check, and run your side business.</p>
   <h3>New in 1.0</h3><ul class="tight"><li>Income + spending log with categories, sources, one-tap quick add and recurring entries</li><li>Savings goals with progress rings and a weekly plan</li><li>“Can I afford it?” — effect on every goal + days of earnings</li><li>Subscriptions: renewals, Calendar reminders, yearly total</li><li>Business mode: sales per product, revenue by month, best seller, CSV</li><li>Insights: month vs last month, top categories, savings rate, no-spend streak</li><li>Local by default, optional encrypted sync</li></ul></div>
   <p class="muted small center">Stash is a tracker, not a bank, and not financial advice.</p><p class="center"><a href="https://northpeakstudios.github.io/">More Northpeak apps</a></p>`; };
/* ---------- 🔍 search + commands ---------- */
const go=h=>()=>{ location.hash=h; };
const CMDS=[
 ['Add income','earned money in plus',()=>openTx(null,{k:'in'})],['Add spending','spent buy expense minus',()=>openTx(null,{k:'out'})],
 ['Add allowance','income',()=>openTx(null,{k:'in',c:'allowance',n:'Allowance'})],['Add a gift (money in)','birthday',()=>openTx(null,{k:'in',c:'gift'})],['Add job income','work paid',()=>openTx(null,{k:'in',c:'job'})],['Add app sale','sales income',()=>openTx(null,{k:'in',c:'sales'})],
 ['Add food spending','lunch snack',()=>openTx(null,{k:'out',c:'food'})],['Add fun spending','games',()=>openTx(null,{k:'out',c:'fun'})],
 ['New recurring entry','repeat weekly monthly',()=>openTx(null,{k:'in',c:'allowance'})],['Recurring entries','repeat',go('#recur')],
 ['Home','dashboard',go('#home')],['Log — this month','history list',go('#log')],['Log — earned only','income',()=>{ location.hash='#log/'+Store.monKey(Date.now())+'/in'; }],['Log — spent only','spending',()=>{ location.hash='#log/'+Store.monKey(Date.now())+'/out'; }],['Log — last month','previous',()=>{ location.hash='#log/'+addMon(Store.monKey(Date.now()),-1); }],
 ['Goals','savings',go('#goals')],['New savings goal','goal save',()=>{ location.hash='#goals'; setTimeout(()=>$('#gadd')&&$('#gadd').click(),50); }],['Can I afford it?','simulator afford buy',go('#afford'),1],
 ['Subscriptions','subs renewals',go('#subs'),1],['Add a subscription','sub',()=>{ if(!P()) return StsUpsell('Subscriptions'); StsSubOpen(); },1],['Renewal reminders to Calendar','ics calendar',()=>{ if(!P()) return StsUpsell('Subscriptions'); StsFile.save('stash-renewals.ics',StsIcs(),'text/calendar'); },1],
 ['Business mode','sales revenue',go('#biz'),1],['Record a sale','sell product',()=>{ if(!P()) return StsUpsell('Business mode'); StsBiz.openSale(); },1],['New product','business',()=>{ if(!P()) return StsUpsell('Business mode'); StsBiz.openProduct(); },1],['Best seller','business top product',go('#biz'),1],['Revenue — last 2 years','chart',go('#biz/24'),1],
 ['Insights','stats charts',go('#insights')],['Savings rate','insights',go('#insights')],['No-spend streak','streak',go('#insights')],['Top categories','where my money goes',go('#insights')],['Insights — last month','previous',()=>{ location.hash='#insights/'+addMon(Store.monKey(Date.now()),-1); }],
 ['Export CSV','download spreadsheet',()=>StsFile.save('stash-'+ymd(Date.now())+'.csv',StsCSV.toCSV(Store.txs()),'text/csv')],['Import CSV','upload spreadsheet',go('#data')],['Backup (.json)','export',go('#data')],['Erase data on this phone','wipe delete',go('#data')],
 ['Account','sign in login',go('#account')],['Sync now','cloud',()=>{ window.StsSync&&StsSync(); toast(P()?'Syncing…':'Sync is part of Pro'); }],['Redeem a code','owner bot all-access',go('#account')],['Get Pro','upgrade',go('#pro')],
 ['Settings','currency',go('#settings')],['Privacy','encrypted',go('#privacy')],['Help & commands','how',go('#help')],['About Stash','version',go('#about')],['Try sample data','demo',()=>{ if(Store.txs().length&&!confirm('Add sample data next to your own?')) return; sampleData(); toast('Sample data added'); location.hash='#home'; route(); }]
];
function score(q,s){ s=s.toLowerCase(); if(s.startsWith(q)) return 3; if(s.includes(' '+q)) return 2; if(s.includes(q)) return 1; return 0; }
function palette(){ sheet(`<input id="q" placeholder="Search entries or type a command…" autocomplete="off" autocapitalize="none" aria-label="Search"><div id="qr" class="list"></div>`,root=>{
  const q=root.querySelector('#q'), out=root.querySelector('#qr'); let acts=[];
  const draw=()=>{ const t=q.value.trim().toLowerCase().replace(/^\//,''); acts=[];
    const cm=CMDS.map((c,i)=>({c,i,s:t?Math.max(score(t,c[0])*2,score(t,c[1])):1})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,t?12:16);
    let h=cm.length?'<div class="dh">Commands</div>'+cm.map(x=>{ acts.push(x.c[2]); return `<a class="it" href="#" data-a="${acts.length-1}"><span class="cic">›</span><span class="wh"><b>${esc(x.c[0])}</b></span>${x.c[3]&&!P()?'<span class="pill">Pro</span>':''}</a>`; }).join(''):'';
    if(t&&!q.value.startsWith('/')){ const tx=Store.txs().filter(x=>((x.n||'')+' '+Store.catInfo(x.k,x.c).name+' '+(x.a/100)).toLowerCase().includes(t)).slice(0,20); if(tx.length) h+='<div class="dh">Entries</div>'+tx.map(txRow).join('');
      const gs=Store.goals().filter(g=>g.name.toLowerCase().includes(t)); if(gs.length) h+='<div class="dh">Goals</div>'+gs.map(g=>`<a class="it" href="#goal/${esc(g.id)}" data-close="1"><span class="cic">${esc(g.emoji||'🎯')}</span><span class="wh"><b>${esc(g.name)}</b></span></a>`).join('');
      const m=/^\$?(\d+(?:\.\d{1,2})?)$/.exec(t); if(m){ acts.push(()=>{ location.hash='#afford/'+m[1]; }); h='<a class="it" href="#" data-a="'+(acts.length-1)+'"><span class="cic">🤔</span><span class="wh"><b>Can I afford '+esc(cur()+m[1])+'?</b></span></a>'+h; } }
    out.innerHTML=h||'<p class="muted">Nothing matches.</p>'; };
  q.addEventListener('input',draw); out.addEventListener('click',e=>{ const a=e.target.closest('[data-a]'); if(!a) return; e.preventDefault(); closeSheet(); acts[+a.dataset.a](); });
  q.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const f=out.querySelector('[data-a],[data-tx],a[href^="#goal"]'); if(f) f.click(); } });
  draw(); setTimeout(()=>q.focus(),60); }); }
document.addEventListener('click',e=>{ if(e.target.closest('[data-pal]')){ e.preventDefault(); palette(); } });
document.addEventListener('keydown',e=>{ if((e.key==='k'&&(e.metaKey||e.ctrlKey))||(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||''))){ e.preventDefault(); palette(); } });
routes.help=v=>{ v.innerHTML=`<p><a href="#more">‹ More</a></p><h2>Help &amp; commands</h2>
  <div class="card"><h3>Quick start</h3><ol class="tight"><li>Tap <b>＋ Earned</b> or <b>− Spent</b> (or a quick-add chip) every time money moves.</li><li>Make a goal — Stash tells you what to put away each week.</li><li>Before you buy something, type its price in 🔍 or open <b>Can I afford it?</b></li><li>Selling something? Business mode tracks every product.</li></ol></div>
  <div class="card"><h3>🔍 Search &amp; commands</h3><p class="muted small" style="margin-top:0">Tap 🔍 (or press / or ⌘K). Type a price like <b>45</b> to check if you can afford it, a word to find entries, or a command:</p><div class="list">${CMDS.map(c=>`<div class="it"><span class="cic">›</span><span class="wh"><b>${esc(c[0])}</b>${c[3]?'<small>Pro</small>':''}</span></div>`).join('')}</div></div>`; };
window.StsCmd={count:()=>CMDS.length,palette};
})();
