/* Axon graph view · Northpeak Studios */
(function () {
  'use strict';
  var memory = {}; // id -> {x,y}
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

  function mount(canvas, opt) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 3);
    var view = { x: 0, y: 0, k: 1 };
    var nodes = [], links = [], sugs = [], byId = {}, adj = {}, top = {}, hubDeg = 12, dense = false, fitK = 1;
    var selected = opt.selected || null, current = opt.current || null;
    var alpha = 1, raf = 0, dead = false, userMoved = false, settledFit = false;
    var accent = opt.accent || '#ff6a3d';

    function setData(data) {
      nodes = data.nodes.map(function (n) {
        var m = memory[n.id];
        var key = n.label || n.id, a = hash(key) * Math.PI * 2, rr = 60 + hash(key + 'r') * 160;
        return { id: n.id, label: n.label, kind: n.kind || 'note', color: n.color || null, group: n.group || '', fog: n.fog || 0, deg: 0,
          x: m ? m.x : Math.cos(a) * rr, y: m ? m.y : Math.sin(a) * rr, vx: 0, vy: 0, fixed: false, isNew: !m };
      });
      byId = {}; adj = {};
      nodes.forEach(function (n) { byId[n.id] = n; adj[n.id] = {}; });
      links = [];
      sugs = (data.sug || []).map(function (l) { var a = byId[l[0]], b = byId[l[1]]; return a && b && a !== b ? [a, b, l[2] || 0] : null; }).filter(Boolean);
      var ordered = data.links.filter(function (l) { return !l[2]; }).concat(data.links.filter(function (l) { return l[2]; }));
      ordered.forEach(function (l) {
        var a = byId[l[0]], b = byId[l[1]];
        if (!a || !b || a === b || adj[a.id][b.id]) return;
        adj[a.id][b.id] = adj[b.id][a.id] = 1;
        a.deg++; b.deg++;
        var e = [a, b]; e.auto = !!l[2];
        links.push(e);
      });
      nodes.forEach(function (n) {
        n.r = n.kind === 'tag' ? 3 : n.kind === 'ghost' ? 3.5 : 3 + Math.min(6.5, Math.sqrt(n.deg) * 1.15);
        if (n.isNew) {
          var nb = Object.keys(adj[n.id]).map(function (id) { return memory[id]; }).filter(Boolean);
          if (nb.length) { n.x = nb[0].x + (hash(n.id + 'x') - .5) * 40; n.y = nb[0].y + (hash(n.id + 'y') - .5) * 40; }
        }
      });
      /* the ~10 best-connected notes keep their labels at the default zoom */
      top = {}; nodes.filter(function (n) { return n.kind === 'note' && n.deg; }).sort(function (a, b) { return b.deg - a.deg; }).slice(0, 10).forEach(function (n) { top[n.id] = 1; });
      hubDeg = Math.max(12, nodes.length * 0.25);
      dense = links.length > nodes.length * 3;
      var fresh = nodes.some(function (n) { return n.isNew; });
      alpha = fresh ? 1 : 0.3;
      var budget = fresh ? (nodes.length <= 250 ? 600 : nodes.length <= 600 ? 250 : 100) : 30;
      for (var i = 0; i < budget && alpha > 0.004; i++) tick();
      settledFit = false;
      resize();
      fit(false);
      kick();
    }

    function tick() {
      var n = nodes.length, i, j, a, b, dx, dy, d2, d, f;
      /* spread out: strong repulsion, long links, a collision radius per node; hubs (index notes) pull weakly
         so they don't drag everything into one ball */
      var rep = dense ? 16000 : 11000, L = dense ? 170 : 130, ks = 0.035, g0 = 0.005;
      for (i = 0; i < n; i++) {
        a = nodes[i];
        for (j = i + 1; j < n; j++) {
          b = nodes[j];
          dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy;
          if (d2 < 1) { dx = (Math.random() - .5); dy = (Math.random() - .5); d2 = 1; }
          if (d2 > 640000) continue;
          d = Math.sqrt(d2);
          var minD = (a.r + b.r) * 2.2 + 26; /* room for a dot and its label */
          f = (rep / d2 + (d < minD ? (minD - d) * 0.5 : 0)) * alpha;
          a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f;
        }
      }
      for (i = 0; i < links.length; i++) {
        a = links[i][0]; b = links[i][1];
        dx = b.x - a.x; dy = b.y - a.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
        var len = (a.kind === 'tag' || b.kind === 'tag') ? L * 0.7 : (a.kind === 'ghost' || b.kind === 'ghost') ? L * 0.8 : L;
        var st = ks / Math.max(1, Math.min(a.deg, b.deg)) * 3; /* d3-style: links of well-connected notes are weaker */
        if (a.deg > hubDeg || b.deg > hubDeg) { st *= 0.25; len *= 1.6; }
        else if (a.group !== b.group) { st *= 0.35; len *= 1.3; } /* links across folders pull less, so each folder forms its own cluster */
        f = (d - len) * Math.min(ks, st) * alpha;
        a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f;
      }
      /* notes from the same top folder drift together a little, so folders read as clusters */
      var gc = {};
      for (i = 0; i < n; i++) { a = nodes[i]; if (!a.group) continue; var c = gc[a.group] || (gc[a.group] = { x: 0, y: 0, n: 0 }); c.x += a.x; c.y += a.y; c.n++; }
      for (i = 0; i < n; i++) {
        a = nodes[i];
        var cg = a.group && gc[a.group];
        if (cg && cg.n > 2) { a.vx += (cg.x / cg.n - a.x) * 0.035 * alpha; a.vy += (cg.y / cg.n - a.y) * 0.035 * alpha; }
        a.vx -= a.x * g0 * alpha * (a.deg ? 1 : 2.2); a.vy -= a.y * g0 * alpha * (a.deg ? 1 : 2.2);
        if (a.fixed) { a.vx = a.vy = 0; continue; }
        a.vx *= 0.6; a.vy *= 0.6;
        var sp = Math.sqrt(a.vx * a.vx + a.vy * a.vy); if (sp > 30) { a.vx *= 30 / sp; a.vy *= 30 / sp; }
        a.x += a.vx; a.y += a.vy;
        memory[a.id] = { x: a.x, y: a.y };
      }
      alpha *= 0.993;
    }

    function resize() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }

    function fit(anim) {
      if (!nodes.length) { view = { x: W / 2, y: H / 2, k: 1 }; return; }
      var focus = (current && byId[current]) ? null : null;
      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      nodes.forEach(function (n) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); });
      var top = opt.topInset || 0, bot = opt.bottomInset || 0;
      var padX = 60, padY = 30, bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
      var k = Math.min((W - padX * 2) / bw, (H - top - bot - padY * 2 - 16) / bh, 2.2);
      k = Math.max(0.15, k); fitK = k;
      view = { k: k, x: W / 2 - (x0 + bw / 2) * k, y: top + (H - top - bot) / 2 - (y0 + bh / 2) * k - 8 };
      draw();
    }

    function toScreen(n) { return { x: n.x * view.k + view.x, y: n.y * view.k + view.y }; }
    function hit(sx, sy) {
      var best = null, bd = 1e9;
      nodes.forEach(function (n) {
        var p = toScreen(n), dx = p.x - sx, dy = p.y - sy, d = Math.sqrt(dx * dx + dy * dy);
        var lim = Math.max(18, n.r * view.k + 10);
        if (d < lim && d < bd) { bd = d; best = n; }
      });
      return best;
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var sel = selected && byId[selected] ? byId[selected] : null;
      var focus = sel || (current && byId[current]) || null;
      /* a hub (an index note linked to most of the vault) only gets its ring: lighting up all its links and labels is the clutter */
      var hub = !!(focus && focus.deg > hubDeg);
      var nb = focus && !hub ? adj[focus.id] : {};
      var zoomIn = view.k / (fitK || 1); /* 1 = the fitted view, >1 = zoomed in */
      var base = dense ? (focus && !hub ? 0.06 : 0.11) : (focus && !hub ? 0.1 : 0.24);
      ctx.lineWidth = 1;
      links.forEach(function (l) {
        var a = toScreen(l[0]), b = toScreen(l[1]);
        var hot = focus && !hub && (l[0] === focus || l[1] === focus);
        ctx.strokeStyle = hot ? hexA(accent, 0.75) : 'rgba(237,235,230,' + base + ')';
        ctx.lineWidth = hot ? 1.4 : 1;
        var gh = l[0].kind === 'ghost' || l[1].kind === 'ghost';
        if (gh) ctx.setLineDash([3, 4]);
        else if (l.auto) { ctx.setLineDash([1.5, 3.5]); ctx.strokeStyle = hot ? hexA(accent, 0.6) : 'rgba(237,235,230,' + base * 0.85 + ')'; ctx.lineWidth = hot ? 1.2 : 1; }
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        if (gh || l.auto) ctx.setLineDash([]);
      });
      /* v1.14 hidden links: dashed violet, not part of the layout */
      if (sugs.length) { ctx.setLineDash([4, 4]); sugs.forEach(function (l) { var a = toScreen(l[0]), b = toScreen(l[1]); var hot = focus && (l[0] === focus || l[1] === focus); ctx.strokeStyle = hot ? 'rgba(167,139,250,0.95)' : 'rgba(167,139,250,' + (focus ? 0.22 : 0.5) + ')'; ctx.lineWidth = hot ? 1.8 : 1.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }); ctx.setLineDash([]); }
      /* labels: the focus, its neighbors, the ~10 best-connected notes; everything once zoomed in (or a small vault).
         All of them yield to labels already drawn, so none overlap. */
      var many = zoomIn > 1.5 || nodes.length < 30, labels = [];
      var order = nodes.slice().sort(function (a, b) { var ra = a === focus ? 2 : nb[a.id] ? 1 : 0, rb = b === focus ? 2 : nb[b.id] ? 1 : 0; return ra - rb; });
      order.forEach(function (n) {
        var p = toScreen(n), r = n.r * Math.max(0.8, Math.min(1.6, view.k / (fitK || 1) * 0.9 + 0.1));
        var isF = focus === n, isN = !!nb[n.id];
        ctx.globalAlpha = n.fog && !isF ? Math.max(0.12, 1 - 0.85 * n.fog) : 1;
        if (isF) {
          ctx.fillStyle = hexA(accent, 0.18);
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 8, 0, 7); ctx.fill();
          ctx.strokeStyle = hexA(accent, 0.55); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 4.5, 0, 7); ctx.stroke();
        }
        if (n.kind === 'tag') {
          ctx.strokeStyle = isN || isF ? '#edebe6' : 'rgba(237,235,230,0.45)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke();
        } else if (n.kind === 'ghost') {
          ctx.setLineDash([2.5, 2.5]); ctx.strokeStyle = isF ? accent : (isN ? 'rgba(237,235,230,0.7)' : 'rgba(237,235,230,0.32)'); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        } else {
          var dim = focus && !hub && !isF && !isN;
          ctx.fillStyle = n.color ? (dim ? hexA(n.color, 0.3) : (isF ? accent : n.color)) : (isF ? accent : (dim ? '#4a4a50' : (n.deg ? '#b4b3ae' : '#5d5d63')));
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (isF || isN || top[n.id] || many) labels.push({ n: n, x: p.x, y: p.y + r + 4, f: isF, nb: isN, pr: isF ? 1e6 : isN ? 1e5 + n.deg : top[n.id] ? 1e4 + n.deg : n.deg });
      });
      labels.sort(function (a, b) { return b.pr - a.pr; });
      var placed = [];
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
      labels.forEach(function (L) {
        var t = L.n.label.length > 18 ? L.n.label.slice(0, 17).replace(/\s+$/, '') + '\u2026' : L.n.label;
        ctx.font = (L.f ? '600 13px ' : '12px ') + '-apple-system, system-ui, "Inter", sans-serif';
        var w = ctx.measureText(t).width + 8, box = { l: L.x - w / 2, r: L.x + w / 2, t: L.y - 2, b: L.y + 16 };
        if (box.r < 0 || box.l > W || box.t < (opt.topInset || 0) - 4 || box.t > H - (opt.bottomInset || 0) * 0.5) return; /* not under the header or off screen */
        if (!L.f && placed.some(function (q) { return box.l < q.r && box.r > q.l && box.t < q.b && box.b > q.t; })) return;
        placed.push(box);
        /* a dark halo keeps text readable over lines */
        ctx.globalAlpha = L.n.fog && !L.f ? Math.max(0.25, 1 - 0.75 * L.n.fog) : 1;
        ctx.strokeStyle = 'rgba(11,11,12,0.85)'; ctx.lineWidth = 3.5; ctx.strokeText(t, L.x, L.y);
        ctx.fillStyle = L.f ? '#edebe6' : (L.nb ? 'rgba(237,235,230,0.9)' : 'rgba(237,235,230,' + (focus && !hub ? 0.45 : 0.72) + ')');
        ctx.fillText(t, L.x, L.y);
        ctx.globalAlpha = 1;
      });
    }
    function hexA(hex, a) {
      var h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&');
      var v = parseInt(h, 16); return 'rgba(' + (v >> 16 & 255) + ',' + (v >> 8 & 255) + ',' + (v & 255) + ',' + a + ')';
    }

    function loop() {
      raf = 0;
      if (dead) return;
      if (alpha > 0.004 || drag) { tick(); }
      draw();
      if (alpha > 0.004 || drag) raf = requestAnimationFrame(loop);
      else if (!userMoved && !settledFit) { settledFit = true; fit(false); }
    }
    function kick(a) { if (a) alpha = Math.max(alpha, a); if (!raf) raf = requestAnimationFrame(loop); }

    // pointer handling
    var pts = {}, drag = null, pan = null, pinch = null, moved = 0, downNode = null;
    function local(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    canvas.addEventListener('pointerdown', function (e) {
      canvas.setPointerCapture(e.pointerId);
      var p = local(e); pts[e.pointerId] = p;
      var ids = Object.keys(pts);
      if (ids.length === 1) {
        moved = 0;
        downNode = hit(p.x, p.y);
        if (downNode) { drag = { n: downNode, sx: p.x, sy: p.y }; }
        else pan = { sx: p.x, sy: p.y, vx: view.x, vy: view.y };
      } else if (ids.length === 2) {
        if (drag) { drag.n.fixed = false; drag = null; }
        pan = null; moved = 99;
        var a = pts[ids[0]], b = pts[ids[1]];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.k, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, vx: view.x, vy: view.y };
      }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      var p = local(e); pts[e.pointerId] = p;
      var ids = Object.keys(pts);
      if (pinch && ids.length >= 2) {
        var a = pts[ids[0]], b = pts[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        var k = Math.max(0.2, Math.min(5, pinch.k * d / pinch.d));
        var wx = (pinch.cx - pinch.vx) / pinch.k, wy = (pinch.cy - pinch.vy) / pinch.k;
        view.k = k; view.x = cx - wx * k; view.y = cy - wy * k; userMoved = true;
        draw(); return;
      }
      if (drag) {
        var dd = Math.hypot(p.x - drag.sx, p.y - drag.sy); moved = Math.max(moved, dd);
        if (moved > 6) {
          drag.n.fixed = true; userMoved = true;
          drag.n.x = (p.x - view.x) / view.k; drag.n.y = (p.y - view.y) / view.k;
          memory[drag.n.id] = { x: drag.n.x, y: drag.n.y };
          kick(0.25);
        }
      } else if (pan) {
        moved = Math.max(moved, Math.hypot(p.x - pan.sx, p.y - pan.sy));
        view.x = pan.vx + p.x - pan.sx; view.y = pan.vy + p.y - pan.sy; if (moved > 6) userMoved = true;
        draw();
      }
    });
    function up(e) {
      if (!pts[e.pointerId]) return;
      delete pts[e.pointerId];
      var left = Object.keys(pts).length;
      if (left === 0) {
        if (drag) { drag.n.fixed = false; }
        if (moved < 7 && !pinch) {
          if (downNode) {
            if (selected === downNode.id && opt.onOpen) opt.onOpen(downNode.id);
            else { selected = downNode.id; draw(); opt.onSelect && opt.onSelect(downNode.id); }
          } else { selected = null; draw(); opt.onSelect && opt.onSelect(null); }
        }
        drag = null; pan = null; pinch = null; downNode = null;
      } else if (left === 1 && pinch) {
        pinch = null;
        var id = Object.keys(pts)[0];
        pan = { sx: pts[id].x, sy: pts[id].y, vx: view.x, vy: view.y };
      }
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var p = local(e), f = Math.exp(-e.deltaY * 0.0015);
      var k = Math.max(0.2, Math.min(5, view.k * f));
      var wx = (p.x - view.x) / view.k, wy = (p.y - view.y) / view.k;
      view.k = k; view.x = p.x - wx * k; view.y = p.y - wy * k; userMoved = true; draw();
    }, { passive: false });
    function onResize() { resize(); draw(); }
    window.addEventListener('resize', onResize);

    setData(opt.data);
    return {
      setData: setData,
      fit: function () { fit(true); },
      setInsets: function (t, b) { opt.topInset = t; opt.bottomInset = b; fit(false); },
      select: function (id) { selected = id; draw(); },
      zoom: function (f) { userMoved = true; var k = Math.max(0.2, Math.min(5, view.k * f)); var cx = W / 2, cy = H / 2; var wx = (cx - view.x) / view.k, wy = (cy - view.y) / view.k; view.k = k; view.x = cx - wx * k; view.y = cy - wy * k; draw(); },
      setAccent: function (a) { accent = a; draw(); },
      destroy: function () { dead = true; if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); }
    };
  }
  window.Graph = { mount: mount };
})();
