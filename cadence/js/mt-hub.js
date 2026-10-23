// Cadence · Lessons & Exercises hub
(() => {
  const GROUPS=[['staff','📝 Staff reading'],['keys','🎹 Keyboard & fretboard'],['brass','🎺 Brass fingerings'],['build','🏗️ Construction'],['ear','🎧 Ear training'],['rhythm','🥁 Rhythm']];
  routes.mt = v => { const xs=MT.stats();
    v.innerHTML=`<a class="back" href="#practice">← Practice</a><h2>Exercises</h2><p class="muted intro">Tap to start. ⚙︎ sets it up your way.</p>
    ${GROUPS.map(([g,label])=>{ const ids=MT.ORDER.filter(id=>MT.EX[id].group===g); if(!ids.length) return ''; return `<h3 class="sec">${label.replace(/^\S+\s/,'')}</h3><div class="mtlist">${ids.map(id=>{ const e=MT.EX[id], r=xs[id]; return `<div class="mtrow"><a href="#ex/${id}" class="mtgo${e.pro&&!(window.CadPro&&CadPro.pro())?' locked':''}"><b>${e.title}</b><span>${r&&r.n?`${Math.round(r.c/r.n*100)}% of ${r.n}`:e.desc}</span></a><a class="mtcog" href="#exs/${id}" aria-label="settings">⚙︎</a></div>`; }).join('')}</div>`; }).join('')}`; };
})();

(() => { // entry points on Learn, Practice, Ear and Tools
  const wrap=(name,html)=>{ const f=routes[name]; if(!f) return; routes[name]=(v,...a)=>{ f(v,...a); if(a.length&&a[0]) return; const h2=v.querySelector('h2'); h2?h2.insertAdjacentHTML('afterend',html):v.insertAdjacentHTML('afterbegin',html); }; };
  wrap('learn','<a class="tile mtbanner" href="#lessons"><b>📘 Lessons</b><span>step by step, basics to augmented 6ths</span></a>');
  wrap('practice','<a class="tile mtbanner" href="#mt"><b>🎯 Exercises</b><span>staff, keyboard, brass, ear, rhythm drills</span></a>');
  wrap('ear','<a class="tile mtbanner" href="#rp"><b>🎯 Relative pitch</b><span>hear scale degrees in a key</span></a>');
  window.EXTRA_TOOLS=(window.EXTRA_TOOLS||[]).concat([['#mttools','🧰 Theory tools','tapper, calculators, 12-tone matrix…'],['#mt','🎯 Exercises','customizable drills + shareable links']]);
})();
