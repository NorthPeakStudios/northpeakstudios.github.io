/* Some iOS home-screen launches lay the page out one status bar shorter than the screen (innerHeight = screen.height - ~59): the page cannot
   draw into that bottom strip and the home indicator sits there. Detect it (yes/no only) so CSS drops the home-indicator padding under the tab bar. */
(function(){var on=false;function check(){var s=on;try{var sa=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
if(sa&&window.screen&&innerHeight>=innerWidth){var vv=window.visualViewport,kb=vv&&innerHeight-vv.height>80,d=Math.max(screen.height,screen.width)-innerHeight;if(!kb&&d<=140)s=d>=30;}else s=false;}catch(e){s=false}
if(s!==on){on=s;document.documentElement.classList.toggle('vp-short',s);}}
check();addEventListener('resize',check);addEventListener('orientationchange',function(){setTimeout(check,300)});})();
