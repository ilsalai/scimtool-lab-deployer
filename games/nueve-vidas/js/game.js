/* Nueve Vidas · estado y reglas del juego.
 * No toca el DOM ni el canvas: emite eventos (onEvent) que la interfaz y el
 * audio interpretan. Así la misma clase sirve para simular partidas en Node. */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});
  const TILE = TD.TILE;

  class Game {
    constructor(level, opts = {}) {
      this.level = level;
      this.onEvent = opts.onEvent || (() => {});
      this.rng = opts.rng || Math.random;
      this.map = new TD.GameMap(level);
      this.waves = normalizeWaves(level, this.map);
      this.availableTowers = (level.towers || TD.towerOrder.filter((id) => TD.towers[id].faction === level.faction)).map((id) => {
        const def = TD.towers[id];
        if (!def) throw new Error(`Nivel "${level.id}": la unidad "${id}" no existe`);
        if (def.faction !== level.faction) throw new Error(`Nivel "${level.id}": la unidad "${id}" es de ${def.faction}, no de ${level.faction}`);
        return def;
      });

      this.faction = TD.factions[level.faction];
      if (!this.faction) throw new Error(`Nivel "${level.id}": la facción "${level.faction}" no existe`);
      this.cans = level.startCans ?? 150;
      // Las vidas son del personaje, no del nivel: la campaña las pasa en opts.lives.
      this.maxLives = 9;
      this.lives = opts.lives ?? level.lives ?? 9;
      this.livesAtStart = this.lives;
      this.hpMult = level.hpMult ?? 1;
      this.countdownTotal = level.countdown ?? 25;

      this.state = 'build'; // build | wave | countdown | victory | defeat
      this.waveIndex = -1;  // última oleada lanzada
      this.spawnQueue = [];
      this.waveClock = 0;
      this.countdown = 0;
      this.time = 0;
      this.nextId = 1;

      this.enemies = [];
      this.towers = [];
      this.projectiles = [];
      this.effects = [];
      this.stats = { kills: 0, leaked: 0, spent: 0, earned: 0, bonus: 0 };
    }

    get totalWaves() { return this.waves.length; }
    get currentWaveNumber() { return this.waveIndex + 1; }
    get nextWave() { return this.waves[this.waveIndex + 1] || null; }
    get finished() { return this.state === 'victory' || this.state === 'defeat'; }
    get canStartWave() { return !!this.nextWave && (this.state === 'build' || this.state === 'countdown'); }

    emit(type, payload) { this.onEvent(type, payload, this); }

    /* ----------------------------------------------------------- oleadas */
    startNextWave(early = false) {
      if (!this.canStartWave) return false;
      if (early && this.state === 'countdown') {
        const bonus = Math.ceil(this.countdown);
        if (bonus > 0) {
          this.cans += bonus;
          this.stats.bonus += bonus;
          this.stats.earned += bonus;
          this.emit('bonus', bonus);
        }
      }
      this.waveIndex++;
      const wave = this.waves[this.waveIndex];
      this.spawnQueue = [];
      for (const g of wave.groups) {
        for (let i = 0; i < g.count; i++) {
          this.spawnQueue.push({ t: g.delay + i * g.interval, enemy: g.enemy, path: g.path });
        }
      }
      this.spawnQueue.sort((a, b) => a.t - b.t);
      this.waveClock = 0;
      this.countdown = 0;
      this.state = 'wave';
      this.emit('waveStart', wave);
      return true;
    }

    spawnEnemy(id, pathIndex = 0, startDist = 0) {
      const def = TD.enemies[id];
      if (!def) throw new Error(`No existe el roedor "${id}"`);
      const e = new TD.Enemy(this, def, pathIndex, startDist);
      this.enemies.push(e);
      this.emit('spawn', e);
      return e;
    }

    waveBonus(waveNumber) {
      const base = this.level.waveBonus ?? 12;
      return base + 4 * waveNumber;
    }

    /* ------------------------------------------------------------- bucle */
    update(dt) {
      if (this.finished) return;
      this.time += dt;

      if (this.state === 'wave') {
        this.waveClock += dt;
        while (this.spawnQueue.length && this.spawnQueue[0].t <= this.waveClock) {
          const s = this.spawnQueue.shift();
          this.spawnEnemy(s.enemy, s.path, 0);
        }
        if (!this.spawnQueue.length && this.nextWave) {
          const bonus = this.waveBonus(this.currentWaveNumber);
          this.cans += bonus;
          this.stats.earned += bonus;
          this.state = 'countdown';
          this.countdown = this.countdownTotal;
          this.emit('waveClear', { wave: this.waves[this.waveIndex], bonus });
        }
      } else if (this.state === 'countdown') {
        this.countdown -= dt;
        if (this.countdown <= 0) this.startNextWave(false);
      }

      for (const t of this.towers) t.update(dt);
      // Los invocados se agregan al final de la lista; el bucle con índice los procesa en el siguiente tick.
      const n = this.enemies.length;
      for (let i = 0; i < n; i++) this.enemies[i].update(dt);
      if (this.finished) return;
      this.enemies = this.enemies.filter((e) => e.alive);

      for (const p of this.projectiles) p.update(dt);
      this.projectiles = this.projectiles.filter((p) => !p.done);

      for (const fx of this.effects) fx.age += dt;
      this.effects = this.effects.filter((fx) => fx.age < fx.life);

      if (this.state === 'wave' && !this.nextWave && !this.spawnQueue.length && !this.enemies.length) {
        this.state = 'victory';
        this.emit('victory', this.stats);
      }
    }

    onKill(e, source) {
      this.cans += e.def.reward;
      this.stats.kills++;
      this.stats.earned += e.def.reward;
      this.addEffect({ type: 'text', text: `+${e.def.reward}`, x: e.x, y: e.y - e.radiusPx, color: '#f1c74c', life: 0.9 });
      this.addEffect({ type: 'puff', x: e.x, y: e.y, radius: e.radiusPx, life: 0.5, boss: !!e.def.boss });
      this.emit('kill', e);
    }

    onLeak(e) {
      const before = this.lives;
      this.lives = Math.max(0, this.lives - e.def.lives);
      this.stats.leaked++;
      const lost = before - this.lives;
      const word = lost === 1 ? this.faction.livesWord : this.faction.livesPlural;
      this.addEffect({ type: 'text', text: `-${lost} ${word}`, x: e.x, y: e.y - 20, color: '#ff6b6b', life: 1.2 });
      this.addEffect({ type: 'leak', x: e.x, y: e.y, life: 0.6 });
      // "lost" vidas perdidas ahora; "remaining" las que quedan. La interfaz narra cada una.
      this.emit('leak', { enemy: e, lost, remaining: this.lives });
      if (this.lives <= 0) {
        this.state = 'defeat';
        this.emit('defeat', this.stats);
      }
    }

    /* ------------------------------------------------------ construcción */
    towerAt(c, r) { return this.towers.find((t) => t.c === c && t.r === r) || null; }

    buildReason(def, c, r) {
      if (this.finished) return 'La partida terminó';
      if (!this.availableTowers.includes(def)) return 'Ese gato no está disponible aquí';
      if (!this.map.isBuildable(c, r)) return 'Ahí no se puede construir';
      if (this.towerAt(c, r)) return 'Ya hay un gato en esa casilla';
      if (this.cans < def.cost) return `Faltan ${def.cost - this.cans} latas`;
      return null;
    }
    canBuild(def, c, r) { return this.buildReason(def, c, r) === null; }

    build(id, c, r) {
      const def = typeof id === 'string' ? TD.towers[id] : id;
      if (!def || !this.canBuild(def, c, r)) return null;
      this.cans -= def.cost;
      this.stats.spent += def.cost;
      const t = new TD.Tower(this, def, c, r);
      this.towers.push(t);
      this.addEffect({ type: 'puff', x: t.x, y: t.y + 10, radius: 14, life: 0.4, color: 'rgba(255,255,255,0.5)' });
      this.emit('build', t);
      return t;
    }

    upgrade(t) {
      if (this.finished || !t.canUpgrade || this.cans < t.upgradeCost) return false;
      this.cans -= t.upgradeCost;
      this.stats.spent += t.upgradeCost;
      t.upgrade();
      this.addEffect({ type: 'ring', x: t.x, y: t.y, radius: TILE * 0.9, color: 'rgba(241,199,76,0.9)', life: 0.5 });
      this.emit('upgrade', t);
      return true;
    }

    sell(t) {
      if (this.finished) return false;
      const i = this.towers.indexOf(t);
      if (i < 0) return false;
      this.towers.splice(i, 1);
      this.cans += t.sellValue;
      this.addEffect({ type: 'text', text: `+${t.sellValue}`, x: t.x, y: t.y - 20, color: '#f1c74c', life: 0.9 });
      this.emit('sell', t);
      return true;
    }

    addEffect(fx) {
      fx.age = 0;
      if (fx.life == null) fx.life = 0.5;
      this.effects.push(fx);
      return fx;
    }
  }

  /** Acepta oleadas como lista de grupos o como {text, groups} y las valida. */
  function normalizeWaves(level, map) {
    return level.waves.map((w, i) => {
      const wave = Array.isArray(w) ? { groups: w } : { ...w };
      wave.index = i;
      if (!Array.isArray(wave.groups) || !wave.groups.length) {
        throw new Error(`Nivel "${level.id}": la oleada ${i + 1} no tiene grupos`);
      }
      wave.groups = wave.groups.map((g) => {
        const grp = { enemy: g.enemy, count: g.count ?? 1, interval: g.interval ?? 1, delay: g.delay ?? 0, path: g.path ?? 0 };
        const edef = TD.enemies[grp.enemy];
        if (!edef) throw new Error(`Nivel "${level.id}", oleada ${i + 1}: el enemigo "${grp.enemy}" no existe`);
        if (edef.faction === level.faction) throw new Error(`Nivel "${level.id}", oleada ${i + 1}: "${grp.enemy}" es de tu propio bando (${level.faction})`);
        if (!map.paths[grp.path]) throw new Error(`Nivel "${level.id}", oleada ${i + 1}: el camino ${grp.path} no existe (hay ${map.paths.length})`);
        return grp;
      });
      wave.total = wave.groups.reduce((s, g) => s + g.count, 0);
      return wave;
    });
  }

  TD.Game = Game;
})();
