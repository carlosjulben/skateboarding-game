# Skate Runner

Juego de skateboarding infinito en la navegador, hecho **únicamente con HTML, CSS y
JavaScript puro** (sin librerías ni dependencias). Estética pixel-art al estilo del
juego del dinosaurio de Google: esquiva los obstáculos con el *ollie* y dura lo que
dure.

## Cómo jugar

Abre `index.html` con doble clic en el explorador. No hace falta servidor ni
instalar nada.

| Tecla | Acción |
| --- | --- |
| **→** | Empujar / acelerar |
| **←** | Frenar y dar marcha atrás |
| **Espacio** (o **↑**) | Ollie — mantén pulsado para saltar más alto |
| **Esc** | Abrir / cerrar el menú (pausa) |
| **Enter** o botón | Jugar, reintentar, reanudar |

Una sola colisión y se acabó la partida: aparece el panel con la puntuación, el
récord y el botón de reinicio. El panel es plegable con el botón **☰ / ✕** de su
esquina.

## Estructura

```
index.html          lienzo + HUD + panel plegable + orden de carga de los scripts
css/
  base.css          reset, variables de color y tipografía
  layout.css        estructura de la página (cabecera, juego, pie)
  game.css          HUD, panel plegable, botones y animaciones
js/
  config.js         todo el "tuning" y los sprites, en un solo sitio
  input.js          teclado (estado pulsado + teclas nuevas por frame)
  audio.js          sonidos sintetizados con WebAudio (sin archivos)
  player.js         física del skater: aceleración, frenada, ollie, gravedad
  obstacles.js      tipos, generación, movimiento y dificultad
  collision.js      detección de impactos AABB
  renderer.js       parallax, suelo, sprites, partículas y efectos
  ui.js             HUD, panel plegable y sus tres vistas
  game.js           máquina de estados (menú / jugando / fin) + bucle
```

Cada archivo JS es una IIFE que cuelga de `window.SK`, así no hay variables
globales sueltas y el orden de carga es explícito en el HTML.

## Cómo funciona

- **Motor:** Canvas 2D con `requestAnimationFrame` y delta-time, de modo que la
  velocidad no depende de los Hz del monitor.
- **Física:** gravedad y velocidad escritas a mano; colisión por cajas AABB con una
  hitbox ligeramente menor que el sprite.
- **Dificultad:** la velocidad de crucero y la frecuencia de obstáculos crecen con
  la distancia recorrida. El hueco entre obstáculos se calcula en *tiempo* y con un
  suelo proporcional a la velocidad máxima, para que nunca sea injusto.
- **Puntuación:** metros recorridos, con récord persistente en `localStorage`.
- **Efectos:** polvo al empujar y aterrizar, chispas y sacudida al chocar,
  líneas de velocidad, parallax de nubes / edificios / valla.

## Personalizar

Casi todo se toca en `js/config.js`:

- `SK.CONFIG.speed` — velocidades, aceleración y frenada.
- `SK.CONFIG.player` — gravedad y fuerza del ollie.
- `SK.CONFIG.spawn` — huecos entre obstáculos y parejas.
- `SK.PALETTE` — colores de los sprites.
- `SK.SCENE` — colores del cielo, edificios y suelo.
- `SK.SPRITES` — los frames del personaje y de los obstáculos, píxel a píxel.
