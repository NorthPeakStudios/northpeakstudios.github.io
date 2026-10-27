// Later · photos (shrunk on the phone before they leave it) and voice notes (MediaRecorder, up to 60 s).
(function(){
function readFile(f){ return new Promise((ok,no)=>{ const r=new FileReader(); r.onload=()=>ok(r.result); r.onerror=()=>no(r.error); r.readAsDataURL(f); }); }
function loadImg(src){ return new Promise((ok,no)=>{ const i=new Image(); i.onload=()=>ok(i); i.onerror=()=>no(new Error('image')); i.src=src; }); }
/* any photo -> JPEG, longest side <= 1280 px, under ~1 MB as base64 */
async function photo(file){
  const url=URL.createObjectURL(file);
  try{
    const img=await loadImg(url); let max=1280, q=0.78, out='';
    for(let tries=0;tries<6;tries++){
      const s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)); const w=Math.max(1,Math.round(img.naturalWidth*s)), h=Math.max(1,Math.round(img.naturalHeight*s));
      const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,w,h); g.drawImage(img,0,0,w,h);
      out=c.toDataURL('image/jpeg',q); if(out.length<=1000000) break; q-=0.12; max=Math.round(max*0.82);
    }
    return { kind:'img', mime:'image/jpeg', data:out };
  } finally { URL.revokeObjectURL(url); }
}
const MAXS=60;
function pickMime(){ const c=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus']; if(!window.MediaRecorder) return null; for(const m of c){ try{ if(MediaRecorder.isTypeSupported(m)) return m; }catch(e){} } return ''; }
/* start recording; returns { stop(): Promise<{kind,mime,data,secs}>, cancel() } */
async function record(onTick){
  if(!navigator.mediaDevices||!window.MediaRecorder) throw new Error('no_mic');
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  const mime=pickMime(); const rec=new MediaRecorder(stream, mime?{mimeType:mime,audioBitsPerSecond:48000}:{}); const parts=[]; const t0=Date.now(); let done=null, cancelled=false;
  rec.ondataavailable=e=>{ if(e.data&&e.data.size) parts.push(e.data); };
  const fin=new Promise(ok=>{ rec.onstop=async()=>{ stream.getTracks().forEach(t=>t.stop()); clearInterval(tk); if(cancelled) return ok(null); const type=(rec.mimeType||mime||'audio/webm').split(';')[0]; const blob=new Blob(parts,{type}); const data=await readFile(blob); ok({ kind:'voice', mime:type, data:data.replace(/^data:[^;,]*(;[^,]*)?,/,'data:'+type+';base64,'), secs:Math.round((Date.now()-t0)/1000) }); }; });
  rec.start(500);
  const tk=setInterval(()=>{ const s=Math.round((Date.now()-t0)/1000); onTick&&onTick(s); if(s>=MAXS&&rec.state==='recording') rec.stop(); },250);
  return { stop:()=>{ if(rec.state==='recording') rec.stop(); return fin; }, cancel:()=>{ cancelled=true; if(rec.state==='recording') rec.stop(); } };
}
window.LtrMedia={photo,record,MAXS};
})();
