/* Nueve Vidas · bestiario: los enemigos de cada bando.
 * Los roedores atacan en los niveles de gatos; los gatos atacan en los niveles de roedores.
 * Campos:
 *  faction  bando al que pertenece el enemigo
 *  hp       vida
 *  speed    velocidad en casillas por segundo
 *  armor    reducción fija de daño por golpe (las unidades con "pierce" la ignoran)
 *  reward   latas (gatos) o semillas (roedores) que deja al morir
 *  lives    oportunidades que le quita al jugador si llega a la base (vidas o escapes)
 *  radius   radio visual/colisión en casillas
 *  look     aspecto (ver js/render.js → SPECIES)
 *  hide     {up, down, style}: segundos visible / oculto. style: 'burrow' (bajo tierra) o 'shadow' (entre las sombras).
 *           Solo lo ven las unidades con detectsHidden.
 *  summon   {enemy, count, every}: invoca refuerzos a su paso
 *  steals   ladrón: al llegar a la base no gasta vidas (lives: 0); roba esta cantidad de latas o
 *           semillas y vuelve por donde entró. Si muere antes de salir, lo robado se recupera.
 *  speedLoaded  velocidad del ladrón cuando vuelve cargado
 *  lastWords    lo que dice un jefe al caer (queda en la Crónica)
 *  echoTemplate plantilla del "eco": una vida pasada del jugador que vuelve como enemigo con su nombre
 */
