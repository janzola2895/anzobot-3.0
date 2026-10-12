/* Oficina ANZOBOT — dibujo de la sala: piso, paredes, muebles, objetos de pared y orden de profundidad. */
(function (root) {
  'use strict';
  const O = root.Office = root.Office || {};
  const iso = O.iso, W = O.GRID_W, H = O.GRID_H, WH = O.WALL_H;
  const OUTLINE = 'rgba(20,30,45,0.45)';

  function path(ctx, pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) { if (i) ctx.lineTo(pts[i].x, pts[i].y); else ctx.moveTo(pts[i].x, pts[i].y); }
    ctx.closePath();
  }
  function fill(ctx, pts, color) {
    path(ctx, pts); ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();      // cubre costuras entre piezas
  }
  function line(ctx, a, b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  O.pointInPoly = function (pts, x, y) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };

  // Caja isometrica entre (x0,y0,z0) y (x1,y1,z1); nb = vecinos de la misma pieza (n,s,e,w) para no pintar costuras.
  function box(ctx, x0, y0, x1, y1, z0, z1, pal, nb) {
    nb = nb || {};
    const A = iso(x0, y0, z1), B = iso(x1, y0, z1), C = iso(x1, y1, z1), D = iso(x0, y1, z1);
    const B0 = iso(x1, y0, z0), C0 = iso(x1, y1, z0), D0 = iso(x0, y1, z0);
    if (!nb.s) fill(ctx, [D, C, C0, D0], pal.left);
    if (!nb.e) fill(ctx, [C, B, B0, C0], pal.right);
    fill(ctx, [A, B, C, D], pal.top);
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8; ctx.lineJoin = 'round';
    if (!nb.n) line(ctx, A, B);
    if (!nb.e) line(ctx, B, C);
    if (!nb.s) line(ctx, C, D);
    if (!nb.w) line(ctx, D, A);
    if (!nb.s && !nb.w) line(ctx, D, D0);
    if (!nb.s || !nb.e) line(ctx, C, C0);
    if (!nb.e && !nb.n) line(ctx, B, B0);
    if (!nb.s) line(ctx, D0, C0);
    if (!nb.e) line(ctx, C0, B0);
  }

  // ---------------------------------------------------------------- piso y paredes (capa estatica)
  O.buildStatic = function (scale) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(O.WORLD_W * scale); cv.height = Math.ceil(O.WORLD_H * scale);
    const ctx = cv.getContext('2d');
    ctx.scale(scale, scale);

    // paredes
    const wallL = [iso(0, 0, 0), iso(0, H, 0), iso(0, H, WH), iso(0, 0, WH)];
    const wallR = [iso(0, 0, 0), iso(W, 0, 0), iso(W, 0, WH), iso(0, 0, WH)];
    fill(ctx, wallL, '#b6c5d8');
    fill(ctx, wallR, '#d3deea');
    // zocalo (franja baja)
    fill(ctx, [iso(0, 0, 0), iso(0, H, 0), iso(0, H, 34), iso(0, 0, 34)], '#a7b8cd');
    fill(ctx, [iso(0, 0, 0), iso(W, 0, 0), iso(W, 0, 34), iso(0, 0, 34)], '#c3d1e0');
    ctx.strokeStyle = 'rgba(20,30,45,0.07)'; ctx.lineWidth = 1;
    for (let i = 1; i < W; i++) line(ctx, iso(i, 0, 34), iso(i, 0, WH));
    for (let i = 1; i < H; i++) line(ctx, iso(0, i, 34), iso(0, i, WH));
    ctx.strokeStyle = 'rgba(20,30,45,0.18)';
    line(ctx, iso(0, 0, 34), iso(W, 0, 34)); line(ctx, iso(0, 0, 34), iso(0, H, 34));
    // rodapie
    fill(ctx, [iso(0, 0, 0), iso(0, H, 0), iso(0, H, 7), iso(0, 0, 7)], '#8fa1b7');
    fill(ctx, [iso(0, 0, 0), iso(W, 0, 0), iso(W, 0, 7), iso(0, 0, 7)], '#aebdce');
    // cantos
    fill(ctx, [iso(W, 0, 0), iso(W, -0.18, 0), iso(W, -0.18, WH), iso(W, 0, WH)], '#9fb0c3');
    fill(ctx, [iso(0, H, 0), iso(-0.18, H, 0), iso(-0.18, H, WH), iso(0, H, WH)], '#8c9db2');
    fill(ctx, [iso(0, 0, WH), iso(W, 0, WH), iso(W, -0.18, WH), iso(0, -0.18, WH)], '#e9eff6');
    fill(ctx, [iso(0, 0, WH), iso(0, H, WH), iso(-0.18, H, WH), iso(-0.18, 0, WH)], '#d5dfea');
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8;
    line(ctx, iso(0, 0, 0), iso(0, 0, WH)); line(ctx, iso(0, 0, WH), iso(W, 0, WH)); line(ctx, iso(0, 0, WH), iso(0, H, WH));

    // piso a cuadros
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      fill(ctx, [iso(x, y, 0), iso(x + 1, y, 0), iso(x + 1, y + 1, 0), iso(x, y + 1, 0)], (x + y) % 2 ? '#cdbfa5' : '#c5b69b');
    }
    ctx.strokeStyle = 'rgba(80,60,30,0.10)'; ctx.lineWidth = 0.8;
    for (let x = 0; x <= W; x++) line(ctx, iso(x, 0, 0), iso(x, H, 0));
    for (let y = 0; y <= H; y++) line(ctx, iso(0, y, 0), iso(W, y, 0));
    // canto del piso
    fill(ctx, [iso(0, H, 0), iso(W, H, 0), iso(W, H, -10), iso(0, H, -10)], '#8f8068');
    fill(ctx, [iso(W, 0, 0), iso(W, H, 0), iso(W, H, -10), iso(W, 0, -10)], '#a39378');
    ctx.strokeStyle = OUTLINE;
    line(ctx, iso(0, H, 0), iso(W, H, 0)); line(ctx, iso(W, H, 0), iso(W, 0, 0));
    line(ctx, iso(0, H, -10), iso(W, H, -10)); line(ctx, iso(W, H, -10), iso(W, 0, -10));
    line(ctx, iso(0, H, 0), iso(0, H, -10)); line(ctx, iso(W, H, 0), iso(W, H, -10)); line(ctx, iso(W, 0, 0), iso(W, 0, -10));

    // alfombras
    O.DECALS.forEach(function (d) {
      const q = function (i) { return [iso(d.x + i, d.y + i, 0), iso(d.x + d.w - i, d.y + i, 0), iso(d.x + d.w - i, d.y + d.d - i, 0), iso(d.x + i, d.y + d.d - i, 0)]; };
      fill(ctx, q(0.04), d.colors[0]);
      fill(ctx, q(0.22), d.colors[1]);
      ctx.strokeStyle = 'rgba(20,30,45,0.25)'; ctx.lineWidth = 0.8;
      path(ctx, q(0.04)); ctx.stroke();
    });
    return cv;
  };

  // ---------------------------------------------------------------- pantallas de monitor
  function screenContent(ctx, key, app, w, h) {
    const st = app.state;
    ctx.fillStyle = '#12202f'; ctx.fillRect(0, 0, w, h);
    const s = st.strategies[key];
    const clip = function () { ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip(); };
    ctx.save(); clip();
    if (key === 'RISK') {
      const r = st.risk, pct = O.capFraction(r);
      ctx.fillStyle = '#ffffff22'; ctx.fillRect(2, h / 2 - 2, w - 4, 4);
      ctx.fillStyle = pct >= 0 ? '#4ade80' : '#f87171';
      if (pct >= 0) ctx.fillRect(w / 2, h / 2 - 2, pct * (w / 2 - 2), 4); else ctx.fillRect(w / 2 + pct * (w / 2 - 2), h / 2 - 2, -pct * (w / 2 - 2), 4);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(w / 2 - 0.5, 3, 1, h - 6);
      if (r.locked) { ctx.fillStyle = '#f87171'; ctx.fillRect(2, 2, w - 4, 3); }
    } else if (!s || s.state === 'away' || s.state === 'off') {
      ctx.fillStyle = '#05080c'; ctx.fillRect(0, 0, w, h);
    } else if (s.state === 'capped') {
      ctx.fillStyle = '#3a1414'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f87171'; ctx.font = 'bold 7px Verdana, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TOPE', w / 2, h / 2 + 3);
    } else {
      const hist = st.history, n = hist.length;
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < n; i++) { if (hist[i] < lo) lo = hist[i]; if (hist[i] > hi) hi = hist[i]; }
      const pos = s.position;
      if (pos) {                                  // los niveles que el bot no publico (null) no entran en la escala ni se dibujan
        if (pos.sl !== null) lo = Math.min(lo, pos.sl);
        if (pos.tp !== null) hi = Math.max(hi, pos.tp);
        if (pos.entry !== null) { lo = Math.min(lo, pos.entry); hi = Math.max(hi, pos.entry); }
      }
      if (n < 2 && !(pos && isFinite(lo) && isFinite(hi))) { ctx.restore(); return; }       // sin historial todavia: pantalla en blanco
      if (!isFinite(lo) || !isFinite(hi)) { ctx.restore(); return; }
      const pad = Math.max(1, (hi - lo) * 0.1); lo -= pad; hi += pad;
      const Y = function (v) { return h - 2 - (v - lo) / (hi - lo) * (h - 4); };
      if (pos) {
        ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 0.7;
        if (pos.entry !== null) { ctx.beginPath(); ctx.moveTo(0, Y(pos.entry)); ctx.lineTo(w, Y(pos.entry)); ctx.stroke(); }
        if (pos.sl !== null) { ctx.strokeStyle = '#f87171'; ctx.beginPath(); ctx.moveTo(0, Y(pos.sl)); ctx.lineTo(w, Y(pos.sl)); ctx.stroke(); }
        if (pos.tp !== null) { ctx.strokeStyle = '#4ade80'; ctx.beginPath(); ctx.moveTo(0, Y(pos.tp)); ctx.lineTo(w, Y(pos.tp)); ctx.stroke(); }
      }
      if (n >= 2) {
        ctx.strokeStyle = pos ? (pos.pnl >= 0 ? '#4ade80' : '#f87171') : '#7dd3fc';
        ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i < n; i++) { const x = 1 + i / (n - 1) * (w - 2); if (i) ctx.lineTo(x, Y(hist[i])); else ctx.moveTo(x, Y(hist[i])); }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawMonitor(ctx, f, app) {
    const tx = f.screenTile[0], ty = f.screenTile[1], hz = f.h + 6;
    ctx.save();
    if (f.screen === 'S') { const P = iso(tx + 0.1, ty + 0.5, hz); ctx.transform(1, 0.5, 0, 1, P.x, P.y); }
    else { const P = iso(tx + 0.5, ty + 0.9, hz); ctx.transform(1, -0.5, 0, 1, P.x, P.y); }
    // pie
    ctx.fillStyle = '#2b3440'; ctx.fillRect(10, 0, 6, 6);
    ctx.fillRect(7, 5, 12, 2);
    ctx.fillStyle = '#2b3440'; ctx.fillRect(0, -20, 26, 20);
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8; ctx.strokeRect(0, -20, 26, 20);
    ctx.save(); ctx.translate(2, -18); screenContent(ctx, f.owner, app, 22, 16); ctx.restore();
    ctx.restore();
    // teclado
    const kb = f.screen === 'S'
      ? [iso(tx + 0.2, ty + 0.62, f.h), iso(tx + 0.8, ty + 0.62, f.h), iso(tx + 0.8, ty + 0.84, f.h), iso(tx + 0.2, ty + 0.84, f.h)]
      : [iso(tx + 0.62, ty + 0.2, f.h), iso(tx + 0.84, ty + 0.2, f.h), iso(tx + 0.84, ty + 0.8, f.h), iso(tx + 0.62, ty + 0.8, f.h)];
    fill(ctx, kb, '#dfe3e8'); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6; path(ctx, kb); ctx.stroke();
  }

  // ---------------------------------------------------------------- objetos sobre los escritorios
  function drawDecor(ctx, f, d, app) {
    const tx = d.tile[0], ty = d.tile[1], hz = f.h, c = iso(tx + 0.5, ty + 0.5, hz), st = app.state;
    switch (d.kind) {
      case 'papers': {
        const q = [iso(tx + 0.2, ty + 0.2, hz), iso(tx + 0.75, ty + 0.2, hz), iso(tx + 0.75, ty + 0.7, hz), iso(tx + 0.2, ty + 0.7, hz)];
        fill(ctx, q, '#ffffff'); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6; path(ctx, q); ctx.stroke();
        ctx.strokeStyle = '#9ca3af'; line(ctx, iso(tx + 0.3, ty + 0.35, hz), iso(tx + 0.65, ty + 0.35, hz)); line(ctx, iso(tx + 0.3, ty + 0.5, hz), iso(tx + 0.6, ty + 0.5, hz));
        break;
      }
      case 'mug':
        ctx.fillStyle = '#f4f1ea'; ctx.fillRect(c.x - 3, c.y - 7, 6, 7);
        ctx.fillStyle = '#6b3f1d'; ctx.fillRect(c.x - 3, c.y - 7, 6, 2);
        ctx.strokeStyle = '#f4f1ea'; ctx.lineWidth = 1.4; ctx.strokeRect(c.x + 3, c.y - 6, 2.5, 3.5);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6; ctx.strokeRect(c.x - 3, c.y - 7, 6, 7);
        break;
      case 'lamp':
        ctx.strokeStyle = '#3a3f4a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x, c.y - 14); ctx.lineTo(c.x + 7, c.y - 18); ctx.stroke();
        ctx.fillStyle = '#e8b84b'; ctx.beginPath(); ctx.moveTo(c.x + 4, c.y - 18); ctx.lineTo(c.x + 11, c.y - 16); ctx.lineTo(c.x + 8, c.y - 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3a3f4a'; ctx.fillRect(c.x - 4, c.y - 1, 8, 2);
        break;
      case 'router': {
        box(ctx, tx + 0.2, ty + 0.25, tx + 0.8, ty + 0.75, hz, hz + 7, { top: '#3a4250', left: '#2a303b', right: '#20252e' }, {});
        const ok = st.mt5.connected, blink = Math.floor(app.time * 4) % 2;
        const p = iso(tx + 0.3, ty + 0.78, hz + 3);
        ctx.fillStyle = ok ? '#4ade80' : (blink ? '#f87171' : '#5a1e1e'); ctx.fillRect(p.x, p.y - 1, 2, 2);
        ctx.fillStyle = ok ? (blink ? '#7dd3fc' : '#2b5f7a') : '#5a1e1e'; ctx.fillRect(p.x + 4, p.y - 1, 2, 2);
        ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(c.x, c.y - 9); ctx.lineTo(c.x, c.y - 17); ctx.stroke();
        break;
      }
      case 'phone': {
        box(ctx, tx + 0.25, ty + 0.3, tx + 0.75, ty + 0.7, hz, hz + 4, { top: '#d8dce2', left: '#b0b6bf', right: '#9aa1ab' }, {});
        ctx.fillStyle = '#2b3440'; ctx.fillRect(c.x - 4, c.y - 8, 8, 3);
        break;
      }
      case 'ledger': {
        const l = [iso(tx + 0.12, ty + 0.2, hz), iso(tx + 0.88, ty + 0.2, hz), iso(tx + 0.88, ty + 0.78, hz), iso(tx + 0.12, ty + 0.78, hz)];
        fill(ctx, l, '#2f5d8a');
        const p = [iso(tx + 0.17, ty + 0.25, hz), iso(tx + 0.5, ty + 0.25, hz), iso(tx + 0.5, ty + 0.73, hz), iso(tx + 0.17, ty + 0.73, hz)];
        const q = [iso(tx + 0.5, ty + 0.25, hz), iso(tx + 0.83, ty + 0.25, hz), iso(tx + 0.83, ty + 0.73, hz), iso(tx + 0.5, ty + 0.73, hz)];
        fill(ctx, p, '#f6f1df'); fill(ctx, q, '#f6f1df');
        ctx.strokeStyle = '#b8b09a'; ctx.lineWidth = 0.6;
        for (let i = 0; i < 3; i++) { const yy = ty + 0.35 + i * 0.12; line(ctx, iso(tx + 0.2, yy, hz), iso(tx + 0.46, yy, hz)); line(ctx, iso(tx + 0.54, yy, hz), iso(tx + 0.8, yy, hz)); }
        const flag = iso(tx + 0.78, ty + 0.3, hz);
        ctx.fillStyle = st.ledger.ok ? '#4ade80' : '#f87171'; ctx.fillRect(flag.x - 1, flag.y - 7, 3, 7);
        break;
      }
      case 'calc':
        box(ctx, tx + 0.3, ty + 0.3, tx + 0.7, ty + 0.7, hz, hz + 3, { top: '#4a5568', left: '#3a4250', right: '#2f3744' }, {});
        break;
      case 'ticket': {
        box(ctx, tx + 0.2, ty + 0.25, tx + 0.8, ty + 0.75, hz, hz + 8, { top: '#d8dce2', left: '#b0b6bf', right: '#9aa1ab' }, {});
        ctx.fillStyle = '#fff'; ctx.fillRect(c.x - 2, c.y - 16, 5, 7);
        break;
      }
      case 'bell':
        ctx.fillStyle = '#e8b84b'; ctx.beginPath(); ctx.arc(c.x, c.y - 3, 5, Math.PI, 0); ctx.fill();
        ctx.fillRect(c.x - 6, c.y - 3, 12, 2); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6; ctx.strokeRect(c.x - 6, c.y - 3, 12, 2);
        break;
      case 'coffee': {
        box(ctx, tx + 0.15, ty + 0.2, tx + 0.85, ty + 0.8, hz, hz + 18, { top: '#4a4f5a', left: '#343944', right: '#2a2f38' }, {});
        const p = iso(tx + 0.25, ty + 0.82, hz + 10);
        ctx.fillStyle = '#f87171'; ctx.fillRect(p.x, p.y - 1, 3, 3);
        ctx.fillStyle = '#f4f1ea'; ctx.fillRect(p.x + 8, p.y + 2, 5, 5);
        break;
      }
      case 'mugs':
        for (let i = 0; i < 3; i++) {
          const m = iso(tx + 0.2 + i * 0.28, ty + 0.5, hz);
          ctx.fillStyle = ['#f4f1ea', '#e85d3f', '#4a90d9'][i]; ctx.fillRect(m.x - 3, m.y - 6, 6, 6);
          ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6; ctx.strokeRect(m.x - 3, m.y - 6, 6, 6);
        }
        break;
      default: break;
    }
  }

  // ---------------------------------------------------------------- piezas de mobiliario
  function neighborFlags(f, tx, ty) {
    return { n: ty > f.y, s: ty < f.y + f.d - 1, w: tx > f.x, e: tx < f.x + f.w - 1 };
  }

  function drawPlant(ctx, tx, ty, app) {
    const c = iso(tx + 0.5, ty + 0.5, 0);
    box(ctx, tx + 0.28, ty + 0.28, tx + 0.72, ty + 0.72, 0, 14, O.PALETTES.pot, {});
    const sway = Math.sin(app.time * 1.2 + tx) * 1.2;
    const leaf = function (dx, dy, rx, ry, rot, col) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(c.x + dx + sway * (dy < -40 ? 1 : 0.5), c.y + dy, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(10,40,20,0.35)'; ctx.lineWidth = 0.7; ctx.stroke();
    };
    leaf(-9, -30, 5, 14, -0.6, '#2f7d46'); leaf(10, -30, 5, 14, 0.6, '#2f7d46');
    leaf(0, -36, 6, 17, 0, '#3f9b57'); leaf(-4, -44, 4, 11, -0.25, '#4cae66');
  }

  function drawHammock(ctx, app) {
    const post = function (y) {
      const p = iso(0.5, y, 0), q = iso(0.5, y, 40);
      ctx.strokeStyle = '#6e5238'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6; ctx.stroke();
    };
    post(9.1); post(11.9);
    const edge = function (x) {
      return [iso(x, 9.1, 36), iso(x, 10.5, 12), iso(x, 11.9, 36)];
    };
    const a = edge(0.12), b = edge(0.88);
    ctx.beginPath();
    ctx.moveTo(a[0].x, a[0].y); ctx.quadraticCurveTo(a[1].x, a[1].y + 16, a[2].x, a[2].y);
    ctx.lineTo(b[2].x, b[2].y); ctx.quadraticCurveTo(b[1].x, b[1].y + 16, b[0].x, b[0].y); ctx.closePath();
    ctx.fillStyle = '#e8b84b'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = '#c97a4a'; ctx.lineWidth = 1.2;
    for (let i = 1; i < 5; i++) {
      const t = i / 5, x = 0.12 + 0.76 * 0.5;
      const mid = iso(x, 9.1 + 2.8 * t, 36 - 24 * (1 - Math.pow(2 * t - 1, 2)));
      ctx.beginPath(); ctx.moveTo(mid.x - 14, mid.y - 7 * 0.5 + 2); ctx.lineTo(mid.x + 14, mid.y + 7 * 0.5 + 2); ctx.stroke();
    }
  }

  function chairPieces(out, seatKey, sd) {
    const tx = sd.tile[0], ty = sd.tile[1];
    const pal = { top: '#6b7d96', left: '#4d5c72', right: '#3e4b5e' };
    const back = { top: '#7b8ca4', left: '#3f4d63', right: '#2f3b4d' };
    const base = tx + ty + 1;
    out.push({ depth: base - 0.3, draw: function (ctx) {
      const c = iso(tx + 0.5, ty + 0.5, 0);
      ctx.fillStyle = '#2d3441'; ctx.beginPath(); ctx.ellipse(c.x, c.y, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a5568'; ctx.fillRect(c.x - 2, c.y - 9, 4, 9);
      box(ctx, tx + 0.15, ty + 0.15, tx + 0.85, ty + 0.85, 8, 13, pal, {});
    } });
    let bx0, by0, bx1, by1, front = true;
    switch (sd.face) {
      case 'NE': bx0 = tx + 0.15; bx1 = tx + 0.85; by0 = ty + 0.78; by1 = ty + 0.92; front = true; break;
      case 'NW': bx0 = tx + 0.78; bx1 = tx + 0.92; by0 = ty + 0.15; by1 = ty + 0.85; front = true; break;
      case 'SW': bx0 = tx + 0.15; bx1 = tx + 0.85; by0 = ty + 0.08; by1 = ty + 0.22; front = false; break;
      default: bx0 = tx + 0.08; bx1 = tx + 0.22; by0 = ty + 0.15; by1 = ty + 0.85; front = false; break;
    }
    out.push({ depth: front ? base + 0.3 : base - 0.28, draw: function (ctx) { box(ctx, bx0, by0, bx1, by1, 13, 36, back, {}); } });
  }

  // ---------------------------------------------------------------- piezas ordenables
  O.collectPieces = function (app) {
    const out = [];
    O.FURNITURE.forEach(function (f) {
      if (f.type === 'hammock') { out.push({ id: f.id, depth: f.x + f.y + 1, draw: function (ctx) { drawHammock(ctx, app); } }); return; }
      for (let ty = f.y; ty < f.y + f.d; ty++) for (let tx = f.x; tx < f.x + f.w; tx++) {
        out.push({ id: f.id, depth: tx + ty + 1, draw: function (ctx) {
          if (f.type === 'plant') { drawPlant(ctx, tx, ty, app); return; }
          box(ctx, tx, ty, tx + 1, ty + 1, 0, f.h, O.PALETTES[f.pal], neighborFlags(f, tx, ty));
          if (f.type === 'cabinet') {
            const a = iso(tx + 0.1, ty + 1, 0), cc = iso(tx + 0.1, ty + 1, 0);
            ctx.strokeStyle = 'rgba(20,30,45,0.5)'; ctx.lineWidth = 0.8;
            for (let i = 1; i < 4; i++) { const p = iso(tx, ty + 1, i * 11.5), q = iso(tx + 1, ty + 1, i * 11.5); line(ctx, p, q); }
            ctx.fillStyle = '#2b3440';
            for (let i = 0; i < 4; i++) { const p = iso(tx + 0.5, ty + 1, i * 11.5 + 6); ctx.fillRect(p.x - 3, p.y - 1, 6, 2); }
          }
          if (f.type === 'cooler') {
            const p = iso(tx + 0.5, ty + 0.5, f.h); ctx.fillStyle = '#9fd3f0'; ctx.beginPath(); ctx.ellipse(p.x, p.y - 8, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.7; ctx.stroke();
          }
          if (f.type === 'shelf') {
            ctx.strokeStyle = '#b58b5e'; ctx.lineWidth = 1.4;
            for (let i = 1; i < 4; i++) line(ctx, iso(tx + 1, ty, i * 17.5), iso(tx + 1, ty + 1, i * 17.5));
            const cols = ['#d9534f', '#4a90d9', '#e8b84b', '#5fae6b', '#8e6bb8'];
            for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
              const p = iso(tx + 1, ty + 0.15 + k * 0.22, r * 17.5 + 3);
              ctx.fillStyle = cols[(r + k) % 5]; ctx.fillRect(p.x - 2, p.y - 10 + (k % 2), 4, 10 - (k % 2));
            }
          }
          if (f.decor) f.decor.forEach(function (d) { if (d.tile[0] === tx && d.tile[1] === ty) drawDecor(ctx, f, d, app); });
          if (f.screenTile && f.screenTile[0] === tx && f.screenTile[1] === ty) drawMonitor(ctx, f, app);
        } });
      }
    });
    Object.keys(O.SEATS).forEach(function (k) { const sd = O.SEATS[k]; if (sd.chair) chairPieces(out, k, sd); });
    return out;
  };

  // ---------------------------------------------------------------- objetos de pared
  function skyFor(localMin) {
    const h = localMin / 60;
    if (h >= 7.5 && h < 17.5) return { sky: '#9fd3f0', far: '#7fb6d6', sun: true };
    if ((h >= 6 && h < 7.5) || (h >= 17.5 && h < 19.5)) return { sky: '#f2b47c', far: '#c98a63' };
    return { sky: '#1b2745', far: '#121b33', stars: true };
  }

  function wallTransform(ctx, it) {
    if (it.wall === 'R') { const P = iso(it.a, 0, it.z0); ctx.transform(1, 0.5, 0, 1, P.x, P.y); }
    else { const P = iso(0, it.b, it.z0); ctx.transform(1, -0.5, 0, 1, P.x, P.y); }
  }
  O.wallItemQuad = function (it) {
    if (it.wall === 'R') return [iso(it.a, 0, it.z1), iso(it.b, 0, it.z1), iso(it.b, 0, it.z0), iso(it.a, 0, it.z0)];
    return [iso(0, it.b, it.z1), iso(0, it.a, it.z1), iso(0, it.a, it.z0), iso(0, it.b, it.z0)];
  };

  function txt(ctx, s, x, y, size, color, align, bold) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px Verdana, sans-serif';
    ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.fillText(s, x, y);
  }

  O.drawWallItem = function (ctx, it, app) {
    const st = app.state, w = (it.b - it.a) * 32, h = it.z1 - it.z0;
    ctx.save();
    wallTransform(ctx, it);
    switch (it.kind) {
      case 'window': {
        const active = st.session.name === it.session && st.session.active;
        const off = it.session === 'London' ? 6 * 60 : 1 * 60;
        const sky = skyFor(((st.clock.minutes + off) % 1440 + 1440) % 1440);
        if (active) { ctx.fillStyle = 'rgba(255,224,102,' + (0.35 + 0.15 * Math.sin(app.time * 3)) + ')'; ctx.fillRect(-4, -h - 4, w + 8, h + 8); }
        ctx.fillStyle = '#eef2f6'; ctx.fillRect(0, -h, w, h);
        ctx.fillStyle = sky.sky; ctx.fillRect(4, -h + 4, w - 8, h - 8);
        if (sky.stars) { ctx.fillStyle = '#ffffffcc'; [[10, 14], [26, 8], [44, 20], [60, 10], [18, 30]].forEach(function (p) { if (p[0] < w - 10) ctx.fillRect(p[0], -h + p[1], 1.5, 1.5); }); }
        if (sky.sun) { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(w - 18, -h + 16, 7, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = sky.far;
        [[6, 14], [18, 24], [30, 12], [42, 20], [54, 14]].forEach(function (p) { if (p[0] + 9 < w - 4) ctx.fillRect(p[0], -4 - p[1], 9, p[1]); });
        ctx.strokeStyle = '#eef2f6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w / 2, -h + 4); ctx.lineTo(w / 2, -4); ctx.moveTo(4, -h / 2); ctx.lineTo(w - 4, -h / 2); ctx.stroke();
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8; ctx.strokeRect(0, -h, w, h);
        ctx.fillStyle = active ? '#2f9e5a' : '#5b6b82'; ctx.fillRect(w / 2 - 22, 4, 44, 11);
        txt(ctx, it.label.toUpperCase(), w / 2, 12.5, 7, '#ffffff', 'center', true);
        break;
      }
      case 'clock': {
        const r = Math.min(w, h) / 2 - 1, cx = w / 2, cy = -h / 2;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 2; ctx.stroke();
        const m = st.clock.minutes, ha = ((m / 60) % 12) / 12 * Math.PI * 2 - Math.PI / 2, ma = (m % 60) / 60 * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = '#2d3441'; ctx.lineCap = 'round';
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ha) * r * 0.5, cy + Math.sin(ha) * r * 0.5); ctx.stroke();
        ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ma) * r * 0.78, cy + Math.sin(ma) * r * 0.78); ctx.stroke();
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.fillStyle = '#4a5568'; ctx.fillRect(cx + Math.cos(a) * (r - 3) - 0.6, cy + Math.sin(a) * (r - 3) - 0.6, 1.2, 1.2); }
        ctx.lineCap = 'butt';
        txt(ctx, 'COT', cx, -2, 6, '#7a8696', 'center');
        break;
      }
      case 'board': {
        ctx.fillStyle = '#aeb7c0'; ctx.fillRect(0, -h, w, h);
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(3, -h + 3, w - 6, h - 6);
        txt(ctx, 'BITÁCORA', 7, -h + 13, 7, '#2563eb', 'left', true);
        const lines = app.log.slice(-5);
        for (let i = 0; i < lines.length; i++) {
          const L = lines[i], col = L.tone === 'good' ? '#15803d' : L.tone === 'bad' ? '#b91c1c' : L.tone === 'warn' ? '#b45309' : '#334155';
          let s = L.t + ' ' + L.text; if (s.length > 21) s = s.slice(0, 20) + '…';
          txt(ctx, s, 7, -h + 24 + i * 7.6, 6, col, 'left');
        }
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8; ctx.strokeRect(0, -h, w, h);
        break;
      }
      case 'gauge': {
        const r = st.risk;
        ctx.fillStyle = '#1b2330'; ctx.fillRect(0, -h, w, h);
        ctx.strokeStyle = r.locked ? '#f87171' : '#8c9db2'; ctx.lineWidth = 2; ctx.strokeRect(1, -h + 1, w - 2, h - 2);
        txt(ctx, 'TOPE DIARIO GLOBAL', w / 2, -h + 12, 7.5, '#e5e9f0', 'center', true);
        const bx = 10, bw = w - 20, by = -h + 22, bh = 12, mid = bx + bw / 2;
        ctx.fillStyle = '#7f1d1d'; ctx.fillRect(bx, by, bw / 2, bh);
        ctx.fillStyle = '#14532d'; ctx.fillRect(mid, by, bw / 2, bh);
        const frac = O.capFraction(r);
        ctx.fillStyle = frac >= 0 ? '#4ade80' : '#f87171';
        if (frac >= 0) ctx.fillRect(mid, by, frac * bw / 2, bh); else ctx.fillRect(mid + frac * bw / 2, by, -frac * bw / 2, bh);
        ctx.fillStyle = '#fff'; ctx.fillRect(mid - 0.5, by - 3, 1, bh + 6);
        if (app.publicMode) {                                                    // espejo publico: ni topes ni P&L en USD, solo la fraccion del tope
          txt(ctx, '-', bx, by + bh + 9, 6.5, '#fca5a5', 'left');
          txt(ctx, '+', bx + bw, by + bh + 9, 6.5, '#86efac', 'right');
          txt(ctx, st.publicFraction === null || st.publicFraction === undefined ? '—' : O.fmtPct(st.publicFraction), mid, by + bh + 9, 7.5, '#ffffff', 'center', true);
        } else {
          txt(ctx, r.capLoss !== null ? '-' + r.capLoss : 'sin tope', bx, by + bh + 9, 6.5, '#fca5a5', 'left');
          txt(ctx, r.capProfit !== null ? '+' + r.capProfit : 'sin tope', bx + bw, by + bh + 9, 6.5, '#86efac', 'right');
          txt(ctx, O.fmtUsd(r.dailyPnl, true), mid, by + bh + 9, 7.5, '#ffffff', 'center', true);
        }
        const lampOn = r.locked ? (Math.floor(app.time * 3) % 2) : 1;
        ctx.fillStyle = r.locked ? (lampOn ? '#f87171' : '#5a1e1e') : '#4ade80';
        ctx.beginPath(); ctx.arc(w - 8, -h + 8, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'poster': {
        ctx.fillStyle = '#f4f6f8'; ctx.fillRect(0, -h, w, h);
        ctx.fillStyle = '#1b2533'; ctx.fillRect(3, -h + 3, w - 6, h - 6);
        const hist = st.history, n = Math.min(hist.length, 7), base = hist.length - n;
        let lo = Infinity, hi = -Infinity;
        for (let i = base; i < hist.length; i++) { lo = Math.min(lo, hist[i]); hi = Math.max(hi, hist[i]); }
        const Y = function (v) { return -6 - (v - lo) / Math.max(1e-6, hi - lo) * (h - 18); };
        for (let i = 0; i < n && n >= 2; i++) {                      // con menos de 2 precios aun no hay velas que dibujar
          const v = hist[base + i], pv = hist[base + i - 1] !== undefined ? hist[base + i - 1] : v, x = 8 + i * (w - 16) / n;
          const up = v >= pv, c = up ? '#4ade80' : '#f87171';
          ctx.fillStyle = c; ctx.fillRect(x, Math.min(Y(v), Y(pv)), 4, Math.max(3, Math.abs(Y(v) - Y(pv))));
          ctx.fillRect(x + 1.5, Math.min(Y(v), Y(pv)) - 3, 1, Math.max(3, Math.abs(Y(v) - Y(pv))) + 6);
        }
        break;
      }
      case 'art': {
        ctx.fillStyle = '#6e5238'; ctx.fillRect(0, -h, w, h);
        ctx.fillStyle = '#f2c230'; ctx.fillRect(3, -h + 3, w - 6, h - 6);
        ctx.fillStyle = '#e08a1e'; ctx.beginPath(); ctx.arc(w / 2, -h / 2 - 2, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8a5a1e'; ctx.beginPath(); ctx.moveTo(3, -4); ctx.lineTo(w * 0.35, -h * 0.45); ctx.lineTo(w * 0.6, -4); ctx.closePath(); ctx.fill();
        txt(ctx, 'XAU', w / 2, -h + 14, 7, '#6e4a12', 'center', true);
        break;
      }
      case 'calendar': {
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, -h, w, h);
        ctx.fillStyle = '#c1272d'; ctx.fillRect(0, -h, w, 12);
        txt(ctx, 'OCT 2026', w / 2, -h + 9, 7, '#fff', 'center', true);
        const cw = (w - 8) / 7, chh = (h - 20) / 5;
        for (let i = 0; i < 31; i++) {
          const col = (i + 3) % 7, row = Math.floor((i + 3) / 7);
          const v = st.monthly[i];
          ctx.fillStyle = v === null ? '#e5e9f0' : v >= 0 ? 'rgba(34,197,94,' + (0.3 + Math.min(0.6, v / 200)) + ')' : 'rgba(239,68,68,' + (0.3 + Math.min(0.6, -v / 200)) + ')';
          ctx.fillRect(4 + col * cw, -h + 15 + row * chh, cw - 1, chh - 1);
        }
        break;
      }
      case 'tv': {
        ctx.fillStyle = '#20252e'; ctx.fillRect(0, -h, w, h);
        ctx.fillStyle = '#0d141d'; ctx.fillRect(4, -h + 4, w - 8, h - 8);
        const eq = st.equity;
        txt(ctx, 'P&L', 9, -h + 14, 7, '#7dd3fc', 'left', true);
        if (!eq.length) { txt(ctx, 'sin datos', w / 2, -h / 2, 7, '#64748b', 'center'); break; }
        if (!app.publicMode) txt(ctx, O.fmtUsd(eq[eq.length - 1].v, true), w - 9, -h + 14, 7, eq[eq.length - 1].v >= 0 ? '#4ade80' : '#f87171', 'right', true);
        else txt(ctx, eq[eq.length - 1].v >= 0 ? '▲' : '▼', w - 9, -h + 14, 7, eq[eq.length - 1].v >= 0 ? '#4ade80' : '#f87171', 'right', true);
        let lo = Infinity, hi = -Infinity;
        eq.forEach(function (p) { lo = Math.min(lo, p.v); hi = Math.max(hi, p.v); });
        if (hi - lo < 20) { hi += 10; lo -= 10; }
        const X = function (i) { return 9 + i / Math.max(1, eq.length - 1) * (w - 18); };
        const Y = function (v) { return -8 - (v - lo) / (hi - lo) * (h - 36); };
        ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 0.7;
        if (lo < 0 && hi > 0) { ctx.beginPath(); ctx.moveTo(9, Y(0)); ctx.lineTo(w - 9, Y(0)); ctx.stroke(); }
        ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1.4; ctx.beginPath();
        eq.forEach(function (p, i) { if (i) ctx.lineTo(X(i), Y(p.v)); else ctx.moveTo(X(i), Y(p.v)); });
        ctx.stroke();
        ctx.fillStyle = 'rgba(125,211,252,' + (0.04 + 0.03 * Math.sin(app.time * 2)) + ')'; ctx.fillRect(0, -h, w, h);
        break;
      }
      case 'door': {
        ctx.fillStyle = '#6e4a2c'; ctx.fillRect(0, -h, w, h);
        ctx.fillStyle = '#8a6038'; ctx.fillRect(4, -h + 4, w - 8, h - 8);
        ctx.fillStyle = '#6e4a2c'; ctx.fillRect(w / 2 - 0.5, -h + 4, 1, h - 8);
        ctx.fillStyle = '#e8b84b'; ctx.fillRect(w - 10, -h / 2, 3, 3);
        ctx.fillStyle = '#2f9e5a'; ctx.fillRect(w / 2 - 15, -h - 11, 30, 9);
        txt(ctx, 'SALIDA', w / 2, -h - 4, 6.5, '#fff', 'center', true);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8; ctx.strokeRect(0, -h, w, h);
        if (st.risk.locked || st.eod.phase === 'closed' || st.eod.phase === 'weekend') {
          const closed = st.risk.locked;
          ctx.fillStyle = closed ? '#c1272d' : '#334155'; ctx.fillRect(w / 2 - 17, -h / 2 - 16, 34, 16);
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.strokeRect(w / 2 - 17, -h / 2 - 16, 34, 16);
          txt(ctx, closed ? 'TOPE' : 'CERRADO', w / 2, -h / 2 - 5, 6.5, '#fff', 'center', true);
        }
        break;
      }
      default: break;
    }
    ctx.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
