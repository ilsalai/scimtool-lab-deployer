/* Nueve Vidas · utilidades compartidas.
 * Todos los archivos del juego cuelgan del espacio de nombres global `TD`
 * (Tower Defense). Cada archivo es una IIFE para no ensuciar el ámbito global
 * y para que el mismo código funcione en el navegador y en Node (herramientas). */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});

  /** Tamaño de una casilla del mapa, en píxeles lógicos. */
  TD.TILE = 48;

  TD.util = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),

    /** Generador pseudoaleatorio determinista (mulberry32). Se usa para que la
     *  decoración del mapa (pasto, grietas, flores) sea siempre la misma. */
    rng(seed) {
      let s = seed >>> 0;
      return function () {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    hashStr(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    },

    pick: (arr, r = Math.random) => arr[Math.floor(r() * arr.length)],

    /** Redondea a 1 decimal para mostrar estadísticas. */
    fmt1: (n) => String(Math.round(n * 10) / 10),
  };
})();
