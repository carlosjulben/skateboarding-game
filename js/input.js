/* ============================================================
   input.js — teclado: estado pulsado + teclas recién pulsadas
   ============================================================ */

(function (w) {
  'use strict';

  var SK = (w.SK = w.SK || {});

  /* teclas que mueven la página: las bloqueamos mientras juegas */
  var BLOCK = {
    ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1
  };

  var down = Object.create(null);   // mantenido ahora mismo
  var queue = [];                   // teclas pulsadas desde el último frame

  function normalize(e) {
    return e.code || e.key;
  }

  /* true si el foco está en un botón: entonces el navegador
     se encarga de Enter/Espacio y nosotros no interferimos */
  function onButton() {
    var el = w.document && w.document.activeElement;
    return !!el && el.tagName === 'BUTTON';
  }

  w.addEventListener('keydown', function (e) {
    var code = normalize(e);
    var nativeClick = (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') && onButton();
    if (BLOCK[code] && !nativeClick) e.preventDefault();
    if (e.repeat) return;           // el sistema repite: nos interesa solo la 1ª
    down[code] = true;
    queue.push(code);
  }, { passive: false });

  w.addEventListener('keyup', function (e) {
    down[normalize(e)] = false;
  });

  /* al perder el foco, soltamos todo para evitar teclas "pegadas" */
  w.addEventListener('blur', clear);

  function clear() {
    for (var k in down) down[k] = false;
    queue.length = 0;
  }

  SK.Input = {
    isDown: function (code) { return !!down[code]; },
    onButton: onButton,

    /* devuelve y vacía la cola de teclas pulsadas en este frame */
    consume: function () {
      var out = queue;
      queue = [];
      return out;
    },

    clear: clear
  };

})(window);
