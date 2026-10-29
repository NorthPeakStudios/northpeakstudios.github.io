/* Northpeak Admin · Apps tab (np-apps-tab v1, Oct 29 2026) — owner only.
   Lists every Northpeak app and every bot account, with each account's status and recent public activity.
   This file holds NO account data: the accounts live in the admin API's database and come back only to a signed-in
   owner (GET /api/bots answers 403 to every other role and 401 to everyone else).
   "Open" never carries a password: it logs a monitoring session, then opens the provider's own sign-in / inbox in a
   new tab where Odin signs in himself. While a session is open a red bar sits on top of the panel; "End session"
   closes that tab (and can open the provider's sign-out), clears the panel's state and logs the end. Sessions end
   only when Odin ends them (or logs out of the panel). */
(function(){
var N=window.NPA; if(!N)return;
var $=function(s){return document.querySelector(s)}, esc=N.esc;
var BOTS=null, ACT={}, ACT_AT=0, LOADING=false, FILT='', WIN={}, PING={}, TICK=0, OPEN={}; /* OPEN: bot id -> {sid,started,ua} (the server's word) */
var SS='np_mon';
function local(){try{return JSON.parse(sessionStorage.getItem(SS)||'{}')||{}}catch(e){return{}}}
function saveLocal(o){try{if(Object.keys(o).length)sessionStorage.setItem(SS,JSON.stringify(o));else sessionStorage.removeItem(SS)}catch(e){}}
function ago(ms){if(!ms)return'';var s=Math.max(0,(Date.now()-ms)/1000);if(s<60)return'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';if(s<86400*7)return Math.floor(s/86400)+'d ago';return N.fmtT(ms)}
function dur(ms){var m=Math.max(0,Math.floor((Date.now()-ms)/60000));return m<1?'<1 min':m<60?m+' min':Math.floor(m/60)+'h '+(m%60)+'m'}
function safeUrl(u){return /^https:\/\/[^\s"'<>]+$/.test(u||'')?u:''}
function botName(b){return b.label||b.handle}
function byId(id){return (BOTS||[]).filter(function(b){return b.id===id})[0]}
var KIND_IC={gmail:'<span class="bk k-gm">M</span>',github:'<span class="bk k-gh">GH</span>',other:'<span class="bk k-ot">↗</span>'};
var SIGNOUT={gmail:'https://accounts.google.com/Logout',github:'https://github.com/logout'};
var SIGNOUT_WORDS={gmail:'Opens Google’s sign-out in that tab. Google signs out every account in this browser, your own included.',github:'Opens GitHub’s sign-out page in that tab — tap “Sign out” there.'};
var STATUS={active:['Visible','s-ok'],hidden:['Hidden on GitHub','s-bad'],limited:['Check later','s-warn'],error:['No answer','s-warn'],private:['Private inbox','s-mu'],link:['Link','s-mu'],unknown:['…','s-mu']};

/* ---------- data ---------- */
function load(quiet){
 if(LOADING)return Promise.resolve();LOADING=true;
 return N.api('/api/bots'+(quiet?'?quiet=1':'')).then(function(j){
  if(!j||!j.ok){LOADING=false;if(j&&j.error!=='signed_out')$('#apBots').innerHTML='<div class="empty">'+esc(j.words||j.error||'Couldn’t load')+'</div>';return}
  BOTS=j.bots||[];OPEN={};BOTS.forEach(function(b){if(b.session)OPEN[b.id]=b.session});
  var L=local(),ch=false;for(var id in L)if(!OPEN[id]||OPEN[id].sid!==L[id].sid){delete L[id];ch=true;if(WIN[id])try{WIN[id].close()}catch(e){};delete WIN[id]}if(ch)saveLocal(L);
  bar();if(isOn())render();
  return N.api('/api/bots/activity').then(function(a){LOADING=false;if(a&&a.ok){ACT={};(a.activity||[]).forEach(function(x){ACT[x.id]=x});ACT_AT=Date.now()}if(isOn())render()})
 })}
function isOn(){var v=$('#v-apps');return v&&!v.hidden}

/* ---------- apps (public list, from admin.js) ---------- */
function ping(a){var t0=Date.now();PING[a.k]={st:'…'};
 var ac=window.AbortController?new AbortController():null,tm=ac?setTimeout(function(){ac.abort()},8000):0;
 fetch(a.base+'/api/ping?t='+t0,{mode:'no-cors',cache:'no-store',signal:ac?ac.signal:undefined}).then(function(){clearTimeout(tm);PING[a.k]={st:'up',ms:Date.now()-t0};if(isOn())renderApps()},function(){clearTimeout(tm);PING[a.k]={st:'down'};if(isOn())renderApps()})}
function renderApps(){
 var A=N.apps();
 $('#apApps').innerHTML=A.map(function(a){var p=PING[a.k]||{};
  return '<div class="apc"><div class="apt"><span class="tag '+esc(a.tag)+'">'+esc(a.name)+'</span><span class="pg '+(p.st==='up'?'up':p.st==='down'?'dn':'')+'" title="backend">'+(p.st==='up'?'up · '+p.ms+' ms':p.st==='down'?'down':'checking')+'</span></div>'+
   '<div class="aph">'+esc(a.open.replace(/^https:\/\//,'').replace(/\/$/,''))+'</div>'+
   '<div class="acts"><a class="btn" href="'+esc(safeUrl(a.open))+'" target="_blank" rel="noopener">Open app</a><button data-apsec="'+esc(a.k)+'">Requests</button></div></div>'}).join('')}

/* ---------- accounts ---------- */
function render(){
 renderApps();
 var box=$('#apBots');if(!BOTS){box.innerHTML='<div class="empty"><span class="spin"></span></div>';return}
 if(!BOTS.length)box.innerHTML='<div class="empty">No bot accounts yet. Tap “Add account”.</div>';
 else box.innerHTML=BOTS.map(function(b){var a=ACT[b.id]||{},st=STATUS[a.status||'unknown']||STATUS.unknown,o=OPEN[b.id];
  var last=(a.items||[]).filter(function(x){return x.src==='github'})[0];
  return '<div class="bcard'+(o?' mon':'')+'">'+
   '<div class="top">'+KIND_IC[b.kind]+'<div class="bn"><b>'+esc(botName(b))+'</b>'+(b.label?'<div class="sub">'+esc(b.handle)+'</div>':'')+'</div><span class="lic '+st[1]+'">'+esc(st[0])+'</span></div>'+
   '<div class="meta">'+esc(b.kindLabel)+(b.org?' · org <a href="https://github.com/'+encodeURIComponent(b.org)+'" target="_blank" rel="noopener">'+esc(b.org)+'</a>'+(a.org&&a.org.missing?' (not found)':a.org?' ('+(a.org.repos||0)+' public repos)':''):'')+
    (a.words?'<br>'+esc(a.words):'')+(last?'<br>Last public activity '+esc(ago(last.t)):'')+(b.note?'<br><span class="bnote">'+esc(b.note)+'</span>':'')+'</div>'+
   (o?'<div class="monl">● Monitoring · '+esc(dur(o.started))+(local()[b.id]?'':' · opened on '+esc(o.ua||'another device'))+'</div>':'')+
   '<div class="acts">'+(o?'<button class="endb" data-end="'+esc(b.id)+'">End session</button><button data-reopen="'+esc(b.id)+'">Show tab</button>':'<button class="openb" data-open="'+esc(b.id)+'">Open</button>')+
    '<a class="btn" href="'+esc(safeUrl(b.profile))+'" target="_blank" rel="noopener noreferrer">'+(b.kind==='github'?'Profile':b.kind==='gmail'?'Gmail':'Link')+'</a>'+
    '<button data-bact="'+esc(b.id)+'">Activity</button><button data-bedit="'+esc(b.id)+'" aria-label="edit">⋯</button></div></div>'}).join('');
 renderFeed()}
function renderFeed(){
 var all=[];(BOTS||[]).forEach(function(b){var a=ACT[b.id];if(!a)return;if(FILT&&FILT!==b.id)return;(a.items||[]).forEach(function(x){all.push({x:x,b:b})})});
 all.sort(function(p,q){return q.x.t-p.x.t});
 $('#apFk').innerHTML=[['','All']].concat((BOTS||[]).map(function(b){return[b.id,botName(b)+' · '+b.kindLabel]})).map(function(k){return '<button class="chip'+(FILT===k[0]?' on':'')+'" data-afk="'+esc(k[0])+'">'+esc(k[1])+'</button>'}).join('');
 $('#apFeed').innerHTML=all.length?all.slice(0,60).map(function(r){var x=r.x,u=safeUrl(x.url);
  return '<div class="lg"><span class="ic">'+(x.src==='panel'?(/ended/.test(x.text)?'⏹':'🔴'):'⬢')+'</span><div><b>'+esc(x.src==='panel'?botName(r.b):(x.actor||botName(r.b)))+'</b> '+esc(x.text)+
   (x.repo?' · '+(u?'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(x.repo)+'</a>':esc(x.repo)):'')+(x.org?' <span class="tag t-app">org</span>':'')+
   '<div class="sub">'+esc(ago(x.t))+(x.src==='panel'?' · this panel':' · GitHub')+'</div></div></div>'}).join(''):'<div class="empty">'+(BOTS&&BOTS.length?'Nothing yet. GitHub activity and panel sessions show here.':'Add an account to see its activity.')+'</div>';
 $('#apUpd').textContent=ACT_AT?'updated '+new Date(ACT_AT).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',second:'2-digit'}):''}

/* ---------- monitoring sessions ---------- */
function bar(){
 var b=$('#monBar'),ids=Object.keys(OPEN);
 if(!ids.length){b.hidden=true;document.body.classList.remove('mon-on');document.body.style.paddingTop='';if(/^🔴 /.test(document.title))document.title=document.title.slice(3);return}
 b.innerHTML=ids.map(function(id){var x=byId(id),o=OPEN[id];return '<div class="mb"><span class="mdot"></span><b>MONITORING</b><span class="mn" data-mgo="1">'+esc(x?botName(x):'account')+'</span><span class="mt">'+esc(dur(o.started))+(local()[id]?'':' · '+esc(o.ua||'other device'))+'</span><button data-end="'+esc(id)+'">End session</button></div>'}).join('');
 b.hidden=false;document.body.classList.add('mon-on');document.body.style.paddingTop='calc(env(safe-area-inset-top) + 10px + '+b.offsetHeight+'px)';
 if(!/^🔴 /.test(document.title))document.title='🔴 '+document.title}
function openBot(id){
 var b=byId(id);if(!b)return;var url=safeUrl(b.open);if(!url){N.toast('No link saved for this account');return}
 var w=null;try{w=window.open('about:blank','npmon_'+id)}catch(e){} /* opened inside the tap so the phone doesn't block it; it goes to the provider only after the session is logged */
 N.api('/api/bots/session',{op:'start',id:id}).then(function(j){
  if(!j||!j.ok){try{w&&w.close()}catch(e){};N.toast(j&&j.words||'Couldn’t start the session');return}
  OPEN[id]={sid:j.sid,started:j.started,ua:''};var L=local();L[id]={sid:j.sid,started:j.started};saveLocal(L);
  if(w&&!w.closed){try{w.location.href=j.open}catch(e){w=window.open(j.open,'npmon_'+id)}}else w=window.open(j.open,'npmon_'+id);
  WIN[id]=w;if(!w)N.toast('Your browser blocked the new tab — tap “Show tab”');
  bar();render();setTimeout(function(){load(true)},1500)})}
function reopen(id){var b=byId(id);if(!b)return;var w=WIN[id];if(w&&!w.closed){try{w.focus();return}catch(e){}}WIN[id]=window.open(safeUrl(b.open),'npmon_'+id)}
function askEnd(id){
 var b=byId(id),o=OPEN[id];if(!o)return;var kind=b?b.kind:'other',so=SIGNOUT[kind];
 var m=document.createElement('div');m.className='amod';
 m.innerHTML='<div class="box"><h3>End session</h3><p><b>'+esc(b?botName(b):'account')+'</b> · open '+esc(dur(o.started))+'</p>'+
  (so?'<label><input type="checkbox" id="mSo" checked> Also sign this account out</label><p>'+esc(SIGNOUT_WORDS[kind])+'</p>':'')+
  '<p>Closes the account’s tab if this browser opened it, clears this panel’s session and logs the end.</p>'+
  '<div class="row" style="margin-top:12px"><button class="dang endx" id="mEnd">End session</button><button id="mKeep">Keep monitoring</button></div></div>';
 document.body.appendChild(m);
 m.addEventListener('click',function(e){if(e.target===m||e.target.id==='mKeep'){m.remove();return}
  if(e.target.id==='mEnd'){var s=$('#mSo');endBot(id,!!(s&&s.checked));m.remove()}})}
function endBot(id,signout){
 var b=byId(id),o=OPEN[id];if(!o)return;var w=WIN[id],alive=false;try{alive=!!(w&&!w.closed)}catch(e){}
 var so=signout&&b&&SIGNOUT[b.kind];
 if(so){ /* the provider's own sign-out, in the account's tab (or a new one if this browser lost it) */
  if(alive){try{w.location.href=so}catch(e){window.open(so,'npmon_'+id)}}else window.open(so,'npmon_'+id);
  if(b.kind==='gmail'&&alive)setTimeout(function(){try{w.close()}catch(e){}},5000)}
 else if(alive){try{w.close()}catch(e){}}
 delete WIN[id];delete OPEN[id];var L=local();var mine=!!L[id];delete L[id];saveLocal(L);bar();render();
 N.api('/api/bots/session',{op:'end',sid:o.sid,how:mine?'button':'other_device',signout:!!so}).then(function(j){
  N.toast(j&&j.ok?(so?'Session ended · signing out':alive||!mine?'Session ended':'Session ended — close the account’s tab if it’s still open'):'Ended here, but the log didn’t save — try again');load(true)})}
function closeAll(){for(var id in WIN){try{WIN[id]&&WIN[id].close()}catch(e){}}WIN={};OPEN={};saveLocal({});BOTS=null;ACT={};bar()}

/* ---------- add / edit ---------- */
function editor(b){
 var m=document.createElement('div');m.className='amod';var add=!b;
 m.innerHTML='<div class="box"><h3>'+(add?'Add a bot account':'Edit '+esc(botName(b)))+'</h3>'+
  '<form id="bForm" autocomplete="off">'+
  (add?'<div class="fl"><span>Type</span><select id="bKind" class="sm"><option value="gmail">Gmail</option><option value="github">GitHub</option><option value="other">Other (any site)</option></select></div>'+
   '<div class="fl"><span id="bHl">Gmail address</span><input id="bHandle" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="120" placeholder="name@gmail.com"></div>':'<p>'+esc(b.kindLabel)+' · '+esc(b.handle)+'</p>')+
  '<div class="fl"><span>Label (optional)</span><input id="bLabel" maxlength="60" value="'+esc(b?b.label:'')+'" placeholder="e.g. Main bot inbox"></div>'+
  '<div class="fl" id="bOrgW"><span>GitHub org (optional)</span><input id="bOrg" maxlength="60" autocapitalize="off" spellcheck="false" value="'+esc(b?b.org:'')+'" placeholder="NorthPeak-Studios"></div>'+
  '<div class="fl" id="bUrlW"><span>Sign-in link (https)</span><input id="bUrl" maxlength="300" autocapitalize="off" spellcheck="false" value="'+esc(b?b.url:'')+'" placeholder="https://"></div>'+
  '<div class="fl"><span>Note (optional)</span><input id="bNote" maxlength="240" value="'+esc(b?b.note:'')+'"></div>'+
  '<p class="nopw">🔒 Never put a password here. This page doesn’t take or show passwords — you sign in on the provider’s own page.</p>'+
  '<div class="row" style="margin-top:10px"><button class="pri" type="submit">'+(add?'Add account':'Save')+'</button><button type="button" id="bX">Cancel</button>'+(add?'':'<div class="sp"></div><button type="button" class="dang" id="bDel">Remove</button>')+'</div><p class="err" id="bErr"></p></form></div>';
 document.body.appendChild(m);
 function kind(){return add?$('#bKind').value:b.kind}
 function sync(){var k=kind();$('#bOrgW').hidden=k!=='github';$('#bUrlW').hidden=k!=='other';if(add){$('#bHl').textContent=k==='gmail'?'Gmail address':k==='github'?'GitHub username':'Name';$('#bHandle').placeholder=k==='gmail'?'name@gmail.com':k==='github'?'username':'e.g. TikTok promo'}}
 sync();if(add)$('#bKind').addEventListener('change',sync);
 m.addEventListener('click',function(e){if(e.target===m||e.target.id==='bX')m.remove();
  if(e.target.id==='bDel'){if(!confirm('Remove '+botName(b)+' from the Apps tab?\nThis only removes it from this list; the account itself isn’t touched.'))return;
   N.api('/api/bots',{op:'remove',id:b.id}).then(function(j){if(j&&j.ok){m.remove();N.toast('Removed');load(true)}else $('#bErr').textContent=j&&j.words||'Couldn’t remove'})}});
 $('#bForm').addEventListener('submit',function(e){e.preventDefault();var k=kind();
  var body={op:add?'add':'edit',label:$('#bLabel').value,note:$('#bNote').value};if(add){body.kind=k;body.handle=$('#bHandle').value}else body.id=b.id;
  if(k==='github')body.org=$('#bOrg').value;if(k==='other')body.url=$('#bUrl').value;
  N.api('/api/bots',body).then(function(j){if(j&&j.ok){m.remove();N.toast(add?'Account added':'Saved');load(true)}else $('#bErr').textContent=j&&j.words||'Couldn’t save'})})}

/* ---------- wiring ---------- */
document.addEventListener('click',function(e){
 var t=e.target.closest('button,[data-mgo]');if(!t)return;
 if(t.dataset.open){openBot(t.dataset.open);return}
 if(t.dataset.reopen){reopen(t.dataset.reopen);return}
 if(t.dataset.end){askEnd(t.dataset.end);return}
 if(t.dataset.mgo){N.go('apps');return}
 if(t.dataset.bact){FILT=t.dataset.bact;renderFeed();var f=$('#apFeedP');f&&f.scrollIntoView&&f.scrollIntoView({behavior:'smooth',block:'start'});return}
 if(t.dataset.afk!=null){FILT=t.dataset.afk;renderFeed();return}
 if(t.dataset.bedit){editor(byId(t.dataset.bedit));return}
 if(t.dataset.apsec){N.sec(t.dataset.apsec,'req');return}
 if(t.id==='apAdd'){editor(null);return}
 if(t.id==='apRf'){N.toast('Refreshing…');ACT_AT=0;load(true);N.apps().forEach(ping);return}
});
setInterval(function(){ /* 1-min heartbeat: keep the bar's clock and the feed fresh; pick up sessions ended on another device */
 if(!N.me()||N.me().role!=='owner')return;TICK++;
 if(Object.keys(OPEN).length)bar();
 if(isOn()&&!document.hidden){render();if(TICK%2===0)load(true)}else if(Object.keys(OPEN).length&&TICK%3===0)load(true)},60000);
document.addEventListener('visibilitychange',function(){if(!document.hidden&&N.me()&&N.me().role==='owner'&&(isOn()||Object.keys(OPEN).length))load(true)});

window.npUpdate=window.npUpdate||{};(function(prev){window.npUpdate.safe=function(){if(Object.keys(OPEN).length)return false;return prev?prev():true}})(window.npUpdate.safe); /* never auto-reload mid-session: the panel would lose its handle on the account's tab */

window.NPApps={
 show:function(){if(!BOTS)render();load(false);N.apps().forEach(ping)},
 boot:function(){if(N.me()&&N.me().role==='owner')load(true)},  /* after sign-in: restore the red bar if a session is still open */
 onLogout:function(){closeAll()},   /* the API also ends every open session on /api/logout */
 panic:function(){for(var id in OPEN){var b=byId(id),so=b&&SIGNOUT[b.kind],w=WIN[id];if(!so)continue;try{if(w&&!w.closed){w.location.href=so;continue}}catch(e){}window.open(so,'npmon_'+id)}}, /* np-features v1 panic logout: each open account's own sign-out page; logout() then ends the sessions */
 onSignedOut:function(){closeAll()}
};
})();
