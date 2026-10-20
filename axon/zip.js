/* Axon zip helper (store writer, store/deflate reader) · Northpeak Studios */
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
  async function inflate(data) {
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot unpack compressed zips');
    var ds = new DecompressionStream('deflate-raw');
    var stream = new Blob([data]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
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
      var data = method === 0 ? raw : method === 8 ? await inflate(raw) : null;
      var when = dd ? new Date((dd >> 9) + 1980, ((dd >> 5) & 15) - 1, dd & 31, dt >> 11, (dt >> 5) & 63, (dt & 31) * 2).getTime() : 0;
      if (data) out.push({ name: name, data: data, date: when > 0 ? when : 0 });
    }
    return out;
  }
  window.Zip = { make: make, read: read, crc32: crc32 };
})();
