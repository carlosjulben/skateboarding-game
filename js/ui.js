/* ============================================================
   ui.js — HUD, panel plegable y sus pantallas (menú, pausa, fin)
   ============================================================ */

(function (w) {
  'use strict';

  var SK = (w.SK = w.SK || {});
  var U = null;

  var els = {};
  var hooks = {};
  var open = true;
  var soundOn = true;
  var bestScore = 0;
  var current = null;      // última plantilla mostrada
  var lastHud = { score: -1, best: -1, speedPct: -1 };

  /* ---------------- plantillas ---------------- */

  function keysBlock() {
    return '' +
      '<div class="keys">' +
        '<div class="keys__row"><kbd>→</kbd><span>empujar / acelerar</span></div>' +
        '<div class="keys__row"><kbd>←</kbd><span>frenar y marcha atrás</span></div>' +
        '<div class="keys__row"><kbd>ESPACIO</kbd><span>ollie (mantén para más alto)</span></div>' +
        '<div class="keys__row"><kbd>K</kbd><span>kickflip, estando en el aire</span></div>' +
        '<div class="keys__row"><kbd>ESC</kbd><span>abrir / cerrar este menú</span></div>' +
      '</div>';
  }

  function soundBtn() {
    return '<button class="btn btn--ghost" type="button" data-act="sound">' +
             (soundOn ? '🔊 Sonido: activado' : '🔇 Sonido: silenciado') +
           '</button>';
  }

  var TPL = {
    menu: function () {
      return '' +
        '<p class="eyebrow">Juego de patineta</p>' +
        '<h2 class="panel__title">SKATE RUNNER</h2>' +
        '<p class="panel__text">Esquiva los obstáculos con el ollie. ' +
          'Una sola colisión y se acabó la partida.</p>' +
        '<button class="btn btn--primary is-blinking" type="button" data-act="primary">' +
          '▶ Jugar' +
        '</button>' +
        keysBlock() +
        soundBtn();
    },

    paused: function (d) {
      return '' +
        '<p class="eyebrow">Partida en pausa</p>' +
        '<h2 class="panel__title">PAUSA</h2>' +
        '<div class="results">' +
          '<div><span>PUNTOS</span><strong>' + U.pad(d.score, 5) + '</strong></div>' +
          '<div><span>RÉCORD</span><strong>' + U.pad(d.best, 5) + '</strong></div>' +
        '</div>' +
        '<button class="btn btn--primary" type="button" data-act="primary">▶ Reanudar</button>' +
        '<button class="btn btn--ghost" type="button" data-act="menu">🏠 Menú principal</button>' +
        soundBtn();
    },

    gameover: function (d) {
      var isRecord = d.score > 0 && d.score >= bestScore;
      return '' +
        '<p class="eyebrow">' + (isRecord ? '¡Nuevo récord!' : 'Fin de la partida') + '</p>' +
        '<h2 class="panel__title panel__title--bad">¡CHOCASTE!</h2>' +
        '<div class="results">' +
          '<div><span>PUNTOS</span><strong>' + U.pad(d.score, 5) + '</strong></div>' +
          '<div><span>RÉCORD</span><strong>' + U.pad(d.best, 5) + '</strong></div>' +
        '</div>' +
        '<p class="panel__text">' + d.message + '</p>' +
        '<button class="btn btn--primary is-blinking" type="button" data-act="primary">' +
          '↻ Reintentar' +
        '</button>' +
        '<button class="btn btn--ghost" type="button" data-act="menu">🏠 Menú principal</button>' +
        soundBtn();
    }
  };

  /* ---------------- estado del panel ---------------- */

  /* al cambiar de vista, quitamos el foco de los botones para que
     ESPACIO vuelva a ser el ollie y no re-activar un botón */
  function blurActive() {
    var el = w.document.activeElement;
    if (el && typeof el.blur === 'function') el.blur();
  }

  function setOpen(next) {
    if (open === next) return;
    open = next;
    els.drawer.setAttribute('data-open', open ? 'true' : 'false');
    els.tab.setAttribute('aria-expanded', open ? 'true' : 'false');
    els.icon.textContent = open ? '✕' : '☰';
    els.scrim.classList.toggle('is-on', open);
    blurActive();
  }

  function render(mode, data) {
    current = mode;
    els.body.innerHTML = TPL[mode](data || {});
    setOpen(true);
  }

  function hide() {
    setOpen(false);
  }

  /* ---------------- eventos ---------------- */

  function onClick(e) {
    var btn = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!btn || !els.body.contains(btn)) return;
    var act = btn.getAttribute('data-act');
    if (act === 'primary' && hooks.onPrimary) hooks.onPrimary();
    else if (act === 'menu' && hooks.onMenu) hooks.onMenu();
    else if (act === 'sound' && hooks.onSound) hooks.onSound();
  }

  function setHud(d) {
    var pct = Math.round(U.clamp(d.speedPct, 0, 1) * 100);
    if (d.score !== lastHud.score) {
      els.score.textContent = U.pad(d.score, 5);
      lastHud.score = d.score;
    }
    if (d.best !== lastHud.best) {
      els.best.textContent = U.pad(d.best, 5);
      lastHud.best = d.best;
    }
    if (pct !== lastHud.speedPct) {
      els.speed.style.width = pct + '%';
      lastHud.speedPct = pct;
    }
  }

  /* marca el marcador al batir el récord */
  function flashRecord() {
    els.best.classList.remove('is-beating');
    void els.best.offsetWidth;          // reinicia la animación
    els.best.classList.add('is-beating');
  }

  SK.UI = {
    init: function (options) {
      U = SK.util;
      hooks = options || {};

      els.drawer = document.getElementById('drawer');
      els.tab = document.getElementById('drawer-tab');
      els.icon = document.getElementById('drawer-icon');
      els.body = document.getElementById('drawer-body');
      els.scrim = document.getElementById('scrim');
      els.score = document.getElementById('hud-score');
      els.best = document.getElementById('hud-best');
      els.speed = document.getElementById('hud-speed');

      els.tab.addEventListener('click', function () {
        setOpen(!open);
      });
      els.body.addEventListener('click', onClick);

      /* sincronizamos el estado inicial con el HTML */
      els.drawer.setAttribute('data-open', open ? 'true' : 'false');
      els.tab.setAttribute('aria-expanded', open ? 'true' : 'false');
      els.icon.textContent = open ? '✕' : '☰';
      els.scrim.classList.toggle('is-on', open);

      return this;
    },

    render: render,
    hide: hide,
    toggle: function () { setOpen(!open); },
    isOpen: function () { return open; },
    current: function () { return current; },
    setHud: setHud,
    flashRecord: flashRecord,
    setBest: function (v) { bestScore = v; },
    setSound: function (on) {
      soundOn = on;
      if (els.body.querySelector('[data-act="sound"]')) {
        els.body.querySelector('[data-act="sound"]').innerHTML =
          (on ? '🔊 Sonido: activado' : '🔇 Sonido: silenciado');
      }
    }
  };

})(window);
