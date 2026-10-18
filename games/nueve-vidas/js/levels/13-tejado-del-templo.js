/* Nivel 3 (roedores) · El Tejado del Templo */
TD.registerLevel({
  id: 'tejado-del-templo',
  faction: 'roedores',
  order: 13,
  name: 'El Tejado del Templo',
  subtitle: 'Capítulo 3 · La Reina Lince',
  difficulty: 3,
  theme: 'tejado',
  intro:
    'El Gran Granero está en el desván del templo de los Bípedos, y a un desván se llega por ' +
    'el tejado. Los gatos trepan por dos aleros que se juntan frente a la claraboya. Y esta ' +
    'vez no mandan callejeros: viene Ojos de Ámbar, la Reina Lince, llamando a los suyos a su ' +
    'paso. Si ella cruza, no hay milagro que valga. El Jerbo ya está disponible: su espina ' +
    'atraviesa cualquier pelaje.',
  startCans: 320,
  countdown: 25,
  towers: ['hondera', 'puas', 'silbadora', 'bombardero', 'jerbo'],
  map: [
    'S#######..........',
    '.......#....R.....',
    '.......#......L...',
    '...L...#####......',
    '...........#......',
    '.R.........#......',
    '...........######E',
    '...........#......',
    '...L...#####......',
    '.......#......R...',
    '.......#....L.....',
    'S#######..........',
  ],
  waves: [
    { text: 'Dos aleros. Las unidades frente a la claraboya cubren ambos.', groups: [TD.g('callejero', 8, 1.0, 0, 0), TD.g('callejero', 8, 1.0, 0, 1)] },
    [TD.g('cazador', 6, 1.3, 0, 0), TD.g('siames', 6, 0.8, 2, 1)],
    [TD.g('siames', 6, 0.8, 2, 0), TD.g('cazador', 6, 1.3, 0, 1)],
    [TD.g('sombra', 4, 2.0, 0, 0), TD.g('sombra', 4, 2.0, 0, 1), TD.g('callejero', 10, 0.7, 4, 0)],
    [TD.g('peludo', 1, 1, 0, 0), TD.g('peludo', 1, 1, 4, 1), TD.g('cazador', 8, 1.1, 2, 0), TD.g('cazador', 8, 1.1, 2, 1)],
    { text: 'Una camada por cada alero.', groups: [TD.g('callejero', 16, 0.45, 0, 0), TD.g('callejero', 16, 0.45, 0, 1)] },
    [TD.g('siames', 10, 0.6, 0, 0), TD.g('sombra', 5, 1.6, 0, 1), TD.g('peludo', 2, 6, 4, 1)],
    [TD.g('cazador', 14, 0.9, 0, 0), TD.g('cazador', 14, 0.9, 0, 1), TD.g('peludo', 2, 5, 6, 0)],
    [TD.g('sombra', 6, 1.3, 0, 0), TD.g('sombra', 6, 1.3, 0, 1), TD.g('siames', 10, 0.55, 6, 0), TD.g('siames', 10, 0.55, 6, 1)],
    [TD.g('peludo', 3, 4, 0, 0), TD.g('peludo', 3, 4, 0, 1), TD.g('callejero', 16, 0.45, 5, 0), TD.g('callejero', 16, 0.45, 5, 1)],
    {
      text: 'La guardia de la Reina. Lo que sobreviva ahora, sobrevive a Ojos de Ámbar.',
      groups: [
        TD.g('callejero', 24, 0.4, 0, 0), TD.g('cazador', 16, 0.8, 2, 1), TD.g('siames', 12, 0.5, 8, 0),
        TD.g('sombra', 6, 1.3, 10, 1), TD.g('peludo', 3, 3.5, 12, 0), TD.g('peludo', 3, 3.5, 12, 1),
      ],
    },
    {
      text: '¡La Reina Lince en persona! Si llega al Granero, se acabó.',
      groups: [TD.g('reinalince', 1, 1, 5, 0), TD.g('cazador', 12, 1.1, 0, 1), TD.g('callejero', 16, 0.55, 8, 1), TD.g('peludo', 2, 5, 15, 1)],
    },
  ],
});
