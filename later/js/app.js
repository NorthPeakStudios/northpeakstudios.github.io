// Later · app shell: router, sheet, toast, command search, capsule API, countdowns. Northpeak Studios.
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(m){ const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,2800); }
const routes={};
let routeGen=0;
function route(){ routeGen++; const h=(location.hash||'#vault').slice(1); const [r,...a]=h.split('/'); const f=routes[r]||routes.vault; const v=$('#view'); closeSheet();
  $$('.tabbar a').forEach(x=>{ const k=x.getAttribute('href').slice(1), on=k===r||(x.dataset.also||'').split(' ').includes(r)||(!routes[r]&&k==='vault'); x.classList.toggle('on',on); on?x.setAttribute('aria-current','page'):x.removeAttribute('aria-current'); });
  const dec=s=>{ try{ return decodeURIComponent(s); }catch(e){ return s; } };
  try{ const p=f(v,...a.map(dec)); if(p&&p.catch) p.catch(e=>{ console.warn(e); v.innerHTML='<p class="muted">Something went wrong on this screen.</p>'; }); }catch(e){ console.warn(e); v.innerHTML='<p class="muted">Something went wrong on this screen.</p>'; }
  a11y(v); window.scrollTo(0,0); }
function go(h){ if(location.hash==='#'+h) route(); else location.hash=h; }
function a11y(root){ if(!root) return; root.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]),select,textarea').forEach(el=>{ if(el.getAttribute('aria-label')||(el.labels&&el.labels.length)) return;
  const l=el.previousElementSibling; if(l&&l.tagName==='LABEL'&&!l.htmlFor){ if(!el.id) el.id='f'+Math.random().toString(36).slice(2,8); l.htmlFor=el.id; } else if(el.placeholder) el.setAttribute('aria-label',el.placeholder); }); }
window.addEventListener('hashchange',route);
function sheet(html,onOpen){ $('#sbody').innerHTML='<div class="grab"></div>'+html; $('#sheet').hidden=false; document.body.style.overflow='hidden'; if(onOpen) onOpen($('#sbody')); a11y($('#sbody')); }
function closeSheet(){ const s=$('#sheet'); if(s&&!s.hidden){ s.hidden=true; document.body.style.overflow=''; } }
document.addEventListener('click',e=>{ if(e.target.closest('[data-close]')) closeSheet(); });
const signed=()=>!!(window.Cloud&&Cloud.signedIn());
const P=()=>!!(window.Cloud&&Cloud.isPro());
const fmtD=t=>new Date(t).toLocaleDateString([], {weekday:'short',month:'short',day:'numeric',year:new Date(t).getFullYear()!==new Date().getFullYear()?'numeric':undefined});
const fmtDT=t=>fmtD(t)+', '+new Date(t).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
const localISO=t=>{ const d=new Date(t); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,16); };
const plural=(n,w,ws)=>n+' '+(n===1?w:(ws||w+'s'));
/* server clock: countdowns use the server's time, which is what decides an unlock */
let skew=0; const now=()=>Date.now()-skew;
function left(ms){ ms=Math.max(0,ms); const d=Math.floor(ms/864e5), h=Math.floor(ms%864e5/36e5), m=Math.floor(ms%36e5/6e4), s=Math.floor(ms%6e4/1e3);
  if(d>=365){ const y=Math.floor(d/365), r=d%365; return y+'y '+r+'d'; } if(d>0) return d+'d '+h+'h'; if(h>0) return h+'h '+m+'m'; return m+'m '+String(s).padStart(2,'0')+'s'; }
function tick(){ $$('[data-at]').forEach(el=>{ const at=+el.dataset.at, l=at-now(); el.textContent=l>0?left(l):'now'; if(l<=0&&!el.dataset.fired){ el.dataset.fired=1; const h=location.hash.slice(1).split('/')[0]; if(h==='vault'||h==='c'||h==='') setTimeout(route,800); } });
  $$('[data-big]').forEach(el=>{ const l=Math.max(0,+el.dataset.big-now()); const d=Math.floor(l/864e5),h=Math.floor(l%864e5/36e5),m=Math.floor(l%36e5/6e4),s=Math.floor(l%6e4/1e3); const v=[d,h,m,s]; el.querySelectorAll('b').forEach((b,i)=>b.textContent=String(v[i]).padStart(i?2:1,'0')); }); }
setInterval(tick,1000);

