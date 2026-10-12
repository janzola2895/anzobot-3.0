/* Oficina ANZOBOT — HUD, ficha de personaje, paneles de objetos y panel del simulador (fase 0). */
(function (root) {
  'use strict';
  const O = root.Office = root.Office || {};

  const STATE_LABEL = { scanning: 'Escaneando', armed: 'Setup armado', in_position: 'En posición', cooldown: 'Enfriamiento (café)', capped: 'Tope diario', sleeping: 'Durmiendo', away: 'Fuera de turno', off: 'Apagada en el config' };
  const PHASE_LABEL = { open: 'Mercado abierto', closed: 'Mercado cerrado', weekend: 'Fin de semana' };
  const SRC_LABEL = { waiting: 'Conectando con la oficina…', nobot: 'Sin estado del bot (¿apagado o con office.enabled en false?)',
    offline: 'Servidor de la oficina sin respuesta', stale: 'Sin señal del bot' };
  const capText = function (cap) {
    if (!cap) return 'sin tope propio';
    return (cap.profit !== null ? '+' + cap.profit : 'sin tope') + ' / ' + (cap.loss !== null ? '-' + cap.loss : 'sin tope');
  };
  const GRADE_TEXT = { A: 'Ventaja demostrable', B: 'Ventaja moderada', C: 'Sin ventaja clara', D: 'Ventaja negativa' };

  // Objetos con clic: los que tienen `panel` abren uno de los 4 paneles del escritorio, `controls` la ventana de controles; el resto, una ficha de texto.
  const HOTSPOTS = {
    TV: { title: 'Gráfica de ganancias', panel: 'profit' },
    CALENDAR: { title: 'P&L mensual', panel: 'monthly' },
    CABINET: { title: 'Archivador de operaciones', panel: 'history' },
    D_LEDGER: { title: 'Libro del contador (auditoría)', panel: 'audit' },
    GAUGE: { title: 'Topes diarios', controls: 'caps' },
    BOARD: { title: 'Bitácora de eventos', kind: 'log' },
    D_RISK: { title: 'Panel de control', controls: 'control' },
    COUNTER_ORDERS: { title: 'Ventanilla de órdenes', text: 'Aquí llegan las órdenes de entrada, trailing y cierre hacia el broker. Cada una que el bot manda aparece en la bitácora de la pared.' },
    WIN_LONDON: { title: 'Sesión de Londres', text: 'Ventana de mercado 02:00–07:00 COT (07:00–12:00 UTC). Se ilumina cuando está activa.' },
    WIN_NY: { title: 'Sesión de Nueva York', text: 'Ventana de mercado 07:30–12:30 COT (12:30–17:30 UTC). Se ilumina cuando está activa.' },
    CLOCK: { title: 'Reloj', text: 'Hora de Colombia (COT), la que usa el bot para sus cierres.' },
    DOOR: { title: 'Puerta', text: 'Por aquí salen los empleados al terminar su turno (cierre diario, tope diario global o fin de semana).' },
  };

  function UI(app) {
    this.app = app;
    this.hover = null;          // {kind:'char'|'spot', id}
    this.selected = null;       // id de personaje
    this.sel = O.STRATS[0].key; // estrategia elegida en el simulador
    this.hudT = 0;
  }

  UI.prototype.$ = function (id) { return document.getElementById(id); };

  UI.prototype.init = function () {
    const ui = this, app = this.app;
    this.cv = this.$('cv'); this.stage = this.$('stage');
    this.ficha = this.$('ficha'); this.tip = this.$('tip'); this.modal = this.$('modal');
    this.$('btnSim').addEventListener('click', function () { document.body.classList.toggle('sim-hidden'); ui.resize(); });
    this.$('btnReplay').addEventListener('click', function () { O.Replay.open(); });
    this.cv.addEventListener('mousemove', function (e) { ui.onMove(e); });
    this.cv.addEventListener('mouseleave', function () { ui.hover = null; ui.tip.hidden = true; });
    this.cv.addEventListener('click', function (e) { ui.onClick(e); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') { ui.closeModal(); ui.select(null); } });
    window.addEventListener('resize', function () { ui.resize(); });
    this.setMode(app.source.mode);
    this.resize();
  };

  // Simulado: panel para forzar eventos. En vivo: sin panel (la oficina solo mira lo que publica el bot).
  UI.prototype.setMode = function (mode) {
    const live = mode === 'live', replay = mode === 'replay', pub = mode === 'public';
    document.body.classList.toggle('live', live || replay || pub);
    document.body.classList.toggle('replay', replay);
    document.body.classList.toggle('public', pub);
    this.$('btnSim').hidden = live || replay || pub;
    this.$('btnReplay').hidden = !live;                  // la repeticion se ofrece desde la oficina en vivo (y desde el calendario)
    this.$('brandMode').textContent = pub ? 'Espejo público' : replay ? 'Repetición de un día' : live ? 'En vivo' : 'Datos simulados';
    this.$('brandMode').className = live || pub ? 'live' : replay ? 'replay' : '';
    const lbl = this.$('pnlLbl'); if (lbl) lbl.textContent = pub ? 'Día vs. tope' : 'P&L del día';
    if (!live && !replay && !pub && !this.simBuilt) { this.simBuilt = true; this.buildSimPanel(); }       // el panel del simulador solo existe en la simulacion
    if (this.view) this.resize();
  };

  // ---------------------------------------------------------------- vista (zoom para ajustar)
  UI.prototype.resize = function () {
    const dpr = window.devicePixelRatio || 1, r = this.stage.getBoundingClientRect();
    const w = Math.max(320, r.width), h = Math.max(240, r.height);
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    const s = O.clamp(Math.min(w / O.WORLD_W, h / O.WORLD_H), 0.35, 1.8);
    this.view = { s: s, dpr: dpr, ox: (w - O.WORLD_W * s) / 2, oy: (h - O.WORLD_H * s) / 2, w: w, h: h };
    this.app.staticLayer = null;
  };

  UI.prototype.toWorld = function (e) {
    const r = this.cv.getBoundingClientRect(), v = this.view;
    return { x: (e.clientX - r.left - v.ox) / v.s, y: (e.clientY - r.top - v.oy) / v.s, px: e.clientX - r.left, py: e.clientY - r.top };
  };

  // ---------------------------------------------------------------- seleccion por puntero
  UI.prototype.pick = function (wx, wy) {
    const app = this.app;
    // personajes (los de adelante primero)
    const chars = O.CAST.map(function (d) { return app.chars[d.id]; }).filter(function (c) { return c.visible && c.alpha > 0.3; })
      .sort(function (a, b) { return (b.x + b.y) - (a.x + a.y); });
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i], b = O.iso(c.x, c.y, 0);
      let box;
      if (c.lying) box = { x0: b.x - 40, x1: b.x + 24, y0: b.y - 36, y1: b.y + 10 };
      else box = { x0: b.x - 14, x1: b.x + 14, y0: b.y - (c.seated ? 50 : 60), y1: b.y + 4 };
      if (wx >= box.x0 && wx <= box.x1 && wy >= box.y0 && wy <= box.y1) return { kind: 'char', id: c.id };
    }
    for (let i = 0; i < O.WALL_ITEMS.length; i++) {
      const it = O.WALL_ITEMS[i];
      if (HOTSPOTS[it.id] && O.pointInPoly(O.wallItemQuad(it), wx, wy)) return { kind: 'spot', id: it.id, wall: it };
    }
    for (let i = O.FURNITURE.length - 1; i >= 0; i--) {
      const f = O.FURNITURE[i];
      if (HOTSPOTS[f.id] && O.pointInPoly(O.furnitureHull(f), wx, wy)) return { kind: 'spot', id: f.id, furn: f };
    }
    return null;
  };

  UI.prototype.onMove = function (e) {
    const p = this.toWorld(e), h = this.pick(p.x, p.y);
    this.hover = h;
    this.cv.style.cursor = h ? 'pointer' : 'default';
    if (h) {
      let t = '';
      if (h.kind === 'char') t = O.CAST_BY_ID[h.id].name; else t = HOTSPOTS[h.id].title;
      this.tip.textContent = t; this.tip.hidden = false;
      this.tip.style.left = Math.min(p.px + 14, this.view.w - 180) + 'px'; this.tip.style.top = (p.py + 14) + 'px';
    } else this.tip.hidden = true;
  };

  UI.prototype.onClick = function (e) {
    const p = this.toWorld(e), h = this.pick(p.x, p.y);
    if (!h) { this.select(null); return; }
    if (h.kind === 'char') { this.closeModal(); this.select(h.id); if (O.STRAT_BY_KEY[h.id]) { this.sel = h.id; this.syncSel(); } }
    else { this.select(null); this.openSpot(h.id); }
  };

  UI.prototype.select = function (id) { this.selected = id; this.renderFicha(); };

  // ---------------------------------------------------------------- ficha de personaje
  UI.prototype.renderFicha = function () {
    const app = this.app, S = app.state, id = this.selected;
    if (!id) { this.ficha.hidden = true; return; }
    const def = O.CAST_BY_ID[id];
    let h = '<button class="x" data-close aria-label="Cerrar">×</button>';
    h += '<div class="fh"><div><b>' + def.name + '</b><small>' + def.role + '</small></div>';
    if (def.kind === 'strategy') h += '<span class="grade g' + S.strategies[id].grade + '" title="' + GRADE_TEXT[S.strategies[id].grade] + '">' + S.strategies[id].grade + '</span>';
    h += '</div><p class="desc">' + def.desc + '</p>';
    if (def.kind === 'strategy') {
      const st = S.strategies[id], p = st.position;
      h += '<div class="row"><span>Estado</span><b class="st st-' + st.state + '">' + STATE_LABEL[st.state] + '</b></div>';
      if (p && app.publicMode) {
        h += '<div class="row"><span>Posición</span><b>' + p.side + ' · ' + ({ up: 'a favor', down: 'en contra', flat: 'en tablas' }[p.tone] || 'abierta') + '</b></div>';
      } else if (p) {
        h += '<div class="row"><span>Posición</span><b>' + p.side + ' ' + O.fmtNum(p.lot, 2) + ' lote</b></div>';
        h += '<div class="row"><span>Entrada</span><b>' + O.fmtMaybe(p.entry, 1) + '</b></div>';
        h += '<div class="row"><span>SL / TP</span><b>' + O.fmtMaybe(p.sl, 1) + ' / ' + O.fmtMaybe(p.tp, 1) + '</b></div>';
        h += '<div class="row"><span>P&amp;L flotante</span>' + (p.pnl === null ? '<b title="El ledger no guarda el P&amp;L mientras la operación está abierta">—</b>' : '<b class="' + (p.pnl >= 0 ? 'up' : 'dn') + '">' + O.fmtUsd(p.pnl, true) + '</b>') + '</div>';
      }
      h += '<div class="row"><span>Hoy</span><b>' + st.tradesToday + ' ops · ' + st.wins + ' ganadas</b></div>';
      if (!app.publicMode) {
        h += '<div class="row"><span>P&amp;L del día</span><b class="' + (st.pnlToday >= 0 ? 'up' : 'dn') + '">' + O.fmtUsd(st.pnlToday, true) + '</b></div>';
        h += '<div class="row"><span>Tope propio</span><b>' + capText(st.cap) + '</b></div>';
      }
      if (st.cooldownRemaining > 0) h += '<div class="row"><span>Cooldown</span><b>' + Math.ceil(st.cooldownRemaining / 60) + ' min</b></div>';
      h += '<div class="row"><span>Evidencia</span><b>' + st.grade + ' · ' + GRADE_TEXT[st.grade] + '</b></div>';
    } else {
      if (id === 'RISK') {
        if (app.publicMode) h += '<div class="row"><span>Día vs. tope</span><b class="' + (S.risk.dailyPnl >= 0 ? 'up' : 'dn') + '">' + (S.publicFraction === null || S.publicFraction === undefined ? '—' : O.fmtPct(S.publicFraction)) + '</b></div>';
        else {
          h += '<div class="row"><span>P&amp;L del día</span><b class="' + (S.risk.dailyPnl >= 0 ? 'up' : 'dn') + '">' + O.fmtUsd(S.risk.dailyPnl, true) + '</b></div>';
          h += '<div class="row"><span>Tope global</span><b>' + capText({ profit: S.risk.capProfit, loss: S.risk.capLoss }) + '</b></div>';
        }
        h += '<div class="row"><span>Puerta</span><b class="' + (S.risk.locked ? 'dn' : 'up') + '">' + (S.risk.locked ? 'Cerrada a nuevas entradas' : 'Abierta') + '</b></div>';
      } else if (id === 'EOD') {
        h += '<div class="row"><span>Fase</span><b>' + PHASE_LABEL[S.eod.phase] + '</b></div>';
        h += '<div class="row"><span>Hora (COT)</span><b>' + O.DAYS[S.clock.day] + ' ' + O.fmtClock(S.clock.minutes) + '</b></div>';
      } else if (id === 'LEDGER') {
        h += '<div class="row"><span>Ledger vs broker</span><b class="' + (S.ledger.ok ? 'up' : 'dn') + '">' + (!S.ledger.ok ? 'Descuadre' + (app.publicMode ? '' : ' ' + O.fmtUsd(S.ledger.diff)) : S.ledger.unknown ? 'Sin conciliar todavía' : 'Cuadra') + '</b></div>';
      } else if (id === 'DATA') {
        h += '<div class="row"><span>MetaTrader 5</span><b class="' + (S.mt5.connected ? 'up' : 'dn') + '">' + (S.mt5.connected ? 'Conectado' : 'Sin señal') + '</b></div>';
        if (!app.publicMode) h += '<div class="row"><span>XAUUSD</span><b>' + O.fmtMaybe(S.price, 2) + '</b></div>';
      } else {
        h += '<div class="row"><span>Cola de órdenes</span><b>vacía</b></div>';
      }
    }
    if (def.kind === 'strategy') h += this.fichaExtras(id);
    this.ficha.innerHTML = h;
    this.ficha.hidden = false;
    const ui = this;
    this.ficha.querySelector('[data-close]').addEventListener('click', function () { ui.select(null); });
  };

  // Datos del ledger para la ficha de una estrategia: sus ultimos 30 dias y sus ultimas 5 operaciones, tal como los muestran los paneles
  // (/api/panels/profit y /history; el historial solo admite 10, 20, 50, 100 o Todas: se piden 10 y se muestran 5). Se piden una vez por estrategia cada 30 s; durante una repeticion no se muestran (serian de hoy, no del dia que se ve).
  UI.prototype.fichaExtras = function (id) {
    const mode = this.app.source.mode, esc = O.PanelsView ? O.PanelsView.esc : function (v) { return String(v); };
    if (mode !== 'live' || typeof root.fetch !== 'function') return '';
    const cache = this.extras = this.extras || {}, c = cache[id], ui = this;
    if (!c || (!c.busy && Date.now() - c.at > 30000)) {
      cache[id] = { busy: true, at: c ? c.at : 0, data: c ? c.data : null };
      const get = function (url) { return root.fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); }); };
      Promise.all([get('/api/panels/profit?strategy=' + id + '&preset=29'), get('/api/panels/history?limit=10&strategy=' + id)])
        .then(function (res) { cache[id] = { busy: false, at: Date.now(), data: res }; })
        .catch(function () { cache[id] = { busy: false, at: Date.now(), data: null }; });
    }
    const d = cache[id] && cache[id].data;
    if (!d || !d[0] || !d[0].ok || !d[1] || !d[1].ok) return '';
    const stats = d[0].data.hours.length ? d[0].data.stats.text : null, rows = (d[1].data.rows || []).slice(0, 5);
    let h = '<div class="fsec"><b>Últimos 30 días</b>';
    if (!stats) h += '<div class="row"><span>Sin operaciones en 30 días</span></div>';
    else h += '<div class="row"><span>Operaciones</span><b>' + esc(stats.operations) + '</b></div><div class="row"><span>Profit total</span><b>' + esc(stats.total_profit) + '</b></div>' +
      '<div class="row"><span>Win rate (por hora)</span><b>' + esc(stats.win_rate) + '</b></div>';
    if (rows.length) {
      h += '<b>Últimas operaciones</b><table class="ftab">' + rows.map(function (r) {
        const x = r.cells || [];
        return '<tr class="' + (r.tone === 'profit' ? 'up' : 'dn') + '"><td>' + esc(String(x[6] || '').slice(5, 16)) + '</td><td>' + esc(x[1]) + '</td><td>' + esc(x[8]) + '</td></tr>';
      }).join('') + '</table>';
    }
    return h + '</div>';
  };

  // ---------------------------------------------------------------- paneles de objetos
  UI.prototype.openSpot = function (id) {
    const hs = HOTSPOTS[id];
    if (this.app.publicMode && (hs.panel || hs.controls)) {                         // el espejo publico no tiene paneles ni controles
      this.modal.innerHTML = '<div class="mc"><button class="x" data-close aria-label="Cerrar">×</button><h3>' + hs.title + '</h3><p>Este panel solo está en la oficina privada del bot: aquí no se muestran montos ni se controla nada.</p></div>';
      this.modal.hidden = false;
      const me = this;
      this.modal.querySelector('[data-close]').addEventListener('click', function () { me.closeModal(); });
      this.modal.onclick = function (e) { if (e.target === me.modal) me.closeModal(); };
      return;
    }
    if (hs.panel) { this.closeModal(); O.Panels.open(hs.panel); return; }        // los 4 paneles del escritorio (fase 3)
    if (hs.controls) { this.closeModal(); O.Controls.open(hs.controls); return; }   // pausar, reanudar, cerrar todo y topes (fase 4)
    let body = '';
    if (hs.kind === 'log') {
      body += '<div class="log">' + this.app.log.slice().reverse().map(function (l) { return '<div class="l ' + l.tone + '"><i>' + l.t + '</i> ' + l.text + '</div>'; }).join('') + '</div>';
    } else {
      body += '<p>' + hs.text + '</p>';
    }
    this.modal.innerHTML = '<div class="mc"><button class="x" data-close aria-label="Cerrar">×</button><h3>' + hs.title + '</h3>' + body + '</div>';
    this.modal.hidden = false;
    const ui = this;
    this.modal.querySelector('[data-close]').addEventListener('click', function () { ui.closeModal(); });
    this.modal.onclick = function (e) { if (e.target === ui.modal) ui.closeModal(); };
  };
  UI.prototype.closeModal = function () { this.modal.hidden = true; };

  // ---------------------------------------------------------------- panel del simulador
  UI.prototype.buildSimPanel = function () {
    const ui = this, app = this.app, src = app.source, el = this.$('simPanel');
    const btn = function (label, fn, cls) {
      const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls;
      b.addEventListener('click', function () { fn(); ui.renderFicha(); }); return b;
    };
    const sec = function (title) { const d = document.createElement('section'); const h = document.createElement('h4'); h.textContent = title; d.appendChild(h); el.appendChild(d); return d; };
    const grid = function (parent) { const g = document.createElement('div'); g.className = 'grid'; parent.appendChild(g); return g; };

    const intro = document.createElement('p'); intro.className = 'note';
    intro.textContent = 'Fase 0: todo lo que ves es simulado. Estos botones fuerzan eventos para revisar cómo se ve cada situación.';
    el.appendChild(intro);

    let s = sec('Tiempo'); let g = grid(s);
    [['Londres 03:00', 0, 180], ['Nueva York 09:00', 0, 540], ['Fuera de sesión', 0, 13 * 60 + 30], ['Pre-cierre 15:58', 0, 15 * 60 + 58],
     ['Viernes 13:58', 4, 13 * 60 + 58], ['Reapertura dom. 16:58', 6, 16 * 60 + 58]].forEach(function (j) { g.appendChild(btn(j[0], function () { src.jumpTo(j[1], j[2]); })); });
    const sp = document.createElement('div'); sp.className = 'speed'; s.appendChild(sp);
    [1, 2, 4, 8].forEach(function (v) { const b = btn('×' + v, function () { src.speed = v; ui.syncSpeed(); }); b.dataset.speed = v; sp.appendChild(b); });
    const pb = btn('Pausa', function () { app.state.engine.paused = !app.state.engine.paused; ui.syncSpeed(); }); pb.id = 'btnPause'; sp.appendChild(pb);
    const ab = btn('Auto', function () { src.auto = !src.auto; ui.syncSpeed(); }); ab.id = 'btnAuto'; ab.title = 'Entradas y cierres automáticos'; sp.appendChild(ab);

    s = sec('Estrategia');
    const sel = document.createElement('select'); sel.id = 'selStrat';
    O.STRATS.forEach(function (c) { const o = document.createElement('option'); o.value = c.key; o.textContent = c.name; sel.appendChild(o); });
    sel.addEventListener('change', function () { ui.sel = sel.value; });
    s.appendChild(sel);
    g = grid(s);
    g.appendChild(btn('Armar setup', function () { src.forceArm(ui.sel); }));
    g.appendChild(btn('Entrar BUY', function () { src.forceEntry(ui.sel, 'BUY'); }));
    g.appendChild(btn('Entrar SELL', function () { src.forceEntry(ui.sel, 'SELL'); }));
    g.appendChild(btn('Mover trailing', function () { src.forceTrailing(ui.sel); }));
    g.appendChild(btn('Cerrar en TP', function () { src.forceClose(ui.sel, 'tp'); }));
    g.appendChild(btn('Cerrar en SL', function () { src.forceClose(ui.sel, 'sl'); }));
    g.appendChild(btn('Salida por tiempo', function () { src.forceClose(ui.sel, 'time'); }));
    g.appendChild(btn('Cierre CHoCH', function () { src.forceClose(ui.sel, 'choch'); }));
    g.appendChild(btn('Tope de la estrategia', function () { src.forceCap(ui.sel); }));

    s = sec('Sistema'); g = grid(s);
    g.appendChild(btn('Tope global', function () { src.forceGlobalCap(); }, 'danger'));
    g.appendChild(btn('Liberar tope', function () { src.clearGlobalCap(); }));
    g.appendChild(btn('MT5 sin señal', function () { src.setMt5(false); src.mt5Until = 0; }, 'danger'));
    g.appendChild(btn('MT5 conectado', function () { src.setMt5(true); }));
    g.appendChild(btn('Ledger descuadrado', function () { src.setLedger(false); src.ledgerUntil = 0; }, 'danger'));
    g.appendChild(btn('Ledger cuadrado', function () { src.setLedger(true); }));
    this.syncSpeed();
  };

  UI.prototype.syncSel = function () { const s = this.$('selStrat'); if (s) s.value = this.sel; };
  UI.prototype.syncSpeed = function () {
    if (!this.simBuilt) return;
    const src = this.app.source, st = this.app.state;
    Array.prototype.forEach.call(document.querySelectorAll('[data-speed]'), function (b) { b.classList.toggle('on', Number(b.dataset.speed) === src.speed); });
    const pb = this.$('btnPause'); if (pb) { pb.classList.toggle('on', st.engine.paused); pb.textContent = st.engine.paused ? 'Reanudar' : 'Pausa'; }
    const ab = this.$('btnAuto'); if (ab) ab.classList.toggle('on', src.auto);
  };

  // ---------------------------------------------------------------- HUD
  UI.prototype.updateHud = function (dt) {
    this.hudT += dt;
    if (this.hudT < 0.2) return;
    this.hudT = 0;
    const S = this.app.state, r = S.risk, src = this.app.source;
    const live = src.mode === 'live', replay = src.mode === 'replay', pub = src.mode === 'public', ph = !!S.placeholder;
    const cs = this.$('chipSrc');
    if (pub) {
      cs.hidden = false;
      const mins = function (m) { return m === null || m === undefined ? '' : m < 1 ? 'menos de 1 min' : Math.round(m) + ' min'; };
      const text = { live: 'Datos de hace ' + mins(src.dataAge), warming: 'Preparando los datos…', bot_offline: 'El bot está fuera de línea', stale: 'Espejo sin actualizar' + (src.age !== null ? ' hace ' + mins(src.age) : ''),
        offline: 'Sin conexión con el espejo', waiting: 'Conectando con el espejo…' }[src.status] || '';
      cs.textContent = text; cs.className = 'chip ' + (src.status === 'live' ? 'ok' : src.status === 'waiting' || src.status === 'warming' ? 'warn' : 'bad');
    } else if (replay) {
      cs.hidden = false; cs.className = 'chip warn';
      cs.textContent = 'Repetición · ' + src.day.date + ' ' + O.replayWeekday(src.day);
    } else if (live) {
      cs.hidden = false;
      if (src.status === 'live') { cs.textContent = 'En vivo · hace ' + O.fmtNum(src.age || 0, 0) + ' s'; cs.className = 'chip ok'; }
      else {
        cs.textContent = (SRC_LABEL[src.status] || '') + (src.status === 'stale' && src.age !== null ? ' (hace ' + O.fmtNum(src.age, 0) + ' s)' : '');
        cs.className = 'chip ' + (src.status === 'nobot' || src.status === 'waiting' ? 'warn' : 'bad');
      }
    } else cs.hidden = true;
    this.$('chipClock').textContent = ph ? '—' : O.DAYS[S.clock.day] + ' ' + O.fmtClock(S.clock.minutes) + ' COT';
    const sess = this.$('chipSession');
    sess.textContent = ph ? '—' : S.session.active ? (S.session.name === 'London' ? 'Londres' : 'Nueva York') : 'Fuera de sesión';
    sess.className = 'chip ' + (S.session.active ? 'ok' : 'mute');
    const m = this.$('chipMt5');
    m.textContent = ph ? '—' : S.mt5.connected ? 'MT5 conectado' : 'MT5 sin señal';
    m.className = 'chip ' + (ph ? 'mute' : S.mt5.connected ? 'ok' : 'bad');
    m.hidden = replay;                                       // el ledger no dice nada de MT5 ni de la conciliacion de ese dia
    const e = this.$('chipEod'), stopped = live && !S.engine.running;
    e.textContent = ph ? '—' : stopped ? 'Bot detenido' : PHASE_LABEL[S.eod.phase] + (S.engine.paused ? ' · pausado' : '') + (S.risk.locked ? ' · tope diario' : '');
    e.className = 'chip ' + (ph ? 'mute' : stopped || S.risk.locked ? 'bad' : S.eod.phase === 'open' && !S.engine.paused ? 'ok' : 'warn');
    const l = this.$('chipLedger');
    l.textContent = ph ? '—' : !S.ledger.ok ? 'Ledger ≠ broker' : S.ledger.unknown ? 'Ledger sin conciliar' : 'Ledger cuadra';
    l.className = 'chip ' + (ph || (S.ledger.ok && S.ledger.unknown) ? 'mute' : S.ledger.ok ? 'ok' : 'bad');
    l.hidden = replay;
    const pnl = this.$('pnlVal'); pnl.className = r.dailyPnl >= 0 ? 'up' : 'dn';
    pnl.textContent = ph || (pub && (S.publicFraction === null || S.publicFraction === undefined)) ? '—' : pub ? O.fmtPct(S.publicFraction) : O.fmtUsd(r.dailyPnl, true);       // en el espejo, solo el % del tope
    const frac = O.capFraction(r);
    const bar = this.$('pnlBar');
    bar.style.left = frac >= 0 ? '50%' : (50 + frac * 50) + '%'; bar.style.width = Math.abs(frac) * 50 + '%'; bar.className = frac >= 0 ? 'up' : 'dn';
    this.$('price').textContent = pub ? '' : 'XAUUSD ' + O.fmtMaybe(S.price, 2);
    if (this.selected && !this.ficha.hidden) this.renderFicha();
    this.syncSpeed();
    if (O.Replay) O.Replay.sync();
  };

  O.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
