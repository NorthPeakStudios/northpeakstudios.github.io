/* Northpeak Admin · Pulse + tools (np-features v1, Oct 29 2026).
   Everything here reads data the admin API and the apps' /api/pro/admin routes ALREADY return to this page, or calls
   actions this page already had (revoke a code, write a note, set a license, open/close Synapse buying, user ops).
   No new endpoints, no new origins, no tokens. Local-only state lives under np_f_* keys (localStorage) and
   np_f_undo (sessionStorage); nothing here is sent anywhere. All user/server text goes through esc(). */
(function(){
var N=window.NPA; if(!N)return;
var $=function(s){return document.querySelector(s)}, esc=N.esc, DAY=86400000;
function L(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch(e){return d}}
function S(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function SL(k,d){try{var v=JSON.parse(sessionStorage.getItem(k)||'null');return v==null?d:v}catch(e){return d}}
function SS(k,v){try{if(v==null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function D(){return N.data()}
function can(c){return N.can(c)}
function owner(){var m=N.me();return !!(m&&m.role==='owner')}
function money(n){return '$'+(Math.round((n||0)*100)/100).toLocaleString('en-US')}
function ago(ms){if(!ms)return'';var s=Math.max(0,(Date.now()-ms)/1000);if(s<60)return'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<DAY/1000)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago'}
function pl(n,w){return n+' '+w+(n===1?'':'s')}
function appName(k){var a=N.apps().filter(function(x){return x.k===k})[0];return a?a.name:k}
function tag(k){var a=N.apps().filter(function(x){return x.k===k})[0];return '<span class="tag '+esc(a?a.tag:'t-app')+'">'+esc(a?a.name:k)+'</span>'}
function modal(html){var m=document.createElement('div');m.className='amod';m.innerHTML='<div class="box fbox">'+html+'</div>';document.body.appendChild(m);
 m.addEventListener('click',function(e){if(e.target===m||(e.target.dataset&&e.target.dataset.close!=null))m.remove()});return m}
function card(id,icon,title,right){return '<div class="panel fp" id="'+id+'P"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h2 style="margin:0">'+icon+' '+esc(title)+'</h2>'+(right||'')+'</div><div class="fb" id="'+id+'"></div></div>'}
function box(id){return document.getElementById(id)}
function hideP(id,h){var p=document.getElementById(id);if(p)p.hidden=!!h}

/* ---------- every code the page knows, with its app (same merge renderMore() uses) ---------- */
function allCodes(){var d=D();if(!d)return[];var C=[];((d.syn&&d.syn.codes)||[]).forEach(function(c){C.push({app:'syn',aa:c.product==='all_access',own:c.kind==='owner',bot:c.kind==='bot',code:c.code,note:c.note,created:c.created,revoked:c.revoked,used:c.used||c.redeemed,by:c.by,raw:c})});
 N.apps().forEach(function(a){if(a.k==='syn')return;((d.C[a.k]&&d.C[a.k].codes)||[]).forEach(function(c){C.push({app:a.k,code:c.code,note:c.note,created:c.created,used:c.used,by:c.by,revoked:c.revoked,raw:c})})});return C}
function unlocks(c){if(c.aa)return N.apps().map(function(a){return a.name});return [appName(c.app)+' Pro']}
function acctList(){var A=N.acData();if(!A)return null;var out=[];N.apps().forEach(function(a){var j=A[a.k];((j&&j.accounts)||[]).forEach(function(x){out.push({app:a.k,a:x})})});return out}

/* ===== 1. Code autopsy ===== */
var LOGC=null; /* last access-log page this page read (for "who made it") */
function autopsy(code,capp){
 var c=allCodes().filter(function(x){return x.code===code&&(!capp||x.app===capp)})[0]||{code:code,app:capp||'syn'};
 var reqs=N.rows().filter(function(r){return r.code===code});
 var m=modal('<h3>🔎 Code '+esc(code)+'</h3><div id="fAu"><div class="empty"><span class="spin"></span></div></div><div class="row" style="justify-content:flex-end;margin-top:10px"><button id="fAuCan">'+(isCanary(code)?'Unmark canary':'🪤 Mark as canary')+'</button><button class="pri" data-close>Done</button></div>');
 m.querySelector('#fAuCan').addEventListener('click',function(){toggleCanary(c);m.remove();renderPulse()});
 var jobs=[can('view_logs')?N.api('/api/logs?u=&kind=actions').then(function(j){return j&&j.ok?j.logs:null}):Promise.resolve(null),
  can('view_logs')?N.appApi(c.app,'actlog').then(function(j){return j&&j.ok?j.log:null},function(){return null}):Promise.resolve(null),
  can('manage_accounts')&&!N.acData()?N.loadAccounts():Promise.resolve()];
 Promise.all(jobs).then(function(v){
  var hit=function(l){return l&&((l.tgt&&String(l.tgt).indexOf(code)>=0)||(l.det&&String(l.det).indexOf(code)>=0))};
  var made=(v[0]||[]).filter(hit), own=(v[1]||[]).filter(hit), acc=(acctList()||[]).filter(function(x){return x.a.via&&String(x.a.via).indexOf(code)>=0});
  var li=[];
  li.push(['Unlocks',esc(unlocks(c).join(', '))+(c.own?' · 👑 owner code':c.bot?' · 🤖 bot code':'')]);
  li.push(['Made',c.created?esc(N.fmtT(c.created))+(c.note?' · “'+esc(c.note)+'”':''):'<span class="sub">not in the code list (deleted?)</span>']);
  li.push(['Made by',made.length?made.map(function(l){return '@'+esc(l.u||'?')+' · '+esc(N.fmtT(l.t))}).join('<br>'):own.length?own.map(function(l){return 'owner key · '+esc(String(l.act))+' · '+esc(N.fmtT(l.t))}).join('<br>'):(reqs.length?'Mark paid on the request below':'<span class="sub">'+(can('view_logs')?'not in the newest 200 log lines':'your role can’t see logs')+'</span>')]);
  li.push(['Status',c.revoked?'<span class="tag s-dismissed">revoked</span>':c.used?'<span class="tag s-paid">used</span>':'<span class="tag s-new">unused</span>']);
  li.push(['Redeemed by',c.used?(c.by?esc(c.by):'<span class="sub">used, the app didn’t say who</span>'):'—']);
  if(acc.length)li.push(['Accounts it unlocked',acc.map(function(x){return tag(x.app)+' '+esc(x.a.email||('@'+x.a.username))+' <span class="sub">'+esc(x.a.license)+'</span>'}).join('<br>')]);
  else if(can('manage_accounts'))li.push(['Accounts it unlocked','<span class="sub">no account names this code</span>']);
  if(reqs.length)li.push(['Request',reqs.map(function(r){return tag(r.app)+' '+esc(r.name||'—')+' · '+esc(r.price||money(r.amount))+' · '+esc(r.status==='new'?'pending':r.status)+' · '+esc(N.fmtT(r.t))}).join('<br>')]);
  var ev=[].concat(made.map(function(l){return{t:l.t,w:'@'+(l.u||'?')+' '+String(l.act).replace(/_/g,' ')}}),own.map(function(l){return{t:l.t,w:'owner key '+String(l.act)}})).sort(function(a,b){return a.t-b.t});
  if(ev.length)li.push(['Timeline',ev.map(function(e){return esc(N.fmtT(e.t))+' · '+esc(e.w)}).join('<br>')]);
  var el=m.querySelector('#fAu');if(el)el.innerHTML='<div class="fkv">'+li.map(function(x){return '<div><span>'+esc(x[0])+'</span><div>'+x[1]+'</div></div>'}).join('')+'</div>'})}

/* ===== 11. Canary codes (shadow-code lite): a real code you plant somewhere; if it is ever redeemed, that place leaked ===== */
function canaries(){return L('np_f_canary',[])}
function isCanary(code){return canaries().some(function(x){return x.code===code})}
function toggleCanary(c){var a=canaries();if(isCanary(c.code)){a=a.filter(function(x){return x.code!==c.code});N.toast('Not a canary any more')}else{var where=prompt('Where are you planting it? (only saved on this phone)','');if(where==null)return;a.push({code:c.code,app:c.app,where:where.slice(0,80),at:Date.now()});N.toast('🪤 Canary set — you’ll see an alert if it’s ever used')}S('np_f_canary',a)}
function trippedCanaries(){var C=allCodes(),out=[];canaries().forEach(function(k){var c=C.filter(function(x){return x.code===k.code})[0];if(c&&c.used)out.push({k:k,c:c})});return out}

/* ===== 5. Fraud radar ===== */
function radar(){var C=allCodes(),A=acctList()||[],flags=[];
 C.forEach(function(c){var why=[],raw=c.raw||{};
  var dv=raw.devices||raw.devs||raw.device_ids;var dn=Array.isArray(dv)?dv.length:(+raw.device_count||+raw.devices_count||0);if(dn>=3)why.push(dn+' devices');
  var em={};A.forEach(function(x){if(x.a.via&&String(x.a.via).indexOf(c.code)>=0)em[(x.a.email||x.a.username||x.a.uid||'').toLowerCase()]=1});var ne=Object.keys(em).length;if(ne>=(c.aa?2:2))why.push(ne+' different accounts');
  if(why.length)flags.push({c:c,why:why})});
 return flags}

/* ===== 4. Revenue heartbeat ===== */
var SEEN=null,PULSE=0;
function paidRows(){return N.rows().filter(function(r){return r.status==='paid'&&(r.amount||0)>0})}
function heartbeat(){var b=box('fHb');if(!b)return;var P=paidRows();var now=Date.now(),start=now-30*DAY;
 var ids=P.map(function(r){return r.app+':'+r.id});if(SEEN){var nw=ids.filter(function(x){return SEEN.indexOf(x)<0});if(nw.length){PULSE=Date.now();var amt=P.filter(function(r){return nw.indexOf(r.app+':'+r.id)>=0}).reduce(function(s,r){return s+r.amount},0);N.toast('💸 New sale · '+money(amt))}}SEEN=ids;
 var pts=P.filter(function(r){return r.t>=start}).sort(function(a,b){return a.t-b.t}),tot=0,W=340,H=70,mx=pts.reduce(function(s,r){return s+r.amount},0)||1;
 var path='M0,'+H;var dots='';pts.forEach(function(r){var x=Math.round((r.t-start)/(now-start)*W),y0=H-Math.round(tot/mx*(H-8));tot+=r.amount;var y=H-Math.round(tot/mx*(H-8));path+=' L'+x+','+y0+' L'+x+','+y;dots+='<circle cx="'+x+'" cy="'+y+'" r="'+(r.amount>=100?4:3)+'" class="'+(r.amount>=100?'big':'')+'"></circle>'});path+=' L'+W+','+(H-Math.round(tot/mx*(H-8)));
 var last=P.slice().sort(function(a,b){return b.t-a.t})[0],fresh=PULSE&&Date.now()-PULSE<15000;
 var d7=P.filter(function(r){return r.t>=now-7*DAY}).reduce(function(s,r){return s+r.amount},0);
 b.innerHTML='<div class="hb'+(fresh?' beat':'')+'"><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-label="paid sales, last 30 days"><path d="'+path+'"></path>'+dots+'</svg></div>'+
  '<div class="row hbs"><span><b>'+money(tot)+'</b> 30 days</span><span><b>'+money(d7)+'</b> 7 days</span><span>'+(last?'last sale '+esc(ago(last.t))+' · '+esc(appName(last.app))+' '+esc(money(last.amount)):'no paid sales yet')+'</span></div>'+
  '<div class="sub">Each dot is a paid request ($35 small, $100 All-Access big), placed at the time the request came in. Pulses when a new paid one shows up on the 30-second refresh.</div>'}

/* ===== 17. App health board ===== */
var HL={},HAT=0;
function frontOf(a){if(a.k==='syn')return '/synapse-app/';var m=/^https:\/\/northpeakstudios\.github\.io(\/[^?#]*)/.exec(a.open||'');return m?m[1].replace(/\/?$/,'/'):''}
function checkHealth(){HAT=Date.now();N.apps().forEach(function(a){var h=HL[a.k]={};var f=frontOf(a);
  if(f){var t0=Date.now();fetch(f+'sw.js?t='+t0,{cache:'no-store'}).then(function(r){h.fs=r.status;h.lm=Date.parse(r.headers.get('last-modified')||'')||0;h.fms=Date.now()-t0;return r.ok?r.text():''}).then(function(t){var m=/['"]([a-z0-9]+(?:-[a-z0-9]+)*-v[\w.-]+)['"]/i.exec(t||'');h.ver=m?m[1]:'';health()},function(){h.fs=0;health()})}
  var t1=Date.now(),ac=window.AbortController?new AbortController():null,tm=ac?setTimeout(function(){ac.abort()},8000):0;
  fetch(a.base+'/api/ping?t='+t1,{mode:'no-cors',cache:'no-store',signal:ac?ac.signal:undefined}).then(function(){clearTimeout(tm);h.be='up';h.bms=Date.now()-t1;health()},function(){clearTimeout(tm);h.be='down';health()})});health()}
function health(){var b=box('fHl');if(!b)return;var d=D();
 b.innerHTML='<div class="hgrid">'+N.apps().map(function(a){var h=HL[a.k]||{},j=d&&d.L[a.k]||{},bad=[],warn=[];
  if(h.fs===0||(h.fs&&h.fs>=400))bad.push('page didn’t load'+(h.fs?' ('+h.fs+')':''));
  if(h.be==='down')bad.push('backend down');
  if(can('view_requests')&&d&&!j.ok)warn.push('admin data: '+(j.error||'no answer'));
  var st=bad.length?'bad':warn.length?'warn':(h.fs&&h.be)?'ok':'wait';
  return '<div class="hc h-'+st+'"><div class="apt">'+tag(a.k)+'<span class="hd"></span></div>'+
   '<div class="sub">'+(h.ver?'<b>'+esc(h.ver)+'</b>':'version …')+(h.lm?' · updated '+esc(ago(h.lm)):'')+'</div>'+
   '<div class="sub">page '+(h.fs?esc(String(h.fs))+(h.fms?' · '+h.fms+' ms':''):h.fs===0?'unreachable':'…')+' · backend '+(h.be==='up'?'up · '+h.bms+' ms':h.be==='down'?'down':'…')+'</div>'+
   (bad.concat(warn).length?'<div class="herr">'+esc(bad.concat(warn).join(' · '))+'</div>':'')+'</div>'}).join('')+'</div><div class="sub" style="margin-top:6px">Checked '+esc(ago(HAT))+'. Page = the app’s offline file on this site (its version and when it was last deployed); backend = its server answering.</div>'}

/* ===== 12. Buyer map ===== */
function buyerKey(r){var c=String(r.contact||r.email||'').trim().toLowerCase();var d=c.replace(/\D/g,'');if(d.length>=10)return 'p'+d.slice(-10);if(c.indexOf('@')>0)return 'e'+c;var u=String(r.username||'').trim().toLowerCase();return u?'u'+u:(r.name?'n'+String(r.name).trim().toLowerCase():'')}
function buyerMap(){var b=box('fBm');if(!b)return;var P=N.rows().filter(function(r){return r.status==='paid'});var who={};
 P.forEach(function(r){var k=buyerKey(r);if(!k)return;var w=who[k]=who[k]||{apps:{},name:r.name};if(r.aa)w.aa=1;else w.apps[r.app]=1});
 var A=acctList();if(A)A.forEach(function(x){var lic=x.a.license;if(lic!=='pro'&&lic!=='all_access')return;var em=(x.a.email||'').toLowerCase();if(!em)return;var w=who['e'+em]=who['e'+em]||{apps:{},name:em};if(lic==='all_access')w.aa=1;else w.apps[x.app]=1});
 var pair={},solo={},multi=0,aa=0,n=0;Object.keys(who).forEach(function(k){var w=who[k],ks=Object.keys(w.apps).sort();if(!ks.length&&!w.aa)return;n++;if(w.aa){aa++;return}if(ks.length>1)multi++;if(ks.length===1)solo[ks[0]]=(solo[ks[0]]||0)+1;for(var i=0;i<ks.length;i++)for(var j=i+1;j<ks.length;j++){var p=ks[i]+'|'+ks[j];pair[p]=(pair[p]||0)+1}});
 var P2=Object.keys(pair).sort(function(x,y){return pair[y]-pair[x]});
 b.innerHTML='<div class="row hbs"><span><b>'+n+'</b> buyers</span><span><b>'+multi+'</b> bought 2+ apps</span><span><b>'+aa+'</b> All-Access</span></div>'+
  (P2.length?P2.slice(0,8).map(function(p){var k=p.split('|'),w=Math.round(pair[p]/Math.max.apply(null,P2.map(function(x){return pair[x]}))*100);return '<div class="bmr">'+tag(k[0])+'<span class="sub">+</span>'+tag(k[1])+'<div class="bmb"><i style="width:'+w+'%"></i></div><b>'+pair[p]+'</b></div>'}).join(''):'<div class="sub" style="margin:6px 0">Nobody has bought two separate apps yet'+(aa?' (All-Access buyers get all of them)':'')+'.</div>')+
  (Object.keys(solo).length?'<div class="sub" style="margin-top:6px">Only one app: '+Object.keys(solo).sort(function(x,y){return solo[y]-solo[x]}).map(function(k){return esc(appName(k))+' '+solo[k]}).join(' · ')+'</div>':'')+
  '<div class="sub" style="margin-top:6px">Matches paid requests by phone, email or username'+(A?', plus Pro accounts by email':' (open Accounts once to add Pro accounts by email)')+'. Someone who paid with a phone number on one app and an email on another counts as two buyers.</div>'}

/* ===== 16. Admin login calendar ===== */
var LC={rows:null,busy:false};
function loadLogins(){if(LC.busy||!can('view_logs'))return;LC.busy=true;var all=[];
 function page(before,n){return N.api('/api/logs?u=&kind=logins'+(before?'&before='+encodeURIComponent(before):'')).then(function(j){if(!j||!j.ok)return;all=all.concat(j.logs||[]);var last=(j.logs||[])[j.logs.length-1];if(j.logs&&j.logs.length>=200&&n<4&&last&&last.t>Date.now()-91*DAY)return page(last.id,n+1)})}
 page('',0).then(function(){LC.busy=false;LC.rows=all;logins()})}
function ptParts(t){var s=new Date(t).toLocaleString('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hour12:false});var m=/(\d+)\/(\d+)\/(\d+),?\s*(\d+)/.exec(s);return m?{d:m[3]+'-'+m[1]+'-'+m[2],h:(+m[4])%24}:{d:'',h:0}}
function logins(){var b=box('fLc');if(!b)return;if(!LC.rows){b.innerHTML='<div class="empty"><span class="spin"></span></div>';loadLogins();return}
 var ok=LC.rows.filter(function(l){return l.act==='login'}),bad=LC.rows.filter(function(l){return l.act==='login_fail'||l.act==='login_blocked'});
 var byD={},badD={},byH=[];for(var i=0;i<24;i++)byH.push(0);ok.forEach(function(l){var p=ptParts(l.t);byD[p.d]=(byD[p.d]||0)+1;byH[p.h]++});bad.forEach(function(l){var p=ptParts(l.t);badD[p.d]=(badD[p.d]||0)+1});
 var today=new Date(),cells='',mx=1;Object.keys(byD).forEach(function(k){mx=Math.max(mx,byD[k])});
 var end=new Date(today.getTime());var dow=+new Date(today.toLocaleString('en-US',{timeZone:'America/Los_Angeles'})).getDay();
 var startT=today.getTime()-(12*7+dow)*DAY;
 for(var w=0;w<13;w++){cells+='<div class="lcw">';for(var dd=0;dd<7;dd++){var t=startT+(w*7+dd)*DAY;if(t>end.getTime()+DAY/2){cells+='<i class="lc0" style="visibility:hidden"></i>';continue}var k=ptParts(t).d,n=byD[k]||0,f=badD[k]||0,lv=n?Math.min(4,1+Math.floor((n-1)/Math.max(1,mx/4))):0;cells+='<i class="lc'+lv+(f?' lcf':'')+'" title="'+esc(k+': '+n+' sign-ins'+(f?', '+f+' failed':''))+'"></i>'}cells+='</div>'}
 var hm=Math.max.apply(null,byH)||1,odd=0;byH.forEach(function(n,h){if(h<6)odd+=n});
 b.innerHTML='<div class="lcg">'+cells+'</div><div class="sub" style="margin:4px 0 8px">Last 13 weeks, Pacific time · darker = more sign-ins · red ring = failed sign-ins that day</div>'+
  '<div class="lch">'+byH.map(function(n,h){return '<i class="'+(h<6&&n?'odd':'')+'" style="height:'+Math.max(2,Math.round(n/hm*36))+'px" title="'+h+':00 · '+n+'"></i>'}).join('')+'</div><div class="row sub" style="justify-content:space-between"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>'+
  '<div class="row hbs" style="margin-top:6px"><span><b>'+ok.length+'</b> sign-ins</span><span><b>'+bad.length+'</b> failed</span><span'+(odd?' style="color:var(--warn)"':'')+'><b>'+odd+'</b> between 12am and 6am</span></div>'}

/* ===== 6. Code age slider (expiry by hand) ===== */
function staleCodes(days){var cut=Date.now()-days*DAY;return allCodes().filter(function(c){return !c.used&&!c.revoked&&!c.own&&!c.bot&&c.created&&c.created<cut})}
function codeAge(){var b=box('fCa');if(!b)return;var days=L('np_f_age',30);var st=staleCodes(days);
 b.innerHTML='<label class="fsl"><span>Unused codes older than <b id="fCaD">'+days+'</b> days</span><input type="range" id="fCaR" min="1" max="120" value="'+days+'"></label>'+
  (st.length?st.slice(0,30).map(function(c){return '<div class="lg"><span class="ic">⏳</span><div><span class="code" data-copy="'+esc(c.code)+'">'+esc(c.code)+'</span> '+tag(c.app)+(c.note?' <span class="sub">'+esc(c.note)+'</span>':'')+'<div class="l2">made '+esc(N.fmtT(c.created))+' · '+esc(ago(c.created))+'</div></div>'+(can('revoke_codes')?'<button class="dang" data-fexp="'+esc(c.code)+'" data-capp="'+esc(c.app)+'">Expire</button>':'')+'</div>'}).join(''):'<div class="sub">No unused codes that old.</div>')+
  '<div class="sub" style="margin-top:6px">Codes don’t expire by themselves (the apps have no expiry date on a code). Drag to find old unused ones; Expire revokes it, same as Revoke in the code list.</div>'}

/* ===== 3 + 13. Buying switch with a timer, and scheduled open/close (Synapse is the one app whose buying the panel can switch) ===== */
function synOpen(){var d=D();return !!(d&&d.syn&&d.syn.open)}
function plans(){return L('np_f_buy',[])}
function setOpen(open,why){return N.act('syn','open',{open:open},'Synapse buying '+(open?'opened':'closed')+(why?' · '+why:''))}
function runPlans(){if(!can('toggle_buying'))return;var d=D();if(!d||!d.syn||!d.syn.ok)return;var P=plans(),now=Date.now(),keep=[],due=null;
 P.forEach(function(p){if(p.at<=now&&!due)due=p;else keep.push(p)});if(!due)return;S('np_f_buy',keep);
 if(now-due.at>DAY){if(!confirm('A '+(due.open?'reopen':'close')+' of Synapse buying was set for '+N.fmtT(due.at)+' and this panel wasn’t open then. Do it now?'))return}
 if(synOpen()!==due.open)setOpen(due.open,due.kind==='freeze'?'timer':'scheduled')}
function buying(){var b=box('fBy');if(!b)return;var d=D();if(!d||!d.syn||!d.syn.ok){b.innerHTML='<div class="sub">Synapse didn’t answer, so its buying switch can’t be read right now.</div>';return}
 var op=synOpen(),P=plans().sort(function(x,y){return x.at-y.at});
 b.innerHTML='<div class="row" style="margin-bottom:8px"><span>Synapse buying is <b>'+(op?'open ✅':'closed ⛔')+'</b></span></div>'+
  (op?'<div class="row"><span class="sub">Freeze for</span>'+[[1,'1 h'],[4,'4 h'],[24,'24 h']].map(function(x){return '<button data-ffz="'+x[0]+'">⛔ '+x[1]+'</button>'}).join('')+'</div>':'<div class="row"><button class="pri" data-fbo="1">Open now</button></div>')+
  '<div class="row" style="margin-top:10px"><input type="datetime-local" id="fBt" class="fin"><select id="fBk" class="sm fin2"><option value="1">open</option><option value="0">close</option></select><button id="fBs">Schedule</button></div>'+
  (P.length?P.map(function(p,i){return '<div class="lg"><span class="ic">'+(p.open?'✅':'⛔')+'</span><div>'+(p.open?'Open':'Close')+' buying '+esc(N.fmtT(p.at))+' <span class="sub">('+(p.kind==='freeze'?'freeze timer':'scheduled')+')</span></div><button data-fbx="'+i+'">✕</button></div>'}).join(''):'')+
  '<div class="sub" style="margin-top:6px">The server has no timer: a freeze ends, or a schedule runs, when this panel is open at that moment (or the next time you open it). Only Synapse has a buying switch the panel can reach; the other apps’ backends don’t offer one.</div>'}

/* ===== 8. Undo stack (this browser’s last 20 panel actions; reversible ones carry their inverse) ===== */
var REPLAY=false;
function undos(){return SL('np_f_undo',[])}
function pushUndo(r){if(REPLAY)return;var u=undos();r.id=Date.now()+'-'+Math.random().toString(36).slice(2,6);r.t=Date.now();u.unshift(r);SS('np_f_undo',u.slice(0,20));if(isOn())undoBox()}
var ST={new:'pending',paid:'paid',declined:'declined',test:'test'};
N.hook({
 pre:function(app,path,body){if(REPLAY)return null;var p={app:app,path:path,body:body};
  if(path==='mark'){var r=N.rows().filter(function(x){return x.app===app&&x.id===body.id})[0];p.prev=r&&r.status;p.who=r&&r.name}
  if(path==='open'){p.prev=synOpen()}return p},
 done:function(p,j){if(!p)return;var b=p.body||{},app=p.app,nm=appName(app);
  if(p.path==='mark'){if(b.status==='delete')return pushUndo({label:'Deleted '+nm+' request '+(p.who||b.id),inv:null,why:'deleted requests can’t come back'});
   if(p.prev&&p.prev!==b.status&&/^(new|paid|declined)$/.test(p.prev))return pushUndo({label:nm+': '+(p.who||b.id)+' → '+(ST[b.status]||b.status),inv:{t:'act',app:app,path:'mark',body:{id:b.id,status:p.prev},label:'Back to '+ST[p.prev]}});return}
  if(p.path==='open')return pushUndo({label:'Synapse buying '+(b.open?'opened':'closed'),inv:{t:'act',app:'syn',path:'open',body:{open:!b.open},label:'Synapse buying '+(b.open?'closed':'opened')}});
  if(p.path==='mint'&&j&&j.code)return pushUndo({label:(b.req?'Marked paid · ':'Made ')+nm+' code '+j.code,inv:{t:'act',app:app,path:app==='syn'?'revoke':'code-delete',body:{code:j.code},label:'Revoked '+j.code}});
  if(/^(revoke|code-delete)$/.test(p.path))return pushUndo({label:'Revoked '+nm+' code '+b.code,inv:null,why:'a revoked code can’t be turned back on; make a new one'});
  if(p.path==='dismiss'||p.path==='delete')return pushUndo({label:nm+' request '+(p.path==='delete'?'deleted':'dismissed'),inv:null,why:'Synapse has no undo for this'});
  return},
 lic:function(app,path,back,label){if(REPLAY)return;pushUndo({label:label,inv:{t:'act',app:app,path:path,body:back,label:'License put back'}})},
 uop:function(b,prev){if(REPLAY)return;var u=b.username;
  if(b.op==='role'&&prev)pushUndo({label:'@'+u+' role → '+b.role,inv:{t:'uop',body:{op:'role',username:u,role:prev.role},msg:'@'+u+' role put back'}});
  else if(b.op==='disable'||b.op==='enable')pushUndo({label:'@'+u+' '+b.op+'d',inv:{t:'uop',body:{op:b.op==='disable'?'enable':'disable',username:u},msg:'@'+u+' '+(b.op==='disable'?'enabled':'disabled')}});
  else if(b.op==='create')pushUndo({label:'Added @'+String(u).toLowerCase(),inv:{t:'uop',body:{op:'delete',username:String(u).toLowerCase()},msg:'@'+u+' removed'}});
  else pushUndo({label:'@'+u+' '+b.op,inv:null,why:b.op==='reset'?'the old password is gone':'deleted users can’t come back'})},
 note:function(app,id,prev,now){pushUndo({label:'Note on '+appName(app)+' '+id+(now?'':' removed'),inv:{t:'note',app:app,id:id,txt:prev||''}})}
});
function runUndo(id){var u=undos(),r=u.filter(function(x){return x.id===id})[0];if(!r||!r.inv||r.undone)return;
 if(!confirm('Undo: '+r.label+'?'))return;REPLAY=true;var v=r.inv,p;
 if(v.t==='act')p=N.act(v.app,v.path,v.body,'Undone · '+v.label);else if(v.t==='uop')p=N.uop(v.body,'Undone · '+v.msg);else if(v.t==='note')p=N.api('/api/notes',{app:v.app,id:v.id,txt:v.txt}).then(function(j){N.toast(j&&j.ok?'Undone · note put back':'Didn’t work: '+((j&&(j.words||j.error))||'error'));N.reload();return j});
 Promise.resolve(p).then(function(j){REPLAY=false;if(j&&j.ok){var u2=undos();u2.forEach(function(x){if(x.id===id)x.undone=Date.now()});SS('np_f_undo',u2)}if(r.inv.path&&/acct/.test(r.inv.path)||/license/.test(r.label))N.loadAccounts();undoBox()},function(){REPLAY=false})}
function undoBox(){var b=box('fUn');if(!b)return;var u=undos();
 b.innerHTML=u.length?u.map(function(r){return '<div class="lg"><span class="ic">'+(r.undone?'↩️':r.inv?'•':'🔒')+'</span><div>'+esc(r.label)+'<div class="l2">'+esc(ago(r.t))+(r.undone?' · undone':r.inv?'':' · can’t undo: '+esc(r.why||''))+'</div></div>'+(r.inv&&!r.undone?'<button data-fun="'+esc(r.id)+'">Undo</button>':'')+'</div>'}).join(''):'<div class="sub">Nothing yet. Actions you take on this page in this browser show up here (last 20).</div>'}

/* ===== 18. Refund one-tap: revoke the request’s code + note why ===== */
function refund(app,id){var r=N.rows().filter(function(x){return x.app===app&&x.id===id})[0];if(!r||!r.code)return;
 var m=modal('<h3>↩︎ Refund '+esc(r.name||'this buyer')+'</h3><p>'+tag(r.app)+' '+esc(r.price||money(r.amount))+' · code <span class="mono">'+esc(r.code)+'</span></p><p>Revokes the code'+(r.app==='syn'?'':' (and the Pro it turned on)')+' and saves the reason as this request’s note. Send the money back yourself (Apple Cash) — this page can’t move money.</p>'+
  '<div class="fl"><span>Why</span><input id="fRw" maxlength="200" placeholder="e.g. bought by mistake"></div><div class="row" style="justify-content:flex-end;margin-top:10px"><button data-close>Cancel</button><button class="pri dangbg" id="fRgo">Revoke + log</button></div>');
 m.querySelector('#fRgo').addEventListener('click',function(){var why=m.querySelector('#fRw').value.trim();if(!why){m.querySelector('#fRw').focus();return}this.disabled=true;
  var ca=r.aa?'syn':r.app;N.act(ca,ca==='syn'?'revoke':'code-delete',{code:r.code},'Refunded · code revoked').then(function(j){if(!j||!j.ok){m.remove();return}
   var txt='REFUND '+new Date().toISOString().slice(0,10)+': '+why+(r.note&&r.note.txt?' · '+r.note.txt:'');
   return N.api('/api/notes',{app:r.app,id:r.id,txt:txt}).then(function(k){m.remove();N.toast(k&&k.ok?'Refund logged ✓ — send the money back yourself':'Code revoked, but the note didn’t save');N.reload()})})})}

/* ===== 20. Daily briefing ===== */
var BR={bots:null,fails:null,at:0};
function briefing(){var b=box('fBr');if(!b)return;var d=D();if(!d){b.innerHTML='<div class="empty"><span class="spin"></span></div>';return}var since=Date.now()-DAY,lines=[];
 if(can('view_requests')){var R=N.rows().filter(function(r){return r.status!=='test'&&r.t>=since}),pd=R.filter(function(r){return r.status==='paid'}),pn=N.rows().filter(function(r){return r.status==='new'});
  lines.push(['💸','Sales',pd.length?pl(pd.length,'paid request')+' · <b>'+money(pd.reduce(function(s,r){return s+r.amount},0))+'</b>':'none paid in the last 24 h'+(R.length?' · '+pl(R.length,'new request'):'')]);
  if(pn.length)lines.push(['⏳','Waiting on you',pl(pn.length,'pending request')+' (oldest '+esc(ago(Math.min.apply(null,pn.map(function(r){return r.t||Date.now()}))))+')'])}
 var A=acctList();if(A){var nw=A.filter(function(x){return x.a.created&&x.a.created>=since});var by={};nw.forEach(function(x){by[x.app]=(by[x.app]||0)+1});lines.push(['👤','New users',nw.length?nw.length+' · '+Object.keys(by).map(function(k){return esc(appName(k))+' '+by[k]}).join(', '):'none in the last 24 h'])}
 else if(can('manage_accounts'))lines.push(['👤','New users','<span class="sub">loading accounts…</span>']);
 var bad=[];N.apps().forEach(function(a){var h=HL[a.k]||{},j=d.L[a.k]||{};if(h.be==='down'||h.fs===0||(h.fs>=400))bad.push(a.name+' down');else if(can('view_requests')&&!j.ok)bad.push(a.name+' not answering')});
 var fl=BR.fails;lines.push(['🩺','Errors',(bad.length?'<span style="color:var(--bad)">'+esc(bad.join(', '))+'</span>':'all apps answering')+(fl!=null?' · '+pl(fl,'failed panel action'):'')]);
 var tc=trippedCanaries();if(tc.length)lines.push(['🪤','Canary','<span style="color:var(--bad)">'+tc.map(function(x){return esc(x.k.code)+' used'+(x.c.by?' by '+esc(x.c.by):'')}).join(', ')+'</span>']);
 var fr=radar();if(fr.length)lines.push(['🚨','Fraud radar',pl(fr.length,'code')+' flagged']);
 if(BR.bots)lines.push(['🤖','Bot work',BR.bots.n?pl(BR.bots.n,'event')+' · '+esc(BR.bots.top):'nothing public in the last 24 h']);
 b.innerHTML='<div class="brl">'+lines.map(function(x){return '<div><span class="bri">'+x[0]+'</span><b>'+esc(x[1])+'</b><span>'+x[2]+'</span></div>'}).join('')+'</div><div class="sub" style="margin-top:6px">Since '+esc(N.fmtT(since))+' PT · from what this page loaded '+esc(ago(d.at))+'</div>'}
function loadBrief(){if(Date.now()-BR.at<60000)return;BR.at=Date.now();
 if(can('view_logs'))N.api('/api/logs?u=&kind=fails').then(function(j){if(j&&j.ok){var s=Date.now()-DAY;BR.fails=(j.logs||[]).filter(function(l){return l.t>=s&&l.act!=='login_fail'&&l.act!=='login_blocked'}).length;briefing()}});
 if(can('manage_accounts')&&!N.acData())N.loadAccounts().then(function(){briefing();buyerMap();radarBox()});
 if(owner())N.api('/api/bots/activity').then(function(a){if(!a||!a.ok)return;var s=Date.now()-DAY,n=0,per={};(a.activity||[]).forEach(function(x){(x.items||[]).forEach(function(i){if(i.t>=s){n++;per[x.id]=(per[x.id]||0)+1}})});var top=Object.keys(per).sort(function(p,q){return per[q]-per[p]})[0];BR.bots={n:n,top:top?'most from '+(BOTN[top]||'one account'):''};BOTA=a.activity||[];briefing();timeline()})}

/* ===== 15. Bot timeline (session replay lite) ===== */
var BOTN={},BOTL=null,BOTA=null,TL={id:'',i:0};
function loadBots(){if(!owner()||BOTL)return;N.api('/api/bots?quiet=1').then(function(j){if(!j||!j.ok)return;BOTL=j.bots||[];BOTL.forEach(function(b){BOTN[b.id]=b.label||b.handle});timeline();briefing()})}
function timeline(){var b=box('fTl');if(!b)return;if(!BOTL||!BOTA){b.innerHTML='<div class="empty"><span class="spin"></span></div>';return}
 if(!BOTL.length){b.innerHTML='<div class="sub">No bot accounts yet.</div>';return}
 if(!TL.id||!BOTN[TL.id]){TL.id=BOTL[0].id;TL.i=1e9}var act=(BOTA.filter(function(x){return x.id===TL.id})[0]||{}).items||[];var ev=act.slice().sort(function(a,c){return a.t-c.t});if(TL.i>=ev.length)TL.i=ev.length-1;if(TL.i<0)TL.i=0;var e=ev[TL.i];
 b.innerHTML='<div class="chips">'+BOTL.map(function(x){return '<button class="chip'+(x.id===TL.id?' on':'')+'" data-ftl="'+esc(x.id)+'">'+esc(x.label||x.handle)+'</button>'}).join('')+'</div>'+
  (ev.length?'<div class="tlbar">'+ev.map(function(x,i){return '<i class="'+(i===TL.i?'on':'')+(x.src==='panel'?' pn':'')+'" data-fti="'+i+'"></i>'}).join('')+'</div>'+
   '<div class="tlc"><div class="sub">'+(TL.i+1)+' of '+ev.length+' · '+esc(N.fmtT(e.t))+' · '+(e.src==='panel'?'this panel':'GitHub')+'</div><div style="margin:6px 0"><b>'+esc(e.src==='panel'?(BOTN[TL.id]||''):(e.actor||BOTN[TL.id]||''))+'</b> '+esc(e.text||'')+(e.repo?' · '+esc(e.repo):'')+'</div>'+
   (TL.i>0?'<div class="sub">'+esc(ago(ev[TL.i-1].t))+' → '+esc(ago(e.t))+'</div>':'')+'</div>'+
   '<div class="row" style="justify-content:space-between;margin-top:8px"><button data-ftp="-1"'+(TL.i?'':' disabled')+'>◀ Back</button><button data-ftp="1"'+(TL.i<ev.length-1?'':' disabled')+'>Next ▶</button></div>':'<div class="sub">Nothing recorded for this account yet.</div>')+
  '<div class="sub" style="margin-top:6px">Steps through what’s on record: monitoring sessions opened/ended here and the account’s public GitHub events. Clicks inside Gmail or GitHub aren’t recorded anywhere this page can read.</div>'}

/* ===== 14. What’s-new composer (write once → the homepage block + a line per app, ready to paste/commit) ===== */
function clBox(){var b=box('fCl');if(!b)return;var dr=L('np_f_cl',{t:'',items:[{h:'',p:'',big:'',apps:[]}]});
 b.innerHTML='<div class="fl"><span>Headline</span><input id="fClT" maxlength="80" value="'+esc(dr.t)+'" placeholder="e.g. Faster sync everywhere"></div>'+
  dr.items.map(function(it,i){return '<div class="clit" data-cli="'+i+'"><div class="row"><input class="fin clbig" data-clk="big" maxlength="8" value="'+esc(it.big)+'" placeholder="Word"><input class="fin" data-clk="h" maxlength="60" value="'+esc(it.h)+'" placeholder="Title" style="flex:1"></div><textarea class="fin" data-clk="p" rows="2" maxlength="280" placeholder="One or two sentences">'+esc(it.p)+'</textarea><div class="chips">'+N.apps().map(function(a){return '<button class="chip'+(it.apps.indexOf(a.k)>=0?' on':'')+'" data-clapp="'+esc(a.k)+'">'+esc(a.name)+'</button>'}).join('')+'</div></div>'}).join('')+
  '<div class="row" style="margin-top:8px"><button id="fClAdd">＋ Item</button><div class="sp"></div><button id="fClCp">Copy</button><button class="pri" id="fClDl">Download</button></div>'+
  '<div class="sub" style="margin-top:6px">Saved on this phone as you type. Copy gives a line per app; Download gives the homepage “What’s new” block as HTML to commit (or hand to Tab). The apps have no shared what’s-new feed for this page to post into, so nothing is published from here.</div>'}
function clRead(){var t=$('#fClT');if(!t)return null;var dr={t:t.value,items:[]};document.querySelectorAll('.clit').forEach(function(el){var g=function(k){return el.querySelector('[data-clk="'+k+'"]').value};dr.items.push({big:g('big'),h:g('h'),p:g('p'),apps:[].slice.call(el.querySelectorAll('[data-clapp].on')).map(function(x){return x.dataset.clapp})})});S('np_f_cl',dr);return dr}
function clText(dr){var per={};dr.items.forEach(function(it){(it.apps.length?it.apps:N.apps().map(function(a){return a.k})).forEach(function(k){(per[k]=per[k]||[]).push(it)})});
 return Object.keys(per).map(function(k){return appName(k)+' — what’s new'+(dr.t?': '+dr.t:'')+'\n'+per[k].map(function(it){return '• '+it.h+(it.p?' — '+it.p:'')}).join('\n')}).join('\n\n')}
function clHtml(dr){var day=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Los_Angeles'});
 return '<section id="new" style="padding-top:0">\n  <div class="wrap">\n    <div class="sec-head rv"><span class="eyebrow"><span class="dot"></span>What\'s new · '+esc(day)+'</span><h2>'+esc(dr.t)+'</h2></div>\n    <div class="tiles">\n'+
  dr.items.filter(function(it){return it.h}).map(function(it){return '      <div class="tile rv"><div class="big grad">'+esc(it.big||'New')+'</div><h3>'+esc(it.h)+'</h3><p>'+esc(it.p)+'</p></div>\n'}).join('')+'    </div>\n  </div>\n</section>\n'}

/* ===== 19. Invite with a role (one-time temp password = the sign-in only works once before they must set their own) ===== */
function invite(){if(!can('manage_users'))return;var U=N.users();if(!U){N.loadUsers().then(invite);return}
 var me=N.me(),roles=U.roles.filter(function(r){return r.name!=='owner'&&(me.role==='owner'||r.caps.indexOf('manage_users')<0)});
 var m=modal('<h3>✉️ Invite someone</h3><div class="fl"><span>Their username</span><input id="fIu" maxlength="40" autocapitalize="none" autocorrect="off" spellcheck="false"></div><div class="fl"><span>Role</span><select id="fIr" class="sm">'+roles.map(function(r){return '<option value="'+esc(r.name)+'">'+esc(r.label)+' — '+esc(r.caps.length+' permissions')+'</option>'}).join('')+'</select></div><p>Makes the user with a random one-time password. It works for one sign-in, then they must pick their own. You get a message to send them yourself.</p><div class="row" style="justify-content:flex-end"><button data-close>Cancel</button><button class="pri" id="fIgo">Create invite</button></div>');
 m.querySelector('#fIgo').addEventListener('click',function(){var u=m.querySelector('#fIu').value.trim(),r=m.querySelector('#fIr').value;if(!/^[a-z0-9._-]{2,40}$/i.test(u)){N.toast('Username: letters, numbers, . _ -');return}
  var A='abcdefghjkmnpqrstuvwxyz23456789',x=crypto.getRandomValues(new Uint8Array(12)),pw='';for(var i=0;i<12;i++)pw+=A[x[i]%A.length];pw=pw.slice(0,4)+'-'+pw.slice(4,8)+'-'+pw.slice(8);this.disabled=true;
  N.uop({op:'create',username:u,password:pw,role:r},'@'+u.toLowerCase()+' invited').then(function(j){if(!j||!j.ok){m.remove();return}
   var msg='You\'re invited to Northpeak Admin as '+(roles.filter(function(z){return z.name===r})[0]||{}).label+'.\n'+location.origin+location.pathname+'\nUsername: '+u.toLowerCase()+'\nOne-time password: '+pw+'\nIt works once; you\'ll set your own right after signing in.';
   m.querySelector('.box').innerHTML='<h3>Invite ready</h3><p>Send this yourself. The password isn’t saved here and won’t be shown again.</p><pre class="fpre" id="fImsg">'+esc(msg)+'</pre><div class="row" style="justify-content:flex-end"><button id="fIcp">Copy</button><button class="pri" data-close>Done</button></div>';
   m.querySelector('#fIcp').addEventListener('click',function(){navigator.clipboard&&navigator.clipboard.writeText(msg).then(function(){N.toast('Copied')},function(){N.toast('Press and hold to copy')})});pw=null})})}

/* ===== 10. Panic logout ===== */
function panic(){if(!confirm('PANIC LOGOUT\n\nEnds every monitoring session (and opens each account’s sign-out), logs this panel out on the server, and wipes this panel’s data from this phone.'))return;
 if(window.NPApps&&NPApps.panic)NPApps.panic(); /* provider sign-out tabs for open monitoring sessions; /api/logout below ends the sessions themselves */
 ['np_f_canary','np_f_canary_seen','np_f_buy','np_f_age','np_f_cl','np_sec'].forEach(function(k){try{localStorage.removeItem(k)}catch(e){}});try{sessionStorage.removeItem('np_f_undo');sessionStorage.removeItem('np_mon')}catch(e){}
 N.logout('Panic logout done · this phone is clean')}

/* ===== the Pulse tab ===== */
function radarBox(){var b=box('fFr');if(!b)return;var f=radar(),tc=trippedCanaries(),cn=canaries();
 b.innerHTML=(tc.length?tc.map(function(x){return '<div class="falert">🪤 Canary <span class="mono">'+esc(x.k.code)+'</span> was used'+(x.c.by?' by '+esc(x.c.by):'')+(x.k.where?' — planted in '+esc(x.k.where):'')+'. That place leaked.</div>'}).join(''):'')+
  (f.length?f.map(function(x){return '<div class="lg"><span class="ic">🚨</span><div><span class="code" data-copy="'+esc(x.c.code)+'">'+esc(x.c.code)+'</span> '+tag(x.c.app)+'<div class="l2">'+esc(x.why.join(' · '))+'</div></div><button data-fau="'+esc(x.c.code)+'" data-capp="'+esc(x.c.app)+'">🔎</button></div>'}).join(''):'<div class="sub">No code is on more than one account'+(acctList()?'':' (open Accounts to check accounts)')+'.</div>')+
  (cn.length?'<div class="sub" style="margin-top:8px">Canaries: '+cn.map(function(k){return '<span class="mono">'+esc(k.code)+'</span>'+(k.where?' ('+esc(k.where)+')':'')}).join(', ')+'</div>':'')+
  '<div class="sub" style="margin-top:6px">Codes are single-use per account, so the radar flags a code that shows up on 2+ different accounts (or 3+ devices where an app reports devices). Canary = a real code you plant somewhere and never give out; mark one from 🔎 on any code. If it’s ever used, it shows here in red. Failed tries of a wrong code aren’t reported by the apps.</div>'}
function isOn(){var v=$('#v-pulse');return !!(v&&!v.hidden)}
function build(){var v=$('#v-pulse');if(!v||v.dataset.built)return;v.dataset.built='1';
 v.innerHTML=card('fBr','☀️','Since yesterday')+card('fHb','💓','Revenue heartbeat')+card('fHl','🩺','App health','<button id="fHlR" aria-label="recheck">↻</button>')+
  card('fFr','🚨','Fraud radar + canaries')+card('fCa','⏳','Old unused codes')+card('fBm','🛒','Buyer map')+card('fLc','🗓','Admin sign-ins','<button id="fLcR" aria-label="reload">↻</button>')+
  card('fBy','⏸','Buying switch')+card('fTl','🎞','Bot timeline')+card('fUn','↩️','Undo')+card('fCl','📝','What’s new composer')}
function renderPulse(){if(!isOn())return;build();
 hideP('fBrP',false);hideP('fHbP',!can('view_requests'));hideP('fBmP',!can('view_requests'));hideP('fFrP',!(can('mint_codes')||can('revoke_codes')));hideP('fCaP',!(can('mint_codes')||can('revoke_codes')));
 hideP('fLcP',!can('view_logs'));hideP('fByP',!can('toggle_buying'));hideP('fTlP',!owner());hideP('fClP',false);
 briefing();if(can('view_requests')){heartbeat();buyerMap()}health();radarBox();codeAge();if(can('view_logs'))logins();if(can('toggle_buying'))buying();if(owner()){loadBots();timeline()}undoBox();if(!$('#fClT'))clBox()}

/* ---------- wiring ---------- */
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('button,[data-fti]');if(!t)return;var d=t.dataset;
 if(d.fau){autopsy(d.fau,d.capp);return}
 if(d.frf){refund(t.closest('.acts').dataset.app,t.closest('.acts').dataset.id);return}
 if(d.fexp){if(!confirm('Expire (revoke) '+d.fexp+'? It stops working.'))return;t.disabled=true;N.act(d.capp,d.capp==='syn'?'revoke':'code-delete',{code:d.fexp},'Expired');return}
 if(d.ffz){var h=+d.ffz;if(!confirm('Close Synapse buying for '+h+' h?'))return;var P=plans().filter(function(p){return p.kind!=='freeze'});P.push({at:Date.now()+h*3600000,open:true,kind:'freeze'});S('np_f_buy',P);setOpen(false,'for '+h+' h').then(buying);return}
 if(d.fbo){S('np_f_buy',plans().filter(function(p){return p.kind!=='freeze'}));setOpen(true).then(buying);return}
 if(d.fbx!=null){var Q=plans().sort(function(x,y){return x.at-y.at});Q.splice(+d.fbx,1);S('np_f_buy',Q);buying();return}
 if(t.id==='fBs'){var tv=$('#fBt').value,at=Date.parse(tv);if(!tv||!at||at<Date.now()){N.toast('Pick a time in the future');return}var P2=plans();P2.push({at:at,open:$('#fBk').value==='1',kind:'sched'});S('np_f_buy',P2);N.toast('Scheduled · '+N.fmtT(at));buying();return}
 if(d.fun){runUndo(d.fun);return}
 if(d.ftl){TL.id=d.ftl;TL.i=1e9;timeline();return}
 if(d.ftp){TL.i+=+d.ftp;timeline();return}
 if(d.fti!=null){TL.i=+d.fti;timeline();return}
 if(t.id==='fHlR'){checkHealth();return}
 if(t.id==='fLcR'){LC.rows=null;logins();return}
 if(d.clapp){t.classList.toggle('on');clRead();return}
 if(t.id==='fClAdd'){var dr=clRead();dr.items.push({h:'',p:'',big:'',apps:[]});S('np_f_cl',dr);clBox();return}
 if(t.id==='fClCp'){var c=clRead();if(!c.items.some(function(i){return i.h})){N.toast('Add a title first');return}var tx=clText(c);navigator.clipboard&&navigator.clipboard.writeText(tx).then(function(){N.toast('Copied for every app')},function(){N.toast('Couldn’t copy')});return}
 if(t.id==='fClDl'){var c2=clRead();if(!c2.items.some(function(i){return i.h})){N.toast('Add a title first');return}var bl=new Blob([clHtml(c2)+'\n<!--\n'+clText(c2)+'\n-->\n'],{type:'text/html'}),a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download='whats-new-'+new Date().toISOString().slice(0,10)+'.html';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},4000);return}
 if(t.id==='fInv'){invite();return}
 if(t.id==='fPanic'){panic();return}
});
document.addEventListener('input',function(e){var t=e.target;if(t.id==='fCaR'){S('np_f_age',+t.value);var dd=$('#fCaD');if(dd)dd.textContent=t.value;clearTimeout(t._t);t._t=setTimeout(codeAge,250);return}
 if(t.closest&&t.closest('#fClP'))clRead()});

/* extra buttons in existing places: Invite (Users tab), Panic (account panel) */
(function(){var u=$('#v-users .panel');if(u){var b=document.createElement('button');b.id='fInv';b.className='wide';b.style.marginTop='8px';b.textContent='✉️ Invite with a one-time password';u.appendChild(b)}
 var mp=$('#mePanel .row:last-child');if(mp){var p=document.createElement('button');p.id='fPanic';p.className='dang';p.textContent='🧯 Panic logout';mp.appendChild(p)}})();

window.NPF={
 show:function(){renderPulse();checkHealth();loadBrief()},
 onData:function(){runPlans();var tc=trippedCanaries(),seen=L('np_f_canary_seen',[]),nw=tc.filter(function(x){return seen.indexOf(x.k.code)<0});
  if(nw.length){N.toast('🪤 Canary code '+nw[0].k.code+' was used!');S('np_f_canary_seen',seen.concat(nw.map(function(x){return x.k.code})))}
  if(isOn()){briefing();if(can('view_requests')){heartbeat();buyerMap()}radarBox();codeAge();if(can('toggle_buying'))buying()}else if(can('view_requests')&&N.data())heartbeatSeen()},
 codeBtn:function(c){return '<button data-fau="'+esc(c.code)+'" data-capp="'+esc(c.app)+'" aria-label="code details">🔎</button>'},
 reqBtn:function(r){return r.status==='paid'&&r.code&&r.code.indexOf('•')<0&&N.can('revoke_codes')&&N.can('notes')?'<button data-frf="1">Refund</button>':''},
 onLogout:function(){try{sessionStorage.removeItem('np_f_undo')}catch(e){}SEEN=null;BOTL=null;BOTA=null;LC.rows=null;BR.at=0;var v=$('#v-pulse');if(v){v.innerHTML='';delete v.dataset.built}}
};
/* the sign-in answer can land before apps.js / this file have loaded (seen headless): draw the tabs again so Pulse and Apps show, and let Apps restore an open session's red bar */
if(N.me()){N.tabs();if(window.NPApps)NPApps.boot()}
function heartbeatSeen(){var P=paidRows(),ids=P.map(function(r){return r.app+':'+r.id});if(SEEN){var nw=ids.filter(function(x){return SEEN.indexOf(x)<0});if(nw.length){PULSE=Date.now();N.toast('💸 New sale')}}SEEN=ids}
})();
