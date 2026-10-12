/* Oficina ANZOBOT — director: traduce el estado y los eventos del bot en conducta de los personajes.
   Solo lee de app.source (state + eventos). No conoce al simulador. */
(function (root) {
  'use strict';
  const O = root.Office = root.Office || {};

  const THOUGHTS = {
    crt: ['¿Habrá retest?', 'Casi…', 'Espero el retest', 'Rango CRT marcado'],
    CRT_REVERSION: ['¿Barrió liquidez?', 'Sweep a la vista', 'Voy en contra…'],
    VOL_BREAKOUT: ['¿Rompe o no rompe?', 'Cerca del nivel…'],
    VOL_BREAKOUT_W: ['¡A trabajar!', 'Se abre la semana'],
    BOLL_H4: ['Bandas abiertas…', 'Vela H4 cerrando'],
  };
  const REASON = { tp: 'TP', sl: 'SL', trail: 'trailing', time: 'por tiempo', eod: 'cierre del día', choch: 'CHoCH', manual: 'cierre manual', unknown: 'cerró' };
  const known = function (n) { return n !== null && n !== undefined && isFinite(n); };      // un cierre sin deal en el ledger llega con pnl = null
  const usd = function (n) { return known(n) ? ' ' + O.fmtUsd(n, true) : ''; };
  // ¿gano? true/false, o null si no se sabe: por el P&L del cierre o, en el espejo publico (sin montos), por el tono que trae el evento
  const win = function (ev) { return known(ev.pnl) ? ev.pnl >= 0 : ev.tone === 'win' || ev.tone === 'flat' ? true : ev.tone === 'loss' ? false : null; };

  function Director(app) {
    this.app = app;
    this.rng = O.makeRng(21);
    this.slot = 0;
    this.pantrySlot = {};
  }

  Director.prototype.char = function (id) { return this.app.chars[id]; };

  // ------------------------------------------------------------------ conductas de fondo (devuelven una tanda de acciones)
  Director.prototype.makeBases = function () {
    const D = this, rng = this.rng, S = function () { return D.app.state; };
    const seatChunk = function (c) { return !c.seated && !c.lying ? [{ t: 'sit', seat: c.id }] : null; };
    const pickThought = function (c) {
      const pool = THOUGHTS[c.id] || THOUGHTS.crt;
      return pool[Math.floor(rng() * pool.length)];
    };
    return {
      idle: function () { return [{ t: 'wait', s: 1 }]; },
      away: function () { return [{ t: 'wait', s: 2 }]; },
      off: function (c) {                         // estrategia apagada en el config: su fantasma queda quieto en el escritorio
        const s = seatChunk(c); if (s) return s;
        return [{ t: 'wait', s: 3, pose: c.lying ? 'sleep' : 'sit' }];
      },

      desk: function (c) {
        const s = seatChunk(c); if (s) return s;
        const r = rng();
        if (r < 0.78) return [{ t: 'wait', s: 2.5 + rng() * 3, pose: 'type' }];
        if (r < 0.9) return [{ t: 'wait', s: 1.6, pose: 'look' }];
        return [{ t: 'wait', s: 2, pose: 'sit' }];
      },
      desk_pos: function (c) {
        const s = seatChunk(c); if (s) return s;
        return rng() < 0.85 ? [{ t: 'wait', s: 2 + rng() * 2.5, pose: 'type' }] : [{ t: 'wait', s: 1.4, pose: 'look' }];
      },
      armed: function (c) {
        const sd = O.SEATS[c.id], r = rng();
        if (c.seated || c.lying) return [{ t: 'stand' }, { t: 'say', text: pickThought(c), s: 3, kind: 'think' }];
        if (r < 0.5) { const p = O.randomNear(sd.tile, 2, 3, rng); return [{ t: 'walk', x: p[0], y: p[1] }, { t: 'wait', s: 1.2 + rng(), pose: 'think' }]; }
        if (r < 0.75) return [{ t: 'wait', s: 1.8, pose: 'look', face: 'NE' }];
        if (r < 0.9) return [{ t: 'say', text: pickThought(c), s: 2.8, kind: 'think' }, { t: 'wait', s: 1.5, pose: 'think' }];
        return [{ t: 'walk', x: sd.tile[0], y: sd.tile[1] }, { t: 'wait', s: 1, pose: 'stand' }];
      },
      coffee: function (c) {
        const idx = D.pantrySlot[c.id] !== undefined ? D.pantrySlot[c.id] : (D.pantrySlot[c.id] = Object.keys(D.pantrySlot).length % O.POINTS.pantry.length);
        const slot = O.POINTS.pantry[idx], t = c.tile();
        if (t[0] !== slot[0] || t[1] !== slot[1]) return [{ t: 'walk', x: slot[0], y: slot[1] }, { t: 'face', dir: 'NE' }, { t: 'hold', item: 'mug' }];
        return [{ t: 'wait', s: 3 + rng() * 3, pose: 'sip', face: 'NE' }];
      },
      capped: function (c) {
        const s = seatChunk(c); if (s) return s;
        return [{ t: 'fx', fx: 'zzz' }, { t: 'wait', s: 2.6, pose: 'sleepdesk' }];
      },
      hammock: function (c) {
        if (!c.lying) return [{ t: 'sit', seat: c.id }];
        return [{ t: 'fx', fx: 'zzz' }, { t: 'wait', s: 2.6, pose: 'sleep' }];
      },

      // --- personal
      risk: function (c) {
        const s = seatChunk(c); if (s) return s;
        const r = rng();
        if (r < 0.6) return [{ t: 'wait', s: 3 + rng() * 3, pose: 'type' }];
        if (r < 0.8) return [{ t: 'wait', s: 1.8, pose: 'think' }];
        return [{ t: 'wait', s: 1.6, pose: 'look' }];
      },
      risk_locked: function (c) {
        const p = O.POINTS.riskLockPost, t = c.tile();
        if (t[0] !== p[0] || t[1] !== p[1]) return [{ t: 'walk', x: p[0], y: p[1] }, { t: 'face', dir: 'NW' }];
        return [{ t: 'wait', s: 3, pose: 'cross', face: 'NW' }];
      },
      ledger: function (c) {
        const s = seatChunk(c); if (s) return s;
        return rng() < 0.85 ? [{ t: 'wait', s: 3 + rng() * 3, pose: 'type' }] : [{ t: 'wait', s: 1.6, pose: 'look' }];
      },
      ledger_bad: function (c) {
        return [{ t: 'stand' }, { t: 'hold', item: 'book' }, { t: 'say', text: '¡No cuadra!', s: 2.6, kind: 'alarm' }, { t: 'wait', s: 2.4, pose: 'panic' }];
      },
      data: function (c) {
        const s = seatChunk(c); if (s) return s;
        const r = rng();
        if (r < 0.7) return [{ t: 'wait', s: 3 + rng() * 3, pose: 'type' }];
        if (r < 0.85) return [{ t: 'hold', item: null }, { t: 'wait', s: 2, pose: 'phone' }];
        return [{ t: 'wait', s: 1.6, pose: 'look' }];
      },
      data_down: function (c) {
        return [{ t: 'stand' }, { t: 'say', text: '¡Sin señal MT5!', s: 2.8, kind: 'alarm' }, { t: 'fx', fx: 'spark' }, { t: 'wait', s: 2.6, pose: 'panic' }];
      },
      orders: function (c) {
        if (!c.def._posted) { c.def._posted = true; return [{ t: 'sit', seat: 'ORDERS' }]; }
        const r = rng();
        if (r < 0.7) return [{ t: 'wait', s: 3 + rng() * 3, pose: 'stand', face: 'SW' }];
        return [{ t: 'wait', s: 1.6, pose: 'look', face: 'SW' }];
      },
      eod: function (c) {
        const pts = O.POINTS.patrol;
        c._pi = ((c._pi === undefined ? -1 : c._pi) + 1) % pts.length;
        const p = pts[c._pi];
        return [{ t: 'walk', x: p[0], y: p[1], speed: 1.6 }, { t: 'wait', s: 1.8, pose: 'look' }];
      },
      eod_closed: function (c) {
        const p = O.POINTS.eodDoorPost, t = c.tile();
        if (t[0] !== p[0] || t[1] !== p[1]) return [{ t: 'walk', x: p[0], y: p[1] }, { t: 'face', dir: 'NW' }];
        return [{ t: 'wait', s: 3, pose: 'cross', face: 'NW' }];
      },
    };
  };

  Director.prototype.init = function () {
    const D = this;
    this.bases = this.makeBases();
    this.stateOf = {};
    O.CAST.forEach(function (def) {
      const sd = O.SEATS[def.id], c = D.app.chars[def.id];
      if (!sd) return;
      c.x = sd.tile[0] + 0.5; c.y = sd.tile[1] + 0.5; c.face = sd.face;
      if (sd.lie) { c.lying = true; c.seated = false; }
      else if (sd.stand) { c.def._posted = true; }
      else if (sd.chair) { c.seated = true; }
    });
    this.sync(true);
  };

  // Vuelve a colocar a todos segun el estado actual (primer estado real del bot, o cambio de fuente): sin caminatas ni fantasmas viejos.
  Director.prototype.reset = function () {
    const D = this;
    O.CAST.forEach(function (def) {
      const c = D.app.chars[def.id];
      c.queue = []; c.cur = null; c.path = []; c.visible = true; c.alpha = 1; c.prop = null; c.bubble = null; c.seated = false;
      c.lying = false; c.actionPose = null; c.pose = 'stand'; c.baseName = 'idle'; c.baseFn = null; c.ghost = false; c.mood = null;
    });
    this.init();
  };

  // base deseada para cada personaje segun el estado actual
  Director.prototype.wantedBase = function (def) {
    const S = this.app.state;
    if (def.kind === 'strategy') {
      const st = S.strategies[def.id].state;
      if (st === 'off') return 'off';
      if (def.sleeper) return st === 'armed' ? 'armed' : 'hammock';
      return { scanning: 'desk', armed: 'armed', in_position: 'desk_pos', cooldown: 'coffee', capped: 'capped', sleeping: 'hammock', away: 'away' }[st] || 'desk';
    }
    switch (def.id) {
      case 'RISK': return S.risk.locked ? 'risk_locked' : 'risk';
      case 'EOD': return S.eod.phase !== 'open' ? 'eod_closed' : 'eod';
      case 'LEDGER': return S.ledger.ok ? 'ledger' : 'ledger_bad';
      case 'DATA': return S.placeholder || S.mt5.connected ? 'data' : 'data_down';       // el estado vacio (aun sin datos del bot) no es una caida de MT5
      default: return 'orders';
    }
  };

  Director.prototype.sync = function (first) {
    const D = this, S = this.app.state;
    O.CAST.forEach(function (def) {
      const c = D.char(def.id), want = D.wantedBase(def);
      const rawState = def.kind === 'strategy' ? S.strategies[def.id].state : want;
      const prev = D.stateOf[def.id];
      if (prev === rawState) return;
      D.stateOf[def.id] = rawState;
      c.ghost = want === 'off';
      if (first) { c.setBase(want, D.bases[want] && function (ch) { return D.bases[want](ch); }); if (rawState === 'away') { c.visible = false; c.alpha = 0; } return; }
      if (def.kind === 'strategy') {
        if (rawState === 'away') {
          c.do([{ t: 'wait', s: D.rng() * 2.2 }, { t: 'say', text: 'Fin de jornada', s: 2.2 }, { t: 'exit' }]);
        } else if (prev === 'away') {
          c.do([{ t: 'wait', s: D.rng() * 2.5 }, { t: 'enter' }]);
        }
        if (prev === 'cooldown') c.prop = null;
        if (rawState === 'in_position' || rawState === 'sleeping') c.mood = null;
      }
      c.setBase(want, function (ch) { return D.bases[want](ch); });
    });
  };

  Director.prototype.logLine = function (ev) {
    const app = this.app, min = ev.clock !== undefined ? ev.clock : app.state.clock.minutes;
    const nm = ev.strategy ? O.STRAT_BY_KEY[ev.strategy].name : '';
    let text = null, tone = 'info';
    switch (ev.type) {
      case 'entry': text = nm + ' ' + ev.side + (known(ev.price) ? ' @' + O.fmtNum(ev.price, 1) : ''); break;
      case 'close': text = nm + ' ' + (REASON[ev.reason] || 'cerró') + usd(ev.pnl); tone = win(ev) === null ? 'info' : win(ev) ? 'good' : 'bad'; break;
      case 'trailing': text = nm + (known(ev.sl) ? ' SL→' + O.fmtNum(ev.sl, 1) : ': sube su stop'); break;
      case 'armed': text = nm + ': setup armado'; tone = 'warn'; break;
      case 'cap_strategy': text = nm + ': tope diario'; tone = 'warn'; break;
      case 'cap_global': text = 'TOPE GLOBAL: sin entradas'; tone = 'bad'; break;
      case 'cap_clear': text = 'Tope global liberado'; tone = 'good'; break;
      case 'eod_pre': text = 'Cierre en 1 minuto'; tone = 'warn'; break;
      case 'eod_close': text = ev.weekend ? 'Fin de semana' : 'Mercado cerrado'; tone = 'warn'; break;
      case 'eod_open': text = 'Mercado abierto'; tone = 'good'; break;
      case 'session': text = ev.name ? 'Sesión ' + (ev.name === 'London' ? 'Londres' : 'Nueva York') : 'Fuera de sesión'; break;
      case 'mt5_down': text = 'MT5 sin señal'; tone = 'bad'; break;
      case 'mt5_up': text = 'MT5 conectado'; tone = 'good'; break;
      case 'ledger_bad': text = 'Ledger ≠ broker'; tone = 'bad'; break;
      case 'ledger_ok': text = 'Ledger cuadrado'; tone = 'good'; break;
      default: break;
    }
    if (text) { app.log.push({ t: O.fmtClock(min), text: text, tone: tone }); if (app.log.length > 40) app.log.shift(); }
  };

  Director.prototype.counterTrip = function (c, opts) {
    const o = this.char('ORDERS'), slot = O.POINTS.counterFront[this.slot++ % 3];
    const seq = [];
    if (!c.visible) seq.push({ t: 'enter' });
    if (opts.say) seq.push({ t: 'say', text: opts.say, s: 3, kind: opts.kind });
    seq.push({ t: 'walk', x: slot[0], y: slot[1], speed: opts.run ? 4.2 : 2.8, run: !!opts.run });
    seq.push({ t: 'face', dir: 'NE' });
    seq.push({ t: 'wait', s: 0.9, pose: 'handover' });
    seq.push({ t: 'fn', fn: function () { o.do([{ t: 'face', dir: 'SW' }, { t: 'wait', s: 1.2, pose: 'stamp' }, { t: 'say', text: opts.stamp || 'Orden enviada', s: 2 }]); } });
    seq.push({ t: 'wait', s: 1.4, pose: 'stand' });
    if (opts.after) seq.push({ t: 'say', text: opts.after, s: 2.2 });
    return seq;
  };

  Director.prototype.onEvent = function (ev) {
    const app = this.app, S = app.state, D = this;
    this.logLine(ev);
    const c = ev.strategy ? this.char(ev.strategy) : null;
    switch (ev.type) {
      case 'entry': {
        const seq = this.counterTrip(c, { say: (ev.side === 'BUY' ? 'COMPRO' : 'VENDO') + (known(ev.price) ? ' ' + O.fmtNum(ev.lot || 0.01, 2) + ' @ ' + O.fmtNum(ev.price, 1) : ''), after: 'Ejecutada ✓' });
        seq.push({ t: 'hold', item: 'ticket' });
        seq.push({ t: 'sit', seat: c.id });
        seq.push({ t: 'hold', item: null });
        c.do(seq);
        break;
      }
      case 'close': {
        const good = win(ev) === true, o = this.char('ORDERS'), msg = (REASON[ev.reason] || 'cerró') + usd(ev.pnl);
        let seq;
        if (ev.reason === 'tp') seq = [{ t: 'say', text: msg, s: 3.6 }, { t: 'fx', fx: 'confetti' }, { t: 'fx', fx: 'coins' }, { t: 'stand' }, { t: 'wait', s: 3.4, pose: 'dance' }];
        else if (ev.reason === 'trail') seq = [{ t: 'say', text: msg, s: 3 }, { t: 'fx', fx: 'coins' }, { t: 'stand' }, { t: 'wait', s: 1.8, pose: 'cheer' }];
        else if (ev.reason === 'sl') seq = [{ t: 'say', text: msg, s: 3.6, kind: 'sad' }, { t: 'fx', fx: 'rain' }, { t: 'stand' }, { t: 'wait', s: 3.2, pose: 'facepalm' }];
        else if (ev.reason === 'choch') seq = this.counterTrip(c, { say: '¡CHoCH! Cierro ya' + (known(ev.pnl) ? ' (' + O.fmtUsd(ev.pnl, true) + ')' : ''), kind: 'alarm', run: true, stamp: 'Cierre enviado' });
        else {
          seq = [{ t: 'say', text: msg, s: 3 }];
          if (win(ev) !== null) seq.push({ t: 'fx', fx: good ? 'coins' : 'rain' });          // sin resultado (aun sin deal en el ledger) no se celebra ni se llora
          seq.push({ t: 'wait', s: 1.6, pose: 'look', face: 'NE' });
        }
        if (S.strategies[ev.strategy].state === 'away') {
          seq.push({ t: 'wait', s: D.rng() * 1.5 }); seq.push({ t: 'exit' });
        }
        c.do(seq);
        if (ev.reason !== 'choch') o.do([{ t: 'face', dir: 'SW' }, { t: 'wait', s: 1.2, pose: 'stamp' }, { t: 'say', text: 'Cierre enviado', s: 2 }]);
        break;
      }
      case 'trailing':
        c.say(known(ev.sl) ? 'SL ↑ ' + O.fmtNum(ev.sl, 1) : 'SL ↑', 2.6);
        app.fx.spawn('spark', c);
        break;
      case 'giveup': c.say('Nada. Sigo mirando', 2.6, 'think'); break;
      case 'cap_strategy': c.say('Tope diario: me detengo', 3.6, 'sad'); this.char('RISK').say('Tope de ' + O.STRAT_BY_KEY[ev.strategy].name, 3, 'alarm'); break;
      case 'cap_global':
        this.char('RISK').do([{ t: 'stand' }, { t: 'say', text: '¡Tope diario! Puerta cerrada', s: 4, kind: 'alarm' }, { t: 'fx', fx: 'alarm' }]);
        break;
      case 'cap_clear': this.char('RISK').say('Tope liberado', 2.6); break;
      case 'eod_pre':
        this.char('EOD').do([{ t: 'say', text: '¡Cierre en 1 minuto!', s: 4, kind: 'alarm' }, { t: 'fx', fx: 'bell' }, { t: 'wait', s: 3, pose: 'bell' }]);
        break;
      case 'eod_close': this.char('EOD').say(ev.weekend ? 'Buen fin de semana' : 'Mercado cerrado', 3.5); break;
      case 'eod_open': this.char('EOD').say('Mercado abierto', 3); break;
      case 'mt5_down': this.char('DATA').do([{ t: 'stand' }, { t: 'say', text: '¡Sin señal MT5!', s: 3, kind: 'alarm' }, { t: 'fx', fx: 'spark' }]); break;
      case 'mt5_up': this.char('DATA').do([{ t: 'say', text: 'Línea restablecida ✓', s: 3 }, { t: 'wait', s: 1.4, pose: 'cheer' }]); break;
      case 'ledger_bad': this.char('LEDGER').say('¡Ledger ≠ broker!', 3.5, 'alarm'); break;
      case 'ledger_ok': this.char('LEDGER').do([{ t: 'hold', item: null }, { t: 'say', text: 'Todo cuadra ✓', s: 3 }, { t: 'wait', s: 1.4, pose: 'thumbs' }]); break;
      default: break;
    }
  };

  Director.prototype.update = function (dt) {
    const app = this.app, S = app.state;
    this.sync(false);
    app.source.drain().forEach(this.onEvent, this);
    O.CAST.forEach(function (def) {
      const c = app.chars[def.id];
      if (def.kind === 'strategy') {
        const p = S.strategies[def.id].position;
        if (p) {
          const risk = (p.sl !== null && p.entry !== null ? Math.abs(p.entry - p.sl) : 20) || 1;      // sin stop publicado: 20 USD de referencia
          c.mood = p.pnl > risk * 0.25 ? 'happy' : p.pnl < -risk * 0.5 ? 'worried' : null;
        } else c.mood = null;
      }
      c.update(dt);
    });
  };

  O.Director = Director;
})(typeof window !== 'undefined' ? window : globalThis);
