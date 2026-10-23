// Analysis engine: MIDI / MusicXML / MXL parsing, Krumhansl–Schmuckler key finding, chord + Roman numeral labeling, cadences, modulations.
const AN = (() => {
  // ---------- MIDI ----------
  function parseMidi(buf){ const d=new DataView(buf); let p=0; const str=n=>{ let s=''; for(let i=0;i<n;i++) s+=String.fromCharCode(d.getUint8(p+i)); return s; };
    if(str(4)!=='MThd') throw 'Not a MIDI file'; const hlen=d.getUint32(4); const ntr=d.getUint16(10); const div=d.getUint16(12); if(div&0x8000) throw 'SMPTE-timed MIDI isn’t supported'; p=8+hlen;
    const notes=[]; let ts=[4,4], keySig=null, title='';
    for(let t=0;t<ntr && p<d.byteLength;t++){ if(str(4)!=='MTrk'){ break; } const len=d.getUint32(p+4); let q=p+8; const end=q+len; let tick=0, run=0; const open={};
      const vlq=()=>{ let v=0,b; do{ b=d.getUint8(q++); v=(v<<7)|(b&0x7f); }while(b&0x80); return v; };
      while(q<end){ tick+=vlq(); let st=d.getUint8(q); if(st<0x80){ st=run; } else { q++; if(st<0xf0) run=st; }
        if(st===0xff){ const type=d.getUint8(q++); const l=vlq(); if(type===0x58){ ts=[d.getUint8(q),Math.pow(2,d.getUint8(q+1))]; } else if(type===0x59){ keySig={sf:d.getInt8(q),minor:d.getUint8(q+1)===1}; } else if(type===0x03&&!title){ for(let i=0;i<l;i++) title+=String.fromCharCode(d.getUint8(q+i)); } q+=l; continue; }
        if(st===0xf0||st===0xf7){ const l=vlq(); q+=l; continue; }
        const hi=st&0xf0, ch=st&0x0f; const a=d.getUint8(q++); const b=(hi===0xc0||hi===0xd0)?0:d.getUint8(q++);
        if(ch===9) continue; const k=ch*128+a;
        if(hi===0x90&&b>0){ (open[k]=open[k]||[]).push(tick); }
        else if(hi===0x80||(hi===0x90&&b===0)){ const s=open[k]&&open[k].shift(); if(s!=null) notes.push({start:s/div,dur:(tick-s)/div,midi:a}); } }
      p=end; }
    notes.sort((a,b)=>a.start-b.start||a.midi-b.midi); return {notes, ts, keySig, title:title.trim(), measureLen:ts[0]*4/ts[1]}; }
  // ---------- MusicXML ----------
  function parseXml(text){ const doc=new DOMParser().parseFromString(text,'application/xml'); if(doc.querySelector('parsererror')) throw 'Could not parse the XML';
    const parts=[...doc.querySelectorAll('part')]; if(!parts.length) throw 'No <part> found — is this MusicXML (partwise)?'; const notes=[]; let ts=null, keySig=null; const measureStarts=[];
    const title=(doc.querySelector('work-title')||doc.querySelector('movement-title')||{}).textContent||'';
    const STEP={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
    parts.forEach((part,pi)=>{ let divs=1, cur=0, lastStart=0;
      [...part.querySelectorAll(':scope > measure')].forEach((m,mi)=>{ if(pi===0) measureStarts.push(cur);
        for(const el of m.children){ const tag=el.tagName;
          if(tag==='attributes'){ const dv=el.querySelector('divisions'); if(dv) divs=+dv.textContent; const tm=el.querySelector('time'); if(tm&&!ts) ts=[+tm.querySelector('beats').textContent,+tm.querySelector('beat-type').textContent]; const ky=el.querySelector('key fifths'); if(ky&&!keySig) keySig={sf:+ky.textContent,minor:((el.querySelector('key mode')||{}).textContent||'')==='minor'}; }
          else if(tag==='backup'){ cur-=(+el.querySelector('duration').textContent)/divs; }
          else if(tag==='forward'){ cur+=(+el.querySelector('duration').textContent)/divs; }
          else if(tag==='note'){ if(el.querySelector('grace')) continue; const durEl=el.querySelector('duration'); const dur=durEl?(+durEl.textContent)/divs:0; const isChord=!!el.querySelector('chord'); const start=isChord?lastStart:cur;
            const pitch=el.querySelector('pitch'); if(pitch && dur>0){ const step=pitch.querySelector('step').textContent, alt=+((pitch.querySelector('alter')||{}).textContent||0), oct=+pitch.querySelector('octave').textContent; notes.push({start,dur,midi:12*(oct+1)+STEP[step]+alt}); }
            if(!isChord){ lastStart=cur; cur+=dur; } } } }); });
    ts=ts||[4,4]; notes.sort((a,b)=>a.start-b.start||a.midi-b.midi); return {notes, ts, keySig, title, measureStarts, measureLen:ts[0]*4/ts[1]}; }
  async function unzipXml(buf){ const d=new DataView(buf); let e=-1; for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-66000);i--){ if(d.getUint32(i,true)===0x06054b50){ e=i; break; } } if(e<0) throw 'Not a valid .mxl (zip) file';
    const cnt=d.getUint16(e+10,true); let off=d.getUint32(e+16,true); const ents=[]; const dec=new TextDecoder();
    for(let k=0;k<cnt;k++){ const method=d.getUint16(off+10,true), csize=d.getUint32(off+20,true), nlen=d.getUint16(off+28,true), xlen=d.getUint16(off+30,true), clen=d.getUint16(off+32,true), lho=d.getUint32(off+42,true); const name=dec.decode(new Uint8Array(buf,off+46,nlen)); ents.push({name,method,csize,lho}); off+=46+nlen+xlen+clen; }
    const read=async en=>{ const ln=d.getUint16(en.lho+26,true), lx=d.getUint16(en.lho+28,true); const data=new Uint8Array(buf,en.lho+30+ln+lx,en.csize); if(en.method===0) return dec.decode(data); if(en.method!==8) throw 'Unsupported zip compression';
      if(typeof DecompressionStream==='undefined') throw 'This browser can’t unzip .mxl — export uncompressed .musicxml instead'; const ds=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return await new Response(ds).text(); };
    let target=null; const cont=ents.find(x=>x.name==='META-INF/container.xml'); if(cont){ const cx=await read(cont); const m=/full-path="([^"]+)"/.exec(cx); if(m) target=ents.find(x=>x.name===m[1]); }
    if(!target) target=ents.find(x=>/\.(xml|musicxml)$/i.test(x.name)&&!x.name.startsWith('META-INF')); if(!target) throw 'No score inside the .mxl'; return await read(target); }
  // ---------- key finding ----------
  const KMAJ=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88], KMIN=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
  const corr=(x,y)=>{ const mx=x.reduce((a,b)=>a+b)/12, my=y.reduce((a,b)=>a+b)/12; let n=0,dx=0,dy=0; for(let i=0;i<12;i++){ n+=(x[i]-mx)*(y[i]-my); dx+=(x[i]-mx)**2; dy+=(y[i]-my)**2; } return dx&&dy? n/Math.sqrt(dx*dy):0; };
  function hist(notes,a=-Infinity,b=Infinity){ const h=Array(12).fill(0); for(const n of notes){ const s=Math.max(a,n.start), e=Math.min(b,n.start+n.dur); if(e>s) h[n.midi%12]+=e-s; } return h; }
  function keys(h){ const out=[]; for(let t=0;t<12;t++){ const rot=i=>h[(i+t)%12]; const hr=Array.from({length:12},(_,i)=>rot(i)); out.push({tonic:t,minor:false,r:corr(hr,KMAJ)}); out.push({tonic:t,minor:true,r:corr(hr,KMIN)}); } return out.sort((a,b)=>b.r-a.r); }
  const FLATKEYS=new Set([5,10,3,8,1,6]); // F Bb Eb Ab Db Gb majors prefer flats
  const keyName=k=>{ const names=(k.minor? [0,5,7,10,3,8].includes(k.tonic) : FLATKEYS.has(k.tonic))? ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B']:['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']; let n=names[k.tonic]; if(!k.minor&&k.tonic===6) n='G♭'; if(k.minor&&k.tonic===3) n='E♭'; if(k.minor&&k.tonic===8) n='G♯'; if(k.minor&&k.tonic===1) n='C♯'; if(k.minor&&k.tonic===6) n='F♯'; return n+(k.minor?' minor':' major'); };
  // ---------- chords ----------
  const TEMPL={maj:[0,4,7],min:[0,3,7],dim:[0,3,6],aug:[0,4,8],dom7:[0,4,7,10],maj7:[0,4,7,11],min7:[0,3,7,10],hdim7:[0,3,6,10],dim7:[0,3,6,9]};
  function bestChord(h,bassPc){ const tot=h.reduce((a,b)=>a+b,0); if(tot<1e-6) return null; let best=null;
    for(let r=0;r<12;r++) for(const [t,iv] of Object.entries(TEMPL)){ const pcs=iv.map(x=>(x+r)%12); let inn=0; pcs.forEach(p=>inn+=h[p]); const out=tot-inn; const missing=pcs.filter(p=>h[p]<tot*0.04).length;
      let sc=inn-0.8*out-missing*tot*0.22+(bassPc===r?0.25*tot:0)-(iv.length===4?0.06*tot:0)-(t==='aug'?0.1*tot:0); if(!best||sc>best.sc) best={root:r,type:t,sc,pcs}; }
    return best; }
  const DEG=['I','♭II','II','♭III','III','IV','♯IV','V','♭VI','VI','♭VII','VII'];
  const MIN_DEG=['i','♭ii','ii','♭iii','iii','iv','♯iv','v','♭vi','vi','♭vii','vii'];
  function roman(ch,key,bassPc,next){ if(!ch) return ''; const off=(ch.root-key.tonic+12)%12; const minorQ=['min','dim','min7','hdim7','dim7'].includes(ch.type);
    // diatonic sets
    const dia=key.minor? {0:['min','min7'],2:['dim','hdim7'],3:['maj','maj7','aug'],5:['min','min7','maj'],7:['maj','dom7','min'],8:['maj','maj7'],10:['maj','dom7'],11:['dim','dim7']} : {0:['maj','maj7'],2:['min','min7'],4:['min','min7'],5:['maj','maj7'],7:['maj','dom7'],9:['min','min7'],11:['dim','hdim7']};
    const isDia=dia[off]&&dia[off].includes(ch.type);
    let base=(minorQ?MIN_DEG:DEG)[off]; if(key.minor){ base=base.replace('♭III','III').replace('♭VI','VI').replace('♭VII','VII').replace('♭iii','iii').replace('♭vi','vi').replace('♭vii','vii'); if(off===11) base=minorQ?'vii':'VII'; }
    const suf={maj:'',min:'',dim:'°',aug:'+',dom7:'7',maj7:'maj7',min7:'7',hdim7:'ø7',dim7:'°7'}[ch.type];
    const inv=(()=>{ const i=ch.pcs.indexOf(bassPc); if(i<=0) return ''; return ch.pcs.length===4? ['','6/5','4/3','4/2'][i] : ['','6','6/4'][i]; })();
    let fig = inv? (suf.includes('7')? suf.replace('7','')+inv : suf+inv) : suf;
    if(!isDia && (ch.type==='maj'||ch.type==='dom7') && next){ const tgtOff=(next.root-key.tonic+12)%12; if((ch.root+5)%12===next.root && tgtOff!==0){ const nb=(['min','dim','min7','hdim7','dim7'].includes(next.type)?MIN_DEG:DEG)[tgtOff]; return {rn:'V'+fig+'/'+nb, note:`secondary dominant: tonicizes ${nb}`}; } }
    if(!isDia && (ch.type==='dim7'||ch.type==='dim') && next && (ch.root+1)%12===next.root && ((next.root-key.tonic+12)%12)!==0){ const tgtOff=(next.root-key.tonic+12)%12; const nb=(['min','dim','min7'].includes(next.type)?MIN_DEG:DEG)[tgtOff]; return {rn:'vii'+fig+'/'+nb, note:'secondary leading-tone chord'}; }
    if(!isDia && off===1 && ch.type==='maj') return {rn:'N'+(inv||''), note:'Neapolitan (♭II)'};
    if(!isDia && !key.minor && ['min','maj','dim','hdim7','dom7','maj7'].includes(ch.type) && [5,8,10,3,2].includes(off)) return {rn:base+fig, note:'modal mixture (borrowed from the parallel minor)'};
    return {rn:base+fig, note:isDia?'':'chromatic chord'}; }
  // ---------- full analysis ----------
  function analyze(score){ const {notes}=score; if(!notes.length) throw 'No notes found'; const end=Math.max(...notes.map(n=>n.start+n.dur)); const mlen=score.measureLen||4;
    const global=keys(hist(notes))[0];
    const nM=Math.ceil(end/mlen-1e-6); const mk=[]; for(let m=0;m<nM;m++){ const k=keys(hist(notes,(m-1.5)*mlen,(m+2.5)*mlen)); mk.push(k[0]); }
    // smooth: replace runs shorter than 2 measures with neighbor; prefer global key on ties
    let runs=[]; mk.forEach((k,m)=>{ const id=k.tonic+(k.minor?'m':''); if(runs.length&&runs[runs.length-1].id===id) runs[runs.length-1].to=m; else runs.push({id,k,from:m,to:m}); });
    let changed=true; while(changed && runs.length>1){ changed=false; for(let i=0;i<runs.length;i++){ const r=runs[i]; if(r.to-r.from+1<2){ const nb=runs[i-1]||runs[i+1]; nb.from=Math.min(nb.from,r.from); nb.to=Math.max(nb.to,r.to); runs.splice(i,1); changed=true; break; } }
      for(let i=1;i<runs.length;i++) if(runs[i].id===runs[i-1].id){ runs[i-1].to=runs[i].to; runs.splice(i,1); changed=true; break; } }
    const keyAt=m=>{ const r=runs.find(r=>m>=r.from&&m<=r.to)||runs[0]; return r.k; };
    // beat segments
    const beat=(score.ts&&score.ts[1]===8&&score.ts[0]%3===0)?1.5:1; const segs=[];
    for(let t=0;t<end-1e-6;t+=beat){ const h=hist(notes,t,t+beat); const sounding=notes.filter(n=>n.start<t+beat&&n.start+n.dur>t); const bass=sounding.length?Math.min(...sounding.map(n=>n.midi))%12:null; const top=sounding.length?Math.max(...sounding.map(n=>n.midi)):null;
      segs.push({t,ch:bestChord(h,bass),bass,top,m:Math.floor(t/mlen+1e-6)}); }
    // merge identical consecutive chords within same measure
    const merged=[]; for(const s of segs){ const L=merged[merged.length-1]; if(L&&s.ch&&L.ch&&L.ch.root===s.ch.root&&L.ch.type===s.ch.type&&L.bass===s.bass){ L.dur+=beat; L.top=s.top; } else merged.push({...s,dur:beat}); }
    merged.forEach((s,i)=>{ const k=keyAt(s.m); const nx=merged.slice(i+1).find(x=>x.ch); const r=s.ch?roman(s.ch,k,s.bass,nx&&nx.ch):null; s.key=k; s.rn=r?r.rn:'—'; s.note=r?r.note:'rest'; s.name=s.ch?T.PC_NAMES_SHARP[s.ch.root]+T.CHORDS[s.ch.type].sym+(s.bass!=null&&s.bass!==s.ch.root?'/'+T.PC_NAMES_SHARP[s.bass]:''):'—'; });
    // cadences
    const cad=[]; for(let i=0;i<merged.length-1;i++){ const a=merged[i], b=merged[i+1]; if(!a.ch||!b.ch) continue; const k=b.key; const ao=(a.ch.root-k.tonic+12)%12, bo=(b.ch.root-k.tonic+12)%12; const strong=(b.dur>=2*beat)||Math.abs((b.t/mlen)%1)<1e-6;
      const aDom=ao===7&&['maj','dom7'].includes(a.ch.type); const bTon=bo===0&&(k.minor?['min','maj']:['maj','maj7']).includes(b.ch.type);
      if(aDom&&bTon&&strong){ const rootPos=a.bass===a.ch.root&&b.bass===b.ch.root; const pac=rootPos&&b.top%12===k.tonic; cad.push({i:i+1,type:pac?'PAC (perfect authentic)':'IAC (imperfect authentic)',m:b.m,why:pac?'V→I, both root position, tonic in the top voice':'V→I but an inversion or 3̂/5̂ on top'}); }
      else if(aDom&&bo===(k.minor?8:9)&&strong) cad.push({i:i+1,type:'deceptive',m:b.m,why:'V→vi (VI in minor): expected tonic replaced'});
      else if(ao===5&&bTon&&b.dur>=2*beat) cad.push({i:i+1,type:'plagal',m:b.m,why:'IV→I'});
      else if(aDom&&a.dur>=2*beat&&!bTon&&b.m>a.m) cad.push({i,type:'half (likely)',m:a.m,why:'phrase pauses on a long V'}); }
    if(merged.length){ const L=[...merged].reverse().find(x=>x.ch); if(L&&(L.ch.root-L.key.tonic+12)%12===7&&!cad.find(c=>c.i===merged.indexOf(L))) cad.push({i:merged.indexOf(L),type:'half (ends on V)',m:L.m,why:'piece/excerpt ends on the dominant'}); }
    // modulations with pivot candidates
    const mods=[]; for(let i=1;i<runs.length;i++){ const from=runs[i-1].k, to=runs[i].k; const around=merged.filter(s=>s.ch&&s.m>=runs[i].from-2&&s.m<=runs[i].from); const piv=around.filter(s=>{ const r1=roman(s.ch,from,s.bass,null), r2=roman(s.ch,to,s.bass,null); return r1.note===''&&r2.note===''; }).map(s=>`${s.name} (${roman(s.ch,from,s.bass,null).rn} in ${keyName(from)} = ${roman(s.ch,to,s.bass,null).rn} in ${keyName(to)})`);
      mods.push({m:runs[i].from,from,to,pivot:piv.slice(-2)}); }
    const fileKey= score.keySig? (()=>{ const sf=score.keySig.sf; const maj=T.mod(7*sf,12); return keyName({tonic:score.keySig.minor?T.mod(maj+9,12):maj,minor:score.keySig.minor}); })() : null;
    return {global,runs,segs:merged,cad,mods,end,mlen,nM,fileKey,score}; }
  // ---------- MIDI writer (for samples / export) ----------
  function writeMidi(notes,bpm=90){ const ppq=480; const ev=[]; notes.forEach(n=>{ ev.push([Math.round(n.start*ppq),0x90,n.midi,80]); ev.push([Math.round((n.start+n.dur)*ppq),0x80,n.midi,0]); }); ev.sort((a,b)=>a[0]-b[0]||(a[1]-b[1]));
    const bytes=[]; const vlq=v=>{ const s=[v&0x7f]; while(v>>=7) s.unshift((v&0x7f)|0x80); bytes.push(...s); }; const tempo=Math.round(60e6/bpm); vlq(0); bytes.push(0xff,0x51,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255); vlq(0); bytes.push(0xff,0x58,4,4,2,24,8);
    let last=0; ev.forEach(e=>{ vlq(e[0]-last); last=e[0]; bytes.push(e[1],e[2],e[3]); }); vlq(0); bytes.push(0xff,0x2f,0);
    const hdr=[0x4d,0x54,0x68,0x64,0,0,0,6,0,0,0,1,ppq>>8,ppq&255,0x4d,0x54,0x72,0x6b,(bytes.length>>>24)&255,(bytes.length>>16)&255,(bytes.length>>8)&255,bytes.length&255]; return new Uint8Array([...hdr,...bytes]); }
  return {parseMidi,parseXml,unzipXml,analyze,keyName,writeMidi};
})();
// Sample: a short chorale-style phrase in C that modulates to G (pivot Am = vi in C / ii in G) and cadences.
const AN_SAMPLE = (()=>{ const ch=['C5 G4 E4 C3','C5 A4 F4 F3','B4 G4 D4 G3','C5 G4 E4 C3', 'C5 A4 E4 A2','D5 A4 F#4 D3','D5 B4 G4 G2','D5 B4 G4 G3', 'C5 A4 E4 A3','B4 G4 D4 G3','A4 F#4 D4 D3','A4 F#4 C4 D3','G4 D4 B3 G2','G4 D4 B3 G2', 'G4 E4 C4 C3','A4 F4 C4 F3','G4 F4 B3 G3','G4 E4 C4 C3','A4 E4 C4 A2','A4 F4 D4 D3','G4 F4 B3 G2','E4 C4 G3 C3','E4 C4 G3 C3'];
  const notes=[]; ch.forEach((c,i)=>c.split(' ').forEach(s=>notes.push({start:i*2,dur:2,midi:T.midi(T.parse(s))}))); return {notes,ts:[4,4],keySig:{sf:0,minor:false},title:'Sample: chorale-style phrase, C → G → C',measureLen:4}; })();
