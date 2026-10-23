// Cadence · Exercises engine: per-exercise settings pages, shareable custom-exercise links (settings in the URL), runner.
// Original code for Northpeak Studios (Oct 2026).
const MT = (() => {
  const EX = {}, ORDER = [];
  const CLEFS = [['treble','Treble'],['bass','Bass'],['alto','Alto'],['tenor','Tenor']];
  const CLEF_BOTTOM = {treble:30, bass:18, alto:24, tenor:22};
  const DEF_RANGE = {treble:['C4','A5'], bass:['E2','C4'], alto:['D3','B4'], tenor:['B2','G4']};
  const NAT_NOTES = []; for(let o=1;o<=7;o++) for(const l of 'CDEFGAB') NAT_NOTES.push(l+o); NAT_NOTES.push('C8');
  const ACCS = [['dflat','𝄫',-2],['flat','♭',-1],['natural','♮',0],['sharp','♯',1],['dsharp','𝄪',2]];
  const rnd = n => Math.floor(Math.random()*n), pick = a => a[rnd(a.length)];
  const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=rnd(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  const di = s => T.diatonicIndex(T.parse(s));
  const fromDi = (d,a=0) => T.note(T.mod(d,7), a, Math.floor(d/7));
  // common settings every exercise gets
  const COMMON = [
    {k:'n', label:'Number of questions', type:'select', opts:[[10,'10'],[20,'20'],[30,'30'],[50,'50'],[0,'Unlimited']], def:20},
    {k:'timed', label:'Timed mode (how many in…)', type:'select', opts:[[0,'Off'],[60,'1 min'],[120,'2 min'],[300,'5 min']], def:0},
    {k:'prog', label:'Show progress (score + count)', type:'bool', def:true},
    {k:'auto', label:'Auto-advance after a right answer', type:'bool', def:true},
    {k:'sound', label:'Sound', type:'bool', def:true},
  ];
  function reg(ex){ ex.fields = (ex.fields||[]).concat(COMMON.filter(c=>!(ex.noCommon||[]).includes(c.k))); EX[ex.id]=ex; ORDER.push(ex.id); }
  function defaults(ex){ const c={}; for(const f of ex.fields) c[f.k]=JSON.parse(JSON.stringify(f.def)); return c; }
  function clean(ex,c){ const d=defaults(ex), out={}; for(const f of ex.fields){ let v=c?c[f.k]:undefined; if(v===undefined||v===null) v=d[f.k];
      if(f.type==='multi'){ if(!Array.isArray(v)) v=d[f.k]; v=v.filter(x=>f.opts.some(o=>o[0]===x)); if(!v.length) v=d[f.k]; }
      else if(f.type==='select'){ if(!f.opts.some(o=>o[0]===v)) v=d[f.k]; }
      else if(f.type==='bool') v=!!v;
      else if(f.type==='range'){ if(!Array.isArray(v)||v.length!==2||!f.opts.includes(v[0])||!f.opts.includes(v[1])) v=d[f.k]; if(di(v[0])>di(v[1])) v=[v[1],v[0]]; }
      out[f.k]=v; } return out; }
  // URL code: only what differs from the defaults, base64url JSON
  function encode(ex,c){ const d=defaults(ex), diff={}; for(const k in c) if(JSON.stringify(c[k])!==JSON.stringify(d[k])) diff[k]=c[k];
    const s=JSON.stringify(diff); if(s==='{}') return ''; return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
  function decode(ex,code){ try{ const s=decodeURIComponent(escape(atob(code.replace(/-/g,'+').replace(/_/g,'/')))); return clean(ex,JSON.parse(s)); }catch(e){ return null; } }
  const LSK = id => 'cad.ex.'+id;
  function saved(ex){ try{ return clean(ex, JSON.parse(localStorage.getItem(LSK(ex.id))||'null')); }catch(e){ return defaults(ex); } }
  function save(ex,c){ localStorage.setItem(LSK(ex.id), JSON.stringify(c)); }
  function link(ex,c){ const code=encode(ex,c); return location.origin+location.pathname+'#ex/'+ex.id+(code?'/'+code:''); }

  // ---------- settings page ----------
  function fieldHtml(f,v,c){
    if(f.show && !f.show(c)) return '';
    let h=`<div class="mtf" data-k="${f.k}"><div class="mtl">${f.label}${f.help?` <span class="muted">${f.help}</span>`:''}</div>`;
    if(f.type==='multi') h+=`<div class="chips">${f.opts.map(([val,lab])=>`<button class="chip${v.includes(val)?' on':''}" data-v='${JSON.stringify(val)}'>${lab}</button>`).join('')}</div>${f.opts.length>4?'<div class="mtall"><button class="lnk" data-all="1">all</button> · <button class="lnk" data-all="0">none</button></div>':''}`;
    else if(f.type==='select') h+=`<div class="chips">${f.opts.map(([val,lab])=>`<button class="chip${v===val?' on':''}" data-v='${JSON.stringify(val)}'>${lab}</button>`).join('')}</div>`;
    else if(f.type==='bool') h+=`<div class="chips"><button class="chip${v?' on':''}" data-v="true">On</button><button class="chip${!v?' on':''}" data-v="false">Off</button></div>`;
    else if(f.type==='range') h+=`<div class="row">low <select data-r="0">${f.opts.map(o=>`<option${o===v[0]?' selected':''}>${o}</option>`).join('')}</select> high <select data-r="1">${f.opts.map(o=>`<option${o===v[1]?' selected':''}>${o}</option>`).join('')}</select></div>`;
    return h+'</div>';
  }
  function settingsPage(v, id){
    const ex=EX[id]; if(!ex) return go('mt'); let c=saved(ex);
    const draw=()=>{
      const op=v._mto||{}; v.innerHTML=`<a class="back" href="#mt">← Exercises</a><h2>${ex.title}</h2><p class="muted intro">${ex.desc}</p><div class="card mtset">${ex.fields.filter(f=>!COMMON.includes(f)).map(f=>fieldHtml(f,c[f.k],c)).join('')}</div>
      <button class="btn big block" id="mtgo">Start</button>
      <details class="fold" data-o="sess"${op.sess?' open':''}><summary>Session options</summary><div class="mtset">${ex.fields.filter(f=>COMMON.includes(f)).map(f=>fieldHtml(f,c[f.k],c)).join('')}</div></details>
      <details class="fold" data-o="share"${op.share?' open':''}><summary>Share these settings</summary><p class="muted" style="margin-top:0">A link that opens this exercise set up exactly like this.</p>
      <input class="inp" id="mtlink" readonly value="${esc(link(ex,c))}"><button class="btn sm" id="mtcopy">Copy link</button> <span id="mtcm" class="muted"></span></details>
      <p class="center"><button class="lnk" id="mtdef">Reset to defaults</button></p>`;
      $$('details[data-o]',v).forEach(d=>d.ontoggle=()=>{ v._mto=Object.assign(v._mto||{},{[d.dataset.o]:d.open}); });
      $$('.mtf',v).forEach(el=>{ const f=ex.fields.find(x=>x.k===el.dataset.k);
        $$('.chip',el).forEach(b=>b.onclick=()=>{ const val=JSON.parse(b.dataset.v);
          if(f.type==='multi'){ const s=new Set(c[f.k]); s.has(val)?s.delete(val):s.add(val); if(!s.size) return toast('Pick at least one'); c[f.k]=f.opts.map(o=>o[0]).filter(x=>s.has(x)); }
          else c[f.k]=val; c=clean(ex,c); save(ex,c); draw(); });
        $$('[data-all]',el).forEach(b=>b.onclick=()=>{ c[f.k]= b.dataset.all==='1'? f.opts.map(o=>o[0]) : [f.opts[0][0]]; save(ex,c); draw(); });
        $$('select',el).forEach(s=>s.onchange=()=>{ const r=c[f.k].slice(); r[+s.dataset.r]=s.value; c[f.k]=r; c=clean(ex,c); save(ex,c); draw(); }); });
      $('#mtgo').onclick=()=>go('ex/'+id); $('#mtdef').onclick=()=>{ c=defaults(ex); save(ex,c); draw(); };
      $('#mtcopy').onclick=async()=>{ const l=$('#mtlink'); try{ await navigator.clipboard.writeText(l.value); $('#mtcm').textContent='Copied ✓'; }catch(e){ l.select(); $('#mtcm').textContent='Select + copy'; } };
    }; draw();
  }

  // ---------- answer widgets ----------
  // groups: [{k, label, opts:[[val,label]], def}] — a press on a group with no default submits once every group has a value
  function buttons(el, groups, onSubmit){
    const sel={}; groups.forEach(g=>{ if(g.def!==undefined) sel[g.k]=g.def; });
    el.innerHTML=groups.map(g=>`<div class="mtg" data-k="${g.k}">${g.label?`<div class="mtgl">${g.label}</div>`:''}<div class="mtbtns ${g.cls||''}">${g.opts.map(([val,lab])=>`<button class="mtb${sel[g.k]===val?' on':''}" data-v='${JSON.stringify(val)}'>${lab}</button>`).join('')}</div></div>`).join('');
    let locked=false;
    $$('.mtg',el).forEach(ge=>{ const g=groups.find(x=>x.k===ge.dataset.k); $$('.mtb',ge).forEach(b=>b.onclick=()=>{ if(locked) return; sel[g.k]=JSON.parse(b.dataset.v); $$('.mtb',ge).forEach(x=>x.classList.toggle('on',x===b));
      if(g.def===undefined && groups.every(x=>sel[x.k]!==undefined)){ locked=true; onSubmit(Object.assign({},sel), b); } }); });
    return { mark(right){ /* show right answers */ groups.forEach(g=>{ const ge=el.querySelector(`.mtg[data-k="${g.k}"]`); $$('.mtb',ge).forEach(b=>{ const val=JSON.parse(b.dataset.v); if(JSON.stringify(val)===JSON.stringify(right[g.k])) b.classList.add('right'); else if(b.classList.contains('on')) b.classList.add('wrong'); }); }); } };
  }
  // tappable staff for construction exercises. mode 'one' (one note) | 'many' (toggle notes) | 'keysig'
  function staffInput(el, opts){
    const clef=opts.clef, B=CLEF_BOTTOM[clef], W=opts.width||300, H=150, sp=10, top=40, bottomY=80;
    const yOf = d => bottomY-(d-B)*sp/2;
    let notes=(opts.given||[]).map(n=>({n, fixed:true})), selIdx=-1, ks=[];
    const accSet=opts.accs||ACCS;
    el.innerHTML=`<div class="mtstaff"></div><div class="mtacc">${opts.mode==='keysig'?'<button class="mtb on" data-ks="1">♯</button><button class="mtb" data-ks="-1">♭</button>':accSet.map(([k,g,a])=>`<button class="mtb" data-a="${a}">${g}</button>`).join('')}<button class="mtb" data-undo="1">↶ undo</button><button class="btn sm" data-ok="1">Check</button></div><div class="muted mthint">${opts.hint||''}</div>`;
    let ksType=1;
    const draw=()=>{ let ev; if(opts.mode==='many'){ ev=notes.length?[{notes:notes.map(x=>x.n)}]:[]; } else ev=notes.map(x=>({notes:[x.n]}));
      let svg=UI.staff(ev,{clef, width:W, height:H, keySig:0, evW:opts.mode==='many'?80:Math.min(80,(W-80)/Math.max(1,notes.length))});
      if(opts.mode==='keysig') ks.forEach((k,i)=>{ svg=svg.replace('</svg>',`<text x="${46+i*11}" y="${yOf(k.d)+5}" font-size="18" class="glyph" font-family="${UI.MUSIC_FONT}">${k.t>0?'♯':'♭'}</text></svg>`); });
      if(selIdx>=0 && notes[selIdx] && opts.mode!=='keysig') svg=svg.replace('</svg>',`<text x="${W-14}" y="16" text-anchor="end" class="lbl">selected: ${T.name(notes[selIdx].n,true)}</text></svg>`);
      el.querySelector('.mtstaff').innerHTML=svg;
      el.querySelector('svg').addEventListener('pointerdown',e=>{ const r=e.currentTarget.getBoundingClientRect(); const y=(e.clientY-r.top)/r.height*H; let d=Math.round(B+(bottomY-y)*2/sp); d=Math.max(B-6,Math.min(B+14,d));
        if(opts.mode==='keysig'){ if(ks.length>=7) return; ks.push({d,t:ksType}); draw(); return; }
        if(opts.mode==='one'){ notes=notes.filter(x=>x.fixed); notes.push({n:fromDi(d,0)}); selIdx=notes.length-1; }
        else { const i=notes.findIndex(x=>T.diatonicIndex(x.n)===d); if(i>=0 && !notes[i].fixed){ if(selIdx===i){ notes.splice(i,1); selIdx=-1; } else selIdx=i; } else if(i<0){ notes.push({n:fromDi(d,0)}); selIdx=notes.length-1; } }
        if(opts.sound!==false && selIdx>=0) Audio.playMidi(T.midi(notes[selIdx].n),0,0.8); draw(); });
    };
    $$('[data-a]',el).forEach(b=>b.onclick=()=>{ if(selIdx<0||!notes[selIdx]||notes[selIdx].fixed) return toast('Tap the staff to place a note first'); const n=notes[selIdx].n; notes[selIdx].n=T.note(n.l,+b.dataset.a,n.o); if(opts.sound!==false) Audio.playMidi(T.midi(notes[selIdx].n),0,0.8); draw(); });
    $$('[data-ks]',el).forEach(b=>b.onclick=()=>{ ksType=+b.dataset.ks; $$('[data-ks]',el).forEach(x=>x.classList.toggle('on',x===b)); });
    el.querySelector('[data-undo]').onclick=()=>{ if(opts.mode==='keysig') ks.pop(); else { const i=notes.map(x=>x.fixed).lastIndexOf(false); if(i>=0) notes.splice(i,1); selIdx=-1; } draw(); };
    el.querySelector('[data-ok]').onclick=()=>{ const placed=notes.filter(x=>!x.fixed).map(x=>x.n); opts.onCheck(opts.mode==='keysig'?ks:placed); };
    draw();
    return { show(ns){ notes=ns.map(n=>({n,fixed:true})); selIdx=-1; draw(); }, showKs(arr){ ks=arr; draw(); }, lock(){ $$('button',el).forEach(b=>b.disabled=true); } };
  }

  // ---------- runner ----------
  function stats(){ const st=S.get(); st.xstats=st.xstats||{}; return st.xstats; }
  function run(v, id, code){
    const ex=EX[id]; if(!ex) return go('mt');
    if(ex.pro && !(window.CadPro&&CadPro.pro()) && CadPro.locked) return CadPro.locked(v, ex.title, ex.proWhy||'Trumpet is free; the other brass instruments are part of Cadence Pro.');
    let custom=false, c; if(code){ c=decode(ex,code); custom=!!c; } if(!c) c=saved(ex);
    let i=0, right=0, streak=0, t0=Date.now(), deadline=c.timed?Date.now()+c.timed*1000:0, timer=null, over=false;
    v.innerHTML=`<a class="back" href="#mt">← Exercises</a><h2>${ex.title}</h2>${custom?`<div class="muted">Custom exercise · <a href="#exs/${id}" id="mtadopt">use as my settings</a></div>`:''}
      <div class="mtbar"><span id="mtprog"></span><a class="lnk" href="#exs/${id}">Settings</a></div><div class="card q mtq" id="mtq"></div>`;
    if(custom){ $('#mtadopt').onclick=()=>save(ex,c); }
    const prog=()=>{ const el=$('#mtprog'); if(!el) return; if(!c.prog && !c.timed){ el.textContent=''; return; }
      const left=deadline?Math.max(0,Math.ceil((deadline-Date.now())/1000)):0;
      el.textContent=(deadline?`⏱ ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')} · `:'')+(c.prog?`${right}/${i} correct`+(c.n&&!deadline?` · ${Math.min(i+1,c.n)} of ${c.n}`:'')+(streak>2?` · 🔥${streak}`:''):''); };
    if(deadline){ timer=setInterval(()=>{ if(!document.getElementById('mtprog')){ clearInterval(timer); return; } prog(); if(Date.now()>=deadline){ clearInterval(timer); finish(); } },250); }
    function finish(){ if(over) return; over=true; clearInterval(timer); const pct=i?Math.round(right/i*100):0; const xs=stats(); const r=xs[id]||{n:0,c:0,best:0,bestTimed:{}}; r.n+=i; r.c+=right; r.best=Math.max(r.best||0,pct); if(c.timed){ r.bestTimed=r.bestTimed||{}; r.bestTimed[c.timed]=Math.max(r.bestTimed[c.timed]||0,right); } xs[id]=r; S.save();
      $('#mtq').innerHTML=`<h3>${right}/${i} correct (${pct}%)</h3>${c.timed?`<p>${right} right in ${c.timed/60} min${r.bestTimed[c.timed]===right&&right?' — new best 🏆':''} (best ${r.bestTimed[c.timed]}).</p>`:''}<p>${pct>=90?'Locked in. Try a harder setting? 🔥':pct>=70?'Solid. A few more rounds and it’s automatic.':'Keep going — reps are how this sticks.'}</p><button class="btn big block" id="mtagain">Again</button><a class="sublink" href="#exs/${id}">Change settings</a>`;
      $('#mtagain').onclick=()=>route(); }
    function next(){
      if(over) return; if(c.n && !deadline && i>=c.n) return finish();
      const q=ex.make(c); const box=$('#mtq'); t0=Date.now(); prog();
      box.innerHTML=`<div class="prompt">${q.prompt}</div>${q.staff?`<div class="qstaff">${q.staff}</div>`:''}<div id="mtvis"></div>${q.play?'<button class="play" id="mtplay">▶︎ Play again</button>':''}<div id="mtans"></div><div id="mtfb"></div>`;
      if(q.visual) q.visual($('#mtvis'));
      if(q.play){ $('#mtplay').onclick=()=>q.play(); if(c.sound || q.ear) setTimeout(()=>q.play(),200); }
      const done=(ok, msg)=>{ if(over) return; i++; if(ok){ right++; streak++; } else streak=0; prog();
        try{ record(null, ex.area||'notation', ok, ok?null:'mt-'+id, (Date.now()-t0)/1000); }catch(e){}
        if(navigator.vibrate) navigator.vibrate(ok?15:[30,40,30]);
        if(q.after && c.sound) q.after();
        const fb=$('#mtfb'); fb.innerHTML=`<div class="feedback ${ok?'ok':'no'}"><b>${ok?'✅ Correct':'❌ Not quite'}</b> ${msg||''}</div>${ok&&c.auto?'':`<button class="btn" id="mtnext">${c.n&&!deadline&&i>=c.n?'Finish':'Next →'}</button>`}`;
        if(ok&&c.auto) setTimeout(()=>{ if(document.getElementById('mtfb')===fb) next(); }, 900); else $('#mtnext').onclick=next; };
      q.answer($('#mtans'), done, c);
    }
    next();
  }
  return {EX, ORDER, reg, run, settingsPage, buttons, staffInput, defaults, saved, encode, decode, link, CLEFS, CLEF_BOTTOM, DEF_RANGE, NAT_NOTES, ACCS, rnd, pick, shuffle, di, fromDi, stats};
})();
routes.ex = (v,id,code) => MT.run(v,id,code);
routes.exs = (v,id) => MT.settingsPage(v,id);
