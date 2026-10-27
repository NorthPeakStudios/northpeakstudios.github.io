/* Northpeak auto-update · v1 · shared by every Northpeak web app (copy this file into the app folder).
   Keeps an open or home-screen app on the newest deployed version with no swipe-close and no reinstall.
   Use:  <script src="np-update.js" data-sw="sw.js" defer></script>   (data-sw="" for a page with no service worker)
   Optional, set before or after this script loads:
     window.npUpdate = { safe: function () { return true; },          // false = never reload right now (mid-review, overlay open...)
                         toast: function (msg, onTap) {} };           // the app's own toast; default is a small pill at the top
   How it works: it asks for a new sw.js (and re-reads the page itself as a backup check) when the app opens, every time it comes
   back to the foreground, when the network returns and every 30 min. A new worker takes over at once (skipWaiting + clients.claim
   in sw.js); the page then reloads itself once when that is safe — the person hasn't touched the screen since the app opened or came
   back, nothing typed, no input focused, the app's own safe() agrees — and otherwise shows "update ready · tap to refresh" and
   applies on the next return to the app. At most one automatic reload per 30 s, so it can never loop. */
(function () {
  if (window.__npUpd) return; window.__npUpd = 1;
  var me = document.currentScript, swAttr = me ? me.getAttribute('data-sw') : 'sw.js';
  var swUrl = swAttr == null ? 'sw.js' : swAttr;
  var nav = ('serviceWorker' in navigator) && (location.protocol === 'https:' || location.hostname === 'localhost') && swUrl ? navigator.serviceWorker : null;
  var KEY = 'npUpd:' + location.pathname;
  var hadCtl = !!(nav && nav.controller), reg = null, pending = false, reloading = false, lastCheck = 0, resumedAt = Date.now(), touchedAt = 0;
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (t) { window.addEventListener(t, function () { touchedAt = Date.now(); }, { capture: true, passive: true }); });
  var untouched = function () { return touchedAt < resumedAt; };
  var base = null, pageUrl = location.pathname, tEl = null;
  var hook = function () { return window.npUpdate || {}; };

  function busyField(el) {
    if (!el || el.disabled || el.readOnly) return false;
    if (el.isContentEditable) return true;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
    return el.tagName === 'INPUT' && !/^(button|submit|reset|checkbox|radio|range|color|file|image|hidden)$/i.test(el.type || '');
  }
  function typedSomething() {
    var els = document.querySelectorAll('textarea, input, [contenteditable]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i]; if (!busyField(el) || el.offsetParent === null) continue;
      if (el.isContentEditable) { if ((el.textContent || '').trim()) return true; continue; }
      if (el.tagName === 'SELECT') continue;
      if (el.value && el.value !== el.defaultValue && /\S/.test(el.value)) return true;
    }
    return false;
  }
  function safe() {
    try { if (busyField(document.activeElement)) return false; } catch (e) {}
    if (typedSomething()) return false;
    var h = hook(); try { if (typeof h.safe === 'function' && !h.safe()) return false; } catch (e) { return false; }
    return true;
  }
  function recentlyReloaded() { var t = 0; try { t = +sessionStorage.getItem(KEY) || 0; } catch (e) {} return Date.now() - t < 30000; }
  function reload() {
    if (reloading || recentlyReloaded()) return false;
    reloading = true;
    try { sessionStorage.setItem(KEY, String(Date.now())); sessionStorage.setItem(KEY + ':done', '1'); } catch (e) {}
    location.reload();
    return true;
  }
  function pill(msg, onTap, ms) {
    var h = hook(); if (typeof h.toast === 'function') { try { h.toast(msg, onTap); return; } catch (e) {} }
    if (tEl) tEl.remove();
    tEl = document.createElement('button'); tEl.type = 'button'; tEl.textContent = msg; tEl.setAttribute('role', 'status');
    tEl.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%);z-index:2147483647;' +
      'padding:9px 16px;border-radius:999px;border:0;font:600 14px/1.2 -apple-system,system-ui,sans-serif;color:#fff;background:rgba(20,20,24,.92);' +
      'box-shadow:0 6px 24px rgba(0,0,0,.25);-webkit-tap-highlight-color:transparent;max-width:90vw;white-space:nowrap;touch-action:manipulation';
    tEl.onclick = function () { if (onTap) onTap(); if (tEl) { tEl.remove(); tEl = null; } };
    document.body.appendChild(tEl);
    if (ms) { var el = tEl; setTimeout(function () { if (el === tEl && tEl) { tEl.remove(); tEl = null; } }, ms); }
  }
  function ready(why) {
    pending = true;
    if (document.hidden || reloading) return;               // applied when the app comes back
    if (untouched() && safe() && reload()) return;
    pill('update ready · tap to refresh', function () { try { sessionStorage.removeItem(KEY); } catch (e) {} reload(); });
  }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return s.length + ':' + h; }
  function pageCheck() {   // backup: did the page itself change? (catches browsers where the worker check is flaky, and pages with no worker)
    return fetch(pageUrl + '?npu=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : null; }).then(function (t) {
      if (t == null) return;
      var h = hash(t);
      if (base == null) { base = h; return; }
      if (h !== base) { base = h; if (reg) { reg.update().catch(function () {}); setTimeout(function () { if (!pending) ready('page'); }, 12000); } else ready('page'); }
    }).catch(function () {});
  }
  function check(force) {
    if (!force && Date.now() - lastCheck < 3000) return; lastCheck = Date.now();
    if (reg) reg.update().catch(function () {});
    pageCheck();
  }
  function resumed() {
    resumedAt = Date.now() + 1;
    if (pending && safe() && reload()) return;
    if (pending) ready('resume');
    check(false);
  }
  if (nav) {
    nav.addEventListener('controllerchange', function () { if (!hadCtl) { hadCtl = true; return; } ready('sw'); });
    nav.register(swUrl, { updateViaCache: 'none' }).then(function (r) {
      reg = r;
      var skip = function (w) { try { if (w) w.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {} };
      if (r.waiting && nav.controller) skip(r.waiting);
      r.addEventListener('updatefound', function () { var w = r.installing; if (w) w.addEventListener('statechange', function () { if (w.state === 'installed' && nav.controller) skip(w); }); });
      check(true);
    }).catch(function () { pageCheck(); });
  } else setTimeout(pageCheck, 1500);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) resumed(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) resumed(); });
  window.addEventListener('focus', function () { check(false); });
  window.addEventListener('online', function () { check(true); });
  setInterval(function () { if (!document.hidden) check(true); }, 30 * 60000);
  try { if (sessionStorage.getItem(KEY + ':done') === '1') { sessionStorage.removeItem(KEY + ':done'); setTimeout(function () { pill('updated ✓', null, 2200); }, 700); } } catch (e) {}
  window.__npUpdState = function () { return { pending: pending, reloading: reloading, sw: !!reg, base: base, safe: safe(), untouched: untouched() }; };
})();
