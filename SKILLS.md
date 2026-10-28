# SKILLS — Skate Runner

Datos importantes del proyecto y sus **límites**, para que cualquier persona o agente
que abra el repo sepa cómo está hecho y hasta dónde se puede tocar.

## Qué es

Juego de skateboarding infinito tipo "juego del dinosaurio de Google", **en español**,
hecho únicamente con HTML + CSS + JavaScript puro. Repo:
`https://github.com/carlosjulben/skateboarding-game` (rama `main`).

## Límites duros (no romper)

1. **Cero dependencias**: nada de npm, frameworks, CDNs, bundlers ni módulos ES.
   Solo `<script>` ordinarios en orden; cada JS es una IIFE que cuelga de `window.SK`.
2. **Debe funcionar con doble clic en `index.html`** (protocolo `file://`): sin servidor,
   sin `fetch`, sin `type="module"` (fallan por CORS en `file://`).
3. **JS estilo ES5**: `var` y funciones clásicas, sin `class`/`let`/`const`/flechas,
   para que se lea igual en cualquier navegador. Mantener el estilo existente.
4. **Sin sobre ingeniería** (petición explícita): cambios pequeños y directos, sin capas
   ni abstractions nuevas por adelantar.
5. **UI en español** (también los mensajes de derrota y el README).
6. **Todo el "tuning" en `js/config.js`**: los números del juego no se reparten por el código.
7. **No hay navegador ni Node en el entorno de desarrollo** (ver "Entorno"): el juego
   nunca se ha visto renderizado aquí; quien lo prueba visualmente es el usuario.

## Estructura y orden de carga

```
index.html      canvas + HUD + panel plegable; el orden de carga va aquí
README.md       cómo jugar, estructura y dónde personalizar
css/
  base.css      reset, variables (--font, --ink, --panel…) y tipografía
  layout.css    página: cabecera, .game (escala con el viewport), pie/leyenda
  game.css      HUD, drawer (panel plegable), botones, animaciones, media queries
js/             (en este orden exacto en el HTML)
  config.js     CONFIG, PALETTE, SPRITES, OBSTACLE_TYPES, SCENE, util
  input.js      teclado: estado mantenido + cola de teclas nuevas por frame
  audio.js      sonidos sintetizados con WebAudio (sin archivos)
  player.js     física del skater (estado; NO dibuja)
  obstacles.js  tipos, spawn, movimiento, dificultad
  collision.js  AABB con hitbox ligeramente menguada
  renderer.js   TODO el dibujo: parallax, suelo, sprites, partículas, efectos
  ui.js         HUD + panel y sus 3 vistas (menu / paused / gameover)
  game.js       máquina de estados (menu | playing | gameover) + bucle; va el último
```

## Contratos internos

- `window.SK` es el único espacio de nombres: `CONFIG`, `PALETTE`, `SPRITES`,
  `OBSTACLE_TYPES`, `SCENE`, `util`, `Input`, `Audio`, `Player`, `Obstacles`,
  `Collision`, `Renderer`, `UI`. Nada más se cuelga global.
- `Player` guarda estado y física; el dibujo vive en `Renderer.drawPlayer()`.
- `UI` no conoce el juego: recibe datos y avisa por callbacks (`onPrimary`, `onMenu`,
  `onSound`).
- **Sprites**: arrays de strings; todas las filas del mismo ancho y solo caracteres de
  `PALETTE` (`.` = transparente). Si se incumple, el render falla en silencio.
- **Mundo que se mueve, no cámara**: el jugador está fijo en `x: 150`; `speed < 0`
  = marcha atrás. Las partículas/efectos se emiten ya en coordenadas de pantalla
  (`Renderer.dust(x, y, n, opts)`).
- El spawn solo cuenta hacia delante: `countdown` solo baja si `speed > 0`.

## Números clave (cambian el juego entero)

Definidos en `js/config.js`:

