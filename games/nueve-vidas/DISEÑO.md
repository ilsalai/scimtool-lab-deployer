# Nueve Vidas · documento de diseño

La historia está en [TRAMA.md](TRAMA.md). Este documento cubre las reglas, el contenido, el arte y
lo que sigue.

## La idea en tres líneas

Un tower defense donde el jugador no es un general sino **un animal con nueve oportunidades**.
Gatos y roedores se disputan lo que dejaron los humanos al desaparecer. Perder no es el fin: es
despertar del otro lado de la guerra.

## La Rueda (mecánica central)

| | Gato | Roedor |
|---|---|---|
| Oportunidades | 9 vidas | 9 escapes milagrosos |
| Se gasta una cuando | un roedor llega a la Despensa | un gato llega al Granero |
| Al perder la novena | la Colonia gana la guerra; despiertas como roedor | el Clan gana la guerra; despiertas como gato |
| Se recuperan | nunca; solo un personaje nuevo nace con nueve | igual |

- Cada oportunidad perdida tiene **su relato** y queda en la **Crónica**.
- La novena tiene pantalla propia; luego nace el personaje nuevo, con nombre, especie y retrato.
- El **progreso de cada bando se conserva** entre encarnaciones.
- **Ecos**: si ya viviste en el bando que ahora ataca, tu vida anterior aparece una vez por nivel
  como enemigo con nombre. Es más dura que el resto y pesa más cuanto más avanzado el nivel.
- Ganar todos los niveles de un bando permite seguir o **dejar que la Rueda gire** por elección.
  La opción queda disponible en la lista de niveles.
- Los jefes cuestan **las nueve**.

## Economía y oleadas

- Cada baja deja latas o semillas. Completar el envío de una oleada paga un bono (12 + 4 × número
  de oleada). Adelantar la siguiente paga los segundos que faltaban de la cuenta regresiva.
- Vender devuelve el 70 %. Las unidades se mejoran dos veces.
- **Tres estrellas** exigen no perder oportunidades ni botín. Dos, perder hasta dos oportunidades.

## Unidades (espejo entre bandos)

| Rol | Gato | Roedor | Qué hace |
|---|---|---|---|
| Tirador | **Vigía** | **Hondera** (ardilla) | barato, fiable, 50 |
| Cuerpo a cuerpo | **Zarpas** | **Puercoespín** | golpe brutal, poco alcance, detecta ocultos, 80 |
| Control | **Maullador** | **Silbadora** (marmota) | onda que frena en área, 70 |
| Área | **Lanzasardinas** | **Bombardero** (hámster) | daño en área contra enjambres, 110 |
| Francotirador | **Lince** | **Jerbo** | alcance enorme, ignora armadura, lento, 160 |

Cada unidad colocada recibe un nombre propio y lleva su cuenta de bajas. Prioridades de disparo:
más adelantado, más atrasado, más fuerte, más cercano y **ladrones primero**.

## Enemigos (espejo entre bandos)

| Rol | Roedor (ataca a gatos) | Gato (ataca a roedores) | Rasgo |
|---|---|---|---|
| Enjambre | Ratón | Callejero | 30 de vida, rápido, viene de a muchos |
| Infantería | Rata | Cazador | 75 de vida |
| Veloz | Ardilla | Siamés | 2,6 casillas/s |
| Oculto | Topo (bajo tierra) | Sombra (entre sombras) | invisible por ratos; solo el cuerpo a cuerpo lo ve |
| Tanque | Capibara | Peludo | 420 de vida, armadura 5, cuesta 2 oportunidades |
| Ladrón | Listada | Ratero | 400 de vida, entra a 3 casillas/s, roba 30 y vuelve a 1,9; no gasta oportunidades |
| Eco | Eco de tu vida roedora | Eco de tu vida gatuna | 320 de vida base, escala con el nivel, cuesta 1 |
| Jefe | Rey Rata Colagris | Reina Lince Ojos de Ámbar | 2200 de vida, invoca refuerzos, cuesta las nueve |

### Cómo funciona el ladrón

