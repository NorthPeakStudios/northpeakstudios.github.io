/* Northpeak Admin app (moved out of index.html Oct 21, 2026 so the page can run under a strict Content-Security-Policy: no inline scripts) */
(function(){
var API=/\.sites\.tab\.bot$/.test(location.hostname)?'':'https://northpeak-admin.sites.tab.bot';
var TK_KEY='np_admin_session', ME=null, D=null, filt='all', hideTest=false, view='req', NOTES={}, U=null, LG={u:'',kind:'',items:[]}, setupKey='';
/* ===== THE APP LIST (np-apps v2, Oct 25 2026) =====
   One entry per Northpeak app, in the order the section bar shows them. A new app = one more line here: it gets its own
   section (requests, stats, sheet rows, codes, accounts, owner-key log) with nothing else to change on this page.
   Its backend must live on *.sites.tab.bot and speak the standard /api/pro/admin routes (list, codes, mint, mark,
   code-delete, accounts, acct-license, acct-delete, acct-reset, actlog) like Axon/Liminal/Cadence/Mindprint.
   k = the id the backend's admin tickets use · kdf = the app's login-key salt prefix (password resets) · views = extra
   tabs only that app's section shows. Synapse (syn) is the one older app with its own routes. */
var APPS=[
 {k:'syn',peer:'synapse',name:'Synapse',tag:'t-syn',base:'https://odin-cards.sites.tab.bot',open:'https://odin-cards.sites.tab.bot/',pro:'Synapse Lifetime',mint:{product:'synapse_lifetime'}},
 {k:'axon',name:'Axon',tag:'t-axon',base:'https://axon-sync.sites.tab.bot',open:'https://northpeakstudios.github.io/axon/',pro:'Axon Pro',kdf:'axon-sync/v1:'},
 {k:'liminal',name:'Liminal',tag:'t-lim',base:'https://liminal-sync.sites.tab.bot',open:'https://northpeakstudios.github.io/liminal/',pro:'Liminal Pro',kdf:'liminal-sync/v1:'},
 {k:'cadence',name:'Cadence',tag:'t-cad',base:'https://cadence-sync.sites.tab.bot',open:'https://northpeakstudios.github.io/cadence/',pro:'Cadence Pro',kdf:'cadence-sync/v1:'},
 {k:'mindprint',name:'Mindprint',tag:'t-mp',base:'https://mindprint.sites.tab.bot',open:'https://northpeakstudios.github.io/mindprint/',pro:'Mindprint Pro',kdf:'mindprint-sync/v1:',views:[['resp','Responses','manage_accounts']]},
 {k:'trace',name:'Trace',tag:'t-trc',base:'https://trace-sync.sites.tab.bot',open:'https://northpeakstudios.github.io/trace/',pro:'Trace Pro',kdf:'trace-sync/v1:'}
];
var AP={};APPS.forEach(function(a){AP[a.k]=a;a.tag=a.tag||'t-app'});
var BASE={},PEER={};APPS.forEach(function(a){BASE[a.k]=a.base;PEER[a.peer||a.k]=a.base});
var SEC='all';try{SEC=localStorage.getItem('np_sec')||'all'}catch(e){}if(SEC!=='all'&&!AP[SEC])SEC='all';
function AK(){return APPS.map(function(a){return a.k})}
function inSec(k){return SEC==='all'||SEC===k}
function appName(k){return AP[k]?AP[k].name:k}
function aTag(k){return '<span class="tag '+(AP[k]?AP[k].tag:'t-app')+'">'+esc(appName(k))+'</span>'}
function allNames(){var n=APPS.map(function(a){return a.name});return n.slice(0,-1).join(', ')+' and '+n[n.length-1]}
var CAPN={view_requests:'see requests',approve:'mark paid',mint_codes:'make codes',dismiss:'dismiss / decline',notes:'add notes',delete:'delete',revoke_codes:'revoke codes',toggle_buying:'open/close buying',view_sheet:'see sheet',view_logs:'see logs',manage_users:'manage users',manage_accounts:'app accounts (owner only)'};
var $=function(s){return document.querySelector(s)};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toast(t){var e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(function(){e.classList.remove('on')},2800)}
function tok(){try{var s=JSON.parse(localStorage.getItem(TK_KEY)||'null');return s&&s.exp>Date.now()?s.token:''}catch(e){return ''}}
function setTok(j){if(j)localStorage.setItem(TK_KEY,JSON.stringify({token:j.token,exp:j.exp}));else localStorage.removeItem(TK_KEY)}
function CAN(c){return !!(ME&&ME.caps.indexOf(c)>=0)}
function japi(u,o){o=o||{};var ac=window.AbortController?new AbortController():null,tm=ac?setTimeout(function(){ac.abort()},15000):0;if(ac)o.signal=ac.signal; /* np-apps v2: 15 s cap per call, so one app that never answers can't freeze the page */
 return fetch(u,o).then(function(r){clearTimeout(tm);return r.json().catch(function(){return{ok:false,error:'http_'+r.status}})},function(e){clearTimeout(tm);return{ok:false,error:e&&e.name==='AbortError'?'timeout':'unreachable'}})}
function api(p,b,extra){var h={'content-type':'application/json'};var t=tok();if(t)h.authorization='Bearer '+t;if(extra)for(var k in extra)h[k]=extra[k];
 return japi(API+p,{method:b?'POST':'GET',headers:h,body:b?JSON.stringify(b):undefined,cache:'no-store'}).then(function(j){if(j&&j.error==='signed_out'&&ME){if(window.NPApps)NPApps.onSignedOut();ME=null;setTok(null);show('login');toast('Signed out — sign in again')}return j})}
var RT={};
function appApi(app,path,body,retry){
 var k=app+':'+path, p;
 if(!body&&RT[k]&&RT[k].exp>Date.now())p=Promise.resolve(RT[k]);
 else p=api('/api/ticket',{app:app,path:path,body:body||null}).then(function(j){if(j.ok&&!body)RT[k]={t:j.t,exp:Date.now()+240000};return j});
 return p.then(function(tk){if(!tk.ok&&!tk.t)return tk;
  return japi(BASE[app]+'/api/pro/admin/'+path,{method:body?'POST':'GET',headers:body?{'x-np-sess':tk.t,'content-type':'application/json'}:{'x-np-sess':tk.t},body:body?tk.raw:undefined,cache:'no-store'}).then(function(j){
   if(!body&&!j.ok&&!retry&&/ticket|forbidden/.test(j.error||'')){delete RT[k];return appApi(app,path,body,true)}
   if(body&&tk.log)api('/api/result',{log:tk.log,ok:!!j.ok,err:j.ok?(j.code?'code '+j.code:''):(j.error||'error')});
   return j})})}
function hop(j,n,trail){n=n||0;trail=trail||[];if(!j||!j.relay||n>3||!PEER[j.relay.to])return Promise.resolve(trail);var rl=j.relay;
 return japi(PEER[rl.to]+rl.path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({m:rl.m,sig:rl.sig})}).then(function(k){trail.push({to:rl.to,ok:!!(k&&k.ok),error:k&&k.error});return hop(k,n+1,trail)})}
function fmtT(ms){if(!ms)return'';var d=new Date(ms);return d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Los_Angeles'})}
function money(n){return '$'+(Math.round(n*100)/100).toLocaleString('en-US')}

/* ---------- screens ---------- */
function show(w){['boot','login','setup','chpw','app'].forEach(function(id){$('#'+id).hidden=id!==w})}
function boot(){
 var h=decodeURIComponent((location.hash||'').slice(1)).trim();
 if(h&&h.length>=16){setupKey=h;history.replaceState(null,'',location.pathname+location.search);
  return api('/api/setup',null,{'x-np-admin':setupKey}).then(function(j){
   if(!j.ok){show('login');$('#lerr').textContent=j.error==='too_many_tries'?'Too many tries — wait 15 min.':'That setup link didn’t work.';return}
   show('setup');if(j.owner){$('#sh').textContent='Reset owner password';$('#sp').textContent='Owner account: @'+j.owner+'. Set a new password (signs out the owner everywhere else).';$('#suw').hidden=true;$('#sbtn').textContent='Reset password'}})}
 if(!tok()){show('login');return Promise.resolve()}
 return me()}
function me(){return api('/api/me').then(function(j){if(!j.ok){setTok(null);show('login');return}ME=j;
 if(j.must){show('chpw');$('#chCancel').hidden=true;$('#chpwp').textContent='You signed in with a temporary password. Choose your own to continue.';return}
 startApp()})}
$('#login').addEventListener('submit',function(e){e.preventDefault();$('#lerr').textContent='';
 api('/api/login',{username:$('#lu').value,password:$('#lp').value}).then(function(j){if(!j.ok){$('#lerr').textContent=j.words||(j.error==='unreachable'?'Can’t reach the server':'Sign-in failed');return}
  setTok(j);$('#lp').value='';me()})});
$('#setup').addEventListener('submit',function(e){e.preventDefault();$('#serr').textContent='';
 if($('#sp1').value!==$('#sp2').value){$('#serr').textContent='Passwords don’t match';return}
 api('/api/setup',{username:$('#su').value,password:$('#sp1').value},{'x-np-admin':setupKey}).then(function(j){if(!j.ok){$('#serr').textContent=j.words||j.error;return}
  setupKey='';$('#sp1').value=$('#sp2').value='';setTok(j);toast(j.created?'Owner account created':'Owner password reset');me()})});
$('#toLogin').addEventListener('click',function(e){e.preventDefault();setupKey='';show('login')});
$('#chpw').addEventListener('submit',function(e){e.preventDefault();$('#cerr').textContent='';
 if($('#c1').value!==$('#c2').value){$('#cerr').textContent='Passwords don’t match';return}
 api('/api/password',{old:$('#c0').value,new:$('#c1').value}).then(function(j){if(!j.ok){$('#cerr').textContent=j.words||j.error;return}
  $('#c0').value=$('#c1').value=$('#c2').value='';toast('Password saved');me()})});
$('#chCancel').addEventListener('click',function(e){e.preventDefault();show('app')});

/* ---------- app ---------- */
var TABS=[['req','Requests','view_requests'],['sheet','Sheet','view_sheet'],['more','Codes & apps',['mint_codes','revoke_codes','toggle_buying']],['users','Users','manage_users'],['acct','Accounts','manage_accounts'],['logs','Logs','view_logs'],['apps','Apps','@owner']]; /* np-apps-tab v1: Apps = every app + bot accounts, the owner only (apps.js) */
function tabOk(t){var c=t[2];if(c==='@owner')return !!(ME&&ME.role==='owner'&&window.NPApps);return typeof c==='string'?CAN(c):c.some(CAN)}
function secTabs(){var x=SEC!=='all'&&AP[SEC]&&AP[SEC].views||[];return TABS.concat(x).filter(tabOk)} /* np-apps v2: an app's own extra tabs (Mindprint: Responses) show in its section */
var VIEWS=['req','sheet','more','users','acct','logs','resp','apps'];
function renderSecbar(){var b=$('#secbar');if(!b)return;b.innerHTML=[['all','All']].concat(APPS.map(function(a){return [a.k,a.name]})).map(function(x){return '<button data-sec="'+x[0]+'" class="'+(x[0]===SEC?'on':'')+'">'+(x[0]==='all'?'':'<i class="dot '+AP[x[0]].tag+'"></i>')+esc(x[1])+'</button>'}).join('');var on=b.querySelector('.on');if(on&&on.scrollIntoView)try{on.scrollIntoView({block:'nearest',inline:'center'})}catch(e){}}
function renderTabs(){var T=secTabs();if(!T.some(function(t){return t[0]===view}))view=T.length?T[0][0]:'';$('#tabs').innerHTML=T.map(function(t){return '<button data-v="'+t[0]+'" class="'+(t[0]===view?'on':'')+'">'+t[1]+'</button>'}).join('');$('#tabs').hidden=T.length<2}
function setSec(k){if(k!=='all'&&!AP[k])k='all';SEC=k;if(k!=='all')MSEL=k;else if(!MAPP[MSEL])MSEL='syn';try{localStorage.setItem('np_sec',k)}catch(e){}if(view==='req'&&filt==='aa'&&k!=='all')filt='all';renderSecbar();renderTabs();switchView(view);if(D)render();if(view==='acct'&&AC.data)renderAccounts();window.scrollTo(0,0)}
function startApp(){
 show('app');$('#mePanel').hidden=true;
 $('#av').textContent=ME.u.charAt(0).toUpperCase();$('#whoName').textContent='@'+ME.u;$('#whoRole').textContent=ME.roleLabel;$('#whoRole').className='rl '+ME.role;
 $('#meName').textContent='@'+ME.u+' · '+ME.roleLabel;$('#meCaps').textContent='can: '+ME.caps.map(function(c){return CAPN[c]||c}).join(', ');
 renderSecbar();renderTabs();$('#statsBox').hidden=!CAN('view_requests');
 $('#mintPanel').hidden=!CAN('mint_codes');$('#codesPanel').hidden=!(CAN('revoke_codes')||CAN('mint_codes'));
 switchView(view);load();if(window.NPApps)NPApps.boot();}
function switchView(v){view=v;document.querySelectorAll('#tabs button').forEach(function(b){b.classList.toggle('on',b.dataset.v===v)});VIEWS.forEach(function(x){var el=$('#v-'+x);if(el)el.hidden=x!==v});var sb=$('#statsBox');if(sb&&ME)sb.hidden=!CAN('view_requests')||v==='apps';
 if(v==='users')loadUsers();if(v==='acct'){if(AC.data)renderAccounts();else loadAccounts()}if(v==='logs'){loadLogs();loadActlog()}if(v==='resp')loadResp();if(v==='apps'&&window.NPApps)NPApps.show()}
var MAPP={},MSEL='syn';APPS.forEach(function(a){MAPP[a.k]={app:a.k,body:a.mint||{},name:a.pro,works:a.name}});MAPP.all={app:'syn',body:{product:'all_access'},name:'All-Access',works:allNames()};
function CODES_OK(){return CAN('mint_codes')||CAN('revoke_codes')}
function loadAll(){ /* np-apps v2: one list call (and one codes call) per app in APPS */
 var V=CAN('view_requests'), jobs=[CAN('view_sheet')?api('/api/sheet?t='+Date.now()):Promise.resolve(null),V?api('/api/notes'):Promise.resolve(null)];
 APPS.forEach(function(a){jobs.push(V?appApi(a.k,'list'):Promise.resolve(null));jobs.push(a.k!=='syn'&&CODES_OK()?appApi(a.k,'codes'):Promise.resolve(null))});
 return Promise.all(jobs).then(function(v){NOTES={};((v[1]&&v[1].notes)||[]).forEach(function(n){NOTES[n.k]=n});
  var o={ok:true,at:Date.now(),sheet:v[0]&&v[0].sheet,sheetErr:v[0]&&!v[0].ok?(v[0].error||'error'):'',L:{},C:{}};
  APPS.forEach(function(a,i){o.L[a.k]=v[2+2*i]||{};o.C[a.k]=v[3+2*i]||{};o[a.k]=o.L[a.k]});return o})}
function rows(){
 var out=[];
 APPS.forEach(function(ap){((D.L[ap.k]&&D.L[ap.k].requests)||[]).forEach(function(r){
  if(ap.k==='syn')out.push({app:'syn',id:r.id,t:r.t,name:r.name,contact:r.contact,email:r.email,username:'',plan:r.plan,plan_name:r.plan_name,price:r.price||r.charge,amount:+r.amount||0,status:r.status,code:r.code,mirror:!!r.mirror,link:r.link});
  else out.push({app:ap.k,id:r.id,t:Date.parse(r.created_at)||r.t||0,name:r.name,contact:r.phone||r.contact,username:r.username,plan:r.plan,plan_name:r.plan_name,price:r.price,amount:+r.amount||0,status:r.status,code:r.code,mirror:!!r.mirror,link:r.link,pro:r.pro})})});
 var keep=out.filter(function(r){return !r.mirror});
 out.forEach(function(r){if(r.mirror){var o=keep.filter(function(k){return k.app!==r.app&&(k.id===r.link||k.link===r.id)})[0];if(o){if(!o.code&&r.code)o.code=r.code;}else keep.push(r);}});
 keep.forEach(function(r){r.aa=r.plan==='all_access';r.note=NOTES[r.app+':'+r.id]});
 keep.sort(function(x,y){return (y.t||0)-(x.t||0)});
 return keep;
}
function stats(R,ALL){
 var real=R.filter(function(r){return r.status!=='test'});var paid=real.filter(function(r){return r.status==='paid'});
 $('#sTot').textContent=real.length;$('#sPaid').textContent=paid.length;$('#sMoney').textContent=money(paid.reduce(function(s,r){return s+(r.amount||0)},0));
 var pend=real.filter(function(r){return r.status==='new'}).length;$('#sPend').textContent=pend;
 pend=(ALL||R).filter(function(r){return r.status==='new'}).length; /* the icon badge counts every app */
 /* np-r2: pending count on the browser tab and the home-screen icon, so a new buyer shows without opening the page */
 document.title=(pend?'('+pend+') ':'')+'Northpeak Admin';
 try{if(navigator.setAppBadge){if(pend)navigator.setAppBadge(pend).catch(function(){});else navigator.clearAppBadge().catch(function(){})}}catch(e){}}
/* np-r2: tap a stat to jump to those requests */
(function(){var go=function(f){return function(){if(!CAN('view_requests'))return;filt=f;switchView('req');renderReq();}};
 [['sTot','all'],['sPaid','paid'],['sMoney','paid'],['sPend','new']].forEach(function(x){var el=document.getElementById(x[0]);if(el&&el.parentNode){el.parentNode.style.cursor='pointer';el.parentNode.setAttribute('role','button');el.parentNode.addEventListener('click',go(x[1]));}})})();
function FILTERS(){var f=[['all','All'],['new','Pending'],['paid','Paid']];if(SEC==='all')f.push(['aa','All-Access']);f.push(['hide','Hide tests']);return f} /* np-apps v2: the app picker moved up to the section bar */
function secRows(R){return SEC==='all'?R:R.filter(function(r){return r.app===SEC&&!r.aa})}
function chips(R){var c=function(k){return R.filter(function(r){return match(r,k)}).length};
 $('#chips').innerHTML=FILTERS().map(function(f){var on=f[0]==='hide'?hideTest:filt===f[0];return '<button class="chip'+(on?' on':'')+'" data-f="'+f[0]+'">'+f[1]+(f[0]==='hide'?'':' '+c(f[0]))+'</button>'}).join('')}
function match(r,k){if(k==='all')return true;if(k==='new')return r.status==='new';if(k==='paid')return r.status==='paid';if(k==='aa')return r.aa;if(AP[k])return r.app===k&&!r.aa;return true}
function appTag(r){return r.aa?'<span class="tag t-aa">All-Access</span>':aTag(r.app)}
function stTag(s){return '<span class="tag s-'+esc(s)+'">'+esc(s==='new'?'pending':s)+'</span>'}
function contact(r){var c=String(r.contact||'').trim();if(!c)return r.email?esc(r.email):'';var d=c.replace(/[^\d+]/g,'');if(d.replace(/\D/g,'').length>=10)return '<a href="sms:'+esc(d)+'">'+esc(c)+'</a>';if(c.indexOf('@')>0)return '<a href="mailto:'+esc(c)+'">'+esc(c)+'</a>';return esc(c)}
function acts(r){
 var b=[];var open=r.status==='new'||r.status==='test';
 if(r.app==='syn'){if(open){if(CAN('approve'))b.push('<button class="pri" data-a="paid">Mark paid + code</button>');if(CAN('dismiss'))b.push('<button data-a="dismiss">Dismiss</button>')}}
 else{if(open){if(CAN('approve'))b.push('<button class="pri" data-a="paid">Mark paid</button>');if(CAN('dismiss'))b.push('<button data-a="decline">Decline</button>')}
  if((r.status==='paid'||r.status==='declined')&&CAN('approve'))b.push('<button data-a="undo">Back to pending</button>')}
 if(CAN('notes'))b.push('<button data-a="note">'+(r.note?'Edit note':'Note')+'</button>');
 if(CAN('delete'))b.push('<button class="dang" data-a="delete">Delete</button>');
 return b.length?'<div class="acts" data-app="'+r.app+'" data-id="'+esc(r.id)+'">'+b.join('')+'</div>':'';
}
function renderReq(){
 var ALL=rows(),R=secRows(ALL);stats(R,ALL);chips(R);
 var V=R.filter(function(r){return match(r,filt)&&!(hideTest&&r.status==='test')});
 $('#req tbody').innerHTML=V.map(function(r){
  var price=esc(r.price||money(r.amount))+(r.plan_name&&String(r.price||'').indexOf('(')<0?' <span class="sub">('+esc(r.plan_name)+')</span>':'');
  var masked=r.code&&r.code.indexOf('•')>=0;
  return '<tr class="'+(r.status==='test'?'test':'')+'">'+
  '<td class="c-top">'+appTag(r)+stTag(r.status)+'<span class="sub">'+esc(fmtT(r.t))+'</span></td>'+
  '<td class="c-app">'+appTag(r)+'</td><td class="c-time sub">'+esc(fmtT(r.t))+'</td>'+
  '<td class="c-name">'+esc(r.name||'—')+'</td><td class="c-contact">'+contact(r)+'</td>'+
  '<td class="c-user">'+(r.username?(/@/.test(r.username)?'':'@')+esc(r.username):'')+'</td><td class="c-price">'+price+'</td>'+
  '<td class="c-status">'+stTag(r.status)+'</td>'+
  '<td class="c-code">'+(r.code?(masked?'<span class="mono">code hidden for your role</span>':'<span class="code" data-copy="'+esc(r.code)+'">'+esc(r.code)+'</span>'):'')+'</td>'+
  '<td class="c-id mono">'+esc(r.id)+'</td>'+
  '<td class="c-note">'+(r.note?'<div class="note">📝 '+esc(r.note.txt)+' <span class="sub">— @'+esc(r.note.u)+'</span></div>':'')+'</td>'+
  '<td class="c-acts">'+acts(r)+'</td></tr>'}).join('');
 $('#reqEmpty').hidden=V.length>0;}
function tableHTML(head,body){return '<table><thead><tr>'+head.map(function(h){return '<th>'+esc(h)+'</th>'}).join('')+'</tr></thead><tbody>'+(body.length?body.map(function(r){return '<tr>'+r.map(function(c,i){return '<td data-l="'+esc(head[i]||'')+'">'+c+'</td>'}).join('')+'</tr>'}).join(''):'<tr><td colspan="'+head.length+'" class="sub">nothing yet</td></tr>')+'</tbody></table>'}
function tsec(ms){return ms?new Date(ms).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',second:'2-digit',timeZone:'America/Los_Angeles'}):''}
function sheetRowApp(r,h){var c=String(r[h.indexOf('Charge')]||'').toLowerCase();if(c.indexOf('all-access')>=0)return 'aa';for(var i=0;i<APPS.length;i++)if(c.indexOf(APPS[i].name.toLowerCase())>=0)return APPS[i].k;return 'syn'}
function badApps(){var e=[];if(CAN('view_requests'))APPS.forEach(function(a){if(!(D.L[a.k]&&D.L[a.k].ok))e.push(a.name)});return e}
function renderSheet(){ /* np-apps v2 (Oct 25 2026): the Sheet tab leads with the live rows (pulled fresh from every app on each refresh);
   the Google Sheet copy below only changes when Tab's box copies the sheet in, which is why it looked stuck */
 var s=D.sheet, nm=SEC==='all'?'all apps':appName(SEC), pl=function(n){return n+' row'+(n===1?'':'s')};
 if(s&&s.values&&s.values.length){var h=s.values[0],b=s.values.slice(1).reverse();if(SEC!=='all')b=b.filter(function(r){return sheetRowApp(r,h)===SEC});
  $('#sheetBox').innerHTML=tableHTML(h,b.map(function(r){return h.map(function(_,i){return esc(r[i]||'')})}));$('#sheetAt').textContent='· copied in '+fmtT(s.at)+' · '+pl(b.length);}
 else{$('#sheetBox').innerHTML='<div class="empty">'+(D.sheetErr?'Couldn’t load the copy ('+esc(D.sheetErr)+').':'No copy of the Google Sheet yet.')+'</div>';$('#sheetAt').textContent='';}
 if(CAN('view_requests')){var R=secRows(rows());$('#shN').textContent='· '+nm+' · '+pl(R.length);
  $('#liveBox').innerHTML=tableHTML(['Time (PT)','App','Name','Phone','Charge','Status','Request ID'],R.map(function(r){return [esc(fmtT(r.t)),r.aa?'All-Access':esc(appName(r.app)),esc(r.name),esc(r.contact||r.email||''),esc(r.price||money(r.amount)),esc(r.status==='new'?'pending':r.status),'<span class="mono">'+esc(r.id)+'</span>']}))}
 else{$('#shN').textContent='';$('#liveBox').innerHTML='<div class="empty">Your role can’t see live requests. The Google Sheet copy is below.</div>'}
 var e=badApps();$('#shUpd').innerHTML='Last updated <b>'+esc(tsec(D.at))+'</b> · live from the apps'+(e.length?' · <span style="color:var(--warn)">⚠ '+esc(e.join(', '))+' didn’t answer</span>':'');}
function renderMore(){ /* np-apps v2: one card per app in this section */
 var s=D.syn||{};
 $('#appsBox').innerHTML=APPS.filter(function(a){return inSec(a.k)}).map(function(a){var j=D.L[a.k]||{},info='';
  if(a.k==='syn')info=j.ok?((j.requests||[]).length)+' requests':'';else if(j.ok)info=(j.accounts||0)+' accounts · '+(j.pro_accounts||0)+' with Pro'+(j.quiz?' · quizzes: '+j.quiz.main+' main, '+j.quiz.deep+' Deep Dive':'');
  var right=a.k==='syn'?(j.ok&&CAN('toggle_buying')?'<button id="openT">Buying '+(j.open?'open ✅':'closed ⛔')+'</button>':j.ok?'<span class="sub">buying '+(j.open?'open':'closed')+'</span>':''):'';
  return '<div class="row appcard" style="justify-content:space-between"><div>'+aTag(a.k)+' <span class="sub">'+(j.ok?esc(info):CAN('view_requests')?'not loading':'')+'</span></div><div class="row">'+right+'<a class="btn" href="'+esc(a.open)+'" target="_blank" rel="noopener">Open '+esc(a.name)+' ↗</a></div></div>'}).join('');
 $('#mApp').innerHTML=APPS.filter(function(a){return inSec(a.k)}).map(function(a){return '<button type="button" class="ap'+(MSEL===a.k?' on':'')+'" data-mapp="'+a.k+'">'+aTag(a.k)+'<span class="sub">'+esc(a.pro)+'</span></button>'}).join('')+(SEC==='all'||SEC==='syn'?'<button type="button" class="ap'+(MSEL==='all'?' on':'')+'" data-mapp="all"><span class="tag t-aa">All-Access</span><span class="sub">works on all '+APPS.length+' · $100</span></button>':'');
 $('#mGo').textContent='Make '+(MSEL==='all'?'All-Access':MAPP[MSEL].works)+' code';
 var C=[];if(inSec('syn'))(s.codes||[]).forEach(function(c){if(SEC==='syn'&&c.product==='all_access')return;C.push({app:'syn',aa:c.product==='all_access',own:c.kind==='owner',bot:c.kind==='bot',code:c.code,note:c.note,created:c.created,revoked:c.revoked,used:c.used||c.redeemed,by:c.by})});
 APPS.forEach(function(a){if(a.k==='syn'||!inSec(a.k))return;((D.C[a.k]&&D.C[a.k].codes)||[]).forEach(function(c){C.push({app:a.k,code:c.code,note:c.note,created:c.created,used:c.used,by:c.by})})});
 C.sort(function(x,y){return (y.created||0)-(x.created||0)});$('#codesN').textContent=C.length?'· '+C.length:'';
 var tg=function(c){return c.bot?'<span class="tag t-aa">🤖 BOT</span>':c.own?'<span class="tag t-aa">👑 Owner</span>':c.aa?'<span class="tag t-aa">All-Access</span>':aTag(c.app)};
 $('#codesBox').innerHTML=tableHTML(['Code','App','Made','Status',''],C.map(function(c){var st=c.revoked?'<span class="tag s-dismissed">revoked</span>':c.used?'<span class="tag s-paid">used</span>'+(c.by?'<div class="sub">'+esc(c.by)+'</div>':''):'<span class="tag s-new">unused</span>';
  var b='';if(c.own||c.bot)b='<span class="sub">locked</span>';else if(CAN('revoke_codes')){if(c.app==='syn')b=(c.revoked?'':'<button data-c="revoke">Revoke</button>')+'<button class="dang" data-c="code-delete">Delete</button>';else b='<button class="dang" data-c="code-delete">Revoke</button>'}
  return ['<span class="code" data-copy="'+esc(c.code)+'">'+esc(c.code)+'</span>'+(c.note?'<div class="sub">'+esc(c.note)+'</div>':''),tg(c),esc(fmtT(c.created)),st,'<div class="acts" data-code="'+esc(c.code)+'" data-capp="'+c.app+'">'+b+'</div>']}));}
function render(){if(!D)return;if(CAN('view_requests'))renderReq();renderSheet();renderMore();
 var e=badApps();$('#upd').textContent='updated '+tsec(D.at)+(e.length?' · ⚠ '+e.join(' + ')+' not loading':'');
 if(view==='resp'&&RS.loaded)RS.render()}
var LOADING=null;
function load(quiet,force){if(!ME)return Promise.resolve();if(LOADING)return force?LOADING.then(function(){return load(quiet,true)}):LOADING; /* np-apps v2: never two loads at once (the 30 s timer used to stack them) */
 $('#rf').innerHTML='<span class="spin"></span>';
 LOADING=loadAll().then(function(j){D=j;render();if(view==='logs'&&quiet)loadLogs(true)}).catch(function(){if(!quiet)toast('Offline? Couldn’t reach the server')}).then(function(){LOADING=null;$('#rf').textContent='↻'});
 return LOADING}
function refreshNow(btn){if(btn){btn.disabled=true;btn.innerHTML='<span class="spin"></span> Refreshing…'}RT={};
 return load(false,true).then(function(){if(btn){btn.disabled=false;btn.textContent='↻ Refresh'}if(D)toast('Updated '+tsec(D.at))})}
function act(app,path,body,label){return appApi(app,path,body).then(function(j){
 if(!j.ok){toast(j.error==='no_permission'?'Your role can’t do that':'Didn’t work: '+(j.words||j.error||'error'));render();return j}
 return hop(j).then(function(tr){j.relays=tr;return j})}).then(function(j){if(!j.ok)return j;
 var bad=(j.relays||[]).filter(function(x){return !x.ok});
 toast((label||'Done')+(j.code?' · code '+j.code:'')+(bad.length?' · ⚠ other app not updated':((j.relays||[]).length?' · both apps ✓':'')));
 return load(true).then(function(){return j})})}

/* ---------- users + roles ---------- */
function roleLabel(n){var r=(U&&U.roles||[]).filter(function(x){return x.name===n})[0];return r?r.label:n}
function loadUsers(){return api('/api/users').then(function(j){if(!j.ok){$('#usersBox').innerHTML='<div class="empty">'+esc(j.words||j.error)+'</div>';return}U=j;renderUsers()})}
function renderUsers(){
 var owner=ME.role==='owner';
 var assignable=U.roles.filter(function(r){return r.name!=='owner'&&(owner||r.caps.indexOf('manage_users')<0)});
 $('#nr').innerHTML=assignable.map(function(r){return '<option value="'+esc(r.name)+'"'+(r.name==='manager'?' selected':'')+'>'+esc(r.label)+'</option>'}).join('');
 $('#usersBox').innerHTML=U.users.map(function(u){
  var prot=u.role==='owner'||u.u===ME.u;
  return '<div class="ucard" data-u="'+esc(u.u)+'"><div class="top"><span class="av">'+esc(u.u.charAt(0).toUpperCase())+'</span><b>@'+esc(u.u)+'</b><span class="rl '+esc(u.role)+'">'+esc(roleLabel(u.role))+'</span>'+(u.disabled?'<span class="tag s-dismissed">disabled</span>':'')+(u.must?'<span class="tag s-new">temp password</span>':'')+'</div>'+
  '<div class="sub">'+(u.last?'last sign-in '+esc(fmtT(u.last)):'never signed in')+(u.by&&u.by!=='setup-link'?' · added by @'+esc(u.by):'')+'</div>'+
  (prot?'':'<div class="row"><select class="sm" data-op="role">'+assignable.map(function(r){return '<option value="'+esc(r.name)+'"'+(r.name===u.role?' selected':'')+'>'+esc(r.label)+'</option>'}).join('')+'</select>'+
   '<button data-op="reset">Reset password</button><button data-op="'+(u.disabled?'enable':'disable')+'">'+(u.disabled?'Enable':'Disable')+'</button><button class="dang" data-op="delete">Delete</button></div>')+'</div>'}).join('');
 $('#rolesBox').innerHTML=U.roles.map(function(r){return '<div class="ucard"><div class="top"><span class="rl '+esc(r.name)+'">'+esc(r.label)+'</span>'+(r.builtin?'<span class="sub">built-in</span>':'<span class="sub">custom</span>')+(!r.builtin&&owner?'<span class="sp"></span><button data-role-edit="'+esc(r.name)+'">Edit</button><button class="dang" data-role-del="'+esc(r.name)+'">Delete</button>':'')+'</div><div class="caps">'+(r.caps.length?r.caps.map(function(c){return '<span class="cap">'+esc(CAPN[c]||c)+'</span>'}).join(''):'<span class="sub">nothing</span>')+'</div></div>'}).join('');
 $('#roleForm').hidden=!owner;
 $('#rcaps').innerHTML=U.caps.filter(function(c){return c!=='manage_accounts'}).map(function(c){return '<label><input type="checkbox" value="'+c+'">'+esc(CAPN[c]||c)+'</label>'}).join('');}
function uop(b,msg){return api('/api/users',b).then(function(j){if(!j.ok){toast(j.words||j.error);return j}toast(msg);loadUsers();return j})}

/* ---------- logs ---------- */
var ICON={monitor_start:'🔴',monitor_end:'⏹',bot_add:'➕',bot_edit:'✏️',bot_remove:'🗑',bot_refused:'⛔',view_bots:'👁',login:'🔓',login_fail:'⛔',login_blocked:'🚫',logout:'👋',setup_key_fail:'⛔',owner_created:'👑',owner_password_recovered:'🛟',password_change:'🔑',denied:'🚫'};
var KINDS=[['','All'],['logins','Logins'],['actions','Actions'],['fails','Failed']];
function loadLogs(quiet,more){
 var q='?u='+encodeURIComponent(LG.u)+'&kind='+LG.kind+(more&&LG.items.length?'&before='+LG.items[LG.items.length-1].id:'');
 $('#lgK').innerHTML=KINDS.map(function(k){return '<button class="chip'+(LG.kind===k[0]?' on':'')+'" data-lk="'+k[0]+'">'+k[1]+'</button>'}).join('');
 return api('/api/logs'+q).then(function(j){if(!j.ok){$('#logsBox').innerHTML='<div class="empty">'+esc(j.words||j.error)+'</div>';return}
  LG.items=more?LG.items.concat(j.logs):j.logs;
  var sel=$('#lgU'),cur=LG.u;sel.innerHTML='<option value="">Everyone</option>'+j.users.map(function(u){return '<option'+(u===cur?' selected':'')+' value="'+esc(u)+'">@'+esc(u)+'</option>'}).join('');
  $('#lgMore').hidden=j.logs.length<200;
  $('#logsBox').innerHTML=LG.items.length?LG.items.map(function(l){var ic=ICON[l.act]||(l.ok===0?'⚠️':'✅');
   var what=esc(String(l.act).replace(/_/g,' '))+(l.app?' · '+esc(APPN[l.app]||l.app):'')+(l.tgt?' · <span class="mono">'+esc(l.tgt)+'</span>':'')+(l.ok===0?' <span class="tag s-dismissed">failed</span>':'');
   return '<div class="lg"><span class="ic">'+ic+'</span><div><b>'+(l.u?'@'+esc(l.u):'unknown')+'</b>'+(l.role?' <span class="rl '+esc(l.role)+'">'+esc(l.role)+'</span>':'')+' '+what+'</div><div class="l2">'+esc(fmtT(l.t))+' · '+esc(l.ip||'')+' · '+esc(l.ua||'')+(l.det?' · '+esc(l.det):'')+'</div></div>'}).join(''):'<div class="empty">Nothing logged here.</div>'})}


/* ---------- owner-key changes (np-actlog v1): each backend's own log of admin calls made with its owner key ---------- */
var ACTN={mint:'made a code',grant:'gave Pro','code-delete':'deleted a code',revoke:'revoked a code',reset:'reset a code device',mark:'set a request',dismiss:'dismissed a request',delete:'deleted a request',open:'switched buying','acct-license':'changed a license','acct-delete':'deleted an account','acct-reset':'reset a password','np-license':'changed a license','np-delete':'deleted an account','np-password':'reset a password','acct-set':'changed an account','sess-config':'set up admin sign-in'};
function loadActlog(){var box=$('#actBox');if(!box)return;$('#actPanel').hidden=!CAN('view_logs');if(!CAN('view_logs'))return;
 Promise.all(AK().filter(inSec).map(function(a){return appApi(a,'actlog').then(function(j){return {a:a,ok:!!(j&&j.ok),rows:(j&&j.ok?j.log:[]).map(function(r){r.app=a;return r})}},function(){return {a:a,ok:false,rows:[]}})})).then(function(v){
  var bad=v.filter(function(x){return !x.ok}).map(function(x){return APPN[x.a]||x.a});
  var all=[].concat.apply([],v.map(function(x){return x.rows})).filter(function(r){return r.who==='owner-token'}).sort(function(a,b){return b.t-a.t}).slice(0,80);
  box.innerHTML=(all.length?all.map(function(l){return '<div class="lg"><span class="ic">🔑</span><div><b>owner key</b> '+esc(ACTN[l.act]||String(l.act).replace(/-/g,' '))+' · '+esc(APPN[l.app]||l.app)+(l.tgt?' · <span class="mono">'+esc(l.tgt)+'</span>':'')+(l.det?' · '+esc(l.det):'')+'</div><div class="l2">'+esc(fmtT(l.t))+'</div></div>'}).join(''):'<div class="empty">No owner-key changes yet.</div>')+(bad.length?'<p class="sub" style="margin-top:8px">Couldn\u2019t read: '+esc(bad.join(', '))+'</p>':'')})}

/* ---------- clicks ---------- */
document.addEventListener('click',function(e){
 var t=e.target.closest('button,[data-copy]');if(!t||(t.type==='submit'&&t.form))return;
 if(t.dataset.copy){navigator.clipboard&&navigator.clipboard.writeText(t.dataset.copy).then(function(){toast('Copied '+t.dataset.copy)},function(){toast(t.dataset.copy)});return}
 if(t.id==='rf'){load();if(view==='users')loadUsers();if(view==='logs'){loadLogs();loadActlog()}return}
 if(t.id==='whoBtn'){$('#mePanel').hidden=!$('#mePanel').hidden;return}
 if(t.id==='logout'){if(window.NPApps)NPApps.onLogout();api('/api/logout',{}).then(function(){ME=null;D=null;RT={};setTok(null);show('login');toast('Logged out')});return}
 if(t.id==='meChpw'){show('chpw');$('#chCancel').hidden=false;$('#chpwp').textContent='Change your password.';return}
 if(t.id==='openT'){act('syn','open',{open:!(D.syn&&D.syn.open)},'Synapse buying '+((D.syn&&D.syn.open)?'closed':'opened'));return}
 if(t.dataset.mapp){MSEL=t.dataset.mapp;document.querySelectorAll('#mApp .ap').forEach(function(x){x.classList.toggle('on',x===t)});$('#mGo').textContent='Make '+(MSEL==='all'?'All-Access':MAPP[MSEL].works)+' code';$('#mOut').hidden=true;return}
 if(t.id==='mGo'){var M=MAPP[MSEL];if(!confirm('Make a new '+M.name+' code?\nWorks on: '+M.works))return;t.disabled=true;var bd={};for(var k in M.body)bd[k]=M.body[k];bd.note=$('#mNote').value.trim();
  act(M.app,'mint',bd,M.name+' code made').then(function(j){t.disabled=false;if(j&&j.ok&&j.code){$('#mNote').value='';navigator.clipboard&&navigator.clipboard.writeText(j.code).catch(function(){});
   var o=$('#mOut');o.hidden=false;o.innerHTML='<div class="sub">'+esc(M.name)+' code · works on '+esc(M.works)+'</div><div class="big">'+esc(j.code)+'</div><div class="row"><button class="pri" data-copy="'+esc(j.code)+'">Copy code</button></div><div class="hint" style="margin-top:8px">Single use. They sign in to '+esc(MSEL==='all'?'any Northpeak app':M.works)+', open Pro and tap “Have a code”.</div>'}}).catch(function(){t.disabled=false});return}
 if(t.id==='nGo'){var nu=$('#nu').value.trim(),np=$('#np').value;if(!nu||np.length<8){toast('Username + temp password (8+) needed');return}
  uop({op:'create',username:nu,password:np,role:$('#nr').value},'@'+nu.toLowerCase()+' added').then(function(j){if(j.ok){$('#nu').value=$('#np').value=''}});return}
 if(t.id==='rGo'){var caps=[].slice.call(document.querySelectorAll('#rcaps input:checked')).map(function(i){return i.value});var rn=$('#rn').value.trim();
  api('/api/roles',{op:'save',name:rn,label:rn,caps:caps}).then(function(j){if(!j.ok){toast(j.words||j.error);return}toast('Role saved');$('#rn').value='';loadUsers()});return}
 if(t.dataset.roleEdit){var r=U.roles.filter(function(x){return x.name===t.dataset.roleEdit})[0];$('#rn').value=r.name;document.querySelectorAll('#rcaps input').forEach(function(i){i.checked=r.caps.indexOf(i.value)>=0});$('#rn').scrollIntoView({behavior:'smooth',block:'center'});return}
 if(t.dataset.roleDel){if(!confirm('Delete role '+t.dataset.roleDel+'?'))return;api('/api/roles',{op:'delete',name:t.dataset.roleDel}).then(function(j){toast(j.ok?'Role deleted':(j.words||j.error));loadUsers()});return}
 if(t.dataset.op){var uu=t.closest('.ucard').dataset.u,op=t.dataset.op;
  if(op==='delete'){if(!confirm('Delete @'+uu+'? They can’t sign in anymore.'))return;uop({op:'delete',username:uu},'@'+uu+' deleted');return}
  if(op==='reset'){var p=prompt('New temporary password for @'+uu+' (8+ characters). They’ll set their own after signing in.');if(!p)return;uop({op:'reset',username:uu,password:p},'Password reset for @'+uu);return}
  if(op==='disable'||op==='enable'){uop({op:op,username:uu},'@'+uu+' '+op+'d');return}
  return}
 if(t.dataset.lk!=null){LG.kind=t.dataset.lk;loadLogs();return}
 if(t.id==='lgMore'){loadLogs(false,true);return}
 if(t.dataset.sec){setSec(t.dataset.sec);return} /* np-apps v2 */
 if(t.id==='shRf'){refreshNow(t);return}
 if(t.dataset.v){switchView(t.dataset.v);return}
 if(t.dataset.f){if(t.dataset.f==='hide')hideTest=!hideTest;else filt=t.dataset.f;renderReq();return}
 if(t.dataset.c){var code=t.parentNode.dataset.code;if(t.dataset.c==='code-delete'&&(t.parentNode.dataset.capp||'syn')==='syn'&&!confirm('Delete code '+code+' for good?'))return;if(t.dataset.c==='revoke'&&!confirm('Revoke '+code+'? It stops unlocking Pro.'))return;var capp=t.parentNode.dataset.capp||'syn';if(capp!=='syn'&&!confirm('Revoke '+code+'? It stops working, and Pro it unlocked turns off.'))return;t.disabled=true;act(capp,t.dataset.c,{code:code},capp!=='syn'||t.dataset.c==='revoke'?'Revoked':'Code deleted');return}
 if(t.dataset.a){var box=t.parentNode,app=box.dataset.app,id=box.dataset.id,a=t.dataset.a;
  var r=rows().filter(function(x){return x.app===app&&x.id===id})[0]||{};
  var who=(r.name||'this request')+' — '+(r.price||'');
  if(a==='note'){var tx=prompt('Note on '+who+' (empty = remove)',r.note?r.note.txt:'');if(tx==null)return;api('/api/notes',{app:app,id:id,txt:tx}).then(function(j){toast(j.ok?'Note saved':(j.words||j.error));load(true)});return}
  if(a==='paid'&&!confirm('Mark '+who+' as PAID?\n\nOnly after the Apple Cash came in.'+(r.aa?'\nAll-Access: unlocks Synapse + Axon + Liminal + Cadence + Mindprint.':'')))return;
  if(a==='delete'&&!confirm('Delete '+who+'? This removes the request'+(r.aa?' from both apps':'')+'.'))return;
  t.disabled=true;
  var twin=null;if(r.aa&&a==='delete'){AK().forEach(function(o){if(twin||o===r.app)return;var L=((D[o]&&D[o].requests)||[]);var tw=L.filter(function(x){return x.mirror&&(x.link===id||x.id===r.link)})[0];if(tw)twin={app:o,id:tw.id};});}
  var delTwin=function(j){if(!twin||!j||!j.ok)return j;return (twin.app==='syn'?appApi('syn','delete',{req:twin.id}):appApi(twin.app,'mark',{id:twin.id,status:'delete'})).then(function(){return load(true)})};
  if(app==='syn'){if(a==='paid')act('syn','mint',{req:id},'Paid ✓');else act('syn',a,{req:id},a==='delete'?'Deleted':'Dismissed').then(delTwin);}
  else{var st={paid:'paid',decline:'declined',delete:'delete',undo:'new'}[a];act(app,'mark',{id:id,status:st},{paid:'Paid ✓',declined:'Declined',delete:'Deleted',new:'Back to pending'}[st]).then(delTwin);}
 }
});
$('#lgU').addEventListener('change',function(){LG.u=this.value;loadLogs()});
document.addEventListener('change',function(e){var s=e.target;if(s.dataset&&s.dataset.op==='role'){var uu=s.closest('.ucard').dataset.u;uop({op:'role',username:uu,role:s.value},'@'+uu+' is now '+roleLabel(s.value))}});
window.addEventListener('hashchange',function(){if(location.hash.length>16)boot()});
document.addEventListener('visibilitychange',function(){if(!document.hidden&&ME&&D)load(true)});
setInterval(function(){if(!document.hidden&&ME&&D)load(true)},30000);

/* ---------- accounts (owner only) — np-accounts v1 ---------- */
var AC={app:'all',q:'',data:null,busy:false}, APPN={}, ATAG={}; APPS.forEach(function(a){APPN[a.k]=a.name;ATAG[a.k]=a.tag}); /* np-apps v2: from APPS */
var ARoute={}; APPS.forEach(function(a){ARoute[a.k]=a.k==='syn'?{list:'np-accounts',lic:'np-license',del:'np-delete',pw:'np-password'}:{list:'accounts',lic:'acct-license',del:'acct-delete',pw:'acct-reset'}});
var LICN={free:'Free',pro:'Pro',all_access:'All-Access',owner:'Owner 👑',bot:'Bot 🤖'};
function acLabel(a){return a.email||('@'+a.username)}
function loadAccounts(){if(!CAN('manage_accounts'))return;$('#acBox').innerHTML='<div class="empty"><span class="spin"></span> Loading accounts…</div>';
 return Promise.all(APPS.map(function(a){return appApi(a.k,ARoute[a.k].list).then(function(j){return j},function(){return{ok:false,error:'unreachable'}})})).then(function(v){
  AC.data={};APPS.forEach(function(a,i){AC.data[a.k]=v[i]});renderAccounts()})}
function acAll(){var out=[];AK().forEach(function(app){var j=AC.data&&AC.data[app];((j&&j.accounts)||[]).forEach(function(a){a.app=app;out.push(a)})});return out}
function acSiblings(a){var em=(a.email||'').toLowerCase();if(!em)return [a];return acAll().filter(function(x){return (x.email||'').toLowerCase()===em})}
function renderAccounts(){
 if(!AC.data)return;var all=acAll();
 AC.app=SEC; /* np-apps v2: the section bar picks the app */ $('#acApp').hidden=true;
 $('#acApp').innerHTML=[['all','All apps']].concat(APPS.map(function(a){return [a.k,a.name]})).map(function(c){var n=c[0]==='all'?all.length:all.filter(function(a){return a.app===c[0]}).length;return '<button class="chip'+(AC.app===c[0]?' on':'')+'" data-acapp="'+c[0]+'">'+c[1]+' · '+n+'</button>'}).join('');
 var sum=[];AK().filter(inSec).forEach(function(app){var j=AC.data[app];if(!j||!j.ok){sum.push(APPN[app]+': couldn’t load ('+esc((j&&(j.words||j.error))||'error')+')');return}
  var c={};j.accounts.forEach(function(a){var k=a.license+(/^grandfathered/.test(a.via)?'*':'');c[k]=(c[k]||0)+1});
  sum.push('<b>'+APPN[app]+'</b> '+j.accounts.length+': '+Object.keys(c).map(function(k){return c[k]+' '+(LICN[k.replace('*','')]||k).replace(/ .*/,'')+(k.slice(-1)==='*'?' (grandfathered)':'')}).join(', '))});
 $('#acSum').innerHTML=sum.join('<br>');$('#acN').textContent=(SEC==='all'?all.length:all.filter(function(a){return a.app===SEC}).length)+' total';
 var q=AC.q.trim().toLowerCase();
 var list=all.filter(function(a){return (AC.app==='all'||a.app===AC.app)&&(!q||(a.email||'').toLowerCase().indexOf(q)>=0||(a.username||'').toLowerCase().indexOf(q)>=0)}).sort(function(x,y){return (y.created||0)-(x.created||0)});
 $('#acBox').innerHTML=list.length?list.map(acCard).join(''):'<div class="empty">No accounts match.</div>'}
function acCard(a){
 var k=a.app+':'+a.uid, meta=[];
 /* r5: the login is the email; an old username isn't shown next to it any more */
 meta.push('joined '+esc(fmtT(a.created)));
 if(a.via)meta.push(esc(a.via));
 if(a.recs)meta.push(a.recs+' synced item'+(a.recs===1?'':'s'));
 if(a.seen)meta.push('last seen '+esc(fmtT(a.seen)));
 var h='<div class="acard" data-ack="'+esc(k)+'"><div class="top"><span class="tag '+ATAG[a.app]+'">'+APPN[a.app]+'</span><span class="em">'+esc(acLabel(a))+'</span><span class="lic l-'+a.license+'">'+(LICN[a.license]||a.license)+'</span></div>'+
  '<div class="meta">'+meta.join(' · ')+'</div><div class="row acts">';
 if(a.locked)h+='<span class="sub">🔒 license comes from the '+(a.license==='owner'?'owner':'BOT')+' code</span>';
 else h+='<select class="sm" data-aclic="'+esc(k)+'">'+['free','pro','all_access'].map(function(l){return '<option value="'+l+'"'+(l===a.license?' selected':'')+'>'+LICN[l]+'</option>'}).join('')+'</select><button data-acop="lic" data-k="'+esc(k)+'">Set license</button>';
 h+='<button data-acop="pw" data-k="'+esc(k)+'">Reset password</button>';
 h+=a.protected?'<button class="dang" disabled title="The owner and bot accounts can’t be deleted">🔒 Delete</button>':'<button class="dang" data-acop="del" data-k="'+esc(k)+'">Delete</button>';
 return h+'</div></div>'}
function acFind(k){var i=k.indexOf(':');var app=k.slice(0,i),uid=k.slice(i+1);return acAll().filter(function(a){return a.app===app&&a.uid===uid})[0]}
function acCall(a,op,extra){var body={who:APPN[a.app]+' · '+acLabel(a)};if(a.app==='syn')body.email=a.email;else body.uid=a.uid;for(var x in extra)body[x]=extra[x];return appApi(a.app,ARoute[a.app][op],body)}
function acModal(html){var m=document.createElement('div');m.className='amod';m.innerHTML='<div class="box">'+html+'</div>';document.body.appendChild(m);m.addEventListener('click',function(e){if(e.target===m||e.target.dataset.close!=null)m.remove()});return m}
function acPwGen(){var AB='abcdefghjkmnpqrstuvwxyz23456789',r=crypto.getRandomValues(new Uint8Array(12)),s='';for(var i=0;i<12;i++)s+=AB[r[i]%AB.length];return s.slice(0,4)+'-'+s.slice(4,8)+'-'+s.slice(8)}
function acDerive(app,kdf,pw){ /* exactly what the Axon / Liminal apps do: PBKDF2-SHA256, 600k rounds; only the login half leaves this phone */
 var te=new TextEncoder();return crypto.subtle.importKey('raw',te.encode(String(pw).normalize('NFC')),'PBKDF2',false,['deriveBits']).then(function(base){
  return crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:te.encode(((AP[app]&&AP[app].kdf)||'liminal-sync/v1:')+String(kdf||'').trim().toLowerCase()),iterations:600000},base,512)}).then(function(b){
  return [].slice.call(new Uint8Array(b).slice(32)).map(function(x){return x.toString(16).padStart(2,'0')}).join('')})}
function acLicense(a,lc){
 if(lc===a.license)return toast('Already '+LICN[lc]);
 var sib=acSiblings(a), wasAA=sib.filter(function(x){return x.license==='all_access'&&!x.locked});
 var msg=lc==='all_access'?'Give '+acLabel(a)+' All-Access? It unlocks '+allNames()+(sib.length>1?' on every account with this email':'')+'.':
  (a.license==='all_access'&&wasAA.length>1?'Take All-Access off '+acLabel(a)+' on every app? '+(lc==='free'?'All of them become Free.':APPN[a.app]+' becomes Pro, the other apps become Free.'):'Set '+acLabel(a)+' to '+LICN[lc]+' on '+APPN[a.app]+'?');
 if(!confirm(msg))return;
 var jobs;
 if(lc==='all_access'){ /* Synapse links an All-Access code to the email (the vouch), the others take that code */
  var sy=sib.filter(function(x){return x.app==='syn'&&!x.locked})[0], rest=sib.filter(function(x){return x.app!=='syn'&&!x.locked});if(a.app!=='syn'&&rest.indexOf(a)<0)rest.push(a);
  jobs=(sy?acCall(sy,'lic',{license:'all_access'}):Promise.resolve(null)).then(function(j){if(j&&!j.ok)throw j;var code=j&&j.aaCode;
   return Promise.all(rest.map(function(x){return acCall(x,'lic',code?{license:'all_access',code:code}:{license:'all_access'})})).then(function(r){return [j].concat(r)})});
 }else{
  var tgt=[a];if(a.license==='all_access')wasAA.forEach(function(x){if(x!==a)tgt.push(x)});
  jobs=Promise.all(tgt.map(function(x){return acCall(x,'lic',{license:x===a?lc:'free'})}));
 }
 jobs.then(function(r){var bad=r.filter(function(j){return j&&!j.ok});toast(bad.length?'Couldn’t change: '+(bad[0].words||bad[0].error):acLabel(a)+' → '+LICN[lc]);loadAccounts()},function(e){toast('Couldn’t change: '+((e&&(e.words||e.error))||'error'));loadAccounts()})}
function acReset(a){
 var sib=acSiblings(a).sort(function(x,y){return x===a?-1:y===a?1:0});
 var m=acModal('<h3>Reset password</h3><p>'+esc(acLabel(a))+' gets a new password. You see it once, here, to send them yourself.</p>'+
  sib.map(function(x,i){return '<label><input type="checkbox" data-sib="'+i+'"'+(x===a?' checked disabled':' checked')+'> '+APPN[x.app]+(x.email?'':' (@'+esc(x.username)+')')+'</label>'}).join('')+
  (sib.some(function(x){return x.app!=='syn'&&x.recs})?'<p>Axon and Liminal lock synced notes with the password, so the old cloud copy can’t be opened with a new one: it’s cleared and they’re signed out. Notes still on their own phone upload again when they sign in.</p>':'<p>They’re signed out everywhere and sign in with the new password.</p>')+
  '<div class="row" style="justify-content:flex-end;margin-top:10px"><button data-close>Cancel</button><button class="pri" id="acPwGo">Make new password</button></div>');
 m.querySelector('#acPwGo').addEventListener('click',function(){var btn=this;btn.disabled=true;btn.textContent='Working…';
  var pick=sib.filter(function(x,i){var c=m.querySelector('[data-sib="'+i+'"]');return c&&c.checked}), sy=pick.filter(function(x){return x.app==='syn'})[0], res=[];
  (sy?acCall(sy,'pw',{}).then(function(j){res.push([sy,j]);if(!j.ok)throw j;return j.password}):Promise.resolve(acPwGen())).then(function(pw){
   return pick.filter(function(x){return x.app!=='syn'}).reduce(function(p,x){return p.then(function(){return acDerive(x.app,x.kdf,pw).then(function(auth){return acCall(x,'pw',{auth:auth,kdf:x.kdf})}).then(function(j){res.push([x,j])})})},Promise.resolve()).then(function(){return pw})
  }).then(function(pw){var ok=res.filter(function(r){return r[1].ok});
   m.querySelector('.box').innerHTML='<h3>New password</h3><p>For '+esc(acLabel(a))+' on '+ok.map(function(r){return APPN[r[0].app]}).join(', ')+'. It won’t be shown again.</p><div class="pwbig" id="acPw">'+esc(pw)+'</div>'+
    res.filter(function(r){return !r[1].ok}).map(function(r){return '<p style="color:var(--bad)">'+APPN[r[0].app]+': '+esc(r[1].words||r[1].error)+'</p>'}).join('')+
    '<div class="row" style="justify-content:flex-end"><button id="acPwCp">Copy</button><button class="pri" data-close>Done</button></div>';
   m.querySelector('#acPwCp').addEventListener('click',function(){navigator.clipboard&&navigator.clipboard.writeText(pw).then(function(){toast('Copied')},function(){toast('Press and hold to copy')})});
   pw=null;loadAccounts();
  },function(e){m.remove();toast('Reset failed: '+((e&&(e.words||e.error))||'error'));loadAccounts()})})}
function acDelete(a){
 if(a.protected)return toast('The owner and bot accounts can’t be deleted');
 if(!confirm('Delete '+acLabel(a)+' from '+APPN[a.app]+'?\n\nTheir '+APPN[a.app]+' account'+(a.app==='syn'?', synced decks and progress':' and synced notes')+' are deleted for good. This can’t be undone.'))return;
 acCall(a,'del',{}).then(function(j){toast(j.ok?'Deleted '+acLabel(a):'Couldn’t delete: '+(j.words||j.error));loadAccounts()})}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-acapp],[data-acop]');if(!t)return;
 if(t.dataset.acapp){AC.app=t.dataset.acapp;renderAccounts();return}
 var a=acFind(t.dataset.k);if(!a)return;
 if(t.dataset.acop==='lic'){var s=document.querySelector('[data-aclic="'+t.dataset.k+'"]');acLicense(a,s.value)}
 if(t.dataset.acop==='pw')acReset(a);
 if(t.dataset.acop==='del')acDelete(a)});
