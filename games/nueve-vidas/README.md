# Nueve Vidas

Tower defense de gatos y roedores en una tierra que evolucionó sin humanos. Pixel art de alta
densidad con iluminación en alta resolución (estilo HD-2D), sin una sola imagen: todo el arte y
todo el sonido se generan por código.

**Jugar:** abre `index.html` en un navegador moderno. No necesita instalación, servidor ni
dependencias. Si prefieres servirlo:

```bash
cd games/nueve-vidas
python3 -m http.server 8080     # o: npx serve .
# → http://localhost:8080
```

Documentos: la historia completa está en [TRAMA.md](TRAMA.md) y el diseño del juego en
[DISEÑO.md](DISEÑO.md).

## La regla que lo cambia todo: la Rueda

- Eres **un personaje**, no un ejército. Un gato tiene **nueve vidas**; un roedor, **nueve escapes milagrosos**.
- Cada enemigo que llega a tu base (la Despensa o el Granero) gasta una. **No se recuperan entre niveles.**
- Cada una tiene su relato en pantalla y queda escrita en la **Crónica**.
- Cuando pierdes la novena, **el otro bando gana la guerra y la Rueda gira**: despiertas como un personaje nuevo del bando contrario, con nueve oportunidades y su propia campaña.
- El progreso de cada bando se conserva aunque la Rueda gire.
- Si ya viviste en el otro bando, tu vida anterior vuelve como **eco**: un enemigo con tu antiguo nombre, una vez por nivel.
- Al ganar todos los niveles de tu bando puedes seguir o **dejar que la Rueda gire** por voluntad propia.

## Cómo se juega

1. Elige una unidad en la tienda (o pulsa `1`-`5`) y toca una casilla libre junto al camino.
2. Pulsa **Iniciar oleada**. Entre oleadas hay una cuenta regresiva; enviar la siguiente antes de tiempo da un bono.
3. Selecciona una unidad en el mapa para **mejorarla** (dos veces), **venderla** (70 %) o cambiar a quién apunta.
4. Cada bando tiene cinco unidades con los mismos roles: tirador, cuerpo a cuerpo (detecta ocultos, rompe armaduras), control (frena en área), daño en área y francotirador (ignora armadura).
5. Desde el capítulo 4 hay **ladrones**: no gastan oportunidades; roban 30 latas o semillas y vuelven por donde entraron. Si caen antes de salir, lo robado vuelve.

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

En pantalla táctil, el primer toque muestra el alcance y el segundo coloca. El progreso se guarda
solo en el navegador (`localStorage`). En el menú de pausa se elige la calidad de los efectos
visuales; si el equipo va lento, baja sola.

## Estructura

```
games/nueve-vidas/
├── index.html              página única; aquí se listan los <script> de los niveles
├── css/style.css
├── js/
│   ├── util.js             utilidades y TD.TILE (tamaño lógico de casilla)
│   ├── registry.js         TD.registerLevel / registerTower / registerEnemy / registerFaction, TD.g()
│   ├── data/
│   │   ├── factions.js     los dos bandos, nombres, aspectos y textos de la historia
│   │   ├── enemies.js      bestiario (roedores y gatos, ladrones, ecos, jefes)
│   │   └── towers.js       unidades defensoras de cada bando
│   ├── levels/             un archivo por nivel (+ _plantilla.js comentada)
│   ├── map.js              parsea el mapa ASCII y calcula los caminos (BFS desde cada S hasta la E)
│   ├── entities.js         Enemy, Tower, Projectile
│   ├── game.js             reglas: oleadas, economía, vidas, robos, ecos (sin DOM)
│   ├── campaign.js         personaje, Rueda, vidas pasadas, progreso y Crónica (localStorage)
│   ├── pixel.js            motor de pixel art: rampas de color, formas sombreadas, contorno, ruido
│   ├── sprites.js          especies (sentadas y caminando), asientos, proyectiles y escenario
│   ├── terrain.js          temas visuales y pintor de terreno píxel a píxel, con margen decorativo
│   ├── art.js              retratos de sprites para la interfaz
│   ├── render.js           renderizador HD-2D: sombras, luz, brillos, partículas, desenfoque
│   ├── audio.js            efectos sintetizados con WebAudio
│   ├── ui.js               pantallas, HUD, tienda, panel de unidad
│   └── main.js             arranque y validación del contenido
└── tools/
    ├── sprites.html        hoja con todos los sprites ampliados, para revisar el arte
    ├── simulate.js         simulador de balance (Node, sin navegador)
    └── smoke.mjs           prueba de humo con Chromium (Playwright)
```

