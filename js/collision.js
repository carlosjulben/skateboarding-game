/* ============================================================
   collision.js — detección de impactos por cajas (AABB)
   ============================================================ */

(function (w) {
  'use strict';

  var SK = (w.SK = w.SK || {});

  function aabb(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
  }

  /* caja ligeramente menguada: el borde del sprite no debe castigar */
  function inset(o) {
    return { x: o.x + 2, y: o.y + 2, w: o.w - 4, h: o.h - 4 };
  }

  SK.Collision = {
    aabb: aabb,

    /** Devuelve el primer obstáculo que toca al jugador, o null. */
    playerHits: function (playerBox, obstacles) {
      for (var i = 0; i < obstacles.length; i++) {
        if (aabb(playerBox, inset(obstacles[i]))) return obstacles[i];
      }
      return null;
    }
  };

})(window);
