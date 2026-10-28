/* ============================================================
   audio.js — sonidos sintetizados con WebAudio (sin archivos)
   ============================================================ */

(function (w) {
  'use strict';

  var SK = (w.SK = w.SK || {});
  var C = null;                      // se resuelve al init (config ya cargada)

  var ctx = null;
  var master = null;
  var noiseBuf = null;
  var enabled = true;

  function config() { return (C = C || SK.CONFIG); }

  /* Crea (o reanuda) el AudioContext: exige una interacción previa
     por la política de autoplay de los navegadores. */
  function ensure() {
    var AC = w.AudioContext || w.webkitAudioContext;
    if (!AC) return false;
    if (!ctx) {
      try {
        ctx = new AC();
      } catch (e) {
        return false;
      }
      master = ctx.createGain();
      master.gain.value = 0.3;
      master.connect(ctx.destination);
      noiseBuf = makeNoise(1);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function makeNoise(seconds) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* barrido de frecuencia con forma de onda */
  function tone(type, f0, f1, dur, gain, delay) {
    if (!enabled || !ensure()) return;
    var t0 = ctx.currentTime + (delay || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /* ráfaga de ruido filtrado */
  function noise(dur, gain, f0, f1, type) {
    if (!enabled || !ensure()) return;
    var t0 = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var flt = ctx.createBiquadFilter();
    flt.type = type || 'lowpass';
    flt.frequency.setValueAtTime(f0, t0);
    flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  SK.Audio = {
    ensure: ensure,

    isEnabled: function () { return enabled; },

    setEnabled: function (on) {
      enabled = !!on;
      try {
        w.localStorage.setItem(config().storageSound, enabled ? '1' : '0');
      } catch (e) { /* almacenamiento no disponible */ }
      if (enabled) ensure();
    },

    load: function () {
      try {
        var v = w.localStorage.getItem(config().storageSound);
        if (v !== null) enabled = v === '1';
      } catch (e) { /* idem */ }
      return enabled;
    },

    jump: function () {
      tone('square', 360, 780, 0.13, 0.16);
      noise(0.07, 0.06, 1600, 700, 'bandpass');
    },

    flip: function () {
      tone('triangle', 420, 980, 0.2, 0.13);
      noise(0.16, 0.1, 2600, 5400, 'bandpass');
    },

    land: function () {
      noise(0.1, 0.13, 1100, 260);
      tone('sine', 150, 70, 0.1, 0.14);
    },

    push: function () {
      noise(0.06, 0.07, 3200, 1400, 'bandpass');
    },

    crash: function () {
      noise(0.45, 0.24, 3600, 220);
      tone('sawtooth', 260, 55, 0.4, 0.2);
      tone('square', 130, 40, 0.3, 0.12, 0.04);
    },

    beat: function () {
      tone('sine', 180, 60, 0.11, 0.1);
    }
  };

})(window);
