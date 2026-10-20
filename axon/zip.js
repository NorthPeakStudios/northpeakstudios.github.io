/* Axon zip helper (store writer, store/deflate reader with a built-in inflate fallback) · Northpeak Studios */
(function () {
  'use strict';
  var T = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function dosTime(d) {
    return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
      date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
  }
  // files: [{name, data(Uint8Array|string), date}]
  function make(files) {
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      var crc = crc32(data), dt = dosTime(f.date || new Date());
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dt.time, true); h.setUint16(12, dt.date, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, dt.time, true); c.setUint16(14, dt.date, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var csize = central.reduce(function (s, p) { return s + p.length; }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, csize, true); e.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
  }
  /* pure-JS raw DEFLATE decoder (RFC 1951), for browsers without DecompressionStream (older iOS Safari) */
  var LBASE = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  var LEXT = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  var DBASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  var DEXT = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  var CLORD = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
  function huff(lens, n) { /* canonical Huffman table: counts per length + symbols sorted by code */
    var count = new Uint16Array(16), offs = new Uint16Array(16), sym = new Uint16Array(n), i;
    for (i = 0; i < n; i++) count[lens[i]]++;
    count[0] = 0;
    for (i = 1; i < 16; i++) offs[i] = offs[i - 1] + count[i - 1];
    for (i = 0; i < n; i++) if (lens[i]) sym[offs[lens[i]]++] = i;
    return { count: count, sym: sym };
  }
  function jsInflate(src) {
    var pos = 0, bit = 0, bits = 0, out = new Uint8Array(Math.max(1024, src.length * 4)), op = 0;
    function need(n) { while (bits < n) { if (pos >= src.length) throw new Error('Zip data ends early'); bit |= src[pos++] << bits; bits += 8; } }
    function get(n) { need(n); var v = bit & ((1 << n) - 1); bit >>>= n; bits -= n; return v; }
    function grow(k) { if (op + k <= out.length) return; var b = new Uint8Array(Math.max(out.length * 2, op + k)); b.set(out.subarray(0, op)); out = b; }
    function decode(h) { /* read one symbol, bit by bit (codes are stored MSB-first) */
      var code = 0, first = 0, index = 0;
      for (var len = 1; len < 16; len++) {
        code |= get(1); var c = h.count[len];
        if (code - c < first) return h.sym[index + (code - first)];
        index += c; first += c; first <<= 1; code <<= 1;
      }
      throw new Error('Bad zip data');
    }
    var FL = null, FD = null;
    for (;;) {
      var last = get(1), type = get(2);
      if (type === 0) {
        bit = 0; bits = 0; /* to a byte boundary */
        if (pos + 4 > src.length) throw new Error('Zip data ends early');
        var len = src[pos] | (src[pos + 1] << 8); pos += 4;
        if (pos + len > src.length) throw new Error('Zip data ends early');
        grow(len); out.set(src.subarray(pos, pos + len), op); op += len; pos += len;
      } else if (type === 1 || type === 2) {
        var lt, dt;
        if (type === 1) {
          if (!FL) { var l = new Uint8Array(288), k; for (k = 0; k < 144; k++) l[k] = 8; for (; k < 256; k++) l[k] = 9; for (; k < 280; k++) l[k] = 7; for (; k < 288; k++) l[k] = 8; FL = huff(l, 288); var d = new Uint8Array(30); d.fill(5); FD = huff(d, 30); }
          lt = FL; dt = FD;
        } else {
          var hl = get(5) + 257, hd = get(5) + 1, hc = get(4) + 4, cl = new Uint8Array(19), q;
          for (q = 0; q < hc; q++) cl[CLORD[q]] = get(3);
          var ch = huff(cl, 19), ls = new Uint8Array(hl + hd), m = 0;
          while (m < hl + hd) {
            var sy = decode(ch);
            if (sy < 16) ls[m++] = sy;
            else { var rep = 0, val = 0; if (sy === 16) { if (!m) throw new Error('Bad zip data'); val = ls[m - 1]; rep = 3 + get(2); } else if (sy === 17) rep = 3 + get(3); else rep = 11 + get(7); while (rep--) ls[m++] = val; }
          }
          lt = huff(ls.subarray(0, hl), hl); dt = huff(ls.subarray(hl), hd);
        }
        for (;;) {
          var s = decode(lt);
          if (s < 256) { grow(1); out[op++] = s; }
          else if (s === 256) break;
          else {
            s -= 257; if (s >= 29) throw new Error('Bad zip data');
            var ln = LBASE[s] + get(LEXT[s]), ds = decode(dt); if (ds >= 30) throw new Error('Bad zip data');
            var dist = DBASE[ds] + get(DEXT[ds]); if (dist > op) throw new Error('Bad zip data');
            grow(ln); for (var x = 0; x < ln; x++) { out[op] = out[op - dist]; op++; }
          }
        }
      } else throw new Error('Bad zip data');
      if (last) break;
    }
    return out.subarray(0, op);
  }
  async function inflate(data) {
    if (typeof DecompressionStream !== 'undefined') {
      try {
        var ds = new DecompressionStream('deflate-raw');
        var stream = new Blob([data]).stream().pipeThrough(ds);
        return new Uint8Array(await new Response(stream).arrayBuffer());
      } catch (e) { /* some versions know DecompressionStream but not deflate-raw: fall through */ }
    }
    return jsInflate(data);
  }

  // returns [{name, data:Uint8Array, date:ms (0 when the zip has none)}]
  async function read(buf) {
    var u = new Uint8Array(buf), v = new DataView(u.buffer, u.byteOffset, u.byteLength), dec = new TextDecoder();
    var eocd = -1;
    for (var i = u.length - 22; i >= Math.max(0, u.length - 65557); i--) { if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw new Error('Not a zip file');
    var count = v.getUint16(eocd + 10, true), p = v.getUint32(eocd + 16, true), out = [];
    for (var n = 0; n < count; n++) {
      if (v.getUint32(p, true) !== 0x02014b50) break;
      var method = v.getUint16(p + 10, true), csz = v.getUint32(p + 20, true), dt = v.getUint16(p + 12, true), dd = v.getUint16(p + 14, true);
      var nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
      var name = dec.decode(u.subarray(p + 46, p + 46 + nl));
      p += 46 + nl + xl + cl;
      if (name.slice(-1) === '/') continue;
      var lnl = v.getUint16(lo + 26, true), lxl = v.getUint16(lo + 28, true), start = lo + 30 + lnl + lxl;
      var raw = u.subarray(start, start + csz);
      var data = null;
      try { data = method === 0 ? raw : method === 8 ? await inflate(raw) : null; } catch (e) { out.bad = (out.bad || 0) + 1; out.err = e.message; }
      if (!data && method !== 0 && method !== 8) out.bad = (out.bad || 0) + 1;
      var when = dd ? new Date((dd >> 9) + 1980, ((dd >> 5) & 15) - 1, dd & 31, dt >> 11, (dt >> 5) & 63, (dt & 31) * 2).getTime() : 0;
      if (data) out.push({ name: name, data: data, date: when > 0 ? when : 0 });
    }
    return out;
  }
  window.Zip = { make: make, read: read, crc32: crc32, jsInflate: jsInflate };
})();