- Entra rápido y aguanta: casi siempre llega. No pasa por la regla de vidas.
- En la base roba 30 (o lo que haya) y da media vuelta. Vuelve más lento, con el saco a cuestas.
- Si muere antes de salir del mapa, lo robado vuelve. Si sale, se pierde.
- Para las unidades, "más adelantado" significa "al que menos le falta para hacer daño": un ladrón
  que vuelve es urgente cerca de la entrada y poco urgente cerca de la base. La prioridad
  "ladrones primero" lo fuerza.
- Decisiones nuevas: defender la entrada, que antes nadie cubría; qué unidades cambian de
  prioridad; gastar antes de una oleada de ladrones o guardar reserva.

## Niveles

Campaña de los gatos (*La guerra de las Despensas*):

1. **El Jardín Olvidado** · sendero en S de 33 casillas, 8 oleadas, de mañana.
2. **La Autopista Rota** · tres carriles con vueltas, 49 casillas, 10 oleadas, atardecer. Topos y Lanzasardinas.
3. **La Gran Despensa** · dos pasillos que se juntan, 12 oleadas, penumbra. Lince y el Rey Rata.
4. **El Patio de Carga** · una vuelta entera alrededor de una isla, 39 casillas, 12 oleadas, noche con lluvia. Listadas.

Campaña de los roedores (*La guerra del Granero*):

1. **El Terraplén** · trigal, 44 casillas, 8 oleadas, mediodía.
2. **Las Alcantarillas** · túneles y canales, 40 casillas, 10 oleadas, a oscuras. Sombras y Bombardero.
3. **El Tejado del Templo** · dos aleros, 12 oleadas, anochecer. Jerbo y la Reina Lince.
4. **El Silo** · espiral con el Granero en el centro, 36 casillas, 12 oleadas, interior cálido. Rateros.

## Dirección de arte: HD-2D

- **Pixel art de alta densidad**: 32 píxeles por casilla, el doble que un juego de 16 bits. Las
  unidades miden unos 22×28 píxeles; un jefe, más de 40.
- **Todo procedural**: cada especie es una ficha de colores y rasgos; el motor la dibuja sentada de
  frente y caminando de perfil, con rampas de color que viran a violeta en la sombra y a amarillo
  en la luz, sombreado por volumen y contorno del color del propio pelaje.
- **Terreno pintado píxel a píxel**: bordes ondulados, caminos hundidos con pared y sombra,
  texturas por tema, y un margen decorativo fuera del tablero.
- **Luz en alta resolución encima del pixel art**: sombras proyectadas con la silueta de cada
  sprite, mapa de luz por nivel, faroles y lucecitas de las unidades en los niveles oscuros,
  resplandores, rayos de sol, partículas, desenfoque del margen y viñeta.
- **Cada capítulo tiene su hora**, y el Acto II es más oscuro que el I.
- La interfaz es nítida y moderna, con los mismos sprites como retratos.

## Balance (según el simulador)

`node tools/simulate.js` juega cada nivel con un bot heurístico:

- *Equilibrada* (mezcla de roles, mejoras, espera la cuenta regresiva): gana los ocho niveles con 8 a 9 oportunidades. En los capítulos 4 le roban unas 480 y recupera casi todo.
- *Agresiva* (adelanta todas las oleadas): gana los capítulos 1 y 2 y cae en los 3 y 4.
- *Solo básicas*: gana los capítulos 1 y 2 con pérdidas y sufre en adelante.
- *Perezosa* (tres unidades): pierde todo.

El bot no sabe defender la entrada ni cambiar prioridades, así que un humano que entienda a los
ladrones lo tendrá algo más fácil. Falta calibrar con personas.

## Lo que sigue

En orden:

1. **Capítulo 5 · El Invierno Largo**: mecánica de frío y hoguera. Ver TRAMA.md.
2. **Capítulo 6 · La marcha al Molino**: los dos bandos en el mismo mapa, desde lados opuestos.
3. **Los Fieles**: tercer bando solo como enemigo, y el nivel final con unidades de los dos bandos.
4. **Rasgos por encarnación**: cada personaje nace con un rasgo pequeño (más alcance, unidades más
   baratas) para que cada vuelta de la Rueda se sienta distinta.
5. **Animación**: cuadros de ataque propios por unidad y vista de frente y de espaldas para los
   enemigos que suben o bajan.
6. **Música** por bando con WebAudio; hoy solo hay efectos.
7. **Unidades aéreas** y **modo sin fin**, cuando las dos campañas estén completas.
