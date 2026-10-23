// Cadence · Lessons (original text + examples, Northpeak Studios). Step through a page at a time; every example plays.
(() => {
  const CH = window.LESSON_CHAPTERS = [];
  // page = [html, example?]  example: "treble;keySig;events[;ts=4/4][;bass=C3 G2]"  |  "rh:<json groups>"  |  "kb:60,64,67"
  window.addLessons = (chapter, lessons, opt={}) => CH.push(Object.assign({t:chapter, l:lessons}, opt));
  const all = () => CH.flatMap(c=>c.l.map(l=>Object.assign({ch:c}, l)));
  const pro = () => !!(window.CadPro&&CadPro.pro());
  function parseEv(str){ return str.trim().split(/\s+/).filter(Boolean).reduce((acc,tok)=>{ if(tok==='|'){ if(acc.length) acc[acc.length-1].bar=true; return acc; }
      const [body,label]=tok.split(':'); if(body==='_') { acc.push({notes:[],label:label?label.replace(/_/g,' '):''}); return acc; } const nat=/^[A-G]n/.test(body); acc.push({notes:body.replace(/^([A-G])n/,'$1').split('+').map(T.parse),label:label?label.replace(/_/g,' '):'',showNatural:nat}); return acc; },[]); }
  function exHtml(spec, id){
    if(spec.startsWith('rh:')){ const g=JSON.parse(spec.slice(3)); return `<div class="qstaff">${UI.rhythm(g)}</div><button class="play sm" data-rh='${spec.slice(3)}'>▶︎ Play</button>`; }
    if(spec.startsWith('kb:')){ return `<div class="qpiano mtpiano" data-kb="${spec.slice(3)}"></div>`; }
    const [clef,ks,evs,...rest]=spec.split(';'); const o={}; rest.forEach(x=>{ const [k,v]=x.split('='); o[k]=v; });
    const ev=parseEv(evs); const opts={clef, keySig:+ks||0, width:Math.max(220, 70+Math.abs(+ks||0)*11+ev.length*(+o.w||52)+20), evW:+o.w||52, final:o.final!=='0'&&ev.length>0};
    if(o.ts) opts.timeSig=o.ts.split('/');
    return `<div class="qstaff">${UI.staff(ev,opts)}</div>${ev.some(e=>e.notes.length)?`<button class="play sm" data-ex="${encodeURIComponent(evs)}" data-bass="${o.bass||''}" data-gap="${o.gap||0.8}">▶︎ Play</button>`:''}`; }
  function wire(v){
    $$('[data-ex]',v).forEach(b=>b.onclick=()=>{ const ev=parseEv(decodeURIComponent(b.dataset.ex)); const bass=(b.dataset.bass||'').split(' ').filter(Boolean).map(T.parse); const g=+b.dataset.gap; ev.forEach((e,i)=>{ e.notes.forEach(n=>Audio.playMidi(T.midi(n),i*g,g*1.1)); if(bass[i]) Audio.playMidi(T.midi(bass[i]),i*g,g*1.1); }); });
    $$('[data-rh]',v).forEach(b=>b.onclick=()=>{ const g=JSON.parse(b.dataset.rh); let t=0; const q=0.6; g.forEach(grp=>grp.forEach(d=>{ if(d>0) Audio.playMidi(72,t*q,Math.min(0.5,d*q)); t+=Math.abs(d); })); for(let k=0;k<Math.round(t);k++) Audio.click(k*q,k===0); });
    $$('[data-kb]',v).forEach(el=>{ const ks=el.dataset.kb.split(',').map(Number); const lo=Math.min(...ks), from=lo-lo%12, to=Math.max(from+24,Math.max(...ks)+1); const p=UI.piano(el,{from,to}); p.highlight(new Set(ks)); });
  }
  const done = () => { const st=S.get(); st.lsn=st.lsn||{}; return st.lsn; };
  routes.lessons = v => { const d=done();
    v.innerHTML=`<a class="back" href="#learn">← learn</a><h2>📘 Lessons</h2><p class="muted">Short step-through lessons with examples you can hear. Each ends with a drill set up for it.</p>`+CH.map(c=>`<h3>${c.t}${c.pro&&!pro()?' <span class="muted">· Pro</span>':''}</h3><div class="mtlist">${c.l.map(l=>`<div class="mtrow"><a class="mtgo${c.pro&&!pro()?' locked':''}" href="#lsn/${l.id}"><b>${d[l.id]>=l.p.length?'✓ ':''}${l.t}</b><span>${l.d||''}</span></a></div>`).join('')}</div>`).join(''); };
  routes.lsn = (v,id,pg) => { const L=all().find(x=>x.id===id); if(!L) return go('lessons'); if(L.ch.pro&&!pro()) return CadPro.locked(v,L.t,'The Advanced lessons (Neapolitan and augmented sixth chords) are part of Pro; every other lesson is free.');
    const n=Math.max(0,Math.min(L.p.length-1,+pg||0)); const [html,ex]=L.p[n]; const list=all(), idx=list.indexOf(L), nxt=list[idx+1];
    const d=done(); if((d[id]||0)<n+1){ d[id]=n+1; S.save(); }
    const last=n===L.p.length-1;
    v.innerHTML=`<a class="back" href="#lessons">← lessons</a><div class="muted">${L.ch.t}</div><h2>${L.t}</h2><div class="card lsn"><div>${html}</div>${ex?exHtml(ex):''}</div>
      <div class="lsndots">${L.p.map((_,i)=>`<i class="${i<=n?'on':''}"></i>`).join('')}</div>
      <div class="lsnnav">${n>0?`<a class="btn ghost" href="#lsn/${id}/${n-1}">← Back</a>`:'<span></span>'}${!last?`<a class="btn" href="#lsn/${id}/${n+1}">Next →</a>`:(nxt?`<a class="btn" href="#lsn/${nxt.id}">Next lesson →</a>`:'<a class="btn" href="#lessons">Done ✓</a>')}</div>
      ${last&&L.x?`<div class="card"><b>Practice it</b><div class="mtlist" style="margin-top:8px">${L.x.map(([h,t])=>`<div class="mtrow"><a class="mtgo" href="${h}"><b>${t}</b></a></div>`).join('')}</div></div>`:''}`;
    wire(v); };
  window.lessonCount = () => all().length;
})();
