// Voice-leading & counterpoint checker.
const VL = (() => {
  const VOICES=['Soprano','Alto','Tenor','Bass'];
  const RANGE={Soprano:[60,79],Alto:[55,74],Tenor:[48,67],Bass:[40,60]};
  const nn = n => T.name(n,true);
  function parse(text){ const lines=text.split(/\n|\|/).map(l=>l.trim()).filter(Boolean); const chords=[];
    for(const [i,l] of lines.entries()){ const toks=l.split(/[\s,]+/).filter(Boolean); const notes=toks.map(t=>T.parse(t)); const bad=toks.find((t,k)=>!notes[k]); if(bad) throw `Chord ${i+1}: can't read "${bad}" (use e.g. F#4, Bb3)`; chords.push(notes); }
    if(!chords.length) throw 'Enter at least two chords.'; const n=chords[0].length; if(chords.some(c=>c.length!==n)) throw 'Every line needs the same number of notes (4 for SATB, 2 for counterpoint).';
    if(n!==4 && n!==2) throw 'Use 4 notes per line (S A T B) or 2 (upper, lower).'; return chords; }
  function chordInfo(ch, key){ const ms=ch.map(T.midi); const pcs=ms.map(m=>m%12); const ids=T.identify(pcs); const bass=Math.min(...ms)%12; let id=ids.find(x=>x.rootPc===bass)||ids[0];
    if(!id){ const u=[...new Set(pcs)]; for(const r of u){ const rel=u.map(p=>T.mod(p-r,12)).sort((a,b)=>a-b).join(); const t={'0,4':'maj','0,3':'min','0,4,10':'dom7','0,3,10':'min7','0,4,11':'maj7'}[rel]; if(t && r===bass){ id={rootPc:r,type:t,incomplete:true}; break; } } }
    let roman=''; if(id&&key){ const dia=T.diatonic(key.tonic,key.mode,true); const tri=T.diatonic(key.tonic,key.mode,false);
      const deg=tri.findIndex(c=>T.pc(c.notes[0])===id.rootPc); const isSev=['dom7','maj7','min7','hdim7','dim7','minmaj7'].includes(id.type);
      if(deg>=0){ const exp=isSev?dia[deg]:tri[deg]; const want=isSev?exp.quality:exp.quality; if(want===id.type) roman=exp.roman; }
      if(!roman && (id.type==='maj'||id.type==='dom7')){ const tgt=tri.findIndex(c=>T.pc(c.notes[0])===(id.rootPc+5)%12); if(tgt>0) roman=(id.type==='dom7'?'V7':'V')+'/'+tri[tgt].roman.replace(/[°+7ø]/g,''); }
      if(roman){ const inv=[...new Set(pcs)].length; const chordPcs=[0,...T.CHORDS[id.type].iv.map(c=>T.mod(T.midi(T.up(T.note(0,0,4),c))-60,12))].map(x=>(x+id.rootPc)%12); const bi=chordPcs.indexOf(bass);
        if(bi>0){ roman = isSev? roman.replace('7','')+['','6/5','4/3','4/2'][bi] : roman+['','6','6/4'][bi]; } } }
    return {ms,pcs,id,roman,name:id?T.PC_NAMES_SHARP[id.rootPc]+T.CHORDS[id.type].sym+(id.rootPc!==bass?'/'+T.PC_NAMES_SHARP[bass]:'')+(id.incomplete?' (no 5th)':''):'?'}; }
  function check(chords, key){
    const four=chords[0].length===4; const names=four?VOICES:['Upper voice','Lower voice']; const issues=[]; const info=chords.map(c=>chordInfo(c,key));
    const add=(sev,i,msg,fix)=>issues.push({sev,i,msg:msg+(fix?' '+fix:'')});
    const lt = key? (T.pc(key.tonic)+11)%12 : null;
    chords.forEach((ch,i)=>{ const ms=info[i].ms; const where=`(chord ${i+1})`;
      for(let v=0;v<ms.length-1;v++) if(ms[v]<ms[v+1]) add('err',i,`Voice crossing: ${names[v+1]} (${nn(ch[v+1])}) is above ${names[v]} (${nn(ch[v])}) ${where}.`,'Keep voices in order top to bottom.');
      if(four){ if(ms[0]-ms[1]>12) add('err',i,`Spacing: Soprano and Alto are more than an octave apart ${where}.`,'Move the alto up or soprano down.');
        if(ms[1]-ms[2]>12) add('err',i,`Spacing: Alto and Tenor are more than an octave apart ${where}.`,'Keep upper voices within an octave of each other.');
        VOICES.forEach((vn,v)=>{ const [lo,hi]=RANGE[vn]; if(ms[v]<lo||ms[v]>hi) add('warn',i,`Range: ${vn} ${nn(ch[v])} is outside the usual ${vn.toLowerCase()} range (${T.PC_NAMES_SHARP[lo%12]}${Math.floor(lo/12)-1}–${T.PC_NAMES_SHARP[hi%12]}${Math.floor(hi/12)-1}) ${where}.`); });
        const id=info[i].id; if(id && ['maj','min','dim','aug'].includes(id.type)){ const third=(id.rootPc+(id.type==='maj'||id.type==='aug'?4:3))%12; if(!info[i].pcs.includes(third)) add('warn',i,`Missing 3rd in ${info[i].name} ${where}.`,'The 3rd defines the chord quality; don’t omit it.'); }
        if(lt!==null && info[i].pcs.filter(p=>p===lt).length>1) add('err',i,`Doubled leading tone (${T.PC_NAMES_SHARP[lt]}) ${where}.`,'Double the root instead.');
        if(!id) add('warn',i,`Chord ${i+1} isn’t a standard triad/7th (${[...new Set(info[i].pcs)].map(p=>T.PC_NAMES_SHARP[p]).join(' ')}).`);
      } else { const iv=T.mod(ms[0]-ms[1],12); const cons=[0,3,4,7,8,9]; if(!cons.includes(iv)) add('err',i,`Dissonance: ${T.intervalName(T.intervalBetween(ch[1],ch[0]))} between the voices ${where}.`,'In first species every interval must be consonant (P1, 3, P5, 6, P8).'); }
    });
    for(let i=0;i<chords.length-1;i++){ const a=info[i].ms, b=info[i+1].ms; const where=`(chord ${i+1} → ${i+2})`;
      for(let x=0;x<a.length;x++) for(let y=x+1;y<a.length;y++){ const i1=T.mod(a[x]-a[y],12), i2=T.mod(b[x]-b[y],12); const mx=b[x]-a[x], my=b[y]-a[y];
        if(mx===0&&my===0) continue; const same=Math.sign(mx)===Math.sign(my)&&mx!==0&&my!==0;
        if(i1===7&&i2===7&&same) add('err',i+1,`Parallel fifths between ${names[x]} and ${names[y]} ${where}.`,'Consider contrary or oblique motion.');
        else if(i1===0&&i2===0&&same) add('err',i+1,`Parallel ${a[x]-a[y]===0?'unisons':'octaves'} between ${names[x]} and ${names[y]} ${where}.`,'Consider contrary motion, or change the doubling.');
        else if(i1===7&&i2===7&&!same&&mx*my<0) add('warn',i+1,`Contrary fifths between ${names[x]} and ${names[y]} ${where}.`,'Usually avoided in strict style.');
        else if(i1===0&&i2===0&&mx*my<0) add('warn',i+1,`Contrary octaves between ${names[x]} and ${names[y]} ${where}.`,'Acceptable at cadences in some styles; avoid in strict writing.');
        const outer = x===0 && y===a.length-1;
        if(outer && same && (i2===7||i2===0) && !(i1===i2) && Math.abs(mx)>2) add('warn',i+1,`Hidden (direct) ${i2===7?'fifth':'octave'} in the outer voices ${where}: similar motion into a perfect interval with a soprano leap.`,'Move the soprano by step or use contrary motion.');
      }
      for(let v=0;v<a.length;v++){ const lp=Math.abs(b[v]-a[v]); const iv=T.intervalBetween(...(b[v]>=a[v]?[chords[i][v],chords[i+1][v]]:[chords[i+1][v],chords[i][v]]));
        if(lp>12) add('warn',i+1,`${names[v]} leaps more than an octave ${where}.`); else if(iv.q==='A'||iv.q==='AA') add('err',i+1,`${names[v]} moves by an augmented interval (${T.intervalName(iv)}) ${where}.`,'Avoid augmented melodic leaps (e.g. the A2 in harmonic minor).');
        if(four && v>0 && b[v]>a[v-1]) add('warn',i+1,`Overlap: ${names[v]} moves above where ${names[v-1]} just was ${where}.`);
        if(four && v<3 && b[v]<a[v+1]) add('warn',i+1,`Overlap: ${names[v]} moves below where ${names[v+1]} just was ${where}.`);
      }
      // leading tone and chord 7th
      const id=info[i].id; if(four && id){ const sev=['dom7','hdim7','dim7','min7','maj7'].includes(id.type); if(sev){ const sevPc=(id.rootPc+{dom7:10,hdim7:10,dim7:9,min7:10,maj7:11}[id.type])%12; a.forEach((m,v)=>{ if(m%12===sevPc){ const d=b[v]-m; if(d===0) add('warn',i+1,`The chord 7th (${T.PC_NAMES_SHARP[sevPc]}) in the ${names[v]} is held into chord ${i+2} ${where}.`,'Fine if the next chord keeps it as a common tone and it resolves down after.'); else if(!(d===-1||d===-2)) add('err',i+1,`Unresolved 7th: ${names[v]} has the chord 7th (${T.PC_NAMES_SHARP[sevPc]}) and moves ${d>0?'up':'down'} ${Math.abs(d)} semitones ${where}.`,'Chord 7ths resolve down by step.'); } }); }
        if(lt!==null){ const isDom=(id.rootPc===(T.pc(key.tonic)+7)%12)||(id.rootPc===lt); const nid=info[i+1].id; const toTonic=nid && (nid.rootPc===T.pc(key.tonic) || nid.rootPc===(T.pc(key.tonic)+9)%12);
          if(isDom && toTonic) a.forEach((m,v)=>{ if(m%12===lt && b[v]-m!==1){ if(v===0||v===3) add('err',i+1,`Unresolved leading tone in the ${names[v]} (${T.PC_NAMES_SHARP[lt]}) ${where}.`,'In an outer voice the leading tone must rise to the tonic.'); else add('warn',i+1,`Leading tone in the ${names[v]} doesn’t resolve up ${where}.`,'Allowed in an inner voice (it may drop to 5̂ to complete the tonic chord), but resolving up is stronger.'); } }); } }
    }
    if(!four){ const f=info[0].ms, l=info[info.length-1].ms; if(![0,7].includes(T.mod(f[0]-f[1],12))) add('warn',0,'First species usually begins on a perfect consonance (P1, P5 or P8).'); if(T.mod(l[0]-l[1],12)!==0) add('warn',chords.length-1,'First species ends on a unison or octave.'); }
    return {issues,info};
  }
  return {parse,check};
})();
routes.check = v => {
  v.innerHTML = `<h2>Voice-leading checker</h2><p class="muted">One chord per line, notes top to bottom: <b>Soprano Alto Tenor Bass</b> (or 2 notes per line for two-voice counterpoint). Use # and b, octave numbers (middle C = C4).</p>
  <div class="card"><p>Key: <select id="vk"><option value="">(none)</option>${['C','G','D','A','E','F','Bb','Eb','Ab'].map(k=>`<option value="${k}:major">${T.pretty(k)} major</option>`).join('')}${['A','E','D','G','C','B','F#'].map(k=>`<option value="${k}:minor">${T.pretty(k)} minor</option>`).join('')}</select>
   <button class="btn ghost sm" data-p="good">Example: clean I–IV–V7–I</button> <button class="btn ghost sm" data-p="bad">Example: with mistakes</button> <button class="btn ghost sm" data-p="cp">Example: 2-voice</button></p>
   <textarea class="inp" id="vt" rows="6"></textarea><p><button class="btn big" id="vgo">Check</button></p></div><div id="vout"></div>`;
  const P={good:['C:major','E5 G4 C4 C3\nF5 A4 C4 F3\nD5 F4 B3 G3\nC5 E4 C4 C3'], bad:['C:major','G4 E4 C4 C3\nA4 F4 D4 D3\nB4 D4 G3 G2\nA4 E4 C4 C3'], cp:['','A4 D4\nD5 F4\nC5 E4\nB4 D4\nE5 G4\nD5 F4\nC5 A4\nB4 G4\nA4 F4\nC#5 E4\nD5 D4']};
  const load=k=>{ $('#vk').value=P[k][0]; $('#vt').value=P[k][1]; run(); };
  $$('[data-p]',v).forEach(b=>b.onclick=()=>load(b.dataset.p));
  function run(){ const out=$('#vout'); let chords; try{ chords=VL.parse($('#vt').value); }catch(e){ out.innerHTML=`<div class="issue">${esc(e)}</div>`; return; }
    const kv=$('#vk').value; const key=kv?{tonic:T.parse(kv.split(':')[0]+'4'),mode:kv.split(':')[1]}:null; const {issues,info}=VL.check(chords,key);
    const bad=new Set(issues.filter(x=>x.sev==='err').map(x=>x.i));
    const four=chords[0].length===4; const lab=i=>(info[i].roman||'')+(info[i].roman?' · ':'')+info[i].name;
    const up=chords.map((c,i)=>({notes:four?[c[0],c[1]]:[c[0]], label:'', color:bad.has(i)?'red':''})); const lo=chords.map((c,i)=>({notes:four?[c[2],c[3]]:[c[1]], label:four?lab(i):'', color:bad.has(i)?'red':''}));
    const fitClef=ns=>ns.every(n=>T.midi(n)>=55)?'treble':'bass';
    out.innerHTML = `<div class="card ex">${UI.staff(up,{clef:'treble',evW:70})}${UI.staff(lo,{clef:fitClef(chords.map(c=>c[c.length-1]))==='treble'&&!four?'treble':'bass',evW:70})}<button class="play sm" id="vplay">▶︎ play</button></div>
     <div class="card"><h3>${issues.filter(x=>x.sev==='err').length} errors · ${issues.filter(x=>x.sev==='warn').length} warnings</h3>${issues.length?issues.map(x=>`<div class="issue ${x.sev==='warn'?'w':''}">${x.sev==='err'?'❌':'⚠️'} ${x.msg}</div>`).join(''):'<div class="issue ok">✅ No voice-leading problems found. Clean writing!</div>'}</div>`;
    $('#vplay').onclick=()=>chords.forEach((c,i)=>Audio.chord(c.map(T.midi),i*1.1,1.05));
    if(!issues.some(x=>x.sev==='err') && four && chords.length>=3 && !Object.values(P).some(x=>x[1].trim()===$('#vt').value.trim())) grantAch('vl'); }
  $('#vgo').onclick=run; load('good');
};
window.MORE_TILES=(window.MORE_TILES||[]).concat([['#check','✍️ Voice-leading checker','SATB & counterpoint: parallels, crossings, resolutions']]);
