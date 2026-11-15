/* Nueve Vidas · registro de contenido.
 * Los niveles, unidades (torres), enemigos y facciones se declaran en archivos
 * de datos que llaman a estas funciones. Para agregar un nivel basta con crear
 * un archivo en js/levels/ que llame a TD.registerLevel({...}) y cargarlo desde
 * index.html. Ver js/levels/_plantilla.js. */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});

  TD.levels = [];
  TD.towers = {};
  TD.towerOrder = [];
  TD.enemies = {};
  TD.factions = {};

  TD.registerFaction = function (def) {
    if (!def || !def.id) throw new Error('registerFaction: la facción necesita un id');
    TD.factions[def.id] = def;
    return def;
  };

  TD.registerEnemy = function (def) {
    if (!def || !def.id) throw new Error('registerEnemy: el enemigo necesita un id');
    if (!def.faction) throw new Error(`registerEnemy: "${def.id}" necesita "faction" (a qué bando pertenece)`);
    for (const k of ['hp', 'speed']) {
      if (!(Number.isFinite(def[k]) && def[k] > 0)) throw new Error(`registerEnemy: "${def.id}" necesita "${k}" (un número mayor que 0)`);
    }
    // Valores por defecto seguros: sin ellos las vidas o la moneda acabarían en NaN.
    if (!Number.isFinite(def.lives)) def.lives = 1;
    if (!Number.isFinite(def.reward)) def.reward = 0;
    if (!Number.isFinite(def.armor)) def.armor = 0;
    if (!Number.isFinite(def.radius)) def.radius = 0.3;
    TD.enemies[def.id] = def;
    return def;
  };

  TD.registerTower = function (def) {
    if (!def || !def.id) throw new Error('registerTower: la unidad necesita un id');
    if (!def.faction) throw new Error(`registerTower: "${def.id}" necesita "faction" (a qué bando pertenece)`);
    if (!Array.isArray(def.levels) || !def.levels.length) {
      throw new Error(`registerTower: "${def.id}" necesita al menos un nivel en "levels"`);
    }
    if (!Number.isFinite(def.cost)) throw new Error(`registerTower: "${def.id}" necesita "cost" (precio)`);
    def.levels.forEach((l, i) => {
      for (const k of ['damage', 'range', 'rate']) {
        if (!Number.isFinite(l[k]) || (k !== 'damage' && l[k] <= 0)) throw new Error(`registerTower: "${def.id}", nivel ${i + 1}: falta "${k}" o no es un número válido`);
      }
      if (i > 0 && !Number.isFinite(l.cost)) throw new Error(`registerTower: "${def.id}", nivel ${i + 1}: falta "cost" (precio de la mejora)`);
    });
    TD.towers[def.id] = def;
    if (!TD.towerOrder.includes(def.id)) TD.towerOrder.push(def.id);
    return def;
  };

  TD.registerLevel = function (def) {
    if (!def || !def.id) throw new Error('registerLevel: el nivel necesita un id');
    if (TD.levels.some((l) => l.id === def.id)) throw new Error(`registerLevel: ya existe un nivel con id "${def.id}"`);
    if (!def.faction) throw new Error(`registerLevel: el nivel "${def.id}" necesita "faction" ('gatos' o 'roedores')`);
    if (!def.name) def.name = def.id;
    if (!Array.isArray(def.waves) || !def.waves.length) {
      throw new Error(`registerLevel: el nivel "${def.id}" necesita al menos una oleada en "waves"`);
    }
    // Sin "order", el nivel va al final de la campaña de su bando (o al final de todo si es el primero).
    if (def.order == null) {
      const mine = TD.levels.filter((l) => l.faction === def.faction);
      const pool = mine.length ? mine : TD.levels;
      def.order = pool.reduce((m, l) => Math.max(m, l.order), 0) + 1;
    }
    TD.levels.push(def);
    TD.levels.sort((a, b) => a.order - b.order);
    return def;
  };

  /** Niveles de una facción, en orden de campaña. */
  TD.levelsOf = (faction) => TD.levels.filter((l) => l.faction === faction);

  /**
   * Atajo para declarar un grupo de una oleada.
   * g(enemigo, cantidad, segundosEntreCadaUno, retrasoInicial, caminoIndex)
   * Ejemplo: TD.g('raton', 8, 0.9, 2) → 8 ratones, uno cada 0.9 s, empezando a los 2 s.
   */
  TD.g = function (enemy, count, interval = 1, delay = 0, path = 0) {
    return { enemy, count, interval, delay, path };
  };
})();