(function () {
  const TD = globalThis.TD;
  const E = TD.registerEnemy;

  /* ---------------------------------------------------- Roedores (atacan a los gatos) */
  E({ id: 'raton', faction: 'roedores', name: 'Ratón', plural: 'Ratones', look: 'mouse',
    desc: 'Rápido y frágil. Nunca viene solo.',
    hp: 30, speed: 1.6, armor: 0, reward: 4, lives: 1, radius: 0.26 });

  E({ id: 'rata', faction: 'roedores', name: 'Rata', plural: 'Ratas', look: 'rat',
    desc: 'La infantería roedora. Aguanta más que el ratón.',
    hp: 75, speed: 1.2, armor: 0, reward: 6, lives: 1, radius: 0.3 });

  E({ id: 'ardilla', faction: 'roedores', name: 'Ardilla', plural: 'Ardillas', look: 'squirrel',
    desc: 'Velocísima. Si no la frenas, se te escapa.',
    hp: 45, speed: 2.6, armor: 0, reward: 6, lives: 1, radius: 0.28 });

  E({ id: 'topo', faction: 'roedores', name: 'Topo', plural: 'Topos', look: 'mole',
    desc: 'Excava y desaparece bajo tierra. Solo Zarpas lo huele ahí abajo.',
    hp: 110, speed: 1.0, armor: 1, reward: 9, lives: 1, radius: 0.3,
    hide: { up: 2.0, down: 2.5, style: 'burrow' } });

  E({ id: 'capibara', faction: 'roedores', name: 'Capibara', plural: 'Capibaras', look: 'capybara',
    desc: 'Un tanque peludo. Su pellejo ignora los golpes débiles. Si llega, te cuesta 2 vidas.',
    hp: 420, speed: 0.75, armor: 5, reward: 22, lives: 2, radius: 0.44 });

  E({ id: 'reyrata', faction: 'roedores', name: 'Rey Rata Colagris', plural: 'Reyes Rata', look: 'ratking', boss: true,
    desc: 'El señor de las alcantarillas. Convoca ratones a su paso. Si llega a la Despensa, se acaban todas tus vidas.',
    hp: 2200, speed: 0.8, armor: 4, reward: 200, lives: 9, radius: 0.5,
    summon: { enemy: 'raton', count: 2, every: 6 },
    lastWords: '«Yo también tuve garras, gatito. Pregúntale a la Rueda.»' });

  E({ id: 'listada', faction: 'roedores', name: 'Listada', plural: 'Listadas', look: 'chipmunk', article: 'una',
    desc: 'Ardilla listada de mejillas enormes. No quita vidas: roba 30 latas de la Despensa y vuelve por donde vino. Cázala antes de que salga y las recuperas.',
    hp: 400, speed: 3.0, speedLoaded: 1.9, armor: 3, reward: 12, lives: 0, radius: 0.28, steals: 30 });

  E({ id: 'eco-roedor', faction: 'roedores', name: 'Eco', plural: 'Ecos', look: 'rat', echoTemplate: true,
    desc: 'Alguien que fuiste. Camina sin prisa y no te reconoce.',
    hp: 320, speed: 1.25, armor: 2, reward: 45, lives: 1, radius: 0.32 });

  /* ------------------------------------------------------ Gatos (atacan a los roedores) */
  E({ id: 'callejero', faction: 'gatos', name: 'Callejero', plural: 'Callejeros', look: 'alley',
    desc: 'Gato joven de los escombros. Rápido, flaco y muy numeroso.',
    hp: 30, speed: 1.6, armor: 0, reward: 4, lives: 1, radius: 0.3 });

  E({ id: 'cazador', faction: 'gatos', name: 'Cazador', plural: 'Cazadores', look: 'tabby',
    desc: 'Gato atigrado adulto. La infantería del Clan del Muro.',
    hp: 75, speed: 1.2, armor: 0, reward: 6, lives: 1, radius: 0.34 });

  E({ id: 'siames', faction: 'gatos', name: 'Siamés', plural: 'Siameses', look: 'siamese',
    desc: 'Flaco y velocísimo. Si no lo frenas, se te mete en el Granero.',
    hp: 45, speed: 2.6, armor: 0, reward: 6, lives: 1, radius: 0.3,
    });

  E({ id: 'sombra', faction: 'gatos', name: 'Sombra', plural: 'Sombras', look: 'black',
    desc: 'Gato negro. Se funde con las sombras y desaparece. Solo las púas del Puercoespín lo sienten.',
    hp: 110, speed: 1.0, armor: 1, reward: 9, lives: 1, radius: 0.32,
    hide: { up: 2.0, down: 2.5, style: 'shadow' } });

  E({ id: 'peludo', faction: 'gatos', name: 'Peludo', plural: 'Peludos', look: 'maine',
    desc: 'Un gato enorme de pelo largo. Los golpes débiles se pierden en su pelaje. Si llega, te cuesta 2 escapes.',
    hp: 420, speed: 0.75, armor: 5, reward: 22, lives: 2, radius: 0.46 });

  E({ id: 'reinalince', faction: 'gatos', name: 'Reina Lince Ojos de Ámbar', plural: 'Reinas Lince', look: 'lynxqueen', boss: true,
    desc: 'La señora de las colinas. Llama a sus callejeros a su paso. Si llega al Granero, no hay milagro que te salve.',
    hp: 2200, speed: 0.8, armor: 4, reward: 200, lives: 9, radius: 0.52,
    summon: { enemy: 'callejero', count: 2, every: 6 },
    lastWords: '«Yo también fui pequeña y corrí. Ya lo recordarás.»' });

  E({ id: 'ratero', faction: 'gatos', name: 'Ratero', plural: 'Rateros', look: 'bandit', article: 'un',
    desc: 'Gato flaco con antifaz. No quita escapes: roba 30 semillas del Granero y vuelve por donde vino. Cázalo antes de que salte el muro y las recuperas.',
    hp: 400, speed: 3.0, speedLoaded: 1.9, armor: 3, reward: 12, lives: 0, radius: 0.3, steals: 30 });

  E({ id: 'eco-gato', faction: 'gatos', name: 'Eco', plural: 'Ecos', look: 'tabby', echoTemplate: true,
    desc: 'Alguien que fuiste. Camina sin prisa y no te reconoce.',
    hp: 320, speed: 1.25, armor: 2, reward: 45, lives: 1, radius: 0.34 });
})();
