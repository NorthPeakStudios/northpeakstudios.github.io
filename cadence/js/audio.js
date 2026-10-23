// Audio: sampled piano (Salamander, CC-BY) with a synthesized fallback, scheduling helpers, mic pitch detection.
const Audio = (() => {
  let ctx=null, master=null, samples={}, sampleState='none'; // none|loading|ready|failed
  const SAMPLE_BASE='https://tonejs.github.io/audio/salamander/';
  const SAMPLE_NOTES=['A0','C1','Ds1','Fs1','A1','C2','Ds2','Fs2','A2','C3','Ds3','Fs3','A3','C4','Ds4','Fs4','A4','C5','Ds5','Fs5','A5','C6','Ds6','Fs6','A6','C7','Ds7','Fs7','A7','C8'];
  const nameToMidi = s => { const m=/^([A-G])(s?)(\d)$/.exec(s); const nat={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]; return 12*(+m[3]+1)+nat+(m[2]?1:0); };
  function ensure(){
    if(!ctx){ ctx=new (window.AudioContext||window.webkitAudioContext)(); master=ctx.createGain(); master.gain.value=0.8;
      const comp=ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination); loadSamples(); }
    if(ctx.state==='suspended') ctx.resume();
    return ctx;
  }
  async function loadSamples(){
    if(sampleState!=='none') return; sampleState='loading'; let ok=0;
    await Promise.all(SAMPLE_NOTES.map(async n=>{ try{ const r=await fetch(SAMPLE_BASE+n+'.mp3'); if(!r.ok) throw 0; const ab=await r.arrayBuffer();
      samples[nameToMidi(n)]=await new Promise((res,rej)=>ctx.decodeAudioData(ab,res,rej)); ok++; }catch(e){} }));
    sampleState = ok>20?'ready':'failed'; document.dispatchEvent(new CustomEvent('piano-state',{detail:sampleState}));
  }
  function nearestSample(m){ let best=null,bd=99; for(const k in samples){ const d=Math.abs(k-m); if(d<bd){bd=d;best=+k;} } return best; }
  function synth(m, t, dur, vel){
    const f=440*Math.pow(2,(m-69)/12); const g=ctx.createGain(); const lp=ctx.createBiquadFilter(); lp.type='lowpass';
    lp.frequency.setValueAtTime(Math.min(12000,f*8),t); lp.frequency.exponentialRampToValueAtTime(Math.max(300,f*2),t+Math.min(2,dur+0.5));
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.35*vel,t+0.008); g.gain.exponentialRampToValueAtTime(0.12*vel,t+0.25);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.6);
    [[1,1],[2,0.45],[3,0.22],[4,0.12],[5,0.06]].forEach(([h,a])=>{ const o=ctx.createOscillator(); o.type= h===1?'triangle':'sine'; o.frequency.value=f*h*(1+0.0004*h*h);
      const og=ctx.createGain(); og.gain.value=a; o.connect(og); og.connect(lp); o.start(t); o.stop(t+dur+0.7); });
    lp.connect(g); g.connect(master);
  }
  function playMidi(m, when=0, dur=1, vel=0.8){
    ensure(); const t=ctx.currentTime+0.03+when;
    if(sampleState==='ready'){ const k=nearestSample(m); if(k!=null){ const src=ctx.createBufferSource(); src.buffer=samples[k]; src.playbackRate.value=Math.pow(2,(m-k)/12);
      const g=ctx.createGain(); g.gain.setValueAtTime(vel,t); g.gain.setValueAtTime(vel,t+dur); g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.5);
      src.connect(g); g.connect(master); src.start(t); src.stop(t+dur+0.6); return; } }
    synth(m,t,dur,vel);
  }
  // play a frequency (for microtones), pure synth
  function playFreq(f, when=0, dur=1){ ensure(); const t=ctx.currentTime+0.03+when; const o=ctx.createOscillator(); o.type='triangle'; o.frequency.value=f;
    const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.3,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+dur+0.05); }
  const chord = (ms, when=0, dur=1.6) => ms.forEach(m=>playMidi(m,when,dur,0.6));
  const arp = (ms, when=0, step=0.55, dur=0.9) => ms.forEach((m,i)=>playMidi(m,when+i*step,dur));
  function click(when=0, accent=false){ ensure(); const t=ctx.currentTime+0.03+when; const o=ctx.createOscillator(); o.frequency.value=accent?1600:1000;
    const g=ctx.createGain(); g.gain.setValueAtTime(0.4,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.05); o.connect(g); g.connect(master); o.start(t); o.stop(t+0.06); }
  function analyser(){ ensure(); const a=ctx.createAnalyser(); a.fftSize=2048; master.connect(a); return a; }

  // ---- mic pitch detection (autocorrelation, McLeod-style normalized) ----
  let micStream=null, micAn=null;
  async function startMic(){ ensure(); micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    const src=ctx.createMediaStreamSource(micStream); micAn=ctx.createAnalyser(); micAn.fftSize=4096; src.connect(micAn); return micAn; }
  function stopMic(){ if(micStream){ micStream.getTracks().forEach(t=>t.stop()); micStream=null; micAn=null; } }
  function detectPitch(an=micAn){
    if(!an) return null; const buf=new Float32Array(an.fftSize); an.getFloatTimeDomainData(buf);
    let rms=0; for(const v of buf) rms+=v*v; rms=Math.sqrt(rms/buf.length); if(rms<0.01) return null;
    const sr=ctx.sampleRate, n=buf.length, minLag=Math.floor(sr/1200), maxLag=Math.floor(sr/60);
    const nsdf=new Float32Array(maxLag+1);
    for(let lag=minLag; lag<=maxLag; lag++){ let ac=0,m=0; for(let i=0;i<n-lag;i++){ ac+=buf[i]*buf[i+lag]; m+=buf[i]*buf[i]+buf[i+lag]*buf[i+lag]; } nsdf[lag]=m?2*ac/m:0; }
    let maxV=0; for(let l=minLag;l<=maxLag;l++) if(nsdf[l]>maxV) maxV=nsdf[l];
    if(maxV<0.6) return null;
    let lag=-1; for(let l=minLag+1;l<maxLag;l++){ if(nsdf[l]>=0.9*maxV && nsdf[l]>=nsdf[l-1] && nsdf[l]>=nsdf[l+1]){ lag=l; break; } }
    if(lag<0) return null;
    const a=nsdf[lag-1], b=nsdf[lag], c=nsdf[lag+1]; const shift=(a-c)/(2*(a-2*b+c)||1);
    const f=sr/(lag+(isFinite(shift)?shift:0));
    const midiF=69+12*Math.log2(f/440); const nearest=Math.round(midiF);
    return {freq:f, midi:nearest, cents:Math.round((midiF-nearest)*100), clarity:maxV};
  }
  function stopAll(){ if(ctx){ try{ ctx.close(); }catch(e){} ctx=null; master=null; } }
  return {stopAll, ensure, playMidi, playFreq, chord, arp, click, analyser, startMic, stopMic, detectPitch, get sampleState(){return sampleState;}, get ctx(){return ctx;}};
})();
