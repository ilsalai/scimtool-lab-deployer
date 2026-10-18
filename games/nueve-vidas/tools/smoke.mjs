/* Nueve Vidas · prueba de humo con Chromium sin cabeza.
 * Abre el juego, recorre menú → nivel → partida a velocidad x3 con un par de
 * unidades, fuerza la Rueda y guarda capturas en la carpeta indicada.
 * Uso: node tools/smoke.mjs <carpeta-de-salida> */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Playwright puede estar instalado globalmente (npm i -g playwright); se busca en ambos lados.
const require = createRequire(import.meta.url);
const { chromium } = (() => {
  for (const spec of ['playwright', process.env.PLAYWRIGHT_PATH, '/opt/node-tools/node_modules/playwright']) {
    if (!spec) continue;
    try { return require(spec); } catch (e) { /* siguiente */ }
  }
  throw new Error('No encuentro playwright. Instálalo con: npm i -g playwright');
})();

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const out = process.argv[2] || path.join(here, 'smoke-out');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const url = 'file://' + path.join(root, 'index.html');
await page.goto(url);
await page.waitForSelector('.screen-menu');
await page.screenshot({ path: path.join(out, '01-menu.png') });

// Nueva partida → nacimiento → niveles
await page.click('[data-action="new-game"]');
await page.waitForSelector('.screen-born');
await page.screenshot({ path: path.join(out, '02-born.png') });
await page.click('[data-action="levels"]');
await page.waitForSelector('.screen-levels');
await page.screenshot({ path: path.join(out, '03-levels.png') });
await page.click('.level-card[data-level="jardin-olvidado"]');
await page.waitForSelector('.screen-intro');
await page.screenshot({ path: path.join(out, '04-intro.png') });
await page.click('[data-action="play"]');
await page.waitForSelector('#overlay', { state: 'hidden' });

// Colocar unidades desde la interfaz: tienda → casilla.
const build = async (id, c, r) => {
  await page.click(`.card[data-id="${id}"]`);
  const box = await page.locator('#game').boundingBox();
  const map = await page.evaluate(() => ({ cols: TD.ui.game.map.cols, rows: TD.ui.game.map.rows }));
  await page.mouse.click(box.x + ((c + 0.5) / map.cols) * box.width, box.y + ((r + 0.5) / map.rows) * box.height);
};
await build('vigia', 9, 4);
await build('zarpas', 5, 7);
await page.screenshot({ path: path.join(out, '05-placed.png') });
await page.click('#btn-wave');
await page.click('#speed button[data-speed="3"]');
await page.waitForTimeout(6000);
// Seleccionar la unidad para ver el panel.
{
  const box = await page.locator('#game').boundingBox();
  await page.mouse.click(box.x + (9.5 / 16) * box.width, box.y + (4.5 / 11) * box.height);
}
await page.screenshot({ path: path.join(out, '06-wave.png') });
const mid = await page.evaluate(() => ({ state: TD.ui.game.state, wave: TD.ui.game.currentWaveNumber, cans: TD.ui.game.cans, lives: TD.ui.game.lives, enemies: TD.ui.game.enemies.length, towers: TD.ui.game.towers.length }));
console.log('mitad de partida:', JSON.stringify(mid));

// Forzar la novena vida para ver la Rueda.
await page.evaluate(() => { const g = TD.ui.game; TD.ui.campaign.setLives(1); g.lives = 1; g.onLeak(g.enemies[0] || g.spawnEnemy('raton', 0, 0)); });
await page.waitForSelector('.screen-wheel', { timeout: 5000 });
await page.screenshot({ path: path.join(out, '07-wheel.png') });
await page.click('[data-action="wheel"]');
await page.waitForSelector('.screen-born');
await page.screenshot({ path: path.join(out, '08-born-rodent.png') });
await page.click('[data-action="levels"]');
await page.waitForSelector('.screen-levels');
await page.click('.level-card[data-level="terraplen"]');
await page.click('[data-action="play"]');
await page.waitForSelector('#overlay', { state: 'hidden' });
await build('hondera', 6, 2);
await build('silbadora', 12, 5);
await page.click('#btn-wave');
await page.click('#speed button[data-speed="3"]');
await page.waitForTimeout(5000);
await page.screenshot({ path: path.join(out, '09-rodent-wave.png') });

// Partida de roedores completa en modo acelerado para llegar a la pantalla de victoria.
await page.evaluate(async () => {
  const g = TD.ui.game;
  const pick = (id, c, r) => g.build(id, c, r);
  pick('puas', 4, 4); pick('hondera', 10, 8); pick('hondera', 12, 6); pick('silbadora', 3, 8); pick('hondera', 1, 8);
});
await page.evaluate(() => { TD.ui.speed = 3; });
for (let i = 0; i < 400 && !(await page.evaluate(() => TD.ui.game.finished)); i++) {
  await page.evaluate(() => { const g = TD.ui.game; if (g.state === 'countdown') g.startNextWave(true); for (let k = 0; k < 30; k++) g.update(1 / 30); });
  await page.waitForTimeout(10);
}
const end = await page.evaluate(() => ({ state: TD.ui.game.state, lives: TD.ui.game.lives, wave: TD.ui.game.currentWaveNumber, towers: TD.ui.game.towers.length }));
console.log('final roedores:', JSON.stringify(end));
await page.waitForTimeout(1800);
await page.screenshot({ path: path.join(out, '10-end.png') });
await page.evaluate(() => TD.ui.action('menu'));
await page.waitForSelector('.screen-menu');
await page.click('[data-action="chronicle"]');
await page.waitForSelector('.screen-chronicle');
await page.screenshot({ path: path.join(out, '11-chronicle.png') });

await browser.close();
if (errors.length) { console.log('ERRORES:'); for (const e of errors) console.log(' -', e); process.exit(1); }
console.log('Sin errores de consola. Capturas en', out);
