# Nueve Vidas · documento de diseño

## La idea en tres líneas

Un tower defense donde el jugador no es un general sino **un animal con nueve oportunidades**.
Gatos y roedores se disputan las Despensas que dejaron los humanos al desaparecer. Perder no es
el fin: es despertar del otro lado de la guerra.

## El mundo

**Hace diez mil estaciones los Bípedos desaparecieron.** Nadie sabe por qué y a nadie le importa
demasiado. Dejaron tres cosas que lo cambiaron todo:

- **Las ruinas**: muros, autopistas de alquitrán, templos de pasillos interminables (supermercados),
  alcantarillas de ladrillo. Los gatos, que ya vivían entre ellas, las heredaron.
- **Las Despensas**: montañas de latas que no se pudren. Comida eterna y metal. La cosa más valiosa
  del mundo. Los gatos las custodian; los roedores las codician.
- **El Granero**: lo que los roedores construyeron bajo tierra con el grano silvestre que creció en
  los campos abandonados. Los gatos lo quieren por la misma razón que los roedores quieren las
  latas: comida que no hay que cazar.

Dos civilizaciones nacieron de esa herencia:

- **El Clan del Muro** (gatos). Pocos, letales, territoriales. Viven en las ruinas y custodian las
  Despensas. Moneda: **latas**. Creen que tienen nueve vidas, y en esta tierra es verdad.
- **La Colonia** (roedores). Muchísimos, rápidos, ingeniosos. Viven bajo tierra, en los campos y
  en las alcantarillas. Moneda: **semillas**. No tienen nueve vidas, pero un roedor escapa por
  milagro nueve veces... hasta la novena.

## La Rueda (mecánica central)

| | Gato | Roedor |
|---|---|---|
| Oportunidades | 9 vidas | 9 escapes milagrosos |
| Se gasta una cuando | un roedor llega a la Despensa | un gato llega al Granero |
| Al perder la novena | la Colonia gana la guerra; despiertas como roedor | el Clan gana la guerra; despiertas como gato |
| Las oportunidades se recuperan | nunca; solo un personaje nuevo nace con nueve | igual |

- Cada oportunidad perdida tiene **su relato** (un texto por vida: la primera, la segunda... la
  octava) y queda en la **Crónica**, el diario de todas las encarnaciones.
- La novena tiene una **pantalla propia**: *La Rueda gira*. Luego el **nacimiento** del nuevo
  personaje, con nombre, especie y retrato generados.
- El **progreso de cada bando se conserva**: los niveles ganados por el Clan siguen ganados cuando
  vuelves a ser gato tres encarnaciones después. Un personaje nuevo retoma la guerra, no la
  reinicia.
- Ganar todos los niveles de un bando ofrece una elección: seguir patrullando con tu personaje o
  **dejar que la Rueda gire** voluntariamente para ver el mundo con otros ojos.
- Los jefes (Rey Rata Colagris, Reina Lince Ojos de Ámbar) cuestan **las nueve**: si cruzan, la
  Rueda gira en el acto.

Por qué funciona: perder deja de ser un castigo y pasa a ser **la forma de conocer la otra mitad
del juego**. Y las nueve vidas, que en cualquier otro juego serían un contador, aquí son el hilo
de la historia.

## Economía y oleadas

- Cada baja deja latas/semillas. Completar el envío de una oleada paga un bono (12 + 4 × número de
  oleada). Adelantar la siguiente antes de que termine la cuenta regresiva de 25 s paga un bono
  igual a los segundos que faltaban.
- Vender devuelve el 70 % de lo invertido.
- Las unidades se mejoran dos veces; el precio de la mejora está en los datos de cada nivel de la
  unidad.

## Unidades (espejo entre bandos)

| Rol | Gato | Roedor | Qué hace |
|---|---|---|---|
| Tirador | **Vigía** (atigrado con honda) | **Hondera** (ardilla con bellotas) | barato, fiable, 50 |
| Cuerpo a cuerpo | **Zarpas** (negro de patas blancas) | **Puercoespín** | golpe brutal, poco alcance, rompe armaduras, detecta ocultos, 80 |
| Control | **Maullador** (gris) | **Silbadora** (marmota) | onda que frena en área, 70 |
| Área | **Lanzasardinas** (calicó con catapulta) | **Bombardero** (hámster con nueces) | daño en área contra enjambres, 110 |
| Francotirador | **Lince** | **Jerbo** (cerbatana de espinas) | alcance enorme, ignora armadura, lento, 160 |

