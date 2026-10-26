// Tools: piano + MIDI + chord namer, fretboard, visualizer, transposer.
const MIDI_IN = { listeners:new Set(), ok:false, async init(){ if(this.ok||!navigator.requestMIDIAccess) return this.ok; try{ const acc=await navigator.requestMIDIAccess(); const hook=()=>{ for(const inp of acc.inputs.values()) inp.onmidimessage=e=>{ const [st,n,vel]=e.data; const on=(st&0xf0)===0x90&&vel>0, off=(st&0xf0)===0x80||((st&0xf0)===0x90&&vel===0); if(on||off) this.listeners.forEach(f=>f(n,on,vel)); }; }; hook(); acc.onstatechange=hook; this.ok=true; this.count=acc.inputs.size; }catch(e){ this.ok=false; } return this.ok; } };
function chordId(midis){ const pcs=[...new Set(midis.map(m=>m%12))]; if(pcs.length<3) return null; const ids=T.identify(pcs); if(!ids.length) return null; const bass=Math.min(...midis)%12; return {ids,best:ids.find(x=>x.rootPc===bass)||ids[0],bass}; }
function chordName(midis){ const pcs=[...new Set(midis.map(m=>m%12))]; if(pcs.length<2) return pcs.length?T.spell.pc(pcs[0]):''; if(pcs.length===2){ const d=(pcs[1]-pcs[0]+12)%12; return 'interval: '+['unison','m2','M2','m3','M3','P4','tritone','P5','m6','M6','m7','M7'][d]+' (or its inversion)'; }
  const ci=chordId(midis); if(!ci) return 'pc set '+ '('+T.primeForm(pcs).map(T.pcLabel).join('')+')'+(T.forte(pcs)?' '+T.forte(pcs):''); const {ids,best,bass}=ci;
  const nmOf=x=>T.spell.root(x.rootPc,x.type)+T.CHORDS[x.type].sym; const bn=T.spell.chordNotes([bass],best.rootPc,best.type)[0];
  return nmOf(best)+(best.rootPc!==bass?'/'+bn:'')+(ids.length>1?'  (also '+ids.filter(x=>x!==best).map(nmOf).join(', ')+')':''); }
function spellMidis(ms){ const ci=chordId(ms); const names=ci?T.spell.chordNotes(ms,ci.best.rootPc,ci.best.type):ms.map(m=>T.spell.pc(m%12)); return ms.map((m,i)=>T.spell.midiName(m,names[i])); }
routes.tools = v => { const X=(window.EXTRA_TOOLS||[]).filter(x=>x[0]!=='#mt');
  const L=xs=>`<div class="grid">${xs.map(([h,t,d])=>`<a class="tile" href="${h}"><b>${t}</b><span>${d}</span></a>`).join('')}</div>`;
  v.innerHTML = `<h2>Tools</h2><h3 class="sec">Instruments</h3>${L([['#piano','🎹 Piano','play, name chords, MIDI'],['#fretboard','🎸 Fretboard','scales and chords on guitar/bass'],['#sing','🎤 Tuner','cents sharp or flat'],['#transposer','🎺 Transposer','concert ↔ trumpet, sax, horn']])}
  ${(window.CAD_TOOL_SECTIONS||[]).map(([s,xs])=>`<h3 class="sec">${s}</h3><div class="grid">${xs.map(([h,t,d,p])=>{ const lk=p&&!(window.CadPro&&CadPro.pro()); return `<a class="tile${lk?' locked':''}" href="${h}"><b>${t}${lk?' 🔒':''}</b><span>${d}</span></a>`; }).join('')}</div>`).join('')}
  <h3 class="sec">Theory</h3>${L([['#staffview','𝄞 Staff viewer','any scale or chord, notated'],['#viz','〰️ Waveform & spectrum','see a note’s overtones']].concat(X))}`; };
