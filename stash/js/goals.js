// Stash · savings goals (progress rings, per-week amount) and the “Can I afford it?” simulator.
(function(){
const COLS=['#5eead4','#a78bfa','#f472b6','#fbbf24','#60a5fa','#34d399','#fb923c'];
const EMO=['🎯','💻','🎮','🎧','🚲','📱','✈️','🎸','👟','🚗','📷','🎁'];
function openGoal(id){ const g=id?Store.goal(id):null; const o=Object.assign({name:'',emoji:'🎯',target:0,saved:0,due:'',col:COLS[Store.goals().length%COLS.length]},g||{});
  sheet(`<h3>${g?'Edit goal':'New savings goal'}</h3><label>What are you saving for?</label><input id="gn" maxlength="40" placeholder="e.g. New laptop" value="${esc(o.name)}">
   <label>Icon</label><div class="chips" id="ge">${EMO.map(e=>`<button type="button" class="chip ${e===o.emoji?'on':''}" data-e="${e}">${e}</button>`).join('')}</div>
   <div class="row"><div><label>Target (${esc(cur())})</label><input id="gt" inputmode="decimal" placeholder="900" value="${o.target?(o.target/100):''}"></div><div><label>Already saved</label><input id="gs" inputmode="decimal" placeholder="0" value="${o.saved?(o.saved/100):''}"></div></div>
   <label>Target date (optional)</label><input id="gd" type="date" value="${esc(o.due||'')}">
   <p class="muted small">With a date, Stash works out how much to put away each week.</p>
   <button class="btn big block" id="gsave">${g?'Save':'Create goal'}</button>${g?'<button class="btn danger block" id="gdel">Delete goal</button>':''}`,root=>{
    let em=o.emoji; root.querySelector('#ge').addEventListener('click',e=>{ const b=e.target.closest('.chip'); if(!b) return; em=b.dataset.e; root.querySelectorAll('#ge .chip').forEach(z=>z.classList.toggle('on',z===b)); });
    root.querySelector('#gsave').onclick=()=>{ const name=root.querySelector('#gn').value.trim(), t=parseMoney(root.querySelector('#gt').value), s=parseMoney(root.querySelector('#gs').value||'0');
      if(!name) return toast('Name your goal'); if(!(t>0)) return toast('Set a target amount');
      const x=Object.assign(g||{adds:[]},{name,emoji:em,target:t,saved:Math.max(0,s||0),due:root.querySelector('#gd').value||'',col:o.col}); if(!g&&x.saved) x.adds=[{t:Date.now(),a:x.saved}];
      Store.save(x,'g_'); closeSheet(); toast(g?'Saved':'Goal created 🎯'); location.hash='#goal/'+x.id; route(); };
    const d=root.querySelector('#gdel'); if(d) d.onclick=()=>{ if(!confirm('Delete this goal? (Your log is not touched.)')) return; Store.del(g.id); closeSheet(); location.hash='#goals'; };
  }); }
function canAdd(){ return P()||Store.goals().filter(g=>!g.done).length<1; }
routes.goals=v=>{ const gs=Store.goals(); const act=gs.filter(g=>!g.done), done=gs.filter(g=>g.done);
  v.innerHTML=`<div class="hrow" style="margin-top:4px"><h2 style="margin:0">Goals</h2><button class="btn sm" id="gadd">＋ New goal</button></div>
   <div class="card"><div class="stat3"><div><small>In goals</small><b>${money(Calc.inGoals())}</b></div><div><small>Free to spend</small><b>${money(Calc.available())}</b></div><div><small>You keep</small><b>${money(Calc.netWeek(),{round:true})}/wk</b></div></div></div>
   <a class="card it" href="#afford"><span class="cic">🤔</span><span class="wh"><b>Can I afford it?</b><small>See what a purchase does to each goal${P()?'':' · Pro'}</small></span><span class="pill ${P()?'acc':''}">${P()?'open':'🔒 Pro'}</span></a>
   ${act.length?act.map(card).join(''):'<div class="card"><p class="muted" style="margin:0">No goals yet. A laptop, a trip, a guitar, starting money for your next app…</p></div>'}
   ${done.length?`<h3 style="margin-top:18px">Reached 🎉</h3>${done.map(card).join('')}`:''}
   ${P()?'':'<p class="muted small center">Free: 1 goal at a time. <a href="#pro">Pro</a>: unlimited goals + the simulator.</p>'}`;
  $('#gadd').onclick=()=>{ if(!canAdd()) return upsell('More than one goal'); openGoal(); };
};
function card(g){ const pc=g.target?(g.saved||0)/g.target:0, n=Calc.goalNeed(g), pace=Calc.netWeek();
  const eta=!g.done&&n.left>0&&pace>0?Math.ceil(n.left/pace):null;
  return `<a class="card goal" href="#goal/${esc(g.id)}"><div class="gr">${ring(pc,84,g.col)}<span class="ge2">${esc(g.emoji||'🎯')}</span><span class="gp">${Math.round(pc*100)}%</span></div>
   <div class="gi"><b>${esc(g.name)}</b><div>${money(g.saved||0)} <span class="muted">of ${money(g.target)}</span></div>
   <small class="muted">${g.done?'Reached ✓':n.perWeek!=null?(n.late?'Date passed · '+money(n.left)+' left':money(n.perWeek)+'/week for '+n.weeks+' wk to hit '+fmtDs(fromYmd(g.due))):eta?'~'+eta+' wk at your pace':'Add a date to get a weekly amount'}</small></div></a>`; }
function upsell(what){ sheet(`<h3>🔒 ${esc(what)} is Pro</h3><p class="muted">Stash Pro adds unlimited goals, the “Can I afford it?” simulator, subscriptions, business mode and encrypted sync.</p><a class="btn big block" href="#pro" data-close="1">See Pro · $35</a>`); }
window.StsUpsell=upsell;
routes.goal=(v,id)=>{ const g=Store.goal(id); if(!g){ v.innerHTML='<p class="muted">That goal is gone. <a href="#goals">Goals</a></p>'; return; }
  const pc=g.target?(g.saved||0)/g.target:0, n=Calc.goalNeed(g), pace=Calc.netWeek(), pd=Calc.perDay();
  const adds=(g.adds||[]).slice().sort((a,b)=>b.t-a.t);
  v.innerHTML=`<p><a href="#goals">‹ Goals</a></p><div class="gbig">${ring(pc,150,g.col)}<span class="ge3">${esc(g.emoji||'🎯')}</span><b>${Math.round(pc*100)}%</b></div>
   <h2 class="center" style="margin-bottom:0">${esc(g.name)}</h2><p class="center muted" style="margin-top:2px">${money(g.saved||0)} of ${money(g.target)} · ${money(n.left)} to go</p>
   <div class="row"><button class="btn big" id="gin">＋ Add money</button><button class="btn big ghost" id="gout">− Take out</button></div>
   <div class="card"><h3>Plan</h3>${g.due?`<p style="margin:0">${n.late?'The date passed. ':''}To reach it by <b>${fmtD(fromYmd(g.due))}</b>: <b class="acc">${money(n.perWeek||0)} a week</b> for ${n.weeks} week${n.weeks>1?'s':''}${n.perWeek?' (≈ '+money(Math.ceil(n.perWeek/7))+' a day)':''}.</p>`:'<p style="margin:0" class="muted">No date set. <button class="lnk" id="gdate">Add a target date</button> to get a weekly amount.</p>'}
     ${pace>0&&n.left>0?`<p class="muted small">At what you keep now (${money(pace,{round:true})}/week) you’d get there in about <b>${Math.ceil(n.left/pace)} weeks</b>.</p>`:''}${pd>0&&n.left>0?`<p class="muted small">That’s ${(n.left/pd).toFixed(1)} days of your earnings.</p>`:''}</div>
   <div class="card list"><h3>History</h3>${adds.length?adds.map(a=>`<div class="it"><span class="cic">${a.a>0?'⬆️':'⬇️'}</span><span class="wh"><b>${a.a>0?'Added':'Took out'} ${money(Math.abs(a.a))}</b><small>${fmtD(a.t)}</small></span></div>`).join(''):'<p class="muted" style="margin:4px">Nothing added yet.</p>'}</div>
   <p class="center"><button class="btn ghost" id="ged">Edit goal</button> ${g.done?'':'<button class="btn ghost" id="gdone">Mark reached</button>'}</p>
   <p class="muted small center">Money you put in a goal stays in your “Free to spend” total until you add it here, so you don’t spend it twice.</p>`;
  const move=sign=>{ const s=prompt(sign>0?'How much are you adding?':'How much are you taking out?'); const a=parseMoney(s); if(!(a>0)) return; if(sign<0&&a>(g.saved||0)) return toast('Only '+money(g.saved||0)+' in this goal');
    if(sign>0&&a>Calc.available()&&!confirm('That’s more than your free-to-spend total ('+money(Calc.available())+'). Add it anyway?')) return;
    g.saved=(g.saved||0)+sign*a; g.adds=(g.adds||[]).concat([{t:Date.now(),a:sign*a}]); const reached=!g.done&&g.saved>=g.target; if(reached) g.done=Date.now(); Store.save(g,'g_'); toast(reached?'Goal reached! 🎉':sign>0?money(a)+' added':money(a)+' taken out'); route(); };
  $('#gin').onclick=()=>move(1); $('#gout').onclick=()=>move(-1); $('#ged').onclick=()=>openGoal(g.id); const gd=$('#gdate'); if(gd) gd.onclick=()=>openGoal(g.id);
  const dn=$('#gdone'); if(dn) dn.onclick=()=>{ g.done=Date.now(); Store.save(g,'g_'); toast('Reached 🎉'); route(); };
};
/* ---------- Can I afford it? ---------- */
function simulate(price){ const avail=Calc.available(), pd=Calc.perDay(), pace=Calc.netWeek(); const goals=Store.goals().filter(g=>!g.done);
  const short=Math.max(0,price-avail);
  const verdict=price<=avail*0.5?['yes','✅ Yes — comfortably','You’d still have '+money(avail-price)+' free to spend.']:price<=avail?['tight','⚠️ Yes, but it’s tight','It uses '+Math.round(price/Math.max(1,avail)*100)+'% of your free money. '+money(avail-price)+' left after.']:['no','❌ Not yet',(avail>0?'You’re '+money(short)+' short.':'You have no free money right now.')+(pd>0?' That’s about '+Math.ceil(short/pd)+' more days of earnings.':'')];
  const perGoal=goals.map(g=>{ const n=Calc.goalNeed(g); const fromGoal=Math.min(short,g.saved||0); /* every dollar spent is a dollar your goals don't get at your pace */
    const delay=pace>0?Math.ceil(price/(pace/7)):null; const left2=n.left+price; const per2=n.weeks?Math.ceil(left2/n.weeks):null; return {g,n,delay,per2,fromGoal}; });
  return {avail,pd,pace,verdict,perGoal,days:pd>0?price/pd:null,short}; }
window.StsSim=simulate;
routes.afford=(v,pre)=>{ if(!P()){ StsPro.locked(v,'Can I afford it?','Type a price and see what it does to every goal, your free money, and how many days of earnings it costs.'); return; }
  v.innerHTML=`<p><a href="#goals">‹ Goals</a></p><h2>Can I afford it?</h2><p class="muted">Type a price. Nothing is saved unless you tap a button.</p>
   <div class="card"><label>What is it?</label><input id="an" maxlength="40" placeholder="e.g. AirPods"><label>Price</label><div class="amt sm"><span>${esc(cur())}</span><input id="ap2" inputmode="decimal" placeholder="0" value="${esc(pre||'')}" aria-label="Price"></div></div>
   <div id="ares"></div>`;
  const draw=()=>{ const price=parseMoney($('#ap2').value); const el=$('#ares'); if(!(price>0)){ el.innerHTML=`<p class="muted small">Free to spend now: <b>${money(Calc.available())}</b> · you earn about ${money(Calc.perDay())}/day.</p>`; return; }
    const s=simulate(price);
    el.innerHTML=`<div class="card verdict ${s.verdict[0]}"><b>${s.verdict[1]}</b><p style="margin:4px 0 0">${esc(s.verdict[2])}</p></div>
     <div class="stat3"><div><small>Days of earnings</small><b>${s.days!=null?s.days.toFixed(1):'–'}</b></div><div><small>Free money after</small><b class="${s.avail-price<0?'out':''}">${money(s.avail-price)}</b></div><div><small>Weeks of saving</small><b>${s.pace>0?(price/s.pace).toFixed(1):'–'}</b></div></div>
     <h3 style="margin-top:16px">What it does to your goals</h3>
     ${s.perGoal.length?s.perGoal.map(x=>`<div class="card it"><span class="cic">${esc(x.g.emoji||'🎯')}</span><span class="wh"><b>${esc(x.g.name)}</b><small>${x.delay!=null?'Pushed back about <b>'+x.delay+' day'+(x.delay===1?'':'s')+'</b> at your pace':'No saving pace yet (log some income)'}${x.n.perWeek!=null?' · to keep the date: '+money(x.n.perWeek)+' → <b>'+money(x.per2)+'/wk</b>':''}${x.fromGoal?' · you’d have to take '+money(x.fromGoal)+' out of it':''}</small></span></div>`).join(''):'<p class="muted">No goals yet — <a href="#goals">add one</a> to see the effect.</p>'}
     <div class="row" style="margin-top:8px"><button class="btn" id="abuy">I bought it</button><button class="btn ghost" id="agoal">Save up for it</button></div>
     <p class="muted small">Based on your last ${'90'} days of entries. Not financial advice.</p>`;
    $('#abuy').onclick=()=>{ openTx(null,{k:'out',a:price,c:'shopping',n:$('#an').value.trim()}); };
    $('#agoal').onclick=()=>{ if(!canAdd()) return upsell('More than one goal'); const x=Store.save({name:$('#an').value.trim()||'Something new',emoji:'🎁',target:price,saved:0,due:'',col:COLS[Store.goals().length%COLS.length],adds:[]},'g_'); toast('Goal created'); location.hash='#goal/'+x.id; };
  };
  $('#ap2').addEventListener('input',draw); draw();
};
window.StsGoal={open:openGoal};
})();
