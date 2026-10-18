#!/usr/bin/env node
/* Nueve Vidas · simulador de balance.
 * Carga la lógica del juego (sin DOM) y juega cada nivel con un "jugador"
 * heurístico para estimar la dificultad. Uso:
 *   node tools/simulate.js            → todos los niveles, varias estrategias
 *   node tools/simulate.js jardin-olvidado --seeds 5
 *   node tools/simulate.js --list     → solo valida y lista los niveles */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const levelFiles = fs.readdirSync(path.join(root, 'js/levels')).filter((f) => f.endsWith('.js') && !f.startsWith('_')).sort();
for (const f of ['js/util.js', 'js/registry.js', 'js/data/factions.js', 'js/data/enemies.js', 'js/data/towers.js', ...levelFiles.map((f) => `js/levels/${f}`), 'js/map.js', 'js/entities.js', 'js/game.js']) {
  require(path.join(root, f));
}
const TD = globalThis.TD;
const TILE = TD.TILE;
const { dist } = TD.util;

const args = process.argv.slice(2);
const seedsIdx = args.indexOf('--seeds');
const seeds = seedsIdx >= 0 ? Number(args[seedsIdx + 1]) || 3 : 3;
const onlyLevel = args.find((a, i) => !a.startsWith('--') && i !== seedsIdx + 1);
const listOnly = args.includes('--list');

if (listOnly) {
  for (const lv of TD.levels) {
    const map = new TD.GameMap(lv);
    const game = new TD.Game(lv);
    console.log(`${lv.order}. ${lv.name} (${lv.id}) · ${map.cols}x${map.rows} · caminos: ${map.paths.map((p) => Math.round(p.length / TILE)).join(', ')} casillas · ${game.totalWaves} oleadas · ${game.waves.reduce((s, w) => s + w.total, 0)} roedores`);
  }
  process.exit(0);
}

/** Cuántos puntos del camino (uno cada media casilla) caen dentro del alcance desde una casilla. */
function coverage(map, c, r, rangeTiles) {
  const cx = (c + 0.5) * TILE, cy = (r + 0.5) * TILE;
  let n = 0;
  for (const p of map.paths) {
    for (let d = 0; d < p.length; d += TILE / 2) {
      const q = map.posAt(p, d);
      if (dist(cx, cy, q.x, q.y) <= rangeTiles * TILE) n++;
    }
  }
  return n;
}

function bestTile(game, def, rng) {
  const map = game.map;
  let best = null, bestScore = -1;
  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      if (!map.isBuildable(c, r) || game.towerAt(c, r)) continue;
      const score = coverage(map, c, r, def.levels[0].range) + rng() * 0.5;
      if (score > bestScore) { bestScore = score; best = { c, r }; }
    }
  }
  return best;
}

/**
 * Estrategias: lista de compras en orden (roles de unidad o 'up' = mejorar la
 * unidad con más cobertura). 'early' adelanta las oleadas en cuanto puede.
 * Los roles (basic, melee, control, splash, sniper) se traducen a la unidad de
 * la facción del nivel, así la misma estrategia sirve para gatos y roedores.
 */
const BALANCED = ['basic', 'basic', 'melee', 'control', 'basic', 'up', 'splash', 'melee', 'up', 'basic', 'sniper', 'up', 'up', 'splash', 'up', 'melee', 'up', 'up', 'basic', 'up', 'sniper', 'up', 'up', 'up', 'basic', 'up', 'up'];
const STRATEGIES = {
  equilibrada: { plan: BALANCED, early: false },
  agresiva: { plan: BALANCED, early: true },
  soloBasicas: { plan: Array(30).fill('basic'), early: false },
  perezosa: { plan: ['basic', 'basic', 'basic'], early: false },
};

function play(level, strat, seed) {
  const rng = TD.util.rng(seed);
  const game = new TD.Game(level, { rng });
  const byRole = {};
  for (const t of game.availableTowers) byRole[t.role] = t.id;
  const plan = strat.plan.map((p) => (p === 'up' ? 'up' : byRole[p])).filter(Boolean);
  let step = 0;
  const dt = 1 / 30;
  let acc = 0;

  while (!game.finished && game.time < 3600) {
    acc += dt;
    if (acc >= 0.25) {
      acc = 0;
      // Compras
      let guard = 0;
      while (step < plan.length && guard++ < 5) {
        const action = plan[step];
        if (action === 'up') {
          const cands = game.towers.filter((t) => t.canUpgrade).sort((a, b) => coverage(game.map, b.c, b.r, b.stats.range) - coverage(game.map, a.c, a.r, a.stats.range));
          if (!cands.length) { step++; continue; }
          if (game.cans >= cands[0].upgradeCost) { game.upgrade(cands[0]); step++; } else break;
        } else {
          const def = TD.towers[action];
          if (game.cans < def.cost) break;
          const tile = bestTile(game, def, rng);
          if (!tile) { step++; continue; }
          game.build(def, tile.c, tile.r);
          step++;
        }
      }
      // Lanzar oleadas
      if (game.state === 'build' && (game.towers.length >= 2 || step >= plan.length || game.cans < 50)) game.startNextWave(false);
      else if (game.state === 'countdown' && strat.early) game.startNextWave(true);
    }
    game.update(dt);
  }
  return {
    result: game.state,
    lives: game.lives,
    wave: game.currentWaveNumber,
    towers: game.towers.length,
    invested: game.towers.reduce((s, t) => s + t.invested, 0),
    cans: game.cans,
    time: Math.round(game.time),
    kills: game.stats.kills,
  };
}

const levels = TD.levels.filter((l) => !onlyLevel || l.id === onlyLevel || String(l.order) === onlyLevel);
if (!levels.length) { console.error(`No encuentro el nivel "${onlyLevel}"`); process.exit(1); }

for (const level of levels) {
  console.log(`\n=== ${level.order}. ${level.name} [${level.faction}] · ${level.waves.length} oleadas · ${level.startCans} latas ===`);
  for (const [name, strat] of Object.entries(STRATEGIES)) {
    const runs = [];
    for (let s = 1; s <= seeds; s++) runs.push(play(level, strat, s * 7919 + level.order));
    const wins = runs.filter((r) => r.result === 'victory').length;
    const avgLives = (runs.reduce((s, r) => s + r.lives, 0) / runs.length).toFixed(1);
    const waves = runs.map((r) => (r.result === 'victory' ? '✓' : `✗o${r.wave}`)).join(' ');
    const r0 = runs[0];
    console.log(`  ${name.padEnd(12)} victorias ${wins}/${runs.length} · vidas prom ${avgLives} · [${waves}] · gatos ${r0.towers} · invertido ${r0.invested} · sobran ${r0.cans} · ${r0.time}s`);
  }
}
