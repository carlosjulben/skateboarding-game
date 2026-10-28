/* ============================================================
   renderer.js — todo el dibujado: parallax, suelo, sprites,
   partículas, líneas de velocidad, sacudida y destello
   ============================================================ */

(function (w) {
  'use strict';

  var SK = (w.SK = w.SK || {});
  var U = SK.util;
  var C, SCENE, PALETTE, SPRITES;

  var VIEW, GROUND, SCALE;

  /* --- cachés offscreen (se construyen una sola vez) --- */
  var spriteCache = Object.create(null);
  var skyGradient = null;
  var farLayer = null;
  var nearLayer = null;
  var clouds = [];

  /* --- movimiento de capas --- */
  var offCloud = 0;
  var offFar = 0;
  var offNear = 0;
  var offFence = 0;
  var offWalk = 0;
  var offStreet = 0;

  /* --- partículas y efectos --- */
  var particles = [];
  var lines = [];
  var fx = { shake: 0, flash: 0, flashColor: '#ffffff' };

  /* ======================================================
     Sprites a canvas
     ====================================================== */

  function buildSprite(map) {
    var cv = w.document.createElement('canvas');
    cv.width = map[0].length * SCALE;
    cv.height = map.length * SCALE;
    var c = cv.getContext('2d');
    for (var r = 0; r < map.length; r++) {
      var row = map[r];
      for (var i = 0; i < row.length; i++) {
        var ch = row.charAt(i);
        if (ch === '.') continue;
        var col = PALETTE[ch];
        if (!col) continue;
        c.fillStyle = col;
        c.fillRect(i * SCALE, r * SCALE, SCALE, SCALE);
      }
    }
    return cv;
  }

  function sprite(name) {
    if (!spriteCache[name]) spriteCache[name] = buildSprite(SPRITES[name]);
    return spriteCache[name];
  }

  /* ======================================================
     Capas del parallax
     ====================================================== */

  function genWindows(bw, bh) {
    var out = [];
    for (var y = 7; y < bh - 12; y += 15) {
      for (var x = 6; x < bw - 10; x += 13) {
        if (Math.random() < 0.6) out.push([x, y]);
      }
    }
    return out;
  }

  function buildSkyline(opts) {
    var items = [];
    var x = 0;
    while (x < opts.width) {
      var bw = U.randInt(opts.minW, opts.maxW);
      var bh = U.randInt(opts.minH, opts.maxH);
      items.push({ x: x, w: bw, h: bh, win: genWindows(bw, bh), roof: Math.random() < 0.3 });
      x += bw + (Math.random() < 0.35 ? U.randInt(6, 22) : 0);
    }

    var cv = w.document.createElement('canvas');
    cv.width = Math.max(x, opts.width);
    cv.height = GROUND;
    var c = cv.getContext('2d');

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var top = GROUND - it.h;

      c.fillStyle = opts.body;
      c.fillRect(it.x, top, it.w, it.h);

      c.fillStyle = opts.edge;
      c.fillRect(it.x + it.w - 4, top, 4, it.h);
      c.fillRect(it.x, top, it.w, 3);

      if (it.roof) {
        c.fillStyle = opts.edge;
        c.fillRect(it.x + 8, top - 9, 5, 9);
      }

      c.fillStyle = opts.window;
      for (var k = 0; k < it.win.length; k++) {
        c.fillRect(it.x + it.win[k][0], top + it.win[k][1], 7, 9);
      }
    }
    return cv;
  }

  function buildCloud(size) {
    var cv = w.document.createElement('canvas');
    cv.width = size;
    cv.height = Math.round(size * 0.55);
    var c = cv.getContext('2d');
    var h = cv.height;
    var lobes = 3 + (size / 34 | 0);

    c.fillStyle = SCENE.cloudShade;
    c.fillRect(size * 0.1, h * 0.55, size * 0.82, h * 0.36);

    c.fillStyle = SCENE.cloud;
    c.fillRect(size * 0.08, h * 0.5, size * 0.84, h * 0.34);
    for (var i = 0; i < lobes; i++) {
      var r = h * (0.26 + Math.random() * 0.24);
      var cx = size * (0.16 + (i / lobes) * 0.68);
      var cy = h * 0.55 - r * 0.6;
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.fill();
    }
    return cv;
  }

  function initLayers() {
    farLayer = buildSkyline({
      width: 2400, minW: 46, maxW: 96, minH: 70, maxH: 165,
      body: SCENE.farBuilding, edge: SCENE.farEdge, window: SCENE.farWindow
    });
    nearLayer = buildSkyline({
      width: 2000, minW: 62, maxW: 132, minH: 40, maxH: 112,
      body: SCENE.nearBuilding, edge: SCENE.nearEdge, window: SCENE.nearWindow
    });

    clouds = [];
    var W = 1500;
    for (var i = 0; i < 7; i++) {
      var size = U.randInt(74, 150);
      clouds.push({
        x: U.rand(0, W),
        y: U.rand(24, 118),
        w: size,
        cv: buildCloud(size)
      });
    }
    clouds.width = W;

    lines = [];
    for (var j = 0; j < 16; j++) {
      lines.push({
        x: U.rand(0, VIEW.w),
        y: U.rand(28, GROUND - 12),
        len: U.rand(36, 108)
      });
    }
  }

  function blitLayer(ctx, cv, offset) {
    var W = cv.width;
    var off = ((offset % W) + W) % W;
    ctx.drawImage(cv, -off, 0);
    ctx.drawImage(cv, -off + W, 0);
  }

  /* ======================================================
     Partículas
     ====================================================== */

  function spawn(o) {
    particles.push(o);
    if (particles.length > 240) particles.shift();
  }

  function puff(x, y, n, opts) {
    opts = opts || {};
    for (var i = 0; i < n; i++) {
      spawn({
        x: x + U.rand(-6, 6),
        y: y + U.rand(-4, 4),
        vx: U.rand(opts.vxMin != null ? opts.vxMin : -70, opts.vxMax != null ? opts.vxMax : 40),
        vy: U.rand(opts.vyMin != null ? opts.vyMin : -60, opts.vyMax != null ? opts.vyMax : -10),
        grav: opts.grav != null ? opts.grav : 240,
        life: U.rand(opts.lifeMin || 0.3, opts.lifeMax || 0.6),
        size: U.rand(opts.sizeMin || 3, opts.sizeMax || 7),
        color: opts.color || '#ffffff'
      });
    }
  }

  function updateParticles(dt, speed) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += (p.vx - speed) * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
    }
  }

  /* ======================================================
     Capas públicas
     ====================================================== */

  function init() {
    C = SK.CONFIG;
    SCENE = SK.SCENE;
    PALETTE = SK.PALETTE;
    SPRITES = SK.SPRITES;
    VIEW = C.VIEW;
    GROUND = C.GROUND_Y;
    SCALE = C.SCALE;

    var g = w.document.createElement('canvas').getContext('2d');
    skyGradient = g.createLinearGradient(0, 0, 0, VIEW.h);
    skyGradient.addColorStop(0, SCENE.skyTop);
    skyGradient.addColorStop(1, SCENE.skyBottom);

    initLayers();
    particles.length = 0;
  }

  function update(dt, speed) {
    offCloud += speed * 0.07 * dt;
    offFar += speed * 0.18 * dt;
    offNear += speed * 0.42 * dt;
    offFence += speed * 0.7 * dt;
    offWalk += speed * dt;
    offStreet += speed * dt;

    updateParticles(dt, speed);

    var showLines = speed > 470;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      L.x -= speed * 2.1 * dt;
      if (L.x + L.len < 0 || L.x > VIEW.w + 500) {
        L.x = VIEW.w + U.rand(0, 420);
        L.y = U.rand(28, GROUND - 12);
        L.len = U.rand(36, 108);
      }
      L.on = showLines;
    }

    fx.shake = Math.max(0, fx.shake - dt * 34);
    fx.flash = Math.max(0, fx.flash - dt * 2.4);
  }

  function addShake(v) { fx.shake = Math.max(fx.shake, v); }
  function addFlash(color, a) { fx.flashColor = color; fx.flash = Math.max(fx.flash, a); }

  /* ======================================================
     Dibujado
     ====================================================== */

  function drawBackground(ctx) {
    /* cielo (algo más grande que el lienzo para que la sacudida
       no deje bordes en blanco) */
    ctx.fillStyle = skyGradient;
    ctx.fillRect(-16, -16, VIEW.w + 32, VIEW.h + 32);

    /* sol */
    ctx.fillStyle = SCENE.sun;
    ctx.beginPath();
    ctx.arc(648, 66, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = SCENE.sunCore;
    ctx.beginPath();
    ctx.arc(648, 66, 19, 0, Math.PI * 2);
    ctx.fill();

    /* nubes */
    var W = clouds.width;
    var cOff = ((offCloud % W) + W) % W;
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      var x = cl.x - cOff;
      if (x < -cl.w) x += W;
      ctx.drawImage(cl.cv, Math.round(x), cl.y);
    }

    blitLayer(ctx, farLayer, offFar);
    blitLayer(ctx, nearLayer, offNear);

    drawFence(ctx);
  }

  function drawFence(ctx) {
    var step = 46;
    var off = ((offFence % step) + step) % step;

    ctx.fillStyle = SCENE.fence;
    ctx.fillRect(-16, GROUND - 52, VIEW.w + 32, 5);
    ctx.fillRect(-16, GROUND - 30, VIEW.w + 32, 5);

    ctx.fillStyle = SCENE.fenceDark;
    for (var x = -off - step; x < VIEW.w + step; x += step) {
      ctx.fillRect(Math.round(x), GROUND - 58, 6, 58);
    }
  }

  function drawDashes(ctx, offset, y, dashW, gap, h, color) {
    var period = dashW + gap;
    var off = ((offset % period) + period) % period;
    ctx.fillStyle = color;
    for (var x = -off; x < VIEW.w + period; x += period) {
      ctx.fillRect(Math.round(x), y, dashW, h);
    }
  }

  function drawGround(ctx) {
    /* bordillo */
    ctx.fillStyle = SCENE.walk;
    ctx.fillRect(-16, GROUND, VIEW.w + 32, 30);

    drawDashes(ctx, offWalk, GROUND + 17, 46, 52, 4, SCENE.walkDash);

    ctx.fillStyle = SCENE.walkLine;
    ctx.fillRect(-16, GROUND, VIEW.w + 32, 3);

    /* calzada */
    ctx.fillStyle = SCENE.street;
    ctx.fillRect(-16, GROUND + 30, VIEW.w + 32, VIEW.h - GROUND + 16);

    ctx.fillStyle = SCENE.streetDark;
    ctx.fillRect(-16, GROUND + 30, VIEW.w + 32, 3);

    drawDashes(ctx, offStreet, GROUND + 58, 62, 58, 6, SCENE.streetDash);
  }

  function drawShadow(ctx, player) {
    var lift = SK.Player.lift();
    var t = U.clamp(lift / 110, 0, 1);
    var rx = 22 * (1 - t * 0.45);
    ctx.save();
    ctx.globalAlpha = 0.26 * (1 - t * 0.55);
    ctx.fillStyle = '#20242b';
    ctx.beginPath();
    ctx.ellipse(player.x + player.w / 2, GROUND + 12, rx, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawObstacles(ctx, list) {
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      ctx.drawImage(sprite(o.sprite), Math.round(o.x), Math.round(o.y));
    }
  }

  function drawPlayer(ctx, player) {
    var px = Math.round(player.x);
    var py = Math.round(player.y + player.bobY);

    ctx.drawImage(sprite(player.frame), px, py);

    /* en el aire la tabla va aparte, para poder girarla (kickflip) */
    if (player.frame !== 'AIR') return;

    var board = sprite('BOARD');
    var by = py + (SPRITES.AIR.length - 2) * SCALE;

    if (player.flipT < 0) {
      ctx.drawImage(board, px, by);
      return;
    }

    /* 360° sobre su eje largo: la escala Y sigue a cos(angle),
       así la tabla "da la vuelta" de lado sin salirse de su sitio */
    var t = player.flipT / SK.CONFIG.player.flipDuration;
    var sy = Math.cos(t * Math.PI * 2) || 0.02;
    var cx = px + board.width / 2;
    var cy = by + board.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, sy);
    ctx.translate(-cx, -cy);
    ctx.drawImage(board, px, by);
    ctx.restore();
  }

  function drawParticles(ctx) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = U.clamp(p.life * 2.2, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawSpeedLines(ctx, speed) {
    if (speed <= 470) return;
    var alpha = U.clamp((speed - 470) / 210, 0, 0.5);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      if (!L.on) continue;
      ctx.fillRect(Math.round(L.x), Math.round(L.y), L.len, 3);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * @param {object} ctx
   * @param {object} m { mode, speed, obstacles }
   */
  function draw(ctx, m) {
    if (!skyGradient) init();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VIEW.w, VIEW.h);

    var sx = 0, sy = 0;
    if (fx.shake > 0.2) {
      sx = (Math.random() - 0.5) * fx.shake * 2;
      sy = (Math.random() - 0.5) * fx.shake * 2;
    }
    ctx.save();
    ctx.translate(sx, sy);

    drawBackground(ctx);
    drawGround(ctx);
    drawSpeedLines(ctx, m.speed);

    var player = SK.Player.state;
    drawShadow(ctx, player);
    drawObstacles(ctx, m.obstacles);
    drawPlayer(ctx, player);
    drawParticles(ctx);

    ctx.restore();

    if (fx.flash > 0.01) {
      ctx.globalAlpha = fx.flash;
      ctx.fillStyle = fx.flashColor;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
      ctx.globalAlpha = 1;
    }
  }

  SK.Renderer = {
    init: init,
    update: update,
    draw: draw,
    addShake: addShake,
    addFlash: addFlash,
    /* efectos de polvo/chispas, en coordenadas de pantalla */
    dust: function (x, y, n, opts) { puff(x, y, n, opts); },
    clearParticles: function () { particles.length = 0; }
  };

})(window);
