// Cipher · puzzle hunts: join with a code, solve in order (answers checked on Cipher's server), see who's on which step,
// and (Pro) build your own chain of 3–10 puzzles with your own answers.
(function(){
const CG=window.CipherGen, A=()=>window.CphApp;
const TYPES=[['caesar','Caesar shift','Your answer gets shifted along the alphabet'],['vigenere','Vigenère','Shifted by a keyword you pick'],['subst','Cryptogram','Every letter swapped for another'],['atbash','Atbash','The alphabet flipped A↔Z'],['anagram','Anagram','Your answer’s letters scrambled'],['riddle','Riddle / clue','You write the clue'],['nonogram','Nonogram picture','Draw a picture; the answer names it'],['number','Number lock','A 4-digit code with logic clues']];
const errW={no_hunt:'No hunt with that code.',no_player:'Couldn’t set up your puzzle player. Check your connection.',pro_required:'Building hunts is part of Cipher Pro.',signed_out:'Sign in first.',slow_down:'Too many tries. Wait a minute.',bad_steps:'A hunt needs 3 to 10 puzzles.',bad_title:'Give your hunt a title.',offline:'You’re offline.',bad_answer:'Each answer needs 2+ letters.',bad_nonogram:'One of the pictures has more than one solution.'};
const em=e=>errW[e&&e.message]||('Something went wrong ('+esc(e&&e.message||'error')+')');
const link=c=>'https://northpeakstudios.github.io/cipher/#hunt/'+c;
routes.hunts=v=>{
  const mine=Store.all('h_').sort((a,b)=>(b.up||0)-(a.up||0));
  v.innerHTML=`<h2>Puzzle hunts</h2><div class="card"><h3>Join a hunt</h3><div class="row"><input id="hjc" placeholder="6-character code" autocapitalize="characters" autocomplete="off" maxlength="8"><button class="btn fx0" id="hjb">Join</button></div></div>
   <div class="card"><div class="row"><h3 style="margin:0">Hunts you’re playing</h3></div>${mine.length?`<div class="list">${mine.map(h=>`<a class="it" href="#hunt/${h.code}"><span class="ic">${h.done?'🏆':'🗺️'}</span><span class="wh"><b>${esc(h.title||h.code)}</b><small>${h.done?'Finished':'Step '+((h.step||0)+1)+' of '+(h.n||'?')} · code ${h.code}</small></span><span class="muted">›</span></a>`).join('')}</div>`:'<p class="muted" style="margin:6px 0 0">None yet. Ask a friend for a code, or build one.</p>'}</div>
   <div class="card"><div class="row"><h3 style="margin:0">Hunts you made</h3>${P()?'<a class="btn sm fx0" href="#build">＋ New</a>':'<span class="pill pro fx0">Pro</span>'}</div><div id="hmine"><p class="muted" style="margin:6px 0 0">${P()?'Loading…':'Build a chain of 3–10 puzzles with your own answers, share the code, and watch who’s on which step. <a href="#build">See how</a>'}</p></div></div>`;
  const join=()=>{ const c=$('#hjc').value.toUpperCase().replace(/[^0-9A-Z]/g,''); if(c.length!==6) return toast('Hunt codes are 6 letters/numbers'); location.hash='#hunt/'+c; };
  $('#hjb').onclick=join; $('#hjc').addEventListener('keydown',e=>{ if(e.key==='Enter') join(); });
  if(P()||Store.prefs().player) A().pbody().then(b=>A().capi('/api/c/hunt/mine',b)).then(j=>{ const el=$('#hmine'); if(!el) return; el.innerHTML=j.hunts.length?`<div class="list">${j.hunts.map(h=>`<a class="it" href="#hboard/${h.code}"><span class="ic">🧭</span><span class="wh"><b>${esc(h.title)}</b><small>${h.n} puzzles · ${h.players} playing · ${h.done} finished · code ${h.code}</small></span><span class="muted">›</span></a>`).join('')}</div>`:(P()?'<p class="muted" style="margin:6px 0 0">You haven’t made one yet.</p>':el.innerHTML); }).catch(()=>{ const el=$('#hmine'); if(el&&P()) el.innerHTML='<p class="muted">Couldn’t load (offline?).</p>'; });
};
/* ---------- play ---------- */
routes.hunt=(v,code)=>{
  code=String(code||'').toUpperCase().replace(/[^0-9A-Z]/g,''); if(code.length!==6){ location.hash='#hunts'; return; }
  const id='h_'+code; let rec=Store.get(id)||{id,code,step:0,spent:0,earn:0,boards:{}};
  v.innerHTML=`<p class="muted">Loading hunt ${code}…</p>`;
  let state=null, meta=null, C=null, busy=false;
  const load=async()=>{ try{ const b=await A().pbody({code}); const j=await A().capi('/api/c/hunt/join',b); meta=j.hunt; state=j.me; sync(); draw(); }catch(e){ v.innerHTML=`<h2>Hunt ${code}</h2><p class="muted">${em(e)}</p><a class="btn ghost" href="#hunts">Back</a>`; } };
  function sync(){ rec=Store.get(id)||rec; const was=rec.step||0; rec.title=meta.title; rec.n=meta.n; rec.by=meta.by;
    if(state.step>was){ rec.earn=(rec.earn||0)+(state.step-was); }
    if(state.done&&!rec.done){ rec.done=true; rec.earn=(rec.earn||0)+2; rec.ms=state.ms; }
    rec.step=state.step; Store.put(rec); }
  function draw(){
    const n=meta.n, si=state.step, st=state.steps[si];
    v.innerHTML=`<div class="pzh"><div><div class="muted small">Hunt ${code} · by ${esc(meta.by)}</div><h2 style="margin:0">${esc(meta.title)}</h2></div><a class="btn ghost sm" href="#hboard/${code}">Board</a></div>
     ${meta.intro?`<p class="muted" style="white-space:pre-wrap">${esc(meta.intro)}</p>`:''}
     <div class="dots">${Array.from({length:n},(_,i)=>`<i class="${i<si||state.done?'on':i===si?'cur':''}" title="Step ${i+1}"></i>`).join('')}</div>
     ${state.solved.length?`<details class="fold"><summary>Solved so far (${state.solved.length})</summary>${state.solved.map((a,i)=>`<div class="steprow"><span class="n">${i+1}</span><span class="wh"><b>${PZ.icon[meta.types[i]]} ${esc(CG.NAMES[meta.types[i]])}</b><small class="mono">${esc(a)}</small></span><span>✅</span></div>`).join('')}</details>`:''}
     ${state.done?`<div class="card solved center"><div class="muted small">Hunt complete!</div><div class="big">${A().fmtMs(state.ms)}</div><p style="margin:4px 0">${n} puzzles · ${state.hints} hint${state.hints===1?'':'s'} · ${state.wrong} wrong guess${state.wrong===1?'':'es'}</p><a class="btn" href="#hboard/${code}">See the board</a></div>`:
     `<div class="card"><div class="muted small">Step ${si+1} of ${n}</div><h3 style="margin:2px 0 6px">${PZ.icon[st.type]} ${esc(st.title||CG.NAMES[st.type])}</h3>${st.clue&&st.type!=='riddle'?`<div class="note">${esc(st.clue)}</div>`:''}${st.keyHint?`<div class="note">🗝️ ${esc(st.keyHint)}</div>`:''}
       <div id="board"></div>${st.type==='nonogram'?'<div id="nw" hidden><div class="note ok">Picture complete! What is it?</div><label>Answer</label><input id="nwA" autocomplete="off" autocapitalize="characters"></div>':''}
       <div class="hb"><button class="btn ghost" id="hRev">💡 Letter · 1🪙</button><button class="btn ghost" id="hChk">✔︎ Check · 1🪙</button>${st.type==='caesar'||st.type==='atbash'?'<button class="btn ghost" id="hWh">🔄 Wheel</button>':''}${st.type==='subst'?'<button class="btn ghost" id="hFr">📊 Freq</button>':''}${st.type==='vigenere'?'<button class="btn ghost" id="hVg">🗝️ Helper</button>':''}</div>
       <button class="btn big block" id="hSub">Submit answer</button><p class="muted small center" id="hMsg">🪙 ${Store.tokens()} tokens</p></div>`}`;
    if(state.done) return;
    const bk=si+':'+code; rec.boards=rec.boards||{};
    C=PZ.mount($('#board'),st,{state:(rec.boards||{})[si],onChange:s=>{ rec=Store.get(id)||rec; rec.boards=rec.boards||{}; rec.boards[si]=s; Store.put(rec); },onInput:()=>{ if(st.type==='nonogram'){ $('#nw').hidden=!C.complete(); } }});
    if(st.type==='nonogram'&&C.complete()) $('#nw').hidden=false;
    const wh=$('#hWh'); if(wh) wh.onclick=()=>CphTools.wheelSheet(st.ct);
    const fr=$('#hFr'); if(fr) fr.onclick=()=>CphTools.freqSheet(st.ct);
    const vg=$('#hVg'); if(vg) vg.onclick=()=>{ if(!P()) return location.hash='#pro'; CphTools.vigSheet(st.ct); };
    const guessOf=()=>st.type==='nonogram'?($('#nwA')?$('#nwA').value:''):C.answer();
    $('#hSub').onclick=async()=>{ if(busy) return; const g=guessOf(); if(!g||!String(g).trim()) return toast(st.type==='nonogram'?'Finish the picture, then name it':'Fill in your answer first'); busy=true;
      try{ const b=await A().pbody({code,step:si,guess:g}); const j=await A().capi('/api/c/hunt/guess',b); state=j.me; if(j.correct){ toast('✅ '+(j.answer||'Correct')+' · +1🪙'); sync(); draw(); } else { toast('Not it. Try again'); $('#hMsg').textContent=state.wrong+' wrong so far · 🪙 '+Store.tokens(); } }
      catch(e){ if(e.body&&e.body.me){ state=e.body.me; sync(); draw(); } else toast(em(e)); } busy=false; };
    $('#hRev').onclick=async()=>{ rec=Store.get(id)||rec; if(Store.tokens()<1) return toast('Not enough hint tokens. Solve puzzles to earn more 🪙');
      const i=C.target?C.target():0; try{ const b=await A().pbody({code,step:si,kind:'letter',i}); const j=await A().capi('/api/c/hunt/hint',b); if(!CphSpend(Store.get(id)||rec,1)) return;
        if(st.type==='nonogram'){ $('#nw').hidden=false; const inp=$('#nwA'); const cur=CG.norm(inp.value).split(''); cur[j.i]=j.ch; inp.value=Array.from({length:j.len},(_,k)=>cur[k]||'·').join(''); toast('Letter '+(j.i+1)+' of '+j.len+': '+j.ch); }
        else if(C.applyLetter) C.applyLetter(j.i,j.ch,j.len); $('#hMsg').textContent='🪙 '+Store.tokens()+' tokens'; }catch(e){ toast(em(e)); } };
    $('#hChk').onclick=async()=>{ const g=guessOf()||(C.kind==='text'?partial():''); if(!g) return toast('Type something to check first'); if(Store.tokens()<1) return toast('Not enough hint tokens');
      try{ const b=await A().pbody({code,step:si,kind:'check',guess:g}); const j=await A().capi('/api/c/hunt/hint',b); if(!CphSpend(Store.get(id)||rec,1)) return; const right=j.marks.filter(x=>x===true).length;
        if(C.applyMarks&&st.type!=='nonogram') C.applyMarks(j.marks); toast(right+' of '+j.len+' letters right'+(j.marks.length&&CG.norm(g).length!==j.len&&st.type!=='number'?' · the answer has '+j.len:'')); $('#hMsg').textContent='🪙 '+Store.tokens()+' tokens'; }catch(e){ toast(em(e)); } };
    function partial(){ return [...document.querySelectorAll('#board .cl .p[data-i]')].map(x=>x.textContent||'?').join(''); }
  }
  load();
};
/* ---------- who's on which step ---------- */
routes.hboard=(v,code)=>{
  code=String(code||'').toUpperCase().replace(/[^0-9A-Z]/g,'');
  v.innerHTML=`<p class="muted">Loading…</p>`;
  const pl=Store.prefs().player;
  A().capiGet('/api/c/hunt/board?code='+code+(pl?'&pid='+pl.pid:'')).then(j=>{ const h=j.hunt;
    v.innerHTML=`<div class="pzh"><div><div class="muted small">Hunt ${code} · by ${esc(h.by)}</div><h2 style="margin:0">${esc(h.title)}</h2></div><a class="btn sm" href="#hunt/${code}">Play</a></div>
     <p class="muted small">${h.n} puzzles: ${h.types.map(t=>PZ.icon[t]).join(' ')}</p>
     ${j.owner?`<div class="card"><h3>Share your hunt</h3><div class="share">${code}</div><div class="row"><button class="btn" id="hsh">Share link</button><button class="btn ghost" id="hcp">Copy code</button></div></div>`:''}
     <div class="card"><h3>Who’s on which step</h3>${j.rows.length?`<table class="bd"><tr><th>Player</th><th>Progress</th><th class="r">Time</th></tr>${j.rows.map(r=>`<tr class="${r.me?'me':''}"><td>${esc(r.name)}${r.me?' (you)':''}<div class="muted small">${r.hints} hint${r.hints===1?'':'s'} · ${r.wrong} wrong</div></td><td style="min-width:110px"><div class="prog"><i style="width:${Math.round((r.done?h.n:r.step)/h.n*100)}%"></i></div><div class="muted small">${r.done?'🏆 Finished':'On step '+(r.step+1)+' of '+h.n}</div></td><td class="r">${r.done?A().fmtMs(r.ms):'–'}</td></tr>`).join('')}</table>`:'<p class="muted" style="margin:0">Nobody has joined yet. Share the code!</p>'}</div>
     ${j.owner?'<p class="center"><button class="lnk" id="hdel" style="color:var(--bad)">Delete this hunt</button></p>':''}<p class="muted small center">Updates live while this screen is open.</p>`;
    const sh=$('#hsh'); if(sh) sh.onclick=async()=>{ const t='Try my Cipher puzzle hunt "'+h.title+'" ('+h.n+' puzzles). Code '+code; try{ if(navigator.share) await navigator.share({text:t,url:link(code)}); else { await navigator.clipboard.writeText(t+' '+link(code)); toast('Link copied'); } }catch(e){} };
    const cp=$('#hcp'); if(cp) cp.onclick=async()=>{ try{ await navigator.clipboard.writeText(code); toast('Copied '+code); }catch(e){} };
    const dl=$('#hdel'); if(dl) dl.onclick=async()=>{ if(!confirm('Delete "'+h.title+'"? Players lose access.')) return; try{ const b=await A().pbody({code}); await A().capi('/api/c/hunt/delete',b); toast('Deleted'); location.hash='#hunts'; }catch(e){ toast(em(e)); } };
  }).catch(e=>{ v.innerHTML=`<h2>Hunt ${esc(code)}</h2><p class="muted">${em(e)}</p><a class="btn ghost" href="#hunts">Back</a>`; });
  const iv=setInterval(()=>{ if(location.hash==='#hboard/'+code&&!document.hidden){ clearInterval(iv); const y=window.scrollY; routes.hboard(v,code); setTimeout(()=>window.scrollTo(0,y),400); } },20000);
  cleanup=()=>clearInterval(iv);
};
/* ---------- builder (Pro) ---------- */
const DKEY='cph.draft';
const draft=()=>{ try{ return JSON.parse(localStorage.getItem(DKEY)||'null')||{title:'',intro:'',steps:[]}; }catch(e){ return {title:'',intro:'',steps:[]}; } };
const saveDraft=d=>{ try{ localStorage.setItem(DKEY,JSON.stringify(d)); }catch(e){} };
routes.build=v=>{
  if(!P()){ CphLock(v,'Hunt builder','Chain 3–10 puzzles with your own answers and clues, share a code, and watch who’s on which step.'); return; }
  const d=draft();
  const draw=()=>{ v.innerHTML=`<h2>Build a hunt</h2><p class="muted">Pick 3–10 puzzles. Each one hides an answer you choose. Friends solve them in order.</p>
    <div class="card"><label>Title</label><input id="bt" maxlength="60" value="${esc(d.title)}" placeholder="e.g. The Lighthouse Mystery"><label>Intro (optional)</label><textarea id="bi" maxlength="500" placeholder="Set the scene…">${esc(d.intro)}</textarea></div>
    <h3>Puzzles (${d.steps.length}/10)</h3>${d.steps.map((s,i)=>`<div class="steprow"><span class="n">${i+1}</span><span class="wh"><b>${PZ.icon[s.step.type]} ${esc(CG.NAMES[s.step.type])}</b><small>Answer: <span class="mono">${esc(s.answer)}</span>${s.step.clue?' · '+esc(s.step.clue.slice(0,40)):''}</small></span><button class="btn ghost sm fx0" data-up="${i}" aria-label="Move up">↑</button><button class="btn ghost sm fx0" data-del="${i}" aria-label="Remove">✕</button></div>`).join('')||'<p class="muted">No puzzles yet.</p>'}
    ${d.steps.length<10?'<button class="btn ghost block" id="badd">＋ Add a puzzle</button>':''}
    <button class="btn big block" id="bsave" ${d.steps.length<3?'disabled':''} style="margin-top:12px">Create hunt & get code</button><p class="muted small center">${d.steps.length<3?'Add at least 3 puzzles.':'Answers are checked on Cipher’s server, so nobody can peek.'}</p><p id="bmsg" class="center muted"></p>`;
    $('#bt').oninput=e=>{ d.title=e.target.value; saveDraft(d); }; $('#bi').oninput=e=>{ d.intro=e.target.value; saveDraft(d); };
    v.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ d.steps.splice(+b.dataset.del,1); saveDraft(d); draw(); });
    v.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.up; if(i>0){ [d.steps[i-1],d.steps[i]]=[d.steps[i],d.steps[i-1]]; saveDraft(d); draw(); } });
    const ad=$('#badd'); if(ad) ad.onclick=()=>pickType();
    $('#bsave').onclick=async()=>{ if(d.title.trim().length<2) return toast('Give your hunt a title'); $('#bmsg').textContent='Creating…';
      try{ const b=await A().pbody({title:d.title,intro:d.intro,steps:d.steps}); const j=await A().capi('/api/c/hunt/create',b); localStorage.removeItem(DKEY); toast('Hunt created ✓'); location.hash='#hboard/'+j.code; }catch(e){ $('#bmsg').textContent=em(e); } };
  };
  function pickType(){ sheet(`<h3>Add a puzzle</h3><div class="list">${TYPES.map(([t,n,s])=>`<button type="button" class="it" data-t="${t}" style="width:100%;background:none;border:0;border-bottom:1px solid #222838;text-align:left;font:inherit;color:inherit;cursor:pointer"><span class="ic">${PZ.icon[t]}</span><span class="wh"><b>${n}</b><small>${s}</small></span></button>`).join('')}</div>`,el=>{ el.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>editStep(b.dataset.t)); }); }
  function editStep(t){ const nono=t==='nonogram'; let gw=8,gh=8,grid=Array(64).fill(0);
    sheet(`<h3>${PZ.icon[t]} ${esc(CG.NAMES[t])}</h3>
      ${t==='number'?'<label>The code (4 different digits)</label><input id="sa" inputmode="numeric" maxlength="4" placeholder="e.g. 4071">':`<label>${nono?'What the picture shows (the answer)':'Answer (word or short phrase)'}</label><input id="sa" maxlength="60" autocapitalize="characters" placeholder="${nono?'e.g. HEART':'e.g. LIGHTHOUSE'}">`}
      ${t==='riddle'?'<label>Your riddle or clue</label><textarea id="sc" maxlength="300" placeholder="I have keys but open no locks…"></textarea>':'<label>Flavor text (optional, shown above the puzzle)</label><input id="sc" maxlength="300" placeholder="e.g. Found scratched inside the clock">'}
      ${t==='caesar'?'<label>Shift (1–25, blank = random)</label><input id="ss" inputmode="numeric" maxlength="2">':''}
      ${t==='vigenere'?'<label>Keyword</label><input id="sk" maxlength="20" autocapitalize="characters" placeholder="e.g. LEMON"><label>Key hint for solvers (blank = scrambled key)</label><input id="skh" maxlength="200" placeholder="e.g. The key is the fruit in the kitchen">':''}
      ${nono?`<div class="seg" id="gsz" style="margin-top:12px"><button type="button" data-s="5">5×5</button><button type="button" data-s="8" class="on">8×8</button><button type="button" data-s="10">10×10</button></div><p class="muted small" style="margin:0">Tap or drag to draw. It has to have exactly one solution.</p><div class="dr" id="gd"></div><p class="muted small center" id="gm"></p>`:''}
      <div id="spv"></div><div class="row"><button class="btn ghost" id="spr">Preview</button><button class="btn" id="sad">Add</button></div><p id="sm" class="muted"></p>`,el=>{
      const val=()=>({answer:$('#sa').value,clue:$('#sc').value,shift:$('#ss')&&$('#ss').value,key:$('#sk')&&$('#sk').value,keyHint:$('#skh')&&$('#skh').value,w:gw,h:gh,grid:grid.join('')});
      const mk=()=>CG.makeStep(t,val(),String(Date.now()));
      $('#spr').onclick=()=>{ const r=mk(); if(r.error) return $('#sm').textContent=r.error; $('#sm').textContent=''; const pv=$('#spv'); pv.innerHTML='<div class="card" style="background:#0f1320"><div class="muted small">What solvers see</div><div id="spb"></div></div>'; PZ.mount($('#spb'),r.step,{}); };
      $('#sad').onclick=()=>{ const r=mk(); if(r.error) return $('#sm').textContent=r.error; d.steps.push(r); saveDraft(d); closeSheet(); draw(); toast('Added'); };
      if(nono){ const gd=$('#gd'); const dr=()=>{ gd.style.gridTemplateColumns=`repeat(${gw},26px)`; gd.innerHTML=grid.map((x,i)=>`<i data-i="${i}" class="${x?'f':''}"></i>`).join(''); const c=CG.nonoClues(grid.join(''),gw,gh); const ok=grid.some(Boolean)&&CG.nonoSolve(c.rows,c.cols,gw,gh)===grid.join(''); $('#gm').textContent=grid.some(Boolean)?(ok?'✓ One solution':'More than one solution — change a few squares'):''; };
        let paint=null; gd.addEventListener('pointerdown',e=>{ const c=e.target.closest('i[data-i]'); if(!c) return; e.preventDefault(); const i=+c.dataset.i; paint=grid[i]?0:1; grid[i]=paint; c.className=paint?'f':''; try{ gd.setPointerCapture(e.pointerId); }catch(_){} });
        gd.addEventListener('pointermove',e=>{ if(paint==null) return; const t2=document.elementFromPoint(e.clientX,e.clientY); const c=t2&&t2.closest&&t2.closest('#gd i[data-i]'); if(c){ grid[+c.dataset.i]=paint; c.className=paint?'f':''; } });
        const up=()=>{ if(paint!=null){ paint=null; dr(); } }; gd.addEventListener('pointerup',up); gd.addEventListener('pointercancel',up);
        $('#gsz').onclick=e=>{ const b=e.target.closest('[data-s]'); if(!b) return; gw=gh=+b.dataset.s; grid=Array(gw*gh).fill(0); $$('#gsz button').forEach(x=>x.classList.toggle('on',x===b)); dr(); }; dr(); }
    }); }
  draw();
};
})();
