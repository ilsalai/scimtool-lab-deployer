/* Nueve Vidas · sonido sintetizado con WebAudio (sin archivos). */
(function () {
  const TD = (globalThis.TD = globalThis.TD || {});

  function tone(ctx, dest, { type = 'sine', f0 = 440, f1 = f0, t0, dur = 0.1, vol = 0.5, attack = 0.005 }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  function noise(ctx, dest, { t0, dur = 0.1, vol = 0.3, filter = 1200, type = 'lowpass' }) {
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = filter;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(flt); flt.connect(g); g.connect(dest);
    src.start(t0);
  }

  const SOUNDS = {
    shoot: (c, d, t) => tone(c, d, { type: 'triangle', f0: 900, f1: 350, t0: t, dur: 0.07, vol: 0.22 }),
    lob: (c, d, t) => noise(c, d, { t0: t, dur: 0.18, vol: 0.16, filter: 900 }),
    hit: (c, d, t) => noise(c, d, { t0: t, dur: 0.04, vol: 0.12, filter: 2500, type: 'highpass' }),
    splash: (c, d, t) => { noise(c, d, { t0: t, dur: 0.25, vol: 0.28, filter: 700 }); tone(c, d, { type: 'sine', f0: 200, f1: 80, t0: t, dur: 0.2, vol: 0.28 }); },
    pounce: (c, d, t) => { noise(c, d, { t0: t, dur: 0.12, vol: 0.28, filter: 1500 }); tone(c, d, { type: 'square', f0: 160, f1: 90, t0: t, dur: 0.1, vol: 0.12 }); },
    pulse: (c, d, t) => { tone(c, d, { type: 'sine', f0: 520, f1: 760, t0: t, dur: 0.18, vol: 0.22 }); tone(c, d, { type: 'sine', f0: 760, f1: 420, t0: t + 0.18, dur: 0.25, vol: 0.22 }); },
    kill: (c, d, t) => tone(c, d, { type: 'square', f0: 600, f1: 1000, t0: t, dur: 0.08, vol: 0.1 }),
    leak: (c, d, t) => { tone(c, d, { type: 'sawtooth', f0: 300, f1: 110, t0: t, dur: 0.35, vol: 0.28 }); noise(c, d, { t0: t, dur: 0.3, vol: 0.2, filter: 400 }); },
    build: (c, d, t) => { noise(c, d, { t0: t, dur: 0.08, vol: 0.3, filter: 600 }); tone(c, d, { type: 'sine', f0: 220, f1: 180, t0: t, dur: 0.1, vol: 0.22 }); },
    upgrade: (c, d, t) => [523, 659, 784].forEach((f, i) => tone(c, d, { type: 'triangle', f0: f, t0: t + i * 0.07, dur: 0.14, vol: 0.22 })),
    sell: (c, d, t) => [660, 440].forEach((f, i) => tone(c, d, { type: 'triangle', f0: f, t0: t + i * 0.08, dur: 0.12, vol: 0.2 })),
    wave: (c, d, t) => { noise(c, d, { t0: t, dur: 0.3, vol: 0.32, filter: 300 }); tone(c, d, { type: 'sine', f0: 110, f1: 70, t0: t, dur: 0.35, vol: 0.35 }); },
    bonus: (c, d, t) => [880, 1175].forEach((f, i) => tone(c, d, { type: 'sine', f0: f, t0: t + i * 0.06, dur: 0.1, vol: 0.18 })),
    victory: (c, d, t) => [523, 659, 784, 1047].forEach((f, i) => tone(c, d, { type: 'triangle', f0: f, t0: t + i * 0.12, dur: 0.3, vol: 0.25 })),
    defeat: (c, d, t) => [392, 311, 233].forEach((f, i) => tone(c, d, { type: 'sawtooth', f0: f, f1: f * 0.97, t0: t + i * 0.25, dur: 0.45, vol: 0.2 })),
    wheel: (c, d, t) => [196, 247, 294, 392, 494].forEach((f, i) => tone(c, d, { type: 'sine', f0: f, t0: t + i * 0.18, dur: 0.6, vol: 0.22 })),
    summon: (c, d, t) => tone(c, d, { type: 'square', f0: 200, f1: 400, t0: t, dur: 0.2, vol: 0.12 }),
    error: (c, d, t) => tone(c, d, { type: 'square', f0: 200, f1: 150, t0: t, dur: 0.1, vol: 0.12 }),
    click: (c, d, t) => tone(c, d, { type: 'sine', f0: 700, f1: 500, t0: t, dur: 0.04, vol: 0.1 }),
  };
  const THROTTLE = { shoot: 0.06, hit: 0.05, kill: 0.05, lob: 0.08, pounce: 0.08, splash: 0.1, pulse: 0.2 };

  const audio = {
    ctx: null,
    master: null,
    enabled: (() => { try { return localStorage.getItem('nueveVidas.sound') !== '0'; } catch (e) { return true; } })(),
    last: {},
    /** Debe llamarse tras un gesto del usuario (los navegadores lo exigen). */
    unlock() {
      if (!this.ctx) {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    toggle() {
      this.enabled = !this.enabled;
      try { localStorage.setItem('nueveVidas.sound', this.enabled ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
      if (this.enabled) this.unlock();
      return this.enabled;
    },
    play(name) {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const min = THROTTLE[name] || 0;
      if (min && this.last[name] != null && now - this.last[name] < min) return;
      this.last[name] = now;
      const fn = SOUNDS[name];
      if (fn) { try { fn(this.ctx, this.master, now); } catch (e) { /* un sonido fallido no debe romper el juego */ } }
    },
  };

  TD.audio = audio;
})();
