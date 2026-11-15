/* Nueve Vidas · retratos para la interfaz.
 * Dibuja los sprites (js/sprites.js) dentro de los canvas pequeños de la
 * interfaz: tarjetas de la tienda, avatar del personaje, vista previa de la
 * oleada. Siempre con ampliación entera para que el pixel art quede nítido. */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});
  const SPR = TD.sprites;

  function bboxOf(spr) { return spr.bbox || (spr.bbox = spr.px.bbox()); }

  /** Dibuja varias piezas (sprites con desplazamiento) centradas y con la mayor ampliación entera que quepa. */
  function compose(canvas, parts, box) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of parts) {
      const b = bboxOf(p.spr), l = p.x + b.x - p.spr.ox, t = p.y + b.y - p.spr.oy;
      x0 = Math.min(x0, l); y0 = Math.min(y0, t); x1 = Math.max(x1, l + b.w); y1 = Math.max(y1, t + b.h);
    }
    if (box) { x0 = box.x; x1 = box.x + box.w; y1 = y0 + box.h; }
    const bw = x1 - x0, bh = y1 - y0;
    const k = Math.max(1, Math.floor(Math.min(canvas.width / (bw + 2), canvas.height / (bh + 2))));
    const ox = Math.floor((canvas.width - bw * k) / 2), oy = Math.floor((canvas.height - bh * k) / 2);
    for (const p of parts) {
      ctx.drawImage(p.spr.cv, 0, 0, p.spr.w, p.spr.h, ox + (p.x - p.spr.ox - x0) * k, oy + (p.y - p.spr.oy - y0) * k, p.spr.w * k, p.spr.h * k);
    }
  }

  /** Especie sentada. base: asiento opcional; bust: solo la cabeza (avatares redondos). */
  function paintPortrait(canvas, look, { base = null, bust = false } = {}) {
    const unit = SPR.sitSprite(look, {});
    const parts = [];
    let sx = 0, sy = 0;
    if (base) { const b = SPR.baseSprite(base, 0); parts.push({ spr: b, x: 0, y: 0 }); sx = b.seatX; sy = b.seatY; }
    parts.push({ spr: unit, x: sx, y: sy });
    compose(canvas, parts, bust ? { x: -12, w: 24, h: 24 } : null);
  }

  /** Especie caminando de perfil (vista previa de enemigos). */
  function paintWalker(canvas, look) {
    compose(canvas, [{ spr: SPR.walkSprite(look, 0), x: 0, y: 0 }], null);
  }

  TD.art = { SPECIES: SPR.SPECIES, paintPortrait, paintWalker };
})();
