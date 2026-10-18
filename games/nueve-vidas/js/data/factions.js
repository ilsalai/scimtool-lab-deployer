/* Nueve Vidas · los dos bandos y la historia de la Rueda.
 * El jugador siempre es un personaje con nueve oportunidades: un gato tiene
 * nueve vidas; un roedor, nueve escapes milagrosos. Al perder la novena, el
 * otro bando gana la guerra y la Rueda te devuelve... del otro lado. */
(function () {
  const TD = globalThis.TD;

  TD.registerFaction({
    id: 'gatos',
    name: 'Gatos',
    clan: 'el Clan del Muro',
    enemy: 'roedores',
    color: '#f1a53c',
    base: 'la Despensa',
    baseShort: 'Despensa',
    currency: 'latas',
    currencyIcon: 'can',
    unitsWord: 'Gatos',
    livesWord: 'vida',
    livesPlural: 'vidas',
    lostVerb: 'perdida',
    campaignTitle: 'La guerra de las Despensas',
    names: [
      'Bigotes', 'Michi', 'Pelusa', 'Garfio', 'Nube', 'Tizón', 'Canela', 'Olivo', 'Mora', 'Ceniza',
      'Trueno', 'Lúa', 'Félix', 'Noa', 'Tigre', 'Mancha', 'Pirata', 'Salem', 'Ámbar', 'Musgo',
      'Trufa', 'Sombra', 'Chispa', 'Nácar', 'Rufo', 'Brisa', 'Coco', 'Simba', 'Misifú', 'Pancho',
      'Kiwi', 'Zarina', 'Bruno', 'Greta', 'Ígor', 'Luna', 'Dante', 'Frida', 'Romeo', 'Olga',
      'Nico', 'Mimi', 'Tom', 'Benito', 'Gala', 'Lolo', 'Odín', 'Pepa', 'Hugo', 'Zoe',
    ],
    // Aspectos posibles del personaje y cómo se lo nombra.
    looks: [
      { look: 'tabby', label: 'gato atigrado', article: 'un' },
      { look: 'black', label: 'gato negro de patas blancas', article: 'un' },
      { look: 'grey', label: 'gato gris', article: 'un' },
      { look: 'calico', label: 'gata calicó', article: 'una' },
      { look: 'white', label: 'gato blanco', article: 'un' },
      { look: 'siamese', label: 'gato siamés', article: 'un' },
    ],
    // Texto de cada vida perdida (1ª a 8ª). La 9ª tiene su propio texto.
    deaths: [
      'Un ratón te pasó entre las patas y, del susto, caíste del muro. Volviste con el orgullo herido.',
      'Te quedaste dormido al sol. Al despertar, el camino olía a rata. Juraste no volver a cerrar los ojos.',
      'Una ardilla te hizo correr hasta que el corazón dijo basta. Esta vida es más lenta... y más lista.',
      'Las ratas te rodearon en la curva. Peleaste bien. No alcanzó. Despertaste tres noches después, entre helechos.',
      'Una capibara ni siquiera te vio: te pasó por encima como una nube con patas.',
      'Caíste al agua persiguiendo a un topo. Los gatos no están hechos para el agua. Ya lo sabías.',
      'La horda cantó tu nombre mientras cruzaba. Lo tomaste como un cumplido. Después, oscuridad.',
      'Perdiste media oreja y toda la paciencia. Te queda una sola vida y el peso de las otras ocho.',
    ],
    ninth: (name, level) =>
      `La novena vida de ${name} se apagó en ${level}. Los roedores celebran entre las latas y la Colonia ` +
      'declara ganada la guerra. El Clan del Muro cantará tu nombre bajo la luna... y la Rueda gira.',
    awaken: (name, species) =>
      `Despiertas en tierra tibia. Tus manos son pequeñas, tu cola es larga y tu corazón late deprisa. Eres ${name}, ` +
      `${species.article} ${species.label} de la Colonia. Los gatos vienen por el Granero, y hoy no tienes nueve vidas: tienes nueve milagros.`,
    firstLife: (name, species) =>
      `Eres ${name}, ${species.article} ${species.label} del Clan del Muro. Hace diez mil estaciones los Bípedos ` +
      'desaparecieron y dejaron sus Despensas llenas de latas que no se pudren. Los roedores las quieren. ' +
      'Tienes nueve vidas para impedirlo. Gástalas bien.',
    warWon: (name) =>
      `${name} defendió todas las Despensas. El Clan del Muro gana la guerra... por ahora. En esta tierra nada ` +
      'termina: puedes seguir patrullando tus Despensas o dejar que la Rueda gire y ver el mundo con otros ojos.',
  });

  TD.registerFaction({
    id: 'roedores',
    name: 'Roedores',
    clan: 'la Colonia',
    enemy: 'gatos',
    color: '#9bd36b',
    base: 'el Granero',
    baseShort: 'Granero',
    currency: 'semillas',
    currencyIcon: 'seed',
    unitsWord: 'Roedores',
    livesWord: 'escape',
    livesPlural: 'escapes',
    lostVerb: 'gastado',
    campaignTitle: 'La guerra del Granero',
    names: [
      'Pizca', 'Roque', 'Migaja', 'Bolita', 'Nuez', 'Semilla', 'Orejas', 'Rasguño', 'Trigo', 'Pipo',
      'Cuca', 'Hilacha', 'Tuco', 'Remache', 'Grano', 'Ñoqui', 'Pelusín', 'Cholo', 'Rufina', 'Avena',
      'Mosca', 'Tapón', 'Chicle', 'Fidel', 'Perla', 'Mendrugo', 'Lupe', 'Tito', 'Nata', 'Colita',
      'Bellota', 'Raspa', 'Pancracio', 'Tila', 'Birra', 'Lenteja', 'Ñato', 'Pulga', 'Cebada', 'Quino',
    ],
    looks: [
      { look: 'mouse', label: 'ratón de campo', article: 'un' },
      { look: 'rat', label: 'rata de alcantarilla', article: 'una' },
      { look: 'squirrel', label: 'ardilla roja', article: 'una' },
      { look: 'hamster', label: 'hámster de mejillas llenas', article: 'un' },
      { look: 'marmot', label: 'marmota silbadora', article: 'una' },
      { look: 'jerboa', label: 'jerbo saltarín', article: 'un' },
    ],
    deaths: [
      'El gato te tenía entre los dientes. Estornudó. Corriste.',
      'Te escondiste en una lata vacía. El gato miró la lata durante una hora. Los gatos son así.',
      'Saltaste al agua. El gato no. Nunca lo hacen.',
      'Una raíz, un agujero y una zarpa que no llegó por un pelo. Milagro número cuatro.',
      'El gato se distrajo con una mariposa. Juraste no burlarte nunca más de las mariposas.',
      'Te quedaste tan quieto que el gato te creyó piedra. Fuiste piedra hasta el amanecer.',
      'Dos gatos se pelearon por ti. Mientras discutían, te fuiste.',
      'Caíste del tejado sobre un montón de hojas. El gato cayó del otro lado del muro. Te queda un milagro.',
    ],
    ninth: (name, level) =>
      `Esta vez no hubo milagro. En ${level} el gato cerró las fauces y ${name} dejó de correr. El Clan del ` +
      'Muro declara ganada la guerra y la Colonia recordará tus nueve escapes... y la Rueda gira.',
    awaken: (name, species) =>
      `Abres los ojos y tienes garras. Un ronroneo que no sabías que llevabas dentro te sacude el pecho. Eres ${name}, ` +
      `${species.article} ${species.label} del Clan del Muro. Tienes nueve vidas. Gástalas bien.`,
    firstLife: (name, species) =>
      `Eres ${name}, ${species.article} ${species.label} de la Colonia. El Granero guarda el grano de mil ` +
      'inviernos y los gatos vienen a quitárselo. No tienes nueve vidas, pero tienes nueve milagros. No los desperdicies.',
    warWon: (name) =>
      `${name} defendió el Granero hasta el final. La Colonia gana la guerra... por ahora. Puedes seguir ` +
      'vigilando tus túneles o dejar que la Rueda gire y descubrir qué se siente tener garras.',
  });
})();
