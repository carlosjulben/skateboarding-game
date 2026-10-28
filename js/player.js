/* ============================================================
   player.js — física y animación del skater
   (solo estado y movimiento; el dibujo vive en renderer.js)
   ============================================================ */

(function (w) {
  'use strict';

  var SK = (w.SK = w.SK || {});
  var U = SK.util;

  var PUSH_DUR = 0.45;   // duración de un ciclo de empujón (s)

  var P = {
    x: 0, y: 0, w: 48, h: 54,
    vy: 0,
    grounded: true,
    frame: 'ROLL',
    pushPhase: 0,
    holdTime: 0,
    flipT: -1,           // -1 = sin kickflip, >=0 = segundos transcurridos
    time: 0,
    bobY: 0
  };

  function groundY() {
    return SK.CONFIG.GROUND_Y - P.h;
  }

  function reset() {
    var p = SK.CONFIG.player;
    P.x = p.x;
    P.w = SK.SPRITES.ROLL[0].length * SK.CONFIG.SCALE;
    P.h = SK.SPRITES.ROLL.length * SK.CONFIG.SCALE;
    P.y = groundY();
    P.vy = 0;
    P.grounded = true;
    P.frame = 'ROLL';
    P.pushPhase = 0;
    P.holdTime = 0;
    P.flipT = -1;
    P.time = 0;
    P.bobY = 0;
  }

  /* caja de colisión: un poco menor que el sprite para ser justo */
  function box() {
    return {
      x: P.x + 8,
      y: P.y + 6,
      w: P.w - 16,
      h: P.h - 12
    };
  }

  function jump(events) {
    var c = SK.CONFIG.player;
    P.vy = c.jumpVel;
    P.grounded = false;
    P.holdTime = 0;
    P.frame = 'AIR';
    if (events && events.onJump) events.onJump();
  }

  /**
   * @param {number} dt        segundos desde el último frame
   * @param {object} controls  { right, left, jumpHeld, jumpPressed, flipPressed, moving }
   * @param {object} events    { onJump, onLand, onPush, onFlip }
   */
  function update(dt, controls, events) {
    var cfg = SK.CONFIG.player;
    P.time += dt;

    if (P.grounded) {

      /* --- animación de empujón --- */
      if (controls.right && controls.moving) {
        var prev = P.pushPhase;
        P.pushPhase = (P.pushPhase + dt / PUSH_DUR) % 1;
        if (P.pushPhase < prev && events && events.onPush) events.onPush();
        P.frame = P.pushPhase < 0.55 ? 'PUSH' : 'ROLL';
      } else {
        P.pushPhase = 0;
        P.frame = 'ROLL';
      }

      /* --- pequeño balanceo al rodar --- */
      P.bobY = controls.moving ? Math.sin(P.time * 14) * 1.4 : 0;

      /* --- saltar --- */
      if (controls.jumpPressed) jump(events);

    } else {

      P.bobY = 0;
      P.frame = 'AIR';

      /* --- kickflip: solo en el aire y si no hay otro en curso --- */
      if (controls.flipPressed && P.flipT < 0) {
        P.flipT = 0;
        if (events && events.onFlip) events.onFlip();
      }
      if (P.flipT >= 0) {
        P.flipT += dt;
        if (P.flipT >= cfg.flipDuration) P.flipT = -1;
      }

      /* mantener la barra = ollie más alto, con tope */
      var g = cfg.gravity;
      if (controls.jumpHeld && P.vy < 0 && P.holdTime < cfg.jumpHoldMax) {
        g *= cfg.jumpHoldFactor;
        P.holdTime += dt;
      }

      P.vy = Math.min(P.vy + g * dt, cfg.maxFall);
      P.y += P.vy * dt;

      /* tocar el suelo */
      var floor = groundY();
      if (P.y >= floor) {
        P.y = floor;
        P.vy = 0;
        P.grounded = true;
        P.flipT = -1;                  // la tabla vuelve a su sitio
        if (events && events.onLand) events.onLand();
      }
    }
  }

  SK.Player = {
    state: P,
    reset: reset,
    update: update,
    box: box,
    /* altura sobre el suelo, para la sombra */
    lift: function () { return groundY() - P.y; }
  };

  reset();

})(window);