$('#acQ').addEventListener('input',function(){AC.q=this.value;renderAccounts()});
window.npUpdate=window.npUpdate||{};(function(prev){window.npUpdate.safe=function(){if(document.querySelector('.amod'))return false;return prev?prev():true}})(window.npUpdate.safe); /* never auto-reload while an Accounts dialog (e.g. a new password) is open */

/* ---------- Mindprint · Responses (np-apps v2, Oct 25 2026) — everyone's quiz results + answers, from Mindprint's own
   admin-only /api/pro/admin/mp-responses (the same data as the Responses switch on mindprint.sites.tab.bot/admin-pro/).
   Owner only: the shared API signs an owner ticket, Mindprint checks it again; no token ever sits in this page. ---------- */
var RS={people:[],flt:'people',loaded:false,busy:false,at:0};
(function(){
 var BIG={O:'Openness',C:'Conscientiousness',E:'Extraversion',A:'Agreeableness',N:'Emotional sensitivity'};
 var NICE={self_direction:'Self-direction',tackle:'Tackling it',support:'Getting support',distract:'Distracting',reframe:'Reframing',express:'Letting it out',withdraw:'Withdrawing'};
 function nice(k){k=String(k||'').replace(/^(v|cf|cope|dm)_/,'');if(NICE[k])return NICE[k];return k.charAt(0).toUpperCase()+k.slice(1).replace(/_/g,' ')}
 function day(iso){if(!iso)return'';var d=new Date(iso);if(isNaN(d))return'';return d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Los_Angeles'})}
 function latest(p,kind){for(var i=0;i<p.subs.length;i++)if(p.subs[i].kind===kind)return p.subs[i];return null}
 function badge(p){if(p.imported)return'<span class="tag t-aa">Imported</span>';if(p.test)return'<span class="tag s-test">Test</span>';if(p.plan==='pro')return'<span class="tag s-paid">Pro</span>';if(p.plan==='free')return'<span class="tag s-test">Free</span>';return'<span class="tag s-test">Guest</span>'}
 function planTxt(p){return p.imported?'Imported':p.plan==='pro'?'Pro'+(p.pro_via?' ('+({owner:'owner key',bot:'bot code',gift:'gift',paid:'paid',req:'paid',code:'unlock code'}[p.pro_via]||p.pro_via)+')':''):p.plan==='free'?'Free':'Guest (no account)'}
 function mainSum(s){var sc=s&&s.scores;if(!sc)return null;var o={};o.head=(sc.headlines||[]).join(' · ');
  o.big=sc.scales?['O','C','E','A','N'].filter(function(k){return k in sc.scales}).map(function(k){return BIG[k]+' '+sc.scales[k]}).join(' · '):'';
  var x=[];if(sc.attachment)x.push('Attachment: '+nice(sc.attachment));if(sc.values&&sc.values.length)x.push('Values: '+sc.values.map(nice).join(', '));if(sc.conflict&&sc.conflict.length)x.push('Conflict: '+sc.conflict.map(nice).join(', '));if(sc.coping&&sc.coping.length)x.push('Coping: '+sc.coping.map(nice).join(', '));if(sc.decision&&sc.decision.length)x.push('Decisions: '+sc.decision.map(nice).join(', '));o.more=x.join(' · ');return o}
 function selfTxt(p){var o=p.self||{},L={four:'4-letter',socionics:'Socionics',ennea:'Enneagram',temper:'Temperament',arche:'Archetype',disc:'DISC',attach:'Attachment',cognitive:'Decision style',learning:'Learning style',cluster:'Cluster'};return Object.keys(o).map(function(k){return (L[k]||k)+' '+o[k];}).join(', ');}
function rtTxt(p){var o=p.retakes||{};return Object.keys(o).map(function(k){return (o[k]||[]).map(function(x){return k+' set '+x.bank+' '+(x.at?new Date(x.at).toISOString().slice(0,10):'')+' ('+x.n+' answered'+(x.skipped?', '+x.skipped+' skipped':'')+(x.before&&x.after&&x.before!==x.after?', '+x.before+' → '+x.after:'')+')';}).join('; ');}).join('; ');}
function selfBlk(p,m){if(!p.self&&!p.retakes)return '';var t=tyOf(m);return '</div><div class="blk"><div class="lb">Self-identified types + retakes</div>'+(p.self?'<div class="sc"><b>Picked:</b> '+esc(selfTxt(p))+(t&&p.self.four&&t.four!==p.self.four?' · answers said '+esc(t.four):'')+'</div>':'')+(p.retakes?'<div class="sc"><b>Retakes:</b> '+esc(rtTxt(p))+'</div>':'');}
function tyOf(s){return s&&s.scores&&s.scores.types||null}
 function tyChips(t){if(!t)return'';var c=[['mr-ty cl',t.clusterEmoji+' '+t.cluster+' · '+t.clusterMatch+'%'],['mr-ty',t.four+' '+t.fourName],['mr-ty','Enneagram '+t.ennea],['mr-ty',t.temper],['mr-ty',t.arche||''],['mr-ty','Big Five '+t.sloan],['mr-ty',t.attach],['mr-ty','DISC '+t.disc],['mr-ty',t.cognitive?'Decides: '+t.cognitive:''],['mr-ty',t.family?'Family: '+t.family:'']].filter(function(x){return x[1]});
  return '<div class="mr-tys">'+c.map(function(x){return '<span class="'+x[0]+'">'+esc(x[1])+'</span>'}).join('')+'</div>'}
 function tyTxt(t){return t?[t.four,t.fourName,t.cluster,t.ennea,t.enneaName,t.temper,t.arche,t.sloan,t.attach,t.disc,t.cognitive,t.learning,t.family,(t.tags||[]).join(' ')].join(' '):''}
 function hay(p){var m=latest(p,'main'),ms=mainSum(m);return [p.name,p.email,p.username,p.label,planTxt(p),ms&&ms.head,ms&&ms.more,tyTxt(tyOf(m)),selfTxt(p)].join(' ').toLowerCase()}
 function pass(p){var f=RS.flt;if(f==='tests')return p.test;if(p.test&&f!=='all')return false;if(f==='pro')return p.plan==='pro';if(f==='free')return p.plan==='free'||p.plan==='guest';if(f==='deep')return !!latest(p,'deep');if(f==='imported')return p.imported;return true}
 function qa(list){return (list||[]).map(function(x,i){var a=x.answer==null?'':x.answer;return '<div class="mr-qa"><b>'+(i+1)+'. '+esc(x.question||x.q)+'</b><span>'+esc(a===''?'(skipped)':a)+'</span></div>'}).join('')}
 function card(p){var m=latest(p,'main'),d=latest(p,'deep'),ms=mainSum(m),nm=p.subs.filter(function(s){return s.kind==='main'}).length,nd=p.subs.filter(function(s){return s.kind==='deep'}).length;
  var h='<div class="acard mr-card"><div class="top"><span class="em">'+esc(p.name||(p.email?String(p.email).split('@')[0]:'(no name)'))+'</span>'+badge(p)+(tyOf(m)?'<span class="mr-tyb">'+esc(tyOf(m).clusterEmoji+' '+(p.self&&p.self.four?p.self.four+' (self)':tyOf(m).four))+'</span>':'')+'<span class="sub">'+esc(day(p.last_at))+'</span></div>';
  h+='<div class="meta">'+(p.email?'<span class="mr-em">'+esc(p.email)+'</span>':(p.imported?'Not attached to an account':'No account'))+'</div>';
  if(p.imported)h+='<div class="meta">'+esc(p.label||'')+(p.source?' · from '+esc(p.source):'')+(p.claimed_at?' · received '+esc(day(p.claimed_at)):p.email?' · waiting for them to open Mindprint':'')+'</div>';
  else h+='<div class="meta">'+esc(planTxt(p))+(p.signed_up?' · joined '+esc(day(p.signed_up)):'')+(p.deleted_account?' · account deleted':'')+'</div>';
  h+='<div class="mr-blk"><div class="mr-lb">Main quiz'+(nm>1?' · taken '+nm+'×':'')+'</div>';
  if(m){h+=ms?'<div class="mr-hl">'+esc(ms.head||'No standout traits')+'</div><div class="meta">'+esc(ms.big)+'</div>'+(ms.more?'<div class="meta">'+esc(ms.more)+'</div>':'')+tyChips(tyOf(m)):'<div class="meta">Scored on their phone</div>';
   h+='<div class="meta">'+esc(day(m.at))+' · '+(m.answers||[]).length+' answers'+(m.secs?' · '+Math.round(m.secs/60)+' min':'')+'</div><details class="mr-sb"><summary>Main quiz answers</summary>'+qa(m.answers)+'</details>'}
  else h+='<div class="meta">Not taken</div>';
  h+=selfBlk(p,m);var ad=latest(p,'addon');if(ad){var no=(ad.answers||[]).filter(function(x){return x.a===-1}).length;h+='</div><div class="mr-blk"><div class="mr-lb">Sharpen answers (Your types)</div><div class="meta">'+esc(day(ad.at))+' · '+(ad.answers||[]).length+' answered'+(no?' · '+no+' typed “Other”':'')+'</div><details class="mr-sb"><summary>Sharpen answers</summary>'+qa(ad.answers)+'</details>'}
  h+='</div><div class="mr-blk"><div class="mr-lb">Deep Dive'+(nd>1?' · taken '+nd+'×':'')+'</div>';
  if(d){var ans=(d.answers||[]).filter(function(x){return x.answer!=null&&x.answer!==''}).length;h+='<div class="meta">'+esc(day(d.at))+' · '+ans+' of 50 answered'+(d.flags&&d.flags.length?' · '+d.flags.length+' flagged':'')+'</div><details class="mr-sb"><summary>Deep Dive answers</summary>'+qa(d.answers)+'</details>'}
  else h+='<div class="meta">Not taken</div>';
  if(p.subs.length>2)h+='<details class="mr-sb"><summary>All '+p.subs.length+' submissions</summary>'+p.subs.map(function(s){var x=mainSum(s);return '<div class="mr-qa"><b>'+(s.kind==='deep'?'Deep Dive':s.kind==='addon'?'Types extras':((s.flags||[]).indexOf('diag')>=0?'Quick diagnostic':'Main quiz'))+' · '+esc(day(s.at))+(s.status==='test'?' · test':'')+'</b><span>'+(x?esc((tyOf(s)?tyOf(s).four+' · '+tyOf(s).cluster+' · ':'')+x.head):(s.answers||[]).length+' answers')+'</span></div>'}).join('')+'</details>';
  return h+'</div></div>'}
 var RF=[['people','Everyone'],['pro','Pro'],['free','Free'],['deep','Deep Dive'],['imported','Imported'],['tests','Tests']];
 RS.render=function(){var box=$('#rsBox');if(!box)return;var q=($('#rsQ').value||'').trim().toLowerCase(),P=RS.people,list=P.filter(pass).filter(function(p){return !q||hay(p).indexOf(q)>=0});
  var real=P.filter(function(p){return !p.test});
  $('#rsF').innerHTML=RF.map(function(f){return '<button class="chip'+(RS.flt===f[0]?' on':'')+'" data-rsf="'+f[0]+'">'+f[1]+'</button>'}).join('');
  $('#rsN').innerHTML=RS.loaded?'<b>'+real.length+'</b> '+(real.length===1?'person':'people')+' · '+real.filter(function(p){return p.plan==='pro'}).length+' Pro · '+real.filter(function(p){return p.plan==='free'||p.plan==='guest'}).length+' free · '+real.filter(function(p){return latest(p,'deep')}).length+' did the Deep Dive · '+real.filter(function(p){return p.imported}).length+' imported'+(q||RS.flt!=='people'?' · showing '+list.length:'')+'<br><span class="sub">updated '+esc(tsec(RS.at))+'</span>':'';
  box.innerHTML=list.length?list.map(card).join(''):'<div class="empty">'+(RS.loaded?'No one matches.':'<span class="spin"></span> Loading responses…')+'</div>'};
 RS.csv=function(){var rows=RS.people.filter(pass),cell=function(v){v=v==null?'':String(v);return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  var hd=['Name','Email','Account username','Plan','Joined','Last activity','Main quiz date','Main headlines','4-letter type','Type name','Cluster','Cluster match %','Enneagram','Temperament','Big Five code','Attachment style','DISC','Archetype','Decision style','Learning style','Family','Tags','Openness','Conscientiousness','Extraversion','Agreeableness','Emotional sensitivity','Attachment','Top values','Conflict style','Coping','Decisions','Main answers','Deep Dive date','Deep Dive answered','Deep Dive answers','Sharpen answers','Self-identified types','Retakes','Quick diagnostic','Source'],out=[hd.map(cell).join(',')];
  rows.forEach(function(p){var m=latest(p,'main'),d=latest(p,'deep'),sc=(m&&m.scores)||{},sl=sc.scales||{},ty=sc.types||{};
   out.push([p.name,p.email,p.username,planTxt(p),p.signed_up?String(p.signed_up).slice(0,10):'',p.last_at,m?m.at:'',(sc.headlines||[]).join('; '),ty.four||'',ty.fourName||'',ty.cluster||'',ty.clusterMatch==null?'':ty.clusterMatch,ty.ennea?ty.ennea+' '+ty.enneaName:'',ty.temper||'',ty.sloan||'',ty.attach||'',ty.disc||'',ty.arche||'',ty.cognitive||'',ty.learning||'',ty.family||'',(ty.tags||[]).join(' '),sl.O,sl.C,sl.E,sl.A,sl.N,sc.attachment?nice(sc.attachment):'',(sc.values||[]).map(nice).join('; '),(sc.conflict||[]).map(nice).join('; '),(sc.coping||[]).map(nice).join('; '),(sc.decision||[]).map(nice).join('; '),
    m?(m.answers||[]).map(function(x){return (x.question||x.q)+' => '+(x.answer==null?'':x.answer)}).join(' | '):'',d?d.at:'',d?(d.answers||[]).filter(function(x){return x.answer!=null&&x.answer!==''}).length:'',d?(d.answers||[]).map(function(x){return (x.question||x.q)+' => '+(x.answer==null?'(skipped)':x.answer)}).join(' | '):'',(function(){var ad=latest(p,'addon');return ad?(ad.answers||[]).map(function(x){return (x.question||x.q)+' => '+(x.answer==null?'':x.answer)}).join(' | '):''})(),selfTxt(p),rtTxt(p),p.diag?'yes':'',p.imported?(p.source||'imported'):'Mindprint'].map(cell).join(','))});
  var b=new Blob(['\ufeff'+out.join('\r\n')],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='mindprint-responses-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},4000)};
 document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-rsf],#rsCsv,#rsRf');if(!t)return;
  if(t.dataset.rsf){RS.flt=t.dataset.rsf;RS.render();return}
  if(t.id==='rsCsv'){if(!RS.loaded)return toast('Still loading');RS.csv();return}
  if(t.id==='rsRf'){loadResp(true,t);return}});
 var q=document.getElementById('rsQ');if(q)q.addEventListener('input',function(){RS.render()});
})();
function loadResp(force,btn){if(!CAN('manage_accounts'))return;if(RS.busy)return;if(RS.loaded&&!force){RS.render();return}
 RS.busy=true;if(btn){btn.disabled=true;btn.innerHTML='<span class="spin"></span>'}RS.render();
 appApi('mindprint','mp-responses').then(function(j){RS.busy=false;if(btn){btn.disabled=false;btn.textContent='↻'}
  if(!j||!j.ok){$('#rsN').textContent='Couldn’t load responses ('+((j&&(j.words||j.error))||'error')+').';$('#rsBox').innerHTML='';return}
  RS.people=j.people||[];RS.loaded=true;RS.at=Date.now();RS.render()})}
/* np-apps-tab v1: the few helpers apps.js uses (no tokens, no data) */
window.NPA={api:api,esc:esc,toast:toast,fmtT:fmtT,apps:function(){return APPS},me:function(){return ME},
 go:function(v){view=v;renderTabs();switchView(v);window.scrollTo(0,0)},sec:function(k,v){view=v||view;setSec(k)}};
boot();
})();
