/* Nueve Vidas · la campaña y la Rueda.
 * Guarda el personaje actual, sus oportunidades (vidas o escapes), el progreso
 * de cada bando y la Crónica (el relato de todas las encarnaciones). */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});
  const KEY = 'nueveVidas.campaign.v1';
  const MAX_LIVES = 9;

  const storage = {
    get() { try { return globalThis.localStorage ? localStorage.getItem(KEY) : null; } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* sin almacenamiento: se juega igual */ } },
    del() { try { localStorage.removeItem(KEY); } catch (e) { /* idem */ } },
  };

  class Campaign {
    constructor() {
      this.data = null;
      this.dev = false;
      this.load();
    }

    load() {
      const raw = storage.get();
      if (!raw) return;
      try { this.data = JSON.parse(raw); } catch (e) { this.data = null; }
      if (this.data && (!this.data.progress || !this.data.character)) this.data = null;
    }
    save() { if (this.data) storage.set(JSON.stringify(this.data)); }
    reset() { this.data = null; storage.del(); }

    get exists() { return !!this.data; }
    get faction() { return this.data ? TD.factions[this.data.faction] : null; }
    get character() { return this.data ? this.data.character : null; }
    get lives() { return this.data ? this.data.lives : MAX_LIVES; }
    get maxLives() { return MAX_LIVES; }

    /** Crea un personaje nuevo del bando indicado, evitando repetir nombres ya usados. */
    makeCharacter(factionId, rng = Math.random) {
      const f = TD.factions[factionId];
      const look = TD.util.pick(f.looks, rng);
      const used = this.data ? this.data.chronicle.filter((e) => e.kind === 'born').map((e) => e.name) : [];
      let name = TD.util.pick(f.names, rng);
      for (let i = 0; i < 30 && used.includes(name); i++) name = TD.util.pick(f.names, rng);
      return { name, look: look.look, label: look.label, article: look.article, faction: factionId };
    }

    newGame() {
      const character = this.makeCharacter('gatos');
      this.data = {
        version: 1,
        created: Date.now(),
        faction: 'gatos',
        character,
        lives: MAX_LIVES,
        incarnation: 1,
        progress: { gatos: {}, roedores: {} },
        wars: {},
        chronicle: [],
      };
      const text = TD.factions.gatos.firstLife(character.name, character);
      this.log('born', text, { name: character.name, faction: 'gatos' });
      this.save();
      return { character, text };
    }

    log(kind, text, extra = {}) {
      this.data.chronicle.push({ kind, text, time: Date.now(), incarnation: this.data.incarnation, faction: this.data.faction, ...extra });
      if (this.data.chronicle.length > 500) this.data.chronicle.splice(0, this.data.chronicle.length - 500);
    }

    /** Registra `lost` oportunidades perdidas en el nivel `levelName`.
     *  Devuelve un relato por cada una: { k, text, ninth, remaining }. */
    loseLives(lost, levelName) {
      const f = this.faction;
      const out = [];
      for (let i = 0; i < lost && this.data.lives > 0; i++) {
        const k = MAX_LIVES - this.data.lives + 1; // número de la oportunidad que se pierde (1..9)
        this.data.lives--;
        const ninth = k >= MAX_LIVES;
        const text = ninth ? f.ninth(this.character.name, levelName) : f.deaths[Math.min(k - 1, f.deaths.length - 1)];
        out.push({ k, text, ninth, remaining: this.data.lives });
        this.log(ninth ? 'ninth' : 'death', text, { k, level: levelName });
      }
      this.save();
      return out;
    }

    setLives(n) { this.data.lives = Math.max(0, Math.min(MAX_LIVES, n)); this.save(); }

    /** Marca un nivel como ganado. Devuelve { stars, warWon, firstWar }. */
    completeLevel(level, livesLost) {
      const stars = livesLost === 0 ? 3 : livesLost <= 2 ? 2 : 1;
      const p = this.data.progress[level.faction];
      const prev = p[level.id];
      p[level.id] = {
        won: true,
        stars: Math.max(stars, prev ? prev.stars : 0),
        bestLost: prev ? Math.min(prev.bestLost, livesLost) : livesLost,
        times: (prev ? prev.times : 0) + 1,
      };
      const f = this.faction;
      const how = livesLost === 0
        ? ` sin perder ni ${f.livesWord === 'vida' ? 'una' : 'un'} ${f.livesWord}`
        : ` perdiendo ${livesLost} ${livesLost === 1 ? f.livesWord : f.livesPlural}`;
      this.log('win', `${this.character.name} defendió ${level.name}${how}.`, { level: level.name, stars });
      const warWon = this.isWarWon(level.faction);
      let firstWar = false;
      if (warWon && !this.character.warWon) {
        this.character.warWon = true;
        this.data.wars[level.faction] = (this.data.wars[level.faction] || 0) + 1;
        this.log('war', f.warWon(this.character.name));
        firstWar = true;
      }
      this.save();
      return { stars, warWon, firstWar };
    }

    isWarWon(factionId) {
      const levels = TD.levelsOf(factionId);
      return levels.length > 0 && levels.every((l) => this.data.progress[factionId][l.id] && this.data.progress[factionId][l.id].won);
    }

    levelProgress(level) { return this.data ? this.data.progress[level.faction][level.id] || null : null; }

    isUnlocked(level) {
      if (this.dev) return true;
      const levels = TD.levelsOf(level.faction);
      const i = levels.indexOf(level);
      if (i <= 0) return true;
      const prev = this.data.progress[level.faction][levels[i - 1].id];
      return !!(prev && prev.won);
    }

    nextLevel(level) {
      const levels = TD.levelsOf(level.faction);
      return levels[levels.indexOf(level) + 1] || null;
    }

    /** La Rueda gira: cambia de bando y crea un personaje nuevo con nueve oportunidades.
     *  reason: 'death' (se agotó la novena) o 'choice' (decisión propia). */
    turnWheel(reason) {
      const old = { ...this.character };
      const oldF = this.faction;
      const newFactionId = oldF.enemy;
      const character = this.makeCharacter(newFactionId);
      this.log('wheel', reason === 'choice'
        ? `${old.name} dejó que la Rueda girara por voluntad propia.`
        : `La Rueda giró: ${old.name} se apagó y el mundo siguió su curso.`);
      this.data.faction = newFactionId;
      this.data.character = character;
      this.data.lives = MAX_LIVES;
      this.data.incarnation++;
      const text = oldF.awaken(character.name, character);
      this.log('born', text, { name: character.name, faction: newFactionId });
      this.save();
      return { old, character, text, reason };
    }
  }

  TD.Campaign = Campaign;
})();
