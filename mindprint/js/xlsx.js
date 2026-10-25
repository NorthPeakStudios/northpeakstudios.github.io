/* Mindprint spreadsheet export (Pro): a small .xlsx writer (stored zip, inline strings), no libraries. */
(function () {
  'use strict';
  var te = new TextEncoder(), CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc(u) { var c = 0xFFFFFFFF; for (var i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) { // [{name, data:Uint8Array}] -> Blob (no compression)
    var parts = [], cd = [], off = 0;
    files.forEach(function (f) {
      var nm = te.encode(f.name), d = f.data, c = crc(d), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, 0, true); h.setUint16(12, 0x21, true);
      h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nm, d);
      var e = new DataView(new ArrayBuffer(46));
      e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x0800, true); e.setUint16(10, 0, true); e.setUint16(12, 0, true); e.setUint16(14, 0x21, true);
      e.setUint32(16, c, true); e.setUint32(20, d.length, true); e.setUint32(24, d.length, true); e.setUint16(28, nm.length, true); e.setUint32(42, off, true);
      cd.push(new Uint8Array(e.buffer), nm); off += 30 + nm.length + d.length;
    });
    var cdLen = cd.reduce(function (s, x) { return s + x.length; }, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdLen, true); end.setUint32(16, off, true);
    return new Blob(parts.concat(cd, [new Uint8Array(end.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  var x = function (s) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function col(i) { var s = ''; i++; while (i) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function sheet(rows, widths) {
    var o = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>' +
      widths.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols><sheetData>';
    rows.forEach(function (r, ri) { o += '<row r="' + (ri + 1) + '">' + r.map(function (v, ci) { var ref = col(ci) + (ri + 1), st = ri === 0 ? ' s="1"' : ' s="2"';
      return typeof v === 'number' ? '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>' : '<c r="' + ref + '"' + st + ' t="inlineStr"><is><t xml:space="preserve">' + x(v) + '</t></is></c>'; }).join('') + '</row>'; });
    return o + '</sheetData></worksheet>';
  }
  function build(sheets) { // [{name, rows, widths}]
    var f = [], enc = function (n, s) { f.push({ name: n, data: te.encode(s) }); };
    enc('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>');
    enc('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    enc('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      sheets.map(function (s, i) { return '<sheet name="' + x(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>');
    enc('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    enc('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE9E2FF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs></styleSheet>');
    sheets.forEach(function (s, i) { enc('xl/worksheets/sheet' + (i + 1) + '.xml', sheet(s.rows, s.widths)); });
    return zip(f);
  }
  function sheetsFor(Q, D, r, sc, deep, opt) {
    var S = window.MPScore, TAG = function (k) { return S.nm(k); };
    var a = [['#', 'Section', 'Question', 'Your answer', 'Traits it scored']];
    r.answers.forEach(function (an, i) { var q = Q.questions.find(function (z) { return z.id === an.q; }); if (!q) return; var o = q.options[an.a] || {}; var s = o.s || {};
      a.push([i + 1, q.framework, q.text, an.a === -1 ? 'Other: ' + (an.o || '') : o.t || '', Object.keys(s).map(function (k) { return TAG(k) + ' ' + (s[k] > 0 ? '+' : '') + s[k]; }).join(', ')]); });
    var groups = [['Big Five', function (k) { return /^[OCEAN]$/.test(k); }], ['Big Five facets', function (k) { return /^[OCEAN]_/.test(k); }], ['Attachment', function (k) { return /^att_/.test(k); }], ['Conflict style', function (k) { return /^cf_/.test(k); }], ['Values', function (k) { return /^v_/.test(k); }], ['Stress and coping', function (k) { return /^cope_/.test(k); }], ['Decision-making', function (k) { return /^dm_/.test(k); }]];
    var b = [['Framework', 'Trait', 'Score (0-100)', 'Band', 'Questions behind it', 'Note']];
    groups.forEach(function (g) { Object.keys(sc.scales).filter(g[1]).forEach(function (k) { var v = sc.scales[k]; b.push([g[0], S.nm(k), v.pct, S.band(v.pct), v.n, v.n < 4 ? 'Few questions: read as "leans toward"' : '']); }); });
    b.push(['Attachment', 'Overall style', '', S.ATT[sc.attachment.style].name, '', '']);
    var out = [{ name: 'Answers', rows: a, widths: [5, 22, 60, 34, 40] }, { name: 'Trait scores', rows: b, widths: [18, 30, 14, 12, 18, 36] }];
    var T = window.MPTypes ? window.MPTypes.fromScore(sc, opt || {}) : null;
    if (T) { var t = [['System (inferred, for fun)', 'Your result', 'What it means', 'Confidence']], cw = function (x) { return x.self ? 'self-identified (inferred ' + (x.inferred.code || x.inferred.name) + ')' : x.conf.pct + '% ' + x.conf.word; };
      t.push(['Cluster', T.cluster.emoji + ' ' + T.cluster.name + ' (' + T.cluster.match + '% match)', T.cluster.text, cw(T.cluster)]);
      t.push(['4-letter type (MBTI-style)', T.four.code + ' ' + T.four.name, T.four.text, cw(T.four)]);
      t.push(['Enneagram-style', T.ennea.code + ' ' + T.ennea.name, T.ennea.text, cw(T.ennea)]);
      if (T.socionics) t.push(['Socionics-style', T.socionics.code + ' (' + T.socionics.letters + ') ' + T.socionics.name, 'Quadra ' + T.socionics.quadra + ': ' + T.socionics.quadraText + '. Dual: ' + T.socionics.dual, cw(T.socionics)]);
      t.push(['Temperament', T.temper.name, T.temper.text, cw(T.temper)]);
      t.push(['Archetype (Jungian-style)', T.arche.name, T.arche.text, cw(T.arche)]);
      t.push(['DISC-style', T.disc.name + ' (' + T.disc.color + ')', T.disc.text, cw(T.disc)]);
      t.push(['Attachment', T.attach.name, '', cw(T.attach)]);
      t.push(['Big Five code (SLOAN-style)', T.sloan.code, T.sloan.parts.map(function (x) { return x.word; }).join(', '), cw(T.sloan)]);
      t.push(['Decision style', T.cognitive.name, T.cognitive.text, cw(T.cognitive)]);
      t.push(['Learning style (contested)', T.learning.name, T.learning.text, cw(T.learning)]);
      t.push(['Hierarchy', T.taxonomy.map(function (x) { return x.name; }).join(' > '), '', '']);
      t.push(['Tags', T.tags.map(function (x) { return '#' + x; }).join(' '), '', '']);
      out.push({ name: 'Types', rows: t, widths: [28, 34, 60, 16] }); }
    if (deep && D) { var c = [['#', 'Section', 'Question', 'Your answer']];
      deep.answers.forEach(function (an) { var q = D.questions.find(function (z) { return z.id === an.q; }); if (!q) return; c.push([q.n, q.section, an.t || q.text, window.MPReport.fmtV(q, an.v) || '']); });
      out.push({ name: 'Deep Dive', rows: c, widths: [5, 24, 60, 60] }); }
    return out;
  }
  function download(Q, D, r, sc, deep, opt) {
    var blob = build(sheetsFor(Q, D, r, sc, deep, opt)), nm = 'Mindprint' + (r.name ? '-' + r.name.replace(/[^\w-]+/g, '') : '') + '-' + new Date(r.at).toISOString().slice(0, 10) + '.xlsx';
    var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = nm; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 4000);
  }
  window.MPXlsx = { build: build, sheetsFor: sheetsFor, download: download };
})();
