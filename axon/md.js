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
  function tags(src) {
    var out = {}, m, re = /(^|\s)#([A-Za-z][\w\-\/]*)/g, s = stripCode(src).replace(/^#{1,6}\s.*$/gm, '');
    while ((m = re.exec(s))) out[m[2].toLowerCase()] = 1;
    return Object.keys(out);
  }

  function inline(text, opt) {
    var codes = [], toks = [];
    text = text.replace(/`([^`\n]+)`/g, function (m, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
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
      .replace(/(^|\s)#([A-Za-z][\w\-\/]*)/g, '$1<span class="tag" data-tag="$2">#$2</span>');
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
        html += '<li class="task' + (done ? ' done' : '') + '"><label class="cb"><input type="checkbox" data-line="' + it.line + '"' + (done ? ' checked' : '') + '><span class="box"></span></label><span class="tt">' + inline(m[2] || '', opt) + '</span>';
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

  function render(src, opt, lineOffset) {
    opt = opt || {};
    lineOffset = lineOffset || 0;
    var lines = String(src || '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
    var out = [], para = [], i = 0;
    function flush() {
      if (para.length) { out.push('<p>' + para.map(function (l) { return inline(l, opt); }).join('<br>') + '</p>'); para = []; }
    }
    while (i < lines.length) {
      var line = lines[i], m;
      if ((m = /^\s*(```|~~~)\s*([\w+-]*)\s*$/.exec(line))) {
        flush();
        var fence = m[1], lang = m[2], buf = [];
        i++;
        while (i < lines.length && lines[i].trim().indexOf(fence) !== 0) { buf.push(lines[i]); i++; }
        i++;
        out.push('<pre><code' + (lang ? ' data-lang="' + esc(lang) + '"' : '') + '>' + esc(buf.join('\n')) + '</code></pre>');
        continue;
      }
      if (!line.trim()) { flush(); i++; continue; }
      if ((m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line))) {
        flush();
        var n = m[1].length;
        out.push('<h' + n + ' id="h-' + slug(m[2]) + '">' + inline(m[2], opt) + '</h' + n + '>');
        i++; continue;
      }
      if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); out.push('<hr>'); i++; continue; }
      if (/^\s*>/.test(line)) {
        flush();
        var q = [], startLine = i;
        while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        var cm = /^\[!(\w+)\][+-]?\s*(.*)$/.exec(q[0] || '');
        if (cm) {
          var kind = cm[1].toLowerCase();
          out.push('<div class="callout c-' + esc(kind) + '"><div class="ct">' + inline(cm[2] || (kind.charAt(0).toUpperCase() + kind.slice(1)), opt) + '</div>' + render(q.slice(1).join('\n'), opt, lineOffset + startLine + 1) + '</div>');
        } else {
          out.push('<blockquote>' + render(q.join('\n'), opt, lineOffset + startLine) + '</blockquote>');
        }
        continue;
      }
      if (LIST.test(line)) {
        flush();
        var items = [];
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
        out.push(html);
        continue;
      }
      if (line.indexOf('|') >= 0 && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
        flush();
        var cells = function (l) { return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); };
        var head = cells(line);
        var t = '<div class="tw"><table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c, opt) + '</th>'; }).join('') + '</tr></thead><tbody>';
        i += 2;
        while (i < lines.length && lines[i].indexOf('|') >= 0 && lines[i].trim()) {
          t += '<tr>' + cells(lines[i]).map(function (c) { return '<td>' + inline(c, opt) + '</td>'; }).join('') + '</tr>';
          i++;
        }
        out.push(t + '</tbody></table></div>');
        continue;
      }
      para.push(line.replace(/^\s+/, ''));
      i++;
    }
    flush();
    return out.join('\n');
  }

  function plain(src) {
    return stripCode(src).replace(WL, function (m, t, h, a) { return a || t; })
      .replace(/^#{1,6}\s+/gm, '').replace(/^\s*>\s?(\[!\w+\]\s*)?/gm, '').replace(/^\s*([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/gm, '')
      .replace(/[*_~=`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }

  window.MD = { render: render, links: links, tags: tags, plain: plain, esc: esc, slug: slug, WL: WL };
})();
