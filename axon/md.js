/* Axon markdown renderer · Northpeak Studios */
(function () {
  'use strict';
  var WL = /\[\[([^\[\]\n|#]+)(#[^\[\]\n|]*)?(?:\|([^\[\]\n]+))?\]\]/g;
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function slug(s) {
    return String(s).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  }
  function stripCode(src) {
    return String(src).replace(/```[\s\S]*?(```|$)/g, '').replace(/`[^`\n]*`/g, '');
  }
  function links(src) {
    var out = [], m, s = stripCode(src);
    WL.lastIndex = 0;
    while ((m = WL.exec(s))) out.push({ target: m[1].trim(), heading: m[2] ? m[2].slice(1).trim() : '', alias: m[3] ? m[3].trim() : '' });
    return out;
  }
  function images(src) {
    var out = [], m, re = /!\[[^\]\n]*\]\(\s*axon-img:([\w-]+)\s*\)/g, s = String(src || '');
    while ((m = re.exec(s))) if (out.indexOf(m[1]) < 0) out.push(m[1]);
    return out;
  }
  function cards(src) {
    var out = [], s = stripFront(src).replace(/```[\s\S]*?(```|$)/g, '');
    s.split('\n').forEach(function (l) {
      var t = l.replace(/^\s*(?:>\s*)*/, '').replace(/^(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/, '');
      var i = t.indexOf(' :: ');
      if (i < 0) return;
      var q = t.slice(0, i).trim(), a = t.slice(i + 4).trim();
      if (q && a) out.push({ q: q, a: a });
    });
    recall(src).forEach(function (c) {
      if (c.type !== 'cloze') return;
      var strip = function (x) { return x.replace(/[\u0002\u0003\u0004]/g, ''); };
      out.push({ q: clozeSide(c.text, c.group, false).replace(/\u0002([^\u0003]*?)\u0004\u0003/g, '[$1]'), a: strip(clozeSide(c.text, c.group, true)) });
    });
    return out;
  }
  function tags(src) {
    var out = {}, m, re = /(^|\s)#([A-Za-z][\w\-\/]*)/g, f = front(src);
    if (f) f.props.forEach(function (p) { if (/^tags?$/i.test(p.k)) listVal(p.v).forEach(function (t) { if (/^[A-Za-z][\w\-\/]*$/.test(t)) out[t.toLowerCase()] = 1; }); });
    var s = stripCode(stripFront(src)).replace(/^#{1,6}\s.*$/gm, '');
    while ((m = re.exec(s))) out[m[2].toLowerCase()] = 1;
    return Object.keys(out);
  }

  /* properties block at the very top: ---\nkey: value\n--- */
  function front(src) {
    var lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    if (lines[0] !== '---') return null;
    var props = [], cur = null;
    for (var i = 1; i < lines.length && i < 60; i++) {
      var l = lines[i];
      if (l === '---' || l === '...') return { props: props, end: i };
      var m = /^([A-Za-z][\w -]*?):\s*(.*)$/.exec(l), lm = /^\s*-\s+(.*)$/.exec(l);
      if (m) { cur = { k: m[1].trim(), v: m[2].trim() }; props.push(cur); }
      else if (lm && cur) { cur.v = cur.v ? cur.v + ', ' + lm[1].trim() : lm[1].trim(); }
      else if (!l.trim()) continue;
      else return null;
    }
    return null;
  }
  function listVal(v) { return String(v || '').replace(/^\[|\]$/g, '').split(',').map(function (x) { return x.trim().replace(/^["']|["']$/g, '').replace(/^#/, ''); }).filter(Boolean); }
  function stripFront(src) {
    var f = front(src); if (!f) return String(src || '');
    var lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    return lines.slice(f.end + 1).join('\n');
  }
  function headings(src) {
    var out = [], lines = String(src || '').replace(/\r\n?/g, '\n').split('\n'), inCode = false, f = front(src), m;
    for (var i = f ? f.end + 1 : 0; i < lines.length; i++) {
      if (/^\s*(```|~~~)/.test(lines[i])) { inCode = !inCode; continue; }
      if (!inCode && (m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(lines[i]))) out.push({ level: m[1].length, text: m[2], slug: slug(m[2]), line: i });
    }
    return out;
  }
  /* Recall cards: "question :: answer" lines and {{c::cloze}} lines */
  var CLOZE = /\{\{c(\d*)::([\s\S]*?)(?:::([^}]*))?\}\}/g;
  function cardLines(src) {
    var out = [], lines = String(src || '').replace(/\r\n?/g, '\n').split('\n'), inCode = false, f = front(src);
    for (var i = f ? f.end + 1 : 0; i < lines.length; i++) {
      var l = lines[i];
      if (/^\s*(```|~~~)/.test(l)) { inCode = !inCode; continue; }
      if (inCode) continue;
      var t = l.replace(/^\s*(?:>\s*)*/, '').replace(/^\[![\w-]+\][+-]?\s*/, '').replace(/^(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/, '');
      if (t) out.push({ t: t, line: i });
    }
    return out;
  }
  function recall(src) {
    var out = [];
    cardLines(src).forEach(function (c) {
      var t = c.t, i = t.indexOf(' :: ');
      if (i >= 0) {
        var q = t.slice(0, i).trim(), a = t.slice(i + 4).trim();
        if (q && a) out.push({ type: 'qa', q: q, a: a, line: c.line, key: 'q|' + q.replace(/\s+/g, ' ').toLowerCase() });
        return;
      }
      CLOZE.lastIndex = 0;
      if (!CLOZE.test(t)) return;
      var groups = {}, k = 0, m;
      CLOZE.lastIndex = 0;
      while ((m = CLOZE.exec(t))) { var g = m[1] ? 'c' + m[1] : 'u' + (k++); groups[g] = 1; }
      var base = t.replace(CLOZE, function (x, n, a) { return '{' + a + '}'; }).replace(/\s+/g, ' ').toLowerCase();
      Object.keys(groups).forEach(function (g) { out.push({ type: 'cloze', text: t, group: g, line: c.line, key: 'c|' + g + '|' + base }); });
    });
    return out;
  }
  /* cloze line -> front (blank) / back (revealed) source, other clozes shown as plain text */
  function clozeSide(text, group, back) {
    var k = 0;
    return text.replace(CLOZE, function (x, n, a, hint) {
      var g = n ? 'c' + n : 'u' + (k++);
      if (g !== group) return a;
      return back ? '\u0002' + a + '\u0003' : '\u0002' + (hint ? hint : '\u2026') + '\u0004\u0003';
    });
  }

  /* tiny math: greek, operators, ^ _ \frac \sqrt */
  var TEX = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
    times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', neq: '≠', ne: '≠', approx: '≈', equiv: '≡', propto: '∝', infty: '∞', to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', leftrightarrow: '↔', sum: '∑', prod: '∏', int: '∫', partial: '∂', nabla: '∇', degree: '°', circ: '°', in: '∈', forall: '∀', exists: '∃', cup: '∪', cap: '∩', subset: '⊂', emptyset: '∅', ldots: '…', cdots: '⋯', quad: '\u2003', ',': '\u2009', ' ': ' ' };
  function tex(s) {
    function grp(str, i) { if (str[i] === '{') { var d = 0; for (var j = i; j < str.length; j++) { if (str[j] === '{') d++; else if (str[j] === '}' && !--d) return [str.slice(i + 1, j), j + 1]; } return [str.slice(i + 1), str.length]; } return [str[i] || '', i + 1]; }
    function go(str) {
      var o = '', i = 0;
      while (i < str.length) {
        var c = str[i];
        if (c === '\\') {
          var m = /^\\([A-Za-z]+|.)/.exec(str.slice(i)), name = m ? m[1] : '';
          i += name.length + 1;
          if (name === 'frac') { var a = grp(str, i); var b = grp(str, a[1]); i = b[1]; o += '<span class="frac"><span>' + go(a[0]) + '</span><span>' + go(b[0]) + '</span></span>'; }
          else if (name === 'sqrt') { var r = grp(str, i); i = r[1]; o += '√<span class="sqrt">' + go(r[0]) + '</span>'; }
          else if (name === 'text' || name === 'mathrm') { var tx = grp(str, i); i = tx[1]; o += '<span class="mrm">' + esc(tx[0]) + '</span>'; }
          else o += TEX[name] !== undefined ? TEX[name] : esc(name);
        } else if (c === '^' || c === '_') { var g = grp(str, i + 1); i = g[1]; o += (c === '^' ? '<sup>' : '<sub>') + go(g[0]) + (c === '^' ? '</sup>' : '</sub>'); }
        else if (c === '{' || c === '}') i++;
        else { o += /[A-Za-z]/.test(c) ? '<i>' + c + '</i>' : esc(c); i++; }
      }
      return o;
    }
    return go(String(s));
  }

  /* code colouring */
  var KW = 'abstract and as async await break case catch class const continue def del do elif else enum except export extends false final finally fn for from func function go if impl import in interface is lambda let match mod new nil none not null or package pass private protected pub public raise return self static struct super switch this throw true try type typeof undefined use var void while with yield True False None'.split(' ');
  var KWS = {}; KW.forEach(function (k) { KWS[k] = 1; });
  function hlCode(code, lang) {
    var hash = /^(py|python|sh|bash|shell|zsh|rb|ruby|yaml|yml|r|toml|ini|conf)$/i.test(lang || '');
    var re = hash ? /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)(?=\s*\()|([A-Za-z_]\w*)/g
      : /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)/g;
    var out = '', last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      if (m[1]) out += '<span class="tk-c">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tk-s">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tk-n">' + esc(m[3]) + '</span>';
      else if (m[4]) out += KWS[m[4]] ? '<span class="tk-k">' + esc(m[4]) + '</span>' : '<span class="tk-f">' + esc(m[4]) + '</span>';
      else out += KWS[m[5]] ? '<span class="tk-k">' + esc(m[5]) + '</span>' : esc(m[5]);
      last = re.lastIndex;
    }
    return out + esc(code.slice(last));
  }

  function inline(text, opt) {
    var codes = [], toks = [];
    text = text.replace(/`([^`\n]+)`/g, function (m, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    text = text.replace(/!\[([^\]\n]*)\]\(\s*((?:axon-img:[\w-]+)|(?:https?:\/\/[^\s)]+))\s*\)/g, function (m, alt, u) {
      var im = /^axon-img:([\w-]+)$/.exec(u);
      toks.push(im ? '<img class="aimg" data-img="' + esc(im[1]) + '" alt="' + esc(alt) + '">' : '<img class="aimg" src="' + esc(u) + '" alt="' + esc(alt) + '" loading="lazy">');
      return '\u0001' + (toks.length - 1) + '\u0001';
    });
    text = text.replace(/\$\$([^$\n]+)\$\$|(^|[^\w$\\])\$(?=[^\s$])([^$\n]*?[^\s$\\])\$(?![\w$])/g, function (m, b, p, s) {
      toks.push('<span class="math' + (b ? ' mb' : '') + '">' + tex(b || s) + '</span>');
      return (b ? '' : p) + '\u0001' + (toks.length - 1) + '\u0001';
    });
    text = text.replace(/\{\{c\d*::([\s\S]*?)(?:::([^}]*))?\}\}/g, function (m, a) {
      toks.push('<span class="cloze">' + inline(a, opt) + '</span>');
      return '\u0001' + (toks.length - 1) + '\u0001';
    });
    text = text.replace(/\[\^([^\]\s]+)\]/g, function (m, id) {
      var f = opt && opt._fn && opt._fn.defs[id];
      if (!f) return m;
      if (!opt._fn.num[id]) opt._fn.num[id] = ++opt._fn.n;
      toks.push('<sup class="fnr"><a href="#" data-fn="' + esc(id) + '">' + opt._fn.num[id] + '</a></sup>');
      return '\u0001' + (toks.length - 1) + '\u0001';
    });
    text = text.replace(/!(\[\[[^\]\n]+\]\])/g, function (m, l) { return /\.(png|jpe?g|gif|webp)(\|[^\]]*)?\]\]$/i.test(l) ? m : l; });
    text = text.replace(WL, function (m, t, h, a) {
      t = t.trim();
      var exists = opt && opt.resolve ? opt.resolve(t) : true;
      var label = a ? a.trim() : (t + (h && h.length > 1 ? ' › ' + h.slice(1).trim() : ''));
      toks.push('<a class="wl' + (exists ? '' : ' unresolved') + '" data-wl="' + esc(t) + '"' + (h ? ' data-h="' + esc(slug(h.slice(1))) + '"' : '') + ' href="#">' + esc(label) + '</a>');
      return '\u0001' + (toks.length - 1) + '\u0001';
    });
    text = text.replace(/\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, function (m, t, u) {
      toks.push('<a class="ext" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + '</a>');
      return '\u0001' + (toks.length - 1) + '\u0001';
    });
    text = text.replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g, function (m, p, u) {
      toks.push('<a class="ext" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u) + '</a>');
      return p + '\u0001' + (toks.length - 1) + '\u0001';
    });
    text = esc(text);
    text = text.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1<strong>$2</strong>')
      .replace(/(^|[^*\w])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/(^|[^*\w])\*([^\s*])\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/(^|[^\w])_(?=\S)([^_\n]*?\S)_(?!\w)/g, '$1<em>$2</em>')
      .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>')
      .replace(/==(?=\S)([\s\S]*?\S)==/g, '<mark>$1</mark>')
      .replace(/(^|\s)#([A-Za-z][\w\-\/]*)/g, '$1<span class="tag" data-tag="$2">#$2</span>')
      .replace(/ :: (?=\S)/, ' <span class="qa">::</span> ');
    text = text.replace(/\u0002([^\u0003]*?)\u0004\u0003/g, '<span class="cz-blank">$1</span>').replace(/\u0002([^\u0003]*?)\u0003/g, '<span class="cz-on">$1</span>');
    text = text.replace(/\u0001(\d+)\u0001/g, function (m, i) { return toks[+i]; });
    text = text.replace(/\u0000(\d+)\u0000/g, function (m, i) { return '<code>' + esc(codes[+i]) + '</code>'; });
    return text;
  }

  var LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  var TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

  function buildList(items, start, indent, opt) {
    var ordered = items[start].ordered;
    var html = ordered ? '<ol' + (items[start].num > 1 ? ' start="' + items[start].num + '"' : '') + '>' : '<ul>';
    var i = start;
    while (i < items.length && items[i].indent >= indent) {
      var it = items[i];
      var c = it.content, m = /^\[( |x|X)\]\s+(.*)$/.exec(c) || /^\[( |x|X)\]$/.exec(c);
      if (m) {
        var done = m[1] !== ' ';
        html += '<li class="task' + (done ? ' done' : '') + '"><label class="cb"><input type="checkbox"' + (opt.ro ? ' disabled' : ' data-line="' + it.line + '"') + (done ? ' checked' : '') + '><span class="box"></span></label><span class="tt">' + inline(m[2] || '', opt) + '</span>';
      } else {
        html += '<li>' + inline(c, opt);
      }
      if (it.more.length) html += '<br>' + it.more.map(function (x) { return inline(x, opt); }).join('<br>');
      i++;
      if (i < items.length && items[i].indent > it.indent) {
        var r = buildList(items, i, items[i].indent, opt);
        html += r.html; i = r.i;
      }
      html += '</li>';
    }
    return { html: html + (ordered ? '</ol>' : '</ul>'), i: i };
  }

  var CALLOUT_NAME = { toggle: '', info: 'Info', note: 'Note', tip: 'Tip', warning: 'Warning', danger: 'Danger', question: 'Question', example: 'Example', quote: 'Quote', success: 'Success', abstract: 'Summary', summary: 'Summary', todo: 'To do', bug: 'Bug', error: 'Error', failure: 'Failure', important: 'Important', caution: 'Caution', hint: 'Hint' };
  function render(src, opt, lineOffset, nested) {
    opt = opt || {};
    lineOffset = lineOffset || 0;
    var lines = String(src || '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
    var out = [], para = [], i = 0, paraLine = 0, top = !nested;
    if (top) {
      opt._depth = opt._depth || 0;
      var f = front(src);
      if (f) {
        out.push('<div class="props" data-l="0">' + f.props.map(function (p) {
          if (/^tags?$/i.test(p.k)) return listVal(p.v).map(function (t) { return '<span class="tag" data-tag="' + esc(t.toLowerCase()) + '">#' + esc(t) + '</span>'; }).join('');
          var v = p.v, d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
          if (d) { var dt = new Date(+d[1], +d[2] - 1, +d[3]); if (!isNaN(dt)) v = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
          return '<span class="prop"><b>' + esc(p.k) + '</b>' + (v ? inline(listVal(p.v).length > 1 ? listVal(p.v).join(', ') : v, opt) : '\u2013') + '</span>';
        }).join('') + '</div>');
        for (var fi = 0; fi <= f.end; fi++) lines[fi] = '';
      }
      opt._fn = { defs: {}, num: {}, n: 0, order: [] };
      var inC = false;
      for (var k = 0; k < lines.length; k++) {
        if (/^\s*(```|~~~)/.test(lines[k])) inC = !inC;
        var fm = !inC && /^\[\^([^\]\s]+)\]:\s?(.*)$/.exec(lines[k]);
        if (fm) { opt._fn.defs[fm[1]] = fm[2]; opt._fn.order.push(fm[1]); lines[k] = ''; }
      }
    }
    function dl(n) { return ' data-l="' + (lineOffset + n) + '"'; }
    function flush() {
      if (para.length) { out.push('<p' + dl(paraLine) + '>' + para.map(function (l) { return inline(l, opt); }).join('<br>') + '</p>'); para = []; }
    }
    while (i < lines.length) {
      var line = lines[i], m;
      if ((m = /^\s*(```|~~~)\s*([\w+#.-]*)\s*$/.exec(line))) {
        flush();
        var fence = m[1], lang = m[2], buf = [], st = i;
        i++;
        while (i < lines.length && lines[i].trim().indexOf(fence) !== 0) { buf.push(lines[i]); i++; }
        i++;
        var code = buf.join('\n');
        out.push('<pre' + dl(st) + '>' + (lang ? '<span class="lang">' + esc(lang) + '</span>' : '') + '<code' + (lang ? ' data-lang="' + esc(lang) + '"' : '') + '>' + (lang ? hlCode(code, lang) : esc(code)) + '</code></pre>');
        continue;
      }
      if (/^\s*\$\$\s*$/.test(line)) {
        flush();
        var mb = [], ms = i; i++;
        while (i < lines.length && !/^\s*\$\$\s*$/.test(lines[i])) { mb.push(lines[i]); i++; }
        i++;
        out.push('<div class="math mblock"' + dl(ms) + '>' + mb.map(tex).join('<br>') + '</div>');
        continue;
      }
      if (!line.trim()) { flush(); i++; continue; }
      if ((m = /^\s*!\[\[([^\[\]\n|#]+)(#[^\[\]\n|]*)?(?:\|[^\[\]\n]*)?\]\]\s*$/.exec(line)) && !/\.(png|jpe?g|gif|webp|svg|pdf)$/i.test(m[1].trim())) {
        flush();
        var et = m[1].trim(), eh = m[2] ? m[2].slice(1).trim() : '', body = opt.embed && (opt._depth || 0) < 2 ? opt.embed(et) : null;
        var inner;
        if (body === null || body === undefined) inner = '<div class="embmiss">' + (opt.embed && (opt._depth || 0) >= 2 ? 'Embed too deep' : 'No note called \u201c' + esc(et) + '\u201d yet') + '</div>';
        else {
          if (eh) body = section(body, eh);
          var sub = { resolve: opt.resolve, embed: opt.embed, ro: true, _depth: (opt._depth || 0) + 1 };
          inner = '<div class="prose embody">' + (String(body).trim() ? render(body, sub) : '<p class="empty-note">Empty note</p>') + '</div>';
        }
        out.push('<div class="embed"' + dl(i) + '><a class="wl emh" data-wl="' + esc(et) + '"' + (eh ? ' data-h="' + esc(slug(eh)) + '"' : '') + ' href="#">' + esc(et + (eh ? ' \u203a ' + eh : '')) + '</a>' + inner + '</div>');
        i++; continue;
      }
      if ((m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line))) {
        flush();
        var n = m[1].length;
        out.push('<h' + n + ' id="h-' + slug(m[2]) + '"' + dl(i) + '>' + inline(m[2], opt) + '</h' + n + '>');
        i++; continue;
      }
      if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); out.push('<hr' + dl(i) + '>'); i++; continue; }
      if (/^\s*>/.test(line)) {
        flush();
        var q = [], startLine = i;
        while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        var cm = /^\[!([\w-]+)\]([+-]?)\s*(.*)$/.exec(q[0] || '');
        if (cm) {
          var kind = cm[1].toLowerCase(), fold = cm[2], name = CALLOUT_NAME[kind] !== undefined ? CALLOUT_NAME[kind] : kind.charAt(0).toUpperCase() + kind.slice(1);
          var title = inline(cm[3] || name || 'Details', opt), bodyH = render(q.slice(1).join('\n'), opt, lineOffset + startLine + 1, true);
          if (fold) out.push('<details class="callout c-' + esc(kind) + '"' + (fold === '+' ? ' open' : '') + dl(startLine) + '><summary class="ct">' + title + '</summary><div class="cb2">' + bodyH + '</div></details>');
          else out.push('<div class="callout c-' + esc(kind) + '"' + dl(startLine) + '><div class="ct">' + title + '</div>' + bodyH + '</div>');
        } else {
          out.push('<blockquote' + dl(startLine) + '>' + render(q.join('\n'), opt, lineOffset + startLine, true) + '</blockquote>');
        }
        continue;
      }
      if (LIST.test(line)) {
        flush();
        var items = [], ls = i;
        while (i < lines.length) {
          var lm = LIST.exec(lines[i]);
          if (lm) {
            items.push({ indent: lm[1].length, ordered: /\d/.test(lm[2]), num: parseInt(lm[2], 10) || 1, content: lm[3], line: lineOffset + i, more: [] });
            i++;
          } else if (lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && items.length) {
            items[items.length - 1].more.push(lines[i].trim()); i++;
          } else break;
        }
        var base = Math.min.apply(null, items.map(function (x) { return x.indent; }));
        var pos = 0, html = '';
        while (pos < items.length) {
          var r = buildList(items, pos, base, opt);
          html += r.html;
          if (r.i === pos) r.i++;
          pos = r.i;
        }
        out.push(html.replace(/^<(ul|ol)/, '<$1' + dl(ls)));
        continue;
      }
      if (line.indexOf('|') >= 0 && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
        flush();
        var cells = function (l) { return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); };
        var head = cells(line);
        var t = '<div class="tw"' + dl(i) + '><table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c, opt) + '</th>'; }).join('') + '</tr></thead><tbody>';
        i += 2;
        while (i < lines.length && lines[i].indexOf('|') >= 0 && lines[i].trim()) {
          t += '<tr>' + cells(lines[i]).map(function (c) { return '<td>' + inline(c, opt) + '</td>'; }).join('') + '</tr>';
          i++;
        }
        out.push(t + '</tbody></table></div>');
        continue;
      }
      if (!para.length) paraLine = i;
      para.push(line.replace(/^\s+/, ''));
      i++;
    }
    flush();
    if (top && opt._fn && opt._fn.n) {
      var used = Object.keys(opt._fn.num).sort(function (a, b) { return opt._fn.num[a] - opt._fn.num[b]; });
      out.push('<section class="fns"><ol>' + used.map(function (id) { return '<li id="fn-' + esc(slug(id)) + '">' + inline(opt._fn.defs[id], opt) + '</li>'; }).join('') + '</ol></section>');
    }
    return out.join('\n');
  }
  /* the part of a note under one heading (for ![[Note#Heading]]) */
  function section(src, h) {
    var lines = String(src).split('\n'), want = slug(h), start = -1, lvl = 0;
    for (var i = 0; i < lines.length; i++) {
      var m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(lines[i]);
      if (!m) continue;
      if (start < 0 && slug(m[2]) === want) { start = i; lvl = m[1].length; }
      else if (start >= 0 && m[1].length <= lvl) return lines.slice(start + 1, i).join('\n');
    }
    return start < 0 ? src : lines.slice(start + 1).join('\n');
  }

  var IMG = /!\[[^\]\n]*\]\([^)\n]*\)/g;
  function plain(src) {
    return stripCode(stripFront(src)).replace(/^\[\^[^\]]+\]:\s?/gm, '').replace(/\[\^[^\]\s]+\]/g, '').replace(/\{\{c\d*::([\s\S]*?)(?:::[^}]*)?\}\}/g, '$1').replace(IMG, '').replace(WL, function (m, t, h, a) { return a || t; })
      .replace(/^#{1,6}\s+/gm, '').replace(/^\s*>\s?(\[!\w+\]\s*)?/gm, '').replace(/^\s*([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/gm, '')
      .replace(/[*_~=`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }

  window.MD = { render: render, inline: inline, links: links, tags: tags, images: images, cards: cards, recall: recall, clozeSide: clozeSide, front: front, stripFront: stripFront, listVal: listVal, headings: headings, IMG: IMG, plain: plain, esc: esc, slug: slug, WL: WL };
})();
