// Verdict · Argument coach. Rule-based (no AI): reads your text on this phone and points at weak spots.
(function(){
const R=(re,name,tip,kind)=>({re,name,tip,kind:kind||'fallacy'});
const RULES=[
  R(/\b(idiots?|stupid|dumb|morons?|clueless|brainless|you people|only a fool)\b/gi,'Attacking people (ad hominem)','Go after the idea, not the people who hold it. Judges mark this down.'),
  R(/\b(every(one|body) (knows|agrees|thinks|says)|most people (think|agree|know|believe)|nobody (thinks|believes|wants)|all my friends)\b/gi,'Bandwagon','Popularity isn’t proof. Show why it’s true, not how many people believe it.'),
  R(/\b((will|would) (inevitably |eventually |soon )?lead to|next thing you know|before you know it|where does it end|open(s)? the floodgates|slippery slope)\b/gi,'Slippery slope','You jump from step 1 to disaster. Show each link in the chain, or cut it.'),
  R(/\b(either\b[^.?!]{1,60}\bor\b|the only (option|choice|way|answer)|there are only two)\b/gi,'False choice','Are there really only two options? Name the middle ground and say why it fails.'),
  R(/\b(always|never|all of them|every single|no one ever|everyone ever|100% of)\b/gi,'Absolute words','“Always” and “never” are easy to knock down with one example. Try “usually” or give the number.','claim'),
  R(/\b(experts|scientists|doctors|researchers|studies|research|science) (say|says|show|shows|prove|proves|agree)\b/gi,'Vague authority','Which expert? Which study? Name the source (who, when) so it counts as evidence.'),
  R(/\b(think of the children|heartbreaking|terrifying|disgusting|horrifying|outrageous)\b/gi,'Emotion over reason','Strong feelings are fine, but pair them with a reason or a fact.'),
  R(/\b(so you'?re saying|they (just )?want to|opponents (think|believe) that|people who disagree are)\b/gi,'Straw man risk','Make sure you’re answering the other side’s best argument, not a weaker version.'),
  R(/\b(it'?s always been|we'?ve always|that'?s (just )?how it'?s done|tradition(al)?ly)\b/gi,'Appeal to tradition','“We’ve always done it” isn’t a reason. Say what the tradition gets right.'),
  R(/\b(obviously|clearly|of course|it'?s common sense|undeniabl[ey]|without a doubt|it goes without saying|everyone knows|needless to say|no one can deny)\b/gi,'Unsupported claim','Words like “obviously” ask the reader to skip the proof. Give the proof instead.','claim'),
  R(/\b(i think|i feel|i believe|in my opinion|maybe|perhaps|kind of|sort of|i guess)\b/gi,'Hedging','A few are fine; too many sound unsure. Say it straight.','style'),
];
const EVID=/(\d|%|\bper ?cent\b|\baccording to\b|\bstud(y|ies)\b|\bsurvey\b|\bdata\b|\breport(ed)?\b|\bfor (example|instance)\b|\bsuch as\b|\bresearch\b|\bpoll\b|\bstatistic|\bin \d{4}\b|\bcase of\b)/i;
const REASON=/\b(because|since|so that|therefore|which means|this means|that means|as a result|leads to|causes|thus|hence)\b/i;
const COUNTER=/\b(although|however|admittedly|critics|opponents|some (people )?(say|argue|claim|think)|on the other hand|while it'?s true|it'?s true that|even if|granted|the other side)\b/i;
const CONCL=/\b(in conclusion|that'?s why|this is why|for these reasons|overall|ultimately|in the end|so,? (we|the)|which is why)\b/i;
const STOP=new Set('the a an and or but of to in on for with is are was were be been it its this that these those as at by from they them their there we our you your i me my he she his her not no do does did can could would should will just than then so if into about more most also very have has had what which who'.split(' '));
function syl(w){ w=w.toLowerCase().replace(/[^a-z]/g,''); if(!w) return 0; if(w.length<=3) return 1; w=w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/,'').replace(/^y/,''); const m=w.match(/[aeiouy]{1,2}/g); return Math.max(1,m?m.length:1); }
const BAD=/\b(fuck\w*|shit\w*|bitch\w*|bastard|asshole|dick|cunt|pussy|slut|whore|fag\w*|retard\w*|nigg\w*|cock|twat|prick|dumbass|jackass)\b/gi;
function analyze(text){
  const t=String(text||''); const words=(t.match(/[A-Za-z0-9’']+/g)||[]); const wc=words.length;
  const sents=t.split(/[.!?]+(?:\s|$)/).map(s=>s.trim()).filter(s=>s.split(/\s+/).length>=2);
  const sc=Math.max(1,sents.length), sy=words.reduce((n,w)=>n+syl(w),0);
  const grade=wc?Math.max(1,Math.round((0.39*(wc/sc)+11.8*(sy/Math.max(1,wc))-15.59)*10)/10):0;
  const flags=[], marks=[];
  for(const r of RULES){ r.re.lastIndex=0; const hits=[...t.matchAll(r.re)]; if(!hits.length) continue; if(r.kind==='style'&&hits.length<3) continue;
    flags.push({name:r.name,tip:r.tip,kind:r.kind,hits:hits.slice(0,4).map(h=>h[0]),n:hits.length}); hits.forEach(h=>marks.push([h.index,h.index+h[0].length,r.name])); }
  const hasEv=EVID.test(t), hasR=REASON.test(t), hasC=COUNTER.test(t), hasCon=CONCL.test(t);
  if(wc>=25&&!hasEv) flags.push({name:'Missing evidence',tip:'No numbers, sources or examples yet. Add one fact, study, or real example to back your main point.',kind:'evidence',hits:[],n:1});
  if(wc>=25&&!hasR) flags.push({name:'No “because”',tip:'Link your claim to a reason: “X, because Y.” Without it, it’s just an opinion.',kind:'reason',hits:[],n:1});
  BAD.lastIndex=0; const prof=(t.match(BAD)||[]).length; if(prof) flags.push({name:'Language filter',tip:'Swear words get masked when you post (and cost you votes). Swap them for sharper words.',kind:'style',hits:[],n:prof});
  const freq={}; for(const w of words){ const k=w.toLowerCase(); if(k.length>3&&!STOP.has(k)) freq[k]=(freq[k]||0)+1; }
  const rep=Object.entries(freq).filter(([,n])=>n>=5).sort((a,b)=>b[1]-a[1]).slice(0,3);
  if(rep.length) flags.push({name:'Repeated words',tip:'You use “'+rep.map(x=>x[0]).join('”, “')+'” a lot. Vary your wording.',kind:'style',hits:[],n:rep.length});
  const longS=sents.filter(s=>s.split(/\s+/).length>35).length; if(longS) flags.push({name:'Very long sentences',tip:longS+' sentence'+(longS>1?'s run':' runs')+' over 35 words. Split them so judges can follow.',kind:'style',hits:[],n:longS});
  const structure=[['Claim',wc>=10],['Reason (because…)',hasR],['Evidence or example',hasEv],['Answers the other side',hasC],['Clear ending',hasCon]];
  let score=100-flags.reduce((n,f)=>n+(f.kind==='fallacy'?12:f.kind==='evidence'?15:f.kind==='reason'?12:f.kind==='claim'?6:4)*Math.min(2,f.n),0);
  if(!hasC) score-=6; if(!hasCon) score-=4; if(t.length<280) score-=10; if(t.length>1000) score-=10; if(grade>14) score-=5;
  score=Math.max(0,Math.min(100,Math.round(score)));
  const level=grade<=5?'easy to read':grade<=9?'clear':grade<=12?'high school level':grade<=15?'college level':'very dense';
  return {chars:t.length,wc,sc:sents.length,grade,level,flags,marks,structure,score,avg:wc?Math.round(wc/sc):0};
}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function highlight(t,marks){ const ms=marks.slice().sort((a,b)=>a[0]-b[0]); let out='',i=0; for(const [s,e,n] of ms){ if(s<i) continue; out+=esc(t.slice(i,s))+'<mark title="'+esc(n)+'">'+esc(t.slice(s,e))+'</mark>'; i=e; } return out+esc(t.slice(i)); }
/* free: counts, reading level and the first 2 flags. Pro: every flag with highlights, structure check and a score. */
function html(text,pro){
  const a=analyze(text); const len=a.chars<280?'<span class="dn">'+(280-a.chars)+' more characters to post</span>':a.chars>1000?'<span class="dn">'+(a.chars-1000)+' over the 1000 limit</span>':'<span class="up">length ok</span>';
  let h=`<div class="cstat"><div><b>${a.wc}</b><span>words</span></div><div><b>${a.chars}</b><span>characters</span></div><div><b>${a.grade||'–'}</b><span>grade level</span></div>${pro?`<div><b class="${a.score>=75?'up':a.score>=50?'':'dn'}">${a.wc?a.score:'–'}</b><span>coach score</span></div>`:''}</div>
   <p class="muted small" style="margin:6px 0">${len}${a.wc?' · reads '+a.level+' · '+a.avg+' words per sentence':''}</p>`;
  if(!a.wc) return h+'<p class="muted small">Start writing and the coach checks for fallacies, unsupported claims, missing evidence and more.</p>';
  const fl=pro?a.flags:a.flags.slice(0,2);
  h+=fl.length?fl.map(f=>`<div class="cflag k-${f.kind}"><b>${esc(f.name)}${f.n>1?' ×'+f.n:''}</b>${f.hits.length?' <span class="muted small">“'+f.hits.map(esc).join('”, “')+'”</span>':''}<p>${esc(f.tip)}</p></div>`).join(''):'<div class="cflag k-ok"><b>No red flags</b><p>Nice. Make sure your best point comes first.</p></div>';
  if(!pro){ const more=a.flags.length-fl.length; h+=`<div class="cpro"><span>🔒 ${more>0?more+' more check'+(more>1?'s':'')+' found + ':''}highlights, structure check and a score are in <b>Verdict Pro</b>.</span> <a href="#pro">Get Pro</a></div>`; return h; }
  h+='<div class="cstruct">'+a.structure.map(([n,ok])=>`<span class="${ok?'ok':'no'}">${ok?'✓':'○'} ${esc(n)}</span>`).join('')+'</div>';
  if(a.marks.length) h+='<details class="fold" style="margin-top:8px"><summary>Show flagged words in your text</summary><div class="chl">'+highlight(String(text),a.marks)+'</div></details>';
  return h;
}
window.Coach={analyze,html,clean:t=>String(t||'').replace(BAD,w=>w[0]+'*'.repeat(w.length-1))};
})();
