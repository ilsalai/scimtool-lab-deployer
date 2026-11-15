/* Nueve Vidas · motor de pixel art procedural.
 * Los sprites no son imágenes: se construyen píxel a píxel con formas
 * sombreadas (luz desde arriba a la izquierda), rampas de color con cambio de
 * tono (las sombras tiran a violeta, las luces a amarillo) y contorno
 * automático. El resultado es pixel art de alta densidad ("hi-bit"). */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});

  /* ------------------------------------------------------------- color */
  const pack = (r, g, b, a = 255) => (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
  const unpack = (c) => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, (c >>> 24) & 255];
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  function hex(str, a = 255) {
    const s = str[0] === '#' ? str.slice(1) : str;
    const n = parseInt(s.length === 3 ? s.replace(/./g, '$&$&') : s, 16);
    return pack((n >> 16) & 255, (n >> 8) & 255, n & 255, a);
  }
  function css(c) { const [r, g, b, a] = unpack(c); return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`; }

  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hsl2rgb(h, s, l) {
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }

  const toneCache = new Map();
  /** Aclara (d > 0) u oscurece (d < 0) un color girando el tono: luces cálidas, sombras frías. */
  function tone(c, d) {
    const key = c * 64 + Math.round((d + 1) * 30);
    let v = toneCache.get(key);
    if (v !== undefined) return v;
    const [r, g, b, a] = unpack(c);
    let [h, s, l] = rgb2hsl(r, g, b);
    const light = d > 0, k = Math.min(1, Math.abs(d));
    if (s < 0.08) { h = light ? 48 : 245; s = Math.max(s, 0.05 + 0.1 * k); }
    const target = light ? 52 : 258;
    const dh = ((target - h + 540) % 360) - 180;
    h = (h + dh * k * 0.28 + 360) % 360;
    l = clamp01(light ? l + (1 - l) * k * 0.85 : l * (1 - k * 0.9));
    s = clamp01(light ? s * (1 - 0.25 * k) : s * (1 + 0.3 * k));
    const [R, G, B] = hsl2rgb(h, s, l);
    v = pack(R, G, B, a);
    toneCache.set(key, v);
    return v;
  }
  function mix(c1, c2, t) {
    const a = unpack(c1), b = unpack(c2);
    return pack(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), Math.round(a[3] + (b[3] - a[3]) * t));
  }
  const rampCache = new Map();
  /** Rampa de cinco tonos alrededor de un color base. */
  function ramp(c) {
    if (typeof c === 'string') c = hex(c);
    if (typeof c === 'object') return c;
    let r = rampCache.get(c);
    if (!r) { r = { d2: tone(c, -0.5), d1: tone(c, -0.26), m: c, l1: tone(c, 0.24), l2: tone(c, 0.5), isRamp: true }; rampCache.set(c, r); }
    return r;
  }

  /* -------------------------------------------------------------- ruido */
  function hash2(x, y, seed = 0) {
    let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  /** Ruido de valor suavizado, en [0,1). */
  function vnoise(x, y, scale, seed = 0) {
    const fx = x / scale, fy = y / scale;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    let tx = fx - x0, ty = fy - y0;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }

  /* -------------------------------------------------------------- lienzo */
  const LIGHT = [-0.6, -0.8]; // hacia dónde está la luz (arriba a la izquierda)

  class Px {
    constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); this.ox = 0; this.oy = 0; }
    /** Fija el origen: las coordenadas de dibujo pasan a ser relativas a (ox, oy). */
    origin(ox, oy) { this.ox = ox; this.oy = oy; return this; }
    get(x, y) { x += this.ox; y += this.oy; return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : 0; }
    set(x, y, c) { x = Math.round(x) + this.ox; y = Math.round(y) + this.oy; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; return this; }
    /** Pinta solo donde NO hay nada (para lo que va por detrás, como una cola fina sin contorno). */
    under(x, y, c) { x = Math.round(x) + this.ox; y = Math.round(y) + this.oy; if (x >= 0 && y >= 0 && x < this.w && y < this.h && !this.d[y * this.w + x]) this.d[y * this.w + x] = c; return this; }
    /** Pinta solo donde ya hay algo (para manchas, rayas y detalles sobre el cuerpo). */
    over(x, y, c) { x = Math.round(x) + this.ox; y = Math.round(y) + this.oy; if (x >= 0 && y >= 0 && x < this.w && y < this.h && this.d[y * this.w + x]) this.d[y * this.w + x] = c; return this; }
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; }
    line(x0, y0, x1, y1, c, onlyOver = false) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        if (onlyOver) this.over(x0, y0, c); else this.set(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
      return this;
    }
    /** Elipse. `col` puede ser un color plano o una rampa (entonces se sombrea como un volumen).
     *  o.sep: separa del fondo con una línea oscura; o.over: solo sobre lo ya pintado;
     *  o.light: vector de luz; o.soft: bandas más suaves para formas grandes. */
    ellipse(cx, cy, rx, ry, col, o = {}) {
      const r = typeof col === 'object' ? col : null;
      const L = o.light || LIGHT;
      const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1), y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
      if (o.sep) {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const px = (x + 0.5 - cx) / (rx + 1), py = (y + 0.5 - cy) / (ry + 1);
          if (px * px + py * py <= 1) { const e = this.get(x, y); if (e) this.set(x, y, tone(e, -0.42)); }
        }
      }
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = (x + 0.5 - cx) / rx, py = (y + 0.5 - cy) / ry;
        const d2 = px * px + py * py;
        if (d2 > 1) continue;
        if (o.over && !this.get(x, y)) continue;
        let c;
        if (!r) c = col;
        else {
          const v = px * L[0] + py * L[1];
          if (v > (o.hi ?? 0.42)) c = r.l1;
          else if (v < -0.72 && rx >= 5) c = r.d2;
          else if (v < (o.lo ?? -0.34)) c = r.d1;
          else c = r.m;
        }
        this.set(x, y, c);
      }
      return this;
    }
    /** Polígono relleno (regla par-impar). */
    poly(pts, c, onlyOver = false) {
      let y0 = Infinity, y1 = -Infinity;
      for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
        const yc = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
        xs.sort((p, q) => p - q);
        for (let i = 0; i + 1 < xs.length; i += 2) {
          for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) { if (onlyOver) this.over(x, y, c); else this.set(x, y, c); }
        }
      }
      return this;
    }
    /** Curva gruesa: cadena de discos a lo largo de una Bézier cuadrática. */
    curve(x0, y0, cx, cy, x1, y1, r0, r1, col, o = {}) {
      const n = Math.max(6, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5));
      for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
        const r = r0 + (r1 - r0) * t;
        if (r <= 0.75) this.set(x, y, typeof col === 'object' ? col.m : col);
        else this.ellipse(x, y, r, r, col, o);
      }
      return this;
    }
    /** Contorno exterior, del color oscurecido del píxel vecino (más claro del lado de la luz). */
    outline(strength = 0.62) {
      const { w, h, d } = this, out = new Uint32Array(d);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (d[y * w + x]) continue;
        const below = y + 1 < h ? d[(y + 1) * w + x] : 0, right = x + 1 < w ? d[y * w + x + 1] : 0;
        const above = y > 0 ? d[(y - 1) * w + x] : 0, left = x > 0 ? d[y * w + x - 1] : 0;
        const n = below || right || above || left;
        if (!n) continue;
        // Borde iluminado (el sprite queda abajo o a la derecha de este píxel): contorno menos duro.
        const lit = (below || right) && !(above || left);
        out[y * w + x] = tone(n | 0xff000000, lit ? -(strength - 0.14) : -strength);
      }
      this.d = out;
      return this;
    }
    /** Copia otro lienzo encima (respetando transparencia). */
    blit(src, dx, dy, flip = false) {
      for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
        const c = src.d[y * src.w + (flip ? src.w - 1 - x : x)];
        if (c) this.set(dx + x, dy + y, c);
      }
      return this;
    }
    bbox() {
      let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.d[y * this.w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return x1 < 0 ? { x: 0, y: 0, w: 1, h: 1 } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    }
    toCanvas() {
      const cv = document.createElement('canvas');
      cv.width = this.w; cv.height = this.h;
      const ctx = cv.getContext('2d');
      const img = ctx.createImageData(this.w, this.h);
      new Uint32Array(img.data.buffer).set(this.d);
      ctx.putImageData(img, 0, 0);
      return cv;
    }
    /** Silueta de un solo color (sombras, destellos de daño, tintes). */
    maskCanvas(color) {
      const cv = document.createElement('canvas');
      cv.width = this.w; cv.height = this.h;
      const ctx = cv.getContext('2d');
      const img = ctx.createImageData(this.w, this.h);
      const out = new Uint32Array(img.data.buffer);
      for (let i = 0; i < this.d.length; i++) if (this.d[i]) out[i] = color;
      ctx.putImageData(img, 0, 0);
      return cv;
    }
  }

  TD.px = { Px, pack, unpack, hex, css, tone, mix, ramp, hash2, vnoise, LIGHT };
})();