| Dato | Valor | Efecto |
| --- | --- | --- |
| Lienzo lógico | 960×340, `SCALE: 3` | se escala por CSS con `image-rendering: pixelated` |
| `GROUND_Y` | 266 | línea del suelo; bordillo 30px + calzada |
| Ollie | `jumpVel -560`, `gravity 1500` | 100px / 0,73s |
| Ollie mantenido | `holdFactor 0.5`, `holdMax 0.22s` | 155px / 0,95s |
| Kickflip | `flipDuration 0.5s` | cabe dentro del salto; se cancela al aterrizar |
| Crucero | 260 → 430 px/s (`cruiseBonus 170`) | crece con `difficulty` (9000px a tope) |
| Máxima | crucero + `maxBonus 250` | 680 px/s |
| Obstáculos | 36–45px de alto | el ollie siempre basta (100px mínimo) |
| Hueco | `max(t·max(180, vel), 1.0·velMax)` | `safeGapFrac` garantiza ~1s de reacción aunque aceleres |
| Puntos | `scoreDiv: 12` | 1 punto cada 12px recorridos |
| Récord / sonido | `localStorage`: `skateRunner.best`, `skateRunner.sound` | con `try/catch` por si no hay almacenamiento |

Ventana de reacción medida: 3,0s al crucero inicial, ~1,0s a velocidad máxima.

## Cómo cambiar cosas típicas

- **Dificultad** → `spawn.timeMin/MaxEasy|Hard`, `spawn.safeGapFrac`, `pairChance`, `difficulty.distForFull`.
- **Sensación del salto** → `player.gravity`, `player.jumpVel`, `jumpHoldFactor`, `jumpHoldMax`.
- **Kickflip** → `player.flipDuration` (no superar ~0,95s, duración máxima del ollie).
- **Velocidad** → `speed.cruiseBase|cruiseBonus|maxBonus|accel|brake|reverseMax`.
- **Colores** → sprites en `PALETTE`, escenario en `SCENE`.
- **Añadir obstáculo** → añadir sprite + entrada en `OBSTACLE_TYPES` (con `weight`).
- **Cambiar el ancho del panel/HUD** → `css/game.css` (todo usa `clamp()` para acompañar
  el viewport; el lienzo mantiene proporción 960/340 = 2,82).

## Formas de validar (aquí no hay navegador)

- Sintaxis JS: `python3 /tmp/opencode/check_js.py js/*.js` (script propio: balance de
  bloques, cadenas y comentarios). **Vive en `/tmp`: no persiste entre sesiones**; si
  hace falta se reescribe (son ~50 líneas).
- Comprobaciones útiles en Python puro:
  - anchos de fila de sprites vs. `PALETTE`;
  - `id`s del HTML vs. `getElementById` del JS;
  - recursos `src`/`href` existentes;
  - llaves de CSS y que cada `clamp()` tenga 3 argumentos.
- La física se simula en Python con las mismas fórmulas que `player.js` (ya se hizo para
  calibrar ollie/huecos).

## Entorno (límites reales de trabajo)

- WSL sobre Windows; el proyecto está en
  `/mnt/c/Users/calit/OneDrive/Desktop/Workspace/DEV/testproyect`.
- **No hay `node`, `pip`, navegador ni docker**: no se puede ejecutar, compilar ni
  renderizar nada más allá de Python 3.14.
- OneDrive puede bloquear archivos `.git` en raras ocasiones.
- Git: identidad configurada y primeros commits hechos; mantener el árbol limpio tras
  cada cambio aprobado.

## Casos raros ya conocidos (no "arreglar" sin querer)

- **K justo al aterrizar**: suena el flip pero se cancela al tocar el suelo (aceptado).
- **`SK.Input.onButton()` + `blurActive()`** (ui.js/input.js): al abrir el panel se quita
  el foco de los botones para que ESPACIO vuelva a ser ollie y no active un botón.
  Es una coordinación entre módulos: no romperla.
- **HUD cacheado** (`lastHud` en ui.js): solo escribe en el DOM cuando el valor cambia.
- **Margen de borrado `viewW + 240`** en obstacles.js: las parejas se generan más allá
  del borde; con un margen menor desaparecían al nacer (bug histórico).
- **Nubes con marcha atrás**: el offset de nubes se normaliza con `((off % W) + W) % W`.
- El panel "se congela" la escena (solo decaen efectos) y en `gameover` el fondo queda
  parado a propósito.
