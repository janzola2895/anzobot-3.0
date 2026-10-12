/* Oficina ANZOBOT — el reparto: que pieza del bot es cada personaje. */
(function (root) {
  'use strict';
  const O = root.Office = root.Office || {};

  // Estrategias del bot (claves = las de config.json > strategy_limits).
  // grade: nivel de evidencia de la boveda (A/B/C/D); en la fase 1 se leera del bot.
  // sim: parametros SOLO del simulador de la fase 0.
  O.STRATS = [
    { key: 'CRT_CONTINUIDAD', name: 'CRT Continuidad', grade: 'D', cap: { profit: 30, loss: 25 },
      sim: { kind: 'crt', sl: [9, 16], rr: [1.5, 2.0] } },
    { key: 'CRT_CONT_V2', name: 'CRT Cont. V2', grade: 'C', cap: { profit: 30, loss: 25 },
      sim: { kind: 'crt', sl: [9, 16], rr: [1.5, 2.0] } },
    { key: 'CRT_CONT_FULL', name: 'CRT Cont. Full', grade: 'C', cap: { profit: 30, loss: 30 },
      sim: { kind: 'crt', sl: [9, 16], rr: [1.5, 2.0] } },
    { key: 'CRT_REVERSION', name: 'CRT Reversión', grade: 'C', cap: { profit: 30, loss: 25 },
      sim: { kind: 'crt', sl: [9, 16], rr: [1.5, 2.0] } },
    { key: 'VOL_BREAKOUT', name: 'Ruptura diaria', grade: 'A', cap: null,
      sim: { kind: 'daily', sl: [26, 52], rr: [3, 4] } },
    { key: 'VOL_BREAKOUT_W', name: 'Ruptura semanal', grade: 'B', cap: null,
      sim: { kind: 'weekly', sl: [50, 90], rr: [8, 10] } },
    { key: 'BOLL_H4', name: 'Bollinger H4', grade: 'B', cap: null,
      sim: { kind: 'boll', sl: [17, 64], rr: [1.5, 2.5] } },
  ];
  O.STRAT_BY_KEY = {};
  O.STRATS.forEach(function (s) { O.STRAT_BY_KEY[s.key] = s; });

  const UNIFORM = '#3b6fb6';

  // look: skin, hair, hairStyle, shirt, pants, shoes, acc[]
  O.CAST = [
    { id: 'CRT_CONTINUIDAD', kind: 'strategy', name: 'CRT Continuidad', role: 'Analista CRT',
      desc: 'Continuidad de tendencia: espera la ruptura del rango CRT y entra en el retest.',
      look: { skin: '#f1c27d', hair: '#5a3825', style: 'short', shirt: UNIFORM, pants: '#2f3e5a', shoes: '#1d1d1d', acc: ['glasses', 'lanyard'] } },
    { id: 'CRT_CONT_V2', kind: 'strategy', name: 'CRT Cont. V2', role: 'Analista CRT',
      desc: 'Segunda versión de la continuidad CRT, con su propio filtro de rango.',
      look: { skin: '#e0ac69', hair: '#1c1c1c', style: 'short', shirt: UNIFORM, pants: '#2f3e5a', shoes: '#1d1d1d', acc: ['glasses', 'lanyard'] } },
    { id: 'CRT_CONT_FULL', kind: 'strategy', name: 'CRT Cont. Full', role: 'Analista CRT',
      desc: 'Continuidad CRT completa, con sus propios topes diarios.',
      look: { skin: '#f1c27d', hair: '#c1542a', style: 'curly', shirt: UNIFORM, pants: '#2f3e5a', shoes: '#1d1d1d', acc: ['glasses', 'lanyard'] } },
    { id: 'CRT_REVERSION', kind: 'strategy', name: 'CRT Reversión', role: 'El contrarista',
      desc: 'Barrido de liquidez y reversión: opera en contra de la ruptura fallida.',
      look: { skin: '#f1c27d', hair: '#ff4d8d', style: 'mohawk', shirt: '#25252b', pants: '#4a2a5a', shoes: '#101010', acc: ['studs'] } },
    { id: 'VOL_BREAKOUT', kind: 'strategy', name: 'Ruptura diaria', role: 'El madrugador',
      desc: 'Ruptura de volatilidad diaria: una sola operación por día; sale por tiempo a las 15:55 COT.',
      look: { skin: '#c68642', hair: '#2b1d12', style: 'short', shirt: '#e6892a', pants: '#3a3f4a', shoes: '#1d1d1d', acc: ['cap:#2f9e5a'] } },
    { id: 'VOL_BREAKOUT_W', kind: 'strategy', name: 'Ruptura semanal', role: 'El dormilón',
      desc: 'Ruptura semanal: duerme en su hamaca toda la semana y solo despierta para entrar y salir.',
      sleeper: true,
      look: { skin: '#f1c27d', hair: '#9a9a9a', style: 'short', shirt: '#8fb8e8', pants: '#8fb8e8', shoes: '#d9d9d9', acc: ['nightcap', 'stripes'] } },
    { id: 'BOLL_H4', kind: 'strategy', name: 'Bollinger H4', role: 'El de las bandas',
      desc: 'Continuación con bandas de Bollinger en H4; el trailing sigue la SMA20 vela a vela.',
      look: { skin: '#e0ac69', hair: '#6b3fa0', style: 'wavy', shirt: '#7b4fc4', pants: '#3a3a5a', shoes: '#1d1d1d', acc: ['headband'] } },
    { id: 'RISK', kind: 'staff', name: 'Jefe de riesgo', role: 'Risk manager',
      desc: 'Vigila los topes diarios: el global y el de cada estrategia. Al tocarlos, cierra la puerta a nuevas entradas.',
      look: { skin: '#f1c27d', hair: '#9a9a9a', style: 'short', shirt: '#2d3441', pants: '#2d3441', shoes: '#101010', acc: ['tie', 'badge'] } },
    { id: 'EOD', kind: 'staff', name: 'Vigilante', role: 'Cierres del día',
      desc: 'Cuida el reloj: cierre diario 16:00 COT, viernes a las 14:00 COT y reapertura dominical.',
      look: { skin: '#c68642', hair: '#1a1a1a', style: 'short', shirt: '#1f3a63', pants: '#17263f', shoes: '#101010', acc: ['guardcap', 'badge', 'belt'] } },
    { id: 'LEDGER', kind: 'staff', name: 'Contador', role: 'Conciliación',
      desc: 'Compara el ledger del bot contra el historial del broker y avisa de cualquier descuadre.',
      look: { skin: '#f1c27d', hair: '#3a2a1a', style: 'bald', shirt: '#eef2f6', pants: '#3a3f4a', shoes: '#1d1d1d', acc: ['glasses', 'visor', 'vest:#2f7d46'] } },
    { id: 'DATA', kind: 'staff', name: 'Mensajero de datos', role: 'Conexión MT5',
      desc: 'Mantiene la línea con MetaTrader 5: velas, precio y estado de la cuenta.',
      look: { skin: '#8d5524', hair: '#111111', style: 'afro', shirt: '#1fa6a6', pants: '#2f3e5a', shoes: '#1d1d1d', acc: ['headset'] } },
    { id: 'ORDERS', kind: 'staff', name: 'Mensajero de órdenes', role: 'Ventanilla del broker',
      desc: 'Lleva las órdenes de entrada, trailing y cierre hasta el broker.',
      look: { skin: '#f1c27d', hair: '#a06a2c', style: 'short', shirt: '#f2c230', pants: '#3a3f4a', shoes: '#1d1d1d', acc: ['cap:#f2c230', 'vest:#e08a1e'] } },
  ];
  O.CAST_BY_ID = {};
  O.CAST.forEach(function (c) { O.CAST_BY_ID[c.id] = c; });
})(typeof window !== 'undefined' ? window : globalThis);