/* ---------- capsule API (all locking is on the server) ---------- */
const Caps={
  list:null, at:0,
  async api(path,body){ if(!signed()) { const e=new Error('signed_out'); throw e; } const j=await Cloud.api(path,body); if(j.now) skew=Date.now()-j.now; return j; },
  async load(force){ if(!signed()) { Caps.list=null; return null; } if(!force&&Caps.list&&Date.now()-Caps.at<15000) return Caps.list; const j=await Caps.api('/api/caps'); Caps.list=j; Caps.at=Date.now(); badge(); return j; },
  one(id){ return Caps.list&&Caps.list.caps.find(c=>c.id===id); },
  put(c){ if(!Caps.list) return; const i=Caps.list.caps.findIndex(x=>x.id===c.id); if(i>=0) Caps.list.caps[i]=c; else Caps.list.caps.unshift(c); badge(); },
  drop(id){ if(Caps.list) Caps.list.caps=Caps.list.caps.filter(c=>c.id!==id); badge(); },
  media:{},
  async getMedia(id,m){ if(Caps.media[m]) return Caps.media[m]; const j=await Caps.api('/api/caps/media?id='+encodeURIComponent(id)+'&m='+encodeURIComponent(m)); Caps.media[m]=j.data; return j.data; },
};
window.Caps=Caps;
function badge(){ const b=$('#bdg'); if(!b) return; const n=Caps.list?Caps.list.caps.filter(c=>c.ready&&!c.unlocked&&c.role!=='owner').length:0; b.hidden=!n; b.textContent=n; }
const ERRS={pro_needed:'That’s a Later Pro feature.',free_limit:'Free plan: 3 active capsules. Open one or get Pro for unlimited.',need_condition:'Pick at least one unlock condition.',no_recipient:'Pick who it’s for.',bad_date:'Pick a date (within the next 60 years).',bad_opens:'The “everyone opened Later” number can’t be more than the people it’s for.',bad_streak:'A streak is 2 to 366 days.',bad_loc:'Set the place first (tap “Use where I am now”).',bad_question:'Write the question and its answer.',empty:'Write something first.',media_too_big:'That photo or voice note is too big.',bad_media:'That file didn’t work. Try another photo.',too_many_media:'Up to 4 photos and 1 voice note.',bad_code:'No capsule with that code.',closed:'That group capsule is already sealed.',full:'That capsule is full.',slow_down:'Too many tries. Wait a bit.',offline:'You’re offline. Try again when you’re back online.',signed_out:'Sign in first.',sealed:'Still sealed.',not_today:'Your phone’s date looks off.',too_big_or_bad_json:'That’s too big to send. Try fewer photos or a shorter voice note.'};
const errText=e=>ERRS[e&&e.message]||('Something went wrong ('+esc(e&&e.message||'error')+').');

/* ---------- command search (no “Labs”: every tool is a command here or a button where it fits) ---------- */
const CMDS=[
  ['✍️','New capsule','write',['letter','write','new','create']],
  ['💌','Letter to future you','reflect',['future','reflection','prompt','me']],
  ['👥','Start a group capsule','write/group',['group','friends','together'],1],
  ['🔑','Join with a code','join',['code','join','friend','add piece']],
  ['🔥','Check in today','streak',['streak','check','daily']],
  ['🔒','Vault','vault',['capsules','locked','open']],
  ['📝','Drafts','drafts',['draft','saved']],
  ['📍','Capsule that opens at a place','write/loc',['location','place','map','geo'],1],
  ['❓','Capsule with a secret question','write/q',['question','answer','secret'],1],
  ['🗓️','Capsule for a date','write/date',['date','birthday','year','graduation']],
  ['⭐','Later Pro','pro',['pro','upgrade','buy','all-access']],
  ['👤','Account','account',['sign in','login','email','code','redeem']],
  ['❔','How unlocking works','how',['help','how','rules']],
  ['ℹ️','About Later','about',['about','version']],
];
function palette(){
  sheet(`<div class="pal"><input id="palq" placeholder="Search capsules and commands" autocomplete="off" enterkeyhint="go"><div class="list" id="palr"></div></div>`,root=>{
    const q=root.querySelector('#palq'), out=root.querySelector('#palr');
    const draw=()=>{ const s=q.value.trim().toLowerCase(); const rows=[];
      for(const [k,n,h,w,pro] of CMDS){ if(!s||n.toLowerCase().includes(s)||w.some(x=>x.includes(s))) rows.push(`<a class="it" href="#${h}"><span class="k">${k}</span><span class="wh"><b>${esc(n)}</b></span>${pro&&!P()?'<span class="pro-tag">Pro</span>':''}</a>`); }
      if(Caps.list&&s) for(const c of Caps.list.caps){ if(((c.title||'')+' '+(c.teaser||'')+' '+(c.from||'')).toLowerCase().includes(s)) rows.push(`<a class="it" href="#c/${c.id}"><span class="k">${c.unlocked?'📬':'🔒'}</span><span class="wh"><b>${esc(c.title)}</b><small>${esc(c.teaser||'')}</small></span></a>`); }
      for(const d of Store.drafts()) if(s&&((d.title||'')+' '+(d.text||'')).toLowerCase().includes(s)) rows.push(`<a class="it" href="#write/d/${d.id}"><span class="k">📝</span><span class="wh"><b>${esc(d.title||'Untitled draft')}</b><small>Draft</small></span></a>`);
      out.innerHTML=rows.join('')||'<p class="muted">Nothing matches.</p>'; };
    q.addEventListener('input',draw); q.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const a=out.querySelector('a'); if(a){ e.preventDefault(); location.hash=a.getAttribute('href'); closeSheet(); } } });
    out.addEventListener('click',e=>{ const a=e.target.closest('a'); if(a&&a.getAttribute('href')===location.hash) { e.preventDefault(); closeSheet(); route(); } else closeSheet(); });
    draw(); setTimeout(()=>q.focus(),60);
  });
}
document.addEventListener('DOMContentLoaded',()=>{ const b=$('#palBtn'); if(b) b.addEventListener('click',palette); });

/* "opened Later" counts for capsules waiting on everyone opening the app */
let helloAt=0;
function hello(){ if(!signed()||Date.now()-helloAt<60000) return; helloAt=Date.now(); Cloud.api('/api/hello',{}).catch(()=>{}); }
document.addEventListener('visibilitychange',()=>{ if(!document.hidden){ hello(); const h=location.hash.slice(1).split('/')[0]; if(signed()&&(h==='vault'||!h)) Caps.load(true).then(()=>{ if(location.hash.slice(1).split('/')[0]===h) route(); }).catch(()=>{}); } });
window.addEventListener('cloud-ready',()=>{ hello(); if(signed()) Caps.load(true).catch(()=>{}); });
document.addEventListener('DOMContentLoaded',route);