routes.piano = v => {
  v.innerHTML = `<a class="back" href="#tools">← Tools</a><h2>Piano</h2><div class="card"><div class="chordname" id="cn">Play some notes</div><div id="pz"></div><p class="muted" id="midistat">Tap keys, or connect a MIDI keyboard (Chrome/Edge on desktop; iOS Safari doesn’t support Web MIDI).</p>
   <p><button class="btn ghost sm" id="midi">Connect MIDI</button> <button class="btn ghost sm" id="clr">Clear</button> <label class="muted"><input type="checkbox" id="hold" checked> collect notes for chord naming</label></p></div>`;
  let held=new Set(); const pz=UI.piano($('#pz'),{from:48,to:84,onNote:m=>{ if($('#hold').checked){ held.has(m)?held.delete(m):held.add(m); } else held=new Set([m]); upd(); }});
  const upd=()=>{ pz.highlight(held); const ms=[...held].sort((a,b)=>a-b); $('#cn').textContent = ms.length? spellMidis(ms).join(' ')+'  →  '+chordName(ms) : 'Play some notes'; };
  $('#clr').onclick=()=>{ held.clear(); upd(); };
  const live=new Set(); const fn=(n,on)=>{ if(!document.body.contains($('#pz'))) return MIDI_IN.listeners.delete(fn); if(on){ Audio.playMidi(n,0,1); live.add(n);} else live.delete(n); held=new Set(live.size?live:held); upd(); };
  $('#midi').onclick=async()=>{ const ok=await MIDI_IN.init(); $('#midistat').textContent = ok? `MIDI ready (${MIDI_IN.count} input${MIDI_IN.count===1?'':'s'}). Play your keyboard.` : 'Web MIDI not available in this browser.'; if(ok) MIDI_IN.listeners.add(fn); };
};
const FB_SETS = Object.assign({}, Object.fromEntries(Object.entries(T.SCALES).map(([k,s])=>['scale:'+k,s.name])), Object.fromEntries(Object.entries(T.CHORDS).map(([k,c])=>['chord:'+k,c.name])));
routes.fretboard = v => {
  v.innerHTML = `<a class="back" href="#tools">← Tools</a><h2>Fretboard</h2><div class="card"><p><select id="fr">${['C','C♯/D♭','D','E♭/D♯','E','F','F♯/G♭','G','A♭/G♯','A','B♭/A♯','B'].map((n,i)=>`<option value="${i}" ${i===0?'selected':''}>${n}</option>`).join('')}</select>
   <select id="fs">${Object.entries(FB_SETS).map(([k,n])=>`<option value="${k}" ${k==='scale:major'?'selected':''}>${n}</option>`).join('')}</select>
   <select id="ft"><option value="40,45,50,55,59,64">Guitar (EADGBE)</option><option value="28,33,38,43">Bass (EADG)</option><option value="55,62,69,76">Violin (GDAE)</option><option value="67,60,64,69">Ukulele (gCEA)</option></select></p>
   <div class="fretwrap" id="fb"></div><p class="muted" id="fnotes"></p><div id="fstaff"></div></div>`;
  const draw=()=>{ const r=+$('#fr').value; const [kind,k]=$('#fs').value.split(':'); const minorish=kind==='chord'?T.spell.root(1,k)==='C♯':T.scale(T.parse('C4'),k).some(n=>T.name(n)==='E♭'); const root=T.parse((minorish?T.spell.MIN:T.spell.MAJ)[r]+'4');
    const ns= kind==='scale'?T.scale(root,k):T.chord(root,k); const pcs=new Set(ns.map(T.pc)); const names=[]; ns.forEach(n=>names[T.pc(n)]=T.name(n));
    UI.fretboard($('#fb'),{pcs,root:r,tuning:$('#ft').value.split(',').map(Number),names:T.spell.MAJ.map((x,i)=>names[i]||x)}); $('#fnotes').textContent=ns.map(n=>T.name(n)).join(' – ');
    $('#fstaff').innerHTML=UI.staff(kind==='scale'?ns.map(n=>({notes:[n]})):[{notes:ns}],{evW:kind==='scale'?36:56}); };
  ['fr','fs','ft'].forEach(id=>$('#'+id).onchange=draw); draw();
};
routes.staffview = v => {
  v.innerHTML = `<a class="back" href="#tools">← Tools</a><h2>Staff viewer</h2><div class="card"><p>Type notes (e.g. <code>C4 E4 G4 Bb4</code>), use <code>+</code> for chords (<code>C4+E4+G4 F4+A4+C5</code>):</p><input id="sv" class="inp" value="G4+B4+D5+F5 C4+E4+G4+C5"><p><select id="sc"><option>treble</option><option>bass</option><option>alto</option><option>tenor</option></select> <button class="btn sm" id="svp">▶︎ play</button></p><div id="svo"></div><p class="muted" id="svn"></p></div>`;
  let evs=[]; const draw=()=>{ try{ evs=$('#sv').value.trim().split(/\s+/).map(t=>({notes:t.split('+').map(x=>{ const n=T.parse(x); if(!n) throw x; return n; })})); evs.forEach(e=>e.label=e.notes.length>1?chordName(e.notes.map(T.midi)).split('  ')[0]:T.name(e.notes[0],true)); $('#svo').innerHTML=UI.staff(evs,{clef:$('#sc').value}); $('#svn').textContent=''; }catch(x){ $('#svn').textContent='Can’t read "'+x+'" — use letter + optional #/b + octave, like F#4.'; } };
  $('#sv').oninput=draw; $('#sc').onchange=draw; $('#svp').onclick=()=>evs.forEach((e,i)=>Audio.chord(e.notes.map(T.midi),i*1,0.9)); draw();
};
routes.viz = v => {
  v.innerHTML = `<a class="back" href="#tools">← Tools</a><h2>Waveform & spectrum</h2><div class="card"><canvas id="wave" height="140"></canvas><canvas id="spec" height="160"></canvas>
   <p><button class="btn sm" id="vn">▶︎ Play A3 (220 Hz)</button> <button class="btn sm" id="vc">▶︎ Play C major chord</button> <button class="btn ghost sm" id="vm">🎤 Use mic</button></p><p class="muted">Top: waveform (pressure over time). Bottom: spectrum — the peaks are the harmonics (f, 2f, 3f…). Try playing your instrument into the mic.</p></div>`;
  const an=Audio.analyser(); let src=an; const W=$('#wave'), Sp=$('#spec'); const fit=()=>{ W.width=W.clientWidth*devicePixelRatio; Sp.width=Sp.clientWidth*devicePixelRatio; W.height=140*devicePixelRatio; Sp.height=160*devicePixelRatio; }; fit();
  $('#vn').onclick=()=>Audio.playMidi(57,0,2.5); $('#vc').onclick=()=>Audio.chord([60,64,67],0,2.5);
  $('#vm').onclick=async()=>{ try{ src=await Audio.startMic(); toast('Mic on'); }catch(e){ toast('Mic blocked'); } };
  const draw=()=>{ const a=src; const td=new Float32Array(a.fftSize); a.getFloatTimeDomainData(td); const g=W.getContext('2d'); g.fillStyle='#0d1117'; g.fillRect(0,0,W.width,W.height); g.strokeStyle='#7aa2ff'; g.lineWidth=2; g.beginPath();
    for(let i=0;i<td.length;i+=2){ const x=i/td.length*W.width, y=W.height/2-td[i]*W.height*0.45; i?g.lineTo(x,y):g.moveTo(x,y); } g.stroke();
    const fd=new Uint8Array(a.frequencyBinCount); a.getByteFrequencyData(fd); const s=Sp.getContext('2d'); s.fillStyle='#0d1117'; s.fillRect(0,0,Sp.width,Sp.height); const sr=Audio.ctx.sampleRate; const maxF=4000; const bins=Math.floor(maxF/(sr/a.fftSize));
    for(let i=0;i<bins;i++){ const x=i/bins*Sp.width, h=fd[i]/255*Sp.height; s.fillStyle=`hsl(${200+i/bins*120},80%,60%)`; s.fillRect(x,Sp.height-h,Sp.width/bins+1,h); }
    s.fillStyle='#8b949e'; s.font=`${11*devicePixelRatio}px sans-serif`; for(let f=500;f<maxF;f+=500) s.fillText(f+'Hz',f/maxF*Sp.width,12*devicePixelRatio);
    window._raf=requestAnimationFrame(draw); }; draw();
};
routes.transposer = v => {
  v.innerHTML = `<a class="back" href="#tools">← Tools</a><h2>Transposer</h2><div class="card"><p><select id="ti">${Object.keys(T.INSTRUMENTS).map(k=>`<option>${k}</option>`).join('')}</select> <select id="td"><option value="c2w">concert → written</option><option value="w2c">written → concert</option></select></p>
   <input class="inp" id="tn" value="Bb4 D5 F5 Ab5"><div id="to"></div><p class="muted">Key signatures: written key for a B♭ instrument = concert key up a M2 (concert B♭ → written C).</p></div>`;
  const draw=()=>{ try{ const ins=$('#ti').value, dir=$('#td').value; const ns=$('#tn').value.trim().split(/\s+/).map(x=>{const n=T.parse(x); if(!n) throw x; return n;}); const out=ns.map(n=>dir==='c2w'?T.concertToWritten(n,ins):T.writtenToConcert(n,ins));
    $('#to').innerHTML=`<p><b>${dir==='c2w'?'Concert':'Written'}:</b></p>${UI.staff(ns.map(n=>({notes:[n],label:T.name(n,true)})),{})}<p><b>${dir==='c2w'?'Written for '+ins:'Concert pitch'}:</b></p>${UI.staff(out.map(n=>({notes:[n],label:T.name(n,true)})),{clef:T.midi(out[0])<55?'bass':'treble'})}`; }catch(x){ $('#to').innerHTML='<p class="warn">Use notes like Bb4 F#5</p>'; } };
  ['ti','td'].forEach(i=>$('#'+i).onchange=draw); $('#tn').oninput=draw; draw();
};