Cada unidad colocada recibe un **nombre propio** del bando (Bigotes, Trufa, Pizca, Migaja...) y
lleva su propia cuenta de bajas.

## Enemigos (espejo entre bandos)

| Rol | Roedor (ataca a gatos) | Gato (ataca a roedores) | Rasgo |
|---|---|---|---|
| Enjambre | Ratón | Callejero | 30 de vida, rápido, viene de a muchos |
| Infantería | Rata | Cazador | 75 de vida |
| Veloz | Ardilla | Siamés | 2,6 casillas/s |
| Oculto | Topo (bajo tierra) | Sombra (entre sombras) | invisible por ratos; solo el cuerpo a cuerpo lo ve |
| Tanque | Capibara | Peludo (pelo largo) | 420 de vida, armadura 5, cuesta 2 oportunidades |
| Jefe | Rey Rata Colagris | Reina Lince Ojos de Ámbar | 2200 de vida, invoca refuerzos, cuesta las nueve |

## Niveles actuales

Campaña de los gatos (*La guerra de las Despensas*):

1. **El Jardín Olvidado** · huerto de una casa, camino en S de 33 casillas, 8 oleadas. Enseña a cubrir curvas, luego ardillas (control) y una capibara (cuerpo a cuerpo).
2. **La Autopista Rota** · alquitrán agrietado, tres carriles con vueltas (49 casillas), 10 oleadas. Introduce topos y el Lanzasardinas.
3. **La Gran Despensa** · supermercado con dos pasillos que se juntan frente a la bóveda, 12 oleadas. Introduce el Lince y termina con el Rey Rata.

Campaña de los roedores (*La guerra del Granero*), espejo con mapas propios:

1. **El Terraplén** · trigales junto a las vías muertas, 44 casillas, 8 oleadas.
2. **Las Alcantarillas** · túneles de ladrillo y canales, 40 casillas, 10 oleadas. Introduce Sombras y el Bombardero.
3. **El Tejado del Templo** · dos aleros hacia la claraboya, 12 oleadas. Introduce el Jerbo y termina con la Reina Lince.

## Balance (según el simulador)

`node tools/simulate.js` juega cada nivel con un bot heurístico. Estado actual:

- *Equilibrada* (mezcla de roles, mejoras, espera la cuenta regresiva): gana los seis niveles con 8 a 9 oportunidades.
- *Agresiva* (igual pero adelanta todas las oleadas): gana los niveles 1 y 2 de cada bando y pierde los terceros, como corresponde.
- *Solo básicas* (solo tiradores): gana los niveles 1 y 2 con pérdidas y pierde los terceros contra los tanques.
- *Perezosa* (tres unidades y nada más): pierde todo.

Como las oportunidades se arrastran entre niveles, la intención es que un jugador atento termine
una campaña con 4 a 9 oportunidades y que las nueve se agoten solo si insiste en un nivel que le
queda grande... y entonces la Rueda hace su trabajo.

## Ideas para seguir (en orden de lo que más aporta)

1. **Más capítulos con mecánicas nuevas**, no solo más oleadas: el Puerto (enemigos acuáticos:
   nutrias y coipos que esquivan por el agua; gatos pescadores que los vigilan), la Noche (visión
   reducida; el Maullador alumbra), la Tormenta (la lluvia frena a los gatos y acelera a los
   roedores).
2. **Unidades aéreas**: ardillas voladoras y, del otro lado, gatos que saltan entre tejados. Solo
   las alcanzan los tiradores y los francotiradores.
3. **Ladrones**: ardillas listadas que no quitan vidas sino que roban latas de la Despensa y
   vuelven por donde vinieron. Matarlas recupera lo robado.
4. **Rasgos del personaje**: cada encarnación nace con un rasgo (ojo de lince: +alcance;
   cola corta: unidades más baratas) que hace distinta cada vuelta de la Rueda.
5. **La Crónica como cómic**: ilustrar cada entrada con el retrato del personaje y el enemigo
   que lo mató.
6. **Modo asedio sin fin** por bando, con marcador local, para quien ya ganó las dos guerras.
7. **Campaña espejo en el espejo**: el jefe que te mató reaparece como aliado cuando cambias de
   bando ("la Reina te recuerda").
8. Sonido: un tema por bando con WebAudio (ahora solo hay efectos) y un maullido/silbido distinto
   por unidad.
9. Guardado en la nube o exportar/importar la Crónica como archivo.
