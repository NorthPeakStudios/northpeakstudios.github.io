// Cadence · Lessons & Exercises hub
(() => {
  const GROUPS=[['staff','📝 Staff reading'],['keys','🎹 Keyboard & fretboard'],['brass','🎺 Brass fingerings'],['build','🏗️ Construction'],['ear','🎧 Ear training'],['rhythm','🥁 Rhythm']];
  routes.mt = v => { const xs=MT.stats();
    v.innerHTML=`<h2>Lessons & Exercises</h2><p class="muted">Step-through lessons, then drills you set up exactly how you want (⚙︎). Every exercise has a settings page and a shareable custom link.</p>
    <div class="grid"><a class="tile" href="#lessons"><b>📘 Lessons</b><span>basics → rhythm → scales → intervals → chords → progressions → advanced</span></a><a class="tile" href="#rp"><b>🎯 Relative pitch trainer</b><span>hear scale degrees, intervals and melodies in a key</span></a><a class="tile" href="#mttools"><b>🧰 Theory tools</b><span>tempo tapper, calculators, note converter, 12-tone matrix, staff paper</span></a></div>
    ${GROUPS.map(([g,label])=>{ const ids=MT.ORDER.filter(id=>MT.EX[id].group===g); if(!ids.length) return ''; return `<h3>${label}</h3><div class="mtlist">${ids.map(id=>{ const e=MT.EX[id], r=xs[id]; return `<div class="mtrow"><a href="#ex/${id}" class="mtgo${e.pro&&!(window.CadPro&&CadPro.pro())?' locked':''}"><b>${e.title}</b><span>${e.desc}${r&&r.n?` · ${Math.round(r.c/r.n*100)}% of ${r.n}`:''}</span></a><a class="mtcog" href="#exs/${id}" aria-label="settings">⚙︎</a></div>`; }).join('')}</div>`; }).join('')}`; };
})();

(() => { // entry points on Learn, Practice, Ear and Tools
  const wrap=(name,html)=>{ const f=routes[name]; if(!f) return; routes[name]=(v,...a)=>{ f(v,...a); if(a.length&&a[0]) return; v.insertAdjacentHTML('afterbegin',html); }; };
  wrap('learn','<a class="tile mtbanner" href="#lessons"><b>📘 Lessons</b><span>step-through lessons: the basics to augmented 6ths</span></a>');
  wrap('practice','<a class="tile mtbanner" href="#mt"><b>🎯 Exercises</b><span>note, key, interval, chord ID · keyboard · fretboard · brass fingerings · construction · ear · rhythm — each fully customizable</span></a>');
  wrap('ear','<a class="tile mtbanner" href="#rp"><b>🎯 Relative pitch trainer</b><span>scale degrees, intervals and melodies in a key — sing-back with the tuner</span></a>');
  window.EXTRA_TOOLS=(window.EXTRA_TOOLS||[]).concat([['#mttools','🧰 Theory tools','tempo tapper, calculators, converter, 12-tone matrix, staff paper'],['#mt','🎯 Exercises','customizable drills + shareable links']]);
})();
