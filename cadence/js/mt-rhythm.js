// Cadence · Counting rhythms (original). Units: 12 per quarter note (16th = 3, triplet 8th = 4, 8th = 6).
(() => {
  const {reg, rnd, pick, buttons} = MT;
  const F=UI.MUSIC_FONT;
  // beat patterns (simple meter: one quarter-note beat = 12). negative = rest. t = triplet
  const SIMPLE={ q:[[12]], e:[[6,6]], s:[[3,3,3,3],[6,3,3],[3,3,6]], dot:[[9,3]], syn:[[3,6,3]], rest:[[-12],[-6,6],[6,-6],[-3,3,3,3]], trip:[[4,4,4]] };
  const COMP={ e:[[18],[12,6],[6,6,6]], dot:[[6,12]], rest:[[-6,6,6],[6,-6,6],[12,-6],[-18]] };
  const TS={'2/4':{b:2,u:12,c:false},'3/4':{b:3,u:12,c:false},'4/4':{b:4,u:12,c:false},'6/8':{b:2,u:18,c:true},'9/8':{b:3,u:18,c:true},'12/8':{b:4,u:18,c:true}};
  function build(c){ const ts=TS[pick(c.ts)], P=ts.c?COMP:SIMPLE; const kinds=['q','e','s','dot','syn','rest','trip'].filter(k=>P[k]&&(k===(ts.c?'e':'q')||c.vals.includes(k==='syn'?'s':k)));
    const ev=[]; let beat=0;
    while(beat<ts.b){ // long notes
      if(c.vals.includes('long')&&!ts.c&&Math.random()<0.25){ const left=ts.b-beat; if(left>=4&&beat===0&&Math.random()<0.3){ ev.push({d:48,beat}); beat+=4; continue; } if(left>=3&&beat===0&&ts.b===3&&Math.random()<0.5){ ev.push({d:36,beat}); beat+=3; continue; } if(left>=2&&beat%2===0){ ev.push({d:Math.random()<0.15?-24:24,beat}); beat+=2; continue; } }
      if(c.vals.includes('long')&&ts.c&&Math.random()<0.2&&ts.b-beat>=2&&beat%2===0){ ev.push({d:36,beat}); beat+=2; continue; }
      const k=pick(kinds); const okD=d=>{ d=Math.abs(d); return d!==3||c.vals.includes('s')||(c.vals.includes('dot')); }; const pats=P[k].filter(pt=>pt.every(okD)&&!(k==='rest'&&pt.includes(9))); const pat=pick(pats.length?pats:P[ts.c?'e':'q']); pat.forEach(d=>ev.push({d,beat,trip:k==='trip'})); beat++; }
    let t=0; ev.forEach(e=>{ e.t=t; t+=Math.abs(e.d); }); return {ts, ev, name:Object.keys(TS).find(k=>TS[k]===ts)}; }
  function countOf(ts, t, trip){ const b=Math.floor(t/ts.u)+1, r=t%ts.u; if(ts.c) return b+(['','&','a'][r/6]||''); if(trip) return b+(['','trip','let'][r/4]||''); return b+(['','e','&','a'][r/3]||''); }
  function draw(R, hi){ const ts=R.ts; let x=46; const ly=60, H=100; let body='', heads=[];
    const wOf=d=>18+Math.abs(d)*2.6; const W=46+R.ev.reduce((a,e)=>a+wOf(e.d),0)+20;
    body+=`<text x="12" y="${ly-4}" class="ts">${R.name.split('/')[0]}</text><text x="12" y="${ly+18}" class="ts">${R.name.split('/')[1]}</text>`;
    R.ev.forEach((e,i)=>{ const v=Math.abs(e.d), col=i===hi?' hlc':''; const hx=x+8; e.x=hx;
      if(e.d<0){ const g= v>=24? null : v>=12?'𝄽': v>=6?'𝄾':'𝄿'; if(!g) body+=`<rect x="${hx-6}" y="${ly-6}" width="12" height="6" class="fill"/>`; else body+=`<text x="${hx-5}" y="${ly+8}" font-size="${v>=12?26:24}" font-family="${F}" class="glyph">${g}</text>`; if(v===18) body+=`<circle cx="${hx+12}" cy="${ly-2}" r="2" class="fill"/>`; }
      else { const open=v>=24; body+=`<ellipse cx="${hx}" cy="${ly}" rx="6.5" ry="4.6" transform="rotate(-20 ${hx} ${ly})" class="${open?'nh':'nhf'}${col}"/>`; if(open) body+=`<ellipse cx="${hx}" cy="${ly}" rx="3.4" ry="2" transform="rotate(-50 ${hx} ${ly})" class="nhole"/>`;
        if([36,18,9].includes(v)) body+=`<circle cx="${hx+11}" cy="${ly-2}" r="2" class="fill${col}"/>`;
        if(v<48){ body+=`<line x1="${hx+6}" x2="${hx+6}" y1="${ly-1}" y2="${ly-32}" class="stem${col}"/>`; heads.push({i,x:hx+6,v,beat:e.beat,trip:e.trip}); } }
      x+=wOf(e.d); });
    // beams by beat
    const byBeat={}; heads.filter(h=>h.v<12||(R.ts.c&&h.v<18&&h.v!==12)).forEach(h=>{ (byBeat[h.beat]=byBeat[h.beat]||[]).push(h); });
    for(const b in byBeat){ const g=byBeat[b].filter(h=>h.v<12); if(g.length>=2){ const a=g[0].x, z=g[g.length-1].x; body+=`<rect x="${a}" y="${ly-34}" width="${z-a+1.5}" height="4" class="fill"/>`;
        g.forEach((h,k)=>{ if(h.v===3){ const nb=g[k+1]&&g[k+1].v===3?g[k+1]:null, pb=g[k-1]&&g[k-1].v===3; if(nb) body+=`<rect x="${h.x}" y="${ly-27}" width="${nb.x-h.x+1.5}" height="4" class="fill"/>`; else if(!pb){ const left=k===g.length-1; body+=`<rect x="${left?h.x-8:h.x}" y="${ly-27}" width="8" height="4" class="fill"/>`; } } });
        if(g[0].trip) body+=`<text x="${(a+z)/2}" y="${ly-40}" text-anchor="middle" class="lbl">3</text>`; }
      else if(g.length===1){ const h=g[0]; body+=`<path d="M${h.x} ${ly-32} q 10 8 8 20" class="flag"/>`; if(h.v===3) body+=`<path d="M${h.x} ${ly-25} q 10 8 8 20" class="flag"/>`; } }
    return `<svg class="staff" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W*1.6}px"><line x1="5" x2="${W-5}" y1="${ly}" y2="${ly}" class="sl"/><line x1="${W-8}" x2="${W-8}" y1="${ly-12}" y2="${ly+12}" class="sl" stroke-width="2.5"/>${body}</svg>`; }
  function playR(R, bpm){ const q=60/bpm, s=q/12; R.ev.forEach(e=>{ if(e.d>0) Audio.playMidi(72, e.t*s, Math.min(0.5,e.d*s)); }); for(let b=0;b<R.ts.b;b++) Audio.click(b*R.ts.u*s, b===0); }
  reg({id:'rhythm', group:'rhythm', area:'rhythm', title:'Counting rhythms', desc:'A measure of rhythm with one note highlighted — what’s its count?', fields:[
      {k:'ts',label:'Time signatures',type:'multi',opts:Object.keys(TS).map(k=>[k,k]),def:['2/4','3/4','4/4']},
      {k:'vals',label:'Rhythms',type:'multi',opts:[['e','eighths'],['s','sixteenths (simple meters)'],['dot','dotted'],['rest','rests'],['long','halves / wholes'],['trip','triplets']],def:['e','rest','long']},
      {k:'bpm',label:'Playback tempo',type:'select',opts:[[60,'60'],[80,'80'],[100,'100'],[120,'120']],def:80}],
    make(c){ const R=build(c); const notes=R.ev.map((e,i)=>i).filter(i=>R.ev[i].d>0); const hi=pick(notes.length?notes:[0]); const ans=countOf(R.ts,R.ev[hi].t,R.ev[hi].trip);
      return {prompt:'What’s the count on the <b style="color:#ff8a3d">orange</b> note?', staff:draw(R,hi), play:()=>playR(R,c.bpm),
        answer:(el,done)=>{ const subs= R.ts.c? ['','&','a'] : ['','&'].concat(c.vals.includes('s')||c.vals.includes('dot')?['e','a']:[]).concat(c.vals.includes('trip')?['trip','let']:[]);
          const order=R.ts.c?['','&','a']:['','e','&','a','trip','let']; const opts=[]; for(let b=1;b<=R.ts.b;b++) order.filter(x=>subs.includes(x)).forEach(x=>opts.push([b+x, x?(x.length>1?b+'-'+x:b+' '+x):String(b)]));
          if(!opts.some(o=>o[0]===ans)) opts.push([ans,ans]);
          const w=buttons(el,[{k:'c',opts}],s=>{ w.mark({c:ans}); done(s.c===ans, `It’s on “${ans.replace(/^(\d)(.+)$/,'$1 $2')}”.`); }); }}; }});
})();
