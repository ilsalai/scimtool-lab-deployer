# Nueve Vidas

Tower defense de gatos y roedores en una tierra que evolucionó sin humanos. Sin ogros, sin
magos: bigotes contra colmillos.

**Jugar:** abre `index.html` en un navegador moderno. No necesita instalación, servidor ni
dependencias. Si prefieres servirlo (recomendado para que el audio y el guardado funcionen
igual en todos los navegadores):

```bash
cd games/nueve-vidas
python3 -m http.server 8080     # o: npx serve .
# → http://localhost:8080
```

## La regla que lo cambia todo: la Rueda

- Eres **un personaje**, no un ejército. Un gato tiene **nueve vidas**; un roedor, **nueve escapes milagrosos**.
- Cada enemigo que llega a tu base (la Despensa o el Granero) gasta una. **No se recuperan entre niveles**: son del personaje.
- Cada vida perdida se cuenta: aparece un relato en pantalla y queda escrito en la **Crónica**.
- Cuando pierdes la novena, **el otro bando gana la guerra y la Rueda gira**: despiertas como un personaje nuevo del bando contrario, con nueve oportunidades frescas y su propia campaña.
- Si ganas todos los niveles de tu bando puedes seguir con tu personaje o **dejar que la Rueda gire** por voluntad propia.
- El progreso de cada bando (niveles ganados, estrellas) se conserva aunque la Rueda gire. Un gato nuevo retoma la guerra donde la dejó el clan.

## Cómo se juega

1. Elige una unidad en la tienda (o pulsa `1`-`5`) y toca una casilla libre junto al camino.
2. Pulsa **Iniciar oleada**. Entre oleadas hay una cuenta regresiva; enviar la siguiente antes de tiempo da un bono.
3. Selecciona una unidad en el mapa para **mejorarla** (dos veces), **venderla** (70 %) o cambiar a quién apunta.
4. Cada bando tiene cinco unidades con los mismos roles: tirador barato, luchador cuerpo a cuerpo (detecta ocultos, rompe armaduras), control (frena en área), daño en área (contra enjambres) y francotirador (ignora armadura).

| Tecla | Acción |
|---|---|
| `1`-`5` | elegir unidad |
| clic | colocar / seleccionar |
| clic derecho, `Esc` | cancelar / quitar selección |
| `Espacio` | enviar la siguiente oleada |
| `P`, `Esc` | pausa |
| `U` / `X` | mejorar / vender la unidad seleccionada |
| `+` / `-` | velocidad ×1 ×2 ×3 |
| `M` | sonido |

El progreso se guarda solo en el navegador (`localStorage`).

## Estructura

```
games/nueve-vidas/
├── index.html              página única; aquí se listan los <script> de los niveles
├── css/style.css
├── js/
│   ├── util.js             utilidades y TD.TILE (tamaño de casilla)
│   ├── registry.js         TD.registerLevel / registerTower / registerEnemy / registerFaction, TD.g()
│   ├── data/
│   │   ├── factions.js     los dos bandos, nombres, aspectos y TODOS los textos de la historia
│   │   ├── enemies.js      bestiario (roedores y gatos)
│   │   └── towers.js       unidades defensoras de cada bando
│   ├── levels/             un archivo por nivel (+ _plantilla.js comentada)
│   ├── map.js              parsea el mapa ASCII y calcula los caminos (BFS desde cada S hasta la E)
│   ├── entities.js         Enemy, Tower, Projectile
│   ├── game.js             reglas: oleadas, economía, vidas, construcción (sin DOM)
│   ├── campaign.js         personaje, Rueda, progreso y Crónica (localStorage)
│   ├── art.js              arte procedural: especies, pose sentada y caminando, bases, proyectiles
│   ├── render.js           temas visuales y dibujo de la partida
│   ├── audio.js            efectos sintetizados con WebAudio
│   ├── ui.js               pantallas, HUD, tienda, panel de unidad
│   └── main.js             arranque y validación del contenido
└── tools/
    ├── simulate.js         simulador de balance (Node, sin navegador)
    └── smoke.mjs           prueba de humo con Chromium (Playwright)
```

## Agregar un nivel

