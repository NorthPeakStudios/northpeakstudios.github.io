// Trace · Export & import (1.4). Every file is made and read on this phone; nothing is uploaded.
// Export: JSON backup, CSV (logs / meds summary / reminders), Markdown, plain text, PDF, ICS (reminders), HTML.
// Import: JSON backup, CSV (with column matching + preview), text/Markdown lines, ICS reminders. Preview + counts first, duplicates skipped.
(function(){
const DAY=864e5;
const pad=n=>String(n).padStart(2,'0');
const hm=t=>{ const d=new Date(t); return pad(d.getHours())+':'+pad(d.getMinutes()); };
const ymd=t=>Store.dayKey(t);
const amtOf=x=>[x.amt,x.unit].filter(Boolean).join(' ');
const feelTxt=f=>f?Store.METRICS.filter(m=>f[m[0]]).map(m=>m[0]+' '+f[m[0]]).join(', '):'';
const DOWS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const daysTxt=r=>(r.days&&r.days.length&&r.days.length<7)?r.days.map(d=>DOWS[d]).join(' '):'every day';
const stamp=()=>new Date().toISOString().slice(0,10);
let range='all';
function inRange(){ const es=Store.entries(); if(range==='all') return es; const n=+range; return es.filter(x=>x.t>=Date.now()-n*DAY); }

/* ---------- save a file: share sheet in the installed app (so it can go to Files), download in Safari ---------- */
function save(name,data,type){ const blob=data instanceof Blob?data:new Blob([data],{type});
  const standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone;
  try{ const f=new File([blob],name,{type}); if(standalone&&navigator.canShare&&navigator.canShare({files:[f]})){ navigator.share({files:[f],title:name}).catch(()=>{}); return; } }catch(e){}
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },2000); }

