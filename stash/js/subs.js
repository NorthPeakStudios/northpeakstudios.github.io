// Stash · subscriptions: renewal list, yearly total, calendar reminders, optional auto-log on renewal (Pro).
(function(){
const CYC={week:['week',52],month:['month',12],year:['year',1]};
const PRESET=[['Spotify',1199,'month'],['Apple One',1995,'month'],['iCloud+ 50 GB',99,'month'],['Discord Nitro',999,'month'],['Xbox Game Pass',1999,'month'],['YouTube Premium',1399,'month'],['Netflix',799,'month'],['GitHub Pro',400,'month'],['Domain name',1200,'year'],['Apple Developer',9900,'year']];
function yearly(s){ return s.a*(CYC[s.cyc]||CYC.month)[1]; }
function step(ymdS,cyc){ const t=fromYmd(ymdS); if(!isFinite(t)) return ymdS; return ymd(stepDate(t,cyc==='week'?'week':cyc==='year'?'year':'month')); }
/* move past renewal dates forward; log the charge when the person asked for that */
function roll(){ const today=ymd(Date.now()), add=[]; for(const s of Store.subs()){ if(s.off||!s.next) continue; let n=0, nx=s.next; while(nx<today&&n<60){ if(s.log) add.push({_p:'t_',k:'out',a:s.a,c:'subs',n:s.name+' renewal',t:fromYmd(nx),sid:s.id}); nx=step(nx,s.cyc); n++; } if(n){ s.next=nx; add.push(s); } } if(add.length){ Store.bulk(add); return true; } return false; }
function daysTo(ymdS){ return Math.round((fromYmd(ymdS)-fromYmd(ymd(Date.now())))/DAY); }
function upcoming(days){ return Store.subs().filter(s=>!s.off&&s.next&&daysTo(s.next)>=0&&daysTo(s.next)<=days); }
window.StsSubs={roll,upcoming,yearly};
function openSub(id,pre){ const s=id?Store.sub(id):null; const o=Object.assign({name:'',a:0,cyc:'month',next:ymd(Date.now()+7*DAY),log:true},pre||{},s||{});
  sheet(`<h3>${s?'Edit subscription':'Add a subscription'}</h3>${s?'':`<div class="chips" id="spre">${PRESET.map((p,i)=>`<button type="button" class="chip sub" data-i="${i}">${esc(p[0])}</button>`).join('')}</div>`}
   <label>Name</label><input id="sn" maxlength="40" value="${esc(o.name)}" placeholder="e.g. Spotify">
   <div class="row"><div><label>Price (${esc(cur())})</label><input id="sa" inputmode="decimal" value="${o.a?(o.a/100).toFixed(2):''}" placeholder="9.99"></div><div><label>Every</label><select id="sc">${Object.keys(CYC).map(k=>`<option value="${k}" ${o.cyc===k?'selected':''}>${k}</option>`).join('')}</select></div></div>
   <label>Next renewal</label><input id="sd" type="date" value="${esc(o.next)}">
   <label class="ck"><input type="checkbox" id="sl" ${o.log?'checked':''}> Add it to my spending each time it renews</label>
   <button class="btn big block" id="ssave">${s?'Save':'Add'}</button>${s?`<button class="btn ghost block" id="soff">${s.off?'Mark active again':'I cancelled it'}</button><button class="btn danger block" id="sdel">Delete</button>`:''}`,root=>{
    const pre=root.querySelector('#spre'); if(pre) pre.addEventListener('click',e=>{ const b=e.target.closest('.chip'); if(!b) return; const p=PRESET[+b.dataset.i]; root.querySelector('#sn').value=p[0]; root.querySelector('#sa').value=(p[1]/100).toFixed(2); root.querySelector('#sc').value=p[2]; });
    root.querySelector('#ssave').onclick=()=>{ const name=root.querySelector('#sn').value.trim(), a=parseMoney(root.querySelector('#sa').value), next=root.querySelector('#sd').value; if(!name) return toast('Name it'); if(!(a>0)) return toast('Add the price'); if(!next) return toast('Pick the next renewal date');
      const x=Object.assign(s||{},{name,a,cyc:root.querySelector('#sc').value,next,log:root.querySelector('#sl').checked}); Store.save(x,'s_'); roll(); closeSheet(); toast(s?'Saved':'Added'); route(); };
    const off=root.querySelector('#soff'); if(off) off.onclick=()=>{ s.off=!s.off; Store.save(s,'s_'); closeSheet(); toast(s.off?'Marked cancelled — nice, that’s '+money(yearly(s))+'/yr back':'Active again'); route(); };
    const d=root.querySelector('#sdel'); if(d) d.onclick=()=>{ if(!confirm('Delete '+s.name+'?')) return; Store.del(s.id); closeSheet(); route(); };
  }); }
function ics(){ const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Northpeak//Stash//EN','CALSCALE:GREGORIAN']; const st=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
  for(const s of Store.subs()){ if(s.off) continue; const d=s.next.replace(/-/g,''); const fr=s.cyc==='week'?'WEEKLY':s.cyc==='year'?'YEARLY':'MONTHLY'; const nm=String(s.name).replace(/[,;\\]/g,' ');
    L.push('BEGIN:VEVENT','UID:'+s.id+'@stash.northpeak','DTSTAMP:'+st,'DTSTART;VALUE=DATE:'+d,'RRULE:FREQ='+fr,'SUMMARY:'+nm+' renews ('+money(s.a)+')','DESCRIPTION:From Stash. Cancel before today if you don’t use it.','BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+nm+' renews tomorrow','TRIGGER:-P1D','END:VALARM','END:VEVENT'); }
  L.push('END:VCALENDAR'); return L.join('\r\n'); }
window.StsIcs=ics;
routes.subs=v=>{ if(!P()){ StsPro.locked(v,'Subscriptions','Every subscription in one list: what renews next, reminders in your Calendar, and what they cost you in a year.'); return; }
  roll(); const ss=Store.subs(), act=ss.filter(s=>!s.off), off=ss.filter(s=>s.off); const yr=act.reduce((t,s)=>t+yearly(s),0);
  v.innerHTML=`<div class="hrow" style="margin-top:4px"><h2 style="margin:0">Subscriptions</h2><button class="btn sm" id="sadd">＋ Add</button></div>
   <div class="card"><div class="stat3"><div><small>Per year</small><b class="out">${money(yr,{round:true})}</b></div><div><small>Per month</small><b>${money(Math.round(yr/12))}</b></div><div><small>Active</small><b>${act.length}</b></div></div>
   ${yr&&Calc.perDay()>0?`<p class="muted small" style="margin:8px 0 0">That’s ${(yr/Calc.perDay()).toFixed(0)} days of your earnings every year.</p>`:''}</div>
   <h3>Renewals coming up</h3><div class="card list">${act.length?act.map(s=>{ const d=daysTo(s.next); return `<a class="it" href="#" data-sub="${esc(s.id)}"><span class="cic">🔁</span><span class="wh"><b>${esc(s.name)}</b><small>${money(s.a)}/${s.cyc} · ${money(yearly(s),{round:true})}/yr${s.log?' · auto-logs':''}</small></span><span class="pill ${d<=3?'warn':d<=7?'acc':''}">${d===0?'today':d===1?'tomorrow':'in '+d+' d'}<br>${fmtDs(fromYmd(s.next))}</span></a>`; }).join(''):'<p class="muted" style="margin:4px">None yet. Add the ones you pay for — even the small ones add up.</p>'}</div>
   ${act.length?'<button class="btn ghost block" id="sics">📅 Add renewal reminders to Calendar</button><p class="muted small">A Calendar file with each renewal, repeating, with an alert the day before.</p>':''}
   ${off.length?`<h3>Cancelled</h3><div class="card list">${off.map(s=>`<a class="it faded" href="#" data-sub="${esc(s.id)}"><span class="cic">✂️</span><span class="wh"><b>${esc(s.name)}</b><small>saves ${money(yearly(s),{round:true})}/yr</small></span></a>`).join('')}</div>`:''}`;
  $('#sadd').onclick=()=>openSub(); const ic=$('#sics'); if(ic) ic.onclick=()=>StsFile.save('stash-renewals.ics',ics(),'text/calendar');
  v.addEventListener('click',e=>{ const a=e.target.closest('[data-sub]'); if(a){ e.preventDefault(); openSub(a.dataset.sub); } });
};
window.StsSubOpen=openSub;
})();
