/* Oficina ANZOBOT — arranque y bucle principal. */
(function (root) {
  'use strict';
  const O = root.Office = root.Office || {};

  O.openingText = function (src) {
    return src.mode === 'live' ? 'Esperando el estado del bot…' : src.mode === 'public' ? 'Conectando con el espejo público…' : src.mode === 'replay' ? 'Repetición del ' + src.day.date : 'Oficina abierta (simulada)';
  };

  // Crea la aplicacion sin pantalla (sirve igual para las pruebas con Node). `source` = fuente de datos (simulada o en vivo).
  O.createApp = function (seed, source) {
    const app = O.app = { time: 0, chars: {}, log: [], darkness: 0, alarm: 0, staticLayer: null, staticKey: '', ui: null };
    app.source = source || new O.Sim(seed || 11);
    app.state = app.source.state;
    app.publicMode = app.source.mode === 'public';        // espejo publico: ni un monto en pantalla (lo que no trae el estado publico no se dibuja)
    app.fx = new O.Fx(app);
    O.CAST.forEach(function (def) {
      const sd = O.SEATS[def.id];
      app.chars[def.id] = new O.Character(def, sd ? sd.tile : O.POINTS.door);
    });
    app.director = new O.Director(app);
    app.director.init();
    app.log.push({ t: O.fmtClock(app.state.clock.minutes), text: O.openingText(app.source), tone: 'info' });
    app.seeded = false;
    app.fallbackOnOffline = false;       // main.js lo enciende: sin servidor de la oficina (3 sondeos seguidos sin respuesta) pasa a la simulacion

    // Cambia de fuente (por ejemplo de en vivo a simulada si no hay servidor): todos vuelven a su sitio segun la nueva fuente.
    app.setSource = function (src) {
      app.source = src; app.state = src.state; app.seeded = false; app.publicMode = src.mode === 'public';
      app.log.length = 0;
      app.log.push({ t: O.fmtClock(app.state.clock.minutes), text: O.openingText(src), tone: 'info' });
      app.director.reset();
      if (app.ui) app.ui.setMode(src.mode);
    };

    // un paso de simulacion + conducta (sin dibujar)
    app.tick = function (dt) {
      app.time += dt;
      app.source.update(dt);
      if (app.source.needsReset) { app.source.needsReset = false; app.state = app.source.state; app.director.reset(); }     // salto en el tiempo de la repeticion
      if (app.fallbackOnOffline && app.source.mode === 'live' && app.source.failures >= 3) app.setSource(new O.Sim(11));
      app.state = app.source.state;
      if (app.source.firstData && !app.seeded) {         // primer estado real: cada quien arranca donde el bot dice que esta
        app.seeded = true;
        app.director.reset();
        app.log.push({ t: O.fmtClock(app.state.clock.minutes), text: app.publicMode ? 'Conectado al espejo público' : 'Conectada al bot', tone: 'good' });
      }
      app.director.update(dt);
      app.fx.update(dt);
      // luz del dia: oscurece fuera de sesion y mas cuando el mercado esta cerrado
      const S = app.state;
      let target = S.eod.phase !== 'open' ? 0.4 : (!S.session.active ? 0.13 : 0);
      app.stale = (app.source.mode === 'live' || app.source.mode === 'public') && app.source.status !== 'live';       // sin datos frescos del bot: la sala se apaga un poco
      if (app.stale) target = Math.max(target, 0.3);
      app.darkness += (target - app.darkness) * Math.min(1, dt * 1.5);
      app.alarm = S.mt5.connected ? 0 : 1;
    };
    return app;
  };

  O.start = function (opts) {
    opts = opts || {};
    const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
    const http = typeof location !== 'undefined' && /^https?:$/.test(location.protocol);
    // En vivo si la pagina la sirve office/server.py; simulada con ?sim, desde un archivo, o si no hay servidor de la oficina. `opts.source` = otra fuente (el espejo publico).
    const app = O.createApp(11, opts.source || (q.has('sim') || !http ? new O.Sim(11) : new O.LiveSource()));
    app.fallbackOnOffline = opts.source ? false : !q.has('live');
    app.ui = new O.UI(app);
    app.ui.init();

    const cv = app.ui.cv, ctx = cv.getContext('2d');
    let last = performance.now();

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      app.tick(dt);
      app.ui.updateHud(dt);
      draw(ctx);
      requestAnimationFrame(frame);
    }

    function draw(ctx) {
      const v = app.ui.view;
      if (!app.staticLayer || app.staticKey !== v.s.toFixed(3) + '|' + v.dpr) {
        app.staticLayer = O.buildStatic(v.s * v.dpr);
        app.staticKey = v.s.toFixed(3) + '|' + v.dpr;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(v.s * v.dpr, 0, 0, v.s * v.dpr, v.ox * v.dpr, v.oy * v.dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(app.staticLayer, 0, 0, O.WORLD_W, O.WORLD_H);

      O.WALL_ITEMS.forEach(function (it) { O.drawWallItem(ctx, it, app); });

      const pieces = O.collectPieces(app);
      O.CAST.forEach(function (def) {
        const c = app.chars[def.id];
        if (!c.visible) return;
        pieces.push({ depth: c.x + c.y + 0.001, draw: function (cx) {
          const b = O.iso(c.x, c.y, 0);
          const st = def.kind === 'strategy' ? app.state.strategies[def.id] : null;
          const s = { x: b.x, y: b.y, face: c.face, pose: c.drawPose(), t: c.t, alpha: c.alpha * (c.ghost ? 0.38 : 1), prop: c.prop, lying: c.lying,
            grade: st && st.state !== 'off' ? st.grade : null };
          if (c.lying) { s.x = b.x - 24; s.y = b.y - 12; }
          O.drawCharacter(cx, c.look, s);
        } });
      });
      pieces.sort(function (a, b) { return a.depth - b.depth; });
      pieces.forEach(function (p) { p.draw(ctx); });

      // luz de ambiente y alarma, solo sobre la sala
      if (app.darkness > 0.01 || app.alarm) {
        ctx.save();
        ctx.beginPath();
        const W = O.GRID_W, H = O.GRID_H, WH = O.WALL_H, iso = O.iso;
        const pts = [iso(0, 0, WH), iso(W, 0, WH), iso(W, 0, -10), iso(W, H, -10), iso(0, H, -10), iso(0, H, WH)];
        pts.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
        ctx.closePath(); ctx.clip();
        if (app.darkness > 0.01) { ctx.fillStyle = 'rgba(10,18,44,' + app.darkness + ')'; ctx.fillRect(0, 0, O.WORLD_W, O.WORLD_H); }
        if (app.alarm) { ctx.fillStyle = 'rgba(255,40,40,' + (0.05 + 0.04 * Math.sin(app.time * 5)) + ')'; ctx.fillRect(0, 0, O.WORLD_W, O.WORLD_H); }
        ctx.restore();
      }

      app.fx.draw(ctx);

      // resaltado del objeto bajo el puntero
      const hv = app.ui.hover;
      if (hv && hv.kind === 'spot') {
        ctx.save();
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
        const poly = hv.wall ? O.wallItemQuad(hv.wall) : O.furnitureHull(hv.furn);
        ctx.beginPath(); poly.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.stroke();
        ctx.restore();
      }
      ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);          // placas y globos en pantalla, tamano constante
      app.fx.drawLabels(ctx, v, hv && hv.kind === 'char' ? hv.id : null, app.ui.selected);
    }

    requestAnimationFrame(frame);
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () { if (O.publicUrl && O.publicUrl()) O.startPublic(); else O.start(); });
  }
})(typeof window !== 'undefined' ? window : globalThis);