/* ---------- builders ---------- */
const csvCell=s=>{ s=String(s==null?'':s); if(/^[=+\-@\t\r]/.test(s)) s="'"+s; return '"'+s.replace(/"/g,'""')+'"'; }; // a cell starting with = + - @ would run as a formula
const csv=rows=>rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
const B={};
B.json=()=>JSON.stringify({app:'trace',v:2,exported:new Date().toISOString(),entries:Store.entries(),reminders:Store.reminders(),urges:Store.urges(),prefs:Store.prefs()},null,1);
B.csv=()=>{ const rows=[['date','time','what','amount','unit',...Store.METRICS.map(m=>m[0]),'effects','notes','feelings logged at','context']];
  for(const x of inRange().slice().reverse()) rows.push([ymd(x.t),hm(x.t),x.what||'(check-in)',x.amt,x.unit,...Store.METRICS.map(m=>x.feel&&x.feel[m[0]]||''),(x.fx||[]).join('; '),x.notes,x.feelAt?new Date(x.feelAt).toISOString():'',x.ctx?Object.entries(x.ctx).map(([k,v])=>k+': '+[].concat(v).join('/')).join('; '):'']);
  return csv(rows); };
function medRows(){ const m={}; for(const x of inRange()){ if(!x.what) continue; const k=Store.keyOf(x.what); const o=m[k]=m[k]||{name:x.what.trim(),n:0,days:new Set(),first:x.t,last:x.t,amts:{}}; o.n++; o.days.add(ymd(x.t)); o.first=Math.min(o.first,x.t); o.last=Math.max(o.last,x.t); const a=amtOf(x); if(a) o.amts[a]=(o.amts[a]||0)+1; }
  return Object.values(m).sort((a,b)=>b.n-a.n).map(o=>({...o,usual:(Object.entries(o.amts).sort((a,b)=>b[1]-a[1])[0]||[''])[0],rem:Store.reminders().filter(r=>Store.keyOf(r.what)===Store.keyOf(o.name)).map(r=>r.time).join(' ')})); }
B.meds=()=>csv([['what','times logged','days logged','first logged','last logged','usually logged as','reminder times'],...medRows().map(o=>[o.name,o.n,o.days.size,ymd(o.first),ymd(o.last),o.usual,o.rem])]);
B.rems=()=>csv([['what','time','days','amount','unit','on'],...Store.reminders().map(r=>[r.what,r.time,daysTxt(r),r.amt,r.unit,r.on===false?'off':'on'])]);
function lineOf(x,md){ const parts=[hm(x.t),x.what||'Check-in']; if(amtOf(x)) parts.push(amtOf(x)); const f=feelTxt(x.feel); if(f) parts.push(f); if(x.fx&&x.fx.length) parts.push('effects: '+x.fx.join(', ')); if(x.notes) parts.push('note: '+x.notes.replace(/\s+/g,' ')); return (md?'- ':'')+parts.join(' · '); }
function grouped(){ const by={}; for(const x of inRange()) (by[ymd(x.t)]=by[ymd(x.t)]||[]).push(x); return Object.keys(by).sort().reverse().map(k=>[k,by[k].sort((a,b)=>a.t-b.t)]); }
const dname=k=>DOWS[new Date(k+'T12:00').getDay()];
B.md=()=>{ const L=['# Trace export','','_Made '+new Date().toLocaleString()+' · '+inRange().length+' entries · a personal journal, not medical advice_',''];
  const rs=Store.reminders(); if(rs.length){ L.push('## Reminders',''); rs.forEach(r=>L.push('- '+r.time+' · '+r.what+(amtOf(r)?' · '+amtOf(r):'')+' · '+daysTxt(r)+(r.on===false?' · off':''))); L.push(''); }
  const ms=medRows(); if(ms.length){ L.push('## What I log','','| What | Times | Days | Usually logged as |','|---|---|---|---|'); ms.forEach(o=>L.push('| '+[o.name,o.n,o.days.size,o.usual||'–'].map(s=>String(s).replace(/\|/g,'/')).join(' | ')+' |')); L.push(''); }
  L.push('## Logs',''); for(const [k,xs] of grouped()){ L.push('### '+k+' ('+dname(k)+')'); xs.forEach(x=>L.push(lineOf(x,true))); L.push(''); } return L.join('\n'); };
B.txt=()=>{ const L=['TRACE EXPORT — made '+new Date().toLocaleString(),'A personal journal, not medical advice.',''];
  const rs=Store.reminders(); if(rs.length){ L.push('REMINDERS'); rs.forEach(r=>L.push('  '+r.time+' · '+r.what+(amtOf(r)?' · '+amtOf(r):'')+' · '+daysTxt(r)+(r.on===false?' · off':''))); L.push(''); }
  L.push('LOGS'); for(const [k,xs] of grouped()){ L.push(''); L.push(k+' ('+dname(k)+')'); xs.forEach(x=>L.push('  '+lineOf(x,false))); } return L.join('\n'); };
B.ics=()=>{ const BY=['SU','MO','TU','WE','TH','FR','SA']; const p=n=>pad(n); const loc=x=>x.getFullYear()+p(x.getMonth()+1)+p(x.getDate())+'T'+p(x.getHours())+p(x.getMinutes())+'00';
  const txt=s=>String(s).replace(/[\\;,]/g,m=>'\\'+m).replace(/\n/g,' '); const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Northpeak Studios//Trace//EN','X-WR-CALNAME:Trace reminders'];
  for(const r of Store.reminders()){ if(r.on===false) continue; const [hh,mm]=(r.time||'08:00').split(':'); const d=new Date(); d.setHours(+hh||0,+mm||0,0,0); if(d<Date.now()) d.setDate(d.getDate()+1);
    const days=r.days&&r.days.length&&r.days.length<7?';BYDAY='+r.days.map(i=>BY[i]).join(','):'';
    L.push('BEGIN:VEVENT','UID:'+r.id+'@trace.northpeak','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z','DTSTART:'+loc(d),'DTEND:'+loc(new Date(d.getTime()+600000)),'RRULE:FREQ='+(days?'WEEKLY'+days:'DAILY'),'SUMMARY:'+txt('Trace: '+r.what+(amtOf(r)?' ('+amtOf(r)+')':'')),'DESCRIPTION:'+txt('Reminder from Trace. Open Trace to log it: https://northpeakstudios.github.io/trace/#log'),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+txt(r.what),'TRIGGER:PT0M','END:VALARM','END:VEVENT'); }
  L.push('END:VCALENDAR'); return L.join('\r\n'); };
const h=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
B.html=()=>{ const ms=medRows(); const rs=Store.reminders();
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trace export</title><style>body{font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;max-width:720px;margin:0 auto;padding:16px;color:#111}h1{font-size:22px}h2{font-size:18px;margin-top:24px}h3{font-size:15px;margin:16px 0 4px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #ddd;padding:4px;text-align:left}li{margin:2px 0}.m{color:#666}</style></head><body>'
   +'<h1>Trace export</h1><p class="m">Made '+h(new Date().toLocaleString())+' · '+inRange().length+' entries · a personal journal, not medical advice.</p>'
   +(rs.length?'<h2>Reminders</h2><ul>'+rs.map(r=>'<li>'+h(r.time)+' · '+h(r.what)+(amtOf(r)?' · '+h(amtOf(r)):'')+' · '+h(daysTxt(r))+(r.on===false?' · off':'')+'</li>').join('')+'</ul>':'')
   +(ms.length?'<h2>What I log</h2><table><tr><th>What</th><th>Times</th><th>Days</th><th>Usually logged as</th></tr>'+ms.map(o=>'<tr><td>'+h(o.name)+'</td><td>'+o.n+'</td><td>'+o.days.size+'</td><td>'+h(o.usual||'–')+'</td></tr>').join('')+'</table>':'')
   +'<h2>Logs</h2>'+grouped().map(([k,xs])=>'<h3>'+h(k)+' ('+dname(k)+')</h3><ul>'+xs.map(x=>'<li>'+h(lineOf(x,false))+'</li>').join('')+'</ul>').join('')+'</body></html>'; };

/* ---------- a small real PDF writer (Helvetica, US Letter, wraps and pages) ---------- */
function pdfText(lines){ // lines: [{t,b,s,g}] t=text b=bold s=size g=gap before
  const W=612,H=792,M=50; const pages=[]; let cur=[], y=H-M;
  const asc=s=>String(s).replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/[•·]/g,'-').replace(/…/g,'...').replace(/[^\x20-\x7e]/g,'?');
  const wrap=(t,size)=>{ const max=Math.floor((W-2*M)/(size*0.5)); const out=[]; for(const para of String(t).split('\n')){ let l=''; for(const w of para.split(' ')){ if((l+' '+w).trim().length>max){ if(l) out.push(l); l=w; while(l.length>max){ out.push(l.slice(0,max)); l=l.slice(max); } } else l=(l?l+' ':'')+w; } out.push(l); } return out; };
  for(const ln of lines){ const s=ln.s||10; y-=(ln.g||0); for(const part of wrap(asc(ln.t),s)){ if(y-s<M){ pages.push(cur); cur=[]; y=H-M; } y-=s*1.35; cur.push({x:M,y,s,b:ln.b,t:part}); } }
  pages.push(cur);
  const objs=[]; const add=s=>{ objs.push(s); return objs.length; };
  const cat=add(''), pgs=add(''), f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'), f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids=[]; pages.forEach((pg,i)=>{ let c='BT\n'; for(const o of pg){ c+='/'+(o.b?'F2':'F1')+' '+o.s+' Tf 1 0 0 1 '+o.x+' '+o.y.toFixed(1)+' Tm ('+o.t.replace(/[\\()]/g,m=>'\\'+m)+') Tj\n'; } c+='/F1 8 Tf 1 0 0 1 '+M+' 30 Tm (Trace by Northpeak Studios - a personal journal, not medical advice - page '+(i+1)+' of '+pages.length+') Tj\nET';
    const cs=add('<< /Length '+c.length+' >>\nstream\n'+c+'\nendstream'); kids.push(add('<< /Type /Page /Parent '+pgs+' 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 '+f1+' 0 R /F2 '+f2+' 0 R >> >> /Contents '+cs+' 0 R >>')); });
  objs[cat-1]='<< /Type /Catalog /Pages '+pgs+' 0 R >>'; objs[pgs-1]='<< /Type /Pages /Kids ['+kids.map(k=>k+' 0 R').join(' ')+'] /Count '+kids.length+' >>';
  let out='%PDF-1.4\n'; const off=[]; objs.forEach((o,i)=>{ off.push(out.length); out+=(i+1)+' 0 obj\n'+o+'\nendobj\n'; });
  const xref=out.length; out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objs.length+1)+' /Root '+cat+' 0 R >>\nstartxref\n'+xref+'\n%%EOF';
  return out; }
