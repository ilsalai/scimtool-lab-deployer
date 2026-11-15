/* Nueve Vidas · entidades: roedores, gatos y proyectiles.
 * Sin dependencias del DOM: la misma lógica corre en el navegador y en Node. */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});
  const TILE = TD.TILE;
  const { dist, clamp } = TD.util;

  TD.CAT_NAMES = [
    'Bigotes', 'Michi', 'Pelusa', 'Garfio', 'Nube', 'Tizón', 'Canela', 'Olivo', 'Mora', 'Ceniza',
    'Trueno', 'Lúa', 'Félix', 'Noa', 'Tigre', 'Mancha', 'Pirata', 'Salem', 'Ámbar', 'Musgo',
    'Trufa', 'Sombra', 'Chispa', 'Nácar', 'Rufo', 'Brisa', 'Coco', 'Simba', 'Misifú', 'Pancho',
    'Kiwi', 'Zarina', 'Bruno', 'Greta', 'Ígor', 'Luna', 'Dante', 'Frida', 'Romeo', 'Olga',
    'Nico', 'Mimi', 'Tom', 'Benito', 'Gala', 'Lolo', 'Odín', 'Pepa', 'Hugo', 'Zoe',
  ];

  /* ------------------------------------------------------------------ Roedor */
  class Enemy {
    /** extra: { look, label, echo } permite que un enemigo concreto tenga aspecto y nombre propios (los ecos). */
    constructor(game, def, pathIndex, startDist = 0, extra = null) {
      this.game = game;
      this.def = def;
      this.look = (extra && extra.look) || def.look;
      this.label = (extra && extra.label) || null;
      this.echo = (extra && extra.echo) || null;
      // Ladrones: al llegar a la base no gastan vidas; roban y vuelven por donde vinieron.
      this.returning = false;
      this.escaped = false;
      this.carried = 0;
      this.walked = 0;
      this.id = game.nextId++;
      this.pathIndex = pathIndex;
      this.path = game.map.paths[pathIndex];
      this.dist = startDist;
      this.maxHp = def.hp * (game.hpMult || 1);
      this.hp = this.maxHp;
      this.slow = null;
      this.dead = false;
      this.leaked = false;
      this.hidden = false;
      this.hideTimer = def.hide ? def.hide.up : 0;
      this.summonTimer = def.summon ? def.summon.every : 0;
      this.age = 0;
      this.hitFlash = 0;
      this.seed = Math.random() * 1000;
      this.x = 0; this.y = 0; this.dx = 1; this.dy = 0;
      this._updatePos();
    }

    get alive() { return !this.dead && !this.leaked && !this.escaped; }
    get carrying() { return this.carried > 0; }
    get isThief() { return this.def.steals != null; }
    /** Se le puede apuntar (vivo y a la vista). */
    get targetable() { return this.alive && !this.hidden; }
    /** Distancia que le falta para hacer daño, en píxeles: hasta la base, o hasta escapar si vuelve con botín. */
    get remaining() { return this.returning ? this.dist : this.path.length - this.dist; }
    get radiusPx() { return this.def.radius * TILE; }
    get isSlowed() { return !!this._activeSlow(); }

    /** Frenado vigente. Cuando el principal expira, entra el de respaldo (más débil pero más largo). */
    _activeSlow() {
      const now = this.game.time;
      while (this.slow && this.slow.until <= now) this.slow = this.slow.next || null;
      return this.slow;
    }

    speedNow() {
      let s = (this.returning && this.def.speedLoaded ? this.def.speedLoaded : this.def.speed) * TILE;
      const sl = this._activeSlow();
      if (sl) s *= 1 - sl.factor;
      return s;
    }

    update(dt) {
      if (!this.alive) return;
      this.age += dt;
      this.hitFlash = Math.max(0, this.hitFlash - dt);

      if (this.def.hide) {
        this.hideTimer -= dt;
        if (this.hideTimer <= 0) {
          this.hidden = !this.hidden;
          this.hideTimer = this.hidden ? this.def.hide.down : this.def.hide.up;
          this.game.addEffect({ type: this.def.hide.style === 'shadow' ? 'smoke' : 'dirt', x: this.x, y: this.y, life: 0.5 });
        }
      }
      if (this.def.summon) {
        this.summonTimer -= dt;
        if (this.summonTimer <= 0) {
          this.summonTimer = this.def.summon.every;
          for (let i = 0; i < this.def.summon.count; i++) {
            this.game.spawnEnemy(this.def.summon.enemy, this.pathIndex, Math.max(0, this.dist - TILE * (0.4 + i * 0.3)));
          }
          this.game.addEffect({ type: 'ring', x: this.x, y: this.y, color: 'rgba(200,60,60,0.6)', radius: TILE * 1.2, life: 0.5 });
          this.game.emit('summon', this);
        }
      }

      const step = this.speedNow() * dt;
      this.walked += step;
      if (this.returning) {
        // Vuelve con el botín hacia la entrada.
        this.dist -= step;
        if (this.dist <= 0) {
          this.dist = 0;
          this.escaped = true;
          this._updatePos();
          this.game.onEscape(this);
          return;
        }
        this._updatePos();
        return;
      }
      this.dist += step;
      if (this.dist >= this.path.length) {
        if (this.isThief) {
          this.dist = this.path.length;
          this.returning = true;
          this._updatePos();
          this.game.onSteal(this);
          return;
        }
        this.leaked = true;
        this._updatePos();
        this.game.onLeak(this);
        return;
      }
      this._updatePos();
    }

    _updatePos() {
      const p = this.game.map.posAt(this.path, this.dist);
      this.x = p.x; this.y = p.y;
      // Al volver mira hacia la salida.
      this.dx = this.returning ? -p.dx : p.dx;
      this.dy = this.returning ? -p.dy : p.dy;
    }

    /** Aplica daño teniendo en cuenta la armadura. Devuelve el daño real. */
    takeDamage(amount, { pierce = false, source = null } = {}) {
      if (!this.alive) return 0;
      const dmg = pierce ? amount : Math.max(1, amount - this.def.armor);
      this.hp -= dmg;
      this.hitFlash = 0.12;
      if (source) source.damageDealt += dmg;
      if (this.hp <= 0) {
        this.hp = 0;
        this.dead = true;
        if (source) source.kills++;
        this.game.onKill(this, source);
      }
      return dmg;
    }

    applySlow(factor, duration) {
      const until = this.game.time + duration;
      const cur = this._activeSlow();
      if (!cur || factor > cur.factor) {
        // Manda el nuevo; el anterior queda de respaldo si dura más.
        this.slow = { factor, until, next: cur && cur.until > until ? { factor: cur.factor, until: cur.until, next: null } : null };
      } else if (factor === cur.factor) {
        cur.until = Math.max(cur.until, until);
      } else if (until > cur.until && (!cur.next || factor >= cur.next.factor)) {
        // Más débil pero más duradero: entra cuando el fuerte expire.
        cur.next = { factor, until, next: null };
      }
    }
  }

  /* -------------------------------------------------------------------- Gato */
  class Tower {
    constructor(game, def, c, r) {
      this.game = game;
      this.def = def;
      this.id = game.nextId++;
      this.c = c; this.r = r;
      const p = game.map.center(c, r);
      this.x = p.x; this.y = p.y;
      this.level = 0;
      this.cooldown = 0.3;
      this.targeting = def.targeting || 'first';
      this.invested = def.cost;
      const faction = TD.factions[def.faction];
      this.name = TD.util.pick((faction && faction.names) || TD.CAT_NAMES, game.rng);
      this.facing = 1;
      this.anim = 0;       // animación de ataque (1 → 0)
      this.target = null;
      this.kills = 0;
      this.damageDealt = 0;
      this.seed = game.rng() * 100;
    }

    get stats() { return this.def.levels[this.level]; }
    get rangePx() { return this.stats.range * TILE; }
    get maxLevel() { return this.def.levels.length - 1; }
    get canUpgrade() { return this.level < this.maxLevel; }
    get upgradeCost() { return this.canUpgrade ? this.def.levels[this.level + 1].cost : 0; }
    get sellValue() { return Math.floor(this.invested * 0.7); }

    upgrade() {
      if (!this.canUpgrade) return false;
      this.invested += this.upgradeCost;
      this.level++;
      return true;
    }

    canSee(e) {
      if (!e.alive) return false;
      if (e.hidden && !this.def.detectsHidden) return false;
      return true;
    }
    inRange(e) {
      return dist(this.x, this.y, e.x, e.y) <= this.rangePx + e.radiusPx * 0.5;
    }

    candidates() {
      const out = [];
      for (const e of this.game.enemies) if (this.canSee(e) && this.inRange(e)) out.push(e);
      return out;
    }

    acquire() {
      let best = null, bestScore = Infinity;
      for (const e of this.game.enemies) {
        if (!this.canSee(e) || !this.inRange(e)) continue;
        let score;
        switch (this.targeting) {
          // Ladrones primero: los que ya llevan botín (el más cerca de escapar), luego los que vienen a robar.
          case 'loot': score = (e.carrying ? -2e6 : e.isThief ? -1e6 : 0) + e.remaining; break;
          case 'last': score = -e.remaining; break;
          case 'strong': score = -e.hp * 1000 + e.remaining; break;
          case 'near': score = dist(this.x, this.y, e.x, e.y); break;
          default: score = e.remaining; // 'first'
        }
        if (score < bestScore) { bestScore = score; best = e; }
      }
      return best;
    }

    update(dt) {
      this.cooldown -= dt;
      this.anim = Math.max(0, this.anim - dt * 3);
      if (this.cooldown > 0) return;
      const st = this.stats;

      if (this.def.attack === 'pulse') {
        const list = this.candidates();
        if (!list.length) return;
        for (const e of list) {
          if (st.slow) e.applySlow(st.slow, st.slowDuration || 2);
          if (st.damage) e.takeDamage(st.damage, { pierce: !!this.def.pierce, source: this });
        }
        this.anim = 1;
        this.cooldown = 1 / st.rate;
        this.game.addEffect({ type: 'ring', x: this.x, y: this.y - 6, radius: this.rangePx, color: this.def.pulseColor || 'rgba(170,200,255,0.8)', life: 0.6 });
        this.game.emit('pulse', this);
        return;
      }

      const target = this.acquire();
      if (!target) return;
      this.target = target;
      this.facing = target.x >= this.x ? 1 : -1;
      this.anim = 1;
      this.cooldown = 1 / st.rate;

      if (this.def.attack === 'melee') {
        target.takeDamage(st.damage, { pierce: !!this.def.pierce, source: this });
        this.game.addEffect({ type: 'claw', x: target.x, y: target.y, life: 0.3 });
        this.game.emit('pounce', this);
      } else {
        this.game.projectiles.push(new Projectile(this.game, this, target));
        this.game.emit(this.def.attack === 'lob' ? 'lob' : 'shoot', this);
      }
    }
  }

  /* --------------------------------------------------------------- Proyectil */
  class Projectile {
    constructor(game, tower, target) {
      const st = tower.stats;
      this.game = game;
      this.tower = tower;
      this.target = target;
      this.kind = tower.def.projectile || (tower.def.attack === 'lob' ? 'sardina' : tower.def.pierce ? 'dardo' : 'piedra');
      this.x = tower.x; this.y = tower.y - 14;
      this.tx = target.x; this.ty = target.y;
      this.speed = (tower.def.projSpeed || 8) * TILE;
      this.damage = st.damage;
      this.splash = (st.splash || 0) * TILE;
      this.pierce = !!tower.def.pierce;
      this.lob = tower.def.attack === 'lob';
      this.total = Math.max(1, dist(this.x, this.y, this.tx, this.ty));
      this.travel = 0;
      this.done = false;
    }

    get progress() { return clamp(this.travel / this.total, 0, 1); }

    update(dt) {
      if (this.done) return;
      if (this.target && this.target.alive) { this.tx = this.target.x; this.ty = this.target.y; }
      const d = dist(this.x, this.y, this.tx, this.ty);
      const step = this.speed * dt;
      if (d <= step || d < 1.5) { this.x = this.tx; this.y = this.ty; this._impact(); return; }
      this.x += ((this.tx - this.x) / d) * step;
      this.y += ((this.ty - this.y) / d) * step;
      this.travel += step;
    }

    _impact() {
      this.done = true;
      const opts = { pierce: this.pierce, source: this.tower };
      if (this.splash > 0) {
        for (const e of this.game.enemies) {
          if (!this.tower.canSee(e)) continue;
          if (dist(e.x, e.y, this.tx, this.ty) <= this.splash + e.radiusPx) e.takeDamage(this.damage, opts);
        }
        this.game.addEffect({ type: 'splash', x: this.tx, y: this.ty, radius: this.splash, life: 0.45, kind: this.kind });
        this.game.emit('splash', this);
      } else {
        if (this.target && this.tower.canSee(this.target)) this.target.takeDamage(this.damage, opts);
        this.game.addEffect({ type: 'hit', x: this.tx, y: this.ty, life: 0.15 });
      }
    }
  }

  TD.Enemy = Enemy;
  TD.Tower = Tower;
  TD.Projectile = Projectile;
})();
