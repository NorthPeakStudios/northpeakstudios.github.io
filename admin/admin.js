/* Northpeak Admin app (moved out of index.html Oct 21, 2026 so the page can run under a strict Content-Security-Policy: no inline scripts) */
(function(){
var API=/\.sites\.tab\.bot$/.test(location.hostname)?'':'https://northpeak-admin.sites.tab.bot';
var TK_KEY='np_admin_session', ME=null, D=null, filt='all', hideTest=false, view='req', NOTES={}, U=null, LG={u:'',kind:'',items:[]}, setupKey='';
var BASE={syn:'https://odin-cards.sites.tab.bot',axon:'https://axon-sync.sites.tab.bot',liminal:'https://liminal-sync.sites.tab.bot',cadence:'https://cadence-sync.sites.tab.bot'}, PEER={synapse:BASE.syn,axon:BASE.axon,liminal:BASE.liminal,cadence:BASE.cadence};
var CAPN={view_requests:'see requests',approve:'mark paid',mint_codes:'make codes',dismiss:'dismiss / decline',notes:'add notes',delete:'delete',revoke_codes:'revoke codes',toggle_buying:'open/close buying',view_sheet:'see sheet',view_logs:'see logs',manage_users:'manage users',manage_accounts:'app accounts (owner only)'};
var $=function(s){return document.querySelector(s)};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toast(t){var e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(function(){e.classList.remove('on')},2800)}
function tok(){try{var s=JSON.parse(localStorage.getItem(TK_KEY)||'null');return s&&s.exp>Date.now()?s.token:''}catch(e){return ''}}
function setTok(j){if(j)localStorage.setItem(TK_KEY,JSON.stringify({token:j.token,exp:j.exp}));else localStorage.removeItem(TK_KEY)}
function CAN(c){return !!(ME&&ME.caps.indexOf(c)>=0)}
function japi(u,o){return fetch(u,o).then(function(r){return r.json().catch(function(){return{ok:false,error:'http_'+r.status}})},function(){return{ok:false,error:'unreachable'}})}
function api(p,b,extra){var h={'content-type':'application/json'};var t=tok();if(t)h.authorization='Bearer '+t;if(extra)for(var k in extra)h[k]=extra[k];
 return japi(API+p,{method:b?'POST':'GET',headers:h,body:b?JSON.stringify(b):undefined,cache:'no-store'}).then(function(j){if(j&&j.error==='signed_out'&&ME){ME=null;setTok(null);show('login');toast('Signed out — sign in again')}return j})}
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
var TABS=[['req','Requests','view_requests'],['sheet','Sheet','view_sheet'],['more','Codes & apps',['mint_codes','revoke_codes','toggle_buying']],['users','Users','manage_users'],['acct','Accounts','manage_accounts'],['logs','Logs','view_logs']];
function tabOk(t){var c=t[2];return typeof c==='string'?CAN(c):c.some(CAN)}
function startApp(){
 show('app');$('#mePanel').hidden=true;
 $('#av').textContent=ME.u.charAt(0).toUpperCase();$('#whoName').textContent='@'+ME.u;$('#whoRole').textContent=ME.roleLabel;$('#whoRole').className='rl '+ME.role;
 $('#meName').textContent='@'+ME.u+' · '+ME.roleLabel;$('#meCaps').textContent='can: '+ME.caps.map(function(c){return CAPN[c]||c}).join(', ');
 var T=TABS.filter(tabOk);if(!T.some(function(t){return t[0]===view}))view=T.length?T[0][0]:'';
 $('#tabs').innerHTML=T.map(function(t){return '<button data-v="'+t[0]+'" class="'+(t[0]===view?'on':'')+'">'+t[1]+'</button>'}).join('');
 $('#tabs').hidden=T.length<2;$('#statsBox').hidden=!CAN('view_requests');
 $('#mintPanel').hidden=!CAN('mint_codes');$('#codesPanel').hidden=!(CAN('revoke_codes')||CAN('mint_codes'));$('#livePanel').hidden=!CAN('view_requests');
 switchView(view);load();}
function switchView(v){view=v;document.querySelectorAll('#tabs button').forEach(function(b){b.classList.toggle('on',b.dataset.v===v)});['req','sheet','more','users','acct','logs'].forEach(function(x){$('#v-'+x).hidden=x!==v});
 if(v==='users')loadUsers();if(v==='acct')loadAccounts();if(v==='logs'){loadLogs();loadActlog()}}
var MAPP={synapse:{app:'syn',body:{product:'synapse_lifetime'},name:'Synapse Lifetime',works:'Synapse'},axon:{app:'axon',body:{},name:'Axon Pro',works:'Axon'},liminal:{app:'liminal',body:{},name:'Liminal Pro',works:'Liminal'},cadence:{app:'cadence',body:{},name:'Cadence Pro',works:'Cadence'},all:{app:'syn',body:{product:'all_access'},name:'All-Access',works:'Synapse, Axon, Liminal and Cadence'}},MSEL='synapse';
function CODES_OK(){return CAN('mint_codes')||CAN('revoke_codes')}
function loadAll(){
 var jobs=[CAN('view_requests')?appApi('syn','list'):Promise.resolve(null),CAN('view_requests')?appApi('axon','list'):Promise.resolve(null),CAN('view_sheet')?api('/api/sheet'):Promise.resolve(null),CAN('view_requests')?api('/api/notes'):Promise.resolve(null),CAN('view_requests')?appApi('liminal','list'):Promise.resolve(null),CODES_OK()?appApi('axon','codes'):Promise.resolve(null),CODES_OK()?appApi('liminal','codes'):Promise.resolve(null),CAN('view_requests')?appApi('cadence','list'):Promise.resolve(null),CODES_OK()?appApi('cadence','codes'):Promise.resolve(null)];
 return Promise.all(jobs).then(function(v){NOTES={};((v[3]&&v[3].notes)||[]).forEach(function(n){NOTES[n.k]=n});return{ok:true,at:Date.now(),syn:v[0]||{},axon:v[1]||{},liminal:v[4]||{},axc:v[5]||{},lic:v[6]||{},cadence:v[7]||{},cac:v[8]||{},sheet:v[2]&&v[2].sheet}})}
function rows(){
 var out=[];
 var s=(D.syn&&D.syn.requests)||[], a=(D.axon&&D.axon.requests)||[], li=(D.liminal&&D.liminal.requests)||[], ca=(D.cadence&&D.cadence.requests)||[];
 s.forEach(function(r){out.push({app:'syn',id:r.id,t:r.t,name:r.name,contact:r.contact,email:r.email,username:'',plan:r.plan,plan_name:r.plan_name,price:r.price||r.charge,amount:+r.amount||0,status:r.status,code:r.code,mirror:!!r.mirror,link:r.link})});
 a.forEach(function(r){out.push({app:'axon',id:r.id,t:Date.parse(r.created_at)||0,name:r.name,contact:r.phone,username:r.username,plan:r.plan,plan_name:r.plan_name,price:r.price,amount:+r.amount||0,status:r.status,code:r.code,mirror:!!r.mirror,link:r.link,pro:r.pro})});
 li.forEach(function(r){out.push({app:'liminal',id:r.id,t:Date.parse(r.created_at)||r.t||0,name:r.name,contact:r.phone||r.contact,username:r.username,plan:r.plan,plan_name:r.plan_name,price:r.price,amount:+r.amount||0,status:r.status,code:r.code,mirror:!!r.mirror,link:r.link,pro:r.pro})});
 ca.forEach(function(r){out.push({app:'cadence',id:r.id,t:Date.parse(r.created_at)||r.t||0,name:r.name,contact:r.phone||r.contact,username:r.username,plan:r.plan,plan_name:r.plan_name,price:r.price,amount:+r.amount||0,status:r.status,code:r.code,mirror:!!r.mirror,link:r.link,pro:r.pro})});
 var keep=out.filter(function(r){return !r.mirror});
 out.forEach(function(r){if(r.mirror){var o=keep.filter(function(k){return k.app!==r.app&&(k.id===r.link||k.link===r.id)})[0];if(o){if(!o.code&&r.code)o.code=r.code;}else keep.push(r);}});
 keep.forEach(function(r){r.aa=r.plan==='all_access';r.note=NOTES[r.app+':'+r.id]});
 keep.sort(function(x,y){return (y.t||0)-(x.t||0)});
 return keep;
}
function stats(R){
 var real=R.filter(function(r){return r.status!=='test'});var paid=real.filter(function(r){return r.status==='paid'});
 $('#sTot').textContent=real.length;$('#sPaid').textContent=paid.length;$('#sMoney').textContent=money(paid.reduce(function(s,r){return s+(r.amount||0)},0));
 var pend=real.filter(function(r){return r.status==='new'}).length;$('#sPend').textContent=pend;
 /* np-r2: pending count on the browser tab and the home-screen icon, so a new buyer shows without opening the page */
 document.title=(pend?'('+pend+') ':'')+'Northpeak Admin';
 try{if(navigator.setAppBadge){if(pend)navigator.setAppBadge(pend).catch(function(){});else navigator.clearAppBadge().catch(function(){})}}catch(e){}}
/* np-r2: tap a stat to jump to those requests */
(function(){var go=function(f){return function(){if(!CAN('view_requests'))return;filt=f;switchView('req');renderReq();}};
 [['sTot','all'],['sPaid','paid'],['sMoney','paid'],['sPend','new']].forEach(function(x){var el=document.getElementById(x[0]);if(el&&el.parentNode){el.parentNode.style.cursor='pointer';el.parentNode.setAttribute('role','button');el.parentNode.addEventListener('click',go(x[1]));}})})();
var FILTERS=[['all','All'],['new','Pending'],['paid','Paid'],['syn','Synapse'],['axon','Axon'],['liminal','Liminal'],['cadence','Cadence'],['aa','All-Access'],['hide','Hide tests']];
function chips(R){var c=function(k){return R.filter(function(r){return match(r,k)}).length};
 $('#chips').innerHTML=FILTERS.map(function(f){var on=f[0]==='hide'?hideTest:filt===f[0];return '<button class="chip'+(on?' on':'')+'" data-f="'+f[0]+'">'+f[1]+(f[0]==='hide'?'':' '+c(f[0]))+'</button>'}).join('')}
function match(r,k){if(k==='all')return true;if(k==='new')return r.status==='new';if(k==='paid')return r.status==='paid';if(k==='syn')return r.app==='syn'&&!r.aa;if(k==='axon')return r.app==='axon'&&!r.aa;if(k==='liminal')return r.app==='liminal'&&!r.aa;if(k==='cadence')return r.app==='cadence'&&!r.aa;if(k==='aa')return r.aa;return true}
function appTag(r){return r.aa?'<span class="tag t-aa">All-Access</span>':r.app==='syn'?'<span class="tag t-syn">Synapse</span>':r.app==='liminal'?'<span class="tag t-lim">Liminal</span>':r.app==='cadence'?'<span class="tag t-cad">Cadence</span>':'<span class="tag t-axon">Axon</span>'}
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
 var R=rows();stats(R);chips(R);
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
function renderSheet(){
 var s=D.sheet;
 if(s&&s.values&&s.values.length){var h=s.values[0],b=s.values.slice(1).reverse();$('#sheetBox').innerHTML=tableHTML(h,b.map(function(r){return h.map(function(_,i){return esc(r[i]||'')})}));$('#sheetAt').textContent='synced '+fmtT(s.at)+' · '+b.length+' row'+(b.length===1?'':'s');}
 else{$('#sheetBox').innerHTML='<div class="empty">Sheet copy not synced yet. Open the sheet.</div>';$('#sheetAt').textContent='';}
 if(CAN('view_requests')){var R=rows();$('#liveBox').innerHTML=tableHTML(['Time (PT)','App','Name','Phone','Charge','Status','Request ID'],R.map(function(r){return [esc(fmtT(r.t)),r.aa?'All-Access':r.app==='syn'?'Synapse':r.app==='liminal'?'Liminal':r.app==='cadence'?'Cadence':'Axon',esc(r.name),esc(r.contact||r.email||''),esc(r.price||money(r.amount)),esc(r.status),'<span class="mono">'+esc(r.id)+'</span>']}))}}
function renderMore(){
 var s=D.syn||{},a=D.axon||{},li=D.liminal||{},ca=D.cadence||{};
 $('#appsBox').innerHTML=
  '<div class="row" style="justify-content:space-between;margin-bottom:10px"><div><span class="tag t-syn">Synapse</span> '+(s.ok?'<span class="sub">'+((s.requests||[]).length)+' requests</span>':'')+'</div>'+
  (s.ok&&CAN('toggle_buying')?'<button id="openT">Buying '+(s.open?'open ✅':'closed ⛔')+'</button>':s.ok?'<span class="sub">buying '+(s.open?'open':'closed')+'</span>':'')+'</div>'+
  '<div class="row" style="justify-content:space-between"><div><span class="tag t-axon">Axon</span> '+(a.ok?'<span class="sub">'+(a.accounts||0)+' accounts · '+(a.pro_accounts||0)+' with Pro</span>':'')+'</div></div>'+
  '<div class="row" style="justify-content:space-between;margin-top:8px"><div><span class="tag t-lim">Liminal</span> '+(li.ok?'<span class="sub">'+(li.accounts||0)+' accounts · '+(li.pro_accounts||0)+' with Pro</span>':'')+'</div></div>'+
  '<div class="row" style="justify-content:space-between;margin-top:8px"><div><span class="tag t-cad">Cadence</span> '+(ca.ok?'<span class="sub">'+(ca.accounts||0)+' accounts · '+(ca.pro_accounts||0)+' with Pro</span>':'')+'</div></div>'+
  '<div class="row" style="margin-top:12px"><a class="btn" href="https://odin-cards.sites.tab.bot/" target="_blank" rel="noopener">Open Synapse ↗</a><a class="btn" href="https://northpeakstudios.github.io/axon/" target="_blank" rel="noopener">Open Axon ↗</a><a class="btn" href="https://northpeakstudios.github.io/liminal/" target="_blank" rel="noopener">Open Liminal ↗</a><a class="btn" href="https://northpeakstudios.github.io/cadence/" target="_blank" rel="noopener">Open Cadence ↗</a></div>';
 var C=[];(s.codes||[]).forEach(function(c){C.push({app:'syn',aa:c.product==='all_access',own:c.kind==='owner',bot:c.kind==='bot',code:c.code,note:c.note,created:c.created,revoked:c.revoked,used:c.used||c.redeemed,by:c.by})});
 [['axon',D.axc],['liminal',D.lic],['cadence',D.cac]].forEach(function(p){((p[1]&&p[1].codes)||[]).forEach(function(c){C.push({app:p[0],code:c.code,note:c.note,created:c.created,used:c.used,by:c.by})})});
 C.sort(function(x,y){return (y.created||0)-(x.created||0)});$('#codesN').textContent=C.length?'· '+C.length:'';
 var tg=function(c){return c.bot?'<span class="tag t-aa">🤖 BOT</span>':c.own?'<span class="tag t-aa">👑 Owner</span>':c.aa?'<span class="tag t-aa">All-Access</span>':c.app==='syn'?'<span class="tag t-syn">Synapse</span>':c.app==='axon'?'<span class="tag t-axon">Axon</span>':c.app==='cadence'?'<span class="tag t-cad">Cadence</span>':'<span class="tag t-lim">Liminal</span>'};
 $('#codesBox').innerHTML=tableHTML(['Code','App','Made','Status',''],C.map(function(c){var st=c.revoked?'<span class="tag s-dismissed">revoked</span>':c.used?'<span class="tag s-paid">used</span>'+(c.by?'<div class="sub">'+esc(c.by)+'</div>':''):'<span class="tag s-new">unused</span>';
  var b='';if(c.own||c.bot)b='<span class="sub">locked</span>';else if(CAN('revoke_codes')){if(c.app==='syn')b=(c.revoked?'':'<button data-c="revoke">Revoke</button>')+'<button class="dang" data-c="code-delete">Delete</button>';else b='<button class="dang" data-c="code-delete">Revoke</button>'}
  return ['<span class="code" data-copy="'+esc(c.code)+'">'+esc(c.code)+'</span>'+(c.note?'<div class="sub">'+esc(c.note)+'</div>':''),tg(c),esc(fmtT(c.created)),st,'<div class="acts" data-code="'+esc(c.code)+'" data-capp="'+c.app+'">'+b+'</div>']}));}
function render(){if(!D)return;if(CAN('view_requests'))renderReq();renderSheet();renderMore();
 var e=[];if(CAN('view_requests')){if(!(D.syn&&D.syn.ok))e.push('synapse');if(!(D.axon&&D.axon.ok))e.push('axon');if(!(D.liminal&&D.liminal.ok))e.push('liminal');if(!(D.cadence&&D.cadence.ok))e.push('cadence')}
 $('#upd').textContent='updated '+new Date(D.at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Los_Angeles'})+(e.length?' · ⚠ '+e.join(' + ')+' not loading':'')}
function load(quiet){if(!ME)return Promise.resolve();$('#rf').innerHTML='<span class="spin"></span>';return loadAll().then(function(j){$('#rf').textContent='↻';D=j;render();if(view==='logs'&&quiet)loadLogs(true)}).catch(function(){$('#rf').textContent='↻';if(!quiet)toast('Offline? Couldn’t reach the server')})}
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
var ICON={login:'🔓',login_fail:'⛔',login_blocked:'🚫',logout:'👋',setup_key_fail:'⛔',owner_created:'👑',owner_password_recovered:'🛟',password_change:'🔑',denied:'🚫'};
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
 Promise.all(['syn','axon','liminal','cadence'].map(function(a){return appApi(a,'actlog').then(function(j){return {a:a,ok:!!(j&&j.ok),rows:(j&&j.ok?j.log:[]).map(function(r){r.app=a;return r})}},function(){return {a:a,ok:false,rows:[]}})})).then(function(v){
  var bad=v.filter(function(x){return !x.ok}).map(function(x){return APPN[x.a]||x.a});
  var all=[].concat.apply([],v.map(function(x){return x.rows})).filter(function(r){return r.who==='owner-token'}).sort(function(a,b){return b.t-a.t}).slice(0,80);
  box.innerHTML=(all.length?all.map(function(l){return '<div class="lg"><span class="ic">🔑</span><div><b>owner key</b> '+esc(ACTN[l.act]||String(l.act).replace(/-/g,' '))+' · '+esc(APPN[l.app]||l.app)+(l.tgt?' · <span class="mono">'+esc(l.tgt)+'</span>':'')+(l.det?' · '+esc(l.det):'')+'</div><div class="l2">'+esc(fmtT(l.t))+'</div></div>'}).join(''):'<div class="empty">No owner-key changes yet.</div>')+(bad.length?'<p class="sub" style="margin-top:8px">Couldn\u2019t read: '+esc(bad.join(', '))+'</p>':'')})}

/* ---------- clicks ---------- */
document.addEventListener('click',function(e){
 var t=e.target.closest('button,[data-copy]');if(!t||(t.type==='submit'&&t.form))return;
 if(t.dataset.copy){navigator.clipboard&&navigator.clipboard.writeText(t.dataset.copy).then(function(){toast('Copied '+t.dataset.copy)},function(){toast(t.dataset.copy)});return}
 if(t.id==='rf'){load();if(view==='users')loadUsers();if(view==='logs'){loadLogs();loadActlog()}return}
 if(t.id==='whoBtn'){$('#mePanel').hidden=!$('#mePanel').hidden;return}
 if(t.id==='logout'){api('/api/logout',{}).then(function(){ME=null;D=null;RT={};setTok(null);show('login');toast('Logged out')});return}
 if(t.id==='meChpw'){show('chpw');$('#chCancel').hidden=false;$('#chpwp').textContent='Change your password.';return}
 if(t.id==='openT'){act('syn','open',{open:!(D.syn&&D.syn.open)},'Synapse buying '+((D.syn&&D.syn.open)?'closed':'opened'));return}
 if(t.dataset.mapp){MSEL=t.dataset.mapp;document.querySelectorAll('#mApp .ap').forEach(function(x){x.classList.toggle('on',x===t)});$('#mGo').textContent='Make '+(MSEL==='all'?'All-Access':MAPP[MSEL].works)+' code';$('#mOut').hidden=true;return}
 if(t.id==='mGo'){var M=MAPP[MSEL];if(!confirm('Make a new '+M.name+' code?\nWorks on: '+M.works))return;t.disabled=true;var bd={};for(var k in M.body)bd[k]=M.body[k];bd.note=$('#mNote').value.trim();
  act(M.app,'mint',bd,M.name+' code made').then(function(j){t.disabled=false;if(j&&j.ok&&j.code){$('#mNote').value='';navigator.clipboard&&navigator.clipboard.writeText(j.code).catch(function(){});
   var o=$('#mOut');o.hidden=false;o.innerHTML='<div class="sub">'+esc(M.name)+' code · works on '+esc(M.works)+'</div><div class="big">'+esc(j.code)+'</div><div class="row"><button class="pri" data-copy="'+esc(j.code)+'">Copy code</button></div><div class="hint" style="margin-top:8px">Single use. They sign in to '+esc(MSEL==='all'?'any of the 3 apps':M.works)+', open Pro and tap “Have a code”.</div>'}}).catch(function(){t.disabled=false});return}
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
 if(t.dataset.v){switchView(t.dataset.v);return}
 if(t.dataset.f){if(t.dataset.f==='hide')hideTest=!hideTest;else filt=t.dataset.f;renderReq();return}
 if(t.dataset.c){var code=t.parentNode.dataset.code;if(t.dataset.c==='code-delete'&&(t.parentNode.dataset.capp||'syn')==='syn'&&!confirm('Delete code '+code+' for good?'))return;if(t.dataset.c==='revoke'&&!confirm('Revoke '+code+'? It stops unlocking Pro.'))return;var capp=t.parentNode.dataset.capp||'syn';if(capp!=='syn'&&!confirm('Revoke '+code+'? It stops working, and Pro it unlocked turns off.'))return;t.disabled=true;act(capp,t.dataset.c,{code:code},capp!=='syn'||t.dataset.c==='revoke'?'Revoked':'Code deleted');return}
 if(t.dataset.a){var box=t.parentNode,app=box.dataset.app,id=box.dataset.id,a=t.dataset.a;
  var r=rows().filter(function(x){return x.app===app&&x.id===id})[0]||{};
  var who=(r.name||'this request')+' — '+(r.price||'');
  if(a==='note'){var tx=prompt('Note on '+who+' (empty = remove)',r.note?r.note.txt:'');if(tx==null)return;api('/api/notes',{app:app,id:id,txt:tx}).then(function(j){toast(j.ok?'Note saved':(j.words||j.error));load(true)});return}
  if(a==='paid'&&!confirm('Mark '+who+' as PAID?\n\nOnly after the Apple Cash came in.'+(r.aa?'\nAll-Access: unlocks Synapse + Axon + Liminal + Cadence.':'')))return;
  if(a==='delete'&&!confirm('Delete '+who+'? This removes the request'+(r.aa?' from both apps':'')+'.'))return;
  t.disabled=true;
  var twin=null;if(r.aa&&a==='delete'){['syn','axon','liminal','cadence'].forEach(function(o){if(twin||o===r.app)return;var L=((D[o]&&D[o].requests)||[]);var tw=L.filter(function(x){return x.mirror&&(x.link===id||x.id===r.link)})[0];if(tw)twin={app:o,id:tw.id};});}
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
var AC={app:'all',q:'',data:null,busy:false}, APPN={syn:'Synapse',axon:'Axon',liminal:'Liminal',cadence:'Cadence'}, ATAG={syn:'t-syn',axon:'t-axon',liminal:'t-lim',cadence:'t-cad'};
var ARoute={syn:{list:'np-accounts',lic:'np-license',del:'np-delete',pw:'np-password'},axon:{list:'accounts',lic:'acct-license',del:'acct-delete',pw:'acct-reset'},liminal:{list:'accounts',lic:'acct-license',del:'acct-delete',pw:'acct-reset'},cadence:{list:'accounts',lic:'acct-license',del:'acct-delete',pw:'acct-reset'}};
var LICN={free:'Free',pro:'Pro',all_access:'All-Access',owner:'Owner 👑',bot:'Bot 🤖'};
function acLabel(a){return a.email||('@'+a.username)}
function loadAccounts(){if(!CAN('manage_accounts'))return;$('#acBox').innerHTML='<div class="empty"><span class="spin"></span> Loading accounts…</div>';
 return Promise.all(['syn','axon','liminal','cadence'].map(function(app){return appApi(app,ARoute[app].list).then(function(j){return j},function(){return{ok:false,error:'unreachable'}})})).then(function(v){
  AC.data={syn:v[0],axon:v[1],liminal:v[2],cadence:v[3]};renderAccounts()})}
function acAll(){var out=[];['syn','axon','liminal','cadence'].forEach(function(app){var j=AC.data&&AC.data[app];((j&&j.accounts)||[]).forEach(function(a){a.app=app;out.push(a)})});return out}
function acSiblings(a){var em=(a.email||'').toLowerCase();if(!em)return [a];return acAll().filter(function(x){return (x.email||'').toLowerCase()===em})}
function renderAccounts(){
 if(!AC.data)return;var all=acAll();
 $('#acApp').innerHTML=[['all','All apps'],['syn','Synapse'],['axon','Axon'],['liminal','Liminal'],['cadence','Cadence']].map(function(c){var n=c[0]==='all'?all.length:all.filter(function(a){return a.app===c[0]}).length;return '<button class="chip'+(AC.app===c[0]?' on':'')+'" data-acapp="'+c[0]+'">'+c[1]+' · '+n+'</button>'}).join('');
 var sum=[];['syn','axon','liminal','cadence'].forEach(function(app){var j=AC.data[app];if(!j||!j.ok){sum.push(APPN[app]+': couldn’t load ('+esc((j&&(j.words||j.error))||'error')+')');return}
  var c={};j.accounts.forEach(function(a){var k=a.license+(/^grandfathered/.test(a.via)?'*':'');c[k]=(c[k]||0)+1});
  sum.push('<b>'+APPN[app]+'</b> '+j.accounts.length+': '+Object.keys(c).map(function(k){return c[k]+' '+(LICN[k.replace('*','')]||k).replace(/ .*/,'')+(k.slice(-1)==='*'?' (grandfathered)':'')}).join(', '))});
 $('#acSum').innerHTML=sum.join('<br>');$('#acN').textContent=all.length+' total';
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
  return crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:te.encode((app==='axon'?'axon-sync/v1:':app==='cadence'?'cadence-sync/v1:':'liminal-sync/v1:')+String(kdf||'').trim().toLowerCase()),iterations:600000},base,512)}).then(function(b){
  return [].slice.call(new Uint8Array(b).slice(32)).map(function(x){return x.toString(16).padStart(2,'0')}).join('')})}
function acLicense(a,lc){
 if(lc===a.license)return toast('Already '+LICN[lc]);
 var sib=acSiblings(a), wasAA=sib.filter(function(x){return x.license==='all_access'&&!x.locked});
 var msg=lc==='all_access'?'Give '+acLabel(a)+' All-Access? It unlocks Synapse, Axon, Liminal and Cadence'+(sib.length>1?' on every account with this email':'')+'.':
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
boot();
})();