B.pdf=()=>{ const L=[{t:'Trace export',b:1,s:18},{t:'Made '+new Date().toLocaleString()+' - '+inRange().length+' entries'+(range==='all'?'':' (last '+range+' days)'),s:9,g:2}];
  const ms=medRows(); if(ms.length){ L.push({t:'What I log',b:1,s:13,g:10}); ms.forEach(o=>L.push({t:o.name+' - '+o.n+'x on '+o.days.size+' days - usually logged as '+(o.usual||'-')+(o.rem?' - reminder '+o.rem:''),s:10})); }
  const rs=Store.reminders(); if(rs.length){ L.push({t:'Reminders',b:1,s:13,g:10}); rs.forEach(r=>L.push({t:r.time+' - '+r.what+(amtOf(r)?' - '+amtOf(r):'')+' - '+daysTxt(r)+(r.on===false?' - off':''),s:10})); }
  L.push({t:'Logs',b:1,s:13,g:10}); for(const [k,xs] of grouped()){ L.push({t:k+' ('+dname(k)+')',b:1,s:10,g:5}); xs.forEach(x=>L.push({t:'   '+lineOf(x,false),s:9.5})); }
  return pdfText(L); };

const FORMATS=[
 {id:'json',name:'Full backup',ext:'json',type:'application/json',line:'Everything: logs, reminders, urges, settings. Import it back any time.',pro:1},
 {id:'csv',name:'Spreadsheet of logs',ext:'csv',type:'text/csv',line:'One row per log, for Excel, Numbers or Google Sheets.',pro:1},
 {id:'meds',name:'Meds summary',ext:'csv',file:'meds',type:'text/csv',line:'One row per thing you log: times, days, first and last.',pro:1},
 {id:'rems',name:'Reminders list',ext:'csv',file:'reminders',type:'text/csv',line:'Your reminders as a spreadsheet.',pro:1},
 {id:'pdf',name:'PDF',ext:'pdf',type:'application/pdf',line:'A tidy file to keep, print or send.',pro:1},
 {id:'md',name:'Markdown',ext:'md',type:'text/markdown',line:'For notes apps like Obsidian, Notion or Axon.',pro:1},
 {id:'txt',name:'Plain text',ext:'txt',type:'text/plain',line:'Opens anywhere.',pro:1},
 {id:'html',name:'Web page',ext:'html',type:'text/html',line:'A readable page that opens in any browser.',pro:1},
 {id:'ics',name:'Calendar (reminders)',ext:'ics',type:'text/calendar',line:'All your reminders as repeating Calendar events with alerts. Free.'}
];
function doExport(id){ const f=FORMATS.find(x=>x.id===id); if(!f) return; if(f.pro&&!P()){ toast('Export is part of Trace Pro'); location.hash='#pro'; return; }
  if(id==='ics'&&!Store.reminders().filter(r=>r.on!==false).length) return toast('No reminders that are on');
  try{ const data=B[id](); save('trace-'+(f.file||(id==='csv'?'logs':id==='json'?'backup':'export'))+'-'+stamp()+'.'+f.ext,data,f.type); toast(f.name+' ready ✓'); }catch(e){ console.warn(e); toast('Couldn’t make that file'); } }

