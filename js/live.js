/* Oficina ANZOBOT — fuente EN VIVO (fase 2): lee el estado que publica el bot (via office/server.py) y se lo da a la oficina con la misma
   interfaz que el simulador (state, drain(), update(dt)). Normaliza el contrato real para que el resto del codigo no tenga que
   preocuparse de los huecos (estrategia apagada, ledger sin conciliar, topes de un solo lado, precio ausente, sin historial...). */
(function (root) {
  'use strict';
  const O = root.Office = root.Office || {};

  const num = function (v) { return typeof v === 'number' && isFinite(v) ? v : null; };

  // Lo que se ve mientras llega el primer estado del bot: nada es real (state.placeholder = true).
  O.emptyState = function () {
    const strategies = {};
    O.STRATS.forEach(function (c) {
      strategies[c.key] = { state: 'scanning', enabled: false, position: null, pnlToday: 0, tradesToday: 0, wins: 0, cap: null,
        grade: c.grade, cooldownRemaining: 0 };
    });
    return {
      v: 1, mode: 'live', placeholder: true, ts: null, seq: 0,
      clock: { day: 0, minutes: 10 * 60, cot: '' }, price: null, history: [], equity: [], monthly: new Array(31).fill(null),
      engine: { running: false, paused: false }, mt5: { connected: false }, session: { name: '', active: false },
      eod: { phase: 'open', preClose: false, minutesToClose: null, blockReason: '' },
      risk: { dailyPnl: 0, capProfit: null, capLoss: null, locked: false, activeTrades: null, maxTrades: null, volatilityPause: false },
      ledger: { ok: true, unknown: true, diff: 0, checkedAt: null },
      strategies: strategies, events: [], publisher: { errors: 0, readErrors: [] },
    };
  };

  // Contrato v1 del bot -> la forma que usan render, director, ui y fx. No muta la entrada.
  O.normalizeState = function (raw) {
    const base = O.emptyState();
    const S = base;
    S.placeholder = false;
    S.v = raw.v || 1; S.ts = raw.ts || null; S.seq = raw.seq || 0;
    const c = raw.clock || {};
    S.clock = { day: c.day | 0, minutes: c.minutes | 0, cot: c.cot || '' };
    S.price = num(raw.price);
    S.history = (raw.history || []).filter(function (x) { return num(x) !== null; });
    S.equity = (raw.equity || []).filter(function (p) { return p && num(p.v) !== null; });
    S.monthly = (raw.monthly || []).slice(0, 31);
    while (S.monthly.length < 31) S.monthly.push(null);
    S.engine = { running: !!(raw.engine && raw.engine.running), paused: !!(raw.engine && raw.engine.paused) };
    S.mt5 = { connected: !!(raw.mt5 && raw.mt5.connected) };
    S.session = { name: (raw.session && raw.session.name) || '', active: !!(raw.session && raw.session.active) };
    const e = raw.eod || {};
    S.eod = { phase: e.phase || 'open', preClose: !!e.preClose, minutesToClose: num(e.minutesToClose), blockReason: e.blockReason || '' };
    const r = raw.risk || {};
    S.risk = { dailyPnl: num(r.dailyPnl) || 0, capProfit: num(r.capProfit), capLoss: num(r.capLoss), locked: !!r.locked,
      activeTrades: r.activeTrades === undefined ? null : r.activeTrades, maxTrades: r.maxTrades === undefined ? null : r.maxTrades,
      volatilityPause: !!r.volatilityPause };
    const l = raw.ledger || {};
    S.ledger = { ok: l.ok !== false, unknown: l.ok === null || l.ok === undefined, diff: num(l.diff) || 0, checkedAt: l.checkedAt || null };
    O.STRATS.forEach(function (def) {
      const s = (raw.strategies || {})[def.key];
      if (!s) { S.strategies[def.key] = { state: 'off', enabled: false, position: null, pnlToday: 0, tradesToday: 0, wins: 0, cap: null, grade: def.grade, cooldownRemaining: 0 }; return; }
      let pos = null;
      if (s.position) {
        const p = s.position;
        pos = { ticket: p.ticket, side: p.side === 'SELL' ? 'SELL' : 'BUY', entry: num(p.entry), sl: num(p.sl), tp: num(p.tp), lot: num(p.lot) || 0.01,
          pnl: num(p.pnl) || 0, price: num(p.price), opened: p.opened || null };
      }
      let cap = null;
      if (s.cap && (num(s.cap.profit) !== null || num(s.cap.loss) !== null)) cap = { profit: num(s.cap.profit), loss: num(s.cap.loss) };
      S.strategies[def.key] = { state: s.state || 'scanning', enabled: !!s.enabled, position: pos, pnlToday: num(s.pnlToday) || 0,
        tradesToday: s.tradesToday | 0, wins: s.wins | 0, cap: cap, grade: s.grade || def.grade, cooldownRemaining: num(s.cooldownRemaining) || 0 };
    });
    S.events = (raw.events || []).filter(function (x) { return x && typeof x.id === 'number'; });
    S.publisher = raw.publisher || { errors: 0, readErrors: [] };
    return S;
  };

  function LiveSource(opts) {
    opts = opts || {};
    this.mode = 'live';
    this.url = opts.url || '/api/state';
    this.intervalMs = opts.intervalMs || 1000;
    this.fetchFn = opts.fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(root) : null);
    this.state = O.emptyState();
    this.status = 'waiting';          // waiting | live | stale | nobot | offline
    this.reason = '';
    this.age = null;
    this.failures = 0;                // sondeos seguidos que no llegaron al servidor de la oficina
    this.events = [];                 // cola para el director
    this.lastEventId = null;          // null = todavia no se vio ningun estado: el historial inicial no se reproduce
    this.firstData = false;           // true tras el primer estado real (main.js lo usa para recolocar a todos)
    this._t = 1e9;                    // el primer sondeo sale de inmediato
    this._busy = false;
  }

  LiveSource.prototype.update = function (dt) {
    this._t += dt * 1000;
    if (!this._busy && this._t >= this.intervalMs) { this._t = 0; this.poll(); }
  };

  LiveSource.prototype.poll = function () {
    const me = this;
    if (!this.fetchFn) { this.status = 'offline'; this.failures++; return Promise.resolve(); }
    this._busy = true;
    return Promise.resolve(this.fetchFn(this.url, { cache: 'no-store' }))
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) { me.failures = 0; me.ingestResponse(j); })
      .catch(function () { me.failures++; me.status = 'offline'; })
      .then(function () { me._busy = false; });
  };

  // Respuesta de /api/state: {ok, age, stale, state} o {ok:false, reason}
  LiveSource.prototype.ingestResponse = function (resp) {
    if (!resp || typeof resp !== 'object') { this.status = 'offline'; return; }
    if (!resp.ok) { this.status = 'nobot'; this.reason = resp.reason || ''; this.age = null; return; }
    this.age = typeof resp.age === 'number' ? resp.age : null;
    if (resp.stale) { this.status = 'stale'; return; }          // el bot dejo de publicar: se conserva lo ultimo que se vio
    this.status = 'live'; this.reason = '';
    this.ingest(resp.state);
  };

  LiveSource.prototype.ingest = function (raw) {
    const S = O.normalizeState(raw);
    const evs = S.events.slice().sort(function (a, b) { return a.id - b.id; });
    if (this.lastEventId === null) {
      this.lastEventId = evs.length ? evs[evs.length - 1].id : 0;      // linea base: nada de lo anterior se reproduce
      this.firstData = true;
    } else {
      const fresh = evs.filter(function (e) { return e.id > this.lastEventId; }, this);
      if (fresh.length) { this.lastEventId = fresh[fresh.length - 1].id; this.events.push.apply(this.events, fresh); }
      if (this.events.length > 8) this.events.splice(0, this.events.length - 8);   // volvio de una pausa larga: solo lo mas reciente
    }
    this.state = S;
  };

  LiveSource.prototype.drain = function () { const e = this.events; this.events = []; return e; };

  O.LiveSource = LiveSource;
})(typeof window !== 'undefined' ? window : globalThis);
