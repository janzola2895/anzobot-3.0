/* Oficina ANZOBOT — utilidades, constantes y proyeccion isometrica. */
(function (root) {
  'use strict';
  const O = root.Office = root.Office || {};

  O.TILE_W = 64;
  O.TILE_H = 32;
  O.GRID_W = 18;            // tiles en x (a lo largo de la pared derecha)
  O.GRID_H = 14;            // tiles en y (a lo largo de la pared izquierda)
  O.WALL_H = 120;
  O.MARGIN = 40;
  O.ORIGIN_X = O.GRID_H * 32 + O.MARGIN;
  O.ORIGIN_Y = O.WALL_H + 30;
  O.WORLD_W = (O.GRID_W + O.GRID_H) * 32 + O.MARGIN * 2;
  O.WORLD_H = O.ORIGIN_Y + (O.GRID_W + O.GRID_H) * 16 + 50;

  // tile (continuo) + altura -> pixel del mundo
  O.iso = function (tx, ty, tz) {
    return { x: O.ORIGIN_X + (tx - ty) * 32, y: O.ORIGIN_Y + (tx + ty) * 16 - (tz || 0) };
  };

  O.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  O.lerp = function (a, b, t) { return a + (b - a) * t; };

  // PRNG con semilla (mulberry32) para que los prototipos sean reproducibles
  O.makeRng = function (seed) {
    let s = seed >>> 0;
    const f = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = function (a, b) { return a + (b - a) * f(); };
    f.int = function (a, b) { return Math.floor(a + (b - a + 1) * f()); };
    f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
    f.gauss = function () {
      let u = 0, v = 0;
      while (u === 0) u = f();
      while (v === 0) v = f();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    return f;
  };

  // Aclara (f>0) u oscurece (f<0) un color #rrggbb
  O.shade = function (hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round((t - r) * p + r);
    g = Math.round((t - g) * p + g);
    b = Math.round((t - b) * p + b);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  };

  // Fraccion del tope diario global usada (-1..1): negativa hacia la perdida; 0 si ese lado no tiene tope (null en el config).
  O.capFraction = function (risk) {
    const cap = risk.dailyPnl >= 0 ? risk.capProfit : risk.capLoss;
    return cap ? O.clamp(risk.dailyPnl / cap, -1, 1) : 0;
  };

  // 12,5 -> "12,50" (coma decimal, como escribe Juan); un valor ausente se muestra como "—"
  O.fmtMaybe = function (n, dec) { return n === null || n === undefined || !isFinite(n) ? '—' : O.fmtNum(n, dec); };
  O.fmtNum = function (n, dec) {
    return Number(n).toFixed(dec === undefined ? 2 : dec).replace('.', ',');
  };
  O.fmtUsd = function (n, withSign) {
    const s = O.fmtNum(Math.abs(n), 2);
    if (n < 0) return '-$' + s;
    return (withSign ? '+$' : '$') + s;
  };
  // 0,34 -> "+34 %" (la fraccion del tope diario; sin montos)
  O.fmtPct = function (f) { const n = Math.round(f * 100); return (n > 0 ? '+' : '') + n + ' %'; };
  O.fmtClock = function (minutes) {
    const m = ((Math.floor(minutes) % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
  };
  O.DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  // Nivel de evidencia de cada estrategia (boveda, «Criterio de evidencia»): verde = ventaja demostrable, azul = moderada, ambar = sin ventaja clara, rojo = negativa
  O.GRADE_COLOR = { A: '#22c55e', B: '#38bdf8', C: '#fbbf24', D: '#ef4444' };

  // Reglas de reloj del bot (hora de Colombia): sesiones de mercado y fases del cierre del dia. Las usan el simulador y la repeticion.
  O.sessionFor = function (min) {
    if (min >= 2 * 60 && min < 7 * 60) return 'London';
    if (min >= 7 * 60 + 30 && min < 12 * 60 + 30) return 'New_York';
    return '';
  };
  O.phaseFor = function (day, min) {
    if ((day === 4 && min >= 14 * 60) || day === 5 || (day === 6 && min < 17 * 60)) return 'weekend';
    if (day <= 3 && min >= 16 * 60 && min < 17 * 60 + 1) return 'closed';
    return 'open';
  };
})(typeof window !== 'undefined' ? window : globalThis);
