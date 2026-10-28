/* ============================================================
   game.js — máquina de estados, bucle principal y conexión
   entre todos los módulos
   ============================================================ */

(function (w) {
  'use strict';

  var SK = w.SK;
  var C = SK.CONFIG;
  var U = SK.util;

  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');

  var IDLE_SPEED = 90;      // scroll del fondo en el menú

  var G = {
    mode: 'menu',           // menu | playing | gameover
    distance: 0,
    score: 0,
    best: 0,
    recordFlashed: false,
    speed: C.speed.cruiseBase,
    difficulty: 0
  };

  var lastTs = 0;
  var framePressed = [];      // teclas nuevas en el frame actual
  var panelWasOpen = null;    // para detectar cuándo se abre el panel

  /* ------------------ almacenamiento ------------------ */

  function loadBest() {
    try {
      return Math.max(0, parseInt(w.localStorage.getItem(C.storageBest), 10) || 0);
    } catch (e) { return 0; }
  }

  function saveBest(v) {
    try { w.localStorage.setItem(C.storageBest, String(v)); }
    catch (e) { /* almacenamiento no disponible */ }
  }

  /* ------------------ puntuación ------------------ */

  function liveBest() {
    return Math.max(G.best, G.score);
  }

  function checkRecord() {
    if (G.score > G.best && G.best > 0 && !G.recordFlashed) {
      SK.UI.flashRecord();
      G.recordFlashed = true;
    }
  }

  function pushHud() {
    var sp = C.speed;
    var cruise = sp.cruiseBase + sp.cruiseBonus * G.difficulty;
    var maxSpeed = cruise + sp.maxBonus;
    SK.UI.setHud({
      score: G.score,
      best: liveBest(),
      speedPct: (G.speed - sp.reverseMax) / (maxSpeed - sp.reverseMax)
    });
  }

  /* ------------------ mensajes de derrota ------------------ */

  function loseMessage() {
    if (G.score < 5)   return 'Ni has llegado a coger inercia. Pulsa → para empujar.';
    if (G.score < 60)  return 'Te has calentado poco. Mantén la barra para un ollie más alto.';
    if (G.score < 250) return 'Buen ritmo. Los obstáculos cada vez vienen más seguidos.';
    return '¡Estás pillando el punto! Otra vez y lo clavas.';
  }

  /* ------------------ transiciones ------------------ */

  function startGame() {
    SK.Audio.ensure();

    G.mode = 'playing';
    G.distance = 0;
    G.score = 0;
    G.speed = C.speed.cruiseBase;
    G.difficulty = 0;
    G.recordFlashed = false;

    SK.Player.reset();
    SK.Obstacles.reset();
    SK.Renderer.clearParticles();
    SK.UI.hide();
    pushHud();
  }

  function toMenu() {
    G.mode = 'menu';
    G.distance = 0;
    G.score = 0;
    G.speed = C.speed.cruiseBase;
    G.difficulty = 0;

    SK.Player.reset();
    SK.Obstacles.reset();
    SK.Renderer.clearParticles();
    SK.UI.render('menu');
    pushHud();
  }

  function gameOver(hit) {
    G.mode = 'gameover';

    SK.Audio.crash();
    SK.Renderer.addShake(13);
    SK.Renderer.addFlash('#ff6a55', 0.55);

    /* chispas en el impacto + polvo bajo la tabla */
    var p = SK.Player.state;
    SK.Renderer.dust(hit.x + hit.w / 2, hit.y + hit.h / 2, 14, {
      color: '#ffd166', vxMin: -260, vxMax: 260,
      vyMin: -280, vyMax: -60, grav: 700,
      lifeMin: 0.35, lifeMax: 0.8, sizeMin: 3, sizeMax: 7
    });
    SK.Renderer.dust(p.x + p.w / 2, C.GROUND_Y - 6, 16, {
      color: '#e9edf4', vxMin: -180, vxMax: 90,
      vyMin: -170, vyMax: -30, grav: 520
    });

    var isRecord = G.score > G.best;
    if (isRecord) {
      G.best = G.score;
      saveBest(G.best);
      SK.UI.setBest(G.best);
    }

    SK.UI.render('gameover', {
      score: G.score,
      best: liveBest(),
      message: loseMessage()
    });
    if (isRecord) SK.UI.flashRecord();
  }

  /* ------------------ acción principal del panel ------------------ */

  function primaryAction() {
    SK.Audio.ensure();
    if (G.mode === 'playing') SK.UI.hide();
    else startGame();
  }

  function togglePanel() {
    SK.UI.toggle();
  }

  function toggleSound() {
    var on = !SK.Audio.isEnabled();
    SK.Audio.setEnabled(on);
    SK.UI.setSound(on);
    if (on) SK.Audio.beat();
  }

  /* ------------------ teclas por frame ------------------ */

  /* Devuelve true si alguna tecla fue consumida por el panel:
     así el mismo pulso no se usa a la vez para el menú y el ollie. */
  function handleKeys(pressed) {
    var handled = false;

    for (var i = 0; i < pressed.length; i++) {
      var code = pressed[i];

      if (code === 'Escape') {
        togglePanel();
        handled = true;
      } else if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') {
        /* si el foco está en un botón, ya lo activa el navegador */
        if (SK.Input.onButton()) continue;
        /* jugando y sin panel: la barra es del skater, no del menú */
        if (G.mode === 'playing' && !SK.UI.isOpen()) continue;
        primaryAction();
        handled = true;
      }
    }
    return handled;
  }

  /* ------------------ actualización ------------------ */

  var events = {
    onJump: function () {
      SK.Audio.jump();
      var p = SK.Player.state;
      SK.Renderer.dust(p.x + p.w / 2, C.GROUND_Y + 2, 7, {
        color: '#ffffff', vxMin: -120, vxMax: 60,
        vyMin: -80, vyMax: -20, grav: 300, lifeMax: 0.45, sizeMax: 5
      });
    },

    onFlip: function () {
      SK.Audio.flip();
      var p = SK.Player.state;
      SK.Renderer.dust(p.x + p.w / 2, p.y + p.h * 0.85, 8, {
        color: '#ffe9a8', vxMin: -70, vxMax: 70,
        vyMin: -45, vyMax: 45, grav: 220, lifeMax: 0.35, sizeMax: 5
      });
    },

    onLand: function () {
      SK.Audio.land();
      var p = SK.Player.state;
      SK.Renderer.dust(p.x + p.w / 2, C.GROUND_Y + 2, 11, {
        color: '#e6eaf1', vxMin: -190, vxMax: 90,
        vyMin: -130, vyMax: -25, grav: 420, lifeMax: 0.5, sizeMax: 6
      });
      SK.Renderer.addShake(3);
    },

    onPush: function () {
      SK.Audio.push();
      var p = SK.Player.state;
      SK.Renderer.dust(p.x + 6, C.GROUND_Y + 4, 5, {
        color: '#f2f5fa', vxMin: -150, vxMax: -40,
        vyMin: -60, vyMax: -15, grav: 300, lifeMax: 0.4, sizeMax: 5
      });
    }
  };

  function update(dt) {
    var sp = C.speed;

    G.difficulty = Math.min(1, G.distance / C.difficulty.distForFull);
    var cruise = sp.cruiseBase + sp.cruiseBonus * G.difficulty;
    var maxSpeed = cruise + sp.maxBonus;

    var jumpHeld = SK.Input.isDown('Space') || SK.Input.isDown('ArrowUp');
    var jumpPressed =
      framePressed.indexOf('Space') >= 0 ||
      framePressed.indexOf('ArrowUp') >= 0;

    var controls = {
      right: SK.Input.isDown('ArrowRight'),
      left: SK.Input.isDown('ArrowLeft'),
      jumpHeld: jumpHeld,
      jumpPressed: jumpPressed,
      flipPressed: framePressed.indexOf('KeyK') >= 0,
      moving: Math.abs(G.speed) > 60
    };

    /* → acelera, ← frena (y acaba marcha atrás), sin teclas: crucero */
    var target = controls.right ? maxSpeed
               : (controls.left ? sp.reverseMax : cruise);
    var rate = controls.right ? sp.accel
             : (controls.left ? sp.brake : sp.returnForce);

    G.speed = U.approach(G.speed, target, rate * dt);

    G.distance = Math.max(0, G.distance + G.speed * dt);
    G.score = Math.floor(G.distance / C.scoreDiv);
    checkRecord();

    SK.Player.update(dt, controls, events);
    SK.Obstacles.update(dt, G.speed, G.difficulty, C.VIEW.w, maxSpeed);

    var hit = SK.Collision.playerHits(SK.Player.box(), SK.Obstacles.list);
    if (hit) {
      gameOver(hit);
      return;
    }

    SK.Renderer.update(dt, G.speed);
  }

  /* ------------------ bucle ------------------ */

  function loop(ts) {
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
    lastTs = ts;

    var pressed = SK.Input.consume();
    framePressed = (pressed.length && handleKeys(pressed)) ? [] : pressed;

    var isOpen = SK.UI.isOpen();
    if (panelWasOpen === null) panelWasOpen = isOpen;

    if (G.mode === 'playing') {
      if (isOpen) {
        /* el panel se abrió (ESC o botón ☰): pausamos y mostramos la vista */
        if (!panelWasOpen && SK.UI.current() !== 'paused') {
          SK.UI.render('paused', { score: G.score, best: liveBest() });
        }
        SK.Renderer.update(dt, 0);            // pausa: solo decaen los efectos
      } else {
        update(dt);
      }
    } else if (G.mode === 'menu') {
      G.speed = IDLE_SPEED;
      SK.Renderer.update(dt, IDLE_SPEED);     // fondo animado en el menú
    } else {
      SK.Renderer.update(dt, 0);              // fin: escena congelada
    }

    panelWasOpen = isOpen;

    SK.Renderer.draw(ctx, {
      mode: G.mode,
      speed: G.mode === 'playing' ? G.speed : 0,
      obstacles: SK.Obstacles.list
    });

    pushHud();
    w.requestAnimationFrame(loop);
  }

  /* ------------------ arranque ------------------ */

  function boot() {
    G.best = loadBest();

    SK.Renderer.init();
    SK.Player.reset();

    SK.UI.init({
      onPrimary: primaryAction,
      onMenu: toMenu,
      onSound: toggleSound
    });
    SK.UI.setBest(G.best);
    SK.UI.setSound(SK.Audio.load());
    SK.UI.render('menu');

    pushHud();

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && G.mode === 'playing' && !SK.UI.isOpen()) {
        SK.UI.render('paused', { score: G.score, best: liveBest() });
      }
    });

    w.requestAnimationFrame(loop);
  }

  boot();

})(window);