## Agregar un nivel

1. Copia `js/levels/_plantilla.js` como `js/levels/NN-mi-nivel.js` (los números solo ordenan los archivos).
2. Edita `id`, `faction` (`'gatos'` o `'roedores'`), `name`, `theme`, `intro`, `outro`, `startCans`, `towers`, el **mapa** y las **oleadas**.
3. Agrega la línea `<script src="js/levels/NN-mi-nivel.js"></script>` en `index.html`, junto a los demás niveles.
4. Abre el juego. Si el mapa tiene un error (filas de distinto largo, sin `E`, camino cortado…) lo verás en pantalla con el motivo.

El mapa es un dibujo: un string por fila, todas del mismo largo.

| Carácter | Casilla |
|---|---|
| `.` | suelo del tema: pasto, trigo, piedra, tejas (se puede construir) |
| `:` | hormigón de los Bípedos (se puede construir) |
| `#` | camino |
| `S` | entrada de los enemigos (puede haber varias) |
| `E` | tu base: la Despensa o el Granero (solo una) |
| `~` | agua (bloqueado) |
| `T` | bloque del tema: árbol, tubería, chimenea, cajas, sacos (bloqueado) |
| `R` | escombros (bloqueado) |
| `C` | auto oxidado (bloqueado) |
| `L` | farol o antena; de noche da luz (bloqueado) |

El camino se calcula solo: desde cada `S` hasta la `E` siguiendo las casillas `#`. Las `S` se
numeran en orden de lectura (de arriba abajo, de izquierda a derecha) y ese es el índice de camino
que usa el quinto parámetro de `TD.g(...)`. Alrededor del mapa el juego pinta un margen decorativo
con el escenario del tema; no hay que dibujarlo.

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

Temas disponibles (cualquier nivel puede usar cualquiera):

| Tema | Ambiente |
|---|---|
| `jardin` | pasto y sendero de tierra, mañana |
| `autopista` | asfalto con líneas, atardecer dorado |
| `despensa` | tienda invadida por el musgo, penumbra con rayos de luz |
| `campo` | trigal, mediodía |
| `alcantarilla` | ladrillo y agua turbia, a oscuras con faroles |
| `tejado` | tejas y canaletas, anochecer |
| `patio` | hormigón y asfalto, noche con lluvia |
| `silo` | grano y tablones, interior de luz cálida |

Para probar un nivel directamente: `index.html?nivel=mi-nivel`. Con `index.html?dev` se
desbloquean todos los niveles y aparece un botón para cambiar de bando.

## Agregar unidades, enemigos, arte o historia

- **Enemigos**: `js/data/enemies.js`. Campos documentados en el encabezado. `hide` lo oculta por
  ratos; `summon` invoca refuerzos; `steals` lo vuelve ladrón; `boss` y `lastWords` hacen un jefe.
- **Unidades**: `js/data/towers.js`. Cuatro tipos de ataque (`projectile`, `lob`, `melee`, `pulse`),
  tres niveles de mejora y un `role`.
- **Aspecto**: `js/sprites.js` → `SPECIES`. Cada especie es una lista de colores y rasgos, y se
  dibuja sola en las dos poses. Abre `tools/sprites.html` para verla ampliada mientras la ajustas.
- **Tema visual**: `js/terrain.js` → `THEMES`. Paleta, textura del suelo y del camino, escenario
  del margen y ambiente de luz (`mood`): color ambiente, sol, sombras, rayos, partículas.
- **Historia**: `js/data/factions.js` (relatos de cada vida, la novena, el despertar, los ecos) y
  el campo `outro` de cada nivel. Las reglas de tono están en [TRAMA.md](TRAMA.md).

## Herramientas

```bash
node tools/simulate.js            # juega todos los niveles con un bot y resume victorias, vidas y robos
node tools/simulate.js 4 --seeds 5
node tools/simulate.js --list     # solo valida los niveles
node tools/smoke.mjs ./capturas   # recorre el juego en Chromium y guarda capturas (requiere playwright)
```

El simulador es la forma rápida de ver si un nivel nuevo es imposible o trivial antes de jugarlo:
la estrategia `perezosa` (tres unidades) debería perder y la `equilibrada` debería ganar.

## Publicar

Es un sitio estático. Con GitHub Pages activado sobre la rama principal queda en
`https://<usuario>.github.io/<repo>/games/nueve-vidas/`.
