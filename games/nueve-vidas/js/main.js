/* Nueve Vidas · arranque. Valida el contenido y levanta la interfaz. */
(function () {
  const TD = globalThis.TD;

  // Compatibilidad: roundRect no existe en navegadores viejos.
  if (globalThis.CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      this.moveTo(x + rr, y);
      this.arcTo(x + w, y, x + w, y + h, rr); this.arcTo(x + w, y + h, x, y + h, rr);
      this.arcTo(x, y + h, x, y, rr); this.arcTo(x, y, x + w, y, rr);
      this.closePath();
    };
  }

  function fatal(err) {
    console.error(err);
    const ov = document.getElementById('overlay');
    ov.classList.remove('hidden');
    ov.innerHTML = `<section class="screen"><h2>Hay un problema en el contenido del juego</h2>
      <p class="lead">${String(err && err.message ? err.message : err).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</p>
      <p class="hint">Revisa el archivo del nivel o de la unidad que acabas de tocar. El mapa debe tener filas del mismo largo, una sola E, al menos una S y un camino de # que las una.</p></section>`;
  }

  window.addEventListener('DOMContentLoaded', () => {
    try {
      if (!TD.levels.length) throw new Error('No hay niveles cargados. Agrega los <script> de js/levels/ en index.html.');
      // Construir cada nivel una vez detecta mapas rotos o enemigos inexistentes antes de jugar.
      for (const lv of TD.levels) new TD.Game(lv);
      TD.ui = new TD.UI();
    } catch (err) {
      fatal(err);
    }
  });
})();
