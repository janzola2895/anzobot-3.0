/* Oficina ANZOBOT — fuente del ESPEJO PUBLICO (fase 6): lee el estado publico ("public1") que genera office/export_public.py y que la tarea programada
   sube a un repositorio aparte, y se lo da a la oficina con la misma interfaz que el simulador, la fuente en vivo y la repeticion (state, drain(),
   update(dt)). El estado publico NO trae montos en USD, precios, lotes, tickets ni cuenta (lista blanca en el exportador); aqui ademas se valida todo
   lo que llega antes de usarlo. Lo que el estado publico representa de forma relativa (la barra SL->TP de una posicion, el P&L del dia como fraccion del
   tope, las curvas normalizadas) se traduce a coordenadas sinteticas: la oficina dibuja la misma barra, pero sin un solo precio. */
(function (root) {
  'use strict';
  const O = root.Office = root.Office || {};

  const STALE_MS = 8 * 60 * 1000;                // el exportador publica cada minuto y el CDN de GitHub cachea hasta 5: pasado esto, el espejo dejo de actualizarse
  const POLL_MS = 30 * 1000;
  const STATES = ['scanning', 'armed', 'in_position', 'cooldown', 'capped', 'sleeping', 'away', 'off'];
  const SESSIONS = ['', 'London', 'New_York'];
  const PHASES = ['open', 'closed', 'weekend'];
  const REASONS = ['tp', 'sl', 'trail', 'time', 'eod', 'choch', 'manual', 'unknown'];
  const EVENT_TYPES = ['entry', 'close', 'trailing', 'armed', 'giveup', 'cap_strategy', 'cap_global', 'cap_clear', 'eod_pre', 'eod_close', 'eod_open', 'session', 'mt5_up', 'mt5_down', 'ledger_ok', 'ledger_bad'];
  const finite = function (v) { return typeof v === 'number' && isFinite(v) ? v : null; };
  const pick = function (v, list, dflt) { return typeof v === 'string' && list.indexOf(v) >= 0 ? v : dflt; };
  const int = function (v, lo, hi) { const n = finite(v); return n === null ? lo : Math.min(hi, Math.max(lo, Math.round(n))); };

  // Estado publico -> la forma que usan render, director, ui y fx. No muta la entrada. Devuelve null si no es un estado publico.
  O.normalizePublic = function (raw) {
    if (!raw || raw.v !== 'public1' || !raw.strategies || typeof raw.strategies !== 'object') return null;
    const S = O.emptyState();
    S.placeholder = false; S.mode = 'public';
    const c = raw.clock || {};
    S.clock = { day: int(c.day, 0, 6), minutes: int(c.minutes, 0, 1439), cot: '' };
    S.engine = { running: !!(raw.engine && raw.engine.running === true), paused: !!(raw.engine && raw.engine.paused === true) };
    S.mt5 = { connected: !!(raw.mt5 && raw.mt5.connected === true) };
    const se = raw.session || {};
    S.session = { name: pick(se.name, SESSIONS, ''), active: se.active === true };
    const e = raw.eod || {};
    S.eod = { phase: pick(e.phase, PHASES, 'open'), preClose: e.preClose === true, minutesToClose: null, blockReason: '' };
    const l = raw.ledger || {};
    S.ledger = { ok: l.ok !== false, unknown: l.unknown === true, diff: 0, checkedAt: null };
    const r = raw.risk || {}, frac = finite(r.pnlFraction);
    // el P&L del dia como fraccion del tope: dailyPnl = fraccion * 100 con topes de 100, asi capFraction() devuelve la misma fraccion y no hay un solo USD
    S.risk = { dailyPnl: frac === null ? 0 : Math.max(-1, Math.min(1, frac)) * 100, capProfit: frac === null ? null : 100, capLoss: frac === null ? null : 100,
      locked: r.locked === true, activeTrades: int(r.activeTrades, 0, 50), maxTrades: null, volatilityPause: r.volatilityPause === true };
    S.publicFraction = frac === null ? null : Math.max(-1, Math.min(1, frac));
    O.STRATS.forEach(function (def) {
      const s = raw.strategies[def.key];
      if (!s || typeof s !== 'object') { S.strategies[def.key] = { state: 'off', enabled: false, position: null, pnlToday: 0, tradesToday: 0, wins: 0, cap: null, grade: def.grade, cooldownRemaining: 0 }; return; }
      let pos = null;
      const p = s.position;
      if (p && typeof p === 'object' && (p.side === 'BUY' || p.side === 'SELL')) {
        const dir = p.side === 'BUY' ? 1 : -1, bar = Math.max(-1, Math.min(1, finite(p.bar) === null ? 0 : p.bar)), hasTp = p.hasTp === true;
        // coordenadas SINTETICAS: entrada 0, stop a 1 de distancia en contra, TP a 1 a favor (sin TP, la escala del TP es 3 veces el riesgo)
        pos = { ticket: null, side: p.side, entry: 0, sl: -dir, tp: hasTp ? dir : null, lot: 0.01, pnl: null, price: dir * bar * (bar > 0 && !hasTp ? 3 : 1), opened: null,
          tone: pick(p.tone, ['up', 'down', 'flat'], 'flat') };
      }
      const trades = int(s.tradesToday, 0, 99);
      S.strategies[def.key] = { state: pick(s.state, STATES, 'off'), enabled: s.enabled === true, position: pos, pnlToday: 0, tradesToday: trades, wins: Math.min(trades, int(s.wins, 0, 99)),
        cap: null, grade: pick(s.grade, ['A', 'B', 'C', 'D'], def.grade), cooldownRemaining: int(s.cooldownRemaining, 0, 3600) };
    });
    S.equity = (Array.isArray(raw.equity) ? raw.equity : []).filter(function (v) { return finite(v) !== null; }).slice(-60).map(function (v, i) { return { t: i, v: Math.max(-100, Math.min(100, v)) }; });
    S.monthly = (Array.isArray(raw.monthly) ? raw.monthly : []).slice(0, 31).map(function (v) { return finite(v) === null ? null : Math.max(-200, Math.min(200, v)); });
    while (S.monthly.length < 31) S.monthly.push(null);
    S.events = (Array.isArray(raw.events) ? raw.events : []).filter(function (ev) {
      return ev && typeof ev.id === 'number' && isFinite(ev.id) && ev.id >= 0 && EVENT_TYPES.indexOf(ev.type) >= 0 && (!('strategy' in ev) || ev.strategy === null || O.STRAT_BY_KEY[ev.strategy]);
    }).map(function (ev) {
      const out = { id: ev.id, type: ev.type, clock: int(ev.clock, 0, 1439) };
      if (O.STRAT_BY_KEY[ev.strategy]) out.strategy = ev.strategy;
      if (ev.side === 'BUY' || ev.side === 'SELL') out.side = ev.side;
      if (ev.type === 'close') { out.reason = pick(ev.reason, REASONS, 'unknown'); out.pnl = null; out.tone = pick(ev.tone, ['win', 'loss', 'flat'], null); }
      if (ev.type === 'eod_close') out.weekend = ev.weekend === true;
      if (ev.type === 'session') out.name = pick(ev.name, SESSIONS, '');
      return out;
    }).filter(function (ev) { return ev.strategy || ['entry', 'close', 'trailing', 'armed', 'giveup', 'cap_strategy'].indexOf(ev.type) < 0; });
    S.publicMeta = { asOf: typeof raw.asOf === 'string' ? raw.asOf : null, delayMinutes: finite(raw.delayMinutes) };
    return S;
  };

  function PublicSource(opts) {
    opts = opts || {};
    this.mode = 'public';
    this.url = opts.url || 'state.json';
    this.intervalMs = opts.intervalMs || POLL_MS;
    this.fetchFn = opts.fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(root) : null);
    this.now = opts.now || function () { return Date.now(); };
    this.state = O.emptyState();
    this.state.mode = 'public';
    this.status = 'waiting';          // waiting | live | stale | bot_offline | warming | offline
    this.age = null;                  // minutos desde que se publico el archivo
    this.dataAge = null;              // minutos desde la hora de la foto (con el retraso)
    this.delay = null;
    this.failures = 0;
    this.events = [];
    this.lastEventId = null;
    this.firstData = false;
    this._t = 1e9;
    this._busy = false;
  }

  PublicSource.prototype.update = function (dt) {
    this._t += dt * 1000;
    if (!this._busy && this._t >= this.intervalMs) { this._t = 0; this.poll(); }
  };

  PublicSource.prototype.poll = function () {
    const me = this;
    if (!this.fetchFn) { this.status = 'offline'; this.failures++; return Promise.resolve(); }
    this._busy = true;
    const bust = (this.url.indexOf('?') < 0 ? '?' : '&') + 't=' + Math.floor(this.now() / 60000);       // el CDN cachea por direccion: una por minuto
    return Promise.resolve(this.fetchFn(this.url + bust, { cache: 'no-store' }))
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) { me.failures = 0; me.ingestResponse(j); })
      .catch(function () { me.failures++; me.status = 'offline'; })
      .then(function () { me._busy = false; });
  };

  const minutesSince = function (iso, now) {
    const t = typeof iso === 'string' ? Date.parse(iso) : NaN;
    return isFinite(t) ? Math.max(0, (now - t) / 60000) : null;
  };

  // Respuesta de state.json: {v:'public1', status, publishedAt, asOf, delayMinutes, ...estado}
  PublicSource.prototype.ingestResponse = function (resp) {
    if (!resp || typeof resp !== 'object' || resp.v !== 'public1') { this.status = 'offline'; return; }
    const now = this.now();
    this.age = minutesSince(resp.publishedAt, now);
    this.delay = finite(resp.delayMinutes);
    if (this.age === null || this.age * 60000 > STALE_MS) { this.status = 'stale'; return; }       // el espejo dejo de actualizarse: se conserva lo ultimo que se vio
    if (resp.status === 'bot_offline' || resp.status === 'warming') { this.status = resp.status; this.dataAge = minutesSince(resp.asOf, now); return; }
    if (resp.status !== 'live') { this.status = 'offline'; return; }
    const S = O.normalizePublic(resp);
    if (!S) { this.status = 'offline'; return; }
    this.status = 'live';
    this.dataAge = minutesSince(resp.asOf, now);
    this.ingest(S);
  };

  PublicSource.prototype.ingest = function (S) {
    const evs = S.events.slice().sort(function (a, b) { return a.id - b.id; });
    if (this.lastEventId === null) {
      this.lastEventId = evs.length ? evs[evs.length - 1].id : 0;        // linea base: el historial no se reproduce
      this.firstData = true;
    } else {
      const last = this.lastEventId, fresh = evs.filter(function (e) { return e.id > last; });
      if (fresh.length) { this.lastEventId = fresh[fresh.length - 1].id; this.events.push.apply(this.events, fresh); }
      if (this.events.length > 8) this.events.splice(0, this.events.length - 8);
    }
    this.state = S;
  };

  PublicSource.prototype.drain = function () { const e = this.events; this.events = []; return e; };

  O.PublicSource = PublicSource;
  O.PUBLIC_STALE_MS = STALE_MS;

  // La pagina del espejo (office/mirror/index.html) trae <meta name="office-public-url" content="...">: con ella main.js arranca la fuente publica.
  O.publicUrl = function () {
    if (typeof document === 'undefined' || !document.querySelector) return null;
    const m = document.querySelector('meta[name="office-public-url"]');
    return m && m.getAttribute('content') ? m.getAttribute('content') : null;
  };
  O.startPublic = function () { return O.start({ source: new O.PublicSource({ url: O.publicUrl() || 'state.json' }), fallback: false }); };
})(typeof window !== 'undefined' ? window : globalThis);
