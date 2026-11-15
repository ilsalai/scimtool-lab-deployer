/* Nivel 4 (gatos) · El Patio de Carga
 * Introduce a los ladrones: no gastan vidas, roban latas y vuelven por donde entraron. */
TD.registerLevel({
  id: 'patio-de-carga',
  faction: 'gatos',
  order: 4,
  name: 'El Patio de Carga',
  subtitle: 'Capítulo 4 · El Saqueo',
  difficulty: 4,
  theme: 'patio',
  intro:
    'Detrás de la Gran Despensa está el patio donde las bestias de metal de los Bípedos descargaban ' +
    'las latas. Llueve desde que cayó Colagris. La Colonia ya no manda guerreros: manda hambre. Las ' +
    'Listadas no vienen a morder, vienen a robar: cada una que llega a la bóveda se lleva treinta ' +
    'latas y vuelve por donde entró, más lenta, con el saco a cuestas. No cuestan vidas; cuestan ' +
    'comida. Lo que no frenes a la ida, cázalo a la vuelta: la madriguera es ahora tu última línea.',
  outro:
    'Cuando el patio quedó en silencio, miraste las latas del fondo. Las del Clan llevan dibujada la ' +
    'cara de un gato; siempre creímos que los Bípedos las hicieron en nuestro honor. Las del fondo ' +
    'llevan otra cara: más grande, con la lengua afuera. Y son muchas más que las nuestras. Alguien ' +
    'más va a venir por lo suyo.',
  startCans: 300,
  countdown: 25,
  towers: ['vigia', 'zarpas', 'maullador', 'lanzasardinas', 'lince'],
  map: [
    '~~~~::::::::L:::::',
    '~~S#######::::C:::',
    ':::::::::#::::::::',
    ':C:::::::####:::::',
    '::::::::::::#::L::',
    ':::L::::::::#:::::',
    '::::#########:::::',
    '::::#::::::::::C::',
    '::::########::::::',
    ':R:::::::::#::::::',
    ':::::::::::#####E:',
    '::::::::::::::::::',
  ],
  waves: [
    { text: 'Exploradores por la madriguera del portón. El patio da una vuelta entera: la isla del centro cubre dos tramos.', groups: [TD.g('raton', 12, 0.8), TD.g('rata', 4, 1.5, 4)] },
    [TD.g('rata', 10, 1.1), TD.g('ardilla', 8, 0.6, 6)],
    { text: '¡Listadas! No quitan vidas: roban 30 latas y vuelven por donde vinieron. Cázalas antes de la madriguera y las recuperas.', groups: [TD.g('listada', 3, 2.0), TD.g('raton', 8, 0.8, 2)] },
    [TD.g('capibara', 1, 1), TD.g('rata', 10, 1.0, 2), TD.g('listada', 3, 1.6, 10)],
    [TD.g('topo', 6, 1.6), TD.g('raton', 16, 0.55, 3)],
    { text: 'Las ratas distraen; las Listadas roban. En el panel de un gato puedes elegir «Ladrones primero».', groups: [TD.g('rata', 14, 0.8), TD.g('listada', 5, 1.1, 5)] },
    [TD.g('capibara', 3, 5), TD.g('ardilla', 12, 0.55, 3), TD.g('listada', 4, 1.2, 12)],
    [TD.g('raton', 26, 0.4), TD.g('listada', 5, 1.0, 6), TD.g('topo', 4, 1.5, 8)],
    [TD.g('topo', 8, 1.2), TD.g('capibara', 3, 4, 4), TD.g('listada', 5, 1.2, 10)],
    { text: 'Las Listadas aprendieron: entran detrás de las capibaras.', groups: [TD.g('capibara', 4, 3.5), TD.g('listada', 6, 0.9, 2), TD.g('ardilla', 12, 0.5, 10)] },
    [TD.g('rata', 16, 0.75), TD.g('topo', 6, 1.2, 4), TD.g('listada', 7, 0.9, 12), TD.g('raton', 20, 0.45, 14), TD.g('capibara', 2, 4, 18)],
    {
      text: 'El Gran Saqueo. Todo lo que no caces a la vuelta, se lo llevan.',
      groups: [TD.g('listada', 10, 0.7), TD.g('capibara', 5, 3, 2), TD.g('raton', 24, 0.35, 6), TD.g('rata', 14, 0.8, 10), TD.g('ardilla', 12, 0.45, 16), TD.g('topo', 6, 1.2, 20)],
    },
  ],
});