routes.analyze = v => {
  v.innerHTML = `<h2>Analysis engine</h2><p class="muted">Upload a <b>MIDI</b> (.mid) or <b>MusicXML</b> (.musicxml, .xml, .mxl) file — e.g. a Bach chorale exported from MuseScore or downloaded from a score site. I detect key (Krumhansl–Schmuckler), chords and Roman numerals per beat, cadences and likely modulations.</p>
   <div class="card"><label class="btn big">Choose file<input type="file" id="af" hidden accept=".mid,.midi,.xml,.musicxml,.mxl"></label> <button class="btn ghost" id="asample">Try the built-in sample</button>
   <p class="muted">PDF scores and audio recordings: <b>coming soon</b> (they need optical music recognition / transcription, which isn’t built yet). Algorithmic labels are good guesses, not gospel — check them against your ear.</p></div><div id="aout"></div>`;
  const show=score=>{ let R; try{ R=AN.analyze(score); }catch(e){ $('#aout').innerHTML=`<div class="issue">${esc(e)}</div>`; return; } grantAch('analyst');
    const kn=AN.keyName; const out=$('#aout'); const mlab=m=>`m.${m+1}`;
    out.innerHTML=`<div class="card"><h3>${esc(score.title||'Your score')}</h3><p><b>Key: ${kn(R.global)}</b> (correlation ${R.global.r.toFixed(2)})${R.fileKey?` · key signature in the file: ${R.fileKey}`:''} · ${score.ts.join('/')} · ${R.nM} measures · ${score.notes.length} notes <button class="play sm" id="aplay">▶︎ play</button> <button class="btn ghost sm" id="astop">stop</button></p>
      <p><b>Key areas:</b> ${R.runs.map(r=>`${kn(r.k)} (${mlab(r.from)}–${mlab(r.to)})`).join(' → ')}</p>
      ${R.mods.length?R.mods.map(x=>`<div class="issue w">↪︎ Likely modulation at ${mlab(x.m)}: ${kn(x.from)} → ${kn(x.to)}${x.pivot.length?`. Pivot candidate: ${x.pivot.join('; ')}`:''}</div>`).join(''):'<p class="muted">No modulation detected (stays in one key area).</p>'}
      <h3>Cadences</h3>${R.cad.length?R.cad.map(c=>`<div class="issue ok">${mlab(c.m)}: <b>${c.type}</b> — ${c.why}</div>`).join(''):'<p class="muted">No clear cadences detected.</p>'}</div>
      <div class="card"><h3>Piano roll</h3><div style="overflow-x:auto"><canvas id="roll" height="220"></canvas></div></div>
      <div class="card"><h3>Harmony, beat by beat</h3><div style="overflow-x:auto"><table class="an"><tr><th>where</th><th>chord</th><th>Roman</th><th>key</th><th>note</th></tr>${R.segs.map(s=>`<tr><td>${mlab(s.m)} b.${Math.round((s.t%R.mlen)+1)}</td><td>${s.name}</td><td><b>${s.rn}</b></td><td>${s.key?kn(s.key).replace(' major','').replace(' minor','m'):''}</td><td class="muted">${s.note}</td></tr>`).join('')}</table></div></div>`;
    const cv=$('#roll'); const px=40; const lo=Math.min(...score.notes.map(n=>n.midi)), hi=Math.max(...score.notes.map(n=>n.midi)); cv.width=Math.min(16000,R.end*px+20); cv.style.width=cv.width/1+'px'; const H=cv.height, rowH=Math.max(2,(H-30)/(hi-lo+1)); const g=cv.getContext('2d'); g.fillStyle='#0b0e14'; g.fillRect(0,0,cv.width,H);
    for(let m=0;m<=R.nM;m++){ g.fillStyle='#30363d'; g.fillRect(m*R.mlen*px,0,1,H); g.fillStyle='#8b949e'; g.font='10px sans-serif'; g.fillText(m+1,m*R.mlen*px+2,10); }
    score.notes.forEach(n=>{ g.fillStyle='#7aa2ff'; g.fillRect(n.start*px,H-20-(n.midi-lo+1)*rowH,Math.max(2,n.dur*px-1),rowH-0.5); });
    R.segs.forEach(s=>{ if(!s.ch) return; g.fillStyle='#c792ea'; g.font='11px sans-serif'; g.fillText(s.rn,s.t*px+2,H-5); });
    let stopAt=0; $('#aplay').onclick=()=>{ const t0=0; score.notes.slice(0,3000).forEach(n=>{ if(n.start<240) Audio.playMidi(n.midi,n.start*0.6,Math.min(3,n.dur*0.6),0.5); }); };
    $('#astop').onclick=()=>Audio.stopAll(); };
  $('#asample').onclick=()=>show(AN_SAMPLE);
  $('#af').onchange=async e=>{ const f=e.target.files[0]; if(!f) return; $('#aout').innerHTML='<p class="muted">Analyzing…</p>'; try{ const buf=await f.arrayBuffer(); let score;
      if(/\.midi?$/i.test(f.name)) score=AN.parseMidi(buf); else if(/\.mxl$/i.test(f.name)) score=AN.parseXml(await AN.unzipXml(buf)); else score=AN.parseXml(new TextDecoder().decode(buf));
      if(!score.title) score.title=f.name; show(score); }catch(err){ $('#aout').innerHTML=`<div class="issue">Couldn’t read that file: ${esc(err.message||err)}</div>`; } };
};
window.MORE_TILES=(window.MORE_TILES||[]).concat([['#analyze','🔬 Analysis engine','upload MIDI / MusicXML → key, chords, Roman numerals, cadences']]);
