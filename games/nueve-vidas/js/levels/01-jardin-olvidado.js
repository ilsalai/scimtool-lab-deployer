/* Nivel 1 · El Jardín Olvidado */
TD.registerLevel({
  id: 'jardin-olvidado',
  faction: 'gatos',
  order: 1,
  name: 'El Jardín Olvidado',
  subtitle: 'Capítulo 1 · Las primeras huellas',
  difficulty: 1,
  theme: 'jardin',
  intro:
    'Hace diez mil estaciones los Bípedos desaparecieron. Dejaron sus muros, sus caminos y, ' +
    'sobre todo, sus Despensas: montañas de latas que no se pudren. Esta era el huerto de ' +
    'una casa; hoy es la última Despensa del Clan del Muro. Los exploradores roedores ya ' +
    'encontraron el sendero. Coloca a tus gatos junto al camino y que ningún bigote cruce.',
  startCans: 160,
  lives: 9,
  countdown: 25,
  towers: ['vigia', 'zarpas', 'maullador'],
  map: [
    'TT......T.....TT',
    'T.............RT',
    'S##########.....',
    '..........#.....',
    '.T........#..T..',
    '....#######.....',
    '....#..........T',
    '..~~#.....R.....',
    '..~~###########E',
    'T.......T.......',
    'TT.....T......TT',
  ],
  waves: [
    { text: 'Exploradores. Un par de Vigías en las curvas bastan.', groups: [TD.g('raton', 6, 1.4)] },
    [TD.g('raton', 10, 1.0)],
    { text: 'Llegan ratas: aguantan más. Apunta a cubrir el camino dos veces.', groups: [TD.g('raton', 8, 0.9), TD.g('rata', 3, 2.0, 6)] },
    [TD.g('rata', 6, 1.6), TD.g('raton', 10, 0.6, 4)],
    { text: '¡Ardillas! Son rapidísimas. Un Maullador las frena.', groups: [TD.g('ardilla', 6, 0.9), TD.g('raton', 8, 0.8, 3)] },
    [TD.g('rata', 10, 1.1), TD.g('ardilla', 5, 0.8, 8)],
    [TD.g('raton', 16, 0.5), TD.g('rata', 6, 1.5, 2), TD.g('ardilla', 6, 0.7, 12)],
    {
      text: 'Una capibara abre la marcha. Las piedras apenas la rascan: Zarpas es la respuesta.',
      groups: [TD.g('capibara', 1), TD.g('raton', 14, 0.6, 2), TD.g('rata', 8, 1.2, 6), TD.g('ardilla', 8, 0.6, 14)],
    },
  ],
});
