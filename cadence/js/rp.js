// Cadence · Relative pitch trainer (original). A key is set with a cadence or drone; you name what you hear in that key.
(() => {
  const {buttons, rnd, pick} = MT;
  const DEG=[['1',0],['♭2',1],['2',2],['♭3',3],['3',4],['4',5],['♯4',6],['5',7],['♭6',8],['6',9],['♭7',10],['7',11]];
  const SOL={'1':'do','♭2':'ra','2':'re','♭3':'me','3':'mi','4':'fa','♯4':'fi','5':'sol','♭6':'le','6':'la','♭7':'te','7':'ti'};
  const SEMI=Object.fromEntries(DEG); const MAJ=['1','2','3','4','5','6','7'], MIN=['1','2','♭3','4','5','♭6','♭7','7'];
  const IVN=['P1','m2','M2','m3','M3','P4','TT','P5','m6','M6','m7','M7','P8'];
  const LEVELS=[null,
    {n:'Tonic triad',d:'1, 3 and 5 in a major key',mode:'deg',key:'major',set:['1','3','5']},
    {n:'Major scale degrees',d:'all seven degrees, major key',mode:'deg',key:'major',set:MAJ},
    {n:'Intervals in the key',d:'two notes from the major scale — name the interval',mode:'iv',key:'major',chrom:false},
    {n:'Minor keys',d:'degrees in minor: ♭3, ♭6, ♭7 and the raised 7',mode:'deg',key:'minor',set:MIN,pro:true},
    {n:'Chromatic degrees',d:'all 12, any key',mode:'deg',key:'any',set:DEG.map(x=>x[0]),wide:true,pro:true},
    {n:'Chromatic intervals',d:'any interval from a reference note, up to an octave',mode:'iv',key:'any',chrom:true,pro:true},
    {n:'Melodic fragments',d:'3–4 notes from the scale — sing or tap them back',mode:'frag',key:'major',len:[3,4],chrom:false,pro:true},
    {n:'Chromatic melodies',d:'4–5 notes with chromatic notes, major or minor',mode:'frag',key:'any',len:[4,5],chrom:true,pro:true},
  ];
  const DEF={start:1, adaptive:true, cad:'iv', newKey:8, fixedKey:'random', labels:'num', resolve:true, sing:false, replay:false};
  const KEYS=['random','C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
  const pro=()=>!!(window.CadPro&&CadPro.pro());
  const cfg=()=>Object.assign({},DEF,JSON.parse(localStorage.getItem('cad.rp')||'{}'));
  const saveCfg=c=>localStorage.setItem('cad.rp',JSON.stringify(c));
  function stats(){ const st=S.get(); st.rp=st.rp||{level:1,total:{n:0,c:0},deg:{},iv:{},frag:{n:0,c:0},best:0,sing:{n:0,c:0}}; return st.rp; }
  const lab=(d,c)=>c.labels==='sol'?SOL[d]:c.labels==='both'?`${d}<small> ${SOL[d]}</small>`:d;
  const pctOf=o=>o&&o.n?Math.round(o.c/o.n*100):null;
  // ---- sound ----
  function cadence(t,minor,c){ const P=(ms,at,d=0.75)=>ms.forEach(m=>Audio.playMidi(m,at,d)); const third=minor?3:4;
    if(c.cad==='drone'){ [t-12,t-5,t].forEach(m=>Audio.playMidi(m,0,2.6)); return 2.8; }
    if(c.cad==='scale'){ const sc=(minor?[0,2,3,5,7,8,11,12]:[0,2,4,5,7,9,11,12]); sc.forEach((s,i)=>Audio.playMidi(t+s,i*0.22,0.3)); P([t-12,t,t+third,t+7],sc.length*0.22+0.1,1); return sc.length*0.22+1.3; }
    const I=[t-12,t+third,t+7,t+12], IV=[t-7,t+5,t+(minor?8:9),t+12], V=[t-5,t+2,t+7,t+11], I2=[t-12,t+third,t+7,t];
    if(c.cad==='v'){ P(I,0); P(V,0.8); P(I2,1.6,1.1); return 2.9; }
    P(I,0); P(IV,0.8); P(V,1.6); P(I2,2.4,1.1); return 3.7; }
  function resolveTo(t,deg){ const s=SEMI[deg]; const path= s===0?[0]: s<=5? [s, ...[0,2,4,5].filter(x=>x<s).reverse()] : [s, ...[7,9,11,12].filter(x=>x>s)]; if(path[path.length-1]!==0&&path[path.length-1]!==12) path.push(s<=5?0:12); return path.map(x=>t+x); }
  // ---- views ----
  routes.rp = v => { const c=cfg(), r=stats(); const lvl=Math.min(r.level||1, pro()?8:3);
    v.innerHTML=`<a class="back" href="#ear">← ear</a><h2>Relative pitch</h2><p class="muted intro">A cadence sets the key, then you name what you hear. Levels up at 85%.</p>
     <div class="card"><div class="row" style="justify-content:space-between"><b>Level ${lvl}: ${LEVELS[lvl].n}</b><a class="lnk" href="#rps">Settings</a></div><p class="muted">${LEVELS[lvl].d}</p><button class="btn big block" id="rpgo">Start</button>
     <p class="muted">${r.total.n} answered · ${pctOf(r.total)??'–'}% · best streak ${r.best||0}</p></div>
     <h3 class="sec">Levels</h3><div class="mtlist">${LEVELS.slice(1).map((L,i)=>`<div class="mtrow"><a class="mtgo${L.pro&&!pro()?' locked':''}" href="#rp/go/${i+1}"><b>${i+1}. ${L.n}${L.pro&&!pro()?' <em class="lk">🔒</em>':''}</b><span>${L.d}</span></a></div>`).join('')}</div>
     <h3>Scale degrees</h3><div class="rpstat">${DEG.map(([d])=>{ const o=r.deg[d]; return `<div><b>${d}</b><br>${o&&o.n?pctOf(o)+'%':'–'}<br><span class="muted">${o?o.n:0}</span></div>`; }).join('')}</div>
     <h3>Intervals</h3><div class="rpstat">${IVN.slice(1).map((n,i)=>{ const o=r.iv[n]; return `<div><b>${n}</b><br>${o&&o.n?pctOf(o)+'%':'–'}</div>`; }).join('')}</div>
     <p class="muted">Melodies: ${pctOf(r.frag)??'–'}% of ${r.frag.n} · Sing-back: ${pctOf(r.sing)??'–'}% of ${r.sing.n}</p>`;
    $('#rpgo').onclick=()=>go('rp/go/'+lvl); };
  routes.rps = v => { const c=cfg(); const row=(k,label,opts)=>`<div class="mtf"><div class="mtl">${label}</div><div class="chips">${opts.map(([val,l])=>`<button class="chip${c[k]===val?' on':''}" data-k="${k}" data-v='${JSON.stringify(val)}'>${l}</button>`).join('')}</div></div>`;
    v.innerHTML=`<a class="back" href="#rp">← relative pitch</a><h2>Settings</h2><div class="card mtset">
      ${row('cad','Set the key with',[['iv','I–IV–V–I'],['v','I–V–I'],['scale','scale + chord'],['drone','drone']])}
      ${row('fixedKey','Key',KEYS.map(k=>[k,k==='random'?'random':k]))}
      ${row('newKey','New key every',[[1,'question'],[4,'4 q'],[8,'8 q'],[16,'16 q'],[0,'never']])}
      </div><details class="fold" id="rpmore"${v._rpo?' open':''}><summary>More options</summary><div class="mtset">${row('replay','Replay the cadence before every question',[[true,'On'],[false,'Off']])}
      ${row('adaptive','Adaptive difficulty',[[true,'On'],[false,'Off (stay on the level I pick)']])}
      ${row('labels','Answer labels',[['num','numbers'],['sol','solfège (movable do)'],['both','both']])}
      ${row('resolve','Resolve to the tonic after each answer',[[true,'On'],[false,'Off']])}
      ${row('sing','Sing-back with the mic (degrees)',[[true,'On'],[false,'Off']])}
      </div><p class="muted">Sing-back uses the tuner: after you answer, sing the note (any octave) and hold it — within ±30 cents counts.${pro()?'':' Sing-back is part of Pro.'}</p></details>`; $('#rpmore').ontoggle=e=>{ v._rpo=e.target.open; };
    $$('.chip',v).forEach(b=>b.onclick=()=>{ c[b.dataset.k]=JSON.parse(b.dataset.v); saveCfg(c); routes.rps(v); }); };
  const _rp=routes.rp; routes.rp=(v,a,b)=>{ if(a==='go') return session(v,+b||1); return _rp(v); };
  function session(v, level){
    if(LEVELS[level]&&LEVELS[level].pro&&!pro()) return CadPro.locked(v,'Relative pitch level '+level,'Levels 1–3 are free; 4–8 (minor, chromatic, intervals from any note, melodies) are Pro.');
    const c=cfg(), r=stats(); let L=LEVELS[level]||LEVELS[1], q=0, win=[], streak=0, tonic=0, minor=false, keyQ=0, busy=false;
    v.innerHTML=`<a class="back" href="#rp">← relative pitch</a><h2>Level <span id="rplv">${level}</span>: <span id="rpln">${L.n}</span></h2><div class="mtbar"><span id="rpinfo"></span><span><button class="lnk" id="rpkey">🔁 key</button> · <button class="lnk" id="rpton">tonic</button></span></div><div class="card q" id="rpq"></div>`;
    const info=()=>{ $('#rpinfo').textContent=`${['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][tonic%12]} ${minor?'minor':'major'} · streak ${streak}${win.length?` · ${Math.round(win.filter(Boolean).length/win.length*100)}% last ${win.length}`:''}`; };
    function newKey(){ const fk=c.fixedKey; const pcs={'C':0,'D♭':1,'D':2,'E♭':3,'E':4,'F':5,'F♯':6,'G':7,'A♭':8,'A':9,'B♭':10,'B':11}; tonic=55+((fk==='random'?rnd(12):pcs[fk])-55%12+12)%12; if(tonic>62) tonic-=12; tonic+=0; minor= L.key==='minor'?true: L.key==='any'? Math.random()<0.5 : false; keyQ=0; }
    $('#rpkey').onclick=()=>{ if(!busy) cadence(tonic,minor,c); }; $('#rpton').onclick=()=>Audio.playMidi(tonic,0,1.2);
    newKey();
    async function next(){ if(!document.getElementById('rpq')) return; busy=true;
      if(c.newKey && keyQ>=c.newKey) newKey(); const first=keyQ===0; keyQ++; info();
      let wait=0; if(first||c.replay) wait=cadence(tonic,minor,c);
      const box=$('#rpq'); const Q=make(); box.innerHTML=`<div class="prompt">${Q.prompt}</div><button class="play" id="rpplay">▶︎ Play again</button><div id="rpans"></div><div id="rpfb"></div>`;
      $('#rpplay').onclick=()=>Q.play(0); setTimeout(()=>{ Q.play(0); busy=false; }, wait*1000+150);
      Q.answer($('#rpans'),(ok,msg,rec)=>{ q++; win.push(ok); if(win.length>10) win.shift(); if(ok){ streak++; r.best=Math.max(r.best||0,streak); } else streak=0; r.total.n++; if(ok) r.total.c++; rec&&rec(); r.level=level; S.save(); try{ record(null,'ear',ok,ok?null:'rp-'+L.mode,0); }catch(e){} info();
        let lvMsg=''; if(c.adaptive && win.length>=10){ const acc=win.filter(Boolean).length/win.length; if(acc>=0.85 && level<8 && (!LEVELS[level+1].pro||pro())){ level++; lvMsg=`⬆️ Level up: ${LEVELS[level].n}`; } else if(acc<=0.5 && level>1){ level--; lvMsg=`⬇️ Back to level ${level}: ${LEVELS[level].n} — build it back up`; } if(lvMsg){ L=LEVELS[level]; win=[]; r.level=level; S.save(); $('#rplv').textContent=level; $('#rpln').textContent=L.n; if(L.key!=='any'&&(L.key==='minor')!==minor) keyQ=999; } }
        $('#rpfb').innerHTML=`<div class="feedback ${ok?'ok':'no'}"><b>${ok?'✅ Correct':'❌ Not quite'}</b> ${msg}${lvMsg?`<div><b>${lvMsg}</b></div>`:''}</div><div id="rpsing"></div><button class="btn" id="rpnext">Next →</button>`;
        $('#rpnext').onclick=()=>{ Audio.stopMic(); if(window._raf){ cancelAnimationFrame(window._raf); window._raf=null; } next(); };
        if(c.resolve && Q.resolve) setTimeout(()=>Q.resolve(),400);
        if(c.sing && pro() && Q.singTarget!=null) singBack($('#rpsing'),Q.singTarget,r); });
    }
    function degSet(){ if(L.set) return minor&&L.key==='any'? DEG.map(x=>x[0]) : L.set; return minor?MIN:MAJ; }
    function make(){ const set=degSet();
      if(L.mode==='deg'){ const d=pick(set); const oct=L.wide? pick([-12,0,0,12]) : (SEMI[d]>7&&Math.random()<0.3?-12:0); const m=tonic+SEMI[d]+oct;
        return {prompt:'Which scale degree?', play:()=>Audio.playMidi(m,0,1.3), singTarget:m, resolve:()=>resolveTo(tonic+oct,d).forEach((x,i)=>Audio.playMidi(x,i*0.35,0.5)),
          answer:(el,done)=>{ const opts=(L.set&&!(minor&&L.key==='any')?L.set:set).map(x=>[x,lab(x,c)]); const w=buttons(el,[{k:'d',opts,cls:'rpdeg'}],s=>{ w.mark({d}); done(s.d===d, `It was ${d}${c.labels!=='num'?' ('+SOL[d]+')':''}.`, ()=>{ const o=r.deg[d]||{n:0,c:0}; o.n++; if(s.d===d) o.c++; r.deg[d]=o; }); }); }}; }
      if(L.mode==='iv'){ let a,b; if(L.chrom){ a=tonic+SEMI[pick(set)]-(Math.random()<0.5?0:12); b=a+(Math.random()<0.5?1:-1)*(1+rnd(12)); } else { const sc=(minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11]); const i=rnd(7), j=rnd(7); a=tonic+sc[i]; b=tonic+sc[j]+(j<=i?12:0); if(Math.random()<0.4) [a,b]=[b,a]; }
        const semis=Math.abs(b-a), name=IVN[semis];
        return {prompt:'Two notes in this key — which interval?', play:()=>{ Audio.playMidi(a,0,0.9); Audio.playMidi(b,0.8,1.1); }, resolve:null,
          answer:(el,done)=>{ const w=buttons(el,[{k:'i',opts:IVN.slice(1).map(n=>[n,n==='TT'?'tritone':n])}],s=>{ w.mark({i:name}); done(s.i===name, `${name==='TT'?'Tritone':name}, ${b>a?'up':'down'} (${semis} half steps).`, ()=>{ const o=r.iv[name]||{n:0,c:0}; o.n++; if(s.i===name) o.c++; r.iv[name]=o; }); }); }}; }
      // fragments
      const len=L.len[0]+rnd(L.len[1]-L.len[0]+1); const base=minor?[0,2,3,5,7,8,10,11]:[0,2,4,5,7,9,11]; const pool=L.chrom?DEG.map(x=>x[1]):base;
      let cur=pick([0,4,7].map(x=>minor&&x===4?3:x)); const seq=[cur]; for(let k=1;k<len;k++){ let nx; let t=0; do{ const step=pick([-3,-2,-2,-1,-1,1,1,2,2,3,4,-4]); nx=cur+step; t++; }while((!pool.includes(((nx%12)+12)%12)||nx<-5||nx>16)&&t<80); if(t>=80) nx=cur; seq.push(nx); cur=nx; }
      const degs=seq.map(s=>DEG.find(x=>x[1]===((s%12)+12)%12)[0]); const ms=seq.map(s=>tonic+s);
      return {prompt:`Tap the ${len} scale degrees you hear, in order`, play:()=>ms.forEach((m,i)=>Audio.playMidi(m,i*0.55,0.6)), resolve:null,
        answer:(el,done)=>{ const opts=(L.chrom?DEG.map(x=>x[0]):(minor?MIN:MAJ)); const taps=[]; el.innerHTML=`<div class="muted" id="rptaps">—</div><div class="mtbtns rpdeg">${opts.map(d=>`<button class="mtb" data-d="${d}">${lab(d,c)}</button>`).join('')}</div><button class="lnk" id="rpundo">undo</button>`;
          let lock=false; $$('[data-d]',el).forEach(bt=>bt.onclick=()=>{ if(lock) return; taps.push(bt.dataset.d); Audio.playMidi(tonic+SEMI[bt.dataset.d],0,0.4); $('#rptaps').textContent=taps.join(' – ');
            if(taps.length===len){ lock=true; const ok=taps.every((x,i)=>x===degs[i]); done(ok, `It was ${degs.join(' – ')}.`, ()=>{ r.frag.n++; if(ok) r.frag.c++; }); } });
          $('#rpundo').onclick=()=>{ if(!lock){ taps.pop(); $('#rptaps').textContent=taps.join(' – ')||'—'; } }; }};
    }
    next();
  }
  // sing-back: hold within ±30 cents of the target pitch class (any octave) for ~0.6 s
  async function singBack(el, target, r){ el.innerHTML=`<div class="card"><b>🎤 Now sing it</b> <span class="muted">(any octave)</span><div class="tuner"><div class="detected" id="sgd">listening…</div></div></div>`;
    try{ await Audio.startMic(); }catch(e){ el.innerHTML='<p class="muted">Mic not available — allow microphone access to use sing-back.</p>'; return; }
    let held=0, last=performance.now(), done=false; r.sing.n++; S.save();
    const loop=()=>{ if(done||!document.getElementById('sgd')) return; const p=Audio.detectPitch(); const now=performance.now(), dt=now-last; last=now;
      if(p&&p.freq){ const midiF=69+12*Math.log2(p.freq/440); let diff=((midiF-target)%12+12)%12; if(diff>6) diff-=12; const cents=Math.round(diff*100);
        $('#sgd').innerHTML=`${cents>0?'+':''}${cents} cents ${Math.abs(cents)<=30?'✅':cents>0?'(sharp)':'(flat)'}`; if(Math.abs(cents)<=30){ held+=dt; if(held>600){ done=true; r.sing.c++; S.save(); Audio.stopMic(); $('#sgd').innerHTML=`Nailed it — ${cents>0?'+':''}${cents} cents 🎯`; return; } } else held=Math.max(0,held-dt); }
      window._raf=requestAnimationFrame(loop); }; loop(); }
  window.EAR_EXTRA=(window.EAR_EXTRA||[]);
})();
