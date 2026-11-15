/* Nueve Vidas · renderizado HD-2D.
 * Pixel art de alta densidad (sprites y terreno a 32 píxeles por casilla,
 * ampliados por un factor entero para que queden nítidos) combinado con
 * efectos en alta resolución: sombras proyectadas con la forma de cada sprite,
 * mapa de luz por nivel, resplandores, rayos de sol, partículas, desenfoque de
 * los bordes tipo maqueta y viñeta.
 *
 * El canvas incluye un margen decorativo alrededor del tablero (ver
 * js/terrain.js → MARGIN): ahí vive el escenario que no se juega y es lo que
 * se desenfoca.
 *
 * Orden de cada cuadro:
 *   terreno → agua → marcas de colocación → sombras → sprites (por profundidad)
 *   → proyectiles y efectos → luz (multiplicar) → brillos (sumar) → rayos y
 *   partículas → desenfoque → viñeta → barras de vida, textos y fantasma. */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});
  const TILE = TD.TILE;
  const ART = TD.ART;
  const S = ART / TILE;            // de coordenadas del juego a píxeles de arte
  const TAU = Math.PI * 2;
  const { clamp, hashStr } = TD.util;
  const { hash2, pack } = TD.px;
  const SPR = TD.sprites;

  const SHADOW_COLOR = pack(18, 14, 46);
  const QUALITY_KEY = 'nueveVidas.quality';

  /* Resplandores pre-dibujados (se pintan con mezcla aditiva). */
  const glowCache = new Map();
  function glow(rgb) {
    let cv = glowCache.get(rgb);
    if (cv) return cv;
    cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.35, `rgba(${rgb},0.45)`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    glowCache.set(rgb, cv);
    return cv;
  }
  function bboxOf(spr) { return spr.bbox || (spr.bbox = spr.px.bbox()); }

  class Renderer {
    constructor(canvas, game) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.game = game;
      this.map = game.map;
      this.themeName = TD.THEMES[game.level.theme] ? game.level.theme : 'jardin';
      this.theme = TD.THEMES[this.themeName];
      this.mood = this.theme.mood;
      this.seed = hashStr(game.level.id) % 100000;
      this.t = 0;
      this.terrain = TD.terrain.paint(this.map, this.themeName, this.seed);
      this.m = this.terrain.margin;
      this.ox = this.m.l; this.oy = this.m.t;           // dónde empieza el tablero dentro del canvas
      this.mw = this.map.cols * ART; this.mh = this.map.rows * ART;
      this.W = this.terrain.w; this.H = this.terrain.h; // tamaño total en píxeles de arte
      this.K = 2;
      this.quality = Renderer.loadQuality();
      this.autoLevel = 0;              // 0 = todo; 1 = sin desenfoque; 2 = además menos resolución y sin rayos
      this.frameMs = 16; this.slowFrames = 0;
      this.items = [];
      this.buildProps();
      this.initParticles();
      this.light = document.createElement('canvas');
      this.light.width = Math.ceil(this.W / 2); this.light.height = Math.ceil(this.H / 2);
      this.lctx = this.light.getContext('2d');
      this.blur = document.createElement('canvas');
      this.bctx = this.blur.getContext('2d');
      this.canBlur = typeof this.bctx.filter === 'string';
      this.setScale(2);
    }

    static loadQuality() {
      try { const q = localStorage.getItem(QUALITY_KEY); if (q === 'alto' || q === 'medio' || q === 'bajo') return q; } catch (e) { /* sin almacenamiento */ }
      return 'alto';
    }
    static saveQuality(q) { try { localStorage.setItem(QUALITY_KEY, q); } catch (e) { /* sin almacenamiento */ } }
    setQuality(q) { this.quality = q; this.autoLevel = 0; this.slowFrames = 0; this.frameMs = 16; if (this.lastBox) this.fit(this.lastBox[0], this.lastBox[1]); }

    /** Factor entero de ampliación: cada píxel de arte ocupa K×K píxeles del canvas. */
    setScale(K) {
      this.K = K;
      this.canvas.width = this.W * K;
      this.canvas.height = this.H * K;
      this.blur.width = this.canvas.width; this.blur.height = this.canvas.height;
      this.vignette = null; this.bandGrad = null;
    }
    resize() { if (this.lastBox) this.fit(this.lastBox[0], this.lastBox[1]); }

    /** Hace que el canvas quepa en una caja manteniendo la proporción y elige la ampliación. */
    fit(boxW, boxH) {
      this.lastBox = [boxW, boxH];
      const k = Math.min(boxW / this.W, boxH / this.H);
      const cssW = Math.floor(this.W * k), cssH = Math.floor(this.H * k);
      this.canvas.style.width = `${cssW}px`;
      this.canvas.style.height = `${cssH}px`;
      const dpr = globalThis.devicePixelRatio || 1;
      const want = (cssW * dpr) / this.W;
      const max = this.quality === 'bajo' || this.autoLevel >= 2 ? 2 : this.quality === 'medio' ? 3 : 4;
      const K = clamp(Math.ceil(want - 0.2), 2, max);
      if (K !== this.K) this.setScale(K);
      // Si el canvas tiene menos píxeles que la pantalla, que el navegador no lo suavice al ampliar.
      this.canvas.style.imageRendering = want / K > 1.2 ? 'pixelated' : 'auto';
    }

    /** Convierte coordenadas de pantalla en casilla y posición del juego. */
    pointFromEvent(evt) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (((evt.clientX - rect.left) / rect.width) * this.W - this.ox) / S;
      const y = (((evt.clientY - rect.top) / rect.height) * this.H - this.oy) / S;
      return { x, y, c: Math.floor(x / TILE), r: Math.floor(y / TILE) };
    }

    /* ---------------------------------------------------- escenario fijo */
    /** Sprite de escenario por nombre (árbol, góndola, tubería...). */
    sceneryProp(kind, sd, x, y) {
      const th = this.theme, lit = !!this.mood.lamps;
      switch (kind) {
        case 'tree': return { spr: SPR.get(`tree|${sd % 7}|${th.tree}`, () => SPR.tree(sd % 7, th.tree)), x, y };
        case 'bush': return { spr: SPR.get(`bush|${sd % 5}|${th.tree}`, () => SPR.bush(sd % 5, th.tree)), x, y, flip: sd % 2 === 0 };
        case 'rubble': return { spr: SPR.get(`rubble|${sd % 5}`, () => SPR.rubble(sd % 5)), x, y, flip: sd % 2 === 0 };
        case 'car': return { spr: SPR.get(`car|${sd % 6}`, () => SPR.car(sd % 6)), x, y, flip: sd % 2 === 0 };
        case 'shelf': return { spr: SPR.get(`shelf|${sd % 6}`, () => SPR.shelf(sd % 6)), x, y };
        case 'crate': return { spr: SPR.get(`crate|${sd % 5}`, () => SPR.crate(sd % 5)), x, y, flip: sd % 2 === 0 };
        case 'sacks': return { spr: SPR.get(`sacks|${sd % 5}`, () => SPR.sacks(sd % 5)), x, y, flip: sd % 2 === 0 };
        case 'pipe': return { spr: SPR.get('pipe', () => SPR.pipe()), x, y };
        case 'chimney': return { spr: SPR.get('chimney', () => SPR.chimney()), x, y, light: { dx: 0, dy: -34, r: 26, rgb: '255,170,90', a: 0.5 } };
        case 'antenna': { const a = SPR.get('antenna', () => SPR.antenna(1)); return { spr: a, x, y, light: { dx: a.lightX, dy: a.lightY, r: 22, rgb: '255,80,80', a: 0.9, blink: 1.3, beacon: true } }; }
        case 'lamp': {
          const l = SPR.get(`lamp|${sd % 2}|${lit ? 1 : 0}`, () => SPR.lamp(sd % 2 ? 1 : 2, lit));
          return { spr: l, x, y, light: lit ? { dx: l.lightX, dy: l.lightY + 30, r: 88, rgb: '255,214,150', a: 1, flicker: true, bulb: { dx: l.lightX, dy: l.lightY } } : null };
        }
        default: return null;
      }
    }

    buildProps() {
      const map = this.map, th = this.theme, props = [], lights = [];
      const cats = this.game.level.faction === 'gatos';
      const add = (p) => {
        if (!p) return;
        props.push(p);
        if (p.light) {
          const l = { ...p.light, x: p.x + p.light.dx, y: p.y + p.light.dy };
          if (p.light.bulb) l.bulb = { x: p.x + p.light.bulb.dx, y: p.y + p.light.bulb.dy };
          lights.push(l);
        }
      };
      for (let r = 0; r < map.rows; r++) for (let c = 0; c < map.cols; c++) {
        const ch = map.tiles[r][c];
        const x = c * ART + ART / 2, y = r * ART + ART / 2;
        const sd = this.seed + c * 31 + r * 57;
        const jx = Math.round((hash2(c, r, this.seed) - 0.5) * 6), jy = Math.round((hash2(r, c, this.seed + 1) - 0.5) * 4);
        if (ch === 'T') add(this.sceneryProp(th.block === 'pipe' ? 'pipe' : th.block === 'chimney' ? 'chimney' : 'tree', sd, x + (th.block === 'tree' ? jx : 0), y + 11 + (th.block === 'tree' ? jy : 1)));
        else if (ch === 'R') add(this.sceneryProp('rubble', sd, x + jx, y + 9));
        else if (ch === 'C') add(this.sceneryProp('car', sd, x, y + 10));
        else if (ch === 'L') add(this.sceneryProp(th.pole === 'antenna' ? 'antenna' : 'lamp', sd, x, y + 10));
        else if (ch === 'S') {
          const kind = cats ? 'burrow' : 'breach';
          props.push({ spr: SPR.get(`spawn|${kind}`, () => SPR.spawn(kind)), x, y: y + (cats ? 8 : 12), ground: cats });
          if (!cats) lights.push({ x, y: y + 2, r: 16, rgb: '255,210,90', a: 0.5, eyes: true });
        } else if (ch === 'E') {
          const kind = cats ? 'despensa' : 'granero';
          props.push({ spr: SPR.get(`exit|${kind}`, () => SPR.exit(kind, this.game.faction.color)), x, y: y + 13 });
          lights.push({ x, y: y + 4, r: 60, rgb: '255,200,130', a: this.mood.unitGlow ? 0.9 : 0.35 });
        }
      }
      this.sowMargin(add);
      this.props = props;
      this.staticLights = lights;
    }

    /** Siembra el margen decorativo con el escenario del tema. Lo de abajo queda en primer plano. */
    sowMargin(add) {
      const th = this.theme, m = this.m, T = this.terrain.types, w = this.W, h = this.H;
      const list = th.scenery || [];
      const total = list.reduce((s, [, wt]) => s + wt, 0);
      if (!total) return;
      const rnd = (i) => hash2(i, this.seed, 91);
      const pick = (v) => { let acc = 0; for (const [k, wt] of list) { acc += wt; if (v * total < acc) return k; } return list[0][0]; };
      const groundAt = (x, y) => { // en coordenadas del tablero
        const X = clamp(Math.round(x + m.l), 0, w - 1), Y = clamp(Math.round(y + m.t), 0, h - 1);
        const t = T[Y * w + X];
        return t === TD.terrain.G || t === TD.terrain.C;
      };
      const placed = [];
      const far = (x, y, d) => placed.every((p) => Math.abs(p.x - x) > d || Math.abs(p.y - y) > d * 0.6);
      const tall = new Set(['tree', 'shelf', 'pipe', 'chimney', 'antenna', 'lamp']);
      let n = 0;
      // franja de arriba: una hilera irregular
      for (let i = 0; i < 60; i++) {
        const x = -m.l + rnd(n++) * w, y = -m.t + 10 + rnd(n++) * (m.t - 14), kind = pick(rnd(n++));
        if (!groundAt(x, y) || !groundAt(x - 6, y) || !groundAt(x + 6, y) || !far(x, y, kind === 'shelf' ? 46 : 26)) continue;
        placed.push({ x, y }); add(this.sceneryProp(kind, Math.floor(rnd(n++) * 1000), Math.round(x), Math.round(y)));
      }
      // franjas laterales: solo cosas bajas
      for (let i = 0; i < 9; i++) {
        const left = rnd(n++) < 0.5, x = left ? -m.l + 3 + rnd(n++) * (m.l - 6) : this.mw + 3 + rnd(n++) * (m.r - 6), y = rnd(n++) * this.mh;
        let kind = pick(rnd(n++));
        if (tall.has(kind) || kind === 'car') kind = list.some(([k]) => k === 'bush') ? 'bush' : 'rubble';
        if (!groundAt(x, y) || !far(x, y, 48)) continue;
        placed.push({ x, y }); add(this.sceneryProp(kind, Math.floor(rnd(n++) * 1000), Math.round(x), Math.round(y)));
      }
      // primer plano: copas y siluetas que asoman por el borde inferior
      for (let i = 0; i < 26; i++) {
        const x = -m.l + rnd(n++) * w, kind = pick(rnd(n++));
        const big = tall.has(kind);
        const y = big ? this.mh + m.b + 24 + rnd(n++) * 10 : this.mh + 8 + rnd(n++) * (m.b - 6);
        if (!groundAt(x, this.mh + m.b - 2) || !groundAt(x - 8, this.mh + m.b - 2) || !groundAt(x + 8, this.mh + m.b - 2) || !far(x, y, big ? 44 : 28)) continue;
        if (kind === 'lamp' || kind === 'antenna' || kind === 'car') continue;
        placed.push({ x, y }); add(this.sceneryProp(kind, Math.floor(rnd(n++) * 1000), Math.round(x), Math.round(y)));
      }
    }

    initParticles() {
      const kind = this.mood.particles, list = [];
      const n = { pollen: 46, dust: 54, chaff: 40, fireflies: 26, mist: 14, rain: 120 }[kind] || 0;
      for (let i = 0; i < n; i++) {
        list.push({
          x: hash2(i, 1, this.seed) * this.W, y: hash2(i, 2, this.seed) * this.H,
          ph: hash2(i, 3, this.seed) * TAU, sp: 0.5 + hash2(i, 4, this.seed), r: 0.6 + hash2(i, 5, this.seed) * 1.2,
        });
      }
      this.particles = list;
      this.particleKind = kind;
    }

    /* --------------------------------------------------------- utilidades */
    /** Transformación a píxeles de arte del tablero. */
    artT(ctx) { const K = this.K; ctx.setTransform(K, 0, 0, K, this.ox * K, this.oy * K); }
    /** Transformación a coordenadas del juego (48 por casilla). */
    gameT(ctx) { const K = this.K; ctx.setTransform(K * S, 0, 0, K * S, this.ox * K, this.oy * K); }
    /** Dibuja un sprite con su origen en (ax, ay), en píxeles de arte del tablero, nítido y opcionalmente volteado. */
    blit(ctx, cv, spr, ax, ay, flip) {
      const K = this.K;
      ctx.setTransform(flip ? -K : K, 0, 0, K, (Math.round(ax) + this.ox) * K, (Math.round(ay) + this.oy) * K);
      ctx.drawImage(cv, -spr.ox, -spr.oy);
    }

    /* ------------------------------------------------------- cada cuadro */
    draw(dt, ui = {}) {
      const ctx = this.ctx, K = this.K, g = this.game, map = this.map, W = this.W, H = this.H;
      const t0 = globalThis.performance ? performance.now() : 0;
      this.t += dt;
      const t = this.t;
      const hi = this.quality !== 'bajo' && this.autoLevel < 2;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.terrain.canvas, 0, 0, W * K, H * K);
      this.drawWater(ctx, t);

      // Marcas en el suelo: casillas libres al colocar, alcance de la unidad elegida.
      this.gameT(ctx);
      if (ui.placing) {
        const pulse = 0.1 + 0.05 * Math.sin(t * 4);
        ctx.fillStyle = `rgba(255,255,255,${pulse})`;
        ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.2;
        for (let r = 0; r < map.rows; r++) for (let c = 0; c < map.cols; c++) {
          if (!map.isBuildable(c, r) || g.towerAt(c, r)) continue;
          ctx.beginPath(); ctx.roundRect(c * TILE + 4, r * TILE + 4, TILE - 8, TILE - 8, 7); ctx.fill(); ctx.stroke();
        }
      }
      const sel = ui.selected && g.towers.includes(ui.selected) ? ui.selected : null;
      if (sel) this.drawRange(ctx, sel.x, sel.y, sel.rangePx, '255,244,200', 0.5);
      else if (ui.hover && !ui.placing) {
        const tw = g.towerAt(ui.hover.c, ui.hover.r);
        if (tw) this.drawRange(ctx, tw.x, tw.y, tw.rangePx, '255,255,255', 0.3);
      }
      if (ui.placing && ui.hover) {
        const ok = g.canBuild(ui.placing, ui.hover.c, ui.hover.r);
        this.drawRange(ctx, (ui.hover.c + 0.5) * TILE, (ui.hover.r + 0.5) * TILE, ui.placing.levels[0].range * TILE, ok ? '150,240,150' : '250,110,110', 0.7);
      }

      // Lista de dibujables, de atrás hacia adelante.
      const items = this.items;
      items.length = 0;
      for (const p of this.props) items.push(p.ground ? { y: -1e6, prop: p } : { y: p.y, prop: p });
      for (const tw of g.towers) items.push({ y: tw.y * S + 9, tower: tw });
      for (const e of g.enemies) items.push({ y: e.y * S + 5, enemy: e });
      items.sort((a, b) => a.y - b.y);

      // Sombras proyectadas (suaves, en alta resolución).
      const sh = this.mood.shadow;
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = sh.a;
      for (const it of items) this.drawShadow(ctx, it, sh);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;

      // Sprites.
      for (const it of items) {
        if (it.prop) this.blit(ctx, it.prop.spr.cv, it.prop.spr, it.prop.x, it.prop.y, it.prop.flip);
        else if (it.tower) this.drawTower(ctx, it.tower, t, it.tower === sel);
        else this.drawEnemy(ctx, it.enemy, t);
      }
      for (const p of g.projectiles) this.drawProjectile(ctx, p);
      for (const fx of g.effects) this.drawEffect(ctx, fx);
      if (ui.placing && ui.hover) this.drawGhost(ctx, ui.placing, ui.hover, t);

      // Luz del nivel.
      this.applyLight(ctx, t);
      this.drawGlows(ctx, t, hi);
      if (hi && this.mood.shafts) this.drawShafts(ctx, t);
      this.drawParticles(ctx, dt, t);
      if (this.quality === 'alto' && this.autoLevel === 0 && this.canBlur) this.tiltShift(ctx);
      this.drawVignette(ctx);

      // Por encima de todo, nítido: barras de vida, nombres, textos.
      this.drawOverlay(ctx, t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

      // Si el equipo no da abasto, los efectos más caros se apagan solos, por etapas.
      if (t0 && dt > 0) {
        this.frameMs = this.frameMs * 0.9 + (performance.now() - t0) * 0.1;
        if (this.frameMs > 24) this.slowFrames++; else this.slowFrames = Math.max(0, this.slowFrames - 1);
        if (this.slowFrames > 90 && this.autoLevel < 2) {
          this.autoLevel++; this.slowFrames = 0; this.frameMs = 16;
          if (this.autoLevel === 2 && this.lastBox) this.fit(this.lastBox[0], this.lastBox[1]);
        }
      }
    }

    drawWater(ctx, t) {
      const wtr = this.theme.water;
      this.artT(ctx);
      for (const { c, r } of this.map.water) {
        const x0 = c * ART, y0 = r * ART;
        for (let i = 0; i < 5; i++) {
          const hsh = hash2(c * 7 + i, r * 13, this.seed);
          const ly = y0 + 7 + Math.floor(hash2(c + i * 3, r, this.seed + 2) * 22);
          const phase = (t * (5 + hsh * 5) + hsh * 40) % 38;
          const lx = x0 - 4 + Math.floor(phase);
          if (lx < x0 + 1 || lx > x0 + ART - 5) continue;
          if (this.map.tile(c, r - 1) !== '~' && r > 0 && ly < y0 + 9) continue;
          ctx.fillStyle = i % 2 ? wtr[3] : wtr[2];
          ctx.fillRect(lx, ly, 3 + (i % 2), 1);
          ctx.fillRect(lx + 1, ly + 1, 2, 1);
        }
      }
    }

    drawRange(ctx, x, y, r, rgb, a) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = `rgba(${rgb},${a * 0.14})`; ctx.fill();
      ctx.strokeStyle = `rgba(${rgb},${a})`; ctx.lineWidth = 1.6; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -this.t * 10; ctx.stroke(); ctx.setLineDash([]);
    }

    /** Sombra con la silueta del sprite, inclinada según la luz del nivel. */
    drawShadow(ctx, it, sh) {
      const K = this.K, ox = this.ox, oy = this.oy;
      let spr, ax, ay, flip = false;
      if (it.prop) {
        if (it.prop.ground) return;
        spr = it.prop.spr; ax = it.prop.x; ay = it.prop.y; flip = !!it.prop.flip;
      } else if (it.tower) {
        const tw = it.tower, st = this.towerSprites(tw, this.t);
        ax = Math.round(tw.x * S); ay = Math.round(tw.y * S) + 9;
        ctx.setTransform(K, 0, K * sh.c, K * sh.d, (ax + ox) * K, (ay + oy) * K);
        ctx.drawImage(SPR.mask(st.base, 'shadow', SHADOW_COLOR), -st.base.ox, -st.base.oy);
        // el cuerpo de la unidad arranca a la altura del asiento
        ax += st.base.seatX;
        ctx.setTransform(st.flip ? -K : K, 0, K * sh.c, K * sh.d, (ax + ox + sh.c * st.base.seatY) * K, (ay + oy + sh.d * st.base.seatY) * K);
        ctx.drawImage(SPR.mask(st.unit, 'shadow', SHADOW_COLOR), -st.unit.ox, -st.unit.oy);
        return;
      } else {
        const e = it.enemy;
        if (e.hidden && e.def.hide.style === 'shadow') return;
        const es = this.enemySprite(e);
        spr = es.spr; ax = Math.round(e.x * S); ay = Math.round(e.y * S) + 5; flip = es.flip;
      }
      ctx.setTransform(flip ? -K : K, 0, K * sh.c, K * sh.d, (ax + ox) * K, (ay + oy) * K);
      ctx.drawImage(SPR.mask(spr, 'shadow', SHADOW_COLOR), -spr.ox, -spr.oy);
    }

    /** Sprites de una unidad en este instante: asiento, animal y si va volteado. */
    towerSprites(tw, t) {
      const atk = tw.anim > 0.45;
      const sway = atk ? 1 : [0, 1, 0, -1][Math.floor(t * 1.5 + tw.seed) % 4];
      const blink = !atk && ((t * 0.6 + tw.seed * 1.7) % 3.9) < 0.14;
      const mouth = atk && tw.def.attack === 'pulse';
      const base = SPR.baseSprite(tw.def.base, tw.def.base === 'catapult' && atk ? 1 : 0);
      const unit = SPR.sitSprite(tw.def.look, { sway, blink, attack: atk, mouth });
      return { base, unit, flip: tw.facing < 0 && tw.def.base !== 'catapult' };
    }

    drawTower(ctx, tw, t, selected) {
      const ax = Math.round(tw.x * S), ay = Math.round(tw.y * S) + 9;
      const st = this.towerSprites(tw, t);
      if (selected) {
        this.artT(ctx);
        ctx.strokeStyle = `rgba(255,236,150,${0.7 + 0.3 * Math.sin(t * 5)})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(ax, ay - 1, 14, 6, 0, 0, TAU); ctx.stroke();
      }
      this.blit(ctx, st.base.cv, st.base, ax, ay, false);
      const lunge = tw.anim > 0.6 ? (tw.def.attack === 'melee' ? 2 : 1) * (tw.facing < 0 ? -1 : 1) : 0;
      this.blit(ctx, st.unit.cv, st.unit, ax + st.base.seatX + lunge, ay + st.base.seatY, st.flip);
      // Galones de mejora.
      this.artT(ctx);
      for (let i = 0; i < tw.level; i++) {
        const x = ax - (tw.level - 1) * 3 + i * 6 - 2, y = ay + 3;
        ctx.fillStyle = '#7a5a12'; ctx.fillRect(x - 1, y - 1, 6, 5);
        ctx.fillStyle = '#f1c74c'; ctx.fillRect(x, y, 4, 2); ctx.fillRect(x + 1, y + 2, 2, 1);
        ctx.fillStyle = '#fff3b0'; ctx.fillRect(x, y, 2, 1);
      }
    }

    /** Sprite de un enemigo en este instante (el cuadro de paso depende de lo que avanzó). */
    enemySprite(e) {
      if (Math.abs(e.dx) > 0.3) e._face = e.dx > 0 ? 1 : -1;
      const face = e._face || 1;
      if (e.hidden && e.def.hide.style === 'burrow') {
        const f = Math.floor(this.t * 8) % 2;
        return { spr: SPR.get(`mound|${f}`, () => SPR.mound(f)), flip: false, mound: true };
      }
      const frame = Math.floor((e.walked != null ? e.walked : e.dist) / (TILE * 0.2)) % 4;
      return { spr: SPR.walkSprite(e.look || e.def.look, frame), flip: face < 0 };
    }

    drawEnemy(ctx, e, t) {
      const ax = Math.round(e.x * S), ay = Math.round(e.y * S) + 5;
      const es = this.enemySprite(e);
      if (es.mound) { this.blit(ctx, es.spr.cv, es.spr, ax, ay, false); return; }
      if (e.hidden) {
        ctx.globalAlpha = 0.3 + 0.08 * Math.sin(t * 6 + e.seed);
        this.blit(ctx, SPR.mask(es.spr, 'shade', pack(20, 14, 40)), es.spr, ax, ay, es.flip);
        ctx.globalAlpha = 1;
        return;
      }
      this.blit(ctx, es.spr.cv, es.spr, ax, ay, es.flip);
      if (e.isSlowed) { ctx.globalAlpha = 0.32; this.blit(ctx, SPR.mask(es.spr, 'slow', pack(120, 190, 255)), es.spr, ax, ay, es.flip); ctx.globalAlpha = 1; }
      if (e.hitFlash > 0) { ctx.globalAlpha = Math.min(1, e.hitFlash / 0.1) * 0.8; this.blit(ctx, SPR.mask(es.spr, 'white', pack(255, 255, 255)), es.spr, ax, ay, es.flip); ctx.globalAlpha = 1; }
    }

    drawProjectile(ctx, p) {
      const K = this.K;
      const spr = SPR.projSprite(p.kind);
      let ax = p.x * S, ay = p.y * S;
      if (p.lob) {
        const hgt = clamp(p.total * S * 0.34, 12, 44) * Math.sin(p.progress * Math.PI);
        this.artT(ctx);
        ctx.fillStyle = 'rgba(18,14,46,0.28)';
        ctx.beginPath(); ctx.ellipse(ax, ay + 3, 3.5, 1.6, 0, 0, TAU); ctx.fill();
        ay -= hgt;
      }
      if (p.kind === 'dardo' || p.lob) {
        const ang = p.kind === 'dardo' ? Math.atan2(p.ty - p.y, p.tx - p.x) : this.t * 9;
        ctx.setTransform(K, 0, 0, K, (Math.round(ax) + this.ox) * K, (Math.round(ay) + this.oy) * K);
        ctx.rotate(ang);
        ctx.drawImage(spr.cv, -spr.ox, -spr.oy);
      } else this.blit(ctx, spr.cv, spr, ax, ay, false);
    }

    /** Efectos de partículas en píxeles gruesos (los anillos y textos van en otra capa). */
    drawEffect(ctx, fx) {
      const p = clamp(fx.age / fx.life, 0, 1);
      const ax = fx.x * S, ay = fx.y * S;
      this.artT(ctx);
      const dot = (x, y, s, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(ax + x - s / 2), Math.round(ay + y - s / 2), s, s); };
      switch (fx.type) {
        case 'puff': {
          const r = (fx.radius || 10) * S;
          ctx.globalAlpha = 1 - p * p;
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * TAU + 0.4, d = r * (0.4 + p * 1.5);
            dot(Math.cos(a) * d, Math.sin(a) * d * 0.7 - p * 8, p < 0.5 ? 3 : 2, fx.boss ? '#f1c74c' : i % 2 ? '#f4efe2' : '#cfc7b6');
          }
          break;
        }
        case 'claw':
          ctx.globalAlpha = 1 - p;
          for (let i = -1; i <= 1; i++) for (let k = 0; k < 7; k++) dot(-6 + k * 2 + i * 1, -6 + k * 2 + i * 4 + p * 3, 2, k % 3 === 0 ? '#ffe9b0' : '#ffffff');
          break;
        case 'splash': {
          const r = fx.radius * S, col = fx.kind === 'nuez' ? ['#b98a52', '#e2c08a'] : ['#c9dc7a', '#f2f7c2'];
          ctx.globalAlpha = (1 - p) * 0.45;
          ctx.fillStyle = col[0]; ctx.beginPath(); ctx.ellipse(ax, ay, r * (0.4 + 0.6 * p), r * (0.4 + 0.6 * p) * 0.8, 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1 - p;
          for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + 0.2; dot(Math.cos(a) * r * p * 1.1, Math.sin(a) * r * p * 0.9 - Math.sin(p * Math.PI) * 9, 2, col[i % 2]); }
          break;
        }
        case 'hit':
          ctx.globalAlpha = 1 - p;
          for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.6; dot(Math.cos(a) * (2 + p * 6), Math.sin(a) * (2 + p * 6), 2, '#ffffff'); }
          dot(0, 0, 2, '#fff3b0');
          break;
        case 'leak':
          ctx.globalAlpha = (1 - p) * 0.6;
          ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.arc(ax, ay, 7 + 18 * p, 0, TAU); ctx.fill();
          break;
        case 'dirt':
          ctx.globalAlpha = 1 - p;
          for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; dot(Math.cos(a) * 9 * p, Math.sin(a) * 4 * p - 12 * p + 12 * p * p, 2, i % 2 ? '#8a6a46' : '#b08a5e'); }
          break;
        case 'smoke':
          ctx.globalAlpha = (1 - p) * 0.7;
          for (let i = 0; i < 5; i++) dot((i - 2) * 4 * (1 + p), -p * 12 - (i % 2) * 3, 3, '#2a2238');
          break;
        case 'coins':
          ctx.globalAlpha = 1 - p * p;
          for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.5; dot(Math.cos(a) * 10 * p, Math.sin(a) * 5 * p - Math.sin(p * Math.PI) * 14, 2, i % 2 ? '#f1c74c' : '#fff3b0'); }
          break;
        default: break;
      }
      ctx.globalAlpha = 1;
    }

    drawGhost(ctx, def, hover, t) {
      const ax = Math.round((hover.c + 0.5) * ART), ay = Math.round((hover.r + 0.5) * ART) + 9;
      const base = SPR.baseSprite(def.base, 0), unit = SPR.sitSprite(def.look, { sway: [0, 1, 0, -1][Math.floor(t * 1.5) % 4] });
      ctx.globalAlpha = this.game.canBuild(def, hover.c, hover.r) ? 0.75 : 0.4;
      this.blit(ctx, base.cv, base, ax, ay, false);
      this.blit(ctx, unit.cv, unit, ax + base.seatX, ay + base.seatY, false);
      ctx.globalAlpha = 1;
    }

    /* ---------------------------------------------------------------- luz */
    /** Luces de este cuadro, en píxeles de arte del tablero. */
    collectLights(t) {
      const g = this.game, out = [];
      for (const l of this.staticLights) {
        let a = l.a;
        if (l.blink) a *= (Math.sin(t * l.blink * TAU) > 0.2 ? 1 : 0.15);
        if (l.flicker) a *= 0.9 + 0.1 * Math.sin(t * 9 + l.x);
        out.push({ x: l.x, y: l.y, r: l.r, rgb: l.rgb, a });
      }
      if (this.mood.unitGlow) for (const tw of g.towers) out.push({ x: tw.x * S, y: tw.y * S - 6, r: 46, rgb: '255,214,160', a: 0.75 });
      for (const tw of g.towers) if (tw.anim > 0.2) out.push({ x: tw.x * S, y: tw.y * S - 8, r: 30, rgb: tw.def.attack === 'pulse' ? '190,220,255' : '255,236,190', a: tw.anim * 0.6 });
      for (const p of g.projectiles) out.push({ x: p.x * S, y: p.y * S, r: 14, rgb: '255,236,190', a: 0.5 });
      for (const fx of g.effects) {
        const p = 1 - fx.age / fx.life;
        if (fx.type === 'splash') out.push({ x: fx.x * S, y: fx.y * S, r: fx.radius * S * 1.4, rgb: '255,244,190', a: p * 0.6 });
        else if (fx.type === 'ring') out.push({ x: fx.x * S, y: fx.y * S, r: fx.radius * S * 0.9, rgb: '200,225,255', a: p * 0.35 });
        else if (fx.type === 'leak') out.push({ x: fx.x * S, y: fx.y * S, r: 40, rgb: '255,90,90', a: p * 0.7 });
      }
      for (const e of g.enemies) {
        if (e.hidden) continue;
        if (e.def.boss) out.push({ x: e.x * S, y: e.y * S - 6, r: 44, rgb: '255,200,90', a: 0.55 + 0.15 * Math.sin(t * 4) });
        else if (e.carrying) out.push({ x: e.x * S, y: e.y * S - 6, r: 26, rgb: '255,220,110', a: 0.6 });
        else if (e.echo) out.push({ x: e.x * S, y: e.y * S - 6, r: 30, rgb: '170,210,255', a: 0.55 });
      }
      return out;
    }

    applyLight(ctx, t) {
      const lc = this.lctx, lw = this.light.width, lh = this.light.height, m = this.mood;
      const lights = this.collectLights(t);
      lc.globalCompositeOperation = 'source-over'; lc.globalAlpha = 1;
      lc.fillStyle = `rgb(${m.ambient[0]},${m.ambient[1]},${m.ambient[2]})`;
      lc.fillRect(0, 0, lw, lh);
      lc.globalCompositeOperation = 'lighter';
      // luz direccional: llega desde arriba a la izquierda y se va apagando
      const sun = m.sun, sg = lc.createLinearGradient(0, 0, lw * 0.9, lh);
      sg.addColorStop(0, `rgba(${sun[0]},${sun[1]},${sun[2]},${sun[3]})`); sg.addColorStop(1, `rgba(${sun[0]},${sun[1]},${sun[2]},0)`);
      lc.fillStyle = sg; lc.fillRect(0, 0, lw, lh);
      for (const l of lights) {
        lc.globalAlpha = Math.min(1, l.a);
        const r = l.r / 2;
        lc.drawImage(glow(l.rgb), (l.x + this.ox) / 2 - r, (l.y + this.oy) / 2 - r, r * 2, r * 2);
      }
      lc.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(this.light, 0, 0, this.W * this.K, this.H * this.K);
      ctx.globalCompositeOperation = 'source-over';
    }

    /** Resplandores: bombillas, ojos en la brecha, proyectiles, ondas. */
    drawGlows(ctx, t, hi) {
      const g = this.game;
      this.artT(ctx);
      ctx.globalCompositeOperation = 'lighter';
      ctx.imageSmoothingEnabled = true;
      for (const l of this.staticLights) {
        if (l.bulb) { ctx.globalAlpha = 0.85 + 0.1 * Math.sin(t * 9 + l.x); ctx.drawImage(glow(l.rgb), l.bulb.x - 13, l.bulb.y - 13, 26, 26); }
        if (l.beacon) { ctx.globalAlpha = Math.sin(t * l.blink * TAU) > 0.2 ? 0.9 : 0.1; ctx.drawImage(glow(l.rgb), l.x - 9, l.y - 9, 18, 18); }
        if (l.eyes) { ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 2 + l.x); ctx.drawImage(glow(l.rgb), l.x - 8, l.y - 8, 16, 14); }
      }
      if (hi) {
        for (const p of g.projectiles) { ctx.globalAlpha = 0.5; ctx.drawImage(glow(p.kind === 'dardo' ? '255,255,255' : '255,226,160'), p.x * S - 7, p.y * S - 7, 14, 14); }
        for (const e of g.enemies) {
          if (e.hidden) continue;
          if (e.def.boss) { ctx.globalAlpha = 0.28 + 0.1 * Math.sin(t * 4); ctx.drawImage(glow('255,200,90'), e.x * S - 30, e.y * S - 36, 60, 60); }
          else if (e.carrying) { ctx.globalAlpha = 0.4 + 0.15 * Math.sin(t * 8); ctx.drawImage(glow('255,220,110'), e.x * S - 16, e.y * S - 22, 32, 32); }
          else if (e.echo) { ctx.globalAlpha = 0.3 + 0.1 * Math.sin(t * 3); ctx.drawImage(glow('170,210,255'), e.x * S - 20, e.y * S - 26, 40, 40); }
        }
      }
      // ondas de maullido o silbido: un anillo de luz que se abre
      for (const fx of g.effects) {
        if (fx.type !== 'ring') continue;
        const p = clamp(fx.age / fx.life, 0, 1), r = Math.max(1, fx.radius * S * (0.15 + 0.85 * p));
        ctx.globalAlpha = (1 - p) * 0.9;
        ctx.strokeStyle = fx.color || 'rgba(200,225,255,0.9)';
        ctx.lineWidth = 2.2 - p;
        ctx.beginPath(); ctx.ellipse(fx.x * S, fx.y * S, r, r * 0.86, 0, 0, TAU); ctx.stroke();
        ctx.lineWidth = 0.8; ctx.globalAlpha = (1 - p) * 0.5;
        ctx.beginPath(); ctx.ellipse(fx.x * S, fx.y * S, r * 0.72, r * 0.62, 0, 0, TAU); ctx.stroke();
      }
      // destellos sobre el agua
      if (hi) for (const { c, r } of this.map.water) {
        for (let i = 0; i < 2; i++) {
          const hsh = hash2(c * 5 + i, r * 3, this.seed + 9), tw = Math.sin(t * (1.5 + hsh * 2) + hsh * 20);
          if (tw < 0.82) continue;
          ctx.globalAlpha = (tw - 0.82) * 4;
          ctx.drawImage(glow('255,255,255'), c * ART + 4 + hsh * 22 - 4, r * ART + 8 + hash2(c, r * 7 + i, this.seed) * 18 - 4, 8, 8);
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    drawShafts(ctx, t) {
      const K = this.K, sf = this.mood.shafts, W = this.W, H = this.H;
      ctx.globalCompositeOperation = 'lighter';
      const slant = H * 0.75;
      ctx.setTransform(K, 0, K * (slant / H), K, 0, 0);
      for (let i = 0; i < sf.n; i++) {
        const hsh = hash2(i, 9, this.seed);
        const bw = 26 + hsh * 46;
        const x0 = ((i + 0.3 + hsh * 0.5) / sf.n) * (W + slant) - slant + Math.sin(t * 0.13 + i * 2.1) * 14;
        const a = sf.a * (0.6 + 0.4 * Math.sin(t * 0.35 + i * 1.7));
        const grad = ctx.createLinearGradient(x0, 0, x0 + bw, 0);
        grad.addColorStop(0, `rgba(${sf.rgb},0)`); grad.addColorStop(0.5, `rgba(${sf.rgb},${a})`); grad.addColorStop(1, `rgba(${sf.rgb},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x0, 0, bw, H);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    drawParticles(ctx, dt, t) {
      const kind = this.particleKind;
      if (!kind || this.quality === 'bajo') return;
      const K = this.K, W = this.W, H = this.H;
      ctx.setTransform(K, 0, 0, K, 0, 0);
      ctx.imageSmoothingEnabled = true;
      if (kind === 'rain') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(170,195,255,0.3)'; ctx.lineWidth = 0.6;
        ctx.beginPath();
        for (const p of this.particles) {
          p.y += dt * (240 + p.sp * 90); p.x -= dt * 60;
          if (p.y > H) { p.y -= H + 10; p.x = hash2(Math.floor(t * 60), Math.floor(p.ph * 100), this.seed) * (W + 60); }
          ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 2.2, p.y + 8);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        return;
      }
      ctx.globalCompositeOperation = 'lighter';
      const rgb = { pollen: '255,246,200', dust: '255,236,200', chaff: '255,232,160', fireflies: '200,255,120', mist: '170,220,210' }[kind];
      const gl = glow(rgb);
      for (const p of this.particles) {
        let a, r;
        if (kind === 'fireflies') {
          p.x += Math.sin(t * 0.7 * p.sp + p.ph) * dt * 9; p.y += Math.cos(t * 0.5 * p.sp + p.ph * 2) * dt * 7;
          a = Math.max(0, Math.sin(t * 1.6 * p.sp + p.ph)) * 0.9; r = 3 + p.r;
        } else if (kind === 'mist') {
          p.x += dt * 4 * p.sp; a = 0.07 + 0.04 * Math.sin(t * 0.4 + p.ph); r = 34 + p.r * 16;
        } else if (kind === 'chaff') {
          p.x += dt * (14 + p.sp * 12); p.y += Math.sin(t * 1.4 + p.ph) * dt * 5; a = 0.35 + 0.3 * Math.sin(t * 2 + p.ph); r = 1.6 + p.r;
        } else {
          p.x += Math.sin(t * 0.3 + p.ph) * dt * 4 + dt * 2 * p.sp; p.y += Math.cos(t * 0.24 + p.ph) * dt * 3 - dt * 1.2;
          a = 0.3 + 0.3 * Math.sin(t * 1.1 * p.sp + p.ph); r = 1.6 + p.r;
        }
        if (p.x > W + 20) p.x -= W + 40; else if (p.x < -20) p.x += W + 40;
        if (p.y > H + 20) p.y -= H + 40; else if (p.y < -20) p.y += H + 40;
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        ctx.drawImage(gl, p.x - r, p.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    /** Desenfoque del margen de arriba y de abajo: da el aire de maqueta del HD-2D sin tapar el tablero. */
    tiltShift(ctx) {
      const b = this.bctx, w = this.canvas.width, h = this.canvas.height;
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.globalAlpha = 1;
      b.globalCompositeOperation = 'copy';
      b.filter = `blur(${(this.K * 1.4).toFixed(1)}px)`;
      b.drawImage(this.canvas, 0, 0);
      b.filter = 'none';
      b.globalCompositeOperation = 'destination-in';
      if (!this.bandGrad) {
        const top = (this.m.t + 10) / this.H, bot = (this.H - this.m.b - 8) / this.H;
        const gr = b.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(top * 0.55, 'rgba(0,0,0,0.9)'); gr.addColorStop(top, 'rgba(0,0,0,0)');
        gr.addColorStop(bot, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
        this.bandGrad = gr;
      }
      b.fillStyle = this.bandGrad; b.fillRect(0, 0, w, h);
      b.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.blur, 0, 0);
    }

    drawVignette(ctx) {
      const w = this.canvas.width, h = this.canvas.height, m = this.mood;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (!this.vignette) {
        const v = document.createElement('canvas'); v.width = w; v.height = h;
        const c = v.getContext('2d');
        // bruma de distancia arriba, y esquinas oscurecidas
        const hz = c.createLinearGradient(0, 0, 0, h * 0.34);
        hz.addColorStop(0, `rgba(${m.haze},0.3)`); hz.addColorStop(1, `rgba(${m.haze},0)`);
        c.fillStyle = hz; c.fillRect(0, 0, w, h * 0.34);
        const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.78);
        g.addColorStop(0, 'rgba(10,8,30,0)'); g.addColorStop(1, `rgba(10,8,30,${m.vignette})`);
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        this.vignette = v;
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.vignette, 0, 0);
    }

    /* -------------------------------------------------- capa de interfaz */
    drawOverlay(ctx) {
      const K = this.K, g = this.game, ox = this.ox, oy = this.oy;
      this.artT(ctx);
      ctx.imageSmoothingEnabled = false;
      const tops = new Map();
      // Barras de vida.
      for (const e of g.enemies) {
        const es = this.enemySprite(e), b = bboxOf(es.spr);
        const top = Math.round(e.y * S) + 5 - (es.spr.oy - b.y) - 5;
        tops.set(e, top);
        if (e.hp >= e.maxHp && !e.def.boss && !e.label) continue;
        if (e.hidden && e.def.hide.style === 'shadow') continue;
        const w = Math.round(clamp(e.radiusPx * S * 2.4, 12, 36)), x = Math.round(e.x * S - w / 2);
        const f = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = '#17131c'; ctx.fillRect(x - 1, top - 1, w + 2, 4);
        ctx.fillStyle = '#4a2030'; ctx.fillRect(x, top, w, 2);
        ctx.fillStyle = f > 0.5 ? '#7fdc6a' : f > 0.25 ? '#f1c74c' : '#e5484d'; ctx.fillRect(x, top, Math.round(w * f), 2);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, top, Math.round(w * f), 1);
      }
      // Nombres (jefes y ecos) y textos flotantes, en alta resolución.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const font = (px, weight) => `${weight} ${Math.max(9, Math.round(px * K))}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      for (const e of g.enemies) {
        const label = e.label || (e.def.boss ? e.def.name : null);
        if (!label || e.hidden) continue;
        const x = (e.x * S + ox) * K, y = (tops.get(e) - 6 + oy) * K;
        ctx.font = font(4.6, 700);
        ctx.lineWidth = K * 1.1; ctx.strokeStyle = 'rgba(15,10,25,0.85)'; ctx.strokeText(label, x, y);
        ctx.fillStyle = e.echo ? '#cfe6ff' : '#ffd772'; ctx.fillText(label, x, y);
      }
      for (const fx of g.effects) {
        if (fx.type !== 'text') continue;
        const p = clamp(fx.age / fx.life, 0, 1);
        const x = (fx.x * S + ox) * K, y = (fx.y * S - p * 16 + oy) * K;
        ctx.globalAlpha = 1 - p * p;
        ctx.font = font(fx.big ? 6.4 : 5.2, 800);
        ctx.lineWidth = K * 1.2; ctx.strokeStyle = 'rgba(15,10,25,0.85)'; ctx.strokeText(fx.text, x, y);
        ctx.fillStyle = fx.color || '#fff'; ctx.fillText(fx.text, x, y);
      }
      ctx.globalAlpha = 1;
    }
  }

  TD.Renderer = Renderer;
})();
