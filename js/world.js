/* Oficina ANZOBOT — plano de la sala: muebles, asientos, puntos de interes, pared y pathfinding. */
(function (root) {
  'use strict';
  const O = root.Office = root.Office || {};
  const W = O.GRID_W, H = O.GRID_H;

  O.PALETTES = {
    wood:    { top: '#d9a066', left: '#b5804a', right: '#9c6a3a' },
    exec:    { top: '#8d5d3b', left: '#6f4a2e', right: '#5a3b24' },
    counter: { top: '#e6e1d4', left: '#c7c0ae', right: '#b1a995' },
    steel:   { top: '#a7b2be', left: '#85919e', right: '#6e7a87' },
    pantry:  { top: '#efe9de', left: '#d3c9b6', right: '#bcb19b' },
    cooler:  { top: '#cfe6f2', left: '#a9cde0', right: '#8fb9cf' },
    shelf:   { top: '#a4815c', left: '#8a6a4a', right: '#6e5238' },
    pot:     { top: '#c97a4a', left: '#b5653a', right: '#9a5430' },
  };

  // Muebles (todo en tiles). screenTile/screen: monitor del escritorio (S = pantalla hacia +y, E = hacia +x).
  O.FURNITURE = [
    { id: 'D_CRT_CONTINUIDAD', type: 'desk', x: 1, y: 0, w: 2, d: 1, h: 26, pal: 'wood', owner: 'CRT_CONTINUIDAD', screenTile: [1, 0], screen: 'S',
      decor: [{ tile: [2, 0], kind: 'papers' }] },
    { id: 'D_CRT_CONT_V2', type: 'desk', x: 4, y: 0, w: 2, d: 1, h: 26, pal: 'wood', owner: 'CRT_CONT_V2', screenTile: [4, 0], screen: 'S',
      decor: [{ tile: [5, 0], kind: 'mug' }] },
    { id: 'D_CRT_CONT_FULL', type: 'desk', x: 7, y: 0, w: 2, d: 1, h: 26, pal: 'wood', owner: 'CRT_CONT_FULL', screenTile: [7, 0], screen: 'S',
      decor: [{ tile: [8, 0], kind: 'papers' }] },
    { id: 'D_CRT_REVERSION', type: 'desk', x: 10, y: 0, w: 2, d: 1, h: 26, pal: 'wood', owner: 'CRT_REVERSION', screenTile: [10, 0], screen: 'S',
      decor: [{ tile: [11, 0], kind: 'mug' }] },
    { id: 'D_VOL_BREAKOUT', type: 'desk', x: 0, y: 3, w: 1, d: 2, h: 26, pal: 'wood', owner: 'VOL_BREAKOUT', screenTile: [0, 3], screen: 'E',
      decor: [{ tile: [0, 4], kind: 'mug' }] },
    { id: 'D_BOLL_H4', type: 'desk', x: 0, y: 6, w: 1, d: 2, h: 26, pal: 'wood', owner: 'BOLL_H4', screenTile: [0, 6], screen: 'E',
      decor: [{ tile: [0, 7], kind: 'papers' }] },
    { id: 'D_RISK', type: 'desk', x: 14, y: 0, w: 3, d: 1, h: 26, pal: 'exec', owner: 'RISK', screenTile: [15, 0], screen: 'S',
      decor: [{ tile: [14, 0], kind: 'lamp' }, { tile: [16, 0], kind: 'papers' }] },
    { id: 'D_DATA', type: 'desk', x: 13, y: 3, w: 3, d: 1, h: 26, pal: 'steel', owner: 'DATA',
      decor: [{ tile: [13, 3], kind: 'router' }, { tile: [14, 3], kind: 'phone' }, { tile: [15, 3], kind: 'papers' }] },
    { id: 'D_LEDGER', type: 'desk', x: 15, y: 6, w: 2, d: 1, h: 26, pal: 'wood', owner: 'LEDGER',
      decor: [{ tile: [15, 6], kind: 'ledger' }, { tile: [16, 6], kind: 'calc' }] },
    { id: 'COUNTER_ORDERS', type: 'counter', x: 5, y: 6, w: 5, d: 1, h: 24, pal: 'counter', owner: 'ORDERS',
      decor: [{ tile: [6, 6], kind: 'ticket' }, { tile: [8, 6], kind: 'bell' }] },
    { id: 'CABINET', type: 'cabinet', x: 17, y: 0, w: 1, d: 1, h: 46, pal: 'steel' },
    { id: 'PANTRY', type: 'counter', x: 13, y: 11, w: 4, d: 1, h: 28, pal: 'pantry',
      decor: [{ tile: [14, 11], kind: 'coffee' }, { tile: [16, 11], kind: 'mugs' }] },
    { id: 'COOLER', type: 'cooler', x: 12, y: 11, w: 1, d: 1, h: 40, pal: 'cooler' },
    { id: 'SHELF', type: 'shelf', x: 0, y: 8, w: 1, d: 1, h: 70, pal: 'shelf' },
    { id: 'HAMMOCK', type: 'hammock', x: 0, y: 9, w: 1, d: 3, h: 0 },
    { id: 'PLANT_1', type: 'plant', x: 12, y: 0, w: 1, d: 1, h: 0 },
    { id: 'PLANT_2', type: 'plant', x: 17, y: 12, w: 1, d: 1, h: 0 },
    { id: 'PLANT_3', type: 'plant', x: 3, y: 13, w: 1, d: 1, h: 0 },
  ];

  // Alfombras y felpudo (decoracion de piso, se camina encima)
  O.DECALS = [
    { id: 'RUG_CENTER', kind: 'rug', x: 6, y: 8, w: 6, d: 4, colors: ['#3f5f88', '#6f93bd'] },
    { id: 'MAT_DOOR', kind: 'rug', x: 0, y: 12, w: 2, d: 2, colors: ['#5b4331', '#8a6a4a'] },
  ];

  // Asientos. face = hacia donde mira quien se sienta. chair=false -> sin silla (de pie o hamaca).
  O.SEATS = {
    CRT_CONTINUIDAD: { tile: [1, 1],  face: 'NE', chair: true },
    CRT_CONT_V2:     { tile: [4, 1],  face: 'NE', chair: true },
    CRT_CONT_FULL:   { tile: [7, 1],  face: 'NE', chair: true },
    CRT_REVERSION:   { tile: [10, 1], face: 'NE', chair: true },
    VOL_BREAKOUT:    { tile: [1, 3],  face: 'NW', chair: true },
    BOLL_H4:         { tile: [1, 6],  face: 'NW', chair: true },
    RISK:            { tile: [15, 1], face: 'NE', chair: true },
    DATA:            { tile: [14, 2], face: 'SW', chair: true },
    LEDGER:          { tile: [15, 5], face: 'SW', chair: true },
    VOL_BREAKOUT_W:  { tile: [0, 10], face: 'SW', chair: false, lie: true },
    ORDERS:          { tile: [7, 5],  face: 'SW', chair: false, stand: true },
    EOD:             { tile: [1, 11], face: 'NW', chair: false, stand: true },
  };

  // Puntos de interes
  O.POINTS = {
    door: [0, 12],
    doorStep: [1, 12],
    counterFront: [[6, 7], [7, 7], [8, 7]],
    pantry: [[13, 12], [14, 12], [15, 12], [16, 12]],
    patrol: [[3, 10], [5, 9], [4, 4], [10, 4], [12, 8], [16, 9], [9, 12]],
    eodDoorPost: [1, 11],
    riskLockPost: [2, 12],
  };

  // Objetos de pared. wall 'R' = pared derecha (plano y=0, a..b en x); 'L' = izquierda (plano x=0, a..b en y).
  O.WALL_ITEMS = [
    { id: 'WIN_LONDON',  wall: 'R', a: 1.3, b: 3.7,  z0: 44, z1: 98,  kind: 'window', session: 'London',   label: 'Londres' },
    { id: 'WIN_NY',      wall: 'R', a: 4.3, b: 6.7,  z0: 44, z1: 98,  kind: 'window', session: 'New_York', label: 'Nueva York' },
    { id: 'CLOCK',       wall: 'R', a: 8.2, b: 9.6,  z0: 50, z1: 96,  kind: 'clock',  label: 'Reloj' },
    { id: 'BOARD',       wall: 'R', a: 10.2, b: 12.8, z0: 44, z1: 100, kind: 'board',  label: 'Bitácora de eventos' },
    { id: 'GAUGE',       wall: 'R', a: 13.3, b: 17.3, z0: 40, z1: 100, kind: 'gauge',  label: 'Topes diarios' },
    { id: 'POSTER',      wall: 'L', a: 1.2, b: 2.8,  z0: 52, z1: 98,  kind: 'poster', label: 'Póster' },
    { id: 'ART',         wall: 'L', a: 3.3, b: 4.7,  z0: 56, z1: 96,  kind: 'art',    label: 'Cuadro' },
    { id: 'CALENDAR',    wall: 'L', a: 5.6, b: 7.6,  z0: 46, z1: 98,  kind: 'calendar', label: 'P&L mensual' },
    { id: 'TV',          wall: 'L', a: 9.0, b: 11.8, z0: 44, z1: 100, kind: 'tv',     label: 'Gráfica de ganancias' },
    { id: 'DOOR',        wall: 'L', a: 12.15, b: 13.85, z0: 0, z1: 84, kind: 'door',  label: 'Puerta' },
  ];

  // Casillas bloqueadas por muebles
  O.blocked = [];
  for (let y = 0; y < H; y++) O.blocked.push(new Array(W).fill(false));
  O.FURNITURE.forEach(function (f) {
    for (let yy = f.y; yy < f.y + f.d; yy++) for (let xx = f.x; xx < f.x + f.w; xx++) O.blocked[yy][xx] = true;
  });

  O.isWalkable = function (x, y) {
    return x >= 0 && y >= 0 && x < W && y < H && !O.blocked[y][x];
  };

  O.nearestWalkable = function (x, y) {
    if (O.isWalkable(x, y)) return [x, y];
    for (let r = 1; r < 6; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (O.isWalkable(x + dx, y + dy)) return [x + dx, y + dy];
      }
    }
    return null;
  };

  // A* de 8 direcciones sin cortar esquinas. El inicio puede estar sobre un mueble (silla, hamaca).
  O.findPath = function (sx, sy, tx, ty) {
    if (sx === tx && sy === ty) return [];
    if (!O.isWalkable(tx, ty)) {
      const alt = O.nearestWalkable(tx, ty);
      if (!alt) return [];
      tx = alt[0]; ty = alt[1];
    }
    const key = function (x, y) { return y * W + x; };
    const open = [{ x: sx, y: sy, g: 0, f: 0, p: null }];
    const best = {}; best[key(sx, sy)] = 0;
    const closed = {};
    const heur = function (x, y) {
      const dx = Math.abs(x - tx), dy = Math.abs(y - ty);
      return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
    };
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const cur = open.splice(bi, 1)[0];
      const ck = key(cur.x, cur.y);
      if (closed[ck]) continue;
      closed[ck] = true;
      if (cur.x === tx && cur.y === ty) {
        const path = [];
        for (let n = cur; n && n.p; n = n.p) path.push([n.x, n.y]);
        return path.reverse();
      }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cur.x + dx, ny = cur.y + dy;
        if (!O.isWalkable(nx, ny)) continue;
        if (dx && dy && (!O.isWalkable(cur.x + dx, cur.y) || !O.isWalkable(cur.x, cur.y + dy))) continue;
        const g = cur.g + (dx && dy ? Math.SQRT2 : 1);
        const nk = key(nx, ny);
        if (closed[nk] || (best[nk] !== undefined && best[nk] <= g)) continue;
        best[nk] = g;
        open.push({ x: nx, y: ny, g: g, f: g + heur(nx, ny), p: cur });
      }
    }
    return [];
  };

  // Casilla caminable al azar a distancia [r0, r1] (Chebyshev) de un punto, alcanzable desde el.
  O.randomNear = function (tile, r0, r1, rng) {
    const cands = [];
    for (let dy = -r1; dy <= r1; dy++) for (let dx = -r1; dx <= r1; dx++) {
      const r = Math.max(Math.abs(dx), Math.abs(dy));
      if (r < r0 || r > r1) continue;
      const x = tile[0] + dx, y = tile[1] + dy;
      if (O.isWalkable(x, y)) cands.push([x, y]);
    }
    while (cands.length) {
      const i = Math.floor(rng() * cands.length);
      const c = cands.splice(i, 1)[0];
      if (O.findPath(tile[0], tile[1], c[0], c[1]).length) return c;
    }
    return tile;
  };

  // Silueta (hexagono) de un mueble en coordenadas del mundo, para clics y resaltado.
  O.furnitureHull = function (f) {
    const h = f.type === 'plant' ? 56 : f.type === 'hammock' ? 30 : f.h;
    const x0 = f.x, y0 = f.y, x1 = f.x + f.w, y1 = f.y + f.d;
    return [O.iso(x0, y0, h), O.iso(x1, y0, h), O.iso(x1, y0, 0), O.iso(x1, y1, 0), O.iso(x0, y1, 0), O.iso(x0, y1, h)];
  };
})(typeof window !== 'undefined' ? window : globalThis);
