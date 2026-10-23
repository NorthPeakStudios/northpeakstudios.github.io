// Music theory engine: spelled notes, intervals, chords, scales, keys, roman numerals, pc-sets.
const T = (() => {
  const LETTERS = ['C','D','E','F','G','A','B'];
  const NAT = [0,2,4,5,7,9,11];
  const ACC = {'-2':'𝄫','-1':'♭','0':'','1':'♯','2':'𝄪'};
  const ACC_ASCII = {'-2':'bb','-1':'b','0':'','1':'#','2':'x'};
  const mod = (a,n)=>((a%n)+n)%n;

  function note(letter, acc=0, oct=4){ return {l:letter, a:acc, o:oct}; }
  function parse(str){ // "C#4", "Bb", "Ebb3", "F##"
    const m = /^([A-Ga-g])(##|#|x|bb|b|𝄪|♯|♭|𝄫)?(-?\d)?$/.exec(str.trim());
    if(!m) return null;
    const accMap={'#':1,'♯':1,'##':2,'x':2,'𝄪':2,'b':-1,'♭':-1,'bb':-2,'𝄫':-2};
    return note(LETTERS.indexOf(m[1].toUpperCase()), m[2]?accMap[m[2]]:0, m[3]!==undefined?+m[3]:4);
  }
  const pc = n => mod(NAT[n.l]+n.a,12);
  const midi = n => 12*(n.o+1)+NAT[n.l]+n.a;
  const name = (n, withOct=false) => LETTERS[n.l]+ACC[n.a]+(withOct?n.o:'');
  const ascii = (n, withOct=false) => LETTERS[n.l]+ACC_ASCII[n.a]+(withOct?n.o:'');
  const freq = m => 440*Math.pow(2,(m-69)/12);
  const diatonicIndex = n => n.o*7+n.l;

  // ---------- intervals ----------
  const PERFECT = {1:0,4:5,5:7}; const MAJOR = {2:2,3:4,6:9,7:11};
  const QNAME = {P:'perfect',M:'major',m:'minor',A:'augmented',d:'diminished',AA:'doubly augmented',dd:'doubly diminished'};
  const NUMNAME = {1:'unison',2:'2nd',3:'3rd',4:'4th',5:'5th',6:'6th',7:'7th',8:'octave',9:'9th',10:'10th',11:'11th',12:'12th',13:'13th',14:'14th',15:'double octave'};
  function intervalBetween(a,b){ // a below (or equal) b
    const gen = diatonicIndex(b)-diatonicIndex(a); // 0 = unison
    const semis = midi(b)-midi(a);
    const simpleGen = mod(gen,7); const octs = Math.floor(gen/7);
    const num = simpleGen+1;
    const base = (PERFECT[num]!==undefined?PERFECT[num]:MAJOR[num]) + 12*octs;
    const diff = semis-base;
    let q;
    if(PERFECT[num]!==undefined){ q = {0:'P',1:'A',2:'AA','-1':'d','-2':'dd'}[diff]; }
    else { q = {0:'M','-1':'m',1:'A',2:'AA','-2':'d','-3':'dd'}[diff]; }
    return {num: gen+1, simple: num, q: q||'?', semis};
  }
  function intervalName(iv){ return (QNAME[iv.q]||iv.q)+' '+(NUMNAME[iv.num]|| (iv.num+'th')); }
  function intervalShort(iv){ return iv.q+iv.num; }
  // transpose spelled note up by interval code like "m3", "P5", "A4", "M9"
  function up(n, code){
    const m=/^(AA|dd|P|M|m|A|d)(\d+)$/.exec(code); const q=m[1], num=+m[2];
    const gen=num-1; const simple=mod(gen,7)+1; const octs=Math.floor(gen/7);
    let base = PERFECT[simple]!==undefined?PERFECT[simple]:MAJOR[simple];
    let off;
    if(PERFECT[simple]!==undefined) off={P:0,A:1,AA:2,d:-1,dd:-2}[q]; else off={M:0,m:-1,A:1,AA:2,d:-2,dd:-3}[q];
    const target = midi(n)+base+12*octs+off;
    const di = diatonicIndex(n)+gen; const l=mod(di,7), o=Math.floor(di/7);
    const nat = 12*(o+1)+NAT[l];
    return note(l, target-nat, o);
  }
  // simpler robust down():
  function below(n, code){ const di=diatonicIndex(n)-(+code.replace(/\D/g,'')-1); const l=mod(di,7),o=Math.floor(di/7);
    const probe=up(note(l,0,o),code); return note(l, midi(n)-midi(probe), o); }

  // ---------- chords ----------
  const CHORDS = {
    maj:{iv:['M3','P5'], sym:'', name:'major triad'},
    min:{iv:['m3','P5'], sym:'m', name:'minor triad'},
    dim:{iv:['m3','d5'], sym:'°', name:'diminished triad'},
    aug:{iv:['M3','A5'], sym:'+', name:'augmented triad'},
    sus4:{iv:['P4','P5'], sym:'sus4', name:'suspended 4th'},
    sus2:{iv:['M2','P5'], sym:'sus2', name:'suspended 2nd'},
    maj7:{iv:['M3','P5','M7'], sym:'maj7', name:'major seventh'},
    dom7:{iv:['M3','P5','m7'], sym:'7', name:'dominant seventh'},
    min7:{iv:['m3','P5','m7'], sym:'m7', name:'minor seventh'},
    hdim7:{iv:['m3','d5','m7'], sym:'ø7', name:'half-diminished seventh'},
    dim7:{iv:['m3','d5','d7'], sym:'°7', name:'fully diminished seventh'},
    minmaj7:{iv:['m3','P5','M7'], sym:'m(maj7)', name:'minor-major seventh'},
    augmaj7:{iv:['M3','A5','M7'], sym:'+maj7', name:'augmented major seventh'},
    dom9:{iv:['M3','P5','m7','M9'], sym:'9', name:'dominant ninth'},
    maj9:{iv:['M3','P5','M7','M9'], sym:'maj9', name:'major ninth'},
    min9:{iv:['m3','P5','m7','M9'], sym:'m9', name:'minor ninth'},
    dom7b9:{iv:['M3','P5','m7','m9'], sym:'7♭9', name:'dominant seventh flat nine'},
    dom7s9:{iv:['M3','P5','m7','A9'], sym:'7♯9', name:'dominant seventh sharp nine'},
    dom13:{iv:['M3','P5','m7','M9','M13'], sym:'13', name:'dominant thirteenth'},
    min11:{iv:['m3','P5','m7','M9','P11'], sym:'m11', name:'minor eleventh'},
    maj7s11:{iv:['M3','P5','M7','M9','A11'], sym:'maj7♯11', name:'Lydian major seventh (♯11)'},
  };
  function chord(root, type){ return [root, ...CHORDS[type].iv.map(c=>up(root,c))]; }
  function chordSymbol(root,type){ return name(root)+CHORDS[type].sym; }
  // identify chord from set of pitch classes (returns list of {rootPc,type})
  function identify(pcs){
    const set=[...new Set(pcs.map(p=>mod(p,12)))].sort((a,b)=>a-b); const out=[];
    const order=['maj','min','dim','aug','dom7','maj7','min7','hdim7','dim7','minmaj7','augmaj7','sus4','sus2','dom9','maj9','min9','dom7b9','dom7s9'];
    for(const t of order){ const ivs=[0,...CHORDS[t].iv.map(c=>{const r=up(note(0,0,4),c);return mod(midi(r)-60,12);})];
      const tset=[...new Set(ivs)].sort((a,b)=>a-b); if(tset.length!==set.length) continue;
      for(const r of set){ const tr=set.map(p=>mod(p-r,12)).sort((a,b)=>a-b); if(tr.join()===tset.join()) out.push({rootPc:r,type:t}); }
    }
    return out;
  }

  // ---------- scales / modes ----------
  const SCALES = {
    major:{iv:['M2','M3','P4','P5','M6','M7'], name:'major (Ionian)'},
    natural_minor:{iv:['M2','m3','P4','P5','m6','m7'], name:'natural minor (Aeolian)'},
    harmonic_minor:{iv:['M2','m3','P4','P5','m6','M7'], name:'harmonic minor'},
    melodic_minor:{iv:['M2','m3','P4','P5','M6','M7'], name:'melodic minor (ascending / jazz minor)'},
    dorian:{iv:['M2','m3','P4','P5','M6','m7'], name:'Dorian'},
    phrygian:{iv:['m2','m3','P4','P5','m6','m7'], name:'Phrygian'},
    lydian:{iv:['M2','M3','A4','P5','M6','M7'], name:'Lydian'},
    mixolydian:{iv:['M2','M3','P4','P5','M6','m7'], name:'Mixolydian'},
    locrian:{iv:['m2','m3','P4','d5','m6','m7'], name:'Locrian'},
    major_pentatonic:{iv:['M2','M3','P5','M6'], name:'major pentatonic'},
    minor_pentatonic:{iv:['m3','P4','P5','m7'], name:'minor pentatonic'},
    blues:{iv:['m3','P4','A4','P5','m7'], name:'blues (minor blues hexatonic)'},
    whole_tone:{iv:['M2','M3','A4','A5','A6'], name:'whole-tone'},
    altered:{iv:['m2','A2','M3','A4','A5','m7'], name:'altered (super-Locrian)'},
    lydian_dominant:{iv:['M2','M3','A4','P5','M6','m7'], name:'Lydian dominant'},
    phrygian_dominant:{iv:['m2','M3','P4','P5','m6','m7'], name:'Phrygian dominant'},
  };
  function scale(root,type){ return [root, ...SCALES[type].iv.map(c=>up(root,c))]; }

  // ---------- keys ----------
  const SHARP_ORDER=['F','C','G','D','A','E','B'], FLAT_ORDER=['B','E','A','D','G','C','F'];
  const MAJOR_KEYS = {'C':0,'G':1,'D':2,'A':3,'E':4,'B':5,'F#':6,'C#':7,'F':-1,'Bb':-2,'Eb':-3,'Ab':-4,'Db':-5,'Gb':-6,'Cb':-7};
  const MINOR_KEYS = {'A':0,'E':1,'B':2,'F#':3,'C#':4,'G#':5,'D#':6,'A#':7,'D':-1,'G':-2,'C':-3,'F':-4,'Bb':-5,'Eb':-6,'Ab':-7};
  function keySigAccidentals(n){ return n>=0? SHARP_ORDER.slice(0,n).map(x=>x+'♯') : FLAT_ORDER.slice(0,-n).map(x=>x+'♭'); }
  const pretty = s => s.replace(/#/g,'♯').replace(/b(?=$|\d)/g,'♭');

  // ---------- roman numerals ----------
  const ROMAN=['I','II','III','IV','V','VI','VII'];
  function triadQuality(r,t,f){ const a=mod(midi(t)-midi(r),12), b=mod(midi(f)-midi(r),12);
    if(a===4&&b===7) return 'maj'; if(a===3&&b===7) return 'min'; if(a===3&&b===6) return 'dim'; if(a===4&&b===8) return 'aug'; return '?'; }
  function seventhQuality(r,t,f,s){ const q=triadQuality(r,t,f), x=mod(midi(s)-midi(r),12);
    if(q==='maj'&&x===11) return 'maj7'; if(q==='maj'&&x===10) return 'dom7'; if(q==='min'&&x===10) return 'min7'; if(q==='dim'&&x===10) return 'hdim7'; if(q==='dim'&&x===9) return 'dim7'; if(q==='min'&&x===11) return 'minmaj7'; if(q==='aug'&&x===11) return 'augmaj7'; return '?'; }
  function romanFor(degree, quality){ // degree 0..6
    let r=ROMAN[degree];
    if(['min','dim','min7','hdim7','dim7','minmaj7'].includes(quality)) r=r.toLowerCase();
    const suf={maj:'',min:'',dim:'°',aug:'+',maj7:'maj7',dom7:'7',min7:'7',hdim7:'ø7',dim7:'°7',minmaj7:'(maj7)',augmaj7:'+maj7'}[quality]||'';
    return r+suf;
  }
  // diatonic chords in a key: mode 'major' or 'minor' (minor uses harmonic-minor V and vii°)
  function diatonic(tonic, mode, sevenths=false){
    const nat = scale(tonic, mode==='major'?'major':'natural_minor');
    const raised = mode==='minor'? up(nat[6],'A1') : nat[6];
    const out=[];
    for(let d=0; d<7; d++){
      const useRaised = mode==='minor' && (d===4 || d===6);
      const deg=[0,2,4,6].map(k=>{ const i=(d+k)%7; return (i===6 && useRaised)? raised : nat[i]; });
      const q = sevenths? seventhQuality(deg[0],deg[1],deg[2],deg[3]) : triadQuality(deg[0],deg[1],deg[2]);
      out.push({degree:d, notes: sevenths?deg:deg.slice(0,3), quality:q, roman: romanFor(d,q)});
    }
    return out;
  }
  // inversion figures
  const TRIAD_INV=['','6','6/4'], SEV_INV=['7','6/5','4/3','4/2'];

  // ---------- pc-set theory ----------
  function normalize(pcs){ return [...new Set(pcs.map(p=>mod(p,12)))].sort((a,b)=>a-b); }
  function rotations(s){ return s.map((_,i)=>s.slice(i).concat(s.slice(0,i).map(x=>x+12))); }
  function normalOrder(pcs){ // Rahn tie-break (compare from the right)
    const s=normalize(pcs); if(s.length<2) return s; let best=null;
    for(const r of rotations(s)){ const z=r.map(x=>x-r[0]); if(!best||cmpRight(z,best.z)<0) best={r,z}; }
    return best.r.map(x=>mod(x,12));
  }
  function cmpRight(a,b){ for(let i=a.length-1;i>=0;i--){ if(a[i]!==b[i]) return a[i]-b[i]; } return 0; }
  function primeForm(pcs){
    const s=normalize(pcs); if(!s.length) return [];
    const cands=[]; for(const set of [s, normalize(s.map(x=>-x))]) for(const r of rotations(set)) cands.push(r.map(x=>x-r[0]));
    cands.sort(cmpRight); return cands[0];
  }
  function intervalVector(pcs){ const s=normalize(pcs), v=[0,0,0,0,0,0];
    for(let i=0;i<s.length;i++) for(let j=i+1;j<s.length;j++){ let d=mod(s[j]-s[i],12); if(d>6) d=12-d; v[d-1]++; } return v; }
  const FORTE = {'0,1,2':'3-1','0,1,3':'3-2','0,1,4':'3-3','0,1,5':'3-4','0,1,6':'3-5','0,2,4':'3-6','0,2,5':'3-7','0,2,6':'3-8','0,2,7':'3-9','0,3,6':'3-10','0,3,7':'3-11','0,4,8':'3-12',
    '0,1,2,3':'4-1','0,1,2,4':'4-2','0,1,3,4':'4-3','0,1,2,5':'4-4','0,1,2,6':'4-5','0,1,2,7':'4-6','0,1,4,5':'4-7','0,1,5,6':'4-8','0,1,6,7':'4-9','0,2,3,5':'4-10','0,1,3,5':'4-11','0,2,3,6':'4-12','0,1,3,6':'4-13','0,2,3,7':'4-14','0,1,4,6':'4-Z15','0,1,5,7':'4-16','0,3,4,7':'4-17','0,1,4,7':'4-18','0,1,4,8':'4-19','0,1,5,8':'4-20','0,2,4,6':'4-21','0,2,4,7':'4-22','0,2,5,7':'4-23','0,2,4,8':'4-24','0,2,6,8':'4-25','0,3,5,8':'4-26','0,2,5,8':'4-27','0,3,6,9':'4-28','0,1,3,7':'4-Z29'};
  const forte = pcs => FORTE[primeForm(pcs).join(',')]||null;
  const pcLabel = p => p===10?'T':p===11?'E':String(p);
  const Tn=(pcs,n)=>pcs.map(p=>mod(p+n,12)), TnI=(pcs,n)=>pcs.map(p=>mod(n-p,12));

  // ---------- neo-Riemannian ----------
  // triad as {root pc, minor bool}
  function P(t){ return {r:t.r, minor:!t.minor}; }
  function R(t){ return t.minor? {r:mod(t.r+3,12),minor:false} : {r:mod(t.r+9,12),minor:true}; }
  function L(t){ return t.minor? {r:mod(t.r+8,12),minor:false} : {r:mod(t.r+4,12),minor:true}; }
  const PC_NAMES_SHARP=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
  const triadName = t => PC_NAMES_SHARP[t.r]+(t.minor?' minor':' major');

  // ---------- transposing instruments (written -> concert: interval concert sounds BELOW written) ----------
  const INSTRUMENTS = {
    'B♭ trumpet':{down:'M2', range:'F♯3–C6 (written, typical)'}, 'B♭ clarinet':{down:'M2'}, 'B♭ tenor sax':{down:'M9'},
    'E♭ alto sax':{down:'M6'}, 'E♭ baritone sax':{down:'M13'}, 'F horn':{down:'P5'}, 'B♭ soprano sax':{down:'M2'},
    'A clarinet':{down:'m3'}, 'English horn (F)':{down:'P5'}, 'Piccolo (sounds 8va)':{up:'P8'}, 'Guitar (sounds 8vb)':{down:'P8'}, 'Double bass (sounds 8vb)':{down:'P8'},
  };
  function writtenToConcert(n,inst){ const i=INSTRUMENTS[inst]; return i.down?below(n,i.down):up(n,i.up); }
  function concertToWritten(n,inst){ const i=INSTRUMENTS[inst]; return i.down?up(n,i.down):below(n,i.up); }

  return {LETTERS,NAT,mod,note,parse,pc,midi,name,ascii,freq,diatonicIndex,intervalBetween,intervalName,intervalShort,up,below,
    CHORDS,chord,chordSymbol,identify,SCALES,scale,MAJOR_KEYS,MINOR_KEYS,keySigAccidentals,pretty,diatonic,romanFor,triadQuality,seventhQuality,TRIAD_INV,SEV_INV,
    normalize,normalOrder,primeForm,intervalVector,forte,pcLabel,Tn,TnI,P,R,L,triadName,PC_NAMES_SHARP,INSTRUMENTS,writtenToConcert,concertToWritten,QNAME,NUMNAME};
})();
if(typeof module!=='undefined') module.exports=T;
