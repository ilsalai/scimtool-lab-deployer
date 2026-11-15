/* Nueve Vidas · las unidades defensoras de cada bando (las "torres").
 * Campos:
 *  faction        bando que puede comprarla
 *  cost           precio
 *  attack         'projectile' (dispara), 'lob' (lanza en arco con daño en área),
 *                 'melee' (golpe instantáneo a corta distancia), 'pulse' (onda en área)
 *  projectile     aspecto del proyectil: piedra, bellota, dardo, sardina, nuez
 *  projSpeed      velocidad del proyectil en casillas por segundo
 *  pierce         ignora la armadura del enemigo
 *  detectsHidden  ve a los enemigos ocultos (topos bajo tierra, gatos entre sombras)
 *  targeting      prioridad por defecto: 'first' (más adelantado), 'last', 'strong' (más vida), 'near'
 *  base           dónde se sienta: post, rock, stump, catapult, tallrock, mound, log
 *  look           aspecto (ver js/render.js → SPECIES)
 *  levels[]       estadísticas por nivel. "cost" en los niveles 2 y 3 es el precio de la mejora.
 *     damage, range (casillas), rate (ataques por segundo), splash (radio en casillas),
 *     slow (fracción de velocidad que quita), slowDuration (segundos)
 */
(function () {
  const TD = globalThis.TD;
  const T = TD.registerTower;

  /* ------------------------------------------------------------------ Gatos */
  T({ id: 'vigia', role: 'basic', faction: 'gatos', name: 'Vigía', hotkey: '1', cost: 50, look: 'tabby', base: 'post',
    desc: 'Gato de puesto alto. Lanza piedras con una honda. Barato y fiable.',
    attack: 'projectile', projectile: 'piedra', projSpeed: 9, targeting: 'first',
    levels: [
      { damage: 9, range: 2.6, rate: 1.1 },
      { damage: 14, range: 2.9, rate: 1.25, cost: 45 },
      { damage: 22, range: 3.2, rate: 1.45, cost: 80 },
    ] });

  T({ id: 'zarpas', role: 'melee', faction: 'gatos', name: 'Zarpas', hotkey: '2', cost: 80, look: 'black', base: 'rock',
    desc: 'Salta sobre lo que pasa cerca. Golpes brutales, poco alcance. Huele a los topos bajo tierra.',
    attack: 'melee', detectsHidden: true, targeting: 'strong',
    levels: [
      { damage: 40, range: 1.4, rate: 0.6 },
      { damage: 62, range: 1.5, rate: 0.65, cost: 65 },
      { damage: 95, range: 1.6, rate: 0.75, cost: 110 },
    ] });

  T({ id: 'maullador', role: 'control', faction: 'gatos', name: 'Maullador', hotkey: '3', cost: 70, look: 'grey', base: 'stump',
    desc: 'Su maullido eriza a cualquier roedor: los frena en un área. Poco daño, mucho control.',
    attack: 'pulse', pulseColor: 'rgba(170,200,255,0.85)', targeting: 'first',
    levels: [
      { damage: 3, range: 2.2, rate: 0.5, slow: 0.4, slowDuration: 2.2 },
      { damage: 5, range: 2.5, rate: 0.55, slow: 0.5, slowDuration: 2.4, cost: 60 },
      { damage: 9, range: 2.8, rate: 0.6, slow: 0.6, slowDuration: 2.6, cost: 100 },
    ] });

  T({ id: 'lanzasardinas', role: 'splash', faction: 'gatos', name: 'Lanzasardinas', hotkey: '4', cost: 110, look: 'calico', base: 'catapult',
    desc: 'Catapulta sardinas pasadas que explotan y salpican a todo lo que esté cerca. Ideal contra enjambres.',
    attack: 'lob', projectile: 'sardina', projSpeed: 6, targeting: 'first',
    levels: [
      { damage: 20, range: 3.0, rate: 0.5, splash: 0.9 },
      { damage: 30, range: 3.2, rate: 0.55, splash: 1.0, cost: 85 },
      { damage: 45, range: 3.4, rate: 0.6, splash: 1.15, cost: 140 },
    ] });

  T({ id: 'lince', role: 'sniper', faction: 'gatos', name: 'Lince', hotkey: '5', cost: 160, look: 'lynx', base: 'tallrock',
    desc: 'Francotirador de las colinas. Alcance enorme, golpe letal, muy lento. Su dardo atraviesa cualquier pellejo.',
    attack: 'projectile', projectile: 'dardo', projSpeed: 14, pierce: true, targeting: 'strong',
    levels: [
      { damage: 75, range: 4.5, rate: 0.35 },
      { damage: 120, range: 4.8, rate: 0.4, cost: 130 },
      { damage: 185, range: 5.2, rate: 0.45, cost: 210 },
    ] });

  /* --------------------------------------------------------------- Roedores */
  T({ id: 'hondera', role: 'basic', faction: 'roedores', name: 'Hondera', hotkey: '1', cost: 50, look: 'squirrel', base: 'stump',
    desc: 'Ardilla con honda de bellotas. Barata, rápida y con buena puntería.',
    attack: 'projectile', projectile: 'bellota', projSpeed: 9, targeting: 'first',
    levels: [
      { damage: 9, range: 2.6, rate: 1.1 },
      { damage: 14, range: 2.9, rate: 1.25, cost: 45 },
      { damage: 22, range: 3.2, rate: 1.45, cost: 80 },
    ] });

  T({ id: 'puas', role: 'melee', faction: 'roedores', name: 'Puercoespín', hotkey: '2', cost: 80, look: 'porcupine', base: 'rock',
    desc: 'Embiste con las púas a lo que pasa cerca. Golpes brutales, poco alcance. Sus púas sienten a los gatos entre las sombras.',
    attack: 'melee', detectsHidden: true, targeting: 'strong',
    levels: [
      { damage: 40, range: 1.4, rate: 0.6 },
      { damage: 62, range: 1.5, rate: 0.65, cost: 65 },
      { damage: 95, range: 1.6, rate: 0.75, cost: 110 },
    ] });

  T({ id: 'silbadora', role: 'control', faction: 'roedores', name: 'Silbadora', hotkey: '3', cost: 70, look: 'marmot', base: 'mound',
    desc: 'Marmota centinela. Su silbido de alarma paraliza de susto a los gatos en un área. Poco daño, mucho control.',
    attack: 'pulse', pulseColor: 'rgba(250,230,120,0.85)', targeting: 'first',
    levels: [
      { damage: 3, range: 2.2, rate: 0.5, slow: 0.4, slowDuration: 2.2 },
      { damage: 5, range: 2.5, rate: 0.55, slow: 0.5, slowDuration: 2.4, cost: 60 },
      { damage: 9, range: 2.8, rate: 0.6, slow: 0.6, slowDuration: 2.6, cost: 100 },
    ] });

  T({ id: 'bombardero', role: 'splash', faction: 'roedores', name: 'Bombardero', hotkey: '4', cost: 110, look: 'hamster', base: 'catapult',
    desc: 'Hámster artillero. Catapulta nueces podridas que explotan y salpican a todo lo que esté cerca.',
    attack: 'lob', projectile: 'nuez', projSpeed: 6, targeting: 'first',
    levels: [
      { damage: 20, range: 3.0, rate: 0.5, splash: 0.9 },
      { damage: 30, range: 3.2, rate: 0.55, splash: 1.0, cost: 85 },
      { damage: 45, range: 3.4, rate: 0.6, splash: 1.15, cost: 140 },
    ] });

  T({ id: 'jerbo', role: 'sniper', faction: 'roedores', name: 'Jerbo', hotkey: '5', cost: 160, look: 'jerboa', base: 'tallrock',
    desc: 'Francotirador del desierto con cerbatana de espinas. Alcance enorme, golpe letal, muy lento. Atraviesa cualquier pelaje.',
    attack: 'projectile', projectile: 'dardo', projSpeed: 14, pierce: true, targeting: 'strong',
    levels: [
      { damage: 75, range: 4.5, rate: 0.35 },
      { damage: 120, range: 4.8, rate: 0.4, cost: 130 },
      { damage: 185, range: 5.2, rate: 0.45, cost: 210 },
    ] });
})();