/* ---------- import: parsers ---------- */
const MON={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11};
function parseDate(s){ s=String(s||'').trim().replace(/^'/,''); let m;
  if((m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(+m[1],m[2]-1,+m[3]);
  if((m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) return new Date(m[3].length===2?2000+ +m[3]:+m[3],m[1]-1,+m[2]);
  if((m=s.match(/(?:^|\s)(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i))) return new Date(m[3]?+m[3]:new Date().getFullYear(),MON[m[1].toLowerCase()],+m[2]);
  return null; }
function parseTime(s){ const m=String(s||'').match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?/i); if(!m) return null; let hh=+m[1]; const mm=+m[2]; if(m[3]){ const pm=/p/i.test(m[3]); if(hh===12) hh=pm?12:0; else if(pm) hh+=12; } if(hh>23||mm>59) return null; return [hh,mm]; }
function at(d,tm){ const x=new Date(d.getTime()); if(tm) x.setHours(tm[0],tm[1],0,0); else x.setHours(12,0,0,0); return x.getTime(); }
const clip=(s,n)=>String(s==null?'':s).replace(/^'(?=[=+\-@])/,'').trim().slice(0,n);
const okT=t=>typeof t==='number'&&isFinite(t)&&t>946684800000&&t<Date.now()+366*DAY;
function cleanFeel(f){ if(!f||typeof f!=='object') return null; const o={}; for(const [k] of Store.METRICS){ const v=Math.round(+f[k]); if(v>=1&&v<=5) o[k]=v; } return Object.keys(o).length?o:null; }
function cleanEntry(x){ if(!x||typeof x!=='object') return null; let t=typeof x.t==='number'?x.t:Date.parse(x.t||x.time||x.date); if(!okT(t)) return null;
  const e={t,what:clip(x.what,60),amt:clip(x.amt,20),unit:clip(x.unit,20),notes:clip(x.notes,600),feel:cleanFeel(x.feel),fx:Array.isArray(x.fx)?x.fx.map(f=>clip(f,40).toLowerCase()).filter(Boolean).slice(0,20):[],kind:x.what?'sub':'chk'};
  e.feelAt=(e.feel||e.fx.length)?(okT(x.feelAt)?x.feelAt:t):null; if(typeof x.rem==='string') e.rem=x.rem.slice(0,40);
  if(x.ctx&&typeof x.ctx==='object'){ const c={}; for(const [k,v] of Object.entries(x.ctx).slice(0,8)){ const a=[].concat(v).map(s=>clip(s,40)).filter(Boolean).slice(0,10); if(a.length) c[clip(k,20)]=a; } if(Object.keys(c).length) e.ctx=c; }
  if(!e.what&&!e.feel&&!e.fx.length&&!e.notes) return null; return e; }
function cleenRem(r){ if(!r||typeof r!=='object') return null; const what=clip(r.what||r.name,60); const tm=parseTime(r.time); if(!what||!tm) return null;
  const days=Array.isArray(r.days)?[...new Set(r.days.map(Number).filter(d=>d>=0&&d<=6))]:daysFrom(r.days); return {what,amt:clip(r.amt,20),unit:clip(r.unit,20),time:pad(tm[0])+':'+pad(tm[1]),days:days&&days.length?days:[0,1,2,3,4,5,6],on:!(r.on===false||/^(off|no|false|0)$/i.test(String(r.on))),_kind:'r'}; }
function daysFrom(s){ s=String(s||'').toLowerCase(); if(!s||/every|daily|all/.test(s)) return [0,1,2,3,4,5,6]; const out=[]; ['su','mo','tu','we','th','fr','sa'].forEach((d,i)=>{ if(new RegExp('\\b'+d).test(s)) out.push(i); }); return out; }
function cleanUrge(u){ if(!u||typeof u!=='object'||!okT(u.t)) return null; return {t:u.t,end:okT(u.end)?u.end:null,what:clip(u.what,60),i:Math.max(1,Math.min(10,Math.round(+u.i||5))),out:['passed','acted'].includes(u.out)?u.out:undefined,_kind:'u'}; }
const sigE=e=>Math.floor(e.t/60000)+'|'+Store.keyOf(e.what)+'|'+Store.keyOf(e.amt);
const sigR=r=>Store.keyOf(r.what)+'|'+r.time;
const sigU=u=>Math.floor(u.t/60000)+'|'+Store.keyOf(u.what);

function fromJSON(txt){ let j; try{ j=JSON.parse(txt); }catch(e){ return {err:'That file isn’t valid JSON.'}; }
  const ents=Array.isArray(j)?j:Array.isArray(j.entries)?j.entries:null; if(!ents&&!Array.isArray(j.reminders)) return {err:'That JSON isn’t a Trace backup (no entries or reminders in it).'};
  const bad={n:0}; const map=(a,f)=>(Array.isArray(a)?a:[]).map(x=>{ const y=f(x); if(!y) bad.n++; return y; }).filter(Boolean);
  return {fmt:'JSON backup',entries:map(ents,cleanEntry),reminders:map(j.reminders,cleenRem),urges:map(j.urges,cleanUrge),prefs:j.prefs&&typeof j.prefs==='object'?j.prefs:null,bad:bad.n}; }

function parseCSV(txt){ const rows=[]; let row=[], cell='', q=false; txt=String(txt).replace(/^\uFEFF/,''); const sep=(txt.split('\n')[0].split(';').length>txt.split('\n')[0].split(',').length)?';':(txt.split('\n')[0].includes('\t')&&!txt.split('\n')[0].includes(',')?'\t':',');
  for(let i=0;i<txt.length;i++){ const c=txt[i]; if(q){ if(c==='"'){ if(txt[i+1]==='"'){ cell+='"'; i++; } else q=false; } else cell+=c; } else if(c==='"') q=true; else if(c===sep){ row.push(cell); cell=''; } else if(c==='\n'||c==='\r'){ if(c==='\r'&&txt[i+1]==='\n') i++; row.push(cell); rows.push(row); row=[]; cell=''; } else cell+=c; if(rows.length>20000) break; }
  if(cell!==''||row.length){ row.push(cell); rows.push(row); } return rows.filter(r=>r.some(c=>String(c).trim()!=='')); }
const FIELDS=[['skip','— skip —'],['datetime','Date + time'],['date','Date'],['time','Time'],['what','What'],['amount','Amount'],['unit','Unit'],['notes','Notes'],['effects','Effects'],...Store.METRICS.map(m=>[m[0],m[1]+' (1–5)']),['rdays','Reminder days'],['ron','Reminder on/off']];
function guess(hd){ const s=String(hd||'').toLowerCase().trim();
  if(/^(date ?time|timestamp|when|logged at|datetime)$/.test(s)) return 'datetime'; if(/^(date|day)$/.test(s)) return 'date'; if(/^(time|hour|at)$/.test(s)) return 'time';
  if(/^(what|name|item|med|meds|medication|medicine|substance|supplement|drug|thing)$/.test(s)) return 'what'; if(/^(amount|amt|qty|quantity|count|how much)$/.test(s)) return 'amount'; if(/^(unit|units)$/.test(s)) return 'unit';
  if(/^(notes?|comments?|memo)$/.test(s)) return 'notes'; if(/^(effects?|side effects?|symptoms?)$/.test(s)) return 'effects'; if(/^days$/.test(s)) return 'rdays'; if(/^(on|enabled|active)$/.test(s)) return 'ron';
  const m=Store.METRICS.find(x=>x[0]===s); return m?m[0]:'skip'; }
function fromCSV(txt,mapping,kindForce){ const rows=parseCSV(txt); if(!rows.length) return {err:'That file is empty.'};
  const hasHead=rows[0].some(c=>guess(c)!=='skip'); const head=hasHead?rows[0]:rows[0].map((_,i)=>'Column '+(i+1)); const body=hasHead?rows.slice(1):rows;
  mapping=mapping||head.map(guess); if(!hasHead&&!mapping.some(m=>m!=='skip')){ mapping=head.map((_,i)=>i===0?'datetime':i===1?'what':i===2?'amount':i===3?'unit':'skip'); }
  const kind=kindForce||(mapping.includes('rdays')||(mapping.includes('time')&&!mapping.includes('date')&&!mapping.includes('datetime'))?'reminders':'logs');
  const out={fmt:'CSV',kind,head,mapping,sample:body.slice(0,5),entries:[],reminders:[],urges:[],bad:0};
  for(const r of body){ const g=k=>{ const i=mapping.indexOf(k); return i<0?'':String(r[i]==null?'':r[i]).trim(); };
    if(kind==='reminders'){ const x=cleenRem({what:g('what'),time:g('time')||g('datetime'),days:daysFrom(g('rdays')),amt:g('amount'),unit:g('unit'),on:g('ron')||'on'}); x?out.reminders.push(x):out.bad++; continue; }
    const dt=g('datetime'); let d=parseDate(dt||g('date')); let tm=parseTime(dt?dt.replace(/^\d{4}-\d{2}-\d{2}T?/,' '):g('time'));
    if(!d&&dt&&!isNaN(Date.parse(dt))){ const D=new Date(Date.parse(dt)); d=D; tm=[D.getHours(),D.getMinutes()]; }
    if(!d){ out.bad++; continue; } const feel={}; Store.METRICS.forEach(m=>{ const v=g(m[0]); if(v) feel[m[0]]=v; });
    let what=g('what'); if(/^\(?check-?in\)?$/i.test(what)) what='';
    const e=cleanEntry({t:at(d,tm),what,amt:g('amount'),unit:g('unit'),notes:g('notes'),fx:g('effects')?g('effects').split(/[;|]/).map(s=>s.trim()):[],feel}); e?out.entries.push(e):out.bad++; }
  return out; }

function fromText(txt){ const out={fmt:'Text / Markdown',entries:[],reminders:[],urges:[],bad:0,skipped:0}; let cur=null, sec='';
  for(let raw of String(txt).split(/\r?\n/)){ let l=raw.trim(); if(!l) continue;
    const hd=l.match(/^#{1,6}\s*(.*)$/); if(hd){ const t=hd[1].trim(); const d=parseDate(t); if(d){ cur=d; sec='logs'; } else if(/remind/i.test(t)) sec='rem'; else if(/what i log/i.test(t)) sec='skip'; else sec='logs'; continue; }
    if(/^[A-Z ]{4,}$/.test(l)){ sec=/REMIND/.test(l)?'rem':'logs'; continue; } // plain-text export section titles
    if(sec==='skip'||/^\|/.test(l)||/^_.*_$/.test(l)||/not medical advice/i.test(l)||/^trace export/i.test(l)){ out.skipped++; continue; }
    l=l.replace(/^([-*•+]|\d+[.)])\s+/,'').replace(/^\[[ x]\]\s*/i,'');
    const dOnly=parseDate(l); if(dOnly&&/^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{2,4}|[a-z]{3,9}\.? \d{1,2},? \d{4})\s*(\([a-z]{3}\))?$/i.test(l)){ cur=dOnly; continue; }
    let d=null, rest=l, m;
    if((m=rest.match(/^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{2,4})[ ,T]*/))){ d=parseDate(m[1]); rest=rest.slice(m[0].length); }
    else if((m=rest.match(/^(?:[a-z]{3},?\s+)?((?:jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)[,:]?\s*/i))){ d=parseDate(m[1]); rest=rest.slice(m[0].length); }
    let tm=null; if((m=rest.match(/^(?:at\s+)?(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?)\s*[·|:\-–—]?\s*/i))){ tm=parseTime(m[1]); rest=rest.slice(m[0].length); }
    if(sec==='rem'){ const parts=rest.split(/\s+·\s+|\s+\|\s+/); const r=cleenRem({what:parts[0],time:tm?pad(tm[0])+':'+pad(tm[1]):'',days:daysFrom(parts.slice(1).join(' ')),on:/\boff\b/.test(parts.slice(1).join(' '))?'off':'on',amt:(parts[1]&&/^\d/.test(parts[1]))?parts[1].split(' ')[0]:'',unit:(parts[1]&&/^\d/.test(parts[1]))?parts[1].split(' ').slice(1).join(' '):''}); r?out.reminders.push(r):out.bad++; continue; }
    const base=d||cur; if(!base&&!tm){ out.bad++; continue; }
    const parts=rest.split(/\s+·\s+|\s+\|\s+|\s+[–—]\s+/).map(s=>s.trim()).filter(Boolean); if(!parts.length){ out.bad++; continue; }
    let what=parts.shift(), amt='', unit='', notes='', fx=[], feel={};
    for(const p of parts){ let mm;
      if((mm=p.match(/^effects?:\s*(.*)$/i))) fx=mm[1].split(/,\s*/); else if((mm=p.match(/^notes?:\s*(.*)$/i))) notes=mm[1];
      else if(Store.METRICS.some(x=>new RegExp('^'+x[0]+'\\s+[1-5]','i').test(p))) p.split(/,\s*/).forEach(q=>{ const z=q.match(/^(\w+)\s+([1-5])$/); if(z) feel[z[1].toLowerCase()]=+z[2]; });
      else if(!amt&&(mm=p.match(/^(\d+(?:[.,]\d+)?|½|¼)\s*(.*)$/))){ amt=mm[1]; unit=mm[2]; } else notes=notes?notes+' · '+p:p; }
    if(!amt&&(m=what.match(/^(.*?\D)\s+(\d+(?:\.\d+)?)\s*([a-zA-Zµ]+)?$/))){ what=m[1].trim(); amt=m[2]; unit=m[3]||''; }
    if(/^check-?in$/i.test(what)) what='';
    const e=cleanEntry({t:at(base||new Date(),tm),what,amt,unit,notes,fx,feel}); e?out.entries.push(e):out.bad++; }
  return out; }

function fromICS(txt){ const s=String(txt).replace(/\r?\n[ \t]/g,''); if(!/BEGIN:VCALENDAR/i.test(s)) return {err:'That isn’t a calendar (.ics) file.'};
  const out={fmt:'Calendar (.ics)',entries:[],reminders:[],urges:[],bad:0}; const BY={SU:0,MO:1,TU:2,WE:3,TH:4,FR:5,SA:6};
  for(const ev of s.split(/BEGIN:VEVENT/i).slice(1)){ const g=k=>{ const m=ev.match(new RegExp('^'+k+'(?:;[^:\\r\\n]*)?:(.*)$','im')); return m?m[1].trim():''; };
    let sum=g('SUMMARY').replace(/\\([,;\\])/g,'$1').replace(/\\n/gi,' ').replace(/^trace:\s*/i,''); let amt='', unit=''; const am=sum.match(/^(.*)\s+\((\d+(?:\.\d+)?)\s*([^)]*)\)$/); if(am){ sum=am[1]; amt=am[2]; unit=am[3]; }
    const ds=g('DTSTART'); const m=ds.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/); if(!sum||!m){ out.bad++; continue; }
    let hh=+(m[4]||8), mm=+(m[5]||0); if(/Z$/.test(ds)&&m[4]){ const D=new Date(Date.UTC(+m[1],m[2]-1,+m[3],hh,mm)); hh=D.getHours(); mm=D.getMinutes(); }
    const rr=g('RRULE'); let days; const bd=rr.match(/BYDAY=([A-Z,0-9+-]+)/i); if(bd) days=bd[1].split(',').map(x=>BY[x.replace(/[^A-Z]/gi,'').toUpperCase()]).filter(x=>x!=null); else if(/FREQ=DAILY/i.test(rr)) days=[0,1,2,3,4,5,6]; else days=[new Date(+m[1],m[2]-1,+m[3]).getDay()];
    const r=cleenRem({what:sum,time:pad(hh)+':'+pad(mm),days,amt,unit,on:'on'}); r?out.reminders.push(r):out.bad++; }
  return out; }

function detect(name,txt){ name=String(name||'').toLowerCase(); const head=String(txt).slice(0,400).trim();
  if(/\.json$/.test(name)||/^[\[{]/.test(head)) return 'json'; if(/\.ics$/.test(name)||/BEGIN:VCALENDAR/i.test(head)) return 'ics';
  if(/\.(csv|tsv)$/.test(name)) return 'csv'; if(/\.(md|markdown|txt|text)$/.test(name)) return 'txt';
  const first=head.split('\n')[0]; return (first.split(',').length>=3&&!/·/.test(first))?'csv':'txt'; }
function parse(kind,txt,opts){ try{ return kind==='json'?fromJSON(txt):kind==='ics'?fromICS(txt):kind==='csv'?fromCSV(txt,opts&&opts.mapping,opts&&opts.kind):fromText(txt); }catch(e){ console.warn(e); return {err:'Couldn’t read that file.'}; } }
function dedupe(res){ const se=new Set(Store.entries().map(sigE)), sr=new Set(Store.reminders().map(sigR)), su=new Set(Store.urges().map(sigU)); let dup=0;
  const keep=(arr,sig,set)=>arr.filter(x=>{ const k=sig(x); if(set.has(k)){ dup++; return false; } set.add(k); return true; });
  return {entries:keep(res.entries||[],sigE,se),reminders:keep(res.reminders||[],sigR,sr),urges:keep(res.urges||[],sigU,su),dup}; }

/* ---------- import UI: pick → preview with counts → import ---------- */
const MAXB=8*1024*1024;
function pickFile(accept){ const i=document.createElement('input'); i.type='file'; i.accept=accept||'.json,.csv,.tsv,.txt,.md,.markdown,.text,.ics,application/json,text/csv,text/plain,text/markdown,text/calendar'; i.style.display='none'; document.body.appendChild(i);
  i.onchange=()=>{ const f=i.files&&i.files[0]; i.remove(); if(!f) return; if(f.size>MAXB) return toast('That file is over 8 MB'); if(/\.(pdf|png|jpe?g|heic|docx?|xlsx?|zip)$/i.test(f.name)) return toast('Trace imports JSON, CSV, TXT, Markdown or .ics files');
    const rd=new FileReader(); rd.onload=()=>preview(f.name,String(rd.result||'')); rd.onerror=()=>toast('Couldn’t open that file'); rd.readAsText(f); };
  i.click(); }
function preview(name,txt,forceKind,opts){ const kind=forceKind||detect(name,txt); const res=parse(kind,txt,opts);
  if(res.err) return sheet(`<h3>Import</h3><p>${esc(res.err)}</p><p class="muted small">Trace can import a Trace backup (.json), a spreadsheet (.csv), text or Markdown lines (.txt / .md) and calendar reminders (.ics). Nothing was changed.</p><button class="btn ghost block" data-close="1">OK</button>`);
  const d=dedupe(res); const total=d.entries.length+d.reminders.length+d.urges.length;
  const prefsOK=res.prefs&&['card','refill','reportQ','weight','height','cmdf','cmdfav'].some(k=>res.prefs[k]);
  const rowE=x=>`<tr><td>${esc(Store.dayKey(x.t))} ${esc(hm(x.t))}</td><td>${esc(x.what||'Check-in')}</td><td>${esc(amtOf(x)||'')}</td></tr>`;
  const rowR=r=>`<tr><td class="nw">${esc(r.time)}</td><td>${esc(r.what)}</td><td>${esc(daysTxt(r))}</td></tr>`;
  const mapUI=kind==='csv'?`<details class="fold" ${res.mapping.every(m=>m==='skip')?'open':''}><summary>Match the columns</summary><div class="imap">${res.head.map((hd,i)=>`<label>${esc(String(hd).slice(0,30))}<select data-col="${i}">${FIELDS.map(([k,l])=>`<option value="${k}" ${res.mapping[i]===k?'selected':''}>${l}</option>`).join('')}</select></label>`).join('')}</div>
    <div class="seg" id="ikind"><a href="javascript:void 0" data-k="logs" class="${res.kind==='logs'?'on':''}">These are logs</a><a href="javascript:void 0" data-k="reminders" class="${res.kind==='reminders'?'on':''}">These are reminders</a></div></details>`:'';
  sheet(`<h3>Import ${esc(res.fmt)}</h3><p class="muted small" style="margin-top:-6px">${esc(name)}</p>
   <div class="stat"><div><b>${d.entries.length}</b><span>new logs</span></div><div><b>${d.reminders.length}</b><span>reminders</span></div><div><b>${d.dup}</b><span>already here</span></div></div>
   ${res.bad?`<p class="muted small">${res.bad} line${res.bad===1?'':'s'} Trace couldn’t read (no date or name) will be left out.</p>`:''}${d.urges.length?`<p class="muted small">Plus ${d.urges.length} urge timer record${d.urges.length===1?'':'s'}.</p>`:''}
   ${mapUI}
   ${d.entries.length?`<h3 style="margin-top:12px">Preview</h3><div class="tw"><table class="rt">${d.entries.slice(0,8).map(rowE).join('')}</table></div>${d.entries.length>8?`<p class="muted small">…and ${d.entries.length-8} more</p>`:''}`:''}
   ${d.reminders.length?`<h3 style="margin-top:12px">Reminders</h3><div class="tw"><table class="rt">${d.reminders.slice(0,8).map(rowR).join('')}</table></div>`:''}
   ${prefsOK?`<label class="row" style="color:var(--fg);font-size:15px;margin-top:10px"><span>Also restore settings (meds card, refill counts, command folders)</span><input type="checkbox" id="ipf" class="fx0" style="width:auto"></label>`:''}
   <button class="btn big block" id="igo" ${total||prefsOK?'':'disabled'}>${total?'Import '+total:'Nothing new to import'}</button><button class="btn ghost block" data-close="1">Cancel</button>`,root=>{
    if(kind==='csv'){ const re=()=>{ const mp=[...root.querySelectorAll('[data-col]')].map(s=>s.value); const k=(root.querySelector('#ikind a.on')||{}).dataset; preview(name,txt,'csv',{mapping:mp,kind:k&&k.k}); };
      root.querySelectorAll('[data-col]').forEach(s=>s.onchange=re); root.querySelector('#ikind').onclick=e=>{ const a=e.target.closest('a'); if(!a) return; e.preventDefault(); root.querySelectorAll('#ikind a').forEach(x=>x.classList.toggle('on',x===a)); re(); }; }
    root.querySelector('#igo').onclick=()=>{ const n=Store.bulk([...d.entries.map(x=>Object.assign(x,{_kind:'e'})),...d.reminders,...d.urges]);
      const pf=root.querySelector('#ipf'); if(pf&&pf.checked){ const p={}; ['card','refill','reportQ','weight','height','cmdf','cmdfav'].forEach(k=>{ if(res.prefs[k]!=null) p[k]=res.prefs[k]; }); Store.savePrefs(p); }
      closeSheet(); toast('Imported '+n+' ✓'+(d.dup?' · '+d.dup+' already here':'')); route(); };
   }); }
function pasteImport(){ sheet(`<h3>Paste to import</h3><p class="muted small" style="margin-top:-6px">One log per line, like <b>2026-10-20 8:00 AM Coffee 1 cup</b> or <b>Oct 20, 9:15 PM · Vitamin D · 1 capsule</b>. A CSV or a Trace backup works too.</p><textarea id="ipx" style="min-height:150px" placeholder="2026-10-20 08:00 · Coffee · 1 cup"></textarea><button class="btn block" id="ipg">Preview</button><button class="btn ghost block" data-close="1">Cancel</button>`,root=>{
  root.querySelector('#ipg').onclick=()=>{ const v=root.querySelector('#ipx').value; if(!v.trim()) return toast('Paste something first'); preview('pasted text',v); }; }); }

/* ---------- Export & import screen ---------- */
routes.export=(v,sub)=>{ const n=Store.entries().length;
  v.innerHTML=`<p style="margin:0 0 4px"><a href="#more">‹ More</a></p><h2>Export &amp; import</h2><p class="muted" style="margin-top:-4px">Files are made and read on this phone. Nothing is uploaded.</p>
   <h3 style="margin-top:16px">Export</h3><div class="seg" id="xr"><a href="javascript:void 0" data-r="all" class="${range==='all'?'on':''}">All time</a><a href="javascript:void 0" data-r="90" class="${range==='90'?'on':''}">90 days</a><a href="javascript:void 0" data-r="30" class="${range==='30'?'on':''}">30 days</a></div>
   <div class="card list" id="xl">${FORMATS.map(f=>`<div class="it" data-x="${f.id}" role="button" tabindex="0"><span class="fmt">.${f.ext}</span><span class="wh"><b class="wrap">${f.name}</b><small>${f.line}</small></span>${f.pro&&!P()?'<span class="pill">Pro</span>':''}</div>`).join('')}</div>
   <p class="muted small">${n} entries${range==='all'?'':' · the range applies to logs; the backup is always everything'}. ${P()?'':'Exports are part of Trace Pro, except the calendar file.'}</p>
   <h3 style="margin-top:18px" id="imp">Import</h3><div class="card"><p class="muted" style="margin-top:0">Bring logs in from a Trace backup, a spreadsheet, a notes app or a calendar. You’ll see a preview and a count first, and anything already in Trace is skipped.</p>
   <button class="btn block" id="ipick">Choose a file</button><button class="btn ghost block" id="ipaste">Paste text</button>
   <p class="muted small" style="margin-bottom:0">Works with .json (Trace backup), .csv, .txt, .md and .ics. Free.</p></div>`;
  v.querySelector('#xr').onclick=e=>{ const a=e.target.closest('a'); if(!a) return; e.preventDefault(); range=a.dataset.r; routes.export(v); };
  v.querySelectorAll('[data-x]').forEach(el=>el.onclick=()=>doExport(el.dataset.x));
  v.querySelector('#ipick').onclick=()=>pickFile(); v.querySelector('#ipaste').onclick=pasteImport;
  if(sub==='import') setTimeout(()=>{ const i=document.getElementById('imp'); if(i) i.scrollIntoView({block:'start'}); },50); };
routes.import=v=>routes.export(v,'import');
window.TrcX={FORMATS,build:B,save,doExport,pickFile,pasteImport,preview,parse,detect,dedupe,pdfText,medRows,setRange:r=>{range=r;}};
})();
