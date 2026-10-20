/* Axon cloud sync: crypto and transport. Everything leaves this device encrypted. */
(function () {
  'use strict';
  var URL0 = 'https://axon-sync.sites.tab.bot', te = new TextEncoder(), td = new TextDecoder();
  var ITER = 600000;
  function hex(b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join(''); }
  function b64(buf) {
    var u = new Uint8Array(buf), s = '', CH = 0x8000;
    for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH));
    return btoa(s);
  }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function normUser(u) { return String(u || '').trim().toLowerCase(); }
  /* password -> 512 bits with PBKDF2-SHA256: the first half is the encryption key (never leaves the
     device), the second half is the login verifier sent to the server */
  async function derive(user, pass) {
    var base = await crypto.subtle.importKey('raw', te.encode(String(pass).normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
    var bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: te.encode('axon-sync/v1:' + normUser(user)), iterations: ITER }, base, 512));
    return { raw: bits.slice(0, 32), auth: hex(bits.slice(32)) };
  }
  function keyFrom(raw) { return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']); }
  /* the record id is bound in as associated data, so a stored record can't be swapped onto another id */
  async function seal(key, id, text) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: te.encode(id) }, key, te.encode(text)));
    var out = new Uint8Array(13 + ct.length); out[0] = 1; out.set(iv, 1); out.set(ct, 13);
    return b64(out);
  }
  async function open(key, id, data) {
    var u = unb64(data); if (u[0] !== 1) throw new Error('Unknown record format');
    return td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(1, 13), additionalData: te.encode(id) }, key, u.slice(13)));
  }
  /* fast change detector for payload strings (not security) */
  function hash(s) {
    var h1 = 0x811c9dc5, h2 = 0x01000193 ^ s.length;
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822519) ^ (h2 >>> 13); }
    return (h1 >>> 0).toString(36) + '.' + (h2 >>> 0).toString(36) + '.' + s.length.toString(36);
  }
  async function api(path, opt) {
    opt = opt || {};
    var h = { 'content-type': 'application/json' };
    if (opt.token) h.authorization = 'Bearer ' + opt.token;
    var r;
    try { r = await fetch(URL0 + path, { method: opt.body ? 'POST' : (opt.method || 'GET'), headers: h, body: opt.body ? JSON.stringify(opt.body) : (opt.method === 'POST' ? '{}' : undefined), cache: 'no-store', credentials: 'omit' }); }
    catch (e) { var ne = new Error('offline'); ne.offline = true; throw ne; }
    var j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok || !j || !j.ok) { var err = new Error((j && j.error) || ('http_' + r.status)); err.status = r.status; err.body = j; throw err; }
    return j;
  }
  window.AXS = { derive: derive, keyFrom: keyFrom, seal: seal, open: open, hash: hash, api: api, b64: b64, unb64: unb64, normUser: normUser, url: URL0 };
})();
