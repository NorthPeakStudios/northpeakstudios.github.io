// mood → color. bilinear blend of four corner palettes in OKLab space.
const hex2rgb = h => { h = h.replace('#',''); return [0,2,4].map(i => parseInt(h.slice(i,i+2),16)/255); };
const toLin = c => c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
const toSrgb = c => c <= 0.0031308 ? 12.92*c : 1.055*Math.pow(c, 1/2.4) - 0.055;
function rgb2lab([r,g,b]){
  r=toLin(r); g=toLin(g); b=toLin(b);
  const l=Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b);
  const m=Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b);
  const s=Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b);
  return [0.2104542553*l+0.7936177850*m-0.0040720468*s, 1.9779984951*l-2.4285922050*m+0.4505937099*s, 0.0259040371*l+0.7827717662*m-0.8086757660*s];
}
function lab2rgb([L,a,b]){
  const l=(L+0.3963377774*a+0.2158037573*b)**3, m=(L-0.1055613458*a-0.0638541728*b)**3, s=(L-0.0894841775*a-1.2914855480*b)**3;
  return [4.0767416621*l-3.3077115913*m+0.2309699292*s, -1.2684380046*l+2.6097574011*m-0.3413193965*s, -0.0041960863*l-0.7034186147*m+1.7076147010*s]
    .map(c => Math.min(1, Math.max(0, toSrgb(c))));
}
export const rgb2hex = c => '#' + c.map(x => Math.round(x*255).toString(16).padStart(2,'0')).join('');
// palettes: [glow, second, deep]
const CORNERS = {
  hs: ['#3a55c9','#6a3fb0','#080b26'],   // heavy · still   — ink, dusk violet
  hr: ['#e0285a','#7a2ab8','#1e0614'],   // heavy · restless — ember, bruise
  ls: ['#4fd6c0','#9aa6ff','#06222a'],   // light · still   — sea glass, periwinkle
  lr: ['#ffb03d','#ff5c8a','#2a1006'],   // light · restless — gold, coral
};
const LAB = Object.fromEntries(Object.entries(CORNERS).map(([k,v]) => [k, v.map(h => rgb2lab(hex2rgb(h)))]));
const CHIP_TINT = { warm:[0,0.02,0.035], foggy:[0.02,-0.01,-0.01], electric:[0.02,-0.02,-0.05], hollow:[-0.03,0,0], tender:[0.02,0.03,0.0], sharp:[0.0,0.0,-0.02], tangled:[-0.01,0.02,-0.02], distant:[-0.01,-0.01,-0.03], glowing:[0.04,0.01,0.03], raw:[0,0.04,0.01], open:[0.03,-0.01,0], weightless:[0.04,-0.005,-0.01] };
export function moodColors(v, e, chips = []){
  // v: 0 heavy → 1 light, e: 0 still → 1 restless
  const W4 = [(1-v)*(1-e), (1-v)*e, v*(1-e), v*e], K = ['hs','hr','ls','lr'];
  const out = [0,1,2].map(i => {
    // interpolate lightness and chroma linearly, hue as a weighted direction, so mixes stay vivid
    let L = 0, C = 0, ha = 0, hb = 0;
    K.forEach((k, n) => { const [l, a, b] = LAB[k][i], ch = Math.hypot(a, b); L += l*W4[n]; C += ch*W4[n]; if (ch > 1e-6) { ha += a/ch*W4[n]; hb += b/ch*W4[n]; } });
    const hn = Math.hypot(ha, hb) || 1;
    const mix = [L, C*ha/hn, C*hb/hn];
    for (const c of chips) { const t = CHIP_TINT[c]; if (t && i < 2) { mix[0]+=t[0]*0.6; mix[1]+=t[1]*0.6; mix[2]+=t[2]*0.6; } }
    if (chips.includes('foggy') && i < 2) { mix[1]*=0.8; mix[2]*=0.8; }
    return rgb2hex(lab2rgb(mix));
  });
  return out;
}
export function mixHex(hexes){
  if (!hexes.length) return '#222';
  const labs = hexes.map(h => rgb2lab(hex2rgb(h)));
  const m = [0,1,2].map(j => labs.reduce((s,l) => s + l[j], 0) / labs.length);
  return rgb2hex(lab2rgb(m));
}
export const hexRgb = h => hex2rgb(h).map(x => Math.round(x*255));
const WORDS = [ // rows: still → restless, cols: heavy → light
  ['sunken','fogbound','unhurried','serene'],
  ['aching','wistful','tender','glowing'],
  ['frayed','unsettled','curious','bright'],
  ['stormy','tangled','electric','soaring'],
];
export function moodWord(v, e){
  const c = Math.min(3, Math.floor(v*4)), r = Math.min(3, Math.floor(e*4));
  return WORDS[r][c];
}
export const quadrant = (v, e) => (v < 0.5 ? 'h' : 'l') + (e < 0.5 ? 's' : 'r');
