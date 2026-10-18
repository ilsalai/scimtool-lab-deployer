/* Nivel 2 · La Autopista Rota */
TD.registerLevel({
  id: 'autopista-rota',
  faction: 'gatos',
  order: 2,
  name: 'La Autopista Rota',
  subtitle: 'Capítulo 2 · El camino de alquitrán',
  difficulty: 2,
  theme: 'autopista',
  intro:
    'Los Bípedos construyeron ríos de alquitrán por los que corrían sus bestias de metal. ' +
    'Hoy las bestias duermen oxidadas y por el alquitrán, agrietado y lleno de hierba, marchan ' +
    'los roedores hacia la Despensa de la estación de servicio. El camino es largo y da tres ' +
    'vueltas: un gato bien puesto entre dos carriles trabaja el doble. Cuidado con los topos: ' +
    'bajo tierra solo Zarpas los huele.',
  startCans: 230,
  lives: 9,
  countdown: 25,
  towers: ['vigia', 'zarpas', 'maullador', 'lanzasardinas'],
  map: [
    'S###########.L..',
    ':::C:::::::#..:.',
    ':::::::L:::#.C..',
    '...#########....',
    '.::#::C:::::L...',
    '.R:#::::::::....',
    '...##########...',
    '::::C:::::::#...',
    ':L::::::R:::#...',
    'E############...',
    '....T....T......',
  ],
  waves: [
    [TD.g('raton', 10, 0.9)],
    [TD.g('rata', 8, 1.2), TD.g('ardilla', 6, 0.7, 6)],
    { text: 'Topos. Desaparecen bajo tierra: solo Zarpas los huele.', groups: [TD.g('topo', 4, 2.0), TD.g('raton', 10, 0.7, 3)] },
    [TD.g('capibara', 2, 6), TD.g('rata', 12, 1.0, 2)],
    { text: 'Enjambre. Las sardinas del Lanzasardinas salpican a varios a la vez.', groups: [TD.g('raton', 24, 0.4)] },
    [TD.g('topo', 6, 1.6), TD.g('ardilla', 10, 0.6, 5)],
    [TD.g('capibara', 3, 5), TD.g('rata', 16, 0.9, 1)],
    [TD.g('raton', 26, 0.45), TD.g('ardilla', 12, 0.5, 8)],
    [TD.g('topo', 8, 1.3), TD.g('capibara', 4, 4, 3)],
    {
      text: 'Todo lo que tienen. Aguanta y la estación es tuya.',
      groups: [TD.g('raton', 30, 0.4), TD.g('rata', 14, 0.9, 5), TD.g('ardilla', 10, 0.5, 12), TD.g('capibara', 5, 3.5, 10)],
    },
  ],
});
