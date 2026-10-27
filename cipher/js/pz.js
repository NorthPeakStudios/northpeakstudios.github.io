// Cipher · puzzle boards: cipher text (Caesar, Vigenère, cryptogram, Atbash, anagram), riddle, nonogram, logic grid,
// word ladder and number lock. One controller per board: answer(), reveal(), check(), big() (Pro), plus hunt hooks.
(function(){
const G=()=>window.CipherGen;
const L='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function kbHTML(extra){ const rows=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM']; return `<div class="kb">${rows.map((r,i)=>`<div class="kr">${i===2?'<button type="button" class="w" data-k="LEFT" aria-label="Previous">◀</button>':''}${r.split('').map(c=>`<button type="button" data-k="${c}">${c}</button>`).join('')}${i===2?'<button type="button" class="w" data-k="BS" aria-label="Delete">⌫</button>':''}${i===1&&extra?'':''}</div>`).join('')}</div>`; }
function kbWire(root,fn){ const kb=root.querySelector('.kb'); if(!kb) return; kb.addEventListener('click',e=>{ const b=e.target.closest('button[data-k]'); if(b) fn(b.dataset.k); }); }
/* ---------- text ciphers ---------- */
function textBoard(el,p,o){
  const t=p.type, src=t==='anagram'?(p.scr||''):(p.ct||''), mapMode=['caesar','subst','atbash'].includes(t);
  const st=Object.assign({map:{},vals:{},rev:{}},o.state||{});
  const solL=p.sol?G().norm(p.sol):null;
  const cells=[]; let li=0; const words=src.split(' ').map(w=>w.split('').map(ch=>{ if(/[A-Z]/.test(ch)){ const c={i:li++,c:ch}; cells.push(c); return c; } return {p:ch}; }));
  const given=p.given||{};
  let sel=0; const val=c=>mapMode?(given[c.c]||st.map[c.c]||''):(st.vals[c.i]||'');
  const locked=c=>mapMode?!!given[c.c]:!!st.rev[c.i];
  let marks={};
  function draw(){
    el.innerHTML=`<div class="ctx" role="group" aria-label="Puzzle">${words.map(w=>`<div class="wd">${w.map(c=>c.p!=null?`<div class="cl pun"><span class="c">${c.p}</span><span class="p">${c.p}</span></div>`:`<div class="cl"><span class="c">${t==='anagram'?'':c.c}</span><button type="button" class="p${c.i===sel?' sel':''}${mapMode&&cells[sel]&&cells[sel].c===c.c&&c.i!==sel?' same':''}${mapMode&&given[c.c]?' giv':''}${(mapMode?st.rev[c.c]:st.rev[c.i])?' rev':''}${marks[c.i]===false?' bad':marks[c.i]===true?' good':''}" data-i="${c.i}" aria-label="Letter ${c.i+1}${t==='anagram'?'':', cipher '+c.c}">${val(c)}</button></div>`).join('')}</div>`).join('')}</div>
      ${t==='anagram'?`<p class="muted small">Scrambled: <b class="mono">${esc(src)}</b></p>`:''}${kbHTML()}`;
    kbWire(el,key);
    el.querySelector('.ctx').addEventListener('click',e=>{ const b=e.target.closest('.p[data-i]'); if(b){ sel=+b.dataset.i; draw(); } });
  }
  function next(){ for(let k=1;k<=cells.length;k++){ const c=cells[(sel+k)%cells.length]; if(!val(c)&&!locked(c)){ sel=c.i; return; } } if(sel<cells.length-1) sel++; }
  function key(k){ const c=cells[sel]; if(!c) return; marks={};
    if(k==='LEFT'){ sel=Math.max(0,sel-1); draw(); return; }
    if(k==='BS'){ if(!locked(c)){ if(mapMode) delete st.map[c.c]; else delete st.vals[c.i]; } if(!val(c)) sel=Math.max(0,sel-1); save(); draw(); return; }
    if(locked(c)){ next(); draw(); return; }
    if(mapMode){ for(const x in st.map) if(st.map[x]===k&&x!==c.c&&t==='subst') delete st.map[x]; st.map[c.c]=k; } else st.vals[c.i]=k;
    next(); save(); draw(); o.onInput&&o.onInput(); }
  function save(){ o.onChange&&o.onChange({map:st.map,vals:st.vals,rev:st.rev}); }
  function answer(){ let s=''; for(const w of words){ if(s) s+=' '; for(const c of w){ if(c.p!=null){ s+=c.p; continue; } const v=val(c); if(!v) return null; s+=v; } } return s; }
  function plainAt(i){ return solL?solL[i]:null; }
  function setAt(i,ch){ const c=cells[i]; if(!c) return; if(mapMode){ for(const x in st.map) if(st.map[x]===ch&&x!==c.c&&t==='subst') delete st.map[x]; st.map[c.c]=ch; st.rev[c.c]=1; } else { st.vals[i]=ch; st.rev[i]=1; } sel=i; save(); draw(); }
  const C={
    kind:'text', answer, complete:()=>answer()!=null,
    target(){ const c=cells[sel]; if(c&&(!val(c)||marks[c.i]===false)) return c.i; const e=cells.find(x=>!val(x)); return e?e.i:sel; },
    reveal(){ if(!solL) return false; let c=cells[sel]; if(!c||(val(c)===solL[c.i])) c=cells.find(x=>val(x)!==solL[x.i]); if(!c) return false; setAt(c.i,solL[c.i]); return true; },
    check(){ if(!solL) return null; marks={}; let bad=0; for(const c of cells){ const v=val(c); if(v){ marks[c.i]=v===solL[c.i]; if(v!==solL[c.i]) bad++; } } draw(); return bad; },
    applyLetter(i,ch){ setAt(i,ch); }, applyMarks(m){ marks={}; m.forEach((v,i)=>{ if(v!=null) marks[i]=v; }); draw(); },
    big(){ if(t==='caesar'&&p.shift) return 'Every letter moved forward '+p.shift+' places. Shift back by '+p.shift+' (or forward by '+(26-p.shift)+').';
      if(t==='vigenere'&&p.key) return 'The key is '+p.key+'.';
      if(t==='subst'&&solL){ const fr={}; for(const c of cells) fr[c.c]=(fr[c.c]||0)+1; const top=Object.keys(fr).filter(x=>!given[x]).sort((a,b)=>fr[b]-fr[a]).slice(0,3); top.forEach(x=>{ const c=cells.find(y=>y.c===x); st.map[x]=solL[c.i]; st.rev[x]=1; }); save(); draw(); return 'Filled the 3 most common letters: '+top.map(x=>x+'→'+st.map[x]).join(', ')+'.'; }
      if(t==='atbash') return 'Atbash flips the alphabet: A↔Z, B↔Y, C↔X…';
      return null; },
    lettersLen:cells.length
  };
  draw(); return C;
}
/* ---------- riddle (hunts): free answer ---------- */
function riddleBoard(el,p,o){ const st=Object.assign({v:'',known:{}},o.state||{}); let len=st.len||0;
  function draw(){ el.innerHTML=`<div class="card" style="background:#0f1320"><p style="margin:0;font-size:17px;white-space:pre-wrap">${esc(p.clue||'')}</p></div>${len?`<p class="mono" style="letter-spacing:4px;font-size:18px">${Array.from({length:len},(_,i)=>st.known[i]||'_').join('')}</p>`:''}<label>Your answer</label><input id="rdA" autocomplete="off" autocapitalize="characters" value="${esc(st.v)}">`;
    el.querySelector('#rdA').addEventListener('input',e=>{ st.v=e.target.value; o.onChange&&o.onChange(st); }); }
  draw();
  return { kind:'riddle', answer:()=>st.v.trim()||null, complete:()=>!!st.v.trim(), target(){ for(let i=0;i<(len||99);i++) if(!st.known[i]) return i; return 0; },
    applyLetter(i,ch,n){ st.known[i]=ch; if(n) len=st.len=n; o.onChange&&o.onChange(st); draw(); }, applyMarks(m){ len=st.len=m.length; m.forEach((v,i)=>{ if(v) st.known[i]=G().norm(st.v)[i]; }); o.onChange&&o.onChange(st); draw(); }, reveal(){ return false; }, check(){ return null; }, big(){ return null; } };
}
/* ---------- nonogram ---------- */
function nonoBoard(el,p,o){
  const w=p.w,h=p.h, sol=p.sol||G().nonoSolve(p.rows,p.cols,w,h);
  const st=Object.assign({g:Array(w*h).fill(0),mode:1},o.state||{}); if(!Array.isArray(st.g)||st.g.length!==w*h) st.g=Array(w*h).fill(0);
  let bad={}; const cs=Math.max(22,Math.min(36,Math.floor((Math.min(window.innerWidth,640)-32-62)/w)));
  const rowOk=y=>JSON.stringify(G().nonoClues(st.g.slice(y*w,y*w+w).map(v=>v===1?'1':'0').join(''),w,1).rows[0])===JSON.stringify(p.rows[y]);
  const colOk=x=>{ let s=''; for(let y=0;y<h;y++) s+=st.g[y*w+x]===1?'1':'0'; return JSON.stringify(G().nonoClues(s,1,h).cols[0])===JSON.stringify(p.cols[x]); };
  function draw(){
    const cols=`62px repeat(${w},${cs}px)`;
    let html=`<div class="seg" style="max-width:260px;margin:4px auto 6px"><button type="button" data-m="1" class="${st.mode===1?'on':''}">■ Fill</button><button type="button" data-m="2" class="${st.mode===2?'on':''}">× Mark</button></div><div class="nono" style="grid-template-columns:${cols}"><div></div>`;
    for(let x=0;x<w;x++) html+=`<div class="cc${colOk(x)?' done':''}">${p.cols[x].map(n=>`<span>${n}</span>`).join('')}</div>`;
    for(let y=0;y<h;y++){ html+=`<div class="rc${rowOk(y)?' done':''}">${p.rows[y].join(' ')}</div>`; for(let x=0;x<w;x++){ const i=y*w+x, v=st.g[i]; html+=`<div class="x${v===1?' f':v===2?' n':''}${bad[i]?' bad':''}${(x%5===4&&x<w-1)?' b5r':''}${(y%5===4&&y<h-1)?' b5b':''}" data-i="${i}" style="width:${cs}px;height:${cs}px" role="button" aria-label="Row ${y+1} column ${x+1}${v===1?' filled':v===2?' marked empty':''}"></div>`; } }
    el.innerHTML=html+'</div>';
    el.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{ st.mode=+b.dataset.m; save(); draw(); });
    const grid=el.querySelector('.nono'); let paint=null;
    const at=(e)=>{ const t=document.elementFromPoint(e.clientX,e.clientY); return t&&t.closest&&t.closest('.x[data-i]'); };
    grid.addEventListener('pointerdown',e=>{ const c=e.target.closest('.x[data-i]'); if(!c) return; e.preventDefault(); const i=+c.dataset.i; paint=st.g[i]===st.mode?0:st.mode; set(i); try{ grid.setPointerCapture(e.pointerId); }catch(_){} });
    grid.addEventListener('pointermove',e=>{ if(paint==null) return; const c=at(e); if(c) set(+c.dataset.i); });
    const end=()=>{ if(paint!=null){ paint=null; save(); draw(); o.onInput&&o.onInput(); } };
    grid.addEventListener('pointerup',end); grid.addEventListener('pointercancel',end);
    function set(i){ if(st.g[i]===paint) return; st.g[i]=paint; bad={}; const c=grid.querySelector(`.x[data-i="${i}"]`); if(c){ c.className='x'+(paint===1?' f':paint===2?' n':'')+((i%w)%5===4&&(i%w)<w-1?' b5r':'')+((Math.floor(i/w))%5===4&&Math.floor(i/w)<h-1?' b5b':''); } }
  }
  function save(){ o.onChange&&o.onChange({g:st.g,mode:st.mode}); }
  const answer=()=>st.g.map(v=>v===1?'1':'0').join('');
  const solved=()=>{ for(let y=0;y<h;y++) if(!rowOk(y)) return false; for(let x=0;x<w;x++) if(!colOk(x)) return false; return true; };
  draw();
  return { kind:'nono', answer:()=>solved()?answer():null, complete:solved,
    reveal(){ if(!sol) return false; const i=st.g.findIndex((v,k)=>(v===1)!==(sol[k]==='1')||(v===0)); if(i<0) return false; st.g[i]=sol[i]==='1'?1:2; bad={}; save(); draw(); return true; },
    check(){ if(!sol) return null; bad={}; let n=0; st.g.forEach((v,i)=>{ if((v===1&&sol[i]!=='1')||(v===2&&sol[i]==='1')){ bad[i]=1; n++; } }); draw(); return n; },
    big(){ if(!sol) return null; for(let y=0;y<h;y++){ if(!rowOk(y)||st.g.slice(y*w,y*w+w).some((v,x)=>(v===1)!==(sol[y*w+x]==='1'))){ for(let x=0;x<w;x++) st.g[y*w+x]=sol[y*w+x]==='1'?1:2; save(); draw(); return 'Filled row '+(y+1)+' for you.'; } } return null; } };
}
/* ---------- logic grid ---------- */
function logicBoard(el,p,o){
  const P=p.people, A=p.cats[0], B=p.cats[1];
  const st=Object.assign({m0:[],m1:[],m2:[],done:{}},o.state||{});
  for(const k of ['m0','m1','m2']) for(let i=0;i<4;i++) st[k][i]=st[k][i]||[0,0,0,0];
  let bad={}; const sol=p.sol?p.sol.split('|').map(s=>s.split('').map(Number)):null;
  const sym=v=>v===2?'✓':v===1?'✗':'';
  function grid(k,rows,cols,rl,cl){ return `<table class="lg" data-k="${k}"><tr><th class="rh">${esc(rl)}</th>${cols.map(c=>`<th title="${esc(c)}">${esc(c)}</th>`).join('')}</tr>${rows.map((r,i)=>`<tr><th class="rh">${esc(r)}</th>${cols.map((c,j)=>{ const v=st[k][i][j]; return `<td class="${v===2?'y':v===1?'n':''}${bad[k+i+j]?' bad':''}" data-i="${i}" data-j="${j}" role="button" aria-label="${esc(r)} and ${esc(c)}: ${v===2?'yes':v===1?'no':'unknown'}">${sym(v)}</td>`; }).join('')}</tr>`).join('')}</table>`; }
  function draw(){
    el.innerHTML=`<ol class="clues">${p.clues.map((c,i)=>`<li data-c="${i}" class="${st.done[i]?'done':''}">${esc(c)}</li>`).join('')}</ol><p class="muted small" style="margin:2px 0">Tap a clue to cross it off. Tap a square: ✗ then ✓.</p>
      <h3 style="margin-top:10px;text-transform:capitalize">${esc(A.n)}</h3>${grid('m0',P,A.items,'',0)}
      <h3 style="text-transform:capitalize">${esc(B.n)}</h3>${grid('m1',P,B.items,'',0)}
      <details class="fold"><summary>Scratch: ${esc(A.n)} × ${esc(B.n)}</summary>${grid('m2',A.items,B.items,'',0)}</details>`;
    el.querySelectorAll('.clues li').forEach(li=>li.onclick=()=>{ const i=li.dataset.c; st.done[i]=!st.done[i]; save(); li.classList.toggle('done'); });
    el.querySelectorAll('table.lg').forEach(tb=>tb.addEventListener('click',e=>{ const td=e.target.closest('td[data-i]'); if(!td) return; const k=tb.dataset.k,i=+td.dataset.i,j=+td.dataset.j; const v=(st[k][i][j]+1)%3; st[k][i][j]=v; bad={};
      if(v===2){ for(let x=0;x<4;x++){ if(x!==j&&!st[k][i][x]) st[k][i][x]=1; if(x!==i&&!st[k][x][j]) st[k][x][j]=1; } }
      save(); const open=el.querySelector('details.fold')&&el.querySelector('details.fold').open; draw(); if(open) el.querySelector('details.fold').open=true; o.onInput&&o.onInput(); }));
  }
  function save(){ o.onChange&&o.onChange(st); }
  function pick(k){ const out=[]; for(let i=0;i<4;i++){ const j=st[k][i].indexOf(2); if(j<0||st[k][i].filter(v=>v===2).length>1) return null; out.push(j); } return new Set(out).size===4?out:null; }
  const answer=()=>{ const a=pick('m0'),b=pick('m1'); return a&&b?a.join('')+'|'+b.join(''):null; };
  draw();
  return { kind:'logic', answer, complete:()=>answer()!=null,
    reveal(){ if(!sol) return false; for(const [k,s] of [['m0',sol[0]],['m1',sol[1]]]) for(let i=0;i<4;i++){ if(st[k][i][s[i]]!==2||st[k][i].filter(v=>v===2).length>1){ st[k][i]=[1,1,1,1]; st[k][i][s[i]]=2; for(let x=0;x<4;x++) if(x!==i&&st[k][x][s[i]]===2) st[k][x][s[i]]=0; save(); draw(); return true; } } return false; },
    check(){ if(!sol) return null; bad={}; let n=0; for(const [k,s] of [['m0',sol[0]],['m1',sol[1]]]) for(let i=0;i<4;i++) for(let j=0;j<4;j++){ const v=st[k][i][j]; if((v===2&&s[i]!==j)||(v===1&&s[i]===j)){ bad[k+i+j]=1; n++; } } draw(); return n; },
    big(){ if(!sol) return null; for(let i=0;i<4;i++){ if(st.m0[i][sol[0][i]]!==2||st.m1[i][sol[1][i]]!==2){ for(const [k,s] of [['m0',sol[0]],['m1',sol[1]]]){ st[k][i]=[1,1,1,1]; st[k][i][s[i]]=2; } save(); draw(); return P[i]+' is filled in for you.'; } } return null; } };
}
/* ---------- word ladder ---------- */
function ladderBoard(el,p,o){
  const st=Object.assign({w:[],cur:''},o.state||{}); let msg='';
  const last=()=>st.w.length?st.w[st.w.length-1]:p.start;
  const done=()=>last()===p.end;
  function draw(){ const prev=last();
    el.innerHTML=`<p class="muted small" style="margin:0">From <b class="mono">${p.start.toUpperCase()}</b> to <b class="mono">${p.end.toUpperCase()}</b> · par ${p.par} steps · you: ${st.w.length}</p><div class="lad">
      <div class="rung start">${p.start.toUpperCase().split('').map(c=>`<span class="l">${c}</span>`).join('')}<span class="del"></span></div>
      ${st.w.map((x,k)=>{ const pv=k?st.w[k-1]:p.start; return `<div class="rung${x===p.end?' end':''}">${x.toUpperCase().split('').map((c,i)=>`<span class="l${pv[i]!==x[i]?' ch':''}">${c}</span>`).join('')}${k===st.w.length-1&&!done()?'<button type="button" class="del" aria-label="Remove last word">×</button>':'<span class="del"></span>'}</div>`; }).join('')}
      ${done()?'':`<div class="rung cur">${[0,1,2,3].map(i=>`<span class="l">${(st.cur[i]||'').toUpperCase()}</span>`).join('')}<span class="del"></span></div><div class="rung end">${p.end.toUpperCase().split('').map(c=>`<span class="l">${c}</span>`).join('')}<span class="del"></span></div>`}
      </div><p class="center muted" id="ldm" style="min-height:22px;margin:2px 0">${esc(msg)}</p>${done()?'':kbHTML()+'<p class="center"><button type="button" class="btn sm" id="ldGo">Add word</button></p>'}`;
    kbWire(el,key); const d=el.querySelector('.rung .del[aria-label]'); if(d) d.onclick=()=>{ st.w.pop(); msg=''; save(); draw(); };
    const go=el.querySelector('#ldGo'); if(go) go.onclick=()=>key('ENTER'); }
  function add(word){ const pv=last(); let diff=0; for(let i=0;i<4;i++) if(pv[i]!==word[i]) diff++;
    if(diff!==1){ msg='Change exactly one letter of '+pv.toUpperCase()+'.'; return false; }
    if(!G().isWord(word)){ msg=word.toUpperCase()+' isn’t in Cipher’s word list.'; return false; }
    if(st.w.includes(word)||word===p.start){ msg='Already used.'; return false; }
    st.w.push(word); st.cur=''; msg=word===p.end?'':''; return true; }
  function key(k){ if(done()) return; if(k==='BS'){ st.cur=st.cur.slice(0,-1); } else if(k==='LEFT'){ st.cur=''; } else if(k==='ENTER'){ if(st.cur.length===4) add(st.cur.toLowerCase()); else msg='Type a 4-letter word.'; }
    else if(st.cur.length<4){ st.cur+=k.toLowerCase(); if(st.cur.length===4) add(st.cur); }
    save(); draw(); o.onInput&&o.onInput(); }
  function save(){ o.onChange&&o.onChange({w:st.w,cur:st.cur}); }
  draw();
  return { kind:'ladder', answer:()=>done()?[p.start,...st.w]:null, complete:done,
    reveal(){ let nx=G().ladderNext(last(),p.end); while(!nx&&st.w.length){ st.w.pop(); nx=G().ladderNext(last(),p.end); } if(!nx) return false; st.w.push(nx); st.cur=''; msg='Added '+nx.toUpperCase()+'.'; save(); draw(); return true; },
    check(){ const path=G().ladderPath(last(),p.end); msg=path?('From '+last().toUpperCase()+' you’re '+(path.length-1)+' step'+(path.length===2?'':'s')+' from '+p.end.toUpperCase()+'.'):'Dead end from '+last().toUpperCase()+'. Go back a word.'; draw(); return 0; },
    big(){ const path=G().ladderPath(last(),p.end); if(!path) return null; return 'One way from '+last().toUpperCase()+': '+path.slice(1,3).map(x=>x.toUpperCase()).join(' → ')+(path.length>3?' → …':''); } };
}
/* ---------- number lock ---------- */
function numberBoard(el,p,o){
  const st=Object.assign({d:['','','',''],sel:0,tries:[],rev:{}},o.state||{});
  const fb=(b,c)=>`<span class="fb">${Array.from({length:b},()=>'<i class="b"></i>').join('')}${Array.from({length:c},()=>'<i class="c"></i>').join('')}${Array.from({length:4-b-c},()=>'<i class="o"></i>').join('')}</span>`;
  const words=(b,c)=>(b?b+' in place':'')+(b&&c?', ':'')+(c?c+' misplaced':'')+(!b&&!c?'none right':'');
  function draw(){ el.innerHTML=`<table class="nl">${p.clues.map(c=>`<tr><td class="g">${c.g}</td><td>${fb(c.b,c.c)}</td><td class="muted small">${words(c.b,c.c)}</td></tr>`).join('')}${st.tries.map(c=>`<tr><td class="g" style="color:var(--mut)">${c.g}</td><td>${fb(c.b,c.c)}</td><td class="muted small">your try</td></tr>`).join('')}</table>
    <p class="muted small" style="margin:2px 0">● green = right digit, right place · ● gold = right digit, wrong place</p>
    <div class="dig">${st.d.map((v,i)=>`<button type="button" class="d${i===st.sel?' sel':''}${st.rev[i]?' rev':''}" data-i="${i}" aria-label="Digit ${i+1}">${v}</button>`).join('')}</div>
    <div class="kb"><div class="kr">${'12345'.split('').map(c=>`<button type="button" data-k="${c}">${c}</button>`).join('')}</div><div class="kr">${'67890'.split('').map(c=>`<button type="button" data-k="${c}">${c}</button>`).join('')}<button type="button" class="w" data-k="BS" aria-label="Delete">⌫</button></div></div>`;
    el.querySelectorAll('.dig .d').forEach(b=>b.onclick=()=>{ st.sel=+b.dataset.i; draw(); });
    kbWire(el,k=>{ if(k==='BS'){ if(!st.rev[st.sel]){ if(st.d[st.sel]) st.d[st.sel]=''; else if(st.sel>0){ st.sel--; if(!st.rev[st.sel]) st.d[st.sel]=''; } } } else if(!st.rev[st.sel]){ st.d[st.sel]=k; if(st.sel<3) st.sel++; } save(); draw(); o.onInput&&o.onInput(); }); }
  function save(){ o.onChange&&o.onChange(st); }
  draw();
  const cur=()=>st.d.join('');
  return { kind:'number', answer:()=>cur().length===4?cur():null, complete:()=>cur().length===4,
    wrong(){ if(!p.sol) return; const [b,c]=G().score(cur(),p.sol); if(!st.tries.some(t=>t.g===cur())) st.tries.push({g:cur(),b,c}); save(); draw(); },
    reveal(){ if(!p.sol) return false; let i=st.d.findIndex((v,k)=>v!==p.sol[k]); if(i<0) return false; st.d[i]=p.sol[i]; st.rev[i]=1; save(); draw(); return true; },
    check(){ if(!p.sol||cur().length<4) return null; const [b,c]=G().score(cur(),p.sol); toast(cur()+': '+words(b,c)); return 4-b; },
    applyLetter(i,ch){ st.d[i]=ch; st.rev[i]=1; save(); draw(); }, target(){ const i=st.d.findIndex((v,k)=>!st.rev[k]&&!v); return i<0?st.d.findIndex((v,k)=>!st.rev[k]):i; },
    applyMarks(m){ m.forEach((v,i)=>{ if(v===true) st.rev[i]=1; }); toast(m.filter(Boolean).length+' of 4 digits right and in place'); save(); draw(); },
    big(){ if(!p.sol) return null; let n=0; for(let i=0;i<4&&n<2;i++) if(st.d[i]!==p.sol[i]){ st.d[i]=p.sol[i]; st.rev[i]=1; n++; } save(); draw(); return n?'Two digits filled in.':null; } };
}
window.PZ={ mount(el,p,o){ o=o||{}; switch(p.type){ case 'caesar': case 'vigenere': case 'subst': case 'atbash': case 'anagram': return textBoard(el,p,o); case 'riddle': return riddleBoard(el,p,o); case 'nonogram': return nonoBoard(el,p,o); case 'logic': return logicBoard(el,p,o); case 'ladder': return ladderBoard(el,p,o); case 'number': return numberBoard(el,p,o); } el.innerHTML='<p class="muted">Unknown puzzle.</p>'; return null; },
  icon:{caesar:'🔄',vigenere:'🗝️',subst:'🔣',atbash:'🪞',anagram:'🔀',riddle:'❓',nonogram:'🧩',logic:'🧠',ladder:'🪜',number:'🔢'} };
})();
