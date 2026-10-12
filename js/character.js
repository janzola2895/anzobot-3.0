/* Oficina ANZOBOT — personajes: posicion, movimiento por tiles y cola de acciones. */
(function (root) {
  'use strict';
  const O = root.Office = root.Office || {};

  function faceFromDelta(dx, dy, prev) {
    if (!dx && !dy) return prev;
    if (dx > 0 && dy === 0) return 'SE';
    if (dx === 0 && dy > 0) return 'SW';
    if (dx < 0 && dy === 0) return 'NW';
    if (dx === 0 && dy < 0) return 'NE';
    if (dx > 0 && dy > 0) return 'SE';
    if (dx < 0 && dy < 0) return 'NW';
    if (dx > 0 && dy < 0) return 'SE';
    return 'SW';
  }

  function Character(def, startTile) {
    this.id = def.id;
    this.def = def;
    this.look = def.look;
    this.x = startTile[0] + 0.5;            // posicion continua en tiles (centro de la casilla)
    this.y = startTile[1] + 0.5;
    this.face = 'SW';
    this.pose = 'stand';
    this.t = Math.random() * 10;
    this.queue = [];
    this.cur = null;
    this.baseName = 'idle';
    this.baseFn = null;
    this.seated = false;
    this.lying = false;
    this.seatKey = null;
    this.alpha = 1;
    this.visible = true;
    this.prop = null;
    this.bubble = null;
    this.path = [];
    this.speed = 2.0;
    this.actionPose = null;
    this.mood = null;                       // 'happy' | 'worried' | null (lo pone el director)
    this.onStep = null;
  }

  Character.prototype.tile = function () { return [Math.floor(this.x), Math.floor(this.y)]; };

  // Reemplaza lo que esta haciendo por una secuencia nueva.
  Character.prototype.do = function (actions) {
    this.queue = actions.slice();
    this.cur = null;
    this.path = [];
  };
  Character.prototype.push = function (actions) { this.queue.push.apply(this.queue, actions); };
  Character.prototype.busy = function () { return !!(this.cur && !this.cur.base) || this.queue.some(function (a) { return !a.base; }); };

  // Cambia la conducta de fondo; si lo actual era de fondo, se corta para reaccionar ya.
  Character.prototype.setBase = function (name, fn) {
    if (this.baseName === name) return;
    this.baseName = name; this.baseFn = fn;
    if (this.cur && this.cur.base) { this.cur = null; this.path = []; }
    this.queue = this.queue.filter(function (a) { return !a.base; });
  };

  Character.prototype.say = function (text, secs, kind) {
    this.bubble = { text: text, until: this.t + (secs || 3), kind: kind || 'say' };
  };

  Character.prototype.update = function (dt) {
    this.t += dt;
    if (this.bubble && this.t > this.bubble.until) this.bubble = null;
    let guard = 0;
    while (guard++ < 8) {
      if (!this.cur) {
        if (!this.queue.length) {
          const chunk = this.baseFn ? this.baseFn(this) : null;
          if (chunk && chunk.length) this.queue = chunk.map(function (a) { a.base = true; return a; });
          else this.queue = [{ t: 'wait', s: 1, base: true }];
        }
        this.cur = this.start(this.queue.shift());
        if (!this.cur) continue;
      }
      const done = this.step(this.cur, dt);
      if (done) { this.cur = null; dt = 0; continue; }      // encadena las acciones que terminan al instante
      break;
    }
  };

  Character.prototype.unseat = function () {
    if (this.lying) {
      // sale de la hamaca hacia la casilla libre de al lado
      const t = O.nearestWalkable(Math.floor(this.x), Math.floor(this.y));
      if (t) { this.x = t[0] + 0.5; this.y = t[1] + 0.5; }
    }
    this.seated = false; this.lying = false;
  };

  // --- inicio de cada accion (devuelve el estado de la accion, o null si se resolvio al instante)
  Character.prototype.start = function (a) {
    const me = this;
    switch (a.t) {
      case 'walk': {
        if (me.seated || me.lying) me.unseat();
        const tile = me.tile();
        let target = [a.x, a.y];
        const path = O.findPath(tile[0], tile[1], target[0], target[1]);
        me.path = path.map(function (p) { return { x: p[0] + 0.5, y: p[1] + 0.5 }; });
        return { t: 'walk', base: a.base, speed: a.speed || me.speed, run: !!a.run };
      }
      case 'sit': {
        const sd = O.SEATS[a.seat];
        me.seatKey = a.seat;
        me.queue.unshift({ t: 'walk', x: sd.tile[0], y: sd.tile[1], base: a.base }, { t: 'sitnow', seat: a.seat, base: a.base });
        return null;
      }
      case 'sitnow': {
        const sd = O.SEATS[a.seat];
        me.x = sd.tile[0] + 0.5; me.y = sd.tile[1] + 0.5;
        me.face = sd.face; me.seatKey = a.seat;
        if (sd.lie) { me.lying = true; me.seated = false; me.pose = 'sleep'; }
        else if (sd.stand) { me.seated = false; me.pose = 'stand'; }
        else { me.seated = true; me.pose = 'sit'; }
        return null;
      }
      case 'stand': me.unseat(); me.pose = 'stand'; return null;
      case 'face': me.face = a.dir; return null;
      case 'hold': me.prop = a.item || null; return null;
      case 'say': me.say(a.text, a.s, a.kind); if (a.block) return { t: 'wait', left: a.s, base: a.base }; return null;
      case 'fx': if (O.app && O.app.fx) O.app.fx.spawn(a.fx, me, a); return null;
      case 'fn': a.fn(me); return null;
      case 'wait':
        me.actionPose = a.pose || null;
        if (a.face) me.face = a.face;
        return { t: 'wait', left: a.s, base: a.base };
      case 'pose': me.actionPose = a.name; return { t: 'wait', left: a.s || 0.5, base: a.base };
      case 'exit': {
        if (me.seated || me.lying) me.unseat();
        const door = O.POINTS.door, tile = me.tile();
        const path = O.findPath(tile[0], tile[1], door[0], door[1]);
        me.path = path.map(function (p) { return { x: p[0] + 0.5, y: p[1] + 0.5 }; });
        me.queue.unshift({ t: 'fadeout', base: a.base });
        return { t: 'walk', base: a.base, speed: a.speed || me.speed, run: false };
      }
      case 'fadeout': me.face = 'NW'; return { t: 'fade', dir: -1, base: a.base };
      case 'enter': {
        const door = O.POINTS.door;
        me.x = door[0] + 0.5; me.y = door[1] + 0.5; me.alpha = 0; me.visible = true;
        me.seated = false; me.lying = false; me.face = 'SE'; me.prop = null;
        return { t: 'fade', dir: 1, base: a.base };
      }
      default: return null;
    }
  };

  Character.prototype.step = function (c, dt) {
    switch (c.t) {
      case 'walk': {
        if (!this.path.length) { this.pose = 'stand'; this.actionPose = null; return true; }
        const nx = this.path[0];
        const dx = nx.x - this.x, dy = nx.y - this.y, dist = Math.sqrt(dx * dx + dy * dy);
        const stepLen = c.speed * dt;
        this.face = faceFromDelta(Math.sign(Math.round(dx * 10) / 10), Math.sign(Math.round(dy * 10) / 10), this.face);
        this.pose = c.run ? 'run' : 'walk'; this.actionPose = null;
        if (dist <= stepLen) { this.x = nx.x; this.y = nx.y; this.path.shift(); if (!this.path.length) { this.pose = 'stand'; return true; } }
        else { this.x += dx / dist * stepLen; this.y += dy / dist * stepLen; }
        return false;
      }
      case 'wait':
        c.left -= dt;
        if (c.left <= 0) { this.actionPose = null; return true; }
        return false;
      case 'fade':
        this.alpha = O.clamp(this.alpha + c.dir * dt * 2, 0, 1);
        if (c.dir < 0 && this.alpha <= 0) { this.visible = false; this.pose = 'stand'; return true; }
        if (c.dir > 0 && this.alpha >= 1) return true;
        return false;
      default: return true;
    }
  };

  // Pose efectiva para dibujar
  Character.prototype.drawPose = function () {
    if (this.actionPose) return this.actionPose;
    if (this.lying) return 'sleep';
    if (this.seated) return 'sit';
    return this.pose;
  };

  O.Character = Character;
})(typeof window !== 'undefined' ? window : globalThis);
