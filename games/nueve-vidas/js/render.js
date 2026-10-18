/* Nueve Vidas · renderizado del mapa y de la partida.
 * El fondo (terreno, caminos, decoración) se pinta una vez en un canvas
 * auxiliar; cada cuadro se dibujan encima el agua animada, las unidades, los
 * enemigos, los proyectiles y los efectos. */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});
  const TILE = TD.TILE;
  const TAU = Math.PI * 2;
  const { clamp, rng: makeRng, hashStr } = TD.util;
  const A = TD.art;

  /* --------------------------------------------------------------- temas */
  const THEMES = {
    jardin:       { ground: 'grass', grass: ['#7cab62', '#88b76d', '#73a35b'], tuft: '#5b8f47', flowers: ['#fff5d6', '#f6c9dc', '#f9d86a'], floor: 'dirt', path: '#cbae79', pathEdge: '#a0824b', speck: '#b89763', concrete: '#a3a7ab', crack: '#7c8186', water: '#4f8fc4', waterDeep: '#3b74a8', waterLight: '#9ccbea', block: 'tree', pole: 'lamp' },
    autopista:    { ground: 'grass', grass: ['#8aa66b', '#95b074', '#7f9b62'], tuft: '#66844e', flowers: ['#fff5d6', '#f9d86a'], floor: 'asphalt', path: '#53575d', pathEdge: '#35383d', line: '#c9b24a', concrete: '#9ea3a8', crack: '#767b81', water: '#4f8fc4', waterDeep: '#3b74a8', waterLight: '#9ccbea', block: 'tree', pole: 'lamp' },
    despensa:     { ground: 'grass', grass: ['#7fa36a', '#8aad73', '#76995f'], tuft: '#5f8650', flowers: ['#fff5d6'], floor: 'tiles', path: '#c3b59c', pathEdge: '#8f8169', tile2: '#d3c6ad', concrete: '#aaa59b', crack: '#86817a', water: '#4f8fc4', waterDeep: '#3b74a8', waterLight: '#9ccbea', block: 'tree', pole: 'lamp' },
    campo:        { ground: 'wheat', grass: ['#c4b260', '#cdbb6a', '#b8a657'], tuft: '#9a8838', flowers: ['#e4584f', '#fff5d6'], floor: 'dirt', path: '#b8955f', pathEdge: '#846541', speck: '#a4834f', concrete: '#a9a79a', crack: '#86847a', water: '#4f8fc4', waterDeep: '#3b74a8', waterLight: '#9ccbea', block: 'tree', pole: 'lamp' },
    alcantarilla: { ground: 'stone', grass: ['#55615a', '#5c6960', '#4e5a53'], tuft: '#6f8a66', flowers: [], floor: 'bricks', path: '#716b63', pathEdge: '#423e39', brickLine: '#56514a', concrete: '#656b6e', crack: '#4a4f53', water: '#3f6b62', waterDeep: '#2c4f47', waterLight: '#6e9c92', block: 'pipe', pole: 'lamp', dark: true },
    tejado:       { ground: 'roof', grass: ['#a0665a', '#aa7062', '#946054'], tuft: '#7a4a40', flowers: [], floor: 'ledge', path: '#8a8d95', pathEdge: '#5a5d65', concrete: '#b3b0a8', crack: '#8d8a83', water: '#4f8fc4', waterDeep: '#3b74a8', waterLight: '#9ccbea', block: 'chimney', pole: 'antenna' },
  };
  TD.THEMES = THEMES;

  const PATH_CHARS = new Set(['#', 'S', 'E']);

  class Renderer {
    constructor(canvas, game) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.game = game;
      this.map = game.map;
      this.theme = THEMES[game.level.theme] || THEMES.jardin;
      this.seed = hashStr(game.level.id);
      this.t = 0;
      this.dpr = 1;
      this.bg = null;
      this.resize();
    }

    /** Ajusta la resolución interna al DPR y rehace el fondo. */
    resize() {
      const dpr = Math.min(2, (globalThis.devicePixelRatio || 1));
      this.dpr = dpr;
      this.canvas.width = Math.round(this.map.width * dpr);
      this.canvas.height = Math.round(this.map.height * dpr);
      this.bg = this.buildBackground();
    }

    /** Hace que el canvas quepa en una caja manteniendo la proporción. */
    fit(boxW, boxH) {
      const k = Math.min(boxW / this.map.width, boxH / this.map.height);
      this.canvas.style.width = `${Math.floor(this.map.width * k)}px`;
      this.canvas.style.height = `${Math.floor(this.map.height * k)}px`;
    }

    /** Convierte coordenadas de pantalla en casilla y posición lógica. */
    pointFromEvent(evt) {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((evt.clientX - rect.left) / rect.width) * this.map.width;
      const y = ((evt.clientY - rect.top) / rect.height) * this.map.height;
      return { x, y, c: Math.floor(x / TILE), r: Math.floor(y / TILE) };
    }

    /* ------------------------------------------------------------ fondo */
    buildBackground() {
      const map = this.map, th = this.theme, dpr = this.dpr;
      const off = document.createElement('canvas');
      off.width = this.canvas.width; off.height = this.canvas.height;
      const ctx = off.getContext('2d');
      ctx.scale(dpr, dpr);
      const rng = makeRng(this.seed);

      // Primera pasada: terreno y suelo.
      for (let r = 0; r < map.rows; r++) {
        for (let c = 0; c < map.cols; c++) {
          const ch = map.tile(c, r);
          ctx.save();
          ctx.translate(c * TILE, r * TILE);
          if (PATH_CHARS.has(ch)) this.paintFloor(ctx, c, r, rng);
          else if (ch === ':') this.paintConcrete(ctx, rng);
          else if (ch === '~') this.paintWaterBase(ctx, c, r);
          else this.paintGround(ctx, rng);
          ctx.restore();
        }
      }
      // Segunda pasada: decoración que puede sobresalir de su casilla.
      for (let r = 0; r < map.rows; r++) {
        for (let c = 0; c < map.cols; c++) {
          const ch = map.tile(c, r);
          ctx.save();
          ctx.translate((c + 0.5) * TILE, (r + 0.5) * TILE);
          if (ch === 'T') this.paintBlock(ctx, rng);
          else if (ch === 'R') this.paintRubble(ctx, rng);
          else if (ch === 'C') this.paintCar(ctx, rng);
          else if (ch === 'L') this.paintPole(ctx, rng);
          else if (ch === 'S') this.paintSpawn(ctx, rng);
          else if (ch === 'E') this.paintExit(ctx, rng);
          ctx.restore();
        }
      }
      // Viñeta suave en los bordes.
      const g = ctx.createRadialGradient(map.width / 2, map.height / 2, Math.min(map.width, map.height) * 0.45, map.width / 2, map.height / 2, Math.max(map.width, map.height) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, th.dark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.22)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, map.width, map.height);
      return off;
    }

    paintGround(ctx, rng) {
      const th = this.theme;
      ctx.fillStyle = th.grass[Math.floor(rng() * th.grass.length)];
      ctx.fillRect(0, 0, TILE, TILE);
      ctx.lineCap = 'round';
      if (th.ground === 'grass') {
        ctx.strokeStyle = th.tuft; ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const x = 6 + rng() * 36, y = 8 + rng() * 34;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y - 5); ctx.moveTo(x, y); ctx.lineTo(x + 2.5, y - 4); ctx.stroke();
        }
        if (th.flowers.length && rng() < 0.18) {
          const x = 8 + rng() * 32, y = 8 + rng() * 32, col = th.flowers[Math.floor(rng() * th.flowers.length)];
          for (let i = 0; i < 4; i++) A.circle(ctx, x + Math.cos(i * TAU / 4) * 2.2, y + Math.sin(i * TAU / 4) * 2.2, 1.6, col);
          A.circle(ctx, x, y, 1.2, '#f2c233');
        }
      } else if (th.ground === 'wheat') {
        ctx.strokeStyle = th.tuft; ctx.lineWidth = 1.3;
        for (let i = 0; i < 5; i++) {
          const x = 5 + rng() * 38, y = 10 + rng() * 34, h = 9 + rng() * 8;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1, y - h); ctx.stroke();
          A.ellipse(ctx, x + 1, y - h, 1.6, 3.2, '#d9c27a');
        }
        if (th.flowers.length && rng() < 0.12) A.circle(ctx, 8 + rng() * 32, 8 + rng() * 32, 2.2, th.flowers[0]);
      } else if (th.ground === 'stone') {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
        const y1 = 14 + rng() * 10, y2 = 30 + rng() * 10;
        ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(TILE, y1 + rng() * 3 - 1.5); ctx.moveTo(0, y2); ctx.lineTo(TILE, y2 + rng() * 3 - 1.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10 + rng() * 28, y1); ctx.lineTo(10 + rng() * 28, y2); ctx.stroke();
        for (let i = 0; i < 3; i++) A.circle(ctx, rng() * TILE, rng() * TILE, 1.5 + rng() * 2, 'rgba(120,160,100,0.45)');
      } else if (th.ground === 'roof') {
        ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.2;
        for (let row = 0; row < 3; row++) {
          const y = 8 + row * 16;
          for (let k = 0; k < 3; k++) {
            const x = (row % 2 ? 8 : 0) + k * 16;
            ctx.beginPath(); ctx.arc(x + 8, y + 2, 8, Math.PI, 0); ctx.stroke();
          }
        }
        if (rng() < 0.3) A.circle(ctx, rng() * TILE, rng() * TILE, 2, 'rgba(110,150,90,0.5)');
      }
    }

    paintConcrete(ctx, rng) {
      const th = this.theme;
      ctx.fillStyle = th.concrete; ctx.fillRect(0, 0, TILE, TILE);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
      ctx.strokeStyle = th.crack; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      if (rng() < 0.7) {
        let x = rng() * TILE, y = rng() * TILE;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let i = 0; i < 3; i++) { x += rng() * 16 - 8; y += rng() * 16 - 8; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      if (rng() < 0.35) A.ellipse(ctx, rng() * TILE, rng() * TILE, 5 + rng() * 5, 3 + rng() * 3, 'rgba(110,160,90,0.35)');
    }

    paintWaterBase(ctx, c, r) {
      const th = this.theme, map = this.map;
      ctx.fillStyle = th.water; ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = th.waterDeep;
      const edges = [[0, -1, 0, 0, TILE, 4], [0, 1, 0, TILE - 4, TILE, 4], [-1, 0, 0, 0, 4, TILE], [1, 0, TILE - 4, 0, 4, TILE]];
      for (const [dc, dr, x, y, w, h] of edges) {
        const n = map.tile(c + dc, r + dr);
        if (n !== null && n !== '~') ctx.fillRect(x, y, w, h);
      }
    }

    paintFloor(ctx, c, r, rng) {
      const th = this.theme, map = this.map;
      ctx.fillStyle = th.path; ctx.fillRect(0, 0, TILE, TILE);
      const isPath = (cc, rr) => { const t = map.tile(cc, rr); return t === null || PATH_CHARS.has(t); };
      const open = { n: isPath(c, r - 1), s: isPath(c, r + 1), w: isPath(c - 1, r), e: isPath(c + 1, r) };
      ctx.lineCap = 'round';
      if (th.floor === 'dirt') {
        ctx.fillStyle = th.speck;
        for (let i = 0; i < 6; i++) A.circle(ctx, rng() * TILE, rng() * TILE, 1 + rng() * 1.5, th.speck);
        if (rng() < 0.25) { // huellitas
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          const x = 10 + rng() * 28, y = 10 + rng() * 28;
          A.ellipse(ctx, x, y, 2.2, 2.8, 'rgba(0,0,0,0.12)'); A.circle(ctx, x - 2.5, y - 3.5, 1.1, 'rgba(0,0,0,0.12)'); A.circle(ctx, x + 2.5, y - 3.5, 1.1, 'rgba(0,0,0,0.12)'); A.circle(ctx, x, y - 4.5, 1.1, 'rgba(0,0,0,0.12)');
        }
      } else if (th.floor === 'asphalt') {
        ctx.strokeStyle = th.crack; ctx.lineWidth = 1.2;
        if (rng() < 0.5) { let x = rng() * TILE, y = rng() * TILE; ctx.beginPath(); ctx.moveTo(x, y); for (let i = 0; i < 3; i++) { x += rng() * 14 - 7; y += rng() * 14 - 7; ctx.lineTo(x, y); } ctx.stroke(); }
        ctx.strokeStyle = th.line; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.globalAlpha = 0.55;
        if (open.w && open.e && !(open.n || open.s)) { ctx.beginPath(); ctx.moveTo(0, TILE / 2); ctx.lineTo(TILE, TILE / 2); ctx.stroke(); }
        else if (open.n && open.s && !(open.w || open.e)) { ctx.beginPath(); ctx.moveTo(TILE / 2, 0); ctx.lineTo(TILE / 2, TILE); ctx.stroke(); }
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        if (rng() < 0.3) A.ellipse(ctx, rng() * TILE, rng() * TILE, 4, 2.5, 'rgba(110,150,80,0.5)');
      } else if (th.floor === 'tiles') {
        const h = TILE / 2;
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
          ctx.fillStyle = (i + j) % 2 ? th.tile2 : th.path; ctx.fillRect(i * h, j * h, h, h);
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(h, 0); ctx.lineTo(h, TILE); ctx.moveTo(0, h); ctx.lineTo(TILE, h); ctx.stroke();
        if (rng() < 0.2) { ctx.strokeStyle = th.pathEdge; ctx.beginPath(); ctx.moveTo(rng() * TILE, rng() * TILE); ctx.lineTo(rng() * TILE, rng() * TILE); ctx.stroke(); }
      } else if (th.floor === 'bricks') {
        ctx.strokeStyle = th.brickLine; ctx.lineWidth = 1.2;
        for (let row = 0; row < 4; row++) {
          const y = row * 12;
          ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(TILE, y + 0.5); ctx.stroke();
          for (let k = 0; k < 3; k++) { const x = (row % 2 ? 8 : 0) + k * 16 + 8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 12); ctx.stroke(); }
        }
        if (rng() < 0.3) A.ellipse(ctx, rng() * TILE, rng() * TILE, 5, 3, 'rgba(70,110,80,0.4)');
      } else if (th.floor === 'ledge') {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(TILE, 16); ctx.moveTo(0, 32); ctx.lineTo(TILE, 32); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, 0, TILE, 6);
      }
      // Bordes del camino donde no sigue.
      ctx.fillStyle = th.pathEdge;
      if (!open.n) ctx.fillRect(0, 0, TILE, 3);
      if (!open.s) ctx.fillRect(0, TILE - 3, TILE, 3);
      if (!open.w) ctx.fillRect(0, 0, 3, TILE);
      if (!open.e) ctx.fillRect(TILE - 3, 0, 3, TILE);
    }

    paintBlock(ctx, rng) {
      const th = this.theme;
      if (th.block === 'tree') {
        const k = 0.85 + rng() * 0.3, ox = rng() * 6 - 3, oy = rng() * 6 - 3;
        A.ellipse(ctx, ox + 4, oy + 12, 15 * k, 7 * k, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = '#5a3d22'; ctx.fillRect(ox - 3, oy, 6, 14);
        A.circle(ctx, ox, oy - 4, 15 * k, '#3f7d3a'); A.circle(ctx, ox - 7 * k, oy + 1, 10 * k, '#467f3c'); A.circle(ctx, ox + 7 * k, oy, 10 * k, '#4e9348');
        A.circle(ctx, ox - 3 * k, oy - 8 * k, 7 * k, '#5aa352');
      } else if (th.block === 'pipe') {
        A.ellipse(ctx, 0, 14, 14, 6, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = '#6b7075'; ctx.fillRect(-9, -14, 18, 28); ctx.fillStyle = '#8a9096'; ctx.fillRect(-9, -14, 5, 28);
        ctx.fillStyle = '#4e5358'; ctx.fillRect(-11, -16, 22, 5); ctx.fillRect(-11, 10, 22, 5);
        A.circle(ctx, 0, -2, 6, '#a33a3a'); A.circle(ctx, 0, -2, 2.5, '#6b7075');
      } else if (th.block === 'chimney') {
        A.ellipse(ctx, 3, 16, 14, 6, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = '#8c5a4a'; ctx.fillRect(-10, -14, 20, 30);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
        for (let y = -10; y < 16; y += 6) { ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(10, y); ctx.stroke(); }
        ctx.fillStyle = '#3d3d44'; ctx.fillRect(-12, -18, 24, 6);
      }
    }

    paintRubble(ctx, rng) {
      A.ellipse(ctx, 2, 10, 17, 7, 'rgba(0,0,0,0.25)');
      for (let i = 0; i < 4; i++) {
        const x = rng() * 20 - 10, y = rng() * 14 - 7, w = 10 + rng() * 10, h = 7 + rng() * 6;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rng() * 0.8 - 0.4);
        ctx.fillStyle = ['#8d8d8d', '#a1a1a1', '#777b7e'][i % 3]; ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-w / 2, -h / 2, w, 2);
        ctx.restore();
      }
      A.line(ctx, -8, -8, 6, -16, '#6e4a2a', 2);
      A.circle(ctx, 8, 6, 3, 'rgba(110,160,90,0.7)');
    }

    paintCar(ctx, rng) {
      const col = ['#a9492f', '#7d6b4e', '#4c6a8a'][Math.floor(rng() * 3)];
      ctx.save(); ctx.rotate(rng() * 0.3 - 0.15);
      A.ellipse(ctx, 2, 4, 22, 11, 'rgba(0,0,0,0.3)');
      for (const [x, y] of [[-13, -11], [13, -11], [-13, 11], [13, 11]]) { ctx.fillStyle = '#222'; ctx.fillRect(x - 4, y - 2.5, 8, 5); }
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.roundRect(-20, -9, 40, 18, 5); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.roundRect(-9, -7, 18, 14, 3); ctx.fill();
      ctx.fillStyle = 'rgba(20,40,60,0.6)'; ctx.fillRect(-13, -7, 4, 14); ctx.fillRect(9, -7, 4, 14);
      for (let i = 0; i < 4; i++) A.circle(ctx, rng() * 36 - 18, rng() * 14 - 7, 1.5 + rng() * 2, 'rgba(120,60,20,0.6)');
      A.ellipse(ctx, 0, 0, 5, 3, 'rgba(110,160,90,0.6)');
      ctx.restore();
    }

    paintPole(ctx, rng) {
      const th = this.theme;
      const lean = rng() * 0.5 - 0.25;
      ctx.save(); ctx.rotate(lean);
      A.ellipse(ctx, 3, 14, 8, 4, 'rgba(0,0,0,0.3)');
      if (th.pole === 'antenna') {
        A.line(ctx, 0, 14, 0, -18, '#555b60', 2.5);
        for (let i = 0; i < 3; i++) A.line(ctx, -8 + i * 2, -16 + i * 7, 8 - i * 2, -16 + i * 7, '#6c7378', 1.5);
      } else {
        A.line(ctx, 0, 14, 0, -16, '#4b4f54', 4);
        A.line(ctx, 0, -16, 9, -18, '#4b4f54', 3);
        A.circle(ctx, 10, -16, 3.5, '#d8d4b4');
        A.circle(ctx, 10, -16, 7, 'rgba(255,240,180,0.12)');
      }
      ctx.restore();
    }

    paintSpawn(ctx, rng) {
      const enemiesAreRodents = this.game.level.faction === 'gatos';
      if (enemiesAreRodents) {
        A.ellipse(ctx, 0, 6, 18, 9, '#6a4b2a'); A.ellipse(ctx, 0, 4, 15, 7, '#8a6a46');
        A.ellipse(ctx, 0, 2, 12, 6, '#1c1612');
        A.ellipse(ctx, 0, 1, 8, 3.5, '#000');
        for (let i = 0; i < 3; i++) A.circle(ctx, 10 - i * 9 + rng() * 2, 12 + rng() * 3, 1.4, 'rgba(0,0,0,0.2)');
      } else {
        A.ellipse(ctx, 0, 14, 20, 6, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = '#6a6f74'; ctx.fillRect(-20, -16, 40, 32);
        ctx.fillStyle = '#595e63'; for (let i = 0; i < 4; i++) ctx.fillRect(-20 + (i % 2) * 20, -16 + Math.floor(i / 2) * 16, 20, 16);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(-20, -16, 40, 32);
        ctx.fillStyle = '#120f12'; ctx.beginPath(); ctx.moveTo(-11, 16); ctx.lineTo(-11, -2); ctx.quadraticCurveTo(0, -16, 11, -2); ctx.lineTo(11, 16); ctx.closePath(); ctx.fill();
        A.ellipse(ctx, -4, 2, 1.8, 1.2, '#f1c74c'); A.ellipse(ctx, 4, 2, 1.8, 1.2, '#f1c74c');
      }
    }

    paintExit(ctx, rng) {
      const faction = this.game.faction;
      const isCats = this.game.level.faction === 'gatos';
      A.ellipse(ctx, 0, 16, 22, 7, 'rgba(0,0,0,0.3)');
      if (isCats) {
        // La Despensa: puerta de madera con latas apiladas.
        ctx.fillStyle = '#8b5a2b'; ctx.fillRect(-18, -14, 36, 30);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.2;
        for (let x = -18; x <= 18; x += 9) { ctx.beginPath(); ctx.moveTo(x, -14); ctx.lineTo(x, 16); ctx.stroke(); }
        ctx.fillStyle = '#5a3a1b'; ctx.fillRect(-18, -14, 36, 4); ctx.fillRect(-18, 12, 36, 4);
        ctx.fillStyle = '#2a1d12'; ctx.beginPath(); ctx.moveTo(-8, 14); ctx.lineTo(-8, 0); ctx.quadraticCurveTo(0, -10, 8, 0); ctx.lineTo(8, 14); ctx.closePath(); ctx.fill();
        for (let i = 0; i < 3; i++) {
          const x = -12 + i * 12, y = -20;
          ctx.fillStyle = '#c9d3d9'; ctx.fillRect(x - 4, y - 4, 8, 10); A.ellipse(ctx, x, y - 4, 4, 1.8, '#e3ebf0'); A.ellipse(ctx, x, y + 6, 4, 1.8, '#9fb0ba');
          ctx.fillStyle = ['#e5484d', '#4fa3e0', '#f1c74c'][i]; ctx.fillRect(x - 4, y - 1, 8, 4);
        }
      } else {
        // El Granero: túnel bajo un montículo con sacos de grano.
        A.ellipse(ctx, 0, 4, 22, 14, '#7c5e35'); A.ellipse(ctx, 0, 2, 20, 12, '#9b7a4b');
        ctx.strokeStyle = '#6f9a4c'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) A.line(ctx, -16 + i * 8, -6 + (i % 2) * 3, -17 + i * 8, -12 + (i % 2) * 3, '#8aa650', 1.5);
        ctx.fillStyle = '#2a1d12'; ctx.beginPath(); ctx.moveTo(-8, 14); ctx.lineTo(-8, 2); ctx.quadraticCurveTo(0, -8, 8, 2); ctx.lineTo(8, 14); ctx.closePath(); ctx.fill();
        for (const [x, y] of [[-16, 10], [16, 10], [-13, 0]]) { A.ellipse(ctx, x, y, 6, 5, '#d9c19c'); A.ellipse(ctx, x, y - 4, 2.5, 1.5, '#b89a6a'); A.circle(ctx, x - 1, y + 1, 1, '#b89a6a'); A.circle(ctx, x + 2, y + 2, 1, '#b89a6a'); }
        for (let i = 0; i < 3; i++) { A.line(ctx, 14 + i * 3, -2, 15 + i * 3, -16, '#c9b24a', 1.3); A.ellipse(ctx, 15 + i * 3, -16, 1.6, 3.5, '#e2cd6a'); }
      }
      // Banderín del bando.
      A.line(ctx, 20, 12, 20, -24, '#3a2a1a', 2);
      A.poly(ctx, [[21, -24], [33, -20], [21, -16]], faction.color);
    }

    /* ------------------------------------------------------- cada cuadro */
    draw(dt, ui = {}) {
      const ctx = this.ctx, game = this.game, map = this.map;
      this.t += dt;
      const t = this.t;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.drawImage(this.bg, 0, 0, map.width, map.height);
      this.drawWater(ctx, t);

      // Casillas construibles resaltadas mientras se coloca una unidad.
      if (ui.placing) {
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        for (let r = 0; r < map.rows; r++) for (let c = 0; c < map.cols; c++) {
          if (map.isBuildable(c, r) && !game.towerAt(c, r)) ctx.fillRect(c * TILE + 2, r * TILE + 2, TILE - 4, TILE - 4);
        }
      }
      if (ui.selected && game.towers.includes(ui.selected)) this.drawRange(ctx, ui.selected.x, ui.selected.y, ui.selected.rangePx, 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.07)');

      // Unidades y enemigos ordenados por profundidad.
      const items = [];
      for (const tw of game.towers) items.push({ y: tw.y + 10, tower: tw });
      for (const e of game.enemies) items.push({ y: e.y, enemy: e });
      items.sort((a, b) => a.y - b.y);
      for (const it of items) {
        if (it.tower) this.drawTower(ctx, it.tower, t, it.tower === ui.selected);
        else this.drawEnemy(ctx, it.enemy, t);
      }
      for (const p of game.projectiles) this.drawProjectile(ctx, p, t);
      for (const fx of game.effects) this.drawEffect(ctx, fx);

      if (ui.placing && ui.hover) this.drawGhost(ctx, ui.placing, ui.hover, t);
      else if (ui.hover && !ui.placing) {
        const tw = game.towerAt(ui.hover.c, ui.hover.r);
        if (tw && tw !== ui.selected) this.drawRange(ctx, tw.x, tw.y, tw.rangePx, 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.04)');
      }
    }

    drawWater(ctx, t) {
      const th = this.theme;
      ctx.strokeStyle = th.waterLight; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.globalAlpha = 0.7;
      for (const { c, r } of this.map.water) {
        const x0 = c * TILE, y0 = r * TILE;
        for (let k = 0; k < 2; k++) {
          const ph = (t * 0.6 + c * 0.7 + r * 1.3 + k * 2.1);
          const x = x0 + 8 + ((ph * 10) % 30), y = y0 + 12 + k * 20 + Math.sin(ph) * 3;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 5, y - 2, x + 10, y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    drawRange(ctx, x, y, r, stroke, fill) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
    }

    drawTower(ctx, tw, t, selected) {
      ctx.save();
      ctx.translate(tw.x, tw.y);
      if (selected) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-TILE / 2 + 1, -TILE / 2 + 1, TILE - 2, TILE - 2); }
      const seat = A.drawBase(ctx, tw.def.base, { anim: tw.anim, level: tw.level });
      ctx.save();
      ctx.translate(seat.x, seat.y);
      A.drawSit(ctx, tw.def.look, { t, seed: tw.seed, facing: tw.facing, anim: tw.anim, scale: seat.scale, mouthOpen: tw.def.attack === 'pulse' ? tw.anim : 0 });
      ctx.restore();
      // Estrellas de mejora.
      for (let i = 0; i < tw.level; i++) {
        const x = (i - (tw.level - 1) / 2) * 8;
        A.poly(ctx, [[x, 16], [x + 3, 19.5], [x, 23], [x - 3, 19.5]], '#f1c74c');
      }
      ctx.restore();
    }

    drawEnemy(ctx, e, t) {
      const r = e.radiusPx;
      const angle = Math.atan2(e.dy, e.dx);
      ctx.save();
      ctx.translate(e.x, e.y);
      A.ellipse(ctx, 0, 3, r * 1.1, r * 0.55, 'rgba(0,0,0,0.25)');
      if (e.hidden) {
        if (e.def.hide.style === 'burrow') {
          const sh = Math.sin(t * 18 + e.seed) * 1.2;
          A.ellipse(ctx, 0, 2, r * 1.3, r * 0.75, '#6a4b2a'); A.ellipse(ctx, sh, -1, r * 1.1, r * 0.65, '#8a6a46'); A.ellipse(ctx, sh, -3, r * 0.6, r * 0.3, '#a07f55');
          for (let i = 0; i < 3; i++) A.circle(ctx, Math.sin(t * 7 + i * 2.1) * r, -r * 0.6 - ((t * 20 + i * 9) % 12), 1.5, '#8a6a46');
        } else {
          ctx.globalAlpha = 0.28;
          A.drawWalk(ctx, e.def.look, { t, seed: e.seed, angle, flash: e.hitFlash > 0 ? e.hitFlash / 0.12 : 0 });
          ctx.globalAlpha = 0.5;
          for (let i = 0; i < 3; i++) A.circle(ctx, Math.sin(t * 3 + i * 2.1) * r * 0.8, Math.cos(t * 2.3 + i * 1.7) * r * 0.5, r * 0.45, 'rgba(20,15,30,0.6)');
          ctx.globalAlpha = 1;
        }
      } else {
        A.drawWalk(ctx, e.def.look, { t, seed: e.seed, angle, flash: e.hitFlash > 0 ? e.hitFlash / 0.12 : 0 });
        if (e.isSlowed) {
          ctx.strokeStyle = 'rgba(160,210,255,0.9)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, TAU); ctx.stroke();
          for (let i = 0; i < 3; i++) A.circle(ctx, Math.cos(t * 4 + i * 2.1) * (r + 4), Math.sin(t * 4 + i * 2.1) * (r + 4), 1.8, '#cfe6ff');
        }
      }
      if (e.def.boss) { ctx.strokeStyle = `rgba(241,199,76,${0.4 + Math.sin(t * 4) * 0.2})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r + 7, 0, TAU); ctx.stroke(); }
      // Barra de vida.
      if (e.hp < e.maxHp) {
        const w = Math.max(20, r * 2.4), h = 4, y = -r - 10;
        const f = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-w / 2 - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = f > 0.5 ? '#6fcf62' : f > 0.25 ? '#f1c74c' : '#e5484d'; ctx.fillRect(-w / 2, y, w * f, h);
      }
      ctx.restore();
    }

    drawProjectile(ctx, p, t) {
      ctx.save();
      let y = p.y;
      if (p.lob) {
        const h = clamp(p.total * 0.3, 18, 60) * Math.sin(p.progress * Math.PI);
        A.ellipse(ctx, p.x, p.y + 4, 5, 2.5, 'rgba(0,0,0,0.25)');
        y = p.y - h;
      }
      ctx.translate(p.x, y);
      A.drawProjectile(ctx, p.kind, { t, angle: Math.atan2(p.ty - p.y, p.tx - p.x) });
      ctx.restore();
    }

    drawEffect(ctx, fx) {
      const p = clamp(fx.age / fx.life, 0, 1);
      ctx.save();
      ctx.translate(fx.x, fx.y);
      switch (fx.type) {
        case 'text':
          ctx.globalAlpha = 1 - p * p;
          ctx.font = '700 13px system-ui, -apple-system, "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(fx.text, 0, -p * 26);
          ctx.fillStyle = fx.color || '#fff'; ctx.fillText(fx.text, 0, -p * 26);
          break;
        case 'puff': {
          const r = fx.radius || 10;
          ctx.globalAlpha = (1 - p) * 0.7;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU + 0.4;
            A.circle(ctx, Math.cos(a) * r * p * 1.6, Math.sin(a) * r * p * 1.6 - p * 8, r * (0.35 + p * 0.5), fx.color || (fx.boss ? '#f1c74c' : '#cfcfcf'));
          }
          break;
        }
        case 'claw':
          ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
          ctx.rotate(-0.6);
          for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-9 + i * 2, i * 6 - 6 + p * 6); ctx.lineTo(9 + i * 2, i * 6 + 6 + p * 6); ctx.stroke(); }
          break;
        case 'ring':
          ctx.globalAlpha = 1 - p; ctx.strokeStyle = fx.color || '#fff'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, Math.max(1, fx.radius * (0.15 + 0.85 * p)), 0, TAU); ctx.stroke();
          break;
        case 'splash': {
          const col = fx.kind === 'nuez' ? '170,120,70' : '200,220,120';
          ctx.globalAlpha = (1 - p) * 0.55; A.circle(ctx, 0, 0, Math.max(1, fx.radius * (0.3 + 0.7 * p)), `rgb(${col})`);
          ctx.globalAlpha = 1 - p;
          for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; A.circle(ctx, Math.cos(a) * fx.radius * p * 1.1, Math.sin(a) * fx.radius * p * 1.1 - p * 10, 2.2, `rgb(${col})`); }
          break;
        }
        case 'hit':
          ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
          for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 2, Math.sin(a) * 2); ctx.lineTo(Math.cos(a) * (6 + p * 6), Math.sin(a) * (6 + p * 6)); ctx.stroke(); }
          break;
        case 'leak':
          ctx.globalAlpha = (1 - p) * 0.6; A.circle(ctx, 0, 0, 10 + 24 * p, '#e5484d');
          break;
        case 'dirt':
          ctx.globalAlpha = 1 - p;
          for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; A.circle(ctx, Math.cos(a) * 12 * p, Math.sin(a) * 6 * p - 14 * p + 10 * p * p, 2, '#8a6a46'); }
          break;
        case 'smoke':
          ctx.globalAlpha = (1 - p) * 0.6;
          for (let i = 0; i < 4; i++) A.circle(ctx, (i - 1.5) * 6 * (1 + p), -p * 14, 5 + p * 6, '#231c2e');
          break;
      }
      ctx.restore();
    }

    drawGhost(ctx, def, hover, t) {
      const game = this.game;
      const ok = game.canBuild(def, hover.c, hover.r);
      const x = (hover.c + 0.5) * TILE, y = (hover.r + 0.5) * TILE;
      const range = def.levels[0].range * TILE;
      this.drawRange(ctx, x, y, range, ok ? 'rgba(140,230,140,0.8)' : 'rgba(240,100,100,0.8)', ok ? 'rgba(140,230,140,0.12)' : 'rgba(240,100,100,0.12)');
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = 0.65;
      const seat = A.drawBase(ctx, def.base, {});
      ctx.translate(seat.x, seat.y);
      A.drawSit(ctx, def.look, { t, seed: 3, scale: seat.scale });
      ctx.restore();
    }
  }

  TD.Renderer = Renderer;
})();
