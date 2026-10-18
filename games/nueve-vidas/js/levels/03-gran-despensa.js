/* Nivel 3 (gatos) · La Gran Despensa */
TD.registerLevel({
  id: 'gran-despensa',
  faction: 'gatos',
  order: 3,
  name: 'La Gran Despensa',
  subtitle: 'Capítulo 3 · El Rey Rata',
  difficulty: 3,
  theme: 'despensa',
  intro:
    'Un templo de los Bípedos con pasillos interminables y latas hasta el techo: la Gran ' +
    'Despensa, el corazón del Clan del Muro. Los roedores entran por dos pasillos que se ' +
    'juntan frente a la bóveda. Y esta vez no mandan exploradores: viene Colagris, el Rey ' +
    'Rata, convocando ratones a su paso. Si él cruza, se acaban todas tus vidas. El Lince ya ' +
    'está disponible: su dardo atraviesa cualquier pellejo.',
  startCans: 320,
  countdown: 25,
  towers: ['vigia', 'zarpas', 'maullador', 'lanzasardinas', 'lince'],
  map: [
    'S######.......~~..',
    '......#....R..~~..',
    '......#.......~~..',
    '......#####.......',
    '..........#.......',
    '.T........#.......',
    '..........#######E',
    '..........#.......',
    '......#####.......',
    '......#...R...~~..',
    '......#.......~~..',
    'S######.......~~..',
  ],
  waves: [
    { text: 'Dos pasillos. Los gatos frente a la bóveda cubren ambos.', groups: [TD.g('raton', 8, 1.0, 0, 0), TD.g('raton', 8, 1.0, 0, 1)] },
    [TD.g('rata', 6, 1.3, 0, 0), TD.g('ardilla', 6, 0.8, 2, 1)],
    [TD.g('ardilla', 6, 0.8, 2, 0), TD.g('rata', 6, 1.3, 0, 1)],
    [TD.g('topo', 4, 2.0, 0, 0), TD.g('topo', 4, 2.0, 0, 1), TD.g('raton', 10, 0.7, 4, 0)],
    [TD.g('capibara', 1, 1, 0, 0), TD.g('capibara', 1, 1, 4, 1), TD.g('rata', 8, 1.1, 2, 0), TD.g('rata', 8, 1.1, 2, 1)],
    { text: 'Enjambre por los dos lados.', groups: [TD.g('raton', 16, 0.45, 0, 0), TD.g('raton', 16, 0.45, 0, 1)] },
    [TD.g('ardilla', 10, 0.6, 0, 0), TD.g('topo', 5, 1.6, 0, 1), TD.g('capibara', 2, 6, 4, 1)],
    [TD.g('rata', 14, 0.9, 0, 0), TD.g('rata', 14, 0.9, 0, 1), TD.g('capibara', 2, 5, 6, 0)],
    [TD.g('topo', 6, 1.3, 0, 0), TD.g('topo', 6, 1.3, 0, 1), TD.g('ardilla', 10, 0.55, 6, 0), TD.g('ardilla', 10, 0.55, 6, 1)],
    [TD.g('capibara', 3, 4, 0, 0), TD.g('capibara', 3, 4, 0, 1), TD.g('raton', 16, 0.45, 5, 0), TD.g('raton', 16, 0.45, 5, 1)],
    {
      text: 'La guardia del Rey. Lo que sobreviva ahora, sobrevive a Colagris.',
      groups: [
        TD.g('raton', 24, 0.4, 0, 0), TD.g('rata', 16, 0.8, 2, 1), TD.g('ardilla', 12, 0.5, 8, 0),
        TD.g('topo', 6, 1.3, 10, 1), TD.g('capibara', 3, 3.5, 12, 0), TD.g('capibara', 3, 3.5, 12, 1),
      ],
    },
    {
      text: '¡El Rey Rata Colagris en persona! Si llega a la Despensa, se acabó.',
      groups: [TD.g('reyrata', 1, 1, 5, 0), TD.g('rata', 12, 1.1, 0, 1), TD.g('raton', 16, 0.55, 8, 1), TD.g('capibara', 2, 5, 15, 1)],
    },
  ],
});
