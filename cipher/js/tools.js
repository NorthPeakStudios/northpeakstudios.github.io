// Cipher · the code-breaker's toolkit. Free: frequency analysis, shift wheel, tally pad, encoder.
// Pro: Vigenère helper (key length from coincidence + best key), cryptogram bench, auto-shift ranking. Also opened in context from puzzles.
(function(){
const G=window.CipherGen, L=G.ABC;
const EN=[8.2,1.5,2.8,4.3,12.7,2.2,2.0,6.1,7.0,0.15,0.77,4.0,2.4,6.7,7.5,1.9,0.095,6.0,6.3,9.1,2.8,0.98,2.4,0.15,2.0,0.074];
const counts=s=>{ const c=Array(26).fill(0); for(const ch of G.norm(s)) c[L.indexOf(ch)]++; return c; };
const chi=s=>{ const c=counts(s), n=c.reduce((a,b)=>a+b,0)||1; let x=0; for(let i=0;i<26;i++){ const e=EN[i]/100*n; x+=(c[i]-e)**2/(e||1); } return x; };
const ioc=s=>{ const c=counts(s), n=c.reduce((a,b)=>a+b,0); if(n<2) return 0; return c.reduce((a,x)=>a+x*(x-1),0)/(n*(n-1)); };
const LS=(k,v)=>{ try{ if(v===undefined) return JSON.parse(localStorage.getItem('cph.'+k)||'null'); localStorage.setItem('cph.'+k,JSON.stringify(v)); }catch(e){ return null; } };
const TOOLS=[['freq','📊','Frequency analysis','Letter counts vs normal English, doubles, common pairs',0],['wheel','🔄','Shift wheel','Turn the alphabet and read every Caesar shift',0],['tally','🧮','Tally pad','Counters and scratch notes for any puzzle',0],['encode','✉️','Encoder','Write your own secret message (Caesar, Atbash, Vigenère)',0],['vig','🗝️','Vigenère helper','Finds the key length and the most likely key',1],['bench','🔣','Cryptogram bench','Swap letters and watch the message appear',1],['auto','⚡','Auto-shift','Ranks all 25 Caesar shifts by how English they read',1]];
routes.tools=v=>{ v.innerHTML=`<h2>Toolkit</h2><p class="muted">Code-breaking tools. They also open right from the puzzles that need them.</p><div class="card list">${TOOLS.map(([id,ic,n,s,pro])=>`<a class="it" href="#tool/${id}"><span class="ic">${ic}</span><span class="wh"><b>${n} ${pro&&!P()?'<span class="pill pro">Pro</span>':''}</b><small>${s}</small></span><span class="muted">›</span></a>`).join('')}</div>`; };
routes.tool=(v,id,arg)=>{ const t=TOOLS.find(x=>x[0]===id); if(!t){ location.hash='#tools'; return; }
  if(t[4]&&!P()){ CphLock(v,t[2],t[3]); return; }
  v.innerHTML=`<p style="margin:0"><a href="#tools">‹ Toolkit</a></p><h2>${t[1]} ${t[2]}</h2><div id="tb"></div>`; const tb=$('#tb'); const txt=arg||LS('tooltext')||'';
  ({freq,wheel,tally,encode,vig,bench,auto})[id](tb,txt); };
function inputHTML(txt,ph){ return `<label>Text</label><textarea id="ti" placeholder="${ph||'Paste or type cipher text'}" autocapitalize="characters" spellcheck="false">${esc(txt)}</textarea>`; }
function keep(el,fn){ const ti=el.querySelector('#ti'); ti.addEventListener('input',()=>{ LS('tooltext',ti.value); fn(); }); fn(); }
function freqHTML(s){ const c=counts(s), n=c.reduce((a,b)=>a+b,0); if(!n) return '<p class="muted">Type some text to see its letters.</p>';
  const ord=[...Array(26).keys()].sort((a,b)=>c[b]-c[a]||a-b), mx=Math.max(...c);
  const bg={}; const t=G.norm(s); for(let i=0;i<t.length-1;i++){ const k=t.slice(i,i+2); bg[k]=(bg[k]||0)+1; }
  const dbl=Object.keys(bg).filter(k=>k[0]===k[1]).sort((a,b)=>bg[b]-bg[a]); const top=Object.keys(bg).sort((a,b)=>bg[b]-bg[a]).slice(0,8);
  return `<p class="muted small">${n} letters · most common first. Grey bar = how often that rank shows up in English (E T A O I N S H R…).</p>${ord.filter(i=>c[i]).map((i,k)=>{ const en=[...EN].sort((a,b)=>b-a)[k]; return `<div class="fbar"><b>${L[i]}</b><span><span class="t"><i style="width:${c[i]/mx*100}%"></i></span><span class="t" style="margin-top:2px;height:4px"><i class="en" style="width:${Math.min(100,en/12.7*100*(c[ord[0]]/mx))}%"></i></span></span><span>${(c[i]/n*100).toFixed(0)}%</span></div>`; }).join('')}
   <p class="small"><b>Common pairs:</b> <span class="mono">${top.map(k=>k+'×'+bg[k]).join(' ')}</span></p>${dbl.length?`<p class="small"><b>Doubles:</b> <span class="mono">${dbl.join(' ')}</span> <span class="muted">(English: LL EE SS OO TT)</span></p>`:''}`; }
function freq(el,txt){ el.innerHTML=inputHTML(txt)+'<div id="to" class="card"></div>'; keep(el,()=>{ $('#to').innerHTML=freqHTML($('#ti').value); }); }
function wheelSVG(k){ const R1=140,R2=104,cx=150,cy=150; let s=`<svg class="wheel" viewBox="0 0 300 300" role="img" aria-label="Shift wheel at ${k}"><circle cx="150" cy="150" r="148" fill="#141824" stroke="#2a3142"/><circle cx="150" cy="150" r="122" fill="#0f1320" stroke="#2a3142"/>`;
  for(let i=0;i<26;i++){ const a=(i/26)*Math.PI*2-Math.PI/2; s+=`<text x="${cx+R1*Math.cos(a)}" y="${cy+R1*Math.sin(a)+5}" text-anchor="middle" font-size="14" font-weight="700" fill="#fde68a" font-family="monospace">${L[i]}</text>`;
    s+=`<text x="${cx+R2*Math.cos(a)}" y="${cy+R2*Math.sin(a)+5}" text-anchor="middle" font-size="13" font-weight="700" fill="#f9a8d4" font-family="monospace">${L[(i+k)%26]}</text>`; }
  return s+`<text x="150" y="146" text-anchor="middle" font-size="13" fill="#8d95a8">plain → cipher</text><text x="150" y="168" text-anchor="middle" font-size="20" font-weight="800" fill="#e8ebf4">+${k}</text></svg>`; }
function wheel(el,txt){ let k=+(LS('wheelk')||3);
  el.innerHTML=`<div id="wsv"></div><div class="row"><button class="btn ghost fx0" id="wm">−</button><input type="range" id="wr" min="0" max="25" value="${k}"><button class="btn ghost fx0" id="wp">＋</button></div><p class="muted small">Outer ring = plain letters, inner = what they turn into. To decode, read the inner letter and take the outer one.</p>${inputHTML(txt)}<label>Decoded with shift ${'<b id="wk"></b>'}</label><div class="out" id="wo"></div>`;
  const draw=()=>{ $('#wsv').innerHTML=wheelSVG(k); $('#wr').value=k; $('#wk').textContent=k; $('#wo').textContent=G.caesar($('#ti').value,26-k)||' '; LS('wheelk',k); };
  $('#wr').oninput=e=>{ k=+e.target.value; draw(); }; $('#wm').onclick=()=>{ k=(k+25)%26; draw(); }; $('#wp').onclick=()=>{ k=(k+1)%26; draw(); }; keep(el,draw); }
function tally(el){ const st=LS('tally')||{c:[{n:'A',v:0},{n:'B',v:0}],note:''};
  const draw=()=>{ el.innerHTML=`<div class="tally">${st.c.map((c,i)=>`<button type="button" data-i="${i}"><span class="muted small">${esc(c.n)}</span><b>${c.v}</b></button>`).join('')}</div>
    <div class="row" style="margin-top:8px"><input id="tn" placeholder="New counter name" maxlength="16"><button class="btn fx0" id="ta">Add</button></div>
    <div class="row"><button class="btn ghost" id="tm">Undo last</button><button class="btn ghost" id="tz">Zero all</button><button class="btn ghost" id="tc">Clear</button></div>
    <label>Scratch pad</label><textarea id="tp" placeholder="Notes, guesses, crossed-off letters…" style="min-height:140px">${esc(st.note)}</textarea>`;
    const save=()=>LS('tally',st); let last=null;
    el.querySelectorAll('.tally button').forEach(b=>b.onclick=()=>{ const i=+b.dataset.i; st.c[i].v++; last=i; st.lastI=i; save(); draw(); });
    $('#ta').onclick=()=>{ const n=$('#tn').value.trim(); if(!n) return; st.c.push({n,v:0}); save(); draw(); };
    $('#tm').onclick=()=>{ const i=st.lastI; if(i!=null&&st.c[i]&&st.c[i].v>0){ st.c[i].v--; save(); draw(); } };
    $('#tz').onclick=()=>{ st.c.forEach(c=>c.v=0); save(); draw(); }; $('#tc').onclick=()=>{ if(confirm('Remove all counters?')){ st.c=[]; save(); draw(); } };
    $('#tp').oninput=e=>{ st.note=e.target.value; save(); }; };
  draw(); }
function encode(el,txt){ el.innerHTML=`<label>Your message</label><textarea id="ti" placeholder="Meet at the old oak tree">${esc(txt)}</textarea><div class="seg" id="em"><button data-m="caesar" class="on">Caesar</button><button data-m="atbash">Atbash</button><button data-m="vig">Vigenère</button></div><div id="eo"></div><label>Encoded</label><div class="out" id="ex"></div><div class="row"><button class="btn ghost" id="ecp">Copy</button><a class="btn ghost" href="#build">Make it a hunt</a></div>`;
  let m='caesar', k=3, key='LEMON';
  const draw=()=>{ $('#eo').innerHTML=m==='caesar'?`<label>Shift</label><input id="ek" inputmode="numeric" value="${k}">`:m==='vig'?`<label>Keyword</label><input id="ek" value="${esc(key)}" autocapitalize="characters">`:''; const ek=$('#ek'); if(ek) ek.oninput=()=>{ if(m==='caesar') k=+ek.value||0; else key=ek.value; out(); }; out(); };
  const out=()=>{ const s=$('#ti').value; $('#ex').textContent=(m==='caesar'?G.caesar(s,k):m==='atbash'?G.atbash(s):G.vig(s,key))||' '; };
  $('#em').onclick=e=>{ const b=e.target.closest('[data-m]'); if(!b) return; m=b.dataset.m; $$('#em button').forEach(x=>x.classList.toggle('on',x===b)); draw(); };
  $('#ti').oninput=out; $('#ecp').onclick=async()=>{ try{ await navigator.clipboard.writeText($('#ex').textContent); toast('Copied'); }catch(e){} }; draw(); }
function vigGuess(s){ const t=G.norm(s); const lens=[]; for(let n=1;n<=12;n++){ let a=0; for(let j=0;j<n;j++){ let col=''; for(let i=j;i<t.length;i+=n) col+=t[i]; a+=ioc(col); } lens.push({n,ioc:a/n}); }
  return lens; }
/* the shortest length that scores close to the best one (multiples of the real length score just as high) */
function pickLen(ls){ const mx=Math.max(...ls.map(x=>x.ioc)); return ls.find(x=>x.ioc>=mx*0.9)||ls[0]; }
function bestKey(s,n){ const t=G.norm(s); let key=''; for(let j=0;j<n;j++){ let col=''; for(let i=j;i<t.length;i+=n) col+=t[i]; let best=0,bx=1e9; for(let k=0;k<26;k++){ const x=chi(G.caesar(col,26-k)); if(x<bx){ bx=x; best=k; } } key+=L[best]; } return key; }
function vig(el,txt){ el.innerHTML=inputHTML(txt)+`<div class="card" id="vl"></div><label>Try a key</label><div class="row"><input id="vk" autocapitalize="characters" placeholder="e.g. LEMON" value="${esc(LS('vigkey')||'')}"><button class="btn ghost fx0" id="vb">Best guess</button></div><label>Decoded</label><div class="out" id="vo"></div><p class="muted small">English text scores about 0.066 on coincidence; random letters about 0.038. The key length with the highest score is usually right. Short messages fool it, so try the scrambled key from the puzzle too.</p>`;
  let n=0; const draw=()=>{ const s=$('#ti').value, ls=vigGuess(s); const mx=Math.max(...ls.map(x=>x.ioc),0.07); const best=pickLen(ls);
    $('#vl').innerHTML=G.norm(s).length<8?'<p class="muted" style="margin:0">Paste a Vigenère message to start.</p>':`<h3>Likely key length</h3>${ls.map(x=>`<div class="fbar" style="grid-template-columns:22px 1fr 44px"><b>${x.n}</b><span class="t"><i style="width:${x.ioc/mx*100}%;${x.n===best.n?'background:var(--acc2)':''}"></i></span><span>${x.ioc.toFixed(3)}</span></div>`).join('')}<p class="small" style="margin-bottom:0">Best guess: <b>${best.n}</b> letters · key ≈ <b class="mono">${bestKey(s,n||best.n)}</b></p>`;
    n=n||0; out(); };
  const out=()=>{ const k=$('#vk').value; LS('vigkey',k); $('#vo').textContent=G.norm(k)?G.vig($('#ti').value,k,true):'Type a key to decode'; };
  $('#vk').oninput=out; $('#vb').onclick=()=>{ const s=$('#ti').value; const ls=vigGuess(s); if(!ls.length||G.norm(s).length<8) return; $('#vk').value=bestKey(s,pickLen(ls).n); out(); };
  keep(el,draw); }
function bench(el,txt){ const st=LS('bench')||{}; el.innerHTML=inputHTML(txt)+`<p class="muted small">Under each cipher letter, type what you think it stands for. Count = how often it appears.</p><div class="sgrid" id="bg"></div><label>Decoded</label><div class="out" id="bo"></div><div class="row"><button class="btn ghost" id="bclr">Clear guesses</button></div>`;
  const draw=()=>{ const c=counts($('#ti').value); $('#bg').innerHTML=[...L].map((x,i)=>`<div class="k"><span>${x}<small style="font-weight:400"> ${c[i]||''}</small></span><input maxlength="1" data-l="${x}" value="${esc(st[x]||'')}" aria-label="Plain letter for ${x}"></div>`).join('');
    $('#bg').querySelectorAll('input').forEach(i=>i.oninput=()=>{ st[i.dataset.l]=i.value.toUpperCase().replace(/[^A-Z]/g,''); LS('bench',st); out(); }); out(); };
  const out=()=>{ $('#bo').innerHTML=esc($('#ti').value.toUpperCase()).replace(/[A-Z]/g,ch=>st[ch]?`<span style="color:var(--ok)">${st[ch]}</span>`:`<span style="color:#5b6478">${ch.toLowerCase()}</span>`)||' '; };
  $('#bclr').onclick=()=>{ for(const k in st) delete st[k]; LS('bench',st); draw(); }; keep(el,draw); }
function auto(el,txt){ el.innerHTML=inputHTML(txt)+'<div id="ao"></div>';
  keep(el,()=>{ const s=$('#ti').value; if(G.norm(s).length<3){ $('#ao').innerHTML='<p class="muted">Paste a Caesar message.</p>'; return; } const r=[]; for(let k=1;k<26;k++){ const d=G.caesar(s,26-k); r.push({k,d,x:chi(d)}); } r.sort((a,b)=>a.x-b.x);
    $('#ao').innerHTML=`<div class="card">${r.slice(0,8).map((x,i)=>`<div class="it" style="display:block"><div class="muted small">${i===0?'🏆 Most English · ':''}shift ${x.k}</div><div class="mono" style="font-size:14px">${esc(x.d.slice(0,140))}</div></div>`).join('')}</div>`; }); }
/* contextual sheets used by puzzles and hunts */
window.CphTools={
  wheelSheet(ct){ sheet('<h3>🔄 Shift wheel</h3><div id="tb2"></div><button class="btn ghost block" data-close="1">Close</button>',el=>wheel(el.querySelector('#tb2'),ct||'')); },
  freqSheet(ct){ sheet('<h3>📊 Letter frequencies</h3><div id="tb2"></div><button class="btn ghost block" data-close="1">Close</button>',el=>freq(el.querySelector('#tb2'),ct||'')); },
  vigSheet(ct){ sheet('<h3>🗝️ Vigenère helper</h3><div id="tb2"></div><button class="btn ghost block" data-close="1">Close</button>',el=>vig(el.querySelector('#tb2'),ct||'')); },
  TOOLS
};
})();
