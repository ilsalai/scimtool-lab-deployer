/* Nueve Vidas · la campaña y la Rueda.
 * Guarda el personaje actual, sus oportunidades (vidas o escapes), el progreso
 * de cada bando, las encarnaciones pasadas y la Crónica (el relato de todas). */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});
  const KEY = 'nueveVidas.campaign.v1';
  const MAX_LIVES = 9;

  const storage = {
    get() { try { return globalThis.localStorage ? localStorage.getItem(KEY) : null; } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* sin almacenamiento: se juega igual */ } },
    del() { try { localStorage.removeItem(KEY); } catch (e) { /* idem */ } },
  };

  /** Valida y completa un guardado. Devuelve null si no se puede usar. */
  function normalize(d) {
    if (!d || typeof d !== 'object') return null;
    if (!TD.factions[d.faction]) return null;
    const ch = d.character;
    if (!ch || typeof ch !== 'object' || typeof ch.name !== 'string' || !ch.name || typeof ch.look !== 'string') return null;
    ch.faction = d.faction;
    if (typeof ch.label !== 'string') ch.label = TD.factions[d.faction].unitWord;
    if (typeof ch.article !== 'string') ch.article = 'un';
    // Unas vidas ilegibles (por ejemplo un NaN guardado como null) se reparan; no deben hacer girar la Rueda.
    if (!Number.isInteger(d.lives) || d.lives < 0 || d.lives > MAX_LIVES) d.lives = MAX_LIVES;
    if (!d.progress || typeof d.progress !== 'object') d.progress = {};
    for (const f of Object.keys(TD.factions)) {
      if (!d.progress[f] || typeof d.progress[f] !== 'object') d.progress[f] = {};
    }
    if (!Array.isArray(d.chronicle)) d.chronicle = [];
    if (!Array.isArray(d.past)) d.past = [];
    if (!Number.isInteger(d.incarnation) || d.incarnation < 1) d.incarnation = 1;
    if (!d.wars || typeof d.wars !== 'object') d.wars = {};
    if (!d.warShown || typeof d.warShown !== 'object') {
      // Guardados anteriores marcaban la guerra en el personaje.
      d.warShown = {};
      if (ch.warWon) d.warShown[d.faction] = TD.levelsOf(d.faction).length;
    }
    return d;
  }

  class Campaign {
    constructor() {
      this.data = null;
      this.dev = false;
      this.load();
    }

    load() {
      const raw = storage.get();
      let parsed = null;
      if (raw) { try { parsed = JSON.parse(raw); } catch (e) { parsed = null; } }
      this.data = normalize(parsed);
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
        version: 2,
        created: Date.now(),
        faction: 'gatos',
        character,
        lives: MAX_LIVES,
        incarnation: 1,
        progress: { gatos: {}, roedores: {} },
        wars: {},
        warShown: {},
        past: [],
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
     *  Devuelve un relato por cada una: { k, text, ninth, remaining }.
     *  `special` permite un texto propio para la primera de ellas (por ejemplo, un eco). */
    loseLives(lost, levelName, special = null) {
      const f = this.faction;
      const out = [];
      const n = Number.isFinite(lost) ? lost : 0;
      for (let i = 0; i < n && this.data.lives > 0; i++) {
        const k = MAX_LIVES - this.data.lives + 1; // número de la oportunidad que se pierde (1..9)
        this.data.lives--;
        const ninth = k >= MAX_LIVES;
        let text = ninth ? f.ninth(this.character.name, levelName) : f.deaths[Math.min(k - 1, f.deaths.length - 1)];
        if (!ninth && i === 0 && special) text = special;
        out.push({ k, text, ninth, remaining: this.data.lives });
        this.log(ninth ? 'ninth' : 'death', text, { k, level: levelName });
      }
      this.save();
      return out;
    }

    setLives(n) {
      if (!Number.isFinite(n)) return;
      this.data.lives = Math.max(0, Math.min(MAX_LIVES, Math.round(n)));
      this.save();
    }

    /** Marca un nivel como ganado. Devuelve { stars, warWon, firstWar }.
     *  loot: { stolen, escaped } si hubo ladrones. Tres estrellas exigen no perder oportunidades ni botín. */
    completeLevel(level, livesLost, loot = null) {
      const lost = Number.isFinite(livesLost) ? livesLost : 0;
      const escaped = loot && Number.isFinite(loot.escaped) ? loot.escaped : 0;
      const stars = lost === 0 && escaped === 0 ? 3 : lost <= 2 ? 2 : 1;
      const p = this.data.progress[level.faction];
      const prev = p[level.id];
      p[level.id] = {
        won: true,
        stars: Math.max(stars, prev ? prev.stars : 0),
        bestLost: prev ? Math.min(prev.bestLost, lost) : lost,
        times: (prev ? prev.times : 0) + 1,
      };
      const f = this.faction;
      const how = lost === 0
        ? ` sin perder ni ${f.livesWord === 'vida' ? 'una' : 'un'} ${f.livesWord}`
        : ` perdiendo ${lost} ${lost === 1 ? f.livesWord : f.livesPlural}`;
      let lootLine = '';
      if (loot && loot.stolen > 0) {
        lootLine = escaped > 0
          ? ` Los ladrones se llevaron ${escaped} ${f.currency}.`
          : ` Los ladrones no se llevaron nada: todo lo robado volvió.`;
      }
      this.log('win', `${this.character.name} defendió ${level.name}${how}.${lootLine}`, { level: level.name, stars });
      this.save();
      // La guerra se celebra cuando el jugador VE la pantalla (markWarShown), no aquí:
      // así cerrar el juego en el resultado no la pierde.
      return { stars, warWon: this.isWarWon(level.faction), firstWar: this.warPending() };
    }

    isWarWon(factionId) {
      const levels = TD.levelsOf(factionId);
      return levels.length > 0 && levels.every((l) => this.data.progress[factionId][l.id] && this.data.progress[factionId][l.id].won);
    }

    /** La guerra del bando actual está ganada y todavía no se le mostró al jugador. */
    warPending() {
      if (!this.data) return false;
      const f = this.data.faction;
      return this.isWarWon(f) && (this.data.warShown[f] || 0) < TD.levelsOf(f).length;
    }

    /** Deja constancia de la guerra ganada (una vez por bando y por conjunto de niveles). */
    markWarShown() {
      const f = this.data.faction;
      if (!this.warPending()) return;
      this.data.warShown[f] = TD.levelsOf(f).length;
      this.data.wars[f] = (this.data.wars[f] || 0) + 1;
      this.log('war', this.faction.warWon(this.character.name));
      this.save();
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

    /** Eco para un nivel: la vida pasada más reciente del jugador en el bando que ahora ataca. */
    echoFor(level) {
      const f = TD.factions[level.faction];
      const past = f ? this.pastOf(f.enemy)[0] : null;
      return past ? { name: past.name, look: past.look } : null;
    }

    /** Encarnaciones pasadas del bando indicado, de la más reciente a la más antigua. */
    pastOf(factionId) {
      return this.data ? this.data.past.filter((p) => p.faction === factionId).reverse() : [];
    }

    /** La Rueda gira: cambia de bando y crea un personaje nuevo con nueve oportunidades.
     *  reason: 'death' (se agotó la novena) o 'choice' (decisión propia). */
    turnWheel(reason, lastLevel = null) {
      const old = { ...this.character };
      const oldF = this.faction;
      const newFactionId = oldF.enemy;
      this.data.past.push({
        name: old.name, look: old.look, label: old.label, article: old.article,
        faction: this.data.faction, incarnation: this.data.incarnation, end: reason, level: lastLevel,
      });
      if (this.data.past.length > 60) this.data.past.splice(0, this.data.past.length - 60);
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

  Campaign.KEY = KEY;
  TD.Campaign = Campaign;
})();
