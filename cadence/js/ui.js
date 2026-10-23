// UI components: SVG staff, rhythm notation, piano keyboard, fretboard.
const UI = (() => {
  const MUSIC_FONT = "'Noto Music','Bravura','Apple Symbols','Segoe UI Symbol',serif";
  const ACCG = {'-2':'𝄫','-1':'♭','0':'','1':'♯','2':'𝄪'};
  const CLEF = { treble:{bottom:30, glyph:'𝄞', gy:3, size:46}, bass:{bottom:18, glyph:'𝄢', gy:1, size:34}, alto:{bottom:24, glyph:'𝄡', gy:2, size:40}, tenor:{bottom:22, glyph:'𝄡', gy:3, size:40} };
  const SHARP_POS = {treble:[38,35,39,36,33,37,34], bass:[24,21,25,22,19,23,20], alto:[31,28,32,29,26,30,27], tenor:[24,28,25,29,26,30,27]};
  const FLAT_POS  = {treble:[34,37,33,36,32,35,31], bass:[20,23,19,22,18,21,17], alto:[27,30,26,29,25,28,24], tenor:[27,30,26,29,25,28,24]};
  // events: [{notes:[noteObj], label:'', color:''}], opts: {clef, keySig, width, height, showNames}
  function staff(events, opts={}){
    const clef=opts.clef||'treble', C=CLEF[clef], sp=10, top=40, bottomY=top+4*sp;
    const ks=opts.keySig||0, ksW=Math.abs(ks)*11;
    const startX=58+ksW, evW=opts.evW||56;
    const width=opts.width||Math.max(260,startX+events.length*evW+30);
    const height=opts.height||150;
    const y = di => bottomY-(di-C.bottom)*sp/2;
    let s=`<svg class="staff" viewBox="0 0 ${width} ${height}" width="100%" style="max-width:${width*1.6}px" xmlns="http://www.w3.org/2000/svg" role="img">`;
    for(let i=0;i<5;i++) s+=`<line x1="6" x2="${width-6}" y1="${top+i*sp}" y2="${top+i*sp}" class="sl"/>`;
    s+=`<text x="10" y="${bottomY-C.gy*sp+ (clef==='treble'?10:0)}" font-size="${C.size}" font-family="${MUSIC_FONT}" class="glyph">${C.glyph}</text>`;
    const kpos = ks>0?SHARP_POS[clef]:FLAT_POS[clef];
    for(let i=0;i<Math.abs(ks);i++) s+=`<text x="${46+i*11}" y="${y(kpos[i])+5}" font-size="18" class="glyph" font-family="${MUSIC_FONT}">${ks>0?'♯':'♭'}</text>`;
    if(opts.timeSig){ const [a,b]=opts.timeSig; s+=`<text x="${startX-8}" y="${top+sp*2-1}" class="ts">${a}</text><text x="${startX-8}" y="${top+sp*4-1}" class="ts">${b}</text>`; }
    events.forEach((ev,i)=>{
      const x=startX+i*evW+evW/2; const col=ev.color||'';
      const sorted=[...ev.notes].sort((a,b)=>T.diatonicIndex(a)-T.diatonicIndex(b));
      sorted.forEach((n,j)=>{
        const di=T.diatonicIndex(n), ny=y(di);
        // ledger lines
                if(di<=C.bottom-2){ for(let L=C.bottom-2; L>=di; L-=2) s+=`<line x1="${x-12}" x2="${x+12}" y1="${y(L)}" y2="${y(L)}" class="sl"/>`; }
        if(di>=C.bottom+10){ for(let L=C.bottom+10; L<=di; L+=2) s+=`<line x1="${x-12}" x2="${x+12}" y1="${y(L)}" y2="${y(L)}" class="sl"/>`; }
        // seconds offset
        const prev=sorted[j-1]; const off=(prev && T.diatonicIndex(n)-T.diatonicIndex(prev)===1 && (j%2===1))?14:0;
        s+=`<ellipse cx="${x+off}" cy="${ny}" rx="6.6" ry="4.6" transform="rotate(-20 ${x+off} ${ny})" class="nh ${col}"/><ellipse cx="${x+off}" cy="${ny}" rx="3.4" ry="2" transform="rotate(-50 ${x+off} ${ny})" class="nhole"/>`;
        const ka=(ks>0?[3,0,4,1,5,2,6].slice(0,ks):[6,2,5,1,4,0,3].slice(0,-ks)).includes(n.l)?Math.sign(ks):0; if(n.a!==ka || ev.showNatural) s+=`<text x="${x-24-(j%2&&sorted.length>2?6:0)}" y="${ny+5}" font-size="17" font-family="${MUSIC_FONT}" class="glyph ${col}">${n.a===0?'♮':ACCG[n.a]}</text>`;
      });
      if(ev.label) s+=`<text x="${x}" y="${height-12}" text-anchor="middle" class="lbl">${ev.label}</text>`;
      if(ev.bar) s+=`<line x1="${x+evW/2}" x2="${x+evW/2}" y1="${top}" y2="${bottomY}" class="sl"/>`;
    });
    if(opts.final) s+=`<line x1="${width-10}" x2="${width-10}" y1="${top}" y2="${bottomY}" class="sl" stroke-width="3"/>`;
    return s+'</svg>';
  }
  // Rhythm notation on a one-line staff. pattern: array of tokens: 'w','h','q','e','s','hd','qd','qr','er','hr' grouped in beats where eighths/sixteenths beam within beat.
  // input: beats: array of beat-groups, each group array of durations (in beats) e.g. [[1],[0.5,0.5],[0.25,0.25,0.25,0.25],[1]]  rest durations negative.
  function rhythm(groups, opts={}){
    const W=opts.width||Math.max(240, 30+groups.reduce((a,g)=>a+Math.max(46,g.length*24),0)); const H=90, ly=55; let x=20;
    let s=`<svg class="staff" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W*1.6}px"><line x1="5" x2="${W-5}" y1="${ly}" y2="${ly}" class="sl"/>`;
    for(const g of groups){
      const gw=Math.max(46,g.length*24); const step=gw/g.length; const heads=[];
      g.forEach((d,i)=>{ const hx=x+i*step+8; const rest=d<0; const v=Math.abs(d);
        if(rest){ if(v>=2) s+=`<rect x="${hx-6}" y="${ly-6}" width="12" height="6" class="fill"/>`; else if(v>=1) s+=`<text x="${hx-5}" y="${ly+8}" font-size="26" font-family="${MUSIC_FONT}" class="glyph">𝄽</text>`; else s+=`<text x="${hx-5}" y="${ly+6}" font-size="24" font-family="${MUSIC_FONT}" class="glyph">${v>=0.5?'𝄾':'𝄿'}</text>`; return; }
        const open=v>=2; s+=`<ellipse cx="${hx}" cy="${ly}" rx="6.5" ry="4.6" transform="rotate(-20 ${hx} ${ly})" class="${open?'nh':'nhf'}"/>`; if(open) s+=`<ellipse cx="${hx}" cy="${ly}" rx="3.4" ry="2" transform="rotate(-50 ${hx} ${ly})" class="nhole"/>`;
        const dotted = [3,1.5,0.75].includes(v); if(dotted) s+=`<circle cx="${hx+11}" cy="${ly-2}" r="2" class="fill"/>`;
        if(v<4){ s+=`<line x1="${hx+6}" x2="${hx+6}" y1="${ly-1}" y2="${ly-32}" class="stem"/>`; heads.push({x:hx+6,v}); }
      });
      const beamable=heads.filter(h=>h.v<1);
      if(beamable.length>=2){ const a=beamable[0].x,b=beamable[beamable.length-1].x; s+=`<rect x="${a}" y="${ly-34}" width="${b-a+1.5}" height="4" class="fill"/>`;
        // second beam for sixteenths
        for(let i=0;i<beamable.length;i++){ const h=beamable[i]; if(h.v<=0.25){ const nb=beamable[i+1]&&beamable[i+1].v<=0.25?beamable[i+1]:null; if(nb){ s+=`<rect x="${h.x}" y="${ly-27}" width="${nb.x-h.x+1.5}" height="4" class="fill"/>`; } else if(!(beamable[i-1]&&beamable[i-1].v<=0.25)){ const dir=i===beamable.length-1?-8:8; s+=`<rect x="${Math.min(h.x,h.x+dir)}" y="${ly-27}" width="8" height="4" class="fill"/>`; } } }
      } else if(beamable.length===1){ const h=beamable[0]; s+=`<path d="M${h.x} ${ly-32} q 10 8 8 20" class="flag"/>`; if(h.v<=0.25) s+=`<path d="M${h.x} ${ly-25} q 10 8 8 20" class="flag"/>`; }
      x+=gw;
    }
    return s+'</svg>';
  }
  // Piano keyboard. opts: {from:midi, to:midi, onNote(midi), highlight:Set(midi), labels:bool}
  function piano(el, opts={}){
    const from=opts.from??48, to=opts.to??72; const whites=[]; for(let m=from;m<=to;m++) if(![1,3,6,8,10].includes(m%12)) whites.push(m);
    const ww=100/whites.length; let html='<div class="piano">';
    whites.forEach((m,i)=>{ html+=`<div class="key white" data-m="${m}" style="left:${i*ww}%;width:${ww}%"><span>${opts.labels!==false && m%12===0?'C'+(m/12-1):''}</span></div>`; });
    for(let m=from;m<=to;m++) if([1,3,6,8,10].includes(m%12)){ const wi=whites.indexOf(m-1); if(wi<0) continue; html+=`<div class="key black" data-m="${m}" style="left:${(wi+1)*ww-ww*0.32}%;width:${ww*0.64}%"></div>`; }
    el.innerHTML=html+'</div>';
    const down = e => { const k=e.target.closest('.key'); if(!k) return; e.preventDefault(); const m=+k.dataset.m; Audio.playMidi(m,0,1.2); k.classList.add('down'); setTimeout(()=>k.classList.remove('down'),180); opts.onNote&&opts.onNote(m); };
    el.querySelector('.piano').addEventListener('pointerdown', down);
    const api = { highlight(set, cls='hl'){ el.querySelectorAll('.key').forEach(k=>k.classList.toggle(cls, set.has(+k.dataset.m))); },
      flash(m, cls='down'){ const k=el.querySelector(`.key[data-m="${m}"]`); if(k){ k.classList.add(cls); setTimeout(()=>k.classList.remove(cls),300);} } };
    if(opts.highlight) api.highlight(opts.highlight);
    return api;
  }
  // Fretboard: highlight pitch classes; tuning low->high
  function fretboard(el, opts={}){
    const tuning=opts.tuning||[40,45,50,55,59,64], frets=opts.frets||15, pcs=opts.pcs||new Set(), root=opts.root;
    const names=opts.names||T.PC_NAMES_SHARP; const W=frets*52+40, H=tuning.length*28+30;
    let s=`<svg viewBox="0 0 ${W} ${H}" class="fret" width="${W}" height="${H}">`;
    for(let f=0;f<=frets;f++){ const x=30+f*52; s+=`<line x1="${x}" x2="${x}" y1="14" y2="${H-16}" class="${f===0?'nut':'fw'}"/>`; if([3,5,7,9,15].includes(f)) s+=`<circle cx="${x-26}" cy="${H-6}" r="3" class="dot"/>`; if(f===12){ s+=`<circle cx="${x-32}" cy="${H-6}" r="3" class="dot"/><circle cx="${x-20}" cy="${H-6}" r="3" class="dot"/>`; } }
    tuning.slice().reverse().forEach((open,si)=>{ const y=28+si*28; s+=`<line x1="30" x2="${W-10}" y1="${y}" y2="${y}" class="str"/>`;
      for(let f=0;f<=frets;f++){ const m=open+f, p=m%12; if(!pcs.has(p)) continue; const x=f===0?16:30+f*52-26;
        s+=`<g data-m="${m}" class="fn"><circle cx="${x}" cy="${y}" r="11" class="${p===root?'froot':'fnote'}"/><text x="${x}" y="${y+4}" text-anchor="middle" class="ftxt">${names[p]}</text></g>`; } });
    el.innerHTML=s+'</svg>';
    el.querySelectorAll('.fn').forEach(g=>g.addEventListener('pointerdown',()=>Audio.playMidi(+g.dataset.m,0,1.2)));
  }
  return {staff, rhythm, piano, fretboard, MUSIC_FONT};
})();
