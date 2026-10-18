/* ============================================================================
 *  PLANTILLA DE NIVEL · Nueve Vidas
 *  Copia este archivo como js/levels/NN-nombre.js, edítalo y agrégalo en
 *  index.html con <script src="js/levels/NN-nombre.js"></script>.
 *  (Este archivo NO se carga en el juego; es solo una guía.)
 * ============================================================================
 *
 *  MAPA (map): un string por fila, todas del mismo largo. Cada carácter es una casilla:
 *    .  pasto        → se puede construir
 *    :  hormigón     → se puede construir (ruinas humanas)
 *    #  camino       → por aquí avanzan los roedores
 *    S  madriguera   → de aquí salen los roedores (puede haber varias)
 *    E  Despensa     → lo que defiendes (solo una)
 *    ~  agua         → bloqueado
 *    T  árbol        → bloqueado
 *    R  escombros    → bloqueado
 *    C  auto oxidado → bloqueado
 *    L  farol caído  → bloqueado
 *  El camino se calcula solo: desde cada S hasta la E siguiendo las casillas #.
 *  Las S se numeran en orden de lectura (arriba→abajo, izquierda→derecha): la
 *  primera es el camino 0, la segunda el 1, etc. Eso es lo que usa el 5º
 *  parámetro de TD.g(...) para decidir por dónde entra cada grupo.
 *
 *  OLEADAS (waves): una lista; cada oleada es una lista de grupos o un objeto
 *  { text: 'mensaje al empezar', groups: [...] }.
 *  TD.g(roedor, cantidad, segundosEntreCadaUno, retrasoInicial = 0, camino = 0)
 *  Enemigos (ver js/data/enemies.js):
 *    en niveles de gatos atacan roedores: raton, rata, ardilla, topo, capibara, reyrata
 *    en niveles de roedores atacan gatos: callejero, cazador, siames, sombra, peludo, reinalince
 *
 *  UNIDADES (towers): ids de las unidades que se pueden comprar en este nivel (ver js/data/towers.js).
 *    gatos: vigia, zarpas, maullador, lanzasardinas, lince
 *    roedores: hondera, puas, silbadora, bombardero, jerbo
 *
 *  VIDAS: no se definen por nivel. Son las nueve del personaje y se arrastran de
 *  nivel en nivel; cada enemigo que llega a la base gasta una (ver js/data/factions.js).
 */
TD.registerLevel({
  id: 'mi-nivel',                 // único, sin espacios
  faction: 'gatos',               // quién defiende: 'gatos' (atacan roedores) o 'roedores' (atacan gatos)
  order: 99,                      // posición en la campaña de esa facción (opcional)
  name: 'Mi nivel',
  subtitle: 'Capítulo X',
  difficulty: 2,                  // 1 a 5 patitas, solo informativo
  theme: 'jardin',                // 'jardin' | 'autopista' | 'despensa'
  intro: 'Texto que se muestra antes de empezar. Cuenta la historia del lugar.',
  startCans: 150,                 // latas iniciales
  countdown: 25,                  // segundos entre oleadas (se puede adelantar)
  towers: ['vigia', 'zarpas', 'maullador'],
  map: [
    'TT............TT',
    'S#########.....T',
    '.........#......',
    '.........#......',
    '....######......',
    '....#...........',
    '....###########E',
    'TT............TT',
  ],
  waves: [
    [TD.g('raton', 6, 1.2)],
    [TD.g('raton', 10, 0.9), TD.g('rata', 2, 2.0, 5)],
    { text: '¡Capibara a la vista!', groups: [TD.g('capibara', 1), TD.g('raton', 12, 0.6, 2)] },
  ],
});
