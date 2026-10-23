// Cadence · Brass fingerings & trombone positions (original). Fingerings are derived from each instrument's open partials
// (the notes you can play with no valves), lowering by valve combos: 2 = ½ step, 1 = whole step, 1-2 (or 3) = 1½, 2-3 = 2, 1-3 = 2½, 1-2-3 = 3.
// The 7th partial is left out (it's too flat to use), which reproduces the standard charts: e.g. trumpet written E4 = 1-2 (alt 3), C♯5 = 1-2, G♯5 = 2-3.
(() => {
  const {reg, rnd, pick, fromDi, buttons} = MT, M=T.midi, N=n=>T.name(n,true);
  const SEMI={0:['0'],1:['2'],2:['1'],3:['12','3'],4:['23'],5:['13'],6:['123']};
  const VLAB={'0':'open','1':'1','2':'2','3':'3','12':'1-2','13':'1-3','23':'2-3','123':'1-2-3'};
  const INST={
    trumpet:{name:'Trumpet (B♭)', clef:'treble', p:[60,67,72,76,79,84], lo:'F#3', hi:'C6', def:['C4','G5'], conc:'M2', note:'written pitch (trumpet part), sounds a major 2nd lower'},
    horn:{name:'Horn in F (single F horn)', clef:'treble', p:[48,55,60,64,67,72,76,79,84], lo:'F#3', hi:'C6', def:['G3','G5'], conc:'P5', note:'written pitch (horn part), sounds a perfect 5th lower', pro:true},
    trombone:{name:'Trombone (tenor, positions)', clef:'bass', p:[46,53,58,62,65,70], lo:'E2', hi:'Bb4', def:['E2','F4'], slide:true, note:'concert pitch, bass clef', pro:true},
    euph:{name:'Baritone / euphonium (bass clef, 3 valves)', clef:'bass', p:[46,53,58,62,65,70], lo:'E2', hi:'Bb4', def:['E2','F4'], note:'concert pitch, bass clef', pro:true},
    euphtc:{name:'Baritone treble clef (B♭)', clef:'treble', p:[60,67,72,76,79,84], lo:'F#3', hi:'A5', def:['C4','G5'], conc:'M9', note:'written pitch — same fingerings as trumpet; sounds a major 9th lower', pro:true},
    tuba:{name:'Tuba in B♭ (BB♭, 3 valves)', clef:'bass', p:[34,41,46,50,53,58], lo:'E1', hi:'F3', def:['F1','F3'], note:'concert pitch, bass clef', pro:true},
  };
  // all valid fingerings for written midi m, best first
  function fingerings(inst, m){ const I=INST[inst], out=[]; const ps=I.p.filter(p=>p>=m&&p-m<=6).sort((a,b)=>(a-m)-(b-m));
    for(const p of ps){ const s=p-m; if(!I.slide&&out.length&&s===6) continue; /* 1-2-3 alternates are out of tune and unused */ if(I.slide) out.push(String(s+1)); else for(const f of SEMI[s]) if(!out.includes(f)) out.push(f); } return out; }
  const label=(inst,f)=>INST[inst].slide?f+({1:'st',2:'nd',3:'rd'}[f]||'th'):VLAB[f];
  window.BRASS={INST, fingerings, label};
  const allNotes=()=>{ const a=[]; for(let o=1;o<=6;o++) for(const l of 'CDEFGAB') a.push(l+o); return a; };
  for(const [id,I] of Object.entries(INST)){
    const rng=allNotes().filter(x=>T.diatonicIndex(T.parse(x))>=T.diatonicIndex(T.parse(I.lo.replace(/[#b]/,'')))&&T.diatonicIndex(T.parse(x))<=T.diatonicIndex(T.parse(I.hi.replace(/[#b]/,''))));
    reg({id:'brass-'+id, group:'brass', area:'notation', pro:!!I.pro, title:(I.slide?'':'')+I.name+(I.slide?'':' fingerings'), desc:`A note appears (${I.note}) — tap the ${I.slide?'slide position':'valves'}.`,
      fields:[{k:'range',label:'Note range',type:'range',opts:rng,def:I.def},{k:'accs',label:'Accidentals',type:'multi',opts:[['natural','♮ naturals'],['sharp','♯ sharps'],['flat','♭ flats']],def:['natural','sharp','flat']},
        {k:'alt',label:'Accept alternate '+(I.slide?'positions':'fingerings'),type:'bool',def:true},{k:'name',label:'Show the note name',type:'bool',def:false}].concat(I.conc?[{k:'conc',label:'Show concert pitch',type:'bool',def:false}]:[]),
      make(c){ const lo=Math.max(M(T.parse(c.range[0])),M(T.parse(I.lo))), hi=Math.min(M(T.parse(c.range[1])),M(T.parse(I.hi))); const av=[]; if(c.accs.includes('natural')) av.push(0); if(c.accs.includes('sharp')) av.push(1); if(c.accs.includes('flat')) av.push(-1);
        let n, fs; for(let t=0;t<300;t++){ const d=T.diatonicIndex(T.parse(c.range[0]))+rnd(T.diatonicIndex(T.parse(c.range[1]))-T.diatonicIndex(T.parse(c.range[0]))+1); n=fromDi(d,pick(av)); if(n.a===1&&(n.l===2||n.l===6)&&Math.random()<0.8) continue; if(n.a===-1&&(n.l===0||n.l===3)&&Math.random()<0.8) continue; const m=M(n); if(m<lo||m>hi) continue; fs=fingerings(id,m); if(fs.length) break; }
        const m=M(n); const sounding=I.conc?T.below(n,I.conc):n;
        return {prompt:`${I.slide?'Which position?':'Which valves?'}${c.name?` <b>${N(n)}</b>`:''}${c.conc&&I.conc?` <span class="muted">(sounds ${N(sounding)})</span>`:''}`, staff:UI.staff([{notes:[n]}],{clef:I.clef,width:200}), after:()=>Audio.playMidi(M(sounding),0,1.2),
          answer:(el,done)=>{ const opts=I.slide?[1,2,3,4,5,6,7].map(x=>[String(x),label(id,String(x))]):['0','1','2','3','12','13','23','123'].map(x=>[x,VLAB[x]]);
            const w=buttons(el,[{k:'f',opts,cls:I.slide?'':'wide'}],s=>{ const ok=c.alt?fs.includes(s.f):s.f===fs[0]; w.mark({f:ok?s.f:fs[0]});
              done(ok, `${N(n)} = ${label(id,fs[0])}${fs.length>1?` (also: ${fs.slice(1).map(f=>label(id,f)).join(', ')})`:''}${!c.alt&&fs.includes(s.f)&&s.f!==fs[0]?' — yours works too, but alternates are off.':''}`); }); }}; }});
  }
})();
