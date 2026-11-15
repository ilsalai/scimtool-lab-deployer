/* Nivel 4 (roedores) · El Silo
 * Introduce a los ladrones: no gastan escapes, roban semillas y vuelven por donde entraron. */
TD.registerLevel({
  id: 'silo',
  faction: 'roedores',
  order: 14,
  name: 'El Silo',
  subtitle: 'Capítulo 4 · El Saqueo',
  difficulty: 4,
  theme: 'silo',
  intro:
    'Más allá del Terraplén se alza una torre redonda que los Bípedos llenaron de grano: el Silo. ' +
    'Desde que cayó Ojos de Ámbar el Clan ya no manda cazadores: manda hambre. Los Rateros no vienen ' +
    'a morder, vienen a robar: cada uno que llega a la boca del Silo se lleva treinta semillas y ' +
    'vuelve por donde entró, más lento, con el saco al lomo. No cuestan escapes; cuestan comida. El ' +
    'sendero rodea el Silo en espiral: lo que no caces a la ida, cázalo a la vuelta. El agujero del ' +
    'muro es tu última línea.',
  outro:
    'Cuando el Silo quedó en silencio, olfateaste los sacos del fondo. Los de arriba huelen a grano. ' +
    'Los de abajo huelen a carne seca y llevan dibujada una cara grande, con la lengua afuera. No es ' +
    'comida de gato ni de roedor. Y son muchos más que los nuestros. Alguien más va a venir por lo suyo.',
  startCans: 300,
  countdown: 25,
  towers: ['hondera', 'puas', 'silbadora', 'bombardero', 'jerbo'],
  map: [
    'TT......T.......TT',
    '..............L...',
    'S#######........T.',
    '.......#..........',
    '.......########...',
    '..L...........#...',
    '......####E...#...',
    '......#.......#...',
    '.R....#.......#...',
    '......#########...',
    '..............L.~~',
    'TT......T.......TT',
  ],
  waves: [
    { text: 'Callejeros por el agujero del muro. El sendero rodea el Silo: el centro de la espiral cubre dos tramos.', groups: [TD.g('callejero', 12, 0.8), TD.g('cazador', 4, 1.5, 4)] },
    [TD.g('cazador', 10, 1.1), TD.g('siames', 8, 0.6, 6)],
    { text: '¡Rateros! No quitan escapes: roban 30 semillas y vuelven por donde vinieron. Cázalos antes del muro y las recuperas.', groups: [TD.g('ratero', 3, 2.0), TD.g('callejero', 8, 0.8, 2)] },
    [TD.g('peludo', 1, 1), TD.g('cazador', 10, 1.0, 2), TD.g('ratero', 3, 1.6, 10)],
    [TD.g('sombra', 6, 1.6), TD.g('callejero', 16, 0.55, 3)],
    { text: 'Los Cazadores distraen; los Rateros roban. En el panel de una unidad puedes elegir «Ladrones primero».', groups: [TD.g('cazador', 14, 0.8), TD.g('ratero', 5, 1.1, 5)] },
    [TD.g('peludo', 3, 5), TD.g('siames', 12, 0.55, 3), TD.g('ratero', 4, 1.2, 12)],
    [TD.g('callejero', 26, 0.4), TD.g('ratero', 5, 1.0, 6), TD.g('sombra', 4, 1.5, 8)],
    [TD.g('sombra', 8, 1.2), TD.g('peludo', 3, 4, 4), TD.g('ratero', 5, 1.2, 10)],
    { text: 'Los Rateros aprendieron: entran detrás de los Peludos.', groups: [TD.g('peludo', 4, 3.5), TD.g('ratero', 6, 0.9, 2), TD.g('siames', 12, 0.5, 10)] },
    [TD.g('cazador', 16, 0.75), TD.g('sombra', 6, 1.2, 4), TD.g('ratero', 7, 0.9, 12), TD.g('callejero', 20, 0.45, 14), TD.g('peludo', 2, 4, 18)],
    {
      text: 'El Gran Saqueo. Todo lo que no caces a la vuelta, se lo llevan.',
      groups: [TD.g('ratero', 10, 0.7), TD.g('peludo', 5, 3, 2), TD.g('callejero', 24, 0.35, 6), TD.g('cazador', 14, 0.8, 10), TD.g('siames', 12, 0.45, 16), TD.g('sombra', 6, 1.2, 20)],
    },
  ],
});
