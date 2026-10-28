/* ============================================================
   obstacles.js — generación, movimiento y dificultad
   ============================================================ */

(function (w) {
  'use strict';

  var SK = (w.SK = w.SK || {});
  var U = SK.util;

  var list = [];
  var countdown = 0;

  var dimsCache = Object.create(null);

  function dims(spriteName) {
    if (!dimsCache[spriteName]) {
      var rows = SK.SPRITES[spriteName];
      var sc = SK.CONFIG.SCALE;
      dimsCache[spriteName] = {
        w: rows[0].length * sc,
        h: rows.length * sc
      };
    }
    return dimsCache[spriteName];
  }

  function pickType() {
    var types = SK.OBSTACLE_TYPES;
    var total = 0;
    for (var i = 0; i < types.length; i++) total += types[i].weight;
    var r = Math.random() * total;
    for (var j = 0; j < types.length; j++) {
      r -= types[j].weight;
      if (r <= 0) return types[j];
    }
    return types[0];
  }

  function add(type, x) {
    var d = dims(type.sprite);
    list.push({
      type: type.id,
      sprite: type.sprite,
      x: x,
      y: SK.CONFIG.GROUND_Y - d.h,
      w: d.w,
      h: d.h
    });
  }

  /* hueco entre obstáculos medido en tiempo, no en píxeles:
     así sigue siendo justo aunque la velocidad suba mucho.
     `safeFrac * maxSpeed` es la red de seguridad: garantiza que,
     incluso si el jugador acelera, siempre dé tiempo a aterrizar
     y volver a saltar. */
  function nextGap(difficulty, speed, maxSpeed) {
    var s = SK.CONFIG.spawn;
    var tMin = U.lerp(s.timeMinEasy, s.timeMinHard, difficulty);
    var tMax = U.lerp(s.timeMaxEasy, s.timeMaxHard, difficulty);
    var t = U.rand(tMin, tMax);
    var byTime = t * Math.max(s.minSpeed, speed);
    var floor = s.safeGapFrac * maxSpeed;
    return Math.max(byTime, floor);
  }

  function spawn(difficulty, viewW, speed, maxSpeed) {
    var s = SK.CONFIG.spawn;
    var x = viewW + s.edge;
    var type = pickType();

    /* a partir de cierta dificultad, conos en pareja */
    if (difficulty > s.pairFrom && Math.random() < s.pairChance) {
      var cone = null;
      for (var i = 0; i < SK.OBSTACLE_TYPES.length; i++) {
        if (SK.OBSTACLE_TYPES[i].id === 'cone') cone = SK.OBSTACLE_TYPES[i];
      }
      var first = cone || type;
      add(first, x);
      var d = dims(first.sprite);
      add(cone || type, x + d.w + s.pairGap);
    } else {
      add(type, x);
    }

    countdown = nextGap(difficulty, speed, maxSpeed);
  }

  function reset() {
    list.length = 0;
    countdown = 0;
  }

  function update(dt, speed, difficulty, viewW, maxSpeed) {
    /* la cuenta atrás solo avanza hacia delante: si rewindeas,
       no se acumulan obstáculos pendientes */
    if (speed > 0) {
      countdown -= speed * dt;
      if (countdown <= 0) spawn(difficulty, viewW, speed, maxSpeed);
    }

    for (var i = list.length - 1; i >= 0; i--) {
      var o = list[i];
      o.x -= speed * dt;
      /* margen amplio a la derecha: la pareja se genera más allá
         del borde y no debe borrarse nada más aparecer */
      if (o.x + o.w < -60 || o.x > viewW + 240) list.splice(i, 1);
    }
  }

  SK.Obstacles = {
    list: list,
    reset: reset,
    update: update,
    dims: dims
  };

})(window);
