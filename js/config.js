/* ============================================================
   config.js — todos los datos y "tuning" del juego en un sitio
   ============================================================ */

(function (w) {
  'use strict';

  var SK = (w.SK = w.SK || {});

  /* ------------------ dimensiones ------------------ */

  SK.CONFIG = {
    VIEW: { w: 960, h: 340 },   // resolución lógica del canvas
    GROUND_Y: 266,               // línea del suelo (borde superior del bordillo)
    SCALE: 3,                    // tamaño de cada píxel de arte

    player: {
      x: 150,                    // posición fija del skater en pantalla
      gravity: 1500,             // px/s²
      jumpVel: -560,             // px/s
      jumpHoldFactor: 0.5,       // gravedad reducida manteniendo el salto
      jumpHoldMax: 0.22,         // segundos máximos de impulso extra
      maxFall: 1700              // velocidad terminal
    },

    speed: {
      cruiseBase: 260,           // velocidad de crucero inicial
      cruiseBonus: 170,          // extra que se gana con la dificultad
      maxBonus: 250,             // velocidad máxima = crucero + esto
      accel: 720,                // aceleración con →
      brake: 950,                // frenado con ←
      returnForce: 420,          // cómo de rápido vuelve al crucero
      reverseMax: -210           // marcha atrás máxima
    },

    difficulty: {
      distForFull: 9000          // px recorridos hasta dificultad máxima
    },

    spawn: {
      edge: 30,                  // margen fuera del borde derecho
      timeMinEasy: 1.35,         // hueco en segundos (fácil)
      timeMaxEasy: 2.4,
      timeMinHard: 0.9,          // hueco en segundos (difícil)
      timeMaxHard: 1.5,
      minSpeed: 180,             // hueco mínimo calculado con esta velocidad
      safeGapFrac: 1.0,          // hueco ≥ velocidad máxima (tiempo de reacción)
      pairChance: 0.3,           // probabilidad de doble obstáculo
      pairFrom: 0.45,            // dificultad desde la que aparecen parejas
      pairGap: 56                // separación entre los dos obstáculos
    },

    scoreDiv: 12,                // px recorridos por punto
    storageBest: 'skateRunner.best',
    storageSound: 'skateRunner.sound'
  };

  /* ------------------ paleta (char → color) ------------------ */

  SK.PALETTE = {
    k: '#20242b',   // contorno / ojo / ruedas oscuras
    s: '#f6cda6',   // piel
    y: '#f5a623',   // casco
    t: '#e8483c',   // camiseta
    p: '#2f5ea8',   // pantalón
    w: '#f2d24b',   // tabla
    d: '#4a4f58',   // ruedas
    o: '#f0782f',   // cono
    c: '#d94f3d',   // hidrante
    n: '#ffffff',   // blanco
    b: '#9a6634',   // madera oscura
    m: '#c08a4a',   // madera clara
    z: '#3f8f6a',   // papelera
    v: '#2f6b52'    // papelera (sombra)
  };

  /* ------------------ sprites de píxeles ------------------
     Cada fila es una línea de píxeles; '.' = transparente.
     ------------------------------------------------------- */

  SK.SPRITES = {

    /* ---------- personaje (16 x 18) ---------- */

    ROLL: [
      '......yyyyyy....',
      '.....yyyyyyyy...',
      '.....yyyyyyyy...',
      '......ssssss....',
      '......ssskss....',
      '.......ssss.....',
      '......tttttt....',
      '.....stttttts...',
      '....ssttttttss..',
      '......tttttt....',
      '......tttttt....',
      '......pppppp....',
      '......pp..pp....',
      '......pp..pp....',
      '.....ppp.ppp....',
      '.....kkk.kkk....',
      '....wwwwwwwwww..',
      '.....d......d...'
    ],

    PUSH: [
      '......yyyyyy....',
      '.....yyyyyyyy...',
      '.....yyyyyyyy...',
      '......ssssss....',
      '......ssskss....',
      '.......ssss.....',
      '......tttttt....',
      '.....stttttts...',
      '..ss..tttttt.ss.',
      '......tttttt....',
      '......tttttt....',
      '......pppppp....',
      '.....pp..pp.....',
      '....pp...pp.....',
      '...pp....pp.....',
      '...pp....kkk....',
      '..pp...wwwwww...',
      '..kk...d....d...'
    ],

    AIR: [
      '......yyyyyy....',
      '.....yyyyyyyy...',
      '.....yyyyyyyy...',
      '......ssssss....',
      '......ssskss....',
      '..s....ssss...s.',
      '..s...tttttt..s.',
      '...s..tttttt.s..',
      '......tttttt....',
      '......tttttt....',
      '......pppppp....',
      '......pppppp....',
      '.....ppp.ppp....',
      '.....pp..pp.....',
      '.....pp..pp.....',
      '.....kkk.kkk....',
      '....wwwwwwwwww..',
      '.....d......d...'
    ],

    /* ---------- obstáculos ---------- */

    CONE: [
      '....oo....',
      '...oooo...',
      '...onno...',
      '...onno...',
      '..oooooo..',
      '..onnnno..',
      '.oooooooo.',
      '.onnnnnno.',
      'oooooooooo',
      'oooooooooo',
      'oooooooooo',
      'nnnnnnnnnn'
    ],

    HYDRANT: [
      '...ccc...',
      '..ccccc..',
      '..ccccc..',
      '..ccccc..',
      '.ccccccc.',
      '.ccccccc.',
      '..ccccc..',
      '..cnncc..',
      '..ccccc..',
      '..ccccc..',
      '.ccccccc.',
      '.ccccccc.',
      '..ccccc..',
      'kkkkkkkkk'
    ],

    CRATE: [
      'bbbbbbbbbbbbb',
      'bmmmmmmmmmmmb',
      'bmmmmmbmmmmmb',
      'bmmmmmbmmmmmb',
      'bmmmmmbmmmmmb',
      'bbbbbbbbbbbbb',
      'bmmmmmbmmmmmb',
      'bmmmmmbmmmmmb',
      'bmmmmmbmmmmmb',
      'bmmmmmbmmmmmb',
      'bmmmmmbmmmmmb',
      'bbbbbbbbbbbbb'
    ],

    BIN: [
      'vvvvvvvvvvv',
      'vvvvvvvvvvv',
      'zzzzzzzzzzz',
      'zzzvzzzvzzz',
      'zzzvzzzvzzz',
      'zzzzzzzzzzz',
      'zzzvzzzvzzz',
      'zzzvzzzvzzz',
      'zzzzzzzzzzz',
      'zzzvzzzvzzz',
      'zzzvzzzvzzz',
      'zzzzzzzzzzz',
      'zzzvzzzvzzz',
      'zzzzzzzzzzz',
      'vvvvvvvvvvv'
    ]
  };

  /* ------------------ catálogo de obstáculos ------------------
     w / h están en píxeles de sprite (se multiplican por SCALE)
     ----------------------------------------------------------- */

  SK.OBSTACLE_TYPES = [
    { id: 'cone',    sprite: 'CONE',    weight: 4 },
    { id: 'crate',   sprite: 'CRATE',   weight: 3 },
    { id: 'hydrant', sprite: 'HYDRANT', weight: 2 },
    { id: 'bin',     sprite: 'BIN',     weight: 2 }
  ];

  /* ------------------ colores del escenario ------------------ */

  SK.SCENE = {
    skyTop: '#89cef5',
    skyBottom: '#e6f6ff',
    sun: '#ffe08a',
    sunCore: '#fff3c4',
    cloud: '#ffffff',
    cloudShade: '#dbeefb',

    farBuilding: '#b7cee3',
    farEdge: '#a2bcd6',
    farWindow: '#f6e7b0',

    nearBuilding: '#9ab5d1',
    nearEdge: '#85a2c0',
    nearWindow: '#fdf3cd',

    fence: 'rgba(104, 126, 150, .55)',
    fenceDark: 'rgba(84, 104, 128, .65)',

    walk: '#d3d7de',
    walkLine: '#20242b',
    walkDash: '#b0b6c0',
    street: '#8f96a1',
    streetDark: '#7f8792',
    streetDash: '#e8e2c8'
  };

  /* ------------------ utilidades ------------------ */

  SK.util = {
    clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },

    lerp: function (a, b, t) { return a + (b - a) * t; },

    /* acerca `v` a `target` sin pasarse de `step` */
    approach: function (v, target, step) {
      if (v < target) return Math.min(v + step, target);
      if (v > target) return Math.max(v - step, target);
      return v;
    },

    rand: function (a, b) { return a + Math.random() * (b - a); },

    randInt: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },

    pad: function (n, len) {
      n = String(Math.max(0, Math.floor(n)));
      while (n.length < len) n = '0' + n;
      return n;
    }
  };

})(window);
