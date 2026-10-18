/* Nivel 2 (roedores) · Las Alcantarillas */
TD.registerLevel({
  id: 'alcantarillas',
  faction: 'roedores',
  order: 12,
  name: 'Las Alcantarillas',
  subtitle: 'Capítulo 2 · Los túneles de ladrillo',
  difficulty: 2,
  theme: 'alcantarilla',
  intro:
    'Bajo la ciudad muerta corren los ríos de ladrillo de los Bípedos. La Colonia guarda aquí ' +
    'su segundo Granero, en la cámara seca al final del túnel. Los gatos odian el agua, pero ' +
    'por las cornisas pueden pasar... y los negros se funden con la oscuridad: solo las púas ' +
    'del Puercoespín los sienten. El túnel es largo y da tres vueltas: una unidad entre dos ' +
    'pasillos trabaja el doble.',
  startCans: 230,
  countdown: 25,
  towers: ['hondera', 'puas', 'silbadora', 'bombardero'],
  map: [
    '~~~~~~~~~~~~::::',
    'S##########:::::',
    '::::::::::#~~~::',
    ':~~~:.....#~~~::',
    ':~~~:######:::::',
    ':::::#::::::~~~:',
    ':R:::#:::::L~~~:',
    ':::::########:::',
    ':::~~~::::::#:::',
    '::E##########:::',
    '~~~~~~~~~~~~~~~~',
  ],
  waves: [
    [TD.g('callejero', 10, 0.9)],
    [TD.g('cazador', 8, 1.2), TD.g('siames', 6, 0.7, 6)],
    { text: 'Sombras. Desaparecen en la oscuridad: solo el Puercoespín las siente.', groups: [TD.g('sombra', 4, 2.0), TD.g('callejero', 10, 0.7, 3)] },
    [TD.g('peludo', 2, 6), TD.g('cazador', 12, 1.0, 2)],
    { text: 'Una camada entera. Las nueces del Bombardero salpican a varios a la vez.', groups: [TD.g('callejero', 24, 0.4)] },
    [TD.g('sombra', 6, 1.6), TD.g('siames', 10, 0.6, 5)],
    [TD.g('peludo', 3, 5), TD.g('cazador', 16, 0.9, 1)],
    [TD.g('callejero', 26, 0.45), TD.g('siames', 12, 0.5, 8)],
    [TD.g('sombra', 8, 1.3), TD.g('peludo', 4, 4, 3)],
    {
      text: 'Todo el Clan. Aguanta y el túnel es tuyo.',
      groups: [TD.g('callejero', 30, 0.4), TD.g('cazador', 14, 0.9, 5), TD.g('siames', 10, 0.5, 12), TD.g('peludo', 5, 3.5, 10)],
    },
  ],
});
