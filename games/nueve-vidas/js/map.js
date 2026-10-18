/* Nueve Vidas · mapa.
 * Convierte el dibujo ASCII del nivel en casillas y calcula, con una búsqueda
 * en anchura, el camino que va de cada madriguera (S) a la Despensa (E). */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});
  const TILE = TD.TILE;

  const PATH_CHARS = new Set(['#', 'S', 'E']);
  const BUILD_CHARS = new Set(['.', ':']);
  const KNOWN_CHARS = new Set(['.', ':', '#', 'S', 'E', '~', 'T', 'R', 'C', 'L']);
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  class GameMap {
    constructor(level) {
      const id = level.id;
      if (!Array.isArray(level.map) || !level.map.length) throw new Error(`Nivel "${id}": falta el mapa (map)`);
      this.rows = level.map.length;
      this.cols = level.map[0].length;
      this.tiles = [];
      this.spawns = [];
      this.water = [];
      this.exit = null;

      level.map.forEach((row, r) => {
        if (row.length !== this.cols) {
          throw new Error(`Nivel "${id}": la fila ${r} mide ${row.length} y la primera ${this.cols}. Todas las filas deben medir lo mismo.`);
        }
        const cells = row.split('');
        cells.forEach((ch, c) => {
          if (!KNOWN_CHARS.has(ch)) throw new Error(`Nivel "${id}": carácter desconocido "${ch}" en fila ${r}, columna ${c}`);
          if (ch === 'S') this.spawns.push({ c, r });
          if (ch === '~') this.water.push({ c, r });
          if (ch === 'E') {
            if (this.exit) throw new Error(`Nivel "${id}": solo puede haber una Despensa (E)`);
            this.exit = { c, r };
          }
        });
        this.tiles.push(cells);
      });
      if (!this.exit) throw new Error(`Nivel "${id}": falta la Despensa (E)`);
      if (!this.spawns.length) throw new Error(`Nivel "${id}": falta al menos una madriguera (S)`);

      this.width = this.cols * TILE;
      this.height = this.rows * TILE;
      this.paths = Array.isArray(level.paths)
        ? level.paths.map((wp, i) => this._fromWaypoints(wp, i, id))
        : this.spawns.map((s) => this._bfs(s, id));
    }

    tile(c, r) {
      if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return null;
      return this.tiles[r][c];
    }
    isBuildable(c, r) { return BUILD_CHARS.has(this.tile(c, r)); }
    isPath(c, r) { return PATH_CHARS.has(this.tile(c, r)); }
    center(c, r) { return { x: (c + 0.5) * TILE, y: (r + 0.5) * TILE }; }

    _bfs(start, id) {
      const key = (c, r) => r * this.cols + c;
      const prev = new Map([[key(start.c, start.r), null]]);
      const queue = [start];
      let found = false;
      while (queue.length) {
        const cur = queue.shift();
        if (cur.c === this.exit.c && cur.r === this.exit.r) { found = true; break; }
        for (const [dc, dr] of DIRS) {
          const c = cur.c + dc, r = cur.r + dr;
          if (!PATH_CHARS.has(this.tile(c, r))) continue;
          const k = key(c, r);
          if (prev.has(k)) continue;
          prev.set(k, cur);
          queue.push({ c, r });
        }
      }
      if (!found) {
        throw new Error(`Nivel "${id}": la madriguera en columna ${start.c}, fila ${start.r} no llega a la Despensa siguiendo el camino (#)`);
      }
      const cells = [];
      let cur = this.exit;
      while (cur) { cells.push(cur); cur = prev.get(key(cur.c, cur.r)); }
      cells.reverse();
      return this._makePath(cells);
    }

    _fromWaypoints(wp, i, id) {
      if (!Array.isArray(wp) || wp.length < 2) throw new Error(`Nivel "${id}": el camino ${i} necesita al menos dos puntos [col, fila]`);
      return this._makePath(wp.map(([c, r]) => ({ c, r })));
    }

    _makePath(cells) {
      // Puntos en píxeles, quitando los intermedios colineales.
      const raw = cells.map(({ c, r }) => this.center(c, r));
      const points = [raw[0]];
      for (let i = 1; i < raw.length - 1; i++) {
        const a = points[points.length - 1], b = raw[i], c = raw[i + 1];
        const collinear = (b.x - a.x) * (c.y - b.y) === (b.y - a.y) * (c.x - b.x);
        if (!collinear) points.push(b);
      }
      if (raw.length > 1) points.push(raw[raw.length - 1]);
      const cum = [0];
      for (let i = 1; i < points.length; i++) {
        cum.push(cum[i - 1] + TD.util.dist(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y));
      }
      return { cells, points, cum, length: cum[cum.length - 1] };
    }

    /** Posición y dirección a una distancia `d` (píxeles) del inicio del camino. */
    posAt(path, d) {
      const { points, cum } = path;
      if (d <= 0) {
        const p = points[0], q = points[1] || points[0];
        return { x: p.x, y: p.y, ...dir(p, q) };
      }
      if (d >= path.length) {
        const p = points[points.length - 1], q = points[points.length - 2] || p;
        return { x: p.x, y: p.y, ...dir(q, p) };
      }
      let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] <= d) lo = mid; else hi = mid;
      }
      const a = points[lo], b = points[hi];
      const t = (d - cum[lo]) / (cum[hi] - cum[lo] || 1);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, ...dir(a, b) };
    }
  }

  function dir(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    return { dx: dx / l, dy: dy / l };
  }

  TD.GameMap = GameMap;
})();
