/* Nueve Vidas · terreno.
 * Pinta el suelo de cada nivel píxel a píxel, a resolución de arte (32 píxeles
 * por casilla): bordes orgánicos entre pasto y camino, caminos hundidos con su
 * pared y su sombra, texturas por tema y detalles (grietas, flores, líneas de
 * carretera). Alrededor del mapa jugable pinta un margen decorativo: el mundo
 * sigue más allá del tablero. También define los temas: paleta, tipo de suelo,
 * escenario del margen y ambiente de luz. */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});
  const { Px, hex, tone, mix, hash2, vnoise } = TD.px;

  const ART = 32; // píxeles de arte por casilla
  TD.ART = ART;
  /** Margen decorativo alrededor del mapa, en píxeles de arte. */
  const MARGIN = { l: 16, t: 44, r: 16, b: 24 };

  /* ---------------------------------------------------------------- temas
   * ground: textura de las casillas construibles ('.'); floor: textura del camino.
   * scenery: qué se siembra en el margen decorativo, con su peso.
   * mood:   ambiente de luz del nivel (lo interpreta js/render.js).
   *   ambient  color por el que se multiplica toda la escena (blanco = pleno día)
   *   sun      color e intensidad de la luz direccional (desde arriba a la izquierda)
   *   shadow   { c, d, a }: inclinación, largo y opacidad de las sombras proyectadas
   *   shafts   rayos de luz en diagonal; particles: polen, polvo, luciérnagas...
   *   unitGlow las unidades llevan una lucecita (niveles oscuros)
   *   lamps    los faroles están encendidos */
  const THEMES = {
    jardin: {
      ground: 'grass', floor: 'dirt', wob: 2.6, tree: 'verde', block: 'tree', pole: 'lamp',
      scenery: [['tree', 7], ['bush', 4], ['rubble', 1]],
      grass: ['#3d7a3b', '#4f9343', '#63a94f', '#7fbf5e'], flowers: ['#fff6da', '#f7c4d8', '#f9d868'],
      path: ['#8a6a44', '#a98458', '#c29f6e', '#d7b988'], wall: '#5a4530',
      concrete: ['#7b8187', '#93989d', '#aab0b3', '#c1c6c8'],
      water: ['#2a5f96', '#3a7dbb', '#57a0dc', '#b4e2f8'],
      mood: { ambient: [238, 232, 222], sun: [255, 240, 205, 0.5], shadow: { c: -0.8, d: -0.38, a: 0.3 }, shafts: { rgb: '255,244,200', a: 0.11, n: 4 }, particles: 'pollen', haze: '205,232,250', vignette: 0.3 },
    },
    autopista: {
      ground: 'grass', floor: 'asphalt', wob: 1.3, tree: 'oliva', block: 'tree', pole: 'lamp',
      scenery: [['tree', 5], ['bush', 3], ['car', 2], ['rubble', 2], ['lamp', 1]],
      grass: ['#5a7534', '#6f8c3e', '#87a44b', '#a2bb5e'], flowers: ['#fff6da', '#f9d868'],
      path: ['#2c2f36', '#393d45', '#474c55', '#5a606a'], wall: '#8f949a', curb: true, lane: '#c8a93c',
      concrete: ['#7f8388', '#979b9f', '#aeb2b5', '#c5c8ca'],
      water: ['#2a5f96', '#3a7dbb', '#57a0dc', '#b4e2f8'],
      mood: { ambient: [248, 216, 178], sun: [255, 196, 120, 0.6], shadow: { c: -1.25, d: -0.42, a: 0.34 }, shafts: { rgb: '255,206,140', a: 0.13, n: 3 }, particles: 'dust', haze: '255,214,170', vignette: 0.36 },
    },
    despensa: {
      ground: 'overgrown', floor: 'tiles', wob: 0.9, tree: 'interior', block: 'tree', pole: 'lamp',
      scenery: [['shelf', 8], ['rubble', 2], ['bush', 2]],
      grass: ['#38573c', '#476b46', '#587f52', '#6f9a62'], flowers: ['#fff6da'],
      path: ['#8f8777', '#a9a08d', '#c0b7a2', '#d5cdb8'], wall: '#5d584d',
      concrete: ['#77766f', '#8f8d85', '#a6a49b', '#bdbbb2'],
      water: ['#27587f', '#3572a3', '#4f93c7', '#a9d8ee'],
      mood: { ambient: [178, 188, 214], sun: [255, 246, 214, 0.35], shadow: { c: -0.6, d: -0.34, a: 0.3 }, shafts: { rgb: '255,248,214', a: 0.2, n: 5 }, particles: 'dust', haze: '190,205,235', vignette: 0.45 },
    },
    campo: {
      ground: 'wheat', floor: 'dirt', wob: 2.6, tree: 'dorado', block: 'tree', pole: 'lamp',
      scenery: [['tree', 5], ['bush', 4], ['sacks', 1]],
      grass: ['#a17d2c', '#c19a3a', '#d9b44c', '#efd06b'], flowers: ['#e2574c', '#fff6da'],
      path: ['#77573a', '#93704a', '#b08b5e', '#c8a678'], wall: '#52391f',
      concrete: ['#85837a', '#9d9b91', '#b4b2a8', '#cac8be'],
      water: ['#2a5f96', '#3a7dbb', '#57a0dc', '#b4e2f8'],
      mood: { ambient: [252, 240, 208], sun: [255, 232, 170, 0.55], shadow: { c: -0.55, d: -0.3, a: 0.3 }, shafts: { rgb: '255,236,170', a: 0.1, n: 3 }, particles: 'chaff', haze: '255,240,200', vignette: 0.3 },
    },
    alcantarilla: {
      ground: 'stone', floor: 'bricks', wob: 0, tree: 'interior', block: 'pipe', pole: 'lamp',
      scenery: [['pipe', 5], ['rubble', 2]],
      grass: ['#3a4747', '#465655', '#546664', '#667b77'],
      path: ['#4b4139', '#5f5247', '#756558', '#8c7a6a'], wall: '#262b2c',
      concrete: ['#4a5456', '#5a6567', '#6b7779', '#7f8c8d'],
      water: ['#17463c', '#225c4d', '#327661', '#7fc0a8'],
      mood: { ambient: [70, 92, 110], sun: [120, 170, 190, 0.18], shadow: { c: -0.5, d: -0.3, a: 0.34 }, shafts: null, particles: 'mist', haze: '60,110,110', vignette: 0.55, unitGlow: true, lamps: true },
    },
    tejado: {
      ground: 'roof', floor: 'ledge', wob: 0.6, tree: 'noche', block: 'chimney', pole: 'antenna',
      scenery: [['chimney', 4], ['antenna', 3], ['rubble', 1]],
      grass: ['#763a30', '#92493a', '#ad5d47', '#c7775a'],
      path: ['#555a67', '#6b707d', '#838896', '#9da2b0'], wall: '#343744',
      concrete: ['#6f6d75', '#87858d', '#9e9ca4', '#b6b4bb'],
      water: ['#2a4f86', '#3a6aa8', '#5488c8', '#a9c9ee'],
      mood: { ambient: [132, 122, 176], sun: [255, 170, 120, 0.4], shadow: { c: -1.5, d: -0.4, a: 0.36 }, shafts: { rgb: '255,170,120', a: 0.1, n: 3 }, particles: 'fireflies', haze: '255,150,120', vignette: 0.5, unitGlow: true, lamps: true },
    },
    patio: {
      ground: 'stone', floor: 'asphalt', wob: 1.0, tree: 'noche', block: 'crate', pole: 'lamp',
      scenery: [['crate', 6], ['lamp', 2], ['rubble', 2], ['car', 1]],
      grass: ['#404a55', '#4d5965', '#5c6976', '#70808c'],
      path: ['#23262d', '#2f333c', '#3c414b', '#4d535e'], wall: '#868c95', curb: true, lane: '#b9b3a0',
      concrete: ['#5d646d', '#727a84', '#88909a', '#9fa7b0'],
      water: ['#1f3f66', '#2c5788', '#4274ab', '#9cc4e6'],
      mood: { ambient: [92, 104, 150], sun: [150, 180, 255, 0.25], shadow: { c: -0.7, d: -0.34, a: 0.34 }, shafts: null, particles: 'rain', haze: '110,130,190', vignette: 0.55, unitGlow: true, lamps: true },
    },
    silo: {
      ground: 'wheat', floor: 'planks', wob: 0.5, tree: 'dorado', block: 'sacks', pole: 'lamp',
      scenery: [['sacks', 7], ['crate', 3]],
      grass: ['#8a6a28', '#a88434', '#c29c42', '#dab95c'],
      path: ['#5a4129', '#735537', '#8c6b47', '#a58259'], wall: '#33230f',
      concrete: ['#6c6a62', '#84827a', '#9b9990', '#b2b0a6'],
      water: ['#2a5f96', '#3a7dbb', '#57a0dc', '#b4e2f8'],
      mood: { ambient: [150, 124, 100], sun: [255, 214, 150, 0.4], shadow: { c: -0.6, d: -0.34, a: 0.34 }, shafts: { rgb: '255,224,160', a: 0.2, n: 4 }, particles: 'chaff', haze: '255,210,150', vignette: 0.5, unitGlow: true, lamps: true },
    },
  };

  const PATH_CH = new Set(['#', 'S', 'E']);
  const G = 0, P = 1, W = 2, C = 3; // suelo, camino, agua, hormigón
  const BIG = 4096;                 // desplazamiento para que las texturas trabajen con coordenadas positivas

  /** Pinta el terreno de un mapa con su margen. Devuelve { canvas, w, h, types, margin }. */
  function paint(map, themeName, seed, m = MARGIN) {
    const th = THEMES[themeName] || THEMES.jardin;
    const mw = map.cols * ART, mh = map.rows * ART;
    const w = mw + m.l + m.r, h = mh + m.t + m.b;
    const px = new Px(w, h);
    const d = px.d;
    const col = (arr) => arr.map((c) => hex(c));
    const grass = col(th.grass), path = col(th.path), conc = col(th.concrete), water = col(th.water);
    const wall = hex(th.wall), wallD = tone(wall, -0.3);

    // Desde cada madriguera el camino sigue hacia afuera del tablero.
    const out = new Map();
    map.spawns.forEach((s, i) => {
      const cells = map.paths[i] ? map.paths[i].cells : null;
      if (!cells || cells.length < 2 || cells[0].c !== s.c || cells[0].r !== s.r) return;
      out.set(s.r * map.cols + s.c, { dc: s.c - cells[1].c, dr: s.r - cells[1].r });
    });

    const tileType = (c, r) => {
      const ox = c < 0 ? -1 : c >= map.cols ? 1 : 0, oy = r < 0 ? -1 : r >= map.rows ? 1 : 0;
      const cc = c < 0 ? 0 : c >= map.cols ? map.cols - 1 : c, rr = r < 0 ? 0 : r >= map.rows ? map.rows - 1 : r;
      const ch = map.tiles[rr][cc];
      if (ox || oy) {
        if (ch === '~') return W;
        if (ch === ':') return C;
        if (ch === 'S' && !(ox && oy)) {
          const o = out.get(rr * map.cols + cc);
          if (o && ((ox && o.dc === ox) || (oy && o.dr === oy))) return P;
        }
        return G;
      }
      return PATH_CH.has(ch) ? P : ch === '~' ? W : ch === ':' ? C : G;
    };

    // 1) Tipo de cada píxel, con los bordes ondulados por ruido.
    const T = new Uint8Array(w * h);
    const wob = th.wob;
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
      const x = X - m.l, y = Y - m.t;
      let sx = x, sy = y;
      if (wob) {
        sx += (vnoise(X, Y, 7, seed + 1) - 0.5) * 2 * wob + (hash2(X >> 1, Y >> 1, seed + 3) - 0.5) * 0.9;
        sy += (vnoise(X, Y, 7, seed + 2) - 0.5) * 2 * wob + (hash2(X >> 1, Y >> 1, seed + 4) - 0.5) * 0.9;
      }
      T[Y * w + X] = tileType(Math.floor(sx / ART), Math.floor(sy / ART));
    }
    const at = (X, Y) => T[(Y < 0 ? 0 : Y >= h ? h - 1 : Y) * w + (X < 0 ? 0 : X >= w ? w - 1 : X)];

    // 2) Color base de cada píxel según su tipo y el tema.
    const groundAt = GROUND[th.ground] || GROUND.grass;
    const floorAt = FLOOR[th.floor] || FLOOR.dirt;
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
      const t = T[Y * w + X], x = X - m.l + BIG, y = Y - m.t + BIG;
      let c;
      if (t === P) c = floorAt(x, y, path, seed, th);
      else if (t === W) c = waterAt(x, y, water, seed);
      else if (t === C) c = concreteAt(x, y, conc, grass, seed, th);
      else c = groundAt(x, y, grass, seed, th, conc);
      d[Y * w + X] = c;
    }

    // 3) Relieve: el camino y el agua quedan por debajo del suelo.
    const low = (tt) => tt === P || tt === W;
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
      const t = T[Y * w + X], i = Y * w + X;
      if (low(t)) {
        let up = 0;
        for (let k = 1; k <= 6; k++) if (!low(at(X, Y - k))) { up = k; break; }
        let left = 0;
        for (let k = 1; k <= 3; k++) if (!low(at(X - k, Y))) { left = k; break; }
        if (th.curb && t === P) {
          // bordillo claro arriba y a la izquierda, con su sombra
          if (up === 1) d[i] = wall; else if (up === 2) d[i] = tone(wall, -0.25); else if (up === 3) d[i] = tone(d[i], -0.3);
          else if (left === 1) d[i] = tone(wall, -0.15); else if (left === 2) d[i] = tone(d[i], -0.25);
          if (!low(at(X, Y + 1)) || !low(at(X + 1, Y))) d[i] = tone(wall, 0.15);
        } else {
          const depth = t === W ? 4 : 2;
          if (up && up <= depth) d[i] = up === 1 ? wallD : wall;
          else if (up && up <= depth + 2) d[i] = tone(d[i], -0.3);
          else if (left === 1) d[i] = tone(d[i], -0.36);
          else if (left === 2) d[i] = tone(d[i], -0.2);
          else if (left === 3) d[i] = tone(d[i], -0.1);
          if (t === W && (up === depth + 1 || (!low(at(X, Y + 1)) && hash2(X, Y, seed) < 0.7))) d[i] = water[3]; // espuma en la orilla
        }
      } else {
        // suelo alto: canto iluminado donde mira hacia la luz, oscuro donde cae al camino
        if (low(at(X, Y - 1)) || low(at(X - 1, Y))) d[i] = tone(d[i], 0.22);
        else if (low(at(X, Y + 1))) d[i] = tone(d[i], -0.3);
        else if (low(at(X + 1, Y))) d[i] = tone(d[i], -0.16);
        if (t === G && th.ground !== 'stone' && th.ground !== 'roof' && (at(X, Y - 1) === C || at(X - 1, Y) === C)) d[i] = tone(d[i], -0.18);
        if (t === C && (th.ground === 'grass' || th.ground === 'wheat') && (at(X, Y + 1) === G || at(X + 1, Y) === G) && hash2(X, Y, seed + 9) < 0.5) d[i] = grass[1];
      }
    }

    // 4) Detalles.
    details(px, map, th, T, { grass, path, conc, water }, seed, m);
    return { canvas: px.toCanvas(), w, h, px, types: T, margin: m };
  }

  /* ----------------------------------------------------------- texturas */
  const GROUND = {
    grass(x, y, g, s) {
      const n = vnoise(x, y, 17, s) * 0.66 + vnoise(x, y, 6, s + 1) * 0.34;
      let c = n < 0.38 ? g[1] : n < 0.7 ? g[2] : g[3];
      const hsh = hash2(x, y, s + 5);
      if (hsh < 0.013) c = tone(g[3], 0.12);                      // punta de hoja al sol
      else if (hash2(x, y - 1, s + 5) < 0.013) c = g[0];          // y su sombra
      else if (hsh > 0.994) c = g[0];
      return c;
    },
    wheat(x, y, g, s) {
      const n = vnoise(x, y / 2.6, 5, s) * 0.5 + vnoise(x, y, 19, s + 1) * 0.5;
      let c = n < 0.36 ? g[1] : n < 0.72 ? g[2] : g[3];
      const stalk = hash2(x, (y / 6) | 0, s + 5);
      if (stalk < 0.07) c = g[0];                                 // tallos en sombra
      else if (stalk > 0.93 && hash2(x, y, s + 6) < 0.45) c = tone(g[3], 0.25); // espigas
      return c;
    },
    /** Suelo de tienda vencido por la vegetación: baldosa vieja con manchones de musgo. */
    overgrown(x, y, g, s, th, conc) {
      const m = vnoise(x, y, 34, s + 60) * 0.78 + vnoise(x, y, 8, s + 61) * 0.22;
      if (m > 0.5) {
        const n = vnoise(x, y, 11, s);
        let c = n < 0.38 ? g[1] : n < 0.72 ? g[2] : g[3];
        if (m < 0.515) c = g[1];                                  // borde del manchón
        else if (hash2(x, y, s + 5) < 0.012) c = tone(g[3], 0.15);
        return c;
      }
      const lx = x & 31, ly = y & 31, v = hash2(x >> 5, y >> 5, s + 62);
      let c = v < 0.3 ? conc[1] : v < 0.8 ? conc[2] : conc[1];
      if (lx === 0 || ly === 0) c = conc[0];
      else if (lx === 1 || ly === 1) c = tone(c, 0.12);
      if (hash2(x, y, s + 63) > 0.985) c = conc[0];
      return c;
    },
    stone(x, y, g, s) {
      const sx = x >> 5, yy = y + ((sx & 1) ? 16 : 0), sy = yy >> 5;
      const v = hash2(sx, sy, s + 2), n = vnoise(x, y, 9, s);
      let c = v < 0.33 ? g[1] : v < 0.75 ? g[2] : g[1];
      if (n > 0.7) c = tone(c, 0.12); else if (n < 0.28) c = tone(c, -0.16);
      const lx = x & 31, ly = yy & 31;
      if (lx === 0 || ly === 0) c = g[0];
      else if (lx === 1 || ly === 1) c = tone(c, 0.18);
      if (hash2(x, y, s + 7) > 0.988) c = g[0];
      return c;
    },
    /** Tejas en escama: cada teja tiene el borde inferior curvo y monta sobre la de abajo. */
    roof(x, y, g, s) {
      const band = (Math.floor(y / 9)) & 1;
      const tx0 = (x + band * 7) % 14;
      const curve = Math.round(((tx0 - 7) * (tx0 - 7)) / 16);     // 0 en el centro, 3 en los bordes
      const yy = y + curve, row = Math.floor(yy / 9), ty = yy % 9;
      const xo = (row & 1) * 7, tx = (x + xo) % 14;
      const v = hash2(((x + xo) / 14) | 0, row, s + 2);
      const base = v < 0.25 ? g[1] : v < 0.8 ? g[2] : g[3];
      if (ty === 8) return g[0];                                  // sombra bajo el borde de la teja de arriba
      if (ty === 7) return tone(base, -0.26);
      if (tx === 0) return tone(base, -0.2);
      if (ty <= 1) return tone(base, 0.2);
      if (hash2(x, y, s + 8) > 0.992) return hex('#6f9a5c');     // musgo
      return base;
    },
  };

  function concreteAt(x, y, c, grass, s, th) {
    const n = vnoise(x, y, 13, s + 20) * 0.6 + vnoise(x, y, 5, s + 21) * 0.4;
    let v = n < 0.3 ? c[1] : n < 0.78 ? c[2] : c[3];
    const lx = x & 31, ly = y & 31;
    if (lx === 0 || ly === 0) v = c[0];
    else if (lx === 1 || ly === 1) v = tone(v, 0.14);
    if (hash2(x, y, s + 22) > 0.99) v = c[0];
    // musgo en manchones (solo en los temas con vegetación)
    if (th.ground === 'grass' || th.ground === 'wheat' || th.ground === 'overgrown') {
      const mm = vnoise(x, y, 15, s + 23);
      if (mm > 0.8 && hash2(x, y, s + 24) < (mm - 0.78) * 4) v = hash2(x, y, s + 25) < 0.5 ? grass[1] : grass[2];
    }
    return v;
  }

  function waterAt(x, y, wtr, s) {
    const n = vnoise(x, y / 1.6, 9, s + 30);
    return n < 0.4 ? wtr[0] : n < 0.8 ? wtr[1] : wtr[2];
  }

  const FLOOR = {
    dirt(x, y, p, s) {
      const n = vnoise(x, y, 12, s + 40) * 0.62 + vnoise(x, y, 5, s + 41) * 0.38;
      let c = n < 0.3 ? p[1] : n < 0.74 ? p[2] : p[3];
      const hsh = hash2(x, y, s + 42);
      if (hsh < 0.009) c = tone(p[3], 0.2);                        // piedrita
      else if (hash2(x, y - 1, s + 42) < 0.009) c = p[0];
      else if (hsh > 0.99) c = p[1];
      return c;
    },
    asphalt(x, y, p, s) {
      const n = vnoise(x, y, 13, s + 40);
      let c = n < 0.35 ? p[1] : n < 0.8 ? p[2] : p[1];
      const hsh = hash2(x, y, s + 42);
      if (hsh < 0.04) c = p[3]; else if (hsh > 0.96) c = p[0];
      return c;
    },
    tiles(x, y, p, s) {
      const cx = x >> 4, cy = y >> 4, v = hash2(cx, cy, s + 43);
      if (v < 0.07) { // baldosa rota: se ve el contrapiso
        const n = vnoise(x, y, 4, s + 44);
        return n < 0.5 ? tone(p[0], -0.2) : p[0];
      }
      let c = ((cx + cy) & 1) ? p[2] : p[3];
      if (v > 0.8) c = tone(c, -0.08);
      const lx = x & 15, ly = y & 15;
      if (lx === 0 || ly === 0) return p[0];
      if (lx === 1 || ly === 1) return tone(c, 0.16);
      if (hash2(x, y, s + 45) > 0.985) return p[1];
      return c;
    },
    bricks(x, y, p, s) {
      const row = y >> 3, xo = (row & 1) * 8, bx = (x + xo) & 15, ty = y & 7;
      if (ty === 7 || bx === 15) return p[0];
      const v = hash2((x + xo) >> 4, row, s + 46);
      let c = v < 0.3 ? p[1] : v < 0.8 ? p[2] : p[3];
      if (ty === 0) c = tone(c, 0.16);
      if (vnoise(x, y, 14, s + 47) > 0.72) c = mix(c, hex('#5f8f86'), 0.28); // humedad
      return c;
    },
    ledge(x, y, p, s) {
      const ly = y & 15, xs = x + ((y >> 4) & 1) * 16, lx = xs & 31;
      const v = hash2(xs >> 5, y >> 4, s + 48);
      let c = v < 0.3 ? p[1] : v < 0.8 ? p[2] : p[3];
      if (ly === 0 || lx === 0) return p[0];
      if (ly === 1) c = tone(c, 0.18);
      if (hash2(x, y, s + 49) > 0.988) c = p[0];
      return c;
    },
    planks(x, y, p, s) {
      const row = y >> 3, xs = x + (row & 1) * 20, v = hash2(row, (xs / 40) | 0, s + 50);
      let c = v < 0.3 ? p[1] : v < 0.78 ? p[2] : p[3];
      if ((y & 7) === 7) return p[0];
      if (xs % 40 === 0) return p[0];
      if ((y & 7) === 0) c = tone(c, 0.14);
      if (hash2(x >> 2, y, s + 51) > 0.93) c = tone(c, -0.12);     // veta
      return c;
    },
  };

  /* ------------------------------------------------------------ detalles */
  function details(px, map, th, T, pal, seed, m) {
    const { w, h } = px;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : T[y * w + x]);
    const rnd = (i) => hash2(i, seed, 77);
    let n = 0;

    // Flores y matas sobre el pasto.
    if ((th.ground === 'grass' || th.ground === 'overgrown') && th.flowers) {
      const count = Math.floor(w * h / 1500);
      for (let i = 0; i < count; i++) {
        const x = Math.floor(rnd(n++) * w), y = Math.floor(rnd(n++) * h);
        if (at(x, y) !== G || at(x + 2, y) !== G || at(x - 2, y) !== G || at(x, y + 2) !== G) continue;
        const isGrass = pal.grass.includes(px.get(x, y));
        if (!isGrass) continue;
        const kind = rnd(n++);
        if (kind < 0.42) {
          const c = hex(th.flowers[Math.floor(rnd(n++) * th.flowers.length)]);
          px.set(x - 1, y, c); px.set(x + 1, y, c); px.set(x, y - 1, c); px.set(x, y + 1, c); px.set(x, y, hex('#f2b233'));
          px.set(x, y + 2, pal.grass[0]);
        } else {
          // mata de pasto alto
          for (const [dx, dy, t] of [[-2, 0, 3], [0, -2, 3], [2, -1, 3], [-1, -1, 2], [1, 0, 2], [0, 0, 2], [-2, 1, 0], [2, 1, 0], [0, 1, 0], [-1, 1, 0], [1, 1, 0]]) px.set(x + dx, y + dy, pal.grass[t]);
        }
      }
    }
    // Amapolas en el trigal.
    if (th.ground === 'wheat' && th.flowers) {
      const count = Math.floor(w * h / 4200);
      for (let i = 0; i < count; i++) {
        const x = Math.floor(rnd(n++) * w), y = Math.floor(rnd(n++) * h);
        if (at(x, y) !== G) continue;
        const c = hex(th.flowers[0]);
        px.set(x, y, c); px.set(x + 1, y, c); px.set(x, y - 1, tone(c, 0.25)); px.set(x, y + 1, pal.grass[0]);
      }
    }
    // Grietas en hormigón, asfalto y piedra.
    const crackOn = (t) => (t === C) || (t === P && (th.floor === 'asphalt' || th.floor === 'tiles' || th.floor === 'ledge')) || (t === G && th.ground === 'stone');
    const cracks = Math.floor(w * h / 5200);
    for (let i = 0; i < cracks; i++) {
      let x = Math.floor(rnd(n++) * w), y = Math.floor(rnd(n++) * h);
      if (!crackOn(at(x, y))) continue;
      const len = 6 + Math.floor(rnd(n++) * 14);
      let dx = rnd(n++) < 0.5 ? 1 : -1;
      for (let k = 0; k < len; k++) {
        if (!crackOn(at(x, y))) break;
        px.set(x, y, tone(px.get(x, y), -0.42));
        if (th.ground === 'grass' && rnd(n++) < 0.12) px.set(x, y - 1, pal.grass[2]); // brote en la grieta
        const r = rnd(n++);
        if (r < 0.55) x += dx; else if (r < 0.8) y += 1; else { x += dx; y += 1; }
        if (rnd(n++) < 0.08) dx = -dx;
      }
    }
    // Charcos en los temas húmedos.
    if (th.mood.particles === 'mist' || th.mood.particles === 'rain') {
      const puddles = Math.floor(w * h / 9000);
      for (let i = 0; i < puddles; i++) {
        const cx = Math.floor(rnd(n++) * w), cy = Math.floor(rnd(n++) * h), rx = 4 + rnd(n++) * 7, ry = 2 + rnd(n++) * 3;
        for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
          const q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
          if (q > 1 || at(x, y) === W || at(x, y) === -1) continue;
          px.set(x, y, mix(px.get(x, y), pal.water[q < 0.45 ? 2 : 1], 0.5));
        }
      }
    }
    // Líneas de carretera, siguiendo el eje de cada camino.
    if (th.lane) {
      const lane = hex(th.lane), S = ART / TD.TILE;
      for (const p of map.paths) {
        for (let dd = 0; dd < p.length; dd += 0.75) {
          // lejos de las esquinas y de la base
          let near = p.length - dd;
          for (let k = 1; k < p.cum.length; k++) near = Math.min(near, Math.abs(dd - p.cum[k]));
          if (near < 20) continue;
          if ((dd * S) % 18 > 9) continue;
          const q = map.posAt(p, dd);
          const x = Math.round(q.x * S) + m.l, y = Math.round(q.y * S) + m.t;
          if (hash2(x, y, seed + 60) < 0.2) continue; // pintura gastada
          px.set(x, y, lane);
          px.set(x + (q.dy ? 1 : 0), y + (q.dx ? 1 : 0), tone(lane, -0.2));
        }
      }
    }
    // Piedras y hojas secas sobre el camino de tierra.
    if (th.floor === 'dirt') {
      const count = Math.floor(w * h / 3800);
      for (let i = 0; i < count; i++) {
        const x = Math.floor(rnd(n++) * w), y = Math.floor(rnd(n++) * h);
        if (at(x, y) !== P || at(x - 2, y) !== P || at(x + 3, y) !== P || at(x, y - 3) !== P) continue;
        const c = pal.path[3];
        px.set(x, y, tone(c, 0.18)); px.set(x + 1, y, c); px.set(x, y + 1, pal.path[0]); px.set(x + 1, y + 1, pal.path[0]);
      }
    }
  }

  TD.THEMES = THEMES;
  TD.terrain = { paint, ART, MARGIN, G, P, W, C };
})();
