(function(){
  var btn=document.querySelector('.menu-btn'),nav=document.getElementById('site-nav');
  if(btn&&nav){btn.addEventListener('click',function(){var o=nav.classList.toggle('open');btn.setAttribute('aria-expanded',o?'true':'false');});
    nav.addEventListener('click',function(e){if(e.target.tagName==='A'){nav.classList.remove('open');btn.setAttribute('aria-expanded','false');}});}
  var rm=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els=[].slice.call(document.querySelectorAll('.rv'));
  function count(el){var t=+el.getAttribute('data-n'),suf=el.getAttribute('data-suf')||'',fmt=function(v){return v.toLocaleString('en-US')+suf;};
    if(rm){el.textContent=fmt(t);return;}var s=null,d=1300;function f(ts){if(!s)s=ts;var p=Math.min(1,(ts-s)/d),e=1-Math.pow(1-p,3);el.textContent=fmt(Math.round(t*e));if(p<1)requestAnimationFrame(f);}requestAnimationFrame(f);}
  var nums=[].slice.call(document.querySelectorAll('[data-n]'));
  if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')});return;}
  var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
  els.forEach(function(e){io.observe(e)});
  var tk=0;function sweep(){tk=0;var vh=window.innerHeight;els.forEach(function(e){if(!e.classList.contains('in')&&e.getBoundingClientRect().top<vh)e.classList.add('in');});}
  window.addEventListener('scroll',function(){if(!tk){tk=1;setTimeout(sweep,150);}},{passive:true});
  var io2=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){count(x.target);io2.unobserve(x.target);}})},{threshold:.4});
  nums.forEach(function(e){io2.observe(e)});
})();