1. Copia `js/levels/_plantilla.js` como `js/levels/NN-mi-nivel.js` (los números solo ordenan los archivos).
2. Edita `id`, `faction` (`'gatos'` o `'roedores'`), `name`, `theme`, `intro`, `startCans`, `towers`, el **mapa** y las **oleadas**.
3. Agrega la línea `<script src="js/levels/NN-mi-nivel.js"></script>` en `index.html`, junto a los demás niveles.
4. Abre el juego. Si el mapa tiene un error (filas de distinto largo, sin `E`, camino cortado…) lo verás en pantalla con el motivo.

El mapa es un dibujo: un string por fila, todas del mismo largo.

| Carácter | Casilla |
|---|---|
| `.` | pasto (se puede construir) |
| `:` | hormigón de los Bípedos (se puede construir) |
| `#` | camino |
| `S` | madriguera: por aquí entran los enemigos (puede haber varias) |
| `E` | tu base: la Despensa o el Granero (solo una) |
| `~` | agua (bloqueado) |
| `T` | árbol, tubería o chimenea según el tema (bloqueado) |
| `R` | escombros (bloqueado) |
| `C` | auto oxidado (bloqueado) |
| `L` | farol o antena (bloqueado) |

El camino se calcula solo: desde cada `S` hasta la `E` siguiendo las casillas `#`. Las `S` se
numeran en orden de lectura (de arriba abajo, de izquierda a derecha) y ese es el índice de camino
que usa el quinto parámetro de `TD.g(...)`.

Las oleadas son una lista. Cada oleada es una lista de grupos, o `{ text: '...', groups: [...] }`
si quieres mostrar un mensaje al empezar:

```js
TD.g(enemigo, cantidad, segundosEntreCadaUno, retrasoInicial = 0, camino = 0)

waves: [
  [TD.g('raton', 6, 1.4)],
  { text: '¡Capibara!', groups: [TD.g('capibara', 1), TD.g('raton', 12, 0.6, 2)] },
  [TD.g('rata', 8, 1.2, 0, 0), TD.g('ardilla', 8, 0.7, 2, 1)],   // dos caminos
]
```

Temas disponibles: `jardin`, `autopista`, `despensa` (gatos) y `campo`, `alcantarilla`, `tejado`
(roedores). Cualquier nivel puede usar cualquier tema.

Para probar un nivel directamente: `index.html?nivel=mi-nivel` (crea el personaje del bando que
haga falta). Con `index.html?dev` se desbloquean todos los niveles y aparece un botón para cambiar
de bando.

## Agregar unidades o enemigos

- Enemigos: `js/data/enemies.js`. Campos documentados en el encabezado. Un enemigo con `hide`
  desaparece por ratos (`style: 'burrow'` bajo tierra, `'shadow'` entre sombras); uno con `summon`
  invoca refuerzos; `boss: true` le pone un aura y `lives: 9` hace que su llegada sea el final.
- Unidades: `js/data/towers.js`. Cuatro tipos de ataque (`projectile`, `lob`, `melee`, `pulse`),
  tres niveles de mejora y un `role` que la interfaz usa para describirla.
- Aspectos: `js/art.js` → `SPECIES`. Cada especie se dibuja sentada (unidad, retrato) y caminando
  (enemigo), así cualquier animal puede estar en los dos bandos.
- Historia: `js/data/factions.js`. Textos de cada vida perdida, de la novena, del despertar en el
  otro bando y de la guerra ganada.

## Herramientas

```bash
node tools/simulate.js            # juega todos los niveles con un bot y resume victorias y vidas
node tools/simulate.js 3 --seeds 5
node tools/simulate.js --list     # solo valida los niveles
node tools/smoke.mjs ./capturas   # recorre el juego en Chromium y guarda capturas (requiere playwright)
```

El simulador es la forma rápida de ver si un nivel nuevo es imposible o trivial antes de jugarlo:
la estrategia `perezosa` (tres unidades) debería perder y la `equilibrada` debería ganar.

## Publicar

Es un sitio estático. Con GitHub Pages activado sobre la rama principal queda en
`https://<usuario>.github.io/<repo>/games/nueve-vidas/`.
