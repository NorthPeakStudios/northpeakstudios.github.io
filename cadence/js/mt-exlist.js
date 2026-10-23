// Cadence · Exercise definitions (original). Each one is fully set up by its settings page.
(() => {
  const {reg, rnd, pick, shuffle, di, fromDi, CLEFS, DEF_RANGE, NAT_NOTES, ACCS, buttons, staffInput} = MT;
  const N = n => T.name(n), NO = n => T.name(n,true), M = T.midi;
  const LET = ['C','D','E','F','G','A','B'].map((l,i)=>[i,l]);
  const PCN = ['C','C♯/D♭','D','E♭/D♯','E','F','F♯/G♭','G','A♭/G♯','A','B♭/A♯','B'];
  const rangeF = (clef) => ({k:'r_'+clef, label:CLEFS.find(c=>c[0]===clef)[1]+' clef range', type:'range', opts:NAT_NOTES, def:DEF_RANGE[clef], show:c=>c.clefs.includes(clef)});
  const clefF = (def=['treble','bass']) => ({k:'clefs', label:'Clefs', type:'multi', opts:CLEFS, def});
  const accF = (def=['natural','sharp','flat']) => ({k:'accs', label:'Accidentals', type:'multi', opts:ACCS.map(a=>[a[0],a[1]+' '+({dflat:'double flat',flat:'flat',natural:'natural',sharp:'sharp',dsharp:'double sharp'})[a[0]]]), def});
  const layoutF = {k:'layout', label:'Answer with', type:'select', opts:[['buttons','Note buttons'],['piano','Piano keyboard']], def:'buttons'};
  const accVals = c => ACCS.filter(a=>c.accs.includes(a[0])).map(a=>a[2]);
  function randNote(c, clef){ const [lo,hi]=c['r_'+clef]||DEF_RANGE[clef]; const d=di(lo)+rnd(di(hi)-di(lo)+1); return fromDi(d, pick(accVals(c))); }
  function staffOf(notes, clef, opt={}){ return UI.staff(notes.map(n=>Array.isArray(n)?{notes:n}:{notes:[n]}), Object.assign({clef, width:260}, opt)); }
  const playN = (ms, gap=0) => ms.forEach((m,k)=>Audio.playMidi(m, k*gap, 1.2));
  function noteAnswer(el, done, c, target, accsAllowed){ // letter + accidental buttons, or piano
    if(c.layout==='piano'){ el.innerHTML='<div class="qpiano mtpiano"></div>'; let lock=false; const lo=Math.min(48, M(target)-M(target)%12), hi=lo+24+ (M(target)-lo>=24?12:0);
      UI.piano(el.firstChild,{from:lo,to:Math.max(hi,lo+24),labels:true,onNote:m=>{ if(lock) return; lock=true; const ok=m%12===M(target)%12; done(ok, `It’s ${NO(target)}${ok&&m!==M(target)?' (right note, other octave — fine)':''}.`); }}); return; }
    const accs=ACCS.filter(a=>accsAllowed.includes(a[2]));
    const groups=[]; if(accs.length>1 || accs[0][2]!==0) groups.push({k:'a', opts:accs.map(a=>[a[2],a[1]]), def:accs.some(a=>a[2]===0)?0:accs[0][2], cls:'acc'});
    groups.push({k:'l', opts:LET, cls:'let'});
    const w=buttons(el, groups, s=>{ const a=s.a===undefined?0:s.a; const ok=s.l===target.l && a===target.a; w.mark({l:target.l,a:target.a}); done(ok, `It’s ${N(target)}.`); });
  }

  // ===== Note identification =====
  reg({id:'noteid', group:'staff', area:'notation', title:'Note identification', desc:'A note appears on the staff — name it.', fields:[clefF(['treble','bass']), rangeF('treble'), rangeF('bass'), rangeF('alto'), rangeF('tenor'), accF(['natural']), layoutF],
    make(c){ const clef=pick(c.clefs), n=randNote(c,clef); return {prompt:'Name this note', staff:staffOf([n],clef), after:()=>Audio.playMidi(M(n),0,1), answer:(el,done)=>noteAnswer(el,done,c,n,accVals(c))}; }});

  // ===== Key signature identification =====
  const MAJ=['C♭','G♭','D♭','A♭','E♭','B♭','F','C','G','D','A','E','B','F♯','C♯'], MIN=['a♭','e♭','b♭','f','c','g','d','a','e','b','f♯','c♯','g♯','d♯','a♯'];
  const KS_OPTS=[]; for(let k=-7;k<=7;k++) KS_OPTS.push([k, k===0?'none':Math.abs(k)+(k>0?'♯':'♭')]);
  reg({id:'keysigid', group:'staff', area:'keys', title:'Key signature identification', desc:'A key signature appears — name the key.', fields:[clefF(['treble','bass']), {k:'mode',label:'Keys',type:'select',opts:[['major','Major'],['minor','Minor'],['both','Both']],def:'major'}, {k:'ks',label:'Key signatures',type:'multi',opts:KS_OPTS,def:KS_OPTS.map(o=>o[0])}],
    make(c){ const clef=pick(c.clefs), k=pick(c.ks), mode=c.mode==='both'?pick(['major','minor']):c.mode; const names=mode==='major'?MAJ:MIN; const ans=names[k+7];
      const opts=(c.ks.length<15? c.ks.slice().sort((a,b)=>a-b) : KS_OPTS.map(o=>o[0])).map(x=>[names[x+7], names[x+7]+(mode==='major'?' major':' minor')]);
      return {prompt:`Which <b>${mode}</b> key?`, staff:UI.staff([],{clef,keySig:k,width:200}), after:()=>{ const t=T.parse(ans+'4'); const iv=mode==='major'?['M3','P5']:['m3','P5']; playN([M(t),...iv.map(x=>M(T.up(t,x)))],0); },
        answer:(el,done)=>{ const w=buttons(el,[{k:'k',opts}],s=>{ w.mark({k:ans}); done(s.k===ans, `${ans} ${mode} has ${k===0?'no sharps or flats':Math.abs(k)+(k>0?' sharp':' flat')+(Math.abs(k)>1?'s':'')}.`); }); }}; }});

  // ===== Interval identification (staff) =====
  const IVS=['P1','m2','M2','A2','m3','M3','d4','P4','A4','d5','P5','A5','m6','M6','d7','m7','M7','P8'];
  const IV_DEF=['m2','M2','m3','M3','P4','A4','d5','P5','m6','M6','m7','M7','P8'];
  const Q_OPTS=[['d','dim'],['m','minor'],['P','perfect'],['M','major'],['A','aug']];
  const NUM_OPTS=n=>{ const a=[[1,'unison'],[2,'2nd'],[3,'3rd'],[4,'4th'],[5,'5th'],[6,'6th'],[7,'7th'],[8,'octave']]; if(n) a.push([9,'9th'],[10,'10th'],[11,'11th'],[12,'12th'],[13,'13th'],[14,'14th'],[15,'2 oct']); return a; };
  const compound = code => { const q=code.replace(/\d+/,''), n=+code.replace(/\D/g,''); return q+(n+7); };
  function genInterval(c, clef){ for(let t=0;t<200;t++){ let code=pick(c.ivs); if(c.compound && code!=='P8' && Math.random()<0.4) code=compound(code); const lo=fromDi(di((c['r_'+clef]||DEF_RANGE[clef])[0])+rnd(Math.max(1,di((c['r_'+clef]||DEF_RANGE[clef])[1])-di((c['r_'+clef]||DEF_RANGE[clef])[0])+1)), c.rootAcc?pick([-1,0,0,1]):0);
      const hi=T.up(lo,code); if(Math.abs(hi.a)>(c.doubles?2:1)) continue; if(T.diatonicIndex(hi)>di((c['r_'+clef]||DEF_RANGE[clef])[1])+(c.compound?7:2)) continue; return {lo,hi,code}; } return {lo:T.parse('C4'),hi:T.parse('G4'),code:'P5'}; }
  const ivLabel = code => { const q=code.replace(/\d+/,''), n=+code.replace(/\D/g,''); return T.intervalName({q,num:n}); };
  reg({id:'intervalid', group:'staff', area:'intervals', title:'Interval identification', desc:'Two notes on the staff — name the interval (quality + number).', fields:[clefF(['treble']), rangeF('treble'), rangeF('bass'), rangeF('alto'), rangeF('tenor'),
      {k:'ivs',label:'Intervals',type:'multi',opts:IVS.map(x=>[x,x]),def:IV_DEF}, {k:'compound',label:'Include compound intervals (9th–15th)',type:'bool',def:false},
      {k:'dir',label:'Shown as',type:'multi',opts:[['up','melodic ↑'],['down','melodic ↓'],['harm','harmonic (stacked)']],def:['up','harm']}, {k:'rootAcc',label:'Accidentals on the lower note',type:'bool',def:true}, {k:'doubles',label:'Allow double sharps/flats',type:'bool',def:false}],
    make(c){ const clef=pick(c.clefs); const {lo,hi,code}=genInterval(c,clef); const d=code==='P1'?'up':pick(c.dir); const q=code.replace(/\d+/,''), num=+code.replace(/\D/g,'');
      const st= d==='harm'? staffOf([[lo,hi]],clef) : staffOf(d==='up'?[lo,hi]:[hi,lo],clef);
      return {prompt:'Name the interval', staff:st, after:()=>d==='harm'?playN([M(lo),M(hi)]):playN(d==='up'?[M(lo),M(hi)]:[M(hi),M(lo)],0.6),
        answer:(el,done)=>{ const w=buttons(el,[{k:'q',opts:Q_OPTS,label:'Quality'},{k:'n',opts:NUM_OPTS(c.compound),label:'Number'}],s=>{ w.mark({q,n:num}); done(s.q===q&&s.n===num, `${N(lo)} up to ${N(hi)} is a ${ivLabel(code)} (${T.intervalBetween(lo,hi).semis} half steps).`); }); }}; }});

  // ===== Chord identification (staff) =====
  const CH=[['maj','Major'],['min','Minor'],['dim','Diminished'],['aug','Augmented'],['maj7','Major 7th'],['dom7','Dominant 7th'],['min7','Minor 7th'],['hdim7','Half-dim 7th'],['dim7','Diminished 7th'],['minmaj7','Minor-major 7th'],['augmaj7','Augmented-major 7th']];
  const INV=[[0,'Root position'],[1,'1st inversion'],[2,'2nd inversion'],[3,'3rd inversion']];
  const FIG3=['5/3 (root)','6','6/4'], FIG7=['7','6/5','4/3','4/2'];
  function buildChord(c, clef, symmetricOk=true){ for(let t=0;t<200;t++){ const type=pick(c.types); const size=T.CHORDS[type].iv.length+1; const invs=c.invs.filter(x=>x<size); if(!invs.length) continue; const inv=pick(invs);
      const [loS,hiS]=c['r_'+clef]||DEF_RANGE[clef]; const root=fromDi(di(loS)+rnd(Math.max(1,di(hiS)-di(loS)-5)), c.rootAcc?pick([-1,0,0,1]):0);
      let notes=T.chord(root,type); if(notes.some(n=>Math.abs(n.a)>(c.doubles?2:1))) continue;
      for(let k=0;k<inv;k++){ const b=notes.shift(); notes.push(T.note(b.l,b.a,b.o+1)); }
      if(T.diatonicIndex(notes[notes.length-1])>di(hiS)+3) continue; return {root,type,inv,notes,size}; } return null; }
  reg({id:'chordid', group:'staff', area:'chords', title:'Chord identification', desc:'A chord on the staff — name its root, quality and inversion.', fields:[clefF(['treble','bass']), rangeF('treble'), rangeF('bass'), rangeF('alto'), rangeF('tenor'),
      {k:'types',label:'Chord types',type:'multi',opts:CH,def:['maj','min','dim','aug']}, {k:'invs',label:'Inversions',type:'multi',opts:INV,def:[0,1,2]}, {k:'askInv',label:'Ask for the inversion',type:'bool',def:true}, {k:'rootAcc',label:'Accidentals on the root',type:'bool',def:true}, {k:'doubles',label:'Allow double sharps/flats',type:'bool',def:false}],
    make(c){ const clef=pick(c.clefs); const ch=buildChord(c,clef)||{root:T.parse('C4'),type:'maj',inv:0,notes:T.chord(T.parse('C4'),'maj'),size:3};
      return {prompt:'Name the chord', staff:staffOf([ch.notes],clef), after:()=>playN(ch.notes.map(M)),
        answer:(el,done)=>{ const groups=[{k:'a',opts:[[-1,'♭'],[0,'♮'],[1,'♯']].concat(c.doubles?[[-2,'𝄫'],[2,'𝄪']]:[]),def:0,cls:'acc',label:'Root'},{k:'l',opts:LET,cls:'let'},{k:'t',opts:CH.filter(x=>c.types.includes(x[0])),label:'Quality'}];
          if(c.askInv) groups.push({k:'i',opts:INV.filter(x=>c.invs.includes(x[0])&&(x[0]<3||c.types.some(t=>T.CHORDS[t].iv.length>2))),label:'Inversion'});
          const w=buttons(el,groups,s=>{ const ok=s.l===ch.root.l&&s.a===ch.root.a&&s.t===ch.type&&(!c.askInv||s.i===ch.inv); w.mark({l:ch.root.l,a:ch.root.a,t:ch.type,i:ch.inv});
            done(ok, `${N(ch.root)} ${CH.find(x=>x[0]===ch.type)[1].toLowerCase()}, ${INV[ch.inv][1].toLowerCase()} (figures ${ch.size===3?FIG3[ch.inv]:FIG7[ch.inv]}): ${ch.notes.map(N).join(' ')}.`); }); }}; }});

  // ===== Keyboard exercises =====
  const kbRange = {k:'oct',label:'Keyboard size',type:'select',opts:[[1,'1 octave'],[2,'2 octaves']],def:2};
  function kbVisual(lo,hi,keys){ return el=>{ el.innerHTML='<div class="qpiano mtpiano mtkb"></div>'; const p=UI.piano(el.firstChild,{from:lo,to:hi,labels:false}); p.highlight(new Set(keys)); el.firstChild.style.pointerEvents='none'; }; }
  reg({id:'kbnote', group:'keys', area:'notation', title:'Keyboard note identification', desc:'A key lights up — name it.', fields:[kbRange,{k:'keys',label:'Keys',type:'multi',opts:[['white','White keys'],['black','Black keys']],def:['white','black']}],
    make(c){ const lo=48, hi=lo+12*c.oct; const pool=[]; for(let m=lo;m<hi;m++){ const b=[1,3,6,8,10].includes(m%12); if(c.keys.includes(b?'black':'white')) pool.push(m); } const m=pick(pool);
      return {prompt:'Name the highlighted key', visual:kbVisual(lo,hi,[m]), after:()=>Audio.playMidi(m,0,1), answer:(el,done)=>{ const w=buttons(el,[{k:'p',opts:PCN.map((x,i)=>[i,x]),cls:'pc'}],s=>{ w.mark({p:m%12}); done(s.p===m%12, `That’s ${PCN[m%12]}.`); }); }}; }});
  const KIV=[[1,'m2'],[2,'M2'],[3,'m3'],[4,'M3'],[5,'P4'],[6,'A4/d5 (tritone)'],[7,'P5'],[8,'m6'],[9,'M6'],[10,'m7'],[11,'M7'],[12,'P8']];
  reg({id:'kbinterval', group:'keys', area:'intervals', title:'Keyboard interval identification', desc:'Two keys light up — name the interval (by half steps; spelling-neutral).', fields:[kbRange,{k:'ivs',label:'Intervals',type:'multi',opts:KIV,def:KIV.map(x=>x[0])}],
    make(c){ const lo=48, hi=lo+12*c.oct; const iv=pick(c.ivs); const a=lo+rnd(Math.max(1,hi-lo-iv)); return {prompt:'Name the interval', visual:kbVisual(lo,hi,[a,a+iv]), after:()=>playN([a,a+iv],0.5),
      answer:(el,done)=>{ const w=buttons(el,[{k:'i',opts:KIV.filter(x=>c.ivs.includes(x[0]))}],s=>{ w.mark({i:iv}); done(s.i===iv, `${iv} half step${iv>1?'s':''} = ${KIV[iv-1][1]}.`); }); }}; }});
  const KCH=CH.filter(x=>!['minmaj7','augmaj7'].includes(x[0]));
  reg({id:'kbchord', group:'keys', area:'chords', title:'Keyboard chord identification', desc:'A chord lights up on the keyboard — name root + quality (+ inversion).', fields:[{k:'types',label:'Chord types',type:'multi',opts:KCH,def:['maj','min','dim','aug']},{k:'invs',label:'Inversions',type:'multi',opts:INV,def:[0]},{k:'askInv',label:'Ask for the inversion',type:'bool',def:false}],
    make(c){ const type=pick(c.types), ivs=[0,...T.CHORDS[type].iv.map(x=>M(T.up(T.parse('C4'),x))-60)]; const invs=c.invs.filter(x=>x<ivs.length); const inv=invs.length?pick(invs):0; const r=48+rnd(12); let ks=ivs.map(x=>r+x); for(let k=0;k<inv;k++) ks.push(ks.shift()+12);
      const sym=['aug','dim7'].includes(type); return {prompt:'Name the chord', visual:kbVisual(48,84,ks), after:()=>playN(ks),
      answer:(el,done)=>{ const groups=[{k:'p',opts:PCN.map((x,i)=>[i,x]),cls:'pc',label:'Root'},{k:'t',opts:KCH.filter(x=>c.types.includes(x[0])),label:'Quality'}]; if(c.askInv&&!sym) groups.push({k:'i',opts:INV.filter(x=>c.invs.includes(x[0])),label:'Inversion'});
        const w=buttons(el,groups,s=>{ const rootOk= sym? ks.some(k=>k%12===s.p) : s.p===r%12; const ok=rootOk&&s.t===type&&(!c.askInv||sym||s.i===inv); w.mark({p:r%12,t:type,i:inv});
          done(ok, `${PCN[r%12]} ${CH.find(x=>x[0]===type)[1].toLowerCase()}${c.askInv&&!sym?', '+INV[inv][1].toLowerCase():''}.${sym?' (This chord is symmetrical, so any of its notes counts as the root here.)':''}`); }); }}; }});

  // ===== Fretboard note identification =====
  const FB={guitar:{name:'Guitar',t:[40,45,50,55,59,64],s:['E','A','D','G','B','e']}, bass:{name:'Bass',t:[28,33,38,43],s:['E','A','D','G']}, uke:{name:'Ukulele',t:[67,60,64,69],s:['G','C','E','A']}};
  function fretSvg(inst, str, fret, frets){ const t=FB[inst].t, W=Math.max(260,frets*40+50), H=t.length*24+28; let s=`<svg viewBox="0 0 ${W} ${H}" class="fret" width="100%" style="max-width:${W*1.4}px">`;
    for(let f=0;f<=frets;f++){ const x=34+f*40; s+=`<line x1="${x}" x2="${x}" y1="12" y2="${H-16}" class="${f===0?'nut':'fw'}"/>`; if([3,5,7,9,15].includes(f)) s+=`<circle cx="${x-20}" cy="${H-6}" r="3" class="dot"/>`; if(f===12) s+=`<circle cx="${x-26}" cy="${H-6}" r="3" class="dot"/><circle cx="${x-14}" cy="${H-6}" r="3" class="dot"/>`; }
    t.slice().reverse().forEach((o,si)=>{ const y=24+si*24; s+=`<line x1="34" x2="${W-6}" y1="${y}" y2="${y}" class="str"/><text x="4" y="${y+4}" class="ftxt" style="fill:#8b95a7">${FB[inst].s[t.length-1-si]}</text>`; });
    const y=24+(t.length-1-str)*24, x=fret===0?22:34+fret*40-20; s+=`<circle cx="${x}" cy="${y}" r="10" class="froot"/>`; return s+'</svg>'; }
  reg({id:'fretnote', group:'keys', area:'notation', title:'Fretboard note identification', desc:'A dot on the fretboard — name the note.', fields:[{k:'inst',label:'Instrument',type:'select',opts:Object.entries(FB).map(([k,v])=>[k,v.name]),def:'guitar'},{k:'frets',label:'Frets',type:'select',opts:[[5,'0–5'],[7,'0–7'],[12,'0–12']],def:12},{k:'nat',label:'Natural notes only',type:'bool',def:false}],
    make(c){ const t=FB[c.inst].t; let str,fret,m; do{ str=rnd(t.length); fret=rnd(c.frets+1); m=t[str]+fret; }while(c.nat&&[1,3,6,8,10].includes(m%12));
      return {prompt:'Name this note', visual:el=>{ el.innerHTML=`<div class="fretwrap">${fretSvg(c.inst,str,fret,c.frets)}</div>`; }, after:()=>Audio.playMidi(m,0,1.2),
        answer:(el,done)=>{ const w=buttons(el,[{k:'p',opts:PCN.map((x,i)=>[i,x]),cls:'pc'}],s=>{ w.mark({p:m%12}); done(s.p===m%12, `${FB[c.inst].s[str]} string, fret ${fret} = ${PCN[m%12]}.`); }); }}; }});

  // ===== Construction =====
  const sameSpell=(a,b)=>a.l===b.l&&a.a===b.a, sameNote=(a,b)=>sameSpell(a,b)&&a.o===b.o;
  reg({id:'noteconst', group:'build', area:'notation', title:'Note construction', desc:'Put the named note on the staff (tap a line or space, then an accidental).', fields:[clefF(['treble','bass']), rangeF('treble'), rangeF('bass'), rangeF('alto'), rangeF('tenor'), accF(['natural','sharp','flat']), {k:'oct',label:'Exact octave required',type:'bool',def:true}],
    make(c){ const clef=pick(c.clefs), n=randNote(c,clef); return {prompt:`Write <b>${c.oct?NO(n):N(n)}</b> in ${clef} clef`, after:()=>Audio.playMidi(M(n),0,1),
      answer:(el,done)=>{ const si=staffInput(el,{clef,mode:'one',accs:ACCS.filter(a=>c.accs.includes(a[0])||a[2]===0),sound:c.sound,onCheck:p=>{ if(!p.length) return toast('Tap the staff first'); const g=p[0]; const ok=c.oct?sameNote(g,n):sameSpell(g,n); si.lock(); if(!ok) si.show([n]); done(ok, ok?'':`You wrote ${NO(g)}; here’s ${NO(n)}.`); }}); }}; }});
  reg({id:'intervalconst', group:'build', area:'intervals', title:'Interval construction', desc:'Build the interval above (or below) the given note.', fields:[clefF(['treble']), rangeF('treble'), rangeF('bass'), rangeF('alto'), rangeF('tenor'), {k:'ivs',label:'Intervals',type:'multi',opts:IVS.filter(x=>x!=='P1').map(x=>[x,x]),def:IV_DEF}, {k:'below',label:'Also build below',type:'bool',def:false}, {k:'rootAcc',label:'Accidentals on the given note',type:'bool',def:true}, {k:'doubles',label:'Allow double sharps/flats',type:'bool',def:false}],
    make(c){ const clef=pick(c.clefs); const {lo,hi,code}=genInterval(c,clef); const dn=c.below&&Math.random()<0.5; const given=dn?hi:lo, target=dn?lo:hi;
      return {prompt:`Write a <b>${ivLabel(code)}</b> ${dn?'below':'above'} ${N(given)}`, after:()=>playN([M(given),M(target)],0.5),
        answer:(el,done)=>{ const si=staffInput(el,{clef,mode:'many',given:[given],sound:c.sound,accs:ACCS.filter(a=>c.doubles||Math.abs(a[2])<2),onCheck:p=>{ if(p.length!==1) return toast('Place exactly one note'); const ok=sameNote(p[0],target); si.lock(); if(!ok) si.show([given,target]); done(ok, `${ivLabel(code)} ${dn?'below':'above'} ${NO(given)} is ${NO(target)}.`); }}); }}; }});
  reg({id:'chordconst', group:'build', area:'chords', title:'Chord construction', desc:'Build the chord on the given root (root position, stacked in thirds).', fields:[clefF(['treble']), rangeF('treble'), rangeF('bass'), rangeF('alto'), rangeF('tenor'), {k:'types',label:'Chord types',type:'multi',opts:CH,def:['maj','min','dim','aug']}, {k:'rootAcc',label:'Accidentals on the root',type:'bool',def:true}],
    make(c){ const clef=pick(c.clefs); const ch=buildChord(Object.assign({},c,{invs:[0],doubles:false}),clef)||{root:T.parse('C4'),type:'maj',notes:T.chord(T.parse('C4'),'maj')};
      return {prompt:`Build <b>${N(ch.root)} ${CH.find(x=>x[0]===ch.type)[1].toLowerCase()}</b> (root position)`, after:()=>playN(ch.notes.map(M)),
        answer:(el,done)=>{ const si=staffInput(el,{clef,mode:'many',given:[ch.root],sound:c.sound,hint:'Tap to add a note, tap it again to select it (then an accidental), tap a selected note to remove it.',onCheck:p=>{ const want=ch.notes.slice(1); const ok=p.length===want.length&&want.every(w=>p.some(x=>sameNote(x,w))); si.lock(); if(!ok) si.show(ch.notes); done(ok, `${N(ch.root)} ${CH.find(x=>x[0]===ch.type)[1].toLowerCase()} = ${ch.notes.map(N).join(' ')}.`); }}); }}; }});
  const KSPOS={treble:{s:[38,35,39,36,33,37,34],f:[34,37,33,36,32,35,31]},bass:{s:[24,21,25,22,19,23,20],f:[20,23,19,22,18,21,17]},alto:{s:[31,28,32,29,26,30,27],f:[27,30,26,29,25,28,24]},tenor:{s:[24,28,25,29,26,30,27],f:[27,30,26,29,25,28,24]}};
  reg({id:'keysigconst', group:'build', area:'keys', title:'Key signature construction', desc:'Write the key signature: pick ♯ or ♭, then tap each line/space in order.', fields:[clefF(['treble','bass']), {k:'mode',label:'Keys',type:'select',opts:[['major','Major'],['minor','Minor'],['both','Both']],def:'major'}, {k:'ks',label:'Key signatures',type:'multi',opts:KS_OPTS.filter(o=>o[0]!==0),def:KS_OPTS.filter(o=>o[0]!==0).map(o=>o[0])}],
    make(c){ const clef=pick(c.clefs), k=pick(c.ks), mode=c.mode==='both'?pick(['major','minor']):c.mode; const name=(mode==='major'?MAJ:MIN)[k+7]+(mode==='major'?' major':' minor');
      const want=(k>0?KSPOS[clef].s:KSPOS[clef].f).slice(0,Math.abs(k)).map(d=>({d,t:Math.sign(k)}));
      return {prompt:`Write the key signature for <b>${name}</b> (${clef} clef)`, answer:(el,done)=>{ const si=staffInput(el,{clef,mode:'keysig',width:240,onCheck:ks=>{ const ok=ks.length===want.length&&ks.every((x,i)=>x.d===want[i].d&&x.t===want[i].t); si.lock(); if(!ok) si.showKs(want); done(ok, `${name}: ${T.keySigAccidentals(k).join(' ')||'none'}${ok?'':' — order and octave placement both count.'}`); }}); }}; }});

  // ===== Ear training =====
  const earRoot = c => 48+rnd(Math.max(1,(c.hi||72)-48-12));
  reg({id:'earinterval', group:'ear', area:'ear', title:'Interval ear training', desc:'Hear two notes — name the interval.', fields:[{k:'ivs',label:'Intervals',type:'multi',opts:KIV,def:[3,4,5,7,12]}, {k:'dir',label:'Played',type:'multi',opts:[['up','ascending'],['down','descending'],['harm','together']],def:['up']}, {k:'compound',label:'Add compound (over an octave)',type:'bool',def:false}],
    make(c){ let iv=pick(c.ivs); const comp=c.compound&&Math.random()<0.35; const a=earRoot(c), b=a+iv+(comp?12:0); const d=pick(c.dir); const play=()=>d==='harm'?playN([a,b]):playN(d==='up'?[a,b]:[b,a],0.7);
      return {ear:true, prompt:'Which interval?', play, answer:(el,done)=>{ const w=buttons(el,[{k:'i',opts:KIV.filter(x=>c.ivs.includes(x[0]))}],s=>{ w.mark({i:iv}); done(s.i===iv, `${KIV[iv-1][1]}${comp?' + an octave':''}.`); }); }}; }});
  const SC=[['major','Major'],['natural_minor','Natural minor'],['harmonic_minor','Harmonic minor'],['melodic_minor','Melodic minor (asc.)'],['dorian','Dorian'],['phrygian','Phrygian'],['lydian','Lydian'],['mixolydian','Mixolydian'],['locrian','Locrian'],['major_pentatonic','Major pentatonic'],['minor_pentatonic','Minor pentatonic'],['blues','Blues'],['whole_tone','Whole-tone']];
  reg({id:'earscale', group:'ear', area:'ear', title:'Scale ear training', desc:'Hear a scale — name it.', fields:[{k:'sc',label:'Scales',type:'multi',opts:SC.filter(x=>T.SCALES[x[0]]),def:['major','natural_minor','harmonic_minor','melodic_minor']}, {k:'dir',label:'Played',type:'select',opts:[['up','ascending'],['updown','up and down']],def:'up'}],
    make(c){ const type=pick(c.sc); const r=T.note(rnd(7),0,4); const ms=[...T.scale(r,type).map(M), M(r)+12]; const seq=c.dir==='updown'?ms.concat(ms.slice(0,-1).reverse()):ms; const play=()=>seq.forEach((m,k)=>Audio.playMidi(m,k*0.32,0.5));
      return {ear:true, prompt:'Which scale?', play, answer:(el,done)=>{ const w=buttons(el,[{k:'s',opts:SC.filter(x=>c.sc.includes(x[0]))}],s=>{ w.mark({s:type}); done(s.s===type, `${SC.find(x=>x[0]===type)[1]} (on ${N(r)}).`); }); }}; }});
  reg({id:'earchord', group:'ear', area:'ear', title:'Chord ear training', desc:'Hear a chord — name its quality (and inversion if you want).', fields:[{k:'types',label:'Chord types',type:'multi',opts:CH,def:['maj','min','dim','aug']}, {k:'invs',label:'Inversions',type:'multi',opts:INV,def:[0]}, {k:'askInv',label:'Ask for the inversion',type:'bool',def:false}, {k:'arp',label:'Play',type:'select',opts:[['block','together'],['arp','arpeggiated'],['both','arpeggio then together']],def:'block'}],
    make(c){ const type=pick(c.types), r=T.note(rnd(7),pick([-1,0,0]),3); let ns=T.chord(r,type); const invs=c.invs.filter(x=>x<ns.length); const inv=invs.length?pick(invs):0; for(let k=0;k<inv;k++){ const b=ns.shift(); ns.push(T.note(b.l,b.a,b.o+1)); } const ms=ns.map(M);
      const play=()=>{ if(c.arp!=='block') ms.forEach((m,k)=>Audio.playMidi(m,k*0.35,1.4)); if(c.arp!=='arp') ms.forEach(m=>Audio.playMidi(m,c.arp==='both'?ms.length*0.35+0.2:0,1.6)); };
      return {ear:true, prompt:'Which chord?', play, answer:(el,done)=>{ const groups=[{k:'t',opts:CH.filter(x=>c.types.includes(x[0])),label:'Quality'}]; if(c.askInv) groups.push({k:'i',opts:INV.filter(x=>c.invs.includes(x[0])),label:'Inversion'});
        const w=buttons(el,groups,s=>{ w.mark({t:type,i:inv}); done(s.t===type&&(!c.askInv||s.i===inv), `${N(r)} ${CH.find(x=>x[0]===type)[1].toLowerCase()}, ${INV[inv][1].toLowerCase()}.`); }); }}; }});
  reg({id:'eartone', group:'ear', area:'ear', title:'Tone (pitch) ear training', desc:'Hear one note — find it. With a reference note it’s relative pitch; without, it’s perfect-pitch practice.', fields:[{k:'ref',label:'Reference note first',type:'select',opts:[['none','None'],['C4','C4'],['A4','A4 (440)']],def:'C4'}, {k:'span',label:'Range',type:'select',opts:[[12,'C4–B4'],[24,'C4–B5'],[36,'C3–B5']],def:12}, {k:'white',label:'White keys only',type:'bool',def:false}, layoutF],
    make(c){ const lo=c.span===36?48:60; let m; do{ m=lo+rnd(c.span); }while(c.white&&[1,3,6,8,10].includes(m%12)); const play=()=>{ let t=0; if(c.ref!=='none'){ Audio.playMidi(M(T.parse(c.ref)),0,0.9); t=1.2; } Audio.playMidi(m,t,1.2); };
      return {ear:true, prompt:c.ref==='none'?'Which note?':`Reference: ${c.ref}. Which note comes after it?`, play, answer:(el,done)=>{ if(c.layout==='piano'){ el.innerHTML='<div class="qpiano mtpiano"></div>'; let lock=false; UI.piano(el.firstChild,{from:lo,to:lo+c.span,onNote:k=>{ if(lock) return; lock=true; done(k===m, `It was ${PCN[m%12]}${Math.floor(m/12)-1}.`); }}); }
        else { const w=buttons(el,[{k:'p',opts:PCN.map((x,i)=>[i,x]).filter(x=>!c.white||![1,3,6,8,10].includes(x[0])),cls:'pc'}],s=>{ w.mark({p:m%12}); done(s.p===m%12, `It was ${PCN[m%12]}.`); }); } }}; }});
})();
