/* Oficina ANZOBOT — efectos (particulas), placas de nombre y globos de dialogo. */
(function (root) {
  'use strict';
  const O = root.Office = root.Office || {};

  function Fx(app) { this.app = app; this.p = []; this.rng = O.makeRng(99); }

  // posicion de la cabeza de un personaje en el mundo
  O.headPos = function (c) {
    const b = O.iso(c.x, c.y, 0);
    if (c.lying) return { x: b.x - 2, y: b.y - 46 };
    return { x: b.x, y: b.y - (c.seated ? 46 : 58) };
  };

  Fx.prototype.spawn = function (kind, c, opts) {
    const h = O.headPos(c), r = this.rng, P = this.p;
    switch (kind) {
      case 'confetti':
        for (let i = 0; i < 26; i++) P.push({ k: 'confetti', x: h.x + r.range(-10, 10), y: h.y - 4, vx: r.range(-40, 40), vy: r.range(-90, -30), life: 0, max: r.range(1.4, 2.4), color: r.pick(['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#c084fc']) });
        break;
      case 'coins':
        for (let i = 0; i < 7; i++) P.push({ k: 'coin', x: h.x + r.range(-8, 8), y: h.y, vx: r.range(-18, 18), vy: r.range(-110, -70), life: -i * 0.09, max: 1.5 });
        break;
      case 'zzz':
        P.push({ k: 'zzz', follow: c, x: 0, y: 0, ox: 10, oy: 0, vx: 8, vy: -16, life: 0, max: 2.2, size: 11 });
        break;
      case 'rain':
        P.push({ k: 'cloud', follow: c, life: 0, max: 4.2 });
        break;
      case 'spark':
        for (let i = 0; i < 9; i++) P.push({ k: 'spark', x: h.x + r.range(-6, 6), y: h.y + 14 + r.range(-4, 4), vx: r.range(-60, 60), vy: r.range(-70, -10), life: 0, max: r.range(0.4, 0.9) });
        break;
      case 'alarm':
        P.push({ k: 'alarm', follow: c, life: 0, max: 4 });
        break;
      case 'bell':
        P.push({ k: 'bell', follow: c, life: 0, max: 3 });
        break;
      default: break;
    }
  };

  Fx.prototype.update = function (dt) {
    const P = this.p;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life += dt;
      if (p.life < 0) continue;
      if (p.k === 'confetti' || p.k === 'coin' || p.k === 'spark') { p.vy += (p.k === 'spark' ? 90 : 160) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      else if (p.k === 'zzz') { p.ox += p.vx * dt; p.oy += p.vy * dt; }
      if (p.life > p.max) P.splice(i, 1);
    }
  };

  Fx.prototype.draw = function (ctx) {
    const app = this.app;
    this.p.forEach(function (p) {
      if (p.life < 0) return;
      const a = O.clamp(1 - p.life / p.max, 0, 1);
      switch (p.k) {
        case 'confetti': ctx.fillStyle = p.color; ctx.globalAlpha = a; ctx.fillRect(p.x, p.y, 3, 3); ctx.globalAlpha = 1; break;
        case 'coin':
          ctx.globalAlpha = a; ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 3.4, 4.2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#b45309'; ctx.lineWidth = 0.8; ctx.stroke(); ctx.fillStyle = '#b45309'; ctx.fillRect(p.x - 0.5, p.y - 2, 1, 4); ctx.globalAlpha = 1; break;
        case 'spark': ctx.globalAlpha = a; ctx.fillStyle = '#fde047'; ctx.fillRect(p.x, p.y, 2, 2); ctx.globalAlpha = 1; break;
        case 'zzz': {
          const h = O.headPos(p.follow);
          ctx.globalAlpha = a; ctx.fillStyle = '#e0e7ff'; ctx.font = 'bold ' + (p.size + p.life * 2) + 'px Verdana, sans-serif'; ctx.textAlign = 'left';
          ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.5; ctx.strokeText('Z', h.x + p.ox, h.y - 6 + p.oy); ctx.fillText('Z', h.x + p.ox, h.y - 6 + p.oy); ctx.globalAlpha = 1; break;
        }
        case 'cloud': {
          const h = O.headPos(p.follow), cx = h.x, cy = h.y - 22, f = O.clamp(Math.min(p.life * 3, (p.max - p.life) * 3, 1), 0, 1);
          ctx.globalAlpha = f; ctx.fillStyle = '#64748b';
          [[-10, 0, 8], [0, -4, 10], [10, 0, 8], [0, 2, 9]].forEach(function (c) { ctx.beginPath(); ctx.arc(cx + c[0], cy + c[1], c[2], 0, Math.PI * 2); ctx.fill(); });
          ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 1.2;
          for (let i = 0; i < 6; i++) { const rx = cx - 12 + i * 5, ry = cy + 10 + ((p.life * 70 + i * 9) % 24); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 1.5, ry + 5); ctx.stroke(); }
          ctx.globalAlpha = 1; break;
        }
        case 'alarm': {
          const h = O.headPos(p.follow), on = Math.floor(p.life * 6) % 2;
          ctx.fillStyle = on ? '#ef4444' : '#7f1d1d'; ctx.beginPath(); ctx.arc(h.x + 22, h.y - 14, 4, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 1;
          if (on) { for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2 + Math.PI / 4; ctx.beginPath(); ctx.moveTo(h.x + 22 + Math.cos(an) * 6, h.y - 14 + Math.sin(an) * 6); ctx.lineTo(h.x + 22 + Math.cos(an) * 9, h.y - 14 + Math.sin(an) * 9); ctx.stroke(); } }
          break;
        }
        case 'bell': {
          const h = O.headPos(p.follow), s = Math.sin(p.life * 30) * 2;
          ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.4;
          [-1, 1].forEach(function (d) { ctx.beginPath(); ctx.arc(h.x + 18 * d + s * d, h.y - 8, 6 + (p.life * 8) % 6, -0.6 + (d < 0 ? Math.PI : 0), 0.6 + (d < 0 ? Math.PI : 0)); ctx.stroke(); });
          break;
        }
        default: break;
      }
    });
  };

  // ---------------------------------------------------------------- placas de nombre y globos
  const STATE_COLOR = { scanning: '#7dd3fc', armed: '#fbbf24', cooldown: '#a78bfa', capped: '#94a3b8', sleeping: '#a78bfa', away: '#64748b' };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function wrap(ctx, text, maxW) {
    const words = text.split(' '), lines = [];
    let cur = '';
    words.forEach(function (w) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  }

  // Placas y globos se dibujan en pantalla (tamano constante), no en el mundo; view = {s, ox, oy}.
  Fx.prototype.drawLabels = function (ctx, view, hoverId, selId) {
    const app = this.app, S = app.state;
    const k = O.clamp(view.s, 0.85, 1.3);
    const items = [];
    ctx.font = 'bold 10px Verdana, sans-serif';
    O.CAST.forEach(function (def) {
      const c = app.chars[def.id];
      if (!c.visible || c.alpha < 0.3) return;
      const h = O.headPos(c);
      const st = def.kind === 'strategy' ? S.strategies[def.id] : null, pos = st && st.position;
      const label = def.name + (c.ghost ? ' · apagada' : '');
      const grade = st && !c.ghost && O.GRADE_COLOR[st.grade] ? st.grade : null;
      const w = Math.max(ctx.measureText(label).width + 20 + (grade ? 14 : 0), pos ? 70 : 0), hh = pos ? 27 : 15;
      items.push({ def: def, c: c, st: st, pos: pos, label: label, grade: grade, w: w, hh: hh, hx: view.ox + h.x * view.s, hy: view.oy + h.y * view.s, shift: 0 });
    });
    // evita que las placas se pisen: de atras hacia adelante, sube la que choque con otra ya colocada
    items.sort(function (a, b) { return a.hy - b.hy; });
    const placed = [];
    items.forEach(function (it) {
      for (let n = 0; n < 8; n++) {
        const r = { x0: it.hx - it.w / 2 * k - 2, x1: it.hx + it.w / 2 * k + 2, y0: it.hy - (12 + it.hh) * k + it.shift - 2, y1: it.hy - 12 * k + it.shift + 2 };
        const hit = placed.find(function (p) { return r.x0 < p.x1 && r.x1 > p.x0 && r.y0 < p.y1 && r.y1 > p.y0; });
        if (!hit) { placed.push(r); break; }
        it.shift = hit.y0 - (it.hy - 12 * k) - 3;
      }
    });

    items.forEach(function (it) {
      const def = it.def, c = it.c, st = it.st, pos = it.pos, w = it.w, hh = it.hh;
      ctx.save();
      ctx.globalAlpha = Math.min(1, c.alpha) * (c.ghost ? 0.6 : 1);
      ctx.translate(it.hx, it.hy + it.shift);
      ctx.scale(k, k);
      const x = -w / 2, py = -12 - hh;
      const toneColor = pos && pos.tone === 'up' ? '#4ade80' : pos && pos.tone === 'down' ? '#f87171' : '#7dd3fc';
      const dot = c.ghost ? '#475569' : st ? (pos ? (pos.pnl === null ? toneColor : pos.pnl >= 0 ? '#4ade80' : '#f87171') : (STATE_COLOR[st.state] || '#7dd3fc')) : '#cbd5e1';
      const emph = hoverId === def.id || selId === def.id;
      ctx.font = 'bold 10px Verdana, sans-serif';
      rr(ctx, x, py, w, hh, 4); ctx.fillStyle = emph ? 'rgba(30,41,59,0.95)' : 'rgba(15,21,31,0.84)'; ctx.fill();
      ctx.strokeStyle = emph ? '#fbbf24' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = emph ? 1.5 : 0.8; ctx.stroke();
      ctx.fillStyle = dot; ctx.beginPath(); ctx.arc(x + 8, py + 7.5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1f5f9'; ctx.textAlign = 'left'; ctx.fillText(it.label, x + 15, py + 11);
      if (it.grade) {                                                                   // insignia de evidencia: letra sobre su color
        rr(ctx, x + w - 15, py + 2.5, 11, 10, 2); ctx.fillStyle = O.GRADE_COLOR[it.grade]; ctx.fill();
        ctx.font = 'bold 8px Verdana, sans-serif'; ctx.fillStyle = '#0b1220'; ctx.textAlign = 'center'; ctx.fillText(it.grade, x + w - 9.5, py + 10.5);
        ctx.font = 'bold 10px Verdana, sans-serif'; ctx.textAlign = 'left';
      }
      if (pos) {
        ctx.font = 'bold 9px Verdana, sans-serif';
        ctx.fillStyle = pos.pnl === null ? (pos.tone === 'up' ? '#86efac' : pos.tone === 'down' ? '#fca5a5' : '#cbd5e1') : pos.pnl >= 0 ? '#86efac' : '#fca5a5'; ctx.textAlign = 'center';
        ctx.fillText(pos.side + '  ' + (pos.pnl === null ? (pos.tone === 'up' ? '▲' : pos.tone === 'down' ? '▼' : pos.tone === 'flat' ? '▬' : '—') : O.fmtUsd(pos.pnl, true)), 0, py + 20.5);       // sin P&L (repeticion) '—'; en el espejo publico, solo el tono       // en una repeticion el ledger no guarda el P&L flotante
        if (pos.sl !== null && pos.entry !== null && pos.sl !== pos.entry) {        // sin stop publicado no hay barra SL-TP que dibujar
          const far = pos.tp !== null ? pos.tp : (pos.side === 'BUY' ? pos.entry + 3 * Math.abs(pos.entry - pos.sl) : pos.entry - 3 * Math.abs(pos.entry - pos.sl));
          const lo = Math.min(pos.sl, far), hi = Math.max(pos.sl, far);
          const bw = w - 12, bx = x + 6, by = py + hh - 5;
          const T = function (v) { return bx + O.clamp((v - lo) / (hi - lo), 0, 1) * bw; };
          const slX = T(pos.sl), enX = T(pos.entry);
          ctx.fillStyle = '#7f1d1d'; ctx.fillRect(Math.min(slX, enX), by, Math.abs(enX - slX), 2.5);
          ctx.fillStyle = '#14532d';
          if (slX < enX) ctx.fillRect(enX, by, bx + bw - enX, 2.5); else ctx.fillRect(bx, by, enX - bx, 2.5);
          ctx.fillStyle = '#fff'; ctx.fillRect(enX - 0.5, by - 1, 1, 4.5);
          const cur = pos.price !== null && pos.price !== undefined ? pos.price : S.price;
          if (cur !== null && cur !== undefined && isFinite(cur)) { ctx.fillStyle = pos.pnl >= 0 ? '#4ade80' : '#f87171'; ctx.beginPath(); ctx.arc(T(cur), by + 1.2, 2.2, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      // humor
      if (c.ghost) { /* apagada: sin humor ni globos */ } else if (c.mood === 'worried') {
        const dy = (Math.floor(app.time * 3) % 3) * 1.5;
        ctx.fillStyle = '#7dd3fc'; ctx.beginPath(); ctx.moveTo(w / 2 + 4, -10 + dy); ctx.quadraticCurveTo(w / 2 + 8, -4 + dy, w / 2 + 4, -2 + dy); ctx.quadraticCurveTo(w / 2, -4 + dy, w / 2 + 4, -10 + dy); ctx.fill();
      } else if (c.mood === 'happy') {
        const hx = w / 2 + 6, hy = -8 - (Math.floor(app.time * 2) % 2);
        ctx.fillStyle = '#f87171'; ctx.beginPath(); ctx.moveTo(hx, hy + 5); ctx.bezierCurveTo(hx - 7, hy - 1, hx - 3, hy - 6, hx, hy - 2); ctx.bezierCurveTo(hx + 3, hy - 6, hx + 7, hy - 1, hx, hy + 5); ctx.fill();
      }
      // globo
      if (c.bubble && !c.ghost) {
        const b = c.bubble, isAlarm = b.kind === 'alarm', isThink = b.kind === 'think', isSad = b.kind === 'sad';
        ctx.font = (isAlarm ? 'bold ' : '') + '10px Verdana, sans-serif';
        const lines = wrap(ctx, b.text, 128);
        let bw2 = 0; lines.forEach(function (l) { bw2 = Math.max(bw2, ctx.measureText(l).width); });
        const bwid = bw2 + 14, bhei = lines.length * 12 + 8, bxx = -bwid / 2, byy = py - bhei - 9;
        const bg = isAlarm ? '#fff1f2' : isThink ? '#eef6ff' : isSad ? '#f1f5f9' : '#ffffff', bd = isAlarm ? '#ef4444' : '#1f2937';
        rr(ctx, bxx, byy, bwid, bhei, 7); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = bd; ctx.lineWidth = isAlarm ? 1.6 : 0.9; ctx.stroke();
        if (isThink) {
          ctx.fillStyle = bg; ctx.strokeStyle = bd; ctx.lineWidth = 0.8;
          [[0, byy + bhei + 3, 3], [-4, byy + bhei + 8, 2]].forEach(function (d) { ctx.beginPath(); ctx.arc(d[0], d[1], d[2], 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
        } else {
          ctx.beginPath(); ctx.moveTo(-4, byy + bhei - 0.5); ctx.lineTo(0, byy + bhei + 6); ctx.lineTo(4, byy + bhei - 0.5);
          ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = bd; ctx.lineWidth = 0.9; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-3.2, byy + bhei - 0.7); ctx.lineTo(3.2, byy + bhei - 0.7); ctx.strokeStyle = bg; ctx.lineWidth = 1.6; ctx.stroke();
        }
        ctx.fillStyle = isAlarm ? '#b91c1c' : '#111827'; ctx.textAlign = 'center';
        lines.forEach(function (l, i) { ctx.fillText(l, 0, byy + 14 + i * 12); });
      }
      ctx.restore();
    });
  };

  O.Fx = Fx;
})(typeof window !== 'undefined' ? window : globalThis);
