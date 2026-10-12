/* Oficina ANZOBOT — avatares pixel-art dibujados por codigo (sprites propios, no de Habbo).
   Unidad de sprite = 2 px del mundo; origen = pies (centro); y negativo = arriba. */
(function (root) {
  'use strict';
  const O = root.Office = root.Office || {};

  // Pose -> parametros de animacion
  function poseParams(pose, t) {
    const p = { bob: 0, legL: 0, legR: 0, aL: 'down', aR: 'down', aLdy: 0, aRdy: 0, headDy: 0, headDx: 0, sit: false, eyes: 'open' };
    const f = Math.floor(t * 8) % 4;
    switch (pose) {
      case 'walk':
        p.legL = f === 0 ? 2 : 0; p.legR = f === 2 ? 2 : 0;
        p.bob = (f === 1 || f === 3) ? -1 : 0;
        p.aLdy = f === 0 ? 1 : f === 2 ? -1 : 0; p.aRdy = -p.aLdy;
        break;
      case 'run': {
        const g = Math.floor(t * 12) % 4;
        p.legL = g === 0 ? 3 : 0; p.legR = g === 2 ? 3 : 0; p.bob = (g === 1 || g === 3) ? -2 : 0;
        p.aL = 'out'; p.aR = 'out'; p.aLdy = g < 2 ? 1 : -1; p.aRdy = -p.aLdy;
        break;
      }
      case 'sit': p.sit = true; break;
      case 'type':
        p.sit = true; p.aL = 'type'; p.aR = 'type';
        p.aLdy = Math.floor(t * 6) % 2; p.aRdy = 1 - p.aLdy;
        break;
      case 'sip': p.sit = false; p.aR = 'up'; p.aRdy = 6; p.headDy = Math.floor(t * 2) % 2 ? 0 : 0; break;
      case 'sleepdesk': p.sit = true; p.headDy = 3; p.headDx = 1; p.aL = 'type'; p.aR = 'type'; p.eyes = 'closed'; break;
      case 'dance': {
        const d = Math.floor(t * 5) % 2;
        p.bob = d ? -2 : 0; p.aL = d ? 'up' : 'down'; p.aR = d ? 'down' : 'up';
        p.legL = d ? 0 : 2; p.legR = d ? 2 : 0;
        break;
      }
      case 'cheer': p.aL = 'up'; p.aR = 'up'; p.bob = Math.floor(t * 4) % 2 ? -1 : 0; break;
      case 'facepalm': p.aR = 'face'; p.headDy = 1; p.eyes = 'closed'; break;
      case 'think': p.aR = 'chin'; break;
      case 'look': p.headDx = Math.floor(t * 1.5) % 2 ? -1 : 1; break;
      case 'handover': p.aR = 'out'; break;
      case 'stamp': {
        const s = Math.floor(t * 3) % 2;
        p.aR = s ? 'out' : 'up'; p.aRdy = s ? 1 : 0;
        break;
      }
      case 'cross': p.aL = 'cross'; p.aR = 'cross'; break;
      case 'bell': p.aR = 'up'; p.aRdy = Math.floor(t * 8) % 2 ? 0 : 2; break;
      case 'phone': p.aR = 'phone'; break;
      case 'panic': p.aL = 'up'; p.aR = 'up'; p.aLdy = Math.floor(t * 10) % 2; p.aRdy = 1 - p.aLdy; p.bob = Math.floor(t * 10) % 2 ? -1 : 0; break;
      case 'wave': p.aR = 'up'; p.aRdy = Math.floor(t * 6) % 2 ? 0 : 2; break;
      case 'thumbs': p.aR = 'out'; break;
      case 'sleep': p.eyes = 'closed'; break;
      case 'yawn': p.aR = 'face'; p.eyes = 'closed'; break;
      default: break;
    }
    return p;
  }

  function parseAcc(list) {
    const out = {};
    (list || []).forEach(function (a) {
      const i = a.indexOf(':');
      if (i < 0) out[a] = true; else out[a.slice(0, i)] = a.slice(i + 1);
    });
    return out;
  }

  // s: { x, y, face, pose, t, alpha, prop, lying, lieAngle }
  O.drawCharacter = function (ctx, look, s) {
    const acc = look._acc || (look._acc = parseAcc(look.acc));
    const mirror = (s.face === 'SE' || s.face === 'NE');
    const back = (s.face === 'NE' || s.face === 'NW');
    const p = poseParams(s.pose, s.t || 0);
    const sit = p.sit;

    ctx.save();
    ctx.translate(Math.round(s.x), Math.round(s.y));
    if (s.alpha !== undefined && s.alpha < 1) ctx.globalAlpha = Math.max(0, s.alpha);

    if (!s.lying && !sit) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(0, 1, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (s.lying) ctx.rotate(s.lieAngle === undefined ? 1.107 : s.lieAngle);
    if (mirror) ctx.scale(-1, 1);
    ctx.scale(2, 2);

    const R = function (x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const dy = (sit ? 4 : 0) + p.bob;       // cuerpo mas abajo si esta sentado
    const skin = look.skin, shade = O.shade(look.shirt, -0.18), pantsShade = O.shade(look.pants, -0.2);

    // --- piernas ---
    if (!sit) {
      R(-4, -11 + dy, 8, 3, look.pants);
      R(-4, -8, 3, 6 - p.legL, look.pants);
      R(1, -8, 3, 6 - p.legR, look.pants);
      R(1, -8, 1, 6 - p.legR, pantsShade);
      R(-4, -2 - p.legL, 3, 2, look.shoes);
      R(1, -2 - p.legR, 3, 2, look.shoes);
    } else {
      R(-4, -7, 8, 4, look.pants);
      if (!back) { R(-4, -3, 3, 3, look.pants); R(1, -3, 3, 3, look.pants); R(-4, -1, 3, 1, look.shoes); R(1, -1, 3, 1, look.shoes); }
      R(1, -7, 1, 4, pantsShade);
    }

    // --- torso ---
    R(-4, -19 + dy, 8, 8, look.shirt);
    R(2, -19 + dy, 2, 8, shade);
    if (acc.stripes) { for (let i = 0; i < 4; i++) R(-4, -18 + dy + i * 2, 8, 1, '#ffffff55'); R(-4, -11 + dy, 8, 1, look.pants); }
    if (acc.vest) { const vc = acc.vest; R(-4, -19 + dy, 3, 8, vc); R(1, -19 + dy, 3, 8, vc); if (!back) R(-1, -19 + dy, 2, 8, look.shirt); }
    if (acc.belt) R(-4, -12 + dy, 8, 1, '#222');
    if (!back) {
      if (acc.tie) { R(-1, -19 + dy, 2, 2, '#e8e8e8'); R(-1, -17 + dy, 2, 5, '#c1272d'); }
      if (acc.lanyard) { R(-1, -19 + dy, 1, 5, '#e8b84b'); R(-1, -14 + dy, 2, 2, '#ffffff'); }
      if (acc.badge) R(2, -17 + dy, 2, 2, '#e8b84b');
      if (s.grade && O.GRADE_COLOR[s.grade]) { R(-4, -17 + dy, 3, 3, '#0b1220'); R(-4, -17 + dy, 2, 2, O.GRADE_COLOR[s.grade]); R(-3, -16 + dy, 2, 2, O.GRADE_COLOR[s.grade]); }     // insignia de evidencia en el pecho
    }
    if (acc.studs) { R(-6, -20 + dy, 2, 1, '#cfd3d8'); R(4, -20 + dy, 2, 1, '#cfd3d8'); R(-3, -18 + dy, 1, 1, '#cfd3d8'); R(2, -18 + dy, 1, 1, '#cfd3d8'); }

    // --- brazos ---
    const arm = function (side, kind, ady) {
      const x = side < 0 ? -6 : 4;
      const hy = -11 + dy + ady;
      switch (kind) {
        case 'up':
          R(x, -27 + dy + ady, 2, 9, look.shirt); R(x, -29 + dy + ady, 2, 2, skin); break;
        case 'out':
          R(x + (side < 0 ? -3 : 1), -18 + dy + ady, 5, 2, look.shirt); R(x + (side < 0 ? -5 : 5), -18 + dy + ady, 2, 2, skin); break;
        case 'face':
          R(x, -22 + dy, 2, 4, look.shirt); R(x - 1, -24 + dy, 3, 3, skin); break;
        case 'chin':
          R(x, -21 + dy, 2, 3, look.shirt); R(x - 1, -22 + dy, 2, 2, skin); break;
        case 'type':
          R(x + (side < 0 ? 1 : -1), -16 + dy + ady, 4, 2, look.shirt); R(x + (side < 0 ? 2 : -1), -15 + dy + ady, 2, 2, skin); break;
        case 'cross':
          R(-5, -16 + dy, 10, 2, look.shirt); R(-5, -15 + dy, 2, 1, skin); R(3, -15 + dy, 2, 1, skin); break;
        case 'phone':
          R(x, -25 + dy, 2, 7, look.shirt); R(x - 1, -26 + dy, 2, 2, skin); R(x - 2, -28 + dy, 2, 4, '#111'); break;
        default:
          R(x, -19 + dy, 2, 8, look.shirt); R(x, hy, 2, 2, skin);
          if (side > 0) R(x, -19 + dy, 1, 8, shade);
      }
    };
    arm(-1, p.aL, p.aLdy);
    arm(1, p.aR, p.aRdy);

    // --- cabeza ---
    const hx = p.headDx, hdy = p.headDy;
    const hy0 = -27 + dy + hdy;
    R(-4 + hx, hy0, 8, 8, skin);
    if (back) {
      R(-5 + hx, hy0 + 4, 1, 2, skin); R(4 + hx, hy0 + 4, 1, 2, skin);
    } else {
      // cara
      if (p.eyes === 'closed') { R(-3 + hx, hy0 + 4, 2, 1, '#222'); R(0 + hx, hy0 + 4, 2, 1, '#222'); }
      else { R(-3 + hx, hy0 + 3, 1, 2, '#222'); R(0 + hx, hy0 + 3, 1, 2, '#222'); }
      R(-2 + hx, hy0 + 6, 3, 1, '#b5524a');
    }
    // pelo
    const hair = look.hair, hairDark = O.shade(hair, -0.25);
    const style = look.style;
    if (style === 'short' || style === 'wavy') {
      if (back) { R(-4 + hx, hy0 - 1, 8, 7, hair); R(2 + hx, hy0 - 1, 2, 7, hairDark); }
      else { R(-4 + hx, hy0 - 1, 8, 3, hair); R(-4 + hx, hy0 + 2, 1, 2, hair); R(3 + hx, hy0 + 2, 1, 2, hair); if (style === 'wavy') R(-5 + hx, hy0 + 1, 1, 3, hair); }
    } else if (style === 'curly') {
      R(-5 + hx, hy0 - 2, 10, 4, hair);
      if (back) R(-5 + hx, hy0 + 2, 10, 5, hair); else { R(-5 + hx, hy0 + 2, 1, 3, hair); R(4 + hx, hy0 + 2, 1, 3, hair); }
    } else if (style === 'mohawk') {
      R(-1 + hx, hy0 - 6, 2, 6, hair); R(-2 + hx, hy0 - 2, 4, 3, hair);
      if (back) R(-1 + hx, hy0 + 1, 2, 5, hair);
    } else if (style === 'bald') {
      R(-5 + hx, hy0 + 3, 1, 3, hair); R(4 + hx, hy0 + 3, 1, 3, hair);
      if (back) R(-4 + hx, hy0 + 4, 8, 2, hair);
      R(-2 + hx, hy0, 3, 1, '#ffffff44');
    } else if (style === 'afro') {
      R(-6 + hx, hy0 - 4, 12, 7, hair);
      if (back) R(-6 + hx, hy0 + 3, 12, 4, hair); else { R(-6 + hx, hy0 + 3, 2, 3, hair); R(4 + hx, hy0 + 3, 2, 3, hair); }
    }

    // --- accesorios de cabeza ---
    if (acc.glasses) {
      if (back) R(-4 + hx, hy0 + 3, 8, 1, '#222');
      else { R(-4 + hx, hy0 + 2, 4, 3, '#222'); R(0 + hx, hy0 + 2, 4, 3, '#222'); R(-3 + hx, hy0 + 3, 2, 1, '#bfe3f5'); R(1 + hx, hy0 + 3, 2, 1, '#bfe3f5'); }
    }
    if (acc.cap) {
      const cc = acc.cap, cd = O.shade(cc, -0.3);
      R(-5 + hx, hy0 - 3, 10, 4, cc);
      if (!back) R(-5 + hx, hy0 + 1, 7, 1, cd); else R(-5 + hx, hy0 + 1, 10, 1, cd);
    }
    if (acc.guardcap) {
      R(-5 + hx, hy0 - 3, 10, 4, '#1f3a63'); R(-5 + hx, hy0 + 1, 10, 1, '#101e33');
      if (!back) R(-1 + hx, hy0 - 2, 2, 2, '#e8b84b');
    }
    if (acc.headset) {
      R(-5 + hx, hy0 - 2, 10, 1, '#222'); R(-5 + hx, hy0 - 1, 1, 6, '#222'); R(4 + hx, hy0 - 1, 1, 6, '#222');
      R(-6 + hx, hy0 + 3, 2, 3, '#444'); R(4 + hx, hy0 + 3, 2, 3, '#444');
      if (!back) R(-4 + hx, hy0 + 6, 3, 1, '#222');
    }
    if (acc.visor) { R(-5 + hx, hy0, 10, 1, '#2f7d46'); R(-5 + hx, hy0 + 1, 10, 1, 'rgba(47,125,70,0.45)'); }
    if (acc.headband) { R(-4 + hx, hy0 + 1, 8, 2, '#ffffff'); R(-4 + hx, hy0 + 2, 8, 1, '#d9d9d9'); }
    if (acc.nightcap) {
      R(-4 + hx, hy0 - 3, 8, 3, '#e85d75'); R(3 + hx, hy0 - 1, 3, 3, '#e85d75'); R(5 + hx, hy0 + 2, 2, 2, '#ffffff'); R(-4 + hx, hy0, 8, 1, '#ffffff');
    }

    // --- objeto en la mano ---
    if (s.prop) {
      const hxp = 5, hyp = -10 + dy;
      if (s.prop === 'mug') { R(hxp - 1, hyp - 3, 4, 3, '#f4f1ea'); R(hxp + 3, hyp - 2, 1, 1, '#f4f1ea'); R(hxp, hyp - 3, 2, 1, '#6b3f1d'); }
      else if (s.prop === 'ticket') { R(hxp - 1, hyp - 4, 5, 4, '#ffffff'); R(hxp - 1, hyp - 3, 5, 1, '#c1272d'); R(hxp, hyp - 1, 3, 1, '#9aa0a8'); }
      else if (s.prop === 'book') { R(hxp - 1, hyp - 4, 5, 4, '#2f5d8a'); R(hxp - 1, hyp - 1, 5, 1, '#f1e9cf'); }
      else if (s.prop === 'thermos') { R(hxp, hyp - 5, 3, 5, '#b9c2cc'); R(hxp, hyp - 5, 3, 1, '#e85d3f'); }
    }
    ctx.restore();
  };

  // Icono de silla de oficina (asiento + respaldo) — se dibuja en render, no aqui.
})(typeof window !== 'undefined' ? window : globalThis);
