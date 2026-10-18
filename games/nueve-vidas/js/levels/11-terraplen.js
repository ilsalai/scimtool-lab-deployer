/* Nivel 1 (roedores) · El Terraplén */
TD.registerLevel({
  id: 'terraplen',
  faction: 'roedores',
  order: 11,
  name: 'El Terraplén',
  subtitle: 'Capítulo 1 · Los campos de la Colonia',
  difficulty: 1,
  theme: 'campo',
  intro:
    'Donde los Bípedos tendían sus caminos de hierro, hoy crece el trigo silvestre. Bajo el ' +
    'terraplén, la Colonia excavó el Granero: grano para mil inviernos. Los gatos del Clan del ' +
    'Muro bajan por el sendero en busca de algo que cazar. Coloca a tus honderas en las curvas ' +
    'y que ninguna garra llegue a la puerta.',
  startCans: 160,
  countdown: 25,
  towers: ['hondera', 'puas', 'silbadora'],
  map: [
    'TT.....T......TT',
    'T....##########S',
    '.....#....L.....',
    '.R...#..........',
    '.....#######....',
    '.T.........#..T.',
    '....L......#....',
    '..##########....',
    '..#.....R.......',
    '..###########E..',
    'TT....T.......TT',
  ],
  waves: [
    { text: 'Gatos jóvenes olfateando. Dos Honderas en las curvas bastan.', groups: [TD.g('callejero', 6, 1.4)] },
    [TD.g('callejero', 10, 1.0)],
    { text: 'Cazadores adultos: aguantan más. Cubre el camino dos veces.', groups: [TD.g('callejero', 8, 0.9), TD.g('cazador', 3, 2.0, 6)] },
    [TD.g('cazador', 6, 1.6), TD.g('callejero', 10, 0.6, 4)],
    { text: '¡Siameses! Son rapidísimos. El silbido de la Silbadora los paraliza.', groups: [TD.g('siames', 6, 0.9), TD.g('callejero', 8, 0.8, 3)] },
    [TD.g('cazador', 10, 1.1), TD.g('siames', 5, 0.8, 8)],
    [TD.g('callejero', 16, 0.5), TD.g('cazador', 6, 1.5, 2), TD.g('siames', 6, 0.7, 12)],
    {
      text: 'Un Peludo abre la marcha. Las bellotas se pierden en su pelaje: el Puercoespín es la respuesta.',
      groups: [TD.g('peludo', 1), TD.g('callejero', 14, 0.6, 2), TD.g('cazador', 8, 1.2, 6), TD.g('siames', 8, 0.6, 14)],
    },
  ],
});
